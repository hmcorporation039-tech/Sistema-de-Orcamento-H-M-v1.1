import Hub from './Hub';
import Financeiro from '../Financeiro';
import Prestadores from '../Prestadores';
import Contratos from '../Contratos';

// Grupo "Financeiro" — inteiro restrito a administradores (a rota também
// passa por RotaAdmin, porque a API exige admin em tudo isto).
//   /financeiro (?aba=movimentos) | ?aba=prestadores | ?aba=contratos
const ABAS = [
  { chave: 'movimentos', rotulo: 'Movimentos', admin: true, render: () => <Financeiro /> },
  { chave: 'prestadores', rotulo: 'Prestadores', admin: true, render: () => <Prestadores /> },
  { chave: 'contratos', rotulo: 'Contratos', admin: true, render: () => <Contratos /> },
];

export default function FinanceiroHub() {
  return <Hub grupo="Financeiro" base="/financeiro" abas={ABAS} />;
}
