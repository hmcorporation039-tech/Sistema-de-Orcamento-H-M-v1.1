#!/usr/bin/env node
// Uso: node scripts/orcamento.js <dados.json> [--modo execucao|inspecao] [--saida proposta.json]
// Monta os itens do rascunho de proposta no formato da ferramenta MCP
// criar_rascunho_proposta (servidor hm-orcamentos do Sistema de Orçamentos).
// Os itens saem sem preço ("a_cotar"): antes de criar a proposta, buscar o
// preço no catálogo (buscar_material / historico_preco) ou pesquisar.

const fs = require('fs');
const { processar } = require('./lib/processar');
const { montarOrcamento } = require('./lib/orcamento');

function main() {
  const args = process.argv.slice(2);
  const arquivo = args[0];
  if (!arquivo) {
    console.error('Uso: node scripts/orcamento.js <dados.json> [--modo execucao|inspecao] [--saida proposta.json]');
    process.exit(2);
  }
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const iModo = args.indexOf('--modo');
  const modo = iModo >= 0 ? args[iModo + 1] : (['periodica', 'provisorio'].includes(dados.inspecao?.tipo) ? 'inspecao' : 'execucao');
  const proposta = montarOrcamento(processar(dados), modo);
  const iSaida = args.indexOf('--saida');
  const texto = JSON.stringify(proposta, null, 1);
  if (iSaida >= 0) {
    fs.writeFileSync(args[iSaida + 1], texto);
    console.log(`Proposta (${modo}, ${proposta.itens.length} itens) salva em ${args[iSaida + 1]}`);
  } else {
    console.log(texto);
  }
}

try {
  main();
} catch (err) {
  console.error(`ERRO: ${err.message}`);
  process.exit(1);
}
