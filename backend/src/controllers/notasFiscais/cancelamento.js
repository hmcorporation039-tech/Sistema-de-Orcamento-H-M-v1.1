// Notas fiscais de serviço — cancelamento: direto na SEFIN Nacional (certificado A1) ou só o registro de
// um cancelamento já feito no portal.
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const nfseNacional = require('../../services/nfseNacional');

// Estado do cancelamento direto, para a tela saber o que oferecer (sem segredos).
async function configCancelamento(req, res) {
  const ambiente = nfseNacional.ambienteConfigurado();
  const r = { direto: nfseNacional.cancelamentoDiretoLigado(), ambiente, certificado: { ok: false } };
  if (r.direto) {
    try {
      const c = nfseNacional.carregarCertificado();
      r.certificado = { ok: c.validoAte > new Date(), cnpj: c.cnpj, valido_ate: c.validoAte };
    } catch (err) { r.certificado = { ok: false, erro: err.message }; }
  }
  res.json(r);
}

// Cancela uma nota emitida. Dois caminhos:
//  - direto: true  → envia o evento 101101 à SEFIN Nacional (certificado A1) e só
//    marca "cancelada" se a Receita aceitar. Em homologação é só um teste: a
//    nota do banco nunca muda.
//  - direto: false → só registra um cancelamento já feito no portal (ISSnet/Emissor).
async function cancelar(req, res) {
  const motivo = String(req.body?.motivo ?? '').trim();
  if (motivo.length < 15) return res.status(400).json({ erro: 'Escreva o motivo do cancelamento (pelo menos 15 caracteres, como pede a NFS-e).' });
  if (motivo.length > 255) return res.status(400).json({ erro: 'O motivo passa de 255 caracteres.' });
  const codigo = Number(req.body?.codigo_motivo ?? 9);
  if (![1, 2, 9].includes(codigo)) return res.status(400).json({ erro: 'Código do motivo inválido (1 erro na emissão, 2 serviço não prestado, 9 outros).' });
  const direto = req.body?.direto === true;

  const { rows: [nota] } = await pool.query('SELECT id, numero, situacao, padrao, chave_acesso FROM notas_fiscais WHERE id = $1', [req.params.id]);
  if (!nota) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (nota.situacao !== 'emitida') return res.status(409).json({ erro: 'Só nota emitida pode ser cancelada (rascunho se apaga).' });

  let via = 'manual';
  let protocolo = null;
  let xmlEvento = null;
  if (direto) {
    if (!nfseNacional.cancelamentoDiretoLigado()) return res.status(409).json({ erro: 'O cancelamento direto está desligado neste sistema. Cancele no portal e registre aqui.' });
    if (nota.padrao !== 'nacional' || !/^\d{50}$/.test(String(nota.chave_acesso || ''))) {
      return res.status(409).json({ erro: 'Só nota do Emissor Nacional (com chave de acesso) cancela direto. Esta precisa ser cancelada no portal.' });
    }
    if (String(req.body?.confirmar_numero ?? '').trim() !== String(nota.numero)) {
      return res.status(400).json({ erro: `Para confirmar, digite o número da nota (${nota.numero}).` });
    }
    const ambiente = nfseNacional.ambienteConfigurado();
    let resp;
    try {
      resp = await nfseNacional.cancelarNfse({ chave: nota.chave_acesso, codigoMotivo: codigo, motivo, ambiente });
    } catch (err) {
      console.error('Cancelamento direto NFS-e:', err.message);
      return res.status(502).json({ erro: `Não consegui falar com a Receita: ${err.message}` });
    }
    await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: nota.id, acao: 'cancelar_receita', usuarioId: req.usuario.id,
      detalhes: { numero: nota.numero, ambiente, codigo, aceito: resp.ok, erro: resp.ok ? undefined : resp.erro } });
    if (!resp.ok) return res.status(422).json({ erro: `A Receita não aceitou o cancelamento: ${resp.erro}`, codigo: resp.codigo });
    if (ambiente !== 'producao') {
      return res.json({ teste: true, mensagem: 'TESTE em homologação: a Receita aceitou o pedido, mas a nota no sistema não foi alterada.', protocolo: resp.protocolo });
    }
    via = 'receita'; protocolo = resp.protocolo; xmlEvento = resp.xmlEvento;
  }

  const { rows: [n] } = await pool.query(
    `UPDATE notas_fiscais SET situacao = 'cancelada', cancelada_em = NOW(), motivo_cancelamento = $2, atualizado_em = NOW(),
            cancelamento_via = $3, cancelamento_codigo = $4, cancelamento_protocolo = $5, cancelamento_xml = $6
      WHERE id = $1 AND situacao = 'emitida' RETURNING id, numero`, [nota.id, motivo, via, codigo, protocolo, xmlEvento]);
  if (!n) return res.status(409).json({ erro: 'A nota já foi cancelada por outra ação.' });
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'cancelar', usuarioId: req.usuario.id, detalhes: { numero: n.numero, motivo, via, codigo, protocolo } });
  res.json({ mensagem: via === 'receita' ? `Nota ${n.numero} cancelada na Receita${protocolo ? ` (protocolo ${protocolo})` : ''}` : `Cancelamento da nota ${n.numero} registrado`, via, protocolo });
}

module.exports = { configCancelamento, cancelar };
