// Parecer do laudo amarrado à análise de risco e aos ensaios, e correções da
// revisão de 27/10/2026 (achados A2.1 e A2.12) no risco, materiais e orçamento.
// Funciona com ou sem a ligação em processar.js: aplicarParecerRisco é idempotente.

const { processar } = require('../scripts/lib/processar');
const PR = require('../scripts/lib/parecer-risco');
const T = require('../scripts/lib/tabelas');
const { montarOrcamento } = require('../scripts/lib/orcamento');
const BASE = require('../dados/checklist_base.json');
const { verificador } = require('../../_comum/teste');
const { igual, perto, fim } = verificador('spda (parecer × risco × ensaios)');

const exemplo = () => JSON.parse(JSON.stringify(require('../exemplos/exemplo-hospital.json')));
const rodar = (d) => PR.aplicarParecerRisco(processar(d));
const tudoC = (d) => { d.inspecao.checklist = BASE.map(b => ({ cod: b.cod, situacao: 'C' })); d.inspecao.ncs = []; return d; };
const ensaiosC = (d) => { d.inspecao.continuidade = [{ ponto: 'P1', tipo_ensaio: 'F.2', origem: 'topo P1', destino: 'base P1', valor_ohm: 0.3 }]; return d; };
const protegido = (d) => { // menor cenário que atende do exemplo: NP I + DPS melhor que I
  d.spda.np = 'I';
  d.zonas.forEach(z => (z.sistemas || []).forEach(s => { s.dps_np = 'melhor_I_max'; }));
  d.linhas.forEach(l => { l.peb_np = 'melhor_I_max'; });
  return d;
};

// 1. Cenário do revisor: SPDA NP IV num hospital, checklist todo C, 0 ensaios.
//    Antes: CONFORME com R1 = 5,84e-5 > RT = 1e-5.
{
  const d = tudoC(exemplo()); d.inspecao.continuidade = []; d.spda.np = 'IV';
  const r = rodar(d);
  perto('R1 do cenário atual (NP IV)', r.risco.atual.R1, 5.84e-5, 0.01);
  igual('… R1 > RT', r.risco.atual.atendeR1, false);
  const nc = r.ncs.find(n => n.origem === PR.ORIGEM);
  igual('NC automática do risco no item D2', nc && nc.item, 'D2');
  igual('… cita R1 e o menor cenário que atende', /R1 = 5,8\de-5/.test(nc.descricao) && /menor cenário que atende/.test(nc.recomendacao), true);
  igual('… checklist D2 vira NC', r.checklist.find(c => c.cod === 'D2').situacao, 'NC');
  igual('parecer: NÃO CONFORME preliminar (antes: CONFORME)', r.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');
  igual('… o texto diz que não houve ensaio', /nenhum ensaio de continuidade/.test(r.parecer.texto), true);
  igual('… e cita R1 > RT', /R1 5,8\de-5 > RT/.test(r.parecer.texto), true);
  const r2 = PR.aplicarParecerRisco(r);
  igual('aplicar duas vezes não duplica a NC', r2.ncs.length, r.ncs.length);
  const r3 = PR.aplicarParecerRisco({ ...r, parecerRiscoAplicado: false });
  igual('… nem se a marca for perdida', r3.ncs.filter(n => n.origem === PR.ORIGEM).length, 1);
}

// 2. Mesmo cenário com ensaios feitos e dentro do critério → NÃO CONFORME (final)
{
  const d = ensaiosC(tudoC(exemplo())); d.spda.np = 'IV';
  const r = rodar(d);
  igual('R1 > RT com ensaios C → NÃO CONFORME', r.parecer.situacao, 'NAO_CONFORME');
  igual('… NC-01 é a do risco (P2)', [r.ncs[0].id, r.ncs[0].item, r.ncs[0].prioridade, r.ncs[0].prazo], ['NC-01', 'D2', 'P2', 'até 30 dias']);
}

// 3. Risco atendido + checklist C + ensaios C → CONFORME; sem ensaios → INCONCLUSIVO
{
  const ok = rodar(ensaiosC(tudoC(protegido(exemplo()))));
  igual('risco atendido (NP I + DPS melhor que I)', [ok.risco.atual.atendeR1, ok.risco.atual.atendeF], [true, true]);
  igual('… com ensaios C → CONFORME', ok.parecer.situacao, 'CONFORME');
  igual('… sem NC de risco', ok.ncs.length, 0);
  const d = tudoC(protegido(exemplo())); d.inspecao.continuidade = [];
  const sem = rodar(d);
  igual('risco atendido, checklist C e NENHUM ensaio → INCONCLUSIVO (antes: CONFORME)', sem.parecer.situacao, 'INCONCLUSIVO');
  igual('… pendência conta a falta de ensaio', [sem.parecer.semEnsaios, sem.parecer.pendentes], [true, 1]);
}

// 4. NC explícita da obra no D2 prevalece (não duplica)
{
  const d = exemplo(); d.spda.np = 'IV';
  const r = rodar(d);
  igual('exemplo com NC D2 descrita pela obra: uma só NC no D2', r.ncs.filter(n => n.item === 'D2').length, 1);
  igual('… e é a da obra', r.ncs.find(n => n.item === 'D2').origem, undefined);
}

// 5. F > FT → NC automática (FT mais restritivo informado é aceito)
{
  const d = ensaiosC(tudoC(protegido(exemplo())));
  d.zonas.forEach(z => { if (z.tipo !== 'externa') z.ft = 1e-4; });
  const r = rodar(d);
  igual('FT 1e-4 (mais restritivo) aceito', r.risco.atual.zonas[2].FT, 1e-4);
  igual('F > FT → NC do risco por frequência (P3)', r.ncs.map(n => [n.item, n.prioridade, /F = .* FT = 0,0001/.test(n.descricao)]), [['D2', 'P3', true]]);
  igual('… parecer NÃO CONFORME', r.parecer.situacao, 'NAO_CONFORME');
}

// 6. FT da norma não pode ser afrouxado (sistemas críticos: 0,1/ano fixo)
{
  const d = exemplo(); d.zonas.forEach(z => { if (z.tipo !== 'externa') z.ft = 5; });
  const r = rodar(d);
  igual('zona.ft = 5 com sistemas críticos → FT continua 0,1 (antes: 5)', r.risco.atual.zonas[2].FT, 0.1);
  igual('… e fica registrado como ignorado', [r.risco.atual.zonas[2].ftIgnorado, r.avisosRisco.length], [5, 2]);
}

// 7. RA nas zonas internas (antes: só na externa). Sem SPDA, piso de concreto:
//    RA = ND · PTA(1) · PB(1) · rt(1e-2) · LT(1e-2) · nz/nt · tz/8760 · rs
{
  const d = exemplo(); d.spda.np = 'nenhum'; d.spda.descida_natural = false;
  d.zonas.forEach(z => { if (z.tipo !== 'externa') z.piso = 'terra_concreto'; });
  const r = processar(d);
  const z = r.risco.atual.zonas[2];
  const rs = z.fatores.find(f => f.fator === 'rs').valor;
  const esperado = r.risco.atual.eventos.ND * 1 * 1 * T.RT_PISO.terra_concreto * T.LT * z.fator * rs;
  perto('RA da zona interna sem SPDA, concreto', z.comp.RA, esperado, 1e-9);
  perto('… ≈ 2,03e-5, sozinho acima de RT', z.comp.RA, 2.03e-5, 0.01);
  igual('… e entra no R1 da zona', z.R1 >= z.comp.RA, true);
  const ex = processar(exemplo());
  igual('exemplo (descida natural, PTA 0,001): RA interno desprezível, R1 do laudo R06 mantido', Math.abs(ex.risco.atual.R1 - 3.31e-5) / 3.31e-5 < 0.006, true);
}

// 8. KS3: a Tabela B.5 não tem 0,5
igual('KS3 "evitando laços grandes" = 0,2 (antes 0,5, inexistente na Tabela B.5)', T.KS3.evitando_lacos_grandes, 0.2);

// 9. Materiais: anéis intermediários e captação lateral
{
  const d = exemplo(); d.estrutura.H = 70; d.spda.descida_natural = false; d.spda.np = 'III';
  const r = processar(d);
  igual('H 70 m, descidas não naturais NP III: anéis a cada 15 m → 4', r.dim.descidas.aneis_intermediarios, 4);
  const des5 = r.dim.materiais.find(m => m.codigo === 'DES-05');
  perto('… DES-05 = 4 × perímetro × 1,1', des5.quantidade, Math.round(4 * r.dim.perimetro * 1.1 * 10) / 10, 0.001);
  igual('… captação lateral feita pelos anéis (sem CAP-05)', [r.dim.captacao.lateral.exigida, !!r.dim.materiais.find(m => m.codigo === 'CAP-05')], [true, false]);
  const orc = montarOrcamento(r, 'execucao');
  igual('… mão de obra dos anéis no orçamento', orc.itens.some(i => /anéis intermediários/.test(i.descricao)), true);
  const n = exemplo(); n.estrutura.H = 70; n.spda.np = 'III';
  const rn = processar(n);
  igual('H 70 m, descida natural: captação lateral própria 1 anel (14 m de faixa)', [rn.dim.descidas.aneis_intermediarios, rn.dim.captacao.lateral.aneis, !!rn.dim.materiais.find(m => m.codigo === 'CAP-05')], [0, 1, true]);
  igual('exemplo (H 10,5 m): sem anéis nem captação lateral', [processar(exemplo()).dim.descidas.aneis_intermediarios, processar(exemplo()).dim.captacao.lateral.aneis], [0, 0]);
}

// 10. Orçamento de inspeção sem plano de ensaios: pontos estimados, não "1 vb"
{
  const d = exemplo(); d.inspecao.continuidade = [];
  const r = processar(d);
  const it = montarOrcamento(r, 'inspecao').itens.find(i => i.codigo === 'spda_ensaio_continuidade');
  igual('ensaio sem pontos: descidas + 1 (F.4), por ponto (antes 1 vb)', [it.quantidade, it.unidade], [r.dim.descidas.quantidade + 1, 'pt']);
  igual('… marcado [CONFERIR]', /CONFERIR/.test(it.descricao), true);
  const sem = exemplo(); sem.inspecao.continuidade = []; delete sem.spda.np;
  const it2 = montarOrcamento(processar(sem), 'inspecao').itens.find(i => i.codigo === 'spda_ensaio_continuidade');
  igual('sem NP: pelo perímetro (280 m ÷ 20 m = 14 descidas + 1)', [it2.quantidade, it2.unidade], [15, 'pt']);
}

// 11. Textos do laudo: continuidade só é afirmada com medição
{
  const semEns = processar((() => { const d = exemplo(); d.inspecao.continuidade = []; return d; })());
  igual('objetivo sem ensaio: diz que a continuidade NÃO foi verificada', /continuidade elétrica NÃO foi verificada/.test(PR.textoObjetivo(semEns)), true);
  igual('limitações sem ensaio: embutidos NÃO avaliados por ensaio', /NÃO foram avaliados por ensaio/.test(PR.textoLimitacaoEmbutidos(semEns)), true);
  const com = processar(ensaiosC(exemplo()));
  igual('objetivo com ensaio medido: afirma continuidade pelo Anexo F', /continuidade elétrica \(ensaios do Anexo F\)/.test(PR.textoObjetivo(com)), true);
  const soNv = processar(exemplo()); // ensaios listados, nenhum medido
  igual('ensaios só previstos (NV) não contam como verificação', PR.houveEnsaio(soNv), false);
}

fim();
