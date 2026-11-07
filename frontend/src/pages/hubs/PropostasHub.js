import Hub from './Hub';
import Historico from '../Historico';
import Orcamento from '../Orcamento';
import Concorrencia from '../Concorrencia';
import AprendizadoOrcamento from '../AprendizadoOrcamento';

// Grupo "Propostas": a lista (antigo Histórico, já com o resumo/exportação do
// antigo Relatórios), o formulário de orçamento, o comparador com a concorrência
// e o que o sistema já aprendeu a orçar por disciplina (06/11/2026).
//
// Rotas:
//   /propostas  ou  /propostas?aba=lista   → lista de propostas
//   /propostas?aba=editar                  → nova proposta
//   /propostas/editar/:id                  → editar a proposta :id
//   /propostas?aba=concorrencia[&proposta=ID][&comparacao=ID] → comparador
//   /propostas?aba=aprendizado             → aprendizado de orçamento
// O Orcamento lê o id com useParams, por isso a edição usa o caminho e não o
// ?aba= (a rota passa abaFixa="editar").
const ABAS = [
  { chave: 'lista', rotulo: 'Propostas', render: () => <Historico /> },
  { chave: 'editar', rotulo: 'Nova / editar', render: () => <Orcamento /> },
  { chave: 'concorrencia', rotulo: 'Concorrência', render: () => <Concorrencia /> },
  { chave: 'aprendizado', rotulo: 'O que já sabe orçar', render: () => <AprendizadoOrcamento /> },
];

export default function PropostasHub({ abaFixa }) {
  return <Hub grupo="Propostas" base="/propostas" abas={ABAS} abaFixa={abaFixa} />;
}
