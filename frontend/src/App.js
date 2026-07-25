import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Login from './pages/Login';
import Layout from './components/Layout';
import Orcamento from './pages/Orcamento';
import Materiais from './pages/Materiais';
import Clientes from './pages/Clientes';
import Historico from './pages/Historico';
import Usuarios from './pages/Usuarios';

function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RotaAdmin({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.role !== 'admin') return <Navigate to="/orcamento" replace />;
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
            <Route index element={<Navigate to="/orcamento" replace />} />
            <Route path="orcamento" element={<Orcamento />} />
            <Route path="orcamento/:id" element={<Orcamento />} />
            <Route path="materiais" element={<Materiais />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="historico" element={<Historico />} />
            <Route path="usuarios" element={<RotaAdmin><Usuarios /></RotaAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
