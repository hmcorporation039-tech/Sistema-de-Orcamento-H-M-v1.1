// Tarefas de CAD fora da thread principal (worker.js), com a fila global de
// services/executarNoWorker.js (no máximo 2 workers de CAD/3D ao mesmo tempo).
// Mantém as mensagens de erro de antes: quem chama decide pela `etapa`.
const path = require('path');
const { executarNoWorker } = require('../executarNoWorker');

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
  if (!m.ok) throw Object.assign(new Error(m.erro), { etapa: m.etapa, codigo: m.codigo || null });
  return m;
}

// DWG/DXF/PDF da arquitetura → { texto (DXF), origem, pdf, leitura: { ambientes, portas, layers, fatorUnidade, extensao } }
// `opcoes` (só PDF): { escala (50 = 1:50), pagina }
const lerArquiteturaNoWorker = (buffer, nome, { escala = null, pagina = null } = {}) =>
  rodar('lerArquitetura', { buffer, nome, escala: Number(escala) || null, pagina: Number(pagina) || null }, `a leitura de "${nome}"`);

// Resumo gravado com a arquitetura (análise e projeto usam o mesmo formato: o
// projeto criado da análise copia a linha)
const resumoDaArquitetura = ({ origem, leitura, pdf }) => ({
  ambientes: leitura.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, origem: a.origem })),
  portas: leitura.portas.length, layers: leitura.layers.length, fatorUnidade: leitura.fatorUnidade, origem,
  ...(pdf ? { pdf } : {}),
});

// DXF a guardar: o do usuário quando ele mandou DXF; o convertido (DWG/PDF) nos outros casos
const dxfParaGuardar = ({ origem, texto }, buffer) => (origem === 'dxf' ? buffer : Buffer.from(texto, 'utf8'));

// Escala que faltou num PDF: a tela pergunta e reenvia
const faltouEscala = (e) => e.codigo === 'ESCALA';

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

module.exports = { lerArquiteturaNoWorker, mensagemDaLeitura, resumoDaArquitetura, dxfParaGuardar, faltouEscala, gerarPlantaNoWorker, dxfCompatibilizacaoNoWorker };
