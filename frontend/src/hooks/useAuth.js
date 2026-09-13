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
