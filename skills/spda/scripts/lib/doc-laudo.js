// Laudo técnico de SPDA e aterramento — NBR 5419:2026 (partes 1 a 4) e NBR 5410.
//
// Estrutura do modelo HM de 29/10/2026 (laudo de SPDA e aterramento de um
// hospital, elaborado pela H&M): capa com identificação, emitente, responsável
// técnico e revisões; sumário; 1 Unidade; 2 Objetivo; 3 Considerações; 4 Escopo;
// 5 Metodologia; 6 Características do SPDA; 7 Referências normativas;
// 8 Equipamentos; 9 Análise de risco (NBR 5419-2, completa); 10 Condição
// verificada; 11 Conclusão; anexos de fotos (uma por página, com data, GPS e o
// ensaio que a foto comprova), certificados de calibração e ART; aviso legal.
//
// Pedido do usuário: seguir o modelo E manter o que o laudo anterior já
// apurava pela NBR 5419-3, Seção 7 — checklist, não conformidades com prazo,
// pendências e parecer calculado (CONFORME / NÃO CONFORME / INCONCLUSIVO) —, que
// entram na seção 10. O emitente é sempre a H&M (papel timbrado); o responsável
// técnico que assina pode ser de outra empresa (responsavel.empresa).
//
// `meta.tipo_laudo: 'aterramento'` emite só o laudo de aterramento (sem SPDA):
// sai a análise de risco e o que é exclusivo do SPDA (captação e descidas).

const fs = require('fs');
const path = require('path');
const { Paragraph, AlignmentType } = require('docx');
const B = require('../../../_comum/docx-base');
const { EMPRESA } = require('../../../_comum/empresa');
const { lerExif, coordenadas, distanciaM } = require('../../../_comum/exif');
const C = require('./doc-comum');
const PR = require('./parecer-risco');
const { corpoRisco, resumoDps } = require('./doc-risco');

const TIPO_INSPECAO = {
  durante_instalacao: 'Durante a instalação do SPDA (7.3.2 a)',
  apos_instalacao: 'Após a instalação, na emissão do as built (7.3.2 b)',
  alteracao: 'Após alteração física, de uso ou do SPDA (7.3.2 c e d)',
  descarga: 'Após suspeita de descarga atmosférica na estrutura ou atuação de DPS classe I (7.3.2 e)',
  periodica: 'Inspeção periódica (7.3.2 f)',
  provisorio: 'SPDA provisório de etapa de obra — após a instalação (7.3.2 b), com nova inspeção obrigatória após a implantação definitiva (7.3.2 c)',
};

const SECOES_CHECKLIST = ['Documentação', 'Captação', 'Descidas', 'Aterramento', 'Equipotencialização', 'DPS'];
const SECOES_SO_ATERRAMENTO = ['Aterramento', 'Equipotencialização', 'DPS'];

// Foto a mais de 500 m do endereço da obra ou fora das datas da inspeção é
// marcada [CONFERIR] (no modelo de 27/10, parte das fotos dos ensaios saiu com
// GPS do escritório e data do dia seguinte — quem confere o laudo vê isso).
const DISTANCIA_MAX_FOTO_M = 500;

const CATEGORIAS_FOTO = {
  localizacao: 'Localização',
  prancha: 'Prancha / as built',
  ensaio: 'Ensaio',
  geral: 'Inspeção',
  metodo: 'Metodologia',
  calibracao: 'Certificado de calibração',
  art: 'ART',
};

function corSituacao(s) {
  return { C: 'E2EFDA', NC: 'F8CBAD', NV: 'FFF2CC', NA: 'EDEDED' }[s];
}

function capitalizar(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// Continuidade em mΩ abaixo de 1 Ω (como o instrumento mostra), senão em Ω
function fmtOhm(v) {
  if (v == null || v === '' || !Number.isFinite(Number(v))) return '';
  const n = Number(v);
  return n < 1 ? `${B.fmtNum(n * 1000, 2)} mΩ` : `${B.fmtNum(n, 3)} Ω`;
}

function fmtDataHora(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(iso));
  if (!m) return String(iso);
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? `, ${m[4]}:${m[5]}${m[6] ? `:${m[6]}` : ''}` : ''}`;
}

// "27/10/2026 10:08:52" ou ISO → ISO (AAAA-MM-DDTHH:MM:SS)
function dataHoraIso(v) {
  if (!v) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(v));
  if (br) return `${br[3]}-${br[2]}-${br[1]}${br[4] ? `T${br[4]}:${br[5]}:${br[6] || '00'}` : ''}`;
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v) : null;
}

function fmtGps(g) {
  return g ? `${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}` : '';
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

// Junta a observação com as fotos sem repetir referência que já está no texto.
function obsComFoto(obs, foto) {
  const texto = String(obs || '').trim();
  const refs = String(foto || '').split(',').map(x => x.trim()).filter(Boolean);
  const faltam = refs.filter(r => !texto.includes(r));
  return [texto, faltam.length ? `(${faltam.length > 1 ? 'fotos' : 'foto'} ${faltam.join(', ')})` : ''].filter(Boolean).join(' ');
}

// Datas da inspeção: data_inspecao, data_inspecao_fim (intervalo) e/ou a lista datas_inspecao
function datasDaInspecao(insp) {
  const datas = new Set((insp.datas_inspecao || []).map(d => String(d).slice(0, 10)));
  const ini = insp.data_inspecao && String(insp.data_inspecao).slice(0, 10);
  const fim = insp.data_inspecao_fim && String(insp.data_inspecao_fim).slice(0, 10);
  if (ini && fim && fim >= ini) {
    for (let d = new Date(`${ini}T12:00:00`); d.toISOString().slice(0, 10) <= fim; d.setDate(d.getDate() + 1)) datas.add(d.toISOString().slice(0, 10));
  } else if (ini) {
    datas.add(ini);
  }
  return datas;
}

// Fotos com metadados resolvidos (formulário primeiro; EXIF do arquivo se faltar)
// e a conferência de local/data.
function prepararFotos(res) {
  const { dados } = res;
  const insp = dados.inspecao || {};
  const obraGps = coordenadas((dados.obra || {}).coordenadas);
  const datas = datasDaInspecao(insp);
  const ensaiosPorPonto = new Map((res.ensaios || []).map(e => [String(e.ponto), e]));
  return (insp.fotos || []).map((ft, i) => {
    const arq = resolverFoto(ft.arquivo, res);
    let exif = { data_hora: null, gps: null };
    if (arq && (!ft.data_hora || !ft.gps) && /\.jpe?g$/i.test(arq)) exif = lerExif(fs.readFileSync(arq));
    const dataHora = dataHoraIso(ft.data_hora) || exif.data_hora;
    const gps = coordenadas(ft.gps) || exif.gps;
    const ensaio = ft.ensaio != null && ft.ensaio !== '' ? ensaiosPorPonto.get(String(ft.ensaio)) || null : null;
    const alertas = [];
    if (gps && obraGps) {
      const d = distanciaM(gps, obraGps);
      if (d > DISTANCIA_MAX_FOTO_M) alertas.push(`[CONFERIR — foto registrada a ${d >= 1000 ? `${B.fmtNum(d / 1000, 1)} km` : `${B.fmtNum(d, 0)} m`} do local da obra]`);
    }
    if (dataHora && datas.size && !datas.has(dataHora.slice(0, 10))) {
      alertas.push(`[CONFERIR — foto de ${fmtDataHora(dataHora.slice(0, 10))}, fora da data da inspeção]`);
    }
    if (ft.ensaio && !ensaio) alertas.push(`[CONFERIR — ensaio "${ft.ensaio}" não encontrado na tabela de continuidade]`);
    return { ...ft, n: i + 1, arq, dataHora, gps, ensaioRef: ensaio, alertas, categoria: ft.categoria || (ensaio ? 'ensaio' : 'geral') };
  });
}

function imagensDaCategoria(fotos, categoria, larguraCm = 16, alturaMaxCm = 21) {
  const f = [];
  for (const ft of fotos.filter(x => x.categoria === categoria)) {
    const img = ft.arq ? B.imagem(ft.arq, larguraCm, { alturaMaxCm }) : null;
    f.push(new Paragraph({ alignment: AlignmentType.CENTER, children: img ? [img] : B.runs(`[${ft.id || `foto ${ft.n}`}: arquivo não encontrado — anexar]`, { italics: true, color: B.COR.suave }) }));
    const legenda = [ft.descricao, ft.local].filter(Boolean).join(' — ');
    if (legenda) f.push(B.p(legenda, { align: AlignmentType.CENTER, italics: true, color: B.COR.suave, size: 17, after: 160 }));
  }
  return f;
}

// Numeração das seções e lista para o sumário
function numerador() {
  const titulos = [];
  let n = 0;
  return {
    titulos,
    secao(texto) { n += 1; titulos.push(`${n}. ${texto}`); return { n, titulo: B.titulo(`${n}. ${texto}`) }; },
    anexo(texto) { titulos.push(texto); return B.titulo(texto); },
  };
}

function revisoes(dados) {
  const meta = dados.meta || {};
  const r = dados.responsavel || {};
  if ((meta.revisoes || []).length) {
    return meta.revisoes.map(x => [x.revisao, B.fmtData(x.data), x.descricao, x.responsavel || r.nome || '']);
  }
  const [rev, ...resto] = String(meta.revisao || 'R00').split(' ');
  const descricao = resto.join(' ').replace(/^\(|\)$/g, '') || (rev === 'R00' ? 'Emissão inicial' : 'Revisão');
  return [[rev, B.fmtData(meta.data), descricao, r.nome || '']];
}

function gerarLaudo(res) {
  const { dados, dim, checklist, ncs, ensaios, parecer } = res;
  const { cliente = {}, obra = {}, responsavel = {}, meta = {} } = dados;
  const est = dados.estrutura || {};
  const spda = dados.spda || {};
  const insp = dados.inspecao || {};
  const prov = dados.spda_provisorio;
  const soAterramento = meta.tipo_laudo === 'aterramento';
  const comRisco = !soAterramento && !!res.risco;
  const fotos = prepararFotos(res);
  const instr = insp.instrumentos || [];
  const ater = insp.aterramento || [];
  const medidos = ensaios.filter(e => e.valor_ohm != null && e.valor_ohm !== '' && Number.isFinite(Number(e.valor_ohm)));
  const valores = medidos.map(e => Number(e.valor_ohm));
  const unidade = cliente.unidade || obra.nome || '';
  const nomeLaudo = soAterramento ? 'Laudo técnico de aterramento elétrico' : 'Laudo técnico de SPDA e aterramento';
  const sistema = soAterramento ? 'sistema de aterramento elétrico' : 'Sistema de Proteção contra Descargas Atmosféricas (SPDA) e sistema de aterramento';
  const local = C.enderecoCompleto(cliente) + (cliente.cep && !String(cliente.endereco || '').includes(cliente.cep) ? ` — CEP ${cliente.cep}` : '');
  const dataInsp = B.fmtData(insp.data_inspecao) + (insp.data_inspecao_fim ? ` a ${B.fmtData(insp.data_inspecao_fim)}` : '');
  const rtEmpresa = responsavel.empresa && responsavel.empresa !== EMPRESA.razaoSocial ? responsavel.empresa : '';

  // ── Capa ────────────────────────────────────────────────────────────────
  const capa = [];
  capa.push(...B.capa(soAterramento ? 'LAUDO TÉCNICO DE ATERRAMENTO ELÉTRICO' : 'LAUDO TÉCNICO DO SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS (SPDA) E ATERRAMENTO',
    soAterramento ? 'ABNT NBR 5410:2004 — ABNT NBR 15749 — ABNT NBR 5419-3:2026 (equipotencialização)'
      : `ABNT NBR 5419:2026, partes 1 a 4 — ABNT NBR 5410:2004 — ${TIPO_INSPECAO[insp.tipo] || TIPO_INSPECAO.periodica}`));
  capa.push(B.tabela(['Código', 'Emissão', 'Revisão', 'Contrato nº', 'ART nº'],
    [[meta.codigo || insp.documento_n || '(preencher)', B.fmtData(meta.data), String(meta.revisao || 'R00').split(' ')[0], meta.contrato || '—', responsavel.art || '(preencher)']], [1.4, 1, 0.8, 1.3, 1.5]));
  capa.push(B.espaco(80));
  capa.push(B.tabelaKV([
    ['Emitente', `${EMPRESA.razaoSocial} — CNPJ ${EMPRESA.cnpj}`],
    ['Endereço do emitente', `${EMPRESA.endereco}, CEP ${EMPRESA.cep} — ${EMPRESA.telefone} · ${EMPRESA.email}`],
    ['Responsável técnico', [responsavel.nome || '(preencher)', responsavel.titulo || 'Engenheiro Eletricista'].join(' — ')],
    ['CREA / RNP', `CREA ${responsavel.crea || '(preencher)'}${responsavel.rnp ? ` — RNP ${responsavel.rnp}` : ''}`],
    ...(rtEmpresa ? [['Empresa do responsável técnico', `${rtEmpresa}${responsavel.cnpj ? ` — CNPJ ${responsavel.cnpj}` : ''}`]] : []),
  ]));
  capa.push(B.espaco(80));
  capa.push(B.tabelaKV([
    ['Contratante', `${cliente.nome || '(preencher)'}${cliente.cnpj ? ` — CNPJ ${cliente.cnpj}` : ''}`],
    ['Unidade', unidade],
    ['Local do serviço', local],
    ['Objetivo', soAterramento ? 'Laudo de continuidade elétrica e de resistência do sistema de aterramento.' : 'Laudo de continuidade elétrica nas estruturas e no sistema de aterramento, com análise de risco (NBR 5419-2:2026).'],
    ['Data da inspeção', dataInsp || '(preencher)'],
    ['Observações', meta.observacoes_capa || (medidos.length || ater.length ? 'Todas as informações foram aferidas in loco, com miliohmímetro e terrômetro.' : '—')],
  ]));
  if (meta.data && insp.data_inspecao && String(meta.data) < String(insp.data_inspecao)) {
    capa.push(B.nota('[CONFERIR] A data de emissão é anterior à data da inspeção em campo — ajustar antes de assinar.'));
  }
  capa.push(B.espaco(160));
  capa.push(B.tabela(['Revisão', 'Data', 'Descrição', 'Responsável'], revisoes(dados), [0.8, 1, 3, 2]));
  capa.push(B.quebraPagina());

  // ── Corpo ───────────────────────────────────────────────────────────────
  const num = numerador();
  const f = [];

  // 1. Unidade
  f.push(num.secao('Unidade').titulo);
  f.push(...imagensDaCategoria(fotos, 'localizacao', 16, 11));
  f.push(B.tabelaKV([
    ['Proprietário / estabelecimento', [cliente.nome, unidade].filter(Boolean).join(' — ')],
    ['Endereço', local],
    ['Tipo do estabelecimento', obra.uso],
    ['Coordenadas', fmtGps(coordenadas(obra.coordenadas)) || '(informar)'],
    ['Data da medição', dataInsp || '(preencher)'],
  ]));

  // 2. Objetivo
  const s2 = num.secao('Objetivo');
  f.push(s2.titulo);
  f.push(B.p(`O presente laudo tem por objetivo a avaliação quantitativa e qualitativa das condições técnicas, operacionais e de segurança do ${sistema} de ${[cliente.nome, unidade].filter(Boolean).join(' — ')}, em ${[cliente.cidade, cliente.uf].filter(Boolean).join('/')}.`));
  f.push(B.p(soAterramento
    ? 'A avaliação compreende inspeção visual, verificação das conexões e da equipotencialização, ensaios de continuidade elétrica e medição da resistência de aterramento, conforme a ABNT NBR 5410 e a ABNT NBR 15749.'
    : PR.textoObjetivo(res)));
  f.push(B.p(`As informações, medições e conclusões correspondem exclusivamente às condições verificadas na inspeção de ${dataInsp || '(data)'}. Alterações posteriores na estrutura, nas instalações elétricas, no ${soAterramento ? 'aterramento' : 'SPDA ou no aterramento'} ou nas condições de uso podem modificar essas condições e exigir nova avaliação, com os ensaios pertinentes. A avaliação está limitada aos componentes efetivamente inspecionados, aos pontos ensaiados e à documentação disponibilizada.`));
  f.push(B.tabelaKV([
    ['Abrangência', insp.abrangencia || '(informar)'],
    ['Fora do escopo / não inspecionado', insp.fora_escopo || '—'],
    ['Itens adicionais', insp.itens_adicionais || '—'],
  ]));

  // 3. Considerações
  const s3 = num.secao('Considerações');
  f.push(s3.titulo);
  let c3 = 0;
  const sub3 = (t) => f.push(B.titulo(`${s3.n}.${++c3} ${t}`, 2));
  sub3('Objetivo e identificação da edificação');
  f.push(B.p(`Este laudo apresenta os resultados da inspeção visual, das verificações técnicas e dos ensaios de continuidade elétrica${ater.length ? ' e de resistência de aterramento' : ''} realizados no ${sistema} de ${cliente.nome || '(contratante)'}${cliente.cnpj ? `, CNPJ ${cliente.cnpj}` : ''}${unidade ? ` — ${unidade}` : ''}, localizado em ${local || '(endereço)'}, com inspeção em ${dataInsp || '(data)'}. Foram considerados, em especial: continuidade elétrica dos componentes e das interligações; equipotencialização das massas e dos elementos metálicos; integridade das conexões; condições do sistema de aterramento; proteção contra choques elétricos e diferenças perigosas de potencial.`));
  if (!soAterramento) {
    sub3('Finalidade do SPDA externo');
    f.push(B.p('O SPDA externo intercepta as descargas atmosféricas pelo subsistema de captação (captores naturais ou não naturais), conduz a corrente pelos condutores de descida, distribui-a entre os caminhos disponíveis e a dispersa no solo pelo subsistema de aterramento, reduzindo os danos físicos à estrutura, às instalações e às pessoas. Seu desempenho depende da continuidade elétrica, da distribuição das descidas, da integridade das conexões e da compatibilidade entre captação, descidas e aterramento.'));
    sub3('Finalidade do SPDA interno');
    f.push(B.p('O SPDA interno reduz os centelhamentos perigosos, as sobretensões e as diferenças de potencial no interior da estrutura durante a passagem da corrente da descarga, por meio de: ligações equipotenciais entre o SPDA, o aterramento, as massas e os elementos metálicos; interligação ao Barramento de Equipotencialização Principal (BEP); dispositivos de proteção contra surtos (DPS) coordenados; e distâncias de segurança entre o SPDA externo e os demais elementos condutores.'));
  }
  sub3('Requisitos de montagem e desempenho');
  f.push(B.p(`A montagem deve ter resistência mecânica, continuidade elétrica e capacidade para os efeitos térmicos, eletromagnéticos e eletrodinâmicos da corrente, além de resistir a intempéries, umidade e corrosão. O sistema de aterramento deve apresentar continuidade, integridade das conexões, compatibilidade entre materiais, proteção contra corrosão e condições de inspeção e ensaio. A resistência de aterramento deve ser tão baixa quanto possível, mas não é, isoladamente, critério de conformidade${soAterramento ? '' : ' do SPDA (NBR 5419-3:2026, 7.1.4)'}: a avaliação considera em conjunto a geometria, a continuidade, a equipotencialização e as condições construtivas.`));
  sub3('Componentes, interligações e materiais');
  f.push(B.p('Captores, condutores, cordoalhas, descidas, hastes, eletrodos, barramentos, fixações, caixas de inspeção e conexões devem garantir continuidade permanente, resistência mecânica, compatibilidade eletroquímica e proteção contra corrosão. As conexões devem ser feitas por solda exotérmica, compressão ou conectores apropriados; não se aceitam conexões frouxas, oxidadas, improvisadas ou com redução de seção. Os pontos de inspeção e ensaio devem permanecer acessíveis, identificados e protegidos. Alterações no sistema devem ser avaliadas por profissional habilitado, com atualização do projeto e ART.'));
  sub3('Anexos');
  f.push(B.p(`O Anexo 01 traz o relatório fotográfico — componentes avaliados, pontos de medição e a leitura de cada ensaio, com data, hora e coordenadas. O Anexo 02 traz os certificados de calibração dos instrumentos. O Anexo 03 traz a Anotação de Responsabilidade Técnica — ART nº ${responsavel.art || '(preencher)'}, registrada no CREA, referente aos serviços deste laudo.`));

  // 4. Escopo
  f.push(num.secao('Escopo do relatório').titulo);
  f.push(B.p(soAterramento
    ? 'Sistema de aterramento elétrico: eletrodos, condutores de aterramento, conexões, caixas de inspeção, Barramento de Equipotencialização Principal (BEP) e ligações equipotenciais das massas e dos elementos metálicos.'
    : 'SPDA — Sistema de Proteção contra Descargas Atmosféricas, constituído pelos subsistemas de captação, descida e aterramento, destinados a interceptar as descargas atmosféricas, conduzir suas correntes com segurança e dispersá-las no solo, e as ligações equipotenciais ao BEP e aos sistemas internos.'));

  // 5. Metodologia
  f.push(num.secao('Metodologia').titulo);
  f.push(B.p('O trabalho compreendeu inspeção em campo, ensaios elétricos, registro das informações, análise dos resultados no escritório e consolidação neste laudo.'));
  [
    'Análise documental: conferência do projeto/as built com a norma de origem e dos itens do 7.5.3 da NBR 5419-3:2026.',
    'Inspeção visual dos componentes acessíveis — instalação, conservação, fixação, interligação, identificação e integridade —, com registro fotográfico numerado (Anexo 01).',
    'Continuidade elétrica com miliohmímetro a quatro terminais (método Kelvin), 1 A a 5 A, em CC ou frequência diferente de 60 Hz e múltiplos, conforme o Anexo F da NBR 5419-3:2026; não se usa multímetro nem terrômetro-alicate (F.1.3.3).',
    'Resistência de aterramento com terrômetro pelo método da queda de potencial (NBR 15749), com eletrodos auxiliares em linha e leituras em mais de uma posição para verificar a estabilidade.',
    ...(soAterramento ? [] : ['Inspeção de DPS/MPS conforme 7.3.5 da NBR 5419-3 e Seção 9 da NBR 5419-4:2026.']),
    'Registro em planilha de campo: identificação do ponto, tipo de ensaio, valor medido, foto e situação de cada item.',
    'Segurança: atividades sem ameaça de tempestade (7.1.2); trabalho em altura conforme NR-35 e intervenções em painéis conforme NR-10.',
  ].forEach(t => f.push(B.marcador(t)));

  // 6. Características
  const s6 = num.secao(soAterramento ? 'Características do sistema de aterramento' : 'Características do SPDA da edificação');
  f.push(s6.titulo);
  const caixas = spda.caixas_inspecao != null ? spda.caixas_inspecao : ensaios.filter(e => /caixa/i.test(`${e.origem} ${e.destino}`)).length;
  const subsistemas = [
    ...(soAterramento ? [] : [
      ['Subsistema de captação', spda.descricao_captacao],
      ['Subsistema de descida', spda.descricao_descidas || (spda.descida_natural ? 'Descidas naturais pelas armaduras da estrutura de concreto.' : '')],
    ]),
    ['Subsistema de aterramento', spda.descricao_aterramento],
    ['Equipotencialização', spda.descricao_equipotencializacao],
  ].filter(([, t]) => t);
  subsistemas.forEach(([k, t]) => f.push(B.p(`${k}: ${t}`)));
  const perimetro = dim ? dim.perimetro : (est.L && est.W ? 2 * (est.L + est.W) : null);
  f.push(B.tabelaKV([
    ['Edificação', [cliente.nome, unidade].filter(Boolean).join(' — ')],
    ['Uso / ocupação', obra.uso],
    ['Sistema avaliado', soAterramento ? 'Sistema de aterramento' : 'SPDA e sistema de aterramento'],
    ['Data da inspeção', dataInsp],
    ...(est.L ? [['Dimensões (C × L × H)', `${B.fmtNum(est.L)} × ${B.fmtNum(est.W)} × ${B.fmtNum(est.H)} m${perimetro ? `; perímetro ${B.fmtNum(perimetro, 0)} m` : ''}${est.dimensoes_estimadas ? ' [CONFERIR]' : ''}`]] : []),
    ...(est.tipo_construcao ? [['Tipo construtivo', capitalizar(String(est.tipo_construcao).replace(/_/g, ' '))]] : []),
    ...(soAterramento ? [] : [
      ['Nível de proteção (projeto)', spda.np ? `NP ${spda.np}` : '—'],
      ['Descidas', spda.descida_natural ? 'naturais (armaduras)' : 'não naturais'],
      ['Contador de descargas', (insp.contador_anterior || insp.contador_atual) ? `${insp.contador_anterior || '—'} → ${insp.contador_atual || '—'}` : 'Não informado'],
    ]),
    ['Caixas de inspeção ensaiadas', caixas ? String(caixas) : '—'],
    ['Barramento de equipotencialização', spda.bep || 'BEP'],
    ['Ensaios de continuidade elétrica', `${medidos.length} medição(ões)${ensaios.length > medidos.length ? ` de ${ensaios.length} previstas` : ''}`],
    ['Medições de resistência de aterramento', ater.length ? `${ater.length} — ${ater.map(a => `${a.ponto}: ${B.fmtNum(a.valor_ohm, 2)} Ω`).join('; ')}` : '—'],
    ['Instrumentos', instr.length ? instr.map(i => [i.instrumento, i.fabricante, i.modelo].filter(Boolean).join(' ')).join('; ') : '(preencher — seção 8)'],
    ['Serviço essencial / periodicidade', `${insp.servico_essencial ? 'Sim' : 'Não'} — inspeção a cada ${res.intervalo} ano${res.intervalo > 1 ? 's' : ''} (NBR 5419-3:2026, 7.3.2 f)`],
    ['Referência normativa', soAterramento ? 'ABNT NBR 5410:2004 e ABNT NBR 15749' : 'ABNT NBR 5419:2026 e ABNT NBR 5410:2004'],
  ]));
  if ((insp.dados_projeto || []).length) {
    f.push(B.titulo(`${s6.n}.1 Dados obtidos dos documentos recebidos`, 2));
    f.push(B.tabela(['Dado', 'Valor', 'Fonte'], insp.dados_projeto.map(d => [d.dado, d.valor, d.fonte]), [1.3, 3.6, 1.5], { tamanho: 16 }));
    f.push(B.nota('Valores marcados [CONFERIR] foram estimados a partir dos desenhos e devem ser confirmados em campo antes da emissão.'));
  }
  if (prov) {
    f.push(B.titulo(`${s6.n}.${(insp.dados_projeto || []).length ? 2 : 1} SPDA provisório — etapa de obra`, 2));
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

  // 7. Referências normativas
  f.push(num.secao('Referências normativas').titulo);
  f.push(B.p('Para referências datadas, aplicam-se as edições citadas; para as não datadas, as edições mais recentes, com emendas.'));
  [
    ...(soAterramento ? [] : [
      ['ABNT NBR 5419-1:2026', 'Proteção contra descargas atmosféricas — Princípios gerais'],
      ['ABNT NBR 5419-2:2026', 'Proteção contra descargas atmosféricas — Análise de risco'],
    ]),
    ['ABNT NBR 5419-3:2026', 'Danos físicos a estruturas e perigos à vida (inspeção, Anexo F e equipotencialização)'],
    ['ABNT NBR 5419-4:2026', 'Sistemas elétricos e eletrônicos internos na estrutura (MPS/DPS)'],
    ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão'],
    ['ABNT NBR 15749', 'Medição de resistência de aterramento e de potenciais na superfície do solo'],
    ['ABNT NBR 7117-1', 'Medição da resistividade do solo (quando aplicável)'],
    ['ABNT NBR 13571', 'Haste de aterramento aço-cobreado e acessórios'],
    ['ABNT NBR 6323', 'Galvanização por imersão a quente de produtos de aço ou ferro fundido'],
    ['IEC 62305 (série)', 'Protection against lightning'],
    ['NR-10 e NR-35', 'Segurança em instalações elétricas e trabalho em altura'],
  ].forEach(([n, d]) => f.push(B.marcador(`${n} — ${d}`)));
  if (insp.norma_origem) {
    f.push(B.p(`Norma de origem do projeto existente: ${insp.norma_origem}. Conforme a NBR 5419-3:2026, 7.3.1 a), o SPDA existente foi verificado quanto à aderência ao seu projeto e à norma de origem; ampliações, reformas e novas instalações posteriores foram verificadas contra a edição vigente.`, { before: 80 }));
  }
  if (insp.justificativa_norma) f.push(B.p(insp.justificativa_norma));
  if ((insp.documentos || []).length) {
    f.push(B.tabela(['Documento recebido do cliente', 'Recebido?', 'Data/rev.', 'Situação'],
      insp.documentos.map(d => [d.documento, d.recebido, d.data_rev, d.situacao]), [3, 0.8, 1, 2.2]));
  }

  // 8. Equipamentos
  f.push(num.secao('Equipamentos').titulo);
  f.push(B.tabela(['Instrumento', 'Fabricante', 'Modelo', 'Nº série', 'Certificado', 'Calibração', 'Validade', 'Uso'],
    instr.length ? instr.map(i => [i.instrumento, i.fabricante, i.modelo, i.serie, i.certificado, B.fmtData(i.data_calibracao), B.fmtData(i.validade), i.uso])
      : [['(preencher)', '', '', '', '', '', '', '']],
    [1.5, 1, 0.9, 1, 1, 0.9, 0.9, 1.2], { tamanho: 15 }));
  const vencidos = instr.filter(i => i.validade && insp.data_inspecao && String(i.validade) < String(insp.data_inspecao));
  if (vencidos.length) f.push(B.nota(`[CONFERIR] Calibração vencida na data da inspeção: ${vencidos.map(i => `${i.instrumento} ${i.modelo || ''} (validade ${B.fmtData(i.validade)})`.trim()).join('; ')}.`));
  const semCert = instr.filter(i => !i.certificado);
  if (semCert.length) f.push(B.nota(`[CONFERIR] Instrumento sem certificado de calibração informado: ${semCert.map(i => i.instrumento).join('; ')}.`));
  f.push(...imagensDaCategoria(fotos, 'metodo', 16, 10));
  f.push(B.nota('Os instrumentos devem estar com calibração válida na data da inspeção; os certificados estão no Anexo 02. Modelo e número de série devem ser os mesmos do certificado e das fotos das leituras.'));

  // 9. Análise de risco
  if (comRisco) {
    const s9 = num.secao('Análise de risco — ABNT NBR 5419-2:2026');
    f.push(s9.titulo);
    const ev = res.risco.atual.eventos;
    f.push(B.tabelaKV([
      ['Obra / cliente', [cliente.nome, unidade].filter(Boolean).join(' — ')],
      ['Responsável técnico / ART', `${responsavel.nome || '(preencher)'} — ART ${responsavel.art || '(preencher)'}`],
      ['Localização', `${est.municipio || cliente.cidade || ''}/${est.uf || cliente.uf || ''}`],
      ['Geolocalização', fmtGps(coordenadas(obra.coordenadas)) || '—'],
      ['NG', `${B.fmtNum(ev.ng)} descargas/km²/ano (${ev.ngFonte || 'NBR 5419-2:2026, Tabela F.1'})`],
      ['Cenário avaliado', `${spda.np ? `SPDA NP ${spda.np}` : 'sem SPDA'}${resumoDps(dados)}`],
    ]));
    f.push(...corpoRisco(res, { secao: s9.n }));
  }

  // 10. Condição verificada
  const s10 = num.secao('Condição verificada');
  f.push(s10.titulo);
  let c10 = 0;
  const sub10 = (t) => f.push(B.titulo(`${s10.n}.${++c10} ${t}`, 2));
  const stats = valores.length ? { min: Math.min(...valores), max: Math.max(...valores), media: valores.reduce((a, b) => a + b, 0) / valores.length } : null;
  f.push(B.p(`Com base na inspeção visual, nos registros fotográficos e nos ensaios de ${dataInsp || '(data)'}, foram avaliadas as condições aparentes dos elementos do ${soAterramento ? 'sistema de aterramento' : 'SPDA'} — ${soAterramento ? '' : 'captores, interligações, condutores de descida, '}caixas de inspeção, pontos de aterramento e equipotencialização —, com ênfase na continuidade elétrica dos percursos ensaiados${ater.length ? ' e na resistência de aterramento' : ''}.`));
  if (stats) {
    f.push(B.p(`Foram realizados ${medidos.length} ensaios de continuidade elétrica, com resultados entre ${fmtOhm(stats.min)} e ${fmtOhm(stats.max)} (média de ${fmtOhm(stats.media)}). ${parecer.ensaiosNc ? `${parecer.ensaiosNc} ensaio(s) ficaram acima do critério do Anexo F e constam como não conformidade.` : 'Todos os valores medidos ficaram dentro do critério do Anexo F da NBR 5419-3:2026.'}`));
  }
  if (ater.length) f.push(B.p(`Medição de resistência de aterramento: ${ater.map(a => `${a.ponto} = ${B.fmtNum(a.valor_ohm, 2)} Ω`).join('; ')}.`));
  const pranchas = fotos.filter(x => x.categoria === 'prancha');
  if (pranchas.length) {
    sub10('Prancha as built apresentada');
    f.push(...imagensDaCategoria(fotos, 'prancha', 16.5, 12));
  }
  const secoesChecklist = soAterramento ? SECOES_SO_ATERRAMENTO : SECOES_CHECKLIST;
  const itensChecklist = checklist.filter(c => secoesChecklist.includes(c.secao));
  if (itensChecklist.length) {
    sub10('Checklist de inspeção visual e documental');
    f.push(B.p('Legenda: C = conforme | NC = não conforme | NA = não aplicável | NV = não verificado. Referências: NBR 5419-3:2026, salvo indicação.'));
    for (const secao of secoesChecklist) {
      const itens = itensChecklist.filter(c => c.secao === secao);
      if (!itens.length) continue;
      f.push(B.p(secao, { bold: true, before: 100, after: 40, keepNext: true }));
      f.push(B.tabela(['#', 'Item verificado', 'Ref.', 'Sit.', 'Observação / foto'],
        itens.map(c => [c.cod, c.item, c.requisito.replace(/^NBR 5419-3:2026, /, ''), c.situacao, obsComFoto(c.obs, c.foto)]),
        [0.5, 2.2, 1.1, 0.45, 3.2], { tamanho: 15, destacarColuna: (l, i) => i === 3 ? corSituacao(l[3]) : undefined }));
    }
  }
  sub10('Ensaios de continuidade elétrica (NBR 5419-3:2026, Anexo F)');
  if (ensaios.length) {
    f.push(B.tabela(['Nº', 'Identificação dos pontos ensaiados', 'Ensaio', 'Leitura', 'Critério', 'Situação'],
      ensaios.map(e => [e.ponto, [e.origem, e.destino].filter(Boolean).join(' × '), e.tipo_ensaio, fmtOhm(e.valor_ohm), e.criterio, e.resultado]),
      [0.5, 2.6, 0.55, 0.9, 2.2, 0.6], { tamanho: 15, destacarColuna: (l, i) => i === 5 ? corSituacao(l[5]) : undefined }));
    f.push(B.nota('Tipos de ensaio (Anexo F de 2026): F.1 armaduras de descida + aterramento natural (medição cruzada topo × base de pilares diferentes); F.2 armaduras de pilar (topo × base do mesmo pilar); F.3 fundação; F.4 verificação comprobatória captação × BEP (≤ 0,2 Ω); F.5 descida não natural; F.6 eletrodo de aterramento não natural; F.7 ligação equipotencial.'));
    if (stats) {
      f.push(B.tabela(['Menor medição', 'Média aritmética', 'Maior medição', 'Aterramento'],
        [[fmtOhm(stats.min), fmtOhm(stats.media), fmtOhm(stats.max), ater.length ? ater.map(a => `${B.fmtNum(a.valor_ohm, 2)} Ω`).join(' / ') : '—']], [1, 1, 1, 1]));
    }
  } else {
    f.push(B.p('Nenhum ensaio registrado. [CONFERIR]'));
  }
  if (ater.length) {
    sub10('Resistência de aterramento (NBR 15749)');
    f.push(B.tabela(['Ponto', 'Método', 'Distância (m)', 'Resistência (Ω)', 'Condição do solo'],
      ater.map(a => [a.ponto, a.metodo || 'queda de potencial', B.fmtNum(a.distancia_m), B.fmtNum(a.valor_ohm, 2), a.condicao_solo || '']), [1.4, 1.6, 1, 1, 1.6]));
    f.push(B.nota(soAterramento ? 'A resistência de aterramento deve ser avaliada em conjunto com a continuidade, a equipotencialização e o esquema de aterramento da instalação (NBR 5410).' : 'A resistência de aterramento é informativa: não é critério de aceitação do SPDA (NBR 5419-3:2026, 7.1.4).'));
  }
  sub10('Não conformidades e recomendações');
  if (ncs.length) {
    f.push(B.tabela(['Prioridade', 'Prazo recomendado (NBR 5419-3:2026, 7.4.2)'], Object.entries(res.prazos), [1, 4]));
    f.push(B.espaco(80));
    f.push(B.tabela(['NC', 'Item', 'Local', 'Descrição', 'Requisito', 'Recomendação', 'Prior.', 'Foto'],
      ncs.map(n => [n.id, n.item, n.local, n.descricao, n.requisito, n.recomendacao, n.prioridade, n.foto]),
      [0.6, 0.5, 1.1, 2.3, 1.1, 2.3, 0.5, 0.6], { tamanho: 15 }));
    f.push(B.p('Pela NBR 5419-3:2026, 7.4.3, cabe ao responsável pela estrutura assegurar a correção das não conformidades. Após as correções, recomenda-se nova inspeção dos itens corrigidos, com registro fotográfico e ART de execução.', { before: 80 }));
  } else {
    f.push(B.p('Nenhuma não conformidade constatada.'));
  }
  // Pendências (impedem o CONFORME) e, à parte, a conferência das fotos (local
  // e data): esta não muda o parecer calculado, mas deixa um [CONFERIR] em
  // vermelho no parecer até o engenheiro resolver ou justificar.
  const fotosAlerta = fotos.filter(x => x.alertas.length);
  const nv = itensChecklist.filter(c => c.situacao === 'NV');
  const faltaProv = !!(prov && !prov.as_built);
  // inconsistências de preenchimento (consistencia.js — erros encontrados no laudo de referência)
  const avisos = res.avisos || [];
  let c10Conf = null;
  if (avisos.length || fotosAlerta.length) {
    sub10('Conferência dos dados e dos registros fotográficos');
    c10Conf = c10;
    if (avisos.length) {
      f.push(B.p('Corrigir ou justificar antes de assinar:', { after: 40 }));
      avisos.forEach(a => f.push(B.marcador(a.texto)));
    }
  }
  if (fotosAlerta.length) {
    f.push(B.p(`As fotos abaixo têm data ou coordenadas incompatíveis com a inspeção (${dataInsp || 'data não informada'}${coordenadas(obra.coordenadas) ? `, até ${DISTANCIA_MAX_FOTO_M} m do local da obra` : ''}). Substituir pelo registro feito no local ou justificar antes de assinar.`));
    f.push(B.tabela(['Foto', 'Registro da câmera', 'Ensaio / local', 'Conferir'],
      fotosAlerta.map(x => [x.id || `Foto ${x.n}`, [fmtDataHora(x.dataHora), x.gps ? `GPS ${fmtGps(x.gps)}` : ''].filter(Boolean).join(' — '), x.ensaioRef ? `Ensaio ${x.ensaioRef.ponto}: ${[x.ensaioRef.origem, x.ensaioRef.destino].filter(Boolean).join(' × ')}` : (x.local || ''), x.alertas.join(' ')]),
      [0.6, 1.8, 2, 2.6], { tamanho: 15 }));
  }
  if (nv.length || ensaios.some(e => e.resultado === 'NV') || !instr.length || faltaProv) {
    sub10('Pendências para concluir o laudo');
    f.push(B.p('Enquanto houver pendência, o laudo não pode ser concluído como CONFORME (as não conformidades já constatadas continuam valendo).'));
    const escritorio = nv.filter(c => /escrit/i.test(c.onde || '') || c.secao === 'Documentação');
    const campo = nv.filter(c => !escritorio.includes(c));
    if (campo.length) {
      f.push(B.p('A verificar em campo', { bold: true, after: 40 }));
      f.push(B.tabela(['#', 'Onde', 'Verificar', 'Como / o que registrar'], campo.map(c => [c.cod, c.onde, c.item, c.como]), [0.5, 1.2, 2.4, 2.9], { tamanho: 15 }));
    }
    const linhasEscr = escritorio.map(c => [c.cod, c.item, c.obs || c.como]);
    if (!instr.length) linhasEscr.push(['INST', 'Relacionar instrumentos (marca, modelo, série, certificado e validade da calibração)', 'Preencher a seção 8 e anexar os certificados (Anexo 02)']);
    if (faltaProv) linhasEscr.push(['PROV', 'As built do SPDA provisório: croqui em escala da cobertura com malha, captores/torres, descidas usadas e ligação ao aterramento definitivo, com ART', 'Montar com o levantamento de campo e anexar ao laudo — é o documento que o órgão licenciador confere']);
    if (linhasEscr.length) {
      f.push(B.p('Escritório / cliente', { bold: true, before: 80, after: 40 }));
      f.push(B.tabela(['#', 'Pendência', 'Como'], linhasEscr, [0.6, 2.6, 3.8], { tamanho: 15 }));
    }
  }

  // 11. Conclusão
  const s11 = num.secao('Conclusão');
  f.push(s11.titulo);
  f.push(B.p(`Com base nas inspeções, verificações técnicas, registros fotográficos e ensaios elétricos de ${dataInsp || '(data)'}, apresenta-se a avaliação do ${sistema} de ${[cliente.nome, unidade].filter(Boolean).join(' — ')}. A avaliação foi fundamentada ${soAterramento ? 'na ABNT NBR 5410:2004 (aterramento, condutores de proteção e equipotencialização, em especial 5.1.2.2.3, 6.4.1 e 6.4.2) e na ABNT NBR 15749' : 'na série ABNT NBR 5419:2026 — princípios gerais (parte 1), gerenciamento de risco (parte 2), SPDA externo, inspeção e manutenção (parte 3) e MPS/DPS (parte 4) — e na ABNT NBR 5410:2004'}.`));
  const pc = parecer;
  const conta = (s) => itensChecklist.filter(c => c.situacao === s).length;
  // o texto do parecer (parecer-risco.js) fala do SPDA; no laudo só de aterramento, do aterramento
  const textoParecer = soAterramento
    ? pc.texto.replace('o SPDA atende à norma de origem e à NBR 5419-3:2026, Seção 7,', 'o sistema de aterramento atende à NBR 5410:2004 e aos critérios de continuidade da NBR 5419-3:2026, Anexo F,').replace('conformidade do SPDA', 'conformidade do aterramento')
    : pc.texto;
  f.push(B.tabelaKV([
    ['Itens verificados', `${itensChecklist.length} — C: ${conta('C')} | NC: ${conta('NC')} | NA: ${conta('NA')} | NV: ${conta('NV')}`],
    ['NC por prioridade', `P1 ${pc.porP.P1} | P2 ${pc.porP.P2} | P3 ${pc.porP.P3} | P4 ${pc.porP.P4}`],
    ['Ensaios de continuidade', `${pc.dentro} de ${pc.medidos} medidos dentro do critério (${ensaios.length} previstos)${stats ? `; de ${fmtOhm(stats.min)} a ${fmtOhm(stats.max)}` : ''}`],
    ...(ater.length ? [['Resistência de aterramento', ater.map(a => `${a.ponto}: ${B.fmtNum(a.valor_ohm, 2)} Ω`).join('; ')]] : []),
    ...(comRisco ? [['Análise de risco', `R1 = ${B.fmtExp(res.risco.atual.R1)} (${res.risco.atual.atendeR1 ? 'atende' : 'NÃO atende'} RT = 10⁻⁵)${res.risco.atual.piorF ? `; F = ${B.fmtExp(res.risco.atual.piorF.F)} (${res.risco.atual.atendeF ? 'atende' : 'NÃO atende'} FT = ${B.fmtNum(res.risco.atual.piorF.FT)})` : ''}`]] : []),
    ['PARECER TÉCNICO', `${textoParecer}${c10Conf ? ` [CONFERIR — ${[
      avisos.length ? `${avisos.length} inconsistência(s) nos dados` : '',
      fotosAlerta.length ? `${fotosAlerta.length} foto(s) com local ou data incompatível com a inspeção` : '',
    ].filter(Boolean).join(' e ')}; ver ${s10.n}.${c10Conf}]` : ''}`],
  ], [1, 3]));
  if (pc.situacao === 'NAO_CONFORME_PRELIMINAR' || pc.situacao === 'INCONCLUSIVO') {
    f.push(B.p(`O parecer final (CONFORME ou NÃO CONFORME) só será emitido após a verificação, ou justificativa N.A., de todos os itens${ensaios.length ? `, a realização dos ${ensaios.length} ensaios de continuidade` : ''}${ncs.length ? ` e a correção das não conformidades NC-01 a ${ncs[ncs.length - 1].id}` : ''}.`, { before: 80 }));
  }
  if (prov) {
    f.push(B.p(`Este laudo refere-se ao SPDA PROVISÓRIO da etapa "${prov.etapa}". A implantação do projeto definitivo constitui alteração da estrutura e do SPDA e exige nova inspeção completa e novo laudo antes da ocupação das novas áreas (ABNT NBR 5419-3:2026, 7.3.2 c).`, { before: 100 }));
  }
  [
    `Este laudo reflete as condições observadas nas datas da inspeção. Alterações posteriores na estrutura, no ${soAterramento ? 'aterramento' : 'SPDA'} ou nas instalações, além de danos por descargas atmosféricas, intempéries, furto ou intervenções de terceiros, podem mudar essas condições.`,
    PR.textoLimitacaoEmbutidos(res),
    ...(soAterramento ? [] : [
      'Um SPDA reduz o risco de danos, mas não elimina totalmente a possibilidade de danos por descargas atmosféricas (ABNT NBR 5419-1:2026). Ele não protege equipamentos contra surtos: essa proteção depende das MPS (DPS coordenados, blindagem e roteamento) da ABNT NBR 5419-4 e da ABNT NBR 5410.',
    ]),
    'Recomenda-se manter arquivados com este laudo a ART, as notas fiscais e certificados dos componentes instalados e o registro das inspeções, exigidos na vistoria do órgão licenciador.',
    'Este documento só tem validade na íntegra, com a ART correspondente.',
  ].forEach(t => f.push(B.p(t)));
  const base = insp.data_inspecao || meta.data;
  f.push(B.titulo(`${s11.n}.1 Próxima inspeção`, 2));
  f.push(B.tabelaKV([
    ['Próxima inspeção periódica', `${B.fmtData(B.somarAnos(base, res.intervalo))} (intervalo de ${res.intervalo} ano${res.intervalo > 1 ? 's' : ''}, NBR 5419-3:2026, 7.3.2 f)`],
    ['Inspeção extraordinária obrigatória', 'Após alteração física ou de uso da estrutura; após alteração do sistema; após suspeita de impacto ou atuação de DPS classe I (7.3.2 c, d, e)'],
    ['Verificações visuais intermediárias', 'A cada 6 meses — danos, conexões, furtos (7.3.2, nota 1)'],
    ['DPS/MPS', 'Intervalo máximo igual ao do SPDA ou o do fabricante, o que for mais restritivo (7.3.5; NBR 5419-4, 9.2.3)'],
  ], [1.3, 3]));
  f.push(...C.blocoAssinatura(dados));
  f.push(B.p('Ciente do responsável pela estrutura: ______________________________________________   Nome / cargo / data', { before: 200 }));

  // ── Anexos ──────────────────────────────────────────────────────────────
  // Anexo 01: uma foto por página, como no modelo, com a legenda da câmera
  // (data, hora, GPS) e o ensaio que ela comprova.
  const fotosRelatorio = fotos.filter(x => ['ensaio', 'geral'].includes(x.categoria));
  f.push(B.quebraPagina());
  f.push(num.anexo('Anexo 01 — Relatório fotográfico'));
  if (fotosRelatorio.length) {
    fotosRelatorio.forEach((ft, i) => {
      if (i > 0) f.push(B.quebraPagina());
      f.push(B.p(`Foto ${i + 1}${ft.id ? ` (${ft.id})` : ''}`, { bold: true, after: 80 }));
      const img = ft.arq ? B.imagem(ft.arq, 12, { alturaMaxCm: 16 }) : null;
      f.push(new Paragraph({ alignment: AlignmentType.CENTER, children: img ? [img] : B.runs('[arquivo da foto não encontrado — anexar]', { italics: true, color: B.COR.suave }) }));
      const linhas = [];
      const camera = [ft.dataHora ? fmtDataHora(ft.dataHora) : 'data/hora não registrada', ft.gps ? `GPS: ${fmtGps(ft.gps)}` : 'GPS não registrado'];
      linhas.push(`Câmera | ${camera.join(' | ')}`);
      if (ft.ensaioRef) {
        const e = ft.ensaioRef;
        linhas.push(`Ensaio ${e.ponto}: ${[e.origem, e.destino].filter(Boolean).join(' × ')} | Resultado: ${fmtOhm(e.valor_ohm) || '—'} | Situação: ${{ C: 'Conforme', NC: 'Não conforme', NV: 'Não verificado' }[e.resultado] || e.resultado}`);
      }
      // o local do ensaio já está na linha do ensaio
      const desc = [ft.ensaioRef ? '' : ft.local, ft.subsistema, ft.descricao].filter(Boolean).join(' — ');
      if (desc) linhas.push(desc);
      if (ft.ref) linhas.push(`Referência: ${ft.ref}`);
      linhas.forEach(t => f.push(B.p(t, { align: AlignmentType.LEFT, size: 18, after: 30 })));
      ft.alertas.forEach(t => f.push(B.p(t, { align: AlignmentType.LEFT, size: 18, after: 30 })));
    });
    if (insp.fotos_obs) f.push(B.nota(insp.fotos_obs));
  } else {
    f.push(B.p('Sem fotos registradas. [CONFERIR]'));
  }

  f.push(B.quebraPagina());
  f.push(num.anexo('Anexo 02 — Certificados de calibração'));
  const certs = imagensDaCategoria(fotos, 'calibracao');
  if (certs.length) f.push(...certs);
  else f.push(B.p(instr.length ? `Anexar os certificados: ${instr.map(i => `${i.instrumento} — certificado ${i.certificado || '(nº)'}`).join('; ')}. [CONFERIR]` : 'Anexar os certificados de calibração dos instrumentos utilizados. [CONFERIR]'));

  f.push(B.quebraPagina());
  f.push(num.anexo('Anexo 03 — Anotação de Responsabilidade Técnica (ART)'));
  const art = imagensDaCategoria(fotos, 'art');
  if (art.length) f.push(...art);
  else f.push(B.p(`Anexar a cópia da ART nº ${responsavel.art || '(preencher)'} e o comprovante de pagamento. [CONFERIR]`));

  f.push(B.quebraPagina());
  f.push(num.anexo('Aviso legal de confidencialidade, uso restrito e responsabilização'));
  [
    `Este laudo, incluindo anexos, fotografias, registros de medição, cálculos, diagramas, pareceres e conclusões, é documento técnico de caráter confidencial, elaborado por ${EMPRESA.razaoSocial} exclusivamente para a finalidade contratada.`,
    'É proibida a reprodução, distribuição, divulgação, alteração, supressão de informações ou utilização parcial ou fora de contexto deste documento sem autorização formal do contratante e do responsável técnico.',
    'O uso indevido ou a divulgação não autorizada pode caracterizar violação de direitos autorais, quebra de sigilo profissional, violação contratual e infração à Lei nº 13.709/2018 (LGPD), sujeitando o infrator às medidas judiciais cabíveis.',
    'Nenhuma informação deste laudo pode ser usada isoladamente, fora de seu contexto técnico, para embasar decisões, pareceres, processos administrativos ou judiciais, perícias ou licitações sem análise técnica complementar e autorização do responsável técnico.',
    'A adulteração, modificação, supressão ou inserção de informações, bem como o uso de versões incompletas, compromete a integridade das conclusões e exime o responsável técnico e a empresa emissora de responsabilidade por interpretações equivocadas ou uso indevido.',
    'O compartilhamento com terceiros transfere integralmente a responsabilidade pela guarda, confidencialidade e correta utilização das informações. O acesso a este laudo implica ciência e concordância com estas condições.',
  ].forEach(t => f.push(B.p(t)));
  f.push(B.p(`Documento de uso restrito e controlado — ${EMPRESA.razaoSocial}. Todos os direitos reservados.`, { bold: true, before: 120 }));

  // ── Sumário (depois do corpo, para já conhecer as seções) ─────────────────
  const sumario = [B.titulo('Sumário'), ...num.titulos.map(t => B.p(t, { align: AlignmentType.LEFT, after: 40 })), B.quebraPagina()];

  return B.criarDocumento({
    tituloCurto: soAterramento ? 'Laudo de aterramento — NBR 5410' : 'Laudo de SPDA e aterramento — NBR 5419',
    identificacao: C.identificacaoDocumento(dados, 'LAUDO'),
    filhos: [...capa, ...sumario, ...f],
  });
}

module.exports = { gerarLaudo, TIPO_INSPECAO, CATEGORIAS_FOTO, prepararFotos, fmtOhm };
