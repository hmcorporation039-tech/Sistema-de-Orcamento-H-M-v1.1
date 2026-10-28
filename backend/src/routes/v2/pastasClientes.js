// Pasta por cliente e novidades das pastas (versão 2.3) — services/monitorPastas.js
// e services/pastasRegistros.js. Ver/varrer/marcar como visto: qualquer usuário
// logado (como ver o cliente e a obra). O pacote de análise dos arquivos novos
// usa o mesmo serviço da tela de análise (services/pacotesProjeto.js).
const path = require('path');
const pool = require('../../config/database');
const M = require('../../services/monitorPastas');
const P = require('../../utils/pastasSistema');
const { pastaDoCliente, resumoPasta, pedidoLocal } = require('../../services/pastasRegistros');

module.exports = (router, { autenticar, validarId, limiteAnaliseProjeto }) => {
  // pasta do cliente: caminho, arquivos e se o servidor está no ar (cria se faltar)
  router.get('/clientes/:id/pasta', autenticar, validarId, async (req, res) => {
    const { rows: [c] } = await pool.query('SELECT id FROM clientes WHERE id = $1', [req.params.id]);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    const disponivel = await P.servidorDisponivel();
    const dir = await pastaDoCliente(c.id);
    res.json({ ...(await resumoPasta(dir)), disponivel, noServidor: dir.startsWith(P.RAIZ_CLIENTES_SERVIDOR), podeAbrir: pedidoLocal(req) });
  });
  router.post('/clientes/:id/pasta/abrir', autenticar, validarId, async (req, res) => {
    if (!pedidoLocal(req)) return res.status(400).json({ erro: 'A pasta só pode ser aberta no PC onde o sistema roda.' });
    P.abrirNoExplorer(await pastaDoCliente(Number(req.params.id)));
    res.json({ ok: true });
  });

  // contagem para o aviso do cabeçalho (sem varrer — barato)
  router.get('/novidades-pastas/resumo', autenticar, async (req, res) => res.json(await M.resumo()));

  // novidades de um cliente/obra (atualizar=1: varre a pasta agora)
  router.get('/novidades-pastas', autenticar, async (req, res) => {
    const clienteId = Number(req.query.cliente_id) || null;
    const obraId = Number(req.query.obra_id) || null;
    let varredura = null;
    if (req.query.atualizar === '1') {
      const alvo = clienteId || (obraId ? (await pool.query('SELECT cliente_id FROM obras WHERE id = $1', [obraId])).rows[0]?.cliente_id : null);
      varredura = alvo ? await M.escanearCliente(alvo) : await M.escanearTodos();
    }
    res.json({ disponivel: await P.servidorDisponivel(), varredura, itens: await M.novidades({ clienteId, obraId }) });
  });

  router.post('/novidades-pastas/visto', autenticar, async (req, res) => {
    res.json({ marcados: await M.marcarVisto(req.body?.ids, req.usuario) });
  });

  // pacote de análise com arquivos novos/alterados de projeto (PDF/DWG/DXF/ZIP)
  router.post('/novidades-pastas/pacote', autenticar, limiteAnaliseProjeto, async (req, res) => {
    const ids = [...new Set((req.body?.ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 60);
    if (!ids.length) return res.status(400).json({ erro: 'Escolha os arquivos novos a analisar.' });
    const { rows } = await pool.query("SELECT id, caminho, obra_id, cliente_id FROM pasta_arquivos WHERE id = ANY($1) AND situacao <> 'removido'", [ids]);
    const recebidos = [];
    for (const r of rows.filter(x => M.ANALISAVEL.test(x.caminho))) {
      const abs = await M.caminhoAbsoluto(r.caminho);
      if (abs) recebidos.push({ originalname: path.basename(abs), path: abs, caminho: r.caminho.split('/').slice(1).join('/') });
    }
    if (!recebidos.length) return res.status(400).json({ erro: 'Nenhum PDF, DWG, DXF ou ZIP entre os arquivos escolhidos (ou o servidor está fora do ar).' });
    try {
      const obras = [...new Set(rows.map(r => r.obra_id).filter(Boolean))];
      // nome sugerido: a obra (um só), senão o cliente
      const nomeSugerido = obras.length === 1
        ? (await pool.query('SELECT nome FROM obras WHERE id = $1', [obras[0]])).rows[0]?.nome
        : (await pool.query('SELECT nome FROM clientes WHERE id = $1', [rows[0].cliente_id])).rows[0]?.nome;
      const pacote = await require('../../services/pacotesProjeto').receberPacote(recebidos, req.usuario, { nomeSugerido: nomeSugerido || null });
      res.status(201).json({ ...pacote, obra_id: obras.length === 1 ? obras[0] : null });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ erro: err.message });
      throw err;
    }
  });
};
