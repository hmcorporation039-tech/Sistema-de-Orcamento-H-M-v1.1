const path = require('path');
const { hojeBrasilia } = require('./dataHoje');

// Versão 2.1 (pedido do usuário de 27/10/2026): "nem sempre uma análise de
// projetos vai ter que gerar um laudo; laudos serão pedidos quando necessário".
//
// - Análise de projeto (analises_projeto.finalidade):
//     'orcamento'  — orçar a partir do projeto recebido (itens + "Gerar orçamento")
//     'elaboracao' — a H&M vai DEFINIR/ENTREGAR o projeto a partir do arquitetônico
//   Nenhuma das duas cria laudo.
// - Registro de disciplina (laudos_projetos.tipo):
//     'projeto' — documentos de projeto, desenhos, entregas e orçamento de execução
//     'laudo'   — documentos de laudo (inspeção, checklist, fotos, medições) e orçamento de inspeção/correção
// A classificação de cada documento/modo de orçamento das skills fica num
// lugar só: skills/_comum/tipos-documento.js (arquivo sem dependências).
const T = require(path.join(require('../config/caminhos').COMUM, 'tipos-documento.js'));

const FINALIDADES = {
  orcamento: 'Orçamento',
  elaboracao: 'Elaboração de projeto',
};
const TIPOS_REGISTRO = { projeto: 'Projeto', laudo: 'Laudo' };

// valor do pedido → valor válido, `padrao` quando ausente, null quando inválido
function lerOpcao(valor, validos, padrao) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const v = String(valor).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(validos, v) ? v : null;
}
const lerFinalidade = (valor, padrao = 'orcamento') => lerOpcao(valor, FINALIDADES, padrao);
const lerTipoRegistro = (valor, padrao = 'laudo') => lerOpcao(valor, TIPOS_REGISTRO, padrao);

// O formulário tem dado de INSPEÇÃO preenchido? (checklist com C/NC/NA,
// qualquer tabela de inspeção com linha — NCs, ensaios, medições, fotos,
// documentos recebidos, instrumentos — ou nº/data da inspeção)
function temDadosDeInspecao(dados) {
  const insp = dados && typeof dados === 'object' ? dados.inspecao : null;
  if (!insp || typeof insp !== 'object' || Array.isArray(insp)) return false;
  for (const [chave, valor] of Object.entries(insp)) {
    if (chave === 'checklist') {
      if (Array.isArray(valor) && valor.some(c => c && ['C', 'NC', 'NA'].includes(c.situacao))) return true;
    } else if (Array.isArray(valor)) {
      if (valor.length) return true;
    } else if ((chave === 'documento_n' || chave === 'data_inspecao') && typeof valor === 'string' && valor.trim()) {
      return true;
    }
  }
  return false;
}

// Tipo de um registro que existia antes da 2.1 (migração 2.0-13). Regra, na ordem:
//   1. tem dado de inspeção (checklist/NC/medição/foto/nº da inspeção) → laudo
//   2. nasceu de uma análise de projeto ("Calcular pela norma") → projeto
//   3. só tem orçamento(s) de execução ligado(s) → projeto
//   4. o resto → laudo (era o nome da aba; o SPDA da produção é laudo)
function classificarExistente(row, totalFotos = 0) {
  if (Number(totalFotos) > 0 || temDadosDeInspecao(row.dados)) return 'laudo';
  if (row.analise_id) return 'projeto';
  const modos = Object.keys(row.propostas || {});
  if (modos.length && modos.every(m => T.usoDoModo(row.disciplina, m) === 'projeto')) return 'projeto';
  return 'laudo';
}

// ── Entregas do projeto ──────────────────────────────────────────────────
// O que o projetista escolhe entregar. DWG: o LibreDWG instalado
// (@mlightcad/libredwg-web) foi compilado sem escrita de DWG — só lê —, então
// a planta sai em DXF e o rótulo diz isso.
const ENTREGAS = [
  { chave: 'definicoes', rotulo: 'Definições técnicas', descricao: 'Memorial descritivo e de cálculo e planilhas de especificação/materiais (Word e Excel).' },
  { chave: 'asbuilt', rotulo: 'As-built', descricao: 'A mesma documentação marcada AS BUILT (título/carimbo, data e revisão). Atualize o formulário com o que foi executado antes de gerar.' },
  { chave: 'dxf', rotulo: 'DXF (abre no AutoCAD; DWG não é gerado)', descricao: 'Planta com os pontos da disciplina, legenda e carimbo — precisa da arquitetura (DWG/DXF) enviada.', requer: 'planta' },
  { chave: 'qet', rotulo: 'QElectroTech (.qet)', descricao: 'Diagrama unifilar para o QElectroTech.', requer: 'unifilar' },
  { chave: 'pdf', rotulo: 'PDF', descricao: 'Folha de entrega em PDF com a lista dos arquivos e o resumo técnico do cálculo. O memorial em PDF sai pelo Word (Arquivo › Salvar como › PDF) — o sistema não converte Word em PDF.' },
];
const CHAVES_ENTREGA = ENTREGAS.map(e => e.chave);

// corpo do pedido → { itens[], asBuilt: { data, revisao } | null } ou { erro }
function lerPedidoEntrega(corpo, { temPlanta = false, temUnifilar = false } = {}) {
  const itens = [...new Set(Array.isArray(corpo?.itens) ? corpo.itens.map(String) : [])];
  const invalido = itens.find(i => !CHAVES_ENTREGA.includes(i));
  if (invalido) return { erro: `Entrega desconhecida: ${invalido}.` };
  if (!itens.length) return { erro: 'Escolha pelo menos uma entrega.' };
  if (itens.includes('dxf') && !temPlanta) return { erro: 'A planta (DXF) ainda não existe para esta disciplina.' };
  if (itens.includes('qet') && !temUnifilar) return { erro: 'O unifilar (QElectroTech) existe só para a elétrica predial, a industrial e a média tensão.' };
  let asBuilt = null;
  if (itens.includes('asbuilt')) {
    const data = String(corpo?.as_built?.data || '').trim() || hojeBrasilia();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: 'Data do as-built inválida (use AAAA-MM-DD).' };
    asBuilt = { data, revisao: String(corpo?.as_built?.revisao || '').trim().slice(0, 60) };
  }
  // As-built sozinho = as-built das definições técnicas
  const conteudo = itens.filter(i => i !== 'asbuilt');
  if (!conteudo.length) conteudo.push('definicoes');
  return { itens: conteudo, escolhidos: itens, asBuilt };
}

module.exports = {
  FINALIDADES, TIPOS_REGISTRO, ENTREGAS, CHAVES_ENTREGA,
  lerFinalidade, lerTipoRegistro, temDadosDeInspecao, classificarExistente, lerPedidoEntrega,
  tiposDocumento: T,
};
