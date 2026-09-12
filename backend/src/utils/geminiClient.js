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
const MODELOS_EM_ORDEM = ['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-3.6-flash'];

function configurado() {
  return !!process.env.GEMINI_API_KEY;
}

async function chamarUmModelo({ modelo, body, tentativas }) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await resp.json();

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
    await new Promise(r => setTimeout(r, 3000 * tentativa));
  }

  throw new Error(`Gemini (${modelo}): ${ultimoErro?.message || 'erro desconhecido'}`);
}

async function chamarGemini({ prompt, json = false, busca = false, tentativas = 3, modelo }) {
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

  const modelos = modelo ? [modelo] : MODELOS_EM_ORDEM;
  let ultimoErro;
  for (const m of modelos) {
    try {
      return await chamarUmModelo({ modelo: m, body, tentativas });
    } catch (err) {
      ultimoErro = err;
      if (!err.cotaEstourada) throw err; // erro que não é de cota não tenta outro modelo
      // cota estourada nesse modelo — tenta o próximo da lista
    }
  }
  throw ultimoErro;
}

module.exports = { chamarGemini, configurado };
