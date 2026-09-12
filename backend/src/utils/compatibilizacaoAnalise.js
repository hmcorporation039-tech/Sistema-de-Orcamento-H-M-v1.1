const { analisarProjeto } = require('./projetoParser');

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

  return {
    cliente,
    arquivosAnalisados: analises.map(a => a.arquivo),
    ambientes,
    cameras: {
      total: totalCameras,
      detalhePorArquivo: analises.filter(a => a.cameras.ocorrencias > 0).map(a => ({ arquivo: a.arquivo, ...a.cameras })),
    },
    tabelaCabos,
    achados: gerarAchados(analises),
    servicos: montarServicosPadrao(analises),
    materiais: [],
  };
}

module.exports = { analisarProjetoCompleto, extrairCliente, gerarAchados, montarServicosPadrao };
