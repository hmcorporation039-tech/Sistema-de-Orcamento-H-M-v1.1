// Análise de Projeto — achados de compatibilização (pendências e observações
// para o usuário conferir: arquivo sem texto, numeração repetida ou com falha,
// contagem pelo desenho, blocos não identificados…) e o detalhe por arquivo
// dos pontos codificados. Funções puras, chamadas por
// services/compatibilizacaoAnalise.js.
const { nomeDaDisciplina } = require('./disciplinasProjeto');
const { semMarcador, metrosBR, temDisciplina } = require('./analiseProjetoItens');

// Monta o detalhe por arquivo de um tipo de ponto codificado (câmera, rede ou
// antena) — mesma tabela que já existia só para câmeras, agora reutilizada
// pros três tipos, pra não deixar rede/antena com só um número solto no
// relatório sem dizer quais códigos foram encontrados nem em qual arquivo.
// O prefixo do código (CAM/R/A) não entra aqui — quem exibe já sabe qual é
// pelo tipo de ponto que está montando (ver relatorioCompatibilizacaoTemplate
// e a tela de Análise de Projeto).
function detalhePorArquivo(analises, disciplina, obterDados) {
  return analises
    .filter(a => temDisciplina(a.disciplinas, disciplina) && obterDados(a).ocorrencias > 0)
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
  // repetição LONGE (posição no PDF, projetoParser.comRepeticoesPorPosicao) já
  // conta como pontos distintos; a colada (mesmo ponto, rótulo duplicado), uma vez
  const distantes = dados.repetidasDistantes || [];
  const unicos = dados.totalUnicos ?? dados.total;
  if (distantes.length > 0) {
    const pag = (r) => (r.paginas?.length ? ` (pág. ${r.paginas.join(', ')})` : '');
    achados.push({
      tema: `${rotulo}: mesmo código em pontos distantes`,
      observacao: `Em "${arquivo}", ${distantes.map(r => `${prefixo}${r.numero} aparece em ${r.pontos} pontos distantes${pag(r)}`).join('; ')}: contados ${dados.total} pontos (${unicos} números únicos). Confirme na planta: se forem o mesmo ponto rotulado duas vezes, o certo é ${unicos}.`,
    });
  }
  const coladas = (dados.repetidas || []).filter(n => !distantes.some(r => r.numero === n));
  if (coladas.length > 0) {
    achados.push({
      tema: `${rotulo}: numeração repetida`,
      observacao: `Em "${arquivo}", os códigos ${coladas.map(n => prefixo + n).join(', ')} aparecem mais de uma vez na planta${dados.repetidasDistantes ? ', perto um do outro (contados uma vez)' : ''}. Confirme visualmente se são pontos físicos distintos com número repetido por engano (contagem real = ${dados.ocorrencias}) ou duplicidade de rótulo (contagem real = ${dados.total}).`,
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
    // quadro de cargas no arquivo e nenhum circuito lido: os disjuntores e a ponte
    // para a skill ficam sem dados — antes o achado dizia que "continuava sendo lido"
    if (a.quadroCargasNaoLido) {
      achados.push({
        tema: 'Quadro de cargas presente e não lido',
        observacao: `"${a.arquivo}" tem quadro de cargas, mas nenhum circuito foi lido (formato de tabela não reconhecido). Disjuntores, quadros e o cálculo da NBR 5410 ficam sem esses dados — confira o quadro direto no PDF e lance os circuitos.`,
      });
    }
    // quantidade "1.200" sem vírgula: milhar ou 1,2? (utils/leitoresTabelaProjeto.js)
    const ambiguas = a.quantidadesAmbiguas?.length ? a.quantidadesAmbiguas : (a.listaMateriais || []).filter(it => it.qtdAmbigua);
    if (ambiguas.length) {
      const fmt = (n) => String(n).replace('.', ',');
      achados.push({
        tema: 'Quantidade com ponto: milhar ou decimal?',
        observacao: `"${a.arquivo}": ${ambiguas.slice(0, 10).map(it => `${String(it.descricao || '').slice(0, 60)} — lido ${fmt(it.qtd)} ${it.unidade || ''}`.trim() + (it.qtdAlternativa != null ? ` (seria ${fmt(it.qtdAlternativa)} se o ponto for separador de milhar)` : '')).join('; ')}${ambiguas.length > 10 ? ` (+${ambiguas.length - 10})` : ''}. Confira na lista do projeto antes de fechar.`,
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
    if (temDisciplina(a.disciplinas, 'rede') && a.pontosRedeAntena.rede.ocorrencias > 0) {
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

// opcoes.maxPaginas: até quantas folhas o PDF vetorial é lido (services/compatibilizacaoAnalise.js)
function achadosDoDesenho(analises, vetoriais, opcoes = {}) {
  const achados = [];
  analises.forEach((a, i) => {
    // folhas além do limite não eram lidas e sumiam sem aviso (revisão de 29/10/2026)
    const totalPaginas = a.textoPorPagina?.length || 0;
    const lidas = new Set((vetoriais[i] || []).filter(p => p.origem !== 'cad' && p.pagina).map(p => p.pagina));
    if (!a.origemCad && !a.semTexto && opcoes.maxPaginas && totalPaginas > opcoes.maxPaginas && lidas.size) {
      const fora = [];
      for (let n = 1; n <= totalPaginas; n++) if (!lidas.has(n)) fora.push(n);
      if (fora.length) {
        const faixa = fora.length > 1 && fora[fora.length - 1] - fora[0] === fora.length - 1 ? `${fora[0]} a ${fora[fora.length - 1]}` : fora.join(', ');
        achados.push({
          tema: 'Folhas do PDF não lidas pelo desenho',
          observacao: `"${a.arquivo}" tem ${totalPaginas} folhas e a contagem pelo desenho lê só as ${opcoes.maxPaginas} primeiras: folha(s) ${faixa} ficaram de fora (símbolos e metragens não contados). O texto delas (códigos, quadro de cargas, lista) foi lido. Confira essas folhas na planta ou envie-as em arquivo separado.`,
        });
      }
    }
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

// O que é cada folha (utils/classificarPranchaPdf.js e, no DWG/DXF,
// skills/_comum/cad/classificarPrancha.js) — "folha 3: diagrama unifilar —
// ignorada no 3D". Só quando há folha que não é planta (ou mista): projeto só de
// plantas não ganha achado à toa.
function achadosDasFolhas(analises, vetoriais) {
  const achados = [];
  analises.forEach((a, i) => {
    const folhas = (vetoriais[i] || []).filter(p => p.folha);
    if (!folhas.some(p => p.folha.semPlanta || p.folha.misto)) return;
    const frase = (p) => {
      const nome = p.origem === 'cad' ? 'desenho' : `folha ${p.pagina}`;
      if (p.folha.semPlanta) return `${nome}: ${p.folha.resumo} — ignorada no 3D, nos ambientes e na contagem de símbolos`;
      if (p.folha.temPlanta && p.folha.misto) return `${nome}: ${p.folha.resumo} — só a planta entra no 3D e na contagem`;
      return `${nome}: ${p.folha.resumo}`;
    };
    // o que aconteceu com o quadro de cargas: lido (quantos), presente e não lido, ou nenhum
    const circuitos = (a.quadroCargas || []).filter(c => !c.alimentador).length;
    const nQuadros = a.quadrosDeCargas?.length || 0;
    const sobreQuadro = a.quadroCargasNaoLido
      ? ' Quadro de cargas presente e não lido — confira os circuitos direto no PDF.'
      : circuitos ? ` Quadro de cargas lido pelo texto: ${circuitos} circuito(s)${nQuadros > 1 ? ` em ${nQuadros} quadros` : ''}.` : '';
    achados.push({
      tema: 'Folhas do projeto (planta × diagrama × quadro)',
      observacao: `"${a.arquivo}": ${folhas.map(frase).join('; ')}.${sobreQuadro} Confira se a classificação bate com as pranchas.`,
    });
  });
  return achados;
}

module.exports = { detalhePorArquivo, gerarAchados, achadosDoDesenho, achadosDasFolhas };
