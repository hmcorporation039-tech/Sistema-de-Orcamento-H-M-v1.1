#!/usr/bin/env node
// Comando único para as disciplinas (uso pelo Claude Code):
//   node skills/_comum/cli.js <disciplina> calcular   <dados.json>
//   node skills/_comum/cli.js <disciplina> documentos <dados.json> [--saida pasta] [--fotos pasta] [--so tipo1,tipo2]
//   node skills/_comum/cli.js <disciplina> orcamento  <dados.json> [--modo execucao|inspecao] [--saida proposta.json]
//   node skills/_comum/cli.js <disciplina> modelo     [arquivo.json]   (gera o formulário em branco)
// <disciplina> = nome da pasta em skills/ (eletrica, incendio, cabeamento, cftv, solar, carregador, spda)

const fs = require('fs');
const path = require('path');

function argumento(lista, nome) {
  const i = lista.indexOf(nome);
  return i >= 0 ? lista[i + 1] : undefined;
}

async function main() {
  const [disciplina, comando, arquivo, ...resto] = process.argv.slice(2);
  if (!disciplina || !comando) {
    console.error('Uso: node skills/_comum/cli.js <disciplina> <calcular|documentos|orcamento|modelo> <dados.json> [opções]');
    process.exit(2);
  }
  const motor = require(path.join(__dirname, '..', disciplina, 'scripts', 'lib', 'index.js'));
  if (comando === 'modelo') {
    const texto = JSON.stringify(motor.modeloVazio(), null, 1);
    if (arquivo) { fs.writeFileSync(arquivo, texto); console.log(`Modelo salvo em ${arquivo}`); } else console.log(texto);
    return;
  }
  if (!arquivo) throw new Error('Informe o arquivo de dados (JSON).');
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const res = motor.processar(dados);
  res.baseDir = path.dirname(path.resolve(arquivo));
  res.pastaFotos = argumento(resto, '--fotos') || dados.inspecao?.pasta_fotos;

  if (comando === 'calcular') {
    const r = motor.resumir(res);
    if (r.indicadores) {
      console.log(`\n=== ${motor.nome} — ${dados.obra?.nome || dados.cliente?.nome || ''} ===`);
      r.indicadores.forEach(i => console.log(`  ${i.ok === false ? '✖' : i.ok === true ? '✔' : '•'} ${i.rotulo}: ${i.valor}${i.detalhe ? `  (${i.detalhe})` : ''}`));
      (r.textos || []).forEach(t => console.log(`  ! ${t}`));
      (r.tabelas || []).forEach(t => {
        console.log(`\n  ${t.titulo}`);
        t.linhas.forEach(l => console.log(`    ${l.join(' | ')}`));
      });
    } else {
      console.log(JSON.stringify(r, null, 1));
    }
    console.log(`\n  Documentos disponíveis: ${r.documentos.join(', ')}`);
  } else if (comando === 'documentos') {
    const saida = path.resolve(argumento(resto, '--saida') || path.join(res.baseDir, 'documentos'));
    const so = (argumento(resto, '--so') || '').split(',').filter(Boolean);
    fs.mkdirSync(saida, { recursive: true });
    for (const tipo of motor.tiposDisponiveis(res).filter(t => !so.length || so.includes(t))) {
      const g = await motor.gerarDocumento(res, tipo);
      fs.writeFileSync(path.join(saida, g.nomeArquivo), g.buffer);
      console.log(`  ${path.join(saida, g.nomeArquivo)}`);
    }
  } else if (comando === 'orcamento') {
    const modo = argumento(resto, '--modo') || motor.modosOrcamento[0].modo;
    const proposta = motor.montarOrcamento(res, modo);
    const texto = JSON.stringify(proposta, null, 1);
    const destino = argumento(resto, '--saida');
    if (destino) { fs.writeFileSync(destino, texto); console.log(`Proposta (${modo}, ${proposta.itens.length} itens) salva em ${destino}`); } else console.log(texto);
  } else {
    throw new Error(`Comando desconhecido: ${comando}`);
  }
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
