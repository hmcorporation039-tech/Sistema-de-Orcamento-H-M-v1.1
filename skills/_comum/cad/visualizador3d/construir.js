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
// fase 5: o mapa de iluminância e o cálculo ponto a ponto (o mesmo da skill de iluminação)
const FONTES = [ENTRADA, path.join(__dirname, 'quadro.js'), path.join(__dirname, 'interativo.js'), path.join(__dirname, '..', '..', 'instalacao', 'simulador.js'),
  path.join(__dirname, 'mapaIluminancia.js'), path.join(__dirname, '..', '..', 'fotometria', 'pontoAPonto.js'),
  // 2.30: modo de edição de componentes (3D embutido na tela da análise)
  path.join(__dirname, 'edicao.js'),
  // 09/11/2026: quadro fiel com a fiação, motor genérico de interação e vista interna dos painéis
  path.join(__dirname, '..', '..', 'instalacao', 'painelQuadro.js'), path.join(__dirname, '..', '..', 'instalacao', 'interacao.js'),
  path.join(__dirname, '..', '..', 'instalacao', 'paineis.js'), path.join(__dirname, '..', '..', '..', 'quadros', 'scripts', 'lib', 'tabelas.js'),
  // 09/11/2026: comando por relés do quadro gerado pela especificação (modo do 3D + o avaliador da lógica)
  path.join(__dirname, 'comandoReles.js'), path.join(__dirname, '..', '..', 'especificacao', 'logica.js'),
  // 2.36: a fiação de comando e o perfil da pressurização entram pelo paineis.js desde a 2.35 e
  // faltavam aqui (mudar um deles deixava o bundle velho sem aviso). construir() agora confere.
  path.join(__dirname, '..', '..', 'instalacao', 'fiacaoComando.js'), path.join(__dirname, '..', '..', 'especificacao', 'comando.js'),
  path.join(__dirname, '..', '..', 'especificacao', 'blocos-comando.json'),
  path.join(__dirname, '..', '..', '..', 'pressurizacao', 'dados', 'perfil-especificacao.json'),
  // 2.37: busca de componente, medição e vista no endereço
  path.join(__dirname, 'ferramentas.js'),
  // 14/11/2026: as tabelas que os quadros dividem com as outras skills (DIN 43671, Icw, séries de
  // disjuntor e DR) vêm da tabela elétrica comum; o escape de HTML e o número pt-BR do 3D, do pacote base
  path.join(__dirname, '..', '..', 'eletrico', 'tabelas.js'), path.join(__dirname, '..', '..', 'eletrico', 'dados', 'capacidade_conducao_cobre.json'),
  path.join(__dirname, '..', '..', 'base', 'html.js'), path.join(__dirname, '..', '..', 'base', 'formato.js')];

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
  const r = esbuild.buildSync({
    entryPoints: [ENTRADA], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: SAIDA,
    legalComments: 'none', charset: 'utf8', metafile: true,
    banner: { js: `/* Visualizador 3D H&M — fonte:${hash} — inclui three.js r${versaoThree.split('.')[1]} (${versaoThree}) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */` },
  });
  // todo arquivo local que entrou no bundle tem de estar em FONTES, senão mudá-lo não pede bundle novo
  const faltando = arquivosForaDasFontes(r.metafile);
  if (faltando.length) {
    fs.rmSync(SAIDA, { force: true });
    throw new Error(`construir.js: arquivo(s) no bundle fora de FONTES (acrescente na lista): ${faltando.join(', ')}`);
  }
  return { arquivo: SAIDA, bytes: fs.statSync(SAIDA).size, hash };
}

// entradas do metafile do esbuild (relativas à pasta de onde ele rodou) que não estão em FONTES
function arquivosForaDasFontes(metafile) {
  const fontes = new Set(FONTES.map(f => path.resolve(f).toLowerCase()));
  return Object.keys(metafile.inputs)
    .filter(f => !/node_modules/.test(f))
    .filter(f => !fontes.has(path.resolve(f).toLowerCase()));
}

if (require.main === module) {
  const r = construir();
  console.log(`Bundle do visualizador 3D: ${r.arquivo} (${(r.bytes / 1024).toFixed(0)} KB, fonte ${r.hash})`);
}

module.exports = { construir, bundleAtualizado, arquivosForaDasFontes, FONTES, SAIDA };
