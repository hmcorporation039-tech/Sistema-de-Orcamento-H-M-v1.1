// Mapa do CAD confirmado pelo engenheiro (item 3 do plano de melhorias).
//
// Na leitura de um DWG/DXF com símbolos explodidos (QiBuilder/AltoQi, PDF convertido) o sistema
// propõe, para cada layer × forma de símbolo, o tipo de ponto (tomada alta, luminária…) pela legenda
// do desenho, pelo que já aprendeu de outros projetos ou pelas regras do nome da layer. Esse mapa
// fica guardado em dados_extraidos[i].mapa_cad e, até alguém conferir, esses pontos NÃO entram no
// orçamento (a contagem sai marcada "a confirmar"). Aqui:
//   - tiposDisponiveis(): os tipos que o 3D e o orçamento entendem (lista da tela)
//   - validarLinhas() / aplicarNoMapa(): a correção do engenheiro sobre as linhas do mapa
//   - confirmadasDoMapa(): as linhas conferidas, no formato que a releitura do DWG aplica
//   - aprender() / esquecer(): cada confirmação vira cad_simbolos_aprendidos (origem 'usuario'),
//     então o mesmo erro não precisa ser corrigido de novo no próximo desenho do escritório
const path = require('path');
const pool = require('../config/database');
const { CAD } = require('../config/caminhos');
const { SIMBOLOS } = require(path.join(CAD, 'simbolos.js'));
const { ESPEC } = require(path.join(CAD, 'modelo3d.js'));
const { TIPOS } = require(path.join(CAD, 'tiposDePonto.js'));
const { chaveDe, chaveComMedida } = require('./simbolosAprendidos');
const { DISCIPLINAS, nomeDaDisciplina } = require('../utils/disciplinasProjeto');

const NOMES_EXTRA = {
  'HM-ILU-POSTE': 'Poste de iluminação', 'HM-ELE-CAIXA-PISO': 'Caixa de passagem no piso',
  'HM-ELE-PONTO': 'Ponto de parede (tomada ou interruptor)',
};
// disciplina quando a lista de tipos (tiposDePonto.js) não diz: pelo prefixo do símbolo
const DISCIPLINA_PELO_PREFIXO = {
  ELE: 'eletrica', ILU: 'iluminacao', HOSP: 'eletrica_hospitalar', CAB: 'rede', TEL: 'telefonia', ANT: 'antena', CFTV: 'cftv',
  ACE: 'controle-acesso', ALM: 'alarme', INC: 'incendio', AUT: 'automacao', SOL: 'solar', VE: 'veicular', SPDA: 'spda',
  CLIM: 'climatizacao', // antes caía em 'eletrica': a evaporadora inserida no mapa ia para o orçamento de elétrica
};
const DISCIPLINA_EXTERNA = { 'HM-ILU-POSTE': 'iluminacao-externa', 'HM-ELE-CAIXA-PISO': 'iluminacao-externa' };

function disciplinaDoSimbolo(simbolo) {
  if (DISCIPLINA_EXTERNA[simbolo]) return DISCIPLINA_EXTERNA[simbolo];
  const t = TIPOS.find(x => x[2] === simbolo);
  if (t) return t[3];
  return DISCIPLINA_PELO_PREFIXO[/^HM-([A-Z]+)-/.exec(simbolo)?.[1]] || 'eletrica';
}
const nomeDoSimbolo = (simbolo) => String(SIMBOLOS[simbolo]?.legenda || NOMES_EXTRA[simbolo] || simbolo).replace(/\s*\(h = [^)]*\)/, '');

let tiposEmCache = null;
function tiposDisponiveis() {
  if (!tiposEmCache) {
    tiposEmCache = Object.keys(ESPEC).map(simbolo => ({ simbolo, nome: nomeDoSimbolo(simbolo), disciplina: disciplinaDoSimbolo(simbolo) }))
      .sort((a, b) => a.disciplina.localeCompare(b.disciplina) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  return tiposEmCache;
}

// linhas = [{ idx, simbolo, altura_m, confirmado }] da tela; mapa = o mapa_cad guardado do arquivo.
// Devolve texto de erro ou null.
function validarLinhas(linhas, mapa) {
  if (!Array.isArray(linhas) || !linhas.length) return 'Envie ao menos uma linha do mapa.';
  if (linhas.length > 500) return 'Linhas demais de uma vez (máximo 500).';
  const validos = new Set(tiposDisponiveis().map(t => t.simbolo));
  for (const l of linhas) {
    if (!l || !Number.isInteger(l.idx) || !mapa.simbolos?.[l.idx]) return 'Linha do mapa inexistente: confira o arquivo e atualize a tela.';
    if (l.confirmado === false) continue; // desfazer não precisa de tipo
    if (l.simbolo !== '?' && !validos.has(l.simbolo)) return `Tipo "${l.simbolo}" não existe (linha ${l.idx + 1}).`;
    if (l.altura_m != null && l.altura_m !== '' && !(Number(l.altura_m) > 0 && Number(l.altura_m) <= 15)) return `Altura inválida na linha ${l.idx + 1}: use metros, de 0,01 a 15.`;
  }
  return null;
}

// aplica as correções: devolve { mapa novo, alteradas: [{ antes, depois, desfeita }] }. Não altera o original.
function aplicarNoMapa(mapa, linhas) {
  const simbolos = mapa.simbolos.map(s => ({ ...s }));
  const alteradas = [];
  for (const l of linhas) {
    const s = simbolos[l.idx];
    if (l.confirmado === false) {
      if (!s.confirmado) continue;
      // volta ao que o sistema tinha proposto
      const p = s.proposto || {};
      for (const k of ['confirmado', 'corrigido', 'proposto', 'alturaDe']) delete s[k];
      s.simbolo = p.simbolo ?? '?'; s.disciplina = p.disciplina ?? ''; s.rotulo = p.rotulo ?? '';
      if (p.altura_m > 0) { s.altura_m = p.altura_m; s.alturaDe = p.origem === 'aprendido' ? 'aprendido' : 'legenda'; } else delete s.altura_m;
      s.origem = p.origem || 'nao_reconhecido';
      alteradas.push({ antes: { ...mapa.simbolos[l.idx] }, depois: { ...s }, desfeita: true });
      continue;
    }
    const antes = { ...s };
    if (!s.confirmado) s.proposto = { simbolo: s.simbolo, disciplina: s.disciplina || '', rotulo: s.rotulo || '', altura_m: s.altura_m || null, origem: s.origem };
    const mudouTipo = l.simbolo !== s.simbolo;
    s.simbolo = l.simbolo;
    s.disciplina = l.simbolo === '?' ? '' : disciplinaDoSimbolo(l.simbolo);
    // a descrição da legenda pertence ao tipo antigo: tipo novo, descrição do tipo novo
    if (mudouTipo) s.rotulo = l.simbolo === '?' ? '' : nomeDoSimbolo(l.simbolo);
    if (Number(l.altura_m) > 0) { s.altura_m = Math.round(Number(l.altura_m) * 100) / 100; s.alturaDe = 'confirmado'; } else { delete s.altura_m; delete s.alturaDe; }
    s.confirmado = true; s.origem = 'confirmado';
    s.corrigido = !!s.proposto && (s.proposto.simbolo !== s.simbolo || (s.proposto.altura_m || null) !== (s.altura_m || null));
    alteradas.push({ antes, depois: { ...s }, desfeita: false });
  }
  return { mapa: { ...mapa, simbolos }, alteradas };
}

// linhas conferidas → o que a releitura do DWG aplica (pontosDoDesenho.aplicarConfirmacoes)
function confirmadasDoMapa(mapa) {
  return (mapa?.simbolos || []).filter(s => s.confirmado).map(s => ({
    layer: s.layer, medida: s.medida, ...(Number.isFinite(s.preenchimento) ? { preenchimento: s.preenchimento } : {}),
    simbolo: s.simbolo, disciplina: s.disciplina || '', rotulo: s.rotulo || '', ...(s.altura_m > 0 ? { altura_m: s.altura_m } : {}),
  }));
}

// chave antiga (só a proporção, antes da migração 2.0-43): a confirmação nova da mesma forma a substitui
const chaveAprendida = (s) => chaveDe({ layer: s.layer, medida: [...s.medida].sort((a, b) => b - a), fracao: s.preenchimento || 0 });
// Biblioteca de blocos (CAD-08): o DWG/DXF está em tamanho real — a confirmação vale pela MEDIDA (±2 cm) e pelo
// escritório do carimbo. A cor do PDF convertido (layer PDF-COR-…) não tem escala confiável: fica pela proporção.
const RE_PDF_COR = /^PDF-COR-/i;
const porMedida = (s) => !RE_PDF_COR.test(String(s.layer || ''));
const chaveDaConfirmacao = (s, escritorio) => (porMedida(s)
  ? chaveComMedida({ layer: s.layer, medida: s.medida, fracao: s.preenchimento || 0 }, escritorio)
  : chaveAprendida(s));

// Cada tipo conferido vira aprendizado de origem 'usuario' (vale mais que a legenda e não conta conflito).
// "Não é ponto" ('?') não se aprende: a mesma forma pode ser ponto em outro desenho.
// escritorio: o responsável técnico do carimbo (mapa_cad.escritorio); '' = o carimbo não diz
async function aprender(alteradas, arquivo, executor = pool, escritorio = '') {
  let gravadas = 0;
  for (const { depois: s, desfeita } of alteradas) {
    if (desfeita || !s.confirmado || s.simbolo === '?' || !Array.isArray(s.medida) || !(s.medida[0] > 0)) continue;
    const medida = [...s.medida].sort((a, b) => b - a);
    const chave = chaveDaConfirmacao(s, escritorio);
    try {
      await executor.query(
        `INSERT INTO cad_simbolos_aprendidos (chave, layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, arquivo, escritorio, por_medida)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'usuario', $9, $10, $11)
         ON CONFLICT (chave) DO UPDATE SET simbolo = EXCLUDED.simbolo, disciplina = EXCLUDED.disciplina, altura_m = EXCLUDED.altura_m,
           texto = EXCLUDED.texto, origem = 'usuario', conflitos = 0, arquivo = EXCLUDED.arquivo, atualizado_em = NOW(),
           vezes = cad_simbolos_aprendidos.vezes + CASE WHEN cad_simbolos_aprendidos.origem = 'usuario' AND cad_simbolos_aprendidos.simbolo = EXCLUDED.simbolo THEN 1 ELSE 0 END`,
        [chave, String(s.layer).slice(0, 120), medida, Math.round((s.preenchimento || 0) * 1000) / 1000, s.simbolo, s.disciplina || null,
          s.altura_m > 0 ? s.altura_m : null, String(s.rotulo || '').slice(0, 200), String(arquivo || '').slice(0, 200), String(escritorio || '').slice(0, 120), porMedida(s)]);
      // a chave antiga (só proporção) da mesma forma sai: senão a forma de 40 cm continuava pegando o tipo da de 20 cm
      if (chave !== chaveAprendida(s)) await executor.query(`DELETE FROM cad_simbolos_aprendidos WHERE chave = $1 AND origem = 'usuario'`, [chaveAprendida(s)]);
      gravadas++;
    } catch (e) { console.warn('[mapaCad] confirmação não aprendida:', e.message); }
  }
  return gravadas;
}

// Desfazer uma confirmação tira o que ela ensinou (só se o aprendizado ainda é o do usuário)
async function esquecer(alteradas, executor = pool, escritorio = '') {
  let removidas = 0;
  for (const { antes: s, desfeita } of alteradas) {
    if (!desfeita || !Array.isArray(s.medida)) continue;
    try {
      const r = await executor.query(`DELETE FROM cad_simbolos_aprendidos WHERE chave = ANY($1) AND origem = 'usuario'`, [[chaveDaConfirmacao(s, escritorio), chaveAprendida(s)]]);
      removidas += r.rowCount;
    } catch (e) { console.warn('[mapaCad] aprendizado não removido:', e.message); }
  }
  return removidas;
}

// Disciplina do SÍMBOLO (a do desenho/3D) → chave da disciplina da ANÁLISE (a que se marca no envio do arquivo)
const CHAVE_DO_PROJETO = { 'controle-acesso': 'controle_acesso', 'iluminacao-externa': 'iluminacao', veicular: 'carregador', rede: 'cabeamento' };
const CHAVES_DE_PROJETO = new Set(DISCIPLINAS.map(d => d.chave));
const MESMO_GRUPO = { rede: ['rede', 'cabeamento'], cabeamento: ['cabeamento', 'rede'] };
function chaveDoProjeto(disciplinaDoSimbolo) {
  const c = CHAVE_DO_PROJETO[disciplinaDoSimbolo] || disciplinaDoSimbolo;
  return CHAVES_DE_PROJETO.has(c) ? c : null;
}

// Pontos conferidos de uma disciplina que NÃO foi marcada no envio do arquivo ficariam fora do orçamento (a análise
// só conta o que é das disciplinas marcadas). Confirmar o tipo é a prova de que o engenheiro quer esses pontos:
// o reprocessamento inclui a disciplina (ele pode desmarcar). Devolve [{ chave, nome, linhas, pontos }].
function disciplinasAIncluir(mapa, marcadas) {
  const marcadasEmGrupo = new Set((marcadas || []).flatMap(d => MESMO_GRUPO[d] || [d]));
  const porChave = new Map();
  for (const s of mapa?.simbolos || []) {
    if (!s.confirmado || s.simbolo === '?') continue;
    const chave = chaveDoProjeto(s.disciplina);
    if (!chave || marcadasEmGrupo.has(chave)) continue;
    const g = porChave.get(chave) || porChave.set(chave, { chave, nome: nomeDaDisciplina(chave), linhas: 0, pontos: 0 }).get(chave);
    g.linhas++; g.pontos += s.contados > 0 ? s.contados : (s.quantidade || 0); // linha que era "não reconhecida" ainda não tem pontos contados: vale o que o desenho tem
  }
  // componente inserido pelo engenheiro (services/edicoesDoMapa.js): também é prova de que a disciplina entra
  for (const a of mapa?.edicoes?.adicionados || []) {
    const chave = chaveDoProjeto(a.disciplina);
    if (!chave || marcadasEmGrupo.has(chave)) continue;
    const g = porChave.get(chave) || porChave.set(chave, { chave, nome: nomeDaDisciplina(chave), linhas: 0, pontos: 0 }).get(chave);
    g.pontos++;
  }
  return [...porChave.values()];
}

// resumo para a tela: quantas linhas, quantas conferidas, quantos pontos ainda não contam no orçamento
function resumoDoMapa(mapa) {
  const simbolos = mapa?.simbolos || [];
  const comPontos = simbolos.filter(s => s.simbolo !== '?' || s.quantidade > 0);
  const pendentes = comPontos.filter(s => !s.confirmado);
  return {
    linhas: simbolos.length,
    conferidas: simbolos.filter(s => s.confirmado).length,
    pendentes: pendentes.length,
    pontosPendentes: pendentes.filter(s => s.simbolo !== '?').reduce((t, s) => t + (s.contados ?? s.quantidade ?? 0), 0),
    naoReconhecidas: simbolos.filter(s => s.simbolo === '?' && !s.confirmado).length,
    // componentes inseridos e retirados na planta ou no 3D (services/edicoesDoMapa.js)
    inseridos: mapa?.edicoes?.adicionados?.length || 0,
    retirados: mapa?.edicoes?.removidos?.length || 0,
  };
}

module.exports = { tiposDisponiveis, disciplinaDoSimbolo, nomeDoSimbolo, validarLinhas, aplicarNoMapa, confirmadasDoMapa, aprender, esquecer, resumoDoMapa, chaveAprendida, chaveDoProjeto, disciplinasAIncluir };
