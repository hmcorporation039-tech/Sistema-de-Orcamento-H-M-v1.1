// Documentos genéricos (Word e Excel) no padrão H&M, usados por todas as
// disciplinas novas: memorial de cálculo, laudo de inspeção, checklist de
// campo e planilhas. Cada disciplina só fornece o conteúdo.

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { Packer, Table, TableRow, TableCell, Paragraph, WidthType, TableLayoutType, AlignmentType, BorderStyle } = require('docx');
const B = require('./docx-base');
const { PRAZOS } = require('./inspecao');

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ── Trechos comuns ─────────────────────────────────────────────────────────

function endereco(cli = {}) {
  return [cli.endereco, [cli.cidade, cli.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ');
}

function identificacao(dados, extras = []) {
  const { cliente = {}, obra = {}, responsavel = {}, meta = {} } = dados;
  return B.tabelaKV([
    ['Cliente', cliente.nome],
    ['Obra', obra.nome],
    ['Endereço', endereco(cliente)],
    ['Responsável técnico', `${responsavel.nome || '(preencher)'}   CREA ${responsavel.crea || '(preencher)'}   ART ${responsavel.art || '(preencher)'}`],
    ['Data / revisão', `${B.fmtData(meta.data)} / ${meta.revisao || 'R00'}`],
    ...extras,
  ]);
}

function normas(lista) {
  return [B.titulo('Normas e documentos de referência'), ...lista.map(([n, d]) => B.marcador(`${n} — ${d}`))];
}

function assinatura(dados) {
  const r = dados.responsavel || {};
  const cidade = (dados.cliente || {}).cidade || '';
  return [
    B.espaco(240),
    B.p(`${cidade}${cidade ? ', ' : ''}${B.fmtData((dados.meta || {}).data)}.`, { align: AlignmentType.LEFT }),
    B.espaco(480),
    B.p('______________________________________________', { align: AlignmentType.CENTER, after: 0 }),
    B.p(r.nome || 'Responsável técnico', { align: AlignmentType.CENTER, after: 0, bold: true }),
    B.p(`${r.titulo || 'Engenheiro Eletricista'} — CREA ${r.crea || '(preencher)'} — ART nº ${r.art || '(preencher)'}`, { align: AlignmentType.CENTER, after: 0 }),
    B.p(r.empresa || 'H&M Engenharia e Tecnologia LTDA', { align: AlignmentType.CENTER }),
  ];
}

function idDocumento(dados, sigla) {
  const meta = dados.meta || {};
  const n = (dados.inspecao || {}).documento_n || meta.documento_n || 'HM';
  return `${n}-${sigla} / ${String(meta.revisao || 'R00').split(' ')[0]}`;
}

// Bloco genérico: { titulo, nivel, paragrafos[], tabela: { colunas, linhas, proporcoes }, kv: [[k,v]], marcadores[], notas[] }
function blocos(lista) {
  const f = [];
  for (const b of lista || []) {
    if (!b) continue;
    if (b.titulo) f.push(B.titulo(b.titulo, b.nivel || 1));
    (b.paragrafos || []).forEach(t => f.push(B.p(t)));
    if (b.kv) f.push(B.tabelaKV(b.kv, b.proporcoesKv));
    if (b.tabela && b.tabela.linhas.length) {
      f.push(B.tabela(b.tabela.colunas, b.tabela.linhas, b.tabela.proporcoes, { tamanho: b.tabela.tamanho || 16, destacarColuna: b.tabela.destacar }));
    } else if (b.tabela) {
      f.push(B.p(b.tabela.vazio || 'Nenhum item.', { italics: true }));
    }
    (b.marcadores || []).forEach(t => f.push(B.marcador(t)));
    (b.notas || []).forEach(t => f.push(B.nota(t)));
    if (b.espaco) f.push(B.espaco(b.espaco));
  }
  return f;
}

// ── Memorial / relatório de cálculo ─────────────────────────────────────────

function gerarMemorial(dados, { titulo, subtitulo, tituloCurto, sigla, secoes, listaNormas }) {
  const f = [...B.capa(titulo, subtitulo), identificacao(dados), ...blocos(secoes)];
  if (listaNormas) f.push(...normas(listaNormas));
  f.push(B.nota('Documento resultado de cálculo com as premissas declaradas; deve ser revisado e assinado pelo responsável técnico habilitado.'));
  f.push(...assinatura(dados));
  return B.criarDocumento({ tituloCurto, identificacao: idDocumento(dados, sigla), filhos: f });
}

// ── Laudo de inspeção ───────────────────────────────────────────────────────

const COR_SITUACAO = { C: 'E2EFDA', NC: 'F8CBAD', NV: 'FFF2CC', NA: 'EDEDED' };

function resolverFoto(arquivo, baseDir, pastaFotos) {
  if (!arquivo) return null;
  const candidatos = [arquivo];
  if (!path.isAbsolute(arquivo)) {
    if (pastaFotos) candidatos.push(path.join(pastaFotos, arquivo));
    if (baseDir) candidatos.push(path.join(baseDir, arquivo));
  }
  return candidatos.find(c => fs.existsSync(c)) || null;
}

function gradeFotos(fotos, baseDir, pastaFotos) {
  const largura = 4819;
  const celulas = fotos.map(ft => {
    const arq = resolverFoto(ft.arquivo, baseDir, pastaFotos);
    const img = arq ? B.imagem(arq, Math.min(ft.largura_cm || 8, 8), { alturaMaxCm: 7 }) : null;
    return new TableCell({
      width: { size: largura, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: img ? [img] : B.runs('[foto não encontrada — anexar]', { italics: true }) }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: B.runs(`${ft.id} — ${ft.descricao || ''}`, { size: 16 }) }),
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

// cfg: { titulo, tipoInspecao, tituloCurto, sigla, objetivo, metodologia[], listaNormas, secoesChecklist[],
//        descricao: [[k,v]], medicoes: [{ titulo, colunas, linhas, proporcoes, nota }], conclusoes[], intervaloTexto,
//        proximaInspecao: [[k,v]], anexos[] }
function gerarLaudoInspecao(dados, insp, cfg, { checklist, ncs, parecer, baseDir, pastaFotos }) {
  const { cliente = {}, obra = {}, responsavel = {}, meta = {} } = dados;
  const f = [];
  f.push(...B.capa(cfg.titulo, cfg.tipoInspecao));
  f.push(B.tabelaKV([
    ['Cliente', cliente.nome], ['Estrutura/instalação', obra.nome], ['Endereço', endereco(cliente)],
    ['Documento nº / revisão', `${insp.documento_n || '(preencher)'} / ${meta.revisao || 'R00'}`],
    ['Data de emissão', B.fmtData(meta.data)], ['Data(s) da inspeção em campo', B.fmtData(insp.data_inspecao) || '(preencher)'],
    ['ART nº', responsavel.art || '(preencher)'],
  ]));

  f.push(B.titulo('1. Identificação'));
  f.push(B.tabelaKV([
    ['Contratante', cliente.nome], ['CNPJ', cliente.cnpj], ['Contato no local', cliente.contato], ['Uso / atividade', obra.uso],
    ['Empresa executora', responsavel.empresa || 'H&M Engenharia e Tecnologia LTDA'], ['Responsável técnico', `${responsavel.nome || ''} — CREA ${responsavel.crea || ''}`],
    ['Equipe de campo', insp.equipe],
  ]));

  f.push(B.titulo('2. Objetivo e escopo'));
  f.push(B.p(cfg.objetivo));
  f.push(B.tabelaKV([['Abrangência', insp.abrangencia || '(informar)'], ['Fora do escopo', insp.fora_escopo || '—']]));

  f.push(...normas(cfg.listaNormas));
  if ((insp.documentos || []).length) {
    f.push(B.tabela(['Documento recebido', 'Recebido?', 'Data/rev.', 'Situação'], insp.documentos.map(d => [d.documento, d.recebido, d.data_rev, d.situacao]), [3, 0.8, 1, 2.2]));
  }

  if (cfg.descricao && cfg.descricao.length) {
    f.push(B.titulo('3. Descrição da instalação'));
    f.push(B.tabelaKV(cfg.descricao));
  }

  f.push(B.titulo('4. Metodologia'));
  (cfg.metodologia || []).forEach(t => f.push(B.marcador(t)));
  const instr = insp.instrumentos || [];
  f.push(B.tabela(['Instrumento', 'Fabricante', 'Modelo', 'Nº série', 'Certificado', 'Validade'],
    instr.length ? instr.map(i => [i.instrumento, i.fabricante, i.modelo, i.serie, i.certificado, B.fmtData(i.validade)]) : [['(preencher)', '', '', '', '', '']],
    [1.6, 1, 1, 1, 1, 0.9]));

  f.push(B.titulo('5. Checklist de inspeção'));
  f.push(B.p('Legenda: C = conforme | NC = não conforme | NA = não aplicável | NV = não verificado.'));
  let n = 0;
  for (const secao of cfg.secoesChecklist) {
    const itens = checklist.filter(c => c.secao === secao);
    if (!itens.length) continue;
    f.push(B.titulo(`5.${++n} ${secao}`, 2));
    f.push(B.tabela(['#', 'Item verificado', 'Ref.', 'Sit.', 'Observação / foto'],
      itens.map(c => [c.cod, c.item, c.requisito, c.situacao, [c.obs, c.foto ? `(${c.foto})` : ''].filter(Boolean).join(' ')]),
      [0.5, 2.3, 1.2, 0.45, 3], { tamanho: 15, destacarColuna: (l, i) => (i === 3 ? COR_SITUACAO[l[3]] : undefined) }));
  }

  if ((cfg.medicoes || []).length) {
    f.push(B.titulo('6. Ensaios e medições'));
    for (const m of cfg.medicoes) {
      f.push(B.titulo(m.titulo, 2));
      if (m.linhas.length) {
        f.push(B.tabela(m.colunas, m.linhas, m.proporcoes, { tamanho: 15, destacarColuna: (l, i) => (i === m.colunas.length - 1 ? COR_SITUACAO[l[i]] : undefined) }));
      } else {
        f.push(B.p('Nenhuma medição registrada. [CONFERIR]'));
      }
      if (m.nota) f.push(B.nota(m.nota));
    }
  }

  f.push(B.titulo('7. Não conformidades e recomendações'));
  f.push(B.tabela(['Prioridade', 'Prazo recomendado'], Object.entries(PRAZOS), [1, 4]));
  f.push(B.espaco(80));
  f.push(ncs.length
    ? B.tabela(['NC', 'Item', 'Local', 'Descrição', 'Requisito', 'Recomendação', 'Prior.', 'Foto'],
      ncs.map(x => [x.id, x.item, x.local, x.descricao, x.requisito, x.recomendacao, x.prioridade, x.foto]), [0.6, 0.5, 1.1, 2.3, 1.1, 2.3, 0.5, 0.6], { tamanho: 15 })
    : B.p('Nenhuma não conformidade constatada.'));

  const fotos = insp.fotos || [];
  f.push(B.titulo('8. Registro fotográfico'));
  if (fotos.length) {
    f.push(B.tabela(['Foto', 'Local', 'Descrição', 'Ref.'], fotos.map(ft => [ft.id, ft.local, ft.descricao, ft.ref]), [0.6, 1.5, 3.8, 1.1], { tamanho: 15 }));
    f.push(B.espaco(100));
    f.push(gradeFotos(fotos, baseDir, pastaFotos));
  } else {
    f.push(B.p('Sem fotos registradas. [CONFERIR]'));
  }

  f.push(B.titulo('9. Conclusão e parecer técnico'));
  f.push(B.tabelaKV([
    ['Itens verificados', `${checklist.length} — C: ${parecer.cont.C} | NC: ${parecer.cont.NC} | NA: ${parecer.cont.NA} | NV: ${parecer.cont.NV}`],
    ['NC por prioridade', `P1 ${parecer.porP.P1} | P2 ${parecer.porP.P2} | P3 ${parecer.porP.P3} | P4 ${parecer.porP.P4}`],
    ['Medições', `${parecer.dentro} de ${parecer.medidos} medidas dentro do critério`],
    ['PARECER', parecer.texto],
  ], [1, 3]));
  [...(cfg.conclusoes || []),
    'Este laudo reflete as condições observadas nas datas da inspeção. Alterações posteriores podem mudar essas condições.',
    'A inspeção cobriu as partes acessíveis com segurança; componentes embutidos ou inacessíveis foram avaliados pela documentação e pelos ensaios disponíveis.',
    'Este documento só tem validade na íntegra, com a ART correspondente.',
  ].forEach(t => f.push(B.p(t)));
  if (cfg.proximaInspecao) {
    f.push(B.titulo('10. Próxima inspeção'));
    f.push(B.tabelaKV(cfg.proximaInspecao, [1.3, 3]));
  }
  f.push(B.titulo('Responsabilidade técnica'));
  f.push(...assinatura(dados));
  f.push(B.p('Ciente do responsável pela instalação: ______________________________   Nome / cargo / data', { before: 200 }));
  return B.criarDocumento({ tituloCurto: cfg.tituloCurto, identificacao: idDocumento(dados, cfg.sigla), filhos: f });
}

// ── Checklist de campo ──────────────────────────────────────────────────────

function gerarChecklistCampo(dados, insp, cfg, checklist) {
  const f = [...B.capa(cfg.titulo, cfg.subtitulo), identificacao(dados, [
    ['Data da visita / equipe', '____/____/________   Equipe: ______________________________'],
  ])];
  f.push(B.titulo('Antes de começar'));
  (cfg.preparacao || []).forEach(t => f.push(B.marcador(t)));
  if (cfg.referencias && cfg.referencias.length) {
    f.push(B.titulo('Referências para conferir'));
    f.push(B.tabela(['Grandeza', 'Projeto / cálculo', 'Medido em campo'], cfg.referencias.map(r => [r[0], r[1], '']), [2, 2.6, 1.6]));
  }
  for (const secao of cfg.secoesChecklist) {
    const itens = checklist.filter(c => c.secao === secao);
    if (!itens.length) continue;
    f.push(B.titulo(secao));
    f.push(B.tabela(['#', 'Item / onde / como', 'Situação atual', 'Em campo', 'Observação / foto'],
      itens.map(c => [`${c.cod}${c.situacao === 'NV' ? ' ► CAMPO' : ''}`, [`${c.item} (${c.requisito})`, `Onde: ${c.onde || '—'}`, `Como: ${c.como || '—'}`], [c.situacao, (c.obs || '').slice(0, 200)], '☐ C   ☐ NC   ☐ NA   ☐ NV', '']),
      [0.75, 2.6, 1.5, 0.85, 1.6], { tamanho: 14 }));
  }
  for (const m of cfg.medicoes || []) {
    f.push(B.titulo(m.titulo));
    f.push(B.tabela(m.colunas, m.linhas.length ? m.linhas : Array.from({ length: 8 }, () => m.colunas.map(() => '')), m.proporcoes, { tamanho: 14 }));
  }
  f.push(B.titulo('Croqui / anotações'));
  for (let i = 0; i < 12; i++) f.push(B.p('_____________________________________________________________________________________________', { after: 120 }));
  return B.criarDocumento({ tituloCurto: cfg.tituloCurto, identificacao: idDocumento(dados, 'CHK'), filhos: f });
}

// ── Planilhas ───────────────────────────────────────────────────────────────

// abas: [{ nome, colunas: [{ header, key, width, numFmt }], linhas: [obj], total: { coluna, rotuloEm } }]
async function gerarPlanilha(abas) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia LTDA';
  for (const aba of abas) {
    const ws = wb.addWorksheet(aba.nome.slice(0, 31));
    ws.columns = aba.colunas.map(c => ({ header: c.header, key: c.key, width: c.width || 14 }));
    aba.linhas.forEach(l => ws.addRow(l));
    aba.colunas.forEach(c => { if (c.numFmt) ws.getColumn(c.key).numFmt = c.numFmt; });
    if (aba.formulas) aba.formulas(ws);
    const cab = ws.getRow(1);
    cab.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFC9A227' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
      c.alignment = { vertical: 'middle', wrapText: true };
    });
    cab.height = 22;
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Aba de materiais com preço editável e total por fórmula
function abaMateriais(materiais) {
  return {
    nome: 'Materiais',
    colunas: [
      { header: 'Cód.', key: 'codigo', width: 10 }, { header: 'Descrição', key: 'descricao', width: 70 },
      { header: 'Un.', key: 'unidade', width: 6 }, { header: 'Qtd.', key: 'quantidade', width: 9 },
      { header: 'Preço unit. (R$)', key: 'preco', width: 14, numFmt: '#,##0.00' }, { header: 'Total (R$)', key: 'total', width: 14, numFmt: '#,##0.00' },
      { header: 'Referência', key: 'referencia', width: 34 },
    ],
    linhas: materiais.map((m, i) => ({ ...m, preco: null, total: { formula: `IF(E${i + 2}="","",D${i + 2}*E${i + 2})` } })),
    formulas: (ws) => { const r = ws.addRow({ descricao: 'TOTAL', total: { formula: `SUM(F2:F${materiais.length + 1})` } }); r.font = { bold: true }; },
  };
}

async function docxParaBuffer(doc) {
  return Packer.toBuffer(doc);
}

function nomeArquivo(dados, nome, ext, comRevisao = true) {
  const base = dados.meta?.prefixo || dados.obra?.nome || dados.cliente?.nome || 'Obra';
  const pre = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40).replace(/^_+|_+$/g, '') || 'Obra';
  const rev = String(dados.meta?.revisao || 'R00').split(' ')[0].replace(/[^A-Za-z0-9]/g, '') || 'R00';
  return `${pre}_${nome}${comRevisao ? `_${rev}` : ''}.${ext}`;
}

module.exports = {
  MIME_DOCX, MIME_XLSX, identificacao, normas, assinatura, blocos, gerarMemorial, gerarLaudoInspecao, gerarChecklistCampo,
  gerarPlanilha, abaMateriais, docxParaBuffer, nomeArquivo, endereco,
};
