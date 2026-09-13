import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Login from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orcamento from './pages/Orcamento';
import Materiais from './pages/Materiais';
import Clientes from './pages/Clientes';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import Financeiro from './pages/Financeiro';
import Prestadores from './pages/Prestadores';
import Contratos from './pages/Contratos';
import Usuarios from './pages/Usuarios';
import AnaliseProjeto from './pages/AnaliseProjeto';
import PrecosMaoDeObra from './pages/PrecosMaoDeObra';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <RotaProtegida>
              <Layout />
            </RotaProtegida>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orcamento" element={<Orcamento />} />
            <Route path="orcamento/:id" element={<Orcamento />} />
            <Route path="materiais" element={<Materiais />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="historico" element={<Historico />} />
            <Route path="relatorios" element={<Relatorios />} />
            {/* Áreas restritas: a API exige admin nessas rotas, então o
                acesso direto pela URL também precisa ser barrado aqui. */}
            <Route path="financeiro" element={<RotaAdmin><Financeiro /></RotaAdmin>} />
            <Route path="prestadores" element={<RotaAdmin><Prestadores /></RotaAdmin>} />
            <Route path="contratos" element={<RotaAdmin><Contratos /></RotaAdmin>} />
            <Route path="analise-projeto" element={<AnaliseProjeto />} />
            <Route path="analise-projeto/:id" element={<AnaliseProjeto />} />
            <Route path="usuarios" element={<RotaAdmin><Usuarios /></RotaAdmin>} />
            <Route path="precos-mao-de-obra" element={<RotaAdmin><PrecosMaoDeObra /></RotaAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
