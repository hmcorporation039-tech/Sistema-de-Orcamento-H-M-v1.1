describe('Login', () => {
  it('bloqueia acesso a rota protegida sem login e redireciona para /login', () => {
    cy.visit('/orcamento');
    cy.url().should('include', '/login');
  });

  it('mostra erro com credenciais inválidas', () => {
    cy.intercept('POST', '**/auth/login').as('login');
    cy.visit('/login');
    cy.get('input[type=email]').type('admin@hmengenharia.com');
    cy.get('input[type=password]').type('senha-errada-123');
    cy.contains('button', 'Entrar').click();

    cy.wait('@login').then(({ response }) => {
      expect(response.statusCode).to.eq(401);
      expect(response.body.erro).to.match(/e-mail ou senha incorretos/i);
    });
    cy.contains(/e-mail ou senha incorretos/i).should('be.visible');
    cy.url().should('include', '/login');
  });

  it('faz login com credenciais válidas e navega entre as telas', () => {
    cy.login();
    cy.contains('h2', 'Novo Orçamento').should('be.visible');

    // 2.0: o menu tem só os grupos; Materiais, Clientes e o antigo Histórico
    // são a primeira aba de cada grupo.
    cy.get('nav').contains('Base de preços').click();
    cy.url().should('include', '/base-precos');
    cy.contains('h2', 'Materiais').should('be.visible');

    cy.get('nav').contains('Cadastros').click();
    cy.url().should('include', '/cadastros');
    cy.contains('h2', 'Clientes').should('be.visible');

    cy.get('nav').contains('Propostas').click();
    cy.url().should('include', '/propostas');
    cy.contains('h2', 'Propostas').should('be.visible');
  });

  it('faz logout e volta para o login', () => {
    cy.login();
    cy.contains('button', 'Sair').click();
    cy.url().should('include', '/login');
  });
});
