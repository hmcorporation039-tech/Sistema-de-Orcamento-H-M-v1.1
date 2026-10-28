// Teste da usina solar — CRESESB Eq. 6.28 a 6.32, NBR 16612 e REN 1000
const motor = require('../scripts/lib/index');
const { calcular, fatorTemperaturaFv } = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('solar');

const ex = motor.exemplo();
const res = motor.processar(ex);
const c = res.calc;
// Consumo médio 760 kWh − 50 (bifásico) = 710 kWh/mês → P = 710/30/(5,2 × 0,8) = 5,689 kWp → 11 × 550 Wp
perto('consumo médio', c.media, 760);
perto('potência necessária (Eq. 6.28)', c.pfvNecessaria, 710 / 30 / (5.2 * 0.8));
igual('11 módulos', c.nTotal, 11);
// Tmód = 33 + (45 − 20)/800 × 1000 = 64,25 °C. O exemplo (Brasília) usava Tmín = 8 °C, acima da mínima
// histórica do DF (1,4 °C, INMET) — passou a 0 °C: Voc(0 °C) = 49,6 × (1 − 0,0027 × (0 − 25)) = 52,95 V
perto('temperatura máxima do módulo (Eq. 4.7)', c.temperaturas.tModMax, 64.25);
perto('Voc a 0 °C', c.temperaturas.vocTmin, 49.6 * (1 - 0.0027 * (0 - 25)));
// Faixa: máx. = floor(600 / 52,95) = 11; mín. = ceil(90 / Vmp(64,25 °C)) = 3
igual('máximo de módulos em série (Eq. 6.30)', c.faixa.maxVoc, 11);
igual('mínimo de módulos em série (Eq. 6.31)', c.faixa.min, 3);
igual('strings 6 + 5 em MPPTs distintos', c.strings.join('+'), '6+5');
perto('FDI (Eq. 6.29)', c.fdi, 5 / 6.05);
igual('sem fusível com 1 string por MPPT', c.precisaFusivel, false);
// Cabo CC: 4 mm² exposto ao sol = 41 A × √((90 − 50)/60)
perto('fator de temperatura do cabo FV', fatorTemperaturaFv(50), Math.sqrt(40 / 60));
igual('cabo CC 4 mm²', c.caboCc.secao, 4);
// Geração: cada mês com os seus dias e o ano = soma dos meses (antes: mês × 30 = 755,0 kWh e ano × 365,
// sem fechar a soma). Ano = 6,05 × 5,2 × 365 × 0,8 = 9186,3 kWh; média = ano/12 = 765,5 kWh/mês;
// janeiro = 6,05 × 5,2 × 31 × 0,8 = 780,2 kWh
perto('geração anual = soma dos meses', c.geracaoAno, 6.05 * 5.2 * 365 * 0.8, 1e-9);
perto('soma dos 12 meses = ano', c.geracaoMensal.reduce((s, g) => s + g.kwh, 0), c.geracaoAno, 1e-9);
perto('geração média mensal (ano/12)', c.geracaoMes, 6.05 * 5.2 * 365 / 12 * 0.8);
perto('geração de janeiro (31 dias)', c.geracaoMensal[0].kwh, 6.05 * 5.2 * 31 * 0.8);
// Lado CA: 5 kW / 220 V × 1,25 = 28,4 A → disjuntor 32 A
igual('disjuntor CA 32 A', c.circuitosCa[0].disjuntor, 32);
perto('potência disponibilizada 2 × 220 × 63 A', c.pDisp, 27.72);
// Fusível obrigatório com 3 strings em paralelo por MPPT
const ex3 = JSON.parse(JSON.stringify(ex));
Object.assign(ex3.sistema, { n_modulos: 30, modulos_por_string: 10 });
Object.assign(ex3.inversor, { n_mppt: 1, strings_por_mppt: 3, quantidade: 1, imax_mppt: 40, isc_max_mppt: 50, potencia_ca_w: 15000 });
Object.assign(ex3.modulo, { corrente_reversa_max_a: 25 });
const c3 = calcular(ex3);
igual('3 strings em paralelo exigem fusível', c3.precisaFusivel, true);
igual('fusível gPV 25 A (1,5 × 14 = 21 ≤ In ≤ 25)', c3.fusivel, 25);
// Ensaio de string: 6 × 49,6 × (1 − 0,0027 × 15) = 285,7 V esperado a 40 °C
perto('Voc esperado no ensaio', res.strings[0].esperado, 6 * 49.6 * (1 - 0.0027 * 15));
igual('ensaio S1 conforme', res.strings[0].resultado, 'C');

// ── Achados da revisão 27/10/2026 ──
// β do Voc digitado positivo (+0,27): antes o Voc a frio CAÍA (49,6 × (1 + 0,0027 × (8 − 25)) = 47,3 V);
// agora vale −|β| e o aviso pede conferência
{
  const e = JSON.parse(JSON.stringify(ex)); e.modulo.coef_voc_pct = 0.27;
  const r = calcular(e);
  perto('β positivo tratado como negativo', r.temperaturas.vocTmin, 49.6 * (1 + 0.0027 * 25));
  igual('aviso do β positivo', r.avisos.some(a => /Coeficiente de temperatura do Voc informado positivo/.test(a)), true);
}
// Tmín não informada: 0 °C (antes 10 °C) com aviso; informada acima da mínima do DF: aviso
{
  const e = JSON.parse(JSON.stringify(ex)); delete e.local.tamb_min;
  const r = calcular(e);
  igual('Tmín padrão 0 °C', r.temperaturas.tMin, 0);
  igual('aviso de Tmín adotada', r.avisos.some(a => /Temperatura mínima do local não informada/.test(a)), true);
  const e8 = JSON.parse(JSON.stringify(ex)); e8.local.tamb_min = 8;
  igual('DF com Tmín 8 °C → aviso (mínima histórica 1,4 °C)', calcular(e8).avisos.some(a => /acima da mínima histórica do DF/.test(a)), true);
}
// String fixa acima do Voc máximo: erro (antes só aviso). 12 × 52,95 = 635 V > 600 V
{
  const e = JSON.parse(JSON.stringify(ex)); e.sistema.modulos_por_string = 12; e.sistema.n_modulos = 12;
  let erro = null; try { calcular(e); } catch (x) { erro = x.message; }
  igual('string de 12 módulos (635 V > 600 V) bloqueia', /acima da tensão máxima de 600 V/.test(erro || ''), true);
}
// 3 strings por MPPT com corrente reversa suportável (2 × 1,25 × 14 = 35 A ≤ 40 A): sem fusível,
// e o texto não diz mais "até 2 strings"
{
  const e = JSON.parse(JSON.stringify(ex3)); e.modulo.corrente_reversa_max_a = 40;
  const r = calcular(e);
  igual('3 strings, corrente reversa 35 A ≤ 40 A → sem fusível', r.precisaFusivel, false);
  igual('motivo cita as 3 strings e a corrente reversa', /3 strings em paralelo por MPPT, mas a corrente reversa \(3 − 1\) × 1,25 × Isc = 35,0 A/.test(r.motivoSemFusivel), true);
  igual('string box com 3 entradas de string (uma por inversor)', r.materiais.find(m => m.codigo === 'SB').descricao.startsWith('String box CC 3 entrada(s)'), true);
}
// Ensaio sem isolamento medido não é "C" (NBR 16274: Voc e isolamento por string)
{
  const e = JSON.parse(JSON.stringify(ex)); delete e.inspecao.strings[0].iso_pos_mohm; delete e.inspecao.strings[0].iso_neg_mohm;
  const s = motor.processar(e).strings[0];
  igual('Voc ok sem isolamento → NV', [s.resultado, s.pendente], ['NV', 'isolamento + / −']);
  const e2 = JSON.parse(JSON.stringify(ex)); e2.inspecao.strings[0].iso_neg_mohm = 0.5;
  igual('isolamento 0,5 MΩ < 1 MΩ → NC', motor.processar(e2).strings[0].resultado, 'NC');
}
// Enquadramento pela potência instalada = menor entre módulos e inversores:
// 128 × 550 Wp = 70,4 kWp com inversor de 100 kW → 70,4 kW → microgeração (antes: minigeração pelo inversor)
{
  const e = JSON.parse(JSON.stringify(ex)); e.sistema.n_modulos = 128;
  Object.assign(e.inversor, { potencia_ca_w: 100000, quantidade: 1, n_mppt: 12, strings_por_mppt: 2, imax_mppt: 40, isc_max_mppt: 50 });
  const r = calcular(e);
  igual('potência instalada = min(70,4 kWp; 100 kW)', r.potenciaInstalada, 70.4);
  igual('microgeração (≤ 75 kW)', r.enquadramento, 'Microgeração distribuída (≤ 75 kW)');
}
igual('DPS CA 275 V (220/380 V TN-S, Tabela 49)', c.dpsCa.uc, 275);
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento usa códigos sol_*', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'sol_modulo'), true);
  igual('resumo com indicadores', motor.resumir(res).indicadores.length >= 6, true);
  fim();
})();
