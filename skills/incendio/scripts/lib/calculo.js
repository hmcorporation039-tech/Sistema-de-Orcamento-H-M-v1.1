// Detecção e alarme de incêndio (ABNT NBR 17240:2010) e iluminação de
// emergência (ABNT NBR 10898:2023).

// NBR 17240: raio de cobertura de detectores pontuais. A norma declara a área
// máxima como quadrado inscrito no círculo: 81 m² = 9 × 9 m para fumaça (5.4.1.1,
// r ≈ 6,30 m) e 36 m² = 6 × 6 m para temperatura (Fig. 15, r ≈ 4,20 m). Usa-se o
// raio exato desses quadrados (lado/√2) para que 9 × 9 m dê 1 detector, como diz a norma.
const RAIO = { fumaca: 9 / Math.SQRT2, temperatura: 6 / Math.SQRT2 };
const ALTURA_MAX = { fumaca: 8 }; // 5.4.1.1: detector pontual de fumaça até 8 m
const CAMINHAMENTO_ACIONADOR = 30; // 5.5.3
const BATERIAS_AH = [7, 12, 18, 26, 40, 55, 65, 100]; // capacidades comerciais (12 V; ligar 2 em série para 24 V)

// Consumos padrão (mA) — substituíveis pelos dados do fabricante no formulário
const CONSUMO_PADRAO = {
  central: { repouso: 150, alarme: 400 },
  detector: { repouso: 0.3, alarme: 0.5 },
  acionador: { repouso: 0.3, alarme: 0.5 },
  avisador: { repouso: 0.3, alarme: 30 },
  modulo: { repouso: 0.5, alarme: 3 },
};

// Redução de cobertura por vigas (5.4.1.5 e 5.4.1.6) — aplicada ao espaçamento
function fatorViga(alturaViga) {
  const h = Number(alturaViga) || 0;
  if (h > 0.6) return 0.5;
  if (h > 0.2) return 2 / 3;
  return 1;
}

// Menor grade nx × ny em que cada retângulo cabe no círculo de raio r
// (nenhum ponto do teto a mais de r de um detector — 5.4.1.4)
function gradeDetectores(L, W, r) {
  if (!(L > 0) || !(W > 0)) return { n: 0, nx: 0, ny: 0 };
  let melhor = null;
  const maxNx = Math.ceil(L / (r * 0.05)) + 1;
  for (let nx = 1; nx <= maxNx; nx++) {
    const meio = L / (2 * nx);
    if (meio >= r) continue;
    const cordaY = 2 * Math.sqrt(r * r - meio * meio);
    const ny = Math.max(1, Math.ceil(W / cordaY - 1e-9));
    const n = nx * ny;
    if (!melhor || n < melhor.n || (n === melhor.n && Math.abs(L / nx - W / ny) < Math.abs(melhor.dx - melhor.dy))) {
      melhor = { n, nx, ny, dx: L / nx, dy: W / ny };
    }
  }
  return melhor;
}

// NBR 10898: distância máxima entre luminárias de aclaramento = 4h (2h de cada lado — Fig. A.3)
function luminariasEmergencia(L, W, h) {
  const passo = 4 * (Number(h) || 2.5);
  return Math.max(1, Math.ceil(L / passo)) * Math.max(1, Math.ceil(W / passo));
}

function calcular(dados) {
  const sis = dados.sistema || {};
  const tipoSistema = sis.tipo || 'enderecavel';
  const consumo = { ...CONSUMO_PADRAO };
  for (const k of Object.keys(CONSUMO_PADRAO)) {
    const c = (sis.consumos || {})[k];
    if (c && (c.repouso != null || c.alarme != null)) consumo[k] = { repouso: Number(c.repouso ?? CONSUMO_PADRAO[k].repouso), alarme: Number(c.alarme ?? CONSUMO_PADRAO[k].alarme) };
  }
  const avisos = [];
  const ambientes = (dados.ambientes || []).filter(a => Number(a.comprimento_m) > 0 && Number(a.largura_m) > 0).map(a => {
    const tipo = a.detector || 'fumaca';
    const L = Number(a.comprimento_m);
    const W = Number(a.largura_m);
    const pe = Number(a.pe_direito_m) || 3;
    if (tipo === 'nenhum') return { ...a, L, W, pe, detectores: 0, grade: null, raio: null };
    const r = RAIO[tipo] * fatorViga(a.altura_viga_m);
    const grade = gradeDetectores(L, W, r);
    if (ALTURA_MAX[tipo] && pe > ALTURA_MAX[tipo]) avisos.push(`${a.nome}: pé-direito de ${pe} m acima de 8 m — detector pontual de fumaça não é adequado (5.4.1.1); avaliar detector linear ou por amostragem de ar. [CONFERIR]`);
    return { ...a, L, W, pe, tipo, raio: r, grade, detectores: grade.n };
  });

  const ambIlum = ambientes.filter(a => a.rota_fuga);
  const iluminacao = ambIlum.map(a => {
    const h = Number(a.altura_luminaria_m) || Math.min(a.pe, 2.5);
    const aclaramento = luminariasEmergencia(a.L, a.W, h);
    const balizamento = (Number(a.saidas) || 0) + (Number(a.mudancas_direcao) || 0) + Math.max(0, Math.ceil(Math.max(a.L, a.W) / 15) - 1);
    return { nome: a.nome, pavimento: a.pavimento, h, aclaramento, balizamento, nivelLux: a.escada ? 5 : 3, escada: !!a.escada };
  });

  const pavimentos = (dados.pavimentos || []).map(p => {
    const comp = Number(p.maior_caminhamento_m) || 0;
    const acionadores = Math.max(1, Math.ceil(comp / (2 * CAMINHAMENTO_ACIONADOR)), Number(p.saidas_emergencia) || 0);
    const area = Number(p.area_m2) || 0;
    const avisadores = Math.max(acionadores, Math.ceil(area / (Number(sis.area_por_avisador_m2) || 400)));
    return { ...p, comp, acionadores, avisadores, area };
  });
  if (!pavimentos.length) avisos.push('Cadastre os pavimentos (área e maior caminhamento) para dimensionar acionadores e avisadores. [CONFERIR]');
  avisos.push('Quantidade de avisadores estimada pela área — confirmar a audibilidade em todos os pontos (5.6.1). [CONFERIR]');

  const nDet = ambientes.reduce((s, a) => s + a.detectores, 0);
  const nAc = pavimentos.reduce((s, p) => s + p.acionadores, 0);
  const nAv = pavimentos.reduce((s, p) => s + p.avisadores, 0);
  const nMod = Number(sis.modulos_comando) || 0;
  const dispositivos = nDet + nAc + nAv + nMod;
  const limiteLaco = Number(sis.dispositivos_por_laco) || 125;
  const lacos = tipoSistema === 'enderecavel' ? Math.max(1, Math.ceil(dispositivos / limiteLaco)) : null;
  const zonas = tipoSistema === 'convencional' ? Math.max(1, pavimentos.length || 1, Math.ceil((nDet + nAc) / (Number(sis.dispositivos_por_zona) || 20))) : null;

  // Anexo B: fonte e bateria (24 h em repouso + 5 min em alarme, fator 1,2)
  const linhas = [
    { equipamento: 'Central', qtd: 1, ...consumo.central },
    { equipamento: 'Detectores', qtd: nDet, ...consumo.detector },
    { equipamento: 'Acionadores manuais', qtd: nAc, ...consumo.acionador },
    { equipamento: 'Avisadores audiovisuais', qtd: nAv, ...consumo.avisador },
    ...(nMod ? [{ equipamento: 'Módulos de comando', qtd: nMod, ...consumo.modulo }] : []),
  ].map(l => ({ ...l, totalRepouso: l.qtd * l.repouso, totalAlarme: l.qtd * l.alarme }));
  const iRepouso = linhas.reduce((s, l) => s + l.totalRepouso, 0);
  const iAlarme = linhas.reduce((s, l) => s + l.totalAlarme, 0);
  const tRepouso = Number(sis.tempo_repouso_h) || 24;
  const tAlarme = Number(sis.tempo_alarme_min) || 5;
  const fonteA = 1.2 * iAlarme / 1000;
  const bateriaAh = 1.2 * (tRepouso * iRepouso + (tAlarme / 60) * iAlarme) / 1000;
  const bateriaEscolhida = BATERIAS_AH.find(b => b >= bateriaAh) || Math.ceil(bateriaAh);

  const nAclar = iluminacao.reduce((s, x) => s + x.aclaramento, 0);
  const nBaliz = iluminacao.reduce((s, x) => s + x.balizamento, 0);
  const caboLaco = Math.ceil((ambientes.reduce((s, a) => s + a.L + a.W, 0) + pavimentos.reduce((s, p) => s + p.comp, 0)) * 1.3);
  const materiais = [
    ...(ambientes.some(a => a.tipo === 'fumaca') ? [{ codigo: 'DET-F', descricao: `Detector pontual de fumaça óptico ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'} com base`, unidade: 'un', quantidade: ambientes.filter(a => a.tipo === 'fumaca').reduce((s, a) => s + a.detectores, 0), referencia: 'NBR 17240, 5.4.1' }] : []),
    ...(ambientes.some(a => a.tipo === 'temperatura') ? [{ codigo: 'DET-T', descricao: `Detector pontual de temperatura (termovelocimétrico) ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'} com base`, unidade: 'un', quantidade: ambientes.filter(a => a.tipo === 'temperatura').reduce((s, a) => s + a.detectores, 0), referencia: 'NBR 17240, 5.4.2' }] : []),
    { codigo: 'ACM', descricao: `Acionador manual tipo quebra-vidro/rearmável ${tipoSistema === 'enderecavel' ? 'endereçável' : 'convencional'}, vermelho`, unidade: 'un', quantidade: nAc, referencia: 'NBR 17240, 5.5' },
    { codigo: 'AV', descricao: 'Avisador audiovisual (sirene com strobo)', unidade: 'un', quantidade: nAv, referencia: 'NBR 17240, 5.6' },
    { codigo: 'CEN', descricao: tipoSistema === 'enderecavel' ? `Central de alarme endereçável com ${lacos} laço(s)` : `Central de alarme convencional com ${zonas} zona(s)`, unidade: 'un', quantidade: 1, referencia: 'NBR 17240, 5.3 e 6.1' },
    { codigo: 'BAT', descricao: `Bateria selada 12 V ${bateriaEscolhida} Ah (par em série para 24 V)`, unidade: 'un', quantidade: 2, referencia: 'NBR 17240, Anexo B' },
    ...(nMod ? [{ codigo: 'MOD', descricao: 'Módulo de comando/monitoramento (interfaces: portas, HVAC)', unidade: 'un', quantidade: nMod, referencia: 'NBR 17240, 5.7' }] : []),
    { codigo: 'CAB', descricao: 'Cabo blindado 2 × 1,5 mm² para laço de detecção e alarme (estimativa)', unidade: 'm', quantidade: caboLaco, referencia: 'NBR 17240, 6.8' },
    { codigo: 'ELE', descricao: 'Eletroduto exclusivo do sistema de alarme (estimativa)', unidade: 'm', quantidade: caboLaco, referencia: 'NBR 17240, 6.7' },
    ...(nAclar ? [{ codigo: 'LE', descricao: 'Luminária de emergência bloco autônomo LED ≥ 300 lm, autonomia ≥ 2 h', unidade: 'un', quantidade: nAclar, referencia: 'NBR 10898, 4.9 e 6.1.2.4' }] : []),
    ...(nBaliz ? [{ codigo: 'SIN', descricao: 'Sinalização de saída/rota de fuga iluminada (balizamento ≥ 30 lm)', unidade: 'un', quantidade: nBaliz, referencia: 'NBR 10898, 5.2 e 14.18' }] : []),
  ].filter(m => m.quantidade > 0);

  return {
    tipoSistema, ambientes, pavimentos, iluminacao, nDet, nAc, nAv, nMod, dispositivos, lacos, zonas, limiteLaco,
    bateria: { linhas, iRepouso, iAlarme, tRepouso, tAlarme, fonteA, bateriaAh, bateriaEscolhida },
    nAclar, nBaliz, materiais, avisos,
  };
}

module.exports = { calcular, gradeDetectores, fatorViga, luminariasEmergencia, RAIO, CONSUMO_PADRAO };
