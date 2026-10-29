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
header h1{margin:1px 0 0;font-size:18px;font-weight:600;line-height:1.2}
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
@media (max-width:900px){#dentro{left:12px;right:12px;bottom:58px;transform:none;justify-content:space-between}#dentro small{display:none}#barra select{flex:none}#barra{flex-wrap:nowrap;overflow-x:auto;left:0;right:0;padding:0 12px 4px;scrollbar-width:none}#barra button{flex:none}aside{top:auto!important;left:12px;right:12px;width:auto;max-height:40vh;bottom:64px}header .meta{display:none}footer .comandos{display:none}header h1{font-size:15px}}
`;

// opcoes: { titulo }
function gerarHtml(cena) {
  const logo = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-pequeno.png')).toString('base64')}`;
  const meta = [
    [cena.cliente && `Cliente: <b>${escapeHtml(cena.cliente)}</b>`, cena.obra && `Obra: <b>${escapeHtml(cena.obra)}</b>`].filter(Boolean).join(' · '),
    [cena.proposta && `Proposta: <b>${escapeHtml(cena.proposta)}</b>`, `gerado em ${escapeHtml(cena.data)}`].filter(Boolean).join(' · '),
  ].filter(Boolean).join('<br>');
  const premissas = [cena.aviso, `Pé-direito adotado: ${String(cena.peDireito).replace('.', ',')} m; portas com 2,10 m; janelas com peitoril de 1,10 m e topo a 2,10 m.`,
    'Componentes em tamanho típico, um pouco exagerado nos pequenos (tomada 10 × 16 cm); de longe são ampliados para continuarem visíveis. Altura indicada = centro da peça.',
    ...((cena.infra || []).length ? ['Infraestrutura (eletrocalhas, eletrodutos, leitos, perfilados) a partir dos trechos do projeto, perto do teto; altura e seção ilustrativas.'] : []),
    ...(cena.avisos || [])];
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
  <div><div class="marca">${escapeHtml(EMPRESA.nomeFantasia)}</div><h1>${escapeHtml(cena.titulo)}</h1></div>
  <div class="meta">${meta}</div>
</header>
<nav id="barra">
  <button id="b-3d" title="Voltar à vista em perspectiva">Vista 3D</button>
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
  <details><summary>Premissas do modelo</summary><ul>${premissas.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul></details>
  <span class="comandos">arraste para girar · roda para zoom · botão direito (ou dois dedos) para mover · duplo clique num ambiente para entrar</span>
</footer>
<div id="semwebgl"><div><h2>Seu navegador não abriu o 3D (WebGL desligado).</h2><p>Abra este arquivo no Chrome, Edge ou Firefox atualizados.</p></div></div>
<script>window.CENA=${jsonSeguro(cena)};document.querySelectorAll('aside h2').forEach(function(h){h.onclick=function(){h.parentNode.classList.toggle('fechada')}});
if(innerWidth<=900)document.querySelectorAll('aside section').forEach(function(s){s.classList.add('fechada')});
function hmLayout(){var h=document.querySelector('header'),n=document.querySelector('#barra'),a=document.querySelector('aside');n.style.top=(h.offsetHeight+6)+'px';if(innerWidth>900)a.style.top=(n.offsetTop+n.offsetHeight+8)+'px'}addEventListener('resize',hmLayout);addEventListener('load',hmLayout);hmLayout();</script>
<script>${lerBundle()}</script>
</body>
</html>
`;
}

module.exports = { gerarHtml, escapeHtml };
