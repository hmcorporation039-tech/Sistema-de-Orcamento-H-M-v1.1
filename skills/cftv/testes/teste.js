// Teste do CFTV — densidade de pixels (IEC 62676-4) e armazenamento
const motor = require('../scripts/lib/index');
const { perto, igual, fim } = require('../../_comum/teste').verificador('cftv');

const res = motor.processar(motor.exemplo());
const cam = (id) => res.calc.cameras.find(c => c.id === id);
// CAM1: 2560 px, 40°, 5 m → largura 2·5·tg20° = 3,64 m → 703 px/m ≥ 250
perto('CAM1 px/m a 5 m', cam('CAM1').ppm, 2560 / (2 * 5 * Math.tan(20 * Math.PI / 180)));
igual('CAM1 identificação atende', cam('CAM1').atende, true);
// CAM3: 2560 px, 100°, 20 m → 2560 / (2·20·tg50°) = 53,7 px/m < 125 → não atende
igual('CAM3 reconhecimento a 20 m com 100° não atende', cam('CAM3').atende, false);
perto('CAM3 alcance para reconhecimento', cam('CAM3').dMax, 2560 / (125 * 2 * Math.tan(50 * Math.PI / 180)));
// Armazenamento: 7 câmeras 4 MP × 3,5 Mbps + 1 × 4 Mbps (5 MP) = 28,5 Mbps → 28,5 × 3600 × 24 × 30 / 8 / 1e6 = 9,23 TB
perto('banda total', res.calc.banda, 28.5);
perto('armazenamento 30 dias', res.calc.armazenamentoTb, 28.5 * 3600 * 24 * 30 / 8 / 1e6);
igual('2 HDs de 8 TB', res.calc.hds, 2);
igual('NVR 16 canais para 8 câmeras (25 % de reserva)', res.calc.canais, 16);
igual('aviso de cabo > 90 m', res.calc.avisos.some(a => /CAM3.*90 m/.test(a)), true);
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento usa códigos cftv_* existentes', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'cftv_camera_externa'), true);
  fim();
})();
