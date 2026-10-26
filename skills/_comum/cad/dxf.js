// Desenho DXF (R2007 / AC1021 — abre no AutoCAD 2018+) no padrão H&M, para
// as skills gerarem plantas e detalhes. Camada fina sobre @tarikjabiri/dxf
// que corrige o que a biblioteca faz errado (pesquisa de 25/10/2026):
//   - addAttrib() grava um SEQEND depois de CADA atributo (DXF inválido com 2+);
//   - a rotação/escala da inserção não é aplicada à posição dos atributos;
//   - a cota sai sem o bloco de geometria (*D) — por isso aqui não há cota
//     associativa: medidas vão como texto.
// Unidade do desenho: metro (1 unidade = 1 m), como as plantas de arquitetura.
const {
  DxfWriter, point3d, point2d, Units, Attrib, SeqEnd, BlockFlags,
  HatchBoundaryPaths, HatchPolylineBoundary, vertex, pattern, HatchPredefinedPatterns,
  TextHorizontalAlignment, TextVerticalAlignment,
} = require('@tarikjabiri/dxf');
const { LAYERS, TIPOS_LINHA } = require('./padrao');

const rad = (g) => (g * Math.PI) / 180;

// `unidade`: 'mm' (padrão H&M das pranchas) ou 'm'. As coordenadas passadas
// aos métodos são SEMPRE em metros; com 'mm' tudo é multiplicado por 1000 e
// os blocos (desenhados em metros) entram com escala 1000.
// `escalaPlotagem`: 50 para 1:50 — define o $LTSCALE dos tracejados.
class DesenhoDxf {
  constructor({ layers = LAYERS, unidade = 'm', escalaPlotagem = 50 } = {}) {
    this.dxf = new DxfWriter();
    this.k = unidade === 'mm' ? 1000 : 1;
    this.dxf.setUnits(unidade === 'mm' ? Units.Millimeters : Units.Meters);
    this.dxf.setVariable('$LTSCALE', { 40: unidade === 'mm' ? escalaPlotagem : escalaPlotagem / 1000 });
    for (const [nome, t] of Object.entries(TIPOS_LINHA)) this.dxf.addLType(nome, t.descricao, t.elementos);
    this.layers = new Set();
    this.blocos = new Map(); // nome → { atributos: { TAG: {x, y, altura} } }
    for (const l of layers) this.camada(l.nome, l.cor, l.tipoLinha);
  }

  camada(nome, cor = 7, tipoLinha = 'CONTINUOUS') {
    if (this.layers.has(nome)) return nome;
    this.dxf.addLayer(nome, cor, tipoLinha);
    this.layers.add(nome);
    return nome;
  }

  // Define um bloco: `desenhar(b)` recebe o bloco da lib (addLine/addCircle/…
  // com coordenadas locais; use layerName '0' para herdar a layer da inserção).
  // `atributos`: [{ tag, x, y, altura, padrao }]
  bloco(nome, desenhar, atributos = []) {
    if (this.blocos.has(nome)) return nome;
    const b = this.dxf.addBlock(nome);
    if (atributos.length) b.flags = BlockFlags.HasNonConstantAttribute;
    desenhar(b);
    const mapa = {};
    for (const a of atributos) {
      b.addAttdef(point3d(a.x, a.y), a.altura, a.tag, a.padrao ?? '', { layerName: '0' });
      mapa[a.tag] = a;
    }
    this.blocos.set(nome, { atributos: mapa });
    return nome;
  }

  // Insere um bloco com atributos: um ATTRIB por tag e UM único SEQEND, com a
  // posição de cada atributo girada/escalada junto com o símbolo.
  inserir(nome, x0, y0, { layer = '0', rotacao = 0, escala: escala0 = 1, atributos = {} } = {}) {
    const def = this.blocos.get(nome);
    if (!def) throw new Error(`Bloco não definido: ${nome}`);
    const x = x0 * this.k, y = y0 * this.k, escala = escala0 * this.k;
    const opts = { layerName: layer, rotationAngle: rotacao };
    if (escala !== 1) Object.assign(opts, { scaleFactor: { x: escala, y: escala, z: escala } });
    const ins = this.dxf.addInsert(nome, point3d(x, y), opts);
    const tags = Object.entries(atributos).filter(([tag]) => def.atributos[tag]);
    if (!tags.length) return ins;
    ins.attributesFollowFlag = 1;
    const r = rad(rotacao);
    for (const [tag, valor] of tags) {
      const a = def.atributos[tag];
      const dx = a.x * escala, dy = a.y * escala;
      const px = x + dx * Math.cos(r) - dy * Math.sin(r);
      const py = y + dx * Math.sin(r) + dy * Math.cos(r);
      const at = this.dxf.modelSpace.addEntity(new Attrib(point3d(px, py), a.altura * escala, tag, String(valor ?? ''), { layerName: layer, rotation: rotacao }));
      at.ownerBlockRecord = ins.handle;
    }
    const s = this.dxf.modelSpace.addEntity(new SeqEnd());
    s.ownerBlockRecord = ins.handle;
    return ins;
  }

  linha(x1, y1, x2, y2, layer = '0') {
    const k = this.k;
    return this.dxf.addLine(point3d(x1 * k, y1 * k), point3d(x2 * k, y2 * k), { layerName: layer });
  }

  polilinha(pontos, { layer = '0', fechada = false } = {}) {
    const k = this.k;
    return this.dxf.addLWPolyline(pontos.map(([x, y]) => ({ point: point2d(x * k, y * k) })), { flags: fechada ? 1 : 0, layerName: layer });
  }

  circulo(x, y, raio, layer = '0') {
    const k = this.k;
    return this.dxf.addCircle(point3d(x * k, y * k), raio * k, { layerName: layer });
  }

  // Texto de uma linha; `alinhar`: 'esquerda' | 'centro' | 'direita'
  texto(x0, y0, altura, conteudo, { layer = '0', rotacao = 0, alinhar = 'esquerda' } = {}) {
    const x = x0 * this.k, y = y0 * this.k;
    const h = { esquerda: TextHorizontalAlignment.Left, centro: TextHorizontalAlignment.Center, direita: TextHorizontalAlignment.Right }[alinhar];
    const opts = { layerName: layer, rotation: rotacao };
    if (alinhar !== 'esquerda') Object.assign(opts, { horizontalAlignment: h, verticalAlignment: TextVerticalAlignment.Middle, secondAlignmentPoint: point3d(x, y) });
    return this.dxf.addText(point3d(x, y), altura * this.k, String(conteudo), opts);
  }

  hachuraSolida(pontos, layer = '0') {
    const contorno = new HatchPolylineBoundary();
    pontos.forEach(([x, y]) => contorno.add(vertex(x * this.k, y * this.k)));
    const caminhos = new HatchBoundaryPaths();
    caminhos.addPolylineBoundary(contorno);
    return this.dxf.addHatch(caminhos, pattern({ name: HatchPredefinedPatterns.SOLID }), { layerName: layer });
  }

  // Tabela simples (quantitativo, legenda) com linhas e textos
  tabela(x, y, colunas, linhas, { layer = '0', alturaTexto = 0.18, alturaLinha = 0.4 } = {}) {
    const largura = colunas.reduce((s, c) => s + c.largura, 0);
    const todas = [colunas.map(c => c.titulo), ...linhas];
    todas.forEach((lin, i) => {
      const yl = y - i * alturaLinha;
      this.linha(x, yl, x + largura, yl, layer);
      let xc = x;
      lin.forEach((cel, j) => {
        this.texto(xc + 0.08, yl - alturaLinha / 2, alturaTexto, cel ?? '', { layer });
        xc += colunas[j].largura;
      });
    });
    const yFim = y - todas.length * alturaLinha;
    this.linha(x, yFim, x + largura, yFim, layer);
    let xc = x;
    for (const c of [...colunas, null]) { this.linha(xc, y, xc, yFim, layer); if (c) xc += c.largura; }
    return { largura, altura: y - yFim };
  }

  toString() {
    return this.dxf.stringify();
  }
}

module.exports = { DesenhoDxf };
