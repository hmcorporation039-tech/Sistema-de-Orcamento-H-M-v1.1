// Conferência de consistência dos dados do laudo de SPDA e aterramento.
//
// Nasceu da revisão do laudo de referência (modelo HM de 29/10/2026), que
// continua sendo o modelo, mas tinha erros que nenhum cálculo pega sozinho. O
// usuário pediu que os laudos seguintes já saiam com essas correções:
//   - linha de sinal calculada como "linha de AT com transformador" (CT = 0,2
//     em vez de 1 — divide por 5 os eventos NL e NI);
//   - "baixo nível de pânico (até 2 pavimentos, até 100 pessoas)" numa zona
//     com 600 pessoas;
//   - ensaios repetidos na tabela (o mesmo par de pontos duas vezes);
//   - nível de proteção da análise de risco diferente do que o as built mostra;
//   - instrumentos sem série ou com calibração posterior à inspeção.
// (Fotos fora do local ou da data, ART e calibração vencida são conferidas no
// próprio laudo — doc-laudo.js.)
//
// conferirConsistencia(dados, ensaios) → [{ onde: 'risco' | 'ensaios' | 'instrumentos' | 'dados', texto }]
// Os textos já trazem [CONFERIR …]: saem em vermelho no laudo e no relatório de risco.

const LIMITE_PANICO = {
  panico_baixo: { pessoas: 100, pavimentos: 2, rotulo: 'baixo nível de pânico (até 2 pavimentos e até 100 pessoas)' },
  panico_medio: { pessoas: 1000, rotulo: 'nível médio de pânico (100 a 1 000 pessoas)' },
};

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function conferirConsistencia(dados, ensaios = []) {
  const avisos = [];
  const add = (onde, texto) => avisos.push({ onde, texto });
  const obra = dados.obra || {};
  const spda = dados.spda || {};
  const insp = dados.inspecao || {};

  // Linhas: sinal não tem transformador AT/BT (Tabela A.3: CT = 1 para sinal)
  for (const l of dados.linhas || []) {
    if (l.tipo === 'sinal' && l.ct === 'at_trafo') {
      add('risco', `[CONFERIR] Linha de sinal "${l.nome || l.id}" com tipo de linha "AT com transformador" (CT = 0,2): para linha de sinal (telecomunicações/dados) o CT é 1 (NBR 5419-2:2026, Tabela A.3). Com 0,2, NL e NI saem 5 vezes menores e o risco fica subestimado.`);
    }
  }

  // Zonas: nível de pânico compatível com pessoas e pavimentos (Tabela C.6)
  for (const z of dados.zonas || []) {
    const lim = LIMITE_PANICO[z.perigo_especial];
    if (!lim) continue;
    const nz = Number(z.nz) || 0;
    const pav = Number(obra.pavimentos) || 0;
    const motivos = [];
    if (nz > lim.pessoas) motivos.push(`${nz} pessoas na zona`);
    if (lim.pavimentos && pav > lim.pavimentos) motivos.push(`${pav} pavimentos`);
    if (motivos.length) {
      add('risco', `[CONFERIR] Zona "${z.nome}": adotado ${lim.rotulo}, mas há ${motivos.join(' e ')}. Rever o perigo especial (hz, NBR 5419-2:2026, Tabela C.6) — em hospital, avaliar "dificuldade de evacuação".`);
    }
  }

  // NP da análise × NP citado nos documentos/as built
  const np = spda.np ? String(spda.np).toUpperCase() : '';
  if (np) {
    for (const d of insp.dados_projeto || []) {
      const m = /\bNP\s*(IV|III|II|I)\b/i.exec(`${d.dado || ''} ${d.valor || ''}`);
      if (m && m[1].toUpperCase() !== np) {
        add('risco', `[CONFERIR] O cálculo usa SPDA NP ${np}, mas "${d.dado || 'dado do projeto'}"${d.fonte ? ` (${d.fonte})` : ''} indica NP ${m[1].toUpperCase()}. A análise de risco deve usar o nível do SPDA existente (PB, Tabela B.2).`);
      }
    }
  }

  // Ensaios: ponto repetido e o mesmo par de pontos ensaiado duas vezes
  const porPonto = new Map();
  const porPar = new Map();
  for (const e of ensaios) {
    const p = String(e.ponto || '').trim();
    if (p) porPonto.set(p, (porPonto.get(p) || 0) + 1);
    const par = [normalizar(e.origem), normalizar(e.destino)].sort().join(' × ');
    if (normalizar(e.origem) || normalizar(e.destino)) {
      if (!porPar.has(par)) porPar.set(par, []);
      porPar.get(par).push(e);
    }
  }
  const pontosRepetidos = [...porPonto].filter(([, n]) => n > 1).map(([p]) => p);
  if (pontosRepetidos.length) add('ensaios', `[CONFERIR] Número de ensaio repetido: ${pontosRepetidos.join(', ')} — cada ensaio precisa de um número próprio (as fotos citam o ensaio pelo número).`);
  for (const lista of porPar.values()) {
    if (lista.length < 2) continue;
    const e = lista[0];
    add('ensaios', `[CONFERIR] O mesmo par de pontos foi ensaiado ${lista.length} vezes (${[e.origem, e.destino].filter(Boolean).join(' × ')} — ensaios ${lista.map(x => x.ponto).join(', ')}): corrigir a identificação ou manter só a medição válida.`);
  }

  // Instrumentos
  for (const i of insp.instrumentos || []) {
    const nome = [i.instrumento, i.modelo].filter(Boolean).join(' ') || 'instrumento';
    if (!i.serie) add('instrumentos', `[CONFERIR] ${nome} sem número de série: ele identifica o instrumento no certificado de calibração e nas fotos das leituras.`);
    if (i.data_calibracao && insp.data_inspecao && String(i.data_calibracao) > String(insp.data_inspecao)) {
      add('instrumentos', `[CONFERIR] ${nome}: calibração (${i.data_calibracao.split('-').reverse().join('/')}) posterior à inspeção — o certificado anexado deve ser o válido na data das medições.`);
    }
  }

  return avisos;
}

module.exports = { conferirConsistencia };
