#!/usr/bin/env node
// Diagnóstico das layers antes do modelo 3D: mostra, layer por layer, o que o
// gerador (skills/_comum/cad/modelo3d.js) faria com ela — parede, pilar, janela,
// mureta ou nada — e aponta o que costuma dar errado (pilar que é mobiliário,
// "tudo vira parede" quando não há layer de parede reconhecível).
//
// Uso (pasta skills):
//   node modelo-3d/scripts/diagnosticar-layers.js <arquitetura.dwg|.dxf> [--saida mapa-layers.json]
// --saida grava o mapa de layers proposto, para o engenheiro conferir e corrigir.
// Só lê o desenho: não muda nada no gerador nem no arquivo.
const fs = require('fs');
const path = require('path');
const { textoDxfDoArquivo } = require('../../_comum/cad/dwg');
const { lerArquitetura } = require('../../_comum/cad/arquitetura');
const { classeDaLayer } = require('../../_comum/cad/modelo3d');

const RE_JANELA = /JANEL|ESQUAD|CAIXILH|VIDRO|WINDOW/i;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const num = (v, c = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// mesma regra do gerador para "polilinha fechada pequena vira pilar"
function candidatoAPilar(r, classe) {
  if (!r.fechada || r.tipo !== 'poli' || !['pilar', 'parede', 'media'].includes(classe)) return null;
  const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]);
  const [L, W] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].sort((a, b) => b - a);
  if (!(L <= 1.5 && W >= 0.1 && L * W >= 0.02)) return null;
  return classe === 'pilar' || (L <= 0.8 && L / W <= 2.5) ? 'pilar' : 'trecho';
}

async function main() {
  const args = process.argv.slice(2);
  const arquivo = args.find(a => !a.startsWith('--'));
  const iSaida = args.indexOf('--saida');
  if (!arquivo) {
    console.error('Uso: node modelo-3d/scripts/diagnosticar-layers.js <arquitetura.dwg|.dxf> [--saida mapa-layers.json]');
    process.exit(2);
  }
  const { texto, origem } = await textoDxfDoArquivo(fs.readFileSync(arquivo), path.basename(arquivo));
  const arq = lerArquitetura(texto);
  const refs = arq.referencia.filter(r => r.pts.length >= 2);
  const layers = [...new Set(refs.map(r => r.layer))];
  const haParede = layers.some(l => /PAREDE|ALVEN|WALL|DRYWALL|DIVIS|ESTRUT|PILAR|COLUN|PERIM|FECHAMENTO/i.test(l || '') && !RE_JANELA.test(l || ''));

  const porLayer = new Map();
  for (const r of refs) {
    const l = r.layer || '0';
    if (!porLayer.has(l)) porLayer.set(l, { layer: l, classe: classeDaLayer(l, haParede), entidades: 0, fechadas: 0, pilares: 0, comprimento_m: 0 });
    const s = porLayer.get(l);
    s.entidades++;
    if (r.fechada) s.fechadas++;
    for (let i = 1; i < r.pts.length; i++) s.comprimento_m += dist(r.pts[i - 1], r.pts[i]);
    if (candidatoAPilar(r, s.classe) === 'pilar') s.pilares++;
  }
  const linhas = [...porLayer.values()].sort((a, b) => (b.classe ? 1 : 0) - (a.classe ? 1 : 0) || b.comprimento_m - a.comprimento_m);

  console.log(`${origem.toUpperCase()} lido: ${layers.length} layers com geometria, ${arq.ambientes.length} ambientes, ${arq.portas.length} portas (unidade × ${arq.fatorUnidade})`);
  if (arq.classificacao) console.log(`Folha: ${arq.classificacao.resumo || arq.classificacao.tipo}`);
  console.log('');
  console.log('Classe no 3D  | Pilares | Fechadas | Entidades | Comprimento | Layer');
  for (const s of linhas) {
    console.log(`${(s.classe || '—').padEnd(13)} | ${String(s.pilares).padStart(7)} | ${String(s.fechadas).padStart(8)} | ${String(s.entidades).padStart(9)} | ${(num(s.comprimento_m) + ' m').padStart(11)} | ${s.layer}`);
  }

  const avisos = [];
  if (!haParede) avisos.push('Nenhuma layer com nome de parede: o gerador sobe como parede TUDO que não é anotação (mobiliário, louças, cotas em layer genérica). Mapeie as layers antes de gerar.');
  for (const s of linhas) {
    if (s.classe === 'parede' && s.pilares >= 5) avisos.push(`"${s.layer}" é de parede e tem ${s.pilares} polilinhas fechadas pequenas que viram PILAR: confira se não são símbolos, mobiliário ou shafts.`);
    if (s.classe === 'pilar' && s.pilares === 0) avisos.push(`"${s.layer}" parece de pilar, mas não tem polilinha fechada pequena: os pilares podem estar como linhas soltas ou hachura (não sobem).`);
    if (s.classe && /MOB|LOU|EQUIP|LAYOUT|SIMB|BLOCO/i.test(s.layer)) avisos.push(`"${s.layer}" sobe como ${s.classe}, mas o nome sugere mobiliário/símbolo.`);
  }
  const totalPilares = linhas.reduce((t, s) => t + s.pilares, 0);
  console.log('');
  console.log(`Total que vira pilar: ${totalPilares}. Compare com a planta estrutural (ou com a contagem na própria planta).`);
  for (const a of avisos) console.log(`  ! ${a}`);

  if (iSaida >= 0 && args[iSaida + 1]) {
    const mapa = {
      arquivo: path.basename(arquivo),
      observacao: 'Classes: parede, pilar, janela, mureta, media, guarda, ignorar. Confira com o engenheiro antes de usar.',
      layers: Object.fromEntries(linhas.map(s => [s.layer, s.classe || 'ignorar'])),
    };
    fs.writeFileSync(args[iSaida + 1], JSON.stringify(mapa, null, 2));
    console.log(`Mapa proposto gravado em ${path.resolve(args[iSaida + 1])}`);
  }
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
