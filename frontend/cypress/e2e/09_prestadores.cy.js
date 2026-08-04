describe('Prestadores de Serviços', () => {
  const nome = `Cypress QA Prestador ${Date.now()}`;

  beforeEach(() => {
    cy.login();
    cy.get('nav').contains('Prestadores').click();
    cy.url().should('include', '/prestadores');
  });

  it('cadastra um novo prestador com CPF formatado', () => {
    cy.contains('button', 'Novo Prestador').click();
    cy.contains('label', 'Nome *').parent().find('input').type(nome);
    cy.contains('label', 'CPF').parent().find('input').type('11144477735');
    cy.contains('label', 'CPF').parent().find('input').should('have.value', '111.444.777-35');
    cy.contains('label', 'Telefone').parent().find('input').type('61988887777');
    cy.contains('label', 'Chave Pix').parent().find('input').type('chave-teste@pix.com');
    cy.contains('button', 'Salvar').click();
    cy.contains(/prestador cadastrado/i).should('be.visible');
    cy.contains('td', nome).should('be.visible');
    cy.contains('tr', nome).contains('td', '111.444.777-35').should('be.visible');
  });

  it('busca o prestador cadastrado e mostra total pago zerado', () => {
    cy.get('input[placeholder*="Buscar"]').type(nome);
    cy.contains('tr', nome, { timeout: 8000 }).should('be.visible');
    cy.contains('tr', nome).contains('td', 'R$ 0,00').should('be.visible');
  });

  it('vincula automaticamente um pagamento existente pelo nome e propaga a categoria do prestador', () => {
    const nomeFavorecido = `Cypress QA Favorecido ${Date.now()}`;
    let token;

    cy.login();
    cy.window().then(win => {
      token = win.localStorage.getItem('hm_token');
      return cy.request({
        method: 'POST',
        url: '/api/financeiro/movimentos',
        headers: { Authorization: `Bearer ${token}` },
        body: { tipo: 'realizado', nome: nomeFavorecido, valor: 77.5, dataHora: '2025-06-01T10:00:00.000Z' },
      });
    }).then(movimento => {
      cy.visit('/prestadores');
      cy.contains('button', 'Novo Prestador').click();
      cy.contains('label', 'Nome *').parent().find('input').type(nomeFavorecido);
      cy.contains('label', 'Categoria').parent().find('select').select('Mão de obra');
      cy.contains('button', 'Salvar').click();
      cy.contains(/prestador cadastrado/i).should('be.visible');

      cy.contains('tr', nomeFavorecido, { timeout: 8000 }).contains('Mão de obra: R$ 77,50').should('be.visible');

      cy.request({
        url: `/api/financeiro/movimentos?dataInicio=2020-01-01&dataFim=2030-01-01&busca=${encodeURIComponent(nomeFavorecido)}`,
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        expect(res.body.movimentos.length).to.eq(1);
        expect(res.body.movimentos[0].categoria).to.eq('mao_de_obra');
        expect(res.body.movimentos[0].prestador_nome).to.eq(nomeFavorecido);

        cy.contains('tr', nomeFavorecido).find('button[title="Remover"]').click();
        cy.contains(/prestador removido/i);
        cy.request({ method: 'DELETE', url: `/api/financeiro/movimentos/${movimento.body.id}`, headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false });
      });
    });
  });

  it('edita o telefone do prestador', () => {
    cy.get('input[placeholder*="Buscar"]').type(nome);
    cy.contains('tr', nome, { timeout: 8000 }).find('button[title="Editar"]').click();
    cy.contains('label', 'Telefone').parent().find('input').clear().type('61999998888');
    cy.contains('button', 'Salvar').click();
    cy.contains(/prestador atualizado/i).should('be.visible');
  });

  it('bloqueia CPF invalido', () => {
    cy.contains('button', 'Novo Prestador').click();
    cy.contains('label', 'Nome *').parent().find('input').type('Cypress QA CPF Invalido');
    cy.contains('label', 'CPF').parent().find('input').type('11144477700');
    cy.contains('button', 'Salvar').click();
    cy.contains('CPF inválido').should('be.visible');
    cy.contains('button', 'Cancelar').click();
  });

  it('remove o prestador de teste', () => {
    cy.get('input[placeholder*="Buscar"]').type(nome);
    cy.contains('tr', nome, { timeout: 8000 }).find('button[title="Remover"]').click();
    cy.contains(/prestador removido/i).should('be.visible');
    cy.contains('td', nome).should('not.exist');
  });

  it('cadastra prestador com categoria e filtra a lista por categoria', () => {
    const nomeCategoria = `Cypress QA Categoria ${Date.now()}`;

    cy.contains('button', 'Novo Prestador').click();
    cy.contains('label', 'Nome *').parent().find('input').type(nomeCategoria);
    cy.contains('label', 'Categoria').parent().find('select').select('Mão de obra');
    cy.contains('button', 'Salvar').click();
    cy.contains(/prestador cadastrado/i);

    cy.get('input[placeholder*="Buscar"]').type(nomeCategoria);
    cy.contains('tr', nomeCategoria, { timeout: 8000 }).contains('Mão de obra').should('be.visible');

    cy.get('input[placeholder*="Buscar"]').clear();
    cy.get('select').first().select('Mão de obra');
    cy.contains('td', nomeCategoria, { timeout: 8000 }).should('be.visible');
    cy.get('select').first().select('Despesa diária');
    cy.contains('td', nomeCategoria).should('not.exist');
    cy.get('select').first().select('Todas as categorias');

    cy.get('input[placeholder*="Buscar"]').type(nomeCategoria);
    cy.contains('tr', nomeCategoria, { timeout: 8000 }).find('button[title="Remover"]').click();
    cy.contains(/prestador removido/i);
  });

  it('cadastra prestador Pessoa Jurídica com CNPJ formatado e valida CNPJ inválido', () => {
    const nomePJ = `Cypress QA Empresa ${Date.now()} LTDA`;

    cy.contains('button', 'Novo Prestador').click();
    cy.contains('label', 'Nome *').parent().find('input').type(nomePJ);
    cy.contains('label', 'Tipo').parent().find('select').select('Pessoa Jurídica');
    cy.contains('label', 'CNPJ').parent().find('input').type('11222333000181');
    cy.contains('label', 'CNPJ').parent().find('input').should('have.value', '11.222.333/0001-81');
    cy.contains('button', 'Salvar').click();
    cy.contains(/prestador cadastrado/i).should('be.visible');

    cy.get('input[placeholder*="Buscar"]').type(nomePJ);
    cy.contains('tr', nomePJ, { timeout: 8000 }).contains('td', 'PJ').should('be.visible');
    cy.contains('tr', nomePJ).contains('td', '11.222.333/0001-81').should('be.visible');

    cy.contains('tr', nomePJ).find('button[title="Remover"]').click();
    cy.contains(/prestador removido/i);

    cy.contains('button', 'Novo Prestador').click();
    cy.contains('label', 'Nome *').parent().find('input').type('Cypress QA CNPJ Invalido');
    cy.contains('label', 'Tipo').parent().find('select').select('Pessoa Jurídica');
    cy.contains('label', 'CNPJ').parent().find('input').type('11222333000100');
    cy.contains('button', 'Salvar').click();
    cy.contains('CNPJ inválido').should('be.visible');
    cy.contains('button', 'Cancelar').click();
  });
});
