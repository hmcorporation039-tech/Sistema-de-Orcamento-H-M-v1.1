// Aprendizado de ORÇAMENTO por disciplina (pedido do usuário, 06/11/2026: "orçamentos têm que ter aprendizado para
// que o sistema seja autônomo em gerar orçamentos automáticos sem ajuda de IA; só usa IA quando não souber o que
// fazer ou precisar pesquisar itens novos"). Separado do aprendizado de DESENHO (símbolos, blocos, legendas): aqui o
// sistema aprende com as propostas APROVADAS o que a H&M orça em cada disciplina (elétrica, CFTV, cabeamento...):
//   - o preço praticado de cada serviço/material (mediana do que foi vendido);
//   - os itens que acompanham a disciplina (o engenheiro sempre acrescenta "patch cord" no cabeamento, "caixa de
//     passagem" no CFTV...) e a quantidade por ponto da disciplina (metros de cabo por câmera etc.).
// Ao gerar o orçamento de uma análise ou de um projeto (aplicar), o serviço sem preço recebe o preço aprendido e os
// itens que costumam acompanhar a disciplina entram como sugestão ("a cotar"). Sem IA e sem internet.
//
// Calculado na hora a partir de propostas × itens (como services/precosVendidos.js): aprovação desfeita, proposta
// apagada ou recusada sai sozinha, sem tabela espelho que possa ficar para trás.
const pool = require('../config/database');
const { DISCIPLINAS, nomeDaDisciplina } = require('../utils/disciplinasProjeto');
const { ehMaoDeObra } = require('../utils/calculoProposta');
const { indiceJaccard, termosDaDescricao } = require('../utils/semelhancaMateriais');

const JANELA_DIAS = 730;            // só o que foi vendido nos últimos 2 anos
const PRECO_RECENTE_DIAS = 365;     // preço de serviço confirma sozinho só se a última venda tem até 1 ano
const MIN_PROPOSTAS_PRECO = 2;      // e veio de 2+ propostas aprovadas (um preço só pode ser exceção)
const MIN_PROPOSTAS_ITEM = 2;       // item que acompanha a disciplina: em 2+ propostas aprovadas...
const FRACAO_ITEM = 0.6;            // ...e em 60 % ou mais das propostas aprovadas da disciplina
const MAX_SUGERIDOS = 40;           // teto de itens sugeridos por orçamento
const SEMELHANCA_MESMO_ITEM = 0.75; // descrição já presente no orçamento (não sugere de novo)
const UNIDADES_PONTO = new Set(['pt', 'un', 'und', 'unid', 'pc', 'par', 'cj', 'conj']);

const ACENTOS = /[̀-ͯ]/g;
const norm = (s) => String(s ?? '').normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const mediana = (l) => {
  const v = [...l].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

// disciplina pelo subgrupo do item: o nome da análise ("Circuito Fechado de TV (CFTV)") ou a chave ("cftv"). O
// aprendizado fica na chave da SKILL (rede e cabeamento são a mesma skill), que é como o usuário pensa a disciplina.
const PELO_NOME = new Map();
for (const d of DISCIPLINAS) {
  const chave = d.skill || d.chave;
  PELO_NOME.set(norm(d.nome), chave);
  PELO_NOME.set(norm(d.chave), chave);
  if (d.skill) PELO_NOME.set(norm(d.skill), chave);
}
const disciplinaDoSubgrupo = (subgrupo) => PELO_NOME.get(norm(subgrupo)) || null;
const nomeDaChave = (chave) => (DISCIPLINAS.find(d => (d.skill || d.chave) === chave)?.nome) || nomeDaDisciplina(chave);

// identidades do item, da mais forte para a mais fraca: o material do catálogo, o código do serviço, a descrição
function chavesDoItem(it) {
  const l = [];
  if (Number(it.material_id) > 0) l.push(`m:${Number(it.material_id)}`);
  if (it.codigo) l.push(`c:${norm(it.codigo)}`);
  l.push(`d:${norm(it.descricao)}|${norm(it.unidade)}`);
  return l;
}
const ehUnidadeDePonto = (u) => UNIDADES_PONTO.has(norm(u).replace(/\.$/, ''));
// "tamanho" da disciplina no orçamento: os pontos instalados (serviços contados em pt/un). Os itens que acompanham
// a disciplina guardam a quantidade por ponto, para valer em obra maior ou menor.
const baseDaDisciplina = (servicos) => servicos.reduce((s, it) => s + (ehUnidadeDePonto(it.unidade) ? Number(it.quantidade) || 0 : 0), 0);

// Lê as propostas aprovadas e devolve o conhecimento por disciplina:
//   { [disciplina]: { propostas, itens: Map(chave → estatística) } }
async function carregarConhecimento({ db = pool, excluirPropostaId = null } = {}) {
  const { rows } = await db.query(
    `SELECT p.id AS proposta_id, p.data, s.nome AS secao, i.material_id, i.codigo, i.descricao, i.unidade,
            i.quantidade::float8 AS quantidade, i.valor_unitario::float8 AS vu, COALESCE(i.status, 'confirmado') AS status, i.subgrupo
       FROM propostas p
       JOIN proposta_itens i ON i.proposta_id = p.id
       JOIN proposta_secoes s ON s.id = i.secao_id
      WHERE p.status = 'Aprovada' AND p.data > CURRENT_DATE - $1::int
        AND ($2::int IS NULL OR p.id <> $2)
      ORDER BY p.data DESC, p.id DESC
      LIMIT 20000`, [JANELA_DIAS, excluirPropostaId]);
  // proposta → disciplina → itens
  const porProposta = new Map();
  for (const r of rows) {
    const d = disciplinaDoSubgrupo(r.subgrupo);
    if (!d) continue; // subgrupo livre ("Diversos"): não ensina nenhuma disciplina
    if (!porProposta.has(r.proposta_id)) porProposta.set(r.proposta_id, { data: r.data, disc: new Map() });
    const p = porProposta.get(r.proposta_id);
    if (!p.disc.has(d)) p.disc.set(d, []);
    p.disc.get(d).push({ ...r, servico: ehMaoDeObra(r.secao) });
  }
  const conhecimento = {};
  const hoje = Date.now();
  for (const [propostaId, p] of porProposta) {
    for (const [d, itens] of p.disc) {
      const k = (conhecimento[d] ||= { propostas: 0, itens: new Map() });
      k.propostas++;
      const base = baseDaDisciplina(itens.filter(i => i.servico));
      const vistos = new Set();
      for (const it of itens) {
        const chave = chavesDoItem(it)[0];
        if (vistos.has(chave)) continue; // o mesmo item duas vezes na proposta conta uma ocorrência
        vistos.add(chave);
        const e = k.itens.get(chave) || {
          chave, chaves: chavesDoItem(it), descricao: it.descricao, unidade: it.unidade, codigo: it.codigo || null,
          material_id: Number(it.material_id) > 0 ? Number(it.material_id) : null, servico: it.servico,
          propostas: new Set(), porPonto: [], quantidades: [], precos: [], ultimaVenda: null,
        };
        e.propostas.add(propostaId);
        if (Number(it.quantidade) > 0) {
          e.quantidades.push(Number(it.quantidade));
          if (base > 0) e.porPonto.push(Number(it.quantidade) / base);
        }
        // só preço de verdade: item confirmado com valor (o "a cotar" é estimativa)
        if (it.status === 'confirmado' && it.vu > 0) {
          e.precos.push(it.vu);
          const t = new Date(it.data).getTime();
          if (!e.ultimaVenda || t > e.ultimaVenda) e.ultimaVenda = t;
        }
        k.itens.set(chave, e);
      }
    }
  }
  for (const k of Object.values(conhecimento)) {
    for (const e of k.itens.values()) {
      e.ocorrencias = e.propostas.size;
      e.propostas = undefined;
      e.preco = e.precos.length ? r2(mediana(e.precos)) : null;
      e.precoRecente = e.ultimaVenda != null && (hoje - e.ultimaVenda) / 86400000 <= PRECO_RECENTE_DIAS;
    }
  }
  return conhecimento;
}

// o mesmo item no conhecimento: pela chave mais forte que existir (material, código, descrição)
function acharNoConhecimento(k, it) {
  if (!k) return null;
  for (const ch of chavesDoItem(it)) {
    for (const e of k.itens.values()) if (e.chaves.includes(ch)) return e;
  }
  return null;
}
function acharEmQualquerDisciplina(conhecimento, it) {
  for (const k of Object.values(conhecimento)) {
    const e = acharNoConhecimento(k, it);
    if (e && e.preco) return e;
  }
  return null;
}

// Quantidade sugerida de um item que acompanha a disciplina: proporcional aos pontos quando o item varia com o porte
// (cabo por câmera), a mediana das propostas quando não há base (verba, um rack). Metro e unidade arredondam para cima.
function quantidadeSugerida(e, base) {
  if (norm(e.unidade) === 'vb') return 1;
  let q = base > 0 && e.porPonto.length ? mediana(e.porPonto) * base : mediana(e.quantidades);
  if (!(q > 0)) return 0;
  q = Math.ceil(q - 1e-9);
  return q;
}

// Aplica o aprendizado nos itens de uma proposta que está sendo gerada.
//   itens: [{ secao_nome, codigo, material_id, descricao, quantidade, unidade, valor_unitario, subgrupo, status }]
//   opcoes.disciplinaPadrao: a disciplina do projeto/laudo (item sem subgrupo de disciplina fica com ela)
//   opcoes.secaoServicos / secaoMateriais: em que seção entram os itens sugeridos
// → { itens, resumo: { precosAprendidos, confirmadosPeloHistorico, sugeridos: [{ descricao, disciplina, ocorrencias, propostas }], disciplinas } }
function aplicar(itensEntrada, conhecimento, opcoes = {}) {
  const { disciplinaPadrao = null, secaoServicos = 'Serviços (Mão de Obra)', secaoMateriais = 'Materiais e Equipamentos' } = opcoes;
  const resumo = { precosAprendidos: 0, confirmadosPeloHistorico: 0, sugeridos: [], disciplinas: {} };
  const discDe = (it) => disciplinaDoSubgrupo(it.subgrupo) || disciplinaPadrao;
  const itens = itensEntrada.map((it) => {
    // preço já dado fica; a referência de mercado (preco_referencia) cede lugar ao que a H&M praticou
    if (Number(it.valor_unitario) > 0 && !it.preco_referencia) return it;
    const d = discDe(it);
    const e = acharNoConhecimento(conhecimento[d], it) || acharEmQualquerDisciplina(conhecimento, it);
    if (!e?.preco) return it;
    resumo.precosAprendidos++;
    // serviço com preço vendido em 2+ propostas aprovadas no último ano confirma sozinho (é o preço da própria H&M,
    // não uma estimativa); material não: o preço de compra muda e o catálogo/cotação é que vale
    const servico = ehMaoDeObra(it.secao_nome);
    const confirma = servico && Number(it.quantidade) > 0 && e.precoRecente && e.precos.length >= MIN_PROPOSTAS_PRECO;
    if (confirma) resumo.confirmadosPeloHistorico++;
    return { ...it, valor_unitario: e.preco, status: confirma ? 'confirmado' : 'a_cotar', origem_preco: 'historico' };
  });

  // itens que acompanham a disciplina e não estão no orçamento
  const presentes = itens.map(it => ({ chaves: new Set(chavesDoItem(it)), termos: termosDaDescricao(it.descricao) }));
  const jaTem = (e) => presentes.some(p => e.chaves.some(c => p.chaves.has(c))
    || indiceJaccard(p.termos, termosDaDescricao(e.descricao)) >= SEMELHANCA_MESMO_ITEM);
  const disciplinasDoOrcamento = [...new Set(itens.map(discDe).filter(Boolean))];
  for (const d of disciplinasDoOrcamento) {
    const k = conhecimento[d];
    resumo.disciplinas[d] = { nome: nomeDaChave(d), propostas: k?.propostas || 0 };
    if (!k || k.propostas < MIN_PROPOSTAS_ITEM) continue;
    const base = baseDaDisciplina(itens.filter(it => discDe(it) === d && ehMaoDeObra(it.secao_nome)));
    const candidatos = [...k.itens.values()]
      .filter(e => e.ocorrencias >= MIN_PROPOSTAS_ITEM && e.ocorrencias / k.propostas >= FRACAO_ITEM && !jaTem(e))
      .sort((a, b) => b.ocorrencias - a.ocorrencias);
    for (const e of candidatos) {
      if (resumo.sugeridos.length >= MAX_SUGERIDOS) break;
      const quantidade = quantidadeSugerida(e, base);
      if (!(quantidade > 0)) continue;
      itens.push({
        secao_nome: e.servico ? secaoServicos : secaoMateriais,
        codigo: e.codigo, material_id: e.material_id, descricao: e.descricao, quantidade, unidade: e.unidade,
        valor_unitario: e.preco || 0, subgrupo: nomeDaChave(d),
        // sugestão do aprendizado: entra "a cotar" para o engenheiro conferir quantidade e preço
        status: 'a_cotar', origem_preco: e.preco ? 'historico' : null, sugerido_pelo_aprendizado: true,
      });
      presentes.push({ chaves: new Set(e.chaves), termos: termosDaDescricao(e.descricao) });
      resumo.sugeridos.push({ descricao: e.descricao, disciplina: nomeDaChave(d), ocorrencias: e.ocorrencias, propostas: k.propostas, quantidade, unidade: e.unidade });
    }
  }
  return { itens, resumo };
}

// Texto curto para a mensagem e o histórico da proposta
function textoDoResumo(resumo) {
  const partes = [];
  if (resumo.precosAprendidos) partes.push(`${resumo.precosAprendidos} preço(s) do histórico de propostas aprovadas${resumo.confirmadosPeloHistorico ? ` (${resumo.confirmadosPeloHistorico} serviço(s) confirmados)` : ''}`);
  if (resumo.sugeridos.length) partes.push(`${resumo.sugeridos.length} item(ns) sugerido(s) pelo aprendizado da disciplina (a cotar)`);
  return partes.length ? `Aprendizado de orçamento: ${partes.join('; ')}.` : '';
}

// Painel: o que o sistema já sabe orçar em cada disciplina
async function painel({ db = pool } = {}) {
  const conhecimento = await carregarConhecimento({ db });
  return Object.entries(conhecimento).map(([d, k]) => {
    const itens = [...k.itens.values()];
    const frequentes = itens.filter(e => e.ocorrencias >= MIN_PROPOSTAS_ITEM && e.ocorrencias / k.propostas >= FRACAO_ITEM);
    return {
      disciplina: d, nome: nomeDaChave(d), propostas: k.propostas,
      itensConhecidos: itens.length,
      servicosComPreco: itens.filter(e => e.servico && e.preco).length,
      materiaisComPreco: itens.filter(e => !e.servico && e.preco).length,
      precosQueConfirmam: itens.filter(e => e.servico && e.precoRecente && e.precos.length >= MIN_PROPOSTAS_PRECO).length,
      itensQueAcompanham: frequentes.sort((a, b) => b.ocorrencias - a.ocorrencias).slice(0, 15).map(e => ({
        descricao: e.descricao, unidade: e.unidade, servico: e.servico, ocorrencias: e.ocorrencias,
        porPonto: e.porPonto.length ? r2(mediana(e.porPonto)) : null, preco: e.preco,
      })),
      // pronto para orçar sozinho: 3+ propostas aprovadas e a maior parte dos serviços com preço que confirma
      autonomia: k.propostas >= 3 ? 'boa' : k.propostas >= MIN_PROPOSTAS_ITEM ? 'aprendendo' : 'pouca',
    };
  }).sort((a, b) => b.propostas - a.propostas || a.nome.localeCompare(b.nome, 'pt-BR'));
}

module.exports = { carregarConhecimento, aplicar, textoDoResumo, painel, disciplinaDoSubgrupo, paraTestes: { baseDaDisciplina, quantidadeSugerida, chavesDoItem } };
