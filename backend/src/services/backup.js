// Backup do banco pelo painel (Integrações): lista os dumps que a tarefa das 02:00
// (scripts/backup-db.ps1) já gerou, diz onde cada um foi copiado e roda o mesmo
// script sob demanda ("Fazer backup agora", só o banco). Só Windows, como o script.
// Restaurar NÃO passa por aqui: apaga o banco em uso, fica em scripts/restaurar-backup.ps1.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PASTA_BACKUPS = path.join(RAIZ, 'backups');
const SCRIPT = path.join(RAIZ, 'scripts', 'backup-db.ps1');
// mesmo padrão do script: BACKUP_DESTINO_REDE no .env, senão o servidor de arquivos da H&M
const REDE_PADRAO = '\\\\MARCIO-SERVER\\Arquivos Gerais 2\\H&M\\Projeto do sistema de orçamentos\\Backups';
// passou disso desde o último dump, a tarefa das 02:00 não rodou (2 h de folga sobre as 24 h)
const LIMITE_ATRASO_HORAS = 26;
const TIMEOUT_EXECUCAO_MS = 10 * 60 * 1000;
const TIMEOUT_CONSULTA_DESTINO_MS = 3000;
const MAX_LISTA = 15;

let emExecucao = null; // { desde, usuarioId }

function configuracao(env = process.env) {
  return {
    banco: env.DB_NAME || 'hm_orcamentos',
    rede: env.BACKUP_DESTINO_REDE || REDE_PADRAO,
    externo: env.BACKUP_DESTINO_EXTERNO ? path.join(env.BACKUP_DESTINO_EXTERNO, 'Banco') : null,
  };
}

// "hm_orcamentos_2026-11-02_02-00.dump"; o âncora evita pegar os dumps de hm_orcamentos_v2_…
const ehDump = (banco, nome) => new RegExp(`^${banco.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}\\.dump$`).test(nome);

// Rede fora do ar não pode travar o painel: sem resposta em 3 s, "não deu para conferir".
async function existeEm(pasta, nome) {
  if (!pasta) return null;
  let timer;
  const limite = new Promise(resolve => { timer = setTimeout(() => resolve(null), TIMEOUT_CONSULTA_DESTINO_MS); });
  try {
    return await Promise.race([
      fs.promises.stat(path.join(pasta, nome)).then(() => true, e => (e.code === 'ENOENT' ? false : null)),
      limite,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Dumps do banco em `pasta`, do mais novo para o mais antigo.
function listarDumps(pasta, banco) {
  let nomes;
  try { nomes = fs.readdirSync(pasta); } catch { return []; }
  return nomes.filter(n => ehDump(banco, n)).map(nome => {
    const st = fs.statSync(path.join(pasta, nome));
    return { nome, tamanho: st.size, em: st.mtime };
  }).sort((a, b) => b.em - a.em);
}

// Situação a partir da lista e da hora: separada para testar sem disco.
function avaliar(dumps, agora = new Date()) {
  const ultimo = dumps[0] || null;
  const horas = ultimo ? (agora - new Date(ultimo.em)) / 3600000 : null;
  return {
    ultimo,
    horasDesdeUltimo: horas == null ? null : Math.round(horas * 10) / 10,
    atrasado: horas == null || horas > LIMITE_ATRASO_HORAS,
  };
}

async function situacao({ pasta = PASTA_BACKUPS, env = process.env, agora = new Date() } = {}) {
  const cfg = configuracao(env);
  const dumps = listarDumps(pasta, cfg.banco);
  const recentes = await Promise.all(dumps.slice(0, MAX_LISTA).map(async d => ({
    ...d,
    copiaRede: await existeEm(cfg.rede, d.nome),
    copiaExterna: await existeEm(cfg.externo, d.nome),
  })));
  return {
    ...avaliar(dumps, agora),
    ultimo: recentes[0] || null,
    banco: cfg.banco,
    totalLocal: dumps.length,
    destinos: { rede: cfg.rede, externo: cfg.externo },
    emExecucao: emExecucao ? { desde: emExecucao.desde } : null,
    agendado: 'todo dia às 02:00',
    backups: recentes,
  };
}

// Linhas "AAAA-MM-DD HH:mm:ss texto" que o script escreve na saída.
function interpretarSaida(texto) {
  const linhas = String(texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const concluida = linhas.find(l => /Backup do banco concluido e conferido:/.test(l));
  return {
    linhas,
    avisos: linhas.filter(l => /\b(AVISO|ERRO)\b/.test(l)),
    arquivo: concluida ? path.basename(concluida.split('conferido:')[1].trim().replace(/\s*\(\d+ KB\)\s*$/, '')) : null,
  };
}

// Roda o script só com o banco. Uma de cada vez: o segundo clique recebe 409.
// `comando`/`argumentos` existem para o teste trocar o PowerShell por um script de mentira.
function executar({ usuarioId = null, comando = 'powershell.exe', argumentos = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-SomenteBanco'] } = {}) {
  if (process.platform !== 'win32' && comando === 'powershell.exe') {
    const e = new Error('O backup pelo painel só funciona no servidor Windows.'); e.status = 501;
    return Promise.reject(e);
  }
  if (emExecucao) {
    const e = new Error('Já existe um backup em andamento.'); e.status = 409;
    return Promise.reject(e);
  }
  emExecucao = { desde: new Date().toISOString(), usuarioId };
  return new Promise((resolve) => {
    let saida = '';
    let encerrado = false;
    const filho = spawn(comando, argumentos, { windowsHide: true });
    const terminar = (resultado) => {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(timer);
      emExecucao = null;
      resolve(resultado);
    };
    const timer = setTimeout(() => {
      filho.kill();
      terminar({ ok: false, codigo: null, erro: 'O backup passou de 10 minutos e foi interrompido.', ...interpretarSaida(saida) });
    }, TIMEOUT_EXECUCAO_MS);
    filho.stdout.on('data', d => { saida += d.toString('utf8'); });
    filho.stderr.on('data', d => { saida += d.toString('utf8'); });
    filho.on('error', err => terminar({ ok: false, codigo: null, erro: `Não consegui iniciar o script: ${err.message}`, ...interpretarSaida(saida) }));
    filho.on('close', codigo => {
      const r = interpretarSaida(saida);
      const ok = codigo === 0 && !!r.arquivo;
      terminar({ ok, codigo, erro: ok ? null : (r.avisos.find(l => /ERRO/.test(l)) || `O script terminou com código ${codigo}.`), ...r });
    });
  });
}

module.exports = { situacao, executar, avaliar, listarDumps, ehDump, interpretarSaida, configuracao, LIMITE_ATRASO_HORAS };
