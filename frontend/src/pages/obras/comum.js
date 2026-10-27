// Peças comuns das telas de Obra (versão 2.0, Fase 2D).
import { formatarMoeda } from '../../utils/format';

export const STATUS_OBRA = {
  prospeccao: { rotulo: 'Prospecção', cor: '#8aa4c8', bg: '#0e131b', borda: '#24344a' },
  orcamento: { rotulo: 'Orçamento', cor: '#c9a227', bg: '#1a1a0a', borda: '#4a3d10' },
  contratada: { rotulo: 'Contratada', cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' },
  execucao: { rotulo: 'Em execução', cor: '#5fc9c0', bg: '#0a1a19', borda: '#1a4a46' },
  concluida: { rotulo: 'Concluída', cor: '#9a9a9a', bg: '#151515', borda: '#2f2f2f' },
  cancelada: { rotulo: 'Cancelada', cor: '#b04040', bg: '#1a0a0a', borda: '#4a1a1a' },
};
export const SEGMENTO = { publico: 'Público (referência oficial)', privado: 'Privado (mercado particular)' };
export const SEGMENTO_CURTO = { publico: 'Público', privado: 'Privado' };

export const STATUS_PROPOSTA = {
  Ativa: { bg: '#1a1a0a', cor: '#c9a227', borda: '#4a3d10' },
  Aprovada: { bg: '#0a1a0f', cor: '#3fb95f', borda: '#1a4a26' },
  Recusada: { bg: '#1a0a0a', cor: '#b04040', borda: '#4a1a1a' },
  Cancelada: { bg: '#141414', cor: '#666', borda: '#2a2a2a' },
};

// Como o orçado foi calculado (regra em backend/src/utils/obras.js calcularOrcado)
export const BASE_ORCADO = {
  aprovadas: 'soma das propostas aprovadas',
  ultima_ativa: 'estimativa: proposta ativa mais recente (nenhuma aprovada)',
  nenhuma: 'sem proposta aprovada ou ativa',
};

export function Etiqueta({ info, children }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
      background: info?.bg || '#151515', color: info?.cor || '#999', border: `1px solid ${info?.borda || '#2a2a2a'}` }}>
      {children}
    </span>
  );
}

export const moeda = (v) => (v == null ? '—' : formatarMoeda(v));
export const pct = (v) => (v == null ? '' : `${String(v).replace('.', ',')}%`);
export const corMargem = (v) => (v == null ? '#777' : v < 0 ? '#e08080' : '#3fb95f');

export const estilos = {
  card: { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: 18, marginBottom: 16 },
  th: { padding: '10px 14px', fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, textAlign: 'left' },
  td: { padding: '10px 14px', color: '#ccc', verticalAlign: 'middle' },
  tdVazio: { padding: '30px 14px', textAlign: 'center', color: '#555' },
  tabela: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  caixaTabela: { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'auto' },
  rotulo: { display: 'block', fontSize: 10, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
  btnPrimario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#c9a227', border: 'none',
    borderRadius: 6, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnSecundario: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid #2a2a2a',
    borderRadius: 6, color: '#bbb', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
  btnIcone: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: 5, color: '#999', cursor: 'pointer',
  },
  link: { color: '#c9a227', textDecoration: 'none', fontWeight: 700 },
};

export function Campo({ label, children, style }) {
  return (
    <div style={style}>
      <label style={estilos.rotulo}>{label}</label>
      {children}
    </div>
  );
}
