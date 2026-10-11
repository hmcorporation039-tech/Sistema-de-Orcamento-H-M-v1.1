// Último recurso da leitura de orçamentos de fornecedor: quando nem os layouts
// conhecidos, nem o leitor universal, nem o OCR local acham os itens, o PDF ou
// a imagem vai para uma IA, que devolve os itens num formato fixo (JSON).
// Ordem (definida pelo usuário): Claude primeiro e Gemini como complemento.
//   1. Claude pela assinatura Claude Max do PC — o Claude Code em modo não
//      interativo (`claude -p`), que usa o login da conta Max e não consome
//      crédito de API. O backend roda com o mesmo usuário do Windows que fez o
//      login no Claude Code (caminho da CLI em CLAUDE_CLI_PATH, se mudar).
//   2. Claude pela API (ANTHROPIC_API_KEY), se houver crédito.
//   3. Gemini (cota gratuita), quando os anteriores falharem.
// Desliga tudo com COTACAO_IA=desligada; só a CLI, com COTACAO_IA_CLI=desligada.
//
// A IA nunca grava direto: quem chama (leitorCotacao.js) só aceita item cuja
// conta quantidade × unitário = total fecha e exige que a soma bata com um
// total do documento — é isso que protege contra a IA "inventar" itens.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { chamarGemini, configurado: geminiConfigurado } = require('./geminiClient');

const MODELO_CLAUDE = process.env.CLAUDE_MODELO_COTACAO || 'claude-haiku-4-5-20251001';
const MODELO_CLI = process.env.CLAUDE_CLI_MODELO || 'sonnet'; // Sonnet: acertou fotos onde o Haiku perdia linhas
const CAMINHO_CLI = process.env.CLAUDE_CLI_PATH || path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
const desligada = () => String(process.env.COTACAO_IA || '').toLowerCase() === 'desligada';
const cliDisponivel = () => String(process.env.COTACAO_IA_CLI || '').toLowerCase() !== 'desligada' && fs.existsSync(CAMINHO_CLI);

function iaDisponivel() {
  return !desligada() && (cliDisponivel() || geminiConfigurado() || !!process.env.ANTHROPIC_API_KEY);
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

const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };

async function comGemini(buffer, tipo) {
  const texto = await chamarGemini({
    prompt: `${INSTRUCOES}\nResponda SOMENTE com JSON neste formato: ${FORMATO}`,
    json: true, tentativas: 2, anexos: [{ mime: MIME[tipo], base64: buffer.toString('base64') }],
  });
  return JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ''));
}

async function comClaude(buffer, tipo) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  const dados = buffer.toString('base64');
  const anexo = tipo === 'pdf'
    ? { type: 'document', source: { type: 'base64', media_type: MIME.pdf, data: dados } }
    : { type: 'image', source: { type: 'base64', media_type: MIME[tipo], data: dados } };
  const resposta = await client.messages.create({
    model: MODELO_CLAUDE, max_tokens: 8000, tools: [ESQUEMA_CLAUDE], tool_choice: { type: 'tool', name: ESQUEMA_CLAUDE.name },
    messages: [{ role: 'user', content: [anexo, { type: 'text', text: INSTRUCOES }] }],
  });
  const uso = resposta.content.find(b => b.type === 'tool_use');
  if (!uso) throw new Error('Claude não devolveu os itens');
  return uso.input || {};
}

// Claude Code não interativo, com a conta Max logada no PC. O arquivo vai para
// uma pasta temporária própria (a CLI só pode usar a ferramenta Read, nada de
// comandos ou escrita) e é apagado no fim.
function comClaudeMax(buffer, tipo) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-cotacao-'));
  const arquivo = `cotacao-${crypto.randomBytes(4).toString('hex')}.${tipo}`;
  fs.writeFileSync(path.join(pasta, arquivo), buffer);
  const prompt = `${INSTRUCOES}\nO documento é o arquivo ${arquivo} desta pasta (leia com a ferramenta Read). `
    + `Responda SOMENTE com JSON neste formato, sem texto antes ou depois: ${FORMATO}`;
  return new Promise((resolve, reject) => {
    const filho = execFile(CAMINHO_CLI, ['-p', prompt, '--output-format', 'json', '--allowedTools', 'Read', '--model', MODELO_CLI, '--max-turns', '4'],
      { cwd: pasta, timeout: 240000, maxBuffer: 20 * 1024 * 1024, windowsHide: true },
      (erro, stdout, stderr) => {
        fs.rmSync(pasta, { recursive: true, force: true });
        if (erro) return reject(new Error(`Claude Code: ${(stderr || erro.message).trim().slice(0, 200)}`));
        try {
          const saida = JSON.parse(stdout);
          if (saida.is_error) return reject(new Error(`Claude Code: ${String(saida.result || 'erro').slice(0, 200)}`));
          const texto = String(saida.result || '');
          const json = texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
          resolve(JSON.parse(json));
        } catch (e) {
          reject(new Error(`Claude Code: resposta fora do formato (${e.message})`));
        }
      });
    filho.stdin.end(); // sem isso a CLI espera 3 s por dados na entrada padrão
  });
}

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
async function extrairComIA(buffer, tipo) {
  const erros = [];
  if (cliDisponivel()) {
    try { return normalizarResposta(await comClaudeMax(buffer, tipo), 'Claude Max'); } catch (e) { erros.push(e.message); }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try { return normalizarResposta(await comClaude(buffer, tipo), 'Claude'); } catch (e) { erros.push(`Claude: ${e.message}`); }
  }
  if (geminiConfigurado()) {
    try { return normalizarResposta(await comGemini(buffer, tipo), 'Gemini'); } catch (e) { erros.push(`Gemini: ${e.message}`); }
  }
  throw Object.assign(new Error(erros.join(' | ') || 'nenhuma IA configurada'), { indisponivel: true });
}

module.exports = { extrairComIA, iaDisponivel, MODELO_CLAUDE };
