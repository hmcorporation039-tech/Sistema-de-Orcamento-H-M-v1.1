#!/usr/bin/env node
// Servidor MCP (Model Context Protocol) do sistema H&M Engenharia — o do Claude Desktop
// ("hm-orcamentos").
//
// Diferente de uma primeira versão que existiu neste projeto (chamava os
// módulos internos do backend direto, sem passar pela API), este servidor
// fala com o sistema exatamente como o navegador fala: faz login com um
// usuário dedicado e chama os mesmos endpoints REST que a tela usa. Isso
// significa que toda ferramenta aqui herda de graça a validação, o
// recálculo de totais no servidor e a trilha de auditoria (proposta_eventos)
// que já protegem o resto do sistema — não existe um caminho "por trás" que
// pudesse divergir do que a tela faz.
//
// Roda LOCAL, via stdio (não abre porta de rede — só o Claude Desktop no
// mesmo PC fala com ele). Documentação de configuração: backend/src/mcp/README.md
// e README.md (seção 9) na raiz do projeto.
//
// LISTA ÚNICA (INT-05, Fase 6): as ferramentas não são mais escritas aqui. Vêm do
// catálogo (catalogoFerramentas.mjs) — as mesmas do assistente do sistema e do
// canal Telegram/WhatsApp (assistenteFerramentas.mjs), mais as que só existem no
// Desktop (ferramentasDesktop.mjs: analisar_projeto com arquivo do disco, sempre
// conferido por regras.conferirPdfPermitido; salvar_pesquisa_mercado; criar_rascunho_proposta…),
// com os mesmos nomes e parâmetros de antes.
//
// Filosofia mantida do resto do sistema: a maioria das ferramentas é
// consultiva (leitura). As exceções são criar_rascunho_proposta e
// analisar_projeto — que deliberadamente criam RASCUNHOS pra revisão humana,
// nunca enviam nada ao cliente sozinhas.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import dotenv from 'dotenv';
import { createRequire } from 'node:module';
import { ferramentasDoServidor, registrarFerramentas } from './catalogoFerramentas.mjs';

// Processo à parte do resto do backend — não herda o .env sozinho (o Claude
// Desktop spawna isto direto, sem passar pela inicialização normal do
// server.js). O .env fica dois níveis acima (backend/.env).
dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '.env') });

// Sem MCP_API_URL, usa a PORT do mesmo .env (como o MCP do assistente,
// services/assistente/config.js): no ambiente de teste (3002) o padrão fixo
// 3001 mandava as gravações para a PRODUÇÃO.
const API_URL = process.env.MCP_API_URL || `http://localhost:${process.env.PORT || 3001}`;
const LOGIN_EMAIL = process.env.MCP_LOGIN_EMAIL;
const LOGIN_SENHA = process.env.MCP_LOGIN_SENHA;

const requerer = createRequire(import.meta.url);
// regras de segurança (pastas permitidas para o arquivo de projeto)
const { pastasPermitidasPdf } = requerer('./regras.js');
const PASTAS_PDF = pastasPermitidasPdf(process.env);

// ── Autenticação ──────────────────────────────────────────────────────────
// Faz login uma vez e reaproveita o token. Se uma chamada voltar 401 (token
// vencido, sessão encerrada, conta desativada, senha trocada), reloga uma vez
// antes de desistir.
let tokenCache = { token: null, expiraEm: 0 };

async function login() {
  if (!LOGIN_EMAIL || !LOGIN_SENHA) {
    throw new Error(
      'MCP_LOGIN_EMAIL/MCP_LOGIN_SENHA não configurados no backend/.env — veja backend/src/mcp/README.md para criar o usuário dedicado.'
    );
  }
  const resp = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, senha: LOGIN_SENHA }),
  });
  const data = await resp.json().catch(() => ({}));
  if (resp.ok && data.precisaTotp) {
    throw new Error('O usuário dedicado do MCP está com a verificação em duas etapas ligada: o servidor MCP não tem como digitar o código. Use um usuário dedicado sem TOTP (só no PC do escritório).');
  }
  if (!resp.ok || !data.token) {
    throw new Error(`Falha ao autenticar o servidor MCP (${resp.status}): ${data.erro || 'erro desconhecido'} — confira MCP_LOGIN_EMAIL/MCP_LOGIN_SENHA no .env`);
  }
  // o token de acesso das sessões é curto (SESSAO_TOKEN_MINUTOS, 15 min): reaproveita por 10 min e,
  // se voltar 401 antes, reloga (abaixo)
  tokenCache = { token: data.token, expiraEm: Date.now() + 10 * 60 * 1000 };
  return tokenCache.token;
}

async function obterToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiraEm) return tokenCache.token;
  return login();
}

// api(metodo, caminho, corpo, { formulario, binario }) — a mesma assinatura que as ferramentas da
// lista única usam (assistenteFerramentas.criarApi), com o login do usuário dedicado.
async function api(metodo, caminho, corpo, { formulario = false, binario = false } = {}) {
  const fazer = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    let body;
    if (formulario) body = corpo;
    else if (corpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corpo); }
    return fetch(`${API_URL}${caminho}`, { method: metodo, headers, body });
  };
  let resp = await fazer(await obterToken());
  if (resp.status === 401) {
    tokenCache = { token: null, expiraEm: 0 };
    resp = await fazer(await obterToken());
  }
  if (binario && resp.ok) return Buffer.from(await resp.arrayBuffer());
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const e = new Error(data.erro || `Erro ${resp.status} ao chamar ${caminho.split('?')[0]}`);
    e.status = resp.status;
    throw e;
  }
  return data;
}

const server = new McpServer({ name: 'hm-orcamentos', version: '2.1.0' });
registrarFerramentas(server, ferramentasDoServidor('desktop', { api, pastasPdf: PASTAS_PDF }));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Servidor MCP H&M Engenharia rodando (stdio) — API: ${API_URL}`);
}

main().catch(err => {
  console.error('Erro fatal no servidor MCP:', err);
  process.exit(1);
});
