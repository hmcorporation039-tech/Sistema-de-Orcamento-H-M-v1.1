// Regressão das correções da auditoria de segurança de 25/10/2026. Cada caso
// trava uma proteção que, se for desfeita sem querer, reabre uma falha real.
// Não usa o banco nem a rede. Rodar: npm test (na pasta backend).
const assert = require('assert');
const { argsClaudeMax } = require('../src/utils/leitorCotacaoIA');
const { verificarAutenticidade, dominioPermitido } = require('../src/utils/autenticidadeEmail');
const { tipoPorConteudo } = require('../src/utils/tipoArquivo');
const { versaoDoPedido } = require('../src/utils/versao');
const { pedidoLocal } = require('../src/services/pastasRegistros');
const { unidadeBase } = require('../src/services/catalogoMateriais');
const { paraTestes: { prepararFotos } } = require('../src/controllers/laudosController');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('CLI do Claude roda isolada (documento de fornecedor não executa nada)', () => {
  for (const comArquivo of [false, true]) {
    const a = argsClaudeMax('prompt', comArquivo);
    for (const flag of ['--restricted', '--strict-mcp-config', '--disable-slash-commands']) assert.ok(a.includes(flag), `falta ${flag}`);
    assert.strictEqual(a[a.indexOf('--tools') + 1], comArquivo ? 'Read' : '', 'ferramentas além do necessário');
    // --allowedTools SOMA às permissões do usuário; --bare quebra o login do Max
    assert.ok(!a.some(x => /allowedTools|dangerously|--bare/.test(x)), 'flag perigosa');
  }
  // pesquisa de preço: só ferramentas de leitura da web, e só elas liberadas
  const w = argsClaudeMax('prompt', false, { web: true });
  assert.ok(w.includes('--restricted') && w.includes('--strict-mcp-config'));
  assert.strictEqual(w[w.indexOf('--tools') + 1], 'WebSearch,WebFetch');
  assert.deepStrictEqual(w.slice(w.indexOf('--allowedTools') + 1), ['WebSearch', 'WebFetch']);
  assert.ok(!w.some(x => /Bash|Read|Write|Edit|dangerously/.test(x)), 'ferramenta além da web');
});

caso('ofertas da pesquisa de mercado são validadas (dado não confiável)', () => {
  const { normalizarOfertas, estatistica } = require('../src/utils/pesquisaMercadoService');
  const o = normalizarOfertas({ ofertas: [
    { fonte: 'Loja A', produto: 'X', preco: 'R$ 1.234,56', link: 'https://a.com/x' },
    { fonte: 'Loja B', produto: 'X', preco: 100, link: 'javascript:alert(1)' },
    { fonte: 'Loja C', produto: 'Y', preco: 50, mesmo_item: false },
    { fonte: '', preco: 10 }, { fonte: 'Loja D', preco: -5 },
  ] });
  assert.deepStrictEqual(o.map(x => [x.fonte, x.preco, x.link]), [['Loja A', 1234.56, 'https://a.com/x'], ['Loja B', 100, null], ['Loja C', 50, null]]);
  assert.deepStrictEqual(estatistica(o), { media: 667.28, minimo: 100, maximo: 1234.56, n: 2 }, 'variação diferente fica fora da média');
});

const email = (from, ar) => ({
  from: { value: [{ address: from }] },
  headers: new Map(ar == null ? [] : [['authentication-results', ar]]),
});

caso('e-mail com DMARC aprovado do domínio do remetente é autêntico', () => {
  const r = verificarAutenticidade(email('no-reply@inter.co', 'mx.google.com; dkim=pass header.i=@inter.co; spf=pass; dmarc=pass (p=REJECT) header.from=inter.co'));
  assert.ok(r.autentico);
  assert.ok(dominioPermitido(r.dominio, ['inter.co']));
});

caso('e-mail forjado (sem DMARC/DKIM ou DMARC de outro domínio) é recusado', () => {
  assert.ok(!verificarAutenticidade(email('no-reply@inter.co', null)).autentico);
  assert.ok(!verificarAutenticidade(email('no-reply@inter.co', 'mx.google.com; spf=softfail; dmarc=fail (p=REJECT) header.from=inter.co')).autentico);
  assert.ok(!verificarAutenticidade(email('no-reply@inter.co', 'mx.google.com; dkim=pass header.i=@golpe.com; dmarc=pass header.from=golpe.com')).autentico);
});

caso('domínio permitido não aceita parecidos', () => {
  assert.ok(dominioPermitido('mail.inter.co', ['inter.co']));
  assert.ok(!dominioPermitido('inter.co.golpe.com', ['inter.co']));
  assert.ok(!dominioPermitido('falsointer.co', ['inter.co']));
});

caso('tipo do arquivo vem do conteúdo, não da extensão', () => {
  assert.strictEqual(tipoPorConteudo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.strictEqual(tipoPorConteudo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.strictEqual(tipoPorConteudo(Buffer.from('%PDF-1.7\n...')), 'application/pdf');
  assert.strictEqual(tipoPorConteudo(Buffer.from('<html><script>alert(1)</script>')), null);
  assert.strictEqual(tipoPorConteudo(Buffer.from('MZ\x90\x00executavel')), null);
});

caso('versão do bloqueio otimista: só inteiro >= 0', () => {
  assert.strictEqual(versaoDoPedido({ versao: 3 }), 3);
  assert.strictEqual(versaoDoPedido({ versao: '0' }), 0);
  assert.strictEqual(versaoDoPedido({}), null);
  assert.strictEqual(versaoDoPedido({ versao: -1 }), null);
  assert.strictEqual(versaoDoPedido({ versao: '1; DROP TABLE x' }), null);
});

caso('"pedido deste PC" ignora o X-Forwarded-For forjável', () => {
  assert.ok(pedidoLocal({ ip: '192.168.0.9', socket: { remoteAddress: '::ffff:127.0.0.1' } }));
  assert.ok(!pedidoLocal({ ip: '127.0.0.1', socket: { remoteAddress: '192.168.0.9' } }));
});

caso('unidades equivalentes da quarentena de preço de NF', () => {
  assert.strictEqual(unidadeBase('PC.'), unidadeBase('un'));
  assert.notStrictEqual(unidadeBase('m'), unidadeBase('rl'));
});

caso('laudo: caminho de foto digitado no formulário é descartado (sem leitura de arquivo do servidor)', async () => {
  const dados = { inspecao: { pasta_fotos: 'C:\\Windows', fotos: [{ arquivo: 'C:\\HM-Engenharia\\hm-eng\\backend\\.env', legenda: 'x' }, { arquivo: '..\\..\\.env' }] } };
  const { dados: limpo } = await prepararFotos(1, dados);
  assert.deepStrictEqual(limpo.inspecao.fotos.map(f => f.arquivo), ['', '']);
  assert.strictEqual(limpo.inspecao.pasta_fotos, '');
  assert.strictEqual(dados.inspecao.fotos[0].arquivo.endsWith('.env'), true, 'não pode alterar o original');
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  }
  console.log(`segurança: ${ok}/${casos.length} casos ok`);
  // o pool do banco é criado ao carregar os controllers; não há consulta, só encerra
  await require('../src/config/database').end().catch(() => {});
})();
