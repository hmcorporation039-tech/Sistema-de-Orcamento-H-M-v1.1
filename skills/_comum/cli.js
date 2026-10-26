#!/usr/bin/env node
// Comando único para as disciplinas (uso pelo Claude Code):
//   node skills/_comum/cli.js <disciplina> calcular   <dados.json>
//   node skills/_comum/cli.js <disciplina> documentos <dados.json> [--saida pasta] [--fotos pasta] [--so tipo1,tipo2]
//   node skills/_comum/cli.js <disciplina> orcamento  <dados.json> [--modo execucao|inspecao] [--saida proposta.json]
//   node skills/_comum/cli.js <disciplina> modelo     [arquivo.json]   (gera o formulário em branco)
//   node skills/_comum/cli.js <disciplina> ambientes  <arquitetura.dwg|.dxf>  (ambientes com área/perímetro reais e portas, em JSON)
//   node skills/_comum/cli.js <disciplina> planta     <dados.json> --arquitetura <arq.dwg|.dxf> [--saida planta.dxf] [--escala 50]
//   node skills/_comum/cli.js eletrica|eletrica-industrial|media-tensao unifilar <dados.json> [--saida unifilar.qet] [--quadro QD-01]
//        (diagrama unifilar do quadro para o QElectroTech 0.100+: geral, DPS, barramento, circuitos com DR)
//        (planta DXF para o AutoCAD: pontos da disciplina pela norma, legenda, notas e carimbo H&M;
//         disponível para eletrica, eletrica-hospitalar, iluminacao, incendio, alarme, controle-acesso,
//         cftv, cabeamento, telefonia e antena; DWG é convertido direto, sem salvar como DXF)
// <disciplina> = nome da pasta em skills/ (eletrica, incendio, cabeamento, cftv, solar, carregador, spda, …)

const fs = require('fs');
const path = require('path');

// arquitetura .dwg (convertido num processo à parte) ou .dxf → leitura
async function lerArquivoArquitetura(arquivo) {
  const { textoDxfDoArquivo } = require('./cad/dwg');
  const { lerArquitetura } = require('./cad/arquitetura');
  const { texto } = await textoDxfDoArquivo(fs.readFileSync(arquivo), path.basename(arquivo));
  return lerArquitetura(texto);
}

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
  if (comando === 'ambientes') {
    const a = await lerArquivoArquitetura(arquivo);
    console.log(JSON.stringify({
      ambientes: a.ambientes.map(x => ({ nome: x.nome, area_m2: x.area_m2, perimetro_m: x.perimetro_m, origem: x.origem })),
      portas: a.portas.map(p => ({ id: p.id, largura_m: p.largura_m, dupla: p.dupla, ambientes: p.ambientes })),
    }, null, 1));
    console.error(`${a.ambientes.length} ambientes; ${a.portas.length} portas; ${a.layers.length} layers; unidade → metro × ${a.fatorUnidade}`);
    return;
  }
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
  } else if (comando === 'unifilar') {
    const { UNIFILARES } = require('./cad/unifilar');
    const gerar = UNIFILARES[motor.chave] || UNIFILARES[disciplina];
    if (!gerar) throw new Error(`Unifilar automático disponível para: ${Object.keys(UNIFILARES).join(', ')}.`);
    const { xml, folhas } = gerar(res, { quadro: argumento(resto, '--quadro') || 'QD-01' });
    const destino = path.resolve(argumento(resto, '--saida') || path.join(res.baseDir, 'unifilar.qet'));
    fs.writeFileSync(destino, xml);
    console.log(`Unifilar (${folhas} folha(s), QElectroTech 0.100+) salvo em ${destino}`);
  } else if (comando === 'planta') {
    const { gerarPlanta } = require('./cad/planta');
    const { PLANTAS } = require('./cad/plantasDisciplina');
    // pasta (controle-acesso) ou chave do sistema (controle_acesso)
    const gerador = PLANTAS[motor.chave] || PLANTAS[disciplina];
    if (!gerador) throw new Error(`Planta automática ainda não disponível para "${disciplina}" (disponível: ${Object.keys(PLANTAS).join(', ')}).`);
    const arqCad = argumento(resto, '--arquitetura');
    if (!arqCad) throw new Error('Informe a arquitetura: --arquitetura planta.dwg (ou .dxf)');
    const arquitetura = await lerArquivoArquitetura(arqCad);
    const { pontos, notas } = gerador(res, arquitetura);
    const out = gerarPlanta({
      arquitetura, pontos, notas, escalaPlotagem: Number(argumento(resto, '--escala')) || 50,
      carimbo: { cliente: dados.cliente?.nome, obra: dados.obra?.nome, titulo: `Projeto — ${motor.nome}`, disciplina, data: new Date().toLocaleDateString('pt-BR'), revisao: dados.meta?.revisao, responsavel: dados.responsavel?.nome, crea: dados.responsavel?.crea, art: dados.responsavel?.art },
    });
    const destino = path.resolve(argumento(resto, '--saida') || path.join(res.baseDir, `planta-${disciplina}.dxf`));
    fs.writeFileSync(destino, out.dxf);
    out.quantitativo.forEach(q => console.log(`  ${q.legenda}: ${q.quantidade}`));
    if (out.naoEncontrados.length) console.log(`  ! ambientes do formulário sem correspondência na arquitetura: ${out.naoEncontrados.join(', ')}`);
    console.log(`Planta salva em ${destino}`);
  } else {
    throw new Error(`Comando desconhecido: ${comando}`);
  }
}

main().catch(err => { console.error(`ERRO: ${err.message}`); process.exit(1); });
