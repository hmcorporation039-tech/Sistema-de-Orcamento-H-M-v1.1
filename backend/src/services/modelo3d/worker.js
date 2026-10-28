// Gera o modelo 3D ilustrativo numa thread à parte (worker_threads): ler uma
// arquitetura grande e montar a cena leva alguns segundos de CPU, e no processo
// principal isso travaria o sistema para todos os usuários nesse tempo.
// Entrada (workerData): { dxf, disciplinas, dadosPorDisciplina, peDireito, titulo, cliente, obra, proposta }
// Saída (postMessage): { ok, html, numeros, avisos } ou { ok: false, erro }
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const CAD = path.join(__dirname, '..', '..', '..', '..', 'skills', '_comum', 'cad');

try {
  const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
  const { montarCena, PE_DIREITO_PADRAO } = require(path.join(CAD, 'modelo3d.js'));
  const { pontosDasDisciplinas } = require(path.join(CAD, 'estimativaArquitetura.js'));
  const { gerarHtml } = require(path.join(CAD, 'visualizador3d.js'));

  const w = workerData;
  const arquitetura = lerArquitetura(w.dxf);
  if (!arquitetura.ambientes.length) throw new Error('A arquitetura não tem ambientes com nome (textos dentro de polilinhas fechadas): sem eles não há como montar o 3D.');
  const peDireito = Number(w.peDireito) > 1.5 ? Number(w.peDireito) : PE_DIREITO_PADRAO;
  const avisos = [];
  let dispositivos = [];
  // uma disciplina por vez: com o formulário do projeto, os pontos são os do
  // projeto; se ele ainda não fecha (ou não põe ponto nenhum na arquitetura),
  // cai na estimativa pela arquitetura, avisando
  for (const disc of w.disciplinas) {
    const dados = (w.dadosPorDisciplina || {})[disc];
    let pts = null;
    if (dados) {
      pts = pontosDasDisciplinas(arquitetura, [disc], { dadosPorDisciplina: { [disc]: dados }, peDireito });
      if (!pts.dispositivos.length) {
        avisos.push(...pts.avisos, `[CONFERIR] ${disc}: o formulário do projeto ainda não posiciona pontos nesta arquitetura — pontos ESTIMADOS pela arquitetura.`);
        pts = null;
      }
    }
    if (!pts) {
      // disciplina sem estimativa automática (ex.: controle de acesso sem formulário):
      // o 3D sai sem ela, avisando — não derruba o modelo inteiro
      try { pts = pontosDasDisciplinas(arquitetura, [disc], { peDireito }); } catch (e) { avisos.push(`${disc}: sem pontos no 3D — ${e.message}`); continue; }
    }
    dispositivos.push(...pts.dispositivos);
    avisos.push(...pts.avisos);
  }
  if (w.semPontos) avisos.push(w.semPontos);
  const cena = montarCena(arquitetura, {
    peDireito, dispositivos, avisos,
    titulo: w.titulo, cliente: w.cliente, obra: w.obra, proposta: w.proposta,
  });
  parentPort.postMessage({ ok: true, html: gerarHtml(cena), numeros: cena.numeros, avisos: cena.avisos });
} catch (err) {
  parentPort.postMessage({ ok: false, erro: err.message });
}
