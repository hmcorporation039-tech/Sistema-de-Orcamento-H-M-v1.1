// Aprendizado do desenho POR DISCIPLINA e por projeto (revisão de 06/11/2026; diretriz do dono do sistema: "quando
// falamos em aprendizado do sistema, referimos às disciplinas do sistema, como elétrica, CFTV etc." — o escritório do
// carimbo é só preferência, e o que o sistema aprende sozinho é sugestão; só o que o engenheiro confirmou é certo).
//
// aprendizado_votos: quem ensinou cada linha aprendida (services/votosAprendizado.js). Um voto por PROJETO (fonte:
//   'obra:<id>' / 'analise:<id>' no mapa do CAD, 'acervo:<pasta da obra>' no treino, 'arquivo:<hash ou nome>'), por
//   chave de cada tabela (tipo 'simbolo' = cad_simbolos_aprendidos.chave, 'bloco' = nome|escritório, 'nota' =
//   escritório|símbolo, 'pdf' = pdf_legendas_aprendidas.chave). valor: a opinião (tipo|altura, disciplina, altura);
//   dados: a linha que esse voto ensina; peso: 1 (o voto 'legado' — a linha de antes dos votos — leva o `vezes` dela).
//   A linha de cada tabela passa a ser a apuração: a confirmação do engenheiro vence; sem ela, opinião única, ou a
//   maioria com 3+ votos e 2/3 deles; reler o mesmo projeto não soma e desfazer tira só o voto daquele projeto.
// cad_notas_aprendidas.disciplina: a disciplina do tipo de ponto (a altura que o engenheiro confirma num desenho sem
//   carimbo vale para a disciplina — escritório '').
// cad_simbolos_aprendidos: "não é ponto" confirmado no mapa também se aprende (simbolo '?', chave 'NP|…|disciplina') —
//   nenhuma coluna nova; a disciplina é a do arquivo.
// acervo_treino.tentativas / regra_disciplina: o arquivo com erro é relido até 3 vezes (erro passageiro não trava para
//   sempre); o 'ignorado' por uma versão antiga da regra de disciplina do caminho é reavaliado.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS aprendizado_votos (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('simbolo', 'bloco', 'nota', 'pdf')),
      chave VARCHAR(400) NOT NULL,
      fonte VARCHAR(300) NOT NULL,
      valor VARCHAR(300) NOT NULL,
      origem VARCHAR(10) NOT NULL CHECK (origem IN ('legenda', 'nota', 'usuario')),
      peso INTEGER NOT NULL DEFAULT 1,
      dados JSONB NOT NULL DEFAULT '{}'::jsonb,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW(),
      UNIQUE (tipo, chave, fonte)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_aprendizado_votos_fonte ON aprendizado_votos(fonte)');

  await client.query('ALTER TABLE cad_notas_aprendidas ADD COLUMN IF NOT EXISTS disciplina VARCHAR(40)');
  // as linhas de antes: a disciplina pelo prefixo do tipo (HM-ELE-… elétrica; as notas de altura são de ponto de parede)
  await client.query(`
    UPDATE cad_notas_aprendidas SET disciplina = CASE split_part(simbolo, '-', 2)
        WHEN 'ELE' THEN 'eletrica' WHEN 'ILU' THEN 'iluminacao' WHEN 'CAB' THEN 'rede' WHEN 'TEL' THEN 'telefonia' WHEN 'ANT' THEN 'antena'
        WHEN 'CFTV' THEN 'cftv' WHEN 'ACE' THEN 'controle-acesso' WHEN 'ALM' THEN 'alarme' WHEN 'INC' THEN 'incendio' WHEN 'AUT' THEN 'automacao'
        WHEN 'SOL' THEN 'solar' WHEN 'VE' THEN 'veicular' WHEN 'SPDA' THEN 'spda' WHEN 'CLIM' THEN 'climatizacao' WHEN 'HOSP' THEN 'eletrica_hospitalar'
        ELSE 'eletrica' END
     WHERE disciplina IS NULL`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_cad_notas_aprendidas_disciplina ON cad_notas_aprendidas(disciplina)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_cad_simbolos_aprendidos_disciplina ON cad_simbolos_aprendidos(disciplina)');

  await client.query('ALTER TABLE acervo_treino ADD COLUMN IF NOT EXISTS tentativas INTEGER NOT NULL DEFAULT 0');
  await client.query('ALTER TABLE acervo_treino ADD COLUMN IF NOT EXISTS regra_disciplina INTEGER NOT NULL DEFAULT 1');
  // o erro de antes (sem contagem): conta como uma tentativa — vai ser relido mais duas vezes
  await client.query(`UPDATE acervo_treino SET tentativas = 1 WHERE situacao = 'erro' AND tentativas = 0`);
};
