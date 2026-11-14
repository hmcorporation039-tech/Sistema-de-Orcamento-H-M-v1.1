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
const { DE_PAREDE } = require('./tiposDePonto');
const { pontosDasDisciplinas } = require('./estimativaArquitetura');
const { juntarInstalacoes } = require('../instalacao');
// 3D focado no objetivo do projeto (09/11/2026): só as vistas principais, sem a base de outro projeto
const OBJ = require('./cenaDoObjetivo');

const naCaixa = (c, [x, y], m = 0) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;
const meioDe = (pol) => [pol.reduce((s, p) => s + p[0], 0) / pol.length, pol.reduce((s, p) => s + p[1], 0) / pol.length];
const ROTULO_SIMBOLO = { 'HM-ILU-LUMINARIA': 'luminárias', 'HM-ILU-POSTE': 'postes', 'HM-ELE-TOMADA-BAIXA': 'tomadas baixas', 'HM-ELE-TOMADA-MEDIA': 'tomadas médias', 'HM-ELE-TOMADA-ALTA': 'tomadas altas','HM-ELE-INTERRUPTOR': 'interruptores', 'HM-ELE-QUADRO': 'quadros', 'HM-ELE-CAIXA-PISO': 'caixas de passagem' };

// opcoes: { peDireito, titulo, cliente, obra, proposta, avisos (comuns a todas),
//           dispositivosReais, trechos, disciplinas, dadosPorDisciplina, lerDoDesenho = true,
//           sugerirInfra = true (liga os pontos soltos à rede/quadro: ./infraestrutura.js),
//           aprendidos (legenda lida em projetos anteriores: backend services/simbolosAprendidos.js),
//           objetivo (o objeto do projeto, 09/11/2026 — ver abaixo) }
// → { cenas: [cena com .plantaInfo = { n, nome, caixa, pontos, origem, area_m2 }], principal (índice) }
//
// Com `opcoes.objetivo` (pedido do usuário em 09/11/2026: "foque no que interessa", em todas
// as disciplinas) — contrato em ./cenaDoObjetivo.js:
//   - as camadas de contexto (base importada de outro projeto) saem do desenho: não viram
//     parede, ponto nem componente;
//   - com `objetivo.abrigo` (subestação e afins): UMA cena, a do abrigo com os equipamentos do
//     projeto (./cenaDoObjetivo.js montarCenaDoAbrigo) — nada do resto do desenho;
//   - sem abrigo: só as vistas de papel 'principal' viram cena (recorte pela caixa da vista),
//     com os equipamentos do objetivo posicionados nela; 'contexto', 'apoio' e 'fora' nunca;
//   - cada cena leva também objetivoInfo = { disciplina, tipo, titulo, vistaPrincipal, componentes, semPosicao }
//     e cena.componentes (a ficha de cada equipamento, mostrada no clique).
// Sem objetivo, nada muda.
function montarCenasPorPlanta(arquitetura, opcoes = {}) {
  const obj = opcoes.objetivo && typeof opcoes.objetivo === 'object' ? opcoes.objetivo : null;
  if (!obj) return montarPlantas(arquitetura, plantasDoDesenho(arquitetura), opcoes);
  const base = OBJ.semCamadasDeContexto(arquitetura, obj.camadasDeContexto);
  const avisosObj = (obj.avisos || []).map(String);
  if (obj.abrigo) {
    const cena = OBJ.montarCenaDoAbrigo(base, obj, opcoes);
    if (cena) return { cenas: [cena], principal: 0 };
    avisosObj.push('Abrigo do objetivo sem contorno nem medidas: o 3D mostra a vista principal do desenho [CONFERIR].');
  }
  const principais = OBJ.vistasPrincipais(obj);
  let plantas;
  if (principais.length) {
    plantas = principais.map((v, i) => {
      const ambs = base.ambientes.filter(a => naCaixa(v.caixa, meioDe(a.poligono)));
      const nome = v.titulo || obj.titulo || '';
      return { n: i + 1, caixa: v.caixa, vista: v, area_m2: Math.round(ambs.reduce((s, a) => s + a.area_m2, 0) * 100) / 100, nome: `Planta ${i + 1}${nome ? ` — ${nome}` : ''}` };
    });
  } else {
    // objetivo sem vista principal: as plantas do desenho, menos as que caem numa vista de contexto/apoio/fora
    const fora = OBJ.vistasDescartadas(obj);
    const todas = plantasDoDesenho(base);
    plantas = todas.filter(p => !fora.some(v => naCaixa(v.caixa, [(p.caixa[0] + p.caixa[2]) / 2, (p.caixa[1] + p.caixa[3]) / 2])));
    if (!plantas.length) plantas = todas;
    avisosObj.push('Nenhuma vista principal no objetivo do projeto: o 3D mostra as plantas do desenho fora das vistas de contexto [CONFERIR].');
  }
  return montarPlantas(base, plantas, { ...opcoes, avisos: [...(opcoes.avisos || []), ...avisosObj] }, obj);
}

// As cenas das plantas (cada uma recortada pela caixa dela). Com objetivo, sempre recorta (o
// resto do desenho não entra), os pontos/trechos das camadas de contexto saem, a vista principal
// sempre vira cena e os equipamentos do objetivo com posição na vista entram.
function montarPlantas(arquitetura, plantas, opcoes, obj = null) {
  const varias = plantas.length > 1 || !!obj;
  const contexto = new Set(((obj && obj.camadasDeContexto) || []).map(l => String(l).trim().toUpperCase()));
  const daBase = (x) => !contexto.size || x?.layer == null || !contexto.has(String(x.layer).trim().toUpperCase());
  const cenas = [];
  for (const p of plantas) {
    // uma planta só: o desenho inteiro (a leitura já tirou diagrama, tabela e legenda)
    const arq = varias ? recortarArquitetura(arquitetura, p.caixa) : arquitetura;
    // (diagrama do projeto no desenho que não foi lido: o aviso da leitura vai junto — ./arquitetura.js, 06/11/2026)
    const avisos = [...(opcoes.avisos || []), ...(arquitetura.avisosDiagrama || [])];
    let dispositivos = [];
    let trechos = (opcoes.trechos || []).filter(daBase).map(t => ({ ...t, segmentos: varias ? t.segmentos.filter(s => naCaixa(p.caixa, [s[0], s[1]], 1) || naCaixa(p.caixa, [s[2], s[3]], 1)) : t.segmentos })).filter(t => t.segmentos.length);
    let origem = '';
    let instalacao = null; // modelo único da instalação (formulário da skill)
    if (opcoes.dispositivosReais?.length) {
      dispositivos = (varias ? opcoes.dispositivosReais.filter(d => naCaixa(p.caixa, [d.x, d.y], 1)) : opcoes.dispositivosReais).filter(daBase);
      if (dispositivos.length) origem = 'projeto';
    }
    if (!dispositivos.length && opcoes.lerDoDesenho !== false) {
      // leitura que falha (mapa com símbolo desconhecido, desenho estranho) não derruba o modelo
      let lidos = { pontos: [], trechos: [] };
      try { lidos = pontosDoDesenho(arq, { aprendidos: opcoes.aprendidos || [] }); } catch (e) { avisos.push(`Símbolos desenhados não lidos nesta planta: ${e.message}`); }
      if (lidos.pontos.length) {
        dispositivos = lidos.pontos;
        if (!trechos.length) trechos = lidos.trechos;
        origem = 'desenho';
        const cont = {};
        for (const d of lidos.pontos) cont[d.simbolo] = (cont[d.simbolo] || 0) + 1;
        // alturas: da legenda (tomada alta/média/baixa pelo preenchimento) e das notas ao lado do ponto
        const deParede = lidos.pontos.filter(d => DE_PAREDE.test(d.simbolo));
        const pela = (o) => deParede.filter(d => d.alturaDe === o).length;
        const sem = deParede.filter(d => !d.alturaDe).length;
        avisos.push(`Pontos lidos dos símbolos desenhados nesta planta (pela layer e pela medida): ${Object.entries(cont).map(([k, n]) => `${n} ${ROTULO_SIMBOLO[k] || k}`).join(', ')}.`
          + (deParede.length ? ` Alturas: ${pela('legenda')} pela legenda das pranchas, ${pela('nota')} pela nota escrita ao lado do ponto${pela('aprendido') ? `, ${pela('aprendido')} pelo que o sistema aprendeu de projetos anteriores` : ''}${pela('mapa') ? `, ${pela('mapa')} pelo mapa conferido` : ''}${sem ? `; ${sem} sem altura no projeto aparecem na altura típica — [CONFERIR]` : ''}.` : ''));
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
          if (pts.instalacao) instalacao = instalacao ? juntarInstalacoes(instalacao, pts.instalacao) : pts.instalacao;
        } catch (e) { avisos.push(`${disc}: sem pontos no 3D — ${e.message}`); }
      }
    }
    // equipamentos do objetivo do projeto com posição nesta vista (o já lido no desenho não repete)
    let doObjetivo = null;
    if (obj) {
      doObjetivo = OBJ.dispositivosDoObjetivo(obj, p.vista || { id: null, caixa: p.caixa }, dispositivos);
      if (doObjetivo.dispositivos.length) { dispositivos = [...dispositivos, ...doObjetivo.dispositivos]; if (!origem) origem = 'objetivo'; }
      if (doObjetivo.semPosicao.length) avisos.push(`${doObjetivo.semPosicao.length} componente(s) do projeto sem posição na planta (não aparecem no 3D): ${doObjetivo.semPosicao.slice(0, 8).map(c => c.descricao || c.tipo).join('; ')}${doObjetivo.semPosicao.length > 8 ? '…' : ''} [CONFERIR].`);
    }
    if (!dispositivos.length) avisos.push('Nenhum ponto de instalação desenhado nesta planta: o modelo mostra só a arquitetura (nada é estimado).');
    // planta sem ponto e sem ambiente com nome (detalhe, legenda, vista solta): não
    // vira modelo — na Arena (01/11/2026) saía uma "Planta 4" que ninguém sabia o que era
    // (a vista principal do objetivo do projeto sempre vira)
    if (!obj && varias && !dispositivos.length && !arq.ambientes.some(a => !a.semNome)) continue;
    const cena = montarCena(arq, {
      peDireito: opcoes.peDireito, dispositivos, avisos, trechos, estimarInfra: false, sugerirInfra: opcoes.sugerirInfra !== false,
      // circuitos originais dos quadros (unifilar/quadro de cargas, lidos no desenho inteiro) e os textos curtos da
      // planta (número do circuito junto do ponto, tag junto do quadro): ./quadrosDoDiagrama.js
      quadrosDoDiagrama: arquitetura.quadrosDoDiagrama || [], rotulos: arquitetura.rotulos || [],
      titulo: opcoes.titulo, cliente: opcoes.cliente, obra: opcoes.obra, proposta: opcoes.proposta,
      ...(instalacao ? { instalacao } : {}),
    });
    cena.plantaInfo = { n: p.n, nome: p.nome, caixa: p.caixa.map(v => Math.round(v * 100) / 100), pontos: dispositivos.length, origem, area_m2: p.area_m2 };
    if (obj) {
      cena.componentes = doObjetivo.componentes;
      const comps = (obj.componentes || []).filter(c => c && !/^port/i.test(String(c.tipo || '')));
      cena.objetivoInfo = OBJ.infoDoObjetivo(obj, p.vista || null, comps.length, doObjetivo.semPosicao.length);
    }
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
    numeros: { ...c.numeros, ...(c.objetivoInfo ? { objetivo: c.objetivoInfo } : {}), plantas: cenas.map(x => ({ nome: x.plantaInfo.nome, pontos: x.plantaInfo.pontos, origem: x.plantaInfo.origem, ambientes: x.numeros.ambientes, interativo: !!x.instalacao })) },
    avisos: [...(cenas.length > 1 ? [`${cenas.length} plantas no desenho — cada uma é um modelo à parte (escolha no seletor "Planta" do 3D).`] : []), ...c.avisos],
  };
}

module.exports = { montarCenasPorPlanta, resumoDasCenas };
