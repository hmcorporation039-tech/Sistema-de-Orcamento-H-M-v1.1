// Memorial descritivo e de cálculo — SPDA e MPS (NBR 5419:2026, partes 1 a 4).

const B = require('../../../_comum/docx-base');
const C = require('./doc-comum');
const { rotuloNp } = require('./dimensionamento');

function gerarMemorial(res) {
  const { dados, risco, dim } = res;
  const est = dados.estrutura;
  const obra = dados.obra || {};
  const spda = dados.spda || {};
  const f = [];

  f.push(...B.capa('MEMORIAL DESCRITIVO E DE CÁLCULO — SPDA E MPS', 'ABNT NBR 5419:2026 (partes 1 a 4)'));
  f.push(C.blocoIdentificacao(dados));

  f.push(B.titulo('1. Descrição da estrutura'));
  f.push(B.p(`${obra.nome || 'Estrutura'}: ${B.fmtNum(est.L)} × ${B.fmtNum(est.W)} m em planta, ${B.fmtNum(est.H)} m de altura, ` +
    `${obra.pavimentos ? `${obra.pavimentos} pavimento(s), ` : ''}${obra.area_construida_m2 ? `área construída ${B.fmtNum(obra.area_construida_m2, 0)} m², ` : ''}` +
    `construção em ${String(est.tipo_construcao).replace(/_/g, ' ')}, ambiente ${est.ambiente}. Uso: ${obra.uso || '(informar)'}.`));

  f.push(B.titulo('2. Análise de risco'));
  if (risco) {
    const a = risco.atual;
    f.push(B.p(`Conforme o relatório de análise de risco anexo (NBR 5419-2:2026): R1 = ${B.fmtExp(a.R1)} contra RT = 1,0e-05 — ` +
      `${a.atendeR1 ? 'o risco tolerável é atendido' : 'o risco tolerável NÃO é atendido com as medidas atuais — ver recomendações do relatório'}. ` +
      `${a.piorF ? `Frequência de danos da zona mais solicitada: F = ${B.fmtExp(a.piorF.F)} (FT = ${B.fmtNum(a.piorF.FT)}, ${a.atendeF ? 'atende' : 'não atende'}). ` : ''}` +
      `Nível de proteção do SPDA adotado: NP ${spda.np}.`));
    if (risco.menorQueAtende && !(a.atendeR1 && a.atendeF)) {
      f.push(B.p(`Menor combinação que atende ao risco tolerável: SPDA ${risco.menorQueAtende.np_spda.replace('_', ' ')} com DPS NP ${rotuloNp(risco.menorQueAtende.dps_np)}.`, { bold: true }));
    }
  } else {
    f.push(B.p('Análise de risco não incluída neste memorial. [CONFERIR] — anexar o relatório da NBR 5419-2.'));
  }

  if (dim) {
    const cap = dim.captacao;
    f.push(B.titulo('3. SPDA externo (NBR 5419-3:2026)'));
    f.push(B.p(`SPDA ${spda.isolado ? 'isolado' : 'não isolado'}. Captação em malha com módulo máximo ${cap.modulo_max_m} × ${cap.modulo_max_m} m ` +
      `(esfera rolante R = ${cap.raio_esfera_m} m, Tabela 2), resultando em módulos de ${B.fmtNum(cap.modulo_m[0])} × ${B.fmtNum(cap.modulo_m[1])} m (${cap.divisoes[0]} × ${cap.divisoes[1]}), ` +
      `com ${B.fmtNum(cap.comprimento_m, 0)} m de condutor em ${cap.material} fixado a cada 1,0 m (5.6.2.2). Captores nos cantos salientes, pontas expostas e beiradas (5.3.2.1).`));
    f.push(B.p(`${dim.descidas.quantidade} descidas, espaçamento médio ${B.fmtNum(dim.descidas.espacamento_medio_m, 1)} m (Tabela 5: ${dim.descidas.espacamento_tabela_m} m, admitido até +20 % = ${B.fmtNum(dim.descidas.espacamento_max_permitido_m, 1)} m), ` +
      (dim.descidas.naturais
        ? 'naturais pelas armaduras do concreto, com continuidade conforme 5.4.5 e conexão de ensaio a 1,5 m do piso (5.4.6).'
        : `não naturais em ${dim.descidas.material}, retilíneas e verticais, com conexão de ensaio a 1,5 m do piso (5.4.6).`)));
    if (dim.descidas.aneis_intermediarios) {
      f.push(B.p(`Descidas interligadas por ${dim.descidas.aneis_intermediarios} anel(éis) intermediário(s) horizontal(is) no perímetro, a cada ${dim.descidas.espacamento_tabela_m} m de altura (espaçamento da Tabela 5; estrutura acima de 20 m — 5.4.1.2), ${B.fmtNum(dim.descidas.aneis_comprimento_m, 0)} m de condutor. [CONFERIR espaçamento na NBR 5419-3:2026]`));
    }
    if (cap.lateral && cap.lateral.exigida) {
      f.push(B.p(`Estrutura com altura acima de 60 m: captação lateral nos 20 % superiores (${B.fmtNum(cap.lateral.faixa_m, 1)} m), 5.3.2.14 — ` +
        (cap.lateral.aneis
          ? `${cap.lateral.aneis} anel(éis) horizontal(is) no perímetro da fachada, ${B.fmtNum(cap.lateral.comprimento_m, 0)} m de condutor.`
          : 'feita pelos anéis intermediários de descida que caem nessa faixa.') +
        ' Elementos metálicos da fachada podem servir de captor natural se atenderem à Tabela 7. [CONFERIR]'));
    }
    if (cap.captores_verticais.length) {
      f.push(B.titulo('3.1 Captores verticais — verificação pela esfera rolante', 2));
      f.push(B.tabela(['Captor', 'Ponta (m)', ...cap.captores_verticais[0].raio_por_plano.map(r => `Raio no plano ${r.plano} (${B.fmtNum(r.cota_m)} m)`)],
        cap.captores_verticais.map(c => [c.id + (c.descricao ? ` — ${c.descricao}` : ''), B.fmtNum(c.cota_ponta_m), ...c.raio_por_plano.map(r => `${B.fmtNum(r.raio_m, 1)} m`)]),
        [2.4, 0.8, ...cap.captores_verticais[0].raio_por_plano.map(() => 1.2)]));
      if (cap.cobertura_por_plano) {
        f.push(B.p(`Fração da cobertura dentro do volume protegido pelos captores: ${cap.cobertura_por_plano.map(c => `${c.plano} ${B.fmtNum(c.fracao * 100, 0)} %`).join('; ')}. O restante deve ser protegido pela malha (módulo ≤ ${cap.modulo_max_m} × ${cap.modulo_max_m} m).`));
      }
      f.push(B.nota('Raio protegido no plano = √(2·R·h − h²), h = altura da ponta do captor acima do plano (NBR 5419-3:2026, Anexo A).'));
    }

    const at = dim.aterramento;
    f.push(B.titulo('4. Aterramento e equipotencialização'));
    f.push(B.p(`Anel de aterramento em ${at.material} a no mínimo 0,5 m de profundidade e cerca de 1 m das paredes (≈ ${B.fmtNum(at.anel_m, 0)} m), interligado às armaduras de fundação (5.5.3). ` +
      `Raio médio da área do eletrodo re = ${B.fmtNum(at.re_m, 1)} m; comprimento mínimo l1 = ${at.l1_m == null ? '[CONFERIR — informar a resistividade do solo para NP I/II]' : `${B.fmtNum(at.l1_m, 1)} m`} (Figura 3). ` +
      (at.atende_re_l1 === false
        ? `Como re < l1, o eletrodo deve ser complementado em cada descida por eletrodo radial de ${B.fmtNum(at.complemento_radial_m, 1)} m ou vertical de ${B.fmtNum(at.complemento_vertical_m, 1)} m (5.5.2.4).`
        : at.atende_re_l1 ? 'Como re ≥ l1, não é exigida complementação (5.5.2.3 b); as hastes listadas são complementares.' : '')));
    f.push(B.p('A resistência de aterramento não é critério de aceitação do SPDA (NBR 5419-3:2026, 7.1.4); a eficácia é verificada pela continuidade elétrica (Anexo F). ' +
      `BEP ligado diretamente ao aterramento${dim.equipotencializacao.bel_recomendados ? ` e ${dim.equipotencializacao.bel_recomendados} BEL ao longo das paredes externas (estrutura com mais de 20 m — 6.2.2.2 b)` : ''}. ` +
      'Todas as linhas e partes metálicas que entram na estrutura são ligadas ao BEP no ponto de entrada (6.2.3 e 6.2.4); seções mínimas pelas Tabelas 9 e 10.'));

    const ds = dim.distanciaSeguranca;
    f.push(B.titulo('5. Distância de segurança'));
    f.push(B.p(ds.nao_aplicavel_naturais
      ? 'As descidas são naturais (armaduras contínuas): pelo 6.3.1.4, o cálculo da distância de segurança não se aplica entre os sistemas internos e esses componentes naturais. Para elementos próximos da captação na cobertura, aplicar o cálculo abaixo.'
      : 'Distância de segurança entre o SPDA e as instalações metálicas e sistemas internos (6.3.2, Eq. 5):'));
    f.push(B.tabela(['ki (Tab. 11)', 'kc (Tab. 13)', 'l (m)', 's no ar (km = 1)', 's em sólido (km = 0,5)'],
      [[B.fmtNum(ds.ki), B.fmtNum(ds.kc), B.fmtNum(ds.l_m), `${B.fmtNum(ds.s_ar_m, 3)} m`, `${B.fmtNum(ds.s_solido_m, 3)} m`]]));
  }

  f.push(B.titulo('6. Medidas de proteção contra surtos (MPS)'));
  const linhasMps = [];
  (dados.zonas || []).forEach(z => (z.sistemas || []).forEach(s => linhasMps.push([z.nome, s.nome, `${B.fmtNum(s.uw_kv)} kV`, rotuloNp(s.dps_np || 'nenhum'), String(s.ks3 || '').replace(/_/g, ' ')])));
  if (linhasMps.length) {
    f.push(B.tabela(['Zona', 'Sistema interno', 'UW', 'DPS coordenados (NP)', 'Fiação interna (KS3)'], linhasMps, [2.2, 2, 0.7, 1.3, 1.5]));
    f.push(B.nota('DPS coordenados conforme a NBR 5419-4:2026, Seção 7, com nível de proteção Up abaixo da suportabilidade UW dos equipamentos; DPS classe I nas entradas de linhas metálicas (NBR 5419-3:2026, 6.2.4).'));
  } else {
    f.push(B.p('Sem sistemas internos declarados. [CONFERIR]'));
  }

  if (dim) {
    f.push(B.titulo('7. Lista de materiais (preliminar)'));
    f.push(B.tabela(['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'],
      dim.materiais.map(m => [m.codigo, m.descricao, m.unidade, B.fmtNum(m.quantidade, 1), m.referencia]), [0.8, 4, 0.5, 0.7, 2]));
    f.push(B.nota('Quantidades de condutor com 10 % de folga para emendas e sobras. Lista preliminar: confirmar no projeto executivo e no levantamento de campo.'));
  }

  f.push(B.titulo('8. Plano de inspeção'));
  f.push(B.p(`Inspeção periódica a cada ${res.intervalo === 1 ? '1 ano' : '3 anos'} (NBR 5419-3:2026, 7.3.2 f)${res.intervalo === 1 ? ', por se tratar de estrutura de serviço essencial, área classificada, ambiente corrosivo ou com explosivos' : ''}, e após modificações na estrutura ou no SPDA e após descarga atmosférica na estrutura (7.3.2 c a e). ` +
    'Verificação de continuidade pelo Anexo F (instrumento de 4 fios, 1 A a 5 A, CC ou frequência diferente de 60 Hz). DPS: intervalo do SPDA ou do fabricante, o que for menor.'));

  const desenhos = dados.desenhos || ['SPDA-01 Planta de cobertura', 'SPDA-02 Fachadas', 'SPDA-03 Aterramento', 'SPDA-04 Equipotencialização, DPS e ZPR'];
  f.push(B.titulo('9. Desenhos'));
  desenhos.forEach(d => f.push(B.marcador(d)));

  f.push(...C.blocoNormas());
  f.push(...C.blocoAssinatura(dados));
  return B.criarDocumento({ tituloCurto: 'Memorial descritivo e de cálculo — SPDA', identificacao: C.identificacaoDocumento(dados, 'MEM'), filhos: f });
}

module.exports = { gerarMemorial };
