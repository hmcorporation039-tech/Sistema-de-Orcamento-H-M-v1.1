#!/usr/bin/env node
// Gera app.bundle.js (visualizador 3D + three.js + OrbitControls, minificado,
// IIFE) a partir de app.js. Rodar depois de mudar app.js ou atualizar o three:
//   cd skills && npm run build:3d
// O bundle fica versionado: o servidor de produção não precisa do esbuild.
// O cabeçalho guarda o hash da fonte — o teste (teste-3d.js) acusa bundle velho.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENTRADA = path.join(__dirname, 'app.js');
const SAIDA = path.join(__dirname, 'app.bundle.js');
// fontes locais que entram no bundle (o three vem do node_modules, pela versão)
const FONTES = [ENTRADA, path.join(__dirname, 'quadro.js'), path.join(__dirname, 'interativo.js'), path.join(__dirname, '..', '..', 'instalacao', 'simulador.js')];

function assinatura() {
  const versaoThree = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'node_modules', 'three', 'package.json'), 'utf8')).version;
  // app.js + quadro.js (cena de quadro elétrico) + interativo.js e o simulador lógico da
  // instalação (3D interativo, fase 2): mudar qualquer um pede bundle novo.
  // Sem \r: o checkout da produção vem com CRLF e o hash tem de bater com o do teste.
  const fonte = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const h = crypto.createHash('sha256');
  for (const f of FONTES) h.update(fonte(f));
  const hash = h.update(versaoThree).digest('hex').slice(0, 16);
  return { versaoThree, hash };
}

// hash gravado no bundle × hash da fonte atual
function bundleAtualizado() {
  if (!fs.existsSync(SAIDA)) return false;
  const cab = fs.readFileSync(SAIDA, 'utf8').slice(0, 400);
  const m = cab.match(/fonte:([0-9a-f]{16})/);
  return !!m && m[1] === assinatura().hash;
}

function construir() {
  const esbuild = require('esbuild');
  const { versaoThree, hash } = assinatura();
  esbuild.buildSync({
    entryPoints: [ENTRADA], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: SAIDA,
    legalComments: 'none', charset: 'utf8',
    banner: { js: `/* Visualizador 3D H&M — fonte:${hash} — inclui three.js r${versaoThree.split('.')[1]} (${versaoThree}) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */` },
  });
  return { arquivo: SAIDA, bytes: fs.statSync(SAIDA).size, hash };
}

if (require.main === module) {
  const r = construir();
  console.log(`Bundle do visualizador 3D: ${r.arquivo} (${(r.bytes / 1024).toFixed(0)} KB, fonte ${r.hash})`);
}

module.exports = { construir, bundleAtualizado, SAIDA };
