// Teste do alarme de intrusão — cobertura de IVP, zonas → central, autonomia
// por grau (EN 50131-1/-6), bateria, sem fio → repetidor, documentos e orçamento.
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('alarme');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const comSistema = (mudar) => { const d = motor.exemplo(); Object.assign(d.sistema, mudar); return d; };

// ── Cobertura do IVP: 12 m / 90° → π·144/4 = 113,1 m²
perto('área coberta 12 m / 90°', C.areaCobertaIvp(12, 90), Math.PI * 144 / 4);
igual('sala 32 m² × 8 m → 1 IVP', C.ivpsDoAmbiente(32, 8, 12, 90, false), 1);
igual('corredor 40 m² × 20 m → 2 IVP (pela maior dimensão)', C.ivpsDoAmbiente(40, 20, 12, 90, false), 2);
igual('salão 300 m² × 18 m → 3 IVP (pela área)', C.ivpsDoAmbiente(300, 18, 12, 90, false), 3);
igual('risco alto 12 m² → 2 detectores cruzados', C.ivpsDoAmbiente(12, 4, 12, 90, true), 2);
igual('barreira 50 m, 2 trechos, 30 m → 2 pares', C.paresPerimetro(50, 2, 30), 2);
igual('barreira 100 m, 1 trecho, 30 m → 4 pares', C.paresPerimetro(100, 1, 30), 4);

// ── Autonomia por grau (com/sem notificação da falta de rede)
igual('grau 2 notificado → 12 h', C.autonomiaDoGrau(2, true), 12);
igual('grau 2 sem notificação → 24 h', C.autonomiaDoGrau(2, false), 24);
igual('grau 3 notificado → 30 h', C.autonomiaDoGrau(3, true), 30);
igual('grau 4 sem notificação → 60 h', C.autonomiaDoGrau(4, false), 60);
igual('grau 3 monitorado sem meio de comunicação → 60 h', motor.processar(comSistema({ grau: '3', com_ethernet: false, com_gprs: false })).calc.bateria.autonomiaH, 60);
igual('autonomia informada prevalece', motor.processar(comSistema({ autonomia_h: 48 })).calc.bateria.autonomiaH, 48);

// ── Exemplo: residência térrea, 8 ambientes, grau 2, híbrido, 2 partições
const res = motor.processar(motor.exemplo());
const c = res.calc;
// magnéticos: 3 portas + 8 janelas; IVP: 7 ambientes × 1 + escritório (risco alto) 2
igual('magnéticos', c.nMag, 11);
igual('IVP internos', c.nIvp, 9);
igual('IVP pet na sala (animais)', c.ambientes[0].tipoIvp, 'ivp_pet');
igual('dupla tecnologia no escritório (risco alto)', c.ambientes.find(a => a.risco === 'alto').tipoIvp, 'ivp_dupla');
// zonas: ambientes 20 (porta agrupada, janela sem fio individual) + 2 barreiras + 2 IVP externos + 1 pânico
igual('zonas', c.nZonas, 25);
igual('zonas com 20 % de reserva', c.zonasComReserva, Math.ceil(25 * 1.2));
igual('central 64 zonas (30 > 16)', c.central.id, 'C64');
// com fio: 17 → 21 com reserva; placa 16 → 1 expansor de 8
igual('expansor de zonas', c.expansores, Math.ceil((Math.ceil(17 * 1.2) - 16) / 8));
igual('receptor sem fio (8 janelas + 2 controles)', c.receptores, 1);
igual('sem repetidor (103 m² sem fio < 300 m²)', c.repetidores, 0);
igual('teclados: 2 partições / 2 acessos', c.teclados, 2);
igual('sirenes: 2 internas + 1 externa', c.sirenesInternas + c.sirenesExternas, 3);
igual('porta principal em zona temporizada', c.zonas[0].tipo, 'temporizada');
// bateria: 1,25 × (Irep × 12 h + Ialm × 15/60) / 1000
const b = c.bateria;
igual('autonomia grau 2 monitorado', b.autonomiaH, 12);
perto('corrente de repouso', b.iRepouso, 80 + 2 * 40 + 7 * 12 + 2 * 25 + 2 * 70 + 2 * 30 + 25 + 30 + 70 + 40);
perto('bateria (Ah)', b.bateriaAh, 1.25 * (b.iRepouso * 12 + b.iAlarme * 15 / 60) / 1000, 1e-9);
igual('bateria comercial 12 Ah', b.bateriaEscolhida, 12);
perto('fonte = repouso + recarga 80 % em 72 h', b.fonteA, b.iRepouso / 1000 + 0.8 * 12 / 72, 1e-9);

// ── Casos de borda
// sem fio, 700 m² → ⌈700/300⌉ − 1 = 2 repetidores
const dSf = comSistema({ tecnologia: 'sem_fio' });
dSf.ambientes = [{ nome: 'Galpão', area_m2: 400, maior_dimensao_m: 25, portas: 2, janelas: 4 }, { nome: 'Escritórios', area_m2: 300, maior_dimensao_m: 20, portas: 1, janelas: 6 }];
dSf.areas_externas = [];
const sf = motor.processar(dSf).calc;
igual('sem fio 700 m² → 2 repetidores', sf.repetidores, 2);
igual('sem fio: cada magnético é uma zona', sf.zonas.filter(z => z.equipamento === 'magnetico').length, 13);
// muitas zonas com fio sem agrupar → central maior
const dG = comSistema({ tecnologia: 'com_fio', agrupar_magneticos: false });
dG.ambientes = Array.from({ length: 30 }, (_, i) => ({ nome: `Sala ${i + 1}`, area_m2: 20, maior_dimensao_m: 5, portas: 1, janelas: 2 }));
const g = motor.processar(dG).calc;
igual('30 salas × 4 zonas + 5 = 125 → central 256 zonas', [g.nZonas, g.central.id], [125, 'C256']);
igual('partições exigem central maior', C.escolherCentral(10, 3).id, 'C64');
// grau 3 com uma via → aviso de dupla via; sirene autoalimentada
const g3 = motor.processar(comSistema({ grau: '3', com_gprs: false })).calc;
igual('grau 3 com uma via → aviso', g3.avisos.some(a => /dupla via/.test(a)), true);
igual('grau 3 → sirene externa autoalimentada', g3.autoalimentada, true);
igual('monitorado sem meio → aviso', motor.processar(comSistema({ com_ethernet: false, com_gprs: false })).calc.avisos.some(a => /sem meio de comunicação/.test(a)), true);

// ── Inspeção: NC do checklist (CO2), zona com evento não recebido e ensaios
igual('NC de senha de fábrica com P1', res.ncs.some(n => n.item === 'CO2' && n.prioridade === 'P1'), true);
igual('zona Z05 sem evento → NC', res.med.zonas.find(z => z.zona === 'Z05').resultado, 'NC');
igual('ensaios conformes', res.med.ensaios.map(e => e.resultado), ['C', 'C', 'C']);
igual('parecer não conforme preliminar', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');
igual('sem fio presente → DT5 aplicável', res.checklist.find(x => x.cod === 'DT5').situacao, 'NV');
igual('sem vídeo → TX4 NA', res.checklist.find(x => x.cod === 'TX4').situacao, 'NA');

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  const exe = motor.montarOrcamento(res, 'execucao');
  igual('orçamento usa códigos alarme_* existentes', ['alarme_sensor_abertura', 'alarme_ivp', 'alarme_sirene', 'alarme_teclado', 'alarme_central'].every(k => exe.itens.some(i => i.codigo === k)), true);
  igual('seções do orçamento', [...new Set(exe.itens.map(i => i.secao))], ['Materiais e Equipamentos', 'Serviços (Mão de Obra)']);
  igual('mensalidade informativa', exe.itens.some(i => i.codigo === 'alarme_monitoramento_mensal'), true);
  const insp = motor.montarOrcamento(res, 'inspecao');
  igual('vistoria por zona', insp.itens.find(i => i.codigo === 'alarme_vistoria').quantidade, 25);
  igual('modelo vazio não calcula sem ambientes', (() => { try { motor.processar(motor.modeloVazio()); return 'ok'; } catch (e) { return 'erro'; } })(), 'erro');
  igual('exemplo não é alterado (clone)', clonar(motor.exemplo()).ambientes.length, 8);
  fim();
})();
