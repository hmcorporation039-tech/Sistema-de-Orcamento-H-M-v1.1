// Proposta de renovação de laudo: a partir de um vencimento de laudo cria um rascunho de proposta (Ativa) com
// o cliente e a obra do laudo e UM item de serviço "Renovação do laudo…". O valor vem do que a casa já vendeu
// para o mesmo serviço (histórico de propostas aprovadas, services/precosVendidos.js) e, na primeira renovação,
// fica zerado e "a cotar": quem define o preço e o escopo é o engenheiro, o sistema só adianta o rascunho.
// Clicar de novo abre a mesma proposta enquanto ela estiver Ativa; depois que foi aprovada, recusada ou
// cancelada, um novo clique cria outra (o laudo seguinte). Não envia nada ao cliente. Não usa IA.
const pool = require('../config/database');
const { comTransacao } = require('./transacao');
const { hojeBrasilia } = require('../utils/dataHoje');
const { calcularTotais } = require('../utils/calculoProposta');
const { validarProposta } = require('../utils/validacaoProposta');
const { padroesParaPropostaNova } = require('./padroesOrcamento');
const { faixasPorDescricao, chaveDescricao } = require('./precosVendidos');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('../controllers/propostasController');

const SECAO = 'Mão de obra';
const UNIDADE = 'vb';
const ROTULOS = { spda: 'SPDA', incendio: 'incêndio', eletrica: 'instalações elétricas', cftv: 'CFTV', cabeamento: 'cabeamento', outro: 'serviço' };

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const dataBr = (iso) => String(iso).split('-').reverse().join('/');

// Texto do item: sempre o mesmo para a mesma disciplina, para o histórico de preços vendidos encontrar a
// renovação anterior (a descrição do laudo, com o nome do cliente, entra só no escopo).
function descricaoDoItem(disciplina) {
  return `Renovação do laudo de ${ROTULOS[String(disciplina).toLowerCase()] || String(disciplina).toUpperCase()}`;
}

function escopoDaRenovacao(v) {
  return `Renovação do laudo "${v.descricao}", emitido em ${dataBr(v.emitido_em)} com vencimento em ${dataBr(v.vence_em)}. ` +
    'Escopo e valor a confirmar pelo engenheiro responsável antes do envio (a exigência de prazo e de ensaios depende do local).';
}

// Cria o rascunho (ou devolve o que já existe). Devolve { propostaId, numero, criada, aviso, sugestaoDePreco }.
async function criarPropostaRenovacao(vencimentoId, usuario) {
  return comTransacao(async (client) => {
    const { rows: [v] } = await client.query(
      `SELECT id, tipo, ativo, disciplina, descricao, cliente_id, cliente_nome, obra_id, proposta_renovacao_id,
              to_char(emitido_em, 'YYYY-MM-DD') AS emitido_em, to_char(vence_em, 'YYYY-MM-DD') AS vence_em
         FROM vencimentos_laudos WHERE id = $1 FOR UPDATE`, [vencimentoId]);
    if (!v) throw erro(404, 'Vencimento não encontrado.');
    if (v.tipo !== 'laudo') throw erro(400, 'A proposta de renovação vale só para laudos.');
    if (!v.ativo) throw erro(409, 'Este vencimento foi encerrado.');

    if (v.proposta_renovacao_id) {
      const { rows: [p] } = await client.query('SELECT id, numero, status FROM propostas WHERE id = $1', [v.proposta_renovacao_id]);
      if (p && p.status === 'Ativa') return { propostaId: p.id, numero: p.numero, criada: false };
    }

    // cliente: o do vencimento, senão o da obra (o cadastro vale mais que o texto digitado)
    let cliente = { id: v.cliente_id, nome: (v.cliente_nome || '').trim() };
    let local = null;
    if (v.obra_id) {
      const { rows: [o] } = await client.query(
        'SELECT o.local, o.cliente_nome AS obra_cliente, c.id AS cid, c.nome AS cnome FROM obras o LEFT JOIN clientes c ON c.id = o.cliente_id AND c.ativo WHERE o.id = $1', [v.obra_id]);
      if (o) {
        local = o.local || null;
        if (!cliente.nome) cliente = { id: o.cid || null, nome: (o.cnome || o.obra_cliente || '').trim() };
      }
    }
    if (!cliente.nome) throw erro(400, 'Este laudo está sem cliente. Informe o cliente (no cadastro do laudo ou na obra) antes de criar a proposta.');
    if (!cliente.id) {
      const { rows: [c] } = await client.query('SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [cliente.nome]);
      cliente.id = c?.id || null;
    }

    const descricao = descricaoDoItem(v.disciplina);
    const faixa = (await faixasPorDescricao([{ descricao, unidade: UNIDADE }], {}, client))[chaveDescricao(descricao, UNIDADE)];
    const item = { secao_nome: SECAO, descricao, quantidade: 1, unidade: UNIDADE, valor_unitario: faixa ? faixa.ultimo : 0, status: 'a_cotar' };
    const secoes = [{ id: 1, nome: SECAO }];
    const itens = [item];
    const dataHoje = hojeBrasilia();
    const falha = validarProposta({ data: dataHoje, cliente_nome: cliente.nome, secoes, itens });
    if (falha) throw erro(400, falha);

    const padrao = await padroesParaPropostaNova(client);
    const totais = calcularTotais({ secoes, itens, bdi: padrao.bdi, bdi_materiais: null, imposto_venda: padrao.imposto_venda, imposto_servico: padrao.imposto_servico });
    const seq = await proximoNumero(client);
    const numero = 'P' + String(seq).padStart(3, '0');
    const { rows: [nova] } = await client.query(
      `INSERT INTO propostas (numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, local_obra, escopo,
        bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total, usuario_id, obra_id)
       VALUES ($1,$2,$3,5,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [numero, seq, dataHoje, cliente.id, cliente.nome, usuario?.nome || null, local, escopoDaRenovacao(v),
        padrao.bdi, padrao.imposto_venda, padrao.imposto_servico, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
        totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, usuario?.id || null, v.obra_id || null]);
    await inserirSecoesEItens(client, nova.id, secoes, itens);
    await registrarEvento(client, nova.id, usuario?.id || null, 'criada', `Proposta ${numero} criada para renovar o laudo "${v.descricao}" (vencimento ${dataBr(v.vence_em)})`);
    await client.query('UPDATE vencimentos_laudos SET proposta_renovacao_id = $1 WHERE id = $2', [nova.id, v.id]);
    return {
      propostaId: nova.id, numero, criada: true, aviso: padrao.aviso,
      sugestaoDePreco: faixa
        ? `Valor sugerido de R$ ${faixa.ultimo.toFixed(2).replace('.', ',')}, o último fechado (${faixa.ultima_proposta}).`
        : 'Sem valor sugerido: ainda não há renovação aprovada para usar de referência.',
    };
  });
}

module.exports = { criarPropostaRenovacao, descricaoDoItem, escopoDaRenovacao, SECAO, UNIDADE };
