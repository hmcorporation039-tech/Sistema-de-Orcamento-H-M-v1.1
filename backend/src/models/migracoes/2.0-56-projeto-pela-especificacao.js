// Projeto pela especificação do cliente (pedido do usuário de 09/11/2026: "que seja capaz de aprender
// com isso, para que nos próximos seja autossuficiente e dependa o mínimo de IA").
//   especificacao_aprendizado: o que o engenheiro APROVOU num projeto gerado pela especificação vira
//   padrão do perfil (skills/<disciplina>/dados/perfil-especificacao.json) para o próximo, sem IA:
//     tipo 'vocabulario' — frase da especificação que o leitor não entendeu → requisito/equipamento/sinal
//                          (valor: { alvo, id, padrao, frase });
//     tipo 'escolha'     — regra de solução por tipo de carga (valor: o trecho de "regras" do perfil que
//                          muda, ex.: { cargas: { motor: { fator_entrada_inversor: 1.5 } } });
//     tipo 'decisao'     — resposta aprovada a um ponto a levantar que vira padrão (valor: { valor }),
//                          ex.: titular_automacao = REMOTO (seletora B1 · REM · B2);
//     tipo 'resposta'    — "manter como pedido" num ponto (vira exceção declarada);
//     tipo 'preco'       — preço pesquisado/aprovado com loja, faixa e data-base (perfil '*', vale para
//                          todos os perfis), com a alternativa econômica e a equivalência, se houver.
//   Uma linha por (perfil, tipo, chave); aprovar de novo soma confirmações e troca o valor. 'ativo'
//   desliga sem apagar (o administrador desfaz pela tela).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS especificacao_aprendizado (
      id SERIAL PRIMARY KEY,
      perfil VARCHAR(60) NOT NULL,
      tipo VARCHAR(20) NOT NULL,
      chave VARCHAR(300) NOT NULL,
      valor JSONB NOT NULL DEFAULT '{}'::jsonb,
      origem VARCHAR(12) NOT NULL DEFAULT 'usuario',
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      laudo_id INTEGER REFERENCES laudos_projetos(id) ON DELETE SET NULL,
      confirmacoes INTEGER NOT NULL DEFAULT 1,
      usos INTEGER NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT true,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (perfil, tipo, chave)
    )`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_especificacao_aprendizado_perfil ON especificacao_aprendizado(perfil, tipo) WHERE ativo');
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_especificacao_aprendizado_tipo') THEN
      ALTER TABLE especificacao_aprendizado ADD CONSTRAINT ck_especificacao_aprendizado_tipo CHECK (tipo IN ('vocabulario', 'escolha', 'decisao', 'resposta', 'preco'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_especificacao_aprendizado_origem') THEN
      ALTER TABLE especificacao_aprendizado ADD CONSTRAINT ck_especificacao_aprendizado_origem CHECK (origem IN ('usuario', 'projeto'));
    END IF;
  END $$`);
};
