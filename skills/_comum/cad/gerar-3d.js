#!/usr/bin/env node
// Modelo 3D ilustrativo (página HTML autossuficiente) a partir da arquitetura:
//   node skills/_comum/cad/gerar-3d.js <arquivo.dwg|.dxf> --saida modelo.html
//        [--disciplina cftv,rede,eletrica,iluminacao,incendio,alarme]
//        [--pe-direito 2.8] [--dados cftv=formulario.json] (formulário real da skill)
//        [--estimar] (só com --planta: pontos ESTIMADOS pela norma — nunca para mostrar ao cliente)
//        [--cliente "…"] [--obra "…"] [--proposta "…"] [--titulo "…"] [--cena cena.json]
//        [--trechos trechos.json] (infraestrutura: [{ disciplina, tipo: eletrocalha|eletroduto|leito|perfilado|fiacao,
//                                  layer, segmentos: [[x1, y1, x2, y2], …] }] em metros, no sistema da arquitetura)
//        [--pontos pontos.json] (pontos reais lidos do desenho: [{ simbolo, x, y, rotulo?, disciplina?, ambiente? }],
//                                saída de skills/modelo-3d/scripts/extrair-pontos.js; --trechos e --pontos repetem)
//        [--planta 2 | --regiao x0,y0,x1,y1] (só uma planta no modelo)
// Sem --planta: UM MODELO POR PLANTA da prancha, na mesma página (seletor "Planta"),
// com os pontos do --pontos ou, sem ele, os símbolos desenhados em cada planta
// (./modelosPorPlanta.js — o mesmo do botão "Modelo 3D" do sistema). Nada é estimado.
// A página abre em qualquer navegador sem internet. Dado de cliente real: gravar
// fora do repositório (pasta do projeto no servidor).
const fs = require('fs');
const path = require('path');
const { textoDxfDoArquivo } = require('./dwg');
const { lerArquitetura } = require('./arquitetura');
const { montarCena, recortarArquitetura, PE_DIREITO_PADRAO } = require('./modelo3d');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');
const { gerarHtml } = require('./visualizador3d');
const { montarCenasPorPlanta } = require('./modelosPorPlanta');

function argumentos(lista) {
  const op = { _: [] };
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = lista[i + 1] && !lista[i + 1].startsWith('--') ? lista[++i] : true;
      op[k] = ['dados', 'trechos', 'pontos'].includes(k) ? [...(op[k] || []), v] : v;
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
  let arquitetura = lerArquitetura(texto);
  const plantas = arquitetura.regioesPlanta || [];
  const caixaPlanta = op.regiao ? String(op.regiao).split(',').map(Number) : op.planta ? plantas[Number(op.planta) - 1] : null;
  if ((op.regiao || op.planta) && !(caixaPlanta && caixaPlanta.length === 4 && caixaPlanta.every(Number.isFinite))) throw new Error(`--planta/--regiao inválida (a folha tem ${plantas.length} plantas: rode o diagnóstico para ver a lista).`);
  if (caixaPlanta) arquitetura = recortarArquitetura(arquitetura, caixaPlanta);
  const peDireito = op['pe-direito'] ? Number(String(op['pe-direito']).replace(',', '.')) : PE_DIREITO_PADRAO;
  const disciplinas = typeof op.disciplina === 'string' ? op.disciplina.split(',').map(s => s.trim()).filter(Boolean) : [];
  const dadosPorDisciplina = {};
  for (const d of op.dados || []) {
    const [disc, arq] = String(d).split('=');
    dadosPorDisciplina[disc] = JSON.parse(fs.readFileSync(arq, 'utf8'));
  }
  const lerLista = (lista) => (lista || []).flatMap(a => JSON.parse(fs.readFileSync(a, 'utf8')));
  const trechos = lerLista(op.trechos);
  const pontos = lerLista(op.pontos);
  const nomeArq = path.basename(arquivo).replace(/\.(dwg|dxf)$/i, '');
  const titulo = op.titulo || `Modelo 3D — ${nomeArq}`;
  let cenas, principal = 0;
  if (caixaPlanta) {
    // uma planta escolhida: pontos do --pontos, do formulário ou (só com --estimar) estimados
    const comDados = disciplinas.filter(d => dadosPorDisciplina[d] || op.estimar);
    const pts = comDados.length ? pontosDasDisciplinas(arquitetura, comDados, { dadosPorDisciplina, peDireito }) : { dispositivos: [], avisos: [] };
    cenas = [montarCena(arquitetura, {
      peDireito, dispositivos: [...pts.dispositivos, ...pontos], avisos: pts.avisos, trechos,
      titulo, cliente: op.cliente, obra: op.obra, proposta: op.proposta, ...(pts.instalacao ? { instalacao: pts.instalacao } : {}),
    })];
  } else {
    ({ cenas, principal } = montarCenasPorPlanta(arquitetura, {
      peDireito, dispositivosReais: pontos, trechos, disciplinas, dadosPorDisciplina,
      titulo, cliente: op.cliente, obra: op.obra, proposta: op.proposta,
    }));
  }
  const cena = cenas[principal];
  const html = gerarHtml(cenas, { principal });
  fs.mkdirSync(path.dirname(path.resolve(op.saida)), { recursive: true });
  fs.writeFileSync(op.saida, html);
  if (op.cena) fs.writeFileSync(op.cena, JSON.stringify(cenas.length > 1 ? cenas : cena, null, 1));
  if (cenas.length > 1) {
    console.log(`${cenas.length} plantas, cada uma um modelo (abre na ${principal + 1}):`);
    for (const c of cenas) console.log(`  ${c.plantaInfo.nome}: ${c.numeros.ambientes} ambientes, ${c.plantaInfo.pontos} pontos${c.plantaInfo.origem ? ` (${c.plantaInfo.origem})` : ''}`);
    console.log('Planta que abre:');
  }
  const N = cena.numeros;
  console.log(`${origem.toUpperCase()} lido: ${arquitetura.ambientes.length} ambientes, ${arquitetura.portas.length} portas (unidade × ${arquitetura.fatorUnidade})`);
  console.log(`Modelo: ${N.ambientes} ambientes internos (${N.area_interna_m2} m²) + ${N.ambientes_externos} externos; ${cena.paredes.length} trechos de parede/verga, ${N.janelas} janelas, ${N.pilares} pilares, ${N.portas} portas; pé-direito ${peDireito} m`);
  for (const d of N.dispositivos) console.log(`  ${d.rotulo}: ${d.quantidade} (${d.altura})`);
  for (const g of cena.infra) console.log(`  ${g.rotulo} (${g.disciplina}): ${String(g.comprimento_m).replace('.', ',')} m em ${g.segmentos_total} segmentos, h = ${String(g.z).replace('.', ',')} m`);
  for (const a of cena.avisos) console.log(`  ! ${a}`);
  console.log(`Página salva em ${path.resolve(op.saida)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
