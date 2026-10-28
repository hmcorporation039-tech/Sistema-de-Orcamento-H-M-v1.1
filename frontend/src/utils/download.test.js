import { nomeDoArquivo, salvarBlob, baixarArquivo, mensagemDeErro } from './download';

// O cabeçalho que o servidor monta de verdade (utils/nomeArquivoDownload.js).
// Quando o backend está ao lado (cópia de trabalho), o teste de ida e volta
// usa a função de lá; com o frontend sozinho, só os casos escritos à mão.
let contentDisposition = null;
try {
  // eslint-disable-next-line
  contentDisposition = require('../../../backend/src/utils/nomeArquivoDownload.js').contentDisposition;
} catch { /* frontend sozinho */ }

describe('nomeDoArquivo', () => {
  test('X-Nome-Arquivo (codificado) tem prioridade', () => {
    const headers = {
      'x-nome-arquivo': encodeURIComponent('Relatório de inspeção.docx'),
      'content-disposition': 'attachment; filename="Outro.docx"',
    };
    expect(nomeDoArquivo(headers, 'padrao.docx')).toBe('Relatório de inspeção.docx');
  });

  test('filename* (RFC 5987) vence o filename="…" sem acento', () => {
    const headers = { 'content-disposition': "attachment; filename=\"Compatibilizacao_Joao.pdf\"; filename*=UTF-8''Compatibiliza%C3%A7%C3%A3o_Jo%C3%A3o.pdf" };
    expect(nomeDoArquivo(headers, 'x.pdf')).toBe('Compatibilização_João.pdf');
  });

  test('filename* em outra ordem, maiúsculas e ISO-8859-1', () => {
    expect(nomeDoArquivo({ 'content-disposition': "attachment; FILENAME*=utf-8'pt-BR'Or%C3%A7amento%20final.xlsx; filename=\"Orcamento final.xlsx\"" }, 'x'))
      .toBe('Orçamento final.xlsx');
    expect(nomeDoArquivo({ 'content-disposition': "attachment; filename*=ISO-8859-1''Or%E7amento.pdf" }, 'x'))
      .toBe('Orçamento.pdf');
  });

  test('só filename="…" (com e sem aspas)', () => {
    expect(nomeDoArquivo({ 'content-disposition': 'attachment; filename="planta.dxf"' }, 'x')).toBe('planta.dxf');
    expect(nomeDoArquivo({ 'content-disposition': 'inline; filename=boletim_01.pdf' }, 'x')).toBe('boletim_01.pdf');
    expect(nomeDoArquivo({ 'content-disposition': 'attachment; filename="a \\"b\\".txt"' }, 'x')).toBe('a "b".txt');
  });

  test('sem nome no cabeçalho: usa o padrão da tela', () => {
    expect(nomeDoArquivo({}, 'Entrega.zip')).toBe('Entrega.zip');
    expect(nomeDoArquivo(undefined, 'Entrega.zip')).toBe('Entrega.zip');
    expect(nomeDoArquivo({ 'content-disposition': 'attachment' }, 'unifilar.qet')).toBe('unifilar.qet');
    expect(nomeDoArquivo({ 'x-nome-arquivo': '   ' }, 'p.pdf')).toBe('p.pdf');
  });

  test('"%" solto não derruba a leitura', () => {
    expect(nomeDoArquivo({ 'x-nome-arquivo': '100%_pronto.pdf' }, 'x')).toBe('100%_pronto.pdf');
  });

  test('cabeçalhos com get() (AxiosHeaders), sem diferenciar maiúsculas', () => {
    const mapa = { 'content-disposition': "attachment; filename=\"Relatorio.pdf\"; filename*=UTF-8''Relat%C3%B3rio.pdf" };
    const headers = { get: (n) => mapa[n.toLowerCase()] };
    expect(nomeDoArquivo(headers, 'x')).toBe('Relatório.pdf');
  });

  (contentDisposition ? test : test.skip)('ida e volta com o cabeçalho do backend', () => {
    const nomes = ["Contrato_José_D'Ávila_(2026)*.pdf", 'Relatório OS-0001.pdf', 'Compatibilização_São Paulo.pdf', 'simples.csv'];
    for (const nome of nomes) {
      expect(nomeDoArquivo({ 'content-disposition': contentDisposition(nome) }, 'x')).toBe(nome);
    }
  });
});

describe('mensagemDeErro', () => {
  test('lê o JSON de erro que veio dentro de um Blob', async () => {
    const err = { response: { data: new Blob([JSON.stringify({ erro: 'Laudo sem cálculo' })], { type: 'application/json' }) } };
    expect(await mensagemDeErro(err, 'Erro ao gerar')).toBe('Laudo sem cálculo');
  });

  test('Blob que não é JSON, ou JSON sem "erro": padrão', async () => {
    expect(await mensagemDeErro({ response: { data: new Blob(['<html>502</html>']) } }, 'Erro ao gerar')).toBe('Erro ao gerar');
    expect(await mensagemDeErro({ response: { data: new Blob(['{"ok":false}']) } }, 'Erro ao gerar')).toBe('Erro ao gerar');
  });

  test('objeto e texto JSON', async () => {
    expect(await mensagemDeErro({ response: { data: { erro: 'Sem permissão' } } }, 'x')).toBe('Sem permissão');
    expect(await mensagemDeErro({ response: { data: '{"erro":"Não encontrado"}' } }, 'x')).toBe('Não encontrado');
  });

  test('sem resposta (rede, tempo esgotado): padrão', async () => {
    expect(await mensagemDeErro(new Error('timeout'), 'Erro ao gerar PDF')).toBe('Erro ao gerar PDF');
    expect(await mensagemDeErro(undefined, 'Erro')).toBe('Erro');
  });
});

describe('salvarBlob e baixarArquivo', () => {
  let criados;
  let cliques;
  beforeEach(() => {
    jest.useFakeTimers();
    criados = [];
    cliques = [];
    window.URL.createObjectURL = jest.fn((b) => { criados.push(b); return `blob:teste/${criados.length}`; });
    window.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function clicar() {
      cliques.push({ href: this.getAttribute('href'), download: this.download, noDocumento: document.body.contains(this) });
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('salvarBlob clica num link com o nome e libera a URL depois', () => {
    const blob = new Blob(['a']);
    salvarBlob(blob, 'Relatório.pdf');
    expect(cliques).toEqual([{ href: 'blob:teste/1', download: 'Relatório.pdf', noDocumento: true }]);
    expect(document.querySelectorAll('a').length).toBe(0);
    expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:teste/1');
  });

  test('baixarArquivo usa o nome do servidor e devolve a resposta', async () => {
    const resposta = {
      data: new Blob(['zip']),
      headers: { 'x-nome-arquivo': encodeURIComponent('Entrega — R01.zip'), 'x-arquivos': 'a.pdf; b.dxf' },
    };
    const r = await baixarArquivo(Promise.resolve(resposta), 'Entrega.zip');
    expect(r).toBe(resposta);
    expect(cliques[0].download).toBe('Entrega — R01.zip');
    expect(criados[0]).toBe(resposta.data);
  });

  test('baixarArquivo sem nome do servidor usa o padrão; dado não-Blob vira Blob', async () => {
    await baixarArquivo(Promise.resolve({ data: 'a;b\n1;2', headers: { 'content-type': 'text/csv' } }), 'Financeiro.csv');
    expect(cliques[0].download).toBe('Financeiro.csv');
    expect(criados[0]).toBeInstanceOf(Blob);
    expect(criados[0].type).toBe('text/csv');
  });

  test('baixarArquivo não salva nada quando a requisição falha', async () => {
    const falha = Object.assign(new Error('500'), { response: { data: new Blob(['{"erro":"Falhou"}']) } });
    await expect(baixarArquivo(Promise.reject(falha), 'x.pdf')).rejects.toBe(falha);
    expect(cliques).toEqual([]);
  });
});
