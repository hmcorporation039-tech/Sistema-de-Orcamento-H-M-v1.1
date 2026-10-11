// Dimensionamento do SPDA externo e interno pela ABNT NBR 5419-3:2026 e lista
// preliminar de materiais (memorial e orçamento).
//
// Modela a estrutura como retângulo L × W × H (planta irregular: informar
// spda.perimetro_m e spda.area_cobertura_m2 medidos). Os resultados são
// preliminares — o projeto executivo confere posições em planta.

const T = require('./tabelas');

const FOLGA_CONDUTOR = 1.1; // +10 % para emendas, curvas e sobras de corte

function raioProtegidoEsfera(R, h) {
  // Captor de altura h acima do plano: a esfera de raio R encosta no plano a
  // √(2Rh − h²) do pé do captor (Anexo A); acima de h = R, o raio é R.
  if (h <= 0) return 0;
  return h >= R ? R : Math.sqrt(2 * R * h - h * h);
}

// Fração da cobertura (retângulo L × W na cota do plano) dentro do raio
// protegido pelos captores verticais — grade de 0,5 m.
function coberturaCaptores(captores, R, L, W, cotaPlano) {
  if (!captores || !captores.length) return null;
  const passo = 0.5;
  let dentro = 0;
  let total = 0;
  const raios = captores.map(c => ({ ...c, r: raioProtegidoEsfera(R, c.cota_ponta_m - cotaPlano) }));
  for (let x = passo / 2; x < L; x += passo) {
    for (let y = passo / 2; y < W; y += passo) {
      total++;
      if (raios.some(c => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2)) dentro++;
    }
  }
  return { fracao: dentro / total, raios: raios.map(c => ({ id: c.id, r: c.r })) };
}

function dimensionar(dados) {
  const est = dados.estrutura;
  const spda = dados.spda || {};
  const np = spda.np;
  if (!T.NIVEL[np]) throw new Error(`spda.np deve ser I, II, III ou IV (recebido: ${np})`);
  const nivel = T.NIVEL[np];
  const { L, W, H } = est;
  const perimetro = spda.perimetro_m || 2 * (L + W);

  // Captação em malha (Tabela 2; 5.3.2.7 permite +25 % em uma dimensão sem aumentar o perímetro do módulo)
  const nx = Math.ceil(L / nivel.malha);
  const ny = Math.ceil(W / nivel.malha);
  const moduloX = L / nx;
  const moduloY = W / ny;
  const comprimentoMalha = (ny + 1) * L + (nx + 1) * W;
  const captacao = {
    metodo: 'malha + esfera rolante',
    raio_esfera_m: nivel.raio,
    modulo_max_m: nivel.malha,
    divisoes: [nx, ny],
    modulo_m: [moduloX, moduloY],
    comprimento_m: comprimentoMalha,
    comprimento_com_folga_m: comprimentoMalha * FOLGA_CONDUTOR,
    suportes: Math.ceil(comprimentoMalha / 1.0), // 5.6.2.2: fixação a cada 1,0 m na horizontal
    material: (T.MATERIAIS_CAPTACAO[spda.material_captacao || 'cobre_35'] || T.MATERIAIS_CAPTACAO.cobre_35).descricao,
  };

  // Captores verticais (Franklin/mastros) avaliados pela esfera rolante
  const planos = spda.planos || [{ nome: 'cobertura', cota_m: H }];
  captacao.captores_verticais = (spda.captores_verticais || []).map(c => ({
    ...c,
    raio_por_plano: planos.map(p => ({ plano: p.nome, cota_m: p.cota_m, raio_m: raioProtegidoEsfera(nivel.raio, c.cota_ponta_m - p.cota_m) })),
  }));
  if (captacao.captores_verticais.length && captacao.captores_verticais.every(c => c.x != null && c.y != null)) {
    captacao.cobertura_por_plano = planos.map(p => ({ plano: p.nome, cota_m: p.cota_m, ...coberturaCaptores(spda.captores_verticais, nivel.raio, L, W, p.cota_m) }));
  }

  // Descidas (5.4.3 e Tabela 5): mínimo de 2, preferência pelos cantos
  const retangular = !spda.perimetro_m;
  const nDescidas = Math.max(2, retangular
    ? 2 * (Math.ceil(L / nivel.descidas) + Math.ceil(W / nivel.descidas)) // por lado, com descida em cada canto
    : Math.ceil(perimetro / nivel.descidas));
  const descidas = {
    quantidade: nDescidas,
    espacamento_tabela_m: nivel.descidas,
    espacamento_medio_m: perimetro / nDescidas,
    espacamento_max_permitido_m: nivel.descidas * 1.2, // 5.4.3.3: até +20 %
    naturais: !!spda.descida_natural,
    material: spda.descida_natural ? 'armaduras do concreto (descida natural)' : captacao.material,
  };
  if (!spda.descida_natural) {
    descidas.comprimento_m = nDescidas * (H + 1) * FOLGA_CONDUTOR; // até a caixa de inspeção
    descidas.fixadores = Math.ceil(nDescidas * H / 1.5); // 5.6.2.2: a cada 1,5 m na vertical
  }

  // Aterramento (5.5): anel a ~1 m das paredes e ≥ 0,5 m de profundidade
  const anel = 2 * ((L + 2) + (W + 2));
  const areaAnel = spda.area_cobertura_m2 ? spda.area_cobertura_m2 + perimetro + 4 : (L + 2) * (W + 2);
  const re = Math.sqrt(areaAnel / Math.PI);
  const l1 = T.comprimentoMinimoEletrodo(np, spda.resistividade_solo_ohm_m);
  const atendeRe = l1 == null ? null : re >= l1;
  const aterramento = {
    arranjo: spda.aterramento || 'anel',
    anel_m: anel,
    anel_com_folga_m: anel * FOLGA_CONDUTOR,
    material: (T.MATERIAIS_ATERRAMENTO[spda.material_aterramento || 'cobre_50'] || T.MATERIAIS_ATERRAMENTO.cobre_50).descricao,
    re_m: re,
    l1_m: l1,
    atende_re_l1: atendeRe,
    complemento_radial_m: atendeRe === false ? l1 - re : 0,           // (2)
    complemento_vertical_m: atendeRe === false ? (l1 - re) / 2 : 0,   // (3)
    hastes: nDescidas,
    hastes_obrigatorias: atendeRe === false,
    caixas_inspecao: nDescidas,
  };

  // Distância de segurança simplificada (6.3.2, Eq. 5) para o trecho de descida inteiro
  const kc = T.kcSimplificado(nDescidas);
  const sAr = nivel.ki / T.KM.ar * kc * H;
  const distanciaSeguranca = {
    ki: nivel.ki, kc, km_ar: T.KM.ar, l_m: H,
    s_ar_m: sAr,
    s_solido_m: nivel.ki / T.KM.solido * kc * H,
    nao_aplicavel_naturais: !!spda.descida_natural, // 6.3.1.4: armaduras contínuas dispensam o cálculo
  };

  const equipotencializacao = {
    bep: 1,
    bel_recomendados: Math.max(L, W) > 20 ? Math.ceil(perimetro / 40) : 0, // 6.2.2.2 b): estruturas > 20 m
    secao_bep_aterramento: 'cobre 16 mm² (não enterrado) / Tabela 8 (enterrado)',
    secao_instalacoes_internas: 'cobre 6 mm² / alumínio 10 mm² / aço zincado 16 mm²',
  };

  const intervalo = T.intervaloInspecao(dados.inspecao || {});

  return {
    np, perimetro, captacao, descidas, aterramento, distanciaSeguranca, equipotencializacao,
    intervalo_inspecao_anos: intervalo,
    materiais: listaMateriais(dados, { captacao, descidas, aterramento, np }),
  };
}

function listaMateriais(dados, d) {
  const spda = dados.spda || {};
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia, extra = {}) =>
    itens.push({ codigo, descricao, unidade, quantidade, referencia, ...extra });
  const arred = (v) => Math.round(v * 10) / 10;

  add('CAP-01', `Condutor de captação (malha) — ${d.captacao.material} (ou equivalente da Tabela 7)`, 'm',
    arred(d.captacao.comprimento_com_folga_m), 'NBR 5419-3:2026, Tabelas 2 e 7');
  add('CAP-02', 'Suportes/fixadores de captação (1,0 m)', 'un', d.captacao.suportes, 'NBR 5419-3:2026, 5.6.2');
  const saliencias = (dados.estrutura.saliencias || []).length;
  add('CAP-03', 'Captores/minicaptores nas saliências (Ø 9,5 mm até 1 m ou Ø 16 mm)', 'un', saliencias, 'NBR 5419-3:2026, Tabela 7');
  const verticais = (spda.captores_verticais || []).length;
  if (verticais) add('CAP-04', 'Captor tipo Franklin com mastro/torre e base de fixação', 'un', verticais, 'NBR 5419-3:2026, 5.3 e Anexo A');

  if (spda.descida_natural) {
    add('DES-01', 'Conexão captação–armadura do pilar (descida natural)', 'un', d.descidas.quantidade, 'NBR 5419-3:2026, 5.4.5');
  } else {
    add('DES-01', `Condutor de descida — ${d.descidas.material}`, 'm', arred(d.descidas.comprimento_m), 'NBR 5419-3:2026, Tabela 7');
    add('DES-03', 'Fixadores de descida (1,5 m)', 'un', d.descidas.fixadores, 'NBR 5419-3:2026, 5.6.2');
    add('DES-04', 'Proteção mecânica da descida até 3 m (eletroduto de PVC rígido)', 'un', d.descidas.quantidade, 'NBR 5419-3:2026, 8.1 (nota 2)');
  }
  add('DES-02', 'Terminal de ensaio embutido a ~1,5 m do piso', 'un', d.descidas.quantidade, 'NBR 5419-3:2026, 5.4.6');

  add('ATE-01', `Condutor do anel de aterramento — ${d.aterramento.material} (ou equivalente da Tabela 8)`, 'm',
    arred(d.aterramento.anel_com_folga_m), 'NBR 5419-3:2026, Tabela 8 e 5.5');
  add('ATE-02', d.aterramento.hastes_obrigatorias
    ? `Hastes de aterramento — complemento obrigatório (re < l1): lv = ${arred(d.aterramento.complemento_vertical_m)} m por descida`
    : 'Hastes de aterramento junto às descidas (complementares — re ≥ l1, Figura 3)', 'un',
  d.aterramento.hastes, 'NBR 5419-3:2026, 5.5.2');
  add('ATE-03', 'Caixas de inspeção de aterramento', 'un', d.aterramento.caixas_inspecao, 'NBR 5419-3:2026, 5.6.3.3');

  add('EQP-01', 'Barramento de equipotencialização principal (BEP)', 'un', 1, 'NBR 5419-3:2026, Seção 6');
  add('EQP-02', 'Condutor BEP–aterramento — cobre 50 mm² (com MPS)', 'm', 10, 'NBR 5419-4:2026, Tabela 1');

  for (const zona of dados.zonas || []) {
    for (const s of zona.sistemas || []) {
      if (!s.dps_np || s.dps_np === 'nenhum') continue;
      add('DPS-C', `DPS coordenado NP ${rotuloNp(s.dps_np)} — ${s.nome} (${zona.nome})`, 'un', 1, 'NBR 5419-4:2026, Seção 7');
    }
  }
  for (const linha of dados.linhas || []) {
    if (!linha.peb_np || linha.peb_np === 'nenhum') continue;
    if (['fibra_optica', 'interface_isolante'].includes(linha.cld_cli)) continue; // sem condutor metálico: não há o que ligar por DPS
    add('DPS-I', `DPS classe I na entrada (${linha.nome}) — NP ${rotuloNp(linha.peb_np)}`, 'un', 1, 'NBR 5419-3:2026, Seção 6; NBR 5419-4:2026');
  }
  return itens;
}

function rotuloNp(np) {
  return { melhor_I: 'melhor que I', melhor_I_max: 'melhor que I (PSPD 0,001)' }[np] || np;
}

module.exports = { dimensionar, raioProtegidoEsfera, coberturaCaptores, rotuloNp };
