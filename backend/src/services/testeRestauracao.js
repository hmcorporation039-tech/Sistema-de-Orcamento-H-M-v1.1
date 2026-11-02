// Teste de restauração do backup (sugestão do plano, 02/11/2026): um backup que ninguém restaura é só uma esperança.
// Uma vez por mês (registrar-teste-restauracao.bat → scripts/testar-restauracao.js) o sistema pega o dump mais novo, de
// preferência o da cópia FORA do prédio (é ela que salva numa catástrofe), restaura num banco temporário, compara a
// contagem de linhas com o banco em uso e apaga o temporário. O resultado vai para logs/restauracao-teste.json (o painel
// de Integrações mostra) e por e-mail. O banco em uso só é LIDO; o único que se cria e se apaga é BANCO_TESTE.
// A decisão (avaliarContagens, escolherDump) é pura, para testar sem Postgres.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const backup = require('./backup');

const BANCO_TESTE = 'hm_teste_restauracao';
const ARQUIVO_RESULTADO = path.join(__dirname, '..', '..', 'logs', 'restauracao-teste.json');
// tabelas sem as quais o sistema não vive: precisam voltar quase inteiras
const ESSENCIAIS = ['usuarios', 'clientes', 'materiais', 'propostas', 'proposta_itens', 'notas_fiscais'];
// passou disso desde o último teste, a tarefa mensal não rodou (31 dias + folga)
const LIMITE_ATRASO_DIAS = 40;
const TIMEOUT_RESTAURACAO_MS = 15 * 60 * 1000;

// restaurado e vivo: { tabela: nLinhas }. O banco em uso pode ter crescido desde o dump, então a regra é
// "voltou pelo menos `proporcao` do que há hoje" (uma tabela só com poucas linhas não entra na régua).
function avaliarContagens(restaurado, vivo, { essenciais = ESSENCIAIS, minimo = 10, proporcao = 0.8 } = {}) {
  const problemas = [];
  const avisos = [];
  const res = restaurado || {};
  const liv = vivo || {};
  if (!Object.keys(res).length) return { ok: false, problemas: ['o banco restaurado não tem nenhuma tabela'], avisos };
  for (const t of essenciais) {
    if (!(t in liv)) continue; // o banco em uso nem tem a tabela (esquema mais antigo)
    if (!(t in res)) { problemas.push(`a tabela ${t} não veio no backup`); continue; }
    if (liv[t] >= minimo && res[t] < liv[t] * proporcao) {
      problemas.push(`${t}: o backup tem ${res[t]} linhas e o banco em uso ${liv[t]}`);
    }
  }
  for (const t of Object.keys(liv)) if (!(t in res) && !essenciais.includes(t)) avisos.push(`${t} foi criada depois deste backup`);
  return { ok: problemas.length === 0, problemas, avisos };
}

// O dump a testar: o mais novo da cópia fora do prédio; sem ela (ou vazia), o mais novo da pasta local.
function escolherDump({ banco, pastaLocal, pastaExterna = null }) {
  for (const [origem, pasta] of [['fora do prédio', pastaExterna], ['local', pastaLocal]]) {
    if (!pasta) continue;
    const d = backup.listarDumps(pasta, banco)[0];
    if (d) return { arquivo: path.join(pasta, d.nome), nome: d.nome, origem, em: d.em, tamanho: d.tamanho };
  }
  return null;
}

function atrasado(resultado, agora = new Date()) {
  if (!resultado || !resultado.em) return true;
  return (agora - new Date(resultado.em)) / 86400000 > LIMITE_ATRASO_DIAS;
}

function lerResultado(arquivo = ARQUIVO_RESULTADO) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return null; }
}

function gravarResultado(r, arquivo = ARQUIVO_RESULTADO) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(r, null, 2));
}

function mensagem(r) {
  const quando = new Date(r.em).toLocaleString('pt-BR');
  if (r.ok) {
    return {
      assunto: 'Teste de restauração do backup: OK',
      texto: `O backup ${r.arquivo} (${r.origem}) foi restaurado num banco temporário em ${r.duracaoS} s e conferido em ${quando}.\n${r.tabelas} tabelas restauradas; as tabelas essenciais voltaram completas.${r.avisos?.length ? `\nObservações: ${r.avisos.join('; ')}.` : ''}\n\nO banco temporário já foi apagado; o banco em uso não foi tocado.`,
    };
  }
  return {
    assunto: 'ALERTA: o backup NÃO restaurou direito',
    texto: `Em ${quando} tentei restaurar ${r.arquivo || '(nenhum backup encontrado)'} e algo falhou:\n- ${(r.problemas || ['erro desconhecido']).join('\n- ')}\n\nO que fazer: rode C:\\HM-Engenharia\\hm-eng\\backend\\scripts\\backup-db.ps1 para gerar um backup novo e confira o backend\\logs\\backup.log. Enquanto isso, não confie nesta cópia.`,
  };
}

function rodar(comando, argumentos, { env = process.env, timeoutMs = TIMEOUT_RESTAURACAO_MS } = {}) {
  return new Promise((resolve) => {
    let saida = '';
    const filho = spawn(comando, argumentos, { env, windowsHide: true });
    const timer = setTimeout(() => { filho.kill(); resolve({ codigo: null, saida: saida + '\n(passou do tempo e foi interrompido)' }); }, timeoutMs);
    filho.stdout.on('data', d => { saida += d.toString('utf8'); });
    filho.stderr.on('data', d => { saida += d.toString('utf8'); });
    filho.on('error', e => { clearTimeout(timer); resolve({ codigo: null, saida: e.message }); });
    filho.on('close', codigo => { clearTimeout(timer); resolve({ codigo, saida }); });
  });
}

function achar(programa) {
  const raiz = 'C:\\Program Files\\PostgreSQL';
  try {
    const versoes = fs.readdirSync(raiz).sort().reverse();
    for (const v of versoes) {
      const p = path.join(raiz, v, 'bin', programa);
      if (fs.existsSync(p)) return p;
    }
  } catch { /* sem a pasta do Postgres */ }
  return programa; // tenta o PATH
}

async function contar(client) {
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  const contagens = {};
  for (const { tablename } of rows) {
    const r = await client.query(`SELECT count(*)::int AS n FROM "${tablename.replace(/"/g, '""')}"`);
    contagens[tablename] = r.rows[0].n;
  }
  return contagens;
}

// Restaura, confere e apaga. `dump` vem de escolherDump. Nunca lança: o resultado sempre diz ok ou o que deu errado.
async function testar({ env = process.env, dump, conectar }) {
  const inicio = Date.now();
  const base = { em: new Date().toISOString(), arquivo: dump ? dump.nome : null, origem: dump ? dump.origem : null };
  const falha = (problemas) => ({ ...base, ok: false, problemas, avisos: [], tabelas: 0, duracaoS: Math.round((Date.now() - inicio) / 1000) });
  const banco = env.DB_NAME || 'hm_orcamentos';
  if (banco === BANCO_TESTE) return falha(['o banco em uso tem o mesmo nome do banco de teste; nada foi feito']);
  if (!dump) return falha(['nenhum backup encontrado (nem fora do prédio nem na pasta local)']);

  const admin = await conectar('postgres');
  let vivo;
  let restaurado;
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${BANCO_TESTE} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${BANCO_TESTE}`);
  } catch (e) {
    await admin.end().catch(() => {});
    return falha([`não consegui criar o banco temporário: ${e.message}`]);
  }
  try {
    const r = await rodar(achar('pg_restore.exe'), [
      '-h', env.DB_HOST || 'localhost', '-p', String(env.DB_PORT || 5432), '-U', env.DB_USER || 'postgres',
      '-d', BANCO_TESTE, '--no-owner', '--no-privileges', dump.arquivo,
    ], { env: { ...process.env, PGPASSWORD: env.DB_PASS || '' } });
    if (r.codigo !== 0) {
      const fim = r.saida.trim().split(/\r?\n/).slice(-3).join(' | ');
      return falha([`o pg_restore falhou (código ${r.codigo}): ${fim}`]);
    }
    const doTeste = await conectar(BANCO_TESTE);
    const doUso = await conectar(banco);
    try { restaurado = await contar(doTeste); vivo = await contar(doUso); } finally {
      await doTeste.end().catch(() => {});
      await doUso.end().catch(() => {});
    }
  } catch (e) {
    return falha([`erro durante o teste: ${e.message}`]);
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS ${BANCO_TESTE} WITH (FORCE)`).catch(() => {});
    await admin.end().catch(() => {});
  }
  const v = avaliarContagens(restaurado, vivo);
  return { ...base, ...v, tabelas: Object.keys(restaurado).length, duracaoS: Math.round((Date.now() - inicio) / 1000) };
}

module.exports = { avaliarContagens, escolherDump, atrasado, lerResultado, gravarResultado, mensagem, testar, BANCO_TESTE, ESSENCIAIS, LIMITE_ATRASO_DIAS, ARQUIVO_RESULTADO };
