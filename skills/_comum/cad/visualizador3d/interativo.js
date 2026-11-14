// 3D INTERATIVO (fase 2 do roteiro de 02/11/2026): o que o prédio (./app.js) e o quadro
// (./quadro.js) compartilham — o simulador lógico (../../instalacao/simulador.js), o
// estado guardado na aba (sessionStorage: troca de planta e volta do quadro com o mesmo
// estado), a ficha do circuito, o painel de motor, a lista de disjuntores do quadro e o
// quadro "esquemático" para quando a cena não traz o do caderno de fabricação.
// Texto vindo da cena sempre escapado (esc) — nada de HTML da cena na página.
import { criarSimulador, ROTULO_PONTO } from '../../instalacao/simulador.js';
// 09/11/2026: quadro fiel ao projeto com a fiação completa e o motor genérico de interação
// (subestação, incêndio, alarme, CFTV, controle de acesso)
import { montarQuadroEsquematico } from '../../instalacao/painelQuadro.js';
import { criarInteracao, combinarRedes, redeDaSubestacao, redeDeSinal, ligarAoSimulador, PAPEL_DO_SIMBOLO } from '../../instalacao/interacao.js';

export { criarInteracao, combinarRedes, redeDaSubestacao, redeDeSinal, ligarAoSimulador, PAPEL_DO_SIMBOLO };

// corrente nominal do disjuntor/DR; a instalação estimada pelo desenho (../../instalacao/doDesenho.js) não tem
const amp = (v) => (v != null && v !== '' ? `${v} A` : 'corrente a definir');
// sensibilidade do DR: a do projeto; DR lido do diagrama sem ela escrita não ganha 30 mA inventado
const ma = (d) => (d?.idn_ma != null ? `${d.idn_ma} mA` : d?.lido ? 'sensibilidade a conferir' : '30 mA');

export { criarSimulador, ROTULO_PONTO };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const br = (v, c = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

export const TIPO_COMANDO = {
  interruptor_simples: 'Interruptor simples', interruptor_paralelo: 'Interruptores paralelos (three-way)',
  interruptor_intermediario: 'Paralelos + intermediário (four-way)', pulsador_rele_impulso: 'Pulsadores com relé de impulso',
  contator_botoeira: 'Contator com botoeira liga/desliga e selo', sensor_presenca: 'Sensor de presença', dimmer: 'Dimmer',
  dimmer_010: 'Controlador 0-10 V', dali: 'DALI-2', cena: 'DALI-2 com teclado de cenas',
};

// ── Estado na aba ──────────────────────────────────────────────────────────
// chave: título + quadros e circuitos (as plantas do mesmo prédio dividem o estado)
export function chaveDoEstado(titulo, inst) {
  const base = `${titulo || ''}|${(inst.quadros || []).map(q => q.tag).join(',')}|${(inst.circuitos || []).map(c => c.id).join(',')}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return `hm3d-sim:${(h >>> 0).toString(36)}`;
}
export function simuladorDaCena(inst, titulo) {
  const sim = criarSimulador(inst);
  const chave = chaveDoEstado(titulo, inst);
  try { const s = window.sessionStorage.getItem(chave); if (s) sim.importar(JSON.parse(s)); } catch (e) { /* sem armazenamento: começa do zero */ }
  sim.assinar(() => { try { window.sessionStorage.setItem(chave, JSON.stringify(sim.exportar())); } catch (e) { /* idem */ } });
  return sim;
}

// ── Cenas (fase 5): botões de cada cena do comando + desligar ───────────────
// cenas definidas no projeto (nome e nível de cada grupo) ou, no teclado sem cenas no
// projeto, a programação padrão 100 / 60 / 30 % / desligado
const CENAS_PADRAO = ['100 %', '60 %', '30 %', 'Desligado'];
export function htmlCenas(sim, comandoId, { titulo = false } = {}) {
  const k = sim.comando(comandoId);
  if (!k) return '';
  const ek = sim.estadoComando(k.id);
  const definidas = Array.isArray(ek.cenas);
  if (!definidas && k.tipo !== 'cena') return '';
  const alvo = (k.dispositivos || [])[0] ?? (k.pontos || [])[0];
  if (alvo == null) return '';
  const nomes = definidas ? ek.cenas : CENAS_PADRAO;
  const b = (i, rot) => `<button class="sim-b${ek.cena === i ? ' ativo' : ''}" data-sim="cena" data-ponto="${esc(alvo)}" data-cena="${i}" data-def="${definidas ? 1 : 0}">${esc(rot)}</button>`;
  return `${titulo ? `<span>Cenas · ${esc(k.ambiente || k.id)}</span>` : ''}${nomes.map((n, i) => b(i, n)).join('')}${definidas ? b(-1, 'Desligar') : ''}`;
}

// ── Fichas (HTML) ──────────────────────────────────────────────────────────
const lin = (k, v) => (v == null || v === '' ? '' : `<tr><th>${esc(k)}</th><td>${v}</td></tr>`);
const estadoTag = (on, sim = 'ligado', nao = 'desligado') => `<b class="${on ? 'sim-on' : 'sim-off'}">${on ? sim : nao}</b>`;

// proteção do circuito (geral, DR, disjuntor) com botões de liga/desliga
export function htmlCircuito(sim, circuitoId, { abrir = true } = {}) {
  const c = sim.circuito(circuitoId);
  if (!c) return '';
  const q = sim.quadro(c.quadro);
  const d = (q?.disjuntores || []).find(x => x.tag === c.disjuntor);
  const drs = (q?.drs || []).filter(x => !x.ddr && (x.circuitos || []).map(String).includes(String(c.id)));
  const ddr = (q?.drs || []).some(x => x.ddr && x.tag === c.disjuntor);
  const botao = (tag, quadro) => {
    const on = sim.ligado(tag, quadro);
    return `<button class="sim-b" data-sim="disjuntor" data-tag="${esc(tag)}" data-quadro="${esc(quadro)}">${on ? 'Desligar' : 'Ligar'} ${esc(tag)}</button>`;
  };
  const m = sim.motivo(c.id);
  return `<div class="sim-circ"><div class="sim-tit">Circuito ${esc(c.id)}${c.descricao ? ` — ${esc(c.descricao)}` : ''}</div>
<table>${lin('Estado', m ? `<b class="sim-off">sem energia</b> <small>(${esc(m)})</small>` : '<b class="sim-on">energizado</b>')}
${q?.geral ? lin(`Geral ${q.geral.tag}`, `${estadoTag(sim.ligado(q.geral.tag, q.tag))} · ${esc(amp(q.geral.In))}`) : ''}
${drs.map(dr => lin(`DR ${dr.tag}`, `${estadoTag(sim.ligado(dr.tag, q.tag))} · ${esc(ma(dr))}`)).join('')}
${d ? lin(`${ddr ? 'DDR' : 'Disjuntor'} ${d.tag}`, `${estadoTag(sim.ligado(d.tag, q.tag))} · ${esc(amp(d.In))}${d.curva ? ` curva ${esc(d.curva)}` : ''}${d.polos ? ` · ${esc(d.polos)}P` : ''}`) : ''}
${lin('Quadro', esc(c.quadro))}
${c.origem === 'diagrama' ? lin('Origem', 'diagrama unifilar / quadro de cargas do projeto') : c.estimado ? lin('Origem', '<small>estimado pelo desenho — conferir</small>') : ''}
${c.lidoNaPlanta ? lin('Ligação', `<small>${esc(c.lidoNaPlanta)} ponto(s) pelo número lido na planta — a conferir</small>`) : ''}
${Number(c.potencia_va) > 0 ? lin('Potência', `${br(c.potencia_va, 0)} VA`) : Number(c.potencia_w) > 0 ? lin('Potência', `${br(c.potencia_w, 0)} W`) : ''}
${c.ib_a != null ? lin('Corrente de projeto Ib', `${br(c.ib_a, 1)} A`) : ''}
${c.secao_mm2 != null ? lin('Seção', `${br(c.secao_mm2, 1)} mm²`) : ''}
${c.queda_pct != null ? lin('Queda de tensão', `${br(c.queda_pct, 2)} %${c.comprimento_m != null ? ` em ${br(c.comprimento_m, 0)} m` : ''}`) : ''}</table>
<div class="sim-bs">${d ? botao(d.tag, q.tag) : ''}${drs.map(dr => botao(dr.tag, q.tag)).join('')}${q && abrir ? `<button class="sim-b" data-sim="abrir-quadro" data-quadro="${esc(q.tag)}">Abrir o quadro ${esc(q.tag)}</button>` : ''}</div></div>`;
}

// painel de comando do motor: botoeiras, sinaleiros e relé térmico
export function htmlPainel(pn) {
  if (!pn) return '';
  const s = pn.sinaleiros;
  const luz = (on, cor, rot) => `<span class="sim-luz ${on ? 'acesa' : ''}" style="--c:${cor}" title="${esc(rot)}"><i></i>${esc(rot)}</span>`;
  const b = (acao, rot, cls = '') => `<button class="sim-b ${cls}" data-sim="motor" data-motor="${esc(pn.id)}" data-acao="${acao}">${rot}</button>`;
  return `<div class="sim-painel"><div class="sim-tit">Painel de comando — ${esc(pn.id)}${pn.descricao ? ` <small>${esc(pn.descricao)}</small>` : ''}</div>
<div class="sim-luzes">${luz(s.branco, '#f5f5f5', 'ENERGIZADO')}${luz(s.verde, '#3fb950', 'EM OPERAÇÃO')}${luz(s.amarelo, '#f2c94c', 'ALARME')}${luz(s.vermelho, '#e5484d', 'FALHA / EMERGÊNCIA')}</div>
<div class="sim-est">${pn.girando ? '<b class="sim-on">motor em operação</b>' : `<b class="sim-off">parado</b>${!pn.alimentado ? ` <small>(${esc(pn.motivo)})</small>` : ''}`} · contator ${pn.contator ? 'fechado (selo)' : 'aberto'} · relé térmico ${pn.termico ? '<b class="sim-off">DESARMADO</b>' : 'armado'}</div>
<div class="sim-bs">${b('liga', 'LIGA', 'liga')}${b('desliga', 'DESLIGA', 'desliga')}${pn.emergenciaLocal ? b('liberar', 'Soltar emergência', 'emerg') : b('emergencia', 'EMERGÊNCIA', 'emerg')}
${pn.termico ? b('rearmar', 'Rearmar térmico') : b('desarmar_termico', 'Simular térmico desarmado')}</div></div>`;
}

// cena ativa do comando (fase 5)
function linhaCena(sim, k) {
  const ek = sim.estadoComando(k.id);
  if (Array.isArray(ek.cenas)) return lin('Cena', esc(ek.cenaAtiva || (ek.saida > 0 ? 'nível manual' : 'desligado')));
  if (k.tipo === 'cena') return lin('Cena', esc(ek.saida > 0 ? `${Math.round(ek.saida * 100)} %` : 'desligado'));
  return '';
}

// ficha de um ponto da planta (luminária, tomada, interruptor, motor…)
export function htmlFichaPonto(sim, id, { rotulo = '', ambiente = '' } = {}) {
  const p = sim.ponto(id);
  if (!p) return '';
  const e = sim.estadoPonto(id);
  const k = p.comando ? sim.comando(p.comando) : null;
  const ehDisp = k && (k.dispositivos || []).map(String).includes(String(id));
  const titulo = `${esc(rotulo || ROTULO_PONTO[p.tipo] || p.tipo)} · ${esc(p.id)}`;
  const cor = e.energizado ? 'sim-on' : 'sim-off';
  let acoes = '';
  if (k) {
    const ek = sim.estadoComando(k.id);
    if (k.tipo === 'contator_botoeira') {
      const a = (acao, rot, cls = '') => `<button class="sim-b ${cls}" data-sim="acionar" data-ponto="${esc(ehDisp ? id : k.dispositivos?.[0] ?? id)}" data-acao="${acao}">${rot}</button>`;
      acoes = `${a('liga', 'LIGA', 'liga')}${a('desliga', 'DESLIGA', 'desliga')}${ek.emergencia ? a('liberar', 'Soltar emergência', 'emerg') : a('emergencia', 'EMERGÊNCIA', 'emerg')}`;
    } else if (k.tipo === 'cena') {
      acoes = htmlCenas(sim, k.id);
    } else if (['dimmer', 'dimmer_010', 'dali'].includes(k.tipo)) {
      // DALI-2 com cenas do projeto: as cenas e também o nível manual
      acoes = `${htmlCenas(sim, k.id)}<button class="sim-b" data-sim="acionar" data-ponto="${esc(id)}">${ek.saida > 0 ? 'Desligar' : 'Ligar'}</button>${[0.25, 0.5, 1].map(n => `<button class="sim-b" data-sim="acionar" data-ponto="${esc(id)}" data-nivel="${n}">${n * 100} %</button>`).join('')}`;
    } else {
      const rot = p.tipo === 'pulsador' ? 'Apertar o pulsador' : p.tipo === 'sensor' ? (ek.presenca ? 'Simular ambiente vazio' : 'Simular presença') : p.tipo === 'teclado_cena' ? 'Próxima cena' : ehDisp ? 'Acionar' : `Acionar o comando ${esc(k.id)}`;
      acoes = `<button class="sim-b" data-sim="acionar" data-ponto="${esc(id)}">${rot}</button>`;
    }
  }
  const pn = p.tipo === 'motor' ? sim.painel(p.circuito) : null;
  return `<div class="sim-tit grande">${titulo}</div>
<div class="sim-est"><b class="${cor}">${esc(e.texto)}</b>${ambiente ? ` · ${esc(ambiente)}` : ''}${p.circuitoLido === 'a_conferir' ? ' · <small>circuito lido na planta, a conferir</small>' : ''}</div>
${k ? `<table>${lin('Comando', `${esc(k.id)} — ${esc(TIPO_COMANDO[k.tipo] || k.tipo)}`)}${linhaCena(sim, k)}${p.grupo ? lin('Grupo', esc(p.grupo)) : ''}${k.rele?.tag ? lin(k.rele.tipo === 'impulso' ? 'Relé de impulso' : 'Contator', `${esc(k.rele.tag)} · ${sim.estadoComando(k.id).saida > 0 ? 'fechado' : 'aberto'}`) : ''}${lin('Dispositivos', esc((k.dispositivos || []).join(', ')))}${lin('Comanda', `${(k.pontos || []).length} ponto(s)`)}</table>` : ''}
${acoes ? `<div class="sim-bs">${acoes}</div>` : ''}${pn ? htmlPainel(pn) : ''}${p.circuito ? htmlCircuito(sim, p.circuito) : ''}`;
}

// ── Ficha de um EQUIPAMENTO do objetivo do projeto (09/11/2026) ─────────────
// cena.componentes (../cenaDoObjetivo.js): a descrição como no projeto (relação de materiais /
// legenda), o nº do item, a quantidade, a especificação lida (kVA, tensão, corrente, seção — em
// objeto ou no texto da relação), de onde veio cada dado e "posição a conferir" quando a peça
// não tem posição na planta. Os campos podem faltar: só aparece o que veio.
const ROTULO_ESPEC = {
  kva: ['Potência', 'kVA'], potencia_kva: ['Potência', 'kVA'], tensao_kv: ['Tensão', 'kV'], tensao_primaria_kv: ['Tensão primária', 'kV'],
  tensao_secundaria_v: ['Tensão secundária', 'V'], tensao_v: ['Tensão', 'V'], corrente_a: ['Corrente', 'A'], corrente_nominal_a: ['Corrente nominal', 'A'],
  secao_mm2: ['Seção', 'mm²'], icc_ka: ['Capacidade de interrupção', 'kA'], nbi_kv: ['NBI', 'kV'], polos: ['Polos', ''], isolamento: ['Isolamento', ''],
  largura_m: ['Largura', 'm'], comprimento_m: ['Comprimento', 'm'], altura_m: ['Altura', 'm'], profundidade_m: ['Profundidade', 'm'], diametro_m: ['Diâmetro', 'm'],
  material: ['Material', ''], classe: ['Classe', ''], capacidade: ['Capacidade', ''], tipo: ['Tipo', ''], modelo: ['Modelo', ''], fabricante: ['Fabricante', ''],
};
const ROTULO_FONTE = {
  relacao: 'relação de materiais', relacao_materiais: 'relação de materiais', 'relação de materiais': 'relação de materiais', lista: 'relação de materiais',
  legenda: 'legenda do projeto', balao: 'balão na planta', 'balão': 'balão na planta', bloco: 'bloco do desenho', layer: 'layer do desenho',
  unifilar: 'diagrama unifilar', diagrama: 'diagrama unifilar', texto: 'texto da planta', nota: 'nota do projeto', memorial: 'memorial',
};
const nomeFonte = (f) => { const s = String(f ?? ''); const [k, ...resto] = s.split(':'); const base = ROTULO_FONTE[k.trim().toLowerCase()]; return base ? [base, resto.join(':').trim()].filter(Boolean).join(': ') : s; };
const valorEsp = (v) => (typeof v === 'number' ? br(v, Number.isInteger(v) ? 0 : 2) : typeof v === 'boolean' ? (v ? 'sim' : 'não') : String(v));
export function htmlFichaComponente(c, { rotulo = '', ambiente = '', altura = '', objeto = '' } = {}) {
  if (!c) return '';
  const esp = c.especificacao && typeof c.especificacao === 'object' ? c.especificacao : {};
  const linhasEsp = Object.entries(esp).filter(([k, v]) => v != null && v !== '' && typeof v !== 'object' && !['texto', 'descricao'].includes(k)).map(([k, v]) => {
    const [r, u] = ROTULO_ESPEC[k] || [k.replace(/_/g, ' '), ''];
    return lin(r, `${esc(valorEsp(v))}${u ? ` ${esc(u)}` : ''}`);
  }).join('');
  const qtd = c.quantidade != null && c.quantidade !== '' ? `${esc(valorEsp(c.quantidade))}${c.unidade ? ` ${esc(c.unidade)}` : ''}` : '';
  const pos = c.posicao === 'desenho' ? 'na planta do projeto' : c.posicao === 'patio' ? 'sem posição na planta — no pátio ao lado' : 'sem posição na planta — no lugar típico do tipo';
  const dims = Array.isArray(c.dimensoes_m) ? c.dimensoes_m.map(v => br(v)).join(' × ') : '';
  return `<div class="sim-tit">${esc(c.descricao || rotulo)}${c.conferir ? ' <b class="sim-off">[CONFERIR]</b>' : ''}</div>
<table>${lin('Item da relação', c.item != null && c.item !== '' ? `nº ${esc(c.item)}` : '')}${lin('Quantidade no projeto', qtd)}
${c.especificacaoTexto ? lin('Especificação', esc(c.especificacaoTexto)) : ''}${linhasEsp}
${lin('Fonte', (c.fontes || []).map(f => esc(nomeFonte(f))).join(' · '))}
${lin('Posição', c.posicaoAConferir ? `<b class="sim-off">a conferir</b> <small>(${esc(pos)})</small>` : esc(pos))}
${lin('Local', esc([ambiente, altura].filter(Boolean).join(' · ')))}${objeto ? lin('Peça no 3D', esc(objeto)) : ''}
${c.servico ? lin('Serviço', esc(c.servico)) : ''}${c.motivo ? lin('Observação', `<small>${esc(c.motivo)}</small>`) : ''}
${lin('Forma no 3D', `<small>${esc(c.rotuloForma || c.forma || '')}${dims ? ` · ${esc(dims)} m` : ''} — dimensões ilustrativas (típicas)</small>`)}</table>`;
}

// lista dos disjuntores do quadro (com os motores dele) — painel lateral do quadro
export function htmlQuadro(sim, tag) {
  const q = sim.quadro(tag);
  if (!q) return '';
  const linha = (t, rot, desc) => {
    const on = sim.ligado(t, q.tag);
    return `<button class="sim-dj ${on ? 'on' : 'off'}" data-sim="disjuntor" data-tag="${esc(t)}" data-quadro="${esc(q.tag)}" title="${on ? 'Desligar' : 'Ligar'} ${esc(t)}"><i></i><b>${esc(t)}</b><span>${esc(rot)}${desc ? ` <small>${esc(desc)}</small>` : ''}</span></button>`;
  };
  const circ = (id) => sim.circuito(id);
  const motores = sim.paineis().filter(p => String(p.quadro) === String(q.tag));
  return `<div class="sim-lista">${q.geral ? linha(q.geral.tag, `Geral ${amp(q.geral.In)}`, '') : ''}
${(q.drs || []).filter(d => !d.ddr).map(d => linha(d.tag, `DR ${d.In != null ? `${d.In} A · ` : ''}${ma(d)}`, `circuitos ${(d.circuitos || []).join(', ')}`)).join('')}
${(q.disjuntores || []).map(d => { const c = circ(d.circuito); return linha(d.tag, `${amp(d.In)} — circuito ${d.circuito}`, c?.descricao || ''); }).join('')}</div>
${motores.length ? `<div class="sim-bs"><button class="sim-b emerg" data-sim="emergencia-quadro" data-quadro="${esc(q.tag)}">${sim.emergenciaDoQuadro(q.tag) ? 'Soltar a emergência do quadro' : 'EMERGÊNCIA do quadro'}</button></div>${motores.map(htmlPainel).join('')}` : ''}
<div class="sim-bs"><button class="sim-b" data-sim="reiniciar">Religar tudo (estado inicial)</button></div>`;
}

// cliques nos botões data-sim dentro de `el` (delegação: o HTML é refeito a cada mudança)
export function ligarBotoes(el, sim, { abrirQuadro, aviso } = {}) {
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-sim]');
    if (!b || !el.contains(b)) return;
    ev.stopPropagation();
    const d = b.dataset;
    let r = null;
    if (d.sim === 'disjuntor') { sim.alternar(d.tag, d.quadro); r = `${d.tag} ${sim.ligado(d.tag, d.quadro) ? 'ligado' : 'desligado'}`; }
    else if (d.sim === 'acionar') r = sim.acionar(d.ponto, d.nivel != null ? Number(d.nivel) : d.acao || undefined);
    // cena (fase 5): definida no projeto → { cena: i }; teclado sem cenas no projeto → índice
    else if (d.sim === 'cena') r = sim.acionar(d.ponto, d.def === '1' ? { cena: Number(d.cena) } : Number(d.cena));
    else if (d.sim === 'motor') r = sim.motor(d.motor, d.acao);
    else if (d.sim === 'emergencia-quadro') { const a = !sim.emergenciaDoQuadro(d.quadro); sim.emergenciaQuadro(d.quadro, a); r = a ? 'Emergência do quadro acionada: motores parados' : 'Emergência do quadro liberada'; }
    else if (d.sim === 'reiniciar') { sim.reiniciar(); r = 'Simulação reiniciada'; }
    else if (d.sim === 'abrir-quadro' && abrirQuadro) abrirQuadro(d.quadro);
    if (r && aviso) aviso(r);
  });
}

// aviso curto no rodapé da tela ("Q3 desligado", "relé de impulso KI1 fechou")
export function criarAviso() {
  const el = document.createElement('div');
  el.className = 'sim-aviso';
  document.body.appendChild(el);
  let t = 0;
  return (texto) => {
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(t);
    t = setTimeout(() => el.classList.remove('visivel'), 2600);
  };
}

// ── Quadro esquemático (cena sem o quadro do caderno de fabricação) ─────────
// 09/11/2026: o quadro do projeto FIEL (../../instalacao/painelQuadro.js): cada disjuntor e
// DR com polos, In, curva, Icu, IΔn, descrição e seção do projeto (e a fonte de cada dado;
// o que falta, "[CONFERIR] — não consta no projeto"), barras N/PE com medidas, pente ou
// barras de fase, canaletas, bornes e a fiação F/N/PE completa. Mesmas TAGs do modelo único.
export function cenaQuadroEsquematica(q, sim) {
  return montarQuadroEsquematico(q, { circuito: (id) => (sim ? sim.circuito(id) : null) });
}

// Ficha "fiel ao projeto": campo · valor · fonte (o [CONFERIR] em destaque)
export function htmlFichaFiel(linhas, { titulo = '' } = {}) {
  if (!Array.isArray(linhas) || !linhas.length) return '';
  return `${titulo ? `<div class="sim-tit">${esc(titulo)}</div>` : ''}<table class="fiel"><thead><tr><th>Dado</th><th>Valor</th><th>Fonte</th></tr></thead><tbody>${linhas.map(l => `<tr${l.conferir ? ' class="conferir"' : ''}><th>${esc(l.campo)}</th><td>${l.conferir ? `<b class="sim-off">${esc(l.valor)}</b>` : esc(l.valor)}</td><td><small>${esc(l.fonte)}</small></td></tr>`).join('')}</tbody></table>`;
}

// Ficha de um condutor do quadro (mouse/clique no cabo): circuito, função, seção, origem e destino
const FUNCAO = { F: 'Fase', N: 'Neutro', PE: 'Terra (PE)', dados: 'Dados (cordão)', laco: 'Laço / zona', '24V': 'Alimentação 24 Vcc', bateria: 'Bateria' };
export function htmlCondutor(c, { energizado = null } = {}) {
  if (!c) return '';
  const sec = c.secao_mm2 ? `${String(c.secao_mm2).replace('.', ',')} mm²` : '[CONFERIR] — não consta no projeto';
  return `<div class="sim-tit">${esc(FUNCAO[c.funcao] || c.funcao)}${c.fase ? ` ${esc(c.fase)}` : ''}${c.circuito != null ? ` — circuito ${esc(c.circuito)}` : ''}</div>
<table>${lin('Função', esc(`${FUNCAO[c.funcao] || c.funcao}${c.fase ? ` (${c.fase})` : c.funcao === 'F' ? ' (fase não consta no projeto)' : ''}`))}
${lin('Seção', c.secao_mm2 ? `${esc(sec)} <small>(${esc(c.secao_fonte || 'projeto')})</small>` : `<b class="sim-off">${esc(sec)}</b>`)}
${lin('Origem', esc(c.de || ''))}${lin('Destino', esc(c.para || ''))}
${c.d_mm ? lin('Diâmetro no 3D', `${esc(String(c.d_mm).replace('.', ','))} mm <small>(pela seção; ilustrativo)</small>`) : ''}
${energizado == null ? '' : lin('Estado', energizado ? '<b class="sim-on">energizado</b>' : c.funcao === 'PE' ? 'aterrado (o PE não é seccionado)' : '<b class="sim-off">sem tensão</b>')}
${(c.conferir || []).length ? lin('Conferir', `<small>${c.conferir.map(esc).join('; ')}</small>`) : ''}</table>`;
}

// ── Equipamentos com interação declarada (../../instalacao/interacao.js) ─────
const COR_APAR = { energizado: 'sim-on', apagado: 'sim-off', aberto: 'sim-off', falha: 'sim-off', alarme: 'sim-off', alerta: 'sim-off', normal: 'sim-on', armado: 'sim-on' };
export function htmlEquipamento(rede, ids, { titulo = true } = {}) {
  if (!rede) return '';
  const lista = (Array.isArray(ids) ? ids : [ids]).filter(id => rede.tem(id));
  return lista.map(id => {
    const s = rede.situacao(id);
    const acoes = rede.acoes(id);
    return `<div class="sim-circ">${titulo ? `<div class="sim-tit">${esc(s.rotulo)}</div>` : ''}<table>${lin('Estado', `<b class="${COR_APAR[s.aparencia] || ''}">${esc(s.texto)}</b>`)}
${['fonte', 'serie'].includes(rede.equipamento(id).interacao.regra) ? lin('Tensão a montante', s.tensao ? '<b class="sim-on">presente</b>' : '<b class="sim-off">ausente</b>') : ''}
${s.motivo ? lin('Por quê', `<small>${esc(s.motivo)}</small>`) : ''}${s.nota ? lin('Ligação', `<small>${esc(s.nota)}</small>`) : ''}</table>
${acoes.length ? `<div class="sim-bs">${acoes.map(a => `<button class="sim-b${a.permitida ? '' : ' recusa'}" data-int="${esc(a.alvo)}" data-acao="${esc(a.id)}" title="${esc(a.permitida ? a.rotulo : a.motivo)}">${esc(a.rotulo)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
}
// cliques nos botões data-int (delegação)
export function ligarBotoesRede(el, rede, { aviso } = {}) {
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-int]');
    if (!b || !el.contains(b)) return;
    ev.stopPropagation();
    const r = rede.agir(b.dataset.int, b.dataset.acao);
    if (r && aviso) aviso(r);
  });
}
