// Projetos e laudos por disciplina — orçamento: o orçamento da skill (execução
// no projeto, inspeção/correção no laudo) vira uma proposta, com os materiais
// casados com o catálogo e os serviços com o preço de referência do segmento
// do cliente; gerar de novo atualiza a proposta ligada enquanto ela está Ativa.
const pool = require('../../config/database');
const { motorDaDisciplina, tiposDocumento } = require('../../utils/disciplinasLaudo');
const { compararComCatalogo } = require('../../utils/semelhancaMateriais');
const { comTransacao } = require('../../services/transacao');
const { hojeBrasilia } = require('../../utils/dataHoje');
const { calcularTotais } = require('../../utils/calculoProposta');
const { validarProposta } = require('../../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('../propostasController');
const { classificarPendentesEmSegundoPlano } = require('../../services/classificacaoMateriais');
const { buscarPrecosReferencia, segmentoDoCliente } = require('../../services/precosMaoDeObraReferencia');
const { carregarLaudo, conferirUso, processarComMotor } = require('./comum');

const nomeDoTipo = (laudo) => (laudo?.tipo === 'projeto' ? 'Projeto' : 'Laudo');

// ── Orçamento ───────────────────────────────────────────────────────────────

// Monta os itens da proposta integrando com o catálogo:
// - material: procurado no catálogo (mesma comparação da Análise de Projeto);
//   achou com preço → entra com o preço e "confirmado"; senão "a_cotar" e o
//   próprio salvamento da proposta cadastra o material novo no catálogo;
// - serviço: valor da tabela de preços de referência de mão de obra (pelo
//   `codigo`) — o adotado pela H&M ou, sem ele, a referência de mercado do
//   segmento do cliente (órgão público → oficial; demais → particular) —,
//   sempre "a_cotar": referência é sugestão, não preço fechado.
async function montarItensProposta(orcamento, segmento = 'privado') {
  const catalogo = (await pool.query(
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;
  const ref = await buscarPrecosReferencia(segmento);

  const estatistica = { materiaisNoCatalogo: 0, materiaisNovos: 0, servicosComReferencia: 0, servicosSemReferencia: 0, segmento };
  const itens = orcamento.itens.map(it => {
    // `codigo` vai para proposta_itens: liga o serviço à tabela de preços de referência
    const base = { secao_nome: it.secao, codigo: it.codigo || null, descricao: String(it.descricao).slice(0, 500), quantidade: Number(it.quantidade) || 0, unidade: it.unidade || null, subgrupo: it.subgrupo || null };
    if (it.secao === 'Materiais e Equipamentos') {
      const achado = compararComCatalogo(it.descricao, catalogo);
      if (achado && achado.preco_catalogo > 0) {
        estatistica.materiaisNoCatalogo++;
        return { ...base, material_id: achado.material_id, valor_unitario: achado.preco_catalogo, status: base.quantidade > 0 ? 'confirmado' : 'a_cotar' };
      }
      estatistica.materiaisNovos++;
      return { ...base, material_id: achado?.material_id || null, valor_unitario: 0, status: 'a_cotar' };
    }
    const valor = it.codigo && ref[it.codigo] ? ref[it.codigo] : 0;
    estatistica[valor ? 'servicosComReferencia' : 'servicosSemReferencia']++;
    return { ...base, valor_unitario: valor, status: 'a_cotar' };
  });
  return { itens, estatistica };
}

async function gerarOrcamento(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  if (laudo.gerar_orcamento === false) return res.status(409).json({ erro: `Este ${nomeDoTipo(laudo).toLowerCase()} está marcado como "sem orçamento". Ative a opção de orçamento para gerar.` });
  const motor = motorDaDisciplina(laudo.disciplina);
  const modo = req.body?.modo;
  const modoInfo = motor.modosOrcamento.find(m => m.modo === modo);
  if (!modoInfo) return res.status(400).json({ erro: 'Escolha o tipo de orçamento.' });
  // 2.1: projeto → orçamento de execução; laudo → orçamento de inspeção/correção.
  // Proposta que já estava ligada no outro modo (antes da 2.1) continua atualizável.
  if (!(laudo.propostas || {})[modo]) {
    const erroUso = conferirUso(laudo, tiposDocumento().usoDoModo(laudo.disciplina, modo), `O orçamento "${modoInfo.rotulo}"`);
    if (erroUso) return res.status(400).json({ erro: erroUso });
  }

  const resultado = processarComMotor(motor, laudo.dados);
  let orcamento;
  try {
    orcamento = motor.montarOrcamento(resultado, modo);
  } catch (e) {
    return res.status(400).json({ erro: e.message });
  }
  // cliente do orçamento: o da OBRA ligada (cadastro do sistema) > o do registro >
  // o digitado no formulário. Antes valia só o do formulário: o orçamento de um
  // laudo da obra do cliente X saía para "CLIENTE EXEMPLO" (teste de 28/10/2026).
  let cli = null;
  if (laudo.obra_id) {
    const { rows: [o] } = await pool.query(
      'SELECT c.id, c.nome, c.tipo, o.cliente_nome FROM obras o LEFT JOIN clientes c ON c.id = o.cliente_id AND c.ativo WHERE o.id = $1', [laudo.obra_id]);
    if (o?.id) cli = { id: o.id, nome: o.nome, tipo: o.tipo };
    else if (o?.cliente_nome) cli = { id: null, nome: o.cliente_nome, tipo: null };
  }
  if (!cli && laudo.cliente_id) cli = (await pool.query('SELECT id, nome, tipo FROM clientes WHERE id = $1 AND ativo', [laudo.cliente_id])).rows[0] || null;
  const clienteNome = (cli?.nome || orcamento.cliente_nome || '').trim();
  if (!clienteNome) return res.status(400).json({ erro: 'Preencha o nome do cliente no formulário antes de gerar o orçamento.' });

  if (!cli?.id) cli = (await pool.query('SELECT id, tipo FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1', [clienteNome])).rows[0] || cli;
  const clienteId = cli?.id || null;
  const { itens, estatistica } = await montarItensProposta(orcamento, segmentoDoCliente(cli?.tipo, clienteNome));
  const nomesSecoes = [...new Set(itens.map(i => i.secao_nome))];
  // `id` distinto por seção: inserirSecoesEItens casa item→seção por sid OU nome
  const secoes = nomesSecoes.map((nome, i) => ({ id: i + 1, nome }));
  const dataHoje = hojeBrasilia(); // toISOString daria amanhã depois das 21h
  const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: clienteNome, secoes, itens });
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  const rotuloModo = motor.modosOrcamento.find(m => m.modo === modo).rotulo;
  const origem = `Laudos e projetos #${laudo.id} (${laudo.disciplina.toUpperCase()} — ${rotuloModo})`;

  const resultadoTx = await comTransacao(async (client) => {
    // Trava o registro e relê o vínculo DENTRO da transação: com o vínculo
    // lido antes (fora dela), dois cliques em "Gerar orçamento" criavam duas
    // propostas. Agora o segundo espera o primeiro terminar e atualiza a
    // proposta que ele criou (revisão de 27/10/2026).
    const trava = await client.query('SELECT propostas FROM laudos_projetos WHERE id = $1 FOR UPDATE', [laudo.id]);
    if (!trava.rows.length) return null;
    // Proposta vinculada: só é atualizada enquanto estiver "Ativa" (aprovada ou
    // recusada fica intacta e nasce uma nova), mantendo BDI e impostos dela.
    const vinculadaId = (trava.rows[0].propostas || {})[modo] || null;
    const vinculadaInfo = vinculadaId
      ? (await client.query('SELECT numero, status, bdi, bdi_materiais, imposto_venda, imposto_servico FROM propostas WHERE id = $1 FOR UPDATE', [vinculadaId])).rows[0]
      : null;
    const vinculada = vinculadaInfo && vinculadaInfo.status === 'Ativa' ? vinculadaId : null;
    const totais = calcularTotais({ secoes, itens,
      bdi: vinculada ? Number(vinculadaInfo.bdi) || 0 : 0,
      bdi_materiais: vinculada ? vinculadaInfo.bdi_materiais : null, // BDI diferenciado (2.0, Fase 3F) também é mantido
      imposto_venda: vinculada ? Number(vinculadaInfo.imposto_venda) || 0 : 0,
      imposto_servico: vinculada ? Number(vinculadaInfo.imposto_servico) || 0 : 0 });

    if (vinculada) { // linha já travada acima
      await client.query(
        `UPDATE propostas SET data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, escopo=$5, observacoes=$6,
          subtotal_materiais=$7, subtotal_mao_obra=$8, valor_bdi=$9, valor_imposto_venda=$10, valor_imposto_servico=$11,
          total=$12, atualizado_em=NOW(), versao=versao+1, obra_id=COALESCE(obra_id, $14) WHERE id=$13`,
        [dataHoje, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
         totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi, totais.valor_imposto_venda,
         totais.valor_imposto_servico, totais.total, vinculada, laudo.obra_id || null]
      );
      await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [vinculada]);
      await inserirSecoesEItens(client, vinculada, secoes, itens);
      await registrarEvento(client, vinculada, req.usuario.id, 'editada', `Atualizada a partir de ${origem}`);
      return { propostaId: vinculada, numero: vinculadaInfo.numero, criada: false };
    }
    const seq = await proximoNumero(client);
    const numeroGerado = 'P' + String(seq).padStart(3, '0');
    const { rows } = await client.query(
      `INSERT INTO propostas (numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, escopo, observacoes,
        bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total, usuario_id, obra_id, origem_tipo, origem_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'laudo',$21) RETURNING id`,
      [numeroGerado, seq, dataHoje, 5, clienteId, clienteNome, req.usuario.nome, orcamento.escopo, orcamento.observacoes,
       0, 0, 0, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
       totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id,
       laudo.obra_id || null, laudo.id] // a proposta herda a obra do laudo e guarda a origem
    );
    const novaId = rows[0].id;
    await inserirSecoesEItens(client, novaId, secoes, itens);
    await registrarEvento(client, novaId, req.usuario.id, 'criada', `Proposta ${numeroGerado} criada a partir de ${origem}`);
    await client.query(
      `UPDATE laudos_projetos SET propostas = propostas || jsonb_build_object($1::text, $2::int) WHERE id = $3`,
      [modo, novaId, laudo.id]
    );
    return { propostaId: novaId, numero: numeroGerado, criada: true };
  });
  if (!resultadoTx) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const { propostaId, numero, criada } = resultadoTx;

  classificarPendentesEmSegundoPlano(); // materiais novos do orçamento sem categoria → IA
  res.json({
    propostaId, numero, criada, estatistica,
    mensagem: `Orçamento ${numero} ${criada ? 'criado' : 'atualizado'} (${rotuloModo}): ${estatistica.materiaisNoCatalogo} materiais com preço do catálogo, ` +
      `${estatistica.materiaisNovos} a cotar, ${estatistica.servicosComReferencia} serviços com preço de referência (${estatistica.segmento === 'publico' ? 'referência oficial — cliente órgão público' : 'mercado particular'}).`,
  });
}

module.exports = { gerarOrcamento };
