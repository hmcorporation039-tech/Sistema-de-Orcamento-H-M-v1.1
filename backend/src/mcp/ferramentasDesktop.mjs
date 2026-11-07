// Ferramentas que existem SÓ no MCP do Claude Desktop (servidor "hm-orcamentos", mcpServer.mjs).
// Todas as outras vêm da lista única (assistenteFerramentas.mjs, INT-05), as mesmas do assistente.
//
// Ficam aqui, com os MESMOS nomes e parâmetros de sempre (o Márcio já as usa no Desktop):
//   - buscar_material, listar_propostas, buscar_proposta: nomes antigos de ferramentas da lista única
//     (buscar_materiais, buscar_propostas, ver_proposta) — só traduzem os parâmetros e chamam a mesma
//     implementação;
//   - comparar_com_catalogo, salvar_pesquisa_mercado (o Desktop pesquisa na web pela assinatura e grava
//     aqui, "não verificada"), analisar_projeto (arquivo do disco, só das pastas permitidas: regras.js),
//     enriquecer_analise_projeto (visão do PDF anexado na conversa do Desktop) e criar_rascunho_proposta.
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const requerer = createRequire(import.meta.url);
const DISCIPLINAS_VALIDAS = requerer('../utils/disciplinasProjeto.js').DISCIPLINAS.map(d => d.chave);
const { conferirPdfPermitido } = requerer('./regras.js');
const { hojeBrasilia } = requerer('../utils/dataHoje.js');

const ok = (texto) => ({ content: [{ type: 'text', text: texto }] });
const falha = (texto) => ({ content: [{ type: 'text', text: `Erro: ${texto}` }], isError: true });
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MIME = { '.pdf': 'application/pdf', '.dwg': 'application/octet-stream', '.dxf': 'application/dxf' };

// enriquecer_analise_projeto só ACRESCENTA: o PUT troca a lista inteira, então lê (GET), mescla por
// disciplina (item com a mesma descrição fica como estava — inclusive o editado na tela) e grava com a
// versao lida (se alguém salvou no meio, o PUT volta conflito 409).
const chaveItem = (i) => String(i?.descricao || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export function mesclarPontos(atuais, novos) {
  const grupos = (Array.isArray(atuais) ? atuais : []).map(g => ({ ...g, itens: Array.isArray(g?.itens) ? [...g.itens] : [] }));
  let acrescentados = 0;
  for (const g of novos) {
    let alvo = grupos.find(x => x.disciplina === g.disciplina);
    if (!alvo) { alvo = { disciplina: g.disciplina, itens: [] }; grupos.push(alvo); }
    const vistos = new Set(alvo.itens.map(chaveItem));
    for (const it of g.itens || []) {
      const k = chaveItem(it);
      if (!k || vistos.has(k)) continue;
      vistos.add(k);
      alvo.itens.push(it);
      acrescentados++;
    }
  }
  return { grupos, acrescentados };
}
export function mesclarFuncionamento(atual, novo) {
  const a = String(atual || '').trim();
  const n = String(novo || '').trim();
  if (!n || a.includes(n)) return a;
  return a ? `${a}\n\n${n}` : n;
}

const ItemPropostaSchema = z.object({
  secao: z.string().describe('Nome da seção — ex.: "Serviços (Mão de Obra)" ou "Materiais e Equipamentos"'),
  descricao: z.string(),
  quantidade: z.number().min(0),
  unidade: z.string().optional(),
  valor_unitario: z.number().min(0).optional(),
  subgrupo: z.string().optional().describe('Sub-agrupamento visual dentro da seção, ex.: "CFTV"'),
  status: z.enum(['confirmado', 'a_cotar']).optional().describe('Ignorado: todo item criado por aqui entra "a_cotar" e o engenheiro confirma na tela'),
});

// compartilhadas: Map nome → ferramenta da lista única (já com o executar embrulhado)
export function definirFerramentasDesktop({ api, compartilhadas, pastasPdf, lerArquivo = (p) => fs.readFileSync(p) }) {
  const embrulhar = (fn) => async (args) => {
    try { return await fn(args || {}); } catch (e) { return falha(e.message || String(e)); }
  };
  const usar = (nome) => {
    const f = compartilhadas.get(nome);
    if (!f) throw new Error(`Ferramenta da lista única ausente: ${nome}`);
    return f.executar;
  };

  const lista = [
    {
      nome: 'buscar_material', titulo: 'Buscar material no catálogo',
      descricao: 'Busca materiais/equipamentos já cadastrados no catálogo da empresa por descrição, código ou marca. Retorna preço de venda e de compra quando existirem. (Mesma busca de buscar_materiais.)',
      entrada: {
        descricao: z.string().describe('Texto a buscar (descrição, código ou marca do material)'),
        limite: z.number().int().min(1).max(50).optional().describe('Máximo de resultados (padrão 10)'),
      },
      executar: ({ descricao, limite }) => usar('buscar_materiais')({ busca: descricao, limite: limite || 10 }),
    },
    {
      nome: 'comparar_com_catalogo', titulo: 'Comparar item com o catálogo',
      descricao: 'Verifica se um item (descrito livremente, ex.: vindo de um projeto ou orçamento) já existe no catálogo da empresa, com que confiança (índice de Jaccard) e qual seria o preço sugerido. Não inventa preço: só responde quando a correspondência é razoável (>= 45%).',
      entrada: { descricao: z.string().describe('Descrição do item a comparar (ex.: "câmera dome 4MP infravermelho")') },
      async executar({ descricao }) {
        const dados = await api('POST', '/api/materiais/comparar', { descricao });
        const c = dados.correspondencia;
        if (!c) return ok(`Nenhuma correspondência confiável no catálogo para "${descricao}" — não há item parecido o bastante pra sugerir preço.`);
        return ok(`Correspondência encontrada (confiança ${c.confianca}%):\n#${c.material_id} ${c.descricao_catalogo} — ${brl(c.preco_catalogo)} / ${c.unidade_catalogo}\n`
          + (c.confianca < 70 ? 'Confiança abaixo de 70% — confirme visualmente antes de usar esse preço.' : ''));
      },
    },
    {
      // O próprio Claude Desktop busca na web (pela assinatura, sem chave/cota) e grava o resultado aqui.
      // Texto livre vindo de fora: fica "não verificada" e NÃO alimenta o cache de 48 h da pesquisa
      // automática (services/pesquisaMercado.js).
      nome: 'salvar_pesquisa_mercado', titulo: 'Salvar pesquisa de preço no sistema',
      descricao: 'Grava no sistema uma pesquisa de preço de mercado que VOCÊ (Claude) acabou de fazer com a SUA PRÓPRIA busca na web — sem usar a cota do Gemini nem crédito de API. Fica no histórico do sistema marcada como "não verificada" (texto vindo de fora, para conferência humana) e não entra no cache da pesquisa automática. No campo "resultado", inclua de 3 a 6 achados reais com nome do produto, preço e link, e observe variações relevantes. A pesquisa automática do sistema (pesquisar_preco_mercado) segue a ordem Claude Max (assinatura, sem custo por chamada) → Claude pela API → Gemini.',
      entrada: {
        descricao: z.string().describe('O material/equipamento pesquisado (ex.: "câmera IP dome 4MP")'),
        resultado: z.string().describe('O texto da pesquisa: achados reais com produto, preço e link, organizados e curtos.'),
      },
      async executar({ descricao, resultado }) {
        const r = await api('POST', '/api/pesquisa-mercado/salvar', { descricao, resultado, fonte: 'claude_desktop' });
        return ok(`Pesquisa de "${r.descricao}" salva no sistema (fonte: ${r.fonte}), marcada como não verificada. Aparece no histórico de pesquisas (historico_preco); não substitui a pesquisa automática da tela.`);
      },
    },
    {
      nome: 'analisar_projeto', titulo: 'Analisar projeto (PDF, DWG ou DXF)',
      descricao: `Envia um projeto de engenharia (PDF, DWG ou DXF de até 40 MB) já salvo no PC ao mesmo analisador da tela "Análise de Projeto" — ambientes, câmeras, pontos de rede/antena, achados de compatibilização e rascunho de serviços/materiais. IMPORTANTE: isso cria uma análise SALVA no sistema (aparece em "Análises salvas", do jeito que aconteceria enviando o arquivo pela tela) — não é uma leitura descartável. Com obra_id, a análise fica ligada à obra. Por segurança, só lê arquivos destas pastas: ${pastasPdf.join(' ; ')}. Disciplinas válidas: ${DISCIPLINAS_VALIDAS.join(', ')}.`,
      entrada: {
        caminho_pdf: z.string().describe(`Caminho completo do arquivo (PDF, DWG ou DXF) no PC, dentro de uma das pastas permitidas (${pastasPdf.join(' ; ')})`),
        disciplinas: z.array(z.string()).describe(`Disciplinas desse arquivo (uma ou mais entre: ${DISCIPLINAS_VALIDAS.join(', ')})`),
        finalidade: z.enum(['orcamento', 'elaboracao']).optional()
          .describe('Para que é a análise: "orcamento" (orçar a partir do projeto recebido — padrão) ou "elaboracao" (a H&M vai definir/entregar o projeto a partir do arquitetônico). Nenhuma das duas cria laudo.'),
        obra_id: z.number().int().positive().optional().describe('Obra a que a análise fica ligada (opcional; veja buscar_obras)'),
      },
      async executar({ caminho_pdf, disciplinas, finalidade, obra_id }) {
        // só PDF/DWG/DXF e só dentro das pastas permitidas (regras.js): um texto malicioso lido pelo
        // Claude não pode mandar ao sistema um arquivo de outra pasta do PC
        const conferido = conferirPdfPermitido(caminho_pdf, pastasPdf);
        if (conferido.erro) return falha(conferido.erro);
        const validas = disciplinas.filter(d => DISCIPLINAS_VALIDAS.includes(d));
        if (validas.length === 0) return falha(`Nenhuma disciplina válida informada. Use uma ou mais entre: ${DISCIPLINAS_VALIDAS.join(', ')}`);
        const extensao = path.extname(conferido.caminho).toLowerCase();
        const form = new FormData();
        form.append('arquivos', new Blob([lerArquivo(conferido.caminho)], { type: MIME[extensao] || 'application/octet-stream' }), path.basename(conferido.caminho));
        form.append('disciplinasPorArquivo', JSON.stringify([validas]));
        if (finalidade) form.append('finalidade', finalidade);
        if (obra_id) form.append('obra_id', String(obra_id));
        const resultado = await api('POST', '/api/projetos/analisar', form, { formulario: true });
        const partes = [];
        partes.push(`Análise salva (id ${resultado.id}) — cliente identificado: ${resultado.cliente || '(não identificado no texto do arquivo)'}${resultado.obra ? ` — obra ${resultado.obra.codigo}` : ''}`);
        partes.push(`Finalidade: ${resultado.finalidade === 'elaboracao' ? 'Elaboração de projeto' : 'Orçamento'} (análise não gera laudo)`);
        partes.push(`Ambientes identificados: ${(resultado.ambientes || []).length}`);
        if (validas.includes('cftv')) partes.push(`Câmeras (código CAMx): ${resultado.cameras?.total ?? 0}`);
        if (validas.includes('rede')) partes.push(`Pontos de rede (código Rx): ${resultado.pontosRedeAntena?.rede?.total ?? 0}`);
        if (validas.includes('antena')) partes.push(`Pontos de TV/antena (código Ax): ${resultado.pontosRedeAntena?.antena?.total ?? 0}`);
        if ((resultado.achados || []).length > 0) {
          partes.push(`\nCompatibilização — ${resultado.achados.length} pendência(s):`);
          resultado.achados.forEach(a => partes.push(`  • ${a.tema}: ${a.observacao}`));
        }
        const servicosAOrcar = (resultado.servicos || []).filter(s => !s.pronto);
        if (servicosAOrcar.length > 0) {
          partes.push(`\nServiços (mão de obra) a orçar — ${servicosAOrcar.length} item(ns):`);
          servicosAOrcar.forEach(s => partes.push(`  • ${s.descricao}: ${s.quantidade} ${s.unidade}${s.observacao ? ` — ${s.observacao}` : ''}`));
        }
        const materiaisAOrcar = (resultado.materiais || []).filter(m => !m.pronto);
        if (materiaisAOrcar.length > 0) {
          partes.push(`\nMateriais/equipamentos a orçar — ${materiaisAOrcar.length} item(ns):`);
          materiaisAOrcar.forEach(m => partes.push(`  • ${m.descricao}: ${m.quantidade} ${m.unidade}${m.preco_catalogo != null ? ` — catálogo: ${brl(m.preco_catalogo)} (${m.confianca_catalogo}% match)` : ' — sem correspondência no catálogo'}`));
        }
        partes.push(`\n(Salva como análise #${resultado.id} — abra "Análise de Projeto" no sistema pra revisar, editar preços e gerar um orçamento a partir dela, ou peça pra criar_rascunho_proposta direto por aqui.)`);
        return ok(partes.join('\n'));
      },
    },
    {
      nome: 'enriquecer_analise_projeto', titulo: 'Enriquecer análise de projeto',
      descricao: `Adiciona a uma análise já criada (pelo analisar_projeto — com o usuário dedicado não-administrador, só as análises que ele mesmo criou podem ser alteradas) o FUNCIONAMENTO do projeto e os PONTOS POR DISCIPLINA (com tipo, modelo e quantidade) que você leu VISUALMENTE do PDF anexado na conversa. Use depois do analisar_projeto, com o id que ele retornou. REGRA IMPORTANTE: descreva e marque APENAS as disciplinas SELECIONADAS naquela análise (o campo "disciplinas" que o analisar_projeto retornou) — não saia procurando disciplinas que não foram escolhidas. Isso é proposital: economiza tempo, porque é comum vir projeto só de uma disciplina (só elétrica, só CFTV, etc.). Não substitui nada do que a análise já tem; só acrescenta: o funcionamento novo entra como parágrafo a mais e, em cada disciplina, só entram os itens cuja descrição ainda não está lá (os existentes, inclusive os editados na tela, ficam como estão — para corrigir um item existente, use a tela). Disciplinas válidas: ${DISCIPLINAS_VALIDAS.join(', ')}.`,
      entrada: {
        id: z.number().int().positive().describe('Id da análise (retornado por analisar_projeto)'),
        funcionamento: z.string().optional().describe('Como o projeto funciona/opera — só das disciplinas selecionadas'),
        pontos_por_disciplina: z.array(z.object({
          disciplina: z.string().describe(`Disciplina — uma entre: ${DISCIPLINAS_VALIDAS.join(', ')}`),
          itens: z.array(z.object({
            descricao: z.string().describe('O que é o ponto/item (ex.: "Tomada 2P+T 10A baixa")'),
            tipo: z.string().optional().describe('Tipo (ex.: tomada, luminária, quadro, sensor)'),
            modelo: z.string().optional().describe('Marca/modelo quando o desenho mostra (senão vazio)'),
            quantidade: z.number().optional().describe('Quantidade contada no desenho'),
            observacao: z.string().optional(),
          })),
        })).optional().describe('Pontos por disciplina — só das disciplinas selecionadas na análise'),
      },
      async executar({ id, funcionamento, pontos_por_disciplina }) {
        if (funcionamento === undefined && pontos_por_disciplina === undefined) return falha('Informe pelo menos funcionamento e/ou pontos_por_disciplina.');
        const atual = await api('GET', `/api/projetos/analises/${id}`);
        const body = { versao: atual.versao };
        const feito = [];
        if (funcionamento !== undefined) { body.funcionamento = mesclarFuncionamento(atual.funcionamento, funcionamento); feito.push('funcionamento'); }
        if (pontos_por_disciplina !== undefined) {
          const { grupos, acrescentados } = mesclarPontos(atual.pontosPorDisciplina, pontos_por_disciplina);
          body.pontos_por_disciplina = grupos;
          feito.push(`${acrescentados} ponto(s) por disciplina acrescentado(s)`);
        }
        await api('PUT', `/api/projetos/analises/${id}`, body);
        return ok(`Análise #${id} enriquecida (${feito.join(' e ')}). Abra "Análise de Projeto" no sistema pra revisar e ajustar antes de gerar o orçamento.`);
      },
    },
    {
      nome: 'listar_propostas', titulo: 'Listar propostas',
      descricao: 'Lista propostas/orçamentos já cadastrados no sistema, com filtro opcional por status ou por texto (número, cliente, local da obra). (Mesma busca de buscar_propostas.)',
      entrada: {
        status: z.enum(['Ativa', 'Aprovada', 'Recusada', 'Cancelada']).optional().describe('Filtrar por status'),
        busca: z.string().optional().describe('Texto livre — casa com número, cliente ou local da obra'),
        limite: z.number().int().min(1).max(50).optional().describe('Máximo de resultados (padrão 15)'),
      },
      executar: ({ status, busca, limite }) => usar('buscar_propostas')({ status, busca, limite: limite || 15 }),
    },
    {
      nome: 'buscar_proposta', titulo: 'Buscar proposta por número',
      descricao: 'Traz os detalhes completos de uma proposta pelo número (ex.: "P045"), incluindo os itens de cada seção. (Mesma leitura de ver_proposta.)',
      entrada: { numero: z.string().describe('Número da proposta, ex.: P045') },
      executar: ({ numero }) => usar('ver_proposta')({ numero }),
    },
    {
      nome: 'criar_rascunho_proposta', titulo: 'Criar rascunho de proposta',
      descricao: 'Cria uma proposta no sistema PELO MESMO CAMINHO DA TELA de Orçamento (validação e recálculo de totais no servidor, trilha de auditoria) — nasce como um rascunho normal, visível no Histórico, pra revisão e ajuste antes de fechar ou enviar ao cliente. Confirme os itens com quem está na conversa antes de chamar esta ferramenta.',
      entrada: {
        cliente_nome: z.string().describe('Nome do cliente'),
        data: z.string().optional().describe('Data no formato AAAA-MM-DD — padrão: hoje'),
        responsavel: z.string().optional(),
        escopo: z.string().optional().describe('Escopo do serviço — sai no PDF logo após a saudação'),
        observacoes: z.string().optional().describe('Observações gerais — saem no PDF após as condições de pagamento'),
        bdi: z.number().min(0).max(999.99).optional().describe('Percentual de BDI — se omitido, vale o BDI padrão definido pelo administrador (Integrações); sem padrão definido, fica 0 e o resultado avisa. Nunca invente um valor: pergunte.'),
        itens: z.array(ItemPropostaSchema).min(1).describe('Itens da proposta, cada um já dizendo a que seção pertence'),
      },
      async executar({ cliente_nome, data, responsavel, escopo, observacoes, bdi, itens }) {
        const nomesSecoes = [...new Set(itens.map(it => it.secao))];
        const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
        const itensPayload = itens.map(it => ({
          secao_nome: it.secao, descricao: it.descricao, quantidade: it.quantidade, unidade: it.unidade || null,
          valor_unitario: it.valor_unitario || 0, subgrupo: it.subgrupo || null, status: 'a_cotar', // a IA sugere; o engenheiro confirma na tela (regra do usuário)
          origem_item: 'assistente', // marca de sugestão da IA: não entra no catálogo nem no aprendizado até o engenheiro confirmar
        }));
        // hoje em Brasília (em UTC, depois das 21h a proposta nascia com a data de amanhã)
        const padroes = await api('GET', '/api/configuracoes/padroes-orcamento');
        const resultado = await api('POST', '/api/propostas', {
          data: data || hojeBrasilia(), cliente_nome, responsavel: responsavel || null, escopo: escopo || null,
          observacoes: observacoes || 'Criada via Claude Desktop (MCP) — revise antes de enviar ao cliente.',
          bdi: bdi ?? padroes.bdi ?? 0, imposto_venda: padroes.imposto_venda ?? 0, imposto_servico: padroes.imposto_servico ?? 0,
          secoes, itens: itensPayload,
        });
        const faltou = bdi == null && !padroes.definidos
          ? ' ATENÇÃO: BDI e impostos padrão ainda não foram definidos pelo administrador (Integrações) — o que faltou ficou em 0 %. Pergunte ao usuário e ajuste na tela.'
          : '';
        return ok(`Proposta ${resultado.numero} criada como rascunho — total: ${brl(resultado.total)}. Está no Histórico do sistema pra revisão antes de enviar ao cliente.${faltou}`);
      },
    },
  ];
  return lista.map(f => ({ ...f, servidores: ['desktop'], executar: embrulhar(f.executar) }));
}

// Nomes e parâmetros que o Claude Desktop já usa (não podem mudar: o teste confere)
export const INTERFACE_DESKTOP = {
  buscar_material: ['descricao', 'limite'],
  comparar_com_catalogo: ['descricao'],
  pesquisar_preco_mercado: ['descricao'],
  historico_preco: ['descricao'],
  salvar_pesquisa_mercado: ['descricao', 'resultado'],
  analisar_projeto: ['caminho_pdf', 'disciplinas', 'finalidade'],
  enriquecer_analise_projeto: ['id', 'funcionamento', 'pontos_por_disciplina'],
  listar_propostas: ['status', 'busca', 'limite'],
  buscar_proposta: ['numero'],
  criar_rascunho_proposta: ['cliente_nome', 'data', 'responsavel', 'escopo', 'observacoes', 'bdi', 'itens'],
};
