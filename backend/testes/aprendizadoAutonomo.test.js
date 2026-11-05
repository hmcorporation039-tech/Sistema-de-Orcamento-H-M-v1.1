// Sistema autônomo (03/11/2026): leitor local da lista de equipamentos ("REF.:"), reconhecimento de símbolo por
// semelhança, nomes de bloco aprendidos da legenda, acerto da leitura e fila de conferência do painel, extração de
// equipamentos sem IA quando a leitura local basta e o treino com o acervo (cópia idêntica não ensina duas vezes).
// Textos, layers e arquivos SINTÉTICOS (nenhum dado de cliente). Rodar: node testes/aprendizadoAutonomo.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../src/config/database');
const { lerEquipamentosRef } = require('../src/utils/leitorEquipamentosRef');
const { porSemelhanca, prepararExemplos } = require(path.join(require('../src/config/caminhos').CAD, 'semelhancaDeSimbolo.js'));
const blocos = require('../src/services/blocosAprendidos');
const { descreverSimbolo } = require('../src/services/analiseCad');
const { precisaoDosMapas, filaDeConferencia } = require('../src/services/painelAprendizado');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

const TEXTO_REF = [
  'ESTAÇÃO DE TRABALHO',
  'PLUG RJ-45, Cat.6, NÃO BLINDADO. REF.:',
  '9-9999001-X, FABRICANTE OU TECNICAMENTE',
  'EQUIVALENTE',
  'JACK RJ-45, NÃO BLINDADO, PINAGEM',
  'UNIVERSAL. REF.: 9999002-X, FABRICANTE OU',
  'TECNICAMENTE EQUIVALENTE',
  'CABO UTP, Cat.6, 4 PARES, 24 AWG,',
  '100 OHMS. REF.: 9999003-6, FABRICANTE OU',
  'TECNICAMENTE',
  'Piso vinílico em manta, REF.: Marca Exemplo Cinza 0001;\tP-02',
  'Parede de gesso acartonado, esp.95mm, Placa ST,',
  'afastamento 400mm, REF.: Marca Gesso ou equivalente técnico;',
].join('\n');

(async () => {
  try {
    await caso('leitor local dos itens "REF.:": descrição em várias linhas, código na linha de baixo, fabricante e cauda', () => {
      const r = lerEquipamentosRef(TEXTO_REF);
      assert.strictEqual(r.marcadores, 5);
      assert.strictEqual(r.completos, 5);
      const [plug, jack, cabo, piso, parede] = r.itens;
      assert.deepStrictEqual(plug, { descricao: 'PLUG RJ-45, Cat.6, NÃO BLINDADO', referencia_fabricante: '9-9999001-X', fabricante: 'FABRICANTE' }); // sem o rótulo da planta
      assert.strictEqual(jack.descricao, 'JACK RJ-45, NÃO BLINDADO, PINAGEM UNIVERSAL');
      assert.strictEqual(cabo.descricao, 'CABO UTP, Cat.6, 4 PARES, 24 AWG, 100 OHMS');
      assert.deepStrictEqual([piso.descricao, piso.referencia_fabricante], ['Piso vinílico em manta', 'Marca Exemplo Cinza 0001']);
      assert.match(parede.descricao, /^Parede de gesso acartonado, esp\.95mm, Placa ST, afastamento 400mm$/);
      assert.strictEqual(lerEquipamentosRef('PLANTA BAIXA\nTOMADA BAIXA').marcadores, 0);
    });

    await caso('extração de equipamentos: sem "REF." e com leitura local boa não chama a IA; leitura fraca chama', async () => {
      const ia = require('../src/services/ia');
      const orig = { perguntarJSON: ia.perguntarJSON, disponivel: ia.disponivel };
      let pedidos = 0;
      ia.disponivel = () => true;
      ia.perguntarJSON = async () => { pedidos++; return { provedor: 'teste', json: { itens: [{ descricao: 'Item lido pela IA', referencia: 'ABC-123' }] } }; };
      try {
        const { extrairEquipamentos } = require('../src/services/equipamentoExtratorIA');
        assert.deepStrictEqual(await extrairEquipamentos('PLANTA BAIXA SEM LISTA'), { itens: [], fonte: 'local' });
        const boa = await extrairEquipamentos(TEXTO_REF);
        assert.strictEqual(boa.fonte, 'local');
        assert.strictEqual(boa.itens.length, 5);
        assert.ok(!('fabricante' in boa.itens[0]), 'mesmo formato da resposta da IA');
        const fraca = await extrairEquipamentos(`texto fraco ${Date.now()}\nItem lido pela IA código ABC-123\nREF.:\nREF.:\nREF.:`);
        assert.match(fraca.fonte, /ia/); // o código está no texto: o item da IA entra
        assert.ok(fraca.itens.some(it => it.referencia_fabricante === 'ABC-123'));
        assert.strictEqual(pedidos, 1);
        // revisão de 04/11/2026: código que a IA devolve e não está no texto é invenção — fica fora, e fica a leitura local
        const inventado = await extrairEquipamentos(`outro texto fraco ${Date.now()}\nREF.:\nREF.:\nREF.:`);
        assert.strictEqual(inventado.fonte, 'local');
        assert.ok(!inventado.itens.some(it => it.referencia_fabricante === 'ABC-123'));
        assert.strictEqual(pedidos, 2);
      } finally { Object.assign(ia, orig); }
    });

    await caso('semelhança: layer com outro nome e a mesma forma → sugestão com confiança; sem nada parecido, não chuta', () => {
      const ex = prepararExemplos([
        { layer: 'EL-TOMADAS-BAIXAS', medida: [0.2, 0.2], fracao: 0, simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', usuario: true, porMedida: true, escritorio: 'ESCRITORIO A' },
        { layer: 'EL-TOMADAS-BAIXAS', medida: [0.2, 0.2], fracao: 0, simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', usuario: true, porMedida: true, escritorio: 'ESCRITORIO B' },
        { layer: 'ILUMINACAO-LUMINARIAS', medida: [0.6, 0.6], fracao: 0, simbolo: 'HM-ILU-LUMINARIA', disciplina: 'iluminacao', porMedida: true },
      ]);
      const s = porSemelhanca(ex, 'ELE_TOMADA_BAIXA_PAV1', [0.2, 0.2], 0);
      assert.strictEqual(s.simbolo, 'HM-ELE-TOMADA-BAIXA');
      assert.strictEqual(s.faixa, 'provavel', JSON.stringify(s));
      assert.strictEqual(s.base.usuario, true);
      assert.strictEqual(porSemelhanca(ex, 'A-MOBILIARIO', [0.2, 0.2], 0), null); // a forma sozinha não basta
      const longe = porSemelhanca(ex, 'ELE_TOMADA_BAIXA', [1.5, 0.3], 0); // nome parecido, medida muito diferente
      assert.ok(!longe || longe.confianca < s.confianca);
      assert.strictEqual(porSemelhanca(ex, 'PDF-COR-FF0000', [0.2, 0.2], 0), null);
    });

    await caso('nome de bloco aprendido: o do escritório vale; de outro só se todos concordam; nome curto não atravessa', () => {
      const ap = [
        { nome: 'TUG-30', escritorio: 'ESC A', descricao: 'Tomada baixa 2P+T a 30 cm', disciplina: 'eletrica', vezes: 3 },
        { nome: 'TUG-30', escritorio: 'ESC B', descricao: 'Tomada de uso geral a 30 cm', disciplina: 'eletrica', vezes: 1 },
        { nome: 'T1', escritorio: 'ESC A', descricao: 'Tomada baixa', disciplina: 'eletrica', vezes: 5 },
        { nome: 'DET-X', escritorio: 'ESC A', descricao: 'Detector de fumaça', disciplina: 'incendio', vezes: 2 },
        { nome: 'DET-X', escritorio: 'ESC B', descricao: 'Sensor de presença', disciplina: 'alarme', vezes: 2 },
      ];
      assert.strictEqual(blocos.procurar(ap, 'TUG-30', 'ESC B').descricao, 'Tomada de uso geral a 30 cm');
      assert.strictEqual(blocos.procurar(ap, 'tug-30', 'ESC C').deOutroEscritorio, true);
      assert.strictEqual(blocos.procurar(ap, 'T1', 'ESC C'), null);
      assert.strictEqual(blocos.procurar(ap, 'DET-X', 'ESC C'), null); // escritórios discordam
      assert.strictEqual(blocos.procurar(ap, 'A$C1F2E3', 'ESC A'), null);
      // 2.30: de outro escritório, só se a disciplina aprendida é uma das marcadas no arquivo
      assert.strictEqual(blocos.procurar(ap, 'tug-30', 'ESC C', ['alarme']), null);
      assert.strictEqual(blocos.procurar(ap, 'tug-30', 'ESC C', ['eletrica']).deOutroEscritorio, true);
      assert.strictEqual(blocos.procurar(ap, 'TUG-30', 'ESC B', ['alarme']).descricao, 'Tomada de uso geral a 30 cm', 'no mesmo escritório vale como sempre');
      // no leitor do CAD: a prancha sem legenda reconhece o bloco pelo nome aprendido
      const d = descreverSimbolo({ bloco: 'TUG-30', nomeLimpo: 'TUG-30', layer: '0', layers: ['0'], atributos: {}, descricaoLegenda: null }, { blocosAprendidos: ap, escritorio: 'ESC A' });
      assert.strictEqual(d.origem, 'aprendido');
      assert.match(d.descricao, /^Tomada baixa 2P\+T a 30 cm/);
      assert.strictEqual(d.disciplina, 'eletrica');
    });

    await caso('legenda → nome de bloco: o prefixo do nome dá a disciplina; bloco sem disciplina de instalação não se aprende', async () => {
      await require('../src/models/migracoes/2.0-49-treino-com-o-acervo')(pool);
      const s = Date.now();
      const esc = `ESC TESTE ${s}`;
      try {
        const n = await blocos.registrar([
          { nomeLimpo: `INC CENTRAL ${s}`, descricao: 'Central de alarme 1 laço classe A' },
          { nomeLimpo: `IDENTIFICADOR JANELAS ${s}`, descricao: 'Drywall 10 cm reforçado' },
          { nomeLimpo: `INC CENTRAL ${s}`, descricao: 'repetida no mesmo arquivo' },
        ], esc, 'teste.dwg');
        assert.strictEqual(n, 1);
        const { rows } = await pool.query('SELECT nome, disciplina FROM cad_blocos_aprendidos WHERE escritorio = $1', [esc]);
        assert.deepStrictEqual(rows, [{ nome: `INC CENTRAL ${s}`, disciplina: 'incendio' }]);
      } finally {
        await pool.query('DELETE FROM cad_blocos_aprendidos WHERE escritorio = $1', [esc]);
      }
    });

    await caso('painel: acerto pelo que o engenheiro conferiu (sem contar a releitura) e fila pelos pontos', () => {
      const mapas = [[
        { confirmado: true, simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', proposto: { simbolo: 'HM-ELE-TOMADA-BAIXA', origem: 'legenda' } },
        { confirmado: true, simbolo: 'HM-ELE-TOMADA-ALTA', disciplina: 'eletrica', proposto: { simbolo: 'HM-ELE-TOMADA-BAIXA', origem: 'semelhante' } },
        { confirmado: true, simbolo: 'HM-ILU-LUMINARIA', disciplina: 'iluminacao', proposto: { simbolo: '?', origem: 'nao_reconhecido' } },
        { confirmado: true, simbolo: 'HM-ELE-QUADRO', disciplina: 'eletrica' }, // releitura com o mapa confirmado: não conta
        { confirmado: false, simbolo: 'HM-ELE-QUADRO', disciplina: 'eletrica', proposto: { simbolo: 'HM-ELE-QUADRO', origem: 'regra' } },
      ]];
      const p = precisaoDosMapas(mapas);
      assert.deepStrictEqual([p.conferidas, p.certas, p.taxa], [3, 1, 33]);
      assert.deepStrictEqual(p.porOrigem.map(o => [o.origem, o.conferidas, o.certas]).sort(), [['legenda', 1, 1], ['nao_reconhecido', 1, 0], ['semelhante', 1, 0]]);
      const fila = filaDeConferencia([{ analise_id: 7, nome: 'Obra teste', arquivo: 'planta.dxf', simbolos: [
        { layer: 'L1', simbolo: 'HM-ELE-TOMADA-BAIXA', quantidade: 3, origem: 'regra' },
        { layer: 'L2', simbolo: 'HM-ILU-LUMINARIA', quantidade: 40, origem: 'semelhante', semelhanca: { confianca: 0.8 } },
        { layer: 'L3', simbolo: '?', quantidade: 99, origem: 'nao_reconhecido' },
        { layer: 'L4', simbolo: 'HM-ELE-QUADRO', quantidade: 50, confirmado: true },
      ] }]);
      assert.deepStrictEqual(fila.map(f => [f.layer, f.quantidade]), [['L2', 40], ['L1', 3]]);
      assert.strictEqual(fila[0].confianca, 0.8);
    });

    await caso('preço: referências da H&M (catálogo e cotação) antes da web, mesmo sem IA; "pesquisar de novo" vai à web', async () => {
      const ia = require('../src/services/ia');
      const orig = { disponivel: ia.disponivel };
      const desc = `ELETRODUTO TESTE REFERENCIA ${Date.now()} 3/4`;
      const cnpj = String(Date.now()).slice(-14).padStart(14, '9');
      const { rows: [mat] } = await pool.query(`INSERT INTO materiais (descricao, categoria, unidade, preco, ativo) VALUES ($1, 'Elétrica', 'm', 12.34, true) RETURNING id`, [desc]);
      ia.disponivel = () => false;
      try {
        await pool.query('INSERT INTO cotacao_fornecedores (cnpj, nome) VALUES ($1, $2)', [cnpj, 'Fornecedor Teste']);
        await pool.query(`INSERT INTO cotacoes_itens (material_id, fornecedor_cnpj, preco, unidade, documento) VALUES ($1, $2, 10.5, 'm', $3)`, [mat.id, cnpj, `teste-${cnpj}`]);
        const { pesquisarPrecoMercado } = require('../src/services/pesquisaMercado');
        const r = await pesquisarPrecoMercado(desc);
        assert.strictEqual(r.interna, true);
        assert.deepStrictEqual(r.ofertas.filter(o => o.mesmo_item).map(o => [o.fonte, o.preco]), [['Cotação — Fornecedor Teste', 10.5], ['Catálogo H&M', 12.34]]);
        assert.strictEqual(r.precoSugerido, 11.42);
        await assert.rejects(pesquisarPrecoMercado(desc, { fresco: true }), e => e.status === 422); // sem IA: a web não tem quem pesquise
      } finally {
        ia.disponivel = orig.disponivel;
        await pool.query('DELETE FROM cotacoes_itens WHERE fornecedor_cnpj = $1', [cnpj]);
        await pool.query('DELETE FROM cotacao_fornecedores WHERE cnpj = $1', [cnpj]);
        await pool.query('DELETE FROM materiais WHERE id = $1', [mat.id]);
      }
    });

    await caso('treino com o acervo: lê, aprende, a cópia idêntica não ensina de novo e a segunda rodada não relê', async () => {
      await require('../src/models/migracoes/2.0-49-treino-com-o-acervo')(pool);
      await require('../src/models/migracoes/2.0-49-treino-com-o-acervo')(pool); // idempotente
      await require('../src/models/migracoes/2.0-50-treino-por-disciplina')(pool);
      const { treinar } = require('../src/services/treinoAcervo');
      const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'acervo-teste-'));
      const sufixo = Date.now();
      fs.mkdirSync(path.join(raiz, 'Cliente X', 'Obras'), { recursive: true });
      fs.mkdirSync(path.join(raiz, '_Excluídos'));
      const a = path.join(raiz, 'Cliente X', 'Obras', `planta-${sufixo}.dxf`);
      const copia = path.join(raiz, 'Cliente X', `planta-copia-${sufixo}.dxf`);
      fs.writeFileSync(a, `0\nSECTION\n${sufixo}`);
      fs.copyFileSync(a, copia);
      fs.writeFileSync(path.join(raiz, '_Excluídos', `velha-${sufixo}.dxf`), 'x'); // lixeira: não entra
      fs.writeFileSync(path.join(raiz, 'Cliente X', `memorial-${sufixo}.docx`), 'x'); // não é desenho
      let lidas = 0, aprendidas = 0;
      const ler = async () => { lidas++; return { aprendizado: { legenda: [{}], escritorio: 'ESC TESTE' }, mapa: { simbolos: [{ simbolo: 'HM-ELE-QUADRO' }, { simbolo: '?' }] } }; };
      const aprender = async () => { aprendidas++; return { simbolos: 1, notas: 0, blocos: 2 }; };
      try {
        const r1 = await treinar({ raiz, ler, aprender });
        assert.deepStrictEqual([r1.total, r1.lidos, r1.erros], [2, 2, 0]);
        assert.deepStrictEqual([lidas, aprendidas], [1, 1], 'a cópia não foi lida nem ensinou');
        assert.deepStrictEqual(r1.ensinou, { simbolos: 1, notas: 0, blocos: 2, materiais: 0, semPreco: 0, legendasPdf: 0 });
        const { rows } = await pool.query('SELECT caminho, resumo FROM acervo_treino WHERE caminho LIKE $1 ORDER BY caminho', [`%${sufixo}.dxf`]);
        assert.strictEqual(rows.length, 2);
        assert.ok(rows.some(x => x.resumo.copiaDe), JSON.stringify(rows));
        assert.ok(rows.some(x => x.resumo.reconhecidas === 1 && x.resumo.formas === 2));
        const r2 = await treinar({ raiz, ler, aprender });
        assert.deepStrictEqual([r2.pendentes, lidas], [0, 1]);
      } finally {
        await pool.query('DELETE FROM acervo_treino WHERE caminho LIKE $1', [`%${sufixo}.dxf`]);
        fs.rmSync(raiz, { recursive: true, force: true });
      }
    });
  } finally {
    await pool.end();
  }
  console.log(`aprendizadoAutonomo: ${ok} casos ok`);
})().catch((e) => { console.error(e); process.exit(1); });
