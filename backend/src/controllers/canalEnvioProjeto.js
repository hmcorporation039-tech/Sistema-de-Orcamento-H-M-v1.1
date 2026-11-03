// POST /laudos/:id/enviar-email — envia o pacote de entrega do PROJETO (ZIP com as entregas
// escolhidas: definições técnicas, as-built, DXF, QElectroTech, PDF) por e-mail, da caixa da empresa.
// Fase 6: é a rota que a ação pendente "enviar_email_projeto" executa (pelo canal, depois do "SIM
// 4821", ou pelo cartão do assistente). Posse do projeto, limite de envio e auditoria ficam aqui,
// como no envio da proposta (propostaDocumentos.enviarEmail).
const pool = require('../config/database');
const { carregarLaudo, nomeSeguroArquivo } = require('./laudos/comum');
const { montarEntrega } = require('./laudos/entregas');
const { cad, entrega } = require('../utils/disciplinasLaudo');
const { lerPedidoEntrega } = require('../utils/projetoLaudo');
const { criarTransportador } = require('../services/email/smtp');
const { registrarAuditoria } = require('../services/auditoria');
const { ASSINATURA_EMPRESA } = require('./propostaDocumentos');
const { EMPRESA } = require('../utils/pdfTemplate');
const { textoPadraoProjeto } = require('../services/assistente/acoes');

const MAX_ANEXO = 20 * 1024 * 1024; // o Gmail recusa acima de 25 MB (o anexo cresce ~33 % no e-mail)
const emailValido = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function enviarEmailProjeto(req, res) {
  const { destinatario, mensagem, itens } = req.body || {};
  if (!emailValido(destinatario)) return res.status(400).json({ erro: 'Informe um e-mail de destino válido.' });
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) return res.status(400).json({ erro: 'A mensagem deve ser um texto de até 10.000 caracteres.' });
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Projeto não encontrado.' });
  if (laudo.tipo !== 'projeto') return res.status(400).json({ erro: 'Só o projeto tem pacote de entrega. O laudo sai pela tela.' });
  const C = cad();
  const pedidos = Array.isArray(itens) && itens.length ? itens : (laudo.entregas?.itens?.length ? laudo.entregas.itens : ['definicoes', 'pdf']);
  const pedido = lerPedidoEntrega({ itens: pedidos, as_built: laudo.entregas?.as_built || undefined }, { temPlanta: !!C.PLANTAS[laudo.disciplina], temUnifilar: !!C.UNIFILARES[laudo.disciplina] });
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const arquivos = await montarEntrega(laudo, pedido, req.usuario.nome);
  if (!arquivos.length) return res.status(400).json({ erro: 'Nenhum arquivo foi gerado para este pacote.' });
  const zip = await entrega().zipar(arquivos);
  if (zip.length > MAX_ANEXO) return res.status(413).json({ erro: 'O pacote passou de 20 MB, o limite do e-mail. Mande pela pasta do projeto.' });
  const nomeZip = `${pedido.asBuilt ? 'AS BUILT - ' : ''}Projeto - ${nomeSeguroArquivo(laudo.titulo || `projeto ${laudo.id}`)} - ${laudo.disciplina}.zip`;
  const corpo = (mensagem && mensagem.trim()) || textoPadraoProjeto(laudo);
  await criarTransportador().sendMail({
    from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
    to: destinatario,
    subject: `Projeto ${laudo.titulo || `#${laudo.id}`} — ${EMPRESA.nomeFantasia}`,
    text: `${corpo}\n\n${ASSINATURA_EMPRESA}`,
    attachments: [{ filename: nomeZip, content: zip, contentType: 'application/zip' }],
  });
  await registrarAuditoria(pool, {
    entidade: 'laudo', entidadeId: laudo.id, acao: 'email', usuarioId: req.usuario.id,
    detalhes: { destinatario, itens: pedido.escolhidos, arquivos: arquivos.map(a => a.nome) },
  });
  res.json({ mensagem: `Projeto ${laudo.titulo || `#${laudo.id}`} enviado para ${destinatario} (${arquivos.length} arquivo${arquivos.length === 1 ? '' : 's'} no ZIP).` });
}

module.exports = { enviarEmailProjeto };
