import { useParams } from 'react-router-dom';
import Hub from './Hub';
import Compatibilizacao from '../AnaliseProjeto';
import LaudosProjetos from '../../components/laudos/LaudosProjetos';
import ListaObras from '../obras/ListaObras';
import DetalheObra from '../obras/DetalheObra';

// Grupo "Obras" (versão 2.0; abas separadas na 2.1). A lista de obras é a
// primeira aba; depois vêm as três coisas que NÃO se misturam:
//   Análise de projeto      — o projeto RECEBIDO (PDF), com finalidade "Orçamento"
//                             ou "Elaboração de projeto"; nunca gera laudo
//   Projetos por disciplina — o projeto que a H&M elabora/entrega (memorial,
//                             desenhos, as-built, DXF, QElectroTech, PDF)
//   Laudos                  — inspeção pedida quando necessário (checklist,
//                             fotos, medições); nasce do "Novo laudo"
//
// Rotas:
//   /obras                          → lista de obras (Fase 2D)
//   /obras/:id[?secao=...]          → página da obra (abaFixa 'obras'; o :id é numérico)
//   /obras?aba=analise[&obra=ID]    → análise de projeto (nova); ?obra= = já ligada à obra
//   /obras/analise/:id              → análise salva (Compatibilizacao lê o :id)
//   /obras?aba=projetos[&laudo=ID][&obra=ID] → projetos por disciplina
//   /obras?aba=laudos[&laudo=ID][&obra=ID]   → laudos
// O ?laudo=ID abre o registro direto. Links antigos (?aba=laudos&laudo=ID de
// um registro que é projeto) são levados para a aba certa pelo tipo — quem
// faz isso é o LaudosProjetos, que regrava a URL como ?aba=<projetos|laudos>.
// As chaves 'projetos' e 'laudos' não devem mudar.
function AbaObras() {
  const { id } = useParams();
  return id ? <DetalheObra key={id} /> : <ListaObras />;
}

const ABAS = [
  { chave: 'obras', rotulo: 'Obras', para: '/obras?aba=obras', render: () => <AbaObras /> },
  { chave: 'analise', rotulo: 'Análise de projeto', render: () => <Compatibilizacao /> },
  { chave: 'projetos', rotulo: 'Projetos por disciplina', render: () => <LaudosProjetos key="projeto" tipo="projeto" /> },
  { chave: 'laudos', rotulo: 'Laudos', render: () => <LaudosProjetos key="laudo" tipo="laudo" /> },
];

export default function ObrasHub({ abaFixa }) {
  return <Hub grupo="Obras" base="/obras" abas={ABAS} abaFixa={abaFixa} larga />;
}
