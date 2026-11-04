// Treino com as obras já feitas (services/treinoAcervo.js) pela linha de comando: lê os DWG/DXF, as pranchas em PDF,
// as planilhas (inclusive .xls) e os orçamentos em PDF da pasta dos clientes (PASTA_CLIENTES do .env) e grava no banco do .env o que eles ensinam, por
// disciplina — legendas (do DWG e do PDF), alturas, nomes de bloco e os materiais que o catálogo ainda não tem.
// Sem IA. Só lê a pasta; retoma de onde parou (o arquivo já lido e não alterado não é relido).
//   node scripts/treinar-acervo.js [--limite 50] [--horas 2] [--pasta "<outra pasta>"] [--tipos planilha,pdf,cad,prancha]
require('../src/config/env');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { treinar, situacao } = require('../src/services/treinoAcervo');

const arg = (nome) => { const i = process.argv.indexOf(`--${nome}`); return i > 0 ? process.argv[i + 1] : undefined; };

(async () => {
  await criarTabelas(); // as tabelas do aprendizado (migrações 2.0-48/49) existem antes da primeira rodada
  const relogio = setInterval(() => {
    const s = situacao();
    if (s.rodando && s.atual) console.log(`[${s.feitos}/${s.pendentes}] ${s.atual}`);
  }, 15000);
  try {
    const r = await treinar({
      limite: Number(arg('limite')) || undefined,
      tempoMaxMs: (Number(arg('horas')) || 2) * 3600 * 1000,
      ...(arg('pasta') ? { raiz: arg('pasta') } : {}),
      ...(arg('tipos') ? { tipos: arg('tipos').split(',') } : {}),
    });
    console.log(`${r.lidos} lido(s), ${r.ignorados} de outra disciplina, ${r.erros} com erro, de ${r.pendentes} pendente(s) (${r.total} arquivo(s) na pasta)`);
    console.log(`aprendeu: ${r.ensinou.simbolos} linha(s) de legenda de símbolo, ${r.ensinou.legendasPdf} de legenda de PDF, ${r.ensinou.blocos} nome(s) de bloco, ${r.ensinou.notas} altura(s), ${r.ensinou.materiais} material(is) novo(s) no catálogo e ${r.ensinou.semPreco} sem preço — ${r.mensagem}`);
  } finally {
    clearInterval(relogio);
    await pool.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
