import Hub from './Hub';
import { useAuth } from '../../hooks/useAuth';
import Clientes from '../Clientes';
import Usuarios from '../Usuarios';
import Integracoes from '../Integracoes';

// Grupo "Cadastros e administração": clientes (todos), usuários e integrações
// (rotinas automáticas, e-mail, IA — só admin).
//   /cadastros?aba=clientes | ?aba=usuarios | ?aba=integracoes
const ABAS = [
  { chave: 'clientes', rotulo: 'Clientes', render: () => <Clientes /> },
  { chave: 'usuarios', rotulo: 'Usuários', admin: true, render: () => <Usuarios /> },
  { chave: 'integracoes', rotulo: 'Integrações', admin: true, render: () => <Integracoes /> },
];

export default function CadastrosHub() {
  const { usuario } = useAuth();
  // Para quem não é admin só sobra "Clientes" — o nome do grupo acompanha.
  const grupo = usuario?.role === 'admin' ? 'Cadastros e administração' : 'Cadastros';
  return <Hub grupo={grupo} base="/cadastros" abas={ABAS} />;
}
