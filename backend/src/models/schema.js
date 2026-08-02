const pool = require('../config/database');
const bcrypt = require('bcryptjs');

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

    // Criar admin padrão se não existir
    const adminExiste = await client.query(
      "SELECT id FROM usuarios WHERE email = 'admin@hmengenharia.com'"
    );

    if (adminExiste.rows.length === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO usuarios (nome, email, senha, role)
        VALUES ('Administrador', 'admin@hmengenharia.com', $1, 'admin')
      `, [senhaHash]);
      console.log('Usuário admin criado: admin@hmengenharia.com / admin123');
    }

    await client.query('COMMIT');
    console.log('Tabelas criadas/verificadas com sucesso');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar tabelas:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { criarTabelas };
