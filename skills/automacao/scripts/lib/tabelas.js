// Tabelas da disciplina de automação (BMS, climatização e residencial).
// Valores típicos de mercado e de normas internacionais — os que dependem de
// fabricante ou de tabela não conferida na íntegra saem marcados [CONFERIR].

// Pontos típicos por equipamento (lista de pontos BMS): DI, DO, AI, AO físicos
// e "rede" = pontos lidos por integração (BACnet/Modbus). Editáveis por linha.
const EQUIPAMENTOS = {
  chiller: { rotulo: 'Chiller (integração + comando)', di: 2, do: 1, ai: 2, ao: 0, rede: 20, dispositivoRede: true },
  ahu: { rotulo: 'Fancoil / climatizador (AHU)', di: 3, do: 1, ai: 3, ao: 2, rede: 0 },
  fancolete: { rotulo: 'Fancolete (FCU)', di: 1, do: 3, ai: 1, ao: 1, rede: 0 },
  vrf: { rotulo: 'VRF / VRV (por unidade interna, via gateway)', di: 0, do: 0, ai: 0, ao: 0, rede: 6, dispositivoRede: false },
  split: { rotulo: 'Split / hi-wall (via gateway ou IR)', di: 0, do: 0, ai: 0, ao: 0, rede: 4, dispositivoRede: true },
  bomba: { rotulo: 'Bomba (BAG/BAC/recalque)', di: 2, do: 1, ai: 0, ao: 1, rede: 0 },
  torre: { rotulo: 'Torre de resfriamento', di: 2, do: 1, ai: 2, ao: 1, rede: 0 },
  exaustor: { rotulo: 'Exaustor / ventilador', di: 2, do: 1, ai: 0, ao: 0, rede: 0 },
  iluminacao: { rotulo: 'Circuito de iluminação', di: 1, do: 1, ai: 0, ao: 0, rede: 0 },
  medidor: { rotulo: 'Medidor de energia (Modbus)', di: 0, do: 0, ai: 0, ao: 0, rede: 12, dispositivoRede: true },
  quadro: { rotulo: 'Quadro elétrico (status e falha)', di: 3, do: 0, ai: 0, ao: 0, rede: 0 },
  gerador: { rotulo: 'Grupo gerador', di: 4, do: 1, ai: 1, ao: 0, rede: 10, dispositivoRede: true },
  nobreak: { rotulo: 'Nobreak (integração)', di: 0, do: 0, ai: 0, ao: 0, rede: 8, dispositivoRede: true },
  reservatorio: { rotulo: 'Reservatório (nível)', di: 2, do: 0, ai: 1, ao: 0, rede: 0 },
  sala_pressao: { rotulo: 'Sala com pressão controlada (T, UR, ΔP)', di: 1, do: 0, ai: 3, ao: 1, rede: 0 },
  sensor_ambiente: { rotulo: 'Sensor de ambiente (T/UR/CO₂)', di: 0, do: 0, ai: 2, ao: 0, rede: 0 },
  outro: { rotulo: 'Outro (informar pontos)', di: 0, do: 0, ai: 0, ao: 0, rede: 0 },
};

// NBR 16401-3:2008, Tabela 1, nível 1 — Fp (L/s·pessoa) e Fa (L/s·m²);
// mesmos valores da ASHRAE 62.1. [CONFERIR na norma para o uso específico]
const AR_EXTERNO = {
  escritorio: { rotulo: 'Escritório', fp: 2.5, fa: 0.3, densidade: 5 },
  reuniao: { rotulo: 'Sala de reunião', fp: 2.5, fa: 0.3, densidade: 50 },
  sala_aula: { rotulo: 'Sala de aula', fp: 5.0, fa: 0.6, densidade: 35 },
  loja: { rotulo: 'Loja / varejo', fp: 3.8, fa: 0.6, densidade: 15 },
  restaurante: { rotulo: 'Restaurante', fp: 3.8, fa: 0.9, densidade: 70 },
  auditorio: { rotulo: 'Auditório', fp: 2.5, fa: 0.3, densidade: 150 },
  outro: { rotulo: 'Outro (informar Fp e Fa)', fp: 2.5, fa: 0.3, densidade: 10 },
};
const CO2_PESSOA_LS = 0.0052; // geração de CO₂ por pessoa em atividade de escritório (L/s)
const CO2_EXTERNO_PPM = 420;

// EN 15232:2012 — método dos fatores BAC (fBAC térmico e elétrico) por uso,
// classes D/C/B/A, referência C = 1. A ISO 52120-1:2022 substituiu a EN 15232;
// os fatores servem para estimativa. [CONFERIR]
const FATORES_BAC = {
  escritorio: { th: { D: 1.51, C: 1, B: 0.80, A: 0.70 }, el: { D: 1.10, C: 1, B: 0.93, A: 0.87 } },
  escola: { th: { D: 1.20, C: 1, B: 0.88, A: 0.80 }, el: { D: 1.10, C: 1, B: 0.88, A: 0.80 } },
  hospital: { th: { D: 1.31, C: 1, B: 0.91, A: 0.86 }, el: { D: 1.05, C: 1, B: 0.98, A: 0.96 } },
  hotel: { th: { D: 1.31, C: 1, B: 0.85, A: 0.68 }, el: { D: 1.07, C: 1, B: 0.95, A: 0.90 } },
  comercio: { th: { D: 1.56, C: 1, B: 0.73, A: 0.60 }, el: { D: 1.08, C: 1, B: 0.95, A: 0.91 } },
  residencial: { th: { D: 1.10, C: 1, B: 0.88, A: 0.81 }, el: { D: 1.08, C: 1, B: 0.93, A: 0.92 } },
};

// Funções de automação avaliadas (simplificação das tabelas de funções da
// ISO 52120-1 / EN 15232). Cada nível indica a classe mínima que ele permite.
const FUNCOES_BAC = [
  { cod: 'emissao', grupo: 'Climatização', rotulo: 'Controle de temperatura dos ambientes', niveis: [
    ['sem', 'Sem controle automático', 'D'], ['central', 'Controle central (um termostato geral)', 'D'],
    ['individual', 'Controle individual por ambiente', 'C'], ['comunicacao', 'Individual, comunicando com o BMS', 'B'],
    ['demanda', 'Individual + presença/demanda', 'A']] },
  { cod: 'geracao', grupo: 'Climatização', rotulo: 'Controle da produção de frio/calor (chiller, VRF)', niveis: [
    ['fixo', 'Setpoint fixo', 'D'], ['externa', 'Compensado pela temperatura externa', 'C'], ['carga', 'Variável pela carga / demanda', 'A']] },
  { cod: 'bombas', grupo: 'Climatização', rotulo: 'Bombas e ventiladores', niveis: [
    ['liga', 'Liga/desliga manual ou contínuo', 'D'], ['horario', 'Liga/desliga por horário', 'C'], ['variavel', 'Velocidade variável (inversor) por demanda', 'A']] },
  { cod: 'ventilacao', grupo: 'Ventilação', rotulo: 'Vazão de ar externo', niveis: [
    ['sem', 'Sem controle', 'D'], ['horario', 'Por horário', 'C'], ['presenca', 'Por presença', 'B'], ['co2', 'Por demanda (CO₂)', 'A']] },
  { cod: 'iluminacao', grupo: 'Iluminação', rotulo: 'Controle por ocupação', niveis: [
    ['manual', 'Interruptor manual', 'D'], ['varredura', 'Manual + desligamento geral programado', 'C'],
    ['auto', 'Sensor de presença (liga e desliga)', 'B'], ['ausencia', 'Liga manual, desliga por ausência', 'A']] },
  { cod: 'luz_natural', grupo: 'Iluminação', rotulo: 'Aproveitamento de luz natural', niveis: [
    ['manual', 'Manual', 'C'], ['automatico', 'Dimerização automática por luz natural', 'A']] },
  { cod: 'persianas', grupo: 'Persianas', rotulo: 'Controle de persianas/cortinas', niveis: [
    ['manual', 'Manual', 'D'], ['motorizado', 'Motorizado com comando manual', 'C'], ['automatico', 'Automático (sol/temperatura)', 'B'], ['integrado', 'Integrado com iluminação e climatização', 'A']] },
  { cod: 'gestao', grupo: 'Gestão técnica', rotulo: 'Supervisão e gestão de energia', niveis: [
    ['sem', 'Sem supervisão', 'D'], ['alarmes', 'Supervisão com alarmes e falhas', 'C'], ['medicao', 'Medição de energia e tendências', 'B'], ['otimizacao', 'Relatórios, otimização e detecção de falhas', 'A']] },
];
const ORDEM_CLASSE = ['D', 'C', 'B', 'A'];

// Residencial
const RESID = {
  zigbee: { rotulo: 'Zigbee (hub + módulos sem fio)', dispositivosPorHub: 50 },
  wifi: { rotulo: 'Wi-Fi (módulos ligados ao roteador)', dispositivosPorAp: 30 },
  knx: { rotulo: 'KNX (barramento cabeado)', dispositivosPorLinha: 64, maPorDispositivo: 10, fonteMa: 640 },
};

const LICENCAS_PONTOS = [100, 250, 500, 1000, 2500, 5000, 10000];

module.exports = { EQUIPAMENTOS, AR_EXTERNO, CO2_PESSOA_LS, CO2_EXTERNO_PPM, FATORES_BAC, FUNCOES_BAC, ORDEM_CLASSE, RESID, LICENCAS_PONTOS };
