// Catálogo único das ferramentas MCP do sistema (INT-05, Fase 6). Os dois servidores pegam a lista
// daqui, e ela vem de um lugar só:
//   - assistenteFerramentas.mjs: as ferramentas do sistema (cada uma diz se aparece só no assistente
//     ou também no Desktop, e que papéis veem as do financeiro);
//   - ferramentasDesktop.mjs: as que existem só no Claude Desktop (arquivo do disco, rascunho direto,
//     pesquisa gravada de fora) e os nomes antigos que o Desktop já usa.
// servidor 'assistente' → assistenteMcp.mjs (tela do assistente e canal Telegram/WhatsApp)
// servidor 'desktop'    → mcpServer.mjs (Claude Desktop, usuário dedicado do .env)
import { definirFerramentas } from './assistenteFerramentas.mjs';
import { definirFerramentasDesktop } from './ferramentasDesktop.mjs';

export function ferramentasDoServidor(servidor, { api, contexto = {}, token = '', papel = null, pastasPdf = [], lerArquivo } = {}) {
  if (servidor === 'assistente') return definirFerramentas({ api, contexto, token, papel, servidor: 'assistente' });
  if (servidor !== 'desktop') throw new Error(`Servidor MCP desconhecido: ${servidor}`);
  const comuns = definirFerramentas({ api, contexto, token, papel, servidor: 'desktop' });
  const proprias = definirFerramentasDesktop({ api, compartilhadas: new Map(comuns.map(f => [f.nome, f])), pastasPdf, lerArquivo });
  const vistas = new Set();
  for (const f of [...comuns, ...proprias]) {
    if (vistas.has(f.nome)) throw new Error(`Ferramenta definida duas vezes: ${f.nome}`);
    vistas.add(f.nome);
  }
  return [...comuns, ...proprias];
}

export function registrarFerramentas(servidorMcp, ferramentas) {
  for (const f of ferramentas) {
    servidorMcp.registerTool(f.nome, { title: f.titulo, description: f.descricao, inputSchema: f.entrada }, f.executar);
  }
}
