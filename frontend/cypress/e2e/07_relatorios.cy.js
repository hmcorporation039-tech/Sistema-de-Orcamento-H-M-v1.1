// 2.0: o antigo Relatórios foi juntado à lista de propostas (grupo Propostas,
// aba "Propostas"): o mesmo filtro de período/status, os totais e a exportação
// CSV/PDF. /relatorios redireciona para /propostas?aba=lista. Sem datas a
// lista mostra todo o histórico; com datas, só o período.
describe('Relatórios (lista de propostas)', () => {
  it('carrega o período padrão, filtra por status e exporta CSV e PDF', () => {
    cy.login();
    cy.visit('/relatorios');
    cy.url().should('include', '/propostas?aba=lista');
    cy.contains('h2', 'Propostas').should('be.visible');

    // padrão: todo o histórico (datas vazias)
    cy.contains('Propostas (todo o histórico)').should('be.visible');
    cy.contains('Valor total').should('be.visible');
    cy.contains('Valor aprovado').should('be.visible');
    cy.contains('label', 'Data início').parent().find('input[type="date"]').should('have.value', '');
    cy.contains('label', 'Data fim').parent().find('input[type="date"]').should('have.value', '');

    // atalho de período preenche as duas datas
    cy.contains('button', 'Este ano').click();
    cy.contains('label', 'Data início').parent().find('input[type="date"]').invoke('val').should('not.be.empty');
    cy.contains('label', 'Data fim').parent().find('input[type="date"]').invoke('val').should('not.be.empty');
    cy.contains('Propostas no período').should('be.visible');

    // Amplia o período pra garantir que existam propostas listadas
    cy.contains('label', 'Data início').parent().find('input[type="date"]').clear().type('2020-01-01');
    cy.contains('td', /^P\d+/, { timeout: 8000 }).should('be.visible');

    cy.contains('button', 'Exportar CSV').should('not.be.disabled');
    cy.intercept('GET', '**/relatorios/propostas/csv*').as('csv');
    cy.contains('button', 'Exportar CSV').click();
    cy.wait('@csv').its('response.statusCode').should('eq', 200);

    cy.intercept('GET', '**/relatorios/propostas/pdf*').as('pdf');
    cy.contains('button', 'Exportar PDF').click();
    cy.wait('@pdf').its('response.statusCode').should('eq', 200);

    // Filtro por status sem resultado deve mostrar a mensagem de vazio
    // (o banco de teste não tem proposta cancelada)
    cy.contains('label', 'Status').parent().find('select').select('Cancelada');
    cy.contains('Nenhuma proposta encontrada no período.', { timeout: 8000 }).should('be.visible');
  });
});
