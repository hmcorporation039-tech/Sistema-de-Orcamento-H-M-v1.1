// Catálogo de componentes de quadros por fabricante (pedido do usuário em
// 29/10/2026: "informar quais os fabricantes dos componentes, para que o
// sistema busque medidas oficiais de cada componente, para melhor organização
// dentro dos quadros e aproveitamento do espaço interno").
//
// Duas fontes, mesmo formato de registro (contrato da skill de quadros):
//   1. skills/quadros/dados/catalogo-componentes.json — embutido na skill, só
//      leitura, só datasheets oficiais conferidos (origem 'catalogo_hm');
//   2. tabela componentes_quadro (migração 2.0-20) — cadastrado na tela
//      (origem 'usuario') ou achado pela IA no site do fabricante (origem
//      'pesquisa_ia', sempre "a conferir" até alguém aprovar).
// O banco SOBREPÕE o JSON pelo par (fabricante, referência).
//
// Antes de a skill calcular um projeto de quadros, o backend põe em
// dados.catalogo_componentes os registros do banco dos fabricantes escolhidos
// no formulário (controllers/laudos/comum.js → injetarNosDados). Sem
// fabricante escolhido ou com a tabela vazia, nada muda.
//
// A IA (services/ia.js, Claude Max primeiro) só pode trazer medida do
// documento do PRÓPRIO fabricante: link fora do domínio dele ou medida
// faltando = resultado recusado, nada é gravado. Nunca inventar.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const ia = require('./ia');
const { RAIZ_SKILLS } = require('../config/caminhos');
const { semAcento } = require('../utils/texto');
const { ErroHttp } = require('../utils/erros');
const { registrarAuditoria } = require('./auditoria');

const ARQUIVO_CATALOGO = path.join(RAIZ_SKILLS, 'quadros', 'dados', 'catalogo-componentes.json');

// ── Vocabulário do contrato ──────────────────────────────────────────────────

const TIPOS = {
  disjuntor_din: 'Disjuntor DIN (minidisjuntor)',
  dr: 'Interruptor DR',
  ddr: 'Disjuntor DR (DDR)',
  dps: 'DPS',
  disjuntor_caixa_moldada: 'Disjuntor em caixa moldada',
  seccionadora: 'Seccionadora',
  fusivel_base: 'Base de fusível',
  contator: 'Contator',
  disjuntor_motor: 'Disjuntor-motor',
  rele_sobrecarga: 'Relé de sobrecarga',
  soft_starter: 'Soft-starter',
  inversor: 'Inversor de frequência',
  fonte_24v: 'Fonte 24 Vcc',
  clp_cpu: 'CLP (CPU)',
  clp_modulo: 'Módulo de CLP (E/S)',
  rele_interface: 'Relé de interface',
  rele_seguranca: 'Relé de segurança',
  rele_tempo: 'Relé de tempo',
  switch: 'Switch',
  ihm: 'IHM',
  multimedidor: 'Multimedidor',
  borne: 'Borne',
  canaleta: 'Canaleta',
  trilho_din: 'Trilho DIN',
  involucro: 'Invólucro (quadro/caixa)',
  isolador_barramento: 'Isolador de barramento',
  pente: 'Barramento pente',
  ventilador: 'Ventilador',
  termostato: 'Termostato',
  sinaleiro: 'Sinaleiro',
  botao: 'Botão',
  comutador: 'Comutador',
};

// Nomes canônicos (contrato) e os domínios oficiais de cada fabricante. O link
// da medida achada pela IA precisa estar num destes domínios (ou subdomínio).
const DOMINIOS_FABRICANTE = {
  ABB: ['abb.com', 'abb.com.br'],
  Altus: ['altus.com.br'],
  Cemar: ['cemar.com.br', 'cemarlegrand.com.br', 'legrand.com.br'],
  Conexel: ['conexel.com.br'],
  Delta: ['deltaww.com', 'delta-americas.com', 'delta-emea.com'],
  Dutoplast: ['dutoplast.com.br'],
  Eaton: ['eaton.com'],
  Finder: ['findernet.com', 'finder.com.br'],
  Hellermann: ['hellermanntyton.com', 'hellermanntyton.com.br', 'hellermanntyton.de'],
  Legrand: ['legrand.com.br', 'legrand.com', 'legrand.fr'],
  'Mean Well': ['meanwell.com', 'meanwell.com.tw', 'meanwellusa.com'],
  'Phoenix Contact': ['phoenixcontact.com', 'phoenixcontact.com.br'],
  Rittal: ['rittal.com', 'rittal.com.br'],
  'Schneider Electric': ['se.com', 'schneider-electric.com', 'schneider-electric.com.br', 'schneider-electric.us'],
  // siemens-info.com: o Digital Content Center da Siemens, onde ficam os catálogos IC 10/IC 21
  Siemens: ['siemens.com', 'siemens.com.br', 'siemens-info.com'],
  Steck: ['steck.com.br'],
  Taunus: ['taunus.com.br'],
  WEG: ['weg.net'],
  Weidmüller: ['weidmueller.com', 'weidmuller.com', 'weidmueller.com.br', 'weidmuller.com.br'],
};
const FABRICANTES = Object.keys(DOMINIOS_FABRICANTE).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

// apelidos comuns → nome canônico
const APELIDOS = {
  schneider: 'Schneider Electric', 'schneider electric': 'Schneider Electric',
  phoenix: 'Phoenix Contact', 'phoenix contact': 'Phoenix Contact',
  meanwell: 'Mean Well', 'mean well': 'Mean Well',
  weidmuller: 'Weidmüller', weidmueller: 'Weidmüller',
  hellermann: 'Hellermann', 'hellermann tyton': 'Hellermann', hellermanntyton: 'Hellermann',
  'delta electronics': 'Delta', 'weg sa': 'WEG', 'weg s a': 'WEG',
};

// lojas/marketplaces/terceiros: nunca valem como fonte de medida
const DOMINIOS_TERCEIROS = /(^|\.)(mercadolivre|mercadolibre|amazon|aliexpress|shopee|magazineluiza|magalu|americanas|casasbahia|kabum|leroymerlin|ebay|alibaba|made-in-china|google|bing|youtube|facebook|instagram|wikipedia|scribd|issuu|docplayer|manualslib|datasheetarchive|alldatasheet|octopart|digikey|mouser|rs-online|farnell|newark|automationdirect|radwell)\./i;

const MONTAGENS = ['din', 'placa', 'porta', 'piso'];
const ORIGENS = ['catalogo_hm', 'usuario', 'pesquisa_ia'];
const TEXTOS = { fabricante: 80, linha: 120, referencia: 80, tipo: 40, descricao: 300, curva: 10, classe_dps: 10, tensao_bobina: 40, fonte_url: 1000, fonte_documento: 300, obs: 2000 };
const NUMEROS = [
  'polos', 'corrente_a', 'corrente_min_a', 'icu_ka', 'sensibilidade_ma', 'imax_ka', 'in_ka', 'uc_v', 'potencia_kw',
  'corrente_ac3_a', 'saida_a', 'largura_mm', 'altura_mm', 'profundidade_mm', 'modulos_din', 'perda_w', 'consumo_24v_ma', 'peso_kg',
];
const MEDIDAS = ['largura_mm', 'altura_mm', 'profundidade_mm'];
const MEDIDA_MAX_MM = 3000; // armário de piso alto ≈ 2,2 m; acima disso é erro de unidade
// Campos do registro do contrato (a ordem é a do contrato)
const CAMPOS = [
  'fabricante', 'linha', 'referencia', 'tipo', 'descricao', 'polos', 'corrente_a', 'corrente_min_a', 'curva', 'icu_ka',
  'sensibilidade_ma', 'classe_dps', 'imax_ka', 'in_ka', 'uc_v', 'potencia_kw', 'corrente_ac3_a', 'tensao_bobina', 'saida_a',
  'pontos', 'largura_mm', 'altura_mm', 'profundidade_mm', 'modulos_din', 'montagem', 'perda_w', 'consumo_24v_ma', 'peso_kg',
  'fonte_url', 'fonte_documento', 'obs', 'verificado', 'origem',
];
const COLUNAS_GRAVAVEIS = CAMPOS.filter(c => c !== 'verificado' && c !== 'origem');

const chaveTexto = (s) => semAcento(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Nome canônico do fabricante (WEG, Schneider Electric…); outro nome fica como digitado
function canonFabricante(nome) {
  const t = String(nome ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const k = chaveTexto(t);
  const canonico = FABRICANTES.find(f => chaveTexto(f) === k) || APELIDOS[k];
  return canonico || t.slice(0, TEXTOS.fabricante);
}

const chaveRegistro = (fabricante, referencia) => `${chaveTexto(canonFabricante(fabricante))}|${String(referencia ?? '').trim().toLowerCase()}`;

// Número vindo da tela ou da IA: 54, "54", "78,5", "78.5", "54 mm", "1.200" (mm)
function lerNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v).trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!s || s === '-') return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function urlValida(u) {
  try {
    const url = new URL(String(u));
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch { return null; }
}

// O link está no site do fabricante? Fabricante da lista: só os domínios dela.
// Outro fabricante (digitado): o domínio precisa conter o nome dele (sem
// espaço/acento) e não pode ser loja/marketplace — vale, mas marcado.
function dominioDoFabricante(fonteUrl, fabricante) {
  const url = urlValida(fonteUrl);
  if (!url) return { ok: false, motivo: 'sem link do documento do fabricante' };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (DOMINIOS_TERCEIROS.test(`${host}.`)) return { ok: false, motivo: `o link (${host}) é de loja/terceiro, não do fabricante` };
  const canon = canonFabricante(fabricante);
  const dominios = DOMINIOS_FABRICANTE[canon];
  if (dominios) {
    const ok = dominios.some(d => host === d || host.endsWith(`.${d}`));
    return ok ? { ok: true, confirmado: true, host } : { ok: false, motivo: `o link (${host}) não é do site oficial da ${canon} (${dominios.join(', ')})` };
  }
  const nome = semAcento(canon).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nome.length >= 3 && host.replace(/[^a-z0-9]/g, '').includes(nome)) return { ok: true, confirmado: false, host };
  return { ok: false, motivo: `o link (${host}) não parece ser do site do fabricante "${canon}"` };
}

// Valida e normaliza um registro (tela ou IA). Devolve { registro, erros }.
// exigirMedidas: as três medidas > 0 (sem elas o registro não serve ao arranjo).
function normalizarRegistro(entrada, { exigirMedidas = true } = {}) {
  const e = entrada && typeof entrada === 'object' ? entrada : {};
  const erros = [];
  const r = {};
  for (const [campo, max] of Object.entries(TEXTOS)) {
    const v = e[campo];
    // texto livre (obs) guarda as quebras de linha; os demais ficam numa linha só
    const t = v === null || v === undefined ? '' : (campo === 'obs' ? String(v).trim() : String(v).trim().replace(/\s+/g, ' '));
    r[campo] = t ? t.slice(0, max) : null;
  }
  r.fabricante = r.fabricante ? canonFabricante(r.fabricante) : null;
  if (!r.fabricante) erros.push('Informe o fabricante');
  if (!r.referencia) erros.push('Informe a referência (código comercial do fabricante)');
  if (!r.tipo || !TIPOS[r.tipo]) erros.push('Tipo de componente inválido');
  for (const campo of NUMEROS) {
    const n = lerNumero(e[campo]);
    if (Number.isNaN(n)) { erros.push(`Valor inválido em "${campo}"`); r[campo] = null; continue; }
    if (n !== null && n < 0) { erros.push(`"${campo}" não pode ser negativo`); r[campo] = null; continue; }
    r[campo] = n;
  }
  if (r.polos != null) r.polos = Math.round(r.polos);
  for (const m of MEDIDAS) {
    if (r[m] != null && (r[m] <= 0 || r[m] > MEDIDA_MAX_MM)) erros.push(`Medida fora do esperado em "${m}" (${r[m]} mm)`);
    else if (r[m] == null && exigirMedidas) erros.push('Informe largura, altura e profundidade em mm (do datasheet do fabricante)');
  }
  const montagem = e.montagem == null || e.montagem === '' ? null : String(e.montagem).trim().toLowerCase();
  if (montagem && !MONTAGENS.includes(montagem)) erros.push('Montagem inválida (din, placa, porta ou piso)');
  r.montagem = MONTAGENS.includes(montagem) ? montagem : null;
  if (r.fonte_url && !urlValida(r.fonte_url)) erros.push('O link da fonte precisa começar com http:// ou https://');  // pontos: número (seção do borne, mm²) ou objeto { DI: 16 } (módulo de E/S)
  const p = e.pontos;
  if (p === null || p === undefined || p === '') r.pontos = null;
  else if (typeof p === 'number' && Number.isFinite(p)) r.pontos = p;
  else if (typeof p === 'object' && !Array.isArray(p)) {
    const obj = {};
    for (const [k, v] of Object.entries(p).slice(0, 12)) {
      const n = lerNumero(v);
      if (/^[A-Za-z0-9_]{1,12}$/.test(k) && Number.isFinite(n)) obj[k] = n;
    }
    r.pontos = Object.keys(obj).length ? obj : null;
  } else {
    const n = lerNumero(p);
    r.pontos = Number.isFinite(n) ? n : null;
  }
  // só um erro de medida faltando (não um por campo)
  return { registro: r, erros: [...new Set(erros)] };
}

// Linha do banco → registro do contrato (números como número) + dados de controle
function paraSaida(row) {
  if (!row) return null;
  const r = { id: row.id };
  for (const c of CAMPOS) r[c] = row[c] === undefined ? null : row[c];
  for (const c of NUMEROS) r[c] = r[c] == null ? null : Number(r[c]);
  r.verificado = row.verificado === true;
  r.verificado_por = row.verificado_por || null;
  r.verificado_em = row.verificado_em || null;
  r.criado_em = row.criado_em || null;
  r.atualizado_em = row.atualizado_em || null;
  return r;
}

// Só os campos do contrato (o que vai para a skill)
function paraSkill(registro) {
  const r = {};
  for (const c of CAMPOS) r[c] = registro[c] === undefined ? null : registro[c];
  return r;
}

// ── Catálogo embutido na skill (só leitura) ─────────────────────────────────

let cacheEmbutido = { mtime: null, dados: { versao: null, componentes: [] } };
function catalogoEmbutido(arquivo = ARQUIVO_CATALOGO) {
  try {
    const st = fs.statSync(arquivo);
    if (cacheEmbutido.arquivo === arquivo && cacheEmbutido.mtime === st.mtimeMs) return cacheEmbutido.dados;
    const json = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const componentes = (Array.isArray(json?.componentes) ? json.componentes : [])
      .filter(c => c && c.fabricante && c.referencia)
      .map(c => ({ ...paraSkill(c), fabricante: canonFabricante(c.fabricante), origem: 'catalogo_hm', verificado: c.verificado !== false }));
    cacheEmbutido = { arquivo, mtime: st.mtimeMs, dados: { versao: json?.versao || null, componentes } };
    return cacheEmbutido.dados;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`Catálogo de componentes da skill de quadros ilegível (${e.message}) — só o banco vale.`);
    return { versao: null, componentes: [] };
  }
}

// JSON da skill + banco; o banco sobrepõe pelo par (fabricante, referência).
// Cada item sai com `chave` (para a tela) e, se veio do banco por cima de um do
// JSON, `substitui_catalogo: true`.
function mesclarCatalogo(embutidos, doBanco) {
  const mapa = new Map();
  for (const c of embutidos || []) mapa.set(chaveRegistro(c.fabricante, c.referencia), { ...c, id: null, chave: `hm:${chaveRegistro(c.fabricante, c.referencia)}` });
  for (const c of doBanco || []) {
    const k = chaveRegistro(c.fabricante, c.referencia);
    mapa.set(k, { ...c, chave: `db:${c.id}`, substitui_catalogo: mapa.has(k) && mapa.get(k).origem === 'catalogo_hm' });
  }
  return [...mapa.values()];
}

// ── Banco ───────────────────────────────────────────────────────────────────

const tabelaFaltando = (e) => e && e.code === '42P01';

async function linhasDoBanco(executor = pool) {
  try {
    const { rows } = await executor.query('SELECT * FROM componentes_quadro ORDER BY lower(fabricante), tipo, lower(referencia)');
    return rows.map(paraSaida);
  } catch (e) {
    if (tabelaFaltando(e)) return []; // migração 2.0-20 ainda não rodou
    throw e;
  }
}

// filtros: { fabricante, tipo, verificado ('sim'|'nao'|true|false), texto, origem }
function filtrar(itens, { fabricante, tipo, verificado, texto, origem } = {}) {
  const fab = fabricante ? chaveTexto(canonFabricante(fabricante)) : null;
  const ver = verificado === true || verificado === 'true' || verificado === 'sim' ? true
    : verificado === false || verificado === 'false' || verificado === 'nao' ? false : null;
  const palavras = chaveTexto(texto).split(' ').filter(Boolean);
  return itens.filter(c => (!fab || chaveTexto(c.fabricante) === fab)
    && (!tipo || c.tipo === tipo)
    && (ver === null || c.verificado === ver)
    && (!origem || c.origem === origem)
    && (!palavras.length || (() => {
      const alvo = chaveTexto(`${c.fabricante} ${c.linha || ''} ${c.referencia} ${c.descricao || ''} ${TIPOS[c.tipo] || c.tipo}`);
      return palavras.every(p => alvo.includes(p));
    })()));
}

async function listar(filtros = {}) {
  const embutido = catalogoEmbutido();
  const banco = await linhasDoBanco();
  const todos = mesclarCatalogo(embutido.componentes, banco);
  const itens = filtrar(todos, filtros).sort((a, b) => a.fabricante.localeCompare(b.fabricante, 'pt-BR', { sensitivity: 'base' })
    || (TIPOS[a.tipo] || a.tipo).localeCompare(TIPOS[b.tipo] || b.tipo, 'pt-BR')
    || String(a.referencia).localeCompare(String(b.referencia), 'pt-BR', { numeric: true }));
  return {
    itens,
    total: todos.length,
    versao_catalogo: embutido.versao,
    total_embutido: embutido.componentes.length,
    total_banco: banco.length,
    fabricantes: FABRICANTES,
    tipos: Object.entries(TIPOS).map(([valor, rotulo]) => ({ valor, rotulo })),
  };
}

async function buscarUm(id) {
  const { rows: [row] } = await pool.query('SELECT * FROM componentes_quadro WHERE id = $1', [id]);
  return paraSaida(row);
}

function exigirValido(entrada, opcoes) {
  const { registro, erros } = normalizarRegistro(entrada, opcoes);
  if (erros.length) throw new ErroHttp(400, erros.join('; '));
  return registro;
}

const erroDuplicado = (e, r) => (e && e.code === '23505'
  ? new ErroHttp(409, `Já existe no catálogo o componente ${r.fabricante} ${r.referencia}. Edite o registro existente.`)
  : e);

// Aprovar exige o documento: link do fabricante ou a identificação do catálogo
function conferirAprovacao(r) {
  if (!r.fonte_url && !r.fonte_documento) throw new ErroHttp(400, 'Para marcar como verificado, informe o link ou o nome do documento do fabricante onde as medidas foram conferidas.');
  if (MEDIDAS.some(m => !(Number(r[m]) > 0))) throw new ErroHttp(400, 'Para marcar como verificado, informe largura, altura e profundidade.');
}

// Cadastro manual (tela, admin): origem 'usuario'. `verificado: true` já grava
// como conferido por quem salvou.
async function criar(entrada, usuario) {
  const r = exigirValido(entrada);
  const verificado = entrada?.verificado === true;
  if (verificado) conferirAprovacao(r);
  const cols = [...COLUNAS_GRAVAVEIS, 'origem', 'verificado', 'verificado_por', 'verificado_em', 'usuario_id'];
  const vals = [...COLUNAS_GRAVAVEIS.map(c => (c === 'pontos' && r.pontos != null ? JSON.stringify(r.pontos) : r[c])), 'usuario', verificado, verificado ? usuario?.nome || null : null, verificado ? new Date() : null, usuario?.id || null];
  try {
    const { rows: [row] } = await pool.query(
      `INSERT INTO componentes_quadro (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, vals);
    invalidarCache();
    return paraSaida(row);
  } catch (e) { throw erroDuplicado(e, r); }
}

// Edição (tela, admin): o registro passa a ser do usuário (origem 'usuario');
// verificado vem do formulário (desmarcado = volta a "a conferir").
async function atualizar(id, entrada, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Componente não encontrado.');
  const r = exigirValido(entrada);
  const verificado = entrada?.verificado === true;
  if (verificado) conferirAprovacao(r);
  const manterAprovacao = verificado && atual.verificado;
  const sets = COLUNAS_GRAVAVEIS.map((c, i) => `${c} = $${i + 1}`);
  const vals = COLUNAS_GRAVAVEIS.map(c => (c === 'pontos' && r.pontos != null ? JSON.stringify(r.pontos) : r[c]));
  vals.push(verificado, verificado ? (manterAprovacao ? atual.verificado_por : usuario?.nome || null) : null, verificado ? (manterAprovacao ? atual.verificado_em : new Date()) : null, id);
  try {
    const { rows: [row] } = await pool.query(
      `UPDATE componentes_quadro SET ${sets.join(', ')}, origem = 'usuario', verificado = $${vals.length - 3}, verificado_por = $${vals.length - 2},
         verificado_em = $${vals.length - 1}, atualizado_em = NOW() WHERE id = $${vals.length} RETURNING *`, vals);
    invalidarCache();
    return paraSaida(row);
  } catch (e) { throw erroDuplicado(e, r); }
}

async function aprovar(id, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Componente não encontrado.');
  conferirAprovacao(atual);
  const { rows: [row] } = await pool.query(
    'UPDATE componentes_quadro SET verificado = TRUE, verificado_por = $1, verificado_em = NOW(), atualizado_em = NOW() WHERE id = $2 RETURNING *',
    [usuario?.nome || null, id]);
  invalidarCache();
  return paraSaida(row);
}

async function remover(id, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Componente não encontrado.');
  await pool.query('DELETE FROM componentes_quadro WHERE id = $1', [id]);
  invalidarCache();
  await registrarAuditoria(pool, { entidade: 'componente_quadro', entidadeId: id, acao: 'excluir', detalhes: atual, usuarioId: usuario?.id || null });
  return atual;
}

// ── Injeção nos dados da skill de quadros ───────────────────────────────────
// O cálculo da skill é síncrono (controllers/laudos/comum.js processarComMotor):
// a tabela inteira (pequena) fica em memória e é relida antes de cada uso
// (carregarLaudo de um projeto de quadros → atualizarCache) e depois de cada
// gravação por aqui.

let cacheBanco = null; // [registros] | null = ainda não lido
function invalidarCache() { cacheBanco = null; }
async function atualizarCache() {
  try {
    cacheBanco = await linhasDoBanco();
  } catch (e) {
    console.warn(`Catálogo de componentes de quadros indisponível (${e.message}) — o cálculo segue com as medidas da skill.`);
    cacheBanco = [];
  }
  return cacheBanco;
}

// Fabricantes e referências citados nos dados do formulário: o padrão, os por
// tipo e o "fabricante"/"referencia" de qualquer circuito, partida ou dispositivo.
function citadosNosDados(dados) {
  const fabricantes = new Set();
  const referencias = new Set();
  const f = dados?.fabricantes;
  const addFab = (v) => { if (typeof v === 'string' && v.trim()) fabricantes.add(chaveTexto(canonFabricante(v))); };
  if (f && typeof f === 'object') {
    addFab(f.padrao);
    if (f.por_tipo && typeof f.por_tipo === 'object') Object.values(f.por_tipo).forEach(addFab);
  }
  let visitados = 0;
  const visitar = (no, prof) => {
    if (!no || typeof no !== 'object' || prof > 8 || ++visitados > 20000) return;
    if (Array.isArray(no)) { no.forEach(x => visitar(x, prof + 1)); return; }
    for (const [k, v] of Object.entries(no)) {
      if (k === 'catalogo_componentes' || k === 'fabricantes' || k === 'inspecao') continue;
      if (k === 'fabricante') addFab(v);
      else if (k === 'referencia' && typeof v === 'string' && v.trim()) referencias.add(v.trim().toLowerCase());
      // motor: referencias { Q1, K1, T1 } (disjuntor-motor, contator, soft/inversor)
      else if (k === 'referencias' && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const r of Object.values(v)) if (typeof r === 'string' && r.trim()) referencias.add(r.trim().toLowerCase());
      }
      else if (v && typeof v === 'object') visitar(v, prof + 1);
    }
  };
  visitar(dados, 0);
  return { fabricantes, referencias };
}

// Registros do banco que servem a estes dados (fabricantes escolhidos +
// referências citadas). Lista vazia = nada a injetar.
function registrosParaDados(dados, registros = cacheBanco || []) {
  if (!registros.length || !dados || typeof dados !== 'object') return [];
  const { fabricantes, referencias } = citadosNosDados(dados);
  if (!fabricantes.size && !referencias.size) return [];
  return registros
    .filter(r => fabricantes.has(chaveTexto(r.fabricante)) || referencias.has(String(r.referencia).toLowerCase()))
    .map(paraSkill);
}

// Devolve os dados com dados.catalogo_componentes (NUNCA altera o objeto
// recebido: o que vai para o banco continua sem o catálogo). Sem nada a
// injetar, devolve o próprio objeto.
function injetarNosDados(dados, registros) {
  const lista = registrosParaDados(dados, registros);
  if (!lista.length) return dados;
  const ja = Array.isArray(dados.catalogo_componentes) ? dados.catalogo_componentes : [];
  const doBanco = new Set(lista.map(r => chaveRegistro(r.fabricante, r.referencia)));
  return { ...dados, catalogo_componentes: [...ja.filter(r => !doBanco.has(chaveRegistro(r?.fabricante, r?.referencia))), ...lista] };
}

// ── Pesquisa da medida oficial pela IA ──────────────────────────────────────

const FORMATO_IA = '{"encontrado":true,"fabricante":"","linha":"","referencia":"código de pedido","tipo":"","descricao":"","polos":null,"corrente_a":null,"corrente_min_a":null,"curva":null,"icu_ka":null,"sensibilidade_ma":null,"classe_dps":null,"imax_ka":null,"in_ka":null,"uc_v":null,"potencia_kw":null,"corrente_ac3_a":null,"tensao_bobina":null,"saida_a":null,"pontos":null,"largura_mm":0,"altura_mm":0,"profundidade_mm":0,"modulos_din":null,"montagem":"din|placa|porta|piso","perda_w":null,"consumo_24v_ma":null,"peso_kg":null,"fonte_url":"https://<site do fabricante>/...","fonte_documento":"nome do datasheet/catálogo, edição e página","obs":""}';

// Convenções do contrato da skill de quadros, por tipo (para o registro casar
// com o que a skill procura)
const CONVENCOES_TIPO = {
  dps: 'DPS: um registro POR POLO (módulo unipolar) — "polos": 1 e as medidas de UM módulo; não use kit 3P+N.',
  ddr: 'DDR: "polos" = polos do circuito, contando o neutro (1P+N = 2).',
  borne: 'Borne: "pontos" = seção nominal em mm² (número, ex.: 2.5).',
  clp_modulo: 'Módulo de CLP: "pontos" = {"DI":16} / {"DO":16} / {"AI":4} / {"AO":2}; módulo de comunicação RS-485 = {"RS485":1}.',
};

function montarPromptMedida({ fabricante, tipo, especificacao }) {
  const canon = canonFabricante(fabricante);
  const dominios = DOMINIOS_FABRICANTE[canon];
  const convencao = CONVENCOES_TIPO[tipo] ? `\n6. ${CONVENCOES_TIPO[tipo]}` : '';
  return `Pesquise na web as DIMENSÕES OFICIAIS de um componente de quadro elétrico no documento do PRÓPRIO FABRICANTE (datasheet, ficha técnica ou catálogo publicado no site oficial).
Fabricante: "${canon}"
Tipo de componente: ${TIPOS[tipo] || tipo} (${tipo})
Especificação pedida: "${especificacao}"

Regras:
1. Escolha o modelo da linha atual desse fabricante que atende a especificação (polos, corrente, curva, capacidade de interrupção, sensibilidade, potência etc.) e informe em "referencia" o CÓDIGO COMERCIAL DE PEDIDO exatamente como está no catálogo do fabricante.
2. As medidas vêm do datasheet ou catálogo do fabricante, em milímetros, do produto MONTADO: "largura_mm" = frente, ao longo do trilho DIN ou da placa; "altura_mm" = frente; "profundidade_mm" = a partir do trilho/placa de montagem. Componente de trilho DIN: "modulos_din" = largura em módulos de 17,5/18 mm e "montagem": "din".
3. "fonte_url" = link do documento ou da página do produto NO SITE OFICIAL DO FABRICANTE${dominios ? ` (domínio ${dominios.join(' ou ')})` : ''}. Não serve loja, distribuidor, marketplace, revenda, agregador de datasheets nem site de terceiros. Em "fonte_documento", o nome do documento, a edição e a página.
4. Preencha os outros campos SÓ com o que o documento do fabricante traz (corrente, polos, curva, Icu/Icn com a norma em "obs", perda em W à corrente nominal, consumo em 24 V em mA, peso em kg). O que o documento não traz fica null.
5. NÃO invente nem estime nenhuma medida. Se não achar o documento oficial do fabricante com as três medidas, responda {"encontrado":false,"motivo":"o que faltou"}.${convencao}
Responda SOMENTE com JSON neste formato: ${FORMATO_IA}`;
}

// Resposta da IA é dado NÃO confiável: confere fabricante, referência, as três
// medidas e o domínio do link. Devolve { ok, registro?, problemas[], naoEncontrado? }.
function validarRespostaIA(json, pedido) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return { ok: false, problemas: ['resposta sem dados'] };
  if (json.encontrado === false) return { ok: false, naoEncontrado: true, problemas: [String(json.motivo || 'o documento oficial do fabricante não foi encontrado').slice(0, 300)] };
  const problemas = [];
  const fabPedido = canonFabricante(pedido.fabricante);
  if (json.fabricante && chaveTexto(canonFabricante(json.fabricante)) !== chaveTexto(fabPedido)) {
    problemas.push(`o resultado é de outro fabricante (${String(json.fabricante).slice(0, 60)})`);
  }
  const { registro, erros } = normalizarRegistro({ ...json, fabricante: fabPedido, tipo: pedido.tipo }, { exigirMedidas: true });
  if (erros.some(e => /largura, altura e profundidade/.test(e))) problemas.push('faltou alguma das medidas (largura, altura, profundidade) no documento');
  problemas.push(...erros.filter(e => !/largura, altura e profundidade/.test(e)));
  if (registro.referencia && !/^[\w\s./+\-#()]{2,80}$/u.test(registro.referencia)) problemas.push('referência com caracteres estranhos');
  const dom = dominioDoFabricante(registro.fonte_url, fabPedido);
  if (!dom.ok) problemas.push(dom.motivo);
  if (problemas.length) return { ok: false, problemas: [...new Set(problemas)] };
  registro.origem = 'pesquisa_ia';
  registro.verificado = false;
  if (!dom.confirmado) registro.obs = `${registro.obs ? `${registro.obs} ` : ''}[CONFERIR] domínio do fabricante não confirmado pelo sistema (${dom.host}).`.slice(0, TEXTOS.obs);
  return { ok: true, registro, problemas: [] };
}

const chavePesquisa = ({ fabricante, tipo, especificacao }) => `${chaveTexto(canonFabricante(fabricante))}|${tipo}|${chaveTexto(especificacao)}`.slice(0, 400);

function lerPedido(p) {
  const fabricante = canonFabricante(p?.fabricante);
  const tipo = String(p?.tipo || '').trim();
  const especificacao = String(p?.especificacao || '').trim().replace(/\s+/g, ' ').slice(0, 300);
  if (!fabricante) throw new ErroHttp(400, 'Informe o fabricante do componente.');
  if (!TIPOS[tipo]) throw new ErroHttp(400, 'Tipo de componente inválido.');
  if (!especificacao) throw new ErroHttp(400, 'Informe a especificação do componente (ex.: "disjuntor 3P 16 A curva C 10 kA").');
  // tag: texto para a tela — a skill junta as iguais numa linha só ("KA1, KA2, …")
  return { fabricante, tipo, especificacao, tag: p?.tag ? String(p.tag).slice(0, 200) : null, referencia: p?.referencia ? String(p.referencia).trim().slice(0, 80) : null };
}

// Grava o achado da IA (verificado:false, origem 'pesquisa_ia'). Não mexe no
// que já existe conferido ou cadastrado à mão, nem duplica o JSON da skill.
async function gravarAchado(registro, pedido, usuario) {
  const k = chaveRegistro(registro.fabricante, registro.referencia);
  const doJson = catalogoEmbutido().componentes.find(c => chaveRegistro(c.fabricante, c.referencia) === k);
  if (doJson) return { situacao: 'ja_no_catalogo', registro: doJson };
  const { rows: [existente] } = await pool.query('SELECT * FROM componentes_quadro WHERE lower(fabricante) = lower($1) AND lower(referencia) = lower($2)', [registro.fabricante, registro.referencia]);
  if (existente && (existente.verificado || existente.origem !== 'pesquisa_ia')) return { situacao: 'ja_no_catalogo', registro: paraSaida(existente) };
  const cols = [...COLUNAS_GRAVAVEIS, 'origem', 'verificado', 'especificacao_pesquisada', 'usuario_id'];
  const vals = [...COLUNAS_GRAVAVEIS.map(c => (c === 'pontos' && registro.pontos != null ? JSON.stringify(registro.pontos) : registro[c])), 'pesquisa_ia', false, chavePesquisa(pedido), usuario?.id || null];
  let row;
  if (existente) {
    ({ rows: [row] } = await pool.query(
      `UPDATE componentes_quadro SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}, verificado_por = NULL, verificado_em = NULL, atualizado_em = NOW() WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals, existente.id]));
  } else {
    ({ rows: [row] } = await pool.query(
      `INSERT INTO componentes_quadro (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (lower(fabricante), lower(referencia)) DO NOTHING RETURNING *`, vals));
    if (!row) {
      const { rows: [outro] } = await pool.query('SELECT * FROM componentes_quadro WHERE lower(fabricante) = lower($1) AND lower(referencia) = lower($2)', [registro.fabricante, registro.referencia]);
      return { situacao: 'ja_no_catalogo', registro: paraSaida(outro) };
    }
  }
  invalidarCache();
  return { situacao: 'encontrado', registro: paraSaida(row) };
}

// Uma especificação: { fabricante, tipo, especificacao } → { situacao, registro?, motivo?, provedor? }
//   situacao: 'encontrado' | 'nao_encontrado' | 'ja_no_catalogo'
// Revisão do uso de IA de 06/11/2026: antes a busca unitária ia direto à IA (a em lote já conferia o catálogo), o
// "não encontrado" não era lembrado (a mesma especificação gastava IA de novo a cada clique) e a pesquisa não tinha
// prazo total (a tela desiste em 300 s e o backend seguia até a API paga). Agora, nesta ordem:
//   1. já no catálogo (JSON da skill ou banco) com a mesma referência, ou a mesma especificação já pesquisada → sem IA;
//   2. a mesma especificação que a IA não achou nos últimos DIAS_LEMBRAR_NAO_ENCONTRADO dias → devolve o motivo
//      guardado (`fresco` pesquisa de novo);
//   3. a IA, com prazo total (TEMPO_TOTAL_MS) e cancelada quando a tela fecha a requisição (`signal`).
const DIAS_LEMBRAR_NAO_ENCONTRADO = 30;
const TEMPO_TOTAL_MS = Number(process.env.PESQUISA_TEMPO_TOTAL_MS) || 270 * 1000;
const USO_IA = 'componente_quadro_medida';
const iaCache = require('./iaCache');

// fresco: o achado da IA ainda não conferido não segura a nova pesquisa (o conferido e o cadastrado à mão seguram)
async function jaConhecido(pedido, { fresco = false } = {}) {
  const k = chavePesquisa(pedido);
  const { rows: [pesquisada] } = await pool.query('SELECT * FROM componentes_quadro WHERE especificacao_pesquisada = $1 ORDER BY verificado DESC, id DESC LIMIT 1', [k])
    .catch(e => (tabelaFaltando(e) ? { rows: [] } : Promise.reject(e)));
  if (pesquisada && !(fresco && pesquisada.origem === 'pesquisa_ia' && !pesquisada.verificado)) return paraSaida(pesquisada);
  if (!pedido.referencia) return null;
  const alvo = chaveRegistro(pedido.fabricante, pedido.referencia);
  return mesclarCatalogo(catalogoEmbutido().componentes, await linhasDoBanco()).find(c => chaveRegistro(c.fabricante, c.referencia) === alvo) || null;
}

async function naoEncontradoRecente(pedido) {
  const { rows: [r] } = await pool.query(
    `SELECT motivo, pesquisado_em FROM componentes_quadro_nao_encontrados WHERE chave = $1 AND pesquisado_em > NOW() - ($2 || ' days')::interval`,
    [chavePesquisa(pedido), String(DIAS_LEMBRAR_NAO_ENCONTRADO)]).catch(() => ({ rows: [] }));
  return r || null;
}

async function pesquisarMedida(entrada, usuario, { signal, fresco = false, timeoutTotalMs = TEMPO_TOTAL_MS } = {}) {
  const pedido = lerPedido(entrada);
  const conhecido = await jaConhecido(pedido, { fresco });
  if (conhecido) {
    await iaCache.registrarUso(USO_IA, 'sem_ia');
    return { situacao: 'ja_no_catalogo', registro: conhecido, pedido };
  }
  if (!fresco) {
    const lembrado = await naoEncontradoRecente(pedido);
    if (lembrado) {
      await iaCache.registrarUso(USO_IA, 'cache');
      const quando = new Date(lembrado.pesquisado_em).toLocaleDateString('pt-BR');
      return { situacao: 'nao_encontrado', motivo: `já pesquisado em ${quando} sem a medida oficial: ${lembrado.motivo || 'não encontrado'} (pesquise de novo para tentar outra vez)`, lembrado: true, pedido };
    }
  }
  if (!ia.disponivel({ web: true })) {
    throw new ErroHttp(422, 'Busca de medidas desativada — nenhuma IA disponível (Claude Code com a assinatura Max, ANTHROPIC_API_KEY ou GEMINI_API_KEY).');
  }
  let r;
  try {
    r = await ia.pesquisarWeb(montarPromptMedida(pedido), {
      finalidade: 'medida de componente de quadro',
      signal, timeoutTotalMs,
      // resposta recusada passa para o próximo provedor (o último é aceito para dar o motivo)
      aceitar: (json, { ultimo }) => ultimo || validarRespostaIA(json, pedido).ok,
    });
  } catch (err) {
    await iaCache.registrarUso(USO_IA, 'falha');
    if (err?.cancelado) throw Object.assign(new ErroHttp(499, 'Busca cancelada (a tela foi fechada ou desistiu de esperar).'), { semIA: true });
    if (!err?.indisponivel) throw err;
    const detalhe = (err.erros || []).map(e => `${e.rotulo || e.provedor}: ${e.mensagem === 'resposta sem dado aproveitável' ? 'sem medida oficial' : e.mensagem}`).join(' | ') || err.message;
    // nenhum provedor RESPONDEU (fora do ar, sem login, sem crédito): o lote para (abaixo), em vez de passar cada item pela cadeia inteira
    const nenhumRespondeu = !(err.erros || []).some(e => e.mensagem === 'resposta sem dado aproveitável');
    throw Object.assign(new ErroHttp(502, `Não foi possível buscar a medida agora (${String(detalhe).slice(0, 300)})`), { semIA: nenhumRespondeu });
  }
  await iaCache.registrarUso(USO_IA, 'ia');
  const v = validarRespostaIA(r.json, pedido);
  if (!v.ok) {
    // a IA respondeu e não achou (ou achou fora das regras): lembra por DIAS_LEMBRAR_NAO_ENCONTRADO dias
    await pool.query(
      `INSERT INTO componentes_quadro_nao_encontrados (chave, motivo) VALUES ($1, $2)
       ON CONFLICT (chave) DO UPDATE SET motivo = EXCLUDED.motivo, pesquisado_em = NOW()`,
      [chavePesquisa(pedido), v.problemas.join('; ').slice(0, 1000)]).catch(() => {});
    return { situacao: 'nao_encontrado', motivo: v.problemas.join('; '), provedor: r.fonte, pedido };
  }
  const g = await gravarAchado(v.registro, pedido, usuario);
  return { ...g, provedor: r.fonte, pedido };
}

// ── Busca em lote (componentes_sem_medida do cálculo) ───────────────────────
// Roda em segundo plano, uma de cada vez (a IA é uma só), no máximo
// LIMITE_LOTE itens por pedido; a tela acompanha por GET. Pula o que já tem
// registro do fabricante com a mesma referência e o que já foi pesquisado.

const LIMITE_LOTE = 15;
const VALIDADE_TAREFA_MS = 2 * 60 * 60 * 1000;
const TAREFAS = new Map();
let filaLote = Promise.resolve();

function limparTarefas() {
  const agora = Date.now();
  for (const [id, t] of TAREFAS) if (t.terminou_em && agora - t.terminou_em > VALIDADE_TAREFA_MS) TAREFAS.delete(id);
}

const publicaTarefa = (t) => ({
  id: t.id, situacao: t.situacao, total: t.itens.length, feitos: t.itens.filter(i => !['pendente', 'pesquisando'].includes(i.situacao)).length,
  ignorados: t.ignorados, criado_em: t.criado_em, itens: t.itens, erro: t.erro || null,
});

async function iniciarPesquisaEmLote(lista, usuario, { executar = pesquisarMedida } = {}) {
  if (!Array.isArray(lista) || !lista.length) throw new ErroHttp(400, 'Envie a lista de componentes sem medida.');
  if (!ia.disponivel({ web: true })) {
    throw new ErroHttp(422, 'Busca de medidas desativada — nenhuma IA disponível (Claude Code com a assinatura Max, ANTHROPIC_API_KEY ou GEMINI_API_KEY).');
  }
  limparTarefas();
  const emCurso = [...TAREFAS.values()].find(t => t.usuario_id === (usuario?.id ?? null) && ['na_fila', 'rodando'].includes(t.situacao));
  if (emCurso) return publicaTarefa(emCurso);

  // pedidos válidos, sem repetir a mesma especificação
  const vistos = new Set();
  const pedidos = [];
  const recusados = [];
  for (const p of lista.slice(0, 200)) {
    let pedido;
    try { pedido = lerPedido(p); } catch (e) { recusados.push({ tag: p?.tag || null, tipo: p?.tipo || null, fabricante: p?.fabricante || null, especificacao: p?.especificacao || null, situacao: 'ignorado', motivo: e.message }); continue; }
    const k = chavePesquisa(pedido);
    if (vistos.has(k)) continue;
    vistos.add(k);
    pedidos.push(pedido);
  }
  // já no catálogo: mesma referência do fabricante (JSON ou banco) ou mesma especificação já pesquisada
  const banco = await linhasDoBanco();
  const { rows: pesquisadas } = await pool.query('SELECT especificacao_pesquisada FROM componentes_quadro WHERE especificacao_pesquisada IS NOT NULL').catch(e => (tabelaFaltando(e) ? { rows: [] } : Promise.reject(e)));
  const jaPesquisadas = new Set(pesquisadas.map(r => r.especificacao_pesquisada));
  const conhecidos = new Set(mesclarCatalogo(catalogoEmbutido().componentes, banco).map(c => chaveRegistro(c.fabricante, c.referencia)));
  const itens = [];
  let ignorados = 0;
  for (const p of pedidos) {
    const base = { tag: p.tag, tipo: p.tipo, fabricante: p.fabricante, especificacao: p.especificacao };
    if ((p.referencia && conhecidos.has(chaveRegistro(p.fabricante, p.referencia))) || jaPesquisadas.has(chavePesquisa(p))) {
      itens.push({ ...base, situacao: 'ja_no_catalogo', motivo: 'já pesquisado ou já cadastrado — confira no catálogo' });
      continue;
    }
    if (itens.filter(i => i.situacao === 'pendente').length >= LIMITE_LOTE) { ignorados++; continue; }
    itens.push({ ...base, situacao: 'pendente', pedido: p });
  }
  itens.push(...recusados);

  const tarefa = {
    id: crypto.randomBytes(12).toString('hex'), usuario_id: usuario?.id ?? null, situacao: 'na_fila', criado_em: new Date().toISOString(),
    itens, ignorados, terminou_em: null,
  };
  TAREFAS.set(tarefa.id, tarefa);
  const rodar = async () => {
    tarefa.situacao = 'rodando';
    for (const item of tarefa.itens) {
      if (item.situacao !== 'pendente') continue;
      item.situacao = 'pesquisando';
      try {
        const r = await executar(item.pedido, usuario);
        item.situacao = r.situacao;
        if (r.registro) item.registro = r.registro;
        if (r.motivo) item.motivo = r.motivo;
      } catch (e) {
        item.situacao = 'erro';
        item.motivo = String(e?.message || e).slice(0, 300);
        // sem IA nenhuma: não adianta seguir com os próximos
        if (e?.status === 422 || e?.semIA) { tarefa.erro = item.motivo; break; }
      }
    }
    for (const item of tarefa.itens) { delete item.pedido; if (item.situacao === 'pendente') { item.situacao = 'erro'; item.motivo = tarefa.erro || 'não pesquisado'; } }
    tarefa.situacao = 'concluida';
    tarefa.terminou_em = Date.now();
  };
  filaLote = filaLote.then(rodar, rodar).catch((e) => { tarefa.situacao = 'concluida'; tarefa.erro = e.message; tarefa.terminou_em = Date.now(); });
  // a resposta sai já, com a fila montada
  return publicaTarefa(tarefa);
}

function lerTarefa(id, usuario) {
  const t = TAREFAS.get(String(id));
  if (!t) return null;
  if (t.usuario_id !== (usuario?.id ?? null) && usuario?.role !== 'admin') return null;
  return publicaTarefa(t);
}

module.exports = {
  TIPOS, FABRICANTES, DOMINIOS_FABRICANTE, CAMPOS, LIMITE_LOTE, ARQUIVO_CATALOGO,
  canonFabricante, chaveRegistro, lerNumero, normalizarRegistro, paraSaida, paraSkill,
  catalogoEmbutido, mesclarCatalogo, filtrar, listar, buscarUm, criar, atualizar, aprovar, remover,
  atualizarCache, invalidarCache, citadosNosDados, registrosParaDados, injetarNosDados,
  dominioDoFabricante, montarPromptMedida, validarRespostaIA, pesquisarMedida, iniciarPesquisaEmLote, lerTarefa,
  _interno: { TAREFAS, get cacheBanco() { return cacheBanco; }, set cacheBanco(v) { cacheBanco = v; } },
};
