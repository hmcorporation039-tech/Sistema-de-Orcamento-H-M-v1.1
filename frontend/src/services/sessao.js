// Sessão do escritório: o que fazer quando o servidor recusa o token (401) ou
// pede a troca da senha provisória (403 SENHA_PROVISORIA) no meio do trabalho.
//
// Antes, qualquer 401 OU 403 apagava o token e mandava para /login na hora:
// quem salvava uma proposta de outro usuário (posse → 403) ou trabalhava além
// das 8 h do token perdia tudo o que estava na tela. Agora:
//   - 401: a tela fica onde está e abre o "Entre de novo" (ModalSessao); as
//     requisições recusadas esperam o novo login e são repetidas com o token
//     novo (o 401 sai do `autenticar`, antes de qualquer gravação, então
//     repetir não duplica nada). Desistir = sair e ir para /login.
//   - 403 SENHA_PROVISORIA: a conta precisa definir a senha (useAuth mostra a
//     tela de definir senha); demais 403 são só recusa — quem chamou mostra.
//
// Módulo sem React: o interceptor do axios (services/api.js) e o AuthProvider
// (hooks/useAuth.js) se falam por aqui.

const ouvintes = new Set();
let espera = null; // { promessa, resolver, rejeitar } enquanto o modal está aberto

export function ouvirSessao(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function avisar(evento) {
  ouvintes.forEach(fn => {
    try { fn(evento); } catch (e) { console.error(e); }
  });
}

// Alguém está ouvindo (o AuthProvider montado com o modal)? Sem ouvinte, o
// interceptor volta ao comportamento antigo (sair e ir para o login).
export const temOuvinteSessao = () => ouvintes.size > 0;

// Promessa que resolve quando a pessoa entrar de novo (ou rejeita se desistir).
// Várias requisições recusadas ao mesmo tempo esperam o MESMO login.
export function aguardarNovoLogin() {
  if (!espera) {
    let resolver; let rejeitar;
    const promessa = new Promise((res, rej) => { resolver = res; rejeitar = rej; });
    espera = { promessa, resolver, rejeitar };
    avisar({ tipo: 'expirou' });
  }
  return espera.promessa;
}

export const sessaoAguardandoLogin = () => !!espera;

export function novoLoginConcluido() {
  const e = espera;
  espera = null;
  if (e) e.resolver();
  avisar({ tipo: 'renovada' });
}

export function desistirDoNovoLogin() {
  const e = espera;
  espera = null;
  if (e) e.rejeitar(Object.assign(new Error('Sessão encerrada'), { sessaoEncerrada: true }));
  avisar({ tipo: 'encerrada' });
}

export function avisarSenhaProvisoria() {
  avisar({ tipo: 'senha-provisoria' });
}
