// Classificação das páginas de um PDF vetorial (planta × diagrama unifilar ×
// quadro de cargas × legenda…) pelo classificador comum
// (skills/_comum/cad/classificarPrancha.js). Aqui só se traduz a página lida por
// utils/pdfVetorial.js (`lerPagina`, opção `geometria`) para a "folha" neutra:
// traços viram segmentos, curvas que são arco viram arco (porta), e a escala
// do carimbo dá o tamanho real da porta e da parede.
// Quem usa: a conversão PDF → DXF do 3D (services/pdfParaDxf.js: escolhe a
// página e recorta só a planta) e a análise de projeto (utils/pdfVetorial.js:
// não conta símbolo no unifilar nem na vista do quadro).
const path = require('path');
const { CAD } = require('../config/caminhos');
const { classificarFolha, regioesParaManter, descreverFolha, ROTULO } = require(path.join(CAD, 'classificarPrancha.js'));
const { PT_EM_M, arcoDaCurva, juntarArco, varredura, juntarTextos } = require('./desenhoPdf');

// sem escala no carimbo: porta e parede medidas como se a planta estivesse
// entre 1:50 e 1:100 (as escalas de planta baixa); o símbolo de disjuntor do
// unifilar (arco de 1–2 mm no papel) fica abaixo disso
const ESCALA_MIN = 50, ESCALA_MAX = 100;

// página lida (geometria) → folha do classificador. `escala`: denominador (50 = 1:50)
function folhaDoPdf(geo, { escala = null } = {}) {
  const segmentos = [], arcos = [];
  for (const c of geo.caminhos) {
    if (!c.subs) continue;
    for (const s of c.subs) {
      const juntos = [];
      for (const seg of s.segs) {
        if (seg[0] === 'l') { segmentos.push({ a: seg[1], b: seg[2] }); continue; }
        const a = c.traco && arcoDaCurva(...seg.slice(1));
        if (a) juntarArco(juntos, a);
        else segmentos.push({ a: seg[1], b: seg[4] }); // curva qualquer: a corda basta para os blocos
      }
      // o arco entra nos blocos pela corda (classificarFolha marca a→b na grade)
      for (const a of juntos) arcos.push({ centro: a.centro, r: a.r, varredura: varredura(a), a: a.p0, b: a.p3 });
    }
  }
  const mpu = escala ? PT_EM_M * escala : null;
  const faixa = (m0, m1) => (mpu ? [m0 / mpu, m1 / mpu] : [m0 / (PT_EM_M * ESCALA_MAX), m1 / (PT_EM_M * ESCALA_MIN)]);
  return {
    caixa: [0, 0, geo.largura, geo.altura], yParaBaixo: true, molduraNaBorda: true,
    textos: juntarTextos(geo.textos).map(t => ({ s: t.s, x: t.x, y: t.y, h: t.h, w: t.w })),
    segmentos,
    arcos, metrosPorUnidade: mpu, raioPorta: faixa(0.55, 1.25), espessuraParede: faixa(0.07, 0.4),
  };
}

// página lida (geometria) → classificação (ver classificarFolha). A escala vem do
// carimbo da própria página (`escalaDoCarimbo`), se quem chama não informar.
function classificarPaginaPdf(geo, { escala = null } = {}) {
  const esc = escala || require('./pdfVetorial').escalaDoCarimbo(geo.textos);
  return classificarFolha(folhaDoPdf(geo, { escala: esc }));
}

module.exports = { classificarPaginaPdf, folhaDoPdf, regioesParaManter, descreverFolha, ROTULO };
