// Versão 2.0: menu em 6 grupos (páginas-hub com abas em ?aba=), rotas da 1.x
// redirecionando, página da obra (?secao=), composições e kits, editor da
// proposta (Curva ABC, BDI pelo TCU, + Kit/composição) e o app de campo.
// 2.1: abas Análise de projeto / Projetos por disciplina / Laudos e a
// finalidade da análise.
//
// Só leitura: não salva nada e não depende de ids fixos — usa a primeira
// obra/proposta/análise que a API devolver.

// Grupos do menu → abas do hub (chave em ?aba=) e o que cada aba mostra.
const GRUPOS = [
  { menu: 'Painel', caminho: '/dashboard', titulo: 'Painel', abas: [] },
  {
    menu: 'Obras', caminho: '/obras', abas: [
      { chave: 'obras', rotulo: 'Obras', mostra: () => cy.contains('h2', 'Obras') },
      // 2.1: análise ≠ laudo — projetos e laudos em abas separadas
      { chave: 'analise', rotulo: 'Análise de projeto', mostra: () => cy.contains('h3', 'Análises salvas') },
      { chave: 'projetos', rotulo: 'Projetos por disciplina', mostra: () => cy.contains('h3', 'Projetos por disciplina') },
      { chave: 'laudos', rotulo: 'Laudos', mostra: () => cy.contains('h3', 'Laudos') },
    ],
  },
  {
    menu: 'Propostas', caminho: '/propostas', abas: [
      { chave: 'lista', rotulo: 'Propostas', mostra: () => cy.contains('h2', 'Propostas') },
      { chave: 'editar', rotulo: 'Nova / editar', mostra: () => cy.contains('h2', 'Novo Orçamento') },
    ],
  },
  {
    menu: 'Base de preços', caminho: '/base-precos', abas: [
      { chave: 'materiais', rotulo: 'Materiais', mostra: () => cy.contains('h2', 'Materiais') },
      { chave: 'mao-de-obra', rotulo: 'Mão de obra', mostra: () => cy.contains('h2', 'Preços de Mão de Obra') },
      { chave: 'composicoes', rotulo: 'Composições e kits', mostra: () => cy.contains('button', 'Nova composição') },
    ],
  },
  {
    menu: 'Financeiro', caminho: '/financeiro', abas: [
      { chave: 'movimentos', rotulo: 'Movimentos', mostra: () => cy.contains('h2', 'Financeiro') },
      { chave: 'prestadores', rotulo: 'Prestadores', mostra: () => cy.contains('h2', 'Prestadores de Serviços') },
      { chave: 'contratos', rotulo: 'Contratos', mostra: () => cy.contains('h2', 'Contratos de Prestação de Serviço') },
    ],
  },
  {
    menu: 'Cadastros e administração', caminho: '/cadastros', abas: [
      { chave: 'clientes', rotulo: 'Clientes', mostra: () => cy.contains('h2', 'Clientes') },
      { chave: 'usuarios', rotulo: 'Usuários', mostra: () => cy.contains('h2', 'Usuários') },
      { chave: 'integracoes', rotulo: 'Integrações', mostra: () => cy.contains('h2', 'Integrações') },
    ],
  },
];

// Rotas da 1.x → destino (caminho + ?aba=) na 2.0
const REDIRECIONAMENTOS = [
  ['/orcamento', '/propostas', 'editar'],
  ['/historico', '/propostas', 'lista'],
  ['/relatorios', '/propostas', 'lista'],
  ['/analise-projeto', '/obras', 'analise'],
  ['/analise-projeto?aba=laudos', '/obras', 'laudos'],
  ['/materiais', '/base-precos', 'materiais'],
  ['/precos-mao-de-obra', '/base-precos', 'mao-de-obra'],
  ['/prestadores', '/financeiro', 'prestadores'],
  ['/contratos', '/financeiro', 'contratos'],
  ['/clientes', '/cadastros', 'clientes'],
  ['/usuarios', '/cadastros', 'usuarios'],
];

const abaSelecionada = (rotulo) => cy.contains('[role=tab]', rotulo).should('have.attr', 'aria-selected', 'true');

describe('Versão 2.0 — menu, abas e telas novas', () => {
  beforeEach(() => cy.login());

  it('o menu tem os 6 grupos e cada hub abre as suas abas pela URL (?aba=)', () => {
    cy.get('nav a').should('have.length', GRUPOS.length);
    GRUPOS.forEach(g => {
      cy.get('nav').contains('a', g.menu).click();
      cy.location('pathname').should('eq', g.caminho);
      if (!g.abas.length) {
        cy.contains('h2', g.titulo).should('be.visible');
        return;
      }
      // as abas do hub, na ordem
      cy.get(`[role=tablist][aria-label="${g.menu}"] [role=tab]`)
        .should('have.length', g.abas.length)
        .then(abas => expect([...abas].map(a => a.textContent.trim())).to.deep.equal(g.abas.map(a => a.rotulo)));
      // a primeira aba abre por padrão; clicar em cada uma muda o ?aba= e a
      // tela (começa pela 2ª: clicar na aba já aberta não faz nada, de propósito)
      abaSelecionada(g.abas[0].rotulo);
      g.abas[0].mostra().should('be.visible');
      [...g.abas.slice(1), g.abas[0]].forEach(a => {
        cy.contains('[role=tab]', a.rotulo).click();
        cy.location('search').should('include', `aba=${a.chave}`);
        abaSelecionada(a.rotulo);
        a.mostra().should('be.visible');
      });
      // F5 continua na mesma aba
      const ultima = g.abas[g.abas.length - 1];
      cy.contains('[role=tab]', ultima.rotulo).click();
      cy.reload();
      abaSelecionada(ultima.rotulo);
      ultima.mostra().should('be.visible');
    });
  });

  it('as rotas antigas (1.x) redirecionam para o hub na aba certa', () => {
    REDIRECIONAMENTOS.forEach(([antiga, caminho, aba]) => {
      cy.visit(antiga);
      cy.location('pathname').should('eq', caminho);
      cy.location('search').should('include', `aba=${aba}`);
    });
    // com id: /orcamento/:id → /propostas/editar/:id e /analise-projeto/:id → /obras/analise/:id
    cy.api({ url: '/api/propostas?pagina=1' }).then(({ body }) => {
      const p = body.itens[0];
      if (!p) return;
      cy.visit(`/orcamento/${p.id}`);
      cy.location('pathname').should('eq', `/propostas/editar/${p.id}`);
      cy.contains('h2', `Editando Proposta ${p.numero}`).should('be.visible');
    });
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const lista = Array.isArray(body) ? body : (body.itens || body.analises || []);
      if (!lista.length) return;
      cy.visit(`/analise-projeto/${lista[0].id}`);
      cy.location('pathname').should('eq', `/obras/analise/${lista[0].id}`);
    });
    // rota desconhecida volta para o painel
    cy.visit('/rota-que-nao-existe');
    cy.location('pathname').should('eq', '/dashboard');
  });

  it('abre uma obra e as seções Resumo, Análises, Projetos, Laudos, Propostas, Execução, Campo e Financeiro (?secao=)', () => {
    cy.api({ url: '/api/obras?pagina=1' }).then(({ body }) => {
      const obra = (body.itens || [])[0];
      expect(obra, 'existe ao menos uma obra no banco').to.exist;

      // pela lista: clica na obra
      cy.visit('/obras');
      cy.get('input[placeholder*="Código, nome"]').type(obra.codigo);
      cy.contains('a', obra.codigo, { timeout: 10000 }).click();
      cy.location('pathname').should('eq', `/obras/${obra.id}`);
      cy.contains('h2', obra.nome).should('be.visible');
      cy.contains('[role=tab]', 'Resumo').should('have.attr', 'aria-selected', 'true');
      cy.contains('Orçado').should('be.visible');

      const secoes = [
        // 2.1: análises (com a finalidade), projetos e laudos separados
        ['analises', 'Análises', 'Análises de projeto (PDF recebido)'],
        ['projetos', 'Projetos', 'Novo projeto nesta obra'],
        ['laudos', 'Laudos', 'Novo laudo nesta obra'],
        ['propostas', 'Propostas', 'Propostas da obra'],
        ['execucao', 'Execução', 'Contratos de prestadores'],
        ['campo', 'Campo (OS)', 'Ordens de serviço de campo'],
        ['financeiro', 'Financeiro', 'Movimentos do financeiro ligados'],
        ['resumo', 'Resumo', 'Orçado'],
      ];
      // clicando nas abas: a URL guarda a seção
      secoes.forEach(([chave, rotulo, texto]) => {
        cy.get('[role=tablist][aria-label="Seções da obra"]').contains('[role=tab]', rotulo).click();
        cy.location('search').should('include', `secao=${chave}`);
        cy.contains(texto).should('be.visible');
      });
      // abrindo direto pela URL (e as chaves antigas: projeto → Análises, disciplinas → Projetos)
      [...secoes, ['projeto', 'Análises', 'Análises de projeto (PDF recebido)'], ['disciplinas', 'Projetos', 'Novo projeto nesta obra']].forEach(([chave, rotulo, texto]) => {
        cy.visit(`/obras/${obra.id}?secao=${chave}`);
        cy.get('[role=tablist][aria-label="Seções da obra"]').contains('[role=tab]', rotulo)
          .should('have.attr', 'aria-selected', 'true');
        cy.contains(texto).should('be.visible');
      });
    });
  });

  it('análise de projeto tem finalidade (Orçamento × Elaboração de projeto) e não fala em laudo', () => {
    cy.visit('/obras?aba=analise');
    cy.contains('Para que é esta análise?').should('be.visible');
    cy.get('input[name=finalidade][value=orcamento]').should('exist');
    cy.get('input[name=finalidade][value=elaboracao]').should('exist');
    cy.contains('Análise de projeto não gera laudo').should('be.visible');
    cy.contains('th', 'Finalidade').should('be.visible');
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const a = (body.itens || [])[0];
      if (!a) return;
      expect(['orcamento', 'elaboracao']).to.include(a.finalidade);
      cy.visit(`/obras/analise/${a.id}`);
      cy.get('select[aria-label="Finalidade da análise"]').should('have.value', a.finalidade)
        .find('option').then(ops => expect([...ops].map(o => o.textContent)).to.deep.equal(['Elaboração de projeto', 'Orçamento']));
      cy.contains(a.finalidade === 'elaboracao' ? 'Elaborar projeto por disciplina' : 'Gerar orçamento e abrir no editor').should('exist');
      cy.contains('Calcular pela norma').should('not.exist');
    });
  });

  it('aba Composições e kits lista os kits e mostra os itens de um deles', () => {
    cy.visit('/base-precos?aba=composicoes');
    cy.get('[data-teste="lista-composicoes"] tr[data-codigo]', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('[data-teste="lista-composicoes"] tr[data-codigo]').first().find('button[aria-label="Ver itens"]').click();
    cy.get('[data-teste="lista-composicoes"]').contains(/material|serviço/i).should('be.visible');
    cy.get('input[placeholder="Buscar por código ou descrição"]').type('xxxx-kit-inexistente-xxxx');
    cy.contains('Nenhuma composição com esse filtro').should('be.visible');
  });

  it('editor de uma proposta existente: Curva ABC, BDI pelo TCU e + Kit/composição (sem salvar)', () => {
    cy.intercept('PUT', '/api/propostas/*').as('salvou');
    cy.intercept('POST', '/api/propostas').as('criou');
    cy.api({ url: '/api/propostas?pagina=1' }).then(({ body }) => {
      // a primeira proposta com itens (a curva ABC precisa de itens)
      const candidatas = body.itens || [];
      expect(candidatas.length, 'existe ao menos uma proposta no banco').to.be.greaterThan(0);
      const comItens = candidatas.find(p => Number(p.total) > 0) || candidatas[0];

      cy.visit('/propostas?aba=lista');
      cy.get('input[placeholder*="Número, cliente"]').type(comItens.numero);
      cy.contains('tr', comItens.numero, { timeout: 10000 }).find('button[title="Editar"]').click();
      cy.location('pathname').should('eq', `/propostas/editar/${comItens.id}`);
      cy.contains('h2', `Editando Proposta ${comItens.numero}`).should('be.visible');
      cy.contains('[role=tab]', 'Nova / editar').should('have.attr', 'aria-selected', 'true');

      // Curva ABC
      cy.contains('button', 'Curva ABC').should('be.visible').and('not.be.disabled').click();
      cy.contains('Curva ABC da proposta').should('be.visible');
      cy.contains('button', 'Fechar curva ABC').click();
      cy.contains('Curva ABC da proposta').should('not.exist');

      // BDI pela fórmula do TCU (abre e fecha sem aplicar)
      cy.contains('button', 'TCU').click();
      cy.get('[role=dialog][aria-label="Calculador de BDI"]').should('be.visible').within(() => {
        cy.contains('BDI pela fórmula do TCU').should('be.visible');
        cy.contains('button', 'Cancelar').click();
      });
      cy.get('[role=dialog][aria-label="Calculador de BDI"]').should('not.exist');

      // + Kit/composição (abre e cancela sem inserir)
      cy.get('[data-teste="botao-inserir-composicao"]').should('contain', '+ Kit/composição').click();
      cy.get('[data-teste="modal-inserir-composicao"]').should('be.visible').within(() => {
        cy.contains('Inserir kit / composição').should('be.visible');
        cy.get('[data-teste="confirmar-inserir-composicao"]').should('be.visible');
        cy.contains('button', 'Cancelar').click();
      });
      cy.get('[data-teste="modal-inserir-composicao"]').should('not.exist');
    });
    cy.get('@salvou.all').should('have.length', 0);
    cy.get('@criou.all').should('have.length', 0);
  });

  it('o app de campo (/campo/) abre para o administrador', () => {
    cy.visit('/campo/');
    cy.contains('H&M Campo', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Sincronizar').should('be.visible');
    cy.location('pathname').should('match', /^\/campo\//);
  });
});
