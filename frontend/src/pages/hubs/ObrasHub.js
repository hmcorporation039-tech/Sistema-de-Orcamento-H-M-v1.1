import { useParams } from 'react-router-dom';
import Hub from './Hub';
import Compatibilizacao from '../AnaliseProjeto';
import LaudosProjetos from '../../components/laudos/LaudosProjetos';
import ListaObras from '../obras/ListaObras';
import DetalheObra from '../obras/DetalheObra';

// Grupo "Obras" (versão 2.0). A lista de obras é a primeira aba; a Análise de
// Projeto (PDF) e os laudos e projetos por disciplina continuam como abas.
//
// Rotas:
//   /obras                          → lista de obras (Fase 2D)
//   /obras/:id[?secao=...]          → página da obra (abaFixa 'obras'; o :id é numérico)
//   /obras?aba=analise[&obra=ID]    → análise de projeto (nova); ?obra= = já ligada à obra
//   /obras/analise/:id              → análise salva (Compatibilizacao lê o :id)
//   /obras?aba=laudos[&laudo=ID][&obra=ID] → laudos; o ?laudo= abre o laudo direto
//                                     ("Calcular pela norma" da análise); ?obra= = novo laudo na obra
//
// A chave 'laudos' não deve mudar: o LaudosProjetos, ao abrir um laudo pelo
// ?laudo=, regrava a URL como ?aba=laudos.
function AbaObras() {
  const { id } = useParams();
  return id ? <DetalheObra key={id} /> : <ListaObras />;
}

const ABAS = [
  { chave: 'obras', rotulo: 'Obras', para: '/obras?aba=obras', render: () => <AbaObras /> },
  { chave: 'analise', rotulo: 'Análise de projeto (PDF)', render: () => <Compatibilizacao /> },
  { chave: 'laudos', rotulo: 'Laudos e projetos por disciplina', render: () => <LaudosProjetos /> },
];

export default function ObrasHub({ abaFixa }) {
  return <Hub grupo="Obras" base="/obras" abas={ABAS} abaFixa={abaFixa} larga />;
}
