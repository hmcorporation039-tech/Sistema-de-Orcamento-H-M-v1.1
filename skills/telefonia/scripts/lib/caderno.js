// Caderno de fabricação e montagem (PDF) das caixas da telefonia/interfonia,
// montado a partir do calcular(): DG/central (central de interfonia ou PABX IP,
// suportes com blocos IDC-110/BLI, módulos DPS de linha, DPS de CA, barra TAP)
// e a caixa de distribuição de andar típica (blocos de andar). Ramais,
// terminais, porteiros, nobreak e baterias ficam de campo (na_placa:false).
// Não há catálogo de dimensões: medidas típicas, todas [CONFERIR] com o
// modelo comprado. Motor: skills/_comum/fabricacao/caixa.js.

const CX = require('../../../_comum/fabricacao/caixa');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');
const C = require('./calculo');

const NORMAS = [
  { codigo: 'Práticas Telebrás / ABNT NBR 13726-13727', titulo: 'Rede telefônica interna em edifícios', aplicacao: 'DG, prumada e caixas de distribuição de andar; cabos CI/CCI [CONFERIR vigência]' },
  { codigo: 'ABNT NBR 14306', titulo: 'Proteção elétrica e compatibilidade eletromagnética em redes internas de telecomunicações', aplicacao: 'DPS de linha no DG e aterramento da barra TAP [CONFERIR vigência]' },
  { codigo: 'ABNT NBR 14565:2019', titulo: 'Cabeamento estruturado', aplicacao: 'pontos de voz IP (UTP até 90 m) e identificação, quando houver PABX IP' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito dedicado da central, DPS de CA (6.3.5), aterramento e equipotencialização (6.4)' },
  { codigo: 'ABNT NBR 5419-4', titulo: 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos', aplicacao: 'DPS em todo par que sai da edificação, aterrados no TAP ligado ao BEP' },
  { codigo: 'ABNT NBR IEC 60529', titulo: 'Graus de proteção do invólucro', aplicacao: 'grau IP da caixa' },
];

const arred = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

function descricaoCentral(calc) {
  if (calc.analogica) return `${calc.nCentrais > 1 ? `${calc.nCentrais} × ` : ''}${calc.central.rotulo}${calc.placas ? ` com ${calc.placas} placa(s) de ramais` : ''}`;
  return `${calc.pabx.rotulo} com ${calc.licencas} licença(s) SIP${calc.gwFxs ? ` e ${calc.gwFxs.qtd} gateway(s) FXS de ${calc.gwFxs.valor} portas` : ''}`;
}

// Dimensões típicas da central analógica / PABX IP [CONFERIR]
function dimCentral(calc) {
  if (calc.analogica) {
    const r = calc.central.ramais;
    return r <= 16 ? [250, 180, 70] : r <= 48 ? [330, 240, 80] : [440, 300, 100];
  }
  return [440, 150, 260];
}

function itensSuportes(prefixo, nBlocos) {
  const itens = [];
  const sup = Math.max(1, Math.ceil(nBlocos / C.BLOCOS_POR_SUPORTE));
  for (let k = 1; k <= sup; k++) {
    const n = Math.min(C.BLOCOS_POR_SUPORTE, nBlocos - (k - 1) * C.BLOCOS_POR_SUPORTE);
    itens.push({ tag: `${prefixo}-${k}`, descricao: `Suporte com ${n} bloco(s) IDC-110/BLI de 10 pares (${n * 10} pares)`, largura_mm: 380, altura_mm: 130, profundidade_mm: 60, fixacao: 'parafuso' });
  }
  return itens;
}

function montarCaixaDg(res) {
  const { calc } = res;
  const itens = [];
  const [l, a, p] = dimCentral(calc);
  if (calc.analogica) {
    for (let k = 1; k <= calc.nCentrais; k++) {
      itens.push({ tag: calc.nCentrais > 1 ? `CEN-${k}` : 'CEN', descricao: `${calc.central.rotulo}${calc.placas ? `, ${calc.placas} placa(s) de ramais (total)` : ''}`, fabricante: 'conforme proposta', referencia: `até ${calc.central.ramais} ramais`, largura_mm: l, altura_mm: a, profundidade_mm: p, fixacao: 'parafuso', potencia_w: calc.central.w });
    }
  } else {
    itens.push({ tag: 'PABX', descricao: `${calc.pabx.rotulo} (${calc.licencas} licenças SIP)`, largura_mm: l, altura_mm: a, profundidade_mm: p, fixacao: 'parafuso', potencia_w: calc.pabx.w });
    if (calc.gwFxs) itens.push({ tag: 'GW-FXS', descricao: `Gateway FXS ${calc.gwFxs.valor} portas (${calc.gwFxs.qtd} un.) para ramais analógicos`, largura_mm: 280 * Math.min(calc.gwFxs.qtd, 2), altura_mm: 45, profundidade_mm: 180, fixacao: 'parafuso' });
    if (calc.gwFxo) itens.push({ tag: 'GW-FXO', descricao: `Gateway FXO ${calc.gwFxo.valor} portas (${calc.gwFxo.qtd} un.) para troncos`, largura_mm: 200, altura_mm: 45, profundidade_mm: 150, fixacao: 'parafuso' });
  }
  itens.push(...itensSuportes('BL', calc.blocosDg));
  const paresDps = calc.dps.tronco + calc.dps.porteiro + calc.dps.area;
  if (calc.comDps && paresDps) {
    const mods = Math.ceil(paresDps / 10);
    itens.push({ tag: 'DPS-L', descricao: `Módulo(s) DPS de linha 10 pares (${mods} un.) — ${paresDps} pares (troncos ${calc.dps.tronco}, porteiros ${calc.dps.porteiro}, áreas externas ${calc.dps.area})`, largura_mm: 70 * mods, altura_mm: 110, profundidade_mm: 60, tipo: 'modulo', fixacao: 'trilho' });
  }
  if (calc.comDps && calc.dps.ethernet) itens.push({ tag: 'DPS-E', descricao: `DPS Ethernet/PoE RJ-45 (${calc.dps.ethernet} un.) — porteiros e áreas externas IP`, largura_mm: 30 * Math.min(calc.dps.ethernet, 8), altura_mm: 80, profundidade_mm: 60, tipo: 'modulo', fixacao: 'trilho' });
  if (calc.comDps) itens.push({ tag: 'DPS-CA', descricao: 'DPS de CA classe II 1P+N, 20 kA (alimentação da central) com disjuntor dedicado', largura_mm: 36, altura_mm: 90, profundidade_mm: 65, tipo: 'modulo', fixacao: 'trilho' });
  itens.push({ tag: 'TAP', descricao: 'Barra de aterramento (TAP) em cobre, ligada ao BEP', largura_mm: 200, altura_mm: 30, profundidade_mm: 15, fixacao: 'parafuso' });
  const nb = calc.nobreaks[0];
  if (nb) itens.push({ tag: 'NB', descricao: `Nobreak ${nb.va} VA (senoidal) com bateria ${nb.nBaterias > 1 ? `${nb.nBaterias} × ` : ''}${nb.bateriaAh} Ah — ao lado do DG, alimentando a central`, na_placa: false });
  itens.push({ tag: 'RAM', descricao: `Ramais e terminais (${calc.ramaisNec} ramais com reserva), portaria e ${calc.nPorteiros} porteiro(s): de campo, terminados no DG`, na_placa: false });
  if (!calc.analogica) calc.locaisRede.forEach((lr, i) => itens.push({ tag: `RK-${i + 1}`, descricao: `Rack de parede ${lr.rackU}U com ${lr.switches} switch(es) PoE, patch panel e régua — ${lr.local} (seguir o caderno de rack)`, na_placa: false }));

  const sup = Math.ceil(calc.blocosDg / C.BLOCOS_POR_SUPORTE);
  return {
    id: 'DG-TEL',
    titulo: calc.analogica ? 'DG e central de interfonia' : 'DG e PABX IP',
    local: String(calc.localDg || 'térreo / subsolo').toUpperCase(),
    funcao: `Distribuidor geral (DG) do sistema de ${calc.rotuloTipo.toLowerCase()}: ${descricaoCentral(calc)}; terminação da prumada em ${calc.blocosDg} bloco(s) IDC-110/BLI, ${calc.comDps ? `DPS de linha (${calc.dps.total} un. no sistema) e DPS de CA` : 'sem DPS de linha previsto (não conforme se há pares externos)'}, aterrado no TAP/BEP.`,
    tensao: '127/220 V~ (circuito dedicado) — linhas telefônicas < 50 V',
    ip: 'IP30',
    modeloHm: 'H&M DG-TEL',
    normaHm: 'Telebrás / NBR 14306 / NBR 5419-4',
    normas: NORMAS,
    cabo_interligacao: 'CI-50 / CCI-50 (prumada e ramais); UTP Cat 6 nos pontos IP',
    bornes: Math.max(10, Math.round(calc.ramaisNec / 8)),
    dissipacao_w: Math.round((calc.analogica ? calc.central.w : calc.pabx.w) + 2),
    frente: [
      { tag: 'L1', texto: ['REDE'], tipo: 'led' },
      { tag: 'L2', texto: ['NOBREAK'], tipo: 'led' },
      { tag: 'L3', texto: [calc.analogica ? 'CENTRAL OK' : 'PABX OK'], tipo: 'led' },
      ...(calc.comDps ? [{ tag: 'L4', texto: ['DPS OK'], tipo: 'led' }] : []),
      { tag: 'S1', texto: ['TESTE'], tipo: 'botao' },
    ],
    dados_placa: [
      ['Sistema', calc.rotuloTipo],
      ['Ramais', `${calc.ramaisNec} (reserva ${arred(calc.reserva * 100)} %)`],
      ['Blocos IDC-110', `${calc.blocosDg} no DG`],
      ['DPS de linha', calc.comDps ? String(calc.dps.total) : 'não'],
      ['Nobreak', nb ? `${nb.va} VA` : 'não'],
    ],
    itens,
    verificacoes: [
      { item: 'Teste ramal a ramal', criterio: `chamada, áudio e identificação em cada um dos ${calc.ramaisUsados} ramais em uso (inclusive portaria e ${calc.nPorteiros} porteiro(s)); registrar na planilha de ramais`, norma: 'Telebrás / roteiro H&M' },
      { item: 'Terminação no DG', criterio: 'cada par na régua IDC-110 identificado (bloco/par = ramal), reserva livre mantida; continuidade e isolamento da prumada conferidos antes de ligar a central', norma: 'Telebrás' },
      { item: 'DPS de linha e aterramento (continuidade PE)', criterio: `DPS de linha em todo par que sai da edificação e DPS de CA ligados ao TAP; condutor de aterramento DG→BEP em 16 mm² (${calc.cabo16M} m no sistema) com continuidade ≤ 1 Ω [CONFERIR]`, norma: 'NBR 5410 6.4 · NBR 5419-4 · NBR 14306' },
      { item: 'Nobreak', criterio: nb ? `ao cortar a rede, central e porteiros seguem em operação; autonomia ≥ ${arred(calc.autonomiaH)} h com a carga real (≈ ${arred(nb.cargaW)} W)` : 'sem nobreak no escopo — registrar a ciência do cliente', norma: 'NBR 5410' },
      ...(calc.ip || calc.hibrido ? [{ item: 'Rede IP / SIP', criterio: 'cada telefone IP registrado, voz sem corte, pontos UTP ≤ 90 m, VLAN de voz e QoS conforme projeto', norma: 'NBR 14565' }] : []),
    ],
    observacoes: [
      `Central: ${descricaoCentral(calc)}. ${calc.blocosDg} bloco(s) de 10 pares no DG (${calc.paresCabosDg} pares de cabos, ${calc.paresCentral} pares da central, ${calc.troncosAnalogicos} tronco(s) analógico(s)).`,
      'Dimensões de central, blocos e DPS são típicas por faixa de capacidade; a placa é redimensionada quando o modelo for escolhido. [CONFERIR]',
    ],
    avisos: sup > 1 ? [`${sup} suportes de blocos no DG: avaliar gabinete maior ou dois módulos lado a lado. [CONFERIR]`] : [],
  };
}

function montarCaixaAndar(res) {
  const { calc } = res;
  if (!calc.blocosAndares) return null;
  const blocosMax = Math.max(...calc.blocos.flatMap(b => b.pavimentos).map(p => p.blocosIdc || 0));
  const itens = [...itensSuportes('BA', blocosMax), { tag: 'RAM', descricao: 'Ramais da unidade (CCI-50) saindo da caixa para as tomadas RJ-11', na_placa: false }];
  return {
    id: 'CXA-TEL',
    titulo: 'Caixa de distribuição de andar (típica)',
    local: 'CADA PAVIMENTO',
    funcao: `Caixa de distribuição de andar: recebe o CI-50 da prumada e distribui os ramais das unidades do pavimento (até ${blocosMax} bloco(s) de 10 pares). Total: ${calc.caixasAndar} caixa(s), uma por pavimento; este caderno descreve a caixa típica (a de maior ocupação).`,
    ip: 'IP30',
    modeloHm: 'H&M CXA-TEL',
    normaHm: 'Telebrás / NBR 5410',
    normas: NORMAS,
    cabo_interligacao: 'CI-50 (prumada) e CCI-50 (ramais)',
    bornes: 10,
    frente: [],
    dados_placa: [['Pavimentos', String(calc.caixasAndar)], ['Blocos IDC-110', `${blocosMax} por caixa`]],
    itens,
    verificacoes: [
      { item: `Caixa de andar (${calc.caixasAndar} un.)`, criterio: 'cada par identificado com o ramal; continuidade e chamada da caixa até a tomada da unidade; sem cabos de energia na mesma tubulação', norma: 'Telebrás · NBR 5410' },
    ],
    avisos: [`${calc.caixasAndar} caixas de andar iguais: os materiais valem para UMA caixa, multiplicar por ${calc.caixasAndar}. [CONFERIR tamanho da caixa Telebrás]`],
  };
}

function montarCaderno(res) {
  const { calc } = res;
  const caixas = [montarCaixaDg(res), montarCaixaAndar(res)].filter(Boolean);
  return CX.cadernoDeCaixas(caixas, {
    dados: res.dados,
    sigla: 'CAD-CX-TEL',
    subtitulo: `DG${caixas.length > 1 ? ' e caixa de andar' : ''} — ${calc.rotuloTipo}, ${calc.ramaisNec} ramais`,
    normas: NORMAS,
    modeloHm: 'H&M DG-TEL',
    normaHm: 'Telebrás / NBR 14306 / NBR 5419-4',
    avisos: [
      'Ramais, terminais, porteiros, nobreak e baterias são de campo (fora da caixa); dimensões dos equipamentos são típicas e devem ser conferidas com os modelos comprados. [CONFERIR]',
      ...calc.ncsProjeto.map(n => `NÃO CONFORME (${n.cod}): ${n.descricao}.`),
    ],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarCaixaDg, montarCaixaAndar, montarCaderno, gerarCaderno };
