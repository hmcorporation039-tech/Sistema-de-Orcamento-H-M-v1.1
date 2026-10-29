// Regras de segurança do servidor MCP (src/mcp/mcpServer.mjs), num módulo
// CommonJS à parte para o teste rodar sem subir o servidor (revisão de
// 27/10/2026).
//
// analisar_projeto lê um PDF do disco e o envia ao sistema. Antes aceitava
// QUALQUER caminho do PC: um texto malicioso lido pelo Claude (num PDF, num
// e-mail, numa página) podia pedir para "analisar" um PDF confidencial de outra
// pasta e ele ia parar dentro do sistema. Agora só vale arquivo dentro das
// pastas permitidas — MCP_PASTAS_PDF no backend/.env (várias, separadas por ";")
// ou, sem ela, as pastas de projetos recebidos, a pasta de arquivos do sistema
// e os Downloads do usuário do Windows.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { RAIZ_REPOSITORIO } = require('../config/caminhos');

const TAMANHO_MAX_PDF = 15 * 1024 * 1024; // o mesmo limite do upload da tela

// raizProjeto: pasta do sistema (ex.: C:\HM-Engenharia\hm-eng)
function pastasPermitidasPdf(env = process.env, raizProjeto = RAIZ_REPOSITORIO) {
  const configuradas = String(env.MCP_PASTAS_PDF || '').split(';').map(s => s.trim()).filter(Boolean);
  if (configuradas.length) return configuradas.map(p => path.resolve(p));
  return [
    path.join(raizProjeto, 'projetos-recebidos'),
    path.join(raizProjeto, 'Projetos recebidos clientes'),
    path.resolve(env.PASTA_ARQUIVOS_SISTEMA || path.join(raizProjeto, '..', 'Arquivos do Sistema')),
    path.join(os.homedir(), 'Downloads'),
  ];
}

// caminho real (resolve "..", atalhos simbólicos e junções) ou null
function caminhoReal(p) {
  try { return fs.realpathSync.native(p); } catch { return null; }
}

// `filho` está DENTRO de `pai` (no Windows a comparação ignora maiúsculas)
function estaDentro(filho, pai) {
  const rel = path.relative(pai, filho);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Confere o PDF pedido pelo analisar_projeto. Devolve { caminho } (o real, que
// é o que deve ser lido) ou { erro } com a mensagem para o Claude.
function conferirPdfPermitido(caminho, pastas) {
  const pedido = String(caminho || '').trim();
  if (!pedido) return { erro: 'Informe o caminho do PDF.' };
  if (!path.isAbsolute(pedido)) return { erro: 'Informe o caminho COMPLETO do PDF (ex.: C:\\...\\projeto.pdf).' };
  if (!/\.pdf$/i.test(pedido)) return { erro: 'Informe o caminho de um arquivo .pdf' };
  const real = caminhoReal(pedido);
  if (!real) return { erro: `Arquivo não encontrado: ${pedido}` };
  // o destino real também tem de ser .pdf (atalho com nome .pdf apontando para outro arquivo)
  if (!/\.pdf$/i.test(real)) return { erro: 'Informe o caminho de um arquivo .pdf' };
  const reais = pastas.map(caminhoReal).filter(Boolean);
  if (!reais.some(p => estaDentro(real, p))) {
    return { erro: `Por segurança, o servidor MCP só lê PDFs destas pastas: ${pastas.join(' ; ')}. Copie o arquivo para uma delas (ou ajuste MCP_PASTAS_PDF no backend/.env).` };
  }
  const st = fs.statSync(real);
  if (!st.isFile()) return { erro: `Não é um arquivo: ${pedido}` };
  if (st.size > TAMANHO_MAX_PDF) return { erro: 'PDF acima de 15 MB — o sistema não aceita' };
  return { caminho: real };
}

module.exports = { pastasPermitidasPdf, conferirPdfPermitido, estaDentro, TAMANHO_MAX_PDF };
