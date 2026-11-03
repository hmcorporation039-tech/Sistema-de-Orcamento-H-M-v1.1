// Verificação antes de subir uma versão: roda TODOS os testes da pasta testes/ (não depende de uma lista
// escrita à mão, que já esqueceu 4 testes no "npm test"), os testes Jest do frontend (app de campo,
// sessão, Modal...) e os testes de regressão das skills (skills/testar-todas.js, que comparam com laudos
// reais entregues), confere que as versões dos package.json e dos package-lock.json são a mesma e que as
// migrações estão em ordem. Sai com código 1 se algo falhar.
//
//   node scripts/pre-deploy.js                 roda tudo, um teste por vez
//   node scripts/pre-deploy.js --so=vencimentos   só os testes do backend cujo nome contém o texto
//   node scripts/pre-deploy.js --rapido        pula os dois mais lentos (modelo3d e pdfParaDxf, ~45 s dos ~140 s)
//   node scripts/pre-deploy.js --sem-skills    não roda os testes das skills (rodada PARCIAL)
//   node scripts/pre-deploy.js --sem-frontend  não roda o Jest do frontend (rodada PARCIAL)
//
// Os testes que usam banco só rodam a parte do banco quando DB_NAME=hm_orcamentos_v2; em qualquer outro
// banco (a produção) cada teste pula essa parte sozinho e o resumo avisa quantos pularam.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ordenarMigracoes } = require('../src/models/apoioMigracoes');

const RAIZ = path.join(__dirname, '..', '..');
const PASTA_TESTES = path.join(__dirname, '..', 'testes');
const PASTA_MIGRACOES = path.join(__dirname, '..', 'src', 'models', 'migracoes');
const TEMPO_MAXIMO_MS = 180000;
const PASTA_FRONTEND = path.join(RAIZ, 'frontend');
const PASTA_SKILLS = path.join(RAIZ, 'skills');
const TEMPO_MAXIMO_SUITE_MS = 15 * 60 * 1000;   // Jest do frontend e skills inteiras

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
// A ordem é a de EXECUÇÃO (numérica, ordenarMigracoes): a 2.0-100 depois da 2.0-99.
function verificarMigracoes(pasta = PASTA_MIGRACOES) {
  const problemas = [];
  const arquivos = ordenarMigracoes(fs.readdirSync(pasta).filter(f => /^\d.*\.js$/.test(f)));
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
  // a ordem de execução tem de seguir o número (pega quem voltar a ordenar como texto)
  for (let i = 1; i < numeros.length; i++) {
    if (numeros[i] < numeros[i - 1]) problemas.push(`ordem de execução fora do número: ${numeros[i - 1]} antes de ${numeros[i]}`);
  }
  return { ok: problemas.length === 0, total: arquivos.length, ordem: arquivos, problemas };
}

function rodarTeste(arquivo, pasta = PASTA_TESTES, tempoMaximo = TEMPO_MAXIMO_MS) {
  return rodarNode(arquivo, [path.join(pasta, arquivo)], { cwd: path.dirname(pasta), tempoMaximo });
}

// Roda um script do Node num processo à parte, guarda a saída (para mostrar o fim se falhar) e mata
// se passar do tempo máximo. Serve aos testes do backend, ao Jest do frontend e às skills.
function rodarNode(arquivo, args, { cwd, env = process.env, tempoMaximo = TEMPO_MAXIMO_MS }) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const filho = spawn(process.execPath, args, { cwd, env });
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
  const semSkills = argv.includes('--sem-skills');
  const semFrontend = argv.includes('--sem-frontend');
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
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes do backend ok em ${((Date.now() - inicio) / 1000).toFixed(0)} s` +
    (pulados ? ` — ${pulados} sem a parte do banco (rode com DB_NAME=hm_orcamentos_v2 para cobrir)` : ''));
  if (falhas.length) console.log('Falharam: ' + falhas.map(f => f.arquivo).join(', '));

  // frontend (Jest) e skills: fora do filtro --so (que é só do backend)
  if (so) console.log('\n(--so: Jest do frontend e testes das skills não rodaram)');
  else {
    console.log('');
    const suites = [];
    if (!semFrontend) suites.push(rodarJestFrontend);
    if (!semSkills) suites.push(rodarTestesSkills);
    for (const rodar of suites) {
      const r = await rodar();
      const resumo = resumoSuite(r);
      console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${r.arquivo}  (${r.segundos.toFixed(1)} s)${resumo ? `  — ${resumo}` : ''}${r.estourou ? '  [passou do tempo máximo]' : ''}`);
      if (!r.ok) {
        falhou = true;
        console.log(r.saida.trim().split('\n').slice(-25).map(l => '       ' + l).join('\n'));
      }
    }
    if (semFrontend) console.log('(--sem-frontend: Jest do frontend não rodou)');
    if (semSkills) console.log('(--sem-skills: testes das skills não rodaram)');
  }
  const parcial = so || rapido || semSkills || semFrontend;
  console.log(`\nTempo total: ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  console.log(falhou ? '\nNÃO SUBA esta versão.'
    : parcial ? '\nSem falhas, mas esta rodada foi PARCIAL (filtro ativo): antes de subir rode sem --so/--rapido/--sem-skills/--sem-frontend.'
    : '\nPode seguir com o deploy.');
  return falhou ? 1 : 0;
}

const LENTOS = new Set(['modelo3d.test.js', 'pdfParaDxf.test.js']);

// Jest do frontend sem modo "watch" (CI=true, --watchAll=false), pelo próprio react-scripts do
// frontend — o mesmo que "npm run test:ci" lá, sem passar por npm/cmd.
function rodarJestFrontend(pasta = PASTA_FRONTEND) {
  // direto o scripts/test.js (o bin/react-scripts.js abriria mais um processo, que o tempo máximo não mataria)
  const bin = path.join(pasta, 'node_modules', 'react-scripts', 'scripts', 'test.js');
  if (!fs.existsSync(bin)) {
    return Promise.resolve({ arquivo: 'frontend (Jest)', ok: false, estourou: false, segundos: 0, pulouBanco: false,
      saida: `react-scripts não encontrado em ${bin} — rode "npm install" na pasta frontend.` });
  }
  return rodarNode('frontend (Jest)', [bin, '--watchAll=false'], { cwd: pasta, env: { ...process.env, CI: 'true' }, tempoMaximo: TEMPO_MAXIMO_SUITE_MS });
}

// Testes de regressão de todas as skills (skills/testar-todas.js = "npm test" na pasta skills).
function rodarTestesSkills(pasta = PASTA_SKILLS) {
  return rodarNode('skills (testar-todas)', [path.join(pasta, 'testar-todas.js')], { cwd: pasta, tempoMaximo: TEMPO_MAXIMO_SUITE_MS });
}

// Resumo de uma suíte de fora do backend: a linha de contagem do Jest ou quantos testes de skill falharam.
function resumoSuite(r) {
  const jest = r.saida.match(/Tests:\s+([^\n]+)/);
  if (jest) return jest[1].trim();
  const falhas = (r.saida.match(/: FALHOU/g) || []).length;
  return falhas ? `${falhas} teste(s) de skill falharam` : '';
}

module.exports = { listarTestes, verificarVersoes, verificarMigracoes, rodarTeste, rodarNode, rodarJestFrontend, rodarTestesSkills, resumoSuite };

if (require.main === module) {
  principal(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(1); });
}
