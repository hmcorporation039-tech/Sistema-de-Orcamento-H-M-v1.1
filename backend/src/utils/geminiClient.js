// Cliente fino pra API do Gemini (Google AI Studio). Usado só em tarefas bem
// restritas onde já validamos que a IA é confiável (reformatar texto já
// extraído do PDF, pesquisa de mercado com busca real) — nunca pra "ler" o
// PDF inteiro e responder de memória, onde já vimos alucinação alta (ex.:
// inventar nomes de ambiente que não existem no desenho).
const MODELO_PADRAO = 'gemini-2.5-flash';

function configurado() {
  return !!process.env.GEMINI_API_KEY;
}

async function chamarGemini({ prompt, json = false, busca = false, tentativas = 3, modelo = MODELO_PADRAO }) {
  if (!configurado()) {
    throw new Error('GEMINI_API_KEY não configurada no .env');
  }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (busca) body.tools = [{ google_search: {} }];
  // A API não permite combinar tools (busca) com responseMimeType — só usa
  // JSON estruturado quando não há busca na web.
  if (json && !busca) body.generationConfig = { responseMimeType: 'application/json' };

  let ultimoErro;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await resp.json();

    if (!data.error) {
      const texto = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (!texto) throw new Error('Gemini não retornou texto na resposta');
      return texto;
    }

    ultimoErro = data.error;
    // 503 = modelo sobrecarregado, é transitório — vale tentar de novo com espera
    if (data.error.status !== 'UNAVAILABLE' || tentativa === tentativas) break;
    await new Promise(r => setTimeout(r, 3000 * tentativa));
  }

  throw new Error(`Gemini: ${ultimoErro?.message || 'erro desconhecido'}`);
}

module.exports = { chamarGemini, configurado };
