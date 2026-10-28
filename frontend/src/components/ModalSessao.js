import { useState, useEffect, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// "Sua sessão expirou — entre de novo" (services/sessao.js): aparece por cima
// da tela quando o servidor recusa o token (401) — token de 8 h vencido, senha
// trocada em outro lugar. A tela de baixo continua montada, com tudo o que
// estava digitado; o que estava sendo gravado espera o login e segue sozinho.
export default function ModalSessao() {
  const { usuario, sessaoExpirada, reentrar, sair } = useAuth();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);
  const campo = useRef(null);

  useEffect(() => {
    if (sessaoExpirada) { setSenha(''); setErro(''); setTimeout(() => campo.current?.focus(), 0); }
  }, [sessaoExpirada]);

  if (!sessaoExpirada || !usuario) return null;

  async function enviar(e) {
    e.preventDefault();
    if (!senha) { setErro('Digite a sua senha'); return; }
    setEntrando(true);
    setErro('');
    try {
      await reentrar(senha);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível entrar — confira a rede e tente de novo');
    } finally {
      setEntrando(false);
    }
  }

  function desistir() {
    if (!window.confirm('Sair do sistema? O que não foi salvo nesta tela se perde (a proposta em edição fica guardada como rascunho neste navegador).')) return;
    sair();
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-sessao" data-testid="modal-sessao" style={fundo}>
      <form onSubmit={enviar} style={caixa}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <KeyRound size={20} color="#c9a227" />
          <h2 id="titulo-sessao" style={{ fontSize: 17, color: '#c9a227', fontWeight: 700 }}>Sua sessão expirou</h2>
        </div>
        <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, marginBottom: 16 }}>
          Entre de novo para continuar. <b style={{ color: '#ddd' }}>Nada do que está na tela foi perdido</b> — o que
          estava sendo gravado é enviado assim que você entrar.
        </p>
        <label style={rotulo}>E-mail</label>
        <input value={usuario.email || ''} readOnly style={{ ...entrada, color: '#888', marginBottom: 12 }} />
        <label style={rotulo} htmlFor="senha-sessao">Senha</label>
        <input id="senha-sessao" ref={campo} type="password" autoComplete="current-password" value={senha}
          onChange={e => { setSenha(e.target.value); setErro(''); }} style={entrada} />
        {erro && <div style={{ color: '#e08080', fontSize: 12, marginTop: 8 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="submit" disabled={entrando} style={btnPrimario}>{entrando ? 'Entrando…' : 'Entrar e continuar'}</button>
          <button type="button" onClick={desistir} style={btnSecundario}>Sair do sistema</button>
        </div>
      </form>
    </div>
  );
}

const fundo = {
  position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const caixa = {
  background: '#131313', border: '1px solid #3a3216', borderRadius: 12, padding: 26,
  width: '100%', maxWidth: 420, boxShadow: '0 20px 60px #000000aa',
};
const rotulo = { display: 'block', fontSize: 11, color: '#777', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' };
// 16 px: menos que isso o iPhone dá zoom ao tocar no campo
const entrada = { width: '100%', padding: '10px 12px', fontSize: 16, boxSizing: 'border-box' };
const btnPrimario = {
  padding: '10px 18px', background: '#c9a227', border: 'none', borderRadius: 6, color: '#000',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
const btnSecundario = {
  padding: '10px 14px', background: 'transparent', border: '1px dashed #333', borderRadius: 6,
  color: '#999', fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
