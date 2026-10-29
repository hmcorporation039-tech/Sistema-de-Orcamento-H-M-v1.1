// Auto-cadastro de itens de proposta no catálogo (materiais e mão de obra).
// Objetivo: quando alguém digita um item novo à mão (em vez de escolher do
// "+ catálogo"), o sistema compara com o que já existe e só cadastra como
// novo se realmente não existir — assim o catálogo cresce sozinho e as
// próximas propostas (de qualquer cliente) já sugerem a mesma descrição, sem
// duplicar "Cabo HDMI 2m" e "cabo hdmi 2m " como dois itens diferentes.
//
// A comparação ignora maiúscula/minúscula e espaços nas pontas (não ignora
// acento — problema real de dado não confirmado aqui como foi com nome de
// cliente; se aparecer, ajusta-se do mesmo jeito).

// materiais.descricao e mao_de_obra_itens.descricao são VARCHAR(300), mas o
// item da proposta aceita texto livre. Uma descrição maior que isso não é um
// item reutilizável de catálogo, e tentar cadastrá-la estourava o tamanho da
// coluna e derrubava o salvamento da PROPOSTA inteira (a transação é única).
const TAMANHO_MAX_DESCRICAO_CATALOGO = 300;
const { categoriaLocal } = require('./classificacaoMateriais');
const { garantirServicoCadastrado } = require('../utils/servicosBase');

// Só vira item de catálogo o que tem PREÇO e cara de item reutilizável
// (decisão do usuário em 28/10/2026). O orçamento gerado de uma análise ou de
// um laudo cadastrava tudo a R$ 0,00 — "Interruptor — bloco INT", "Eletroduto
// — medido no desenho", "NC-01 (P2) — Adequar…", e lixo de leitura com
// tabulação ("Tomada 2P+T 10 A \tun \t6"). O item continua na proposta; entra
// no catálogo quando alguém der um preço a ele e salvar.
const RE_NAO_REUTILIZAVEL = /\t|—\s*bloco\b|medido no desenho|contado no\b|^NC-\d+/i;
function ehItemDeCatalogo(descricao, valorUnitario) {
  const desc = String(descricao || '').trim();
  return !!desc && desc.length <= TAMANHO_MAX_DESCRICAO_CATALOGO && Number(valorUnitario) > 0 && !RE_NAO_REUTILIZAVEL.test(desc);
}

// Acha o material do catálogo com a mesma descrição (ignorando
// caixa/espaços) ou cadastra um novo a partir dos dados do item. Só é
// chamado quando o item NÃO veio do "+ catálogo" (material_id já nulo) —
// itens escolhidos do catálogo já têm o vínculo certo e não passam por aqui.
async function garantirMaterialCadastrado(client, { descricao, unidade, ncm, valor_unitario }) {
  const desc = (descricao || '').trim();
  if (!ehItemDeCatalogo(desc, valor_unitario)) return null;

  const existente = await client.query(
    `SELECT id FROM materiais WHERE ativo = true AND TRIM(LOWER(descricao)) = TRIM(LOWER($1)) LIMIT 1`,
    [desc]
  );
  if (existente.rows.length > 0) return existente.rows[0].id;

  // Categoria pelo NCM, pelo material mais parecido do catálogo ou por
  // palavras-chave; sem nenhum, "Não classificado" até a rotina de IA rodar
  // (disparada depois que a proposta é salva). Antes entrava sempre "Geral".
  const c = await categoriaLocal(client, { descricao: desc, ncm });
  const novo = await client.query(
    `INSERT INTO materiais (descricao, categoria, unidade, preco, ncm, origem, preco_manual)
     VALUES ($1, $2, $3, $4, $5, 'proposta', true)
     ON CONFLICT ((LOWER(TRIM(descricao)))) WHERE ativo = true DO NOTHING
     RETURNING id`,
    [desc, c ? c.categoria : 'Não classificado', unidade || 'un', valor_unitario || 0, ncm || null]
  );
  if (novo.rows.length) return novo.rows[0].id;
  // cadastrado ao mesmo tempo por outra gravação: usa o que já existe (índice único do banco)
  return (await client.query('SELECT id FROM materiais WHERE ativo = true AND TRIM(LOWER(descricao)) = TRIM(LOWER($1)) LIMIT 1', [desc])).rows[0]?.id || null;
}

// Mão de obra: desde a versão 2.0 o item entra na BASE ÚNICA de serviços
// (precos_mao_de_obra_referencia, origem 'proposta', código livre_<id>) — que
// alimenta a lista suspensa da tela Orçamento e a tela Preços de Mão de Obra.
// A tabela antiga mao_de_obra_itens continua sendo escrita junto (dá o id
// estável do código e mantém a 1.x funcionando). Ver utils/servicosBase.js.
async function garantirMaoDeObraCadastrada(client, { descricao, unidade, valor_unitario, codigo, subgrupo }) {
  if (!ehItemDeCatalogo(descricao, valor_unitario)) return null; // mesma regra dos materiais
  return garantirServicoCadastrado(client, { descricao, unidade, valor_unitario, codigo, subgrupo });
}

module.exports = { garantirMaterialCadastrado, garantirMaoDeObraCadastrada, ehItemDeCatalogo };
