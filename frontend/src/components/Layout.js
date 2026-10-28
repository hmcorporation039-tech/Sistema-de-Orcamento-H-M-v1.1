import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import ErrorBoundary from './ErrorBoundary';
import PainelAssistente from './assistente/PainelAssistente';

// Menu da versão 2.0: seis grupos. Cada um abre uma página-"hub" com abas
// internas (pages/hubs) que juntam as telas que antes eram itens soltos —
// eram 12 itens e o menu já não cabia. As rotas antigas redirecionam para o
// hub na aba certa (App.js).
//
// Financeiro é inteiro de administradores (faturamento, pagamentos e dados de
// terceiros — a API exige admin), então nem aparece para os demais. Nos outros
// grupos, as abas só de admin (Mão de obra, Usuários) somem dentro do hub.
function itensDoMenu(ehAdmin) {
  return [
    { to: '/dashboard', label: 'Painel' },
    { to: '/obras', label: 'Obras' },
    { to: '/propostas', label: 'Propostas' },
    { to: '/base-precos', label: 'Base de preços' },
    ...(ehAdmin ? [{ to: '/financeiro', label: 'Financeiro' }] : []),
    { to: '/cadastros', label: ehAdmin ? 'Cadastros e administração' : 'Cadastros' },
  ];
}

// Tela estreita (celular / janela pequena): o cabeçalho quebra em duas linhas
// e o menu vai para a linha de baixo, rolando na horizontal se precisar.
const CONSULTA_ESTREITA = '(max-width: 900px)';

function useTelaEstreita() {
  const [estreita, setEstreita] = useState(() => window.matchMedia(CONSULTA_ESTREITA).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_ESTREITA);
    const aoMudar = e => setEstreita(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);
  return estreita;
}

export default function Layout() {
  const { usuario, sair } = useAuth();
  const navegacao = itensDoMenu(usuario?.role === 'admin');
  const estreita = useTelaEstreita();
  const navigate = useNavigate();
  const location = useLocation();

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
        padding: estreita ? '8px 12px' : '8px 20px', display: 'flex', alignItems: 'center',
        gap: estreita ? 10 : 16, position: 'sticky', top: 0, zIndex: 50,
        flexWrap: estreita ? 'wrap' : 'nowrap'
      }}>
        <div style={{
          width: estreita ? 48 : 76, height: estreita ? 48 : 76, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img src="/logo.png" alt="H&M" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 20, fontWeight: 700, color: '#c9a227',
            letterSpacing: '.5px', lineHeight: 1, whiteSpace: 'nowrap'
          }}>
            H&amp;M
          </h1>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 11, color: '#c9a227', letterSpacing: '.3px',
            marginTop: 3, whiteSpace: 'nowrap'
          }}>
            Engenharia e Tecnologia LTDA
          </p>
          {!estreita && (
            <p style={{ fontSize: 10, color: '#555', marginTop: 3, letterSpacing: '.2px', whiteSpace: 'nowrap' }}>
              CNPJ 04.003.376/0001-00 · Taguatinga Norte, Brasília-DF
            </p>
          )}
        </div>

        {/* Navegação */}
        <nav style={estreita
          ? { display: 'flex', gap: 6, order: 3, width: '100%', overflowX: 'auto', paddingBottom: 2 }
          : { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {navegacao.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              padding: '6px 12px', borderRadius: 6, fontSize: 11,
              fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
              whiteSpace: 'nowrap', flexShrink: 0,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#666' }}>
            {usuario?.nome}
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

      {/* Conteúdo — dentro do ErrorBoundary para que um erro numa tela não
          derrube a aplicação inteira (o menu e o botão Sair continuam aí).
          A `key` faz o boundary se recuperar sozinho ao trocar de rota. */}
      <main style={{ padding: estreita ? '12px' : '16px 20px', maxWidth: 1280, margin: '0 auto' }}>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Assistente virtual: botão fixo em todas as telas e painel lateral
          (tela cheia no celular). Fora do ErrorBoundary da tela: trocar de
          rota não fecha a conversa. */}
      <ErrorBoundary>
        <PainelAssistente usuario={usuario} />
      </ErrorBoundary>
    </div>
  );
}
