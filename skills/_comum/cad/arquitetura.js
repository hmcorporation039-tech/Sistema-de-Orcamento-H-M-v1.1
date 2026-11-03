// Leitura de planta de ARQUITETURA em DXF (o DWG é convertido antes — ver
// ./dwg.js). Devolve os ambientes (nome, área, perímetro, polígono), as portas
// (dobradiça, batente, largura, para que ambiente abrem) e a geometria de
// referência para ser redesenhada em cinza sob o projeto.
//
// Ambientes, em duas etapas:
//   1) polilinha fechada que contém o texto do nome (o arquiteto desenhou a
//      polilinha de área — heurística dos softwares comerciais);
//   2) para os nomes que sobram, a sala é achada pelas PAREDES: as linhas são
//      rasterizadas (5 cm), o vão de cada porta detectada é fechado e a região é
//      preenchida a partir do texto. Região que vaza para fora é descartada.
// Layers de arquitetura variam por escritório: nenhuma é obrigatória
// (`opcoes.layersAmbiente`, regex, restringe a etapa 1).
const { Helper } = require('dxf');
const { classificarFolha, NAO_PLANTA, RE_NOME_SALA } = require('./classificarPrancha');
const { ehLayerDeInstalacao } = require('./disciplinasCad');
const { limparMtext } = require('./textoCad');

// $INSUNITS → fator para metros (0 = sem unidade: decide pelas portas/tamanho)
const FATOR = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 };

const areaPoligono = (p) => Math.abs(areaComSinal(p));
const areaComSinal = (p) => p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0) / 2;
const perimetro = (p) => p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + Math.hypot(x2 - x, y2 - y); }, 0);
function dentro([x, y], p) {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function centroide(p) {
  let a = 0, cx = 0, cy = 0;
  p.forEach(([x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; const f = x * y2 - x2 * y; a += f; cx += (x + x2) * f; cy += (y + y2) * f; });
  if (Math.abs(a) < 1e-9) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  return [cx / (3 * a), cy / (3 * a)];
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
function distanciaContorno(p, pol) {
  let d = Infinity;
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i], b = pol[(i + 1) % pol.length];
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const L2 = vx * vx + vy * vy || 1e-12;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2));
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy));
  }
  return d;
}

// ── Textos ───────────────────────────────────────────────────────────────
// O que NÃO é nome de ambiente: área, cotas, níveis, dimensões de esquadria
// (".60x1.67", "P1", "J2"), GUIDs de exportação, acabamentos, setas de escada
const RE_NAO_NOME = new RegExp([
  /^(A\s*=|[ÁA]REA\s*[:=])/, /^[\d.,]+\s*(m²|m2|m)?$/, /^[+\-]?\d+[.,]\d+$/, /^[\d.,]+\s*=/, /^N\.?\s?A\.?\b|^N[ÍI]VEL\b|^NIV\b/,
  /^(PD|H|I)\s*[=:]/, /^\d+\s*(ALUNOS|PESSOAS|LUGARES)$/, /^\.?\d+[.,]?\d*\s*[xX×]\s*\.?\d/, /^(P|J|PJ|PG|PV|PM|PC|PT|V|C|E)\s*-?\s*\d+[A-Z]?$/,
  /^\{?[0-9A-F]{8}-[0-9A-F]{4}-/, /^(PISO|FORRO|PAREDE|RODAP[ÉE]|SOLEIRA|PEITORIL|CER[ÂA]MICA|PORCELANATO|REVESTIMENTO|PINTURA)\b/,
  /^(SOBE|DESCE|S|D)$/, /^(ESC|ESCALA)\b/, /^(PLANTA|CORTE|FACHADA|DETALHE|PRANCHA|FOLHA|LEGENDA|NOTAS?|OBS)\b/, /^[\W_]+$/,
  // metadados de exportação Revit/IFC e nomes de família de mobiliário
  /^(?=\S*\d)[A-Za-z0-9$_]{16,}$/, /\b(chair|table|desk|sofa|bed|cabinet|shelf|lamp|plant|mod\. ref)\b/,
  // vocabulário de quadro/diagrama elétrico: a etiqueta "QD-Térreo" ou o "DISJUNTOR 40A"
  // dentro de uma célula de tabela virava "ambiente" (29/10/2026)
  /^(QGBT|QDC|QDL|QDF|QDG|QDFL|QD|QL|QF|QM|CCM)\b[\s\-_.]*[\wÀ-ú\-.]*$/, /^(DISJ|DR\b|IDR\b|DPS\b|FASES?\b|NEUTRO\b|BARRAMENTO|CIRCUITO|CIRC\.|C\d{1,3}$|TUG\b|TUE\b)/,
  // (?!\w) e não \b: depois de "²" não há fronteira de palavra ("70mm²" passava)
  /\b\d+(?:[.,]\d+)?\s*(kA|kVA|kW|mm²|mm2)(?!\w)/, /^\d+\s*A$/, /^\d+\s*[xX#]\s*\d+(?:[.,]\d+)?\s*mm/,
  // etiqueta de ponto na planta elétrica ("IL 1", "TM", "TUG 3"), bitola de eletroduto
  // ("2xø3/4\"") e cabeçalho de tabela ("Tipo de carga") também não são sala
  /^(IL|TM|TH|TE|TUG|TUE)\b/, /[øØ]|%%c/, /^(TIPO DE CARGA|DESCRI[ÇC][ÃA]O|POT[ÊE]NCIA|QUANT|QTD)\b/,
  // valor com unidade de equipamento ("150Ah, 1990kg", "24 Vdc", "24ac/26dc"), bitola em
  // polegada ('AAG 3"') e texto de modelo ("LABEL AREA") — desenhos reais da CCN
  /\d\s*(Ah|kg|V\s?[ad]c|Vc[ac]|ac|dc|Hz|rpm|cv|hp)\b/, /\d\s*("|''|pol\b)/, /^LABEL\b/,
  // nota de instalação ("Tomada de espelho altura: 97,5 cm" — Arena)
  /\baltura\s*[:=]|\d\s*cm\b/,
  // nota e contagem dentro da planta, não nome de sala (DWG real, 29/10/2026): "(Segue p/ …)",
  // "*ÁREA DISPONÍVEL", "6 LEITOS", "21 DEGRAUS", "RESERVA LEGAL: 20%", "30A-30mA",
  // "PD SOB VIGA= 1,85m", "TOTAL VAGAS…", etiqueta de quadro "213-QLTF-VEST"
  /^[(*\-–]/, /%/, /^\d+\s+(LEITOS?|ESTA[ÇC][ÕO]ES|DEGRAUS|VAGAS?|MESAS|CADEIRAS|POSI[ÇC][ÕO]ES|ASSENTOS|POLTRONAS|LUGARES|UNIDADES)\b/, /\d\s*mA\b/,
  /=\s*[\d.,]+\s*m\b/, /^TOTAL\b/, /(^|[-_ ])(QGBT|QD[A-Z]{0,4}|QL[A-Z]{0,4}|QF[A-Z]{0,4}|CCM)([-_ ]|$)/,
].map(r => r.source).join('|'), 'i');
// sigla curta que é sala; fora delas, 1–3 letras sozinhas ("ST", "DI", "ALC") são código
const RE_SIGLA_SALA = /^(WC|BWC|DML|CPD|ADM|LAV|COZ|QTO|SL|DEP|ALM|GAR|CME|UTI|RX|PS|HALL|LOJA|BAR|SPA)$/i;
// o limpador de MTEXT é o mesmo do projeto (./textoCad.js): a cópia daqui apagava o texto
// entre "\L" e o próximo ";" (CAD-01/CAD-11, 02/11/2026); o nome da sala fica numa linha só
const limparTexto = (s) => limparMtext(s, { quebra: ' ' }).replace(/\s+/g, ' ').trim();
// "AUDITÓRIO ÁREA = 108m²" → "AUDITÓRIO"
const nomeLimpo = (s) => s.replace(/\s*[ÁA]REA\s*[:=].*$/i, '').replace(/\s*[\d.,]+\s*m[²2]\s*$/i, '').replace(/[\s:;,.\-–]+$/, '').replace(/\s+/g, ' ').trim();
// Etiqueta de equipamento ("CAM-04", "FOG5", "DET 3", "AM-01"): em planta sem nome de
// ambiente ela virava sala (limite anotado em 29/10/2026). Código curto (letras +
// número) só é nome se as letras forem de cômodo ("SALA 01", "BWC 2", "APTO 101");
// texto em layer de instalação (CFTV, incêndio, elétrica…) idem.
const RE_CODIGO = /^([A-Za-zÀ-ú]{1,5})\.?\s*[-–.]?\s*\d{1,4}[A-Za-z]?$/;
const RE_SIGLA_COMODO = /^(APTO?|AP|SL|QTO|QT|WC|BWC|UNID|CASA|LEITO|ENF|CONS|ESC|LAB|BOX)$/i;
const RE_LAYER_INSTALACAO = /CFTV|C[ÂA]MERA|INC[ÊE]ND|ALARM|DETEC|SPDA|EL[ÉE]TR|ELE[-_ ]|^E[-_]|ILUM|LUMIN|TOMAD|DADOS|REDE|L[ÓO]GIC|TELEF|INTERF|SONORIZ|AUTOMA|HIDR|SANIT|ESGOT|PLUV|G[ÁA]S|CLIMA|HVAC|AR[-_ .]?COND|MOBILI|EQUIP/i;
const ehCodigoDeEquipamento = (t) => {
  const m = RE_CODIGO.exec(t.s);
  if (m) return !(RE_NOME_SALA.test(m[1]) || RE_SIGLA_COMODO.test(m[1]));
  return (RE_LAYER_INSTALACAO.test(t.layer || '') || ehLayerDeInstalacao(t.layer)) && !RE_NOME_SALA.test(t.s);
};
// atributo de bloco de equipamento (TAG "AP-01", DESCR "Detector de fumaça… - nave",
// ALTURA "teto") não é nome de sala — viravam ambientes no DXF real (29/10/2026)
const RE_TAG_EQUIPAMENTO = /^(TAG|ID|IDENT|DESCR?|DESCRI|ALTURA|ALT|H|TIPO|MODELO|EQUIP|CIRC|POT|FAB|COD|REF|QTD|LACO|ENDERE|ZONA|CAM|PONTO|MONTAGEM|INSTALA|OBS)/i;
const ehAtributoDeEquipamento = (t) => !!t.tag && RE_TAG_EQUIPAMENTO.test(t.tag);
// CamelCase de parâmetro exportado ("ApplicableOccurrence") — teste sensível a maiúsculas
const ehTextoDeSala = (t) => t.s.length >= 2 && t.s.length <= 60 && !RE_NAO_NOME.test(t.s) && !/^[A-Z][a-z]+([A-Z][a-z]+){1,}$/.test(t.s) && /[A-Za-zÀ-ú]{2}/.test(t.s);
const ehSiglaSolta = (s) => /^[A-ZÀ-Ú]{1,3}$/.test(s) && !RE_SIGLA_SALA.test(s) && !RE_SIGLA_COMODO.test(s);
const ehNome = (t) => ehTextoDeSala(t) && !ehSiglaSolta(t.s) && !ehCodigoDeEquipamento(t) && !ehAtributoDeEquipamento(t);
// entre vários textos dentro do ambiente: o de letra maior; empate → o mais longo.
// A etiqueta de equipamento ajuda a achar a sala (está dentro dela), mas não dá
// o nome: sala só com etiquetas sai sem nome (vira "Ambiente N" no fim).
const escolherNome = (ts) => {
  const reais = ts.filter(t => !t.etiqueta);
  return reais.length ? nomeLimpo([...reais].sort((a, b) => (b.h - a.h) || (b.s.length - a.s.length))[0].s) : null;
};

// ── Blocos ───────────────────────────────────────────────────────────────
// Explosão própria dos blocos (a da lib `dxf` troca a layer de tudo pela do
// INSERT e não desconta o ponto-base nos textos). Regra do AutoCAD: entidade
// na layer "0" herda a layer do INSERT. Transformações em e.transforms, da mais
// interna à externa.
// Fora da planta (29/10/2026): o espaço do papel (layouts, com a folha, o
// carimbo e as viewports) e as layers/blocos de diagrama, quadro, legenda,
// carimbo e detalhe — o 3D "construía uma edificação" com o unifilar.
// Layer "DETALHE" NÃO sai inteira: muito escritório põe nela partes da própria
// planta (bancadas, esquadrias); o desenho de detalhe AO LADO da planta sai pela
// classificação da região (título "DETALHE"), em lerArquitetura.
const RE_LAYER_FORA_PLANTA = /UNIFILAR|TRIFILAR|MULTIFILAR|DIAGRAMA|ESQUEMA|QUADRO.?DE.?CARGA|TABELA|PLANILHA|LEGENDA|CARIMBO|\bSELO|MOLDURA|MARGEM|VIEWPORT|\bVPORT/i;
const RE_LAYER_MOLDURA = /MOLDURA|MARGEM/i;
const RE_BLOCO_FORA_PLANTA = /UNIFILAR|TRIFILAR|DIAGRAMA|ESQUEMA|QUADRO.?DE.?CARGA|LEGENDA|CARIMBO|\bSELO|MOLDURA|FOLHA.?A[0-4]\b|^A[0-4]$|DETALHE/i;
function explodir(parsed) {
  const blocos = new Map((parsed.blocks || []).map(b => [b.name, b]));
  const out = [];
  // a moldura da folha não entra no desenho, mas diz onde está cada prancha (./pranchas.js)
  out.molduras = [];
  out.textosFora = [];
  // DWG convertido de PDF às vezes traz tudo no espaço do papel: aí ele é o desenho
  const temModelo = (parsed.entities || []).some(e => !e.paperSpace);
  const visitar = (ents, transforms, layerPai, prof) => {
    for (const e of ents) {
      if (prof === 0 && e.paperSpace && temModelo) continue;
      const layer = layerPai && (!e.layer || e.layer === '0') ? layerPai : e.layer;
      if (RE_LAYER_FORA_PLANTA.test(layer || '')) {
        if (RE_LAYER_MOLDURA.test(layer || '') && (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices?.length >= 4 && e.vertices.length <= 5) out.molduras.push({ pts: transformar(e.vertices.map(v => [v.x, v.y]), transforms), layer });
        // o texto da legenda (layer de tabela) diz a altura de cada símbolo: ./pontosDoDesenho.js
        else if (e.type === 'TEXT' || e.type === 'MTEXT') out.textosFora.push({ ...e, layer, transforms });
        continue;
      }
      if (e.type !== 'INSERT') { out.push({ ...e, layer, transforms }); continue; }
      const b = blocos.get(e.block);
      if (!b || prof > 12 || RE_BLOCO_FORA_PLANTA.test(e.block || '')) continue;
      const nl = Math.max(1, e.rowCount || 1), nc = Math.max(1, e.columnCount || 1);
      const rot = ((e.rotation || 0) * Math.PI) / 180;
      for (let r = 0; r < nl; r++) {
        for (let c = 0; c < nc; c++) {
          // arranjo retangular: afetado pela rotação, não pela escala
          const dx = -Math.sin(rot) * (e.rowSpacing || 0) * r + Math.cos(rot) * (e.columnSpacing || 0) * c;
          const dy = Math.cos(rot) * (e.rowSpacing || 0) * r + Math.sin(rot) * (e.columnSpacing || 0) * c;
          const t = { x: (e.x || 0) + dx, y: (e.y || 0) + dy, scaleX: e.scaleX, scaleY: e.scaleY, rotation: e.rotation, extrusionZ: e.extrusionZ };
          visitar(b.entities || [], [{ x: -(b.x || 0), y: -(b.y || 0) }, t, ...transforms], layer, prof + 1);
        }
      }
    }
  };
  visitar(parsed.entities || [], [], null, 0);
  return out;
}

// escala → rotação → translação → espelho por extrusão −Z (ordem do toPolylines da lib)
function transformar(pts, transforms = []) {
  return transforms.reduce((acc, t) => acc.map(([x0, y0]) => {
    let x = x0 * (t.scaleX || 1), y = y0 * (t.scaleY || 1);
    if (t.rotation) {
      const a = (t.rotation * Math.PI) / 180;
      [x, y] = [x * Math.cos(a) - y * Math.sin(a), y * Math.cos(a) + x * Math.sin(a)];
    }
    x += t.x || 0; y += t.y || 0;
    if (t.extrusionZ === -1) x = -x;
    return [x, y];
  }), pts);
}

// Arco/círculo em pontos; extrusão −Z do próprio arco espelha em X (porta espelhada)
function pontosArco(e) {
  const a0 = e.type === 'CIRCLE' ? 0 : e.startAngle;
  let a1 = e.type === 'CIRCLE' ? 2 * Math.PI : e.endAngle;
  if (a1 <= a0) a1 += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((a1 - a0) / (Math.PI / 16)));
  const pts = Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [e.x + e.r * Math.cos(a), e.y + e.r * Math.sin(a)]; });
  const espelho = (p) => (e.extrusionZ === -1 ? [-p[0], p[1]] : p);
  const centro = transformar([espelho([e.x, e.y])], e.transforms)[0];
  const tp = transformar(pts.map(espelho), e.transforms);
  return { pts: tp, centro, r: dist(centro, tp[0]), varredura: ((a1 - a0) * 180) / Math.PI };
}

// Unidade real do desenho: muitos arquivos declaram mm e desenham em metro (ou
// vice-versa). O raio da folha de porta (0,55–1,25 m) é a régua mais confiável.
// Só vale unidade em que o desenho tem tamanho de edificação (3 m a 3 km); o
// cabeçalho que já mostra portas é mantido (símbolos repetidos não enganam).
// `miolo`: extensão do grosso do desenho (2× o intervalo interquartil). Desenho com
// vistas em escalas diferentes no mesmo espaço do modelo (Arena: plantas em metros
// na origem, diagramas a 80 mil unidades, cabeçalho em polegadas) tem extensão
// total implausível em metros, e a planta saía 40× menor (29/10/2026).
function decidirFator(insUnits, arcos, tamanho, extensao, miolo = extensao) {
  const doCabecalho = FATOR[insUnits] || null;
  const dentro = (e, f) => e * f >= 3 && e * f <= 3000;
  const plausivel = (f) => dentro(extensao, f) || dentro(miolo, f);
  const portasCom = (f) => arcos.filter(a => Math.abs(a.varredura - 90) <= 12 && a.r * f >= 0.55 && a.r * f <= 1.25).length;
  if (doCabecalho && plausivel(doCabecalho) && portasCom(doCabecalho) >= 3) return doCabecalho;
  const melhor = [1, 0.01, 0.001, 0.0254].filter(plausivel).map(f => ({ f, n: portasCom(f) })).sort((a, b) => b.n - a.n)[0];
  if (melhor && melhor.n >= 3) return melhor.f;
  if (doCabecalho) return doCabecalho;
  return tamanho > 2000 ? 0.001 : 1; // sem unidade: plantas em mm têm coordenadas na casa dos milhares
}

// ── Portas ────────────────────────────────────────────────────────────────
// Assinatura universal da porta de abrir: arco de ~90° com raio da folha
// (0,5–1,3 m) centrado na dobradiça. Uma ponta do arco é a folha ABERTA (linha
// ou retângulo da dobradiça até ela) e a outra é o batente da fechadura (vão
// livre; a parede continua além dele). Porta dupla: dois arcos que se encontram
// no meio. Portas de correr e vãos sem folha não têm arco — não são detectados.
function detectarPortas(arcos, segmentos) {
  const cel = 0.25;
  const grade = new Map();
  for (const s of segmentos) for (const p of s) { const k = `${Math.floor(p[0] / cel)},${Math.floor(p[1] / cel)}`; (grade.get(k) || grade.set(k, []).get(k)).push(s); }
  const perto = (p) => {
    const [i, j] = [Math.floor(p[0] / cel), Math.floor(p[1] / cel)];
    const out = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(...(grade.get(`${i + a},${j + b}`) || []));
    return out;
  };
  const tol = 0.08;
  const temFolha = (h, e) => perto(e).some(([p, q]) => (dist(p, e) < tol && dist(q, h) < tol) || (dist(q, e) < tol && dist(p, h) < tol));
  // parede que continua além da ponta, na direção dobradiça→ponta
  const temParede = (h, e, r) => perto(e).some(([p, q]) => {
    const [a, b] = dist(p, e) < dist(q, e) ? [p, q] : [q, p];
    if (dist(a, e) > 0.2 || dist(b, h) <= dist(e, h) + 0.05) return false;
    const v = [e[0] - h[0], e[1] - h[1]], w = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(...w);
    return L > 0.05 && Math.abs(v[0] * w[1] - v[1] * w[0]) / (r * L) < 0.1 && (v[0] * w[0] + v[1] * w[1]) > 0;
  });

  const folhas = [];
  for (const a of arcos) {
    if (a.r < 0.5 || a.r > 1.3 || Math.abs(a.varredura - 90) > 12) continue;
    const [e1, e2] = [a.pts[0], a.pts.at(-1)];
    const f1 = temFolha(a.centro, e1), f2 = temFolha(a.centro, e2);
    let aberta = e1, fechada = e2;
    if (f1 !== f2) [aberta, fechada] = f1 ? [e1, e2] : [e2, e1];
    else {
      const p1 = temParede(a.centro, e1, a.r), p2 = temParede(a.centro, e2, a.r);
      if (p1 !== p2) [aberta, fechada] = p1 ? [e2, e1] : [e1, e2];
    }
    if (folhas.some(f => dist(f.dobradica, a.centro) < 0.02 && dist(f.batente, fechada) < 0.02)) continue; // repetida
    folhas.push({ dobradica: a.centro, batente: fechada, aberta, r: a.r });
  }

  const usadas = new Set();
  const portas = [];
  folhas.forEach((f, i) => {
    if (usadas.has(i)) return;
    const j = folhas.findIndex((g, k) => k !== i && !usadas.has(k) && dist(g.batente, f.batente) < 0.1);
    let a = f.dobradica, b = f.batente, dupla = false;
    if (j >= 0) { usadas.add(j); b = folhas[j].dobradica; dupla = true; }
    usadas.add(i);
    const largura = dist(a, b);
    const u = [(b[0] - a[0]) / largura, (b[1] - a[1]) / largura];
    let n = [-u[1], u[0]];
    const ab = [f.aberta[0] - a[0], f.aberta[1] - a[1]];
    if (n[0] * ab[0] + n[1] * ab[1] < 0) n = [-n[0], -n[1]]; // n aponta para onde a porta abre
    portas.push({ largura_m: Math.round(largura * 100) / 100, dupla, meio: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dobradica: a, batente: b, u, n });
  });
  return portas;
}

// Lados da porta → ambientes (para onde abre e o outro lado da parede)
function associarPortas(portas, ambientes) {
  const ambienteEm = (p) => ambientes.filter(x => dentro(p, x.poligono)).sort((x, y) => x.area_m2 - y.area_m2)[0]?.nome || null;
  for (const p of portas) {
    let abre = null, outro = null;
    for (const d of [0.25, 0.4, 0.6]) {
      abre = abre || ambienteEm([p.meio[0] + p.n[0] * d, p.meio[1] + p.n[1] * d]);
      outro = outro || ambienteEm([p.meio[0] - p.n[0] * d, p.meio[1] - p.n[1] * d]);
    }
    Object.assign(p, { abre_para: abre, outro_lado: outro, ambientes: [...new Set([abre, outro].filter(Boolean))], externa: !(abre && outro) });
  }
  // numeração estável: de cima para baixo, da esquerda para a direita
  portas.sort((p, q) => (Math.abs(q.meio[1] - p.meio[1]) > 0.5 ? q.meio[1] - p.meio[1] : p.meio[0] - q.meio[0]));
  portas.forEach((p, i) => { p.id = `PT${i + 1}`; });
  return portas;
}

// ── Polígonos que não são ambiente (M2 da revisão de 29/10/2026) ─────────
// Polilinha fechada em layer de instalação ou de anotação não é sala: campo de
// visão da câmera (CFTV-COBERTURA), cobertura do detector (STD-INC-BLOCK),
// nuvem de revisão, contorno de eletrocalha, mobiliário, mapa de situação. No
// DXF real, os "ambientes" vinham desses contornos, com nome de equipamento.
// ("COBERTURA" sozinha não entra: na arquitetura é telhado ou apartamento;
// CFTV-COBERTURA e INC-RAIO-COBERTURA saem pelo prefixo da disciplina.)
// "DI-Área do detalhe" (QiBuilder) é a moldura do recorte de detalhe: na Arena
// (01/11/2026) virava uma "LANCHONETE" de 2.316 m² e ambientes de 1.600 m².
const RE_LAYER_NAO_AMBIENTE = /REVIS[ÃA]O|NUVEM|CLOUD|CAMPO.?DE.?VIS|CALHA|ELETROD|FIA[ÇC][ÃA]O|FIACAO|INFRA|STD-INC|MOBILI|\bMAPA|SITUA[ÇC][ÃA]O|LOCALIZA[ÇC][ÃA]O|\bEQUIP|HACH|[ÁA]REA.?D[OE].?DETALHE/i;
const layerNaoEhAmbiente = (l) => RE_LAYER_NAO_AMBIENTE.test(l || '') || ehLayerDeInstalacao(l);

// Grade de módulos iguais (6+ polígonos de mesma área e mesmas dimensões, a
// maioria encostada lado a lado, sem folga de parede): é malha de cobertura,
// de vagas ou de estrutura, não sala — DWG real com 152 "ambientes" de 6,3 × 6,3 m.
// Salas iguais de verdade (quartos de hotel) têm parede entre elas: não encostam.
function semGradeRepetida(polis) {
  const caixa = (pts) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const grupos = new Map();
  for (const p of polis) {
    const c = caixa(p.pts);
    const k = `${Math.round(p.area * 10)}|${Math.round((c[2] - c[0]) * 20)}|${Math.round((c[3] - c[1]) * 20)}`;
    (grupos.get(k) || grupos.set(k, []).get(k)).push({ p, c });
  }
  const fora = new Set();
  const tol = 0.02;
  const sobrepoe = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > tol;
  const encostam = (c, d) => ((Math.abs(c[2] - d[0]) < tol || Math.abs(c[0] - d[2]) < tol) && sobrepoe(c[1], c[3], d[1], d[3]))
    || ((Math.abs(c[3] - d[1]) < tol || Math.abs(c[1] - d[3]) < tol) && sobrepoe(c[0], c[2], d[0], d[2]));
  for (const g of grupos.values()) {
    if (g.length < 6 || g.length > 5000) continue;
    const encostados = g.filter(({ c }, i) => g.some(({ c: d }, j) => j !== i && encostam(c, d))).length;
    if (encostados / g.length >= 0.5) for (const { p } of g) fora.add(p);
  }
  return fora.size ? polis.filter(p => !fora.has(p)) : polis;
}

// ── Ambientes pelas paredes (sem polilinha de área) ───────────────────────
// Layers que não são parede (mobiliário, piso, cotas, textos, tracejados de projeção…)
const RE_NAO_PAREDE = /MOB|LOU[CÇ]A|PISO|HACH|COTA|TEXT|DIM|EIXO|TRACEJ|VEGET|LAYOUT|EQUIP|PAGIN|FORRO|ILUM|EL[EÉ]T|HIDR|SANIT|TUBUL|DEFPOINTS|VIEWPORT|CARIMBO|SELO|NOTA/i;
const RE_PAREDE = /PAREDE|ALVEN|WALL|DRYWALL|DIVIS|ESTRUT|PILAR|COLUN|JANEL|ESQUAD|CAIXILH|VIDRO|WINDOW|FECHAMENTO|PERIM/i;

function ambientesPorParedes(segmentos, portas, textos, { areaMinima = 1, areaMaxima = 5000 } = {}) {
  if (!segmentos.length || !textos.length) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segmentos) for (const [x, y] of s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 -= 1; y0 -= 1; x1 += 1; y1 += 1;
  let c = 0.05;
  const maxCel = 16e6;
  if (((x1 - x0) / c) * ((y1 - y0) / c) > maxCel) c = Math.sqrt(((x1 - x0) * (y1 - y0)) / maxCel);
  const W = Math.ceil((x1 - x0) / c) + 1, H = Math.ceil((y1 - y0) / c) + 1;
  const parede = new Uint8Array(W * H);
  const marcar = (i, j) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < W && jj < H) parede[jj * W + ii] = 1; } };
  const tracar = ([p, q]) => {
    const n = Math.max(1, Math.ceil(dist(p, q) / (c * 0.5)));
    for (let k = 0; k <= n; k++) marcar(Math.round((p[0] + ((q[0] - p[0]) * k) / n - x0) / c), Math.round((p[1] + ((q[1] - p[1]) * k) / n - y0) / c));
  };
  segmentos.forEach(tracar);
  portas.forEach(p => tracar([p.dobradica, p.batente])); // fecha o vão da porta

  const regiao = new Int32Array(W * H); // 0 = não visitado; −1 = exterior (vazou)
  const ambientes = [];
  const porRegiao = new Map();
  const fila = new Int32Array(W * H);
  const maxCelulas = areaMaxima / (c * c);
  let proxima = 1;
  for (const t of textos) {
    let i = Math.round((t.x - x0) / c), j = Math.round((t.y - y0) / c);
    if (i < 0 || j < 0 || i >= W || j >= H) continue;
    // texto sobre a linha da parede: célula livre mais próxima
    if (parede[j * W + i]) {
      let achou = false;
      for (let r = 1; r <= 4 && !achou; r++) for (let a = -r; a <= r && !achou; a++) for (let b = -r; b <= r && !achou; b++) {
        const ii = i + a, jj = j + b;
        if (ii >= 0 && jj >= 0 && ii < W && jj < H && !parede[jj * W + ii]) { i = ii; j = jj; achou = true; }
      }
      if (!achou) continue;
    }
    const k0 = j * W + i;
    if (regiao[k0] === -1) continue;
    if (regiao[k0] > 0) { porRegiao.get(regiao[k0]).textos.push(t); continue; }
    const id = proxima++;
    let ini = 0, fim = 0, vazou = false;
    fila[fim++] = k0; regiao[k0] = id;
    while (ini < fim) {
      const k = fila[ini++];
      const ci = k % W, cj = (k - ci) / W;
      if (ci === 0 || cj === 0 || ci === W - 1 || cj === H - 1 || fim > maxCelulas) { vazou = true; break; }
      for (const v of [k - 1, k + 1, k - W, k + W]) {
        if (parede[v]) continue;
        if (regiao[v] === -1) { vazou = true; break; } // encostou no exterior já conhecido
        if (!regiao[v]) { regiao[v] = id; fila[fim++] = v; }
      }
      if (vazou) break;
    }
    if (vazou) { for (let q = 0; q < fim; q++) regiao[fila[q]] = -1; continue; }
    porRegiao.set(id, { id, celulas: fila.slice(0, fim), textos: [t] });
  }

  for (const r of porRegiao.values()) {
    // devolve a meia parede comida pela dilatação (1 célula) para a área bater com a face da parede
    const mascara = new Set(r.celulas);
    for (const k of r.celulas) for (const v of [k - 1, k + 1, k - W, k + W]) if (parede[v]) mascara.add(v);
    const pol = contorno(mascara, W, c, x0, y0);
    if (!pol || pol.length < 3) continue;
    // a borda da máscara fica meia célula antes da face da parede
    const area = mascara.size * c * c + perimetro(pol) * c / 2;
    if (area < areaMinima || area > areaMaxima) continue;
    ambientes.push({ nome: escolherNome(r.textos), area_m2: Math.round(area * 100) / 100, perimetro_m: Math.round(perimetro(pol) * 100) / 100, poligono: pol, centro: centroide(pol), origem: 'paredes' });
  }
  return ambientes;
}

// Contorno externo de um conjunto de células: arestas de borda orientadas
// (região à esquerda) encadeadas no maior laço, simplificado (Douglas-Peucker)
function contorno(mascara, W, c, x0, y0) {
  const prox = new Map();
  const add = (a, b) => { (prox.get(a) || prox.set(a, []).get(a)).push(b); };
  const V = (i, j) => j * (W + 1) + i; // vértices da grade
  for (const k of mascara) {
    const i = k % W, j = (k - i) / W;
    if (!mascara.has(k - W)) add(V(i, j), V(i + 1, j));         // embaixo
    if (!mascara.has(k + 1)) add(V(i + 1, j), V(i + 1, j + 1)); // direita
    if (!mascara.has(k + W)) add(V(i + 1, j + 1), V(i, j + 1)); // em cima
    if (!mascara.has(k - 1)) add(V(i, j + 1), V(i, j));         // esquerda
  }
  const laços = [];
  for (const inicio of prox.keys()) {
    while ((prox.get(inicio) || []).length) {
      const laco = [inicio];
      let v = inicio;
      for (let guarda = 0; guarda < 4e6; guarda++) {
        const s = prox.get(v);
        if (!s || !s.length) break;
        v = s.pop();
        if (v === inicio) break;
        laco.push(v);
      }
      laços.push(laco.map(q => { const i = q % (W + 1); return [x0 + i * c - c / 2, y0 + ((q - i) / (W + 1)) * c - c / 2]; }));
    }
  }
  const maior = laços.sort((a, b) => areaPoligono(b) - areaPoligono(a))[0];
  return maior && simplificar(maior, c * 1.5);
}

function simplificar(pts, tol) {
  if (pts.length < 4) return pts;
  // fechado: parte nos dois pontos mais distantes e simplifica cada metade
  let ia = 0, ib = 0, dm = -1;
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 200))) for (let j = i + 1; j < pts.length; j += Math.max(1, Math.floor(pts.length / 200))) { const d = dist(pts[i], pts[j]); if (d > dm) { dm = d; ia = i; ib = j; } }
  const dp = (seq) => {
    if (seq.length < 3) return seq;
    const [a, b] = [seq[0], seq.at(-1)];
    let im = 0, dmax = 0;
    for (let i = 1; i < seq.length - 1; i++) {
      const d = distanciaContorno(seq[i], [a, b]);
      if (d > dmax) { dmax = d; im = i; }
    }
    if (dmax <= tol) return [a, b];
    return [...dp(seq.slice(0, im + 1)).slice(0, -1), ...dp(seq.slice(im))];
  };
  const m1 = dp(pts.slice(ia, ib + 1)), m2 = dp([...pts.slice(ib), ...pts.slice(0, ia + 1)]);
  return [...m1.slice(0, -1), ...m2.slice(0, -1)];
}

// ── Leitura ──────────────────────────────────────────────────────────────
// texto/atributo → { s, x, y, h, layer } (atributo: etiqueta de ambiente em bloco, NOME/AMBIENTE)
function lerTexto(e) {
  const s = limparTexto(e.type === 'ATTRIB' ? e.text.string : e.string);
  const x = e.type === 'ATTRIB' ? e.text.x : e.x, y = e.type === 'ATTRIB' ? e.text.y : e.y;
  if (!s || !Number.isFinite(x)) return null;
  const [[tx, ty]] = transformar([[x, y]], e.transforms);
  const escala = e.transforms?.reduce((m, t) => m * Math.abs(t.scaleY || 1), 1) || 1;
  return { s, x: tx, y: ty, h: (e.nominalTextHeight || e.textHeight || (e.type === 'ATTRIB' ? e.text.textHeight : 0) || 0) * escala, layer: e.layer, ...(e.type === 'ATTRIB' ? { tag: e.tag || '' } : {}) };
}
// "Tomada alta a 2,20m do piso", "h= 20 cm abaixo do forro", "altura: 97,5 cm", "H=1,10", "h: 1,10 m"
// (o valor é lido por ./textoCad.js; aqui só se separa o texto que fala de altura)
const RE_NOTA_ALTURA = /do\s+piso|abaixo\s+do\s+forro|\baltura\b|\bh\s*[=:]\s*[0-9]/i;

function lerArquitetura(textoDxf, opcoes = {}) {
  const { parsed } = new Helper(textoDxf);
  const ents = explodir(parsed);

  const poligonos = [];
  const textos = [];
  const referencia = []; // em unidades do desenho até decidir o fator
  const arcos = [];
  const preenchimentos = [];
  for (const e of ents) {
    if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices?.length >= 2) {
      const pts = transformar(e.vertices.map(v => [v.x, v.y]), e.transforms);
      const fechada = pts.length >= 3 && (e.closed || dist(pts[0], pts.at(-1)) < 1e-6);
      if (fechada && (!opcoes.layersAmbiente || opcoes.layersAmbiente.test(e.layer))) poligonos.push({ pts, layer: e.layer });
      referencia.push({ tipo: 'poli', pts, fechada, layer: e.layer });
    } else if (e.type === 'LINE') {
      referencia.push({ tipo: 'linha', pts: transformar([[e.start.x, e.start.y], [e.end.x, e.end.y]], e.transforms), layer: e.layer });
    } else if (e.type === 'ARC' || e.type === 'CIRCLE') {
      const a = pontosArco(e);
      referencia.push({ tipo: 'arco', pts: a.pts, fechada: e.type === 'CIRCLE', layer: e.layer });
      if (e.type === 'ARC') arcos.push(a);
    } else if (e.type === 'HATCH' && (e.fillType === 'SOLID' || /^SOLID$/i.test(e.patternName || ''))) {
      // preenchimento sólido (tomada alta cheia × média meio cheia): ./pontosDoDesenho.js
      for (const l of e.boundary?.loops || []) {
        const pl = l.entities?.find(x => x.type === 'POLYLINE');
        const pts = pl ? pl.points.map(p => [p.x, p.y]) : (l.entities || []).filter(x => x.start).map(x => [x.start.x, x.start.y]);
        if (pts.length >= 3) preenchimentos.push({ pts: transformar(pts, e.transforms), layer: e.layer });
      }
    } else if (e.type === 'TEXT' || e.type === 'MTEXT' || (e.type === 'ATTRIB' && e.text)) {
      const t = lerTexto(e);
      if (t) textos.push(t);
    }
  }
  // notas de altura: as da legenda (layer de tabela, fora da planta) e as escritas ao lado dos pontos
  // (todas as linhas da legenda ficam: o texto diz o TIPO do símbolo ao lado — detector,
  // câmera, ponto de rede… — em qualquer disciplina, mesmo com a layer de nome genérico)
  const notas = [...ents.textosFora.map(lerTexto).filter(Boolean).map(t => ({ ...t, legenda: true })), ...textos.filter(t => RE_NOTA_ALTURA.test(t.s))];

  let tamanho = 0;
  for (const p of poligonos) for (const [x, y] of p.pts) tamanho = Math.max(tamanho, Math.abs(x), Math.abs(y));
  // extensão típica (percentis 2–98 %, ignora entidades perdidas longe do desenho)
  const xs = referencia.flatMap(r => [r.pts[0][0]]).sort((a, b) => a - b), ys = referencia.flatMap(r => [r.pts[0][1]]).sort((a, b) => a - b);
  const pct = (v, q) => v[Math.min(v.length - 1, Math.floor(q * v.length))] ?? 0;
  const ext = Math.max(pct(xs, 0.98) - pct(xs, 0.02), pct(ys, 0.98) - pct(ys, 0.02));
  const miolo = 2 * Math.max(pct(xs, 0.75) - pct(xs, 0.25), pct(ys, 0.75) - pct(ys, 0.25));
  const fator = decidirFator(parsed.header?.insUnits, arcos, tamanho, ext, miolo);
  const m = (pts) => pts.map(([x, y]) => [x * fator, y * fator]);
  let textosTodos = textos.map(t => ({ ...t, x: t.x * fator, y: t.y * fator, h: t.h * fator }));
  let refM = referencia.map(r => ({ ...r, pts: m(r.pts) }));
  let arcosM = arcos.map(a => ({ ...a, pts: m(a.pts), centro: m([a.centro])[0], r: a.r * fator }));
  let poligonosM = poligonos.map(p => ({ ...p, pts: m(p.pts) }));
  const notasM = notas.map(t => ({ ...t, x: t.x * fator, y: t.y * fator, h: t.h * fator }));
  const preenchimentosM = preenchimentos.map(p => ({ ...p, pts: m(p.pts) }));
  // os símbolos da legenda (à esquerda do texto, na mesma linha): a região da legenda sai
  // da planta logo abaixo, mas é com eles que se reconhece cada tipo na planta
  const naLinha = (n, [x, y]) => x >= n.x - 4 && x <= n.x + 0.1 && Math.abs(y - n.y) <= 1;
  const legendas = notasM.filter(n => n.legenda);
  const simbolosDaLegenda = legendas.length ? refM.filter(r => r.pts.length && legendas.some(n => naLinha(n, r.pts[0]))) : [];

  // O que é planta e o que não é (./classificarPrancha.js): o que cai numa região de
  // diagrama, quadro de cargas, legenda, detalhe ou carimbo — e não numa de planta — sai
  // de tudo (ambientes, portas, paredes, referência). Desenho com várias vistas no
  // espaço do modelo (planta + unifilar ao lado) era lido inteiro como planta.
  const classificacao = opcoes.classificar === false ? null : classificarDesenho(refM, arcosM, textosTodos);
  const regioesPlanta = (classificacao?.regioes || []).filter(r => r.tipo === 'planta').map(r => r.caixa);
  if (classificacao) {
    const fora = classificacao.regioes.filter(r => NAO_PLANTA.has(r.tipo)).map(r => r.caixa);
    const dentroDe = (lista, [x, y]) => lista.some(c => x >= c[0] - 0.05 && x <= c[2] + 0.05 && y >= c[1] - 0.05 && y <= c[3] + 0.05);
    const tira = (p) => dentroDe(fora, p) && !dentroDe(regioesPlanta, p);
    const meio = (pts) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
    if (fora.length) {
      refM = refM.filter(r => !tira(meio(r.pts)));
      arcosM = arcosM.filter(a => !tira(a.centro));
      poligonosM = poligonosM.filter(p => !tira(meio(p.pts)));
      textosTodos = textosTodos.filter(t => !tira([t.x, t.y]));
    }
  }
  const textosM = textosTodos.filter(ehNome);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of refM) for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const extensao = Number.isFinite(x0) ? { min: [x0, y0], max: [x1, y1] } : { min: [0, 0], max: [0, 0] };

  // portas: segmentos retos (linhas e lados de polilinha) para achar a folha
  const retos = refM.filter(r => r.tipo !== 'arco');
  const segmentos = retos.flatMap(r => r.pts.slice(1).map((p, i) => [r.pts[i], p]));
  const portas = detectarPortas(arcosM, segmentos);

  // 1) cada texto de nome fica no MENOR polígono fechado que o contém (paredes
  // em linha dupla geram polígonos aninhados: o de dentro é o ambiente).
  // Polígono com 3+ portas bem no meio dele é moldura/contorno do prédio, não sala.
  const portasNoMeio = (pts) => portas.filter(p => dentro(p.meio, pts) && distanciaContorno(p.meio, pts) > 0.8).length;
  const candidatos = semGradeRepetida(poligonosM
    .filter(p => !layerNaoEhAmbiente(p.layer))
    .map(p => ({ ...p, area: areaPoligono(p.pts) }))
    .filter(p => p.area >= (opcoes.areaMinima ?? 1) && p.area <= (opcoes.areaMaxima ?? 5000) && portasNoMeio(p.pts) < 3));
  const nomes = new Map(); // índice do polígono → textos
  const soltos = [];
  // sementes sem nome: qualquer etiqueta com cara de código (CAM-04, QD-01, TUG 3…) ou
  // texto curto de layer de instalação. Fora do prédio a sala "vaza" e é descartada.
  const etiquetas = textosTodos
    .filter(t => !ehNome(t) && t.s.length <= 20 && (RE_CODIGO.test(t.s) || (RE_LAYER_INSTALACAO.test(t.layer || '') && /[A-Za-z]/.test(t.s))))
    .map(t => ({ ...t, etiqueta: true }));
  // desenho que não é planta (quadro, unifilar, detalhe): nenhuma sala — o painel
  // QA-CAG (CCN) tinha 105 "ambientes" nos retângulos dos componentes
  const semPlanta = !!classificacao?.semPlanta;
  for (const t of semPlanta ? [] : [...textosM, ...etiquetas]) {
    let melhor = -1;
    candidatos.forEach((p, i) => { if (dentro([t.x, t.y], p.pts) && (melhor < 0 || p.area < candidatos[melhor].area)) melhor = i; });
    if (melhor >= 0) (nomes.get(melhor) || nomes.set(melhor, []).get(melhor)).push(t);
    else soltos.push(t);
  }
  const ambientes = [...nomes.entries()].map(([i, ts]) => {
    const p = candidatos[i];
    return { nome: escolherNome(ts), area_m2: Math.round(p.area * 100) / 100, perimetro_m: Math.round(perimetro(p.pts) * 100) / 100, poligono: p.pts, centro: centroide(p.pts), layer: p.layer, origem: 'polilinha' };
  });

  // 2) nomes fora de polilinha: sala pelas paredes
  if (!semPlanta && soltos.length && opcoes.paredes !== false) {
    const layers = [...new Set(retos.map(r => r.layer))];
    const deParede = layers.filter(l => RE_PAREDE.test(l || ''));
    const usar = deParede.length ? new Set(deParede) : new Set(layers.filter(l => !RE_NAO_PAREDE.test(l || '')));
    // sem layer de parede (tudo que não é anotação vira parede): só o que está na região de
    // planta, quando a folha tem uma — senão o unifilar ao lado virava "sala"
    const naPlanta = (r) => deParede.length || !regioesPlanta.length || r.pts.some(([x, y]) => regioesPlanta.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]));
    const segParede = retos.filter(r => usar.has(r.layer) && naPlanta(r)).flatMap(r => [...r.pts.slice(1).map((p, i) => [r.pts[i], p]), ...(r.fechada ? [[r.pts.at(-1), r.pts[0]]] : [])]);
    // segmento da folha da porta não é parede (não divide a sala)
    const folha = (s) => portas.some(p => (dist(s[0], p.dobradica) < 0.08 || dist(s[1], p.dobradica) < 0.08) && Math.min(dist(s[0], p.dobradica), dist(s[1], p.dobradica)) < 0.08 && Math.abs(dist(s[0], s[1]) - p.largura_m / (p.dupla ? 2 : 1)) < 0.1);
    ambientes.push(...ambientesPorParedes(segParede.filter(s => !folha(s)), portas, soltos, opcoes));
  }
  // sala achada só por etiqueta de equipamento: existe (o 3D e a contagem por ambiente
  // precisam dela), mas não leva o código do equipamento como nome
  let semNome = 0;
  ambientes.sort((a, b) => (a.centro[1] - b.centro[1]) || (a.centro[0] - b.centro[0]));
  for (const a of ambientes) if (!a.nome) { a.nome = `Ambiente ${++semNome}`; a.semNome = true; }
  ambientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
  associarPortas(portas, ambientes);

  return {
    ambientes, portas, referencia: refM, extensao, fatorUnidade: fator, layers: [...new Set(ents.map(e => e.layer))],
    molduras: ents.molduras.map(o => ({ pts: m(o.pts), layer: o.layer })),
    // alturas do projeto (./pontosDoDesenho.js): notas, preenchimentos e os símbolos da legenda
    notas: notasM, preenchimentos: preenchimentosM, simbolosDaLegenda,
    // classificação da folha (planta × diagrama × tabela…) e as caixas de planta, em metros
    classificacao: classificacao && { tipo: classificacao.tipo, resumo: classificacao.resumo, temPlanta: classificacao.temPlanta, semPlanta: classificacao.semPlanta, misto: classificacao.misto, regioes: classificacao.regioes.map(({ caixa, tipo, rotulo, titulo, confianca, motivos }) => ({ caixa, tipo, rotulo, titulo, confianca, motivos })) },
    regioesPlanta,
  };
}

// Desenho (já em metros) → folha do classificador (./classificarPrancha.js).
// Caixa pelos percentis 1–99 % (entidade perdida longe do desenho não estica a folha).
function classificarDesenho(refM, arcosM, textosM) {
  const segmentos = [];
  for (const r of refM) {
    if (r.tipo === 'arco') continue;
    for (let i = 1; i < r.pts.length; i++) segmentos.push({ a: r.pts[i - 1], b: r.pts[i], layer: r.layer });
    if (r.fechada && r.pts.length >= 3) segmentos.push({ a: r.pts.at(-1), b: r.pts[0], layer: r.layer });
  }
  if (segmentos.length < 4) return null;
  const xs = segmentos.flatMap(s => [s.a[0], s.b[0]]).sort((a, b) => a - b), ys = segmentos.flatMap(s => [s.a[1], s.b[1]]).sort((a, b) => a - b);
  const q = (v, f) => v[Math.min(v.length - 1, Math.floor(f * v.length))];
  // corte só da sujeira perdida longe (0,2 %): com 1 %, o unifilar da Arena (2 % dos
  // traços, numa ponta do desenho) ficava fora da folha e não era classificado
  const caixa = [q(xs, 0.002), q(ys, 0.002), q(xs, 0.998), q(ys, 0.998)];
  if (!(caixa[2] > caixa[0]) || !(caixa[3] > caixa[1])) return null;
  return classificarFolha({
    caixa, yParaBaixo: false, metrosPorUnidade: 1, raioPorta: [0.55, 1.25], espessuraParede: [0.07, 0.4], segmentos,
    arcos: arcosM.map(a => ({ centro: a.centro, r: a.r, varredura: a.varredura, a: a.pts[0], b: a.pts.at(-1), layer: a.layer })),
    textos: textosM.map(t => ({ s: t.s, x: t.x, y: t.y, h: t.h })),
  });
}

module.exports = { lerArquitetura, areaPoligono, perimetro, dentro, centroide, distanciaContorno, transformar, RE_PAREDE, RE_NAO_PAREDE };
