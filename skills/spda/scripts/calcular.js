#!/usr/bin/env node
// Uso: node scripts/calcular.js <dados.json> [--json resultado.json]
// Valida os dados, roda a análise de risco e o dimensionamento e imprime um
// resumo para conferir com o engenheiro antes de gerar os documentos.

const fs = require('fs');
const path = require('path');
const { processar } = require('./lib/processar');
const { rotuloNp } = require('./lib/dimensionamento');
const { ROTULO_NP_SPDA } = require('./lib/doc-risco');

const e = (v) => (v === 0 ? '0' : v.toExponential(2).replace('.', ','));
const n = (v, c = 1) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c });

function main() {
  const [arquivo, ...resto] = process.argv.slice(2);
  if (!arquivo) {
    console.error('Uso: node scripts/calcular.js <dados.json> [--json resultado.json]');
    process.exit(2);
  }
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const res = processar(dados);
  const { risco, dim, parecer, ncs } = res;

  console.log(`\n=== ${dados.meta?.titulo || dados.obra?.nome || 'SPDA'} (${dados.meta?.revisao || 'R00'}) ===`);
  if (risco) {
    const a = risco.atual;
    const ev = a.eventos;
    console.log(`\nANÁLISE DE RISCO (NBR 5419-2:2026) — NG = ${ev.ng} (${ev.ngFonte || 'informado'})`);
    console.log(`  AD = ${n(ev.AD)} m²   ND = ${e(ev.ND)}/ano   NM = ${e(ev.NM)}/ano`);
    ev.linhas.forEach(l => console.log(`  Linha ${l.id}: NL = ${e(l.NL)}  NI = ${e(l.NI)}`));
    a.zonas.forEach(z => {
      const comps = Object.entries(z.comp).filter(([, v]) => v).map(([k, v]) => `${k}=${e(v)}`).join(' ');
      console.log(`  • ${z.zona.nome}\n      ${comps || '(sem componentes)'}\n      R1 zona = ${e(z.R1)}${z.FT != null ? `   F = ${e(z.F)} (FT ${z.FT})` : ''}`);
    });
    console.log(`  R1 = ${e(a.R1)} → ${a.atendeR1 ? 'ATENDE' : 'NÃO ATENDE'} (RT = 1e-5)   |   F: ${a.atendeF ? 'ATENDE' : 'NÃO ATENDE'}`);
    console.log(`  Sem qualquer proteção: R1 = ${e(risco.semProtecao.R1)}`);
    const m = risco.menorQueAtende;
    console.log(m
      ? `  Menor cenário que atende: ${ROTULO_NP_SPDA[m.np_spda] || m.np_spda} + DPS ${rotuloNp(m.dps_np)}${m.fibra ? ' + fibra' : ''} (R1 = ${e(m.R1)})`
      : '  Nenhum cenário da varredura atende — informar o proprietário (5.4.6).');
  }
  if (dim) {
    console.log(`\nDIMENSIONAMENTO (NBR 5419-3:2026) — NP ${dim.np}`);
    console.log(`  Malha ${dim.captacao.divisoes.join(' × ')} módulos de ${dim.captacao.modulo_m.map(v => n(v, 2)).join(' × ')} m — ${n(dim.captacao.comprimento_m, 0)} m de condutor`);
    console.log(`  Descidas: ${dim.descidas.quantidade} (espaçamento médio ${n(dim.descidas.espacamento_medio_m)} m, ${dim.descidas.naturais ? 'naturais' : 'não naturais'})`);
    console.log(`  Anel: ${n(dim.aterramento.anel_m, 0)} m   re = ${n(dim.aterramento.re_m)} m   l1 = ${dim.aterramento.l1_m ?? '? (informar resistividade)'} m`);
    console.log(`  Distância de segurança (ar): ${n(dim.distanciaSeguranca.s_ar_m, 3)} m`);
    (dim.captacao.captores_verticais || []).forEach(c => console.log(`  Captor ${c.id}: ${c.raio_por_plano.map(r => `${r.plano} r=${n(r.raio_m)} m`).join('; ')}`));
    console.log(`  Materiais: ${dim.materiais.length} itens (ver Materiais_e_Risco.xlsx)`);
  }
  console.log(`\nINSPEÇÃO — checklist ${res.checklist.length} itens: C ${parecer.cont.C} | NC ${parecer.cont.NC} | NA ${parecer.cont.NA} | NV ${parecer.cont.NV}`);
  console.log(`  NCs consolidadas: ${ncs.length}   Ensaios: ${res.ensaios.length} (${parecer.medidos} medidos)`);
  console.log(`  Parecer: ${parecer.texto}`);
  console.log(`  Periodicidade: ${res.intervalo} ano(s)\n`);

  const iJson = resto.indexOf('--json');
  if (iJson >= 0 && resto[iJson + 1]) {
    const saida = path.resolve(resto[iJson + 1]);
    const enxuto = { risco: risco && { R1: risco.atual.R1, atendeR1: risco.atual.atendeR1, atendeF: risco.atual.atendeF, semProtecao: risco.semProtecao.R1, menorQueAtende: risco.menorQueAtende, zonas: risco.atual.zonas.map(z => ({ nome: z.zona.nome, comp: z.comp, R1: z.R1, F: z.F, FT: z.FT })), cenarios: risco.cenarios }, dimensionamento: dim, ncs, ensaios: res.ensaios, parecer };
    fs.writeFileSync(saida, JSON.stringify(enxuto, null, 1));
    console.log(`Resultado salvo em ${saida}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`ERRO: ${err.message}`);
  process.exit(1);
}
