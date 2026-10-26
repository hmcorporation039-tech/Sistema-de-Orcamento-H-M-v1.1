// Diagrama unifilar do quadro (QElectroTech .qet, formato 0.100 — abre na
// versão estável usada pelos projetistas e nas mais novas) a partir do
// resultado do cálculo da skill de elétrica. O gerador e os símbolos oficiais
// ficam em ./qet (validados abrindo e exportando no QElectroTech 0.100 e 0.200).
const { ProjetoQet } = require('./qet/qet.mjs');
const { gerarUnifilarQD } = require('./qet/unifilar-qd.mjs');
const { gerarUnifilarSE } = require('./qet/unifilar-se.mjs');

// verificar() devolve a lista de erros (mesmas regras de carga do QElectroTech)
function validado(projeto) {
  const xml = projeto.toXml();
  const erros = projeto.verificar(xml) || [];
  if (erros.length) throw new Error(`Unifilar inválido para o QElectroTech:\n - ${erros.join('\n - ')}`);
  return xml;
}

const virgula = (n, d = 1) => String(Number(n).toFixed(d)).replace('.', ',').replace(/,0+$/, '');
const mm2 = (s) => `${virgula(s, 1)} mm²`;
const TIPO = { iluminacao: 'iluminacao', tug: 'tomada', tue: 'tue' };
const ABREV = [[/Tomadas?/g, 'TUG'], [/Iluminação/g, 'Ilum.'], [/cozinha/gi, 'coz.'], [/serviço/gi, 'serv.'], [/banheiros?/gi, 'banh.'], [/de uso geral/g, ''], [/Ar-condicionado/g, 'Ar-cond.'], [/\s+/g, ' ']];
const abreviar = (s, max) => {
  let t = String(s).trim();
  if (t.length > max) for (const [re, r] of ABREV) t = t.replace(re, r).trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// Dados do formulário + resultado → entrada do gerador de unifilar
function dadosUnifilar(res, { quadro = 'QD-01' } = {}) {
  const { calc, dados } = res;
  const inst = dados.instalacao || {};
  const al = calc.alimentador;
  const fases = { monofasico: '1F+N+PE', bifasico: '2F+N+PE', trifasico: '3F+N+PE' }[inst.sistema] || 'F+N+PE';
  const nCondutores = { monofasico: 2, bifasico: 3, trifasico: 4 }[inst.sistema] || 3;
  const hoje = new Date();
  return {
    quadro,
    obra: dados.obra?.nome || dados.meta?.titulo || 'Obra',
    cliente: dados.cliente?.nome || '',
    local: dados.obra?.uso || '',
    data: `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`,
    rev: dados.meta?.revisao || 'R00',
    responsavel: dados.responsavel?.nome || '',
    crea: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '',
    arquivo: `unifilar-${quadro.toLowerCase()}`,
    alimentacao: {
      texto: `${fases} — ${inst.tensao_fn}/${inst.tensao_ff} V — 60 Hz`,
      secao: `${nCondutores} × ${mm2(al.secao)} + PE ${mm2(al.secaoPE)} (Cu/${inst.isolacao || 'PVC'})`,
      secaoCurta: mm2(al.secao),
    },
    geral: { descricao: `${al.disjuntor} A — ${al.polos}P` },
    dr: null, // a skill dimensiona DR por circuito (5.1.3.2.2)
    dps: { descricao: `classe II\n${calc.quadro.dpsUc || 275} V — 20 kA`, secao: '4 mm²' },
    circuitos: calc.circuitos.map((c, i) => ({
      id: i + 1,
      // chuveiro/aquecedor/forno: símbolo de resistência; demais TUE: tomada
      tipo: /CHUVEIRO|AQUECEDOR|FORNO|TORNEIRA EL/i.test(c.descricao || '') ? 'chuveiro' : (TIPO[c.tipo] || 'tue'),
      // coluna de ~23 caracteres em 7 pt no unifilar: o número já aparece em "Circuito N"
      descricao: abreviar(String(c.descricao || '').split(' — ')[0], 23),
      disjuntor: `${c.disjuntor} A — ${c.polos}P`,
      secao: mm2(c.secao),
      carga: `${Math.round(c.potencia_va).toLocaleString('pt-BR')} VA`,
      dr: c.dr ? '30 mA' : null,
    })),
    notas: [
      'NOTAS',
      '1. Condutores de cobre, isolação',
      `    ${inst.isolacao || 'PVC'} 70 °C, seções em mm².`,
      '2. DR 30 mA nos circuitos indicados',
      '    (NBR 5410, 5.1.3.2.2).',
      `3. DPS classe II Uc ≥ ${calc.quadro.dpsUc || 275} V (Tab. 49).`,
      `4. Reserva no quadro: ${calc.quadro.reserva} (Tab. 59).`,
      '5. Gerado pelo sistema H&M — revisar.',
    ],
  };
}

// Devolve o XML do projeto .qet (1 ou mais folhas: 6 circuitos por folha)
function gerarUnifilarEletrica(res, opcoes = {}) {
  const projeto = gerarUnifilarQD(dadosUnifilar(res, opcoes));
  return { xml: validado(projeto), folhas: projeto.folios.length };
}

// Elétrica industrial: um projeto com o QGBT e cada CCM/quadro (folhas em
// sequência), pelo adaptador da própria skill (dadosUnifilarQD)
function gerarUnifilarIndustrial(res) {
  const { dadosUnifilarQD } = require('../../eletrica-industrial/scripts/lib/unifilar.js');
  const quadros = ['QGBT', ...(res.calc.unifilar?.quadros || []).map(q => q.ref)];
  let projeto = null;
  for (const quadro of quadros) {
    const d = dadosUnifilarQD(res, { quadro });
    if (!d.circuitos?.length) continue;
    // saída de motor ("M-01 50 cv Y-Δ") com o símbolo de motor
    d.circuitos = d.circuitos.map(c => (/\bcv\b|^M-\d/i.test(c.descricao || '') ? { ...c, tipo: 'motor' } : c));
    projeto = gerarUnifilarQD(d, projeto ? { projeto } : {});
  }
  if (!projeto) throw new Error('Nenhum quadro com circuitos para o unifilar.');
  return { xml: validado(projeto), folhas: projeto.folios.length, quadros };
}

// Média tensão (subestação): do ponto de entrega ao QGBT a partir de
// calc.unifilar da skill media-tensao (1 folha; mais de 8 saídas continuam por setas vai/vem)
function gerarUnifilarMT(res) {
  const projeto = gerarUnifilarSE(res);
  return { xml: validado(projeto), folhas: projeto.folios.length };
}

// disciplina → gerador de unifilar
const UNIFILARES = { eletrica: gerarUnifilarEletrica, eletrica_industrial: gerarUnifilarIndustrial, media_tensao: gerarUnifilarMT };

module.exports = { dadosUnifilar, gerarUnifilarEletrica, gerarUnifilarIndustrial, gerarUnifilarMT, UNIFILARES, ProjetoQet };
