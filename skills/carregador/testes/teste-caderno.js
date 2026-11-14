// Caderno de fabricação e montagem do quadro de recarga (scripts/lib/caderno.js) — dados
// SINTÉTICOS (o exemplo fictício da skill e um segundo ponto trifásico sem RDC-DD). Confere:
// disjuntor e DR por ponto iguais aos do memorial, DR tipo A/B conforme o carregador, DPS,
// medição opcional, lista de materiais com preço, timbrado, escape e o PDF.
const motor = require('../scripts/lib/index');
const CAD = require('../scripts/lib/caderno');
const { gerarCadernoHtml } = require('../../_comum/fabricacao/caderno');
const { verificador } = require('../../_comum/teste');
const { igual, fim } = verificador('carregador (caderno do quadro de recarga)');

const res = motor.processar(motor.exemplo());
igual('documento "caderno" (PDF) registrado e disponível', [motor.documentos.some(d => d.tipo === 'caderno' && d.formato === 'PDF'), motor.tiposDisponiveis(res).includes('caderno')], [true, true]);
const cad = CAD.montarCaderno(res);
const c0 = res.calc.circuitos[0];
igual('disjuntor do ponto igual ao do memorial', cad.componentes.some(k => k.tag === `Q${c0.id}` && new RegExp(`${c0.disjuntor} A curva C`).test(k.descricao)), true);
igual('DR 30 mA tipo A exclusivo do ponto (RDC-DD no carregador)', cad.componentes.some(k => k.tag === `DR-${c0.id}` && /30 mA tipo A/.test(k.descricao)), true);
igual('DPS classe II no quadro', cad.componentes.some(k => /DPS classe II/.test(k.descricao)), true);
igual('sigla e normas (NBR 17019, NBR IEC 61439)', [cad.sigla, ['ABNT NBR 17019:2022', 'ABNT NBR IEC 61439-1'].every(c => cad.normas.some(n => n.codigo === c))], ['CAD-QDVE', true]);
igual('sem medição informada: aviso do campo e nenhum medidor', [cad.avisos.some(a => /instalacao\.medicao/.test(a)), cad.componentes.some(k => /^PM/.test(k.tag))], [true, false]);

// segundo ponto trifásico sem RDC-DD → DR tipo B; medição por ponto e geral
const ex = motor.exemplo();
ex.instalacao.medicao = 'ambas';
ex.instalacao.quadro_recarga_dedicado = true;
ex.pontos.push({ id: 'VE2', descricao: 'Vaga sintética 2', modo: 'modo3_ac', potencia_kw: 11, fases: '3', comprimento_m: 20, rdc_dd_incorporado: false });
const res2 = motor.processar(ex);
const cad2 = CAD.montarCaderno(res2);
igual('ponto sem RDC-DD → DR tipo B (4P)', cad2.componentes.some(k => k.tag === 'DR-VE2' && /4P .* 30 mA tipo B/.test(k.descricao)), true);
igual('medição: multimedidor geral + um medidor por ponto (lista de materiais)', [cad2.componentes.some(k => /Multimedidor/.test(k.descricao)), cad2.componentes.filter(k => /^PM/.test(k.tag)).length, cad2.secoes.find(s => /Lista de materiais/.test(s.titulo)).tabela.linhas.filter(l => Array.isArray(l) && l[0] === 'MED-VE').length], [true, 2, 2]);
igual('geral do QDVE = disjuntor do alimentador da skill', cad2.componentes.some(k => k.tag === 'Q0' && new RegExp(` ${res2.calc.alimentador.disjuntor} A`).test(k.descricao)), true);
igual('verificação do DR de cada ponto', ['VE1', 'VE2'].every(id => cad2.verificacoes.some(v => v.item === `DR do ponto ${id}`)), true);
igual('lista de materiais com preço unitário e total', cad2.secoes.some(s => /Lista de materiais/.test(s.titulo) && s.tabela.colunas.includes('Preço unit.') && s.tabela.colunas.includes('Total')), true);

const ex3 = motor.exemplo(); ex3.cliente = { ...(ex3.cliente || {}), nome: 'Cond. <b>teste</b> & Cia' };
const html = gerarCadernoHtml(CAD.montarCaderno(motor.processar(ex3)));
igual('timbrado (data URI) e cliente escapado', [/src="data:image\/png;base64,/.test(html), html.includes('<b>teste</b>'), html.includes('Cond. &lt;b&gt;teste&lt;/b&gt; &amp; Cia')], [true, false, true]);

(async () => {
  try {
    const doc = await motor.gerarDocumento(res, 'caderno');
    igual('PDF do caderno do quadro de recarga', [doc.buffer.slice(0, 4).toString(), doc.mime], ['%PDF', 'application/pdf']);
  } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; console.log('  (puppeteer ausente — PDF não testado)'); }
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
