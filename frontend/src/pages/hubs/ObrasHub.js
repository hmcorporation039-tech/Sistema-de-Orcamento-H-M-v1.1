import Hub from './Hub';
import Compatibilizacao from '../AnaliseProjeto';
import LaudosProjetos from '../../components/laudos/LaudosProjetos';

// Grupo "Obras". Por enquanto reúne a Análise de Projeto (PDF) e os laudos e
// projetos por disciplina (antes uma aba interna da Análise, em ?aba=laudos).
//
// Rotas:
//   /obras                          → análise de projeto (nova)
//   /obras/analise/:id              → análise salva (Compatibilizacao lê o :id)
//   /obras?aba=laudos[&laudo=ID]    → laudos; o ?laudo= abre o laudo direto
//                                     ("Calcular pela norma" da análise)
//
// Fase 2 (entidade Obra): as novas abas entram nesta lista — ex.: a lista de
// obras como primeira aba e, dentro da obra, projetos/laudos/propostas dela.
// A chave 'laudos' não deve mudar: o LaudosProjetos, ao abrir um laudo pelo
// ?laudo=, regrava a URL como ?aba=laudos.
const ABAS = [
  { chave: 'analise', rotulo: 'Análise de projeto (PDF)', render: () => <Compatibilizacao /> },
  { chave: 'laudos', rotulo: 'Laudos e projetos por disciplina', render: () => <LaudosProjetos /> },
];

export default function ObrasHub({ abaFixa }) {
  return <Hub grupo="Obras" base="/obras" abas={ABAS} abaFixa={abaFixa} larga />;
}
