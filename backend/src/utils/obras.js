// Regras puras da entidade Obra (versão 2.0, Fase 2D) — sem banco, testadas em
// testes/obras.test.js. Usadas pela migração 2.0-04-obras.js (ligar os dados
// antigos) e pelo controllers/obrasController.js (orçado × realizado).

const STATUS_OBRA = ['prospeccao', 'orcamento', 'contratada', 'execucao', 'concluida', 'cancelada'];
const ROTULO_STATUS = {
  prospeccao: 'Prospecção', orcamento: 'Orçamento', contratada: 'Contratada',
  execucao: 'Em execução', concluida: 'Concluída', cancelada: 'Cancelada',
};
const SEGMENTOS = ['publico', 'privado'];

// Texto para comparação: sem acento, minúsculo, só letras/números separados
// por um espaço ("Hospital Santa Lúcia - DF" → "hospital santa lucia df").
function normalizarTexto(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// OB-AAAA-NNN (NNN cresce por ano; passa de 999 sem quebrar: OB-2026-1000)
function formatarCodigo(ano, n) {
  return `OB-${ano}-${String(n).padStart(3, '0')}`;
}

// Próximo número do ano a partir dos códigos já usados (qualquer ano na lista).
function proximoSequencial(codigos, ano) {
  let maior = 0;
  const re = new RegExp(`^OB-${ano}-(\\d+)$`);
  for (const c of codigos || []) {
    const m = re.exec(String(c || ''));
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  return maior + 1;
}

const dataBR = (d) => {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? x.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
};

const corta = (s, n = 200) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Nome da obra criada a partir de uma análise: nome do projeto; senão
// cliente + data; senão o nome da pasta/1º arquivo; senão "Projeto <id>".
function nomeObraDaAnalise(a) {
  if (corta(a.nome_projeto)) return corta(a.nome_projeto);
  if (corta(a.cliente_nome)) return corta(`${corta(a.cliente_nome, 170)} — ${dataBR(a.criado_em)}`.replace(/ — $/, ''));
  if (corta(a.pasta)) return corta(a.pasta);
  const arq = Array.isArray(a.arquivos_analisados) && a.arquivos_analisados[0];
  const nomeArq = arq && corta(String(arq.nomeArquivo || arq.arquivo || '').replace(/\.[^.]+$/, ''));
  return nomeArq || `Projeto ${a.id}`;
}

// Chave de agrupamento das propostas "soltas" (sem análise/laudo): o mesmo
// local de obra do mesmo cliente é a mesma obra. Sem local → null (uma obra
// por proposta). Cliente pelo id do cadastro; sem cadastro, pelo nome.
function chavePropostaSolta(p) {
  const local = normalizarTexto(p.local_obra);
  if (!local) return null;
  const cliente = p.cliente_id ? `c${p.cliente_id}` : `n${normalizarTexto(p.cliente_nome)}`;
  return `${local}|${cliente}`;
}

// Agrupa as propostas soltas (ordem: menor id primeiro, em grupos e dentro deles).
function agruparPropostasSoltas(propostas) {
  const grupos = new Map();
  const ordenadas = [...(propostas || [])].sort((a, b) => a.id - b.id);
  for (const p of ordenadas) {
    const chave = chavePropostaSolta(p) || `proposta:${p.id}`;
    if (!grupos.has(chave)) grupos.set(chave, { chave, propostas: [] });
    grupos.get(chave).propostas.push(p);
  }
  return [...grupos.values()];
}

// "palavra inteira contida": "santa lucia sobradinho" está em
// "hospital santa lucia sobradinho df", mas "df" sozinho não conta (curto).
function contemPalavras(maior, menor) {
  if (!maior || !menor || menor.length < 8) return false;
  return ` ${maior} `.includes(` ${menor} `);
}

// Nome da obra de um grupo de propostas soltas: "Cliente — Local" (só o local
// quando ele já cita o cliente); sem local, "Cliente — P123".
function nomeObraDasPropostas(grupo) {
  const p = grupo.propostas[0];
  const local = corta(p.local_obra);
  const cliente = corta(p.cliente_nome);
  if (!local) return corta(`${cliente || 'Sem cliente'} — ${p.numero || `proposta ${p.id}`}`);
  const nl = normalizarTexto(local);
  const nc = normalizarTexto(cliente);
  if (!nc || ` ${nl} `.includes(` ${nc} `)) return local;
  return corta(`${cliente} — ${local}`);
}

// Status inicial da obra criada pela migração: proposta aprovada → contratada.
function deduzirStatus(statusPropostas) {
  return (statusPropostas || []).some(s => s === 'Aprovada') ? 'contratada' : 'orcamento';
}

const STATUS_EM_ANDAMENTO = new Set(['contratada', 'execucao', 'concluida']);

// Contrato de prestador → obra pelo local digitado (contratos.local_obra):
//   3 pontos: igual (normalizado) ao nome ou ao local da obra;
//   2 pontos: um contém o outro em palavras inteiras (mínimo 8 letras).
// Empate no melhor placar: vale a obra já contratada/em execução; se ainda
// houver mais de uma, o contrato fica SEM obra (o usuário liga na tela —
// melhor sem vínculo do que no lugar errado).
function escolherObraParaContrato(localContrato, obras) {
  const alvo = normalizarTexto(localContrato);
  if (!alvo) return null;
  let melhor = 0;
  let empatadas = [];
  for (const o of obras || []) {
    let pontos = 0;
    for (const campo of [o.nome, o.local]) {
      const n = normalizarTexto(campo);
      if (!n) continue;
      if (n === alvo) pontos = Math.max(pontos, 3);
      else if (contemPalavras(n, alvo) || contemPalavras(alvo, n)) pontos = Math.max(pontos, 2);
    }
    if (!pontos) continue;
    if (pontos > melhor) { melhor = pontos; empatadas = [o]; } else if (pontos === melhor) empatadas.push(o);
  }
  if (empatadas.length === 1) return empatadas[0].id;
  const andamento = empatadas.filter(o => STATUS_EM_ANDAMENTO.has(o.status));
  return andamento.length === 1 ? andamento[0].id : null;
}

// Laudo antigo → análise de onde veio ("Calcular pela norma"): o laudo nasce
// com o título = nome do projeto (ou cliente) da análise e o mesmo cliente.
// Entre as análises anteriores ao laudo que batem, fica a mais recente.
function analiseDeOrigemDoLaudo(laudo, analises) {
  const titulos = new Set([normalizarTexto(laudo.titulo), normalizarTexto(laudo.obra_nome)].filter(Boolean));
  if (!titulos.size) return null;
  const cliente = normalizarTexto(laudo.cliente_nome);
  const quando = laudo.criado_em ? new Date(laudo.criado_em).getTime() : Infinity;
  const candidatas = (analises || []).filter(a => {
    const nome = normalizarTexto(a.nome_projeto || a.cliente_nome);
    return nome && titulos.has(nome) && normalizarTexto(a.cliente_nome) === cliente
      && (!a.criado_em || new Date(a.criado_em).getTime() <= quando);
  });
  candidatas.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0) || b.id - a.id);
  return candidatas[0] || null;
}

// ORÇADO da obra (regra única, usada na lista e no detalhe):
//   1. soma do total das propostas APROVADAS ligadas à obra;
//   2. nenhuma aprovada → total da proposta ATIVA mais recente (maior data;
//      empate, maior id) — é a versão em negociação; somar as ativas contaria
//      duas vezes as revisões do mesmo escopo;
//   3. sem aprovada nem ativa → 0.
// Recusadas e canceladas nunca entram.
function calcularOrcado(propostas) {
  const lista = propostas || [];
  const aprovadas = lista.filter(p => p.status === 'Aprovada');
  if (aprovadas.length) {
    return { valor: arred(aprovadas.reduce((s, p) => s + (Number(p.total) || 0), 0)), base: 'aprovadas', propostas: aprovadas.map(p => p.id) };
  }
  const ativas = lista.filter(p => p.status === 'Ativa')
    .sort((a, b) => (new Date(b.data || 0) - new Date(a.data || 0)) || (b.id - a.id));
  if (ativas.length) return { valor: arred(Number(ativas[0].total) || 0), base: 'ultima_ativa', propostas: [ativas[0].id] };
  return { valor: 0, base: 'nenhuma', propostas: [] };
}

function arred(v) { return Math.round((Number(v) || 0) * 100) / 100; }

// REALIZADO = despesas ligadas à obra (financeiro_movimentos tipo 'realizado',
// Pix/pagamento feito); RECEBIDO = entradas ligadas (tipo 'recebido').
// CONTRATADO = soma dos contratos de prestador ligados (custo comprometido,
// informativo — não entra na margem, que só conta o que já saiu).
// MARGEM = orçado − realizado (e % sobre o orçado); A RECEBER = orçado − recebido.
function resumoFinanceiro({ propostas = [], movimentos = [], contratos = [] } = {}) {
  const orcado = calcularOrcado(propostas);
  const soma = (tipo) => arred(movimentos.filter(m => m.tipo === tipo).reduce((s, m) => s + (Number(m.valor) || 0), 0));
  const realizado = soma('realizado');
  const recebido = soma('recebido');
  const contratado = arred(contratos.reduce((s, c) => s + (Number(c.valor) || 0), 0));
  const margem = arred(orcado.valor - realizado);
  return {
    orcado: orcado.valor, orcado_base: orcado.base, orcado_propostas: orcado.propostas,
    realizado, recebido, contratado,
    margem, margem_pct: orcado.valor > 0 ? Math.round((margem / orcado.valor) * 1000) / 10 : null,
    a_receber: arred(orcado.valor - recebido),
  };
}

// obra_id/obraId enviado numa criação/edição de proposta, análise, laudo,
// contrato ou movimento. Ausente → { presente: false } (edição mantém o atual);
// null/'' → desliga; inteiro positivo → liga; outra coisa → erro.
function lerObraId(body) {
  const tem = (k) => body && Object.prototype.hasOwnProperty.call(body, k);
  if (!tem('obra_id') && !tem('obraId')) return { presente: false, valor: null };
  const v = tem('obra_id') ? body.obra_id : body.obraId;
  if (v === null || v === undefined || v === '' || v === 'null') return { presente: true, valor: null };
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) return { presente: true, valor: null, erro: 'Obra inválida.' };
  return { presente: true, valor: n };
}

// Confere se a obra existe (executor = pool ou client). Devolve a mensagem de
// erro ou null.
async function conferirObra(executor, leitura) {
  if (leitura.erro) return leitura.erro;
  if (!leitura.presente || leitura.valor == null) return null;
  const { rows } = await executor.query('SELECT 1 FROM obras WHERE id = $1', [leitura.valor]);
  return rows.length ? null : 'Obra não encontrada.';
}

// Trecho de SELECT que devolve { id, codigo, nome } da obra (ou null).
const sqlObraJson = (alias) => `CASE WHEN ${alias}.id IS NULL THEN NULL ELSE json_build_object('id', ${alias}.id, 'codigo', ${alias}.codigo, 'nome', ${alias}.nome, 'status', ${alias}.status) END`;

module.exports = {
  STATUS_OBRA, ROTULO_STATUS, SEGMENTOS,
  normalizarTexto, formatarCodigo, proximoSequencial, nomeObraDaAnalise,
  chavePropostaSolta, agruparPropostasSoltas, nomeObraDasPropostas, deduzirStatus,
  escolherObraParaContrato, analiseDeOrigemDoLaudo, contemPalavras,
  calcularOrcado, resumoFinanceiro, lerObraId, conferirObra, sqlObraJson,
};
