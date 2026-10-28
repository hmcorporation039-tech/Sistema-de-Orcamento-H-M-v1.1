import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../services/api';
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
      setUsuario(null);
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
      setUsuario(token && user ? JSON.parse(user) : null);
      if (token && user && sessaoAguardandoLogin()) novoLoginConcluido();
    }
    window.addEventListener('storage', aoMudarStorageEmOutraAba);
    return () => window.removeEventListener('storage', aoMudarStorageEmOutraAba);
  }, []);

  async function entrar(email, senha) {
    const res = await apiLogin(email, senha);
    const { token, usuario } = res.data;
    localStorage.setItem('hm_token', token);
    localStorage.setItem('hm_usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    return usuario;
  }

  // "Entre de novo" do ModalSessao: mesma conta (o e-mail vem da sessão
  // atual), token novo; as requisições que esperavam são repetidas.
  async function reentrar(senha) {
    const res = await apiLogin(usuario?.email, senha);
    const { token, usuario: novo } = res.data;
    localStorage.setItem('hm_token', token);
    localStorage.setItem('hm_usuario', JSON.stringify(novo));
    setUsuario(novo);
    novoLoginConcluido();
    return novo;
  }

  function sair() {
    if (sessaoAguardandoLogin()) desistirDoNovoLogin();
    localStorage.removeItem('hm_token');
    localStorage.removeItem('hm_usuario');
    setUsuario(null);
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
    <AuthContext.Provider value={{ usuario, entrar, sair, carregando, senhaDefinida, sessaoExpirada, reentrar, desistir: desistirDoNovoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
