// Painel de pressurização pela ESPECIFICAÇÃO (perfil dados/perfil-especificacao.json, herdado do quadro de
// força e comando; motor skills/quadros/scripts/lib/especificacao.js). Especificação SINTÉTICA em
// testes/especificacao-exemplo.txt. Rodar: node skills/pressurizacao/testes/teste-especificacao.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../../_comum/especificacao/entrada');
const L = require('../../_comum/especificacao/logica');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

(async () => {
  const texto = fs.readFileSync(path.join(__dirname, 'especificacao-exemplo.txt'), 'utf8');
  const lida = await E.lerEspecificacao(texto, {});
  eq(lida.perfil, 'painel_pressurizacao', 'perfil detectado pelo texto');
  const req = new Set(lida.lidos.requisitos.filter(r => r.valor !== false).map(r => r.id));
  ok(['comando.partida_alarme', 'comando.reversao', 'comando.pressostato_fluxo', 'comando.modo_teste', 'comando.inibicao_fumaca', 'automacao.status_central', 'comando.parada_so_painel'].every(i => req.has(i)), 'requisitos da pressurização');
  eq(lida.lidos.requisitos.find(r => r.id === 'comando.tempo_reversao').valor.s, 20, 'tempo de reversão lido');
  const p = await E.projetarPelaEspecificacao(lida, {});
  eq(p.motores.map(m => m.id), ['V1', 'V2'], 'ventiladores');
  ok(p.motores.every(m => m.acion && !m.acion.cliente), 'inversores do fornecimento da H&M');
  ok(p.materiais.some(m => m.grupo === 'Acionamentos' && m.quantidade === 2), 'inversores na lista de materiais');
  ok(!p.comando.reles.some(r => r.tag === 'KE'), 'sem emergência que pare os ventiladores (parada só no painel)');
  ok(p.comando.reles.some(r => r.tag === 'KTR' && r.tipo === 'temporizador' && r.preset_s === 20), 'temporizador da reversão com o tempo da especificação');
  ok(p.funcional.length >= 15 && p.funcional.every(f => f.ok), `simulação: ${p.funcional.filter(f => !f.ok).map(f => f.nome).join('; ')}`);
  // sequência no tempo: alarme → V1; sem fluxo → espera 20 s → V2
  const m = p.comando.modelo;
  let st = L.avaliar(m, { S1: 'AUT', S2: 'AUT', 'CENTRAL.ALARME': true, 'V1.sem_fluxo': true });
  ok(st.saidas.KB1 && !st.saidas.KB2, 'alarme: parte o líder V1');
  st = L.avaliar(m, st.entradas, st, 21);
  st = L.avaliar(m, st.entradas, st, 0);
  ok(!st.saidas.KB1 && st.saidas.KB2 && st.saidas['U2.RUN'], 'sem fluxo por 20 s: reversão para V2');
  st = L.avaliar(m, { ...st.entradas, 'CENTRAL.ALARME': false }, st, 0);
  ok(!st.saidas.KREV && !st.saidas.KB2, 'fim do alarme desfaz a reversão');
  ok(p.pendencias.some(x => /Central de alarme/.test(x.texto)) && p.pendencias.some(x => /Pressostatos/.test(x.texto)) && p.pendencias.some(x => /PID/.test(x.texto)), 'pendências da pressurização');
  ok(p.excecoes.some(x => /Parada somente no painel/.test(x.texto)), 'exceção declarada');
  ok(!p.pendencias.some(x => /Tempo de reversão/.test(x.texto)), 'tempo informado: sem pendência de tempo');
  // pedido com botão de emergência: vira ponto a levantar; decisão aprovada retira o botão
  const comEmerg = texto.replace('- Parada somente no painel.', '- Botão de emergência: desliga os ventiladores.');
  const p2 = await E.projetarPelaEspecificacao(comEmerg, {});
  ok(p2.pontos.some(x => x.id === 'emergencia_em_seguranca'), 'emergência em sistema de segurança é questionada');
  const p3 = await E.projetarPelaEspecificacao(comEmerg, { decisoes: { sem_emergencia: 'SIM' } });
  ok(!p3.comando.reles.some(r => r.tag === 'KE') && p3.funcional.every(f => f.ok), 'decisão aprovada: sem emergência');
  ok(/\| FL02 \|/.test(p.textoEntrega), 'texto de entrega');
  console.log(`pressurizacao/especificação: ${n}/${n} verificações OK`);
})().catch(e => { console.error(e); process.exit(1); });
