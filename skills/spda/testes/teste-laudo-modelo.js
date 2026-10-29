// Laudo de SPDA e aterramento no formato do modelo HM de 29/10/2026
// (exemplos/exemplo-laudo-spda-aterramento.json — dados fictícios): seções do
// modelo, emitente H&M com o responsável técnico de outra empresa, tabela de
// continuidade, análise de risco, relatório fotográfico com data/GPS e a
// conferência das fotos (local e data), e o laudo só de aterramento.

const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { verificador } = require('../../_comum/teste');
const { jpegTeste } = require('../../_comum/foto-teste');
const { EMPRESA } = require('../../_comum/empresa');
const { processar } = require('../scripts/lib/processar');
const { gerarDocumento } = require('../scripts/lib/documentos');

const v = verificador('spda (laudo no formato do modelo)');
const EXEMPLO = path.join(__dirname, '..', 'exemplos', 'exemplo-laudo-spda-aterramento.json');
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'spda-laudo-modelo-'));

// fotos de teste: as dos ensaios no local e no dia da inspeção, a do ensaio 6 no
// escritório (~18 km) e no dia seguinte
function montarFotos(dados) {
  for (const ft of dados.inspecao.fotos) {
    const noLocal = { dataHora: '2026-10-27T10:15:00', lat: -15.78015, lon: -47.92925 };
    const fora = { dataHora: '2026-10-28T20:44:48', lat: -15.8653, lon: -48.0771 };
    const exif = ft.ensaio === '6' ? fora : (['ensaio', 'geral'].includes(ft.categoria) ? noLocal : null);
    fs.writeFileSync(path.join(pasta, ft.arquivo), jpegTeste(exif));
  }
  dados.inspecao.pasta_fotos = pasta;
}

async function textoDoLaudo(dados) {
  const res = processar(dados);
  res.pastaFotos = pasta;
  const doc = await gerarDocumento(res, 'laudo');
  const zip = await JSZip.loadAsync(doc.buffer);
  const xml = await zip.file('word/document.xml').async('string');
  const rodape = (await Promise.all(Object.keys(zip.files).filter(n => /^word\/footer\d*\.xml$/.test(n)).map(n => zip.file(n).async('string')))).join(' ');
  const texto = (s) => s.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return { res, doc, corpo: texto(xml), rodape: texto(rodape), imagens: Object.keys(zip.files).filter(n => n.startsWith('word/media/')).length };
}

const ordem = (texto, lista) => lista.map(t => texto.indexOf(t)).every((pos, i, a) => pos >= 0 && (i === 0 || pos > a[i - 1]));

(async () => {
  const dados = JSON.parse(fs.readFileSync(EXEMPLO, 'utf8'));
  v.igual('exemplo marcado como fictício', dados.meta.dados_ilustrativos, true);
  montarFotos(dados);
  const { res, doc, corpo, rodape, imagens } = await textoDoLaudo(dados);

  v.igual('nome do arquivo', doc.nomeArquivo, 'Hospital_Exemplo_Norte_Laudo_SPDA_R00.docx');
  v.igual('título do laudo de SPDA e aterramento', corpo.includes('LAUDO TÉCNICO DO SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS (SPDA) E ATERRAMENTO'), true);
  v.igual('seções na ordem do modelo', ordem(corpo, ['1. Unidade', '2. Objetivo', '3. Considerações', '4. Escopo do relatório', '5. Metodologia',
    '6. Características do SPDA da edificação', '7. Referências normativas', '8. Equipamentos', '9. Análise de risco', '10. Condição verificada',
    '11. Conclusão', 'Anexo 01 — Relatório fotográfico', 'Anexo 02 — Certificados de calibração', 'Anexo 03 — Anotação de Responsabilidade Técnica',
    'Aviso legal de confidencialidade']), true);
  v.igual('sumário antes da seção 1', corpo.indexOf('Sumário') < corpo.lastIndexOf('1. Unidade'), true);
  v.igual('emitente H&M com CNPJ na capa', corpo.includes(`${EMPRESA.razaoSocial} — CNPJ ${EMPRESA.cnpj}`), true);
  v.igual('responsável técnico de outra empresa na capa', corpo.includes('Empresa do responsável técnico') && corpo.includes('Empresa Parceira de Engenharia LTDA'), true);
  v.igual('código, contrato e ART na capa', ['HM-SPDA-0000', '0000/00-00000', '0000000000000'].every(t => corpo.includes(t)), true);
  v.igual('tabela de revisões', corpo.includes('Emissão inicial'), true);
  v.igual('rodapé com os dados da empresa', [EMPRESA.razaoSocial, EMPRESA.cnpj, EMPRESA.telefone, EMPRESA.email].every(t => rodape.includes(t)), true);
  v.igual('ensaios de continuidade em mΩ', ['7,33 mΩ', '148,09 mΩ', '42,03 mΩ'].every(t => corpo.includes(t)), true);
  v.igual('estatística dos ensaios (menor / média / maior)', corpo.includes('Menor medição') && corpo.includes('2,93 mΩ') && corpo.includes('148,09 mΩ'), true);
  v.igual('resistência de aterramento do BEP', corpo.includes('BEP: 6,1 Ω'), true);
  v.igual('análise de risco completa no laudo', ['9.1 Objeto e premissas', '9.4 Resultado', '9.6 Conclusão e recomendação'].every(t => corpo.includes(t)), true);
  v.igual('instrumentos com data de calibração', corpo.includes('20/02/2026') && corpo.includes('00000/2026'), true);
  v.igual('foto do ensaio com câmera, GPS e resultado', corpo.includes('Câmera | 27/10/2026, 10:15:00 | GPS: -15.780150, -47.929250') && corpo.includes('Ensaio 1: Franklin 1 × Franklin 2 | Resultado: 7,33 mΩ | Situação: Conforme'), true);
  v.igual('foto fora do local marcada', corpo.includes('[CONFERIR — foto registrada a 18,4 km do local da obra]'), true);
  v.igual('foto fora da data marcada', corpo.includes('[CONFERIR — foto de 28/10/2026, fora da data da inspeção]'), true);
  v.igual('conferência das fotos no parecer', /PARECER TÉCNICO[\s\S]*CONFORME[\s\S]*\[CONFERIR — 1 foto\(s\) com local ou data incompatível/.test(corpo), true);
  v.igual('parecer calculado mantido', res.parecer.situacao, 'CONFORME');
  v.igual('fotos embutidas (localização, prancha, 7 do anexo, certificado e ART)', imagens >= 3, true);
  v.igual('aviso legal com o nome da H&M', corpo.includes(`Documento de uso restrito e controlado — ${EMPRESA.razaoSocial}`), true);

  // calibração vencida e fotos sem problema
  const d2 = JSON.parse(fs.readFileSync(EXEMPLO, 'utf8'));
  montarFotos(d2);
  d2.inspecao.fotos = d2.inspecao.fotos.filter(f => f.ensaio !== '6');
  d2.inspecao.instrumentos[0].validade = '2026-10-01';
  const r2 = await textoDoLaudo(d2);
  v.igual('calibração vencida na data da inspeção marcada', r2.corpo.includes('[CONFERIR] Calibração vencida na data da inspeção'), true);
  v.igual('sem foto suspeita: sem conferência no parecer', [r2.corpo.includes('Conferência dos registros fotográficos'), /PARECER TÉCNICO[^\n]*\n[^\n]*\[CONFERIR/.test(r2.corpo)], [false, false]);

  // os erros encontrados no laudo de referência (29/10/2026), reproduzidos em
  // dados fictícios: cada um tem de ser apontado para conferir (consistencia.js)
  v.igual('exemplo sem inconsistência', res.avisos, []);
  const d4 = JSON.parse(fs.readFileSync(EXEMPLO, 'utf8'));
  montarFotos(d4);
  d4.obra.pavimentos = 4;
  const sinal = d4.linhas.find(l => l.tipo === 'sinal');
  sinal.ct = 'at_trafo';                                                   // linha de sinal com CT de AT
  const zonaInterna = d4.zonas.find(z => z.tipo !== 'externa');
  zonaInterna.perigo_especial = 'panico_baixo'; zonaInterna.nz = 600;     // "até 100 pessoas" com 600
  d4.inspecao.dados_projeto = [{ dado: 'Captação provisória', valor: 'NP III', fonte: 'as built' }]; // cálculo com NP I
  d4.inspecao.continuidade.push({ ...d4.inspecao.continuidade[7], ponto: '19' }); // mesmo par ensaiado duas vezes
  d4.inspecao.continuidade.push({ ...d4.inspecao.continuidade[0], ponto: '1', origem: 'Franklin 1', destino: 'Mastro' }); // número repetido
  d4.inspecao.instrumentos[0].serie = '';
  const r4 = await textoDoLaudo(d4);
  const avisos = r4.res.avisos.map(a => a.texto).join('\n');
  v.igual('aponta linha de sinal com CT de AT', /Linha de sinal .* CT é 1/.test(avisos), true);
  v.igual('aponta pânico baixo com 600 pessoas e 4 pavimentos', /600 pessoas na zona e 4 pavimentos/.test(avisos), true);
  v.igual('aponta NP do cálculo × NP do as built', /usa SPDA NP I, mas .* indica NP III/.test(avisos), true);
  v.igual('aponta par de pontos ensaiado duas vezes', /mesmo par de pontos foi ensaiado 2 vezes .* ensaios 8, 19/.test(avisos), true);
  v.igual('aponta número de ensaio repetido', /Número de ensaio repetido: 1\b/.test(avisos), true);
  v.igual('aponta instrumento sem série', /sem número de série/.test(avisos), true);
  v.igual('avisos no laudo (seção 10) e no parecer', r4.corpo.includes('Conferência dos dados e dos registros fotográficos') && /PARECER TÉCNICO[\s\S]*\[CONFERIR — 6 inconsistência\(s\) nos dados e 1 foto/.test(r4.corpo), true);
  v.igual('avisos do risco também na análise de risco (9.1)', /9\.1 Objeto e premissas[\s\S]*Linha de sinal[\s\S]*9\.2 Áreas/.test(r4.corpo), true);

  // laudo só de aterramento
  const d3 = JSON.parse(fs.readFileSync(EXEMPLO, 'utf8'));
  d3.meta.tipo_laudo = 'aterramento';
  montarFotos(d3);
  const r3 = await textoDoLaudo(d3);
  v.igual('aterramento: nome do arquivo', r3.doc.nomeArquivo, 'Hospital_Exemplo_Norte_Laudo_Aterramento_R00.docx');
  v.igual('aterramento: título', r3.corpo.includes('LAUDO TÉCNICO DE ATERRAMENTO ELÉTRICO'), true);
  v.igual('aterramento: sem análise de risco', [r3.corpo.includes('Análise de risco'), r3.res.risco], [false, null]);
  v.igual('aterramento: sem captação e descidas', [r3.corpo.includes('Subsistema de captação'), r3.corpo.includes('Finalidade do SPDA externo')], [false, false]);
  v.igual('aterramento: itens do SPDA não deixam o parecer inconclusivo', r3.res.parecer.situacao, 'CONFORME');
  v.igual('aterramento: parecer fala do aterramento', r3.corpo.includes('o sistema de aterramento atende à NBR 5410:2004'), true);
  v.igual('aterramento: seções renumeradas', ordem(r3.corpo, ['8. Equipamentos', '9. Condição verificada', '10. Conclusão']), true);

  fs.rmSync(pasta, { recursive: true, force: true });
  v.fim();
})().catch((e) => { console.error(e); process.exitCode = 1; });
