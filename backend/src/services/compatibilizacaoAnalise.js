// Análise de Projeto completa (orquestração): lê cada arquivo enviado — texto
// do PDF, PDF vetorial e DWG/DXF (numa thread à parte) —, extrai os
// equipamentos pela IA, carrega o catálogo e os preços de referência do banco,
// faz a compatibilização por posição entre os desenhos e junta tudo no
// resultado que a tela, o relatório e o orçamento usam. As regras puras ficam
// em utils/analiseProjetoItens.js (serviços e materiais) e
// utils/analiseProjetoAchados.js (achados).
const pool = require('../config/database');
const { analisarProjeto } = require('../utils/projetoParser');
const { extrairEquipamentosComIA } = require('./equipamentoExtratorIA');
const { calcularPontosPorAmbiente } = require('../utils/pontosPorAmbiente');
const { buscarReferencias, valorSugerido, segmentoPorNomeDoCliente } = require('./precosMaoDeObraReferencia');
const { lerPdfVetorial } = require('../utils/pdfVetorial');
const { ehArquivoCad, lerArquivoCad } = require('./analiseCad');
const { compatibilizar } = require('../utils/compatibilidadeEspacial');
const {
  totaisCodificados, contagemDoCad, montarServicosPadrao, montarMateriaisInstalacaoPadrao, semModeloCoberto,
  montarMateriais, montarPontosPorAmbiente, montarMateriaisQuantitativos, montarMateriaisDaLista, montarMateriaisDoDesenho,
  semDuplicarFontes,
} = require('../utils/analiseProjetoItens');
const { detalhePorArquivo, gerarAchados, achadosDoDesenho } = require('../utils/analiseProjetoAchados');

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
function extrairCliente(texto) {
  const m = String(texto || '').match(/CLIENTE:\s*([^\t\n]+)/i);
  return m ? m[1].trim() : null;
}

// Extrai os equipamentos de cada arquivo (via IA, reformatando o texto já
// obtido do PDF) e junta tudo numa lista só, sem duplicar itens que
// aparecem repetidos entre arquivos (mesma descrição + mesma referência).
// Um arquivo não espera o outro — as chamadas ao Gemini rodam em paralelo
// (senão, com 3 arquivos, o tempo total vira a soma de cada chamada).
async function extrairEquipamentosDosArquivos(analises, achados) {
  const resultados = await emLotes(analises, 2, a => extrairEquipamentosComIA(a.textoBruto).then(r => ({ arquivo: a.arquivo, ...r })));

  const vistos = new Set();
  const equipamentos = [];
  for (const { arquivo, itens, aviso } of resultados) {
    if (aviso) {
      achados.push({ tema: 'Extração de equipamentos por IA', observacao: `"${arquivo}": ${aviso}` });
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

async function carregarCatalogo() {
  return (await pool.query(
    // ORDER BY fixo: sem ele o PostgreSQL não garante ordem estável, e como o
    // desempate é "o primeiro com o maior score", a mesma análise rodada duas
    // vezes podia sugerir preços diferentes para o mesmo item.
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;
}

// `arquivos`: [{ buffer, nomeArquivo, disciplinas }] — cada arquivo carrega
// SUAS PRÓPRIAS disciplinas (não uma lista única pro lote inteiro). Isso evita
// que um arquivo de uma disciplina contamine a contagem de outra (ex.: um
// arquivo de iluminação, mesmo enviado junto, nunca soma na contagem de
// antena/rede — só arquivos marcados como 'antena'/'rede' entram nessa conta).
// arquivos com `referencia: true` (arquitetura, estrutura, hidráulica,
// climatização do pacote — 2.3): não são orçados; o DWG/DXF deles entra só na
// compatibilização por posição e como base do 3D. PDF de referência não é lido.
async function analisarProjetoCompleto(todosArquivos) {
  const arquivosRef = todosArquivos.filter(a => a.referencia);
  const arquivos = todosArquivos.filter(a => !a.referencia);
  if (!arquivos.length) throw new Error('Marque a disciplina de ao menos um arquivo: só arquivos de referência não geram análise.');
  const lerCad = ({ buffer, nomeArquivo }) => lerArquivoCad(buffer, nomeArquivo)
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

  // Distribuição de pontos por ambiente: aproximada (ver pontosPorAmbiente.js)
  // e por isso isolada num Promise.all com catch por arquivo — uma falha aqui
  // nunca deve derrubar a análise inteira, já que o resto dela (totais,
  // serviços, materiais) não depende disso.
  const pontosPorAmbienteBrutos = await emLotes(arquivos, 3, ({ buffer }, i) => (cads[i] ? cads[i].pontosPorAmbiente : calcularPontosPorAmbiente(buffer).catch(() => [])));
  // geometria do desenho (símbolos/linhas pela legenda): mesma regra, falha não derruba
  const vetoriais = await emLotes(analises, 3, (a, i) => (cads[i] ? [cads[i].pagina] : a.semTexto ? [] : lerPdfVetorial(arquivos[i].buffer, { maxPaginas: 6 }).catch((e) => {
    console.warn(`[analise] leitura vetorial de "${a.arquivo}" falhou:`, e.message);
    return [{ pagina: null, itens: [], legenda: null, escala: null, aviso: `leitura do desenho falhou (${e.message}) — conferir na planta` }];
  })));

  // Disciplina "efetiva" da análise inteira = união das tags de todos os
  // arquivos — decide quais itens-modelo de serviço/material aparecem.
  const disciplinasEfetivas = [...new Set(analises.flatMap(a => a.disciplinas))];

  const cliente = analises.map(a => extrairCliente(a.textoBruto) || a.carimbo?.cliente).find(Boolean) || null;

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
  achados.push(...achadosDoDesenho(analises, vetoriais));

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
  const temLista = (d) => analises.some(a => a.disciplinas.includes(d) && a.listaMateriais?.length);
  // DWG/DXF: bloco da disciplina contado no desenho também resolve a quantidade
  const contouNoCad = (d) => vetoriais.some((v, i) => analises[i].disciplinas.includes(d) && v.some(p => p.origem === 'cad' && p.itens.some(it => it.tipo === 'simbolo' && it.disciplina === d)));
  const faltando = [];
  if (disciplinasEfetivas.includes('rede') && totalRede === 0) faltando.push('pontos de rede');
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
  const comoLista = (lista) => lista.map(m => ({ ...m, _fonte: 'lista' })); // tabela do PDF / equipamentos lidos do texto
  const materiais = semDuplicarFontes([
    ...semModeloCoberto(montarMateriaisInstalacaoPadrao(analises, disciplinasEfetivas), materiaisDoDesenho),
    ...montarMateriaisDaLista(analises, catalogo, achados),
    ...comoLista(materiaisQuantitativos),
    ...comoLista(materiaisEquipamentos),
    ...materiaisDoDesenho,
  ], achados);
  const contagemCad = contagemDoCad(analises, vetoriais);
  const dadosExtraidos = analises.map((a, i) => ({
    arquivo: a.arquivo,
    disciplinas: a.disciplinas,
    semTexto: a.semTexto,
    carimbo: a.carimbo,
    disciplinasDetectadas: a.disciplinasDetectadas,
    quadroCargas: a.quadroCargas,
    totaisQuadro: a.totaisQuadro,
    listaMateriais: a.listaMateriais,
    esquadrias: a.esquadrias,
    desenho: (vetoriais[i] || []).map(p => ({ pagina: p.pagina, escala: p.escala, ...(p.origem ? { origem: p.origem, nao_identificados: p.naoIdentificados } : {}), itens: p.itens.map(({ posicoes, ...it }) => it), ...(p.aviso ? { aviso: p.aviso } : {}) })),
    ...(analises[i].origemCad ? { cad: analises[i].origemCad } : {}),
  }));

  return {
    cliente,
    segmentoPreco: segmento, // órgão público → referência oficial; demais → mercado particular
    disciplinas: disciplinasEfetivas,
    arquivosAnalisados: analises.map(a => ({ arquivo: a.arquivo, disciplinas: a.disciplinas })),
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
    // de preferência o desenho de referência da compatibilização (as marcações caem nele)
    arquiteturaCad: [...cadsRef, ...cads].find(c => c?.arquitetura && c.arquitetura.nome_arquivo === compat.referencia)?.arquitetura
      || [...cadsRef, ...cads].find(c => c?.arquitetura)?.arquitetura || null,
    conflitos: compat.conflitos,
    espacial: compat.espacial || null,
    compatibilizacao: { referencia: compat.referencia, grupos: compat.grupos },
  };
}

module.exports = { analisarProjetoCompleto };
