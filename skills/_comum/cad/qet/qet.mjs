// qet.mjs — gerador de projetos QElectroTech (.qet) em Node puro, sem dependências.
//
// Formato alvo: QElectroTech 0.100 (versão estável usada pelos projetistas).
// Validado com o próprio QElectroTech: 0.100.0 (GUI) e 0.200.1 nightly (CLI headless
// --info / --export-pdf / --export-png). Ver LEIA-ME.txt ao lado.
//
// Regras que o QElectroTech impõe ao carregar (aprendidas do código-fonte e testadas):
//  1. O <terminal> de cada instância de elemento guarda o ponto de ENCAIXE no símbolo
//     (dock_elmt_), não o ponto do .elmt: é o ponto do .elmt deslocado 4 px para
//     dentro do símbolo (n: y+4, s: y-4, e: x-4, w: x+4). Se não casar exatamente
//     (x, y, orientação), a 0.100 NÃO liga o condutor; a 0.200 religa "por lugar" e avisa.
//  2. Condutor: element1/terminal1 = uuid da instância + uuid do borne no .elmt (formato
//     que a 0.100 grava). Sem uuid no .elmt, cai no id numérico do <terminal> da instância.
//  3. <segment> são opcionais. Sem eles o QET traça sozinho; com eles a soma dos
//     comprimentos tem de bater (±1 px) com a distância entre os pontos de conexão,
//     senão o QET descarta e traça automático. Segmentos começam no terminal1.
//  4. Textos dinâmicos: ao carregar, o QET APAGA os textos vindos do .elmt e recria só
//     os <dynamic_elmt_text> da instância — por isso copiamos os da definição.
//  5. Definições embutidas em <collection>/<category name="import">, referenciadas por
//     type="embed://import/<caminho>"; o projeto abre sem depender da coleção instalada.
//  6. Coordenadas: x/y do elemento = hotspot na cena; use múltiplos de 10 (grade do QET).
//     A folha começa em (0,0) com cabeçalho de 20 px (linha de letras/colunas).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ORIENT = { n: 0, e: 1, s: 2, w: 3 };
const ORIENT_LETRA = ['n', 'e', 's', 'w'];
const DOCK = [[0, 4], [-4, 0], [0, -4], [4, 0]]; // n, e, s, w → deslocamento até o encaixe
export const uuid = () => `{${crypto.randomUUID()}}`;
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
const escTexto = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
const lerAttrs = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
export const fonte = (tam = 9, familia = 'Liberation Sans', negrito = false) => `${familia},${tam},-1,5,${negrito ? 75 : 50},0,0,0,0,0,${negrito ? 'Bold' : 'Regular'}`;

// ---------------------------------------------------------------- definições (.elmt)
/**
 * Lê um .elmt (texto ou caminho). `caminho` é o caminho dentro da coleção oficial
 * (ex.: '10_electric/11_singlepole/.../disjonct-m.elmt'); vira o caminho embed://import/…
 */
export function lerElmt(arquivoOuXml, { caminho } = {}) {
  const ehXml = /^\s*(<\?xml|﻿|<definition)/.test(arquivoOuXml);
  const bruto = ehXml ? arquivoOuXml : fs.readFileSync(arquivoOuXml, 'utf8');
  const xml = bruto.replace(/^﻿/, '').replace(/<\?xml[^>]*\?>\s*/, '').trim();
  const def = lerAttrs((xml.match(/<definition\b([^>]*)>/) || [])[1] || '');
  if (def.type !== 'element') throw new Error(`não é um .elmt de elemento: ${caminho || arquivoOuXml}`);
  const terminais = [...xml.matchAll(/<terminal\b([^>]*?)\/?>/g)].map((m, i) => {
    const a = lerAttrs(m[1]);
    return { indice: i, x: Number(a.x), y: Number(a.y), orientation: ORIENT[a.orientation] ?? Number(a.orientation), name: a.name || '', uuid: a.uuid || null };
  });
  const textosDin = [...xml.matchAll(/<dynamic_text\b([^>]*)>([\s\S]*?)<\/dynamic_text>/g)].map((m) => {
    const a = lerAttrs(m[1]); delete a.z;
    return { attrs: a, text: (m[2].match(/<text>([\s\S]*?)<\/text>/) || [])[1] ?? '', info: (m[2].match(/<info_name>([^<]*)</) || [])[1] ?? null, composite: (m[2].match(/<composite_text>([\s\S]*?)<\/composite_text>/) || [])[1] ?? null };
  });
  const nome = (lang) => (xml.match(new RegExp(`<name lang="${lang}">([^<]*)<`)) || [])[1];
  const nomeArq = caminho ? path.basename(caminho) : (ehXml ? 'elemento.elmt' : path.basename(arquivoOuXml));
  return {
    caminho: (caminho || `hm/${nomeArq}`).replace(/\\/g, '/'), xml, terminais, textosDin,
    nome: nome('pt_BR') || nome('pt') || nome('en') || nomeArq, linkType: def.link_type || 'simple',
    largura: Number(def.width), altura: Number(def.height), hotspot: [Number(def.hotspot_x), Number(def.hotspot_y)],
  };
}

/** Lê um elemento da coleção oficial instalada (pasta "elements" do QET ou cópia dela). */
export function elmtDaColecao(raizColecao, caminho) {
  return lerElmt(path.join(raizColecao, caminho), { caminho });
}

/** Compara versões "0.100.0" x "0.90" como o QET (cada parte numérica; 0.90 < 0.100). */
export function cmpVersao(a, b) {
  const pa = String(a).split(/[.+-]/).map((x) => parseInt(x, 10) || 0), pb = String(b).split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
}

// ---------------------------------------------------------------- geometria
const girar = ([x, y], q) => { for (let i = 0; i < q; i++) [x, y] = [-y, x]; return [x, y]; }; // 90° horário (y para baixo)

// ---------------------------------------------------------------- projeto
export class ProjetoQet {
  /**
   * @param {object} o
   *   titulo, versao ('0.100.0'), cartouche {title, author, date(AAAAMMDD), plant, locmach, indexrev, filename, folio},
   *   propriedades {nome: valor} (variáveis %{nome} do cartouche), modeloCartouche (xml de <titleblocktemplate>) ou null,
   *   folha {cols, rows, colsize, rowsize}
   */
  constructor(o = {}) {
    this.titulo = o.titulo || 'Projeto';
    this.versao = o.versao || '0.100.0';
    this.cartouche = { author: '', date: '', plant: '', locmach: '', indexrev: '', filename: '', folio: '%id/%total', ...(o.cartouche || {}) };
    this.propriedades = o.propriedades || {};
    this.modeloCartouche = o.modeloCartouche || null; // { nome, xml }
    this.folha = { cols: 17, rows: 8, colsize: 60, rowsize: 80, ...(o.folha || {}) };
    this.folios = [];
    this.defs = new Map();
    this._idBorne = 0;
  }
  folio(o = {}) { const f = new Folio(this, o); this.folios.push(f); return f; }
  _registrarDef(def) { const ja = this.defs.get(def.caminho); if (ja && ja.xml !== def.xml) throw new Error(`duas definições diferentes em ${def.caminho}`); this.defs.set(def.caminho, def); }

  _inset(extra = {}) {
    const c = { ...this.cartouche, ...extra };
    const mod = this.modeloCartouche ? { titleblocktemplate: this.modeloCartouche.nome, titleblocktemplateCollection: 'embedded' } : {};
    return attrs({ title: c.title ?? '', author: c.author, date: c.date, plant: c.plant, locmach: c.locmach, indexrev: c.indexrev, filename: c.filename, folio: c.folio, auto_page_num: '', displayAt: 'bottom', version: '', ...mod });
  }
  _propsXml(props) {
    const p = { ...this.propriedades, ...(props || {}) };
    const ks = Object.keys(p);
    if (!ks.length) return '<properties/>';
    return `<properties>\n${ks.map((k) => `            <property show="1" name="${esc(k)}">${escTexto(p[k])}</property>`).join('\n')}\n        </properties>`;
  }

  toXml() {
    const fl = this.folha;
    const borda = attrs({ cols: fl.cols, colsize: fl.colsize, rows: fl.rows, rowsize: fl.rowsize, displaycols: 'true', displayrows: 'true' });
    const modelos = this.modeloCartouche ? `    <titleblocktemplates>\n${this.modeloCartouche.xml.trim()}\n    </titleblocktemplates>\n` : '';
    const folios = this.folios.map((f, i) => f._xml(i + 1)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<project ${attrs({ title: this.titulo, version: this.versao })}>
${modelos}    <properties/>
    <newdiagrams>
        <border ${borda}/>
        <inset ${this._inset({ title: '' })}/>
        <conductors ${attrs(PADRAO_CONDUTOR)}/>
        <report label="%f-%l%c"/>
        <xrefs/>
        <conductors_autonums freeze_new_conductors="false" current_autonum=""/>
        <folio_autonums/>
        <element_autonums freeze_new_elements="false" current_autonum=""/>
    </newdiagrams>
${folios}
${this._colecaoXml()}
</project>
`;
  }

  _colecaoXml() {
    // árvore de categorias a partir dos caminhos embed://import/a/b/c.elmt
    const raiz = { cats: new Map(), elms: [] };
    for (const def of this.defs.values()) {
      const partes = def.caminho.split('/'); const arq = partes.pop();
      let no = raiz; for (const p of partes) { if (!no.cats.has(p)) no.cats.set(p, { cats: new Map(), elms: [] }); no = no.cats.get(p); }
      no.elms.push([arq, def]);
    }
    const NOMES = { import: ['Elementos importados', 'Imported elements'] };
    const nomes = (n) => { const [pt, en] = NOMES[n] || [n, n]; return `<names><name lang="pt">${escTexto(pt)}</name><name lang="en">${escTexto(en)}</name></names>`; };
    const cat = (nome, no, ind) => `${ind}<category name="${esc(nome)}">\n${ind}    ${nomes(nome)}\n${[...no.cats].map(([n, f]) => cat(n, f, ind + '    ')).join('')}${no.elms.map(([a, d]) => `${ind}    <element name="${esc(a)}">\n${d.xml}\n${ind}    </element>\n`).join('')}${ind}</category>\n`;
    return `    <collection>\n${cat('import', raiz, '        ')}    </collection>`;
  }

  /** Verificação estrutural que emula as regras de carga do QElectroTech. Retorna lista de erros. */
  verificar(xml = this.toXml()) {
    const erros = [];
    erros.push(...verificarXmlBemFormado(xml));
    const { cols, colsize, rows, rowsize } = this.folha;
    const W = 20 + cols * colsize, H = 20 + rows * rowsize;
    // versão: a 0.100 avisa ("salvo com versão posterior") se o atributo for maior que 0.100.0
    if (cmpVersao(this.versao, '0.100.0') > 0) erros.push(`versão do projeto ${this.versao} > 0.100.0: a 0.100 abriria com aviso`);
    if (cmpVersao(this.versao, '0.6') <= 0) erros.push(`versão do projeto ${this.versao} <= 0.6: o QET avisa compatibilidade parcial`);
    for (const d of this.defs.values()) {
      const v = (d.xml.match(/<definition\b[^>]*\bversion="([^"]*)"/) || [])[1];
      if (v && cmpVersao(v, '0.100.0') > 0) erros.push(`definição ${d.caminho} é da versão ${v} (> 0.100.0): use a da coleção 0.100`);
    }
    for (const f of this.folios) for (const e of f.elementos) for (const o of e.links || []) if (!o.links?.includes(e)) erros.push(`vínculo de ${e.rotulo} não é recíproco`);
    for (const f of this.folios) {
      const ids = new Set();
      for (const e of f.elementos) {
        for (const b of e.bornes) {
          const d = e.def.terminais[b.indice];
          const [dx, dy] = DOCK[d.orientation];
          if (b.xi !== d.x + dx || b.yi !== d.y + dy) erros.push(`${f.titulo}: borne ${b.id} de ${e.rotulo} fora do encaixe`);
          if (ids.has(b.id)) erros.push(`id de borne duplicado ${b.id}`); ids.add(b.id);
        }
        if (e.x < 20 || e.y < 20 || e.x > W || e.y > H) erros.push(`${f.titulo}: ${e.rotulo || e.def.nome} fora da folha (${e.x},${e.y})`);
        if (e.x % 10 || e.y % 10) erros.push(`${f.titulo}: ${e.rotulo || e.def.nome} fora da grade de 10 px`);
      }
      for (const c of f.condutores) {
        if (!f.elementos.includes(c.b1.elemento) || !f.elementos.includes(c.b2.elemento)) erros.push(`${f.titulo}: condutor ${c.num} liga elemento de outro folio`);
        if (c.segmentos) {
          const [x1, y1] = c.b1.ponto(), [x2, y2] = c.b2.ponto();
          const sx = c.segmentos.filter((s) => s.h).reduce((a, s) => a + s.l, 0), sy = c.segmentos.filter((s) => !s.h).reduce((a, s) => a + s.l, 0);
          if (Math.abs(sx - (x2 - x1)) > 1 || Math.abs(sy - (y2 - y1)) > 1) erros.push(`${f.titulo}: segmentos do condutor ${c.num} não fecham (${sx},${sy}) ≠ (${x2 - x1},${y2 - y1})`);
        }
      }
    }
    return erros;
  }

  salvar(arquivo) {
    const xml = this.toXml();
    const erros = this.verificar(xml);
    if (erros.length) throw new Error('Projeto .qet inválido:\n - ' + erros.join('\n - '));
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, xml, 'utf8');
    return xml;
  }
}

// atributos de condutor no padrão gravado pela 0.100
export const PADRAO_CONDUTOR = {
  num: '_', formula: '', function: '', tension_protocol: '', conductor_color: '', conductor_section: '', cable: '', bus: '',
  type: 'multi', condsize: '1', 'dash-size': '1', color2: '#000000', bicolor: 'false', text_color: '#000000',
  displaytext: '1', onetextperfolio: '0', numsize: '9', horizrotatetext: '0', vertirotatetext: '270',
  'horizontal-alignment': 'AlignBottom', 'vertical-alignment': 'AlignRight',
};

// ---------------------------------------------------------------- folio
export class Folio {
  constructor(projeto, o) {
    this.projeto = projeto; this.titulo = o.titulo || `Folha ${projeto.folios.length + 1}`;
    this.cartouche = o.cartouche || {}; this.propriedades = o.propriedades || {};
    this.elementos = []; this.condutores = []; this.textos = []; this.formas = []; this.uuid = uuid();
  }

  /**
   * Coloca um elemento. o: { x, y, rotulo, orientacao (0..3 = 0/90/180/270° horário), infos {comment, description, ...},
   *   textos: textos dinâmicos extras [{texto|info, x, y, tam, rotacao, negrito}], posTextos {label: [x,y], ...}
   *   (reposiciona os textos da definição pelo info_name ou pelo índice), semTextosDef: true }
   */
  elemento(def, o) {
    this.projeto._registrarDef(def);
    const e = new Elemento(this, def, o);
    this.elementos.push(e);
    return e;
  }

  /**
   * Liga dois bornes. o: { num (texto exibido no condutor), secao (conductor_section), mostrarTexto,
   *   pontos: [[x,y],...] cantos intermediários (rota ortogonal explícita) | via: {y}|{x} atalho p/ rota em "Z",
   *   props: atributos extras (condsize, 'dash-size', type...) }
   */
  ligar(b1, b2, o = {}) {
    let segmentos = null;
    let pontos = o.pontos;
    if (!pontos && o.via) {
      const [x1, y1] = b1.ponto(), [x2, y2] = b2.ponto();
      pontos = 'y' in o.via ? [[x1, o.via.y], [x2, o.via.y]] : [[o.via.x, y1], [o.via.x, y2]];
    }
    if (pontos) {
      const pts = [b1.ponto(), ...pontos, b2.ponto()];
      segmentos = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
        if (dx && dy) throw new Error(`rota não ortogonal no condutor ${o.num || ''}: ${pts[i - 1]} → ${pts[i]}`);
        if (dx || dy) segmentos.push({ h: !!dx, l: dx || dy });
      }
    }
    const c = { b1, b2, num: o.num ?? '', secao: o.secao ?? '', mostrarTexto: o.mostrarTexto ?? !!o.num, segmentos, props: o.props || {}, uuid: uuid() };
    this.condutores.push(c);
    return c;
  }

  /** Texto livre (IndependentTextItem). x,y = canto superior esquerdo. Quebra de linha com \n. */
  texto(x, y, texto, o = {}) {
    this.textos.push({ x, y, texto, rotacao: o.rotacao || 0, fonte: o.fonte || fonte(o.tam || 9, undefined, o.negrito) });
  }
  /** Retângulo (ex.: contorno do quadro). estilo: SolidLine | DashLine | DotLine | DashDotLine */
  retangulo(x1, y1, x2, y2, o = {}) { this.formas.push({ tipo: 'Rectangle', x1, y1, x2, y2, estilo: o.estilo || 'DashLine', largura: o.largura || 1 }); }
  linha(x1, y1, x2, y2, o = {}) { this.formas.push({ tipo: 'Line', x1, y1, x2, y2, estilo: o.estilo || 'SolidLine', largura: o.largura || 1 }); }

  _xml(ordem) {
    const p = this.projeto, fl = p.folha;
    const inset = p._inset({ title: this.titulo, ...this.cartouche });
    const els = this.elementos.map((e) => e._xml()).join('\n');
    const conds = this.condutores.map((c) => condutorXml(c)).join('\n');
    const txts = this.textos.map((t) => `            <input ${attrs({ x: t.x, y: t.y, rotation: t.rotacao, font: t.fonte, text: t.texto.split('\n').map(escTexto).join('<br/>') })}/>`).join('\n');
    const formas = this.formas.map((s) => `            <shape ${attrs({ type: s.tipo, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, rx: 0, ry: 0, z: 0, is_movable: 1, closed: 0 })}>
                <pen color="#000000" style="${s.estilo}" widthF="${s.largura}"/>
                <brush color="#000000" style="NoBrush"/>
            </shape>`).join('\n');
    return `    <diagram ${attrs({ uuid: this.uuid, order: ordem })} ${inset} ${attrs({ cols: fl.cols, colsize: fl.colsize, rows: fl.rows, rowsize: fl.rowsize, height: fl.rows * fl.rowsize + 20, displaycols: 'true', displayrows: 'true', freezeNewElement: 'false', freezeNewConductor: 'false' })}>
        ${p._propsXml(this.propriedades)}
        <defaultconductor ${attrs(PADRAO_CONDUTOR)}/>
        <elements>
${els}
        </elements>
        <conductors>
${conds}
        </conductors>
${txts ? `        <inputs>\n${txts}\n        </inputs>` : '        <inputs/>'}
${formas ? `        <shapes>\n${formas}\n        </shapes>` : '        <shapes/>'}
    </diagram>`;
  }
}

function condutorXml(c) {
  const ponta = (n, b) => (b.def().uuid ? { [`element${n}`]: b.elemento.uuid, [`terminal${n}`]: b.def().uuid } : { [`terminal${n}`]: b.id });
  const a = { ...PADRAO_CONDUTOR, ...ponta(1, c.b1), ...ponta(2, c.b2), uuid: c.uuid, x: 0, y: 0, freezeLabel: 'false', num: c.num, conductor_section: c.secao, displaytext: c.mostrarTexto ? '1' : '0', ...c.props };
  const segs = (c.segmentos || []).map((s) => `                <segment orientation="${s.h ? 'horizontal' : 'vertical'}" length="${s.l}"/>`).join('\n');
  return `            <conductor ${attrs(a)}>\n${segs ? segs + '\n' : ''}                <sequentialNumbers/>\n            </conductor>`;
}

// ---------------------------------------------------------------- elemento
export class Elemento {
  constructor(folio, def, o) {
    this.folio = folio; this.def = def; this.x = o.x; this.y = o.y; this.rotulo = o.rotulo || '';
    this.orientacao = o.orientacao || 0; this.infos = { label: this.rotulo, ...(o.infos || {}) }; this.uuid = uuid();
    this.bornes = def.terminais.map((t) => {
      const [dx, dy] = DOCK[t.orientation];
      const b = { id: folio.projeto._idBorne++, indice: t.indice, xi: t.x + dx, yi: t.y + dy, elemento: this, def: () => t };
      b.ponto = () => { const [rx, ry] = girar([t.x, t.y], this.orientacao); return [this.x + rx, this.y + ry]; };
      b.orientacaoCena = () => ORIENT_LETRA[(t.orientation + this.orientacao) % 4];
      return b;
    });
    // textos dinâmicos: os da definição (com valores/posições ajustáveis) + extras
    const pos = o.posTextos || {}, val = o.valoresTextos || {};
    this.textos = o.semTextosDef ? [] : def.textosDin.map((t, i) => {
      const chave = t.info || i; const a = { ...t.attrs, uuid: uuid() };
      if (pos[chave]) [a.x, a.y] = pos[chave];
      if (pos[chave] === null) return null;
      return { attrs: a, text: val[chave] ?? (t.info === 'label' ? this.rotulo : t.text), info: t.info, composite: t.composite };
    }).filter(Boolean);
    for (const t of o.textos || []) {
      const a = { x: t.x, y: t.y, text_width: -1, Halignment: 'AlignLeft', Valignment: 'AlignTop', frame: 'false', rotation: t.rotacao || 0, keep_visual_rotation: 'false', text_from: t.info ? 'ElementInfo' : 'UserText', uuid: uuid(), font: fonte(t.tam || 9, undefined, t.negrito) };
      this.textos.push({ attrs: a, text: t.info ? (this.infos[t.info] ?? '') : t.texto, info: t.info || null });
    }
  }
  /** borne por nome ('OUT.2'), índice (0,1..) ou orientação na cena ('n','s','e','w'). */
  /** Vínculo entre elementos (renvoi de folio seta "vai"/"vem", mestre/escravo de bobina-contato):
   *  grava <links_uuids> nos DOIS lados, como o QET faz. */
  vincular(outro) { (this.links ||= []).push(outro); (outro.links ||= []).push(this); return this; }
  borne(sel) {
    let b;
    if (typeof sel === 'number') b = this.bornes[sel];
    else if (/^[nesw]$/.test(sel)) b = this.bornes.find((x) => x.orientacaoCena() === sel);
    else b = this.bornes.find((x) => x.def().name === sel);
    if (!b) throw new Error(`borne ${sel} não existe em ${this.def.caminho} (${this.def.terminais.map((t) => t.name || ORIENT_LETRA[t.orientation]).join(', ')})`);
    return b;
  }
  _xml() {
    const infos = Object.entries(this.infos).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `                    <elementInformation show="1" name="${esc(k)}">${escTexto(v)}</elementInformation>`).join('\n');
    const txts = this.textos.map((t) => `                    <dynamic_elmt_text ${attrs(t.attrs)}>
                        <text>${escTexto(t.text)}</text>${t.info ? `\n                        <info_name>${escTexto(t.info)}</info_name>` : ''}${t.composite != null ? `\n                        <composite_text>${t.composite}</composite_text>` : ''}
                    </dynamic_elmt_text>`).join('\n');
    return `            <element ${attrs({ uuid: this.uuid, type: `embed://import/${this.def.caminho}`, x: this.x, y: this.y, z: 10, orientation: this.orientacao, prefix: '', freezeLabel: 'false' })}>
                <terminals>
${this.bornes.map((b) => `                    <terminal ${attrs({ id: b.id, x: b.xi, y: b.yi, orientation: this.def.terminais[b.indice].orientation })}/>`).join('\n')}
                </terminals>
                <inputs/>${this.links?.length ? `\n                <links_uuids>\n${this.links.map((o) => `                    <link_uuid uuid="${o.uuid}"/>`).join('\n')}\n                </links_uuids>` : ''}
                <elementInformations>
${infos}
                </elementInformations>
                <dynamic_texts>
${txts}
                </dynamic_texts>
                <texts_groups/>
            </element>`;
  }
}

// ---------------------------------------------------------------- cartouche H&M (modelo embutido)
/** Modelo de cartouche embutido no projeto (titleblocktemplate). Campos: %title %author %date %plant
 *  %locmach %indexrev %filename %folio e variáveis próprias %{cliente} %{responsavel} %{crea} %{escala}. */
export function cartoucheHM(nome = 'hm-engenharia') {
  const campo = (row, col, valor, o = {}) => `        <field ${attrs({ name: o.nome || '', row, col, rowspan: o.rowspan, colspan: o.colspan, align: o.align || 'left', valign: 'center', hadjust: 'true', displaylabel: 'false', fontsize: o.fs || 8 })}>
            <value><translation lang="en">${escTexto(valor)}</translation></value>
            <label/>
        </field>`;
  const xml = `    <titleblocktemplate name="${nome}">
        <information>Cartouche H&amp;M Engenharia — gerado automaticamente</information>
        <logos/>
        <grid cols="t24%;r100%;t20%;t13%;" rows="17;17;17;">
${[
    campo(0, 0, 'H&M Engenharia', { fs: 11, nome: 'empresa' }),
    campo(1, 0, 'Resp. técnico: %{responsavel}', { fs: 7 }),
    campo(2, 0, '%{crea}', { fs: 7 }),
    campo(0, 1, '%title', { rowspan: 2, align: 'center', fs: 11, nome: 'title' }),
    campo(2, 1, 'Cliente: %{cliente}', { align: 'center', fs: 8 }),
    campo(0, 2, 'Obra: %plant', { fs: 7 }),
    campo(1, 2, 'Local: %locmach', { fs: 7 }),
    campo(2, 2, 'Arquivo: %filename', { fs: 7 }),
    campo(0, 3, 'Data: %date', { fs: 7 }),
    campo(1, 3, 'Rev.: %indexrev', { fs: 7 }),
    campo(2, 3, 'Folha: %folio', { fs: 8, nome: 'folio' }),
  ].join('\n')}
        </grid>
    </titleblocktemplate>`;
  return { nome, xml };
}

// ---------------------------------------------------------------- XML bem formado (sem dependências)
export function verificarXmlBemFormado(xml) {
  const erros = []; const pilha = [];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*"[^"]*")*)\s*(\/?)>|<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[0] === '<') { erros.push(`"<" solto ou tag malformada perto de: ${xml.slice(m.index, m.index + 60)}`); if (erros.length > 5) break; continue; }
    if (m[0][0] === '&') { erros.push(`"&" sem escape perto de: ${xml.slice(m.index, m.index + 40)}`); if (erros.length > 5) break; continue; }
    if (!m[2]) continue;
    if (m[1]) { const topo = pilha.pop(); if (topo !== m[2]) { erros.push(`</${m[2]}> fecha <${topo}>`); break; } }
    else if (!m[4]) pilha.push(m[2]);
    const nomes = [...(m[3] || '').matchAll(/([\w.:-]+)\s*=/g)].map((x) => x[1]);
    if (new Set(nomes).size !== nomes.length) erros.push(`atributo repetido em <${m[2]}>`);
  }
  if (pilha.length) erros.push(`tags não fechadas: ${pilha.join(' > ')}`);
  return erros;
}
