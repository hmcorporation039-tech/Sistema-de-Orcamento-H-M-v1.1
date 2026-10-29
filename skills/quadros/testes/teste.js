// Teste de regressão da skill de quadros — valores conferidos à mão:
//  - Ib F-N: 1200 W / (220 V × 0,92) = 5,929 A; trifásico: 4000 / (√3 × 380 × 0,85) = 7,150 A
//  - k adiabático do cobre (IEC 60949): 226·√ln((234,5+200)/(234,5+65)) = 226 × 0,60998 = 137,86;
//    com θi 90 °C e θf 250 °C dá 143,1 — o k = 143 da NBR 5410, Tabela 30 (EPR/XLPE)
//  - curto térmico: S ≥ 15 000·√1 / 137,86 = 108,8 mm² → barra 25×5 (125 mm²)
//  - k2 (barra 65 °C, ar 50 °C) = (15/30)^0,61 = 0,6552 → 25×5 nua 327 A × 0,6552 = 214,3 A
//  - esforço: F = 0,2·(√3/2)·30²·300/60 = 779,4 N; Z = 25·5²/6 = 104,17 mm³;
//    σ = 0,73 × 779,4 × 300 / (8 × 104,17) = 204,9 N/mm² ≤ 1,5 × 200
//  - Ae (IEC TR 60890, encostado na parede) 2200×800×400: 1,4·0,8·0,4 + 0,9·0,8·2,2 + 0,5·0,8·2,2
//    + 2·0,9·0,4·2,2 = 0,448 + 1,584 + 0,88 + 1,584 = 4,496 m²; 800×600×150: 1,014 m²
//  - Ipk = n·Icc com n = 2,0 para 10 < Icc ≤ 20 kA (NBR IEC 61439-1, Tabela 7) → 15 kA → 30 kA
//  - reserva: 16 circuitos → Tabela 59 = 4; 20 % → 3,2 → 4
//  - automação do exemplo: DI = 7 (campo) + 8 (2 por motor) + 8 (4 seletores × 2) + 1 (reset)
//    + 1 (relé de segurança) = 25 → 30 com 20 %; DO = 1 + 4 + 8 sinaleiros = 13 → 16;
//    fonte: 2206 mA × 1,25 = 2,76 A → 5 A
//  - motor 15 cv (11,03 kW), η 0,89, FP 0,84, 380 V: In = 11 032,5 / (√3·380·0,89·0,84) = 22,42 A

const fs = require('fs');
const path = require('path');
const { Helper } = require('dxf');
const C = require('../scripts/lib/calculo');
const T = require('../scripts/lib/tabelas');
const motor = require('../scripts/lib/index');
const { deEletrica, deIndustrial } = require('../scripts/lib/importar');
const TD = require('../../_comum/tipos-documento');
const { verificador } = require('../../_comum/teste');

const { perto, igual, fim } = verificador('quadros');
const predial = require('../exemplos/exemplo-qd-predial.json');
const automacao = require('../exemplos/exemplo-automacao.json');

// ── Fórmulas ──
const cfg380 = C.config({ quadro: { tensao_ff: 380, tensao_fn: 220 } });
perto('Ib F-N 1200 W FP 0,92 em 220 V', C.correnteDoCircuito(1200, 0.92, C.LIGACOES.FN, cfg380), 5.929, 0.001);
perto('Ib trifásico 4 kW FP 0,85 em 380 V', C.correnteDoCircuito(4000, 0.85, C.LIGACOES.FFF, cfg380), 7.150, 0.001);
perto('k adiabático 65 → 200 °C', C.kAdiabatico(65, 200), 137.86, 0.001);
perto('k adiabático 90 → 250 °C = 143 (NBR 5410, Tabela 30)', C.kAdiabatico(90, 250), 143.1, 0.002);
perto('k2 barra 65 °C com ar a 50 °C', C.k2Temperatura(65, 50), 0.6552, 0.001);
igual('k2 = 1 nas condições da DIN 43671 (65/35 °C)', C.k2Temperatura(65, 35), 1);
igual('barra para 300 A nua com k2 = 1 → 20×5 (274 A não serve: 25×5)', (() => { const b = C.escolherBarra(300, 1, false); return `${b.l}x${b.e}`; })(), '25x5');
perto('Ae parede 2200×800×400', C.superficieEfetiva({ altura: 2200, largura: 800, profundidade: 400 }, 'parede', 'autoportante').ae, 4.496, 0.0001);
perto('Ae parede 800×600×150', C.superficieEfetiva({ altura: 800, largura: 600, profundidade: 150 }, 'parede', 'sobrepor').ae, 1.014, 0.0001);
perto('Ae embutido = só a frente (0,9·W·H)', C.superficieEfetiva({ altura: 800, largura: 600, profundidade: 150 }, 'parede', 'embutir').ae, 0.432, 0.0001);
igual('FD da NBR IEC 61439-2: 4–5 saídas → 0,8; 10+ → 0,6', [C.rdf(5), C.rdf(16)], [0.8, 0.6]);
igual('Ipk = 2 × Icc para 15 kA', C.config({ quadro: { icc_ka: 15 } }).ipk, 30);
igual('Ipk = 1,7 × Icc para 6 kA', C.config({ quadro: { icc_ka: 6 } }).ipk, 10.2);
igual('Ics NBR NM 60898: 10 kA → 7,5 kA; 6 kA → 6 kA', [T.icsDin(10), T.icsDin(6)], [7.5, 6]);
const dpsSpda = C.dps(C.config({ quadro: { spda: true, ponto_entrada: true } }));
igual('DPS com SPDA no ponto de entrada → classe I+II, Iimp 12,5 kA, N-PE 50 kA, PE 16 mm²', [dpsSpda.classe, dpsSpda.iimp, dpsSpda.iimpNeutroPe, dpsSpda.peMin], ['I+II', 12.5, 50, 16]);
const dpsII = C.dps(C.config({ quadro: { spda: false } }));
igual('DPS sem SPDA → classe II, In 5 kA, N-PE 20 kA (trifásico), Uc 275 V, 4 un', [dpsII.classe, dpsII.in, dpsII.inNeutroPe, dpsII.uc.uc, dpsII.quantidade], ['II', 5, 20, 275, 4]);

// ── Exemplo 1: quadro de distribuição predial ──
const r1 = motor.processar(predial);
const c1 = r1.calc;
igual('QD predial: invólucro 800 × 600 × 150 de sobrepor', [c1.layout.involucro.altura, c1.layout.involucro.largura, c1.layout.involucro.profundidade], [800, 600, 150]);
igual('QD predial: arranjo cabe', c1.layout.cabe, true);
igual('QD predial: reserva = 4 circuitos (Tabela 59 e 20 %)', c1.reservaCircuitos, 4);
igual('QD predial: barramento tipo pente 100 A', [c1.barr.tipo, c1.barr.pente.a], ['pente', 100]);
igual('QD predial: geral 3P 100 A DIN, Icu 10 kA (IEC 60947-2, In > 63 A)', [c1.geral.polos, c1.geral.In, c1.geral.tipo, c1.geral.icu], [3, 100, 'din', 10]);
igual('QD predial: circuitos com Icn 6 kA (NBR NM 60898) ≥ Icc 6 kA', c1.circuitos.every(x => x.icu === 6 && x.icuOk), true);
igual('QD predial: DR1 4P 25 A 30 mA (circuitos 4, 5, 6)', [c1.drs[0].id, c1.drs[0].polos, c1.drs[0].In, c1.drs[0].idn, c1.drs[0].circuitos], ['DR1', 4, 25, 30, ['4', '5', '6']]);
igual('QD predial: nenhum circuito de 5.1.3.2.2 sem DR', c1.circuitos.filter(x => x.drFalta).length, 0);
perto('QD predial: Ib circuito 1 = 1200/(220·0,92)', c1.circuitos[0].ib, 5.929, 0.001);
igual('QD predial: desequilíbrio < 5 %', c1.dem.desequilibrio < 0.05, true);
igual('QD predial: FD 0,6 (16 saídas)', c1.dem.fd, 0.6);
igual('QD predial: atende à temperatura sem ventilação', [c1.term.ok, !!c1.term.ventilacao], [true, false]);
perto('QD predial: ΔT médio = P/(5,5·Ae)', c1.term.dtMedio, c1.perdas.total / (5.5 * c1.term.ae), 0.0001);
igual('QD predial: nenhuma fileira passa da largura útil', c1.layout.fileiras.every(f => f.usado <= c1.layout.larguraUtil + 1e-6), true);
const resPred = c1.layout.fileiras.flatMap(f => f.itens).filter(k => k.tipo === 'reserva' && k.zona === 'distribuicao').reduce((s, k) => s + k.largura, 0);
igual('QD predial: espaço de reserva ≥ 4 circuitos × 1 módulo', resPred >= 4 * T.MODULO_MM - 1e-6, true);
igual('QD predial: sem DR o circuito de banheiro é apontado', (() => { const d = JSON.parse(JSON.stringify(predial)); d.circuitos[8].dr = ''; return motor.processar(d).calc.circuitos[8].drFalta; })(), true);
igual('QD predial: Icc 15 kA → circuitos passam a 60947-2 15 kA', (() => { const d = JSON.parse(JSON.stringify(predial)); d.quadro.icc_ka = 15; const k = motor.processar(d).calc; return [k.circuitos[0].icu, k.circuitos[0].icuNorma]; })(), [15, 'NBR IEC 60947-2']);
igual('QD predial: Icu informado abaixo da Icc vira aviso de filiação', (() => { const d = JSON.parse(JSON.stringify(predial)); d.quadro.icc_ka = 8; d.circuitos[0].icu_ka = 6; const k = motor.processar(d).calc; return [k.circuitos[0].icuOk, k.circuitos[0].filiacao]; })(), [false, true]);
igual('QD predial: 13 verificações de projeto da NBR IEC 61439-1', c1.verificacoes.length, 13);
igual('QD predial: verificação ao curto dispensada (Icc ≤ 10 kA)', c1.verificacoes[10].situacao, 'dispensada');

// ── Exemplo 2: quadro de automação ──
const r2 = motor.processar(automacao);
const c2 = r2.calc;
// barra PE na mesma fileira dos bornes: 1733 mm de 1750 na placa do 2000 × 800 (antes 2200 × 800)
igual('Automação: invólucro autoportante 2000 × 800 × 400', [c2.layout.involucro.altura, c2.layout.involucro.largura, c2.layout.involucro.profundidade], [2000, 800, 400]);
igual('Automação: barra PE divide a fileira com os bornes', c2.layout.fileiras.some(f => f.zonas.includes('barras_np') && f.zonas.includes('bornes')), true);
igual('Automação: E/S em uso 25 DI / 13 DO / 3 AI / 1 AO', c2.aut.usados, { DI: 25, DO: 13, AI: 3, AO: 1 });
igual('Automação: com 20 % de reserva 30 / 16 / 4 / 2', c2.aut.req, { DI: 30, DO: 16, AI: 4, AO: 2 });
igual('Automação: 1 módulo de cada tipo', c2.aut.modulos, { DI: 1, DO: 1, AI: 1, AO: 1 });
igual('Automação: consumo 24 Vcc 2206 mA → fonte 5 A', [c2.aut.totalMa, c2.aut.fonteA], [2206, 5]);
igual('Automação: 13 relés de interface (um por DO)', c2.aut.reles, 13);
perto('Automação: In do motor de 15 cv', c2.motores[0].in, 22.42, 0.002);
igual('Automação: soft-starter com contator AC-3 25 A', c2.motores[0].partidaInfo.dispositivos.find(d => d.ref === 'K1').nominal_a, 25);
igual('Automação: barramento de barras 25 × 5 (curto térmico)', [c2.barr.tipo, c2.barr.fase.l, c2.barr.fase.e], ['barra', 25, 5]);
perto('Automação: seção mínima ao curto 108,8 mm²', c2.barr.sCurtoMin, 108.81, 0.001);
perto('Automação: capacidade corrigida da 25 × 5', c2.barr.capacidade, 214.3, 0.002);
perto('Automação: força eletrodinâmica 779 N', c2.barr.dinamico.F, 779.4, 0.001);
perto('Automação: σ ≈ 205 N/mm²', c2.barr.dinamico.sigma, 204.9, 0.002);
igual('Automação: barra PE ≥ Tabela 58 (S/2 = 62,5 mm²)', [c2.barr.secaoPeMin, c2.barr.pe.l * c2.barr.pe.e >= 62.5], [62.5, true]);
igual('Automação: DPS classe I+II (edificação com SPDA)', c2.dpsInfo.classe, 'I+II');
igual('Automação: IP54 / IK08 para indústria com poeira', [c2.inv.ip, c2.inv.ik], ['IP54', 'IK08']);
// 2000×800×400: 1,4·0,8·0,4 + 0,9·0,8·2 + 0,5·0,8·2 + 2·0,9·0,4·2 = 0,448 + 1,44 + 0,8 + 1,44 = 4,128 m²
perto('Automação: Ae do invólucro 4,128 m²', c2.term.ae, 4.128, 0.0001);
igual('Automação: precisa de ventilação forçada (ar no topo > 50 °C)', [c2.term.ok, !!c2.term.ventilacao], [false, true]);
igual('Automação: ventilador escolhido dá a vazão com filtro', c2.term.ventilacao.ventilador * T.EFICIENCIA_FILTRO >= c2.term.ventilacao.vazao, true);
igual('Automação: relé de segurança e botão de emergência', [c2.aut.releSeguranca, c2.aut.porta.some(p => p.tipo === 'emergencia')], [true, true]);
igual('Automação: canaleta da direita é de comando (separada da potência)', c2.layout.verticais.direita.areaCabos > 0 && c2.fio.areaCmd > 0, true);
igual('Automação: ocupação das canaletas ≤ 50 %', [...c2.layout.horizontais.filter(h => h.zona !== 'topo'), c2.layout.verticais.esquerda, c2.layout.verticais.direita].every(h => (h.ocupacao || 0) <= 0.5 + 1e-9), true);

// ── Documentos ──
(async () => {
  const saida = path.join(require('os').tmpdir(), 'teste-quadros');
  fs.mkdirSync(saida, { recursive: true });
  for (const [nome, res] of [['predial', r1], ['automacao', r2]]) {
    const tipos = motor.tiposDisponiveis(res);
    igual(`${nome}: 6 documentos`, tipos, ['memorial', 'planilha', 'desenho', 'modelo3d', 'ensaios', 'laudo']);
    for (const tipo of tipos) {
      const g = await motor.gerarDocumento(res, tipo);
      fs.writeFileSync(path.join(saida, `${nome}-${g.nomeArquivo}`), g.buffer);
      if (tipo === 'desenho') {
        const txt = g.buffer.toString('utf8');
        const h = new Helper(txt);
        const ents = h.parsed.entities;
        igual(`${nome}: DXF com extensão .dxf`, path.extname(g.nomeArquivo), '.dxf');
        igual(`${nome}: DXF com carimbo HM-CARIMBO e atributos`, [ents.some(e => e.type === 'INSERT' && e.block === 'HM-CARIMBO'), ents.filter(e => e.type === 'ATTRIB').length >= 20], [true, true]);
        igual(`${nome}: DXF com layers de painel`, ['QD-PAINEL', 'QD-TRILHO', 'QD-CANALETA', 'QD-COMPONENTE', 'QD-COTA', 'QD-BARRAMENTO'].every(l => ents.some(e => e.layer === l)), true);
        igual(`${nome}: DXF tem os TAGs dos dispositivos`, ['Q0', 'LEGENDA', 'LAYOUT INTERNO — PLACA DE MONTAGEM', 'VISTA FRONTAL EXTERNA'].every(t => ents.some(e => e.type === 'TEXT' && String(e.string).startsWith(t))), true);
      } else if (tipo === 'modelo3d') {
        const html = g.buffer.toString('utf8');
        igual(`${nome}: 3D é .html autossuficiente com a cena do quadro`, [path.extname(g.nomeArquivo), /^<!doctype html>/.test(html), /<script[^>]+src=|<link[^>]+href=/i.test(html), /three\.js r186/.test(html)], ['.html', true, false, true]);
        const cena = JSON.parse(html.match(/<script>window\.CENA=(.*?);document\.querySelectorAll/s)[1]);
        igual(`${nome}: cena tipo quadro com o invólucro do arranjo`, [cena.tipo, cena.involucro.A, cena.involucro.L, cena.involucro.P], ['quadro', res.calc.layout.involucro.altura, res.calc.layout.involucro.largura, res.calc.layout.involucro.profundidade]);
        igual(`${nome}: Q0 no 3D com as medidas do layout`, (() => { const q = cena.caixas.find(b => b.rotulo === 'Q0'); const k = res.calc.comps.lista.find(x => x.ref === 'Q0'); return !!q && q.l === k.largura && q.a === k.altura && q.p === k.prof; })(), true);
        igual(`${nome}: camadas e peças clicáveis`, cena.camadas.length >= 8 && cena.caixas.filter(b => b.info).length > 10, true);
      } else {
        igual(`${nome}: ${tipo} é Office (zip)`, g.buffer.slice(0, 2).toString(), 'PK');
      }
    }
  }
  // Orçamento
  const o1 = motor.montarOrcamento(r2, 'fabricacao');
  const codigos = o1.itens.filter(i => i.codigo).map(i => i.codigo);
  igual('orçamento de fabricação com mão de obra qd_*', codigos.length >= 10 && codigos.every(c => c.startsWith('qd_')), true);
  igual('orçamento de fabricação com materiais da lista', o1.itens.filter(i => i.secao === 'Materiais e Equipamentos').length, r2.calc.materiais.filter(m => m.quantidade > 0).length);
  const base = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'backend', 'src', 'services', 'precosMaoDeObraReferencia.js'), 'utf8');
  const o2 = motor.montarOrcamento(r1, 'inspecao');
  const todos = [...new Set([...codigos, ...motor.montarOrcamento(r1, 'fabricacao').itens, ...o2.itens].map(i => (typeof i === 'string' ? i : i.codigo)).filter(Boolean))];
  igual('todos os códigos qd_* estão na base de mão de obra do sistema', todos.filter(c => !base.includes(`codigo: '${c}'`)), []);
  igual('documentos e modos classificados (tipos-documento.js)', TD.classificarSkill(motor).semClassificacao, []);
  igual('desenho é de projeto; ensaios servem aos dois', [TD.usoDoDocumento('quadros', 'desenho'), TD.usoDoDocumento('quadros', 'ensaios'), TD.usoDoModo('quadros', 'fabricacao')], ['projeto', 'ambos', 'projeto']);
  // Importação das skills de elétrica
  const ele = require('../../eletrica/scripts/lib/index').exemplo();
  const imp1 = deEletrica(ele, { tag: 'QD-01' });
  const nEle = require('../../eletrica/scripts/lib/index').processar(ele).calc.circuitos.length;
  igual('importa todos os circuitos da elétrica predial', imp1.dados.circuitos.length, nEle);
  igual('quadro importado da elétrica calcula', motor.processar(imp1.dados).calc.circuitos.length, nEle);
  const ind = require('../../eletrica-industrial/scripts/lib/index').exemplo();
  const imp2 = deIndustrial(ind, { quadro: 'CCM-01' });
  const nInd = require('../../eletrica-industrial/scripts/lib/index').processar(ind).calc.unidades.filter(u => u.quadro === 'CCM-01').length;
  igual('importa os motores do CCM-01 da elétrica industrial', imp2.dados.motores.length, nInd);
  igual('CCM importado calcula com partidas', motor.processar(imp2.dados).calc.motores.length, nInd);
  // Formulário
  igual('formulário tem identificação, quadro, fabricantes, circuitos e automação', motor.formulario.slice(0, 6).map(x => x.titulo.split(' ')[0]), ['1.', '2.', '2.1', '3.', '4.', '5.']);
  igual('formulário pede fabricante padrão e por tipo', JSON.stringify(motor.formulario[2]).includes('fabricantes.por_tipo.contator'), true);

  // ── Catálogo de fabricantes (registros FICTÍCIOS de teste em testes/catalogo-fixture.json) ──
  const CAT = require('../scripts/lib/catalogo');
  const fixture = require('./catalogo-fixture.json').componentes;
  const embutido = require('../dados/catalogo-componentes.json');
  igual('catálogo embutido: só registros verificados, oficiais (catalogo_hm) e com medidas', embutido.componentes.every(r => r.verificado === true && r.origem === 'catalogo_hm' && /^https?:/.test(r.fonte_url) && r.largura_mm > 0), true);
  igual('entrada vence o arquivo e duplicata é ignorada', CAT.carregarCatalogo({ catalogo_componentes: [...fixture, fixture[0]] }).length, fixture.length + embutido.componentes.length);
  const S = 'Schneider Electric';
  igual('menor modelo que atende: 1P 16 A C com Icu ≥ 6 → o de 6 kA', CAT.selecionar(fixture, 'disjuntor_din', S, { polos: 1, corrente: 16, curva: 'C', icu: 6 }).referencia, 'FX-DIN-1P16C-6');
  igual('Icu ≥ 10 kA pula o de 6 kA → 1P 20 A de 15 kA', CAT.selecionar(fixture, 'disjuntor_din', S, { polos: 1, corrente: 20, curva: 'C', icu: 10 }).referencia, 'FX-DIN-1P20C-15');
  igual('curva D não aceita o de curva C', CAT.selecionar(fixture, 'disjuntor_din', S, { polos: 3, corrente: 16, curva: 'D', icu: 6 }).referencia, 'FX-DIN-3P16D-6');
  igual('referência informada manda', CAT.selecionar(fixture, 'disjuntor_din', S, { polos: 1, corrente: 16, curva: 'C', icu: 6 }, 'FX-DIN-1P20C-15').referencia, 'FX-DIN-1P20C-15');
  igual('contator: menor AC-3 ≥ 18 A → 18 A', CAT.selecionar(fixture, 'contator', 'WEG', { ac3: 18 }).referencia, 'FX-CWM18');
  igual('disjuntor-motor: faixa que contém 22,4 A → 17–23 A', CAT.selecionar(fixture, 'disjuntor_motor', 'WEG', { corrente: 22.4 }).referencia, 'FX-MPW-23');
  igual('DPS classe I+II não usa o de classe II', CAT.selecionar(fixture, 'dps', S, { classe: 'I', uc: 275 }).referencia, 'FX-DPS-I-275');
  igual('outro fabricante sem registro → nada', CAT.selecionar(fixture, 'contator', 'Siemens', { ac3: 18 }), null);
  igual('especificação de busca no formato do contrato', CAT.especificacao('contator', 'WEG', { ac3: 25, bobina: '24 Vcc' }), 'WEG contator 25 A AC-3 bobina 24 Vcc');
  const FAB = { padrao: S, por_tipo: { contator: 'WEG', disjuntor_motor: 'WEG', soft_starter: 'WEG', inversor: 'WEG', fonte_24v: 'Mean Well', clp_cpu: 'Siemens', clp_modulo: 'Siemens', rele_interface: 'Finder', borne: 'Conexel', switch: 'Siemens', rele_seguranca: 'WEG' } };
  const comCat = (ex, ajuste) => { const d = JSON.parse(JSON.stringify(ex)); d.fabricantes = FAB; d.catalogo_componentes = fixture; if (ajuste) ajuste(d); return motor.processar(d); };
  const p3 = comCat(predial).calc;
  const q1 = p3.comps.lista.find(k => k.ref === 'Q1');
  igual('QD com catálogo: Q1 com a medida do fabricante (18 × 85 × 78,5) e a origem', [q1.largura, q1.altura, q1.prof, q1.medida.origem, q1.medida.referencia], [18, 85, 78.5, 'catalogo', 'FX-DIN-1P10C-6']);
  igual('QD com catálogo: todos os dispositivos do QD têm registro (nada sem medida)', p3.componentes_sem_medida, []);
  igual('QD com catálogo: comparação típica × fabricante no resultado', [!!p3.comparacao, p3.comparacao.tipica.involucro.altura, p3.comparacao.catalogo.involucro.altura], [true, 800, 800]);
  igual('QD com catálogo: a lista de materiais traz fabricante, referência, medidas e fonte', (() => { const m = p3.materiais.find(x => x.referencia_fabricante === 'FX-DIN-3P100C-10'); return !!m && m.fabricante === S && m.medidas === '81 × 85 × 78,5' && /exemplo\.invalid/.test(m.fonte); })(), true);
  igual('QD com catálogo: DPS não verificado vira [CONFERIR] na fonte', (() => { const k = comCat(predial, d => { d.quadro.spda = true; d.quadro.ponto_entrada = true; }).calc.materiais.find(x => x.referencia_fabricante === 'FX-DPS-I-275'); return !!k && /CONFERIR/.test(k.fonte); })(), true);
  const a3 = comCat(automacao).calc;
  const t1 = a3.comps.lista.find(k => k.ref === 'M-01').filhos.find(f => f.ref === 'T1');
  igual('Automação com catálogo: inversor com as medidas do fabricante', [t1.l, t1.h, t1.p, t1.medida.referencia], [115, 255, 170, 'FX-CFW-16']);
  igual('Automação com catálogo: sem registro → lista com especificação de busca', a3.componentes_sem_medida.map(x => [x.tag, x.tipo, x.fabricante]), [['KS1', 'rele_seguranca', 'WEG'], ['A6', 'clp_modulo', 'Siemens'], ['A90', 'switch', 'Siemens']]);
  igual('Automação com catálogo: o que ficou sem registro sai com medida típica', a3.comps.lista.find(k => k.ref === 'A90').medida.origem, 'tipica');
  igual('Automação com catálogo: bornes pela largura do fabricante', a3.born.find(g => g.id === 'X2').medidas.every(m => m.origem === 'catalogo'), true);
  igual('Automação com catálogo: memorial com a seção de medidas e aproveitamento', (() => { const ss = motor.secoesMemorial(comCat(automacao)); const s1 = ss.find(x => /^10\.1 /.test(x.titulo)); return !!s1 && s1.tabela.linhas.length > 30 && s1.paragrafos.some(p => /Comparação com as medidas típicas/.test(p)); })(), true);
  igual('sem fabricantes: nada entra como "sem medida" e não há comparação', [r1.calc.componentes_sem_medida.length, r1.calc.comparacao], [0, undefined]);
  fim();
})().catch(e => { console.log(`  FALHOU com erro: ${e.stack}`); process.exitCode = 1; });
