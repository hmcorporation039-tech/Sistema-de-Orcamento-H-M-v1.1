#!/usr/bin/env node
// Aplica o mapa de layers conferido pelo engenheiro (saída de
// diagnosticar-layers.js, corrigida à mão) e grava uma CÓPIA do desenho em DXF
// com as layers renomeadas para nomes que o gerador 3D entende sem adivinhar:
//   parede → H3D-PAREDE, pilar → H3D-PILAR, janela → H3D-JANELA,
//   mureta → H3D-PAREDE-BAIXA, media → H3D-PAREDE-MEDIA, guarda → H3D-GUARDA-CORPO,
//   ignorar → H3D-MOB-IGNORAR (só quando o gerador subiria a layer; layer de
//   instalação que já não sobe mantém o nome, porque as disciplinas leem por ele)
// O arquivo original não é alterado.
//
// Uso (pasta skills):
//   node modelo-3d/scripts/aplicar-mapa.js <arquitetura.dwg|.dxf> <mapa-layers.json> --saida <base-3d.dxf>
const fs = require('fs');
const path = require('path');
const { textoDxfDoArquivo } = require('../../_comum/cad/dwg');
const { classeDaLayer } = require('../../_comum/cad/modelo3d');

const NOME = {
  parede: 'H3D-PAREDE', pilar: 'H3D-PILAR', janela: 'H3D-JANELA', mureta: 'H3D-PAREDE-BAIXA',
  media: 'H3D-PAREDE-MEDIA', guarda: 'H3D-GUARDA-CORPO', ignorar: 'H3D-MOB-IGNORAR',
};

async function main() {
  const args = process.argv.slice(2);
  const [arquivo, arqMapa] = args.filter(a => !a.startsWith('--'));
  const saida = args[args.indexOf('--saida') + 1];
  if (!arquivo || !arqMapa || args.indexOf('--saida') < 0 || !saida) {
    console.error('Uso: node modelo-3d/scripts/aplicar-mapa.js <arquitetura.dwg|.dxf> <mapa-layers.json> --saida <base-3d.dxf>');
    process.exit(2);
  }
  const mapa = JSON.parse(fs.readFileSync(arqMapa, 'utf8')).layers || {};
  for (const [l, c] of Object.entries(mapa)) if (!NOME[c]) throw new Error(`Classe "${c}" da layer "${l}" não existe (use: ${Object.keys(NOME).join(', ')}).`);
  // "subiria no 3D" é decidido como o gerador decide, com o desenho original
  const haParede = Object.keys(mapa).some(l => ['parede', 'media', 'mureta', 'pilar'].includes(classeDaLayer(l, true)));
  const novoNome = (l) => {
    const c = mapa[l];
    if (!c) return null;
    if (c === 'ignorar') return classeDaLayer(l, haParede) ? NOME.ignorar : null;
    return NOME[c];
  };

  const { texto } = await textoDxfDoArquivo(fs.readFileSync(arquivo), path.basename(arquivo));
  const linhas = texto.split(/\r?\n/);
  const trocas = new Map();
  // pares código/valor: o grupo 8 é a layer da entidade
  for (let i = 0; i + 1 < linhas.length; i += 2) {
    if (linhas[i].trim() !== '8') continue;
    const l = linhas[i + 1].trim();
    const n = novoNome(l);
    if (!n) continue;
    linhas[i + 1] = n;
    trocas.set(l, (trocas.get(l) || 0) + 1);
  }
  fs.writeFileSync(saida, linhas.join('\r\n'));
  for (const [l, q] of trocas) console.log(`  ${l} → ${novoNome(l)} (${q} entidades)`);
  console.log(`${trocas.size} layers renomeadas. Base para o 3D gravada em ${path.resolve(saida)} (o original não foi alterado).`);
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
