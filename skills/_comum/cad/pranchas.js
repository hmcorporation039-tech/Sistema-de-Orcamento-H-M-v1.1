// Plantas e pranchas de um desenho: cada planta vira um modelo 3D próprio.
//
// Pedido do usuário (01/11/2026): "pegue cada prancha em dwg ou cada folha em pdf e
// faça individualmente cada modelo 3d, o sistema está juntando tudo". O DWG da
// Arena tem todas as pranchas lado a lado no espaço do modelo (1.346 m de largura,
// sem layouts nem viewports — exportação do QiBuilder) e o 3D montava tudo junto.
//
// Como as ferramentas de CAD tratam isso (ezdxf, ODA): a prancha é o layout do
// espaço do papel, com a moldura e o carimbo, e a viewport aponta a região do
// espaço do modelo. Sem layouts (o caso comum no que recebemos), a prancha é a
// MOLDURA desenhada no espaço do modelo — retângulo grande na proporção da série A
// (√2) — e, dentro dela, cada região classificada como planta (./classificarPrancha.js)
// é uma planta. PDF: cada página já é uma folha (quem converte manda uma por vez).
//
//   plantasDoDesenho(arq) → [{ n, caixa, nome, prancha, ambientes, area_m2, principal }]
//   na ordem de leitura (prancha da esquerda para a direita); principal = a de maior área
const { centroide } = require('./arquitetura');
const { tipoDoTitulo } = require('./classificarPrancha');

const area = (c) => Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
const inter = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
const naCaixa = (c, [x, y]) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3];
const caixaDe = (pts) => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];

// Moldura de prancha: polilinha de 4 lados (fechada) na proporção A (1,41; A0 a A4
// e os formatos estendidos até 1,6), com lado de pelo menos 15 m no desenho (folha
// A4 em 1:75). Fica só a de fora (a margem interna é outra polilinha).
const RE_LAYER_MOLDURA = /MARGEM|MOLDURA|PRANCHA|FOLHA|FORMATO|SHEET|BORDER|FRAME/i;
function molduras(arq) {
  const cand = [];
  // as da layer de moldura/margem (separadas na leitura: ./arquitetura.js) e as soltas no desenho
  const polis = [...(arq.molduras || []), ...arq.referencia.filter(r => r.tipo === 'poli')];
  for (const r of polis) {
    if (r.pts.length < 4 || r.pts.length > 5) continue;
    const c = caixaDe(r.pts);
    const w = c[2] - c[0], h = c[3] - c[1];
    if (Math.min(w, h) < 15) continue;
    const prop = Math.max(w, h) / Math.min(w, h);
    if (prop < 1.35 || prop > (RE_LAYER_MOLDURA.test(r.layer || '') ? 2.2 : 1.6)) continue;
    // retângulo de verdade: os vértices estão nos cantos da caixa
    if (!r.pts.every(([x, y]) => (Math.abs(x - c[0]) < 0.01 * w || Math.abs(x - c[2]) < 0.01 * w) && (Math.abs(y - c[1]) < 0.01 * h || Math.abs(y - c[3]) < 0.01 * h))) continue;
    // folha do PDF (backend/src/services/pdfParaDxf.js: layer PDF-MARGEM-F4): o número da página
    const folha = Number(/-F([0-9]+)$/i.exec(r.layer || '')?.[1]) || null;
    cand.push(Object.assign(c, { folha }));
  }
  // a de fora: sai a que está dentro de outra
  return cand.filter((c, i) => !cand.some((o, j) => j !== i && area(o) > area(c) && inter(o, c) >= 0.9 * area(c)))
    .filter((c, i, l) => l.findIndex(o => o.every((v, k) => Math.abs(v - c[k]) < 0.01)) === i)
    .sort((a, b) => (a[0] - b[0]) || (b[3] - a[3]));
}

// Nome da planta: o título dela quando é de planta ("PLANTA BAIXA - TÉRREO"); senão
// os nomes dos maiores ambientes (o da Arena vem com o título "DETALHE-1" ao lado)
function nomeDaPlanta(regiao, ambientes) {
  const t = String(regiao?.titulo || '').trim();
  if (t && tipoDoTitulo(t) === 'planta') return t.slice(0, 60);
  const nomes = ambientes.filter(a => !a.semNome).sort((a, b) => b.area_m2 - a.area_m2).map(a => a.nome);
  return nomes.length ? [...new Set(nomes)].slice(0, 3).join(', ') : '';
}

function plantasDoDesenho(arq) {
  const regioes = (arq.classificacao?.regioes || []).filter(r => r.tipo === 'planta');
  // planta dentro de outra (o recorte de uma planta maior) não conta duas vezes
  let lista = regioes.filter((r, i) => !regioes.some((o, j) => j !== i && area(o.caixa) > area(r.caixa) && inter(o.caixa, r.caixa) >= 0.85 * area(r.caixa)));
  // desenho sem região de planta classificada: o desenho inteiro é a planta
  if (!lista.length) lista = [{ caixa: [arq.extensao.min[0], arq.extensao.min[1], arq.extensao.max[0], arq.extensao.max[1]], titulo: '' }];
  const folhas = molduras(arq);
  const plantas = lista.map(r => {
    const ambientes = arq.ambientes.filter(a => naCaixa(r.caixa, centroide(a.poligono)));
    const meio = [(r.caixa[0] + r.caixa[2]) / 2, (r.caixa[1] + r.caixa[3]) / 2];
    return { caixa: r.caixa, titulo: r.titulo || '', ambientes: ambientes.length, area_m2: Math.round(ambientes.reduce((s, a) => s + a.area_m2, 0) * 100) / 100, folha: folhas.findIndex(c => naCaixa(c, meio)), _amb: ambientes };
  });
  // ordem de leitura: pela prancha (as que têm planta, numeradas da esquerda para a
  // direita) e, dentro dela ou sem moldura, pela posição
  const usadas = [...new Set(plantas.map(p => p.folha).filter(f => f >= 0))].sort((a, b) => a - b);
  // (folha de PDF: pelo número da página)
  const xDe = (p) => (p.folha >= 0 ? (folhas[p.folha].folha ? folhas[p.folha].folha * 1e7 : folhas[p.folha][0]) : p.caixa[0]);
  plantas.sort((a, b) => (xDe(a) - xDe(b)) || (b.caixa[3] - a.caixa[3]) || (a.caixa[0] - b.caixa[0]));
  const maior = plantas.reduce((m, p) => (p.area_m2 > m.area_m2 || (p.area_m2 === m.area_m2 && area(p.caixa) > area(m.caixa)) ? p : m), plantas[0]);
  return plantas.map((p, i) => {
    const nome = nomeDaPlanta({ titulo: p.titulo }, p._amb);
    const { _amb, folha, ...resto } = p;
    const prancha = folha >= 0 ? usadas.indexOf(folha) + 1 : null;
    const doPdf = folha >= 0 ? folhas[folha].folha : null;
    return { n: i + 1, ...resto, prancha, principal: p === maior, nome: `${doPdf ? `Folha ${doPdf} · ` : prancha ? `Prancha ${prancha} · ` : ''}Planta ${i + 1}${nome ? ` — ${nome}` : ''}` };
  });
}

module.exports = { plantasDoDesenho, molduras };
