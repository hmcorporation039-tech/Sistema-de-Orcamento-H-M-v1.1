import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Login from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';
import AprovacaoPublica from './pages/AprovacaoPublica';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ObrasHub from './pages/hubs/ObrasHub';
import PropostasHub from './pages/hubs/PropostasHub';
import BasePrecosHub from './pages/hubs/BasePrecosHub';
import FinanceiroHub from './pages/hubs/FinanceiroHub';
import CadastrosHub from './pages/hubs/CadastrosHub';

function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  // Senha provisória (conta nova ou senha redefinida por um administrador):
  // o sistema só abre depois que a pessoa definir a própria senha. É o que
  // impede uma senha entregue por terceiro de continuar valendo.
  if (usuario.senhaProvisoria) return <DefinirSenha />;
  return children;
}

function RotaAdmin({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.senhaProvisoria) return <DefinirSenha />;
  if (usuario.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

// Rotas da versão 1.x (itens soltos do menu) → hub do grupo, na aba certa.
// Links salvos, e-mails e favoritos continuam funcionando. Os outros
// parâmetros da URL são mantidos (ex.: ?laudo=ID da Análise de Projeto).
//   para: caminho de destino, ou função (params, busca) => caminho (pode
//         ajustar a `busca` antes do redirecionamento)
//   aba:  valor de ?aba= no destino
function Redirecionar({ para, aba }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const busca = new URLSearchParams(search);
  const caminho = typeof para === 'function' ? para(params, busca) : para;
  if (aba) busca.set('aba', aba);
  const qs = busca.toString();
  return <Navigate to={`${caminho}${qs ? `?${qs}` : ''}${hash}`} replace />;
}

// /analise-projeto?aba=laudos&laudo=ID ("Calcular pela norma") → aba de laudos;
// qualquer outro ?aba= da tela antiga → análise de projeto.
function destinoAnaliseProjeto(params, busca) {
  busca.set('aba', busca.get('aba') === 'laudos' ? 'laudos' : 'analise');
  return '/obras';
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* PÚBLICA (2.0, Fase 3I): o cliente abre pelo link enviado pela H&M — sem
              login e fora do Layout; fala só com /api/publico/aprovacao */}
          <Route path="/aprovacao/:token" element={<AprovacaoPublica />} />
          <Route path="/" element={
            <RotaProtegida>
              <Layout />
            </RotaProtegida>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Menu da versão 2.0: seis grupos, cada um uma página com abas
                (pages/hubs). Abas só de admin somem para os demais usuários
                dentro do próprio hub; a API continua exigindo admin. */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="obras" element={<ObrasHub />} />
            <Route path="obras/analise/:id" element={<ObrasHub abaFixa="analise" />} />
            {/* página da obra (Fase 2D): abas Resumo, Projeto, Disciplinas… em ?secao= */}
            <Route path="obras/:id" element={<ObrasHub abaFixa="obras" />} />
            <Route path="propostas" element={<PropostasHub />} />
            <Route path="propostas/editar" element={<PropostasHub abaFixa="editar" />} />
            <Route path="propostas/editar/:id" element={<PropostasHub abaFixa="editar" />} />
            <Route path="base-precos" element={<BasePrecosHub />} />
            {/* Financeiro inteiro é restrito: faturamento, pagamentos e dados de terceiros */}
            <Route path="financeiro" element={<RotaAdmin><FinanceiroHub /></RotaAdmin>} />
            <Route path="cadastros" element={<CadastrosHub />} />

            {/* Rotas antigas (1.x) → hub na aba certa */}
            <Route path="orcamento" element={<Redirecionar para="/propostas" aba="editar" />} />
            <Route path="orcamento/:id" element={<Redirecionar para={p => `/propostas/editar/${encodeURIComponent(p.id)}`} />} />
            <Route path="historico" element={<Redirecionar para="/propostas" aba="lista" />} />
            <Route path="relatorios" element={<Redirecionar para="/propostas" aba="lista" />} />
            <Route path="analise-projeto" element={<Redirecionar para={destinoAnaliseProjeto} />} />
            <Route path="analise-projeto/:id" element={<Redirecionar para={p => `/obras/analise/${encodeURIComponent(p.id)}`} />} />
            <Route path="materiais" element={<Redirecionar para="/base-precos" aba="materiais" />} />
            <Route path="precos-mao-de-obra" element={<Redirecionar para="/base-precos" aba="mao-de-obra" />} />
            <Route path="prestadores" element={<Redirecionar para="/financeiro" aba="prestadores" />} />
            <Route path="contratos" element={<Redirecionar para="/financeiro" aba="contratos" />} />
            <Route path="clientes" element={<Redirecionar para="/cadastros" aba="clientes" />} />
            <Route path="usuarios" element={<Redirecionar para="/cadastros" aba="usuarios" />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
