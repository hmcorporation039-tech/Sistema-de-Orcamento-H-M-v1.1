// Cronograma físico-financeiro e medições da obra (versão 2.0, Fase 3G).
// Regras puras em utils/cronograma.js; duração em utils/duracaoCronograma.js
// (a mesma da aba Cronograma da planilha do cliente); Excel em
// utils/planilhaCronograma.js; boletim em utils/boletimMedicaoTemplate.js.
//
// Permissões: ver = qualquer usuário logado; gerar/editar o cronograma e
// registrar medição = quem pode editar a obra (dono, obra sem dono ou admin —
// middleware de posse da obra nas rotas).
const pool = require('../config/database');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const C = require('../utils/cronograma');
const D = require('../utils/duracaoCronograma');
const { comTransacao } = require('../utils/transacao');
const { versaoDoPedido } = require('../utils/versao');
const { registrarAuditoria } = require('../utils/auditoria');
const { gerarPlanilhaCronograma } = require('../utils/planilhaCronograma');
const { gerarHtmlBoletim, gerarFooterTemplate } = require('../utils/boletimMedicaoTemplate');
const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');

// data de hoje no horário de Brasília (toISOString daria o dia seguinte depois das 21h)
const hojeLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const ehAdmin = (req) => req.usuario?.role === 'admin';
const podeEditar = (req, obra) => ehAdmin(req) || obra.usuario_id == null || obra.usuario_id === req.usuario.id;

class ErroPedido extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

// ── validação ───────────────────────────────────────────────────────────
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
function data(v, rotulo, obrigatoria = false) {
  if (v == null || v === '') {
    if (obrigatoria) throw new ErroPedido(`Informe ${rotulo}.`);
    return null;
  }
  const s = String(v).slice(0, 10);
  if (!DATA_RE.test(s) || Number.isNaN(new Date(`${s}T12:00:00Z`).getTime()) || new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) !== s) {
    throw new ErroPedido(`Data inválida em ${rotulo} (use AAAA-MM-DD).`);
  }
  return s;
}
function numero(v, rotulo, { min = 0, max = 1e12, nulo = true } = {}) {
  if (v == null || v === '') {
    if (nulo) return null;
    throw new ErroPedido(`Informe ${rotulo}.`);
  }
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ErroPedido(`Valor inválido em ${rotulo}.`);
  return n;
}
const texto = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);
const idPositivo = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null; };

// ── carga ───────────────────────────────────────────────────────────────
async function carregarObra(id, executor = pool) {
  const { rows } = await executor.query(
    `SELECT id, codigo, nome, cliente_nome, local, status, usuario_id, to_char(inicio_previsto, 'YYYY-MM-DD') AS inicio_previsto
       FROM obras WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function carregarDados(obraId, executor = pool) {
  const [cfg, etapas, dist, medicoes] = await Promise.all([
    executor.query(
      `SELECT c.id, c.obra_id, c.proposta_id, c.periodicidade, to_char(c.data_inicio, 'YYYY-MM-DD') AS data_inicio, c.criterio_peso,
              c.custo_hh, c.equipe, c.observacoes, c.gerado_em, c.criado_em, c.atualizado_em, c.versao, p.numero AS proposta_numero, p.status AS proposta_status
         FROM obra_cronogramas c LEFT JOIN propostas p ON p.id = c.proposta_id WHERE c.obra_id = $1`, [obraId]),
    executor.query(
      `SELECT id, obra_id, proposta_id, ordem, nome, origem, valor, peso, mao_obra, dias_uteis,
              to_char(inicio, 'YYYY-MM-DD') AS inicio, to_char(fim, 'YYYY-MM-DD') AS fim
         FROM obra_etapas WHERE obra_id = $1 ORDER BY ordem, id`, [obraId]),
    executor.query(
      `SELECT d.etapa_id, to_char(d.periodo, 'YYYY-MM-DD') AS periodo, d.percentual
         FROM obra_etapa_periodos d JOIN obra_etapas e ON e.id = d.etapa_id
        WHERE e.obra_id = $1 ORDER BY d.periodo`, [obraId]),
    executor.query(
      `SELECT m.id, m.etapa_id, m.etapa_nome, e.nome AS etapa_nome_atual, to_char(m.data_medicao, 'YYYY-MM-DD') AS data_medicao,
              to_char(m.periodo, 'YYYY-MM-DD') AS periodo, m.percentual_acumulado, m.valor_medido, m.observacao, m.substitui_id,
              m.usuario_id, u.nome AS usuario_nome, m.criado_em
         FROM obra_medicoes m LEFT JOIN obra_etapas e ON e.id = m.etapa_id LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.obra_id = $1 ORDER BY m.periodo, m.id`, [obraId]),
  ]);
  const config = cfg.rows[0] || null;
  const porEtapa = new Map();
  for (const d of dist.rows) {
    if (!porEtapa.has(d.etapa_id)) porEtapa.set(d.etapa_id, []);
    porEtapa.get(d.etapa_id).push({ periodo: d.periodo, percentual: Number(d.percentual) });
  }
  const lista = etapas.rows.map(e => ({
    ...e,
    valor: e.valor == null ? null : Number(e.valor),
    peso: e.peso == null ? null : Number(e.peso),
    mao_obra: e.mao_obra == null ? null : Number(e.mao_obra),
    distribuicao: porEtapa.get(e.id) || [],
  }));
  const meds = medicoes.rows.map(m => ({
    ...m,
    percentual_acumulado: m.percentual_acumulado == null ? null : Number(m.percentual_acumulado),
    valor_medido: m.valor_medido == null ? null : Number(m.valor_medido),
  }));
  return { config, etapas: lista, medicoes: meds };
}

function calcular(dados, dataReferencia) {
  const per = dados.config?.periodicidade || 'mensal';
  const calc = C.calcularCronograma({
    etapas: dados.etapas, medicoes: dados.medicoes, periodicidade: per,
    criterioPeso: dados.config?.criterio_peso || 'valor', dataReferencia: dataReferencia || hojeLocal(),
  });
  const historico = C.marcarHistorico(dados.medicoes, per).map(m => ({
    ...m,
    periodo_rotulo: C.rotuloPeriodo(C.inicioPeriodo(m.periodo, per), per, calc.periodos.indexOf(C.inicioPeriodo(m.periodo, per))),
  }));
  return { calc, historico };
}

async function propostasDaObra(obraId) {
  const { rows } = await pool.query(
    `SELECT id, numero, status, total, to_char(data, 'YYYY-MM-DD') AS data FROM propostas WHERE obra_id = $1 ORDER BY sequencial DESC, id DESC`, [obraId]);
  return rows.map(p => ({ ...p, total: Number(p.total) || 0 }));
}

// ── GET /obras/:id/cronograma ───────────────────────────────────────────
async function obter(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const ref = req.query.referencia ? data(req.query.referencia, 'a data de referência') : null;
    const dados = await carregarDados(obra.id);
    const { calc, historico } = calcular(dados, ref);
    const propostas = await propostasDaObra(obra.id);
    res.json({
      obra: { id: obra.id, codigo: obra.codigo, nome: obra.nome, inicio_previsto: obra.inicio_previsto },
      cronograma: dados.config,
      etapas: dados.etapas,
      calculo: calc,
      medicoes: historico,
      propostas,
      proposta_sugerida: propostas.find(p => p.status === 'Aprovada')?.id || null,
      padroes: { custo_hh: D.CUSTO_HH_PADRAO, equipe: D.EQUIPE_PADRAO, periodicidade: 'mensal' },
      pode_editar: podeEditar(req, obra),
    });
  } catch (err) {
    if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

// grava a distribuição de uma etapa (substitui a anterior)
async function gravarDistribuicao(client, etapaId, distribuicao) {
  await client.query('DELETE FROM obra_etapa_periodos WHERE etapa_id = $1', [etapaId]);
  for (const d of distribuicao) {
    if (!(Number(d.percentual) > 0)) continue;
    await client.query(
      `INSERT INTO obra_etapa_periodos (etapa_id, periodo, percentual) VALUES ($1, $2, $3)
       ON CONFLICT (etapa_id, periodo) DO UPDATE SET percentual = obra_etapa_periodos.percentual + EXCLUDED.percentual`,
      [etapaId, d.periodo, d.percentual]);
  }
}

async function gravarConfig(client, obraId, cfg, usuarioId, { gerado = false } = {}) {
  const { rows } = await client.query(
    `INSERT INTO obra_cronogramas (obra_id, proposta_id, periodicidade, data_inicio, criterio_peso, custo_hh, equipe, observacoes, usuario_id, gerado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $10 THEN NOW() ELSE NULL END)
     ON CONFLICT (obra_id) DO UPDATE SET proposta_id = EXCLUDED.proposta_id, periodicidade = EXCLUDED.periodicidade,
       data_inicio = EXCLUDED.data_inicio, criterio_peso = EXCLUDED.criterio_peso, custo_hh = EXCLUDED.custo_hh,
       equipe = EXCLUDED.equipe, observacoes = EXCLUDED.observacoes,
       gerado_em = CASE WHEN $10 THEN NOW() ELSE obra_cronogramas.gerado_em END,
       atualizado_em = NOW(), versao = obra_cronogramas.versao + 1
     RETURNING *`,
    [obraId, cfg.proposta_id, cfg.periodicidade, cfg.data_inicio, cfg.criterio_peso, cfg.custo_hh, cfg.equipe, cfg.observacoes, usuarioId, gerado]);
  return rows[0];
}

// ── POST /obras/:id/cronograma/gerar ────────────────────────────────────
// Gera (ou regera) as etapas a partir da proposta aprovada da obra (ou da
// escolhida). Etapas já existentes com a mesma origem/nome são ATUALIZADAS no
// lugar (as medições delas continuam valendo); as que sumiram são apagadas,
// menos as que têm medição (ficam, com aviso).
async function gerar(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const b = req.body || {};
    const propostas = await propostasDaObra(obra.id);
    let propostaId = b.proposta_id != null && b.proposta_id !== '' ? idPositivo(b.proposta_id) : null;
    if (b.proposta_id != null && b.proposta_id !== '' && !propostaId) return res.status(400).json({ erro: 'Proposta inválida.' });
    if (propostaId && !propostas.some(p => p.id === propostaId)) return res.status(400).json({ erro: 'A proposta escolhida não está ligada a esta obra.' });
    if (!propostaId) propostaId = propostas.find(p => p.status === 'Aprovada')?.id || null;
    if (!propostaId) return res.status(400).json({ erro: 'A obra não tem proposta aprovada. Escolha a proposta de base do cronograma.' });

    const atual = await carregarDados(obra.id);
    const periodicidade = b.periodicidade || atual.config?.periodicidade || 'mensal';
    if (!C.PERIODICIDADES.includes(periodicidade)) return res.status(400).json({ erro: 'Periodicidade inválida (mensal ou semanal).' });
    const dataInicio = data(b.data_inicio, 'a data de início') || atual.config?.data_inicio || obra.inicio_previsto || hojeLocal();
    const custoHH = numero(b.custo_hh, 'o custo do homem-hora', { min: 0.01, max: 100000 }) ?? D.CUSTO_HH_PADRAO;
    const equipe = numero(b.equipe, 'a equipe', { min: 1, max: 1000 }) ?? D.EQUIPE_PADRAO;
    if (!Number.isInteger(equipe)) return res.status(400).json({ erro: 'A equipe é um número inteiro de pessoas.' });
    const incluirFixas = b.incluir_etapas_fixas !== false;

    const { rows: [proposta] } = await pool.query('SELECT * FROM propostas WHERE id = $1', [propostaId]);
    const secoes = (await pool.query('SELECT id, nome, ordem FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem, id', [propostaId])).rows;
    const itens = (await pool.query('SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY secao_id, id', [propostaId])).rows;
    if (!itens.length) return res.status(400).json({ erro: 'A proposta escolhida não tem itens.' });
    const g = C.gerarCronograma({ proposta, secoes, itens, dataInicio, periodicidade, custoHH, equipe, incluirEtapasFixas: incluirFixas });

    const avisos = [];
    await comTransacao(async (client) => {
      await client.query('SELECT id FROM obras WHERE id = $1 FOR UPDATE', [obra.id]);
      const comMedicao = new Set((await client.query('SELECT DISTINCT etapa_id FROM obra_medicoes WHERE obra_id = $1 AND etapa_id IS NOT NULL', [obra.id])).rows.map(r => r.etapa_id));
      // casa pela origem exata (sistema da proposta; a planilha diferencia
      // maiúsculas) ou, nas etapas fixas/manuais, pelo nome
      const chave = (e) => (e.origem ? `o:${e.origem}` : `n:${e.nome}`);
      const existentes = new Map();
      for (const e of atual.etapas) {
        if (!existentes.has(chave(e))) existentes.set(chave(e), []);
        existentes.get(chave(e)).push(e);
      }
      const usados = new Set();
      for (const e of g.etapas) {
        const ex = (existentes.get(chave(e)) || []).find(x => !usados.has(x.id));
        let id;
        if (ex) {
          usados.add(ex.id);
          id = ex.id;
          await client.query(
            `UPDATE obra_etapas SET proposta_id=$1, ordem=$2, nome=$3, origem=$4, valor=$5, peso=NULL, mao_obra=$6, dias_uteis=$7,
                    inicio=$8, fim=$9, atualizado_em=NOW() WHERE id=$10`,
            [propostaId, e.ordem, e.nome, e.origem, e.valor, e.mao_obra, e.dias_uteis, e.inicio, e.fim, id]);
        } else {
          const { rows } = await client.query(
            `INSERT INTO obra_etapas (obra_id, proposta_id, ordem, nome, origem, valor, mao_obra, dias_uteis, inicio, fim)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [obra.id, propostaId, e.ordem, e.nome, e.origem, e.valor, e.mao_obra, e.dias_uteis, e.inicio, e.fim]);
          id = rows[0].id;
        }
        await gravarDistribuicao(client, id, e.distribuicao);
      }
      let ordemExtra = g.etapas.length;
      for (const e of atual.etapas) {
        if (usados.has(e.id)) continue;
        if (comMedicao.has(e.id)) {
          await client.query('UPDATE obra_etapas SET ordem = $1, atualizado_em = NOW() WHERE id = $2', [++ordemExtra, e.id]);
          avisos.push(`A etapa "${e.nome}" não existe na proposta, mas foi mantida porque tem medição registrada.`);
        } else {
          await client.query('DELETE FROM obra_etapas WHERE id = $1', [e.id]);
        }
      }
      await gravarConfig(client, obra.id, {
        proposta_id: propostaId, periodicidade, data_inicio: dataInicio, criterio_peso: atual.config?.criterio_peso || 'valor',
        custo_hh: custoHH, equipe, observacoes: atual.config?.observacoes || null,
      }, req.usuario.id, { gerado: true });
      await registrarAuditoria(client, {
        entidade: 'obra_cronograma', entidadeId: obra.id, acao: atual.etapas.length ? 'regerar' : 'gerar', usuarioId: req.usuario.id,
        detalhes: { proposta_id: propostaId, etapas: g.etapas.length, total: g.totais.total, periodicidade, data_inicio: dataInicio, custo_hh: custoHH, equipe },
      });
    });
    const dados = await carregarDados(obra.id);
    const { calc, historico } = calcular(dados);
    res.json({ cronograma: dados.config, etapas: dados.etapas, calculo: calc, medicoes: historico, avisos, total_proposta: g.totais.total });
  } catch (err) {
    if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

// ── PUT /obras/:id/cronograma ───────────────────────────────────────────
// Corpo: { versao?, periodicidade, data_inicio, criterio_peso, observacoes,
//          etapas: [{ id?, nome, origem?, valor?, peso?, inicio?, fim?,
//                     distribuicao?: [{ periodo, percentual } | { periodo, valor }],
//                     redistribuir?: true }] }
// A lista de etapas substitui a atual (etapa ausente = apagada; não pode ter medição).
// Sem distribuição enviada: mantém a gravada, ou redistribui linear se as
// datas/periodicidade mudaram ou se pediu `redistribuir`.
async function salvar(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const b = req.body || {};
    const atual = await carregarDados(obra.id);
    const versao = versaoDoPedido(b);
    if (versao != null && atual.config && atual.config.versao !== versao) {
      return res.status(409).json({ codigo: 'CONFLITO_VERSAO', versaoAtual: atual.config.versao,
        erro: 'O cronograma foi alterado por outra pessoa (ou em outra aba) depois que você o abriu. Recarregue a página — suas alterações não foram gravadas.' });
    }
    const tem = (k) => Object.prototype.hasOwnProperty.call(b, k);
    const periodicidade = tem('periodicidade') ? b.periodicidade : (atual.config?.periodicidade || 'mensal');
    if (!C.PERIODICIDADES.includes(periodicidade)) return res.status(400).json({ erro: 'Periodicidade inválida (mensal ou semanal).' });
    const criterio = tem('criterio_peso') ? b.criterio_peso : (atual.config?.criterio_peso || 'valor');
    if (!C.CRITERIOS_PESO.includes(criterio)) return res.status(400).json({ erro: 'Critério de peso inválido (valor ou manual).' });
    const dataInicio = tem('data_inicio') ? data(b.data_inicio, 'a data de início') : (atual.config?.data_inicio || null);
    const observacoes = tem('observacoes') ? texto(b.observacoes, 5000) : (atual.config?.observacoes || null);
    const mudouPeriodicidade = (atual.config?.periodicidade || 'mensal') !== periodicidade;
    if (!Array.isArray(b.etapas)) return res.status(400).json({ erro: 'Envie a lista de etapas.' });
    if (b.etapas.length > 300) return res.status(400).json({ erro: 'Etapas demais (máximo 300).' });

    const porId = new Map(atual.etapas.map(e => [e.id, e]));
    const vistos = new Set();
    const etapas = b.etapas.map((e, i) => {
      const rot = `a etapa ${i + 1}`;
      const id = e.id != null && e.id !== '' ? idPositivo(e.id) : null;
      if (e.id != null && e.id !== '' && (!id || !porId.has(id))) throw new ErroPedido(`A etapa ${i + 1} não pertence a esta obra.`);
      if (id && vistos.has(id)) throw new ErroPedido(`A etapa ${i + 1} está repetida.`);
      if (id) vistos.add(id);
      const nome = texto(e.nome, 200);
      if (!nome) throw new ErroPedido(`Informe o nome da etapa ${i + 1}.`);
      const inicio = data(e.inicio, `o início de ${rot}`);
      const fim = data(e.fim, `o término de ${rot}`);
      if (inicio && fim && fim < inicio) throw new ErroPedido(`O término de "${nome}" é anterior ao início.`);
      const valor = numero(e.valor, `o valor de "${nome}"`, { min: 0, max: 1e11 });
      const peso = numero(e.peso, `o peso de "${nome}"`, { min: 0, max: 100 });
      const anterior = id ? porId.get(id) : null;
      let distribuicao;
      if (Array.isArray(e.distribuicao)) {
        if (e.distribuicao.length > 600) throw new ErroPedido(`Períodos demais em "${nome}".`);
        distribuicao = e.distribuicao.map((d) => {
          const p = C.inicioPeriodo(data(d.periodo, `um período de "${nome}"`, true), periodicidade);
          let pc = numero(d.percentual, `o % de "${nome}"`, { min: 0, max: 100 });
          if (pc == null && d.valor != null && d.valor !== '') {
            const v = numero(d.valor, `o valor previsto de "${nome}"`, { min: 0, max: 1e11 });
            if (!(valor > 0)) throw new ErroPedido(`"${nome}" não tem valor: informe a distribuição em %.`);
            pc = (v / valor) * 100;
            if (pc > 100.0001) throw new ErroPedido(`O valor previsto num período de "${nome}" passa o valor da etapa.`);
          }
          return { periodo: p, percentual: Math.round((pc || 0) * 10000) / 10000 };
        });
      } else {
        const mudouDatas = !anterior || anterior.inicio !== inicio || anterior.fim !== fim;
        distribuicao = (e.redistribuir || mudouDatas || mudouPeriodicidade || !anterior?.distribuicao.length)
          ? C.distribuirLinear(inicio, fim, periodicidade)
          : null; // mantém a gravada
      }
      return { id, ordem: i + 1, nome, origem: texto(e.origem, 200), valor, peso, inicio, fim, distribuicao,
        dias_uteis: inicio && fim ? C.diasUteisEntre(inicio, fim) : null };
    });
    const removidas = atual.etapas.filter(e => !vistos.has(e.id));
    if (removidas.length) {
      const { rows } = await pool.query('SELECT DISTINCT etapa_id FROM obra_medicoes WHERE etapa_id = ANY($1)', [removidas.map(e => e.id)]);
      if (rows.length) {
        const nomes = removidas.filter(e => rows.some(r => r.etapa_id === e.id)).map(e => `"${e.nome}"`).join(', ');
        return res.status(409).json({ erro: `Não é possível remover ${nomes}: há medição registrada. Zere o valor/peso da etapa em vez de removê-la.` });
      }
    }

    await comTransacao(async (client) => {
      await client.query('SELECT id FROM obras WHERE id = $1 FOR UPDATE', [obra.id]);
      for (const e of removidas) await client.query('DELETE FROM obra_etapas WHERE id = $1', [e.id]);
      for (const e of etapas) {
        let id = e.id;
        if (id) {
          await client.query(
            `UPDATE obra_etapas SET ordem=$1, nome=$2, origem=$3, valor=$4, peso=$5, inicio=$6, fim=$7, dias_uteis=$8, atualizado_em=NOW() WHERE id=$9 AND obra_id=$10`,
            [e.ordem, e.nome, e.origem, e.valor, e.peso, e.inicio, e.fim, e.dias_uteis, id, obra.id]);
        } else {
          const { rows } = await client.query(
            `INSERT INTO obra_etapas (obra_id, ordem, nome, origem, valor, peso, inicio, fim, dias_uteis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [obra.id, e.ordem, e.nome, e.origem, e.valor, e.peso, e.inicio, e.fim, e.dias_uteis]);
          id = rows[0].id;
        }
        if (e.distribuicao) await gravarDistribuicao(client, id, e.distribuicao);
      }
      await gravarConfig(client, obra.id, {
        proposta_id: atual.config?.proposta_id || null, periodicidade, data_inicio: dataInicio, criterio_peso: criterio,
        custo_hh: atual.config?.custo_hh ?? null, equipe: atual.config?.equipe ?? null, observacoes,
      }, atual.config?.usuario_id || req.usuario.id);
    });
    const dados = await carregarDados(obra.id);
    const { calc, historico } = calcular(dados);
    res.json({ cronograma: dados.config, etapas: dados.etapas, calculo: calc, medicoes: historico });
  } catch (err) {
    if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

// ── POST /obras/:id/medicoes ────────────────────────────────────────────
// Corpo: { data_medicao?, periodo?, observacao?, itens: [{ etapa_id,
//          percentual_acumulado?, valor_medido?, observacao? }] }
// Cada item vira uma linha nova; se já havia medição da etapa no período, a
// nova a corrige (substitui_id) e a anterior fica no histórico.
async function registrarMedicao(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const b = req.body || {};
    const atual = await carregarDados(obra.id);
    if (!atual.config || !atual.etapas.length) return res.status(400).json({ erro: 'Monte o cronograma da obra antes de registrar medições.' });
    const per = atual.config.periodicidade;
    const dataMed = data(b.data_medicao, 'a data da medição') || hojeLocal();
    const periodo = C.inicioPeriodo(data(b.periodo, 'o período') || dataMed, per);
    const obsGeral = texto(b.observacao, 2000);
    if (!Array.isArray(b.itens) || !b.itens.length) return res.status(400).json({ erro: 'Informe ao menos uma etapa medida.' });
    if (b.itens.length > 300) return res.status(400).json({ erro: 'Itens demais.' });
    const etapaPorId = new Map(atual.etapas.map(e => [e.id, e]));
    const vigentes = C.medicoesVigentes(atual.medicoes, per);
    const linhas = [];
    const vistos = new Set();
    for (const it of b.itens) {
      const etapaId = idPositivo(it.etapa_id);
      const etapa = etapaId && etapaPorId.get(etapaId);
      if (!etapa) return res.status(400).json({ erro: 'Etapa da medição não pertence a esta obra.' });
      if (vistos.has(etapaId)) return res.status(400).json({ erro: `A etapa "${etapa.nome}" aparece duas vezes na medição.` });
      vistos.add(etapaId);
      const pctAc = numero(it.percentual_acumulado, `o % acumulado de "${etapa.nome}"`, { min: 0, max: 100 });
      const valor = numero(it.valor_medido, `o valor medido de "${etapa.nome}"`, { min: 0, max: 1e11 });
      if (pctAc == null && valor == null) continue;
      const anterior = vigentes.get(`${etapaId}|${periodo}`);
      linhas.push({ etapa, pctAc, valor, obs: texto(it.observacao, 2000) || obsGeral, substitui: anterior ? anterior.id : null });
    }
    if (!linhas.length) return res.status(400).json({ erro: 'Informe o % físico acumulado ou o valor medido de ao menos uma etapa.' });
    // simula a medição: o medido acumulado não pode passar o valor da etapa (isso pede aditivo)
    const maiorId = atual.medicoes.reduce((m, x) => Math.max(m, x.id), 0);
    const simulado = C.calcularCronograma({
      etapas: atual.etapas, periodicidade: per, criterioPeso: atual.config.criterio_peso,
      medicoes: [...atual.medicoes, ...linhas.map((l, i) => ({ id: maiorId + 1 + i, etapa_id: l.etapa.id, periodo, percentual_acumulado: l.pctAc, valor_medido: l.valor }))],
    });
    for (const l of linhas) {
      const e = simulado.etapas.find(x => x.id === l.etapa.id);
      const acum = e?.serie.length ? Math.max(...e.serie.map(x => x.realizado_valor_acum)) : 0;
      if (l.valor != null && acum > (Number(l.etapa.valor) || 0) + 0.01) {
        return res.status(400).json({ erro: `O valor medido acumulado de "${l.etapa.nome}" (${acum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) passaria o valor da etapa (${(Number(l.etapa.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Ajuste o valor da etapa no cronograma (aditivo) antes de medir.` });
      }
    }
    const ids = await comTransacao(async (client) => {
      const criados = [];
      for (const l of linhas) {
        const { rows } = await client.query(
          `INSERT INTO obra_medicoes (obra_id, etapa_id, etapa_nome, data_medicao, periodo, percentual_acumulado, valor_medido, observacao, substitui_id, usuario_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [obra.id, l.etapa.id, l.etapa.nome, dataMed, periodo, l.pctAc, l.valor, l.obs, l.substitui, req.usuario.id]);
        criados.push(rows[0].id);
      }
      await registrarAuditoria(client, {
        entidade: 'obra_medicao', entidadeId: obra.id, acao: 'registrar', usuarioId: req.usuario.id,
        detalhes: { periodo, medicoes: criados, corrigidas: linhas.filter(l => l.substitui).map(l => l.substitui) },
      });
      return criados;
    });
    const dados = await carregarDados(obra.id);
    const { calc, historico } = calcular(dados);
    res.status(201).json({ criadas: ids, periodo, calculo: calc, medicoes: historico });
  } catch (err) {
    if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

// ── GET /obras/:id/medicoes ─────────────────────────────────────────────
async function listarMedicoes(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const dados = await carregarDados(obra.id);
    const { calc, historico } = calcular(dados);
    const boletins = calc.curva.filter(c => c.tem_medicao).map((c, i) => ({ periodo: c.periodo, rotulo: c.rotulo, numero: i + 1, valor: c.realizado_valor }));
    res.json({ medicoes: [...historico].reverse(), boletins, periodicidade: calc.periodicidade });
  } catch (err) {
    next(err);
  }
}

const nomeArquivo = (obra, sufixo, ext) =>
  `${String(obra.codigo || `obra-${obra.id}`)}_${String(obra.nome || '').replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 60)}_${sufixo}.${ext}`.replace(/_+/g, '_');

// ── GET /obras/:id/cronograma/planilha ──────────────────────────────────
async function planilha(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const dados = await carregarDados(obra.id);
    if (!dados.etapas.length) return res.status(400).json({ erro: 'A obra ainda não tem cronograma.' });
    const { calc, historico } = calcular(dados);
    const proposta = dados.config?.proposta_id ? { id: dados.config.proposta_id, numero: dados.config.proposta_numero } : null;
    const buffer = await gerarPlanilhaCronograma({ obra, config: dados.config, proposta, etapas: dados.etapas, historico, calc });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': contentDisposition(nomeArquivo(obra, 'cronograma', 'xlsx')),
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// ── GET /obras/:id/medicoes/boletim?periodo=AAAA-MM-DD ──────────────────
async function boletim(req, res, next) {
  try {
    const obra = await carregarObra(req.params.id);
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada.' });
    const dados = await carregarDados(obra.id);
    if (!dados.etapas.length) return res.status(400).json({ erro: 'A obra ainda não tem cronograma.' });
    const { calc } = calcular(dados);
    const pedido = data(req.query.periodo, 'o período');
    const periodo = pedido || calc.resumo.ultimo_periodo_medido;
    if (!periodo) return res.status(400).json({ erro: 'Nenhuma medição registrada para gerar o boletim.' });
    const b = C.boletimMedicao(calc, periodo);
    if (!b || !b.tem_medicao) return res.status(404).json({ erro: 'Não há medição registrada nesse período.' });
    const vig = C.medicoesVigentes(dados.medicoes, calc.periodicidade);
    const medicoes = [...vig.values()].filter(m => C.inicioPeriodo(m.periodo, calc.periodicidade) === b.periodo)
      .map(m => ({ ...m, etapa_nome: m.etapa_nome_atual || m.etapa_nome }));
    const proposta = dados.config?.proposta_id ? { numero: dados.config.proposta_numero } : null;
    const html = gerarHtmlBoletim({ obra, proposta, boletim: b, medicoes, periodicidade: calc.periodicidade, emitidoPor: req.usuario?.nome });
    const pdf = await gerarPdfDeHtml(html, {
      landscape: true,
      margin: { top: '10mm', bottom: '22mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplate(),
    });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(nomeArquivo(obra, `boletim_${String(b.numero).padStart(2, '0')}_${b.periodo}`, 'pdf')) });
    res.send(Buffer.from(pdf));
  } catch (err) {
    if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message });
    next(err);
  }
}

module.exports = { obter, gerar, salvar, registrarMedicao, listarMedicoes, planilha, boletim };
