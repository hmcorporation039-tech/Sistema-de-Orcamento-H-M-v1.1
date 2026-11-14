// FIAÇÃO DE COMANDO DESENHADA NO 3D (pedido do usuário em 14/11/2026: "faça o que ainda não
// estiver pronto" — a fiação de comando não era desenhada; a simulação do comando era só pelo
// painel lateral).
//
// A escada de relés gerada pelos blocos de função (../especificacao/comando.js) já diz TUDO o
// que a fiação precisa: em cada degrau, a barra que alimenta (L+, L+E, FN…), os contatos em
// série e em paralelo (relé + número do contato, posição da seletora, entrada de campo) e a
// bobina que eles acionam. Aqui cada degrau vira condutores de verdade na cena do quadro:
//   barra (fusível de comando) → contatos, na ordem da escada → bobina A1; A2 → 0 V da fonte.
// Contatos de relé saem na base do relé (11-14, 21-24… da numeração do projeto), a bobina no
// topo (A1/A2); dispositivos da PORTA (seletoras, botões, sinaleiros) ligam por um chicote que
// corre por trás da porta até a dobradiça (condutores com `porta: true`, desenhados no grupo
// da porta — acompanham a abertura); entradas e saídas de campo vão aos bornes das réguas
// (X2/X3) na ordem das conexões do projeto; as entradas do inversor (DI) vão ao inversor.
//
// Cores pela NBR IEC 60204-1, 13.2.4 (recomendação): comando em corrente contínua AZUL,
// comando em corrente alternada VERMELHO; o 0 V leva faixa branca (convenção H&M — anilha "M").
// Seção 0,75 mm² (fiação de comando do perfil). Cada condutor leva
//   energia: { tipo: 'comando', sinal }  — aceso quando o sinal (barra, bobina ou saída de
//   campo) está ligado na simulação da escada (../especificacao/logica.js).
// O traçado é esquemático (pelas canaletas da cena); a numeração dos fios e a régua definitiva
// saem das folhas FL02/FL04. JS puro, sem DOM (Node e bundle).
const PQ = require('./painelQuadro');

const COR = { CC: '#1f5fd1', CA: '#d0342c', M_FAIXA: '#f1f4fa', EXTERNO: '#f08a24' };
const SECAO = 0.75;
const D_MM = 2.4;
const ESP_PORTA = 2;

const base = (x) => String(x || '').split('=')[0];
const r1 = (v) => Math.round(v * 10) / 10;

// ── Localização dos dispositivos na cena ─────────────────────────────────────
function localizador(cena, CR, projeto) {
  const caixas = cena.caixas || [];
  const porTag = new Map();
  for (const b of caixas) if (b.tag && !porTag.has(String(b.tag)) && b.l > 6) porTag.set(String(b.tag), b);
  const portaItens = new Map(((cena.porta && cena.porta.itens) || []).filter(i => i.tag).map(i => [String(i.tag), i]));
  const portaDe = new Map((CR.porta || []).map(p => [p.id, portaItens.get(p.meshTag)]).filter(([, v]) => v));
  // inversor/soft do motor: o sinal "U1.*" é o acionamento do motor cujo acion.tag é U1
  const acionDe = new Map();
  for (const m of projeto.motores || []) if (m.acion?.tag) acionDe.set(m.acion.tag, porTag.get(`${m.id}/T1`) || porTag.get(`${m.id}-Q1`) || null);
  // bornes de cada régua (as peças finas, na ordem da régua)
  const bornes = {};
  for (const b of caixas) {
    if (b.camada !== 'bornes' || !b.tag || b.l > 6) continue;
    (bornes[b.tag] = bornes[b.tag] || []).push(b);
  }
  for (const k of Object.keys(bornes)) bornes[k].sort((a, b) => a.x - b.x);
  return { porTag, portaDe, acionDe, bornes };
}

// o que é um sinal da escada: 'rele' | 'porta' | 'acion' | 'campo' | null (sem peça: energia, fusível, falha simulada)
function tipoDoSinal(x, L, modelo) {
  const b = base(x);
  if (L.portaDe.has(b)) return { tipo: 'porta', peca: L.portaDe.get(b) };
  if (L.porTag.has(b)) return { tipo: 'rele', peca: L.porTag.get(b) };
  const m = /^([A-Z]+\d+)\.(.+)$/.exec(b);
  if (m && L.acionDe.get(m[1])) return { tipo: 'acion', peca: L.acionDe.get(m[1]), saida: m[2] };
  const ent = (modelo.entradas || []).find(e => e.id === b);
  if (ent && ent.tipo === 'externo') return { tipo: 'campo' };
  const eq = (modelo.equipamentos || []).find(e => b.startsWith(`${e.tag}.`));
  if (eq) return { tipo: 'campo' };
  return null;
}

// número do contato ("21-24" → coluna 1 de 4, entrada 21, saída 24)
function colunaDoContato(contato) {
  const m = /^(\d)(\d)-(\d)(\d)$/.exec(String(contato || ''));
  return m ? Math.max(0, Math.min(3, Number(m[1]) - 1)) : 0;
}

// ── Gerador ──────────────────────────────────────────────────────────────────
// cena: a cena do quadro (caixas, porta.itens, involucro); CR: comandoReles (modelo, porta, placa);
// projeto: a solução da especificação (motores, comando.conexoes, sinaleiros)
function fiacaoDeComando(cena, CR, projeto) {
  if (!cena || !CR || !CR.modelo || !projeto) return { condutores: [], camadas: [], avisos: [] };
  const modelo = CR.modelo;
  const G = PQ.geometriaDaCena(cena);
  const L = localizador(cena, CR, projeto);
  const { A, P } = cena.involucro;
  const condutores = [];
  const avisos = [];
  let k = 0;
  const yDobradica = Math.round(A * 0.55);

  // terminais
  const fonte = L.porTag.get('G1') || null;
  const fusivelCC = L.porTag.get('F24') || L.porTag.get('F1') || fonte;
  const fusivelV = L.porTag.get('F2V') || L.porTag.get('F2') || fusivelCC;
  const disjCA = L.porTag.get('QC1') || null;
  // terminal de uma peça: coluna col de n, em cima (bobina A1/A2) ou embaixo (contatos), dy mm para dentro
  const term = (b, col, n, lado, dy = 0) => ({ x: b.x + b.l * (col + 0.5) / Math.max(1, n), y: lado === 'cima' ? b.y + b.a - 9 - dy : b.y + 9 + dy, z: b.z + b.p - 14, lado });
  const origemDaBarra = (barra) => {
    if (barra === 'FN') return disjCA ? term(disjCA, 0, 2, 'baixo') : null;
    if (barra === 'LV+') return fusivelV ? term(fusivelV, 0, 1, 'baixo') : null;
    return fusivelCC ? term(fusivelCC, 0, 1, 'baixo') : null; // L+ e as derivadas (L+E…) partem do fusível
  };
  const zeroVolt = (barra) => (barra === 'FN' ? (disjCA ? term(disjCA, 1, 2, 'baixo') : null) : fonte ? term(fonte, 1, 2, 'baixo', 4) : null);

  // bornes de campo por bloco, na ordem das conexões do projeto
  const conexoes = (projeto.comando && projeto.comando.conexoes) || [];
  const proxBorne = {};
  function borneDoBloco(bloco) {
    const lista = conexoes.map((c, i) => ({ ...c, i })).filter(c => c.grupo === bloco);
    const j = proxBorne[bloco] || 0;
    proxBorne[bloco] = j + 1;
    const c = lista[j];
    if (!c) return null;
    const regua = c.regua;
    const n = conexoes.filter((x, i) => x.regua === regua && i <= c.i).length; // nº do borne na régua
    const peca = (L.bornes[regua] || [])[n - 1];
    return peca ? { x: peca.x + peca.l / 2, y: peca.y + peca.a - 6, z: peca.z + peca.p - 4, lado: 'cima', rotulo: `${regua}:${n} — ${c.rotulo}` } : null;
  }

  // chicote da porta: do ponto do dispositivo (no referencial da porta) até a dobradiça
  function pontoDaPorta(item) {
    return { x: item.x + item.l / 2, y: item.y + item.a / 2 };
  }
  const add = (c) => {
    const ac = c.ac;
    condutores.push({
      id: `CMD:${condutores.length + 1}`, funcao: 'comando', secao_mm2: SECAO, secao_fonte: 'perfil da especificação (fiação de comando 0,75–1,0 mm²)', d_mm: D_MM,
      cor: c.cor || (ac ? COR.CA : COR.CC), ...(c.cor2 ? { cor2: c.cor2 } : {}),
      camada: c.porta ? 'fiacao-cmd-porta' : 'fiacao-cmd', porta: !!c.porta, pts: c.pts, de: c.de, para: c.para,
      degrau: c.degrau || null, energia: { tipo: 'comando', sinal: c.sinal }, conferir: c.conferir || [],
    });
    k++;
  };
  // ligação a → b entre dois "nós": cada nó é { t: terminal na placa } ou { porta: item }
  function ligar(a, b, info) {
    if (!a || !b) return;
    const kk = k;
    // trecho na porta (até a dobradiça) — volta como terminal na placa, junto da dobradiça
    const naPlaca = (n, lado) => {
      if (!n.porta) return n.t;
      const p = pontoDaPorta(n.porta);
      // atrás da porta: sai pela traseira do corpo do dispositivo (≈ 45 mm) e corre no chicote até a dobradiça
      const zP = -(ESP_PORTA + 48 + (kk % 4) * 3);
      const yD = yDobradica + (kk % 5) * 4;
      add({ ...info, porta: true, pts: [[r1(p.x), r1(p.y), -ESP_PORTA - 30], [r1(p.x), r1(p.y), zP], [24, r1(p.y), zP], [12, yD, zP]],
        de: lado === 'de' ? `${info.de} (porta)` : 'chicote da porta', para: lado === 'de' ? 'chicote da porta' : `${info.para} (porta)` });
      return { x: G.esq.x, y: yD, z: G.esq.z, lado: 'barra', dobradica: true, zCab: P + zP };
    };
    const ta = naPlaca(a, 'de');
    const tb = naPlaca(b, 'para');
    let pts;
    if (ta.dobradica && tb.dobradica) return; // porta → porta: o chicote já liga
    if (ta.dobradica) pts = [[12, ta.y, ta.zCab], ...PQ.rotear(G, ta, tb, { lado: 'esquerda', k: kk })];
    else if (tb.dobradica) pts = [...PQ.rotear(G, tb, ta, { lado: 'esquerda', k: kk }).reverse(), [12, tb.y, tb.zCab]];
    else pts = PQ.rotear(G, ta, tb, { lado: (ta.x + tb.x) / 2 > G.L / 2 ? 'direita' : 'esquerda', k: kk });
    add({ ...info, pts });
  }

  // nó de entrada e de saída de um contato x
  function nosDoContato(el, degrau) {
    const s = tipoDoSinal(el.x, L, modelo);
    if (!s) return null;
    if (s.tipo === 'rele') {
      const col = colunaDoContato(el.contato);
      return { ent: { t: term(s.peca, col, 4, 'baixo', 0) }, sai: { t: term(s.peca, col, 4, 'baixo', 12) }, nome: `${base(el.x)} ${el.contato || ''}`.trim() };
    }
    if (s.tipo === 'porta') return { ent: { porta: s.peca }, sai: { porta: s.peca }, nome: base(el.x) };
    if (s.tipo === 'acion') return { ent: { t: term(s.peca, 0, 2, 'baixo') }, sai: { t: term(s.peca, 1, 2, 'baixo') }, nome: `${base(el.x)}` };
    if (s.tipo === 'campo') {
      const a = borneDoBloco(degrau.bloco), b = borneDoBloco(degrau.bloco);
      if (!a || !b) return null;
      return { ent: { t: a }, sai: { t: b }, nome: `${base(el.x)} (${a.rotulo.split(' — ')[0]}/${b.rotulo.split(' — ')[0]})`, campo: true };
    }
    return null;
  }

  // desenha a expressão entre os nós "de" e "para"
  function desenhar(expr, de, para, ctx) {
    if (!expr) { ligar(de, para, ctx); return; }
    if (expr.x != null) {
      const n = nosDoContato(expr, ctx.d);
      if (!n) { ligar(de, para, ctx); return; } // sem peça (energia, falha simulada): passa direto
      ligar(de, n.ent, { ...ctx, para: n.nome, cor: n.campo ? COR.EXTERNO : undefined });
      ligar(n.sai, para, { ...ctx, de: n.nome });
      return;
    }
    if (expr.p) { for (const ramo of expr.p) desenhar(ramo, de, para, ctx); return; }
    if (expr.s) {
      const itens = expr.s.filter(Boolean);
      let atual = de;
      let c = ctx;
      itens.forEach((el, i) => {
        if (i === itens.length - 1) { desenhar(el, atual, para, c); return; }
        if (el.x != null) {
          const n = nosDoContato(el, ctx.d);
          if (!n) return; // sem peça: o nó continua o mesmo
          ligar(atual, n.ent, { ...c, para: n.nome, cor: n.campo ? COR.EXTERNO : undefined });
          atual = n.sai;
          c = { ...ctx, de: n.nome };
          return;
        }
        // paralelo/série aninhado no meio da série: o nó entre ele e o próximo é um ponto de
        // junção (borne de passagem esquemático) na canaleta vertical
        const junta = { t: { x: G.esq.x, y: ctx.yJunta, z: G.esq.z, lado: 'barra' } };
        desenhar(el, atual, junta, { ...c, para: 'junção (borne de passagem)' });
        atual = junta;
        c = { ...ctx, de: 'junção (borne de passagem)' };
      });
    }
  }

  // nó da saída do degrau (bobina, sinaleiro, entrada de equipamento)
  function noDaSaida(saida) {
    const s = tipoDoSinal(saida, L, modelo);
    if (!s) return null;
    if (s.tipo === 'rele') return { ent: { t: term(s.peca, 0, 2, 'cima') }, ret: { t: term(s.peca, 1, 2, 'cima') }, nome: `${saida} (bobina A1)`, nomeRet: `${saida} A2` };
    if (s.tipo === 'porta') return { ent: { porta: s.peca }, ret: { porta: s.peca }, nome: saida, nomeRet: saida };
    if (s.tipo === 'acion') return { ent: { t: term(s.peca, 0, 2, 'baixo', 24) }, ret: null, nome: `${saida} (entrada digital)` };
    return null;
  }

  // ── degraus ────────────────────────────────────────────────────────────────
  const degraus = modelo.degraus || [];
  const timers = new Set((modelo.temporizadores || []).map(t => t.tag));
  let semPeca = 0;
  degraus.forEach((d, i) => {
    const origem = origemDaBarra(d.barra);
    const saida = noDaSaida(d.saida);
    if (!origem || !saida) { semPeca++; return; }
    const ac = d.barra === 'FN';
    const sinal = timers.has(d.saida) ? `${d.saida}.bobina` : d.saida;
    // proteção das saídas de campo: um contador por degrau (o mesmo bloco pode ter vários degraus)
    const ctx = { d, ac, sinal, degrau: d.id, de: `${d.barra} (${ac ? 'disjuntor de comando QC1' : 'fusível de comando'})`, para: saida.nome, yJunta: Math.round(A * 0.35 + (i % 9) * 6) };
    desenhar(d.expr, { t: origem }, saida.ent, ctx);
    // retorno da bobina ao 0 V (M) — ou ao neutro no comando em 220 Vca
    if (saida.ret) {
      const z = zeroVolt(d.barra);
      if (z) ligar(saida.ret, { t: z }, { ac, sinal, degrau: d.id, de: saida.nomeRet, para: ac ? 'neutro do comando' : '0 V da fonte G1 (M)', cor: ac ? '#2a6fd6' : COR.CC, cor2: ac ? undefined : COR.M_FAIXA });
    }
  });

  // ── saídas de campo (contatos secos para o inversor, a central, a automação) ──
  for (const sc of modelo.saidasCampo || []) {
    const m = /^([A-Z]+\d+)\.(.+)$/.exec(sc.tag);
    const acion = m && L.acionDe.get(m[1]);
    let de, para;
    if (acion) { de = { t: term(acion, 0, 2, 'baixo', 30) }; para = { t: term(acion, 1, 2, 'baixo', 30) }; }
    else {
      const a = borneDoBloco(sc.bloco), b = borneDoBloco(sc.bloco);
      if (!a || !b) { semPeca++; continue; }
      de = { t: a }; para = { t: b };
    }
    const ctx = { d: { bloco: sc.bloco }, ac: false, sinal: sc.tag, degrau: sc.tag, de: acion ? `${m[1]} (comum da entrada digital)` : 'borne de campo', para: sc.rotulo || sc.tag, yJunta: Math.round(A * 0.3), cor: COR.EXTERNO };
    desenhar(sc.expr, de, para, ctx);
  }
  if (semPeca) avisos.push(`${semPeca} ligações da escada sem peça correspondente na cena (sinal simulado ou dispositivo fora do quadro): não desenhadas.`);

  // alimentação do comando: fusível → fonte (+24 V) e 0 V
  if (fonte && fusivelCC && fusivelCC !== fonte) ligar({ t: term(fonte, 0, 2, 'baixo') }, { t: term(fusivelCC, 0, 1, 'cima') }, { ac: false, sinal: 'L+', de: 'G1 +24 Vcc', para: 'fusível de comando' });

  const camadas = [
    { id: 'fiacao-cmd', rotulo: 'Fiação de comando — 24 Vcc azul, 220 Vca vermelho, campo laranja (NBR IEC 60204-1, 13.2.4)', cor: COR.CC },
    { id: 'fiacao-cmd-porta', rotulo: 'Fiação de comando — chicote da porta', cor: COR.CC },
  ];
  return { condutores, camadas, avisos };
}

// Acrescenta a fiação de comando a uma cena de quadro com comandoReles
function completarCenaComComando(cena, projeto) {
  const CR = cena && cena.comandoReles;
  if (!CR) return cena;
  const fc = fiacaoDeComando(cena, CR, projeto);
  if (!fc.condutores.length) return cena;
  cena.condutores = [...(cena.condutores || []), ...fc.condutores];
  const ja = new Set((cena.camadas || []).map(c => c.id));
  cena.camadas = [...(cena.camadas || []), ...fc.camadas.filter(c => !ja.has(c.id))];
  cena.avisos = [...(cena.avisos || []), 'Fiação de comando desenhada pela escada de relés (cada degrau: barra → contatos → bobina → 0 V), em traçado esquemático pelas canaletas; os fios acendem com a simulação. Numeração e bornes definitivos: folhas FL02 e FL04.', ...fc.avisos];
  return cena;
}

module.exports = { fiacaoDeComando, completarCenaComComando, COR_COMANDO: COR };
