// O que o aprendizado vale para UM desenho (funções puras: rodam na thread de leitura do CAD, ./worker.js, sem banco).
// Diretriz do dono do sistema (06/11/2026): "quando falamos em aprendizado do sistema, referimos às disciplinas" — o que
// foi aprendido sabe de que disciplina veio e só vale sozinho dentro dela (ou do mesmo ramo); o escritório do carimbo é
// só preferência, nunca coringa. E o que o sistema aprende sozinho é sugestão: só a confirmação do engenheiro é certa.
//   ramoDe(d)                               → a disciplina do 3D/símbolo ou da análise no mesmo "ramo" (rede = cabeamento…)
//   notasParaOMotor(notas, esc, disciplinas) → { escritorio, notas } para pontosDoDesenho.propostaDeMapa
//   marcarNaoPonto(mapa, naoPonto, aprendidos, esc, disciplinas) → o mapa com o "não é ponto" aprendido (sugestão)
//   marcarEscalaDePlanta(legenda, simbolos) → a linha da legenda desenhada no tamanho da planta ganha escalaDePlanta

// disciplina do símbolo (3D) ou da análise → o ramo (rede, telefonia e cabeamento são a mesma skill de cabeamento…)
const MESMO_RAMO = { rede: 'cabeamento', telefonia: 'cabeamento', cabeamento: 'cabeamento', 'controle-acesso': 'controle_acesso', veicular: 'carregador', 'iluminacao-externa': 'iluminacao' };
const ramoDe = (d) => MESMO_RAMO[d] || d;
const daDisciplina = (disciplina, disciplinas) => {
  const marcadas = (disciplinas || []).map(ramoDe);
  return !marcadas.length || !disciplina || marcadas.includes(ramoDe(disciplina));
};

// O motor (skills/_comum/cad/pontosDoDesenho.js) só usa a altura aprendida com um escritório no carimbo. A altura que o
// engenheiro CONFIRMOU num desenho sem carimbo é guardada por disciplina (escritório '') e vale para o desenho sem
// carimbo — e para o de um escritório que ainda não tem a dele para esse tipo — da mesma disciplina. Ela vai ao motor
// com uma chave de escritório só deste desenho (ESCRITORIO_DO_MOTOR: não casa com nenhuma linha de símbolo aprendido,
// então a leitura dos símbolos fica igual à de um desenho sem carimbo).
const ESCRITORIO_DO_MOTOR = '(conferido pelo engenheiro, por disciplina)';
function notasParaOMotor(notas, escritorio = '', disciplinas = []) {
  const lista = notas || [];
  const proprias = escritorio ? lista.filter(n => n.escritorio === escritorio) : [];
  // (o 'daDisciplina' do retorno marca a altura que não é costume do escritório: alturaDe 'nota_disciplina' no mapa)
  const temPropria = new Set(proprias.map(n => n.simbolo));
  const conferidas = lista.filter(n => !n.escritorio && n.usuario && !temPropria.has(n.simbolo) && daDisciplina(n.disciplina, disciplinas));
  if (!conferidas.length) return { escritorio, notas: proprias, daDisciplina: new Set() };
  const chave = escritorio || ESCRITORIO_DO_MOTOR;
  // daDisciplina: os tipos cuja altura veio da confirmação por disciplina (a tela do mapa diz de onde veio)
  return { escritorio: chave, notas: [...proprias, ...conferidas.map(n => ({ ...n, escritorio: chave }))], daDisciplina: new Set(conferidas.map(n => n.simbolo)) };
}

const ordenada = (m) => [...(m || [])].map(Number).sort((a, b) => b - a);
// a mesma tolerância da biblioteca de blocos (pontosDoDesenho.daLegenda): ±2 cm ou 8 %
const mesmaMedida = (a, b) => {
  const [x, y] = [ordenada(a), ordenada(b)];
  const tol = Math.max(0.02, 0.08 * (x[0] || 0));
  return x.length >= 2 && y.length >= 2 && Math.abs(x[0] - y[0]) <= tol && Math.abs(x[1] - y[1]) <= tol;
};
const mesmaProporcao = (a, b) => {
  const [x, y] = [ordenada(a), ordenada(b)];
  const p = (m) => m[1] / m[0];
  return x[0] > 0 && y[0] > 0 && Math.abs(p(x) - p(y)) <= 0.15 * p(x);
};
const mesmaForma = (l, s) => String(l.layer || '').toUpperCase() === String(s.layer || '').toUpperCase()
  && Math.abs(Number(l.fracao || 0) - Number(s.preenchimento || 0)) <= 0.08
  && (l.porMedida ? mesmaMedida(l.medida, s.medida) : mesmaProporcao(l.medida, s.medida));
// a linha aprendida vale para este desenho: do mesmo escritório (ou sem escritório) e da mesma disciplina
const valeAqui = (l, escritorio, disciplinas) => (l.escritorio ? l.escritorio === escritorio : !!l.disciplina) && daDisciplina(l.disciplina, disciplinas);

// "Não é ponto" confirmado pelo engenheiro em outro projeto (seta, letra, cota explodida): a mesma forma volta como
// "não é ponto" SUGERIDO — a linha continua a conferir. Se o engenheiro também confirmou um TIPO para essa forma
// (aprendido do usuário), vale a confirmação mais recente.
function marcarNaoPonto(mapa, naoPonto, aprendidos = [], escritorio = '', disciplinas = []) {
  const lista = (naoPonto || []).filter(l => valeAqui(l, escritorio, disciplinas));
  if (!lista.length || !mapa?.simbolos?.length) return mapa;
  const simbolos = mapa.simbolos.map((s) => {
    if (s.confirmado || !Array.isArray(s.medida)) return s;
    const np = lista.filter(l => mesmaForma(l, s)).sort((a, b) => (b.em || 0) - (a.em || 0))[0];
    if (!np) return s;
    const tipo = (aprendidos || []).filter(l => l.usuario && (!l.escritorio || l.escritorio === escritorio) && mesmaForma(l, s)).sort((a, b) => (b.em || 0) - (a.em || 0))[0];
    if (tipo && (tipo.em || 0) > (np.em || 0)) return s;
    const { altura_m, alturaDe, alturaTexto, tipoDe, semelhanca, ...resto } = s;
    return { ...resto, simbolo: '?', disciplina: '', rotulo: 'não é ponto (aprendido de outro projeto — conferir)', naoPontoAprendido: true };
  });
  return { ...mapa, simbolos };
}

// Lacuna 16 da revisão: a legenda do DWG era aprendida só pela proporção, e "EL-Tomadas" com 13 linhas da mesma família
// e alturas diferentes ficava ambígua no próximo desenho. Quando a amostra da legenda tem a MESMA medida de símbolos da
// planta (mesma layer, 2+ símbolos: a própria amostra é um só), ela está na escala da planta: a linha é aprendida também
// pela medida real (simbolosAprendidos.registrar).
function marcarEscalaDePlanta(legenda, simbolosDoMapa) {
  return (legenda || []).map((l) => {
    const naPlanta = (simbolosDoMapa || []).some(s => (s.quantidade || 0) >= 2 && String(s.layer || '').toUpperCase() === String(l.layer || '').toUpperCase() && mesmaMedida(l.medida, s.medida));
    return naPlanta ? { ...l, escalaDePlanta: true } : l;
  });
}

module.exports = { MESMO_RAMO, ramoDe, daDisciplina, notasParaOMotor, marcarNaoPonto, marcarEscalaDePlanta, mesmaMedida, ESCRITORIO_DO_MOTOR };
