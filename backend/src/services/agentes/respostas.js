// Respostas dos agentes próprios montadas por TEMPLATE (sem IA), no formato que a equipe já usa nas conversas de
// projeto de quadro e de pesquisa de preços (referência: o caso real de 09/11/2026 — quadro de força e comando com
// anteprojeto em folhas e planilha QF-CAG; nenhum dado de cliente fica aqui, só a forma).
//
// Cada função devolve SEÇÕES ({ titulo, linhas: [markdown] }) que services/agentes/executor.js grava no resultado
// da execução e services/agentes/textoDoResultado.js transforma na resposta do chat.
const { ORIGENS, resumirPorOrigem } = require('./planilhaPrecos');

const { moedaTexto: moeda } = require('../../utils/moeda'); // fonte única (2.38)
const milhar = (v) => (Math.abs(v) >= 1000 ? `≈ R$ ${(v / 1000).toFixed(1).replace('.', ',')} mil` : `≈ ${moeda(v)}`);
const celula = (t) => String(t ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const lista = (...v) => v.find(Array.isArray) || [];
const texto = (x) => (typeof x === 'string' ? x : x?.texto || x?.descricao || x?.mensagem || (x ? JSON.stringify(x) : ''));

// ── Quadro pela especificação ──────────────────────────────────────────────
// Folhas do anteprojeto do quadro (o pacote padrão quando o pedido vem cortado é FL01 + FL02 + FL04)
const FOLHAS_QUADRO = [
  { folha: 'FL01', titulo: 'Unifilar de força', conteudo: 'disjuntor geral, barramento, DPS, relé de falta de fase, saídas de força, iluminação/tomadas com DR, reserva, fonte e ventilação' },
  { folha: 'FL02', titulo: 'Comando por relés', conteudo: 'emergência, liberações, seletoras (MAN–0–AUT, titular), partidas e retornos' },
  { folha: 'FL03', titulo: 'Interfaces e bornes', conteudo: 'partida dos acionamentos, sinais de/para equipamentos e automação, réguas de bornes' },
  { folha: 'FL04', titulo: 'Layout', conteudo: 'vista da porta e da placa de montagem, separação força/comando, cálculo de ventilação' },
  { folha: 'FL05', titulo: 'Cargas, materiais e pendências', conteudo: 'quadro de cargas, lista de materiais com marca/modelo de referência, pendências e exceções' },
];
const PACOTE_PADRAO = ['FL01', 'FL02', 'FL04'];
// Critério H&M (base de conhecimento — conhecimento/quadros.md): o que sempre levantar e o que costuma faltar
const PONTOS_PADRAO_QUADRO = [
  'Seletora de bomba/equipamento titular × automação: com a entrada da automação em paralelo, a automação pode ficar limitada a um só equipamento — confirmar a lógica desejada (ex.: seletora titular 1 · REM · titular 2).',
  'Troca automática por falha: se a especificação não pede, a reserva NÃO parte sozinha quando a titular falha — confirmar se deve partir.',
  'Emergência: corta o COMANDO, não a força dos acionamentos (inversores) — se precisar cortar a força, é contator a mais, fora da especificação.',
];
const FALTA_PADRAO_QUADRO = [
  'Icc no ponto de alimentação (Icu/Icw dos disjuntores e do barramento).',
  'Borne e tensão do atuador (24 Vca ou 24 Vcc) e dos sinais de cada equipamento.',
  'Entradas/saídas dos inversores ou partidas fornecidos por terceiros.',
  'Comprimento dos cabos até as cargas (queda de tensão e seção).',
];
const RESSALVAS_QUADRO = [
  'Marcas e modelos de referência "ou equivalente".',
  'Documento preliminar — exige conferência e ART do engenheiro responsável.',
];

// O pedido veio cortado ("… Com projeto unifilar e 2…")? Aí o agente assume o pacote padrão e diz que assumiu.
const pedidoTruncado = (t) => /(\.\.\.|…)\s*$/.test(String(t || '').trim()) || /\b(e|com|de|do|da|para)\s*\d*\s*$/i.test(String(t || '').trim());

function respostaQuadro({ projeto = null, truncado = false, aguardando = false, situacaoModulo = null } = {}) {
  const secoes = [];
  if (truncado) {
    secoes.push({ titulo: 'Como entendi o pedido', linhas: [`O pedido chegou incompleto: assumi o pacote padrão (${PACOTE_PADRAO.map(f => FOLHAS_QUADRO.find(x => x.folha === f).titulo.toLowerCase()).join(' + ')}). Se quiser outras folhas, diga quais.`] });
  }
  if (aguardando) {
    secoes.push({
      titulo: 'Situação',
      linhas: [
        'O motor que gera o projeto do quadro pela especificação ainda não está instalado neste sistema (aguardando módulo). Nada foi inventado.',
        `Procurei em: ${(situacaoModulo?.pastas || []).join(', ') || 'skills/_comum/especificacao e skills/quadros'}.`,
        'Assim que o módulo existir, este mesmo pedido gera as folhas abaixo:',
      ],
    });
  }
  // projeto pela skill da disciplina (14/11/2026 — incêndio, MT, BMS, QD predial): os documentos da skill, os
  // indicadores e a matriz de causa e efeito; os padrões de quadro elétrico abaixo não se aplicam
  const daSkill = projeto?.tipoSolucao === 'skill';
  const folhas = lista(projeto?.folhas).length ? projeto.folhas : FOLHAS_QUADRO.filter(f => !truncado || PACOTE_PADRAO.includes(f.folha) || f.folha === 'FL05');
  secoes.push({
    titulo: daSkill ? 'Documentos' : 'Folhas',
    linhas: [daSkill ? '| Documento | Formato |' : '| Folha | Conteúdo |', '|---|---|', ...folhas.map(f => (daSkill ? `| **${celula(f.titulo)}** | ${celula(f.conteudo || '')} |` : `| ${celula(f.folha || f.codigo)} | **${celula(f.titulo)}**${f.conteudo || f.descricao ? `: ${celula(f.conteudo || f.descricao)}` : ''} |`))],
  });
  if (daSkill && lista(projeto.indicadores).length) secoes.push({ titulo: 'Resultado do cálculo', linhas: projeto.indicadores.slice(0, 14).map(i => `- ${i.rotulo}: **${i.valor}**${i.detalhe ? ` (${i.detalhe})` : ''}`) });
  if (daSkill && lista(projeto.causaEfeito).length) {
    secoes.push({ titulo: 'Matriz de causa e efeito', linhas: ['| Causa | Efeito |', '|---|---|', ...projeto.causaEfeito.map(c => `| ${celula(c.causa)} | ${celula(c.efeitos.join('; '))} |`)] });
  }
  if (projeto) {
    const decisoes = lista(projeto.decisoes, projeto.principaisDecisoes, projeto.criterios).map(texto).filter(Boolean);
    if (decisoes.length) secoes.push({ titulo: daSkill ? 'O que foi lido e adotado' : 'Principais decisões', linhas: decisoes.slice(0, 12).map(d => `- ${d}`) });
  }
  const pontos = [...lista(projeto?.pontosALevantar, projeto?.pontos_a_levantar, projeto?.perguntas).map(texto), ...(daSkill ? [] : PONTOS_PADRAO_QUADRO)];
  if (pontos.length) secoes.push({ titulo: 'Pontos a levantar com o cliente', linhas: [...new Set(pontos.filter(Boolean))].slice(0, 10).map((p, i) => `${i + 1}. ${p}`) });
  const falta = [...lista(projeto?.faltaConfirmar, projeto?.falta_confirmar).map(texto), ...(daSkill ? [] : FALTA_PADRAO_QUADRO)];
  if (falta.length) secoes.push({ titulo: 'Falta confirmar', linhas: [...new Set(falta.filter(Boolean))].slice(0, 12).map(p => `- ${p}`) });
  secoes.push({ titulo: 'Ressalvas', linhas: (daSkill ? ['Projeto calculado pela skill da disciplina com o formulário preenchido pela especificação: documento preliminar — exige conferência e ART do engenheiro responsável.'] : RESSALVAS_QUADRO).map(r => `- ${r}`) });
  return secoes;
}

// ── Pesquisa de preços (QF-CAG) ────────────────────────────────────────────
// Itens cujo preço muda com a corrente de curto (Icc) no ponto de alimentação
const DEPENDE_ICC = /\b(disjuntor|minidisjuntor|disj\.?|dps|seccionador|chave seccionadora|barramento|interruptor diferencial|fus[ií]vel|\d+\s*ka\b|icu|icc|icw)/i;

// linhas: as da planilha ({ grupo, descricao, quantidade, unidade, preco, origem, fonte, referencia, faixaMin, modelo? })
function respostaPrecos({ linhas = [], contingenciaPct = 10, fornecidosCliente = [], anteprojeto = false } = {}) {
  const r = resumirPorOrigem(linhas, contingenciaPct);
  const secoes = [];
  const naoInclui = ['mão de obra', 'BDI', 'itens fornecidos pelo cliente'];
  secoes.push({
    titulo: 'Total do material',
    linhas: [
      `Material: **${milhar(r.subtotal)}**, ou **${milhar(r.total)}** com ${String(contingenciaPct).replace('.', ',')} % de contingência (frete/variação).`,
      `Não inclui ${naoInclui.join(', ').replace(/, ([^,]*)$/, ' nem $1')}${fornecidosCliente.length ? ` (${fornecidosCliente.slice(0, 6).map(celula).join('; ')})` : ''}.`,
      r.aCotar ? `${r.aCotar} item(ns) sem referência ficaram **a cotar** (preço em branco, fora do total) [CONFERIR].` : 'Todos os itens têm referência de preço.',
    ],
  });
  // tabela por grupo
  const porGrupo = new Map();
  for (const l of linhas) {
    const g = l.grupo || 'Materiais';
    const t = l.preco != null ? Number(l.quantidade || 0) * Number(l.preco) : 0;
    porGrupo.set(g, (porGrupo.get(g) || 0) + t);
  }
  secoes.push({
    titulo: 'Por grupo',
    linhas: ['| Grupo | Total (R$) |', '|---|---|',
      ...[...porGrupo].map(([g, t]) => `| ${celula(g)} | ${moeda(t)} |`),
      `| **Subtotal material** | **${moeda(r.subtotal)}** |`,
      `| Contingência ${String(contingenciaPct).replace('.', ',')} % | ${moeda(r.contingencia)} |`,
      `| **Total** | **${moeda(r.total)}** |`],
  });
  // itens que mais pesam
  const comTotal = linhas.filter(l => l.preco != null).map(l => ({ ...l, total: Number(l.quantidade || 0) * Number(l.preco) })).sort((a, b) => b.total - a.total);
  if (comTotal.length) {
    secoes.push({
      titulo: 'Itens que mais pesam',
      linhas: ['| Item | Preço unitário | Fonte |', '|---|---|---|',
        ...comTotal.slice(0, 5).map(l => `| ${celula(l.descricao).slice(0, 90)} | ${moeda(l.preco)}${Number(l.quantidade) > 1 ? ` × ${String(l.quantidade).replace('.', ',')}` : ''} | ${celula(l.fonte).slice(0, 80) || l.origem} |`)],
    });
  }
  // pesquisado × estimativa
  const po = r.porOrigem;
  secoes.push({
    titulo: 'Pesquisado × estimativa',
    linhas: [
      `- ${milhar(po[ORIGENS.pesquisado].total)} com preço **pesquisado** (cotação de fornecedor ou loja, com fonte e data) — ${po[ORIGENS.pesquisado].itens} item(ns).`,
      `- ${milhar(po[ORIGENS.estimativa].total)} são **estimativa H&M** (vendido/catálogo) e precisam de cotação — ${po[ORIGENS.estimativa].itens} item(ns).`,
      ...(po[ORIGENS.cliente].itens ? [`- ${milhar(po[ORIGENS.cliente].total)} com preço informado pelo **cliente** — ${po[ORIGENS.cliente].itens} item(ns).`] : []),
      '- Preço de varejo/loja: com CNPJ em distribuidor tende a sair menor — **tratar como teto**.',
    ],
  });
  // onde economizar: item cuja faixa encontrada tem preço menor que o adotado
  const economia = comTotal.filter(l => l.faixaMin != null && l.faixaMin < l.preco)
    .map(l => ({ ...l, economia: (l.preco - l.faixaMin) * Number(l.quantidade || 0) })).sort((a, b) => b.economia - a.economia);
  const totalEconomia = economia.reduce((s, l) => s + l.economia, 0);
  secoes.push({
    titulo: 'Onde economizar',
    linhas: economia.length
      ? [...economia.slice(0, 5).map(l => `- ${celula(l.descricao).slice(0, 80)}: adotado ${moeda(l.preco)} × menor referência ${moeda(l.faixaMin)} → ${milhar(l.economia)} a menos (conferir se é o mesmo item/robustez).`),
        `- No total, igualando ao menor preço encontrado: ${milhar(totalEconomia)} a menos.`]
      : ['- Nenhuma referência mais barata do mesmo item foi encontrada; a economia viria de linha econômica equivalente (conferir robustez).'],
  });
  // mudanças em relação ao anteprojeto (modelo especificado × referência pesquisada)
  const mudancas = linhas.filter(l => l.modelo && l.referencia && !String(l.referencia).toUpperCase().includes(String(l.modelo).toUpperCase()));
  secoes.push({
    titulo: 'Mudanças em relação ao anteprojeto',
    linhas: !anteprojeto
      ? ['- Esta lista não veio de um anteprojeto do sistema: sem comparação de modelos.']
      : mudancas.length
        ? mudancas.slice(0, 10).map(l => `- ${celula(l.descricao).slice(0, 70)}: especificado ${celula(l.modelo)} → pesquisado ${celula(l.referencia).slice(0, 70)} (equivalente — [CONFERIR]).`)
        : ['- Os modelos pesquisados são os do anteprojeto.'],
  });
  // itens que dependem da Icc
  const icc = linhas.filter(l => DEPENDE_ICC.test(`${l.descricao} ${l.referencia || ''}`));
  secoes.push({
    titulo: 'Itens que dependem da Icc',
    linhas: icc.length
      ? [`- ${icc.slice(0, 8).map(l => celula(l.descricao).slice(0, 60)).join('; ')}${icc.length > 8 ? ` e mais ${icc.length - 8}` : ''}: podem mudar de versão e preço depois de confirmada a Icc no ponto de alimentação (Icu/Icw).`]
      : ['- Nenhum item de proteção sensível à Icc nesta lista.'],
  });
  return { secoes, resumo: r };
}

module.exports = {
  respostaQuadro, respostaPrecos, pedidoTruncado, FOLHAS_QUADRO, PACOTE_PADRAO, PONTOS_PADRAO_QUADRO, FALTA_PADRAO_QUADRO, RESSALVAS_QUADRO, DEPENDE_ICC,
};
