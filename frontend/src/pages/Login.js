import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const { entrar } = useAuth();
  const navigate = useNavigate();

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
      navigate('/orcamento');
      toast.success('Bem-vindo ao sistema!');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#131313', border: '1px solid #1e1e1e',
        borderRadius: 12, padding: '40px 36px', width: 420,
        boxShadow: '0 20px 60px #000000aa'
      }}>
        {/* Logo / Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 160, height: 160, margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="H&M" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#c9a227', fontSize: 20, fontWeight: 700, marginBottom: 6,
            letterSpacing: '.4px', textTransform: 'uppercase', lineHeight: 1.25
          }}>
            H&amp;M Engenharia e Tecnologia LTDA
          </h1>
          <p style={{ color: '#555', fontSize: 12 }}>Sistema de Orçamentos</p>
        </div>

        <form onSubmit={handleSubmit}>
          {erro && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 6,
              padding: '10px 12px', marginBottom: 16, color: '#e08080', fontSize: 12
            }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErro(''); }}
              placeholder="admin@hmengenharia.com"
              style={{
                width: '100%', padding: '10px 12px', background: '#0b0b0b',
                border: '1px solid #2a2a2a', borderRadius: 6, color: '#e8e0cc',
                fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(''); }}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', background: '#0b0b0b',
                border: '1px solid #2a2a2a', borderRadius: 6, color: '#e8e0cc',
                fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%', padding: '11px', background: carregando ? '#7a6010' : '#c9a227',
              border: 'none', borderRadius: 6, color: '#000',
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
