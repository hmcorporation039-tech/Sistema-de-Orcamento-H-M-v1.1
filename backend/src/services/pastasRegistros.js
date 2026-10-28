const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const P = require('../utils/pastasSistema');
const { DISCIPLINAS_LAUDO } = require('../utils/disciplinasLaudo');

// Versão 2.3 — PASTA POR CLIENTE (migração 2.0-19): obra e item sem obra moram
// na pasta do cliente, na raiz dos clientes (servidor):
//   Clientes\<cliente>\Obras\<obra>\...        (o conteúdo da obra é o de sempre)
//   Clientes\<cliente>\Projetos\<análise ou projeto sem obra>
//   Clientes\<cliente>\Laudos\<laudo sem obra>
//   Clientes\<cliente>\Propostas\               (proposta sem obra)
// `pasta_base` (relativa à raiz dos clientes, com "/") grava a pasta-mãe; NULL
// = item ainda no lugar antigo (Arquivos do Sistema\Obras|Projetos|Laudos) até
// o script scripts/mudar-pastas-para-clientes.js levar para o cliente.
// Item sem cliente: Clientes\_Sem cliente\... Trocou o cliente ou o nome do
// cliente: a pasta vai junto (e as pastas de dentro acompanham).
const RECEBIDOS = 'Recebidos do cliente';
const juntar = (raiz, rel) => path.join(raiz, ...String(rel).split('/').filter(Boolean));
const normalizarNome = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();

// cliente do item: cliente_id ou, sem ele, o único cliente ativo de mesmo nome
async function clienteIdDoItem(row, client = pool) {
  if (row.cliente_id) return row.cliente_id;
  if (!row.cliente_nome) return null;
  const alvo = normalizarNome(row.cliente_nome);
  const { rows } = await client.query('SELECT id, nome FROM clientes WHERE ativo IS NOT FALSE');
  const achados = rows.filter(c => normalizarNome(c.nome) === alvo);
  return achados.length === 1 ? achados[0].id : null;
}

// Troca o começo de pasta_base (e do retrato das pastas) quando uma pasta-mãe
// muda de nome/lugar: "Cliente A/Obras" → "Cliente B/Obras" etc.
async function trocarPrefixo(client, antigo, novo) {
  if (!antigo || antigo === novo) return;
  for (const t of ['obras', 'analises_projeto', 'laudos_projetos']) {
    await client.query(`UPDATE ${t} SET pasta_base = $2 || substr(pasta_base, length($1) + 1) WHERE pasta_base = $1 OR left(pasta_base, length($1) + 1) = $1 || '/'`, [antigo, novo]);
  }
  await client.query("UPDATE pasta_arquivos SET caminho = $2 || substr(caminho, length($1) + 1) WHERE left(caminho, length($1) + 1) = $1 || '/'", [antigo, novo]);
}

// Pastas que já estão na raiz dos clientes (no servidor), com o cliente que usa
// cada uma. As que começam com "_" são do sistema (_Excluídos, _Sem cliente).
async function pastasDoServidor(client = pool) {
  if (!(await P.servidorDisponivel())) return null;
  let entradas = [];
  try { entradas = await fsp.readdir(P.RAIZ_CLIENTES_SERVIDOR, { withFileTypes: true }); } catch { return null; }
  const { rows } = await client.query('SELECT id, nome, pasta FROM clientes WHERE pasta IS NOT NULL');
  const dono = new Map(rows.map(r => [r.pasta.toLowerCase(), r]));
  return entradas.filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => ({ nome: e.name, cliente: dono.get(e.name.toLowerCase()) || null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Pasta que já existe no servidor com o nome do cliente (sem acento, maiúscula
// ou pontuação: "cni" = "CNI") e que nenhum outro cliente usa — adotada como está.
async function pastaExistenteDoCliente(c, client) {
  const alvo = normalizarNome(c.nome);
  const livres = ((await pastasDoServidor(client)) || []).filter(p => !p.cliente && normalizarNome(p.nome) === alvo);
  return livres.length === 1 ? livres[0].nome : null;
}

// Pasta do cliente (nome relativo à raiz dos clientes), criada/renomeada, com "Recebidos do cliente"
async function pastaRelDoCliente(clienteId, client = pool) {
  const raiz = await P.raizClientes();
  const c = clienteId ? (await client.query('SELECT id, nome, pasta, pasta_fixa FROM clientes WHERE id = $1', [clienteId])).rows[0] : null;
  let rel = P.SEM_CLIENTE;
  if (c) {
    // servidor fora: não renomeia (a reserva local não tem a pasta antiga para renomear);
    // pasta adotada/ligada à mão: fica com o nome que tem no servidor
    if (c.pasta && (c.pasta_fixa || !(await P.servidorDisponivel()))) rel = c.pasta;
    else {
      const adotada = !c.pasta && raiz === P.RAIZ_CLIENTES_SERVIDOR ? await pastaExistenteDoCliente(c, client) : null;
      if (adotada) {
        // retrato NULL: o que já estava na pasta não vira novidade (monitorPastas)
        await client.query('UPDATE clientes SET pasta = $1, pasta_fixa = TRUE, pasta_retrato_em = NULL WHERE id = $2', [adotada, c.id]);
        rel = adotada;
      } else {
        rel = path.basename(await P.sincronizarPasta(client, { tipo: 'cliente', tabela: 'clientes', id: c.id, nome: c.nome, pastaAtual: c.pasta, raiz }));
        if (c.pasta && rel !== c.pasta) await trocarPrefixo(client, c.pasta, rel);
        // pasta nova, criada vazia pelo sistema: tudo que aparecer nela é novidade
        if (!c.pasta) await client.query('UPDATE clientes SET pasta_retrato_em = NOW() WHERE id = $1 AND pasta_retrato_em IS NULL', [c.id]);
      }
    }
  }
  await fsp.mkdir(path.join(raiz, rel, RECEBIDOS), { recursive: true });
  return rel;
}

// Junta o conteúdo de `de` em `para` (mesmo nome em pastas: entra nelas; arquivo
// com nome repetido: o que vem ganha " (do sistema)"). `de` some no fim.
async function juntarPastas(de, para) {
  await fsp.mkdir(para, { recursive: true });
  for (const e of await fsp.readdir(de, { withFileTypes: true })) {
    const origem = path.join(de, e.name);
    let destino = path.join(para, e.name);
    if (await P.existe(destino)) {
      if (e.isDirectory() && (await fsp.stat(destino)).isDirectory()) { await juntarPastas(origem, destino); continue; }
      const ext = path.extname(e.name);
      destino = path.join(para, `${path.basename(e.name, ext)} (do sistema)${ext}`);
      if (await P.existe(destino)) destino = path.join(para, `${path.basename(e.name, ext)} (do sistema ${Date.now()})${ext}`);
    }
    await P.moverPasta(origem, destino);
  }
  await fsp.rmdir(de).catch(() => {});
}

// Liga o cliente a uma pasta que já existe no servidor (nome diferente do
// cadastro: "Hosp Beta" → Hospital Beta S/A). O que o sistema já tinha
// gravado na pasta antiga do cliente vai para dentro dela. A pasta fica com o
// nome que tem (pasta_fixa) e o retrato é tirado de novo, sem avisos.
async function ligarPastaDoCliente(clienteId, nomePasta, client = pool) {
  const erro = (msg, status = 400) => Object.assign(new Error(msg), { status });
  const nome = String(nomePasta || '').trim();
  if (!nome || nome !== path.basename(nome) || /[\\/]/.test(nome) || nome === '.' || nome === '..' || nome.startsWith('_')) throw erro('Pasta inválida.');
  const lista = await pastasDoServidor(client);
  if (!lista) throw erro('O servidor das pastas dos clientes está fora do ar. Tente de novo em instantes.', 503);
  const alvo = lista.find(p => p.nome === nome);
  if (!alvo) throw erro('Essa pasta não existe na pasta dos clientes do servidor.', 404);
  const { rows: [c] } = await client.query('SELECT id, nome, pasta FROM clientes WHERE id = $1', [clienteId]);
  if (!c) throw erro('Cliente não encontrado.', 404);
  if (alvo.cliente && alvo.cliente.id !== c.id) throw erro(`Essa pasta já é do cliente "${alvo.cliente.nome}".`, 409);
  if (c.pasta && c.pasta.toLowerCase() !== nome.toLowerCase()) {
    const antiga = path.join(P.RAIZ_CLIENTES_SERVIDOR, c.pasta);
    if (await P.existe(antiga)) await juntarPastas(antiga, path.join(P.RAIZ_CLIENTES_SERVIDOR, nome));
    await trocarPrefixo(client, c.pasta, nome);
  }
  await client.query('UPDATE clientes SET pasta = $1, pasta_fixa = TRUE, pasta_retrato_em = NULL WHERE id = $2', [nome, c.id]);
  await fsp.mkdir(path.join(P.RAIZ_CLIENTES_SERVIDOR, nome, RECEBIDOS), { recursive: true });
  return { pasta: nome, anterior: c.pasta };
}

async function pastaDoCliente(clienteId, client = pool) {
  return path.join(await P.raizClientes(), await pastaRelDoCliente(clienteId, client));
}

// Item (obra, ou análise/laudo sem obra) na pasta-mãe `base` do cliente: se
// estava em outra (trocou de cliente), a pasta vai junto; depois o nome é
// sincronizado como sempre. `escopo`: os mesmos filtros de nome repetido.
async function pastaNaBase(client, { tabela, tipo, row, base, nome, escopo = [] }) {
  const raiz = await P.raizClientes();
  if (row.pasta && row.pasta_base && row.pasta_base !== base) {
    const de = juntar(raiz, `${row.pasta_base}/${row.pasta}`);
    if (await P.existe(de)) {
      let destino = juntar(raiz, `${base}/${row.pasta}`);
      if (await P.existe(destino)) destino = `${destino} (${row.id})`;
      await P.moverPasta(de, destino);
      await client.query(`UPDATE ${tabela} SET pasta = $1 WHERE id = $2`, [path.basename(destino), row.id]);
      await trocarPrefixo(client, `${row.pasta_base}/${row.pasta}`, `${base}/${path.basename(destino)}`);
      row.pasta = path.basename(destino);
    }
  }
  if (row.pasta_base !== base) {
    await client.query(`UPDATE ${tabela} SET pasta_base = $1 WHERE id = $2`, [base, row.id]);
    row.pasta_base = base;
  }
  return P.sincronizarPasta(client, { tipo, tabela, id: row.id, nome, pastaAtual: row.pasta, raiz: juntar(raiz, base), escopo: [{ coluna: 'pasta_base', valor: base }, ...escopo] });
}

// Caminho da pasta de uma obra JÁ registrada (sem criar): nova (no cliente) ou antiga
async function caminhoDaObra(obra) {
  if (!obra?.pasta) return null;
  return obra.pasta_base ? juntar(await P.raizClientes(), `${obra.pasta_base}/${obra.pasta}`) : path.join(P.RAIZES.obra, obra.pasta);
}

// Liga cada análise de projeto, cada laudo e cada obra à sua pasta no disco
// (utils/pastasSistema.js). Conteúdo, sempre com nome fixo e sobrescrito a
// cada nova versão:
//   Projetos/<nome do projeto>/
//     Arquivos do projeto/<PDFs recebidos>
//     Relatório de compatibilização.pdf
//     Orçamento P123.pdf
//     Dados da análise.json
//   Laudos/<nome do laudo>/
//     <documentos do padrão da disciplina>.docx / .xlsx
//     Fotos/<id> - <nome>.jpg
//     Orçamento P123.pdf          (só quando o laudo tem orçamento)
//     Dados do laudo.json         (formulário completo — reimportável na tela)
// Versão 2.0 (Fase 2D) — pasta da obra:
//   Obras/<nome da obra>/
//     Projeto/                    (análise NOVA ligada à obra; a 2ª vira "Projeto (A15)")
//     Laudos/<disciplina>/        (laudo NOVO ligado à obra; ex.: Laudos\SPDA)
//     Projetos/<disciplina>/      (versão 2.1: projeto por disciplina; Entrega\ = arquivos da entrega)
//     Propostas/Orçamento P123.pdf
//     Contratos/Contrato CT-2026-0001.pdf
// "Novo" = o item ainda não tinha pasta quando foi ligado à obra: a coluna
// pasta_obra_id grava de qual obra é a pasta. Itens antigos continuam nas
// pastas de sempre (a migração não move arquivos) — a obra só aponta para elas.
// Falha de disco (pasta aberta, rede fora) NUNCA impede salvar no sistema: só
// gera aviso no log; a próxima gravação tenta de novo.

const nomeDoProjeto = (row) => row.nome_projeto || row.cliente_nome
  || (Array.isArray(row.arquivos_analisados) && row.arquivos_analisados[0] && String(row.arquivos_analisados[0].nomeArquivo || row.arquivos_analisados[0].arquivo || '').replace(/\.[^.]+$/, ''))
  || `Projeto ${row.id}`;

// "SPDA — para-raios (NBR 5419:2026)" → "SPDA"; "Elétrica predial (NBR 5410)" → "Elétrica predial"
function nomeCurtoDisciplina(chave) {
  const d = DISCIPLINAS_LAUDO.find(x => x.chave === chave);
  return (d ? d.nome.split(/ — | \(/)[0].trim() : String(chave || 'Laudo').toUpperCase()) || 'Laudo';
}

const SQL_OBRA_PASTA = 'SELECT id, nome, pasta, pasta_base, cliente_id, cliente_nome FROM obras WHERE id = $1';

async function pastaDaObra(obra, client = pool) {
  // a consulta de quem chamou pode não trazer cliente_id/pasta_base
  if (!('pasta_base' in obra) || !('cliente_id' in obra) || !('cliente_nome' in obra)) obra = { ...obra, ...(await client.query(SQL_OBRA_PASTA, [obra.id])).rows[0] };
  // obra antiga, ainda em Arquivos do Sistema\Obras (o script de mudança leva para o cliente)
  if (obra.pasta && !obra.pasta_base) {
    return P.sincronizarPasta(client, { tipo: 'obra', tabela: 'obras', id: obra.id, nome: obra.nome || `Obra ${obra.id}`, pastaAtual: obra.pasta, escopo: { coluna: 'pasta_base', valor: null } });
  }
  // cliente pelo cadastro ou, em obra antiga, pelo nome digitado
  const base = `${await pastaRelDoCliente(await clienteIdDoItem(obra, client), client)}/Obras`;
  const dir = await pastaNaBase(client, { tabela: 'obras', tipo: 'obra', row: obra, base, nome: obra.nome || `Obra ${obra.id}` });
  await fsp.mkdir(path.join(dir, RECEBIDOS), { recursive: true });
  return dir;
}

async function pastaDaObraPorId(obraId, client = pool) {
  const { rows: [obra] } = await client.query(SQL_OBRA_PASTA, [obraId]);
  return obra ? pastaDaObra(obra, client) : null;
}

// Pasta-mãe de um item (análise/laudo) que mora na pasta de uma obra, ou null
// (pasta antiga em Projetos\ / Laudos\). Item que ainda não tem pasta e já está
// ligado a uma obra passa a morar nela.
async function obraDoItem(row, tabela, client) {
  let obraId = row.pasta_obra_id;
  if (!obraId && !row.pasta && row.obra_id) {
    await client.query(`UPDATE ${tabela} SET pasta_obra_id = $1 WHERE id = $2 AND pasta IS NULL AND pasta_obra_id IS NULL`, [row.obra_id, row.id]);
    const { rows: [atual] } = await client.query(`SELECT pasta, pasta_obra_id FROM ${tabela} WHERE id = $1`, [row.id]);
    if (atual) { row.pasta = atual.pasta; row.pasta_obra_id = atual.pasta_obra_id; }
    obraId = row.pasta_obra_id;
  }
  if (!obraId) return null;
  const { rows: [obra] } = await client.query(SQL_OBRA_PASTA, [obraId]);
  return obra || null;
}

// item sem obra que já tem pasta no lugar antigo (Projetos\ / Laudos\ de Arquivos do Sistema)
const noLugarAntigo = (row) => row.pasta && !row.pasta_base;

async function pastaDoProjeto(row, client = pool) {
  const obra = await obraDoItem(row, 'analises_projeto', client);
  if (obra) {
    return P.sincronizarPasta(client, { tipo: 'projeto', tabela: 'analises_projeto', id: row.id, nome: 'Projeto', pastaAtual: row.pasta,
      raiz: await pastaDaObra(obra, client), escopo: { coluna: 'pasta_obra_id', valor: obra.id } });
  }
  if (noLugarAntigo(row)) {
    return P.sincronizarPasta(client, { tipo: 'projeto', tabela: 'analises_projeto', id: row.id, nome: nomeDoProjeto(row), pastaAtual: row.pasta,
      escopo: [{ coluna: 'pasta_obra_id', valor: null }, { coluna: 'pasta_base', valor: null }] });
  }
  // 2.3: sem obra → Clientes\<cliente>\Projetos\<nome>
  const base = `${await pastaRelDoCliente(await clienteIdDoItem(row, client), client)}/Projetos`;
  return pastaNaBase(client, { tabela: 'analises_projeto', tipo: 'projeto', row, base, nome: nomeDoProjeto(row), escopo: [{ coluna: 'pasta_obra_id', valor: null }] });
}

// Versão 2.1: registro de disciplina é projeto ou laudo, cada um na sua
// pasta-mãe — laudo em Laudos\ (Obras\<obra>\Laudos\<disciplina>), projeto em
// Projetos\ (Obras\<obra>\Projetos\<disciplina>). `pasta_raiz` grava onde a
// pasta foi criada; as pastas de antes da 2.1 ficam em 'laudos' (migração
// 2.0-13 — nada é movido).
const RAIZ_REGISTRO = {
  laudos: { tipoPasta: 'laudo', subpastaObra: 'Laudos' },
  projetos: { tipoPasta: 'projeto_disciplina', subpastaObra: 'Projetos' },
};
const raizDoRegistro = (row) => row.pasta_raiz || (row.pasta ? 'laudos' : (row.tipo === 'projeto' ? 'projetos' : 'laudos'));

async function pastaDoLaudo(row, client = pool) {
  const raiz = raizDoRegistro(row);
  if (!row.pasta_raiz) {
    // grava a raiz ANTES de criar a pasta: a pasta nunca muda de lugar depois
    await client.query('UPDATE laudos_projetos SET pasta_raiz = $1 WHERE id = $2 AND pasta_raiz IS NULL', [raiz, row.id]);
    row.pasta_raiz = raiz;
  }
  const { tipoPasta, subpastaObra } = RAIZ_REGISTRO[raiz];
  const mesmaRaiz = { coluna: "COALESCE(pasta_raiz, 'laudos')", valor: raiz };
  const obra = await obraDoItem(row, 'laudos_projetos', client);
  if (obra) {
    return P.sincronizarPasta(client, { tipo: tipoPasta, tabela: 'laudos_projetos', id: row.id, nome: nomeCurtoDisciplina(row.disciplina), pastaAtual: row.pasta,
      raiz: path.join(await pastaDaObra(obra, client), subpastaObra), escopo: [{ coluna: 'pasta_obra_id', valor: obra.id }, mesmaRaiz] });
  }
  const nome = row.titulo || `${raiz === 'projetos' ? 'Projeto' : 'Laudo'} ${row.id}`;
  if (noLugarAntigo(row)) {
    return P.sincronizarPasta(client, { tipo: tipoPasta, tabela: 'laudos_projetos', id: row.id, nome, pastaAtual: row.pasta,
      escopo: [{ coluna: 'pasta_obra_id', valor: null }, mesmaRaiz, { coluna: 'pasta_base', valor: null }] });
  }
  // 2.3: sem obra → Clientes\<cliente>\Projetos|Laudos\<título>
  const base = `${await pastaRelDoCliente(await clienteIdDoItem(row, client), client)}/${subpastaObra}`;
  return pastaNaBase(client, { tabela: 'laudos_projetos', tipo: tipoPasta, row, base, nome, escopo: [{ coluna: 'pasta_obra_id', valor: null }, mesmaRaiz] });
}

// tipo 'laudo' (qualquer registro de laudos_projetos) → pasta-mãe pela raiz do registro
const tipoPastaDe = (tipo, row) => (tipo === 'laudo' ? RAIZ_REGISTRO[raizDoRegistro(row)] : { tipoPasta: tipo, subpastaObra: null });

// Caminho já registrado da pasta (sem criar nada). `row.pasta_obra_dir` = pasta
// da obra (obras.pasta), quando a consulta fez o JOIN; senão consulta.
// Pasta-mãe já registrada de um item (sem criar): dentro da obra, no cliente
// (2.3) ou no lugar antigo. { raiz, obra, noCliente } ou null.
async function maeRegistrada(tipo, row, client = pool) {
  const { tipoPasta, subpastaObra } = tipoPastaDe(tipo, row);
  if (row.pasta_obra_id) {
    const { rows: [obra] } = await client.query('SELECT nome, pasta, pasta_base FROM obras WHERE id = $1', [row.pasta_obra_id]);
    const dirObra = await caminhoDaObra(obra);
    if (!dirObra) return null;
    return { raiz: subpastaObra ? path.join(dirObra, subpastaObra) : dirObra, obra, noCliente: !!obra.pasta_base };
  }
  if (row.pasta_base) return { raiz: juntar(await P.raizClientes(), row.pasta_base), obra: null, noCliente: true };
  return { raiz: P.RAIZES[tipoPasta], obra: null, noCliente: false };
}

async function caminhoRegistrado(tipo, row, client = pool) {
  if (!row?.pasta) return null;
  const mae = await maeRegistrada(tipo, row, client);
  return mae ? path.join(mae.raiz, row.pasta) : null;
}

// Exclusão de análise/laudo/projeto: a pasta vai para _Excluídos (mesmo dentro
// de uma obra). Na pasta dos clientes, para o _Excluídos de lá (não traz do servidor para o PC).
async function excluirPastaDoItem(tipo, row) {
  return seguro(`excluir ${tipo} ${row.id}`, async () => {
    if (!row.pasta) return null;
    const { tipoPasta } = tipoPastaDe(tipo, row);
    const mae = await maeRegistrada(tipo, row);
    if (!mae) return null;
    return P.moverParaExcluidos(tipoPasta, row.pasta, {
      raiz: mae.raiz, rotulo: mae.obra?.nome || null,
      ...(mae.noCliente ? { excluidos: path.join(await P.raizClientes(), '_Excluídos') } : {}),
    });
  });
}

async function seguro(rotulo, fn) {
  try { return await fn(); } catch (e) { console.warn(`Pasta do sistema (${rotulo}): ${e.message}`); return null; }
}

// Análise salva → pasta com o nome atual + "Dados da análise.json"
function sincronizarProjeto(row, arquivosRecebidos = []) {
  return seguro(`análise ${row.id}`, async () => {
    const pasta = await pastaDoProjeto(row);
    for (const a of arquivosRecebidos) await P.gravarArquivo(path.join(pasta, 'Arquivos do projeto'), a.nomeArquivo, a.buffer);
    const { pasta: _p, ...dados } = row;
    await P.gravarArquivo(pasta, 'Dados da análise.json', JSON.stringify(dados, null, 1));
    return pasta;
  });
}

function sincronizarLaudo(row) {
  return seguro(`laudo ${row.id}`, async () => {
    const pasta = await pastaDoLaudo(row);
    // 2.1: projeto (pasta em Projetos\) grava "Dados do projeto.json"; as pastas de antes continuam com o nome antigo
    const nome = raizDoRegistro(row) === 'projetos' ? 'Dados do projeto.json' : 'Dados do laudo.json';
    await P.gravarArquivo(pasta, nome, JSON.stringify(row.dados || {}, null, 1));
    return pasta;
  });
}

// Obra salva → pasta com o nome atual (renomeia quando o nome muda)
function sincronizarObra(obra) {
  return seguro(`obra ${obra.id}`, () => pastaDaObra(obra));
}

// Proposta gerada a partir de análise ou laudo: a cada PDF gerado, a cópia na
// pasta do projeto/laudo é substituída pela versão atual. Proposta ligada a
// uma obra: também em Obras\<obra>\Propostas.
function salvarPdfPropostaNasPastas(proposta, pdf) {
  return seguro(`proposta ${proposta.id}`, async () => {
    const analises = (await pool.query('SELECT * FROM analises_projeto WHERE proposta_id = $1', [proposta.id])).rows;
    const laudos = (await pool.query(`SELECT * FROM laudos_projetos WHERE propostas IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_each_text(propostas) WHERE value = $1::text)`, [proposta.id])).rows;
    const nome = `Orçamento ${proposta.numero}.pdf`;
    for (const a of analises) await P.gravarArquivo(await pastaDoProjeto(a), nome, pdf);
    for (const l of laudos) await P.gravarArquivo(await pastaDoLaudo(l), nome, pdf);
    let naObra = 0;
    if (proposta.obra_id) {
      const dir = await pastaDaObraPorId(proposta.obra_id);
      if (dir) { await P.gravarArquivo(path.join(dir, 'Propostas'), nome, pdf); naObra = 1; }
    } else if (proposta.cliente_id) {
      // 2.3: proposta sem obra → Clientes\<cliente>\Propostas
      await P.gravarArquivo(path.join(await pastaDoCliente(proposta.cliente_id), 'Propostas'), nome, pdf);
      naObra = 1;
    }
    return analises.length + laudos.length + naObra;
  });
}

// Contrato ligado a uma obra: cópia do PDF em Obras\<obra>\Contratos.
function salvarPdfContratoNaObra(contrato, pdf) {
  if (!contrato?.obra_id) return Promise.resolve(null);
  return seguro(`contrato ${contrato.id}`, async () => {
    const dir = await pastaDaObraPorId(contrato.obra_id);
    if (!dir) return null;
    return P.gravarArquivo(path.join(dir, 'Contratos'), `Contrato ${contrato.codigo_registro || contrato.id}.pdf`, pdf);
  });
}

async function resumoPasta(pastaAbs) {
  return { caminho: pastaAbs, arquivos: pastaAbs ? await P.listarArquivos(pastaAbs) : [] };
}

// Só abre o Explorer quando o pedido vem deste PC (quem usa o sistema por
// outro computador não veria a janela abrir no servidor).
// Usa o endereço da conexão, nunca req.ip: com `trust proxy` ligado, req.ip
// vem do cabeçalho X-Forwarded-For, que qualquer um pode forjar.
// Pedido que passou por um proxy/túnel no próprio PC (para o link de aprovação
// na internet) chega de 127.0.0.1 mas não é local: o cabeçalho de
// encaminhamento denuncia — nesse caso não conta como local.
function pedidoLocal(req) {
  const ip = String(req.socket?.remoteAddress || '');
  if (req.headers?.['x-forwarded-for'] || req.headers?.forwarded || req.headers?.['x-real-ip']) return false;
  return /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip);
}

module.exports = {
  pastaDoProjeto, pastaDoLaudo, pastaDaObra, pastaDaObraPorId, caminhoRegistrado, excluirPastaDoItem, nomeCurtoDisciplina,
  sincronizarProjeto, sincronizarLaudo, sincronizarObra, salvarPdfPropostaNasPastas, salvarPdfContratoNaObra,
  resumoPasta, pedidoLocal, seguro,
  pastaDoCliente, pastaRelDoCliente, clienteIdDoItem, caminhoDaObra, RECEBIDOS,
  pastasDoServidor, ligarPastaDoCliente, normalizarNome,
};
