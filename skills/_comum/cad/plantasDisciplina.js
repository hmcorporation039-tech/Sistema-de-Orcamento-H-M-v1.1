// Do resultado do cálculo de cada skill → pontos da planta (quantidades
// normativas por ambiente). Uma função por disciplina; cada uma devolve
// { pontos, notas } para gerarPlanta (./planta.js).
const { normalizar, casaNome } = require('./planta');
const palavrasDe = (s) => normalizar(s).split(' ').filter(Boolean);

// ── Elétrica (NBR 5410 9.5.2) ──
function eletrica(res) {
  const { calc } = res;
  const circuitoDe = (amb, tipo) => {
    const c = calc.circuitos.find(x => x.tipo === tipo && normalizar(`${x.ambientes || ''} ${x.descricao || ''}`).includes(normalizar(amb)));
    return c ? c.id : '';
  };
  const pontos = calc.previsao.map(a => ({
    ambiente: a.nome,
    itens: [
      { simbolo: 'HM-ELE-TOMADA-BAIXA', n: a.nTug, regra: 'perimetro', prefixo: 'T', atributos: { CIRCUITO: circuitoDe(a.nome, 'tug') } },
      { simbolo: 'HM-ELE-TUE', n: (a.tues || []).length, regra: 'perimetro', prefixo: 'E', atributos: (k) => ({ POTENCIA: `${a.tues[k].potencia_w} W` }) },
      // um ponto de luz a cada ~16 m² (mínimo 1 por cômodo, 9.5.2.1.1) — [CONFERIR] com o luminotécnico
      { simbolo: 'HM-ELE-PONTO-LUZ', n: Math.max(1, Math.round(a.area_m2 / 16)), regra: 'grade', prefixo: 'L', atributos: { CIRCUITO: circuitoDe(a.nome, 'iluminacao') } },
      // junto à porta, do lado da fechadura (sem porta detectada → parede)
      { simbolo: 'HM-ELE-INTERRUPTOR', n: 1, regra: 'porta', lado: 'fechadura', prefixo: 'S' },
    ],
  }));
  if (pontos[0]) pontos[0].itens.push({ simbolo: 'HM-ELE-QUADRO', n: 1, regra: 'perimetro', prefixo: 'QD' });
  return {
    pontos,
    notas: [
      'Tomadas pela NBR 5410 9.5.2.2 (quantidade mínima por perímetro/área), distribuídas igualmente nas paredes.',
      'Pontos de luz: mínimo 1 por cômodo (9.5.2.1); quantidade por área a conferir com o projeto luminotécnico.',
      'Interruptores junto ao batente da fechadura das portas detectadas na arquitetura (a 1,10 m do piso); posição do quadro indicativa — ajustar ao layout.',
      'Eletrodutos e numeração final dos circuitos a completar pelo projetista.',
    ],
  };
}

// ── Detecção e alarme de incêndio (NBR 17240) ──
function incendio(res) {
  const { calc } = res;
  const rotas = calc.ambientes.filter(a => a.rota_fuga);
  let restAc = calc.nAc, restAv = calc.nAv;
  const pontos = calc.ambientes.map(a => ({
    ambiente: a.nome,
    itens: [{ simbolo: a.tipo === 'temperatura' ? 'HM-INC-DETECTOR-TEMP' : 'HM-INC-DETECTOR-FUMACA', n: a.detectores, regra: 'grade', prefixo: a.tipo === 'temperatura' ? 'DT' : 'DF' }],
  }));
  // acionadores e avisadores nas rotas de fuga (ou em todos, se nenhuma marcada)
  const alvo = (rotas.length ? rotas : calc.ambientes);
  alvo.forEach((a, i) => {
    const p = pontos.find(x => x.ambiente === a.nome);
    const nAc = Math.ceil(restAc / (alvo.length - i)), nAv = Math.ceil(restAv / (alvo.length - i));
    restAc -= nAc; restAv -= nAv;
    // acionador junto às portas (saídas) do ambiente; sem porta detectada → parede
    p.itens.push({ simbolo: 'HM-INC-ACIONADOR', n: nAc, regra: 'porta', lado: 'dobradica', prefixo: 'AM' }, { simbolo: 'HM-INC-AVISADOR', n: nAv, regra: 'perimetro', prefixo: 'AV' });
  });
  if (pontos[0]) pontos[0].itens.push({ simbolo: 'HM-INC-CENTRAL', n: 1, regra: 'perimetro', prefixo: 'CAI-' });
  return {
    pontos,
    notas: [
      'Detectores pontuais em grade pelo raio de cobertura (NBR 17240 5.4.1.1), com redução por vigas quando informada.',
      'Acionadores manuais a no máximo 30 m de qualquer ponto (5.5.3), junto às saídas e rotas de fuga; avisadores audiovisuais nas rotas.',
      'Posicionamento indicativo — conferir obstáculos, forro, luminárias e difusores de ar.',
    ],
  };
}

// ── CFTV ──
function cftv(res) {
  const pontos = res.calc.cameras.map(c => ({
    ambiente: c.local,
    itens: [{ simbolo: 'HM-CFTV-CAMERA', n: c.qtd, regra: 'cantos', prefixo: 'CAM' }],
  }));
  return {
    pontos,
    notas: [
      'Câmeras nos cantos do ambiente apontando para o centro; conferir campo de visão e densidade de pixels (IEC 62676-4) da análise DORI.',
      'Cabo UTP de cada câmera até o switch PoE ≤ 90 m (NBR 14565).',
    ],
  };
}

// ── Cabeamento estruturado (NBR 14565) ──
// pontos por ambiente: 2 tomadas por área de trabalho (área ÷ área de trabalho)
function cabeamento(res, arquitetura) {
  const at = res.calc.cfg?.areaTrabalho || res.dados?.sistema?.area_trabalho_m2 || 10;
  const porAt = res.dados?.sistema?.tomadas_por_area || 2;
  const pontos = arquitetura.ambientes.map(a => ({
    ambiente: a.nome,
    itens: [{ simbolo: 'HM-CAB-PONTO-REDE', n: Math.ceil(a.area_m2 / at) * porAt, regra: 'perimetro', prefixo: 'R' }],
  }));
  if (pontos[0]) pontos[0].itens.push({ simbolo: 'HM-CAB-RACK', n: 1, regra: 'perimetro', prefixo: 'RK' });
  return {
    pontos,
    notas: [
      `Pontos de telecomunicações: ${porAt} por área de trabalho de ${at} m² (NBR 14565 6.7.7.1). Ambientes sem uso de escritório podem ser reduzidos.`,
      'Comprimento do cabo horizontal ≤ 90 m até o distribuidor (Tabela 3 da NBR 14565).',
    ],
  };
}

// ── Alarme de intrusão (EN 50131) ──
function alarme(res) {
  const { calc } = res;
  const pontos = calc.ambientes.filter(a => !a.externo).map(a => ({
    ambiente: a.nome,
    // portas detectadas na arquitetura: magnético no vão, teclado ao lado do
    // batente da porta principal, IVP no canto oposto à entrada (sem portas → perímetro/cantos)
    itens: [
      { simbolo: 'HM-ALM-IVP', n: a.ivps, regra: 'canto_oposto_porta', prefixo: 'IVP' },
      { simbolo: 'HM-ALM-MAGNETICO', n: a.magPortas ?? 0, regra: 'porta', lado: 'centro', prefixo: 'MG' },
      { simbolo: 'HM-ALM-MAGNETICO', n: a.magneticos - (a.magPortas ?? 0), regra: 'perimetro', prefixo: 'MG' },
      ...(a.acesso_principal ? [{ simbolo: 'HM-ALM-TECLADO', n: 1, regra: 'porta', lado: 'fechadura', prefixo: 'TEC' }] : []),
    ].filter(i => i.n > 0),
  }));
  // sirene interna: 1 no 1º ambiente de cada partição; central no 1º ambiente
  const porParticao = new Map();
  calc.ambientes.filter(a => !a.externo).forEach(a => { if (!porParticao.has(a.particao)) porParticao.set(a.particao, a.nome); });
  for (const nome of porParticao.values()) pontos.find(p => p.ambiente === nome)?.itens.push({ simbolo: 'HM-ALM-SIRENE', n: 1, regra: 'perimetro', prefixo: 'SI' });
  if (pontos[0]) pontos[0].itens.push({ simbolo: 'HM-ALM-CENTRAL', n: 1, regra: 'perimetro', prefixo: 'CA' });
  return {
    pontos,
    notas: [
      'IVP no canto do ambiente apontado para o interior, sem visada para janelas, fontes de calor ou ar-condicionado (EN 50131-2-2) — preferir o canto oposto à entrada.',
      'Sensor magnético em cada porta de acesso (no vão das portas detectadas na arquitetura) e janela acessível (EN 50131-2-6): ajustar a posição às esquadrias.',
      'Teclado junto à porta principal, dentro da área protegida, a cerca de 1,40 m do piso.',
      'Sirene externa na fachada, em altura de difícil acesso (EN 50131-4); central dentro da área protegida, fora da vista.',
    ],
  };
}

// ── Iluminação (NBR ISO/CIE 8995-1, método dos lúmens) ──
// Luminárias e sensores na grade que a SKILL calculou (nx × ny); comandos na parede.
function iluminacao(res) {
  const pontos = res.calc.ambientes.map(a => ({
    ambiente: a.nome,
    itens: [
      { simbolo: 'HM-ILU-LUMINARIA', n: a.n, regra: 'grade_nxny', nx: a.nx, ny: a.ny, prefixo: 'L', atributos: { } },
      ...(a.sensores?.n ? [{ simbolo: 'HM-ILU-SENSOR', n: a.sensores.n, regra: a.sensores.nx ? 'grade_nxny' : 'centro', nx: a.sensores.nx, ny: a.sensores.ny, prefixo: 'SP' }] : []),
      { simbolo: 'HM-ILU-COMANDO', n: Math.max(1, a.comandos?.total || 0), regra: 'perimetro', prefixo: 'CMD' },
    ],
  }));
  return {
    pontos,
    notas: [
      'Luminárias na grade calculada pelo método dos lúmens (NBR ISO/CIE 8995-1): ver memorial luminotécnico para Em, UGR e Uo de cada ambiente.',
      'Comandos (interruptores, dimmers, botoeiras/teclados DALI) junto às portas, a 1,10 m — posição indicativa.',
      'Sensores de presença no teto, cobertura conforme o fabricante; circuitos e barramentos DALI conforme o memorial.',
    ],
  };
}

// ── Elétrica hospitalar (NBR 13534) ──
function eletricaHospitalar(res) {
  const pontos = res.calc.ambientes.map(a => ({
    ambiente: a.nome,
    itens: [
      { simbolo: 'HM-HOSP-TOMADA-IT', n: a.tomadasIt || 0, regra: 'perimetro', prefixo: 'TI', atributos: { CIRCUITO: a.sistemaIt || '' } },
      { simbolo: 'HM-ELE-TOMADA-MEDIA', n: a.tomadasTn || 0, regra: 'perimetro', prefixo: 'T' },
      { simbolo: 'HM-ILU-LUMINARIA', n: a.luminarias || 0, regra: 'grade', prefixo: 'L' },
      ...(a.bel ? [{ simbolo: 'HM-HOSP-BEL', n: 1, regra: 'perimetro', prefixo: 'BEL' }] : []),
      ...((a.paineisAlarme || []).length ? [{ simbolo: 'HM-HOSP-PAINEL-ALARME', n: a.paineisAlarme.length, regra: 'perimetro', prefixo: 'PA' }] : []),
    ],
  }));
  return {
    pontos,
    notas: [
      'Locais classificados em grupo 0/1/2 e classe de comutação conforme a NBR 13534 e a RDC 50 (ver memorial) — classificação a acordar com a equipe médica.',
      'Tomadas "IT" alimentadas pelo sistema IT médico (transformador de separação + DSI), identificadas permanentemente; demais tomadas TN-S com DR 30 mA nos grupos 1 e 2.',
      'BEL em cada local dos grupos 1 e 2, com ligação de todas as massas e massas estranhas (resistência ≤ 0,2 Ω no grupo 2).',
      'Painel de alarme do DSI no próprio local (salas) ou no posto de enfermagem (leitos). Posições indicativas.',
    ],
  };
}

// ── Controle de acesso (IEC 60839-11-1) ──
// Cada porta da skill (`local`) vai para o ambiente da arquitetura de mesmo
// nome e para uma porta detectada nele: leitor do lado de fora junto ao batente
// da fechadura, botoeira e acionador de emergência do lado de dentro, eletroímã
// e sensor no vão. Portas iguais (qtd > 1) se espalham pelos ambientes
// de nome parecido (ex.: "Consultórios" → Consultório 1, 2, 3…).
function ambientesDoLocal(arquitetura, local, qtd) {
  const chave = normalizar(String(local).split(/\s[—–\-/]\s|\s\/\s/)[0]);
  const raiz = chave.replace(/(OES|AES|ES|S)\b/g, '');
  const nomes = arquitetura.ambientes.map(a => a.nome);
  // por palavras inteiras ("WC FEM" não casa com "WC"; "SALA" não casa com "SALAO")
  const exato = nomes.filter(n => normalizar(n) === chave || (palavrasDe(n).every(p => palavrasDe(local).includes(p)) && casaNome(local, n)));
  const parecidos = nomes.filter(n => (chave && palavrasDe(chave).every(p => palavrasDe(n).includes(p))) || (raiz.length >= 4 && normalizar(n).replace(/(OES|AES|ES|S)\b/g, '').includes(raiz)));
  const lista = [...new Set([...exato.sort((a, b) => b.length - a.length), ...parecidos])];
  return lista.length ? lista.slice(0, Math.max(1, qtd)) : [String(local).split(/\s[—–\-]\s/)[0]];
}

function controleAcesso(res, arquitetura) {
  const { calc } = res;
  const pontos = [];
  const usoPortas = {}; // ambiente → portas já usadas (2ª porta controlada da sala vai para a 2ª porta)
  const grupoDe = {};   // id da porta da skill → 1º grupo (a controladora fica nele)
  for (const p of calc.portas) {
    const ambs = ambientesDoLocal(arquitetura, p.local, p.qtd);
    for (let q = 0; q < p.qtd; q++) {
      const ambiente = ambs[q % ambs.length];
      const indice = usoPortas[ambiente] = (usoPortas[ambiente] ?? -1) + 1;
      const id = p.qtd > 1 ? `${p.id}.${q + 1}` : p.id;
      const doisLados = p.leitores >= 2;
      const itens = [
        { simbolo: 'HM-ACE-LEITOR', n: 1, regra: 'porta', lado: 'fechadura', fora: true, prefixo: `LE-${id}.` },
        ...(doisLados ? [{ simbolo: 'HM-ACE-LEITOR', n: p.leitores - 1, regra: 'porta', lado: 'fechadura', prefixo: `LS-${id}.` }] : []),
        { simbolo: 'HM-ACE-FECHADURA', n: p.nFechaduras, regra: 'porta', lado: 'centro', prefixo: `FE-${id}.` },
        { simbolo: 'HM-ACE-SENSOR', n: p.sensores, regra: 'porta', lado: 'centro', deslocamento: 0.45, prefixo: `SP-${id}.` },
        { simbolo: 'HM-ACE-BOTOEIRA', n: p.botoeiraSaida, regra: 'porta', lado: 'fechadura', deslocamento: doisLados ? 0.3 : 0, prefixo: `BS-${id}.` },
        { simbolo: 'HM-ACE-EMERGENCIA', n: p.botoeiraEmergencia, regra: 'porta', lado: 'fechadura', deslocamento: 0.3 + (p.botoeiraSaida ? 0.3 : 0), prefixo: `BE-${id}.` },
      ].filter(i => i.n > 0);
      const g = { ambiente, porta: indice, itens };
      pontos.push(g);
      if (!grupoDe[p.id]) grupoDe[p.id] = g;
    }
  }
  for (const c of calc.controladoras || []) {
    const g = grupoDe[c.portas?.[0]];
    if (g) g.itens.push({ simbolo: 'HM-ACE-CONTROLADORA', n: 1, regra: 'porta', lado: 'dobradica', deslocamento: 0.3, prefixo: `${c.id}-` });
  }
  for (const c of calc.catracas || []) {
    pontos.push({ ambiente: ambientesDoLocal(arquitetura, c.local, 1)[0], itens: [{ simbolo: 'HM-ACE-CATRACA', n: c.qtd, regra: 'grade', prefixo: `${c.id}.` }] });
  }
  return {
    pontos,
    notas: [
      'Leitor do lado de fora, junto ao batente da fechadura, a 1,10–1,20 m do piso (NBR 9050); leitor de saída e botoeiras do lado de dentro.',
      'Porta em rota de fuga: fechadura fail-safe, acionador de emergência (quebra-vidro) que corta a alimentação da fechadura e liberação pelo alarme de incêndio (NBR 9077 / IT de saídas de emergência).',
      'Eletroímã e sensor de porta no vão (marco superior). Controladora com fonte e bateria dentro da área protegida, perto das portas que atende.',
      `Portas posicionadas pelas aberturas de porta da arquitetura; sem porta detectada o ponto vai para a parede do ambiente — conferir.${(calc.cancelas || []).length ? ' Cancelas: posicionar no acesso de veículos.' : ''}`,
    ],
  };
}

// Ambiente de uma unidade na arquitetura: "COZINHA 101" / "APTO 101 - COZINHA";
// sem número da unidade na planta, vale a planta do pavimento-tipo (null)
function ambienteDaUnidade(arquitetura, ambiente, unidade) {
  const alvo = normalizar(ambiente), u = normalizar(unidade);
  return arquitetura.ambientes.find(a => { const n = normalizar(a.nome); return n.includes(alvo) && new RegExp(`(^|\\s)${u}(\\s|$)`).test(n); })?.nome || null;
}

// Pontos por unidade: no ambiente numerado quando existe; senão a unidade-tipo
// é desenhada uma vez (o mesmo ambiente com o maior número de pontos)
function pontosPorUnidade(arquitetura, registros) {
  const pontos = [];
  const tipo = new Map();
  for (const r of registros) {
    const nome = ambienteDaUnidade(arquitetura, r.ambiente, r.unidade);
    if (nome) { pontos.push({ ambiente: nome, itens: r.itens }); continue; }
    const t = tipo.get(r.ambiente);
    if (!t || r.itens.reduce((s, i) => s + i.n, 0) > t.itens.reduce((s, i) => s + i.n, 0)) tipo.set(r.ambiente, { ambiente: r.ambiente, itens: r.itens });
  }
  return { pontos: [...pontos, ...tipo.values()], tipo: tipo.size > 0 };
}

// ── Telefonia e interfonia ──
function telefonia(res, arquitetura) {
  const { calc } = res;
  const amb = calc.ambientes || [];
  // interfone na unidade: junto à porta de entrada do ambiente (lado da fechadura, ~1,40 m)
  const tel = (n) => ({ simbolo: 'HM-TEL-PONTO', n, regra: 'porta', lado: 'fechadura', prefixo: 'IT' });
  const { pontos, tipo } = pontosPorUnidade(arquitetura, amb.filter(a => a.tipo === 'unidade' && a.terminais > 0)
    .map(a => ({ ambiente: a.ambiente_planta, unidade: a.unidade, itens: [tel(a.terminais)] })));
  for (const a of amb.filter(x => ['area_comum', 'portaria'].includes(x.tipo) && x.terminais > 0)) pontos.push({ ambiente: a.ambiente_planta, itens: [tel(a.terminais)] });
  for (const a of amb.filter(x => x.tipo === 'portao' && x.porteiro > 0)) pontos.push({ ambiente: a.ambiente_planta, itens: [{ simbolo: 'HM-TEL-PORTEIRO', n: a.porteiro, regra: 'perimetro', prefixo: 'PE' }] });
  for (const a of amb.filter(x => x.tipo === 'dg')) pontos.push({ ambiente: a.ambiente_planta, itens: [{ simbolo: 'HM-TEL-DG', n: 1, regra: 'perimetro', prefixo: 'DG' }] });
  return {
    pontos,
    notas: [
      'Interfone/telefone junto à porta de entrada do ambiente indicado, a cerca de 1,40 m do piso; ramal e cabo conforme a planilha de ramais.',
      ...(tipo ? ['Planta do pavimento-tipo: pontos de uma unidade — repetir em todas as unidades do pavimento (ver quantitativo da planilha).'] : []),
      'Prumada (cabo CI) e caixas de distribuição por pavimento conforme o memorial; DG com bloco IDC-110 e aterramento no BEP.',
      'Porteiro eletrônico no portão/acesso de pedestres: posicionar no muro/pilar da entrada.',
    ],
  };
}

// ── Antena coletiva / TV ──
function antena(res, arquitetura) {
  const { calc } = res;
  const itensDe = (a) => (a.combinada
    ? [{ simbolo: 'HM-ANT-PONTO', n: Math.max(a.tomadasTv, a.tomadasSat), regra: 'perimetro', prefixo: 'TV' }]
    : [{ simbolo: 'HM-ANT-PONTO', n: a.tomadasTv, regra: 'perimetro', prefixo: 'TV' }, { simbolo: 'HM-ANT-SAT', n: a.tomadasSat, regra: 'perimetro', prefixo: 'SAT' }]).filter(i => i.n > 0);
  // unidade numerada na arquitetura → tomadas da própria unidade; senão a planta-tipo da 1ª torre
  const registros = (calc.unidades || []).flatMap(u => {
    const porAmb = new Map();
    for (const t of u.tomadas || []) {
      const a = porAmb.get(t.ambiente) || porAmb.set(t.ambiente, { ambiente: t.ambiente, tomadasTv: 0, tomadasSat: 0, combinada: false }).get(t.ambiente);
      if (t.tipo === 'TV/SAT') { a.combinada = true; a.tomadasTv++; a.tomadasSat++; } else if (t.tipo === 'SAT') a.tomadasSat++; else a.tomadasTv++;
    }
    return [...porAmb.values()].map(a => ({ ambiente: a.ambiente, unidade: u.unidade, itens: itensDe(a) }));
  });
  const { pontos, tipo } = pontosPorUnidade(arquitetura, registros);
  for (const a of calc.pontosAreas || []) pontos.push({ ambiente: a.ambiente, itens: itensDe(a) });
  return {
    pontos,
    notas: [
      'Tomadas de TV/SAT na parede do ambiente, a 0,30 m (rack/estante) ou na altura da TV — ajustar ao layout do mobiliário.',
      ...(tipo ? ['Planta do pavimento-tipo: tomadas de uma unidade — repetir em todas as unidades (níveis por ponto na planilha).'] : []),
      'Derivador ou multiswitch na caixa de distribuição do pavimento; cabo RG-6 75 Ω da caixa até cada tomada, sem emendas.',
      'Mastro da antena equipotencializado ao SPDA e DPS coaxial na entrada do headend (NBR 5419-4).',
    ],
  };
}

// ── Alarme e elétrica usam as portas detectadas quando existem ──
const PLANTAS = { eletrica, incendio, cftv, cabeamento, alarme, iluminacao, eletrica_hospitalar: eletricaHospitalar, controle_acesso: controleAcesso, telefonia, antena };

module.exports = { PLANTAS };
