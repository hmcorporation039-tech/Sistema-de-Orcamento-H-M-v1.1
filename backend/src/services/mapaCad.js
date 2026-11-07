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
//   - aprender() / esquecer(): cada confirmação é o voto do engenheiro em cad_simbolos_aprendidos (origem 'usuario'),
//     então o mesmo erro não precisa ser corrigido de novo no próximo desenho do escritório (ou da disciplina)
const path = require('path');
const pool = require('../config/database');
const { CAD } = require('../config/caminhos');
const { SIMBOLOS } = require(path.join(CAD, 'simbolos.js'));
const { ESPEC } = require(path.join(CAD, 'modelo3d.js'));
const { TIPOS } = require(path.join(CAD, 'tiposDePonto.js'));
const { chaveDe, chaveComMedida, votarSimbolo, retirarVoto, valorDe } = require('./simbolosAprendidos');
const votos = require('./votosAprendizado');
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
// + os blocos nomeados que o engenheiro confirmou nesta análise ({ bloco, descricao, disciplina } — "Confirmar bloco"):
// a releitura (services/analiseCad lerArquivoCad) os conta como conferidos
function confirmadasDoMapa(mapa) {
  return [
    ...(mapa?.simbolos || []).filter(s => s.confirmado).map(s => ({
      layer: s.layer, medida: s.medida, ...(Number.isFinite(s.preenchimento) ? { preenchimento: s.preenchimento } : {}),
      simbolo: s.simbolo, disciplina: s.disciplina || '', rotulo: s.rotulo || '', ...(s.altura_m > 0 ? { altura_m: s.altura_m } : {}),
    })),
    ...(mapa?.blocos || []).filter(b => b.situacao === 'confirmado' && b.descricao && b.disciplina).map(b => ({ bloco: b.bloco, descricao: b.descricao, disciplina: b.disciplina })),
  ];
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

// Cada tipo conferido vira o voto 'usuario' deste projeto (fonte: a obra ou a análise — services/votosAprendizado.js):
// vence a legenda e não conta conflito; confirmar de novo no mesmo projeto não soma (antes cada clique somava vezes).
// "Não é ponto" ('?') também se aprende (lacuna 15 da revisão: a mesma seta/letra explodida voltava a cada projeto),
// como SUGESTÃO para a mesma forma — por disciplina (as marcadas no arquivo) e pelo escritório quando houver; sem
// escritório nem disciplina não há a quem valer (services/analiseCad/aprendidoNoDesenho.marcarNaoPonto).
// escritorio: o do carimbo (mapa_cad.escritorio); '' = o carimbo não diz. opcoes: { fonte, disciplinas }
const chavesNaoPonto = (s, escritorio, disciplinas) => {
  const forma = porMedida(s) ? chaveComMedida({ layer: s.layer, medida: s.medida, fracao: s.preenchimento || 0 }, escritorio) : `${chaveAprendida(s)}|${String(escritorio || '').slice(0, 120)}`;
  return ((disciplinas || []).length ? disciplinas : ['']).filter(d => escritorio || d).map(d => [`NP|${forma}|${d}`, d]);
};
const dadosDaLinha = (s, escritorio, arquivo, extra = {}) => ({
  layer: String(s.layer).slice(0, 120), medida: [...s.medida].map(Number).sort((a, b) => b - a), fracao: Math.round((s.preenchimento || 0) * 1000) / 1000,
  simbolo: s.simbolo, disciplina: s.disciplina || null, altura_m: s.altura_m > 0 ? s.altura_m : null, texto: String(s.rotulo || '').slice(0, 200),
  escritorio: String(escritorio || '').slice(0, 120), por_medida: porMedida(s), arquivo: String(arquivo || '').slice(0, 200), ...extra,
});
async function aprender(alteradas, arquivo, executor = pool, escritorio = '', { fonte = null, disciplinas = [] } = {}) {
  let gravadas = 0;
  const quem = fonte || `arquivo:${String(arquivo || '')}`;
  for (const { depois: s, desfeita } of alteradas) {
    if (desfeita || !s.confirmado || !Array.isArray(s.medida) || !(s.medida[0] > 0)) continue;
    try {
      if (s.simbolo === '?') {
        for (const [chave, d] of chavesNaoPonto(s, escritorio, disciplinas)) {
          await votarSimbolo(executor, chave, { fonte: quem, origem: 'usuario', dados: dadosDaLinha(s, escritorio, arquivo, { simbolo: '?', disciplina: d || null, altura_m: null, texto: 'não é ponto' }) });
          gravadas++;
        }
        continue;
      }
      const chave = chaveDaConfirmacao(s, escritorio);
      await votarSimbolo(executor, chave, { fonte: quem, origem: 'usuario', dados: dadosDaLinha(s, escritorio, arquivo) });
      const prop = chaveAprendida(s);
      if (chave !== prop) {
        const { rows: [r] } = await executor.query('SELECT * FROM cad_simbolos_aprendidos WHERE chave = $1', [prop]);
        if (r?.origem === 'usuario' && r.por_medida) {
          // a chave antiga (só proporção, confirmação de antes da 2.0-43) da mesma forma sai: senão a forma de 40 cm
          // continuava pegando o tipo da de 20 cm
          await executor.query('DELETE FROM cad_simbolos_aprendidos WHERE chave = $1', [prop]);
          await executor.query(`DELETE FROM aprendizado_votos WHERE tipo = 'simbolo' AND chave = $1`, [prop]);
        } else if (r && r.origem !== 'usuario' && r.conflitos > 0) {
          // a linha da LEGENDA desta forma está em conflito (outro tipo em outro projeto): a confirmação do engenheiro
          // desempata — só entre as opções que a legenda já tinha (não impõe um tipo novo a todos os tamanhos da layer)
          const valor = valorDe(s.simbolo, s.altura_m);
          const daLegenda = (await votos.votosDe(executor, 'simbolo', prop)).find(v => v.valor === valor && v.dados?.layer)?.dados
            || (valorDe(r.simbolo, r.altura_m) === valor ? { layer: r.layer, medida: r.medida.map(Number), fracao: Number(r.fracao), simbolo: r.simbolo, disciplina: r.disciplina, altura_m: r.altura_m != null ? Number(r.altura_m) : null, texto: r.texto || '', escritorio: '', por_medida: false } : null);
          if (daLegenda) await votarSimbolo(executor, prop, { fonte: quem, origem: 'usuario', dados: { ...daLegenda, arquivo: String(arquivo || '').slice(0, 200) } });
        }
      }
      gravadas++;
    } catch (e) { console.warn('[mapaCad] confirmação não aprendida:', e.message); }
  }
  return gravadas;
}

// Desfazer uma confirmação tira só o voto DESTE projeto, e só se ele ainda diz o tipo e a altura que estão sendo
// desfeitos (antes apagava a linha inteira — o que outros projetos tinham ensinado). Confirmação de antes dos votos:
// desconta 1 do que ela tinha somado.
async function esquecer(alteradas, executor = pool, escritorio = '', { fonte = null, disciplinas = [], arquivo = '' } = {}) {
  let removidas = 0;
  const quem = fonte || `arquivo:${String(arquivo || '')}`;
  for (const { antes: s, desfeita } of alteradas) {
    if (!desfeita || !Array.isArray(s.medida) || !s.simbolo) continue;
    try {
      if (s.simbolo === '?') {
        for (const [chave] of chavesNaoPonto(s, escritorio, disciplinas)) removidas += await retirarVoto(executor, chave, { fonte: quem, simbolo: '?', altura_m: null });
        continue;
      }
      const chave = chaveDaConfirmacao(s, escritorio);
      removidas += await retirarVoto(executor, chave, { fonte: quem, simbolo: s.simbolo, altura_m: s.altura_m });
      if (chave !== chaveAprendida(s)) await retirarVoto(executor, chaveAprendida(s), { fonte: quem, simbolo: s.simbolo, altura_m: s.altura_m });
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
    blocosConfirmados: (mapa?.blocos || []).filter(b => b.situacao === 'confirmado').length,
    // componentes inseridos e retirados na planta ou no 3D (services/edicoesDoMapa.js)
    inseridos: mapa?.edicoes?.adicionados?.length || 0,
    retirados: mapa?.edicoes?.removidos?.length || 0,
  };
}

module.exports = { tiposDisponiveis, disciplinaDoSimbolo, nomeDoSimbolo, validarLinhas, aplicarNoMapa, confirmadasDoMapa, aprender, esquecer, resumoDoMapa, chaveAprendida, chaveDoProjeto, disciplinasAIncluir };
