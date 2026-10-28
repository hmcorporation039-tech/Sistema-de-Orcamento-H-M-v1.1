// Tarefas de CAD fora da thread principal (worker.js), com a fila global de
// utils/executarNoWorker.js (no máximo 2 workers de CAD/3D ao mesmo tempo).
// Mantém as mensagens de erro de antes: quem chama decide pela `etapa`.
const path = require('path');
const { executarNoWorker } = require('../../utils/executarNoWorker');

const SCRIPT = path.join(__dirname, 'worker.js');
const TEMPO_LIMITE_MS = 180 * 1000;

async function rodar(tarefa, dados, descricao) {
  let m;
  try {
    m = await executarNoWorker(SCRIPT, { tarefa, ...dados }, { tempoLimiteMs: TEMPO_LIMITE_MS, memoriaMb: 2048 });
  } catch (e) {
    if (e.codigo === 'TEMPO_ESGOTADO') throw Object.assign(new Error(`${descricao} passou de ${TEMPO_LIMITE_MS / 1000} s`), { etapa: 'tempo' });
    throw Object.assign(e, { etapa: e.etapa || 'interno' });
  }
  if (!m.ok) throw Object.assign(new Error(m.erro), { etapa: m.etapa });
  return m;
}

// DWG/DXF da arquitetura → { texto (DXF), origem, leitura: { ambientes, portas, layers, fatorUnidade, extensao } }
const lerArquiteturaNoWorker = (buffer, nome) => rodar('lerArquitetura', { buffer, nome }, `a leitura de "${nome}"`);

// Mensagem de sempre para a tela: erro da conversão do DWG vai como veio; o resto,
// "Não consegui ler a arquitetura: ..."
const mensagemDaLeitura = (e) => (e.etapa === 'conversao' ? e.message : `Não consegui ler a arquitetura: ${e.message}`);

// Planta DXF com os pontos da disciplina → { dxf, naoEncontrados }
const gerarPlantaNoWorker = ({ dxf, disciplina, dados, carimbo }) => rodar('planta', { dxf, disciplina, dados, carimbo }, 'a geração da planta');

// DXF da compatibilização (utils/dxfCompatibilizacao.js) → texto do DXF
async function dxfCompatibilizacaoNoWorker({ dxfReferencia, conflitos, titulo }) {
  const m = await rodar('dxfCompatibilizacao', { dxfReferencia, conflitos, titulo }, 'a geração do DXF da compatibilização');
  return m.dxf;
}

module.exports = { lerArquiteturaNoWorker, mensagemDaLeitura, gerarPlantaNoWorker, dxfCompatibilizacaoNoWorker };
