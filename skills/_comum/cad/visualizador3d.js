// Página HTML AUTOSSUFICIENTE do modelo 3D ilustrativo: um arquivo só, que o
// cliente abre em qualquer navegador, sem internet (three.js embutido no
// bundle ./visualizador3d/app.bundle.js, cena em JSON, logo em base64).
// Identidade H&M: dourado #c9a227 sobre fundo escuro.
const fs = require('fs');
const path = require('path');
const { EMPRESA } = require('../empresa');
const { construir, bundleAtualizado, SAIDA } = require('./visualizador3d/construir');

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// JSON dentro de <script>: sem "</script>" nem separadores de linha do JS
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const jsonSeguro = (o) => JSON.stringify(o).split('<').join('\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');

function lerBundle() {
  // bundle velho (app.js mudou) é refeito quando o esbuild (devDependency) está instalado
  if (!bundleAtualizado()) {
    try { construir(); } catch (e) { if (!fs.existsSync(SAIDA)) throw new Error(`Visualizador 3D sem bundle: rode "npm run build:3d" na pasta skills (${e.message}).`); }
  }
  return fs.readFileSync(SAIDA, 'utf8').replace(/<\/script/gi, '<\\/script');
}

const CSS = `
:root{--ouro:#c9a227;--ouro2:#e2c35a;--fundo:#111317;--painel:rgba(22,25,31,.97);--borda:#2c3038;--texto:#ebe8e1;--suave:#9ea3ab}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--fundo);color:var(--texto);font:14px/1.35 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;overflow:hidden}
#tela{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}
header{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;gap:14px;padding:10px 16px;background:linear-gradient(180deg,rgba(10,11,14,.95),rgba(10,11,14,.7));border-bottom:1px solid rgba(201,162,39,.35);z-index:5}
header img{width:46px;height:46px;border-radius:50%;background:#fff;padding:2px;flex:none}
header .marca{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ouro)}
header h1{margin:1px 0 0;font-size:18px;font-weight:600;line-height:1.2}header h1 small{display:block;font-size:12.5px;font-weight:500;color:var(--ouro2)}
footer details ul[hidden]{display:none}#barra #ir-planta{max-width:340px;border-color:var(--ouro);color:var(--ouro2)}
header .meta{margin-left:auto;text-align:right;font-size:12px;color:var(--suave);line-height:1.5}
header .meta b{color:var(--texto);font-weight:600}
#barra{position:fixed;top:68px;left:16px;right:16px;display:flex;flex-wrap:wrap;gap:6px;z-index:4}
#barra button,#disciplinas button,#barra select{background:#1e2128;color:var(--suave);border:1px solid var(--borda);border-radius:6px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}
#barra select{max-width:210px;color:var(--texto)}#barra select option{background:#1e2128;color:var(--texto)}
#barra button:hover,#barra select:hover{border-color:var(--ouro);color:var(--texto)}
#barra button.ativo{background:#2c2715;border-color:var(--ouro);color:var(--ouro2)}
#disciplinas{display:contents}
#barra button.disc i{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--cor);margin-right:6px;opacity:.35}
#barra button.disc.ativo{background:color-mix(in srgb,var(--cor) 18%,#1c1f25);border-color:var(--cor);color:var(--texto)}
#barra button.disc.ativo i{opacity:1}#barra button small{opacity:.7}
aside{position:fixed;top:112px;right:16px;bottom:52px;width:330px;overflow:auto;z-index:4;display:flex;flex-direction:column;gap:10px}
aside section{background:var(--painel);border:1px solid var(--borda);border-radius:8px;padding:10px 12px}
aside h2{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ouro);display:flex;justify-content:space-between;cursor:pointer;user-select:none}
aside h2::after{content:"–";color:var(--suave)}aside section.fechada h2::after{content:"+"}aside section.fechada>:not(h2){display:none!important}
#numeros{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}
.num div{font-size:18px;font-weight:600;color:var(--texto);white-space:nowrap}.num div span{font-size:11px;color:var(--ouro);font-weight:600;margin-right:2px}
.num small{display:block;color:var(--suave);font-size:11.5px;line-height:1.25}
#lista-ambientes table{width:100%;border-collapse:collapse;font-size:12px}#lista-ambientes th{color:var(--suave);font-weight:500;text-align:right;border-bottom:1px solid var(--borda);padding:3px 2px}
#lista-ambientes th:first-child,#lista-ambientes td:first-child{text-align:left}#lista-ambientes td{text-align:right;padding:3px 2px;border-bottom:1px solid rgba(255,255,255,.04)}
#lista-ambientes i,.tipos i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;vertical-align:0}
.leg{display:flex;align-items:center;gap:9px;width:100%;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.05);color:var(--texto);padding:6px 2px;font:inherit;text-align:left;cursor:pointer;opacity:.4}
.leg.ativo{opacity:1}.leg span{flex:1;font-size:12.5px}.leg small{display:block;color:var(--suave);font-size:11px}.leg b{color:var(--ouro2);font-weight:600}
.leg i{flex:none;width:16px;height:16px;background:var(--cor);border-radius:3px;box-shadow:0 0 6px color-mix(in srgb,var(--cor) 60%,transparent)}
.leg i.f-tomada,.leg i.f-interruptor{width:12px;height:14px}.leg i.f-luminaria{width:18px;height:18px;border-radius:2px}.leg i.f-ponto-luz,.leg i.f-detector,.leg i.f-sensor{border-radius:50%}
.leg i.f-rede,.leg i.f-coaxial,.leg i.f-teclado{width:12px;height:14px}.leg i.f-ap,.leg i.f-dome,.leg i.f-sirene{border-radius:50%}.leg i.f-emergencia{width:20px;height:8px}.leg i.f-wallbox{width:12px;height:16px}
.leg i.f-infra{width:22px;height:6px;border-radius:1px}.leg i.f-infra.f-tubo{height:4px;border-radius:3px}.leg i.f-infra.f-linha{height:2px}
.leg i.f-camera{width:20px;height:10px;border-radius:2px 6px 6px 2px}.leg i.f-barra{width:20px;height:6px}.leg i.f-quadro,.leg i.f-rack{width:14px;height:18px;border-radius:2px}
.tipos{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11.5px;color:var(--suave)}
#etiquetas{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.etq{position:absolute;left:0;top:0;padding:3px 8px;border-radius:5px;background:rgba(15,17,21,.78);border:1px solid rgba(201,162,39,.45);text-align:center;white-space:nowrap;font-size:11.5px;line-height:1.25}
.etq b{display:block;font-weight:600;color:#fff;font-size:11.5px}.etq span{color:var(--ouro2);font-size:10.5px}
#etiquetas-pontos{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.etq-p{position:absolute;left:0;top:0;padding:2px 7px 3px;border-radius:5px;background:rgba(12,13,16,.86);border:1px solid var(--cor,#c9a227);border-left-width:4px;white-space:nowrap;font-size:11px;line-height:1.25;text-align:left}
.etq-p b{display:block;font-weight:600;color:#fff;font-size:11px}.etq-p span{color:var(--suave);font-size:10.5px}
#dentro{position:fixed;left:50%;bottom:52px;transform:translateX(-50%);z-index:6;display:none;align-items:center;gap:12px;padding:8px 10px 8px 14px;background:var(--painel);border:1px solid var(--ouro);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.45);max-width:calc(100vw - 32px)}
#dentro.aberto{display:flex}#dentro .onde{font-size:11px;color:var(--suave);line-height:1.3}#dentro .onde b{display:block;font-size:15px;color:var(--ouro2);font-weight:600}
#dentro small{color:var(--suave);font-size:11px;max-width:330px;line-height:1.3}
#dentro button{flex:none;background:var(--ouro);color:#15171b;border:0;border-radius:7px;padding:9px 14px;font:inherit;font-weight:600;cursor:pointer}
#dentro button:hover{background:var(--ouro2)}
body.modo-dentro aside{display:none}
#dica small{color:var(--suave)}
#dica{position:fixed;display:none;z-index:6;pointer-events:none;background:rgba(12,13,16,.95);border:1px solid var(--ouro);border-radius:6px;padding:6px 9px;font-size:12px;max-width:280px}
#dica b{color:var(--ouro2)}
footer{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:16px;align-items:center;padding:8px 16px;background:rgba(10,11,14,.9);border-top:1px solid rgba(201,162,39,.35);font-size:12px;color:var(--suave)}
footer .aviso{color:var(--ouro2);font-weight:600}footer .comandos{margin-left:auto;white-space:nowrap}
footer details{position:relative}footer summary{cursor:pointer;color:var(--texto)}footer details ul{position:absolute;bottom:28px;left:0;width:min(640px,90vw);max-height:40vh;overflow:auto;margin:0;padding:10px 14px 10px 28px;background:var(--painel);border:1px solid var(--borda);border-radius:8px;color:var(--texto)}
#semwebgl{position:fixed;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:40px;z-index:9;background:var(--fundo)}
.sim-on{color:#5fd07a}.sim-off{color:#ff7b72}.sim-tit{font-weight:600;color:var(--ouro2);margin:6px 0 4px;padding-right:18px}.sim-tit.grande{font-size:15px}.sim-tit small{color:var(--suave);font-weight:400}
.sim-est{font-size:12.5px;margin:2px 0 6px}#ficha table,.sim-circ table{width:100%;border-collapse:collapse;font-size:12px}
#ficha th,.sim-circ th{color:var(--suave);font-weight:500;text-align:left;vertical-align:top;padding:2px 6px 2px 0;width:42%}#ficha td,.sim-circ td{padding:2px 0}.sim-circ small,.sim-est small{color:var(--suave)}
.sim-bs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.sim-b{background:#1e2128;color:var(--texto);border:1px solid var(--borda);border-radius:6px;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer}.sim-b:hover{border-color:var(--ouro)}
.sim-b.liga{background:#1f5f30;border-color:#3fb950;font-weight:600}.sim-b.desliga{background:#26282d;border-color:#8a8f98;font-weight:600}.sim-b.emerg{background:#8a1c1c;border-color:#e5484d;color:#fff;font-weight:600}
.sim-luzes{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:10.5px;color:var(--suave);margin:4px 0}.sim-luz i{display:inline-block;width:12px;height:12px;border-radius:50%;background:color-mix(in srgb,var(--c) 22%,#111);margin-right:4px;vertical-align:-2px;border:1px solid #444}
.sim-luz.acesa{color:var(--texto)}.sim-luz.acesa i{background:var(--c);box-shadow:0 0 8px var(--c)}.sim-painel,.sim-circ{border-top:1px solid var(--borda);margin-top:8px;padding-top:6px}
.sim-lista{display:flex;flex-direction:column;gap:3px}.sim-dj{display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--borda);border-radius:6px;padding:4px 8px;color:var(--texto);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.sim-dj:hover{border-color:var(--ouro)}.sim-dj i{flex:none;width:10px;height:18px;border-radius:2px;background:#2f9e44}.sim-dj.on i{background:#d62828}.sim-dj b{min-width:46px;color:var(--ouro2)}.sim-dj span small{display:block;color:var(--suave);font-size:11px}.sim-dj.off{opacity:.72}
.sim-aviso{position:fixed;left:50%;bottom:62px;transform:translate(-50%,16px);opacity:0;transition:opacity .25s,transform .25s;z-index:12;background:rgba(12,13,16,.95);border:1px solid var(--ouro);border-radius:8px;padding:7px 14px;font-size:13px;pointer-events:none;max-width:90vw}.sim-aviso.visivel{opacity:1;transform:translate(-50%,0)}
#ficha{position:fixed;left:16px;bottom:52px;width:350px;max-height:calc(100vh - 210px);overflow:auto;z-index:6;background:var(--painel);border:1px solid var(--ouro);border-radius:10px;padding:8px 12px;display:none;box-shadow:0 6px 24px rgba(0,0,0,.45)}
#ficha.aberta{display:block}#ficha .fechar{position:absolute;right:6px;top:4px;background:none;border:0;color:var(--suave);font-size:20px;line-height:1;cursor:pointer}body.modo-dentro #ficha{bottom:118px}
#q-sim{position:fixed;inset:0;z-index:10;background:var(--fundo);display:none}#q-sim.aberto{display:block}#q-sim #barra{top:12px}#q-sim aside{top:60px;bottom:16px;display:flex}
#q-sim .q-nome{align-self:center;color:var(--ouro2);font-weight:600;margin:0 6px;flex:none;white-space:nowrap}body.modo-dentro .sim-aviso{bottom:118px}#q-sim #b-voltar-predio{background:var(--ouro);color:#15171b;border-color:var(--ouro);font-weight:600}
.etq-q{position:absolute;left:0;top:0;padding:1px 5px;border-radius:4px;background:rgba(12,13,16,.78);border:1px solid rgba(201,162,39,.55);color:#fff;font-size:10.5px;white-space:nowrap}.etq-dica{position:fixed;z-index:11;pointer-events:none;border-color:var(--ouro);font-size:12px}
#q-sim #info table{width:100%;border-collapse:collapse;font-size:12px}#q-sim #info th{color:var(--suave);font-weight:500;text-align:left;vertical-align:top;padding:3px 6px 3px 0;width:38%}#q-sim #info td{padding:3px 0;word-break:break-word}#q-sim #info .tag{display:block;font-size:16px;color:var(--ouro2);margin-bottom:6px}#q-sim #info small{color:var(--suave)}
#dentro-cenas{display:flex;flex-wrap:wrap;gap:5px;align-items:center;max-width:44vw}#dentro-cenas:empty{display:none}#dentro-cenas>span{font-size:11px;color:var(--suave);margin-right:2px}#dentro-cenas>i{width:8px}
#dentro .sim-b{background:#1e2128;color:var(--texto);border:1px solid var(--borda);border-radius:6px;padding:5px 9px;font-weight:500;font-size:12px}#dentro .sim-b:hover{background:#262a32;border-color:var(--ouro)}.sim-b.ativo,#dentro .sim-b.ativo{background:#2c2715;border-color:var(--ouro);color:var(--ouro2)}
#mapa-lux{position:fixed;left:50%;bottom:52px;transform:translateX(-50%);z-index:6;width:min(380px,calc(100vw - 32px));background:var(--painel);border:1px solid var(--ouro);border-radius:10px;padding:8px 12px;display:none;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,.45)}#mapa-lux.aberto{display:block}body.modo-dentro #mapa-lux{bottom:118px}
#mapa-lux .tit{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ouro)}#mapa-lux .barra{height:12px;border-radius:3px;margin:6px 0 2px}#mapa-lux .marcas{display:flex;justify-content:space-between;font-size:10.5px;color:var(--suave)}#mapa-lux .t{margin:6px 0 2px}#mapa-lux b{color:var(--ouro2)}#mapa-lux small{color:var(--suave);display:block;margin-top:6px;line-height:1.3}
@media (max-width:900px){#ficha{left:12px;right:12px;width:auto;bottom:64px;max-height:45vh}#mapa-lux{left:12px;right:12px;width:auto;transform:none;bottom:64px}body.modo-dentro #mapa-lux{bottom:124px}#dentro{flex-wrap:wrap}#dentro-cenas{max-width:none;order:3;width:100%}#q-sim aside{top:auto;bottom:12px;max-height:42vh}}
@media (max-width:900px){#dentro{left:12px;right:12px;bottom:58px;transform:none;justify-content:space-between}#dentro small{display:none}#barra select{flex:none}#barra{flex-wrap:nowrap;overflow-x:auto;left:0;right:0;padding:0 12px 4px;scrollbar-width:none}#barra button{flex:none}aside{top:auto!important;left:12px;right:12px;width:auto;max-height:40vh;bottom:64px}header .meta{display:none}footer .comandos{display:none}header h1{font-size:15px}}
`;

// Premissas de uma cena (rodapé "Premissas do modelo")
function premissasDa(cena) {
  return [cena.aviso, `Pé-direito adotado: ${String(cena.peDireito).replace('.', ',')} m; portas com 2,10 m; janelas com peitoril de 1,10 m e topo a 2,10 m.`,
    'Componentes em tamanho típico, um pouco exagerado nos pequenos (tomada 10 × 16 cm); de longe são ampliados para continuarem visíveis. Altura indicada = centro da peça.',
    ...((cena.infra || []).length ? [`Infraestrutura (eletrocalhas, eletrodutos, leitos, perfilados) perto do teto, com descida até as peças de parede: tipo e medida do projeto quando o desenho diz (senão, seção padrão ilustrativa)${cena.infra.some(g => g.estimado) ? '; onde o projeto não traz o traçado, eletroduto ESTIMADO do quadro/rack/central até cada ponto — conferir' : ''}${cena.infra.some(g => g.sugerido) ? '; em azul-claro translúcido, os caminhos SUGERIDOS pelo sistema para ligar ao quadro/à rede os pontos que o desenho deixou soltos (botão "Sugeridos")' : ''}. Passe o mouse no traçado para ver tipo, medida e comprimento.`] : []),
    ...(cena.avisos || [])];
}

// cenas: uma cena, ou a lista delas — UMA POR PLANTA da prancha (./pranchas.js), cada
// uma com cena.plantaInfo = { nome } (cena.planta é a imagem da planta no piso). Com várias, a página traz todas e um seletor
// "Planta"; a escolhida vai no endereço (#planta=2) e a página recarrega com ela —
// cada planta é um modelo à parte, nada se mistura. principal = a que abre (índice).
function gerarHtml(cenas, { principal = 0 } = {}) {
  const lista = Array.isArray(cenas) ? cenas : [cenas];
  const varias = lista.length > 1;
  const cena = lista[Math.min(Math.max(0, principal), lista.length - 1)];
  const logo = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-pequeno.png')).toString('base64')}`;
  const meta = [
    [cena.cliente && `Cliente: <b>${escapeHtml(cena.cliente)}</b>`, cena.obra && `Obra: <b>${escapeHtml(cena.obra)}</b>`].filter(Boolean).join(' · '),
    [cena.proposta && `Proposta: <b>${escapeHtml(cena.proposta)}</b>`, `gerado em ${escapeHtml(cena.data)}`].filter(Boolean).join(' · '),
  ].filter(Boolean).join('<br>');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(cena.titulo)} — H&amp;M Engenharia</title>
<style>${CSS}</style>
</head>
<body>
<canvas id="tela"></canvas>
<div id="etiquetas"></div>
<div id="etiquetas-pontos"></div>
<header>
  <img src="${logo}" alt="H&amp;M">
  <div><div class="marca">${escapeHtml(EMPRESA.nomeFantasia)}</div><h1>${escapeHtml(cena.titulo)}${varias ? `<small id="nome-planta">${escapeHtml(cena.plantaInfo?.nome || '')}</small>` : ''}</h1></div>
  <div class="meta">${meta}</div>
</header>
<nav id="barra">
${varias ? `  <select id="ir-planta" title="Cada planta da prancha é um modelo à parte">${lista.map((c, i) => `<option value="${i}">${escapeHtml(c.plantaInfo?.nome || `Planta ${i + 1}`)}</option>`).join('')}</select>
` : ''}  <button id="b-3d" title="Voltar à vista em perspectiva">Vista 3D</button>
  <button id="b-cima" title="Planta vista de cima">Vista de cima</button>
  <button id="b-giro">Giro automático</button>
  <select id="ir-ambiente" title="Entrar num ambiente (vista de dentro, na altura dos olhos)"><option value="">Ir para ambiente…</option></select>
  <button id="b-paredes" title="Paredes sólidas, translúcidas ou ocultas">Paredes</button>
  <button id="b-corte" title="Rebaixa as paredes da frente para ver o interior">Corte</button>
  <button id="b-ambientes">Ambientes</button>
  <button id="b-etiquetas">Etiquetas</button>
  <button id="b-portas">Portas</button>
  <button id="b-planta" title="Linhas da planta no piso: mobiliário, louças, bancadas, escada">Mobiliário</button>
  <span id="disciplinas"></span>
  <button id="b-infra" title="Eletrocalhas, eletrodutos, leitos e perfilados">Infraestrutura</button>
  <button id="b-sugerido" title="Caminhos de eletroduto sugeridos pelo sistema para ligar ao quadro/à rede os pontos que o projeto deixou soltos (translúcidos, em azul-claro)">Sugeridos</button>
  <button id="b-campo" title="Campo de visão das câmeras e cobertura dos sensores (estimados)">Campo de visão</button>
  <button id="b-grandes" title="Aumenta os símbolos dos pontos">Símbolos maiores</button>
  <button id="b-tela">Tela cheia</button>
</nav>
<aside>
  <section><h2>Números do projeto</h2><div id="numeros"></div></section>
  <section><h2>Legenda dos pontos</h2><div id="legenda"></div></section>
  <section class="fechada"><h2>Ambientes</h2><div id="lista-ambientes"></div></section>
</aside>
<div id="dica"></div>
<div id="dentro"><div class="onde">Dentro do ambiente<b id="dentro-nome"></b></div><small>arraste para olhar em volta · roda ou pinça = zoom · duplo clique no piso = andar · Esc = voltar</small><button id="b-voltar">Voltar à vista geral</button></div>
<footer>
  <span class="aviso">Ilustração — não substitui o projeto executivo.</span>
  <details><summary>Premissas do modelo</summary>${lista.map((c, i) => `<ul data-planta="${i}"${c === cena ? '' : ' hidden'}>${premissasDa(c).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`).join('')}</details>
  <span class="comandos">arraste para girar · roda para zoom · botão direito (ou dois dedos) para mover · duplo clique num ambiente para entrar</span>
</footer>
<div id="semwebgl"><div><h2>Seu navegador não abriu o 3D (WebGL desligado).</h2><p>Abra este arquivo no Chrome, Edge ou Firefox atualizados.</p></div></div>
<script>${varias ? `window.CENAS=${jsonSeguro(lista)};(function(){var m=/planta=([0-9]+)/.exec(location.hash),i=m?Number(m[1])-1:${lista.indexOf(cena)};if(!(i>=0&&i<CENAS.length))i=${lista.indexOf(cena)};window.CENA=CENAS[i];document.querySelectorAll('footer ul[data-planta]').forEach(function(u){u.hidden=Number(u.dataset.planta)!==i});var s=document.getElementById('ir-planta');s.value=String(i);s.onchange=function(){location.hash='planta='+(Number(s.value)+1);location.reload()};document.getElementById('nome-planta').textContent=CENA.plantaInfo?CENA.plantaInfo.nome:''})();` : `window.CENA=${jsonSeguro(cena)};`}document.querySelectorAll('aside h2').forEach(function(h){h.onclick=function(){h.parentNode.classList.toggle('fechada')}});
if(innerWidth<=900)document.querySelectorAll('aside section').forEach(function(s){s.classList.add('fechada')});
function hmLayout(){var h=document.querySelector('header'),n=document.querySelector('#barra'),a=document.querySelector('aside');n.style.top=(h.offsetHeight+6)+'px';if(innerWidth>900)a.style.top=(n.offsetTop+n.offsetHeight+8)+'px'}addEventListener('resize',hmLayout);addEventListener('load',hmLayout);hmLayout();</script>
<script>${lerBundle()}</script>
</body>
</html>
`;
}

// CSS, bundle e JSON seguro também servem a outras páginas 3D (skills/quadros: modelo do quadro elétrico)
module.exports = { gerarHtml, escapeHtml, CSS, lerBundle, jsonSeguro };
