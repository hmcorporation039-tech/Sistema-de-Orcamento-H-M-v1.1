// Teste do controle de acesso — controladoras, fechaduras, fontes/baterias,
// queda de tensão, rotas de fuga (fail-safe) e credenciais
const motor = require('../scripts/lib/index');
const { RHO } = require('../scripts/lib/calculo');
const { montarCaixas, montarCaderno } = require('../scripts/lib/caderno');
const { perto, igual, fim } = require('../../_comum/teste').verificador('controle de acesso');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const res = motor.processar(motor.exemplo());
const { calc } = res;
const porta = (id) => calc.pontos.find(p => p.id === id);
const ctrl = (id) => calc.controladoras.find(c => c.id === id);

// Pontos: 6 portas + 2 catracas; leitores: 5 portas × 1 + P3 (entrada e saída) × 2 + 2 catracas × 2
igual('pontos de acesso', calc.nPontos, 8);
igual('leitores', calc.leitoresTotal, 5 + 2 + 4);
// Controladoras: max(⌈6 × 1,2 ÷ 4⌉, ⌈7 leitores × 1,2 ÷ 4⌉) = max(2, 3) = 3
igual('controladoras com 20 % de reserva', calc.nCtrl, 3);
igual('distribuição das portas', calc.controladoras.map(c => c.portas.join(',')), ['P1,P2', 'P3,P4', 'P5,P6']);
// Fechaduras: vidro → 300 kgf (2 folhas), metal → 500 kgf
igual('P1 porta dupla de vidro: eletroímã 300 kgf × 2', [porta('P1').eletroima, porta('P1').nFechaduras], [300, 2]);
igual('P3 porta metálica: eletroímã 500 kgf', porta('P3').eletroima, 500);
igual('botoeiras de saída (P1, P2, P5)', calc.botoeirasSaida, 3);
igual('acionadores de emergência nas rotas de fuga (P1, P6)', calc.botoeirasEmergencia, 2);
igual('sensores de porta (uma por folha)', calc.sensores, 7);
// CTRL1: repouso = 0,3 + 2 leitores × 0,12 + 3 eletroímãs × 0,48 = 1,98 A → fonte ≥ 1,98 × 1,25 = 2,475 → 3 A;
// bateria ≥ 1,98 × 4 h × 1,25 = 9,9 Ah → 12 Ah
perto('CTRL1 corrente em repouso', ctrl('CTRL1').iRep, 0.3 + 2 * 0.12 + 3 * 0.48);
igual('CTRL1 fonte e bateria', [ctrl('CTRL1').fonteA, ctrl('CTRL1').bateriaAh], [3, 12]);
// CTRL3: fail-secure não consome em repouso; pico soma solenoide 0,9 + fecho 0,5
perto('CTRL3 corrente de pico', ctrl('CTRL3').iPico, 0.3 + 0.25 + 0.12 + 0.9 + 0.5);
igual('CTRL3 bateria (0,67 × 4 × 1,25 = 3,35 Ah → 7 Ah)', ctrl('CTRL3').bateriaAh, 7);
// P6 portão a 110 m: cabo 126,5 m, 0,5 A → S ≥ 2·126,5·0,5·ρ/1,2 = 1,88 mm² → 2,5 mm²
igual('P6 seção da alimentação', porta('P6').secao, 2.5);
perto('P6 queda de tensão', porta('P6').queda, 2 * 126.5 * 0.5 * RHO / 2.5);
igual('aviso de Wiegand acima de 100 m', calc.avisos.some(a => /P6: cabo de leitor Wiegand/.test(a)), true);
// Cabos: manga 6 vias = Σ leitores × distância × 1,15 (P3 com 2 leitores)
perto('manga 6 vias dos leitores', calc.cabos.mangaLeitor6, Math.ceil((15 + 20 + 2 * 35 + 30 + 8 + 110) * 1.15));
// Credenciais: 120 usuários (soma dos perfis) × 1,1 = 132; 30 visitantes × 1,1 = 33; licença 8 × 1,2 = 9,6 → 16
igual('cartões', [calc.usuarios, calc.cartoes, calc.cartoesVisitante], [120, 132, 33]);
igual('licença de software', calc.licenca, 16);
igual('exemplo sem não conformidades de projeto', calc.ncsProjeto.length, 0);
igual('fail-secure com saída livre em rota de fuga é aceito (P6)', res.checklist.find(c => c.cod === 'R1').situacao, 'NV');

// Borda: P6 sem saída mecânica livre (saída por botoeira) com fecho fail-secure → NC R1 (P1)
const d1 = clonar(motor.exemplo());
d1.portas.find(p => p.id === 'P6').sentido = 'entrada';
const r1 = motor.processar(d1);
const nc1 = r1.ncs.find(n => n.item === 'R1');
igual('rota de fuga sem fail-safe gera NC P1', [!!nc1, nc1 && nc1.prioridade], [true, 'P1']);
igual('parecer não conforme', r1.parecer.situacao.startsWith('NAO_CONFORME'), true);
// Borda: eletroímã informado como fail-secure é corrigido para fail-safe
const d2 = clonar(motor.exemplo());
d2.portas.find(p => p.id === 'P1').modo_falha = 'fail_secure';
igual('eletroímã sempre fail-safe', motor.processar(d2).calc.pontos.find(p => p.id === 'P1').falha, 'fail_safe');
// Borda: sem integração com incêndio havendo rota de fuga → NC R2; catracas sem passagem acessível → NC A2
const d3 = clonar(motor.exemplo());
d3.sistema.integracao_incendio = false;
d3.sistema.passagem_acessivel = false;
const r3 = motor.processar(d3);
igual('NCs R2 e A2', ['R2', 'A2'].map(c => r3.ncs.some(n => n.item === c)), [true, true]);
// Borda: bateria para 24 h e controladoras de 2 portas sem reserva
const d4 = clonar(motor.exemplo());
Object.assign(d4.sistema, { autonomia_h: 24, portas_por_controladora: 2, leitores_por_controladora: 4, reserva_pct: 0 });
const c4 = motor.processar(d4).calc;
igual('controladoras de 2 portas sem reserva', c4.nCtrl, 3);
// CTRL1 (P1, P2): 1,98 A × 24 h × 1,25 = 59,4 Ah → 2 × 40 Ah
igual('bateria para 24 h em paralelo', [c4.controladoras[0].nBaterias, c4.controladoras[0].bateriaAh], [2, 40]);
// Borda: sem portas cadastradas
let erro = '';
try { motor.processar(motor.modeloVazio()); } catch (e) { erro = e.message; }
igual('modelo vazio pede portas', /ao menos uma porta/.test(erro), true);

// Achado A2.6 (revisão 27/10/2026): queda de tensão do LEITOR pelo par 24 AWG da manga
// (0,205 mm²) não era verificada. ΔV = 2·L·I·ρ ÷ 0,205, limite 10 % de 12 V (1,2 V).
// P3 biometria 0,25 A, 35 m × 1,15 = 40,25 m → 2·40,25·0,25·0,0178/0,205 = 1,75 V (14,6 %)
perto('P3 queda do leitor biométrico na manga', porta('P3').quedaLeitor, 2 * 40.25 * 0.25 * RHO / 0.205);
igual('P3 leitor ganha par próprio PP 2 × 0,5 mm²', porta('P3').secaoLeitor, 0.5);
// P6 MIFARE 0,12 A a 126,5 m → 2,64 V (22 %); P1 MIFARE a 17,25 m → 0,36 V (3 %) fica na manga
igual('P6 acima de 10 % e P1 dentro', [porta('P6').quedaLeitorPct > 10, porta('P1').secaoLeitor], [true, null]);
igual('aviso da queda do leitor P6', calc.avisos.some(a => a.startsWith('P6: queda de 2,64 V (22 %')), true);
// PP dos leitores = (P3 2 leitores × 40,25 + P6 126,5) = 207 m
igual('cabo PP dos leitores nos materiais', calc.materiais.find(m => /alimentação dos leitores/.test(m.descricao)).quantidade, 207);
igual('leitor facial IP (PoE) fora da verificação', porta('CT1').quedaLeitor, 0);
// Cancela com leitor UHF 0,8 A a 30 m (34,5 m de cabo): 2·34,5·0,8·0,0178/0,205 = 4,79 V (40 %) → PP 1 mm²
const d5 = clonar(motor.exemplo());
d5.portas.push({ id: 'CN1', local: 'Garagem', tipo: 'cancela', quantidade: 1, sentido: 'entrada', distancia_m: 30 });
d5.sistema.veiculos = 50;
const cn1 = motor.processar(d5).calc.pontos.find(p => p.id === 'CN1');
igual('leitor UHF da cancela: 40 % de queda → PP 2 × 1 mm²', [Math.round(cn1.quedaLeitorPct), cn1.secaoLeitor], [40, 1]);

{
  // Caderno: uma caixa por controladora; relé de incêndio nas caixas com rota de fuga; campo fora da placa
  const caixas = montarCaixas(res);
  igual('caderno: uma caixa por controladora', caixas.map(c => c.id), calc.controladoras.map(c => c.id));
  const c1 = caixas.find(c => c.id === 'CTRL1');
  igual('caderno CTRL1: fonte 3 A e bateria 12 Ah do cálculo', [c1.itens.some(i => i.tipo === 'fonte' && /3 A/.test(i.descricao)), c1.itens.some(i => i.tipo === 'bateria' && /12 Ah/.test(i.descricao))], [true, true]);
  igual('caderno: relé de incêndio só nas caixas com rota de fuga', caixas.map(c => c.itens.some(i => i.tag === 'RL-INC')), calc.controladoras.map(c => c.portas.some(u => calc.pontos.find(p => p.id === u.replace(/[.][0-9]+$/, '')).rota) && calc.incendio));
  igual('caderno: leitores, fechaduras e sensores são de campo (fora da placa)', c1.itens.filter(i => ['LEI', 'FCH', 'SEN'].includes(i.tag)).every(i => i.na_placa === false), true);
  const cad = montarCaderno(res);
  igual('caderno: normas IEC 60839-11-1 e NBR 9077, verificações de rota de fuga e bateria', [cad.normas.some(n => n.codigo === 'IEC 60839-11-1'), cad.normas.some(n => /NBR 9077/.test(n.codigo)), cad.verificacoes.some(v => /Rota de fuga fail-safe/.test(v.item)), cad.verificacoes.some(v => /Autonomia da bateria/.test(v.item))], [true, true, true, true]);
  igual('caderno: plaqueta H&M', /H&M/.test(cad.plaqueta_hm.modelo), true);
  const d6 = clonar(motor.exemplo()); d6.sistema.integracao_incendio = false;
  igual('caderno sem integração de incêndio: sem relé e com aviso', [montarCaixas(motor.processar(d6)).some(c => c.itens.some(i => i.tag === 'RL-INC')), montarCaderno(motor.processar(d6)).avisos.some(a => /sem integração com a central/.test(a))], [false, true]);
}
(async () => {
  for (const t of motor.tiposDisponiveis(res).filter(x => x !== 'caderno')) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  let temPuppeteer = true;
  try { require('../../_comum/fabricacao/pdf').carregarPuppeteer(); } catch { temPuppeteer = false; console.log('  (puppeteer do backend ausente — PDF do caderno não testado)'); }
  if (temPuppeteer) {
    const g = await motor.gerarDocumento(res, 'caderno');
    igual('caderno do controle de acesso: PDF (%PDF, application/pdf, .pdf)', [g.buffer.slice(0, 4).toString(), g.mime, /_Caderno_Fabricacao_Caixas_Controle_Acesso_R[0-9]+[.]pdf$/.test(g.nomeArquivo)], ['%PDF', 'application/pdf', true]);
    if (process.env.SALVAR_PDF) require('fs').writeFileSync(process.env.SALVAR_PDF, g.buffer);
  }
  const orc = motor.montarOrcamento(res, 'execucao');
  igual('orçamento com leitores de porta (7) e catracas (2)', [orc.itens.find(i => i.codigo === 'ace_leitor').quantidade, orc.itens.find(i => i.codigo === 'ace_catraca').quantidade], [7, 2]);
  igual('orçamento só com seções do sistema', orc.itens.every(i => ['Materiais e Equipamentos', 'Serviços (Mão de Obra)'].includes(i.secao)), true);
  const insp = motor.montarOrcamento(r1, 'inspecao');
  igual('orçamento de vistoria com correção da NC', [insp.itens[0].codigo, insp.itens.some(i => i.subgrupo === 'Correção de não conformidades')], ['ace_vistoria', true]);
  fim();
})();
