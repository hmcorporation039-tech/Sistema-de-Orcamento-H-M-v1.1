describe('Materiais', () => {
  const descricao = `Cypress QA Material ${Date.now()}`;
  const categoria = 'Cypress QA';

  beforeEach(() => {
    cy.login();
    cy.get('nav').contains('Materiais').click();
    cy.url().should('include', '/materiais');
  });

  it('cadastra um novo material com NCM', () => {
    cy.contains('button', 'Novo Material').click();
    cy.get('form').should('be.visible').within(() => {
      cy.get('input').eq(0).type('CYP001');
      cy.get('input').eq(1).type(descricao);
      cy.get('input').eq(2).type(categoria);
      cy.get('select').select('un');
      cy.get('input').eq(3).type('5'); // preço de compra
      cy.get('input').eq(4).type('10'); // preço de venda
      cy.get('input').eq(5).type('Marca Cypress');
      cy.get('input').eq(6).type('8544.42.00'); // NCM
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/material cadastrado/i).should('be.visible');
    cy.contains('td', descricao).should('be.visible');
    cy.contains('td', '8544.42.00').should('be.visible');
  });

  it('filtra por categoria e busca pela descrição', () => {
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('td', descricao, { timeout: 8000 }).should('be.visible');
  });

  it('edita o preço de venda do material', () => {
    cy.get('input[placeholder*="Buscar descrição"]').type(descricao);
    cy.contains('tr', descricao, { timeout: 8000 }).find('button[title="Editar"]').click();
    cy.get('form').should('be.visible').within(() => {
      cy.get('input').eq(4).clear().type('15.90');
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
