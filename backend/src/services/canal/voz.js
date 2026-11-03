// Voz do canal (Fase 6): o áudio é transcrito NESTE PC pelo whisper.cpp, sem nuvem, e segue como
// texto pelo mesmo fluxo. Nada é baixado nem instalado pelo sistema: só funciona se o .env apontar
// WHISPER_CPP_BIN (whisper-cli.exe) e WHISPER_MODELO (ggml-*.bin) para arquivos que existem.
// O áudio do Telegram (OGG/Opus) e do WhatsApp vira WAV 16 kHz mono pelo ffmpeg (FFMPEG_BIN ou
// "ffmpeg" no PATH); sem ffmpeg, o áudio vai direto ao whisper (as versões novas leem OGG/MP3).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { config, existe } = require('./config');

const NAO_ATIVADA = 'A voz ainda não está ativada neste sistema. Mande a mensagem por escrito.';

function vozDisponivel(cfg = config()) {
  return existe(cfg.voz.whisperBin) && existe(cfg.voz.modelo);
}

function rodar(comando, args, { tempoMs = 120000 } = {}) {
  return new Promise((resolve) => {
    let filho;
    try { filho = spawn(comando, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { resolve({ codigo: -1, erro: e.message, saida: '' }); return; }
    let saida = '';
    filho.stdout.on('data', (d) => { if (saida.length < 200000) saida += d.toString(); });
    filho.stderr.on('data', () => {});
    const relogio = setTimeout(() => filho.kill(), tempoMs);
    filho.on('error', (e) => { clearTimeout(relogio); resolve({ codigo: -1, erro: e.message, saida }); });
    filho.on('close', (codigo) => { clearTimeout(relogio); resolve({ codigo, saida }); });
  });
}

// buffer do áudio → { texto } | { erro }
async function transcrever(buffer, { cfg = config(), executar = rodar } = {}) {
  if (!vozDisponivel(cfg)) return { erro: NAO_ATIVADA };
  if (!Buffer.isBuffer(buffer) || !buffer.length) return { erro: 'Não consegui baixar o áudio.' };
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-voz-'));
  try {
    const entrada = path.join(pasta, 'audio.bin');
    fs.writeFileSync(entrada, buffer);
    let paraWhisper = entrada;
    const wav = path.join(pasta, 'audio.wav');
    const conv = await executar(cfg.voz.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', entrada, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], { tempoMs: 60000 });
    if (conv.codigo === 0 && fs.existsSync(wav)) paraWhisper = wav;
    const base = path.join(pasta, 'saida');
    const r = await executar(cfg.voz.whisperBin, ['-m', cfg.voz.modelo, '-f', paraWhisper, '-l', 'pt', '-nt', '-np', '-otxt', '-of', base], { tempoMs: 180000 });
    const arquivo = `${base}.txt`;
    const texto = (fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : r.saida || '').replace(/\s+/g, ' ').trim();
    if (r.codigo !== 0 && !texto) return { erro: 'Não consegui transcrever o áudio. Mande por escrito.' };
    if (!texto) return { erro: 'Não entendi o áudio. Mande por escrito.' };
    return { texto: texto.slice(0, 4000) };
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}

module.exports = { vozDisponivel, transcrever, NAO_ATIVADA };
