// Análise de Projeto — "Gerar orçamento": a proposta rascunho criada (ou
// atualizada, enquanto Ativa) a partir dos serviços e materiais da análise.
const pool = require('../../config/database');
const { comTransacao } = require('../../services/transacao');
const { hojeBrasilia } = require('../../utils/dataHoje');
const { calcularTotais } = require('../../utils/calculoProposta');
const { padroesParaPropostaNova } = require('../../services/padroesOrcamento');
const { validarProposta } = require('../../utils/validacaoProposta');
const { inserirSecoesEItens, proximoNumero, registrarEvento } = require('../propostasController');
const { linhaParaAnalise } = require('./comum');
const mapaCad = require('../../services/mapaCad');
const { CONFIANCA_CONFIRMA } = require('../../utils/semelhancaMateriais');
const { idsComPrecoNaoConferido } = require('../../services/catalogoMateriais');
const aprendizadoOrcamento = require('../../services/aprendizadoOrcamento');

// Gera (ou atualiza, se já existir) uma proposta rascunho na aba Orçamentos a
// partir do que está salvo na análise — é daqui que o orçamento é concluído
// (BDI, impostos, itens "a cotar" revisados, etc.), a análise só entrega o
// ponto de partida. Botão explícito na tela ("Gerar Orçamento"), nunca
// automático — analisar de novo/editar não cria propostas sozinho.
async function gerarOrcamento(req, res, next) {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Análise não encontrada' });
  const analise = linhaParaAnalise(result.rows[0]);

  if (!analise.cliente || !analise.cliente.trim()) {
    return res.status(400).json({ erro: 'Preencha o nome do cliente na análise antes de gerar o orçamento' });
  }

  // Itens marcados como "já pronto" não fazem parte do escopo orçado —
  // mesmo critério que já vale pro relatório de compatibilização.
  // Itens com quantidade 0 (modelo da disciplina ainda não conferido na
  // planta) também ficam de fora: entravam como "a cotar" com quantidade 0 e
  // poluíam o orçamento. A resposta diz quantos ficaram de fora.
  const temQtd = (x) => Number(x.quantidade) > 0;
  const servicosParaOrcar = (analise.servicos || []).filter(s => !s.pronto && temQtd(s));
  const materiaisParaOrcar = (analise.materiais || []).filter(m => !m.pronto && temQtd(m));
  const semQuantidade = [...(analise.servicos || []), ...(analise.materiais || [])].filter(x => !x.pronto && !temQtd(x)).length;
  if (servicosParaOrcar.length === 0 && materiaisParaOrcar.length === 0) {
    return res.status(400).json({ erro: 'Não há serviços nem materiais a orçar (itens marcados como "já pronto" ou com quantidade 0)' });
  }

  // Tenta casar com um cliente já cadastrado pelo nome — se não achar, a
  // proposta fica só com o nome (igual uma proposta manual com cliente avulso).
  const clienteEncontrado = await pool.query(
    'SELECT id FROM clientes WHERE LOWER(nome) = LOWER($1) AND ativo = true LIMIT 1',
    [analise.cliente.trim()]
  );
  const clienteId = clienteEncontrado.rows[0]?.id || null;

  // material cujo preço foi lido POR IA (cotação lida pela IA, item do assistente) e ninguém conferiu: o preço do
  // catálogo dele não confirma o item sozinho — regra única "o que a IA lê é sugestão" (services/catalogoMateriais.js)
  const precoDaIA = await idsComPrecoNaoConferido(materiaisParaOrcar.map(m => m.material_id));

  const NOME_SECAO_SERVICOS = 'Serviços (Mão de Obra)';
  const NOME_SECAO_MATERIAIS = 'Materiais e Equipamentos';

  // Item "confirmado" só quando tem quantidade real E preço real — senão
  // "a_cotar" (mesmo status que a tela de Orçamento já usa pra sinalizar
  // preço estimado/pendente), pra não passar pro cliente como fechado algo
  // que ainda depende de conferência manual.
  const itensDaAnalise = [
    ...servicosParaOrcar.map(s => ({
      secao_nome: NOME_SECAO_SERVICOS,
      codigo: s.codigo || null,
      descricao: s.descricao,
      quantidade: s.quantidade,
      unidade: s.unidade,
      valor_unitario: s.valor_unitario || 0,
      subgrupo: s.subgrupo || null,
      status: (Number(s.quantidade) > 0 && Number(s.valor_unitario) > 0) ? 'confirmado' : 'a_cotar',
    })),
    ...materiaisParaOrcar.map(m => ({
      secao_nome: NOME_SECAO_MATERIAIS,
      material_id: m.material_id || null,
      descricao: m.descricao,
      quantidade: m.quantidade,
      unidade: m.unidade,
      // preço adotado da pesquisa de mercado (botão "Usar") tem prioridade sobre o catálogo
      valor_unitario: Number(m.preco_unitario) > 0 ? Number(m.preco_unitario) : (m.preco_catalogo || 0),
      subgrupo: m.subgrupo || null,
      // preço 0 no catálogo (padrão da coluna) não é preço: antes saía "confirmado" a R$ 0
      // o preço do catálogo só confirma com o material quase igual (≥ 90%: utils/semelhancaMateriais.js);
      // o adotado na pesquisa de mercado ("Usar") é escolha do usuário e confirma; material SUGERIDO pela IA
      // (compatibilizacaoAnalise: sugerido_ia) é sugestão até alguém conferir no orçamento
      status: (!m.sugerido_ia && Number(m.quantidade) > 0 && (Number(m.preco_unitario) > 0 || (Number(m.preco_catalogo) > 0 && Number(m.confianca_catalogo) >= CONFIANCA_CONFIRMA && !precoDaIA.has(Number(m.material_id))))) ? 'confirmado' : 'a_cotar',
    })),
  ];
  // aprendizado de orçamento da disciplina (services/aprendizadoOrcamento.js): o serviço sem preço recebe o preço
  // praticado nas propostas aprovadas e os itens que a H&M sempre acrescenta nessa disciplina entram "a cotar"
  const conhecimento = await aprendizadoOrcamento.carregarConhecimento({ excluirPropostaId: analise.propostaId || null });
  const { itens, resumo: aprendido } = aprendizadoOrcamento.aplicar(itensDaAnalise, conhecimento,
    { secaoServicos: NOME_SECAO_SERVICOS, secaoMateriais: NOME_SECAO_MATERIAIS });
  const temServicos = itens.some(i => i.secao_nome === NOME_SECAO_SERVICOS);
  const temMateriais = itens.some(i => i.secao_nome === NOME_SECAO_MATERIAIS);
  // `id` aqui não é opcional: inserirSecoesEItens casa item->seção por
  // `it.sid === sec.id || it.secao_nome === sec.nome` — com as duas seções
  // sem id, a primeira condição virava `undefined === undefined` (true) e
  // TODO item entrava em TODAS as seções (confirmado testando a tela: as
  // duas seções saíam com a lista inteira duplicada). Qualquer valor
  // distinto de undefined já resolve, já que os itens não usam `sid`.
  const secoes = [
    ...(temServicos ? [{ id: 1, nome: NOME_SECAO_SERVICOS }] : []),
    ...(temMateriais ? [{ id: 2, nome: NOME_SECAO_MATERIAIS }] : []),
  ];

  const montarEscopo = (temVinculo) => `Gerado automaticamente a partir da Análise de Projeto #${analise.id}` +
    (temVinculo ? ' (atualizado — itens substituídos pela versão mais recente da análise).' : '.') +
    ' Revise quantidades, preços e os itens marcados "A cotar" antes de enviar ao cliente.';
  const dataHoje = hojeBrasilia(); // toISOString daria amanhã depois das 21h

  const erroValidacao = validarProposta({ data: dataHoje, cliente_nome: analise.cliente.trim(), secoes, itens });
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

  const resultadoTx = await comTransacao(async (client) => {
    // Trava a análise e relê o vínculo DENTRO da transação: com o vínculo
    // lido antes (fora dela), dois cliques em "Gerar orçamento" criavam duas
    // propostas. Agora o segundo espera o primeiro terminar e atualiza a
    // proposta que ele criou (revisão de 27/10/2026).
    const trava = await client.query('SELECT proposta_id FROM analises_projeto WHERE id = $1 FOR UPDATE', [analise.id]);
    if (!trava.rows.length) return null;
    const vinculadaId = trava.rows[0].proposta_id || null;
    const escopo = montarEscopo(!!vinculadaId);
    // Proposta vinculada: só é atualizada enquanto estiver "Ativa" — aprovada ou
    // recusada fica intacta e uma proposta NOVA é criada (antes a aprovada era
    // sobrescrita). Ao atualizar, mantém BDI e impostos que já estavam nela
    // (antes o total era recalculado com BDI/impostos zerados).
    const vinculadaInfo = vinculadaId
      ? (await client.query('SELECT numero, status, bdi, bdi_materiais, imposto_venda, imposto_servico, usuario_id FROM propostas WHERE id = $1 FOR UPDATE', [vinculadaId])).rows[0]
      : null;
    // a proposta ligada só é sobrescrita por quem pode alterá-la (dono, administrador ou proposta antiga sem dono —
    // a regra de middleware/posse.js): a rota confere só a posse da ANÁLISE, e uma análise sem dono deixava qualquer
    // usuário trocar os itens editados à mão na proposta de outra pessoa (revisão de 06/11/2026)
    const podeAlterar = !vinculadaInfo || req.usuario.role === 'admin' || vinculadaInfo.usuario_id == null || vinculadaInfo.usuario_id === req.usuario.id;
    if (!podeAlterar) return { semPermissao: vinculadaInfo.numero };
    const atualizarVinculada = !!vinculadaInfo && vinculadaInfo.status === 'Ativa';
    // proposta nova nasce com o BDI e os impostos padrão configurados (0 onde não foram definidos)
    const padrao = atualizarVinculada ? null : await padroesParaPropostaNova(client);
    const bdi = atualizarVinculada ? Number(vinculadaInfo.bdi) || 0 : padrao.bdi;
    const impostoVenda = atualizarVinculada ? Number(vinculadaInfo.imposto_venda) || 0 : padrao.imposto_venda;
    const impostoServico = atualizarVinculada ? Number(vinculadaInfo.imposto_servico) || 0 : padrao.imposto_servico;
    const totais = calcularTotais({ secoes, itens, bdi,
      bdi_materiais: atualizarVinculada ? vinculadaInfo.bdi_materiais : null, // BDI diferenciado (2.0, Fase 3F) também é mantido
      imposto_venda: impostoVenda, imposto_servico: impostoServico });

    if (atualizarVinculada) {
      await client.query(
        `UPDATE propostas SET
          data=$1, cliente_id=$2, cliente_nome=$3, responsavel=$4, escopo=$5,
          subtotal_materiais=$6, subtotal_mao_obra=$7, valor_bdi=$8,
          valor_imposto_venda=$9, valor_imposto_servico=$10, total=$11, atualizado_em=NOW(), versao=versao+1,
          obra_id=COALESCE(obra_id, $13)
         WHERE id=$12`,
        [dataHoje, clienteId, analise.cliente.trim(), req.usuario.nome, escopo,
         totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
         totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, vinculadaId, analise.obraId]
      );
      await client.query('DELETE FROM proposta_secoes WHERE proposta_id = $1', [vinculadaId]);
      await inserirSecoesEItens(client, vinculadaId, secoes, itens);
      await registrarEvento(client, vinculadaId, req.usuario.id, 'editada', `Atualizada a partir da Análise de Projeto #${analise.id}. ${aprendizadoOrcamento.textoDoResumo(aprendido)}`.trim());
      return { propostaId: vinculadaId, numero: vinculadaInfo.numero, criada: false };
    }
    // sem vínculo, ou a proposta vinculada foi excluída/aprovada/recusada: cria uma nova

    const seq = await proximoNumero(client);
    const numeroGerado = 'P' + String(seq).padStart(3, '0');
    const propResult = await client.query(
      `INSERT INTO propostas (
        numero, sequencial, data, validade, cliente_id, cliente_nome, responsavel, escopo,
        bdi, imposto_venda, imposto_servico, subtotal_materiais, subtotal_mao_obra, valor_bdi,
        valor_imposto_venda, valor_imposto_servico, total, usuario_id, obra_id, origem_tipo, origem_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'analise',$20)
      RETURNING id`,
      [numeroGerado, seq, dataHoje, 5, clienteId, analise.cliente.trim(), req.usuario.nome, escopo,
       bdi, impostoVenda, impostoServico, totais.subtotal_materiais, totais.subtotal_mao_obra, totais.valor_bdi,
       totais.valor_imposto_venda, totais.valor_imposto_servico, totais.total, req.usuario.id,
       analise.obraId, analise.id] // a proposta herda a obra da análise e guarda a origem
    );
    const novaPropostaId = propResult.rows[0].id;
    await inserirSecoesEItens(client, novaPropostaId, secoes, itens);
    await registrarEvento(client, novaPropostaId, req.usuario.id, 'criada', `Proposta ${numeroGerado} criada a partir da Análise de Projeto #${analise.id}. ${aprendizadoOrcamento.textoDoResumo(aprendido)}`.trim());
    await client.query('UPDATE analises_projeto SET proposta_id = $1 WHERE id = $2', [novaPropostaId, analise.id]);
    return { propostaId: novaPropostaId, numero: numeroGerado, criada: true, aviso: padrao.aviso };
  });
  if (!resultadoTx) return res.status(404).json({ erro: 'Análise não encontrada' });
  if (resultadoTx.semPermissao) return res.status(403).json({ erro: `O orçamento ${resultadoTx.semPermissao} ligado a esta análise foi criado por outro usuário. Peça a ele ou a um administrador para atualizá-lo.` });
  const { propostaId, numero, criada, aviso: avisoPadroes } = resultadoTx;
  const textoAprendido = aprendizadoOrcamento.textoDoResumo(aprendido);

  const aviso = semQuantidade ? ` (${semQuantidade} item(ns) com quantidade 0 ficaram de fora — preencha na análise se fizerem parte)` : '';
  // pontos do desenho (CAD) que o engenheiro ainda não conferiu no mapa: ficaram fora do orçamento (services/mapaCad.js)
  const pontosCadSemConferir = (analise.dadosExtraidos || []).filter(d => d?.mapa_cad?.valeParaOrcamento).reduce((t, d) => t + mapaCad.resumoDoMapa(d.mapa_cad).pontosPendentes, 0);
  res.json({
    propostaId, numero, criada, semQuantidade, pontosCadSemConferir, aprendizado: aprendido,
    mensagem: (criada ? `Orçamento ${numero} criado a partir desta análise` : `Orçamento ${numero} atualizado com os itens desta análise`) + aviso
      + (textoAprendido ? ` ${textoAprendido}` : '') + (avisoPadroes ? ` ${avisoPadroes}` : ''),
  });
}

module.exports = { gerarOrcamento };
