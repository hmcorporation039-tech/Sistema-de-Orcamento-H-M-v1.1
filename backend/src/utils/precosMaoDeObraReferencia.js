const pool = require('../config/database');

// Lista canônica dos itens de mão de obra padrão da Análise de Projeto (mesmo
// código usado em montarServicosPadrao, utils/compatibilizacaoAnalise.js).
// Serve pra duas coisas: (1) popular a tabela precos_mao_de_obra_referencia
// na primeira vez que o sistema sobe (schema.js), sem sobrescrever valores já
// preenchidos por um admin; (2) alimentar a tela de administração desses
// preços — o admin edita só o valor_referencia, descrição/unidade/disciplina
// vêm sempre daqui (fonte única, evita a tela e o gerador de serviços
// divergirem sobre o que cada código significa).
const ITENS_REFERENCIA = [
  { codigo: 'rede_ponto', descricao: 'Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', unidade: 'pt', disciplina: 'rede' },
  { codigo: 'rede_switch', descricao: 'Instalação e config. de switches', unidade: 'un', disciplina: 'rede' },
  { codigo: 'rede_ap', descricao: 'Instalação e config. de access points (Wi-Fi)', unidade: 'un', disciplina: 'rede' },
  { codigo: 'cftv_ponto', descricao: 'Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', unidade: 'pt', disciplina: 'cftv' },
  { codigo: 'cftv_camera_interna', descricao: 'Instalação/config. de câmera interna (dome)', unidade: 'un', disciplina: 'cftv' },
  { codigo: 'cftv_camera_externa', descricao: 'Instalação/config. de câmera externa (bullet)', unidade: 'un', disciplina: 'cftv' },
  { codigo: 'antena_ponto', descricao: 'Conectorização de ponto de TV/antena (conector coaxial RG-6)', unidade: 'pt', disciplina: 'antena' },
  { codigo: 'cab_racks', descricao: 'Montagem e organização dos racks (patch panels, guias, PDU)', unidade: 'un', disciplina: 'cabeamento' },
  { codigo: 'cab_nobreak', descricao: 'Instalação de nobreaks + kit de ventilação', unidade: 'un', disciplina: 'cabeamento' },
  { codigo: 'cab_certificacao', descricao: 'Certificação e etiquetagem dos pontos (rede + câmeras + telefonia)', unidade: 'pt', disciplina: 'cabeamento' },
  { codigo: 'cab_passagem', descricao: 'Passagem de cabeamento (infraestrutura + lançamento de cabos)', unidade: 'vb', disciplina: 'cabeamento' },
  { codigo: 'tel_ponto', descricao: 'Conectorização de ponto de telefonia (RJ-11/RJ-45 + teste)', unidade: 'pt', disciplina: 'telefonia' },
  { codigo: 'tel_central', descricao: 'Instalação de central telefônica / PABX', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'ele_qdg', descricao: 'Instalação de quadro de distribuição geral (QDG)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_qd_setorial', descricao: 'Instalação de quadros de distribuição setoriais/por pavimento', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_disjuntores', descricao: 'Instalação de disjuntores (termomagnéticos/DR)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_eletrodutos', descricao: 'Passagem de eletrodutos e fiação (circuitos de tomada/força)', unidade: 'vb', disciplina: 'eletrica' },
  { codigo: 'ele_tomada_baixa', descricao: 'Instalação de tomada baixa (30/60cm)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_tomada_media', descricao: 'Instalação de tomada média (110/140cm)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_tomada_alta', descricao: 'Instalação de tomada alta (180cm)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_tomada_emergencia', descricao: 'Instalação de tomada de emergência (baixa/média/alta)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_interruptor', descricao: 'Instalação de interruptor simples/paralelo', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_ponto_energia', descricao: 'Instalação de ponto de energia (teto/piso)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_aterramento', descricao: 'Aterramento (malha/SPDA)', unidade: 'vb', disciplina: 'eletrica' },
  { codigo: 'ilum_luminaria_embutir', descricao: 'Instalação de luminária de embutir', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_luminaria_sobrepor', descricao: 'Instalação de luminária de sobrepor', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_perfil_led', descricao: 'Instalação de perfil LED linear (embutir/sobrepor/marcenaria)', unidade: 'm', disciplina: 'iluminacao' },
  { codigo: 'ilum_interruptor_dimmer', descricao: 'Instalação de interruptor/dimmer de iluminação', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'auto_central', descricao: 'Instalação e configuração de central de automação', unidade: 'un', disciplina: 'automacao' },
  { codigo: 'auto_atuadores', descricao: 'Instalação de atuadores/módulos de automação (tomadas, cortinas, cenas)', unidade: 'un', disciplina: 'automacao' },
  { codigo: 'alarme_sensor_abertura', descricao: 'Instalação de sensor de abertura (magnético) porta/janela', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_ivp', descricao: 'Instalação de sensor infravermelho passivo (IVP)', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_sirene', descricao: 'Instalação de sirene', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_teclado', descricao: 'Instalação de teclado de comando', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_repetidor', descricao: 'Instalação de repetidor de sinal', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_central', descricao: 'Instalação e configuração da central de alarme', unidade: 'un', disciplina: 'alarme' },
  // Elétrica — serviços técnicos usados pelos orçamentos de Laudos e projetos (skills/eletrica)
  { codigo: 'ele_projeto', descricao: 'Elétrica: projeto executivo com memorial de cálculo e ART', unidade: 'vb', disciplina: 'eletrica' },
  { codigo: 'ele_inspecao', descricao: 'Elétrica: inspeção visual das instalações (NBR 5410 / NR-10)', unidade: 'vb', disciplina: 'eletrica' },
  { codigo: 'ele_ensaio_isolamento', descricao: 'Elétrica: ensaios de isolamento, continuidade do PE e DR (por circuito)', unidade: 'un', disciplina: 'eletrica' },
  { codigo: 'ele_laudo', descricao: 'Elétrica: laudo técnico das instalações com ART', unidade: 'vb', disciplina: 'eletrica' },
  // Recarga de veículo elétrico (skills/carregador)
  { codigo: 've_infraestrutura', descricao: 'Recarga VE: infraestrutura e lançamento de cabos até o ponto', unidade: 'm', disciplina: 'carregador' },
  { codigo: 've_quadro', descricao: 'Recarga VE: montagem do quadro de proteção (disjuntor, DR, DPS)', unidade: 'un', disciplina: 'carregador' },
  { codigo: 've_instalacao_carregador', descricao: 'Recarga VE: instalação, configuração e comissionamento da estação', unidade: 'un', disciplina: 'carregador' },
  { codigo: 've_projeto', descricao: 'Recarga VE: projeto do ponto de recarga com ART', unidade: 'vb', disciplina: 'carregador' },
  { codigo: 've_vistoria', descricao: 'Recarga VE: vistoria e ensaios por ponto', unidade: 'un', disciplina: 'carregador' },
  { codigo: 've_laudo', descricao: 'Recarga VE: laudo de vistoria com ART', unidade: 'vb', disciplina: 'carregador' },
  // Incêndio — detecção, alarme e iluminação de emergência (skills/incendio)
  { codigo: 'inc_infra', descricao: 'Incêndio: infraestrutura e lançamento de cabos do alarme', unidade: 'm', disciplina: 'incendio' },
  { codigo: 'inc_dispositivo', descricao: 'Incêndio: instalação de detector, acionador ou avisador', unidade: 'un', disciplina: 'incendio' },
  { codigo: 'inc_central', descricao: 'Incêndio: instalação, programação e endereçamento da central', unidade: 'un', disciplina: 'incendio' },
  { codigo: 'inc_ilum_emergencia', descricao: 'Incêndio: instalação de luminária/sinalização de emergência', unidade: 'un', disciplina: 'incendio' },
  { codigo: 'inc_comissionamento', descricao: 'Incêndio: comissionamento, testes e treinamento', unidade: 'vb', disciplina: 'incendio' },
  { codigo: 'inc_projeto', descricao: 'Incêndio: projeto executivo com ART', unidade: 'vb', disciplina: 'incendio' },
  { codigo: 'inc_inspecao', descricao: 'Incêndio: inspeção e ensaios funcionais', unidade: 'vb', disciplina: 'incendio' },
  { codigo: 'inc_laudo', descricao: 'Incêndio: laudo técnico com ART', unidade: 'vb', disciplina: 'incendio' },
  // Cabeamento estruturado — serviços técnicos (skills/cabeamento); os demais usam rede_ponto/cab_*
  { codigo: 'cab_projeto', descricao: 'Cabeamento: projeto com ART', unidade: 'vb', disciplina: 'cabeamento' },
  { codigo: 'cab_relatorio', descricao: 'Cabeamento: relatório de certificação e inspeção com ART', unidade: 'vb', disciplina: 'cabeamento' },
  // CFTV — serviços técnicos (skills/cftv); os pontos e câmeras usam cftv_ponto/cftv_camera_*
  { codigo: 'cftv_nvr', descricao: 'CFTV: instalação e configuração do gravador, switch, nobreak e acesso remoto', unidade: 'vb', disciplina: 'cftv' },
  { codigo: 'cftv_projeto', descricao: 'CFTV: projeto com estudo de cobertura (DORI) e ART', unidade: 'vb', disciplina: 'cftv' },
  { codigo: 'cftv_vistoria', descricao: 'CFTV: vistoria com teste de imagem e gravação (por câmera)', unidade: 'un', disciplina: 'cftv' },
  { codigo: 'cftv_laudo', descricao: 'CFTV: laudo de vistoria com ART', unidade: 'vb', disciplina: 'cftv' },
  // Usina solar fotovoltaica (skills/solar)
  { codigo: 'sol_modulo', descricao: 'Solar: montagem de módulo fotovoltaico na estrutura', unidade: 'un', disciplina: 'solar' },
  { codigo: 'sol_estrutura', descricao: 'Solar: instalação da estrutura de fixação (por módulo)', unidade: 'un', disciplina: 'solar' },
  { codigo: 'sol_inversor', descricao: 'Solar: instalação e configuração do inversor', unidade: 'un', disciplina: 'solar' },
  { codigo: 'sol_cc', descricao: 'Solar: cabeamento CC, conectores MC4 e string box', unidade: 'vb', disciplina: 'solar' },
  { codigo: 'sol_ca', descricao: 'Solar: circuito CA, quadro de proteção e conexão ao quadro geral', unidade: 'vb', disciplina: 'solar' },
  { codigo: 'sol_projeto_homologacao', descricao: 'Solar: projeto, ART e homologação na distribuidora', unidade: 'vb', disciplina: 'solar' },
  { codigo: 'sol_comissionamento', descricao: 'Solar: comissionamento (Voc, Isc, isolamento, polaridade) e start-up', unidade: 'vb', disciplina: 'solar' },
  { codigo: 'sol_inspecao', descricao: 'Solar: inspeção e ensaios por string (IEC 62446-1)', unidade: 'un', disciplina: 'solar' },
  { codigo: 'sol_laudo', descricao: 'Solar: laudo técnico da usina com ART', unidade: 'vb', disciplina: 'solar' },
  // Automação — BMS, climatização e residencial (skills/automacao); usa também auto_central e auto_atuadores
  { codigo: 'auto_pontos_bms', descricao: 'Automação: instalação e cabeamento de ponto físico (BMS)', unidade: 'pt', disciplina: 'automacao' },
  { codigo: 'auto_quadro', descricao: 'Automação: montagem e instalação de quadro de automação', unidade: 'un', disciplina: 'automacao' },
  { codigo: 'auto_integracao', descricao: 'Automação: integração de equipamento por rede (BACnet/Modbus)', unidade: 'un', disciplina: 'automacao' },
  { codigo: 'auto_sensor', descricao: 'Automação: instalação de sensor/termostato de ambiente', unidade: 'un', disciplina: 'automacao' },
  { codigo: 'auto_programacao', descricao: 'Automação: programação, telas/aplicativo, cenas e sequências de controle', unidade: 'vb', disciplina: 'automacao' },
  { codigo: 'auto_comissionamento', descricao: 'Automação: comissionamento ponto a ponto, testes e treinamento', unidade: 'vb', disciplina: 'automacao' },
  { codigo: 'auto_projeto', descricao: 'Automação: projeto (lista de pontos, arquitetura, descritivo) com ART', unidade: 'vb', disciplina: 'automacao' },
  { codigo: 'auto_inspecao', descricao: 'Automação: diagnóstico/comissionamento do sistema existente', unidade: 'vb', disciplina: 'automacao' },
  { codigo: 'auto_laudo', descricao: 'Automação: relatório técnico com classe de eficiência e ART', unidade: 'vb', disciplina: 'automacao' },
  // SPDA — códigos usados pelo orçamento gerado em Laudos e projetos (skills/spda/scripts/lib/orcamento.js)
  { codigo: 'spda_malha', descricao: 'SPDA: instalação da malha de captação (condutor, suportes e conexões)', unidade: 'm', disciplina: 'spda' },
  { codigo: 'spda_descida_natural', descricao: 'SPDA: conexão da captação às armaduras (descida natural) e terminal de ensaio', unidade: 'un', disciplina: 'spda' },
  { codigo: 'spda_descida', descricao: 'SPDA: instalação de descida não natural com fixadores e terminal de ensaio', unidade: 'm', disciplina: 'spda' },
  { codigo: 'spda_anel', descricao: 'SPDA: anel de aterramento (vala, lançamento e conexões)', unidade: 'm', disciplina: 'spda' },
  { codigo: 'spda_hastes_caixas', descricao: 'SPDA: cravação de haste e instalação de caixa de inspeção', unidade: 'un', disciplina: 'spda' },
  { codigo: 'spda_bep', descricao: 'SPDA: instalação do BEP e ligações equipotenciais', unidade: 'vb', disciplina: 'spda' },
  { codigo: 'spda_dps', descricao: 'SPDA: instalação de DPS', unidade: 'un', disciplina: 'spda' },
  { codigo: 'spda_projeto', descricao: 'SPDA: projeto executivo com análise de risco e ART', unidade: 'vb', disciplina: 'spda' },
  { codigo: 'spda_inspecao_pos', descricao: 'SPDA: inspeção pós-instalação com ensaios e laudo', unidade: 'vb', disciplina: 'spda' },
  { codigo: 'spda_inspecao', descricao: 'SPDA: inspeção documental, visual e dimensional', unidade: 'vb', disciplina: 'spda' },
  { codigo: 'spda_ensaio_continuidade', descricao: 'SPDA: ensaio de continuidade elétrica (por ponto)', unidade: 'pt', disciplina: 'spda' },
  { codigo: 'spda_analise_risco', descricao: 'SPDA: análise de risco NBR 5419-2 com relatório', unidade: 'vb', disciplina: 'spda' },
  { codigo: 'spda_laudo', descricao: 'SPDA: laudo técnico de inspeção com ART', unidade: 'vb', disciplina: 'spda' },
];

// Usado por montarServicosPadrao pra anexar a referência (sugestão, nunca
// preenchida sozinha no valor_unitario) a cada item gerado.
async function buscarPrecosReferencia() {
  const result = await pool.query(
    'SELECT codigo, valor_referencia FROM precos_mao_de_obra_referencia WHERE valor_referencia IS NOT NULL'
  );
  const mapa = {};
  for (const row of result.rows) mapa[row.codigo] = Number(row.valor_referencia);
  return mapa;
}

module.exports = { ITENS_REFERENCIA, buscarPrecosReferencia };
