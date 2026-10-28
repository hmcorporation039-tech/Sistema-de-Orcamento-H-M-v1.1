// CFTV — dimensionamento por câmera (IEC 62676-4, densidade de pixels DORI),
// armazenamento, gravador, PoE, cabos e nobreak. Não há norma ABNT específica
// de projeto de CFTV na biblioteca: valores de bitrate e consumo são típicos e
// devem ser conferidos com o fabricante (o laudo e o memorial deixam isso claro).

// IEC 62676-4: densidade mínima de pixels (px/m) por objetivo
const DORI = { deteccao: 25, observacao: 62, reconhecimento: 125, identificacao: 250 };
const ROTULO_DORI = { deteccao: 'Detecção', observacao: 'Observação', reconhecimento: 'Reconhecimento', identificacao: 'Identificação' };
// Resolução horizontal típica por megapixel. 5 MP: 2592 × 1944 (sensor 4:3, o mais
// comum) — o 2880 × 1620 (16:9) superestimava a densidade de pixels em 11 %.
const HRES = { 1: 1280, 2: 1920, 3: 2304, 4: 2560, 5: 2592, 6: 3072, 8: 3840, 12: 4000 };
// Bitrate típico (Mbps) em H.265 a 15 qps; H.264 ≈ 1,8 ×
const BITRATE_H265 = { 1: 1, 2: 2, 3: 2.5, 4: 3.5, 5: 4, 6: 5, 8: 6, 12: 8 };
const POE_PADRAO = { dome: 6, bullet: 8, ptz: 25, fisheye: 8 };
const CANAIS_NVR = [4, 8, 16, 32, 64, 128, 256];
const NOBREAK_VA = [600, 1000, 1500, 2200, 3000, 6000, 10000];
// Potência disponível no equipamento alimentado (PD) por padrão PoE — IEEE 802.3af
// 12,95 W; 802.3at (PoE+) 25,5 W; 802.3bt tipo 3 51 W e tipo 4 71,3 W.
const POE_CLASSES = [{ w: 12.95, padrao: 'IEEE 802.3af' }, { w: 25.5, padrao: 'IEEE 802.3at' }, { w: 51, padrao: 'IEEE 802.3bt tipo 3' }, { w: 71.3, padrao: 'IEEE 802.3bt tipo 4' }];
// quantidade: vazio → 1; 0 (ou negativo) → câmera fora do sistema
const qtdDe = (c) => (c.quantidade == null || c.quantidade === '' ? 1 : Number(c.quantidade));

function hresDe(c) {
  if (Number(c.hres) > 0) return Number(c.hres);
  const mp = Number(c.resolucao_mp) || 2;
  return HRES[mp] || Math.round(Math.sqrt(mp * 1e6 * 16 / 9));
}

function bitrateDe(c, s) {
  if (Number(c.bitrate_mbps) > 0) return Number(c.bitrate_mbps);
  const mp = Number(c.resolucao_mp) || 2;
  const base = BITRATE_H265[mp] || mp;
  const fator = (s.codec === 'H.264' ? 1.8 : 1) * ((Number(s.fps) || 15) / 15);
  return base * fator;
}

const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

function calcular(dados) {
  const s = dados.sistema || {};
  const dias = Number(s.dias_gravacao) || 30;
  const horas = Number(s.horas_dia) || 24;
  const atividade = s.modo_gravacao === 'movimento' ? (Number(s.atividade_pct) || 40) / 100 : 1;
  const hdTb = Number(s.hd_tb) || 8;
  const avisos = [];

  const cameras = (dados.cameras || []).filter(c => c && qtdDe(c) > 0 && c.local !== undefined).map((c, i) => {
    const qtd = qtdDe(c);
    const tipo = c.tipo || 'dome';
    const hres = hresDe(c);
    const hfov = Number(c.hfov_graus) || 90;
    const largura = (d) => 2 * d * Math.tan((hfov * Math.PI / 180) / 2);
    const objetivo = c.objetivo || 'observacao';
    const ppmNecessario = DORI[objetivo] || 62;
    const dAlvo = Number(c.distancia_alvo_m) || null;
    const ppm = dAlvo ? hres / largura(dAlvo) : null;
    const dMax = hres / (ppmNecessario * 2 * Math.tan((hfov * Math.PI / 180) / 2));
    const atende = ppm == null ? null : ppm >= ppmNecessario;
    if (atende === false) avisos.push(`${c.id || `CAM${i + 1}`} (${c.local}): ${Math.round(ppm)} px/m a ${dAlvo} m — abaixo de ${ppmNecessario} px/m para ${ROTULO_DORI[objetivo]}. Alcance máximo com esta câmera/lente: ${br(dMax, 1)} m; reduzir o ângulo (lente maior) ou aumentar a resolução.`);
    const cabo = Number(c.distancia_cabo_m) || 30;
    if (cabo > 90) avisos.push(`${c.id || `CAM${i + 1}`}: cabo de ${cabo} m excede 90 m (NBR 14565) — usar extensor PoE, switch intermediário ou fibra.`);
    const bitrate = bitrateDe(c, s);
    const poe = Number(c.poe_w) || POE_PADRAO[tipo] || 8;
    const classePoe = POE_CLASSES.find(k => poe <= k.w) || null;
    if (!classePoe) avisos.push(`${c.id || `CAM${i + 1}`}: consumo de ${br(poe, 1)} W acima de 71,3 W (limite do IEEE 802.3bt tipo 4) — alimentar por fonte/injetor próprio do fabricante.`);
    else if (poe > 25.5) avisos.push(`${c.id || `CAM${i + 1}`}: consumo de ${br(poe, 1)} W acima de 25,5 W (PoE+ 802.3at) — exige porta ${classePoe.padrao} no switch (ou injetor PoE++).`);
    return { ...c, id: c.id || `CAM${i + 1}`, qtd, tipo, hres, hfov, objetivo, ppmNecessario, dAlvo, ppm, dMax, atende, cabo, bitrate, poe, poePadrao: classePoe ? classePoe.padrao : 'fonte própria', externa: !!c.externa };
  });
  if (!cameras.length) throw new Error('Cadastre ao menos uma câmera.');

  const nCam = cameras.reduce((a, c) => a + c.qtd, 0);
  const banda = cameras.reduce((a, c) => a + c.bitrate * c.qtd, 0);
  // TB = Mbps × 3600 s × h × dias × atividade ÷ 8 (bits→bytes) ÷ 10^6 (MB→TB)
  const armazenamentoTb = banda * 3600 * horas * dias * atividade / 8 / 1e6;
  const raid = s.raid === 'raid5';
  // RAID 5 exige no mínimo 3 discos (2 de dados + 1 de paridade distribuída)
  const hdsDados = Math.max(1, Math.ceil(armazenamentoTb / hdTb));
  const hds = raid ? Math.max(3, hdsDados + 1) : hdsDados;
  // 25 % de canais de reserva para expansão
  const canais = CANAIS_NVR.find(n => n >= nCam * 1.25) || Math.ceil(nCam * 1.25 / 64) * 64;
  const poeTotal = cameras.reduce((a, c) => a + c.poe * c.qtd, 0);
  const portasBt = cameras.filter(c => c.poe > 25.5 && c.poe <= 71.3).reduce((a, c) => a + c.qtd, 0);
  const caboAcima90 = cameras.filter(c => c.cabo > 90);
  const poeComMargem = poeTotal * 1.2;
  const portasSwitch = nCam + 2;
  const switches = Math.ceil(portasSwitch / (Number(s.portas_switch) || 24));
  const nvrW = (Number(s.nvr_w) || 30) + hds * 8;
  const cargaW = poeTotal + nvrW + switches * 15;
  const nobreakVa = NOBREAK_VA.find(v => v >= cargaW / 0.9 * 1.25) || Math.ceil(cargaW / 0.9 * 1.25);
  const autonomiaMin = Number(s.autonomia_min) || 30;
  const energiaWh = cargaW * autonomiaMin / 60;
  const caboM = Math.ceil(cameras.reduce((a, c) => a + (c.cabo + 3) * c.qtd, 0));
  const placas = Number(s.placas_monitoramento) || Math.max(1, Number(s.acessos) || 1);

  const porModelo = {};
  for (const c of cameras) {
    const k = `Câmera IP ${c.tipo} ${c.resolucao_mp || 2} MP, lente ${c.hfov}° de abertura${c.externa ? ', IP66/IK10 (externa)' : ''}${c.modelo ? ` — ${c.modelo}` : ''}`;
    porModelo[k] = (porModelo[k] || 0) + c.qtd;
  }
  const materiais = [
    ...Object.entries(porModelo).map(([descricao, quantidade]) => ({ codigo: 'CAM', descricao, unidade: 'un', quantidade, referencia: 'IEC 62676-4' })),
    { codigo: 'NVR', descricao: `Gravador NVR ${canais} canais, banda de entrada ≥ ${Math.ceil(banda * 1.3)} Mbps, ${hds} baia(s) de disco`, unidade: 'un', quantidade: 1, referencia: 'Dimensionamento' },
    { codigo: 'HD', descricao: `Disco rígido ${hdTb} TB próprio para vigilância${raid ? ' (RAID 5)' : ''}`, unidade: 'un', quantidade: hds, referencia: `${br(armazenamentoTb, 1)} TB para ${dias} dias` },
    { codigo: 'SW', descricao: `Switch PoE ${Number(s.portas_switch) || 24} portas, orçamento PoE ≥ ${Math.ceil(poeComMargem / switches)} W${portasBt ? `, com ${portasBt} porta(s) IEEE 802.3bt (PoE++ até ${Math.max(...cameras.filter(c => c.poe > 25.5 && c.poe <= 71.3).map(c => c.poe > 51 ? 71.3 : 51)).toLocaleString('pt-BR')} W)` : ''}`, unidade: 'un', quantidade: switches, referencia: portasBt ? 'IEEE 802.3af/at/bt' : 'IEEE 802.3af/at' },
    { codigo: 'UTP', descricao: 'Cabo U/UTP Cat 6 externo/interno para câmeras', unidade: 'm', quantidade: caboM, referencia: 'NBR 14565' },
    { codigo: 'RJ', descricao: 'Conector RJ-45 Cat 6 (com capa) — 2 por câmera', unidade: 'un', quantidade: nCam * 2, referencia: '—' },
    { codigo: 'CX', descricao: 'Caixa de passagem/suporte para câmera', unidade: 'un', quantidade: nCam, referencia: '—' },
    { codigo: 'NB', descricao: `Nobreak ${nobreakVa} VA (carga ≈ ${Math.round(cargaW)} W, autonomia desejada ${autonomiaMin} min ≈ ${Math.round(energiaWh)} Wh)`, unidade: 'un', quantidade: 1, referencia: 'Dimensionamento' },
    ...(cameras.some(c => c.externa) ? [{ codigo: 'DPS', descricao: 'DPS de rede (RJ-45 PoE) para câmeras externas', unidade: 'un', quantidade: cameras.filter(c => c.externa).reduce((a, c) => a + c.qtd, 0), referencia: 'NBR 5419-4' }] : []),
    { codigo: 'PLACA', descricao: 'Placa "Ambiente monitorado por câmeras" (LGPD — transparência)', unidade: 'un', quantidade: placas, referencia: 'Lei 13.709/2018' },
  ];
  avisos.push('Bitrate e consumos típicos de mercado — conferir com a ficha técnica dos equipamentos escolhidos. [CONFERIR]');
  return { cameras, nCam, banda, dias, horas, atividade, armazenamentoTb, hdTb, hds, hdsDados, portasBt, caboAcima90, raid, canais, poeTotal, poeComMargem, switches, cargaW, nobreakVa, autonomiaMin, energiaWh, caboM, materiais, avisos };
}

module.exports = { calcular, DORI, ROTULO_DORI, POE_CLASSES, hresDe };
