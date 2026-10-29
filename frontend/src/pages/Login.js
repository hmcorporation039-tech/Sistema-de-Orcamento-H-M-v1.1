import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const { entrar } = useAuth();
  const navigate = useNavigate();
  // ?volta=/campo/... — o app de campo manda para cá e volta para a mesma tela.
  // Só caminho interno (começa com "/" e não "//"), para o link não levar a outro site.
  const volta = new URLSearchParams(useLocation().search).get('volta');
  const destino = volta && volta.startsWith('/') && !volta.startsWith('//') && !volta.startsWith('/login')
    ? volta : '/propostas?aba=editar';

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!email || !senha) {
      setErro('Preencha e-mail e senha');
      return;
    }
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate(destino, { replace: true });
      toast.success('Bem-vindo ao sistema!');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    // Revisão visual de 29/10/2026: brilho dourado discreto atrás do cartão,
    // marca em vetor e textos legíveis (o subtítulo era #555 em 12 px).
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 30%, #1d1708 0%, var(--fundo) 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0'
    }}>
      <div style={{
        background: 'var(--superficie)', border: '1px solid var(--borda)',
        borderRadius: 16, padding: '40px 36px 34px', width: 'calc(100% - 32px)', maxWidth: 410,
        boxShadow: '0 24px 70px rgba(0,0,0,.65)'
      }}>
        {/* Logo / Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          {/* A logo oficial fica como está (pedido do usuário em 29/10/2026) */}
          <div style={{
            width: 160, height: 160, margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="H&M" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{
            fontFamily: 'var(--fonte-marca)', color: 'var(--ouro)', fontSize: 20, fontWeight: 700, marginBottom: 6,
            letterSpacing: '.4px', textTransform: 'uppercase', lineHeight: 1.25
          }}>
            H&amp;M Engenharia e Tecnologia LTDA
          </h1>
          <p style={{
            display: 'inline-block', marginTop: 10, padding: '4px 12px', borderRadius: 20,
            background: 'var(--ouro-fundo)', color: 'var(--ouro-claro)', fontSize: 12, fontWeight: 500
          }}>
            Sistema de Orçamentos
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {erro && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 6,
              padding: '10px 12px', marginBottom: 16, color: '#e08080', fontSize: 12
            }}>
              {erro}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--texto-3)', marginBottom: 6, fontWeight: 500 }}>
              E-mail
            </label>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={e => { setEmail(e.target.value); setErro(''); }}
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '10px 12px', background: '#0e0e10',
                border: '1px solid var(--borda)', borderRadius: 8, color: '#e8e0cc',
                // 16 px: abaixo disso o iPhone dá zoom ao tocar no campo
                fontSize: 16, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--texto-3)', marginBottom: 6, fontWeight: 500 }}>
              Senha
            </label>
            <input
              type="password"
              autoComplete="off"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(''); }}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', background: '#0e0e10',
                border: '1px solid var(--borda)', borderRadius: 8, color: '#e8e0cc',
                // 16 px: abaixo disso o iPhone dá zoom ao tocar no campo
                fontSize: 16, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%', padding: '12px', background: carregando ? 'var(--ouro-escuro)' : 'var(--ouro)',
              border: 'none', borderRadius: 8, color: '#111',
              fontWeight: 700, fontSize: 13, cursor: carregando ? 'not-allowed' : 'pointer'
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
