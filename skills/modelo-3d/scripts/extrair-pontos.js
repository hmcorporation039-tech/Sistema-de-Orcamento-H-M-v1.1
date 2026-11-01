#!/usr/bin/env node
// Pontos REAIS do projeto para o 3D, lidos do desenho mesmo quando os blocos
// vêm explodidos (exportação do QiBuilder/AltoQi, PDF convertido): cada símbolo
// é um grupo de traços colados na mesma layer, reconhecido pela MEDIDA. Assim o
// 3D mostra as luminárias, os postes, as caixas e os eletrodutos do projeto, e
// não a estimativa pela área das salas.
//
// 1) Listar os grupos de cada layer de instalação (medida × quantidade) e gravar
//    o mapa proposto, para o engenheiro conferir:
//      node modelo-3d/scripts/extrair-pontos.js <projeto.dwg|.dxf> [--planta N] --listar --saida mapa-pontos.json
// 2) Com o mapa conferido, gravar os pontos (e os trechos de eletroduto):
//      node modelo-3d/scripts/extrair-pontos.js <projeto.dwg|.dxf> [--planta N] --mapa mapa-pontos.json
//           --saida-pontos pontos.json [--saida-trechos trechos.json]
//    e passar ao gerador: gerar-3d.js … --pontos pontos.json --trechos trechos.json
//
// mapa-pontos.json:
//   { "simbolos": [{ "layer": "P-SIMBOL", "medida": [1.49, 0.10], "simbolo": "HM-ILU-POSTE",
//                    "rotulo": "Poste luz quadra", "disciplina": "iluminacao-externa" }, …],
//     "trechos":  [{ "layer": "EL-Condutos (Piso)", "tipo": "eletroduto", "disciplina": "eletrica", "altura": 0.04 }] }
// "simbolo": "?" (ou ausente) = grupo que não entra. Medida em metros, sem ordem
// (1,49 × 0,10 = 0,10 × 1,49), tolerância "tolerancia" (padrão 0,03 m).
// "area": "externa" | "interna" = só os da área externa (estacionamento, quadra,
// fora das salas) ou só os de dentro — a mesma caixa de passagem é de piso lá
// fora e de teto/parede dentro.
// Só lê o desenho. Pontos e trechos ficam em metros, no sistema da arquitetura.
const fs = require('fs');
const path = require('path');
const { textoDxfDoArquivo } = require('../../_comum/cad/dwg');
const { lerArquitetura, dentro, centroide } = require('../../_comum/cad/arquitetura');
const { recortarArquitetura, ESPEC } = require('../../_comum/cad/modelo3d');
const { tipoDoAmbiente } = require('../../_comum/cad/estimativaArquitetura');

const MAIOR_SIMBOLO_M = 3; // grupo maior que isso é traçado, não símbolo
const COLA_M = 0.05;       // traços a até 5 cm um do outro são do mesmo símbolo
// layers de instalação (o resto — arquitetura, prancha — não tem pontos)
const RE_INSTALACAO = /^(EL|ELE|IFC|P|INC|CFTV|TEL|SPDA|PCI|HID)[-_ ]|SIMB|L[ÂA]MP|LUMIN|TOMAD|INTERRUP|CAIXA|QUADRO|POSTE|REFLET|PROJETOR|DETEC|C[ÂA]MERA|SENSOR|CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO/i;
const RE_FORA = /FIOS?\b|TEXTO|TXT|DIAGRAM|^DI[-_ ]|BARRAMENTO|UNIFILAR|TABELA|MARGEM|PRANCHA|CONTORNO\d|HATCH|HACH|COTA/i;
const RE_TRECHO = /CONDUT|ELETROD|ELETROCALHA|LEITO|PERFILADO/i;

// sugestão pelo nome da layer (o engenheiro confere: é proposta, não leitura)
function sugestao(layer, medida, externo) {
  const [L, W] = medida;
  // no projeto elétrico (layer EL-…) a luminária usa os eletrodutos da elétrica desenhados junto
  if (/L[ÂA]MP|LUMIN/i.test(layer)) return { simbolo: 'HM-ILU-LUMINARIA', disciplina: /^(EL|ELE|IFC)[-_ ]/i.test(layer) ? 'eletrica' : 'iluminacao' };
  if (/TOMAD/i.test(layer)) return { simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica' };
  if (/INTERRUP/i.test(layer)) return { simbolo: 'HM-ELE-INTERRUPTOR', disciplina: 'eletrica' };
  if (/QUADRO/i.test(layer)) return { simbolo: 'HM-ELE-QUADRO', disciplina: 'eletrica' };
  if (/CAIXA/i.test(layer) && externo && L >= 0.1) return { simbolo: 'HM-ELE-CAIXA-PISO', disciplina: 'iluminacao-externa' };
  // traço comprido e fino FORA das salas (estacionamento, quadra): poste com braço
  if (externo && L >= 0.8 && L <= 3 && W <= 0.25) return { simbolo: 'HM-ILU-POSTE', disciplina: 'iluminacao-externa' };
  return null;
}

// grupos de traços colados (caixa envolvente com folga) por layer
function agrupar(refs) {
  const bb = refs.map(r => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  });
  const pai = bb.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const ordem = bb.map((_, i) => i).sort((i, j) => bb[i][0] - bb[j][0]);
  for (let a = 0; a < ordem.length; a++) {
    const i = ordem[a];
    for (let b = a + 1; b < ordem.length; b++) {
      const j = ordem[b];
      if (bb[j][0] > bb[i][2] + COLA_M) break;
      if (bb[j][1] <= bb[i][3] + COLA_M && bb[j][3] >= bb[i][1] - COLA_M) pai[raiz(i)] = raiz(j);
    }
  }
  const g = new Map();
  bb.forEach((b, i) => {
    const k = raiz(i);
    const o = g.get(k);
    g.set(k, o ? [Math.min(o[0], b[0]), Math.min(o[1], b[1]), Math.max(o[2], b[2]), Math.max(o[3], b[3])] : b);
  });
  return [...g.values()].map(b => ({ caixa: b, centro: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], medida: [b[2] - b[0], b[3] - b[1]].sort((x, y) => y - x) }))
    .filter(s => s.medida[0] <= MAIOR_SIMBOLO_M && s.medida[0] > 0.01);
}

const r2 = (v) => Math.round(v * 100) / 100;
const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesmaMedida = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;

async function main() {
  const args = process.argv.slice(2);
  const val = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
  const COM_VALOR = ['--planta', '--saida', '--mapa', '--saida-pontos', '--saida-trechos'];
  const arquivo = args.find((a, i) => !a.startsWith('--') && !COM_VALOR.includes(args[i - 1]));
  if (!arquivo || (!args.includes('--listar') && !(val('--mapa') && val('--saida-pontos')))) {
    console.error('Uso: node modelo-3d/scripts/extrair-pontos.js <projeto.dwg|.dxf> [--planta N] --listar [--saida mapa-pontos.json]');
    console.error('     node modelo-3d/scripts/extrair-pontos.js <projeto.dwg|.dxf> [--planta N] --mapa mapa-pontos.json --saida-pontos pontos.json [--saida-trechos trechos.json]');
    process.exit(2);
  }
  const { texto } = await textoDxfDoArquivo(fs.readFileSync(arquivo), path.basename(arquivo));
  let arq = lerArquitetura(texto);
  if (val('--planta')) {
    const c = (arq.regioesPlanta || [])[Number(val('--planta')) - 1];
    if (!c) throw new Error(`--planta ${val('--planta')}: a folha tem ${(arq.regioesPlanta || []).length} plantas (lista no diagnosticar-layers.js).`);
    arq = recortarArquitetura(arq, c);
  }
  const ambienteDe = (p) => arq.ambientes.filter(a => dentro(p, a.poligono)).sort((a, b) => a.area_m2 - b.area_m2)[0] || null;
  const ehExterno = (p) => { const a = ambienteDe(p); return !a || tipoDoAmbiente(a.nome) === 'externo'; };
  const porLayer = new Map();
  for (const r of arq.referencia) {
    if (!r.pts.length || !RE_INSTALACAO.test(r.layer || '') || RE_FORA.test(r.layer || '')) continue;
    if (!porLayer.has(r.layer)) porLayer.set(r.layer, []);
    porLayer.get(r.layer).push(r);
  }

  if (args.includes('--listar')) {
    const simbolos = [];
    const trechos = [];
    console.log('Layer                                   | Medida (m)    | Qtd | Área externa   | Proposta');
    for (const [layer, refs] of [...porLayer].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (RE_TRECHO.test(layer)) {
        const m = refs.reduce((s, r) => s + r.pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r.pts[i][0], p[1] - r.pts[i][1]), 0), 0);
        const piso = /PISO|DIRETA|ENTERR|SOLO/i.test(layer);
        trechos.push({ layer, tipo: /ELETROCALHA/i.test(layer) ? 'eletrocalha' : /LEITO/i.test(layer) ? 'leito' : /PERFILADO/i.test(layer) ? 'perfilado' : 'eletroduto', disciplina: 'eletrica', ...(piso ? { altura: 0.04 } : {}) });
        console.log(`${layer.slice(0, 39).padEnd(39)} | traçado       |     | ${num(m)} m | eletroduto${piso ? ' no piso/enterrado' : ' no teto'}`);
        continue;
      }
      // tipos de símbolo da layer: medidas parecidas (±3 cm) juntas
      const tipos = [];
      for (const s of agrupar(refs)) {
        let t = tipos.find(x => mesmaMedida(x.medida, s.medida, 0.03));
        if (!t) tipos.push(t = { medida: s.medida, itens: [] });
        t.itens.push(s);
      }
      // símbolo isolado só entra se o nome da layer diz o que é (o quadro geral costuma ser um só)
      const mais = (x) => x.itens.length >= 2 || !!sugestao(layer, x.medida, x.itens.every(q => ehExterno(q.centro)));
      for (const t of tipos.filter(mais).sort((a, b) => b.itens.length - a.itens.length).slice(0, 6)) {
        // área externa: fora das salas, ou em ambiente externo (estacionamento, quadra, pátio)
        const fora = t.itens.filter(s => ehExterno(s.centro)).length;
        let sug = sugestao(layer, t.medida, fora > t.itens.length / 2);
        // o mesmo aparelho desenhado em duas layers (símbolo + contorno IFC): conta uma vez só
        if (sug && simbolos.some(o => o.simbolo === sug.simbolo && o.quantidade === t.itens.length)) sug = null;
        simbolos.push({ layer, medida: t.medida.map(r2), quantidade: t.itens.length, simbolo: sug ? sug.simbolo : '?', rotulo: '', disciplina: sug ? sug.disciplina : '', ...(sug && sug.simbolo === 'HM-ELE-CAIXA-PISO' ? { area: 'externa' } : {}) });
        console.log(`${layer.slice(0, 39).padEnd(39)} | ${`${num(t.medida[0])} × ${num(t.medida[1])}`.padEnd(13)} | ${String(t.itens.length).padStart(3)} | ${String(fora).padStart(14)} | ${sug ? sug.simbolo : '?'}`);
      }
    }
    console.log('\nConfira a proposta: "?" não entra no 3D. Símbolos: ' + Object.keys(ESPEC).join(', '));
    if (val('--saida')) {
      fs.writeFileSync(val('--saida'), JSON.stringify({ arquivo: path.basename(arquivo), planta: val('--planta') ? Number(val('--planta')) : null, observacao: 'Proposta pelo nome da layer e pela medida — conferir com o engenheiro. "?" = não entra. rotulo = descrição da legenda do projeto.', simbolos, trechos }, null, 2));
      console.log(`Mapa proposto gravado em ${path.resolve(val('--saida'))}`);
    }
    return;
  }

  const mapa = JSON.parse(fs.readFileSync(val('--mapa'), 'utf8'));
  const pontos = [];
  const contagem = new Map();
  for (const m of mapa.simbolos || []) {
    if (!m.simbolo || m.simbolo === '?') continue;
    if (!ESPEC[m.simbolo]) throw new Error(`Símbolo "${m.simbolo}" (layer ${m.layer}) não existe no 3D (use: ${Object.keys(ESPEC).join(', ')}).`);
    const medida = [...m.medida].sort((a, b) => b - a);
    const tol = Number(m.tolerancia) > 0 ? Number(m.tolerancia) : 0.03;
    for (const s of agrupar(porLayer.get(m.layer) || [])) {
      if (!mesmaMedida(s.medida, medida, tol)) continue;
      if (m.area === 'externa' && !ehExterno(s.centro)) continue;
      if (m.area === 'interna' && ehExterno(s.centro)) continue;
      // o mesmo aparelho em pedaços (quadro desenhado em partes): um ponto só
      if (pontos.some(o => o.simbolo === m.simbolo && Math.hypot(o.x - s.centro[0], o.y - s.centro[1]) < 0.3)) continue;
      const amb = ambienteDe(s.centro);
      const n = (contagem.get(m.simbolo) || 0) + 1;
      contagem.set(m.simbolo, n);
      pontos.push({
        id: `${m.simbolo.replace(/^HM-[A-Z]+-/, '')}-${n}`, simbolo: m.simbolo, x: r2(s.centro[0]), y: r2(s.centro[1]),
        ...(m.rotulo ? { rotulo: m.rotulo } : {}), ...(m.disciplina ? { disciplina: m.disciplina } : {}),
        ...(Number(m.altura_m) > 0 ? { altura_m: Number(m.altura_m) } : {}), ambiente: amb ? amb.nome : '',
      });
    }
  }
  fs.writeFileSync(val('--saida-pontos'), JSON.stringify(pontos, null, 1));
  const porRotulo = new Map();
  for (const p of pontos) porRotulo.set(p.rotulo || p.simbolo, (porRotulo.get(p.rotulo || p.simbolo) || 0) + 1);
  for (const [k, q] of porRotulo) console.log(`  ${k}: ${q}`);
  console.log(`${pontos.length} pontos gravados em ${path.resolve(val('--saida-pontos'))}`);

  if (val('--saida-trechos')) {
    const trechos = [];
    for (const t of mapa.trechos || []) {
      const segmentos = [];
      for (const r of porLayer.get(t.layer) || []) {
        for (let i = 1; i < r.pts.length; i++) segmentos.push([...r.pts[i - 1], ...r.pts[i]].map(r2));
        if (r.fechada && r.pts.length > 2) segmentos.push([...r.pts.at(-1), ...r.pts[0]].map(r2));
      }
      if (segmentos.length) trechos.push({ ...t, segmentos });
    }
    fs.writeFileSync(val('--saida-trechos'), JSON.stringify(trechos));
    console.log(`${trechos.reduce((s, t) => s + t.segmentos.length, 0)} segmentos de infraestrutura gravados em ${path.resolve(val('--saida-trechos'))}`);
  }
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
