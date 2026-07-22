Cypress.Commands.add('login', (email = Cypress.env('adminEmail') || 'admin@hmengenharia.com', senha = Cypress.env('adminSenha')) => {
  cy.visit('/login');
  cy.get('input[type=email]').type(email);
  cy.get('input[type=password]').type(senha);
  cy.contains('button', 'Entrar').click();
  cy.url().should('include', '/orcamento');
});
