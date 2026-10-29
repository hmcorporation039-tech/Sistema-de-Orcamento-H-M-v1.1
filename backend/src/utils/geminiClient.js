// Cliente fino pra API do Gemini (Google AI Studio). Usado só em tarefas bem
// restritas onde já validamos que a IA é confiável (reformatar texto já
// extraído do PDF, pesquisa de mercado com busca real) — nunca pra "ler" o
// PDF inteiro e responder de memória, onde já vimos alucinação alta (ex.:
// inventar nomes de ambiente que não existem no desenho).
//
// O plano gratuito do Gemini tem uma cota bem curta POR DIA (não por minuto)
// e POR MODELO — ex.: 20 requisições/dia pro gemini-2.5-flash. Uma vez
// estourada, não adianta tentar de novo o mesmo modelo (só reseta no dia
// seguinte). Por isso a lista de modelos abaixo: se o principal estourar a
// cota do dia, cai automaticamente pro próximo (cota separada por modelo).
// Configurável via .env (GEMINI_MODELOS, separado por vírgula) — sem isso,
// trocar de modelo (ex.: quando o Google aposentar um, como já aconteceu com
// o gemini-2.0-flash) exigia editar código. Mantém esta lista como padrão.
const MODELOS_EM_ORDEM = process.env.GEMINI_MODELOS
  ? process.env.GEMINI_MODELOS.split(',').map(m => m.trim()).filter(Boolean)
  : ['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-3.6-flash'];

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 120000;

function configurado() {
  return !!process.env.GEMINI_API_KEY;
}

// Cancelamento pedido por quem chamou (tempo-limite da cadeia de IA): para na
// hora — sem nova tentativa e sem passar ao próximo modelo (cada tentativa gasta cota).
const erroCancelado = (signal) => Object.assign(new Error('Gemini: pedido cancelado'), { cancelado: true, semRetry: true, causa: signal?.reason });

// espera que termina antes se o pedido for cancelado
const esperar = (ms, signal) => new Promise((resolve) => {
  if (signal?.aborted) return resolve();
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
});

async function chamarUmModelo({ modelo, body, tentativas, signal }) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    if (signal?.aborted) throw erroCancelado(signal);
    // chave no cabeçalho, não na URL (URL vai parar em logs e mensagens de erro);
    // timeout: sem ele, uma conexão pendurada travava a análise/leitura para sempre
    let data;
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify(body),
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
        }
      );
      data = await resp.json().catch(() => ({ error: { message: `resposta HTTP ${resp.status} sem JSON`, status: resp.status >= 500 ? 'UNAVAILABLE' : '' } }));
    } catch (err) {
      if (signal?.aborted) throw erroCancelado(signal);
      if (err.name !== 'TimeoutError' && err.name !== 'AbortError') throw err;
      data = { error: { message: `sem resposta em ${TIMEOUT_MS / 1000} s`, status: 'UNAVAILABLE' } };
    }

    if (!data.error) {
      const texto = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (!texto) throw Object.assign(new Error('Gemini não retornou texto na resposta'), { semRetry: true });
      return texto;
    }

    ultimoErro = data.error;
    // RESOURCE_EXHAUSTED = cota do dia estourada pra esse modelo — não adianta
    // insistir no mesmo modelo, precisa trocar (isso é decidido por quem chama).
    if (ultimoErro.status === 'RESOURCE_EXHAUSTED') {
      throw Object.assign(new Error(ultimoErro.message), { cotaEstourada: true });
    }
    // 503 = modelo sobrecarregado, é transitório — vale tentar de novo com espera
    if (ultimoErro.status !== 'UNAVAILABLE' || tentativa === tentativas) break;
    await esperar(3000 * tentativa, signal);
  }

  throw new Error(`Gemini (${modelo}): ${ultimoErro?.message || 'erro desconhecido'}`);
}

// `anexos`: [{ mime, base64 }] — PDF ou imagem enviados junto (leitura de
// orçamento de fornecedor, sempre conferida por quem chama: ver leitorCotacaoIA.js).
// `signal` (AbortSignal, opcional): cancela a chamada em andamento e as seguintes
async function chamarGemini({ prompt, json = false, busca = false, tentativas = 3, modelo, anexos = [], signal }) {
  if (!configurado()) {
    throw new Error('GEMINI_API_KEY não configurada no .env');
  }

  const body = {
    contents: [{ parts: [...anexos.map(a => ({ inline_data: { mime_type: a.mime, data: a.base64 } })), { text: prompt }] }],
  };
  if (busca) body.tools = [{ google_search: {} }];
  // A API não permite combinar tools (busca) com responseMimeType — só usa
  // JSON estruturado quando não há busca na web.
  if (json && !busca) body.generationConfig = { responseMimeType: 'application/json' };

  const modelos = modelo ? [modelo] : MODELOS_EM_ORDEM;
  let ultimoErro;
  for (const m of modelos) {
    try {
      return await chamarUmModelo({ modelo: m, body, tentativas, signal });
    } catch (err) {
      ultimoErro = err;
      if (!err.cotaEstourada) throw err; // erro que não é de cota não tenta outro modelo
      // cota estourada nesse modelo — tenta o próximo da lista
    }
  }
  throw ultimoErro;
}

module.exports = { chamarGemini, configurado, MODELOS_EM_ORDEM };
