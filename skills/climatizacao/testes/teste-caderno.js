// Caderno de fabricação e montagem do quadro da central de água gelada (scripts/lib/caderno.js)
// — dados SINTÉTICOS (o exemplo fictício da skill). Confere: alimentação de cada chiller, partida
// de cada bomba igual à do cálculo (direta / inversor), CLP com os sinais de intertravamento,
// seletoras, lista de materiais com preço, timbrado, escape e o PDF.
const motor = require('../scripts/lib/index');
const CAD = require('../scripts/lib/caderno');
const { gerarCadernoHtml } = require('../../_comum/fabricacao/caderno');
const { verificador } = require('../../_comum/teste');
const { igual, fim } = verificador('climatização (caderno do quadro da CAG)');

const res = motor.processar(motor.exemplo());
const ce = res.calc.projeto.central;
igual('documento "caderno" (PDF) registrado e disponível com chiller', [motor.documentos.some(d => d.tipo === 'caderno' && d.formato === 'PDF'), motor.tiposDisponiveis(res).includes('caderno')], [true, true]);

const cad = CAD.montarCaderno(res);
igual('sigla e um disjuntor por chiller', [cad.sigla, res.calc.eletrica.cargas.filter(x => /^CH-/.test(x.tag)).every(x => cad.componentes.some(k => k.tag.split(', ').includes(`Q${x.tag}`)))], ['CAD-CAG', true]);
igual('uma partida por bomba, com o tipo do cálculo', ce.bombas.every(b => cad.componentes.some(k => k.tag === `${b.tag}/Q1`) && (b.motor.partida.tipo !== 'inversor' || cad.componentes.some(k => k.tag === `${b.tag}/T1` && /Inversor/.test(k.descricao)))), true);
const dq = CAD.montarQuadro(res, ce);
igual('bombas reserva fora da demanda (operando:false)', dq.motores.filter(m => m.operando === false).map(m => m.tag), ce.bombas.filter(b => /reserva/.test(b.funcao)).map(b => b.tag));
igual('sinais de intertravamento: fluxostatos por chiller e ΔP do secundário', [dq.automacao.sinais.find(s => s.tag === 'FS-EV').quantidade, dq.automacao.sinais.some(s => s.tag === 'PDT')], [ce.nChillers, ce.arranjo === 'primario_secundario']);
igual('seletoras MAN-0-AUT (bombas) e LOCAL-0-REMOTO (chillers)', dq.automacao.porta.filter(p => p.tipo === 'seletor').map(p => p.quantidade), [ce.bombas.length, ce.nChillers]);
igual('intertravamentos e sequência descritos', cad.secoes.some(s => /Intertravamentos/.test(s.titulo) && s.marcadores.length >= 5), true);
igual('aviso do ventilador da torre (condensação a água)', cad.avisos.some(a => /torre/.test(a) && /\[CONFERIR\]/.test(a)), ce.condAgua);
igual('lista de materiais com preço unitário e total', cad.secoes.some(s => /Lista de materiais/.test(s.titulo) && s.tabela.colunas.includes('Preço unit.')), true);

const ex = motor.exemplo(); ex.cliente = { ...(ex.cliente || {}), nome: 'Torre <u>x</u> & Cia' };
const html = gerarCadernoHtml(CAD.montarCaderno(motor.processar(ex)));
igual('timbrado (data URI) e cliente escapado', [/src="data:image\/png;base64,/.test(html), html.includes('<u>x</u>'), html.includes('Torre &lt;u&gt;x&lt;/u&gt; &amp; Cia')], [true, false, true]);

// sem chiller (split/VRF): caderno indisponível
const exSplit = motor.exemplo(); exSplit.projeto.sistema = 'split';
let resSplit = null;
try { resSplit = motor.processar(exSplit); } catch (e) { resSplit = null; }
if (resSplit) igual('sem central de água gelada: caderno indisponível', motor.tiposDisponiveis(resSplit).includes('caderno'), false);

(async () => {
  try {
    const doc = await motor.gerarDocumento(res, 'caderno');
    igual('PDF do caderno do quadro da CAG', [doc.buffer.slice(0, 4).toString(), doc.mime], ['%PDF', 'application/pdf']);
  } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; console.log('  (puppeteer ausente — PDF não testado)'); }
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
