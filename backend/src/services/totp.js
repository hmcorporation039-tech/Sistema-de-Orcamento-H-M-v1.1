// Verificação em duas etapas: TOTP (RFC 6238, sobre o HOTP da RFC 4226), só com o `crypto` do Node.
// É o código de 6 dígitos que muda a cada 30 s nos aplicativos autenticadores (Google Authenticator,
// Microsoft Authenticator, Authy, 2FAS…). Fase 6, item 3 (02/11/2026).
//
// A chave de cada usuário fica CIFRADA no banco (AES-256-GCM) com a TOTP_CHAVE_CIFRA do .env: quem
// copiar só o banco (um backup, por exemplo) não consegue gerar os códigos. Sem essa variável, a
// ativação é recusada com uma mensagem clara (o resto do sistema funciona normalmente).
// Se a chave do .env se perder, os códigos de recuperação (só hash, não dependem dela) continuam
// valendo para entrar; depois é só desativar e ativar de novo.
const crypto = require('crypto');

const PASSO_S = 30;
const DIGITOS = 6;
const EMISSOR = 'H&M Engenharia';
const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function paraBase32(buf) {
  let bits = 0;
  let valor = 0;
  let saida = '';
  for (const byte of buf) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

function deBase32(texto) {
  const limpo = String(texto || '').toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let valor = 0;
  const bytes = [];
  for (const c of limpo) {
    const i = ALFABETO_BASE32.indexOf(c);
    if (i < 0) throw new Error('Chave em base32 inválida');
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// HOTP (RFC 4226): HMAC do contador de 8 bytes, truncamento dinâmico e os últimos `digitos` dígitos.
function hotp(segredo, contador, { digitos = DIGITOS, algoritmo = 'sha1' } = {}) {
  const mensagem = Buffer.alloc(8);
  mensagem.writeBigUInt64BE(BigInt(contador));
  const h = crypto.createHmac(algoritmo, segredo).update(mensagem).digest();
  const deslocamento = h[h.length - 1] & 0x0f;
  const binario = ((h[deslocamento] & 0x7f) << 24) | (h[deslocamento + 1] << 16) | (h[deslocamento + 2] << 8) | h[deslocamento + 3];
  return String(binario % 10 ** digitos).padStart(digitos, '0');
}

const passoDe = (tempoMs, passo = PASSO_S) => Math.floor(tempoMs / 1000 / passo);

function totp(segredo, tempoMs = Date.now(), { passo = PASSO_S, ...opcoes } = {}) {
  return hotp(segredo, passoDe(tempoMs, passo), opcoes);
}

const iguais = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Confere o código aceitando um passo antes e um depois (relógio do celular um pouco fora). Devolve o
// passo que bateu, ou null. `ultimoPasso`: o último passo já aceito para essa pessoa — o mesmo código
// (ou um mais antigo) não entra de novo, então um código visto por cima do ombro não serve depois.
function verificarCodigo(segredo, codigo, { tempoMs = Date.now(), janela = 1, ultimoPasso = null } = {}) {
  const texto = String(codigo ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(texto)) return null;
  const atual = passoDe(tempoMs);
  let achado = null;
  for (let d = -janela; d <= janela; d++) {
    const p = atual + d;
    // compara todos os passos da janela (tempo constante), e fica com o último que bater
    if (iguais(hotp(segredo, p), texto)) achado = p;
  }
  if (achado == null) return null;
  if (ultimoPasso != null && achado <= Number(ultimoPasso)) return null;
  return achado;
}

const gerarSegredo = () => crypto.randomBytes(20);   // 160 bits, o tamanho do exemplo da RFC 4226

function urlOtpauth({ segredoBase32, conta, emissor = EMISSOR }) {
  const rotulo = `${encodeURIComponent(emissor)}:${encodeURIComponent(conta)}`;
  return `otpauth://totp/${rotulo}?secret=${segredoBase32}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASSO_S}`;
}

// ── Cifra da chave no banco ────────────────────────────────────────────
// TOTP_CHAVE_CIFRA: 32 bytes em hexadecimal (64 caracteres) ou em base64.
// Gerar:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function chaveCifra(valor = process.env.TOTP_CHAVE_CIFRA) {
  const t = String(valor || '').trim();
  if (!t) return null;
  if (/^[0-9a-f]{64}$/i.test(t)) return Buffer.from(t, 'hex');
  const b = Buffer.from(t, 'base64');
  return b.length === 32 ? b : null;
}

function erroSemChave() {
  return Object.assign(new Error('A verificação em duas etapas não está configurada neste servidor (falta TOTP_CHAVE_CIFRA no backend/.env).'), { code: 'TOTP_SEM_CHAVE', status: 503 });
}

function cifrar(texto, chave = chaveCifra()) {
  if (!chave) throw erroSemChave();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join(':');
}

function decifrar(cifrado, chave = chaveCifra()) {
  if (!chave) throw erroSemChave();
  const [versao, iv, tag, dados] = String(cifrado || '').split(':');
  if (versao !== 'v1' || !iv || !tag || dados == null) throw new Error('Chave TOTP gravada em formato desconhecido');
  const d = crypto.createDecipheriv('aes-256-gcm', chave, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dados, 'base64')), d.final()]).toString('utf8');
}

// ── Códigos de recuperação ─────────────────────────────────────────────
// 10 códigos "xxxxx-xxxxx" (sem letras que se confundem: i, l, o, 0, 1), cada um vale uma vez.
const ALFABETO_RECUPERACAO = 'abcdefghjkmnpqrstuvwxyz23456789';
function gerarCodigosRecuperacao(quantidade = 10) {
  const codigos = [];
  for (let i = 0; i < quantidade; i++) {
    let s = '';
    for (let j = 0; j < 10; j++) s += ALFABETO_RECUPERACAO[crypto.randomInt(ALFABETO_RECUPERACAO.length)];
    codigos.push(`${s.slice(0, 5)}-${s.slice(5)}`);
  }
  return codigos;
}
const normalizarRecuperacao = (codigo) => String(codigo ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pareceRecuperacao = (codigo) => normalizarRecuperacao(codigo).length === 10 && !/^\d+$/.test(normalizarRecuperacao(codigo));
const hashRecuperacao = (codigo) => crypto.createHash('sha256').update(`recuperacao:${normalizarRecuperacao(codigo)}`).digest('hex');

module.exports = {
  PASSO_S, DIGITOS, EMISSOR,
  paraBase32, deBase32, hotp, totp, passoDe, verificarCodigo, gerarSegredo, urlOtpauth,
  chaveCifra, cifrar, decifrar,
  gerarCodigosRecuperacao, normalizarRecuperacao, pareceRecuperacao, hashRecuperacao,
};
