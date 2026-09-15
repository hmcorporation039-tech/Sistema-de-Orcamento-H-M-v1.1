const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { ITENS_REFERENCIA } = require('../utils/precosMaoDeObraReferencia');

async function criarTabelas() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        ultimo_acesso TIMESTAMP
      )
    `);

    // Tabela de clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        documento VARCHAR(20),
        tipo VARCHAR(50) DEFAULT 'Empresa',
        responsavel VARCHAR(100),
        telefone VARCHAR(20),
        email VARCHAR(100),
        endereco TEXT,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabela de materiais
    await client.query(`
      CREATE TABLE IF NOT EXISTS materiais (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20),
        descricao VARCHAR(300) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        unidade VARCHAR(10) NOT NULL,
        preco DECIMAL(10,2) DEFAULT 0,
        marca VARCHAR(100),
        ncm VARCHAR(10),
        preco_compra DECIMAL(10,2),
        origem VARCHAR(30) DEFAULT 'manual',
        preco_manual BOOLEAN DEFAULT false,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS ncm VARCHAR(10)`);
    await client.query(`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_compra DECIMAL(10,2)`);
    await client.query(`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS origem VARCHAR(30) DEFAULT 'manual'`);
    await client.query(`ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco_manual BOOLEAN DEFAULT false`);

    // Tabela de propostas
    await client.query(`
      CREATE TABLE IF NOT EXISTS propostas (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(10) UNIQUE NOT NULL,
        sequencial INTEGER NOT NULL,
        data DATE NOT NULL,
        validade INTEGER DEFAULT 5,
        tipo VARCHAR(50),
        porte VARCHAR(30),
        cliente_id INTEGER REFERENCES clientes(id),
        cliente_nome VARCHAR(200),
        responsavel VARCHAR(100),
        local_obra TEXT,
        pagamento TEXT,
        observacoes TEXT,
        bdi DECIMAL(5,2) DEFAULT 0,
        imposto_venda DECIMAL(5,2) DEFAULT 0,
        imposto_servico DECIMAL(5,2) DEFAULT 0,
        subtotal_materiais DECIMAL(12,2) DEFAULT 0,
        subtotal_mao_obra DECIMAL(12,2) DEFAULT 0,
        valor_bdi DECIMAL(12,2) DEFAULT 0,
        valor_imposto_venda DECIMAL(12,2) DEFAULT 0,
        valor_imposto_servico DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Ativa',
        usuario_id INTEGER REFERENCES usuarios(id),
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS imposto_venda DECIMAL(5,2) DEFAULT 0`);
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS imposto_servico DECIMAL(5,2) DEFAULT 0`);
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS valor_imposto_venda DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS valor_imposto_servico DECIMAL(12,2) DEFAULT 0`);
    // Ajuste geral: único percentual que aceita negativo (desconto) — aumenta
    // ou desconta todos os valores da proposta de uma vez, sobre a mesma base
    // do BDI (materiais + mão de obra). DECIMAL(6,2) por causa do sinal.
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS ajuste_geral DECIMAL(6,2) DEFAULT 0`);
    await client.query(`ALTER TABLE propostas ADD COLUMN IF NOT EXISTS valor_ajuste_geral DECIMAL(12,2) DEFAULT 0`);

    // Tabela de seções da proposta
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposta_secoes (
        id SERIAL PRIMARY KEY,
        proposta_id INTEGER REFERENCES propostas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        ordem INTEGER DEFAULT 0
      )
    `);

    // Tabela de itens da proposta
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposta_itens (
        id SERIAL PRIMARY KEY,
        proposta_id INTEGER REFERENCES propostas(id) ON DELETE CASCADE,
        secao_id INTEGER REFERENCES proposta_secoes(id) ON DELETE CASCADE,
        material_id INTEGER REFERENCES materiais(id),
        descricao TEXT NOT NULL,
        quantidade DECIMAL(10,3) DEFAULT 1,
        unidade VARCHAR(10),
        valor_unitario DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(12,2) DEFAULT 0,
        ncm VARCHAR(10),
        ordem INTEGER DEFAULT 0
      )
    `);
    await client.query(`ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS ncm VARCHAR(10)`);
    await client.query(`ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS codigo VARCHAR(20)`);
    // Subgrupo: agrupamento visual opcional dentro de uma seção (ex: "Alarme" dentro de "Mão de Obra")
    await client.query(`ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS subgrupo VARCHAR(100)`);
    // Status do item: 'confirmado' (preço fechado) ou 'a_cotar' (preço estimado, pendente de confirmação)
    await client.query(`ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmado'`);

    // Trilha de auditoria: registra criação, edição, mudança de status e duplicação de propostas
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposta_eventos (
        id SERIAL PRIMARY KEY,
        proposta_id INTEGER REFERENCES propostas(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id),
        acao VARCHAR(30) NOT NULL,
        detalhes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Análises de Projeto (Compatibilização): rascunho persistido do que foi
    // extraído automaticamente do(s) PDF(s) do projeto do cliente + a revisão
    // de serviços/materiais feita pelo usuário. Diferente de propostas (que
    // normalizam seções/itens em tabelas próprias porque alimentam relatório
    // financeiro e duplicação item a item), aqui os campos de lista viram
    // JSONB: o frontend já trata cada um como um array opaco, salvo e
    // carregado por inteiro (autosave), sem necessidade de consulta SQL por
    // item individual — normalizar teria só o custo, sem benefício real.
    await client.query(`
      CREATE TABLE IF NOT EXISTS analises_projeto (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        cliente_nome VARCHAR(200),
        disciplinas JSONB NOT NULL DEFAULT '[]',
        arquivos_analisados JSONB NOT NULL DEFAULT '[]',
        ambientes JSONB NOT NULL DEFAULT '[]',
        cameras JSONB NOT NULL DEFAULT '{}',
        pontos_rede_antena JSONB NOT NULL DEFAULT '{}',
        tabela_cabos JSONB NOT NULL DEFAULT '[]',
        achados JSONB NOT NULL DEFAULT '[]',
        servicos JSONB NOT NULL DEFAULT '[]',
        materiais JSONB NOT NULL DEFAULT '[]',
        usuario_id INTEGER REFERENCES usuarios(id),
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    // Distribuição aproximada de pontos por ambiente (ver utils/pontosPorAmbiente.js)
    await client.query(`ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS pontos_por_ambiente JSONB NOT NULL DEFAULT '[]'`);
    // Proposta gerada a partir desta análise (botão "Gerar Orçamento") — nula
    // até o primeiro clique; um segundo clique atualiza a mesma proposta em
    // vez de criar outra.
    await client.query(`ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS proposta_id INTEGER REFERENCES propostas(id)`);

    // Preços de referência de mão de obra (valor médio de mercado, editado
    // por um admin) — usados só como SUGESTÃO ao lado do campo de valor
    // unitário na Análise de Projeto, nunca preenchidos automaticamente no
    // item (ver utils/precosMaoDeObraReferencia.js e montarServicosPadrao em
    // compatibilizacaoAnalise.js).
    await client.query(`
      CREATE TABLE IF NOT EXISTS precos_mao_de_obra_referencia (
        codigo VARCHAR(50) PRIMARY KEY,
        descricao VARCHAR(200) NOT NULL,
        unidade VARCHAR(10),
        disciplina VARCHAR(30),
        valor_referencia DECIMAL(10,2),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    // Semeia os códigos conhecidos sem sobrescrever um valor_referencia já
    // preenchido pelo admin — só a descrição/unidade/disciplina são mantidas
    // sincronizadas com a lista canônica (podem mudar de texto entre versões
    // do sistema; o valor de referência é dado do usuário, nunca é tocado).
    for (const it of ITENS_REFERENCIA) {
      await client.query(
        `INSERT INTO precos_mao_de_obra_referencia (codigo, descricao, unidade, disciplina)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (codigo) DO UPDATE SET descricao = $2, unidade = $3, disciplina = $4`,
        [it.codigo, it.descricao, it.unidade, it.disciplina]
      );
    }

    // Cache de pesquisas de mercado (ver utils/pesquisaMercadoService.js) —
    // a mesma descrição pesquisada de novo dentro de 48h reaproveita o
    // resultado salvo aqui em vez de gastar cota do Gemini/dinheiro do
    // Claude de novo. Como bônus, vira um histórico de preços pesquisados.
    await client.query(`
      CREATE TABLE IF NOT EXISTS pesquisas_mercado (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(500) NOT NULL,
        descricao_normalizada VARCHAR(500) NOT NULL,
        resultado TEXT NOT NULL,
        fonte VARCHAR(20) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_pesquisas_mercado_desc ON pesquisas_mercado(descricao_normalizada, criado_em DESC)');

    // Tabela de sequência de propostas
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(50) PRIMARY KEY,
        valor TEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Inserir sequência inicial se não existir
    await client.query(`
      INSERT INTO configuracoes (chave, valor)
      VALUES ('proximo_numero', '142')
      ON CONFLICT (chave) DO NOTHING
    `);

    // Margem padrão (%) aplicada sobre o preço de compra para sugerir o preço de venda
    await client.query(`
      INSERT INTO configuracoes (chave, valor)
      VALUES ('margem_padrao', '30')
      ON CONFLICT (chave) DO NOTHING
    `);

    // E-mails já lidos pela importação automática de notas fiscais (evita reprocessar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS emails_processados (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(998) UNIQUE NOT NULL,
        assunto TEXT,
        processado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Notas fiscais já importadas (pela chave de acesso da NF-e), evita duplicar itens
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_processadas (
        id SERIAL PRIMARY KEY,
        chave_acesso VARCHAR(44) UNIQUE,
        numero VARCHAR(20),
        itens_novos INTEGER DEFAULT 0,
        itens_atualizados INTEGER DEFAULT 0,
        processado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Orçamentos de fornecedores recebidos por WhatsApp (PDFs salvos manualmente em
    // uma pasta local) já importados — evita reprocessar o mesmo arquivo a cada
    // varredura. Identificado pelo hash do conteúdo (não pelo nome, que pode mudar).
    await client.query(`
      CREATE TABLE IF NOT EXISTS arquivos_fornecedores_processados (
        id SERIAL PRIMARY KEY,
        arquivo VARCHAR(255) NOT NULL,
        hash VARCHAR(64) UNIQUE NOT NULL,
        itens_novos INTEGER DEFAULT 0,
        itens_atualizados INTEGER DEFAULT 0,
        processado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    // Prestadores de serviços: mão de obra, material e despesas diárias pagos a
    // terceiros. Pagamentos feitos a eles (financeiro_movimentos.tipo='realizado')
    // são vinculados automaticamente pelo nome (veja vincularPrestadores.js)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prestadores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(100),
        telefone VARCHAR(20),
        cpf VARCHAR(14),
        chave_pix VARCHAR(200),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE prestadores ADD COLUMN IF NOT EXISTS categoria VARCHAR(20)`);
    await client.query(`ALTER TABLE prestadores ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'Pessoa Física'`);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores' AND column_name = 'cpf')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores' AND column_name = 'documento') THEN
          ALTER TABLE prestadores RENAME COLUMN cpf TO documento;
        END IF;
      END $$;
    `);
    await client.query(`ALTER TABLE prestadores ALTER COLUMN documento TYPE VARCHAR(20)`);

    // Contratos de prestação de serviço gerados automaticamente para os prestadores
    await client.query(`
      CREATE TABLE IF NOT EXISTS contratos (
        id SERIAL PRIMARY KEY,
        prestador_id INTEGER NOT NULL REFERENCES prestadores(id),
        objeto TEXT,
        local_obra VARCHAR(300),
        periodo_inicio DATE NOT NULL,
        periodo_fim DATE NOT NULL,
        valor DECIMAL(12,2) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE contratos ADD COLUMN IF NOT EXISTS codigo_registro VARCHAR(30) UNIQUE`);
    // Contratos antigos sem código (ex: criados antes desta coluna existir) recebem um agora
    await client.query(`
      UPDATE contratos
      SET codigo_registro = 'CT-' || EXTRACT(YEAR FROM criado_em) || '-' || LPAD(id::text, 4, '0')
      WHERE codigo_registro IS NULL
    `);

    // Controle financeiro: Pix recebidos/realizados importados automaticamente dos
    // e-mails de notificação do Banco Inter (veja financeiroEmailService.js), ou
    // lançados manualmente (ex: movimentos anteriores a existir a integração de e-mail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS financeiro_movimentos (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        nome VARCHAR(200),
        valor DECIMAL(12,2) NOT NULL,
        data_hora TIMESTAMP NOT NULL,
        id_transacao VARCHAR(100),
        email_message_id VARCHAR(998) UNIQUE,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE financeiro_movimentos ALTER COLUMN email_message_id DROP NOT NULL`);
    await client.query(`ALTER TABLE financeiro_movimentos ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'email'`);
    await client.query(`ALTER TABLE financeiro_movimentos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id)`);
    await client.query(`ALTER TABLE financeiro_movimentos ADD COLUMN IF NOT EXISTS prestador_id INTEGER REFERENCES prestadores(id)`);
    await client.query(`ALTER TABLE financeiro_movimentos ADD COLUMN IF NOT EXISTS categoria VARCHAR(20)`);

    // Primeiro administrador — criado SOMENTE quando não existe nenhum usuário
    // no sistema (instalação nova). Antes a checagem era pelo e-mail fixo
    // 'admin@hmengenharia.com', o que significava que apagar ou renomear essa
    // conta fazia o próximo restart recriá-la com a senha de fábrica — uma
    // porta de entrada que reaparecia sozinha.
    //
    // A senha inicial vem de ADMIN_SENHA_INICIAL (.env) ou é sorteada. Em
    // nenhum caso usamos senha fixa em código, e a senha só aparece no log no
    // instante da criação (é a única forma de o primeiro acesso acontecer).
    const algumUsuario = await client.query('SELECT id FROM usuarios LIMIT 1');

    if (algumUsuario.rows.length === 0) {
      const senhaInicial = process.env.ADMIN_SENHA_INICIAL
        || require('crypto').randomBytes(9).toString('base64url');
      const senhaHash = await bcrypt.hash(senhaInicial, 10);
      await client.query(`
        INSERT INTO usuarios (nome, email, senha, role)
        VALUES ('Administrador', $1, $2, 'admin')
      `, [process.env.ADMIN_EMAIL_INICIAL || 'admin@hmengenharia.com', senhaHash]);
      console.log('\n=============================================================');
      console.log(' PRIMEIRO ACESSO — usuário administrador criado');
      console.log(` E-mail: ${process.env.ADMIN_EMAIL_INICIAL || 'admin@hmengenharia.com'}`);
      console.log(` Senha:  ${senhaInicial}`);
      console.log(' TROQUE ESSA SENHA no primeiro login (menu Usuários).');
      console.log('=============================================================\n');
    }

    // Marca que a senha atual é provisória (criada pelo admin ou gerada no
    // primeiro acesso). Enquanto true, o sistema exige a troca logo após o
    // login — quem recebe a senha de outra pessoa nunca continua usando ela.
    await client.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN DEFAULT false`);

    // Índices nas chaves estrangeiras e colunas de filtro/ordenação. Nenhuma
    // tabela tinha índice além da PK: hoje as consultas respondem em poucos
    // milissegundos, mas financeiro_movimentos cresce 3x por dia pela
    // importação automática de e-mail, e proposta_itens é lido a cada abertura
    // de proposta e a cada geração de PDF. Criados com IF NOT EXISTS, então
    // rodar de novo é inofensivo.
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta ON proposta_itens(proposta_id)',
      'CREATE INDEX IF NOT EXISTS idx_proposta_secoes_proposta ON proposta_secoes(proposta_id)',
      'CREATE INDEX IF NOT EXISTS idx_proposta_eventos_proposta ON proposta_eventos(proposta_id)',
      'CREATE INDEX IF NOT EXISTS idx_propostas_sequencial ON propostas(sequencial DESC)',
      'CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON propostas(cliente_id)',
      'CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status)',
      'CREATE INDEX IF NOT EXISTS idx_propostas_data ON propostas(data)',
      'CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON materiais(ativo)',
      'CREATE INDEX IF NOT EXISTS idx_financeiro_data ON financeiro_movimentos(data_hora DESC)',
      'CREATE INDEX IF NOT EXISTS idx_financeiro_prestador ON financeiro_movimentos(prestador_id)',
      'CREATE INDEX IF NOT EXISTS idx_contratos_prestador ON contratos(prestador_id)',
      'CREATE INDEX IF NOT EXISTS idx_analises_atualizado ON analises_projeto(atualizado_em DESC)',
    ];
    for (const sql of indices) await client.query(sql);

    await client.query('COMMIT');
    console.log('Tabelas criadas/verificadas com sucesso');

    // Alerta de senha de fábrica ainda ativa. Instalações antigas foram criadas
    // com 'admin123' fixo; se ninguém trocou, o sistema inteiro está acessível
    // a qualquer pessoa da rede que conheça o padrão. Só avisa — não força nada.
    const contas = await client.query("SELECT nome, email, senha FROM usuarios WHERE ativo = true");
    const comSenhaPadrao = [];
    for (const conta of contas.rows) {
      if (await bcrypt.compare('admin123', conta.senha)) comSenhaPadrao.push(conta.email);
    }
    if (comSenhaPadrao.length > 0) {
      console.warn('\n*************************************************************');
      console.warn(' ATENÇÃO: conta(s) ainda usando a senha padrão "admin123":');
      comSenhaPadrao.forEach(e => console.warn(`   - ${e}`));
      console.warn(' Qualquer pessoa na rede consegue entrar como administrador.');
      console.warn(' Troque agora em: menu Usuários > Redefinir senha.');
      console.warn('*************************************************************\n');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar tabelas:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { criarTabelas };
