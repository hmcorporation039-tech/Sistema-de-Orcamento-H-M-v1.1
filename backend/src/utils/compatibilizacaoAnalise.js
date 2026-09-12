const pool = require('../config/database');
const { analisarProjeto } = require('./projetoParser');
const { extrairEquipamentosComIA } = require('./equipamentoExtratorIA');

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
function gerarAchados(analises) {
  const achados = [];

  for (const a of analises) {
    if (a.cameras.ocorrencias === 0) continue;

    if (a.cameras.repetidas.length > 0) {
      achados.push({
        tema: 'Câmeras: numeração repetida',
        observacao: `Em "${a.arquivo}", os códigos ${a.cameras.repetidas.map(n => 'CAM' + n).join(', ')} aparecem mais de uma vez na planta. Confirme visualmente se são câmeras físicas distintas com número repetido por engano (contagem real = ${a.cameras.ocorrencias}) ou duplicidade de rótulo (contagem real = ${a.cameras.total}).`,
      });
    }
    if (a.cameras.faltando.length > 0) {
      achados.push({
        tema: 'Câmeras: numeração com falha',
        observacao: `Em "${a.arquivo}", a numeração vai até CAM${Math.max(...a.cameras.unicas)} mas ${a.cameras.faltando.map(n => 'CAM' + n).join(', ')} não aparece — provável falha de numeração do projetista, não necessariamente câmera faltando.`,
      });
    }
  }

  const arquivosComCamera = analises.filter(a => a.cameras.ocorrencias > 0).map(a => a.arquivo);
  const arquivosSemCamera = analises.filter(a => a.cameras.ocorrencias === 0).map(a => a.arquivo);
  if (arquivosComCamera.length > 0 && arquivosSemCamera.length > 0 && analises.length > 1) {
    achados.push({
      tema: 'Arquivo sem câmeras identificadas',
      observacao: `${arquivosSemCamera.join(', ')} não tem nenhum código de câmera (CAMx) no texto — confirme se é realmente uma prancha de CFTV ou se é outra disciplina (ex.: alarme, cabeamento) enviada com nome parecido.`,
    });
  }

  return achados;
}

// Monta a lista completa de serviços (mão de obra) candidatos, na mesma
// estrutura usada nos orçamentos de referência da empresa: dividida em
// "Cabeamento / Rede / CFTV" e "Alarme". Cada item tem "pronto" (já
// executado / não orçar) editável pelo usuário — no cabeamento estruturado,
// por exemplo, o padrão é vir como pendente, mas dá pra marcar como já
// pronto quando for o caso (projeto onde só falta a parte elétrica, cabo já
// passado, etc.).
//
// Só a quantidade de câmeras vem preenchida automaticamente (tem código
// individual — CAMx — no desenho, dá pra contar com confiança). Pontos de
// rede/TV e quantidades de alarme (sensores, sirene, teclado) não têm
// código individual nesses projetos — não tem como contar pelo texto do
// PDF sem arriscar inventar número. Ficam com quantidade 0 e um aviso pra
// o usuário confirmar direto na planta antes de fechar.
function montarServicosPadrao(analises) {
  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  const SEM_CODIGO = 'Sem código individual no desenho — confirme a quantidade direto na planta antes de fechar.';

  const item = (descricao, quantidade, unidade, subgrupo, observacao) => ({
    descricao, quantidade, unidade, subgrupo, pronto: false, observacao,
  });

  return [
    item('Conectorização de ponto de rede/dados (RJ-45 + patch panel + teste)', 0, 'pt', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Conectorização de ponto de câmera (RJ-45 + patch panel + teste)', totalCameras, 'pt', 'Cabeamento / Rede / CFTV',
      totalCameras > 0 ? `Quantidade = total de códigos de câmera (CAMx) encontrados no desenho. Confira duplicatas/numeração antes de fechar (veja Compatibilização).` : SEM_CODIGO),
    item('Conectorização de ponto de TV/antena (conector coaxial RG-6)', 0, 'pt', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Instalação/config. de câmera interna (dome)', 0, 'un', 'Cabeamento / Rede / CFTV',
      totalCameras > 0 ? `Total de câmeras no desenho: ${totalCameras} — divida entre interna/externa aqui.` : SEM_CODIGO),
    item('Instalação/config. de câmera externa (bullet)', 0, 'un', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Montagem e organização dos racks (patch panels, guias, PDU)', 0, 'un', 'Cabeamento / Rede / CFTV', 'Confirme quantos racks o projeto prevê.'),
    item('Instalação e config. de switches', 0, 'un', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Instalação e config. de access points (Wi-Fi)', 0, 'un', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Instalação de nobreaks + kit de ventilação', 0, 'un', 'Cabeamento / Rede / CFTV', SEM_CODIGO),
    item('Certificação e etiquetagem dos pontos (rede + câmeras)', totalCameras, 'pt', 'Cabeamento / Rede / CFTV',
      'Quantidade inicial = só câmeras; some os pontos de rede/TV depois de confirmar.'),
    item('Instalação de sensor de abertura (magnético) porta/janela', 0, 'un', 'Alarme', SEM_CODIGO),
    item('Instalação de sensor infravermelho passivo (IVP)', 0, 'un', 'Alarme', SEM_CODIGO),
    item('Instalação de sirene', 0, 'un', 'Alarme', SEM_CODIGO),
    item('Instalação de teclado de comando', 0, 'un', 'Alarme', SEM_CODIGO),
    item('Instalação de repetidor de sinal', 0, 'un', 'Alarme', SEM_CODIGO),
    item('Instalação e configuração da central de alarme', 0, 'un', 'Alarme', 'Normalmente 1 unidade — confirme.'),
    item('Passagem de cabeamento (infraestrutura + lançamento de cabos)', 1, 'vb', 'Geral',
      'Marque como "já pronto" se o cabeamento já estiver passado no local (não entra na mão de obra).'),
  ];
}

// Lista padrão de material de instalação (Bloco 2 nos orçamentos de
// referência) — itens de terminação/fixação que não vêm de nenhuma cotação
// de fornecedor, calculados a partir dos pontos do projeto. Como os pontos
// de rede/TV ainda não são conhecidos automaticamente (veja acima), fica
// como checklist com quantidade 0 e a fórmula na observação, pra o usuário
// calcular rápido depois de confirmar os pontos.
function montarMateriaisInstalacaoPadrao(analises) {
  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);

  const item = (descricao, quantidade, unidade, observacao) => ({
    descricao, quantidade, unidade, subgrupo: 'Material de Instalação', pronto: false, observacao,
    referencia_fabricante: null, preco_catalogo: null, material_id: null, confianca_catalogo: null,
  });

  return [
    item('Keystone/jack RJ-45 Cat.6 (lado usuário — pontos de rede)', 0, 'un', 'Quantidade = nº de pontos de rede.'),
    item('Espelho/placa 4x2 + suporte (pontos de rede)', 0, 'un', 'Quantidade = nº de pontos de rede.'),
    item('Tomada coaxial RG-6 + conector (TV/antena)', 0, 'un', 'Quantidade = nº de pontos de TV/antena.'),
    item('Plug RJ-45 Cat.6 (terminação de câmeras) + reserva', totalCameras > 0 ? totalCameras + 24 : 0, 'un',
      totalCameras > 0 ? `Quantidade = câmeras (${totalCameras}) + reserva estimada (24) — ajuste conforme necessário.` : 'Quantidade = nº de câmeras + reserva.'),
    item('Suporte/braço de fixação p/ câmera externa (bullet)', 0, 'un', 'Quantidade = nº de câmeras externas (bullet).'),
    item('Identificação (etiquetas/anilhas), abraçadeiras, parafusos e miudezas', 1, 'vb', 'Verba — ajuste conforme o porte do projeto.'),
  ];
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
    };
  });
}

async function analisarProjetoCompleto(arquivos) {
  // arquivos: [{ buffer, nomeArquivo }]
  const analises = [];
  for (const { buffer, nomeArquivo } of arquivos) {
    analises.push(await analisarProjeto(buffer, nomeArquivo));
  }

  const cliente = analises.map(a => extrairCliente(a.textoBruto)).find(Boolean) || null;

  // Ambientes: como os mesmos arquivos de um projeto costumam repetir a planta
  // de fundo (todas as pranchas mostram os mesmos ambientes), usa a lista do
  // arquivo com mais ambientes encontrados em vez de somar tudo (evitaria duplicar).
  const ambientes = analises.reduce((maior, a) => a.ambientes.length > maior.length ? a.ambientes : maior, []);

  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  const tabelaCabos = analises.find(a => a.tabelaCabos.length > 0)?.tabelaCabos || [];

  const achados = gerarAchados(analises);
  achados.push({
    tema: 'Quantidades a confirmar manualmente',
    observacao: 'Pontos de rede/TV e quantidades de alarme (sensores, sirene, teclado) não têm código individual nesses desenhos — diferente das câmeras (CAMx), não dá pra contar pelo texto do PDF sem arriscar inventar número. Os itens de "Serviços" e "Material de Instalação" que dependem disso vieram com quantidade 0 — confirme direto na planta antes de gerar o relatório final.',
  });
  const equipamentos = await extrairEquipamentosDosArquivos(analises, achados);
  const materiaisEquipamentos = await montarMateriais(equipamentos);
  const materiais = [...montarMateriaisInstalacaoPadrao(analises), ...materiaisEquipamentos];

  return {
    cliente,
    arquivosAnalisados: analises.map(a => a.arquivo),
    ambientes,
    cameras: {
      total: totalCameras,
      detalhePorArquivo: analises.filter(a => a.cameras.ocorrencias > 0).map(a => ({ arquivo: a.arquivo, ...a.cameras })),
    },
    tabelaCabos,
    achados,
    servicos: montarServicosPadrao(analises),
    materiais,
  };
}

module.exports = { analisarProjetoCompleto, extrairCliente, gerarAchados, montarServicosPadrao, compararComCatalogo };
