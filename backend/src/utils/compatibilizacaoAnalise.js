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

// Monta a lista de serviços (mão de obra) candidatos a partir do que foi
// extraído com confiança. Cada serviço tem "pronto" (já executado / não
// orçar) editável pelo usuário antes de gerar o relatório final — no
// cabeamento estruturado, por exemplo, o padrão é vir como pendente, mas o
// usuário pode marcar como já pronto quando for o caso (projeto onde só a
// parte elétrica falta, cabo já passado, etc.).
function montarServicosPadrao(analises) {
  const servicos = [];

  const totalCameras = analises.reduce((s, a) => s + a.cameras.ocorrencias, 0);
  if (totalCameras > 0) {
    servicos.push({
      descricao: 'Instalação e configuração de câmeras',
      quantidade: totalCameras,
      unidade: 'un',
      pronto: false,
      observacao: 'Quantidade = total de códigos de câmera encontrados no(s) desenho(s). Confira duplicatas/numeração antes de fechar (veja Compatibilização).',
    });
  }

  servicos.push({
    descricao: 'Passagem de cabeamento (infraestrutura + lançamento de cabos)',
    quantidade: 1,
    unidade: 'vb',
    pronto: false,
    observacao: 'Marque como "já pronto" se o cabeamento já estiver passado no local (não entra na mão de obra).',
  });

  return servicos;
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
  const equipamentos = await extrairEquipamentosDosArquivos(analises, achados);
  const materiais = await montarMateriais(equipamentos);

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
