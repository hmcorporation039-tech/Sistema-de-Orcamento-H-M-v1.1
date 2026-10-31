// Conferência do quadro de cargas lido do projeto pela NBR 5410 — o leitor
// (utils/leitoresTabelaProjeto.js) já trazia Ib, In, Ic, FCT, FCA, seção e queda
// de tensão de cada circuito, mas nada conferia esses números: um disjuntor
// maior que o cabo aguenta passava direto para o orçamento.
// Tabelas e limites são os mesmos da skill de elétrica (skills/_comum/eletrico),
// para a análise e o memorial não discordarem. Função pura: cada resultado é uma
// observação para o usuário conferir, não uma correção do projeto.
const path = require('path');
const { COMUM } = require('../config/caminhos');
const T = require(path.join(COMUM, 'eletrico', 'tabelas.js'));

const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
const positivo = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

// condutores carregados: trifásico equilibrado = 3; F+N, 2F = 2 (Tabela 46)
function carregados(c) {
  const esquema = String(c.esquema || '').toUpperCase();
  if (/^3F/.test(esquema) || String(c.fases || '').replace(/[^RST]/gi, '').length === 3) return 3;
  return 2;
}

// Tipo do circuito pelo nome/descrição (IL 1, T 3, TUG, F1 — T.U.E…): só para a seção mínima
function tipoCircuito(c) {
  const t = `${c.circuito || ''} ${c.descricao || ''}`;
  if (c.alimentador) return 'alimentador';
  if (/^\s*IL\b|^\s*I\s*\d|ilumina|lumin/i.test(t)) return 'iluminacao';
  if (/^\s*(T|F|TUG|TUE)\s*\d|tomada|T\.?U\.?[GE]|for[çc]a/i.test(t)) return 'tomada';
  return null;
}

// Locais do 5.1.3.2.2 (DR ≤ 30 mA obrigatório) reconhecíveis pela descrição do circuito
const RE_LOCAL_DR = /banh|\bBWC\b|\bWC\b|lavabo|cozinha|copa|lavanderia|[áa]rea de servi[çc]o|garagem|extern|varanda|sacada|piscina|jardim/i;

// Ib ≤ In ≤ Iz (5.3.4.1), seção mínima (Tabela 47), queda de tensão (6.2.7),
// DR nos locais do 5.1.3.2.2 e o status que o próprio software do projetista marcou.
function conferirCircuito(c) {
  const res = [];
  const ib = positivo(c.ip_A) ? c.ip_A : (positivo(c.corrente_A) ? c.corrente_A : null);
  const inA = positivo(c.disjuntor_A) ? c.disjuntor_A : null;
  const secao = positivo(c.secao_mm2) ? c.secao_mm2 : (positivo(c.cabo_mm2) ? c.cabo_mm2 : null);

  if (ib && inA && ib > inA + 0.05) {
    res.push({ regra: 'ib_in', texto: `Ib ${fmt(ib)} A > disjuntor ${fmt(inA, 0)} A` });
  }
  if (inA && secao) {
    if (positivo(c.ic_A)) {
      // Ic do projeto é o valor de tabela (sem correção): Iz = Ic × FCT × FCA
      const fct = positivo(c.fct) ? c.fct : 1;
      const fca = positivo(c.fca) ? c.fca : 1;
      const iz = c.ic_A * fct * fca;
      if (inA > iz + 0.05) {
        res.push({ regra: 'in_iz', texto: `disjuntor ${fmt(inA, 0)} A > Iz ${fmt(iz)} A (${fmt(secao)} mm², Ic ${fmt(c.ic_A)} A × FCT ${fmt(fct, 2)} × FCA ${fmt(fca, 2)})` });
      }
    } else {
      // formato sem Ic: referência B1/PVC sem fatores (o caso mais comum, eletroduto embutido)
      const ref = T.capacidade(secao, 'B1', carregados(c), 'PVC');
      if (ref && inA > ref + 0.05) {
        res.push({ regra: 'in_iz_ref', texto: `disjuntor ${fmt(inA, 0)} A > ${fmt(ref)} A que ${fmt(secao)} mm² conduz em B1/PVC (Tabela 36, antes dos fatores de correção)` });
      }
    }
  }
  if (secao) {
    const tipo = tipoCircuito(c);
    const min = tipo === 'iluminacao' ? T.SECAO_MINIMA.iluminacao : tipo ? T.SECAO_MINIMA.tug : T.SECAO_MINIMA.iluminacao;
    if (secao < min - 1e-9) {
      res.push({ regra: 'secao_min', texto: `${fmt(secao)} mm² < ${fmt(min)} mm² (${tipo === 'iluminacao' ? 'iluminação' : tipo ? 'força/tomadas' : 'qualquer circuito'})` });
    }
  }
  if (!c.alimentador && positivo(c.dv_parcial_pct) && c.dv_parcial_pct > T.QUEDA.terminal + 1e-9) {
    res.push({ regra: 'queda_terminal', texto: `queda no circuito ${fmt(c.dv_parcial_pct, 2)} % > ${T.QUEDA.terminal} %` });
  }
  if (positivo(c.dv_total_pct)) {
    if (c.dv_total_pct > T.QUEDA.total_trafo + 1e-9) {
      res.push({ regra: 'queda_total', texto: `queda total ${fmt(c.dv_total_pct, 2)} % > ${T.QUEDA.total_trafo} %` });
    } else if (c.dv_total_pct > T.QUEDA.total_bt + 1e-9) {
      res.push({ regra: 'queda_total_bt', texto: `queda total ${fmt(c.dv_total_pct, 2)} %` });
    }
  }
  const desc = `${c.circuito || ''} ${c.descricao || ''}`;
  if (RE_LOCAL_DR.test(desc) && !/\b(I?DR|DDR|RCD)\b/i.test(`${desc} ${c.esquema || ''}`)) {
    res.push({ regra: 'dr', texto: 'local que exige DR ≤ 30 mA; o quadro de cargas não indica DR' });
  }
  if (c.status && !/^ok$/i.test(String(c.status).trim())) {
    res.push({ regra: 'status', texto: `status "${c.status}" no quadro do projetista` });
  }
  return res;
}

// Tema e explicação de cada regra (a observação final lista os circuitos)
const REGRAS = {
  ib_in: { tema: 'NBR 5410: corrente de projeto maior que o disjuntor (Ib ≤ In)', nota: 'O disjuntor desarma em uso normal. Confira a carga ou o disjuntor (5.3.4.1).' },
  in_iz: { tema: 'NBR 5410: disjuntor maior que a capacidade do cabo (In ≤ Iz)', nota: 'O cabo não fica protegido contra sobrecarga. Aumente a seção ou reduza o disjuntor (5.3.4.1).' },
  in_iz_ref: { tema: 'NBR 5410: disjuntor acima da capacidade do cabo — conferir método', nota: 'O quadro não traz Ic/FCA: a referência é B1/PVC sem correção. Só atende com método ou isolação de maior capacidade (C, D, EPR/XLPE) — confira no projeto (5.3.4.1, Tabelas 36/37).' },
  secao_min: { tema: 'NBR 5410: seção abaixo da mínima', nota: 'Tabela 47: 1,5 mm² em iluminação e 2,5 mm² em força/tomadas.' },
  queda_terminal: { tema: 'NBR 5410: queda de tensão no circuito terminal acima de 4 %', nota: 'Em nenhum caso o circuito terminal pode passar de 4 % (6.2.7.2). Aumente a seção ou reduza o comprimento.' },
  queda_total: { tema: 'NBR 5410: queda de tensão total acima de 7 %', nota: 'Acima do limite de 7 % mesmo com transformador ou gerador próprio (6.2.7.1).' },
  queda_total_bt: { tema: 'NBR 5410: queda de tensão total entre 5 % e 7 %', nota: 'Só atende se a instalação tiver transformador ou gerador próprio; com entrega em baixa tensão o limite é 5 % (6.2.7.1).' },
  dr: { tema: 'NBR 5410: DR em área molhada/externa a confirmar', nota: 'Pontos em local com chuveiro/banheira, tomadas em área externa e, em habitação, pontos de cozinha, copa, lavanderia, área de serviço e garagem exigem DR de alta sensibilidade (≤ 30 mA, 5.1.3.2.2). Confirme no diagrama unifilar — iluminação externa sozinha não exige.' },
  status: { tema: 'Quadro de cargas: circuito marcado pelo próprio projetista', nota: 'O software de cálculo do projetista não deu "OK" nesse circuito — confira antes de orçar.' },
};
const LIMITE_LISTA = 12;

// Achados por arquivo e regra: "QD-1PAV / VE-03: disjuntor 25 A > Iz 16,8 A (…)"
function achadosNBR5410(arquivo, quadros) {
  const porRegra = new Map();
  for (const q of quadros || []) {
    for (const c of q.circuitos || []) {
      for (const r of conferirCircuito(c)) {
        if (!porRegra.has(r.regra)) porRegra.set(r.regra, []);
        porRegra.get(r.regra).push(`${q.quadro ? `${q.quadro} / ` : ''}${c.circuito}: ${r.texto}`);
      }
    }
  }
  return Object.keys(REGRAS).filter(k => porRegra.has(k)).map(k => {
    const itens = porRegra.get(k);
    const lista = itens.slice(0, LIMITE_LISTA).join('; ') + (itens.length > LIMITE_LISTA ? ` (+${itens.length - LIMITE_LISTA})` : '');
    return { tema: REGRAS[k].tema, observacao: `"${arquivo}": ${lista}. ${REGRAS[k].nota}` };
  });
}

module.exports = { conferirCircuito, achadosNBR5410 };
