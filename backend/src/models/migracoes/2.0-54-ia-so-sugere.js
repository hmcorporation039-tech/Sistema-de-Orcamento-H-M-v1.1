// "A IA só sugere" (revisão do uso de IA de 06/11/2026 — regra do dono: motor determinístico primeiro, IA por último;
// nada que a IA produziu entra como "confirmado" nem ensina o sistema sem o engenheiro conferir). Marcas de origem:
//   proposta_itens.origem_item      'assistente' = item criado/alterado pelo assistente virtual (IA); fica "a cotar",
//                                   não ensina vínculo descrição → material e não entra no catálogo até alguém
//                                   confirmar na tela (a tela limpa a marca ao confirmar). NULL = gente ou motor.
//   materiais.preco_origem          de onde veio o PREÇO atual ('fornecedor_email_ia', 'fornecedor_whatsapp', 'email_xml',
//                                   'proposta'…); terminado em _ia = lido por IA e não conferido (precoConferido em
//                                   services/catalogoMateriais.js). NULL = o de `origem` (cadastro antigo).
//   materiais.categoria_origem      quem escolheu a categoria: 'usuario', 'ia', 'knn', 'knn_baixa' (sugestão a conferir),
//                                   'parecido', 'palavras', 'ncm', 'padrao_disciplina', 'automatica' (antiga, etapa
//                                   desconhecida). NULL = catálogo anterior a esta versão. O kNN treina só com
//                                   'usuario' e o catálogo anterior (services/classificacaoMateriais.js).
//   materiais.categoria_ia_tentada_em  a IA já foi perguntada sobre a categoria: espera 7 dias para perguntar de novo.
//   ia_cache_uso.sem_ia / falhas    o contador "quanto sai sem IA" separa resolvido sem IA (determinístico),
//                                   reaproveitado de IA anterior (acertos = cache), chamada à IA com sucesso (chamadas)
//                                   e chamada que falhou (falhas).
//   emails_processados.anexos_lidos hash dos anexos já lidos: o anexo que precisava de IA (fora do ar) é relido sozinho.
//   *.aguardando_ia                 documento que só a IA leria, com a IA desligada: não é relido com OCR a cada
//                                   varredura; volta a ser lido quando a IA estiver ligada.
//   componentes_quadro_nao_encontrados  especificação que a IA não achou: lembrada por 30 dias (não pesquisa de novo).
const { umaVez } = require('../apoioMigracoes');

module.exports = async (client) => {
  await client.query('ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS origem_item VARCHAR(20)');
  await client.query('ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_origem VARCHAR(40)');
  await client.query('ALTER TABLE materiais ADD COLUMN IF NOT EXISTS categoria_origem VARCHAR(20)');
  await client.query('ALTER TABLE materiais ADD COLUMN IF NOT EXISTS categoria_ia_tentada_em TIMESTAMP');
  await client.query('ALTER TABLE ia_cache_uso ADD COLUMN IF NOT EXISTS sem_ia INTEGER NOT NULL DEFAULT 0');
  await client.query('ALTER TABLE ia_cache_uso ADD COLUMN IF NOT EXISTS falhas INTEGER NOT NULL DEFAULT 0');
  await client.query('ALTER TABLE emails_processados ADD COLUMN IF NOT EXISTS anexos_lidos TEXT[]');
  await client.query('ALTER TABLE emails_processados ADD COLUMN IF NOT EXISTS aguardando_ia BOOLEAN NOT NULL DEFAULT false');
  await client.query('ALTER TABLE arquivos_fornecedores_processados ADD COLUMN IF NOT EXISTS aguardando_ia BOOLEAN NOT NULL DEFAULT false');
  await client.query(`
    CREATE TABLE IF NOT EXISTS componentes_quadro_nao_encontrados (
      chave VARCHAR(400) PRIMARY KEY,
      motivo TEXT,
      pesquisado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await umaVez(client, 'migracao_2.0-54_ia_so_sugere', async () => {
    // preço lido por IA de uma cotação e nunca conferido (preco_manual): a marca vai para a origem do preço
    const precoIA = await client.query(
      `UPDATE materiais SET preco_origem = origem
        WHERE preco_origem IS NULL AND origem LIKE '%\\_ia' AND NOT COALESCE(preco_manual, false)`);
    // categoria escolhida por gente (cadastro/edição na tela, importação de planilha) × classificação automática do treino
    const usuario = await client.query(
      `UPDATE materiais SET categoria_origem = 'usuario' WHERE categoria_origem IS NULL AND origem IN ('manual', 'importacao')`);
    const automatica = await client.query(
      `UPDATE materiais SET categoria_origem = 'automatica' WHERE categoria_origem IS NULL AND origem = 'acervo'`);
    // o "acerto" da leitura de cotação e da classificação sempre foi resolvido SEM IA (nenhuma das duas usa o cache)
    const contador = await client.query(
      `UPDATE ia_cache_uso SET sem_ia = sem_ia + acertos, acertos = 0
        WHERE nome IN ('leitura_cotacao', 'classificacao_material') AND acertos > 0`);
    return { preco_ia: precoIA.rowCount, categoria_usuario: usuario.rowCount, categoria_automatica: automatica.rowCount, contador: contador.rowCount };
  });
};
