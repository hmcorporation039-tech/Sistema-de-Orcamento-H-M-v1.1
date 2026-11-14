import { estilos } from '../../components/ui/estilos';
import { useRotuloLigado } from '../../components/ui/rotuloLigado';
import { hojeBrasilia, somarDias } from '../../utils/format';

// Regras e estilos da lista de propostas (pages/Historico.js e as peças da pasta historico/).
// Divisão da tela em 2.39 — o visual e o comportamento ficaram como eram.

export const ACAO_LABEL = {
  criada: 'Criada',
  editada: 'Editada',
  status: 'Status alterado',
  duplicada: 'Duplicada',
  email: 'Enviada por e-mail',
  link_aprovacao: 'Link de aprovação',
  link_revogado: 'Link revogado',
  aprovada_link: 'Aprovada pelo cliente (link)',
  recusada_link: 'Recusada pelo cliente (link)',
};

export const STATUS_DA_PROPOSTA = ['Ativa', 'Aprovada', 'Recusada', 'Cancelada'];

// Só faz sentido avisar sobre vencimento de propostas que ainda estão em aberto.
// As linhas que vêm do resumo por período (/relatorios/propostas) não trazem a
// validade — sem ela não dá para calcular, e não se pode supor "0 dias" (isso
// marcaria toda proposta ativa antiga como vencida).
export function diasParaVencer(p) {
  if (p.status !== 'Ativa' || !p.data || p.validade == null) return null;
  const dataLimite = new Date(p.data);
  dataLimite.setUTCDate(dataLimite.getUTCDate() + (Number(p.validade) || 0));
  // "hoje" em Brasília (o dia do computador podia ser outro fora do fuso)
  const hojeUTC = Date.parse(`${hojeBrasilia()}T00:00:00Z`);
  return Math.round((dataLimite.getTime() - hojeUTC) / 86400000);
}

// Mesmo tamanho de página do backend (utils/paginacao.js), para a lista ter o
// mesmo jeito com ou sem período escolhido.
export const POR_PAGINA = 30;

// A rota /relatorios/propostas sempre filtra por período (sem datas ela usa o
// mês atual). Sem período escolhido aqui, a lista mostra todo o histórico —
// então o resumo e a exportação vão de uma data bem antiga até hoje.
export const INICIO_DO_HISTORICO = '2000-01-01';

export const ATALHOS_PERIODO = [
  { rotulo: 'Todo o histórico', calcular: () => ['', ''] },
  // datas no dia de Brasília (hojeBrasilia), não no do computador
  { rotulo: 'Este mês', calcular: () => { const h = hojeBrasilia(); return [`${h.slice(0, 7)}-01`, h]; } },
  { rotulo: 'Mês passado', calcular: () => { const fim = somarDias(`${hojeBrasilia().slice(0, 7)}-01`, -1); return [`${fim.slice(0, 7)}-01`, fim]; } },
  { rotulo: 'Este ano', calcular: () => { const h = hojeBrasilia(); return [`${h.slice(0, 4)}-01-01`, h]; } },
];

export function filtrosDoRelatorio(dataInicio, dataFim, status, busca) {
  return {
    dataInicio, dataFim,
    ...(status ? { status } : {}),
    ...(busca ? { busca } : {}),
  };
}

// Estilos do kit de tela (components/ui/estilos.js). O botão secundário desta
// tela é um pouco maior e mais apagado que o do kit — mantido como era.
export const { rotulo, card, th, td, tdVazio, btnPrimario, btnIcone } = estilos;
export const btnSecundario = { ...estilos.btnSecundario, padding: '9px 16px', color: 'var(--texto-2)' };

// largura: coluna de tamanho fixo; flexivel: ocupa o que sobrar da linha
// Campo com largura fixa ou flexível (a barra de filtros quebra em linhas)
export function Campo({ label, children, largura, flexivel }) {
  const { idCampo, filhos } = useRotuloLigado(children);
  return (
    <div style={flexivel ? { flex: '1 1 220px', minWidth: 0 } : { width: largura, flex: '0 1 auto' }}>
      <label style={rotulo} htmlFor={idCampo || undefined}>{label}</label>
      {filhos}
    </div>
  );
}
