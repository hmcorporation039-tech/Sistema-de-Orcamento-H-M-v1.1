// Adaptador do agente de QUADRO PELA ESPECIFICAÇÃO para o motor que gera o projeto completo do quadro a partir da
// especificação do cliente (unifilar, comando por relés, interfaces, layout, materiais, pendências, 3D com
// simulação e planilha de pesquisa de preço QF-CAG, com aprendizado). Esse motor está sendo construído por outro
// trabalho (09/11/2026, WP5) em skills/_comum/especificacao/ (o leitor de requisitos — leitor.js/texto.js — já
// existe) e na skill quadros. Este arquivo NÃO mexe em nenhum dos dois: só procura a função do projeto e a chama
// quando ela existir. Até lá o agente fica "aguardando módulo" (e o teste dele é pulado).
//
// Contrato esperado (o primeiro que existir vale):
//   pastas: skills/_comum/especificacao/ (todo .js, menos teste*) e skills/quadros/scripts/lib/ (só ARQUIVOS_CANDIDATOS)
//   função do projeto:  FUNCOES_PROJETO   (especificacao, opcoes) → objeto do projeto (síncrono ou Promise)
//   leitura da especificação (opcional): FUNCOES_LEITURA (texto, opcoes) → especificação estruturada
//   planilha QF-CAG (opcional): FUNCOES_PLANILHA (projeto, opcoes) → Buffer .xlsx
// O objeto do projeto é lido com tolerância (services/agentes/respostas.js): folhas, decisoes, pontosALevantar,
// faltaConfirmar, pendencias|avisos, materiais|bom|listaMateriais.
// (lerRequisitos do leitor.js NÃO entra na leitura automática: pede os blocos e o perfil da disciplina — quem o
// chama é a função do projeto.)
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', '..', '..');
const PASTA_LIB = path.join(RAIZ, 'skills', 'quadros', 'scripts', 'lib');
const PASTA_ESPECIFICACAO = path.join(RAIZ, 'skills', '_comum', 'especificacao');
const ARQUIVOS_CANDIDATOS = [
  'especificacao.js', 'projetoPelaEspecificacao.js', 'pelaEspecificacao.js', 'requisitos.js', 'especificacaoCliente.js',
  'projetoEspecificacao.js', 'doRequisito.js', 'pesquisaPrecos.js', 'planilhaPrecos.js', 'planilhaPesquisaPrecos.js',
];
const FUNCOES_PROJETO = ['projetarPelaEspecificacao', 'gerarProjetoPelaEspecificacao', 'projetoPelaEspecificacao', 'projetoDaEspecificacao', 'gerarProjetoDoQuadro', 'projetarQuadro'];
const FUNCOES_LEITURA = ['lerEspecificacao', 'interpretarEspecificacao', 'extrairRequisitos'];
const FUNCOES_PLANILHA = ['gerarPlanilhaPesquisaPrecos', 'planilhaPesquisaPrecos', 'gerarPlanilhaPrecos', 'planilhaQfCag'];

let pastas = null; // null = as pastas reais
// testes: aponta para uma pasta falsa com um módulo sintético (todo .js dela é examinado)
const usarPasta = (p) => { pastas = p ? [{ pasta: p, todos: true }] : null; };
const pastasReais = () => [{ pasta: PASTA_ESPECIFICACAO, todos: true }, { pasta: PASTA_LIB, todos: false }];

function arquivosDe({ pasta, todos }) {
  if (!fs.existsSync(pasta)) return [];
  const nomes = todos ? fs.readdirSync(pasta).filter(n => /\.js$/.test(n) && !/^teste/i.test(n)).sort() : ARQUIVOS_CANDIDATOS;
  return nomes.map(nome => ({ nome: path.relative(RAIZ, path.join(pasta, nome)).replace(/\\/g, '/'), caminho: path.join(pasta, nome) }))
    .filter(a => fs.existsSync(a.caminho));
}

function procurar() {
  const achado = { arquivos: [], projeto: null, leitura: null, planilha: null };
  for (const { nome, caminho } of (pastas || pastasReais()).flatMap(arquivosDe)) {
    let mod;
    try { mod = require(caminho); } catch (e) { achado.arquivos.push({ nome, erro: e.message }); continue; }
    achado.arquivos.push({ nome, funcoes: Object.keys(mod || {}).filter(k => typeof mod[k] === 'function') });
    const pegar = (lista) => { const f = lista.find(n => typeof mod?.[n] === 'function'); return f ? { arquivo: nome, funcao: f, fn: mod[f] } : null; };
    achado.projeto = achado.projeto || pegar(FUNCOES_PROJETO);
    achado.leitura = achado.leitura || pegar(FUNCOES_LEITURA);
    achado.planilha = achado.planilha || pegar(FUNCOES_PLANILHA);
  }
  return achado;
}

const moduloDisponivel = () => !!procurar().projeto;

// Situação para a tela/relatório: o que foi achado e o que falta
function situacao() {
  const a = procurar();
  return {
    disponivel: !!a.projeto,
    pastas: (pastas || pastasReais()).map(p => path.relative(RAIZ, p.pasta).replace(/\\/g, '/')),
    arquivos: a.arquivos,
    projeto: a.projeto ? `${a.projeto.arquivo} → ${a.projeto.funcao}` : null,
    leitura: a.leitura ? `${a.leitura.arquivo} → ${a.leitura.funcao}` : null,
    planilha: a.planilha ? `${a.planilha.arquivo} → ${a.planilha.funcao}` : null,
    espera: { arquivosNaSkill: ARQUIVOS_CANDIDATOS, funcoesProjeto: FUNCOES_PROJETO, funcoesLeitura: FUNCOES_LEITURA, funcoesPlanilha: FUNCOES_PLANILHA },
  };
}

const lista = (...v) => v.find(Array.isArray) || [];

// Roda o motor: especificação (texto, buffer do arquivo ou objeto) → { projeto, pendencias, materiais, planilha }
async function projetar(especificacao, opcoes = {}) {
  const a = procurar();
  if (!a.projeto) return { aguardando: true, situacao: situacao() };
  const lida = a.leitura && typeof especificacao === 'string' ? await a.leitura.fn(especificacao, opcoes) : especificacao;
  const projeto = await a.projeto.fn(lida, opcoes);
  const pendencias = lista(projeto?.pendencias, projeto?.avisos, projeto?.conferir).map(p => (typeof p === 'string' ? p : p?.texto || p?.mensagem || JSON.stringify(p)));
  const materiais = lista(projeto?.materiais, projeto?.bom, projeto?.listaMateriais);
  let planilha = null;
  if (a.planilha) {
    try { planilha = await a.planilha.fn(projeto, opcoes); } catch (e) { pendencias.push(`[CONFERIR] a planilha de preços do motor falhou: ${e.message}`); }
  }
  return {
    aguardando: false, modulo: { projeto: `${a.projeto.arquivo} → ${a.projeto.funcao}`, planilha: a.planilha ? `${a.planilha.arquivo} → ${a.planilha.funcao}` : null },
    projeto, pendencias, materiais, planilha: Buffer.isBuffer(planilha) ? planilha : null,
  };
}

module.exports = { moduloDisponivel, situacao, projetar, usarPasta, ARQUIVOS_CANDIDATOS, FUNCOES_PROJETO, FUNCOES_LEITURA, FUNCOES_PLANILHA };
