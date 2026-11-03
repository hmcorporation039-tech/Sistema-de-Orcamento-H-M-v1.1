// Placar de precisão da leitura (utils/placarPrecisao.js + scripts/placar-precisao.js, fase 3 do roteiro).
// 1) a conta do placar, com leitura e gabarito SINTÉTICOS (sempre roda, sem banco);
// 2) o placar dos projetos reais da pasta de fixtures FORA do repositório (HM_PLACAR_PASTA ou
//    "<acima do repositório>/Placar de precisao"): se a pasta não existir, diz "pulado".
// Rodar: node testes/placarPrecisao.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { acerto, leituraDoProjeto, compararComGabarito, errosDoGabarito } = require('../src/utils/placarPrecisao');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

(async () => {
  await caso('acerto: contar a mais e a menos pesa igual; nada esperado e nada lido é 100 %', () => {
    assert.strictEqual(acerto(10, 10), 1);
    assert.strictEqual(acerto(8, 10), 0.8);
    assert.strictEqual(acerto(10, 8), 0.8);
    assert.strictEqual(acerto(0, 5), 0);
    assert.strictEqual(acerto(0, 0), 1);
  });

  await caso('placar por símbolo, metro de eletroduto, ambiente e disciplina', () => {
    const leitura = leituraDoProjeto({
      paginas: [
        { origem: 'cad', itens: [
          { tipo: 'simbolo', descricao: 'Detector de fumaça DFE 521 — bloco DET', disciplina: 'incendio', quantidade: 14 },
          { tipo: 'simbolo', descricao: 'Acionador manual — bloco AM', disciplina: 'incendio', quantidade: 3 },
          { tipo: 'simbolo', descricao: 'Ponto de rede', disciplina: 'rede', quantidade: 8, ambiguo: true, conferir: true },
          { tipo: 'linha', descricao: 'Eletroduto — medido no desenho (layer "INC-ELETRODUTO")', disciplina: 'incendio', metros: 66.2, tipoLinha: 'eletroduto', layer: 'INC-ELETRODUTO' },
          { tipo: 'linha', descricao: 'Eletrocalha — medido no desenho', disciplina: 'rede', metros: 80, tipoLinha: 'eletrocalha', layer: 'CAB-ELETROCALHA' },
        ] },
      ],
      ambientes: [{ nome: 'Nave', area_m2: 300 }, { nome: 'Sacristia', area_m2: 20 }],
    });
    const gab = {
      arquivos: [{ arquivo: 'x.dxf' }],
      simbolos: [
        { disciplina: 'incendio', tipo: 'Detector de fumaça', busca: 'detector', quantidade: 14 },
        { disciplina: 'incendio', tipo: 'Acionador manual', busca: 'acionador', quantidade: 4 },
        { disciplina: 'cabeamento', tipo: 'Ponto de rede', busca: 'ponto de rede', quantidade: 8 },
      ],
      trechos: [{ disciplina: 'incendio', tipo: 'eletroduto', metros: 66 }, { disciplina: 'rede', tipo: 'eletrocalha', metros: 100 }],
      ambientes: { lista: [{ nome: 'NAVE', area_m2: 301 }, { nome: 'Sacristia', area_m2: 30 }, { nome: 'Secretaria' }] },
    };
    assert.deepStrictEqual(errosDoGabarito(gab), []);
    const r = compararComGabarito(leitura, gab);
    assert.deepStrictEqual(r.simbolos.map(s => [s.lido, s.acerto]), [[14, 100], [3, 75], [8, 100]]);
    assert.strictEqual(r.simbolos[2].aConferir, 8, 'o que ainda está para conferir aparece separado');
    assert.deepStrictEqual(r.trechos.map(t => [t.lido_m, t.acerto]), [[66.2, 99.7], [80, 80]]);
    // nave achada com a área certa (1), sacristia achada com área fora da tolerância (0,5), secretaria não achada (0)
    assert.strictEqual(r.ambientes.acerto, 50);
    assert.deepStrictEqual(r.porDisciplina, { incendio: 91.6, cabeamento: 100, rede: 80 });
    assert.strictEqual(r.geral.simbolos, 91.7);
    assert.ok(r.geral.total > 0 && r.geral.total < 100);
  });

  await caso('gabarito incompleto é recusado com o motivo', () => {
    assert.match(errosDoGabarito({ simbolos: [{ quantidade: 3 }] }).join(' | '), /"arquivos" vazio.*sem "busca"/);
  });

  // pasta temporária com um projeto SINTÉTICO (DXF gerado aqui): o script de ponta a ponta
  await caso('script: lê a pasta, pula rascunho e mede o projeto conferido', async () => {
    const { rodarPlacar } = require('../scripts/placar-precisao');
    const sem = await rodarPlacar({ pasta: path.join(os.tmpdir(), 'nao-existe-placar-hm') });
    assert.match(sem.pulado, /não existe/);
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'placar-'));
    const { DesenhoDxf } = require(path.join(require('../src/config/caminhos').CAD, 'dxf.js'));
    const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-TOMADAS', cor: 1 }, { nome: 'EL-ELETRODUTO', cor: 3 }] });
    d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
    d.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
    for (const x of [0.5, 1.5, 2.5]) d.polilinha([[x, 0.3], [x + 0.3, 0.3], [x + 0.15, 0.56]], { layer: 'EL-TOMADAS', fechada: true });
    d.polilinha([[0.5, 3], [5.5, 3]], { layer: 'EL-ELETRODUTO' });
    fs.mkdirSync(path.join(pasta, 'sintetico'));
    fs.writeFileSync(path.join(pasta, 'sintetico', 'planta.dxf'), d.toString());
    fs.writeFileSync(path.join(pasta, 'sintetico', 'gabarito.json'), JSON.stringify({
      projeto: 'Sintético', conferido: true, arquivos: [{ arquivo: 'planta.dxf', disciplinas: ['eletrica'] }],
      simbolos: [{ disciplina: 'eletrica', tipo: 'Tomada', busca: 'tomada|ponto de parede', quantidade: 3 }],
      trechos: [{ disciplina: 'eletrica', tipo: 'eletroduto', metros: 5 }],
    }));
    fs.mkdirSync(path.join(pasta, 'rascunho'));
    fs.writeFileSync(path.join(pasta, 'rascunho', 'gabarito.json'), JSON.stringify({ projeto: 'Rascunho', conferido: false, arquivos: [{ arquivo: 'x.pdf' }] }));
    const r = await rodarPlacar({ pasta });
    const sint = r.projetos.find(p => p.projeto === 'Sintético');
    assert.ok(sint && !sint.erro, JSON.stringify(sint));
    assert.deepStrictEqual([sint.simbolos[0].lido, sint.trechos[0].lido_m], [3, 5]);
    assert.strictEqual(sint.geral.total, 100);
    assert.match(r.projetos.find(p => p.projeto === 'Rascunho').pulado, /não conferido/);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  // os projetos reais (fora do repositório)
  const { rodarPlacar, pastaDoPlacar } = require('../scripts/placar-precisao');
  const real = await rodarPlacar({ pasta: pastaDoPlacar() });
  if (real.pulado) console.log(`placarPrecisao: projetos reais pulados — ${real.pulado}`);
  else console.log(`placarPrecisao: ${real.total.projetos} projeto(s) real(is): geral ${real.total.total ?? '—'} % (símbolos ${real.total.simbolos ?? '—'} %, metros ${real.total.metros ?? '—'} %, ambientes ${real.total.ambientes ?? '—'} %)`);
  console.log(`placarPrecisao: ok (${ok} verificações)`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
