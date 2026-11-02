// Notas fiscais de serviço (versão 2.4): leitura dos XML que a importação
// aceita (ABRASF/ISSnet do SYSB1, com lista e cancelamento; NFS-e Nacional e o
// evento de cancelamento), totais do rascunho e escape do HTML do PDF.
// XMLs sintéticos, sem banco. Rodar: node testes/notasFiscais.test.js (pasta backend).
const assert = require('assert');
const { lerXmlNfse } = require('../src/utils/nfseXml');
const { gerarHtmlNfse } = require('../src/utils/nfsePdfTemplate');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

const HM = '04003376000100';
const tomador = (doc) => `<TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>${doc}</Cnpj></CpfCnpj></IdentificacaoTomador><RazaoSocial>Cliente &amp; Cia</RazaoSocial>
  <Endereco><Endereco>SIA Trecho 3</Endereco><Numero>10</Numero><CodigoMunicipio>5300108</CodigoMunicipio><Cep>71200030</Cep></Endereco></TomadorServico>`;
const compAbrasf = (numero, extra = '', servico = '') => `<CompNfse><Nfse versao="2.04"><InfNfse><Numero>${numero}</Numero><CodigoVerificacao>CV${numero}</CodigoVerificacao>
  <DataEmissao>2026-08-14T10:22:31</DataEmissao><ValoresNfse><ValorLiquidoNfse>1000.00</ValorLiquidoNfse></ValoresNfse>
  <DeclaracaoPrestacaoServico><InfDeclaracaoPrestacaoServico><Rps><IdentificacaoRps><Numero>25</Numero><Serie>3</Serie></IdentificacaoRps></Rps>
  <Competencia>2026-08-01</Competencia><Servico><Valores><ValorServicos>1000.00</ValorServicos><Aliquota>0.02</Aliquota><ValorIss>20.00</ValorIss></Valores>
  <IssRetido>2</IssRetido><ItemListaServico>7.02</ItemListaServico>${servico}<Discriminacao>Instalação elétrica</Discriminacao><CodigoMunicipio>5300108</CodigoMunicipio></Servico>
  <Prestador><CpfCnpj><Cnpj>${HM}</Cnpj></CpfCnpj></Prestador>${tomador('11222333000181')}
  </InfDeclaracaoPrestacaoServico></DeclaracaoPrestacaoServico></InfNfse></Nfse>${extra}</CompNfse>`;
const CHAVE = '53001082204003376000100000000000000099260800000001';
const nacional = `<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS${CHAVE}"><nNFSe>12</nNFSe><xTribNac>Engenharia</xTribNac>
  <dhProc>2026-11-03T14:05:00-03:00</dhProc><emit><CNPJ>${HM}</CNPJ></emit><valores><pAliqAplic>2.00</pAliqAplic><vISSQN>16.00</vISSQN><vLiq>784.00</vLiq></valores>
  <DPS versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-11-03T14:00:00-03:00</dhEmi><serie>1</serie><nDPS>7</nDPS><dCompet>2026-11-03</dCompet>
  <toma><CPF>12345678909</CPF><xNome>Fulano</xNome><email>f@x.com</email></toma>
  <serv><locPrest><cLocPrestacao>5300108</cLocPrestacao></locPrest><cServ><cTribNac>070101</cTribNac><xDescServ>Projeto</xDescServ><cNBS>114032000</cNBS></cServ></serv>
  <valores><vServPrest><vServ>800.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>2</tpRetISSQN></tribMun></trib></valores></infDPS></DPS></infNFSe></NFSe>`;

caso('ABRASF (ISSnet/SYSB1): lista com duas notas, alíquota em fração vira %, cancelada pelo NfseCancelamento', async () => {
  const cancel = '<NfseCancelamento><Confirmacao><Pedido><InfPedidoCancelamento><CodigoCancelamento>2</CodigoCancelamento></InfPedidoCancelamento></Pedido><DataHora>2026-09-03T08:00:00</DataHora></Confirmacao></NfseCancelamento>';
  const xml = `<ConsultarNfseServicoPrestadoResposta><ListaNfse>${compAbrasf(28)}${compAbrasf(29, cancel)}</ListaNfse></ConsultarNfseServicoPrestadoResposta>`;
  const { notas } = await lerXmlNfse(Buffer.from(xml));
  assert.strictEqual(notas.length, 2);
  const [a, b] = notas;
  assert.deepStrictEqual([a.padrao, a.numero, a.codigo_verificacao, a.serie_dps, a.numero_dps], ['abrasf', 28, 'CV28', '3', 25]);
  assert.deepStrictEqual([a.valor_servicos, a.aliquota_iss, a.valor_iss, a.iss_retido, a.item_lista, a.competencia], [1000, 2, 20, false, '7.02', '2026-08-01']);
  assert.strictEqual(a.prestador_documento, HM);
  assert.deepStrictEqual([a.tomador.nome, a.tomador.documento, a.tomador.cep, a.tomador.codigo_municipio], ['Cliente & Cia', '11222333000181', '71200030', '5300108']);
  assert.strictEqual(a.data_emissao, '2026-08-14T10:22:31-03:00', 'data sem fuso = Brasília');
  assert.ok(a.xml.includes('<Numero>28</Numero>') && !a.xml.includes('<Numero>29</Numero>'), 'cada nota guarda o próprio XML');
  assert.strictEqual(a.situacao, 'emitida');
  assert.deepStrictEqual([b.situacao, b.cancelada_em], ['cancelada', '2026-09-03T08:00:00-03:00']);
});

caso('ABRASF 2.04 do ISSnet DF: NBS, descrição da atividade (tag com acento), informações, natureza e responsável pela retenção', async () => {
  const servico = '<CodigoNbs>101012200</CodigoNbs><ResponsavelRetencao>1</ResponsavelRetencao><ExigibilidadeISS>1</ExigibilidadeISS><MunicipioIncidencia>5300108</MunicipioIncidencia>';
  const xml = compAbrasf(30, '', servico)
    .replace('<ValoresNfse>', '<OutrasInformacoes>I - "SIMPLES"; e \\s\\n II - "IPI."\\s\\nPROCON: TEL 151</OutrasInformacoes><ValoresNfse>')
    .replace('</ValoresNfse>', '</ValoresNfse><DescricaoCodigoTributacaoMunicípio>7.02 - Execução de obras</DescricaoCodigoTributacaoMunicípio>')
    .replace('</TomadorServico>', '</TomadorServico><InformacoesComplementares>Medição 2. Pix 04003376000100</InformacoesComplementares>');
  const { notas: [n] } = await lerXmlNfse(Buffer.from(xml));
  assert.deepStrictEqual([n.nbs, n.servico_descricao, n.exigibilidade_iss, n.responsavel_retencao, n.municipio_incidencia],
    ['101012200', '7.02 - Execução de obras', 1, 1, '5300108']);
  assert.strictEqual(n.observacoes, 'Medição 2. Pix 04003376000100');
  assert.strictEqual(n.outras_informacoes, 'I - "SIMPLES"; e\nII - "IPI."\nPROCON: TEL 151', '"\\s\\n" literal vira quebra de linha');
});

caso('NFS-e Nacional: chave de 50 dígitos, DPS, ISS retido pelo tomador, CPF do tomador e NBS', async () => {
  const { notas: [n] } = await lerXmlNfse(Buffer.from(nacional));
  assert.deepStrictEqual([n.padrao, n.numero, n.chave_acesso, n.serie_dps, n.numero_dps], ['nacional', 12, CHAVE, '1', 7]);
  assert.deepStrictEqual([n.ctrib_nac, n.nbs, n.servico_descricao, n.discriminacao], ['070101', '114032000', 'Engenharia', 'Projeto']);
  assert.deepStrictEqual([n.valor_servicos, n.aliquota_iss, n.valor_iss, n.iss_retido, n.valor_liquido], [800, 2, 16, true, 784]);
  assert.deepStrictEqual([n.tomador.documento, n.tomador.email, n.competencia], ['12345678909', 'f@x.com', '2026-11-03']);
  assert.strictEqual(n.xml, nacional, 'arquivo de uma nota guarda o XML inteiro (com a assinatura)');
});

caso('evento de cancelamento nacional (e101101) e arquivo sem nota', async () => {
  const ev = `<evento><infEvento><pedRegEvento><infPedReg><chNFSe>${CHAVE}</chNFSe><dhEvento>2026-11-04T10:00:00-03:00</dhEvento>
    <e101101><xDesc>Cancelamento</xDesc><cMotivo>1</cMotivo><xMotivo>Erro no valor</xMotivo></e101101></infPedReg></pedRegEvento></infEvento></evento>`;
  const r = await lerXmlNfse(Buffer.from(ev));
  assert.deepStrictEqual(r.notas, []);
  assert.deepStrictEqual(r.cancelamentos, [{ chave: CHAVE, data: '2026-11-04T10:00:00-03:00', motivo: 'Erro no valor', substituida: false }]);
  assert.deepStrictEqual(await lerXmlNfse(Buffer.from('<nada/>')), { notas: [], cancelamentos: [] });
  await assert.rejects(lerXmlNfse(Buffer.from('<a>')), /XML inválido/);
});

caso('rascunho: ISS pela alíquota sobre a base e líquido descontando retenções (ISS só se retido)', () => {
  const { calcularTotais } = require('../src/controllers/notasFiscaisController');
  const zero = { valor_deducoes: 0, desconto_incondicionado: 0, desconto_condicionado: 0, valor_pis: 0, valor_cofins: 0, valor_inss: 0, valor_ir: 0, valor_csll: 0, outras_retencoes: 0 };
  const a = calcularTotais({ ...zero, valor_servicos: 1234.5, aliquota_iss: 2, iss_retido: false });
  assert.deepStrictEqual([a.valor_iss, a.valor_liquido], [24.69, 1234.5]);
  const b = calcularTotais({ ...zero, valor_servicos: 10000, desconto_incondicionado: 1000, aliquota_iss: 5, iss_retido: true, valor_ir: 150, valor_inss: 1100 });
  assert.deepStrictEqual([b.valor_iss, b.valor_liquido], [450, 10000 - 1000 - 150 - 1100 - 450]);
  assert.strictEqual(calcularTotais({ ...zero, valor_servicos: 100, aliquota_iss: null, iss_retido: true }).valor_iss, 0);
});

caso('PDF: texto do tomador e da discriminação escapado; rascunho e cancelada marcados', () => {
  const nota = {
    situacao: 'rascunho', padrao: 'nacional', competencia: '2026-11-01', valor_servicos: 10, valor_liquido: 10,
    tomador: { nome: '<script>x</script>', documento: '11222333000181' }, discriminacao: 'a <b>b</b> & c', ctrib_nac: '070101',
  };
  const html = gerarHtmlNfse(nota, { empresa: { op_simp_nac: 3, inscricao_municipal: '0786440800236' } });
  assert.ok(!html.includes('<script>x') && html.includes('&lt;script&gt;x'));
  assert.ok(html.includes('a &lt;b&gt;b&lt;/b&gt; &amp; c'));
  // sem máscara por cima da nota (removida a pedido: a nota fica legível); o rascunho
  // segue identificado no campo do número e na tarja de texto
  assert.ok(!/class="marca"|position:\s*fixed/.test(html));
  assert.ok(html.includes('RASCUNHO'));
  assert.match(html, /11\.222\.333\/0001-81/);
  const canc = gerarHtmlNfse({ ...nota, situacao: 'cancelada', motivo_cancelamento: 'erro <x>', numero: 5 }, { empresa: {} });
  assert.ok(!/class="marca"|position:\s*fixed/.test(canc));
  assert.match(canc, /NFS-e CANCELADA — erro &lt;x&gt;/);
  assert.ok(canc.includes('erro &lt;x&gt;'));
  // layout do ISS DF: ISS retido sai no "Vl. ISSQN Retido" (o "Total do ISSQN" fica zero), chave nacional em vermelho
  const emit = gerarHtmlNfse({ ...nota, situacao: 'emitida', padrao: 'abrasf', numero: 28, valor_servicos: 1000, valor_iss: 20, iss_retido: true,
    chave_nacional: '5'.repeat(50), observacoes: 'Período <set>' }, { empresa: { op_simp_nac: 3 }, qrcode: 'data:image/png;base64,AAA' });
  assert.ok(!/class="marca"/.test(emit));
  assert.match(emit, /Total do ISSQN<\/span><span class="v">R\$\s0,00/);
  assert.match(emit, /Vl\. ISSQN Retido<\/span><span class="v">R\$\s20,00/);
  assert.match(emit, /Responsável pela Retenção<\/span><span class="v">Tomador/);
  assert.ok(emit.includes(`Ambiente de Dados Nacional: ${'5'.repeat(50)}`) && emit.includes('Período &lt;set&gt;') && emit.includes('SIMPLES NACIONAL'));
  assert.ok(emit.includes('src="data:image/png;base64,AAA"'), 'QR Code');
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`notas fiscais: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
