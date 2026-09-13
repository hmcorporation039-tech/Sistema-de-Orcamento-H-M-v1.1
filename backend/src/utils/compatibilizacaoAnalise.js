const pool = require('../config/database');
const { analisarProjeto } = require('./projetoParser');
const { extrairEquipamentosComIA } = require('./equipamentoExtratorIA');
const { nomeDaDisciplina } = require('./disciplinasProjeto');
const { calcularPontosPorAmbiente } = require('./pontosPorAmbiente');
const { buscarPrecosReferencia } = require('./precosMaoDeObraReferencia');

function normalizarPalavras(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acento
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 2); // ignora palavras curtas (DE, OU, UN...)
}

// Casa a descrição de um equipamento extraído do projeto com o catálogo de
// materiais já cadastrado, por sobreposição de palavras (sem exigir texto
// idêntico — a redação do projeto quase nunca bate exatamente com a do
// catálogo). Só assume uma correspondência quando a sobreposição é forte o
// suficiente (>= 45% das palavras do lado menor) — senão, fica sem preço
// sugerido, pra não arriscar comparar coisas diferentes.
// `catalogo` é passado pronto (não busca no banco a cada chamada) — pra
// comparar vários equipamentos sem repetir a mesma consulta N vezes.
function compararComCatalogo(descricao, catalogo) {
  const palavrasAlvo = normalizarPalavras(descricao);
  if (palavrasAlvo.length === 0) return null;

  let melhor = null;
  for (const mat of catalogo) {
    const palavrasMat = normalizarPalavras(mat.descricao);
    if (palavrasMat.length === 0) continue;

    const setAlvo = new Set(palavrasAlvo);
    const setMat = new Set(palavrasMat);
    const comuns = [...setAlvo].filter(p => setMat.has(p)).length;

    // Índice de Jaccard (comuns / união) em vez de "comuns / lado menor".
    //
    // Com o denominador sendo o lado menor, qualquer material de descrição
    // curta virava subconjunto trivial e cravava 100%: "CABO COAXIAL" ganhava
    // de "CABO COAXIAL RG-6 BLINDADO 75 OHMS BRANCO" ao comparar com um alvo
    // detalhado, e "PARAFUSO" casava 100% com "PARAFUSO AUTOBROCANTE 4.2X32
    // CAIXA 100UN (R$ 99)" — sugerindo R$ 99 como preço de UM parafuso, com o
    // rótulo "100% match" no relatório. Jaccard penaliza a diferença de
    // tamanho: quanto mais termos sobram de um lado, menor a confiança.
    const uniao = new Set([...setAlvo, ...setMat]).size;
    const score = comuns / uniao;

    if (score >= 0.45 && (!melhor || score > melhor.score)) {
      melhor = { score, material: mat };
    }
  }

  if (!melhor) return null;
  return {
    material_id: melhor.material.id,
    descricao_catalogo: melhor.material.descricao,
    preco_catalogo: Number(melhor.material.preco),
    unidade_catalogo: melhor.material.unidade,
    confianca: Math.round(melhor.score * 100),
  };
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
function montarServicosPadrao(analises, disciplinasEfetivas, precosReferencia = {}) {
  const totalCameras = somarPorDisciplina(analises, 'cftv', a => a.cameras.ocorrencias);
  const totalRede = somarPorDisciplina(analises, 'rede', a => a.pontosRedeAntena.rede.ocorrencias);
  const totalAntena = somarPorDisciplina(analises, 'antena', a => a.pontosRedeAntena.antena.ocorrencias);
  const SEM_CODIGO = 'Símbolo gráfico no desenho, sem código de texto individual — confirme a quantidade direto na planta antes de fechar.';

  // valor_unitario começa em 0 (editável na tela) — não é preenchido
  // automaticamente com a referência de mercado (valor_referencia_mercado,
  // abaixo), mesmo quando existe uma: é só uma SUGESTÃO exibida ao lado do
  // campo na tela (ver utils/precosMaoDeObraReferencia.js), que o usuário
  // aceita clicando ou ignora. Preencher sozinho marcaria o item como
  // "confirmado" no orçamento gerado (ver gerarOrcamento em
  // projetosController.js) — errado pra um preço que ainda não foi validado
  // por ninguém.
  const item = (codigo, descricao, quantidade, unidade, disciplina, observacao) => ({
    descricao, quantidade, unidade, valor_unitario: 0,
    valor_referencia_mercado: precosReferencia[codigo] ?? null,
    subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
  });

  const todos = [
    // Redes de Computadores (dados)
    item('rede_ponto', 'Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', totalRede, 'pt', 'rede',
      totalRede > 0 ? 'Quantidade = total de códigos de ponto de rede (Rx) encontrados no desenho.' : SEM_CODIGO),
    item('rede_switch', 'Instalação e config. de switches', 0, 'un', 'rede', SEM_CODIGO),
    item('rede_ap', 'Instalação e config. de access points (Wi-Fi)', 0, 'un', 'rede', SEM_CODIGO),

    // CFTV
    item('cftv_ponto', 'Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', totalCameras, 'pt', 'cftv',
      totalCameras > 0 ? 'Quantidade = total de códigos de câmera (CAMx) encontrados no desenho. Confira duplicatas/numeração antes de fechar (veja Compatibilização).' : SEM_CODIGO),
    item('cftv_camera_interna', 'Instalação/config. de câmera interna (dome)', 0, 'un', 'cftv',
      totalCameras > 0 ? `Total de câmeras no desenho: ${totalCameras} — divida entre interna/externa aqui.` : SEM_CODIGO),
    item('cftv_camera_externa', 'Instalação/config. de câmera externa (bullet)', 0, 'un', 'cftv', SEM_CODIGO),

    // Antena/TV
    item('antena_ponto', 'Conectorização de ponto de TV/antena (conector coaxial RG-6)', totalAntena, 'pt', 'antena',
      totalAntena > 0 ? 'Quantidade = total de códigos de ponto de antena/TV (Ax) encontrados no desenho.' : SEM_CODIGO),

    // Infraestrutura de Cabeamento Estruturado (compartilhada por rede/CFTV/telefonia)
    item('cab_racks', 'Montagem e organização dos racks (patch panels, guias, PDU)', 0, 'un', 'cabeamento', 'Confirme quantos racks o projeto prevê.'),
    item('cab_nobreak', 'Instalação de nobreaks + kit de ventilação', 0, 'un', 'cabeamento', SEM_CODIGO),
    item('cab_certificacao', 'Certificação e etiquetagem dos pontos (rede + câmeras + telefonia)', totalRede + totalCameras, 'pt', 'cabeamento',
      (totalRede > 0 || totalCameras > 0) ? 'Quantidade = pontos de rede + câmeras encontrados no desenho.' : SEM_CODIGO),
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
    item('ele_qd_setorial', 'Instalação de quadros de distribuição setoriais/por pavimento', 0, 'un', 'eletrica', SEM_CODIGO),
    item('ele_disjuntores', 'Instalação de disjuntores (termomagnéticos/DR)', 0, 'un', 'eletrica', SEM_CODIGO),
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
  const totalCameras = somarPorDisciplina(analises, 'cftv', a => a.cameras.ocorrencias);
  const totalRede = somarPorDisciplina(analises, 'rede', a => a.pontosRedeAntena.rede.ocorrencias);
  const totalAntena = somarPorDisciplina(analises, 'antena', a => a.pontosRedeAntena.antena.ocorrencias);

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
  const resultados = await Promise.all(
    analises.map(a => extrairEquipamentosComIA(a.textoBruto).then(r => ({ arquivo: a.arquivo, ...r })))
  );

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
async function montarMateriais(equipamentos) {
  const catalogo = (await pool.query(
    // ORDER BY fixo: sem ele o PostgreSQL não garante ordem estável, e como o
    // desempate é "o primeiro com o maior score", a mesma análise rodada duas
    // vezes podia sugerir preços diferentes para o mesmo item.
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id'
  )).rows;

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

// `arquivos`: [{ buffer, nomeArquivo, disciplinas }] — cada arquivo carrega
// SUAS PRÓPRIAS disciplinas (não uma lista única pro lote inteiro). Isso evita
// que um arquivo de uma disciplina contamine a contagem de outra (ex.: um
// arquivo de iluminação, mesmo enviado junto, nunca soma na contagem de
// antena/rede — só arquivos marcados como 'antena'/'rede' entram nessa conta).
async function analisarProjetoCompleto(arquivos) {
  // Cada arquivo é lido/analisado em paralelo (pdf-parse + regex é I/O-bound e
  // independente por arquivo) — antes rodava um de cada vez (sequencial), o
  // que somava o tempo de N arquivos à toa.
  const analisesBrutas = await Promise.all(
    arquivos.map(({ buffer, nomeArquivo }) => analisarProjeto(buffer, nomeArquivo))
  );
  const analises = analisesBrutas.map((a, i) => ({ ...a, disciplinas: arquivos[i].disciplinas }));

  // Distribuição de pontos por ambiente: aproximada (ver pontosPorAmbiente.js)
  // e por isso isolada num Promise.all com catch por arquivo — uma falha aqui
  // nunca deve derrubar a análise inteira, já que o resto dela (totais,
  // serviços, materiais) não depende disso.
  const pontosPorAmbienteBrutos = await Promise.all(
    arquivos.map(({ buffer }) => calcularPontosPorAmbiente(buffer).catch(() => []))
  );

  // Preços de referência de mão de obra (sugestão editável pelo admin — ver
  // utils/precosMaoDeObraReferencia.js). Se a tabela ainda não existir por
  // algum motivo (ambiente sem a migração mais nova), a análise continua
  // funcionando normalmente, só sem a sugestão de preço.
  const precosReferencia = await buscarPrecosReferencia().catch(() => ({}));

  // Disciplina "efetiva" da análise inteira = união das tags de todos os
  // arquivos — decide quais itens-modelo de serviço/material aparecem.
  const disciplinasEfetivas = [...new Set(analises.flatMap(a => a.disciplinas))];

  const cliente = analises.map(a => extrairCliente(a.textoBruto)).find(Boolean) || null;

  // Ambientes e tabela de cabos: dados de contexto geral do projeto (a mesma
  // planta de fundo se repete em todo desenho, e o padrão de tabela de cabos
  // é específico o bastante pra não ter risco real de contaminação) — sem
  // filtro por disciplina, ao contrário de câmera/rede/antena.
  const ambientes = analises.reduce((maior, a) => a.ambientes.length > maior.length ? a.ambientes : maior, []);
  const tabelaCabos = analises.find(a => a.tabelaCabos.length > 0)?.tabelaCabos || [];

  const totalCameras = somarPorDisciplina(analises, 'cftv', a => a.cameras.ocorrencias);
  const totalRede = somarPorDisciplina(analises, 'rede', a => a.pontosRedeAntena.rede.ocorrencias);
  const totalAntena = somarPorDisciplina(analises, 'antena', a => a.pontosRedeAntena.antena.ocorrencias);

  const achados = gerarAchados(analises);

  // Cada disciplina selecionada que não tem extração automática de
  // quantidade entra num único aviso — os símbolos de elétrica/iluminação/
  // telefonia/automação/alarme são gráficos, sem código de texto individual
  // (confirmado lendo um projeto real); rede/antena só entram aqui se não
  // foram encontrados em nenhum arquivo marcado com essa disciplina (quando
  // encontrados, já vêm preenchidos automaticamente).
  const faltando = [];
  if (disciplinasEfetivas.includes('rede') && totalRede === 0) faltando.push('pontos de rede');
  if (disciplinasEfetivas.includes('antena') && totalAntena === 0) faltando.push('pontos de TV/antena');
  if (disciplinasEfetivas.includes('alarme')) faltando.push('quantidades de alarme (sensores, sirene, teclado)');
  if (disciplinasEfetivas.includes('eletrica')) faltando.push('quantidades de elétrica (tomadas, quadros, disjuntores, cabos)');
  if (disciplinasEfetivas.includes('telefonia')) faltando.push('quantidades de telefonia');
  if (disciplinasEfetivas.includes('iluminacao')) faltando.push('quantidades de iluminação (luminárias, pontos)');
  if (disciplinasEfetivas.includes('automacao')) faltando.push('quantidades de automação');
  if (faltando.length > 0) {
    achados.push({
      tema: 'Quantidades a confirmar manualmente',
      observacao: `${faltando.join(', ')} não têm código de texto individual no(s) arquivo(s) analisado(s) — são símbolos gráficos no desenho (diferente de câmera/rede/antena, que usam código por ponto), não dá pra contar pelo texto do PDF sem arriscar inventar número. Os itens de "Serviços"/"Materiais" que dependem disso vieram com quantidade 0 — confirme direto na planta (ou no memorial/quadro de cargas, se houver) antes de gerar o relatório final.`,
    });
  }

  // Extração de equipamentos via IA: só vale a pena chamar o Gemini se o
  // texto tiver algum trecho "REF.:" (padrão de legenda de equipamento
  // nesses projetos) — evita uma chamada inteira (alguns segundos) quando
  // não há nada pra achar, independente da disciplina selecionada.
  const textoCombinado = analises.map(a => a.textoBruto).join('\n');
  const temLegendaDeEquipamento = /REF\.?:/i.test(textoCombinado);
  const equipamentos = temLegendaDeEquipamento ? await extrairEquipamentosDosArquivos(analises, achados) : [];
  const materiaisEquipamentos = await montarMateriais(equipamentos);
  const materiaisQuantitativos = montarMateriaisQuantitativos(analises);
  const materiais = [
    ...montarMateriaisInstalacaoPadrao(analises, disciplinasEfetivas),
    ...materiaisQuantitativos,
    ...materiaisEquipamentos,
  ];

  return {
    cliente,
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
    servicos: montarServicosPadrao(analises, disciplinasEfetivas, precosReferencia),
    materiais,
  };
}

module.exports = { analisarProjetoCompleto, extrairCliente, gerarAchados, montarServicosPadrao, compararComCatalogo };
