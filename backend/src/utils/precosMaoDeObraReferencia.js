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
