// Teste de regressão: os números do exemplo devem bater com o laudo HM
// original (R06, out/2026), calculado à mão e conferido. Rode com `npm test`
// depois de qualquer mudança em scripts/lib.

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { processar } = require('../scripts/lib/processar');
const { buscarNg } = require('../scripts/lib/ng');
const { raioProtegidoEsfera } = require('../scripts/lib/dimensionamento');
const { criterioEnsaio } = require('../scripts/lib/processar');

const dados = require('../exemplos/exemplo-hospital.json');
let falhas = 0;
let total = 0;

function perto(nome, obtido, esperado, tolerancia = 0.006) {
  total++;
  const ok = esperado === 0 ? obtido === 0 : Math.abs(obtido - esperado) / Math.abs(esperado) <= tolerancia;
  if (!ok) { falhas++; console.log(`  FALHOU ${nome}: obtido ${obtido}, esperado ${esperado}`); }
}
function igual(nome, obtido, esperado) {
  total++;
  try { assert.deepStrictEqual(obtido, esperado); } catch { falhas++; console.log(`  FALHOU ${nome}: obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); }
}

const res = processar(dados);
const a = res.risco.atual;
const [zExt, zVida, zCons] = a.zonas;

// NBR 5419-2 — Anexo A
perto('AD', a.eventos.AD, 16612.2, 0.0001);
perto('ND', a.eventos.ND, 0.2658);
perto('NM', a.eventos.NM, 14.8);
perto('NL energia', a.eventos.linhas[0].NL, 6.4e-3);
perto('NI telecom', a.eventos.linhas[1].NI, 3.2);

// Componentes por zona (valores do relatório original)
perto('RA externa', zExt.comp.RA, 5.78e-12);
perto('RB vida', zVida.comp.RB, 5.06e-6);
perto('RC vida', zVida.comp.RC, 5.05e-6);
perto('RM vida', zVida.comp.RM, 7.67e-8);
perto('RW vida', zVida.comp.RW, 6.10e-8);
perto('PM vida', zVida.PM, 2.72e-6);
perto('RB consultórios', zCons.comp.RB, 2.03e-5);
perto('RM consultórios', zCons.comp.RM, 4.91e-7);
perto('PM consultórios', zCons.PM, 4.352e-5);
perto('F vida', zVida.F, 2.92e-3);
perto('F consultórios', zCons.F, 3.52e-3);
perto('R1 total', a.R1, 3.31e-5);
igual('R1 não atende', a.atendeR1, false);
perto('R1 sem proteção', res.risco.semProtecao.R1, 2.20e-2);
igual('menor cenário que atende', [res.risco.menorQueAtende.np_spda, res.risco.menorQueAtende.dps_np], ['I', 'melhor_I_max']);

// NBR 5419-3 — dimensionamento (memorial original)
const d = res.dim;
igual('malha', d.captacao.divisoes, [6, 4]);
perto('condutor de captação c/ folga', d.captacao.comprimento_com_folga_m, 891);
igual('descidas', d.descidas.quantidade, 20);
perto('anel c/ folga', d.aterramento.anel_com_folga_m, 316.8);
igual('l1 NP III', d.aterramento.l1_m, 5);
perto('Franklin no plano da telha', raioProtegidoEsfera(45, 16 - 9.3), 23.6, 0.01);
perto('Franklin na platibanda', raioProtegidoEsfera(45, 16 - 10.5), 21.6, 0.01);

// NG (Tabela F.1) e critérios do Anexo F
igual('NG Brasília', buscarNg('brasilia', 'DF').ng, 16);
igual('NG São Paulo', buscarNg('São Paulo', 'SP').ng, 22);
igual('critério F.4', criterioEnsaio({ tipo_ensaio: 'F.4' }).limite, 0.2);
perto('critério F.7 por resistência esperada', criterioEnsaio({ tipo_ensaio: 'F.7', material: 'cobre', secao_mm2: 16, comprimento_m: 10 }).limite, 2 * 0.0178 * 10 / 16);

// Inspeção: NCs sem duplicidade, parecer coerente, NA automático
igual('NCs consolidadas (sem repetir as do checklist)', res.ncs.length, 5);
igual('CP8 não aplicável (H ≤ 60 m)', res.checklist.find(c => c.cod === 'CP8').situacao, 'NA');
igual('parecer', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');
// Correções da comparação R06 × R00 (12/10/2026)
igual('DS11 não aplicável (H ≤ 20 m)', res.checklist.find(c => c.cod === 'DS11').situacao, 'NA');
igual('contagem do checklist igual à R06', [res.parecer.cont.C, res.parecer.cont.NC, res.parecer.cont.NA, res.parecer.cont.NV], [2, 5, 2, 51]);
igual('NC por prioridade (P3 4 | P4 1)', [res.parecer.porP.P3, res.parecer.porP.P4], [4, 1]);
igual('sem "NBR NBR" nas referências', res.checklist.filter(c => /NBR\s+NBR/.test(c.requisito)).length, 0);
igual('F.7 com dados estimados marcado [CONFERIR]', /\[CONFERIR/.test(res.ensaios.find(e => e.tipo_ensaio === 'F.7').criterio), true);

// Geração dos documentos (só confere que saem e abrem como zip válido)
(async () => {
  const B = require('../../_comum/docx-base');
  const { gerarLaudo } = require('../scripts/lib/doc-laudo');
  const { gerarMemorial } = require('../scripts/lib/doc-memorial');
  const { gerarRelatorioRisco } = require('../scripts/lib/doc-risco');
  const { gerarChecklistCampo } = require('../scripts/lib/doc-checklist');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'spda-teste-'));
  for (const [nome, ger] of [['laudo', gerarLaudo], ['memorial', gerarMemorial], ['risco', gerarRelatorioRisco], ['checklist', gerarChecklistCampo]]) {
    const arq = await B.salvar(ger(res), path.join(pasta, `${nome}.docx`));
    total++;
    const cab = fs.readFileSync(arq).slice(0, 2).toString();
    if (cab !== 'PK') { falhas++; console.log(`  FALHOU documento ${nome}: arquivo inválido`); }
  }
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log(`${total - falhas}/${total} verificações OK`);
  process.exit(falhas ? 1 : 0);
})();
