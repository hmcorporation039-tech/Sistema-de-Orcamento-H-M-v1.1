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

  // Alarme de intrusão (skills/alarme); usa também alarme_sensor_abertura, alarme_ivp, alarme_sirene, alarme_teclado, alarme_repetidor e alarme_central
  { codigo: 'alarme_barreira', descricao: 'Instalação e alinhamento de barreira infravermelha ativa (par TX + RX)', unidade: 'par', disciplina: 'alarme' },
  { codigo: 'alarme_comunicacao', descricao: 'Alarme: instalação/config. do comunicador (IP/4G/linha) e teste com a central de monitoramento', unidade: 'vb', disciplina: 'alarme' },
  { codigo: 'alarme_infra', descricao: 'Alarme: infraestrutura e lançamento de cabos', unidade: 'm', disciplina: 'alarme' },
  { codigo: 'alarme_comissionamento', descricao: 'Alarme: comissionamento (teste zona a zona, comunicação) e treinamento', unidade: 'vb', disciplina: 'alarme' },
  { codigo: 'alarme_projeto', descricao: 'Alarme: projeto (zonas, partições, bateria) com ART', unidade: 'vb', disciplina: 'alarme' },
  { codigo: 'alarme_vistoria', descricao: 'Alarme: vistoria e teste por zona', unidade: 'un', disciplina: 'alarme' },
  { codigo: 'alarme_laudo', descricao: 'Alarme: relatório de vistoria e teste com ART', unidade: 'vb', disciplina: 'alarme' },
  // informativo: mensalidade do monitoramento (não deve ter valor de referência somado ao total)
  { codigo: 'alarme_monitoramento_mensal', descricao: 'Alarme: mensalidade de monitoramento 24 h (informativo)', unidade: 'mês', disciplina: 'alarme' },

  // Iluminação (skills/iluminacao); usa também ilum_luminaria_embutir/sobrepor, ilum_perfil_led e ilum_interruptor_dimmer
  { codigo: 'ilum_luminaria_pendente', descricao: 'Instalação de luminária pendente (com suspensão)', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_driver', descricao: 'Instalação de driver/fonte LED remota', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_sensor_presenca', descricao: 'Instalação e ajuste de sensor de presença', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_controlador_dali', descricao: 'Instalação de controlador/gateway DALI-2 e fonte de barramento', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_programacao_dali', descricao: 'Endereçamento, grupos, cenas e comissionamento DALI (por endereço)', unidade: 'pt', disciplina: 'iluminacao' },
  { codigo: 'ilum_infraestrutura', descricao: 'Eletrodutos e fiação dos circuitos de iluminação', unidade: 'm', disciplina: 'iluminacao' },
  { codigo: 'ilum_projeto', descricao: 'Projeto luminotécnico com memorial e ART', unidade: 'vb', disciplina: 'iluminacao' },
  { codigo: 'ilum_medicao', descricao: 'Medição de iluminância por malha e teste dos comandos (por ambiente)', unidade: 'un', disciplina: 'iluminacao' },
  { codigo: 'ilum_relatorio', descricao: 'Relatório de medição/comissionamento de iluminação com ART', unidade: 'vb', disciplina: 'iluminacao' },

  // Elétrica hospitalar (skills/eletrica-hospitalar); usa também ele_qd_setorial, ele_disjuntores, ele_eletrodutos, ele_tomada_media, ele_ponto_energia e ele_ensaio_isolamento
  { codigo: 'hosp_painel_it', descricao: 'Elétrica hospitalar: montagem e instalação de painel IT médico (QDIT com transformador de separação)', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_dsi', descricao: 'Elétrica hospitalar: instalação e parametrização de DSI e painel de alarme', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_tomada_it', descricao: 'Elétrica hospitalar: instalação de tomada do IT médico com identificação permanente', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_equipotencializacao', descricao: 'Elétrica hospitalar: equipotencialização suplementar por local (BEL e ligações)', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_fonte_seguranca', descricao: 'Elétrica hospitalar: instalação e integração da fonte de segurança (UPS, QTA, circuitos por classe)', unidade: 'vb', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_comissionamento', descricao: 'Elétrica hospitalar: comissionamento e ensaios NBR 13534 por local médico', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_projeto', descricao: 'Elétrica hospitalar: projeto NBR 13534 com classificação dos locais, memorial e ART', unidade: 'vb', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_inspecao', descricao: 'Elétrica hospitalar: inspeção visual e documental (NBR 13534 / NR-10)', unidade: 'vb', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_ensaio_local', descricao: 'Elétrica hospitalar: ensaios por local (DSI, fuga do trafo, equipotencialização, DR)', unidade: 'un', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_ensaio_comutacao', descricao: 'Elétrica hospitalar: ensaio de comutação da fonte de segurança (tempo por classe e autonomia)', unidade: 'vb', disciplina: 'eletrica_hospitalar' },
  { codigo: 'hosp_laudo', descricao: 'Elétrica hospitalar: laudo técnico NBR 13534 com ART', unidade: 'vb', disciplina: 'eletrica_hospitalar' },

  // Elétrica industrial (skills/eletrica-industrial)
  { codigo: 'ind_motor_ate10cv', descricao: 'Industrial: ligação de motor até 10 cv (conexão, sentido de rotação e teste)', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_motor_10a50cv', descricao: 'Industrial: ligação de motor acima de 10 cv até 50 cv', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_motor_acima50cv', descricao: 'Industrial: ligação de motor acima de 50 cv', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_partida_montagem', descricao: 'Industrial: montagem e fiação de partida no CCM (por partida)', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_parametrizacao', descricao: 'Industrial: parametrização de soft-starter/inversor e ensaio de partida', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_ccm_montagem', descricao: 'Industrial: montagem e instalação de QGBT/CCM/quadro', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_banco_capacitores', descricao: 'Industrial: instalação e ajuste do banco de capacitores com controlador', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_eletrocalha', descricao: 'Industrial: instalação de eletrocalha/leito com suportes e acessórios', unidade: 'm', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_lancamento_cabos', descricao: 'Industrial: lançamento e conexão de cabos de força (por metro de circuito)', unidade: 'm', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_comissionamento', descricao: 'Industrial: comissionamento (isolamento, PE, ajustes, rotação, partida assistida)', unidade: 'vb', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_projeto', descricao: 'Industrial: projeto elétrico industrial com memorial, unifilares e ART', unidade: 'vb', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_inspecao', descricao: 'Industrial: inspeção visual das instalações industriais', unidade: 'vb', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_termografia', descricao: 'Industrial: termografia de QGBT/CCM/quadro sob carga (por conjunto)', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_ensaio_motor', descricao: 'Industrial: ensaio de isolamento e conferência da proteção (por motor)', unidade: 'un', disciplina: 'eletrica_industrial' },
  { codigo: 'ind_laudo', descricao: 'Industrial: laudo técnico das instalações industriais com ART', unidade: 'vb', disciplina: 'eletrica_industrial' },

  // Média tensão / subestação (skills/media-tensao)
  { codigo: 'mt_se_poste', descricao: 'MT: montagem de subestação aérea em poste', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_se_abrigada', descricao: 'MT: montagem eletromecânica de subestação abrigada', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_se_blindada', descricao: 'MT: instalação de subestação/cabine blindada', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_se_ao_tempo', descricao: 'MT: montagem de subestação ao tempo', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_transformador', descricao: 'MT: içamento, posicionamento e ligação do transformador', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_disjuntor_rele', descricao: 'MT: disjuntor de MT com relé, TCs, fonte e parametrização', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_infra_subterranea', descricao: 'MT: infraestrutura do ramal subterrâneo de MT', unidade: 'm', disciplina: 'media_tensao' },
  { codigo: 'mt_cabo', descricao: 'MT: lançamento de cabo de MT (por metro de circuito trifásico)', unidade: 'm', disciplina: 'media_tensao' },
  { codigo: 'mt_terminacao', descricao: 'MT: terminação (mufla) de MT', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_malha', descricao: 'MT: malha de aterramento (vala, cabo nu, conexões exotérmicas)', unidade: 'm', disciplina: 'media_tensao' },
  { codigo: 'mt_hastes', descricao: 'MT: haste e caixa de inspeção da malha', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_qgbt', descricao: 'MT: montagem do QGBT e cabos do transformador ao QGBT', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_ensaios_comissionamento', descricao: 'MT: ensaios, comissionamento e energização da subestação', unidade: 'vb', disciplina: 'media_tensao' },
  { codigo: 'mt_projeto_aprovacao', descricao: 'MT: projeto, ART e aprovação na distribuidora', unidade: 'vb', disciplina: 'media_tensao' },
  { codigo: 'mt_manutencao_preventiva', descricao: 'MT: manutenção preventiva da subestação com desligamento', unidade: 'vb', disciplina: 'media_tensao' },
  { codigo: 'mt_termografia', descricao: 'MT: termografia da subestação e do QGBT', unidade: 'vb', disciplina: 'media_tensao' },
  { codigo: 'mt_ensaio_oleo', descricao: 'MT: coleta e análise do óleo isolante', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_ensaio_isolamento', descricao: 'MT: ensaios de isolamento e relação de transformação (TTR)', unidade: 'vb', disciplina: 'media_tensao' },
  { codigo: 'mt_teste_rele', descricao: 'MT: teste do relé por injeção e do disjuntor', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_medicao_malha', descricao: 'MT: medição da malha de aterramento e da continuidade', unidade: 'un', disciplina: 'media_tensao' },
  { codigo: 'mt_laudo', descricao: 'MT: laudo técnico da subestação com ART', unidade: 'vb', disciplina: 'media_tensao' },

  // Pressurização de escadas — controle de fumaça e automação (skills/pressurizacao)
  { codigo: 'pres_ventilador', descricao: 'Pressurização: instalação do conjunto motoventilador (base, junta flexível, alinhamento e ligação)', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_duto', descricao: 'Pressurização: fabricação e montagem de duto de chapa galvanizada com suportes e vedação', unidade: 'm²', disciplina: 'pressurizacao' },
  { codigo: 'pres_grelha', descricao: 'Pressurização: instalação e balanceamento de grelha de insuflação / veneziana de tomada de ar', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_damper', descricao: 'Pressurização: instalação de damper de alívio ou registro de retenção', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_sensores', descricao: 'Pressurização: instalação de transmissor de pressão diferencial ou pressostato de fluxo', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_painel', descricao: 'Pressurização: montagem e instalação do painel de comando (inversor/soft-starter, controlador e sinalização)', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_programacao', descricao: 'Pressurização: programação do controlador e parametrização (PID de ΔP, reversão, modos, supervisão)', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_cabo_forca', descricao: 'Pressurização: lançamento de cabo de força resistente ao fogo (por metro de circuito)', unidade: 'm', disciplina: 'pressurizacao' },
  { codigo: 'pres_cabo_comando', descricao: 'Pressurização: lançamento de cabos de comando, sinal e instrumentação', unidade: 'm', disciplina: 'pressurizacao' },
  { codigo: 'pres_infra', descricao: 'Pressurização: infraestrutura em eletroduto de aço galvanizado', unidade: 'm', disciplina: 'pressurizacao' },
  { codigo: 'pres_acionador', descricao: 'Pressurização: instalação de acionador remoto "LIGA pressurização"', unidade: 'un', disciplina: 'pressurizacao' },
  { codigo: 'pres_integracao_alarme', descricao: 'Pressurização: integração com a central de detecção e alarme (módulos, matriz e testes)', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_comissionamento', descricao: 'Pressurização: comissionamento e testes de aceitação (ΔP, velocidade, força, tempos) com relatório', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_projeto', descricao: 'Pressurização: projeto (memorial de cálculo, desenhos, diagrama de comando) com ART e aprovação no CBMDF', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_inspecao', descricao: 'Pressurização: inspeção e ensaios do sistema existente (ΔP, velocidade, força, tempos e reversão)', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_manutencao', descricao: 'Pressurização: manutenção preventiva (ventiladores, filtros, damper, painel e sensores)', unidade: 'vb', disciplina: 'pressurizacao' },
  { codigo: 'pres_laudo', descricao: 'Pressurização: laudo técnico de inspeção com ART', unidade: 'vb', disciplina: 'pressurizacao' },

  // Controle de acesso (skills/controle-acesso)
  { codigo: 'ace_leitor', descricao: 'Controle de acesso: instalação e configuração de leitor (cartão, biometria ou facial)', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_fechadura', descricao: 'Controle de acesso: instalação de fechadura eletromagnética/fecho elétrico/solenoide com suporte', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_botoeira', descricao: 'Controle de acesso: instalação de botoeira de saída, acionador de emergência ou sensor de porta', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_controladora', descricao: 'Controle de acesso: instalação de controladora com fonte, bateria e gabinete', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_catraca', descricao: 'Controle de acesso: instalação e configuração de catraca ou cancela', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_infra', descricao: 'Controle de acesso: infraestrutura e lançamento de cabos (por metro de rota)', unidade: 'm', disciplina: 'controle_acesso' },
  { codigo: 'ace_programacao', descricao: 'Controle de acesso: programação do software, cadastro de usuários, níveis de acesso e integrações', unidade: 'vb', disciplina: 'controle_acesso' },
  { codigo: 'ace_comissionamento', descricao: 'Controle de acesso: comissionamento por porta (incêndio, falta de energia, emergência), testes e treinamento', unidade: 'vb', disciplina: 'controle_acesso' },
  { codigo: 'ace_projeto', descricao: 'Controle de acesso: projeto (portas, dimensionamento, memorial) com ART', unidade: 'vb', disciplina: 'controle_acesso' },
  { codigo: 'ace_vistoria', descricao: 'Controle de acesso: vistoria/teste por ponto de acesso', unidade: 'un', disciplina: 'controle_acesso' },
  { codigo: 'ace_laudo', descricao: 'Controle de acesso: relatório de vistoria/comissionamento com ART', unidade: 'vb', disciplina: 'controle_acesso' },
  // Telefonia e interfonia (skills/telefonia) e antena coletiva (skills/antena)
  { codigo: 'tel_terminal', descricao: 'Telefonia/interfonia: instalação de terminal (interfone/telefone) na unidade ou área comum, com teste', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_portaria', descricao: 'Telefonia/interfonia: instalação e configuração de terminal de portaria', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_porteiro', descricao: 'Telefonia/interfonia: instalação de porteiro eletrônico com ligação da fechadura/portão', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_prumada', descricao: 'Telefonia/interfonia: lançamento de cabo de prumada (CI/fibra) do DG às caixas de andar', unidade: 'm', disciplina: 'telefonia' },
  { codigo: 'tel_cabo_ramal', descricao: 'Telefonia/interfonia: lançamento de cabo de ramal (CCI/UTP) até o terminal', unidade: 'm', disciplina: 'telefonia' },
  { codigo: 'tel_dg', descricao: 'Telefonia/interfonia: montagem do DG e caixas de andar (bloco IDC-110/BLI com suporte, conectorização e identificação)', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_dps', descricao: 'Telefonia/interfonia: instalação de DPS de linha/CA e ligação ao TAP/BEP', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_nobreak', descricao: 'Telefonia/interfonia: instalação de nobreak com banco de baterias', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_switch', descricao: 'Telefonia/interfonia: instalação e configuração de switch PoE (VLAN de voz/QoS) e rack', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_infra', descricao: 'Telefonia/interfonia: infraestrutura (prumada, eletrodutos e caixas)', unidade: 'm', disciplina: 'telefonia' },
  { codigo: 'tel_programacao', descricao: 'Telefonia/interfonia: programação da central/PABX (ramais, porteiros, portaria, troncos) e treinamento', unidade: 'vb', disciplina: 'telefonia' },
  { codigo: 'tel_comissionamento', descricao: 'Telefonia/interfonia: teste ramal a ramal, identificação dos pares, mapa do DG e as built', unidade: 'vb', disciplina: 'telefonia' },
  { codigo: 'tel_projeto', descricao: 'Telefonia/interfonia: projeto (ramais, prumada, DG, memorial) com ART', unidade: 'vb', disciplina: 'telefonia' },
  { codigo: 'tel_vistoria', descricao: 'Telefonia/interfonia: vistoria/teste por ramal (chamada, áudio, identificação)', unidade: 'un', disciplina: 'telefonia' },
  { codigo: 'tel_laudo', descricao: 'Telefonia/interfonia: relatório de vistoria/teste com ART', unidade: 'vb', disciplina: 'telefonia' },
  { codigo: 'antena_instalacao', descricao: 'Antena coletiva: instalação de antena (UHF ou parabólica) com mastro, suporte e apontamento', unidade: 'un', disciplina: 'antena' },
  { codigo: 'antena_headend', descricao: 'Antena coletiva: montagem e ajuste do headend (amplificador, divisores, multiswitch central e DPS)', unidade: 'vb', disciplina: 'antena' },
  { codigo: 'antena_derivador', descricao: 'Antena coletiva: instalação de derivador ou multiswitch de pavimento (caixa, conexões e terminação)', unidade: 'un', disciplina: 'antena' },
  { codigo: 'antena_amplificador_linha', descricao: 'Antena coletiva: instalação e ajuste de amplificador de linha na prumada', unidade: 'un', disciplina: 'antena' },
  { codigo: 'antena_prumada', descricao: 'Antena coletiva: lançamento de cabo coaxial na prumada/tronco', unidade: 'm', disciplina: 'antena' },
  { codigo: 'antena_passagem_ponto', descricao: 'Antena coletiva: passagem de cabo coaxial da prumada até a tomada', unidade: 'pt', disciplina: 'antena' },
  { codigo: 'antena_aterramento', descricao: 'Antena coletiva: aterramento e equipotencialização do mastro e do headend (DPS coaxial)', unidade: 'vb', disciplina: 'antena' },
  { codigo: 'antena_medicao', descricao: 'Antena coletiva: medição de nível e MER/BER por ponto e ajuste', unidade: 'pt', disciplina: 'antena' },
  { codigo: 'antena_projeto', descricao: 'Antena coletiva: projeto com cálculo de níveis (link budget) e ART', unidade: 'vb', disciplina: 'antena' },
  { codigo: 'antena_vistoria', descricao: 'Antena coletiva: vistoria do sistema (antenas, mastro, headend, distribuição e aterramento)', unidade: 'vb', disciplina: 'antena' },
  { codigo: 'antena_relatorio', descricao: 'Antena coletiva: relatório de medição/comissionamento com ART', unidade: 'vb', disciplina: 'antena' },
];

// Segmento do cliente para a referência de mercado: órgão público usa a
// referência OFICIAL (SINAPI, ORSE, tabelas de órgãos — teto de licitação);
// os demais, a do mercado particular. Sem cadastro, decide pelo nome.
const RE_ORGAO_PUBLICO = /\b(MINIST[ÉE]RIO|SECRETARIA|GOVERNO|PREFEITURA|C[ÂA]MARA (MUNICIPAL|DOS DEPUTADOS|LEGISLATIVA)|ASSEMBLEIA LEGISLATIVA|SENADO|TRIBUNAL|PROCURADORIA|DEFENSORIA|AUTARQUIA|INSTITUTO FEDERAL|UNIVERSIDADE FEDERAL|UNIVERSIDADE ESTADUAL|DETRAN|DNIT|DER\b|NOVACAP|CAESB|POL[ÍI]CIA|CORPO DE BOMBEIROS|EX[ÉE]RCITO|MARINHA|AERON[ÁA]UTICA|ANATEL|ANEEL|ANVISA|INSS|IBAMA|ICMBIO|EMBRAPA|FUNDA[ÇC][ÃA]O (HOSPITALAR|DE SA[ÚU]DE)|HOSPITAL (REGIONAL|UNIVERSIT[ÁA]RIO|DAS FOR[ÇC]AS)|SEEDF|SES-?DF|GDF)\b/i;
function segmentoDoCliente(tipo, nome) {
  if (tipo) return /p[úu]blico/i.test(tipo) ? 'publico' : 'privado';
  return RE_ORGAO_PUBLICO.test(String(nome || '')) ? 'publico' : 'privado';
}
async function segmentoPorNomeDoCliente(nome) {
  if (!nome) return 'privado';
  const { rows: [c] } = await pool.query('SELECT tipo FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [String(nome).trim()]).catch(() => ({ rows: [] }));
  return segmentoDoCliente(c?.tipo, nome);
}

// Sugestão de preço de um serviço: o valor adotado pela H&M, se preenchido;
// senão a referência de mercado do segmento do cliente. Nunca preenchida
// sozinha como preço fechado (o orçamento sai "a cotar").
const valorSugerido = (r, segmento) => r.hm ?? (segmento === 'publico' ? r.publico : r.privado) ?? null;

async function buscarReferencias() {
  const { rows } = await pool.query('SELECT codigo, valor_referencia, valor_publico, valor_privado FROM precos_mao_de_obra_referencia');
  const num = (v) => (v == null ? null : Number(v));
  return Object.fromEntries(rows.map(r => [r.codigo, { hm: num(r.valor_referencia), publico: num(r.valor_publico), privado: num(r.valor_privado) }]));
}

// codigo → valor sugerido para o segmento (usado por montarServicosPadrao e
// pelos laudos); só entram códigos com algum valor
async function buscarPrecosReferencia(segmento = 'privado') {
  const refs = await buscarReferencias();
  const mapa = {};
  for (const [codigo, r] of Object.entries(refs)) { const v = valorSugerido(r, segmento); if (v != null) mapa[codigo] = v; }
  return mapa;
}

module.exports = { ITENS_REFERENCIA, buscarPrecosReferencia, buscarReferencias, valorSugerido, segmentoDoCliente, segmentoPorNomeDoCliente };
