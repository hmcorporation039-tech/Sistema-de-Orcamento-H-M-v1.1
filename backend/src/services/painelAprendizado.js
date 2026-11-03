// Painel "O que o sistema já sabe" (plano "sistema autônomo", 03/11/2026): num lugar só, o conhecimento que o sistema
// acumulou (vínculos de material, símbolos, blocos e alturas por escritório), o treino com as obras da pasta dos
// clientes, quanto do trabalho já sai sem IA e — o principal — o ACERTO da leitura automática, medido nas linhas do
// mapa do CAD que o engenheiro conferiu (o que o sistema propôs × o que ficou). Daí sai também a fila do que falta
// conferir, ordenada pelo número de pontos (o que mais pesa no orçamento primeiro).
const pool = require('../config/database');
const iaCache = require('./iaCache');
const { resumoDoAcervo } = require('./treinoAcervo');
const { chaveDoProjeto, nomeDoSimbolo } = require('./mapaCad');
const { nomeDaDisciplina } = require('../utils/disciplinasProjeto');

// o nome de cada função no contador de uso da IA (services/iaCache.js)
const FUNCOES_IA = {
  'equipamentos_projeto v1': 'Lista de equipamentos do projeto (itens "REF.:")',
  leitura_cotacao: 'Leitura de cotação de fornecedor',
  pesquisa_mercado: 'Pesquisa de preço de mercado',
  classificacao_material: 'Categoria de material novo',
};
const ORIGENS = { legenda: 'Legenda do desenho', aprendido: 'Aprendido de outro projeto', semelhante: 'Parecido com outro projeto', regra: 'Regra do nome da layer', nao_reconhecido: 'Não reconhecido' };

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

async function resumo() {
  const [porDisciplina, materiais, simbolos, blocos, notas, acervo, ia, mapas] = await Promise.all([
    // o que o sistema reconhece sozinho, por disciplina (formas de símbolo + nomes de bloco em uso)
    pool.query(`SELECT disciplina, SUM(n)::int AS n FROM (
                  SELECT disciplina, COUNT(*) AS n FROM cad_simbolos_aprendidos WHERE origem = 'usuario' OR conflitos = 0 GROUP BY disciplina
                  UNION ALL SELECT disciplina, COUNT(*) FROM cad_blocos_aprendidos WHERE origem = 'usuario' OR conflitos = 0 GROUP BY disciplina) x
                 GROUP BY disciplina ORDER BY 2 DESC`).then(r => r.rows.map(x => {
      const chave = chaveDoProjeto(x.disciplina) || x.disciplina || 'outra';
      return { chave, nome: nomeDaDisciplina(chave) || (x.disciplina ? x.disciplina : 'Sem disciplina'), n: x.n };
    })).catch(() => []),
    contar(`SELECT (SELECT COUNT(*) FROM material_aliases)::int AS vinculos, (SELECT COUNT(*) FROM materiais WHERE ativo)::int AS catalogo`),
    contar(`SELECT COUNT(*) FILTER (WHERE origem = 'usuario')::int AS conferidos, COUNT(*) FILTER (WHERE origem = 'legenda' AND conflitos = 0)::int AS da_legenda,
              COUNT(*) FILTER (WHERE origem <> 'usuario' AND conflitos > 0)::int AS em_conflito, COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios
              FROM cad_simbolos_aprendidos`),
    contar(`SELECT COUNT(*) FILTER (WHERE conflitos = 0 OR origem = 'usuario')::int AS em_uso, COUNT(*) FILTER (WHERE conflitos > 0 AND origem <> 'usuario')::int AS em_conflito,
              COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios FROM cad_blocos_aprendidos`),
    contar(`SELECT COUNT(*) FILTER (WHERE origem = 'usuario' OR (conflitos = 0 AND vezes >= 2))::int AS em_uso, COUNT(*)::int AS lidas,
              COUNT(DISTINCT NULLIF(escritorio, ''))::int AS escritorios FROM cad_notas_aprendidas`),
    resumoDoAcervo(),
    iaCache.situacao(90),
    pool.query(`SELECT a.id AS analise_id, COALESCE(a.nome_projeto, a.cliente_nome, 'Análise ' || a.id) AS nome, d->'mapa_cad'->>'arquivo' AS arquivo,
                       d->'mapa_cad'->'simbolos' AS simbolos
                  FROM analises_projeto a CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.dados_extraidos) = 'array' THEN a.dados_extraidos ELSE '[]'::jsonb END) d
                 WHERE d->'mapa_cad' ? 'simbolos' ORDER BY a.id DESC`).then(r => r.rows).catch(() => []),
  ]);
  return {
    materiais, simbolos, blocos, notas, acervo, porDisciplina,
    autonomia: {
      dias: ia.dias, taxa: ia.taxa, semIA: ia.acertos, comIA: ia.chamadas,
      funcoes: ia.funcoes.map(f => ({ ...f, nome: FUNCOES_IA[f.nome] || f.nome, taxa: f.acertos + f.chamadas ? Math.round(100 * f.acertos / (f.acertos + f.chamadas)) : null })),
    },
    precisao: precisaoDosMapas(mapas.map(m => m.simbolos)),
    fila: filaDeConferencia(mapas),
  };
}

module.exports = { resumo, precisaoDosMapas, filaDeConferencia };
