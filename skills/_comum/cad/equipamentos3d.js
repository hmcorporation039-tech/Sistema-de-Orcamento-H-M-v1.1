// Biblioteca de EQUIPAMENTOS do 3D focado no objetivo do projeto (pedido do usuário em
// 09/11/2026: "se é uma subestação, temos que pegar postes de entrada, trafos e todos os
// componentes que estão no projeto"). É a mesma biblioteca de componentes do 3D (versão
// 2.30): cada tipo de componente vira um símbolo HM-EQ-* no ESPEC de ./modelo3d.js (altura
// de montagem, forma e tamanho) e a forma é desenhada em ./visualizador3d/app.js (FORMAS),
// como as tomadas, os quadros e os postes — não é um sistema paralelo.
//
// Formas paramétricas simples (caixas e cilindros), legíveis de longe. As DIMENSÕES SÃO
// TÍPICAS E ILUSTRATIVAS (catálogos comuns de 15 kV): o transformador cresce com o kVA
// quando a especificação traz a potência; tapete, poço e poste usam a medida da
// especificação quando ela vem. A ficha do componente (clique no 3D) diz isso.
//
// Convenção do ESPEC (a mesma de ./modelo3d.js):
//   h: altura do CENTRO da peça de parede (m) ou 'piso' / 'teto';
//   tam: parede/teto → [largura, altura, profundidade]; piso → [largura (x), profundidade (y), ALTURA (z)]
//   (no piso o eixo z local é o vertical, como o poste da área externa).
// cor: cor própria do equipamento (cinza do tanque, vermelho do extintor, preto do tapete),
// no lugar do tom da disciplina — o cliente reconhece a peça pela cor também.

const r2 = (v) => Math.round(v * 100) / 100;

// tipo do componente (contrato do objetivo do projeto) → peça do 3D
//   noPoste: sem posição na planta, vai no poste de entrada (altura abaixo do topo, m)
//   linear: vendido por metro (cabo, eletroduto, cordoalha, canaleta) — uma peça por posição
const EQUIPAMENTOS = {
  transformador: { simbolo: 'HM-EQ-TRANSFORMADOR', rotulo: 'Transformador', forma: 'transformador', h: 'piso', tam: [1.30, 0.90, 1.40], cor: '#7f8c96' },
  chave_seccionadora: { simbolo: 'HM-EQ-SECCIONADORA', rotulo: 'Chave seccionadora tripolar', forma: 'seccionadora', h: 2.2, tam: [0.80, 0.55, 0.40], cor: '#a3acb4' },
  mufla: { simbolo: 'HM-EQ-MUFLA', rotulo: 'Mufla (terminação de MT)', forma: 'mufla', h: 2.3, tam: [0.45, 0.55, 0.22], cor: '#9c6b4e', noPoste: 2.2 },
  para_raios: { simbolo: 'HM-EQ-PARA-RAIOS', rotulo: 'Para-raios de distribuição', forma: 'para-raios', h: 2.5, tam: [0.45, 0.40, 0.20], cor: '#8a4b2a', noPoste: 0.9 },
  chave_fusivel: { simbolo: 'HM-EQ-CHAVE-FUSIVEL', rotulo: 'Chave fusível', forma: 'chave-fusivel', h: 2.4, tam: [0.20, 0.55, 0.25], cor: '#8f8f86', noPoste: 1.4 },
  poste: { simbolo: 'HM-EQ-POSTE', rotulo: 'Poste de entrada', forma: 'poste-mt', h: 'piso', tam: [2.0, 0.30, 11], cor: '#b9b4aa' },
  cruzeta: { simbolo: 'HM-EQ-CRUZETA', rotulo: 'Cruzeta', forma: 'cruzeta', h: 2.5, tam: [2.0, 0.10, 0.10], cor: '#8d877c', noPoste: 0.3 },
  isolador: { simbolo: 'HM-EQ-ISOLADOR', rotulo: 'Isolador', forma: 'isolador', h: 2.5, tam: [0.12, 0.18, 0.12], cor: '#8a4b2a', noPoste: 0.15 },
  cabo_mt: { simbolo: 'HM-EQ-CABO-MT', rotulo: 'Cabo de média tensão', forma: 'cabo', h: 'piso', tam: [0.60, 0.60, 0.45], cor: '#30343a', linear: true },
  eletroduto: { simbolo: 'HM-EQ-ELETRODUTO', rotulo: 'Eletroduto', forma: 'eletroduto-peca', h: 'piso', tam: [0.80, 0.12, 0.12], cor: '#5b6470', linear: true },
  poco_passagem: { simbolo: 'HM-EQ-POCO', rotulo: 'Poço de passagem', forma: 'poco', h: 'piso', tam: [0.80, 0.80, 0.08], cor: '#9c9588' },
  disjuntor_mt: { simbolo: 'HM-EQ-DISJUNTOR-MT', rotulo: 'Disjuntor de média tensão', forma: 'disjuntor-mt', h: 'piso', tam: [0.75, 0.70, 1.40], cor: '#6f7d8c' },
  rele: { simbolo: 'HM-EQ-RELE', rotulo: 'Relé de proteção', forma: 'rele', h: 1.6, tam: [0.25, 0.30, 0.20], cor: '#4a5560' },
  tc: { simbolo: 'HM-EQ-TC', rotulo: 'Transformador de corrente (TC)', forma: 'tc-tp', h: 2.2, tam: [0.18, 0.25, 0.18], cor: '#556070' },
  tp: { simbolo: 'HM-EQ-TP', rotulo: 'Transformador de potencial (TP)', forma: 'tc-tp', h: 2.2, tam: [0.20, 0.30, 0.20], cor: '#556070' },
  medicao: { simbolo: 'HM-EQ-MEDICAO', rotulo: 'Caixa de medição', forma: 'medicao', h: 1.5, tam: [0.60, 0.80, 0.25], cor: '#d8d8d0' },
  // disjuntor geral de BT listado à parte na relação (09/11/2026 — manobra no 3D interativo); sem ele,
  // o geral de BT fica dentro do QGBT (../instalacao/interacao.js redeDaSubestacao)
  disjuntor_bt: { simbolo: 'HM-EQ-DISJUNTOR-BT', rotulo: 'Disjuntor geral de BT', forma: 'caixa', h: 1.5, tam: [0.30, 0.40, 0.20], cor: '#5a6470' },
  // QGBT: a forma "quadro" que o 3D já tem (porta, fecho e plaqueta), no tamanho de um geral de BT
  qgbt: { simbolo: 'HM-EQ-QGBT', rotulo: 'Quadro geral de baixa tensão (QGBT)', forma: 'quadro', h: 1.2, tam: [0.80, 1.20, 0.30], cor: '#c9c6bd' },
  barramento: { simbolo: 'HM-EQ-BARRAMENTO', rotulo: 'Barramento', forma: 'barramento', h: 2.4, tam: [1.00, 0.30, 0.15], cor: '#b87333' },
  cubiculo: { simbolo: 'HM-EQ-CUBICULO', rotulo: 'Cubículo', forma: 'cubiculo', h: 'piso', tam: [1.00, 1.20, 2.20], cor: '#9aa4ad' },
  haste: { simbolo: 'HM-EQ-HASTE', rotulo: 'Haste de aterramento', forma: 'haste', h: 'piso', tam: [0.30, 0.30, 0.35], cor: '#b87333' },
  cordoalha: { simbolo: 'HM-EQ-CORDOALHA', rotulo: 'Cordoalha de cobre', forma: 'cordoalha', h: 'piso', tam: [1.00, 0.04, 0.04], cor: '#b87333', linear: true },
  // caixa de inspeção do aterramento: a "caixa-piso" que o 3D já tem
  caixa_inspecao: { simbolo: 'HM-EQ-CAIXA-INSPECAO', rotulo: 'Caixa de inspeção', forma: 'caixa-piso', h: 'piso', tam: [0.30, 0.30, 0.05], cor: '#8f8a80' },
  tapete_borracha: { simbolo: 'HM-EQ-TAPETE', rotulo: 'Tapete de borracha isolante', forma: 'tapete', h: 'piso', tam: [1.00, 1.00, 0.012], cor: '#2b2b2b' },
  extintor: { simbolo: 'HM-EQ-EXTINTOR', rotulo: 'Extintor de incêndio', forma: 'extintor', h: 1.5, tam: [0.22, 0.60, 0.22], cor: '#d23a2a' },
  placa_advertencia: { simbolo: 'HM-EQ-PLACA', rotulo: 'Placa de advertência', forma: 'placa', h: 1.6, tam: [0.40, 0.30, 0.012], cor: '#f2c200' },
  tela_protecao: { simbolo: 'HM-EQ-TELA', rotulo: 'Tela de proteção', forma: 'tela', h: 'piso', tam: [1.50, 0.05, 2.00], cor: '#9fa6ad' },
  veneziana: { simbolo: 'HM-EQ-VENEZIANA', rotulo: 'Veneziana de ventilação', forma: 'veneziana', h: 2.3, tam: [1.00, 0.50, 0.06], cor: '#cfd3d6' },
  canaleta: { simbolo: 'HM-EQ-CANALETA', rotulo: 'Canaleta no piso', forma: 'canaleta', h: 'piso', tam: [1.00, 0.30, 0.05], cor: '#8c8c8c', linear: true },
  // luminária do próprio objeto (a da subestação): a peça de teto que o 3D já tem
  luminaria: { simbolo: 'HM-ILU-LUMINARIA', rotulo: 'Luminária', forma: 'luminaria', h: 'teto', tam: [0.62, 0.62, 0.06], cor: '#ffe27a' },
  // tipo sem forma própria: caixa genérica na parede
  generico: { simbolo: 'HM-EQ-GENERICO', rotulo: 'Componente do projeto', forma: 'caixa', h: 1.5, tam: [0.30, 0.30, 0.15], cor: '#c4c0b6' },
};
// (sinônimos que o objetivo pode trazer)
const ALIAS_TIPO = { trafo: 'transformador', seccionadora: 'chave_seccionadora', para_raio: 'para_raios', pararaios: 'para_raios', fusivel: 'chave_fusivel',
  pp: 'poco_passagem', poco: 'poco_passagem', disjuntor: 'disjuntor_mt', quadro: 'qgbt', tapete: 'tapete_borracha', placa: 'placa_advertencia', tela: 'tela_protecao',
  // tipos do motor de objetivo (./perfisDisciplina.js, media_tensao)
  poste_entrada: 'poste', mufla_externa: 'mufla', mufla_interna: 'mufla', caixa_passagem: 'poco_passagem', tela_insetos: 'tela_protecao',
  cabo_bt: 'cabo_mt', disjuntor_geral_bt: 'disjuntor_bt', rele_protecao: 'rele', transformador_corrente: 'tc', transformador_potencial: 'tp' };

// formas novas desenhadas no visualizador (o teste confere que cada uma existe em app.js)
const FORMAS_EQUIPAMENTO = [...new Set(Object.values(EQUIPAMENTOS).map(e => e.forma))];
// peças de parede da biblioteca: vão encostadas na parede mais próxima (até 3 m), como o quadro
const FORMAS_DE_PAREDE_EQUIP = ['seccionadora', 'mufla', 'para-raios', 'chave-fusivel', 'rele', 'tc-tp', 'medicao', 'barramento', 'extintor', 'placa', 'veneziana'];
// tipos que são a PORTA do abrigo (abrem o vão na parede, não viram peça)
const TIPOS_PORTA = new Set(['porta', 'portao']);

// ESPEC por símbolo, para o ESPEC único de ./modelo3d.js
const ESPEC_EQUIPAMENTOS = Object.fromEntries(Object.values(EQUIPAMENTOS).filter(e => e.simbolo.startsWith('HM-EQ-')).map(e => [e.simbolo, { h: e.h, forma: e.forma, tam: e.tam }]));

const chaveTipo = (tipo) => {
  const k = String(tipo || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
  return EQUIPAMENTOS[k] ? k : ALIAS_TIPO[k] || null;
};
// peça do 3D de um componente: pelo tipo, senão pela forma3d sugerida, senão a genérica
function equipamentoDe(comp) {
  const k = chaveTipo(comp?.tipo) || chaveTipo(comp?.forma3d);
  if (k) return { chave: k, ...EQUIPAMENTOS[k] };
  const porForma = Object.entries(EQUIPAMENTOS).find(([, e]) => e.forma === comp?.forma3d);
  if (porForma) return { chave: porForma[0], ...porForma[1] };
  return { chave: 'generico', ...EQUIPAMENTOS.generico };
}

// número do projeto: "1.000" (milhar) e "2,10" (decimal) — o texto da relação/legenda vem em pt-BR
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  let s = String(v ?? '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
// A especificação do componente pode vir como objeto ({ kva, tensao_kv, largura_m… }) ou como o
// TEXTO da relação de materiais / legenda ("150 kVA, 13.800 V - 380/220 V, isolamento a óleo";
// "veneziana 500x1000 mm"; "porta 2,10x1,20 m"; "canaleta 30x30 cm"). Lê os dois, sem quebrar.
function textoDaEspecificacao(esp) {
  if (esp == null) return '';
  if (typeof esp === 'string' || typeof esp === 'number') return String(esp);
  if (typeof esp !== 'object') return '';
  return Object.values(esp).filter(v => typeof v === 'string').join(' ; ');
}
const RE_MEDIDAS = /(\d+(?:[.,]\d+)?)\s*[x×X]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×X]\s*(\d+(?:[.,]\d+)?))?\s*(mm|cm|m)\b/;
const FATOR_UN = { mm: 0.001, cm: 0.01, m: 1 };
// medidas escritas (em metros, na ordem do texto) e a potência em kVA
function medidasDaEspecificacao(esp) {
  const e = esp && typeof esp === 'object' ? esp : {};
  const t = textoDaEspecificacao(esp);
  const m = RE_MEDIDAS.exec(t);
  const dims = m ? [m[1], m[2], m[3]].filter(Boolean).map(v => r2(num(v) * FATOR_UN[m[4].toLowerCase()])).filter(v => v > 0 && v <= 30) : [];
  const diam = /(?:[ØøΦ]|di[âa]m(?:etro)?\.?)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/i.exec(t);
  const kvaTxt = /(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*kVA\b/i.exec(t);
  return {
    dims, diametro_m: num(e.diametro_m) || (diam ? r2(num(diam[1]) * FATOR_UN[diam[2].toLowerCase()]) : null),
    kva: num(e.kva) || num(e.potencia_kva) || (kvaTxt ? num(kvaTxt[1]) : null),
  };
}
const ate = (v, max) => (v && v <= max ? r2(v) : null);
// Tamanho da peça pela especificação, quando ela diz (senão o típico da biblioteca)
function tamanhoDe(eq, esp = {}) {
  const e = esp && typeof esp === 'object' ? esp : {};
  const { dims, diametro_m, kva } = medidasDaEspecificacao(esp);
  const [a, b, c] = dims;
  if (eq.chave === 'transformador') {
    // óleo, 15 kV: 150 kVA ≈ 1,30 × 0,90 × 1,40 m com radiadores e buchas; cresce com a raiz cúbica da potência
    const f = kva ? Math.min(2.6, Math.max(0.6, Math.cbrt(kva / 150))) : 1;
    return eq.tam.map(v => r2(v * f));
  }
  if (eq.chave === 'poste') {
    const H = num(e.altura_m) || num(e.comprimento_m) || num(/(\d+(?:[.,]\d+)?)\s*m\b/.exec(textoDaEspecificacao(esp))?.[1]);
    return H && H >= 4 && H <= 25 ? [eq.tam[0], eq.tam[1], H] : eq.tam;
  }
  if (eq.chave === 'tapete_borracha') {
    const L = ate(num(e.largura_m) || (b ? Math.min(a, b) : null), 5), C = ate(num(e.comprimento_m) || (b ? Math.max(a, b) : null), 5);
    return L && C ? [C, L, eq.tam[2]] : eq.tam;
  }
  if (eq.chave === 'poco_passagem') {
    const D = ate(diametro_m || num(e.largura_m) || (a && !b ? a : null), 3);
    if (D) return [D, D, eq.tam[2]];
    return a && b && a <= 3 && b <= 3 ? [r2(a), r2(b), eq.tam[2]] : eq.tam;
  }
  if (eq.chave === 'tela_protecao') {
    const L = ate(num(e.largura_m) || num(e.comprimento_m) || (b ? Math.min(a, b) : null), 10), H = ate(num(e.altura_m) || (b ? Math.max(a, b) : null), 4);
    return [L || eq.tam[0], eq.tam[1], H || eq.tam[2]];
  }
  if (eq.chave === 'canaleta') {
    // seção da canaleta (30 × 30 cm): largura × profundidade; o pedaço no 3D tem 1 m
    const L = ate(num(e.largura_m) || a, 1.5), P = ate(num(e.profundidade_m) || b, 1.5);
    return [eq.tam[0], L || eq.tam[1], P || eq.tam[2]];
  }
  if (['veneziana', 'placa_advertencia'].includes(eq.chave)) {
    // "500x1000 mm": a maior é a largura, a menor a altura
    const L = ate(num(e.largura_m) || (b ? Math.max(a, b) : null), 4), H = ate(num(e.altura_m) || (b ? Math.min(a, b) : null), 3);
    return [L || eq.tam[0], H || eq.tam[1], eq.tam[2]];
  }
  if (eq.h === 'piso' && eq.chave === 'cubiculo' && c) return [ate(a, 4) || eq.tam[0], ate(b, 4) || eq.tam[1], ate(c, 4) || eq.tam[2]];
  if (typeof eq.h === 'number' && ['medicao', 'qgbt', 'rele', 'generico', 'barramento'].includes(eq.chave) && b) {
    // caixa/quadro "800x1200x300 mm": largura × altura × profundidade
    return [ate(a, 3) || eq.tam[0], ate(b, 3) || eq.tam[1], ate(c, 1.5) || eq.tam[2]];
  }
  return eq.tam;
}
// porta descrita como "2,10x1,20 m": a maior é a altura, a menor a largura do vão
function larguraDaPorta(esp) {
  const e = esp && typeof esp === 'object' ? esp : {};
  if (num(e.largura_m)) return num(e.largura_m);
  const { dims } = medidasDaEspecificacao(esp);
  if (dims.length >= 2) { const L = Math.min(dims[0], dims[1]); return L >= 0.5 && L <= 6 ? L : null; }
  return null;
}

module.exports = { EQUIPAMENTOS, ESPEC_EQUIPAMENTOS, FORMAS_EQUIPAMENTO, FORMAS_DE_PAREDE_EQUIP, TIPOS_PORTA, equipamentoDe, tamanhoDe, chaveTipo, medidasDaEspecificacao, textoDaEspecificacao, larguraDaPorta, num };
