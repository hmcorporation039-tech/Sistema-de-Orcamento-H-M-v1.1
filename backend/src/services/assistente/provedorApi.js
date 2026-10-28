// Adaptador do assistente pela API da Anthropic (tool use), para quando a
// assinatura Max não puder ser usada. DESLIGADO por padrão (a API está sem
// crédito): liga com ASSISTENTE_PROVEDOR=api e ANTHROPIC_API_KEY no .env.
//
// Usa as MESMAS ferramentas do caminho do Claude Code: sobe o MCP do assistente
// (src/mcp/assistenteMcp.mjs) como cliente MCP, com o mesmo token curto, e faz o
// laço "modelo pede ferramenta → MCP executa → resultado volta ao modelo". As
// garantias do servidor (rotas permitidas, só altera o que criou, ações
// pendentes) são as mesmas, porque quem chama a API do sistema é o MCP.
//
// Diferenças: a conversa anterior vai como histórico de texto (a API não tem a
// sessão do Claude Code) e não há streaming de texto token a token (o texto
// aparece a cada passo).
const MAX_PASSOS_PADRAO = 30;

async function executarPelaApi({ cfg, mensagem, historico = [], sistema, mcp, interpretador, signal, tempoLimiteMs, criarCliente }) {
  if (!process.env.ANTHROPIC_API_KEY && !criarCliente) {
    return { codigo: 1, stderr: 'ANTHROPIC_API_KEY não configurada (ASSISTENTE_PROVEDOR=api)' };
  }
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const transporte = new StdioClientTransport({ command: mcp.command, args: mcp.args, env: { ...require('./claudeCli').ambienteFiltrado(), ...mcp.env } });
  const clienteMcp = new Client({ name: 'hm-assistente-api', version: '1.0.0' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), tempoLimiteMs || 600000);
  const sinal = signal ? AbortSignal.any([signal, ctrl.signal]) : ctrl.signal;
  let estourou = false;
  ctrl.signal.addEventListener('abort', () => { estourou = true; }, { once: true });
  try {
    await clienteMcp.connect(transporte);
    const { tools } = await clienteMcp.listTools();
    const ferramentas = tools.map(t => ({ name: t.name, description: t.description || '', input_schema: t.inputSchema }));
    const anthropic = criarCliente ? criarCliente() : new (require('@anthropic-ai/sdk'))();
    const mensagens = [
      ...historico.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      { role: 'user', content: mensagem },
    ];
    // a API exige alternância user/assistant começando por user
    while (mensagens.length > 1 && mensagens[0].role !== 'user') mensagens.shift();
    interpretador.processar({ type: 'system', subtype: 'init', session_id: null, tools: ferramentas.map(f => `mcp__hm__${f.name}`), model: cfg.modeloApi });
    let passos = 0;
    for (;;) {
      if (sinal.aborted) break;
      const r = await anthropic.messages.create({ model: cfg.modeloApi, max_tokens: 4096, system: sistema, tools: ferramentas, messages: mensagens }, { signal: sinal });
      const id = r.id;
      // reaproveita o interpretador do stream-json (mesma linha do tempo na tela)
      for (const b of r.content) {
        interpretador.processar({ type: 'assistant', message: { id, content: [b.type === 'tool_use' ? { ...b, name: `mcp__hm__${b.name}` } : b] } });
      }
      mensagens.push({ role: 'assistant', content: r.content });
      const pedidos = r.content.filter(b => b.type === 'tool_use');
      if (r.stop_reason !== 'tool_use' || !pedidos.length) {
        interpretador.processar({ type: 'result', subtype: 'success', is_error: false, result: r.content.filter(b => b.type === 'text').map(b => b.text).join('\n'), num_turns: passos + 1 });
        break;
      }
      if (++passos > (cfg.maxTurnos || MAX_PASSOS_PADRAO)) {
        interpretador.processar({ type: 'result', subtype: 'error_max_turns', is_error: true });
        break;
      }
      const resultados = [];
      for (const p of pedidos) {
        let conteudo; let erro = false;
        try {
          const res = await clienteMcp.callTool({ name: p.name, arguments: p.input || {} });
          conteudo = res.content; erro = !!res.isError;
        } catch (e) {
          conteudo = [{ type: 'text', text: `Erro: ${e.message}` }]; erro = true;
        }
        interpretador.processar({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: p.id, content: conteudo, is_error: erro }] } });
        resultados.push({ type: 'tool_result', tool_use_id: p.id, content: conteudo, is_error: erro });
      }
      mensagens.push({ role: 'user', content: resultados });
    }
    return { codigo: 0, stderr: '', estourou: estourou && !signal?.aborted, cancelado: !!signal?.aborted };
  } catch (e) {
    return { codigo: 1, stderr: String(e.message || e).slice(0, 500), estourou: estourou && !signal?.aborted, cancelado: !!signal?.aborted };
  } finally {
    clearTimeout(timer);
    await clienteMcp.close().catch(() => {});
  }
}

module.exports = { executarPelaApi };
