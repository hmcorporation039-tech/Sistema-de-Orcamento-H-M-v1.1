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

module.exports = { ucDps, UC_COMERCIAIS, normalizarEsquema };
