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

// estilos e Campo moraram aqui até a revisão de 28/10/2026; agora são do kit de tela
export { estilos, Campo } from '../../components/ui/estilos';
