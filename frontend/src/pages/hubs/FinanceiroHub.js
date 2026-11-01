import Hub from './Hub';
import Financeiro from '../Financeiro';
import Prestadores from '../Prestadores';
import Contratos from '../Contratos';
import NotasFiscais from '../NotasFiscais';

// Grupo "Financeiro" — inteiro restrito a administradores (a rota também
// passa por RotaAdmin, porque a API exige admin em tudo isto).
//   /financeiro (?aba=movimentos) | ?aba=notas | ?aba=prestadores | ?aba=contratos
// Notas fiscais (2.4): NFS-e — rascunho, duplicar, PDF, e-mail, importação.
const ABAS = [
  { chave: 'movimentos', rotulo: 'Movimentos', admin: true, render: () => <Financeiro /> },
  { chave: 'notas', rotulo: 'Notas fiscais', admin: true, render: () => <NotasFiscais /> },
  { chave: 'prestadores', rotulo: 'Prestadores', admin: true, render: () => <Prestadores /> },
  { chave: 'contratos', rotulo: 'Contratos', admin: true, render: () => <Contratos /> },
];

export default function FinanceiroHub() {
  return <Hub grupo="Financeiro" base="/financeiro" abas={ABAS} />;
}
