// Proxy do "npm start" (modo de desenvolvimento) para o backend DESTA pasta.
// Antes era o "proxy" fixo do package.json (http://localhost:3001): no ambiente de
// teste (hm-eng-v2, backend na 3002) a tela de desenvolvimento mandava a API para
// a PRODUÇÃO. Agora a porta vem do PORT do backend/.env (como o reiniciar.ps1);
// REACT_APP_PROXY_API força outro endereço. Só vale no "npm start" — o build de
// produção é servido pelo próprio backend e não usa este arquivo.
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

function portaDoBackend() {
  try {
    const texto = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', '.env'), 'utf8');
    const m = texto.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (m) return m[1];
  } catch { /* sem .env: padrão */ }
  return '3001';
}

module.exports = function (app) {
  const alvo = process.env.REACT_APP_PROXY_API || `http://localhost:${portaDoBackend()}`;
  console.log(`[proxy] /api e /health → ${alvo}`);
  // http-proxy-middleware 2.x (vem com o react-scripts): montado em /api, repassa o caminho inteiro
  app.use(['/api', '/health'], createProxyMiddleware({ target: alvo, changeOrigin: true }));
};
