// Laudo técnico de inspeção do SPDA — NBR 5419-3:2026, Seção 7.
// Mesma estrutura do laudo HM do São Bento (R06), com as correções:
// NCs sem duplicidade, recomendação própria por NC, ensaios com rótulos e
// critérios do Anexo F de 2026 e parecer coerente com o checklist.

const fs = require('fs');
const path = require('path');
const {
  Table, TableRow, TableCell, Paragraph, WidthType, TableLayoutType, AlignmentType, BorderStyle,
} = require('docx');
const B = require('../../../_comum/docx-base');
const C = require('./doc-comum');
const PR = require('./parecer-risco');

const TIPO_INSPECAO = {
  durante_instalacao: 'Durante a instalação do SPDA (7.3.2 a)',
  apos_instalacao: 'Após a instalação, na emissão do as built (7.3.2 b)',
  alteracao: 'Após alteração física, de uso ou do SPDA (7.3.2 c e d)',
  descarga: 'Após suspeita de descarga atmosférica na estrutura ou atuação de DPS classe I (7.3.2 e)',
  periodica: 'Inspeção periódica (7.3.2 f)',
  provisorio: 'SPDA provisório de etapa de obra — após a instalação (7.3.2 b), com nova inspeção obrigatória após a implantação definitiva (7.3.2 c)',
};

const SECOES_CHECKLIST = ['Documentação', 'Captação', 'Descidas', 'Aterramento', 'Equipotencialização', 'DPS'];

function corSituacao(s) {
  return { C: 'E2EFDA', NC: 'F8CBAD', NV: 'FFF2CC', NA: 'EDEDED' }[s];
}

function resolverFoto(arquivo, res) {
  if (!arquivo) return null;
  const candidatos = [arquivo];
  if (!path.isAbsolute(arquivo)) {
    if (res.pastaFotos) candidatos.push(path.join(res.pastaFotos, arquivo));
    if (res.baseDir) candidatos.push(path.join(res.baseDir, arquivo));
  } else if (res.pastaFotos) {
    candidatos.push(path.join(res.pastaFotos, path.basename(arquivo)));
  }
  return candidatos.find(c => fs.existsSync(c)) || null;
}

function gradeFotos(fotos, res) {
  const largura = 4819; // metade da área útil (twips)
  const celulas = fotos.map(ft => {
    const arq = resolverFoto(ft.arquivo, res);
    const img = arq ? B.imagem(arq, Math.min(ft.largura_cm || 8, 8), { alturaMaxCm: 7 }) : null;
    return new TableCell({
      width: { size: largura, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: img ? [img] : B.runs('[foto não encontrada — anexar]', { italics: true, color: B.COR.suave }) }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: B.runs(`${ft.id} — ${ft.descricao}`, { size: 16 }) }),
      ],
    });
  });
  const linhas = [];
  for (let i = 0; i < celulas.length; i += 2) {
    const par = celulas.slice(i, i + 2);
    if (par.length === 1) par.push(new TableCell({ width: { size: largura, type: WidthType.DXA }, children: [new Paragraph('')] }));
    linhas.push(new TableRow({ cantSplit: true, children: par }));
  }
  const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new Table({
    rows: linhas, columnWidths: [largura, largura], width: { size: largura * 2, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    borders: { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda, insideHorizontal: semBorda, insideVertical: semBorda },
  });
}

function capitalizar(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// Junta a observação com as fotos sem repetir referência que já está no texto.
function obsComFoto(obs, foto) {
  const texto = String(obs || '').trim();
  const refs = String(foto || '').split(',').map(x => x.trim()).filter(Boolean);
  const faltam = refs.filter(r => !texto.includes(r));
  return [texto, faltam.length ? `(${faltam.length > 1 ? 'fotos' : 'foto'} ${faltam.join(', ')})` : ''].filter(Boolean).join(' ');
}

function gerarLaudo(res) {
  const { dados, dim, checklist, ncs, ensaios, parecer } = res;
  const { cliente = {}, obra = {}, responsavel = {}, meta = {} } = dados;
  const est = dados.estrutura;
  const spda = dados.spda || {};
  const insp = dados.inspecao || {};
  const prov = dados.spda_provisorio;
  const f = [];

  // Capa
  f.push(...B.capa('LAUDO TÉCNICO DE INSPEÇÃO DO SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS (SPDA)',
    `Tipo de inspeção: ${TIPO_INSPECAO[insp.tipo] || TIPO_INSPECAO.periodica} — ABNT NBR 5419-3:2026, Seção 7`));
  f.push(B.tabelaKV([
    ['Cliente', cliente.nome],
    ['Estrutura/edificação', obra.nome],
    ['Endereço', C.enderecoCompleto(cliente)],
    ['Documento nº / revisão', `${insp.documento_n || '(preencher)'} / ${meta.revisao || 'R00'}`],
    ['Data de emissão', B.fmtData(meta.data)],
    ['Data(s) da inspeção em campo', B.fmtData(insp.data_inspecao) || '(preencher)'],
    ['ART nº', responsavel.art || '(preencher)'],
  ]));
  // Emissão anterior à vistoria é erro de revisão (a R06 do São Bento saiu
  // datada de 07/10 citando fotos de 09/10).
  if (meta.data && insp.data_inspecao && String(meta.data) < String(insp.data_inspecao)) {
    f.push(B.nota('[CONFERIR] A data de emissão é anterior à data da inspeção em campo — ajustar antes de assinar.'));
  }

  // 1. Identificação
  f.push(B.titulo('1. Identificação'));
  f.push(B.titulo('1.1 Contratante / responsável pela estrutura', 2));
  f.push(B.tabelaKV([
    ['Razão social', cliente.nome], ['CNPJ', cliente.cnpj], ['Endereço da estrutura', cliente.endereco],
    ['Responsável/contato no local', cliente.contato], ['Atividade/uso', obra.uso],
  ]));
  f.push(B.titulo('1.2 Empresa executora e responsável técnico', 2));
  f.push(B.tabelaKV([
    ['Empresa', responsavel.empresa || 'H&M Engenharia e Tecnologia LTDA'], ['CNPJ', responsavel.cnpj],
    ['Responsável técnico', responsavel.nome], ['Título / CREA', `${responsavel.titulo || 'Engenheiro Eletricista'} — CREA ${responsavel.crea || '(preencher)'}`],
    ['ART', responsavel.art], ['Equipe de campo', insp.equipe],
  ]));

  // 2. Objetivo e escopo
  f.push(B.titulo('2. Objetivo e escopo'));
  f.push(B.p(PR.textoObjetivo(res)));
  f.push(B.tabelaKV([
    ['Abrangência', insp.abrangencia || '(informar)'],
    ['Fora do escopo / não inspecionado', insp.fora_escopo || '—'],
    ['Itens adicionais', insp.itens_adicionais || '—'],
  ]));

  // 3. Normas e documentos
  f.push(B.titulo('3. Normas e documentos de referência'));
  f.push(B.tabela(['Documento', 'Aplicação'], [
    ['ABNT NBR 5419-1:2026', 'Princípios gerais'], ['ABNT NBR 5419-2:2026', 'Análise de risco'],
    ['ABNT NBR 5419-3:2026', 'Critérios de inspeção, ensaios (Anexo F) e documentação'], ['ABNT NBR 5419-4:2026', 'Inspeção de MPS/DPS (Seção 9)'],
    ['ABNT NBR 15749:2009', 'Medição de resistência de aterramento (informativa)'], ['ABNT NBR 7117-1', 'Resistividade do solo (quando aplicável)'],
    ['ABNT NBR 5410:2004', 'Interface com equipotencialização e DPS'], ['NR-10 e NR-35', 'Segurança da equipe'],
  ], [1.4, 2.6]));
  if (insp.norma_origem) {
    f.push(B.p(`Norma de origem do projeto existente: ${insp.norma_origem}. Conforme a NBR 5419-3:2026, 7.3.1 a), o SPDA existente foi verificado quanto à aderência ao seu projeto e à norma de origem; ampliações, reformas e novas instalações posteriores foram verificadas contra a edição vigente.`, { before: 80 }));
  }
  if (insp.justificativa_norma) f.push(B.p(insp.justificativa_norma));
  if ((insp.documentos || []).length) {
    f.push(B.tabela(['Documento recebido do cliente', 'Recebido?', 'Data/rev.', 'Situação'],
      insp.documentos.map(d => [d.documento, d.recebido, d.data_rev, d.situacao]), [3, 0.8, 1, 2.2]));
  }

  // 4. Descrição
  f.push(B.titulo('4. Descrição da estrutura e do SPDA'));
  f.push(B.titulo('4.1 Dados gerais', 2));
  const perimetro = dim ? dim.perimetro : 2 * (est.L + est.W);
  f.push(B.tabelaKV([
    ['Uso / ocupação', obra.uso],
    ['Dimensões (C × L × H)', `${B.fmtNum(est.L)} × ${B.fmtNum(est.W)} × ${B.fmtNum(est.H)} m; perímetro ${B.fmtNum(perimetro, 0)} m${est.dimensoes_estimadas ? ' [CONFERIR]' : ''}`],
    ['Tipo construtivo', capitalizar(String(est.tipo_construcao || '').replace(/_/g, ' '))],
    ['Ambiente', capitalizar(String(est.ambiente || '').replace(/_/g, ' '))],
    ['Serviço essencial', insp.servico_essencial ? 'Sim' : 'Não'],
    ['NP de projeto', spda.np || '—'],
    ['Descidas', spda.descida_natural ? 'naturais (armaduras)' : 'não naturais'],
    ['Contador de descargas', (insp.contador_anterior || insp.contador_atual) ? `${insp.contador_anterior || '—'} → ${insp.contador_atual || '—'}` : 'Não informado — verificar em campo (DP7)'],
  ]));
  if ((insp.dados_projeto || []).length) {
    f.push(B.titulo('4.2 Dados obtidos dos documentos recebidos', 2));
    f.push(B.tabela(['Dado', 'Valor', 'Fonte'], insp.dados_projeto.map(d => [d.dado, d.valor, d.fonte]), [1.3, 3.6, 1.5], { tamanho: 16 }));
    f.push(B.nota('Valores marcados [CONFERIR] foram estimados a partir dos desenhos e devem ser confirmados em campo antes da emissão.'));
  }
  if (prov) {
    f.push(B.titulo('4.3 SPDA provisório — etapa de obra', 2));
    if (prov.descricao) f.push(B.p(prov.descricao));
    f.push(B.tabelaKV([
      ['Etapa atual', prov.etapa], ['Configuração definitiva prevista', prov.definitivo],
      ['Previsão de implantação definitiva', prov.previsao || '(informar)'], ['Validade deste laudo', prov.validade],
    ]));
    if ((prov.partes || []).length) {
      f.push(B.espaco(80));
      f.push(B.tabela(['Subsistema', 'Situação nesta etapa', 'Referência'], prov.partes.map(x => [x.subsistema, x.situacao, x.referencia]), [1.6, 3, 1.3]));
    }
  }
  f.push(B.titulo('4.4 Enquadramento da periodicidade', 2));
  const motivos = [];
  if (insp.servico_essencial) motivos.push('prestador de serviço essencial (apoio à vida, energia, água ou sinais)');
  if (insp.area_classificada) motivos.push('áreas classificadas 0, 1, 20 ou 21');
  if (insp.corrosao_severa) motivos.push('exposição à corrosão atmosférica severa');
  if (insp.explosivos) motivos.push('munição, explosivos ou componentes tóxicos');
  f.push(B.p(res.intervalo === 1
    ? `Pela ABNT NBR 5419-3:2026, 7.3.2 f), a estrutura se enquadra no intervalo de 1 ano entre inspeções periódicas, por ser: ${motivos.join('; ')}.`
    : 'Pela ABNT NBR 5419-3:2026, 7.3.2 f), a estrutura se enquadra no intervalo de 3 anos entre inspeções periódicas (demais estruturas).'));

  // 5. Metodologia
  f.push(B.titulo('5. Metodologia'));
  [
    'Análise documental: conferência da documentação de projeto/as built com a norma de origem e dos itens do 7.5.3 da NBR 5419-3:2026.',
    'Inspeção visual de todos os subsistemas acessíveis, com registro fotográfico numerado, conforme 7.3.3 a) a h).',
    'Verificações dimensionais: seções e espessuras, espaçamento entre descidas, distâncias de fixação e de segurança.',
    'Ensaio de continuidade elétrica conforme o Anexo F: instrumento a 4 fios, 1 A a 5 A, em CC ou frequência diferente de 60 Hz e múltiplos; não se usa multímetro nem terrômetro-alicate (F.1.3.3).',
    'Medição de resistência de aterramento não é necessária para verificar a eficácia do SPDA (7.1.4); quando realizada, é informativa.',
    'Inspeção de DPS/MPS conforme 7.3.5 da NBR 5419-3 e Seção 9 da NBR 5419-4:2026.',
    'Segurança: atividades sem ameaça de tempestade (7.1.2); trabalho em altura conforme NR-35 e intervenções em painéis conforme NR-10.',
  ].forEach(t => f.push(B.marcador(t)));

  // 6. Instrumentos
  f.push(B.titulo('6. Instrumentos utilizados'));
  const instr = insp.instrumentos || [];
  f.push(B.tabela(['Instrumento', 'Fabricante', 'Modelo', 'Nº série', 'Certificado', 'Validade', 'Uso'],
    instr.length ? instr.map(i => [i.instrumento, i.fabricante, i.modelo, i.serie, i.certificado, B.fmtData(i.validade), i.uso]) : [['(preencher)', '', '', '', '', '', '']],
    [1.6, 1, 1, 1, 1, 0.9, 1.3]));
  f.push(B.nota('Todos os instrumentos devem estar com calibração válida na data da inspeção; os certificados vão no Anexo B.'));

  // 7. Checklist
  f.push(B.titulo('7. Checklist de inspeção visual e documental'));
  f.push(B.p('Legenda: C = conforme | NC = não conforme | NA = não aplicável | NV = não verificado (dizer o motivo). Referências: NBR 5419-3:2026, salvo indicação.'));
  let nSecao = 0;
  for (const secao of SECOES_CHECKLIST) {
    const itens = checklist.filter(c => c.secao === secao);
    if (!itens.length) continue;
    f.push(B.titulo(`7.${++nSecao} ${secao}`, 2));
    f.push(B.tabela(['#', 'Item verificado', 'Ref.', 'Sit.', 'Observação / foto'],
      itens.map(c => [c.cod, c.item, c.requisito.replace(/^NBR 5419-3:2026, /, ''), c.situacao, obsComFoto(c.obs, c.foto)]),
      [0.5, 2.2, 1.1, 0.45, 3.2], { tamanho: 15, destacarColuna: (l, i) => i === 3 ? corSituacao(l[3]) : undefined }));
  }

  // 8. Ensaios
  f.push(B.titulo('8. Ensaios e medições'));
  f.push(B.titulo('8.1 Continuidade elétrica (NBR 5419-3:2026, Anexo F)', 2));
  if (ensaios.length) {
    f.push(B.tabela(['Ponto', 'Ensaio', 'Origem → destino', 'Medido (Ω)', 'Critério', 'Resultado'],
      ensaios.map(e => [e.ponto, e.tipo_ensaio, `${e.origem} → ${e.destino}`, e.valor_ohm == null || e.valor_ohm === '' ? '' : B.fmtNum(e.valor_ohm, 3), e.criterio, e.resultado]),
      [0.6, 0.6, 2.6, 0.8, 2.2, 0.8], { tamanho: 15, destacarColuna: (l, i) => i === 5 ? corSituacao(l[5]) : undefined }));
    f.push(B.nota('Tipos de ensaio (Anexo F de 2026): F.1 armaduras de descida + aterramento natural (medição cruzada topo × base de pilares diferentes); F.2 armaduras de pilar (topo × base do mesmo pilar); F.3 fundação; F.4 verificação comprobatória captação × BEP (≤ 0,2 Ω); F.5 descida não natural; F.6 eletrodo de aterramento não natural; F.7 ligação equipotencial.'));
  } else {
    f.push(B.p('Nenhum ensaio previsto. [CONFERIR]'));
  }
  if ((insp.aterramento || []).length) {
    f.push(B.titulo('8.2 Resistência de aterramento (informativa — NBR 15749)', 2));
    f.push(B.tabela(['Ponto', 'Método', 'Distância (m)', 'Resistência (Ω)', 'Condição do solo'],
      insp.aterramento.map(a => [a.ponto, a.metodo || 'queda de potencial', B.fmtNum(a.distancia_m), B.fmtNum(a.valor_ohm, 2), a.condicao_solo || '']), [1, 1.6, 1, 1, 1.6]));
    f.push(B.nota('A resistência de aterramento não é critério de aceitação do SPDA (NBR 5419-3:2026, 7.1.4).'));
  }

  // 9. Não conformidades
  f.push(B.titulo('9. Não conformidades e recomendações'));
  f.push(B.tabela(['Prioridade', 'Prazo recomendado (NBR 5419-3:2026, 7.4.2)'], Object.entries(res.prazos), [1, 4]));
  f.push(B.espaco(80));
  if (ncs.length) {
    f.push(B.tabela(['NC', 'Item', 'Local', 'Descrição', 'Requisito', 'Recomendação', 'Prior.', 'Foto'],
      ncs.map(n => [n.id, n.item, n.local, n.descricao, n.requisito, n.recomendacao, n.prioridade, n.foto]),
      [0.6, 0.5, 1.1, 2.3, 1.1, 2.3, 0.5, 0.6], { tamanho: 15 }));
  } else {
    f.push(B.p('Nenhuma não conformidade constatada.'));
  }
  f.push(B.p('Pela NBR 5419-3:2026, 7.4.3, cabe ao responsável pela estrutura assegurar a correção de todas as não conformidades apontadas. Após as correções, recomenda-se nova inspeção dos itens corrigidos, com registro fotográfico e ART de execução.', { before: 80 }));

  // 10. Fotos
  const fotos = insp.fotos || [];
  f.push(B.titulo('10. Registro fotográfico'));
  if (fotos.length) {
    f.push(B.tabela(['Foto', 'Local/ponto', 'Subsistema', 'Descrição', 'Ref. NC/item'],
      fotos.map(ft => [ft.id, ft.local, ft.subsistema, ft.descricao, ft.ref]), [0.6, 1.5, 1.2, 3.2, 1.1], { tamanho: 15 }));
    f.push(B.espaco(100));
    f.push(gradeFotos(fotos, res));
    if (insp.fotos_obs) f.push(B.nota(insp.fotos_obs));
  } else {
    f.push(B.p('Sem fotos registradas. [CONFERIR]'));
  }

  // Pendências
  const nv = checklist.filter(c => c.situacao === 'NV');
  const faltaInst = !(insp.instrumentos || []).length;
  const faltaProv = !!(prov && !prov.as_built);
  if (nv.length || ensaios.some(e => e.resultado === 'NV') || faltaInst || faltaProv) {
    f.push(B.titulo('Pendências para concluir o laudo', 2));
    f.push(B.p('Os itens abaixo ainda não foram verificados. Enquanto houver pendência, o laudo não pode ser concluído como CONFORME (as não conformidades já constatadas continuam valendo). Use o Checklist de Campo e a planilha de medições.'));
    const escritorio = nv.filter(c => /escrit/i.test(c.onde || '') || c.secao === 'Documentação');
    const campo = nv.filter(c => !escritorio.includes(c));
    if (campo.length) {
      f.push(B.p('A verificar em campo', { bold: true, after: 40 }));
      f.push(B.tabela(['#', 'Onde', 'Verificar', 'Como / o que registrar'], campo.map(c => [c.cod, c.onde, c.item, c.como]), [0.5, 1.2, 2.4, 2.9], { tamanho: 15 }));
    }
    const linhasEscr = escritorio.map(c => [c.cod, c.item, c.obs || c.como]);
    // Pendências que não são item de checklist, mas impedem a emissão
    // (o gerador antigo perdia as duas — o laudo R06 do São Bento as trazia).
    if (!(insp.instrumentos || []).length) {
      linhasEscr.push(['INST', 'Relacionar instrumentos (marca, modelo, série, certificado e validade da calibração)', 'Antes de ir a campo — preencher a Seção 6 e anexar os certificados (Anexo B)']);
    }
    if (prov && !prov.as_built) {
      linhasEscr.push(['PROV', 'As built do SPDA provisório: croqui em escala da cobertura atual com malha, captores/torres (posição e altura), descidas usadas e pontos de ligação ao aterramento definitivo, com ART', 'Montar com o levantamento de campo (croqui A3) e anexar ao laudo — é o documento que o órgão licenciador vai conferir']);
    }
    if (linhasEscr.length) {
      f.push(B.p('Escritório / cliente', { bold: true, before: 80, after: 40 }));
      f.push(B.tabela(['#', 'Pendência', 'Como'], linhasEscr, [0.5, 2.6, 3.9], { tamanho: 15 }));
    }
  }

  // 11. Conclusão
  f.push(B.titulo('11. Conclusão e parecer técnico'));
  const pc = parecer;
  f.push(B.tabelaKV([
    ['Itens verificados', `${checklist.length} — C: ${pc.cont.C} | NC: ${pc.cont.NC} | NA: ${pc.cont.NA} | NV: ${pc.cont.NV}`],
    ['NC por prioridade', `P1 ${pc.porP.P1} | P2 ${pc.porP.P2} | P3 ${pc.porP.P3} | P4 ${pc.porP.P4}`],
    ['Ensaios de continuidade', `${pc.dentro} de ${pc.medidos} medidos dentro do critério (${ensaios.length} previstos)`],
    ['PARECER', pc.texto],
  ], [1, 3]));
  if (pc.situacao === 'NAO_CONFORME_PRELIMINAR' || pc.situacao === 'INCONCLUSIVO') {
    f.push(B.p(`O parecer final (CONFORME ou NÃO CONFORME) só será emitido após a verificação, ou justificativa N.A., de todos os itens${ensaios.length ? `, a realização dos ${ensaios.length} ensaios de continuidade` : ''}${ncs.length ? ` e a correção das não conformidades NC-01 a ${ncs[ncs.length - 1].id}` : ''}.`, { before: 80 }));
  }
  if (prov) {
    f.push(B.p(`Este laudo refere-se ao SPDA PROVISÓRIO da etapa "${prov.etapa}". A condição avaliada é a da geometria atual da edificação. A implantação do projeto definitivo constitui alteração da estrutura e do SPDA e exige nova inspeção completa e novo laudo antes da ocupação das novas áreas (ABNT NBR 5419-3:2026, 7.3.2 c).`, { before: 100 }));
  }
  [
    'Este laudo reflete as condições do SPDA observadas nas datas da inspeção. Alterações posteriores na estrutura, no SPDA ou nas instalações, além de danos causados por descargas atmosféricas, intempéries, furto ou intervenções de terceiros, podem mudar essas condições.',
    PR.textoLimitacaoEmbutidos(res),
    'Um SPDA reduz o risco de danos, mas não elimina totalmente a possibilidade de danos por descargas atmosféricas (ABNT NBR 5419-1:2026).',
    'O SPDA protege a estrutura e as pessoas contra os efeitos diretos da descarga; não protege equipamentos elétricos e eletrônicos contra surtos. Essa proteção depende das medidas de proteção contra surtos (MPS) — DPS coordenados, blindagem e roteamento — da ABNT NBR 5419-4 e da ABNT NBR 5410.',
    'Recomenda-se manter arquivados com este laudo a ART do SPDA, as notas fiscais e certificados dos componentes instalados e o registro das inspeções, pois são exigidos na vistoria do órgão licenciador.',
    'A resistência de aterramento, quando medida, é informativa e não é critério de aceitação do SPDA (ABNT NBR 5419-3:2026, 7.1.4).',
    'Este documento só tem validade na íntegra, com a ART correspondente. Não pode ser reproduzido parcialmente.',
  ].forEach(t => f.push(B.p(t)));

  // 12. Próxima inspeção
  f.push(B.titulo('12. Próxima inspeção'));
  const base = insp.data_inspecao || meta.data;
  f.push(B.tabelaKV([
    ['Próxima inspeção periódica', `${B.fmtData(B.somarAnos(base, res.intervalo))} (intervalo de ${res.intervalo} ano${res.intervalo > 1 ? 's' : ''}, NBR 5419-3:2026, 7.3.2 f)`],
    ['Inspeção extraordinária obrigatória', 'Após alteração física ou de uso da estrutura; após alteração do SPDA; após suspeita de impacto ou atuação de DPS classe I (7.3.2 c, d, e)'],
    ['Verificações visuais intermediárias', 'A cada 6 meses — danos, conexões, furtos (7.3.2, nota 1)'],
    ['DPS/MPS', 'Intervalo máximo igual ao do SPDA ou o do fabricante, o que for mais restritivo (7.3.5; NBR 5419-4, 9.2.3)'],
  ], [1.3, 3]));

  // 13. Assinatura
  f.push(B.titulo('13. Responsabilidade técnica e assinatura'));
  f.push(...C.blocoAssinatura(dados));
  f.push(B.p('Ciente do responsável pela estrutura: ______________________________________________   Nome / cargo / data', { before: 200 }));

  f.push(B.titulo('Anexos'));
  [
    'A — Planta/croqui com descidas, caixas, pontos de ensaio e fotos numerados',
    'B — Certificados de calibração dos instrumentos',
    'C — Planilhas de medição (continuidade, R × distância, resistividade)',
    'D — ART (cópia) e comprovante',
    'E — Documentos do cliente analisados',
    'F — Relatório de análise de risco (NBR 5419-2) e memorial descritivo',
    'G — APR / permissão de trabalho (controle interno)',
  ].forEach(t => f.push(B.marcador(t)));

  return B.criarDocumento({ tituloCurto: 'Laudo de inspeção do SPDA — NBR 5419-3', identificacao: C.identificacaoDocumento(dados, 'LAUDO'), filhos: f });
}

module.exports = { gerarLaudo, TIPO_INSPECAO };
