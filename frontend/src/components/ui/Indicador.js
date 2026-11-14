import { estilos } from './estilos';

// Cartão de número (KPI): rótulo pequeno em maiúsculas, o número grande e, se
// houver, uma linha de apoio embaixo. Revisão de 14/11/2026 — havia oito cópias
// (CardResumo do painel, financeiro e histórico, Cartao da obra, Indicador das
// notas fiscais e dos laudos, ResumoBloco da análise de projeto). As variantes
// guardam o visual que cada tela já tinha:
//   'cartao'   (padrão) cartão do kit: painel, financeiro, histórico, obra;
//   'compacto' cartão menor das notas fiscais; valor nulo aparece como '—';
//   'laudo'    resultado de cálculo: a cor vem de `ok` (verde atende, vermelho
//              não atende, dourado quando não há critério — ok nulo/indefinido);
//   'bloco'    blocos do resumo do orçamento na análise de projeto.
// `cor` pinta o número; `destaque` usa o dourado da variante; `icone` vai antes
// do rótulo; `sub` é a linha de apoio; `tamanho` troca a fonte do número;
// `style` vai por cima da caixa.

const ROTULO = { fontSize: 11.5, color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '.5px' };
const SUB = { fontSize: 12, color: 'var(--texto-3)', marginTop: 3 };
const corDoOk = (ok) => (ok == null ? '#c9a227' : ok ? '#3fb95f' : '#e05050');

const VARIANTES = {
  cartao: ({ cor, destaque }) => ({
    caixa: { ...estilos.card, marginBottom: 0 },
    rotulo: { ...ROTULO, marginBottom: 6 },
    valor: { fontSize: 20, fontWeight: 700, color: destaque ? '#c9a227' : (cor || '#e8e0cc') },
  }),
  compacto: ({ cor, destaque }) => ({
    caixa: { ...estilos.card, padding: '12px 14px', marginBottom: 0 },
    rotulo: { ...ROTULO, letterSpacing: '.4px' },
    valor: { fontSize: 17, fontWeight: 700, color: destaque ? 'var(--ouro)' : (cor || 'var(--texto)'), marginTop: 4 },
  }),
  laudo: ({ ok }) => ({
    caixa: { background: '#0f0f0f', border: `1px solid ${ok == null ? '#222' : corDoOk(ok)}`, borderRadius: 8, padding: '10px 12px' },
    rotulo: { ...ROTULO, letterSpacing: '.4px', marginBottom: 4 },
    valor: { fontSize: 18, fontWeight: 700, color: corDoOk(ok) },
  }),
  bloco: ({ destaque }) => ({
    caixa: { border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px', background: destaque ? '#1a1a1a' : 'transparent' },
    rotulo: { ...ROTULO, fontSize: 12, color: destaque ? '#c9a227' : '#777', marginBottom: 4 },
    valor: { fontSize: 18, fontWeight: 700, color: destaque ? '#fff' : '#ccc' },
  }),
};

export default function Indicador({ rotulo, valor, sub, icone, cor, destaque, ok, variante = 'cartao', tamanho, style }) {
  const v = (VARIANTES[variante] || VARIANTES.cartao)({ cor, destaque, ok });
  const estiloRotulo = icone ? { ...v.rotulo, display: 'flex', alignItems: 'center', gap: 6 } : v.rotulo;
  return (
    <div style={{ ...v.caixa, ...style }}>
      <div style={estiloRotulo}>{icone}{rotulo}</div>
      <div style={tamanho ? { ...v.valor, fontSize: tamanho } : v.valor}>{variante === 'compacto' ? (valor ?? '—') : valor}</div>
      {sub && <div style={SUB}>{sub}</div>}
    </div>
  );
}
