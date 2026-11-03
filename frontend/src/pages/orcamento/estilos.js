import { estilos } from '../../components/ui/estilos';

// Estilos do editor de orçamento (pages/Orcamento.js e as peças da pasta orcamento/).

export const fieldsetLimpo = { border: 0, padding: 0, margin: 0, minWidth: 0 };
export const btnUsar = { background: 'none', border: 'none', color: '#c9a227', textDecoration: 'underline', cursor: 'pointer', fontSize: 10.5, padding: 0 };
export const btnPesquisar = {
  display: 'inline-flex', alignItems: 'center', padding: '2px 7px', background: 'transparent', border: '1px dashed #333',
  borderRadius: 5, color: 'var(--texto-2)', fontWeight: 700, fontSize: 10.5, cursor: 'pointer', whiteSpace: 'nowrap',
};
export const etiqueta = { fontSize: 11.5, border: '1px solid', borderRadius: 4, padding: '0 5px', textTransform: 'uppercase', letterSpacing: '.4px' };

// Estilos do kit de tela (components/ui/estilos.js), com o que esta tela tem
// de diferente por cima — o visual ficou como era.
export const rotulo = estilos.rotulo;
export const card = { ...estilos.card, padding: 20 };
export const btnPrimario = { ...estilos.btnPrimario, display: 'flex' };

export const btnSecundario = {
  display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'transparent',
  border: '1px dashed #333', borderRadius: 6, color: 'var(--texto-2)', fontWeight: 700,
  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
};

export const btnIcone = { ...estilos.btnIcone, display: 'flex' };
