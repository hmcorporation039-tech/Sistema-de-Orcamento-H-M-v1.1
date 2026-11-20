import Hub from './Hub';
import Historico from '../Historico';
import Orcamento from '../Orcamento';
import Concorrencia from '../Concorrencia';
import { Navigate } from 'react-router-dom';

// Grupo "Propostas": a lista (antigo Histórico, já com o resumo/exportação do
// antigo Relatórios), o formulário de orçamento e o comparador com a concorrência.
// (2.49: "O que já sabe orçar" foi para Cadastros › "O que o sistema sabe", por disciplina.)
//
// Rotas:
//   /propostas  ou  /propostas?aba=lista   → lista de propostas
//   /propostas?aba=editar                  → nova proposta
//   /propostas/editar/:id                  → editar a proposta :id
//   /propostas?aba=concorrencia[&proposta=ID][&comparacao=ID] → comparador
//   /propostas?aba=aprendizado             → foi para /cadastros?aba=conhecimento (2.49)
// O Orcamento lê o id com useParams, por isso a edição usa o caminho e não o
// ?aba= (a rota passa abaFixa="editar").
const ABAS = [
  { chave: 'lista', rotulo: 'Propostas', render: () => <Historico /> },
  { chave: 'editar', rotulo: 'Nova / editar', render: () => <Orcamento /> },
  { chave: 'concorrencia', rotulo: 'Concorrência', render: () => <Concorrencia /> },
  { chave: 'aprendizado', rotulo: 'O que o sistema sabe', oculta: true, render: () => <Navigate to="/cadastros?aba=conhecimento" replace /> },
];

export default function PropostasHub({ abaFixa }) {
  return <Hub grupo="Propostas" base="/propostas" abas={ABAS} abaFixa={abaFixa} />;
}
