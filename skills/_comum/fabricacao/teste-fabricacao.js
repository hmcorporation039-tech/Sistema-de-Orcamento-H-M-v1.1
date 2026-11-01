// Teste do módulo comum do caderno de fabricação (skills/_comum/fabricacao):
// HTML com todas as seções e escapado, plaquetas em escala, escala dos
// desenhos e PDF (quando o puppeteer do backend está instalado).
// Rodar: node _comum/fabricacao/teste-fabricacao.js (entra no npm test de skills/).
// Casos do agente QUADROS aqui; os do RACK ficam no bloco próprio, abaixo.

const { verificador } = require('../teste');
const CAD = require('./caderno');
const PL = require('./plaquetas');
const { criarPincelSvg } = require('./svg');

const { igual, fim } = verificador('_comum/fabricacao');

// ── Caderno mínimo ──
const p = criarPincelSvg({ escala: 10 });
p.ret(0, 0, 600, 1000, 'QD-PAINEL');
p.txt(300, 500, 20, 'Q0 <&>', { alinhar: 'centro' });
const des = p.svg({ margem: 10 });
const minimo = {
  tipo: 'quadro', sigla: 'CAD-QD', titulo: 'CADERNO DE FABRICAÇÃO E MONTAGEM', subtitulo: 'QD-01 — teste', tag: 'QD-01', revisao: 'R00', data: '31/10/2026',
  dados: { cliente: { nome: 'Cliente <script>alert(1)</script> & Cia' }, obra: { nome: 'Obra "teste"' }, responsavel: { nome: 'Fulano' } },
  normas: [{ codigo: 'ABNT NBR IEC 61439-1', titulo: 'Regras gerais', aplicacao: 'tudo' }],
  caracteristicas: [['Un', '380 V']],
  desenhos: [{ titulo: 'Vista frontal', svg: des.svg, notas: ['nota <b>1</b>'] }, { titulo: 'Detalhe largo', svg: '<svg viewBox="0 0 2400 300"><rect x="0" y="0" width="2400" height="300"/></svg>' }],
  componentes: [{ tag: 'Q0', descricao: 'Disjuntor', fabricante: 'WEG', referencia: 'X', medidas: '18 × 90 × 80', quantidade: 1, unidade: 'un', local: 'placa', fonte: 'típica [CONFERIR]' }],
  barramentos: [{ barra: 'L1/L2/L3', material: 'Cu', secao: '20 × 5 mm', comprimento_mm: 600, quantidade: 3, capacidade_A: 200, icw_kA: 10, isoladores: '6', fixacao: 'M8' }],
  materiais_montagem: [{ grupo: 'Fixação', descricao: 'Parafuso M5', especificacao: 'aço zincado', quantidade: 8, unidade: 'un', regra: 'a cada 250 mm' }],
  plaquetas: [{ tag: 'S1', texto: ['LIGA', 'BOMBA 01'], largura_mm: 60, altura_mm: 20, material: 'acrílico', fundo: '#000', letra: '#fff', fixacao: 'adesivo', local: 'porta', quantidade: 1 },
    { tag: 'ET', texto: ['Q1'], largura_mm: 15, altura_mm: 6, desenhar: false }],
  plaqueta_hm: { modelo: 'H&M QD-61439 / QD-01', numero_serie: 'a preencher', dados: [['Norma', 'ABNT NBR IEC 61439-2'], ['Un', '380 V']], largura_mm: 100, altura_mm: 70, material: 'alumínio anodizado', fixacao: '4 rebites' },
  secoes: [{ titulo: 'Torques', paragrafos: ['p'], tabela: { colunas: ['A', 'B'], linhas: [['1', '2']] }, marcadores: ['m'] }],
  verificacoes: [{ item: 'IP', criterio: 'IP54', norma: '11.2' }],
  avisos: ['[CONFERIR] x'],
};
const html = CAD.gerarCadernoHtml(minimo);
// capa → dados/normas → desenhos → plaquetas → componentes → barramentos → materiais → seções → verificações → avisos
const ordem = ['class="capa"', '<h2>1. Dados nominais', '<h2>2.1 Vista frontal', '<h2>2.2 Detalhe largo', '<h2>3. Plaquetas', '<h2>4. Componentes', '<h2>5. Barramentos', '<h2>6. Materiais de montagem', '<h2>7. Torques', '<h2>8. Verificações', '<h2>9. Avisos'].map(t => html.indexOf(t));
igual('caderno: todas as seções, na ordem do contrato', ordem.every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), true);
igual('caderno: texto do cliente escapado (sem <script> nem <b> crus)', [html.includes('<script>'), html.includes('<b>1</b>'), html.includes('Cliente &lt;script&gt;alert(1)&lt;/script&gt; &amp; Cia'), html.includes('Q0 &lt;&amp;&gt;')], [false, false, true, true]);
igual('caderno: sem recurso externo (logo e timbrado em data URI)', [/(src|href)="(https?:|\/\/|file:)/i.test(html), /src="data:image\/png;base64,/.test(html)], [false, true]);
igual('caderno: desenho largo em página paisagem; quadro 600 × 1000 em retrato 1:5', [/class="pagina paisagem">\s*<div class="dz-cab"><h2>2\.2 Detalhe largo/.test(html), /2\.1 Vista frontal<\/h2><span class="esc">ESCALA 1:5</.test(html)], [true, true]);
igual('caderno: svg recebe largura física na escala (620 mm / 5 = 124 mm)', /width="124\.00mm"/.test(html), true);
igual('escala: 2000 × 800 cabe em 1:10 no retrato', [CAD.escolherEscala(800, 2000).esc, CAD.escolherEscala(800, 2000).orientacao], [10, 'retrato']);
igual('escala: faixa 2400 × 300 vai para paisagem', CAD.escolherEscala(2400, 300).orientacao, 'paisagem');
igual('plaquetas: etiqueta interna (desenhar:false) só na lista', [html.includes('>ET<'), (PL.htmlFolhaPlaquetas(minimo.plaquetas).html.match(/<figure/g) || []).length], [true, 1]);
igual('plaqueta 60 × 20 em tamanho real', /width="60mm" height="20mm"/.test(PL.svgPlaqueta(minimo.plaquetas[0])), true);
const hm = PL.svgPlaquetaHm(minimo.plaqueta_hm);
igual('plaqueta H&M com logo, nome, modelo e furos de rebite', [/<image href="data:image\/png/.test(hm), hm.includes('H&amp;M Engenharia e Tecnologia'), hm.includes('H&amp;M QD-61439 / QD-01'), (hm.match(/<circle/g) || []).length], [true, true, true, 4]);
igual('ajuste de texto: maiúsculas em negrito cabem na largura (0,92 × h por caractere)', PL.ajustarTexto(['EMERGÊNCIA GERAL'], 60, 18).h * 0.92 * 16 <= 60 - 4 + 1e-9, true);
// desenho estreito e alto com notas longas: notas numa coluna ao lado, o desenho fica maior
const notasLongas = Array.from({ length: 6 }, (_, i) => `Nota ${i + 1}: ${'texto de nota comprido '.repeat(6)}`);
const lado = CAD.escolherEscala(500, 2300, { notas: notasLongas });
igual('escala: desenho estreito com notas longas → notas ao lado, 1:10', [lado.lado, lado.esc], [true, 10]);
igual('escala: a preferida vale se couber', CAD.escolherEscala(800, 2000, { preferida: 15 }).esc, 15);
const comLegenda = CAD.gerarCadernoHtml({ ...minimo, desenhos: [{ titulo: 'Bornes', svg: des.svg, legenda: [['X1.1', 'circ. <1>']] }] });
igual('legenda do desenho compacta e escapada', [comLegenda.includes('<b>X1.1</b> — circ. &lt;1&gt;'), comLegenda.includes('circ. <1>')], [true, false]);
igual('carimbo: tag, sigla, revisão e folha n/N', ['QD-01', 'CAD-QD', 'R00', 'class="pageNumber"', 'class="totalPages"'].every(t => CAD.carimboRodape(minimo).includes(t)), true);

// ── Caixas e centrais (caixa.js) ──
const CX = require('./caixa');
const caixaTeste = { id: 'CX-01', titulo: 'Central <teste>', local: 'Portaria', funcao: 'Central de teste.', tensao: '127/220 V~', normas: [{ codigo: 'NBR X', titulo: 't', aplicacao: 'a' }],
  itens: [
    { tag: 'CPU', descricao: 'Central', fabricante: 'Fab', referencia: 'R1', largura_mm: 240, altura_mm: 180, profundidade_mm: 60 },
    { tag: 'FT', descricao: 'Fonte 12 V', largura_mm: 90, altura_mm: 70, profundidade_mm: 60 },
    { tag: 'BAT', descricao: 'Bateria 12 V 7 Ah', tipo: 'bateria', largura_mm: 151, altura_mm: 65, profundidade_mm: 94, fixacao: 'cinta' },
    { tag: 'SIR', descricao: 'Sirene externa', na_placa: false },
  ],
  frente: [{ tag: 'S1', texto: ['SILENCIAR'], tipo: 'botao' }, { tag: 'H1', texto: ['REDE'], tipo: 'led' }] };
const cadCx = CX.cadernoDeCaixas(caixaTeste, { modeloHm: 'H&M CX-TESTE', normaHm: 'NBR X' });
const htmlCx = CAD.gerarCadernoHtml(cadCx);
igual('caixa: itens da placa cabem no invólucro escolhido', (() => { const i = CX.escolherInvolucro(caixaTeste); return CX.disporItens(caixaTeste.itens.filter(x => x.na_placa !== false), i.l - 100).altura <= i.a - 100; })(), true);
igual('caixa: plaquetas do comando e da bateria, H&M e item de campo', [htmlCx.includes('<h2>3. Plaquetas'), cadCx.plaquetas.some(p => p.tag === 'S1'), cadCx.plaquetas.some(p => p.tag === 'ADV-BATERIA'), cadCx.plaqueta_hm.modelo, cadCx.componentes.find(c => c.tag === 'SIR').local], [true, true, true, 'H&M CX-TESTE / CX-01', 'campo (fora da caixa)']);
igual('caixa: título escapado e material da caixa aos parafusos', [htmlCx.includes('Central <teste>'), htmlCx.includes('Central &lt;teste&gt;'), cadCx.materiais_montagem.some(m => /Parafuso sextavado M6/.test(m.descricao)), cadCx.materiais_montagem.some(m => /Prensa-cabo/.test(m.descricao))], [false, true, true, true]);

const cad2 = CX.cadernoDeCaixas([caixaTeste, { ...caixaTeste, id: 'CX-02' }]);
const html2 = CAD.gerarCadernoHtml(cad2);
igual('várias caixas: uma plaqueta H&M desenhada por caixa', [cad2.plaquetas_hm.length, html2.includes('H&amp;M CX / CX-01'), html2.includes('H&amp;M CX / CX-02')], [2, true, true]);

(async () => {
  let pdf = null;
  try { require('./pdf').carregarPuppeteer(); } catch { console.log('  (puppeteer do backend ausente — PDF não testado)'); }
  try { pdf = await CAD.gerarCadernoPdf(minimo); if (pdf) igual('PDF da caixa: começa com %PDF', (await CAD.gerarCadernoPdf(cadCx)).slice(0, 4).toString(), '%PDF'); } catch (err) { if (!/Puppeteer não encontrado/.test(err.message)) throw err; }
  if (pdf) igual('PDF: buffer começa com %PDF', pdf.slice(0, 4).toString(), '%PDF');
  if (process.env.SALVAR_PDF) require('fs').writeFileSync(process.env.SALVAR_PDF, pdf);
  fim();
})().catch(err => { console.log(`  FALHOU ${err.stack}`); process.exitCode = 1; });
