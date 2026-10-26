// Regra do usuário: toda lista suspensa do sistema em ordem alfabética
// (a opção-guia de valor vazio — "Todos", "Selecione..." — fica no topo).
const comparador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

function conferirListasDaTela() {
  cy.get('body').then($body => {
    const listas = $body.find('select');
    listas.each((_, sel) => {
      const textos = [...sel.querySelectorAll(':scope > option')].filter(o => o.value !== '').map(o => o.textContent.trim());
      const ordenados = [...textos].sort((a, b) => comparador.compare(a, b));
      expect(textos, `lista "${sel.name || sel.id || textos.slice(0, 2).join(', ')}"`).to.deep.equal(ordenados);
    });
  });
}

describe('Listas suspensas em ordem alfabética', () => {
  beforeEach(() => cy.login());

  // (a tela de Orçamento só tem listas depois de criar seções; usa o mesmo componente)
  // 2.0: as telas viraram abas dos hubs (as rotas antigas redirecionam para
  // estas); entram também as telas novas (obras, composições, mão de obra).
  [
    '/base-precos?aba=materiais', '/base-precos?aba=mao-de-obra', '/base-precos?aba=composicoes',
    '/propostas?aba=lista', '/financeiro?aba=movimentos', '/financeiro?aba=prestadores',
    '/obras?aba=obras', '/obras?aba=laudos',
  ].forEach(rota => {
    it(`todas as listas de ${rota}`, () => {
      cy.visit(rota);
      cy.get('select', { timeout: 10000 }).should('exist');
      conferirListasDaTela();
    });
  });

  it('categorias do catálogo: lista de filtro completa e sem "Geral"', () => {
    cy.visit('/base-precos?aba=materiais');
    // as categorias chegam do servidor depois da página: espera a lista encher
    cy.contains('option', 'Todas categorias').parent('select').find('option').should('have.length.greaterThan', 5).then(ops => {
      const nomes = [...ops].map(o => o.textContent.trim());
      expect(nomes).to.include('Elétrica');
      expect(nomes).not.to.include('Geral');
      const semGuia = nomes.slice(1);
      expect(semGuia).to.deep.equal([...semGuia].sort((a, b) => comparador.compare(a, b)));
    });
  });
});
