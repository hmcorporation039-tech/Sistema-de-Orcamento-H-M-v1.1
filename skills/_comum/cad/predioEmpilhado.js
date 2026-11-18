// Vista do PRÉDIO no 3D (versão 2.46, 18/11/2026) — "pavimentos alinhados na vertical e um 3D com os andares
// empilhados". As cenas de cada pavimento (./modelosPorPlanta.js) são juntadas numa cena só: cada pavimento deslocado
// para o lugar dele no prédio (o alinhamento de ./pavimentos.js — escada/elevador ou as paredes que se repetem) e
// erguido pelo nível do piso lido nas cotas (subsolo abaixo do térreo). É uma cena comum do visualizador: as paredes,
// vidros, componentes e a infraestrutura já têm cota (z) e só ganham a do pavimento; o piso dos ambientes e as
// etiquetas usam a.z (visualizador3d/app.js). Só para VER: inserir/retirar componentes é na planta de cada pavimento
// (visualizador3d/edicao.js desliga a edição nesta vista).
//
//   cenaDoPredio(cenas, arquitetura) → cena (com plantaInfo.predio = true) ou null (menos de 2 pavimentos alinhados)
const r2 = (v) => Math.round(v * 100) / 100;

function cenaDoPredio(cenas, arquitetura) {
  const pavs = new Map((arquitetura.pavimentos || []).map(p => [p.nome, p]));
  const pisos = cenas.filter(c => c.plantaInfo?.pavimento && pavs.get(c.plantaInfo.pavimento)?.deslocamento && Array.isArray(c.origem))
    .map(c => ({ c, p: pavs.get(c.plantaInfo.pavimento) }));
  if (pisos.length < 2) return null;
  // nível de cada piso: o lido nas cotas; sem cota, empilha pela ordem com o pé-direito + 0,20 m de laje
  const ref = pisos.find(x => x.p.metodo === 'referência') || pisos[0];
  const comNivel = pisos.every(x => Number.isFinite(x.p.nivel_m));
  let acum = 0;
  const zDe = new Map();
  for (const x of pisos) {
    if (comNivel) zDe.set(x, r2(x.p.nivel_m - ref.p.nivel_m));
    else { zDe.set(x, r2(acum)); acum += (x.c.peDireito || 2.8) + 0.2; }
  }
  if (!comNivel) { const z0 = zDe.get(ref); for (const x of pisos) zDe.set(x, r2(zDe.get(x) - z0)); }
  // origem do prédio: a da cena de referência no lugar dela
  const O = [ref.c.origem[0] + ref.p.deslocamento[0], ref.c.origem[1] + ref.p.deslocamento[1]];
  const out = {
    ...ref.c, titulo: ref.c.titulo, paredes: [], muretas: [], guardas: [], vidros: [], pilares: [], planta: null, folhas: [], portas: [],
    ambientes: [], dispositivos: [], infra: [], avisos: [], origem: [r2(O[0]), r2(O[1])],
  };
  delete out.instalacao; delete out.componentes; delete out.objetivoInfo;
  const tipos = new Map();
  const infra = new Map();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const linhas = [];
  for (const x of pisos) {
    const { c, p } = x;
    const z = zDe.get(x);
    const dx = c.origem[0] + p.deslocamento[0] - O[0], dy = c.origem[1] + p.deslocamento[1] - O[1];
    const XY = (px, py) => [r2(px + dx), r2(py + dy)];
    const caixaZ = (w) => { const [ax, ay] = XY(w[0], w[1]), [bx, by] = XY(w[2], w[3]); x0 = Math.min(x0, ax, bx); x1 = Math.max(x1, ax, bx); y0 = Math.min(y0, ay, by); y1 = Math.max(y1, ay, by); return [ax, ay, bx, by, w[4], r2(w[5] + z), r2(w[6] + z)]; };
    out.paredes.push(...(c.paredes || []).map(caixaZ));
    out.muretas.push(...(c.muretas || []).map(caixaZ));
    out.guardas.push(...(c.guardas || []).map(caixaZ));
    out.vidros.push(...(c.vidros || []).map(caixaZ));
    for (const a of c.ambientes || []) {
      out.ambientes.push({ ...a, i: out.ambientes.length, nome: `${a.nome} (${p.nome})`, poligono: a.poligono.map(q => XY(q[0], q[1])), centro: XY(a.centro[0], a.centro[1]), z, pd: c.peDireito });
    }
    for (const t of c.dispositivos || []) {
      const k = `${t.simbolo}|${t.disciplina}|${t.rotulo}`;
      const alvo = tipos.get(k) || tipos.set(k, { ...t, itens: [] }).get(k);
      alvo.itens.push(...(t.itens || []).map(it => { const [ix, iy] = XY(it[0], it[1]); return [ix, iy, r2(it[2] + z), ...it.slice(3)]; }));
    }
    for (const g of c.infra || []) {
      const k = `${g.disciplina}|${g.tipo}|${g.tipoInfra || ''}|${g.material || ''}|${g.medida || ''}|${g.sugerido ? 1 : 0}|${r2((g.z || 0) + z)}`;
      const seg = [];
      for (let i = 0; i + 1 < (g.segmentos || []).length; i += 2) seg.push(...XY(g.segmentos[i], g.segmentos[i + 1]));
      const desc = [];
      for (let i = 0; i + 3 < (g.descidas || []).length; i += 4) desc.push(...XY(g.descidas[i], g.descidas[i + 1]), r2(g.descidas[i + 2] + z), r2(g.descidas[i + 3] + z));
      const alvo = infra.get(k);
      if (alvo) { alvo.segmentos.push(...seg); alvo.descidas.push(...desc); alvo.comprimento_m = r2((alvo.comprimento_m || 0) + (g.comprimento_m || 0)); alvo.segmentos_total += g.segmentos_total || 0; }
      else infra.set(k, { ...g, z: r2((g.z || 0) + z), segmentos: seg, descidas: desc });
    }
    linhas.push(`${p.nome}: nível ${Number.isFinite(p.nivel_m) ? String(p.nivel_m).replace('.', ',') : '—'} m, ${p.metodo === 'referência' ? 'referência do alinhamento' : `alinhado ${p.metodo}`}`);
  }
  out.dispositivos = [...tipos.values()];
  out.infra = [...infra.values()];
  if (Number.isFinite(x0)) out.limites = [r2(x0 - 2), r2(y0 - 2), r2(x1 + 2), r2(y1 + 2)];
  out.peDireito = Math.max(...pisos.map(x => x.c.peDireito || 2.8));
  out.avisos = [
    `Vista do prédio: ${pisos.length} pavimentos alinhados na vertical e empilhados ${comNivel ? 'pelos níveis de piso lidos nas cotas' : 'pela ordem, com o pé-direito de cada um + 0,20 m de laje [CONFERIR]'} — só para visualizar; para inserir/retirar componentes, escolha um pavimento no seletor "Planta".`,
    ...linhas,
  ];
  const total = pisos.reduce((s, x) => s + (x.c.plantaInfo?.pontos || 0), 0);
  out.numeros = somarNumeros(pisos.map(x => x.c.numeros || {}), out);
  out.plantaInfo = { n: cenas.length + 1, nome: `Prédio — ${pisos.length} pavimentos empilhados`, caixa: ref.c.plantaInfo.caixa, pontos: total, origem: 'predio', area_m2: r2(pisos.reduce((s, x) => s + (x.c.plantaInfo?.area_m2 || 0), 0)), predio: true };
  return out;
}

// "Números do projeto" do prédio: a soma dos pavimentos (áreas, paredes, portas; componentes e infraestrutura por tipo)
function somarNumeros(lista, cena) {
  const out = {};
  for (const n of lista) {
    for (const [k, v] of Object.entries(n)) {
      if (typeof v === 'number') out[k] = k === 'pe_direito_m' ? Math.max(out[k] || 0, v) : r2((out[k] || 0) + v);
      else if (Array.isArray(v) && v.every(x => x && typeof x === 'object')) {
        const m = out[k] || (out[k] = []);
        for (const x of v) {
          const chave = JSON.stringify(Object.entries(x).filter(([, y]) => typeof y !== 'number'));
          const igual = m.find(y => y.__k === chave);
          if (igual) { for (const [kk, y] of Object.entries(x)) if (typeof y === 'number') igual[kk] = r2((igual[kk] || 0) + y); } else m.push({ ...x, __k: chave });
        }
      } else if (!(k in out)) out[k] = v;
    }
  }
  for (const v of Object.values(out)) if (Array.isArray(v)) for (const x of v) if (x && typeof x === 'object') delete x.__k;
  if (cena.limites) out.dimensoes_m = [r2(cena.limites[2] - cena.limites[0] - 4), r2(cena.limites[3] - cena.limites[1] - 4)];
  out.ambientes = cena.ambientes.length;
  return out;
}

module.exports = { cenaDoPredio };
