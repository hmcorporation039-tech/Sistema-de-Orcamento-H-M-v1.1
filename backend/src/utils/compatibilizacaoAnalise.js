const pool = require('../config/database');
const { analisarProjeto } = require('./projetoParser');
const { extrairEquipamentosComIA } = require('./equipamentoExtratorIA');
const { nomeDaDisciplina } = require('./disciplinasProjeto');

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
    const menorTamanho = Math.min(setAlvo.size, setMat.size);
    const score = comuns / menorTamanho;

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

// `disciplinas`: chaves selecionadas pelo usuário (ver utils/disciplinasProjeto.js).
// A extração por regex sempre roda (é grátis e instantânea), mas um achado só
// é gerado se a disciplina correspondente foi selecionada — senão o usuário
// que só quer analisar, por exemplo, Elétrica, veria pendências de CFTV que
// não pediu pra ver.
function gerarAchados(analises, disciplinas) {
  const achados = [];

  for (const a of analises) {
    if (disciplinas.includes('cftv') && a.cameras.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.cameras, 'CAM', 'Câmeras'));
    }
    if (disciplinas.includes('rede') && a.pontosRedeAntena.rede.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.pontosRedeAntena.rede, 'R', 'Pontos de rede'));
    }
    if (disciplinas.includes('antena') && a.pontosRedeAntena.antena.ocorrencias > 0) {
      achados.push(...achadosDeNumeracao(a.arquivo, a.pontosRedeAntena.antena, 'A', 'Pontos de antena/TV'));
    }
  }

  if (disciplinas.includes('cftv')) {
    const arquivosComCamera = analises.filter(a => a.cameras.ocorrencias > 0).map(a => a.arquivo);
    const arquivosSemCamera = analises.filter(a => a.cameras.ocorrencias === 0).map(a => a.arquivo);
    if (arquivosComCamera.length > 0 && arquivosSemCamera.length > 0 && analises.length > 1) {
      achados.push({
        tema: 'Arquivo sem câmeras identificadas',
        observacao: `${arquivosSemCamera.join(', ')} não tem nenhum código de câmera (CAMx) no texto — confirme se é realmente uma prancha de CFTV ou se é outra disciplina (ex.: alarme, cabeamento) enviada com nome parecido.`,
      });
    }
  }

  return achados;
}

// Monta a lista completa de serviços (mão de obra) candidatos, na mesma
// estrutura usada nos orçamentos de referência da empresa. Cada item tem
// "pronto" (já executado / não orçar) editável pelo usuário, e agora também
// uma "disciplina" (ver utils/disciplinasProjeto.js) — o subgrupo visual
// exibido na tela/relatório é o nome dessa disciplina, e só entram na lista
// final os itens cuja disciplina foi selecionada pelo usuário.
//
// Câmeras, pontos de rede e pontos de antena/TV vêm preenchidos
// automaticamente quando o desenho usa código individual por ponto (CAMx,
// Rx, Ax) — já validado que esses códigos aparecem como texto direto no
// PDF, sem precisar de IA nem risco de inventar número. As demais
// disciplinas (Elétrica, Telefonia, Iluminação, Automação, Alarme) ainda não
// têm nenhuma extração automática nesses projetos — ficam com quantidade 0 e
// aviso pra confirmar direto na planta, mesmo padrão que Alarme já usava.
function montarServicosPadrao(analises, disciplinas) {
  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  const totalRede = analises.reduce((s, a) => s + a.pontosRedeAntena.rede.ocorrencias, 0);
  const totalAntena = analises.reduce((s, a) => s + a.pontosRedeAntena.antena.ocorrencias, 0);
  const SEM_CODIGO = 'Sem código individual no desenho — confirme a quantidade direto na planta antes de fechar.';

  const item = (descricao, quantidade, unidade, disciplina, observacao) => ({
    descricao, quantidade, unidade, subgrupo: nomeDaDisciplina(disciplina), disciplina, pronto: false, observacao,
  });

  const todos = [
    // Redes de Computadores (dados)
    item('Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', totalRede, 'pt', 'rede',
      totalRede > 0 ? 'Quantidade = total de códigos de ponto de rede (Rx) encontrados no desenho.' : SEM_CODIGO),
    item('Instalação e config. de switches', 0, 'un', 'rede', SEM_CODIGO),
    item('Instalação e config. de access points (Wi-Fi)', 0, 'un', 'rede', SEM_CODIGO),

    // CFTV
    item('Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', totalCameras, 'pt', 'cftv',
      totalCameras > 0 ? 'Quantidade = total de códigos de câmera (CAMx) encontrados no desenho. Confira duplicatas/numeração antes de fechar (veja Compatibilização).' : SEM_CODIGO),
    item('Instalação/config. de câmera interna (dome)', 0, 'un', 'cftv',
      totalCameras > 0 ? `Total de câmeras no desenho: ${totalCameras} — divida entre interna/externa aqui.` : SEM_CODIGO),
    item('Instalação/config. de câmera externa (bullet)', 0, 'un', 'cftv', SEM_CODIGO),

    // Antena/TV
    item('Conectorização de ponto de TV/antena (conector coaxial RG-6)', totalAntena, 'pt', 'antena',
      totalAntena > 0 ? 'Quantidade = total de códigos de ponto de antena/TV (Ax) encontrados no desenho.' : SEM_CODIGO),

    // Infraestrutura de Cabeamento Estruturado (compartilhada por rede/CFTV/telefonia)
    item('Montagem e organização dos racks (patch panels, guias, PDU)', 0, 'un', 'cabeamento', 'Confirme quantos racks o projeto prevê.'),
    item('Instalação de nobreaks + kit de ventilação', 0, 'un', 'cabeamento', SEM_CODIGO),
    item('Certificação e etiquetagem dos pontos (rede + câmeras + telefonia)', totalRede + totalCameras, 'pt', 'cabeamento',
      (totalRede > 0 || totalCameras > 0) ? 'Quantidade = pontos de rede + câmeras encontrados no desenho.' : SEM_CODIGO),
    item('Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb', 'cabeamento',
      'Marque como "já pronto" se o cabeamento já estiver passado no local (não entra na mão de obra).'),

    // Telefonia
    item('Conectorização de ponto de telefonia (RJ-11/RJ-45 + teste)', 0, 'pt', 'telefonia', SEM_CODIGO),
    item('Instalação de central telefônica / PABX', 0, 'un', 'telefonia', SEM_CODIGO),

    // Elétrica
    item('Instalação de quadro de distribuição e disjuntores', 0, 'un', 'eletrica', SEM_CODIGO),
    item('Passagem de eletrodutos e fiação (circuitos de tomada/força)', 1, 'vb', 'eletrica',
      'Marque como "já pronto" se a infraestrutura elétrica já estiver executada.'),
    item('Instalação de tomadas e interruptores', 0, 'un', 'eletrica', SEM_CODIGO),

    // Iluminação
    item('Instalação de luminárias', 0, 'un', 'iluminacao', SEM_CODIGO),
    item('Instalação de interruptores/dimmers de iluminação', 0, 'un', 'iluminacao', SEM_CODIGO),

    // Automação
    item('Instalação e configuração de central de automação', 0, 'un', 'automacao', SEM_CODIGO),
    item('Instalação de atuadores/módulos de automação (tomadas, cortinas, cenas)', 0, 'un', 'automacao', SEM_CODIGO),

    // Alarme
    item('Instalação de sensor de abertura (magnético) porta/janela', 0, 'un', 'alarme', SEM_CODIGO),
    item('Instalação de sensor infravermelho passivo (IVP)', 0, 'un', 'alarme', SEM_CODIGO),
    item('Instalação de sirene', 0, 'un', 'alarme', SEM_CODIGO),
    item('Instalação de teclado de comando', 0, 'un', 'alarme', SEM_CODIGO),
    item('Instalação de repetidor de sinal', 0, 'un', 'alarme', SEM_CODIGO),
    item('Instalação e configuração da central de alarme', 0, 'un', 'alarme', 'Normalmente 1 unidade — confirme.'),
  ];

  return todos.filter(it => disciplinas.includes(it.disciplina));
}

// Lista padrão de material de instalação (Bloco 2 nos orçamentos de
// referência) — itens de terminação/fixação que não vêm de nenhuma cotação
// de fornecedor, calculados a partir dos pontos do projeto (câmeras, rede e
// antena/TV, quando o desenho tem código individual para eles). Cada item
// também carrega a disciplina, pro mesmo filtro usado em montarServicosPadrao.
function montarMateriaisInstalacaoPadrao(analises, disciplinas) {
  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  const totalRede = analises.reduce((s, a) => s + a.pontosRedeAntena.rede.ocorrencias, 0);
  const totalAntena = analises.reduce((s, a) => s + a.pontosRedeAntena.antena.ocorrencias, 0);

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
  ];

  return todos.filter(it => disciplinas.includes(it.disciplina));
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
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true'
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

async function analisarProjetoCompleto(arquivos, disciplinas) {
  // arquivos: [{ buffer, nomeArquivo }]
  // Cada arquivo é lido/analisado em paralelo (pdf-parse + regex é I/O-bound
  // e independente por arquivo) — antes rodava um de cada vez (sequencial),
  // o que somava o tempo de N arquivos à toa.
  const analises = await Promise.all(
    arquivos.map(({ buffer, nomeArquivo }) => analisarProjeto(buffer, nomeArquivo))
  );

  const cliente = analises.map(a => extrairCliente(a.textoBruto)).find(Boolean) || null;

  // Ambientes: como os mesmos arquivos de um projeto costumam repetir a planta
  // de fundo (todas as pranchas mostram os mesmos ambientes), usa a lista do
  // arquivo com mais ambientes encontrados em vez de somar tudo (evitaria duplicar).
  const ambientes = analises.reduce((maior, a) => a.ambientes.length > maior.length ? a.ambientes : maior, []);

  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  const totalRede = analises.reduce((s, a) => s + a.pontosRedeAntena.rede.ocorrencias, 0);
  const totalAntena = analises.reduce((s, a) => s + a.pontosRedeAntena.antena.ocorrencias, 0);
  const tabelaCabos = analises.find(a => a.tabelaCabos.length > 0)?.tabelaCabos || [];

  const achados = gerarAchados(analises, disciplinas);

  // Cada disciplina selecionada que não tem extração automática de
  // quantidade entra num único aviso — alarme nunca tem código individual
  // nesses projetos (confirmado em vários arquivos reais); rede/antena só
  // entram aqui se não foram encontrados neste projeto específico (quando
  // encontrados, já vêm preenchidos automaticamente).
  const faltando = [];
  if (disciplinas.includes('rede') && totalRede === 0) faltando.push('pontos de rede');
  if (disciplinas.includes('antena') && totalAntena === 0) faltando.push('pontos de TV/antena');
  if (disciplinas.includes('alarme')) faltando.push('quantidades de alarme (sensores, sirene, teclado)');
  if (disciplinas.includes('eletrica')) faltando.push('quantidades de elétrica (pontos, quadros, disjuntores)');
  if (disciplinas.includes('telefonia')) faltando.push('quantidades de telefonia');
  if (disciplinas.includes('iluminacao')) faltando.push('quantidades de iluminação (luminárias, pontos)');
  if (disciplinas.includes('automacao')) faltando.push('quantidades de automação');
  if (faltando.length > 0) {
    achados.push({
      tema: 'Quantidades a confirmar manualmente',
      observacao: `${faltando.join(', ')} não têm código individual identificado neste projeto — diferente das câmeras/rede/antena quando o desenho traz código por ponto, não dá pra contar pelo texto do PDF sem arriscar inventar número. Os itens de "Serviços" que dependem disso vieram com quantidade 0 — confirme direto na planta antes de gerar o relatório final.`,
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
  const materiais = [...montarMateriaisInstalacaoPadrao(analises, disciplinas), ...materiaisEquipamentos];

  return {
    cliente,
    disciplinas,
    arquivosAnalisados: analises.map(a => a.arquivo),
    ambientes,
    cameras: {
      total: totalCameras,
      detalhePorArquivo: analises.filter(a => a.cameras.ocorrencias > 0).map(a => ({ arquivo: a.arquivo, ...a.cameras })),
    },
    pontosRedeAntena: {
      rede: { total: totalRede },
      antena: { total: totalAntena },
    },
    tabelaCabos,
    achados,
    servicos: montarServicosPadrao(analises, disciplinas),
    materiais,
  };
}

module.exports = { analisarProjetoCompleto, extrairCliente, gerarAchados, montarServicosPadrao, compararComCatalogo };
