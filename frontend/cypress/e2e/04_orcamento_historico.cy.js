// 2.0: o formulário de orçamento é a aba "Nova / editar" do grupo Propostas
// (/propostas?aba=editar, edição em /propostas/editar/:id) e o antigo
// Histórico é a aba "Propostas" (/propostas?aba=lista), primeira do grupo.
function abrirListaDePropostas() {
  cy.get('nav').contains('Propostas').click();
  cy.url().should('include', '/propostas');
  cy.contains('[role=tab]', 'Propostas').click();
  cy.contains('h2', 'Propostas').should('be.visible');
}

describe('Orçamento → lista de propostas (fluxo completo)', () => {
  const clienteNome = `Cypress QA Orçamento ${Date.now()}`;

  // Se um teste do meio falhar, a proposta de teste não fica no banco.
  // Salvar a proposta também cadastra sozinho os itens digitados à mão no
  // catálogo (material "Item Cypress Material" e serviço "Item Cypress
  // Serviço"): desativa os dois pela API (o sistema não apaga de vez itens de
  // catálogo — só desativa).
  after(() => {
    cy.login();
    cy.api({ url: `/api/propostas?busca=${encodeURIComponent(clienteNome)}` }).then(({ body }) => {
      (body.itens || []).filter(p => p.cliente_nome === clienteNome).forEach(p => {
        cy.api({ method: 'DELETE', url: `/api/propostas/${p.id}`, failOnStatusCode: false });
      });
    });
    cy.api({ url: `/api/materiais?busca=${encodeURIComponent('Item Cypress Material')}` }).then(({ body }) => {
      (body.itens || []).filter(m => m.descricao === 'Item Cypress Material').forEach(m => {
        cy.api({ method: 'DELETE', url: `/api/materiais/${m.id}`, failOnStatusCode: false });
      });
    });
    cy.api({ url: '/api/servicos' }).then(({ body }) => {
      (body.itens || []).filter(s => s.descricao === 'Item Cypress Serviço' && s.origem === 'proposta').forEach(s => {
        cy.api({ method: 'PUT', url: `/api/servicos/${encodeURIComponent(s.codigo)}/ativo`, body: { ativo: false }, failOnStatusCode: false });
      });
    });
  });

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
    cy.get('@itemMaterial').closest('div').parent().find('input').eq(2).clear().type('2');
    cy.get('@itemMaterial').closest('div').parent().find('input').eq(4).clear().type('50');

    // Item na seção "Mão de Obra" (2ª seção): 1 x R$ 200,00 = R$ 200,00
    // (linha de mão de obra não tem NCM, então os índices dos campos mudam:
    // 0=descrição, 1=quantidade, 2=unidade, 3=valor unitário)
    cy.get('button:contains("Adicionar item")').eq(1).click();
    cy.get('input[placeholder="Descrição do item"]').last().as('itemServico').type('Item Cypress Serviço');
    cy.get('@itemServico').closest('div').parent().find('input').eq(3).clear().type('200');

    // Imposto sobre vendas 10% dos materiais (100) = 10; imposto sobre serviços 5% da mão de obra (200) = 10
    cy.contains('label', 'Imp. Vendas (%)').next('input').clear().type('10');
    cy.contains('label', 'Imp. Serviços (%)').next('input').clear().type('5');

    // Materiais 100 + Mão de obra 200 = 300; BDI padrão 20% = 60; impostos 10+10; total = 380
    cy.contains(/R\$\s?100,00/).should('be.visible');
    cy.contains(/R\$\s?200,00/).should('be.visible');
    cy.contains(/R\$\s?60,00/).should('be.visible');
    cy.contains(/R\$\s?380,00/).should('be.visible');

    cy.contains('button', 'Salvar Proposta').click();
    cy.contains(/salva com sucesso/i, { timeout: 10000 }).should('be.visible');

    // Após salvar, a proposta continua visível na própria aba Orçamento,
    // com os botões de ação, em vez de sumir/voltar ao formulário vazio.
    cy.contains(/proposta .* salva/i).should('be.visible');
    cy.contains('button', 'Baixar PDF').should('be.visible');
    cy.contains('button', 'Enviar E-mail').should('be.visible');
    cy.contains('button', 'Novo Orçamento').should('be.visible');
    cy.contains('button', 'Salvar Proposta').should('not.exist');
    cy.get('input[placeholder="Nome do cliente"]').should('have.value', clienteNome);
  });

  it('encontra a proposta na lista de propostas, muda o status e baixa o PDF', () => {
    cy.login();
    abrirListaDePropostas();

    cy.get('input[placeholder*="Número, cliente"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 }).should('contain', 'R$').click();

    cy.contains('h3', 'Proposta').should('be.visible');
    cy.contains(clienteNome).should('be.visible');
    cy.contains(/R\$\s?380,00/).should('be.visible');

    cy.contains('button', 'Aprovada').click();
    cy.contains(/status atualizado para Aprovada/i).should('be.visible');

    cy.intercept('GET', '**/propostas/*/pdf').as('baixarPdf');
    cy.contains('button', 'Baixar PDF').click();
    cy.wait('@baixarPdf').its('response.statusCode').should('eq', 200);

    cy.get('h3').contains('Proposta').parent().find('button').click();
  });

  it('edita a proposta pela lista de propostas e confirma que o número não muda', () => {
    cy.login();
    abrirListaDePropostas();
    cy.get('input[placeholder*="Número, cliente"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 }).click();

    cy.contains('h3', 'Proposta').invoke('text').then(texto => {
      const numeroOriginal = texto.replace('Proposta ', '').trim();
      cy.wrap(numeroOriginal).as('numeroOriginal');
    });

    cy.contains('button', 'Editar').click();
    cy.url().should('match', /\/propostas\/editar\/\d+$/);
    cy.get('@numeroOriginal').then(numeroOriginal => {
      cy.contains('h2', `Editando Proposta ${numeroOriginal}`).should('be.visible');
    });

    cy.contains('label', 'Local da obra').next('input').clear().type('Obra de teste Cypress (editada)');
    cy.contains('button', 'Salvar Alterações').click();
    cy.contains(/atualizada com sucesso/i, { timeout: 10000 }).should('be.visible');

    cy.get('@numeroOriginal').then(numeroOriginal => {
      cy.contains(new RegExp(`proposta ${numeroOriginal} salva`, 'i')).should('be.visible');
    });

    abrirListaDePropostas();
    cy.get('input[placeholder*="Número, cliente"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 }).click();
    cy.get('@numeroOriginal').then(numeroOriginal => {
      cy.contains('h3', `Proposta ${numeroOriginal}`).should('be.visible');
    });
    cy.contains('Obra de teste Cypress (editada)').should('be.visible');
  });

  it('remove a proposta de teste e confirma que sumiu da lista', () => {
    cy.login();
    abrirListaDePropostas();
    cy.get('input[placeholder*="Número, cliente"]').type(clienteNome);
    cy.contains('tr', clienteNome, { timeout: 8000 })
      .find('button[title="Excluir"]')
      .click();
    cy.contains(/proposta excluída/i).should('be.visible');
    cy.contains('td', clienteNome).should('not.exist');
  });
});
