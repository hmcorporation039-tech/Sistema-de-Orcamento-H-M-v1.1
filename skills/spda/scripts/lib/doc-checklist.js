// Checklist de campo — formulário impresso para a visita de inspeção.
// Traz a situação já apurada no escritório e espaço para marcar o que for
// verificado em campo; os itens pendentes aparecem destacados (► CAMPO).

const B = require('../../../_comum/docx-base');
const C = require('./doc-comum');

const SECOES = ['Documentação', 'Captação', 'Descidas', 'Aterramento', 'Equipotencialização', 'DPS'];
const CAIXAS = '☐ C   ☐ NC   ☐ NA   ☐ NV';

function gerarChecklistCampo(res) {
  const { dados, checklist, ensaios, dim } = res;
  const insp = dados.inspecao || {};
  const f = [];

  f.push(...B.capa('CHECKLIST DE CAMPO — INSPEÇÃO DE SPDA', 'ABNT NBR 5419-3:2026, Seção 7 e Anexo F'));
  f.push(C.blocoIdentificacao(dados, [
    ['Documento', insp.documento_n || '(preencher)'],
    ['Data da visita / equipe', '____/____/________   Equipe: ______________________________'],
    ['Condição do tempo', '☐ sem ameaça de tempestade (7.1.2)   Temperatura/umidade: __________'],
  ]));

  f.push(B.titulo('Antes de subir'));
  [
    'APR e permissão de trabalho emitidas; trabalho em altura conforme NR-35; intervenção em painéis conforme NR-10.',
    'Não realizar nenhuma atividade sob ameaça ou durante tempestades (NBR 5419-3:2026, 7.1.2).',
    'Instrumento de continuidade de 4 fios, 1 A a 5 A, CC ou frequência ≠ 60 Hz, com certificado válido. NÃO usar multímetro nem terrômetro-alicate (F.1.3.3).',
    'Levar: trena, trena a laser, paquímetro, medidor de espessura, câmera, croqui da cobertura em A3, este checklist e a planilha de medições.',
  ].forEach(t => f.push(B.marcador(t)));

  if (dim) {
    f.push(B.titulo('Referências do projeto para conferir'));
    f.push(B.tabela(['Grandeza', 'Projeto / cálculo', 'Medido em campo'], [
      ['Nível de proteção (NP)', dim.np, ''],
      ['Módulo máximo da malha', `${dim.captacao.modulo_max_m} × ${dim.captacao.modulo_max_m} m`, ''],
      ['Nº mínimo de descidas', `${dim.descidas.quantidade} (perímetro ${B.fmtNum(dim.perimetro, 0)} m ÷ ${dim.descidas.espacamento_tabela_m} m)`, ''],
      ['Espaçamento máximo entre descidas', `${B.fmtNum(dim.descidas.espacamento_max_permitido_m, 1)} m (Tab. 5 + 20 %)`, ''],
      ['Fixação dos condutores', '≤ 1,0 m horizontal / ≤ 1,5 m vertical', ''],
      ['Condutor de captação/descida', 'cobre ≥ 35 mm² / alumínio ≥ 70 mm² / aço galv. ≥ 50 mm² (Tab. 7)', ''],
      ['Eletrodo de aterramento', 'cobre ≥ 50 mm², ≥ 0,5 m de profundidade, ~1 m das paredes', ''],
      ['Distância de segurança s (ar)', `${B.fmtNum(dim.distanciaSeguranca.s_ar_m, 3)} m`, ''],
    ], [2, 2.6, 1.6]));
  }

  for (const secao of SECOES) {
    const itens = checklist.filter(c => c.secao === secao);
    if (!itens.length) continue;
    f.push(B.titulo(secao));
    f.push(B.tabela(['#', 'Item / onde / como', 'Situação atual', 'Em campo', 'Observação / nº da foto'],
      itens.map(c => [
        `${c.cod}${c.situacao === 'NV' ? ' ► CAMPO' : ''}`,
        [`${c.item} (${c.requisito.replace(/^NBR 5419-3:2026, /, '')})`, `Onde: ${c.onde || '—'}`, `Como: ${c.como || '—'}`],
        [c.situacao, c.obs ? c.obs.slice(0, 220) : ''],
        CAIXAS,
        '',
      ]),
      [0.75, 2.6, 1.6, 0.85, 1.5], { tamanho: 14, destacarColuna: (l, i) => (i === 0 && String(l[0]).includes('CAMPO')) ? 'FFF2CC' : undefined }));
  }

  f.push(B.titulo('Ensaios de continuidade (Anexo F)'));
  const linhasEnsaio = ensaios.length
    ? ensaios.map(e => [e.ponto, e.tipo_ensaio, `${e.origem} → ${e.destino}`, e.criterio, '', ''])
    : Array.from({ length: 8 }, (_, i) => [`T${String(i + 1).padStart(2, '0')}`, '', '', '', '', '']);
  f.push(B.tabela(['Ponto', 'Ensaio', 'Origem → destino', 'Critério', 'Medido (Ω)', 'Hora / obs.'], linhasEnsaio, [0.6, 0.6, 2.6, 2, 0.9, 1], { tamanho: 14 }));
  f.push(B.nota('F.1: cruzada topo × base de pilares diferentes (≤ 1 Ω) | F.2: topo × base do mesmo pilar (≤ 1 Ω) | F.4: captação × BEP (≤ 0,2 Ω) | F.5/F.6/F.7: anotar material, seção e comprimento do trecho para o critério por resistência esperada.'));

  f.push(B.titulo('Croqui / anotações'));
  f.push(B.p('Desenhar a cobertura com a malha, captores (posição e altura), descidas numeradas, caixas de inspeção, BEP/BEL e os pontos ensaiados e fotografados.'));
  for (let i = 0; i < 14; i++) f.push(B.p('_____________________________________________________________________________________________', { after: 120 }));

  return B.criarDocumento({ tituloCurto: 'Checklist de campo — SPDA', identificacao: C.identificacaoDocumento(dados, 'CHK'), filhos: f });
}

module.exports = { gerarChecklistCampo };
