// Último recurso da leitura de orçamentos de fornecedor: quando nem os layouts
// conhecidos, nem o leitor universal, nem o OCR local acham os itens, o PDF ou
// a imagem vai para uma IA, que devolve os itens num formato fixo (JSON).
// Desde a 2.0 a escolha do provedor (Claude Max → API → Gemini, IA_ORDEM) e a
// execução isolada da CLI ficam no módulo único services/ia.js; aqui ficam só as
// instruções, o esquema e a normalização próprios do orçamento de fornecedor.
// Desliga tudo com COTACAO_IA=desligada; só a CLI, com COTACAO_IA_CLI=desligada.
//
// A IA nunca grava direto: quem chama (leitorCotacao.js) só aceita item cuja
// conta quantidade × unitário = total fecha e exige que a soma bata com um
// total do documento — é isso que protege contra a IA "inventar" itens.
const ia = require('./ia');

const MODELO_CLAUDE = process.env.CLAUDE_MODELO_COTACAO || 'claude-haiku-4-5-20251001';

function iaDisponivel() {
  return ia.disponivel();
}

const INSTRUCOES = 'Leia este documento recebido de um fornecedor pela H&M Engenharia (a H&M é o CLIENTE, não o fornecedor). '
  + 'Registre cada linha de produto com quantidade, preço unitário e total da linha EXATAMENTE como impressos, em números (ponto como separador decimal). '
  + 'Não invente itens; não inclua frete, impostos totais, parcelas nem serviços de entrega. '
  + 'Se não for orçamento, cotação, proposta ou pedido de venda de fornecedor com preços de produtos, responda eh_orcamento_de_fornecedor=false e itens vazio.';

const FORMATO = '{"eh_orcamento_de_fornecedor": boolean, "fornecedor": string|null, "total_documento": number|null (total dos produtos impresso, sem frete), '
  + '"itens": [{"descricao": string (completa, com modelo/código do fabricante), "codigo": string|null, "marca": string|null, "unidade": string|null, '
  + '"quantidade": number, "preco_unitario": number (como impresso, sem somar impostos destacados), "total_linha": number|null, '
  + '"ipi_percentual": number|null (só se o IPI vier destacado à parte do preço), "ncm": string|null}]}';

const ESQUEMA_CLAUDE = {
  name: 'registrar_itens_cotacao',
  description: 'Registra os itens (produtos/materiais) de um orçamento ou cotação de fornecedor.',
  input_schema: {
    type: 'object',
    properties: {
      eh_orcamento_de_fornecedor: { type: 'boolean' },
      fornecedor: { type: ['string', 'null'] },
      total_documento: { type: ['number', 'null'] },
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            descricao: { type: 'string' }, codigo: { type: ['string', 'null'] }, marca: { type: ['string', 'null'] }, unidade: { type: ['string', 'null'] },
            quantidade: { type: 'number' }, preco_unitario: { type: 'number' }, total_linha: { type: ['number', 'null'] },
            ipi_percentual: { type: ['number', 'null'] }, ncm: { type: ['string', 'null'] },
          },
          required: ['descricao', 'quantidade', 'preco_unitario'],
        },
      },
    },
    required: ['eh_orcamento_de_fornecedor', 'itens'],
  },
};

function normalizarResposta(r, fonte) {
  return {
    fonte,
    ehOrcamento: !!r.eh_orcamento_de_fornecedor,
    fornecedor: r.fornecedor || null,
    totalDocumento: Number(r.total_documento) || null,
    itens: (Array.isArray(r.itens) ? r.itens : []).map(i => ({
      descricao: String(i.descricao || '').replace(/\s+/g, ' ').trim(),
      codigo: i.codigo || null,
      marca: i.marca || '',
      unidade: String(i.unidade || 'un').toLowerCase().slice(0, 10),
      quantidade: Number(i.quantidade),
      precoImpresso: Number(i.preco_unitario),
      total: i.total_linha == null ? null : Number(i.total_linha),
      ipi: Number(i.ipi_percentual) || 0,
      ncm: i.ncm ? String(i.ncm).replace(/\D/g, '') || null : null,
    })),
  };
}

// Devolve { fonte, ehOrcamento, itens, ... }. Lança erro com `indisponivel`
// quando nenhuma IA respondeu (sem crédito, cota estourada, rede) — nesse caso
// o documento fica pendente e é tentado de novo na próxima varredura.
// Cada provedor recebe o mesmo texto da 1.x: a CLI lê o arquivo com o formato
// no prompt, a API usa o esquema fixo (ferramenta) e o Gemini, o formato no prompt.
async function extrairComIA(buffer, tipo) {
  const r = await ia.perguntarJSON({
    padrao: `${INSTRUCOES}\nFormato do JSON: ${FORMATO}`,
    claude_max: `${INSTRUCOES}\nFormato do JSON: ${FORMATO}`,
    claude_api: INSTRUCOES,
    gemini: `${INSTRUCOES}\nResponda SOMENTE com JSON neste formato: ${FORMATO}`,
  }, { anexo: { buffer, tipo }, esquema: ESQUEMA_CLAUDE, modeloApi: MODELO_CLAUDE, finalidade: 'leitura de orçamento de fornecedor' });
  return normalizarResposta(r.json || {}, r.fonte);
}

// argsClaudeMax: reexportado para o teste de segurança (testes/seguranca.test.js);
// a implementação mora em services/ia.js.
module.exports = { extrairComIA, iaDisponivel, normalizarResposta, argsClaudeMax: ia.argsClaudeMax };
