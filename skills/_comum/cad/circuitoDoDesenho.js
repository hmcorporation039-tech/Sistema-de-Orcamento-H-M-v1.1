// Circuito e retorno escritos junto do símbolo no DWG recebido (fase 1 do roteiro de
// 02/11/2026, passo 4): na planta elétrica o projetista escreve ao lado do ponto o
// número do circuito ("3", "C3", "IL2") e a letra do retorno ("a", "b") — ou os dois
// juntos ("3a", "3-b"). Este leitor liga cada um desses textos ao ponto lido mais
// perto (./pontosDoDesenho.js → aplicarMapa) e devolve a SUGESTÃO de circuito e
// retorno de cada ponto e o resumo por linha do Mapa do CAD. Nada entra no modelo
// sem a conferência do engenheiro: só os pontos de linha conferida no mapa levam o
// circuito para o 3D (services/analiseCad).
//
// Regras (determinísticas, sem IA):
//   - texto curto (≤ 6 caracteres) depois de limpar a formatação do MTEXT (./textoCad.js);
//     o que tem unidade (A, W, VA, mm, m), altura ("h=1,10") ou palavra fica de fora;
//   - cada texto vai para UM ponto: o mais perto dele, a até `raio` (padrão 0,8 m),
//     e só ponto de luz, tomada, interruptor e afins (a lista RE_COM_CIRCUITO);
//   - ponto com dois textos de circuito diferentes não fica com nenhum (fica a conferir).

const { limparMtext, lerAltura } = require('./textoCad');

const RAIO_PADRAO_M = 0.8;
// símbolos que levam circuito na planta elétrica (luz, tomada, interruptor, comando, sensor)
const RE_COM_CIRCUITO = /HM-ELE-|HM-ILU-(LUMINARIA|POSTE|COMANDO|SENSOR|REFLETOR|ARANDELA|PERFIL)|HM-HOSP-TOMADA/;

// "3", "12", "C3", "C-3", "CIRC 3", "IL2", "QD1-3" (circuito 3 do QD1)
const RE_CIRCUITO = /^(?:(?:C|CIRC\.?|CKT)\s*-?\s*)?(\d{1,3})$|^(IL\s*-?\s*\d{1,3})$|^Q[A-Z]{0,3}\d{0,2}\s*[-./]\s*(\d{1,3})$/i;
// "3a", "3-a", "3.b", "IL2b", "3 a"
const RE_CIRCUITO_RETORNO = /^((?:IL\s*-?\s*)?\d{1,3})\s*[-.]?\s*([a-z]{1,2})$/;
// "a", "b", "ab" (letra minúscula: maiúscula sozinha costuma ser nome de vista/corte), "a,b"
const RE_RETORNO = /^([a-z]{1,2})(?:\s*[,;/]\s*([a-z]{1,2}))*$/;

const normalizarCircuito = (s) => String(s).toUpperCase().replace(/\s|-/g, '').replace(/^0+(?=\d)/, '');

// texto → { circuito?, retornos[] } ou null (não é marcação de circuito)
function lerMarcacao(bruto) {
  const s = limparMtext(String(bruto || ''), { quebra: ' ' }).replace(/\s+/g, ' ').trim();
  if (!s || s.length > 6 || lerAltura(s)) return null;
  let m = RE_CIRCUITO_RETORNO.exec(s);
  if (m) return { circuito: normalizarCircuito(m[1]), retornos: [m[2]] };
  m = RE_CIRCUITO.exec(s);
  if (m) return { circuito: normalizarCircuito(m[1] || m[2] || m[3]), retornos: [] };
  if (RE_RETORNO.test(s)) return { circuito: null, retornos: s.split(/\s*[,;/]\s*/) };
  return null;
}

// pontos: os de aplicarMapa ({ x, y, simbolo, linha }); textos: [{ s, x, y }] no MESMO sistema
// (projetoDxf.textos com o fator da arquitetura). Anota em cada ponto `circuito_lido` e
// `retorno_lido` (sugestão) e devolve { lidos, porLinha: Map(linha → resumo) }.
function anotarCircuitos(pontos, textos, { raio = RAIO_PADRAO_M } = {}) {
  const alvo = (pontos || []).filter(p => RE_COM_CIRCUITO.test(p.simbolo || '') && Number.isFinite(p.x) && Number.isFinite(p.y));
  const porLinha = new Map();
  if (!alvo.length || !(textos || []).length) return { lidos: 0, porLinha };
  // grade de busca (células do tamanho do raio): desenho grande tem milhares de textos
  const chave = (x, y) => `${Math.floor(x / raio)}|${Math.floor(y / raio)}`;
  const grade = new Map();
  alvo.forEach((p, i) => { const k = chave(p.x, p.y); (grade.get(k) || grade.set(k, []).get(k)).push(i); });
  const marcas = alvo.map(() => ({ circuitos: new Set(), retornos: new Set(), textos: [] }));
  for (const t of textos) {
    if (!Number.isFinite(t?.x) || !Number.isFinite(t?.y)) continue;
    const m = lerMarcacao(t.s);
    if (!m) continue;
    const cx = Math.floor(t.x / raio), cy = Math.floor(t.y / raio);
    let melhor = -1, dMelhor = raio;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const i of grade.get(`${cx + dx}|${cy + dy}`) || []) {
        const d = Math.hypot(alvo[i].x - t.x, alvo[i].y - t.y);
        if (d <= dMelhor) { dMelhor = d; melhor = i; }
      }
    }
    if (melhor < 0) continue;
    if (m.circuito) marcas[melhor].circuitos.add(m.circuito);
    m.retornos.forEach(r => marcas[melhor].retornos.add(r));
    marcas[melhor].textos.push(String(t.s).slice(0, 20));
  }
  let lidos = 0;
  alvo.forEach((p, i) => {
    const mk = marcas[i];
    delete p.circuito_lido; delete p.retorno_lido;
    if (mk.circuitos.size === 1) { p.circuito_lido = [...mk.circuitos][0]; lidos++; }
    if (mk.retornos.size) p.retorno_lido = [...mk.retornos].sort().join(',');
    if (mk.circuitos.size > 1) p.circuito_conflito = [...mk.circuitos].sort();
    if (p.linha == null) return;
    const r = porLinha.get(p.linha) || porLinha.set(p.linha, { pontos: 0, com_circuito: 0, conflitos: 0, circuitos: {}, retornos: {} }).get(p.linha);
    r.pontos++;
    if (p.circuito_lido) { r.com_circuito++; r.circuitos[p.circuito_lido] = (r.circuitos[p.circuito_lido] || 0) + 1; }
    if (mk.circuitos.size > 1) r.conflitos++;
    for (const x of mk.retornos) r.retornos[x] = (r.retornos[x] || 0) + 1;
  });
  // linha sem nenhum texto lido não entra no resumo
  for (const [k, r] of porLinha) if (!r.com_circuito && !Object.keys(r.retornos).length && !r.conflitos) porLinha.delete(k);
  return { lidos, porLinha };
}

// Circuito do ponto para o modelo/3D: só o da linha CONFERIDA no Mapa do CAD (o resto é sugestão)
function circuitoConferido(p) {
  if (!p?.confirmado || !p.circuito_lido) return null;
  const retorno = String(p.retorno_lido || '').split(',')[0] || '';
  return { circuito: p.circuito_lido, retorno, comando: retorno ? `${p.circuito_lido}${retorno}` : '' };
}

module.exports = { anotarCircuitos, lerMarcacao, circuitoConferido, RAIO_PADRAO_M, RE_COM_CIRCUITO };
