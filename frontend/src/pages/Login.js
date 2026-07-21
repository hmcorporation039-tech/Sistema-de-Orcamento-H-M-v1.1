import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { entrar } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha e-mail e senha');
      return;
    }
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate('/orcamento');
      toast.success('Bem-vindo ao sistema!');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao fazer login');
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
        borderRadius: 12, padding: '40px 36px', width: 380,
        boxShadow: '0 20px 60px #000000aa'
      }}>
        {/* Logo / Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '2px solid #c9a227', margin: '0 auto 16px',
            overflow: 'hidden', background: '#000'
          }}>
            <img
              src="/logo.jpg"
              alt="H&M"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 style={{ color: '#c9a227', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            H&M Engenharia
          </h1>
          <p style={{ color: '#555', fontSize: 12 }}>Sistema de Orçamentos</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setSenha(e.target.value)}
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

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#333' }}>
          Login padrão: admin@hmengenharia.com / admin123
        </p>
      </div>
    </div>
  );
}
