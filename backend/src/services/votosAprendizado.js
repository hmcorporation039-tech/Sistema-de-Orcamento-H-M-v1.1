// Quem ensinou cada coisa que o sistema aprende do desenho (revisão do aprendizado, 06/11/2026 — migração
// 2.0-53-aprendizado-por-disciplina.js). Antes cada tabela só somava `vezes`/`conflitos` a cada leitura: reler o mesmo
// arquivo contava de novo, "PLANTA ELETRICA.dwg" de obras diferentes não se reforçava, desfazer apagava o que outros
// projetos tinham ensinado e um conflito era para sempre. Agora cada PROJETO dá um voto por chave
// (aprendizado_votos: tipo + chave + fonte) e a linha da tabela é o resultado da apuração:
//   - a confirmação do engenheiro (origem 'usuario') vence; entre engenheiros, a mais confirmada, depois a mais recente;
//   - sem ela, opinião única vale; com divergência, vale a maioria quando há 3+ votos e uma opção tem 2/3 deles —
//     senão fica em conflito (fora de uso até alguém conferir);
//   - votar de novo do mesmo projeto não soma (idempotente); desfazer tira só o voto daquele projeto.
// fonte: a identidade do projeto — 'obra:<id>' / 'analise:<id>' (mapa do CAD), 'acervo:<pasta da obra>' (treino),
// 'arquivo:<hash ou nome>' (análise sem obra). A linha que já existia antes dos votos entra como um voto 'legado' com
// o peso que ela tinha (vezes), na primeira vez que alguém vota nela.
const CONFLITO_LEGADO = '#conflito'; // os conflitos contados antes dos votos: opinião desconhecida, só pesa contra
const TIPOS = new Set(['simbolo', 'bloco', 'nota', 'pdf']);
const corta = (s, n) => String(s ?? '').slice(0, n);

// Função pura. votos: [{ valor, origem, peso, dados, em }] → { valor, dados, vezes, conflitos, usuario, total } | null
function decidir(votos) {
  const validos = (votos || []).filter(v => Number(v.peso) > 0);
  if (!validos.length) return null;
  const total = validos.reduce((s, v) => s + Number(v.peso), 0);
  const agrupar = (lista) => {
    const por = new Map();
    for (const v of lista) {
      const g = por.get(v.valor) || por.set(v.valor, { valor: v.valor, peso: 0, em: 0, dados: null }).get(v.valor);
      g.peso += Number(v.peso);
      const em = new Date(v.em || 0).getTime() || 0;
      if (!g.dados || em >= g.em) { g.em = em; g.dados = v.dados || null; } // a descrição mais recente fica
    }
    return [...por.values()].sort((a, b) => b.peso - a.peso || b.em - a.em);
  };
  const doUsuario = validos.filter(v => v.origem === 'usuario' && v.valor !== CONFLITO_LEGADO);
  if (doUsuario.length) {
    const g = agrupar(doUsuario)[0];
    return { valor: g.valor, dados: g.dados, vezes: g.peso, conflitos: 0, usuario: true, total };
  }
  const opcoes = agrupar(validos.filter(v => v.valor !== CONFLITO_LEGADO));
  if (!opcoes.length) return { valor: null, dados: null, vezes: 0, conflitos: total, usuario: false, total };
  const g = opcoes[0];
  const contra = total - g.peso;
  const resolvido = contra === 0 || (total >= 3 && 3 * g.peso >= 2 * total);
  return { valor: g.valor, dados: g.dados, vezes: g.peso, conflitos: resolvido ? 0 : contra, usuario: false, total };
}

async function votosDe(executor, tipo, chave) {
  const { rows } = await executor.query(
    'SELECT fonte, valor, origem, peso, dados, atualizado_em AS em FROM aprendizado_votos WHERE tipo = $1 AND chave = $2', [tipo, chave]);
  return rows;
}

// legado(): [{ valor, origem, peso, dados }] da linha que já existia antes dos votos (ou [] se não existe)
async function semearLegado(executor, tipo, chave, legado) {
  if (!legado) return;
  const { rows } = await executor.query('SELECT 1 FROM aprendizado_votos WHERE tipo = $1 AND chave = $2 LIMIT 1', [tipo, chave]);
  if (rows.length) return;
  for (const [i, v] of (await legado()).entries()) {
    await executor.query(
      `INSERT INTO aprendizado_votos (tipo, chave, fonte, valor, origem, peso, dados) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tipo, chave, fonte) DO NOTHING`,
      [tipo, chave, i ? `legado-${i}` : 'legado', corta(v.valor, 300), v.origem, Math.max(1, Number(v.peso) || 1), JSON.stringify(v.dados || {})]);
  }
}

// O voto de um projeto. O mesmo projeto votando de novo com a mesma opinião não muda nada; com outra, troca o voto dele.
async function votar(executor, { tipo, chave, fonte, valor, origem, dados = {}, legado = null }) {
  if (!TIPOS.has(tipo)) throw new Error(`tipo de aprendizado desconhecido: ${tipo}`);
  await semearLegado(executor, tipo, chave, legado);
  const r = await executor.query(
    `INSERT INTO aprendizado_votos (tipo, chave, fonte, valor, origem, dados) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tipo, chave, fonte) DO UPDATE SET valor = EXCLUDED.valor, origem = EXCLUDED.origem, dados = EXCLUDED.dados, peso = 1, atualizado_em = NOW()
       WHERE aprendizado_votos.valor IS DISTINCT FROM EXCLUDED.valor OR aprendizado_votos.origem IS DISTINCT FROM EXCLUDED.origem
          OR (aprendizado_votos.origem = 'usuario' AND aprendizado_votos.dados IS DISTINCT FROM EXCLUDED.dados)`,
    [tipo, corta(chave, 400), corta(fonte, 300) || 'sem-fonte', corta(valor, 300), origem, JSON.stringify(dados)]);
  return r.rowCount > 0;
}

// Desfazer: tira o voto deste projeto, só se ele ainda diz `valor` (o tipo guardado é o que está sendo desfeito). Sem
// voto do projeto (confirmação feita antes dos votos), desconta 1 do voto 'legado' de mesma opinião e origem.
async function retirar(executor, { tipo, chave, fonte, valor, origem = 'usuario' }) {
  const r = await executor.query('DELETE FROM aprendizado_votos WHERE tipo = $1 AND chave = $2 AND fonte = $3 AND valor = $4 AND origem = $5',
    [tipo, chave, corta(fonte, 300), corta(valor, 300), origem]);
  if (r.rowCount) return r.rowCount;
  const l = await executor.query(
    `UPDATE aprendizado_votos SET peso = peso - 1, atualizado_em = NOW() WHERE tipo = $1 AND chave = $2 AND fonte LIKE 'legado%' AND valor = $3 AND origem = $4
     RETURNING id, peso`, [tipo, chave, corta(valor, 300), origem]);
  if (!l.rowCount) return 0;
  await executor.query('DELETE FROM aprendizado_votos WHERE id = ANY($1) AND peso <= 0', [l.rows.map(x => x.id)]);
  return 1;
}

const apurar = async (executor, tipo, chave) => decidir(await votosDe(executor, tipo, chave));

module.exports = { decidir, votar, retirar, apurar, votosDe, CONFLITO_LEGADO };
