// Barramentos de um quadro LIDO DO PROJETO (diagrama unifilar / quadro de cargas) quando o
// projeto não traz as medidas das barras: o MESMO cálculo da skill quadros (DIN 43671 para
// as fases, Tabela 58 da NBR 5410 e o curto fase-massa para o PE — calculo.barramento), sem
// duplicar nada. Só no Node (a skill quadros lê catálogo e tabelas); o 3D recebe pronto em
// quadro.barramentos e mostra "calculado — conferir com o fabricante".
//
// Sem a corrente do geral no projeto não há o que calcular: devolve null e o 3D mostra
// "[CONFERIR] — não consta no projeto". Sem a Icc no projeto, a premissa da skill (10 kA)
// fica registrada (icc_informada: false) e aparece na ficha como [CONFERIR].
const QC = require('../../quadros/scripts/lib/calculo');

const polosDe = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null; };

function calcularBarramentos(q) {
  const In = Number(q?.geral?.In);
  if (!(In > 0)) return null;
  const pg = polosDe(q.geral.polos);
  const pd = Math.max(0, ...(q.disjuntores || []).map(d => polosDe(d.polos) || 0));
  const n = pg >= 3 || pd >= 3 ? 3 : pg === 2 || pd === 2 ? 2 : pg === 1 ? 1 : 3;
  const sistema = { 1: 'monofasico', 2: 'bifasico', 3: 'trifasico' }[n];
  const c = QC.config({ quadro: { tag: q.tag, sistema, ...(Number(q.icc_ka) > 0 ? { icc_ka: Number(q.icc_ka) } : {}) } });
  const r = QC.barramento(c, { In }, (q.disjuntores || []).map(d => ({ caixaMoldada: Number(d.In) > 125 })), null, []);
  const lxe = (b) => (b ? { l: b.l, e: b.e } : null);
  return {
    tipo: r.tipo, fase: lxe(r.fase), pente: r.pente ? { a: r.pente.a, s: r.pente.s } : null,
    neutro: lxe(r.neutro), secaoNeutro: r.secaoNeutro, pe: lxe(r.pe), secaoFase: r.secaoFase, secaoPeMin: r.secaoPeMin,
    capacidade_a: r.capacidade ? Math.round(r.capacidade) : null, icw_ka: r.icw,
    icc_ka: c.icc, icc_informada: c.iccInformada, fonte: 'calculado', material: 'Cobre eletrolítico (Cu-ETP)',
    notas: [`Geral ${In} A do projeto → ${r.tipo === 'pente' ? `pente ${r.pente?.a} A` : `barra ${r.fase?.l} × ${r.fase?.e} mm`} (skill quadros).`, ...(c.iccInformada ? [] : [`Icc não informada no projeto: ${c.icc} kA (premissa da skill quadros) [CONFERIR].`])],
  };
}

module.exports = { calcularBarramentos };
