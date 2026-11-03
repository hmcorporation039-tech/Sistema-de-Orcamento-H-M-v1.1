const JSZip = require('jszip');
const { EMPRESA } = require('../utils/pdfTemplate');
const T = require('../utils/textoAtestado');
const { esc } = require('../utils/xml');

// Atestado de capacidade técnica (item 9 do plano), no modelo formal do Márcio
// ("Modelo_Atestado_Capacidade_Tecnica_HM_formal"): 5 partes (responsável técnico, dados do
// contrato, descrição das atividades, planilha de serviços, comprovação documental), fecho e
// assinaturas. O papel timbrado e o rodapé são do CLIENTE, por isso não saem no arquivo: ele cola
// o corpo no papel dele, confere e assina. O sistema só propõe o texto.
//
// De onde vem cada dado (nada é inventado; sem dado, a linha some):
//  - nota fiscal emitida: número, data, competência, tomador (nome, CNPJ, endereço), texto do serviço
//  - texto da nota: as atividades (uma por linha, por disciplina) e o objeto
//  - proposta ligada à nota: itens e quantidades reais (planilha), local da obra, número da proposta
//  - informado na tela: contrato, período, vigência, área, responsáveis técnicos (CREA/ART), signatários
const LIMITE_LINHA = 200;
const LIMITE_OBJETO = 700;
const LIMITE_RESPONSAVEIS = 5;
const LIMITE_SIGNATARIOS = 4;

// Dados da H&M como constam no modelo aprovado (o endereço do modelo segue o cadastro do CNPJ)
const HM = Object.freeze({
  razaoSocial: String(EMPRESA.razaoSocial).toUpperCase(),
  cnpj: EMPRESA.cnpj,
  sede: 'Q CNF 3, SN, Lote 16, Loja 04, Parte A, Taguatinga Norte (Taguatinga), Brasília/DF, CEP 72.125-535',
});

const limpar = (v, max = LIMITE_LINHA) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dataBR(v) {
  if (!v) return null;
  const s = v instanceof Date ? v.toISOString() : String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}
const diasEntre = (a, b) => {
  const x = Date.parse(`${String(a).slice(0, 10)}T00:00:00Z`);
  const y = Date.parse(`${String(b).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(x) && Number.isFinite(y) && y >= x ? Math.round((y - x) / 86400000) + 1 : null;
};

function documentoFormatado(doc) {
  const d = digitos(doc);
  if (d.length === 14) return { rotulo: 'CNPJ', valor: d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') };
  if (d.length === 11) return { rotulo: 'CPF', valor: d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') };
  return null;
}

function enderecoDoTomador(t) {
  const partes = [
    [t.logradouro, t.numero].filter(Boolean).join(', ') || t.endereco,
    t.bairro,
    [t.municipio, t.uf].filter(Boolean).join('/'),
  ].map(x => limpar(x)).filter(Boolean);
  return partes.join(', ');
}

// Só nota EMITIDA gera atestado (o atestado vem depois da nota); rascunho, cancelada e
// substituída não têm serviço fechado para declarar.
function validarNota(nota) {
  if (!nota) return 'Nota fiscal não encontrada.';
  if (nota.situacao !== 'emitida') return 'O atestado só é gerado para nota fiscal emitida.';
  return null;
}

const lista = (v) => (Array.isArray(v) ? v : []);
const tomadorDe = (nota) => (typeof nota.tomador === 'string' ? JSON.parse(nota.tomador || '{}') : nota.tomador) || {};

// Itens da proposta ligada → grupos da planilha (cada seção da proposta vira um grupo)
function planilhaDaProposta(itens) {
  const grupos = [];
  for (const i of lista(itens)) {
    const quantidade = Number(i.quantidade);
    const descricao = limpar(i.descricao, 300);
    if (!descricao || !(quantidade > 0)) continue;
    const nome = limpar(i.secao, 120) || T.GRUPO_PADRAO;
    let g = grupos.find(x => x.grupo === nome);
    if (!g) { g = { grupo: nome, itens: [] }; grupos.push(g); }
    g.itens.push({ descricao, unidade: limpar(i.unidade, 6).toLowerCase() || 'un', quantidade });
  }
  return grupos;
}

// Sugestões que a tela mostra para o engenheiro conferir/ajustar (atividades e planilha em texto)
function sugerir(nota, contexto = {}) {
  const { atividades, pedido } = T.atividadesDaNota(nota.discriminacao);
  const grupos = T.agrupar(atividades);
  const daProposta = planilhaDaProposta(contexto.itens);
  const planilha = daProposta.length ? daProposta : T.planilhaDasAtividades(grupos);
  return {
    atividades: T.atividadesParaTexto(grupos),
    planilha: T.planilhaParaTexto(planilha),
    planilhaGrupos: planilha,
    planilhaOrigem: daProposta.length ? 'proposta' : (planilha.length ? 'nota' : null),
    local: limpar(contexto.proposta?.local_obra || contexto.obra?.local) || '',
    pedido,
    atividadesLista: atividades,
  };
}

const parte = (texto, negrito = false) => ({ texto, negrito });

// `opcoes`: { contrato, local, inicio, fim, vigencia_inicio, vigencia_fim, area, responsaveis[],
//   atividades (texto), planilha (texto), setor, signatarios[], cidade, mostrar_valor }
// `contexto`: { proposta: { numero, total, local_obra }, obra: { nome, local }, itens[], outrasNotas[] }
// outrasNotas: outras notas EMITIDAS do mesmo tomador que fazem parte do mesmo contrato (um atestado só para todas)
// Devolve { titulo, blocos, texto, avisos, sugestao }.
function montarAtestado(nota, opcoes = {}, contexto = {}) {
  const erro = validarNota(nota);
  if (erro) throw Object.assign(new Error(erro), { status: 400 });

  const tomador = tomadorDe(nota);
  const outras = lista(contexto.outrasNotas).filter(o => o && o.id !== nota.id);
  for (const o of outras) {
    const erroOutra = validarNota(o);
    if (erroOutra) throw Object.assign(new Error(`NFS-e nº ${o.numero}: ${erroOutra}`), { status: 400 });
    if (digitos(tomadorDe(o).documento) !== digitos(tomador.documento)) throw Object.assign(new Error(`A NFS-e nº ${o.numero} é de outro tomador: o atestado junta só notas do mesmo cliente.`), { status: 400 });
  }
  // todas as notas do atestado, da mais antiga para a mais nova
  const notas = [nota, ...outras].sort((a, b) => String(a.data_emissao || '').localeCompare(String(b.data_emissao || '')) || Number(a.numero) - Number(b.numero));
  const valorTotal = notas.reduce((t, n) => t + Number(n.valor_servicos || 0), 0);
  const nomeCliente = limpar(tomador.nome) || '[razão social do emitente]';
  const doc = documentoFormatado(tomador.documento);
  const endereco = enderecoDoTomador(tomador);
  const sug = sugerir(outras.length ? { ...nota, discriminacao: notas.map(n => n.discriminacao).filter(Boolean).join('\n') } : nota, contexto);

  // atividades e planilha: o que o engenheiro editou vale; sem edição, o sugerido pela nota/proposta
  const gruposAtiv = typeof opcoes.atividades === 'string' ? T.atividadesDoTexto(opcoes.atividades) : T.agrupar(sug.atividadesLista);
  const gruposPlan = typeof opcoes.planilha === 'string' ? T.planilhaDoTexto(opcoes.planilha) : sug.planilhaGrupos;
  const todas = gruposAtiv.flatMap(g => g.itens);

  // 1ª atividade como natureza do serviço (a descrição da LC 116 do cadastro é longa demais e não entra)
  const natureza = todas[0] ? todas[0].replace(/^(\p{Lu})(?=\p{Ll})/u, c => c.toLowerCase()) : '[natureza resumida dos serviços]';
  const objeto = limpar(todas.join('; '), LIMITE_OBJETO) || '[descrição do objeto]';
  const emissao = dataBR(nota.data_emissao);
  const competencia = dataBR(nota.competencia);
  const inicio = dataBR(opcoes.inicio); const fim = dataBR(opcoes.fim);
  const vigIni = dataBR(opcoes.vigencia_inicio); const vigFim = dataBR(opcoes.vigencia_fim);
  const dias = opcoes.inicio && opcoes.fim ? diasEntre(opcoes.inicio, opcoes.fim) : null;
  const local = limpar(opcoes.local);
  const contrato = limpar(opcoes.contrato) || (sug.pedido ? `Pedido ${limpar(sug.pedido, 80)}` : '');
  const area = limpar(opcoes.area);
  const responsaveis = lista(opcoes.responsaveis).slice(0, LIMITE_RESPONSAVEIS)
    .map(r => ({ nome: limpar(r?.nome), titulo: limpar(r?.titulo, 60), crea: limpar(r?.crea, 40), art: limpar(r?.art, 40) }))
    .filter(r => r.nome);
  const signatarios = lista(opcoes.signatarios).slice(0, LIMITE_SIGNATARIOS)
    .map(s => ({ nome: limpar(s?.nome), cargo: limpar(s?.cargo) })).filter(s => s.nome || s.cargo);
  const proposta = contexto.proposta || null;

  const blocos = [];
  blocos.push({ t: 'titulo', texto: 'ATESTADO DE CAPACIDADE TÉCNICA' });
  blocos.push({
    t: 'paragrafo',
    partes: [
      parte('Atestamos, para fins de comprovação da realização de atividade técnica, que a empresa '),
      parte(HM.razaoSocial, true),
      parte(`, inscrita no CNPJ sob o nº ${HM.cnpj} e com sede na ${HM.sede}, prestou a `),
      parte(nomeCliente, true),
      parte(`${doc ? `, inscrito(a) no ${doc.rotulo} sob o nº ${doc.valor}` : ''}${endereco ? ` e com sede em ${endereco}` : ''}, os serviços de ${natureza} conforme estabelecido abaixo:`),
    ],
  });

  let n = 0;
  const secao = (titulo) => { n += 1; blocos.push({ t: 'secao', texto: `${n}) ${titulo}` }); };

  if (responsaveis.length) {
    secao('RESPONSÁVEL TÉCNICO');
    for (const r of responsaveis) {
      blocos.push({ t: 'item', texto: `Nome: ${[r.nome, r.titulo].filter(Boolean).join(' – ')}${r.crea ? ` – CREA/CAU: ${r.crea}` : ''}` });
      if (r.art) blocos.push({ t: 'item', texto: `ART/RRT: ${r.art}` });
    }
  }

  secao('DADOS DO CONTRATO');
  const dados = [
    outras.length
      ? ['Notas fiscais', notas.map(n => `NFS-e nº ${n.numero}${dataBR(n.data_emissao) ? ` (emitida em ${dataBR(n.data_emissao)})` : ''}`).join('; ')]
      : ['Nota fiscal', `NFS-e nº ${nota.numero}${emissao ? `, emitida em ${emissao}` : ''}${competencia ? `, competência ${competencia.slice(3)}` : ''}`],
    proposta?.numero ? ['Proposta comercial', `nº ${limpar(proposta.numero, 20)}`] : null,
    contrato ? ['Contrato', contrato] : null,
    ['Objeto', objeto],
    ['Contratante', nomeCliente],
    dias ? ['Prazo de execução dos serviços', `${dias} dia${dias > 1 ? 's' : ''}`] : null,
    inicio && fim ? ['Período de execução', `${inicio} a ${fim}`] : (inicio ? ['Início da execução', inicio] : (fim ? ['Conclusão da execução', fim] : null)),
    vigIni && vigFim ? ['Vigência do contrato', `${vigIni} a ${vigFim}`] : null,
    area ? ['Área / quantitativo executado', area] : null,
    local ? ['Endereço', local] : null,
    opcoes.mostrar_valor ? [outras.length ? 'Valor total dos serviços' : 'Valor dos serviços', dinheiro(valorTotal)] : null,
  ].filter(Boolean);
  for (const [rotulo, valor] of dados) blocos.push({ t: 'item', texto: `${rotulo}: ${valor}` });

  secao('DESCRIÇÃO DAS ATIVIDADES');
  blocos.push({ t: 'paragrafo', partes: [parte('O contrato contemplou as seguintes atividades:')], jc: 'left' });
  gruposAtiv.forEach((g, gi) => {
    blocos.push({ t: 'grupo', texto: `${g.grupo}:` });
    g.itens.forEach((a, i) => blocos.push({ t: 'atividade', texto: `${i + 1}. ${a}${gi === gruposAtiv.length - 1 && i === g.itens.length - 1 ? '.' : ';'}` }));
  });
  if (!gruposAtiv.length) blocos.push({ t: 'atividade', texto: '[descrever as atividades executadas]' });

  const planilhaComQuantidade = gruposPlan.map(g => ({ ...g, itens: g.itens.filter(i => i.quantidade != null) })).filter(g => g.itens.length);
  if (planilhaComQuantidade.length) {
    secao('PLANILHA DE SERVIÇOS');
    blocos.push({ t: 'paragrafo', partes: [parte('O contrato contemplou os seguintes itens e serviços:')], jc: 'left' });
    const linhas = [];
    for (const g of planilhaComQuantidade) {
      linhas.push({ grupo: g.grupo.toUpperCase() });
      for (const i of g.itens) linhas.push({ celulas: [i.descricao, `${i.unidade} ${T.numeroBR(i.quantidade)}`] });
    }
    blocos.push({ t: 'tabela', larguras: [7106, 2400], cabecalho: ['DESCRIÇÃO DO SERVIÇO', 'QUANTIDADE'], alinhamentos: ['left', 'center'], linhas });
  }

  secao('COMPROVAÇÃO DOCUMENTAL');
  blocos.push({ t: 'paragrafo', partes: [parte('Em reforço à veracidade do presente atestado, relacionamos a documentação comprobatória correspondente à execução do objeto contratado:')] });
  const observacaoDe = (n) => [dataBR(n.competencia) ? `Competência ${dataBR(n.competencia).slice(3)}` : null, proposta?.numero ? `Proposta ${limpar(proposta.numero, 20)}` : null,
    opcoes.mostrar_valor ? dinheiro(n.valor_servicos) : null].filter(Boolean).join(' · ');
  blocos.push({
    t: 'tabela', larguras: [1700, 2300, 3200, 2306], cabecalho: ['Nº DA NOTA FISCAL', 'DATA DE EMISSÃO', 'TOMADOR / CNPJ', 'OBSERVAÇÃO'], alinhamentos: ['center', 'center', 'left', 'left'],
    linhas: notas.map(n => ({ celulas: [`NFS-e ${n.numero}`, dataBR(n.data_emissao) || '—', `${nomeCliente}${doc ? ` / ${doc.valor}` : ''}`, observacaoDe(n) || '—'] })),
  });
  const temArt = responsaveis.some(r => r.art);
  blocos.push({ t: 'paragrafo', partes: [parte('Documentos disponíveis para conferência (assinalar):')], jc: 'left', antes: 160 });
  blocos.push({
    t: 'checks',
    linhas: [
      [['Cópia do contrato e aditivos', false], ['ART/RRT dos responsáveis técnicos', temArt]],
      [['Termo de recebimento provisório/definitivo', false], ['Notas fiscais relacionadas acima', true]],
      [['Medições / boletins de medição', false], ['Outro: ______________________________', false]],
    ],
  });

  blocos.push({
    t: 'fecho',
    texto: `Por fim, atestamos ainda que os serviços desenvolvidos pela ${HM.razaoSocial} atenderam aos prazos e condições contratuais, não constando em nossos registros fatos que desabonem a conduta da empresa.`,
  });
  blocos.push({ t: 'data', texto: `${limpar(opcoes.cidade) || limpar(tomador.municipio) || '______________'}, ____ de ______________ de ______` });
  blocos.push({
    t: 'assinaturas',
    emitente: nomeCliente,
    setor: limpar(opcoes.setor) || '[Setor / gerência responsável]',
    signatarios: signatarios.length ? signatarios : [{ nome: '[Nome do signatário]', cargo: '[Cargo / função]' }, { nome: '[Nome do signatário]', cargo: '[Cargo / função]' }],
  });

  const avisos = ['Texto proposto pela H&M: quem atesta é o cliente, que confere, ajusta e assina no papel timbrado dele.'];
  if (!responsaveis.length) avisos.push('Sem responsável técnico/CREA/ART: a parte 1 do modelo foi omitida. Informe se o cliente exigir.');
  if (!planilhaComQuantidade.length) avisos.push('Sem planilha de serviços: a nota não traz quantidades escritas e não há proposta com itens ligada. Ligue a proposta ou digite os itens.');
  if (!contrato) avisos.push('Contrato/instrumento não informado.');
  if (!inicio && !fim) avisos.push('Período de execução não informado.');
  if (opcoes.inicio && opcoes.fim && dias === null) avisos.push('A conclusão está antes do início: confira as datas do período.');
  if (!local) avisos.push('Endereço da obra/serviço não informado.');
  if (!gruposAtiv.length) avisos.push('A nota não tem texto de serviço utilizável: descreva as atividades.');
  if (proposta?.total != null && Number(proposta.total) > 0 && valorTotal > 0
    && Math.abs(valorTotal - Number(proposta.total)) / Number(proposta.total) > 0.01 && sug.planilhaOrigem === 'proposta') {
    avisos.push(`${outras.length ? 'As notas somam' : 'A nota'} (${dinheiro(valorTotal)}) ${outras.length ? 'diferem' : 'difere'} da proposta (${dinheiro(proposta.total)}): confira se todos os itens da planilha foram faturados ${outras.length ? 'nestas notas' : 'nesta nota'} e apague os que não foram.`);
  }
  if (outras.length) avisos.push(`Atestado único das NFS-e ${notas.map(n => n.numero).join(', ')}: as atividades de todas as notas foram reunidas; confira se não há repetição.`);
  if (todas.join('; ').length >= LIMITE_OBJETO) avisos.push('O objeto foi cortado no limite de tamanho; confira o texto.');

  return { titulo: 'Atestado de capacidade técnica', blocos, texto: blocosParaTexto(blocos), avisos, sugestao: { atividades: sug.atividades, planilha: sug.planilha, planilhaOrigem: sug.planilhaOrigem, local: sug.local } };
}

// ── Texto simples (prévia e "copiar texto") ──────────────────────────────────
function blocosParaTexto(blocos) {
  const out = [];
  for (const b of blocos) {
    switch (b.t) {
      case 'titulo': out.push(b.texto, ''); break;
      case 'paragrafo': out.push(b.partes.map(p => p.texto).join(''), ''); break;
      case 'secao': out.push('', b.texto); break;
      case 'item': out.push(`- ${b.texto}`); break;
      case 'grupo': out.push('', b.texto); break;
      case 'atividade': out.push(`    ${b.texto}`); break;
      case 'tabela':
        out.push('', b.cabecalho.join(' | '));
        for (const l of b.linhas) out.push(l.grupo ? `[${l.grupo}]` : l.celulas.join(' | '));
        break;
      case 'checks':
        for (const l of b.linhas) out.push(l.map(([t, marcado]) => `${marcado ? '☒' : '☐'} ${t}`).join('     '));
        break;
      case 'fecho': out.push('', b.texto, ''); break;
      case 'data': out.push(b.texto, ''); break;
      case 'assinaturas':
        out.push(b.emitente, b.setor, '');
        for (const s of b.signatarios) out.push('______________________________', s.nome, s.cargo, '');
        break;
      default: break;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── .docx no padrão do modelo: Arial 10, A4, tabelas com borda cinza ───────────
const FONTE = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>';
const run = (texto, { b = false, u = false } = {}) =>
  `<w:r><w:rPr>${FONTE}${b ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="20"/><w:szCs w:val="20"/>${u ? '<w:u w:val="single"/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(texto)}</w:t></w:r>`;
const par = (runs, { jc, antes = 0, depois = 0, esq, suspenso, manter = false } = {}) =>
  `<w:p><w:pPr>${manter ? '<w:keepNext/>' : ''}<w:spacing w:before="${antes}" w:after="${depois}"/>${esq != null ? `<w:ind w:left="${esq}"${suspenso ? ` w:hanging="${suspenso}"` : ''}/>` : ''}${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>${runs}</w:p>`;

const BORDA_CEL = ['top', 'left', 'bottom', 'right'].map(l => `<w:${l} w:val="single" w:color="808080" w:sz="4"/>`).join('');
const celula = (largura, conteudo, { fundo, span, vAlign = 'center' } = {}) =>
  `<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${largura}"/>${span ? `<w:gridSpan w:val="${span}"/>` : ''}<w:tcBorders>${BORDA_CEL}</w:tcBorders>${fundo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fundo}"/>` : ''}<w:tcMar><w:top w:type="dxa" w:w="50"/><w:left w:type="dxa" w:w="100"/><w:bottom w:type="dxa" w:w="50"/><w:right w:type="dxa" w:w="100"/></w:tcMar><w:vAlign w:val="${vAlign}"/></w:tcPr>${conteudo}</w:tc>`;
const tabela = (larguras, linhasXml) =>
  `<w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="${larguras.reduce((a, b) => a + b, 0)}"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${larguras.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${linhasXml}</w:tbl>`;

function blocoParaXml(b) {
  switch (b.t) {
    case 'titulo': return par(run(b.texto, { b: true }), { jc: 'center', depois: 360 });
    case 'paragrafo': return par(b.partes.map(p => run(p.texto, { b: p.negrito })).join(''), { jc: b.jc || 'both', antes: b.antes || 0, depois: 120 });
    case 'secao': return par(run(b.texto, { b: true, u: true }), { antes: 280, depois: 160, manter: true });
    case 'item': return par(run(`- ${b.texto}`), { depois: 60, esq: 170, suspenso: 170 });
    case 'grupo': return par(run(b.texto, { u: true }), { antes: 120, depois: 20, manter: true });
    case 'atividade': return par(run(b.texto), { depois: 20, esq: 1060 });
    case 'tabela': {
      const cab = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.cabecalho.map((t, i) => celula(b.larguras[i], par(run(t, { b: true }), { jc: 'center' }), { fundo: 'D9D9D9' })).join('')}</w:tr>`;
      const total = b.larguras.reduce((a, c) => a + c, 0);
      const corpo = b.linhas.map(l => (l.grupo
        ? `<w:tr><w:trPr><w:cantSplit/></w:trPr>${celula(total, par(run(l.grupo, { b: true }), { jc: 'left' }), { fundo: 'EDEDED', span: b.larguras.length })}</w:tr>`
        : `<w:tr><w:trPr><w:cantSplit/></w:trPr>${l.celulas.map((t, i) => celula(b.larguras[i], par(run(t), { jc: b.alinhamentos[i] || 'left' }))).join('')}</w:tr>`)).join('');
      return tabela(b.larguras, cab + corpo) + par('', { depois: 60 });
    }
    case 'checks': return b.linhas.map(l => par(l.map(([t, marcado]) => run(`${marcado ? '☒' : '☐'} ${t}`)).join(run('          ')), { depois: 60 })).join('');
    case 'fecho': return par(run(b.texto, { b: true }), { jc: 'both', antes: 280, depois: 280 });
    case 'data': return par(run(b.texto), { jc: 'right', depois: 480 });
    case 'assinaturas': {
      const topo = par(run(b.emitente, { b: true }), { jc: 'center' }) + par(run(b.setor, { b: true }), { jc: 'center', depois: 360 });
      const colunas = 2;
      const larg = [4753, 4753];
      const linhas = [];
      for (let i = 0; i < b.signatarios.length; i += colunas) {
        const cels = [];
        for (let c = 0; c < colunas; c++) {
          const s = b.signatarios[i + c];
          const conteudo = s
            ? par(run('______________________________'), { jc: 'center', antes: 360 }) + par(run(s.nome, { b: true }), { jc: 'center' }) + par(run(s.cargo), { jc: 'center', depois: 120 })
            : par('');
          cels.push(`<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="${larg[c]}"/></w:tcPr>${conteudo}</w:tc>`);
        }
        linhas.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cels.join('')}</w:tr>`);
      }
      return topo + tabela(larg, linhas) + par('');
    }
    default: return '';
  }
}

// .docx de 5 arquivos (zip): abre no Word, LibreOffice e Google Docs. Sem imagem, cabeçalho nem rodapé.
async function gerarDocx(blocos) {
  const documento = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + blocos.map(blocoParaXml).join('')
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1300" w:right="1200" w:bottom="1300" w:left="1200" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    + '</w:body></w:document>';
  const estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>'
    + `${FONTE}<w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>');
  zip.file('word/document.xml', documento);
  zip.file('word/styles.xml', estilos);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { montarAtestado, gerarDocx, validarNota, sugerir, planilhaDaProposta, LIMITE_RESPONSAVEIS, LIMITE_SIGNATARIOS };
