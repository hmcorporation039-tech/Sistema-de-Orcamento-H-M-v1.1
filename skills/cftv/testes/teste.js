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

// ── Achado A2.8 (revisão 27/10/2026) ──
const clone = (o) => JSON.parse(JSON.stringify(o));
// quantidade 0 virava 1 (câmera fantasma no NVR, discos e PoE)
{ const d = clone(motor.exemplo()); d.cameras[1].quantidade = 0; const c = motor.processar(d).calc;
  igual('quantidade 0 tira a câmera do sistema (NVR, discos e PoE)', [c.nCam, c.cameras.some(x => x.id === d.cameras[1].id)], [res.calc.nCam - motor.exemplo().cameras[1].quantidade, false]);
  const d2 = clone(motor.exemplo()); delete d2.cameras[0].quantidade;
  igual('quantidade vazia continua valendo 1', motor.processar(d2).calc.nCam, res.calc.nCam - motor.exemplo().cameras[0].quantidade + 1); }
// PTZ de 60 W: acima de 25,5 W (802.3at) → porta 802.3bt tipo 4 (até 71,3 W) no switch
{ const d = clone(motor.exemplo()); d.cameras.push({ id: 'PTZ1', local: 'pátio', tipo: 'ptz', quantidade: 1, resolucao_mp: '4', hfov_graus: 60, poe_w: 60, distancia_cabo_m: 40, externa: true });
  const c = motor.processar(d).calc;
  igual('PTZ 60 W exige 802.3bt tipo 4', c.cameras.find(x => x.id === 'PTZ1').poePadrao, 'IEEE 802.3bt tipo 4');
  igual('switch com porta 802.3bt e aviso', [/802.3bt/.test(c.materiais.find(m => m.codigo === 'SW').descricao), c.avisos.some(a => /^PTZ1: consumo de 60,0 W/.test(a))], [true, true]); }
// RAID 5 com 2 discos: RAID 5 exige ≥ 3 (4 câmeras 4 MP × 3,5 Mbps × 30 dias = 4,54 TB → 1 disco de dados de 8 TB → 3 no RAID 5)
{ const d = clone(motor.exemplo()); d.sistema.raid = 'raid5'; d.cameras = [{ id: 'C1', local: 'x', tipo: 'dome', quantidade: 4, resolucao_mp: '4', hfov_graus: 90, distancia_cabo_m: 20 }];
  const c = motor.processar(d).calc;
  igual('RAID 5 com no mínimo 3 discos (antes: 2)', [c.hdsDados, c.hds], [1, 3]); }
// teste com imagem ok e gravação não testada saía "C"
{ const d = clone(motor.exemplo()); d.inspecao.teste_cameras = [{ camera: 'CAM1', imagem_ok: true, gravacao_ok: null }, { camera: 'CAM2', imagem_ok: true, gravacao_ok: true }, { camera: 'CAM4', imagem_ok: true, gravacao_ok: false }];
  igual('gravação não testada → NV; ambos ok → C; falha → NC', motor.processar(d).testes.map(t => t.resultado), ['NV', 'C', 'NC']); }
// 5 MP: 2592 px (4:3) — CAM com 5 MP, 80°, 6,6 m → 2592 / (2·6,6·tg 40°) = 234 px/m < 250 (antes 260 px/m "atende")
{ const d = clone(motor.exemplo()); d.cameras = [{ id: 'C5', local: 'caixa', tipo: 'dome', quantidade: 1, resolucao_mp: '5', hfov_graus: 80, objetivo: 'identificacao', distancia_alvo_m: 6.6 }];
  const c = motor.processar(d).calc.cameras[0];
  igual('5 MP com 2592 px: identificação a 6,6 m não atende', [c.hres, Math.round(c.ppm), c.atende], [2592, 234, false]); }
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  // memorial afirmava "até 90 m por câmera" com a CAM3 a 95 m
  const JSZip = require('../../node_modules/jszip');
  const xml = await (await JSZip.loadAsync((await motor.gerarDocumento(res, 'memorial')).buffer)).file('word/document.xml').async('string');
  igual('memorial aponta a CAM3 (95 m) acima do limite de 90 m', xml.includes('EXCEDEM o limite: CAM3 (95 m)'), true);
  igual('orçamento usa códigos cftv_* existentes', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'cftv_camera_externa'), true);
  fim();
})();
