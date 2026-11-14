// Caderno de fabricação e montagem do CCM (scripts/lib/caderno.js) — dados SINTÉTICOS
// (o exemplo fictício da skill e variações dele). Confere: documento registrado, um capítulo por
// quadro com motores, partidas iguais às do memorial (dispositivosPartida), contatores AC-3,
// porta típica, lista de materiais com preço, timbrado, escape e o PDF.
const motor = require('../scripts/lib/index');
const CAD = require('../scripts/lib/caderno');
const P = require('../../_comum/fabricacao/cadernoPainel');
const { gerarCadernoHtml } = require('../../_comum/fabricacao/caderno');
const { verificador } = require('../../_comum/teste');
const { igual, fim } = verificador('elétrica industrial (caderno do CCM)');

const res = motor.processar(motor.exemplo());
igual('documento "caderno" (PDF) registrado e disponível no exemplo', [motor.documentos.some(d => d.tipo === 'caderno' && d.formato === 'PDF'), motor.tiposDisponiveis(res).includes('caderno')], [true, true]);
igual('quadros com motores: os CCMs (QD-01 só tem tomadas)', CAD.quadrosComMotores(res.calc), ['CCM-01', 'CCM-02']);

const cad = CAD.montarCaderno(res);
igual('sigla, tag e uma plaqueta H&M por CCM', [cad.sigla, cad.tag, cad.plaquetas_hm.length], ['CAD-CCM', 'CCM-01…CCM-02', 2]);
const partidas = cad.secoes.filter(s => /partidas por motor/.test(s.titulo));
igual('tabela de partidas por CCM, uma linha por motor', partidas.map(s => s.tabela.linhas.length), ['CCM-01', 'CCM-02'].map(q => res.calc.unidades.filter(u => u.quadro === q).length));
// Y-Δ: K1/K2/K3 com a mesma corrente AC-3 do memorial
const yd = res.calc.unidades.find(u => u.partida === 'estrela_triangulo');
const linhaYd = partidas.flatMap(s => s.tabela.linhas).find(l => l[0] === yd.tag);
const ks = yd.partidaInfo.dispositivos.filter(d => d.tipo === 'contator').map(d => `${d.ref} ${d.nominal_a} A AC-3`);
igual('Y-Δ: contatores K1/K2/K3 AC-3 iguais aos do memorial', ks.every(k => linhaYd[7].includes(k)) && ks.length === 3, true);
igual('componentes da partida Y-Δ no caderno (bloco do motor)', ['Q1', 'K1', 'K2', 'K3'].every(r => cad.componentes.some(k => k.tag.includes(`${yd.tag}/${r}`))), true);
igual('porta típica: LIGA/DESLIGA por partida + sinaleiros', CAD.portaTipica([{}, {}]).map(p => [p.tipo, p.quantidade]), [['sinaleiro_branco', 1], ['liga', 2], ['desliga', 2], ['sinaleiro_verde', 2], ['sinaleiro_vermelho', 2]]);
igual('ensaio funcional de cada partida na verificação de rotina', res.calc.unidades.filter(u => u.quadro.startsWith('CCM')).every(u => cad.verificacoes.some(v => v.item.includes(`Partida ${u.tag}`) && /ensaio funcional/.test(v.item))), true);
igual('verificações de rotina da NBR IEC 61439-1 (11.2 a 11.10)', ['11.2', '11.9', '11.10'].every(n => cad.verificacoes.some(v => String(v.norma).includes(n))), true);
igual('normas: NBR IEC 60947-4-1 e 61439', ['ABNT NBR IEC 60947-4-1', 'ABNT NBR IEC 61439-1'].every(c => cad.normas.some(n => n.codigo === c)), true);
const lista = cad.secoes.find(s => /Lista de materiais/.test(s.titulo));
igual('lista de materiais com preço unitário e total', [lista.tabela.colunas.includes('Preço unit.'), lista.tabela.colunas.includes('Total')], [true, true]);
igual('aviso comum aos dois CCMs aparece uma vez só', cad.avisos.filter(a => /Comandos da porta/.test(a)).length, 1);

// preço do catálogo informado (dados.precos_materiais) entra na lista; o resto "a cotar"
const linhas = P.linhasMateriais({ calc: { materiais: [{ codigo: 'X1', descricao: 'Item a', unidade: 'un', quantidade: 2 }, { codigo: 'X2', descricao: 'Item b', unidade: 'un', quantidade: 1 }] } }, { precos: { X1: 10.5 } });
igual('preço do catálogo × quantidade; sem preço fica a cotar', linhas.map(l => [l.preco, l.total]), [[10.5, 21], [null, null]]);

// timbrado H&M e escape do texto do cliente
const ex = motor.exemplo(); ex.cliente.nome = 'Indústria <script>x</script> & Cia';
const html = gerarCadernoHtml(CAD.montarCaderno(motor.processar(ex)));
igual('timbrado (data URI) e nome do cliente escapado', [/src="data:image\/png;base64,/.test(html), html.includes('<script>x'), html.includes('Indústria &lt;script&gt;x&lt;/script&gt; &amp; Cia')], [true, false, true]);

// sem motor em CCM: o documento não se aplica
const semMotor = motor.exemplo(); semMotor.motores = [];
let resSem = null;
try { resSem = motor.processar(semMotor); } catch (e) { resSem = null; }
if (resSem) igual('sem motores: caderno do CCM indisponível', motor.tiposDisponiveis(resSem).includes('caderno'), false);

(async () => {
  try {
    const doc = await motor.gerarDocumento(res, 'caderno');
    igual('PDF do caderno do CCM', [doc.buffer.slice(0, 4).toString(), doc.mime, /\.pdf$/.test(doc.nomeArquivo)], ['%PDF', 'application/pdf', true]);
  } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; console.log('  (puppeteer ausente — PDF não testado)'); }
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
