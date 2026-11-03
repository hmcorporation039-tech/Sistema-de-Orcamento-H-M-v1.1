// Timbrado único da H&M: dados da empresa (../empresa.js, a fonte única do papel timbrado de todos
// os documentos) e os arquivos da identidade visual (../assets: logo.png e cabecalho.png). O backend
// chega à mesma pasta por config/caminhos.js (ASSETS_COMUM); o frontend publica a sua cópia de
// frontend/public/logo.png, conferida pelo hash em backend/testes/identidadeVisual.test.js.
const path = require('path');
const { EMPRESA, linhasRodape, cabecalhoExcel, rodapeExcel, timbrarPlanilha, timbrarPastaDeTrabalho } = require('../empresa');

const PASTA_ASSETS = path.join(__dirname, '..', 'assets');
const LOGO = path.join(PASTA_ASSETS, 'logo.png');
const CABECALHO = path.join(PASTA_ASSETS, 'cabecalho.png');

module.exports = {
  EMPRESA, linhasRodape, cabecalhoExcel, rodapeExcel, timbrarPlanilha, timbrarPastaDeTrabalho,
  PASTA_ASSETS, LOGO, CABECALHO,
};
