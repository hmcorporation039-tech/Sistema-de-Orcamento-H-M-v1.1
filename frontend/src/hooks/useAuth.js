import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hm_token');
    const user = localStorage.getItem('hm_usuario');
    if (token && user) {
      setUsuario(JSON.parse(user));
    }
    setCarregando(false);
  }, []);

  // Sincroniza logout entre abas: o evento "storage" só dispara nas OUTRAS
  // abas (nunca na que fez a mudança), então é exatamente o que falta pra
  // avisar essas abas quando alguém clica em Sair numa delas — sem isso, cada
  // aba só descobria que o token sumiu na próxima chamada à API (401).
  // Mesma lógica serve pro login: logar numa aba loga todas as outras juntas.
  useEffect(() => {
    function aoMudarStorageEmOutraAba(e) {
      if (e.key !== 'hm_token' && e.key !== 'hm_usuario') return;
      const token = localStorage.getItem('hm_token');
      const user = localStorage.getItem('hm_usuario');
      setUsuario(token && user ? JSON.parse(user) : null);
    }
    window.addEventListener('storage', aoMudarStorageEmOutraAba);
    return () => window.removeEventListener('storage', aoMudarStorageEmOutraAba);
  }, []);

  async function entrar(email, senha) {
    const res = await apiLogin(email, senha);
    const { token, usuario } = res.data;
    localStorage.setItem('hm_token', token);
    localStorage.setItem('hm_usuario', JSON.stringify(usuario));
    setUsuario(usuario);
    return usuario;
  }

  function sair() {
    localStorage.removeItem('hm_token');
    localStorage.removeItem('hm_usuario');
    setUsuario(null);
  }

  // Chamado quando a pessoa define a própria senha: tira a marca de provisória
  // sem precisar deslogar e logar de novo.
  function senhaDefinida() {
    setUsuario(atual => {
      if (!atual) return atual;
      const atualizado = { ...atual, senhaProvisoria: false };
      localStorage.setItem('hm_usuario', JSON.stringify(atualizado));
      return atualizado;
    });
  }

  return (
    <AuthContext.Provider value={{ usuario, entrar, sair, carregando, senhaDefinida }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
