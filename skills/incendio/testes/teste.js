// Teste da skill de incêndio — exemplos da NBR 17240 (Fig. 15/17) e Anexo B.
const motor = require('../scripts/lib/index');
const { gradeDetectores, RAIO, fatorViga, luminariasEmergencia } = require('../scripts/lib/calculo');
const { perto, igual, fim } = verificador();
function verificador() { return require('../../_comum/teste').verificador('incêndio'); }

igual('temperatura 16,5 × 1,5 m → 2 (exemplo 5.4.2.3)', gradeDetectores(16.5, 1.5, RAIO.temperatura).n, 2);
igual('temperatura 8 × 9 m → 4 (exemplo 5.4.2.3)', gradeDetectores(9, 8, RAIO.temperatura).n, 4);
igual('fumaça 9 × 9 m (81 m²) → 1 (5.4.1.1)', gradeDetectores(9, 9, RAIO.fumaca).n, 1);
igual('fumaça 25 × 3 m pelo critério 5.4.1.4 → 3', gradeDetectores(25, 3, RAIO.fumaca).n, 3);
igual('viga 0,40 m → 2/3', fatorViga(0.4), 2 / 3);
igual('viga 0,70 m → 1/2', fatorViga(0.7), 0.5);
igual('luminárias 12 × 8 m a 2,5 m (passo 10 m) → 2', luminariasEmergencia(12, 8, 2.5), 2);

const res = motor.processar(motor.exemplo());
const c = res.calc;
igual('acionadores: 48 m de caminhamento e 2 saídas → 2', c.nAc, 2);
// Anexo B: bateria = 1,2 × (24 × Irep + 5/60 × Ialm) / 1000
const b = c.bateria;
perto('bateria pelo Anexo B', b.bateriaAh, 1.2 * (24 * b.iRepouso + (5 / 60) * b.iAlarme) / 1000, 1e-9);
perto('fonte = 1,2 × alarme', b.fonteA, 1.2 * b.iAlarme / 1000, 1e-9);
igual('iluminância 4 lx na escada (< 5 lx) → NC', res.med.iluminancia.find(m => m.escada).resultado, 'NC');
igual('autonomia 2,5 h → C', res.med.autonomia[0].resultado, 'C');
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento de instalação tem materiais e serviços', motor.montarOrcamento(res, 'execucao').itens.length > 8, true);
  fim();
})();
