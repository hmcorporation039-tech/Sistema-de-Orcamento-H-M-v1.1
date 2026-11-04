// Componentes inseridos e retirados pelo engenheiro num projeto analisado (versão 2.30): na planta do Mapa do CAD ou
// no 3D, com os símbolos da biblioteca (services/bibliotecaComponentes.js). Uma lista só, por arquivo, guardada em
// dados_extraidos[i].mapa_cad.edicoes, nas coordenadas do PRÓPRIO arquivo (as da planta do mapa):
//   { adicionados: [{ id, simbolo, disciplina, rotulo, x, y, altura_m, usuario_id, em }],
//     removidos:   [{ id, x, y, simbolo, rotulo, linha, usuario_id, em }] }
// Quem usa a lista:
//   - a releitura do desenho (services/analiseCad lerArquivoCad, no "reprocessar"): o retirado sai da contagem e o
//     inserido entra como ponto CONFERIDO (vai para o orçamento) — é a mesma regra do tipo confirmado no mapa;
//   - o 3D (services/modelo3d fonteDoModelo): mostra a lista na hora, sem esperar o reprocessamento.
// O retirado é guardado pela POSIÇÃO, não pela linha do mapa: a linha muda quando o mapa é refeito com outro
// aprendizado, a posição do símbolo no desenho não.
const crypto = require('crypto');
const { componente } = require('./bibliotecaComponentes');

const TOLERANCIA_M = 0.15; // um símbolo retirado: o ponto desenhado a até 15 cm dele
const MAX_POR_PEDIDO = 500;
const MAX_POR_ARQUIVO = 3000;
const MARGEM_M = 50; // fora do desenho mais do que isso é clique perdido (ou coordenada de outro arquivo)

const vazias = () => ({ adicionados: [], removidos: [] });
const normalizar = (e) => ({ adicionados: Array.isArray(e?.adicionados) ? e.adicionados : [], removidos: Array.isArray(e?.removidos) ? e.removidos : [] });
const temEdicoes = (e) => !!e && ((e.adicionados?.length || 0) + (e.removidos?.length || 0)) > 0;
const r3 = (v) => Math.round(Number(v) * 1000) / 1000;
const perto = (a, x, y, tol = TOLERANCIA_M) => Math.hypot(a.x - x, a.y - y) <= tol;
const novoId = (prefixo) => `${prefixo}${crypto.randomBytes(5).toString('hex')}`;

// corpo = { adicionar: [{ simbolo, x, y, altura_m?, rotulo? }], remover: [{ x, y, simbolo?, rotulo?, linha? }], desfazer: [id] }
// mapa = o mapa_cad do arquivo. Devolve texto de erro ou null.
function validarPedido(corpo, mapa) {
  const adicionar = corpo?.adicionar ?? [], remover = corpo?.remover ?? [], desfazer = corpo?.desfazer ?? [];
  if (![adicionar, remover, desfazer].every(Array.isArray)) return 'Formato inválido: adicionar, remover e desfazer são listas.';
  if (!adicionar.length && !remover.length && !desfazer.length) return 'Nada para alterar.';
  if (adicionar.length + remover.length + desfazer.length > MAX_POR_PEDIDO) return `Alterações demais de uma vez (máximo ${MAX_POR_PEDIDO}).`;
  const ext = mapa?.planta?.extensao;
  const dentro = (x, y) => !Array.isArray(ext) || (x >= ext[0] - MARGEM_M && x <= ext[2] + MARGEM_M && y >= ext[1] - MARGEM_M && y <= ext[3] + MARGEM_M);
  const posicaoOk = (p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y)) && dentro(Number(p.x), Number(p.y));
  for (const a of adicionar) {
    if (!a || !componente(a.simbolo)) return `Componente "${a?.simbolo}" não existe na biblioteca.`;
    if (!posicaoOk(a)) return 'Posição do componente fora do desenho: clique dentro da planta.';
    if (a.altura_m != null && a.altura_m !== '' && !(Number(a.altura_m) > 0 && Number(a.altura_m) <= 15)) return 'Altura inválida: use metros, de 0,01 a 15.';
    if (a.rotulo != null && typeof a.rotulo !== 'string') return 'Descrição inválida.';
  }
  for (const r of remover) if (!posicaoOk(r)) return 'Posição do componente a retirar fora do desenho.';
  for (const id of desfazer) if (typeof id !== 'string' || !/^[ar][0-9a-f]{10}$/.test(id)) return 'Edição a desfazer inválida.';
  const atual = normalizar(mapa?.edicoes);
  if (atual.adicionados.length + adicionar.length > MAX_POR_ARQUIVO || atual.removidos.length + remover.length > MAX_POR_ARQUIVO) return `Limite de ${MAX_POR_ARQUIVO} edições por arquivo.`;
  return null;
}

// Aplica o pedido (já validado) e devolve { edicoes, resumo }. Retirar um componente que foi INSERIDO é desfazer a
// inserção (não vira "retirado"); retirar duas vezes o mesmo ponto não duplica.
function aplicarPedido(atuais, corpo, usuarioId = null, agora = new Date().toISOString()) {
  const e = normalizar(atuais);
  let adicionados = [...e.adicionados], removidos = [...e.removidos];
  const resumo = { adicionados: 0, removidos: 0, desfeitos: 0 };
  const desfazer = new Set(corpo.desfazer || []);
  if (desfazer.size) {
    const antes = adicionados.length + removidos.length;
    adicionados = adicionados.filter(a => !desfazer.has(a.id));
    removidos = removidos.filter(r => !desfazer.has(r.id));
    resumo.desfeitos += antes - adicionados.length - removidos.length;
  }
  for (const r of corpo.remover || []) {
    const x = r3(r.x), y = r3(r.y);
    const inserido = adicionados.findIndex(a => perto(a, x, y) && (!r.simbolo || r.simbolo === a.simbolo));
    if (inserido >= 0) { adicionados.splice(inserido, 1); resumo.desfeitos++; continue; }
    if (removidos.some(o => perto(o, x, y, 0.05))) continue;
    removidos.push({ id: novoId('r'), x, y, simbolo: typeof r.simbolo === 'string' ? r.simbolo.slice(0, 60) : null,
      rotulo: typeof r.rotulo === 'string' ? r.rotulo.slice(0, 120) : null, linha: Number.isInteger(r.linha) ? r.linha : null, usuario_id: usuarioId, em: agora });
    resumo.removidos++;
  }
  for (const a of corpo.adicionar || []) {
    const c = componente(a.simbolo);
    const rotulo = String(a.rotulo || '').trim().slice(0, 120) || c.nome;
    const altura = Number(a.altura_m) > 0 ? Math.round(Number(a.altura_m) * 100) / 100 : null;
    adicionados.push({ id: novoId('a'), simbolo: c.simbolo, disciplina: c.disciplina, rotulo, x: r3(a.x), y: r3(a.y), altura_m: altura, usuario_id: usuarioId, em: agora });
    resumo.adicionados++;
  }
  return { edicoes: { adicionados, removidos }, resumo };
}

// o ponto desenhado em (x, y) foi retirado? (dx, dy: deslocamento do arquivo quando a posição já está alinhada)
const retirado = (edicoes, x, y, dx = 0, dy = 0) => normalizar(edicoes).removidos.some(r => perto(r, x - dx, y - dy));

// Cada "retirar" tira UM componente: o mais perto do clique, até ALCANCE_M (o ponto de inserção do bloco nomeado pode
// ficar longe do centro do desenho dele, que é onde a planta mostra o ponto). candidatos: [[x, y], …] nas coordenadas
// do arquivo + (dx, dy). Devolve o conjunto dos índices retirados.
const ALCANCE_M = 0.35;
function indicesRetirados(candidatos, edicoes, dx = 0, dy = 0) {
  const fora = new Set();
  for (const r of normalizar(edicoes).removidos) {
    let melhor = -1, dMin = ALCANCE_M;
    candidatos.forEach(([x, y], i) => {
      if (fora.has(i)) return;
      const d = Math.hypot(x - dx - r.x, y - dy - r.y);
      if (d <= dMin) { melhor = i; dMin = d; }
    });
    if (melhor >= 0) fora.add(melhor);
  }
  return fora;
}

// os inseridos como pontos da leitura do desenho (formato de pontosDoDesenho: conferidos, sem linha do mapa)
function pontosInseridos(edicoes) {
  return normalizar(edicoes).adicionados.map(a => {
    const c = componente(a.simbolo);
    const altura = a.altura_m > 0 ? a.altura_m : (c?.altura_m || null);
    return { simbolo: a.simbolo, x: a.x, y: a.y, disciplina: a.disciplina || c?.disciplina || 'eletrica', rotulo: a.rotulo || c?.nome || a.simbolo,
      ...(altura ? { altura_m: altura, alturaDe: a.altura_m > 0 ? 'confirmado' : 'biblioteca' } : {}), confirmado: true, linha: -1, edicao: a.id };
  });
}

const contagem = (edicoes) => ({ adicionados: normalizar(edicoes).adicionados.length, removidos: normalizar(edicoes).removidos.length });

module.exports = { TOLERANCIA_M, ALCANCE_M, vazias, normalizar, temEdicoes, validarPedido, aplicarPedido, retirado, indicesRetirados, pontosInseridos, contagem };
