import { getTodosClientes, getTodosMateriais, getServicos } from '../../services/api';

// Funções de apoio do editor de orçamento (pages/Orcamento.js): rascunho no navegador,
// formulário vazio, seções padrão, origem da proposta e filtros do catálogo.

// BDI diferenciado de materiais preenchido? (vazio/null = mesmo BDI para tudo — calculoProposta.bdiMateriaisDefinido)
export const temBdiMateriais = (v) => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

// Item pertence à seção só quando os DOIS lados têm id (calculoProposta.itemPertenceASecao:
// sid e id ambos vazios contavam o item em todas as seções)
export const pertenceASecao = (it, sid) => sid != null && it.sid != null && String(it.sid) === String(sid);

// Rascunho da proposta neste navegador (localStorage), por usuário e por
// proposta ("nova" = ainda não gravada): sessão vencida, aba fechada ou queda
// de energia não levam o trabalho junto — ao reabrir, a tela oferece restaurar.
export const chaveRascunho = (usuarioId, propostaId) => `hm_rascunho_proposta:${usuarioId || 0}:${propostaId || 'nova'}`;
export function lerRascunho(chave) {
  try {
    const r = JSON.parse(localStorage.getItem(chave) || 'null');
    return r && r.form && Array.isArray(r.secoes) && Array.isArray(r.itens) ? r : null;
  } catch { return null; }
}
export function gravarRascunho(chave, dados) {
  try { localStorage.setItem(chave, JSON.stringify(dados)); } catch { /* armazenamento cheio: segue sem rascunho */ }
}
export function apagarRascunho(chave) {
  try { localStorage.removeItem(chave); } catch { /* nada */ }
}
// retrato do que está na tela, para saber se há alteração não salva — sem os
// ids temporários (mudam a cada carga): seção pela posição, item sem id
export function retrato(form, secoes, itens) {
  const posicao = new Map(secoes.map((s, i) => [String(s.id), i]));
  return JSON.stringify({
    form,
    secoes: secoes.map(s => s.nome),
    itens: itens.map(({ id, sid, ...resto }) => ({ ...resto, sid: posicao.has(String(sid)) ? posicao.get(String(sid)) : String(sid) })),
  });
}

let contador = 0;
export const gerarId = () => `tmp_${Date.now()}_${contador++}`;

// `padroes` = BDI e impostos padrão do administrador (Integrações); sem valor definido o campo
// nasce 0 — não há número de fábrica (as alíquotas da reforma tributária ainda não existem)
export const formVazio = (padroes) => ({
  // data local (toISOString é UTC: depois das 21 h saía o dia seguinte)
  data: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  validade: 5,
  tipo: '',
  porte: '',
  cliente_nome: '',
  responsavel: '',
  local_obra: '',
  escopo: '',
  pagamento: '',
  observacoes: '',
  bdi: padroes?.bdi ?? 0,
  // BDI diferenciado dos materiais (null = o mesmo BDI) e memória do cálculo
  // pelo TCU (null = BDI digitado à mão) — 2.0, Fase 3F
  bdi_materiais: null,
  bdi_memoria: null,
  imposto_venda: padroes?.imposto_venda ?? 0,
  imposto_servico: padroes?.imposto_servico ?? 0,
  // Só registram o percentual do ÚLTIMO reajuste/desconto aplicado direto
  // nos valores unitários (ver aplicarAjustePercentual) — não entram em
  // nenhuma conta de total, servem só pro PDF avisar quando foi desconto.
  desconto_materiais_pct: null,
  desconto_mao_obra_pct: null,
  // obra (2.0, Fase 2D/2E): a proposta pertence a uma obra (ou a nenhuma);
  // proposta nova aberta a partir da obra (?obra=ID) já vem com ela
  obra_id: null,
});

export const SECOES_PADRAO = () => [
  { id: gerarId(), nome: 'Materiais' },
  { id: gerarId(), nome: 'Mão de Obra' },
];

// Remove acentuação e normaliza caixa/espaços — usado pra comparar nome de
// cliente sem falhar por causa de "CLINICA" x "CLÍNICA", maiúscula/minúscula
// ou espaço a mais.
export function normalizarNome(txt) {
  return (txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// Seções cujo nome sugere trabalho/serviço entram no subtotal de mão de obra; o restante conta como material.
export function ehMaoDeObra(nome) {
  return /m[ãa]o.?de.?obra|serviç|servic/i.test(nome || '');
}

export const CATEGORIAS_MAO_DE_OBRA = [
  'Elétrica', 'Projetos', 'Automação', 'Cabeamento Estruturado', 'Controle de Acesso', 'CFTV', 'Configuração',
];

// Subgrupos sugeridos por padrão (além destes, qualquer nome digitado no item vira sugestão também)
export const SUBGRUPOS_PADRAO = [
  'Alarme', 'Automação', 'CFTV', 'Controle de Acesso', 'Elétrica', 'Redes', 'Sonorização', 'Climatização',
];

// Nas seções de Materiais do orçamento, o campo que antes era "Subgrupo" (texto livre) virou "Categoria",
// com as mesmas opções do cadastro de Materiais (utils/categoriasMateriais.js), pra ficar coligado com o
// catálogo (ver opcoesAgrupamento).

// Bases que o editor carrega inteiras ao abrir (nome = como aparece no aviso de falha)
export const BASES_DO_EDITOR = {
  clientes: { nome: 'a lista de clientes', carregar: () => getTodosClientes() },
  materiais: { nome: 'o catálogo de materiais', carregar: () => getTodosMateriais() },
  servicos: { nome: 'a base de serviços', carregar: () => getServicos() },
};

// Propostas antigas guardam no item subgrupos de texto livre que não batem com
// as categorias do catálogo ("Redes de Computadores (dados)", "Controle de
// Acesso" x "Controle de acesso"...). Comparar sem diferenciar maiúsculas e,
// sem nenhuma correspondência, mostrar o catálogo inteiro evita que o
// "+ catálogo" dessas linhas apareça vazio.
export function filtrarCatalogoPorCategoria(materiais, categoria) {
  const alvo = (categoria || '').trim().toLowerCase();
  if (!alvo) return materiais;
  const daCategoria = materiais.filter(m => (m.categoria || '').trim().toLowerCase() === alvo);
  return daCategoria.length > 0 ? daCategoria : materiais;
}

// Origem do rascunho (versão 2.0 — editor único de orçamento): a Análise de
// Projeto e os laudos GERAM a proposta e abrem este editor. A proposta guarda
// a origem em origem_tipo/origem_id (migração 2.0-05); propostas sem esse
// campo caem na leitura do histórico ("… a partir da Análise de Projeto #12"
// / "… a partir de Laudos e projetos #5 (SPDA — Execução)"; vale o evento mais
// antigo) e do escopo. O vínculo é conferido depois na própria origem
// (analises_projeto.proposta_id / laudos_projetos.propostas), porque uma
// proposta duplicada herda o escopo sem ser a vinculada.
export function origemDaProposta(p) {
  if ((p.origem_tipo === 'analise' || p.origem_tipo === 'laudo') && p.origem_id) {
    const doHistorico = [...(p.eventos || [])].map(e => /Laudos e projetos #\d+\s*\(([^)]*)\)/i.exec(String(e.detalhes || ''))).find(Boolean);
    return { tipo: p.origem_tipo, id: Number(p.origem_id), rotulo: doHistorico ? doHistorico[1] : '' };
  }
  const textos = [...(p.eventos || [])].reverse().map(e => String(e.detalhes || ''));
  textos.push(String(p.escopo || ''));
  for (const t of textos) {
    let m = /An[áa]lise de Projeto #(\d+)/i.exec(t);
    if (m) return { tipo: 'analise', id: Number(m[1]) };
    m = /Laudos e projetos #(\d+)(?:\s*\(([^)]*)\))?/i.exec(t);
    if (m) return { tipo: 'laudo', id: Number(m[1]), rotulo: m[2] || '' };
  }
  return null;
}

// registro (2.1): 'projeto' | 'laudo' — sem ele, a aba Laudos leva o projeto para a aba certa
export const linkDaOrigem = (o) => (o.tipo === 'analise' ? `/obras/analise/${o.id}` : `/obras?aba=${o.registro === 'projeto' ? 'projetos' : 'laudos'}&laudo=${o.id}`);
export const nomeDoRegistro = (o) => (o.registro === 'projeto' ? 'projeto' : o.registro === 'laudo' ? 'laudo' : 'laudo/projeto');
