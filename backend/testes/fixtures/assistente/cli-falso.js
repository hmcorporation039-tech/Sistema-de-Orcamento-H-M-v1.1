#!/usr/bin/env node
// CLI FALSO do Claude Code para os testes do assistente (não gasta cota):
//   node cli-falso.js <roteiro.jsonl> <registro-args.jsonl> <argumentos reais do claude…>
// Grava os argumentos recebidos (uma linha JSON por execução) e emite o roteiro
// gravado em stream-json, trocando __SESSAO__ pelo id de sessão dos argumentos.
// Roteiros especiais (pelo nome do arquivo):
//   *dorme*            emite o init e fica parado (para testar parar/tempo-limite)
//   *sessao-perdida*   com --resume, responde como o Claude Code quando a sessão sumiu
const fs = require('fs');

const [roteiro, registro, ...args] = process.argv.slice(2);
fs.appendFileSync(registro, `${JSON.stringify(args)}\n`);
const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : null; };
const sessao = valor('--resume') || valor('--session-id') || '00000000-0000-0000-0000-000000000000';

if (/sessao-perdida/.test(roteiro) && args.includes('--resume')) {
  process.stderr.write(`No conversation found with session ID: ${sessao}\n`);
  process.exit(1);
}

const linhas = fs.readFileSync(roteiro, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.replace(/__SESSAO__/g, sessao));
if (/dorme/.test(roteiro)) {
  process.stdout.write(`${linhas[0]}\n`);
  setInterval(() => {}, 1000);
} else {
  let i = 0;
  const proxima = () => {
    if (i >= linhas.length) return process.exit(0);
    process.stdout.write(`${linhas[i++]}\n`);
    setTimeout(proxima, 3);
  };
  proxima();
}
