import Hub from './Hub';
import { useAuth } from '../../hooks/useAuth';
import Clientes from '../Clientes';
import Usuarios from '../Usuarios';
import Integracoes from '../Integracoes';
import DadosFiscais from '../DadosFiscais';

// Grupo "Cadastros e administração": clientes (todos), dados fiscais da
// empresa para a NFS-e, usuários e integrações (rotinas automáticas, e-mail,
// IA) — esses três só admin.
//   /cadastros?aba=clientes | ?aba=fiscal | ?aba=usuarios | ?aba=integracoes
const ABAS = [
  { chave: 'clientes', rotulo: 'Clientes', render: () => <Clientes /> },
  { chave: 'fiscal', rotulo: 'Dados fiscais', admin: true, render: () => <DadosFiscais /> },
  { chave: 'usuarios', rotulo: 'Usuários', admin: true, render: () => <Usuarios /> },
  { chave: 'integracoes', rotulo: 'Integrações', admin: true, render: () => <Integracoes /> },
];

export default function CadastrosHub() {
  const { usuario } = useAuth();
  // Para quem não é admin só sobra "Clientes" — o nome do grupo acompanha.
  const grupo = usuario?.role === 'admin' ? 'Cadastros e administração' : 'Cadastros';
  return <Hub grupo={grupo} base="/cadastros" abas={ABAS} />;
}
