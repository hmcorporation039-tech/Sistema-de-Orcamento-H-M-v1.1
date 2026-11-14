// Agentes PRÓPRIOS da H&M (pedido do usuário, 09/11/2026: "desenvolva agentes próprios dentro do nosso sistema
// e alimente o nosso assistente com todas essas informações; temos que depender cada vez menos de IA em nossas
// disciplinas"). Cada agente é uma sequência FIXA de passos que chama os motores determinísticos que o sistema já
// tem (leitura de PDF/DWG/DXF com o objetivo do projeto, skills por disciplina, geração de orçamento, catálogo,
// histórico e referências de preço). Nenhum passo chama IA: a IA só entra quando o agente PARA e diz que precisa
// dela (campo `pedirIa`), e mesmo aí só sugere — o que é estimado fica [CONFERIR] e o que não tem preço, "a cotar".
//
// Este arquivo é só DADO (o que cada agente recebe, os passos, as ferramentas internas, as saídas, quando para e
// quando pede ajuda à IA): a tela, o assistente (prompt e ferramentas) e a base de conhecimento leem daqui. A
// execução de cada passo fica em services/agentes/passos.js; a fila e o estado, em services/agentes/executor.js.
//
// Campos:
//   chave        identificador gravado em agentes_execucoes.agente (não muda)
//   nome/resumo  o que aparece na tela e no assistente
//   disciplinas  ['*'] = todas; senão as chaves de skills/_comum/disciplinas.js
//   recebe       entradas aceitas ({ campo, tipo, descricao, opcional?, padrao?, valores?, formatos? })
//   exigeUm      ao menos UMA destas entradas precisa vir (ou o agente pergunta)
//   passos       { chave, rotulo, ferramenta, opcional? } na ordem de execução
//   ferramentas  ferramentas internas que o agente chama (services/agentes/ferramentasInternas.js)
//   saidas       o que entrega
//   parada       quando para sozinho (e devolve a pendência ao usuário)
//   pedirIa      quando sugere pedir ajuda à IA (o usuário decide: "use a IA")
//   usaCota      gasta cota de IA/web? só com a permissão do usuário (pesquisar_mercado)
//   situacao     'pronto' | 'aguardando_modulo' (o módulo de que depende ainda não existe)

const ARQUIVO_PROJETO = ['pdf', 'dwg', 'dxf'];
const ARQUIVO_LISTA = ['xlsx', 'csv'];

const AGENTES = [
  {
    chave: 'analise_projeto',
    nome: 'Agente de análise de projeto',
    resumo: 'Lê o arquivo do projeto (PDF, DWG ou DXF) pelo analisador do sistema, entende o que é o projeto (disciplina e tipo, vista principal × contexto × apoio, componentes pela relação de materiais e pelas legendas, abrigo na escala das cotas) e devolve os achados e as pendências [CONFERIR]. Com "mostrar_3d", diz se o modelo 3D está pronto e onde abrir.',
    disciplinas: ['*'],
    recebe: [
      { campo: 'arquivo_id', tipo: 'arquivo', formatos: ARQUIVO_PROJETO, descricao: 'arquivo anexado à conversa (PDF, DWG ou DXF)' },
      { campo: 'analise_id', tipo: 'id', descricao: 'análise já salva: só lê, não refaz' },
      { campo: 'disciplinas', tipo: 'lista', opcional: true, descricao: 'chaves da análise; sem elas, deduz pelo nome e pelo texto do arquivo' },
      { campo: 'finalidade', tipo: 'texto', opcional: true, valores: ['orcamento', 'elaboracao'], padrao: 'orcamento' },
      { campo: 'mostrar_3d', tipo: 'booleano', opcional: true, padrao: false },
      { campo: 'obra_id', tipo: 'id', opcional: true },
    ],
    exigeUm: ['arquivo_id', 'analise_id'],
    passos: [
      { chave: 'analisar', rotulo: 'Lendo o arquivo pelo analisador do sistema (sem IA)', ferramenta: 'analisar_arquivo' },
      { chave: 'objetivo', rotulo: 'Entendendo o que é o projeto (objetivo, vistas e legendas)', ferramenta: 'objetivo_da_analise' },
      { chave: 'achados', rotulo: 'Reunindo achados e pendências', ferramenta: 'ver_analise' },
      { chave: 'modelo3d', rotulo: 'Conferindo o modelo 3D', ferramenta: 'situacao_3d', opcional: true },
    ],
    ferramentas: ['analisar_arquivo', 'ver_analise', 'objetivo_da_analise', 'situacao_3d'],
    saidas: ['análise de projeto salva (link)', 'o que é o projeto (objetivo)', 'achados de compatibilização', 'pendências [CONFERIR]', 'situação do 3D'],
    parada: ['arquivo que não é PDF, DWG ou DXF', 'disciplina que não dá para deduzir pelo nome nem pelo texto (pergunta ao usuário)', 'análise sem nada lido (PDF escaneado ou DWG só com traços)'],
    pedirIa: ['PDF escaneado, sem texto: a IA pode enriquecer a análise pela imagem (só sugere; tudo fica a conferir)'],
    usaCota: false,
    situacao: 'pronto',
  },
  {
    chave: 'projeto_disciplina',
    nome: 'Agente de projeto da disciplina',
    resumo: 'Da análise (ou do arquivo) ao projeto da disciplina: cria o projeto pela ponte análise → skill, roda o cálculo da skill (norma da disciplina), gera os documentos (memorial e planilhas) e lista os [CONFERIR] da skill.',
    disciplinas: ['*'],
    recebe: [
      { campo: 'analise_id', tipo: 'id', descricao: 'análise de onde o projeto nasce' },
      { campo: 'arquivo_id', tipo: 'arquivo', formatos: ARQUIVO_PROJETO, descricao: 'arquivo do projeto: o agente analisa antes (finalidade elaboração)' },
      { campo: 'projeto_id', tipo: 'id', descricao: 'projeto já criado: só calcula e gera os documentos' },
      { campo: 'disciplina', tipo: 'texto', opcional: true, descricao: 'chave da disciplina; sem ela, vem do objetivo do projeto ou da única disciplina da análise' },
      { campo: 'documentos', tipo: 'booleano', opcional: true, padrao: true, descricao: 'gerar memorial e planilha' },
    ],
    exigeUm: ['analise_id', 'arquivo_id', 'projeto_id'],
    passos: [
      { chave: 'analise', rotulo: 'Garantindo a análise do projeto', ferramenta: 'analisar_arquivo', opcional: true },
      { chave: 'disciplina', rotulo: 'Escolhendo a disciplina', ferramenta: 'objetivo_da_analise' },
      { chave: 'projeto', rotulo: 'Criando o projeto da disciplina (ponte análise → skill)', ferramenta: 'criar_projeto_de_analise' },
      { chave: 'calculo', rotulo: 'Calculando pela skill da norma', ferramenta: 'calcular_projeto' },
      { chave: 'documentos', rotulo: 'Gerando os documentos da skill', ferramenta: 'documento_do_projeto', opcional: true },
    ],
    ferramentas: ['analisar_arquivo', 'ver_analise', 'objetivo_da_analise', 'criar_projeto_de_analise', 'ver_projeto', 'calcular_projeto', 'documento_do_projeto', 'salvar_arquivo'],
    saidas: ['projeto da disciplina (link)', 'indicadores do cálculo', 'avisos da skill [CONFERIR]', 'memorial e planilha (arquivos da conversa)'],
    parada: ['disciplina sem skill de projeto', 'análise com várias disciplinas e nenhuma escolhida (pergunta)', 'erro de validação do cálculo (dado faltando no formulário)'],
    pedirIa: ['formulário da skill com dado que o desenho não traz (ex.: potência de equipamento sem placa): a IA pode sugerir valor típico [CONFERIR]'],
    usaCota: false,
    situacao: 'pronto',
  },
  {
    chave: 'orcamento',
    nome: 'Agente de orçamento',
    resumo: 'Do projeto ou da análise ao rascunho de proposta: gera pelo motor de orçamento (catálogo e histórico por disciplina), procura referência de preço dos materiais (cotações de fornecedores, vendido pela H&M, catálogo, SINAPI) e entrega a planilha de pesquisa de preços no critério QF-CAG; o que não tem preço fica "a cotar" com a origem. Pesquisa na web só com a permissão do usuário (usa cota).',
    disciplinas: ['*'],
    recebe: [
      { campo: 'projeto_id', tipo: 'id', descricao: 'projeto da disciplina' },
      { campo: 'analise_id', tipo: 'id', descricao: 'análise de projeto' },
      { campo: 'arquivo_id', tipo: 'arquivo', formatos: ARQUIVO_PROJETO, descricao: 'arquivo do projeto: o agente analisa antes (finalidade orçamento)' },
      { campo: 'modo', tipo: 'texto', opcional: true, descricao: 'modo do orçamento do projeto (execucao, fabricacao, inspecao…); padrão: o primeiro do projeto' },
      { campo: 'disciplinas', tipo: 'lista', opcional: true, descricao: 'quando analisa um arquivo' },
      { campo: 'pesquisar_mercado', tipo: 'booleano', opcional: true, padrao: false, descricao: 'pesquisar na web os itens sem referência (usa cota)' },
    ],
    exigeUm: ['projeto_id', 'analise_id', 'arquivo_id'],
    passos: [
      { chave: 'origem', rotulo: 'Garantindo a análise ou o projeto', ferramenta: 'analisar_arquivo', opcional: true },
      { chave: 'rascunho', rotulo: 'Gerando o rascunho de proposta pelo motor de orçamento', ferramenta: 'gerar_orcamento' },
      { chave: 'precos', rotulo: 'Procurando referência de preço (catálogo, histórico, cotações)', ferramenta: 'referencias_de_preco' },
      { chave: 'mercado', rotulo: 'Pesquisando na web os itens sem referência (usa cota)', ferramenta: 'pesquisar_mercado', opcional: true },
      { chave: 'planilha', rotulo: 'Montando a planilha de pesquisa de preços (QF-CAG)', ferramenta: 'planilha_precos' },
    ],
    ferramentas: ['analisar_arquivo', 'gerar_orcamento', 'ver_proposta', 'referencias_de_preco', 'pesquisar_mercado', 'planilha_precos', 'salvar_arquivo'],
    saidas: ['rascunho de proposta (link)', 'itens a cotar com a origem', 'planilha de pesquisa de preços QF-CAG (Excel)'],
    parada: ['a análise/projeto já tem proposta Ativa de outra pessoa ou de outra conversa (não sobrescreve: pede confirmação)', 'projeto sem modo de orçamento'],
    pedirIa: ['item sem nenhuma referência de preço: a pesquisa na web (usa cota) só com a permissão do usuário'],
    usaCota: 'so_com_permissao',
    situacao: 'pronto',
  },
  {
    chave: 'pesquisa_precos',
    nome: 'Agente de pesquisa de preços',
    resumo: 'Lista de materiais → planilha de pesquisa de preços no critério QF-CAG (origem Pesquisado / Estimativa H&M / Cliente, faixa encontrada, fonte, data-base, contingência editável, total de material sem BDI e sem mão de obra). Usa as referências da H&M; a web só com permissão.',
    disciplinas: ['*'],
    recebe: [
      { campo: 'proposta_id', tipo: 'id', descricao: 'materiais de uma proposta' },
      { campo: 'analise_id', tipo: 'id', descricao: 'materiais de uma análise' },
      { campo: 'arquivo_id', tipo: 'arquivo', formatos: ARQUIVO_LISTA, descricao: 'planilha (XLSX/CSV) com descrição, quantidade e unidade' },
      { campo: 'itens', tipo: 'lista', descricao: 'lista livre: [{ descricao, quantidade, unidade, tag?, grupo?, preco_cliente? }]' },
      { campo: 'titulo', tipo: 'texto', opcional: true },
      { campo: 'anteprojeto', tipo: 'booleano', opcional: true, descricao: 'a lista veio de um anteprojeto (compara modelo especificado × pesquisado)' },
      { campo: 'origem_lista', tipo: 'texto', opcional: true, descricao: 'de onde veio a lista (ex.: projeto do quadro da execução #12)' },
      { campo: 'contingencia_pct', tipo: 'numero', opcional: true, padrao: 10 },
      { campo: 'pesquisar_mercado', tipo: 'booleano', opcional: true, padrao: false, descricao: 'pesquisar na web os itens sem referência (usa cota)' },
    ],
    exigeUm: ['proposta_id', 'analise_id', 'arquivo_id', 'itens'],
    passos: [
      { chave: 'lista', rotulo: 'Lendo a lista de materiais', ferramenta: 'ler_lista_materiais' },
      { chave: 'referencias', rotulo: 'Procurando referência de preço (catálogo, histórico, cotações, SINAPI)', ferramenta: 'referencias_de_preco' },
      { chave: 'mercado', rotulo: 'Pesquisando na web os itens sem referência (usa cota)', ferramenta: 'pesquisar_mercado', opcional: true },
      { chave: 'planilha', rotulo: 'Montando a planilha QF-CAG', ferramenta: 'planilha_precos' },
    ],
    ferramentas: ['ver_proposta', 'ver_analise', 'ler_lista_materiais', 'referencias_de_preco', 'pesquisar_mercado', 'planilha_precos', 'salvar_arquivo'],
    saidas: ['planilha de pesquisa de preços (Excel) no critério QF-CAG', 'resumo por origem do preço', 'itens a cotar'],
    parada: ['lista vazia ou sem coluna de descrição'],
    pedirIa: ['item sem referência nenhuma: pesquisa na web (usa cota) só com a permissão do usuário'],
    usaCota: 'so_com_permissao',
    situacao: 'pronto',
  },
  {
    chave: 'quadro_especificacao',
    nome: 'Agente de projeto pela especificação',
    resumo: 'Especificação do cliente → projeto completo pelo perfil da disciplina: quadro de força e comando, painel de pressurização e CAG com sequência de chillers (unifilar, comando por relés, interfaces, layout, 3D com simulação) e, pelas skills, QD predial, automação/BMS, central de incêndio (com a matriz de causa e efeito) e subestação de MT — com materiais, pendências, pontos a levantar, planilha de pesquisa de preço QF-CAG e aprendizado.',
    disciplinas: ['quadros', 'pressurizacao', 'climatizacao', 'eletrica', 'automacao', 'incendio', 'media_tensao'],
    recebe: [
      { campo: 'arquivo_id', tipo: 'arquivo', formatos: ['pdf', 'docx', 'xlsx', 'csv'], descricao: 'especificação do cliente' },
      { campo: 'texto', tipo: 'texto', descricao: 'especificação escrita na conversa' },
    ],
    exigeUm: ['arquivo_id', 'texto'],
    passos: [
      { chave: 'modulo', rotulo: 'Conferindo o módulo da skill quadros', ferramenta: 'modulo_quadros' },
      { chave: 'especificacao', rotulo: 'Lendo a especificação', ferramenta: 'ler_especificacao' },
      { chave: 'projeto', rotulo: 'Gerando o projeto do quadro pela skill', ferramenta: 'projetar_quadro' },
      { chave: 'planilha', rotulo: 'Planilha de pesquisa de preços (QF-CAG)', ferramenta: 'planilha_precos', opcional: true },
    ],
    ferramentas: ['modulo_quadros', 'ler_especificacao', 'projetar_quadro', 'planilha_precos', 'salvar_arquivo'],
    saidas: ['projeto do quadro (unifilar, layout, materiais, pendências)', 'planilha QF-CAG'],
    parada: ['módulo de especificação da skill quadros ainda não instalado (aguardando módulo)', 'especificação sem corrente/tensão do quadro (pendência)'],
    pedirIa: ['texto livre da especificação que o leitor não entende: a IA pode sugerir a leitura (a conferir)'],
    usaCota: false,
    // trocado em tempo de execução pelo adaptador (services/agentes/adaptadorQuadros.js) quando o módulo existe
    situacao: 'aguardando_modulo',
  },
];

const MAPA = new Map(AGENTES.map(a => [a.chave, a]));
const obterAgente = (chave) => MAPA.get(String(chave || '')) || null;

// Situação de cada agente na hora (o de quadro depende do módulo da skill quadros existir)
function situacaoDe(agente) {
  if (agente.chave === 'quadro_especificacao') {
    try { return require('./adaptadorQuadros').moduloDisponivel() ? 'pronto' : 'aguardando_modulo'; } catch { return 'aguardando_modulo'; }
  }
  return agente.situacao;
}

// O que vai para a tela, para o assistente e para a base de conhecimento (sem funções)
function listarAgentes() {
  return AGENTES.map(a => ({ ...a, situacao: situacaoDe(a) }));
}

// Confere a entrada mínima (ao menos uma das exigidas) e os tipos simples. Devolve { ok, erros, entrada } com a
// entrada limpa (só os campos conhecidos).
function validarEntrada(agente, entrada = {}) {
  const e = entrada && typeof entrada === 'object' ? entrada : {};
  const limpa = {};
  const erros = [];
  for (const c of agente.recebe) {
    const v = e[c.campo];
    if (v == null || v === '') continue;
    if (c.tipo === 'id' || c.tipo === 'arquivo') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 2147483647) { erros.push(`${c.campo} inválido`); continue; }
      limpa[c.campo] = n;
    } else if (c.tipo === 'booleano') {
      limpa[c.campo] = v === true || v === 'true' || v === 1 || v === '1';
    } else if (c.tipo === 'numero') {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) { erros.push(`${c.campo} inválido`); continue; }
      limpa[c.campo] = n;
    } else if (c.tipo === 'lista') {
      if (!Array.isArray(v)) { erros.push(`${c.campo} precisa ser uma lista`); continue; }
      limpa[c.campo] = v.slice(0, 2000);
    } else {
      const t = String(v).trim();
      if (c.valores && !c.valores.includes(t)) { erros.push(`${c.campo} deve ser ${c.valores.join(' ou ')}`); continue; }
      limpa[c.campo] = t.slice(0, 20000);
    }
  }
  if (agente.exigeUm?.length && !agente.exigeUm.some(k => limpa[k] != null && !(Array.isArray(limpa[k]) && !limpa[k].length))) {
    erros.push(`informe ${agente.exigeUm.join(' ou ')}`);
  }
  return { ok: erros.length === 0, erros, entrada: limpa };
}

module.exports = { AGENTES, obterAgente, listarAgentes, situacaoDe, validarEntrada, ARQUIVO_PROJETO, ARQUIVO_LISTA };
