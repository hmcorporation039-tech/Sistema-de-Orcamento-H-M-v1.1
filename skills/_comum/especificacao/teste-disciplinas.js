// Projeto pela especificação nas demais disciplinas (14/11/2026): central de incêndio, subestação de MT,
// automação/BMS e QD predial pelos perfis de SKILL (./solucaoSkill.js) e a CAG com sequência de chillers
// (perfil do quadro com os blocos sequencia_chillers e comando_por_chiller). Especificações SINTÉTICAS em
// skills/<disciplina>/testes/especificacao-exemplo.txt. Rodar: node _comum/especificacao/teste-disciplinas.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('./entrada');
const P = require('./perfis');
const SS = require('./solucaoSkill');
const DOCS = require('./documentos');
const PL = require('./planilhaPrecos');

const RAIZ = path.join(__dirname, '..', '..');
const espec = (pasta) => fs.readFileSync(path.join(RAIZ, pasta, 'testes', 'especificacao-exemplo.txt'), 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

(async () => {
  // ── perfis registrados e escolhidos pelo texto (o de mais termos característicos) ──
  const chaves = P.listarPerfis().map(p => p.chave);
  for (const c of ['quadro_forca_comando', 'painel_pressurizacao', 'cag_sequencia_chillers', 'quadro_distribuicao_predial', 'automacao_bms', 'central_incendio', 'subestacao_mt']) ok(chaves.includes(c), `perfil ${c}`);
  const escolha = {};
  for (const [pasta, perfil] of [['incendio', 'central_incendio'], ['media-tensao', 'subestacao_mt'], ['automacao', 'automacao_bms'], ['eletrica', 'quadro_distribuicao_predial'], ['climatizacao', 'cag_sequencia_chillers'], ['pressurizacao', 'painel_pressurizacao']]) {
    escolha[pasta] = await E.lerEspecificacao(espec(pasta));
    eq(escolha[pasta].perfil, perfil, `${pasta}: perfil escolhido pelo texto`);
  }

  // ── central de incêndio ──────────────────────────────────────────────────
  const inc = P.perfilDe('central_incendio');
  const pi = SS.solucionar(escolha.incendio.lidos, { perfil: inc });
  eq(pi.tipoSolucao, 'skill');
  eq(pi.laudo.disciplina, 'incendio');
  eq(pi.dadosLaudo.sistema.quantidades_informadas, { detectores_fumaca: 86, detectores_temperatura: 6, acionadores: 14, avisadores: 16 }, 'quantidades da especificação no formulário');
  eq(pi.dadosLaudo.sistema.reserva_laco_pct, 20);
  const mat = (p, re) => p.materiais.find(m => re.test(m.descricao));
  eq(mat(pi, /Central de alarme endereçável/).descricao, 'Central de alarme endereçável com 2 laço(s)', '(92+14+16+8) × 1,2 / 125 → 2 laços');
  eq(mat(pi, /Módulo de comando/).quantidade, 8, 'módulos pela matriz: pressurização 1 + elevadores 2 + portas 1 + HVAC 1 + BMS 1 + chuveiros 2');
  ok(mat(pi, /Painel repetidor/), 'material extra do perfil (painel repetidor)');
  ok(pi.causaEfeito.some(c => c.id === 'pressurizacao' && c.modulo === 'comando'), 'matriz: pressurização');
  ok(pi.causaEfeito.some(c => c.id === 'elevadores' && c.modulos === 2), 'matriz: 2 elevadores lidos da especificação');
  ok(pi.pontos.some(p => p.id === 'alarme_15min'), 'ponto: tempo de alarme na bateria');
  ok(pi.pendencias.some(p => /reconhecimento na central/.test(p.texto)), 'pendência: partida imediata da pressurização');
  ok(pi.decisoes.every(d => /lido da especificação|matriz de causa/.test(d.texto)), 'cada decisão com a frase de origem');
  // a sugestão aprovada muda o formulário e sai dos pontos
  const pi2 = SS.solucionar(escolha.incendio.lidos, { perfil: inc, decisoes: { alarme_15min: 'SIM' } });
  eq(pi2.dadosLaudo.sistema.tempo_alarme_min, 15);
  ok(!pi2.pontos.some(p => p.id === 'alarme_15min') && pi2.excecoes.some(x => /Adotado/.test(x.texto)), 'decisão aprovada vira exceção declarada');
  ok(pi.materiais.every(m => m.grupo !== 'Materiais'), 'todo material da central num grupo do perfil');

  // ── subestação de MT ─────────────────────────────────────────────────────
  const pm = SS.solucionar(escolha['media-tensao'].lidos, { perfil: P.perfilDe('subestacao_mt') });
  eq(pm.dadosLaudo.transformador.potencia_kva, 300);
  eq(pm.dadosLaudo.transformador.z_pct, 4.5);
  eq(pm.dadosLaudo.fornecimento.protecao, 'fusivel');
  eq(pm.dadosLaudo.fornecimento.icc_3f_ka, 6);
  eq(pm.dadosLaudo.cabo_mt.comprimento_m, 45);
  eq(pm.dadosLaudo.fornecimento.distribuidora, 'Neoenergia Brasília');
  ok(mat(pm, /^Transformador trifásico 300 kVA/), 'transformador do projeto na lista');
  ok(mat(pm, /Fusível limitador HH/), 'proteção por fusível (300 kVA, admitida pela skill)');
  ok(pm.pendencias.some(p => /Wenner/.test(p.texto)), 'resistividade não informada: pendência da skill');
  eq(mat(pm, /cobre nu 50 mm²/).grupo, 'Aterramento');
  eq(mat(pm, /verde-amarelo/).grupo, 'Aterramento', '"amarelo" não cai no grupo de proteção');
  // fusível pedido acima do limite: a skill adota disjuntor e o perfil levanta o ponto
  const lm = JSON.parse(JSON.stringify(escolha['media-tensao'].lidos));
  lm.requisitos.find(r => r.id === 'trafo.potencia').valor = { kva: 750 };
  const pm2 = SS.solucionar(lm, { perfil: P.perfilDe('subestacao_mt') });
  ok(pm2.pontos.some(p => p.id === 'fusivel_x_potencia'), 'fusível pedido para 750 kVA → ponto a levantar');

  // ── automação / BMS ──────────────────────────────────────────────────────
  const pa = SS.solucionar(escolha.automacao.lidos, { perfil: P.perfilDe('automacao_bms') });
  eq(pa.dadosLaudo.equipamentos.map(e => [e.tipo, e.quantidade]), [['chiller', 2], ['bomba', 3], ['ahu', 8], ['exaustor', 4], ['iluminacao', 16], ['medidor', 5]]);
  eq(pa.dadosLaudo.sistema.protocolo, 'bacnet', 'BACnet vence o Modbus dos medidores (último do mapa)');
  eq(pa.dadosLaudo.sistema.reserva_pct, 25);
  eq(pa.decisoes.filter(d => d.titulo === 'Protocolo principal').length, 1, 'uma decisão por campo');
  ok(pa.pendencias.some(p => /gateways Modbus/.test(p.texto)), 'rede mista');
  ok(pa.pontos.some(p => p.id === 'incendio_bms'), 'incêndio no BMS: só supervisão');

  // ── QD predial (skill quadros) ───────────────────────────────────────────
  const pq = SS.solucionar(escolha.eletrica.lidos, { perfil: P.perfilDe('quadro_distribuicao_predial') });
  eq(pq.laudo.disciplina, 'quadros');
  eq(pq.dadosLaudo.quadro.tag, 'QD-02');
  eq(pq.dadosLaudo.quadro.ip, 'IP41');
  eq(pq.dadosLaudo.quadro.disjuntor_geral_a, 63);
  eq(pq.dadosLaudo.circuitos.length, 9, '6 da tabela + 1 da frase + 2 reservas');
  const ch = pq.dadosLaudo.circuitos.find(c => /chuveiro/i.test(c.descricao));
  eq([ch.tipo, ch.potencia_w, ch.ligacao, ch.disjuntor_a, ch.dr], ['tue', 5500, 'FF', 32, 'idr'], 'chuveiro: kW → W, 2P → FF, DR');
  const des = pq.indicadores.find(i => /Desequil/.test(i.rotulo));
  ok(des && Number(String(des.valor).replace(/\D/g, '')) <= 15, `fases distribuídas pela menor carga (${des && des.valor})`);

  // ── CAG com sequência de chillers (motor do quadro) ──────────────────────
  const S = require('../../quadros/scripts/lib/especificacao');
  const ps = S.solucionar(escolha.climatizacao.lidos, { perfil: P.perfilDe('cag_sequencia_chillers') });
  ok(['sequencia_chillers', 'comando_por_chiller'].every(b => ps.comando.blocos.some(x => x.id === b)), 'blocos da sequência ativos');
  ok(['KL2', 'KS2', 'KTS', 'KC1', 'KC2'].every(t => ps.comando.reles.some(r => r.tag === t)), 'relés da sequência');
  eq(ps.comando.modelo.temporizadores.find(t => t.tag === 'KTS').preset_s, 240, 'anti-ciclagem lida da especificação');
  ok(ps.funcional.length >= 20 && ps.funcional.every(f => f.ok), `cenários: ${ps.funcional.filter(f => !f.ok).map(f => f.nome).join('; ')}`);
  ok(ps.funcional.some(f => /Sem fluxo/.test(f.nome)) && ps.funcional.some(f => /Rodízio/.test(f.nome)), 'cenários de intertravamento e de rodízio');
  // o quadro de força e comando (sem sequência) continua igual: nenhum relé novo
  const base = await E.lerEspecificacao(espec('pressurizacao'));
  ok(!S.solucionar(base.lidos, { perfil: P.perfilDe(base.perfil) }).comando.reles.some(r => /^K(C|L2|S2)/.test(r.tag)), 'sequência só no perfil dela');

  // ── documentos: planilha de preços e texto de entrega ─────────────────────
  for (const [nome, p] of [['incêndio', pi], ['MT', pm], ['BMS', pa], ['QD', pq]]) {
    const pr = await PL.gerarPlanilhaPrecos(p, {}, { contingencia: 0.1 });
    ok(pr.buffer.length > 5000, `${nome}: planilha`);
    ok(pr.resumo.porGrupo.length >= 1 && pr.resumo.aCotar === p.materiais.length, `${nome}: sem preço → a cotar (nunca R$ 0,00)`);
    const t = DOCS.textoEntregaSkill(p, pr.resumo, ['Memorial']);
    ok(/^# /.test(t) && /O que foi lido e adotado/.test(t) && /Pesquisa de preços/.test(t), `${nome}: texto de entrega`);
  }
  ok(/Matriz de causa e efeito/.test(DOCS.textoEntregaSkill(pi)), 'texto do incêndio com a matriz');

  // ── ponto de entrada único (assistente/agentes) ──────────────────────────
  const pe = await E.projetarPelaEspecificacao(espec('incendio'));
  ok(pe.folhas.some(f => /Memorial/i.test(f.titulo)) && /Matriz de causa e efeito/.test(pe.textoEntrega), 'projetarPelaEspecificacao: documentos da skill e texto');

  // ── skill: documentos da especificação no laudo gravado ──────────────────
  const motorInc = SS.motorDaSkill('incendio');
  const res = motorInc.processar({ ...pi.dadosLaudo, especificacao: { perfil: 'central_incendio', lidos: escolha.incendio.lidos } });
  ok(motorInc.tiposDisponiveis(res).includes('precos_especificacao') && motorInc.tiposDisponiveis(res).includes('entrega_especificacao'), 'laudo com especificação: documentos novos');
  ok(!motorInc.tiposDisponiveis(motorInc.processar(pi.dadosLaudo)).includes('precos_especificacao'), 'laudo comum: sem os documentos da especificação');
  const doc = await motorInc.gerarDocumento(res, 'entrega_especificacao');
  ok(/\.md$/.test(doc.nomeArquivo) && /markdown/.test(doc.mime), 'texto de entrega em Markdown');

  console.log(`especificação nas disciplinas: ${n}/${n} verificações OK`);
})().catch((e) => { console.error(e); process.exit(1); });
