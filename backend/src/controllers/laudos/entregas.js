// Projetos e laudos por disciplina — o que o registro produz: o resumo do
// cálculo, os documentos da skill (Word/Excel, um a um ou todos para a pasta),
// as entregas do projeto (definições técnicas, as-built, DXF, QElectroTech e
// folha de entrega em PDF — na pasta ou em ZIP) e "ver/abrir a pasta".
const path = require('path');
const pool = require('../../config/database');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { listarDisciplinas, motorDaDisciplina, cad, tiposDocumento, entrega } = require('../../utils/disciplinasLaudo');
const { lerPedidoEntrega, ENTREGAS } = require('../../utils/projetoLaudo');
const { gerarPdfDeHtml } = require('../../services/pdfPuppeteer');
const { gerarFooterTemplate } = require('../../utils/pdfTemplate');
const { gerarHtmlFolhaEntrega } = require('../../utils/folhaEntregaTemplate');
const P = require('../../services/pastasSistema');
const { pastaDoLaudo, seguro, rotasDePasta } = require('../../services/pastasRegistros');
const { carregarLaudo, conferirUso, processarComMotor, erro400, nomeSeguroArquivo } = require('./comum');
const { montarPlanta, montarUnifilar } = require('./desenhos');
const { prepararFotos } = require('./fotos');

// ── Cálculo e documentos ────────────────────────────────────────────────────

async function calcular(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  res.json(motor.resumir(processarComMotor(motor, laudo.dados)));
}

// Gera os documentos pedidos do padrão da disciplina e grava cada um na pasta
// do laudo com nome fixo (o rótulo do documento) — a versão nova SOBRESCREVE a
// anterior, sem acumular cópias. Devolve os gerados (buffer e nomes).
async function gerarDocumentosDoLaudo(laudo, tipos) {
  const motor = motorDaDisciplina(laudo.disciplina);
  const preparado = await prepararFotos(laudo.id, laudo.dados);
  try {
    const resultado = processarComMotor(motor, preparado.dados);
    const pasta = await seguro(`pasta laudo ${laudo.id}`, () => pastaDoLaudo(laudo));
    const gerados = [];
    for (const tipo of tipos) {
      const doc = motor.documentos.find(d => d.tipo === tipo);
      let gerado;
      try {
        gerado = await motor.gerarDocumento(resultado, tipo);
      } catch (e) {
        const err = new Error(e.message);
        err.status = 400;
        throw err;
      }
      const extensao = path.extname(gerado.nomeArquivo) || '';
      const nomeNaPasta = `${P.nomeSeguro(doc?.rotulo || tipo)}${extensao}`;
      const gravado = pasta ? await seguro(`documento ${tipo} laudo ${laudo.id}`, () => P.gravarArquivo(pasta, nomeNaPasta, gerado.buffer)) : null;
      gerados.push({ tipo, ...gerado, nomeNaPasta, gravadoNaPasta: !!gravado });
    }
    return { gerados, pasta };
  } finally {
    preparado.limpar();
  }
}

async function documento(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  const tipo = req.params.tipo;
  const doc = motor.documentos.find(d => d.tipo === tipo);
  if (!doc) return res.status(400).json({ erro: 'Tipo de documento inválido.' });
  const erroUso = conferirUso(laudo, tiposDocumento().usoDoDocumento(laudo.disciplina, tipo), `"${doc.rotulo}"`);
  if (erroUso) return res.status(400).json({ erro: erroUso });
  const { gerados: [gerado] } = await gerarDocumentosDoLaudo(laudo, [tipo]);
  res.setHeader('Content-Type', gerado.mime);
  res.setHeader('Content-Disposition', contentDisposition(gerado.nomeArquivo));
  res.setHeader('X-Nome-Arquivo', encodeURIComponent(gerado.nomeArquivo));
  res.send(gerado.buffer);
}

// "Salvar documentos na pasta": gera TODOS os documentos do padrão da
// disciplina (Word e Excel) e grava na pasta do laudo, substituindo os anteriores.

async function salvarDocumentos(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  const motor = motorDaDisciplina(laudo.disciplina);
  // só os documentos do tipo do registro (projeto ou laudo)
  const T = tiposDocumento();
  const tipos = (motor.tiposDisponiveis ? motor.tiposDisponiveis(processarComMotor(motor, laudo.dados)) : motor.documentos.map(d => d.tipo))
    .filter(t => T.serve(T.usoDoDocumento(laudo.disciplina, t), laudo.tipo));
  const { gerados, pasta } = await gerarDocumentosDoLaudo(laudo, tipos);
  if (!pasta) return res.status(500).json({ erro: 'Não foi possível acessar a pasta do laudo (veja se ela está aberta em outro programa).' });
  res.json({ caminhoPasta: pasta, documentos: gerados.map(g => ({ tipo: g.tipo, arquivo: g.nomeNaPasta, gravado: g.gravadoNaPasta })) });
}

// ── Entregas do projeto (versão 2.1) ─────────────────────────────────────
// O projetista escolhe o que entregar (utils/projetoLaudo.js → ENTREGAS):
// definições técnicas (memorial e planilhas de projeto), as-built (a mesma
// documentação marcada AS BUILT), DXF (planta — DWG não é gerado), QElectroTech
// (unifilar) e PDF (folha de entrega com o resumo técnico). Os arquivos vão
// para <pasta do projeto>\Entrega (nomes fixos, sobrescritos a cada versão) e,
// pedido em ZIP, voltam num pacote só.

async function catalogoEntregas(req, res) {
  res.json(ENTREGAS);
}

async function montarEntrega(laudo, pedido, usuarioNome) {
  const motor = motorDaDisciplina(laudo.disciplina);
  const E = entrega();
  const T = tiposDocumento();
  const { asBuilt } = pedido;
  const prefixo = asBuilt ? 'AS BUILT - ' : '';
  const arquivos = []; // { nome, buffer, descricao }
  const notas = [];
  // dados "as built": revisão e data do as-built nos documentos (identificação)
  const laudoDoc = asBuilt
    ? { ...laudo, dados: { ...laudo.dados, meta: { ...(laudo.dados?.meta || {}), ...(asBuilt.revisao ? { revisao: asBuilt.revisao } : {}), data: asBuilt.data } } }
    : laudo;

  if (pedido.itens.includes('definicoes')) {
    const resultado = processarComMotor(motor, laudoDoc.dados);
    const disponiveis = motor.tiposDisponiveis ? motor.tiposDisponiveis(resultado) : motor.documentos.map(d => d.tipo);
    // documentos SÓ de projeto (os 'ambos', como a análise de risco do SPDA, também entram)
    const tipos = disponiveis.filter(t => T.serve(T.usoDoDocumento(laudo.disciplina, t), 'projeto'));
    for (const tipo of tipos) {
      const doc = motor.documentos.find(d => d.tipo === tipo);
      let gerado;
      try { gerado = await motor.gerarDocumento(resultado, tipo); } catch (e) { throw erro400(`${doc?.rotulo || tipo}: ${e.message}`); }
      const ext = path.extname(gerado.nomeArquivo) || (doc?.formato === 'Excel' ? '.xlsx' : '.docx');
      let buffer = gerado.buffer;
      if (asBuilt) buffer = ext === '.xlsx' ? await E.marcarAsBuiltXlsx(buffer, asBuilt) : await E.marcarAsBuiltDocx(buffer, asBuilt);
      arquivos.push({ nome: `${prefixo}${P.nomeSeguro(doc?.rotulo || tipo)}${ext}`, buffer, descricao: `${doc?.rotulo || tipo} (${doc?.formato || ext.slice(1)})` });
    }
    notas.push('O memorial em PDF é gerado pelo Word (Arquivo › Salvar como › PDF) — o sistema não converte Word em PDF.');
  }
  if (pedido.itens.includes('dxf')) {
    const p = await montarPlanta(laudoDoc, { asBuilt });
    arquivos.push({ nome: p.nome, buffer: p.buffer, descricao: 'Planta baixa com os pontos, legenda e carimbo — DXF (abre no AutoCAD; DWG não é gerado)' });
    if (p.naoEncontrados.length) notas.push(`Ambientes do formulário que não estão na arquitetura (sem pontos na planta): ${p.naoEncontrados.join('; ')}.`);
  }
  if (pedido.itens.includes('qet')) {
    const u = montarUnifilar(laudoDoc, { asBuilt });
    arquivos.push({ nome: u.nome, buffer: u.buffer, descricao: 'Diagrama unifilar — QElectroTech (.qet)' });
  }
  if (pedido.itens.includes('pdf')) {
    let resumo = null;
    try { resumo = motor.resumir(processarComMotor(motor, laudoDoc.dados)); } catch { /* sem resumo: a folha avisa */ }
    const nomeDisc = (listarDisciplinas().find(d => d.chave === laudo.disciplina)?.nome || laudo.disciplina);
    const nomePdf = `${prefixo}Folha de entrega.pdf`;
    const html = gerarHtmlFolhaEntrega({
      disciplina: nomeDisc, titulo: laudo.titulo, dados: laudoDoc.dados, resumo, asBuilt, emitidoPor: usuarioNome,
      arquivos: [...arquivos.map(a => ({ nome: a.nome, descricao: a.descricao })), { nome: nomePdf, descricao: 'Esta folha de entrega (PDF)' }],
      notas,
    });
    const pdf = await gerarPdfDeHtml(html, {
      margin: { top: '10mm', bottom: '22mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: gerarFooterTemplate(),
    });
    arquivos.push({ nome: nomePdf, buffer: pdf, descricao: 'Folha de entrega com a lista dos arquivos e o resumo técnico (PDF)' });
  }
  return arquivos;
}

// POST /laudos/:id/entrega?destino=zip|pasta
// body: { itens: ['definicoes','asbuilt','dxf','qet','pdf'], as_built: { data, revisao } }
async function gerarEntrega(req, res) {
  const laudo = await carregarLaudo(req.params.id);
  if (!laudo) return res.status(404).json({ erro: 'Registro não encontrado.' });
  if (laudo.tipo !== 'projeto') return res.status(400).json({ erro: 'As entregas (definições técnicas, as-built, DXF, QElectroTech, PDF) são do PROJETO; este registro é um laudo.' });
  const C = cad();
  const pedido = lerPedidoEntrega(req.body, { temPlanta: !!C.PLANTAS[laudo.disciplina], temUnifilar: !!C.UNIFILARES[laudo.disciplina] });
  if (pedido.erro) return res.status(400).json({ erro: pedido.erro });
  const arquivos = await montarEntrega(laudo, pedido, req.usuario.nome);
  // lembra a escolha (a tela abre com as mesmas entregas marcadas)
  await pool.query('UPDATE laudos_projetos SET entregas = $1 WHERE id = $2', [{ itens: pedido.escolhidos, as_built: pedido.asBuilt, gerado_em: new Date().toISOString() }, laudo.id]);
  // cópia na pasta do projeto: <pasta>\Entrega\<arquivo> (nome fixo, sobrescreve)
  let gravados = 0;
  const pasta = await seguro(`entrega ${laudo.id}`, () => pastaDoLaudo(laudo));
  if (pasta) {
    for (const a of arquivos) if (await seguro(`entrega ${laudo.id} ${a.nome}`, () => P.gravarArquivo(path.join(pasta, 'Entrega'), a.nome, a.buffer))) gravados++;
  }
  if (req.query.destino === 'pasta') {
    if (!pasta) return res.status(500).json({ erro: 'Não foi possível acessar a pasta do projeto (veja se ela está aberta em outro programa).' });
    return res.json({ caminhoPasta: path.join(pasta, 'Entrega'), arquivos: arquivos.map(a => a.nome), gravados });
  }
  const zip = await entrega().zipar(arquivos);
  const nomeZip = `${pedido.asBuilt ? 'AS BUILT - ' : ''}Entrega - ${nomeSeguroArquivo(laudo.titulo)} - ${laudo.disciplina}.zip`;
  res.set({
    'Content-Type': 'application/zip', 'Content-Disposition': contentDisposition(nomeZip), 'X-Nome-Arquivo': encodeURIComponent(nomeZip),
    'X-Arquivos': encodeURIComponent(arquivos.map(a => a.nome).join('; ')), 'X-Gravados-Na-Pasta': String(gravados),
  });
  res.send(zip);
}

// pasta do projeto/laudo e "abrir no Explorer" (pastasRegistros.rotasDePasta)
const { pasta, abrirPasta } = rotasDePasta({ carregar: carregarLaudo, pastaDe: pastaDoLaudo, naoEncontrado: 'Registro não encontrado.' });

module.exports = {
  calcular, documento, salvarDocumentos, catalogoEntregas, gerarEntrega, pasta, abrirPasta,
};
