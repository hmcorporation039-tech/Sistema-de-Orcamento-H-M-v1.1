// Depois do login a 2.0 abre o grupo Propostas na aba "Nova / editar"
// (/propostas?aba=editar) — na 1.x era /orcamento.
// A senha não vai para o log de comandos (nem para os prints de falha).
Cypress.Commands.add('login', (email = Cypress.env('adminEmail') || 'admin@hmengenharia.com', senha = Cypress.env('adminSenha')) => {
  cy.visit('/login');
  cy.get('input[type=email]').type(email);
  cy.get('input[type=password]').type(senha, { log: false });
  cy.contains('button', 'Entrar').click();
  cy.url().should('include', '/propostas');
});

// Chamada direta à API com o token da sessão (para preparar/limpar dados).
Cypress.Commands.add('api', (opcoes) => {
  return cy.window({ log: false }).then(win => {
    const token = win.localStorage.getItem('hm_token');
    return cy.request({ ...opcoes, headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${token}` } });
  });
});
