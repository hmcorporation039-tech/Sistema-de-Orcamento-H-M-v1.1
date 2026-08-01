describe('Financeiro', () => {
  it('carrega o período padrão, filtra por tipo e nome, e exporta CSV', () => {
    cy.login();
    cy.get('nav').contains('Financeiro').click();
    cy.url().should('include', '/financeiro');
    cy.contains('h2', 'Financeiro').should('be.visible');

    cy.contains('Total recebido').should('be.visible');
    cy.contains('Total realizado').should('be.visible');
    cy.contains('Saldo do período').should('be.visible');

    cy.get('input[type="date"]').eq(0).invoke('val').should('not.be.empty');
    cy.get('input[type="date"]').eq(1).invoke('val').should('not.be.empty');

    // Amplia o período pra garantir que existam movimentos listados
    cy.get('input[type="date"]').eq(0).clear().type('2020-01-01');
    cy.get('table tbody tr', { timeout: 8000 }).should('have.length.greaterThan', 0);

    // Filtro por tipo
    cy.get('select').select('Realizado');
    cy.get('table tbody td').contains('Realizado').should('be.visible');

    cy.get('select').select('Todos');

    cy.contains('button', 'Exportar CSV').should('not.be.disabled');
    cy.intercept('GET', '**/financeiro/movimentos/csv*').as('csv');
    cy.contains('button', 'Exportar CSV').click();
    cy.wait('@csv').its('response.statusCode').should('eq', 200);

    // Busca por nome sem resultado deve mostrar a mensagem de vazio
    cy.get('input[placeholder*="favorecido"]').type('xxxxNomeInexistentexxxx');
    cy.contains('Nenhum movimento encontrado no período.', { timeout: 8000 }).should('be.visible');
  });

  it('cria, edita e exclui um lançamento manual', () => {
    const nomeOriginal = 'Cliente Teste Cypress Financeiro';
    const nomeEditado = 'Cliente Teste Cypress Financeiro Editado';

    cy.login();
    cy.visit('/financeiro');

    cy.contains('button', 'Novo lançamento').click();
    cy.get('input[type="number"]').type('321.50');
    cy.contains('label', 'Nome do favorecido/pagador').parent().find('input').type(nomeOriginal);
    cy.get('input[type="datetime-local"]').type('2025-03-10T10:00');
    cy.contains('button', 'Salvar').click();
    cy.contains('Lançamento cadastrado');

    cy.get('input[type="date"]').eq(0).clear().type('2025-01-01');
    cy.contains('td', nomeOriginal, { timeout: 8000 }).should('be.visible');
    cy.contains('tr', nomeOriginal).contains('E-mail').should('not.exist');

    cy.contains('tr', nomeOriginal).find('button[title="Editar"]').click();
    cy.contains('label', 'Nome do favorecido/pagador').parent().find('input').clear().type(nomeEditado);
    cy.contains('button', 'Salvar').click();
    cy.contains('Lançamento atualizado');
    cy.contains('td', nomeEditado, { timeout: 8000 }).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', nomeEditado).find('button[title="Remover"]').click();
    cy.contains('Lançamento removido');
    cy.contains(nomeEditado).should('not.exist');
  });
});
