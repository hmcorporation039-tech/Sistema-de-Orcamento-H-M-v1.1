// MODO "COMANDO POR RELÉS" do 3D do quadro (09/11/2026 — projeto pela especificação do cliente).
// O quadro gerado pela especificação traz na cena o MODELO da lógica (cena.comandoReles.modelo:
// relés, seletoras, botões, entradas externas, degraus) e o formato de interação (controles com
// estados e ações). Aqui: clicar numa seletora/botão da porta muda o estado do controle; a cada
// ação chama entradasDaInteracao() → avaliar() (../../especificacao/logica.js, o MESMO avaliador
// dos documentos e dos testes) e repinta os sinaleiros H*, os relés K*, os acionamentos (U*.RUN)
// e os contatores KM*. Um relógio de 1 s faz os temporizadores andarem. O painel lateral mostra os
// controles (inclusive os sinais de campo e as falhas, que não ficam na porta), os indicadores e
// a lista de cenários da verificação funcional com o resultado — "Aplicar" reproduz o cenário.
//
// cena.comandoReles = { modelo, interacao: { controles, indicadores }, cenarios: [{ nome, entradas,
//   passos?, espera, ok, falhas }], porta: [{ meshTag, id }], placa: { tagDaPeca: sinal } }

import { avaliar, entradasDaInteracao } from '../../especificacao/logica.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// valor de uma entrada do cenário → estado do controle da interação
function estadoDoValor(c, v) {
  if (c.tipo === 'seletora') return String(v);
  if (c.tipo === 'emergencia') return v ? 'acionado' : 'solto';
  if (c.tipo === 'botao') return v ? 'pressionado' : 'solto';
  if (c.tipo === 'falha') return v ? 'em falha' : 'normal';
  if (['supervisor', 'fusivel', 'energia'].includes(c.tipo)) return v ? c.estados[0] : c.estados[1];
  return v ? 'ativo' : 'inativo';
}

export function iniciarComandoReles({ CR, comTag, painel, pintar, aviso, aoMudar, relogio = true }) {
  const controles = CR.interacao.controles;
  const ctrl = new Map(controles.map(c => [c.id, c]));
  const iniciais = () => Object.fromEntries(controles.map(c => [c.id, c.inicial]));
  let estados = iniciais();
  let r = null;
  let ultimoCenario = null;
  const pecas = [];
  for (const mesh of comTag) {
    const tag = String(mesh.userData.tag);
    const p = (CR.porta || []).find(x => x.meshTag === tag);
    if (p && ctrl.has(p.id)) pecas.push({ mesh, tipo: 'controle', id: p.id });
    else if (p) pecas.push({ mesh, tipo: 'indicador', sinal: p.id, porta: true });
    else if (CR.placa && CR.placa[tag]) pecas.push({ mesh, tipo: 'indicador', sinal: CR.placa[tag] });
  }
  const rotulo = (id) => (CR.modelo.rotulos || {})[id] || ctrl.get(id)?.rotulo || id;
  function avaliarAgora(dt = 0) {
    const entradas = entradasDaInteracao(CR.modelo, estados);
    r = avaliar(CR.modelo, entradas, r, dt);
    if (dt) r = avaliar(CR.modelo, entradas, r, 0);
  }
  const ligado = (s) => !!(r && r.saidas[s]);

  function htmlPainel() {
    const sel = controles.filter(c => c.local === 'porta');
    const campo = controles.filter(c => c.local !== 'porta');
    const pill = (id) => `<span class="cr-pill${ligado(id) ? ' cr-on' : ''}" title="${esc(rotulo(id))}">${esc(id)}</span>`;
    const saidas = Object.keys(r ? r.saidas : {}).filter(k => !k.endsWith('.bobina'));
    const grupos = [
      ['Sinaleiros', saidas.filter(k => /^H\d+$/.test(k))],
      ['Relés e temporizadores', saidas.filter(k => /^K/.test(k))],
      ['Acionamentos e cargas', saidas.filter(k => /\.(RUN|FALHA)$|^YV\d+$|^KM/.test(k))],
      ['Saídas para o campo', saidas.filter(k => (CR.modelo.saidasCampo || []).some(s => s.tag === k))],
    ];
    return `<div class="cr">
      <div class="cr-sub">Porta</div>
      ${sel.map(c => `<div class="cr-lin"><span>${esc(c.rotulo)}</span><span>${c.acoes.map(a => `<button data-cr="${esc(c.id)}" data-acao="${esc(a.id)}" class="${estados[c.id] === a.para ? 'cr-at' : ''}">${esc(c.tipo === 'seletora' ? a.para : a.rotulo.split(' (')[0])}</button>`).join('')}</span></div>`).join('')}
      <div class="cr-sub">Campo e falhas</div>
      ${campo.map(c => `<label class="cr-lin"><span>${esc(c.rotulo)}</span><input type="checkbox" data-crchk="${esc(c.id)}" ${estados[c.id] === c.estados[1] ? 'checked' : ''}></label>`).join('')}
      ${grupos.filter(g => g[1].length).map(([t, l]) => `<div class="cr-sub">${esc(t)}</div><div class="cr-pills">${l.map(pill).join('')}</div>`).join('')}
      ${r && !r.estavel ? '<div class="cr-aviso">A lógica oscila — confira o diagrama.</div>' : ''}
      <div class="cr-sub">Cenários da verificação funcional (${(CR.cenarios || []).filter(c => c.ok).length}/${(CR.cenarios || []).length})</div>
      <ol class="cr-cen">${(CR.cenarios || []).map((c, i) => `<li class="${c.ok ? 'cr-ok' : 'cr-falha'}${ultimoCenario === i ? ' cr-at' : ''}"><button data-cen="${i}">Aplicar</button> ${c.ok ? '✔' : '✖'} ${esc(c.nome)}</li>`).join('')}</ol>
    </div>`;
  }

  function render() {
    for (const p of pecas) {
      if (p.tipo === 'indicador') pintar(p.mesh, ligado(p.sinal), p.porta ? null : '#2fbf5a');
      else if (ctrl.get(p.id)?.tipo === 'emergencia') pintar(p.mesh, estados[p.id] === 'acionado', '#ff3b30');
    }
    if (painel) painel.innerHTML = htmlPainel();
    if (aoMudar) aoMudar();
  }

  function acionar(id, acaoOuEstado) {
    const c = ctrl.get(id);
    if (!c) return null;
    const a = c.acoes.find(x => x.id === acaoOuEstado);
    const novo = a ? a.para : c.estados.includes(acaoOuEstado) ? acaoOuEstado : null;
    if (novo == null) return null;
    estados[id] = novo;
    ultimoCenario = null;
    avaliarAgora();
    render();
    return `${c.rotulo}: ${novo}`;
  }

  // clique na peça da porta: seletora gira para a próxima posição; emergência trava/solta; botão alterna
  function cliqueMesh(mesh) {
    const p = pecas.find(x => x.mesh === mesh && x.tipo === 'controle');
    if (!p) return null;
    const c = ctrl.get(p.id);
    const i = c.estados.indexOf(estados[p.id]);
    return acionar(p.id, c.estados[(i + 1) % c.estados.length]);
  }

  function aplicarCenario(i) {
    const cen = (CR.cenarios || [])[i];
    if (!cen) return null;
    estados = iniciais();
    for (const [k, v] of Object.entries(cen.entradas || {})) if (ctrl.has(k)) estados[k] = estadoDoValor(ctrl.get(k), v);
    r = null;
    avaliarAgora();
    for (const pa of cen.passos || []) if (pa.aguardar_s) avaliarAgora(Number(pa.aguardar_s));
    ultimoCenario = i;
    const falhas = Object.entries(cen.espera || {}).filter(([k, v]) => !!(k in r.saidas ? r.saidas[k] : r.entradas[k]) !== !!v).map(([k]) => k);
    render();
    return `${cen.nome}: ${falhas.length ? `diferente em ${falhas.join(', ')}` : 'atendido'}`;
  }

  if (painel) {
    painel.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const msg = b.dataset.cen != null ? aplicarCenario(Number(b.dataset.cen)) : b.dataset.cr ? acionar(b.dataset.cr, b.dataset.acao) : null;
      if (msg && aviso) aviso(msg);
    });
    painel.addEventListener('change', (e) => {
      const id = e.target.dataset?.crchk;
      if (!id) return;
      const c = ctrl.get(id);
      const msg = acionar(id, e.target.checked ? c.estados[1] : c.estados[0]);
      if (msg && aviso) aviso(msg);
    });
  }
  // temporizadores: o tempo passa de 1 em 1 s
  const temTemporizador = (CR.modelo.temporizadores || []).length > 0;
  const timer = relogio && temTemporizador ? setInterval(() => { avaliarAgora(1); render(); }, 1000) : null;
  avaliarAgora();
  render();
  return {
    pecas, cliqueMesh, acionar, aplicarCenario, render,
    estado: () => ({ estados: { ...estados }, saidas: r ? { ...r.saidas } : {}, estavel: r ? r.estavel : true }),
    passarTempo: (s) => { avaliarAgora(s); render(); },
    parar: () => { if (timer) clearInterval(timer); },
  };
}
