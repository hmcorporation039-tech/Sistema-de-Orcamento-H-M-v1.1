describe('Usuários (admin)', () => {
  const nome = `Cypress QA Usuario ${Date.now()}`;
  const email = `cypress.qa.${Date.now()}@hmengenharia.com`;

  it('acessa a tela de usuários pelo menu (só aparece para admin)', () => {
    cy.login();
    cy.get('nav').contains('Usuários').should('be.visible').click();
    cy.url().should('include', '/usuarios');
    cy.contains('h2', 'Usuários').should('be.visible');
  });

  it('cadastra um novo usuário', () => {
    cy.login();
    cy.visit('/usuarios');
    cy.contains('button', 'Novo Usuário').click();
    cy.get('form').within(() => {
      cy.get('input').eq(0).type(nome);
      cy.get('input[type=email]').type(email);
      cy.get('input[type=text]').last().type('senhaQA123');
      cy.get('select').select('user');
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/usuário cadastrado/i).should('be.visible');
    cy.contains('td', nome).should('be.visible');
  });

  it('edita o nome do usuário', () => {
    cy.login();
    cy.visit('/usuarios');
    cy.contains('tr', email, { timeout: 8000 }).find('button[title="Editar"]').click();
    cy.get('form').within(() => {
      cy.get('input').eq(0).clear().type(`${nome} Editado`);
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/usuário atualizado/i).should('be.visible');
    cy.contains('td', `${nome} Editado`).should('be.visible');
  });

  it('redefine a senha do usuário', () => {
    cy.login();
    cy.visit('/usuarios');
    cy.contains('tr', email, { timeout: 8000 }).find('button[title="Redefinir senha"]').click();
    cy.get('input[type=text]').last().type('novaSenhaQA456');
    cy.contains('button', 'Redefinir').click();
    cy.contains(/senha de .* redefinida/i).should('be.visible');
  });

  it('desativa e reativa o usuário', () => {
    cy.login();
    cy.visit('/usuarios');
    cy.contains('tr', email, { timeout: 8000 }).contains('button', 'Desativar').click();
    cy.contains(/usuário desativado/i).should('be.visible');
    cy.contains('tr', email).contains('Desativado').should('be.visible');

    cy.contains('tr', email).contains('button', 'Reativar').click();
    cy.contains(/usuário reativado/i).should('be.visible');
    cy.contains('tr', email).contains('Ativo').should('be.visible');
  });

  it('usuário comum não acessa a tela de usuários', () => {
    cy.login(email, 'novaSenhaQA456');
    cy.visit('/usuarios');
    cy.url().should('include', '/dashboard');
  });

  it('exclui o usuário de teste e confirma que sumiu da lista', () => {
    cy.login();
    cy.visit('/usuarios');
    cy.contains('tr', email, { timeout: 8000 }).find('button[title="Excluir"]').click();
    cy.contains(/usuário excluído/i).should('be.visible');
    cy.contains('td', email).should('not.exist');
  });
});
