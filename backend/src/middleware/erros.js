const multer = require('multer');

// Envolve um handler async para que qualquer rejeição vá parar no middleware
// de erro do Express em vez de virar uma "unhandled rejection".
//
// Por que isso importa aqui: o Express 4 não captura erro de função async. Sem
// esse wrapper, um `await` que rejeita fora do try/catch deixa a requisição
// pendurada (o cliente nunca recebe resposta) e, no Node 24, o comportamento
// padrão de unhandledRejection é derrubar o processo — ou seja, um pico no
// banco desconectava todo mundo do sistema.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Traduz erros do multer (upload) para JSON com status adequado.
// Antes esses erros caíam no handler padrão do Express, que responde uma
// página HTML com o stack trace — vazando o caminho de instalação do servidor
// (C:\HM-Engenharia\...) e quebrando o frontend, que espera JSON.
function mensagemDeUpload(err) {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return { status: 413, erro: 'Arquivo acima do limite de 15 MB.' };
    case 'LIMIT_FILE_COUNT':
      return { status: 413, erro: 'Número de arquivos acima do limite permitido.' };
    case 'LIMIT_UNEXPECTED_FILE':
      return { status: 400, erro: `Campo de arquivo inesperado: "${err.field}".` };
    default:
      return { status: 400, erro: 'Não foi possível processar o arquivo enviado.' };
  }
}

// Códigos de erro do PostgreSQL que são, na verdade, erro de entrada do
// cliente — devem virar 4xx com mensagem útil, não 500 genérico.
const ERROS_DE_ENTRADA = {
  '22P02': 'Valor inválido para um dos campos informados.',      // invalid_text_representation
  '22007': 'Data inválida.',                                      // invalid_datetime_format
  '22003': 'Valor numérico fora do limite permitido.',            // numeric_value_out_of_range
  '22001': 'Texto acima do tamanho permitido para o campo.',      // string_data_right_truncation
  '23502': 'Campo obrigatório não informado.',                    // not_null_violation
  '23503': 'Registro relacionado não encontrado.',                // foreign_key_violation
  '23505': 'Já existe um registro com esse valor.',               // unique_violation
};

// Middleware de erro do Express (precisa dos 4 parâmetros para ser reconhecido).
// Centraliza a resposta de erro: nunca vaza stack trace, sempre devolve JSON,
// e nunca tenta responder duas vezes.
function tratarErros(err, req, res, next) {
  if (res.headersSent) {
    // A resposta já foi enviada (ex.: o PDF já foi transmitido e o erro
    // aconteceu depois, ao fechar o navegador do puppeteer). Tentar responder
    // de novo lança ERR_HTTP_HEADERS_SENT, que antes derrubava o processo.
    console.error('Erro após a resposta já ter sido enviada:', err.message);
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const { status, erro } = mensagemDeUpload(err);
    return res.status(status).json({ erro });
  }

  if (err && ERROS_DE_ENTRADA[err.code]) {
    console.error(`Erro de entrada (${err.code}) em ${req.method} ${req.originalUrl}:`, err.message);
    return res.status(400).json({ erro: ERROS_DE_ENTRADA[err.code] });
  }

  console.error(`Erro não tratado em ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { asyncHandler, tratarErros };
