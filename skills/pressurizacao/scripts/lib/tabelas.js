// Tabelas e premissas da disciplina PRESSURIZAÇÃO DE ESCADAS (controle de
// fumaça por pressurização da escada de segurança).
//
// Fontes conferidas no texto (27/10/2026):
//  - CBMDF, Norma Técnica nº 10/2015 — Saídas de Emergência (Portaria nº 02/2015-CBMDF,
//    DODF nº 14 de 19/01/2015), item 4.3.1.10 (escada PFP). Remete à ABNT NBR 14880
//    para "método de pressurização, cálculo do suprimento de ar, detalhe construtivo,
//    instalação, materiais e componentes" (4.3.1.10.6). [CONFERIR se há revisão mais nova da NT 10]
//  - CBMGO, Norma Técnica 13/2025 — Pressurização de escada de segurança (Portaria nº 3447,
//    de 19/05/2025): método de cálculo (Equações 1 a 5, Tabelas A1, A2 e B1, Anexo F com o
//    exemplo resolvido). O texto segue a IT 13 do CBPMESP (referência complementar pedida);
//    o texto oficial da IT 13/2019 do CBPMESP não foi aberto — [CONFERIR IT 13 CBPMESP].
//  - ABNT NBR 14880:2014 — norma paga, NÃO lida. Os valores abaixo são os que as normas
//    dos bombeiros atribuem a ela (ex.: limite de 60 Pa, CBMDF NT 10 4.3.1.10.2 r).
//    Tudo que não foi conferido num texto oficial está marcado [CONFERIR].

// ── Níveis de pressurização (NT 13/2025 CBMGO, 5.1.5 e Tabela A1) ─────────
// Sistema de 1 estágio: 50 Pa; 2 estágios: 15 Pa contínuo + 50 Pa em emergência.
// Máximo de 60 Pa com todas as PCF fechadas (NT 13 GO 5.1.5.1; CBMDF NT 10, 4.3.1.10.2 r).
const PRESSAO = {
  projeto_pa: 50,
  primeiro_estagio_pa: 15,
  maxima_pa: 60,
  antecamara_independente_pa: 45, // NT 13 GO 5.1.6.7 d II (escada 50 Pa, antecâmara 45 Pa)
  minimo_medido_fracao: 0.9, // medido ≥ 90 % do projetado e ≤ 60 Pa (NT 13 GO 5.5.3 d)
};

// ── Velocidades (NT 13 GO) ─────────────────────────────────────────────────
const VELOCIDADE = {
  porta_aberta_ms: 1.0, // 5.1.6.4 c — mínima saindo pelas PCF abertas
  abertura_permanente_ms: 4.0, // 5.1.6.4 b — janela/abertura permanente na caixa da escada
  captacao_max_ms: 8, // 5.1.5.3 c — trecho de captação
  distribuicao_metalico_max_ms: 15, // 5.1.5.3 c — duto de chapa
  distribuicao_alvenaria_max_ms: 10, // 5.1.5.3 c — duto de alvenaria/gesso acartonado
  escape_pavimento_max_ms: 2.5, // 5.3.11.1 I b — grelhas de escape nos pavimentos
};
// Velocidade de projeto adotada (critério H&M, abaixo dos limites da NT para ruído ≤ 85 dB(A), 5.3.6 e)
const VELOCIDADE_PROJETO = { metalico: 10, alvenaria: 8, captacao: 6, grelha_face: 2.5 };

// ── Equação 1 (NT 13 GO 5.1.6.1): Q = 0,827 · A · ΔP^(1/N) ────────────────
// N = 2 para frestas de PCF; N = 1,6 para frestas estreitas (janelas). Ar padrão 1,204 kg/m³.
const COEF_VAZAO = 0.827;
const N_PORTA = 2;
const N_JANELA = 1.6;
const DENSIDADE_PADRAO = 1.204;

// ── Tabela A2 (NT 13 GO): áreas típicas de escape (PCF 2,10 × 0,89 m) ────
// aberta = vão de luz; fechada = frestas. Demais tipos: verificar com o fabricante.
const PORTAS = {
  simples: { rotulo: 'PCF simples (2,10 × 0,89 m)', aberta_m2: 1.64, fechada: { acesso: 0.03, saida: 0.04 }, folhas: 1 },
  dupla: { rotulo: 'PCF dupla (2 × 2,10 × 0,89 m)', aberta_m2: 3.28, fechada: { acesso: 0.045, saida: 0.06 }, folhas: 2 },
};
const FRESTA_ELEVADOR_M2 = 0.06; // porta do elevador de segurança 2,10 × 0,80 m (Tabela A2)

// ── Tabela B1 (NT 13 GO, Anexo B): nº de PCF consideradas abertas ─────────
// Grupo A (residencial): até 80 m → 1, acima → 2; grupo D (serviço profissional):
// até 21 m → 1, acima → 2; demais grupos: 2 em qualquer altura.
const OCUPACOES = {
  A: 'A — Residencial', B: 'B — Serviços de hospedagem', C: 'C — Comercial', D: 'D — Serviço profissional (escritórios)',
  E: 'E — Educacional e cultura física', F: 'F — Local de reunião de público', G: 'G — Serviço automotivo',
  H: 'H — Serviço de saúde e institucional', I: 'I — Indústria', J: 'J — Depósito', L: 'L — Explosivos', M: 'M — Especiais',
};
function portasAbertasTabelaB1(grupo, alturaM) {
  if (grupo === 'A') return alturaM > 80 ? 2 : 1;
  if (grupo === 'D') return alturaM > 21 ? 2 : 1;
  return 2;
}

// ── Fatores de vazamento (NT 13 GO 5.1.6.6, Equação 5) ────────────────────
// dutos metálicos +15 %, alvenaria ou mistos +25 %; não identificados +25 %
// → QTS = QT × 1,4 (metálico) ou × 1,5 (alvenaria/misto)
const FATOR_DUTO = { metalico: 0.15, alvenaria: 0.25, misto: 0.25 };
const FATOR_NAO_IDENTIFICADO = 0.25;
const ROTULO_DUTO = { metalico: 'metálico', alvenaria: 'de alvenaria', misto: 'misto' };

// ── CBMDF NT 10/2015, 4.3.1.10.2 p/q e 4.3.1.10.3 c ───────────────────────
// Grupo motogerador com autonomia de 4 h; isentos: residencial ≤ 60 m, serviço
// profissional ≤ 21 m e escolar ≤ 30 m (então o circuito sai antes da chave geral).
// Ventilador em duplicata (operante + reserva); pode ser único em residencial ≤ 60 m,
// serviço profissional ≤ 45 m e escolar ≤ 9 m. (NT 13 GO exige duplicata sempre, 5.3.2 b.)
const DF = {
  gerador_autonomia_h: 4,
  isencao_gerador_m: { A: 60, D: 21, E: 30 },
  ventilador_unico_ate_m: { A: 60, D: 45, E: 9 },
  cabos_fogo_h: 2, // 4.3.1.10.2 l
  pfa_max_m: 45, // 4.3.1.9.5 — escada PFA não permitida acima de 45 m
};
// NT 13 GO: antecâmara de segurança obrigatória acima de 90 m (5.1.6.7 a)
const ANTECAMARA_OBRIGATORIA_M = 90;
// NT 13 GO 5.3.7 a: no máximo 2 pavimentos entre grelhas, com grelha no térreo e no último
const MAX_PAVIMENTOS_ENTRE_GRELHAS = 2;
// NT 13 GO 5.3.10 q: fechamento das PCF com destravador eletromagnético em até 30 s
const TEMPO_FECHAMENTO_PCF_S = 30;

// ── Força de abertura da porta ────────────────────────────────────────────
// F = Fdc + W·A·ΔP / (2·(W − d))  (ASHRAE/SFPE Handbook of Smoke Control Engineering; NFPA 92)
// Limite: 133 N (NFPA 101 7.2.1.4.5 / NFPA 92 — "30 lbf" para pôr a porta em movimento);
// a EN 12101-6 usa 100 N. A NBR 14880:2014 não foi lida — [CONFERIR limite na NBR 14880/NBR 11742].
const FORCA = { limite_n: 133, fechador_n: 40, distancia_macaneta_m: 0.06 };

// ── Tempo de partida ──────────────────────────────────────────────────────
// A NT 13 GO (5.3.10 k) exige acionamento imediato, sem esperar o alarme sonoro, mas não
// fixa segundos. Adotado 60 s até a pressão de projeto (referência EN 12101-6) [CONFERIR].
const TEMPO_PARTIDA_MAX_S = 60;
// Reversão para o ventilador reserva: o pressostato de fluxo deve confirmar em até
// este tempo (ajuste do temporizador; mesmo princípio do painel H&M de 2026) [CONFERIR]
const TEMPO_REVERSAO_S = 15;

// ── Perdas de carga (estimativa simplificada e declarada) ─────────────────
// Atrito: Darcy-Weisbach com fator de Altshul-Tsal (ASHRAE Fundamentals, cap. 21):
//   f' = 0,11·(ε/Dh + 68/Re)^0,25; f = f' se f' ≥ 0,018, senão 0,85·f' + 0,0028; Re = 66 400·Dh·V
// Rugosidade ε: chapa galvanizada 0,09 mm; alvenaria rebocada ~1,5 mm [CONFERIR]
const RUGOSIDADE_M = { metalico: 0.00009, alvenaria: 0.0015, misto: 0.0015 };
// Perdas localizadas típicas (Pa) — substituir pelas curvas dos fabricantes [CONFERIR]
const PERDAS_PADRAO = {
  tomada_ar_pa: 50, // veneziana + filtro metálico lavável (NBR 16401-3) sujo
  grelha_pa: 20, // grelha de insuflação com registro
  registro_pa: 10, // registro de regulagem / retenção na descarga
  k_curva: 0.3, // curva de raio longo (× pressão dinâmica)
  efeito_sistema: 0.10, // "efeito do sistema" (AMCA 201) — acréscimo sobre as perdas
};
const RENDIMENTO_VENTILADOR = 0.6; // estático, típico de centrífugo/axial de pressurização [CONFERIR catálogo]
const FOLGA_MOTOR = 1.15;

// Potências comerciais de motor (cv) e η/FP típicos IR3 4 polos 380 V [CONFERIR placa]
const MOTORES_CV = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150];
function rendimentoFpMotor(cv) {
  if (cv <= 1.5) return { eta: 0.8, fp: 0.78 };
  if (cv <= 5) return { eta: 0.86, fp: 0.82 };
  if (cv <= 15) return { eta: 0.89, fp: 0.84 };
  if (cv <= 50) return { eta: 0.92, fp: 0.86 };
  return { eta: 0.94, fp: 0.87 };
}

const PARTIDAS = {
  inversor: 'Inversor de frequência (controle de pressão por PID)',
  soft_starter: 'Soft-starter (vazão fixa, alívio pelo damper)',
  direta: 'Partida direta (vazão fixa, alívio pelo damper)',
  estrela_triangulo: 'Estrela-triângulo (vazão fixa, alívio pelo damper)',
};
const PARTIDAS_CURTO = { inversor: 'inversor de frequência', soft_starter: 'soft-starter', direta: 'partida direta', estrela_triangulo: 'partida estrela-triângulo' };
const ALIVIOS = {
  inversor: 'Modulação do inversor por transmissor de ΔP (sem damper)',
  inversor_e_gravidade: 'Inversor com PID + damper de sobrepressão por gravidade (reserva)',
  damper_motorizado: 'Damper de alívio motorizado comandado pelo transmissor de ΔP',
  damper_gravidade: 'Damper (registro) de sobrepressão por gravidade/contrapeso',
};
const SENSORES = {
  meio: 'Um transmissor de ΔP no meio da altura da escada',
  topo_base: 'Dois transmissores de ΔP (próximo ao topo e à base)',
  por_pavimento: 'Um transmissor de ΔP por pavimento (monitoramento completo)',
};
const ARRANJOS = {
  auto: 'Automático pela norma (CBMDF NT 10, 4.3.1.10.3 c)',
  reserva_100: '2 ventiladores de 100 % (operante + reserva, reversão automática)',
  paralelo_50: '2 ventiladores de 50 % da vazão e 100 % da pressão, em paralelo, com registros de retenção',
  unico: '1 ventilador (só onde a norma dispensa a duplicata)',
};

module.exports = {
  PRESSAO, VELOCIDADE, VELOCIDADE_PROJETO, COEF_VAZAO, N_PORTA, N_JANELA, DENSIDADE_PADRAO, PORTAS, FRESTA_ELEVADOR_M2,
  OCUPACOES, portasAbertasTabelaB1, FATOR_DUTO, FATOR_NAO_IDENTIFICADO, ROTULO_DUTO, DF, ANTECAMARA_OBRIGATORIA_M,
  MAX_PAVIMENTOS_ENTRE_GRELHAS, TEMPO_FECHAMENTO_PCF_S, FORCA, TEMPO_PARTIDA_MAX_S, TEMPO_REVERSAO_S, RUGOSIDADE_M,
  PERDAS_PADRAO, RENDIMENTO_VENTILADOR, FOLGA_MOTOR, MOTORES_CV, rendimentoFpMotor, PARTIDAS, PARTIDAS_CURTO, ALIVIOS, SENSORES, ARRANJOS,
};
