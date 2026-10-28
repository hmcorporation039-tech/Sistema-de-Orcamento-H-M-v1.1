// Esquema de formulário para a tela do sistema (Análise de Projeto → Laudos e
// projetos). A tela desenha o formulário a partir deste esquema, então cada
// disciplina descreve só os seus campos, sem escrever tela nova.
//
// Seção: { titulo, aberta, resumo: 'caminho' | null, itens: [...] }
// Itens:
//   { tipo: 'grade', colunas, campos: [campo] }
//   { tipo: 'tabela', caminho, rotuloAdicionar, novaLinha, colunas: [coluna] }
//   { tipo: 'nota', texto }
//   { tipo: 'checklist', caminho }      — usa o checklistBase da disciplina
//   { tipo: 'fotos', caminho }
// Campo:  { caminho, rotulo, tipo: texto|numero|area|data|selecao|check, opcoes, largura: 'inteira', dica }
// Coluna: { campo, rotulo, tipo, opcoes, largura }

const op = (pares) => pares.map(([valor, rotulo]) => ({ valor: String(valor), rotulo }));

const UFS = op(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(u => [u, u]));
const SITUACAO = op([['NV', 'NV — não verificado'], ['C', 'C — conforme'], ['NC', 'NC — não conforme'], ['NA', 'NA — não aplicável']]);
const PRIORIDADE = op([['P1', 'P1 — 48 h'], ['P2', 'P2 — 30 dias'], ['P3', 'P3 — 90 dias'], ['P4', 'P4 — manutenção']]);

function secaoIdentificacao(numero = 1) {
  return {
    titulo: `${numero}. Identificação`, aberta: true, resumo: 'cliente.nome',
    itens: [
      { tipo: 'grade', colunas: 4, campos: [
        { caminho: 'cliente.nome', rotulo: 'Cliente (razão social)' },
        { caminho: 'cliente.cnpj', rotulo: 'CNPJ / CPF' },
        { caminho: 'cliente.contato', rotulo: 'Contato' },
        { caminho: 'cliente.endereco', rotulo: 'Endereço' },
        { caminho: 'cliente.cidade', rotulo: 'Cidade' },
        { caminho: 'cliente.uf', rotulo: 'UF', tipo: 'selecao', opcoes: [{ valor: '', rotulo: '—' }, ...UFS] },
        { caminho: 'obra.nome', rotulo: 'Obra / instalação', largura: 'inteira' },
        { caminho: 'obra.uso', rotulo: 'Uso / ocupação', largura: 'inteira' },
        { caminho: 'meta.data', rotulo: 'Data de emissão', tipo: 'data' },
        { caminho: 'meta.revisao', rotulo: 'Revisão', dica: 'R00, R01… seguido de descrição curta' },
        { caminho: 'meta.prefixo', rotulo: 'Prefixo dos arquivos' },
      ] },
      { tipo: 'nota', texto: 'Responsável técnico (preenchido pelo engenheiro que assina):' },
      { tipo: 'grade', colunas: 4, campos: [
        { caminho: 'responsavel.nome', rotulo: 'Engenheiro responsável' },
        { caminho: 'responsavel.titulo', rotulo: 'Título profissional', dica: 'Ex.: Engenheiro Eletricista — sai igual no item 1.2 e na assinatura' },
        { caminho: 'responsavel.crea', rotulo: 'CREA' },
        { caminho: 'responsavel.art', rotulo: 'ART nº' },
        { caminho: 'responsavel.cnpj', rotulo: 'CNPJ da empresa' },
      ] },
    ],
  };
}

function secaoInspecao(numero, tiposInspecao) {
  return {
    titulo: `${numero}. Inspeção — dados gerais (para o laudo)`, resumo: 'inspecao.documento_n',
    itens: [
      { tipo: 'nota', texto: 'Preencha esta parte quando o serviço incluir laudo de inspeção. Para projeto novo, pode deixar em branco.' },
      { tipo: 'grade', colunas: 4, campos: [
        { caminho: 'inspecao.tipo', rotulo: 'Tipo de inspeção', tipo: 'selecao', opcoes: tiposInspecao },
        { caminho: 'inspecao.data_inspecao', rotulo: 'Data da inspeção', tipo: 'data' },
        { caminho: 'inspecao.documento_n', rotulo: 'Documento nº' },
        { caminho: 'inspecao.equipe', rotulo: 'Equipe de campo' },
        { caminho: 'inspecao.abrangencia', rotulo: 'Abrangência', tipo: 'area', largura: 'inteira' },
        { caminho: 'inspecao.fora_escopo', rotulo: 'Fora do escopo', largura: 'inteira' },
      ] },
      { tipo: 'tabela', caminho: 'inspecao.documentos', rotuloAdicionar: 'Adicionar documento recebido',
        novaLinha: { documento: '', recebido: 'Sim', data_rev: '', situacao: '' },
        colunas: [{ campo: 'documento', rotulo: 'Documento' }, { campo: 'recebido', rotulo: 'Recebido?', largura: 90 }, { campo: 'data_rev', rotulo: 'Data/rev.', largura: 110 }, { campo: 'situacao', rotulo: 'Situação' }] },
      { tipo: 'tabela', caminho: 'inspecao.instrumentos', rotuloAdicionar: 'Adicionar instrumento',
        novaLinha: { instrumento: '', fabricante: '', modelo: '', serie: '', certificado: '', validade: '' },
        colunas: ['instrumento', 'fabricante', 'modelo', 'serie', 'certificado', 'validade'].map(c => ({ campo: c, rotulo: c === 'serie' ? 'Nº série' : c.charAt(0).toUpperCase() + c.slice(1) })) },
    ],
  };
}

function secaoChecklist(numero, total) {
  return { titulo: `${numero}. Checklist de inspeção (${total} itens)`, itens: [
    { tipo: 'nota', texto: 'Itens não preenchidos ficam NV (não verificado). Passe o mouse sobre o item para ver a referência normativa e como verificar.' },
    { tipo: 'checklist', caminho: 'inspecao.checklist' },
  ] };
}

function secaoNcs(numero, codigos) {
  return { titulo: `${numero}. Não conformidades`, itens: [
    { tipo: 'nota', texto: 'Descreva as NCs com recomendação própria; elas substituem a NC automática do mesmo item do checklist.' },
    { tipo: 'tabela', caminho: 'inspecao.ncs', rotuloAdicionar: 'Adicionar não conformidade',
      novaLinha: { item: '', local: '', descricao: '', requisito: '', recomendacao: '', prioridade: 'P3', foto: '' },
      colunas: [
        { campo: 'item', rotulo: 'Item', tipo: 'selecao', opcoes: [{ valor: '', rotulo: '—' }, ...codigos.map(c => ({ valor: c, rotulo: c }))], largura: 80 },
        { campo: 'local', rotulo: 'Local', largura: 140 }, { campo: 'descricao', rotulo: 'Descrição', tipo: 'area' },
        { campo: 'requisito', rotulo: 'Requisito', largura: 140 }, { campo: 'recomendacao', rotulo: 'Recomendação', tipo: 'area' },
        { campo: 'prioridade', rotulo: 'Prior.', tipo: 'selecao', opcoes: PRIORIDADE, largura: 120 }, { campo: 'foto', rotulo: 'Fotos', largura: 90 },
      ] },
  ] };
}

function secaoFotos(numero) {
  return { titulo: `${numero}. Registro fotográfico`, itens: [{ tipo: 'fotos', caminho: 'inspecao.fotos' }] };
}

module.exports = { op, UFS, SITUACAO, PRIORIDADE, secaoIdentificacao, secaoInspecao, secaoChecklist, secaoNcs, secaoFotos };
