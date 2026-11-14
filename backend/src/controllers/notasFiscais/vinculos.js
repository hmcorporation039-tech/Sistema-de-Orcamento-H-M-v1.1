// Notas fiscais de serviço — o que a nota liga fora dela: a proposta (de onde vêm obra, itens e número
// para o atestado) e os Pix recebidos que a quitaram (com a obra da proposta levada aos Pix sem obra).
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { levarObraDaNota, levarObraAosPixDaNota } = require('../../services/notasAReceber');
const { lerNota } = require('./comum');

// Propostas do mesmo cliente da nota que podem ser ligadas a ela (não canceladas nem recusadas)
async function propostasCandidatas(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (!n.cliente_id) return res.json([]);
  const { rows } = await pool.query(
    `SELECT id, numero, to_char(data, 'YYYY-MM-DD') AS data, total, status, local_obra
       FROM propostas WHERE cliente_id = $1 AND status IN ('Aprovada', 'Ativa')
      ORDER BY (status = 'Aprovada') DESC, data DESC, id DESC LIMIT 100`, [n.cliente_id]);
  res.json(rows);
}

// Liga (ou desliga, com null) a nota a uma proposta. Não mexe em nada fiscal da nota, por isso vale
// também para nota já emitida. A proposta precisa ser do mesmo cliente da nota.
// Os Pix que já estavam ligados à nota levam a obra da proposta, pela regra do ligar (levarObraAosPixDaNota): só o
// Pix sem obra muda; obra diferente fica e volta em `avisos`. Desligar a proposta não tira a obra de nenhum Pix
// (como no desligar do recebimento: não há como saber se a obra veio da nota ou foi posta à mão).
async function vincularProposta(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const bruto = req.body?.proposta_id;
  const propostaId = bruto == null || bruto === '' ? null : Number(bruto);
  if (propostaId !== null && (!Number.isInteger(propostaId) || propostaId <= 0)) return res.status(400).json({ erro: 'Proposta inválida.' });
  let obraDaProposta = null;
  if (propostaId !== null) {
    const { rows: [p] } = await pool.query('SELECT id, cliente_id, status, obra_id FROM propostas WHERE id = $1', [propostaId]);
    if (!p) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    if (['Cancelada', 'Recusada'].includes(p.status)) return res.status(400).json({ erro: `A proposta está ${p.status.toLowerCase()}.` });
    if (n.cliente_id && p.cliente_id && n.cliente_id !== p.cliente_id) return res.status(400).json({ erro: 'A proposta é de outro cliente.' });
    obraDaProposta = p.obra_id;
  }
  let obra = { preenchidos: [], avisos: [] };
  // numa transação: a nota não fica ligada à proposta com metade dos Pix na obra
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE notas_fiscais SET proposta_id = $1 WHERE id = $2', [propostaId, n.id]);
    if (obraDaProposta) obra = await levarObraAosPixDaNota(client, n.id);
    await registrarAuditoria(client, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'vincular_proposta', usuarioId: req.usuario.id,
      detalhes: { de: n.proposta_id, para: propostaId, ...(obraDaProposta ? { obra_id: obraDaProposta, obra_preenchida_movimentos: obra.preenchidos } : {}) } });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  const nova = await lerNota(n.id);
  res.json({ proposta_id: nova.proposta_id, proposta_numero: nova.proposta_numero, obra_id: obraDaProposta, obras_preenchidas: obra.preenchidos.length, avisos: obra.avisos });
}

// Pix recebidos que podem ter quitado a nota (mesmo valor líquido ou bruto, a partir da emissão) e os já ligados a ela
async function recebimentosCandidatos(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const [{ rows: ligados }, { rows: candidatos }] = await Promise.all([
    pool.query('SELECT id, nome, valor, data_hora FROM financeiro_movimentos WHERE nota_id = $1 ORDER BY data_hora', [n.id]),
    n.situacao !== 'emitida' ? { rows: [] } : pool.query(
      `SELECT id, nome, valor, data_hora FROM financeiro_movimentos
        WHERE tipo = 'recebido' AND nota_id IS NULL
          AND (abs(valor - $1) < 0.01 OR abs(valor - $2) < 0.01)
          AND data_hora >= COALESCE($3::timestamp, '2000-01-01') - interval '1 day'
        ORDER BY data_hora DESC LIMIT 30`, [Number(n.valor_liquido), Number(n.valor_servicos), n.data_emissao]),
  ]);
  res.json({ ligados, candidatos, valor_liquido: Number(n.valor_liquido), valor_servicos: Number(n.valor_servicos) });
}

// Liga (ou desliga, com `ligar: false`) um Pix recebido à nota. Uma nota pode ter mais de um (pagamento parcelado).
// Ao ligar, o Pix sem obra leva a obra da proposta da nota (services/notasAReceber.js, levarObraDaNota); obra que
// ele já tinha não muda. Ao desligar, a obra fica: não há como saber se veio da nota ou foi posta à mão.
async function ligarRecebimento(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const movimentoId = Number(req.body?.movimento_id);
  if (!Number.isInteger(movimentoId) || movimentoId <= 0) return res.status(400).json({ erro: 'Movimento inválido.' });
  const ligar = req.body?.ligar !== false;
  let obra = { obra_id: null, obra_preenchida: false, aviso: null };
  if (ligar) {
    if (n.situacao !== 'emitida') return res.status(409).json({ erro: 'Só nota emitida recebe pagamento.' });
    const { rows } = await pool.query("UPDATE financeiro_movimentos SET nota_id = $1 WHERE id = $2 AND tipo = 'recebido' AND (nota_id IS NULL OR nota_id = $1) RETURNING id", [n.id, movimentoId]);
    if (!rows.length) return res.status(409).json({ erro: 'Esse movimento não é um recebimento livre (já está ligado a outra nota?).' });
    obra = await levarObraDaNota(pool, n.id, movimentoId);
  } else {
    const { rows: [m] } = await pool.query(
      `UPDATE financeiro_movimentos fm SET nota_id = NULL WHERE fm.id = $1 AND fm.nota_id = $2
       RETURNING fm.obra_id, (SELECT o.codigo FROM obras o WHERE o.id = fm.obra_id) AS codigo,
                 fm.obra_id = (SELECT pr.obra_id FROM propostas pr WHERE pr.id = $3) AS da_nota`, [movimentoId, n.id, n.proposta_id]);
    // a obra que pode ter vindo da nota continua no Pix: avisa, para o administrador trocar se não for dela
    if (m?.da_nota) obra = { obra_id: m.obra_id, obra_preenchida: false, aviso: `O Pix continua na obra ${m.codigo}. Se ele não é dessa obra, troque em Financeiro › Movimentos.` };
  }
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: ligar ? 'ligar_recebimento' : 'desligar_recebimento', usuarioId: req.usuario.id,
    detalhes: ligar ? { movimento_id: movimentoId, obra_id: obra.obra_id, obra_preenchida: obra.obra_preenchida } : { movimento_id: movimentoId } });
  const nova = await lerNota(n.id);
  res.json({ recebido_valor: nova.recebido_valor, recebido_em: nova.recebido_em, obra_id: obra.obra_id, obra_preenchida: obra.obra_preenchida, aviso: obra.aviso });
}

module.exports = { propostasCandidatas, vincularProposta, recebimentosCandidatos, ligarRecebimento };
