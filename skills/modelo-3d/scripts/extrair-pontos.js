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
const { lerArquitetura } = require('../../_comum/cad/arquitetura');
const { recortarArquitetura, ESPEC } = require('../../_comum/cad/modelo3d');
// a leitura é a mesma do sistema (botão "Modelo 3D"): ../../_comum/cad/pontosDoDesenho.js
const { propostaDeMapa, aplicarMapa } = require('../../_comum/cad/pontosDoDesenho');

const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  if (args.includes('--listar')) {
    const { simbolos, trechos } = propostaDeMapa(arq);
    console.log('Layer                                   | Medida (m)    | Qtd | Área externa   | Proposta');
    for (const t of trechos) console.log(`${t.layer.slice(0, 39).padEnd(39)} | traçado       |     | ${num(t.comprimento_m)} m | eletroduto${t.altura ? ' no piso/enterrado' : ' no teto'}`);
    for (const t of simbolos) console.log(`${t.layer.slice(0, 39).padEnd(39)} | ${`${num(t.medida[0])} × ${num(t.medida[1])}`.padEnd(13)} | ${String(t.quantidade).padStart(3)} | ${String(t.fora).padStart(14)} | ${t.simbolo}`);
    console.log('\nConfira a proposta: "?" não entra no 3D. Símbolos: ' + Object.keys(ESPEC).join(', '));
    if (val('--saida')) {
      fs.writeFileSync(val('--saida'), JSON.stringify({ arquivo: path.basename(arquivo), planta: val('--planta') ? Number(val('--planta')) : null, observacao: 'Proposta pelo nome da layer e pela medida — conferir com o engenheiro. "?" = não entra. rotulo = descrição da legenda do projeto.', simbolos: simbolos.map(({ fora, ...x }) => x), trechos: trechos.map(({ comprimento_m, ...x }) => x) }, null, 2));
      console.log(`Mapa proposto gravado em ${path.resolve(val('--saida'))}`);
    }
    return;
  }

  const mapa = JSON.parse(fs.readFileSync(val('--mapa'), 'utf8'));
  const { pontos, trechos } = aplicarMapa(arq, mapa);
  fs.writeFileSync(val('--saida-pontos'), JSON.stringify(pontos, null, 1));
  const porRotulo = new Map();
  for (const p of pontos) porRotulo.set(p.rotulo || p.simbolo, (porRotulo.get(p.rotulo || p.simbolo) || 0) + 1);
  for (const [k, q] of porRotulo) console.log(`  ${k}: ${q}`);
  console.log(`${pontos.length} pontos gravados em ${path.resolve(val('--saida-pontos'))}`);
  if (val('--saida-trechos')) {
    fs.writeFileSync(val('--saida-trechos'), JSON.stringify(trechos));
    console.log(`${trechos.reduce((s, t) => s + t.segmentos.length, 0)} segmentos de infraestrutura gravados em ${path.resolve(val('--saida-trechos'))}`);
  }
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
