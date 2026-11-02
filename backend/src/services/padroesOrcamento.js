const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoria');

// BDI e impostos padrão das propostas NOVAS. Não há valor de fábrica: as alíquotas da reforma
// tributária ainda não existem, então quem define é o administrador (Integrações). Chave ausente
// ou vazia = "não definido" (null) e ninguém inventa número no lugar. Proposta já salva guarda o
// próprio valor e nunca muda quando a configuração muda.
const CAMPOS = {
  bdi: { chave: 'bdi_padrao', rotulo: 'BDI', max: 999.99 },
  imposto_venda: { chave: 'imposto_venda_padrao', rotulo: 'Imposto sobre a venda de material', max: 100 },
  imposto_servico: { chave: 'imposto_servico_padrao', rotulo: 'Imposto sobre serviço', max: 100 },
};

const vazio = (v) => v == null || String(v).trim() === '';

// 'vazio' limpa o valor; número em % de 0 até o teto do campo; o resto é erro de digitação
function lerPercentual(campo, bruto) {
  if (vazio(bruto)) return { valor: null };
  const n = Number(String(bruto).replace(',', '.'));
  const { rotulo, max } = CAMPOS[campo];
  if (!Number.isFinite(n) || n < 0 || n > max) return { erro: `${rotulo} inválido (de 0 a ${max}%)` };
  return { valor: Math.round(n * 100) / 100 };
}

async function obterPadroes(executor = pool) {
  const { rows } = await executor.query('SELECT chave, valor FROM configuracoes WHERE chave = ANY($1)', [Object.values(CAMPOS).map(c => c.chave)]);
  const porChave = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
  const padroes = {};
  for (const [campo, { chave }] of Object.entries(CAMPOS)) {
    const n = vazio(porChave[chave]) ? NaN : Number(porChave[chave]);
    padroes[campo] = Number.isFinite(n) ? n : null;
  }
  padroes.definidos = Object.values(padroes).every(v => v !== null);
  return padroes;
}

// Só os campos enviados mudam; mandar vazio apaga (volta a "não definido")
async function salvarPadroes(corpo, usuarioId, executor = pool) {
  const novos = {};
  for (const campo of Object.keys(CAMPOS)) {
    if (!(campo in (corpo || {}))) continue;
    const r = lerPercentual(campo, corpo[campo]);
    if (r.erro) return { erro: r.erro };
    novos[campo] = r.valor;
  }
  const anterior = await obterPadroes(executor);
  for (const [campo, valor] of Object.entries(novos)) {
    const { chave } = CAMPOS[campo];
    if (valor === null) await executor.query('DELETE FROM configuracoes WHERE chave = $1', [chave]);
    else await executor.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
       ON CONFLICT (chave) DO UPDATE SET valor = $2, atualizado_em = NOW()`, [chave, String(valor)]);
  }
  const atual = await obterPadroes(executor);
  await registrarAuditoria(executor, {
    entidade: 'configuracoes', acao: 'padroes_orcamento', usuarioId,
    detalhes: { anterior: { bdi: anterior.bdi, imposto_venda: anterior.imposto_venda, imposto_servico: anterior.imposto_servico },
      nova: { bdi: atual.bdi, imposto_venda: atual.imposto_venda, imposto_servico: atual.imposto_servico } },
  });
  return { padroes: atual };
}

// Valor para proposta criada pelo servidor (orçamento da análise/laudo, assistente): o padrão
// configurado ou 0 — e `aviso` quando faltou definir, para o usuário saber que veio zerado.
async function padroesParaPropostaNova(executor = pool) {
  const p = await obterPadroes(executor);
  return {
    bdi: p.bdi ?? 0, imposto_venda: p.imposto_venda ?? 0, imposto_servico: p.imposto_servico ?? 0,
    aviso: p.definidos ? null : 'BDI e impostos padrão ainda não foram definidos (Integrações → BDI e impostos padrão): a proposta nasceu com o que faltava em 0 %.',
  };
}

module.exports = { CAMPOS, lerPercentual, obterPadroes, salvarPadroes, padroesParaPropostaNova };
