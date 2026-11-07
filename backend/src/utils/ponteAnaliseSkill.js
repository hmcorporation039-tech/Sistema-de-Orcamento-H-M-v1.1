// Ponte "Análise de Projeto (PDF) → formulário da skill da disciplina".
// Pega o que a leitura do PDF achou (ambientes com área, câmeras por ambiente,
// pontos de rede, quadro de cargas, carimbo) e preenche os dados de entrada do
// cálculo normativo da skill (skills/<disciplina>). Tudo que é ESTIMADO — e não
// lido do projeto — vai listado em `avisos` com [CONFERIR], para o projetista
// revisar no formulário antes de gerar documentos e orçamento.

const um = (v) => Math.round(v * 10) / 10;
// data de Brasília (UTC depois das 21h já é o dia seguinte) — utils/dataHoje.js
const { hojeBrasilia: hoje } = require('./dataHoje');

function base(motor, analise, extraido) {
  const vazio = typeof motor.modeloVazio === 'function' ? motor.modeloVazio() : motor.modeloVazio;
  const dados = JSON.parse(JSON.stringify(vazio));
  const cb = extraido.find(e => e.carimbo)?.carimbo || {};
  // obra do sistema (quando o projeto nasce ligado a uma) vale mais que o nome do
  // cliente: antes o título e a "Obra/Instalação" saíam com o nome do cliente e
  // dois projetos do mesmo cliente ficavam com o mesmo nome (teste de 28/10/2026)
  const obra = analise.obra || null;
  dados.meta = { ...dados.meta, titulo: analise.nomeProjeto || obra?.nome || analise.cliente || 'Projeto', data: hoje(), revisao: cb.revisao ? `R${String(cb.revisao).replace(/^R/i, '')}` : dados.meta?.revisao };
  dados.cliente = { ...dados.cliente, nome: analise.cliente || obra?.cliente_nome || '' };
  dados.obra = { ...dados.obra, nome: obra?.nome || analise.nomeProjeto || analise.cliente || '' };
  return dados;
}

// ── Medidas de cada ambiente ─────────────────────────────────────────────
// Antes: perímetro = 4·√área e recinto quadrado para todos. Um corredor de
// 1,2 × 10 m tem 22,4 m de perímetro e o quadrado dava 13,9 (menos TUG pela NBR
// 5410 9.5.2.2) e o detector era espaçado num quadrado de 3,5 m (revisão de
// 29/10/2026). Agora vale, nesta ordem: o polígono do ambiente (DWG/DXF, no
// próprio ambiente ou no desenho de referência da compatibilização, casado pelo
// nome), o perímetro lido, e só por fim o quadrado equivalente.
const chaveAmb = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
function perimetroDoPoligono(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += Math.hypot(x2 - x1, y2 - y1); }
  return s;
}
// retângulo mínimo que envolve o polígono (gira pelas direções das arestas)
function retanguloDoPoligono(p) {
  let melhor = null;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const c = Math.cos(ang), s = Math.sin(ang);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of p) {
      const u = x * c + y * s, v = -x * s + y * c;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const a = (maxU - minU) * (maxV - minV);
    if (a > 0 && (!melhor || a < melhor.a)) melhor = { a, d1: maxU - minU, d2: maxV - minV };
  }
  return melhor ? { comprimento: Math.max(melhor.d1, melhor.d2), largura: Math.min(melhor.d1, melhor.d2) } : null;
}
const poligonoValido = (p) => Array.isArray(p) && p.length >= 3 && p.every(q => Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]));
function areaDoPoligono(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}
// Polígono da referência para o ambiente. Ambientes de MESMO nome (dois "BANHEIRO") não trocam de polígono: o mapa
// guarda a lista de polígonos de cada nome e vale o de área mais perto da lida, ainda não usado (`usados`). Antes o
// mapa por nome guardava só o último: o banheiro de 2 m² saía com as medidas do de 12 m².
function poligonoDaReferencia(a, poligonosPorNome, usados) {
  const v = poligonosPorNome?.get(chaveAmb(a.nome));
  if (!v) return null;
  const lista = poligonoValido(v) ? [v] : v.filter(poligonoValido); // aceita o formato antigo (um polígono por nome)
  const livres = lista.filter(p => !usados?.has(p));
  const area = Number(a.area_m2) || 0;
  const escolhido = (livres.length ? livres : lista)
    .map(p => ({ p, d: area > 0 ? Math.abs(areaDoPoligono(p) - area) : 0 })).sort((x, y) => x.d - y.d)[0]?.p || null;
  if (escolhido) usados?.add(escolhido);
  return escolhido;
}
function medidasDoAmbiente(a, poligonosPorNome, usados = null) {
  const area = Number(a.area_m2) || 0;
  const pol = poligonoValido(a.poligono) ? a.poligono : poligonoDaReferencia(a, poligonosPorNome, usados);
  const per = Number(a.perimetro_m) > 0 ? Number(a.perimetro_m) : pol ? perimetroDoPoligono(pol) : null;
  // retângulo mínimo já calculado pela leitura do CAD (services/analiseCad), quando vem
  const r = a.retangulo;
  const ret = r && Number(r.comprimento_m) > 0 && Number(r.largura_m) > 0
    ? { comprimento: Math.max(r.comprimento_m, r.largura_m), largura: Math.min(r.comprimento_m, r.largura_m) } : null;
  let dim = ret || (pol ? retanguloDoPoligono(pol) : null);
  if (!dim && per && area > 0) {
    // retângulo com a mesma área e perímetro: C + L = P/2, C·L = A
    const s = per / 2, disc = s * s - 4 * area;
    if (disc >= 0) dim = { comprimento: (s + Math.sqrt(disc)) / 2, largura: (s - Math.sqrt(disc)) / 2 };
  }
  const lido = !!(ret || pol || per);
  return {
    perimetro_m: um(per || 4 * Math.sqrt(area)),
    comprimento_m: um(dim ? dim.comprimento : Math.sqrt(area)),
    largura_m: um(dim ? dim.largura : Math.sqrt(area)),
    fonte: ret ? 'retângulo do CAD' : pol ? 'polígono' : per ? 'perímetro' : 'quadrado',
    lido,
    pe_direito_m: Number(a.pe_direito_m) > 0 ? Number(a.pe_direito_m) : null,
  };
}
// nomes repetidos ficam únicos no formulário da skill ("BANHEIRO", "BANHEIRO 2"): a skill e a tela tratam o
// ambiente pelo nome, e dois iguais se confundiam
function ambientesComMedidas(analise) {
  const poligonos = new Map();
  for (const x of (analise.espacial?.ambientes || []).filter(y => poligonoValido(y.poligono))) {
    const k = chaveAmb(x.nome);
    (poligonos.get(k) || poligonos.set(k, []).get(k)).push(x.poligono);
  }
  const usados = new Set();
  const lista = (analise.ambientes || []).filter(a => a.area_m2 > 0);
  const nomes = new Set(lista.map(a => chaveAmb(a.nome)));
  const vezes = new Map();
  return lista.map(a => {
    const k = chaveAmb(a.nome);
    let n = (vezes.get(k) || 0) + 1;
    // o 2º "BANHEIRO" vira "BANHEIRO 2" (pulando um "BANHEIRO 2" que já exista)
    while (n > 1 && nomes.has(chaveAmb(`${a.nome} ${n}`))) n++;
    vezes.set(k, n);
    if (n > 1) nomes.add(chaveAmb(`${a.nome} ${n}`));
    return { ...a, ...(n > 1 ? { nome: `${a.nome} ${n}` } : {}), medidas: medidasDoAmbiente(a, poligonos, usados) };
  });
}
function avisoMedidas(amb, avisos, oQueEstima) {
  const estimados = amb.filter(a => !a.medidas.lido).length;
  const lidos = amb.length - estimados;
  if (lidos) avisos.push(`${lidos} ambiente(s) com perímetro e dimensões do próprio desenho (polígono/perímetro lido).`);
  if (estimados) avisos.push(`[CONFERIR] ${estimados} ambiente(s) só com a área: ${oQueEstima} estimado(s) como de um quadrado (4·√área / √área).`);
}

// ── Quadros de cargas ────────────────────────────────────────────────────
// Agrupados por título (utils/projetoParser.js → quadrosDeCargas). "IL 1" e
// "T 1" se repetem de um quadro para o outro: sem o agrupamento os circuitos de
// vários quadros viravam um quadro só, com IDs repetidos e os totais do 1º.
function quadrosLidos(extraido) {
  const lista = [];
  for (const e of extraido) {
    if (e.quadrosDeCargas?.length) { lista.push(...e.quadrosDeCargas.map(q => ({ ...q, arquivo: e.arquivo }))); continue; }
    if (!e.quadroCargas?.length) continue;
    const porTitulo = new Map();
    for (const c of e.quadroCargas) {
      const k = c.quadro || null;
      (porTitulo.get(k) || porTitulo.set(k, []).get(k)).push(c);
    }
    for (const [quadro, circuitos] of porTitulo) lista.push({ quadro, pavimento: circuitos[0]?.pavimento || null, circuitos, totais: null, totaisTexto: e.totaisQuadro || null, arquivo: e.arquivo });
  }
  return lista;
}
// Nome único de cada quadro para o ID do circuito e a escolha na skill de quadros: dois quadros de mesmo título
// (ou sem título, em arquivos diferentes) levam o pavimento/arquivo e, se ainda repetir, o nº — senão os IDs
// "QD C1" se repetiam e a skill pegava sempre o 1º
const chaveQuadro = (s) => String(s || '').replace(/\s/g, '').toUpperCase();
function rotulosDosQuadros(quadros) {
  const vezes = new Map();
  for (const q of quadros) vezes.set(chaveQuadro(q.quadro), (vezes.get(chaveQuadro(q.quadro)) || 0) + 1);
  const usados = new Map();
  return new Map(quadros.map((q) => {
    let r = q.quadro || null;
    if (vezes.get(chaveQuadro(q.quadro)) > 1) r = `${q.quadro || 'Quadro'} (${q.pavimento || q.arquivo || 'sem título'})`;
    const n = (usados.get(chaveQuadro(r)) || 0) + 1;
    usados.set(chaveQuadro(r), n);
    return [q, r && n > 1 ? `${r} #${n}` : r];
  }));
}
// "3F+N+T" → 3 fases, com neutro; sem esquema, pelas letras das fases
function ligacaoDoCircuito(c) {
  const esq = String(c.esquema || '').toUpperCase();
  let nF = 0, neutro = null;
  if (esq) {
    const m = esq.match(/(\d)\s*F/);
    nF = m ? Number(m[1]) : (esq.match(/F/g) || []).length;
    neutro = /\bN\b|\+N/.test(esq);
  }
  if (!nF) nF = String(c.fases || '').replace(/[^ABCRST]/gi, '').length || 1;
  return { nF: Math.min(3, nF), neutro };
}
const zerado = (c) => !(Number(c.potencia_W) > 0 || Number(c.potencia_VA) > 0);
const fmtKva = (va) => `${String(Math.round(va / 100) / 10).replace('.', ',')} kVA`;

// ── Elétrica (NBR 5410) ──────────────────────────────────────────────────
const TIPO_AMBIENTE = [
  [/DORM|QUARTO|SU[ÍI]TE/i, 'dormitorio'], [/COZINHA|COPA/i, 'cozinha'], [/SERVI[ÇC]O|LAVANDERIA|DML/i, 'area_servico'],
  [/BANH|WC|SANIT|LAVABO|VESTI[ÁA]RIO/i, 'banheiro'], [/VARANDA|SACADA/i, 'varanda'], [/GARAGEM|ESTACION/i, 'garagem'],
  [/EXTERN|JARDIM|P[ÁA]TIO/i, 'externa'], [/^SALA DE ESTAR|^SALA$|^ESTAR/i, 'sala'],
];
const tipoAmbiente = (nome) => (TIPO_AMBIENTE.find(([re]) => re.test(nome)) || [null, 'outros'])[1];

function tipoCircuito(c) {
  const t = `${c.circuito} ${c.descricao || ''}`;
  if (/^IL|ILUMINA/i.test(t)) return 'iluminacao';
  if (/AR[- ]?COND|SPLIT|CHUVEIRO|BOMBA|MOTOR|FORNO|AQUECEDOR|ELEVADOR|TUE/i.test(t)) return 'tue';
  return 'tug';
}

function eletrica(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = ambientesComMedidas(analise);
  dados.ambientes = amb.map(a => ({
    nome: a.nome, tipo: tipoAmbiente(a.nome), area_m2: a.area_m2, perimetro_m: a.medidas.perimetro_m, tugs_adicionais: 0, iluminacao_va: null,
  }));
  if (amb.length) {
    avisos.push(`${amb.length} ambientes com área lida do projeto; tipo do ambiente deduzido pelo nome.`);
    avisoMedidas(amb, avisos, 'perímetro');
  }

  // o alimentador de outro quadro (linha "QD-Térreo" no quadro do QGBT) não é
  // circuito terminal; circuito sem potência (reserva, ponto de espera) também não entra
  const quadros = quadrosLidos(extraido);
  const varios = quadros.filter(q => q.circuitos.some(c => !c.alimentador)).length > 1;
  const circuitos = [];
  let alimentadores = 0, semPotencia = 0;
  for (const q of quadros) {
    for (const c of q.circuitos) {
      if (c.alimentador) { alimentadores++; continue; }
      if (zerado(c)) { semPotencia++; continue; }
      circuitos.push({ c, q });
    }
  }
  if (circuitos.length) {
    const rotulo = rotulosDosQuadros(quadros);
    dados.circuitos = circuitos.map(({ c, q }) => {
      const { nF } = ligacaoDoCircuito(c);
      const nomeQ = rotulo.get(q);
      return {
        id: varios && nomeQ ? `${nomeQ} ${c.circuito}` : c.circuito,
        descricao: c.descricao || (varios && nomeQ ? `${c.circuito} (${nomeQ})` : c.circuito), tipo: tipoCircuito(c),
        ligacao: nF >= 3 ? 'FFF' : nF === 2 ? 'FF' : 'FN',
        potencia_va: Math.round(Number(c.potencia_VA) > 0 ? c.potencia_VA : c.potencia_W / (c.fp || 1)), comprimento_m: null, agrupamento: null, ambientes: '',
        ...(nomeQ ? { quadro: nomeQ } : {}),
      };
    });
    avisos.push(`${circuitos.length} circuitos lidos do quadro de cargas (potência e ligação do projeto)${alimentadores ? `; ${alimentadores} alimentador(es) de outros quadros fora da lista` : ''}${semPotencia ? `; ${semPotencia} reserva(s)/circuito(s) sem potência fora` : ''}. [CONFERIR] comprimentos: o PDF não traz — o cálculo usa o comprimento médio do formulário até você informar.`);
    if (varios) {
      avisos.push(`[CONFERIR] ${quadros.length} quadros no projeto, calculados juntos neste formulário (o ID do circuito leva o quadro): ${quadros.map(q => `${q.quadro || 'sem título'}${q.pavimento ? ` (${q.pavimento})` : ''}: ${q.circuitos.filter(c => !c.alimentador).length} circuito(s)${q.totais?.potencia_VA ? `, ${fmtKva(q.totais.potencia_VA)}` : ''}`).join('; ')}. Para dimensionar cada quadro separado, use um formulário por quadro (ou a skill de quadros).`);
    }
    const lista = circuitos.map(x => x.c);
    const t = quadros.find(q => q.totaisTexto)?.totaisTexto || extraido.find(e => e.totaisQuadro)?.totaisQuadro || null;
    const tensoes = new Set(lista.map(c => Number(c.tensao_V)).filter(Boolean));
    if (t?.fases === 'ABC' || lista.some(c => ligacaoDoCircuito(c).nF === 3)) dados.instalacao.sistema = 'trifasico';
    if (tensoes.has(220) && (tensoes.has(380) || (t?.corrente_A && /ABC/.test(t.fases || '')))) { dados.instalacao.tensao_fn = 220; dados.instalacao.tensao_ff = 380; }
    // Fator de demanda DO PROJETO: nos totais de cada quadro (demanda ÷ potência
    // instalada, sem os quadros que só somam os de baixo), no total do texto, ou
    // na média dos circuitos. Sem isso a skill aplica fatores residenciais
    // típicos — numa escola real deu 5,9 kVA contra 17 kW do projeto.
    const terminais = quadros.filter(q => !q.circuitos.some(c => c.alimentador) && q.totais?.demanda_kVA > 0 && q.totais?.potencia_VA > 0);
    const instalado = lista.reduce((s, c) => s + (Number(c.potencia_W) || 0), 0);
    const comFd = lista.some(c => c.fd != null);
    const fdProjeto = terminais.length
      ? terminais.reduce((s, q) => s + q.totais.demanda_kVA * 1000, 0) / terminais.reduce((s, q) => s + q.totais.potencia_VA, 0)
      : t?.demandada_W && t?.instalada_W ? t.demandada_W / t.instalada_W
        : instalado && comFd ? lista.reduce((s, c) => s + c.potencia_W * (c.fd || 1), 0) / instalado : null;
    if (fdProjeto && fdProjeto > 0 && fdProjeto <= 1) {
      const fator = Math.round(fdProjeto * 100) / 100;
      dados.instalacao.fd_ilum_tug = [{ ate_kw: null, fator }];
      dados.instalacao.fd_tue = [{ ate_qtd: null, fator }];
      avisos.push(`Fator de demanda ${String(fator).replace('.', ',')} do próprio quadro de cargas (no lugar dos fatores residenciais típicos).`);
    }
    if (t?.disjuntor_geral_A) avisos.push(`Quadro de cargas do projeto: disjuntor geral ${t.disjuntor_geral_A} A, alimentador ${t.alimentador_mm2} mm², demanda ${t.demandada_W} W — compare com o resultado do cálculo.`);
  } else if (extraido.some(e => e.quadroCargasNaoLido)) {
    avisos.push('[CONFERIR] O projeto tem quadro de cargas, mas nenhum circuito foi lido — lance os circuitos no formulário.');
  }
  return dados;
}

// ── Quadros (fabricação — skills/quadros) ────────────────────────────────
// Cada quadro de cargas lido é um painel candidato com os seus circuitos de
// saída (no QGBT, os alimentadores dos outros quadros SÃO as saídas). Vem o
// escolhido em `opcoes.quadro` (título) ou o primeiro com circuitos; os demais
// ficam em `candidatos` para a tela oferecer um formulário por quadro.
const FASE_LETRA = { R: 'A', S: 'B', T: 'C', A: 'A', B: 'B', C: 'C' };
function circuitoDoQuadro(c) {
  const { nF, neutro } = ligacaoDoCircuito(c);
  const comNeutro = neutro ?? nF === 1;
  const ligacao = nF >= 3 ? (comNeutro ? 'FFFN' : 'FFF') : nF === 2 ? (comNeutro ? 'FFN' : 'FF') : 'FN';
  const reserva = zerado(c) && /reserva|^R\s?\d+$/i.test(`${c.descricao || c.circuito}`);
  return {
    n: String(c.circuito), descricao: c.descricao || String(c.circuito),
    tipo: reserva ? 'reserva' : c.alimentador ? 'outro' : tipoCircuito(c),
    ligacao, fases: [...String(c.fases || '').toUpperCase()].map(f => FASE_LETRA[f]).filter(Boolean).join(''),
    potencia_w: Number(c.potencia_W) || 0, fp: c.fp || null, ib_a: c.ip_A ?? c.corrente_A ?? null,
    disjuntor_a: c.disjuntor_A || null, curva: 'C', dr: '', dr_grupo: '', dr_ma: 30, secao_mm2: c.secao_mm2 ?? c.cabo_mm2 ?? null,
  };
}
function quadrosSkill(motor, analise, extraido, avisos, opcoes = {}) {
  const dados = base(motor, analise, extraido);
  const lista = quadrosLidos(extraido).filter(q => q.circuitos.length);
  const rotulo = rotulosDosQuadros(lista);
  // `rotulo`: nome único (dois quadros de mesmo título) — a tela pode mandá-lo em opcoes.quadro
  const candidatos = lista.map(q => ({ quadro: q.quadro, ...(rotulo.get(q) !== q.quadro ? { rotulo: rotulo.get(q) } : {}), pavimento: q.pavimento || null, circuitos: q.circuitos.length, arquivo: q.arquivo, potencia_VA: q.totais?.potencia_VA ?? null }));
  if (!lista.length) {
    avisos.push('Nenhum quadro de cargas lido na análise — preencha o quadro e os circuitos no formulário.');
    return { dados, candidatos };
  }
  const q = (opcoes.quadro && (lista.find(x => rotulo.get(x) === opcoes.quadro) || lista.find(x => x.quadro === opcoes.quadro))) || lista[0];
  // disjuntor geral = o do alimentador deste quadro no quadro de cima (QGBT) — nome comparado sem espaço/caixa,
  // e nunca um circuito do próprio quadro
  const alimentador = lista.filter(x => x !== q).flatMap(x => x.circuitos).find(c => c.alimentador && q.quadro && chaveQuadro(c.circuito) === chaveQuadro(q.quadro));
  const tres = q.circuitos.some(c => ligacaoDoCircuito(c).nF === 3);
  const tensoes = new Set(q.circuitos.map(c => Number(c.tensao_V)).filter(Boolean));
  Object.assign(dados.quadro, {
    tag: q.quadro || dados.quadro.tag, descricao: `${q.quadro || 'Quadro'}${q.pavimento ? ` — ${q.pavimento}` : ''} (lido do projeto)`,
    sistema: tres ? 'trifasico' : dados.quadro.sistema,
    ...(tensoes.has(380) || tres ? { tensao_ff: 380, tensao_fn: 220 } : {}),
    ...(alimentador?.disjuntor_A ? { disjuntor_geral_a: alimentador.disjuntor_A } : {}),
  });
  dados.circuitos = q.circuitos.map(circuitoDoQuadro);
  avisos.push(`Quadro ${q.quadro || '(sem título)'}: ${q.circuitos.length} circuitos de saída lidos do quadro de cargas (potência, disjuntor, seção e fases do projeto).${alimentador ? ` Disjuntor geral ${alimentador.disjuntor_A} A = o do alimentador no quadro de cima.` : ''}`);
  avisos.push('[CONFERIR] DR, curva dos disjuntores, Icc no ponto de instalação, invólucro e grau de proteção não vêm do quadro de cargas — ajuste no formulário.');
  if (lista.length > 1) avisos.push(`O projeto tem ${lista.length} quadros: ${candidatos.map(c => `${c.quadro || 'sem título'} (${c.circuitos} circuitos)`).join(', ')} — gere um projeto de fabricação por quadro.`);
  return { dados, candidatos };
}

// ── CFTV ─────────────────────────────────────────────────────────────────
function cftv(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const porAmbiente = (analise.pontosPorAmbiente || []).filter(p => p.cftv > 0);
  const total = analise.cameras?.total || 0;
  const linha = (local, qtd, n) => ({
    id: `CAM${n}`, local, tipo: /EXTERN|FACHADA|ESTACION|P[ÁA]TIO|PORT[ÃA]O|PER[ÍI]METRO|ACESSO/i.test(local) ? 'bullet' : 'dome',
    quantidade: qtd, resolucao_mp: '4', hfov_graus: 90, objetivo: 'observacao', distancia_alvo_m: 10, distancia_cabo_m: 30,
    externa: /EXTERN|FACHADA|ESTACION|P[ÁA]TIO|PORT[ÃA]O|PER[ÍI]METRO/i.test(local), modelo: '',
  });
  const somaAmb = porAmbiente.reduce((s, p) => s + p.cftv, 0);
  dados.cameras = porAmbiente.map((p, i) => linha(p.ambiente, p.cftv, i + 1));
  if (total > somaAmb) dados.cameras.push(linha('Sem ambiente identificado', total - somaAmb, dados.cameras.length + 1));
  if (dados.cameras.length) {
    avisos.push(`${total} câmeras do projeto distribuídas por ${porAmbiente.length} ambientes (proximidade do rótulo, aproximado).`);
    avisos.push('[CONFERIR] resolução 4 MP, abertura 90°, objetivo "observação", alvo a 10 m e cabo de 30 m são valores típicos — o PDF não traz lente nem campo de visão. Dome/bullet e interna/externa deduzidos pelo nome do ambiente.');
  }
  return dados;
}

// ── Cabeamento estruturado (NBR 14565) ───────────────────────────────────
// Distâncias do distribuidor (rack) a cada ponto de rede pelas posições do
// DWG/DXF (compatibilização): caminho em "L" (|dx| + |dy|, como a eletrocalha
// corre) + subida/descida adotadas. Sem posição, ficam os 30/60 m típicos.
const DESCIDA_REDE_M = 3; // subida no rack + descida até o ponto (adotado)
const RE_RACK = /\bRACK\b|DISTRIBUIDOR|\bDG\b|\bD[PA]\b|\bBEP\b/i;
const RE_PONTO_REDE = /REDE|TELECOM|RJ-?45|L[ÓO]GIC|DADOS|ACCESS ?POINT|\bAP\b/i;
function distanciasDeRede(espacial) {
  const pontos = (espacial?.pontos || []).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const racks = pontos.filter(p => RE_RACK.test(p.descricao || ''));
  const rede = pontos.filter(p => !RE_RACK.test(p.descricao || '') && (['rede', 'cabeamento'].includes(p.disciplina) || RE_PONTO_REDE.test(p.descricao || '')));
  if (!racks.length || !rede.length) return null;
  const d = rede.map(p => Math.min(...racks.map(r => Math.abs(p.x - r.x) + Math.abs(p.y - r.y))) + DESCIDA_REDE_M);
  return { media: Math.round(d.reduce((s, x) => s + x, 0) / d.length), maxima: Math.round(Math.max(...d)), pontos: d.length, racks: racks.length, acima90: d.filter(x => x > 90).length };
}
function cabeamento(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const pontos = analise.pontosRedeAntena?.rede?.total || 0;
  const area = (analise.ambientes || []).reduce((s, a) => s + (a.area_m2 || 0), 0);
  const dist = distanciasDeRede(analise.espacial);
  dados.pavimentos = [{
    nome: 'Pavimento do projeto', area_util_m2: 0, distancia_media_m: dist ? dist.media : 30, distancia_max_m: dist ? dist.maxima : 60, aps: 0, pontos_extra: pontos || dist?.pontos || 0,
  }];
  avisos.push(`${pontos || dist?.pontos || 0} pontos de rede do projeto entram como pontos do pavimento (a área ficou 0 para o cálculo não somar tomadas por área de trabalho em cima da contagem real; área útil lida: ${Math.round(area)} m²).`);
  if (dist) {
    avisos.push(`Distâncias pelo desenho: ${dist.pontos} ponto(s) até o rack mais próximo (${dist.racks} rack/distribuidor): média ${dist.media} m, máxima ${dist.maxima} m — caminho em "L" + ${DESCIDA_REDE_M} m de subida/descida (adotado). [CONFERIR]${dist.acima90 ? ` ${dist.acima90} ponto(s) passam de 90 m (limite do enlace permanente, NBR 14565).` : ''}`);
    avisos.push('[CONFERIR] número de pavimentos e de access points — não vêm do desenho.');
  } else {
    avisos.push('[CONFERIR] distâncias média (30 m) e máxima (60 m) do distribuidor, número de pavimentos e de access points — não vêm do PDF.');
  }
  return dados;
}

// ── Detecção e alarme de incêndio (NBR 17240) ────────────────────────────
const PE_DIREITO_INCENDIO = 3; // adotado quando o projeto não traz
function incendio(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = ambientesComMedidas(analise);
  dados.ambientes = amb.map(a => ({
    nome: a.nome, pavimento: 'Térreo', comprimento_m: a.medidas.comprimento_m, largura_m: a.medidas.largura_m, pe_direito_m: a.medidas.pe_direito_m || PE_DIREITO_INCENDIO,
    detector: /BANH|WC|SANIT|COZINHA|COPA|CALDEIRA|GARAGEM/i.test(a.nome) ? 'temperatura' : 'fumaca', altura_viga_m: null,
    rota_fuga: /CORREDOR|CIRCULA|HALL|ESCADA|RAMPA|PATAMAR|ANTECÂMARA|ANTECAMARA/i.test(a.nome), escada: /ESCADA/i.test(a.nome),
    saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null,
  }));
  const areaTotal = amb.reduce((s, a) => s + a.area_m2, 0);
  dados.pavimentos = [{ nome: 'Térreo', area_m2: Math.round(areaTotal), maior_caminhamento_m: Math.round(Math.sqrt(areaTotal) * 1.5), saidas_emergencia: 1 }];
  if (amb.length) {
    avisos.push(`${amb.length} ambientes com área lida do projeto.`);
    avisoMedidas(amb, avisos, 'comprimento × largura');
    const semPe = amb.filter(a => !a.medidas.pe_direito_m).length;
    avisos.push(`[CONFERIR] ${semPe ? `pé-direito ${PE_DIREITO_INCENDIO} m adotado em ${semPe} ambiente(s), ` : ''}um único pavimento, maior caminhamento ≈ 1,5·√área e 1 saída — o PDF de planta não traz esses dados. Detector de temperatura em banheiros/cozinhas e rota de fuga em circulações deduzidos pelo nome.`);
  }
  return dados;
}

// ── Iluminação (NBR ISO/CIE 8995-1) ──────────────────────────────────────
// Antes não havia mapeador: só a identificação vinha da análise. Agora os
// ambientes vão com as dimensões (polígono/perímetro, como acima) e a atividade
// deduzida pelo nome; a luminária é uma genérica adotada até o projetista
// escolher a do projeto.
const ATIVIDADE_PELO_NOME = [
  [/ESCADA/i, 'escadas'], [/CIRCULA|CORRED|HALL|PASSAGEM/i, 'circulacao'], [/BANH|WC|SANIT|LAVABO|VESTI[ÁA]RIO/i, 'banheiro'],
  [/COPA|REFEIT/i, 'copa'], [/ESPERA/i, 'espera'], [/RECEP/i, 'recepcao'], [/DEP[ÓO]SITO|ALMOX|DML|ARQUIVO MORTO/i, 'deposito'],
  [/QUADRO|M[ÁA]QUINA|T[ÉE]CNICA|GERADOR|SUBESTA/i, 'casa_maquinas'], [/GARAGEM|ESTACION/i, 'garagem_vias'], [/REUNI|CONFER[ÊE]NCIA|AUDIT/i, 'reuniao'],
  [/AULA|CLASSE/i, 'sala_aula'], [/LABORAT/i, 'laboratorio_ensino'], [/BIBLIOT/i, 'biblioteca'], [/COZINHA/i, 'cozinha_comercial'],
  [/DORM|QUARTO|SU[ÍI]TE/i, 'res_dormitorio'], [/^SALA DE ESTAR|^ESTAR|^LIVING/i, 'res_sala'], [/SERVI[ÇC]O|LAVANDERIA/i, 'res_servico'],
  [/LOJA|VENDA/i, 'comercio_vendas'], [/ESCRIT|ADMIN|DIRETOR|SECRET|COORDEN|GER[ÊE]NCIA|SALA/i, 'escritorio'],
];
const LUMINARIA_ADOTADA = { codigo: 'LUM-ADOTADA', descricao: 'Luminária LED genérica (adotada — troque pela do projeto)', tipo: 'embutir', potencia_w: 32, fluxo_lm: 4000, ra: 80, tcc_k: 4000, ugr: 19, fu: null };
function iluminacao(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = ambientesComMedidas(analise);
  if (!amb.length) {
    avisos.push('Nenhum ambiente com área lido na análise — preencha os ambientes no formulário.');
    return dados;
  }
  if (!(dados.luminarias || []).length) dados.luminarias = [{ ...LUMINARIA_ADOTADA }];
  let deduzidas = 0;
  dados.ambientes = amb.map(a => {
    const ativ = ATIVIDADE_PELO_NOME.find(([re]) => re.test(a.nome));
    if (!ativ) deduzidas++;
    return {
      nome: a.nome, atividade: ativ ? ativ[1] : 'escritorio', area_m2: a.area_m2, comprimento_m: a.medidas.comprimento_m, largura_m: a.medidas.largura_m,
      ...(a.medidas.pe_direito_m ? { pe_direito_m: a.medidas.pe_direito_m } : {}), luminaria: dados.luminarias[0].codigo,
    };
  });
  avisos.push(`${amb.length} ambientes com área lida do projeto; atividade (iluminância da NBR ISO/CIE 8995-1) deduzida pelo nome${deduzidas ? ` — ${deduzidas} sem nome reconhecido ficaram como "escritório" [CONFERIR]` : ''}.`);
  avisoMedidas(amb, avisos, 'comprimento × largura');
  avisos.push(`[CONFERIR] luminária "${LUMINARIA_ADOTADA.descricao}" (${LUMINARIA_ADOTADA.fluxo_lm} lm, ${LUMINARIA_ADOTADA.potencia_w} W) em todos os ambientes e pé-direito do formulário onde o projeto não traz — troque pela luminária do projeto.`);
  return dados;
}

// ── Alarme de intrusão ──
function alarme(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = (analise.ambientes || []).filter(a => a.area_m2 > 0);
  dados.ambientes = amb.map((a, i) => ({
    nome: a.nome, particao: 1, area_m2: a.area_m2, maior_dimensao_m: Math.round(Math.sqrt(a.area_m2) * 1.3 * 10) / 10,
    portas: 1, janelas: /BANH|WC|CIRCULA|CORREDOR|HALL|DEP[ÓO]SITO/i.test(a.nome) ? 0 : 1, janelas_acessiveis: true,
    pe_direito_m: 2.8, externo: false, animais: false, risco: 'normal', acesso_principal: i === 0,
  }));
  const esq = extraido.flatMap(e => e.esquadrias || []);
  if (amb.length) {
    avisos.push(`${amb.length} ambientes com área lida do projeto.`);
    avisos.push(`[CONFERIR] 1 porta e 1 janela por ambiente (sem janela em banheiros/circulações), maior dimensão ≈ 1,3·√área, pé-direito 2,8 m e acesso principal no primeiro ambiente — ajuste no formulário${esq.length ? `; a legenda de esquadrias do projeto traz ${esq.reduce((s, e) => s + e.quantidade, 0)} portas/janelas no total` : ''}.`);
  }
  return dados;
}

// Disciplinas com skill mas sem dados de planta aproveitáveis ainda: só
// identificação (cliente, obra, revisão) — o resto é preenchido no formulário.
function soIdentificacao(motor, analise, extraido, avisos) {
  avisos.push('Só a identificação (cliente, obra, revisão) veio da análise — os dados técnicos desta disciplina são preenchidos no formulário.');
  return base(motor, analise, extraido);
}

const MAPEADORES = {
  eletrica, cftv, cabeamento, incendio, alarme, iluminacao, quadros: quadrosSkill,
  spda: soIdentificacao, solar: soIdentificacao, carregador: soIdentificacao, automacao: soIdentificacao,
};

// `disciplinaSkill`: chave da skill (disciplinasLaudo). Devolve { dados, avisos }
// (e `candidatos` na de quadros: os quadros lidos, para um formulário por quadro).
// opcoes.quadro: título do quadro escolhido (skill de quadros).
function dadosDaAnalise(disciplinaSkill, motor, analise, opcoes = {}) {
  const avisos = [];
  const extraido = (analise.dadosExtraidos || []).filter(e => !e.semTexto);
  const mapear = MAPEADORES[disciplinaSkill] || soIdentificacao;
  const r = mapear(motor, analise, extraido, avisos, opcoes);
  if (r && r.dados && Array.isArray(r.candidatos)) return { dados: r.dados, avisos, candidatos: r.candidatos };
  return { dados: r, avisos };
}

module.exports = { dadosDaAnalise, tipoAmbiente, medidasDoAmbiente, quadrosLidos, distanciasDeRede };
