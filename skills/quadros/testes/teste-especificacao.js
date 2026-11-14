// Teste do projeto do quadro pela ESPECIFICAÇÃO (scripts/lib/especificacao.js + _comum/especificacao).
// Especificação SINTÉTICA (obra, equipamentos e marcas fictícios) com a mesma estrutura de uma especificação
// de cotação real: CAG genérica com 2 resfriadores, 2 bombas (1 + 1) por inversor do cliente e válvulas.
// Rodar: node skills/quadros/testes/teste-especificacao.js
const assert = require('assert');
const { blocosDoTexto } = require('../../_comum/especificacao/texto');
const { lerRequisitos } = require('../../_comum/especificacao/leitor');
const E = require('../scripts/lib/especificacao');
const DOCS = require('../../_comum/especificacao/documentos');
const PL = require('../../_comum/especificacao/planilhaPrecos');
const motor = require('../scripts/lib/index');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const ESPEC = `QF-TST — QUADRO DE FORÇA E COMANDO DA CAG DE TESTE
Especificação técnica para cotação
Obra Fictícia de Teste — Prédio Exemplo · Rev. 02 · 01/11/2026

1. OBJETIVO
Fornecimento de um quadro de força e comando para a central de água gelada. O quadro alimenta 2 chillers e 2 bombas (1 operando + 1 reserva) e deixa saída para automação futura.

2. DADOS DE ENTRADA
Item | Dado
Alimentação | 380/220 V · 3F + N + PE · 60 Hz, vinda do QGBT do prédio
Chillers (2 un.) | Genérico RX-80 · 380 V 3N~ · MCA 70 A / MFA 90 A cada
Bombas (2 un.) | Genérica BX-75 7,5 cv, 380 V, 1 operando + 1 reserva
Inversores (2 un.) | Genérico GV-13 (380 V, 13 A), fornecidos pelo cliente para montagem dentro do quadro
Válvulas (2 un.) | Válvula 2 vias on/off na saída de cada chiller, atuador com retorno por mola. Tensão 24v
Sinais do chiller | Cada chiller tem contatos secos na placa: pedido de bomba (DO1) e comando da válvula (borne a confirmar). Entradas da placa: liberação remota (DI2) e confirmação de bomba operando (UI3).

3. O QUE O QUADRO DEVE FAZER
3.1 Força
- Disjuntor geral (referência 200 A; o fornecedor confirma com a lista de cargas) e barramento.
- Protetor contra surtos (DPS) e relé de falta/sequência de fase.
- Barra de neutro e barra de terra (PE).
3.2 Comando das bombas
- Uma seletora por bomba: MANUAL – 0 – AUTOMÁTICO.
- MANUAL: a bomba liga e desliga pela seletora do operador, sem depender do chiller.
- AUTOMÁTICO: a bomba liga quando qualquer um dos chillers pedir bomba e desliga quando o pedido acabar.
- Seletora de bomba titular (B1 / B2): em automático liga somente a bomba selecionada como titular.
- Partida das bombas sempre pelo inversor. Falha da bomba lida pelo relé de falha do inversor.
- Contato seco de bomba operando enviado aos dois chillers (entrada UI3).
- Seletora de liberação dos chillers (contato para a entrada DI2 de cada chiller).
- Botão de emergência: desliga as bombas e retira a liberação dos chillers.
- Lógica por relés; CLP não é necessário. Tensão de comando a critério do fornecedor.
3.3 Válvulas
- O quadro fornece a alimentação das duas válvulas, por um circuito protegido e independente da emergência.
- O contato que abre a válvula vem da placa do chiller.
- Sempre que uma bomba estiver ligada em MANUAL, o quadro abre as duas válvulas.
3.4 Iluminação e tomadas
- 1 circuito de iluminação: disjuntor 1P+N 10 A.
- 1 circuito de tomadas de uso geral: disjuntor 1P+N 20 A com proteção DR 30 mA.
- 1 circuito reserva: disjuntor 1P+N 16 A.
3.5 Automação futura
- Régua de bornes dedicada com a rede RS-485 (Modbus RTU) dos dois inversores interligados.
- Contatos secos livres em bornes: bomba B1 operando, bomba B2 operando, falha B1, falha B2, quadro em modo manual.
- Prever bornes de entrada para que a automação possa selecionar a bomba titular (em paralelo com a seletora da porta).
- Reserva de 20% de espaço na placa de montagem e nas réguas de bornes.
3.6 Sinalização na porta
Quadro energizado · chillers liberados · bomba B1 operando · bomba B2 operando · falha B1 · falha B2 · modo manual. Sem multimedidor.

4. CONSTRUÇÃO
- Quadro de sobrepor em aço, IP54. Dimensão de referência 1200 × 800 × 300 mm.
- Os alimentadores vindos do QGBT entram por cima.
- Separação física entre força e comando.
- Ventilação forçada com filtro, dimensionada para a dissipação dos inversores, com termostato.
- Normas: ABNT NBR IEC 61439-1/2, NBR 5410 e NR-10.
`;

(async () => {
  const lidos = lerRequisitos(blocosDoTexto(ESPEC), E.PERFIL);
  ok(lidos.estatistica.cobertura >= 90, `cobertura da leitura ${lidos.estatistica.cobertura} %`);
  const p = E.solucionar(lidos, { cliente: 'Cliente <Fictício>', pedido: 'Faça o projeto do quadro com unifilar e 2' });

  // força
  const q = (t) => p.protecoes.find(x => x.tag === t);
  eq([q('Q2').tipo, q('Q2').In, q('Q2').condutor.secao], ['caixa_moldada', 90, 25], 'chiller: caixa moldada In = MFA, condutor IB ≤ In ≤ Iz');
  eq([q('Q4').tipo, q('Q4').In], ['disjuntor_motor', 20], 'entrada do inversor: disjuntor-motor ≥ 13 A × 1,4');
  ok(q('IDR') && q('IDR').idn === 30 && q('IDR').In === 25, 'DR 30 mA na TUG (NBR 5410 5.1.3.2.2)');
  ok(q('QDPS') && q('QRF'), 'DPS e RFF com proteção própria');
  ok(p.demanda.iProj > 160 && p.demanda.iProj < 200, `demanda ${p.demanda.iProj} A (MCA + bomba em operação + 25 %)`);
  eq([p.geral.In, p.geral.Ir], [200, null], 'geral 200 A (referência da especificação ≥ demanda)');
  ok(p.barramento.fase, 'barramento pela skill');
  // comando
  eq(p.comando.reles.filter(r => !r.tipo).map(r => r.tag).sort(), ['KB1', 'KB2', 'KE', 'KF1', 'KF2', 'KL', 'KMAN', 'KP', 'KR1', 'KR2', 'KT'], '11 relés pelos blocos');
  ok(p.funcional.length >= 25 && p.funcional.every(f => f.ok), `simulação: ${p.funcional.filter(f => !f.ok).map(f => f.nome).join('; ')}`);
  eq(p.comando.fonte.A, 5, 'fonte 24 Vcc 5 A (um tamanho acima: consumo do atuador não confirmado)');
  eq(p.sinaleiros.length, 7, 'sinaleiros da especificação');
  ok(p.reguas.every(r => r.reserva >= Math.ceil(r.bornes.length * 0.2)), 'réguas com ≥ 20 % de reserva');
  ok(p.reguas.find(r => r.id === 'X3').bornes.length === 12 && p.reguas.some(r => r.id === 'X4'), 'X3 (titular + 5 contatos livres) e X4 RS-485');
  // ventilação
  ok(p.ventilacao && p.ventilacao.vazao > 50 && p.ventilacao.livre > p.ventilacao.vazao, 'ventilação V = 3,1·P/ΔT com folga dos filtros');
  // pendências, pontos e exceções
  const pend = p.pendencias.map(x => x.texto).join(' | ');
  ok(/Icc/.test(pend) && /RLA/.test(pend) && /válvula/.test(pend) && /Vca ou 24 Vcc/.test(pend) && /bornes de partida/.test(pend) && /Comprimento dos cabos/.test(pend), 'o que falta confirmar');
  eq(p.pontos.map(x => x.id), ['titular_x_automacao', 'reserva_sem_troca', 'emergencia_sem_corte'], 'pontos a levantar com o cliente');
  ok(p.excecoes.length >= 6 && p.excecoes.every(e => e.letra), 'exceções a declarar');
  ok(p.premissas.some(t => /chegou incompleto/.test(t)), 'interpretação do pedido truncado registrada');
  ok(p.decisoes.some(d => d.titulo === 'Disjuntor geral') && p.decisoes.some(d => d.titulo === 'Ventilação'), 'decisões com justificativa');
  // materiais
  ok(p.materiais.some(m => m.grupo === 'Fornecido pelo cliente' && /GV-13/.test(m.descricao)), 'inversores do cliente');
  ok(p.materiais.find(m => /^K1–K11$/.test(m.tag)).quantidade === 11, 'relés na lista de materiais');

  // decisões aprendidas mudam o projeto
  const p2 = E.solucionar(lidos, { aprendido: { decisoes: { titular_automacao: 'REMOTO', troca_automatica: 'SIM' } } });
  ok(!p2.pontos.some(x => x.id === 'titular_x_automacao' || x.id === 'reserva_sem_troca'), 'pontos resolvidos pelas decisões');
  ok(p2.comando.seletoras.some(s => (s.posicoes || []).includes('REM')) && p2.funcional.every(f => f.ok), 'seletora com REM e troca automática simuladas');
  const p3 = E.solucionar(lidos, { respostas: { reserva_sem_troca: 'manter' } });
  ok(!p3.pontos.some(x => x.id === 'reserva_sem_troca') && p3.excecoes.some(x => /resposta do engenheiro/.test(x.origem || '')), '"manter como pedido" vira exceção');

  // documentos
  const html = DOCS.htmlFolhas({ ...p, meta: { ...p.meta, obra: '<script>alert(1)</script>' } });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;'), 'escapeHtml nas folhas');
  ok(['FL01', 'FL02', 'FL03', 'FL04', 'FL05', 'FL06', 'FL07'].every(f => html.includes(f)) && /Documento preliminar/.test(html) && html.includes('01/07'), 'folhas FL01–FL07 com carimbo');
  ok(DOCS.htmlFicha(p).includes('Ficha técnica'), 'ficha técnica');
  // as caixas de texto dos desenhos não se sobrepõem (FL01 unifilar, FL02 escada, FL04 réguas, FL05 arranjo)
  const DES = require('../../_comum/especificacao/desenhos');
  const DA = require('../../_comum/especificacao/desenhosArranjo');
  for (const [fl, s] of [['FL01', DES.unifilar(p)], ['FL02', DES.ladder(p)], ['FL04', DA.reguasSvg(p.reguas)], ['FL05', DA.layoutArranjo(p.arranjo, p.quadro)]]) {
    const col = DES.colisoesDeTexto(s);
    ok(DES.caixasDeTexto(s).length > 10 && col.length === 0, `${fl}: textos sobrepostos ${JSON.stringify(col.slice(0, 5))}`);
  }
  const datas = [...html.matchAll(/<div class="r">Data<\/div><div class="v">([^<]+)</g)].map(m => m[1]);
  ok(datas.length === 7 && new Set(datas).size === 1, `a mesma data no carimbo de todas as folhas (${[...new Set(datas)].join(', ')})`);
  // arranjo por zonas da skill: cabe no invólucro de referência; relés auxiliares e reserva fora da demanda
  ok(p.arranjo && p.arranjo.modo === 'zonas' && p.arranjo.cabe && p.arranjo.involucro.altura === 1200 && p.arranjo.involucro.largura === 800, `arranjo ${JSON.stringify(p.arranjo && { ...p.arranjo.involucro, ocupado: p.arranjo.alturaNecessaria })}`);
  ok(p.arranjo.fileiras.some(f => f.itens.some(k => k.nome === 'KE' && k.tipo === 'rele_auxiliar')), 'relés auxiliares no arranjo');
  const calcQ = require('../scripts/lib/calculo').calcular(p.dadosQuadros, { semComparacao: true });
  const so1 = require('../scripts/lib/calculo').calcular({ ...p.dadosQuadros, motores: p.dadosQuadros.motores.slice(0, 1) }, { semComparacao: true });
  ok(Math.abs(calcQ.dem.iProjeto - so1.dem.iProjeto) < 0.01, 'motor de reserva fora da demanda da skill');
  const pr = await PL.gerarPlanilhaPrecos(p, {});
  ok(pr.itens.filter(i => !i.cliente).every(i => i.origem === 'A cotar' && i.preco == null), 'sem preço no sistema: tudo "A cotar", nunca R$ 0,00');
  const md = DOCS.textoEntrega(p, pr.resumo);
  ok(/\| FL01 \|/.test(md) && /Pontos a levantar/.test(md) && /Falta confirmar/.test(md) && /ART/.test(md), 'texto de entrega');

  // projeto da skill (contrato do sistema): dados da skill + especificação guardada
  const dados = { ...p.dadosQuadros, especificacao: { perfil: p.perfil, lidos, pedido: '', decisoes: {}, respostas: {} } };
  const res = motor.processar(dados);
  ok(res.especificacao && ['folhas', 'pesquisa_precos', 'ficha', 'entrega'].every(t => motor.tiposDisponiveis(res).includes(t)), 'documentos novos no contrato');
  const r0 = motor.processar(require('../exemplos/exemplo-qd-predial.json'));
  ok(!motor.tiposDisponiveis(r0).includes('folhas'), 'projeto comum não oferece as folhas da especificação');
  const xl = await motor.gerarDocumento(res, 'pesquisa_precos');
  ok(xl.nomeArquivo.endsWith('.xlsx') && xl.buffer.length > 5000, 'planilha pela skill');
  try {
    const pdf = await motor.gerarDocumento(res, 'folhas');
    ok(pdf.buffer.slice(0, 4).toString() === '%PDF', 'PDF das folhas');
  } catch (e) {
    if (!/Puppeteer não encontrado/.test(e.message)) throw e;
    console.log('  (PDF pulado: puppeteer do backend não instalado)');
  }
  console.log(`quadros/especificação: ${n}/${n} verificações OK`);
})().catch(e => { console.error(e); process.exit(1); });
