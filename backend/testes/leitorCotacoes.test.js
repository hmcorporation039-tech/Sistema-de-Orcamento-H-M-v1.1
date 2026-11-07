// Teste do leitor de orçamentos de fornecedor em qualquer layout.
// Textos sintéticos (sem dados reais de fornecedor) cobrindo os padrões que o
// leitor universal precisa reconhecer. Rodar: npm test (na pasta backend).
const assert = require('assert');
const { extrairUniversal } = require('../src/utils/leitorCotacaoUniversal');
const { ehDocumentoDaHM } = require('../src/services/leitorCotacao');
const { codigosFabricante, chaveDescricao } = require('../src/services/catalogoMateriais');
const { classificarPorDescricao } = require('../src/utils/classificadorMaterial');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

caso('linha única com R$ e unidade', () => {
  const { itens, conferencia } = extrairUniversal([
    'Item Descrição Qtd Un Preço Unit. Total',
    '1 DISJUNTOR BIPOLAR 32A CURVA C 10 UN R$ 45,90 R$ 459,00',
    '2 CABO FLEXIVEL 2,5MM AZUL ROLO 100M 3 RL R$ 219,50 R$ 658,50',
    'Total geral R$ 1.117,50',
  ].join('\n'));
  assert.strictEqual(itens.length, 2);
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco, itens[0].unidade], [10, 45.9, 'un']);
  assert.match(itens[1].descricao, /^CABO FLEXIVEL 2,5MM AZUL ROLO 100M$/);
  assert.strictEqual(itens[1].unidade, 'rl');
  assert.ok(conferencia.confere);
});

caso('descrição em várias linhas antes da linha de preços', () => {
  const { itens } = extrairUniversal([
    'Descrição Qtde. Preço Unitário Preço Total',
    'CONTATOR TRIPOLAR 12A BOBINA 220V',
    'FABRICANTE XYZ-1234-AB',
    '4 R$ 120,99 R$ 483,96\tP000164\t1 8536.49.00 4 3,25 15 Dias',
  ].join('\n'));
  assert.strictEqual(itens.length, 1);
  assert.strictEqual(itens[0].descricao, 'CONTATOR TRIPOLAR 12A BOBINA 220V FABRICANTE XYZ-1234-AB');
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco], [4, 120.99]);
});

caso('layout em blocos (quantidade numa linha, preços na seguinte)', () => {
  const { itens } = extrairUniversal([
    '1 462', 'BOX RETO 3/4 COM ROSCA MARCA', 'UND\t2,000', '3,84 7,68', 'Produto:', 'Descrição: Marca:', 'NCM: 76090000',
    '2 934', 'BUCHA P/ ELETRODUTO 3/4 MARCA', 'UND\t5,000', '1,20 6,00', 'Produto:',
  ].join('\n'));
  assert.strictEqual(itens.length, 2);
  assert.deepStrictEqual([itens[1].descricao, itens[1].quantidade, itens[1].preco, itens[1].unidade], ['BUCHA P/ ELETRODUTO 3/4 MARCA', 5, 1.2, 'und']);
});

caso('total colado no NCM e coluna de peso no meio', () => {
  const { itens } = extrairUniversal('7 2.581 TERMINAL TELEFONICO MODELO 300 UN 54,000 0,320 54,53 2.944,6285171830');
  assert.strictEqual(itens.length, 1);
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco, itens[0].total], [54, 54.53, 2944.62]);
  assert.strictEqual(itens[0].descricao, 'TERMINAL TELEFONICO MODELO 300');
});

caso('peso não é confundido com quantidade', () => {
  const { itens } = extrairUniversal('9 4.111 BATERIA SELADA 12V 7AH UN 2,000 2,010 97,90 195,80');
  assert.strictEqual(itens[0].quantidade, 2);
});

caso('linhas de total, frete e parcelas não viram item', () => {
  const { itens } = extrairUniversal(['Subtotal 2 R$ 10,00 R$ 20,00', 'Frete 1 R$ 35,00 R$ 35,00', 'Parcela 1 R$ 500,00 R$ 500,00'].join('\n'));
  assert.strictEqual(itens.length, 0);
});

caso('proposta da própria H&M é reconhecida e ignorada', () => {
  assert.ok(ehDocumentoDaHM('Subtotal materiais\nSubtotal mão de obra\nBDI (20%)\nDados Bancários'));
  assert.ok(!ehDocumentoDaHM('Orçamento 123 — Cliente: H&M ENGENHARIA E TECNOLOGIA LTDA'));
});

caso('código de fabricante: o último, sem especificações', () => {
  assert.deepStrictEqual(codigosFabricante('DISJUNTOR MOTOR 2,2-3,2A MOLA 3RV2011-1DA20'), ['3RV2011-1DA20']);
  assert.deepStrictEqual(codigosFabricante('CONTATO PARA 3VA11-15; 3VA20-26 3VA9988-0AB11'), ['3VA9988-0AB11']);
  assert.deepStrictEqual(codigosFabricante('RELE 160-690VCA 15-70HZ'), []);
});

caso('descrição comparada sem acentos e pontuação', () => {
  assert.strictEqual(chaveDescricao('Cabo flexível 2,5mm² - 750V'), chaveDescricao('CABO FLEXIVEL 2,5MM 750V'));
  assert.notStrictEqual(chaveDescricao('DISJUNTOR 10A'), chaveDescricao('DISJUNTOR 16A'));
});

caso('componentes elétricos não caem em Ferragens/CFTV', () => {
  assert.strictEqual(classificarPorDescricao('RELE DE MONITORAMENTO PARAFUSO'), 'Elétrica');
  assert.strictEqual(classificarPorDescricao('CONTATOR DE ALARME TIPO HP'), 'Elétrica');
  assert.strictEqual(classificarPorDescricao('CAMERA IP DOME 2MP'), 'CFTV');
  assert.strictEqual(classificarPorDescricao('PARAFUSO SEXTAVADO 1/4'), 'Ferragens');
  // a regex tinha um backspace no lugar de \b: cabo PP/solar ficava sem categoria
  assert.strictEqual(classificarPorDescricao('CABO PP 3X2,5MM'), 'Elétrica');
  assert.strictEqual(classificarPorDescricao('CABO SOLAR 6MM PRETO'), 'Elétrica');
});

caso('categorias da H&M: alarme, acesso, automação, interfonia e infraestrutura', () => {
  assert.strictEqual(classificarPorDescricao('SIRENE S/ FIO XSS 8000'), 'Alarme');
  assert.strictEqual(classificarPorDescricao('CATRACA SWING LED DS-K3B211LX'), 'Controle de acesso');
  assert.strictEqual(classificarPorDescricao('INTERRUPTOR SMART WIFI TOUCH 2 EWS 1002'), 'Automação');
  assert.strictEqual(classificarPorDescricao('SWITCH SMART GIGABIT 24 PORTAS POE'), 'Redes / Cabeamento Estruturado');
  assert.strictEqual(classificarPorDescricao('CABO CI 50 10 PARES INTERNO'), 'Interfonia');
  assert.strictEqual(classificarPorDescricao('LUVA DE EMENDA 3/4 LISA'), 'Infraestrutura');
  assert.strictEqual(classificarPorDescricao('BUCHA P/ ELETRODUTO 3/4'), 'Infraestrutura');
  assert.strictEqual(classificarPorDescricao('LUVA FLEXTACTIL PRETO GG'), 'EPI');
});

console.log(`leitor de cotações: ${ok} casos ok`);

// ── revisão do uso de IA de 06/11/2026: documento que só a IA leria ─────────
// IA desligada → "aguardando IA" (não é relido com OCR a cada varredura); o mesmo arquivo lido pela IA não volta à IA
// (resposta guardada pelo hash); IA fora do ar → pendente. Leitor de PDF e IA FALSOS (injetados no require).
(async () => {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const path = require('path');
  const arq = (m) => require.resolve(path.join(__dirname, '..', 'src', m));
  const TEXTO = 'ORÇAMENTO DE FORNECEDOR PARA H&M ENGENHARIA — condições comerciais e prazo de entrega\nSubtotal 10,00\nFrete 5,00\nDesconto 1,00\nTotal 20,00';
  const estado = { disponivel: false, chamadas: 0, falhar: false };
  const falsos = {
    'utils/leitorPdf.js': { textoDoPdf: async () => TEXTO, paginasComoImagem: async () => [] },
    'services/leitorCotacaoIA.js': {
      iaDisponivel: () => estado.disponivel,
      extrairComIA: async () => {
        estado.chamadas++;
        if (estado.falhar) throw Object.assign(new Error('nenhuma IA respondeu'), { indisponivel: true });
        return { fonte: 'IA falsa', ehOrcamento: true, totalDocumento: 20, itens: [{ descricao: 'CABO PP 3X2,5MM', codigo: null, marca: '', unidade: 'm', quantidade: 2, precoImpresso: 10, total: 20, ipi: 0, ncm: null }] };
      },
    },
  };
  const guardados = {};
  for (const [m, falso] of Object.entries(falsos)) { guardados[m] = require.cache[arq(m)]; require.cache[arq(m)] = { id: arq(m), filename: arq(m), loaded: true, exports: falso }; }
  const guardadoLeitor = require.cache[arq('services/leitorCotacao.js')];
  delete require.cache[arq('services/leitorCotacao.js')];
  const pool = require('../src/config/database');
  const iaCache = require('../src/services/iaCache');
  const buffer = Buffer.from(`%PDF-1.4 teste ${Date.now()}`);
  const chave = iaCache.chaveDe('leitura_cotacao_ia v1', require('crypto').createHash('sha256').update(buffer).digest('hex'));
  try {
    const { lerDocumentoCotacao } = require('../src/services/leitorCotacao');
    let r = await lerDocumentoCotacao(buffer, 'orc.pdf');
    assert.deepStrictEqual([r.aguardaIA, !!r.pendente, r.usouIA, r.itens.length], [true, false, false, 0], 'IA desligada: aguardando IA, não pendente');
    console.log('  ok  IA desligada: o documento fica "aguardando IA" (não é relido a cada varredura)');
    estado.disponivel = true; estado.falhar = true;
    r = await lerDocumentoCotacao(buffer, 'orc.pdf');
    assert.deepStrictEqual([r.pendente, r.iaFalhou, r.aguardaIA], [true, true, false], 'IA fora do ar: pendente (tenta na próxima)');
    console.log('  ok  IA fora do ar: pendente e marcado como falha no contador');
    if (process.env.DB_NAME === 'hm_orcamentos_v2') {
      estado.falhar = false; estado.chamadas = 0;
      r = await lerDocumentoCotacao(buffer, 'orc.pdf');
      assert.deepStrictEqual([r.itens.length, r.usouIA, r.iaDeCache, estado.chamadas], [1, true, false, 1]);
      const r2 = await lerDocumentoCotacao(buffer, 'outro-nome.pdf'); // o mesmo PDF reencaminhado
      assert.deepStrictEqual([r2.itens.length, r2.iaDeCache, estado.chamadas], [1, true, 1], 'o mesmo arquivo não volta à IA');
      // passou o prazo total por documento para a IA (leitorCotacaoIA.extrairComIA recebe timeoutTotalMs)
      console.log('  ok  o mesmo PDF lido pela IA não gasta IA de novo (resposta guardada pelo hash)');
    }
  } catch (e) {
    console.error(`  FALHOU leitura com IA: ${e.stack || e.message}`);
    process.exitCode = 1;
  } finally {
    for (const [m, antes] of Object.entries(guardados)) { if (antes) require.cache[arq(m)] = antes; else delete require.cache[arq(m)]; }
    if (guardadoLeitor) require.cache[arq('services/leitorCotacao.js')] = guardadoLeitor; else delete require.cache[arq('services/leitorCotacao.js')];
    await pool.query('DELETE FROM ia_cache WHERE chave = $1', [chave]).catch(() => {});
  }

  // arquivo da pasta "aguardando IA": não é relido com a IA desligada; com ela ligada, sim
  try {
    const ia = require('../src/services/ia');
    const { _interno: { jaProcessado } } = require('../src/services/cotacaoFornecedorService');
    const { VERSAO_LEITOR } = require('../src/services/leitorCotacao');
    const cliente = { query: async () => ({ rows: [{ itens_lidos: 0, itens_novos: 0, itens_atualizados: 0, leitor_versao: VERSAO_LEITOR, aguardando_ia: true }] }) };
    const orig = ia.disponivel;
    try {
      ia.disponivel = () => false;
      assert.strictEqual(await jaProcessado(cliente, 'x'), true, 'IA desligada: não relê');
      ia.disponivel = () => true;
      assert.strictEqual(await jaProcessado(cliente, 'x'), false, 'IA ligada: relê');
    } finally { ia.disponivel = orig; }
    console.log('  ok  pasta: "aguardando IA" só é relido quando a IA estiver ligada');
  } catch (e) {
    console.error(`  FALHOU pasta aguardando IA: ${e.stack || e.message}`);
    process.exitCode = 1;
  } finally {
    await require('../src/config/database').end().catch(() => {});
  }
})();
