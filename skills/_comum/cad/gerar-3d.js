#!/usr/bin/env node
// Modelo 3D ilustrativo (página HTML autossuficiente) a partir da arquitetura:
//   node skills/_comum/cad/gerar-3d.js <arquivo.dwg|.dxf> --saida modelo.html
//        [--disciplina cftv,rede,eletrica,iluminacao,incendio,alarme]
//        [--pe-direito 2.8] [--dados cftv=formulario.json] (formulário real da skill; sem ele, estimativa)
//        [--cliente "…"] [--obra "…"] [--proposta "…"] [--titulo "…"] [--cena cena.json]
//        [--trechos trechos.json] (infraestrutura: [{ disciplina, tipo: eletrocalha|eletroduto|leito|perfilado|fiacao,
//                                  layer, segmentos: [[x1, y1, x2, y2], …] }] em metros, no sistema da arquitetura)
// A página abre em qualquer navegador sem internet. Dado de cliente real: gravar
// fora do repositório (pasta do projeto no servidor).
const fs = require('fs');
const path = require('path');
const { textoDxfDoArquivo } = require('./dwg');
const { lerArquitetura } = require('./arquitetura');
const { montarCena, PE_DIREITO_PADRAO } = require('./modelo3d');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');
const { gerarHtml } = require('./visualizador3d');

function argumentos(lista) {
  const op = { _: [] };
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = lista[i + 1] && !lista[i + 1].startsWith('--') ? lista[++i] : true;
      op[k] = k === 'dados' ? [...(op.dados || []), v] : v;
    } else op._.push(a);
  }
  return op;
}

async function main() {
  const op = argumentos(process.argv.slice(2));
  const arquivo = op._[0];
  if (!arquivo || !op.saida) {
    console.error('Uso: node skills/_comum/cad/gerar-3d.js <arquitetura.dwg|.dxf> --saida modelo.html [--disciplina cftv,rede,eletrica] [--pe-direito 2.8] [--dados cftv=form.json] [--trechos trechos.json] [--cliente "…"] [--obra "…"] [--proposta "…"]');
    process.exit(2);
  }
  const t0 = Date.now();
  const { texto, origem } = await textoDxfDoArquivo(fs.readFileSync(arquivo), path.basename(arquivo));
  const arquitetura = lerArquitetura(texto);
  const peDireito = op['pe-direito'] ? Number(String(op['pe-direito']).replace(',', '.')) : PE_DIREITO_PADRAO;
  const disciplinas = typeof op.disciplina === 'string' ? op.disciplina.split(',').map(s => s.trim()).filter(Boolean) : [];
  const dadosPorDisciplina = {};
  for (const d of op.dados || []) {
    const [disc, arq] = String(d).split('=');
    dadosPorDisciplina[disc] = JSON.parse(fs.readFileSync(arq, 'utf8'));
  }
  const pts = disciplinas.length ? pontosDasDisciplinas(arquitetura, disciplinas, { dadosPorDisciplina, peDireito }) : { dispositivos: [], avisos: [] };
  const trechos = typeof op.trechos === 'string' ? JSON.parse(fs.readFileSync(op.trechos, 'utf8')) : [];
  const nomeArq = path.basename(arquivo).replace(/\.(dwg|dxf)$/i, '');
  const cena = montarCena(arquitetura, {
    peDireito, dispositivos: pts.dispositivos, avisos: pts.avisos, trechos,
    titulo: op.titulo || `Modelo 3D — ${nomeArq}`, cliente: op.cliente, obra: op.obra, proposta: op.proposta,
  });
  const html = gerarHtml(cena);
  fs.mkdirSync(path.dirname(path.resolve(op.saida)), { recursive: true });
  fs.writeFileSync(op.saida, html);
  if (op.cena) fs.writeFileSync(op.cena, JSON.stringify(cena, null, 1));
  const N = cena.numeros;
  console.log(`${origem.toUpperCase()} lido: ${arquitetura.ambientes.length} ambientes, ${arquitetura.portas.length} portas (unidade × ${arquitetura.fatorUnidade})`);
  console.log(`Modelo: ${N.ambientes} ambientes internos (${N.area_interna_m2} m²) + ${N.ambientes_externos} externos; ${cena.paredes.length} trechos de parede/verga, ${N.janelas} janelas, ${N.pilares} pilares, ${N.portas} portas; pé-direito ${peDireito} m`);
  for (const d of N.dispositivos) console.log(`  ${d.rotulo}: ${d.quantidade} (${d.altura})`);
  for (const g of cena.infra) console.log(`  ${g.rotulo} (${g.disciplina}): ${String(g.comprimento_m).replace('.', ',')} m em ${g.segmentos_total} segmentos, h = ${String(g.z).replace('.', ',')} m`);
  for (const a of cena.avisos) console.log(`  ! ${a}`);
  console.log(`Página salva em ${path.resolve(op.saida)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
