// Planta de projeto (DXF) gerada a partir da ARQUITETURA recebida + resultado
// do cálculo normativo da skill. A arquitetura é redesenhada em cinza
// (ARQ-REFERENCIA) e os pontos da disciplina entram nas layers da disciplina,
// com ID em atributo, legenda com quantidades e quadro de quantitativo — o
// projetista revisa, move e completa no AutoCAD (eletrodutos, circuitos).
const { point3d } = require('@tarikjabiri/dxf');
const { DesenhoDxf } = require('./dxf');
const { SIMBOLOS, definirSimbolos, legenda } = require('./simbolos');
const P = require('./posicionamento');

const normalizar = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();

// Palavras que distinguem ambientes do mesmo nome-base: gênero, acessível,
// número ou letra ("WC FEM" × "WC", "SALA 2" × "SALA", "BLOCO B"). Letra isolada
// A, E ou O não conta: em português é artigo/conjunção ("sala de estar e jantar").
const DISTINTIVO = /^(FEM|FEMININO|MASC|MASCULINO|PNE|PCD|ACESSIVEL|\d+|[B-DF-NP-Z])$/;
const palavras = (s) => normalizar(s).split(' ').filter(Boolean);
const contemTodas = (maior, menor) => menor.length > 0 && menor.every(p => maior.includes(p));

// O nome `nome` (da skill) casa com o nome `daPlanta`? Por PALAVRAS inteiras, não
// por trecho ("SALA" não casa com "SALAO"). A planta pode ser mais específica
// ("SALA" → "SALA DE ESTAR"); a skill mais específica só casa se a palavra a mais
// não for distintiva — "WC FEM" NÃO casa com "WC" (antes casava, e os pontos do
// banheiro feminino iam para outro banheiro).
function casaNome(nome, daPlanta) {
  const pa = palavras(nome);
  const pn = palavras(daPlanta);
  if (contemTodas(pn, pa)) return true;
  return contemTodas(pa, pn) && !pa.some(p => !pn.includes(p) && DISTINTIVO.test(p));
}

// Casa o nome do ambiente da skill com o ambiente da planta (igual → por palavras,
// o de menos palavras a mais primeiro)
function acharAmbiente(arquitetura, nome) {
  const alvo = normalizar(nome);
  const exato = arquitetura.ambientes.find(a => normalizar(a.nome) === alvo);
  if (exato) return exato;
  const n = palavras(nome).length;
  return arquitetura.ambientes
    .filter(a => casaNome(nome, a.nome))
    .sort((a, b) => Math.abs(palavras(a.nome).length - n) - Math.abs(palavras(b.nome).length - n))[0];
}

// Portas da arquitetura que dão para o ambiente; a principal primeiro: a que
// dá para circulação/hall/recepção, depois a externa, depois a mais larga
// (o "outro lado" sem nome pode ser só um cômodo sem texto, por isso pesa menos)
const RE_CIRCULACAO = /CIRCULA|CORREDOR|HALL|RECEP|ESPERA|SAGU|ANTEC|ESCADA|PASSAG/i;
function portasDoAmbiente(arquitetura, nome) {
  const nota = (p) => {
    const outro = p.ambientes.find(a => a !== nome);
    return (outro && RE_CIRCULACAO.test(outro) && !RE_CIRCULACAO.test(nome) ? 2 : 0) + (!outro ? 1 : 0) + p.largura_m / 10;
  };
  return (arquitetura.portas || []).filter(p => p.ambientes.includes(nome)).sort((p, q) => nota(q) - nota(p));
}

// um ponto junto à porta; se além do batente houver parede, tenta o outro lado e o meio do vão
function pontoNaPorta(pol, porta, it, k) {
  const opc = { fora: !!it.fora, deslocamento: (it.deslocamento || 0) + k * 0.3 };
  const lados = it.lado === 'centro' ? ['centro'] : it.lado === 'dobradica' ? ['dobradica', 'fechadura', 'centro'] : ['fechadura', 'dobradica', 'centro'];
  for (const lado of lados) { const p = P.juntoPorta(pol, porta, { ...opc, lado }); if (p) return p; }
  return null;
}

const REGRAS = {
  perimetro: (pol, n, fase) => P.noPerimetro(pol, n, { fase }),
  grade: (pol, n) => P.gradeComQuantidade(pol, n),
  cantos: (pol, n) => P.nosCantos(pol, n),
  centro: (pol, n) => (n ? [P.centro(pol)] : []),
  // grade nx × ny calculada pela skill (it.nx, it.ny)
  grade_nxny: (pol, n, fase, it) => P.gradeNxNy(pol, it.nx, it.ny).slice(0, n),
  // junto às portas detectadas (it.lado: fechadura | dobradica | centro; it.fora);
  // grupo com `porta` (índice): todos na mesma porta; sem portas → perímetro
  porta: (pol, n, fase, it, ctx) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const porta = ctx.porta || ctx.portas[k];
      const p = porta && pontoNaPorta(pol, porta, it, ctx.porta ? k : 0);
      if (p) out.push({ ...p, porta: porta.id });
    }
    return out.length === n ? out : [...out, ...P.noPerimetro(pol, n - out.length, { fase })];
  },
  // canto mais longe da porta principal (IVP olhando para a entrada)
  canto_oposto_porta: (pol, n, fase, it, ctx) => {
    const ref = (ctx.porta || ctx.portas[0])?.meio;
    if (!ref) return P.nosCantos(pol, n);
    return P.nosCantos(pol, pol.length).sort((a, b) => Math.hypot(b.x - ref[0], b.y - ref[1]) - Math.hypot(a.x - ref[0], a.y - ref[1])).slice(0, n);
  },
};

function desenharReferencia(d, arquitetura) {
  for (const r of arquitetura.referencia) {
    if (r.tipo === 'linha') d.linha(r.pts[0][0], r.pts[0][1], r.pts[1][0], r.pts[1][1], 'ARQ-BASE');
    else if (r.tipo === 'poli' || r.tipo === 'arco') d.polilinha(r.pts, { layer: 'ARQ-BASE', fechada: r.fechada });
    else if (r.tipo === 'circulo') d.circulo(r.x, r.y, r.r, 'ARQ-BASE');
  }
  for (const a of arquitetura.ambientes) {
    d.texto(a.centro[0], a.centro[1] + 0.45, 0.2, a.nome, { layer: 'ARQ-BASE-TEXTO', alinhar: 'centro' });
    d.texto(a.centro[0], a.centro[1] + 0.18, 0.14, `${String(a.area_m2).replace('.', ',')} m²`, { layer: 'ARQ-BASE-TEXTO', alinhar: 'centro' });
  }
}

// Bloco HM-CARIMBO (padrao-hm.json): 180 × 90 mm de PAPEL, mais a tabela de
// revisões acima (4 linhas). Definido em metros de papel (0,18 × 0,09) e
// inserido com a escala de plotagem — os campos são atributos (editáveis no
// AutoCAD com ATTEDIT/EATTEDIT).
const mm = (v) => v / 1000;
function definirCarimbo(d) {
  const campos = [ // tag, x, y (mm, canto inferior esquerdo), altura do texto (mm), rótulo
    ['DISCIPLINA', 140, 83, 3, 'DISCIPLINA'], ['TITULO1', 4, 72, 3.5, 'TÍTULO'], ['TITULO2', 4, 67.5, 2.5, null],
    ['CLIENTE', 4, 58.5, 2.5, 'CLIENTE'], ['OBRA', 4, 52, 2.5, 'OBRA'], ['ENDERECO', 4, 44, 2, 'ENDEREÇO'],
    ['FASE', 4, 31, 2.5, 'FASE'], ['ESCALA', 49, 31, 2.5, 'ESCALA'], ['DATA', 94, 31, 2.5, 'DATA'], ['FOLHA', 139, 31, 2.5, 'FOLHA'],
    ['REVISAO', 4, 19, 2.5, 'REVISÃO'], ['FORMATO', 49, 19, 2.5, 'FORMATO'], ['ARQUIVO', 94, 19, 2, 'ARQUIVO'],
    ['RT_NOME', 4, 8, 2, 'RESPONSÁVEL TÉCNICO'], ['RT_CREA', 4, 3, 2, null], ['ART', 64, 3, 2, 'ART'],
    ['DESENHO', 124, 10, 1.6, 'DES.'], ['PROJETO', 124, 6.5, 1.6, 'PROJ.'], ['VERIFICACAO', 152, 10, 1.6, 'VERIF.'], ['APROVACAO', 152, 6.5, 1.6, 'APROV.'],
  ];
  const revisoes = [0, 1, 2, 3].flatMap(i => [[`REV${i}_DATA`, 4, 92 + i * 6, 1.8], [`REV${i}_DESC`, 30, 92 + i * 6, 1.8], [`REV${i}_POR`, 150, 92 + i * 6, 1.8]]);
  d.bloco('HM-CARIMBO', (b) => {
    const ln = (x1, y1, x2, y2) => b.addLine(point3d(mm(x1), mm(y1)), point3d(mm(x2), mm(y2)), { layerName: '0' });
    const tx = (x, y, h, t) => b.addText(point3d(mm(x), mm(y)), mm(h), t, { layerName: '0' });
    // contorno e divisões
    // 0–90: carimbo; 90–114: 4 revisões (REV0 embaixo); 114–120: cabeçalho das revisões
    [[0, 0, 180, 0], [180, 0, 180, 120], [180, 120, 0, 120], [0, 120, 0, 0], [0, 90, 180, 90]].forEach(l => ln(...l));
    [80, 64, 50, 40, 28, 16].forEach(y => ln(0, y, 180, y));
    [45, 90, 135].forEach(x => ln(x, 28, x, 40));
    [45, 90].forEach(x => ln(x, 16, x, 28));
    ln(120, 0, 120, 16); ln(60, 0, 60, 6.5);
    [96, 102, 108, 114].forEach(y => ln(0, y, 180, y));
    ln(26, 90, 26, 120); ln(146, 90, 146, 120);
    tx(4, 83, 4.5, 'H&M ENGENHARIA E TECNOLOGIA');
    tx(4, 116, 1.6, 'REV. / DATA'); tx(30, 116, 1.6, 'DESCRIÇÃO DA REVISÃO'); tx(150, 116, 1.6, 'POR');
    for (const [, x, y, , rotulo] of campos) if (rotulo) tx(x, y + 4.2, 1.4, rotulo);
  }, [...campos, ...revisoes].map(([tag, x, y, h]) => ({ tag, x: mm(x), y: mm(y), altura: mm(h), padrao: '' })));
}

function carimbo(d, x, y, c, escalaPlotagem) {
  definirCarimbo(d);
  d.inserir('HM-CARIMBO', x, y, {
    layer: 'G-CARIMBO', escala: escalaPlotagem,
    atributos: {
      DISCIPLINA: c.disciplina || '', TITULO1: c.titulo || '', TITULO2: c.subtitulo || 'PLANTA BAIXA — PONTOS E LEGENDA',
      CLIENTE: c.cliente || '', OBRA: c.obra || '', ENDERECO: c.endereco || '',
      FASE: c.fase || 'EP (estudo preliminar)', ESCALA: `1:${escalaPlotagem}`, DATA: c.data || '', FOLHA: c.folha || '01/01',
      REVISAO: c.revisao || 'R00', FORMATO: c.formato || 'A1', ARQUIVO: c.arquivo || '',
      RT_NOME: c.responsavel || '', RT_CREA: c.crea ? `CREA ${c.crea}` : '', ART: c.art || '',
      DESENHO: 'Sistema H&M', PROJETO: c.projetista || '',
      // descricaoRevisao: ex. "AS BUILT — conforme executado" (entrega do projeto, versão 2.1)
      REV0_DATA: c.data || '', REV0_DESC: c.descricaoRevisao || 'Emissão inicial gerada pelo sistema a partir da arquitetura — revisar antes de emitir', REV0_POR: 'H&M',
    },
  });
}

// Posição de cada ponto pelas regras (perímetro, grade, cantos, porta…), sem
// desenhar — usado pela planta DXF (abaixo) e pelo modelo 3D (./modelo3d.js).
// pontos: [{ ambiente, itens: [{ simbolo, n, regra, prefixo, atributos(i) }] }]
function posicionarPontos(arquitetura, pontos) {
  const contagem = {};
  const contadorId = {};
  const naoEncontrados = [];
  const posicoes = [];
  for (const grupo of pontos) {
    const amb = grupo.poligono ? { poligono: grupo.poligono, nome: grupo.ambiente } : acharAmbiente(arquitetura, grupo.ambiente);
    if (!amb) { naoEncontrados.push(grupo.ambiente); continue; }
    // cada tipo de ponto de parede do ambiente começa numa fase diferente
    const deParede = grupo.itens.filter(i => ['perimetro', 'porta'].includes(i.regra || 'perimetro'));
    const portas = portasDoAmbiente(arquitetura, amb.nome);
    const ctx = { portas, porta: grupo.porta != null ? portas[Math.min(grupo.porta, portas.length - 1)] : null };
    for (const it of grupo.itens) {
      const k0 = deParede.indexOf(it);
      const fase = k0 < 0 ? 0.5 : (0.5 + k0 / (deParede.length + 1)) % 1 || 0.15;
      const locais = (REGRAS[it.regra] || REGRAS.perimetro)(amb.poligono, it.n, fase, it, ctx);
      locais.forEach((pos, k) => {
        const prefixo = it.prefixo || '';
        contadorId[prefixo] = (contadorId[prefixo] || 0) + 1;
        const id = `${prefixo}${contadorId[prefixo]}`;
        const atributos = { ID: id, ...(typeof it.atributos === 'function' ? it.atributos(k) : it.atributos || {}) };
        const regra = it.regra || 'perimetro';
        posicoes.push({
          simbolo: it.simbolo, id, ambiente: amb.nome, x: pos.x, y: pos.y, regra, atributos, poligono: amb.poligono,
          rotacao: ['perimetro', 'porta'].includes(regra) ? pos.rotacao : 0, ...(pos.porta ? { porta: pos.porta } : {}),
        });
        contagem[it.simbolo] = (contagem[it.simbolo] || 0) + 1;
      });
    }
  }
  return { posicoes, contagem, naoEncontrados };
}

function gerarPlanta({ arquitetura, pontos, carimbo: dadosCarimbo = {}, notas = [], escalaPlotagem = 50 }) {
  // milímetros, como as pranchas da empresa (a arquitetura lida é convertida)
  const d = new DesenhoDxf({ unidade: 'mm', escalaPlotagem });
  const usados = [...new Set(pontos.flatMap(p => p.itens.map(i => i.simbolo)))];
  definirSimbolos(d, usados);
  desenharReferencia(d, arquitetura);

  const { posicoes: pos, contagem, naoEncontrados } = posicionarPontos(arquitetura, pontos);
  for (const p of pos) d.inserir(p.simbolo, p.x, p.y, { layer: SIMBOLOS[p.simbolo].layer, rotacao: p.rotacao, atributos: p.atributos });
  const posicoes = pos.map(p => ({ simbolo: p.simbolo, id: p.id, ambiente: p.ambiente, x: p.x, y: p.y, ...(p.porta ? { porta: p.porta } : {}) }));

  // legenda, quantitativo, notas e carimbo à direita da planta
  const [, ] = arquitetura.extensao.min;
  const xMax = arquitetura.extensao.max[0], yMax = arquitetura.extensao.max[1], yMin = arquitetura.extensao.min[1];
  const x0 = xMax + 3;
  const quantitativo = usados.filter(s => contagem[s]).map(s => ({ simbolo: s, legenda: SIMBOLOS[s].legenda, quantidade: contagem[s] }));
  const { altura } = legenda(d, x0, yMax, quantitativo.map(q => ({ simbolo: q.simbolo, quantidade: q.quantidade })));
  let y = yMax - altura - 1;
  if (notas.length) {
    d.texto(x0, y, 0.22, 'NOTAS', { layer: 'G-NOTA' });
    notas.forEach((n, i) => d.texto(x0, y - 0.45 - i * 0.35, 0.15, `${i + 1}. ${n}`, { layer: 'G-NOTA' }));
    y -= 0.8 + notas.length * 0.35;
  }
  // carimbo (120 mm de altura com as revisões × escala) abaixo das notas
  const alturaCarimbo = (120 / 1000) * escalaPlotagem;
  carimbo(d, x0, Math.min(yMin, y - alturaCarimbo - 0.5), dadosCarimbo, escalaPlotagem);
  return { dxf: d.toString(), quantitativo, posicoes, naoEncontrados };
}

module.exports = { gerarPlanta, posicionarPontos, acharAmbiente, casaNome, normalizar, portasDoAmbiente };
