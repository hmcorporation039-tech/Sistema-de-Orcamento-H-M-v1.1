// Leitura direta de DWG (AutoCAD R13 a 2018+): converte para DXF de texto
// num processo filho (./dwg-para-dxf.mjs, LibreDWG em WASM) e o resto do fluxo
// (lerArquitetura, planta) continua igual. Testado com as plantas reais da
// empresa: 10 de 11 convertem; a que falha recebe a orientação de salvar como
// DXF no AutoCAD. O LibreDWG é GPL-3.0 — uso interno, não redistribuído.
const path = require('path');
const { spawn } = require('child_process');

// DWG começa pela versão: AC1015 (2000), AC1018 (2004), AC1021 (2007), AC1024 (2010), AC1027 (2013), AC1032 (2018)
const ehDwg = (buf) => Buffer.isBuffer(buf) && buf.length > 6 && /^AC10\d\d$/.test(buf.subarray(0, 6).toString('latin1'));
const ehDxfTexto = (texto) => /^\s*0\s*\r?\n\s*SECTION/.test(texto);

const VERSOES = { AC1012: 'R13', AC1014: 'R14', AC1015: '2000', AC1018: '2004', AC1021: '2007', AC1024: '2010', AC1027: '2013', AC1032: '2018' };

function converterDwg(buffer, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [path.join(__dirname, 'dwg-para-dxf.mjs')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const partes = [];
    let erro = '';
    let terminou = false;
    const fim = (fn, v) => { if (!terminou) { terminou = true; clearTimeout(timer); fn(v); } };
    const timer = setTimeout(() => { filho.kill(); fim(reject, new Error(`a conversão do DWG passou de ${timeoutMs / 1000} s`)); }, timeoutMs);
    filho.stdout.on('data', (c) => partes.push(c));
    filho.stderr.on('data', (c) => { erro = (erro + c).slice(-2000); });
    filho.on('error', (e) => fim(reject, e));
    filho.on('close', (code) => {
      if (code === 0 && partes.length) return fim(resolve, Buffer.concat(partes).toString('utf8'));
      // última linha útil do LibreDWG ("Open dwg file with error code: 68" é só aviso)
      const linhas = erro.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^Open dwg file with error code|^at |^Node\.js v|^wasm:\/\//i.test(l));
      const motivo = linhas.find(l => /Error:/.test(l)) || linhas.pop();
      fim(reject, new Error(/out of bounds|unreachable/i.test(motivo || '') ? 'o leitor de DWG não suporta este arquivo (falha interna do LibreDWG)' : motivo || `o leitor de DWG terminou com código ${code}`));
    });
    filho.stdin.on('error', () => {}); // o filho pode fechar a entrada ao abortar
    filho.stdin.end(buffer);
  });
}

// Conteúdo de um arquivo de arquitetura (.dwg ou .dxf) como DXF de texto
async function textoDxfDoArquivo(buffer, nome = '') {
  if (ehDwg(buffer)) {
    const versao = VERSOES[buffer.subarray(0, 6).toString('latin1')] || buffer.subarray(0, 6).toString('latin1');
    try {
      return { texto: await converterDwg(buffer), origem: 'dwg', versao };
    } catch (e) {
      throw new Error(`Não consegui ler o DWG "${nome}" (AutoCAD ${versao}): ${e.message}. No AutoCAD, salve como DXF (Salvar como → DXF 2018) e envie o .dxf.`);
    }
  }
  const texto = buffer.toString('utf8');
  if (!ehDxfTexto(texto)) throw new Error(`"${nome}" não é um DWG nem um DXF de texto (versão 2000 ou mais nova).`);
  return { texto, origem: 'dxf' };
}

module.exports = { ehDwg, converterDwg, textoDxfDoArquivo };
