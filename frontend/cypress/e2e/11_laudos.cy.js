// Aba Análise de Projeto → Laudos e projetos por disciplina
describe('Laudos e projetos por disciplina', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/analise-projeto?aba=laudos');
  });

  it('mostra as 8 disciplinas, todas prontas', () => {
    cy.contains('Laudos e projetos por disciplina').should('be.visible');
    cy.get('select').first().find('option').should('have.length', 8);
    cy.get('select').first().find('option').each(op => expect(op.text()).not.to.contain('em preparação'));
    cy.get('select').first().select('cftv');
    cy.contains('button', 'Novo a partir do exemplo').should('be.visible');
    cy.contains('ainda está em preparação').should('not.exist');
  });

  it('automação: exemplo do edifício comercial calcula lista de pontos e classe de eficiência', () => {
    cy.get('select').first().select('automacao');
    cy.intercept('POST', '/api/laudos').as('criar');
    cy.contains('button', 'Novo a partir do exemplo').click();
    cy.wait('@criar').its('response.statusCode').should('eq', 201);
    cy.contains('3. Equipamentos supervisionados (BMS)').should('be.visible');
    cy.contains('button', 'Calcular').click();
    cy.contains('Pontos físicos').should('be.visible');
    cy.contains('D → B').should('be.visible');
    cy.contains('Lista de pontos (por equipamento)').should('be.visible');
  });

  it('pasta do laudo: salva os documentos e permite emitir só o laudo', () => {
    cy.get('select').first().select('cftv');
    cy.intercept('POST', '/api/laudos').as('criar');
    cy.contains('button', 'Novo a partir do exemplo').click();
    cy.wait('@criar');
    cy.contains('Pasta dos arquivos').should('be.visible');
    cy.intercept('POST', '/api/laudos/*/salvar-documentos').as('salvarDocs');
    cy.contains('button', 'Salvar documentos na pasta').click();
    cy.wait('@salvarDocs', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
    cy.contains('documento(s) salvos na pasta do laudo').should('be.visible');
    cy.contains('label', 'Gerar orçamento de material').find('input').uncheck();
    cy.contains('Só laudo — os documentos são emitidos sem orçamento.').should('be.visible');
    cy.contains('button', 'Gerar orçamento —').should('not.exist');
    cy.contains('Pasta dos arquivos').click();
    cy.contains('Laudo de vistoria do CFTV.docx').should('be.visible');
    cy.screenshot('laudos-pasta', { capture: 'viewport' });
  });

  it('usina solar (formulário genérico): exemplo, cálculo, documento e orçamento', () => {
    cy.get('select').first().select('solar');
    cy.intercept('POST', '/api/laudos').as('criar');
    cy.contains('button', 'Novo a partir do exemplo').click();
    cy.wait('@criar').its('response.statusCode').should('eq', 201);
    cy.get('input[value="CLIENTE EXEMPLO"]').should('exist');

    cy.contains('button', 'Calcular').click();
    cy.contains('Potência do gerador').should('be.visible');
    cy.contains('6,05 kWp').should('be.visible');
    cy.contains('6 + 5').should('be.visible');
    cy.screenshot('laudos-solar-resultado', { capture: 'viewport' });

    cy.intercept('GET', '/api/laudos/*/documento/memorial').as('memorial');
    cy.contains('button', 'Memorial descritivo da usina').click();
    cy.wait('@memorial', { timeout: 60000 }).its('response.statusCode').should('eq', 200);

    cy.contains('button', 'Gerar orçamento — Instalação da usina').click();
    cy.url({ timeout: 20000 }).should('match', /\/orcamento\/\d+/);
    cy.get('textarea').filter((_, el) => el.value.includes('usina solar fotovoltaica')).should('have.length.at.least', 1);
  });

  it('cria um laudo do exemplo, calcula, salva, gera documento e orçamento', () => {
    cy.intercept('POST', '/api/laudos').as('criar');
    cy.contains('button', 'Novo a partir do exemplo').click();
    cy.wait('@criar').its('response.statusCode').should('eq', 201);
    cy.contains('1. Identificação').should('be.visible');
    cy.get('input[value="HOSPITAL EXEMPLO S/A"]').should('exist');

    // cálculo bate com o laudo de referência
    cy.contains('button', 'Calcular').click();
    cy.contains('Risco R1').should('be.visible');
    cy.contains('3,31e-05').should('be.visible');
    cy.contains('Menor solução que atende').should('be.visible');
    cy.screenshot('laudos-resultado', { capture: 'viewport' });

    // edição + salvamento automático
    cy.contains('button', '2. Estrutura').click();
    cy.contains('label', 'Comprimento L (m)').parent().find('input').clear().type('86').blur();
    cy.contains('Salvo às', { timeout: 10000 }).should('be.visible');

    // documento (Word) é gerado pelo backend
    cy.intercept('GET', '/api/laudos/*/documento/laudo').as('laudo');
    cy.contains('button', 'Laudo de inspeção').click();
    cy.wait('@laudo', { timeout: 60000 }).its('response.statusCode').should('eq', 200);

    // orçamento de inspeção abre na tela de Orçamento
    cy.contains('button', 'Gerar orçamento — Inspeção e laudo').click();
    cy.url({ timeout: 20000 }).should('match', /\/orcamento\/\d+/);
    cy.get('textarea').filter((_, el) => el.value.includes('Inspeção do SPDA')).should('have.length.at.least', 1);
    cy.screenshot('laudos-orcamento', { capture: 'viewport' });
  });
});
