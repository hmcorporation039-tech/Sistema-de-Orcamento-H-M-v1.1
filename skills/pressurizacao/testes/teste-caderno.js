// Caderno de fabricação e montagem do painel de comando da pressurização (scripts/lib/caderno.js)
// — dados SINTÉTICOS (o exemplo fictício da skill e variações). Confere que o caderno sai dos
// MESMOS dados da vista interna do painel no 3D (relés, seletoras, sinaleiros, régua X2, cenários),
// sem botão de emergência, com inversor/soft-starter do cálculo, lista de materiais com preço,
// timbrado, escape e o PDF.
const motor = require('../scripts/lib/index');
const CAD = require('../scripts/lib/caderno');
const PA = require('../../_comum/instalacao/paineis');
const { gerarCadernoHtml } = require('../../_comum/fabricacao/caderno');
const { verificador } = require('../../_comum/teste');
const { igual, fim } = verificador('pressurização (caderno do painel)');

const res = motor.processar(motor.exemplo());
igual('documento "caderno" (PDF) registrado e disponível', [motor.documentos.some(d => d.tipo === 'caderno' && d.formato === 'PDF'), motor.tiposDisponiveis(res).includes('caderno')], [true, true]);

const { d, cmd } = CAD.painelDaPressurizacao(res);
// os mesmos dados que o 3D usa (cena do painel)
const cena = PA.cenaDoPainelPressurizacao(PA.dadosDoPainelPressurizacao({ calculo: res.calc, tag: 'QPE' }));
const relesCena = cena.caixas.filter(c => c.camada === 'protecao' && /^K/.test(c.tag || '')).map(c => c.tag);
const cad = CAD.montarCaderno(res);
igual('mesmos relés da escada do 3D no caderno', relesCena.every(t => cad.componentes.some(k => k.tag.split(', ').includes(t))) && relesCena.length === cmd.reles.length, true);
igual('temporizador da reversão como temporizador', cad.componentes.some(k => k.tag === 'KTR' && /temporizador/i.test(k.descricao)), true);
igual('2 ventiladores com inversor (Q1 + K1 + T1 cada)', ['V1/Q1', 'V1/T1', 'V2/Q1', 'V2/T1'].every(t => cad.componentes.some(k => k.tag === t)), true);
igual('sem botão de emergência nem relé de segurança (parada só no painel)', [cad.componentes.some(k => /emergência \(cogumelo/i.test(k.descricao)), cad.componentes.some(k => k.tag === 'KS1')], [false, false]);
const porta = cad.secoes.find(s => /Porta — seletoras/.test(s.titulo)).tabela.linhas;
igual('seletoras S1/S2 dos ventiladores com a mesma tag do 3D; chave de TESTE depois', porta.slice(0, 3).map(l => [l[0], l[1]]), [['S1', 'S1'], ['S2', 'S2'], ['S3', 'ST']]);
igual('sinaleiros H1…H7 com a mesma tag do 3D', porta.filter(l => /^H/.test(l[0])).every(l => l[0] === l[1]) && porta.filter(l => /^H/.test(l[0])).length === cmd.sinaleiros.length, true);
igual('régua X2 na ordem das conexões da escada', cad.secoes.find(s => /Régua de campo X2/.test(s.titulo)).tabela.linhas.length, cmd.conexoes.filter(x => x.regua === 'X2').length);
igual('cada cenário simulado vira ensaio funcional (todos OK)', [cad.verificacoes.filter(v => /^Ensaio funcional/.test(v.item)).length, cad.verificacoes.filter(v => /simulação da lógica: OK/.test(v.criterio)).length], [cmd.verificacao.length, cmd.verificacao.length]);
igual('sigla e normas (NBR 14880, NBR 17240, NBR IEC 61439)', [cad.sigla, ['ABNT NBR 14880', 'ABNT NBR 17240', 'ABNT NBR IEC 61439-1'].every(c => cad.normas.some(n => n.codigo === c))], ['CAD-PRZ', true]);
igual('lista de materiais com preço unitário e total', cad.secoes.some(s => /Lista de materiais/.test(s.titulo) && s.tabela.colunas.includes('Preço unit.')), true);
// relés e CLP juntos (decisão do usuário, 14/11/2026): o caderno traz os dois — relés na segurança, CLP no controle de pressão
igual('relés e CLP juntos: seção da divisão, CLP no quadro e RFF/KFF na lógica', [cad.secoes.some(s => /Divisão de funções/.test(s.titulo)), cad.componentes.some(k => /CLP|CPU/i.test(k.descricao || '') || /CPU/.test(k.tag || '')), cmd.reles.some(r => r.tag === 'KFF'), cad.avisos.some(a => /controlador programável/.test(a))], [true, true, true, false]);

// padrão H&M (14/11/2026): pressurização sempre com inversor — soft-starter pedido não chega ao caderno nem ao 3D
const exSoft = motor.exemplo(); exSoft.sistema.partida = 'soft_starter';
const resSoft = motor.processar(exSoft);
const dSoft = CAD.painelDaPressurizacao(resSoft).d;
const cadSoft = CAD.montarCaderno(resSoft);
igual('caderno e 3D sempre com inversor (soft-starter pedido vira inversor)', [d.partidaUsada, dSoft.partidaUsada, cadSoft.componentes.some(k => /^Soft-starter/.test(k.descricao || '')), /inversor/.test(cadSoft.subtitulo)], ['inversor', 'inversor', false, true]);

const ex = motor.exemplo(); ex.cliente.nome = 'Condomínio <img src=x> & Cia';
const html = gerarCadernoHtml(CAD.montarCaderno(motor.processar(ex)));
igual('timbrado (data URI) e cliente escapado', [/src="data:image\/png;base64,/.test(html), html.includes('<img src=x>'), html.includes('Condomínio &lt;img src=x&gt; &amp; Cia')], [true, false, true]);

(async () => {
  try {
    const doc = await motor.gerarDocumento(res, 'caderno');
    igual('PDF do caderno do painel', [doc.buffer.slice(0, 4).toString(), doc.mime], ['%PDF', 'application/pdf']);
  } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; console.log('  (puppeteer ausente — PDF não testado)'); }
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
