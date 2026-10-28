// Parecer comum da inspeção (todas as disciplinas menos o SPDA, que tem o seu):
// laudo nunca afirma conformidade que a medição não sustenta.
const I = require('./inspecao');
const { verificador } = require('./teste');
const { igual, fim } = verificador('_comum/inspecao (parecer)');

const tudoC = [{ cod: 'A1', situacao: 'C' }, { cod: 'A2', situacao: 'C' }, { cod: 'A3', situacao: 'NA' }];

// achado A2.1 da revisão de 27/10/2026: checklist todo C e NENHUM ensaio → saía CONFORME
const semEnsaio = I.parecer(tudoC, [], []);
igual('checklist todo C sem nenhum ensaio → INCONCLUSIVO (antes: CONFORME)', semEnsaio.situacao, 'INCONCLUSIVO');
igual('… o texto diz que não há ensaio registrado', /nenhum ensaio/.test(semEnsaio.texto), true);
igual('… e a falta de ensaio conta como pendência', [semEnsaio.pendentes, semEnsaio.semEnsaios], [1, true]);
igual('medicoes omitido (undefined) também é INCONCLUSIVO', I.parecer(tudoC, []).situacao, 'INCONCLUSIVO');

// com ensaios todos dentro do critério → CONFORME
const ok = I.parecer(tudoC, [], [{ resultado: 'C' }, { resultado: 'C' }]);
igual('checklist C e ensaios C → CONFORME', [ok.situacao, ok.medidos, ok.dentro], ['CONFORME', 2, 2]);

// ensaios listados mas todos NV → INCONCLUSIVO (já era)
igual('ensaios listados e não medidos → INCONCLUSIVO', I.parecer(tudoC, [], [{ resultado: 'NV' }]).situacao, 'INCONCLUSIVO');

// NC constatada sem ensaio → NC preliminar (o parecer final depende dos ensaios)
const nc = I.consolidarNcs([{ cod: 'A1', situacao: 'NC', item: 'x', requisito: 'y', prioridade: 'P2' }], []);
const ncSem = I.parecer([{ cod: 'A1', situacao: 'NC' }], nc, []);
igual('NC sem ensaio → NÃO CONFORME preliminar', ncSem.situacao, 'NAO_CONFORME_PRELIMINAR');
igual('… o texto cita os ensaios que faltam', /ensaios\/medições/.test(ncSem.texto), true);
igual('NC com ensaios feitos → NÃO CONFORME', I.parecer([{ cod: 'A1', situacao: 'NC' }], nc, [{ resultado: 'C' }]).situacao, 'NAO_CONFORME');

// disciplina sem ensaio previsto pode desligar a exigência de forma explícita
igual('exigeMedicao:false → CONFORME só pelo checklist', I.parecer(tudoC, [], [], { exigeMedicao: false }).situacao, 'CONFORME');

fim();
