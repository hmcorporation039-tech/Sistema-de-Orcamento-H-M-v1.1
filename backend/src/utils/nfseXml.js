// Leitura de XML de NFS-e para a importação das notas já emitidas (versão 2.4):
//   - ABRASF (ISSnet DF — as notas do SYSB1 até 31/10/2026), versões 1.0 e 2.0x:
//     CompNfse > Nfse > InfNfse (com NfseCancelamento quando cancelada). Um
//     arquivo pode trazer uma nota ou uma lista (ListaNfse, ConsultarNfse…).
//   - NFS-e Padrão Nacional: NFSe > infNFSe (com a DPS dentro), e o evento de
//     cancelamento (e101101) em arquivo separado.
// Devolve { notas: [...], cancelamentos: [{ chave, data, motivo }] } com os
// campos já no formato da tabela notas_fiscais.
const xml2js = require('xml2js');

const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const texto = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') v = v._ ?? '';
  const t = String(v).trim();
  return t || null;
};
const numero = (v) => {
  const t = texto(v);
  if (t == null) return 0;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const lista = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// todos os nós com esse nome, em qualquer profundidade (o ABRASF muda de
// envelope conforme a versão e a consulta que gerou o arquivo)
function acharTodos(no, nome, achados = []) {
  if (!no || typeof no !== 'object') return achados;
  for (const [k, v] of Object.entries(no)) {
    if (k === '$' || k === '_') continue;
    for (const item of lista(v)) {
      if (k === nome) achados.push(item);
      else acharTodos(item, nome, achados);
    }
  }
  return achados;
}
const acharUm = (no, nome) => acharTodos(no, nome)[0] || null;

// data "2026-08-14T10:22:31" (sem fuso = horário de Brasília) ou "2026-08-14"
function dataHora(v) {
  const t = texto(v);
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T12:00:00-03:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(t)) return `${t}-03:00`;
  return t;
}
const soData = (v) => { const t = texto(v); return t ? t.slice(0, 10) : null; };

// alíquota: o ABRASF 1.0 manda fração (0.05); o 2.0 e o nacional, percentual (5.00)
function aliquota(v) {
  const n = numero(v);
  if (!n) return null;
  return n < 1 ? Math.round(n * 10000) / 100 : n;
}

function tomadorAbrasf(t) {
  if (!t) return {};
  const id = t.IdentificacaoTomador || {};
  const doc = acharUm(id, 'Cnpj') || acharUm(id, 'Cpf') || acharUm(t, 'Cnpj') || acharUm(t, 'Cpf');
  const end = t.Endereco || {};
  const contato = t.Contato || {};
  return {
    nome: texto(t.RazaoSocial) || texto(t.NomeFantasia),
    documento: digitos(texto(doc)) || null,
    inscricao_municipal: digitos(texto(id.InscricaoMunicipal)) || null,
    logradouro: texto(end.Endereco),
    numero: texto(end.Numero),
    complemento: texto(end.Complemento),
    bairro: texto(end.Bairro),
    codigo_municipio: digitos(texto(end.CodigoMunicipio)) || null,
    uf: texto(end.Uf),
    cep: digitos(texto(end.Cep)) || null,
    telefone: texto(contato.Telefone),
    email: texto(contato.Email),
  };
}

function notaAbrasf(comp, xmlDaNota) {
  const inf = acharUm(comp, 'InfNfse');
  if (!inf) return null;
  // 2.0x: o serviço está na declaração; 1.0: direto em InfNfse
  const decl = acharUm(inf, 'InfDeclaracaoPrestacaoServico') || inf;
  const serv = decl.Servico || inf.Servico || {};
  const val = serv.Valores || {};
  const valNfse = inf.ValoresNfse || {};
  const rps = acharUm(decl, 'IdentificacaoRps') || {};
  const prest = acharUm(inf, 'PrestadorServico') || acharUm(decl, 'Prestador') || {};
  const cancelamento = acharUm(comp, 'NfseCancelamento');
  const substituicao = acharUm(comp, 'NfseSubstituicao');
  const confCanc = cancelamento ? (acharUm(cancelamento, 'Confirmacao') || cancelamento) : null;
  const valorIss = numero(val.ValorIss) || numero(valNfse.ValorIss);
  // IssRetido: 1 = sim, 2 = não (ABRASF)
  const issRetido = String(texto(val.IssRetido) ?? texto(serv.IssRetido) ?? '2') === '1';
  const n = {
    padrao: 'abrasf',
    numero: Number(digitos(texto(inf.Numero))) || null,
    codigo_verificacao: texto(inf.CodigoVerificacao),
    chave_acesso: null,
    serie_dps: texto(rps.Serie),
    numero_dps: Number(digitos(texto(rps.Numero))) || null,
    data_emissao: dataHora(inf.DataEmissao),
    competencia: soData(decl.Competencia) || soData(inf.Competencia) || soData(inf.DataEmissao),
    prestador_documento: digitos(texto(acharUm(prest, 'Cnpj') || acharUm(prest, 'Cpf'))),
    tomador: tomadorAbrasf(decl.TomadorServico || decl.Tomador || inf.TomadorServico),
    item_lista: texto(serv.ItemListaServico),
    cnae: digitos(texto(serv.CodigoCnae)) || null,
    ctrib_mun: texto(serv.CodigoTributacaoMunicipio),
    ctrib_nac: null,
    nbs: digitos(texto(serv.CodigoNbs)) || null,
    // o ISSnet DF escreve a tag com acento
    servico_descricao: texto(inf['DescricaoCodigoTributacaoMunicípio'] ?? inf.DescricaoCodigoTributacaoMunicipio),
    discriminacao: texto(serv.Discriminacao) || '',
    codigo_municipio_prestacao: digitos(texto(serv.CodigoMunicipio)) || null,
    valor_servicos: numero(val.ValorServicos),
    valor_deducoes: numero(val.ValorDeducoes),
    desconto_incondicionado: numero(val.DescontoIncondicionado),
    desconto_condicionado: numero(val.DescontoCondicionado),
    aliquota_iss: aliquota(val.Aliquota ?? valNfse.Aliquota),
    valor_iss: valorIss,
    iss_retido: issRetido,
    valor_pis: numero(val.ValorPis),
    valor_cofins: numero(val.ValorCofins),
    valor_inss: numero(val.ValorInss),
    valor_ir: numero(val.ValorIr),
    valor_csll: numero(val.ValorCsll),
    outras_retencoes: numero(val.OutrasRetencoes),
    valor_liquido: numero(valNfse.ValorLiquidoNfse) || numero(val.ValorLiquidoNfse),
    // InformacoesComplementares: o texto da H&M (período, dados bancários);
    // OutrasInformacoes: o que o ISS acrescenta (Simples, PROCON), com "\s\n"
    // literal no lugar da quebra de linha
    observacoes: texto(decl.InformacoesComplementares),
    outras_informacoes: texto(inf.OutrasInformacoes)?.replace(/\s*\\s\\n\s*|\s*\\n\s*/g, '\n') || null,
    exigibilidade_iss: Number(digitos(texto(serv.ExigibilidadeISS))) || null,
    responsavel_retencao: Number(digitos(texto(serv.ResponsavelRetencao))) || null,
    municipio_incidencia: digitos(texto(serv.MunicipioIncidencia)) || null,
    situacao: cancelamento ? 'cancelada' : substituicao ? 'substituida' : 'emitida',
    cancelada_em: cancelamento ? dataHora(acharUm(confCanc, 'DataHora') || acharUm(confCanc, 'DataHoraCancelamento')) : null,
    motivo_cancelamento: cancelamento ? (texto(acharUm(cancelamento, 'CodigoCancelamento')) ? `Código ${texto(acharUm(cancelamento, 'CodigoCancelamento'))} (ISSnet)` : 'Cancelada no ISSnet') : null,
    xml: xmlDaNota,
  };
  return n;
}

function notaNacional(nfse, xml) {
  const inf = nfse.infNFSe || acharUm(nfse, 'infNFSe');
  if (!inf) return null;
  const dps = acharUm(inf, 'infDPS') || {};
  const toma = dps.toma || {};
  const end = toma.end || {};
  const serv = dps.serv || {};
  const cServ = serv.cServ || {};
  const vDps = dps.valores || {};
  const vNfse = inf.valores || {};
  const tribMun = acharUm(vDps, 'tribMun') || {};
  const tribFed = acharUm(vDps, 'tribFed') || {};
  const desc = vDps.vDescCondIncond || {};
  const chave = digitos(inf.$?.Id).slice(-50) || null;
  return {
    padrao: 'nacional',
    numero: Number(digitos(texto(inf.nNFSe))) || null,
    codigo_verificacao: null,
    chave_acesso: chave && chave.length === 50 ? chave : null,
    serie_dps: texto(dps.serie),
    numero_dps: Number(digitos(texto(dps.nDPS))) || null,
    data_emissao: dataHora(inf.dhProc) || dataHora(dps.dhEmi),
    competencia: soData(dps.dCompet) || soData(dps.dhEmi),
    prestador_documento: digitos(texto(acharUm(inf.emit, 'CNPJ') || acharUm(inf.emit, 'CPF') || acharUm(dps.prest, 'CNPJ'))),
    tomador: {
      nome: texto(toma.xNome),
      documento: digitos(texto(toma.CNPJ || toma.CPF)) || null,
      inscricao_municipal: digitos(texto(toma.IM)) || null,
      logradouro: texto(end.xLgr),
      numero: texto(end.nro),
      complemento: texto(end.xCpl),
      bairro: texto(end.xBairro),
      codigo_municipio: digitos(texto(acharUm(end, 'cMun'))) || null,
      uf: null,
      cep: digitos(texto(acharUm(end, 'CEP'))) || null,
      telefone: texto(toma.fone),
      email: texto(toma.email),
    },
    item_lista: null,
    cnae: null,
    ctrib_nac: digitos(texto(cServ.cTribNac)) || null,
    ctrib_mun: texto(cServ.cTribMun),
    nbs: digitos(texto(cServ.cNBS)) || null,
    servico_descricao: texto(inf.xTribNac),
    discriminacao: texto(cServ.xDescServ) || '',
    codigo_municipio_prestacao: digitos(texto(acharUm(serv.locPrest, 'cLocPrestacao'))) || null,
    valor_servicos: numero(acharUm(vDps, 'vServ')),
    valor_deducoes: numero(acharUm(vDps, 'vDR')),
    desconto_incondicionado: numero(desc.vDescIncond),
    desconto_condicionado: numero(desc.vDescCond),
    aliquota_iss: aliquota(vNfse.pAliqAplic ?? tribMun.pAliq),
    valor_iss: numero(vNfse.vISSQN),
    // tpRetISSQN: 1 não retido, 2 retido pelo tomador, 3 pelo intermediário
    iss_retido: ['2', '3'].includes(String(texto(tribMun.tpRetISSQN) ?? '1')),
    responsavel_retencao: { 2: 1, 3: 2 }[texto(tribMun.tpRetISSQN)] || null,
    valor_pis: numero(acharUm(tribFed, 'vPis')),
    valor_cofins: numero(acharUm(tribFed, 'vCofins')),
    valor_inss: numero(tribFed.vRetCP),
    valor_ir: numero(tribFed.vRetIRRF),
    valor_csll: numero(tribFed.vRetCSLL),
    outras_retencoes: 0,
    valor_liquido: numero(vNfse.vLiq),
    observacoes: texto(acharUm(serv, 'xInfComp')) || texto(acharUm(dps, 'xInfComp')),
    situacao: 'emitida',
    cancelada_em: null,
    motivo_cancelamento: null,
    xml,
  };
}

// evento de cancelamento da NFS-e nacional (e101101 / e105102 por substituição)
function cancelamentosNacionais(raiz) {
  const achados = [];
  for (const ev of acharTodos(raiz, 'infPedReg')) {
    const chave = digitos(texto(ev.chNFSe));
    const cancel = ev.e101101 || ev.e105102;
    if (chave.length !== 50 || !cancel) continue;
    achados.push({
      chave,
      data: dataHora(ev.dhEvento),
      motivo: texto(cancel.xMotivo) || texto(cancel.xDesc) || 'Cancelada no Emissor Nacional',
      substituida: !!ev.e105102,
    });
  }
  return achados;
}

async function lerXmlNfse(conteudo) {
  const xml = Buffer.isBuffer(conteudo) ? conteudo.toString('utf8').replace(/^﻿/, '') : String(conteudo);
  let raiz;
  try {
    raiz = await xml2js.parseStringPromise(xml, { explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
  } catch (e) {
    throw new Error(`XML inválido (${e.message.split('\n')[0]})`);
  }
  const notas = [];
  const nacionais = acharTodos(raiz, 'NFSe');
  for (const n of nacionais) {
    const nota = notaNacional(n, nacionais.length === 1 ? xml : null);
    if (nota) notas.push(nota);
  }
  const compostas = acharTodos(raiz, 'CompNfse');
  // arquivo de uma nota só sem o envelope CompNfse (só Nfse > InfNfse)
  const blocos = compostas.length ? compostas : acharTodos(raiz, 'Nfse').map(nf => ({ Nfse: nf }));
  for (const c of blocos) {
    // com várias notas no arquivo, o XML guardado é o da própria nota
    const proprio = blocos.length === 1 ? xml : new xml2js.Builder({ headless: true, rootName: 'CompNfse' }).buildObject(c);
    const nota = notaAbrasf(c, proprio);
    if (nota) notas.push(nota);
  }
  return { notas, cancelamentos: cancelamentosNacionais(raiz) };
}

module.exports = { lerXmlNfse, acharTodos };
