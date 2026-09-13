require('dotenv').config();

// Segredos que o sistema NÃO pode substituir por um valor padrão em silêncio.
//
// Antes, tanto o middleware quanto o login usavam `process.env.JWT_SECRET ||
// 'hm_secret'`. Se o .env não fosse lido (instalação nova, serviço rodando de
// outra pasta, arquivo esquecido ao copiar o sistema pra outra máquina), a
// aplicação subia normalmente assinando token com um segredo que está no
// código-fonte — ou seja, qualquer pessoa com acesso ao repositório poderia
// forjar um token de administrador, e nada no log indicaria isso.
//
// Agora falta de segredo derruba o boot com uma mensagem clara, que é o
// comportamento seguro: melhor não subir do que subir inseguro.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
  console.error(
    '\n[ERRO DE CONFIGURAÇÃO] JWT_SECRET ausente ou curto demais no backend/.env.\n' +
    'Defina uma chave longa e aleatória (mínimo 32 caracteres) antes de iniciar o sistema.\n' +
    'Para gerar uma:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n'
  );
  process.exit(1);
}

module.exports = { JWT_SECRET };
