import Hub from './Hub';
import { useAuth } from '../../hooks/useAuth';
import Clientes from '../Clientes';
import Usuarios from '../Usuarios';
import Integracoes from '../Integracoes';
import DadosFiscais from '../DadosFiscais';
import MinhaConta from '../conta/MinhaConta';
import Auditoria from '../conta/Auditoria';
import CanalRemoto from '../CanalRemoto';

// Grupo "Cadastros e administração": clientes (todos), dados fiscais da
// empresa para a NFS-e, usuários e integrações (rotinas automáticas, e-mail,
// IA) — esses três só admin. Fase 6 (02/11/2026): "Minha conta" (sessões,
// verificação em duas etapas, Telegram/WhatsApp) para todos e "Auditoria" só admin.
//   /cadastros?aba=clientes | ?aba=conta | ?aba=fiscal | ?aba=usuarios | ?aba=auditoria | ?aba=integracoes
const ABAS = [
  { chave: 'clientes', rotulo: 'Clientes', render: () => <Clientes /> },
  { chave: 'fiscal', rotulo: 'Dados fiscais', admin: true, render: () => <DadosFiscais /> },
  { chave: 'usuarios', rotulo: 'Usuários', admin: true, render: () => <Usuarios /> },
  { chave: 'integracoes', rotulo: 'Integrações', admin: true, render: () => <Integracoes /> },
  // Fase 6: estado do Telegram/WhatsApp, fila, ações pendentes e simulador (?aba=canal)
  { chave: 'canal', rotulo: 'Canal remoto', admin: true, render: () => <CanalRemoto /> },
  { chave: 'auditoria', rotulo: 'Auditoria', admin: true, render: () => <Auditoria /> },
  { chave: 'conta', rotulo: 'Minha conta', render: () => <MinhaConta /> },
];

export default function CadastrosHub() {
  const { usuario } = useAuth();
  // Para quem não é admin só sobram "Clientes" e "Minha conta" — o nome do grupo acompanha.
  const grupo = usuario?.role === 'admin' ? 'Cadastros e administração' : 'Cadastros';
  return <Hub grupo={grupo} base="/cadastros" abas={ABAS} />;
}
