// Rotinas automáticas do sistema num lugar só (versão 2.0): definição, agenda
// (06:00 e 18:00, hora local do PC), execução manual e registro uniforme de cada
// execução em rotinas_execucoes (migração models/migracoes/2.0-03-rotinas.js).
//
//   notas-email          notas fiscais (XML) e orçamentos anexos que chegam por e-mail
//   pix-email            Pix recebidos/enviados (e-mails do banco) → Financeiro
//   fornecedores-pastas  orçamentos de fornecedores salvos nas pastas
//
// Antes cada rotina tinha o próprio agendamento em server.js e o próprio
// botão "Verificar agora" sem registro comum; agora horário e botão passam pelo
// mesmo executarRotina(), que grava quando rodou, com que resultado, quantos
// itens e o erro. A lógica de cada rotina continua no próprio serviço (com a
// trava de utils/travaJob.js contra duas execuções ao mesmo tempo).
// Nada aqui emite nota fiscal nem faz cobrança (fora da 2.0).
const HORARIOS = ['06:00', '18:00'];
const MAX_AVISOS = 20;
const DIAS_HISTORICO = 365;
const HORAS_INTERROMPIDA = 6;

// Instância de teste/homologação (ROTINAS_AUTOMATICAS=desligadas): não lê a
// caixa de e-mail nem as pastas de fornecedores da produção pelo horário.
function rotinasAutomaticasLigadas() {
  return !/^(desligad|off|nao|não|0|false)/i.test(process.env.ROTINAS_AUTOMATICAS || '');
}

// Definições reais. Os serviços são carregados só ao executar (os testes
// criam rotinas falsas sem abrir IMAP nem pastas).
function definicoesPadrao() {
  const emailConfigurado = () => require('../utils/emailClient').credenciaisConfiguradas();
  const quando = `às ${HORARIOS.join(' e às ')}`;
  return {
    'notas-email': {
      nome: 'Notas fiscais e orçamentos por e-mail',
      descricao: 'Lê a caixa de e-mail e importa as notas fiscais (XML) e os orçamentos anexos para o catálogo de materiais.',
      atrasoSegundos: 0,
      configurada: emailConfigurado,
      motivoNaoConfigurada: 'e-mail não configurado (EMAIL_IMAP_* no .env)',
      logNaoConfigurada: 'Importação automática de notas por e-mail não configurada (veja EMAIL_IMAP_* no .env)',
      logAgendada: () => `Importação automática de notas por e-mail ativa (${quando})`,
      executar: () => require('./notaFiscalEmailService').verificarCaixaDeEntrada(),
      itens: (r) => r.emailsProcessados,
      texto: (r) => `${r.emailsProcessados || 0} de ${r.emailsEncontrados || 0} e-mail(s) processado(s) — ${r.notasImportadas || 0} nota(s), ${r.orcamentosImportados || 0} orçamento(s); ${r.materiaisCriados || 0} material(is) criado(s), ${r.materiaisAtualizados || 0} atualizado(s)`,
      logResultado: (r) => r.emailsProcessados > 0 && `E-mails verificados: ${r.emailsProcessados}/${r.emailsEncontrados} — ${r.materiaisCriados} materiais criados, ${r.materiaisAtualizados} atualizados`,
      prefixoAviso: 'Aviso:',
      logErro: 'Erro na verificação automática de e-mail:',
      ultimoRegistroSql: `SELECT GREATEST((SELECT MAX(processado_em) FROM notas_processadas),
        (SELECT MAX(processado_em) FROM emails_processados WHERE tipo = 'orcamento')) AS em`,
    },
    'pix-email': {
      nome: 'Pix por e-mail (Financeiro)',
      descricao: 'Lê os e-mails de Pix do banco e lança os recebimentos e pagamentos no Financeiro.',
      atrasoSegundos: 30,
      configurada: emailConfigurado,
      motivoNaoConfigurada: 'e-mail não configurado (EMAIL_IMAP_* no .env)',
      logAgendada: () => `Controle financeiro de Pix por e-mail ativo (${quando})`,
      executar: () => require('./financeiroEmailService').verificarPixNaCaixaDeEntrada(),
      itens: (r) => r.movimentosImportados,
      texto: (r) => `${r.movimentosImportados || 0} movimento(s) importado(s) de ${r.emailsEncontrados || 0} e-mail(s)`,
      logResultado: (r) => r.movimentosImportados > 0 && `Pix verificados: ${r.movimentosImportados}/${r.emailsEncontrados} movimentos importados`,
      prefixoAviso: 'Aviso (Pix):',
      logErro: 'Erro na verificação automática de Pix:',
      ultimoRegistroSql: "SELECT MAX(criado_em) AS em FROM financeiro_movimentos WHERE origem = 'email'",
    },
    'fornecedores-pastas': {
      nome: 'Orçamentos de fornecedores nas pastas',
      descricao: 'Lê os orçamentos/cotações de fornecedores salvos nas pastas e cadastra os materiais novos.',
      atrasoSegundos: 15,
      configurada: () => true,
      pastas: () => require('./cotacaoFornecedorService').PASTAS_FORNECEDORES,
      logAgendada: () => `Leitura automática de orçamentos de fornecedores ativa (${quando}) — pastas: ${require('./cotacaoFornecedorService').PASTAS_FORNECEDORES.join(' | ')}`,
      executar: () => require('./cotacaoFornecedorService').verificarPastaFornecedores(),
      itens: (r) => r.arquivosProcessados,
      texto: (r) => `${r.arquivosProcessados || 0} de ${r.arquivosEncontrados || 0} arquivo(s) processado(s) — ${r.materiaisCriados || 0} material(is) criado(s), ${r.materiaisAtualizados || 0} atualizado(s)`,
      logResultado: (r) => r.arquivosProcessados > 0 && `Orçamentos de fornecedores verificados: ${r.arquivosProcessados}/${r.arquivosEncontrados} arquivos — ${r.materiaisCriados} materiais criados, ${r.materiaisAtualizados} atualizados`,
      prefixoAviso: 'Aviso (orçamentos de fornecedores):',
      logErro: 'Erro na verificação da pasta de orçamentos de fornecedores:',
      ultimoRegistroSql: 'SELECT MAX(processado_em) AS em FROM arquivos_fornecedores_processados',
    },
  };
}

// Milissegundos até o próximo horário, somando `atrasoSegundos` (escalona as
// rotinas para não abrirem duas conexões IMAP no mesmo segundo).
function msAteProximoHorario(agora = new Date(), atrasoSegundos = 0, horarios = HORARIOS) {
  return proximosHorarios(agora, atrasoSegundos, 1, horarios)[0] - agora;
}

// Próximos `n` horários (Date). Folga de 1 s: se o timer disparar uns
// milissegundos antes do horário, o próximo cálculo não cai no mesmo horário.
function proximosHorarios(agora = new Date(), atrasoSegundos = 0, n = 2, horarios = HORARIOS) {
  const candidatos = [];
  for (let dias = 0; dias <= Math.ceil(n / Math.max(horarios.length, 1)) + 1; dias++) {
    for (const h of horarios) {
      const [hora, minuto] = h.split(':').map(Number);
      const alvo = new Date(agora);
      alvo.setDate(alvo.getDate() + dias);
      alvo.setHours(hora, minuto, atrasoSegundos, 0);
      if (alvo - agora > 1000) candidatos.push(alvo);
    }
  }
  return candidatos.sort((a, b) => a - b).slice(0, n);
}

// Resumo gravado: contagens (números/booleanos do topo), texto, avisos (até 20)
// e a classificação de materiais que roda depois — sem listas grandes.
function compactar(def, resumo) {
  if (!resumo || typeof resumo !== 'object') return null;
  const contagens = {};
  for (const [k, v] of Object.entries(resumo)) if (typeof v === 'number' || typeof v === 'boolean') contagens[k] = v;
  const avisos = Array.isArray(resumo.avisos) ? resumo.avisos.slice(0, MAX_AVISOS).map(a => String(a).slice(0, 300)) : [];
  let texto = null;
  try { texto = def.texto ? def.texto(resumo) : null; } catch { /* sem texto */ }
  if (resumo.ignorado) texto = avisos[0] || 'rodada ignorada (já em execução em outra instância)';
  return {
    texto, contagens, avisos,
    totalAvisos: Array.isArray(resumo.avisos) ? resumo.avisos.length : 0,
    ...(resumo.classificacao ? { classificacao: resumo.classificacao } : {}),
  };
}

function statusDoResumo(resumo) {
  if (resumo?.ignorado) return 'ignorada';
  if (Array.isArray(resumo?.avisos) && resumo.avisos.length) return 'avisos';
  return 'ok';
}

// Fábrica (os testes injetam rotinas falsas e um banco falso).
function criarRotinas({ definicoes = definicoesPadrao, db = null, agendar = setTimeout, log = console } = {}) {
  const banco = () => db || require('../config/database');
  const defs = typeof definicoes === 'function' ? definicoes : () => definicoes;
  const emCurso = new Map();      // chave → { promessa, desde, origem }
  const agendadas = new Map();    // chave → próxima execução (Date)

  function definicao(chave) {
    const d = Object.prototype.hasOwnProperty.call(defs(), chave) ? defs()[chave] : null;
    if (!d) throw Object.assign(new Error('Rotina desconhecida'), { status: 404 });
    return d;
  }

  // Executa a rotina e registra. Quem chega durante uma execução recebe o
  // resultado dela (sem segunda linha no registro). Falha do registro nunca
  // impede a rotina de rodar.
  function executarRotina(chave, { origem = 'manual', usuarioId = null } = {}) {
    const def = definicao(chave);
    if (emCurso.has(chave)) return emCurso.get(chave).promessa;
    const promessa = (async () => {
      let id = null;
      try {
        const r = await banco().query(
          `INSERT INTO rotinas_execucoes (chave, origem, usuario_id, status) VALUES ($1, $2, $3, 'em_andamento') RETURNING id`,
          [chave, origem === 'agendada' ? 'agendada' : 'manual', usuarioId || null]
        );
        id = r.rows[0]?.id ?? null;
      } catch (e) {
        log.warn(`Registro de rotinas (${chave}): não gravou o início — ${e.message}`);
      }
      let resumo, erro;
      try { resumo = await def.executar(); } catch (e) { erro = e; }
      if (id != null) {
        try {
          await banco().query(
            `UPDATE rotinas_execucoes SET status = $2, itens = $3, resumo = $4, erro = $5, terminado_em = NOW() WHERE id = $1`,
            [id, erro ? 'erro' : statusDoResumo(resumo), erro ? null : (Number(def.itens?.(resumo)) || 0),
              erro ? null : JSON.stringify(compactar(def, resumo)), erro ? String(erro.message || erro).slice(0, 1000) : null]
          );
          await banco().query(`DELETE FROM rotinas_execucoes WHERE chave = $1 AND iniciado_em < NOW() - INTERVAL '${DIAS_HISTORICO} days'`, [chave]);
        } catch (e) {
          log.warn(`Registro de rotinas (${chave}): não gravou o fim — ${e.message}`);
        }
      }
      if (erro) throw erro;
      return resumo;
    })().finally(() => emCurso.delete(chave));
    emCurso.set(chave, { promessa, desde: new Date(), origem });
    return promessa;
  }

  // Agenda nos horários fixos (setTimeout encadeado: recalcula o próximo
  // horário a cada execução, sem acumular desvio).
  function agendarRotina(chave) {
    const def = definicao(chave);
    const proxima = () => {
      const ms = msAteProximoHorario(new Date(), def.atrasoSegundos || 0);
      agendadas.set(chave, new Date(Date.now() + ms));
      agendar(async () => {
        try {
          const resumo = await executarRotina(chave, { origem: 'agendada' });
          const msg = def.logResultado?.(resumo);
          if (msg) log.log(msg);
          (resumo?.avisos || []).forEach(a => log.warn(def.prefixoAviso || 'Aviso:', a));
        } catch (err) {
          log.error(def.logErro || `Erro na rotina ${chave}:`, err.message);
        }
        proxima();
      }, ms);
    };
    proxima();
  }

  // Chamado por server.js quando a API sobe.
  function agendarRotinas() {
    if (!rotinasAutomaticasLigadas()) {
      log.log('Rotinas automáticas desligadas (ROTINAS_AUTOMATICAS) — e-mail de notas, Pix e cotações não rodam nesta instância');
      return;
    }
    for (const [chave, def] of Object.entries(defs())) {
      if (!def.configurada()) {
        if (def.logNaoConfigurada) log.log(def.logNaoConfigurada);
        continue;
      }
      agendarRotina(chave);
      if (def.logAgendada) log.log(def.logAgendada());
    }
  }

  function formatarExecucao(r) {
    if (!r) return null;
    let status = r.status;
    if (status === 'em_andamento' && !emCurso.has(r.chave) && Date.now() - new Date(r.iniciado_em).getTime() > HORAS_INTERROMPIDA * 3600000) status = 'interrompida';
    return {
      id: r.id, origem: r.origem, status, itens: r.itens, erro: r.erro,
      iniciadoEm: r.iniciado_em, terminadoEm: r.terminado_em,
      duracaoSegundos: r.terminado_em ? Math.round((new Date(r.terminado_em) - new Date(r.iniciado_em)) / 1000) : null,
      usuario: r.usuario_nome || null,
      texto: r.resumo?.texto || null, avisos: r.resumo?.avisos || [], totalAvisos: r.resumo?.totalAvisos || 0,
      contagens: r.resumo?.contagens || {},
    };
  }

  // Visão única para o painel de Integrações.
  async function statusRotinas({ historico = 10 } = {}) {
    const ligadas = rotinasAutomaticasLigadas();
    const lista = Object.entries(defs());
    let linhas = [];
    try {
      const r = await banco().query(
        `SELECT * FROM (
           SELECT e.*, u.nome AS usuario_nome, ROW_NUMBER() OVER (PARTITION BY e.chave ORDER BY e.iniciado_em DESC, e.id DESC) AS n
           FROM rotinas_execucoes e LEFT JOIN usuarios u ON u.id = e.usuario_id
           WHERE e.chave = ANY($1)
         ) t WHERE n <= $2 ORDER BY chave, n`,
        [lista.map(([c]) => c), Math.max(1, Math.min(50, historico))]
      );
      linhas = r.rows;
    } catch (e) {
      log.warn(`Registro de rotinas: consulta falhou — ${e.message}`);
    }
    const rotinas = [];
    for (const [chave, def] of lista) {
      let configurada = false;
      try { configurada = !!def.configurada(); } catch { /* não configurada */ }
      const agendada = agendadas.has(chave);
      const motivo = !ligadas ? 'Rotinas automáticas desligadas nesta instância (ROTINAS_AUTOMATICAS)'
        : !configurada ? (def.motivoNaoConfigurada || 'não configurada')
        : !agendada ? 'não agendada nesta instância' : null;
      let ultimoRegistroEm = null;
      if (def.ultimoRegistroSql) {
        try { ultimoRegistroEm = (await banco().query(def.ultimoRegistroSql)).rows[0]?.em || null; } catch { /* tabela ausente */ }
      }
      const execucoes = linhas.filter(l => l.chave === chave).map(formatarExecucao);
      const andamento = emCurso.get(chave);
      let pastas;
      try { pastas = def.pastas?.(); } catch { pastas = undefined; }
      rotinas.push({
        chave, nome: def.nome, descricao: def.descricao,
        ativa: ligadas && configurada && agendada, configurada, motivoInativa: motivo,
        horarios: HORARIOS,
        proximasExecucoes: agendada ? proximosHorarios(new Date(), def.atrasoSegundos || 0, 2).map(d => d.toISOString()) : [],
        emExecucao: andamento ? { desde: andamento.desde.toISOString(), origem: andamento.origem } : null,
        ultimaExecucao: execucoes[0] || null,
        ultimaComSucesso: execucoes.find(e => e.status === 'ok' || e.status === 'avisos') || null,
        historico: execucoes,
        ultimoRegistroEm,
        ...(pastas ? { pastas } : {}),
      });
    }
    return { rotinasAutomaticas: { ligadas, horarios: HORARIOS }, rotinas };
  }

  return { executarRotina, agendarRotinas, statusRotinas, chaves: () => Object.keys(defs()), existe: (c) => Object.prototype.hasOwnProperty.call(defs(), c) };
}

const padrao = criarRotinas();

module.exports = { ...padrao, criarRotinas, rotinasAutomaticasLigadas, proximosHorarios, msAteProximoHorario, compactar, HORARIOS };
