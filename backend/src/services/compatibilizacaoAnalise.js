const pool = require('../config/database');
const { analisarProjeto } = require('../utils/projetoParser');
const { extrairEquipamentosComIA } = require('./equipamentoExtratorIA');
const { nomeDaDisciplina } = require('../utils/disciplinasProjeto');
const { calcularPontosPorAmbiente } = require('../utils/pontosPorAmbiente');
const { buscarReferencias, valorSugerido, segmentoPorNomeDoCliente } = require('./precosMaoDeObraReferencia');
const { detectarDisciplinas } = require('../utils/leitoresTabelaProjeto');
const { lerPdfVetorial } = require('../utils/pdfVetorial');
const { ehArquivoCad, lerArquivoCad } = require('./analiseCad');
const { compatibilizar } = require('../utils/compatibilidadeEspacial');
// preço sugerido do catálogo pela semelhança da descrição (Jaccard >= 0,45)
const { compararComCatalogo } = require('../utils/semelhancaMateriais');

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

// Soma um campo (ex.: câmeras) só dos arquivos marcados com a disciplina dada —
// é o que evita um arquivo de outra disciplina (ex.: iluminação) contaminar a
// contagem de antena/rede só porque um texto qualquer bateu com o regex.
function somarPorDisciplina(analises, disciplina, obterValor) {
  return analises
    .filter(a => a.disciplinas.includes(disciplina))
    .reduce((s, a) => s + obterValor(a), 0);
}

// Monta o detalhe por arquivo de um tipo de ponto codificado (câmera, rede ou
// antena) — mesma tabela que já existia só para câmeras, agora reutilizada
// pros três tipos, pra não deixar rede/antena com só um número solto no
// relatório sem dizer quais códigos foram encontrados nem em qual arquivo.
// O prefixo do código (CAM/R/A) não entra aqui — quem exibe já sabe qual é
// pelo tipo de ponto que está montando (ver relatorioCompatibilizacaoTemplate
// e a tela de Análise de Projeto).
function detalhePorArquivo(analises, disciplina, obterDados) {
  return analises
    .filter(a => a.disciplinas.includes(disciplina) && obterDados(a).ocorrencias > 0)
    .map(a => ({ arquivo: a.arquivo, ...obterDados(a) }));
}

// Gera os "achados" (pendências/observações) de compatibilização a partir do
// que foi possível detectar automaticamente nos arquivos analisados. Cada
// achado é só uma observação objetiva — a decisão final é sempre do usuário.
// Gera um achado de "numeração repetida"/"numeração com falha" pra qualquer
// tipo de ponto codificado (câmera, rede, antena) — mesma lógica, só muda o
// prefixo do código e o rótulo usado na mensagem.
function achadosDeNumeracao(arquivo, dados, prefixo, rotulo) {
  const achados = [];
  if (dados.repetidas.length > 0) {
    achados.push({
      tema: `${rotulo}: numeração repetida`,
      observacao: `Em "${arquivo}", os códigos ${dados.repetidas.map(n => prefixo + n).join(', ')} aparecem mais de uma vez na planta. Confirme visualmente se são pontos físicos distintos com número repetido por engano (contagem real = ${dados.ocorrencias}) ou duplicidade de rótulo (contagem real = ${dados.total}).`,
    });
  }
  if (dados.faltando.length > 0) {
    achados.push({
      tema: `${rotulo}: numeração com falha`,
      observacao: `Em "${arquivo}", a numeração vai até ${prefixo}${Math.max(...dados.unicas)} mas ${dados.faltando.map(n => prefixo + n).join(', ')} não aparece — provável falha de numeração do projetista, não necessariamente ponto faltando.`,
    });
  }
  return achados;
}

// Cada arquivo carrega sua própria lista de disciplinas (`a.disciplinas`, ver
// utils/disciplinasProjeto.js) — um achado de câmera só é gerado se AQUELE
// arquivo específico foi marcado como CFTV, não se qualquer arquivo do lote
// tiver a disciplina selecionada em algum outro lugar. Isso evita, por
// exemplo, um arquivo de iluminação (que não tem CAMx nenhum) ser citado num
// achado de câmera só porque outro arquivo do mesmo envio é CFTV.
function gerarAchados(analises) {
  const achados = [];

  for (const a of analises) {
    if (a.semTexto) {
      achados.push({
        tema: 'Arquivo sem texto legível',
        observacao: a.origemCad
          ? `"${a.arquivo}" não tem texto nem blocos — só traços (costuma ser um PDF convertido em DWG). Nada pôde ser contado; envie o PDF original do projeto ou o DWG do projetista.`
          : `"${a.arquivo}" não tem camada de texto (PDF escaneado, ou textos do CAD exportados como linhas). Nada pôde ser lido automaticamente — confira as quantidades na planta ou peça ao projetista o PDF exportado com texto (ou o DWG).`,
      });
      continue;
    }
    // Disciplina marcada × conteúdo (caso real: prancha "CFTV 2" que era de alarme)
    const detectadas = a.disciplinasDetectadas || [];
    const principal = detectadas[0];
    if (principal && principal.ocorrencias >= 5 && a.disciplinas.length
      && !a.disciplinas.some(d => detectadas.slice(0, 3).some(x => x.chave === d))) {
      achados.push({
        tema: 'Disciplina do arquivo a conferir',
        observacao: `"${a.arquivo}" foi marcado como ${a.disciplinas.map(nomeDaDisciplina).join(', ')}, mas o conteúdo indica ${nomeDaDisciplina(principal.chave)} (${principal.ocorrencias} termos típicos). Confira a disciplina marcada — as contagens só valem para a disciplina certa.`,
      });
    }
    if (a.esquadrias?.length) {
      const total = a.esquadrias.reduce((s, e) => s + e.quantidade, 0);
      achados.push({
        tema: 'Legenda de esquadrias (arquitetura)',
        observacao: `"${a.arquivo}" traz ${a.esquadrias.length} tipos de portas/janelas (${total} unidades). Não entram como material da disciplina${a.disciplinas.includes('alarme') ? ' — use como referência para os sensores de abertura do alarme' : ''}.`,
      });
    }
    const cb = a.carimbo || {};
    // DWG/DXF: o desenho está em tamanho real, a medição não depende da escala da folha
    if (!a.origemCad && (cb.escala === 'INDICADA' || (cb.escalasNaFolha || []).length > 1)) {
      achados.push({
        tema: 'Escala da prancha',
        observacao: `"${a.arquivo}" tem escala ${cb.escala === 'INDICADA' ? '"indicada" (varia por vista)' : `variada (${cb.escalasNaFolha.join(', ')})`} — medições de comprimento na planta precisam da escala de cada vista.`,
      });
    }
  }

  for (const a of analises) {
    if (a.disciplinas.includes('cftv') && a.cameras.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.cameras, 'CAM', 'Câmeras'));
    }
    if (a.disciplinas.includes('rede') && a.pontosRedeAntena.rede.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.pontosRedeAntena.rede, 'R', 'Pontos de rede'));
    }
    if (a.disciplinas.includes('antena') && a.pontosRedeAntena.antena.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.pontosRedeAntena.antena, 'A', 'Pontos de antena/TV'));
    }
  }

  const arquivosCftv = analises.filter(a => a.disciplinas.includes('cftv'));
  const arquivosComCamera = arquivosCftv.filter(a => a.cameras.ocorrencias > 0).map(a => a.arquivo);
  const arquivosSemCamera = arquivosCftv.filter(a => a.cameras.ocorrencias === 0).map(a => a.arquivo);
  if (arquivosComCamera.length > 0 && arquivosSemCamera.length > 0) {
    achados.push({
      tema: 'Arquivo sem câmeras identificadas',
      observacao: `${arquivosSemCamera.join(', ')} foi marcado como CFTV mas não tem nenhum código de câmera (CAMx) no texto — confirme se é realmente uma prancha de CFTV ou se a disciplina marcada pra esse arquivo está errada.`,
    });
  }

  return achados;
}

// Monta a lista completa de serviços (mão de obra) candidatos, na mesma
// estrutura usada nos orçamentos de referência da empresa. Cada item tem
// "pronto" (já executado / não orçar) editável pelo usuário, e agora também
// uma "disciplina" (ver utils/disciplinasProjeto.js) — o subgrupo visual
// exibido na tela/relatório é o nome dessa disciplina, e só entram na lista
// final os itens cuja disciplina foi marcada em pelo menos um dos arquivos
// analisados.
//
// Câmeras, pontos de rede e pontos de antena/TV vêm preenchidos
// automaticamente quando o desenho usa código individual por ponto (CAMx,
// Rx, Ax) — já validado que esses códigos aparecem como texto direto no
// PDF, sem precisar de IA nem risco de inventar número, e agora somados só
// dos arquivos marcados com a disciplina certa. As demais disciplinas
// (Elétrica, Telefonia, Iluminação, Automação, Alarme) não têm esse tipo de
// código — os símbolos delas (tomada, luminária, quadro) são gráficos, sem
// texto individual no PDF (confirmado lendo um projeto real de iluminação:
// a legenda só descreve o que cada ícone significa, não quantos existem) —
// por isso ficam com quantidade 0 e aviso pra confirmar direto na planta,
// A MENOS que a tabela quantitativa do arquivo (ver extrairTabelaQuantitativa
// em projetoParser.js) tenha achado uma contagem de verdade em texto (ex.:
// um "quadro de cargas" no mesmo formato usado pra portas/janelas).
// Pontos codificados (CAMx, Rx, Ax): o orçamento usa os códigos ÚNICOS — é o
// que a tela e o relatório sempre disseram ("pontos únicos… é esse o número
// usado no orçamento"), mas o código somava as ocorrências, contando em dobro
// um rótulo repetido. Repetições continuam como achado para conferência.
const totaisCodificados = (analises) => ({
  cameras: somarPorDisciplina(analises, 'cftv', a => a.cameras.total),
  rede: somarPorDisciplina(analises, 'rede', a => a.pontosRedeAntena.rede.total),
  antena: somarPorDisciplina(analises, 'antena', a => a.pontosRedeAntena.antena.total),
});

// Circuitos lidos dos quadros de carga dos arquivos de elétrica
const circuitosDosQuadros = (analises) => analises
  .filter(a => a.disciplinas.some(d => d.startsWith('eletrica')))
  .reduce((s, a) => s + (a.quadroCargas?.length || 0), 0);

// DWG/DXF (2.3): blocos contados no desenho → código do serviço de instalação.
// Só conta bloco de arquivo marcado com a disciplina do bloco.
const SERVICO_DO_BLOCO = [
  [/circuito de emerg/i, 'ele_tomada_emergencia', /^Tomada/i],
  [/^Tomada baixa|^Tomada 2P\+T/i, 'ele_tomada_baixa'],
  [/^Tomada média/i, 'ele_tomada_media'],
  [/^Tomada alta/i, 'ele_tomada_alta'],
  [/^Tomada de piso|^Ponto de luz/i, 'ele_ponto_energia'],
  [/^Interruptor/i, 'ele_interruptor'],
  [/^Quadro de distribuição/i, 'ele_qd_setorial'],
  // a legenda diz "de sobrepor": era lançado como de embutir (teste de 28/10/2026)
  [/^(Luminária(?! de emerg).*\bsobrepor|Plafon)/i, 'ilum_luminaria_sobrepor'],
  [/^Luminária(?! de emerg)/i, 'ilum_luminaria_embutir'],
  [/^Câmera/i, 'cftv_ponto'],
  [/^Ponto de rede/i, 'rede_ponto'],
  [/^Ponto de TV/i, 'antena_ponto'],
  [/^Ponto de telefone/i, 'tel_ponto'],
  [/^Sirene/i, 'alarme_sirene'],
  [/^Teclado/i, 'alarme_teclado'],
];
// Item-modelo de material (quantidade 0, "confirme na planta") que a contagem
// do DWG/DXF já cobre na mesma disciplina sai da lista — senão a tela mostra
// "Tomada 2P+T: 0" ao lado de "Tomada baixa 2P+T — bloco TB-T: 64".
const MODELO_COBERTO = [
  [/^Tomada 2P\+T/, /^Tomada/i], [/^Interruptor/, /^Interruptor/i], [/^Eletroduto PVC/, /^Eletroduto|^Trecho de fiação/i],
  [/^Quadro de distribuição \(/, /^Quadro de distribuição/i], [/^Luminária LED/, /^Luminária/i], [/^Perfil LED/, /Perfil/i],
];
function semModeloCoberto(modelos, doDesenho) {
  return modelos.filter(m => {
    if (m.quantidade) return true;
    const regra = MODELO_COBERTO.find(([re]) => re.test(m.descricao));
    return !(regra && doDesenho.some(d => d.disciplina === m.disciplina && d.quantidade > 0 && regra[1].test(d.descricao) && /no (DWG|DXF)/.test(d.observacao || '')));
  });
}

function contagemDoCad(analises, vetoriais = []) {
  const cont = {};
  analises.forEach((a, i) => {
    for (const p of (vetoriais[i] || []).filter(x => x.origem === 'cad')) {
      for (const it of p.itens) {
        if (it.tipo !== 'simbolo' || !doMesmoGrupo(a.disciplinas, it.disciplina)) continue;
        const regra = SERVICO_DO_BLOCO.find(([re, , tambem]) => re.test(it.descricao) && (!tambem || tambem.test(it.descricao)));
        if (!regra) continue;
        const c = (cont[regra[1]] = cont[regra[1]] || { quantidade: 0, blocos: [] });
        c.quantidade += it.quantidade;
        c.blocos.push(`${it.bloco} × ${it.quantidade}`);
      }
    }
  });
  return cont;
}

function montarServicosPadrao(analises, disciplinasEfetivas, precosReferencia = {}, referencias = {}, cad = {}) {
  const codificados = totaisCodificados(analises);
  // sem código de texto (CAMx/Rx/Ax), vale a contagem dos blocos do DWG/DXF
  const totalCameras = codificados.cameras || cad.cftv_ponto?.quantidade || 0;
  const totalRede = codificados.rede || cad.rede_ponto?.quantidade || 0;
  const totalAntena = codificados.antena || cad.antena_ponto?.quantidade || 0;
  const circuitos = circuitosDosQuadros(analises);
  const quadros = analises.filter(a => a.disciplinas.some(d => d.startsWith('eletrica')) && a.quadroCargas?.length).length;
  const SEM_CODIGO = 'Símbolo gráfico no desenho, sem código de texto individual — confirme a quantidade direto na planta antes de fechar.';

  // valor_unitario começa em 0 (editável na tela) — não é preenchido
  // automaticamente com a referência de mercado (valor_referencia_mercado,
  // abaixo), mesmo quando existe uma: é só uma SUGESTÃO exibida ao lado do
  // campo na tela (ver services/precosMaoDeObraReferencia.js), que o usuário
  // aceita clicando ou ignora. Preencher sozinho marcaria o item como
  // "confirmado" no orçamento gerado (ver gerarOrcamento em
  // projetosController.js) — errado pra um preço que ainda não foi validado
  // por ninguém.
  // `codigo` vai junto até a proposta (proposta_itens.codigo): sem ele o item
  // perdia o vínculo com a tabela de preços de referência de mão de obra
  const item = (codigo, descricao, quantidade0, unidade, disciplina, observacao0) => {
    // item sem quantidade pelo texto: a contagem dos blocos do DWG/DXF preenche
    const doCad = !quantidade0 && cad[codigo];
    const quantidade = doCad ? doCad.quantidade : quantidade0;
    const observacao = doCad ? `Quantidade = blocos contados no DWG/DXF (${doCad.blocos.join('; ')}) — conferir na planta.` : observacao0;
    return itemServico(codigo, descricao, quantidade, unidade, disciplina, observacao);
  };
  const itemServico = (codigo, descricao, quantidade, unidade, disciplina, observacao) => ({
    codigo, descricao, quantidade, unidade, valor_unitario: 0,
    valor_referencia_mercado: precosReferencia[codigo] ?? null,
    // referências de mercado dos dois segmentos (oficial/governo e particular) para a tela
    referencias_mercado: referencias[codigo] && (referencias[codigo].publico != null || referencias[codigo].privado != null)
      ? { publico: referencias[codigo].publico, privado: referencias[codigo].privado } : null,
    subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
  });

  const todos = [
    // Redes de Computadores (dados)
    item('rede_ponto', 'Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', codificados.rede, 'pt', 'rede',
      codificados.rede > 0 ? 'Quantidade = total de códigos de ponto de rede (Rx) encontrados no desenho.' : SEM_CODIGO),
    item('rede_switch', 'Instalação e config. de switches', 0, 'un', 'rede', SEM_CODIGO),
    item('rede_ap', 'Instalação e config. de access points (Wi-Fi)', 0, 'un', 'rede', SEM_CODIGO),

    // CFTV
    item('cftv_ponto', 'Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', codificados.cameras, 'pt', 'cftv',
      codificados.cameras > 0 ? 'Quantidade = total de códigos de câmera (CAMx) encontrados no desenho. Confira duplicatas/numeração antes de fechar (veja Compatibilização).' : SEM_CODIGO),
    item('cftv_camera_interna', 'Instalação/config. de câmera interna (dome)', 0, 'un', 'cftv',
      totalCameras > 0 ? `Total de câmeras no desenho: ${totalCameras} — divida entre interna/externa aqui.` : SEM_CODIGO),
    item('cftv_camera_externa', 'Instalação/config. de câmera externa (bullet)', 0, 'un', 'cftv', SEM_CODIGO),

    // Antena/TV
    item('antena_ponto', 'Conectorização de ponto de TV/antena (conector coaxial RG-6)', codificados.antena, 'pt', 'antena',
      codificados.antena > 0 ? 'Quantidade = total de códigos de ponto de antena/TV (Ax) encontrados no desenho.' : SEM_CODIGO),

    // Infraestrutura de Cabeamento Estruturado (compartilhada por rede/CFTV/telefonia)
    item('cab_racks', 'Montagem e organização dos racks (patch panels, guias, PDU)', 0, 'un', 'cabeamento', 'Confirme quantos racks o projeto prevê.'),
    item('cab_nobreak', 'Instalação de nobreaks + kit de ventilação', 0, 'un', 'cabeamento', SEM_CODIGO),
    // Este item de cabeamento CONTA pontos de rede + câmeras — só faz sentido
    // quando rede ou CFTV também foram escolhidos. Se nenhuma das duas está na
    // análise, ele não entra (evita trazer um item que depende de disciplina
    // não selecionada). Só disciplinas estritamente escolhidas.
    ...((disciplinasEfetivas.includes('rede') || disciplinasEfetivas.includes('cftv'))
      ? [item('cab_certificacao', 'Certificação e etiquetagem dos pontos (rede + câmeras)', totalRede + totalCameras, 'pt', 'cabeamento',
          (totalRede > 0 || totalCameras > 0) ? 'Quantidade = pontos de rede + câmeras encontrados no desenho.' : SEM_CODIGO)]
      : []),
    item('cab_passagem', 'Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb', 'cabeamento',
      'Marque como "já pronto" se o cabeamento já estiver passado no local (não entra na mão de obra).'),

    // Telefonia
    item('tel_ponto', 'Conectorização de ponto de telefonia (RJ-11/RJ-45 + teste)', 0, 'pt', 'telefonia', SEM_CODIGO),
    item('tel_central', 'Instalação de central telefônica / PABX', 0, 'un', 'telefonia', SEM_CODIGO),

    // Elétrica — categorias na mesma nomenclatura de uma legenda real de
    // projeto (tomada baixa/média/alta/emergência por altura de instalação,
    // ponto de energia teto/piso) — lista pra cobrir um orçamento de elétrica
    // do zero, mesmo sem contagem automática (ver nota acima).
    item('ele_qdg', 'Instalação de quadro de distribuição geral (QDG)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_qd_setorial', 'Instalação de quadros de distribuição setoriais/por pavimento', quadros, 'un', 'eletrica',
      quadros > 0 ? `Quantidade = quadros de carga encontrados nos arquivos de elétrica (${quadros}).` : SEM_CODIGO),
    item('ele_disjuntores', 'Instalação de disjuntores (termomagnéticos/DR)', circuitos > 0 ? circuitos + quadros : 0, 'un', 'eletrica',
      circuitos > 0 ? `Quantidade = ${circuitos} circuitos dos quadros de carga + ${quadros} disjuntor(es) geral(is).` : SEM_CODIGO),
    item('ele_eletrodutos', 'Passagem de eletrodutos e fiação (circuitos de tomada/força)', 1, 'vb', 'eletrica',
      'Marque como "já pronto" se a infraestrutura elétrica já estiver executada.'),
    item('ele_tomada_baixa', 'Instalação de tomada baixa (30/60cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_media', 'Instalação de tomada média (110/140cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_alta', 'Instalação de tomada alta (180cm)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_tomada_emergencia', 'Instalação de tomada de emergência (baixa/média/alta)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_interruptor', 'Instalação de interruptor simples/paralelo', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_ponto_energia', 'Instalação de ponto de energia (teto/piso)', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_aterramento', 'Aterramento (malha/SPDA)', 0, 'vb', 'eletrica', SEM_CODIGO),

    // Iluminação
    item('ilum_luminaria_embutir', 'Instalação de luminária de embutir', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_luminaria_sobrepor', 'Instalação de luminária de sobrepor', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('ilum_perfil_led', 'Instalação de perfil LED linear (embutir/sobrepor/marcenaria)', 0, 'm', 'iluminacao', SEM_CODIGO),
    item('ilum_interruptor_dimmer', 'Instalação de interruptor/dimmer de iluminação', 0, 'un', 'iluminacao', SEM_CODIGO),

    // Automação
    item('auto_central', 'Instalação e configuração de central de automação', 0, 'un', 'automacao', SEM_CODIGO),
    item('auto_atuadores', 'Instalação de atuadores/módulos de automação (tomadas, cortinas, cenas)', 0, 'un', 'automacao', SEM_CODIGO),

    // Alarme
    item('alarme_sensor_abertura', 'Instalação de sensor de abertura (magnético) porta/janela', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_ivp', 'Instalação de sensor infravermelho passivo (IVP)', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_sirene', 'Instalação de sirene', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_teclado', 'Instalação de teclado de comando', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_repetidor', 'Instalação de repetidor de sinal', 0, 'un', 'alarme', SEM_CODIGO),
    item('alarme_central', 'Instalação e configuração da central de alarme', 0, 'un', 'alarme', 'Normalmente 1 unidade — confirme.'),
  ];

  return todos.filter(it => disciplinasEfetivas.includes(it.disciplina));
}

// Lista padrão de material de instalação (Bloco 2 nos orçamentos de
// referência) — itens de terminação/fixação que não vêm de nenhuma cotação
// de fornecedor, calculados a partir dos pontos do projeto (câmeras, rede e
// antena/TV, quando o desenho tem código individual para eles, somados só
// dos arquivos marcados com a disciplina certa). Cada item também carrega a
// disciplina, pro mesmo filtro usado em montarServicosPadrao.
function montarMateriaisInstalacaoPadrao(analises, disciplinasEfetivas) {
  const { cameras: totalCameras, rede: totalRede, antena: totalAntena } = totaisCodificados(analises);

  const item = (descricao, quantidade, unidade, disciplina, observacao) => ({
    descricao, quantidade, unidade, subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
    referencia_fabricante: null, preco_catalogo: null, material_id: null, confianca_catalogo: null, descricao_catalogo: null,
  });

  const todos = [
    item('Keystone/jack RJ-45 Cat.6 (lado usuário — pontos de rede)', totalRede, 'un', 'rede',
      totalRede > 0 ? `Quantidade = pontos de rede encontrados no desenho (${totalRede}).` : 'Quantidade = nº de pontos de rede.'),
    item('Espelho/placa 4x2 + suporte (pontos de rede)', totalRede, 'un', 'rede',
      totalRede > 0 ? `Quantidade = pontos de rede encontrados no desenho (${totalRede}).` : 'Quantidade = nº de pontos de rede.'),
    item('Tomada coaxial RG-6 + conector (TV/antena)', totalAntena, 'un', 'antena',
      totalAntena > 0 ? `Quantidade = pontos de antena/TV encontrados no desenho (${totalAntena}).` : 'Quantidade = nº de pontos de TV/antena.'),
    item('Plug RJ-45 Cat.6 (terminação de câmeras) + reserva', totalCameras > 0 ? totalCameras + 24 : 0, 'un', 'cftv',
      totalCameras > 0 ? `Quantidade = câmeras (${totalCameras}) + reserva estimada (24) — ajuste conforme necessário.` : 'Quantidade = nº de câmeras + reserva.'),
    item('Suporte/braço de fixação p/ câmera externa (bullet)', 0, 'un', 'cftv', 'Quantidade = nº de câmeras externas (bullet).'),
    item('Identificação (etiquetas/anilhas), abraçadeiras, parafusos e miudezas', 1, 'vb', 'cabeamento', 'Verba — ajuste conforme o porte do projeto.'),

    // Elétrica
    item('Disjuntor termomagnético (conforme quadro de cargas)', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade e amperagem direto na planta/memorial.'),
    item('Quadro de distribuição (padrão modular, nº de polos a definir)', 0, 'un', 'eletrica', 'Confirme quantidade e nº de polos direto no memorial elétrico.'),
    item('Tomada 2P+T 10A/20A', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Interruptor simples/paralelo', 0, 'un', 'eletrica', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Cabo elétrico flexível 750V (conforme bitola do projeto)', 0, 'm', 'eletrica', 'Quantidade depende do quadro de cargas/memorial — confirme antes de fechar.'),
    item('Eletroduto PVC (rígido ou corrugado, conforme projeto)', 0, 'm', 'eletrica', 'Quantidade depende do memorial elétrico — confirme antes de fechar.'),

    // Iluminação
    item('Luminária LED de embutir', 0, 'un', 'iluminacao', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Luminária LED de sobrepor', 0, 'un', 'iluminacao', 'Símbolo gráfico no desenho — confirme quantidade direto na planta.'),
    item('Perfil LED linear (embutir/sobrepor/marcenaria)', 0, 'm', 'iluminacao', 'Quantidade em metros lineares — confirme direto na planta.'),
  ];

  return todos.filter(it => disciplinasEfetivas.includes(it.disciplina));
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

// Monta a lista final de materiais pra revisão: um item por equipamento
// encontrado, com preço sugerido do catálogo quando há correspondência
// razoável — nunca preenche preço "no chute" quando não achou nada parecido.
async function carregarCatalogo() {
  return (await pool.query(
    // ORDER BY fixo: sem ele o PostgreSQL não garante ordem estável, e como o
    // desempate é "o primeiro com o maior score", a mesma análise rodada duas
    // vezes podia sugerir preços diferentes para o mesmo item.
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;
}

function montarMateriais(equipamentos, catalogo) {
  return equipamentos.map(eq => {
    const correspondencia = compararComCatalogo(eq.descricao, catalogo);
    return {
      descricao: eq.descricao,
      referencia_fabricante: eq.referencia_fabricante || null,
      quantidade: 1,
      unidade: correspondencia?.unidade_catalogo || 'un',
      subgrupo: 'Material e Equipamentos',
      pronto: false,
      preco_catalogo: correspondencia?.preco_catalogo ?? null,
      material_id: correspondencia?.material_id ?? null,
      confianca_catalogo: correspondencia?.confianca ?? null,
      descricao_catalogo: correspondencia?.descricao_catalogo ?? null,
    };
  });
}

// Junta a distribuição aproximada de pontos por ambiente (ver
// pontosPorAmbiente.js) de todos os arquivos, zerando os tipos de ponto que
// não são da disciplina daquele arquivo (mesmo cuidado de somarPorDisciplina
// — um arquivo de iluminação não pode contribuir "câmeras" mesmo se algum
// texto batesse por coincidência com o regex de CAMx) e somando por nome de
// ambiente entre arquivos da mesma disciplina (ex.: CFTV 1 + CFTV 2 somam
// câmeras no mesmo ambiente). Só entram ambientes com pelo menos 1 ponto.
function montarPontosPorAmbiente(arquivos, analises, brutosPorArquivo) {
  const porAmbiente = new Map();

  brutosPorArquivo.forEach((linhas, i) => {
    const disciplinas = analises[i].disciplinas;
    for (const linha of linhas) {
      const atual = porAmbiente.get(linha.ambiente) || { ambiente: linha.ambiente, cftv: 0, rede: 0, antena: 0 };
      if (disciplinas.includes('cftv')) atual.cftv += linha.cftv;
      if (disciplinas.includes('rede')) atual.rede += linha.rede;
      if (disciplinas.includes('antena')) atual.antena += linha.antena;
      porAmbiente.set(linha.ambiente, atual);
    }
  });

  return [...porAmbiente.values()]
    .map(a => ({ ...a, total: a.cftv + a.rede + a.antena }))
    .filter(a => a.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Transforma os itens da tabela quantitativa genérica (extrairTabelaQuantitativa
// em projetoParser.js — padrão "CÓDIGO - descrição - N unidade(s);", achado de
// verdade num projeto real na seção de portas/janelas) em linhas de material,
// com a disciplina do próprio arquivo de origem e a quantidade REAL lida do
// texto (não um placeholder em 0). Diferente dos itens-modelo acima, esses só
// aparecem quando o padrão realmente existe no arquivo — não force a barra
// quando o desenho não traz esse tipo de tabela.
function montarMateriaisQuantitativos(analises) {
  const materiais = [];
  for (const a of analises) {
    const disciplinaPrincipal = a.disciplinas[0];
    if (!disciplinaPrincipal) continue;
    for (const it of a.tabelaQuantitativa) {
      materiais.push({
        descricao: `${it.codigo} - ${it.descricao}`,
        referencia_fabricante: null,
        quantidade: it.quantidade,
        unidade: 'un',
        subgrupo: nomeDaDisciplina(disciplinaPrincipal),
        disciplina: disciplinaPrincipal,
        pronto: false,
        preco_catalogo: null,
        material_id: null,
        confianca_catalogo: null,
        descricao_catalogo: null,
        observacao: `Quantidade extraída automaticamente do texto de "${a.arquivo}" (tabela quantitativa do próprio desenho).`,
      });
    }
  }
  return materiais;
}

// Listas de materiais lidas do texto do PDF (ver leitoresTabelaProjeto.js):
// quantidade e unidade REAIS, cada item na disciplina indicada pela própria
// descrição (um memorial de cotação traz vários sistemas juntos). Item de
// disciplina que não foi marcada no arquivo fica de fora, com aviso — mesma
// regra de não contaminar uma disciplina com outra.
function montarMateriaisDaLista(analises, catalogo, achados) {
  const materiais = [];
  const foraDaSelecao = new Map();
  for (const a of analises) {
    if (!a.listaMateriais?.length || !a.disciplinas.length) continue;
    for (const it of a.listaMateriais) {
      // título da seção do memorial primeiro; depois a própria descrição
      const sugerida = it.disciplinaSecao || detectarDisciplinas(it.descricao)[0]?.chave;
      const disciplina = sugerida && a.disciplinas.includes(sugerida) ? sugerida
        : (sugerida && !a.disciplinas.includes(sugerida) ? null : a.disciplinas[0]);
      if (!disciplina) { foraDaSelecao.set(sugerida, (foraDaSelecao.get(sugerida) || 0) + 1); continue; }
      const descricao = [it.descricao, it.fabricante && `${it.fabricante} ${it.modelo}`.trim()].filter(Boolean).join(' — ');
      const corr = compararComCatalogo(descricao, catalogo);
      materiais.push({
        descricao,
        referencia_fabricante: it.modelo || null,
        quantidade: it.qtd,
        unidade: it.unidade || corr?.unidade_catalogo || 'un',
        subgrupo: nomeDaDisciplina(disciplina),
        disciplina,
        pronto: false,
        preco_catalogo: corr?.preco_catalogo ?? null,
        material_id: corr?.material_id ?? null,
        confianca_catalogo: corr?.confianca ?? null,
        descricao_catalogo: corr?.descricao_catalogo ?? null,
        observacao: `Lista de materiais do próprio projeto ("${a.arquivo}"${it.item ? `, item ${it.item}` : it.tag ? `, TAG ${it.tag}` : ''}).`,
        _fonte: 'lista', // semDuplicarFontes
      });
    }
  }
  if (foraDaSelecao.size) {
    achados.push({
      tema: 'Itens de outras disciplinas na lista de materiais',
      observacao: `A lista de materiais traz itens de ${[...foraDaSelecao].map(([d, n]) => `${nomeDaDisciplina(d)} (${n})`).join(', ')}, que não foram marcadas para o arquivo e ficaram de fora. Marque essas disciplinas e analise de novo se forem fazer parte do orçamento.`,
    });
  }
  return materiais;
}

// Contagem pelo DESENHO (PDF vetorial, ver pdfVetorial.js): símbolos e linhas
// identificados pela legenda da própria prancha. Vira material só em arquivo
// SEM lista de materiais (a lista do projeto manda) e só item não ambíguo;
// a disciplina sai da descrição da legenda (fica de fora a que não foi marcada).
const semMarcador = (s) => String(s).replace(/^[-–•\s]+/, '');
const metrosBR = (m) => `${String(m).replace('.', ',')} m`;

const ORIGEM_DESCRICAO = { legenda: 'descrição da legenda da prancha', atributo: 'descrição do atributo do bloco', sigla: 'sigla do bloco — confirmar o tipo', nome: 'nome do bloco' };
// "rede" e "cabeamento" são a mesma skill: bloco de rede vale para arquivo marcado com qualquer das duas
function doMesmoGrupo(marcadas, sugerida) {
  if (marcadas.includes(sugerida)) return sugerida;
  const par = { rede: 'cabeamento', cabeamento: 'rede' }[sugerida];
  return par && marcadas.includes(par) ? par : null;
}

function montarMateriaisDoDesenho(analises, vetoriais, catalogo) {
  const materiais = [];
  analises.forEach((a, i) => {
    if (a.listaMateriais?.length || !a.disciplinas.length) return;
    for (const pag of vetoriais[i] || []) {
      for (const it of pag.itens) {
        if (it.ambiguo || (it.tipo === 'linha' && it.metros == null)) continue;
        // CAD: a disciplina vem do bloco/layer (services/analiseCad/index.js); PDF: da descrição da legenda
        const sugerida = pag.origem === 'cad' ? it.disciplina : detectarDisciplinas(it.descricao)[0]?.chave;
        const disciplina = sugerida ? (doMesmoGrupo(a.disciplinas, sugerida)) : a.disciplinas[0];
        if (!disciplina) continue;
        const descricao = semMarcador(it.descricao).slice(0, 240);
        const corr = compararComCatalogo(descricao, catalogo);
        materiais.push({
          descricao,
          referencia_fabricante: null,
          // linha: + 10 % de sobra (curvas, descidas e subidas que a planta não mostra)
          quantidade: it.tipo === 'simbolo' ? it.quantidade : Math.ceil(it.metros * 1.1),
          unidade: it.tipo === 'simbolo' ? (corr?.unidade_catalogo || 'un') : 'm',
          subgrupo: nomeDaDisciplina(disciplina),
          disciplina,
          pronto: false,
          preco_catalogo: corr?.preco_catalogo ?? null,
          material_id: corr?.material_id ?? null,
          confianca_catalogo: corr?.confianca ?? null,
          descricao_catalogo: corr?.descricao_catalogo ?? null,
          observacao: pag.origem === 'cad'
            ? (it.tipo === 'simbolo'
              ? `Contado no ${pag.pagina} "${a.arquivo}": bloco "${it.bloco}" × ${it.quantidade} (${ORIGEM_DESCRICAO[it.origemDescricao] || 'descrição a conferir'}) — conferir.`
              : `Medido no ${pag.pagina} "${a.arquivo}": ${metrosBR(it.metros)} na layer "${it.layer}" + 10 % de sobra — conferir.`)
            : it.tipo === 'simbolo'
              ? `Contado no desenho de "${a.arquivo}" (pág. ${pag.pagina}): símbolo da legenda × ${it.quantidade} — conferir na planta.`
              : `Medido no desenho de "${a.arquivo}" (pág. ${pag.pagina}): ${metrosBR(it.metros)} na escala 1:${pag.escala} + 10 % de sobra — conferir.`,
          _fonte: pag.origem === 'cad' ? 'cad' : 'pdf', // semDuplicarFontes
        });
      }
    }
  });
  return materiais;
}

// ── O mesmo item vindo de arquivos diferentes ─────────────────────────────
// O projeto chega em PDF (com lista de materiais) E em DWG/DXF: a tomada da
// lista e a mesma tomada contada nos blocos do desenho entravam as duas (teste
// de 28/10/2026: "Tomada 2P+T 10 A" da lista + "Tomada 2P+T — bloco TUG × 6").
// Por disciplina e TIPO de item, vale uma fonte só, nesta ordem: DWG/DXF
// (blocos contados) > lista/tabela do PDF > contagem pelo desenho do PDF.
// Um item da lista e um do DWG do mesmo tipo: fica a descrição da lista (mais
// completa, com "10 A") e a quantidade do DWG.
const TIPOS_DE_ITEM = [
  // ponto de rede/TV antes de tomada: "tomada de rede" é ponto de rede
  ['ponto_rede', /ponto de rede|\brj-?45\b|tomada de rede|tomada l[óo]gica/i], ['ponto_tv', /ponto de tv|coaxial|tomada de tv/i],
  ['tomada', /\btomada/i], ['interruptor', /interruptor|\bdimmer/i], ['luminaria', /lumin[áa]ria|plafon|arandela|\bspot\b|downlight|pendente/i],
  ['eletroduto', /eletroduto/i], ['eletrocalha', /eletrocalha/i], ['perfilado', /perfilado/i], ['leito', /leito para cabo|leito\b/i],
  ['quadro', /^quadro|quadro de distribui/i], ['camera', /c[âa]mera/i], ['detector', /detector/i], ['acionador', /acionador/i],
  ['avisador', /avisador|sirene/i],
];
const tipoDoItem = (descricao) => TIPOS_DE_ITEM.find(([, re]) => re.test(descricao || ''))?.[0] || null;
const PESO_FONTE = { cad: 3, lista: 2, pdf: 1 };
const ROTULO_FONTE = { cad: 'DWG/DXF', lista: 'lista de materiais do PDF', pdf: 'contagem pelo desenho do PDF' };

function semDuplicarFontes(materiais, achados) {
  const grupos = new Map();
  materiais.forEach((m, i) => {
    const tipo = m._fonte && tipoDoItem(m.descricao);
    if (!tipo) return;
    const k = `${m.disciplina}|${tipo}`;
    (grupos.get(k) || grupos.set(k, []).get(k)).push(i);
  });
  const fora = new Set();
  const resumo = [];
  for (const [k, idx] of grupos) {
    const fontes = [...new Set(idx.map(i => materiais[i]._fonte))];
    if (fontes.length < 2) continue;
    const vence = fontes.sort((a, b) => PESO_FONTE[b] - PESO_FONTE[a])[0];
    const ficam = idx.filter(i => materiais[i]._fonte === vence);
    const saem = idx.filter(i => materiais[i]._fonte !== vence);
    saem.forEach(i => fora.add(i));
    const qtd = (lista) => lista.reduce((s, i) => s + (Number(materiais[i].quantidade) || 0), 0);
    // descrição da lista no item do DWG (1 para 1, mesma unidade)
    const daLista = saem.filter(i => materiais[i]._fonte === 'lista');
    if (vence === 'cad' && ficam.length === 1 && daLista.length === 1 && materiais[ficam[0]].unidade === materiais[daLista[0]].unidade) {
      const c = materiais[ficam[0]], l = materiais[daLista[0]];
      Object.assign(c, {
        descricao: l.descricao, referencia_fabricante: l.referencia_fabricante || c.referencia_fabricante,
        material_id: l.material_id ?? c.material_id, preco_catalogo: l.preco_catalogo ?? c.preco_catalogo,
        confianca_catalogo: l.confianca_catalogo ?? c.confianca_catalogo, descricao_catalogo: l.descricao_catalogo ?? c.descricao_catalogo,
        observacao: `${c.observacao} Descrição da lista de materiais (que dizia ${l.quantidade} ${l.unidade}).`,
      });
    }
    const [disc, tipo] = k.split('|');
    resumo.push(`${nomeDaDisciplina(disc)} — ${tipo.replace('_', ' ')}: vale ${ROTULO_FONTE[vence]} (${qtd(ficam)}); ${[...new Set(saem.map(i => materiais[i]._fonte))].map(f => `${ROTULO_FONTE[f]} dizia ${qtd(saem.filter(i => materiais[i]._fonte === f))}`).join('; ')}`);
  }
  if (resumo.length) {
    achados.push({
      tema: 'Mesmo item em mais de um arquivo (não somado)',
      observacao: `O projeto veio em mais de um formato e o mesmo tipo de item apareceu em fontes diferentes — contado uma vez só: ${resumo.join(' | ')}. Se a diferença de quantidade for grande, confira qual arquivo está atualizado.`,
    });
  }
  return materiais.filter((_, i) => !fora.has(i)).map(({ _fonte, ...m }) => m);
}

function achadosDoDesenho(analises, vetoriais) {
  const achados = [];
  analises.forEach((a, i) => {
    // página pulada (traços demais) ou leitura que falhou: avisa em vez de sumir calada
    // DWG vazio já tem o achado "Arquivo sem texto legível"
    const avisos = (vetoriais[i] || []).filter(p => p.aviso && p.origem !== 'cad');
    if (avisos.length) {
      achados.push({
        tema: 'Contagem pelo desenho (PDF vetorial) incompleta',
        observacao: `"${a.arquivo}": ${avisos.map(p => (p.pagina ? `pág. ${p.pagina}: ` : '') + p.aviso).join('; ')}.`,
      });
    }
    for (const p of (vetoriais[i] || []).filter(p => p.origem === 'cad')) {
      if (p.naoIdentificados?.length) {
        achados.push({
          tema: 'Blocos do desenho não identificados',
          observacao: `"${a.arquivo}": ${p.naoIdentificados.slice(0, 15).map(b => `${b.bloco} × ${b.quantidade} (layer ${b.layer})`).join('; ')}${p.naoIdentificados.length > 15 ? ` (+${p.naoIdentificados.length - 15})` : ''}. Não viraram material: o nome do bloco não diz o que é. Se forem do orçamento, lance pela legenda da prancha.`,
        });
      }
      if (p.outraArea) achados.push({ tema: 'Itens de outras áreas no desenho', observacao: `"${a.arquivo}": ${p.outraArea} bloco(s) de climatização/hidráulica (dutos, difusores, conexões) ficaram de fora — não são das disciplinas da H&M.` });
    }
    const itens = (vetoriais[i] || []).flatMap(p => p.itens);
    if (!itens.length) return;
    const fmt = (it) => `${semMarcador(it.descricao).slice(0, 70)}: ${it.tipo === 'simbolo' ? it.quantidade : it.metros != null ? metrosBR(it.metros) : `${it.comprimento_pt} pt (sem escala no carimbo)`}`;
    const ehCad = (vetoriais[i] || []).some(p => p.origem === 'cad');
    const claros = itens.filter(it => !it.ambiguo), ambiguos = itens.filter(it => it.ambiguo);
    achados.push({
      tema: ehCad ? 'Contagem pelo desenho (DWG/DXF)' : 'Contagem pelo desenho (PDF vetorial)',
      observacao: `"${a.arquivo}": ${claros.length ? claros.slice(0, 15).map(fmt).join('; ') : 'nenhum item da legenda com símbolo próprio'}${claros.length > 15 ? ` (+${claros.length - 15})` : ''}.`
        + (ambiguos.length ? ` ${ambiguos.length} item(ns) da legenda com o mesmo símbolo/estilo de outro — não separados.` : '')
        + (a.listaMateriais?.length ? ' O arquivo tem lista de materiais: ela é que vale; a contagem serve para conferir.' : ' Conferir na planta antes de emitir.'),
    });
  });
  return achados;
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

module.exports = { analisarProjetoCompleto, extrairCliente, gerarAchados, montarServicosPadrao, paraTestes: { semDuplicarFontes, tipoDoItem, contagemDoCad } };
