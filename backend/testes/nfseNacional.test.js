// Cancelamento direto na NFS-e Nacional: monta o pedido (evento 101101), assina
// (XMLDSig) e trata a resposta da SEFIN. Certificado de teste gerado na hora e
// "Receita" simulada: sem rede, sem banco. Rodar: node testes/nfseNacional.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const { DOMParser } = require('@xmldom/xmldom');
const n = require('../src/services/nfseNacional');

const CHAVE = '53001082204003376000100000000000000099260800000001';
const CNPJ = '04003376000100';
const SENHA = 'senha-de-teste';

function certificadoDeTeste(dir) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 30);
  const attrs = [{ shortName: 'CN', value: `EMPRESA TESTE LTDA:${CNPJ}` }];
  cert.setSubject(attrs); cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], SENHA, { algorithm: '3des' });
  const arquivo = path.join(dir, 'teste.pfx');
  fs.writeFileSync(arquivo, Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary'));
  return arquivo;
}

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nfse-cert-'));
const arquivo = certificadoDeTeste(dir);
const cert = n.carregarCertificado({ arquivo, senha: SENHA });
const MOTIVO = 'Erro no valor do serviço informado';

caso('lê o CNPJ e a validade do certificado A1', () => {
  assert.strictEqual(cert.cnpj, CNPJ);
  assert.ok(cert.validoAte > new Date());
});

caso('senha errada não abre o certificado e a mensagem não vaza a senha', () => {
  assert.throws(() => n.carregarCertificado({ arquivo, senha: 'errada' }), (e) => /senha incorreta/.test(e.message) && !e.message.includes('errada'));
});

caso('pedido segue o leiaute pedRegEvento 1.01 (Id, ordem dos campos, evento 101101)', () => {
  const xml = n.montarPedidoCancelamento({ chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'homologacao' });
  assert.ok(xml.includes(`Id="PRE${CHAVE}101101"`));
  assert.match(`PRE${CHAVE}101101`, /^PRE[0-9]{56}$/);
  const ordem = ['<tpAmb>2</tpAmb>', '<verAplic>', '<dhEvento>', `<CNPJAutor>${CNPJ}`, `<chNFSe>${CHAVE}`, '<e101101>', '<xDesc>Cancelamento de NFS-e</xDesc>', '<cMotivo>1</cMotivo>', '<xMotivo>'];
  let pos = -1;
  for (const t of ordem) { const i = xml.indexOf(t); assert.ok(i > pos, `fora de ordem: ${t}`); pos = i; }
  assert.match(xml, /<dhEvento>\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-03:00<\/dhEvento>/);
  assert.ok(n.montarPedidoCancelamento({ chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 9, motivo: MOTIVO, ambiente: 'producao' }).includes('<tpAmb>1</tpAmb>'));
});

caso('rejeita chave, CNPJ, código e motivo inválidos', () => {
  const base = { chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'homologacao' };
  assert.throws(() => n.montarPedidoCancelamento({ ...base, chave: '123' }), /Chave/);
  assert.throws(() => n.montarPedidoCancelamento({ ...base, cnpjAutor: '1' }), /CNPJ/);
  assert.throws(() => n.montarPedidoCancelamento({ ...base, codigoMotivo: 3 }), /Código/);
  assert.throws(() => n.montarPedidoCancelamento({ ...base, motivo: 'curto' }), /motivo/);
  assert.throws(() => n.montarPedidoCancelamento({ ...base, motivo: 'x'.repeat(256) }), /motivo/);
});

caso('o motivo é escapado no XML (sem injetar tags)', () => {
  const xml = n.montarPedidoCancelamento({ chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 9, motivo: 'Valor <errado> & duplicado "2x"', ambiente: 'homologacao' });
  assert.ok(xml.includes('Valor &lt;errado&gt; &amp; duplicado &quot;2x&quot;'));
  assert.ok(!xml.includes('<errado>'));
});

for (const algo of ['sha256', 'sha1']) {
  caso(`assinatura ${algo} é válida e adulterar o XML a invalida`, () => {
    const xml = n.montarPedidoCancelamento({ chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'homologacao' });
    const assinado = n.assinarPedido(xml, cert, algo);
    assert.ok(assinado.indexOf('</infPedReg><Signature') > 0, 'assinatura logo depois de infPedReg');
    assert.ok(assinado.includes('<X509Certificate>'));
    const verificar = (texto) => {
      const doc = new DOMParser().parseFromString(texto, 'text/xml');
      const sigNo = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];
      const v = new SignedXml({ publicCert: cert.certPem });
      v.loadSignature(sigNo);
      return v.checkSignature(texto);
    };
    assert.strictEqual(verificar(assinado), true);
    assert.strictEqual(verificar(assinado.replace('Erro no valor', 'Erro no VALOR')), false);
  });
}

caso('compactação gzip+base64 é reversível', () => {
  const t = '<a>ação & coração</a>';
  assert.strictEqual(n.descompactar(n.compactar(t)), t);
});

caso('resposta 201 devolve o protocolo e o XML do evento', () => {
  const evento = '<evento><infEvento><nProt>123456789</nProt></infEvento></evento>';
  const r = n.lerResposta({ status: 201, corpo: JSON.stringify({ tipoAmbiente: 2, eventoXmlGZipB64: n.compactar(evento) }) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.protocolo, '123456789');
  assert.strictEqual(r.xmlEvento, evento);
});

caso('resposta 400 vira erro legível com o código da Receita', () => {
  const r = n.lerResposta({ status: 400, corpo: JSON.stringify({ erro: { codigo: 'E0840', descricao: 'NFS-e já cancelada', complemento: 'chave X' } }) });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.codigo, 'E0840');
  assert.ok(r.erro.includes('NFS-e já cancelada'));
});

caso('resposta 400 com "erro" em lista (como a homologação devolve) também é lida', () => {
  const r = n.lerResposta({ status: 400, corpo: JSON.stringify({ erro: [{ codigo: 'E1229', descricao: 'Xml não está utilizando codificação UTF-8.' }, { codigo: 'E0001', descricao: 'outro' }] }) });
  assert.strictEqual(r.codigo, 'E1229');
  assert.ok(r.erro.includes('UTF-8') && r.erro.includes('outro'));
});

caso('XML assinado vai com a declaração UTF-8 que a SEFIN exige', () => {
  const xml = n.montarPedidoCancelamento({ chave: CHAVE, cnpjAutor: CNPJ, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'homologacao' });
  assert.ok(n.assinarPedido(xml, cert).startsWith('<?xml version="1.0" encoding="UTF-8"?><pedRegEvento'));
});

caso('resposta que não é JSON (gateway) não quebra', () => {
  const r = n.lerResposta({ status: 502, corpo: '<html>Bad Gateway</html>' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.erro.includes('502'));
});

caso('cancelarNfse envia ao endereço certo, com o pedido assinado e compactado', async () => {
  let visto;
  const enviar = async (url, corpo) => {
    visto = { url, corpo };
    return { status: 201, corpo: JSON.stringify({ eventoXmlGZipB64: n.compactar('<e><nProt>77</nProt></e>') }) };
  };
  const r = await n.cancelarNfse({ chave: CHAVE, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'homologacao', certificado: cert, enviar });
  assert.strictEqual(visto.url, `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse/${CHAVE}/eventos`);
  const enviado = n.descompactar(visto.corpo.pedidoRegistroEventoXmlGZipB64);
  assert.ok(enviado.includes('<Signature') && enviado.includes(`<chNFSe>${CHAVE}</chNFSe>`));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.protocolo, '77');
  const p = await n.cancelarNfse({ chave: CHAVE, codigoMotivo: 1, motivo: MOTIVO, ambiente: 'producao', certificado: cert, enviar });
  assert.ok(visto.url.startsWith('https://sefin.nfse.gov.br/SefinNacional/'));
  assert.ok(n.descompactar(visto.corpo.pedidoRegistroEventoXmlGZipB64).includes('<tpAmb>1</tpAmb>'));
  assert.strictEqual(p.ok, true);
});

caso('certificado vencido bloqueia o envio antes de chamar a Receita', async () => {
  let chamou = false;
  const vencido = { ...cert, validoAte: new Date(Date.now() - 1000) };
  await assert.rejects(n.cancelarNfse({ chave: CHAVE, codigoMotivo: 1, motivo: MOTIVO, certificado: vencido, enviar: async () => { chamou = true; } }), /vencido/);
  assert.strictEqual(chamou, false);
});

caso('ambiente padrão é homologação e o cancelamento direto vem desligado', () => {
  delete process.env.NFSE_AMBIENTE; delete process.env.NFSE_CANCELAMENTO_DIRETO;
  assert.strictEqual(n.ambienteConfigurado(), 'homologacao');
  assert.strictEqual(n.cancelamentoDiretoLigado(), false);
  process.env.NFSE_AMBIENTE = 'producao'; process.env.NFSE_CANCELAMENTO_DIRETO = '1';
  assert.strictEqual(n.ambienteConfigurado(), 'producao');
  assert.strictEqual(n.cancelamentoDiretoLigado(), true);
  delete process.env.NFSE_AMBIENTE; delete process.env.NFSE_CANCELAMENTO_DIRETO;
});

(async () => {
  try {
    for (const [nome, fn] of casos) {
      try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`FALHOU: ${nome}\n  ${e.stack || e.message}`); process.exitCode = 1; }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log(`${ok}/${casos.length} testes de nfseNacional passaram`);
})();
