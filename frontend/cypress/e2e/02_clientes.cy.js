describe('Clientes', () => {
  const nome = `Cypress QA Cliente ${Date.now()}`;

  beforeEach(() => {
    cy.login();
    cy.get('nav').contains('Clientes').click();
    cy.url().should('include', '/clientes');
  });

  it('cadastra um novo cliente', () => {
    cy.contains('button', 'Novo Cliente').click();
    cy.get('form').should('be.visible').within(() => {
      cy.get('input').eq(0).type(nome);
      cy.get('input').eq(1).type('11.222.333/0001-81');
      cy.get('input').eq(2).type('Responsável Cypress');
      cy.get('input').eq(3).type('61999999999');
      cy.get('input').eq(4).type('cypress@teste.com');
      cy.get('textarea').type('Endereço de teste gerado pelo Cypress');
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/cliente cadastrado/i).should('be.visible');
    cy.contains('td', nome).should('be.visible');
  });

  it('busca o cliente cadastrado', () => {
    cy.get('input[placeholder*="Buscar por nome"]').type(nome);
    cy.contains('td', nome, { timeout: 8000 }).should('be.visible');
  });

  it('edita o telefone do cliente', () => {
    cy.get('input[placeholder*="Buscar por nome"]').type(nome);
    cy.contains('tr', nome, { timeout: 8000 }).find('button[title="Editar"]').click();
    cy.get('form').should('be.visible').within(() => {
      cy.get('input').eq(3).clear().type('61988887777');
      cy.contains('button', 'Salvar').click();
    });
    cy.contains(/cliente atualizado/i).should('be.visible');
  });

  it('remove o cliente de teste', () => {
    cy.get('input[placeholder*="Buscar por nome"]').type(nome);
    cy.contains('tr', nome, { timeout: 8000 }).find('button[title="Remover"]').click();
    cy.contains(/cliente removido/i).should('be.visible');
    cy.contains('td', nome).should('not.exist');
  });

  it('formata CPF/CNPJ ao digitar e bloqueia documento inválido', () => {
    const nomeCnpj = `Cypress QA CNPJ ${Date.now()}`;
    const nomeCpf = `Cypress QA CPF ${Date.now()}`;

    cy.contains('button', 'Novo Cliente').click();
    cy.contains('label', 'Nome / Razão Social *').parent().find('input').type(nomeCnpj);
    cy.contains('label', 'Documento (CNPJ)').parent().find('input').type('11222333000181');
    cy.contains('label', 'Documento (CNPJ)').parent().find('input').should('have.value', '11.222.333/0001-81');
    cy.contains('button', 'Salvar').click();
    cy.contains(/cliente cadastrado/i).should('be.visible');
    cy.contains('td', '11.222.333/0001-81', { timeout: 8000 }).should('be.visible');
    cy.contains('tr', nomeCnpj).find('button[title="Remover"]').click();
    cy.contains(/cliente removido/i);

    cy.contains('button', 'Novo Cliente').click();
    cy.contains('label', 'Nome / Razão Social *').parent().find('input').type(nomeCpf);
    cy.get('select').select('Pessoa Física');
    cy.contains('label', 'Documento (CPF)').parent().find('input').type('11144477735');
    cy.contains('label', 'Documento (CPF)').parent().find('input').should('have.value', '111.444.777-35');
    cy.contains('button', 'Salvar').click();
    cy.contains(/cliente cadastrado/i).should('be.visible');
    cy.contains('td', '111.444.777-35', { timeout: 8000 }).should('be.visible');
    cy.contains('tr', nomeCpf).find('button[title="Remover"]').click();
    cy.contains(/cliente removido/i);

    cy.contains('button', 'Novo Cliente').click();
    cy.contains('label', 'Nome / Razão Social *').parent().find('input').type('Cypress QA CNPJ Invalido');
    cy.contains('label', 'Documento (CNPJ)').parent().find('input').type('11222333000100');
    cy.contains('button', 'Salvar').click();
    cy.contains('CNPJ inválido').should('be.visible');
    cy.contains('button', 'Cancelar').click();
  });
});
