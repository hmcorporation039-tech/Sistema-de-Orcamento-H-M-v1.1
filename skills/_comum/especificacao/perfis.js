// REGISTRO DOS PERFIS do projeto pela especificação. Cada disciplina que gera um painel/quadro a
// partir da especificação do cliente tem um perfil em dados (skills/<disciplina>/dados/
// perfil-especificacao.json): vocabulário do leitor, regras de solução, verificações da
// especificação (pontos a levantar, pendências, exceções), blocos de comando a usar e folhas.
// Um perfil pode HERDAR de outro ("herda": "<chave>"): vocabulário, regras e verificações do
// pai entram primeiro e o filho acrescenta ou substitui pelo id. Assim o painel de pressurização
// reaproveita tudo do quadro de força e comando e só diz o que é dele.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const BIBLIOTECA = require('./blocos-comando.json');
const clonar = (o) => JSON.parse(JSON.stringify(o));

function arquivosDePerfil() {
  const out = [];
  for (const pasta of fs.readdirSync(RAIZ)) {
    if (pasta.startsWith('_') || pasta === 'node_modules') continue;
    const arq = path.join(RAIZ, pasta, 'dados', 'perfil-especificacao.json');
    if (fs.existsSync(arq)) out.push({ pasta, arq });
  }
  return out;
}

// Conjunto nomeado de blocos (blocos-comando.json → conjuntos): o perfil diz "blocos": { "conjunto": … } e
// recebe dali os blocos a usar e as regras padrão do painel (variáveis de comando, referências de
// equipamento) — as regras do próprio perfil prevalecem. O conjunto mora no _comum porque o painel do 3D
// (../instalacao/paineis.js) usa o mesmo sem ler a skill (2.40: o da pressurização saiu de
// skills/pressurizacao/dados/perfil-especificacao.json). Expandido na leitura, o perfil fica como era —
// a herança e o resto não mudam.
function expandirConjunto(p) {
  const nome = p.blocos && p.blocos.conjunto;
  if (!nome) return p;
  const cj = (BIBLIOTECA.conjuntos || {})[nome];
  if (!cj) throw new Error(`Perfil ${p.chave}: conjunto de blocos de comando desconhecido: ${nome}`);
  const { conjunto, ...blocos } = p.blocos;
  return { ...p, regras: mesclarObj(cj.regras, p.regras), blocos: { usar: clonar(cj.usar), ...blocos } };
}

let cache = null;
function brutos() {
  if (cache) return cache;
  cache = new Map();
  for (const { pasta, arq } of arquivosDePerfil()) {
    const p = expandirConjunto(JSON.parse(fs.readFileSync(arq, 'utf8')));
    cache.set(p.chave, { ...p, pasta });
  }
  return cache;
}

// listas de objetos com id: o do filho substitui o do pai com o mesmo id
function porId(pai = [], filho = []) {
  const out = pai.map(x => clonar(x));
  for (const f of filho || []) {
    const k = out.findIndex(x => x.id && x.id === f.id);
    if (k >= 0) out[k] = clonar(f); else out.push(clonar(f));
  }
  return out;
}
function mesclarObj(a = {}, b = {}) {
  const out = clonar(a);
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? mesclarObj(out[k], v) : clonar(v);
  }
  return out;
}

function resolver(chave, visitados = new Set()) {
  const p = brutos().get(chave);
  if (!p) throw new Error(`Perfil de especificação desconhecido: ${chave}`);
  if (!p.herda) return clonar(p);
  if (visitados.has(chave)) throw new Error(`Herança circular de perfis: ${chave}`);
  visitados.add(chave);
  const pai = resolver(p.herda, visitados);
  const v = p.vocabulario || {};
  const vp = pai.vocabulario || {};
  return {
    ...pai, ...p,
    vocabulario: {
      ...vp, ...v,
      equipamentos: { ...(vp.equipamentos || {}), ...(v.equipamentos || {}) },
      atributos: { ...(vp.atributos || {}), ...(v.atributos || {}) },
      sinais: v.sinais ? { ...(vp.sinais || {}), ...v.sinais, funcoes: porId(vp.sinais?.funcoes, v.sinais.funcoes) } : vp.sinais,
      requisitos: porId(vp.requisitos, v.requisitos),
      listas: porId(vp.listas, v.listas),
      circuitos: porId(vp.circuitos, v.circuitos),
      obrigatorios: [...(vp.obrigatorios || []).filter(o => !(v.obrigatorios || []).some(x => x.campo === o.campo)), ...(v.obrigatorios || [])],
    },
    regras: mesclarObj(pai.regras, p.regras),
    verificacoes: { ...(pai.verificacoes || {}), regras: porId(pai.verificacoes?.regras, p.verificacoes?.regras).filter(r => !(p.verificacoes?.remover || []).includes(r.id)) },
    blocos: { ...(pai.blocos || {}), ...(p.blocos || {}) },
  };
}

const perfilDe = (chave) => resolver(chave);
const listarPerfis = () => [...brutos().values()].map(p => ({ chave: p.chave, nome: p.nome, disciplina: p.disciplina, pasta: p.pasta, herda: p.herda || null, descricao: p.descricao || '' }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
const limparCache = () => { cache = null; };

module.exports = { perfilDe, listarPerfis, limparCache };
