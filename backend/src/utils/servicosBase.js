// Base única de serviços de mão de obra (versão 2.0, Fase 1B).
//
// Uma tabela só — precos_mao_de_obra_referencia — com dois tipos de serviço:
//   origem 'padrao'   → os códigos canônicos de ITENS_REFERENCIA (Análise de
//                       Projeto e laudos), semeados pelo schema;
//   origem 'proposta' → serviços "livres" digitados à mão numa proposta, com
//                       código estável `livre_<id de mao_de_obra_itens>`.
// A tabela antiga mao_de_obra_itens continua existindo e sendo escrita (ver
// garantirServicoCadastrado): é ela que dá o id estável do código livre e
// mantém a versão 1.x funcionando se for preciso voltar atrás.
//
// Um livre duplicado pode ser desativado ou "fundido" num padrão
// (fundido_em = código de destino): sai da lista suspensa e, quando alguém
// digitar a mesma descrição de novo, o sistema reconhece o serviço de destino
// em vez de recriar o livre. Propostas antigas não são reescritas.

const TAMANHO_MAX_DESCRICAO = 300;
const PREFIXO_LIVRE = 'livre_';
const DISCIPLINA_OUTROS = 'outros';

const codigoLivre = (idItemAntigo) => `${PREFIXO_LIVRE}${Number(idItemAntigo)}`;

// sem acento, sem caixa e com espaços simples — só para comparar nomes de subgrupo
function normalizarTexto(txt) {
  return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Subgrupo do item de mão de obra (escolhido pelo usuário ou vindo da Análise
// de Projeto, que usa o nome da disciplina) → disciplina da base. Só nome
// EXATO (sem acento/caixa): é a única dedução confiável — palavra-chave na
// descrição erra fácil ("switch PoE" lançado em CFTV, "passagem de cabos" em
// três subgrupos diferentes), então descrição sozinha não decide nada.
// Nomes aceitos: o subgrupo de serviço da disciplina e os `aliases` do
// registro único (skills/_comum/disciplinas.js).
const SUBGRUPO_PARA_DISCIPLINA = require('../config/caminhos').registroDisciplinas().mapa(d => [d.subgrupo.servico, ...d.aliases]);
const MAPA_SUBGRUPO = new Map(
  Object.entries(SUBGRUPO_PARA_DISCIPLINA).flatMap(([disc, nomes]) => [disc, ...nomes].map(n => [normalizarTexto(n), disc]))
);
const disciplinaDoSubgrupo = (subgrupo) => MAPA_SUBGRUPO.get(normalizarTexto(subgrupo)) || null;

// Disciplina de um serviço livre a partir de sinais confiáveis, nesta ordem:
// (1) disciplina do código padrão que os itens com essa descrição carregam;
// (2) subgrupo dos itens com essa descrição; sem sinal único → 'outros'.
function deduzirDisciplina({ disciplinasDosCodigos = [], subgrupos = [] } = {}) {
  const unica = (lista) => {
    const s = new Set(lista.filter(Boolean));
    return s.size === 1 ? [...s][0] : null;
  };
  const porCodigo = unica(disciplinasDosCodigos);
  if (porCodigo) return porCodigo;
  const vistos = subgrupos.filter(sg => normalizarTexto(sg));
  const mapeados = vistos.map(disciplinaDoSubgrupo);
  // um subgrupo sem correspondência ("Sonorização") também conta como sinal:
  // se os itens foram lançados em subgrupos diferentes, não chuta
  if (mapeados.some(d => !d)) return DISCIPLINA_OUTROS;
  return unica(mapeados) || DISCIPLINA_OUTROS;
}

// Código final de um serviço, seguindo a cadeia de fusões (livre → padrão)
function resolverCodigo(porCodigo, codigo) {
  const vistos = new Set();
  let atual = porCodigo.get(codigo);
  while (atual && atual.fundido_em && !vistos.has(atual.codigo)) {
    vistos.add(atual.codigo);
    const prox = porCodigo.get(atual.fundido_em);
    if (!prox) break;
    atual = prox;
  }
  return atual || null;
}

// Plano da fusão de um serviço livre (origem) em outro serviço (destino,
// normalmente um padrão). Sem banco: recebe a lista de serviços e devolve o
// que gravar, ou { erro } com o motivo. Também redireciona para o destino
// final os livres que já tinham sido fundidos na origem (sem cadeia).
function planejarFusao(servicos, codigoOrigem, codigoDestino) {
  const porCodigo = new Map(servicos.map(s => [s.codigo, s]));
  const origem = porCodigo.get(codigoOrigem);
  if (!origem) return { erro: 'Serviço de origem não encontrado', status: 404 };
  if (origem.origem !== 'proposta') return { erro: 'Só um serviço lançado em proposta pode ser fundido; os serviços padrão são fixos', status: 400 };
  if (!codigoDestino || !porCodigo.has(codigoDestino)) return { erro: 'Serviço de destino não encontrado', status: 404 };
  const destino = resolverCodigo(porCodigo, codigoDestino);
  if (!destino || destino.codigo === origem.codigo) return { erro: 'Escolha um serviço diferente do próprio', status: 400 };
  if (destino.ativo === false) return { erro: 'O serviço de destino está desativado', status: 400 };
  const redirecionar = servicos
    .filter(s => s.fundido_em === origem.codigo && s.codigo !== destino.codigo)
    .map(s => s.codigo);
  return { origem: origem.codigo, destino: destino.codigo, redirecionar };
}

// Garante que um item de mão de obra lançado numa proposta exista na base
// única. Devolve o código do serviço (já resolvendo fusão) ou null.
// Compara a descrição sem caixa/espaços nas pontas, como o catálogo de
// materiais. Um serviço que já existe NÃO muda de preço por causa da proposta.
async function garantirServicoCadastrado(client, { descricao, unidade, valor_unitario, codigo, subgrupo }) {
  const desc = String(descricao || '').trim();
  if (!desc || desc.length > TAMANHO_MAX_DESCRICAO) return null;

  // 0) o item já veio com o código de um serviço da base (escolhido na lista ou
  //    gerado por um laudo): é esse serviço, mesmo que a descrição na proposta
  //    tenha sido detalhada — senão cada orçamento de laudo criava um livre_
  //    novo para cada variação de texto do mesmo serviço
  if (codigo) {
    const { rows: [porCodigo] } = await client.query(
      'SELECT codigo, fundido_em FROM precos_mao_de_obra_referencia WHERE codigo = $1',
      [String(codigo).trim()]
    );
    if (porCodigo) return porCodigo.fundido_em || porCodigo.codigo;
  }

  // 1) já existe (padrão, livre ativo, desativado ou fundido) → não recria
  const { rows: [existente] } = await client.query(
    `SELECT codigo, fundido_em FROM precos_mao_de_obra_referencia
      WHERE LOWER(TRIM(descricao)) = LOWER($1)
      ORDER BY (origem = 'padrao') DESC, ativo DESC LIMIT 1`,
    [desc]
  );
  if (existente) return existente.fundido_em || existente.codigo;

  // 2) tabela antiga: dá o id estável do código livre (e mantém a 1.x em dia)
  let { rows: [antigo] } = await client.query(
    'SELECT id FROM mao_de_obra_itens WHERE TRIM(LOWER(descricao)) = LOWER($1) ORDER BY ativo DESC, id LIMIT 1',
    [desc]
  );
  if (!antigo) {
    ({ rows: [antigo] } = await client.query(
      'INSERT INTO mao_de_obra_itens (descricao, unidade, valor_unitario) VALUES ($1, $2, $3) RETURNING id',
      [desc, unidade || 'un', valor_unitario || 0]
    ));
  }

  // 3) disciplina: código padrão do item, senão o subgrupo
  const disciplinasDosCodigos = [];
  if (codigo) {
    const { rows: [p] } = await client.query("SELECT disciplina FROM precos_mao_de_obra_referencia WHERE codigo = $1 AND origem = 'padrao'", [codigo]);
    if (p) disciplinasDosCodigos.push(p.disciplina);
  }
  const disciplina = deduzirDisciplina({ disciplinasDosCodigos, subgrupos: subgrupo ? [subgrupo] : [] });

  const novoCodigo = codigoLivre(antigo.id);
  await client.query(
    `INSERT INTO precos_mao_de_obra_referencia (codigo, descricao, unidade, disciplina, valor_referencia, origem, ativo, criado_em)
     VALUES ($1, $2, $3, $4, $5, 'proposta', true, NOW())
     ON CONFLICT DO NOTHING`,
    [novoCodigo, desc, String(unidade || 'un').slice(0, 10), disciplina, Number(valor_unitario) > 0 ? Number(valor_unitario) : null]
  );
  // gravado ao mesmo tempo por outra proposta com a mesma descrição: usa o que ficou
  const { rows: [final] } = await client.query(
    'SELECT codigo, fundido_em FROM precos_mao_de_obra_referencia WHERE LOWER(TRIM(descricao)) = LOWER($1) ORDER BY (origem = \'padrao\') DESC, ativo DESC LIMIT 1',
    [desc]
  );
  return final ? (final.fundido_em || final.codigo) : novoCodigo;
}

module.exports = {
  TAMANHO_MAX_DESCRICAO, PREFIXO_LIVRE, DISCIPLINA_OUTROS,
  codigoLivre, normalizarTexto, disciplinaDoSubgrupo, deduzirDisciplina,
  resolverCodigo, planejarFusao, garantirServicoCadastrado,
};
