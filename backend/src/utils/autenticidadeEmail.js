// Autenticidade de e-mail recebido (auditoria de 25/10/2026). Qualquer pessoa
// pode mandar um e-mail com assunto "Pix recebido" ou uma "NF-e" falsa; o que
// prova a origem é o cabeçalho Authentication-Results que o GMAIL (servidor que
// recebe) grava depois de conferir as assinaturas DKIM/SPF/DMARC — o remetente
// não consegue falsificar esse resultado. Usamos o PRIMEIRO cabeçalho (o do
// Gmail, o mais recente); cabeçalhos mais antigos podem ter vindo do atacante.

const dominioDe = (endereco) => String(endereco || '').toLowerCase().split('@')[1] || '';

function cabecalhoAutenticacao(email) {
  const h = email?.headers?.get?.('authentication-results');
  const lista = Array.isArray(h) ? h : h ? [h] : [];
  const primeiro = lista[0];
  return typeof primeiro === 'string' ? primeiro : primeiro?.value || String(primeiro || '');
}

function verificarAutenticidade(email) {
  const ar = cabecalhoAutenticacao(email).toLowerCase();
  const remetente = String(email?.from?.value?.[0]?.address || '').toLowerCase();
  const dominio = dominioDe(remetente);
  const dmarc = (ar.match(/\bdmarc=(\w+)/) || [])[1] || null;
  const dmarcDominio = (ar.match(/\bdmarc=\w+[^;]*header\.from=([\w.-]+)/) || [])[1] || null;
  const dkimAlinhado = [...ar.matchAll(/\bdkim=(\w+)[^;]*header\.(?:i|d)=@?([\w.-]+)/g)]
    .some(([, r, d]) => r === 'pass' && (d === dominio || dominio.endsWith(`.${d}`) || d.endsWith(`.${dominio}`)));
  // autêntico = DMARC aprovado para o domínio do remetente, ou DKIM válido alinhado a ele
  const autentico = !!dominio && ((dmarc === 'pass' && (!dmarcDominio || dmarcDominio === dominio)) || dkimAlinhado);
  return { remetente, dominio, dmarc, dkimAlinhado, autentico };
}

// Domínio igual ou subdomínio de algum da lista (ex.: "inter.co" aceita "mail.inter.co").
function dominioPermitido(dominio, permitidos) {
  return permitidos.some(p => dominio === p || dominio.endsWith(`.${p}`));
}

const listaDoEnv = (nome, padrao) => String(process.env[nome] || padrao).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

module.exports = { verificarAutenticidade, dominioPermitido, listaDoEnv };
