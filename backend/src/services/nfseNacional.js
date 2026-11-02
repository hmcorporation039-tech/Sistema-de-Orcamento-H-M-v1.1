// NFS-e Padrão Nacional: cancelamento direto pela API da SEFIN Nacional
// (POST /nfse/{chave}/eventos, evento 101101). Leiaute: pedRegEvento v1.01
// (XSD oficial de 09/02/2026). Certificado A1 (.pfx) serve para assinar o XML
// e para autenticar a conexão (mTLS). A senha vem de NFSE_CERT_SENHA no .env.
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

const NS = 'http://www.sped.fazenda.gov.br/nfse';
const PASTA_CERT_PADRAO = 'C:\\HM-Engenharia\\Certificados';
const BASES = {
  homologacao: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
  producao: 'https://sefin.nfse.gov.br/SefinNacional',
};
const ALGORITMOS = {
  sha256: { assinatura: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256', digest: 'http://www.w3.org/2001/04/xmlenc#sha256' },
  sha1: { assinatura: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1', digest: 'http://www.w3.org/2000/09/xmldsig#sha1' },
};
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ambienteConfigurado() {
  return String(process.env.NFSE_AMBIENTE || 'homologacao').toLowerCase() === 'producao' ? 'producao' : 'homologacao';
}

// Cancelamento direto só liga se alguém ligou de propósito no .env.
function cancelamentoDiretoLigado() {
  return process.env.NFSE_CANCELAMENTO_DIRETO === '1';
}

function arquivoDoCertificado() {
  if (process.env.NFSE_CERT_ARQUIVO) return process.env.NFSE_CERT_ARQUIVO;
  const achados = fs.existsSync(PASTA_CERT_PADRAO)
    ? fs.readdirSync(PASTA_CERT_PADRAO).filter((f) => /\.pfx$/i.test(f)) : [];
  if (achados.length !== 1) {
    throw new Error(achados.length ? 'Há mais de um .pfx na pasta de certificados: defina NFSE_CERT_ARQUIVO no .env.'
      : 'Certificado A1 (.pfx) não encontrado na pasta de certificados.');
  }
  return path.join(PASTA_CERT_PADRAO, achados[0]);
}

// Lê o .pfx e devolve chave/certificado em PEM + CNPJ e validade (sem logar nada sensível).
function carregarCertificado({ arquivo, senha } = {}) {
  const caminho = arquivo || arquivoDoCertificado();
  const pass = senha ?? process.env.NFSE_CERT_SENHA;
  if (!pass) throw new Error('NFSE_CERT_SENHA não está definida no .env.');
  const pfxBuf = fs.readFileSync(caminho);
  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfxBuf.toString('binary'))), pass);
  } catch {
    throw new Error('Não consegui abrir o certificado: senha incorreta ou arquivo inválido.');
  }
  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || []).map((b) => b.cert);
  const chaves = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];
  if (!certs.length || !chaves.length) throw new Error('O arquivo .pfx não tem certificado e chave privada.');
  const chavePriv = chaves[0].key;
  const cert = certs.find((c) => forge.pki.publicKeyToPem(c.publicKey) === forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(chavePriv.n, chavePriv.e))) || certs[0];
  const cn = cert.subject.getField('CN')?.value || '';
  const cnpj = (cn.match(/:(\d{14})$/) || [])[1] || null;
  return {
    arquivo: caminho,
    pfx: pfxBuf,
    senha: pass,
    keyPem: forge.pki.privateKeyToPem(chavePriv),
    certPem: forge.pki.certificateToPem(cert),
    cnpj,
    nome: cn,
    validoAte: cert.validity.notAfter,
    validoDe: cert.validity.notBefore,
  };
}

function dataHoraEvento(agora = new Date()) {
  // -03:00 fixo (Brasília); 60 s para trás evita rejeição por relógio adiantado
  const d = new Date(agora.getTime() - 60 * 1000 - 3 * 3600 * 1000);
  return `${d.toISOString().slice(0, 19)}-03:00`;
}

// XML do pedido de registro de evento de cancelamento (sem assinatura).
function montarPedidoCancelamento({ chave, cnpjAutor, codigoMotivo, motivo, ambiente, versaoApp = 'HM-ENG-2.4', agora }) {
  if (!/^\d{50}$/.test(String(chave || ''))) throw new Error('Chave de acesso inválida (precisa de 50 dígitos).');
  if (!/^\d{14}$/.test(String(cnpjAutor || ''))) throw new Error('CNPJ do autor inválido.');
  if (!['1', '2', '9'].includes(String(codigoMotivo))) throw new Error('Código do motivo inválido (use 1, 2 ou 9).');
  const m = String(motivo || '').trim();
  if (m.length < 15 || m.length > 255) throw new Error('O motivo precisa ter de 15 a 255 caracteres.');
  const tpAmb = ambiente === 'producao' ? '1' : '2';
  return `<pedRegEvento xmlns="${NS}" versao="1.01"><infPedReg Id="PRE${chave}101101">`
    + `<tpAmb>${tpAmb}</tpAmb><verAplic>${esc(versaoApp).slice(0, 20)}</verAplic><dhEvento>${dataHoraEvento(agora)}</dhEvento>`
    + `<CNPJAutor>${cnpjAutor}</CNPJAutor><chNFSe>${chave}</chNFSe>`
    + `<e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>${codigoMotivo}</cMotivo><xMotivo>${esc(m)}</xMotivo></e101101>`
    + `</infPedReg></pedRegEvento>`;
}

// XMLDSig "enveloped" sobre infPedReg (Id), C14N 1.0, certificado no KeyInfo.
function assinarPedido(xml, cert, algoritmo = process.env.NFSE_ASSINATURA_ALGO || 'sha256') {
  const alg = ALGORITMOS[algoritmo] || ALGORITMOS.sha256;
  const sig = new SignedXml({
    privateKey: cert.keyPem,
    publicCert: cert.certPem,
    signatureAlgorithm: alg.assinatura,
    canonicalizationAlgorithm: C14N,
  });
  sig.addReference({
    xpath: "//*[local-name(.)='infPedReg']",
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: alg.digest,
  });
  sig.computeSignature(xml, { location: { reference: "//*[local-name(.)='infPedReg']", action: 'after' } });
  // a SEFIN rejeita (E1229) XML sem a declaração explícita de UTF-8
  return `<?xml version="1.0" encoding="UTF-8"?>${sig.getSignedXml()}`;
}

const compactar = (xml) => zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
const descompactar = (b64) => zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');

function postJson(url, corpo, { agent, timeout = 30000 }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const dados = JSON.stringify(corpo);
    const req = https.request({
      method: 'POST', hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, agent, timeout,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(dados) },
    }, (res) => {
      const partes = [];
      res.on('data', (d) => partes.push(d));
      res.on('end', () => resolve({ status: res.statusCode, corpo: Buffer.concat(partes).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('A Receita demorou demais para responder.')));
    req.on('error', reject);
    req.write(dados);
    req.end();
  });
}

function lerResposta({ status, corpo }) {
  let json = null;
  try { json = JSON.parse(corpo); } catch { /* resposta não-JSON (ex.: HTML de erro do gateway) */ }
  if (status === 201 && json?.eventoXmlGZipB64) {
    const xmlEvento = descompactar(json.eventoXmlGZipB64);
    const protocolo = (xmlEvento.match(/<nProt>([^<]+)<\/nProt>/) || xmlEvento.match(/<nSeqEvento>([^<]+)<\/nSeqEvento>/) || [])[1] || null;
    return { ok: true, protocolo, xmlEvento };
  }
  // a API devolve "erro" como objeto (spec) ou lista (visto na homologação); "erros" no caso de DPS
  const lista = [json?.erro, json?.erros].flat().filter(Boolean);
  const detalhe = lista.length
    ? lista.map((e) => [e.codigo, e.descricao, e.complemento].filter(Boolean).join(' — ')).join(' | ')
    : null;
  return { ok: false, status, erro: detalhe || `A Receita respondeu HTTP ${status} sem detalhes.`, codigo: lista[0]?.codigo || null };
}

// Cancela a NFS-e na Receita. Não toca no banco: quem chama decide o que gravar.
async function cancelarNfse({ chave, codigoMotivo, motivo, ambiente = ambienteConfigurado(), certificado, enviar = postJson, base }) {
  const cert = certificado || carregarCertificado();
  if (cert.validoAte < new Date()) throw new Error('O certificado digital está vencido.');
  const pedido = montarPedidoCancelamento({ chave, cnpjAutor: cert.cnpj, codigoMotivo, motivo, ambiente });
  const assinado = assinarPedido(pedido, cert);
  const agent = new https.Agent({ pfx: cert.pfx, passphrase: cert.senha });
  const url = `${base || BASES[ambiente]}/nfse/${chave}/eventos`;
  const resp = await enviar(url, { pedidoRegistroEventoXmlGZipB64: compactar(assinado) }, { agent });
  return { ...lerResposta(resp), ambiente, xmlEnviado: assinado };
}

module.exports = {
  BASES, ambienteConfigurado, cancelamentoDiretoLigado, carregarCertificado, montarPedidoCancelamento,
  assinarPedido, compactar, descompactar, lerResposta, cancelarNfse, postJson,
};
