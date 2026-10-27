// Grupo Obras → abas "Projetos por disciplina" (/obras?aba=projetos) e
// "Laudos" (/obras?aba=laudos). Versão 2.1: projeto e laudo são registros
// separados — o projeto gera os documentos de projeto, as entregas e o
// orçamento de execução; o laudo gera os documentos de laudo e o orçamento de
// inspeção. A rota antiga /analise-projeto?aba=laudos continua levando aos laudos,
// e um link antigo ?aba=laudos&laudo=ID de um PROJETO vai para a aba certa.
//
// Cada teste cria o registro a partir do exemplo (e alguns geram a proposta);
// o after() apaga tudo o que foi criado, para não deixar sujeira no banco.
describe('Projetos e laudos por disciplina', () => {
  const registrosCriados = [];
  const propostasCriadas = [];

  function novoDoExemplo(tipoEsperado) {
    cy.intercept('POST', '/api/laudos').as('criar');
    cy.contains('button', 'Novo a partir do exemplo').click();
    return cy.wait('@criar').then(({ response }) => {
      expect(response.statusCode).to.eq(201);
      expect(response.body.tipo).to.eq(tipoEsperado);
      registrosCriados.push(response.body.id);
      return response.body.id;
    });
  }

  // o botão é "Gerar orçamento e abrir no editor — <modo>" e a proposta abre
  // no editor do grupo Propostas (/propostas/editar/:id)
  function gerarOrcamento(modo) {
    cy.contains('button', `Gerar orçamento e abrir no editor — ${modo}`).click();
    cy.url({ timeout: 20000 }).should('match', /\/propostas\/editar\/\d+/);
    return cy.location('pathname').then(caminho => {
      propostasCriadas.push(Number(caminho.match(/\/propostas\/editar\/(\d+)/)[1]));
    });
  }

  after(() => {
    cy.login();
    propostasCriadas.forEach(id => cy.api({ method: 'DELETE', url: `/api/propostas/${id}`, failOnStatusCode: false }));
    registrosCriados.forEach(id => cy.api({ method: 'DELETE', url: `/api/laudos/${id}`, failOnStatusCode: false }));
  });

  describe('Laudos', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/analise-projeto?aba=laudos');
      cy.url().should('include', '/obras?aba=laudos');
    });

    it('mostra as 17 disciplinas, todas prontas, e deixa claro que análise não gera laudo', () => {
      cy.contains('h3', 'Laudos').should('be.visible');
      cy.contains('Análise de projeto não gera laudo').should('be.visible');
      cy.get('select').first().find('option').should('have.length', 17);
      cy.get('select').first().find('option').each(op => expect(op.text()).not.to.contain('em preparação'));
      cy.get('select').first().find('option').then(ops => {
        const valores = [...ops].map(o => o.value);
        ['spda', 'cftv', 'automacao', 'solar', 'pressurizacao'].forEach(d => expect(valores).to.include(d));
      });
      cy.get('select').first().select('cftv');
      cy.contains('button', 'Novo laudo').should('be.visible');
      cy.contains('ainda está em preparação').should('not.exist');
    });

    it('automação: exemplo do edifício comercial calcula lista de pontos e classe de eficiência', () => {
      cy.get('select').first().select('automacao');
      novoDoExemplo('laudo');
      cy.contains('3. Equipamentos supervisionados (BMS)').should('be.visible');
      cy.contains('button', 'Calcular').click();
      cy.contains('Pontos físicos').should('be.visible');
      cy.contains('D → B').should('be.visible');
      cy.contains('Lista de pontos (por equipamento)').should('be.visible');
    });

    it('laudo: só documentos de laudo, pasta e "só laudo" sem orçamento', () => {
      cy.get('select').first().select('cftv');
      novoDoExemplo('laudo');
      cy.contains('span', 'LAUDO').should('be.visible');
      cy.contains('button', 'Laudo de vistoria do CFTV').should('be.visible');
      cy.contains('button', 'Memorial do sistema de CFTV').should('not.exist');
      cy.contains('Entregas do projeto').should('not.exist');
      cy.contains('Desenhos (AutoCAD').should('not.exist');
      cy.contains('button', 'Instalação do CFTV').should('not.exist');
      cy.contains('Checklist de inspeção').should('exist');
      // a lista de laudos fica em cima do formulário e o painel da pasta
      // pode nascer abaixo da dobra — rola até ele antes de conferir
      cy.contains('Pasta dos arquivos').scrollIntoView().should('be.visible');
      cy.intercept('POST', '/api/laudos/*/salvar-documentos').as('salvarDocs');
      cy.contains('button', 'Salvar documentos na pasta').click();
      cy.wait('@salvarDocs', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
      cy.contains('documento(s) salvos na pasta do laudo').should('be.visible');
      cy.contains('label', 'Gerar orçamento (inspeção/correção)').find('input').uncheck();
      cy.contains('Só laudo — os documentos são emitidos sem orçamento.').should('be.visible');
      cy.contains('button', 'Gerar orçamento').should('not.exist');
      cy.contains('Pasta dos arquivos').click();
      cy.contains('Laudo de vistoria do CFTV.docx').should('be.visible');
      cy.screenshot('laudos-pasta', { capture: 'viewport' });
    });

    it('SPDA: cria do exemplo, calcula, salva, gera o laudo e o orçamento de inspeção', () => {
      novoDoExemplo('laudo');
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

      // documentos: laudo e análise de risco (serve aos dois); memorial é de projeto
      cy.contains('button', 'Relatório de análise de risco').should('be.visible');
      cy.contains('button', 'Memorial descritivo e de cálculo').should('not.exist');
      cy.intercept('GET', '/api/laudos/*/documento/laudo').as('laudo');
      cy.contains('button', 'Laudo de inspeção').click();
      cy.wait('@laudo', { timeout: 60000 }).its('response.statusCode').should('eq', 200);

      // orçamento de inspeção abre no editor de propostas
      gerarOrcamento('Inspeção e laudo');
      cy.get('textarea').filter((_, el) => el.value.includes('Inspeção do SPDA')).should('have.length.at.least', 1);
      cy.contains('Voltar ao laudo').should('be.visible');
      cy.screenshot('laudos-orcamento', { capture: 'viewport' });
    });
  });

  describe('Projetos por disciplina', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/obras?aba=projetos');
      cy.contains('h3', 'Projetos por disciplina').should('be.visible');
    });

    it('usina solar (formulário genérico): projeto do exemplo, cálculo, memorial, orçamento de execução', () => {
      cy.get('select').first().select('solar');
      novoDoExemplo('projeto');
      cy.contains('span', 'PROJETO').should('be.visible');
      cy.get('input[value="CLIENTE EXEMPLO"]').should('exist');
      // seções de inspeção ficam no laudo
      cy.contains('seções de inspeção').should('be.visible');
      cy.contains('Checklist de inspeção').should('not.exist');
      cy.contains('button', 'Relatório de comissionamento').should('not.exist');

      cy.contains('button', 'Calcular').click();
      cy.contains('Potência do gerador').should('be.visible');
      cy.contains('6,05 kWp').should('be.visible');
      cy.contains('6 + 5').should('be.visible');
      cy.screenshot('projetos-solar-resultado', { capture: 'viewport' });

      cy.intercept('GET', '/api/laudos/*/documento/memorial').as('memorial');
      cy.contains('button', 'Memorial descritivo da usina').click();
      cy.wait('@memorial', { timeout: 60000 }).its('response.statusCode').should('eq', 200);

      cy.contains('button', 'Comissionamento / inspeção').should('not.exist');
      gerarOrcamento('Instalação da usina');
      cy.get('textarea').filter((_, el) => el.value.includes('usina solar fotovoltaica')).should('have.length.at.least', 1);
      cy.contains('Voltar ao projeto').should('be.visible');
    });

    it('entregas: DXF rotulado como DXF, as-built e ZIP com definições técnicas e PDF', () => {
      cy.get('select').first().select('solar');
      novoDoExemplo('projeto');
      cy.get('[data-testid=entregas-projeto]').within(() => {
        cy.contains('label', 'DXF (abre no AutoCAD; DWG não é gerado)').find('input').should('be.disabled');
        cy.contains('label', 'QElectroTech (.qet)').find('input').should('be.disabled');
        cy.contains('label', 'Definições técnicas').find('input').should('be.checked');
        cy.contains('label', 'PDF').find('input').should('be.checked');
        cy.contains('label', 'As-built').find('input').check();
        cy.contains('AS BUILT').should('be.visible');
      });
      cy.intercept('POST', '/api/laudos/*/entrega*').as('entrega');
      cy.contains('button', 'Baixar entrega (ZIP)').click();
      cy.wait('@entrega', { timeout: 180000 }).then(({ response }) => {
        expect(response.statusCode).to.eq(200);
        expect(response.headers['content-type']).to.include('application/zip');
        const arquivos = decodeURIComponent(response.headers['x-arquivos']);
        expect(arquivos).to.include('AS BUILT - Memorial descritivo da usina.docx');
        expect(arquivos).to.include('AS BUILT - Folha de entrega.pdf');
      });
      cy.screenshot('projetos-entregas', { capture: 'viewport' });
    });

    it('link antigo ?aba=laudos&laudo=ID de um projeto abre na aba Projetos por disciplina', () => {
      cy.get('select').first().select('cftv');
      novoDoExemplo('projeto').then(id => {
        cy.visit(`/obras?aba=laudos&laudo=${id}`);
        cy.location('search').should('include', 'aba=projetos');
        cy.contains('[role=tab]', 'Projetos por disciplina').should('have.attr', 'aria-selected', 'true');
        cy.contains('span', 'PROJETO').should('be.visible');
        cy.contains('Entregas do projeto').should('be.visible');
      });
    });
  });
});
