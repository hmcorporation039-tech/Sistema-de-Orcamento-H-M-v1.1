#!/usr/bin/env node
// Servidor MCP (Model Context Protocol) do sistema H&M Engenharia.
//
// Roda LOCAL, via stdio (não abre porta de rede — não é exposto, só o Claude
// Desktop no mesmo PC fala com ele) e reaproveita os módulos que já existem
// no backend (config/database, utils/compatibilizacaoAnalise,
// utils/pesquisaMercadoService etc.) — nada de lógica de negócio é
// reescrita aqui, só a camada que expõe essas funções como "ferramentas"
// que o Claude Desktop pode chamar dentro de uma conversa.
//
// Como registrar no Claude Desktop: ver README.md, seção "Servidor MCP".
//
// Filosofia mantida do resto do sistema: toda ferramenta aqui é consultiva
// (leitura) ou, no máximo, grava um cache de baixo risco (pesquisa de
// mercado, que a própria tela já faz) — nada aqui cria/edita proposta,
// cliente ou material. A decisão final continua sempre sendo de quem está
// na conversa com o Claude.

const path = require('path');
const fs = require('fs');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const pool = require('./src/config/database');
const { compararComCatalogo, analisarProjetoCompleto } = require('./src/utils/compatibilizacaoAnalise');
const { pesquisarPrecoMercado, ErroPesquisaMercado } = require('./src/utils/pesquisaMercadoService');
const { normalizarDisciplinas, DISCIPLINAS } = require('./src/utils/disciplinasProjeto');

const server = new McpServer({ name: 'hm-orcamentos', version: '1.0.0' });

// Textos ("...") entram como um único bloco de conteúdo — é o formato que o
// Claude Desktop espera de volta de cada ferramenta.
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
      const result = await pool.query(
        `SELECT id, codigo, descricao, categoria, unidade, preco, preco_compra, marca
         FROM materiais
         WHERE ativo = true AND (descricao ILIKE $1 OR codigo ILIKE $1 OR marca ILIKE $1)
         ORDER BY categoria, descricao
         LIMIT $2`,
        [`%${descricao}%`, limite || 10]
      );
      if (result.rows.length === 0) {
        return textoOk(`Nenhum material encontrado no catálogo para "${descricao}".`);
      }
      const linhas = result.rows.map(m =>
        `#${m.id} [${m.categoria}] ${m.descricao}${m.marca ? ` (${m.marca})` : ''} — venda: R$ ${Number(m.preco).toFixed(2)}${m.preco_compra != null ? `, compra: R$ ${Number(m.preco_compra).toFixed(2)}` : ''} — ${m.unidade}`
      );
      return textoOk(`${result.rows.length} material(is) encontrado(s):\n${linhas.join('\n')}`);
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
    description: 'Verifica se um item (descrito livremente, ex.: vindo de um projeto ou orçamento) já existe no catálogo da empresa, com que confiança (índice de Jaccard) e qual seria o preço sugerido. Não inventa preço: só responde quando a correspondência é razoável.',
    inputSchema: {
      descricao: z.string().describe('Descrição do item a comparar (ex.: "câmera dome 4MP infravermelho")'),
    },
  },
  async ({ descricao }) => {
    try {
      const catalogo = (await pool.query(
        'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
      )).rows;
      const correspondencia = compararComCatalogo(descricao, catalogo);
      if (!correspondencia) {
        return textoOk(`Nenhuma correspondência confiável no catálogo para "${descricao}" — não há item parecido o bastante pra sugerir preço.`);
      }
      return textoOk(
        `Correspondência encontrada (confiança ${correspondencia.confianca}%):\n` +
        `#${correspondencia.material_id} ${correspondencia.descricao_catalogo} — R$ ${correspondencia.preco_catalogo.toFixed(2)} / ${correspondencia.unidade_catalogo}\n` +
        (correspondencia.confianca < 70 ? 'Confiança abaixo de 70% — confirme visualmente antes de usar esse preço.' : '')
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
      const r = await pesquisarPrecoMercado(descricao);
      const origem = r.deCache ? `resultado em cache, pesquisado em ${new Date(r.pesquisadoEm).toLocaleString('pt-BR')}` : `pesquisa nova via ${r.fonte}`;
      return textoOk(`Pesquisa de mercado para "${r.descricao}" (${origem}):\n\n${r.resultado}`);
    } catch (err) {
      if (err instanceof ErroPesquisaMercado) return textoErro(err.message);
      return textoErro(err.message);
    }
  }
);

// ── analisar_projeto ──────────────────────────────────────────────────────
const CHAVES_DISCIPLINA = DISCIPLINAS.map(d => d.chave).join(', ');
server.registerTool(
  'analisar_projeto',
  {
    title: 'Analisar projeto (PDF)',
    description: `Lê um PDF de projeto de engenharia (planta de CFTV, cabeamento, elétrica etc.) já salvo no PC e devolve ambientes, câmeras, pontos de rede/antena, achados de compatibilização e um rascunho de serviços/materiais para orçar — o mesmo motor usado na tela "Análise de Projeto" do sistema. Disciplinas válidas: ${CHAVES_DISCIPLINA}. O resultado NÃO é salvo no sistema — é só a leitura, pra revisar na conversa antes de decidir o que fazer.`,
    inputSchema: {
      caminho_pdf: z.string().describe('Caminho completo do arquivo PDF no PC (ex.: C:\\HM-Engenharia\\hm-eng\\Projetos recebidos clientes\\projeto.pdf)'),
      disciplinas: z.array(z.string()).describe(`Disciplinas desse arquivo (uma ou mais entre: ${CHAVES_DISCIPLINA})`),
    },
  },
  async ({ caminho_pdf, disciplinas }) => {
    try {
      if (!fs.existsSync(caminho_pdf)) {
        return textoErro(`Arquivo não encontrado: ${caminho_pdf}`);
      }
      const disciplinasValidas = normalizarDisciplinas(disciplinas);
      if (disciplinasValidas.length === 0) {
        return textoErro(`Nenhuma disciplina válida informada. Use uma ou mais entre: ${CHAVES_DISCIPLINA}`);
      }
      const buffer = fs.readFileSync(caminho_pdf);
      const resultado = await analisarProjetoCompleto([
        { buffer, nomeArquivo: path.basename(caminho_pdf), disciplinas: disciplinasValidas },
      ]);

      const partes = [];
      partes.push(`Cliente identificado: ${resultado.cliente || '(não identificado no texto do PDF)'}`);
      partes.push(`Ambientes identificados: ${resultado.ambientes.length}`);
      if (disciplinasValidas.includes('cftv')) partes.push(`Câmeras (código CAMx): ${resultado.cameras.total}`);
      if (disciplinasValidas.includes('rede')) partes.push(`Pontos de rede (código Rx): ${resultado.pontosRedeAntena.rede.total}`);
      if (disciplinasValidas.includes('antena')) partes.push(`Pontos de TV/antena (código Ax): ${resultado.pontosRedeAntena.antena.total}`);
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
      partes.push('\n(Esta leitura não foi salva no sistema — abra a tela "Análise de Projeto" se quiser revisar, editar e gerar um orçamento a partir dela.)');

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
      let condicoes = 'WHERE 1=1';
      const params = [];
      if (status) { params.push(status); condicoes += ` AND status = $${params.length}`; }
      if (busca) { params.push(`%${busca}%`); condicoes += ` AND (numero ILIKE $${params.length} OR cliente_nome ILIKE $${params.length} OR local_obra ILIKE $${params.length})`; }
      params.push(limite || 15);
      const result = await pool.query(
        `SELECT numero, data, cliente_nome, status, total FROM propostas ${condicoes} ORDER BY sequencial DESC LIMIT $${params.length}`,
        params
      );
      if (result.rows.length === 0) return textoOk('Nenhuma proposta encontrada com esse filtro.');
      const linhas = result.rows.map(p => `${p.numero} — ${p.cliente_nome || '(sem cliente)'} — ${p.status} — R$ ${Number(p.total).toFixed(2)} — ${new Date(p.data).toLocaleDateString('pt-BR')}`);
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
      const prop = await pool.query('SELECT * FROM propostas WHERE numero = $1', [numero.trim().toUpperCase()]);
      if (prop.rows.length === 0) return textoErro(`Proposta ${numero} não encontrada.`);
      const p = prop.rows[0];
      const secoes = await pool.query('SELECT * FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem', [p.id]);
      const itens = await pool.query('SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem', [p.id]);

      const partes = [
        `Proposta ${p.numero} — ${p.cliente_nome || '(sem cliente)'} — status: ${p.status}`,
        `Data: ${new Date(p.data).toLocaleDateString('pt-BR')} | Total: R$ ${Number(p.total).toFixed(2)} (mão de obra: R$ ${Number(p.subtotal_mao_obra).toFixed(2)}, materiais: R$ ${Number(p.subtotal_materiais).toFixed(2)}, BDI: ${p.bdi}%)`,
      ];
      for (const sec of secoes.rows) {
        partes.push(`\n${sec.nome}:`);
        const itensDaSecao = itens.rows.filter(it => it.secao_id === sec.id);
        itensDaSecao.forEach(it => partes.push(`  • ${it.descricao} — ${it.quantidade} ${it.unidade || ''} × R$ ${Number(it.valor_unitario).toFixed(2)} = R$ ${Number(it.valor_total).toFixed(2)}${it.status === 'a_cotar' ? ' (a cotar)' : ''}`));
      }
      return textoOk(partes.join('\n'));
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
    description: 'Mostra o preço atual no catálogo de um material (se existir) e o histórico de pesquisas de mercado já feitas para descrições parecidas — não é um histórico de preço de compra/venda por nota fiscal (o sistema ainda não guarda isso), é o que já foi pesquisado na web ao longo do tempo.',
    inputSchema: {
      descricao: z.string().describe('Descrição do material (ex.: "câmera dome 4MP")'),
    },
  },
  async ({ descricao }) => {
    try {
      const catalogo = await pool.query(
        `SELECT id, descricao, preco, preco_compra, unidade FROM materiais WHERE ativo = true AND descricao ILIKE $1 ORDER BY descricao LIMIT 3`,
        [`%${descricao}%`]
      );
      const pesquisas = await pool.query(
        `SELECT descricao, resultado, fonte, criado_em FROM pesquisas_mercado WHERE descricao_normalizada ILIKE $1 ORDER BY criado_em DESC LIMIT 5`,
        [`%${descricao.trim().toLowerCase()}%`]
      );

      const partes = [];
      if (catalogo.rows.length > 0) {
        partes.push('No catálogo hoje:');
        catalogo.rows.forEach(m => partes.push(`  • #${m.id} ${m.descricao} — venda: R$ ${Number(m.preco).toFixed(2)}${m.preco_compra != null ? `, compra: R$ ${Number(m.preco_compra).toFixed(2)}` : ''} / ${m.unidade}`));
      } else {
        partes.push('Nenhum material no catálogo bate com essa descrição.');
      }
      if (pesquisas.rows.length > 0) {
        partes.push('\nPesquisas de mercado já feitas (mais recente primeiro):');
        pesquisas.rows.forEach(r => partes.push(`  • ${new Date(r.criado_em).toLocaleDateString('pt-BR')} (${r.fonte}) — "${r.descricao}":\n    ${r.resultado.slice(0, 300)}${r.resultado.length > 300 ? '...' : ''}`));
      } else {
        partes.push('\nNenhuma pesquisa de mercado registrada ainda para essa descrição — use a ferramenta pesquisar_preco_mercado.');
      }
      return textoOk(partes.join('\n'));
    } catch (err) {
      return textoErro(err.message);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Servidor MCP H&M Engenharia rodando (stdio).');
}

main().catch(err => {
  console.error('Erro fatal no servidor MCP:', err);
  process.exit(1);
});
