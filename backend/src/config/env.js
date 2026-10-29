// Carrega o backend/.env pelo caminho do arquivo, não pela pasta de onde o
// processo foi iniciado (antes: dotenv.config() sem caminho em server.js,
// database.js, segredos.js e nos scripts — subir de outra pasta pegava outro
// .env, ou nenhum). Como no dotenv, variável já definida no ambiente vale mais.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
