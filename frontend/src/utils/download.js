// Download de arquivos gerados pelo servidor (PDF, Excel, DXF, ZIP, 3D…).
//
// Antes cada tela tinha a sua cópia de "criar link e clicar", a sua leitura do
// erro e o seu jeito de achar o nome do arquivo — e uma delas pegava o
// filename="…" (a versão sem acento que o servidor manda só de reserva), o que
// baixava "Relatorio" no lugar de "Relatório". Agora é um lugar só.
//
// O servidor (backend/src/utils/nomeArquivoDownload.js) manda o nome assim:
//   Content-Disposition: attachment; filename="Orcamento.pdf"; filename*=UTF-8''Or%C3%A7amento.pdf
//   X-Nome-Arquivo: Or%C3%A7amento.pdf   (só em algumas rotas)
// O app é servido na mesma origem (e o `proxy` do package.json no
// desenvolvimento), então esses cabeçalhos chegam ao JavaScript sem CORS.

// decodeURIComponent estoura com "%" solto: aí vale o texto como veio
function decodificar(texto) {
  try { return decodeURIComponent(texto); } catch { return texto; }
}

// axios 1.x entrega AxiosHeaders (get sem diferenciar maiúsculas); nos testes
// e em respostas montadas à mão vem um objeto comum, com a chave minúscula
function lerCabecalho(headers, nome) {
  if (!headers) return '';
  let valor;
  if (typeof headers.get === 'function') valor = headers.get(nome);
  if (valor == null) valor = headers[nome.toLowerCase()] ?? headers[nome];
  return valor == null ? '' : String(valor).trim();
}

// filename*=charset'idioma'valor (RFC 5987). Em UTF-8 é %XX de UTF-8; em
// ISO-8859-1 cada %XX é um caractere (decodeURIComponent recusaria)
function nomeRfc5987(disposicao) {
  const m = /(?:^|;)\s*filename\*\s*=\s*"?([^']*)'[^']*'([^;"]+)"?/i.exec(disposicao);
  if (!m) return '';
  const valor = m[2].trim();
  if (/^utf-?8$/i.test(m[1].trim())) return decodificar(valor);
  return valor.replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// filename="…" (ou sem aspas). O "(?:^|;)" evita pegar o filename* acima.
function nomeSimples(disposicao) {
  const m = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]+))/i.exec(disposicao);
  if (!m) return '';
  return m[1] != null ? m[1].replace(/\\(.)/g, '$1') : m[2].trim();
}

// Nome do arquivo, do mais confiável ao menos: X-Nome-Arquivo, filename*
// (com acento), filename="…" (reserva ASCII) e, por fim, o padrão da tela
export function nomeDoArquivo(headers, padrao = 'arquivo') {
  const doCabecalho = lerCabecalho(headers, 'X-Nome-Arquivo');
  if (doCabecalho) {
    const nome = decodificar(doCabecalho).trim();
    if (nome) return nome;
  }
  const disposicao = lerCabecalho(headers, 'Content-Disposition');
  if (disposicao) {
    const nome = (nomeRfc5987(disposicao) || nomeSimples(disposicao)).trim();
    if (nome) return nome;
  }
  return padrao;
}

// Entrega o blob ao navegador como download. O revoke espera um pouco: feito
// logo após o click, alguns navegadores (Firefox, Safari) cancelam o download.
export function salvarBlob(blob, nome) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

// Aguarda a requisição (feita com responseType: 'blob'), decide o nome e
// salva. Devolve a resposta para a tela ler outros cabeçalhos (X-Arquivos,
// X-Ambientes-Nao-Encontrados…). Erro da requisição sobe para quem chamou —
// use mensagemDeErro no catch.
export async function baixarArquivo(promessaAxios, nomePadrao) {
  const resposta = await promessaAxios;
  const dados = resposta.data instanceof Blob
    ? resposta.data
    : new Blob([resposta.data], { type: lerCabecalho(resposta.headers, 'Content-Type') || 'application/octet-stream' });
  salvarBlob(dados, nomeDoArquivo(resposta.headers, nomePadrao));
  return resposta;
}

// Blob.text() não existe em navegadores antigos nem no jsdom dos testes
function textoDoBlob(blob) {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(blob);
  });
}

// Mensagem do servidor ({ erro: '…' }) para o toast. Num download o axios
// entrega o corpo do erro como Blob (por causa do responseType: 'blob'), e o
// JSON fica lá dentro — sem isto a tela mostrava só a mensagem genérica.
export async function mensagemDeErro(err, padrao) {
  const dados = err?.response?.data;
  if (!dados) return padrao;
  try {
    if (dados instanceof Blob) return JSON.parse(await textoDoBlob(dados))?.erro || padrao;
    if (typeof dados === 'string') return JSON.parse(dados)?.erro || padrao;
    return dados.erro || padrao;
  } catch {
    return padrao; // corpo que não é JSON (página de erro do proxy, PDF…)
  }
}
