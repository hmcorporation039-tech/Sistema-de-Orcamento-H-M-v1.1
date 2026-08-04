describe('Contratos de Prestação de Serviço', () => {
  const nomePrestador = `Cypress QA Prestador Contrato ${Date.now()}`;
  let prestadorId;

  before(() => {
    cy.login();
    cy.window().then(win => {
      const token = win.localStorage.getItem('hm_token');
      return cy.request({
        method: 'POST',
        url: '/api/prestadores',
        headers: { Authorization: `Bearer ${token}` },
        body: { nome: nomePrestador, tipo: 'Pessoa Física', documento: '11144477735' },
      });
    }).then(res => { prestadorId = res.body.id; });
  });

  after(() => {
    cy.window().then(win => {
      const token = win.localStorage.getItem('hm_token');
      cy.request({
        method: 'DELETE',
        url: `/api/prestadores/${prestadorId}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      });
    });
  });

  beforeEach(() => {
    cy.login();
    cy.get('nav').contains('Contratos').click();
    cy.url().should('include', '/contratos');
  });

  it('gera um contrato de prestação de serviço em PDF e lista no histórico', () => {
    cy.contains('button', 'Novo Contrato').click();
    cy.contains('label', 'Prestador *').parent().find('select').select(String(prestadorId));
    cy.contains('label', 'Objeto do contrato').parent().find('textarea').type('instalação de infraestrutura elétrica de teste');
    cy.contains('label', 'Local da obra').parent().find('input').type('Obra Cypress QA');
    cy.contains('label', 'Início *').parent().find('input').type('2026-09-01');
    cy.contains('label', 'Término *').parent().find('input').type('2026-09-10');
    cy.contains('label', 'Valor (R$) *').parent().find('input').type('1500');

    cy.intercept('POST', '**/contratos').as('criarContrato');
    cy.intercept('GET', '**/contratos/*/pdf').as('gerarPdf');
    cy.contains('button', 'Gerar Contrato').click();
    cy.wait('@criarContrato').its('response.statusCode').should('eq', 201);
    cy.contains('Contrato gerado').should('be.visible');
    cy.wait('@gerarPdf').its('response.statusCode').should('eq', 200);

    cy.contains('td', nomePrestador, { timeout: 8000 }).should('be.visible');
    cy.contains('tr', nomePrestador).contains('td', 'Obra Cypress QA').should('be.visible');
    cy.contains('tr', nomePrestador).contains('td', 'R$ 1.500,00').should('be.visible');
  });

  it('busca o contrato gerado e remove', () => {
    cy.get('input[placeholder*="Buscar"]').type(nomePrestador);
    cy.contains('tr', nomePrestador, { timeout: 8000 }).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', nomePrestador).find('button[title="Remover"]').click();
    cy.contains('Contrato removido');
    cy.contains('td', nomePrestador).should('not.exist');
  });

  it('valida campos obrigatorios ao tentar gerar contrato incompleto', () => {
    cy.contains('button', 'Novo Contrato').click();
    cy.contains('button', 'Gerar Contrato').click();
    cy.contains('Selecione o prestador').should('be.visible');
    cy.contains('button', 'Cancelar').click();
  });
});
