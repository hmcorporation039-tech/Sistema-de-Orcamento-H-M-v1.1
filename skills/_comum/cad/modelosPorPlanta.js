// Um modelo 3D POR PLANTA do desenho (pedido do usuário em 01/11/2026: "o sistema
// está juntando tudo e bagunçando tudo"). Usado pelo botão "Modelo 3D" do sistema
// (backend/src/services/modelo3d/worker.js) e pela skill (./gerar-3d.js).
//
// Pontos de cada planta, nesta ordem — nunca a estimativa pela área das salas:
//   1) dispositivosReais: os do projeto já posicionados (análise com o DWG/DXF do projeto);
//   2) os símbolos desenhados na própria planta (./pontosDoDesenho.js: layer + medida);
//   3) o formulário do projeto da H&M (laudo), quando ele posiciona pontos.
// Planta sem nenhum deles sai só com a arquitetura, com o aviso — antes o 3D
// "distribuía iluminação sem nem estar no projeto".
const { montarCena, recortarArquitetura } = require('./modelo3d');
const { plantasDoDesenho } = require('./pranchas');
const { pontosDoDesenho } = require('./pontosDoDesenho');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');

const naCaixa = (c, [x, y], m = 0) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;
const ROTULO_SIMBOLO = { 'HM-ILU-LUMINARIA': 'luminárias', 'HM-ILU-POSTE': 'postes', 'HM-ELE-TOMADA-BAIXA': 'tomadas', 'HM-ELE-INTERRUPTOR': 'interruptores', 'HM-ELE-QUADRO': 'quadros', 'HM-ELE-CAIXA-PISO': 'caixas de passagem' };

// opcoes: { peDireito, titulo, cliente, obra, proposta, avisos (comuns a todas),
//           dispositivosReais, trechos, disciplinas, dadosPorDisciplina, lerDoDesenho = true }
// → { cenas: [cena com .plantaInfo = { n, nome, caixa, pontos, origem, area_m2 }], principal (índice) }
function montarCenasPorPlanta(arquitetura, opcoes = {}) {
  const plantas = plantasDoDesenho(arquitetura);
  const varias = plantas.length > 1;
  const cenas = [];
  for (const p of plantas) {
    // uma planta só: o desenho inteiro (a leitura já tirou diagrama, tabela e legenda)
    const arq = varias ? recortarArquitetura(arquitetura, p.caixa) : arquitetura;
    const avisos = [...(opcoes.avisos || [])];
    let dispositivos = [];
    let trechos = (opcoes.trechos || []).map(t => ({ ...t, segmentos: varias ? t.segmentos.filter(s => naCaixa(p.caixa, [s[0], s[1]], 1) || naCaixa(p.caixa, [s[2], s[3]], 1)) : t.segmentos })).filter(t => t.segmentos.length);
    let origem = '';
    if (opcoes.dispositivosReais?.length) {
      dispositivos = varias ? opcoes.dispositivosReais.filter(d => naCaixa(p.caixa, [d.x, d.y], 1)) : opcoes.dispositivosReais;
      if (dispositivos.length) origem = 'projeto';
    }
    if (!dispositivos.length && opcoes.lerDoDesenho !== false) {
      const lidos = pontosDoDesenho(arq);
      if (lidos.pontos.length) {
        dispositivos = lidos.pontos;
        if (!trechos.length) trechos = lidos.trechos;
        origem = 'desenho';
        const cont = {};
        for (const d of lidos.pontos) cont[d.simbolo] = (cont[d.simbolo] || 0) + 1;
        avisos.push(`Pontos lidos dos símbolos desenhados nesta planta (pela layer e pela medida): ${Object.entries(cont).map(([k, n]) => `${n} ${ROTULO_SIMBOLO[k] || k}`).join(', ')}. Tomada desenhada sem altura aparece como baixa — [CONFERIR] com a legenda do projeto.`);
      }
    }
    if (!dispositivos.length) {
      // formulário do projeto da H&M (laudo): só o que ele posiciona; sem fallback para estimativa
      for (const disc of opcoes.disciplinas || []) {
        const dados = (opcoes.dadosPorDisciplina || {})[disc];
        if (!dados) continue;
        try {
          const pts = pontosDasDisciplinas(arq, [disc], { dadosPorDisciplina: { [disc]: dados }, peDireito: opcoes.peDireito });
          if (pts.dispositivos.length) { dispositivos.push(...pts.dispositivos); avisos.push(...pts.avisos); origem = 'formulario'; }
        } catch (e) { avisos.push(`${disc}: sem pontos no 3D — ${e.message}`); }
      }
    }
    if (!dispositivos.length) avisos.push('Nenhum ponto de instalação desenhado nesta planta: o modelo mostra só a arquitetura (nada é estimado).');
    // planta sem ambiente nem ponto (detalhe, vista solta): não vira modelo
    if (varias && !dispositivos.length && !arq.ambientes.length) continue;
    const cena = montarCena(arq, {
      peDireito: opcoes.peDireito, dispositivos, avisos, trechos, estimarInfra: false,
      titulo: opcoes.titulo, cliente: opcoes.cliente, obra: opcoes.obra, proposta: opcoes.proposta,
    });
    cena.plantaInfo = { n: p.n, nome: p.nome, caixa: p.caixa.map(v => Math.round(v * 100) / 100), pontos: dispositivos.length, origem, area_m2: p.area_m2 };
    cenas.push(cena);
  }
  // plantas descartadas (sem ambiente nem ponto): a numeração segue sem buraco
  cenas.forEach((c, i) => { c.plantaInfo.nome = c.plantaInfo.nome.replace(/Planta [0-9]+/, `Planta ${i + 1}`); });
  if (!cenas.length) throw new Error('O desenho não tem planta com ambientes nem pontos de instalação para o 3D.');
  // a que abre (e a da imagem do PDF): a com mais pontos; empate, a maior
  let principal = 0;
  cenas.forEach((c, i) => { const m = cenas[principal].plantaInfo; if (c.plantaInfo.pontos > m.pontos || (c.plantaInfo.pontos === m.pontos && c.plantaInfo.area_m2 > m.area_m2)) principal = i; });
  return { cenas, principal };
}

// Números e avisos para o sistema (resumo do modelo): os da planta principal e a lista
function resumoDasCenas({ cenas, principal }) {
  const c = cenas[principal];
  return {
    numeros: { ...c.numeros, plantas: cenas.map(x => ({ nome: x.plantaInfo.nome, pontos: x.plantaInfo.pontos, origem: x.plantaInfo.origem, ambientes: x.numeros.ambientes })) },
    avisos: [...(cenas.length > 1 ? [`${cenas.length} plantas no desenho — cada uma é um modelo à parte (escolha no seletor "Planta" do 3D).`] : []), ...c.avisos],
  };
}

module.exports = { montarCenasPorPlanta, resumoDasCenas };
