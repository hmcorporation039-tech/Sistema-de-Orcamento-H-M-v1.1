// Lint do frontend como o build do CRA faz (eslint-config-react-app/base, os plugins do react-scripts),
// mais `no-undef` — roda na bateria (scripts/pre-deploy.js) desde a 2.40.
// Por quê: na 2.39 a bateria passou e o build falhou num `eslint-disable` que citava uma regra que o
// build não carrega (react-hooks/...); e na 2.38 uma tela usava `dataHora` sem existir — o Jest não
// pegou nenhum dos dois. Só ERROS reprovam (avisos continuam avisos, como no build sem CI).
// Uso: node scripts/lint-frontend.js [pasta do frontend]   (sai 1 se houver erro)
const path = require('path');

const pasta = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'frontend'));
const doFrontend = (m) => require(require.resolve(m, { paths: [pasta] }));

(async () => {
  const { ESLint } = doFrontend('eslint');
  const eslint = new ESLint({
    cwd: pasta,
    useEslintrc: false,
    resolvePluginsRelativeTo: path.dirname(require.resolve('react-scripts/config/webpack.config.js', { paths: [pasta] })),
    baseConfig: {
      extends: [require.resolve('eslint-config-react-app/base', { paths: [pasta] })],
      env: { browser: true, node: true, jest: true, es2021: true },
      rules: { 'no-undef': 'error' },
    },
  });
  const resultados = await eslint.lintFiles(['src/**/*.js']);
  const comErro = resultados.filter(r => r.errorCount > 0);
  for (const r of comErro) {
    for (const m of r.messages.filter(x => x.severity === 2)) {
      console.log(`${path.relative(pasta, r.filePath)}:${m.line}:${m.column}  ${m.message}`);
    }
  }
  console.log(`lint do frontend: ${resultados.length} arquivos, ${comErro.length} com erro`);
  process.exit(comErro.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
