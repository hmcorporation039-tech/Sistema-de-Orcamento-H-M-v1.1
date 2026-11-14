// Caderno de fabricação e montagem dos quadros DDC (scripts/lib/caderno.js) — dados SINTÉTICOS
// (o exemplo comercial fictício e o residencial, que não tem DDC). Confere: pontos repartidos sem
// perder nenhum, E/S com a reserva da skill, relés de interface por saída digital, fonte 24 Vcc,
// lista de materiais com preço, timbrado, escape e o PDF.
const motor = require('../scripts/lib/index');
const CAD = require('../scripts/lib/caderno');
const { gerarCadernoHtml } = require('../../_comum/fabricacao/caderno');
const { verificador } = require('../../_comum/teste');
const { igual, fim } = verificador('automação (caderno dos quadros DDC)');

const res = motor.processar(motor.exemplo());
const bms = res.calc.bms;
igual('documento "caderno" (PDF) registrado e disponível no comercial', [motor.documentos.some(d => d.tipo === 'caderno' && d.formato === 'PDF'), motor.tiposDisponiveis(res).includes('caderno')], [true, true]);
const resRes = motor.processar(require('../exemplos/exemplo-residencia.json'));
igual('residencial sem BMS: caderno indisponível', motor.tiposDisponiveis(resRes).includes('caderno'), false);

const qs = CAD.repartir(bms);
igual('quadros = os da skill; nenhum ponto perdido na repartição', [qs.length, qs.reduce((s, q) => s + q.fisicos, 0), ['di', 'do', 'ai', 'ao'].map(t => qs.reduce((s, q) => s + q.pontos[t], 0))], [bms.quadros, bms.fisicos, [bms.tot.di, bms.tot.do, bms.tot.ai, bms.tot.ao]]);
igual('controladores por quadro ≥ pontos com reserva / pontos por controlador', qs.every(q => q.controladores * bms.pontosPorControlador >= q.comReserva), true);

const cad = CAD.montarCaderno(res);
igual('sigla e um capítulo de pontos por quadro', [cad.sigla, cad.secoes.filter(s => /lista de pontos/.test(s.titulo)).length], ['CAD-DDC', qs.length]);
igual('controlador DDC no lugar da CPU genérica', [cad.componentes.some(k => /Controlador DDC/.test(k.descricao)), cad.componentes.some(k => /CPU compacta/.test(k.descricao))], [true, false]);
// relés de interface = saídas digitais de cada quadro (o motor de quadros: um por DO)
const kas = (tag) => cad.componentes.filter(k => k.tag.startsWith(`${tag}/KA`)).reduce((s, k) => s + k.quantidade, 0);
igual('um relé de interface por saída digital', qs.map(q => kas(q.tag)), qs.map(q => q.pontos.do));
igual('fonte 24 Vcc em cada quadro', qs.every(q => cad.componentes.some(k => k.tag === `${q.tag}/G1` && /24 Vcc/.test(k.descricao))), true);
igual('teste ponto a ponto das E/S na verificação', cad.verificacoes.some(v => /E\/S ponto a ponto/.test(v.item)), true);
igual('lista de materiais com preço unitário e total', cad.secoes.some(s => /Lista de materiais/.test(s.titulo) && s.tabela.colunas.includes('Preço unit.')), true);
igual('aviso "nenhum circuito" do motor de quadros filtrado', cad.avisos.some(a => /Nenhum circuito ou motor/.test(a)), false);

const ex = motor.exemplo(); ex.cliente = { ...(ex.cliente || {}), nome: 'Edifício <i>x</i> & Cia' };
const html = gerarCadernoHtml(CAD.montarCaderno(motor.processar(ex)));
igual('timbrado (data URI) e cliente escapado', [/src="data:image\/png;base64,/.test(html), html.includes('<i>x</i>'), html.includes('Edifício &lt;i&gt;x&lt;/i&gt; &amp; Cia')], [true, false, true]);

(async () => {
  try {
    const doc = await motor.gerarDocumento(res, 'caderno');
    igual('PDF do caderno dos quadros DDC', [doc.buffer.slice(0, 4).toString(), doc.mime], ['%PDF', 'application/pdf']);
  } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; console.log('  (puppeteer ausente — PDF não testado)'); }
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
