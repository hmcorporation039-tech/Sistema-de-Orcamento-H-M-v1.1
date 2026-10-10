describe('Materiais', () => {
  const descricao = `Cypress QA Material ${Date.now()}`;
  const campo = (rotulo) => cy.contains('label', rotulo).parent();

  beforeEach(() => {
    cy.login();
    cy.get('nav').contains('Materiais').click();
    cy.url().should('include', '/materiais');
  });

  it('cadastra um novo material com NCM', () => {
    cy.contains('button', 'Novo Material').click();
    cy.get('form').should('be.visible').within(() => {
      campo('Código').find('input').type('CYP001');
      campo('Descrição *').find('input').type(descricao);
      campo('Categoria *').find('select').select('Elétrica');
      campo('Unidade *').find('select').select('un');
      campo('Preço Compra (R$)').find('input').type('5');
      campo('Preço Venda (R$) *').find('input').type('10');
      campo('Marca').find('input').type('Marca Cypress');
      campo('NCM/SH').find('input').type('8544.42.00');
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/material cadastrado/i).should('be.visible');
    // O catálogo tem centenas de itens paginados — busca pelo novo antes de conferir.
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('td', descricao, { timeout: 8000 }).should('be.visible');
    cy.contains('tr', descricao).contains('td', '8544.42.00').should('be.visible');
  });

  it('filtra por categoria e busca pela descrição', () => {
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('td', descricao, { timeout: 8000 }).should('be.visible');
  });

  it('edita o preço de venda do material', () => {
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('tr', descricao, { timeout: 8000 }).find('button[title="Editar"]').click();
    cy.get('form').should('be.visible').within(() => {
      campo('Preço Venda (R$) *').find('input').clear().type('15.90');
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/material atualizado/i).should('be.visible');
    cy.contains('tr', descricao).contains('R$').should('be.visible');
  });

  it('remove o material de teste', () => {
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('tr', descricao, { timeout: 8000 }).find('button[title="Remover"]').click();
    cy.contains(/material removido/i).should('be.visible');
    cy.contains('td', descricao).should('not.exist');
  });
});
