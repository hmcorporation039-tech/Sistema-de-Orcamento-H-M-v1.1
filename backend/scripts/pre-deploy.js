// Verificação antes de subir uma versão: roda TODOS os testes da pasta testes/ (não depende de uma lista
// escrita à mão, que já esqueceu 4 testes no "npm test"), confere que as versões dos package.json e dos
// package-lock.json são a mesma e que as migrações estão em ordem. Sai com código 1 se algo falhar.
//
//   node scripts/pre-deploy.js                 roda tudo, um teste por vez
//   node scripts/pre-deploy.js --so=vencimentos   só os testes cujo nome contém o texto
//   node scripts/pre-deploy.js --rapido        pula os dois mais lentos (modelo3d e pdfParaDxf, ~45 s dos ~140 s)
//
// Os testes que usam banco só rodam a parte do banco quando DB_NAME=hm_orcamentos_v2; em qualquer outro
// banco (a produção) cada teste pula essa parte sozinho e o resumo avisa quantos pularam.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PASTA_TESTES = path.join(__dirname, '..', 'testes');
const PASTA_MIGRACOES = path.join(__dirname, '..', 'src', 'models', 'migracoes');
const TEMPO_MAXIMO_MS = 180000;

function listarTestes(pasta = PASTA_TESTES) {
  return fs.readdirSync(pasta).filter(f => /\.test\.js$/.test(f)).sort();
}

// Versão dos quatro arquivos (backend e frontend, package e lock) tem de ser a mesma: o lock guarda a
// versão em dois lugares (linha 3 e a do pacote raiz). Subir com uma delas esquecida já aconteceu.
function verificarVersoes(raiz = RAIZ) {
  const ler = (...partes) => JSON.parse(fs.readFileSync(path.join(raiz, ...partes), 'utf8'));
  const versoes = {};
  const problemas = [];
  for (const pacote of ['backend', 'frontend']) {
    try {
      versoes[`${pacote}/package.json`] = ler(pacote, 'package.json').version;
      const lock = ler(pacote, 'package-lock.json');
      versoes[`${pacote}/package-lock.json`] = lock.version;
      versoes[`${pacote}/package-lock.json (pacote raiz)`] = lock.packages && lock.packages[''] ? lock.packages[''].version : undefined;
    } catch (e) {
      problemas.push(`${pacote}: não consegui ler os arquivos de versão (${e.message})`);
    }
  }
  const distintas = new Set(Object.values(versoes));
  if (distintas.size > 1) {
    problemas.push('Versões diferentes: ' + Object.entries(versoes).map(([k, v]) => `${k}=${v}`).join('; '));
  }
  return { ok: problemas.length === 0, versao: [...distintas][0], versoes, problemas };
}

// Mesma regra de models/schema.js (listarMigracoes): só "2.0-NN-nome.js"; cada uma exporta uma função
// e o número NN não se repete nem pula (um buraco ou repetição quase sempre é arquivo esquecido no merge).
function verificarMigracoes(pasta = PASTA_MIGRACOES) {
  const problemas = [];
  const arquivos = fs.readdirSync(pasta).filter(f => /^\d.*\.js$/.test(f)).sort();
  const numeros = [];
  for (const f of arquivos) {
    const m = f.match(/^2\.0-(\d+)-.+\.js$/);
    if (!m) { problemas.push(`${f}: nome fora do padrão 2.0-NN-nome.js`); continue; }
    numeros.push(Number(m[1]));
    try {
      const caminho = path.join(pasta, f);
      delete require.cache[require.resolve(caminho)];
      if (typeof require(caminho) !== 'function') problemas.push(`${f}: não exporta uma função (client) => ...`);
    } catch (e) { problemas.push(`${f}: não carrega (${e.message})`); }
  }
  const vistos = new Set();
  for (const n of numeros) {
    if (vistos.has(n)) problemas.push(`número de migração repetido: ${n}`);
    vistos.add(n);
  }
  const maior = Math.max(0, ...numeros);
  for (let n = 1; n <= maior; n++) if (!vistos.has(n)) problemas.push(`falta a migração número ${n} (há a ${maior})`);
  return { ok: problemas.length === 0, total: arquivos.length, problemas };
}

function rodarTeste(arquivo, pasta = PASTA_TESTES, tempoMaximo = TEMPO_MAXIMO_MS) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const filho = spawn(process.execPath, [path.join(pasta, arquivo)], { cwd: path.dirname(pasta), env: process.env });
    let saida = '';
    const juntar = (d) => { saida += d.toString(); if (saida.length > 200000) saida = saida.slice(-100000); };
    filho.stdout.on('data', juntar);
    filho.stderr.on('data', juntar);
    let estourou = false;
    const relogio = setTimeout(() => { estourou = true; filho.kill(); }, tempoMaximo);
    filho.on('close', (codigo) => {
      clearTimeout(relogio);
      resolve({
        arquivo,
        ok: codigo === 0 && !estourou,
        estourou,
        segundos: (Date.now() - inicio) / 1000,
        pulouBanco: /parte do banco pulada/i.test(saida),
        saida,
      });
    });
    filho.on('error', (e) => { clearTimeout(relogio); resolve({ arquivo, ok: false, estourou: false, segundos: 0, pulouBanco: false, saida: String(e.message) }); });
  });
}

async function principal(argv) {
  const so = (argv.find(a => a.startsWith('--so=')) || '').slice(5);
  const rapido = argv.includes('--rapido');
  try { require('../src/config/env'); } catch { /* sem .env: os testes avisam sozinhos */ }
  const banco = process.env.DB_NAME || '(não definido)';
  console.log(`Pré-deploy — banco configurado: ${banco}${banco === 'hm_orcamentos_v2' ? ' (testes de banco VÃO rodar)' : ' (testes de banco serão pulados)'}\n`);

  let falhou = false;
  const versoes = verificarVersoes();
  console.log(versoes.ok ? `ok   versões iguais nos 4 arquivos (${versoes.versao})` : 'FALHA versões:\n  ' + versoes.problemas.join('\n  '));
  if (!versoes.ok) falhou = true;
  const migracoes = verificarMigracoes();
  console.log(migracoes.ok ? `ok   ${migracoes.total} migrações em ordem` : 'FALHA migrações:\n  ' + migracoes.problemas.join('\n  '));
  if (!migracoes.ok) falhou = true;
  console.log('');

  let lista = listarTestes();
  if (so) lista = lista.filter(f => f.includes(so));
  if (rapido) lista = lista.filter(f => !LENTOS.has(f));
  if (!lista.length) { console.log('Nenhum teste encontrado com esse filtro.'); return 1; }

  const resultados = [];
  const inicio = Date.now();
  for (const arquivo of lista) {
    const r = await rodarTeste(arquivo);
    resultados.push(r);
    console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${arquivo.replace(/\.test\.js$/, '')}  (${r.segundos.toFixed(1)} s)${r.pulouBanco ? '  [parte do banco pulada]' : ''}${r.estourou ? '  [passou do tempo máximo]' : ''}`);
    if (!r.ok) {
      falhou = true;
      console.log(r.saida.trim().split('\n').slice(-15).map(l => '       ' + l).join('\n'));
    }
  }

  const falhas = resultados.filter(r => !r.ok);
  const pulados = resultados.filter(r => r.pulouBanco).length;
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes ok em ${((Date.now() - inicio) / 1000).toFixed(0)} s` +
    (pulados ? ` — ${pulados} sem a parte do banco (rode com DB_NAME=hm_orcamentos_v2 para cobrir)` : ''));
  if (falhas.length) console.log('Falharam: ' + falhas.map(f => f.arquivo).join(', '));
  console.log(falhou ? '\nNÃO SUBA esta versão.'
    : (so || rapido) ? '\nSem falhas, mas esta rodada foi PARCIAL (filtro ativo): antes de subir rode sem --so/--rapido.'
    : '\nPode seguir com o deploy.');
  return falhou ? 1 : 0;
}

const LENTOS = new Set(['modelo3d.test.js', 'pdfParaDxf.test.js']);

module.exports = { listarTestes, verificarVersoes, verificarMigracoes, rodarTeste };

if (require.main === module) {
  principal(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(1); });
}
