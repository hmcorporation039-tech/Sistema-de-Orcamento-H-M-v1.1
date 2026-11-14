// Vista interna do painel de pressurização e do quadro de automação (CLP) no 3D e fiação de comando desenhada
// pela escada de relés (14/11/2026). Dados SINTÉTICOS. Rodar: node _comum/instalacao/teste-paineis-comando.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PN = require('./paineis');
const FC = require('./fiacaoComando');
const { criarInteracao } = require('./interacao');
const L = require('../especificacao/logica');

let n = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
const finitos = (cena) => (cena.condutores || []).every(c => c.pts.length >= 2 && c.pts.every(p => p.length === 3 && p.every(Number.isFinite)));

caso('pressurização: escada do perfil (mesmos blocos), cenários, porta e placa ligadas à simulação', () => {
  const c = PN.cenaDoPainelPressurizacao(PN.dadosDoPainelPressurizacao({ tag: 'QPE-T' }));
  const CR = c.comandoReles;
  assert.ok(CR && CR.modelo && CR.interacao, 'modelo da escada para o visualizador');
  assert.ok(CR.cenarios.length >= 10 && CR.cenarios.every(x => x.ok), `cenários: ${CR.cenarios.filter(x => !x.ok).map(x => x.nome).join('; ')}`);
  const tags = new Set(c.caixas.map(b => b.tag));
  for (const t of ['Q0', 'QC1', 'G1', 'F1', 'V1-Q1', 'V2-Q1', 'V1/T1', 'V2/T1', 'KA', 'KB1', 'KB2', 'KREV', 'KTR']) assert.ok(tags.has(t), `peça ${t}`);
  // cada controle da porta tem a sua peça; cada relé da placa responde à simulação
  for (const p of CR.porta) assert.ok(c.porta.itens.some(i => i.tag === p.meshTag), `porta ${p.id}`);
  assert.ok(CR.porta.some(p => p.id === 'ST') && CR.porta.some(p => /^H\d/.test(p.id)), 'seletora de teste e sinaleiros na porta');
  assert.strictEqual(CR.placa['V1/T1'], 'U1.RUN');
  // alarme da central com V1 em AUT: KA, KB1 e o inversor U1 em funcionamento
  const r = L.avaliar(CR.modelo, { 'CENTRAL.ALARME': true, S1: 'AUT', S2: 'AUT' });
  assert.ok(r.saidas.KA && r.saidas.KB1 && r.saidas['U1.RUN'] && !r.saidas.KB2);
  assert.ok(/sem o cálculo da skill/i.test(c.avisos[0]), 'arranjo típico declarado');
});

caso('pressurização com o cálculo da skill: 1 ventilador sem reversão; sempre inversor (padrão H&M, mesmo com soft-starter pedido)', () => {
  const c = PN.cenaDoPainelPressurizacao(PN.dadosDoPainelPressurizacao({ calculo: { arr: { n: 1 }, al: { partida: { tipo: 'soft_starter' } }, vent: { cv: 5, in: 7.9 } } }));
  assert.ok(!c.comandoReles.modelo.degraus.some(d => d.saida === 'KREV'), 'sem reversão com um ventilador');
  const acion = c.caixas.find(b => b.tag === 'V1/T1');
  assert.ok(acion && acion.ficha.some(f => /Inversor de frequência/.test(f.valor)) && !acion.ficha.some(f => /Soft-starter/.test(f.valor)));
  assert.ok(c.comandoReles.cenarios.every(x => x.ok));
});

caso('fiação de comando: cada degrau barra → contatos → bobina → 0 V; chicote da porta; acende com a simulação', () => {
  const c = PN.cenaDoPainelPressurizacao(PN.dadosDoPainelPressurizacao({}));
  const cmd = c.condutores.filter(x => x.funcao === 'comando');
  assert.ok(cmd.length >= 40, `${cmd.length} condutores de comando`);
  assert.ok(finitos(c));
  assert.ok(cmd.some(x => x.porta) && cmd.some(x => !x.porta), 'chicote da porta e fiação da placa');
  assert.ok(cmd.every(x => x.energia.tipo === 'comando' && x.energia.sinal), 'todo condutor de comando com o sinal da escada');
  // cada relé com bobina: um condutor chega a "KX (bobina A1)" e outro sai de "KX A2" para o 0 V
  for (const d of c.comandoReles.modelo.degraus.filter(x => /^K/.test(x.saida) && !c.comandoReles.modelo.temporizadores.some(t => t.tag === x.saida))) {
    assert.ok(cmd.some(x => x.para === `${d.saida} (bobina A1)`), `bobina de ${d.saida}`);
    assert.ok(cmd.some(x => x.de === `${d.saida} A2` && /0 V/.test(x.para)), `retorno de ${d.saida}`);
  }
  // entradas de campo vão aos bornes X2 (laranja), na ordem das conexões
  assert.ok(cmd.some(x => /CENTRAL\.ALARME \(X2:1\/X2:2\)/.test(`${x.de} ${x.para}`)), 'central no X2:1/2');
  assert.ok(cmd.some(x => x.cor === FC.COR_COMANDO.EXTERNO), 'campo em laranja');
  assert.ok(c.camadas.some(x => x.id === 'fiacao-cmd') && c.camadas.some(x => x.id === 'fiacao-cmd-porta'));
});

caso('fiação de comando no 3D do quadro gerado pela especificação (skill quadros)', () => {
  const E = require('../especificacao/entrada');
  const P = require('../especificacao/perfis');
  const S = require('../../quadros/scripts/lib/especificacao');
  const motor = require('../../quadros/scripts/lib/index');
  const M3D = require('../../quadros/scripts/lib/modelo3d');
  return E.lerEspecificacao(fs.readFileSync(path.join(__dirname, '..', '..', 'pressurizacao', 'testes', 'especificacao-exemplo.txt'), 'utf8')).then((l) => {
    const p = S.solucionar(l.lidos, { perfil: P.perfilDe(l.perfil) });
    const res = motor.processar({ ...p.dadosQuadros, especificacao: { perfil: l.perfil, lidos: l.lidos } });
    assert.strictEqual(res.especificacao.perfil, 'painel_pressurizacao', 'os documentos refazem a solução pelo perfil GRAVADO (antes: quadro de força)');
    const html = M3D.gerarHtml(res.calc, res.dados, { especificacao: res.especificacao });
    const cena = JSON.parse(/window\.CENA=(\{[\s\S]*?\});document\.querySelectorAll/.exec(html)[1]);
    const cmd = cena.condutores.filter(x => x.funcao === 'comando');
    assert.ok(cmd.length >= 40 && cmd.some(x => x.porta), `${cmd.length} condutores de comando no 3D do quadro`);
    assert.ok(cena.condutores.some(x => x.funcao === 'PE') && cena.condutores.some(x => x.funcao === 'F'), 'a fiação de força continua');
    assert.ok(cena.avisos.some(a => /Fiação de comando desenhada pela escada/.test(a)));
  });
});

caso('quadro de automação (CLP): módulos pela lista de pontos com a reserva, relés de interface, bornes e RUN/STOP', () => {
  const d = PN.dadosDoClp({ tag: 'QA-T', calculo: { tot: { di: 22, do: 12, ai: 10, ao: 3 }, reserva: 0.2, protocolo: 'bacnet', controladores: 1 } });
  const c = PN.cenaDoClp(d);
  const mods = c.caixas.filter(b => b.camada === 'clp' && /^(DI|DO|AI|AO)\d/.test(b.tag || ''));
  // DI 22·1,2=27 → 2×16; DO 12·1,2=15 → 1×16; AI 10·1,2=12 → 2×8; AO 3·1,2=4 → 1×4
  assert.deepStrictEqual(mods.map(m => m.tag), ['DI1', 'DI2', 'DO1', 'AI1', 'AI2', 'AO1']);
  assert.strictEqual(c.caixas.filter(b => b.camada === 'interface').length, 12, 'um relé de interface por saída digital usada');
  assert.strictEqual(c.caixas.filter(b => b.camada === 'bornes' && b.tag === 'X2' && b.l <= 6).length, 47, 'um borne de campo por ponto');
  assert.ok(finitos(c) && c.condutores.some(x => x.camada === 'rede-fios') && c.condutores.filter(x => x.camada === 'io-fios').length >= 40);
  // CLP no motor de interação: STOP apaga as saídas, falha da fonte é falha
  const rede = criarInteracao(c.equipamentos);
  const id = c.equipamentos[0].id;
  assert.ok(rede.saida(id));
  rede.agir(id, 'stop');
  assert.ok(!rede.saida(id) && rede.aparencia(id) === 'aberto');
  rede.agir(id, 'falha');
  assert.strictEqual(rede.aparencia(id), 'falha');
  assert.ok(c.caixas.some(b => b.rotulo === 'RUN' && b.acendeEm.includes('energizado')) && c.caixas.some(b => b.rotulo === 'ERR' && b.acendeEm.includes('falha')));
});

caso('quadro de automação sem a skill: sensores do projeto viram entradas analógicas (estimativa declarada)', () => {
  const c = PN.cenaDoClp(PN.dadosDoClp({ contagem: { sensores: 9 } }));
  assert.deepStrictEqual(c.caixas.filter(b => /^AI\d/.test(b.tag || '')).map(b => b.tag), ['AI1', 'AI2'], '9 × 1,2 = 11 → 2 módulos de 8');
  assert.ok(/estimativa/.test(c.avisos[0]));
  const vazio = PN.cenaDoClp(PN.dadosDoClp({}));
  assert.ok(/Sem a lista de pontos/.test(vazio.avisos[0]) && !vazio.caixas.some(b => /^(DI|DO|AI|AO)\d/.test(b.tag || '')));
});

caso('símbolos: painel de pressurização e quadro de automação reconhecidos no desenho e com vista interna no 3D', () => {
  const T = require('../cad/tiposDePonto');
  assert.strictEqual(T.simboloDaDescricao('Painel de comando da pressurização da escada'), 'HM-PRZ-PAINEL');
  assert.strictEqual(T.simboloDaDescricao('Quadro de automação QA-01 (CLP)'), 'HM-AUT-CONTROLADOR');
  assert.strictEqual(T.simboloDaDescricao('Controlador DDC'), 'HM-AUT-CONTROLADOR');
  assert.strictEqual(T.simboloDaDescricao('QD-1 quadro de distribuição'), 'HM-ELE-QUADRO', 'o QD continua QD');
  assert.strictEqual(T.simboloDaDescricao('teclado da central de alarme'), 'HM-ALM-TECLADO', '"clp" só como palavra inteira');
  assert.ok(!T.tipoPelaLayer('PRESSURIZACAO-DUTOS'), 'layer de dutos da pressurização não vira painel');
  const { SIMBOLOS } = require('../cad/simbolos');
  const { ESPEC } = require('../cad/modelo3d');
  assert.ok(SIMBOLOS['HM-PRZ-PAINEL'] && ESPEC['HM-PRZ-PAINEL']);
  const app = fs.readFileSync(path.join(__dirname, '..', 'cad', 'visualizador3d', 'app.js'), 'utf8');
  assert.ok(/'HM-AUT-CONTROLADOR': 'automacao'/.test(app) && /'HM-PRZ-PAINEL': 'pressurizacao'/.test(app), 'vista interna ligada aos símbolos');
});

// os casos rodam em sequência (o do 3D do quadro é assíncrono: lê a especificação)
(async () => {
  for (const [nome, fn] of casos) { await fn(); n++; console.log(`  ok  ${nome}`); }
  console.log(`painéis de comando e fiação: ${n} casos ok`);
})().catch((e) => { console.error(e); process.exit(1); });
