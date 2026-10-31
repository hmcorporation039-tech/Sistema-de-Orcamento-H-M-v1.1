// Posição dos itens da PORTA (vista frontal): placa de identificação, advertência,
// fecho, multimedidor de painel, IHM, botões/sinaleiros Ø 22 mm e grelhas de ventilação. Mesma regra
// para o desenho DXF e para o modelo 3D. Coordenadas em mm a partir do canto
// inferior esquerdo da frente do invólucro (x para a direita, y para cima);
// botões pelo centro (cx, cy) e diâmetro externo d.
function posicoesPorta(calc) {
  const H = calc.layout.involucro.altura, W = calc.layout.involucro.largura;
  const wPlaca = Math.min(160, W * 0.5);
  const itens = {
    placa: { x: (W - wPlaca) / 2, y: H - 70, l: wPlaca, a: 40, rotulo: calc.c.tag },
    aviso: { x: 40, y: H - 80, l: 40, a: 35 },
    fecho: { x: W - 50, y: H / 2 - 60, l: 22, a: 120 },
    ihm: null, medidores: [], botoes: [], grelhas: [],
  };
  let yP = H - 120;
  // instrumentos de painel (multimedidor 96 × 96 do catálogo, zona 'porta'): no alto, centrados, em recorte
  for (const k of calc.comps.lista.filter(x => x.zona === 'porta')) {
    itens.medidores.push({ x: (W - k.largura) / 2, y: yP - k.altura, l: k.largura, a: k.altura, p: k.prof, ref: k.ref, rotulo: k.ref, descricao: k.descricao, medida: k.medida });
    yP -= k.altura + 40;
  }
  if (calc.aut.ihm) {
    const l = calc.aut.ihm >= 10 ? 270 : calc.aut.ihm >= 7 ? 190 : 130;
    const a = calc.aut.ihm >= 10 ? 200 : calc.aut.ihm >= 7 ? 140 : 100;
    itens.ihm = { x: (W - l) / 2, y: yP - a, l, a, rotulo: `IHM ${calc.aut.ihm}"` };
    yP -= a + 40;
  }
  const lista = [];
  for (const pd of calc.aut.porta) for (let i = 0; i < pd.quantidade; i++) lista.push({ tipo: pd.tipo, cor: pd.cor, rotulo: (pd.funcao || pd.rotulo).slice(0, 18), descricao: pd.rotulo, d: pd.tipo === 'emergencia' ? 40 : 30 });
  const passo = 70;
  const porLinha = Math.max(1, Math.floor((W - 120 - (calc.term.ventilacao ? 170 : 0)) / passo));
  lista.forEach((b, i) => {
    const col = i % porLinha, lin = Math.floor(i / porLinha);
    itens.botoes.push({ ...b, cx: 60 + passo / 2 + col * passo, cy: yP - 30 - lin * 80 });
  });
  if (calc.term.ventilacao) {
    const g = 120;
    itens.grelhas.push({ x: W - 40 - g, y: 60, l: g, a: g, rotulo: 'ENTRADA DE AR (FILTRO)' });
    itens.grelhas.push({ x: W - 40 - g, y: H - 200 - g, l: g, a: g, rotulo: 'SAÍDA DE AR (VENTILADOR)' });
  }
  return itens;
}

module.exports = { posicoesPorta };
