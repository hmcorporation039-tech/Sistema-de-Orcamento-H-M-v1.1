// Curva S da obra (versão 2.0, Fase 3G): % físico acumulado previsto ×
// realizado por período, em SVG puro (o frontend não tem biblioteca de gráfico
// e não vale uma dependência pesada para duas linhas).
const COR_PREVISTO = '#c9a227';
const COR_REALIZADO = '#3fb95f';

export default function CurvaS({ curva = [], periodoReferencia, altura = 240 }) {
  if (!curva.length) return null;
  const largura = Math.max(520, curva.length * 70);
  const m = { e: 44, d: 34, t: 14, b: 34 };
  const w = largura - m.e - m.d;
  const h = altura - m.t - m.b;
  const n = curva.length;
  const x = (i) => m.e + (n === 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v) => m.t + h - (Math.max(0, Math.min(100, Number(v) || 0)) / 100) * h;
  let ultimoMedido = -1;
  curva.forEach((c, i) => { if (c.tem_medicao) ultimoMedido = i; });
  const pontosPrev = curva.map((c, i) => `${x(i)},${y(c.previsto_fisico_acum)}`).join(' ');
  const pontosReal = curva.slice(0, ultimoMedido + 1).map((c, i) => `${x(i)},${y(c.realizado_fisico_acum)}`).join(' ');
  const iRef = curva.findIndex(c => c.periodo === periodoReferencia);
  const passoRotulo = Math.ceil(n / 14);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={largura} height={altura} role="img" aria-label="Curva S: percentual físico acumulado previsto e realizado por período" style={{ display: 'block' }}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={m.e} x2={m.e + w} y1={y(v)} y2={y(v)} stroke="#222" strokeDasharray={v === 0 ? '' : '3 4'} />
            <text x={m.e - 8} y={y(v) + 4} fill="#666" fontSize="10" textAnchor="end">{v}%</text>
          </g>
        ))}
        {iRef >= 0 && (
          <g>
            <line x1={x(iRef)} x2={x(iRef)} y1={m.t} y2={m.t + h} stroke="#5fc9c0" strokeDasharray="4 3" opacity="0.7" />
            <text x={x(iRef) + 4} y={m.t + 10} fill="#5fc9c0" fontSize="10">hoje</text>
          </g>
        )}
        <polyline points={pontosPrev} fill="none" stroke={COR_PREVISTO} strokeWidth="2.5" />
        {ultimoMedido >= 0 && <polyline points={pontosReal} fill="none" stroke={COR_REALIZADO} strokeWidth="2.5" />}
        {curva.map((c, i) => (
          <g key={c.periodo}>
            <circle cx={x(i)} cy={y(c.previsto_fisico_acum)} r="3.5" fill={COR_PREVISTO}>
              <title>{`${c.rotulo} — previsto acumulado: ${fmt(c.previsto_fisico_acum)}`}</title>
            </circle>
            {i <= ultimoMedido && (
              <circle cx={x(i)} cy={y(c.realizado_fisico_acum)} r="3.5" fill={COR_REALIZADO}>
                <title>{`${c.rotulo} — realizado acumulado: ${fmt(c.realizado_fisico_acum)}`}</title>
              </circle>
            )}
            {i % passoRotulo === 0 && <text x={x(i)} y={m.t + h + 18} fill="#888" fontSize="10" textAnchor="middle">{c.rotulo}</text>}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#999', marginTop: 4 }}>
        <span><span style={{ ...marca, background: COR_PREVISTO }} /> Previsto acumulado</span>
        <span><span style={{ ...marca, background: COR_REALIZADO }} /> Realizado acumulado (medições)</span>
      </div>
    </div>
  );
}

const fmt = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const marca = { display: 'inline-block', width: 14, height: 3, borderRadius: 2, verticalAlign: 'middle', marginRight: 5 };
