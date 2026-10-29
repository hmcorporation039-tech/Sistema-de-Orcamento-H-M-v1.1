// Relatório de análise de risco — ABNT NBR 5419-2:2026.

const B = require('../../../_comum/docx-base');
const C = require('./doc-comum');
const { rotuloNp } = require('./dimensionamento');

const ROTULO_NP_SPDA = {
  nenhum: 'sem SPDA', IV: 'NP IV', III: 'NP III', II: 'NP II', I: 'NP I',
  I_descida_natural: 'NP I + descida natural (PB 0,01)', cobertura_metalica_natural: 'cobertura metálica natural (PB 0,001)',
};

// Corpo da análise (seções 1 a 6), usado pelo relatório avulso e, desde
// 29/10/2026, também dentro do laudo de SPDA e aterramento (seção 9 do modelo
// HM). Com `secao`, os títulos viram subseções numeradas (9.1, 9.2…) e o nome
// de cada zona sai em negrito em vez de título.
function corpoRisco(res, { secao } = {}) {
  const { dados, risco } = res;
  const { atual, semProtecao, cenarios, menorQueAtende } = risco;
  const est = dados.estrutura;
  const ev = atual.eventos;
  const f = [];
  const tit = (n, texto) => B.titulo(secao ? `${secao}.${n} ${texto}` : `${n}. ${texto}`, secao ? 2 : 1);
  const titZona = (texto) => (secao ? B.p(texto, { bold: true, before: 120, after: 60, keepNext: true }) : B.titulo(texto, 2));

  // 1. Objeto e premissas
  f.push(tit(1, 'Objeto e premissas'));
  f.push(B.p(`Estrutura de ${B.fmtNum(est.L)} × ${B.fmtNum(est.W)} m, altura ${B.fmtNum(est.H)} m, ${String(est.tipo_construcao).replace(/_/g, ' ')}, em ${est.municipio}/${est.uf}. ` +
    `Densidade de descargas atmosféricas para a terra NG = ${B.fmtNum(ev.ng)} descargas/km²/ano (${ev.ngFonte || 'NBR 5419-2:2026, Tabela F.1'}). ` +
    'Pelo Anexo F (F.1.1), o NG foi tomado exclusivamente da Tabela F.1 da norma.'));
  f.push(B.p(`Tipos de perda considerados: L1 (perda de vida humana)${atual.R3 > 0 ? ' e L3 (patrimônio cultural)' : ''}. ` +
    'As componentes RC, RM, RW e RZ entram em R1 apenas nas zonas em que a falha dos sistemas internos põe a vida em risco (LO > 0 na Tabela C.2). ' +
    `A frequência de danos F de cada zona é comparada com a frequência tolerável FT (Seção 7): ${est.sistemas_criticos ? 'sistemas críticos, FT = 0,1/ano (7.3.4)' : 'sistemas não críticos, FT = 1/ano (7.3.4)'}.`));
  f.push(B.p(`Número total de pessoas considerado na estrutura: nt = ${atual.nt}. Os valores de pessoas por zona (nz) e de tempo de permanência (tz) são premissas a confirmar com o responsável pela estrutura.`));
  // premissas incoerentes (linha de sinal com CT de AT, pânico × pessoas, NP × as built — consistencia.js)
  (res.avisos || []).filter(a => a.onde === 'risco').forEach(a => f.push(B.p(a.texto)));

  // 2. Eventos perigosos
  f.push(tit(2, 'Áreas de exposição e número de eventos perigosos'));
  f.push(B.tabela(['Grandeza', 'Valor', 'Referência'], [
    ['AD — área de exposição da estrutura (m²)', B.fmtNum(ev.AD, 1), 'Eq. A.1/A.2'],
    ['CD — fator de localização', B.fmtNum(ev.CD), `Tabela A.1 (${est.localizacao})`],
    ['ND — descargas na estrutura (1/ano)', B.fmtExp(ev.ND), 'Eq. A.3'],
    ['AM — área de exposição próximo da estrutura (m²)', B.fmtNum(ev.AM, 0), 'Eq. A.6'],
    ['NM — descargas próximo da estrutura (1/ano)', B.fmtExp(ev.NM), 'Eq. A.5'],
  ], [3, 1.3, 1.6]));
  if (ev.linhas.length) {
    f.push(B.espaco(80));
    f.push(B.tabela(['Linha', 'Tipo', 'CI', 'CT', 'CE', 'AL (m²)', 'AI (m²)', 'NL (1/ano)', 'NI (1/ano)'],
      ev.linhas.map(l => [l.id, l.tipo, B.fmtNum(l.CI), B.fmtNum(l.CT), B.fmtNum(l.CE), B.fmtNum(l.AL, 0), B.fmtNum(l.AI, 0), B.fmtExp(l.NL), B.fmtExp(l.NI)]),
      [1.4, 0.9, 0.6, 0.6, 0.6, 1, 1.1, 1, 1]));
    f.push(B.nota(ev.linhas.map(l => `${l.id}: ${l.nome || ''} — LL = ${B.fmtNum(l.LL, 0)} m${l.LL_m ? '' : ' (comprimento desconhecido, A.4.1)'}`).join('; ')));
  }

  // 3. Zonas
  f.push(tit(3, 'Zonas de estudo e componentes de risco'));
  for (const z of atual.zonas) {
    f.push(titZona(z.zona.nome));
    const comps = Object.entries(z.comp).filter(([k, v]) => z.zona.tipo !== 'externa' || k === 'RA' || v);
    f.push(B.tabela(comps.map(([k]) => k), [comps.map(([, v]) => B.fmtExp(v))], comps.map(() => 1)));
    const linhaR = `R1 da zona = ${B.fmtExp(z.R1)}${z.FT != null ? `   |   F = ${B.fmtExp(z.F)} (FT = ${B.fmtNum(z.FT)})` : ''}${z.FT != null && !z.incluiD3 ? '   |   RC, RM, RW e RZ fora de R1 (LO = 0)' : ''}`;
    f.push(B.p(linhaR, { bold: true, before: 60 }));
    if (z.ftIgnorado != null) {
      f.push(B.nota(`FT informado para a zona (${z.ftIgnorado}) ignorado: é menos restritivo que o da norma (FT = ${B.fmtNum(z.ftNorma)}/ano${est.sistemas_criticos ? ', sistemas críticos — não pode ser alterado' : ''}). Só se aceita FT menor que o da norma.`));
    }
    f.push(B.tabela(['Fator', 'Valor', 'Fonte', 'Nota'],
      z.fatores.map(x => [x.fator, typeof x.valor === 'number' ? (x.valor !== 0 && Math.abs(x.valor) < 0.001 ? B.fmtExp(x.valor) : B.fmtNum(x.valor, 6)) : x.valor, x.fonte, x.nota]),
      [1.6, 0.9, 2, 3.2], { tamanho: 15 }));
  }

  // 4. Resultado
  f.push(tit(4, 'Resultado'));
  const linhasRes = [
    [`R1 (RT = ${B.fmtExp(atual.RT.R1)})`, B.fmtExp(atual.R1), atual.atendeR1 ? 'ATENDE' : 'NÃO ATENDE'],
  ];
  if (atual.R3 > 0) linhasRes.push([`R3 (RT = ${B.fmtExp(atual.RT.R3)})`, B.fmtExp(atual.R3), atual.atendeR3 ? 'ATENDE' : 'NÃO ATENDE']);
  if (atual.piorF) linhasRes.push([`F da zona mais solicitada (${atual.piorF.zona.slice(0, 40)}) × FT = ${B.fmtNum(atual.piorF.FT)}`, B.fmtExp(atual.piorF.F), atual.atendeF ? 'ATENDE' : 'NÃO ATENDE']);
  f.push(B.tabela(['Grandeza', 'Valor (1/ano)', 'Situação'], linhasRes, [3.4, 1.2, 1.2],
    { destacarColuna: (l, i) => i === 2 ? (l[2] === 'ATENDE' ? 'E2EFDA' : 'F8CBAD') : undefined }));
  f.push(B.p(`Cenário sem qualquer proteção (sem SPDA, sem DPS, sem cuidados de roteamento e sem malha equipotencial): R1 = ${B.fmtExp(semProtecao.R1)} (${semProtecao.atendeR1 ? 'ATENDE' : 'NÃO ATENDE'}). ` +
    `Cenário avaliado: ${dados.spda && dados.spda.np ? `SPDA NP ${dados.spda.np}` : 'sem SPDA'}${resumoDps(dados)}.`, { before: 80 }));

  // 5. Cenários
  f.push(tit(5, 'Cenários de proteção (varredura)'));
  f.push(B.p('Combinações de nível de proteção do SPDA, nível de proteção dos DPS (PSPD dos sistemas internos e PEB das entradas) e fibra óptica nas linhas de sinal metálicas, ordenadas da menor para a maior exigência (NBR 5419-2:2026, 5.6). Lista dos cenários que atendem a R1 ≤ RT e F ≤ FT:'));
  const atendem = cenarios.filter(c => c.atende).slice(0, 12);
  if (atendem.length) {
    f.push(B.tabela(['NP do SPDA', 'NP dos DPS', 'Fibra óptica', 'R1', 'F (pior zona)', 'Resultado'],
      atendem.map(c => [ROTULO_NP_SPDA[c.np_spda] || c.np_spda, rotuloNp(c.dps_np), c.fibra ? 'sim' : 'não', B.fmtExp(c.R1), B.fmtExp(c.F), 'ATENDE']),
      [1.8, 1.8, 0.9, 1, 1, 1]));
    if (atendem.some(c => c.dps_np === 'melhor_I_max')) {
      f.push(B.nota('PSPD = PEB = 0,001 corresponde ao limite inferior da faixa "melhor do que NP I" (Tabelas B.3 e B.7, nota 2): exige DPS com corrente nominal maior e nível de proteção Up menor que os requeridos para NP I, comprovados pelos dados do fabricante.'));
    }
  } else {
    f.push(B.p('Nenhuma combinação da varredura atende ao risco tolerável. Pela NBR 5419-2:2026, 5.4.6, o proprietário deve ser informado e deve ser providenciado o mais alto nível de proteção; avaliar também medidas que reduzem as perdas (rp, rf, hz) e a divisão em zonas.', { bold: true }));
  }

  // 6. Conclusão
  f.push(tit(6, 'Conclusão e recomendação'));
  f.push(B.p(conclusao(atual, menorQueAtende)));
  return f;
}

function gerarRelatorioRisco(res) {
  const { dados } = res;
  const f = [];
  f.push(...B.capa('RELATÓRIO DE ANÁLISE DE RISCO', 'ABNT NBR 5419-2:2026 — Gerenciamento de risco'));
  f.push(C.blocoIdentificacao(dados));
  f.push(...corpoRisco(res));

  f.push(...C.blocoNormas());
  f.push(B.nota('Este relatório é resultado de cálculo com as premissas declaradas e deve ser revisado e assinado pelo responsável técnico habilitado.'));
  f.push(...C.blocoAssinatura(dados));

  return B.criarDocumento({ tituloCurto: 'Relatório de análise de risco — NBR 5419-2', identificacao: C.identificacaoDocumento(dados, 'RISCO'), filhos: f });
}

function resumoDps(dados) {
  const nps = new Set();
  (dados.zonas || []).forEach(z => (z.sistemas || []).forEach(s => s.dps_np && nps.add(s.dps_np)));
  return nps.size ? ` e DPS coordenados NP ${[...nps].map(rotuloNp).join(' / ')}` : '';
}

function conclusao(atual, menor) {
  if (atual.atendeR1 && atual.atendeF) {
    return `Com as medidas consideradas, o risco de perda de vida humana R1 = ${B.fmtExp(atual.R1)} atende ao risco tolerável RT = 10⁻⁵ e a frequência de danos atende a FT em todas as zonas. Manter o nível de proteção adotado e as medidas de proteção contra surtos.`;
  }
  const partes = [];
  if (!atual.atendeR1) partes.push(`o risco R1 = ${B.fmtExp(atual.R1)} excede o tolerável RT = 10⁻⁵`);
  if (!atual.atendeF) partes.push(`a frequência de danos F = ${B.fmtExp(atual.piorF.F)} excede FT = ${B.fmtNum(atual.piorF.FT)} na zona "${atual.piorF.zona}"`);
  let texto = `Com as medidas consideradas, ${partes.join(' e ')}. `;
  if (menor) {
    texto += `A combinação de menor exigência que atende é: ${ROTULO_NP_SPDA[menor.np_spda] || menor.np_spda}, DPS coordenados NP ${rotuloNp(menor.dps_np)}${menor.fibra ? ' e fibra óptica nas linhas de sinal' : ''} (R1 = ${B.fmtExp(menor.R1)}). Recomenda-se revisar o projeto para esse nível, ou justificar outra solução por nova análise de risco.`;
  } else {
    texto += 'Nenhuma combinação avaliada atende; o proprietário deve ser informado e o mais alto nível de proteção deve ser adotado (5.4.6).';
  }
  return texto;
}

module.exports = { gerarRelatorioRisco, corpoRisco, resumoDps, ROTULO_NP_SPDA };
