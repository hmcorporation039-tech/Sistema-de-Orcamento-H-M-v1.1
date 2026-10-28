// DXF da compatibilização (versão 2.3): a arquitetura de referência em cinza e
// cada conflito marcado em vermelho (círculo numerado), com a lista ao lado —
// para abrir no AutoCAD e conferir/sobrepor às pranchas (mesmas coordenadas do
// desenho de referência, em metros).
const path = require('path');

const CAD = path.join(__dirname, '..', '..', '..', 'skills', '_comum', 'cad');
const br = (v, c = 2) => Number(v).toFixed(c).replace('.', ',');

function gerarDxfCompatibilizacao({ dxfReferencia, conflitos, titulo }) {
  const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
  const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
  const arq = lerArquitetura(dxfReferencia);
  const d = new DesenhoDxf({ layers: [
    { nome: 'ARQ-REFERENCIA', cor: 8 }, { nome: 'COMPAT-CONFLITO', cor: 1 }, { nome: 'COMPAT-TRACADO', cor: 6 }, { nome: 'COMPAT-LISTA', cor: 7 },
  ], unidade: 'm' });
  for (const r of arq.referencia) {
    if (r.pts.length < 2) continue;
    if (r.tipo === 'linha') d.linha(r.pts[0][0], r.pts[0][1], r.pts[1][0], r.pts[1][1], 'ARQ-REFERENCIA');
    else d.polilinha(r.pts, { layer: 'ARQ-REFERENCIA', fechada: !!r.fechada });
  }
  const lista = conflitos.filter(c => (c.grupo || 0) === 0);
  lista.forEach((c, i) => {
    const layer = c.tipo === 'tracado' ? 'COMPAT-TRACADO' : 'COMPAT-CONFLITO';
    d.circulo(c.x, c.y, 0.35, layer);
    d.circulo(c.x, c.y, 0.45, layer);
    d.texto(c.x + 0.5, c.y + 0.1, 0.25, String(i + 1), { layer });
  });
  // lista à direita do desenho
  const x0 = arq.extensao.max[0] + 3;
  let y = arq.extensao.max[1];
  d.texto(x0, y, 0.5, titulo || 'COMPATIBILIZAÇÃO ENTRE DISCIPLINAS', { layer: 'COMPAT-LISTA' });
  y -= 0.9;
  d.texto(x0, y, 0.25, 'Critérios adotados pela H&M — conferir na norma e no manual do equipamento. Vermelho: componentes; magenta: traçados.', { layer: 'COMPAT-LISTA' });
  y -= 0.7;
  lista.forEach((c, i) => {
    const dist = c.distancia != null ? ` a ${br(c.distancia)} m` : c.metros != null ? ` (${br(c.metros, 1)} m sobrepostos)` : '';
    const txt = `${i + 1}. ${c.tema} — ${c.ambiente || 'fora dos ambientes'}: ${String(c.a.descricao).replace(/ — bloco .*/, '').slice(0, 40)} (${c.a.arquivo}) × ${String(c.b.descricao).replace(/ — bloco .*/, '').slice(0, 40)} (${c.b.arquivo})${dist}`;
    d.texto(x0, y, 0.22, txt, { layer: 'COMPAT-LISTA' });
    y -= 0.4;
  });
  if (!lista.length) d.texto(x0, y, 0.3, 'Nenhum conflito de posição encontrado entre os desenhos.', { layer: 'COMPAT-LISTA' });
  return d.toString();
}

// Para as rotas: a mesma geração numa thread à parte (services/tarefasCad) —
// ler a arquitetura de referência inteira trava a thread principal por segundos
function gerarDxfCompatibilizacaoNoWorker(dados) {
  return require('../services/tarefasCad').dxfCompatibilizacaoNoWorker(dados);
}

module.exports = { gerarDxfCompatibilizacao, gerarDxfCompatibilizacaoNoWorker };
