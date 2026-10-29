// Teste da skill de pressurização de escadas — casos conferidos à mão.
//
// 1) Calibração com o exemplo resolvido da norma (CBMGO NT 13/2025, Anexo F — mesmo
//    método da IT 13 do CBPMESP): 18 pavimentos, 17 PCF simples de ingresso (0,03 m²) e
//    1 de saída (0,04 m²), serviço profissional > 21 m → 2 PCF abertas (1,64 m² cada), duto
//    metálico. Resultados da norma: A = 0,55 m²; QFT = 3,22 m³/s; APA = 3,76 m²;
//    VPA = 0,86 m/s; QAT = 3,76 m³/s; QTS = 5,26 m³/s; QFT(60 Pa) = 3,52 m³/s; QD = 1,74 m³/s.
// 2) Automação calibrada com o serviço real da H&M (adequação do comando de 3 escadas
//    pressurizadas de um hospital no DF, 2026 — dados anonimizados): por escada, 2
//    ventiladores (operante + reserva com reversão), 1 controlador, 1 transmissor de ΔP
//    e 1 pressostato de fluxo por ventilador. Não havia memorial de vazão para calibrar.
// 3) Contas à mão: atrito no duto 0,75 × 0,75 m com 5,264 m³/s (Altshul-Tsal):
//    V = 9,358 m/s; Re = 66 400·0,75·9,358 = 466 028; f' = 0,11·(0,00012 + 0,0001459)^0,25
//    = 0,014047 → f = 0,85·f' + 0,0028 = 0,014740; Pd = 0,602·9,358² = 52,72 Pa;
//    Δp/L = f/Dh·Pd = 1,036 Pa/m.  Força na PCF 0,89 × 2,10 m a 50 Pa com fechador 40 N:
//    F = 40 + 0,89·1,869·50/(2·0,83) = 90,10 N.  Janela (N = 1,6), 0,01 m² a 50 Pa:
//    Q = 0,827·0,01·50^0,625 = 0,0954 m³/s.
const fs = require('fs');
const path = require('path');
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const T = require('../scripts/lib/tabelas');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('pressurização');

// 1) fórmulas básicas
perto('Equação 1: 0,827 × 0,55 × √50 (Anexo F)', C.vazaoFresta(0.55, 50), 3.2163, 0.001);
perto('janela N = 1,6: 0,827 × 0,01 × 50^0,625', C.vazaoFresta(0.01, 50, 1.6), 0.0954, 0.003);
perto('Equação 3: duas frestas de 0,03 m² em série = 0,03/√2', C.areaSerie([0.03, 0.03]), 0.021213, 0.001);
perto('força de abertura PCF 0,89 × 2,10 m a 50 Pa (fechador 40 N)', C.forcaPorta({ largura: 0.89, altura: 2.1, dp: 50, fechador: 40 }), 90.10, 0.002);
const at = C.perdaAtrito({ vazao: 5.264, largura: 0.75, altura: 0.75, comprimento: 64, eps: 0.00009 });
perto('fator de atrito Altshul-Tsal', at.f, 0.01474, 0.003);
perto('perda por atrito por metro', at.porMetro, 1.036, 0.003);
perto('ar padrão ao nível do mar a 20 °C', C.densidadeLocal(0, 20), 1.204, 0.002);
igual('grelhas: 18 pav → 10; 5 → 3; 2 → 2; 1 → 1', [18, 5, 2, 1].map(C.numeroGrelhas), [10, 3, 2, 1]);
igual('motor comercial para 2,99 kW → 5 cv', C.motorComercial(2.992), 5);
igual('Tabela B1: residencial 80 m → 1; 81 m → 2; escritório 21 m → 1; 22 m → 2; hospital 10 m → 2',
  [T.portasAbertasTabelaB1('A', 80), T.portasAbertasTabelaB1('A', 81), T.portasAbertasTabelaB1('D', 21), T.portasAbertasTabelaB1('D', 22), T.portasAbertasTabelaB1('H', 10)], [1, 2, 1, 2, 2]);

// 2) exemplo = Anexo F da NT 13
const res = motor.processar(motor.exemplo());
const k = res.calc;
perto('Anexo F: área de restrição 0,55 m²', k.v.areas.total, 0.55, 1e-6);
perto('Anexo F: QFT 3,22 m³/s', k.v.qft, 3.22, 0.002);
perto('Anexo F: APA 3,76 m²', k.v.apa, 3.76, 1e-6);
perto('Anexo F: VPA 0,86 m/s', k.v.vpa, 0.86, 0.006);
perto('Anexo F: QAT 3,76 m³/s', k.v.qat, 3.76, 1e-6);
perto('Anexo F: QTS = 3,76 × 1,4 = 5,26 m³/s', k.v.qts, 5.264, 1e-6);
perto('Anexo F: QFT a 60 Pa 3,52 m³/s', k.v.qftd, 3.52, 0.002);
perto('Anexo F: QD 1,74 m³/s', k.v.qd, 1.74, 0.002);
perto('área livre do damper = QD / (0,827·√60)', k.v.areaDamper, 1.7407 / (0.827 * Math.sqrt(60)), 0.001);
igual('Anexo F: 2 PCF abertas (1 de ingresso e a de saída)', [k.v.npa, k.v.abertas.map(i => k.v.portas[i].sentido).sort()], [2, ['acesso', 'saida']]);
igual('duto 0,75 × 0,75 m a 10 m/s de projeto e 10 grelhas', [k.d.largura, k.d.altura, k.d.nGrelhas], [0.75, 0.75, 10]);
perto('pressão estática estimada', k.d.pressao, 1.1 * (60 + 1.036 * 64 + 4 * 0.3 * 52.72 + 50 + 20 + 10), 0.003);
igual('motor de 5 cv', k.vent.cv, 5);
igual('escritório 54 m no DF: 2 ventiladores (reserva) e gerador', [k.arr.arranjo, k.arr.n, k.al.fonte], ['reserva_100', 2, 'gerador']);
igual('circuito do motor pela NBR 5410 (skill de elétrica): 2,5 mm²', k.al.circuitos.map(ci => ci.secao), [2.5, 2.5]);

// automação calibrada com o painel real da H&M (2 ventiladores, 1 transmissor por escada)
const qtdMat = (cod) => k.materiais.filter(m => m.codigo === cod).reduce((s, m) => s + m.quantidade, 0);
igual('automação: 1 controlador, 1 transmissor de ΔP, 2 pressostatos, 2 inversores', [qtdMat('CLP'), qtdMat('PT'), qtdMat('PDS'), qtdMat('INV')], [1, 1, 2, 2]);
igual('automação: E/S (ED 15 · SD 10 · EA 1 · SA 2)', k.aut.totais, { ED: 15, SD: 10, EA: 1, SA: 2 });
igual('lógica traz reversão e parada só manual', [k.aut.logica.some(t => /Reversão automática/.test(t)), k.aut.logica.some(t => /PARADA em emergência só/.test(t))], [true, true]);

// 3) residencial 30 m, duto de alvenaria, 9 acessos + 1 saída
const resid = motor.exemplo();
Object.assign(resid.edificacao, { ocupacao: 'A', altura_m: 30, pavimentos: 10 });
resid.escada.portas = [{ tipo: 'simples', sentido: 'acesso', quantidade: 9 }, { tipo: 'simples', sentido: 'saida', quantidade: 1 }];
resid.sistema.tipo_duto = 'alvenaria';
resid.sistema.comprimento_duto_m = null;
const rr = motor.processar(resid).calc;
perto('residencial: QFT = 0,827 × 0,31 × √50', rr.v.qft, 0.827 * 0.31 * Math.sqrt(50), 1e-6);
igual('residencial ≤ 80 m: 1 PCF aberta (a de saída)', [rr.v.npa, rr.v.portas[rr.v.abertas[0]].sentido], [1, 'saida']);
perto('residencial: QAT = (1,64 + 9 × 0,03) × 1 m/s', rr.v.qat, 1.91, 1e-6);
perto('residencial: QTS = 1,91 × 1,5 (alvenaria)', rr.v.qts, 2.865, 1e-6);
igual('residencial 30 m no DF: ventilador único admitido e sem gerador', [rr.arr.arranjo, rr.al.fonte], ['unico', 'antes_chave_geral']);

// 4) regras: PCF duplas primeiro, reunião de público, antecâmara, janela, soft-starter
const duplas = motor.exemplo();
duplas.escada.portas = [{ tipo: 'simples', sentido: 'acesso', quantidade: 10 }, { tipo: 'dupla', sentido: 'acesso', quantidade: 2 }, { tipo: 'simples', sentido: 'saida', quantidade: 1 }];
const rd = motor.processar(duplas).calc;
igual('PCF duplas ≥ PCF abertas → só duplas abertas (5.1.6.4 g)', rd.v.abertas.map(i => rd.v.portas[i].tipo), ['dupla', 'dupla']);
const reuniao = motor.exemplo();
Object.assign(reuniao.edificacao, { altura_m: 18, pavimentos: 6, local_reuniao_publico: true });
// 6 pavimentos: 5 PCF de acesso + 1 de saída (o exemplo tem 17 de acesso, que em 6 pavimentos
// dariam ≥ 3 acessos num pavimento e a Nota 5 do Anexo B multiplicaria a Tabela B1)
reuniao.escada.portas = [{ tipo: 'simples', sentido: 'acesso', quantidade: 5 }, { tipo: 'simples', sentido: 'saida', quantidade: 1 }];
igual('escritório 18 m com auditório: 1 + 1 PCF abertas', motor.processar(reuniao).calc.v.npa, 2);
const ante = motor.exemplo();
ante.escada.antecamara = true;
perto('antecâmara: 17 acessos em série + 1 saída', motor.processar(ante).calc.v.areas.portas, 17 * C.areaSerie([0.03, 0.03]) + 0.04, 1e-6);
const jan = motor.exemplo();
jan.escada.janelas = [{ descricao: 'Janela basculante', quantidade: 2, fresta_m2: 0.005 }];
perto('janela entra com N = 1,6', motor.processar(jan).calc.v.qft, 3.2163 + C.vazaoFresta(0.01, 50, 1.6), 0.001);
const soft = motor.exemplo();
soft.sistema.partida = 'soft_starter';
const rs = motor.processar(soft).calc;
igual('soft-starter com alívio pelo inversor → damper motorizado, sem SA', [rs.c.alivio, rs.aut.totais.SA, rs.materiais.some(m => m.codigo === 'SOFT')], ['damper_motorizado', 0, true]);

// 4b) achado A2.4 (revisão 27/10/2026) — Nota 5 do Anexo B: 2 PCF de acesso por pavimento.
//    Exemplo do Anexo F com 34 PCF de acesso (2 por pavimento-tipo) + 1 de saída:
//    NPA = 2 (Tabela B1, escritório > 21 m) × 2 = 4 (antes: 2).
//    Abertas: a de saída (vão 1,64) + 3 de acesso (3 × 1,64) = 6,56 m²; frestas das 31
//    de acesso fechadas = 31 × 0,03 = 0,93 m² → APA = 7,49 m²; QAT = 7,49 m³/s;
//    QTS = 7,49 × 1,4 = 10,486 m³/s. Antes (NPA 2): APA = 2 × 1,64 + 33 × 0,03 = 4,27 m²,
//    QAT 4,27 < QFT = 0,827 × 1,06 × √50 = 6,20 → QT = QFT → QTS 8,68 m³/s (−17 %).
const nota5 = motor.exemplo();
nota5.escada.portas = [{ tipo: 'simples', sentido: 'acesso', quantidade: 34 }, { tipo: 'simples', sentido: 'saida', quantidade: 1 }];
const r5 = motor.processar(nota5).calc;
igual('Nota 5: 34 acessos em 18 pavimentos → 2 por pavimento → NPA 2 × 2 = 4', [r5.v.acessosPorPavimento, r5.v.npa], [2, 4]);
perto('Nota 5: APA = 4 × 1,64 + 31 × 0,03 = 7,49 m²', r5.v.apa, 7.49, 1e-6);
perto('Nota 5: QTS = 7,49 × 1,4 = 10,486 m³/s', r5.v.qts, 10.486, 1e-6);
igual('Nota 5: aviso pede o dado informado (deduzido)', r5.avisos.some(a => /Nota 5/.test(a) && /CONFERIR/.test(a)), true);
const nota5i = motor.exemplo();
nota5i.escada.acessos_por_pavimento = 3;
igual('Nota 5 informada: 3 acessos no pior pavimento → NPA 6', motor.processar(nota5i).calc.v.npa, 6);
igual('exemplo do Anexo F continua com 1 acesso por pavimento (17 em 18) → NPA 2', [k.v.acessosPorPavimento, k.v.npa, k.bloqueios], [1, 2, []]);

// 4c) achado A2.3 — valores editados fora da norma bloqueiam o memorial
const fora = motor.exemplo();
Object.assign(fora.sistema, { pressao_projeto_pa: 40, pressao_max_pa: 80, velocidade_porta_ms: 0.8 });
const rf = motor.processar(fora);
igual('ΔP 40 Pa, máx. 80 Pa e 0,8 m/s → 3 bloqueios', rf.calc.bloqueios.length, 3);
igual('… avisos BLOQUEANTE no topo', rf.calc.avisos.slice(0, 3).every(a => a.startsWith('BLOQUEANTE')), true);
igual('… memorial fora dos documentos disponíveis', motor.tiposDisponiveis(rf).includes('memorial'), false);
igual('… laudo continua disponível', motor.tiposDisponiveis(rf).includes('laudo'), true);
const forcadas = motor.exemplo();
forcadas.escada.portas_abertas = 0;
igual('PCF abertas forçadas 0 < 2 da Tabela B1 → bloqueio', motor.processar(forcadas).calc.bloqueios.some(b => /PCF abertas/.test(b)), true);

// 4d) achado A2.4 (MÉDIO) — altura vazia vira bloqueio; força padrão com aviso
const semAltura = motor.exemplo();
delete semAltura.edificacao.altura_m;
semAltura.edificacao.pavimentos = 7;
const rsa = motor.processar(semAltura).calc;
igual('altura vazia: estimada 7 × 3 = 21 m, mas bloqueia o memorial', [rsa.c.altura, rsa.c.alturaEstimada, rsa.bloqueios.some(b => /Altura da edificação não informada/.test(b))], [21, true, true]);
const semLimite = motor.exemplo();
semLimite.sistema.limite_forca_n = null;
const rsl = motor.processar(semLimite).calc;
igual('limite de força vazio: 133 N com aviso de escolha explícita', [rsl.c.limiteForca, rsl.c.limiteForcaPadrao, rsl.avisos.some(a => /força de abertura não informado/.test(a))], [133, true, true]);
igual('modelo vazio não traz limite de força pré-escolhido', motor.modeloVazio().sistema.limite_forca_n, null);
const ante90 = motor.exemplo();
Object.assign(ante90.edificacao, { altura_m: 90, pavimentos: 30 });
igual('90 m exatos: aviso de antecâmara (Nota 2 do Anexo B: igual ou superior)', motor.processar(ante90).calc.avisos.some(a => /antecâmara de segurança/.test(a)), true);

// 5) inspeção
igual('ΔP 61 Pa no térreo → NC; 47 Pa → C', [res.med.pressoes[0].resultado, res.med.pressoes[3].resultado], ['NC', 'C']);
igual('velocidade 0,92 m/s → NC', res.med.velocidades[1].resultado, 'NC');
igual('checklist P1 e P2 viram NC pelas medições', ['P1', 'P2'].map(cd => res.checklist.find(x => x.cod === cd).situacao), ['NC', 'NC']);
igual('parecer não conforme preliminar', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');
// achado A2.3: projeto editado para 40/80 Pa e 0,8 m/s, medições 75 e 37 Pa e 0,9 m/s.
// Antes: critério 36–80 Pa e ≥ 0,8 m/s → tudo C. Agora o laudo usa a norma:
// 0,9 × máx(40, 50) = 45 Pa a 60 Pa e ≥ 1 m/s → 75 Pa NC, 37 Pa NC, 0,9 m/s NC.
const ed = motor.exemplo();
Object.assign(ed.sistema, { pressao_projeto_pa: 40, pressao_max_pa: 80, velocidade_porta_ms: 0.8, limite_forca_n: 200 });
ed.inspecao.pressoes = [{ pavimento: 'Térreo', dp_pa: 75 }, { pavimento: '18', dp_pa: 37 }];
ed.inspecao.velocidades = [{ porta: 'PCF 1', media_ms: 0.9, pontos: 12 }];
ed.inspecao.forcas = [{ porta: 'PCF 1', forca_n: 150 }];
const red = motor.processar(ed);
igual('laudo com projeto editado: ΔP 75 e 37 Pa → NC (critério 45–60 Pa)', red.med.pressoes.map(m => [m.criterio, m.resultado]), [['45 a 60 Pa', 'NC'], ['45 a 60 Pa', 'NC']]);
igual('laudo com projeto editado: 0,9 m/s → NC (≥ 1 m/s)', red.med.velocidades[0].resultado, 'NC');
igual('laudo: limite de força 200 N informado não passa de 133 N → 150 N NC', red.med.forcas[0].resultado, 'NC');
const ex = motor.exemplo();
ex.existente = { vazao_m3h: 15000, pressao_pa: 250, potencia_cv: 4, quantidade: 1 };
const rex = motor.processar(ex).calc.existente;
igual('ventilador existente abaixo da vazão e da pressão', [rex.atendeVazao, rex.atendePressao, rex.atendePotencia], [false, false, false]);

// 6) códigos de mão de obra registrados na base padrão do sistema
const ref = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'backend', 'src', 'services', 'precosMaoDeObraReferencia.js'), 'utf8');
const registrados = new Set([...ref.matchAll(/codigo: '(pres_[a-z_]+)'/g)].map(m => m[1]));

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  const usados = new Set();
  for (const modo of motor.modosOrcamento.map(m => m.modo)) {
    const o = motor.montarOrcamento(res, modo);
    o.itens.filter(i => i.codigo).forEach(i => usados.add(i.codigo));
    igual(`orçamento ${modo} sem quantidade zero`, o.itens.every(i => i.quantidade > 0), true);
  }
  igual('orçamento de instalação com ventiladores e projeto', ['pres_ventilador', 'pres_projeto', 'pres_comissionamento'].every(cd => usados.has(cd)), true);
  igual('todos os códigos pres_ do orçamento estão na base padrão', [...usados].filter(cd => !registrados.has(cd)), []);
  fim();
})();
