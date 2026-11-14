// Correções da versão 2.36 (revisão geral de 14/11/2026), sem banco e sem IA:
// Claude Max sem os segredos do .env, bundle do 3D com todas as fontes no hash, datas de Brasília,
// R$ 0,00 fora do catálogo também abaixo de 1 centavo, telefonia fora do ramo de cabeamento,
// cabo terra na seção comercial, altura da tomada alta, dono para gravar na pasta,
// fornecedor renomeado só por administrador e equipamentos da subestação na média tensão.
// Rodar: node testes/revisao236.test.js (pasta backend).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
const RAIZ = path.join(__dirname, '..', '..');
const ler = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');

caso('Claude Max: a CLI recebe só o ambiente filtrado (sem DB_PASS, JWT_SECRET e chaves de API)', () => {
  const fonte = ler('backend', 'src', 'services', 'ia.js');
  assert.match(fonte, /execFile\(CAMINHO_CLI, args, \{[^}]*env: ambienteFiltrado\(\)/);
  const { ambienteFiltrado } = require('../src/services/assistente/claudeCli');
  const env = ambienteFiltrado({ PATH: 'C:\\x', USERPROFILE: 'C:\\u', DB_PASS: 's', JWT_SECRET: 'j', ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' });
  assert.deepStrictEqual(Object.keys(env).sort(), ['PATH', 'USERPROFILE']);
});

caso('3D: todo arquivo local do bundle está na assinatura (FONTES) — inclusive a fiação de comando e o perfil da PRZ', () => {
  const c = require(path.join(RAIZ, 'skills', '_comum', 'cad', 'visualizador3d', 'construir.js'));
  const nomes = c.FONTES.map(f => path.basename(f));
  for (const n of ['fiacaoComando.js', 'comando.js', 'blocos-comando.json', 'perfil-especificacao.json']) assert.ok(nomes.includes(n), n);
  // a conferência do construir() acusa o arquivo que ficar de fora
  const meta = { inputs: { [path.relative(process.cwd(), c.FONTES[0])]: {}, 'outro/arquivo-novo.js': {}, 'node_modules/three/build/three.module.js': {} } };
  assert.deepStrictEqual(c.arquivosForaDasFontes(meta), ['outro/arquivo-novo.js']);
  assert.strictEqual(c.bundleAtualizado(), true, 'bundle do 3D desatualizado: rode "npm run build:3d" na pasta skills');
});

caso('datas: planilha de preços, nome do arquivo da biblioteca e data da planta em Brasília (não em UTC)', () => {
  assert.match(ler('backend', 'src', 'services', 'agentes', 'planilhaPrecos.js'), /dados\.dataBase \|\| hojeBrasilia\(\)/);
  assert.match(ler('backend', 'src', 'controllers', 'projetos', 'mapaCad.js'), /biblioteca-blocos-hm-\$\{hojeBrasilia\(\)\}/);
  assert.match(ler('backend', 'src', 'controllers', 'laudos', 'desenhos.js'), /entrega\(\)\.dataBr\(hojeBrasilia\(\)\)/);
  assert.ok(!/new Date\(\)\.getFullYear\(\)/.test(ler('backend', 'src', 'controllers', 'obrasController.js')));
});

caso('catálogo: preço abaixo de R$ 0,01 depois de arredondar não entra (0,004 virava 0,00 no banco)', () => {
  const { ehItemDeCatalogo } = require('../src/services/catalogoAutoCadastro');
  assert.strictEqual(ehItemDeCatalogo('Cabo flexível 2,5 mm²', 0.004), false);
  assert.strictEqual(ehItemDeCatalogo('Cabo flexível 2,5 mm²', 0.005), true); // arredonda para 0,01
  assert.strictEqual(ehItemDeCatalogo('Cabo flexível 2,5 mm²', 0.01), true);
  const ctrl = ler('backend', 'src', 'controllers', 'materiaisController.js');
  assert.ok(!/d\.preco \|\| 0/.test(ctrl), 'sem o fallback que gravava zero');
  assert.match(ctrl, /d\.preco >= 0\.01/);
  assert.match(ctrl, /preco >= 0\.01\)\) \{ semPreco\+\+/);
  const cat = ler('backend', 'src', 'services', 'catalogoMateriais.js');
  assert.match(cat, /arredondar\(n\) >= 0\.01/);
  assert.ok(!/preco <= 0\) return null/.test(cat));
});

caso('aprendizado: telefonia não é mais o ramo de cabeamento (rede continua)', () => {
  const { ramoDe, daDisciplina } = require('../src/services/analiseCad/aprendidoNoDesenho');
  assert.strictEqual(ramoDe('telefonia'), 'telefonia');
  assert.strictEqual(ramoDe('rede'), 'cabeamento');
  assert.strictEqual(daDisciplina('telefonia', ['cabeamento']), false);
  assert.strictEqual(daDisciplina('rede', ['cabeamento']), true);
});

caso('circuito de poste (modelo-3d): cabo terra na seção comercial pela Tabela 58', () => {
  const fonte = ler('skills', 'modelo-3d', 'scripts', 'circuitos-externos.js');
  assert.ok(!/s \/ 2\)/.test(fonte), 'sem a cópia que devolvia S/2 cru');
  const { secaoPE } = require(path.join(RAIZ, 'skills', '_comum', 'eletrico', 'tabelas'));
  assert.strictEqual(secaoPE(95), 50);
  assert.strictEqual(secaoPE(120), 70);
});

caso('tomada alta: a legenda, a análise do CAD e o 3D usam a mesma altura (2,20 m)', () => {
  const { SIMBOLOS } = require(path.join(RAIZ, 'skills', '_comum', 'cad', 'simbolos'));
  assert.match(SIMBOLOS['HM-ELE-TOMADA-ALTA'].legenda, /h = 2,20 m/);
  const { BLOCOS_HM } = require(path.join(RAIZ, 'skills', '_comum', 'cad', 'disciplinasCad'));
  assert.strictEqual(BLOCOS_HM['HM-ELE-TOMADA-ALTA'].altura_m, 2.2);
  assert.match(ler('skills', '_comum', 'cad', 'modelo3d.js'), /'HM-ELE-TOMADA-ALTA': \{ h: 2\.2,/);
});

caso('pasta: só o dono, o admin ou o registro sem dono grava a cópia (PDF da proposta e relatório da análise)', () => {
  const { podeAlterar } = require('../src/middleware/posse');
  assert.strictEqual(podeAlterar({ id: 2, role: 'user' }, 2), true);
  assert.strictEqual(podeAlterar({ id: 3, role: 'user' }, 2), false);
  assert.strictEqual(podeAlterar({ id: 3, role: 'admin' }, 2), true);
  assert.strictEqual(podeAlterar({ id: 3, role: 'user' }, null), true);
  assert.match(ler('backend', 'src', 'controllers', 'propostaDocumentos.js'), /if \(podeAlterar\(req\.usuario, resultado\.proposta\.usuario_id\)\) await salvarPdfPropostaNasPastas/);
  assert.match(ler('backend', 'src', 'controllers', 'projetos', 'analises.js'), /if \(podeAlterar\(req\.usuario, result\.rows\[0\]\.usuario_id\)\) await seguro\(`relatório análise/);
});

caso('fornecedor: renomear exige administrador e registra na auditoria', () => {
  const rotas = [];
  const router = { get: () => {}, put: (url, ...mw) => rotas.push({ url, mw }) };
  const admin = () => {};
  require('../src/routes/v2/cotacoesFornecedor')(router, { autenticar: () => {}, admin, validarId: () => {} });
  const put = rotas.find(r => r.url === '/cotacoes/fornecedores/:cnpj');
  assert.ok(put && put.mw.includes(admin), 'PUT sem o middleware admin');
  assert.match(ler('backend', 'src', 'routes', 'v2', 'cotacoesFornecedor.js'), /registrarAuditoria\(pool, \{\s*entidade: 'cotacao_fornecedor', acao: 'renomear'/);
});

caso('especificação: grava dados somando a versão (a tela do laudo aberta recebe 409 em vez de apagar)', () => {
  const fonte = ler('backend', 'src', 'services', 'projetoEspecificacao.js');
  const updates = fonte.split('\n').filter(l => /UPDATE laudos_projetos SET dados/.test(l));
  assert.ok(updates.length >= 2);
  for (const u of updates) assert.match(u, /versao = versao \+ 1/, u);
  assert.match(fonte, /AND versao = \$4/);
});

caso('mapa do CAD: equipamento da subestação (HM-EQ-*) é da média tensão, não da elétrica predial', () => {
  const { disciplinaDoSimbolo } = require('../src/services/mapaCad');
  assert.strictEqual(disciplinaDoSimbolo('HM-EQ-TRANSFORMADOR'), 'media_tensao');
  assert.strictEqual(disciplinaDoSimbolo('HM-EQ-CUBICULO'), 'media_tensao');
  assert.strictEqual(disciplinaDoSimbolo('HM-ELE-QUADRO'), 'eletrica');
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`revisão 2.36: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
