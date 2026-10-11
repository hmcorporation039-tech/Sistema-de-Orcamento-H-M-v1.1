#!/usr/bin/env node
// Uso: node scripts/gerar-documentos.js <dados.json> [--saida pasta] [--fotos pasta] [--so laudo,memorial,risco,checklist,planilhas]
// Gera Laudo, Memorial, Relatório de risco, Checklist de campo (Word) e as
// planilhas de medições e de materiais/risco (Excel), com prefixo da obra.

const fs = require('fs');
const path = require('path');
const { processar } = require('./lib/processar');
const { gerarDocumento, tiposDisponiveis } = require('./lib/documentos');

function argumento(lista, nome) {
  const i = lista.indexOf(nome);
  return i >= 0 ? lista[i + 1] : undefined;
}

async function main() {
  const [arquivo, ...resto] = process.argv.slice(2);
  if (!arquivo) {
    console.error('Uso: node scripts/gerar-documentos.js <dados.json> [--saida pasta] [--fotos pasta] [--so laudo,memorial,risco,checklist,planilhas]');
    process.exit(2);
  }
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const res = processar(dados);
  res.baseDir = path.dirname(path.resolve(arquivo));
  res.pastaFotos = argumento(resto, '--fotos') || dados.inspecao?.pasta_fotos;
  const saida = path.resolve(argumento(resto, '--saida') || path.join(res.baseDir, 'documentos'));
  const pedidos = (argumento(resto, '--so') || 'laudo,memorial,risco,checklist,planilhas').split(',')
    .flatMap(t => (t === 'planilhas' ? ['medicoes', 'materiais'] : [t]));
  fs.mkdirSync(saida, { recursive: true });

  const gerados = [];
  for (const tipo of tiposDisponiveis(res).filter(t => pedidos.includes(t))) {
    const { buffer, nomeArquivo } = await gerarDocumento(res, tipo);
    const destino = path.join(saida, nomeArquivo);
    fs.writeFileSync(destino, buffer);
    gerados.push(destino);
  }
  console.log(`Parecer: ${res.parecer.texto}`);
  console.log('Arquivos gerados:');
  gerados.forEach(g => console.log(`  ${g}`));
}

main().catch(err => {
  console.error(`ERRO: ${err.message}`);
  process.exit(1);
});
