// Máxima tensão de operação contínua (Uc) do DPS — ABNT NBR 5410:2004,
// 6.3.5.2.4 b) e Tabela 49 ("Valor mínimo de Uc exigível do DPS, em função do
// esquema de aterramento"), conferida no texto da norma:
//
//   DPS entre        TT       TN-C     TN-S     IT c/ neutro   IT s/ neutro
//   fase e neutro    1,1·Uo   —        1,1·Uo   1,1·Uo         —
//   fase e PE        1,1·Uo   —        1,1·Uo   √3·Uo          U
//   fase e PEN       —        1,1·Uo   —        —              —
//   neutro e PE      Uo       —        Uo       Uo             —
//
// Uo = tensão fase–neutro; U = tensão entre fases. A nota 4 da tabela lembra
// que o Uc adequado pode ser bem maior que o mínimo. TN-C-S: o DPS do quadro
// fica a jusante da separação do PEN (5.4.3.6) e segue a coluna TN-S (na
// coluna TN-C o mínimo de fase é o mesmo, 1,1·Uo).
//
// Usada pelas skills de elétrica predial, hospitalar, industrial, solar (lado
// CA) e carregador veicular — uma regra só para todas.

// Valores comerciais usuais de Uc para DPS de BT em CA (série dos fabricantes;
// a escolha final é pelo catálogo — o mínimo da norma é o que vale)
const UC_COMERCIAIS = [175, 275, 320, 385, 440, 460, 550, 600, 690, 750, 1000];

const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => String(r1(v)).replace('.', ',');

function normalizarEsquema(esquema) {
  const e = String(esquema || 'TN-S').toUpperCase().replace(/\s+/g, '');
  if (e === 'TT') return 'TT';
  if (e === 'TN-C') return 'TN-C';
  if (e.startsWith('IT')) return 'IT';
  return 'TN-S'; // TN-S e TN-C-S (DPS a jusante da separação)
}

// { vfn, vff, esquema, neutro } → mínimos por modo de proteção e o Uc comercial
//  - vff ausente: √3·vfn (sistema trifásico)
//  - neutro: só pesa no IT (padrão: IT sem neutro distribuído, o caso mais comum)
function ucDps({ vfn, vff, esquema = 'TN-S', neutro } = {}) {
  const uo = Number(vfn);
  if (!(uo > 0)) throw new Error('DPS: informe a tensão fase-neutro (Uo).');
  const u = Number(vff) > 0 ? Number(vff) : Math.sqrt(3) * uo;
  const e = normalizarEsquema(esquema);
  const itComNeutro = e === 'IT' && neutro === true;
  const modos = [];
  if (e === 'TN-C') modos.push({ entre: 'fase e PEN', minimo: 1.1 * uo, regra: '1,1·Uo' });
  else if (e === 'IT' && !itComNeutro) modos.push({ entre: 'fase e PE', minimo: u, regra: 'U (tensão entre fases)' });
  else {
    modos.push({ entre: 'fase e neutro', minimo: 1.1 * uo, regra: '1,1·Uo' });
    modos.push(itComNeutro ? { entre: 'fase e PE', minimo: Math.sqrt(3) * uo, regra: '√3·Uo' } : { entre: 'fase e PE', minimo: 1.1 * uo, regra: '1,1·Uo' });
    modos.push({ entre: 'neutro e PE', minimo: uo, regra: 'Uo', neutroPe: true });
  }
  const fase = modos.filter(m => !m.neutroPe);
  const ucMinimo = Math.max(...fase.map(m => m.minimo));
  const regra = fase.find(m => m.minimo === ucMinimo).regra;
  const comercial = (v) => UC_COMERCIAIS.find(x => x >= v - 1e-9) || Math.ceil(v);
  const np = modos.find(m => m.neutroPe);
  const rotuloEsquema = e === 'IT' ? `IT ${itComNeutro ? 'com' : 'sem'} neutro distribuído` : e;
  return {
    esquema: e, uo, u, modos, ucMinimo, regra, uc: comercial(ucMinimo),
    ucNeutroPeMinimo: np ? np.minimo : null, ucNeutroPe: np ? comercial(np.minimo) : null,
    texto: `Uc ≥ ${comercial(ucMinimo)} V (NBR 5410, Tabela 49, ${rotuloEsquema}: ${regra} = ${fmt(ucMinimo)} V${np ? `; neutro–PE ≥ Uo = ${fmt(np.minimo)} V` : ''})`,
  };
}

// ── Classe, corrente e quantidade do DPS de um quadro ─────────────────────────
// (estava em quadros/scripts/lib/calculo.js; agora é a regra de todas as skills — 14/11/2026)
// NBR 5410:2004, 6.3.5.2.4 d), quando a NBR 5419 não determina a corrente:
//   classe II (ensaio com In): In ≥ 5 kA (8/20 µs) por modo de proteção e, no DPS N-PE do
//   esquema de conexão 3, ≥ 20 kA (trifásico) / 10 kA (monofásico);
//   classe I (ensaio com Iimp): Iimp ≥ 12,5 kA por modo e ≥ 50 kA (trifásico) / 25 kA no N-PE.
// NBR 5419-4:2026, C.1.7: classe I no ponto de entrada quando a edificação tem SPDA.
// NBR 5410, 6.3.5.2.9: ligação ≤ 0,5 m; condutor DPS–PE ≥ 16 mm² (classe I) / 4 mm² (classe II).
// Quantidade: um DPS por fase e um N-PE onde há neutro (não no TN-C nem no IT sem neutro). No TN-C-S,
// o quadro onde o PEN se separa (`separacaoPen`: o quadro geral da elétrica predial, o QGBT da industrial)
// tem N e PE unidos na mesma barra — sem DPS N-PE ali; nos quadros a jusante, com N-PE.
//
// { classe: 'auto' | 'I' | 'I+II' | 'II' | 'nenhum', spda, pontoEntrada, vfn, vff, esquema, nFases, neutro, separacaoPen }
//   'auto' → I+II no ponto de entrada de edificação com SPDA; II nos demais.
function especificarDps({ classe = 'auto', spda = false, pontoEntrada = true, vfn, vff, esquema = 'TN-S', nFases = 3, neutro, separacaoPen = false } = {}) {
  if (classe === 'nenhum') return null;
  const cl = classe && classe !== 'auto' ? classe : (spda && pontoEntrada ? 'I+II' : 'II');
  const uc = ucDps({ vfn, vff, esquema, neutro });
  const e = uc.esquema;
  const tncs = String(esquema || '').toUpperCase().replace(/\s+/g, '') === 'TN-C-S';
  const comNeutro = e !== 'TN-C' && !(e === 'IT' && neutro !== true) && !(tncs && separacaoPen);
  const fases = Number(nFases) || 3;
  const nNeutro = comNeutro ? 1 : 0;
  const trif = fases === 3;
  const classeI = cl !== 'II';
  return {
    classe: cl, uc, fases, neutroPe: nNeutro, quantidade: fases + nNeutro,
    in: classeI ? null : 5, inNeutroPe: classeI ? null : (trif ? 20 : 10),
    iimp: classeI ? 12.5 : null, iimpNeutroPe: classeI ? (trif ? 50 : 25) : null,
    peMin: classeI ? 16 : 4,
    texto: classeI
      ? `Classe I${cl === 'I+II' ? '+II' : ''} (ensaio com Iimp): Iimp ≥ 12,5 kA por modo de proteção e ≥ ${trif ? 50 : 25} kA no DPS N-PE, quando não determinada pela NBR 5419 (NBR 5410, 6.3.5.2.4 d); exigido no ponto de entrada quando a edificação tem SPDA (NBR 5419-4:2026, C.1.7)`
      : `Classe II (ensaio com In): In ≥ 5 kA (8/20 µs) por modo de proteção e ≥ ${trif ? 20 : 10} kA no DPS N-PE do esquema de conexão 3 (NBR 5410, 6.3.5.2.4 d)`,
    protecao: 'Proteção contra sobrecorrente do DPS conforme o fabricante (NBR 5410, 6.3.5.2.5) [CONFERIR]',
    ligacao: `Condutores de ligação o mais curtos possível, total ≤ 0,5 m; DPS–PE ≥ ${classeI ? 16 : 4} mm² (NBR 5410, 6.3.5.2.9)`,
  };
}

// Descrição do DPS para a lista de materiais, tirada de especificarDps: Uc pela Tabela 49 e a
// corrente mínima de 6.3.5.2.4 d) — fase e, onde há, N-PE. `inMinimoKa`: corrente nominal
// adotada pelo projeto acima do mínimo da norma (várias skills especificam In ≥ 20 kA em todos os
// modos, prática de mercado); vale o maior dos dois. Só para classe II (In); a classe I sai com Iimp.
function descricaoDps(info, { inMinimoKa = 0 } = {}) {
  if (!info) return '';
  const u = info.uc;
  const classe = info.classe === 'II' ? 'II' : `I${info.classe === 'I+II' ? '+II' : ''}`;
  const corrente = (v) => (info.iimp ? `Iimp ≥ ${fmt(v)} kA` : `In ≥ ${fmt(Math.max(v, inMinimoKa || 0))} kA (8/20 µs)`);
  const fase = `DPS classe ${classe} Uc ≥ ${u.uc} V, ${corrente(info.iimp || info.in)}`;
  if (!info.neutroPe) return fase;
  return `${fase}; N-PE Uc ≥ ${u.ucNeutroPe} V, ${corrente(info.iimp ? info.iimpNeutroPe : info.inNeutroPe)}`;
}

module.exports = { ucDps, UC_COMERCIAIS, normalizarEsquema, especificarDps, descricaoDps };
