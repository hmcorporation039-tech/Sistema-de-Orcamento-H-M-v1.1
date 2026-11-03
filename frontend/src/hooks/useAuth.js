import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, loginComCodigo } from '../services/api';
import { guardarSessao, encerrarNoServidor } from '../services/renovacaoSessao';
import { ouvirSessao, novoLoginConcluido, desistirDoNovoLogin, sessaoAguardandoLogin } from '../services/sessao';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  // 401 no meio do trabalho (token vencido, senha trocada em outro lugar):
  // o ModalSessao pede a senha de novo sem sair da tela (services/sessao.js)
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hm_token');
    const user = localStorage.getItem('hm_usuario');
    if (token && user) {
      setUsuario(JSON.parse(user));
    }
    setCarregando(false);
  }, []);

  useEffect(() => ouvirSessao((evento) => {
    if (evento.tipo === 'expirou') setSessaoExpirada(true);
    if (evento.tipo === 'renovada') setSessaoExpirada(false);
    if (evento.tipo === 'encerrada') {
      setSessaoExpirada(false);
      localStorage.removeItem('hm_token');
      localStorage.removeItem('hm_usuario');
      localStorage.removeItem('hm_renovacao');
      setUsuario(null);
    }
    // 403 TOTP_OBRIGATORIO: administrador sem a verificação em duas etapas, com
    // ela obrigatória no servidor — RotaProtegida mostra a tela de ativar
    if (evento.tipo === 'totp-obrigatorio') {
      setUsuario(atual => {
        if (!atual || atual.totpPendente) return atual;
        const atualizado = { ...atual, totpPendente: true };
        localStorage.setItem('hm_usuario', JSON.stringify(atualizado));
        return atualizado;
      });
    }
    // 403 SENHA_PROVISORIA: a conta tem senha provisória (redefinida por um
    // administrador) — RotaProtegida/RotaCampo passam a mostrar DefinirSenha
    if (evento.tipo === 'senha-provisoria') {
      setUsuario(atual => {
        if (!atual || atual.senhaProvisoria) return atual;
        const atualizado = { ...atual, senhaProvisoria: true };
        localStorage.setItem('hm_usuario', JSON.stringify(atualizado));
        return atualizado;
      });
    }
  }), []);

  // Sincroniza logout entre abas: o evento "storage" só dispara nas OUTRAS
  // abas (nunca na que fez a mudança), então é exatamente o que falta pra
  // avisar essas abas quando alguém clica em Sair numa delas — sem isso, cada
  // aba só descobria que o token sumiu na próxima chamada à API (401).
  // Mesma lógica serve pro login: logar numa aba loga todas as outras juntas
  // (e, se esta aba estava esperando o novo login, as requisições seguem).
  useEffect(() => {
    function aoMudarStorageEmOutraAba(e) {
      if (e.key !== 'hm_token' && e.key !== 'hm_usuario') return;
      const token = localStorage.getItem('hm_token');
      const user = localStorage.getItem('hm_usuario');
      // a renovação do token (a cada ~15 min, em qualquer aba) troca só o hm_token:
      // a mesma conta continua com o mesmo objeto, para não redesenhar as telas à toa
      setUsuario(atual => (token && user ? (atual && JSON.stringify(atual) === user ? atual : JSON.parse(user)) : null));
      if (token && user && sessaoAguardandoLogin()) novoLoginConcluido();
    }
    window.addEventListener('storage', aoMudarStorageEmOutraAba);
    return () => window.removeEventListener('storage', aoMudarStorageEmOutraAba);
  }, []);

  // Login concluído (senha, ou senha + código): token curto, chave de
  // renovação da sessão (services/renovacaoSessao.js) e dados da conta.
  function guardarLogin(dados) {
    guardarSessao(dados);
    localStorage.setItem('hm_usuario', JSON.stringify(dados.usuario));
    setUsuario(dados.usuario);
    return dados.usuario;
  }

  // Com a verificação em duas etapas ativa, a senha certa devolve só
  // { precisaTotp, desafio }: quem chamou pede o código e usa entrarComCodigo.
  async function entrar(email, senha) {
    const { data } = await apiLogin(email, senha);
    if (data.precisaTotp) return { precisaTotp: true, desafio: data.desafio };
    return guardarLogin(data);
  }

  async function entrarComCodigo(desafio, codigo) {
    const { data } = await loginComCodigo(desafio, codigo);
    guardarLogin(data);
    return data;
  }

  // "Entre de novo" do ModalSessao: mesma conta (o e-mail vem da sessão
  // atual), token novo; as requisições que esperavam são repetidas.
  async function reentrar(senha) {
    const { data } = await apiLogin(usuario?.email, senha);
    if (data.precisaTotp) return { precisaTotp: true, desafio: data.desafio };
    const novo = guardarLogin(data);
    novoLoginConcluido();
    return novo;
  }

  async function reentrarComCodigo(desafio, codigo) {
    const data = await entrarComCodigo(desafio, codigo);
    novoLoginConcluido();
    return data.usuario;
  }

  // Sair de verdade (Fase 6): a sessão é encerrada no servidor. A tela sai na
  // hora; o token só é apagado do navegador depois do aviso ao servidor (e só
  // se ninguém entrou de novo nesse meio-tempo).
  function sair() {
    if (sessaoAguardandoLogin()) desistirDoNovoLogin();
    const token = localStorage.getItem('hm_token');
    const renovacao = localStorage.getItem('hm_renovacao');
    localStorage.removeItem('hm_usuario');
    setUsuario(null);
    encerrarNoServidor(token, renovacao).finally(() => {
      if (localStorage.getItem('hm_token') === token) localStorage.removeItem('hm_token');
      if (localStorage.getItem('hm_renovacao') === renovacao) localStorage.removeItem('hm_renovacao');
    });
  }

  // A verificação em duas etapas acabou de ser ativada (tela obrigatória ou
  // Minha conta): libera o sistema sem precisar entrar de novo.
  function totpAtivado() {
    setUsuario(atual => {
      if (!atual) return atual;
      const atualizado = { ...atual, totpAtivo: true, totpPendente: false };
      localStorage.setItem('hm_usuario', JSON.stringify(atualizado));
      return atualizado;
    });
  }

  // Chamado quando a pessoa define a própria senha: tira a marca de provisória
  // sem precisar deslogar e logar de novo.
  function senhaDefinida(tokenNovo) {
    if (tokenNovo) localStorage.setItem('hm_token', tokenNovo);
    setUsuario(atual => {
      if (!atual) return atual;
      const atualizado = { ...atual, senhaProvisoria: false };
      localStorage.setItem('hm_usuario', JSON.stringify(atualizado));
      return atualizado;
    });
  }

  return (
    <AuthContext.Provider value={{ usuario, entrar, entrarComCodigo, sair, carregando, senhaDefinida, sessaoExpirada, reentrar, reentrarComCodigo, totpAtivado, desistir: desistirDoNovoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
