describe('Orçamento → Histórico (fluxo completo)', () => {
  const clienteNome = `Cypress QA Orçamento ${Date.now()}`;

  it('monta um orçamento com materiais e mão de obra, calcula os totais e salva', () => {
    cy.login();
    cy.contains('h2', 'Novo Orçamento').should('be.visible');

    cy.get('input[placeholder="Nome do cliente"]').type(clienteNome);
    cy.get('input[placeholder="Instalação, Manutenção..."]').type('Instalação Cypress');
    cy.get('input[placeholder="Pequeno, Médio, Grande"]').type('Pequeno');
    cy.contains('label', 'Local da obra').next('input').type('Obra de teste Cypress');

    // Item na seção "Materiais" (1ª seção): 2 x R$ 50,00 = R$ 100,00
    cy.get('button:contains("Adicionar item")').eq(0).click();
    cy.get('input[placeholder="Descrição do item"]').last().as('itemMaterial').type('Item Cypress Material');
    cy.get('@itemMaterial').closest('div').find('input').eq(2).clear().type('2');
    cy.get('@itemMaterial').closest('div').find('input').eq(4).clear().type('50');

    // Item na seção "Mão de Obra" (2ª seção): 1 x R$ 200,00 = R$ 200,00
    cy.get('button:contains("Adicionar item")').eq(1).click();
    cy.get('input[placeholder="Descrição do item"]').last().as('itemServico').type('Item Cypress Serviço');
    cy.get('@itemServico').closest('div').find('input').eq(4).clear().type('200');

    // Materiais 100 + Mão de obra 200 = 300; BDI padrão 20% = 60; total = 360
    cy.contains(/R\$\s?100,00/).should('be.visible');
    cy.contains(/R\$\s?200,00/).should('be.visible');
    cy.contains(/R\$\s?60,00/).should('be.visible');
    cy.contains(/R\$\s?360,00/).should('be.visible');

    cy.contains('button', 'Salvar Proposta').click();
    cy.contains(/salva com sucesso/i, { timeout: 10000 }).should('be.visible');
  });

  it('encontra a proposta no Histórico, muda o status e baixa o PDF', () => {
    cy.login();
    cy.get('nav').contains('Histórico').click();
    cy.url().should('include', '/historico');

    cy.get('input[placeholder*="Buscar por número"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 }).should('contain', 'R$').click();

    cy.contains('h3', 'Proposta').should('be.visible');
    cy.contains(clienteNome).should('be.visible');
    cy.contains(/R\$\s?360,00/).should('be.visible');

    cy.contains('button', 'Aprovada').click();
    cy.contains(/status atualizado para Aprovada/i).should('be.visible');

    cy.intercept('GET', '**/propostas/*/pdf').as('baixarPdf');
    cy.contains('button', 'Baixar PDF').click();
    cy.wait('@baixarPdf').its('response.statusCode').should('eq', 200);

    cy.get('h3').contains('Proposta').parent().find('button').click();
  });

  it('remove a proposta de teste e confirma que sumiu da lista', () => {
    cy.login();
    cy.get('nav').contains('Histórico').click();
    cy.get('input[placeholder*="Buscar por número"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 })
      .find('button[title="Excluir"]')
      .click();
    cy.contains(/proposta excluída/i).should('be.visible');
    cy.contains('td', clienteNome).should('not.exist');
  });
});
