import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HardHat, FileText, Calculator, Wallet, Settings,
  LogOut, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { rotuloPapel } from '../utils/papeis';
import toast from 'react-hot-toast';
import ErrorBoundary from './ErrorBoundary';
import PainelAssistente from './assistente/PainelAssistente';
import { IndicadorNovidades } from './NovidadesPastas';

// Menu da versão 2.0: seis grupos. Cada um abre uma página-"hub" com abas
// internas (pages/hubs) que juntam as telas que antes eram itens soltos —
// eram 12 itens e o menu já não cabia. As rotas antigas redirecionam para o
// hub na aba certa (App.js).
//
// Financeiro é inteiro de administradores (faturamento, pagamentos e dados de
// terceiros — a API exige admin), então nem aparece para os demais. Nos outros
// grupos, as abas só de admin (Mão de obra, Usuários) somem dentro do hub.
//
// Revisão visual de 29/10/2026: o menu saiu do topo (botões de 11 px em cinza
// escuro) para uma barra lateral com ícones, sempre fixa (o usuário não quis
// menu suspenso). Pode ser recolhida; em janela estreita fica só com os
// ícones. Estilos em src/tema.css.
function itensDoMenu(ehAdmin) {
  return [
    { to: '/dashboard', label: 'Painel', Icone: LayoutDashboard },
    { to: '/obras', label: 'Obras', Icone: HardHat },
    { to: '/propostas', label: 'Propostas', Icone: FileText },
    { to: '/base-precos', label: 'Base de preços', Icone: Calculator },
    ...(ehAdmin ? [{ to: '/financeiro', label: 'Financeiro', Icone: Wallet }] : []),
    { to: '/cadastros', label: ehAdmin ? 'Cadastros e admin.' : 'Cadastros', Icone: Settings },
  ];
}

const CHAVE_RECOLHIDO = 'hm.menuRecolhido';

// Abaixo desta largura o menu fica só com os ícones (continua fixo na lateral)
const CONSULTA_ESTREITA = '(max-width: 1100px)';

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

function lerRecolhido() {
  try { return localStorage.getItem(CHAVE_RECOLHIDO) === '1'; } catch { return false; }
}

function iniciais(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
}

export default function Layout() {
  const { usuario, sair } = useAuth();
  const ehAdmin = usuario?.role === 'admin';
  const navegacao = itensDoMenu(ehAdmin);
  const navigate = useNavigate();
  const location = useLocation();
  const estreita = useTelaEstreita();
  const [recolhidoSalvo, setRecolhido] = useState(lerRecolhido);
  const recolhido = recolhidoSalvo || estreita;

  function alternarRecolhido() {
    setRecolhido(r => {
      try { localStorage.setItem(CHAVE_RECOLHIDO, r ? '0' : '1'); } catch { /* navegador sem armazenamento */ }
      return !r;
    });
  }

  function handleSair() {
    sair();
    navigate('/login');
    toast.success('Até logo!');
  }

  return (
    <div className="app">
      <aside
        className={`menu${recolhido ? ' recolhido' : ''}`}
        aria-label="Menu principal"
      >
        {/* Logo oficial, sem alteração (o usuário pediu para preservá-la) */}
        <NavLink to="/dashboard" className="menu-marca" title="H&M Engenharia e Tecnologia">
          <img src="/logo.png" alt="H&M Engenharia e Tecnologia" />
        </NavLink>

        <nav className="menu-itens">
          {navegacao.map(({ to, label, Icone }) => (
            <NavLink
              key={to}
              to={to}
              title={recolhido ? label : undefined}
              className={({ isActive }) => `menu-item${isActive ? ' ativo' : ''}`}
            >
              <Icone size={19} strokeWidth={1.8} />
              <span className="menu-texto">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="menu-rodape">
          {/* 2.3: arquivo novo/alterado nas pastas dos clientes */}
          <div style={{ display: 'flex', justifyContent: recolhido ? 'center' : 'flex-start', padding: '0 4px' }}>
            <IndicadorNovidades />
          </div>
          {/* Fase 6: o nome leva a "Minha conta" (sessões, duas etapas, Telegram/WhatsApp) */}
          <NavLink to="/cadastros?aba=conta" className="menu-usuario" title={recolhido ? `${usuario?.nome} — Minha conta` : 'Minha conta'}
            style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="menu-avatar">{iniciais(usuario?.nome)}</div>
            <div className="menu-usuario-info" style={{ minWidth: 0 }}>
              <div className="menu-usuario-nome">{usuario?.nome}</div>
              <div className="menu-usuario-papel">{rotuloPapel(usuario?.role)}</div>
            </div>
          </NavLink>
          {!estreita && <button className="menu-botao" onClick={alternarRecolhido}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}>
            {recolhido ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className="menu-texto">Recolher menu</span>
          </button>}
          <button className="menu-botao sair" onClick={handleSair} title={recolhido ? 'Sair' : undefined}>
            <LogOut size={18} />
            <span className="menu-texto">Sair</span>
          </button>
        </div>
      </aside>
      <div className="app-conteudo">
        {/* Conteúdo — dentro do ErrorBoundary para que um erro numa tela não
            derrube a aplicação inteira (o menu e o botão Sair continuam aí).
            A `key` faz o boundary se recuperar sozinho ao trocar de rota. */}
        <main className="app-main">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Assistente virtual: botão fixo em todas as telas e painel lateral
          (tela cheia no celular). Fora do ErrorBoundary da tela: trocar de
          rota não fecha a conversa. */}
      <ErrorBoundary>
        <PainelAssistente usuario={usuario} />
      </ErrorBoundary>
    </div>
  );
}
