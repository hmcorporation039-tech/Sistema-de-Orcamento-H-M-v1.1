import { estilos } from '../../components/ui/estilos';

// Estilos da Análise de Projeto (pages/AnaliseProjeto.js e as peças da pasta analise/).
// Estilos do kit de tela (components/ui/estilos.js), com o que esta tela tem
// de diferente por cima — o visual ficou como era (divisão da tela em 2.39).
export const card = { ...estilos.card, padding: 22 };

export const tituloSecao = { fontSize: 15, color: '#c9a227', fontWeight: 700, marginBottom: 10 };
export const inputPonto = { width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 5, color: '#ddd', fontSize: 12, padding: '5px 7px', boxSizing: 'border-box', fontFamily: 'inherit' };

export const btnPrimario = { ...estilos.btnPrimario, display: 'flex', fontSize: 13 };

export const btnSecundario = estilos.btnTracejado;

// rótulo pequeno em maiúsculas dos campos do cabeçalho da análise
export const rotuloCabecalho = { fontSize: 12, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 };

export function formatarHora(data) {
  return data ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}
