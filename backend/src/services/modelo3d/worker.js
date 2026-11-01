// Gera o modelo 3D ilustrativo numa thread à parte (worker_threads): ler uma
// arquitetura grande e montar a cena leva alguns segundos de CPU, e no processo
// principal isso travaria o sistema para todos os usuários nesse tempo.
// Entrada (workerData): { dxf, disciplinas, dadosPorDisciplina, peDireito, titulo, cliente, obra, proposta,
//                        dispositivosReais, trechos, semPontos }
// Saída (postMessage): { ok, html, numeros, avisos } ou { ok: false, erro }
// Um modelo POR PLANTA do desenho (skills/_comum/cad/modelosPorPlanta.js), com os
// pontos do projeto ou os desenhados — nunca estimados pela área (01/11/2026).
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const { CAD } = require('../../config/caminhos');

try {
  const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
  const { PE_DIREITO_PADRAO } = require(path.join(CAD, 'modelo3d.js'));
  const { montarCenasPorPlanta, resumoDasCenas } = require(path.join(CAD, 'modelosPorPlanta.js'));
  const { gerarHtml } = require(path.join(CAD, 'visualizador3d.js'));

  const w = workerData;
  const arquitetura = lerArquitetura(w.dxf);
  const peDireito = Number(w.peDireito) > 1.5 ? Number(w.peDireito) : PE_DIREITO_PADRAO;
  const SEM_NADA = 'A arquitetura não tem ambientes com nome (textos dentro de polilinhas fechadas) nem pontos de instalação desenhados: sem eles não há como montar o 3D.';
  let r;
  try {
    r = montarCenasPorPlanta(arquitetura, {
      peDireito, avisos: w.semPontos ? [w.semPontos] : [],
      dispositivosReais: w.dispositivosReais, trechos: w.trechos || [],
      disciplinas: w.disciplinas, dadosPorDisciplina: w.dadosPorDisciplina,
      titulo: w.titulo, cliente: w.cliente, obra: w.obra, proposta: w.proposta,
    });
  } catch (e) {
    throw arquitetura.ambientes.length ? e : new Error(SEM_NADA);
  }
  if (!arquitetura.ambientes.length && !r.cenas.some(c => c.plantaInfo.pontos)) throw new Error(SEM_NADA);
  const { numeros, avisos } = resumoDasCenas(r);
  parentPort.postMessage({ ok: true, html: gerarHtml(r.cenas, { principal: r.principal }), numeros, avisos });
} catch (err) {
  parentPort.postMessage({ ok: false, erro: err.message });
}
