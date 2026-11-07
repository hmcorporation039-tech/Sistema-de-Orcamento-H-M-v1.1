// Treino por disciplina (03/11/2026: "faça com que o sistema sempre aprenda por disciplinas. Em relação às planilhas,
// usem apenas os materiais que não têm no sistema"): disciplina do arquivo pelo nome/pastas, disciplina do material,
// leitura de planilha de qualquer layout (seções da planilha geral de obra, preço do material × mão de obra) e o
// treino gravando SÓ o material novo — o que o catálogo já tem não muda. Arquivos, descrições e preços SINTÉTICOS.
// A parte de banco só roda com DB_NAME=hm_orcamentos_v2. Rodar: node testes/treinoPorDisciplina.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');
const { disciplinaDoArquivo, disciplinaDoTexto } = require('../src/utils/disciplinaDoArquivo');
const { disciplinaDoMaterial } = require('../src/utils/disciplinaDoMaterial');
const { lerPlanilhaMateriais } = require('../src/utils/leitorPlanilhaMateriais');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

// planilha geral de obra sintética: seções numeradas, material e mão de obra separados, subtotal
function planilhaGeral(sufixo) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Planilha orçamentária');
  ws.addRow(['OBRA TESTE']);
  ws.addRow([]);
  ws.addRow(['ITEM', 'DESCRIÇÃO DO SERVIÇO', 'UND', 'QUANT', 'UNIT MO', 'UNIT MAT', 'VALOR UNIT COM BDI']);
  ws.addRow(['12', 'PINTURA']);
  ws.addRow(['12.1', `Tinta acrílica fosca ${sufixo}`, 'gl', 2, 10, 300, 400]);
  ws.addRow(['13', 'INSTALAÇÕES ELÉTRICAS']);
  ws.addRow(['13.1', `Disjuntor termomagnético bipolar 40 A ${sufixo}`, 'un', 3, 20, 85.5, 130]);
  ws.addRow(['13.2', `Instalação de quadro de distribuição ${sufixo}`, 'un', 1, 500, 0, 600]);
  ws.addRow(['13.3', 'INFRAESTRUTURA']);
  ws.addRow(['13.3.1', `Eletrocalha perfurada 100x50 mm ${sufixo}`, 'm', 40, 8, 42, 60]);
  ws.addRow(['13.3.2', `Abraçadeira tipo D 3/4" ${sufixo}`, 'un', 50, 1, '', '']);
  ws.addRow(['', 'Subtotal – 13. Instalações elétricas']);
  ws.addRow(['15', 'INSTALAÇÕES HIDROSSANITÁRIAS']);
  ws.addRow(['15.1', `Tê 90° soldável PVC marrom 25 mm ${sufixo}`, 'un', 10, 2, 3.2, 6]);
  ws.addRow(['16', 'SISTEMA DE VOZ E DADOS']);
  ws.addRow(['16.1', `Patch panel Cat.6 24 portas ${sufixo}`, 'un', 2, 30, 650, 800]);
  ws.addRow(['16.2', `Conectorização de ponto de rede ${sufixo}`, 'pt', 24, 40, 0, 50]);
  wb.addWorksheet('SINAPI').addRow(['DESCRIÇÃO', 'UN', 'QTD']); // base de preço: não é lista da obra
  return wb;
}

(async () => {
  await caso('disciplina do arquivo: nome primeiro, depois as pastas; outra disciplina fica de fora', () => {
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/PARTE 2/ELETRICA/001_ELE_ALM-01_CAMPUS_EXE.pdf'), { chave: 'alarme', origem: 'nome' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/Arquitetura/ELE_OBRA_R00.dwg'), { chave: 'eletrica', origem: 'nome' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/Arquitetura/planta-baixa.dwg'), { fora: 'Arquitetura' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/5000 - Eletrica/5300 - Cabeamento Estruturado/LM-XYZ-5300-R00.xlsx'), { chave: 'cabeamento', origem: 'nome' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/02 Planta de Hidráulica.pdf'), { fora: 'Hidráulica' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/07 Planta de Forro e Ar Condicionado.pdf'), { chave: 'climatizacao', origem: 'nome' });
    assert.strictEqual(disciplinaDoArquivo('Sol Nascente/casa.dwg'), null, '"Sol" de bairro não é solar');
    assert.deepStrictEqual(disciplinaDoTexto('INSTALAÇÃO DE ESGOTO E VENTILAÇÃO'), { fora: 'Hidráulica' });
    assert.deepStrictEqual(disciplinaDoTexto('16.2 SPRINKLERS'), { fora: 'Civil' });
    assert.deepStrictEqual(disciplinaDoTexto('SISTEMA DE PREVENÇÃO E COMBATE A INCÊNDIO'), { chave: 'incendio' });
    assert.strictEqual(disciplinaDoTexto('Cobertura 1201'), null);
    // revisão de 06/11/2026: o nome da pasta do CLIENTE não diz disciplina; o arquivo pode dizer várias; Solar/Concreto/
    // Limpeza só com contexto técnico
    assert.deepStrictEqual(disciplinaDoArquivo('Nossa Senhora/Paroquia_NSA_Incendio_CFTV_Cabeamento_R04.dxf'),
      { chave: 'incendio', chaves: ['incendio', 'cftv', 'cabeamento'], origem: 'nome' });
    assert.strictEqual(disciplinaDoArquivo('Condominio Solar das Palmeiras/Obras/Reforma/Planta Baixa R01.dwg'), null);
    assert.strictEqual(disciplinaDoArquivo('SLU - Servico de Limpeza Urbana/Obras/Sede/Planta Baixa R01.dwg'), null);
    assert.strictEqual(disciplinaDoArquivo('Concreto Forte Construtora/Obras/Galpao/QD-01 unifilar.dwg'), null);
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/Obras/Usina/Usina Solar Fotovoltaica 75 kWp.dwg'), { chave: 'solar', origem: 'nome' });
    assert.deepStrictEqual(disciplinaDoArquivo('Cliente/Obras/Galpao/Estrutura de concreto armado/forma.dwg'), { fora: 'Estrutura' });
    assert.deepStrictEqual(disciplinaDoArquivo('C:/Servidor/Clientes/Instalacoes Eletricas Ltda/Obras/Loja/CFTV/cameras.dwg'), { chave: 'cftv', origem: 'pasta' });
    // no texto solto (seção da planilha) a palavra vale como sempre
    assert.deepStrictEqual(disciplinaDoTexto('12.4 LIMPEZA'), { fora: 'Civil' });
  });

  await caso('disciplina do material: palavra própria > obra de fora > infraestrutura da lista > categoria > apoio', () => {
    assert.strictEqual(disciplinaDoMaterial('Detector de fumaça óptico endereçável', { categoria: 'Alarme' }), 'incendio');
    assert.strictEqual(disciplinaDoMaterial('Câmera bullet IP 4 MP', { categoria: 'Redes / Cabeamento Estruturado', contexto: 'cabeamento' }), 'cftv');
    assert.strictEqual(disciplinaDoMaterial('Tê 90° soldável PVC rígido marrom 25 mm', { categoria: 'Infraestrutura', contexto: 'eletrica' }), null);
    assert.strictEqual(disciplinaDoMaterial('Eletroduto PVC rígido roscável 3/4"', { categoria: 'Infraestrutura' }), 'eletrica');
    assert.strictEqual(disciplinaDoMaterial('Eletroduto galvanizado 1"', { categoria: 'Infraestrutura', contexto: 'cftv' }), 'cftv');
    assert.strictEqual(disciplinaDoMaterial('Placa de gesso acartonado 12,5 mm', { categoria: null, contexto: 'eletrica' }), null);
    assert.strictEqual(disciplinaDoMaterial('Parafuso sextavado 1/4" com bucha', { categoria: 'Ferragens', contexto: 'cabeamento' }), 'cabeamento');
    assert.strictEqual(disciplinaDoMaterial('Parafuso sextavado 1/4" com bucha', { categoria: 'Ferragens' }), null, 'apoio sem disciplina da lista não entra');
    assert.strictEqual(disciplinaDoMaterial('Disjuntor bipolar 40 A', { categoria: 'Elétrica', contexto: 'climatizacao' }), 'eletrica');
  });

  await caso('planilha de qualquer layout: preço do material, seções, subtotal e base de preço de fora', () => {
    const abas = lerPlanilhaMateriais(planilhaGeral('S'));
    assert.deepStrictEqual(abas.map(a => a.aba), ['Planilha orçamentária'], 'a aba SINAPI não é lida');
    const it = abas[0].itens;
    const de = (txt) => it.find(i => i.descricao.includes(txt));
    assert.strictEqual(de('Disjuntor').preco, 85.5, 'UNIT MAT, não UNIT MO nem o "com BDI"');
    assert.deepStrictEqual(de('Disjuntor').secao, { chave: 'eletrica' });
    assert.deepStrictEqual(de('Eletrocalha').secao, { chave: 'eletrica' }, '13.3 INFRAESTRUTURA fica com a disciplina do 13');
    assert.strictEqual(de('Abraçadeira').preco, null);
    assert.deepStrictEqual(de('Tinta').secao, { fora: 'Civil' });
    assert.deepStrictEqual(de('Tê 90°').secao, { fora: 'Hidráulica' });
    assert.deepStrictEqual(de('Patch panel').secao, { chave: 'cabeamento' });
    assert.ok(!it.some(i => /Subtotal|INFRAESTRUTURA|PINTURA/.test(i.descricao)), 'título e subtotal não são item');
  });

  if (process.env.DB_NAME !== 'hm_orcamentos_v2') {
    console.log(`treinoPorDisciplina: ${ok} casos ok (parte de banco pulada: DB_NAME=${process.env.DB_NAME || '(vazio)'})`);
    return;
  }
  const pool = require('../src/config/database');
  try {
    for (const m of ['2.0-49-treino-com-o-acervo', '2.0-50-treino-por-disciplina', '2.0-50-treino-por-disciplina']) await require(`../src/models/migracoes/${m}`)(pool); // idempotente

    await caso('treino com a planilha: só o material novo entra (com preço no catálogo, sem preço como conhecido); o existente não muda', async () => {
      const { aprenderDaPlanilha } = require('../src/services/treinoMateriais');
      const s = `T${Date.now()}`;
      const { rows: [ja] } = await pool.query(`INSERT INTO materiais (descricao, categoria, unidade, preco, origem) VALUES ($1, 'Redes / Cabeamento Estruturado', 'un', 999, 'manual') RETURNING id`, [`Patch panel Cat.6 24 portas ${s}`]);
      try {
        const r = await aprenderDaPlanilha(planilhaGeral(s), { arquivo: `geral-${s}.xlsx` });
        assert.strictEqual(r.novos, 2, JSON.stringify(r)); // disjuntor e eletrocalha
        assert.strictEqual(r.semPreco, 1); // abraçadeira
        assert.strictEqual(r.existentes, 1); // o patch panel que já existia
        assert.strictEqual(r.servicos, 2); // instalação e conectorização
        assert.strictEqual(r.semDisciplina, 2); // tinta (civil) e tê soldável (hidráulica)
        const { rows } = await pool.query(`SELECT descricao, preco, origem, categoria FROM materiais WHERE descricao LIKE $1 ORDER BY descricao`, [`%${s}`]);
        const disj = rows.find(x => /Disjuntor/.test(x.descricao));
        assert.deepStrictEqual([Number(disj.preco), disj.origem], [85.5, 'acervo']);
        assert.strictEqual(Number(rows.find(x => /Patch/.test(x.descricao)).preco), 999, 'o existente não muda de preço');
        assert.ok(!rows.some(x => /Abraçadeira|Tinta|Tê 90/.test(x.descricao)), 'sem preço e de fora não vão ao catálogo');
        const { rows: am } = await pool.query(`SELECT descricao, disciplina, material_id FROM acervo_materiais WHERE descricao LIKE $1 ORDER BY descricao`, [`%${s}`]);
        assert.deepStrictEqual(am.map(x => [x.descricao.split(' ')[0], x.disciplina, x.material_id != null]), [['Abraçadeira', 'eletrica', false], ['Disjuntor', 'eletrica', true], ['Eletrocalha', 'eletrica', true]]);
        // a mesma planilha de novo: nada novo (já existe), e nada muda
        const r2 = await aprenderDaPlanilha(planilhaGeral(s), { arquivo: `geral-${s}.xlsx` });
        assert.strictEqual(r2.novos, 0);
      } finally {
        await pool.query('DELETE FROM acervo_materiais WHERE descricao LIKE $1', [`%${s}`]);
        await pool.query('DELETE FROM materiais WHERE descricao LIKE $1', [`%${s}`]);
        await pool.query('DELETE FROM materiais WHERE id = $1', [ja.id]);
      }
    });

    await caso('treino com o acervo: disciplina do caminho vai ao leitor e ao aprendizado; arquitetura não é lida', async () => {
      const { treinar } = require('../src/services/treinoAcervo');
      const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'acervo-disc-'));
      const s = Date.now();
      fs.mkdirSync(path.join(raiz, 'Cliente Y', 'Arquitetura'), { recursive: true });
      fs.mkdirSync(path.join(raiz, 'Cliente Y', 'CFTV'), { recursive: true });
      fs.writeFileSync(path.join(raiz, 'Cliente Y', 'Arquitetura', `planta-${s}.dwg`), `arq ${s}`);
      fs.writeFileSync(path.join(raiz, 'Cliente Y', 'CFTV', `cameras-${s}.dxf`), `cftv ${s}`);
      fs.writeFileSync(path.join(raiz, 'Cliente Y', `PROPOSTA COMERCIAL ${s}.pdf`), 'x'); // proposta da H&M: não entra
      const vistas = [];
      const ler = async (buffer, nome, o) => { vistas.push([nome, o.disciplinas]); return { aprendizado: {}, mapa: { simbolos: [] } }; };
      const aprendidas = [];
      const aprender = async (r, nome, o) => { aprendidas.push(o.disciplina); return { simbolos: 0, notas: 0, blocos: 0 }; };
      try {
        const r = await treinar({ raiz, ler, aprender, tipos: ['cad'] });
        assert.deepStrictEqual([r.total, r.lidos, r.ignorados, r.erros], [2, 1, 1, 0]);
        assert.deepStrictEqual(vistas, [[`cameras-${s}.dxf`, ['cftv']]]);
        assert.deepStrictEqual(aprendidas, ['cftv']);
        const { rows } = await pool.query('SELECT caminho, situacao, disciplina, resumo FROM acervo_treino WHERE caminho LIKE $1 ORDER BY caminho', [`%${s}%`]);
        assert.deepStrictEqual(rows.map(x => [x.situacao, x.disciplina]), [['ignorado', null], ['lido', 'cftv']]);
        assert.strictEqual(rows[0].resumo.fora, 'Arquitetura');
      } finally {
        await pool.query('DELETE FROM acervo_treino WHERE caminho LIKE $1', [`%${s}%`]);
        fs.rmSync(raiz, { recursive: true, force: true });
      }
    });
    await caso('treino: erro passageiro é relido (até 3 vezes, com espera); ignorado por regra antiga é reavaliado; a obra é quem ensina', async () => {
      await require('../src/models/migracoes/2.0-53-aprendizado-por-disciplina')(pool);
      const { treinar, paraTestes: { pendente, fonteDoCaminho, MAX_TENTATIVAS } } = require('../src/services/treinoAcervo');
      const { REGRA_VERSAO } = require('../src/utils/disciplinaDoArquivo');
      const agora = Date.now();
      const arq = { tamanho: 10, modificado: new Date(agora - 86400000) };
      const base = { tamanho: 10, modificado_em: arq.modificado };
      assert.strictEqual(pendente(null, arq), true);
      assert.strictEqual(pendente({ ...base, situacao: 'lido' }, arq), false);
      assert.strictEqual(pendente({ ...base, situacao: 'erro', tentativas: 1, lido_em: new Date(agora - 2 * 3600000) }, arq, agora), true, 'erro de 2 h atrás: tenta de novo');
      assert.strictEqual(pendente({ ...base, situacao: 'erro', tentativas: 1, lido_em: new Date(agora - 60000) }, arq, agora), false, 'espera entre tentativas');
      assert.strictEqual(pendente({ ...base, situacao: 'erro', tentativas: MAX_TENTATIVAS, lido_em: new Date(0) }, arq, agora), false, 'depois de 3, não insiste');
      assert.strictEqual(pendente({ ...base, situacao: 'ignorado', regra_disciplina: REGRA_VERSAO - 1 }, arq), true, 'regra mudou: reavalia');
      assert.strictEqual(pendente({ ...base, situacao: 'ignorado', regra_disciplina: REGRA_VERSAO }, arq), false);
      assert.strictEqual(fonteDoCaminho('Cli/Obras/Hospital/Eletrica/PLANTA R01.dwg'), 'acervo:Cli/Obras/Hospital');
      assert.strictEqual(fonteDoCaminho('Cli/Obras/Hospital/Eletrica/PLANTA R02.dwg'), 'acervo:Cli/Obras/Hospital', 'R01 e R02 da obra: um projeto');
      assert.notStrictEqual(fonteDoCaminho('Outro/Obras/Escola/PLANTA ELETRICA.dwg'), fonteDoCaminho('Cli/Obras/Hospital/PLANTA ELETRICA.dwg'));

      const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'acervo-erro-'));
      const s = Date.now();
      fs.mkdirSync(path.join(raiz, 'Cliente Z', 'Obras', 'Obra A'), { recursive: true });
      fs.writeFileSync(path.join(raiz, 'Cliente Z', 'Obras', 'Obra A', `ele-${s}.dxf`), `ele ${s}`);
      let vez = 0;
      const fontes = [];
      const ler = async () => { vez++; if (vez === 1) throw new Error('tempo-limite (passageiro)'); return { aprendizado: {}, mapa: { simbolos: [] } }; };
      const aprender = async (r, nome, o) => { fontes.push(o.fonte); return { simbolos: 0, notas: 0, blocos: 0 }; };
      try {
        const r1 = await treinar({ raiz, ler, aprender, tipos: ['cad'] });
        assert.deepStrictEqual([r1.erros, r1.lidos], [1, 0]);
        const linha = async () => (await pool.query('SELECT situacao, tentativas FROM acervo_treino WHERE caminho LIKE $1', [`%ele-${s}.dxf`])).rows[0];
        assert.deepStrictEqual(await linha(), { situacao: 'erro', tentativas: 1 });
        // a próxima rodada antes da espera não relê; depois da espera relê e lê
        assert.strictEqual((await treinar({ raiz, ler, aprender, tipos: ['cad'] })).pendentes, 0);
        await pool.query("UPDATE acervo_treino SET lido_em = NOW() - INTERVAL '2 hours' WHERE caminho LIKE $1", [`%ele-${s}.dxf`]);
        const r3 = await treinar({ raiz, ler, aprender, tipos: ['cad'] });
        assert.deepStrictEqual([r3.lidos, r3.erros], [1, 0]);
        assert.deepStrictEqual(await linha(), { situacao: 'lido', tentativas: 0 });
        assert.deepStrictEqual(fontes, ['acervo:Cliente Z/Obras/Obra A']);
      } finally {
        await pool.query('DELETE FROM acervo_treino WHERE caminho LIKE $1', [`%-${s}.dxf`]);
        fs.rmSync(raiz, { recursive: true, force: true });
      }
    });

    await caso('treino: o material de uma planilha que deu ROLLBACK não fica no índice da rodada', async () => {
      const tm = require('../src/services/treinoMateriais');
      const ctx = await tm.prepararContexto();
      const s = Date.now();
      const desc = `Disjuntor termomagnético tripolar 63 A teste rollback ${s}`;
      const antes = ctx.catalogo.length;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const novos = [];
        await tm.aprenderDoDocumento([{ descricao: desc, unidade: 'un', preco: 99.9 }], { disciplina: 'eletrica', arquivo: `rollback-${s}.pdf`, ctx, client, novos });
        assert.strictEqual(novos.length, 1, 'cadastrado dentro da transação de quem chamou');
        assert.strictEqual(ctx.catalogo.length, antes, 'antes do COMMIT, fora do índice da rodada');
        await client.query('ROLLBACK');
        // (quem chama só indexa depois do COMMIT — treinoAcervo); sem o COMMIT o material não existe e não está no índice
        const { rows } = await pool.query('SELECT id FROM materiais WHERE descricao = $1', [desc]);
        assert.strictEqual(rows.length, 0);
        assert.ok(!ctx.catalogo.some(m => m.descricao === desc));
      } finally {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        await pool.query('DELETE FROM acervo_materiais WHERE descricao = $1', [desc]);
        await pool.query('DELETE FROM materiais WHERE descricao = $1', [desc]);
      }
    });
  } finally {
    await pool.end();
  }
  console.log(`treinoPorDisciplina: ${ok} casos ok`);
})().catch((e) => { console.error(e); process.exit(1); });
