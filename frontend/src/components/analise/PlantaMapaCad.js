// Planta do mapa do CAD: o desenho de fundo (paredes e traços da planta — backend services/analiseCad/fundoDoMapa.js),
// os ambientes com o nome e cada ponto lido, colorido pela situação da linha do mapa. Antes era um quadro fixo, só com
// pontos cinza soltos e sem interação: não dava para ver nem conferir nada (03/11/2026).
//   roda do mouse = zoom no cursor · arrastar = mover · clique no ponto = escolhe a linha (ficha para conferir ali mesmo)
// Coordenadas do desenho em metros; na tela o Y é invertido (y → −y) para a planta ficar na posição de leitura.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Maximize2, Minimize2, Scan, ZoomIn, ZoomOut } from 'lucide-react';

export const SITUACAO = {
  nao_reconhecido: { rotulo: 'Não reconhecido — escolha o tipo', cor: '#e5534b' },
  reconhecido: { rotulo: 'Reconhecido — falta conferir', cor: '#d4a72c' },
  conferido: { rotulo: 'Conferido — entra no orçamento', cor: '#57ab5a' },
  fora: { rotulo: 'Fora da contagem', cor: '#768390' },
};
export function situacaoDaLinha(s) {
  if (s.confirmado) return s.simbolo === '?' ? 'fora' : 'conferido';
  if (s.foraDoOrcamento) return 'fora';
  return s.simbolo === '?' ? 'nao_reconhecido' : 'reconhecido';
}

const ALTURA_NORMAL = 480;
const RAIO_PX = 4.5;
const TOQUE_PX = 9;
const botao = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 28, minWidth: 28, padding: '0 8px', borderRadius: 6, border: '1px solid #333', background: 'rgba(20,20,20,0.92)', color: '#ddd', fontSize: 12, cursor: 'pointer' };

// caixa do mundo [x0, y0, x1, y1] → viewBox da tela, com folga e a proporção do quadro
function enquadrar(c, tamanho, folga = 0.06) {
  const w0 = Math.max(c[2] - c[0], 1), h0 = Math.max(c[3] - c[1], 1);
  let w = w0 * (1 + 2 * folga), h = h0 * (1 + 2 * folga);
  const proporcao = tamanho.w / Math.max(tamanho.h, 1);
  if (w / h < proporcao) w = h * proporcao; else h = w / proporcao;
  const cx = (c[0] + c[2]) / 2, cy = -(c[1] + c[3]) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
// Áreas da folha: pontos agrupados por proximidade (grade de células vizinhas). Uma folha com várias plantas lado a
// lado (caso real: cinco plantas em 1,4 km de desenho) ganha o atalho "Ir para" em vez de garimpar com o zoom.
function areasDosPontos(pontos) {
  if (pontos.length < 2) return [];
  const xs = pontos.map(p => p[1]), ys = pontos.map(p => p[2]);
  const celula = Math.max(10, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 40);
  const grade = new Map();
  for (const p of pontos) {
    const k = `${Math.floor(p[1] / celula)},${Math.floor(p[2] / celula)}`;
    (grade.get(k) || grade.set(k, []).get(k)).push(p);
  }
  const vistas = new Set();
  const areas = [];
  for (const k of grade.keys()) {
    if (vistas.has(k)) continue;
    const fila = [k];
    vistas.add(k);
    const pts = [];
    while (fila.length) {
      const atual = fila.pop();
      pts.push(...grade.get(atual));
      const [i, j] = atual.split(',').map(Number);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const v = `${i + di},${j + dj}`;
        if (grade.has(v) && !vistas.has(v)) { vistas.add(v); fila.push(v); }
      }
    }
    areas.push({ pontos: pts.length, caixa: caixaDosPontos(pts) });
  }
  if (areas.length < 2) return [];
  return areas.sort((a, b) => (a.caixa[0] - b.caixa[0]) || (b.caixa[3] - a.caixa[3])).map((a, i) => ({ ...a, nome: `Área ${i + 1}` }));
}

const caixaDosPontos = (pts) => {
  const xs = pts.map(p => p[1]), ys = pts.map(p => p[2]);
  const c = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  // um ponto só (ou todos juntos): pelo menos 8 m de quadro, para ver o entorno
  const meio = (a, b) => (a + b) / 2, lado = Math.max(c[2] - c[0], c[3] - c[1], 8);
  return [meio(c[0], c[2]) - lado / 2, meio(c[1], c[3]) - lado / 2, meio(c[0], c[2]) + lado / 2, meio(c[1], c[3]) + lado / 2];
};

export default function PlantaMapaCad({ planta, simbolos, nomeDoTipo, ativa, onEscolher, foco, ficha }) {
  const quadro = useRef(null);
  const svg = useRef(null);
  const [tamanho, setTamanho] = useState({ w: 900, h: ALTURA_NORMAL });
  const [cheia, setCheia] = useState(false);
  const [vb, setVb] = useState(null);
  const [passando, setPassando] = useState(null); // { p, x, y } ponto sob o mouse
  const arrasto = useRef(null);

  const porIdx = useMemo(() => new Map(simbolos.map(s => [s.idx, s])), [simbolos]);
  const caixaInicial = planta.caixa;
  const extensao = planta.extensao || planta.caixa;

  // tamanho do quadro na tela (o viewBox segue a proporção dele: zoom e clique sem distorção)
  useEffect(() => {
    const el = quadro.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(Math.max(e.contentRect.width, 100)), h = Math.round(Math.max(e.contentRect.height, 100));
      setTamanho(t => (t.w === w && t.h === h ? t : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // primeiro enquadramento (uma vez por desenho: confirmar uma linha recarrega o mapa e não pode tirar o zoom do lugar);
  // quadro de outro tamanho (tela cheia): mesmo centro e mesma escala, só a proporção acompanha
  const chaveCaixa = caixaInicial.join(',');
  const tamanhoAnterior = useRef(null);
  useEffect(() => { setVb(enquadrar(caixaInicial, tamanho)); }, [chaveCaixa]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t0 = tamanhoAnterior.current;
    tamanhoAnterior.current = tamanho;
    if (!t0 || (t0.w === tamanho.w && t0.h === tamanho.h)) return;
    setVb(v => {
      if (!v) return enquadrar(caixaInicial, tamanho);
      const w = v.w * (tamanho.w / t0.w), h = w * (tamanho.h / tamanho.w);
      return { x: v.x + v.w / 2 - w / 2, y: v.y + v.h / 2 - h / 2, w, h };
    });
  }, [tamanho]); // eslint-disable-line react-hooks/exhaustive-deps
  // a tabela pediu para mostrar uma linha: enquadra os pontos dela
  useEffect(() => {
    if (!foco) return;
    const pts = planta.pontos.filter(p => p[0] === foco.idx);
    if (pts.length) setVb(enquadrar(caixaDosPontos(pts), tamanho, 0.25));
  }, [foco]); // eslint-disable-line react-hooks/exhaustive-deps

  // roda do mouse: o listener é registrado à mão para poder impedir a rolagem da página (o onWheel do React é passivo)
  useEffect(() => {
    const el = svg.current;
    if (!el) return undefined;
    const roda = (e) => {
      e.preventDefault();
      const p = paraMundo(e.clientX, e.clientY);
      if (!p) return;
      const f = e.deltaY > 0 ? 1.25 : 0.8;
      setVb(v => (v ? { x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f, w: v.w * f, h: v.h * f } : v));
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  });

  const pxPorUnidade = vb ? tamanho.w / vb.w : 1;
  // ponto de 2 a 4,5 px conforme o zoom: na vista geral muitos pontos juntos não viram uma mancha só
  const raio = Math.min(RAIO_PX, Math.max(2, pxPorUnidade * 0.35)) / pxPorUnidade;
  const areas = useMemo(() => areasDosPontos(planta.pontos), [planta.pontos]);

  // ponto da tela (cliente) → coordenada do viewBox
  function paraMundo(cx, cy) {
    const el = svg.current;
    if (!el || !vb) return null;
    const r = el.getBoundingClientRect();
    return { x: vb.x + ((cx - r.left) / r.width) * vb.w, y: vb.y + ((cy - r.top) / r.height) * vb.h };
  }
  function pontoPerto(cx, cy) {
    const m = paraMundo(cx, cy);
    if (!m) return null;
    const lim = TOQUE_PX / pxPorUnidade;
    let melhor = null, dMin = lim;
    for (const p of planta.pontos) {
      const d = Math.hypot(p[1] - m.x, -p[2] - m.y);
      // na disputa, o ponto da linha escolhida ganha
      if (d < dMin || (melhor && d <= lim && p[0] === ativa && melhor[0] !== ativa)) { melhor = p; dMin = d; }
    }
    return melhor;
  }

  const zoom = (f) => setVb(v => (v ? { x: v.x + (v.w * (1 - f)) / 2, y: v.y + (v.h * (1 - f)) / 2, w: v.w * f, h: v.h * f } : v));
  const centralizarAtiva = () => {
    const pts = planta.pontos.filter(p => p[0] === ativa);
    if (pts.length) setVb(enquadrar(caixaDosPontos(pts), tamanho, 0.25));
  };

  function aoApertar(e) {
    if (e.button !== 0) return;
    arrasto.current = { x: e.clientX, y: e.clientY, vb, moveu: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function aoMover(e) {
    const a = arrasto.current;
    if (a) {
      const dx = e.clientX - a.x, dy = e.clientY - a.y;
      if (!a.moveu && Math.hypot(dx, dy) < 4) return;
      a.moveu = true;
      const r = svg.current.getBoundingClientRect();
      setVb({ ...a.vb, x: a.vb.x - (dx / r.width) * a.vb.w, y: a.vb.y - (dy / r.height) * a.vb.h });
      setPassando(null);
      return;
    }
    const p = pontoPerto(e.clientX, e.clientY);
    const r = quadro.current.getBoundingClientRect();
    setPassando(p ? { p, x: e.clientX - r.left, y: e.clientY - r.top } : null);
  }
  function aoSoltar(e) {
    const a = arrasto.current;
    arrasto.current = null;
    if (!a || a.moveu) return;
    const p = pontoPerto(e.clientX, e.clientY);
    if (p) onEscolher(p[0]);
  }

  // fundo: um caminho por layer (a layer da linha escolhida mais clara)
  const caminhosDoFundo = useMemo(() => {
    const f = planta.fundo;
    if (!f) return [];
    const porLayer = new Map();
    for (const l of f.linhas) {
      let d = `M${l[1]} ${-l[2]}`;
      for (let i = 3; i < l.length; i += 2) d += `L${l[i]} ${-l[i + 1]}`;
      porLayer.set(l[0], (porLayer.get(l[0]) || '') + d);
    }
    return [...porLayer].map(([i, d]) => ({ layer: f.layers[i], d }));
  }, [planta.fundo]);
  const salas = useMemo(() => planta.salas.map(s => {
    const xs = s.poligono.map(p => p[0]), ys = s.poligono.map(p => p[1]);
    return { ...s, d: `M${s.poligono.map(p => `${p[0]} ${-p[1]}`).join('L')}Z`, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: -(Math.min(...ys) + Math.max(...ys)) / 2, larg: Math.max(...xs) - Math.min(...xs) };
  }), [planta.salas]);
  const contagem = useMemo(() => {
    const c = { nao_reconhecido: 0, reconhecido: 0, conferido: 0, fora: 0 };
    for (const p of planta.pontos) { const s = porIdx.get(p[0]); if (s) c[situacaoDaLinha(s)]++; }
    return c;
  }, [planta.pontos, porIdx]);

  const layerAtiva = ativa != null ? porIdx.get(ativa)?.layer : null;
  const sAtiva = ativa != null ? porIdx.get(ativa) : null;
  const pontosAtivos = ativa != null ? planta.pontos.filter(p => p[0] === ativa).length : 0;
  const fonte = 11 / pxPorUnidade;

  return (
    <div data-testid="planta-mapa-cad">
      <div ref={quadro} style={{ position: 'relative', height: cheia ? '78vh' : ALTURA_NORMAL, background: '#0b0d10', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden', userSelect: 'none' }}>
        {vb && (
          <svg ref={svg} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="none" role="img" aria-label="Planta com os pontos lidos do desenho"
            style={{ width: '100%', height: '100%', display: 'block', cursor: arrasto.current?.moveu ? 'grabbing' : passando ? 'pointer' : 'grab', touchAction: 'none' }}
            onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerLeave={() => { if (!arrasto.current) setPassando(null); }}>
            {caminhosDoFundo.map(c => (
              <path key={c.layer} d={c.d} fill="none" stroke={c.layer === layerAtiva ? '#a08a4a' : '#4a525c'} strokeWidth={c.layer === layerAtiva ? 1.2 : 0.8} vectorEffect="non-scaling-stroke" />
            ))}
            {salas.map((s, i) => (
              <g key={i}>
                <path d={s.d} fill="rgba(90,120,160,0.06)" stroke="#36506e" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                {s.nome && s.larg * pxPorUnidade > 60 && (
                  <text x={s.cx} y={s.cy} fontSize={fonte} fill="#7d93ab" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>{s.nome}</text>
                )}
              </g>
            ))}
            {planta.pontos.map((p, i) => {
              const s = porIdx.get(p[0]);
              if (!s || p[0] === ativa) return null;
              return <circle key={i} cx={p[1]} cy={-p[2]} r={raio} fill={SITUACAO[situacaoDaLinha(s)].cor} fillOpacity={ativa != null ? 0.45 : 0.9} stroke="#0b0d10" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />;
            })}
            {/* pontos da linha escolhida por cima, maiores e com anel */}
            {ativa != null && planta.pontos.filter(p => p[0] === ativa).map((p, i) => (
              <g key={`a${i}`}>
                <circle cx={p[1]} cy={-p[2]} r={raio * 2.3} fill="none" stroke="#f0c63c" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <circle cx={p[1]} cy={-p[2]} r={raio * 1.3} fill={SITUACAO[situacaoDaLinha(sAtiva)].cor} />
              </g>
            ))}
            {passando && <circle cx={passando.p[1]} cy={-passando.p[2]} r={raio * 1.9} fill="none" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
          </svg>
        )}

        {/* barra de ferramentas */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 'calc(100% - 16px)' }}>
          {areas.length > 0 && (
            <select value="" onChange={(e) => { const a = areas[Number(e.target.value)]; if (a) setVb(enquadrar(a.caixa, tamanho, 0.08)); }}
              style={{ ...botao, padding: '0 6px' }} aria-label="Ir para uma área da folha" data-testid="ir-para-area">
              <option value="">Ir para…</option>
              {areas.map((a, i) => <option key={i} value={i}>{a.nome} — {a.pontos} ponto(s)</option>)}
            </select>
          )}
          <button type="button" style={botao} onClick={() => zoom(0.7)} title="Aproximar (ou roda do mouse)" aria-label="Aproximar"><ZoomIn size={14} /></button>
          <button type="button" style={botao} onClick={() => zoom(1 / 0.7)} title="Afastar" aria-label="Afastar"><ZoomOut size={14} /></button>
          <button type="button" style={botao} onClick={() => setVb(enquadrar(caixaInicial, tamanho))} title="Enquadrar a planta"><Scan size={14} /> Ajustar</button>
          <button type="button" style={botao} onClick={() => setVb(enquadrar(extensao, tamanho, 0.02))} title="Mostrar o desenho inteiro">Tudo</button>
          {ativa != null && <button type="button" style={botao} onClick={centralizarAtiva} title="Enquadrar os pontos da linha escolhida"><Crosshair size={14} /> Linha</button>}
          <button type="button" style={botao} onClick={() => setCheia(c => !c)} title={cheia ? 'Tamanho normal' : 'Planta maior'} aria-label="Tela cheia">
            {cheia ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* dica do ponto sob o mouse */}
        {passando && porIdx.get(passando.p[0]) && (() => {
          const s = porIdx.get(passando.p[0]);
          const sit = SITUACAO[situacaoDaLinha(s)];
          return (
            <div style={{ position: 'absolute', left: Math.min(passando.x + 14, tamanho.w - 250), top: Math.max(passando.y - 10, 8), width: 236, padding: '7px 9px', background: 'rgba(16,16,16,0.96)', border: `1px solid ${sit.cor}`, borderRadius: 6, fontSize: 11.5, color: '#ddd', pointerEvents: 'none', lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700 }}>{s.simbolo === '?' ? 'Tipo não reconhecido' : nomeDoTipo(s.simbolo)}</div>
              <div style={{ color: '#aaa' }}>Layer {s.layer}{s.medida?.length ? ` · ${s.medida.map(m => Math.round(m * 100)).join(' × ')} cm` : ''}</div>
              <div style={{ color: sit.cor }}>{sit.rotulo}</div>
              <div style={{ color: '#888' }}>{s.quantidade} ponto(s) nesta linha · clique para conferir</div>
            </div>
          );
        })()}

        {/* ficha da linha escolhida: confere ali mesmo, sem descer até a tabela */}
        {sAtiva && ficha && (
          <div style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: 'calc(100% - 16px)', padding: '8px 10px', background: 'rgba(16,16,16,0.96)', border: '1px solid #f0c63c', borderRadius: 8, fontSize: 12, color: '#ddd' }} data-testid="ficha-linha-mapa">
            <div style={{ marginBottom: 6 }}>
              <b>Layer {sAtiva.layer}</b>
              <span style={{ color: '#999' }}> · {pontosAtivos} ponto(s) na planta · </span>
              <span style={{ color: SITUACAO[situacaoDaLinha(sAtiva)].cor }}>{SITUACAO[situacaoDaLinha(sAtiva)].rotulo}</span>
            </div>
            {ficha(sAtiva)}
          </div>
        )}
        {!planta.fundo && (
          <div style={{ position: 'absolute', left: 8, top: 8, maxWidth: 380, fontSize: 11.5, color: '#c9a227', background: 'rgba(16,16,16,0.9)', padding: '6px 8px', borderRadius: 6 }}>
            Esta análise foi lida antes do desenho de fundo: a planta mostra só ambientes e pontos. Use "Ler o DWG de novo" acima para ver paredes e traços.
          </div>
        )}
      </div>

      {/* legenda com a contagem de pontos */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 6, fontSize: 11.5, color: 'var(--texto-3)' }}>
        {Object.entries(SITUACAO).map(([k, v]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: v.cor, display: 'inline-block' }} />
            {v.rotulo} ({contagem[k]})
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>Roda do mouse: zoom · arrastar: mover · clique no ponto: conferir</span>
      </div>
    </div>
  );
}
