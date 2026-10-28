// Cabeamento estruturado — ABNT NBR 14565:2019.
// Tomadas por área de trabalho (6.7.7.1), comprimento máximo do cabo
// horizontal pela Tabela 3 (com redução por temperatura), distribuidores de
// piso (6.7.3), APs (Seção 15), rack, patch panels e lista de materiais.

const CAIXA_CABO_M = 305;
const RACKS_U = [6, 8, 12, 16, 24, 32, 36, 40, 44];

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
  const hMax = comprimentoHorizontalMax(cfg);
  const avisos = [];
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
    return { ...p, area, areasTrabalho, tomadasAt, aps, tomadasAp, extra, pontos, dMed, dMax, fds, cabo, pontosPorFd, paineisPorFd, switchesPorFd, paineis, switches, uNecessario, rackU, backboneHorizontal };
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
    { codigo: 'ELE', descricao: 'Eletroduto/eletrocalha para encaminhamento (estimativa: distância média × pontos ÷ 6)', unidade: 'm', quantidade: Math.ceil(total('cabo') / 6), referencia: 'NBR 16415' },
  ].filter(m => m.quantidade > 0);
  return { cfg, classe: classeDe(cat), hMax, pavimentos, pontos, caboM, caixas, fds, backbone, backboneM, materiais, avisos };
}

module.exports = { calcular, comprimentoHorizontalMax, constanteTabela3 };
