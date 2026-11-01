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
// Achado A2.11 (revisão 27/10/2026): conferido — a NBR 10898:2023 (4.9) pede 2 h (a de 2013 pedia 1 h),
// então 1,5 h continua NC; a IT/NT local pode exigir mais (campo sistema.autonomia_iluminacao_h).
{
  const cl = (f) => { const d = JSON.parse(JSON.stringify(motor.exemplo())); f(d); return motor.processar(d); };
  igual('1,5 h < 2 h (NBR 10898:2023) → NC', cl(d => { d.inspecao.autonomia = [{ local: 'Bloco', horas: 1.5 }]; }).med.autonomia[0].resultado, 'NC');
  const r3 = cl(d => { d.sistema.autonomia_iluminacao_h = 3; d.inspecao.autonomia = [{ local: 'Bloco', horas: 2.5 }]; });
  igual('IT local exige 3 h: 2,5 h → NC', [r3.calc.autonomiaEmergH, r3.med.autonomia[0].resultado], [3, 'NC']);
  const r1 = cl(d => { d.sistema.autonomia_iluminacao_h = 1; });
  igual('autonomia informada < 2 h é recusada (fica 2 h, com aviso)', [r1.calc.autonomiaEmergH, r1.calc.avisos.some(a => a.startsWith('Autonomia da iluminação de emergência informada (1 h)'))], [2, true]);
}
// ── Caderno de fabricação e montagem da central de incêndio (31/10/2026) ──
const { montarCaixa, montarCaderno } = require('../scripts/lib/caderno');
{
  const cx = montarCaixa(res);
  const tags = cx.itens.map(i => i.tag);
  igual('caderno: central com CPU, laço, fonte, 2 baterias e comunicação', ['CPU', 'FNT', 'BAT-1', 'BAT-2', 'COM'].every(t => tags.includes(t)) && tags.some(t => t.startsWith('LACO-')), true);
  igual('caderno: baterias da skill (Anexo B); detectores, acionadores e avisadores só no campo', [cx.itens.find(i => i.tag === 'BAT-1').descricao.includes(`${c.bateria.bateriaEscolhida} Ah`), cx.itens.filter(i => i.na_placa === false).map(i => i.tag).slice(0, 3)], [true, ['DET', 'ACM', 'AV']]);
  igual('caderno: frente com alimentação, alarme, falha, supervisão, silenciar, reset e teste', ['ALIMENT.', 'ALARME', 'FALHA', 'SUPERV.', 'SILENCIAR', 'RESET', 'TESTE'].every(x => cx.frente.some(f => f.texto[0] === x)), true);
  const cad = montarCaderno(res);
  igual('caderno: normas NBR 17240, 10898, 5410 e 5419-4 e plaqueta H&M', [['17240', '10898', '5410', '5419-4'].every(n => cad.normas.some(x => x.codigo.includes(n))), /H&M/.test(cad.plaqueta_hm.modelo)], [true, true]);
  igual('caderno: verificações de autonomia, laço aberto e alarme sonoro', ['Autonomia da bateria', 'Falha de', 'Alarme sonoro'].every(k => cad.verificacoes.some(v => v.item.includes(k))), true);
}
(async () => {
  for (const t of motor.tiposDisponiveis(res).filter(x => x !== 'caderno')) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  try {
    require('../../_comum/fabricacao/pdf').carregarPuppeteer();
    const g = await motor.gerarDocumento(res, 'caderno');
    igual('caderno da central de incêndio: PDF (%PDF, application/pdf, .pdf)', [g.buffer.slice(0, 4).toString(), g.mime, g.nomeArquivo.endsWith('.pdf')], ['%PDF', 'application/pdf', true]);
    if (process.env.CAD_SAIDA) require('fs').writeFileSync(process.env.CAD_SAIDA, g.buffer);
  } catch (e) { if (!/puppeteer/i.test(String(e.message))) throw e; console.log('  (puppeteer ausente — PDF do caderno não testado)'); }
  igual('orçamento de instalação tem materiais e serviços', motor.montarOrcamento(res, 'execucao').itens.length > 8, true);
  fim();
})();
