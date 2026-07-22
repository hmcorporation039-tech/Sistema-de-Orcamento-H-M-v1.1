import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/orcamento', label: '📋 Orçamento' },
  { to: '/materiais', label: '🗄️ Materiais' },
  { to: '/clientes', label: '👥 Clientes' },
  { to: '/historico', label: '📁 Histórico' },
];

const NAV_ADMIN = { to: '/usuarios', label: '🔑 Usuários' };

export default function Layout() {
  const { usuario, sair } = useAuth();
  const navegacao = usuario?.role === 'admin' ? [...NAV, NAV_ADMIN] : NAV;
  const navigate = useNavigate();

  function handleSair() {
    sair();
    navigate('/login');
    toast.success('Até logo!');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e0cc' }}>
      {/* Header */}
      <header style={{
        background: '#0f0f0f', borderBottom: '2px solid #c9a227',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        gap: 14, position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: '2px solid #c9a227', overflow: 'hidden',
          background: '#111', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c9a227', fontWeight: 700, fontSize: 15, letterSpacing: '.5px'
        }}>
          H&amp;M
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#c9a227' }}>
            H&M Engenharia e Tecnologia
          </h1>
          <p style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
            CNPJ 04.003.376/0001-00 · Taguatinga Norte, Brasília-DF
          </p>
        </div>

        {/* Navegação */}
        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {navegacao.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              padding: '6px 12px', borderRadius: 6, fontSize: 11,
              fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
              border: isActive ? '1px solid #c9a227' : '1px solid #2a2a2a',
              background: isActive ? '#c9a227' : 'transparent',
              color: isActive ? '#000' : '#666',
              transition: 'all .15s'
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
          <span style={{ fontSize: 11, color: '#666' }}>
            👤 {usuario?.nome}
          </span>
          <button
            onClick={handleSair}
            style={{
              padding: '6px 12px', border: '1px solid #3a1212',
              background: 'transparent', borderRadius: 6, color: '#b04040',
              fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main style={{ padding: '16px 20px', maxWidth: 1280, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
