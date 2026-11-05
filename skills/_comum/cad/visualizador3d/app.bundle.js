/* Visualizador 3D H&M — fonte:d3403e7eb3e99f8d — inclui three.js r186 (0.186.1) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */
(()=>{var Vf=Object.create;var cu=Object.defineProperty;var Gf=Object.getOwnPropertyDescriptor;var Hf=Object.getOwnPropertyNames;var Wf=Object.getPrototypeOf,Xf=Object.prototype.hasOwnProperty;var hu=(i,t)=>()=>{try{return t||i((t={exports:{}}).exports,t),t.exports}catch(e){throw t=0,e}};var qf=(i,t,e,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of Hf(t))!Xf.call(i,s)&&s!==e&&cu(i,s,{get:()=>t[s],enumerable:!(n=Gf(t,s))||n.enumerable});return i};var uu=(i,t,e)=>(e=i!=null?Vf(Wf(i)):{},qf(t||!i||!i.__esModule?cu(e,"default",{value:i,enumerable:!0}):e,i));var vf=hu((Xb,xf)=>{var yv=new Set(["luminaria","ponto_luz"]),Hh="motor",cs=i=>Array.isArray(i.cenas)&&i.cenas.length&&i.cenas.every(t=>t&&typeof t=="object"),Mv=[1,.6,.3,0];function Wh(i,t){let e=i?.niveis&&t!=null&&t in i.niveis?i.niveis[t]:i?.padrao;return Math.max(0,Math.min(1,Number(e)||0))}var Xl=i=>Math.max(Wh(i,null),...Object.values(i?.niveis||{}).map(t=>Math.max(0,Math.min(1,Number(t)||0))));function bv(i,t={}){let e=i||{quadros:[],circuitos:[],pontos:[],comandos:[]},n=t.inicio==="desligado"?"desligado":"ligado",s=e.quadros||[],r=e.circuitos||[],a=e.pontos||[],o=e.comandos||[],l=w=>String(w??""),c=new Map(s.map(w=>[l(w.tag),w])),h=new Map(r.map(w=>[l(w.id),w])),p=new Map(a.map(w=>[l(w.id),w])),u=new Map(o.map(w=>[l(w.id),w])),f=new Map(r.filter(w=>w.tipo===Hh).map(w=>[l(w.id),w])),_=(w,I)=>`${l(w)}|${l(I)}`,v;function g(){let w={protecao:{},comandos:{},paineis:{},emergenciaQuadro:{}};for(let X of s){X.geral?.tag&&(w.protecao[_(X.tag,X.geral.tag)]=!0);for(let K of X.disjuntores||[])w.protecao[_(X.tag,K.tag)]=!0;for(let K of X.drs||[])K.ddr||(w.protecao[_(X.tag,K.tag)]=!0);w.emergenciaQuadro[l(X.tag)]=!1}let I=n==="ligado";for(let X of o){let K=(X.dispositivos||[]).map(l),rt={pos:{},rele:!1,k:!1,emergencia:!1,presenca:!1,habilitado:!0,nivel:0,ultimo:1,cena:-1};K.forEach(yt=>{rt.pos[yt]=!1}),K.length||(rt.pos._=!1),I&&(rt.pos[Object.keys(rt.pos)[0]]=!0,rt.rele=!0,rt.k=!0,rt.presenca=!0,rt.nivel=1,rt.cena=X.tipo==="cena"||!cs(X)?0:-1,X.tipo==="cena"&&cs(X)&&(rt.nivel=Xl(X.cenas[0]))),w.comandos[l(X.id)]=rt}for(let X of f.keys())w.paineis[X]={k:!1,emergencia:!1,termico:!1};return w}v=g();let m=0,C=new Set;function L(w){k(),m++;for(let I of[...C])try{I(w)}catch{}}function S(w,I){if(I!=null&&I!=="")return c.get(l(I))||null;let X=l(w);return s.find(K=>K.geral?.tag===X||(K.disjuntores||[]).some(rt=>rt.tag===X)||(K.drs||[]).some(rt=>rt.tag===X))||null}function T(w,I){let X=S(w,I);if(!X)return null;let K=l(w);if(X.geral?.tag===K)return{tipo:"geral",quadro:X,item:X.geral};let rt=(X.disjuntores||[]).find(ie=>ie.tag===K);if(rt)return{tipo:(X.drs||[]).some(ie=>ie.ddr&&ie.tag===K)?"ddr":"disjuntor",quadro:X,item:rt};let yt=(X.drs||[]).find(ie=>ie.tag===K&&!ie.ddr);return yt?{tipo:"dr",quadro:X,item:yt}:null}function A(w,I){let X=T(w,I);return X?v.protecao[_(X.quadro.tag,w)]!==!1:!1}function N(w,I=new Set){let X=h.get(l(w));if(!X)return`circuito ${w} não existe no modelo`;let K=c.get(l(X.quadro));if(!K)return`quadro ${X.quadro} não existe no modelo`;if(K.alimentado_por!=null&&K.alimentado_por!==""&&!I.has(l(K.tag))){I.add(l(K.tag));let rt=N(K.alimentado_por,I);if(rt)return`${K.tag} sem alimentação (${rt})`}if(K.geral?.tag&&v.protecao[_(K.tag,K.geral.tag)]===!1)return`disjuntor geral ${K.geral.tag} do ${K.tag} desligado`;for(let rt of K.drs||[])if(!rt.ddr&&(rt.circuitos||[]).map(l).includes(l(X.id))&&v.protecao[_(K.tag,rt.tag)]===!1)return`${rt.tag} (DR) do ${K.tag} desligado`;return X.disjuntor&&v.protecao[_(K.tag,X.disjuntor)]===!1?`disjuntor ${X.disjuntor} desligado`:null}let y=w=>N(w)===null,R=w=>l((w.circuitos||[])[0]??p.get(l((w.pontos||[])[0]))?.circuito??"");function F(w){let I=R(w);return I?y(I):!0}function O(w){let I=v.comandos[l(w.id)];if(!I)return 0;switch(w.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":return Object.values(I.pos).reduce((X,K)=>X!==!!K,!1)?1:0;case"pulsador_rele_impulso":return I.rele?1:0;case"contator_botoeira":return I.k&&!I.emergencia?1:0;case"sensor_presenca":return I.presenca&&I.habilitado?1:0;case"dimmer":case"dimmer_010":case"dali":case"cena":return cs(w)&&(w.tipo==="cena"||I.cena>=0)?I.cena>=0&&w.cenas[I.cena]?Xl(w.cenas[I.cena]):0:Math.max(0,Math.min(1,Number(I.nivel)||0));default:return Object.values(I.pos).reduce((X,K)=>X!==!!K,!1)?1:0}}function V(w,I){let X=v.comandos[l(w.id)];return X&&cs(w)&&(w.tipo==="cena"||X.cena>=0)?X.cena>=0&&w.cenas[X.cena]?Wh(w.cenas[X.cena],I?.grupo):0:O(w)}function k(){for(let w of o){if(w.tipo!=="contator_botoeira")continue;let I=v.comandos[l(w.id)];I&&I.k&&(!F(w)||I.emergencia)&&(I.k=!1)}for(let[w,I]of f){let X=v.paineis[w],K=X.emergencia||!!v.emergenciaQuadro[l(I.quadro)];X.k&&(!y(w)||K||X.termico)&&(X.k=!1)}}function P(w){let I=f.get(l(w));if(!I)return null;let X=v.paineis[l(w)],K=y(w),rt=X.emergencia||!!v.emergenciaQuadro[l(I.quadro)],yt=K&&X.k&&!rt&&!X.termico;return{id:l(w),descricao:I.descricao||"",quadro:I.quadro,disjuntor:I.disjuntor,alimentado:K,motivo:N(w),contator:X.k,emergencia:rt,emergenciaLocal:X.emergencia,termico:X.termico,girando:yt,sinaleiros:{verde:yt,amarelo:K&&X.termico,vermelho:K&&(rt||X.termico),branco:K}}}function U(w){let I=p.get(l(w));if(!I)return null;let X=h.get(l(I.circuito)),K=X?N(X.id):"ponto sem circuito no modelo",rt=K===null,yt=I.comando?u.get(l(I.comando)):null,ie=rt?1:0,at;if(yv.has(I.tipo))yt&&(ie=rt?V(yt,I):0),at=rt?ie>0?ie<1?`acesa em ${Math.round(ie*100)} %`:"acesa":`apagada pelo comando ${yt?yt.id:""}`.trim():`apagada — sem energia (${K})`;else if(I.tipo===Hh){let dt=P(I.circuito);dt?ie=dt.girando?1:0:yt&&(ie=rt?O(yt):0),at=rt?ie?"em operação":dt?.termico?"parado — relé térmico desarmado":dt?.emergencia?"parado — emergência acionada":"parado":`parado — sem energia (${K})`}else I.tipo==="tomada"||I.tipo==="tue"?at=rt?"com energia":`SEM ENERGIA (${K})`:at=rt?"com energia":`sem energia (${K})`;return{id:l(I.id),tipo:I.tipo,circuito:X?l(X.id):null,comando:yt?l(yt.id):null,alimentado:rt,motivo:K,nivel:ie,energizado:ie>0,texto:at}}let Y=w=>!!U(w)?.energizado;function J(w){let I=u.get(l(w));if(!I)return null;let X=v.comandos[l(w)],K=cs(I)?I.cenas.map(rt=>rt.nome||""):null;return{id:l(w),tipo:I.tipo,saida:O(I),bobina:F(I),...JSON.parse(JSON.stringify(X)),...K?{cenas:K,cenaAtiva:X.cena>=0?K[X.cena]??null:null}:{}}}function ot(w,I,X){let K=T(w,X);if(!K)return!1;let rt=_(K.quadro.tag,w),yt=!!I;return v.protecao[rt]!==!1===yt||(v.protecao[rt]=yt,L({tipo:"protecao",quadro:K.quadro.tag,tag:l(w),ligado:yt})),!0}let j=(w,I)=>ot(w,!A(w,I),I);function st(w,I){let X=p.get(l(w));if(!X)return null;if(X.tipo===Hh&&f.has(l(X.circuito)))return Dt(X.circuito,I||(P(X.circuito).contator?"desliga":"liga"));let K=X.comando?u.get(l(X.comando)):null;if(!K)return null;let rt=v.comandos[l(K.id)];if(!(K.dispositivos||[]).map(l).includes(l(X.id))){let ie=(K.dispositivos||[])[0];return ie!=null&&p.has(l(ie))?st(ie,I):lt(K,rt,null,I)}return lt(K,rt,X,I)}function lt(w,I,X,K){let rt=X?.tipo||"",yt=at=>(L({tipo:"comando",comando:l(w.id),ponto:X?l(X.id):null}),at),ie=()=>{I.nivel>0?(I.ultimo=I.nivel,I.nivel=0):I.nivel=I.ultimo||1};if(cs(w)&&K&&typeof K=="object"&&Number.isFinite(Number(K.cena))){let at=Math.round(Number(K.cena));return I.cena=at>=0&&at<w.cenas.length?at:-1,I.cena>=0?I.nivel=Xl(w.cenas[I.cena]):w.tipo==="cena"&&(I.nivel=0),yt(I.cena>=0?`cena "${w.cenas[I.cena].nome}"`:w.tipo==="cena"?"cenas: desligado":"nível manual")}if(rt==="sensor"&&w.tipo==="sensor_presenca")return I.presenca=!I.presenca,yt(I.presenca?"presença detectada":"ambiente vazio (sensor)");switch(w.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":{let at=X?l(X.id):Object.keys(I.pos)[0];return at==null?null:(I.pos[at]=!I.pos[at],yt(`${at}: tecla na posição ${I.pos[at]?"I":"O"}`))}case"pulsador_rele_impulso":return F(w)?(I.rele=!I.rele,yt(`relé de impulso ${w.rele?.tag||""} ${I.rele?"fechou":"abriu"}`.replace("  "," "))):yt(`pulso sem efeito: bobina do relé ${w.rele?.tag||""} sem tensão`.replace("  "," "));case"contator_botoeira":{let at=K||(I.emergencia?"liberar":I.k?"desliga":"liga");return at==="emergencia"?(I.emergencia=!0,I.k=!1,yt("emergência acionada: contator caiu")):at==="liberar"?(I.emergencia=!1,yt("emergência liberada (aperte LIGA)")):at==="desliga"?(I.k=!1,yt(`contator ${w.rele?.tag||""} desligado`.replace("  "," "))):I.emergencia?yt("LIGA sem efeito: emergência acionada"):F(w)?(I.k=!0,yt(`contator ${w.rele?.tag||""} ligado e selado`.replace("  "," "))):yt("LIGA sem efeito: bobina do contator sem tensão")}case"sensor_presenca":return I.habilitado=!I.habilitado,yt(I.habilitado?"sensor habilitado":"desligamento manual (sensor inibido)");case"dimmer":case"dimmer_010":case"dali":return I.cena>=0&&cs(w)&&(I.nivel=O(w),I.cena=-1),typeof K=="number"&&Number.isFinite(K)?(I.nivel=Math.max(0,Math.min(1,K)),I.nivel>0&&(I.ultimo=I.nivel)):ie(),yt(I.nivel>0?`nível ${Math.round(I.nivel*100)} %`:"desligado");case"cena":{if(cs(w)){let dt=w.cenas.length;return typeof K=="number"&&Number.isFinite(K)?I.cena=Math.round(K)>=0&&Math.round(K)<dt?Math.round(K):-1:I.cena=I.cena>=dt-1?-1:I.cena+1,I.nivel=I.cena>=0?Xl(w.cenas[I.cena]):0,yt(I.cena>=0?`cena "${w.cenas[I.cena].nome}"`:"cenas: desligado")}let at=Array.isArray(w.cenas)&&w.cenas.length?w.cenas.map(Number):Mv;return typeof K=="number"&&Number.isFinite(K)?I.cena=Math.max(0,Math.min(at.length-1,Math.round(K))):I.cena=(I.cena+1)%at.length,I.nivel=at[I.cena],yt(`cena ${I.cena+1}: ${I.nivel>0?`${Math.round(I.nivel*100)} %`:"desligado"}`)}default:{let at=X?l(X.id):Object.keys(I.pos)[0];return at==null?null:(I.pos[at]=!I.pos[at],yt(`${at} acionado`))}}}function Dt(w,I){if(!f.get(l(w)))return null;let K=v.paineis[l(w)],rt=yt=>(L({tipo:"motor",motor:l(w),acao:I}),yt);switch(I){case"liga":{let yt=P(w);return yt.alimentado?yt.emergencia?rt("LIGA sem efeito: emergência acionada"):K.termico?rt("LIGA sem efeito: relé térmico desarmado (rearme)"):(K.k=!0,rt(`${w}: contator ligado e selado — motor em operação`)):rt(`LIGA sem efeito: ${yt.motivo}`)}case"desliga":return K.k=!1,rt(`${w}: motor desligado`);case"emergencia":return K.emergencia=!0,K.k=!1,rt(`${w}: EMERGÊNCIA — motor parado`);case"liberar":return K.emergencia=!1,rt(`${w}: emergência liberada (aperte LIGA)`);case"desarmar_termico":return K.termico=!0,K.k=!1,rt(`${w}: relé térmico desarmado (sobrecarga simulada)`);case"rearmar":return K.termico=!1,rt(`${w}: relé térmico rearmado (aperte LIGA)`);default:return null}}function At(w,I=!0){return c.has(l(w))?(v.emergenciaQuadro[l(w)]=!!I,L({tipo:"emergencia",quadro:l(w),ativa:!!I}),!0):!1}function ae(){v=g(),L({tipo:"reiniciar"})}let ne=()=>JSON.parse(JSON.stringify(v));function wt(w){if(!w||typeof w!="object")return!1;let I=g();for(let X of Object.keys(I.protecao))typeof w.protecao?.[X]=="boolean"&&(I.protecao[X]=w.protecao[X]);for(let X of Object.keys(I.emergenciaQuadro))typeof w.emergenciaQuadro?.[X]=="boolean"&&(I.emergenciaQuadro[X]=w.emergenciaQuadro[X]);for(let X of Object.keys(I.comandos)){let K=w.comandos?.[X];if(!K||typeof K!="object")continue;let rt=I.comandos[X];for(let yt of Object.keys(rt.pos))typeof K.pos?.[yt]=="boolean"&&(rt.pos[yt]=K.pos[yt]);for(let yt of["rele","k","emergencia","presenca","habilitado"])typeof K[yt]=="boolean"&&(rt[yt]=K[yt]);for(let yt of["nivel","ultimo","cena"])Number.isFinite(K[yt])&&(rt[yt]=K[yt])}for(let X of Object.keys(I.paineis)){let K=w.paineis?.[X];if(K&&typeof K=="object")for(let rt of["k","emergencia","termico"])typeof K[rt]=="boolean"&&(I.paineis[X][rt]=K[rt])}return v=I,L({tipo:"importar"}),!0}return{instalacao:e,get versao(){return m},assinar(w){return C.add(w),()=>C.delete(w)},quadros:()=>s,quadro:w=>c.get(l(w))||null,circuito:w=>h.get(l(w))||null,ponto:w=>p.get(l(w))||null,comando:w=>u.get(l(w))||null,temPonto:w=>p.has(l(w)),paineis:()=>[...f.keys()].map(P),dispositivo:T,ligado:A,alimentado:y,motivo:N,energizado:Y,estadoPonto:U,estadoComando:J,painel:P,emergenciaDoQuadro:w=>!!v.emergenciaQuadro[l(w)],definir:ot,alternar:j,desligar:(w,I)=>ot(w,!1,I),ligar:(w,I)=>ot(w,!0,I),acionar:st,motor:Dt,emergenciaQuadro:At,reiniciar:ae,exportar:ne,importar:wt}}var Sv={luminaria:"Luminária",ponto_luz:"Ponto de luz",tomada:"Tomada",tue:"Tomada de uso específico",motor:"Motor",interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptor paralelo",interruptor_intermediario:"Interruptor intermediário",interruptor:"Interruptor",pulsador:"Pulsador",botoeira:"Botoeira liga/desliga",sensor:"Sensor de presença",dimmer:"Dimmer",controlador_010:"Controlador 0-10 V",botoeira_dali:"Botoeira DALI",teclado_cena:"Teclado de cenas"};xf.exports={criarSimulador:bv,ROTULO_PONTO:Sv,nivelNaCena:Wh}});var Pf=hu((jb,Rf)=>{var Sf=Math.PI/180,Cv=(i,t=2)=>Math.round(i*10**t)/10**t;function Zh(i,t,e){let n=i.length;if(e<=i[0])return e<i[0]-1e-9?0:t[0];if(e>=i[n-1])return e>i[n-1]+1e-9?0:t[n-1];let s=i[1]-i[0],r=Math.min(n-2,Math.floor((e-i[0])/s));if(e<i[r]||e>i[r+1])for(r=0;r<n-2&&e>i[r+1];)r++;let a=(e-i[r])/(i[r+1]-i[r]);return t[r]+(t[r+1]-t[r])*a}function Ef(i){if(!i||!Array.isArray(i.C)||!Array.isArray(i.G)||!Array.isArray(i.I))return()=>0;if(i.C.length===1){let t=i.I[0];return(e,n)=>Zh(i.G,t,n)}return(t,e)=>{let n=(t%360+360)%360,s=i.C[1]-i.C[0],r=Math.min(i.C.length-2,Math.floor(n/s));if(n<i.C[r]||n>i.C[r+1])for(r=0;r<i.C.length-2&&n>i.C[r+1];)r++;let a=(n-i.C[r])/(i.C[r+1]-i.C[r]),o=Zh(i.G,i.I[r],e),l=Zh(i.G,i.I[r+1],e);return o+(l-o)*a}}function Af(i,t,e,n){let s=0;for(let r of n){let a=r.fator??1;if(!(a>0))continue;let o=r.z-e;if(!(o>0))continue;let l=i-r.x,c=t-r.y,h=l*l+c*c+o*o,p=Math.sqrt(h),u=Math.acos(o/p)/Sf,f=0;l*l+c*c>1e-12&&(f=Math.atan2(c,l)/Sf-(r.rot||0)),s+=a*r.I(f,u)*(o/p)/h}return s}function wf([i,t],e){let n=!1;for(let s=0,r=e.length-1;s<e.length;r=s++){let[a,o]=e[s],[l,c]=e[r];o>t!=c>t&&i<(l-a)*(t-o)/(c-o)+a&&(n=!n)}return n}function Tf(i,{nx:t,ny:e,passo:n,maxCelulas:s=4e3}={}){let r=i.map(_=>_[0]),a=i.map(_=>_[1]),o=Math.min(...r),l=Math.min(...a),c=Math.max(...r)-o,h=Math.max(...a)-l;if(!(t>0&&e>0)){let _=n>0?n:.5;c/_*(h/_)>s&&(_=Math.sqrt(c*h/s)),t=Math.max(1,Math.round(c/_)),e=Math.max(1,Math.round(h/_))}let p=c/t,u=h/e,f=[];for(let _=0;_<e;_++)for(let v=0;v<t;v++){let g=[o+p*(v+.5),l+u*(_+.5)];wf(g,i)&&f.push({x:g[0],y:g[1],i:v,j:_})}return{x0:o,y0:l,dx:p,dy:u,nx:t,ny:e,L:c,W:h,centros:f}}function Rv(i,t){let e=Math.max(i,t),n=Math.min(10,.2*5**Math.log10(Math.max(e,1))),s=Math.max(1,Math.ceil(i/n-1e-9)),r=Math.max(1,Math.ceil(t/n-1e-9));return{p:n,nx:s,ny:r,pontos:s*r}}function Cf(i){let t=i.filter(Number.isFinite);if(!t.length)return{em:0,emin:0,emax:0,u0:0,pontos:0};let e=t.reduce((s,r)=>s+r,0)/t.length,n=Math.min(...t);return{em:e,emin:n,emax:Math.max(...t),u0:e>0?n/e:0,pontos:t.length}}function Pv({poligono:i,plano:t=.75,luminarias:e=[],fm:n=1,nx:s,ny:r,passo:a,maxCelulas:o}={}){let l=Tf(i,{nx:s,ny:r,passo:a,maxCelulas:o}),c=new Map,h=e.map(u=>{let f=u.I;return f||(c.has(u.fotometria)||c.set(u.fotometria,Ef(u.fotometria)),f=c.get(u.fotometria)),{x:u.x,y:u.y,z:u.z,I:f,rot:u.rot||0,fator:n*(u.nivel??1)}}),p=l.centros.map(u=>Af(u.x,u.y,t,h));return{grade:l,valores:p,...Cf(p)}}var jl=[[0,[.12,.1,.45]],[.2,[.1,.35,.95]],[.4,[.05,.8,.9]],[.6,[.2,.85,.3]],[.8,[.98,.88,.15]],[1,[.9,.15,.1]]];function Iv(i){let t=Math.min(1,Math.max(0,Number(i)||0)),e=0;for(;e<jl.length-2&&t>jl[e+1][0];)e++;let[n,s]=jl[e],[r,a]=jl[e+1],o=(t-n)/(r-n);return[s[0]+(a[0]-s[0])*o,s[1]+(a[1]-s[1])*o,s[2]+(a[2]-s[2])*o]}function Lv(i){let t=Math.max(10,Number(i)||0),e=10**Math.floor(Math.log10(t)),n=[1,1.5,2,2.5,3,4,5,6,8,10].map(s=>s*e).find(s=>s>=t-1e-9);return{max:n,marcas:[0,.2,.4,.6,.8,1].map(s=>Math.round(n*s))}}Rf.exports={avaliador:Ef,iluminanciaNoPonto:Af,gradeNoPoligono:Tf,calcularAmbiente:Pv,estatisticas:Cf,malhaMedicao:Rv,dentro:wf,corFalsa:Iv,escala:Lv,arred:Cv}});var ns={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},is={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Yu=0,qc=1,Zu=2;var xa=1,Ju=2,yr=3,ss=0,Dn=1,on=2,yi=0,Mr=1,$c=2,Yc=3,Zc=4,ju=5;var ws=100,Ku=101,Qu=102,td=103,ed=104,nd=200,id=201,sd=202,rd=203,Jc=204,jc=205,ad=206,od=207,ld=208,cd=209,hd=210,ud=211,dd=212,fd=213,pd=214,co=0,ho=1,uo=2,or=3,fo=4,po=5,mo=6,go=7,Kc=0,md=1,gd=2,ui=0,Qc=1,th=2,eh=3,nh=4,ih=5,sh=6,rh=7;var ah=300,rs=301,Ts=302,Zo=303,Jo=304,va=306,_o=1e3,mi=1001,xo=1002,yn=1003,_d=1004;var ya=1005;var wn=1006,jo=1007;var as=1008;var zn=1009,oh=1010,lh=1011,br=1012,Ko=1013,di=1014,ti=1015,fi=1016,Qo=1017,tl=1018,Sr=1020,ch=35902,hh=35899,uh=1021,dh=1022,ei=1023,_i=1026,os=1027,el=1028,nl=1029,ls=1030,il=1031;var sl=1033,Ma=33776,ba=33777,Sa=33778,Ea=33779,rl=35840,al=35841,ol=35842,ll=35843,cl=36196,hl=37492,ul=37496,dl=37488,fl=37489,Aa=37490,pl=37491,ml=37808,gl=37809,_l=37810,xl=37811,vl=37812,yl=37813,Ml=37814,bl=37815,Sl=37816,El=37817,Al=37818,wl=37819,Tl=37820,Cl=37821,Rl=36492,Pl=36494,Il=36495,Ll=36283,Dl=36284,wa=36285,Nl=36286;var qr=2300,vo=2301,oo=2302,Dc=2303,Nc=2400,Uc=2401,Fc=2402;var xd=3200;var Ul=0,vd=1,Oi="",un="srgb",$r="srgb-linear",Yr="linear",Xe="srgb";var lo=7680;var yd=519,Md=512,bd=513,Sd=514,Fl=515,Ed=516,Ad=517,Ol=518,wd=519,Td=35044;var fh="300 es",oi=2e3,lr=2001;function $f(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Yf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Zr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Cd(){let i=Zr("canvas");return i.style.display="block",i}var du={},cr=null;function ph(...i){let t="THREE."+i.shift();cr?cr("log",t,...i):console.log(t,...i)}function Rd(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function le(...i){i=Rd(i);let t="THREE."+i.shift();if(cr)cr("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function de(...i){i=Rd(i);let t="THREE."+i.shift();if(cr)cr("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function xs(...i){let t=i.join(" ");t in du||(du[t]=!0,le(...i))}function Pd(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var Id={[co]:ho,[uo]:mo,[fo]:go,[or]:po,[ho]:co,[mo]:uo,[go]:fo,[po]:or},li=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},Cn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],fu=1234567,rr=Math.PI/180,hr=180/Math.PI;function Cs(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Cn[i&255]+Cn[i>>8&255]+Cn[i>>16&255]+Cn[i>>24&255]+"-"+Cn[t&255]+Cn[t>>8&255]+"-"+Cn[t>>16&15|64]+Cn[t>>24&255]+"-"+Cn[e&63|128]+Cn[e>>8&255]+"-"+Cn[e>>16&255]+Cn[e>>24&255]+Cn[n&255]+Cn[n>>8&255]+Cn[n>>16&255]+Cn[n>>24&255]).toLowerCase()}function Ee(i,t,e){return Math.max(t,Math.min(e,i))}function mh(i,t){return(i%t+t)%t}function Zf(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Jf(i,t,e){return i!==t?(e-i)/(t-i):0}function Hr(i,t,e){return(1-e)*i+e*t}function jf(i,t,e,n){return Hr(i,t,1-Math.exp(-e*n))}function Kf(i,t=1){return t-Math.abs(mh(i,t*2)-t)}function Qf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function tp(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function ep(i,t){return i+Math.floor(Math.random()*(t-i+1))}function np(i,t){return i+Math.random()*(t-i)}function ip(i){return i*(.5-Math.random())}function sp(i){i!==void 0&&(fu=i);let t=fu+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function rp(i){return i*rr}function ap(i){return i*hr}function op(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function lp(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function cp(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function hp(i,t,e,n,s){let r=Math.cos,a=Math.sin,o=r(e/2),l=a(e/2),c=r((t+n)/2),h=a((t+n)/2),p=r((t-n)/2),u=a((t-n)/2),f=r((n-t)/2),_=a((n-t)/2);switch(s){case"XYX":i.set(o*h,l*p,l*u,o*c);break;case"YZY":i.set(l*u,o*h,l*p,o*c);break;case"ZXZ":i.set(l*p,l*u,o*h,o*c);break;case"XZX":i.set(o*h,l*_,l*f,o*c);break;case"YXY":i.set(l*f,o*h,l*_,o*c);break;case"ZYZ":i.set(l*_,l*f,o*h,o*c);break;default:le("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function sr(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function In(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var ln={DEG2RAD:rr,RAD2DEG:hr,generateUUID:Cs,clamp:Ee,euclideanModulo:mh,mapLinear:Zf,inverseLerp:Jf,lerp:Hr,damp:jf,pingpong:Kf,smoothstep:Qf,smootherstep:tp,randInt:ep,randFloat:np,randFloatSpread:ip,seededRandom:sp,degToRad:rp,radToDeg:ap,isPowerOfTwo:op,ceilPowerOfTwo:lp,floorPowerOfTwo:cp,setQuaternionFromProperEuler:hp,normalize:In,denormalize:sr},Mh=class Mh{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ee(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ee(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Mh.prototype.isVector2=!0;var bt=Mh,Xn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],p=n[s+3],u=r[a+0],f=r[a+1],_=r[a+2],v=r[a+3];if(p!==v||l!==u||c!==f||h!==_){let g=l*u+c*f+h*_+p*v;g<0&&(u=-u,f=-f,_=-_,v=-v,g=-g);let m=1-o;if(g<.9995){let C=Math.acos(g),L=Math.sin(C);m=Math.sin(m*C)/L,o=Math.sin(o*C)/L,l=l*m+u*o,c=c*m+f*o,h=h*m+_*o,p=p*m+v*o}else{l=l*m+u*o,c=c*m+f*o,h=h*m+_*o,p=p*m+v*o;let C=1/Math.sqrt(l*l+c*c+h*h+p*p);l*=C,c*=C,h*=C,p*=C}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=p}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],p=r[a],u=r[a+1],f=r[a+2],_=r[a+3];return t[e]=o*_+h*p+l*f-c*u,t[e+1]=l*_+h*u+c*p-o*f,t[e+2]=c*_+h*f+o*u-l*p,t[e+3]=h*_-o*p-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),p=o(r/2),u=l(n/2),f=l(s/2),_=l(r/2);switch(a){case"XYZ":this._x=u*h*p+c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p-u*f*_;break;case"YXZ":this._x=u*h*p+c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p+u*f*_;break;case"ZXY":this._x=u*h*p-c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p-u*f*_;break;case"ZYX":this._x=u*h*p-c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p+u*f*_;break;case"YZX":this._x=u*h*p+c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p-u*f*_;break;case"XZY":this._x=u*h*p-c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p+u*f*_;break;default:le("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],p=e[10],u=n+o+p;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-s)*f}else if(n>o&&n>p){let f=2*Math.sqrt(1+n-o-p);this._w=(h-l)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+c)/f}else if(o>p){let f=2*Math.sqrt(1+o-n-p);this._w=(r-c)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+p-n-o);this._w=(a-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ee(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},bh=class bh{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(pu.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(pu.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),p=2*(r*n-a*e);return this.x=e+l*c+a*p-o*h,this.y=n+l*h+o*c-r*p,this.z=s+l*p+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this.z=Ee(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this.z=Ee(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ee(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return oc.copy(this).projectOnVector(t),this.sub(oc)}reflect(t){return this.sub(oc.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ee(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};bh.prototype.isVector3=!0;var z=bh,oc=new z,pu=new Xn,Sh=class Sh{constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],p=n[7],u=n[2],f=n[5],_=n[8],v=s[0],g=s[3],m=s[6],C=s[1],L=s[4],S=s[7],T=s[2],A=s[5],N=s[8];return r[0]=a*v+o*C+l*T,r[3]=a*g+o*L+l*A,r[6]=a*m+o*S+l*N,r[1]=c*v+h*C+p*T,r[4]=c*g+h*L+p*A,r[7]=c*m+h*S+p*N,r[2]=u*v+f*C+_*T,r[5]=u*g+f*L+_*A,r[8]=u*m+f*S+_*N,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=h*a-o*c,u=o*l-h*r,f=c*r-a*l,_=e*p+n*u+s*f;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);let v=1/_;return t[0]=p*v,t[1]=(s*c-h*n)*v,t[2]=(o*n-s*a)*v,t[3]=u*v,t[4]=(h*e-s*l)*v,t[5]=(s*r-o*e)*v,t[6]=f*v,t[7]=(n*l-c*e)*v,t[8]=(a*e-n*r)*v,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return xs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(lc.makeScale(t,e)),this}rotate(t){return xs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(lc.makeRotation(-t)),this}translate(t,e){return xs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(lc.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Sh.prototype.isMatrix3=!0;var xe=Sh,lc=new xe,mu=new xe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),gu=new xe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function up(){let i={enabled:!0,workingColorSpace:$r,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===Xe&&(s.r=Ii(s.r),s.g=Ii(s.g),s.b=Ii(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Xe&&(s.r=ar(s.r),s.g=ar(s.g),s.b=ar(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Oi?Yr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return xs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return xs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[$r]:{primaries:t,whitePoint:n,transfer:Yr,toXYZ:mu,fromXYZ:gu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:un},outputColorSpaceConfig:{drawingBufferColorSpace:un}},[un]:{primaries:t,whitePoint:n,transfer:Xe,toXYZ:mu,fromXYZ:gu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:un}}}),i}var De=up();function Ii(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ar(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Ws,yo=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Ws===void 0&&(Ws=Zr("canvas")),Ws.width=t.width,Ws.height=t.height;let s=Ws.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Ws}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Zr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Ii(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ii(e[n]/255)*255):e[n]=Ii(e[n]);return{data:e,width:t.width,height:t.height}}else return le("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},dp=0,ur=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:dp++}),this.uuid=Cs(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(cc(s[a].image)):r.push(cc(s[a]))}else r=cc(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function cc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?yo.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(le("Texture: Unable to serialize Texture."),{})}var fp=0,hc=new z,Fn=class i extends li{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=mi,s=mi,r=wn,a=as,o=ei,l=zn,c=i.DEFAULT_ANISOTROPY,h=Oi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fp++}),this.uuid=Cs(),this.name="",this.source=new ur(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new bt(0,0),this.repeat=new bt(1,1),this.center=new bt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new xe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(hc).x}get height(){return this.source.getSize(hc).y}get depth(){return this.source.getSize(hc).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){le(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){le(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==ah)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case _o:t.x=t.x-Math.floor(t.x);break;case mi:t.x=t.x<0?0:1;break;case xo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case _o:t.y=t.y-Math.floor(t.y);break;case mi:t.y=t.y<0?0:1;break;case xo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Fn.DEFAULT_IMAGE=null;Fn.DEFAULT_MAPPING=ah;Fn.DEFAULT_ANISOTROPY=1;var Eh=class Eh{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],p=l[8],u=l[1],f=l[5],_=l[9],v=l[2],g=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(p-v)<.01&&Math.abs(_-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(p+v)<.1&&Math.abs(_+g)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let L=(c+1)/2,S=(f+1)/2,T=(m+1)/2,A=(h+u)/4,N=(p+v)/4,y=(_+g)/4;return L>S&&L>T?L<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(L),s=A/n,r=N/n):S>T?S<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),n=A/s,r=y/s):T<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),n=N/r,s=y/r),this.set(n,s,r,e),this}let C=Math.sqrt((g-_)*(g-_)+(p-v)*(p-v)+(u-h)*(u-h));return Math.abs(C)<.001&&(C=1),this.x=(g-_)/C,this.y=(p-v)/C,this.z=(u-h)/C,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this.z=Ee(this.z,t.z,e.z),this.w=Ee(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this.z=Ee(this.z,t,e),this.w=Ee(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ee(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Eh.prototype.isVector4=!0;var tn=Eh,Mo=class extends li{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:wn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new tn(0,0,t,e),this.scissorTest=!1,this.viewport=new tn(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Fn(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:wn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new ur(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},On=class extends Mo{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Jr=class extends Fn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=yn,this.minFilter=yn,this.wrapR=mi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var bo=class extends Fn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=yn,this.minFilter=yn,this.wrapR=mi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Yo=class Yo{constructor(t,e,n,s,r,a,o,l,c,h,p,u,f,_,v,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,p,u,f,_,v,g)}set(t,e,n,s,r,a,o,l,c,h,p,u,f,_,v,g){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=a,m[9]=o,m[13]=l,m[2]=c,m[6]=h,m[10]=p,m[14]=u,m[3]=f,m[7]=_,m[11]=v,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Yo().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/Xs.setFromMatrixColumn(t,0).length(),r=1/Xs.setFromMatrixColumn(t,1).length(),a=1/Xs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),p=Math.sin(r);if(t.order==="XYZ"){let u=a*h,f=a*p,_=o*h,v=o*p;e[0]=l*h,e[4]=-l*p,e[8]=c,e[1]=f+_*c,e[5]=u-v*c,e[9]=-o*l,e[2]=v-u*c,e[6]=_+f*c,e[10]=a*l}else if(t.order==="YXZ"){let u=l*h,f=l*p,_=c*h,v=c*p;e[0]=u+v*o,e[4]=_*o-f,e[8]=a*c,e[1]=a*p,e[5]=a*h,e[9]=-o,e[2]=f*o-_,e[6]=v+u*o,e[10]=a*l}else if(t.order==="ZXY"){let u=l*h,f=l*p,_=c*h,v=c*p;e[0]=u-v*o,e[4]=-a*p,e[8]=_+f*o,e[1]=f+_*o,e[5]=a*h,e[9]=v-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let u=a*h,f=a*p,_=o*h,v=o*p;e[0]=l*h,e[4]=_*c-f,e[8]=u*c+v,e[1]=l*p,e[5]=v*c+u,e[9]=f*c-_,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let u=a*l,f=a*c,_=o*l,v=o*c;e[0]=l*h,e[4]=v-u*p,e[8]=_*p+f,e[1]=p,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*p+_,e[10]=u-v*p}else if(t.order==="XZY"){let u=a*l,f=a*c,_=o*l,v=o*c;e[0]=l*h,e[4]=-p,e[8]=c*h,e[1]=u*p+v,e[5]=a*h,e[9]=f*p-_,e[2]=_*p-f,e[6]=o*h,e[10]=v*p+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(pp,t,mp)}lookAt(t,e,n){let s=this.elements;return Gn.subVectors(t,e),Gn.lengthSq()===0&&(Gn.z=1),Gn.normalize(),Wi.crossVectors(n,Gn),Wi.lengthSq()===0&&(Math.abs(n.z)===1?Gn.x+=1e-4:Gn.z+=1e-4,Gn.normalize(),Wi.crossVectors(n,Gn)),Wi.normalize(),Na.crossVectors(Gn,Wi),s[0]=Wi.x,s[4]=Na.x,s[8]=Gn.x,s[1]=Wi.y,s[5]=Na.y,s[9]=Gn.y,s[2]=Wi.z,s[6]=Na.z,s[10]=Gn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],p=n[5],u=n[9],f=n[13],_=n[2],v=n[6],g=n[10],m=n[14],C=n[3],L=n[7],S=n[11],T=n[15],A=s[0],N=s[4],y=s[8],R=s[12],F=s[1],O=s[5],V=s[9],k=s[13],P=s[2],U=s[6],Y=s[10],J=s[14],ot=s[3],j=s[7],st=s[11],lt=s[15];return r[0]=a*A+o*F+l*P+c*ot,r[4]=a*N+o*O+l*U+c*j,r[8]=a*y+o*V+l*Y+c*st,r[12]=a*R+o*k+l*J+c*lt,r[1]=h*A+p*F+u*P+f*ot,r[5]=h*N+p*O+u*U+f*j,r[9]=h*y+p*V+u*Y+f*st,r[13]=h*R+p*k+u*J+f*lt,r[2]=_*A+v*F+g*P+m*ot,r[6]=_*N+v*O+g*U+m*j,r[10]=_*y+v*V+g*Y+m*st,r[14]=_*R+v*k+g*J+m*lt,r[3]=C*A+L*F+S*P+T*ot,r[7]=C*N+L*O+S*U+T*j,r[11]=C*y+L*V+S*Y+T*st,r[15]=C*R+L*k+S*J+T*lt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],p=t[6],u=t[10],f=t[14],_=t[3],v=t[7],g=t[11],m=t[15],C=l*f-c*u,L=o*f-c*p,S=o*u-l*p,T=a*f-c*h,A=a*u-l*h,N=a*p-o*h;return e*(v*C-g*L+m*S)-n*(_*C-g*T+m*A)+s*(_*L-v*T+m*N)-r*(_*S-v*A+g*N)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=t[9],u=t[10],f=t[11],_=t[12],v=t[13],g=t[14],m=t[15],C=e*o-n*a,L=e*l-s*a,S=e*c-r*a,T=n*l-s*o,A=n*c-r*o,N=s*c-r*l,y=h*v-p*_,R=h*g-u*_,F=h*m-f*_,O=p*g-u*v,V=p*m-f*v,k=u*m-f*g,P=C*k-L*V+S*O+T*F-A*R+N*y;if(P===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let U=1/P;return t[0]=(o*k-l*V+c*O)*U,t[1]=(s*V-n*k-r*O)*U,t[2]=(v*N-g*A+m*T)*U,t[3]=(u*A-p*N-f*T)*U,t[4]=(l*F-a*k-c*R)*U,t[5]=(e*k-s*F+r*R)*U,t[6]=(g*S-_*N-m*L)*U,t[7]=(h*N-u*S+f*L)*U,t[8]=(a*V-o*F+c*y)*U,t[9]=(n*F-e*V-r*y)*U,t[10]=(_*A-v*S+m*C)*U,t[11]=(p*S-h*A-f*C)*U,t[12]=(o*R-a*O-l*y)*U,t[13]=(e*O-n*R+s*y)*U,t[14]=(v*L-_*T-g*C)*U,t[15]=(h*T-p*L+u*C)*U,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,p=o+o,u=r*c,f=r*h,_=r*p,v=a*h,g=a*p,m=o*p,C=l*c,L=l*h,S=l*p,T=n.x,A=n.y,N=n.z;return s[0]=(1-(v+m))*T,s[1]=(f+S)*T,s[2]=(_-L)*T,s[3]=0,s[4]=(f-S)*A,s[5]=(1-(u+m))*A,s[6]=(g+C)*A,s[7]=0,s[8]=(_+L)*N,s[9]=(g-C)*N,s[10]=(1-(u+v))*N,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=Xs.set(s[0],s[1],s[2]).length(),o=Xs.set(s[4],s[5],s[6]).length(),l=Xs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),si.copy(this);let c=1/a,h=1/o,p=1/l;return si.elements[0]*=c,si.elements[1]*=c,si.elements[2]*=c,si.elements[4]*=h,si.elements[5]*=h,si.elements[6]*=h,si.elements[8]*=p,si.elements[9]*=p,si.elements[10]*=p,e.setFromRotationMatrix(si),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=oi,l=!1){let c=this.elements,h=2*r/(e-t),p=2*r/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s),_,v;if(l)_=r/(a-r),v=a*r/(a-r);else if(o===oi)_=-(a+r)/(a-r),v=-2*a*r/(a-r);else if(o===lr)_=-a/(a-r),v=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=p,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=_,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=oi,l=!1){let c=this.elements,h=2/(e-t),p=2/(n-s),u=-(e+t)/(e-t),f=-(n+s)/(n-s),_,v;if(l)_=1/(a-r),v=a/(a-r);else if(o===oi)_=-2/(a-r),v=-(a+r)/(a-r);else if(o===lr)_=-1/(a-r),v=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=p,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=_,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Yo.prototype.isMatrix4=!0;var Ge=Yo,Xs=new z,si=new Ge,pp=new z(0,0,0),mp=new z(1,1,1),Wi=new z,Na=new z,Gn=new z,_u=new Ge,xu=new Xn,Li=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],p=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(Ee(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ee(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-p,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ee(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-p,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ee(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ee(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-p,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ee(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:le("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return _u.makeRotationFromQuaternion(t),this.setFromRotationMatrix(_u,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return xu.setFromEuler(this),this.setFromQuaternion(xu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Li.DEFAULT_ORDER="XYZ";var dr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},gp=0,vu=new z,qs=new Xn,Ai=new Ge,Ua=new z,Ur=new z,_p=new z,xp=new Xn,yu=new z(1,0,0),Mu=new z(0,1,0),bu=new z(0,0,1),Su={type:"added"},vp={type:"removed"},$s={type:"childadded",child:null},uc={type:"childremoved",child:null},fn=class i extends li{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gp++}),this.uuid=Cs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new z,e=new Li,n=new Xn,s=new z(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ge},normalMatrix:{value:new xe}}),this.matrix=new Ge,this.matrixWorld=new Ge,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new dr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return qs.setFromAxisAngle(t,e),this.quaternion.multiply(qs),this}rotateOnWorldAxis(t,e){return qs.setFromAxisAngle(t,e),this.quaternion.premultiply(qs),this}rotateX(t){return this.rotateOnAxis(yu,t)}rotateY(t){return this.rotateOnAxis(Mu,t)}rotateZ(t){return this.rotateOnAxis(bu,t)}translateOnAxis(t,e){return vu.copy(t).applyQuaternion(this.quaternion),this.position.add(vu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(yu,t)}translateY(t){return this.translateOnAxis(Mu,t)}translateZ(t){return this.translateOnAxis(bu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Ai.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Ua.copy(t):Ua.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Ur.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ai.lookAt(Ur,Ua,this.up):Ai.lookAt(Ua,Ur,this.up),this.quaternion.setFromRotationMatrix(Ai),s&&(Ai.extractRotation(s.matrixWorld),qs.setFromRotationMatrix(Ai),this.quaternion.premultiply(qs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(de("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Su),$s.child=t,this.dispatchEvent($s),$s.child=null):de("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(vp),uc.child=t,this.dispatchEvent(uc),uc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Ai.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Ai.multiply(t.parent.matrixWorld)),t.applyMatrix4(Ai),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Su),$s.child=t,this.dispatchEvent($s),$s.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ur,t,_p),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ur,xp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let p=l[c];r(t.shapes,p)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),p=a(t.shapes),u=a(t.skeletons),f=a(t.animations),_=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),p.length>0&&(n.shapes=p),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),_.length>0&&(n.nodes=_)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};fn.DEFAULT_UP=new z(0,1,0);fn.DEFAULT_MATRIX_AUTO_UPDATE=!0;fn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var An=class extends fn{constructor(){super(),this.isGroup=!0,this.type="Group"}},yp={type:"move"},fr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new An,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new An,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new z,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new z),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new An,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new z,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new z,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let v of t.hand.values()){let g=e.getJointPose(v,n),m=this._getHandJoint(c,v);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}let h=c.joints["index-finger-tip"],p=c.joints["thumb-tip"],u=h.position.distanceTo(p.position),f=.02,_=.005;c.inputState.pinching&&u>f+_?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-_&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(yp)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new An;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Ld={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Xi={h:0,s:0,l:0},Fa={h:0,s:0,l:0};function dc(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var fe=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=un){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,De.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=De.workingColorSpace){return this.r=t,this.g=e,this.b=n,De.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=De.workingColorSpace){if(t=mh(t,1),e=Ee(e,0,1),n=Ee(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=dc(a,r,t+1/3),this.g=dc(a,r,t),this.b=dc(a,r,t-1/3)}return De.colorSpaceToWorking(this,s),this}setStyle(t,e=un){function n(r){r!==void 0&&parseFloat(r)<1&&le("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:le("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);le("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=un){let n=Ld[t.toLowerCase()];return n!==void 0?this.setHex(n,e):le("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ii(t.r),this.g=Ii(t.g),this.b=Ii(t.b),this}copyLinearToSRGB(t){return this.r=ar(t.r),this.g=ar(t.g),this.b=ar(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=un){return De.workingToColorSpace(Rn.copy(this),t),Math.round(Ee(Rn.r*255,0,255))*65536+Math.round(Ee(Rn.g*255,0,255))*256+Math.round(Ee(Rn.b*255,0,255))}getHexString(t=un){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=De.workingColorSpace){De.workingToColorSpace(Rn.copy(this),e);let n=Rn.r,s=Rn.g,r=Rn.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let p=a-o;switch(c=h<=.5?p/(a+o):p/(2-a-o),a){case n:l=(s-r)/p+(s<r?6:0);break;case s:l=(r-n)/p+2;break;case r:l=(n-s)/p+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=De.workingColorSpace){return De.workingToColorSpace(Rn.copy(this),e),t.r=Rn.r,t.g=Rn.g,t.b=Rn.b,t}getStyle(t=un){De.workingToColorSpace(Rn.copy(this),t);let e=Rn.r,n=Rn.g,s=Rn.b;return t!==un?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Xi),this.setHSL(Xi.h+t,Xi.s+e,Xi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Xi),t.getHSL(Fa);let n=Hr(Xi.h,Fa.h,e),s=Hr(Xi.s,Fa.s,e),r=Hr(Xi.l,Fa.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Rn=new fe;fe.NAMES=Ld;var vs=class extends fn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Li,this.environmentIntensity=1,this.environmentRotation=new Li,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},ri=new z,wi=new z,fc=new z,Ti=new z,Ys=new z,Zs=new z,Eu=new z,pc=new z,mc=new z,gc=new z,_c=new tn,xc=new tn,vc=new tn,Pi=class i{constructor(t=new z,e=new z,n=new z){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),ri.subVectors(t,e),s.cross(ri);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){ri.subVectors(s,e),wi.subVectors(n,e),fc.subVectors(t,e);let a=ri.dot(ri),o=ri.dot(wi),l=ri.dot(fc),c=wi.dot(wi),h=wi.dot(fc),p=a*c-o*o;if(p===0)return r.set(0,0,0),null;let u=1/p,f=(c*l-o*h)*u,_=(a*h-o*l)*u;return r.set(1-f-_,_,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Ti)===null?!1:Ti.x>=0&&Ti.y>=0&&Ti.x+Ti.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,Ti)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ti.x),l.addScaledVector(a,Ti.y),l.addScaledVector(o,Ti.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return _c.setScalar(0),xc.setScalar(0),vc.setScalar(0),_c.fromBufferAttribute(t,e),xc.fromBufferAttribute(t,n),vc.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(_c,r.x),a.addScaledVector(xc,r.y),a.addScaledVector(vc,r.z),a}static isFrontFacing(t,e,n,s){return ri.subVectors(n,e),wi.subVectors(t,e),ri.cross(wi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ri.subVectors(this.c,this.b),wi.subVectors(this.a,this.b),ri.cross(wi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;Ys.subVectors(s,n),Zs.subVectors(r,n),pc.subVectors(t,n);let l=Ys.dot(pc),c=Zs.dot(pc);if(l<=0&&c<=0)return e.copy(n);mc.subVectors(t,s);let h=Ys.dot(mc),p=Zs.dot(mc);if(h>=0&&p<=h)return e.copy(s);let u=l*p-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(Ys,a);gc.subVectors(t,r);let f=Ys.dot(gc),_=Zs.dot(gc);if(_>=0&&f<=_)return e.copy(r);let v=f*c-l*_;if(v<=0&&c>=0&&_<=0)return o=c/(c-_),e.copy(n).addScaledVector(Zs,o);let g=h*_-f*p;if(g<=0&&p-h>=0&&f-_>=0)return Eu.subVectors(r,s),o=(p-h)/(p-h+(f-_)),e.copy(s).addScaledVector(Eu,o);let m=1/(g+v+u);return a=v*m,o=u*m,e.copy(n).addScaledVector(Ys,a).addScaledVector(Zs,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},xi=class{constructor(t=new z(1/0,1/0,1/0),e=new z(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(ai.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(ai.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=ai.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,ai):ai.fromBufferAttribute(r,a),ai.applyMatrix4(t.matrixWorld),this.expandByPoint(ai);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Oa.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Oa.copy(n.boundingBox)),Oa.applyMatrix4(t.matrixWorld),this.union(Oa)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,ai),ai.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Fr),Ba.subVectors(this.max,Fr),Js.subVectors(t.a,Fr),js.subVectors(t.b,Fr),Ks.subVectors(t.c,Fr),qi.subVectors(js,Js),$i.subVectors(Ks,js),ps.subVectors(Js,Ks);let e=[0,-qi.z,qi.y,0,-$i.z,$i.y,0,-ps.z,ps.y,qi.z,0,-qi.x,$i.z,0,-$i.x,ps.z,0,-ps.x,-qi.y,qi.x,0,-$i.y,$i.x,0,-ps.y,ps.x,0];return!yc(e,Js,js,Ks,Ba)||(e=[1,0,0,0,1,0,0,0,1],!yc(e,Js,js,Ks,Ba))?!1:(za.crossVectors(qi,$i),e=[za.x,za.y,za.z],yc(e,Js,js,Ks,Ba))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ai).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ai).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ci[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ci[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ci[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ci[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ci[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ci[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ci[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ci[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ci),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ci=[new z,new z,new z,new z,new z,new z,new z,new z],ai=new z,Oa=new xi,Js=new z,js=new z,Ks=new z,qi=new z,$i=new z,ps=new z,Fr=new z,Ba=new z,za=new z,ms=new z;function yc(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){ms.fromArray(i,r);let o=s.x*Math.abs(ms.x)+s.y*Math.abs(ms.y)+s.z*Math.abs(ms.z),l=t.dot(ms),c=e.dot(ms),h=n.dot(ms);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var an=new z,ka=new bt,Mp=0,Wn=class extends li{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Mp++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Td,this.updateRanges=[],this.gpuType=ti,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)ka.fromBufferAttribute(this,e),ka.applyMatrix3(t),this.setXY(e,ka.x,ka.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)an.fromBufferAttribute(this,e),an.applyMatrix3(t),this.setXYZ(e,an.x,an.y,an.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)an.fromBufferAttribute(this,e),an.applyMatrix4(t),this.setXYZ(e,an.x,an.y,an.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)an.fromBufferAttribute(this,e),an.applyNormalMatrix(t),this.setXYZ(e,an.x,an.y,an.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)an.fromBufferAttribute(this,e),an.transformDirection(t),this.setXYZ(e,an.x,an.y,an.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=sr(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=In(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=sr(e,this.array)),e}setX(t,e){return this.normalized&&(e=In(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=sr(e,this.array)),e}setY(t,e){return this.normalized&&(e=In(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=sr(e,this.array)),e}setZ(t,e){return this.normalized&&(e=In(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=sr(e,this.array)),e}setW(t,e){return this.normalized&&(e=In(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=In(e,this.array),n=In(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=In(e,this.array),n=In(n,this.array),s=In(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=In(e,this.array),n=In(n,this.array),s=In(s,this.array),r=In(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var jr=class extends Wn{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Kr=class extends Wn{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var _e=class extends Wn{constructor(t,e,n){super(new Float32Array(t),e,n)}},bp=new xi,Or=new z,Mc=new z,Di=class{constructor(t=new z,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):bp.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Or.subVectors(t,this.center);let e=Or.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Or,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Mc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Or.copy(t.center).add(Mc)),this.expandByPoint(Or.copy(t.center).sub(Mc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Sp=0,Qn=new Ge,bc=new fn,Qs=new z,Hn=new xi,Br=new xi,vn=new z,Ze=class i extends li{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Sp++}),this.uuid=Cs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new($f(t)?Kr:jr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new xe().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Qn.makeRotationFromQuaternion(t),this.applyMatrix4(Qn),this}rotateX(t){return Qn.makeRotationX(t),this.applyMatrix4(Qn),this}rotateY(t){return Qn.makeRotationY(t),this.applyMatrix4(Qn),this}rotateZ(t){return Qn.makeRotationZ(t),this.applyMatrix4(Qn),this}translate(t,e,n){return Qn.makeTranslation(t,e,n),this.applyMatrix4(Qn),this}scale(t,e,n){return Qn.makeScale(t,e,n),this.applyMatrix4(Qn),this}lookAt(t){return bc.lookAt(t),bc.updateMatrix(),this.applyMatrix4(bc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Qs).negate(),this.translate(Qs.x,Qs.y,Qs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new _e(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&le("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new xi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){de("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new z(-1/0,-1/0,-1/0),new z(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Hn.setFromBufferAttribute(r),this.morphTargetsRelative?(vn.addVectors(this.boundingBox.min,Hn.min),this.boundingBox.expandByPoint(vn),vn.addVectors(this.boundingBox.max,Hn.max),this.boundingBox.expandByPoint(vn)):(this.boundingBox.expandByPoint(Hn.min),this.boundingBox.expandByPoint(Hn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&de('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Di);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){de("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new z,1/0);return}if(t){let n=this.boundingSphere.center;if(Hn.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];Br.setFromBufferAttribute(o),this.morphTargetsRelative?(vn.addVectors(Hn.min,Br.min),Hn.expandByPoint(vn),vn.addVectors(Hn.max,Br.max),Hn.expandByPoint(vn)):(Hn.expandByPoint(Br.min),Hn.expandByPoint(Br.max))}Hn.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)vn.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(vn));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)vn.fromBufferAttribute(o,c),l&&(Qs.fromBufferAttribute(t,c),vn.add(Qs)),s=Math.max(s,n.distanceToSquared(vn))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&de('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){de("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new Wn(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let y=0;y<n.count;y++)o[y]=new z,l[y]=new z;let c=new z,h=new z,p=new z,u=new bt,f=new bt,_=new bt,v=new z,g=new z;function m(y,R,F){c.fromBufferAttribute(n,y),h.fromBufferAttribute(n,R),p.fromBufferAttribute(n,F),u.fromBufferAttribute(r,y),f.fromBufferAttribute(r,R),_.fromBufferAttribute(r,F),h.sub(c),p.sub(c),f.sub(u),_.sub(u);let O=1/(f.x*_.y-_.x*f.y);isFinite(O)&&(v.copy(h).multiplyScalar(_.y).addScaledVector(p,-f.y).multiplyScalar(O),g.copy(p).multiplyScalar(f.x).addScaledVector(h,-_.x).multiplyScalar(O),o[y].add(v),o[R].add(v),o[F].add(v),l[y].add(g),l[R].add(g),l[F].add(g))}let C=this.groups;C.length===0&&(C=[{start:0,count:t.count}]);for(let y=0,R=C.length;y<R;++y){let F=C[y],O=F.start,V=F.count;for(let k=O,P=O+V;k<P;k+=3)m(t.getX(k+0),t.getX(k+1),t.getX(k+2))}let L=new z,S=new z,T=new z,A=new z;function N(y){T.fromBufferAttribute(s,y),A.copy(T);let R=o[y];L.copy(R),L.sub(T.multiplyScalar(T.dot(R))).normalize(),S.crossVectors(A,R);let O=S.dot(l[y])<0?-1:1;a.setXYZW(y,L.x,L.y,L.z,O)}for(let y=0,R=C.length;y<R;++y){let F=C[y],O=F.start,V=F.count;for(let k=O,P=O+V;k<P;k+=3)N(t.getX(k+0)),N(t.getX(k+1)),N(t.getX(k+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Wn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new z,r=new z,a=new z,o=new z,l=new z,c=new z,h=new z,p=new z;if(t)for(let u=0,f=t.count;u<f;u+=3){let _=t.getX(u+0),v=t.getX(u+1),g=t.getX(u+2);s.fromBufferAttribute(e,_),r.fromBufferAttribute(e,v),a.fromBufferAttribute(e,g),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),o.fromBufferAttribute(n,_),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,g),o.add(h),l.add(h),c.add(h),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)vn.fromBufferAttribute(t,e),vn.normalize(),t.setXYZ(e,vn.x,vn.y,vn.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,p=o.normalized,u=new c.constructor(l.length*h),f=0,_=0;for(let v=0,g=l.length;v<g;v++){o.isInterleavedBufferAttribute?f=l[v]*o.data.stride+o.offset:f=l[v]*h;for(let m=0;m<h;m++)u[_++]=c[f++]}return new Wn(u,h,p)}if(this.index===null)return le("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,n);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,p=c.length;h<p;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let p=0,u=c.length;p<u;p++){let f=c[p];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],p=r[c];for(let u=0,f=p.length;u<f;u++)h.push(p[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,h=a.length;c<h;c++){let p=a[c];this.addGroup(p.start,p.count,p.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Sc=new z,Ep=new z,Ap=new xe,Ln=class{constructor(t=new z(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=Sc.subVectors(n,e).cross(Ep.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(Sc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Ap.getNormalMatrix(t),s=this.coplanarPoint(Sc).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},wp=0,Ni=class extends li{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:wp++}),this.uuid=Cs(),this.name="",this.type="Material",this.blending=Mr,this.side=ss,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Jc,this.blendDst=jc,this.blendEquation=ws,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new fe(0,0,0),this.blendAlpha=0,this.depthFunc=or,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=yd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=lo,this.stencilZFail=lo,this.stencilZPass=lo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){le(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){le(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new fe().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Ln().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new bt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new bt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var Ri=new z,Ec=new z,Va=new z,Ga=new z,Zi=class{constructor(t=new z,e=new z(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Ri)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Ri.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Ri.copy(this.origin).addScaledVector(this.direction,e),Ri.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Ec.copy(t).add(e).multiplyScalar(.5),Va.copy(e).sub(t).normalize(),Ga.copy(this.origin).sub(Ec);let r=t.distanceTo(e)*.5,a=-this.direction.dot(Va),o=Ga.dot(this.direction),l=-Ga.dot(Va),c=Ga.lengthSq(),h=Math.abs(1-a*a),p,u,f,_;if(h>0)if(p=a*l-o,u=a*o-l,_=r*h,p>=0)if(u>=-_)if(u<=_){let v=1/h;p*=v,u*=v,f=p*(p+a*u+2*o)+u*(a*p+u+2*l)+c}else u=r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;else u=-r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;else u<=-_?(p=Math.max(0,-(-a*r+o)),u=p>0?-r:Math.min(Math.max(-r,-l),r),f=-p*p+u*(u+2*l)+c):u<=_?(p=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(p=Math.max(0,-(a*r+o)),u=p>0?r:Math.min(Math.max(-r,-l),r),f=-p*p+u*(u+2*l)+c);else u=a>0?-r:r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,p),s&&s.copy(Ec).addScaledVector(Va,u),f}intersectSphere(t,e){if(t.radius<0)return null;Ri.subVectors(t.center,this.origin);let n=Ri.dot(this.direction),s=Ri.dot(Ri)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,p=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),p>=0?(o=(t.min.z-u.z)*p,l=(t.max.z-u.z)*p):(o=(t.max.z-u.z)*p,l=(t.min.z-u.z)*p),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Ri)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,p=t.x-a.x,u=t.y-a.y,f=t.z-a.z,_=e.x-a.x,v=e.y-a.y,g=e.z-a.z,m=n.x-a.x,C=n.y-a.y,L=n.z-a.z,S=Math.abs(l),T=Math.abs(c),A=Math.abs(h),N,y,R,F,O,V,k,P,U,Y,J,ot;if(S>=T&&S>=A?(R=l,V=p,U=_,ot=m,l>=0?(N=c,y=h,F=u,O=f,k=v,P=g,Y=C,J=L):(N=h,y=c,F=f,O=u,k=g,P=v,Y=L,J=C)):T>=A?(R=c,V=u,U=v,ot=C,c>=0?(N=h,y=l,F=f,O=p,k=g,P=_,Y=L,J=m):(N=l,y=h,F=p,O=f,k=_,P=g,Y=m,J=L)):(R=h,V=f,U=g,ot=L,h>=0?(N=l,y=c,F=p,O=u,k=_,P=v,Y=m,J=C):(N=c,y=l,F=u,O=p,k=v,P=_,Y=C,J=m)),R===0)return null;let j=N/R,st=y/R,lt=1/R,Dt=F-j*V,At=O-st*V,ae=k-j*U,ne=P-st*U,wt=Y-j*ot,w=J-st*ot,I=wt*ne-w*ae,X=Dt*w-At*wt,K=ae*At-ne*Dt;if(s){if(I<0||X<0||K<0)return null}else if((I<0||X<0||K<0)&&(I>0||X>0||K>0))return null;let rt=I+X+K;if(rt===0)return null;let yt=lt*(I*V+X*U+K*ot);return(rt>0?yt<0:yt>0)?null:this.at(yt/rt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Bn=class extends Ni{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new fe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.combine=Kc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Au=new Ge,gs=new Zi,Ha=new Di,wu=new z,Wa=new z,Xa=new z,qa=new z,Ac=new z,$a=new z,Tu=new z,Ya=new z,ze=class extends fn{constructor(t=new Ze,e=new Bn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){$a.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],p=r[l];h!==0&&(Ac.fromBufferAttribute(p,t),a?$a.addScaledVector(Ac,h):$a.addScaledVector(Ac.sub(e),h))}e.add($a)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ha.copy(n.boundingSphere),Ha.applyMatrix4(r),gs.copy(t.ray).recast(t.near),!(Ha.containsPoint(gs.origin)===!1&&(gs.intersectSphere(Ha,wu)===null||gs.origin.distanceToSquared(wu)>(t.far-t.near)**2))&&(Au.copy(r).invert(),gs.copy(t.ray).applyMatrix4(Au),!(n.boundingBox!==null&&gs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,gs)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,p=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,v=u.length;_<v;_++){let g=u[_],m=a[g.materialIndex],C=Math.max(g.start,f.start),L=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let S=C,T=L;S<T;S+=3){let A=o.getX(S),N=o.getX(S+1),y=o.getX(S+2);s=Za(this,m,t,n,c,h,p,A,N,y),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let _=Math.max(0,f.start),v=Math.min(o.count,f.start+f.count);for(let g=_,m=v;g<m;g+=3){let C=o.getX(g),L=o.getX(g+1),S=o.getX(g+2);s=Za(this,a,t,n,c,h,p,C,L,S),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let _=0,v=u.length;_<v;_++){let g=u[_],m=a[g.materialIndex],C=Math.max(g.start,f.start),L=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let S=C,T=L;S<T;S+=3){let A=S,N=S+1,y=S+2;s=Za(this,m,t,n,c,h,p,A,N,y),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let _=Math.max(0,f.start),v=Math.min(l.count,f.start+f.count);for(let g=_,m=v;g<m;g+=3){let C=g,L=g+1,S=g+2;s=Za(this,a,t,n,c,h,p,C,L,S),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}};function Tp(i,t,e,n,s,r,a,o){let l;if(t.side===Dn?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===ss,o),l===null)return null;Ya.copy(o),Ya.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Ya);return c<e.near||c>e.far?null:{distance:c,point:Ya.clone(),object:i}}function Za(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,Wa),i.getVertexPosition(l,Xa),i.getVertexPosition(c,qa);let h=Tp(i,t,e,n,Wa,Xa,qa,Tu);if(h){let p=new z;Pi.getBarycoord(Tu,Wa,Xa,qa,p),s&&(h.uv=Pi.getInterpolatedAttribute(s,o,l,c,p,new bt)),r&&(h.uv1=Pi.getInterpolatedAttribute(r,o,l,c,p,new bt)),a&&(h.normal=Pi.getInterpolatedAttribute(a,o,l,c,p,new z),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new z,materialIndex:0};Pi.getNormal(Wa,Xa,qa,u.normal),h.face=u,h.barycoord=p}return h}var Qr=class extends Fn{constructor(t=null,e=1,n=1,s,r,a,o,l,c=yn,h=yn,p,u){super(null,a,o,l,c,h,s,r,p,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var ta=class extends Wn{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},tr=new Ge,Cu=new Ge,Ja=[],Ru=new xi,Cp=new Ge,zr=new ze,kr=new Di,ys=class extends ze{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new ta(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Cp)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new xi),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,tr),Ru.copy(t.boundingBox).applyMatrix4(tr),this.boundingBox.union(Ru)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Di),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,tr),kr.copy(t.boundingSphere).applyMatrix4(tr),this.boundingSphere.union(kr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(zr.geometry=this.geometry,zr.material=this.material,zr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),kr.copy(this.boundingSphere),kr.applyMatrix4(n),t.ray.intersectsSphere(kr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,tr),Cu.multiplyMatrices(n,tr),zr.matrixWorld=Cu,zr.raycast(t,Ja);for(let a=0,o=Ja.length;a<o;a++){let l=Ja[a];l.instanceId=r,l.object=this,e.push(l)}Ja.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new ta(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Qr(new Float32Array(s*this.count),s,this.count,el,ti));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},_s=new Di,Rp=new bt(.5,.5),ja=new z,pr=class{constructor(t=new Ln,e=new Ln,n=new Ln,s=new Ln,r=new Ln,a=new Ln){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=oi,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],p=r[5],u=r[6],f=r[7],_=r[8],v=r[9],g=r[10],m=r[11],C=r[12],L=r[13],S=r[14],T=r[15];if(s[0].setComponents(c-a,f-h,m-_,T-C).normalize(),s[1].setComponents(c+a,f+h,m+_,T+C).normalize(),s[2].setComponents(c+o,f+p,m+v,T+L).normalize(),s[3].setComponents(c-o,f-p,m-v,T-L).normalize(),n)s[4].setComponents(l,u,g,S).normalize(),s[5].setComponents(c-l,f-u,m-g,T-S).normalize();else if(s[4].setComponents(c-l,f-u,m-g,T-S).normalize(),e===oi)s[5].setComponents(c+l,f+u,m+g,T+S).normalize();else if(e===lr)s[5].setComponents(l,u,g,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),_s.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),_s.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(_s)}intersectsSprite(t){_s.center.set(0,0,0);let e=Rp.distanceTo(t.center);return _s.radius=.7071067811865476+e,_s.applyMatrix4(t.matrixWorld),this.intersectsSphere(_s)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(ja.x=s.normal.x>0?t.max.x:t.min.x,ja.y=s.normal.y>0?t.max.y:t.min.y,ja.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(ja)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ci=class extends Ni{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new fe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},So=new z,Eo=new z,Pu=new Ge,Vr=new Zi,Ka=new Di,wc=new z,Iu=new z,Ao=class extends fn{constructor(t=new Ze,e=new ci){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)So.fromBufferAttribute(e,s-1),Eo.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=So.distanceTo(Eo);t.setAttribute("lineDistance",new _e(n,1))}else le("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ka.copy(n.boundingSphere),Ka.applyMatrix4(s),Ka.radius+=r,t.ray.intersectsSphere(Ka)===!1)return;Pu.copy(s).invert(),Vr.copy(t.ray).applyMatrix4(Pu);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),_=Math.min(h.count,a.start+a.count);for(let v=f,g=_-1;v<g;v+=c){let m=h.getX(v),C=h.getX(v+1),L=Qa(this,t,Vr,l,m,C,v);L&&e.push(L)}if(this.isLineLoop){let v=h.getX(_-1),g=h.getX(f),m=Qa(this,t,Vr,l,v,g,_-1);m&&e.push(m)}}else{let f=Math.max(0,a.start),_=Math.min(u.count,a.start+a.count);for(let v=f,g=_-1;v<g;v+=c){let m=Qa(this,t,Vr,l,v,v+1,v);m&&e.push(m)}if(this.isLineLoop){let v=Qa(this,t,Vr,l,_-1,f,_-1);v&&e.push(v)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Qa(i,t,e,n,s,r,a){let o=i.geometry.attributes.position;if(So.fromBufferAttribute(o,s),Eo.fromBufferAttribute(o,r),e.distanceSqToSegment(So,Eo,wc,Iu)>n)return;wc.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(wc);if(!(c<t.near||c>t.far))return{distance:c,point:Iu.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var Lu=new z,Du=new z,vi=class extends Ao{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)Lu.fromBufferAttribute(e,s),Du.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Lu.distanceTo(Du);t.setAttribute("lineDistance",new _e(n,1))}else le("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var ea=class extends Fn{constructor(t=[],e=rs,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var Ji=class extends Fn{constructor(t,e,n=di,s,r,a,o=yn,l=yn,c,h=_i,p=1){if(h!==_i&&h!==os)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:p};super(u,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new ur(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},wo=class extends Ji{constructor(t,e=di,n=rs,s,r,a=yn,o=yn,l,c=_i){let h={width:t,height:t,depth:1},p=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},na=class extends Fn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},qn=class i extends Ze{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],p=[],u=0,f=0;_("z","y","x",-1,-1,n,e,t,a,r,0),_("z","y","x",1,-1,n,e,-t,a,r,1),_("x","z","y",1,1,t,n,e,s,a,2),_("x","z","y",1,-1,t,n,-e,s,a,3),_("x","y","z",1,-1,t,e,n,s,r,4),_("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new _e(c,3)),this.setAttribute("normal",new _e(h,3)),this.setAttribute("uv",new _e(p,2));function _(v,g,m,C,L,S,T,A,N,y,R){let F=S/N,O=T/y,V=S/2,k=T/2,P=A/2,U=N+1,Y=y+1,J=0,ot=0,j=new z;for(let st=0;st<Y;st++){let lt=st*O-k;for(let Dt=0;Dt<U;Dt++){let At=Dt*F-V;j[v]=At*C,j[g]=lt*L,j[m]=P,c.push(j.x,j.y,j.z),j[v]=0,j[g]=0,j[m]=A>0?1:-1,h.push(j.x,j.y,j.z),p.push(Dt/N),p.push(1-st/y),J+=1}}for(let st=0;st<y;st++)for(let lt=0;lt<N;lt++){let Dt=u+lt+U*st,At=u+lt+U*(st+1),ae=u+(lt+1)+U*(st+1),ne=u+(lt+1)+U*st;l.push(Dt,At,ne),l.push(At,ae,ne),ot+=6}o.addGroup(f,ot,R),f+=ot,u+=J}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var hi=class i extends Ze{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],p=[],u=[],f=[],_=0,v=[],g=n/2,m=0;C(),a===!1&&(t>0&&L(!0),e>0&&L(!1)),this.setIndex(h),this.setAttribute("position",new _e(p,3)),this.setAttribute("normal",new _e(u,3)),this.setAttribute("uv",new _e(f,2));function C(){let S=new z,T=new z,A=0,N=(e-t)/n;for(let y=0;y<=r;y++){let R=[],F=y/r,O=F*(e-t)+t;for(let V=0;V<=s;V++){let k=V/s,P=k*l+o,U=Math.sin(P),Y=Math.cos(P);T.x=O*U,T.y=-F*n+g,T.z=O*Y,p.push(T.x,T.y,T.z),S.set(U,N,Y).normalize(),u.push(S.x,S.y,S.z),f.push(k,1-F),R.push(_++)}v.push(R)}for(let y=0;y<s;y++)for(let R=0;R<r;R++){let F=v[R][y],O=v[R+1][y],V=v[R+1][y+1],k=v[R][y+1];(t>0||R!==0)&&(h.push(F,O,k),A+=3),(e>0||R!==r-1)&&(h.push(O,V,k),A+=3)}c.addGroup(m,A,0),m+=A}function L(S){let T=_,A=new bt,N=new z,y=0,R=S===!0?t:e,F=S===!0?1:-1;for(let V=1;V<=s;V++)p.push(0,g*F,0),u.push(0,F,0),f.push(.5,.5),_++;let O=_;for(let V=0;V<=s;V++){let P=V/s*l+o,U=Math.cos(P),Y=Math.sin(P);N.x=R*Y,N.y=g*F,N.z=R*U,p.push(N.x,N.y,N.z),u.push(0,F,0),A.x=U*.5+.5,A.y=Y*.5*F+.5,f.push(A.x,A.y),_++}for(let V=0;V<s;V++){let k=T+V,P=O+V;S===!0?h.push(P,P+1,k):h.push(P+1,P,k),y+=3}c.addGroup(m,y,S===!0?1:2),m+=y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var to=new z,eo=new z,Tc=new z,no=new Pi,ia=class extends Ze{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(rr*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],p=new Array(3),u={},f=[];for(let _=0;_<l;_+=3){a?(c[0]=a.getX(_),c[1]=a.getX(_+1),c[2]=a.getX(_+2)):(c[0]=_,c[1]=_+1,c[2]=_+2);let{a:v,b:g,c:m}=no;if(v.fromBufferAttribute(o,c[0]),g.fromBufferAttribute(o,c[1]),m.fromBufferAttribute(o,c[2]),no.getNormal(Tc),p[0]=`${Math.round(v.x*s)},${Math.round(v.y*s)},${Math.round(v.z*s)}`,p[1]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,p[2]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,!(p[0]===p[1]||p[1]===p[2]||p[2]===p[0]))for(let C=0;C<3;C++){let L=(C+1)%3,S=p[C],T=p[L],A=no[h[C]],N=no[h[L]],y=`${S}_${T}`,R=`${T}_${S}`;R in u&&u[R]?(Tc.dot(u[R].normal)<=r&&(f.push(A.x,A.y,A.z),f.push(N.x,N.y,N.z)),u[R]=null):y in u||(u[y]={index0:c[C],index1:c[L],normal:Tc.clone()})}}for(let _ in u)if(u[_]){let{index0:v,index1:g}=u[_];to.fromBufferAttribute(o,v),eo.fromBufferAttribute(o,g),f.push(to.x,to.y,to.z),f.push(eo.x,eo.y,eo.z)}this.setAttribute("position",new _e(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},$n=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){le("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],u=n[s+1]-h,f=(a-h)/u;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new bt:new z);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new z,s=[],r=[],a=[],o=new z,l=new Ge;for(let f=0;f<=t;f++){let _=f/t;s[f]=this.getTangentAt(_,new z)}r[0]=new z,a[0]=new z;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),p=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),p<=c&&(c=p,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();let _=Math.acos(Ee(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(o,_))}a[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos(Ee(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(f=-f);for(let _=1;_<=t;_++)r[_].applyMatrix4(l.makeRotationAxis(s[_],f*_)),a[_].crossVectors(s[_],r[_])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},mr=class extends $n{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new bt){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),p=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*p+this.aX,c=u*p+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},To=class extends mr{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function gh(){let i=0,t=0,e=0,n=0;function s(r,a,o,l){i=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,p){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+p)+(l-o)/p;u*=h,f*=h,s(a,o,u,f)},calc:function(r){let a=r*r,o=a*r;return i+t*r+e*a+n*o}}}var Nu=new z,Uu=new z,Cc=new gh,Rc=new gh,Pc=new gh,Co=class extends $n{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new z){let n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(Uu.subVectors(s[0],s[1]).add(s[0]),c=Uu);let p=s[o%r],u=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Nu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Nu),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,_=Math.pow(c.distanceToSquared(p),f),v=Math.pow(p.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);v<1e-4&&(v=1),_<1e-4&&(_=v),g<1e-4&&(g=v),Cc.initNonuniformCatmullRom(c.x,p.x,u.x,h.x,_,v,g),Rc.initNonuniformCatmullRom(c.y,p.y,u.y,h.y,_,v,g),Pc.initNonuniformCatmullRom(c.z,p.z,u.z,h.z,_,v,g)}else this.curveType==="catmullrom"&&(Cc.initCatmullRom(c.x,p.x,u.x,h.x,this.tension),Rc.initCatmullRom(c.y,p.y,u.y,h.y,this.tension),Pc.initCatmullRom(c.z,p.z,u.z,h.z,this.tension));return n.set(Cc.calc(l),Rc.calc(l),Pc.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new z().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Fu(i,t,e,n,s){let r=(n-t)*.5,a=(s-e)*.5,o=i*i,l=i*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*i+e}function Pp(i,t){let e=1-i;return e*e*t}function Ip(i,t){return 2*(1-i)*i*t}function Lp(i,t){return i*i*t}function Wr(i,t,e,n){return Pp(i,t)+Ip(i,e)+Lp(i,n)}function Dp(i,t){let e=1-i;return e*e*e*t}function Np(i,t){let e=1-i;return 3*e*e*i*t}function Up(i,t){return 3*(1-i)*i*i*t}function Fp(i,t){return i*i*i*t}function Xr(i,t,e,n,s){return Dp(i,t)+Np(i,e)+Up(i,n)+Fp(i,s)}var sa=class extends $n{constructor(t=new bt,e=new bt,n=new bt,s=new bt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new bt){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Xr(t,s.x,r.x,a.x,o.x),Xr(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Ro=class extends $n{constructor(t=new z,e=new z,n=new z,s=new z){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new z){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Xr(t,s.x,r.x,a.x,o.x),Xr(t,s.y,r.y,a.y,o.y),Xr(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},ra=class extends $n{constructor(t=new bt,e=new bt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new bt){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new bt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Po=class extends $n{constructor(t=new z,e=new z){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new z){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new z){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},aa=class extends $n{constructor(t=new bt,e=new bt,n=new bt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new bt){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(Wr(t,s.x,r.x,a.x),Wr(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Io=class extends $n{constructor(t=new z,e=new z,n=new z){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new z){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(Wr(t,s.x,r.x,a.x),Wr(t,s.y,r.y,a.y),Wr(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},oa=class extends $n{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new bt){let n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],p=s[a>s.length-3?s.length-1:a+2];return n.set(Fu(o,l.x,c.x,h.x,p.x),Fu(o,l.y,c.y,h.y,p.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new bt().fromArray(s))}return this}},Oc=Object.freeze({__proto__:null,ArcCurve:To,CatmullRomCurve3:Co,CubicBezierCurve:sa,CubicBezierCurve3:Ro,EllipseCurve:mr,LineCurve:ra,LineCurve3:Po,QuadraticBezierCurve:aa,QuadraticBezierCurve3:Io,SplineCurve:oa}),Lo=class extends $n{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Oc[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new Oc[s.type]().fromJSON(s))}return this}},la=class extends Lo{constructor(t){super(),this.type="Path",this.currentPoint=new bt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new ra(this.currentPoint.clone(),new bt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new aa(this.currentPoint.clone(),new bt(t,e),new bt(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,a){let o=new sa(this.currentPoint.clone(),new bt(t,e),new bt(n,s),new bt(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new oa(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,s,r,a),this}absarc(t,e,n,s,r,a){return this.absellipse(t,e,n,n,s,r,a),this}ellipse(t,e,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,a,o,l),this}absellipse(t,e,n,s,r,a,o,l){let c=new mr(t,e,n,s,r,a,o,l);if(this.curves.length>0){let p=c.getPoint(0);p.equals(this.currentPoint)||this.lineTo(p.x,p.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},Ui=class extends la{constructor(t){super(t),this.uuid=Cs(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new la().fromJSON(s))}return this}};function Op(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=Dd(i,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(n&&(r=Gp(i,t,r,e)),i.length>80*e){o=i[0],l=i[1];let h=o,p=l;for(let u=e;u<s;u+=e){let f=i[u],_=i[u+1];f<o&&(o=f),_<l&&(l=_),f>h&&(h=f),_>p&&(p=_)}c=Math.max(h-o,p-l),c=c!==0?32767/c:0}return ca(r,a,e,o,l,c,0),a}function Dd(i,t,e,n,s){let r;if(s===Qp(i,t,e,n)>0)for(let a=t;a<e;a+=n)r=Ou(a/n|0,i[a],i[a+1],r);else for(let a=e-n;a>=t;a-=n)r=Ou(a/n|0,i[a],i[a+1],r);return r&&gr(r,r.next)&&(ua(r),r=r.next),r}function Ms(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(gr(e,e.next)||sn(e.prev,e,e.next)===0)){if(ua(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function ca(i,t,e,n,s,r,a){if(!i)return;!a&&r&&$p(i,n,s,r);let o=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?zp(i,n,s,r):Bp(i)){t.push(l.i,i.i,c.i),ua(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=kp(Ms(i),t),ca(i,t,e,n,s,r,2)):a===2&&Vp(i,t,e,n,s,r):ca(Ms(i),t,e,n,s,r,1);break}}}function Bp(i){let t=i.prev,e=i,n=i.next;if(sn(t,e,n)>=0)return!1;let s=t.x,r=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=Math.min(s,r,a),p=Math.min(o,l,c),u=Math.max(s,r,a),f=Math.max(o,l,c),_=n.next;for(;_!==t;){if(_.x>=h&&_.x<=u&&_.y>=p&&_.y<=f&&Gr(s,o,r,l,a,c,_.x,_.y)&&sn(_.prev,_,_.next)>=0)return!1;_=_.next}return!0}function zp(i,t,e,n){let s=i.prev,r=i,a=i.next;if(sn(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,p=r.y,u=a.y,f=Math.min(o,l,c),_=Math.min(h,p,u),v=Math.max(o,l,c),g=Math.max(h,p,u),m=Bc(f,_,t,e,n),C=Bc(v,g,t,e,n),L=i.prevZ,S=i.nextZ;for(;L&&L.z>=m&&S&&S.z<=C;){if(L.x>=f&&L.x<=v&&L.y>=_&&L.y<=g&&L!==s&&L!==a&&Gr(o,h,l,p,c,u,L.x,L.y)&&sn(L.prev,L,L.next)>=0||(L=L.prevZ,S.x>=f&&S.x<=v&&S.y>=_&&S.y<=g&&S!==s&&S!==a&&Gr(o,h,l,p,c,u,S.x,S.y)&&sn(S.prev,S,S.next)>=0))return!1;S=S.nextZ}for(;L&&L.z>=m;){if(L.x>=f&&L.x<=v&&L.y>=_&&L.y<=g&&L!==s&&L!==a&&Gr(o,h,l,p,c,u,L.x,L.y)&&sn(L.prev,L,L.next)>=0)return!1;L=L.prevZ}for(;S&&S.z<=C;){if(S.x>=f&&S.x<=v&&S.y>=_&&S.y<=g&&S!==s&&S!==a&&Gr(o,h,l,p,c,u,S.x,S.y)&&sn(S.prev,S,S.next)>=0)return!1;S=S.nextZ}return!0}function kp(i,t){let e=i;do{let n=e.prev,s=e.next.next;!gr(n,s)&&Ud(n,e,e.next,s)&&ha(n,s)&&ha(s,n)&&(t.push(n.i,e.i,s.i),ua(e),ua(e.next),e=i=s),e=e.next}while(e!==i);return Ms(e)}function Vp(i,t,e,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Jp(a,o)){let l=Fd(a,o);a=Ms(a,a.next),l=Ms(l,l.next),ca(a,t,e,n,s,r,0),ca(l,t,e,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function Gp(i,t,e,n){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*n,l=r<a-1?t[r+1]*n:i.length,c=Dd(i,o,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Zp(c))}s.sort(Hp);for(let r=0;r<s.length;r++)e=Wp(s[r],e);return e}function Hp(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function Wp(i,t){let e=Xp(i,t);if(!e)return t;let n=Fd(e,i);return Ms(n,n.next),Ms(e,e.next)}function Xp(i,t){let e=t,n=i.x,s=i.y,r=-1/0,a;if(gr(i,e))return e;do{if(gr(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let p=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(p<=n&&p>r&&(r=p,a=e.x<e.next.x?e:e.next,p===n))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,l=a.x,c=a.y,h=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Nd(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){let p=Math.abs(s-e.y)/(n-e.x);ha(e,i)&&(p<h||p===h&&(e.x>a.x||e.x===a.x&&qp(a,e)))&&(a=e,h=p)}e=e.next}while(e!==o);return a}function qp(i,t){return sn(i.prev,i,t.prev)<0&&sn(t.next,i,i.next)<0}function $p(i,t,e,n){let s=i;do s.z===0&&(s.z=Bc(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Yp(s)}function Yp(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,e*=2}while(t>1);return i}function Bc(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Zp(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Nd(i,t,e,n,s,r,a,o){return(s-a)*(t-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(n-o)}function Gr(i,t,e,n,s,r,a,o){return!(i===a&&t===o)&&Nd(i,t,e,n,s,r,a,o)}function Jp(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!jp(i,t)&&(ha(i,t)&&ha(t,i)&&Kp(i,t)&&(sn(i.prev,i,t.prev)||sn(i,t.prev,t))||gr(i,t)&&sn(i.prev,i,i.next)>0&&sn(t.prev,t,t.next)>0)}function sn(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function gr(i,t){return i.x===t.x&&i.y===t.y}function Ud(i,t,e,n){let s=so(sn(i,t,e)),r=so(sn(i,t,n)),a=so(sn(e,n,i)),o=so(sn(e,n,t));return!!(s!==r&&a!==o||s===0&&io(i,e,t)||r===0&&io(i,n,t)||a===0&&io(e,i,n)||o===0&&io(e,t,n))}function io(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function so(i){return i>0?1:i<0?-1:0}function jp(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Ud(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function ha(i,t){return sn(i.prev,i,i.next)<0?sn(i,t,i.next)>=0&&sn(i,i.prev,t)>=0:sn(i,t,i.prev)<0||sn(i,i.next,t)<0}function Kp(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function Fd(i,t){let e=zc(i.i,i.x,i.y),n=zc(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Ou(i,t,e,n){let s=zc(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function ua(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function zc(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Qp(i,t,e,n){let s=0;for(let r=t,a=e-n;r<e;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var kc=class{static triangulate(t,e,n=2){return Op(t,e,n)}},gi=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];Bu(t),zu(n,t);let a=t.length;e.forEach(Bu);for(let l=0;l<e.length;l++)s.push(a),a+=e[l].length,zu(n,e[l]);let o=kc.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function Bu(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function zu(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var da=class i extends Ze{constructor(t=new Ui([new bt(.5,.5),new bt(-.5,.5),new bt(-.5,-.5),new bt(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let o=0,l=t.length;o<l;o++){let c=t[o];a(c)}this.setAttribute("position",new _e(s,3)),this.setAttribute("uv",new _e(r,2)),this.computeVertexNormals();function a(o){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,p=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,_=e.bevelSize!==void 0?e.bevelSize:f-.1,v=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3,m=e.extrudePath,C=e.UVGenerator!==void 0?e.UVGenerator:tm,L,S=!1,T,A,N,y;if(m){L=m.getSpacedPoints(h),S=!0,u=!1;let at=m.isCatmullRomCurve3?m.closed:!1;T=m.computeFrenetFrames(h,at),A=new z,N=new z,y=new z}u||(g=0,f=0,_=0,v=0);let R=o.extractPoints(c),F=R.shape,O=R.holes;if(!gi.isClockWise(F)){F=F.reverse();for(let at=0,dt=O.length;at<dt;at++){let ht=O[at];gi.isClockWise(ht)&&(O[at]=ht.reverse())}}function k(at){let ht=10000000000000001e-36,xt=at[0];for(let Pt=1;Pt<=at.length;Pt++){let Xt=Pt%at.length,ee=at[Xt],oe=ee.x-xt.x,he=ee.y-xt.y,B=oe*oe+he*he,we=Math.max(Math.abs(ee.x),Math.abs(ee.y),Math.abs(xt.x),Math.abs(xt.y)),ye=ht*we*we;if(B<=ye){at.splice(Xt,1),Pt--;continue}xt=ee}}k(F),O.forEach(k);let P=O.length,U=F;for(let at=0;at<P;at++){let dt=O[at];F=F.concat(dt)}function Y(at,dt,ht){return dt||de("ExtrudeGeometry: vec does not exist"),at.clone().addScaledVector(dt,ht)}let J=F.length;function ot(at,dt,ht){let xt,Pt,Xt,ee=at.x-dt.x,oe=at.y-dt.y,he=ht.x-at.x,B=ht.y-at.y,we=ee*ee+oe*oe,ye=ee*B-oe*he;if(Math.abs(ye)>Number.EPSILON){let D=Math.sqrt(we),x=Math.sqrt(he*he+B*B),H=dt.x-oe/D,Q=dt.y+ee/D,et=ht.x-B/x,Et=ht.y+he/x,Rt=((et-H)*B-(Et-Q)*he)/(ee*B-oe*he);xt=H+ee*Rt-at.x,Pt=Q+oe*Rt-at.y;let ut=xt*xt+Pt*Pt;if(ut<=2)return new bt(xt,Pt);Xt=Math.sqrt(ut/2)}else{let D=!1;ee>Number.EPSILON?he>Number.EPSILON&&(D=!0):ee<-Number.EPSILON?he<-Number.EPSILON&&(D=!0):Math.sign(oe)===Math.sign(B)&&(D=!0),D?(xt=-oe,Pt=ee,Xt=Math.sqrt(we)):(xt=ee,Pt=oe,Xt=Math.sqrt(we/2))}return new bt(xt/Xt,Pt/Xt)}let j=[];for(let at=0,dt=U.length,ht=dt-1,xt=at+1;at<dt;at++,ht++,xt++)ht===dt&&(ht=0),xt===dt&&(xt=0),j[at]=ot(U[at],U[ht],U[xt]);let st=[],lt,Dt=j.concat();for(let at=0,dt=P;at<dt;at++){let ht=O[at];lt=[];for(let xt=0,Pt=ht.length,Xt=Pt-1,ee=xt+1;xt<Pt;xt++,Xt++,ee++)Xt===Pt&&(Xt=0),ee===Pt&&(ee=0),lt[xt]=ot(ht[xt],ht[Xt],ht[ee]);st.push(lt),Dt=Dt.concat(lt)}let At;if(g===0)At=gi.triangulateShape(U,O);else{let at=[],dt=[];for(let ht=0;ht<g;ht++){let xt=ht/g,Pt=f*Math.cos(xt*Math.PI/2),Xt=_*Math.sin(xt*Math.PI/2)+v;for(let ee=0,oe=U.length;ee<oe;ee++){let he=Y(U[ee],j[ee],Xt);X(he.x,he.y,-Pt),xt===0&&at.push(he)}for(let ee=0,oe=P;ee<oe;ee++){let he=O[ee];lt=st[ee];let B=[];for(let we=0,ye=he.length;we<ye;we++){let D=Y(he[we],lt[we],Xt);X(D.x,D.y,-Pt),xt===0&&B.push(D)}xt===0&&dt.push(B)}}At=gi.triangulateShape(at,dt)}let ae=At.length,ne=_+v;for(let at=0;at<J;at++){let dt=u?Y(F[at],Dt[at],ne):F[at];S?(N.copy(T.normals[0]).multiplyScalar(dt.x),A.copy(T.binormals[0]).multiplyScalar(dt.y),y.copy(L[0]).add(N).add(A),X(y.x,y.y,y.z)):X(dt.x,dt.y,0)}for(let at=1;at<=h;at++)for(let dt=0;dt<J;dt++){let ht=u?Y(F[dt],Dt[dt],ne):F[dt];S?(N.copy(T.normals[at]).multiplyScalar(ht.x),A.copy(T.binormals[at]).multiplyScalar(ht.y),y.copy(L[at]).add(N).add(A),X(y.x,y.y,y.z)):X(ht.x,ht.y,p/h*at)}for(let at=g-1;at>=0;at--){let dt=at/g,ht=f*Math.cos(dt*Math.PI/2),xt=_*Math.sin(dt*Math.PI/2)+v;for(let Pt=0,Xt=U.length;Pt<Xt;Pt++){let ee=Y(U[Pt],j[Pt],xt);X(ee.x,ee.y,p+ht)}for(let Pt=0,Xt=O.length;Pt<Xt;Pt++){let ee=O[Pt];lt=st[Pt];for(let oe=0,he=ee.length;oe<he;oe++){let B=Y(ee[oe],lt[oe],xt);S?X(B.x,B.y+L[h-1].y,L[h-1].x+ht):X(B.x,B.y,p+ht)}}}wt(),w();function wt(){let at=s.length/3;if(u){let dt=0,ht=J*dt;for(let xt=0;xt<ae;xt++){let Pt=At[xt];K(Pt[2]+ht,Pt[1]+ht,Pt[0]+ht)}dt=h+g*2,ht=J*dt;for(let xt=0;xt<ae;xt++){let Pt=At[xt];K(Pt[0]+ht,Pt[1]+ht,Pt[2]+ht)}}else{for(let dt=0;dt<ae;dt++){let ht=At[dt];K(ht[2],ht[1],ht[0])}for(let dt=0;dt<ae;dt++){let ht=At[dt];K(ht[0]+J*h,ht[1]+J*h,ht[2]+J*h)}}n.addGroup(at,s.length/3-at,0)}function w(){let at=s.length/3,dt=0;I(U,dt),dt+=U.length;for(let ht=0,xt=O.length;ht<xt;ht++){let Pt=O[ht];I(Pt,dt),dt+=Pt.length}n.addGroup(at,s.length/3-at,1)}function I(at,dt){let ht=at.length;for(;--ht>=0;){let xt=ht,Pt=ht-1;Pt<0&&(Pt=at.length-1);for(let Xt=0,ee=h+g*2;Xt<ee;Xt++){let oe=J*Xt,he=J*(Xt+1),B=dt+xt+oe,we=dt+Pt+oe,ye=dt+Pt+he,D=dt+xt+he;rt(B,we,ye,D)}}}function X(at,dt,ht){l.push(at),l.push(dt),l.push(ht)}function K(at,dt,ht){yt(at),yt(dt),yt(ht);let xt=s.length/3,Pt=C.generateTopUV(n,s,xt-3,xt-2,xt-1);ie(Pt[0]),ie(Pt[1]),ie(Pt[2])}function rt(at,dt,ht,xt){yt(at),yt(dt),yt(xt),yt(dt),yt(ht),yt(xt);let Pt=s.length/3,Xt=C.generateSideWallUV(n,s,Pt-6,Pt-3,Pt-2,Pt-1);ie(Xt[0]),ie(Xt[1]),ie(Xt[3]),ie(Xt[1]),ie(Xt[2]),ie(Xt[3])}function yt(at){s.push(l[at*3+0]),s.push(l[at*3+1]),s.push(l[at*3+2])}function ie(at){r.push(at.x),r.push(at.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return em(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];n.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new Oc[s.type]().fromJSON(s)),new i(n,t.options)}},tm={generateTopUV:function(i,t,e,n,s){let r=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[s*3],h=t[s*3+1];return[new bt(r,a),new bt(o,l),new bt(c,h)]},generateSideWallUV:function(i,t,e,n,s,r){let a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],p=t[n*3+2],u=t[s*3],f=t[s*3+1],_=t[s*3+2],v=t[r*3],g=t[r*3+1],m=t[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new bt(a,1-l),new bt(c,1-p),new bt(u,1-_),new bt(v,1-m)]:[new bt(o,1-l),new bt(h,1-p),new bt(f,1-_),new bt(g,1-m)]}};function em(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var ji=class i extends Ze{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,p=t/o,u=e/l,f=[],_=[],v=[],g=[];for(let m=0;m<h;m++){let C=m*u-a;for(let L=0;L<c;L++){let S=L*p-r;_.push(S,-C,0),v.push(0,0,1),g.push(L/o),g.push(1-m/l)}}for(let m=0;m<l;m++)for(let C=0;C<o;C++){let L=C+c*m,S=C+c*(m+1),T=C+1+c*(m+1),A=C+1+c*m;f.push(L,S,A),f.push(S,T,A)}this.setIndex(f),this.setAttribute("position",new _e(_,3)),this.setAttribute("normal",new _e(v,3)),this.setAttribute("uv",new _e(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var _r=class i extends Ze{constructor(t=new Ui([new bt(0,.5),new bt(-.5,-.5),new bt(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],s=[],r=[],a=[],o=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(n),this.setAttribute("position",new _e(s,3)),this.setAttribute("normal",new _e(r,3)),this.setAttribute("uv",new _e(a,2));function c(h){let p=s.length/3,u=h.extractPoints(e),f=u.shape,_=u.holes;gi.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,m=_.length;g<m;g++){let C=_[g];gi.isClockWise(C)===!0&&(_[g]=C.reverse())}let v=gi.triangulateShape(f,_);for(let g=0,m=_.length;g<m;g++){let C=_[g];f=f.concat(C)}for(let g=0,m=f.length;g<m;g++){let C=f[g];s.push(C.x,C.y,0),r.push(0,0,1),a.push(C.x,C.y)}for(let g=0,m=v.length;g<m;g++){let C=v[g],L=C[0]+p,S=C[1]+p,T=C[2]+p;n.push(L,S,T),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return nm(e,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];n.push(a)}return new i(n,t.curveSegments)}};function nm(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){let s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}var bs=class i extends Ze{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],p=new z,u=new z,f=[],_=[],v=[],g=[];for(let m=0;m<=n;m++){let C=[],L=m/n,S=a+L*o,T=t*Math.cos(S),A=Math.sqrt(t*t-T*T),N=0;m===0&&a===0?N=.5/e:m===n&&l===Math.PI&&(N=-.5/e);for(let y=0;y<=e;y++){let R=y/e,F=s+R*r;p.x=-A*Math.cos(F),p.y=T,p.z=A*Math.sin(F),_.push(p.x,p.y,p.z),u.copy(p).normalize(),v.push(u.x,u.y,u.z),g.push(R+N,1-L),C.push(c++)}h.push(C)}for(let m=0;m<n;m++)for(let C=0;C<e;C++){let L=h[m][C+1],S=h[m][C],T=h[m+1][C],A=h[m+1][C+1];(m!==0||a>0)&&f.push(L,S,A),(m!==n-1||l<Math.PI)&&f.push(S,T,A)}this.setIndex(f),this.setAttribute("position",new _e(_,3)),this.setAttribute("normal",new _e(v,3)),this.setAttribute("uv",new _e(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function Rs(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(ku(s))s.isRenderTargetTexture?(le("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(ku(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Pn(i){let t={};for(let e=0;e<i.length;e++){let n=Rs(i[e]);for(let s in n)t[s]=n[s]}return t}function ku(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function im(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function _h(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:De.workingColorSpace}var Od={clone:Rs,merge:Pn},sm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,rm=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Yn=class extends Ni{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=sm,this.fragmentShader=rm,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Rs(t.uniforms),this.uniformsGroups=im(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new fe().setHex(s.value);break;case"v2":this.uniforms[n].value=new bt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new z().fromArray(s.value);break;case"v4":this.uniforms[n].value=new tn().fromArray(s.value);break;case"m3":this.uniforms[n].value=new xe().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Ge().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Do=class extends Yn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Mn=class extends Ni{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new fe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new fe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ul,this.normalScale=new bt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var No=class extends Ni{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=xd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Uo=class extends Ni{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function er(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function Ic(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Ki=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Fo=class extends Ki{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Nc,endingEnd:Nc}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Uc:r=t,o=2*e-n;break;case Fc:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Uc:a=t,l=2*n-e;break;case Fc:a=1,l=n+s[1]-s[0];break;default:a=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,p=this._offsetNext,u=this._weightPrev,f=this._weightNext,_=(n-e)/(s-e),v=_*_,g=v*_,m=-u*g+2*u*v-u*_,C=(1+u)*g+(-1.5-2*u)*v+(-.5+u)*_+1,L=(-1-f)*g+(1.5+f)*v+.5*_,S=f*g-f*v;for(let T=0;T!==o;++T)r[T]=m*a[h+T]+C*a[c+T]+L*a[l+T]+S*a[p+T];return r}},Oo=class extends Ki{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(n-e)/(s-e),p=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*p+a[l+u]*h;return r}},Bo=class extends Ki{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},zo=class extends Ki{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this.inTangents,p=this.outTangents;if(!h||!p){let _=(n-e)/(s-e),v=1-_;for(let g=0;g!==o;++g)r[g]=a[c+g]*v+a[l+g]*_;return r}let u=o*2,f=t-1;for(let _=0;_!==o;++_){let v=a[c+_],g=a[l+_],m=f*u+_*2,C=p[m],L=p[m+1],S=t*u+_*2,T=h[S],A=h[S+1],N=om(n,e,C,T,s);r[_]=Bd(N,v,L,A,g)}return r}};function Bd(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function am(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function om(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=Bd(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let l=am(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var Zn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=er(e,this.TimeBufferType),this.values=er(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:er(t.times,Array),values:er(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),Ic(t.settings)&&(n.settings={inTangents:er(t.settings.inTangents,Array),outTangents:er(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Bo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Oo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Fo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new zo(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case qr:e=this.InterpolantFactoryMethodDiscrete;break;case vo:e=this.InterpolantFactoryMethodLinear;break;case oo:e=this.InterpolantFactoryMethodSmooth;break;case Dc:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return le("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return qr;case this.InterpolantFactoryMethodLinear:return vo;case this.InterpolantFactoryMethodSmooth:return oo;case this.InterpolantFactoryMethodBezier:return Dc}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;Ic(this.settings)&&(Vu(this.settings.inTangents,t),Vu(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(de("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(de("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){de("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){de("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&Yf(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){de("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===oo,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(s)l=!0;else{let p=o*n,u=p-n,f=p+n;for(let _=0;_!==n;++_){let v=e[p+_];if(v!==e[u+_]||v!==e[f+_]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let p=o*n,u=a*n;for(let f=0;f!==n;++f)e[u+f]=e[p+f]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,Ic(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Vu(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Zn.prototype.ValueTypeName="";Zn.prototype.TimeBufferType=Float32Array;Zn.prototype.ValueBufferType=Float32Array;Zn.prototype.DefaultInterpolation=vo;var Qi=class extends Zn{constructor(t,e,n){super(t,e,n)}};Qi.prototype.ValueTypeName="bool";Qi.prototype.ValueBufferType=Array;Qi.prototype.DefaultInterpolation=qr;Qi.prototype.InterpolantFactoryMethodLinear=void 0;Qi.prototype.InterpolantFactoryMethodSmooth=void 0;var ko=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}};ko.prototype.ValueTypeName="color";var Vo=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}};Vo.prototype.ValueTypeName="number";var Go=class extends Ki{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-e)/(s-e),c=t*o;for(let h=c+o;c!==h;c+=4)Xn.slerpFlat(r,0,a,c-o,a,c,l);return r}},fa=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Go(this.times,this.values,this.getValueSize(),t)}};fa.prototype.ValueTypeName="quaternion";fa.prototype.InterpolantFactoryMethodSmooth=void 0;var ts=class extends Zn{constructor(t,e,n){super(t,e,n)}};ts.prototype.ValueTypeName="string";ts.prototype.ValueBufferType=Array;ts.prototype.DefaultInterpolation=qr;ts.prototype.InterpolantFactoryMethodLinear=void 0;ts.prototype.InterpolantFactoryMethodSmooth=void 0;var Ho=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}};Ho.prototype.ValueTypeName="vector";var Wo=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,p){return c.push(h,p),this},this.removeHandler=function(h){let p=c.indexOf(h);return p!==-1&&c.splice(p,2),this},this.getHandler=function(h){for(let p=0,u=c.length;p<u;p+=2){let f=c[p],_=c[p+1];if(f.global&&(f.lastIndex=0),f.test(h))return _}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},zd=new Wo,Xo=class{constructor(t){this.manager=t!==void 0?t:zd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Xo.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ss=class extends fn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new fe(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},Es=class extends Ss{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(fn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new fe(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},Lc=new Ge,Gu=new z,Hu=new z,pa=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new bt(512,512),this.mapType=zn,this.map=null,this.mapPass=null,this.matrix=new Ge,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new pr,this._frameExtents=new bt(1,1),this._viewportCount=1,this._viewports=[new tn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Gu.setFromMatrixPosition(t.matrixWorld),e.position.copy(Gu),Hu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Hu),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){Lc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Lc,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===lr||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(Lc)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},ro=new z,ao=new Xn,pi=new z,ma=class extends fn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ge,this.projectionMatrix=new Ge,this.projectionMatrixInverse=new Ge,this.coordinateSystem=oi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(ro,ao,pi),pi.x===1&&pi.y===1&&pi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ro,ao,pi.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(ro,ao,pi),pi.x===1&&pi.y===1&&pi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ro,ao,pi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Yi=new z,Wu=new bt,Xu=new bt,dn=class extends ma{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=hr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(rr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return hr*2*Math.atan(Math.tan(rr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Yi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Yi.x,Yi.y).multiplyScalar(-t/Yi.z),Yi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Yi.x,Yi.y).multiplyScalar(-t/Yi.z)}getViewSize(t,e){return this.getViewBounds(t,Wu,Xu),e.subVectors(Xu,Wu)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(rr*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Vc=class extends pa{constructor(){super(new dn(90,1,.5,500)),this.isPointLightShadow=!0}},ga=class extends Ss{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Vc}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},xr=class extends ma{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Gc=class extends pa{constructor(){super(new xr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},es=class extends Ss{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(fn.DEFAULT_UP),this.updateMatrix(),this.target=new fn,this.shadow=new Gc}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},As=class extends Ss{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var nr=-90,ir=1,qo=class extends fn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new dn(nr,ir,t,e);s.layers=this.layers,this.add(s);let r=new dn(nr,ir,t,e);r.layers=this.layers,this.add(r);let a=new dn(nr,ir,t,e);a.layers=this.layers,this.add(a);let o=new dn(nr,ir,t,e);o.layers=this.layers,this.add(o);let l=new dn(nr,ir,t,e);l.layers=this.layers,this.add(l);let c=new dn(nr,ir,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===oi)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===lr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,p=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;let v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(p,u,f),t.xr.enabled=_,n.texture.needsPMREMUpdate=!0}},$o=class extends dn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var xh="\\[\\]\\.:\\/",lm=new RegExp("["+xh+"]","g"),vh="[^"+xh+"]",cm="[^"+xh.replace("\\.","")+"]",hm=/((?:WC+[\/:])*)/.source.replace("WC",vh),um=/(WCOD+)?/.source.replace("WCOD",cm),dm=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",vh),fm=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",vh),pm=new RegExp("^"+hm+um+dm+fm+"$"),mm=["material","materials","bones","map"],Hc=class{constructor(t,e,n){let s=n||je.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},je=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(lm,"")}static parseTrackName(t){let e=pm.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);mm.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=n(o.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){le("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){de("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){de("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){de("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){de("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){de("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){de("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){de("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;de("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){de("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){de("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};je.Composite=Hc;je.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};je.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};je.prototype.GetterByBindingType=[je.prototype._getValue_direct,je.prototype._getValue_array,je.prototype._getValue_arrayElement,je.prototype._getValue_toArray];je.prototype.SetterByBindingTypeAndVersioning=[[je.prototype._setValue_direct,je.prototype._setValue_direct_setNeedsUpdate,je.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[je.prototype._setValue_array,je.prototype._setValue_array_setNeedsUpdate,je.prototype._setValue_array_setMatrixWorldNeedsUpdate],[je.prototype._setValue_arrayElement,je.prototype._setValue_arrayElement_setNeedsUpdate,je.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[je.prototype._setValue_fromArray,je.prototype._setValue_fromArray_setNeedsUpdate,je.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Uv=new Float32Array(1);var qu=new Ge,Fi=class{constructor(t,e,n=0,s=1/0){this.ray=new Zi(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new dr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):de("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return qu.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(qu),this}intersectObject(t,e=!0,n=[]){return Wc(t,this,n,e),n.sort($u),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Wc(t[s],this,n,e);return n.sort($u),n}};function $u(i,t){return i.distance-t.distance}function Wc(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)Wc(r[a],t,e,!0)}}var vr=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Ee(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Ee(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Ah=class Ah{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};Ah.prototype.isMatrix2=!0;var Xc=Ah;var _a=class extends li{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function yh(i,t,e,n){let s=gm(n);switch(e){case uh:return i*t;case el:return i*t/s.components*s.byteLength;case nl:return i*t/s.components*s.byteLength;case ls:return i*t*2/s.components*s.byteLength;case il:return i*t*2/s.components*s.byteLength;case dh:return i*t*3/s.components*s.byteLength;case ei:return i*t*4/s.components*s.byteLength;case sl:return i*t*4/s.components*s.byteLength;case Ma:case ba:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Sa:case Ea:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case al:case ll:return Math.max(i,16)*Math.max(t,8)/4;case rl:case ol:return Math.max(i,8)*Math.max(t,8)/2;case cl:case hl:case dl:case fl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ul:case Aa:case pl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ml:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case gl:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case _l:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case xl:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case vl:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case yl:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Ml:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case bl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Sl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case El:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Al:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case wl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Tl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Cl:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Rl:case Pl:case Il:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Ll:case Dl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case wa:case Nl:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function gm(i){switch(i){case zn:case oh:return{byteLength:1,components:1};case br:case lh:case fi:return{byteLength:2,components:1};case Qo:case tl:return{byteLength:2,components:4};case di:case Ko:case ti:return{byteLength:4,components:1};case ch:case hh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?le("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function lf(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function xm(i){let t=new WeakMap;function e(o,l){let c=o.array,h=o.usage,p=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:p}}function n(o,l,c){let h=l.array,p=l.updateRanges;if(i.bindBuffer(c,o),p.length===0)i.bufferSubData(c,0,h);else{p.sort((f,_)=>f.start-_.start);let u=0;for(let f=1;f<p.length;f++){let _=p[u],v=p[f];v.start<=_.start+_.count+1?_.count=Math.max(_.count,v.start+v.count-_.start):(++u,p[u]=v)}p.length=u+1;for(let f=0,_=p.length;f<_;f++){let v=p[f];i.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var vm=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ym=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Mm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,bm=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Sm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Em=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Am=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,wm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Tm=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Cm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Rm=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Pm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Im=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Lm=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Dm=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Nm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Um=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Fm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Om=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Bm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,zm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,km=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Vm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Gm=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Hm=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Wm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Xm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,qm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,$m=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ym=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Zm="gl_FragColor = linearToOutputTexel( gl_FragColor );",Jm=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,jm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Km=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Qm=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,tg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,eg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ng=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,ig=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,sg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,rg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ag=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,og=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,cg=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,hg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,ug=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,dg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,fg=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,pg=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,mg=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,gg=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,_g=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,xg=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,vg=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,yg=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Mg=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,bg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Sg=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Eg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ag=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,wg=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Tg=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Cg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Rg=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Ig=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Lg=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Dg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ng=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ug=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Fg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Og=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Bg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,zg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Vg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Gg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Hg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Wg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Xg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,qg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,$g=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Yg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Zg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Jg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,jg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Kg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Qg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,t0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,e0=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,n0=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,i0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,s0=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,r0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,a0=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,o0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,l0=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,c0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,h0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,u0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,d0=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,f0=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,p0=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,m0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,g0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,_0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,x0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,v0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,y0=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,M0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,b0=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,S0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,E0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,A0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,w0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,T0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,C0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,R0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,P0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,I0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,L0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,D0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,N0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,U0=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,F0=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,O0=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,B0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,z0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,k0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,V0=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,G0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,H0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,W0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,X0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,q0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Y0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Z0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,J0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,j0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,K0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ae={alphahash_fragment:vm,alphahash_pars_fragment:ym,alphamap_fragment:Mm,alphamap_pars_fragment:bm,alphatest_fragment:Sm,alphatest_pars_fragment:Em,aomap_fragment:Am,aomap_pars_fragment:wm,batching_pars_vertex:Tm,batching_vertex:Cm,begin_vertex:Rm,beginnormal_vertex:Pm,bsdfs:Im,iridescence_fragment:Lm,bumpmap_pars_fragment:Dm,clipping_planes_fragment:Nm,clipping_planes_pars_fragment:Um,clipping_planes_pars_vertex:Fm,clipping_planes_vertex:Om,color_fragment:Bm,color_pars_fragment:zm,color_pars_vertex:km,color_vertex:Vm,common:Gm,cube_uv_reflection_fragment:Hm,defaultnormal_vertex:Wm,displacementmap_pars_vertex:Xm,displacementmap_vertex:qm,emissivemap_fragment:$m,emissivemap_pars_fragment:Ym,colorspace_fragment:Zm,colorspace_pars_fragment:Jm,envmap_fragment:jm,envmap_common_pars_fragment:Km,envmap_pars_fragment:Qm,envmap_pars_vertex:tg,envmap_physical_pars_fragment:ug,envmap_vertex:eg,fog_vertex:ng,fog_pars_vertex:ig,fog_fragment:sg,fog_pars_fragment:rg,gradientmap_pars_fragment:ag,lightmap_pars_fragment:og,lights_lambert_fragment:lg,lights_lambert_pars_fragment:cg,lights_pars_begin:hg,lights_toon_fragment:dg,lights_toon_pars_fragment:fg,lights_phong_fragment:pg,lights_phong_pars_fragment:mg,lights_physical_fragment:gg,lights_physical_pars_fragment:_g,lights_fragment_begin:xg,lights_fragment_maps:vg,lights_fragment_end:yg,lightprobes_pars_fragment:Mg,logdepthbuf_fragment:bg,logdepthbuf_pars_fragment:Sg,logdepthbuf_pars_vertex:Eg,logdepthbuf_vertex:Ag,map_fragment:wg,map_pars_fragment:Tg,map_particle_fragment:Cg,map_particle_pars_fragment:Rg,metalnessmap_fragment:Pg,metalnessmap_pars_fragment:Ig,morphinstance_vertex:Lg,morphcolor_vertex:Dg,morphnormal_vertex:Ng,morphtarget_pars_vertex:Ug,morphtarget_vertex:Fg,normal_fragment_begin:Og,normal_fragment_maps:Bg,normal_pars_fragment:zg,normal_pars_vertex:kg,normal_vertex:Vg,normalmap_pars_fragment:Gg,clearcoat_normal_fragment_begin:Hg,clearcoat_normal_fragment_maps:Wg,clearcoat_pars_fragment:Xg,iridescence_pars_fragment:qg,opaque_fragment:$g,packing:Yg,premultiplied_alpha_fragment:Zg,project_vertex:Jg,dithering_fragment:jg,dithering_pars_fragment:Kg,roughnessmap_fragment:Qg,roughnessmap_pars_fragment:t0,shadowmap_pars_fragment:e0,shadowmap_pars_vertex:n0,shadowmap_vertex:i0,shadowmask_pars_fragment:s0,skinbase_vertex:r0,skinning_pars_vertex:a0,skinning_vertex:o0,skinnormal_vertex:l0,specularmap_fragment:c0,specularmap_pars_fragment:h0,tonemapping_fragment:u0,tonemapping_pars_fragment:d0,transmission_fragment:f0,transmission_pars_fragment:p0,uv_pars_fragment:m0,uv_pars_vertex:g0,uv_vertex:_0,worldpos_vertex:x0,background_vert:v0,background_frag:y0,backgroundCube_vert:M0,backgroundCube_frag:b0,cube_vert:S0,cube_frag:E0,depth_vert:A0,depth_frag:w0,distance_vert:T0,distance_frag:C0,equirect_vert:R0,equirect_frag:P0,linedashed_vert:I0,linedashed_frag:L0,meshbasic_vert:D0,meshbasic_frag:N0,meshlambert_vert:U0,meshlambert_frag:F0,meshmatcap_vert:O0,meshmatcap_frag:B0,meshnormal_vert:z0,meshnormal_frag:k0,meshphong_vert:V0,meshphong_frag:G0,meshphysical_vert:H0,meshphysical_frag:W0,meshtoon_vert:X0,meshtoon_frag:q0,points_vert:$0,points_frag:Y0,shadow_vert:Z0,shadow_frag:J0,sprite_vert:j0,sprite_frag:K0},zt={common:{diffuse:{value:new fe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new xe},alphaMap:{value:null},alphaMapTransform:{value:new xe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new xe}},envmap:{envMap:{value:null},envMapRotation:{value:new xe},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new xe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new xe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new xe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new xe},normalScale:{value:new bt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new xe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new xe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new xe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new xe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new fe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new z},probesMax:{value:new z},probesResolution:{value:new z}},points:{diffuse:{value:new fe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new xe},alphaTest:{value:0},uvTransform:{value:new xe}},sprite:{diffuse:{value:new fe(16777215)},opacity:{value:1},center:{value:new bt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new xe},alphaMap:{value:null},alphaMapTransform:{value:new xe},alphaTest:{value:0}}},bi={basic:{uniforms:Pn([zt.common,zt.specularmap,zt.envmap,zt.aomap,zt.lightmap,zt.fog]),vertexShader:Ae.meshbasic_vert,fragmentShader:Ae.meshbasic_frag},lambert:{uniforms:Pn([zt.common,zt.specularmap,zt.envmap,zt.aomap,zt.lightmap,zt.emissivemap,zt.bumpmap,zt.normalmap,zt.displacementmap,zt.fog,zt.lights,{emissive:{value:new fe(0)},envMapIntensity:{value:1}}]),vertexShader:Ae.meshlambert_vert,fragmentShader:Ae.meshlambert_frag},phong:{uniforms:Pn([zt.common,zt.specularmap,zt.envmap,zt.aomap,zt.lightmap,zt.emissivemap,zt.bumpmap,zt.normalmap,zt.displacementmap,zt.fog,zt.lights,{emissive:{value:new fe(0)},specular:{value:new fe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ae.meshphong_vert,fragmentShader:Ae.meshphong_frag},standard:{uniforms:Pn([zt.common,zt.envmap,zt.aomap,zt.lightmap,zt.emissivemap,zt.bumpmap,zt.normalmap,zt.displacementmap,zt.roughnessmap,zt.metalnessmap,zt.fog,zt.lights,{emissive:{value:new fe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ae.meshphysical_vert,fragmentShader:Ae.meshphysical_frag},toon:{uniforms:Pn([zt.common,zt.aomap,zt.lightmap,zt.emissivemap,zt.bumpmap,zt.normalmap,zt.displacementmap,zt.gradientmap,zt.fog,zt.lights,{emissive:{value:new fe(0)}}]),vertexShader:Ae.meshtoon_vert,fragmentShader:Ae.meshtoon_frag},matcap:{uniforms:Pn([zt.common,zt.bumpmap,zt.normalmap,zt.displacementmap,zt.fog,{matcap:{value:null}}]),vertexShader:Ae.meshmatcap_vert,fragmentShader:Ae.meshmatcap_frag},points:{uniforms:Pn([zt.points,zt.fog]),vertexShader:Ae.points_vert,fragmentShader:Ae.points_frag},dashed:{uniforms:Pn([zt.common,zt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ae.linedashed_vert,fragmentShader:Ae.linedashed_frag},depth:{uniforms:Pn([zt.common,zt.displacementmap]),vertexShader:Ae.depth_vert,fragmentShader:Ae.depth_frag},normal:{uniforms:Pn([zt.common,zt.bumpmap,zt.normalmap,zt.displacementmap,{opacity:{value:1}}]),vertexShader:Ae.meshnormal_vert,fragmentShader:Ae.meshnormal_frag},sprite:{uniforms:Pn([zt.sprite,zt.fog]),vertexShader:Ae.sprite_vert,fragmentShader:Ae.sprite_frag},background:{uniforms:{uvTransform:{value:new xe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ae.background_vert,fragmentShader:Ae.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new xe}},vertexShader:Ae.backgroundCube_vert,fragmentShader:Ae.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ae.cube_vert,fragmentShader:Ae.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ae.equirect_vert,fragmentShader:Ae.equirect_frag},distance:{uniforms:Pn([zt.common,zt.displacementmap,{referencePosition:{value:new z},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ae.distance_vert,fragmentShader:Ae.distance_frag},shadow:{uniforms:Pn([zt.lights,zt.fog,{color:{value:new fe(0)},opacity:{value:1}}]),vertexShader:Ae.shadow_vert,fragmentShader:Ae.shadow_frag}};bi.physical={uniforms:Pn([bi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new xe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new xe},clearcoatNormalScale:{value:new bt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new xe},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new xe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new xe},sheen:{value:0},sheenColor:{value:new fe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new xe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new xe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new xe},transmissionSamplerSize:{value:new bt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new xe},attenuationDistance:{value:0},attenuationColor:{value:new fe(0)},specularColor:{value:new fe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new xe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new xe},anisotropyVector:{value:new bt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new xe}}]),vertexShader:Ae.meshphysical_vert,fragmentShader:Ae.meshphysical_frag};var Bl={r:0,b:0,g:0},Q0=new Ge,cf=new xe;cf.set(-1,0,0,0,1,0,0,0,1);function t_(i,t,e,n,s,r){let a=new fe(0),o=s===!0?0:1,l,c,h=null,p=0,u=null;function f(C){let L=C.isScene===!0?C.background:null;if(L&&L.isTexture){let S=C.backgroundBlurriness>0;L=t.get(L,S)}return L}function _(C){let L=!1,S=f(C);S===null?g(a,o):S&&S.isColor&&(g(S,1),L=!0);let T=i.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||L)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function v(C,L){let S=f(L);S&&(S.isCubeTexture||S.mapping===va)?(c===void 0&&(c=new ze(new qn(1,1,1),new Yn({name:"BackgroundCubeMaterial",uniforms:Rs(bi.backgroundCube.uniforms),vertexShader:bi.backgroundCube.vertexShader,fragmentShader:bi.backgroundCube.fragmentShader,side:Dn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,A,N){this.matrixWorld.copyPosition(N.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=S,c.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Q0.makeRotationFromEuler(L.backgroundRotation)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(cf),c.material.toneMapped=De.getTransfer(S.colorSpace)!==Xe,(h!==S||p!==S.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=S,p=S.version,u=i.toneMapping),c.layers.enableAll(),C.unshift(c,c.geometry,c.material,0,0,null)):S&&S.isTexture&&(l===void 0&&(l=new ze(new ji(2,2),new Yn({name:"BackgroundMaterial",uniforms:Rs(bi.background.uniforms),vertexShader:bi.background.vertexShader,fragmentShader:bi.background.fragmentShader,side:ss,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=S,l.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,l.material.toneMapped=De.getTransfer(S.colorSpace)!==Xe,S.matrixAutoUpdate===!0&&S.updateMatrix(),l.material.uniforms.uvTransform.value.copy(S.matrix),(h!==S||p!==S.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=S,p=S.version,u=i.toneMapping),l.layers.enableAll(),C.unshift(l,l.geometry,l.material,0,0,null))}function g(C,L){C.getRGB(Bl,_h(i)),e.buffers.color.setClear(Bl.r,Bl.g,Bl.b,L,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(C,L=1){a.set(C),o=L,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(C){o=C,g(a,o)},render:_,addToRenderList:v,dispose:m}}function e_(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(O,V,k,P,U){let Y=!1,J=p(O,P,k,V);r!==J&&(r=J,c(r.object)),Y=f(O,P,k,U),Y&&_(O,P,k,U),U!==null&&t.update(U,i.ELEMENT_ARRAY_BUFFER),(Y||a)&&(a=!1,S(O,V,k,P),U!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(U).buffer))}function l(){return i.createVertexArray()}function c(O){return i.bindVertexArray(O)}function h(O){return i.deleteVertexArray(O)}function p(O,V,k,P){let U=P.wireframe===!0,Y=n[V.id];Y===void 0&&(Y={},n[V.id]=Y);let J=O.isInstancedMesh===!0?O.id:0,ot=Y[J];ot===void 0&&(ot={},Y[J]=ot);let j=ot[k.id];j===void 0&&(j={},ot[k.id]=j);let st=j[U];return st===void 0&&(st=u(l()),j[U]=st),st}function u(O){let V=[],k=[],P=[];for(let U=0;U<e;U++)V[U]=0,k[U]=0,P[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:V,enabledAttributes:k,attributeDivisors:P,object:O,attributes:{},index:null}}function f(O,V,k,P){let U=r.attributes,Y=V.attributes,J=0,ot=k.getAttributes();for(let j in ot)if(ot[j].location>=0){let lt=U[j],Dt=Y[j];if(Dt===void 0&&(j==="instanceMatrix"&&O.instanceMatrix&&(Dt=O.instanceMatrix),j==="instanceColor"&&O.instanceColor&&(Dt=O.instanceColor)),lt===void 0||lt.attribute!==Dt||Dt&&lt.data!==Dt.data)return!0;J++}return r.attributesNum!==J||r.index!==P}function _(O,V,k,P){let U={},Y=V.attributes,J=0,ot=k.getAttributes();for(let j in ot)if(ot[j].location>=0){let lt=Y[j];lt===void 0&&(j==="instanceMatrix"&&O.instanceMatrix&&(lt=O.instanceMatrix),j==="instanceColor"&&O.instanceColor&&(lt=O.instanceColor));let Dt={};Dt.attribute=lt,lt&&lt.data&&(Dt.data=lt.data),U[j]=Dt,J++}r.attributes=U,r.attributesNum=J,r.index=P}function v(){let O=r.newAttributes;for(let V=0,k=O.length;V<k;V++)O[V]=0}function g(O){m(O,0)}function m(O,V){let k=r.newAttributes,P=r.enabledAttributes,U=r.attributeDivisors;k[O]=1,P[O]===0&&(i.enableVertexAttribArray(O),P[O]=1),U[O]!==V&&(i.vertexAttribDivisor(O,V),U[O]=V)}function C(){let O=r.newAttributes,V=r.enabledAttributes;for(let k=0,P=V.length;k<P;k++)V[k]!==O[k]&&(i.disableVertexAttribArray(k),V[k]=0)}function L(O,V,k,P,U,Y,J){J===!0?i.vertexAttribIPointer(O,V,k,U,Y):i.vertexAttribPointer(O,V,k,P,U,Y)}function S(O,V,k,P){v();let U=P.attributes,Y=k.getAttributes(),J=V.defaultAttributeValues;for(let ot in Y){let j=Y[ot];if(j.location>=0){let st=U[ot];if(st===void 0&&(ot==="instanceMatrix"&&O.instanceMatrix&&(st=O.instanceMatrix),ot==="instanceColor"&&O.instanceColor&&(st=O.instanceColor)),st!==void 0){let lt=st.normalized,Dt=st.itemSize,At=t.get(st);if(At===void 0)continue;let ae=At.buffer,ne=At.type,wt=At.bytesPerElement,w=ne===i.INT||ne===i.UNSIGNED_INT||st.gpuType===Ko;if(st.isInterleavedBufferAttribute){let I=st.data,X=I.stride,K=st.offset;if(I.isInstancedInterleavedBuffer){for(let rt=0;rt<j.locationSize;rt++)m(j.location+rt,I.meshPerAttribute);O.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=I.meshPerAttribute*I.count)}else for(let rt=0;rt<j.locationSize;rt++)g(j.location+rt);i.bindBuffer(i.ARRAY_BUFFER,ae);for(let rt=0;rt<j.locationSize;rt++)L(j.location+rt,Dt/j.locationSize,ne,lt,X*wt,(K+Dt/j.locationSize*rt)*wt,w)}else{if(st.isInstancedBufferAttribute){for(let I=0;I<j.locationSize;I++)m(j.location+I,st.meshPerAttribute);O.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=st.meshPerAttribute*st.count)}else for(let I=0;I<j.locationSize;I++)g(j.location+I);i.bindBuffer(i.ARRAY_BUFFER,ae);for(let I=0;I<j.locationSize;I++)L(j.location+I,Dt/j.locationSize,ne,lt,Dt*wt,Dt/j.locationSize*I*wt,w)}}else if(J!==void 0){let lt=J[ot];if(lt!==void 0)switch(lt.length){case 2:i.vertexAttrib2fv(j.location,lt);break;case 3:i.vertexAttrib3fv(j.location,lt);break;case 4:i.vertexAttrib4fv(j.location,lt);break;default:i.vertexAttrib1fv(j.location,lt)}}}}C()}function T(){R();for(let O in n){let V=n[O];for(let k in V){let P=V[k];for(let U in P){let Y=P[U];for(let J in Y)h(Y[J].object),delete Y[J];delete P[U]}}delete n[O]}}function A(O){if(n[O.id]===void 0)return;let V=n[O.id];for(let k in V){let P=V[k];for(let U in P){let Y=P[U];for(let J in Y)h(Y[J].object),delete Y[J];delete P[U]}}delete n[O.id]}function N(O){for(let V in n){let k=n[V];for(let P in k){let U=k[P];if(U[O.id]===void 0)continue;let Y=U[O.id];for(let J in Y)h(Y[J].object),delete Y[J];delete U[O.id]}}}function y(O){for(let V in n){let k=n[V],P=O.isInstancedMesh===!0?O.id:0,U=k[P];if(U!==void 0){for(let Y in U){let J=U[Y];for(let ot in J)h(J[ot].object),delete J[ot];delete U[Y]}delete k[P],Object.keys(k).length===0&&delete n[V]}}}function R(){F(),a=!0,r!==s&&(r=s,c(r.object))}function F(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:R,resetDefaultState:F,dispose:T,releaseStatesOfGeometry:A,releaseStatesOfObject:y,releaseStatesOfProgram:N,initAttributes:v,enableAttribute:g,disableUnusedAttributes:C}}function n_(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function i_(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let N=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(N.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(N){return!(N!==ei&&n.convert(N)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(N){let y=N===fi&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(N!==zn&&N!==ti&&!y&&n.convert(N)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(N){if(N==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";N="mediump"}return N==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(le("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let p=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&le("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),C=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),S=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),T=i.getParameter(i.MAX_SAMPLES),A=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:p,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:_,maxTextureSize:v,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:C,maxVaryings:L,maxFragmentUniforms:S,maxSamples:T,samples:A}}function s_(i){let t=this,e=null,n=0,s=!1,r=!1,a=new Ln,o=new xe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(p,u){let f=p.length!==0||u||n!==0||s;return s=u,n=p.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(p,u){e=h(p,u,0)},this.setState=function(p,u,f){let _=p.clippingPlanes,v=p.clipIntersection,g=p.clipShadows,m=i.get(p);if(!s||_===null||_.length===0||r&&!g)r?h(null):c();else{let C=r?0:n,L=C*4,S=m.clippingState||null;l.value=S,S=h(_,u,L,f);for(let T=0;T!==L;++T)S[T]=e[T];m.clippingState=S,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=C}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(p,u,f,_){let v=p!==null?p.length:0,g=null;if(v!==0){if(g=l.value,_!==!0||g===null){let m=f+v*4,C=u.matrixWorldInverse;o.getNormalMatrix(C),(g===null||g.length<m)&&(g=new Float32Array(m));for(let L=0,S=f;L!==v;++L,S+=4)a.copy(p[L]).applyMatrix4(C,o),a.normal.toArray(g,S),g[S+3]=a.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,g}}var Ar=4,r_=6,a_=20,o_=256,Ta=new xr,kd=new fe,wh=null,Th=0,Ch=0,Rh=!1,l_=new z,Ps=new z,kl=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=l_}=r;wh=this._renderer.getRenderTarget(),Th=this._renderer.getActiveCubeFace(),Ch=this._renderer.getActiveMipmapLevel(),Rh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Hd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Gd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(wh,Th,Ch),this._renderer.xr.enabled=Rh,t.scissorTest=!1,Er(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===rs||t.mapping===Ts?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),wh=this._renderer.getRenderTarget(),Th=this._renderer.getActiveCubeFace(),Ch=this._renderer.getActiveMipmapLevel(),Rh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:wn,minFilter:wn,generateMipmaps:!1,type:fi,format:ei,colorSpace:$r,depthBuffer:!1},s=Vd(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Vd(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=c_(r)),this._blurMaterial=u_(r,t,e),this._ggxMaterial=h_(r,t,e)}return s}_compileMaterial(t){let e=new ze(new Ze,t);this._renderer.compile(e,Ta)}_sceneToCubeUV(t,e,n,s,r){let l=new dn(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],p=this._renderer,u=p.autoClear,f=p.toneMapping;p.getClearColor(kd),p.toneMapping=ui,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(s),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ze(new qn,new Bn({name:"PMREM.Background",side:Dn,depthWrite:!1,depthTest:!1})));let v=this._backgroundBox,g=v.material,m=!1,C=t.background;C?C.isColor&&(g.color.copy(C),t.background=null,m=!0):(g.color.copy(kd),m=!0);for(let L=0;L<6;L++){let S=L%3;S===0?(l.up.set(0,c[L],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[L],r.y,r.z)):S===1?(l.up.set(0,0,c[L]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[L],r.z)):(l.up.set(0,c[L],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[L]));let T=this._cubeSize;Er(s,S*T,L>2?T:0,T,T),p.setRenderTarget(s),m&&p.render(v,l),p.render(t,l)}p.toneMapping=f,p.autoClear=u,t.background=C}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===rs||t.mapping===Ts;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Hd()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Gd());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let l=this._cubeSize;Er(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,Ta)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),p=Math.sqrt(c*c-h*h),u=c*1.25,f=p*u,{_lodMax:_}=this,v=this._sizeLods[n],g=3*v*(n>_-Ar?n-_+Ar:0),m=4*(this._cubeSize-v);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=_-e,Er(r,g,m,3*v,2*v),s.setRenderTarget(r),s.render(o,Ta),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=_-n,Er(t,g,m,3*v,2*v),s.setRenderTarget(t),s.render(o,Ta)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],p=3*h*(s>this._lodMax-Ar?s-this._lodMax+Ar:0),u=4*(this._cubeSize-h);Er(e,p,u,3*h,2*h),a.setRenderTarget(e),a.render(l,Ta)}};function c_(i){let t=[],e=[],n=i,s=i-Ar+1+r_;for(let r=0;r<s;r++){let a=Math.pow(2,n);t.push(a);let o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],p=6,u=6,f=3,_=new Float32Array(f*u*p),v=new Float32Array(f*u*p);for(let m=0;m<p;m++){let C=m%3*2/3-1,L=m>2?0:-1,S=[C,L,0,C+2/3,L,0,C+2/3,L+1,0,C,L,0,C+2/3,L+1,0,C,L+1,0];_.set(S,f*u*m);for(let T=0;T<u;T++){let A=h[T*2]*2-1,N=h[T*2+1]*2-1;m===0?Ps.set(1,N,A):m===1?Ps.set(-A,1,-N):m===2?Ps.set(-A,N,1):m===3?Ps.set(-1,N,-A):m===4?Ps.set(-A,-1,N):Ps.set(A,N,-1),Ps.toArray(v,(m*u+T)*f)}}let g=new Ze;g.setAttribute("position",new Wn(_,f)),g.setAttribute("outputDirection",new Wn(v,f)),e.push(new ze(g,null)),n>Ar&&n--}return{lodMeshes:e,sizeLods:t}}function Vd(i,t,e){let n=new On(i,t,e);return n.texture.mapping=va,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Er(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function h_(i,t,e){return new Yn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:o_,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Gl(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:yi,depthTest:!1,depthWrite:!1})}function u_(i,t,e){return new Yn({name:"SphericalGaussianBlur",defines:{SAMPLES:a_,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Gl(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:yi,depthTest:!1,depthWrite:!1})}function Gd(){return new Yn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Gl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:yi,depthTest:!1,depthWrite:!1})}function Hd(){return new Yn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Gl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:yi,depthTest:!1,depthWrite:!1})}function Gl(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Vl=class extends On{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new ea(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new qn(5,5,5),r=new Yn({name:"CubemapFromEquirect",uniforms:Rs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Dn,blending:yi});r.uniforms.tEquirect.value=e;let a=new ze(s,r),o=e.minFilter;return e.minFilter===as&&(e.minFilter=wn),new qo(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}};function d_(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Zo||f===Jo)if(t.has(u)){let _=t.get(u).texture;return o(_,u.mapping)}else{let _=u.image;if(_&&_.height>0){let v=new Vl(_.height);return v.fromEquirectangularTexture(i,u),t.set(u,v),u.addEventListener("dispose",c),o(v.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,_=f===Zo||f===Jo,v=f===rs||f===Ts;if(_||v){let g=e.get(u),m=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new kl(i)),g=_?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),g.texture;if(g!==void 0)return g.texture;{let C=u.image;return _&&C&&C.height>0||v&&C&&l(C)?(n===null&&(n=new kl(i)),g=_?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===Zo?u.mapping=rs:f===Jo&&(u.mapping=Ts),u}function l(u){let f=0,_=6;for(let v=0;v<_;v++)u[v]!==void 0&&f++;return f===_}function c(u){let f=u.target;f.removeEventListener("dispose",c);let _=t.get(f);_!==void 0&&(t.delete(f),_.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let _=e.get(f);_!==void 0&&(e.delete(f),_.dispose())}function p(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:p}}function f_(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&xs("WebGLRenderer: "+n+" extension not supported."),s}}}function p_(i,t,e,n){let s={},r=new WeakMap;function a(p){let u=p.target;u.index!==null&&t.remove(u.index);for(let _ in u.attributes)t.remove(u.attributes[_]);u.removeEventListener("dispose",a),delete s[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(p,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,e.memory.geometries++),u}function l(p){let u=p.attributes;for(let f in u)t.update(u[f],i.ARRAY_BUFFER)}function c(p){let u=[],f=p.index,_=p.attributes.position,v=0;if(_===void 0)return;if(f!==null){let C=f.array;v=f.version;for(let L=0,S=C.length;L<S;L+=3){let T=C[L+0],A=C[L+1],N=C[L+2];u.push(T,A,A,N,N,T)}}else{let C=_.array;v=_.version;for(let L=0,S=C.length/3-1;L<S;L+=3){let T=L+0,A=L+1,N=L+2;u.push(T,A,A,N,N,T)}}let g=new(_.count>=65535?Kr:jr)(u,1);g.version=v;let m=r.get(p);m&&t.remove(m),r.set(p,g)}function h(p){let u=r.get(p);if(u){let f=p.index;f!==null&&u.version<f.version&&c(p)}else c(p);return r.get(p)}return{get:o,update:l,getWireframeAttribute:h}}function m_(i,t,e){let n;function s(p){n=p}let r,a;function o(p){r=p.type,a=p.bytesPerElement}function l(p,u){i.drawElements(n,u,r,p*a),e.update(u,n,1)}function c(p,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,p*a,f),e.update(u,n,f))}function h(p,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,p,0,f);let v=0;for(let g=0;g<f;g++)v+=u[g];e.update(v,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function g_(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:de("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function __(i,t,e){let n=new WeakMap,s=new tn;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,p=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==p){let R=function(){N.dispose(),n.delete(o),o.removeEventListener("dispose",R)};u!==void 0&&u.texture.dispose();let f=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],C=o.morphAttributes.color||[],L=0;f===!0&&(L=1),_===!0&&(L=2),v===!0&&(L=3);let S=o.attributes.position.count*L,T=1;S>t.maxTextureSize&&(T=Math.ceil(S/t.maxTextureSize),S=t.maxTextureSize);let A=new Float32Array(S*T*4*p),N=new Jr(A,S,T,p);N.type=ti,N.needsUpdate=!0;let y=L*4;for(let F=0;F<p;F++){let O=g[F],V=m[F],k=C[F],P=S*T*4*F;for(let U=0;U<O.count;U++){let Y=U*y;f===!0&&(s.fromBufferAttribute(O,U),A[P+Y+0]=s.x,A[P+Y+1]=s.y,A[P+Y+2]=s.z,A[P+Y+3]=0),_===!0&&(s.fromBufferAttribute(V,U),A[P+Y+4]=s.x,A[P+Y+5]=s.y,A[P+Y+6]=s.z,A[P+Y+7]=0),v===!0&&(s.fromBufferAttribute(k,U),A[P+Y+8]=s.x,A[P+Y+9]=s.y,A[P+Y+10]=s.z,A[P+Y+11]=k.itemSize===4?s.w:1)}}u={count:p,texture:N,size:new bt(S,T)},n.set(o,u),o.addEventListener("dispose",R)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let f=0;for(let v=0;v<c.length;v++)f+=c[v];let _=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function x_(i,t,e,n,s){let r=new WeakMap;function a(c){let h=s.render.frame,p=c.geometry,u=t.get(c,p);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var v_={[Qc]:"LINEAR_TONE_MAPPING",[th]:"REINHARD_TONE_MAPPING",[eh]:"CINEON_TONE_MAPPING",[nh]:"ACES_FILMIC_TONE_MAPPING",[sh]:"AGX_TONE_MAPPING",[rh]:"NEUTRAL_TONE_MAPPING",[ih]:"CUSTOM_TONE_MAPPING"};function y_(i,t,e,n,s,r){let a=new On(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new Ze;c.setAttribute("position",new _e([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new _e([0,2,0,0,2,0],2));let h=new Do({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),p=new ze(c,h),u=new xr(-1,1,1,-1,0,1),f=null,_=null,v=!1,g,m=null,C=[],L=!1;this.setSize=function(S,T){a.setSize(S,T),o!==null&&o.setSize(S,T),l!==null&&l.setSize(S,T);for(let A=0;A<C.length;A++){let N=C[A];N.setSize&&N.setSize(S,T)}},this.setEffects=function(S){C=S,L=C.length>0&&C[0].isRenderPass===!0;let T=a.width,A=a.height;C.length>0&&o===null&&(o=new On(T,A,{type:fi,depthBuffer:!1,stencilBuffer:!1}),l=new On(T,A,{type:fi,depthBuffer:!1,stencilBuffer:!1}));for(let N=0;N<C.length;N++){let y=C[N];y.setSize&&y.setSize(T,A)}},this.begin=function(S,T){if(v||S.toneMapping===ui&&C.length===0)return!1;if(m=T,T!==null){let A=T.width,N=T.height;(a.width!==A||a.height!==N)&&this.setSize(A,N)}return L===!1&&S.setRenderTarget(a),g=S.toneMapping,S.toneMapping=ui,!0},this.hasRenderPass=function(){return L},this.end=function(S,T){S.toneMapping=g,v=!0;let A=a,N=o;for(let y=0;y<C.length;y++){let R=C[y];R.enabled!==!1&&(R.render(S,N,A,T),R.needsSwap!==!1&&(A=N,N=N===o?l:o))}if(f!==S.outputColorSpace||_!==S.toneMapping){f=S.outputColorSpace,_=S.toneMapping,h.defines={},De.getTransfer(f)===Xe&&(h.defines.SRGB_TRANSFER="");let y=v_[_];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=A.texture,S.setRenderTarget(m),S.render(p,u),m=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var hf=new Fn,Lh=new Ji(1,1),uf=new Jr,df=new bo,ff=new ea,Wd=[],Xd=[],qd=new Float32Array(16),$d=new Float32Array(9),Yd=new Float32Array(4);function Cr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Wd[s];if(r===void 0&&(r=new Float32Array(s),Wd[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function pn(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function mn(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Hl(i,t){let e=Xd[t];e===void 0&&(e=new Int32Array(t),Xd[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function M_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function b_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(pn(e,t))return;i.uniform2fv(this.addr,t),mn(e,t)}}function S_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(pn(e,t))return;i.uniform3fv(this.addr,t),mn(e,t)}}function E_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(pn(e,t))return;i.uniform4fv(this.addr,t),mn(e,t)}}function A_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(pn(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),mn(e,t)}else{if(pn(e,n))return;Yd.set(n),i.uniformMatrix2fv(this.addr,!1,Yd),mn(e,n)}}function w_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(pn(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),mn(e,t)}else{if(pn(e,n))return;$d.set(n),i.uniformMatrix3fv(this.addr,!1,$d),mn(e,n)}}function T_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(pn(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),mn(e,t)}else{if(pn(e,n))return;qd.set(n),i.uniformMatrix4fv(this.addr,!1,qd),mn(e,n)}}function C_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function R_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(pn(e,t))return;i.uniform2iv(this.addr,t),mn(e,t)}}function P_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(pn(e,t))return;i.uniform3iv(this.addr,t),mn(e,t)}}function I_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(pn(e,t))return;i.uniform4iv(this.addr,t),mn(e,t)}}function L_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function D_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(pn(e,t))return;i.uniform2uiv(this.addr,t),mn(e,t)}}function N_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(pn(e,t))return;i.uniform3uiv(this.addr,t),mn(e,t)}}function U_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(pn(e,t))return;i.uniform4uiv(this.addr,t),mn(e,t)}}function F_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Lh.compareFunction=e.isReversedDepthBuffer()?Ol:Fl,r=Lh):r=hf,e.setTexture2D(t||r,s)}function O_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||df,s)}function B_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||ff,s)}function z_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||uf,s)}function k_(i){switch(i){case 5126:return M_;case 35664:return b_;case 35665:return S_;case 35666:return E_;case 35674:return A_;case 35675:return w_;case 35676:return T_;case 5124:case 35670:return C_;case 35667:case 35671:return R_;case 35668:case 35672:return P_;case 35669:case 35673:return I_;case 5125:return L_;case 36294:return D_;case 36295:return N_;case 36296:return U_;case 35678:case 36198:case 36298:case 36306:case 35682:return F_;case 35679:case 36299:case 36307:return O_;case 35680:case 36300:case 36308:case 36293:return B_;case 36289:case 36303:case 36311:case 36292:return z_}}function V_(i,t){i.uniform1fv(this.addr,t)}function G_(i,t){let e=Cr(t,this.size,2);i.uniform2fv(this.addr,e)}function H_(i,t){let e=Cr(t,this.size,3);i.uniform3fv(this.addr,e)}function W_(i,t){let e=Cr(t,this.size,4);i.uniform4fv(this.addr,e)}function X_(i,t){let e=Cr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function q_(i,t){let e=Cr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function $_(i,t){let e=Cr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Y_(i,t){i.uniform1iv(this.addr,t)}function Z_(i,t){i.uniform2iv(this.addr,t)}function J_(i,t){i.uniform3iv(this.addr,t)}function j_(i,t){i.uniform4iv(this.addr,t)}function K_(i,t){i.uniform1uiv(this.addr,t)}function Q_(i,t){i.uniform2uiv(this.addr,t)}function tx(i,t){i.uniform3uiv(this.addr,t)}function ex(i,t){i.uniform4uiv(this.addr,t)}function nx(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);pn(n,r)||(i.uniform1iv(this.addr,r),mn(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=Lh:a=hf;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function ix(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);pn(n,r)||(i.uniform1iv(this.addr,r),mn(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||df,r[a])}function sx(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);pn(n,r)||(i.uniform1iv(this.addr,r),mn(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||ff,r[a])}function rx(i,t,e){let n=this.cache,s=t.length,r=Hl(e,s);pn(n,r)||(i.uniform1iv(this.addr,r),mn(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||uf,r[a])}function ax(i){switch(i){case 5126:return V_;case 35664:return G_;case 35665:return H_;case 35666:return W_;case 35674:return X_;case 35675:return q_;case 35676:return $_;case 5124:case 35670:return Y_;case 35667:case 35671:return Z_;case 35668:case 35672:return J_;case 35669:case 35673:return j_;case 5125:return K_;case 36294:return Q_;case 36295:return tx;case 36296:return ex;case 35678:case 36198:case 36298:case 36306:case 35682:return nx;case 35679:case 36299:case 36307:return ix;case 35680:case 36300:case 36308:case 36293:return sx;case 36289:case 36303:case 36311:case 36292:return rx}}var Dh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=k_(e.type)}},Nh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=ax(e.type)}},Uh=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},Ph=/(\w+)(\])?(\[|\.)?/g;function Zd(i,t){i.seq.push(t),i.map[t.id]=t}function ox(i,t,e){let n=i.name,s=n.length;for(Ph.lastIndex=0;;){let r=Ph.exec(n),a=Ph.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Zd(e,c===void 0?new Dh(o,i,t):new Nh(o,i,t));break}else{let p=e.map[o];p===void 0&&(p=new Uh(o),Zd(e,p)),e=p}}}var wr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);ox(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function Jd(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var lx=37297,cx=0;function hx(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var jd=new xe;function ux(i){De._getMatrix(jd,De.workingColorSpace,i);let t=`mat3( ${jd.elements.map(e=>e.toFixed(4))} )`;switch(De.getTransfer(i)){case Yr:return[t,"LinearTransferOETF"];case Xe:return[t,"sRGBTransferOETF"];default:return le("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Kd(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+hx(i.getShaderSource(t),o)}else return r}function dx(i,t){let e=ux(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var fx={[Qc]:"Linear",[th]:"Reinhard",[eh]:"Cineon",[nh]:"ACESFilmic",[sh]:"AgX",[rh]:"Neutral",[ih]:"Custom"};function px(i,t){let e=fx[t];return e===void 0?(le("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var zl=new z;function mx(){De.getLuminanceCoefficients(zl);let i=zl.x.toFixed(4),t=zl.y.toFixed(4),e=zl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function gx(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ra).join(`
`)}function _x(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function xx(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Ra(i){return i!==""}function Qd(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function tf(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var vx=/^[ \t]*#include +<([\w\d./]+)>/gm;function Fh(i){return i.replace(vx,Mx)}var yx=new Map;function Mx(i,t){let e=Ae[t];if(e===void 0){let n=yx.get(t);if(n!==void 0)e=Ae[n],le('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Fh(e)}var bx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ef(i){return i.replace(bx,Sx)}function Sx(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function nf(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var Ex={[xa]:"SHADOWMAP_TYPE_PCF",[yr]:"SHADOWMAP_TYPE_VSM"};function Ax(i){return Ex[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var wx={[rs]:"ENVMAP_TYPE_CUBE",[Ts]:"ENVMAP_TYPE_CUBE",[va]:"ENVMAP_TYPE_CUBE_UV"};function Tx(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":wx[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var Cx={[Ts]:"ENVMAP_MODE_REFRACTION"};function Rx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Cx[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Px={[Kc]:"ENVMAP_BLENDING_MULTIPLY",[md]:"ENVMAP_BLENDING_MIX",[gd]:"ENVMAP_BLENDING_ADD"};function Ix(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Px[i.combine]||"ENVMAP_BLENDING_NONE"}function Lx(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Dx(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=Ax(e),c=Tx(e),h=Rx(e),p=Ix(e),u=Lx(e),f=gx(e),_=_x(r),v=s.createProgram(),g,m,C=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ra).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ra).join(`
`),m.length>0&&(m+=`
`)):(g=[nf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ra).join(`
`),m=[nf(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+p:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==ui?"#define TONE_MAPPING":"",e.toneMapping!==ui?Ae.tonemapping_pars_fragment:"",e.toneMapping!==ui?px("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Ae.colorspace_pars_fragment,dx("linearToOutputTexel",e.outputColorSpace),mx(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ra).join(`
`)),a=Fh(a),a=Qd(a,e),a=tf(a,e),o=Fh(o),o=Qd(o,e),o=tf(o,e),a=ef(a),o=ef(o),e.isRawShaderMaterial!==!0&&(C=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===fh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===fh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let L=C+g+a,S=C+m+o,T=Jd(s,s.VERTEX_SHADER,L),A=Jd(s,s.FRAGMENT_SHADER,S);s.attachShader(v,T),s.attachShader(v,A),e.index0AttributeName!==void 0?s.bindAttribLocation(v,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(v,0,"position"),s.linkProgram(v);function N(O){if(i.debug.checkShaderErrors){let V=s.getProgramInfoLog(v)||"",k=s.getShaderInfoLog(T)||"",P=s.getShaderInfoLog(A)||"",U=V.trim(),Y=k.trim(),J=P.trim(),ot=!0,j=!0;if(s.getProgramParameter(v,s.LINK_STATUS)===!1)if(ot=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,v,T,A);else{let st=Kd(s,T,"vertex"),lt=Kd(s,A,"fragment");de("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(v,s.VALIDATE_STATUS)+`

Material Name: `+O.name+`
Material Type: `+O.type+`

Program Info Log: `+U+`
`+st+`
`+lt)}else U!==""?le("WebGLProgram: Program Info Log:",U):(Y===""||J==="")&&(j=!1);j&&(O.diagnostics={runnable:ot,programLog:U,vertexShader:{log:Y,prefix:g},fragmentShader:{log:J,prefix:m}})}s.deleteShader(T),s.deleteShader(A),y=new wr(s,v),R=xx(s,v)}let y;this.getUniforms=function(){return y===void 0&&N(this),y};let R;this.getAttributes=function(){return R===void 0&&N(this),R};let F=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return F===!1&&(F=s.getProgramParameter(v,lx)),F},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=cx++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=T,this.fragmentShader=A,this}var Nx=0,Oh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Bh(t),e.set(t,n)),n}},Bh=class{constructor(t){this.id=Nx++,this.code=t,this.usedTimes=0}};function Ux(i){return i===ls||i===Aa||i===wa}function Fx(i,t,e,n,s,r){let a=new dr,o=new Oh,l=new Set,c=[],h=new Map,p=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(y){return l.add(y),y===0?"uv":`uv${y}`}function v(y,R,F,O,V,k){let P=O.fog,U=V.geometry,Y=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?O.environment:null,J=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,ot=t.get(y.envMap||Y,J),j=ot&&ot.mapping===va?ot.image.height:null,st=f[y.type];y.precision!==null&&(u=n.getMaxPrecision(y.precision),u!==y.precision&&le("WebGLProgram.getParameters:",y.precision,"not supported, using",u,"instead."));let lt=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,Dt=lt!==void 0?lt.length:0,At=0;U.morphAttributes.position!==void 0&&(At=1),U.morphAttributes.normal!==void 0&&(At=2),U.morphAttributes.color!==void 0&&(At=3);let ae,ne,wt,w;if(st){let Te=bi[st];ae=Te.vertexShader,ne=Te.fragmentShader}else{ae=y.vertexShader,ne=y.fragmentShader;let Te=o.getVertexShaderStage(y),Ie=o.getFragmentShaderStage(y);o.update(y,Te,Ie),wt=Te.id,w=Ie.id}let I=i.getRenderTarget(),X=i.state.buffers.depth.getReversed(),K=V.isInstancedMesh===!0,rt=V.isBatchedMesh===!0,yt=!!y.map,ie=!!y.matcap,at=!!ot,dt=!!y.aoMap,ht=!!y.lightMap,xt=!!y.bumpMap&&y.wireframe===!1,Pt=!!y.normalMap,Xt=!!y.displacementMap,ee=!!y.emissiveMap,oe=!!y.metalnessMap,he=!!y.roughnessMap,B=y.anisotropy>0,we=y.clearcoat>0,ye=y.dispersion>0,D=y.retroreflectivity>0,x=y.iridescence>0,H=y.sheen>0,Q=y.transmission>0,et=B&&!!y.anisotropyMap,Et=we&&!!y.clearcoatMap,Rt=we&&!!y.clearcoatNormalMap,ut=we&&!!y.clearcoatRoughnessMap,ft=x&&!!y.iridescenceMap,mt=x&&!!y.iridescenceThicknessMap,jt=H&&!!y.sheenColorMap,St=H&&!!y.sheenRoughnessMap,Lt=!!y.specularMap,$t=!!y.specularColorMap,Wt=!!y.specularIntensityMap,ce=Q&&!!y.transmissionMap,q=Q&&!!y.thicknessMap,It=!!y.gradientMap,pt=!!y.alphaMap,Nt=y.alphaTest>0,Ut=!!y.alphaHash,_t=!!y.extensions,Kt=ui;y.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(Kt=i.toneMapping);let Zt={shaderID:st,shaderType:y.type,shaderName:y.name,vertexShader:ae,fragmentShader:ne,defines:y.defines,customVertexShaderID:wt,customFragmentShaderID:w,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:u,batching:rt,batchingColor:rt&&V._colorsTexture!==null,instancing:K,instancingColor:K&&V.instanceColor!==null,instancingMorph:K&&V.morphTexture!==null,outputColorSpace:I===null?i.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:De.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:yt,matcap:ie,envMap:at,envMapMode:at&&ot.mapping,envMapCubeUVHeight:j,aoMap:dt,lightMap:ht,bumpMap:xt,normalMap:Pt,displacementMap:Xt,emissiveMap:ee,normalMapObjectSpace:Pt&&y.normalMapType===vd,normalMapTangentSpace:Pt&&y.normalMapType===Ul,packedNormalMap:Pt&&y.normalMapType===Ul&&Ux(y.normalMap.format),metalnessMap:oe,roughnessMap:he,anisotropy:B,anisotropyMap:et,clearcoat:we,clearcoatMap:Et,clearcoatNormalMap:Rt,clearcoatRoughnessMap:ut,dispersion:ye,retroreflection:D,iridescence:x,iridescenceMap:ft,iridescenceThicknessMap:mt,sheen:H,sheenColorMap:jt,sheenRoughnessMap:St,specularMap:Lt,specularColorMap:$t,specularIntensityMap:Wt,transmission:Q,transmissionMap:ce,thicknessMap:q,gradientMap:It,opaque:y.transparent===!1&&y.blending===Mr&&y.alphaToCoverage===!1,alphaMap:pt,alphaTest:Nt,alphaHash:Ut,combine:y.combine,mapUv:yt&&_(y.map.channel),aoMapUv:dt&&_(y.aoMap.channel),lightMapUv:ht&&_(y.lightMap.channel),bumpMapUv:xt&&_(y.bumpMap.channel),normalMapUv:Pt&&_(y.normalMap.channel),displacementMapUv:Xt&&_(y.displacementMap.channel),emissiveMapUv:ee&&_(y.emissiveMap.channel),metalnessMapUv:oe&&_(y.metalnessMap.channel),roughnessMapUv:he&&_(y.roughnessMap.channel),anisotropyMapUv:et&&_(y.anisotropyMap.channel),clearcoatMapUv:Et&&_(y.clearcoatMap.channel),clearcoatNormalMapUv:Rt&&_(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ut&&_(y.clearcoatRoughnessMap.channel),iridescenceMapUv:ft&&_(y.iridescenceMap.channel),iridescenceThicknessMapUv:mt&&_(y.iridescenceThicknessMap.channel),sheenColorMapUv:jt&&_(y.sheenColorMap.channel),sheenRoughnessMapUv:St&&_(y.sheenRoughnessMap.channel),specularMapUv:Lt&&_(y.specularMap.channel),specularColorMapUv:$t&&_(y.specularColorMap.channel),specularIntensityMapUv:Wt&&_(y.specularIntensityMap.channel),transmissionMapUv:ce&&_(y.transmissionMap.channel),thicknessMapUv:q&&_(y.thicknessMap.channel),alphaMapUv:pt&&_(y.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(Pt||B),vertexNormals:!!U.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!U.attributes.uv&&(yt||pt),fog:!!P,useFog:y.fog===!0,fogExp2:!!P&&P.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||U.attributes.normal===void 0&&Pt===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:X,skinning:V.isSkinnedMesh===!0,hasPositionAttribute:U.attributes.position!==void 0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:Dt,morphTextureStride:At,numSunLights:R.sun.length,numDirLights:R.directional.length,numPointLights:R.point.length,numSpotLights:R.spot.length,numSpotLightMaps:R.spotLightMap.length,numRectAreaLights:R.rectArea.length,numHemiLights:R.hemi.length,numSunLightShadows:R.sunShadowMap.length,numDirLightShadows:R.directionalShadowMap.length,numPointLightShadows:R.pointShadowMap.length,numSpotLightShadows:R.spotShadowMap.length,numSpotLightShadowsWithMaps:R.numSpotLightShadowsWithMaps,numLightProbes:R.numLightProbes,numLightProbeGrids:k.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&F.length>0,shadowMapType:i.shadowMap.type,toneMapping:Kt,decodeVideoTexture:yt&&y.map.isVideoTexture===!0&&De.getTransfer(y.map.colorSpace)===Xe,decodeVideoTextureEmissive:ee&&y.emissiveMap.isVideoTexture===!0&&De.getTransfer(y.emissiveMap.colorSpace)===Xe,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===on,flipSided:y.side===Dn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:_t&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(_t&&y.extensions.multiDraw===!0||rt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Zt.vertexUv1s=l.has(1),Zt.vertexUv2s=l.has(2),Zt.vertexUv3s=l.has(3),l.clear(),Zt}function g(y){let R=[];if(y.shaderID?R.push(y.shaderID):(R.push(y.customVertexShaderID),R.push(y.customFragmentShaderID)),y.defines!==void 0)for(let F in y.defines)R.push(F),R.push(y.defines[F]);return y.isRawShaderMaterial===!1&&(m(R,y),C(R,y),R.push(i.outputColorSpace)),R.push(y.customProgramCacheKey),R.join()}function m(y,R){y.push(R.precision),y.push(R.outputColorSpace),y.push(R.envMapMode),y.push(R.envMapCubeUVHeight),y.push(R.mapUv),y.push(R.alphaMapUv),y.push(R.lightMapUv),y.push(R.aoMapUv),y.push(R.bumpMapUv),y.push(R.normalMapUv),y.push(R.displacementMapUv),y.push(R.emissiveMapUv),y.push(R.metalnessMapUv),y.push(R.roughnessMapUv),y.push(R.anisotropyMapUv),y.push(R.clearcoatMapUv),y.push(R.clearcoatNormalMapUv),y.push(R.clearcoatRoughnessMapUv),y.push(R.iridescenceMapUv),y.push(R.iridescenceThicknessMapUv),y.push(R.sheenColorMapUv),y.push(R.sheenRoughnessMapUv),y.push(R.specularMapUv),y.push(R.specularColorMapUv),y.push(R.specularIntensityMapUv),y.push(R.transmissionMapUv),y.push(R.thicknessMapUv),y.push(R.combine),y.push(R.fogExp2),y.push(R.sizeAttenuation),y.push(R.morphTargetsCount),y.push(R.morphAttributeCount),y.push(R.numSunLights),y.push(R.numDirLights),y.push(R.numPointLights),y.push(R.numSpotLights),y.push(R.numSpotLightMaps),y.push(R.numHemiLights),y.push(R.numRectAreaLights),y.push(R.numSunLightShadows),y.push(R.numDirLightShadows),y.push(R.numPointLightShadows),y.push(R.numSpotLightShadows),y.push(R.numSpotLightShadowsWithMaps),y.push(R.numLightProbes),y.push(R.shadowMapType),y.push(R.toneMapping),y.push(R.numClippingPlanes),y.push(R.numClipIntersection),y.push(R.depthPacking)}function C(y,R){a.disableAll(),R.instancing&&a.enable(0),R.instancingColor&&a.enable(1),R.instancingMorph&&a.enable(2),R.matcap&&a.enable(3),R.envMap&&a.enable(4),R.normalMapObjectSpace&&a.enable(5),R.normalMapTangentSpace&&a.enable(6),R.clearcoat&&a.enable(7),R.iridescence&&a.enable(8),R.alphaTest&&a.enable(9),R.vertexColors&&a.enable(10),R.vertexAlphas&&a.enable(11),R.vertexUv1s&&a.enable(12),R.vertexUv2s&&a.enable(13),R.vertexUv3s&&a.enable(14),R.vertexTangents&&a.enable(15),R.anisotropy&&a.enable(16),R.alphaHash&&a.enable(17),R.batching&&a.enable(18),R.dispersion&&a.enable(19),R.retroreflection&&a.enable(24),R.batchingColor&&a.enable(20),R.gradientMap&&a.enable(21),R.packedNormalMap&&a.enable(22),R.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),R.fog&&a.enable(0),R.useFog&&a.enable(1),R.flatShading&&a.enable(2),R.logarithmicDepthBuffer&&a.enable(3),R.reversedDepthBuffer&&a.enable(4),R.skinning&&a.enable(5),R.morphTargets&&a.enable(6),R.morphNormals&&a.enable(7),R.morphColors&&a.enable(8),R.premultipliedAlpha&&a.enable(9),R.shadowMapEnabled&&a.enable(10),R.doubleSided&&a.enable(11),R.flipSided&&a.enable(12),R.useDepthPacking&&a.enable(13),R.dithering&&a.enable(14),R.transmission&&a.enable(15),R.sheen&&a.enable(16),R.opaque&&a.enable(17),R.pointsUvs&&a.enable(18),R.decodeVideoTexture&&a.enable(19),R.decodeVideoTextureEmissive&&a.enable(20),R.alphaToCoverage&&a.enable(21),R.numLightProbeGrids>0&&a.enable(22),R.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function L(y){let R=f[y.type],F;if(R){let O=bi[R];F=Od.clone(O.uniforms)}else F=y.uniforms;return F}function S(y,R){let F=h.get(R);return F!==void 0?++F.usedTimes:(F=new Dx(i,R,y,s),c.push(F),h.set(R,F)),F}function T(y){if(--y.usedTimes===0){let R=c.indexOf(y);c[R]=c[c.length-1],c.pop(),h.delete(y.cacheKey),y.destroy()}}function A(y){o.remove(y)}function N(){o.dispose()}return{getParameters:v,getProgramCacheKey:g,getUniforms:L,acquireProgram:S,releaseProgram:T,releaseShaderCache:A,programs:c,dispose:N}}function Ox(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Bx(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function sf(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function rf(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,_,v,g,m){let C=i[t];return C===void 0?(C={id:u.id,object:u,geometry:f,material:_,materialVariant:a(u),groupOrder:v,renderOrder:u.renderOrder,z:g,group:m},i[t]=C):(C.id=u.id,C.object=u,C.geometry=f,C.material=_,C.materialVariant=a(u),C.groupOrder=v,C.renderOrder=u.renderOrder,C.z=g,C.group=m),t++,C}function l(u,f,_,v,g,m,C){C.reversedDepth===!0&&(g=-g);let L=o(u,f,_,v,g,m);_.transmission>0?n.push(L):_.transparent===!0?s.push(L):e.push(L)}function c(u,f,_,v,g,m){let C=o(u,f,_,v,g,m);_.transmission>0?n.unshift(C):_.transparent===!0?s.unshift(C):e.unshift(C)}function h(u,f){e.length>1&&e.sort(u||Bx),n.length>1&&n.sort(f||sf),s.length>1&&s.sort(f||sf)}function p(){for(let u=t,f=i.length;u<f;u++){let _=i[u];if(_.id===null)break;_.id=null,_.object=null,_.geometry=null,_.material=null,_.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:p,sort:h}}function zx(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new rf,i.set(n,[a])):s>=r.length?(a=new rf,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function kx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new z,color:new fe};break;case"SpotLight":e={position:new z,direction:new z,color:new fe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new z,color:new fe,distance:0,decay:0};break;case"HemisphereLight":e={direction:new z,skyColor:new fe,groundColor:new fe};break;case"RectAreaLight":e={color:new fe,position:new z,halfWidth:new z,halfHeight:new z};break}return i[t.id]=e,e}}}function Vx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var Gx=0;function Hx(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Wx(i){let t=new kx,e=Vx(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new z);let s=new z,r=new Ge,a=new Ge;function o(c){let h=0,p=0,u=0;for(let V=0;V<9;V++)n.probe[V].set(0,0,0);let f=0,_=0,v=0,g=0,m=0,C=0,L=0,S=0,T=0,A=0,N=0,y=0,R=0,F=0;c.sort(Hx);for(let V=0,k=c.length;V<k;V++){let P=c[V],U=P.color,Y=P.intensity,J=P.distance,ot=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===ls?ot=P.shadow.map.texture:ot=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)h+=U.r*Y,p+=U.g*Y,u+=U.b*Y;else if(P.isLightProbe){for(let j=0;j<9;j++)n.probe[j].addScaledVector(P.sh.coefficients[j],Y);F++}else if(P.isSunLight){let j=t.get(P);if(j.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let st=P.shadow,lt=e.get(P);lt.shadowIntensity=st.intensity,lt.shadowBias=st.bias,lt.shadowNormalBias=st.normalBias,lt.shadowRadius=st.radius,lt.shadowMapSize.copy(st.mapSize).multiply(st.getFrameExtents()),n.sunShadow[_]=lt,n.sunShadowMap[_]=ot;let Dt=st.getViewportCount();for(let At=0;At<Dt;At++)n.sunShadowMatrix[v+At]=st.getMatrix(At),n.sunShadowCascade[v+At]=st._cascadeData[At];v+=Dt,_++}n.sun[f]=j,f++}else if(P.isDirectionalLight){let j=t.get(P);if(j.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let st=P.shadow,lt=e.get(P);lt.shadowIntensity=st.intensity,lt.shadowBias=st.bias,lt.shadowNormalBias=st.normalBias,lt.shadowRadius=st.radius,lt.shadowMapSize=st.mapSize,n.directionalShadow[g]=lt,n.directionalShadowMap[g]=ot,n.directionalShadowMatrix[g]=P.shadow.matrix,T++}n.directional[g]=j,g++}else if(P.isSpotLight){let j=t.get(P);j.position.setFromMatrixPosition(P.matrixWorld),j.color.copy(U).multiplyScalar(Y),j.distance=J,j.coneCos=Math.cos(P.angle),j.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),j.decay=P.decay,n.spot[C]=j;let st=P.shadow;if(P.map&&(n.spotLightMap[y]=P.map,y++,st.updateMatrices(P),P.castShadow&&R++),n.spotLightMatrix[C]=st.matrix,P.castShadow){let lt=e.get(P);lt.shadowIntensity=st.intensity,lt.shadowBias=st.bias,lt.shadowNormalBias=st.normalBias,lt.shadowRadius=st.radius,lt.shadowMapSize=st.mapSize,n.spotShadow[C]=lt,n.spotShadowMap[C]=ot,N++}C++}else if(P.isRectAreaLight){let j=t.get(P);j.color.copy(U).multiplyScalar(Y),j.halfWidth.set(P.width*.5,0,0),j.halfHeight.set(0,P.height*.5,0),n.rectArea[L]=j,L++}else if(P.isPointLight){let j=t.get(P);if(j.color.copy(P.color).multiplyScalar(P.intensity),j.distance=P.distance,j.decay=P.decay,P.castShadow){let st=P.shadow,lt=e.get(P);lt.shadowIntensity=st.intensity,lt.shadowBias=st.bias,lt.shadowNormalBias=st.normalBias,lt.shadowRadius=st.radius,lt.shadowMapSize=st.mapSize,lt.shadowCameraNear=st.camera.near,lt.shadowCameraFar=st.camera.far,n.pointShadow[m]=lt,n.pointShadowMap[m]=ot,n.pointShadowMatrix[m]=P.shadow.matrix,A++}n.point[m]=j,m++}else if(P.isHemisphereLight){let j=t.get(P);j.skyColor.copy(P.color).multiplyScalar(Y),j.groundColor.copy(P.groundColor).multiplyScalar(Y),n.hemi[S]=j,S++}}L>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=zt.LTC_FLOAT_1,n.rectAreaLTC2=zt.LTC_FLOAT_2):(n.rectAreaLTC1=zt.LTC_HALF_1,n.rectAreaLTC2=zt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=p,n.ambient[2]=u;let O=n.hash;(O.sunLength!==f||O.directionalLength!==g||O.pointLength!==m||O.spotLength!==C||O.rectAreaLength!==L||O.hemiLength!==S||O.numSunShadows!==_||O.numDirectionalShadows!==T||O.numPointShadows!==A||O.numSpotShadows!==N||O.numSpotMaps!==y||O.numLightProbes!==F)&&(n.sun.length=f,n.directional.length=g,n.spot.length=C,n.rectArea.length=L,n.point.length=m,n.hemi.length=S,n.sunShadow.length=_,n.sunShadowMap.length=_,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.directionalShadowMatrix.length=T,n.pointShadow.length=A,n.pointShadowMap.length=A,n.pointShadowMatrix.length=A,n.spotShadow.length=N,n.spotShadowMap.length=N,n.spotLightMatrix.length=N+y-R,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=F,O.sunLength=f,O.directionalLength=g,O.pointLength=m,O.spotLength=C,O.rectAreaLength=L,O.hemiLength=S,O.numSunShadows=_,O.numDirectionalShadows=T,O.numPointShadows=A,O.numSpotShadows=N,O.numSpotMaps=y,O.numLightProbes=F,n.version=Gx++)}function l(c,h){let p=0,u=0,f=0,_=0,v=0,g=0,m=h.matrixWorldInverse;for(let C=0,L=c.length;C<L;C++){let S=c[C];if(S.isSunLight){let T=n.sun[p];T.direction.setFromMatrixPosition(S.matrixWorld),T.direction.transformDirection(m),p++}else if(S.isDirectionalLight){let T=n.directional[u];T.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),u++}else if(S.isSpotLight){let T=n.spot[_];T.position.setFromMatrixPosition(S.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),_++}else if(S.isRectAreaLight){let T=n.rectArea[v];T.position.setFromMatrixPosition(S.matrixWorld),T.position.applyMatrix4(m),a.identity(),r.copy(S.matrixWorld),r.premultiply(m),a.extractRotation(r),T.halfWidth.set(S.width*.5,0,0),T.halfHeight.set(0,S.height*.5,0),T.halfWidth.applyMatrix4(a),T.halfHeight.applyMatrix4(a),v++}else if(S.isPointLight){let T=n.point[f];T.position.setFromMatrixPosition(S.matrixWorld),T.position.applyMatrix4(m),f++}else if(S.isHemisphereLight){let T=n.hemi[g];T.direction.setFromMatrixPosition(S.matrixWorld),T.direction.transformDirection(m),g++}}}return{setup:o,setupView:l,state:n}}function af(i){let t=new Wx(i),e=[],n=[],s=[];function r(u){p.camera=u,e.length=0,n.length=0,s.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let p={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:p,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function Xx(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new af(i),t.set(s,[o])):r>=a.length?(o=new af(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var qx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,$x=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Yx=[new z(1,0,0),new z(-1,0,0),new z(0,1,0),new z(0,-1,0),new z(0,0,1),new z(0,0,-1)],Zx=[new z(0,-1,0),new z(0,-1,0),new z(0,0,1),new z(0,0,-1),new z(0,-1,0),new z(0,-1,0)],of=new Ge,Ca=new z,Ih=new z;function Jx(i,t,e){let n=new pr,s=new bt,r=new bt,a=new tn,o=new No,l=new Uo,c={},h=e.maxTextureSize,p={[ss]:Dn,[Dn]:ss,[on]:on},u=new Yn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new bt},radius:{value:4}},vertexShader:qx,fragmentShader:$x}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let _=new Ze;_.setAttribute("position",new Wn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let v=new ze(_,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=xa;let m=this.type;this.render=function(A,N,y){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||A.length===0)return;this.type===Ju&&(le("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=xa);let R=i.getRenderTarget(),F=i.getActiveCubeFace(),O=i.getActiveMipmapLevel(),V=i.state;V.setBlending(yi),V.buffers.depth.getReversed()===!0?V.buffers.color.setClear(0,0,0,0):V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let k=m!==this.type;k&&N.traverse(function(P){P.material&&(Array.isArray(P.material)?P.material.forEach(U=>U.needsUpdate=!0):P.material.needsUpdate=!0)});for(let P=0,U=A.length;P<U;P++){let Y=A[P],J=Y.shadow;if(J===void 0){le("WebGLShadowMap:",Y,"has no shadow.");continue}if(J.autoUpdate===!1&&J.needsUpdate===!1)continue;s.copy(J.mapSize);let ot=J.getFrameExtents();s.multiply(ot),r.copy(J.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ot.x),s.x=r.x*ot.x,J.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ot.y),s.y=r.y*ot.y,J.mapSize.y=r.y));let j=i.state.buffers.depth.getReversed();if(J.camera._reversedDepth=j,J.map===null||k===!0){if(J.map!==null&&(J.map.depthTexture!==null&&(J.map.depthTexture.dispose(),J.map.depthTexture=null),J.map.dispose()),this.type===yr){if(Y.isPointLight){le("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}J.map=new On(s.x,s.y,{format:ls,type:fi,minFilter:wn,magFilter:wn,generateMipmaps:!1}),J.map.texture.name=Y.name+".shadowMap",J.map.depthTexture=new Ji(s.x,s.y,ti),J.map.depthTexture.name=Y.name+".shadowMapDepth",J.map.depthTexture.format=_i,J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=yn,J.map.depthTexture.magFilter=yn}else Y.isPointLight?(J.map=new Vl(s.x),J.map.depthTexture=new wo(s.x,di)):(J.map=new On(s.x,s.y),J.map.depthTexture=new Ji(s.x,s.y,di)),J.map.depthTexture.name=Y.name+".shadowMap",J.map.depthTexture.format=_i,this.type===xa?(J.map.depthTexture.compareFunction=j?Ol:Fl,J.map.depthTexture.minFilter=wn,J.map.depthTexture.magFilter=wn):(J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=yn,J.map.depthTexture.magFilter=yn);J.camera.updateProjectionMatrix()}J.map.isWebGLCubeRenderTarget!==!0&&(J.map.width!==s.x||J.map.height!==s.y)&&J.map.setSize(s.x,s.y);let st=J.map.isWebGLCubeRenderTarget?6:J.getViewportCount();Y.isPointLight!==!0&&J.updateMatrices(Y,y);for(let lt=0;lt<st;lt++){let Dt=J.getCamera(lt);if(Y.isPointLight){let At=J.camera,ae=J.matrix,ne=Y.distance||At.far;ne!==At.far&&(At.far=ne,At.updateProjectionMatrix()),Ca.setFromMatrixPosition(Y.matrixWorld),At.position.copy(Ca),Ih.copy(At.position),Ih.add(Yx[lt]),At.up.copy(Zx[lt]),At.lookAt(Ih),At.updateMatrixWorld(),ae.makeTranslation(-Ca.x,-Ca.y,-Ca.z),of.multiplyMatrices(At.projectionMatrix,At.matrixWorldInverse),J._frustum.setFromProjectionMatrix(of,At.coordinateSystem,At.reversedDepth)}if(J.map.isWebGLCubeRenderTarget)i.setRenderTarget(J.map,lt),i.clear();else{lt===0&&(i.setRenderTarget(J.map),i.clear());let At=J.getViewport(lt);a.set(r.x*At.x,r.y*At.y,r.x*At.z,r.y*At.w),V.viewport(a)}n=J.getFrustum(lt),S(N,y,Dt,Y,this.type)}J.isPointLightShadow!==!0&&this.type===yr&&C(J,y),J.needsUpdate=!1}m=this.type,g.needsUpdate=!1,i.setRenderTarget(R,F,O)};function C(A,N){let y=t.update(v);u.defines.VSM_SAMPLES!==A.blurSamples&&(u.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null?A.mapPass=new On(s.x,s.y,{format:ls,type:fi}):(A.mapPass.width!==A.map.width||A.mapPass.height!==A.map.height)&&A.mapPass.setSize(A.map.width,A.map.height),u.uniforms.shadow_pass.value=A.map.depthTexture,u.uniforms.resolution.value.set(A.map.width,A.map.height),u.uniforms.radius.value=A.radius,i.setRenderTarget(A.mapPass),i.clear(),i.renderBufferDirect(N,null,y,u,v,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value.set(A.map.width,A.map.height),f.uniforms.radius.value=A.radius,i.setRenderTarget(A.map),i.clear(),i.renderBufferDirect(N,null,y,f,v,null)}function L(A,N,y,R){let F=null,O=y.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(O!==void 0)F=O;else if(F=y.isPointLight===!0?l:o,i.localClippingEnabled&&N.clipShadows===!0&&Array.isArray(N.clippingPlanes)&&N.clippingPlanes.length!==0||N.displacementMap&&N.displacementScale!==0||N.alphaMap&&N.alphaTest>0||N.map&&N.alphaTest>0||N.alphaToCoverage===!0){let V=F.uuid,k=N.uuid,P=c[V];P===void 0&&(P={},c[V]=P);let U=P[k];U===void 0&&(U=F.clone(),P[k]=U,N.addEventListener("dispose",T)),F=U}if(F.visible=N.visible,F.wireframe=N.wireframe,R===yr?F.side=N.shadowSide!==null?N.shadowSide:N.side:F.side=N.shadowSide!==null?N.shadowSide:p[N.side],F.alphaMap=N.alphaMap,F.alphaTest=N.alphaToCoverage===!0?.5:N.alphaTest,F.map=N.map,F.clipShadows=N.clipShadows,F.clippingPlanes=N.clippingPlanes,F.clipIntersection=N.clipIntersection,F.displacementMap=N.displacementMap,F.displacementScale=N.displacementScale,F.displacementBias=N.displacementBias,F.wireframeLinewidth=N.wireframeLinewidth,F.linewidth=N.linewidth,y.isPointLight===!0&&F.isMeshDistanceMaterial===!0){let V=i.properties.get(F);V.light=y}return F}function S(A,N,y,R,F){if(A.visible===!1)return;if(A.layers.test(N.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&F===yr)&&(!A.frustumCulled||A.intersectsFrustum(n))){A.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,A.matrixWorld);let k=t.update(A),P=A.material;if(Array.isArray(P)){let U=k.groups;for(let Y=0,J=U.length;Y<J;Y++){let ot=U[Y],j=P[ot.materialIndex];if(j&&j.visible){let st=L(A,j,R,F);A.onBeforeShadow(i,A,N,y,k,st,ot),i.renderBufferDirect(y,null,k,st,A,ot),A.onAfterShadow(i,A,N,y,k,st,ot)}}}else if(P.visible){let U=L(A,P,R,F);A.onBeforeShadow(i,A,N,y,k,U,null),i.renderBufferDirect(y,null,k,U,A,null),A.onAfterShadow(i,A,N,y,k,U,null)}}let V=A.children;for(let k=0,P=V.length;k<P;k++)S(V[k],N,y,R,F)}function T(A){A.target.removeEventListener("dispose",T);for(let y in c){let R=c[y],F=A.target.uuid;F in R&&(R[F].dispose(),delete R[F])}}}function jx(i,t){function e(){let q=!1,It=new tn,pt=null,Nt=new tn(0,0,0,0);return{setMask:function(Ut){pt!==Ut&&!q&&(i.colorMask(Ut,Ut,Ut,Ut),pt=Ut)},setLocked:function(Ut){q=Ut},setClear:function(Ut,_t,Kt,Zt,Te){Te===!0&&(Ut*=Zt,_t*=Zt,Kt*=Zt),It.set(Ut,_t,Kt,Zt),Nt.equals(It)===!1&&(i.clearColor(Ut,_t,Kt,Zt),Nt.copy(It))},reset:function(){q=!1,pt=null,Nt.set(-1,0,0,0)}}}function n(){let q=!1,It=!1,pt=null,Nt=null,Ut=null;return{setReversed:function(_t){if(It!==_t){let Kt=t.get("EXT_clip_control");_t?Kt.clipControlEXT(Kt.LOWER_LEFT_EXT,Kt.ZERO_TO_ONE_EXT):Kt.clipControlEXT(Kt.LOWER_LEFT_EXT,Kt.NEGATIVE_ONE_TO_ONE_EXT),It=_t;let Zt=Ut;Ut=null,this.setClear(Zt)}},getReversed:function(){return It},setTest:function(_t){_t?I(i.DEPTH_TEST):X(i.DEPTH_TEST)},setMask:function(_t){pt!==_t&&!q&&(i.depthMask(_t),pt=_t)},setFunc:function(_t){if(It&&(_t=Id[_t]),Nt!==_t){switch(_t){case co:i.depthFunc(i.NEVER);break;case ho:i.depthFunc(i.ALWAYS);break;case uo:i.depthFunc(i.LESS);break;case or:i.depthFunc(i.LEQUAL);break;case fo:i.depthFunc(i.EQUAL);break;case po:i.depthFunc(i.GEQUAL);break;case mo:i.depthFunc(i.GREATER);break;case go:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Nt=_t}},setLocked:function(_t){q=_t},setClear:function(_t){Ut!==_t&&(Ut=_t,It&&(_t=1-_t),i.clearDepth(_t))},reset:function(){q=!1,pt=null,Nt=null,Ut=null,It=!1}}}function s(){let q=!1,It=null,pt=null,Nt=null,Ut=null,_t=null,Kt=null,Zt=null,Te=null;return{setTest:function(Ie){q||(Ie?I(i.STENCIL_TEST):X(i.STENCIL_TEST))},setMask:function(Ie){It!==Ie&&!q&&(i.stencilMask(Ie),It=Ie)},setFunc:function(Ie,rn,Me){(pt!==Ie||Nt!==rn||Ut!==Me)&&(i.stencilFunc(Ie,rn,Me),pt=Ie,Nt=rn,Ut=Me)},setOp:function(Ie,rn,Me){(_t!==Ie||Kt!==rn||Zt!==Me)&&(i.stencilOp(Ie,rn,Me),_t=Ie,Kt=rn,Zt=Me)},setLocked:function(Ie){q=Ie},setClear:function(Ie){Te!==Ie&&(i.clearStencil(Ie),Te=Ie)},reset:function(){q=!1,It=null,pt=null,Nt=null,Ut=null,_t=null,Kt=null,Zt=null,Te=null}}}let r=new e,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},p={},u={},f=new WeakMap,_=[],v=null,g=!1,m=null,C=null,L=null,S=null,T=null,A=null,N=null,y=new fe(0,0,0),R=0,F=!1,O=null,V=null,k=null,P=null,U=null,Y=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),J=!1,ot=0,j=i.getParameter(i.VERSION);j.indexOf("WebGL")!==-1?(ot=parseFloat(/^WebGL (\d)/.exec(j)[1]),J=ot>=1):j.indexOf("OpenGL ES")!==-1&&(ot=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),J=ot>=2);let st=null,lt={},Dt=i.getParameter(i.SCISSOR_BOX),At=i.getParameter(i.VIEWPORT),ae=new tn().fromArray(Dt),ne=new tn().fromArray(At);function wt(q,It,pt,Nt){let Ut=new Uint8Array(4),_t=i.createTexture();i.bindTexture(q,_t),i.texParameteri(q,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(q,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Kt=0;Kt<pt;Kt++)q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?i.texImage3D(It,0,i.RGBA,1,1,Nt,0,i.RGBA,i.UNSIGNED_BYTE,Ut):i.texImage2D(It+Kt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Ut);return _t}let w={};w[i.TEXTURE_2D]=wt(i.TEXTURE_2D,i.TEXTURE_2D,1),w[i.TEXTURE_CUBE_MAP]=wt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),w[i.TEXTURE_2D_ARRAY]=wt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),w[i.TEXTURE_3D]=wt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),I(i.DEPTH_TEST),a.setFunc(or),xt(!1),Pt(qc),I(i.CULL_FACE),dt(yi);function I(q){h[q]!==!0&&(i.enable(q),h[q]=!0)}function X(q){h[q]!==!1&&(i.disable(q),h[q]=!1)}function K(q,It){return u[q]!==It?(i.bindFramebuffer(q,It),u[q]=It,q===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=It),q===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=It),!0):!1}function rt(q,It){let pt=_,Nt=!1;if(q){pt=f.get(It),pt===void 0&&(pt=[],f.set(It,pt));let Ut=q.textures;if(pt.length!==Ut.length||pt[0]!==i.COLOR_ATTACHMENT0){for(let _t=0,Kt=Ut.length;_t<Kt;_t++)pt[_t]=i.COLOR_ATTACHMENT0+_t;pt.length=Ut.length,Nt=!0}}else pt[0]!==i.BACK&&(pt[0]=i.BACK,Nt=!0);Nt&&i.drawBuffers(pt)}function yt(q){return v!==q?(i.useProgram(q),v=q,!0):!1}let ie={[ws]:i.FUNC_ADD,[Ku]:i.FUNC_SUBTRACT,[Qu]:i.FUNC_REVERSE_SUBTRACT};ie[td]=i.MIN,ie[ed]=i.MAX;let at={[nd]:i.ZERO,[id]:i.ONE,[sd]:i.SRC_COLOR,[Jc]:i.SRC_ALPHA,[hd]:i.SRC_ALPHA_SATURATE,[ld]:i.DST_COLOR,[ad]:i.DST_ALPHA,[rd]:i.ONE_MINUS_SRC_COLOR,[jc]:i.ONE_MINUS_SRC_ALPHA,[cd]:i.ONE_MINUS_DST_COLOR,[od]:i.ONE_MINUS_DST_ALPHA,[ud]:i.CONSTANT_COLOR,[dd]:i.ONE_MINUS_CONSTANT_COLOR,[fd]:i.CONSTANT_ALPHA,[pd]:i.ONE_MINUS_CONSTANT_ALPHA};function dt(q,It,pt,Nt,Ut,_t,Kt,Zt,Te,Ie){if(q===yi){g===!0&&(X(i.BLEND),g=!1);return}if(g===!1&&(I(i.BLEND),g=!0),q!==ju){if(q!==m||Ie!==F){if((C!==ws||T!==ws)&&(i.blendEquation(i.FUNC_ADD),C=ws,T=ws),Ie)switch(q){case Mr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $c:i.blendFunc(i.ONE,i.ONE);break;case Yc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Zc:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:de("WebGLState: Invalid blending: ",q);break}else switch(q){case Mr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $c:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Yc:de("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Zc:de("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:de("WebGLState: Invalid blending: ",q);break}L=null,S=null,A=null,N=null,y.set(0,0,0),R=0,m=q,F=Ie}return}Ut=Ut||It,_t=_t||pt,Kt=Kt||Nt,(It!==C||Ut!==T)&&(i.blendEquationSeparate(ie[It],ie[Ut]),C=It,T=Ut),(pt!==L||Nt!==S||_t!==A||Kt!==N)&&(i.blendFuncSeparate(at[pt],at[Nt],at[_t],at[Kt]),L=pt,S=Nt,A=_t,N=Kt),(Zt.equals(y)===!1||Te!==R)&&(i.blendColor(Zt.r,Zt.g,Zt.b,Te),y.copy(Zt),R=Te),m=q,F=!1}function ht(q,It){q.side===on?X(i.CULL_FACE):I(i.CULL_FACE);let pt=q.side===Dn;It&&(pt=!pt),xt(pt),q.blending===Mr&&q.transparent===!1?dt(yi):dt(q.blending,q.blendEquation,q.blendSrc,q.blendDst,q.blendEquationAlpha,q.blendSrcAlpha,q.blendDstAlpha,q.blendColor,q.blendAlpha,q.premultipliedAlpha),a.setFunc(q.depthFunc),a.setTest(q.depthTest),a.setMask(q.depthWrite),r.setMask(q.colorWrite);let Nt=q.stencilWrite;o.setTest(Nt),Nt&&(o.setMask(q.stencilWriteMask),o.setFunc(q.stencilFunc,q.stencilRef,q.stencilFuncMask),o.setOp(q.stencilFail,q.stencilZFail,q.stencilZPass)),ee(q.polygonOffset,q.polygonOffsetFactor,q.polygonOffsetUnits),q.alphaToCoverage===!0?I(i.SAMPLE_ALPHA_TO_COVERAGE):X(i.SAMPLE_ALPHA_TO_COVERAGE)}function xt(q){O!==q&&(q?i.frontFace(i.CW):i.frontFace(i.CCW),O=q)}function Pt(q){q!==Yu?(I(i.CULL_FACE),q!==V&&(q===qc?i.cullFace(i.BACK):q===Zu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):X(i.CULL_FACE),V=q}function Xt(q){q!==k&&(J&&i.lineWidth(q),k=q)}function ee(q,It,pt){q?(I(i.POLYGON_OFFSET_FILL),(P!==It||U!==pt)&&(P=It,U=pt,a.getReversed()&&(It=-It),i.polygonOffset(It,pt))):X(i.POLYGON_OFFSET_FILL)}function oe(q){q?I(i.SCISSOR_TEST):X(i.SCISSOR_TEST)}function he(q){q===void 0&&(q=i.TEXTURE0+Y-1),st!==q&&(i.activeTexture(q),st=q)}function B(q,It,pt){pt===void 0&&(st===null?pt=i.TEXTURE0+Y-1:pt=st);let Nt=lt[pt];Nt===void 0&&(Nt={type:void 0,texture:void 0},lt[pt]=Nt),(Nt.type!==q||Nt.texture!==It)&&(st!==pt&&(i.activeTexture(pt),st=pt),i.bindTexture(q,It||w[q]),Nt.type=q,Nt.texture=It)}function we(){let q=lt[st];q!==void 0&&q.type!==void 0&&(i.bindTexture(q.type,null),q.type=void 0,q.texture=void 0)}function ye(){try{i.compressedTexImage2D(...arguments)}catch(q){de("WebGLState:",q)}}function D(){try{i.compressedTexImage3D(...arguments)}catch(q){de("WebGLState:",q)}}function x(){try{i.texSubImage2D(...arguments)}catch(q){de("WebGLState:",q)}}function H(){try{i.texSubImage3D(...arguments)}catch(q){de("WebGLState:",q)}}function Q(){try{i.compressedTexSubImage2D(...arguments)}catch(q){de("WebGLState:",q)}}function et(){try{i.compressedTexSubImage3D(...arguments)}catch(q){de("WebGLState:",q)}}function Et(){try{i.texStorage2D(...arguments)}catch(q){de("WebGLState:",q)}}function Rt(){try{i.texStorage3D(...arguments)}catch(q){de("WebGLState:",q)}}function ut(){try{i.texImage2D(...arguments)}catch(q){de("WebGLState:",q)}}function ft(){try{i.texImage3D(...arguments)}catch(q){de("WebGLState:",q)}}function mt(q){return p[q]!==void 0?p[q]:i.getParameter(q)}function jt(q,It){p[q]!==It&&(i.pixelStorei(q,It),p[q]=It)}function St(q){ae.equals(q)===!1&&(i.scissor(q.x,q.y,q.z,q.w),ae.copy(q))}function Lt(q){ne.equals(q)===!1&&(i.viewport(q.x,q.y,q.z,q.w),ne.copy(q))}function $t(q,It){let pt=c.get(It);pt===void 0&&(pt=new WeakMap,c.set(It,pt));let Nt=pt.get(q);Nt===void 0&&(Nt=i.getUniformBlockIndex(It,q.name),pt.set(q,Nt))}function Wt(q,It){let Nt=c.get(It).get(q);l.get(It)!==Nt&&(i.uniformBlockBinding(It,Nt,q.__bindingPointIndex),l.set(It,Nt))}function ce(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},p={},st=null,lt={},u={},f=new WeakMap,_=[],v=null,g=!1,m=null,C=null,L=null,S=null,T=null,A=null,N=null,y=new fe(0,0,0),R=0,F=!1,O=null,V=null,k=null,P=null,U=null,ae.set(0,0,i.canvas.width,i.canvas.height),ne.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:I,disable:X,bindFramebuffer:K,drawBuffers:rt,useProgram:yt,setBlending:dt,setMaterial:ht,setFlipSided:xt,setCullFace:Pt,setLineWidth:Xt,setPolygonOffset:ee,setScissorTest:oe,activeTexture:he,bindTexture:B,unbindTexture:we,compressedTexImage2D:ye,compressedTexImage3D:D,texImage2D:ut,texImage3D:ft,pixelStorei:jt,getParameter:mt,updateUBOMapping:$t,uniformBlockBinding:Wt,texStorage2D:Et,texStorage3D:Rt,texSubImage2D:x,texSubImage3D:H,compressedTexSubImage2D:Q,compressedTexSubImage3D:et,scissor:St,viewport:Lt,reset:ce}}function Kx(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new bt,h=new WeakMap,p=new Set,u,f=new WeakMap,_=!1;try{_=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(D,x){return _?new OffscreenCanvas(D,x):Zr("canvas")}function g(D,x,H){let Q=1,et=ye(D);if((et.width>H||et.height>H)&&(Q=H/Math.max(et.width,et.height)),Q<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){let Et=Math.floor(Q*et.width),Rt=Math.floor(Q*et.height);u===void 0&&(u=v(Et,Rt));let ut=x?v(Et,Rt):u;return ut.width=Et,ut.height=Rt,ut.getContext("2d").drawImage(D,0,0,Et,Rt),le("WebGLRenderer: Texture has been resized from ("+et.width+"x"+et.height+") to ("+Et+"x"+Rt+")."),ut}else return"data"in D&&le("WebGLRenderer: Image in DataTexture is too big ("+et.width+"x"+et.height+")."),D;return D}function m(D){return D.generateMipmaps}function C(D){i.generateMipmap(D)}function L(D){return D.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?i.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function S(D,x,H,Q,et,Et=!1){if(D!==null){if(i[D]!==void 0)return i[D];le("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let Rt;Q&&(Rt=t.get("EXT_texture_norm16"),Rt||le("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ut=x;if(x===i.RED&&(H===i.FLOAT&&(ut=i.R32F),H===i.HALF_FLOAT&&(ut=i.R16F),H===i.UNSIGNED_BYTE&&(ut=i.R8),H===i.UNSIGNED_SHORT&&Rt&&(ut=Rt.R16_EXT),H===i.SHORT&&Rt&&(ut=Rt.R16_SNORM_EXT)),x===i.RED_INTEGER&&(H===i.UNSIGNED_BYTE&&(ut=i.R8UI),H===i.UNSIGNED_SHORT&&(ut=i.R16UI),H===i.UNSIGNED_INT&&(ut=i.R32UI),H===i.BYTE&&(ut=i.R8I),H===i.SHORT&&(ut=i.R16I),H===i.INT&&(ut=i.R32I)),x===i.RG&&(H===i.FLOAT&&(ut=i.RG32F),H===i.HALF_FLOAT&&(ut=i.RG16F),H===i.UNSIGNED_BYTE&&(ut=i.RG8),H===i.UNSIGNED_SHORT&&Rt&&(ut=Rt.RG16_EXT),H===i.SHORT&&Rt&&(ut=Rt.RG16_SNORM_EXT)),x===i.RG_INTEGER&&(H===i.UNSIGNED_BYTE&&(ut=i.RG8UI),H===i.UNSIGNED_SHORT&&(ut=i.RG16UI),H===i.UNSIGNED_INT&&(ut=i.RG32UI),H===i.BYTE&&(ut=i.RG8I),H===i.SHORT&&(ut=i.RG16I),H===i.INT&&(ut=i.RG32I)),x===i.RGB_INTEGER&&(H===i.UNSIGNED_BYTE&&(ut=i.RGB8UI),H===i.UNSIGNED_SHORT&&(ut=i.RGB16UI),H===i.UNSIGNED_INT&&(ut=i.RGB32UI),H===i.BYTE&&(ut=i.RGB8I),H===i.SHORT&&(ut=i.RGB16I),H===i.INT&&(ut=i.RGB32I)),x===i.RGBA_INTEGER&&(H===i.UNSIGNED_BYTE&&(ut=i.RGBA8UI),H===i.UNSIGNED_SHORT&&(ut=i.RGBA16UI),H===i.UNSIGNED_INT&&(ut=i.RGBA32UI),H===i.BYTE&&(ut=i.RGBA8I),H===i.SHORT&&(ut=i.RGBA16I),H===i.INT&&(ut=i.RGBA32I)),x===i.RGB&&(H===i.UNSIGNED_SHORT&&Rt&&(ut=Rt.RGB16_EXT),H===i.SHORT&&Rt&&(ut=Rt.RGB16_SNORM_EXT),H===i.UNSIGNED_INT_5_9_9_9_REV&&(ut=i.RGB9_E5),H===i.UNSIGNED_INT_10F_11F_11F_REV&&(ut=i.R11F_G11F_B10F)),x===i.RGBA){let ft=Et?Yr:De.getTransfer(et);H===i.FLOAT&&(ut=i.RGBA32F),H===i.HALF_FLOAT&&(ut=i.RGBA16F),H===i.UNSIGNED_BYTE&&(ut=ft===Xe?i.SRGB8_ALPHA8:i.RGBA8),H===i.UNSIGNED_SHORT&&Rt&&(ut=Rt.RGBA16_EXT),H===i.SHORT&&Rt&&(ut=Rt.RGBA16_SNORM_EXT),H===i.UNSIGNED_SHORT_4_4_4_4&&(ut=i.RGBA4),H===i.UNSIGNED_SHORT_5_5_5_1&&(ut=i.RGB5_A1)}return(ut===i.R16F||ut===i.R32F||ut===i.RG16F||ut===i.RG32F||ut===i.RGBA16F||ut===i.RGBA32F)&&t.get("EXT_color_buffer_float"),ut}function T(D,x){let H;return D?x===null||x===di||x===Sr?H=i.DEPTH24_STENCIL8:x===ti?H=i.DEPTH32F_STENCIL8:x===br&&(H=i.DEPTH24_STENCIL8,le("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===di||x===Sr?H=i.DEPTH_COMPONENT24:x===ti?H=i.DEPTH_COMPONENT32F:x===br&&(H=i.DEPTH_COMPONENT16),H}function A(D,x){return m(D)===!0||D.isFramebufferTexture&&D.minFilter!==yn&&D.minFilter!==wn?Math.log2(Math.max(x.width,x.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?x.mipmaps.length:1}function N(D){let x=D.target;x.removeEventListener("dispose",N),R(x),x.isVideoTexture&&h.delete(x),x.isHTMLTexture&&p.delete(x)}function y(D){let x=D.target;x.removeEventListener("dispose",y),O(x)}function R(D){let x=n.get(D);if(x.__webglInit===void 0)return;let H=D.source,Q=f.get(H);if(Q){let et=Q[x.__cacheKey];et.usedTimes--,et.usedTimes===0&&F(D),Object.keys(Q).length===0&&f.delete(H)}n.remove(D)}function F(D){let x=n.get(D);i.deleteTexture(x.__webglTexture);let H=D.source,Q=f.get(H);delete Q[x.__cacheKey],a.memory.textures--}function O(D){let x=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(x.__webglFramebuffer[Q]))for(let et=0;et<x.__webglFramebuffer[Q].length;et++)i.deleteFramebuffer(x.__webglFramebuffer[Q][et]);else i.deleteFramebuffer(x.__webglFramebuffer[Q]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[Q])}else{if(Array.isArray(x.__webglFramebuffer))for(let Q=0;Q<x.__webglFramebuffer.length;Q++)i.deleteFramebuffer(x.__webglFramebuffer[Q]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let Q=0;Q<x.__webglColorRenderbuffer.length;Q++)x.__webglColorRenderbuffer[Q]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[Q]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}let H=D.textures;for(let Q=0,et=H.length;Q<et;Q++){let Et=n.get(H[Q]);Et.__webglTexture&&(i.deleteTexture(Et.__webglTexture),a.memory.textures--),n.remove(H[Q])}n.remove(D)}let V=0;function k(){V=0}function P(){return V}function U(D){V=D}function Y(){let D=V;return D>=s.maxTextures&&le("WebGLTextures: Trying to use "+(D+1)+" texture units while this GPU supports only "+s.maxTextures),V+=1,D}function J(D){let x=[];return x.push(D.wrapS),x.push(D.wrapT),x.push(D.wrapR||0),x.push(D.magFilter),x.push(D.minFilter),x.push(D.anisotropy),x.push(D.internalFormat),x.push(D.format),x.push(D.type),x.push(D.generateMipmaps),x.push(D.premultiplyAlpha),x.push(D.flipY),x.push(D.unpackAlignment),x.push(D.colorSpace),x.join()}function ot(D,x){let H=n.get(D);if(D.isVideoTexture&&B(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&H.__version!==D.version){let Q=D.image;if(Q===null)le("WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)le("WebGLRenderer: Texture marked for update but image is incomplete");else{X(H,D,x);return}}else D.isExternalTexture&&(H.__webglTexture=D.sourceTexture?D.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,H.__webglTexture,i.TEXTURE0+x)}function j(D,x){let H=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&H.__version!==D.version){X(H,D,x);return}else D.isExternalTexture&&(H.__webglTexture=D.sourceTexture?D.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,H.__webglTexture,i.TEXTURE0+x)}function st(D,x){let H=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&H.__version!==D.version){X(H,D,x);return}e.bindTexture(i.TEXTURE_3D,H.__webglTexture,i.TEXTURE0+x)}function lt(D,x){let H=n.get(D);if(D.isCubeDepthTexture!==!0&&D.version>0&&H.__version!==D.version){K(H,D,x);return}e.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture,i.TEXTURE0+x)}let Dt={[_o]:i.REPEAT,[mi]:i.CLAMP_TO_EDGE,[xo]:i.MIRRORED_REPEAT},At={[yn]:i.NEAREST,[_d]:i.NEAREST_MIPMAP_NEAREST,[ya]:i.NEAREST_MIPMAP_LINEAR,[wn]:i.LINEAR,[jo]:i.LINEAR_MIPMAP_NEAREST,[as]:i.LINEAR_MIPMAP_LINEAR},ae={[Md]:i.NEVER,[wd]:i.ALWAYS,[bd]:i.LESS,[Fl]:i.LEQUAL,[Sd]:i.EQUAL,[Ol]:i.GEQUAL,[Ed]:i.GREATER,[Ad]:i.NOTEQUAL};function ne(D,x){if(x.type===ti&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===wn||x.magFilter===jo||x.magFilter===ya||x.magFilter===as||x.minFilter===wn||x.minFilter===jo||x.minFilter===ya||x.minFilter===as)&&le("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(D,i.TEXTURE_WRAP_S,Dt[x.wrapS]),i.texParameteri(D,i.TEXTURE_WRAP_T,Dt[x.wrapT]),(D===i.TEXTURE_3D||D===i.TEXTURE_2D_ARRAY)&&i.texParameteri(D,i.TEXTURE_WRAP_R,Dt[x.wrapR]),i.texParameteri(D,i.TEXTURE_MAG_FILTER,At[x.magFilter]),i.texParameteri(D,i.TEXTURE_MIN_FILTER,At[x.minFilter]),x.compareFunction&&(i.texParameteri(D,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(D,i.TEXTURE_COMPARE_FUNC,ae[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===yn||x.minFilter!==ya&&x.minFilter!==as||x.type===ti&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){let H=t.get("EXT_texture_filter_anisotropic");i.texParameterf(D,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function wt(D,x){let H=!1;D.__webglInit===void 0&&(D.__webglInit=!0,x.addEventListener("dispose",N));let Q=x.source,et=f.get(Q);et===void 0&&(et={},f.set(Q,et));let Et=J(x);if(Et!==D.__cacheKey){et[Et]===void 0&&(et[Et]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,H=!0),et[Et].usedTimes++;let Rt=et[D.__cacheKey];Rt!==void 0&&(et[D.__cacheKey].usedTimes--,Rt.usedTimes===0&&F(x)),D.__cacheKey=Et,D.__webglTexture=et[Et].texture}return H}function w(D,x,H){return Math.floor(Math.floor(D/H)/x)}function I(D,x,H,Q){let Et=D.updateRanges;if(Et.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,H,Q,x.data);else{Et.sort((jt,St)=>jt.start-St.start);let Rt=0;for(let jt=1;jt<Et.length;jt++){let St=Et[Rt],Lt=Et[jt],$t=St.start+St.count,Wt=w(Lt.start,x.width,4),ce=w(St.start,x.width,4);Lt.start<=$t+1&&Wt===ce&&w(Lt.start+Lt.count-1,x.width,4)===Wt?St.count=Math.max(St.count,Lt.start+Lt.count-St.start):(++Rt,Et[Rt]=Lt)}Et.length=Rt+1;let ut=e.getParameter(i.UNPACK_ROW_LENGTH),ft=e.getParameter(i.UNPACK_SKIP_PIXELS),mt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let jt=0,St=Et.length;jt<St;jt++){let Lt=Et[jt],$t=Math.floor(Lt.start/4),Wt=Math.ceil(Lt.count/4),ce=$t%x.width,q=Math.floor($t/x.width),It=Wt,pt=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,ce),e.pixelStorei(i.UNPACK_SKIP_ROWS,q),e.texSubImage2D(i.TEXTURE_2D,0,ce,q,It,pt,H,Q,x.data)}D.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,ut),e.pixelStorei(i.UNPACK_SKIP_PIXELS,ft),e.pixelStorei(i.UNPACK_SKIP_ROWS,mt)}}function X(D,x,H){let Q=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(Q=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(Q=i.TEXTURE_3D);let et=wt(D,x),Et=x.source;e.bindTexture(Q,D.__webglTexture,i.TEXTURE0+H);let Rt=n.get(Et);if(Et.version!==Rt.__version||et===!0){if(e.activeTexture(i.TEXTURE0+H),(typeof ImageBitmap<"u"&&x.image instanceof ImageBitmap)===!1){let pt=De.getPrimaries(De.workingColorSpace),Nt=x.colorSpace===Oi?null:De.getPrimaries(x.colorSpace),Ut=x.colorSpace===Oi||pt===Nt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ut)}e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment);let ft=g(x.image,!1,s.maxTextureSize);ft=we(x,ft);let mt=r.convert(x.format,x.colorSpace),jt=r.convert(x.type),St=S(x.internalFormat,mt,jt,x.normalized,x.colorSpace,x.isVideoTexture);ne(Q,x);let Lt,$t=x.mipmaps,Wt=x.isVideoTexture!==!0,ce=Rt.__version===void 0||et===!0,q=Et.dataReady,It=A(x,ft);if(x.isDepthTexture)St=T(x.format===os,x.type),ce&&(Wt?e.texStorage2D(i.TEXTURE_2D,1,St,ft.width,ft.height):e.texImage2D(i.TEXTURE_2D,0,St,ft.width,ft.height,0,mt,jt,null));else if(x.isDataTexture)if($t.length>0){Wt&&ce&&e.texStorage2D(i.TEXTURE_2D,It,St,$t[0].width,$t[0].height);for(let pt=0,Nt=$t.length;pt<Nt;pt++)Lt=$t[pt],Wt?q&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,Lt.width,Lt.height,mt,jt,Lt.data):e.texImage2D(i.TEXTURE_2D,pt,St,Lt.width,Lt.height,0,mt,jt,Lt.data);x.generateMipmaps=!1}else Wt?(ce&&e.texStorage2D(i.TEXTURE_2D,It,St,ft.width,ft.height),q&&I(x,ft,mt,jt)):e.texImage2D(i.TEXTURE_2D,0,St,ft.width,ft.height,0,mt,jt,ft.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Wt&&ce&&e.texStorage3D(i.TEXTURE_2D_ARRAY,It,St,$t[0].width,$t[0].height,ft.depth);for(let pt=0,Nt=$t.length;pt<Nt;pt++)if(Lt=$t[pt],x.format!==ei)if(mt!==null)if(Wt){if(q)if(x.layerUpdates.size>0){let Ut=yh(Lt.width,Lt.height,x.format,x.type);for(let _t of x.layerUpdates){let Kt=Lt.data.subarray(_t*Ut/Lt.data.BYTES_PER_ELEMENT,(_t+1)*Ut/Lt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,_t,Lt.width,Lt.height,1,mt,Kt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,0,Lt.width,Lt.height,ft.depth,mt,Lt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,pt,St,Lt.width,Lt.height,ft.depth,0,Lt.data,0,0);else le("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Wt?q&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,pt,0,0,0,Lt.width,Lt.height,ft.depth,mt,jt,Lt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,pt,St,Lt.width,Lt.height,ft.depth,0,mt,jt,Lt.data);x.layerUpdates.size>0&&x.clearLayerUpdates()}else{Wt&&ce&&e.texStorage2D(i.TEXTURE_2D,It,St,$t[0].width,$t[0].height);for(let pt=0,Nt=$t.length;pt<Nt;pt++)Lt=$t[pt],x.format!==ei?mt!==null?Wt?q&&e.compressedTexSubImage2D(i.TEXTURE_2D,pt,0,0,Lt.width,Lt.height,mt,Lt.data):e.compressedTexImage2D(i.TEXTURE_2D,pt,St,Lt.width,Lt.height,0,Lt.data):le("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Wt?q&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,Lt.width,Lt.height,mt,jt,Lt.data):e.texImage2D(i.TEXTURE_2D,pt,St,Lt.width,Lt.height,0,mt,jt,Lt.data)}else if(x.isDataArrayTexture)if(Wt){if(ce&&e.texStorage3D(i.TEXTURE_2D_ARRAY,It,St,ft.width,ft.height,ft.depth),q)if(x.layerUpdates.size>0){let pt=yh(ft.width,ft.height,x.format,x.type);for(let Nt of x.layerUpdates){let Ut=ft.data.subarray(Nt*pt/ft.data.BYTES_PER_ELEMENT,(Nt+1)*pt/ft.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Nt,ft.width,ft.height,1,mt,jt,Ut)}x.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ft.width,ft.height,ft.depth,mt,jt,ft.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,St,ft.width,ft.height,ft.depth,0,mt,jt,ft.data);else if(x.isData3DTexture)Wt?(ce&&e.texStorage3D(i.TEXTURE_3D,It,St,ft.width,ft.height,ft.depth),q&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ft.width,ft.height,ft.depth,mt,jt,ft.data)):e.texImage3D(i.TEXTURE_3D,0,St,ft.width,ft.height,ft.depth,0,mt,jt,ft.data);else if(x.isFramebufferTexture){if(ce)if(Wt)e.texStorage2D(i.TEXTURE_2D,It,St,ft.width,ft.height);else{let pt=ft.width,Nt=ft.height;for(let Ut=0;Ut<It;Ut++)e.texImage2D(i.TEXTURE_2D,Ut,St,pt,Nt,0,mt,jt,null),pt>>=1,Nt>>=1}}else if(x.isHTMLTexture){if("texElementImage2D"in i){let pt=i.canvas;if(pt.hasAttribute("layoutsubtree")||pt.setAttribute("layoutsubtree","true"),ft.parentNode!==pt){pt.appendChild(ft),p.add(x),pt.onpaint=Nt=>{let Ut=Nt.changedElements;for(let _t of p)Ut.includes(_t.image)&&(_t.needsUpdate=!0)},pt.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ft);else{let Ut=i.RGBA,_t=i.RGBA,Kt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Ut,_t,Kt,ft)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if($t.length>0){if(Wt&&ce){let pt=ye($t[0]);e.texStorage2D(i.TEXTURE_2D,It,St,pt.width,pt.height)}for(let pt=0,Nt=$t.length;pt<Nt;pt++)Lt=$t[pt],Wt?q&&e.texSubImage2D(i.TEXTURE_2D,pt,0,0,mt,jt,Lt):e.texImage2D(i.TEXTURE_2D,pt,St,mt,jt,Lt);x.generateMipmaps=!1}else if(Wt){if(ce){let pt=ye(ft);e.texStorage2D(i.TEXTURE_2D,It,St,pt.width,pt.height)}q&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,mt,jt,ft)}else e.texImage2D(i.TEXTURE_2D,0,St,mt,jt,ft);m(x)&&C(Q),Rt.__version=Et.version,x.onUpdate&&x.onUpdate(x)}D.__version=x.version}function K(D,x,H){if(x.image.length!==6)return;let Q=wt(D,x),et=x.source;e.bindTexture(i.TEXTURE_CUBE_MAP,D.__webglTexture,i.TEXTURE0+H);let Et=n.get(et);if(et.version!==Et.__version||Q===!0){e.activeTexture(i.TEXTURE0+H);let Rt=De.getPrimaries(De.workingColorSpace),ut=x.colorSpace===Oi?null:De.getPrimaries(x.colorSpace),ft=x.colorSpace===Oi||Rt===ut?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ft);let mt=x.isCompressedTexture||x.image[0].isCompressedTexture,jt=x.image[0]&&x.image[0].isDataTexture,St=[];for(let _t=0;_t<6;_t++)!mt&&!jt?St[_t]=g(x.image[_t],!0,s.maxCubemapSize):St[_t]=jt?x.image[_t].image:x.image[_t],St[_t]=we(x,St[_t]);let Lt=St[0],$t=r.convert(x.format,x.colorSpace),Wt=r.convert(x.type),ce=S(x.internalFormat,$t,Wt,x.normalized,x.colorSpace),q=x.isVideoTexture!==!0,It=Et.__version===void 0||Q===!0,pt=et.dataReady,Nt=A(x,Lt);ne(i.TEXTURE_CUBE_MAP,x);let Ut;if(mt){q&&It&&e.texStorage2D(i.TEXTURE_CUBE_MAP,Nt,ce,Lt.width,Lt.height);for(let _t=0;_t<6;_t++){Ut=St[_t].mipmaps;for(let Kt=0;Kt<Ut.length;Kt++){let Zt=Ut[Kt];x.format!==ei?$t!==null?q?pt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt,0,0,Zt.width,Zt.height,$t,Zt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt,ce,Zt.width,Zt.height,0,Zt.data):le("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):q?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt,0,0,Zt.width,Zt.height,$t,Wt,Zt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt,ce,Zt.width,Zt.height,0,$t,Wt,Zt.data)}}}else{if(Ut=x.mipmaps,q&&It){Ut.length>0&&Nt++;let _t=ye(St[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,Nt,ce,_t.width,_t.height)}for(let _t=0;_t<6;_t++)if(jt){q?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,0,0,St[_t].width,St[_t].height,$t,Wt,St[_t].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,ce,St[_t].width,St[_t].height,0,$t,Wt,St[_t].data);for(let Kt=0;Kt<Ut.length;Kt++){let Te=Ut[Kt].image[_t].image;q?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt+1,0,0,Te.width,Te.height,$t,Wt,Te.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt+1,ce,Te.width,Te.height,0,$t,Wt,Te.data)}}else{q?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,0,0,$t,Wt,St[_t]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,0,ce,$t,Wt,St[_t]);for(let Kt=0;Kt<Ut.length;Kt++){let Zt=Ut[Kt];q?pt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt+1,0,0,$t,Wt,Zt.image[_t]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_t,Kt+1,ce,$t,Wt,Zt.image[_t])}}}m(x)&&C(i.TEXTURE_CUBE_MAP),Et.__version=et.version,x.onUpdate&&x.onUpdate(x)}D.__version=x.version}function rt(D,x,H,Q,et,Et){let Rt=r.convert(H.format,H.colorSpace),ut=r.convert(H.type),ft=S(H.internalFormat,Rt,ut,H.normalized,H.colorSpace),mt=n.get(x),jt=n.get(H);if(jt.__renderTarget=x,!mt.__hasExternalTextures){let St=Math.max(1,x.width>>Et),Lt=Math.max(1,x.height>>Et);et===i.TEXTURE_3D||et===i.TEXTURE_2D_ARRAY?e.texImage3D(et,Et,ft,St,Lt,x.depth,0,Rt,ut,null):e.texImage2D(et,Et,ft,St,Lt,0,Rt,ut,null)}e.bindFramebuffer(i.FRAMEBUFFER,D),he(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,et,jt.__webglTexture,0,oe(x)):(et===i.TEXTURE_2D||et>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&et<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Q,et,jt.__webglTexture,Et),e.bindFramebuffer(i.FRAMEBUFFER,null)}function yt(D,x,H){if(i.bindRenderbuffer(i.RENDERBUFFER,D),x.depthBuffer){let Q=x.depthTexture,et=Q&&Q.isDepthTexture?Q.type:null,Et=T(x.stencilBuffer,et),Rt=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;he(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,oe(x),Et,x.width,x.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,oe(x),Et,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,Et,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Rt,i.RENDERBUFFER,D)}else{let Q=x.textures;for(let et=0;et<Q.length;et++){let Et=Q[et],Rt=r.convert(Et.format,Et.colorSpace),ut=r.convert(Et.type),ft=S(Et.internalFormat,Rt,ut,Et.normalized,Et.colorSpace);he(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,oe(x),ft,x.width,x.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,oe(x),ft,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,ft,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ie(D,x,H){let Q=x.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,D),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let et=n.get(x.depthTexture);if(et.__renderTarget=x,(!et.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),Q){if(et.__webglInit===void 0&&(et.__webglInit=!0,x.depthTexture.addEventListener("dispose",N)),et.__webglTexture===void 0){et.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,et.__webglTexture),ne(i.TEXTURE_CUBE_MAP,x.depthTexture);let mt=r.convert(x.depthTexture.format),jt=r.convert(x.depthTexture.type),St;x.depthTexture.format===_i?St=i.DEPTH_COMPONENT24:x.depthTexture.format===os&&(St=i.DEPTH24_STENCIL8);for(let Lt=0;Lt<6;Lt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Lt,0,St,x.width,x.height,0,mt,jt,null)}}else ot(x.depthTexture,0);let Et=et.__webglTexture,Rt=oe(x),ut=Q?i.TEXTURE_CUBE_MAP_POSITIVE_X+H:i.TEXTURE_2D,ft=x.depthTexture.format===os?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(x.depthTexture.format===_i)he(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ft,ut,Et,0,Rt):i.framebufferTexture2D(i.FRAMEBUFFER,ft,ut,Et,0);else if(x.depthTexture.format===os)he(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ft,ut,Et,0,Rt):i.framebufferTexture2D(i.FRAMEBUFFER,ft,ut,Et,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function at(D){let x=n.get(D),H=D.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==D.depthTexture){let Q=D.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),Q){let et=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,Q.removeEventListener("dispose",et)};Q.addEventListener("dispose",et),x.__depthDisposeCallback=et}x.__boundDepthTexture=Q}if(D.depthTexture&&!x.__autoAllocateDepthBuffer)if(H)for(let Q=0;Q<6;Q++)ie(x.__webglFramebuffer[Q],D,Q);else{let Q=D.texture.mipmaps;Q&&Q.length>0?ie(x.__webglFramebuffer[0],D,0):ie(x.__webglFramebuffer,D,0)}else if(H){x.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)if(e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[Q]),x.__webglDepthbuffer[Q]===void 0)x.__webglDepthbuffer[Q]=i.createRenderbuffer(),yt(x.__webglDepthbuffer[Q],D,!1);else{let et=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Et=x.__webglDepthbuffer[Q];i.bindRenderbuffer(i.RENDERBUFFER,Et),i.framebufferRenderbuffer(i.FRAMEBUFFER,et,i.RENDERBUFFER,Et)}}else{let Q=D.texture.mipmaps;if(Q&&Q.length>0?e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),yt(x.__webglDepthbuffer,D,!1);else{let et=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Et=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Et),i.framebufferRenderbuffer(i.FRAMEBUFFER,et,i.RENDERBUFFER,Et)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function dt(D,x,H){let Q=n.get(D);x!==void 0&&rt(Q.__webglFramebuffer,D,D.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),H!==void 0&&at(D)}function ht(D){let x=D.texture,H=n.get(D),Q=n.get(x);D.addEventListener("dispose",y);let et=D.textures,Et=D.isWebGLCubeRenderTarget===!0,Rt=et.length>1;if(Rt||(Q.__webglTexture===void 0&&(Q.__webglTexture=i.createTexture()),Q.__version=x.version,a.memory.textures++),Et){H.__webglFramebuffer=[];for(let ut=0;ut<6;ut++)if(x.mipmaps&&x.mipmaps.length>0){H.__webglFramebuffer[ut]=[];for(let ft=0;ft<x.mipmaps.length;ft++)H.__webglFramebuffer[ut][ft]=i.createFramebuffer()}else H.__webglFramebuffer[ut]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){H.__webglFramebuffer=[];for(let ut=0;ut<x.mipmaps.length;ut++)H.__webglFramebuffer[ut]=i.createFramebuffer()}else H.__webglFramebuffer=i.createFramebuffer();if(Rt)for(let ut=0,ft=et.length;ut<ft;ut++){let mt=n.get(et[ut]);mt.__webglTexture===void 0&&(mt.__webglTexture=i.createTexture(),a.memory.textures++)}if(D.samples>0&&he(D)===!1){H.__webglMultisampledFramebuffer=i.createFramebuffer(),H.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let ut=0;ut<et.length;ut++){let ft=et[ut];H.__webglColorRenderbuffer[ut]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,H.__webglColorRenderbuffer[ut]);let mt=r.convert(ft.format,ft.colorSpace),jt=r.convert(ft.type),St=S(ft.internalFormat,mt,jt,ft.normalized,ft.colorSpace,D.isXRRenderTarget===!0),Lt=oe(D);i.renderbufferStorageMultisample(i.RENDERBUFFER,Lt,St,D.width,D.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ut,i.RENDERBUFFER,H.__webglColorRenderbuffer[ut])}i.bindRenderbuffer(i.RENDERBUFFER,null),D.depthBuffer&&(H.__webglDepthRenderbuffer=i.createRenderbuffer(),yt(H.__webglDepthRenderbuffer,D,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Et){e.bindTexture(i.TEXTURE_CUBE_MAP,Q.__webglTexture),ne(i.TEXTURE_CUBE_MAP,x);for(let ut=0;ut<6;ut++)if(x.mipmaps&&x.mipmaps.length>0)for(let ft=0;ft<x.mipmaps.length;ft++)rt(H.__webglFramebuffer[ut][ft],D,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ut,ft);else rt(H.__webglFramebuffer[ut],D,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ut,0);m(x)&&C(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Rt){for(let ut=0,ft=et.length;ut<ft;ut++){let mt=et[ut],jt=n.get(mt),St=i.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(St=D.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(St,jt.__webglTexture),ne(St,mt),rt(H.__webglFramebuffer,D,mt,i.COLOR_ATTACHMENT0+ut,St,0),m(mt)&&C(St)}e.unbindTexture()}else{let ut=i.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ut=D.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ut,Q.__webglTexture),ne(ut,x),x.mipmaps&&x.mipmaps.length>0)for(let ft=0;ft<x.mipmaps.length;ft++)rt(H.__webglFramebuffer[ft],D,x,i.COLOR_ATTACHMENT0,ut,ft);else rt(H.__webglFramebuffer,D,x,i.COLOR_ATTACHMENT0,ut,0);m(x)&&C(ut),e.unbindTexture()}D.depthBuffer&&at(D)}function xt(D){let x=D.textures;for(let H=0,Q=x.length;H<Q;H++){let et=x[H];if(m(et)){let Et=L(D),Rt=n.get(et).__webglTexture;e.bindTexture(Et,Rt),C(Et),e.unbindTexture()}}}let Pt=[],Xt=[];function ee(D){if(D.samples>0){if(he(D)===!1){let x=D.textures,H=D.width,Q=D.height,et=i.COLOR_BUFFER_BIT,Et=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Rt=n.get(D),ut=x.length>1;if(ut)for(let mt=0;mt<x.length;mt++)e.bindFramebuffer(i.FRAMEBUFFER,Rt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+mt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,Rt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+mt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,Rt.__webglMultisampledFramebuffer);let ft=D.texture.mipmaps;ft&&ft.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Rt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Rt.__webglFramebuffer);for(let mt=0;mt<x.length;mt++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(et|=i.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(et|=i.STENCIL_BUFFER_BIT)),ut){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Rt.__webglColorRenderbuffer[mt]);let jt=n.get(x[mt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,jt,0)}i.blitFramebuffer(0,0,H,Q,0,0,H,Q,et,i.NEAREST),l===!0&&(Pt.length=0,Xt.length=0,Pt.push(i.COLOR_ATTACHMENT0+mt),D.depthBuffer&&D.storeMultisampledDepthBuffer===!1&&(Pt.push(Et),Xt.push(Et),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Xt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Pt))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ut)for(let mt=0;mt<x.length;mt++){e.bindFramebuffer(i.FRAMEBUFFER,Rt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+mt,i.RENDERBUFFER,Rt.__webglColorRenderbuffer[mt]);let jt=n.get(x[mt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,Rt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+mt,i.TEXTURE_2D,jt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Rt.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.storeMultisampledDepthBuffer===!1&&l){let x=D.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function oe(D){return Math.min(s.maxSamples,D.samples)}function he(D){let x=n.get(D);return D.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function B(D){let x=a.render.frame;h.get(D)!==x&&(h.set(D,x),D.update())}function we(D,x){let H=D.colorSpace,Q=D.format,et=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||H!==$r&&H!==Oi&&(De.getTransfer(H)===Xe?(Q!==ei||et!==zn)&&le("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):de("WebGLTextures: Unsupported texture color space:",H)),x}function ye(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=Y,this.resetTextureUnits=k,this.getTextureUnits=P,this.setTextureUnits=U,this.setTexture2D=ot,this.setTexture2DArray=j,this.setTexture3D=st,this.setTextureCube=lt,this.rebindTextures=dt,this.setupRenderTarget=ht,this.updateRenderTargetMipmap=xt,this.updateMultisampleRenderTarget=ee,this.setupDepthRenderbuffer=at,this.setupFrameBufferTexture=rt,this.useMultisampledRTT=he,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function Qx(i,t){function e(n,s=Oi){let r,a=De.getTransfer(s);if(n===zn)return i.UNSIGNED_BYTE;if(n===Qo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===tl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===ch)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===hh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===oh)return i.BYTE;if(n===lh)return i.SHORT;if(n===br)return i.UNSIGNED_SHORT;if(n===Ko)return i.INT;if(n===di)return i.UNSIGNED_INT;if(n===ti)return i.FLOAT;if(n===fi)return i.HALF_FLOAT;if(n===uh)return i.ALPHA;if(n===dh)return i.RGB;if(n===ei)return i.RGBA;if(n===_i)return i.DEPTH_COMPONENT;if(n===os)return i.DEPTH_STENCIL;if(n===el)return i.RED;if(n===nl)return i.RED_INTEGER;if(n===ls)return i.RG;if(n===il)return i.RG_INTEGER;if(n===sl)return i.RGBA_INTEGER;if(n===Ma||n===ba||n===Sa||n===Ea)if(a===Xe)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ma)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ba)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Sa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ea)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ma)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ba)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Sa)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ea)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===rl||n===al||n===ol||n===ll)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===rl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===al)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ol)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ll)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===cl||n===hl||n===ul||n===dl||n===fl||n===Aa||n===pl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===cl||n===hl)return a===Xe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===ul)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===dl)return r.COMPRESSED_R11_EAC;if(n===fl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Aa)return r.COMPRESSED_RG11_EAC;if(n===pl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===ml||n===gl||n===_l||n===xl||n===vl||n===yl||n===Ml||n===bl||n===Sl||n===El||n===Al||n===wl||n===Tl||n===Cl)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===ml)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===gl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===_l)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===xl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===vl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===yl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ml)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===bl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Sl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===El)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Al)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===wl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Tl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Cl)return a===Xe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Rl||n===Pl||n===Il)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Rl)return a===Xe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Pl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Il)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ll||n===Dl||n===wa||n===Nl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Ll)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Dl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===wa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Nl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Sr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var tv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ev=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,zh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new na(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Yn({vertexShader:tv,fragmentShader:ev,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ze(new ji(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},kh=class extends li{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,p=null,u=null,f=null,_=null,v=typeof XRWebGLBinding<"u",g=new zh,m={},C=e.getContextAttributes(),L=null,S=null,T=[],A=[],N=new bt,y=null,R=null,F=new dn;F.viewport=new tn;let O=new dn;O.viewport=new tn;let V=[F,O],k=new $o,P=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(w){let I=T[w];return I===void 0&&(I=new fr,T[w]=I),I.getTargetRaySpace()},this.getControllerGrip=function(w){let I=T[w];return I===void 0&&(I=new fr,T[w]=I),I.getGripSpace()},this.getHand=function(w){let I=T[w];return I===void 0&&(I=new fr,T[w]=I),I.getHandSpace()};function Y(w){let I=A.indexOf(w.inputSource);if(I===-1)return;let X=T[I];X!==void 0&&(X.update(w.inputSource,w.frame,c||a),X.dispatchEvent({type:w.type,data:w.inputSource}))}function J(){s.removeEventListener("select",Y),s.removeEventListener("selectstart",Y),s.removeEventListener("selectend",Y),s.removeEventListener("squeeze",Y),s.removeEventListener("squeezestart",Y),s.removeEventListener("squeezeend",Y),s.removeEventListener("end",J),s.removeEventListener("inputsourceschange",ot);for(let w=0;w<T.length;w++){let I=A[w];I!==null&&(A[w]=null,T[w].disconnect(I))}P=null,U=null,g.reset();for(let w in m)delete m[w];if(t.setRenderTarget(L),f=null,u=null,p=null,s=null,S=null,wt.stop(),n.isPresenting=!1,t.setPixelRatio(y),t.setSize(N.width,N.height,!1),R!==null){let w=R.camera;w.fov=R.fov,w.zoom=R.zoom,w.updateProjectionMatrix(),R=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(w){r=w,n.isPresenting===!0&&le("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(w){o=w,n.isPresenting===!0&&le("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(w){c=w},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return p===null&&v&&(p=new XRWebGLBinding(s,e)),p},this.getFrame=function(){return _},this.getSession=function(){return s},this.setSession=async function(w){if(s=w,s!==null){if(L=t.getRenderTarget(),s.addEventListener("select",Y),s.addEventListener("selectstart",Y),s.addEventListener("selectend",Y),s.addEventListener("squeeze",Y),s.addEventListener("squeezestart",Y),s.addEventListener("squeezeend",Y),s.addEventListener("end",J),s.addEventListener("inputsourceschange",ot),C.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(N),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let X=null,K=null,rt=null;C.depth&&(rt=C.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,X=C.stencil?os:_i,K=C.stencil?Sr:di);let yt={colorFormat:e.RGBA8,depthFormat:rt,scaleFactor:r};p=this.getBinding(),u=p.createProjectionLayer(yt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),S=new On(u.textureWidth,u.textureHeight,{format:ei,type:zn,depthTexture:new Ji(u.textureWidth,u.textureHeight,K,void 0,void 0,void 0,void 0,void 0,void 0,X),stencilBuffer:C.stencil,colorSpace:t.outputColorSpace,samples:C.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let X={antialias:C.antialias,alpha:!0,depth:C.depth,stencil:C.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,X),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),S=new On(f.framebufferWidth,f.framebufferHeight,{format:ei,type:zn,colorSpace:t.outputColorSpace,stencilBuffer:C.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),wt.setContext(s),wt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function ot(w){for(let I=0;I<w.removed.length;I++){let X=w.removed[I],K=A.indexOf(X);K>=0&&(A[K]=null,T[K].disconnect(X))}for(let I=0;I<w.added.length;I++){let X=w.added[I],K=A.indexOf(X);if(K===-1){for(let yt=0;yt<T.length;yt++)if(yt>=A.length){A.push(X),K=yt;break}else if(A[yt]===null){A[yt]=X,K=yt;break}if(K===-1)break}let rt=T[K];rt&&rt.connect(X)}}let j=new z,st=new z;function lt(w,I,X){j.setFromMatrixPosition(I.matrixWorld),st.setFromMatrixPosition(X.matrixWorld);let K=j.distanceTo(st),rt=I.projectionMatrix.elements,yt=X.projectionMatrix.elements,ie=rt[14]/(rt[10]-1),at=rt[14]/(rt[10]+1),dt=(rt[9]+1)/rt[5],ht=(rt[9]-1)/rt[5],xt=(rt[8]-1)/rt[0],Pt=(yt[8]+1)/yt[0],Xt=ie*xt,ee=ie*Pt,oe=K/(-xt+Pt),he=oe*-xt;if(I.matrixWorld.decompose(w.position,w.quaternion,w.scale),w.translateX(he),w.translateZ(oe),w.matrixWorld.compose(w.position,w.quaternion,w.scale),w.matrixWorldInverse.copy(w.matrixWorld).invert(),rt[10]===-1)w.projectionMatrix.copy(I.projectionMatrix),w.projectionMatrixInverse.copy(I.projectionMatrixInverse);else{let B=ie+oe,we=at+oe,ye=Xt-he,D=ee+(K-he),x=dt*at/we*B,H=ht*at/we*B;w.projectionMatrix.makePerspective(ye,D,x,H,B,we),w.projectionMatrixInverse.copy(w.projectionMatrix).invert()}}function Dt(w,I){I===null?w.matrixWorld.copy(w.matrix):w.matrixWorld.multiplyMatrices(I.matrixWorld,w.matrix),w.matrixWorldInverse.copy(w.matrixWorld).invert()}this.updateCamera=function(w){if(s===null)return;let I=w.near,X=w.far;g.texture!==null&&(g.depthNear>0&&(I=g.depthNear),g.depthFar>0&&(X=g.depthFar)),k.near=O.near=F.near=I,k.far=O.far=F.far=X,(P!==k.near||U!==k.far)&&(s.updateRenderState({depthNear:k.near,depthFar:k.far}),P=k.near,U=k.far),k.layers.mask=w.layers.mask|6,F.layers.mask=k.layers.mask&-5,O.layers.mask=k.layers.mask&-3;let K=w.parent,rt=k.cameras;Dt(k,K);for(let yt=0;yt<rt.length;yt++)Dt(rt[yt],K);rt.length===2?lt(k,F,O):k.projectionMatrix.copy(F.projectionMatrix),R===null&&w.isPerspectiveCamera&&(R={camera:w,fov:w.fov,zoom:w.zoom}),At(w,k,K)};function At(w,I,X){X===null?w.matrix.copy(I.matrixWorld):(w.matrix.copy(X.matrixWorld),w.matrix.invert(),w.matrix.multiply(I.matrixWorld)),w.matrix.decompose(w.position,w.quaternion,w.scale),w.updateMatrixWorld(!0),w.projectionMatrix.copy(I.projectionMatrix),w.projectionMatrixInverse.copy(I.projectionMatrixInverse),w.isPerspectiveCamera&&(w.fov=hr*2*Math.atan(1/w.projectionMatrix.elements[5]),w.zoom=1)}this.getCamera=function(){return k},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(w){l=w,u!==null&&(u.fixedFoveation=w),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=w)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(k)},this.getCameraTexture=function(w){return m[w]};let ae=null;function ne(w,I){if(h=I.getViewerPose(c||a),_=I,h!==null){let X=h.views;f!==null&&(t.setRenderTargetFramebuffer(S,f.framebuffer),t.setRenderTarget(S));let K=!1;X.length!==k.cameras.length&&(k.cameras.length=0,K=!0);for(let at=0;at<X.length;at++){let dt=X[at],ht=null;if(f!==null)ht=f.getViewport(dt);else{let Pt=p.getViewSubImage(u,dt);ht=Pt.viewport,at===0&&(t.setRenderTargetTextures(S,Pt.colorTexture,Pt.depthStencilTexture),t.setRenderTarget(S))}let xt=V[at];xt===void 0&&(xt=new dn,xt.layers.enable(at),xt.viewport=new tn,V[at]=xt),xt.matrix.fromArray(dt.transform.matrix),xt.matrix.decompose(xt.position,xt.quaternion,xt.scale),xt.projectionMatrix.fromArray(dt.projectionMatrix),xt.projectionMatrixInverse.copy(xt.projectionMatrix).invert(),xt.viewport.set(ht.x,ht.y,ht.width,ht.height),at===0&&(k.matrix.copy(xt.matrix),k.matrix.decompose(k.position,k.quaternion,k.scale)),K===!0&&k.cameras.push(xt)}let rt=s.enabledFeatures;if(rt&&rt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&v){p=n.getBinding();let at=p.getDepthInformation(X[0]);at&&at.isValid&&at.texture&&g.init(at,s.renderState)}if(rt&&rt.includes("camera-access")&&v){t.state.unbindTexture(),p=n.getBinding();for(let at=0;at<X.length;at++){let dt=X[at].camera;if(dt){let ht=m[dt];ht||(ht=new na,m[dt]=ht);let xt=p.getCameraImage(dt);ht.sourceTexture=xt}}}}for(let X=0;X<T.length;X++){let K=A[X],rt=T[X];K!==null&&rt!==void 0&&rt.update(K,I,c||a)}ae&&ae(w,I),I.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:I}),_=null}let wt=new lf;wt.setAnimationLoop(ne),this.setAnimationLoop=function(w){ae=w},this.dispose=function(){}}},nv=new Ge,pf=new xe;pf.set(-1,0,0,0,1,0,0,0,1);function iv(i,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,_h(i)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function s(g,m,C,L,S){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(g,m):m.isMeshLambertMaterial?(r(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(g,m),p(g,m)):m.isMeshPhongMaterial?(r(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,S)):m.isMeshMatcapMaterial?(r(g,m),_(g,m)):m.isMeshDepthMaterial?r(g,m):m.isMeshDistanceMaterial?(r(g,m),v(g,m)):m.isMeshNormalMaterial?r(g,m):m.isLineBasicMaterial?(a(g,m),m.isLineDashedMaterial&&o(g,m)):m.isPointsMaterial?l(g,m,C,L):m.isSpriteMaterial?c(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===Dn&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===Dn&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);let C=t.get(m),L=C.envMap,S=C.envMapRotation;L&&(g.envMap.value=L,g.envMapRotation.value.setFromMatrix4(nv.makeRotationFromEuler(S)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(pf),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function a(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function o(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function l(g,m,C,L){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*C,g.scale.value=L*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function c(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function p(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,C){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Dn&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=C.texture,g.transmissionSamplerSize.value.set(C.width,C.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function _(g,m){m.matcap&&(g.matcap.value=m.matcap)}function v(g,m){let C=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(C.matrixWorld),g.nearDistance.value=C.shadow.camera.near,g.farDistance.value=C.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function sv(i,t,e,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,T){let A=T.program;n.uniformBlockBinding(S,A)}function c(S,T){let A=s[S.id];A===void 0&&(g(S),A=h(S),s[S.id]=A,S.addEventListener("dispose",C));let N=T.program;n.updateUBOMapping(S,N);let y=t.render.frame;r[S.id]!==y&&(u(S),r[S.id]=y)}function h(S){let T=p();S.__bindingPointIndex=T;let A=i.createBuffer(),N=S.__size,y=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,A),i.bufferData(i.UNIFORM_BUFFER,N,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,A),A}function p(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return de("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(S){let T=s[S.id],A=S.uniforms,N=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let y=0,R=A.length;y<R;y++){let F=A[y];if(Array.isArray(F))for(let O=0,V=F.length;O<V;O++)f(F[O],y,O,N);else f(F,y,0,N)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(S,T,A,N){if(v(S,T,A,N)===!0){let y=S.__offset,R=S.value;if(Array.isArray(R)){let F=0;for(let O=0;O<R.length;O++){let V=R[O],k=m(V);_(V,S.__data,F),typeof V!="number"&&typeof V!="boolean"&&!V.isMatrix3&&!ArrayBuffer.isView(V)&&(F+=k.storage/Float32Array.BYTES_PER_ELEMENT)}}else _(R,S.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,S.__data)}}function _(S,T,A){typeof S=="number"||typeof S=="boolean"?T[0]=S:S.isMatrix3?(T[0]=S.elements[0],T[1]=S.elements[1],T[2]=S.elements[2],T[3]=0,T[4]=S.elements[3],T[5]=S.elements[4],T[6]=S.elements[5],T[7]=0,T[8]=S.elements[6],T[9]=S.elements[7],T[10]=S.elements[8],T[11]=0):ArrayBuffer.isView(S)?T.set(new S.constructor(S.buffer,S.byteOffset,T.length)):S.toArray(T,A)}function v(S,T,A,N){let y=S.value,R=T+"_"+A;if(N[R]===void 0)return typeof y=="number"||typeof y=="boolean"?N[R]=y:ArrayBuffer.isView(y)?N[R]=y.slice():N[R]=y.clone(),!0;{let F=N[R];if(typeof y=="number"||typeof y=="boolean"){if(F!==y)return N[R]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(F.equals(y)===!1)return F.copy(y),!0}}return!1}function g(S){let T=S.uniforms,A=0,N=16;for(let R=0,F=T.length;R<F;R++){let O=Array.isArray(T[R])?T[R]:[T[R]];for(let V=0,k=O.length;V<k;V++){let P=O[V],U=Array.isArray(P.value)?P.value:[P.value];for(let Y=0,J=U.length;Y<J;Y++){let ot=U[Y],j=m(ot),st=A%N,lt=st%j.boundary,Dt=st+lt;A+=lt,Dt!==0&&N-Dt<j.storage&&(A+=N-Dt),P.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),P.__offset=A,A+=j.storage}}}let y=A%N;return y>0&&(A+=N-y),S.__size=A,S.__cache={},this}function m(S){let T={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(T.boundary=4,T.storage=4):S.isVector2?(T.boundary=8,T.storage=8):S.isVector3||S.isColor?(T.boundary=16,T.storage=12):S.isVector4?(T.boundary=16,T.storage=16):S.isMatrix3?(T.boundary=48,T.storage=48):S.isMatrix4?(T.boundary=64,T.storage=64):S.isTexture?le("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(T.boundary=16,T.storage=S.byteLength):le("WebGLRenderer: Unsupported uniform value type.",S),T}function C(S){let T=S.target;T.removeEventListener("dispose",C);let A=a.indexOf(T.__bindingPointIndex);a.splice(A,1),i.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function L(){for(let S in s)i.deleteBuffer(s[S]);a=[],s={},r={}}return{bind:l,update:c,dispose:L}}var rv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Mi=null;function av(){return Mi===null&&(Mi=new Qr(rv,16,16,ls,fi),Mi.name="DFG_LUT",Mi.minFilter=wn,Mi.magFilter=wn,Mi.wrapS=mi,Mi.wrapT=mi,Mi.generateMipmaps=!1,Mi.needsUpdate=!0),Mi}var Tr=class{constructor(t={}){let{canvas:e=Cd(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:u=!1,outputBufferType:f=zn}=t;this.isWebGLRenderer=!0;let _;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");_=n.getContextAttributes().alpha}else _=a;let v=f,g=new Set([sl,il,nl]),m=new Set([zn,di,br,Sr,Qo,tl]),C=new Uint32Array(4),L=new Int32Array(4),S=new z,T=null,A=null,N=[],y=[],R=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ui,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let F=this,O=!1,V=null,k=null,P=null,U=null;this._outputColorSpace=un;let Y=0,J=0,ot=null,j=-1,st=null,lt=new tn,Dt=new tn,At=null,ae=new fe(0),ne=0,wt=e.width,w=e.height,I=1,X=null,K=null,rt=new tn(0,0,wt,w),yt=new tn(0,0,wt,w),ie=!1,at=new pr,dt=!1,ht=!1,xt=new Ge,Pt=new z,Xt=new tn,ee={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},oe=!1;function he(){return ot===null?I:1}let B=n;function we(b,G){return e.getContext(b,G)}let ye,D,x,H,Q,et,Et,Rt,ut,ft,mt,jt,St,Lt,$t,Wt,ce,q,It,pt,Nt,Ut,_t;try{let b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:p};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",Te,!1),e.addEventListener("webglcontextrestored",Ie,!1),e.addEventListener("webglcontextcreationerror",rn,!1),B===null){let G="webgl2";if(B=we(G,b),B===null)throw we(G)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Kt()}catch(b){throw e.removeEventListener("webglcontextlost",Te,!1),e.removeEventListener("webglcontextrestored",Ie,!1),e.removeEventListener("webglcontextcreationerror",rn,!1),de("WebGLRenderer: "+b.message),b}function Kt(){ye=new f_(B),ye.init(),Nt=new Qx(B,ye),D=new i_(B,ye,t,Nt),x=new jx(B,ye),D.reversedDepthBuffer&&u&&x.buffers.depth.setReversed(!0),k=B.createFramebuffer(),P=B.createFramebuffer(),U=B.createFramebuffer(),H=new g_(B),Q=new Ox,et=new Kx(B,ye,x,Q,D,Nt,H),Et=new d_(F),Rt=new xm(B),Ut=new e_(B,Rt),ut=new p_(B,Rt,H,Ut),ft=new x_(B,ut,Rt,Ut,H),q=new __(B,D,et),$t=new s_(Q),mt=new Fx(F,Et,ye,D,Ut,$t),jt=new iv(F,Q),St=new zx,Lt=new Xx(ye),ce=new t_(F,Et,x,ft,_,l),Wt=new Jx(F,ft,D),_t=new sv(B,H,D,x),It=new n_(B,ye,H),pt=new m_(B,ye,H),H.programs=mt.programs,F.capabilities=D,F.extensions=ye,F.properties=Q,F.renderLists=St,F.shadowMap=Wt,F.state=x,F.info=H}v!==zn&&(R=new y_(v,e.width,e.height,o,s,r));let Zt=new kh(F,B);this.xr=Zt,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let b=ye.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=ye.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return I},this.setPixelRatio=function(b){b!==void 0&&(I=b,this.setSize(wt,w,!1))},this.getSize=function(b){return b.set(wt,w)},this.setSize=function(b,G,ct=!0){if(Zt.isPresenting){le("WebGLRenderer: Can't change size while VR device is presenting.");return}wt=b,w=G,e.width=Math.floor(b*I),e.height=Math.floor(G*I),ct===!0&&(e.style.width=b+"px",e.style.height=G+"px"),R!==null&&R.setSize(e.width,e.height),this.setViewport(0,0,b,G)},this.getDrawingBufferSize=function(b){return b.set(wt*I,w*I).floor()},this.setDrawingBufferSize=function(b,G,ct){wt=b,w=G,I=ct,e.width=Math.floor(b*ct),e.height=Math.floor(G*ct),this.setViewport(0,0,b,G)},this.setEffects=function(b){if(v===zn){de("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let G=0;G<b.length;G++)if(b[G].isOutputPass===!0){le("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}R.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(lt)},this.getViewport=function(b){return b.copy(rt)},this.setViewport=function(b,G,ct,it){b.isVector4?rt.set(b.x,b.y,b.z,b.w):rt.set(b,G,ct,it),x.viewport(lt.copy(rt).multiplyScalar(I).round())},this.getScissor=function(b){return b.copy(yt)},this.setScissor=function(b,G,ct,it){b.isVector4?yt.set(b.x,b.y,b.z,b.w):yt.set(b,G,ct,it),x.scissor(Dt.copy(yt).multiplyScalar(I).round())},this.getScissorTest=function(){return ie},this.setScissorTest=function(b){x.setScissorTest(ie=b)},this.setOpaqueSort=function(b){X=b},this.setTransparentSort=function(b){K=b},this.getClearColor=function(b){return b.copy(ce.getClearColor())},this.setClearColor=function(){ce.setClearColor(...arguments)},this.getClearAlpha=function(){return ce.getClearAlpha()},this.setClearAlpha=function(){ce.setClearAlpha(...arguments)},this.clear=function(b=!0,G=!0,ct=!0){let it=0;if(b){let tt=!1;if(ot!==null){let Ft=ot.texture.format;tt=g.has(Ft)}if(tt){let Ft=ot.texture.type,Vt=m.has(Ft),Bt=ce.getClearColor(),Yt=ce.getClearAlpha(),Qt=Bt.r,ue=Bt.g,ve=Bt.b;Vt?(C[0]=Qt,C[1]=ue,C[2]=ve,C[3]=Yt,B.clearBufferuiv(B.COLOR,0,C)):(L[0]=Qt,L[1]=ue,L[2]=ve,L[3]=Yt,B.clearBufferiv(B.COLOR,0,L))}else it|=B.COLOR_BUFFER_BIT}G&&(it|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),ct&&(it|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),it!==0&&B.clear(it)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),V=b},this.dispose=function(){e.removeEventListener("webglcontextlost",Te,!1),e.removeEventListener("webglcontextrestored",Ie,!1),e.removeEventListener("webglcontextcreationerror",rn,!1),ce.dispose(),St.dispose(),Lt.dispose(),Q.dispose(),Et.dispose(),ft.dispose(),Ut.dispose(),_t.dispose(),mt.dispose(),Zt.dispose(),Zt.removeEventListener("sessionstart",vt),Zt.removeEventListener("sessionend",Mt),Ot.stop()};function Te(b){b.preventDefault(),ph("WebGLRenderer: Context Lost."),O=!0}function Ie(){ph("WebGLRenderer: Context Restored."),O=!1;let b=H.autoReset,G=Wt.enabled,ct=Wt.autoUpdate,it=Wt.needsUpdate,tt=Wt.type;Kt(),H.autoReset=b,Wt.enabled=G,Wt.autoUpdate=ct,Wt.needsUpdate=it,Wt.type=tt}function rn(b){de("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Me(b){let G=b.target;G.removeEventListener("dispose",Me),Se(G)}function Se(b){en(b),Q.remove(b)}function en(b){let G=Q.get(b).programs;G!==void 0&&(G.forEach(function(ct){mt.releaseProgram(ct)}),b.isShaderMaterial&&mt.releaseShaderCache(b))}this.renderBufferDirect=function(b,G,ct,it,tt,Ft){G===null&&(G=ee);let Vt=tt.isMesh&&tt.matrixWorld.determinantAffine()<0,Bt=Lr(b,G,ct,it,tt);x.setMaterial(it,Vt);let Yt=ct.index,Qt=1;if(it.wireframe===!0){if(Yt=ut.getWireframeAttribute(ct),Yt===void 0)return;Qt=2}let ue=ct.drawRange,ve=ct.attributes.position,qt=ue.start*Qt,Ce=(ue.start+ue.count)*Qt;Ft!==null&&(qt=Math.max(qt,Ft.start*Qt),Ce=Math.min(Ce,(Ft.start+Ft.count)*Qt)),Yt!==null?(qt=Math.max(qt,0),Ce=Math.min(Ce,Yt.count)):ve!=null&&(qt=Math.max(qt,0),Ce=Math.min(Ce,ve.count));let Je=Ce-qt;if(Je<0||Je===1/0)return;Ut.setup(tt,it,Bt,ct,Yt);let $e,ke=It;if(Yt!==null&&($e=Rt.get(Yt),ke=pt,ke.setIndex($e)),tt.isMesh)it.wireframe===!0?(x.setLineWidth(it.wireframeLinewidth*he()),ke.setMode(B.LINES)):ke.setMode(B.TRIANGLES);else if(tt.isLine){let xn=it.linewidth;xn===void 0&&(xn=1),x.setLineWidth(xn*he()),tt.isLineSegments?ke.setMode(B.LINES):tt.isLineLoop?ke.setMode(B.LINE_LOOP):ke.setMode(B.LINE_STRIP)}else tt.isPoints?ke.setMode(B.POINTS):tt.isSprite&&ke.setMode(B.TRIANGLES);if(tt.isBatchedMesh)if(ye.get("WEBGL_multi_draw"))ke.renderMultiDraw(tt._multiDrawStarts,tt._multiDrawCounts,tt._multiDrawCount);else{let xn=tt._multiDrawStarts,Gt=tt._multiDrawCounts,bn=tt._multiDrawCount,Le=Yt?Rt.get(Yt).bytesPerElement:1,nn=Q.get(it).currentProgram.getUniforms();for(let Nn=0;Nn<bn;Nn++)nn.setValue(B,"_gl_DrawID",Nn),ke.render(xn[Nn]/Le,Gt[Nn])}else if(tt.isInstancedMesh)ke.renderInstances(qt,Je,tt.count);else if(ct.isInstancedBufferGeometry){let xn=ct._maxInstanceCount!==void 0?ct._maxInstanceCount:1/0,Gt=Math.min(ct.instanceCount,xn);ke.renderInstances(qt,Je,Gt)}else ke.render(qt,Je)};function Si(b,G,ct,it){V!==null&&b.isNodeMaterial&&V.setObject(it,b),dt===!0&&$t.setState(b,ct,!1),b.transparent===!0&&b.side===on&&b.forceSinglePass===!1?(b.side=Dn,b.needsUpdate=!0,Ke(b,G,it),b.side=ss,b.needsUpdate=!0,Ke(b,G,it),b.side=on):Ke(b,G,it)}this.compile=function(b,G,ct=null){ct===null&&(ct=b),V!==null&&V.renderStart(b,G,ct),A=Lt.get(ct),A.init(G),y.push(A),ct.traverseVisible(function(tt){tt.isLight&&tt.layers.test(G.layers)&&(A.pushLight(tt),tt.castShadow&&A.pushShadow(tt))}),b!==ct&&b.traverseVisible(function(tt){tt.isLight&&tt.layers.test(G.layers)&&(A.pushLight(tt),tt.castShadow&&A.pushShadow(tt))}),A.setupLights(),V!==null&&V.updateLights(A.state.lightsArray),ht=this.localClippingEnabled,dt=$t.init(this.clippingPlanes,ht),dt===!0&&$t.setGlobalState(this.clippingPlanes,G),V!==null&&Wt.render(A.state.shadowsArray,ct,G);let it=new Set;return b.traverse(function(tt){if(!(tt.isMesh||tt.isPoints||tt.isLine||tt.isSprite))return;let Ft=tt.material;if(Ft)if(Array.isArray(Ft))for(let Vt=0;Vt<Ft.length;Vt++){let Bt=Ft[Vt];Si(Bt,ct,G,tt),it.add(Bt)}else Si(Ft,ct,G,tt),it.add(Ft)}),A=y.pop(),V!==null&&V.renderEnd(),it},this.compileAsync=function(b,G,ct=null){let it=this.compile(b,G,ct);return new Promise(tt=>{function Ft(){if(it.forEach(function(Vt){let Yt=Q.get(Vt).currentProgram;(Yt===void 0||Yt.isReady())&&it.delete(Vt)}),it.size===0){tt(b);return}setTimeout(Ft,10)}ye.get("KHR_parallel_shader_compile")!==null?Ft():setTimeout(Ft,10)})};let We=null;function W(b){We&&We(b)}function vt(){Ot.stop()}function Mt(){Ot.start()}let Ot=new lf;Ot.setAnimationLoop(W),typeof self<"u"&&Ot.setContext(self),this.setAnimationLoop=function(b){We=b,Zt.setAnimationLoop(b),b===null?Ot.stop():Ot.start()},Zt.addEventListener("sessionstart",vt),Zt.addEventListener("sessionend",Mt),this.render=function(b,G){if(G!==void 0&&G.isCamera!==!0){de("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(O===!0)return;V!==null&&V.renderStart(b,G);let ct=Zt.enabled===!0&&Zt.isPresenting===!0,it=R!==null&&(ot===null||ct)&&R.begin(F,ot);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),G.parent===null&&G.matrixWorldAutoUpdate===!0&&G.updateMatrixWorld(),Zt.enabled===!0&&Zt.isPresenting===!0&&(R===null||R.isCompositing()===!1)&&(Zt.cameraAutoUpdate===!0&&Zt.updateCamera(G),G=Zt.getCamera()),b.isScene===!0&&b.onBeforeRender(F,b,G,ot),A=Lt.get(b,y.length),A.init(G),A.state.textureUnits=et.getTextureUnits(),y.push(A),xt.multiplyMatrices(G.projectionMatrix,G.matrixWorldInverse),at.setFromProjectionMatrix(xt,oi,G.reversedDepth),ht=this.localClippingEnabled,dt=$t.init(this.clippingPlanes,ht),T=St.get(b,N.length),T.init(),N.push(T),Zt.enabled===!0&&Zt.isPresenting===!0){let Vt=F.xr.getDepthSensingMesh();Vt!==null&&Ne(Vt,G,-1/0,F.sortObjects)}Ne(b,G,0,F.sortObjects),T.finish(),V!==null&&V.updateLights(A.state.lightsArray),F.sortObjects===!0&&T.sort(X,K),oe=Zt.enabled===!1||Zt.isPresenting===!1||Zt.hasDepthSensing()===!1,oe&&ce.addToRenderList(T,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),dt===!0&&$t.beginShadows();let tt=A.state.shadowsArray;if(Wt.render(tt,b,G),dt===!0&&$t.endShadows(),(it&&R.hasRenderPass())===!1){let Vt=T.opaque,Bt=T.transmissive;if(A.setupLights(),G.isArrayCamera){let Yt=G.cameras;if(Bt.length>0)for(let Qt=0,ue=Yt.length;Qt<ue;Qt++){let ve=Yt[Qt];Fe(Vt,Bt,b,ve)}oe&&ce.render(b);for(let Qt=0,ue=Yt.length;Qt<ue;Qt++){let ve=Yt[Qt];se(T,b,ve,ve.viewport)}}else Bt.length>0&&Fe(Vt,Bt,b,G),oe&&ce.render(b),se(T,b,G)}ot!==null&&J===0&&(et.updateMultisampleRenderTarget(ot),et.updateRenderTargetMipmap(ot)),it&&R.end(F),b.isScene===!0&&b.onAfterRender(F,b,G),Ut.resetDefaultState(),j=-1,st=null,y.pop(),y.length>0?(A=y[y.length-1],et.setTextureUnits(A.state.textureUnits),dt===!0&&$t.setGlobalState(F.clippingPlanes,A.state.camera)):A=null,N.pop(),N.length>0?T=N[N.length-1]:T=null,V!==null&&V.renderEnd()};function Ne(b,G,ct,it){if(b.visible===!1)return;if(b.layers.test(G.layers)){if(b.isGroup)ct=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(G);else if(b.isLightProbeGrid)A.pushLightProbeGrid(b);else if(b.isLight)A.pushLight(b),b.castShadow&&A.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum(at)){it&&Xt.setFromMatrixPosition(b.matrixWorld).applyMatrix4(xt);let Vt=ft.update(b),Bt=b.material;Bt.visible&&T.push(b,Vt,Bt,ct,Xt.z,null,G)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum(at))){let Vt=ft.update(b),Bt=b.material;if(it&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Xt.copy(b.boundingSphere.center)):(Vt.boundingSphere===null&&Vt.computeBoundingSphere(),Xt.copy(Vt.boundingSphere.center)),Xt.applyMatrix4(b.matrixWorld).applyMatrix4(xt)),Array.isArray(Bt)){let Yt=Vt.groups;for(let Qt=0,ue=Yt.length;Qt<ue;Qt++){let ve=Yt[Qt],qt=Bt[ve.materialIndex];qt&&qt.visible&&T.push(b,Vt,qt,ct,Xt.z,ve,G)}}else Bt.visible&&T.push(b,Vt,Bt,ct,Xt.z,null,G)}}let Ft=b.children;for(let Vt=0,Bt=Ft.length;Vt<Bt;Vt++)Ne(Ft[Vt],G,ct,it)}function se(b,G,ct,it){let{opaque:tt,transmissive:Ft,transparent:Vt}=b;A.setupLightsView(ct),dt===!0&&$t.setGlobalState(F.clippingPlanes,ct),it&&x.viewport(lt.copy(it)),tt.length>0&&Ye(tt,G,ct),Ft.length>0&&Ye(Ft,G,ct),Vt.length>0&&Ye(Vt,G,ct),x.buffers.depth.setTest(!0),x.buffers.depth.setMask(!0),x.buffers.color.setMask(!0),x.setPolygonOffset(!1)}function Fe(b,G,ct,it){if((ct.isScene===!0?ct.overrideMaterial:null)!==null)return;if(A.state.transmissionRenderTarget[it.id]===void 0){let qt=ye.has("EXT_color_buffer_half_float")||ye.has("EXT_color_buffer_float");A.state.transmissionRenderTarget[it.id]=new On(1,1,{generateMipmaps:!0,type:qt?fi:zn,minFilter:as,samples:Math.max(4,D.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:De.workingColorSpace})}let Ft=A.state.transmissionRenderTarget[it.id],Vt=it.viewport||lt;Ft.setSize(Vt.z*F.transmissionResolutionScale,Vt.w*F.transmissionResolutionScale);let Bt=F.getRenderTarget(),Yt=F.getActiveCubeFace(),Qt=F.getActiveMipmapLevel();F.setRenderTarget(Ft),F.getClearColor(ae),ne=F.getClearAlpha(),ne<1&&F.setClearColor(16777215,.5),F.clear(),oe&&ce.render(ct);let ue=F.toneMapping;F.toneMapping=ui;let ve=it.viewport;if(it.viewport!==void 0&&(it.viewport=void 0),A.setupLightsView(it),dt===!0&&$t.setGlobalState(F.clippingPlanes,it),Ye(b,ct,it),et.updateMultisampleRenderTarget(Ft),et.updateRenderTargetMipmap(Ft),ye.has("WEBGL_multisampled_render_to_texture")===!1){let qt=!1;for(let Ce=0,Je=G.length;Ce<Je;Ce++){let $e=G[Ce],{object:ke,geometry:xn,material:Gt,group:bn}=$e;if(Gt.side===on&&ke.layers.test(it.layers)){let Le=Gt.side;Gt.side=Dn,Gt.needsUpdate=!0,be(ke,ct,it,xn,Gt,bn),Gt.side=Le,Gt.needsUpdate=!0,qt=!0}}qt===!0&&(et.updateMultisampleRenderTarget(Ft),et.updateRenderTargetMipmap(Ft))}F.setRenderTarget(Bt,Yt,Qt),F.setClearColor(ae,ne),ve!==void 0&&(it.viewport=ve),F.toneMapping=ue}function Ye(b,G,ct){let it=G.isScene===!0?G.overrideMaterial:null;for(let tt=0,Ft=b.length;tt<Ft;tt++){let Vt=b[tt],{object:Bt,geometry:Yt,group:Qt}=Vt,ue=Vt.material;ue.allowOverride===!0&&it!==null&&(ue=it),Bt.layers.test(ct.layers)&&be(Bt,G,ct,Yt,ue,Qt)}}function be(b,G,ct,it,tt,Ft){V!==null&&tt.isNodeMaterial&&V.setObject(b,tt),b.onBeforeRender(F,G,ct,it,tt,Ft),b.modelViewMatrix.multiplyMatrices(ct.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),tt.onBeforeRender(F,G,ct,it,b,Ft),tt.transparent===!0&&tt.side===on&&tt.forceSinglePass===!1?(tt.side=Dn,tt.needsUpdate=!0,F.renderBufferDirect(ct,G,it,tt,b,Ft),tt.side=ss,tt.needsUpdate=!0,F.renderBufferDirect(ct,G,it,tt,b,Ft),tt.side=on):F.renderBufferDirect(ct,G,it,tt,b,Ft),b.onAfterRender(F,G,ct,it,tt,Ft)}function Ke(b,G,ct){G.isScene!==!0&&(G=ee);let it=Q.get(b),tt=A.state.lights,Ft=A.state.shadowsArray,Vt=tt.state.version,Bt=mt.getParameters(b,tt.state,Ft,G,ct,A.state.lightProbeGridArray),Yt=mt.getProgramCacheKey(Bt),Qt=it.programs;it.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?G.environment:null,it.fog=G.fog;let ue=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;it.envMap=Et.get(b.envMap||it.environment,ue),it.envMapRotation=it.environment!==null&&b.envMap===null?G.environmentRotation:b.envMapRotation,Qt===void 0&&(b.addEventListener("dispose",Me),Qt=new Map,it.programs=Qt);let ve=Qt.get(Yt);if(ve!==void 0){if(it.currentProgram===ve&&it.lightsStateVersion===Vt)return us(b,Bt),ve}else Bt.uniforms=mt.getUniforms(b),V!==null&&b.isNodeMaterial&&V.build(b,ct,Bt),b.onBeforeCompile(Bt,F),ve=mt.acquireProgram(Bt,Yt),Qt.set(Yt,ve),it.uniforms=Bt.uniforms;let qt=it.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(qt.clippingPlanes=$t.uniform),us(b,Bt),it.needsLights=Ds(b),it.lightsStateVersion=Vt,it.needsLights&&(qt.ambientLightColor.value=tt.state.ambient,qt.lightProbe.value=tt.state.probe,qt.sunLights.value=tt.state.sun,qt.sunLightShadows.value=tt.state.sunShadow,qt.directionalLights.value=tt.state.directional,qt.directionalLightShadows.value=tt.state.directionalShadow,qt.spotLights.value=tt.state.spot,qt.spotLightShadows.value=tt.state.spotShadow,qt.rectAreaLights.value=tt.state.rectArea,qt.ltc_1.value=tt.state.rectAreaLTC1,qt.ltc_2.value=tt.state.rectAreaLTC2,qt.pointLights.value=tt.state.point,qt.pointLightShadows.value=tt.state.pointShadow,qt.hemisphereLights.value=tt.state.hemi,qt.sunShadowMatrix.value=tt.state.sunShadowMatrix,qt.sunShadowCascade.value=tt.state.sunShadowCascade,qt.directionalShadowMatrix.value=tt.state.directionalShadowMatrix,qt.spotLightMatrix.value=tt.state.spotLightMatrix,qt.spotLightMap.value=tt.state.spotLightMap,qt.pointShadowMatrix.value=tt.state.pointShadowMatrix),it.lightProbeGrid=A.state.lightProbeGridArray.length>0,it.currentProgram=ve,it.uniformsList=null,ve}function Jn(b){if(b.uniformsList===null){let G=b.currentProgram.getUniforms();b.uniformsList=wr.seqWithValue(G.seq,b.uniforms)}return b.uniformsList}function us(b,G){let ct=Q.get(b);ct.outputColorSpace=G.outputColorSpace,ct.batching=G.batching,ct.batchingColor=G.batchingColor,ct.instancing=G.instancing,ct.instancingColor=G.instancingColor,ct.instancingMorph=G.instancingMorph,ct.skinning=G.skinning,ct.morphTargets=G.morphTargets,ct.morphNormals=G.morphNormals,ct.morphColors=G.morphColors,ct.morphTargetsCount=G.morphTargetsCount,ct.numClippingPlanes=G.numClippingPlanes,ct.numIntersection=G.numClipIntersection,ct.vertexAlphas=G.vertexAlphas,ct.vertexTangents=G.vertexTangents,ct.toneMapping=G.toneMapping}function Ls(b,G){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;S.setFromMatrixPosition(G.matrixWorld);for(let ct=0,it=b.length;ct<it;ct++){let tt=b[ct];if(tt.texture!==null&&tt.boundingBox.containsPoint(S))return tt}return null}function Lr(b,G,ct,it,tt){G.isScene!==!0&&(G=ee),et.resetTextureUnits();let Ft=G.fog,Vt=it.isMeshStandardMaterial||it.isMeshLambertMaterial||it.isMeshPhongMaterial?G.environment:null,Bt=ot===null?F.outputColorSpace:ot.isXRRenderTarget===!0?ot.texture.colorSpace:De.workingColorSpace,Yt=it.isMeshStandardMaterial||it.isMeshLambertMaterial&&!it.envMap||it.isMeshPhongMaterial&&!it.envMap,Qt=Et.get(it.envMap||Vt,Yt),ue=it.vertexColors===!0&&!!ct.attributes.color&&ct.attributes.color.itemSize===4,ve=!!ct.attributes.tangent&&(!!it.normalMap||it.anisotropy>0),qt=!!ct.morphAttributes.position,Ce=!!ct.morphAttributes.normal,Je=!!ct.morphAttributes.color,$e=ui;it.toneMapped&&(ot===null||ot.isXRRenderTarget===!0)&&($e=F.toneMapping);let ke=ct.morphAttributes.position||ct.morphAttributes.normal||ct.morphAttributes.color,xn=ke!==void 0?ke.length:0,Gt=Q.get(it),bn=A.state.lights;if(dt===!0&&(ht===!0||b!==st)){let Ve=b===st&&it.id===j;$t.setState(it,b,Ve)}let Le=!1;it.version===Gt.__version?(Gt.needsLights&&Gt.lightsStateVersion!==bn.state.version||Gt.outputColorSpace!==Bt||tt.isBatchedMesh&&Gt.batching===!1||!tt.isBatchedMesh&&Gt.batching===!0||tt.isBatchedMesh&&Gt.batchingColor===!0&&tt._colorsTexture===null||tt.isBatchedMesh&&Gt.batchingColor===!1&&tt._colorsTexture!==null||tt.isInstancedMesh&&Gt.instancing===!1||!tt.isInstancedMesh&&Gt.instancing===!0||tt.isSkinnedMesh&&Gt.skinning===!1||!tt.isSkinnedMesh&&Gt.skinning===!0||tt.isInstancedMesh&&Gt.instancingColor===!0&&tt.instanceColor===null||tt.isInstancedMesh&&Gt.instancingColor===!1&&tt.instanceColor!==null||tt.isInstancedMesh&&Gt.instancingMorph===!0&&tt.morphTexture===null||tt.isInstancedMesh&&Gt.instancingMorph===!1&&tt.morphTexture!==null||Gt.envMap!==Qt||it.fog===!0&&Gt.fog!==Ft||Gt.numClippingPlanes!==void 0&&(Gt.numClippingPlanes!==$t.numPlanes||Gt.numIntersection!==$t.numIntersection)||Gt.vertexAlphas!==ue||Gt.vertexTangents!==ve||Gt.morphTargets!==qt||Gt.morphNormals!==Ce||Gt.morphColors!==Je||Gt.toneMapping!==$e||Gt.morphTargetsCount!==xn||!!Gt.lightProbeGrid!=A.state.lightProbeGridArray.length>0)&&(Le=!0):(Le=!0,Gt.__version=it.version);let nn=Gt.currentProgram;Le===!0&&(nn=Ke(it,G,tt),V&&it.isNodeMaterial&&V.onUpdateProgram(it,nn,Gt));let Nn=!1,Sn=!1,ki=!1,me=nn.getUniforms(),Be=Gt.uniforms;if(x.useProgram(nn.program)&&(Nn=!0,Sn=!0,ki=!0),it.id!==j&&(j=it.id,Sn=!0),Gt.needsLights){let Ve=Ls(A.state.lightProbeGridArray,tt);Gt.lightProbeGrid!==Ve&&(Gt.lightProbeGrid=Ve,Sn=!0)}if(Nn||st!==b){x.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),me.setValue(B,"projectionMatrix",b.projectionMatrix),me.setValue(B,"viewMatrix",b.matrixWorldInverse);let Un=me.map.cameraPosition;Un!==void 0&&Un.setValue(B,Pt.setFromMatrixPosition(b.matrixWorld)),D.logarithmicDepthBuffer&&me.setValue(B,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(it.isMeshPhongMaterial||it.isMeshToonMaterial||it.isMeshLambertMaterial||it.isMeshBasicMaterial||it.isMeshStandardMaterial||it.isShaderMaterial)&&me.setValue(B,"isOrthographic",b.isOrthographicCamera===!0),st!==b&&(st=b,Sn=!0,ki=!0)}if(Gt.needsLights&&(bn.state.sunShadowMap.length>0&&me.setValue(B,"sunShadowMap",bn.state.sunShadowMap,et),bn.state.directionalShadowMap.length>0&&me.setValue(B,"directionalShadowMap",bn.state.directionalShadowMap,et),bn.state.spotShadowMap.length>0&&me.setValue(B,"spotShadowMap",bn.state.spotShadowMap,et),bn.state.pointShadowMap.length>0&&me.setValue(B,"pointShadowMap",bn.state.pointShadowMap,et)),tt.isSkinnedMesh){me.setOptional(B,tt,"bindMatrix"),me.setOptional(B,tt,"bindMatrixInverse");let Ve=tt.skeleton;Ve&&(Ve.boneTexture===null&&Ve.computeBoneTexture(),me.setValue(B,"boneTexture",Ve.boneTexture,et))}tt.isBatchedMesh&&(me.setOptional(B,tt,"batchingTexture"),me.setValue(B,"batchingTexture",tt._matricesTexture,et),me.setOptional(B,tt,"batchingIdTexture"),me.setValue(B,"batchingIdTexture",tt._indirectTexture,et),me.setOptional(B,tt,"batchingColorTexture"),tt._colorsTexture!==null&&me.setValue(B,"batchingColorTexture",tt._colorsTexture,et));let ni=ct.morphAttributes;if((ni.position!==void 0||ni.normal!==void 0||ni.color!==void 0)&&q.update(tt,ct,nn),(Sn||Gt.receiveShadow!==tt.receiveShadow)&&(Gt.receiveShadow=tt.receiveShadow,me.setValue(B,"receiveShadow",tt.receiveShadow)),(it.isMeshStandardMaterial||it.isMeshLambertMaterial||it.isMeshPhongMaterial)&&it.envMap===null&&G.environment!==null&&(Be.envMapIntensity.value=G.environmentIntensity),Be.dfgLUT!==void 0&&(Be.dfgLUT.value=av()),Sn){if(me.setValue(B,"toneMappingExposure",F.toneMappingExposure),Gt.needsLights&&zi(Be,ki),Ft&&it.fog===!0&&jt.refreshFogUniforms(Be,Ft),jt.refreshMaterialUniforms(Be,it,I,w,A.state.transmissionRenderTarget[b.id]),Gt.needsLights&&Gt.lightProbeGrid){let Ve=Gt.lightProbeGrid;Be.probesSH.value=Ve.texture,Be.probesMin.value.copy(Ve.boundingBox.min),Be.probesMax.value.copy(Ve.boundingBox.max),Be.probesResolution.value.copy(Ve.resolution)}wr.upload(B,Jn(Gt),Be,et)}if(it.isShaderMaterial&&it.uniformsNeedUpdate===!0&&(wr.upload(B,Jn(Gt),Be,et),it.uniformsNeedUpdate=!1),it.isSpriteMaterial&&me.setValue(B,"center",tt.center),me.setValue(B,"modelViewMatrix",tt.modelViewMatrix),me.setValue(B,"normalMatrix",tt.normalMatrix),me.setValue(B,"modelMatrix",tt.matrixWorld),it.uniformsGroups!==void 0){let Ve=it.uniformsGroups;for(let Un=0,Vi=Ve.length;Un<Vi;Un++){let Vn=Ve[Un];_t.update(Vn,nn),_t.bind(Vn,nn)}}return nn}function zi(b,G){b.ambientLightColor.needsUpdate=G,b.lightProbe.needsUpdate=G,b.sunLights.needsUpdate=G,b.sunLightShadows.needsUpdate=G,b.directionalLights.needsUpdate=G,b.directionalLightShadows.needsUpdate=G,b.pointLights.needsUpdate=G,b.pointLightShadows.needsUpdate=G,b.spotLights.needsUpdate=G,b.spotLightShadows.needsUpdate=G,b.rectAreaLights.needsUpdate=G,b.hemisphereLights.needsUpdate=G}function Ds(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return Y},this.getActiveMipmapLevel=function(){return J},this.getRenderTarget=function(){return ot},this.setRenderTargetTextures=function(b,G,ct){let it=Q.get(b);it.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,it.__autoAllocateDepthBuffer===!1&&(it.__useRenderToTexture=!1),Q.get(b.texture).__webglTexture=G,Q.get(b.depthTexture).__webglTexture=it.__autoAllocateDepthBuffer?void 0:ct,it.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,G){let ct=Q.get(b);ct.__webglFramebuffer=G,ct.__useDefaultFramebuffer=G===void 0},this.setRenderTarget=function(b,G=0,ct=0){ot=b,Y=G,J=ct;let it=null,tt=!1,Ft=!1;if(b){let Bt=Q.get(b);if(Bt.__useDefaultFramebuffer!==void 0){x.bindFramebuffer(B.FRAMEBUFFER,Bt.__webglFramebuffer),lt.copy(b.viewport),Dt.copy(b.scissor),At=b.scissorTest,x.viewport(lt),x.scissor(Dt),x.setScissorTest(At),j=-1;return}else if(Bt.__webglFramebuffer===void 0)et.setupRenderTarget(b);else if(Bt.__hasExternalTextures)et.rebindTextures(b,Q.get(b.texture).__webglTexture,Q.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let ue=b.depthTexture;if(Bt.__boundDepthTexture!==ue){if(ue!==null&&Q.has(ue)&&(b.width!==ue.image.width||b.height!==ue.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");et.setupDepthRenderbuffer(b)}}let Yt=b.texture;(Yt.isData3DTexture||Yt.isDataArrayTexture||Yt.isCompressedArrayTexture)&&(Ft=!0);let Qt=Q.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Qt[G])?it=Qt[G][ct]:it=Qt[G],tt=!0):b.samples>0&&et.useMultisampledRTT(b)===!1?it=Q.get(b).__webglMultisampledFramebuffer:Array.isArray(Qt)?it=Qt[ct]:it=Qt,lt.copy(b.viewport),Dt.copy(b.scissor),At=b.scissorTest}else lt.copy(rt).multiplyScalar(I).floor(),Dt.copy(yt).multiplyScalar(I).floor(),At=ie;if(ct!==0&&(it=k),x.bindFramebuffer(B.FRAMEBUFFER,it)&&x.drawBuffers(b,it),x.viewport(lt),x.scissor(Dt),x.setScissorTest(At),tt){let Bt=Q.get(b.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+G,Bt.__webglTexture,ct)}else if(Ft){let Bt=G;for(let Yt=0;Yt<b.textures.length;Yt++){let Qt=Q.get(b.textures[Yt]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+Yt,Qt.__webglTexture,ct,Bt)}}else if(b!==null&&ct!==0){let Bt=Q.get(b.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Bt.__webglTexture,ct)}j=-1};function Dr(b){let G=Q.get(b);return(G.__readFormat!==b.format||G.__readType!==b.type)&&(G.__readFormat=b.format,G.__readType=b.type,G.__formatReadable=D.textureFormatReadable(b.format),G.__typeReadable=D.textureTypeReadable(b.type)),G}this.readRenderTargetPixels=function(b,G,ct,it,tt,Ft,Vt,Bt=0){if(!(b&&b.isWebGLRenderTarget)){de("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Yt=Q.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Vt!==void 0&&(Yt=Yt[Vt]),Yt){x.bindFramebuffer(B.FRAMEBUFFER,Yt);try{let Qt=b.textures[Bt],ue=Qt.format,ve=Qt.type;b.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+Bt);let qt=Dr(Qt);if(qt.__formatReadable===!1){de("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(qt.__typeReadable===!1){de("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}G>=0&&G<=b.width-it&&ct>=0&&ct<=b.height-tt&&B.readPixels(G,ct,it,tt,Nt.convert(ue),Nt.convert(ve),Ft)}finally{let Qt=ot!==null?Q.get(ot).__webglFramebuffer:null;x.bindFramebuffer(B.FRAMEBUFFER,Qt)}}},this.readRenderTargetPixelsAsync=async function(b,G,ct,it,tt,Ft,Vt,Bt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Yt=Q.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Vt!==void 0&&(Yt=Yt[Vt]),Yt)if(G>=0&&G<=b.width-it&&ct>=0&&ct<=b.height-tt){x.bindFramebuffer(B.FRAMEBUFFER,Yt);let Qt=b.textures[Bt],ue=Qt.format,ve=Qt.type;b.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+Bt);let qt=Dr(Qt);if(qt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(qt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ce=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ce),B.bufferData(B.PIXEL_PACK_BUFFER,Ft.byteLength,B.STREAM_READ),B.readPixels(G,ct,it,tt,Nt.convert(ue),Nt.convert(ve),0),B.bindBuffer(B.PIXEL_PACK_BUFFER,null);let Je=ot!==null?Q.get(ot).__webglFramebuffer:null;x.bindFramebuffer(B.FRAMEBUFFER,Je);let $e=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Pd(B,$e,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ce),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,Ft),B.bindBuffer(B.PIXEL_PACK_BUFFER,null),B.deleteBuffer(Ce),B.deleteSync($e),Ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,G=null,ct=0){let it=Math.pow(2,-ct),tt=Math.floor(b.image.width*it),Ft=Math.floor(b.image.height*it),Vt=G!==null?G.x:0,Bt=G!==null?G.y:0;et.setTexture2D(b,0),B.copyTexSubImage2D(B.TEXTURE_2D,ct,0,0,Vt,Bt,tt,Ft),x.unbindTexture()},this.copyTextureToTexture=function(b,G,ct=null,it=null,tt=0,Ft=0){let Vt,Bt,Yt,Qt,ue,ve,qt,Ce,Je,$e=b.isCompressedTexture?b.mipmaps[Ft]:b.image;if(ct!==null)Vt=ct.max.x-ct.min.x,Bt=ct.max.y-ct.min.y,Yt=ct.isBox3?ct.max.z-ct.min.z:1,Qt=ct.min.x,ue=ct.min.y,ve=ct.isBox3?ct.min.z:0;else{let Be=Math.pow(2,-tt);Vt=Math.floor($e.width*Be),Bt=Math.floor($e.height*Be),b.isDataArrayTexture?Yt=$e.depth:b.isData3DTexture?Yt=Math.floor($e.depth*Be):Yt=1,Qt=0,ue=0,ve=0}it!==null?(qt=it.x,Ce=it.y,Je=it.z):(qt=0,Ce=0,Je=0);let ke=Nt.convert(G.format),xn=Nt.convert(G.type),Gt;G.isData3DTexture?(et.setTexture3D(G,0),Gt=B.TEXTURE_3D):G.isDataArrayTexture||G.isCompressedArrayTexture?(et.setTexture2DArray(G,0),Gt=B.TEXTURE_2D_ARRAY):(et.setTexture2D(G,0),Gt=B.TEXTURE_2D),x.activeTexture(B.TEXTURE0),x.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,G.flipY),x.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),x.pixelStorei(B.UNPACK_ALIGNMENT,G.unpackAlignment);let bn=x.getParameter(B.UNPACK_ROW_LENGTH),Le=x.getParameter(B.UNPACK_IMAGE_HEIGHT),nn=x.getParameter(B.UNPACK_SKIP_PIXELS),Nn=x.getParameter(B.UNPACK_SKIP_ROWS),Sn=x.getParameter(B.UNPACK_SKIP_IMAGES);x.pixelStorei(B.UNPACK_ROW_LENGTH,$e.width),x.pixelStorei(B.UNPACK_IMAGE_HEIGHT,$e.height),x.pixelStorei(B.UNPACK_SKIP_PIXELS,Qt),x.pixelStorei(B.UNPACK_SKIP_ROWS,ue),x.pixelStorei(B.UNPACK_SKIP_IMAGES,ve);let ki=b.isDataArrayTexture||b.isData3DTexture,me=G.isDataArrayTexture||G.isData3DTexture;if(b.isDepthTexture){let Be=Q.get(b),ni=Q.get(G),Ve=Q.get(Be.__renderTarget),Un=Q.get(ni.__renderTarget);x.bindFramebuffer(B.READ_FRAMEBUFFER,Ve.__webglFramebuffer),x.bindFramebuffer(B.DRAW_FRAMEBUFFER,Un.__webglFramebuffer);for(let Vi=0;Vi<Yt;Vi++)ki&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Q.get(b).__webglTexture,tt,ve+Vi),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Q.get(G).__webglTexture,Ft,Je+Vi)),B.blitFramebuffer(Qt,ue,Vt,Bt,qt,Ce,Vt,Bt,B.DEPTH_BUFFER_BIT,B.NEAREST);x.bindFramebuffer(B.READ_FRAMEBUFFER,null),x.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(tt!==0||b.isRenderTargetTexture||Q.has(b)){let Be=Q.get(b),ni=Q.get(G);x.bindFramebuffer(B.READ_FRAMEBUFFER,P),x.bindFramebuffer(B.DRAW_FRAMEBUFFER,U);for(let Ve=0;Ve<Yt;Ve++)ki?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Be.__webglTexture,tt,ve+Ve):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Be.__webglTexture,tt),me?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,ni.__webglTexture,Ft,Je+Ve):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,ni.__webglTexture,Ft),tt!==0?B.blitFramebuffer(Qt,ue,Vt,Bt,qt,Ce,Vt,Bt,B.COLOR_BUFFER_BIT,B.NEAREST):me?B.copyTexSubImage3D(Gt,Ft,qt,Ce,Je+Ve,Qt,ue,Vt,Bt):B.copyTexSubImage2D(Gt,Ft,qt,Ce,Qt,ue,Vt,Bt);x.bindFramebuffer(B.READ_FRAMEBUFFER,null),x.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else me?b.isDataTexture||b.isData3DTexture?B.texSubImage3D(Gt,Ft,qt,Ce,Je,Vt,Bt,Yt,ke,xn,$e.data):G.isCompressedArrayTexture?B.compressedTexSubImage3D(Gt,Ft,qt,Ce,Je,Vt,Bt,Yt,ke,$e.data):B.texSubImage3D(Gt,Ft,qt,Ce,Je,Vt,Bt,Yt,ke,xn,$e):b.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,Ft,qt,Ce,Vt,Bt,ke,xn,$e.data):b.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,Ft,qt,Ce,$e.width,$e.height,ke,$e.data):B.texSubImage2D(B.TEXTURE_2D,Ft,qt,Ce,Vt,Bt,ke,xn,$e);x.pixelStorei(B.UNPACK_ROW_LENGTH,bn),x.pixelStorei(B.UNPACK_IMAGE_HEIGHT,Le),x.pixelStorei(B.UNPACK_SKIP_PIXELS,nn),x.pixelStorei(B.UNPACK_SKIP_ROWS,Nn),x.pixelStorei(B.UNPACK_SKIP_IMAGES,Sn),Ft===0&&G.generateMipmaps&&B.generateMipmap(Gt),x.unbindTexture()},this.initRenderTarget=function(b){Q.get(b).__webglFramebuffer===void 0&&et.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?et.setTextureCube(b,0):b.isData3DTexture?et.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?et.setTexture2DArray(b,0):et.setTexture2D(b,0),x.unbindTexture()},this.resetState=function(){Y=0,J=0,ot=null,x.reset(),Ut.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return oi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=De._getDrawingBufferColorSpace(t),e.unpackColorSpace=De._getUnpackColorSpace()}};var mf={type:"change"},Gh={type:"start"},_f={type:"end"},Wl=new Zi,gf=new Ln,ov=Math.cos(70*ln.DEG2RAD),gn=new z,kn=2*Math.PI,qe={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Vh=1e-6,Rr=class extends _a{constructor(t,e=null){super(t,e),this.state=qe.NONE,this.target=new z,this.cursor=new z,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ns.ROTATE,MIDDLE:ns.DOLLY,RIGHT:ns.PAN},this.touches={ONE:is.ROTATE,TWO:is.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new z,this._lastQuaternion=new Xn,this._lastTargetPosition=new z,this._quat=new Xn().setFromUnitVectors(t.up,new z(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new vr,this._sphericalDelta=new vr,this._scale=1,this._panOffset=new z,this._rotateStart=new bt,this._rotateEnd=new bt,this._rotateDelta=new bt,this._panStart=new bt,this._panEnd=new bt,this._panDelta=new bt,this._dollyStart=new bt,this._dollyEnd=new bt,this._dollyDelta=new bt,this._dollyDirection=new z,this._mouse=new bt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=cv.bind(this),this._onPointerDown=lv.bind(this),this._onPointerUp=hv.bind(this),this._onContextMenu=_v.bind(this),this._onMouseWheel=fv.bind(this),this._onKeyDown=pv.bind(this),this._onTouchStart=mv.bind(this),this._onTouchMove=gv.bind(this),this._onMouseDown=uv.bind(this),this._onMouseMove=dv.bind(this),this._interceptControlDown=xv.bind(this),this._interceptControlUp=vv.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=qe.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(mf),this.update(),this.state=qe.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;gn.copy(e).sub(this.target),gn.applyQuaternion(this._quat),this._spherical.setFromVector3(gn),this.autoRotate&&this.state===qe.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=kn:n>Math.PI&&(n-=kn),s<-Math.PI?s+=kn:s>Math.PI&&(s-=kn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(gn.setFromSpherical(this._spherical),gn.applyQuaternion(this._quatInverse),e.copy(this.target).add(gn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=gn.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new z(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new z(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=gn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Wl.origin.copy(this.object.position),Wl.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Wl.direction))<ov?this.object.lookAt(this.target):(gf.setFromNormalAndCoplanarPoint(this.object.up,this.target),Wl.intersectPlane(gf,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Vh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Vh||this._lastTargetPosition.distanceToSquared(this.target)>Vh?(this.dispatchEvent(mf),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?kn/60*this.autoRotateSpeed*t:kn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){gn.setFromMatrixColumn(e,0),gn.multiplyScalar(-t),this._panOffset.add(gn)}_panUp(t,e){this.screenSpacePanning===!0?gn.setFromMatrixColumn(e,1):(gn.setFromMatrixColumn(e,0),gn.crossVectors(this.object.up,gn)),gn.multiplyScalar(t),this._panOffset.add(gn)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;gn.copy(s).sub(this.target);let r=gn.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(kn*this._rotateDelta.x/e.clientHeight),this._rotateUp(kn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(kn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-kn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(kn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-kn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(kn*this._rotateDelta.x/e.clientHeight),this._rotateUp(kn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new bt,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function lv(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function cv(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function hv(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(_f),this.state=qe.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function uv(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case ns.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=qe.DOLLY;break;case ns.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=qe.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=qe.ROTATE}break;case ns.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=qe.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=qe.PAN}break;default:this.state=qe.NONE}this.state!==qe.NONE&&this.dispatchEvent(Gh)}function dv(i){switch(this.state){case qe.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case qe.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case qe.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function fv(i){this.enabled===!1||this.enableZoom===!1||this.state!==qe.NONE||(i.preventDefault(),this.dispatchEvent(Gh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(_f))}function pv(i){this.enabled!==!1&&this._handleKeyDown(i)}function mv(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case is.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=qe.TOUCH_ROTATE;break;case is.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=qe.TOUCH_PAN;break;default:this.state=qe.NONE}break;case 2:switch(this.touches.TWO){case is.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=qe.TOUCH_DOLLY_PAN;break;case is.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=qe.TOUCH_DOLLY_ROTATE;break;default:this.state=qe.NONE}break;default:this.state=qe.NONE}this.state!==qe.NONE&&this.dispatchEvent(Gh)}function gv(i){switch(this._trackPointer(i),this.state){case qe.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case qe.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case qe.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case qe.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=qe.NONE}}function _v(i){this.enabled!==!1&&i.preventDefault()}function xv(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function vv(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var $l=uu(vf()),Is=i=>i!=null&&i!==""?`${i} A`:"corrente a definir",qh=i=>i?.idn_ma!=null?`${i.idn_ma} mA`:i?.lido?"sensibilidade a conferir":"30 mA";var ge=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Pr=(i,t=2)=>Number(i).toLocaleString("pt-BR",{minimumFractionDigits:t,maximumFractionDigits:t}),Ev={interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptores paralelos (three-way)",interruptor_intermediario:"Paralelos + intermediário (four-way)",pulsador_rele_impulso:"Pulsadores com relé de impulso",contator_botoeira:"Contator com botoeira liga/desliga e selo",sensor_presenca:"Sensor de presença",dimmer:"Dimmer",dimmer_010:"Controlador 0-10 V",dali:"DALI-2",cena:"DALI-2 com teclado de cenas"};function Av(i,t){let e=`${i||""}|${(t.quadros||[]).map(s=>s.tag).join(",")}|${(t.circuitos||[]).map(s=>s.id).join(",")}`,n=0;for(let s=0;s<e.length;s++)n=n*31+e.charCodeAt(s)|0;return`hm3d-sim:${(n>>>0).toString(36)}`}function Yl(i,t){let e=(0,$l.criarSimulador)(i),n=Av(t,i);try{let s=window.sessionStorage.getItem(n);s&&e.importar(JSON.parse(s))}catch{}return e.assinar(()=>{try{window.sessionStorage.setItem(n,JSON.stringify(e.exportar()))}catch{}}),e}var wv=["100 %","60 %","30 %","Desligado"];function ql(i,t,{titulo:e=!1}={}){let n=i.comando(t);if(!n)return"";let s=i.estadoComando(n.id),r=Array.isArray(s.cenas);if(!r&&n.tipo!=="cena")return"";let a=(n.dispositivos||[])[0]??(n.pontos||[])[0];if(a==null)return"";let o=r?s.cenas:wv,l=(c,h)=>`<button class="sim-b${s.cena===c?" ativo":""}" data-sim="cena" data-ponto="${ge(a)}" data-cena="${c}" data-def="${r?1:0}">${ge(h)}</button>`;return`${e?`<span>Cenas · ${ge(n.ambiente||n.id)}</span>`:""}${o.map((c,h)=>l(h,c)).join("")}${r?l(-1,"Desligar"):""}`}var _n=(i,t)=>t==null||t===""?"":`<tr><th>${ge(i)}</th><td>${t}</td></tr>`,Xh=(i,t="ligado",e="desligado")=>`<b class="${i?"sim-on":"sim-off"}">${i?t:e}</b>`;function $h(i,t,{abrir:e=!0}={}){let n=i.circuito(t);if(!n)return"";let s=i.quadro(n.quadro),r=(s?.disjuntores||[]).find(h=>h.tag===n.disjuntor),a=(s?.drs||[]).filter(h=>!h.ddr&&(h.circuitos||[]).map(String).includes(String(n.id))),o=(s?.drs||[]).some(h=>h.ddr&&h.tag===n.disjuntor),l=(h,p)=>{let u=i.ligado(h,p);return`<button class="sim-b" data-sim="disjuntor" data-tag="${ge(h)}" data-quadro="${ge(p)}">${u?"Desligar":"Ligar"} ${ge(h)}</button>`},c=i.motivo(n.id);return`<div class="sim-circ"><div class="sim-tit">Circuito ${ge(n.id)}${n.descricao?` — ${ge(n.descricao)}`:""}</div>
<table>${_n("Estado",c?`<b class="sim-off">sem energia</b> <small>(${ge(c)})</small>`:'<b class="sim-on">energizado</b>')}
${s?.geral?_n(`Geral ${s.geral.tag}`,`${Xh(i.ligado(s.geral.tag,s.tag))} · ${ge(Is(s.geral.In))}`):""}
${a.map(h=>_n(`DR ${h.tag}`,`${Xh(i.ligado(h.tag,s.tag))} · ${ge(qh(h))}`)).join("")}
${r?_n(`${o?"DDR":"Disjuntor"} ${r.tag}`,`${Xh(i.ligado(r.tag,s.tag))} · ${ge(Is(r.In))}${r.curva?` curva ${ge(r.curva)}`:""}${r.polos?` · ${ge(r.polos)}P`:""}`):""}
${_n("Quadro",ge(n.quadro))}
${n.origem==="diagrama"?_n("Origem","diagrama unifilar / quadro de cargas do projeto"):n.estimado?_n("Origem","<small>estimado pelo desenho — conferir</small>"):""}
${Number(n.potencia_va)>0?_n("Potência",`${Pr(n.potencia_va,0)} VA`):Number(n.potencia_w)>0?_n("Potência",`${Pr(n.potencia_w,0)} W`):""}
${n.ib_a!=null?_n("Corrente de projeto Ib",`${Pr(n.ib_a,1)} A`):""}
${n.secao_mm2!=null?_n("Seção",`${Pr(n.secao_mm2,1)} mm²`):""}
${n.queda_pct!=null?_n("Queda de tensão",`${Pr(n.queda_pct,2)} %${n.comprimento_m!=null?` em ${Pr(n.comprimento_m,0)} m`:""}`):""}</table>
<div class="sim-bs">${r?l(r.tag,s.tag):""}${a.map(h=>l(h.tag,s.tag)).join("")}${s&&e?`<button class="sim-b" data-sim="abrir-quadro" data-quadro="${ge(s.tag)}">Abrir o quadro ${ge(s.tag)}</button>`:""}</div></div>`}function Zl(i){if(!i)return"";let t=i.sinaleiros,e=(s,r,a)=>`<span class="sim-luz ${s?"acesa":""}" style="--c:${r}" title="${ge(a)}"><i></i>${ge(a)}</span>`,n=(s,r,a="")=>`<button class="sim-b ${a}" data-sim="motor" data-motor="${ge(i.id)}" data-acao="${s}">${r}</button>`;return`<div class="sim-painel"><div class="sim-tit">Painel de comando — ${ge(i.id)}${i.descricao?` <small>${ge(i.descricao)}</small>`:""}</div>
<div class="sim-luzes">${e(t.branco,"#f5f5f5","ENERGIZADO")}${e(t.verde,"#3fb950","EM OPERAÇÃO")}${e(t.amarelo,"#f2c94c","ALARME")}${e(t.vermelho,"#e5484d","FALHA / EMERGÊNCIA")}</div>
<div class="sim-est">${i.girando?'<b class="sim-on">motor em operação</b>':`<b class="sim-off">parado</b>${i.alimentado?"":` <small>(${ge(i.motivo)})</small>`}`} · contator ${i.contator?"fechado (selo)":"aberto"} · relé térmico ${i.termico?'<b class="sim-off">DESARMADO</b>':"armado"}</div>
<div class="sim-bs">${n("liga","LIGA","liga")}${n("desliga","DESLIGA","desliga")}${i.emergenciaLocal?n("liberar","Soltar emergência","emerg"):n("emergencia","EMERGÊNCIA","emerg")}
${i.termico?n("rearmar","Rearmar térmico"):n("desarmar_termico","Simular térmico desarmado")}</div></div>`}function Tv(i,t){let e=i.estadoComando(t.id);return Array.isArray(e.cenas)?_n("Cena",ge(e.cenaAtiva||(e.saida>0?"nível manual":"desligado"))):t.tipo==="cena"?_n("Cena",ge(e.saida>0?`${Math.round(e.saida*100)} %`:"desligado")):""}function yf(i,t,{rotulo:e="",ambiente:n=""}={}){let s=i.ponto(t);if(!s)return"";let r=i.estadoPonto(t),a=s.comando?i.comando(s.comando):null,o=a&&(a.dispositivos||[]).map(String).includes(String(t)),l=`${ge(e||$l.ROTULO_PONTO[s.tipo]||s.tipo)} · ${ge(s.id)}`,c=r.energizado?"sim-on":"sim-off",h="";if(a){let u=i.estadoComando(a.id);if(a.tipo==="contator_botoeira"){let f=(_,v,g="")=>`<button class="sim-b ${g}" data-sim="acionar" data-ponto="${ge(o?t:a.dispositivos?.[0]??t)}" data-acao="${_}">${v}</button>`;h=`${f("liga","LIGA","liga")}${f("desliga","DESLIGA","desliga")}${u.emergencia?f("liberar","Soltar emergência","emerg"):f("emergencia","EMERGÊNCIA","emerg")}`}else if(a.tipo==="cena")h=ql(i,a.id);else if(["dimmer","dimmer_010","dali"].includes(a.tipo))h=`${ql(i,a.id)}<button class="sim-b" data-sim="acionar" data-ponto="${ge(t)}">${u.saida>0?"Desligar":"Ligar"}</button>${[.25,.5,1].map(f=>`<button class="sim-b" data-sim="acionar" data-ponto="${ge(t)}" data-nivel="${f}">${f*100} %</button>`).join("")}`;else{let f=s.tipo==="pulsador"?"Apertar o pulsador":s.tipo==="sensor"?u.presenca?"Simular ambiente vazio":"Simular presença":s.tipo==="teclado_cena"?"Próxima cena":o?"Acionar":`Acionar o comando ${ge(a.id)}`;h=`<button class="sim-b" data-sim="acionar" data-ponto="${ge(t)}">${f}</button>`}}let p=s.tipo==="motor"?i.painel(s.circuito):null;return`<div class="sim-tit grande">${l}</div>
<div class="sim-est"><b class="${c}">${ge(r.texto)}</b>${n?` · ${ge(n)}`:""}</div>
${a?`<table>${_n("Comando",`${ge(a.id)} — ${ge(Ev[a.tipo]||a.tipo)}`)}${Tv(i,a)}${s.grupo?_n("Grupo",ge(s.grupo)):""}${a.rele?.tag?_n(a.rele.tipo==="impulso"?"Relé de impulso":"Contator",`${ge(a.rele.tag)} · ${i.estadoComando(a.id).saida>0?"fechado":"aberto"}`):""}${_n("Dispositivos",ge((a.dispositivos||[]).join(", ")))}${_n("Comanda",`${(a.pontos||[]).length} ponto(s)`)}</table>`:""}
${h?`<div class="sim-bs">${h}</div>`:""}${p?Zl(p):""}${s.circuito?$h(i,s.circuito):""}`}function Mf(i,t){let e=i.quadro(t);if(!e)return"";let n=(a,o,l)=>{let c=i.ligado(a,e.tag);return`<button class="sim-dj ${c?"on":"off"}" data-sim="disjuntor" data-tag="${ge(a)}" data-quadro="${ge(e.tag)}" title="${c?"Desligar":"Ligar"} ${ge(a)}"><i></i><b>${ge(a)}</b><span>${ge(o)}${l?` <small>${ge(l)}</small>`:""}</span></button>`},s=a=>i.circuito(a),r=i.paineis().filter(a=>String(a.quadro)===String(e.tag));return`<div class="sim-lista">${e.geral?n(e.geral.tag,`Geral ${Is(e.geral.In)}`,""):""}
${(e.drs||[]).filter(a=>!a.ddr).map(a=>n(a.tag,`DR ${a.In!=null?`${a.In} A · `:""}${qh(a)}`,`circuitos ${(a.circuitos||[]).join(", ")}`)).join("")}
${(e.disjuntores||[]).map(a=>{let o=s(a.circuito);return n(a.tag,`${Is(a.In)} — circuito ${a.circuito}`,o?.descricao||"")}).join("")}</div>
${r.length?`<div class="sim-bs"><button class="sim-b emerg" data-sim="emergencia-quadro" data-quadro="${ge(e.tag)}">${i.emergenciaDoQuadro(e.tag)?"Soltar a emergência do quadro":"EMERGÊNCIA do quadro"}</button></div>${r.map(Zl).join("")}`:""}
<div class="sim-bs"><button class="sim-b" data-sim="reiniciar">Religar tudo (estado inicial)</button></div>`}function Ir(i,t,{abrirQuadro:e,aviso:n}={}){i.addEventListener("click",s=>{let r=s.target.closest("[data-sim]");if(!r||!i.contains(r))return;s.stopPropagation();let a=r.dataset,o=null;if(a.sim==="disjuntor")t.alternar(a.tag,a.quadro),o=`${a.tag} ${t.ligado(a.tag,a.quadro)?"ligado":"desligado"}`;else if(a.sim==="acionar")o=t.acionar(a.ponto,a.nivel!=null?Number(a.nivel):a.acao||void 0);else if(a.sim==="cena")o=t.acionar(a.ponto,a.def==="1"?{cena:Number(a.cena)}:Number(a.cena));else if(a.sim==="motor")o=t.motor(a.motor,a.acao);else if(a.sim==="emergencia-quadro"){let l=!t.emergenciaDoQuadro(a.quadro);t.emergenciaQuadro(a.quadro,l),o=l?"Emergência do quadro acionada: motores parados":"Emergência do quadro liberada"}else a.sim==="reiniciar"?(t.reiniciar(),o="Simulação reiniciada"):a.sim==="abrir-quadro"&&e&&e(a.quadro);o&&n&&n(o)})}function Jl(){let i=document.createElement("div");i.className="sim-aviso",document.body.appendChild(i);let t=0;return e=>{i.textContent=e,i.classList.add("visivel"),clearTimeout(t),t=setTimeout(()=>i.classList.remove("visivel"),2600)}}function bf(i,t){let a=[],o=new Set,l=v=>({tag:v.tag,l:Math.max(1,Number(v.polos)||1)*18,tipo:"disjuntor",d:v});i.geral&&a.push({tag:i.geral.tag,l:Math.max(1,Number(i.geral.polos)||2)*18,tipo:"geral",d:i.geral});for(let v of i.drs||[])if(!v.ddr){a.push({tag:v.tag,l:(Number(v.polos)>=4?4:2)*18,tipo:"dr",d:v});for(let g of v.circuitos||[]){let m=(i.disjuntores||[]).find(C=>String(C.circuito)===String(g));m&&!o.has(m.tag)&&(o.add(m.tag),a.push(l(m)))}}for(let v of i.disjuntores||[])o.has(v.tag)||a.push(l(v));let c=[[]],h=0;for(let v of a)h+v.l>324&&c[c.length-1].length&&(c.push([]),h=0),c[c.length-1].push(v),h+=v.l;let p=Math.max(300,444),u=Math.max(400,c.length*150+220),f=120,_=[];return c.forEach((v,g)=>{let m=u-150-g*150;_.push({camada:"trilhos",x:60,y:m-17.5,z:20,l:p-120,a:35,p:7.5,cor:"#b8bcc2",metal:!0,rotulo:"Trilho DIN 35 mm",semEtiqueta:!0,info:[["Peça","Trilho DIN 35 × 7,5 mm"]]});let C=66;for(let L of v){let S=L.tipo==="disjuntor"?t?.circuito(L.d.circuito):null,T=L.tipo==="geral"?`Disjuntor geral ${Is(L.d.In)}`:L.tipo==="dr"?`DR ${Is(L.d.In)} / ${qh(L.d)} — circuitos ${(L.d.circuitos||[]).join(", ")}`:`Disjuntor ${Is(L.d.In)}${L.d.curva?` curva ${L.d.curva}`:""} — circuito ${L.d.circuito}${S?.descricao?` (${S.descricao})`:""}`;_.push({camada:"protecao",tag:L.tag,x:C,y:m-90/2,z:27.5,l:L.l,a:90,p:70,cor:L.tipo==="dr"?"#cfe3ff":"#f1f3f5",rotulo:L.tag,dica:`${L.tag} — ${T}`,info:[["TAG",L.tag],["Dispositivo",T],["Medidas",`${L.l} × 90 mm (típicas)`]]}),C+=L.l}}),{tipo:"quadro",titulo:`${i.tag} — ${i.descricao||"Quadro"}`,esquematico:!0,involucro:{L:p,A:u,P:f,espessura:2,cor:"#d6d4cf",rotulo:`Quadro ${i.tag}`,info:[["Quadro",i.tag],["Arranjo","esquemático (sem o caderno de fabricação)"]]},porta:{itens:[{x:(p-120)/2,y:u-70,l:120,a:40,p:2,cor:"#f4f1e8",rotulo:i.tag,info:[["Placa de identificação",i.tag]]}],rotulo:"Porta",info:[["Porta","frontal, articulada à esquerda"]]},portaAberta:!0,caixas:_,camadas:[{id:"protecao",rotulo:"Proteção (disjuntores e DR)",cor:"#e9ecef"},{id:"trilhos",rotulo:"Trilhos DIN",cor:"#b8bcc2"}],numeros:[["disjuntores",String((i.disjuntores||[]).length)],["DR",String((i.drs||[]).filter(v=>!v.ddr).length)]],avisos:["Arranjo esquemático: o modelo não trouxe o quadro do caderno de fabricação (skill quadros)."]}}var He=.001,Bi=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function Yh(i,t={}){let e=t.raiz||document,n=W=>e.querySelector(W),s=n("#tela"),r;try{r=new Tr({canvas:s,antialias:!0,preserveDrawingBuffer:!0})}catch(W){let vt=n("#semwebgl")||document.querySelector("#semwebgl");throw vt&&(vt.style.display="flex"),W}r.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),r.outputColorSpace=un;let a=new vs;a.background=new fe("#14161b");let o=!0,l=()=>{o=!0},{L:c,A:h,P:p}=i.involucro,u=i.involucro.espessura||2,f=Math.hypot(c,h,p)*He,_=new z(c*He/2,h*He/2,p*He/2),v=new dn(38,1,.01,f*40),g=new Rr(v,s);g.enableDamping=!0,g.dampingFactor=.08,g.target.copy(_),g.minDistance=.1,g.maxDistance=f*8,g.zoomToCursor=!0,g.addEventListener("change",l),a.add(new Es("#ffffff","#55524a",1.5)),a.add(new As("#ffffff",.55));let m=new es("#fff4e0",1.3);m.position.set(c*He*1.5,h*He*2,p*He*6+1),a.add(m);let C=new es("#dfe8ff",.5);C.position.set(-c*He,h*He,p*He*3),a.add(C);let L={caixa:new qn(1,1,1),cilindro:new hi(.5,.5,1,28)};L.cilindro.rotateX(Math.PI/2);let S={caixa:new ia(L.caixa)},T=new Map;function A(W,vt,Mt){let Ot=`${W}|${vt}|${Mt?1:0}`;return T.has(Ot)||T.set(Ot,new Mn({color:W,roughness:Mt?.35:.65,metalness:Mt?.65:.05,transparent:vt<1,opacity:vt,depthWrite:vt>=.99})),T.get(Ot)}let N=new Map;function y(W,vt){let Mt=`${W}|${vt}`;return N.has(Mt)||N.set(Mt,new ci({color:new fe(W).multiplyScalar(.45),transparent:vt<1,opacity:Math.min(1,vt+.25)})),N.get(Mt)}let R={},F=(W,vt=a)=>(R[W]||(R[W]=new An,R[W].name=W,vt.add(R[W])),R[W]),O=[],V=[],k=new An,P=[];function U(W,vt){let Mt=Math.max(.5,W.l)*He,Ot=Math.max(.5,W.a)*He,Ne=Math.max(.5,W.p)*He,se=W.forma==="cilindro"?"cilindro":"caixa",Fe=W.opacidade??1,Ye=W.cor||"#cccccc",be=new ze(L[se],A(Ye,Fe,W.metal));return be.scale.set(Mt,se==="cilindro"?Mt:Ot,Ne),be.position.set(W.x*He+Mt/2,W.y*He+Ot/2,W.z*He+Ne/2),!W.semBorda&&se==="caixa"&&be.add(new vi(S.caixa,y(Ye,Fe))),be.userData=W,W.info&&O.push(be),W.rotulo&&!W.semEtiqueta&&V.push({mesh:be,texto:W.rotulo,el:null,porta:vt===k}),W.tag&&P.push(be),vt.add(be),be}let Y=i.involucro.cor||"#d6d4cf",J=F("involucro");[{x:0,y:0,z:0,l:c,a:h,p:u},{x:0,y:0,z:0,l:u,a:h,p},{x:c-u,y:0,z:0,l:u,a:h,p},{x:0,y:h-u,z:0,l:c,a:u,p},{x:0,y:0,z:0,l:c,a:u,p}].forEach(W=>U({...W,cor:Y,rotulo:i.involucro.rotulo,info:i.involucro.info,semEtiqueta:!0},J)),k.position.set(0,0,p*He),a.add(k),R.porta=k,U({x:0,y:0,z:0,l:c,a:h,p:u,cor:Y,rotulo:i.porta&&i.porta.rotulo,info:i.porta&&i.porta.info,semEtiqueta:!0},k);for(let W of i.porta&&i.porta.itens||[])U({...W,z:u+(W.z||0)},k);for(let W of i.caixas||[])U(W,F(W.camada||"outros"));let ot=-Math.PI*.58,j=i.portaAberta===!1?0:ot;k.rotation.y=j,t.portaFechada&&(j=0,k.rotation.y=0,setTimeout(()=>et(!0),350));let st=()=>Math.abs(k.rotation.y)>.2,lt=null,Dt=new WeakMap,At=W=>Dt.get(W)||W.material;function ae(W,vt){Dt.set(W,vt),W.material=W===lt?$t(vt):vt}let ne=new WeakMap,wt=t.sim||(i.instalacao&&Array.isArray(i.instalacao.quadros)?Yl(i.instalacao,i.titulo):null),w=wt?String(t.quadroTag||wt.quadros()[0]?.tag||""):"",I=wt?t.aviso||Jl():null,X=new WeakMap,K=W=>W&&X.get(W)||null,rt=[],yt=[],ie=-.55,at=.55,dt=new Map;function ht(W,vt,Mt){let Ot=`${W.uuid}|${vt}`;if(!dt.has(Ot)){let Ne=W.clone();Mt(Ne),dt.set(Ot,Ne)}return dt.get(Ot)}let xt=(W,vt,Mt)=>ht(W,`b${vt}${Mt}`,Ot=>{Ot.emissive.set(vt),Ot.emissiveIntensity=Mt}),Pt=W=>ht(W,"escuro",vt=>{vt.color.multiplyScalar(.35)});function Xt(W,vt){let Mt=W.scale.x,Ot=W.scale.y,Ne=W.scale.z,se=new An;se.position.set(W.position.x,W.position.y,W.position.z+Ne/2);let Fe=new An,Ye=Math.min(.016,Math.max(.008,Ot*.2)),be=new ze(L.caixa,A("#2b2d31",1,!1));be.scale.set(Math.min(.012,Mt*.45),Math.max(.004,Ye*.45),Ye),be.position.set(0,0,Ye/2),Fe.add(be);let Ke=new ze(L.caixa,A("#d62828",1,!1));Ke.scale.set(Math.min(.008,Mt*.4),Math.min(.006,Ot*.07),.0015),Ke.position.set(0,Ot*.27,8e-4),se.add(Fe,Ke),W.parent.add(se);for(let us of[be,Ke])ne.set(us,W),us.userData=W.userData;O.push(be);let Jn=wt.ligado(vt.tag,w);Fe.rotation.x=Jn?ie:at,rt.push({giro:Fe,band:Ke,tag:vt.tag,alvo:Fe.rotation.x})}if(wt){let W=wt.quadro(w),vt=wt.paineis().filter(Ot=>String(Ot.quadro)===w).map(Ot=>Ot.id),Mt={};for(let Ot of P){let Ne=String(Ot.userData.tag),se=null;if(W&&wt.dispositivo(Ne,w))se={tipo:"protecao",tag:Ne};else{let Fe=Ne.match(/^(.+)\/([A-Z]+)(\d*)$/),Ye=Ne.match(/^(liga|desliga|emergencia|reset|seletor|sinaleiro_verde|sinaleiro_vermelho|sinaleiro_amarelo|sinaleiro_branco):\d+$/);if(Fe&&vt.includes(Fe[1])){let be=`${Fe[1]}-${Fe[2]}${Fe[3]}`;se=Fe[2]==="Q"&&wt.dispositivo(be,w)?{tipo:"protecao",tag:be,motor:Fe[1]}:Fe[2]==="K"?{tipo:"contator",motor:Fe[1]}:Fe[2]==="F"?{tipo:"termico",motor:Fe[1]}:{tipo:"partida",motor:Fe[1]}}else if(Ye){let be=Ye[1],Ke=Mt[be]=(Mt[be]??-1)+1,Jn=vt.length?vt[Ke%vt.length]:null;be==="emergencia"?se={tipo:"porta",acao:"emergencia"}:be==="reset"?se={tipo:"porta",acao:"rearme"}:be==="liga"||be==="desliga"?se=Jn?{tipo:"porta",acao:be,motor:Jn}:null:be==="seletor"?se=Jn?{tipo:"porta",acao:"alternar",motor:Jn}:null:se={tipo:"sinaleiro",sinal:be.slice(10),motor:be==="sinaleiro_branco"?null:Jn}}}se&&(X.set(Ot,se),se.tipo==="protecao"&&Ot.parent!==k&&Xt(Ot,se),se.tipo!=="porta"&&(se.tipo!=="protecao"||se.motor)&&yt.push({mesh:Ot,el:se,base:Ot.material}))}}function ee(W){if(!W)return null;if(W.tipo==="protecao")return wt.alternar(W.tag,w),`${W.tag} ${wt.ligado(W.tag,w)?"ligado":"desligado"}`;if(W.tipo!=="porta")return null;if(W.acao==="emergencia"){let vt=!wt.emergenciaDoQuadro(w);return wt.emergenciaQuadro(w,vt),vt?"EMERGÊNCIA acionada: motores parados (clique de novo para soltar)":"Emergência liberada (aperte LIGA)"}if(W.acao==="rearme"){for(let vt of wt.paineis())String(vt.quadro)===w&&vt.termico&&wt.motor(vt.id,"rearmar");return"Rearme: relés térmicos rearmados"}return W.acao==="alternar"?wt.motor(W.motor,wt.painel(W.motor).contator?"desliga":"liga"):wt.motor(W.motor,W.acao)}let oe=wt?n("#simulacao"):null;function he(){if(!wt)return;let W=wt.quadro(w),vt=!W?.geral||wt.ligado(W.geral.tag,w);for(let Mt of rt){let Ot=wt.ligado(Mt.tag,w);Mt.alvo=Ot?ie:at,ae(Mt.band,A(Ot?"#d62828":"#2f9e44",1,!1))}for(let Mt of yt){let Ot=Mt.el.motor?wt.painel(Mt.el.motor):null,Ne=Mt.base;if(Mt.el.tipo==="contator"||Mt.el.tipo==="partida")Ot?.girando&&(Ne=xt(Mt.base,"#2fbf5a",.6));else if(Mt.el.tipo==="termico"||Mt.el.tipo==="protecao")Ot?.termico&&(Ne=xt(Mt.base,"#e0a000",.9));else if(Mt.el.tipo==="sinaleiro"){let se=Mt.el.sinal;Ne=(se==="branco"?vt:Ot?!!Ot.sinaleiros[se]:se==="vermelho"&&wt.emergenciaDoQuadro(w))?xt(Mt.base,`#${Mt.base.color.getHexString()}`,1.6):Pt(Mt.base)}ae(Mt.mesh,Ne)}oe&&(oe.innerHTML=Mf(wt,w)),pt(),l()}let B=wt?wt.assinar(he):()=>{};oe&&Ir(oe,wt,{aviso:I}),wt&&n("#info")&&Ir(n("#info"),wt,{aviso:I});let we=null;function ye(W,vt,Mt=700){let Ot=v.position.clone(),Ne=g.target.clone(),se=performance.now();we=Fe=>{let Ye=Math.min(1,(Fe-se)/Mt),be=Ye*Ye*(3-2*Ye);v.position.lerpVectors(Ot,W,be),g.target.lerpVectors(Ne,vt,be),Ye>=1&&(we=null)},l()}let D=()=>Math.max(h*He,c*He/Math.max(.3,v.aspect*.72))/(2*Math.tan(v.fov*Math.PI/180/2))*1.42+p*He;function x(W){let vt=window.innerWidth>900?c*He*.35:0,Mt=new z(c*He/2+vt,h*He/2+h*He*.03,p*He*.3),Ot=new z(c*He/2+vt,h*He/2+h*He*.03,D());W?(v.position.copy(Ot),g.target.copy(Mt),l()):ye(Ot,Mt)}function H(W){let vt=D()*1.05,Mt=_.clone().add(new z(window.innerWidth>900?c*He*.3:0,0,0)),Ot=new z(c*He/2+vt*.38,h*He*.6+vt*.2,vt*.95);W?(v.position.copy(Ot),g.target.copy(Mt),l()):ye(Ot,Mt)}function Q(W,vt){R[W]&&(R[W].visible=vt),document.querySelectorAll(`[data-camada="${W}"]`).forEach(Mt=>Mt.classList.toggle("ativo",vt)),l()}function et(W=!0){j=W?ot:0,n("#b-porta")&&n("#b-porta").classList.toggle("ativo",W),l()}function Et(W=!0){Q("involucro",!W),Q("porta",!W),n("#b-placa")&&n("#b-placa").classList.toggle("ativo",W)}let Rt=n("#camadas");for(let W of i.camadas||[]){let vt=document.createElement("button");vt.className="leg ativo",vt.dataset.camada=W.id,vt.style.setProperty("--cor",W.cor),vt.innerHTML=`<i></i><span>${Bi(W.rotulo)}${W.qtd!=null?` <small>${Bi(W.qtd)}</small>`:""}</span>`,vt.onclick=()=>Q(W.id,!(!R[W.id]||R[W.id].visible)),Rt&&Rt.appendChild(vt)}let ut=n("#numeros");ut&&(ut.innerHTML=(i.numeros||[]).map(([W,vt])=>`<div class="num"><div>${Bi(vt)}</div><small>${Bi(W)}</small></div>`).join(""));let ft=(W,vt)=>{let Mt=n(W);Mt&&(Mt.onclick=vt)};ft("#b-porta",()=>et(j===0)),ft("#b-sem-porta",()=>{let W=!R.porta.visible;Q("porta",W),n("#b-sem-porta").classList.toggle("ativo",!W)}),ft("#b-involucro",()=>{let W=!R.involucro.visible;Q("involucro",W),n("#b-involucro").classList.toggle("ativo",!W)}),ft("#b-frente",()=>x()),ft("#b-3d",()=>H()),ft("#b-placa",()=>{let W=!n("#b-placa").classList.contains("ativo");Et(W),W&&x()});let mt=!0;ft("#b-etiquetas",()=>{mt=!mt,n("#b-etiquetas").classList.toggle("ativo",mt),l()}),n("#b-etiquetas")&&n("#b-etiquetas").classList.add("ativo"),n("#b-porta")&&n("#b-porta").classList.toggle("ativo",j!==0),ft("#b-tela",()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}),ft("#b-voltar-predio",()=>{t.aoVoltar&&t.aoVoltar()});let jt=new Fi,St=new bt,Lt=new Map;function $t(W){if(!Lt.has(W)){let vt=W.clone();vt.emissive.set("#5a4500"),Lt.set(W,vt)}return Lt.get(W)}function Wt(W){for(let vt=W;vt;vt=vt.parent)if(!vt.visible)return!1;return!0}function ce(W){let vt=s.getBoundingClientRect();return St.set((W.clientX-vt.left)/vt.width*2-1,-((W.clientY-vt.top)/vt.height)*2+1),jt.setFromCamera(St,v),jt.intersectObjects(O.filter(Wt),!1)[0]||null}let q=W=>`<b class="tag">${Bi(W.rotulo||"")}</b><table>${(W.info||[]).map(([vt,Mt])=>`<tr><th>${Bi(vt)}</th><td>${/^https?:/.test(String(Mt))?`<a href="${Bi(Mt)}" target="_blank" rel="noopener">${Bi(Mt)}</a>`:Bi(Mt)}</td></tr>`).join("")}</table>`,It=null;function pt(){let W=n("#info");if(!W)return;if(!It){W.innerHTML=`<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.${wt?" Clique num disjuntor para ligar/desligar.":""}</small>`;return}let vt=It.userData,Mt=wt&&K(It),Ot="";if(Mt?.tipo==="protecao"){let Ne=wt.dispositivo(Mt.tag,w),se=Ne?.tipo==="dr"?null:Ne?.item?.circuito??null;Ot=se!=null?$h(wt,se,{abrir:!1}):`<div class="sim-est">${Mt.tag}: <b class="${wt.ligado(Mt.tag,w)?"sim-on":"sim-off"}">${wt.ligado(Mt.tag,w)?"ligado":"desligado"}</b></div>`}else Mt?.motor&&(Ot=Zl(wt.painel(Mt.motor)));W.innerHTML=q(vt)+Ot}function Nt(W){let vt=ce(W);if(lt&&(lt.material=At(lt),lt=null),l(),!vt){It=null,pt();return}let Mt=ne.get(vt.object)||vt.object;lt=Mt,Dt.set(Mt,At(Mt)),Mt.material=$t(At(Mt)),It=Mt;let Ot=wt?ee(K(Mt)):null;Ot&&I&&I(Ot),pt()}let Ut=null;s.addEventListener("pointerdown",W=>{Ut=[W.clientX,W.clientY]}),s.addEventListener("pointerup",W=>{Ut&&Math.hypot(W.clientX-Ut[0],W.clientY-Ut[1])<5&&Nt(W),Ut=null});let _t=document.createElement("div");_t.className="etq-q etq-dica",_t.style.display="none",document.body.appendChild(_t);let Kt=0;s.addEventListener("pointermove",W=>{if(W.buttons){_t.style.display="none";return}let vt=performance.now();if(vt-Kt<60)return;Kt=vt;let Mt=ce(W),Ot=Mt&&(Mt.object.userData.dica||Mt.object.userData.rotulo);if(!Ot){_t.style.display="none";return}let Ne=wt&&K(ne.get(Mt.object)||Mt.object);Ne?.tipo==="protecao"?Ot+=wt.ligado(Ne.tag,w)?" — LIGADO (clique para desligar)":" — DESLIGADO (clique para ligar)":Ne?.acao&&(Ot+=" — clique para apertar"),_t.textContent=Ot,_t.style.display="block",_t.style.transform=`translate(${W.clientX+12}px, ${W.clientY-26}px)`}),s.addEventListener("pointerleave",()=>{_t.style.display="none"});let Zt=n("#etiquetas");for(let W of V)W.el=document.createElement("div"),W.el.className="etq-q",W.el.textContent=W.texto,Zt&&Zt.appendChild(W.el),W.larg=0;let Te=new z;function Ie(){let W=s.clientWidth,vt=s.clientHeight,Mt=v.position.distanceTo(g.target),Ot=2*Math.tan(v.fov*Math.PI/180/2),Ne=[];for(let se of V){let Fe=mt&&Wt(se.mesh)&&(se.porta?!st():st()||!R.porta.visible)&&Mt<f*3.2;if(Fe){se.mesh.getWorldPosition(Te);let Ke=vt/(Ot*Math.max(.05,v.position.distanceTo(Te)));se.larg||(se.el.style.display="block",se.larg=se.el.offsetWidth||se.texto.length*7+12),Fe=se.mesh.scale.x*Ke>=se.larg*.95}if(!Fe){se.el.style.display="none";continue}if(Te.z+=se.mesh.scale.z/2,Te.project(v),Te.z>1){se.el.style.display="none";continue}let Ye=(Te.x+1)/2*W,be=(1-Te.y)/2*vt;if(Ne.some(Ke=>Math.abs(Ke[0]-Ye)<(Ke[2]+se.larg)/2&&Math.abs(Ke[1]-be)<16)){se.el.style.display="none";continue}Ne.push([Ye,be,se.larg]),se.el.style.display="block",se.el.style.transform=`translate(${Ye}px, ${be}px) translate(-50%, -50%)`}}let rn=!0;function Me(){if(!rn)return;let W=s.clientWidth||window.innerWidth,vt=s.clientHeight||window.innerHeight;r.setSize(W,vt,!1),v.aspect=W/vt,v.updateProjectionMatrix(),l()}window.addEventListener("resize",Me),s.addEventListener("webglcontextrestored",l),Me(),H(!0),he(),wt||pt(),r.compile(a,v);function Se(W){if(!rn)return;we&&(we(W),o=!0);let vt=j-k.rotation.y;Math.abs(vt)>.001?(k.rotation.y+=vt*.12,o=!0):k.rotation.y!==j&&(k.rotation.y=j,o=!0);for(let Mt of rt){let Ot=Mt.alvo-Mt.giro.rotation.x;Math.abs(Ot)>.001?(Mt.giro.rotation.x+=Ot*.3,o=!0):Mt.giro.rotation.x!==Mt.alvo&&(Mt.giro.rotation.x=Mt.alvo,o=!0)}g.update()&&(o=!0),o&&(o=!1,r.render(a,v),Ie())}let en={tipo:"quadro",grupos:R,camera:v,controles:g,cena:a,renderer:r,sim:wt,quadroTag:w,abrirPorta:(W=!0)=>{et(W),k.rotation.y=j},vistaFrente:()=>{x(!0)},vista3d:()=>{H(!0)},soPlaca:(W=!0)=>Et(W),mostrar:Q,etiquetas:W=>{mt=W,l()},render:()=>{we=null,o=!0,Se(performance.now())},alternar:W=>wt?ee({tipo:"protecao",tag:W}):null,alavanca:W=>{let vt=rt.find(Mt=>Mt.tag===W);return vt?vt.giro.rotation.x:null},get sujo(){return o}},Si=0;function We(W){Si=requestAnimationFrame(We),Se(W)}return Se(performance.now()),Si=requestAnimationFrame(We),t.embutido?{...en,ativar(W=!0){rn=W,rn&&(Me(),he())},abrirAnimado(){j=0,k.rotation.y=0,l(),setTimeout(()=>et(!0),300)},destruir(){rn=!1,cancelAnimationFrame(Si),B(),window.removeEventListener("resize",Me),_t.remove(),r.dispose(),r.forceContextLoss?.()}}:(window.HM3D=en,document.body.classList.add("pronto"),en)}var Tn=uu(Pf()),Kl={celular:4e5,computador:15e5},hs=(i,t=0)=>Number(i).toLocaleString("pt-BR",{minimumFractionDigits:t,maximumFractionDigits:t});function If(i){let{CENA:t,INST:e,sim:n,interativos:s,pai:r,altura:a,celular:o,pedirDesenho:l,esc:c,ambienteAtual:h}=i,p=e?.luminotecnico;if(!n||!p||!p.fotometrias)return null;let u={},f=new Map;for(let P of s){if(P.kind!=="luz")continue;let U=n.ponto(P.id),Y=U?.luminaria;if(!Y||!p.fotometrias[Y])continue;let J=t.ambientes[P.it[5]];!J||J.poligono.length<3||(u[Y]||(u[Y]=(0,Tn.avaliador)(p.fotometrias[Y])),f.has(P.it[5])||f.set(P.it[5],[]),f.get(P.it[5]).push({id:P.id,x:P.it[0],y:P.it[1],z:P.it[2],cod:Y,nome:U.ambiente}))}if(!f.size)return null;let _=[...f].map(([P,U])=>{let Y=t.ambientes[P],J={};for(let ae of U)J[ae.nome]=(J[ae.nome]||0)+1;let ot=Object.keys(J).sort((ae,ne)=>J[ne]-J[ae])[0],j=p.ambientes?.[ot]||{},st=Y.poligono.map(ae=>ae[0]),lt=Y.poligono.map(ae=>ae[1]),Dt=Math.max(...st)-Math.min(...st),At=Math.max(...lt)-Math.min(...lt);return{i:P,a:Y,lums:U,dados:j,nome:ot,plano:Number.isFinite(j.plano_m)?j.plano_m:.75,fm:Number.isFinite(j.fm)?j.fm:1,montagem:Number.isFinite(j.altura_montagem_m)?j.altura_montagem_m:null,rot:Dt>=At?0:90,area:Math.max(.5,Number(Y.area_m2)||Dt*At)}}),v=null,g=!1,m=null,C=null,L=new Bn({vertexColors:!0,transparent:!0,opacity:.86,depthWrite:!1,side:on,polygonOffset:!0,polygonOffsetFactor:-4,polygonOffsetUnits:-4});function S(P){let U=o?Kl.celular:Kl.computador,Y=o?250:600,J=P.reduce((j,st)=>j+Y*st.lums.length,0),ot=Math.min(1,U/Math.max(1,J));return Math.max(30,Math.floor(Y*ot))}function T(P){let U=S(P),Y=[],J=[],ot=[];for(let st of P){let lt=(0,Tn.gradeNoPoligono)(st.a.poligono,{passo:Math.max(.15,Math.sqrt(st.area/U)),maxCelulas:U}),Dt=Y.length/3,At=new Map,ae=[],ne=(w,I)=>{let X=`${w},${I}`;if(!At.has(X)){At.set(X,Dt+ae.length);let K=lt.x0+lt.dx*w,rt=lt.y0+lt.dy*I;ae.push([K,rt]),Y.push(K,a,-rt)}return At.get(X)};for(let w of lt.centros){let I=ne(w.i,w.j),X=ne(w.i+1,w.j),K=ne(w.i+1,w.j+1),rt=ne(w.i,w.j+1);J.push(I,X,K,I,K,rt)}let wt=(0,Tn.malhaMedicao)(lt.L,lt.W);ot.push({s:st,g:lt,vertices:ae,medicao:(0,Tn.gradeNoPoligono)(st.a.poligono,{nx:wt.nx,ny:wt.ny})})}let j=new Ze;return j.setAttribute("position",new _e(Y,3)),j.setAttribute("color",new _e(new Float32Array(Y.length),3)),j.setIndex(J),v&&(v.geometry.dispose(),r.remove(v)),v=new ze(j,L),v.renderOrder=3,v.frustumCulled=!1,r.add(v),{lista:P,partes:ot,maxCel:U}}let A=P=>P.lums.map(U=>{let Y=n.estadoPonto(U.id);return{x:U.x,y:U.y,z:P.montagem??U.z,I:u[U.cod],rot:P.rot,fator:P.fm*(Y?Y.nivel:0)}});function N(){if(!m)return;let P=[],U=0;for(let st of m.partes){let lt=A(st.s),Dt=st.vertices.map(([ne,wt])=>(0,Tn.iluminanciaNoPonto)(ne,wt,st.s.plano,lt)),At=st.medicao.centros.map(ne=>(0,Tn.iluminanciaNoPonto)(ne.x,ne.y,st.s.plano,lt)),ae=(0,Tn.estatisticas)(At);U=Math.max(U,ae.emax,...Dt),P.push({p:st,nos:Dt,est:ae})}let Y=(0,Tn.escala)(U),J=v.geometry.attributes.color,ot=new fe,j=0;for(let st of P)for(let lt of st.nos){let[Dt,At,ae]=(0,Tn.corFalsa)(lt/Y.max);ot.setRGB(Dt,At,ae,un),J.array[j++]=ot.r,J.array[j++]=ot.g,J.array[j++]=ot.b}J.needsUpdate=!0,C={escala:Y,porAmbiente:new Map(P.map(st=>[st.p.s.i,{...st.est,sala:st.p.s,celulas:st.p.g.centros.length}]))},F(),l()}let y=document.createElement("div");y.id="mapa-lux",document.body.appendChild(y);let R=`linear-gradient(90deg, ${[0,.2,.4,.6,.8,1].map(P=>{let[U,Y,J]=(0,Tn.corFalsa)(P);return`rgb(${Math.round(U*255)},${Math.round(Y*255)},${Math.round(J*255)}) ${P*100}%`}).join(", ")})`;function F(){if(!C)return;let P=h(),U=C.porAmbiente.get(P),Y=(ot,j)=>`<div>${ot}: ${j}</div>`,J;if(U){let ot=U.sala.dados;J=`<div class="t"><b>${c(U.sala.a.nome)}</b> — ponto a ponto, estado atual das luzes</div>`+Y("Em",`<b>${hs(U.em)} lx</b>${ot.em_exigida?` (exigida ${hs(ot.em_exigida)} lx; lúmens ${hs(ot.em_lumens||0)} lx)`:""}`)+Y("Emín / Emáx",`${hs(U.emin)} / ${hs(U.emax)} lx`)+Y("U0 = Emín/Em",`<b>${hs(U.u0,2)}</b>${ot.uo_min!=null?` (mínimo ${hs(ot.uo_min,1)})`:""}`)}else J=`<div class="t">${C.porAmbiente.size} ambiente(s) com luminárias do projeto luminotécnico${m.parcial?" — cena grande: só o ambiente atual (entre num ambiente)":""}. Entre num ambiente para ver Em, Emín e U0.</div>`;y.innerHTML=`<div class="tit">Mapa de iluminância (lx)</div><div class="barra" style="background:${R}"></div>
<div class="marcas">${C.escala.marcas.map(ot=>`<span>${hs(ot)}</span>`).join("")}</div>${J}
<small>Cálculo ponto a ponto no plano de trabalho, só luz direta (sem interreflexão de teto, paredes e piso): fica abaixo do método dos lúmens. Muda com as cenas, a dimerização e os disjuntores.</small>`}function O(){let U=_.reduce((ot,j)=>ot+30*j.lums.length,0),Y=o?Kl.celular:Kl.computador;if(U<=Y)return{lista:_,parcial:!1};let J=h();return{lista:_.filter(ot=>ot.i===J),parcial:!0}}function V(){let{lista:P,parcial:U}=O(),Y=P.map(J=>J.i).join(",");(!m||m.chave!==Y)&&(m={...T(P),chave:Y,parcial:U})}function k(P){g=!!P,g&&(V(),N()),v&&(v.visible=g),y.classList.toggle("aberto",g),l(!0)}return{get visivel(){return g},ambientes:f.size,alternar(){return k(!g),g},mostrar:k,atualizar(){g&&(V(),N())},legenda(){g&&(m?.parcial?(V(),N()):F())},resultado(P){let U=C?.porAmbiente.get(P);return U?{em:U.em,emin:U.emin,emax:U.emax,u0:U.u0,celulas:U.celulas,nome:U.sala.a.nome}:null},get escala(){return C?.escala||null},get celulas(){return m?m.partes.reduce((P,U)=>P+U.g.centros.length,0):0}}}var Lf={teto:null,piso:.05,canto:2.3,"topo-porta":2.15};function Df(i){let{CENA:t,tela:e,camera:n,cena:s,pisos:r,escolherDispositivo:a,pedirDesenho:o,esc:l}=i,c=window.parent&&window.parent!==window,h={ligado:!1,modo:"navegar",paleta:[],escolhido:null,inseridos:0,retirados:0},p={ativo:()=>!1,clique:()=>!1,estado:h};if(!c)return p;let u=Array.isArray(t.origem)?t.origem:null,f=O=>{try{window.parent.postMessage(O,"*")}catch{}},_=new An;s.add(_);let v=new Fi,g=new bt,m=new Ln(new z(0,1,0),0),C=new Ge().makeScale(0,0,0),L=null,S=null;function T(){let O=document.createElement("style");O.textContent=`
#hm-edicao{position:absolute;top:58px;right:12px;z-index:30;width:270px;background:rgba(18,24,33,.94);color:#eef2f6;border:1px solid #c9a227;border-radius:10px;padding:10px 12px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#hm-edicao h4{margin:0 0 6px;font-size:13px;color:#e6c45a;letter-spacing:.3px}
#hm-edicao select{width:100%;margin:4px 0 8px;padding:5px;border-radius:6px;border:1px solid #556;background:#0f141b;color:#eef2f6}
#hm-edicao .modos{display:flex;gap:6px;margin-bottom:6px}
#hm-edicao .modos button{flex:1;padding:6px 4px;border-radius:6px;border:1px solid #556;background:#1d2633;color:#eef2f6;cursor:pointer;font-size:12px}
#hm-edicao .modos button.ativo{background:#c9a227;color:#111;border-color:#c9a227;font-weight:600}
#hm-edicao small{display:block;color:#aab4c0;margin-top:4px}
#hm-edicao .aviso{margin-top:6px;padding:5px 7px;border-radius:6px;background:#203046;display:none}
#hm-edicao .aviso.erro{background:#5a1f1f}`,document.head.appendChild(O),L=document.createElement("div"),L.id="hm-edicao";let V=new Map;for(let U of h.paleta)V.has(U.grupo)||V.set(U.grupo,[]),V.get(U.grupo).push(U);let k=[...V.entries()].sort((U,Y)=>U[0].localeCompare(Y[0],"pt-BR")).map(([U,Y])=>`<optgroup label="${l(U)}">${Y.sort((J,ot)=>J.nome.localeCompare(ot.nome,"pt-BR")).map(J=>`<option value="${l(J.simbolo)}">${l(J.nome)}</option>`).join("")}</optgroup>`).join("");L.innerHTML=`<h4>Editar componentes</h4>
<div class="modos"><button data-m="navegar" class="ativo">Navegar</button><button data-m="inserir">Inserir</button><button data-m="retirar">Retirar</button></div>
<select id="hm-comp">${k}</select>
<small id="hm-dica">Escolha "Inserir" e clique no piso onde vai o componente; "Retirar" e clique no componente.</small>
<small id="hm-conta"></small>
<div class="aviso" id="hm-aviso"></div>`,document.body.appendChild(L),S=L.querySelector("#hm-aviso");let P=L.querySelector("#hm-comp");h.escolhido=P.value||null,P.addEventListener("change",()=>{h.escolhido=P.value}),L.querySelectorAll(".modos button").forEach(U=>U.addEventListener("click",()=>{h.modo=U.dataset.m,L.querySelectorAll(".modos button").forEach(Y=>Y.classList.toggle("ativo",Y===U)),e.style.cursor=h.modo==="navegar"?"":"crosshair"})),A()}function A(){let O=L?.querySelector("#hm-conta");O&&(O.textContent=h.inseridos||h.retirados?`Nesta sessão: ${h.inseridos} inserido(s), ${h.retirados} retirado(s). Clique em "Atualizar 3D" na tela para ver a peça no lugar definitivo.`:"")}function N(O,V=!1){S&&(S.textContent=O,S.className=`aviso${V?" erro":""}`,S.style.display="block",clearTimeout(N.t),N.t=setTimeout(()=>{S.style.display="none"},4e3))}function y(O,V){let k=e.getBoundingClientRect();g.set((O-k.left)/k.width*2-1,-((V-k.top)/k.height)*2+1),v.setFromCamera(g,n);let P=v.intersectObjects(r,!1)[0];if(P)return P.point.clone();let U=new z;return v.ray.intersectPlane(m,U)?U:null}function R(O,V){let k=h.paleta.find(Dt=>Dt.simbolo===h.escolhido);if(!k)return N("Escolha o componente na lista.",!0),!0;let P=y(O,V);if(!P)return N("Clique no piso do modelo.",!0),!0;let U=P.x,Y=-P.z,J=typeof k.altura_m=="number"?k.altura_m:k.montagem in Lf?Lf[k.montagem]:1.1,ot=J??t.peDireito-.05,j=k.cor||"#c9a227",st=new ze(new hi(.015,.015,Math.max(ot,.05),6),new Bn({color:j,transparent:!0,opacity:.6}));st.position.set(U,Math.max(ot,.05)/2,-Y);let lt=new ze(new bs(.09,14,10),new Bn({color:j}));return lt.position.set(U,ot,-Y),_.add(st,lt),h.inseridos++,A(),o(!0),f({tipo:"hm3d:adicionar",simbolo:k.simbolo,x:Math.round((U+u[0])*1e3)/1e3,y:Math.round((Y+u[1])*1e3)/1e3}),!0}function F(O,V){let k=a(O,V);if(!k)return N("Clique em cima do componente a retirar.",!0),!0;let{t:P,it:U}=k,Y=P.itens.indexOf(U);return P.malha&&Y>=0&&(P.malha.setMatrixAt(Y,C),P.malha.instanceMatrix.needsUpdate=!0),U.fora=!0,h.retirados++,A(),o(!0),f({tipo:"hm3d:remover",simbolo:P.simbolo||null,rotulo:P.rotulo||null,x:Math.round((U[0]+u[0])*1e3)/1e3,y:Math.round((U[1]+u[1])*1e3)/1e3}),!0}return window.addEventListener("message",O=>{if(O.source!==window.parent)return;let V=O.data;if(!(!V||typeof V!="object"))if(V.tipo==="hm3d:editar"&&!h.ligado&&u&&Array.isArray(V.paleta)){if(h.paleta=V.paleta.filter(k=>k&&typeof k.simbolo=="string"&&typeof k.nome=="string").map(k=>({simbolo:k.simbolo,nome:k.nome,grupo:String(k.grupo||k.disciplina||""),montagem:k.montagem,altura_m:typeof k.altura_m=="number"?k.altura_m:null,cor:/^#[0-9a-f]{6}$/i.test(k.cor||"")?k.cor:null})),!h.paleta.length)return;h.ligado=!0,T()}else V.tipo==="hm3d:resultado"&&N(String(V.texto||(V.ok?"Salvo.":"Não foi possível salvar.")).slice(0,200),!V.ok)}),f({tipo:"hm3d:pronto",comOrigem:!!u}),{estado:h,ativo:()=>h.ligado&&h.modo!=="navegar",clique:(O,V)=>h.modo==="inserir"?R(O,V):h.modo==="retirar"?F(O,V):!1}}window.CENA&&window.CENA.tipo==="quadro"?Yh(window.CENA):Dv();function Dv(){let i=window.CENA,t=d=>document.querySelector(d),e=(d,M=2)=>Number(d).toLocaleString("pt-BR",{minimumFractionDigits:M,maximumFractionDigits:M}),n=d=>String(d??"").replace(/[&<>"']/g,M=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[M]),s=i.peDireito,r=i.infra||[],a=1.6,o=.45,l=t("#tela"),c;try{c=new Tr({canvas:l,antialias:!0,preserveDrawingBuffer:!0})}catch(d){throw t("#semwebgl").style.display="flex",d}c.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),c.outputColorSpace=un;let h=new vs;h.background=new fe("#14161b");let p=!0,u=!0;function f(d=!1){p=!0,d&&(u=!0)}l.addEventListener("webglcontextrestored",()=>f(!0));let[_,v,g,m]=i.limites,C=g-_,L=m-v,S=Math.hypot(C,L),T=(d,M,E=0)=>new z(d,E,-M),A=new dn(45,1,.1,S*20+50),N=new Rr(A,l);N.enableDamping=!0,N.dampingFactor=.08,N.maxPolarAngle=Math.PI/2-.02,N.minDistance=.5,N.maxDistance=S*4,N.autoRotateSpeed=.9,N.zoomToCursor=!0,N.addEventListener("change",()=>f());let y=1.6,R=.6,F=new Es("#ffffff","#5a5a4e",y),O=new As("#ffffff",R);h.add(F,O);let V=new es("#fff4e0",1.4);V.position.set(S*.6,S*.9,S*.4),h.add(V);let k={};function P(d,M=h){return k[d]||(k[d]=new An,M.add(k[d])),k[d]}{let d=Math.max(4,S*.15),M=new ji(C+2*d,L+2*d),E=new ze(M,new Mn({color:"#3d4334",roughness:1}));E.rotation.x=-Math.PI/2,E.position.set((_+g)/2,-.02,-(v+m)/2),P("terreno").add(E)}{let d=i.ambientes.filter(M=>M.tipo!=="externo"&&M.poligono.length>=3);if(d.length){let M=1/0,E=1/0,Z=-1/0,$=-1/0;for(let Tt of d)for(let[Ht,kt]of Tt.poligono)M=Math.min(M,Ht),Z=Math.max(Z,Ht),E=Math.min(E,kt),$=Math.max($,kt);let nt=new ji(Z-M+.4,$-E+.4),gt=new ze(nt,new Mn({color:"#8c887e",roughness:1}));gt.rotation.x=-Math.PI/2,gt.position.set((M+Z)/2,.001,-(E+$)/2),P("terreno").add(gt)}}let U=20,Y=d=>.005+d*4e-4,J=[],ot=i.ambientes.filter(d=>d.poligono.length>=3).sort((d,M)=>M.area_m2-d.area_m2),j=ot.map(d=>{let M=1/0,E=1/0,Z=-1/0,$=-1/0;for(let[nt,gt]of d.poligono)M=Math.min(M,nt),Z=Math.max(Z,nt),E=Math.min(E,gt),$=Math.max($,gt);return[M,E,Z,$]}),st=[];ot.forEach((d,M)=>{let E=j[M],Z=0;for(let $=0;$<M&&Z<U;$++){let nt=j[$];E[0]<nt[2]&&E[2]>nt[0]&&E[1]<nt[3]&&E[3]>nt[1]&&(Z=Math.max(Z,st[$]+1))}st.push(Math.min(Z,U))});let lt=Math.max(.03,Y(st.reduce((d,M)=>Math.max(d,M),0))+.01);{let d=new Map;ot.forEach((M,E)=>{let Z=st[E];d.has(Z)||d.set(Z,{pos:[],cor:[],idx:[],ambientes:[]});let $=d.get(Z),nt=new _r(new Ui(M.poligono.map(([Ct,re])=>new bt(Ct,re)))),gt=nt.attributes.position.array,Tt=new fe((i.tiposAmbiente[M.tipo]||i.tiposAmbiente.outros).cor),Ht=$.pos.length/3,kt=Y(Z);for(let Ct=0;Ct<gt.length;Ct+=3)$.pos.push(gt[Ct],kt,-gt[Ct+1]),$.cor.push(Tt.r,Tt.g,Tt.b);let Jt=nt.index?nt.index.array:[...Array(gt.length/3).keys()];for(let Ct=0;Ct<Jt.length;Ct++)$.idx.push(Ht+Jt[Ct]);for(let Ct=0;Ct<Jt.length/3;Ct++)$.ambientes.push(M);nt.dispose()});for(let[M,E]of d){let Z=new Ze;Z.setAttribute("position",new _e(E.pos,3)),Z.setAttribute("normal",new _e(E.pos.map((nt,gt)=>gt%3===1?1:0),3)),Z.setAttribute("color",new _e(E.cor,3)),Z.setIndex(E.idx);let $=new ze(Z,new Mn({vertexColors:!0,roughness:.9,polygonOffset:!0,polygonOffsetFactor:-1-M*.05,polygonOffsetUnits:-1-M}));$.userData={ambientes:E.ambientes},P("ambientes").add($),J.push($)}}let Dt={uAlvo:{value:new z},uDir:{value:new bt(0,0)},uCorte:{value:0},uAltCorte:{value:o},uMargem:{value:.3}};function At(d,M=!1){return d.onBeforeCompile=E=>{Object.assign(E.uniforms,Dt),E.vertexShader=E.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aParede;
uniform vec3 uAlvo; uniform vec2 uDir; uniform float uCorte; uniform float uAltCorte; uniform float uMargem;`).replace("#include <begin_vertex>",`#include <begin_vertex>
{
  bool frente = uCorte > 0.5 && dot(aParede.xz - uAlvo.xz, uDir) > uMargem;
  ${M?"if (!frente) transformed = vec3(aParede.x, -50.0, aParede.z);":"if (frente) { if (aParede.y >= uAltCorte - 0.01) transformed = vec3(aParede.x, -50.0, aParede.z); else transformed.y = min(transformed.y, uAltCorte); }"}
}`)},d.customProgramCacheKey=()=>M?"corte-fantasma":"corte",d}function ae(d,M){let E=[],Z=[],$=[],nt=[],gt=[],[Tt,Ht,kt]=M.map(pe=>new fe(pe)),Jt=[],Ct=[];for(let[pe,Re,Pe,Ue,cn,Qe,hn]of d){let ks=Math.hypot(Pe-pe,Ue-Re);if(ks<1e-4||hn<=Qe)continue;let Hi=(Pe-pe)/ks,ds=(Ue-Re)/ks,Ei=-ds*cn/2,fs=Hi*cn/2,Da=[[pe+Ei,Re+fs],[Pe+Ei,Ue+fs],[Pe-Ei,Ue-fs],[pe-Ei,Re-fs]],Oe=(ii,Vs)=>{let[Gs,rc]=Da[ii];return[Gs,Vs,-rc]},ou=[(pe+Pe)/2,Qe,-(Re+Ue)/2,0],zf=[[Oe(0,Qe),Oe(1,Qe),Oe(1,hn),Oe(0,hn),[-ds,0,-Hi],Tt],[Oe(2,Qe),Oe(3,Qe),Oe(3,hn),Oe(2,hn),[ds,0,Hi],Tt],[Oe(1,Qe),Oe(2,Qe),Oe(2,hn),Oe(1,hn),[Hi,0,-ds],Tt],[Oe(3,Qe),Oe(0,Qe),Oe(0,hn),Oe(3,hn),[-Hi,0,ds],Tt],[Oe(0,hn),Oe(1,hn),Oe(2,hn),Oe(3,hn),[0,1,0],Ht],[Oe(3,Qe),Oe(2,Qe),Oe(1,Qe),Oe(0,Qe),[0,-1,0],kt]];for(let[ii,Vs,Gs,rc,kf,ac]of zf){let Hs=E.length/3;E.push(...ii,...Vs,...Gs,...rc);for(let lu=0;lu<4;lu++)Z.push(...kf),$.push(ac.r,ac.g,ac.b),nt.push(...ou);gt.push(Hs,Hs+1,Hs+2,Hs,Hs+2,Hs+3)}for(let ii=0;ii<4;ii++){let Vs=(ii+1)%4;Jt.push(...Oe(ii,hn),...Oe(Vs,hn),...Oe(ii,Qe),...Oe(Vs,Qe),...Oe(ii,Qe),...Oe(ii,hn));for(let Gs=0;Gs<6;Gs++)Ct.push(...ou)}}let re=new Ze;re.setAttribute("position",new _e(E,3)),re.setAttribute("normal",new _e(Z,3)),re.setAttribute("color",new _e($,3)),re.setAttribute("aParede",new _e(nt,4)),re.setIndex(gt);let te=new Ze;return te.setAttribute("position",new _e(Jt,3)),te.setAttribute("aParede",new _e(Ct,4)),{g:re,gl:te}}let ne=At(new Mn({vertexColors:!0,roughness:.88,side:on})),wt=At(new Mn({vertexColors:!0,roughness:.88,side:on})),w=At(new Mn({color:"#efeae0",roughness:.9,transparent:!0,opacity:.13,depthWrite:!1,side:on}),!0),I=At(new Mn({color:"#8ec9ff",roughness:.1,metalness:.1,transparent:!0,opacity:.28,depthWrite:!1,side:on})),X=At(new ci({color:"#2f2c27",transparent:!0,opacity:.5})),K=[];function rt(d,M,E,{cores:Z=["#efeae0","#5f594f","#cfc8ba"],arestas:$=!0,fantasma:nt=!1}={}){if(!d||!d.length)return null;let{g:gt,gl:Tt}=ae(d,Z),Ht=new ze(gt,M);if(Ht.renderOrder=2,P(E).add(Ht),nt){let kt=new ze(gt,w);kt.renderOrder=5,P(E).add(kt),K.push(kt)}if($){let kt=new vi(Tt,X);kt.renderOrder=3,P(E).add(kt)}return Ht}let yt=rt(i.paredes,ne,"paredes",{fantasma:!0});rt(i.muretas,wt,"paredes",{cores:["#ddd5c6","#5f594f","#cfc8ba"],fantasma:!0}),rt(i.guardas,I,"paredes"),rt(i.vidros,I,"paredes",{arestas:!1});let ie=new Mn({color:"#a5a39c",roughness:.8}),at=[];for(let d of i.pilares){if(d.length<3)continue;let M=new da(new Ui(d.map(([Z,$])=>new bt(Z,$))),{depth:s,bevelEnabled:!1}),E=new ze(M,ie);E.rotation.x=-Math.PI/2,P("pilares").add(E),at.push({m:E,cx:d.reduce((Z,$)=>Z+$[0],0)/d.length,cz:-d.reduce((Z,$)=>Z+$[1],0)/d.length})}if(i.planta){let d=atob(i.planta),M=new Uint8Array(d.length);for(let nt=0;nt<d.length;nt++)M[nt]=d.charCodeAt(nt);let E=new Int16Array(M.buffer),Z=new Float32Array(E.length/2*3);for(let nt=0,gt=0;nt<E.length;nt+=2,gt+=3)Z[gt]=E[nt]/100,Z[gt+1]=lt,Z[gt+2]=-E[nt+1]/100;let $=new Ze;$.setAttribute("position",new _e(Z,3)),P("planta").add(new vi($,new ci({color:"#3a382f",transparent:!0,opacity:.6})))}rt(i.folhas.map(([d,M,E,Z])=>[d,M,E,Z,.04,0,i.alturaPorta]),At(new Mn({color:"#b08457",roughness:.7,transparent:!0,opacity:.85})),"portas",{arestas:!1});function dt(d){let M=[],E=[],Z=[];for(let[nt,gt]of d){let Tt=nt.index?nt.toNonIndexed():nt,Ht=Tt.attributes.position.array,kt=Tt.attributes.normal.array,[Jt,Ct,re]=Array.isArray(gt)?gt:[gt,gt,gt];for(let te=0;te<Ht.length;te++)M.push(Ht[te]),E.push(kt[te]);for(let te=0;te<Ht.length/3;te++)Z.push(Jt,Ct,re)}let $=new Ze;return $.setAttribute("position",new _e(M,3)),$.setAttribute("normal",new _e(E,3)),$.setAttribute("color",new _e(Z,3)),$}let ht=(d,M,E,Z=0,$=0,nt=0)=>new qn(d,M,E).translate(Z,$,nt+E/2),xt=(d,M,E=0,Z=0,$=0,nt=14)=>new hi(d,d,M,nt).rotateX(Math.PI/2).translate(E,Z,$+M/2),Pt=(d,M=0,E=0,Z=0)=>new bs(d,14,6,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2).translate(M,E,Z),Xt=.12,ee={tomada:(d,M,E)=>dt([[ht(d,M,E),1],[xt(d*.34,.004,0,0,E),.7],[xt(d*.065,.004,-d*.14,0,E+.003,8),Xt],[xt(d*.065,.004,d*.14,0,E+.003,8),Xt]]),interruptor:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.52,M*.44,.012,0,0,E),.78],[ht(d*.12,M*.04,.003,0,M*.14,E+.012),Xt]]),rede:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.62,M*.34,.004,0,M*.04,E),.7],[ht(d*.38,M*.17,.004,0,M*.06,E+.003),Xt],[ht(d*.14,M*.05,.004,0,-M*.05,E+.003),Xt]]),coaxial:(d,M,E)=>dt([[ht(d,M,E),1],[xt(d*.2,.014,0,0,E),.75],[xt(d*.06,.004,0,0,E+.014,10),Xt]]),quadro:(d,M,E)=>dt([[ht(d,M,E*.85),.68],[ht(d-.04,M-.04,.012,0,0,E*.85),1.05],[ht(.025,.1,.02,d/2-.07,0,E*.85+.012),Xt],[ht(d*.36,.05,.003,0,M/2-.1,E*.85+.012),.3]]),rack:(d,M,E)=>dt([[ht(d,M,E*.92),.4],[ht(d-.03,M-.03,.01,0,0,E*.92),.8],[ht(d-.1,M-.1,.004,0,0,E*.92+.01),.22],[ht(.02,.08,.02,d/2-.05,0,E*.92+.01),1.3]]),caixa:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.7,M*.7,.004,0,0,E),.7]]),teclado:(d,M,E)=>{let Z=[[ht(d,M,E),1],[ht(d*.72,M*.2,.003,0,M*.28,E),Xt]];for(let $ of[.06,-.07,-.2,-.33])for(let nt of[-.24,0,.24])Z.push([ht(d*.17,M*.08,.004,nt*d,$*M,E),.55]);return dt(Z)},acionador:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.6,M*.6,.004,0,0,E),1.5],[xt(d*.12,.006,0,0,E+.004,12),Xt]]),sirene:(d,M,E)=>dt([[ht(d,M,E*.45),.85],[xt(d*.36,E*.55,0,0,E*.45),1.35]]),barra:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.9,M*.3,.003,0,0,E),.6]]),emergencia:(d,M,E)=>dt([[ht(d,M,E),.9],[ht(d*.36,M*.5,.004,-d*.22,0,E),1.8],[ht(d*.36,M*.5,.004,d*.22,0,E),1.8]]),wallbox:(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.5,M*.18,.003,0,M*.22,E),Xt],[xt(d*.16,.05,0,-M*.18,E),.5]]),luminaria:(d,M,E)=>dt([[ht(d,M,E),.62],[ht(d-.05,M-.05,.004,0,0,E),1.25]]),"ponto-luz":(d,M,E)=>dt([[xt(d*.5,E*.25),.7],[Pt(d*.3,0,0,E*.25),1.3]]),detector:(d,M,E)=>dt([[xt(d*.5,E*.3),.78],[xt(d*.4,E*.7,0,0,E*.3),1.05],[xt(d*.05,.004,d*.2,0,E,8),Xt]]),sensor:(d,M,E)=>dt([[xt(d*.5,E*.35),.85],[Pt(d*.32,0,0,E*.35),1.2]]),ap:(d,M,E)=>dt([[xt(d*.5,E,0,0,0,24),1.1],[xt(d*.08,.003,0,0,E,8),.4]]),camera:(d,M,E)=>{let Z=E-.08;return dt([[xt(.035,.012),.6],[ht(.025,.025,.07,0,0,.012),.6],[xt(d*.5,Z,0,0,.08),1],[ht(d*1.2,.01,Z*.85,0,d*.5+.006,.08+Z*.18),.85],[xt(d*.32,.004,0,0,E),Xt]])},dome:(d,M,E)=>dt([[xt(d*.5,E*.3),.9],[Pt(d*.42,0,0,E*.3),.3]]),"sensor-canto":(d,M,E)=>dt([[ht(d,M,E),1],[ht(d*.78,M*.42,.008,0,-M*.12,E),.35],[xt(d*.06,.003,0,M*.32,E,8),Xt]]),catraca:(d,M,E)=>dt([[new qn(d,M,E).translate(0,M/2,0),.9],[new qn(d*1.05,.04,E*1.02).translate(0,M,0),.6]]),poste:(d,M,E)=>dt([[ht(.3,.3,.03),.5],[xt(.07,E-.03,0,0,.03,10),.55],[xt(.045,.1,0,0,E-.05,10),.55],[ht(d*.55,.05,.05,d*.27,0,E-.3),.55],[ht(.42,M,.12,d*.55,0,E-.42),1],[ht(.36,M*.8,.004,d*.55,0,E-.424),1.8]]),"caixa-piso":(d,M,E)=>dt([[ht(d,M,E),.6],[ht(d*.9,M*.9,.004,0,0,E),1.1]])},oe={tomada:[.1,.16,.03],interruptor:[.1,.16,.03],quadro:[.6,.8,.15],rack:[.6,.6,.45],luminaria:[.62,.62,.06],"ponto-luz":[.26,.26,.1],detector:[.16,.16,.07],sensor:[.13,.13,.06],camera:[.11,.11,.32],"sensor-canto":[.08,.13,.07],catraca:[.3,1,.8],barra:[.3,.06,.05]},he=new Set(["luminaria","ponto-luz","detector","sensor","ap","dome"]);for(let d of i.dispositivos)d.tam=d.tam||oe[d.forma]||[.18,.18,.07],d.montagem=d.montagem||(he.has(d.forma)?"teto":d.forma==="catraca"?"piso":d.forma==="camera"||d.forma==="sensor-canto"?"canto":"parede");let B={uPx:{value:.001},uMin:{value:14},uBase:{value:1},uMinInfra:{value:3}},we=40;function ye(d,M,E){let Z=new Mn({color:d,vertexColors:!0,emissive:d,emissiveIntensity:E,roughness:.55,metalness:.05});return Z.onBeforeCompile=$=>{Object.assign($.uniforms,{uPx:B.uPx,uMin:B.uMin,uBase:B.uBase,uTam:{value:M}}),$.vertexShader=$.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMin; uniform float uBase; uniform float uTam;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = max(uBase, min(uMin * uPx * distance(cameraPosition, o) / uTam, ${we.toFixed(1)}));
  transformed *= s;
}
#endif`),$.fragmentShader=$.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
#ifdef USE_COLOR
totalEmissiveRadiance *= vColor.rgb;
#endif`)},Z.customProgramCacheKey=()=>"dispositivo",Z}function D(d,M){return Math.max(B.uBase.value,Math.min(B.uMin.value*B.uPx.value*M/d,we))}let x=[],H=new fn,Q=new z(0,0,1),et=new z;function Et(d,M){d.itens.forEach(([E,Z,$,nt,gt],Tt)=>{H.position.set(E,$,-Z),H.quaternion.identity(),d.montagem==="teto"?H.quaternion.setFromUnitVectors(Q,et.set(0,-1,0)):d.montagem==="piso"?d.forma!=="catraca"&&H.quaternion.setFromUnitVectors(Q,et.set(0,1,0)):(nt||gt)&&(et.set(nt,0,-gt).normalize(),d.forma==="camera"?et.y=-.45:d.forma==="sensor-canto"&&(et.y=-.35),H.quaternion.setFromUnitVectors(Q,et.normalize())),H.scale.set(1,1,1),H.updateMatrix(),M.setMatrixAt(Tt,H.matrix)}),M.instanceMatrix.needsUpdate=!0}let Rt=[],ut=new Map;for(let d of i.dispositivos){if(!d.itens.length)continue;let M=d.forma==="luminaria"?.55:d.forma==="ponto-luz"?.5:.22;d.tamMax=Math.max(...d.tam);let E=(ee[d.forma]||ee.caixa)(...d.tam),Z=ye(d.cor,d.tamMax,M);d.montagem==="teto"&&(Z.transparent=!0,Rt.push(Z));let $=new ys(E,Z,d.itens.length);$.userData={tipo:d},$.renderOrder=1,$.frustumCulled=!1,Et(d,$),P(`disc:${d.disciplina}`).add($),x.push($),d.malha=$;for(let nt of d.itens)ut.has(nt[5])||ut.set(nt[5],[]),ut.get(nt[5]).push([d,nt]);if(d.itens.some(nt=>Array.isArray(nt[7]))){let nt=[],gt=[],Tt=[];for(let[kt,Jt,Ct,,,,,re]of d.itens){if(!Array.isArray(re)||re.length<6)continue;let te=[];for(let Pe=0;Pe<re.length;Pe+=2)te.push([re[Pe],re[Pe+1]]);let pe=[kt,Ct,-Jt],Re=lt;for(let Pe=1;Pe<te.length-1;Pe++)nt.push(te[0][0],Re,-te[0][1],te[Pe][0],Re,-te[Pe][1],te[Pe+1][0],Re,-te[Pe+1][1]);for(let Pe=0;Pe<te.length;Pe++){let Ue=te[Pe],cn=te[(Pe+1)%te.length];gt.push(...pe,Ue[0],Re,-Ue[1],cn[0],Re,-cn[1]),Tt.push(Ue[0],Re+.005,-Ue[1],cn[0],Re+.005,-cn[1])}}let Ht=(kt,Jt,Ct=ze)=>{let re=new Ze;re.setAttribute("position",new _e(kt,3));let te=new Ct(re,Jt);return te.renderOrder=4,P("campo").add(te),te};Ht(nt,new Bn({color:d.cor,transparent:!0,opacity:.22,depthWrite:!1,side:on})),Ht(gt,new Bn({color:d.cor,transparent:!0,opacity:.05,depthWrite:!1,side:on})),Ht(Tt,new ci({color:d.cor,transparent:!0,opacity:.7}),vi)}}let ft=i.instalacao&&Array.isArray(i.instalacao.pontos)&&Array.isArray(i.instalacao.quadros)?i.instalacao:null,mt=ft?Yl(ft,i.titulo):null,jt={luminaria:"luz",ponto_luz:"luz",tomada:"tomada",tue:"tomada",motor:"motor"},St=[],Lt=new WeakMap,$t=new fe(1,1,1),Wt=new fe,ce=null;if(mt){let d=new Map(mt.quadros().filter(E=>E.ponto).map(E=>[String(E.ponto),E.tag]));for(let E of i.dispositivos)E.malha&&E.itens.forEach((Z,$)=>{let nt=String(Z[6]||""),gt=null,Tt=null;E.forma==="quadro"?(gt="quadro",Tt=d.get(nt)||null):nt&&mt.temPonto(nt)&&(gt=jt[mt.ponto(nt).tipo]||"comando"),gt&&St.push({t:E,i:$,it:Z,id:nt,kind:gt,quadro:Tt})});let M=St.filter(E=>E.kind==="quadro"&&!E.quadro);M.length===1&&mt.quadros().length===1&&(M[0].quadro=mt.quadros()[0].tag);for(let E=St.length-1;E>=0;E--)St[E].kind==="quadro"&&!St[E].quadro&&St.splice(E,1);for(let E of St)Lt.set(E.it,E);for(let E of new Set(St.map(Z=>Z.t))){for(let Z=0;Z<E.itens.length;Z++)E.malha.setColorAt(Z,$t);E.malha.instanceColor.needsUpdate=!0}}function q(d){if(d.kind==="quadro"){let E=mt.quadro(d.quadro);return E&&[E.geral?.tag,...(E.disjuntores||[]).map($=>$.tag),...(E.drs||[]).map($=>$.tag)].filter(Boolean).some($=>!mt.ligado($,E.tag))?Wt.setRGB(1.6,1.05,.35):Wt.copy($t)}let M=mt.estadoPonto(d.id);if(!M)return Wt.copy($t);if(d.kind==="luz"){if(!M.alimentado)return Wt.setRGB(.2,.2,.24);let E=M.nivel;return Wt.setRGB(.3+1.45*E,.3+1.32*E,.33+.97*E)}if(d.kind==="tomada")return M.alimentado?Wt.copy($t):Wt.setRGB(1.55,.18,.18);if(d.kind==="motor"){let E=mt.painel(M.circuito);return M.alimentado?M.energizado?Wt.setRGB(.45,1.7,.55):E?.termico?Wt.setRGB(1.7,1.1,.2):Wt.setRGB(.7,.7,.7):Wt.setRGB(.45,.25,.25)}return M.alimentado?Wt.copy($t):Wt.setRGB(.6,.3,.3)}function It(){if(!mt)return;let d=new Set;for(let M of St)M.t.malha.setColorAt(M.i,q(M)),d.add(M.t.malha);for(let M of d)M.instanceColor.needsUpdate=!0;_t(),nu(),ce?.atualizar(),iu(),f(!0)}let pt=window.matchMedia?.("(pointer: coarse)").matches||window.innerWidth<=900?8:12,Nt=[],Ut=P("luzes-sim");if(Ut.visible=!1,mt&&St.some(d=>d.kind==="luz"))for(let d=0;d<pt;d++){let M=new ga("#fff1d6",0,7,2);Ut.add(M),Nt.push(M)}function _t(){if(!Nt.length)return;let d=Se==="dentro"&&en>=0,M=0,E=[];if(d)for(let $ of St){if($.kind!=="luz"||$.it[5]!==en)continue;M++;let nt=mt.estadoPonto($.id).nivel;nt>0&&E.push({x:$,n:nt,d:A.position.distanceToSquared(et.set($.it[0],$.it[2],-$.it[1]))})}Ut.visible=d&&M>0;let Z=Ut.visible?E.reduce(($,nt)=>$+nt.n,0)/M:1;F.intensity=y*(.3+.7*Z),O.intensity=R*(.3+.7*Z),E.sort(($,nt)=>$.d-nt.d),Nt.forEach(($,nt)=>{let gt=E[nt];$.intensity=gt?3.2*gt.n:0,gt&&$.position.set(gt.x.it[0],gt.x.it[2]-.15,-gt.x.it[1])}),f()}let Kt=d=>d?{transparent:!0,opacity:.55,depthWrite:!1}:{};function Zt(d,M,E=!1){let Z=new Mn({color:d,emissive:d,emissiveIntensity:.18,roughness:.45,metalness:.35,...Kt(E)});return Z.onBeforeCompile=$=>{Object.assign($.uniforms,{uPx:B.uPx,uMinInfra:B.uMinInfra,uSecao:{value:M}}),$.vertexShader=$.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMinInfra; uniform float uSecao;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = clamp(uMinInfra * uPx * distance(cameraPosition, o) / uSecao, 1.0, 15.0);
  transformed.yz *= s;
}
#endif`)},Z.customProgramCacheKey=()=>"infra",Z}let Te=P("infra");for(let d of r){let M=d.segmentos||[],E=Math.floor(M.length/4);if(!E)continue;let Z=new An;P(`infra:${d.disciplina}`,Te).add(Z),d.objeto=Z;let[$,nt]=d.secao||[.05,.05];if(d.forma!=="linha"){let Ct=d.forma==="tubo"?new hi(.5,.5,1,8).rotateZ(Math.PI/2):new qn(1,1,1),re=new ys(Ct,Zt(d.cor,Math.max($,nt),d.sugerido),E);for(let te=0;te<E;te++){let pe=M[te*4],Re=M[te*4+1],Pe=M[te*4+2],Ue=M[te*4+3],cn=Math.hypot(Pe-pe,Ue-Re);H.position.set((pe+Pe)/2,d.z,-(Re+Ue)/2),H.quaternion.identity(),H.rotation.set(0,Math.atan2(Ue-Re,Pe-pe),0),H.scale.set(cn+$,nt,$),H.updateMatrix(),re.setMatrixAt(te,H.matrix)}re.instanceMatrix.needsUpdate=!0,re.frustumCulled=!1,re.renderOrder=1,Z.add(re)}let gt=d.descidas||[],Tt=Math.floor(gt.length/4),Ht=d.forma==="tubo"?$:.025;if(Tt&&d.forma!=="linha"){let Ct=new ys(new hi(.5,.5,1,8),new Mn({color:d.cor,emissive:d.cor,emissiveIntensity:.18,roughness:.45,metalness:.35,...Kt(d.sugerido)}),Tt);for(let re=0;re<Tt;re++){let[te,pe,Re,Pe]=gt.slice(re*4,re*4+4);H.position.set(te,(Re+Pe)/2,-pe),H.quaternion.identity(),H.rotation.set(0,0,0),H.scale.set(Ht,Math.max(.01,Pe-Re),Ht),H.updateMatrix(),Ct.setMatrixAt(re,H.matrix)}Ct.instanceMatrix.needsUpdate=!0,Ct.frustumCulled=!1,Z.add(Ct)}let kt=new Float32Array((E+Tt)*6);for(let Ct=0;Ct<E;Ct++)kt.set([M[Ct*4],d.z,-M[Ct*4+1],M[Ct*4+2],d.z,-M[Ct*4+3]],Ct*6);for(let Ct=0;Ct<Tt;Ct++)kt.set([gt[Ct*4],gt[Ct*4+2],-gt[Ct*4+1],gt[Ct*4],gt[Ct*4+3],-gt[Ct*4+1]],(E+Ct)*6);let Jt=new Ze;Jt.setAttribute("position",new _e(kt,3)),Z.add(new vi(Jt,new ci({color:d.cor,transparent:!0,opacity:d.forma==="linha"?.95:.8})))}let Ie=d=>[d.rotulo,d.material,d.medida].filter(Boolean).join(" "),rn=d=>({texto:"medida do desenho",desenho:"medida do desenho",layer:"medida da layer",legenda:"medida da legenda",estimado:"traçado e bitola estimados — conferir",sugerido:"caminho SUGERIDO pelo sistema (não está no projeto) — conferir"})[d.origem_medida]||"medida padrão ilustrativa",Me={paredes:0,corte:!0,ambientes:!0,etiquetas:!0,portas:!0,planta:!0,campo:!1,giro:!1,grandes:!1,infra:!0,sugerido:!0},Se="geral",en=-1,Si=null,We=null,W=0,vt=0,Mt=new z,Ot={lateral:0,topo:0},Ne=t("#etiquetas"),se=i.ambientes.map(d=>{let M=document.createElement("div");return M.className="etq",M.innerHTML=`<b>${n(d.nome)}</b><span>${e(d.area_m2)} m²</span>`,Ne.appendChild(M),{a:d,el:M,p:T(d.centro[0],d.centro[1],.05),lado:Math.sqrt(d.area_m2),ret:null}}).sort((d,M)=>M.a.area_m2-d.a.area_m2);function Fe(){if(!Me.etiquetas||Se!=="geral"){for(let $ of se)$.el.style.display="none",$.ret=null;return}let d=l.clientWidth,M=l.clientHeight,E=M/2/Math.tan(ln.degToRad(A.fov/2)),Z=[];for(let $ of se){et.copy($.p).project(A);let nt=A.position.distanceTo($.p),gt=$.lado*E/Math.max(nt,.1),Tt=(et.x+1)/2*d,Ht=(1-et.y)/2*M,kt=et.z<1&&gt>38&&Tt>50&&Tt<d-Ot.lateral-50&&Ht>Ot.topo+18&&Ht<M-60;if(kt){let Jt=[Tt-55,Ht-16,Tt+55,Ht+16];Z.some(Ct=>Jt[0]<Ct[2]&&Jt[2]>Ct[0]&&Jt[1]<Ct[3]&&Jt[3]>Ct[1])?kt=!1:Z.push(Jt)}$.el.style.display=kt?"":"none",$.ret=kt?[Tt-60,Ht-18,Tt+60,Ht+18]:null,kt&&($.el.style.transform=`translate(-50%, -50%) translate(${Tt.toFixed(1)}px, ${Ht.toFixed(1)}px)`)}}function Ye(d,M){return d.montagem==="teto"?"no teto":d.montagem==="piso"?"no piso":d.montagem==="topo-porta"?"acima da porta":d.montagem==="canto"?`no alto do canto · h = ${e(M[2])} m`:`h = ${e(M[2])} m`}let be=t("#etiquetas-pontos"),Ke=[];function Jn(d){if(!Ke[d]){let M=document.createElement("div");M.className="etq-p";let E=document.createElement("b"),Z=document.createElement("span");M.append(E,Z),be.appendChild(M),Ke[d]={el:M,b:E,s:Z,chave:null}}return Ke[d]}function us(){let d=0;if(be&&Se==="dentro"&&!We&&Me.etiquetas){let M=l.clientWidth,E=l.clientHeight,Z=[];for(let[nt,gt]of ut.get(en)||[]){if(!nt.malha.visible||!nt.malha.parent.visible)continue;et.set(gt[0],gt[2],-gt[1]);let Tt=A.position.distanceTo(et),Ht=D(nt.tamMax,Tt),kt=nt.montagem==="teto";if(et.y+=kt?-nt.tam[2]*Ht:nt.montagem==="piso"?(nt.forma==="poste"?nt.tam[2]:nt.tam[1])*Ht:nt.tam[1]/2*Ht,et.project(A),et.z>1||et.z<-1)continue;let Jt=(et.x+1)/2*M,Ct=(1-et.y)/2*E;Jt<20||Jt>M-Ot.lateral-20||Ct<Ot.topo+50||Ct>E-70||Z.push({t:nt,it:gt,d:Tt,x:Jt,y:kt?Ct+46:Ct})}Z.sort((nt,gt)=>nt.d-gt.d);let $=[];for(let nt of Z){if(d>=30)break;let gt=[nt.x-70,nt.y-46,nt.x+70,nt.y-6];if($.some(kt=>gt[0]<kt[2]&&gt[2]>kt[0]&&gt[1]<kt[3]&&gt[3]>kt[1]))continue;$.push(gt);let Tt=Jn(d++),Ht=`${nt.t.simbolo}|${nt.it[6]}|${nt.it[0]}|${nt.it[1]}`;Tt.chave!==Ht&&(Tt.chave=Ht,Tt.b.textContent=nt.t.rotulo,Tt.s.textContent=Ye(nt.t,nt.it)+(nt.it[6]?` · ${nt.it[6]}`:""),Tt.el.style.setProperty("--cor",nt.t.cor),Tt.el.style.display="",Tt.larg=Tt.el.offsetWidth),Tt.el.style.display="",nt.x=ln.clamp(nt.x,Tt.larg/2+4,M-Ot.lateral-Tt.larg/2-4),Tt.el.style.transform=`translate(-50%, -100%) translate(${nt.x.toFixed(1)}px, ${(nt.y-6).toFixed(1)}px)`}}for(let M=d;M<Ke.length;M++)Ke[M].el.style.display="none"}let Ls=new z((_+g)/2,0,-(v+m)/2);function Lr(){let d=l.clientWidth,M=l.clientHeight,E=document.querySelector("aside"),Z=d>900&&E?E.offsetWidth+16:0,$=document.querySelector("#barra")?.getBoundingClientRect().bottom||0;return{w:d,h:M,lateral:Z,topo:$,livreW:Math.max(200,d-Z-32),livreH:Math.max(200,M-$-50)}}function zi(d){A.fov=d,A.updateProjectionMatrix(),f()}function Ds(){$e(),zi(45);let d=Lr(),M=Math.max(1,d.w/d.livreW*.85)*Math.max(1,1/A.aspect);A.position.copy(Ls).add(new z(S*.42*M,S*.5*M,S*.58*M)),N.target.copy(Ls),N.update()}function Dr(){$e(),zi(30);let d=Lr(),M=2*Math.tan(ln.degToRad(A.fov/2)),E=Math.max(C*d.w/(d.livreW*M*A.aspect),L*d.h/(d.livreH*M))*1.04;A.position.copy(Ls).add(new z(0,E+s,.001)),N.target.copy(Ls),N.update()}function b([d,M],E){let Z=!1;for(let $=0,nt=E.length-1;$<E.length;nt=$++){let[gt,Tt]=E[$],[Ht,kt]=E[nt];Tt>M!=kt>M&&d<(Ht-gt)*(M-Tt)/(kt-Tt)+gt&&(Z=!Z)}return Z}function G(d,M,E){let Z=1/0;for(let $=0;$<E.length;$++){let nt=E[$],gt=E[($+1)%E.length],Tt=gt[0]-nt[0],Ht=gt[1]-nt[1],kt=M[0]*Ht-M[1]*Tt;if(Math.abs(kt)<1e-9)continue;let Jt=((nt[0]-d[0])*Ht-(nt[1]-d[1])*Tt)/kt,Ct=((nt[0]-d[0])*M[1]-(nt[1]-d[1])*M[0])/kt;Jt>.05&&Ct>=0&&Ct<=1&&Jt<Z&&(Z=Jt)}return Z}let ct={quadro:5,rack:5,teclado:2,caixa:2,wallbox:3};function it(d){let M=d.poligono,E=M.length,Z=Ue=>Math.hypot(M[(Ue+1)%E][0]-M[Ue][0],M[(Ue+1)%E][1]-M[Ue][1]),$=Math.max(...M.map((Ue,cn)=>Z(cn))),nt=(ut.get(d.i)||[]).filter(([Ue])=>Ue.montagem==="parede"||Ue.montagem==="canto"),gt=0,Tt=-1;for(let Ue=0;Ue<E;Ue++){let cn=Z(Ue);if(cn<.85*$)continue;let[Qe,hn]=[M[Ue],M[(Ue+1)%E]],ks=0;for(let[ds,Ei]of nt){let fs=hn[0]-Qe[0],Da=hn[1]-Qe[1],Oe=ln.clamp(((Ei[0]-Qe[0])*fs+(Ei[1]-Qe[1])*Da)/(cn*cn),0,1);Math.hypot(Ei[0]-Qe[0]-fs*Oe,Ei[1]-Qe[1]-Da*Oe)<.4&&(ks+=ct[ds.forma]||1)}let Hi=ks*10+cn;Hi>Tt&&(Tt=Hi,gt=Ue)}let Ht=Z(gt),kt=M[gt],Jt=M[(gt+1)%E],Ct=[(kt[0]+Jt[0])/2,(kt[1]+Jt[1])/2],re=[(Jt[0]-kt[0])/Ht,(Jt[1]-kt[1])/Ht],te=[-re[1],re[0]];b([Ct[0]+te[0]*.2,Ct[1]+te[1]*.2],M)||(te=[-te[0],-te[1]]);let pe=G(Ct,te,M);if(Number.isFinite(pe)&&pe<2.6&&Ht>2.5*pe){let Ue=[Ct[0]+te[0]*pe/2,Ct[1]+te[1]*pe/2],cn=[Ue[0]-re[0]*(Ht/2-.6),Ue[1]-re[1]*(Ht/2-.6)];if(b(cn,M))return{olho:cn,alvo:[Ue[0]+re[0]*Ht/2,Ue[1]+re[1]*Ht/2],altura:1.5}}let Re=Math.min(pe-.35,Math.max(3,Ht*.9));(!Number.isFinite(Re)||Re<.6)&&(Re=Number.isFinite(pe)?pe/2:1.5);let Pe=[Ct[0]+te[0]*Re,Ct[1]+te[1]*Re];return b(Pe,M)||(Pe=d.centro),{olho:Pe,alvo:Ct}}function tt(){A.rotation.order="YXZ",A.rotation.set(vt,W,0),f()}function Ft(d){let M=et.copy(d).sub(A.position).normalize();W=Math.atan2(-M.x,-M.z),vt=Math.asin(ln.clamp(M.y,-1,1)),tt()}function Vt(d){return We?Mt.clone():Se==="geral"?N.target.clone():A.position.clone().add(A.getWorldDirection(new z).multiplyScalar(d))}let Bt=d=>d<.5?4*d*d*d:1-Math.pow(-2*d+2,3)/2;function Yt(d,M,E,Z,$,nt){We={t0:performance.now(),dur:$,p0:A.position.clone(),p1:M.clone(),a0:d,a1:E.clone(),f0:A.fov,f1:Z,fim:nt},f(!0),$||Qt(performance.now())}function Qt(d){if(!We)return;f(!0);let M=We.dur?Math.min(1,(d-We.t0)/We.dur):1,E=Bt(M);if(A.position.lerpVectors(We.p0,We.p1,E),Mt.lerpVectors(We.a0,We.a1,E),A.rotation.order="XYZ",A.lookAt(Mt),zi(We.f0+(We.f1-We.f0)*E),M>=1){let Z=We.fim;We=null,Z&&Z()}}let ue=null;function ve(d){ue&&(ue.geometry.dispose(),ue.material.dispose(),P("forro").remove(ue),ue=null),!(!d||d.poligono.length<3)&&(ue=new ze(new _r(new Ui(d.poligono.map(([M,E])=>new bt(M,E)))),new Bn({color:"#cfccc4",side:on})),ue.rotation.x=-Math.PI/2,ue.position.y=s+.002,P("forro").add(ue),f())}let qt=t("#dentro");function Ce(d){qt&&(t("#dentro-nome").textContent=d?d.nome:"",qt.classList.toggle("aberto",!!d),document.body.classList.contains("modo-dentro")!==!!d&&(document.body.classList.toggle("modo-dentro",!!d),La()),Nn(),_t(),iu(),ce?.legenda(),f(!0))}function Je(d,M={}){let E=typeof d=="number"?i.ambientes[d]:i.ambientes.find(kt=>kt.nome===d);if(!E||E.poligono.length<3)return!1;let{olho:Z,alvo:$,altura:nt}=it(E),gt=T(Z[0],Z[1],a),Tt=T($[0],$[1],nt||1.1),Ht=Vt(A.position.distanceTo(Tt));return Se==="geral"&&(Si={pos:A.position.clone(),alvo:N.target.clone(),fov:A.fov}),Se="dentro",en=E.i??i.ambientes.indexOf(E),N.enabled=!1,N.autoRotate=!1,ve(E),Ce(E),Yt(Ht,gt,Tt,M.fov||70,M.instantaneo?0:1100,()=>Ft(Tt)),!0}function $e(){Se!=="geral"&&(We=null,Se="geral",en=-1,ve(null),Ce(null),A.rotation.order="XYZ",N.enabled=!0,N.autoRotate=Me.giro,f(!0))}function ke(d={}){if(Se==="geral")return;let M=Si;if(!M){Ds();return}let E=Vt(A.position.distanceTo(M.alvo));Se="saindo",ve(null),Ce(null),Yt(E,M.pos,M.alvo,M.fov,d.instantaneo?0:900,()=>{Se="geral",en=-1,A.rotation.order="XYZ",N.target.copy(M.alvo),N.enabled=!0,N.autoRotate=Me.giro,N.update()})}function xn(d,M,E){let Z=new z(d,a,M),$=A.getWorldDirection(new z),nt=Z.clone().add($.multiplyScalar(3));E&&E.i!==en&&(en=E.i,ve(E),Ce(E)),Yt(Vt(3),Z,nt,A.fov,700,()=>Ft(nt))}function Gt(d,M){let E=null;for(let Z of i.ambientes)Z.poligono.length>=3&&b([d,M],Z.poligono)&&(!E||Z.area_m2<E.area_m2)&&(E=Z);return E}let bn=["sólidas","translúcidas","ocultas"];function Le(){let d=Me.paredes;P("paredes").visible=d!==2,P("pilares").visible=d!==2;for(let M of[ne,wt])M.transparent=d===1,M.opacity=d===1?M===ne?.42:.6:1,M.depthWrite=d!==1,M.needsUpdate=!0;t("#b-paredes").textContent=`Paredes: ${bn[d]}`,t("#b-paredes").classList.toggle("ativo",d!==2),f()}function nn(d,M,E){let Z=t(d);Z&&(Z.classList.toggle("ativo",!!Me[M]),Z.addEventListener("click",()=>{Me[M]=!Me[M],Z.classList.toggle("ativo",Me[M]),E(),f(!0)}))}function Nn(){B.uMin.value=(Me.grandes?26:14)+(Se==="dentro"?6:0),B.uBase.value=Me.grandes?1.5:1,B.uMinInfra.value=Me.grandes?6:3,f(!0)}t("#b-paredes").addEventListener("click",()=>{Me.paredes=(Me.paredes+1)%3,Le()}),nn("#b-corte","corte",()=>{}),nn("#b-ambientes","ambientes",()=>{P("ambientes").visible=Me.ambientes}),nn("#b-etiquetas","etiquetas",()=>{}),nn("#b-portas","portas",()=>{P("portas").visible=Me.portas}),nn("#b-planta","planta",()=>{P("planta").visible=Me.planta}),i.planta||t("#b-planta")?.remove(),nn("#b-campo","campo",()=>{P("campo").visible=Me.campo}),nn("#b-giro","giro",()=>{N.autoRotate=Me.giro&&Se==="geral"}),nn("#b-grandes","grandes",Nn),nn("#b-infra","infra",()=>{Te.visible=Me.infra}),r.length||t("#b-infra")?.remove(),nn("#b-sugerido","sugerido",()=>{for(let d of r)d.sugerido&&d.objeto&&(d.objeto.visible=Me.sugerido)}),r.some(d=>d.sugerido)||t("#b-sugerido")?.remove(),P("campo").visible=Me.campo,t("#b-cima").addEventListener("click",Dr),t("#b-3d").addEventListener("click",Ds),t("#b-voltar")?.addEventListener("click",()=>ke()),t("#b-tela")?.addEventListener("click",()=>{let d=document.documentElement;document.fullscreenElement?document.exitFullscreen?.():d.requestFullscreen?.()});let Sn=t("#ir-ambiente");if(Sn){let d=i.ambientes.filter(M=>M.poligono.length>=3).sort((M,E)=>M.nome.localeCompare(E.nome,"pt-BR",{numeric:!0})||M.area_m2-E.area_m2);d.length||Sn.remove();for(let M of d){let E=document.createElement("option");E.value=String(M.i),E.textContent=`${M.nome} (${e(M.area_m2,1)} m²)`,Sn.appendChild(E)}Sn.addEventListener("change",()=>{Sn.value!==""&&Je(Number(Sn.value)),Sn.value="",Sn.blur()})}let ki=t("#disciplinas");for(let[d,M]of Object.entries(i.disciplinas)){let E=i.dispositivos.filter(nt=>nt.disciplina===d).reduce((nt,gt)=>nt+gt.itens.length,0),Z=r.filter(nt=>nt.disciplina===d).reduce((nt,gt)=>nt+gt.comprimento_m,0),$=document.createElement("button");$.className="ativo disc",$.style.setProperty("--cor",M.cor),$.innerHTML=`<i></i>${n(M.rotulo)} <small>${E||!Z?E:`${e(Z,0)} m`}</small>`,$.addEventListener("click",()=>{let nt=P(`disc:${d}`);nt.visible=!nt.visible,k[`infra:${d}`]&&(k[`infra:${d}`].visible=nt.visible),$.classList.toggle("ativo",nt.visible),f(!0)}),ki.appendChild($)}i.dispositivos.some(d=>d.itens.some(M=>Array.isArray(M[7])))||t("#b-campo")?.remove();let me=i.numeros,Be=(d,M,E)=>`<div class="num"><div><span>${M}</span> ${d}</div><small>${E}</small></div>`;t("#numeros").innerHTML=[Be(e(me.area_interna_m2),"m²",`área interna, ${me.ambientes} ambiente${me.ambientes===1?"":"s"}`),me.area_externa_m2?Be(e(me.area_externa_m2),"m²",`área externa (${me.ambientes_externos})`):"",Be(`${e(me.dimensoes_m[0],1)} × ${e(me.dimensoes_m[1],1)}`,"m","dimensões gerais"),Be(e(me.pe_direito_m),"m","pé-direito adotado"),Be(me.paredes_m.toLocaleString("pt-BR"),"m",`de paredes (≈ ${me.paredes_area_m2.toLocaleString("pt-BR")} m² de face)`),Be(me.portas,"un","portas"),me.janelas?Be(me.janelas,"un","janelas / esquadrias"):"",me.pilares?Be(me.pilares,"un","pilares"):"",...me.dispositivos.map(d=>Be(d.quantidade,"un",n(d.rotulo))),...r.map(d=>Be(e(d.comprimento_m,1),"m",`${n(Ie(d))} · ${n(i.disciplinas[d.disciplina]?.rotulo||d.disciplina)}${d.sugerido?" (sugerido)":d.estimado?" (estimado)":""}`))].join(""),t("#lista-ambientes").innerHTML=`<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...me.por_ambiente].sort((d,M)=>d.nome.localeCompare(M.nome,"pt-BR",{numeric:!0})).map(d=>`<tr><td><i style="background:${(i.tiposAmbiente[d.tipo]||i.tiposAmbiente.outros).cor}"></i>${n(d.nome)}</td><td>${e(d.area_m2)}</td><td>${e(d.perimetro_m,1)}</td></tr>`).join("")}</tbody></table>`;let ni=t("#legenda");ni.innerHTML=i.dispositivos.map((d,M)=>`<button class="leg ativo" data-i="${M}" title="Mostrar/ocultar"><i class="f-${n(d.forma)}" style="--cor:${n(d.cor)}"></i><span>${n(d.rotulo)}<small>${n(i.disciplinas[d.disciplina]?.rotulo||"")} · ${n(d.altura)}</small></span><b>${d.itens.length}</b></button>`).join("")+r.map((d,M)=>`<button class="leg ativo" data-infra="${M}" title="Mostrar/ocultar"><i class="f-infra f-${n(d.forma)}" style="--cor:${n(d.cor)}"></i><span>${n(Ie(d))}<small>${n(i.disciplinas[d.disciplina]?.rotulo||d.disciplina)} · h = ${e(d.z)} m · ${n(rn(d))}${d.layers?.length?` · ${n(d.layers.slice(0,2).join(", "))}`:""}</small></span><b>${e(d.comprimento_m,1)} m</b></button>`).join("")+`<div class="tipos">${[...new Set(i.ambientes.map(d=>d.tipo))].map(d=>`<span><i style="background:${i.tiposAmbiente[d].cor}"></i>${n(i.tiposAmbiente[d].rotulo)}</span>`).join("")}</div>`,ni.querySelectorAll(".leg").forEach(d=>d.addEventListener("click",()=>{let M=d.dataset.infra!=null?r[Number(d.dataset.infra)].objeto:i.dispositivos[Number(d.dataset.i)].malha;M&&(M.visible=!M.visible,d.classList.toggle("ativo",M.visible),f(!0))}));function Ve(d,M){let E=l.getBoundingClientRect(),Z=d-E.left,$=M-E.top,nt=E.width,gt=E.height,Tt=null;for(let Ht of i.dispositivos){let kt=Ht.malha;if(!(!kt||!kt.visible||!kt.parent.visible))for(let Jt of Ht.itens){if(Jt.fora)continue;et.set(Jt[0],Jt[2],-Jt[1]);let Ct=A.position.distanceTo(et);if(Se==="dentro"&&Jt[5]!==en&&Ct>4||(et.project(A),et.z>1||et.z<-1))continue;let re=(et.x+1)/2*nt,te=(1-et.y)/2*gt,pe=Math.max(10,Ht.tamMax*D(Ht.tamMax,Ct)/(Ct*B.uPx.value)/2),Re=Math.hypot(re-Z,te-$);Re<=pe&&(!Tt||Re<Tt.dd-2||Math.abs(Re-Tt.dd)<=2&&Ct<Tt.d)&&(Tt={t:Ht,it:Jt,d:Ct,dd:Re})}}return Tt}let Un=new z;function Vi(d,M){let E=l.getBoundingClientRect(),Z=d-E.left,$=M-E.top,nt=E.width,gt=E.height,Tt=(Jt,Ct,re)=>(Un.set(Jt,Ct,re).project(A),Un.z>1||Un.z<-1?null:[(Un.x+1)/2*nt,(1-Un.y)/2*gt]),Ht=(Jt,Ct)=>{let re=Ct[0]-Jt[0],te=Ct[1]-Jt[1],pe=re*re+te*te,Re=pe?Math.max(0,Math.min(1,((Z-Jt[0])*re+($-Jt[1])*te)/pe)):0;return Math.hypot(Z-Jt[0]-re*Re,$-Jt[1]-te*Re)},kt=null;for(let Jt of r){if(!Jt.objeto||!Jt.objeto.visible||!Jt.objeto.parent.visible||!Te.visible)continue;let Ct=Jt.segmentos||[],re=Jt.descidas||[],te=(pe,Re)=>{if(!pe||!Re)return;let Pe=Ht(pe,Re);Pe<=8&&(!kt||Pe<kt.d)&&(kt={g:Jt,d:Pe})};for(let pe=0;pe+3<Ct.length;pe+=4)te(Tt(Ct[pe],Jt.z,-Ct[pe+1]),Tt(Ct[pe+2],Jt.z,-Ct[pe+3]));for(let pe=0;pe+3<re.length;pe+=4)te(Tt(re[pe],re[pe+2],-re[pe+1]),Tt(re[pe],re[pe+3],-re[pe+1]))}return kt&&kt.g}let Vn=t("#dica");function Ql(d,M){let E=Ve(d,M),Z=l.getBoundingClientRect(),$=E?null:Vi(d,M);if(!E&&!$)return Vn.style.display="none",l.style.cursor="",!1;if($)Vn.innerHTML=`<b>${n(Ie($))}</b><br>${n(i.disciplinas[$.disciplina]?.rotulo||$.disciplina)} · h = ${e($.z)} m · ${e($.comprimento_m,1)} m${$.descidas_m?` (${e($.descidas_m,1)} m de descidas)`:""}<br><small>${n(rn($))}${$.layers?.length?` · layer ${n($.layers.slice(0,2).join(", "))}`:""}</small>`;else{let{t:nt,it:gt}=E,Tt=i.ambientes[gt[5]],Ht=gt[8]?`<br>circuito ${n(gt[8])}${gt[9]?` · comando ${n(gt[9])}`:""}`:"",kt=mt?Lt.get(gt):null,Jt=kt&&kt.kind!=="quadro"?mt.estadoPonto(kt.id):null,Ct=kt&&mt.ponto(kt.id)?.comando,re=kt?kt.kind==="quadro"?"clique para abrir o quadro":kt.kind==="comando"?"clique para acionar":kt.kind==="luz"&&Ct?"clique para acionar o comando":"clique para ver o circuito":"",te=kt?`<br>${Jt?`<b class="${Jt.energizado?"sim-on":"sim-off"}">${n(Jt.texto)}</b><br>`:""}<small>${re}</small>`:"";Vn.innerHTML=`<b>${n(nt.rotulo)}</b>${gt[6]?` · ${n(gt[6])}`:""}<br>${Tt?`${n(Tt.nome)} · `:""}${n(Ye(nt,gt))}${Ht}${te}<br><small>${n(i.disciplinas[nt.disciplina]?.rotulo||"")}</small>`}return Vn.style.display="block",Vn.style.left=`${Math.max(8,Math.min(d-Z.left+14,Z.width-290))}px`,Vn.style.top=`${M-Z.top+14}px`,l.style.cursor="pointer",!0}let Jh=Df({CENA:i,tela:l,camera:A,cena:h,pisos:J,escolherDispositivo:Ve,pedirDesenho:f,esc:n}),Pa=null;l.addEventListener("pointermove",d=>{d.pointerType!=="mouse"||d.buttons||(Pa||requestAnimationFrame(()=>{let M=Pa;Pa=null,M&&Ql(M.clientX,M.clientY)}),Pa=d)}),l.addEventListener("pointerleave",d=>{d.pointerType==="mouse"&&(Vn.style.display="none")});let jh=new Fi,Kh=new bt;function tc(d,M){if(We||mt&&eu(d,M))return!1;let E=l.getBoundingClientRect(),Z=d-E.left,$=M-E.top;if(Se==="geral"){for(let Ht of se)if(Ht.ret&&Z>=Ht.ret[0]&&Z<=Ht.ret[2]&&$>=Ht.ret[1]&&$<=Ht.ret[3])return Je(Ht.a.i)}Kh.set(Z/E.width*2-1,-($/E.height)*2+1),jh.setFromCamera(Kh,A);let nt=Se==="dentro"&&yt&&P("paredes").visible?[...J,yt]:J,gt=jh.intersectObjects(nt,!1)[0];if(!gt||gt.object===yt)return!1;let Tt=gt.object.userData.ambientes[gt.faceIndex];return Tt?Se==="dentro"?(xn(gt.point.x,gt.point.z,Tt),!0):Je(Tt.i):!1}let jn=new Map,Qh="mouse",Ns=null,ec=null,Us=null,tu=0;l.addEventListener("dblclick",d=>{Qh!=="touch"&&tc(d.clientX,d.clientY)}),l.addEventListener("pointerdown",d=>{if(Qh=d.pointerType,jn.set(d.pointerId,{x:d.clientX,y:d.clientY}),ec=jn.size===1?{x:d.clientX,y:d.clientY,t:d.timeStamp}:null,Se==="dentro"&&(l.setPointerCapture?.(d.pointerId),jn.size===2)){let[M,E]=[...jn.values()];Ns={d:Math.hypot(M.x-E.x,M.y-E.y),fov:A.fov}}}),l.addEventListener("pointermove",d=>{let M=jn.get(d.pointerId);if(!M)return;let E=d.clientX-M.x,Z=d.clientY-M.y;if(M.x=d.clientX,M.y=d.clientY,!(Se!=="dentro"||We)){if(jn.size===1){let $=ln.degToRad(A.fov)/Math.max(l.clientHeight,1);W+=E*$,vt=ln.clamp(vt+Z*$,-1.45,1.45),tt()}else if(jn.size===2&&Ns){let[$,nt]=[...jn.values()];zi(ln.clamp(Ns.fov*Ns.d/Math.max(Math.hypot($.x-nt.x,$.y-nt.y),1),15,90))}}}),l.addEventListener("pointerup",d=>{let M=ec;if(jn.delete(d.pointerId),jn.size<2&&(Ns=null),!M||jn.size||!(d.timeStamp-M.t<350&&Math.hypot(d.clientX-M.x,d.clientY-M.y)<10))return;if(Jh.ativo()){Jh.clique(d.clientX,d.clientY);return}if(d.pointerType!=="touch"){mt&&nc(d.clientX,d.clientY);return}let Z=d.timeStamp;if(Us&&Z-Us.t<450&&Math.hypot(d.clientX-Us.x,d.clientY-Us.y)<30){Us=null,tc(d.clientX,d.clientY);return}Us={x:d.clientX,y:d.clientY,t:Z},!(mt&&nc(d.clientX,d.clientY))&&Ql(d.clientX,d.clientY)&&(clearTimeout(tu),tu=setTimeout(()=>{Vn.style.display="none"},3e3))}),l.addEventListener("pointercancel",d=>{jn.delete(d.pointerId),Ns=null,ec=null}),l.addEventListener("wheel",d=>{Se==="dentro"&&(d.preventDefault(),zi(ln.clamp(A.fov*Math.exp(d.deltaY*.0012),15,90)))},{passive:!1});let Kn=new Set;window.addEventListener("keydown",d=>{if(!(d.target&&/INPUT|SELECT|TEXTAREA/.test(d.target.tagName))){if(Bs){d.key==="Escape"&&sc();return}if(d.key==="Escape"&&Gi?.classList.contains("aberta")){ic();return}if(d.key==="Escape"&&Se==="dentro"){ke();return}Se==="dentro"&&/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(d.key)&&(Kn.add(d.key.toLowerCase()),d.preventDefault())}}),window.addEventListener("keyup",d=>Kn.delete(d.key.toLowerCase())),window.addEventListener("blur",()=>Kn.clear());function Nf(d){if(Se!=="dentro"||We||!Kn.size)return;let M=(Kn.has("arrowup")||Kn.has("w")?1:0)-(Kn.has("arrowdown")||Kn.has("s")?1:0),E=(Kn.has("d")?1:0)-(Kn.has("a")?1:0),Z=(Kn.has("arrowleft")?1:0)-(Kn.has("arrowright")?1:0);if(Z&&(W+=Z*1.6*d,tt()),!M&&!E)return;let $=1.8*d;A.position.x+=(-Math.sin(W)*M+Math.cos(W)*E)*$,A.position.z+=(-Math.cos(W)*M-Math.sin(W)*E)*$,f(!0);let nt=Gt(A.position.x,-A.position.z);nt&&nt.i!==en&&(en=nt.i,ve(nt),Ce(nt))}let Fs=mt?Jl():null;function eu(d,M){let E=Ve(d,M);return E&&Lt.get(E.it)||null}function nc(d,M){let E=eu(d,M);if(!E)return!1;if(Vn.style.display="none",E.kind==="quadro")return Ia(E.quadro),!0;let Z=null;return(E.kind==="comando"||E.kind==="luz"&&mt.ponto(E.id)?.comando)&&(Z=mt.acionar(E.id)),Z&&Fs(Z),Uf(E),!0}let Gi=null,Nr=null,Os=null;function Uf(d){if(!Gi){Gi=document.createElement("div"),Gi.id="ficha";let M=document.createElement("button");M.className="fechar",M.title="Fechar",M.textContent="×",M.addEventListener("click",ic),Nr=document.createElement("div"),Gi.append(M,Nr),document.body.appendChild(Gi),Ir(Nr,mt,{abrirQuadro:Ia,aviso:Fs})}Os=d,Gi.classList.add("aberta"),nu()}function ic(){Os=null,Gi?.classList.remove("aberta")}function nu(){if(!Os||!Nr)return;let d=i.ambientes[Os.it[5]];Nr.innerHTML=yf(mt,Os.id,{rotulo:Os.t.rotulo,ambiente:d?d.nome:""})}if(mt){let d=t("#b-tela"),M=t("#barra"),E=(Z,$,nt)=>{let gt=document.createElement("button");return gt.textContent=Z,gt.title=$,gt.addEventListener("click",nt),M.insertBefore(gt,d||null),gt};for(let Z of mt.quadros().slice(0,4))E(`Quadro ${Z.tag}`,`Abrir o quadro ${Z.tag}: porta, disjuntores com alavanca (desligar um disjuntor apaga o circuito no prédio)`,()=>Ia(Z.tag));if(E("Religar tudo","Simulação: volta tudo ao estado inicial (disjuntores ligados, luzes acesas)",()=>{mt.reiniciar(),Fs("Simulação reiniciada: tudo ligado")}),ce=If({CENA:i,INST:ft,sim:mt,interativos:St,pai:P("mapa-lux"),altura:lt+.004,esc:n,celular:pt<=8,pedirDesenho:f,ambienteAtual:()=>Se==="dentro"?en:-1}),ce){let Z=E("Mapa de iluminância","Cores no piso com a iluminância calculada ponto a ponto (lux), com o estado atual das luzes: cenas, dimerização e disjuntores",()=>{let $=ce.alternar();Z.classList.toggle("ativo",$),Fs($?"Mapa de iluminância: só luz direta (sem interreflexão)":"Mapa de iluminância desligado")})}mt.assinar(It)}function iu(){if(!mt||!qt)return;let d=document.getElementById("dentro-cenas");if(d||(d=document.createElement("div"),d.id="dentro-cenas",qt.insertBefore(d,document.getElementById("b-voltar")),Ir(d,mt,{aviso:E=>Fs?.(E)})),Se!=="dentro"||en<0){d.innerHTML="";return}let M=[...new Set(St.filter(E=>E.kind==="luz"&&E.it[5]===en).map(E=>mt.ponto(E.id)?.comando).filter(Boolean))];d.innerHTML=M.map(E=>ql(mt,E,{titulo:M.length>1})).filter(Boolean).join("<i></i>")}let Bs=!1,En=null;function Ia(d){let M=mt&&mt.quadro(d);if(M){if(!En){let E=document.createElement("div");E.id="q-sim",E.innerHTML=`<canvas id="tela"></canvas><div id="etiquetas"></div>
<nav id="barra"><button id="b-voltar-predio" title="Voltar ao prédio (Esc)">← Voltar ao prédio</button><span class="q-nome"></span>
<button id="b-3d">Vista 3D</button><button id="b-frente">Vista frontal</button><button id="b-porta" title="Abrir ou fechar a porta">Porta aberta</button><button id="b-etiquetas">Etiquetas</button></nav>
<aside><section><h2>Disjuntores — clique para ligar/desligar</h2><div id="simulacao"></div></section><section><h2>Dispositivo</h2><div id="info"></div></section></aside>`,document.body.appendChild(E),E.querySelectorAll("aside h2").forEach(Z=>{Z.onclick=()=>Z.parentNode.classList.toggle("fechada")}),En={el:E,ctrl:null,tag:null}}if(Bs=!0,En.el.classList.add("aberto"),ic(),Vn.style.display="none",En.tag!==d){if(En.ctrl){En.ctrl.destruir();let Z=document.createElement("canvas");Z.id="tela",En.el.querySelector("#tela").replaceWith(Z),En.el.querySelector("#etiquetas").innerHTML=""}let E=M.cena3d?{...M.cena3d}:bf(M,mt);delete E.instalacao,En.el.querySelector(".q-nome").textContent=`${M.tag}${M.descricao?` — ${M.descricao}`:""}${M.cena3d?"":" (arranjo esquemático)"}`,En.ctrl=Yh(E,{raiz:En.el,sim:mt,quadroTag:d,embutido:!0,portaFechada:!0,aoVoltar:sc,aviso:Fs}),En.tag=d}else En.ctrl.ativar(!0),En.ctrl.abrirAnimado()}}function sc(){Bs&&(Bs=!1,En.el.classList.remove("aberto"),En.ctrl?.ativar(!1),f(!0))}function Ff(){let d=0,M=We?Mt:N.target;if(Me.corte&&Se!=="dentro"&&Me.paredes!==2){let $=A.position.x-M.x,nt=A.position.z-M.z,gt=Math.hypot($,nt),Tt=Math.abs(A.position.y-M.y);gt>.35*Tt&&gt>.5&&(d=1,Dt.uDir.value.set($/gt,nt/gt),Dt.uAlvo.value.copy(M))}Dt.uCorte.value=d;let E=Se!=="dentro"&&A.position.y>s+.3;for(let $ of Rt)$.opacity=E?.45:1,$.depthWrite=!E;for(let $ of K)$.visible=d===1&&Me.paredes===0;let Z=Dt.uDir.value;for(let $ of at){let nt=d===1&&($.cx-M.x)*Z.x+($.cz-M.z)*Z.y>Dt.uMargem.value;$.m.scale.z=nt?o/s:1}}function Of(){let d=Se==="dentro"||We?.05:ln.clamp(A.position.distanceTo(N.target)*.01,.05,1);Math.abs(A.near-d)>A.near*.25&&(A.near=d,A.updateProjectionMatrix())}function La(){let d=Lr();Ot=d,c.setSize(d.w,d.h,!1),A.aspect=d.w/Math.max(d.h,1),A.setViewOffset(d.w,d.h,d.lateral/2,-(d.topo-44)/2,d.w,d.h),A.updateProjectionMatrix(),f(!0)}window.addEventListener("resize",La),window.addEventListener("load",La),La(),Le(),Nn(),Ds(),It();let su=performance.now(),zs=new Float64Array(33).fill(NaN);function Bf(){let d=A.matrixWorld.elements,M=A.projectionMatrix.elements,E=l.clientWidth*1e5+l.clientHeight,Z=zs[32]!==E;zs[32]=E;for(let $=0;$<16;$++)zs[$]!==d[$]&&(Z=!0,zs[$]=d[$]),zs[16+$]!==M[$]&&(Z=!0,zs[16+$]=M[$]);return Z}function ru(d=performance.now()){let M=Math.min(.1,Math.max(0,(d-su)/1e3));su=d,!Bs&&(Qt(d),Nf(M),Se==="geral"&&!We&&N.update()&&(p=!0),p&&(p=!1,Of(),B.uPx.value=2*Math.tan(ln.degToRad(A.fov/2))/Math.max(l.clientHeight,1),Ff(),c.render(h,A),(Bf()||u)&&(u=!1,Fe(),us())))}window.HM3D={vista3d:Ds,vistaDeCima:Dr,entrarAmbiente:Je,voltarVistaGeral:ke,grupos:k,estado:Me,renderer:c,camera:A,controles:N,cena:h,olhar:(d,M=0)=>{Se==="dentro"&&(W=ln.degToRad(d),vt=ln.degToRad(M),tt())},girarCabeca:(d,M)=>{Se==="dentro"&&(W+=ln.degToRad(d),M!=null&&(vt=ln.degToRad(M)),tt())},lente:d=>zi(ln.clamp(d,15,90)),olharPara:(d,M,E)=>{Se==="dentro"&&Ft(T(d,M,E))},irPara:(d,M)=>{if(Se==="dentro"){A.position.set(d,a,-M),f(!0);let E=Gt(d,M);E&&E.i!==en&&(en=E.i,ve(E),Ce(E))}},escolherDispositivo:Ve,mostrarDica:Ql,aoDuploClique:tc,get modo(){return Se},get ambienteAtual(){return en},render:()=>{f(!0),ru(performance.now())},get sujo(){return p},sim:mt,abrirQuadro:Ia,fecharQuadro:sc,clicarInterativo:nc,get quadroAberto(){return Bs},get quadro3d(){return En?.ctrl||null},corDoPonto:d=>{let M=St.find(Z=>Z.id===d);if(!M?.t.malha.instanceColor)return null;let E=new fe;return M.t.malha.getColorAt(M.i,E),[E.r,E.g,E.b].map(Z=>Math.round(Z*100)/100)},get luzesAcesas(){return Nt.filter(d=>d.intensity>0).length},get mapa(){return ce}};function au(d){requestAnimationFrame(au),ru(d)}requestAnimationFrame(au),document.body.classList.add("pronto")}})();
