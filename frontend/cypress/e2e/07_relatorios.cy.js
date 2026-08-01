describe('Relatórios', () => {
  it('carrega o período padrão, filtra por status e exporta CSV e PDF', () => {
    cy.login();
    cy.get('nav').contains('Relatórios').click();
    cy.url().should('include', '/relatorios');
    cy.contains('h2', 'Relatórios').should('be.visible');

    cy.contains('Propostas no período').should('be.visible');
    cy.contains('Valor total').should('be.visible');
    cy.contains('Valor aprovado').should('be.visible');

    cy.get('input[type="date"]').eq(0).invoke('val').should('not.be.empty');
    cy.get('input[type="date"]').eq(1).invoke('val').should('not.be.empty');

    // Amplia o período pra garantir que existam propostas listadas
    cy.get('input[type="date"]').eq(0).clear().type('2020-01-01');
    cy.contains('td', /^P\d+/, { timeout: 8000 }).should('be.visible');

    cy.contains('button', 'Exportar CSV').should('not.be.disabled');
    cy.intercept('GET', '**/relatorios/propostas/csv*').as('csv');
    cy.contains('button', 'Exportar CSV').click();
    cy.wait('@csv').its('response.statusCode').should('eq', 200);

    cy.intercept('GET', '**/relatorios/propostas/pdf*').as('pdf');
    cy.contains('button', 'Exportar PDF').click();
    cy.wait('@pdf').its('response.statusCode').should('eq', 200);

    // Filtro por status sem resultado deve mostrar a mensagem de vazio
    cy.get('select').select('Cancelada');
    cy.contains('Nenhuma proposta encontrada no período.', { timeout: 8000 }).should('be.visible');
  });
});
