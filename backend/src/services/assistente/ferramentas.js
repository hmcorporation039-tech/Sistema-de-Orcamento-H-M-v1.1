// Lista das ferramentas do MCP do assistente (src/mcp/assistenteFerramentas.mjs)
// com o texto mostrado na tela enquanto cada uma roda. É a mesma lista passada
// ao Claude Code em --allowedTools (nada além dela é liberado) e conferida pelo
// teste (testes/assistente.test.js): uma ferramenta nova precisa entrar aqui.
//
// De propósito NÃO existe ferramenta para aprovar/mudar status, enviar e-mail,
// gerar link de aprovação, excluir, mexer no catálogo ou na base de serviços:
// para isso há só `propor_acao` (ação pendente que o usuário aplica).
const NOME_SERVIDOR_MCP = 'hm';

const FERRAMENTAS = [
  { nome: 'buscar_obras', rotulo: 'Consultando as obras' },
  { nome: 'ver_obra', rotulo: 'Abrindo a obra' },
  { nome: 'buscar_propostas', rotulo: 'Consultando as propostas' },
  { nome: 'ver_proposta', rotulo: 'Abrindo a proposta' },
  { nome: 'buscar_clientes', rotulo: 'Consultando os clientes' },
  { nome: 'buscar_materiais', rotulo: 'Buscando no catálogo de materiais' },
  { nome: 'buscar_servicos', rotulo: 'Buscando na base de serviços' },
  { nome: 'buscar_kits', rotulo: 'Consultando os kits e composições' },
  { nome: 'historico_preco', rotulo: 'Consultando o histórico de preços' },
  { nome: 'ler_arquivo', rotulo: 'Lendo o arquivo' },
  { nome: 'analisar_arquivo', rotulo: 'Analisando o projeto' },
  { nome: 'ver_analise', rotulo: 'Abrindo a análise de projeto' },
  { nome: 'criar_projeto_disciplina', rotulo: 'Criando o projeto da disciplina' },
  { nome: 'ver_projeto', rotulo: 'Abrindo o projeto' },
  { nome: 'atualizar_dados_projeto', rotulo: 'Preenchendo os dados do projeto' },
  { nome: 'enviar_arquitetura', rotulo: 'Enviando a arquitetura ao projeto' },
  { nome: 'calcular_projeto', rotulo: 'Calculando pela skill da norma' },
  { nome: 'gerar_orcamento', rotulo: 'Montando o rascunho da proposta' },
  { nome: 'editar_rascunho', rotulo: 'Editando o rascunho da proposta' },
  { nome: 'inserir_kit', rotulo: 'Inserindo kit no rascunho' },
  { nome: 'pesquisar_preco_mercado', rotulo: 'Pesquisando preço de mercado (usa cota)' },
  { nome: 'consultar_norma', rotulo: 'Consultando a norma' },
  { nome: 'propor_acao', rotulo: 'Preparando uma ação para você confirmar' },
];

// Tipos de ação que o assistente pode PROPOR (propor_acao). A regra, a
// validação e a execução de cada um ficam em services/assistente/acoes.js (o
// teste confere que as duas listas batem).
const TIPOS_ACAO = ['mudar_status_proposta', 'enviar_email_proposta', 'gerar_link_aprovacao', 'excluir_proposta', 'excluir_analise',
  'excluir_projeto', 'editar_proposta', 'atualizar_projeto', 'atualizar_analise', 'alterar_preco_material', 'alterar_preco_servico'];

// Nomes que NÃO podem existir (o teste confere): o que só o usuário faz.
const PROIBIDAS = /aprovar|status|enviar_email|email|link_aprova|excluir|remover|apagar|deletar|delete|preco_catalogo|alterar_preco|catalogo_preco|usuario|senha|financeiro|contrato/i;

const nomeCompleto = (nome) => `mcp__${NOME_SERVIDOR_MCP}__${nome}`;
const ferramentasPermitidas = () => FERRAMENTAS.map(f => nomeCompleto(f.nome));
const nomeCurto = (nomeOuCompleto) => String(nomeOuCompleto || '').replace(`mcp__${NOME_SERVIDOR_MCP}__`, '');
const rotuloDa = (nomeOuCompleto) => FERRAMENTAS.find(f => f.nome === nomeCurto(nomeOuCompleto))?.rotulo || nomeCurto(nomeOuCompleto);

module.exports = { FERRAMENTAS, PROIBIDAS, TIPOS_ACAO, NOME_SERVIDOR_MCP, ferramentasPermitidas, rotuloDa, nomeCurto, nomeCompleto };
