// Placar de precisão da leitura de projeto (fase 3 do roteiro, princípio 3 — "precisão medida, não percebida").
//
// Compara o que o sistema LEU de um projeto real (DWG/DXF/PDF) com a contagem CONFERIDA pelo engenheiro
// (o gabarito, um JSON por projeto, numa pasta FORA do repositório — dados de cliente não entram no git).
// Formato do gabarito: docs/PLACAR-PRECISAO.md. Quem lê os arquivos: scripts/placar-precisao.js.
//
//   leituraDoProjeto(arquivos)        → { simbolos, trechos, ambientes } no formato neutro (abaixo)
//   compararComGabarito(leitura, gab) → { simbolos: [...], trechos: [...], ambientes: {...}, porDisciplina, geral }
//
// Acerto de uma quantidade: min(lido, esperado) ÷ max(lido, esperado) — 1 quando bate, 0 quando não leu nada
// (ou leu algo onde não havia). Assim contar a mais e contar a menos pesam igual.
const acerto = (lido, esperado) => {
  const a = Math.max(0, Number(lido) || 0), e = Math.max(0, Number(esperado) || 0);
  if (!a && !e) return 1;
  return Math.min(a, e) / Math.max(a, e);
};
const pct = (v) => Math.round(v * 1000) / 10;
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
// disciplina do gabarito ↔ da leitura (rede e cabeamento são o mesmo grupo)
const GRUPO = { cabeamento: 'rede', telefonia: 'rede', 'controle-acesso': 'controle_acesso', veicular: 'carregador' };
const grupo = (d) => GRUPO[d] || d || '';
const regex = (busca) => { try { return new RegExp(busca, 'i'); } catch { return new RegExp(String(busca).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } };

// Resultado da análise (services/analiseCad lerArquivoCad → pagina; utils/pdfVetorial → páginas) no formato neutro:
//   simbolos: [{ descricao, disciplina, quantidade, conferir }]  (bloco, símbolo explodido do mapa ou símbolo da legenda do PDF)
//   trechos:  [{ disciplina, tipo, metros, layer?, descricao }]
//   ambientes:[{ nome, area_m2 }]
// `paginas`: [{ origem: 'cad'|undefined, itens }] de todos os arquivos do projeto
function leituraDoProjeto({ paginas = [], ambientes = [] } = {}) {
  const simbolos = [], trechos = [];
  for (const p of paginas) {
    for (const it of p?.itens || []) {
      if (it.tipo === 'simbolo') simbolos.push({ descricao: String(it.descricao || ''), bloco: it.bloco || '', disciplina: it.disciplina || null, quantidade: Number(it.quantidade) || 0, conferir: !!(it.ambiguo || it.conferir) });
      else if (it.tipo === 'linha' && Number.isFinite(Number(it.metros ?? it.rota_m))) {
        const tipo = it.tipoLinha || (/eletrocalha/i.test(it.descricao) ? 'eletrocalha' : /perfilado/i.test(it.descricao) ? 'perfilado' : /leito/i.test(it.descricao) ? 'leito' : 'eletroduto');
        trechos.push({ disciplina: it.disciplina || null, tipo, metros: Number(it.metros ?? it.rota_m), layer: it.layer || '', descricao: String(it.descricao || '') });
      }
    }
  }
  return { simbolos, trechos, ambientes: (ambientes || []).map(a => ({ nome: a.nome, area_m2: Number(a.area_m2) || null })) };
}

// gabarito (docs/PLACAR-PRECISAO.md) × leitura → placar
function compararComGabarito(leitura, gabarito) {
  const linhasSimbolo = [];
  for (const g of gabarito.simbolos || []) {
    const re = regex(g.busca || g.tipo || '');
    const achados = leitura.simbolos.filter(s => re.test(`${s.descricao} ${s.bloco}`) && (!g.disciplina || grupo(s.disciplina) === grupo(g.disciplina)));
    const lido = achados.reduce((t, s) => t + s.quantidade, 0);
    const aConferir = achados.filter(s => s.conferir).reduce((t, s) => t + s.quantidade, 0);
    linhasSimbolo.push({ disciplina: g.disciplina || '', tipo: g.tipo || g.busca, esperado: g.quantidade, lido, aConferir, acerto: acerto(lido, g.quantidade) });
  }
  const linhasTrecho = [];
  for (const g of gabarito.trechos || []) {
    const re = g.layer ? regex(g.layer) : null;
    const achados = leitura.trechos.filter(t => (!g.tipo || t.tipo === g.tipo) && (!g.disciplina || grupo(t.disciplina) === grupo(g.disciplina)) && (!re || re.test(t.layer)));
    const lido = Math.round(achados.reduce((s, t) => s + t.metros, 0) * 10) / 10;
    linhasTrecho.push({ disciplina: g.disciplina || '', tipo: g.tipo || 'eletroduto', ...(g.layer ? { layer: g.layer } : {}), esperado_m: g.metros, lido_m: lido, acerto: acerto(lido, g.metros) });
  }
  // ambientes: cada nome do gabarito achado entre os lidos (sem acento, maiúsculas); a área, quando o gabarito dá,
  // vale dentro da tolerância (padrão 5 %)
  let ambientes = null;
  const esperados = gabarito.ambientes?.lista || [];
  if (esperados.length || Number.isFinite(gabarito.ambientes?.quantidade)) {
    const lidos = new Map(leitura.ambientes.map(a => [normalizar(a.nome), a]));
    const tol = Number(gabarito.ambientes?.tolerancia_area_pct ?? 5) / 100;
    const porNome = esperados.map(e => {
      const a = lidos.get(normalizar(e.nome));
      const areaOk = a && Number.isFinite(e.area_m2) ? Math.abs((a.area_m2 || 0) - e.area_m2) <= tol * e.area_m2 : !!a;
      return { nome: e.nome, achado: !!a, ...(Number.isFinite(e.area_m2) ? { area_esperada: e.area_m2, area_lida: a?.area_m2 ?? null } : {}), acerto: a ? (areaOk ? 1 : 0.5) : 0 };
    });
    const qtd = Number.isFinite(gabarito.ambientes?.quantidade) ? { esperado: gabarito.ambientes.quantidade, lido: leitura.ambientes.length, acerto: acerto(leitura.ambientes.length, gabarito.ambientes.quantidade) } : null;
    const media = [...porNome.map(x => x.acerto), ...(qtd ? [qtd.acerto] : [])];
    ambientes = { porNome, ...(qtd ? { quantidade: qtd } : {}), acerto: media.length ? media.reduce((a, b) => a + b, 0) / media.length : null };
  }
  // por disciplina: média dos acertos das linhas da disciplina (símbolos e metros)
  const porDisc = new Map();
  for (const l of [...linhasSimbolo, ...linhasTrecho]) {
    const d = l.disciplina || '(sem disciplina)';
    (porDisc.get(d) || porDisc.set(d, []).get(d)).push(l.acerto);
  }
  const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const porDisciplina = Object.fromEntries([...porDisc].map(([d, v]) => [d, pct(media(v))]));
  const partes = { simbolos: media(linhasSimbolo.map(l => l.acerto)), metros: media(linhasTrecho.map(l => l.acerto)), ambientes: ambientes?.acerto ?? null };
  const validas = Object.values(partes).filter(v => v != null);
  return {
    simbolos: linhasSimbolo.map(l => ({ ...l, acerto: pct(l.acerto) })),
    trechos: linhasTrecho.map(l => ({ ...l, acerto: pct(l.acerto) })),
    ambientes: ambientes && { ...ambientes, acerto: ambientes.acerto == null ? null : pct(ambientes.acerto), porNome: ambientes.porNome.map(x => ({ ...x, acerto: pct(x.acerto) })) },
    porDisciplina,
    geral: { simbolos: partes.simbolos == null ? null : pct(partes.simbolos), metros: partes.metros == null ? null : pct(partes.metros), ambientes: partes.ambientes == null ? null : pct(partes.ambientes), total: validas.length ? pct(media(validas)) : null },
  };
}

// Confere o gabarito (o que falta ou está errado) antes de comparar. Devolve [texto].
function errosDoGabarito(g) {
  const erros = [];
  if (!g || typeof g !== 'object') return ['o gabarito não é um objeto JSON'];
  if (!Array.isArray(g.arquivos) || !g.arquivos.length) erros.push('"arquivos" vazio: diga quais arquivos do projeto ler');
  for (const [i, a] of (g.arquivos || []).entries()) if (!a?.arquivo) erros.push(`arquivos[${i}]: sem "arquivo"`);
  for (const [i, s] of (g.simbolos || []).entries()) {
    if (!s?.busca && !s?.tipo) erros.push(`simbolos[${i}]: sem "busca" (texto ou regex da descrição)`);
    if (!(Number(s?.quantidade) >= 0)) erros.push(`simbolos[${i}]: "quantidade" inválida`);
  }
  for (const [i, t] of (g.trechos || []).entries()) if (!(Number(t?.metros) >= 0)) erros.push(`trechos[${i}]: "metros" inválido`);
  return erros;
}

module.exports = { acerto, leituraDoProjeto, compararComGabarito, errosDoGabarito, normalizar };
