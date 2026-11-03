// Modelo ÚNICO da instalação (fase 1 do roteiro de 02/11/2026, achados 3D-06,
// SK-02 e SK-06): quadro → disjuntor → circuito → comando → ponto como UM dado.
// As skills de elétrica (NBR 5410), iluminação (NBR ISO/CIE 8995-1) e quadros
// (NBR IEC 61439) geram este objeto a partir dos seus dados; a planta, o quadro de
// cargas, o unifilar e o 3D leem o mesmo identificador de circuito. É o que o Revit
// MEP faz com os "sistemas elétricos" e o EPLAN com a tag única do dispositivo.
//
// instalacao = {
//   versao, origem,
//   quadros:   [{ tag, descricao, local, ponto?, geral: { tag, In, polos, curva } | null,
//                 drs: [{ tag, In, idn_ma, polos, circuitos[] }], disjuntores: [{ tag, circuito, polos, In, curva }],
//                 carga_instalada_va? }],
//   circuitos: [{ id, quadro, disjuntor, tipo, descricao, potencia_va, ligacao, fases, dr, ambientes[], pontos[] }],
//   pontos:    [{ id, tipo, simbolo, ambiente, circuito, comando, carga_va, posicao }],
//   comandos:  [{ id, tipo, ambiente, circuitos[], retorno, dispositivos[], pontos[], rele? }],
// }
//
// Identificadores (comuns à elétrica, à iluminação, aos quadros e ao 3D):
//   - circuito: o número do quadro de cargas ("3", "IL1");
//   - disjuntor: Q + circuito ("Q3", "QIL1" — a mesma tag do caderno de fabricação da skill quadros);
//   - DR: DR-<circuito> (exclusivo) ou o grupo da skill quadros ("DR1");
//   - ponto: o ID do atributo da planta ("L3", "T12", "S2"), estável entre regerações;
//   - comando: circuito + letra do retorno ("3a", "IL1b") — a convenção da planta.
// Módulo puro (sem disco, sem rede): testável no Node e usável pelo 3D.

const VERSAO = 1;

// (os da skill quadros também: ar-condicionado e comando/automação)
const TIPOS_CIRCUITO = ['iluminacao', 'tug', 'tue', 'motor', 'alimentador', 'ar_condicionado', 'automacao', 'reserva', 'outro'];

// comandos que a fase 2 (simulador lógico) sabe interpretar
const TIPOS_COMANDO = {
  interruptor_simples: 'Interruptor simples',
  interruptor_paralelo: 'Interruptores paralelos (three-way)',
  interruptor_intermediario: 'Interruptores paralelos + intermediário(s) (four-way)',
  pulsador_rele_impulso: 'Pulsadores com relé de impulso',
  contator_botoeira: 'Contator com botoeira liga/desliga e selo',
  sensor_presenca: 'Sensor de presença',
  dimmer: 'Dimmer',
  dimmer_010: 'Controlador 0-10 V',
  dali: 'DALI-2 (botoeira)',
  cena: 'DALI-2 com teclado de cenas',
};

// pontos que são carga (recebem energia do circuito) × pontos que comandam
const TIPOS_CARGA = new Set(['luminaria', 'ponto_luz', 'tomada', 'tue', 'motor']);
const TIPOS_DISPOSITIVO = new Set(['interruptor_simples', 'interruptor_paralelo', 'interruptor_intermediario', 'pulsador', 'botoeira', 'sensor', 'dimmer', 'controlador_010', 'botoeira_dali', 'teclado_cena', 'interruptor']);

const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
const tagDisjuntor = (circuito) => `Q${circuito}`;
const tagDr = (circuito) => `DR-${circuito}`;

// a, b, …, z, aa, ab… — letra do retorno na planta
function letraRetorno(i) {
  let s = '';
  let n = i;
  do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

// Tipo do comando de interruptores pelo número de pontos de comando (portas):
// 1 → simples; 2 → dois paralelos; 3 ou mais → dois paralelos e n − 2 intermediários.
// Com "pulsador" ou "contator" (escolha do projeto), qualquer número de pontos.
function comandoDeInterruptores(nPontos, escolha = '') {
  const n = Math.max(1, Math.round(Number(nPontos) || 1));
  if (escolha === 'pulsador') return { tipo: 'pulsador_rele_impulso', dispositivos: Array(n).fill('pulsador') };
  if (escolha === 'contator') return { tipo: 'contator_botoeira', dispositivos: Array(n).fill('botoeira') };
  if (n === 1) return { tipo: 'interruptor_simples', dispositivos: ['interruptor_simples'] };
  if (n === 2) return { tipo: 'interruptor_paralelo', dispositivos: ['interruptor_paralelo', 'interruptor_paralelo'] };
  return { tipo: 'interruptor_intermediario', dispositivos: ['interruptor_paralelo', ...Array(n - 2).fill('interruptor_intermediario'), 'interruptor_paralelo'] };
}

function novaInstalacao(origem) {
  return { versao: VERSAO, origem, quadros: [], circuitos: [], pontos: [], comandos: [] };
}

// Gerador de ids por prefixo — a MESMA sequência que a planta (./cad/planta.js,
// posicionarPontos) dava aos pontos: prefixo + contador global da disciplina
function contadorDeIds() {
  const n = {};
  return (prefixo) => { n[prefixo] = (n[prefixo] || 0) + 1; return `${prefixo}${n[prefixo]}`; };
}

// Letras de retorno por circuito (o comando "IL1b" é o 2º comando do circuito IL1)
function contadorDeRetornos() {
  const n = {};
  return (circuito) => { const k = (n[circuito] = (n[circuito] ?? -1) + 1); return letraRetorno(k); };
}

// ── Validação ───────────────────────────────────────────────────────────────
// Regras (passo 5 da fase 1): todo ponto tem circuito; todo circuito tem disjuntor e
// quadro; a soma das cargas dos pontos bate com a potência do circuito no quadro de
// cargas (e a dos circuitos com a do quadro); os comandos apontam para pontos que
// existem. Erro = o modelo está incoerente (o 3D interativo erraria); aviso = falta
// informação mas o modelo fecha (circuito de reserva sem pontos, ponto sem comando).
// opcoes.tolerancia_va: folga da soma (arredondamento do quadro de cargas), padrão 1 VA + 0,5 %
function validarInstalacao(inst, opcoes = {}) {
  const erros = [];
  const avisos = [];
  if (!inst || typeof inst !== 'object') return { ok: false, erros: ['Instalação vazia.'], avisos, resumo: null };
  const quadros = inst.quadros || [];
  const circuitos = inst.circuitos || [];
  const pontos = inst.pontos || [];
  const comandos = inst.comandos || [];
  const tol = (v) => Math.max(Number(opcoes.tolerancia_va ?? 1), 0.005 * Math.abs(v));

  const repetidos = (lista, chave, rotulo) => {
    const vistos = new Set();
    for (const x of lista) {
      const k = x?.[chave];
      if (k == null || k === '') { erros.push(`${rotulo} sem identificador.`); continue; }
      if (vistos.has(String(k))) erros.push(`${rotulo} ${k} repetido.`);
      vistos.add(String(k));
    }
  };
  repetidos(quadros, 'tag', 'Quadro');
  repetidos(circuitos, 'id', 'Circuito');
  repetidos(pontos, 'id', 'Ponto');
  repetidos(comandos, 'id', 'Comando');

  const quadroDe = new Map(quadros.map(q => [String(q.tag), q]));
  const circuitoDe = new Map(circuitos.map(c => [String(c.id), c]));
  const pontoDe = new Map(pontos.map(p => [String(p.id), p]));
  const comandoDe = new Map(comandos.map(c => [String(c.id), c]));

  // quadros: disjuntores e DR apontam para circuitos que existem
  for (const q of quadros) {
    const tags = new Set();
    for (const d of q.disjuntores || []) {
      if (tags.has(d.tag)) erros.push(`Quadro ${q.tag}: disjuntor ${d.tag} repetido.`);
      tags.add(d.tag);
      if (!(Number(d.In) > 0)) erros.push(`Quadro ${q.tag}: disjuntor ${d.tag} sem corrente nominal.`);
      if (d.circuito == null || d.circuito === '') continue;
      const c = circuitoDe.get(String(d.circuito));
      if (!c) erros.push(`Quadro ${q.tag}: disjuntor ${d.tag} aponta para o circuito ${d.circuito}, que não existe.`);
      else if (String(c.quadro) !== String(q.tag)) erros.push(`Disjuntor ${d.tag} está no quadro ${q.tag}, mas o circuito ${d.circuito} diz que é do quadro ${c.quadro}.`);
    }
    for (const dr of q.drs || []) {
      for (const id of dr.circuitos || []) if (!circuitoDe.has(String(id))) erros.push(`Quadro ${q.tag}: ${dr.tag} protege o circuito ${id}, que não existe.`);
    }
  }

  // circuitos: quadro e disjuntor
  const somaPorQuadro = new Map();
  for (const c of circuitos) {
    const q = quadroDe.get(String(c.quadro));
    if (c.quadro == null || c.quadro === '') erros.push(`Circuito ${c.id} sem quadro.`);
    else if (!q) erros.push(`Circuito ${c.id}: quadro ${c.quadro} não existe.`);
    if (!c.disjuntor) erros.push(`Circuito ${c.id} sem disjuntor.`);
    else if (q) {
      const d = (q.disjuntores || []).find(x => x.tag === c.disjuntor);
      if (!d) erros.push(`Circuito ${c.id}: disjuntor ${c.disjuntor} não está no quadro ${q.tag}.`);
      else if (String(d.circuito) !== String(c.id)) erros.push(`Circuito ${c.id}: o disjuntor ${c.disjuntor} é do circuito ${d.circuito}.`);
    }
    if (c.tipo && !TIPOS_CIRCUITO.includes(c.tipo)) avisos.push(`Circuito ${c.id}: tipo "${c.tipo}" fora da lista (${TIPOS_CIRCUITO.join(', ')}).`);
    if (q) somaPorQuadro.set(q.tag, (somaPorQuadro.get(q.tag) || 0) + (Number(c.potencia_va) || 0));
  }

  // pontos: circuito e comando
  const cargaPorCircuito = new Map();
  const pontosPorCircuito = new Map();
  for (const p of pontos) {
    if (p.circuito == null || p.circuito === '') { erros.push(`Ponto ${p.id}${p.ambiente ? ` (${p.ambiente})` : ''} sem circuito.`); continue; }
    const c = circuitoDe.get(String(p.circuito));
    if (!c) { erros.push(`Ponto ${p.id}: circuito ${p.circuito} não existe.`); continue; }
    (pontosPorCircuito.get(c.id) || pontosPorCircuito.set(c.id, new Set()).get(c.id)).add(String(p.id));
    if (Number.isFinite(Number(p.carga_va)) && TIPOS_CARGA.has(p.tipo)) cargaPorCircuito.set(c.id, (cargaPorCircuito.get(c.id) || 0) + Number(p.carga_va));
    if (p.comando) {
      const k = comandoDe.get(String(p.comando));
      if (!k) erros.push(`Ponto ${p.id}: comando ${p.comando} não existe.`);
      else if (TIPOS_CARGA.has(p.tipo) && !(k.pontos || []).map(String).includes(String(p.id))) erros.push(`Ponto ${p.id} diz que é comandado por ${p.comando}, mas o comando não o lista.`);
      else if (!TIPOS_CARGA.has(p.tipo) && !(k.dispositivos || []).map(String).includes(String(p.id))) erros.push(`Ponto ${p.id} diz que é dispositivo do comando ${p.comando}, mas o comando não o lista.`);
    } else if (['luminaria', 'ponto_luz'].includes(p.tipo)) avisos.push(`Ponto de luz ${p.id}${p.ambiente ? ` (${p.ambiente})` : ''} sem comando.`);
  }

  // circuito.pontos × ponto.circuito (as duas pontas da ligação)
  for (const c of circuitos) {
    const lista = new Set((c.pontos || []).map(String));
    const reais = pontosPorCircuito.get(c.id) || new Set();
    for (const id of lista) if (!pontoDe.has(id)) erros.push(`Circuito ${c.id} lista o ponto ${id}, que não existe.`);
    for (const id of reais) if (!lista.has(id)) erros.push(`Ponto ${id} é do circuito ${c.id}, mas o circuito não o lista.`);
    const carga = cargaPorCircuito.get(c.id);
    const va = Number(c.potencia_va) || 0;
    if (carga == null) {
      if (va > 0 && c.tipo !== 'reserva' && c.tipo !== 'alimentador') avisos.push(`Circuito ${c.id}: ${arred(va, 0)} VA no quadro de cargas sem pontos de carga no modelo.`);
      continue;
    }
    if (Math.abs(carga - va) > tol(va)) erros.push(`Circuito ${c.id}: os pontos somam ${arred(carga, 1)} VA e o quadro de cargas tem ${arred(va, 1)} VA.`);
  }

  // quadro de cargas: soma dos circuitos × carga instalada do quadro
  for (const q of quadros) {
    if (q.carga_instalada_va == null) continue;
    const s = somaPorQuadro.get(q.tag) || 0;
    if (Math.abs(s - Number(q.carga_instalada_va)) > tol(Number(q.carga_instalada_va))) erros.push(`Quadro ${q.tag}: os circuitos somam ${arred(s, 1)} VA e o quadro de cargas tem ${arred(Number(q.carga_instalada_va), 1)} VA.`);
  }

  // comandos: tipo, pontos e dispositivos que existem
  for (const k of comandos) {
    if (!TIPOS_COMANDO[k.tipo]) erros.push(`Comando ${k.id}: tipo "${k.tipo}" desconhecido.`);
    if (!(k.pontos || []).length) avisos.push(`Comando ${k.id} não comanda nenhum ponto.`);
    for (const id of k.pontos || []) {
      const p = pontoDe.get(String(id));
      if (!p) erros.push(`Comando ${k.id} aponta para o ponto ${id}, que não existe.`);
      else if (String(p.comando || '') !== String(k.id)) erros.push(`Comando ${k.id} lista o ponto ${id}, mas o ponto diz que é comandado por ${p.comando || 'ninguém'}.`);
    }
    for (const id of k.dispositivos || []) if (!pontoDe.has(String(id))) erros.push(`Comando ${k.id}: dispositivo ${id} não existe.`);
    for (const id of k.circuitos || []) if (!circuitoDe.has(String(id))) erros.push(`Comando ${k.id}: circuito ${id} não existe.`);
  }

  return { ok: !erros.length, erros, avisos, resumo: resumoInstalacao(inst) };
}

function resumoInstalacao(inst) {
  const pontos = inst?.pontos || [];
  const porTipo = {};
  for (const p of pontos) porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
  return {
    quadros: (inst?.quadros || []).length, circuitos: (inst?.circuitos || []).length, pontos: pontos.length, comandos: (inst?.comandos || []).length,
    carga_va: arred((inst?.circuitos || []).reduce((s, c) => s + (Number(c.potencia_va) || 0), 0), 1), pontosPorTipo: porTipo,
  };
}

// Junta circuitos/pontos/comandos de uma instalação no quadro de outra (ex.: os
// circuitos IL* do luminotécnico no quadro da elétrica). Ids que já existem em
// `base` não entram de novo (o da base vale). Não altera os originais.
function juntarInstalacoes(base, extra) {
  const r = JSON.parse(JSON.stringify(base));
  if (!extra) return r;
  const tem = (lista, chave) => new Set(lista.map(x => String(x[chave])));
  for (const q of extra.quadros || []) {
    const alvo = r.quadros.find(x => x.tag === q.tag);
    if (!alvo) { r.quadros.push(JSON.parse(JSON.stringify(q))); continue; }
    const ds = tem(alvo.disjuntores, 'tag');
    for (const d of q.disjuntores || []) if (!ds.has(d.tag)) alvo.disjuntores.push({ ...d });
    const drs = tem(alvo.drs || (alvo.drs = []), 'tag');
    for (const d of q.drs || []) if (!drs.has(d.tag)) alvo.drs.push({ ...d, circuitos: [...(d.circuitos || [])] });
  }
  for (const [chave, campo] of [['circuitos', 'id'], ['pontos', 'id'], ['comandos', 'id']]) {
    const ja = tem(r[chave], campo);
    for (const x of extra[chave] || []) if (!ja.has(String(x[campo]))) r[chave].push(JSON.parse(JSON.stringify(x)));
  }
  return r;
}

// Posições lidas da planta/3D: { id → [x, y, z?] } (ou Map). Devolve uma CÓPIA com
// ponto.posicao preenchida; ponto que não coube na planta fica com posicao null.
function comPosicoes(inst, posicoes) {
  const r = JSON.parse(JSON.stringify(inst));
  const get = posicoes instanceof Map ? (k) => posicoes.get(k) : (k) => posicoes?.[k];
  for (const p of r.pontos) { const v = get(String(p.id)); p.posicao = Array.isArray(v) ? v : null; }
  return r;
}

module.exports = {
  VERSAO, TIPOS_CIRCUITO, TIPOS_COMANDO, TIPOS_CARGA, TIPOS_DISPOSITIVO,
  novaInstalacao, validarInstalacao, resumoInstalacao, juntarInstalacoes, comPosicoes,
  tagDisjuntor, tagDr, letraRetorno, comandoDeInterruptores, contadorDeIds, contadorDeRetornos,
};
