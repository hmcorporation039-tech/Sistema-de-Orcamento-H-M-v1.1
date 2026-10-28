// Configuração do assistente virtual (backend/.env). Tudo tem padrão; nada é obrigatório.
//
//   ASSISTENTE=desligado              tira o assistente do ar (a tela mostra o aviso)
//   ASSISTENTE_PROVEDOR=claude_max    claude_max (padrão: Claude Code com a assinatura Max)
//                                     ou api (API da Anthropic com tool use — preparado,
//                                     desligado por padrão: a API está sem crédito)
//   ASSISTENTE_MODELO=sonnet          modelo do Claude Code (padrão: CLAUDE_CLI_MODELO ou sonnet)
//   ASSISTENTE_MAX_SIMULTANEAS=2      execuções ao mesmo tempo neste PC (as outras esperam na fila)
//   ASSISTENTE_TEMPO_LIMITE_MIN=10    tempo máximo de uma resposta (minutos)
//   ASSISTENTE_LIMITE_DIARIO=40       mensagens por usuário por dia (0 = sem limite)
//   ASSISTENTE_MAX_TURNOS=40          passos (chamadas de ferramenta) por mensagem
//   ASSISTENTE_UPLOAD_MB=25           tamanho máximo de cada arquivo anexado
//   ASSISTENTE_API_URL                endereço da API que o MCP do assistente chama
//                                     (padrão: http://127.0.0.1:<PORT>)
//   ASSISTENTE_CLI_PATH               caminho do claude.exe (padrão: CLAUDE_CLI_PATH ou ~/.local/bin)
//   ASSISTENTE_LIMPEZA=ligada         apaga conversas com mais de ASSISTENTE_GUARDA_MESES (12)
//                                     meses sem uso — desligada por padrão
const os = require('os');
const path = require('path');

const inteiro = (v, padrao, min = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min ? n : padrao;
};

function config(env = process.env) {
  return {
    ligado: String(env.ASSISTENTE || '').toLowerCase() !== 'desligado',
    provedor: String(env.ASSISTENTE_PROVEDOR || 'claude_max').toLowerCase() === 'api' ? 'api' : 'claude_max',
    modelo: env.ASSISTENTE_MODELO || env.CLAUDE_CLI_MODELO || 'sonnet',
    modeloApi: env.ASSISTENTE_MODELO_API || 'claude-sonnet-5',
    maxSimultaneas: inteiro(env.ASSISTENTE_MAX_SIMULTANEAS, 2, 1),
    tempoLimiteMs: inteiro(env.ASSISTENTE_TEMPO_LIMITE_MIN, 10, 1) * 60 * 1000,
    limiteDiario: inteiro(env.ASSISTENTE_LIMITE_DIARIO, 40, 0),
    maxTurnos: inteiro(env.ASSISTENTE_MAX_TURNOS, 40, 4),
    uploadBytes: inteiro(env.ASSISTENTE_UPLOAD_MB, 25, 1) * 1024 * 1024,
    apiUrl: (env.ASSISTENTE_API_URL || `http://127.0.0.1:${env.PORT || 3001}`).replace(/\/+$/, ''),
    caminhoCli: env.ASSISTENTE_CLI_PATH || env.CLAUDE_CLI_PATH
      || path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude'),
    limpeza: String(env.ASSISTENTE_LIMPEZA || '').toLowerCase() === 'ligada',
    guardaMeses: inteiro(env.ASSISTENTE_GUARDA_MESES, 12, 1),
  };
}

module.exports = { config };
