import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Hub from './Hub';
import Compatibilizacao from '../AnaliseProjeto';
import LaudosProjetos from '../../components/laudos/LaudosProjetos';
import ListaObras from '../obras/ListaObras';
import DetalheObra from '../obras/DetalheObra';
import ItensSemObra from '../obras/ItensSemObra';
import ProjetoDaEspecificacao from '../../components/especificacao/ProjetoDaEspecificacao';

// Grupo "Obras". Revisão de 14/11/2026 (2.42): UMA porta — tudo nasce e é visto DENTRO da obra
// (/obras/:id: Visão geral, Projeto, Proposta, Execução, Financeiro, Arquivos). O menu de abas do
// topo ficou só com:
//   Obras          — a lista (botões de status, etapa e próximo passo de cada obra)
//   Itens sem obra — análises, projetos, laudos e propostas soltos, com a obra sugerida para ligar,
//                    e os Pix sem obra (margem real)
// As telas de antes continuam abrindo pela URL (abas OCULTAS: links antigos, botões da obra, assistente):
//   /obras?aba=analise[&obra=ID]    → envio de análise (nova) e lista; /obras/analise/:id → análise salva
//   /obras?aba=projetos[&laudo=ID][&obra=ID] → projeto por disciplina
//   /obras?aba=laudos[&laudo=ID][&obra=ID]   → laudo
//   /obras?aba=especificacao[&obra=ID]       → projeto pela especificação do cliente
//   /obras?aba=aprendizado          → foi para Cadastros e admin › "O que o sistema sabe"
// O ?laudo=ID abre o registro direto. Links antigos (?aba=laudos&laudo=ID de um registro que é projeto)
// são levados para a aba certa pelo tipo — quem faz isso é o LaudosProjetos, que regrava a URL como
// ?aba=<projetos|laudos>. As chaves 'projetos' e 'laudos' não devem mudar.
function AbaObras() {
  const { id } = useParams();
  return id ? <DetalheObra key={id} /> : <ListaObras />;
}

// Tela aberta a partir da obra (?obra=ID): o caminho de volta fica à vista
function ComVolta({ children }) {
  const [p] = useSearchParams();
  const obra = Number(p.get('obra'));
  return (
    <>
      {obra > 0 && <Link to={`/obras/${obra}?secao=projeto`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ouro-claro)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }} data-testid="voltar-obra"><ArrowLeft size={14} /> Voltar para a obra</Link>}
      {children}
    </>
  );
}

const ABAS = [
  { chave: 'obras', rotulo: 'Obras', para: '/obras?aba=obras', render: () => <AbaObras /> },
  { chave: 'sem-obra', rotulo: 'Itens sem obra', render: () => <ItensSemObra /> },
  { chave: 'analise', rotulo: 'Análise de projeto', oculta: true, render: () => <ComVolta><Compatibilizacao /></ComVolta> },
  { chave: 'projetos', rotulo: 'Projeto por disciplina', oculta: true, render: () => <ComVolta><LaudosProjetos key="projeto" tipo="projeto" /></ComVolta> },
  { chave: 'laudos', rotulo: 'Laudo', oculta: true, render: () => <ComVolta><LaudosProjetos key="laudo" tipo="laudo" /></ComVolta> },
  // projeto do quadro/painel pela especificação do cliente, sem IA (09/11/2026)
  { chave: 'especificacao', rotulo: 'Projeto pela especificação', oculta: true, render: () => <ComVolta><ProjetoDaEspecificacao /></ComVolta> },
  { chave: 'aprendizado', rotulo: 'O que o sistema sabe', oculta: true, render: () => <Navigate to="/cadastros?aba=conhecimento" replace /> },
];

export default function ObrasHub({ abaFixa }) {
  return <Hub grupo="Obras" base="/obras" abas={ABAS} abaFixa={abaFixa} larga />;
}
