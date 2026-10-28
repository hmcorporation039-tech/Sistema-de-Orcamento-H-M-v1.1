// Pontos de uma ou mais disciplinas a partir SÓ da arquitetura (DWG/DXF), para
// o modelo 3D ilustrativo (./modelo3d.js): monta um formulário ESTIMADO da skill
// (ambientes com área/perímetro reais, tipo pelo nome), roda o cálculo normativo
// da própria skill e posiciona os pontos pelas mesmas regras da planta DXF
// (./plantasDisciplina.js + ./planta.js). Com o formulário real do projeto
// (`dados`), usa-o no lugar da estimativa — o 3D mostra o que foi orçado.
// Tudo que é estimado volta em `avisos` com [CONFERIR].
const path = require('path');
const { PLANTAS } = require('./plantasDisciplina');
const { posicionarPontos } = require('./planta');

// nome aceito na linha de comando → pasta da skill
const DISCIPLINAS = {
  cftv: 'cftv', rede: 'cabeamento', cabeamento: 'cabeamento', eletrica: 'eletrica', iluminacao: 'iluminacao',
  incendio: 'incendio', alarme: 'alarme', 'controle-acesso': 'controle-acesso', controle_acesso: 'controle-acesso',
};

// ambiente que não é sala (nota, vazio, projeção, cota de quadro…) — fora do modelo
const RE_NAO_AMBIENTE = /^(VAZIO|PROJE[ÇC][ÃA]O|COBERTURA|FAZER|PREVER|MOVER|COMO SER|DIMENS|CONSTRUIR|DEMOLIR|LIMITE|PROJ\b|PROJ\.|ESQUADRIA|GUARDA|HDMI|CORRER|DESCRIPTION|REF\b|REF\.|PILAR|HIDRANTE|EXTINTOR|PORTA|JANELA|VIGA|LAJE|DEGRAU|TUBO|MEDIDA|COTA|NOTA|OBS)|\d+\s*X\s*\d+|\bVA\b|\bMM\b|\bH\s*=|\d+\s*A\s*-\s*\d+|^-|%%/i;
const ehAmbienteValido = (a) => a.area_m2 >= 0.8 && a.area_m2 <= 2500 && !RE_NAO_AMBIENTE.test(a.nome);

const TIPOS_AMBIENTE = [
  ['externo', /JARDIM|VARANDA|SACADA|TERRA[ÇC]O|QUINTAL|P[ÁA]TIO|BOSQUE|EMBARQUE|CAL[ÇC]ADA|PISCINA|DECK|P[ÉE]RGOLA|[ÁA]REA EXTERNA|ESTACIONAMENTO|HELIPONTO|BACIA/i],
  ['garagem', /GARAGEM|\bVAGAS?\b/i],
  ['molhado', /BANH|\bW\.?\s?C\b|SANIT|\bSAN\b|LAVABO|VESTI[ÁA]RIO|\bVEST\b|COZINHA|COPA|SERVI[ÇC]O|LAVANDERIA|\bDML\b|CHUVEIRO/i],
  ['intimo', /DORM|QUARTO|SU[ÍI]TE|CLOSET/i],
  ['circulacao', /CIRCULA|CORREDOR|HALL|ESCADA|\bELEV|RAMPA|ANTEC|PASSAG|FOYER|ACESSO/i],
  ['tecnico', /T[ÉE]CNIC|SHAFT|DEP[ÓO]SITO|ALMOX|M[ÁA]QUINA|^AC$|QUADRO|RACK|VENTILA|LIXO|\bG[ÁA]S\b|\bCPD\b|NICHO|GERADOR|SUBESTA|\bDG\b|CABINE|HIDR[ÔO]METRO/i],
  ['social', /ESTAR|JANTAR|LIVING|RECEP|ESPERA|CONV[ÍI]VIO|AUDIT|RESTAURANTE|CAF[ÉE]|LOUNGE|ESPA[ÇC]O COMUM|SAL[ÃA]O|REFEIT/i],
  ['trabalho', /ESCRIT|SALA|REUNI|CONSULT|LABORAT|AULA|COWORK|EMPRESA|ADMINISTR|ATENDIMENTO|ESTUDO|OFICINA|BIBLIOT|DIRETORIA|GER[ÊE]NCIA|POSTO|ESPA[ÇC]O/i],
];
const tipoDoAmbiente = (nome) => (TIPOS_AMBIENTE.find(([, re]) => re.test(nome)) || ['outros'])[0];

// nomes repetidos ("ELEV" × 5) viram únicos numa CÓPIA da arquitetura — a
// planta casa ambiente por nome e poria os pontos de todos no primeiro
const SUFIXO = ' Q7X';
function arquiteturaComNomesUnicos(arquitetura, filtro = () => true) {
  const vistos = {};
  const ambientes = arquitetura.ambientes.filter(filtro).map(a => {
    const k = (vistos[a.nome] = (vistos[a.nome] || 0) + 1);
    return { ...a, nome: k > 1 ? `${a.nome}${SUFIXO}${k}` : a.nome, nomeOriginal: a.nome };
  });
  const original = new Map(ambientes.map(a => [a.nome, a.nomeOriginal]));
  // portas: o "ambientes" da porta precisa dos nomes novos (recalcula pela posição)
  const { dentro } = require('./arquitetura');
  const ambienteEm = (p) => ambientes.filter(x => dentro(p, x.poligono)).sort((x, y) => x.area_m2 - y.area_m2)[0]?.nome || null;
  const portas = (arquitetura.portas || []).map(p => {
    let abre = null, outro = null;
    for (const d of [0.25, 0.4, 0.6]) {
      abre = abre || ambienteEm([p.meio[0] + p.n[0] * d, p.meio[1] + p.n[1] * d]);
      outro = outro || ambienteEm([p.meio[0] - p.n[0] * d, p.meio[1] - p.n[1] * d]);
    }
    return { ...p, abre_para: abre, outro_lado: outro, ambientes: [...new Set([abre, outro].filter(Boolean))], externa: !(abre && outro) };
  });
  return { arq: { ...arquitetura, ambientes, portas }, original };
}

const caixa = (pol) => {
  const xs = pol.map(p => p[0]), ys = pol.map(p => p[1]);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map(v => Math.round(v * 100) / 100).sort((a, b) => b - a);
};

// ── Formulário estimado por disciplina ─────────────────────────────────────
const TIPO_ELETRICA = [
  [/DORM|QUARTO|SU[ÍI]TE/i, 'dormitorio'], [/COZINHA|COPA/i, 'cozinha'], [/SERVI[ÇC]O|LAVANDERIA|DML/i, 'area_servico'],
  [/BANH|W\.?\s?C|SANIT|\bSAN\b|LAVABO|VESTI[ÁA]RIO/i, 'banheiro'], [/VARANDA|SACADA/i, 'varanda'], [/GARAGEM|ESTACION/i, 'garagem'],
  [/EXTERN|JARDIM|P[ÁA]TIO/i, 'externa'], [/^SALA DE ESTAR|^SALA$|^ESTAR/i, 'sala'],
];
const ATIVIDADE_ILUMINACAO = [
  [/CIRCULA|CORREDOR|HALL/i, 'circulacao'], [/ESCADA/i, 'escadas'], [/BANH|W\.?\s?C|SANIT|\bSAN\b|VESTI/i, 'banheiro'], [/COPA|REFEIT/i, 'copa'],
  [/DEP[ÓO]SITO|ALMOX/i, 'deposito'], [/GARAGEM|ESTACION/i, 'garagem_vias'], [/REUNI/i, 'reuniao'], [/RECEP|ESPERA/i, 'recepcao'],
  [/AULA/i, 'sala_aula'], [/LABORAT/i, 'laboratorio_ensino'], [/BIBLIOT/i, 'biblioteca'], [/COZINHA/i, 'cozinha_comercial'], [/LOJA|VENDA/i, 'comercio_vendas'],
];
const deTabela = (tab, nome, padrao) => (tab.find(([re]) => re.test(nome)) || [null, padrao])[1];

// CFTV sem projeto: câmeras nos acessos, circulações, áreas sociais/externas e
// salões; nenhuma em banheiro, vestiário ou dormitório (privacidade/LGPD)
function camerasEstimadas(a) {
  const t = tipoDoAmbiente(a.nome);
  if (['molhado', 'intimo', 'tecnico'].includes(t) || /ESCADA|ELEV|SHAFT/i.test(a.nome)) return 0;
  if (t === 'externo' || t === 'garagem') return Math.min(4, Math.max(1, Math.round(a.area_m2 / 60)));
  if (t === 'circulacao' || t === 'social') return Math.min(4, Math.max(1, Math.round(a.area_m2 / 80)));
  return a.area_m2 >= 40 ? Math.min(4, Math.round(a.area_m2 / 80) || 1) : 0;
}

const ESTIMATIVAS = {
  eletrica: (dados, ambs) => {
    dados.ambientes = ambs.filter(a => tipoDoAmbiente(a.nome) !== 'externo' || /VARANDA|SACADA/i.test(a.nome)).map(a => ({ nome: a.nome, tipo: deTabela(TIPO_ELETRICA, a.nome, 'outros'), area_m2: a.area_m2, perimetro_m: a.perimetro_m, tugs_adicionais: 0, iluminacao_va: null }));
    return '[CONFERIR] tomadas e pontos de luz pelo mínimo da NBR 5410 (9.5.2), tipo do ambiente deduzido pelo nome; sem TUEs (chuveiro, ar-condicionado) — informe no formulário.';
  },
  iluminacao: (dados, ambs) => {
    dados.luminarias = [{ codigo: 'PL1', descricao: 'Painel LED 60 × 60 cm (referência)', tipo: 'embutir', potencia_w: 36, fluxo_lm: 4000, ra: 80, tcc_k: 4000, ugr: 19, fu: null }];
    dados.ambientes = ambs.filter(a => tipoDoAmbiente(a.nome) !== 'externo').map(a => {
      const [c, l] = caixa(a.poligono);
      return { nome: a.nome, atividade: deTabela(ATIVIDADE_ILUMINACAO, a.nome, 'escritorio'), comprimento_m: c, largura_m: l, pe_direito_m: dados.__peDireito, plano_trabalho_m: 0.75, refl_teto: '0.7', refl_parede: '0.5', refl_piso: '0.2', luminaria: 'PL1', controle: 'interruptor', sensor_presenca: false, conservacao: 'normal', fu: null, portas: 1, distancia_quadro_m: 15 };
    });
    return '[CONFERIR] luminárias pelo método dos lúmens com painel LED 4.000 lm de referência e atividade deduzida pelo nome do ambiente.';
  },
  incendio: (dados, ambs) => {
    dados.ambientes = ambs.filter(a => tipoDoAmbiente(a.nome) !== 'externo').map(a => {
      const [c, l] = caixa(a.poligono);
      return { nome: a.nome, pavimento: 'Térreo', comprimento_m: c, largura_m: l, pe_direito_m: dados.__peDireito, detector: /BANH|W\.?\s?C|SANIT|\bSAN\b|COZINHA|COPA|GARAGEM/i.test(a.nome) ? 'temperatura' : 'fumaca', altura_viga_m: null, rota_fuga: /CORREDOR|CIRCULA|HALL|ESCADA|RAMPA/i.test(a.nome), escada: /ESCADA/i.test(a.nome), saidas: 0, mudancas_direcao: 0, altura_luminaria_m: null };
    });
    return '[CONFERIR] detectores pela grade da NBR 17240 com o pé-direito adotado; rotas de fuga deduzidas pelo nome (circulação, hall, escada).';
  },
  alarme: (dados, ambs) => {
    dados.ambientes = ambs.filter(a => tipoDoAmbiente(a.nome) !== 'externo').map((a, i) => {
      const [c] = caixa(a.poligono);
      return { nome: a.nome, particao: 1, area_m2: a.area_m2, maior_dimensao_m: c, portas: 1, janelas: /BANH|W\.?\s?C|CIRCULA|CORREDOR|HALL|DEP[ÓO]SITO/i.test(a.nome) ? 0 : 1, janelas_acessiveis: true, pe_direito_m: dados.__peDireito, externo: false, animais: false, risco: 'normal', acesso_principal: i === 0 };
    });
    return '[CONFERIR] sensores pela cobertura típica (EN 50131) — janelas acessíveis supostas em todos os ambientes com janela.';
  },
  cftv: (dados, ambs) => {
    let k = 0;
    dados.cameras = ambs.map(a => ({ a, n: camerasEstimadas(a) })).filter(x => x.n > 0).map(({ a, n }) => ({
      id: `CAM${++k}`, local: a.nome, tipo: tipoDoAmbiente(a.nome) === 'externo' || tipoDoAmbiente(a.nome) === 'garagem' ? 'bullet' : 'dome', quantidade: n, resolucao_mp: '4', hfov_graus: 90, objetivo: 'observacao', distancia_alvo_m: null, distancia_cabo_m: 40, externa: tipoDoAmbiente(a.nome) === 'externo',
    }));
    return '[CONFERIR] câmeras estimadas: acessos, circulações, áreas sociais, externas e salões (1 a cada ~60–80 m²); nenhuma em banheiros, vestiários e dormitórios (LGPD).';
  },
  cabeamento: (dados, ambs) => {
    dados.pavimentos = [{ nome: 'Pavimento', area_util_m2: Math.round(ambs.reduce((s, a) => s + a.area_m2, 0)), distancia_media_m: 35, distancia_max_m: 70, aps: 0, pontos_extra: 0 }];
    return '[CONFERIR] pontos de rede: 2 por área de trabalho de 10 m² (NBR 14565) nos ambientes de permanência — sem banheiros, circulações, áreas técnicas e externas.';
  },
};
// rede só onde há posto de trabalho/permanência
const temPontoDeRede = (a) => ['trabalho', 'social', 'intimo', 'outros'].includes(tipoDoAmbiente(a.nome)) || /COZINHA/i.test(a.nome);

function carregarMotor(pasta) {
  return require(path.join(__dirname, '..', '..', pasta, 'scripts', 'lib', 'index.js'));
}

// disciplinas: ['cftv', 'rede', …]; dadosPorDisciplina: { cftv: {...formulário real} }
// → { dispositivos: [{ disciplina, simbolo, id, ambiente, x, y, rotacao, regra }], avisos, porDisciplina }
function pontosDasDisciplinas(arquitetura, disciplinas, { dadosPorDisciplina = {}, peDireito = 2.8 } = {}) {
  const dispositivos = [];
  const avisos = [];
  const porDisciplina = [];
  for (const nome of disciplinas) {
    const pasta = DISCIPLINAS[nome];
    if (!pasta) throw new Error(`Disciplina "${nome}" sem pontos no 3D (disponível: ${Object.keys(DISCIPLINAS).join(', ')}).`);
    const motor = carregarMotor(pasta);
    const gerador = PLANTAS[motor.chave] || PLANTAS[pasta];
    let dados = dadosPorDisciplina[nome] || dadosPorDisciplina[pasta];
    let arq = arquitetura;
    let original = new Map();
    if (!dados) {
      const estimar = ESTIMATIVAS[pasta];
      if (!estimar) throw new Error(`Sem estimativa automática para "${nome}": informe o formulário do projeto (--dados ${nome}=arquivo.json).`);
      const filtro = pasta === 'cabeamento' ? (a) => ehAmbienteValido(a) && temPontoDeRede(a) : ehAmbienteValido;
      ({ arq, original } = arquiteturaComNomesUnicos(arquitetura, filtro));
      const vazio = typeof motor.modeloVazio === 'function' ? motor.modeloVazio() : motor.modeloVazio;
      dados = JSON.parse(JSON.stringify(vazio));
      dados.__peDireito = peDireito;
      if (dados.sistema && 'pe_direito_m' in dados.sistema) dados.sistema.pe_direito_m = peDireito;
      avisos.push(`${motor.nome || pasta}: ${estimar(dados, arq.ambientes)}`);
      delete dados.__peDireito;
    }
    let res;
    try { res = motor.processar(dados); } catch (e) { avisos.push(`${motor.nome || pasta}: cálculo não rodou (${e.message}) — sem pontos desta disciplina.`); continue; }
    const { pontos } = gerador(res, arq);
    const { posicoes, contagem, naoEncontrados } = posicionarPontos(arq, pontos);
    if (naoEncontrados.length) avisos.push(`${motor.nome || pasta}: ambientes do formulário que não estão na arquitetura (sem pontos no 3D): ${[...new Set(naoEncontrados)].join('; ')}.`);
    for (const p of posicoes) dispositivos.push({ ...p, disciplina: nome === 'cabeamento' ? 'rede' : nome, ambiente: original.get(p.ambiente) || p.ambiente });
    porDisciplina.push({ disciplina: nome, nome: motor.nome || pasta, contagem });
  }
  return { dispositivos, avisos, porDisciplina };
}

module.exports = { pontosDasDisciplinas, tipoDoAmbiente, ehAmbienteValido, DISCIPLINAS };
