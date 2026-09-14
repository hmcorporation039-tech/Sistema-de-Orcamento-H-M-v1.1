#!/usr/bin/env node
// Servidor MCP (Model Context Protocol) do sistema H&M Engenharia.
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
// Filosofia mantida do resto do sistema: a maioria das ferramentas é
// consultiva (leitura). A exceção é criar_rascunho_proposta — que
// deliberadamente cria a proposta como RASCUNHO pra revisão humana no
// Histórico, nunca envia nada ao cliente sozinha.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Processo à parte do resto do backend — não herda o .env sozinho (o Claude
// Desktop spawna isto direto, sem passar pela inicialização normal do
// server.js). O .env fica dois níveis acima (backend/.env).
dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '.env') });

const API_URL = process.env.MCP_API_URL || 'http://localhost:3001';
const LOGIN_EMAIL = process.env.MCP_LOGIN_EMAIL;
const LOGIN_SENHA = process.env.MCP_LOGIN_SENHA;

const DISCIPLINAS_VALIDAS = ['eletrica', 'rede', 'cabeamento', 'telefonia', 'cftv', 'iluminacao', 'automacao', 'alarme', 'antena'];

// ── Autenticação ──────────────────────────────────────────────────────────
// Faz login uma vez e reaproveita o token por até ~7h30 (o token real dura
// 8h — a margem evita usar um token na borda de expirar no meio de uma
// chamada). Se uma chamada voltar 401 (conta desativada, senha trocada,
// token realmente expirado), reloga uma vez antes de desistir.
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
  if (!resp.ok) {
    throw new Error(`Falha ao autenticar o servidor MCP (${resp.status}): ${data.erro || 'erro desconhecido'} — confira MCP_LOGIN_EMAIL/MCP_LOGIN_SENHA no .env`);
  }
  tokenCache = { token: data.token, expiraEm: Date.now() + 7.5 * 60 * 60 * 1000 };
  return tokenCache.token;
}

async function obterToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiraEm) return tokenCache.token;
  return login();
}

// Chama um endpoint da API já autenticado. `caminho` começa com "/api/...".
// Relogar uma vez em caso de 401 cobre o caso de o token cair fora de
// validade por um motivo que não seja simplesmente o tempo (ex.: a conta foi
// desativada e reativada de novo).
async function chamarApi(caminho, opcoes = {}) {
  const fazer = async (token) => fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { ...(opcoes.body && !(opcoes.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(opcoes.headers || {}) },
  });

  let token = await obterToken();
  let resp = await fazer(token);
  if (resp.status === 401) {
    tokenCache = { token: null, expiraEm: 0 };
    token = await obterToken();
    resp = await fazer(token);
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.erro || `Erro ${resp.status} ao chamar ${caminho}`);
  }
  return data;
}

const server = new McpServer({ name: 'hm-orcamentos', version: '2.0.0' });

function textoOk(texto) {
  return { content: [{ type: 'text', text: texto }] };
}
function textoErro(mensagem) {
  return { content: [{ type: 'text', text: `Erro: ${mensagem}` }], isError: true };
}

// ── buscar_material ──────────────────────────────────────────────────────
server.registerTool(
  'buscar_material',
  {
    title: 'Buscar material no catálogo',
    description: 'Busca materiais/equipamentos já cadastrados no catálogo da empresa por descrição, código ou marca. Retorna preço de venda e de compra quando existirem.',
    inputSchema: {
      descricao: z.string().describe('Texto a buscar (descrição, código ou marca do material)'),
      limite: z.number().int().min(1).max(50).optional().describe('Máximo de resultados (padrão 10)'),
    },
  },
  async ({ descricao, limite }) => {
    try {
      const params = new URLSearchParams({ busca: descricao, porPagina: String(limite || 10) });
      const dados = await chamarApi(`/api/materiais?${params}`);
      const itens = dados.itens || [];
      if (itens.length === 0) return textoOk(`Nenhum material encontrado no catálogo para "${descricao}".`);
      const linhas = itens.map(m =>
        `#${m.id} [${m.categoria}] ${m.descricao}${m.marca ? ` (${m.marca})` : ''} — venda: R$ ${Number(m.preco).toFixed(2)}${m.preco_compra != null ? `, compra: R$ ${Number(m.preco_compra).toFixed(2)}` : ''} — ${m.unidade}`
      );
      return textoOk(`${itens.length} material(is) encontrado(s):\n${linhas.join('\n')}`);
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── comparar_com_catalogo ────────────────────────────────────────────────
server.registerTool(
  'comparar_com_catalogo',
  {
    title: 'Comparar item com o catálogo',
    description: 'Verifica se um item (descrito livremente, ex.: vindo de um projeto ou orçamento) já existe no catálogo da empresa, com que confiança (índice de Jaccard) e qual seria o preço sugerido. Não inventa preço: só responde quando a correspondência é razoável (>= 45%).',
    inputSchema: {
      descricao: z.string().describe('Descrição do item a comparar (ex.: "câmera dome 4MP infravermelho")'),
    },
  },
  async ({ descricao }) => {
    try {
      const dados = await chamarApi('/api/materiais/comparar', { method: 'POST', body: JSON.stringify({ descricao }) });
      const c = dados.correspondencia;
      if (!c) return textoOk(`Nenhuma correspondência confiável no catálogo para "${descricao}" — não há item parecido o bastante pra sugerir preço.`);
      return textoOk(
        `Correspondência encontrada (confiança ${c.confianca}%):\n` +
        `#${c.material_id} ${c.descricao_catalogo} — R$ ${Number(c.preco_catalogo).toFixed(2)} / ${c.unidade_catalogo}\n` +
        (c.confianca < 70 ? 'Confiança abaixo de 70% — confirme visualmente antes de usar esse preço.' : '')
      );
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── pesquisar_preco_mercado ───────────────────────────────────────────────
server.registerTool(
  'pesquisar_preco_mercado',
  {
    title: 'Pesquisar preço de mercado',
    description: 'Pesquisa o preço de mercado atual (busca real na web, Gemini com fallback pago no Claude) para um material/equipamento. Resultados de até 48h são reaproveitados de um cache — não gasta cota/dinheiro pesquisando a mesma coisa duas vezes.',
    inputSchema: {
      descricao: z.string().describe('Material/equipamento a pesquisar (ex.: "câmera IP dome 4MP")'),
    },
  },
  async ({ descricao }) => {
    try {
      const r = await chamarApi('/api/pesquisa-mercado', { method: 'POST', body: JSON.stringify({ descricao }) });
      const origem = r.deCache ? `resultado em cache, pesquisado em ${new Date(r.pesquisadoEm).toLocaleString('pt-BR')}` : `pesquisa nova via ${r.fonte}`;
      return textoOk(`Pesquisa de mercado para "${r.descricao}" (${origem}):\n\n${r.resultado}`);
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── historico_preco ───────────────────────────────────────────────────────
server.registerTool(
  'historico_preco',
  {
    title: 'Histórico de preço pesquisado',
    description: 'Mostra o preço atual no catálogo de um material (se existir) e o histórico de pesquisas de mercado já feitas para descrições parecidas — não é histórico de preço de compra/venda por nota fiscal (o sistema ainda não guarda isso), é o que já foi pesquisado na web ao longo do tempo.',
    inputSchema: {
      descricao: z.string().describe('Descrição do material (ex.: "câmera dome 4MP")'),
    },
  },
  async ({ descricao }) => {
    try {
      const [catalogo, pesquisas] = await Promise.all([
        chamarApi(`/api/materiais?${new URLSearchParams({ busca: descricao, porPagina: '3' })}`),
        chamarApi(`/api/pesquisa-mercado/historico?${new URLSearchParams({ descricao, limite: '5' })}`),
      ]);
      const partes = [];
      const itensCatalogo = catalogo.itens || [];
      if (itensCatalogo.length > 0) {
        partes.push('No catálogo hoje:');
        itensCatalogo.forEach(m => partes.push(`  • #${m.id} ${m.descricao} — venda: R$ ${Number(m.preco).toFixed(2)}${m.preco_compra != null ? `, compra: R$ ${Number(m.preco_compra).toFixed(2)}` : ''} / ${m.unidade}`));
      } else {
        partes.push('Nenhum material no catálogo bate com essa descrição.');
      }
      if (pesquisas.length > 0) {
        partes.push('\nPesquisas de mercado já feitas (mais recente primeiro):');
        pesquisas.forEach(r => partes.push(`  • ${new Date(r.criado_em).toLocaleDateString('pt-BR')} (${r.fonte}) — "${r.descricao}":\n    ${r.resultado.slice(0, 300)}${r.resultado.length > 300 ? '...' : ''}`));
      } else {
        partes.push('\nNenhuma pesquisa de mercado registrada ainda para essa descrição — use a ferramenta pesquisar_preco_mercado.');
      }
      return textoOk(partes.join('\n'));
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── analisar_projeto ──────────────────────────────────────────────────────
server.registerTool(
  'analisar_projeto',
  {
    title: 'Analisar projeto (PDF)',
    description: `Envia um PDF de projeto de engenharia (planta de CFTV, cabeamento, elétrica etc.) já salvo no PC pro mesmo analisador da tela "Análise de Projeto" — ambientes, câmeras, pontos de rede/antena, achados de compatibilização e rascunho de serviços/materiais. IMPORTANTE: isso cria uma análise SALVA no sistema (aparece em "Análises salvas", do jeito que aconteceria enviando o PDF pela tela) — não é uma leitura descartável. Disciplinas válidas: ${DISCIPLINAS_VALIDAS.join(', ')}.`,
    inputSchema: {
      caminho_pdf: z.string().describe('Caminho completo do arquivo PDF no PC'),
      disciplinas: z.array(z.string()).describe(`Disciplinas desse arquivo (uma ou mais entre: ${DISCIPLINAS_VALIDAS.join(', ')})`),
    },
  },
  async ({ caminho_pdf, disciplinas }) => {
    try {
      if (!fs.existsSync(caminho_pdf)) return textoErro(`Arquivo não encontrado: ${caminho_pdf}`);
      const validas = disciplinas.filter(d => DISCIPLINAS_VALIDAS.includes(d));
      if (validas.length === 0) return textoErro(`Nenhuma disciplina válida informada. Use uma ou mais entre: ${DISCIPLINAS_VALIDAS.join(', ')}`);

      const buffer = fs.readFileSync(caminho_pdf);
      const form = new FormData();
      form.append('arquivos', new Blob([buffer], { type: 'application/pdf' }), path.basename(caminho_pdf));
      form.append('disciplinasPorArquivo', JSON.stringify([validas]));

      const resultado = await chamarApi('/api/projetos/analisar', { method: 'POST', body: form });

      const partes = [];
      partes.push(`Análise salva (id ${resultado.id}) — cliente identificado: ${resultado.cliente || '(não identificado no texto do PDF)'}`);
      partes.push(`Ambientes identificados: ${resultado.ambientes.length}`);
      if (validas.includes('cftv')) partes.push(`Câmeras (código CAMx): ${resultado.cameras.total}`);
      if (validas.includes('rede')) partes.push(`Pontos de rede (código Rx): ${resultado.pontosRedeAntena.rede.total}`);
      if (validas.includes('antena')) partes.push(`Pontos de TV/antena (código Ax): ${resultado.pontosRedeAntena.antena.total}`);
      if (resultado.achados.length > 0) {
        partes.push(`\nCompatibilização — ${resultado.achados.length} pendência(s):`);
        resultado.achados.forEach(a => partes.push(`  • ${a.tema}: ${a.observacao}`));
      }
      const servicosAOrcar = resultado.servicos.filter(s => !s.pronto);
      if (servicosAOrcar.length > 0) {
        partes.push(`\nServiços (mão de obra) a orçar — ${servicosAOrcar.length} item(ns):`);
        servicosAOrcar.forEach(s => partes.push(`  • ${s.descricao}: ${s.quantidade} ${s.unidade}${s.observacao ? ` — ${s.observacao}` : ''}`));
      }
      const materiaisAOrcar = resultado.materiais.filter(m => !m.pronto);
      if (materiaisAOrcar.length > 0) {
        partes.push(`\nMateriais/equipamentos a orçar — ${materiaisAOrcar.length} item(ns):`);
        materiaisAOrcar.forEach(m => partes.push(`  • ${m.descricao}: ${m.quantidade} ${m.unidade}${m.preco_catalogo != null ? ` — catálogo: R$ ${Number(m.preco_catalogo).toFixed(2)} (${m.confianca_catalogo}% match)` : ' — sem correspondência no catálogo'}`));
      }
      partes.push(`\n(Salva como análise #${resultado.id} — abra "Análise de Projeto" no sistema pra revisar, editar preços e gerar um orçamento a partir dela, ou peça pra criar_rascunho_proposta direto por aqui.)`);

      return textoOk(partes.join('\n'));
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── listar_propostas ─────────────────────────────────────────────────────
server.registerTool(
  'listar_propostas',
  {
    title: 'Listar propostas',
    description: 'Lista propostas/orçamentos já cadastrados no sistema, com filtro opcional por status ou por texto (número, cliente, local da obra).',
    inputSchema: {
      status: z.enum(['Ativa', 'Aprovada', 'Recusada', 'Cancelada']).optional().describe('Filtrar por status'),
      busca: z.string().optional().describe('Texto livre — casa com número, cliente ou local da obra'),
      limite: z.number().int().min(1).max(50).optional().describe('Máximo de resultados (padrão 15)'),
    },
  },
  async ({ status, busca, limite }) => {
    try {
      const params = new URLSearchParams({ porPagina: String(limite || 15) });
      if (status) params.set('status', status);
      if (busca) params.set('busca', busca);
      const dados = await chamarApi(`/api/propostas?${params}`);
      const itens = dados.itens || [];
      if (itens.length === 0) return textoOk('Nenhuma proposta encontrada com esse filtro.');
      const linhas = itens.map(p => `${p.numero} — ${p.cliente_nome || '(sem cliente)'} — ${p.status} — R$ ${Number(p.total).toFixed(2)} — ${new Date(p.data).toLocaleDateString('pt-BR')}`);
      return textoOk(linhas.join('\n'));
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── buscar_proposta ───────────────────────────────────────────────────────
server.registerTool(
  'buscar_proposta',
  {
    title: 'Buscar proposta por número',
    description: 'Traz os detalhes completos de uma proposta pelo número (ex.: "P045"), incluindo os itens de cada seção.',
    inputSchema: {
      numero: z.string().describe('Número da proposta, ex.: P045'),
    },
  },
  async ({ numero }) => {
    try {
      const alvo = numero.trim().toUpperCase();
      const lista = await chamarApi(`/api/propostas?${new URLSearchParams({ busca: alvo, porPagina: '5' })}`);
      const encontrada = (lista.itens || []).find(p => p.numero === alvo);
      if (!encontrada) return textoErro(`Proposta ${alvo} não encontrada.`);

      const p = await chamarApi(`/api/propostas/${encontrada.id}`);
      const partes = [
        `Proposta ${p.numero} — ${p.cliente_nome || '(sem cliente)'} — status: ${p.status}`,
        `Data: ${new Date(p.data).toLocaleDateString('pt-BR')} | Total: R$ ${Number(p.total).toFixed(2)} (mão de obra: R$ ${Number(p.subtotal_mao_obra).toFixed(2)}, materiais: R$ ${Number(p.subtotal_materiais).toFixed(2)}, BDI: ${p.bdi}%)`,
      ];
      for (const sec of p.secoes || []) {
        partes.push(`\n${sec.nome}:`);
        const itensDaSecao = (p.itens || []).filter(it => it.secao_id === sec.id);
        itensDaSecao.forEach(it => partes.push(`  • ${it.descricao} — ${it.quantidade} ${it.unidade || ''} × R$ ${Number(it.valor_unitario).toFixed(2)} = R$ ${Number(it.valor_total).toFixed(2)}${it.status === 'a_cotar' ? ' (a cotar)' : ''}`));
      }
      return textoOk(partes.join('\n'));
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

// ── criar_rascunho_proposta ───────────────────────────────────────────────
const ItemPropostaSchema = z.object({
  secao: z.string().describe('Nome da seção — ex.: "Serviços (Mão de Obra)" ou "Materiais e Equipamentos"'),
  descricao: z.string(),
  quantidade: z.number().min(0),
  unidade: z.string().optional(),
  valor_unitario: z.number().min(0).optional(),
  subgrupo: z.string().optional().describe('Sub-agrupamento visual dentro da seção, ex.: "CFTV"'),
  status: z.enum(['confirmado', 'a_cotar']).optional().describe('Padrão: "confirmado" se tiver preço, "a_cotar" se não tiver'),
});

server.registerTool(
  'criar_rascunho_proposta',
  {
    title: 'Criar rascunho de proposta',
    description: 'Cria uma proposta no sistema PELO MESMO CAMINHO DA TELA de Orçamento (validação e recálculo de totais no servidor, trilha de auditoria) — nasce como um rascunho normal, visível no Histórico, pra revisão e ajuste antes de fechar ou enviar ao cliente. Confirme os itens com quem está na conversa antes de chamar esta ferramenta.',
    inputSchema: {
      cliente_nome: z.string().describe('Nome do cliente'),
      data: z.string().optional().describe('Data no formato AAAA-MM-DD — padrão: hoje'),
      responsavel: z.string().optional(),
      observacoes: z.string().optional(),
      bdi: z.number().min(0).max(999.99).optional().describe('Percentual de BDI — padrão 0, ajustável depois na tela'),
      itens: z.array(ItemPropostaSchema).min(1).describe('Itens da proposta, cada um já dizendo a que seção pertence'),
    },
  },
  async ({ cliente_nome, data, responsavel, observacoes, bdi, itens }) => {
    try {
      const nomesSecoes = [...new Set(itens.map(it => it.secao))];
      const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
      const itensPayload = itens.map(it => ({
        secao_nome: it.secao,
        descricao: it.descricao,
        quantidade: it.quantidade,
        unidade: it.unidade || null,
        valor_unitario: it.valor_unitario || 0,
        subgrupo: it.subgrupo || null,
        status: it.status || (it.valor_unitario ? 'confirmado' : 'a_cotar'),
      }));

      const dataProposta = data || new Date().toISOString().slice(0, 10);
      const resultado = await chamarApi('/api/propostas', {
        method: 'POST',
        body: JSON.stringify({
          data: dataProposta,
          cliente_nome,
          responsavel: responsavel || null,
          observacoes: observacoes || 'Criada via Claude Desktop (MCP) — revise antes de enviar ao cliente.',
          bdi: bdi || 0,
          secoes,
          itens: itensPayload,
        }),
      });

      return textoOk(`Proposta ${resultado.numero} criada como rascunho — total: R$ ${Number(resultado.total).toFixed(2)}. Está no Histórico do sistema pra revisão antes de enviar ao cliente.`);
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Servidor MCP H&M Engenharia rodando (stdio) — API: ${API_URL}`);
}

main().catch(err => {
  console.error('Erro fatal no servidor MCP:', err);
  process.exit(1);
});
