// Ponte "Análise de Projeto (PDF) → formulário da skill da disciplina".
// Pega o que a leitura do PDF achou (ambientes com área, câmeras por ambiente,
// pontos de rede, quadro de cargas, carimbo) e preenche os dados de entrada do
// cálculo normativo da skill (skills/<disciplina>). Tudo que é ESTIMADO — e não
// lido do projeto — vai listado em `avisos` com [CONFERIR], para o projetista
// revisar no formulário antes de gerar documentos e orçamento.

const sqrt = (a) => Math.round(Math.sqrt(a) * 10) / 10;
const hoje = () => new Date().toISOString().slice(0, 10);

function base(motor, analise, extraido) {
  const vazio = typeof motor.modeloVazio === 'function' ? motor.modeloVazio() : motor.modeloVazio;
  const dados = JSON.parse(JSON.stringify(vazio));
  const cb = extraido.find(e => e.carimbo)?.carimbo || {};
  dados.meta = { ...dados.meta, titulo: analise.nomeProjeto || analise.cliente || 'Projeto', data: hoje(), revisao: cb.revisao ? `R${String(cb.revisao).replace(/^R/i, '')}` : dados.meta?.revisao };
  dados.cliente = { ...dados.cliente, nome: analise.cliente || '' };
  dados.obra = { ...dados.obra, nome: analise.nomeProjeto || analise.cliente || '' };
  return dados;
}

// ── Elétrica (NBR 5410) ──────────────────────────────────────────────────
const TIPO_AMBIENTE = [
  [/DORM|QUARTO|SU[ÍI]TE/i, 'dormitorio'], [/COZINHA|COPA/i, 'cozinha'], [/SERVI[ÇC]O|LAVANDERIA|DML/i, 'area_servico'],
  [/BANH|WC|SANIT|LAVABO|VESTI[ÁA]RIO/i, 'banheiro'], [/VARANDA|SACADA/i, 'varanda'], [/GARAGEM|ESTACION/i, 'garagem'],
  [/EXTERN|JARDIM|P[ÁA]TIO/i, 'externa'], [/^SALA DE ESTAR|^SALA$|^ESTAR/i, 'sala'],
];
const tipoAmbiente = (nome) => (TIPO_AMBIENTE.find(([re]) => re.test(nome)) || [null, 'outros'])[1];

function tipoCircuito(c) {
  if (/^IL|ILUMINA/i.test(`${c.circuito} ${c.descricao}`)) return 'iluminacao';
  if (/AR[- ]?COND|SPLIT|CHUVEIRO|BOMBA|MOTOR|FORNO|AQUECEDOR|ELEVADOR|TUE/i.test(`${c.circuito} ${c.descricao}`)) return 'tue';
  return 'tug';
}

function eletrica(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  dados.ambientes = (analise.ambientes || []).filter(a => a.area_m2 > 0).map(a => ({
    nome: a.nome, tipo: tipoAmbiente(a.nome), area_m2: a.area_m2, perimetro_m: Math.round(4 * Math.sqrt(a.area_m2) * 10) / 10, tugs_adicionais: 0, iluminacao_va: null,
  }));
  if (dados.ambientes.length) avisos.push(`[CONFERIR] ${dados.ambientes.length} ambientes com área lida do projeto; perímetro estimado como de um quadrado (4·√área) e tipo do ambiente deduzido pelo nome.`);

  const quadros = extraido.filter(e => e.quadroCargas?.length);
  const circuitos = quadros.flatMap(e => e.quadroCargas);
  if (circuitos.length) {
    dados.circuitos = circuitos.map(c => ({
      id: c.circuito, descricao: c.descricao, tipo: tipoCircuito(c),
      ligacao: c.fases.length >= 3 ? 'FFF' : c.fases.length === 2 ? 'FF' : 'FN',
      potencia_va: Math.round(c.potencia_W / (c.fp || 1)), comprimento_m: null, agrupamento: null, ambientes: '',
    }));
    avisos.push(`${circuitos.length} circuitos lidos do quadro de cargas (potência e ligação do projeto). [CONFERIR] comprimentos: o PDF não traz — o cálculo usa o comprimento médio do formulário até você informar.`);
    const t = quadros[0].totaisQuadro;
    const tensoes = new Set(circuitos.map(c => c.tensao_V));
    if (t?.fases === 'ABC' || circuitos.some(c => c.fases.length === 3)) dados.instalacao.sistema = 'trifasico';
    if (tensoes.has(220) && (t?.corrente_A && /ABC/.test(t.fases || ''))) { dados.instalacao.tensao_fn = 220; dados.instalacao.tensao_ff = 380; }
    // Fator de demanda DO PROJETO (total demandado ÷ instalado, ou média dos
    // circuitos): sem isso a skill aplica fatores residenciais típicos — numa
    // escola real deu 5,9 kVA contra 17 kW do projeto.
    const instalado = circuitos.reduce((s, c) => s + c.potencia_W, 0);
    const fdProjeto = t?.demandada_W && t?.instalada_W ? t.demandada_W / t.instalada_W
      : instalado ? circuitos.reduce((s, c) => s + c.potencia_W * (c.fd || 1), 0) / instalado : null;
    if (fdProjeto && fdProjeto > 0 && fdProjeto <= 1) {
      const fator = Math.round(fdProjeto * 100) / 100;
      dados.instalacao.fd_ilum_tug = [{ ate_kw: null, fator }];
      dados.instalacao.fd_tue = [{ ate_qtd: null, fator }];
      avisos.push(`Fator de demanda ${String(fator).replace('.', ',')} do próprio quadro de cargas (no lugar dos fatores residenciais típicos).`);
    }
    if (t?.disjuntor_geral_A) avisos.push(`Quadro de cargas do projeto: disjuntor geral ${t.disjuntor_geral_A} A, alimentador ${t.alimentador_mm2} mm², demanda ${t.demandada_W} W — compare com o resultado do cálculo.`);
  }
  return dados;
}

// ── CFTV ─────────────────────────────────────────────────────────────────
function cftv(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const porAmbiente = (analise.pontosPorAmbiente || []).filter(p => p.cftv > 0);
  const total = analise.cameras?.total || 0;
  const linha = (local, qtd, n) => ({
    id: `CAM${n}`, local, tipo: /EXTERN|FACHADA|ESTACION|P[ÁA]TIO|PORT[ÃA]O|PER[ÍI]METRO|ACESSO/i.test(local) ? 'bullet' : 'dome',
    quantidade: qtd, resolucao_mp: '4', hfov_graus: 90, objetivo: 'observacao', distancia_alvo_m: 10, distancia_cabo_m: 30,
    externa: /EXTERN|FACHADA|ESTACION|P[ÁA]TIO|PORT[ÃA]O|PER[ÍI]METRO/i.test(local), modelo: '',
  });
  const somaAmb = porAmbiente.reduce((s, p) => s + p.cftv, 0);
  dados.cameras = porAmbiente.map((p, i) => linha(p.ambiente, p.cftv, i + 1));
  if (total > somaAmb) dados.cameras.push(linha('Sem ambiente identificado', total - somaAmb, dados.cameras.length + 1));
  if (dados.cameras.length) {
    avisos.push(`${total} câmeras do projeto distribuídas por ${porAmbiente.length} ambientes (proximidade do rótulo, aproximado).`);
    avisos.push('[CONFERIR] resolução 4 MP, abertura 90°, objetivo "observação", alvo a 10 m e cabo de 30 m são valores típicos — o PDF não traz lente nem campo de visão. Dome/bullet e interna/externa deduzidos pelo nome do ambiente.');
  }
  return dados;
}

// ── Cabeamento estruturado (NBR 14565) ───────────────────────────────────
function cabeamento(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const pontos = analise.pontosRedeAntena?.rede?.total || 0;
  const area = (analise.ambientes || []).reduce((s, a) => s + (a.area_m2 || 0), 0);
  dados.pavimentos = [{
    nome: 'Pavimento do projeto', area_util_m2: 0, distancia_media_m: 30, distancia_max_m: 60, aps: 0, pontos_extra: pontos,
  }];
  avisos.push(`${pontos} pontos de rede do projeto entram como pontos do pavimento (a área ficou 0 para o cálculo não somar tomadas por área de trabalho em cima da contagem real; área útil lida: ${Math.round(area)} m²).`);
  avisos.push('[CONFERIR] distâncias média (30 m) e máxima (60 m) do distribuidor, número de pavimentos e de access points — não vêm do PDF.');
  return dados;
}

// ── Detecção e alarme de incêndio (NBR 17240) ────────────────────────────
function incendio(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = (analise.ambientes || []).filter(a => a.area_m2 > 0);
  dados.ambientes = amb.map(a => ({
    nome: a.nome, pavimento: 'Térreo', comprimento_m: sqrt(a.area_m2), largura_m: sqrt(a.area_m2), pe_direito_m: 3,
    detector: /BANH|WC|SANIT|COZINHA|COPA|CALDEIRA|GARAGEM/i.test(a.nome) ? 'temperatura' : 'fumaca', altura_viga_m: null,
    rota_fuga: /CORREDOR|CIRCULA|HALL|ESCADA|RAMPA|PATAMAR|ANTECÂMARA|ANTECAMARA/i.test(a.nome), escada: /ESCADA/i.test(a.nome),
    saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null,
  }));
  const areaTotal = amb.reduce((s, a) => s + a.area_m2, 0);
  dados.pavimentos = [{ nome: 'Térreo', area_m2: Math.round(areaTotal), maior_caminhamento_m: Math.round(Math.sqrt(areaTotal) * 1.5), saidas_emergencia: 1 }];
  if (amb.length) {
    avisos.push(`${amb.length} ambientes com área lida do projeto.`);
    avisos.push('[CONFERIR] comprimento × largura estimados como quadrado (√área), pé-direito 3 m, um único pavimento, maior caminhamento ≈ 1,5·√área e 1 saída — o PDF de planta não traz esses dados. Detector de temperatura em banheiros/cozinhas e rota de fuga em circulações deduzidos pelo nome.');
  }
  return dados;
}

// ── Alarme de intrusão ──
function alarme(motor, analise, extraido, avisos) {
  const dados = base(motor, analise, extraido);
  const amb = (analise.ambientes || []).filter(a => a.area_m2 > 0);
  dados.ambientes = amb.map((a, i) => ({
    nome: a.nome, particao: 1, area_m2: a.area_m2, maior_dimensao_m: Math.round(Math.sqrt(a.area_m2) * 1.3 * 10) / 10,
    portas: 1, janelas: /BANH|WC|CIRCULA|CORREDOR|HALL|DEP[ÓO]SITO/i.test(a.nome) ? 0 : 1, janelas_acessiveis: true,
    pe_direito_m: 2.8, externo: false, animais: false, risco: 'normal', acesso_principal: i === 0,
  }));
  const esq = extraido.flatMap(e => e.esquadrias || []);
  if (amb.length) {
    avisos.push(`${amb.length} ambientes com área lida do projeto.`);
    avisos.push(`[CONFERIR] 1 porta e 1 janela por ambiente (sem janela em banheiros/circulações), maior dimensão ≈ 1,3·√área, pé-direito 2,8 m e acesso principal no primeiro ambiente — ajuste no formulário${esq.length ? `; a legenda de esquadrias do projeto traz ${esq.reduce((s, e) => s + e.quantidade, 0)} portas/janelas no total` : ''}.`);
  }
  return dados;
}

// Disciplinas com skill mas sem dados de planta aproveitáveis ainda: só
// identificação (cliente, obra, revisão) — o resto é preenchido no formulário.
function soIdentificacao(motor, analise, extraido, avisos) {
  avisos.push('Só a identificação (cliente, obra, revisão) veio da análise — os dados técnicos desta disciplina são preenchidos no formulário.');
  return base(motor, analise, extraido);
}

const MAPEADORES = { eletrica, cftv, cabeamento, incendio, alarme, spda: soIdentificacao, solar: soIdentificacao, carregador: soIdentificacao, automacao: soIdentificacao };

// `disciplinaSkill`: chave da skill (disciplinasLaudo). Devolve { dados, avisos }.
function dadosDaAnalise(disciplinaSkill, motor, analise) {
  const avisos = [];
  const extraido = (analise.dadosExtraidos || []).filter(e => !e.semTexto);
  const mapear = MAPEADORES[disciplinaSkill] || soIdentificacao;
  const dados = mapear(motor, analise, extraido, avisos);
  return { dados, avisos };
}

module.exports = { dadosDaAnalise, tipoAmbiente };
