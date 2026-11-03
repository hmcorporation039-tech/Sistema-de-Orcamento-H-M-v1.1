// Análise de Projeto completa (orquestração): lê cada arquivo enviado — texto
// do PDF, PDF vetorial e DWG/DXF (numa thread à parte) —, extrai os
// equipamentos pela IA, carrega o catálogo e os preços de referência do banco,
// faz a compatibilização por posição entre os desenhos e junta tudo no
// resultado que a tela, o relatório e o orçamento usam. As regras puras ficam
// em utils/analiseProjetoItens.js (serviços e materiais) e
// utils/analiseProjetoAchados.js (achados).
const pool = require('../config/database');
const { analisarProjeto, extrairAmbientes, comRepeticoesPorPosicao } = require('../utils/projetoParser');
const { extrairEquipamentos } = require('./equipamentoExtratorIA');
const { calcularPontosPorAmbiente } = require('../utils/pontosPorAmbiente');
const { buscarReferencias, valorSugerido, segmentoPorNomeDoCliente } = require('./precosMaoDeObraReferencia');
const { lerPdfVetorial } = require('../utils/pdfVetorial');
const { ehArquivoCad, lerArquivoCad } = require('./analiseCad');
const aprenderDoDesenho = require('./aprenderDoDesenho');
const aprendizadoMateriais = require('./aprendizadoMateriais');
const { compatibilizar } = require('../utils/compatibilidadeEspacial');
const {
  totaisCodificados, contagemDoDesenho, montarServicosPadrao, montarMateriaisInstalacaoPadrao, semModeloCoberto,
  montarMateriais, montarPontosPorAmbiente, montarMateriaisQuantitativos, montarMateriaisDaLista, montarMateriaisDoDesenho,
  semDuplicarFontes, doGrupo, temDisciplina,
} = require('../utils/analiseProjetoItens');
const { detalhePorArquivo, gerarAchados, achadosDoDesenho, achadosDasFolhas } = require('../utils/analiseProjetoAchados');

// Roda `fn` sobre a lista com no máximo `n` ao mesmo tempo, na ordem: um pacote
// de 30 arquivos não abre 30 conversões de DWG nem 30 chamadas de IA de uma vez
async function emLotes(lista, n, fn) {
  const out = new Array(lista.length);
  let prox = 0;
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => {
    while (prox < lista.length) { const i = prox++; out[i] = await fn(lista[i], i); }
  }));
  return out;
}

// Tenta achar o nome do cliente no bloco de título do desenho (padrão
// "CLIENTE: NOME DO CLIENTE" usado nesses projetos de engenharia).
// Só na MESMA linha: com `\s*` o valor atravessava a quebra e pegava o que
// vinha embaixo — "APROVAÇÃO DO AUTOR E DO CLIENTE:\n00" deu cliente "00", e
// "CLIENTE:\nENDEREÇO:" deu "ENDEREÇO:" (revisão de 29/10/2026). Valor só
// numérico ou que é outro rótulo ("…:") não é nome de cliente: tenta a próxima.
const clienteValido = (v) => {
  const s = String(v || '').trim();
  return s && !/:$/.test(s) && !/^[\d\s.,/\-–]+$/.test(s) ? s : null;
};
function extrairCliente(texto) {
  for (const m of String(texto || '').matchAll(/CLIENTE:[ \t]*([^\t\n]+)/gi)) {
    if (clienteValido(m[1])) return clienteValido(m[1]);
  }
  return null;
}

// Extrai os equipamentos de cada arquivo (leitor local dos itens "REF.:" primeiro; a IA só quando a leitura local
// fica fraca — services/equipamentoExtratorIA.extrairEquipamentos) e junta tudo numa lista só, sem duplicar itens
// que aparecem repetidos entre arquivos (mesma descrição + mesma referência). Um arquivo não espera o outro.
async function extrairEquipamentosDosArquivos(analises, achados) {
  const resultados = await emLotes(analises, 2, a => extrairEquipamentos(a.textoBruto).then(r => ({ arquivo: a.arquivo, ...r })));

  const vistos = new Set();
  const equipamentos = [];
  for (const { arquivo, itens, aviso } of resultados) {
    if (aviso) {
      achados.push({ tema: 'Extração de equipamentos', observacao: `"${arquivo}": ${aviso}` });
    }
    for (const it of itens) {
      const chave = it.descricao.toUpperCase() + '|' + (it.referencia_fabricante || '');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      equipamentos.push(it);
    }
  }

  return equipamentos;
}

// catálogo com os vínculos aprendidos nos orçamentos confirmados (services/aprendizadoMateriais.js;
// ORDER BY fixo lá: o desempate da semelhança é "o primeiro com o maior score")
const carregarCatalogo = () => aprendizadoMateriais.carregarCatalogo();

// `arquivos`: [{ buffer, nomeArquivo, disciplinas }] — cada arquivo carrega
// SUAS PRÓPRIAS disciplinas (não uma lista única pro lote inteiro). Isso evita
// que um arquivo de uma disciplina contamine a contagem de outra (ex.: um
// arquivo de iluminação, mesmo enviado junto, nunca soma na contagem de
// antena/rede — só arquivos marcados como 'antena'/'rede' entram nessa conta).
// arquivos com `referencia: true` (arquitetura, estrutura, hidráulica,
// climatização do pacote — 2.3): não são orçados; o DWG/DXF deles entra só na
// compatibilização por posição e como base do 3D. PDF de referência não é lido.
// folhas do PDF lidas pelo desenho (símbolos e metragens); as demais viram achado.
// A leitura tem tempo-limite por página e por arquivo, numa thread à parte
// (utils/pdfVetorial.js) — o teto de folhas pode ser maior que os 6 de antes.
const MAX_PAGINAS_DESENHO = 15;
// escala do PDF (fase 3, CAD-09): a informada no envio do arquivo vale mais; sem ela, o leitor tenta o carimbo, o
// nome do arquivo, as portas e as cotas (utils/escalaDaPlanta.js) e diz de onde veio
const escalaDoArquivo = (a) => {
  const e = Number(a?.escala);
  return { nomeArquivo: a?.nomeArquivo || '', ...(e >= 1 && e <= 5000 ? { escala: Math.round(e) } : {}) };
};

// opcoes.mapasConfirmados: { [nome do arquivo]: [tipos conferidos no mapa do CAD] } (services/mapaCad.js)
async function analisarProjetoCompleto(todosArquivos, opcoes = {}) {
  const arquivosRef = todosArquivos.filter(a => a.referencia);
  const arquivos = todosArquivos.filter(a => !a.referencia);
  if (!arquivos.length) throw new Error('Marque a disciplina de ao menos um arquivo: só arquivos de referência não geram análise.');
  // o que o sistema já aprendeu (legendas, notas de altura e nomes de bloco de outros projetos) entra na leitura, e a
  // legenda deste arquivo vira aprendizado para os próximos (services/aprenderDoDesenho.js)
  const temCad = todosArquivos.some(a => ehArquivoCad(a.nomeArquivo));
  const sabido = temCad ? await aprenderDoDesenho.conhecimento() : {};
  const lerCad = ({ buffer, nomeArquivo, disciplinas }) => lerArquivoCad(buffer, nomeArquivo, { ...sabido, disciplinas: disciplinas || [], confirmados: opcoes.mapasConfirmados?.[nomeArquivo] || [] })
    .then((r) => {
      // (a releitura com o mapa confirmado não ensina de novo o que o primeiro envio já ensinou). Arquivo com UMA
      // disciplina marcada ensina por ela: a linha de legenda/bloco que não diz a sua fica com a do arquivo.
      if (!opcoes.mapasConfirmados) aprenderDoDesenho.registrarLeitura(r, nomeArquivo, { disciplina: disciplinas?.length === 1 ? disciplinas[0] : null }).catch(() => {});
      return r;
    })
    .catch((e) => { throw Object.assign(new Error(`Não consegui ler "${nomeArquivo}": ${e.message}`), { leituraCad: true }); });
  const cadsRef = await emLotes(arquivosRef, 2, (a) => (ehArquivoCad(a.nomeArquivo) ? lerCad(a).catch((e) => ({ erro: e.message })) : null));
  // Cada arquivo é lido/analisado em paralelo (pdf-parse + regex é I/O-bound e
  // independente por arquivo) — antes rodava um de cada vez (sequencial), o
  // que somava o tempo de N arquivos à toa.
  // DWG/DXF (2.3): lido numa thread à parte (services/analiseCad/index.js) e devolvido no
  // mesmo formato; o resto do fluxo não distingue a origem
  const cads = await emLotes(arquivos, 2, (a) => (ehArquivoCad(a.nomeArquivo) ? lerCad(a) : null));
  const analisesBrutas = await emLotes(arquivos, 3, ({ buffer, nomeArquivo }, i) => (cads[i] ? cads[i].analise : analisarProjeto(buffer, nomeArquivo)));
  const analises = analisesBrutas.map((a, i) => ({ ...a, disciplinas: arquivos[i].disciplinas }));

  // geometria do desenho (símbolos/linhas pela legenda), com a classificação de
  // cada folha (planta × unifilar × quadro de cargas — utils/classificarPranchaPdf.js);
  // falha não derruba a análise
  const vetoriais = await emLotes(analises, 3, (a, i) => (cads[i] ? [cads[i].pagina] : a.semTexto ? [] : lerPdfVetorial(arquivos[i].buffer, { maxPaginas: MAX_PAGINAS_DESENHO, ...escalaDoArquivo(arquivos[i]) }).catch((e) => {
    console.warn(`[analise] leitura vetorial de "${a.arquivo}" falhou:`, e.message);
    return [{ pagina: null, itens: [], legenda: null, escala: null, aviso: `leitura do desenho falhou (${e.message}) — conferir na planta` }];
  })));
  // folhas que não são planta (só unifilar, quadro de cargas, tabela): fora dos
  // ambientes e dos pontos por ambiente. Os ambientes saem só das outras folhas
  // ("A= 12,5m²" de um quadro de áreas na folha do quadro não é sala desenhada).
  const naoPlanta = vetoriais.map(v => new Set((v || []).filter(p => p.folha?.semPlanta && p.pagina).map(p => p.pagina)));
  analises.forEach((a, i) => {
    if (!naoPlanta[i].size || !a.textoPorPagina?.length) return;
    const textoDaPlanta = a.textoPorPagina.filter((_, k) => !naoPlanta[i].has(k + 1)).join('\n');
    a.ambientes = extrairAmbientes(textoDaPlanta);
  });

  // Distribuição de pontos por ambiente: aproximada (ver pontosPorAmbiente.js)
  // e por isso isolada num Promise.all com catch por arquivo — uma falha aqui
  // nunca deve derrubar a análise inteira, já que o resto dela (totais,
  // serviços, materiais) não depende disso.
  // folha MISTA (planta + quadro de cargas ou unifilar na mesma página): as regiões
  // da folha vão junto, e o que cai fora da planta não conta (antes valia a página toda)
  const regioesMistas = vetoriais.map(v => new Map((v || [])
    .filter(p => p.pagina && p.folha && !p.folha.semPlanta && (p.folha.regioes || []).some(r => !['planta', 'desconhecido'].includes(r.tipo)))
    .map(p => [p.pagina, p.folha.regioes])));
  // escala de cada folha lida pelo desenho (pdfVetorial): o "longe" das repetições é em metros
  const escalaPorPagina = vetoriais.map(v => new Map((v || []).filter(p => p.pagina && p.escala).map(p => [p.pagina, p.escala])));
  const pontosPorAmbienteBrutos = await emLotes(arquivos, 3, ({ buffer }, i) => (cads[i] ? cads[i].pontosPorAmbiente : calcularPontosPorAmbiente(buffer, { paginasIgnoradas: naoPlanta[i], regioesPorPagina: regioesMistas[i], escalaPorPagina: escalaPorPagina[i] }).catch(() => [])));
  // código repetido LONGE (posição no PDF) são dois pontos: CAM18 em dois cantos
  // da planta, R1…R10 no térreo e R1…R8 no superior (utils/projetoParser.js)
  analises.forEach((a, i) => {
    const c = cads[i] ? null : pontosPorAmbienteBrutos[i]?.codigos;
    a.cameras = comRepeticoesPorPosicao(a.cameras, c?.cftv);
    a.pontosRedeAntena = { ...a.pontosRedeAntena, rede: comRepeticoesPorPosicao(a.pontosRedeAntena?.rede, c?.rede), antena: comRepeticoesPorPosicao(a.pontosRedeAntena?.antena, c?.antena) };
  });

  // Disciplina "efetiva" da análise inteira = união das tags de todos os
  // arquivos — decide quais itens-modelo de serviço/material aparecem.
  const disciplinasEfetivas = [...new Set(analises.flatMap(a => a.disciplinas))];

  // o carimbo (utils/leitoresTabelaProjeto.js) passa pelo mesmo filtro: "ENDEREÇO:" não é cliente
  const cliente = analises.map(a => extrairCliente(a.textoBruto) || clienteValido(a.carimbo?.cliente)).find(Boolean) || null;

  // Preços de referência de mão de obra (sugestão — ver
  // services/precosMaoDeObraReferencia.js): o adotado pela H&M ou a referência de
  // mercado do segmento do cliente (órgão público → oficial; demais →
  // particular), mais as duas referências para a tela mostrar. Se a tabela
  // falhar, a análise continua, só sem a sugestão de preço.
  const segmento = await segmentoPorNomeDoCliente(cliente).catch(() => 'privado');
  const referencias = await buscarReferencias().catch(() => ({}));
  const precosReferencia = Object.fromEntries(Object.entries(referencias).map(([c, r]) => [c, valorSugerido(r, segmento)]).filter(([, v]) => v != null));

  // Ambientes e tabela de cabos: dados de contexto geral do projeto (a mesma
  // planta de fundo se repete em todo desenho, e o padrão de tabela de cabos
  // é específico o bastante pra não ter risco real de contaminação) — sem
  // filtro por disciplina, ao contrário de câmera/rede/antena.
  const ambientes = analises.reduce((maior, a) => a.ambientes.length > maior.length ? a.ambientes : maior, []);
  const tabelaCabos = analises.find(a => a.tabelaCabos.length > 0)?.tabelaCabos || [];

  const { cameras: totalCameras, rede: totalRede, antena: totalAntena } = totaisCodificados(analises);

  const achados = gerarAchados(analises);
  achados.push(...achadosDoDesenho(analises, vetoriais, { maxPaginas: MAX_PAGINAS_DESENHO }));
  achados.push(...achadosDasFolhas(analises, vetoriais));

  // compatibilização por posição entre os DWG/DXF (de projeto e de referência)
  const paraCompat = [
    ...arquivos.map((a, i) => cads[i] && { arquivo: a.nomeArquivo, disciplinas: a.disciplinas, referencia: false, espacial: cads[i].espacial }),
    ...arquivosRef.map((a, i) => cadsRef[i]?.espacial && { arquivo: a.nomeArquivo, disciplinas: [], referencia: true, tipoReferencia: a.tipoReferencia || null, espacial: cadsRef[i].espacial }),
  ].filter(Boolean);
  const compat = compatibilizar(paraCompat, { temPdf: cads.some(c => !c) && paraCompat.length > 0 });
  achados.push(...compat.achados);
  for (const [i, a] of arquivosRef.entries()) {
    if (cadsRef[i]?.erro) achados.push({ tema: 'Arquivo de referência não lido', observacao: `"${a.nomeArquivo}": ${cadsRef[i].erro}` });
    else if (!ehArquivoCad(a.nomeArquivo)) achados.push({ tema: 'Arquivo de referência', observacao: `"${a.nomeArquivo}" (PDF) ficou só como referência — não entra na contagem nem na verificação de posição.` });
  }

  // Cada disciplina selecionada que não tem extração automática de
  // quantidade entra num único aviso — os símbolos de elétrica/iluminação/
  // telefonia/automação/alarme são gráficos, sem código de texto individual
  // (confirmado lendo um projeto real); rede/antena só entram aqui se não
  // foram encontrados em nenhum arquivo marcado com essa disciplina (quando
  // encontrados, já vêm preenchidos automaticamente).
  // rede e cabeamento são o mesmo grupo (utils/analiseProjetoItens.js)
  const temLista = (d) => analises.some(a => temDisciplina(a.disciplinas, d) && a.listaMateriais?.length);
  // DWG/DXF: bloco da disciplina contado no desenho também resolve a quantidade
  // DWG/DXF e PDF vetorial (item não ambíguo) alimentam a mão de obra e os materiais de terminação
  const contagemCad = contagemDoDesenho(analises, vetoriais, { gruposCompat: compat.grupos });
  // o que o desenho (DWG/DXF ou PDF) contou para a disciplina também resolve a quantidade
  const contouNoDesenhoDa = (d) => Object.values(contagemCad).some(c => c.quantidade > 0 && doGrupo(d).includes(c.disciplina));
  const contouNoCad = (d) => contouNoDesenhoDa(d) || vetoriais.some((v, i) => temDisciplina(analises[i].disciplinas, d) && v.some(p => p.origem === 'cad' && p.itens.some(it => it.tipo === 'simbolo' && doGrupo(d).includes(it.disciplina))));
  const faltando = [];
  if (temDisciplina(disciplinasEfetivas, 'rede') && totalRede === 0 && !contouNoCad('rede')) faltando.push('pontos de rede');
  if (disciplinasEfetivas.includes('antena') && totalAntena === 0) faltando.push('pontos de TV/antena');
  if (disciplinasEfetivas.includes('alarme') && !temLista('alarme') && !contouNoCad('alarme')) faltando.push('quantidades de alarme (sensores, sirene, teclado)');
  if (disciplinasEfetivas.includes('eletrica') && !temLista('eletrica') && !contouNoCad('eletrica')) faltando.push('quantidades de elétrica (tomadas, interruptores, cabos)');
  if (disciplinasEfetivas.includes('telefonia') && !temLista('telefonia') && !contouNoCad('telefonia')) faltando.push('quantidades de telefonia');
  if (disciplinasEfetivas.includes('iluminacao') && !temLista('iluminacao') && !contouNoCad('iluminacao')) faltando.push('quantidades de iluminação (luminárias, pontos)');
  if (disciplinasEfetivas.includes('automacao') && !temLista('automacao') && !contouNoCad('automacao')) faltando.push('quantidades de automação');
  if (faltando.length > 0) {
    const contouNoDesenho = vetoriais.some(v => v.some(p => p.itens.some(it => !it.ambiguo)));
    achados.push({
      tema: 'Quantidades a confirmar manualmente',
      observacao: `${faltando.join(', ')} não têm código de texto individual no(s) arquivo(s) analisado(s) — são símbolos gráficos no desenho (diferente de câmera/rede/antena, que usam código por ponto), não dá pra contar pelo texto do PDF sem arriscar inventar número. Os itens de "Serviços"/"Materiais" que dependem disso vieram com quantidade 0 — confirme direto na planta (ou no memorial/quadro de cargas, se houver) antes de gerar o relatório final.`
        + (contouNoDesenho ? ' Os símbolos que a legenda identifica foram contados pela geometria do desenho — veja "Contagem pelo desenho (PDF vetorial)" e os materiais marcados "Contado no desenho".' : ''),
    });
  }

  // Extração de equipamentos via IA: só vale a pena chamar o Gemini se o
  // texto tiver algum trecho "REF.:" (padrão de legenda de equipamento
  // nesses projetos) — evita uma chamada inteira (alguns segundos) quando
  // não há nada pra achar, independente da disciplina selecionada.
  // A IA também é chamada quando há cabeçalho de lista de materiais que os
  // leitores de texto não conseguiram ler (antes, só com "REF.:" — a lista de
  // 18 itens de um projeto de BMS nem chegava a ela). Arquivo cuja lista já foi
  // lida pelo texto não vai para a IA (evita item em dobro).
  const precisaIA = (a) => !a.listaMateriais?.length
    && (/REF\.?:/i.test(a.textoBruto) || /LISTA DE MATERIA|\bQTD\.?\s|\bQUANT\.?\s/i.test(a.textoBruto));
  const paraIA = analises.filter(precisaIA);
  const equipamentos = paraIA.length ? await extrairEquipamentosDosArquivos(paraIA, achados) : [];
  const catalogo = await carregarCatalogo();
  const materiaisEquipamentos = montarMateriais(equipamentos, catalogo);
  const materiaisQuantitativos = montarMateriaisQuantitativos(analises);
  const materiaisDoDesenho = montarMateriaisDoDesenho(analises, vetoriais, catalogo);
  // DWG/DXF e PDF vetorial (item não ambíguo) alimentam a mão de obra e os materiais de terminação
  const comoLista = (lista) => lista.map(m => ({ ...m, _fonte: 'lista' })); // tabela do PDF / equipamentos lidos do texto
  const materiais = semDuplicarFontes([
    ...semModeloCoberto(montarMateriaisInstalacaoPadrao(analises, disciplinasEfetivas, contagemCad), materiaisDoDesenho),
    ...montarMateriaisDaLista(analises, catalogo, achados),
    ...comoLista(materiaisQuantitativos),
    ...comoLista(materiaisEquipamentos),
    ...materiaisDoDesenho,
  ], achados, { gruposCompat: compat.grupos });
  const dadosExtraidos = analises.map((a, i) => ({
    arquivo: a.arquivo,
    disciplinas: a.disciplinas,
    semTexto: a.semTexto,
    carimbo: a.carimbo,
    disciplinasDetectadas: a.disciplinasDetectadas,
    quadroCargas: a.quadroCargas,
    quadrosDeCargas: a.quadrosDeCargas || [],
    quadroCargasNaoLido: !!a.quadroCargasNaoLido,
    quantidadesAmbiguas: a.quantidadesAmbiguas || [],
    totaisQuadro: a.totaisQuadro,
    listaMateriais: a.listaMateriais,
    esquadrias: a.esquadrias,
    desenho: (vetoriais[i] || []).map(p => ({ pagina: p.pagina, escala: p.escala, ...(p.origemEscala ? { origem_escala: p.origemEscala } : {}), ...(p.origem ? { origem: p.origem, nao_identificados: p.naoIdentificados } : {}), itens: (p.itens || []).map(({ posicoes, ...it }) => it), ...(p.aviso ? { aviso: p.aviso } : {}), ...(p.folha ? { folha: p.folha.resumo, tipo_folha: p.folha.tipo } : {}), ...(p.ignorada ? { ignorada: p.ignorada } : {}), ...(p.pulada ? { pulada: p.pulada } : {}), ...(p.naoContados?.length ? { nao_contados: p.naoContados } : {}), ...(p.avisoEscala ? { aviso_escala: p.avisoEscala } : {}), ...(p.conferenciaLegenda?.length ? { conferencia_legenda: p.conferenciaLegenda } : {}), ...(p.xrefsDeOutraDisciplina?.length ? { xrefs_outra_disciplina: p.xrefsDeOutraDisciplina } : {}), ...(p.rotas?.length ? { rotas: p.rotas.map(({ layer, tipo, disciplina, rota_m }) => ({ layer, tipo, disciplina, rota_m })) } : {}) })),
    ...(analises[i].origemCad ? { cad: analises[i].origemCad } : {}),
    // mapa do CAD (tela de confirmação do engenheiro): layers, tipos, quantidades e de onde veio cada tipo
    ...(cads[i]?.mapa ? { mapa_cad: cads[i].mapa } : {}),
  }));

  return {
    cliente,
    segmentoPreco: segmento, // órgão público → referência oficial; demais → mercado particular
    disciplinas: disciplinasEfetivas,
    // (a escala informada no envio vai junto: o reprocessamento do mapa do CAD relê o PDF com ela)
    arquivosAnalisados: analises.map((a, i) => ({ arquivo: a.arquivo, disciplinas: a.disciplinas, ...(escalaDoArquivo(arquivos[i]).escala ? { escala: escalaDoArquivo(arquivos[i]).escala } : {}) })),
    ambientes,
    pontosPorAmbiente: montarPontosPorAmbiente(arquivos, analises, pontosPorAmbienteBrutos),
    cameras: {
      total: totalCameras,
      detalhePorArquivo: detalhePorArquivo(analises, 'cftv', a => a.cameras),
    },
    pontosRedeAntena: {
      rede: { total: totalRede, detalhePorArquivo: detalhePorArquivo(analises, 'rede', a => a.pontosRedeAntena.rede) },
      antena: { total: totalAntena, detalhePorArquivo: detalhePorArquivo(analises, 'antena', a => a.pontosRedeAntena.antena) },
    },
    tabelaCabos,
    achados,
    servicos: montarServicosPadrao(analises, disciplinasEfetivas, precosReferencia, referencias, contagemCad),
    materiais,
    dadosExtraidos,
    // arquitetura do primeiro DWG/DXF com ambientes: guardada na análise (base do 3D)
    // de preferência o desenho de referência da compatibilização (as marcações caem nele).
    // Só desenho com planta (o DWG do unifilar/quadro não é base do 3D — 29/10/2026)
    arquiteturaCad: [...cadsRef, ...cads].find(c => c?.arquitetura?.planta && c.arquitetura.nome_arquivo === compat.referencia)?.arquitetura
      || [...cadsRef, ...cads].find(c => c?.arquitetura?.planta)?.arquitetura || null,
    conflitos: compat.conflitos,
    espacial: compat.espacial || null,
    compatibilizacao: { referencia: compat.referencia, grupos: compat.grupos },
  };
}

module.exports = { analisarProjetoCompleto, extrairCliente };
