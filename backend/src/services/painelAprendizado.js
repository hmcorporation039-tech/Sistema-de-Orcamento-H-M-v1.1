// Painel "O que o sistema já sabe" (plano "sistema autônomo", 03/11/2026): num lugar só, o conhecimento que o sistema
// acumulou (vínculos de material, símbolos, blocos e alturas por escritório), o treino com as obras da pasta dos
// clientes (POR DISCIPLINA: quanto cada disciplina já sabe, confirmado × sugerido), quanto do trabalho já sai sem IA e — o principal — o ACERTO da leitura automática, medido nas linhas do
// mapa do CAD que o engenheiro conferiu (o que o sistema propôs × o que ficou). Daí sai também a fila do que falta
// conferir, ordenada pelo número de pontos (o que mais pesa no orçamento primeiro).
const pool = require('../config/database');
const iaCache = require('./iaCache');
const { resumoDoAcervo } = require('./treinoAcervo');
const { chaveDoProjeto, nomeDoSimbolo } = require('./mapaCad');
const { nomeDaDisciplina } = require('../utils/disciplinasProjeto');

// o nome de cada função no contador de uso da IA (services/iaCache.js — gravado sem a versão do roteiro) e a unidade
// em que ela conta (cada função na sua: não se soma documento com material)
const FUNCOES_IA = {
  equipamentos_projeto: { nome: 'Lista de equipamentos do projeto (itens "REF.:")', unidade: 'arquivo' },
  leitura_cotacao: { nome: 'Leitura de cotação de fornecedor', unidade: 'documento' },
  leitura_cotacao_ia: { nome: 'Leitura de cotação pela IA (mesmo documento)', unidade: 'documento' },
  pesquisa_mercado: { nome: 'Pesquisa de preço de mercado', unidade: 'pesquisa' },
  classificacao_material: { nome: 'Categoria de material novo', unidade: 'material' },
  componente_quadro_medida: { nome: 'Medida de componente de quadro', unidade: 'componente' },
};
const ORIGENS = { legenda: 'Legenda do desenho', aprendido: 'Aprendido de outro projeto', semelhante: 'Parecido com outro projeto', regra: 'Regra do nome da layer', nao_ponto: '"Não é ponto" aprendido', nao_reconhecido: 'Não reconhecido' };

// Linhas do mapa conferidas → acerto por origem e por disciplina. Só a linha conferida NA TELA tem `proposto`
// (o que o sistema tinha dito); a releitura com o mapa confirmado traz a linha já conferida, sem `proposto`, e não
// conta de novo. "Certa" = o tipo proposto ficou (a altura corrigida não muda o tipo). Função pura.
function precisaoDosMapas(mapas) {
  const porOrigem = {};
  const porDisciplina = {};
  let conferidas = 0, certas = 0;
  for (const simbolos of mapas || []) {
    for (const s of simbolos || []) {
      if (!s?.confirmado || !s.proposto) continue;
      const origem = s.proposto.origem || 'nao_reconhecido';
      const certa = origem !== 'nao_reconhecido' && s.proposto.simbolo === s.simbolo;
      const o = porOrigem[origem] || (porOrigem[origem] = { origem, nome: ORIGENS[origem] || origem, conferidas: 0, certas: 0 });
      o.conferidas++; if (certa) o.certas++;
      const chave = s.simbolo === '?' ? 'nao_e_ponto' : (chaveDoProjeto(s.disciplina) || s.disciplina || 'outra');
      const d = porDisciplina[chave] || (porDisciplina[chave] = { chave, nome: chave === 'nao_e_ponto' ? 'Não era ponto' : (nomeDaDisciplina(chave) || chave), conferidas: 0, certas: 0 });
      d.conferidas++; if (certa) d.certas++;
      conferidas++; if (certa) certas++;
    }
  }
  const taxa = (x) => ({ ...x, taxa: x.conferidas ? Math.round(100 * x.certas / x.conferidas) : null });
  return {
    conferidas, certas, taxa: conferidas ? Math.round(100 * certas / conferidas) : null,
    porOrigem: Object.values(porOrigem).map(taxa).sort((a, b) => b.conferidas - a.conferidas),
    porDisciplina: Object.values(porDisciplina).map(taxa).sort((a, b) => b.conferidas - a.conferidas),
  };
}

// O que falta conferir em todas as análises: as linhas com tipo proposto e ainda não conferidas, mais pontos primeiro
function filaDeConferencia(linhas, limite = 15) {
  return (linhas || []).flatMap(({ analise_id, nome, arquivo, simbolos }) => (simbolos || [])
    .filter(s => s && !s.confirmado && s.simbolo && s.simbolo !== '?' && (s.quantidade || 0) > 0)
    .map(s => ({ analise_id, nome, arquivo, layer: s.layer, simbolo: s.simbolo, tipo: nomeDoSimbolo(s.simbolo), quantidade: s.quantidade, origem: s.origem || 'regra', ...(s.semelhanca ? { confianca: s.semelhanca.confianca } : {}) })))
    .sort((a, b) => b.quantidade - a.quantidade).slice(0, limite);
}

const contar = async (sql) => { try { return (await pool.query(sql)).rows[0]; } catch { return {}; } };

// O que o sistema sabe POR DISCIPLINA (diretriz de 06/11/2026: "quando falamos em aprendizado do sistema, referimos às
// disciplinas"): símbolos, nomes de bloco, legendas de PDF, alturas e "não é ponto", e quantos o engenheiro confirmou
// (certos) × o sistema aprendeu sozinho (sugestões). linhas: [{ tipo, disciplina, confirmado, n }]. Função pura.
const CAMPOS_DO_TIPO = { simbolo: 'simbolos', bloco: 'blocos', legenda_pdf: 'legendasPdf', altura: 'alturas', nao_ponto: 'naoPonto' };
function sabePorDisciplina(linhas) {
  const por = new Map();
  for (const l of linhas || []) {
    const campo = CAMPOS_DO_TIPO[l.tipo];
    if (!campo) continue;
    const chave = chaveDoProjeto(l.disciplina) || l.disciplina || 'sem_disciplina';
    const d = por.get(chave) || por.set(chave, { chave, nome: chave === 'sem_disciplina' ? 'Sem disciplina' : (nomeDaDisciplina(chave) || chave), simbolos: 0, blocos: 0, legendasPdf: 0, alturas: 0, naoPonto: 0, confirmados: 0, sugeridos: 0, total: 0 }).get(chave);
    const n = Number(l.n) || 0;
    d[campo] += n; d.total += n;
    if (l.confirmado) d.confirmados += n; else d.sugeridos += n;
  }
  return [...por.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// usuario: quem pede (req.usuario). A fila do que conferir mostra só as análises dele (e as antigas, sem dono) — a mesma
// regra de posse da análise (middleware/posse.js); o administrador vê todas. O acerto continua sendo o do sistema todo.
async function resumo(usuario = null) {
  const [porDisciplina, materiais, simbolos, blocos, notas, acervo, ia, mapas, legendasPdf, porDisciplinaDetalhe] = await Promise.all([
    // o que o sistema reconhece sozinho, por disciplina (formas de símbolo + nomes de bloco em uso)
    pool.query(`SELECT disciplina, SUM(n)::int AS n FROM (
                  SELECT disciplina, COUNT(*) AS n FROM cad_simbolos_aprendidos WHERE (origem = 'usuario' OR conflitos = 0) AND simbolo <> '?' GROUP BY disciplina
                  UNION ALL SELECT disciplina, COUNT(*) FROM cad_blocos_aprendidos WHERE origem = 'usuario' OR conflitos = 0 GROUP BY disciplina) x
                 GROUP BY disciplina ORDER BY 2 DESC`).then(r => r.rows.map(x => {
      const chave = chaveDoProjeto(x.disciplina) || x.disciplina || 'outra';
      return { chave, nome: nomeDaDisciplina(chave) || (x.disciplina ? x.disciplina : 'Sem disciplina'), n: x.n };
    })).catch(() => []),
    contar(`SELECT (SELECT COUNT(*) FROM material_aliases)::int AS vinculos, (SELECT COUNT(*) FROM materiais WHERE ativo)::int AS catalogo,
              (SELECT COUNT(*) FROM materiais WHERE ativo AND origem = 'acervo')::int AS do_acervo`),
    contar(`SELECT COUNT(*) FILTER (WHERE origem = 'usuario' AND simbolo <> '?')::int AS conferidos, COUNT(*) FILTER (WHERE origem = 'legenda' AND conflitos = 0 AND simbolo <> '?')::int AS da_legenda,
              COUNT(*) FILTER (WHERE origem <> 'usuario' AND conflitos > 0)::int AS em_conflito, COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios,
              COUNT(*) FILTER (WHERE simbolo = '?' AND (origem = 'usuario' OR conflitos = 0))::int AS nao_ponto
              FROM cad_simbolos_aprendidos`),
    contar(`SELECT COUNT(*) FILTER (WHERE conflitos = 0 OR origem = 'usuario')::int AS em_uso, COUNT(*) FILTER (WHERE conflitos > 0 AND origem <> 'usuario')::int AS em_conflito,
              COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios FROM cad_blocos_aprendidos`),
    contar(`SELECT COUNT(*) FILTER (WHERE origem = 'usuario' OR (conflitos = 0 AND vezes >= 2))::int AS em_uso, COUNT(*)::int AS lidas,
              COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios FROM cad_notas_aprendidas`),
    resumoDoAcervo(),
    iaCache.situacao(90),
    pool.query(`SELECT a.id AS analise_id, a.usuario_id, COALESCE(a.nome_projeto, a.cliente_nome, 'Análise ' || a.id) AS nome, d->'mapa_cad'->>'arquivo' AS arquivo,
                       d->'mapa_cad'->'simbolos' AS simbolos
                  FROM analises_projeto a CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.dados_extraidos) = 'array' THEN a.dados_extraidos ELSE '[]'::jsonb END) d
                 WHERE d->'mapa_cad' ? 'simbolos' ORDER BY a.id DESC`).then(r => r.rows).catch(() => []),
    // legenda das pranchas em PDF, por escritório (versão 2.30: services/legendasPdfAprendidas.js)
    contar(`SELECT COUNT(*) FILTER (WHERE conflitos = 0)::int AS em_uso, COUNT(*) FILTER (WHERE conflitos > 0)::int AS em_conflito,
              COUNT(DISTINCT escritorio)::int AS escritorios FROM pdf_legendas_aprendidas`),
    // o que vale (em uso) de cada tabela, por disciplina e por quem ensinou (engenheiro × o próprio sistema)
    pool.query(`SELECT CASE WHEN simbolo = '?' THEN 'nao_ponto' ELSE 'simbolo' END AS tipo, disciplina, origem = 'usuario' AS confirmado, COUNT(*)::int AS n
                  FROM cad_simbolos_aprendidos WHERE origem = 'usuario' OR conflitos = 0 GROUP BY 1, 2, 3
                UNION ALL SELECT 'bloco', disciplina, origem = 'usuario', COUNT(*)::int FROM cad_blocos_aprendidos WHERE origem = 'usuario' OR conflitos = 0 GROUP BY 2, 3
                UNION ALL SELECT 'legenda_pdf', disciplina, FALSE, COUNT(*)::int FROM pdf_legendas_aprendidas WHERE conflitos = 0 GROUP BY 2
                UNION ALL SELECT 'altura', disciplina, origem = 'usuario', COUNT(*)::int FROM cad_notas_aprendidas WHERE origem = 'usuario' OR (conflitos = 0 AND vezes >= 2) GROUP BY 2, 3`)
      .then(r => sabePorDisciplina(r.rows)).catch(() => []),
  ]);
  // o treino com o acervo por disciplina (03/11/2026: "sempre por disciplinas"): arquivos lidos e materiais novos
  const nomeDe = (chave) => (chave ? nomeDaDisciplina(chaveDoProjeto(chave) || chave) || chave : 'Sem disciplina no nome/pasta');
  acervo.porDisciplina = (acervo.porDisciplina || []).map(d => ({ ...d, chave: d.disciplina || '', nome: nomeDe(d.disciplina) }));
  acervo.materiais = (acervo.materiais || []).map(d => ({ ...d, chave: d.disciplina, nome: nomeDe(d.disciplina) }));
  return {
    materiais, simbolos, blocos, notas, acervo, porDisciplina, legendasPdf, porDisciplinaDetalhe,
    // "quanto sai sem IA", POR FUNÇÃO (revisão do uso de IA de 06/11/2026): resolvido sem IA (motor determinístico),
    // reaproveitado de uma resposta anterior da IA (cache) e chamadas à IA (respondeu / falhou). A taxa é a do sem IA de
    // verdade — antes o acerto do cache (resposta que veio da IA) contava como "sem IA" e somava unidades diferentes.
    autonomia: {
      dias: ia.dias,
      funcoes: ia.funcoes.map(f => ({
        ...f, chave: f.nome, nome: FUNCOES_IA[f.nome]?.nome || f.nome, unidade: FUNCOES_IA[f.nome]?.unidade || 'consulta',
        taxa: f.taxaSemIA,
      })),
    },
    precisao: precisaoDosMapas(mapas.map(m => m.simbolos)),
    fila: filaDeConferencia(usuario && usuario.role !== 'admin' ? mapas.filter(m => m.usuario_id == null || m.usuario_id === usuario.id) : mapas),
  };
}

module.exports = { resumo, precisaoDosMapas, filaDeConferencia, sabePorDisciplina };
