#!/usr/bin/env node
// MCP do ASSISTENTE VIRTUAL (servidor "hm"). Diferente do mcpServer.mjs (Claude
// Desktop, usuário dedicado do .env), este NÃO é registrado no Claude Desktop:
// o backend o inicia a cada mensagem do assistente, pelo --mcp-config
// temporário do `claude -p` (services/assistente/execucao.js), com:
//   ASSISTENTE_API_URL   endereço da API do sistema (ex.: http://127.0.0.1:3001)
//   ASSISTENTE_TOKEN     token curto do usuário logado, escopo 'assistente',
//                        válido só enquanto a execução está no ar
//   ASSISTENTE_CONTEXTO  JSON com a tela aberta (obra, proposta, análise, projeto)
// Não lê o .env do backend, não abre porta e não acessa banco nem disco: tudo
// passa pela API, com as regras do servidor (middleware/escopoAssistente.js).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { criarApi, definirFerramentas } from './assistenteFerramentas.mjs';

const url = process.env.ASSISTENTE_API_URL;
const token = process.env.ASSISTENTE_TOKEN;
if (!url || !token) {
  console.error('assistenteMcp: faltam ASSISTENTE_API_URL/ASSISTENTE_TOKEN (este servidor é iniciado pelo backend).');
  process.exit(1);
}
let contexto = {};
try { contexto = JSON.parse(process.env.ASSISTENTE_CONTEXTO || '{}') || {}; } catch { contexto = {}; }

const servidor = new McpServer({ name: 'hm', version: '1.0.0' });
for (const f of definirFerramentas({ api: criarApi({ url, token }), contexto, token })) {
  servidor.registerTool(f.nome, { title: f.titulo, description: f.descricao, inputSchema: f.entrada }, f.executar);
}

await servidor.connect(new StdioServerTransport());
// o Claude Code fechou (fim da execução, cancelamento): sai junto
process.stdin.on('end', () => process.exit(0));
process.stdin.on('close', () => process.exit(0));
