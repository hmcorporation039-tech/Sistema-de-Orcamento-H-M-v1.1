// Diagrama UNIFILAR de quadro de distribuição (residencial/predial) em QElectroTech 0.100.
// Disjuntor geral → DPS (ao PE) + DR → barramento → N circuitos terminais
// (disjuntor + identificação + seção do cabo + carga). Símbolos da coleção oficial do QET.
// Mais de 6 circuitos: o barramento continua na folha seguinte por renvoi de folio (setas
// "vai"/"vem" vinculadas — o QET mostra a referência cruzada folha-linha-coluna sozinho).
//
// node unifilar-qd.mjs [saida.qet]            → exemplo de 6 circuitos (1 folha)
// node unifilar-qd.mjs saida.qet --predial    → 2 quadros, o segundo com 10 circuitos (3 folhas)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjetoQet, elmtDaColecao, cartoucheHM } from './qet.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// símbolos oficiais (caminho dentro da coleção "elements" do QElectroTech)
export const SIMBOLOS = {
  disjuntor: '10_electric/11_singlepole/200_fuses_protective_gears/11_circuit_breakers/disjonct-m.elmt',
  dr: '10_electric/11_singlepole/200_fuses_protective_gears/50_residual_current_circuit_breaker/int_diff1.elmt',
  dps: '10_electric/10_allpole/200_fuses_protective_gears/90_overvoltage_protections/parafoudre.elmt',
  terra: '10_electric/10_allpole/110_network_supplies/terre.elmt',
  iluminacao: '10_electric/10_allpole/380_signaling_operating/11_optical_signaling/lampe2.elmt',
  tomada: '10_electric/11_singlepole/500_home_installation/30_architectural/pc.elmt',
  motor: '10_electric/11_singlepole/500_home_installation/30_architectural/moteur.elmt',
  resistencia: '10_electric/10_allpole/391_consumers_actuators/50_heatings/resistance_chauffante.elmt',
  vem: '10_electric/10_allpole/100_folio_referencing/01coming_arrow.elmt',
  vai: '10_electric/10_allpole/100_folio_referencing/02going_arrow.elmt',
};
// tipo de circuito → símbolo de carga e rotação (resistência é horizontal no .elmt: gira 90°)
const CARGA = { iluminacao: ['iluminacao', 0], tomada: ['tomada', 0], chuveiro: ['resistencia', 1], aquecedor: ['resistencia', 1], ar: ['tomada', 0], tue: ['tomada', 0], motor: ['motor', 0] };
const POR_FOLHA = 6;

/**
 * Acrescenta ao projeto as folhas do unifilar de um quadro (cria o projeto se não vier).
 * `colecao` = pasta com os .elmt oficiais (mesma árvore da coleção do QET).
 */
export function gerarUnifilarQD(d, { colecao = path.join(aqui, 'elementos'), projeto } = {}) {
  const def = Object.fromEntries(Object.entries(SIMBOLOS).map(([k, c]) => [k, elmtDaColecao(colecao, c)]));
  const p = projeto || new ProjetoQet({
    titulo: `${d.obra} — diagramas unifilares`,
    cartouche: { author: d.responsavel, date: d.data, plant: d.obra, indexrev: d.rev, filename: d.arquivo },
    propriedades: { cliente: d.cliente, responsavel: d.responsavel, crea: d.crea },
    modeloCartouche: cartoucheHM(),
  });

  // ---- geometria (px da cena; grade de 10; folha útil x 20..1040, y 20..660)
  const X = 460;                 // espinha: disjuntor geral e DR
  const Y_GERAL = 130, Y_DR = 240, Y_BARRA = 340, Y_DISJ = 420, Y_CARGA = 560, PASSO = 120;
  const X0 = X - Math.round(((POR_FOLHA - 1) * PASSO) / 2 / 10) * 10; // 1º circuito
  const grupos = [];
  for (let i = 0; i < d.circuitos.length; i += POR_FOLHA) grupos.push(d.circuitos.slice(i, i + POR_FOLHA));
  let vemAnterior = null, saidaBarra = null;

  grupos.forEach((grupo, g) => {
    const cont = g > 0, temMais = g < grupos.length - 1;
    const f = p.folio({ titulo: `Diagrama unifilar — ${d.quadro}${grupos.length > 1 ? ` (${g + 1}/${grupos.length})` : ''}`, cartouche: { locmach: d.local } });
    const xs = grupo.map((_, i) => X0 + i * PASSO);
    const xFim = X0 + (POR_FOLHA - 1) * PASSO;

    f.texto(30, 26, `DIAGRAMA UNIFILAR — ${d.quadro}${cont ? ' (continuação)' : ''}`, { tam: 11, negrito: true });
    f.texto(30, 46, `${d.obra}${d.local ? ' — ' + d.local : ''}`, { tam: 8 });
    f.retangulo(X0 - (cont ? 100 : 60), 85, xFim + 100, Y_DISJ + 50, { estilo: 'DashLine' });
    f.texto(X0 - (cont ? 95 : 55), 88, d.quadro, { tam: 9, negrito: true });

    let fonte; // borne que alimenta o barramento nesta folha + como chegar nele
    if (!cont) {
      f.texto(X + 12, 52, `Entrada: ${d.alimentacao.texto}\nAlimentador: ${d.alimentacao.secao}`, { tam: 8 });
      const geral = f.elemento(def.disjuntor, { x: X, y: Y_GERAL, rotulo: '-Q0', infos: { comment: d.geral.descricao }, textos: [{ texto: d.geral.descricao, x: 6, y: -5, tam: 8 }] });
      // DR geral opcional (H&M): sem ele, o disjuntor geral alimenta direto o
      // barramento e o DR aparece em cada circuito que o exige (NBR 5410 5.1.3.2.2)
      const dr = d.dr ? f.elemento(def.dr, { x: X, y: Y_DR, rotulo: '-F1', posTextos: { 1: null }, textos: [{ texto: `DR ${d.dr.corrente}`, x: 6, y: -3, tam: 8 }, { texto: `IΔn ${d.dr.sensibilidade}`, x: 6, y: 9, tam: 8 }] }) : null;
      const X_DPS = Math.round((X0 + PASSO * 1.5) / 10) * 10; // entre 2º e 3º circuitos, acima da barra
      const dps = f.elemento(def.dps, { x: X_DPS, y: Y_DR, rotulo: '-F2', textos: d.dps.descricao.split('\n').map((t, i) => ({ texto: (i ? '' : 'DPS ') + t, x: 8, y: 3 + i * 11, tam: 7 })) });
      const pe = f.elemento(def.terra, { x: X_DPS, y: Y_DR + 60, posTextos: { label: null }, textos: [{ texto: 'PE', x: 10, y: -4, tam: 8 }] });
      if (dr) f.ligar(geral.borne('s'), dr.borne('n'), { num: d.alimentacao.secaoCurta || '' });
      f.ligar(geral.borne('s'), dps.borne('n'), { via: { y: Y_GERAL + 50 }, num: d.dps.secao });
      f.ligar(dps.borne('s'), pe.borne('n'));
      fonte = { b: (dr || geral).borne('s'), rota: (x) => ({ via: { y: Y_BARRA } }) };
      if (d.notas?.length) f.texto(xFim + 110, 100, d.notas.join('\n'), { tam: 7 });
    } else {
      // seta "vem da folha anterior" no início do barramento, vinculada à seta "vai"
      // (a referência cruzada "folha-linha-coluna" sai no texto label da seta; afastado para não cobrir a seta)
      const vem = f.elemento(def.vem, { x: X0 - 30, y: Y_BARRA, rotulo: '', posTextos: { label: [-48, -11.5] } });
      vem.vincular(vemAnterior);
      const bv = vem.borne('e');
      fonte = { b: bv, rota: (x) => ({ pontos: [[x, Y_BARRA]] }) };
    }
    f.texto(X0 + 6, Y_BARRA - 16, cont ? 'Barramento F/N (continuação)' : 'Barramento F/N', { tam: 7 });

    grupo.forEach((c, i) => {
      const x = xs[i];
      const q = f.elemento(def.disjuntor, {
        x, y: Y_DISJ, rotulo: `-Q${c.id}`, infos: { comment: c.disjuntor },
        textos: [{ texto: c.disjuntor, x: 6, y: -5, tam: 8 }, ...(c.dr ? [{ texto: `+ DR ${c.dr}`, x: 6, y: 7, tam: 7 }] : [])],
      });
      f.ligar(fonte.b, q.borne('n'), { ...fonte.rota(x), props: { condsize: '2' } });
      const [tipoSimb, rot] = CARGA[c.tipo] || CARGA.tue;
      const carga = f.elemento(def[tipoSimb], {
        x, y: Y_CARGA, rotulo: `-E${c.id}`, orientacao: rot, posTextos: { label: null }, infos: { description: c.descricao },
        textos: [
          { texto: `Circuito ${c.id}`, x: -50, y: 26, tam: 8, negrito: true },
          { texto: c.descricao, x: -50, y: 40, tam: 7 },
          { texto: c.carga, x: -50, y: 52, tam: 8 },
        ].map((t) => (rot ? { ...t, ...girarTexto(t, rot) } : t)),
      });
      f.ligar(q.borne('s'), carga.borne('n'), { num: c.secao, secao: c.secao.replace(/\s*mm².*/, '') });
    });

    if (temMais) {
      // barramento segue: seta "vai para a folha seguinte" na ponta direita
      const vai = f.elemento(def.vai, { x: xFim + 70, y: Y_BARRA, rotulo: '' });
      const bv = vai.borne('w');
      f.ligar(fonte.b, bv, cont ? { props: { condsize: '2' } } : { via: { y: Y_BARRA }, props: { condsize: '2' } });
      vemAnterior = vai;
    }
  });
  return p;
}
// posição de texto dinâmico numa carga girada: o texto é filho do elemento e gira junto;
// desfazemos a rotação da posição e giramos o texto ao contrário para ele continuar horizontal.
function girarTexto(t, q) {
  let [x, y] = [t.x, t.y];
  for (let i = 0; i < q; i++) [x, y] = [y, -x];
  return { x, y, rotacao: -90 * q };
}

const NOTAS = ['NOTAS', '1. Condutores de cobre, isolação', '    PVC 70 °C, seções em mm².', '2. DR 30 mA (NBR 5410, 5.1.3.2.2).', '3. DPS classe II entre fase e PE,', '    condutor de 4 mm² (NBR 5410).', '4. Neutro e PE com a mesma seção', '    da fase de cada circuito.'];
export const EXEMPLO = {
  quadro: 'QD-01', obra: 'Residência Exemplo', cliente: 'Cliente Exemplo', local: 'Área de serviço', data: '20261025', rev: 'A',
  responsavel: 'Eng. Responsável', crea: 'CREA 000000/D', arquivo: 'unifilar-qd01',
  alimentacao: { texto: '2F+N+PE — 127/220 V — 60 Hz', secao: '3 × 10 mm² + PE 10 mm² (Cu/PVC)', secaoCurta: '10 mm²' },
  geral: { descricao: '50 A — 2P' },
  dr: { corrente: '63 A — 2P', sensibilidade: '30 mA' },
  dps: { descricao: 'classe II\n275 V — 20 kA', secao: '4 mm²' },
  circuitos: [
    { id: 1, tipo: 'iluminacao', descricao: 'Iluminação social', disjuntor: '10 A — 1P', secao: '1,5 mm²', carga: '900 W' },
    { id: 2, tipo: 'iluminacao', descricao: 'Iluminação serviço', disjuntor: '10 A — 1P', secao: '1,5 mm²', carga: '600 W' },
    { id: 3, tipo: 'tomada', descricao: 'TUG sala/quartos', disjuntor: '20 A — 1P', secao: '2,5 mm²', carga: '1.800 VA' },
    { id: 4, tipo: 'tomada', descricao: 'TUG cozinha/serviço', disjuntor: '20 A — 1P', secao: '2,5 mm²', carga: '2.400 VA' },
    { id: 5, tipo: 'chuveiro', descricao: 'TUE chuveiro', disjuntor: '40 A — 2P', secao: '6 mm²', carga: '5.500 W' },
    { id: 6, tipo: 'ar', descricao: 'TUE ar-condicionado', disjuntor: '16 A — 2P', secao: '2,5 mm²', carga: '1.400 W' },
  ],
  notas: NOTAS,
};
// quadro de área comum de prédio, 10 circuitos → 2 folhas ligadas por renvoi
export const EXEMPLO_QDC = {
  ...EXEMPLO, quadro: 'QDC — Área comum', local: 'Térreo — hall', arquivo: 'unifilar-predial',
  alimentacao: { texto: '3F+N+PE — 127/220 V — 60 Hz', secao: '4 × 16 mm² + PE 16 mm² (Cu/PVC)', secaoCurta: '16 mm²' },
  geral: { descricao: '63 A — 3P' }, dr: { corrente: '80 A — 4P', sensibilidade: '30 mA' },
  circuitos: Array.from({ length: 10 }, (_, i) => {
    const t = [['iluminacao', 'Ilum. hall/escadas', '10 A — 1P', '1,5 mm²', '1.200 W'], ['iluminacao', 'Ilum. garagem', '10 A — 1P', '1,5 mm²', '1.500 W'], ['tomada', 'TUG hall/portaria', '20 A — 1P', '2,5 mm²', '1.200 VA'], ['tue', 'Bomba recalque', '20 A — 3P', '2,5 mm²', '2.200 W'], ['tue', 'Portão automático', '16 A — 1P', '2,5 mm²', '600 W']][i % 5];
    return { id: i + 1, tipo: t[0], descricao: t[1] + (i >= 5 ? ' B' : ''), disjuntor: t[2], secao: t[3], carga: t[4] };
  }),
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const predial = process.argv.includes('--predial');
  const saida = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(aqui, '..', 'saida', predial ? 'predial' : 'unifilar', predial ? 'unifilar-predial.qet' : 'unifilar-qd01.qet');
  const p = gerarUnifilarQD(predial ? { ...EXEMPLO, arquivo: 'unifilar-predial' } : EXEMPLO);
  if (predial) gerarUnifilarQD(EXEMPLO_QDC, { projeto: p });
  p.salvar(saida);
  console.log('Gerado:', saida, `(${p.folios.length} folha(s))`);
}
