describe('Dashboard', () => {
  it('carrega os indicadores, troca a janela de tempo e navega a partir das últimas propostas', () => {
    cy.login();
    cy.get('nav').contains('Dashboard').click();
    cy.url().should('include', '/dashboard');
    cy.contains('h2', 'Dashboard').should('be.visible');

    cy.contains('Propostas emitidas').should('be.visible');
    cy.contains('Valor aprovado').should('be.visible');
    cy.contains('Taxa de aprovação').should('be.visible');
    cy.contains('Ticket médio').should('be.visible');
    cy.contains('Cadastros').should('be.visible');

    cy.contains('Propostas por mês').should('be.visible');
    cy.contains('Propostas por status').should('be.visible');
    cy.contains('Top 5 clientes').should('be.visible');
    cy.contains('Itens mais orçados').should('be.visible');
    cy.contains('Últimas propostas').should('be.visible');

    cy.contains('button', '3 meses').click();
    cy.contains('button', '12 meses').click();
    cy.contains('Propostas emitidas').should('be.visible');
  });
});
