// Análise de ELABORAÇÃO de projeto em cima da arquitetura (versão 2.45, 18/11/2026). Pedido do usuário: o sistema via
// os pavimentos da paróquia N. S. da Assunção como um só, não lia os nomes das salas e, no "elaborar projeto", só
// supunha quantidades ("Área (20,78 m²)", "Ambiente 3 sem nome" e um quarto com câmera). Agora a leitura do DWG/DXF
// separa os pavimentos e, na elaboração, o projetista do sistema (skills/_comum/cad/projetista.js) põe cada componente
// no ambiente, traça a infraestrutura e mede os cabos — e isso chega aos itens, ao 3D, ao editor e ao formulário da skill.
// DXF SINTÉTICO (nenhum dado de cliente). Rodar: node testes/elaboracaoProjeto.test.js
const assert = require('assert');
const { lerArquivoCad } = require('../src/services/analiseCad');
const { dadosDaAnalise } = require('../src/utils/ponteAnaliseSkill');
const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
const { achadosDoDesenho } = require('../src/utils/analiseProjetoAchados');
const { dispositivosDoEspacial } = require('../src/services/modelo3d');

let ok = 0;
const caso = async (nome, fn) => {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};

// ── duas plantas encostadas (térreo e 1º pavimento), 4 salas etiquetadas cada ─────────────────────────────
const dxfR = (ents) => ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', 6, '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
const L = (x1, y1, x2, y2, layer = '0') => ['0', 'LINE', '8', layer, '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0];
const T = (s, x, y, h = 0.15, layer = 'TEXTO') => ['0', 'TEXT', '8', layer, '10', x, '20', y, '30', 0, '40', h, '1', s];
const RET = (x0, y0, x1, y1, layer) => [L(x0, y0, x1, y0, layer), L(x1, y0, x1, y1, layer), L(x1, y1, x0, y1, layer), L(x0, y1, x0, y0, layer)];
function planta(dx, nomes, titulo) {
  const e = [...RET(1 + dx, 1, 19 + dx, 11, 'ALVENARIA'), ...RET(1.15 + dx, 1.15, 18.85 + dx, 10.85, 'ALVENARIA')];
  for (const x of [10, 10.15]) e.push(L(x + dx, 1.15, x + dx, 3, 'ALVENARIA'), L(x + dx, 4, x + dx, 8, 'ALVENARIA'), L(x + dx, 9, x + dx, 10.85, 'ALVENARIA'));
  for (const y of [3, 4, 8, 9]) e.push(L(10 + dx, y, 10.15 + dx, y, 'ALVENARIA'));
  for (const y of [6, 6.15]) e.push(L(1.15 + dx, y, 5 + dx, y, 'ALVENARIA'), L(6 + dx, y, 10 + dx, y, 'ALVENARIA'), L(10.15 + dx, y, 14 + dx, y, 'ALVENARIA'), L(15 + dx, y, 18.85 + dx, y, 'ALVENARIA'));
  for (const x of [5, 6, 14, 15]) e.push(L(x + dx, 6, x + dx, 6.15, 'ALVENARIA'));
  [[1.15, 1.15, 10, 6], [10.15, 1.15, 18.85, 6], [1.15, 6.15, 10, 10.85], [10.15, 6.15, 18.85, 10.85]].forEach(([x0, y0, x1, y1], i) => {
    const cx = (x0 + x1) / 2 - 1 + dx, cy = (y0 + y1) / 2;
    e.push(T(nomes[i], cx, cy + 0.25, 0.15, '#ARQUITETURA HACHURA'), T(`Área: ${((x1 - x0) * (y1 - y0)).toFixed(2).replace('.', ',')} m²`, cx, cy, 0.1, '#ARQUITETURA HACHURA'));
  });
  e.push(T(titulo, 2 + dx, -1, 0.3, '#ARQUITETURA TEXTO'), ...RET(0 + dx, -2, 20 + dx, 14, '#ARQUITETURA PRANCHA'));
  return e;
}
const DXF = Buffer.from(dxfR([
  ...planta(0, ['SECRETARIA', 'CPD', 'CIRCULAÇÃO', 'BANHEIRO'], 'PLANTA BAIXA - TÉRREO'),
  ...planta(20, ['QUARTO - 01', 'SALA DE ESTAR', 'CAPELA', 'DEPÓSITO'], 'PLANTA BAIXA - 1º PAVIMENTO'),
  L(0, 12.5, 40, 12.5, 'LIMITE'),
]), 'utf8');

(async () => {
  const elab = await lerArquivoCad(DXF, 'arquitetura-sintetica.dxf', { disciplinas: ['cftv', 'incendio'], finalidade: 'elaboracao' });
  const sug = elab.pagina.projetoSugerido;

  await caso('leitura: dois pavimentos e cada ambiente com o seu (e a área escrita pelo arquiteto)', async () => {
    assert.deepStrictEqual(elab.pavimentos.map(p => p.nome), ['Térreo', '1º pavimento']);
    const cap = elab.analise.ambientes.find(a => a.nome === 'CAPELA');
    assert.strictEqual(cap.pavimento, '1º pavimento');
    assert.ok(cap.area_projeto_m2 > 40);
    assert.strictEqual(elab.analise.ambientes.filter(a => a.pavimento === 'Térreo').length, 4);
  });

  await caso('elaboração: o projeto sugerido vira itens contados (marcados "projetista") com o traçado e os cabos medidos', async () => {
    assert.ok(sug && !sug.erro, JSON.stringify(sug));
    assert.deepStrictEqual(sug.disciplinas, ['cftv', 'incendio']);
    assert.deepStrictEqual(sug.pavimentos, ['Térreo', '1º pavimento']);
    const cam = elab.pagina.itens.filter(i => i.tipo === 'simbolo' && i.disciplina === 'cftv' && /C[âa]mera/i.test(i.descricao));
    assert.ok(cam.length && cam.every(i => i.origemDescricao === 'projetista' && !i.conferir), JSON.stringify(cam));
    assert.ok(cam.reduce((s, i) => s + i.quantidade, 0) >= 4);
    const det = elab.pagina.itens.find(i => i.disciplina === 'incendio' && /Detector de fumaça/.test(i.descricao));
    assert.ok(det && det.quantidade >= 6, 'detectores');
    const linhas = elab.pagina.itens.filter(i => i.tipo === 'linha' && i.origemDescricao === 'projetista');
    assert.ok(linhas.some(l => /Cabo U\/UTP/.test(l.descricao) && l.metros > 0), 'cabo de CFTV');
    assert.ok(linhas.some(l => /laço classe A/.test(l.descricao) && l.metros > 0), 'laço de incêndio');
    // cada componente com o lugar e o porquê (a tela mostra)
    assert.ok(sug.pontos.every(p => p.ambiente && p.pavimento && p.motivo));
    assert.ok(!sug.pontos.some(p => p.simbolo === 'HM-CFTV-CAMERA' && /BANHEIRO|QUARTO|ESTAR/.test(p.ambiente)), 'câmera em banheiro/quarto/estar');
    assert.match(elab.pagina.aviso, /projeto sugerido pelo sistema/);
  });

  await caso('3D: as posições e o traçado sugeridos estão no espacial (o 3D da análise mostra na hora)', async () => {
    const { dispositivos, trechos } = dispositivosDoEspacial(elab.espacial);
    assert.ok(dispositivos.some(d => d.simbolo === 'HM-CFTV-CAMERA'));
    assert.ok(dispositivos.some(d => d.simbolo === 'HM-INC-DETECTOR-FUMACA'));
    assert.ok(trechos.some(t => t.tipo === 'eletrocalha'));
    // pontos por ambiente com o pavimento no nome (duas salas iguais em pavimentos diferentes não se somam)
    assert.ok(elab.pontosPorAmbiente.some(p => p.ambiente === 'CAPELA (1º pavimento)' && p.cftv >= 2), JSON.stringify(elab.pontosPorAmbiente));
    assert.ok(!elab.pontosPorAmbiente.some(p => /CPD/.test(p.ambiente) && p.cftv > 1), 'o rack contou como câmera');
  });

  await caso('o projeto sugerido já sai compatibilizado: nenhum componente de disciplinas diferentes no mesmo ponto', async () => {
    const { compatibilizar } = require('../src/utils/compatibilidadeEspacial');
    const c = compatibilizar([{ arquivo: 'arquitetura-sintetica.dxf', disciplinas: ['cftv', 'incendio'], referencia: false, espacial: elab.espacial }]);
    const mesmo = c.conflitos.filter(x => x.tipo === 'mesmo_ponto');
    assert.strictEqual(mesmo.length, 0, JSON.stringify(mesmo));
  });

  await caso('orçamento (não elaboração): nada é projetado — a análise conta só o que está desenhado', async () => {
    const orc = await lerArquivoCad(DXF, 'arquitetura-sintetica.dxf', { disciplinas: ['cftv'], finalidade: 'orcamento' });
    assert.strictEqual(orc.pagina.projetoSugerido, undefined);
    assert.ok(!orc.pagina.itens.some(i => i.origemDescricao === 'projetista'));
    assert.deepStrictEqual(orc.pavimentos.map(p => p.nome), ['Térreo', '1º pavimento']);
  });

  await caso('o que o engenheiro retirou no 3D não volta na releitura', async () => {
    const cap = sug.pontos.find(p => p.simbolo === 'HM-CFTV-CAMERA');
    const pos = elab.espacial.pontos.find(p => p.simbolo === 'HM-CFTV-CAMERA');
    const edicoes = { adicionados: [], removidos: [{ id: 'r0123456789', x: pos.x, y: pos.y, simbolo: 'HM-CFTV-CAMERA' }] };
    const de2 = await lerArquivoCad(DXF, 'arquitetura-sintetica.dxf', { disciplinas: ['cftv'], finalidade: 'elaboracao', edicoes });
    const antes = sug.pontos.filter(p => p.simbolo === 'HM-CFTV-CAMERA').length;
    assert.ok(cap);
    assert.strictEqual(de2.pagina.projetoSugerido.pontos.filter(p => p.simbolo === 'HM-CFTV-CAMERA').length, antes - 1);
    assert.strictEqual(de2.pagina.projetoSugerido.retirados, 1);
  });

  await caso('formulário da skill de CFTV: as câmeras do projeto sugerido, por ambiente e pavimento, com o cabo medido', async () => {
    const analise = { cliente: 'Cliente Sintético', nomeProjeto: 'Projeto Sintético', ambientes: elab.analise.ambientes, pontosPorAmbiente: elab.pontosPorAmbiente, cameras: { total: 0 },
      dadosExtraidos: [{ arquivo: 'arquitetura-sintetica.dxf', projeto_sugerido: sug }] };
    const { dados, avisos } = dadosDaAnalise('cftv', motorDaDisciplina('cftv'), analise);
    const capela = dados.cameras.find(c => /^CAPELA \(1º pavimento\)$/.test(c.local));
    assert.ok(capela && capela.quantidade >= 2, JSON.stringify(dados.cameras));
    assert.ok(dados.cameras.every(c => c.distancia_cabo_m > 0));
    assert.ok(dados.cameras.some(c => c.distancia_cabo_m !== 30), 'cabo continua no típico de 30 m');
    assert.ok(!dados.cameras.some(c => /BANHEIRO|QUARTO|Ambiente \d/.test(c.local)));
    assert.ok(avisos.some(a => /projeto sugerido/.test(a)));
    motorDaDisciplina('cftv').processar(dados);
  });

  await caso('formulário da skill de incêndio: um pavimento por pavimento lido (não mais um "Térreo" só)', async () => {
    const analise = { cliente: 'Cliente Sintético', ambientes: elab.analise.ambientes, dadosExtraidos: [] };
    const { dados } = dadosDaAnalise('incendio', motorDaDisciplina('incendio'), analise);
    assert.deepStrictEqual(dados.pavimentos.map(p => p.nome), ['Térreo', '1º pavimento']);
    assert.ok(dados.ambientes.some(a => a.nome === 'CAPELA (1º pavimento)' && a.pavimento === '1º pavimento'));
  });

  await caso('achados: na elaboração, blocos de mobília e de climatização da arquitetura não viram pendência', async () => {
    const analises = [{ arquivo: 'a.dxf' }];
    const comProjeto = achadosDoDesenho(analises, [[{ origem: 'cad', naoIdentificados: [{ bloco: 'a.6sd50', quantidade: 24, layer: 'MOB' }], outraArea: 27, projetoSugerido: { componentes: 3 } }]]);
    assert.ok(!comProjeto.some(a => /Blocos do desenho não identificados|outras áreas/.test(a.tema)));
    const semProjeto = achadosDoDesenho(analises, [[{ origem: 'cad', naoIdentificados: [{ bloco: 'a.6sd50', quantidade: 24, layer: 'MOB' }], outraArea: 27 }]]);
    assert.ok(semProjeto.some(a => /Blocos do desenho não identificados/.test(a.tema)));
  });

  console.log(`elaboração de projeto: ${ok} casos ok`);
})();
