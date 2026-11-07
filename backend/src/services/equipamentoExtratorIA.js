const ia = require('./ia');
const iaCache = require('./iaCache');
const { lerEquipamentosRef } = require('../utils/leitorEquipamentosRef');

// versão no nome: se o roteiro abaixo mudar, subir o número para não reaproveitar resposta antiga
const NOME_CACHE = 'equipamentos_projeto v1';

// Extrai a lista de equipamentos/materiais técnicos citados no projeto
// (cada um com um código REF. de fabricante) usando a IA para reorganizar
// o texto já extraído do PDF (pdf-parse) — não é a IA "lendo" o PDF sozinha,
// é reformatação de texto já dado a ela, tarefa validada como confiável
// (diferente de pedir pra ela listar ambientes de memória, onde ela alucina).
// Provedor pela cadeia única de services/ia.js (Claude Max → API → Gemini).
async function extrairEquipamentosComIA(textoCompleto) {
  if (!ia.disponivel()) {
    return { itens: [], aviso: 'Nenhuma IA configurada — extração de equipamentos por IA desativada' };
  }

  const prompt = `O documento é texto extraído (leitura de texto puro, sem OCR) de um PDF de projeto de engenharia. Ele contém várias seções misturadas: lista de ambientes com área, tabela de cabos, tabela de eletrodutos, códigos de circuito, e uma lista de equipamentos/materiais técnicos (cada um com atributos como COR, ALTURA, COMP., DENSIDADE, terminando em "REF.: <código>").

Extraia APENAS os itens de equipamento/material que tenham um código REF. associado (ignore ambientes, tabela de cabos/eletrodutos, códigos de circuito). USE SOMENTE o texto do documento, não invente itens nem complete texto que não está lá. Se dois itens forem idênticos (mesma descrição e referência), inclua só uma vez.

Responda em JSON: {"itens":[{"descricao":"...","referencia":"..."}]}`;

  try {
    // O mesmo texto de projeto (reenvio, reanálise) não gasta IA de novo: 90 dias. A lista VAZIA também fica guardada
    // (a IA já disse que não há equipamento neste texto — antes perguntava de novo a cada reanálise); erro da IA não, e
    // a resposta de quem leu só parte do texto (Claude Max com texto longo demais — ia.js, `parcial`) também não.
    const { valor, deCache } = await iaCache.comCache(NOME_CACHE, textoCompleto, { ttlDias: 90, cacheVazio: true, guardar: (v) => !v?.parcial }, async () => {
      // 90 s por provedor: é reformatar texto; sem o limite, com a CLI travada a análise inteira (no POST) esperava 4–5 min
      // por arquivo e a tela desistia (auditoria de IA de 04/11/2026)
      const { json: resultado, parcial } = await ia.perguntarJSON(prompt, { documento: textoCompleto, finalidade: 'equipamentos do projeto', timeoutMs: 90 * 1000 });
      const itens = Array.isArray(resultado?.itens) ? resultado.itens : [];
      return {
        itens: itens
          .filter(it => typeof it?.descricao === 'string' && it.descricao.trim().length > 3)
          .map(it => ({ descricao: it.descricao.trim(), referencia_fabricante: it.referencia ? String(it.referencia) : null })),
        ...(parcial ? { parcial: true } : {}),
      };
    });
    const { parcial, ...resto } = valor || { itens: [] };
    return { ...resto, itens: resto.itens || [], ...(deCache ? { deCache: true } : {}), ...(parcial ? { aviso: 'o texto do projeto é longo demais para a IA ler inteiro — a lista pode estar incompleta' } : {}) };
  } catch (err) {
    return { itens: [], aviso: `Extração de equipamentos por IA falhou: ${err.message}` };
  }
}

// Leitor LOCAL primeiro (plano "sistema autônomo", 03/11/2026 — utils/leitorEquipamentosRef.js): antes, todo arquivo
// ia para a IA, mesmo o que não tinha nenhum "REF.". Agora:
//   - sem "REF.:" no texto: não há o que extrair (nada de IA);
//   - o leitor local leu o código de quase todos (COBERTURA_LOCAL): fica a leitura local, e conta como resolvido sem IA;
//   - leitura local fraca: pergunta à IA (com o cache de 90 dias); se a IA não responder, fica o que o leitor local leu.
const COBERTURA_LOCAL = 0.8;
async function extrairEquipamentos(textoCompleto) {
  const local = lerEquipamentosRef(textoCompleto);
  if (!local.marcadores) return { itens: [], fonte: 'local' };
  const semRef = ({ fabricante, ...it }) => it; // o mesmo formato da resposta da IA
  if (local.completos / local.marcadores >= COBERTURA_LOCAL) {
    await iaCache.registrarUso(NOME_CACHE, 'sem_ia');
    return { itens: local.itens.map(semRef), fonte: 'local' };
  }
  const daIA = await extrairEquipamentosComIA(textoCompleto);
  // a resposta da IA não substitui a leitura local às cegas: o código que ela devolve tem de estar no texto (senão é
  // invenção) e o que o leitor local já leu fica; a IA só completa os que faltavam
  const chave = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const noTexto = chave(textoCompleto);
  const daIAValidos = daIA.itens.filter(it => !it.referencia_fabricante || (chave(it.referencia_fabricante).length >= 3 && noTexto.includes(chave(it.referencia_fabricante))));
  if (daIAValidos.length) {
    const locais = local.itens.map(semRef);
    const jaLidos = new Set(locais.map(it => chave(it.referencia_fabricante)).filter(Boolean));
    // o que veio da IA fica MARCADO (sugerido_ia): a análise mostra "sugerido pela IA — conferir" e o orçamento o trata como
    // sugestão (revisão do uso de IA de 06/11/2026)
    const novos = daIAValidos.filter(it => !it.referencia_fabricante || !jaLidos.has(chave(it.referencia_fabricante)))
      .map(it => ({ ...it, sugerido_ia: true }));
    const descartados = daIA.itens.length - daIAValidos.length;
    return { itens: [...locais, ...novos], fonte: locais.length ? 'local+ia' : 'ia', ...(daIA.deCache ? { deCache: true } : {}), ...(descartados ? { aviso: `${descartados} equipamento(s) sugerido(s) pela IA com código que não está no texto do projeto ficaram fora` } : {}) };
  }
  return { itens: local.itens.map(semRef), fonte: 'local', ...(daIA.aviso ? { aviso: `${daIA.aviso} — ficou a leitura local (${local.completos} de ${local.marcadores} códigos lidos)` } : {}) };
}

module.exports = { extrairEquipamentosComIA, extrairEquipamentos, COBERTURA_LOCAL };
