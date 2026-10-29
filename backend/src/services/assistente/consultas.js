// Consultas só de leitura usadas pelas ferramentas do assistente que não têm
// rota própria no sistema: a documentação das skills (normas) e o histórico de
// preço de um item (catálogo, mudanças de preço e o que já foi cobrado nas
// propostas).
const fs = require('fs');
const path = require('path');
const { DISCIPLINAS_LAUDO } = require('../../utils/disciplinasLaudo');

const { RAIZ_SKILLS } = require('../../config/caminhos');
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Arquivos de documentação de uma skill: SKILL.md e referencia/*.md. Os nomes
// vêm da listagem da pasta (nunca do pedido), então não há caminho livre.
function arquivosDaSkill(pasta) {
  const raiz = path.join(RAIZ_SKILLS, pasta);
  const lista = [];
  if (fs.existsSync(path.join(raiz, 'SKILL.md'))) lista.push({ nome: 'SKILL.md', caminho: path.join(raiz, 'SKILL.md') });
  const ref = path.join(raiz, 'referencia');
  if (fs.existsSync(ref)) {
    for (const n of fs.readdirSync(ref).filter(n => /\.md$/i.test(n)).sort()) lista.push({ nome: `referencia/${n}`, caminho: path.join(ref, n) });
  }
  return lista;
}

function consultarNorma({ disciplina, busca, arquivo } = {}) {
  const d = DISCIPLINAS_LAUDO.find(x => x.chave === disciplina || x.pasta === disciplina);
  if (!d) return { erro: `Disciplina desconhecida. Use uma destas: ${DISCIPLINAS_LAUDO.map(x => x.chave).join(', ')}` };
  const arquivos = arquivosDaSkill(d.pasta);
  if (!arquivos.length) return { erro: `A skill de ${d.nome} não tem documentação nesta instalação.` };
  const base = { disciplina: d.chave, skill: d.pasta, nome: d.nome, arquivos: arquivos.map(a => a.nome) };

  if (arquivo) {
    const a = arquivos.find(x => x.nome === arquivo);
    if (!a) return { ...base, erro: `Arquivo "${arquivo}" não existe nesta skill. Use um da lista "arquivos".` };
    const texto = fs.readFileSync(a.caminho, 'utf8');
    return { ...base, arquivo: a.nome, texto: texto.length > 14000 ? `${texto.slice(0, 14000)}\n[… cortado]` : texto };
  }

  if (busca && String(busca).trim()) {
    const termos = semAcento(busca).split(/\s+/).filter(t => t.length > 1).slice(0, 8);
    const trechos = [];
    for (const a of arquivos) {
      const texto = fs.readFileSync(a.caminho, 'utf8');
      let titulo = '';
      for (const bloco of texto.split(/\n\s*\n/)) {
        const m = bloco.match(/^#{1,4}\s+(.+)$/m);
        if (m) titulo = m[1].trim();
        const alvo = semAcento(bloco);
        const acertos = termos.filter(t => alvo.includes(t)).length;
        if (acertos && acertos >= Math.min(termos.length, 2)) trechos.push({ arquivo: a.nome, secao: titulo, acertos, texto: bloco.trim().slice(0, 1500) });
      }
    }
    trechos.sort((x, y) => y.acertos - x.acertos);
    return { ...base, busca, trechos: trechos.slice(0, 8).map(({ acertos, ...t }) => t), total: trechos.length };
  }

  const skill = fs.readFileSync(arquivos[0].caminho, 'utf8');
  return { ...base, arquivo: arquivos[0].nome, texto: skill.length > 9000 ? `${skill.slice(0, 9000)}\n[… cortado — use "arquivo" ou "busca" para ver mais]` : skill };
}

// Histórico de preço: catálogo (com as últimas mudanças de preço) e os valores
// já usados em propostas para descrições parecidas.
async function historicoPreco(pool, descricao) {
  const termo = `%${String(descricao || '').trim().slice(0, 200)}%`;
  const { rows: catalogo } = await pool.query(
    `SELECT id, descricao, categoria, unidade, preco, preco_compra, marca, atualizado_em
       FROM materiais WHERE ativo = true AND (descricao ILIKE $1 OR codigo ILIKE $1 OR marca ILIKE $1)
      ORDER BY atualizado_em DESC NULLS LAST LIMIT 5`, [termo]);
  const ids = catalogo.map(m => m.id);
  const { rows: mudancas } = ids.length ? await pool.query(
    `SELECT material_id, origem, preco_anterior, preco_novo, preco_compra_anterior, preco_compra_novo, aplicado, motivo, criado_em
       FROM materiais_precos_historico WHERE material_id = ANY($1::int[]) ORDER BY criado_em DESC LIMIT 15`, [ids]) : { rows: [] };
  const { rows: emPropostas } = await pool.query(
    `SELECT p.numero, p.data, p.status, p.cliente_nome, i.descricao, i.quantidade, i.unidade, i.valor_unitario, i.status AS status_item
       FROM proposta_itens i JOIN propostas p ON p.id = i.proposta_id
      WHERE i.descricao ILIKE $1 AND i.valor_unitario > 0
      ORDER BY p.data DESC, p.id DESC LIMIT 10`, [termo]);
  return { catalogo, mudancas, emPropostas };
}

module.exports = { consultarNorma, historicoPreco, arquivosDaSkill };
