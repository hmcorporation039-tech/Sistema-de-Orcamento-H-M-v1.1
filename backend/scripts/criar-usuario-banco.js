// Cria o usuário de aplicação do banco (hm_app, SEM superusuário) e troca o
// backend para ele. Hoje o sistema conecta como "postgres" (superusuário): uma
// falha de injeção de SQL ou um vazamento do .env daria controle total do
// PostgreSQL — inclusive ler arquivos do PC e executar programas pelo banco.
// Com hm_app, o estrago fica limitado ao banco do sistema.
//
// Uso (uma vez, no PC do sistema):   cd backend   e   node scripts/criar-usuario-banco.js
//   1. copia o .env atual para C:\HM-Engenharia\Backups\backend.env.antes-hm_app-<data>
//   2. cria/atualiza o papel hm_app com senha aleatória (nunca exibida)
//   3. passa a posse do banco, do schema e de tabelas/sequências/funções para hm_app
//      (as migrações do schema.js — ALTER TABLE, CREATE INDEX — exigem ser dono)
//   4. testa a conexão como hm_app; só então grava DB_USER/DB_PASS no .env
// Depois: reiniciar-backend.bat. Para voltar atrás: restaure a cópia do .env.
// Pode ser rodado de novo (gera nova senha e regrava o .env).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ENV = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: ENV });

async function main() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
  if (DB_USER === 'hm_app') {
    console.log('O .env já usa hm_app. Para trocar a senha, volte DB_USER/DB_PASS para o superusuário e rode de novo.');
    return;
  }
  const copia = path.join('C:\\HM-Engenharia\\Backups', `backend.env.antes-hm_app-${new Date().toISOString().slice(0, 10)}`);
  fs.copyFileSync(ENV, copia);
  console.log(`Cópia do .env: ${copia}`);

  const senha = crypto.randomBytes(24).toString('base64url');
  const admin = new Client({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME });
  await admin.connect();
  try {
    const existe = (await admin.query("SELECT 1 FROM pg_roles WHERE rolname = 'hm_app'")).rowCount;
    await admin.query(`${existe ? 'ALTER' : 'CREATE'} ROLE hm_app LOGIN NOSUPERUSER NOCREATEROLE CREATEDB PASSWORD ${admin.escapeLiteral(senha)}`);
    await admin.query('BEGIN');
    await admin.query(`ALTER DATABASE ${admin.escapeIdentifier(DB_NAME)} OWNER TO hm_app`);
    await admin.query('ALTER SCHEMA public OWNER TO hm_app');
    const objetos = await admin.query(`
      SELECT 'TABLE' AS tipo, quote_ident(tablename) AS nome FROM pg_tables WHERE schemaname = 'public'
      UNION ALL SELECT 'SEQUENCE', quote_ident(sequencename) FROM pg_sequences WHERE schemaname = 'public'
      UNION ALL SELECT 'VIEW', quote_ident(viewname) FROM pg_views WHERE schemaname = 'public'
      UNION ALL SELECT 'FUNCTION', p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'`);
    for (const o of objetos.rows) {
      // sequência de coluna SERIAL acompanha a tabela e recusa troca isolada: ignora
      await admin.query('SAVEPOINT s');
      try {
        await admin.query(`ALTER ${o.tipo} public.${o.nome} OWNER TO hm_app`);
        await admin.query('RELEASE SAVEPOINT s');
      } catch (e) {
        await admin.query('ROLLBACK TO SAVEPOINT s');
        if (!/owned by|linked to/i.test(e.message)) console.warn(`  aviso: ${o.tipo} ${o.nome}: ${e.message}`);
      }
    }
    await admin.query('COMMIT');
    const resto = await admin.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
                                      JOIN pg_roles r ON r.oid = c.relowner WHERE s.nspname = 'public' AND r.rolname <> 'hm_app'`);
    console.log(`Papel hm_app ${existe ? 'atualizado' : 'criado'}; objetos de outro dono restantes: ${resto.rows[0].n}`);
  } catch (e) {
    await admin.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await admin.end();
  }

  // testa como hm_app antes de mexer no .env
  const app = new Client({ host: DB_HOST, port: DB_PORT, user: 'hm_app', password: senha, database: DB_NAME });
  await app.connect();
  const t = await app.query('SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS super, (SELECT count(*) FROM propostas)::int AS propostas');
  await app.query('CREATE TEMP TABLE _teste_hm_app (x int)');
  await app.end();
  console.log(`Conexão como ${t.rows[0].current_user} OK (superusuário: ${t.rows[0].super ? 'SIM' : 'não'}; ${t.rows[0].propostas} propostas visíveis)`);

  let texto = fs.readFileSync(ENV, 'utf8');
  const definir = (chave, valor) => {
    const linha = `${chave}=${valor}`;
    texto = new RegExp(`^${chave}=.*$`, 'm').test(texto) ? texto.replace(new RegExp(`^${chave}=.*$`, 'm'), () => linha) : `${texto.trimEnd()}\n${linha}\n`;
  };
  definir('DB_USER', 'hm_app');
  definir('DB_PASS', senha);
  fs.writeFileSync(ENV, texto);
  console.log('.env atualizado (DB_USER=hm_app). Agora rode reiniciar-backend.bat e confira http://localhost:3001/health');
}

main().catch((e) => { console.error('ERRO — nada foi gravado no .env:', e.message); process.exit(1); });
