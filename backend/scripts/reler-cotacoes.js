// Acrescenta ao comparativo de fornecedores as cotações que já estavam nas pastas antes dele existir.
// Só lê os arquivos (sem IA) e grava o preço cotado com o fornecedor; não cadastra material nem muda preço do
// catálogo. Pode rodar de novo: o que já foi guardado não duplica. E-mails antigos não entram (só os novos).
//   node scripts/reler-cotacoes.js
require('../src/config/env');
const pool = require('../src/config/database');
const svc = require('../src/services/cotacaoFornecedorService');
const { carregarIndice } = require('../src/services/catalogoMateriais');
const { encerrarOcr } = require('../src/services/leitorCotacao');

(async () => {
  const resumo = { avisos: [] };
  const arquivos = [];
  for (const [i, pasta] of svc.PASTAS_FORNECEDORES.entries()) arquivos.push(...await svc.listarArquivos(pasta, resumo, i === 0));
  const client = await pool.connect();
  let guardados = 0, semFornecedor = 0, erros = 0;
  try {
    const indice = await carregarIndice(client);
    for (const a of arquivos) {
      try {
        const r = await svc.guardarCotacoesDoArquivo(client, a, { indice });
        guardados += r.guardados;
        if (r.semFornecedor) { semFornecedor++; console.log(`sem CNPJ de fornecedor: ${a.nome}`); }
      } catch (e) { erros++; console.log(`erro em ${a.nome}: ${e.message}`); }
    }
  } finally {
    client.release();
    await encerrarOcr();
  }
  for (const av of resumo.avisos) console.log(av);
  console.log(`${arquivos.length} arquivos lidos: ${guardados} preços novos no comparativo, ${semFornecedor} sem CNPJ de fornecedor, ${erros} com erro.`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
