// Cabeamento estruturado — ABNT NBR 14565:2025 (edição de 13/11/2025, que substituiu a de 2019).
// Tomadas por área de trabalho (6.7.7.1), comprimento máximo do cabo
// horizontal pela Tabela 3 (com redução por temperatura), distribuidores de
// piso (6.7.3), APs (Seção 15), rack, patch panels e lista de materiais.
// Os itens e tabelas citados foram conferidos na edição 2019; a numeração e os valores
// na edição 2025 ainda não foram conferidos [CONFERIR na edição 2025].
// 14/11/2026: DPS do circuito do rack (_comum/dps.js), nobreak por distribuidor (_comum/bateria.js),
// aterramento do rack (barra + condutor ao TGB/BEP) e eletroduto pela taxa de ocupação
// (NBR 5410, 6.2.11.1.6 — _comum/eletrico) com o diâmetro externo do cabo de dados.

const CAIXA_CABO_M = 305;
const RACKS_U = require('../../../_comum/fabricacao/rack').RACKS_U_PROJETO; // série comum do projeto
const E = require('../../../_comum/eletrico/calculo');
const ET = require('../../../_comum/eletrico/tabelas');
const { especificarDps, descricaoDps } = require('../../../_comum/dps');
const { dimensionarNobreak, SERIES_NOBREAK_VA, SERIES_BATERIA, FATOR_ENVELHECIMENTO } = require('../../../_comum/bateria');

// Diâmetro externo do cabo de 4 pares (mm), de catálogo — não é valor de norma:
//   Cat 6 U/UTP 6,0 mm — Furukawa GigaLan Cat 6 U/UTP LSZH (ficha técnica);
//   Cat 6A F/UTP 7,5 mm — Furukawa GigaLan Cat 6A F/UTP LSZH (ficha técnica); Cat 6A U/UTP de outros
//   fabricantes vai de ≈ 6,8 a 8,7 mm; Cat 5e, Cat 6 blindado e Cat 7A: valores genéricos de mercado.
// Informe o diâmetro do cabo escolhido em sistema.diametro_cabo_mm. [CONFERIR catálogo]
const DIAMETRO_CABO_MM = { '5e': 5.2, 6: 6.0, '6A': 7.5, 7: 7.5, '7A': 8.0 };
const DIAMETRO_CABO_BLINDADO_MM = { '5e': 6.0, 6: 7.0, '6A': 7.5, 7: 7.5, '7A': 8.0 };
// Eletroduto de distribuição adotado (série de _comum/eletrico/tabelas, PVC rígido roscável)
const BITOLA_ELETRODUTO_PADRAO = '3/4"';
// Consumo típico de switch de acesso (sem PoE) e de cada AP por PoE — os mesmos do caderno do rack [CONFERIR]
const SWITCH_W = { 24: 30, 48: 45 };
const AP_W = 15;
// Condutor da barra do rack ao TGB/BEP: ANSI/TIA-607-D pede no mínimo 6 AWG (13,3 mm²) → 16 mm² comercial,
// o mesmo do caderno do rack (_comum/fabricacao/rack.js) [CONFERIR com o projeto de aterramento/SPDA]
const SECAO_TERRA_RACK_MM2 = 16;
const { numeroFixoBr } = require('../../../_comum/base/formato');
const br = (v, c = 1) => numeroFixoBr(v, c);

// Tabela 3: constante da equação conforme classe e modelo
// classe D (Cat 5e): interconexão 109, conexão cruzada 107
// classe E/EA (Cat 6/6A): interconexão 107 − 3, conexão cruzada 106 − 3
// classe F/FA (Cat 7/7A): interconexão 107 − 2, conexão cruzada 106 − 3
function constanteTabela3(categoria, modelo) {
  const cruzada = modelo === 'conexao_cruzada';
  if (categoria === '5e') return cruzada ? 107 : 109;
  if (categoria === '7' || categoria === '7A') return cruzada ? 103 : 105;
  return cruzada ? 103 : 104; // 6 e 6A
}

function classeDe(categoria) {
  return { '5e': 'D', 6: 'E', '6A': 'EA', 7: 'F', '7A': 'FA' }[categoria] || 'E';
}

// H = constante − F·X, reduzido por temperatura (nota da Tabela 3), limitado a 90 m
function comprimentoHorizontalMax({ categoria, modelo, F, X, temperatura, blindado }) {
  let h = constanteTabela3(categoria, modelo) - F * X;
  const t = Number(temperatura) || 20;
  if (t > 20) {
    let reducao;
    if (blindado) reducao = 0.002 * (t - 20);
    else reducao = 0.004 * (Math.min(t, 40) - 20) + 0.006 * Math.max(0, Math.min(t, 60) - 40);
    h *= (1 - reducao);
  }
  return Math.min(90, h);
}

function calcular(dados) {
  const s = dados.sistema || {};
  const cfg = {
    categoria: String(s.categoria || '6'),
    modelo: s.modelo || 'interconexao',
    F: s.patch_cords_total_m != null && s.patch_cords_total_m !== '' ? Number(s.patch_cords_total_m) : 10,
    X: Number(s.relacao_perda_patch) || 1.5,
    temperatura: Number(s.temperatura) || 20,
    blindado: !!s.blindado,
    areaTrabalho: Number(s.area_trabalho_m2) || 10,
    tomadasPorArea: Number(s.tomadas_por_area) || 2,
    portasPainel: Number(s.portas_patch_panel) || 24,
    portasSwitch: Number(s.portas_switch) || 48,
    folgaPonto: Number(s.folga_por_ponto_m) || 5,
    reservaRack: Number(s.reserva_rack_pct) || 30,
  };
  const cat0 = String(s.categoria || '6');
  const dCaboInformado = Number(s.diametro_cabo_mm) > 0;
  cfg.diametroCabo = dCaboInformado ? Number(s.diametro_cabo_mm) : ((cfg.blindado ? DIAMETRO_CABO_BLINDADO_MM : DIAMETRO_CABO_MM)[cat0] || 6.0);
  cfg.eletroduto = ET.ELETRODUTOS_PVC_ROSCAVEL.find(e => e.bitola === s.eletroduto_bitola) || ET.ELETRODUTOS_PVC_ROSCAVEL.find(e => e.bitola === BITOLA_ELETRODUTO_PADRAO);
  cfg.tensaoRack = Number(s.tensao_pdu_v) || 220;
  cfg.esquema = s.esquema_aterramento || 'TN-S';
  cfg.nobreak = s.nobreak !== false;
  cfg.autonomiaMin = Number(s.autonomia_min) || 30;
  cfg.distanciaTgb = Number(s.distancia_tgb_m) || 10;
  const hMax = comprimentoHorizontalMax(cfg);
  const avisos = [];
  // situação das normas: a ABNT NBR 14565:2025 (13/11/2025) substituiu a de 2019 (catálogo ABNT/Target);
  // o conteúdo técnico da edição nova ainda não foi conferido
  avisos.push('ABNT NBR 14565:2025 (13/11/2025) substituiu a edição 2019; os limites de enlace e canal e os itens citados foram conferidos na edição 2019. [CONFERIR na edição 2025]');
  if (cfg.F > 10) avisos.push(`Patch cords somando ${cfg.F} m (> 10 m): o cabo horizontal foi reduzido pela Tabela 3.`);

  const pavimentos = (dados.pavimentos || []).filter(p => Number(p.area_util_m2) > 0 || Number(p.pontos_extra) > 0 || Number(p.aps) > 0).map(p => {
    const area = Number(p.area_util_m2) || 0;
    const areasTrabalho = Math.ceil(area / cfg.areaTrabalho);
    const tomadasAt = areasTrabalho * cfg.tomadasPorArea;
    const aps = Number(p.aps) || 0;
    const extra = Number(p.pontos_extra) || 0;
    const tomadasAp = aps * 2; // 15.4: recomenda-se ≥ 2 tomadas por área de cobertura sem fio
    const pontos = tomadasAt + tomadasAp + extra;
    const dMed = Number(p.distancia_media_m) || 30;
    const dMax = Number(p.distancia_max_m) || dMed * 1.6;
    const fdArea = Math.max(1, Math.ceil(area / 1000)); // 6.7.3
    const fdDist = dMax > hMax ? Math.ceil(dMax / hMax) : 1;
    const fds = Math.max(fdArea, fdDist);
    if (dMax > hMax) avisos.push(`${p.nome}: ponto mais distante a ${dMax} m excede o cabo horizontal máximo de ${hMax.toFixed(1)} m — previstos ${fds} distribuidores de piso. [CONFERIR posição]`);
    const cabo = pontos * (dMed + cfg.folgaPonto);
    // Cada distribuidor de piso atende a sua parte dos pontos com os PRÓPRIOS
    // patch panels e switches (um switch não é compartilhado entre racks distintos).
    const pontosPorFd = Math.ceil(pontos / fds);
    const paineisPorFd = Math.ceil(pontosPorFd / cfg.portasPainel);
    const switchesPorFd = Math.ceil(pontosPorFd / cfg.portasSwitch);
    const paineis = paineisPorFd * fds;
    const switches = switchesPorFd * fds;
    // U por rack: patch panel + organizador (2U), switch + organizador (2U), régua/bandeja (2U)
    const uOcupado = paineisPorFd * 2 + switchesPorFd * 2 + 2;
    const uNecessario = Math.ceil(uOcupado * (1 + cfg.reservaRack / 100));
    if (uNecessario > 44) avisos.push(`${p.nome}: ${uNecessario}U necessários por distribuidor — acima do rack de 44U; dividir em mais racks. [CONFERIR]`);
    const rackU = RACKS_U.find(u => u >= uNecessario) || 44;
    // Backbone até cada FD do pavimento: subida (i × pé-direito, somada abaixo) + 15 m de
    // trecho horizontal; FDs adicionais no mesmo piso ficam afastados ≈ k × dMax ÷ fds. [CONFERIR posição]
    const backboneHorizontal = Array.from({ length: fds }, (_, k) => 15 + k * dMax / fds);
    // Saída do rack: os cabos de um FD juntos no primeiro trecho — eletroduto pela taxa de ocupação
    // (NBR 5410, 6.2.11.1.6: 40 % com 3 ou mais cabos); acima do maior da série, eletrodutos de 4" em
    // paralelo ou eletrocalha [CONFERIR traçado]
    const tronco = E.eletrodutoPorOcupacao(pontosPorFd, cfg.diametroCabo);
    const maior = ET.ELETRODUTOS_PVC_ROSCAVEL[ET.ELETRODUTOS_PVC_ROSCAVEL.length - 1];
    const capMaior = E.cabosNoEletroduto(maior.di, cfg.diametroCabo);
    const troncoSaida = tronco ? { bitola: tronco.bitola, quantidade: 1, capacidade: tronco.capacidade, ocupacao: tronco.ocupacao }
      : { bitola: maior.bitola, quantidade: Math.ceil(pontosPorFd / capMaior), capacidade: capMaior, ocupacao: null };
    const indice = (b) => ET.ELETRODUTOS_PVC_ROSCAVEL.findIndex(e => e.bitola === b);
    if (!tronco || indice(troncoSaida.bitola) >= indice('2"')) {
      avisos.push(`${p.nome}: saída do rack com ${pontosPorFd} cabos (Ø ${br(cfg.diametroCabo)} mm) por distribuidor — ${troncoSaida.quantidade > 1 ? `${troncoSaida.quantidade} eletrodutos de ${troncoSaida.bitola}` : `eletroduto de ${troncoSaida.bitola}`} pela taxa de 40 % (NBR 5410, 6.2.11.1.6); avaliar eletrocalha/leito no trecho junto ao rack. [CONFERIR traçado]`);
    }
    // Nobreak do distribuidor: switches + APs alimentados por PoE (_comum/bateria.js)
    const apsPorFd = Math.ceil(aps / fds);
    const cargaRackW = switchesPorFd * (SWITCH_W[cfg.portasSwitch] || 45) + apsPorFd * AP_W;
    const nobreak = cfg.nobreak ? dimensionarNobreak({ cargaW: cargaRackW, autonomiaH: cfg.autonomiaMin / 60, nobreaksVa: SERIES_NOBREAK_VA.ate10kva, bateriasAh: SERIES_BATERIA.vrla12vNobreak, fatorBateria: FATOR_ENVELHECIMENTO.nobreak }) : null;
    return { ...p, area, areasTrabalho, tomadasAt, aps, tomadasAp, extra, pontos, dMed, dMax, fds, cabo, pontosPorFd, paineisPorFd, switchesPorFd, paineis, switches, uNecessario, rackU, backboneHorizontal, troncoSaida, apsPorFd, cargaRackW, nobreak };
  });
  if (!pavimentos.length) throw new Error('Cadastre ao menos um pavimento com área útil ou pontos.');

  const total = (k) => pavimentos.reduce((a, p) => a + p[k], 0);
  const pontos = total('pontos');
  const caboM = Math.ceil(total('cabo'));
  const caixas = Math.ceil(caboM / CAIXA_CABO_M);
  const fds = total('fds');
  const backbone = pavimentos.length > 1 || fds > 1;
  const peDireito = Number((dados.sistema || {}).pe_direito_m) || 3.5;
  // um lance de backbone por distribuidor de piso (antes: um por pavimento, e o 2º FD do piso ficava sem)
  const backboneM = backbone ? Math.ceil(pavimentos.reduce((a, p, i) => a + p.backboneHorizontal.reduce((b, h) => b + i * peDireito + h, 0), 0) * 1.2) : 0;
  const cat = cfg.categoria;
  // Eletroduto de distribuição: cada metro leva até `capacidade` cabos na taxa de ocupação de 40 % (NBR 5410,
  // 6.2.11.1.6) → metros ≈ Σ (pontos × distância média) ÷ capacidade. Antes: cabo total (com folgas) ÷ 6.
  const eletroduto = cfg.eletroduto;
  const capEletroduto = Math.max(1, E.cabosNoEletroduto(eletroduto.di, cfg.diametroCabo));
  const percursoCabos = pavimentos.reduce((a, p) => a + p.pontos * p.dMed, 0);
  const eletrodutoM = Math.ceil(percursoCabos / capEletroduto);
  if (!dCaboInformado) avisos.push(`Diâmetro externo do cabo Cat ${cat}${cfg.blindado ? ' blindado' : ''} adotado em ${br(cfg.diametroCabo)} mm (catálogo genérico) para a taxa de ocupação dos eletrodutos — informe o do cabo escolhido. [CONFERIR catálogo]`);
  // DPS classe II no circuito que alimenta cada rack (Uc pela Tabela 49 — _comum/dps.js) [CONFERIR com o projeto elétrico]
  const dps = especificarDps({ classe: 'II', vfn: cfg.tensaoRack, esquema: cfg.esquema, nFases: 1 });
  // Nobreaks (um por distribuidor), agrupados por modelo
  const nobreaks = {};
  const baterias = {};
  for (const p of pavimentos) {
    if (!p.nobreak) continue;
    const kn = `${p.nobreak.va}`;
    nobreaks[kn] = (nobreaks[kn] || 0) + p.nobreak.nNobreaks * p.fds;
    if (p.nobreak.nBaterias) baterias[p.nobreak.bateriaAh] = (baterias[p.nobreak.bateriaAh] || 0) + p.nobreak.nBaterias * p.fds;
  }
  const materiais = [
    { codigo: 'CAB', descricao: `Cabo U/UTP ${cfg.blindado ? '(F/UTP blindado) ' : ''}Cat ${cat} 4 pares LSZH — caixa de 305 m`, unidade: 'cx', quantidade: caixas, referencia: 'NBR 14565, Seções 8 e 10' },
    { codigo: 'TO', descricao: `Tomada de telecomunicações RJ-45 Cat ${cat} (conector fêmea) com espelho`, unidade: 'un', quantidade: pontos, referencia: 'NBR 14565, 6.7.7' },
    { codigo: 'PP', descricao: `Patch panel ${cfg.portasPainel} portas Cat ${cat}`, unidade: 'un', quantidade: total('paineis'), referencia: 'NBR 14565, 6.7.3' },
    { codigo: 'ORG', descricao: 'Organizador horizontal de cabos 1U', unidade: 'un', quantidade: total('paineis') + total('switches'), referencia: 'NBR 14565, 6.7.9' },
    { codigo: 'PC-R', descricao: `Patch cord Cat ${cat} 1,5 m (lado do rack)`, unidade: 'un', quantidade: pontos, referencia: 'NBR 14565, Tabela 2' },
    { codigo: 'PC-A', descricao: `Patch cord Cat ${cat} 2,5 m (área de trabalho)`, unidade: 'un', quantidade: pontos, referencia: 'NBR 14565, Tabela 2' },
    ...pavimentos.map(p => ({ codigo: 'RACK', descricao: `Rack ${p.rackU}U 19" com régua de energia e bandeja — ${p.nome}${p.fds > 1 ? ` (${p.fds} distribuidores, um rack por FD)` : ''}`, unidade: 'un', quantidade: p.fds, referencia: 'NBR 14565, 6.7.9' })),
    { codigo: 'SW', descricao: `Switch gerenciável ${cfg.portasSwitch} portas${total('aps') ? ' PoE+' : ''} (ativo — conferir especificação)`, unidade: 'un', quantidade: total('switches'), referencia: '—' },
    ...(backbone ? [{ codigo: 'FO', descricao: 'Cabo de fibra óptica multimodo OM3 6 fibras (backbone)', unidade: 'm', quantidade: backboneM, referencia: 'NBR 14565, 6.3.3 e Seção 9' },
      { codigo: 'DIO', descricao: 'Distribuidor interno óptico (DIO) 24 portas com acopladores LC', unidade: 'un', quantidade: fds, referencia: 'NBR 14565, Seção 11.3' }] : []),
    { codigo: 'ELE', descricao: `Eletroduto PVC rígido ${eletroduto.bitola} com acessórios — até ${capEletroduto} cabos Cat ${cat} Ø ${br(cfg.diametroCabo)} mm por eletroduto (taxa de ocupação; estimativa: Σ pontos × distância média ÷ ${capEletroduto}) [CONFERIR traçado]`, unidade: 'm', quantidade: eletrodutoM, referencia: 'NBR 5410, 6.2.11.1.6; NBR 16415' },
    { codigo: 'DPS', descricao: `${descricaoDps(dps)} — no circuito/quadro que alimenta cada rack [CONFERIR com o projeto elétrico]`, unidade: 'un', quantidade: dps.quantidade * fds, referencia: 'NBR 5410, 6.3.5.2.4 e Tabela 49' },
    ...Object.entries(nobreaks).map(([va, q]) => ({ codigo: 'NB', descricao: `Nobreak ${va} VA para o rack (switches${total('aps') ? ' e APs PoE' : ''}), autonomia de ${cfg.autonomiaMin} min — torre ou 2U de rack conforme o modelo [CONFERIR]`, unidade: 'un', quantidade: q, referencia: 'Carga ÷ 0,7 × 1,25 (_comum/bateria)' })),
    ...Object.entries(baterias).map(([ah, q]) => ({ codigo: 'BAT', descricao: `Bateria 12 V ${ah} Ah para o nobreak (interna ou módulo externo) — autonomia de ${cfg.autonomiaMin} min [CONFERIR com o fabricante]`, unidade: 'un', quantidade: q, referencia: 'Carga × h ÷ (12 V × 0,85) × 1,25' })),
    { codigo: 'BAR', descricao: 'Barra de aterramento de cobre do rack (RGB) com jumpers dos equipamentos', unidade: 'un', quantidade: fds, referencia: 'ANSI/TIA-607-D; NBR 14565 (aterramento) [CONFERIR item na edição 2025]' },
    { codigo: 'TERRA', descricao: `Cabo flexível ${SECAO_TERRA_RACK_MM2} mm² verde-amarelo 750 V — barra do rack ao TGB/BEP`, unidade: 'm', quantidade: Math.ceil(cfg.distanciaTgb * 1.1) * fds, referencia: 'ANSI/TIA-607-D (mín. 6 AWG); NBR 5410, 6.4 [CONFERIR com o projeto de aterramento]' },
  ].filter(m => m.quantidade > 0);
  return { cfg, classe: classeDe(cat), hMax, pavimentos, pontos, caboM, caixas, fds, backbone, backboneM, eletroduto: { ...eletroduto, capacidade: capEletroduto, metros: eletrodutoM, percursoCabos }, dps, materiais, avisos };
}

module.exports = { calcular, comprimentoHorizontalMax, constanteTabela3 };
