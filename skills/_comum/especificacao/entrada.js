// PONTO DE ENTRADA ÚNICO do projeto pela especificação (para o agente do assistente, o CLI e quem
// mais precisar sem conhecer as partes). Contrato procurado por backend/src/services/agentes/
// adaptadorQuadros.js (examina os .js desta pasta em ordem alfabética):
//   lerEspecificacao(texto | caminho | Buffer, opcoes)           → { blocos, lidos, perfil }
//   projetarPelaEspecificacao(texto | caminho | Buffer | lida, opcoes) → projeto + folhas, decisoes,
//                                pontosALevantar, faltaConfirmar, pendencias, materiais, textoEntrega
//   gerarPlanilhaPesquisaPrecos(projeto, opcoes)                  → Buffer .xlsx (formato da H&M)
// opcoes: { perfil: chave, nome: 'arquivo.pdf' (Buffer), aprendido, decisoes, respostas, pedido,
//           cliente, obra, precos: { aprendidos, referencias, estimativas }, contingencia }
// Sem IA: o perfil é escolhido pela palavra-chave do texto (perfil.detectar) ou o do quadro.

const fs = require('fs');
const { blocosDoArquivo, blocosDoTexto } = require('./texto');
const { lerRequisitos } = require('./leitor');
const { perfilDe, listarPerfis } = require('./perfis');
const DOCS = require('./documentos');
const PRECOS = require('./planilhaPrecos');

const PERFIL_PADRAO = 'quadro_forca_comando';

function escolherPerfil(blocos, opcoes) {
  if (opcoes.perfil) return typeof opcoes.perfil === 'string' ? perfilDe(opcoes.perfil) : opcoes.perfil;
  const texto = blocos.map(b => b.texto).join(' ');
  for (const p of listarPerfis()) {
    const completo = perfilDe(p.chave);
    if ((completo.detectar || []).some(r => new RegExp(r, 'iu').test(texto))) return completo;
  }
  return perfilDe(PERFIL_PADRAO);
}

const ehCaminho = (s) => typeof s === 'string' && s.length < 400 && !/\n/.test(s) && /\.(pdf|docx|xlsx|xlsm|txt|md|csv)$/i.test(s.trim()) && fs.existsSync(s.trim());

async function lerEspecificacao(entrada, opcoes = {}) {
  let blocos;
  let avisos = [];
  if (Buffer.isBuffer(entrada)) ({ blocos, avisos } = await blocosDoArquivo(entrada, opcoes.nome || 'especificacao.pdf'));
  else if (ehCaminho(entrada)) ({ blocos, avisos } = await blocosDoArquivo(fs.readFileSync(entrada.trim()), entrada.trim()));
  else blocos = blocosDoTexto(String(entrada ?? ''));
  const perfil = escolherPerfil(blocos, opcoes);
  const lidos = lerRequisitos(blocos, perfil, { aprendido: opcoes.aprendido });
  return { blocos, lidos, perfil: perfil.chave, avisos };
}

function folhasDoProjeto(projeto) {
  const fl = [
    ['FL01', 'Diagrama unifilar de força', `geral ${projeto.geral.Ir || projeto.geral.In} A, barramento, saídas e cargas`],
    ['FL02', 'Diagrama de comando (escada)', `${projeto.comando.reles.length} relés em ${projeto.comando.tensao}, gerado pelos blocos de função`],
    ['FL03', 'Relés, contatos e verificação funcional', `${projeto.funcional.filter(f => f.ok).length}/${projeto.funcional.length} cenários simulados`],
    ['FL04', 'Interfaces e réguas de bornes', projeto.reguas.map(r => `${r.id} (${r.total})`).join(', ')],
    ['FL05', 'Layout 2D: porta e placa', `${projeto.quadro.dimensao.a} × ${projeto.quadro.dimensao.l} × ${projeto.quadro.dimensao.p} mm`],
    ['FL06', 'Quadro de cargas, materiais, pendências e exceções', `${projeto.materiais.length} itens de material`],
    ['FL07', 'Memória de cálculo e decisões', `${projeto.decisoes.length} decisões justificadas`],
  ];
  return fl.map(([folha, titulo, conteudo]) => ({ folha, titulo, conteudo }));
}

async function projetarPelaEspecificacao(especificacao, opcoes = {}) {
  const lida = especificacao && typeof especificacao === 'object' && !Buffer.isBuffer(especificacao) && especificacao.lidos
    ? especificacao : await lerEspecificacao(especificacao, opcoes);
  const perfil = perfilDe(lida.perfil || PERFIL_PADRAO);
  const { solucionar } = require(require('path').join(__dirname, '..', '..', 'quadros', 'scripts', 'lib', 'especificacao.js'));
  const projeto = solucionar(lida.lidos, { ...opcoes, perfil });
  projeto.avisos.unshift(...(lida.avisos || []));
  const precos = await PRECOS.gerarPlanilhaPrecos(projeto, opcoes.precos || {}, { contingencia: opcoes.contingencia ?? 0.1 });
  return {
    ...projeto,
    lidos: lida.lidos,
    folhas: folhasDoProjeto(projeto),
    decisoes: projeto.decisoes.map(d => `${d.titulo}: ${d.texto}${d.criterio ? ` (${d.criterio})` : ''}`),
    decisoesDetalhe: projeto.decisoes,
    pontosALevantar: projeto.pontos.map(p => `${p.texto}${p.sugestao ? ` Sugestão: ${p.sugestao.texto}` : ''}`),
    pontosDetalhe: projeto.pontos,
    faltaConfirmar: projeto.pendencias.map(p => p.texto),
    resumoPrecos: precos.resumo,
    textoEntrega: DOCS.textoEntrega(projeto, precos.resumo),
  };
}

// (projeto, opcoes) → Buffer .xlsx
async function gerarPlanilhaPesquisaPrecos(projeto, opcoes = {}) {
  const r = await PRECOS.gerarPlanilhaPrecos(projeto, opcoes.precos || {}, { contingencia: opcoes.contingencia ?? 0.1 });
  return r.buffer;
}

module.exports = { lerEspecificacao, projetarPelaEspecificacao, gerarPlanilhaPesquisaPrecos, escolherPerfil, folhasDoProjeto, PERFIL_PADRAO };
