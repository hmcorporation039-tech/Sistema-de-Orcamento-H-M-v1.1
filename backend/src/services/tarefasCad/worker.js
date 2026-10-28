// Tarefas de CAD numa thread à parte (worker_threads) — services/tarefasCad/index.js.
// Ler a arquitetura de um DWG/DXF (skills/_comum/cad/arquitetura.js) e gerar
// a planta ou o DXF da compatibilização levam segundos de CPU num desenho
// grande; na thread principal isso travava o sistema para todos os usuários.
// Entrada (workerData): { tarefa, ...dados da tarefa }
// Saída (postMessage): { ok: true, ... } ou { ok: false, etapa, erro }
//   etapa: 'conversao' (DWG → DXF), 'leitura' (arquitetura), 'dados' (formulário
//   do projeto inválido para o motor da disciplina), 'interno'
const { parentPort, workerData } = require('worker_threads');
const { cad, motorDaDisciplina } = require('../../utils/disciplinasLaudo');

const falhou = (etapa, e) => ({ ok: false, etapa, erro: String(e?.message || e) });

// só o que os controllers usam (sem os traços de referência, que pesam)
const resumoDaLeitura = (l) => ({ ambientes: l.ambientes, portas: l.portas, layers: l.layers, fatorUnidade: l.fatorUnidade, extensao: l.extensao });

const TAREFAS = {
  // { buffer, nome } → { texto (DXF), origem ('dwg'|'dxf'), leitura }
  async lerArquitetura({ buffer, nome }) {
    const C = cad();
    let texto, origem;
    try { ({ texto, origem } = await C.textoDxfDoArquivo(Buffer.from(buffer), nome)); } catch (e) { return falhou('conversao', e); }
    try { return { ok: true, texto, origem, leitura: resumoDaLeitura(C.lerArquitetura(texto)) }; } catch (e) { return falhou('leitura', e); }
  },

  // { dxf, disciplina, dados, carimbo } → { dxf, naoEncontrados }
  // O motor da disciplina roda aqui também: o resultado dele pode ter funções
  // (ex.: alarme), que não atravessam para outra thread.
  planta({ dxf, disciplina, dados, carimbo }) {
    const C = cad();
    const arquitetura = C.lerArquitetura(dxf);
    let resultado;
    try { resultado = motorDaDisciplina(disciplina).processar(dados); } catch (e) { return falhou('dados', e); }
    const { pontos, notas } = C.PLANTAS[disciplina](resultado, arquitetura);
    const out = C.gerarPlanta({ arquitetura, pontos, notas, carimbo });
    return { ok: true, dxf: out.dxf, naoEncontrados: out.naoEncontrados };
  },

  // { dxfReferencia, conflitos, titulo } → { dxf }
  dxfCompatibilizacao(d) {
    const { gerarDxfCompatibilizacao } = require('../../utils/dxfCompatibilizacao');
    return { ok: true, dxf: gerarDxfCompatibilizacao(d) };
  },
};

(async () => {
  try {
    const tarefa = TAREFAS[workerData?.tarefa];
    if (!tarefa) throw new Error(`tarefa de CAD desconhecida: ${workerData?.tarefa}`);
    parentPort.postMessage(await tarefa(workerData));
  } catch (err) {
    parentPort.postMessage(falhou('interno', err));
  }
})();
