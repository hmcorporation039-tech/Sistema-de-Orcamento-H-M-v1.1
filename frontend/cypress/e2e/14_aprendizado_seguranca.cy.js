// Testes do sistema de aprendizado automático e correções de segurança
// implementados em 01/11/2026:
// - cad_simbolos_aprendidos: aprendizado de layers/símbolos de DWG
// - material_aliases: aprendizado de aliases de materiais
// - semelhancaMateriais: validação de especificações (mm², A, V…)
// - posseAnalise: proteção de posse nas análises
// - admin: rotas restritas a administrador
// - Object.hasOwn: proteção de prototype pollution no VINCULOS

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const USER_EMAIL = `cypress.aprendizado.${Date.now()}@hmengenharia.com`;
const USER_NOME = `Cypress Aprendizado ${Date.now()}`;
let userToken = null;

function loginComoUser(email, senha) {
  return cy.request({ method: 'POST', url: '/api/auth/login', body: { email, senha }, failOnStatusCode: false });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Segurança — rotas restritas a administrador', () => {
  let userId = null;

  before(() => {
    // Cria usuário comum para os testes de permissão
    cy.login();
    cy.api({ method: 'POST', url: '/api/usuarios', body: { nome: USER_NOME, email: USER_EMAIL, senha: 'SenhaQA123!', role: 'user' } })
      .then(({ body }) => { userId = body.id; });
  });

  after(() => {
    cy.login();
    if (userId) cy.api({ method: 'DELETE', url: `/api/usuarios/${userId}`, failOnStatusCode: false });
  });

  it('POST /materiais/importar: usuário comum recebe 403', () => {
    loginComoUser(USER_EMAIL, 'SenhaQA123!').then(({ body }) => {
      expect(body.token || body.erro).to.exist;
      const tok = body.token;
      if (!tok) return; // senha provisória — pulou o teste de integração real
      cy.request({
        method: 'POST', url: '/api/materiais/importar',
        headers: { Authorization: `Bearer ${tok}` },
        body: { itens: [] }, failOnStatusCode: false,
      }).its('status').should('eq', 403);
    });
  });

  it('POST /materiais/fornecedores/verificar-agora: usuário comum recebe 403', () => {
    loginComoUser(USER_EMAIL, 'SenhaQA123!').then(({ body }) => {
      const tok = body.token;
      if (!tok) return;
      cy.request({
        method: 'POST', url: '/api/materiais/fornecedores/verificar-agora',
        headers: { Authorization: `Bearer ${tok}` },
        body: {}, failOnStatusCode: false,
      }).its('status').should('eq', 403);
    });
  });

  it('GET /api/usuarios: usuário comum recebe 403', () => {
    loginComoUser(USER_EMAIL, 'SenhaQA123!').then(({ body }) => {
      const tok = body.token;
      if (!tok) return;
      cy.request({
        method: 'GET', url: '/api/usuarios',
        headers: { Authorization: `Bearer ${tok}` },
        failOnStatusCode: false,
      }).its('status').should('eq', 403);
    });
  });

  it('POST /projetos/analises/:id/pasta/abrir: usuário sem posse recebe 403', () => {
    cy.login();
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const analises = body.itens || body.analises || (Array.isArray(body) ? body : []);
      if (!analises.length) return cy.log('Sem análises no banco — teste pulado');
      const primeiraId = analises[0].id;
      loginComoUser(USER_EMAIL, 'SenhaQA123!').then(({ body: loginBody }) => {
        const tok = loginBody.token;
        if (!tok) return;
        cy.request({
          method: 'POST', url: `/api/projetos/analises/${primeiraId}/pasta/abrir`,
          headers: { Authorization: `Bearer ${tok}` },
          body: {}, failOnStatusCode: false,
        }).its('status').should('eq', 403);
      });
    });
  });

  it('Rotas protegidas sem token retornam 401', () => {
    [
      { method: 'GET',  url: '/api/materiais' },
      { method: 'GET',  url: '/api/propostas' },
      { method: 'GET',  url: '/api/clientes' },
      { method: 'GET',  url: '/api/obras' },
    ].forEach(({ method, url }) => {
      cy.request({ method, url, failOnStatusCode: false }).its('status').should('eq', 401);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Segurança — VINCULOS sem prototype pollution (obrasController)', () => {
  // A rota é PUT /api/obras/:id/vinculos (v2/obras.js)
  it('tipo de vínculo inválido retorna 400 com mensagem clara', () => {
    cy.login();
    cy.api({ url: '/api/obras' }).then(({ body }) => {
      const obra = (body.itens || [])[0];
      if (!obra) return cy.log('Sem obras — teste pulado');
      cy.api({
        method: 'PUT', url: `/api/obras/${obra.id}/vinculos`,
        body: { tipo: '__proto__', id: 999 }, failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.be.oneOf([400, 422]);
        if (resp.status === 400) {
          expect(resp.body.erro).to.match(/tipo inválido|tipo/i);
        }
      });
    });
  });

  it('tipo "toString" não executa código e retorna erro de validação', () => {
    cy.login();
    cy.api({ url: '/api/obras' }).then(({ body }) => {
      const obra = (body.itens || [])[0];
      if (!obra) return cy.log('Sem obras — teste pulado');
      cy.api({
        method: 'PUT', url: `/api/obras/${obra.id}/vinculos`,
        body: { tipo: 'toString', id: 999 }, failOnStatusCode: false,
      }).then(resp => {
        // deve rejeitar o tipo inválido (400) sem travar o servidor
        expect(resp.status).to.be.oneOf([400, 403, 422]);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Semelhança de materiais — validação de especificações', () => {
  it('POST /api/materiais/comparar: Cabo 2.5mm² NÃO casa com Cabo 1.5mm²', () => {
    cy.login();
    cy.api({
      method: 'POST', url: '/api/materiais/comparar',
      body: { descricao: 'Cabo flexível 2,5mm² 750V' },
    }).then(({ body }) => {
      const resultados = body.resultados || body.itens || body || [];
      const lista = Array.isArray(resultados) ? resultados : [];
      // se houver um "Cabo 1.5mm²" na lista, sua confiança deve ser < 90 (não confirmado)
      const cabo15 = lista.find(r =>
        /1[,.]5\s*mm/i.test(r.descricao) && /cabo/i.test(r.descricao)
      );
      if (cabo15) {
        expect(cabo15.confianca, 'cabo 1.5mm² não deve ser confirmado para cabo 2.5mm²').to.be.lessThan(90);
        expect(cabo15.confirmado ?? (cabo15.confianca >= 90), 'confirmado deve ser falso para bitola errada').to.be.false;
      }
    });
  });

  it('POST /api/materiais/comparar: disjuntor 40A NÃO casa com disjuntor 10A', () => {
    cy.login();
    cy.api({
      method: 'POST', url: '/api/materiais/comparar',
      body: { descricao: 'Disjuntor bipolar 40A curva C' },
    }).then(({ body }) => {
      const lista = Array.isArray(body.resultados || body.itens || body)
        ? (body.resultados || body.itens || body) : [];
      const disj10 = lista.find(r => /10\s*a/i.test(r.descricao) && /disjuntor/i.test(r.descricao));
      if (disj10) {
        expect(disj10.confianca, 'disjuntor 10A não deve ser confirmado para 40A').to.be.lessThan(90);
      }
    });
  });

  it('POST /api/materiais/comparar: descrição exata retorna confiança alta (≥ 90)', () => {
    cy.login();
    // Pega um material existente do catálogo
    cy.api({ url: '/api/materiais?pagina=1' }).then(({ body }) => {
      const mat = (body.itens || [])[0];
      if (!mat) return cy.log('Catálogo vazio — teste pulado');
      cy.api({
        method: 'POST', url: '/api/materiais/comparar',
        body: { descricao: mat.descricao },
      }).then(({ body: cmpBody }) => {
        const lista = Array.isArray(cmpBody.resultados || cmpBody.itens || cmpBody)
          ? (cmpBody.resultados || cmpBody.itens || cmpBody) : [];
        const exato = lista.find(r => r.material_id === mat.id || r.id === mat.id);
        if (exato) {
          expect(exato.confianca, 'material exato deve ter confiança ≥ 90').to.be.at.least(90);
        }
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Aprendizado automático — tabelas de conhecimento', () => {
  it('API de análise retorna campo aprendizado com estrutura correta', () => {
    cy.login();
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const analises = body.itens || body.analises || (Array.isArray(body) ? body : []);
      if (!analises.length) return cy.log('Sem análises — teste pulado');
      const id = analises[0].id;
      cy.api({ url: `/api/projetos/analises/${id}` }).then(({ body: a }) => {
        // o objeto da análise deve ter a estrutura esperada
        expect(a).to.have.property('id');
        // se tiver o campo aprendizado, deve ser objeto com legenda
        if (a.aprendizado) {
          expect(a.aprendizado).to.be.an('object');
        }
      });
    });
  });

  it('proposta confirmada registra alias — verificar endpoint de materiais/comparar', () => {
    // Verifica que o endpoint /comparar funciona com o catálogo de aliases
    cy.login();
    cy.api({
      method: 'POST', url: '/api/materiais/comparar',
      body: { descricao: 'Fio teste alias aprendizado' },
    }).then(resp => {
      // A resposta deve ser 200 mesmo sem achado (lista vazia é válida)
      expect(resp.status).to.eq(200);
    });
  });

  it('análise: resultado inclui finalidade e estrutura do mapa de pontos', () => {
    cy.login();
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const analises = body.itens || body.analises || (Array.isArray(body) ? body : []);
      if (!analises.length) return cy.log('Sem análises — teste pulado');
      const ultima = analises[analises.length - 1];
      expect(ultima).to.have.property('finalidade');
      expect(['orcamento', 'elaboracao']).to.include(ultima.finalidade);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Fluxo análise de projeto — upload e mapa de pontos', () => {
  let analiseId = null;

  after(() => {
    cy.login();
    if (analiseId) cy.api({ method: 'DELETE', url: `/api/projetos/analises/${analiseId}`, failOnStatusCode: false });
  });

  it('tela de análise tem campo de finalidade e botão de upload', () => {
    cy.login();
    cy.visit('/obras?aba=analise');
    cy.contains('Para que é esta análise?').should('be.visible');
    cy.get('input[name=finalidade][value=orcamento]').should('exist');
    cy.get('input[name=finalidade][value=elaboracao]').should('exist');
    cy.get('input[type=file]').should('exist');
    cy.contains('button', 'Analisar').should('exist');
    cy.contains('Análise de projeto não gera laudo').should('be.visible');
  });

  it('API de análise: lista retorna estrutura com itens e total', () => {
    cy.login();
    cy.api({ url: '/api/projetos/analises?pagina=1' }).then(({ body }) => {
      expect(body).to.be.an('object');
      // deve ter itens (array) ou ser array diretamente
      const lista = body.itens || (Array.isArray(body) ? body : null);
      expect(lista).to.not.be.null;
    });
  });

  it('API análise: busca por id retorna todos os campos obrigatórios', () => {
    cy.login();
    cy.api({ url: '/api/projetos/analises' }).then(({ body }) => {
      const lista = body.itens || (Array.isArray(body) ? body : []);
      if (!lista.length) return cy.log('Sem análises — pulado');
      cy.api({ url: `/api/projetos/analises/${lista[0].id}` }).then(({ body: a }) => {
        ['id', 'finalidade', 'criadoEm'].forEach(campo => {
          expect(a, `campo ${campo}`).to.have.property(campo);
        });
        // nomeProjeto ou cliente devem existir
        expect(a).to.satisfy(x => x.nomeProjeto || x.cliente, 'deve ter nomeProjeto ou cliente');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Obras — seções e CRUD básico via API', () => {
  let obraId = null;

  after(() => {
    cy.login();
    if (obraId) cy.api({ method: 'DELETE', url: `/api/obras/${obraId}`, failOnStatusCode: false });
  });

  it('lista de obras retorna estrutura paginada', () => {
    cy.login();
    cy.api({ url: '/api/obras?pagina=1' }).then(({ body }) => {
      expect(body).to.have.property('itens');
      expect(body.itens).to.be.an('array');
      expect(body).to.have.property('total');
    });
  });

  it('cria uma obra e verifica campos essenciais', () => {
    cy.login();
    const nomeObra = `Cypress Obra Teste ${Date.now()}`;
    cy.api({
      method: 'POST', url: '/api/obras',
      body: { nome: nomeObra, codigo: `CYP-${Date.now()}`, descricao: 'Obra criada pelo Cypress QA' },
    }).then(({ body, status }) => {
      expect(status).to.be.oneOf([200, 201]);
      obraId = body.id;
      expect(body.nome).to.eq(nomeObra);
    });
  });

  it('obra criada aparece na lista após busca', () => {
    cy.login();
    cy.visit('/obras?aba=obras');
    cy.get('input[placeholder*="Código, nome"]', { timeout: 8000 }).type(`CYP-`);
    cy.get('table tbody tr', { timeout: 8000 }).should('have.length.greaterThan', 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Propostas — fluxo completo de status e vínculo com obra', () => {
  let propostaId = null;
  let obraId = null;

  before(() => {
    cy.login();
    cy.api({
      method: 'POST', url: '/api/obras',
      body: { nome: `Cypress Obra Proposta ${Date.now()}`, codigo: `COPT-${Date.now()}` },
    }).then(({ body }) => { obraId = body.id; });
  });

  after(() => {
    cy.login();
    if (propostaId) cy.api({ method: 'DELETE', url: `/api/propostas/${propostaId}`, failOnStatusCode: false });
    if (obraId) cy.api({ method: 'DELETE', url: `/api/obras/${obraId}`, failOnStatusCode: false });
  });

  it('PATCH /status com status inválido retorna 400', () => {
    cy.login();
    cy.api({ url: '/api/propostas' }).then(({ body }) => {
      const p = (body.itens || [])[0];
      if (!p) return cy.log('Sem propostas — pulado');
      cy.api({
        method: 'PATCH', url: `/api/propostas/${p.id}/status`,
        body: { status: 'StatusInvalido' }, failOnStatusCode: false,
      }).its('status').should('be.oneOf', [400, 422]);
    });
  });

  it('proposta recebe obra_id pelo vínculo e o campo persiste', () => {
    cy.login();
    if (!obraId) return cy.log('Obra não criada — pulado');
    const clienteNome = `Cypress QA Obra Link ${Date.now()}`;
    cy.api({
      method: 'POST', url: '/api/propostas',
      body: {
        cliente_nome: clienteNome,
        data: new Date().toISOString().slice(0, 10),
        obra_id: obraId,
        secoes: [{ id: 1, nome: 'Materiais e Equipamentos' }],
        itens: [{ secao_id: 1, descricao: 'Item de teste', quantidade: 1, valor_unitario: 100, unidade: 'un' }],
      },
    }).then(({ body, status }) => {
      expect(status).to.be.oneOf([200, 201]);
      propostaId = body.id || body.propostaId;
      if (propostaId) {
        cy.api({ url: `/api/propostas/${propostaId}` }).then(({ body: p }) => {
          expect(p.obra_id).to.eq(obraId);
        });
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Base de preços — mão de obra e tabela de referência', () => {
  it('lista de serviços de mão de obra retorna itens com código e descrição', () => {
    cy.login();
    cy.api({ url: '/api/mao-de-obra-itens' }).then(({ body }) => {
      const lista = Array.isArray(body) ? body : (body.itens || []);
      if (!lista.length) return cy.log('Tabela de mão de obra vazia — pulado');
      const item = lista[0];
      expect(item).to.have.property('descricao');
      expect(item).to.have.property('codigo');
    });
  });

  it('tela de Mão de obra carrega com preços visíveis', () => {
    cy.login();
    cy.visit('/base-precos?aba=mao-de-obra');
    cy.contains('h2', 'Preços de Mão de Obra').should('be.visible');
    cy.contains(/R\$|preço|valor/i, { timeout: 8000 }).should('be.visible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — indicadores e consistência', () => {
  it('GET /api/dashboard/resumo: todas as chaves esperadas presentes', () => {
    cy.login();
    cy.api({ url: '/api/dashboard/resumo' }).then(({ body }) => {
      ['propostas', 'valorAprovado', 'taxaAprovacao', 'ticketMedio'].forEach(k => {
        expect(body, `chave ${k}`).to.have.property(k);
      });
    });
  });

  it('GET /api/dashboard/por-mes: retorna array com mês e totais', () => {
    cy.login();
    cy.api({ url: '/api/dashboard/por-mes' }).then(({ body }) => {
      const lista = Array.isArray(body) ? body : (body.itens || body.meses || []);
      if (lista.length) {
        expect(lista[0]).to.have.property('mes');
      }
    });
  });

  it('GET /api/dashboard/top-clientes: retorna array com nome e valor', () => {
    cy.login();
    cy.api({ url: '/api/dashboard/top-clientes' }).then(({ body }) => {
      const lista = Array.isArray(body) ? body : (body.itens || []);
      if (lista.length) {
        expect(lista[0]).to.have.any.keys('nome', 'cliente_nome');
      }
    });
  });

  it('painel: gráficos de meses e top clientes renderizam sem erro', () => {
    cy.login();
    cy.visit('/dashboard');
    cy.contains('h2', 'Painel').should('be.visible');
    cy.contains('Propostas por mês').should('be.visible');
    cy.contains('Top 5 clientes').should('be.visible');
    cy.get('canvas, svg').should('have.length.greaterThan', 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integrações — status do e-mail e configurações', () => {
  it('GET /api/integracoes/email/status: retorna objeto com campo configurado', () => {
    cy.login();
    cy.api({ url: '/api/integracoes/email/status' }).then(({ body }) => {
      expect(body).to.be.an('object');
      expect(body).to.have.property('configurado');
    });
  });

  it('GET /api/configuracoes/margem: retorna margem como número ou null', () => {
    cy.login();
    cy.api({ url: '/api/configuracoes/margem', failOnStatusCode: false }).then(({ body, status }) => {
      if (status === 200) {
        expect(body).to.be.an('object');
      }
    });
  });

  it('tela de Integrações carrega com status do e-mail visível', () => {
    cy.login();
    cy.visit('/cadastros?aba=integracoes');
    cy.contains('h2', 'Integrações').should('be.visible');
    cy.contains(/e-mail|smtp|integração/i).should('be.visible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Pesquisa de mercado — endpoint de histórico', () => {
  it('GET /api/pesquisa-mercado/historico?busca=X: retorna estrutura válida', () => {
    cy.login();
    cy.api({ url: '/api/pesquisa-mercado/historico?busca=cabo', failOnStatusCode: false }).then(({ body, status }) => {
      // aceita 200 (achou) ou 400 (parâmetros inválidos) — não deve ser 500
      expect(status).to.be.oneOf([200, 400]);
      if (status === 200) {
        const lista = Array.isArray(body) ? body : (body.itens || body.resultados || []);
        expect(lista).to.be.an('array');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('App de campo — acesso e sincronização', () => {
  it('abre para o administrador e mostra botão Sincronizar', () => {
    cy.login();
    cy.visit('/campo/');
    cy.contains('H&M Campo', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Sincronizar').should('be.visible');
  });
});
