/* Visualizador 3D H&M — fonte:a1c0284d022f8ffa — inclui three.js r186 (0.186.1) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */
(()=>{var pf=Object.create;var Zh=Object.defineProperty;var mf=Object.getOwnPropertyDescriptor;var gf=Object.getOwnPropertyNames;var _f=Object.getPrototypeOf,xf=Object.prototype.hasOwnProperty;var vf=(i,t)=>()=>{try{return t||i((t={exports:{}}).exports,t),t.exports}catch(e){throw t=0,e}};var yf=(i,t,e,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of gf(t))!xf.call(i,s)&&s!==e&&Zh(i,s,{get:()=>t[s],enumerable:!(n=mf(t,s))||n.enumerable});return i};var Mf=(i,t,e)=>(e=i!=null?pf(_f(i)):{},yf(t||!i||!i.__esModule?Zh(e,"default",{value:i,enumerable:!0}):e,i));var nf=vf((dS,ef)=>{var Zx=new Set(["luminaria","ponto_luz"]),Nh="motor";function Jx(i,t={}){let e=i||{quadros:[],circuitos:[],pontos:[],comandos:[]},n=t.inicio==="desligado"?"desligado":"ligado",s=e.quadros||[],r=e.circuitos||[],a=e.pontos||[],o=e.comandos||[],l=B=>String(B??""),c=new Map(s.map(B=>[l(B.tag),B])),h=new Map(r.map(B=>[l(B.id),B])),p=new Map(a.map(B=>[l(B.id),B])),u=new Map(o.map(B=>[l(B.id),B])),f=new Map(r.filter(B=>B.tipo===Nh).map(B=>[l(B.id),B])),_=(B,C)=>`${l(B)}|${l(C)}`,y;function g(){let B={protecao:{},comandos:{},paineis:{},emergenciaQuadro:{}};for(let U of s){U.geral?.tag&&(B.protecao[_(U.tag,U.geral.tag)]=!0);for(let Y of U.disjuntores||[])B.protecao[_(U.tag,Y.tag)]=!0;for(let Y of U.drs||[])Y.ddr||(B.protecao[_(U.tag,Y.tag)]=!0);B.emergenciaQuadro[l(U.tag)]=!1}let C=n==="ligado";for(let U of o){let Y=(U.dispositivos||[]).map(l),pt={pos:{},rele:!1,k:!1,emergencia:!1,presenca:!1,habilitado:!0,nivel:0,ultimo:1,cena:-1};Y.forEach(ot=>{pt.pos[ot]=!1}),Y.length||(pt.pos._=!1),C&&(pt.pos[Object.keys(pt.pos)[0]]=!0,pt.rele=!0,pt.k=!0,pt.presenca=!0,pt.nivel=1,pt.cena=0),B.comandos[l(U.id)]=pt}for(let U of f.keys())B.paineis[U]={k:!1,emergencia:!1,termico:!1};return B}y=g();let m=0,R=new Set;function I(B){$(),m++;for(let C of[...R])try{C(B)}catch{}}function b(B,C){if(C!=null&&C!=="")return c.get(l(C))||null;let U=l(B);return s.find(Y=>Y.geral?.tag===U||(Y.disjuntores||[]).some(pt=>pt.tag===U)||(Y.drs||[]).some(pt=>pt.tag===U))||null}function T(B,C){let U=b(B,C);if(!U)return null;let Y=l(B);if(U.geral?.tag===Y)return{tipo:"geral",quadro:U,item:U.geral};let pt=(U.disjuntores||[]).find(Dt=>Dt.tag===Y);if(pt)return{tipo:(U.drs||[]).some(Dt=>Dt.ddr&&Dt.tag===Y)?"ddr":"disjuntor",quadro:U,item:pt};let ot=(U.drs||[]).find(Dt=>Dt.tag===Y&&!Dt.ddr);return ot?{tipo:"dr",quadro:U,item:ot}:null}function A(B,C){let U=T(B,C);return U?y.protecao[_(U.quadro.tag,B)]!==!1:!1}function L(B,C=new Set){let U=h.get(l(B));if(!U)return`circuito ${B} não existe no modelo`;let Y=c.get(l(U.quadro));if(!Y)return`quadro ${U.quadro} não existe no modelo`;if(Y.alimentado_por!=null&&Y.alimentado_por!==""&&!C.has(l(Y.tag))){C.add(l(Y.tag));let pt=L(Y.alimentado_por,C);if(pt)return`${Y.tag} sem alimentação (${pt})`}if(Y.geral?.tag&&y.protecao[_(Y.tag,Y.geral.tag)]===!1)return`disjuntor geral ${Y.geral.tag} do ${Y.tag} desligado`;for(let pt of Y.drs||[])if(!pt.ddr&&(pt.circuitos||[]).map(l).includes(l(U.id))&&y.protecao[_(Y.tag,pt.tag)]===!1)return`${pt.tag} (DR) do ${Y.tag} desligado`;return U.disjuntor&&y.protecao[_(Y.tag,U.disjuntor)]===!1?`disjuntor ${U.disjuntor} desligado`:null}let v=B=>L(B)===null,w=B=>l((B.circuitos||[])[0]??p.get(l((B.pontos||[])[0]))?.circuito??"");function F(B){let C=w(B);return C?v(C):!0}function z(B){let C=y.comandos[l(B.id)];if(!C)return 0;switch(B.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":return Object.values(C.pos).reduce((U,Y)=>U!==!!Y,!1)?1:0;case"pulsador_rele_impulso":return C.rele?1:0;case"contator_botoeira":return C.k&&!C.emergencia?1:0;case"sensor_presenca":return C.presenca&&C.habilitado?1:0;case"dimmer":case"dimmer_010":case"dali":case"cena":return Math.max(0,Math.min(1,Number(C.nivel)||0));default:return Object.values(C.pos).reduce((U,Y)=>U!==!!Y,!1)?1:0}}function $(){for(let B of o){if(B.tipo!=="contator_botoeira")continue;let C=y.comandos[l(B.id)];C&&C.k&&(!F(B)||C.emergencia)&&(C.k=!1)}for(let[B,C]of f){let U=y.paineis[B],Y=U.emergencia||!!y.emergenciaQuadro[l(C.quadro)];U.k&&(!v(B)||Y||U.termico)&&(U.k=!1)}}function q(B){let C=f.get(l(B));if(!C)return null;let U=y.paineis[l(B)],Y=v(B),pt=U.emergencia||!!y.emergenciaQuadro[l(C.quadro)],ot=Y&&U.k&&!pt&&!U.termico;return{id:l(B),descricao:C.descricao||"",quadro:C.quadro,disjuntor:C.disjuntor,alimentado:Y,motivo:L(B),contator:U.k,emergencia:pt,emergenciaLocal:U.emergencia,termico:U.termico,girando:ot,sinaleiros:{verde:ot,amarelo:Y&&U.termico,vermelho:Y&&(pt||U.termico),branco:Y}}}function D(B){let C=p.get(l(B));if(!C)return null;let U=h.get(l(C.circuito)),Y=U?L(U.id):"ponto sem circuito no modelo",pt=Y===null,ot=C.comando?u.get(l(C.comando)):null,Dt=pt?1:0,Qt;if(Zx.has(C.tipo))ot&&(Dt=pt?z(ot):0),Qt=pt?Dt>0?Dt<1?`acesa em ${Math.round(Dt*100)} %`:"acesa":`apagada pelo comando ${ot?ot.id:""}`.trim():`apagada — sem energia (${Y})`;else if(C.tipo===Nh){let ft=q(C.circuito);ft?Dt=ft.girando?1:0:ot&&(Dt=pt?z(ot):0),Qt=pt?Dt?"em operação":ft?.termico?"parado — relé térmico desarmado":ft?.emergencia?"parado — emergência acionada":"parado":`parado — sem energia (${Y})`}else C.tipo==="tomada"||C.tipo==="tue"?Qt=pt?"com energia":`SEM ENERGIA (${Y})`:Qt=pt?"com energia":`sem energia (${Y})`;return{id:l(C.id),tipo:C.tipo,circuito:U?l(U.id):null,comando:ot?l(ot.id):null,alimentado:pt,motivo:Y,nivel:Dt,energizado:Dt>0,texto:Qt}}let Z=B=>!!D(B)?.energizado;function st(B){let C=u.get(l(B));if(!C)return null;let U=y.comandos[l(B)];return{id:l(B),tipo:C.tipo,saida:z(C),bobina:F(C),...JSON.parse(JSON.stringify(U))}}function nt(B,C,U){let Y=T(B,U);if(!Y)return!1;let pt=_(Y.quadro.tag,B),ot=!!C;return y.protecao[pt]!==!1===ot||(y.protecao[pt]=ot,I({tipo:"protecao",quadro:Y.quadro.tag,tag:l(B),ligado:ot})),!0}let vt=(B,C)=>nt(B,!A(B,C),C);function et(B,C){let U=p.get(l(B));if(!U)return null;if(U.tipo===Nh&&f.has(l(U.circuito)))return dt(U.circuito,C||(q(U.circuito).contator?"desliga":"liga"));let Y=U.comando?u.get(l(U.comando)):null;if(!Y)return null;let pt=y.comandos[l(Y.id)];if(!(Y.dispositivos||[]).map(l).includes(l(U.id))){let Dt=(Y.dispositivos||[])[0];return Dt!=null&&p.has(l(Dt))?et(Dt,C):ut(Y,pt,null,C)}return ut(Y,pt,U,C)}function ut(B,C,U,Y){let pt=U?.tipo||"",ot=Qt=>(I({tipo:"comando",comando:l(B.id),ponto:U?l(U.id):null}),Qt),Dt=()=>{C.nivel>0?(C.ultimo=C.nivel,C.nivel=0):C.nivel=C.ultimo||1};if(pt==="sensor"&&B.tipo==="sensor_presenca")return C.presenca=!C.presenca,ot(C.presenca?"presença detectada":"ambiente vazio (sensor)");switch(B.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":{let Qt=U?l(U.id):Object.keys(C.pos)[0];return Qt==null?null:(C.pos[Qt]=!C.pos[Qt],ot(`${Qt}: tecla na posição ${C.pos[Qt]?"I":"O"}`))}case"pulsador_rele_impulso":return F(B)?(C.rele=!C.rele,ot(`relé de impulso ${B.rele?.tag||""} ${C.rele?"fechou":"abriu"}`.replace("  "," "))):ot(`pulso sem efeito: bobina do relé ${B.rele?.tag||""} sem tensão`.replace("  "," "));case"contator_botoeira":{let Qt=Y||(C.emergencia?"liberar":C.k?"desliga":"liga");return Qt==="emergencia"?(C.emergencia=!0,C.k=!1,ot("emergência acionada: contator caiu")):Qt==="liberar"?(C.emergencia=!1,ot("emergência liberada (aperte LIGA)")):Qt==="desliga"?(C.k=!1,ot(`contator ${B.rele?.tag||""} desligado`.replace("  "," "))):C.emergencia?ot("LIGA sem efeito: emergência acionada"):F(B)?(C.k=!0,ot(`contator ${B.rele?.tag||""} ligado e selado`.replace("  "," "))):ot("LIGA sem efeito: bobina do contator sem tensão")}case"sensor_presenca":return C.habilitado=!C.habilitado,ot(C.habilitado?"sensor habilitado":"desligamento manual (sensor inibido)");case"dimmer":case"dimmer_010":case"dali":return typeof Y=="number"&&Number.isFinite(Y)?(C.nivel=Math.max(0,Math.min(1,Y)),C.nivel>0&&(C.ultimo=C.nivel)):Dt(),ot(C.nivel>0?`nível ${Math.round(C.nivel*100)} %`:"desligado");case"cena":{let Qt=Array.isArray(B.cenas)&&B.cenas.length?B.cenas.map(Number):[1,.6,.3,0];return typeof Y=="number"&&Number.isFinite(Y)?C.cena=Math.max(0,Math.min(Qt.length-1,Math.round(Y))):C.cena=(C.cena+1)%Qt.length,C.nivel=Qt[C.cena],ot(`cena ${C.cena+1}: ${C.nivel>0?`${Math.round(C.nivel*100)} %`:"desligado"}`)}default:{let Qt=U?l(U.id):Object.keys(C.pos)[0];return Qt==null?null:(C.pos[Qt]=!C.pos[Qt],ot(`${Qt} acionado`))}}}function dt(B,C){if(!f.get(l(B)))return null;let Y=y.paineis[l(B)],pt=ot=>(I({tipo:"motor",motor:l(B),acao:C}),ot);switch(C){case"liga":{let ot=q(B);return ot.alimentado?ot.emergencia?pt("LIGA sem efeito: emergência acionada"):Y.termico?pt("LIGA sem efeito: relé térmico desarmado (rearme)"):(Y.k=!0,pt(`${B}: contator ligado e selado — motor em operação`)):pt(`LIGA sem efeito: ${ot.motivo}`)}case"desliga":return Y.k=!1,pt(`${B}: motor desligado`);case"emergencia":return Y.emergencia=!0,Y.k=!1,pt(`${B}: EMERGÊNCIA — motor parado`);case"liberar":return Y.emergencia=!1,pt(`${B}: emergência liberada (aperte LIGA)`);case"desarmar_termico":return Y.termico=!0,Y.k=!1,pt(`${B}: relé térmico desarmado (sobrecarga simulada)`);case"rearmar":return Y.termico=!1,pt(`${B}: relé térmico rearmado (aperte LIGA)`);default:return null}}function zt(B,C=!0){return c.has(l(B))?(y.emergenciaQuadro[l(B)]=!!C,I({tipo:"emergencia",quadro:l(B),ativa:!!C}),!0):!1}function Ut(){y=g(),I({tipo:"reiniciar"})}let we=()=>JSON.parse(JSON.stringify(y));function de(B){if(!B||typeof B!="object")return!1;let C=g();for(let U of Object.keys(C.protecao))typeof B.protecao?.[U]=="boolean"&&(C.protecao[U]=B.protecao[U]);for(let U of Object.keys(C.emergenciaQuadro))typeof B.emergenciaQuadro?.[U]=="boolean"&&(C.emergenciaQuadro[U]=B.emergenciaQuadro[U]);for(let U of Object.keys(C.comandos)){let Y=B.comandos?.[U];if(!Y||typeof Y!="object")continue;let pt=C.comandos[U];for(let ot of Object.keys(pt.pos))typeof Y.pos?.[ot]=="boolean"&&(pt.pos[ot]=Y.pos[ot]);for(let ot of["rele","k","emergencia","presenca","habilitado"])typeof Y[ot]=="boolean"&&(pt[ot]=Y[ot]);for(let ot of["nivel","ultimo","cena"])Number.isFinite(Y[ot])&&(pt[ot]=Y[ot])}for(let U of Object.keys(C.paineis)){let Y=B.paineis?.[U];if(Y&&typeof Y=="object")for(let pt of["k","emergencia","termico"])typeof Y[pt]=="boolean"&&(C.paineis[U][pt]=Y[pt])}return y=C,I({tipo:"importar"}),!0}return{instalacao:e,get versao(){return m},assinar(B){return R.add(B),()=>R.delete(B)},quadros:()=>s,quadro:B=>c.get(l(B))||null,circuito:B=>h.get(l(B))||null,ponto:B=>p.get(l(B))||null,comando:B=>u.get(l(B))||null,temPonto:B=>p.has(l(B)),paineis:()=>[...f.keys()].map(q),dispositivo:T,ligado:A,alimentado:v,motivo:L,energizado:Z,estadoPonto:D,estadoComando:st,painel:q,emergenciaDoQuadro:B=>!!y.emergenciaQuadro[l(B)],definir:nt,alternar:vt,desligar:(B,C)=>nt(B,!1,C),ligar:(B,C)=>nt(B,!0,C),acionar:et,motor:dt,emergenciaQuadro:zt,reiniciar:Ut,exportar:we,importar:de}}var jx={luminaria:"Luminária",ponto_luz:"Ponto de luz",tomada:"Tomada",tue:"Tomada de uso específico",motor:"Motor",interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptor paralelo",interruptor_intermediario:"Interruptor intermediário",interruptor:"Interruptor",pulsador:"Pulsador",botoeira:"Botoeira liga/desliga",sensor:"Sensor de presença",dimmer:"Dimmer",controlador_010:"Controlador 0-10 V",botoeira_dali:"Botoeira DALI",teclado_cena:"Teclado de cenas"};ef.exports={criarSimulador:Jx,ROTULO_PONTO:jx}});var ts={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},es={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Lu=0,Oc=1,Du=2;var ha=1,Nu=2,pr=3,ns=0,Ln=1,yn=2,vi=0,mr=1,Bc=2,zc=3,kc=4,Uu=5;var Ss=100,Fu=101,Ou=102,Bu=103,zu=104,ku=200,Vu=201,Gu=202,Hu=203,Vc=204,Gc=205,Wu=206,Xu=207,qu=208,$u=209,Yu=210,Zu=211,Ju=212,ju=213,Ku=214,ro=0,ao=1,oo=2,er=3,lo=4,co=5,ho=6,uo=7,Hc=0,Qu=1,td=2,oi=0,Wc=1,Xc=2,qc=3,$c=4,Yc=5,Zc=6,Jc=7;var jc=300,is=301,bs=302,Xo=303,qo=304,ua=306,fo=1e3,pi=1001,po=1002,xn=1003,ed=1004;var da=1005;var An=1006,$o=1007;var ss=1008;var Un=1009,Kc=1010,Qc=1011,gr=1012,Yo=1013,li=1014,Kn=1015,ci=1016,Zo=1017,Jo=1018,_r=1020,th=35902,eh=35899,nh=1021,ih=1022,Qn=1023,gi=1026,rs=1027,jo=1028,Ko=1029,as=1030,Qo=1031;var tl=1033,fa=33776,pa=33777,ma=33778,ga=33779,el=35840,nl=35841,il=35842,sl=35843,rl=36196,al=37492,ol=37496,ll=37488,cl=37489,_a=37490,hl=37491,ul=37808,dl=37809,fl=37810,pl=37811,ml=37812,gl=37813,_l=37814,xl=37815,vl=37816,yl=37817,Ml=37818,Sl=37819,bl=37820,El=37821,Al=36492,Tl=36494,wl=36495,Cl=36283,Rl=36284,xa=36285,Pl=36286;var Or=2300,mo=2301,io=2302,Ec=2303,Ac=2400,Tc=2401,wc=2402;var nd=3200;var Il=0,id=1,Fi="",En="srgb",Br="srgb-linear",zr="linear",Ve="srgb";var so=7680;var sd=519,rd=512,ad=513,od=514,Ll=515,ld=516,cd=517,Dl=518,hd=519,ud=35044;var sh="300 es",si=2e3,nr=2001;function Sf(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function bf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function kr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function dd(){let i=kr("canvas");return i.style.display="block",i}var Jh={},ir=null;function rh(...i){let t="THREE."+i.shift();ir?ir("log",t,...i):console.log(t,...i)}function fd(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function ae(...i){i=fd(i);let t="THREE."+i.shift();if(ir)ir("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function le(...i){i=fd(i);let t="THREE."+i.shift();if(ir)ir("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function ps(...i){let t=i.join(" ");t in Jh||(Jh[t]=!0,ae(...i))}function pd(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var md={[ro]:ao,[oo]:ho,[lo]:uo,[er]:co,[ao]:ro,[ho]:oo,[uo]:lo,[co]:er},ri=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},wn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],jh=1234567,Qs=Math.PI/180,sr=180/Math.PI;function Es(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(wn[i&255]+wn[i>>8&255]+wn[i>>16&255]+wn[i>>24&255]+"-"+wn[t&255]+wn[t>>8&255]+"-"+wn[t>>16&15|64]+wn[t>>24&255]+"-"+wn[e&63|128]+wn[e>>8&255]+"-"+wn[e>>16&255]+wn[e>>24&255]+wn[n&255]+wn[n>>8&255]+wn[n>>16&255]+wn[n>>24&255]).toLowerCase()}function be(i,t,e){return Math.max(t,Math.min(e,i))}function ah(i,t){return(i%t+t)%t}function Ef(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Af(i,t,e){return i!==t?(e-i)/(t-i):0}function Nr(i,t,e){return(1-e)*i+e*t}function Tf(i,t,e,n){return Nr(i,t,1-Math.exp(-e*n))}function wf(i,t=1){return t-Math.abs(ah(i,t*2)-t)}function Cf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function Rf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Pf(i,t){return i+Math.floor(Math.random()*(t-i+1))}function If(i,t){return i+Math.random()*(t-i)}function Lf(i){return i*(.5-Math.random())}function Df(i){i!==void 0&&(jh=i);let t=jh+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Nf(i){return i*Qs}function Uf(i){return i*sr}function Ff(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Of(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Bf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function zf(i,t,e,n,s){let r=Math.cos,a=Math.sin,o=r(e/2),l=a(e/2),c=r((t+n)/2),h=a((t+n)/2),p=r((t-n)/2),u=a((t-n)/2),f=r((n-t)/2),_=a((n-t)/2);switch(s){case"XYX":i.set(o*h,l*p,l*u,o*c);break;case"YZY":i.set(l*u,o*h,l*p,o*c);break;case"ZXZ":i.set(l*p,l*u,o*h,o*c);break;case"XZX":i.set(o*h,l*_,l*f,o*c);break;case"YXY":i.set(l*f,o*h,l*_,o*c);break;case"ZYZ":i.set(l*_,l*f,o*h,o*c);break;default:ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ks(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Pn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var an={DEG2RAD:Qs,RAD2DEG:sr,generateUUID:Es,clamp:be,euclideanModulo:ah,mapLinear:Ef,inverseLerp:Af,lerp:Nr,damp:Tf,pingpong:wf,smoothstep:Cf,smootherstep:Rf,randInt:Pf,randFloat:If,randFloatSpread:Lf,seededRandom:Df,degToRad:Nf,radToDeg:Uf,isPowerOfTwo:Ff,ceilPowerOfTwo:Of,floorPowerOfTwo:Bf,setQuaternionFromProperEuler:zf,normalize:Pn,denormalize:Ks},dh=class dh{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=be(this.x,t.x,e.x),this.y=be(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=be(this.x,t,e),this.y=be(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(be(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(be(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};dh.prototype.isVector2=!0;var St=dh,Vn=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],p=n[s+3],u=r[a+0],f=r[a+1],_=r[a+2],y=r[a+3];if(p!==y||l!==u||c!==f||h!==_){let g=l*u+c*f+h*_+p*y;g<0&&(u=-u,f=-f,_=-_,y=-y,g=-g);let m=1-o;if(g<.9995){let R=Math.acos(g),I=Math.sin(R);m=Math.sin(m*R)/I,o=Math.sin(o*R)/I,l=l*m+u*o,c=c*m+f*o,h=h*m+_*o,p=p*m+y*o}else{l=l*m+u*o,c=c*m+f*o,h=h*m+_*o,p=p*m+y*o;let R=1/Math.sqrt(l*l+c*c+h*h+p*p);l*=R,c*=R,h*=R,p*=R}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=p}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],p=r[a],u=r[a+1],f=r[a+2],_=r[a+3];return t[e]=o*_+h*p+l*f-c*u,t[e+1]=l*_+h*u+c*p-o*f,t[e+2]=c*_+h*f+o*u-l*p,t[e+3]=h*_-o*p-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),p=o(r/2),u=l(n/2),f=l(s/2),_=l(r/2);switch(a){case"XYZ":this._x=u*h*p+c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p-u*f*_;break;case"YXZ":this._x=u*h*p+c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p+u*f*_;break;case"ZXY":this._x=u*h*p-c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p-u*f*_;break;case"ZYX":this._x=u*h*p-c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p+u*f*_;break;case"YZX":this._x=u*h*p+c*f*_,this._y=c*f*p+u*h*_,this._z=c*h*_-u*f*p,this._w=c*h*p-u*f*_;break;case"XZY":this._x=u*h*p-c*f*_,this._y=c*f*p-u*h*_,this._z=c*h*_+u*f*p,this._w=c*h*p+u*f*_;break;default:ae("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],p=e[10],u=n+o+p;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-s)*f}else if(n>o&&n>p){let f=2*Math.sqrt(1+n-o-p);this._w=(h-l)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+c)/f}else if(o>p){let f=2*Math.sqrt(1+o-n-p);this._w=(r-c)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+p-n-o);this._w=(a-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(be(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},fh=class fh{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Kh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Kh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),p=2*(r*n-a*e);return this.x=e+l*c+a*p-o*h,this.y=n+l*h+o*c-r*p,this.z=s+l*p+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=be(this.x,t.x,e.x),this.y=be(this.y,t.y,e.y),this.z=be(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=be(this.x,t,e),this.y=be(this.y,t,e),this.z=be(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(be(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Kl.copy(this).projectOnVector(t),this.sub(Kl)}reflect(t){return this.sub(Kl.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(be(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};fh.prototype.isVector3=!0;var O=fh,Kl=new O,Kh=new Vn,ph=class ph{constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],p=n[7],u=n[2],f=n[5],_=n[8],y=s[0],g=s[3],m=s[6],R=s[1],I=s[4],b=s[7],T=s[2],A=s[5],L=s[8];return r[0]=a*y+o*R+l*T,r[3]=a*g+o*I+l*A,r[6]=a*m+o*b+l*L,r[1]=c*y+h*R+p*T,r[4]=c*g+h*I+p*A,r[7]=c*m+h*b+p*L,r[2]=u*y+f*R+_*T,r[5]=u*g+f*I+_*A,r[8]=u*m+f*b+_*L,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=h*a-o*c,u=o*l-h*r,f=c*r-a*l,_=e*p+n*u+s*f;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/_;return t[0]=p*y,t[1]=(s*c-h*n)*y,t[2]=(o*n-s*a)*y,t[3]=u*y,t[4]=(h*e-s*l)*y,t[5]=(s*r-o*e)*y,t[6]=f*y,t[7]=(n*l-c*e)*y,t[8]=(a*e-n*r)*y,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return ps("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ql.makeScale(t,e)),this}rotate(t){return ps("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ql.makeRotation(-t)),this}translate(t,e){return ps("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ql.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};ph.prototype.isMatrix3=!0;var ge=ph,Ql=new ge,Qh=new ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),tu=new ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function kf(){let i={enabled:!0,workingColorSpace:Br,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===Ve&&(s.r=Ri(s.r),s.g=Ri(s.g),s.b=Ri(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Ve&&(s.r=tr(s.r),s.g=tr(s.g),s.b=tr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Fi?zr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return ps("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return ps("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Br]:{primaries:t,whitePoint:n,transfer:zr,toXYZ:Qh,fromXYZ:tu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:En},outputColorSpaceConfig:{drawingBufferColorSpace:En}},[En]:{primaries:t,whitePoint:n,transfer:Ve,toXYZ:Qh,fromXYZ:tu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:En}}}),i}var Le=kf();function Ri(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function tr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Bs,go=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Bs===void 0&&(Bs=kr("canvas")),Bs.width=t.width,Bs.height=t.height;let s=Bs.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Bs}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=kr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Ri(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ri(e[n]/255)*255):e[n]=Ri(e[n]);return{data:e,width:t.width,height:t.height}}else return ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Vf=0,rr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Vf++}),this.uuid=Es(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(tc(s[a].image)):r.push(tc(s[a]))}else r=tc(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function tc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?go.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(ae("Texture: Unable to serialize Texture."),{})}var Gf=0,ec=new O,Dn=class i extends ri{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=pi,s=pi,r=An,a=ss,o=Qn,l=Un,c=i.DEFAULT_ANISOTROPY,h=Fi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Gf++}),this.uuid=Es(),this.name="",this.source=new rr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new St(0,0),this.repeat=new St(1,1),this.center=new St(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(ec).x}get height(){return this.source.getSize(ec).y}get depth(){return this.source.getSize(ec).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){ae(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){ae(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==jc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case fo:t.x=t.x-Math.floor(t.x);break;case pi:t.x=t.x<0?0:1;break;case po:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case fo:t.y=t.y-Math.floor(t.y);break;case pi:t.y=t.y<0?0:1;break;case po:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Dn.DEFAULT_IMAGE=null;Dn.DEFAULT_MAPPING=jc;Dn.DEFAULT_ANISOTROPY=1;var mh=class mh{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],p=l[8],u=l[1],f=l[5],_=l[9],y=l[2],g=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(p-y)<.01&&Math.abs(_-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(p+y)<.1&&Math.abs(_+g)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let I=(c+1)/2,b=(f+1)/2,T=(m+1)/2,A=(h+u)/4,L=(p+y)/4,v=(_+g)/4;return I>b&&I>T?I<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(I),s=A/n,r=L/n):b>T?b<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),n=A/s,r=v/s):T<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),n=L/r,s=v/r),this.set(n,s,r,e),this}let R=Math.sqrt((g-_)*(g-_)+(p-y)*(p-y)+(u-h)*(u-h));return Math.abs(R)<.001&&(R=1),this.x=(g-_)/R,this.y=(p-y)/R,this.z=(u-h)/R,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=be(this.x,t.x,e.x),this.y=be(this.y,t.y,e.y),this.z=be(this.z,t.z,e.z),this.w=be(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=be(this.x,t,e),this.y=be(this.y,t,e),this.z=be(this.z,t,e),this.w=be(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(be(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};mh.prototype.isVector4=!0;var Ke=mh,_o=class extends ri{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:An,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Ke(0,0,t,e),this.scissorTest=!1,this.viewport=new Ke(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Dn(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:An,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new rr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Nn=class extends _o{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Vr=class extends Dn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=xn,this.minFilter=xn,this.wrapR=pi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var xo=class extends Dn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=xn,this.minFilter=xn,this.wrapR=pi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Wo=class Wo{constructor(t,e,n,s,r,a,o,l,c,h,p,u,f,_,y,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,p,u,f,_,y,g)}set(t,e,n,s,r,a,o,l,c,h,p,u,f,_,y,g){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=a,m[9]=o,m[13]=l,m[2]=c,m[6]=h,m[10]=p,m[14]=u,m[3]=f,m[7]=_,m[11]=y,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Wo().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/zs.setFromMatrixColumn(t,0).length(),r=1/zs.setFromMatrixColumn(t,1).length(),a=1/zs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),p=Math.sin(r);if(t.order==="XYZ"){let u=a*h,f=a*p,_=o*h,y=o*p;e[0]=l*h,e[4]=-l*p,e[8]=c,e[1]=f+_*c,e[5]=u-y*c,e[9]=-o*l,e[2]=y-u*c,e[6]=_+f*c,e[10]=a*l}else if(t.order==="YXZ"){let u=l*h,f=l*p,_=c*h,y=c*p;e[0]=u+y*o,e[4]=_*o-f,e[8]=a*c,e[1]=a*p,e[5]=a*h,e[9]=-o,e[2]=f*o-_,e[6]=y+u*o,e[10]=a*l}else if(t.order==="ZXY"){let u=l*h,f=l*p,_=c*h,y=c*p;e[0]=u-y*o,e[4]=-a*p,e[8]=_+f*o,e[1]=f+_*o,e[5]=a*h,e[9]=y-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let u=a*h,f=a*p,_=o*h,y=o*p;e[0]=l*h,e[4]=_*c-f,e[8]=u*c+y,e[1]=l*p,e[5]=y*c+u,e[9]=f*c-_,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let u=a*l,f=a*c,_=o*l,y=o*c;e[0]=l*h,e[4]=y-u*p,e[8]=_*p+f,e[1]=p,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*p+_,e[10]=u-y*p}else if(t.order==="XZY"){let u=a*l,f=a*c,_=o*l,y=o*c;e[0]=l*h,e[4]=-p,e[8]=c*h,e[1]=u*p+y,e[5]=a*h,e[9]=f*p-_,e[2]=_*p-f,e[6]=o*h,e[10]=y*p+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Hf,t,Wf)}lookAt(t,e,n){let s=this.elements;return On.subVectors(t,e),On.lengthSq()===0&&(On.z=1),On.normalize(),Gi.crossVectors(n,On),Gi.lengthSq()===0&&(Math.abs(n.z)===1?On.x+=1e-4:On.z+=1e-4,On.normalize(),Gi.crossVectors(n,On)),Gi.normalize(),Pa.crossVectors(On,Gi),s[0]=Gi.x,s[4]=Pa.x,s[8]=On.x,s[1]=Gi.y,s[5]=Pa.y,s[9]=On.y,s[2]=Gi.z,s[6]=Pa.z,s[10]=On.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],p=n[5],u=n[9],f=n[13],_=n[2],y=n[6],g=n[10],m=n[14],R=n[3],I=n[7],b=n[11],T=n[15],A=s[0],L=s[4],v=s[8],w=s[12],F=s[1],z=s[5],$=s[9],q=s[13],D=s[2],Z=s[6],st=s[10],nt=s[14],vt=s[3],et=s[7],ut=s[11],dt=s[15];return r[0]=a*A+o*F+l*D+c*vt,r[4]=a*L+o*z+l*Z+c*et,r[8]=a*v+o*$+l*st+c*ut,r[12]=a*w+o*q+l*nt+c*dt,r[1]=h*A+p*F+u*D+f*vt,r[5]=h*L+p*z+u*Z+f*et,r[9]=h*v+p*$+u*st+f*ut,r[13]=h*w+p*q+u*nt+f*dt,r[2]=_*A+y*F+g*D+m*vt,r[6]=_*L+y*z+g*Z+m*et,r[10]=_*v+y*$+g*st+m*ut,r[14]=_*w+y*q+g*nt+m*dt,r[3]=R*A+I*F+b*D+T*vt,r[7]=R*L+I*z+b*Z+T*et,r[11]=R*v+I*$+b*st+T*ut,r[15]=R*w+I*q+b*nt+T*dt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],p=t[6],u=t[10],f=t[14],_=t[3],y=t[7],g=t[11],m=t[15],R=l*f-c*u,I=o*f-c*p,b=o*u-l*p,T=a*f-c*h,A=a*u-l*h,L=a*p-o*h;return e*(y*R-g*I+m*b)-n*(_*R-g*T+m*A)+s*(_*I-y*T+m*L)-r*(_*b-y*A+g*L)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=t[9],u=t[10],f=t[11],_=t[12],y=t[13],g=t[14],m=t[15],R=e*o-n*a,I=e*l-s*a,b=e*c-r*a,T=n*l-s*o,A=n*c-r*o,L=s*c-r*l,v=h*y-p*_,w=h*g-u*_,F=h*m-f*_,z=p*g-u*y,$=p*m-f*y,q=u*m-f*g,D=R*q-I*$+b*z+T*F-A*w+L*v;if(D===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let Z=1/D;return t[0]=(o*q-l*$+c*z)*Z,t[1]=(s*$-n*q-r*z)*Z,t[2]=(y*L-g*A+m*T)*Z,t[3]=(u*A-p*L-f*T)*Z,t[4]=(l*F-a*q-c*w)*Z,t[5]=(e*q-s*F+r*w)*Z,t[6]=(g*b-_*L-m*I)*Z,t[7]=(h*L-u*b+f*I)*Z,t[8]=(a*$-o*F+c*v)*Z,t[9]=(n*F-e*$-r*v)*Z,t[10]=(_*A-y*b+m*R)*Z,t[11]=(p*b-h*A-f*R)*Z,t[12]=(o*w-a*z-l*v)*Z,t[13]=(e*z-n*w+s*v)*Z,t[14]=(y*I-_*T-g*R)*Z,t[15]=(h*T-p*I+u*R)*Z,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,p=o+o,u=r*c,f=r*h,_=r*p,y=a*h,g=a*p,m=o*p,R=l*c,I=l*h,b=l*p,T=n.x,A=n.y,L=n.z;return s[0]=(1-(y+m))*T,s[1]=(f+b)*T,s[2]=(_-I)*T,s[3]=0,s[4]=(f-b)*A,s[5]=(1-(u+m))*A,s[6]=(g+R)*A,s[7]=0,s[8]=(_+I)*L,s[9]=(g-R)*L,s[10]=(1-(u+y))*L,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=zs.set(s[0],s[1],s[2]).length(),o=zs.set(s[4],s[5],s[6]).length(),l=zs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),ei.copy(this);let c=1/a,h=1/o,p=1/l;return ei.elements[0]*=c,ei.elements[1]*=c,ei.elements[2]*=c,ei.elements[4]*=h,ei.elements[5]*=h,ei.elements[6]*=h,ei.elements[8]*=p,ei.elements[9]*=p,ei.elements[10]*=p,e.setFromRotationMatrix(ei),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=si,l=!1){let c=this.elements,h=2*r/(e-t),p=2*r/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s),_,y;if(l)_=r/(a-r),y=a*r/(a-r);else if(o===si)_=-(a+r)/(a-r),y=-2*a*r/(a-r);else if(o===nr)_=-a/(a-r),y=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=p,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=_,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=si,l=!1){let c=this.elements,h=2/(e-t),p=2/(n-s),u=-(e+t)/(e-t),f=-(n+s)/(n-s),_,y;if(l)_=1/(a-r),y=a/(a-r);else if(o===si)_=-2/(a-r),y=-(a+r)/(a-r);else if(o===nr)_=-1/(a-r),y=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=p,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=_,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Wo.prototype.isMatrix4=!0;var We=Wo,zs=new O,ei=new We,Hf=new O(0,0,0),Wf=new O(1,1,1),Gi=new O,Pa=new O,On=new O,eu=new We,nu=new Vn,Pi=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],p=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(be(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-be(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-p,r),this._z=0);break;case"ZXY":this._x=Math.asin(be(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-p,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-be(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(be(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-p,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-be(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return eu.makeRotationFromQuaternion(t),this.setFromRotationMatrix(eu,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return nu.setFromEuler(this),this.setFromQuaternion(nu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Pi.DEFAULT_ORDER="XYZ";var ar=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Xf=0,iu=new O,ks=new Vn,bi=new We,Ia=new O,Tr=new O,qf=new O,$f=new Vn,su=new O(1,0,0),ru=new O(0,1,0),au=new O(0,0,1),ou={type:"added"},Yf={type:"removed"},Vs={type:"childadded",child:null},nc={type:"childremoved",child:null},dn=class i extends ri{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Xf++}),this.uuid=Es(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new O,e=new Pi,n=new Vn,s=new O(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new We},normalMatrix:{value:new ge}}),this.matrix=new We,this.matrixWorld=new We,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ar,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ks.setFromAxisAngle(t,e),this.quaternion.multiply(ks),this}rotateOnWorldAxis(t,e){return ks.setFromAxisAngle(t,e),this.quaternion.premultiply(ks),this}rotateX(t){return this.rotateOnAxis(su,t)}rotateY(t){return this.rotateOnAxis(ru,t)}rotateZ(t){return this.rotateOnAxis(au,t)}translateOnAxis(t,e){return iu.copy(t).applyQuaternion(this.quaternion),this.position.add(iu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(su,t)}translateY(t){return this.translateOnAxis(ru,t)}translateZ(t){return this.translateOnAxis(au,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(bi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Ia.copy(t):Ia.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Tr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bi.lookAt(Tr,Ia,this.up):bi.lookAt(Ia,Tr,this.up),this.quaternion.setFromRotationMatrix(bi),s&&(bi.extractRotation(s.matrixWorld),ks.setFromRotationMatrix(bi),this.quaternion.premultiply(ks.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(le("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(ou),Vs.child=t,this.dispatchEvent(Vs),Vs.child=null):le("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Yf),nc.child=t,this.dispatchEvent(nc),nc.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),bi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),bi.multiply(t.parent.matrixWorld)),t.applyMatrix4(bi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(ou),Vs.child=t,this.dispatchEvent(Vs),Vs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Tr,t,qf),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Tr,$f,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let p=l[c];r(t.shapes,p)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),p=a(t.shapes),u=a(t.skeletons),f=a(t.animations),_=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),p.length>0&&(n.shapes=p),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),_.length>0&&(n.nodes=_)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};dn.DEFAULT_UP=new O(0,1,0);dn.DEFAULT_MATRIX_AUTO_UPDATE=!0;dn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var In=class extends dn{constructor(){super(),this.isGroup=!0,this.type="Group"}},Zf={type:"move"},or=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new In,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new In,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new In,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let y of t.hand.values()){let g=e.getJointPose(y,n),m=this._getHandJoint(c,y);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}let h=c.joints["index-finger-tip"],p=c.joints["thumb-tip"],u=h.position.distanceTo(p.position),f=.02,_=.005;c.inputState.pinching&&u>f+_?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-_&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Zf)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new In;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},gd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Hi={h:0,s:0,l:0},La={h:0,s:0,l:0};function ic(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var ue=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=En){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Le.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Le.workingColorSpace){return this.r=t,this.g=e,this.b=n,Le.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Le.workingColorSpace){if(t=ah(t,1),e=be(e,0,1),n=be(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=ic(a,r,t+1/3),this.g=ic(a,r,t),this.b=ic(a,r,t-1/3)}return Le.colorSpaceToWorking(this,s),this}setStyle(t,e=En){function n(r){r!==void 0&&parseFloat(r)<1&&ae("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:ae("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);ae("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=En){let n=gd[t.toLowerCase()];return n!==void 0?this.setHex(n,e):ae("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ri(t.r),this.g=Ri(t.g),this.b=Ri(t.b),this}copyLinearToSRGB(t){return this.r=tr(t.r),this.g=tr(t.g),this.b=tr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=En){return Le.workingToColorSpace(Cn.copy(this),t),Math.round(be(Cn.r*255,0,255))*65536+Math.round(be(Cn.g*255,0,255))*256+Math.round(be(Cn.b*255,0,255))}getHexString(t=En){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Le.workingColorSpace){Le.workingToColorSpace(Cn.copy(this),e);let n=Cn.r,s=Cn.g,r=Cn.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let p=a-o;switch(c=h<=.5?p/(a+o):p/(2-a-o),a){case n:l=(s-r)/p+(s<r?6:0);break;case s:l=(r-n)/p+2;break;case r:l=(n-s)/p+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Le.workingColorSpace){return Le.workingToColorSpace(Cn.copy(this),e),t.r=Cn.r,t.g=Cn.g,t.b=Cn.b,t}getStyle(t=En){Le.workingToColorSpace(Cn.copy(this),t);let e=Cn.r,n=Cn.g,s=Cn.b;return t!==En?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Hi),this.setHSL(Hi.h+t,Hi.s+e,Hi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Hi),t.getHSL(La);let n=Nr(Hi.h,La.h,e),s=Nr(Hi.s,La.s,e),r=Nr(Hi.l,La.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Cn=new ue;ue.NAMES=gd;var ms=class extends dn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pi,this.environmentIntensity=1,this.environmentRotation=new Pi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},ni=new O,Ei=new O,sc=new O,Ai=new O,Gs=new O,Hs=new O,lu=new O,rc=new O,ac=new O,oc=new O,lc=new Ke,cc=new Ke,hc=new Ke,Ci=class i{constructor(t=new O,e=new O,n=new O){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),ni.subVectors(t,e),s.cross(ni);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){ni.subVectors(s,e),Ei.subVectors(n,e),sc.subVectors(t,e);let a=ni.dot(ni),o=ni.dot(Ei),l=ni.dot(sc),c=Ei.dot(Ei),h=Ei.dot(sc),p=a*c-o*o;if(p===0)return r.set(0,0,0),null;let u=1/p,f=(c*l-o*h)*u,_=(a*h-o*l)*u;return r.set(1-f-_,_,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Ai)===null?!1:Ai.x>=0&&Ai.y>=0&&Ai.x+Ai.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,Ai)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ai.x),l.addScaledVector(a,Ai.y),l.addScaledVector(o,Ai.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return lc.setScalar(0),cc.setScalar(0),hc.setScalar(0),lc.fromBufferAttribute(t,e),cc.fromBufferAttribute(t,n),hc.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(lc,r.x),a.addScaledVector(cc,r.y),a.addScaledVector(hc,r.z),a}static isFrontFacing(t,e,n,s){return ni.subVectors(n,e),Ei.subVectors(t,e),ni.cross(Ei).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ni.subVectors(this.c,this.b),Ei.subVectors(this.a,this.b),ni.cross(Ei).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;Gs.subVectors(s,n),Hs.subVectors(r,n),rc.subVectors(t,n);let l=Gs.dot(rc),c=Hs.dot(rc);if(l<=0&&c<=0)return e.copy(n);ac.subVectors(t,s);let h=Gs.dot(ac),p=Hs.dot(ac);if(h>=0&&p<=h)return e.copy(s);let u=l*p-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(Gs,a);oc.subVectors(t,r);let f=Gs.dot(oc),_=Hs.dot(oc);if(_>=0&&f<=_)return e.copy(r);let y=f*c-l*_;if(y<=0&&c>=0&&_<=0)return o=c/(c-_),e.copy(n).addScaledVector(Hs,o);let g=h*_-f*p;if(g<=0&&p-h>=0&&f-_>=0)return lu.subVectors(r,s),o=(p-h)/(p-h+(f-_)),e.copy(s).addScaledVector(lu,o);let m=1/(g+y+u);return a=y*m,o=u*m,e.copy(n).addScaledVector(Gs,a).addScaledVector(Hs,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},_i=class{constructor(t=new O(1/0,1/0,1/0),e=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(ii.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(ii.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=ii.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,ii):ii.fromBufferAttribute(r,a),ii.applyMatrix4(t.matrixWorld),this.expandByPoint(ii);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Da.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Da.copy(n.boundingBox)),Da.applyMatrix4(t.matrixWorld),this.union(Da)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,ii),ii.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(wr),Na.subVectors(this.max,wr),Ws.subVectors(t.a,wr),Xs.subVectors(t.b,wr),qs.subVectors(t.c,wr),Wi.subVectors(Xs,Ws),Xi.subVectors(qs,Xs),hs.subVectors(Ws,qs);let e=[0,-Wi.z,Wi.y,0,-Xi.z,Xi.y,0,-hs.z,hs.y,Wi.z,0,-Wi.x,Xi.z,0,-Xi.x,hs.z,0,-hs.x,-Wi.y,Wi.x,0,-Xi.y,Xi.x,0,-hs.y,hs.x,0];return!uc(e,Ws,Xs,qs,Na)||(e=[1,0,0,0,1,0,0,0,1],!uc(e,Ws,Xs,qs,Na))?!1:(Ua.crossVectors(Wi,Xi),e=[Ua.x,Ua.y,Ua.z],uc(e,Ws,Xs,qs,Na))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ii).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ii).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ti[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ti[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ti[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ti[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ti[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ti[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ti[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ti[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ti),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ti=[new O,new O,new O,new O,new O,new O,new O,new O],ii=new O,Da=new _i,Ws=new O,Xs=new O,qs=new O,Wi=new O,Xi=new O,hs=new O,wr=new O,Na=new O,Ua=new O,us=new O;function uc(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){us.fromArray(i,r);let o=s.x*Math.abs(us.x)+s.y*Math.abs(us.y)+s.z*Math.abs(us.z),l=t.dot(us),c=e.dot(us),h=n.dot(us);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var rn=new O,Fa=new St,Jf=0,kn=class extends ri{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Jf++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=ud,this.updateRanges=[],this.gpuType=Kn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Fa.fromBufferAttribute(this,e),Fa.applyMatrix3(t),this.setXY(e,Fa.x,Fa.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)rn.fromBufferAttribute(this,e),rn.applyMatrix3(t),this.setXYZ(e,rn.x,rn.y,rn.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)rn.fromBufferAttribute(this,e),rn.applyMatrix4(t),this.setXYZ(e,rn.x,rn.y,rn.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)rn.fromBufferAttribute(this,e),rn.applyNormalMatrix(t),this.setXYZ(e,rn.x,rn.y,rn.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)rn.fromBufferAttribute(this,e),rn.transformDirection(t),this.setXYZ(e,rn.x,rn.y,rn.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ks(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Pn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ks(e,this.array)),e}setX(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ks(e,this.array)),e}setY(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ks(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ks(e,this.array)),e}setW(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),s=Pn(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),s=Pn(s,this.array),r=Pn(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Gr=class extends kn{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Hr=class extends kn{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var ye=class extends kn{constructor(t,e,n){super(new Float32Array(t),e,n)}},jf=new _i,Cr=new O,dc=new O,Ii=class{constructor(t=new O,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):jf.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Cr.subVectors(t,this.center);let e=Cr.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Cr,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(dc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Cr.copy(t.center).add(dc)),this.expandByPoint(Cr.copy(t.center).sub(dc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Kf=0,jn=new We,fc=new dn,$s=new O,Bn=new _i,Rr=new _i,_n=new O,Qe=class i extends ri{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Kf++}),this.uuid=Es(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Sf(t)?Hr:Gr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new ge().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return jn.makeRotationFromQuaternion(t),this.applyMatrix4(jn),this}rotateX(t){return jn.makeRotationX(t),this.applyMatrix4(jn),this}rotateY(t){return jn.makeRotationY(t),this.applyMatrix4(jn),this}rotateZ(t){return jn.makeRotationZ(t),this.applyMatrix4(jn),this}translate(t,e,n){return jn.makeTranslation(t,e,n),this.applyMatrix4(jn),this}scale(t,e,n){return jn.makeScale(t,e,n),this.applyMatrix4(jn),this}lookAt(t){return fc.lookAt(t),fc.updateMatrix(),this.applyMatrix4(fc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter($s).negate(),this.translate($s.x,$s.y,$s.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ye(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new _i);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){le("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Bn.setFromBufferAttribute(r),this.morphTargetsRelative?(_n.addVectors(this.boundingBox.min,Bn.min),this.boundingBox.expandByPoint(_n),_n.addVectors(this.boundingBox.max,Bn.max),this.boundingBox.expandByPoint(_n)):(this.boundingBox.expandByPoint(Bn.min),this.boundingBox.expandByPoint(Bn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&le('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ii);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){le("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(t){let n=this.boundingSphere.center;if(Bn.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];Rr.setFromBufferAttribute(o),this.morphTargetsRelative?(_n.addVectors(Bn.min,Rr.min),Bn.expandByPoint(_n),_n.addVectors(Bn.max,Rr.max),Bn.expandByPoint(_n)):(Bn.expandByPoint(Rr.min),Bn.expandByPoint(Rr.max))}Bn.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)_n.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(_n));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)_n.fromBufferAttribute(o,c),l&&($s.fromBufferAttribute(t,c),_n.add($s)),s=Math.max(s,n.distanceToSquared(_n))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&le('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){le("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new kn(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let v=0;v<n.count;v++)o[v]=new O,l[v]=new O;let c=new O,h=new O,p=new O,u=new St,f=new St,_=new St,y=new O,g=new O;function m(v,w,F){c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,w),p.fromBufferAttribute(n,F),u.fromBufferAttribute(r,v),f.fromBufferAttribute(r,w),_.fromBufferAttribute(r,F),h.sub(c),p.sub(c),f.sub(u),_.sub(u);let z=1/(f.x*_.y-_.x*f.y);isFinite(z)&&(y.copy(h).multiplyScalar(_.y).addScaledVector(p,-f.y).multiplyScalar(z),g.copy(p).multiplyScalar(f.x).addScaledVector(h,-_.x).multiplyScalar(z),o[v].add(y),o[w].add(y),o[F].add(y),l[v].add(g),l[w].add(g),l[F].add(g))}let R=this.groups;R.length===0&&(R=[{start:0,count:t.count}]);for(let v=0,w=R.length;v<w;++v){let F=R[v],z=F.start,$=F.count;for(let q=z,D=z+$;q<D;q+=3)m(t.getX(q+0),t.getX(q+1),t.getX(q+2))}let I=new O,b=new O,T=new O,A=new O;function L(v){T.fromBufferAttribute(s,v),A.copy(T);let w=o[v];I.copy(w),I.sub(T.multiplyScalar(T.dot(w))).normalize(),b.crossVectors(A,w);let z=b.dot(l[v])<0?-1:1;a.setXYZW(v,I.x,I.y,I.z,z)}for(let v=0,w=R.length;v<w;++v){let F=R[v],z=F.start,$=F.count;for(let q=z,D=z+$;q<D;q+=3)L(t.getX(q+0)),L(t.getX(q+1)),L(t.getX(q+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new kn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new O,r=new O,a=new O,o=new O,l=new O,c=new O,h=new O,p=new O;if(t)for(let u=0,f=t.count;u<f;u+=3){let _=t.getX(u+0),y=t.getX(u+1),g=t.getX(u+2);s.fromBufferAttribute(e,_),r.fromBufferAttribute(e,y),a.fromBufferAttribute(e,g),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),o.fromBufferAttribute(n,_),l.fromBufferAttribute(n,y),c.fromBufferAttribute(n,g),o.add(h),l.add(h),c.add(h),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(y,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)_n.fromBufferAttribute(t,e),_n.normalize(),t.setXYZ(e,_n.x,_n.y,_n.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,p=o.normalized,u=new c.constructor(l.length*h),f=0,_=0;for(let y=0,g=l.length;y<g;y++){o.isInterleavedBufferAttribute?f=l[y]*o.data.stride+o.offset:f=l[y]*h;for(let m=0;m<h;m++)u[_++]=c[f++]}return new kn(u,h,p)}if(this.index===null)return ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,n);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,p=c.length;h<p;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let p=0,u=c.length;p<u;p++){let f=c[p];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],p=r[c];for(let u=0,f=p.length;u<f;u++)h.push(p[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,h=a.length;c<h;c++){let p=a[c];this.addGroup(p.start,p.count,p.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var pc=new O,Qf=new O,tp=new ge,zn=class{constructor(t=new O(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=pc.subVectors(n,e).cross(Qf.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(pc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||tp.getNormalMatrix(t),s=this.coplanarPoint(pc).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},ep=0,Li=class extends ri{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ep++}),this.uuid=Es(),this.name="",this.type="Material",this.blending=mr,this.side=ns,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Vc,this.blendDst=Gc,this.blendEquation=Ss,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new ue(0,0,0),this.blendAlpha=0,this.depthFunc=er,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=sd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=so,this.stencilZFail=so,this.stencilZPass=so,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){ae(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){ae(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new ue().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new zn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new St().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new St().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var wi=new O,mc=new O,Oa=new O,Ba=new O,$i=class{constructor(t=new O,e=new O(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,wi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=wi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(wi.copy(this.origin).addScaledVector(this.direction,e),wi.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){mc.copy(t).add(e).multiplyScalar(.5),Oa.copy(e).sub(t).normalize(),Ba.copy(this.origin).sub(mc);let r=t.distanceTo(e)*.5,a=-this.direction.dot(Oa),o=Ba.dot(this.direction),l=-Ba.dot(Oa),c=Ba.lengthSq(),h=Math.abs(1-a*a),p,u,f,_;if(h>0)if(p=a*l-o,u=a*o-l,_=r*h,p>=0)if(u>=-_)if(u<=_){let y=1/h;p*=y,u*=y,f=p*(p+a*u+2*o)+u*(a*p+u+2*l)+c}else u=r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;else u=-r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;else u<=-_?(p=Math.max(0,-(-a*r+o)),u=p>0?-r:Math.min(Math.max(-r,-l),r),f=-p*p+u*(u+2*l)+c):u<=_?(p=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(p=Math.max(0,-(a*r+o)),u=p>0?r:Math.min(Math.max(-r,-l),r),f=-p*p+u*(u+2*l)+c);else u=a>0?-r:r,p=Math.max(0,-(a*u+o)),f=-p*p+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,p),s&&s.copy(mc).addScaledVector(Oa,u),f}intersectSphere(t,e){if(t.radius<0)return null;wi.subVectors(t.center,this.origin);let n=wi.dot(this.direction),s=wi.dot(wi)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,p=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),p>=0?(o=(t.min.z-u.z)*p,l=(t.max.z-u.z)*p):(o=(t.max.z-u.z)*p,l=(t.min.z-u.z)*p),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,wi)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,p=t.x-a.x,u=t.y-a.y,f=t.z-a.z,_=e.x-a.x,y=e.y-a.y,g=e.z-a.z,m=n.x-a.x,R=n.y-a.y,I=n.z-a.z,b=Math.abs(l),T=Math.abs(c),A=Math.abs(h),L,v,w,F,z,$,q,D,Z,st,nt,vt;if(b>=T&&b>=A?(w=l,$=p,Z=_,vt=m,l>=0?(L=c,v=h,F=u,z=f,q=y,D=g,st=R,nt=I):(L=h,v=c,F=f,z=u,q=g,D=y,st=I,nt=R)):T>=A?(w=c,$=u,Z=y,vt=R,c>=0?(L=h,v=l,F=f,z=p,q=g,D=_,st=I,nt=m):(L=l,v=h,F=p,z=f,q=_,D=g,st=m,nt=I)):(w=h,$=f,Z=g,vt=I,h>=0?(L=l,v=c,F=p,z=u,q=_,D=y,st=m,nt=R):(L=c,v=l,F=u,z=p,q=y,D=_,st=R,nt=m)),w===0)return null;let et=L/w,ut=v/w,dt=1/w,zt=F-et*$,Ut=z-ut*$,we=q-et*Z,de=D-ut*Z,B=st-et*vt,C=nt-ut*vt,U=B*de-C*we,Y=zt*C-Ut*B,pt=we*Ut-de*zt;if(s){if(U<0||Y<0||pt<0)return null}else if((U<0||Y<0||pt<0)&&(U>0||Y>0||pt>0))return null;let ot=U+Y+pt;if(ot===0)return null;let Dt=dt*(U*$+Y*Z+pt*vt);return(ot>0?Dt<0:Dt>0)?null:this.at(Dt/ot,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Di=class extends Li{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new ue(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.combine=Hc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},cu=new We,ds=new $i,za=new Ii,hu=new O,ka=new O,Va=new O,Ga=new O,gc=new O,Ha=new O,uu=new O,Wa=new O,qe=class extends dn{constructor(t=new Qe,e=new Di){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){Ha.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],p=r[l];h!==0&&(gc.fromBufferAttribute(p,t),a?Ha.addScaledVector(gc,h):Ha.addScaledVector(gc.sub(e),h))}e.add(Ha)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),za.copy(n.boundingSphere),za.applyMatrix4(r),ds.copy(t.ray).recast(t.near),!(za.containsPoint(ds.origin)===!1&&(ds.intersectSphere(za,hu)===null||ds.origin.distanceToSquared(hu)>(t.far-t.near)**2))&&(cu.copy(r).invert(),ds.copy(t.ray).applyMatrix4(cu),!(n.boundingBox!==null&&ds.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ds)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,p=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,y=u.length;_<y;_++){let g=u[_],m=a[g.materialIndex],R=Math.max(g.start,f.start),I=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let b=R,T=I;b<T;b+=3){let A=o.getX(b),L=o.getX(b+1),v=o.getX(b+2);s=Xa(this,m,t,n,c,h,p,A,L,v),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let _=Math.max(0,f.start),y=Math.min(o.count,f.start+f.count);for(let g=_,m=y;g<m;g+=3){let R=o.getX(g),I=o.getX(g+1),b=o.getX(g+2);s=Xa(this,a,t,n,c,h,p,R,I,b),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let _=0,y=u.length;_<y;_++){let g=u[_],m=a[g.materialIndex],R=Math.max(g.start,f.start),I=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let b=R,T=I;b<T;b+=3){let A=b,L=b+1,v=b+2;s=Xa(this,m,t,n,c,h,p,A,L,v),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=g.materialIndex,e.push(s))}}else{let _=Math.max(0,f.start),y=Math.min(l.count,f.start+f.count);for(let g=_,m=y;g<m;g+=3){let R=g,I=g+1,b=g+2;s=Xa(this,a,t,n,c,h,p,R,I,b),s&&(s.faceIndex=Math.floor(g/3),e.push(s))}}}};function np(i,t,e,n,s,r,a,o){let l;if(t.side===Ln?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===ns,o),l===null)return null;Wa.copy(o),Wa.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Wa);return c<e.near||c>e.far?null:{distance:c,point:Wa.clone(),object:i}}function Xa(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,ka),i.getVertexPosition(l,Va),i.getVertexPosition(c,Ga);let h=np(i,t,e,n,ka,Va,Ga,uu);if(h){let p=new O;Ci.getBarycoord(uu,ka,Va,Ga,p),s&&(h.uv=Ci.getInterpolatedAttribute(s,o,l,c,p,new St)),r&&(h.uv1=Ci.getInterpolatedAttribute(r,o,l,c,p,new St)),a&&(h.normal=Ci.getInterpolatedAttribute(a,o,l,c,p,new O),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new O,materialIndex:0};Ci.getNormal(ka,Va,Ga,u.normal),h.face=u,h.barycoord=p}return h}var Wr=class extends Dn{constructor(t=null,e=1,n=1,s,r,a,o,l,c=xn,h=xn,p,u){super(null,a,o,l,c,h,s,r,p,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Xr=class extends kn{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Ys=new We,du=new We,qa=[],fu=new _i,ip=new We,Pr=new qe,Ir=new Ii,gs=class extends qe{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Xr(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,ip)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new _i),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ys),fu.copy(t.boundingBox).applyMatrix4(Ys),this.boundingBox.union(fu)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ii),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ys),Ir.copy(t.boundingSphere).applyMatrix4(Ys),this.boundingSphere.union(Ir)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(Pr.geometry=this.geometry,Pr.material=this.material,Pr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ir.copy(this.boundingSphere),Ir.applyMatrix4(n),t.ray.intersectsSphere(Ir)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ys),du.multiplyMatrices(n,Ys),Pr.matrixWorld=du,Pr.raycast(t,qa);for(let a=0,o=qa.length;a<o;a++){let l=qa[a];l.instanceId=r,l.object=this,e.push(l)}qa.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new Xr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Wr(new Float32Array(s*this.count),s,this.count,jo,Kn));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},fs=new Ii,sp=new St(.5,.5),$a=new O,lr=class{constructor(t=new zn,e=new zn,n=new zn,s=new zn,r=new zn,a=new zn){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=si,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],p=r[5],u=r[6],f=r[7],_=r[8],y=r[9],g=r[10],m=r[11],R=r[12],I=r[13],b=r[14],T=r[15];if(s[0].setComponents(c-a,f-h,m-_,T-R).normalize(),s[1].setComponents(c+a,f+h,m+_,T+R).normalize(),s[2].setComponents(c+o,f+p,m+y,T+I).normalize(),s[3].setComponents(c-o,f-p,m-y,T-I).normalize(),n)s[4].setComponents(l,u,g,b).normalize(),s[5].setComponents(c-l,f-u,m-g,T-b).normalize();else if(s[4].setComponents(c-l,f-u,m-g,T-b).normalize(),e===si)s[5].setComponents(c+l,f+u,m+g,T+b).normalize();else if(e===nr)s[5].setComponents(l,u,g,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),fs.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),fs.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(fs)}intersectsSprite(t){fs.center.set(0,0,0);let e=sp.distanceTo(t.center);return fs.radius=.7071067811865476+e,fs.applyMatrix4(t.matrixWorld),this.intersectsSphere(fs)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if($a.x=s.normal.x>0?t.max.x:t.min.x,$a.y=s.normal.y>0?t.max.y:t.min.y,$a.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint($a)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ai=class extends Li{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new ue(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},vo=new O,yo=new O,pu=new We,Lr=new $i,Ya=new Ii,_c=new O,mu=new O,Mo=class extends dn{constructor(t=new Qe,e=new ai){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)vo.fromBufferAttribute(e,s-1),yo.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=vo.distanceTo(yo);t.setAttribute("lineDistance",new ye(n,1))}else ae("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ya.copy(n.boundingSphere),Ya.applyMatrix4(s),Ya.radius+=r,t.ray.intersectsSphere(Ya)===!1)return;pu.copy(s).invert(),Lr.copy(t.ray).applyMatrix4(pu);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),_=Math.min(h.count,a.start+a.count);for(let y=f,g=_-1;y<g;y+=c){let m=h.getX(y),R=h.getX(y+1),I=Za(this,t,Lr,l,m,R,y);I&&e.push(I)}if(this.isLineLoop){let y=h.getX(_-1),g=h.getX(f),m=Za(this,t,Lr,l,y,g,_-1);m&&e.push(m)}}else{let f=Math.max(0,a.start),_=Math.min(u.count,a.start+a.count);for(let y=f,g=_-1;y<g;y+=c){let m=Za(this,t,Lr,l,y,y+1,y);m&&e.push(m)}if(this.isLineLoop){let y=Za(this,t,Lr,l,_-1,f,_-1);y&&e.push(y)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Za(i,t,e,n,s,r,a){let o=i.geometry.attributes.position;if(vo.fromBufferAttribute(o,s),yo.fromBufferAttribute(o,r),e.distanceSqToSegment(vo,yo,_c,mu)>n)return;_c.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(_c);if(!(c<t.near||c>t.far))return{distance:c,point:mu.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var gu=new O,_u=new O,xi=class extends Mo{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)gu.fromBufferAttribute(e,s),_u.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+gu.distanceTo(_u);t.setAttribute("lineDistance",new ye(n,1))}else ae("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var qr=class extends Dn{constructor(t=[],e=is,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var Yi=class extends Dn{constructor(t,e,n=li,s,r,a,o=xn,l=xn,c,h=gi,p=1){if(h!==gi&&h!==rs)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:p};super(u,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new rr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},So=class extends Yi{constructor(t,e=li,n=is,s,r,a=xn,o=xn,l,c=gi){let h={width:t,height:t,depth:1},p=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},$r=class extends Dn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},Gn=class i extends Qe{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],p=[],u=0,f=0;_("z","y","x",-1,-1,n,e,t,a,r,0),_("z","y","x",1,-1,n,e,-t,a,r,1),_("x","z","y",1,1,t,n,e,s,a,2),_("x","z","y",1,-1,t,n,-e,s,a,3),_("x","y","z",1,-1,t,e,n,s,r,4),_("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ye(c,3)),this.setAttribute("normal",new ye(h,3)),this.setAttribute("uv",new ye(p,2));function _(y,g,m,R,I,b,T,A,L,v,w){let F=b/L,z=T/v,$=b/2,q=T/2,D=A/2,Z=L+1,st=v+1,nt=0,vt=0,et=new O;for(let ut=0;ut<st;ut++){let dt=ut*z-q;for(let zt=0;zt<Z;zt++){let Ut=zt*F-$;et[y]=Ut*R,et[g]=dt*I,et[m]=D,c.push(et.x,et.y,et.z),et[y]=0,et[g]=0,et[m]=A>0?1:-1,h.push(et.x,et.y,et.z),p.push(zt/L),p.push(1-ut/v),nt+=1}}for(let ut=0;ut<v;ut++)for(let dt=0;dt<L;dt++){let zt=u+dt+Z*ut,Ut=u+dt+Z*(ut+1),we=u+(dt+1)+Z*(ut+1),de=u+(dt+1)+Z*ut;l.push(zt,Ut,de),l.push(Ut,we,de),vt+=6}o.addGroup(f,vt,w),f+=vt,u+=nt}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Ni=class i extends Qe{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],p=[],u=[],f=[],_=0,y=[],g=n/2,m=0;R(),a===!1&&(t>0&&I(!0),e>0&&I(!1)),this.setIndex(h),this.setAttribute("position",new ye(p,3)),this.setAttribute("normal",new ye(u,3)),this.setAttribute("uv",new ye(f,2));function R(){let b=new O,T=new O,A=0,L=(e-t)/n;for(let v=0;v<=r;v++){let w=[],F=v/r,z=F*(e-t)+t;for(let $=0;$<=s;$++){let q=$/s,D=q*l+o,Z=Math.sin(D),st=Math.cos(D);T.x=z*Z,T.y=-F*n+g,T.z=z*st,p.push(T.x,T.y,T.z),b.set(Z,L,st).normalize(),u.push(b.x,b.y,b.z),f.push(q,1-F),w.push(_++)}y.push(w)}for(let v=0;v<s;v++)for(let w=0;w<r;w++){let F=y[w][v],z=y[w+1][v],$=y[w+1][v+1],q=y[w][v+1];(t>0||w!==0)&&(h.push(F,z,q),A+=3),(e>0||w!==r-1)&&(h.push(z,$,q),A+=3)}c.addGroup(m,A,0),m+=A}function I(b){let T=_,A=new St,L=new O,v=0,w=b===!0?t:e,F=b===!0?1:-1;for(let $=1;$<=s;$++)p.push(0,g*F,0),u.push(0,F,0),f.push(.5,.5),_++;let z=_;for(let $=0;$<=s;$++){let D=$/s*l+o,Z=Math.cos(D),st=Math.sin(D);L.x=w*st,L.y=g*F,L.z=w*Z,p.push(L.x,L.y,L.z),u.push(0,F,0),A.x=Z*.5+.5,A.y=st*.5*F+.5,f.push(A.x,A.y),_++}for(let $=0;$<s;$++){let q=T+$,D=z+$;b===!0?h.push(D,D+1,q):h.push(D+1,D,q),v+=3}c.addGroup(m,v,b===!0?1:2),m+=v}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Ja=new O,ja=new O,xc=new O,Ka=new Ci,Yr=class extends Qe{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(Qs*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],p=new Array(3),u={},f=[];for(let _=0;_<l;_+=3){a?(c[0]=a.getX(_),c[1]=a.getX(_+1),c[2]=a.getX(_+2)):(c[0]=_,c[1]=_+1,c[2]=_+2);let{a:y,b:g,c:m}=Ka;if(y.fromBufferAttribute(o,c[0]),g.fromBufferAttribute(o,c[1]),m.fromBufferAttribute(o,c[2]),Ka.getNormal(xc),p[0]=`${Math.round(y.x*s)},${Math.round(y.y*s)},${Math.round(y.z*s)}`,p[1]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,p[2]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,!(p[0]===p[1]||p[1]===p[2]||p[2]===p[0]))for(let R=0;R<3;R++){let I=(R+1)%3,b=p[R],T=p[I],A=Ka[h[R]],L=Ka[h[I]],v=`${b}_${T}`,w=`${T}_${b}`;w in u&&u[w]?(xc.dot(u[w].normal)<=r&&(f.push(A.x,A.y,A.z),f.push(L.x,L.y,L.z)),u[w]=null):v in u||(u[v]={index0:c[R],index1:c[I],normal:xc.clone()})}}for(let _ in u)if(u[_]){let{index0:y,index1:g}=u[_];Ja.fromBufferAttribute(o,y),ja.fromBufferAttribute(o,g),f.push(Ja.x,Ja.y,Ja.z),f.push(ja.x,ja.y,ja.z)}this.setAttribute("position",new ye(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},Hn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){ae("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],u=n[s+1]-h,f=(a-h)/u;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new St:new O);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new O,s=[],r=[],a=[],o=new O,l=new We;for(let f=0;f<=t;f++){let _=f/t;s[f]=this.getTangentAt(_,new O)}r[0]=new O,a[0]=new O;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),p=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),p<=c&&(c=p,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();let _=Math.acos(be(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(o,_))}a[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos(be(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(f=-f);for(let _=1;_<=t;_++)r[_].applyMatrix4(l.makeRotationAxis(s[_],f*_)),a[_].crossVectors(s[_],r[_])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},cr=class extends Hn{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new St){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),p=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*p+this.aX,c=u*p+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},bo=class extends cr{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function oh(){let i=0,t=0,e=0,n=0;function s(r,a,o,l){i=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,p){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+p)+(l-o)/p;u*=h,f*=h,s(a,o,u,f)},calc:function(r){let a=r*r,o=a*r;return i+t*r+e*a+n*o}}}var xu=new O,vu=new O,vc=new oh,yc=new oh,Mc=new oh,Eo=class extends Hn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new O){let n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(vu.subVectors(s[0],s[1]).add(s[0]),c=vu);let p=s[o%r],u=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(xu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=xu),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,_=Math.pow(c.distanceToSquared(p),f),y=Math.pow(p.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);y<1e-4&&(y=1),_<1e-4&&(_=y),g<1e-4&&(g=y),vc.initNonuniformCatmullRom(c.x,p.x,u.x,h.x,_,y,g),yc.initNonuniformCatmullRom(c.y,p.y,u.y,h.y,_,y,g),Mc.initNonuniformCatmullRom(c.z,p.z,u.z,h.z,_,y,g)}else this.curveType==="catmullrom"&&(vc.initCatmullRom(c.x,p.x,u.x,h.x,this.tension),yc.initCatmullRom(c.y,p.y,u.y,h.y,this.tension),Mc.initCatmullRom(c.z,p.z,u.z,h.z,this.tension));return n.set(vc.calc(l),yc.calc(l),Mc.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new O().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function yu(i,t,e,n,s){let r=(n-t)*.5,a=(s-e)*.5,o=i*i,l=i*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*i+e}function rp(i,t){let e=1-i;return e*e*t}function ap(i,t){return 2*(1-i)*i*t}function op(i,t){return i*i*t}function Ur(i,t,e,n){return rp(i,t)+ap(i,e)+op(i,n)}function lp(i,t){let e=1-i;return e*e*e*t}function cp(i,t){let e=1-i;return 3*e*e*i*t}function hp(i,t){return 3*(1-i)*i*i*t}function up(i,t){return i*i*i*t}function Fr(i,t,e,n,s){return lp(i,t)+cp(i,e)+hp(i,n)+up(i,s)}var Zr=class extends Hn{constructor(t=new St,e=new St,n=new St,s=new St){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new St){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Fr(t,s.x,r.x,a.x,o.x),Fr(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Ao=class extends Hn{constructor(t=new O,e=new O,n=new O,s=new O){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new O){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Fr(t,s.x,r.x,a.x,o.x),Fr(t,s.y,r.y,a.y,o.y),Fr(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Jr=class extends Hn{constructor(t=new St,e=new St){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new St){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new St){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},To=class extends Hn{constructor(t=new O,e=new O){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new O){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new O){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},jr=class extends Hn{constructor(t=new St,e=new St,n=new St){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new St){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(Ur(t,s.x,r.x,a.x),Ur(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},wo=class extends Hn{constructor(t=new O,e=new O,n=new O){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new O){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(Ur(t,s.x,r.x,a.x),Ur(t,s.y,r.y,a.y),Ur(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Kr=class extends Hn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new St){let n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],p=s[a>s.length-3?s.length-1:a+2];return n.set(yu(o,l.x,c.x,h.x,p.x),yu(o,l.y,c.y,h.y,p.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new St().fromArray(s))}return this}},Cc=Object.freeze({__proto__:null,ArcCurve:bo,CatmullRomCurve3:Eo,CubicBezierCurve:Zr,CubicBezierCurve3:Ao,EllipseCurve:cr,LineCurve:Jr,LineCurve3:To,QuadraticBezierCurve:jr,QuadraticBezierCurve3:wo,SplineCurve:Kr}),Co=class extends Hn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Cc[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new Cc[s.type]().fromJSON(s))}return this}},Qr=class extends Co{constructor(t){super(),this.type="Path",this.currentPoint=new St,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new Jr(this.currentPoint.clone(),new St(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new jr(this.currentPoint.clone(),new St(t,e),new St(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,a){let o=new Zr(this.currentPoint.clone(),new St(t,e),new St(n,s),new St(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new Kr(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,s,r,a),this}absarc(t,e,n,s,r,a){return this.absellipse(t,e,n,n,s,r,a),this}ellipse(t,e,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,a,o,l),this}absellipse(t,e,n,s,r,a,o,l){let c=new cr(t,e,n,s,r,a,o,l);if(this.curves.length>0){let p=c.getPoint(0);p.equals(this.currentPoint)||this.lineTo(p.x,p.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},Ui=class extends Qr{constructor(t){super(t),this.uuid=Es(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new Qr().fromJSON(s))}return this}};function dp(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=_d(i,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(n&&(r=_p(i,t,r,e)),i.length>80*e){o=i[0],l=i[1];let h=o,p=l;for(let u=e;u<s;u+=e){let f=i[u],_=i[u+1];f<o&&(o=f),_<l&&(l=_),f>h&&(h=f),_>p&&(p=_)}c=Math.max(h-o,p-l),c=c!==0?32767/c:0}return ta(r,a,e,o,l,c,0),a}function _d(i,t,e,n,s){let r;if(s===Cp(i,t,e,n)>0)for(let a=t;a<e;a+=n)r=Mu(a/n|0,i[a],i[a+1],r);else for(let a=e-n;a>=t;a-=n)r=Mu(a/n|0,i[a],i[a+1],r);return r&&hr(r,r.next)&&(na(r),r=r.next),r}function _s(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(hr(e,e.next)||en(e.prev,e,e.next)===0)){if(na(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function ta(i,t,e,n,s,r,a){if(!i)return;!a&&r&&Sp(i,n,s,r);let o=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?pp(i,n,s,r):fp(i)){t.push(l.i,i.i,c.i),na(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=mp(_s(i),t),ta(i,t,e,n,s,r,2)):a===2&&gp(i,t,e,n,s,r):ta(_s(i),t,e,n,s,r,1);break}}}function fp(i){let t=i.prev,e=i,n=i.next;if(en(t,e,n)>=0)return!1;let s=t.x,r=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=Math.min(s,r,a),p=Math.min(o,l,c),u=Math.max(s,r,a),f=Math.max(o,l,c),_=n.next;for(;_!==t;){if(_.x>=h&&_.x<=u&&_.y>=p&&_.y<=f&&Dr(s,o,r,l,a,c,_.x,_.y)&&en(_.prev,_,_.next)>=0)return!1;_=_.next}return!0}function pp(i,t,e,n){let s=i.prev,r=i,a=i.next;if(en(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,p=r.y,u=a.y,f=Math.min(o,l,c),_=Math.min(h,p,u),y=Math.max(o,l,c),g=Math.max(h,p,u),m=Rc(f,_,t,e,n),R=Rc(y,g,t,e,n),I=i.prevZ,b=i.nextZ;for(;I&&I.z>=m&&b&&b.z<=R;){if(I.x>=f&&I.x<=y&&I.y>=_&&I.y<=g&&I!==s&&I!==a&&Dr(o,h,l,p,c,u,I.x,I.y)&&en(I.prev,I,I.next)>=0||(I=I.prevZ,b.x>=f&&b.x<=y&&b.y>=_&&b.y<=g&&b!==s&&b!==a&&Dr(o,h,l,p,c,u,b.x,b.y)&&en(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;I&&I.z>=m;){if(I.x>=f&&I.x<=y&&I.y>=_&&I.y<=g&&I!==s&&I!==a&&Dr(o,h,l,p,c,u,I.x,I.y)&&en(I.prev,I,I.next)>=0)return!1;I=I.prevZ}for(;b&&b.z<=R;){if(b.x>=f&&b.x<=y&&b.y>=_&&b.y<=g&&b!==s&&b!==a&&Dr(o,h,l,p,c,u,b.x,b.y)&&en(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function mp(i,t){let e=i;do{let n=e.prev,s=e.next.next;!hr(n,s)&&vd(n,e,e.next,s)&&ea(n,s)&&ea(s,n)&&(t.push(n.i,e.i,s.i),na(e),na(e.next),e=i=s),e=e.next}while(e!==i);return _s(e)}function gp(i,t,e,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Ap(a,o)){let l=yd(a,o);a=_s(a,a.next),l=_s(l,l.next),ta(a,t,e,n,s,r,0),ta(l,t,e,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function _p(i,t,e,n){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*n,l=r<a-1?t[r+1]*n:i.length,c=_d(i,o,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Ep(c))}s.sort(xp);for(let r=0;r<s.length;r++)e=vp(s[r],e);return e}function xp(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function vp(i,t){let e=yp(i,t);if(!e)return t;let n=yd(e,i);return _s(n,n.next),_s(e,e.next)}function yp(i,t){let e=t,n=i.x,s=i.y,r=-1/0,a;if(hr(i,e))return e;do{if(hr(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let p=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(p<=n&&p>r&&(r=p,a=e.x<e.next.x?e:e.next,p===n))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,l=a.x,c=a.y,h=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&xd(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){let p=Math.abs(s-e.y)/(n-e.x);ea(e,i)&&(p<h||p===h&&(e.x>a.x||e.x===a.x&&Mp(a,e)))&&(a=e,h=p)}e=e.next}while(e!==o);return a}function Mp(i,t){return en(i.prev,i,t.prev)<0&&en(t.next,i,i.next)<0}function Sp(i,t,e,n){let s=i;do s.z===0&&(s.z=Rc(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,bp(s)}function bp(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,e*=2}while(t>1);return i}function Rc(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Ep(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function xd(i,t,e,n,s,r,a,o){return(s-a)*(t-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(n-o)}function Dr(i,t,e,n,s,r,a,o){return!(i===a&&t===o)&&xd(i,t,e,n,s,r,a,o)}function Ap(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!Tp(i,t)&&(ea(i,t)&&ea(t,i)&&wp(i,t)&&(en(i.prev,i,t.prev)||en(i,t.prev,t))||hr(i,t)&&en(i.prev,i,i.next)>0&&en(t.prev,t,t.next)>0)}function en(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function hr(i,t){return i.x===t.x&&i.y===t.y}function vd(i,t,e,n){let s=to(en(i,t,e)),r=to(en(i,t,n)),a=to(en(e,n,i)),o=to(en(e,n,t));return!!(s!==r&&a!==o||s===0&&Qa(i,e,t)||r===0&&Qa(i,n,t)||a===0&&Qa(e,i,n)||o===0&&Qa(e,t,n))}function Qa(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function to(i){return i>0?1:i<0?-1:0}function Tp(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&vd(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function ea(i,t){return en(i.prev,i,i.next)<0?en(i,t,i.next)>=0&&en(i,i.prev,t)>=0:en(i,t,i.prev)<0||en(i,i.next,t)<0}function wp(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function yd(i,t){let e=Pc(i.i,i.x,i.y),n=Pc(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Mu(i,t,e,n){let s=Pc(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function na(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Pc(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Cp(i,t,e,n){let s=0;for(let r=t,a=e-n;r<e;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var Ic=class{static triangulate(t,e,n=2){return dp(t,e,n)}},mi=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];Su(t),bu(n,t);let a=t.length;e.forEach(Su);for(let l=0;l<e.length;l++)s.push(a),a+=e[l].length,bu(n,e[l]);let o=Ic.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function Su(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function bu(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var ia=class i extends Qe{constructor(t=new Ui([new St(.5,.5),new St(-.5,.5),new St(-.5,-.5),new St(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let o=0,l=t.length;o<l;o++){let c=t[o];a(c)}this.setAttribute("position",new ye(s,3)),this.setAttribute("uv",new ye(r,2)),this.computeVertexNormals();function a(o){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,p=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,_=e.bevelSize!==void 0?e.bevelSize:f-.1,y=e.bevelOffset!==void 0?e.bevelOffset:0,g=e.bevelSegments!==void 0?e.bevelSegments:3,m=e.extrudePath,R=e.UVGenerator!==void 0?e.UVGenerator:Rp,I,b=!1,T,A,L,v;if(m){I=m.getSpacedPoints(h),b=!0,u=!1;let ft=m.isCatmullRomCurve3?m.closed:!1;T=m.computeFrenetFrames(h,ft),A=new O,L=new O,v=new O}u||(g=0,f=0,_=0,y=0);let w=o.extractPoints(c),F=w.shape,z=w.holes;if(!mi.isClockWise(F)){F=F.reverse();for(let ft=0,ht=z.length;ft<ht;ft++){let rt=z[ft];mi.isClockWise(rt)&&(z[ft]=rt.reverse())}}function q(ft){let rt=10000000000000001e-36,_t=ft[0];for(let Ct=1;Ct<=ft.length;Ct++){let $t=Ct%ft.length,ne=ft[$t],re=ne.x-_t.x,oe=ne.y-_t.y,N=re*re+oe*oe,Ae=Math.max(Math.abs(ne.x),Math.abs(ne.y),Math.abs(_t.x),Math.abs(_t.y)),ve=rt*Ae*Ae;if(N<=ve){ft.splice($t,1),Ct--;continue}_t=ne}}q(F),z.forEach(q);let D=z.length,Z=F;for(let ft=0;ft<D;ft++){let ht=z[ft];F=F.concat(ht)}function st(ft,ht,rt){return ht||le("ExtrudeGeometry: vec does not exist"),ft.clone().addScaledVector(ht,rt)}let nt=F.length;function vt(ft,ht,rt){let _t,Ct,$t,ne=ft.x-ht.x,re=ft.y-ht.y,oe=rt.x-ft.x,N=rt.y-ft.y,Ae=ne*ne+re*re,ve=ne*N-re*oe;if(Math.abs(ve)>Number.EPSILON){let P=Math.sqrt(Ae),x=Math.sqrt(oe*oe+N*N),V=ht.x-re/P,J=ht.y+ne/P,K=rt.x-N/x,bt=rt.y+oe/x,wt=((K-V)*N-(bt-J)*oe)/(ne*N-re*oe);_t=V+ne*wt-ft.x,Ct=J+re*wt-ft.y;let at=_t*_t+Ct*Ct;if(at<=2)return new St(_t,Ct);$t=Math.sqrt(at/2)}else{let P=!1;ne>Number.EPSILON?oe>Number.EPSILON&&(P=!0):ne<-Number.EPSILON?oe<-Number.EPSILON&&(P=!0):Math.sign(re)===Math.sign(N)&&(P=!0),P?(_t=-re,Ct=ne,$t=Math.sqrt(Ae)):(_t=ne,Ct=re,$t=Math.sqrt(Ae/2))}return new St(_t/$t,Ct/$t)}let et=[];for(let ft=0,ht=Z.length,rt=ht-1,_t=ft+1;ft<ht;ft++,rt++,_t++)rt===ht&&(rt=0),_t===ht&&(_t=0),et[ft]=vt(Z[ft],Z[rt],Z[_t]);let ut=[],dt,zt=et.concat();for(let ft=0,ht=D;ft<ht;ft++){let rt=z[ft];dt=[];for(let _t=0,Ct=rt.length,$t=Ct-1,ne=_t+1;_t<Ct;_t++,$t++,ne++)$t===Ct&&($t=0),ne===Ct&&(ne=0),dt[_t]=vt(rt[_t],rt[$t],rt[ne]);ut.push(dt),zt=zt.concat(dt)}let Ut;if(g===0)Ut=mi.triangulateShape(Z,z);else{let ft=[],ht=[];for(let rt=0;rt<g;rt++){let _t=rt/g,Ct=f*Math.cos(_t*Math.PI/2),$t=_*Math.sin(_t*Math.PI/2)+y;for(let ne=0,re=Z.length;ne<re;ne++){let oe=st(Z[ne],et[ne],$t);Y(oe.x,oe.y,-Ct),_t===0&&ft.push(oe)}for(let ne=0,re=D;ne<re;ne++){let oe=z[ne];dt=ut[ne];let N=[];for(let Ae=0,ve=oe.length;Ae<ve;Ae++){let P=st(oe[Ae],dt[Ae],$t);Y(P.x,P.y,-Ct),_t===0&&N.push(P)}_t===0&&ht.push(N)}}Ut=mi.triangulateShape(ft,ht)}let we=Ut.length,de=_+y;for(let ft=0;ft<nt;ft++){let ht=u?st(F[ft],zt[ft],de):F[ft];b?(L.copy(T.normals[0]).multiplyScalar(ht.x),A.copy(T.binormals[0]).multiplyScalar(ht.y),v.copy(I[0]).add(L).add(A),Y(v.x,v.y,v.z)):Y(ht.x,ht.y,0)}for(let ft=1;ft<=h;ft++)for(let ht=0;ht<nt;ht++){let rt=u?st(F[ht],zt[ht],de):F[ht];b?(L.copy(T.normals[ft]).multiplyScalar(rt.x),A.copy(T.binormals[ft]).multiplyScalar(rt.y),v.copy(I[ft]).add(L).add(A),Y(v.x,v.y,v.z)):Y(rt.x,rt.y,p/h*ft)}for(let ft=g-1;ft>=0;ft--){let ht=ft/g,rt=f*Math.cos(ht*Math.PI/2),_t=_*Math.sin(ht*Math.PI/2)+y;for(let Ct=0,$t=Z.length;Ct<$t;Ct++){let ne=st(Z[Ct],et[Ct],_t);Y(ne.x,ne.y,p+rt)}for(let Ct=0,$t=z.length;Ct<$t;Ct++){let ne=z[Ct];dt=ut[Ct];for(let re=0,oe=ne.length;re<oe;re++){let N=st(ne[re],dt[re],_t);b?Y(N.x,N.y+I[h-1].y,I[h-1].x+rt):Y(N.x,N.y,p+rt)}}}B(),C();function B(){let ft=s.length/3;if(u){let ht=0,rt=nt*ht;for(let _t=0;_t<we;_t++){let Ct=Ut[_t];pt(Ct[2]+rt,Ct[1]+rt,Ct[0]+rt)}ht=h+g*2,rt=nt*ht;for(let _t=0;_t<we;_t++){let Ct=Ut[_t];pt(Ct[0]+rt,Ct[1]+rt,Ct[2]+rt)}}else{for(let ht=0;ht<we;ht++){let rt=Ut[ht];pt(rt[2],rt[1],rt[0])}for(let ht=0;ht<we;ht++){let rt=Ut[ht];pt(rt[0]+nt*h,rt[1]+nt*h,rt[2]+nt*h)}}n.addGroup(ft,s.length/3-ft,0)}function C(){let ft=s.length/3,ht=0;U(Z,ht),ht+=Z.length;for(let rt=0,_t=z.length;rt<_t;rt++){let Ct=z[rt];U(Ct,ht),ht+=Ct.length}n.addGroup(ft,s.length/3-ft,1)}function U(ft,ht){let rt=ft.length;for(;--rt>=0;){let _t=rt,Ct=rt-1;Ct<0&&(Ct=ft.length-1);for(let $t=0,ne=h+g*2;$t<ne;$t++){let re=nt*$t,oe=nt*($t+1),N=ht+_t+re,Ae=ht+Ct+re,ve=ht+Ct+oe,P=ht+_t+oe;ot(N,Ae,ve,P)}}}function Y(ft,ht,rt){l.push(ft),l.push(ht),l.push(rt)}function pt(ft,ht,rt){Dt(ft),Dt(ht),Dt(rt);let _t=s.length/3,Ct=R.generateTopUV(n,s,_t-3,_t-2,_t-1);Qt(Ct[0]),Qt(Ct[1]),Qt(Ct[2])}function ot(ft,ht,rt,_t){Dt(ft),Dt(ht),Dt(_t),Dt(ht),Dt(rt),Dt(_t);let Ct=s.length/3,$t=R.generateSideWallUV(n,s,Ct-6,Ct-3,Ct-2,Ct-1);Qt($t[0]),Qt($t[1]),Qt($t[3]),Qt($t[1]),Qt($t[2]),Qt($t[3])}function Dt(ft){s.push(l[ft*3+0]),s.push(l[ft*3+1]),s.push(l[ft*3+2])}function Qt(ft){r.push(ft.x),r.push(ft.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return Pp(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];n.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new Cc[s.type]().fromJSON(s)),new i(n,t.options)}},Rp={generateTopUV:function(i,t,e,n,s){let r=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[s*3],h=t[s*3+1];return[new St(r,a),new St(o,l),new St(c,h)]},generateSideWallUV:function(i,t,e,n,s,r){let a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],p=t[n*3+2],u=t[s*3],f=t[s*3+1],_=t[s*3+2],y=t[r*3],g=t[r*3+1],m=t[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new St(a,1-l),new St(c,1-p),new St(u,1-_),new St(y,1-m)]:[new St(o,1-l),new St(h,1-p),new St(f,1-_),new St(g,1-m)]}};function Pp(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var Zi=class i extends Qe{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,p=t/o,u=e/l,f=[],_=[],y=[],g=[];for(let m=0;m<h;m++){let R=m*u-a;for(let I=0;I<c;I++){let b=I*p-r;_.push(b,-R,0),y.push(0,0,1),g.push(I/o),g.push(1-m/l)}}for(let m=0;m<l;m++)for(let R=0;R<o;R++){let I=R+c*m,b=R+c*(m+1),T=R+1+c*(m+1),A=R+1+c*m;f.push(I,b,A),f.push(b,T,A)}this.setIndex(f),this.setAttribute("position",new ye(_,3)),this.setAttribute("normal",new ye(y,3)),this.setAttribute("uv",new ye(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var ur=class i extends Qe{constructor(t=new Ui([new St(0,.5),new St(-.5,-.5),new St(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],s=[],r=[],a=[],o=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(n),this.setAttribute("position",new ye(s,3)),this.setAttribute("normal",new ye(r,3)),this.setAttribute("uv",new ye(a,2));function c(h){let p=s.length/3,u=h.extractPoints(e),f=u.shape,_=u.holes;mi.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,m=_.length;g<m;g++){let R=_[g];mi.isClockWise(R)===!0&&(_[g]=R.reverse())}let y=mi.triangulateShape(f,_);for(let g=0,m=_.length;g<m;g++){let R=_[g];f=f.concat(R)}for(let g=0,m=f.length;g<m;g++){let R=f[g];s.push(R.x,R.y,0),r.push(0,0,1),a.push(R.x,R.y)}for(let g=0,m=y.length;g<m;g++){let R=y[g],I=R[0]+p,b=R[1]+p,T=R[2]+p;n.push(I,b,T),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return Ip(e,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];n.push(a)}return new i(n,t.curveSegments)}};function Ip(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){let s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}var sa=class i extends Qe{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],p=new O,u=new O,f=[],_=[],y=[],g=[];for(let m=0;m<=n;m++){let R=[],I=m/n,b=a+I*o,T=t*Math.cos(b),A=Math.sqrt(t*t-T*T),L=0;m===0&&a===0?L=.5/e:m===n&&l===Math.PI&&(L=-.5/e);for(let v=0;v<=e;v++){let w=v/e,F=s+w*r;p.x=-A*Math.cos(F),p.y=T,p.z=A*Math.sin(F),_.push(p.x,p.y,p.z),u.copy(p).normalize(),y.push(u.x,u.y,u.z),g.push(w+L,1-I),R.push(c++)}h.push(R)}for(let m=0;m<n;m++)for(let R=0;R<e;R++){let I=h[m][R+1],b=h[m][R],T=h[m+1][R],A=h[m+1][R+1];(m!==0||a>0)&&f.push(I,b,A),(m!==n-1||l<Math.PI)&&f.push(b,T,A)}this.setIndex(f),this.setAttribute("position",new ye(_,3)),this.setAttribute("normal",new ye(y,3)),this.setAttribute("uv",new ye(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function As(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(Eu(s))s.isRenderTargetTexture?(ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Eu(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Rn(i){let t={};for(let e=0;e<i.length;e++){let n=As(i[e]);for(let s in n)t[s]=n[s]}return t}function Eu(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Lp(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function lh(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Le.workingColorSpace}var Md={clone:As,merge:Rn},Dp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Np=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Wn=class extends Li{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Dp,this.fragmentShader=Np,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=As(t.uniforms),this.uniformsGroups=Lp(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new ue().setHex(s.value);break;case"v2":this.uniforms[n].value=new St().fromArray(s.value);break;case"v3":this.uniforms[n].value=new O().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Ke().fromArray(s.value);break;case"m3":this.uniforms[n].value=new ge().fromArray(s.value);break;case"m4":this.uniforms[n].value=new We().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Ro=class extends Wn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},vn=class extends Li{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new ue(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new ue(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Il,this.normalScale=new St(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Po=class extends Li{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=nd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Io=class extends Li{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Zs(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function Sc(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Ji=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Lo=class extends Ji{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Ac,endingEnd:Ac}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Tc:r=t,o=2*e-n;break;case wc:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Tc:a=t,l=2*n-e;break;case wc:a=1,l=n+s[1]-s[0];break;default:a=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,p=this._offsetNext,u=this._weightPrev,f=this._weightNext,_=(n-e)/(s-e),y=_*_,g=y*_,m=-u*g+2*u*y-u*_,R=(1+u)*g+(-1.5-2*u)*y+(-.5+u)*_+1,I=(-1-f)*g+(1.5+f)*y+.5*_,b=f*g-f*y;for(let T=0;T!==o;++T)r[T]=m*a[h+T]+R*a[c+T]+I*a[l+T]+b*a[p+T];return r}},Do=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(n-e)/(s-e),p=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*p+a[l+u]*h;return r}},No=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Uo=class extends Ji{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this.inTangents,p=this.outTangents;if(!h||!p){let _=(n-e)/(s-e),y=1-_;for(let g=0;g!==o;++g)r[g]=a[c+g]*y+a[l+g]*_;return r}let u=o*2,f=t-1;for(let _=0;_!==o;++_){let y=a[c+_],g=a[l+_],m=f*u+_*2,R=p[m],I=p[m+1],b=t*u+_*2,T=h[b],A=h[b+1],L=Fp(n,e,R,T,s);r[_]=Sd(L,y,I,A,g)}return r}};function Sd(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function Up(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function Fp(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=Sd(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let l=Up(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var Xn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Zs(e,this.TimeBufferType),this.values=Zs(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Zs(t.times,Array),values:Zs(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),Sc(t.settings)&&(n.settings={inTangents:Zs(t.settings.inTangents,Array),outTangents:Zs(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new No(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Do(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Lo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Uo(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Or:e=this.InterpolantFactoryMethodDiscrete;break;case mo:e=this.InterpolantFactoryMethodLinear;break;case io:e=this.InterpolantFactoryMethodSmooth;break;case Ec:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return ae("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Or;case this.InterpolantFactoryMethodLinear:return mo;case this.InterpolantFactoryMethodSmooth:return io;case this.InterpolantFactoryMethodBezier:return Ec}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;Sc(this.settings)&&(Au(this.settings.inTangents,t),Au(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(le("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(le("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){le("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){le("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&bf(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){le("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===io,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(s)l=!0;else{let p=o*n,u=p-n,f=p+n;for(let _=0;_!==n;++_){let y=e[p+_];if(y!==e[u+_]||y!==e[f+_]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let p=o*n,u=a*n;for(let f=0;f!==n;++f)e[u+f]=e[p+f]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,Sc(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Au(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Xn.prototype.ValueTypeName="";Xn.prototype.TimeBufferType=Float32Array;Xn.prototype.ValueBufferType=Float32Array;Xn.prototype.DefaultInterpolation=mo;var ji=class extends Xn{constructor(t,e,n){super(t,e,n)}};ji.prototype.ValueTypeName="bool";ji.prototype.ValueBufferType=Array;ji.prototype.DefaultInterpolation=Or;ji.prototype.InterpolantFactoryMethodLinear=void 0;ji.prototype.InterpolantFactoryMethodSmooth=void 0;var Fo=class extends Xn{constructor(t,e,n,s){super(t,e,n,s)}};Fo.prototype.ValueTypeName="color";var Oo=class extends Xn{constructor(t,e,n,s){super(t,e,n,s)}};Oo.prototype.ValueTypeName="number";var Bo=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-e)/(s-e),c=t*o;for(let h=c+o;c!==h;c+=4)Vn.slerpFlat(r,0,a,c-o,a,c,l);return r}},ra=class extends Xn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Bo(this.times,this.values,this.getValueSize(),t)}};ra.prototype.ValueTypeName="quaternion";ra.prototype.InterpolantFactoryMethodSmooth=void 0;var Ki=class extends Xn{constructor(t,e,n){super(t,e,n)}};Ki.prototype.ValueTypeName="string";Ki.prototype.ValueBufferType=Array;Ki.prototype.DefaultInterpolation=Or;Ki.prototype.InterpolantFactoryMethodLinear=void 0;Ki.prototype.InterpolantFactoryMethodSmooth=void 0;var zo=class extends Xn{constructor(t,e,n,s){super(t,e,n,s)}};zo.prototype.ValueTypeName="vector";var ko=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,p){return c.push(h,p),this},this.removeHandler=function(h){let p=c.indexOf(h);return p!==-1&&c.splice(p,2),this},this.getHandler=function(h){for(let p=0,u=c.length;p<u;p+=2){let f=c[p],_=c[p+1];if(f.global&&(f.lastIndex=0),f.test(h))return _}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},bd=new ko,Vo=class{constructor(t){this.manager=t!==void 0?t:bd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Vo.DEFAULT_MATERIAL_NAME="__DEFAULT";var xs=class extends dn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new ue(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},vs=class extends xs{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(dn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new ue(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},bc=new We,Tu=new O,wu=new O,aa=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new St(512,512),this.mapType=Un,this.map=null,this.mapPass=null,this.matrix=new We,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new lr,this._frameExtents=new St(1,1),this._viewportCount=1,this._viewports=[new Ke(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Tu.setFromMatrixPosition(t.matrixWorld),e.position.copy(Tu),wu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(wu),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){bc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(bc,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===nr||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(bc)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},eo=new O,no=new Vn,fi=new O,oa=class extends dn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new We,this.projectionMatrix=new We,this.projectionMatrixInverse=new We,this.coordinateSystem=si,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(eo,no,fi),fi.x===1&&fi.y===1&&fi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(eo,no,fi.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(eo,no,fi),fi.x===1&&fi.y===1&&fi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(eo,no,fi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},qi=new O,Cu=new St,Ru=new St,un=class extends oa{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=sr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Qs*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return sr*2*Math.atan(Math.tan(Qs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){qi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(qi.x,qi.y).multiplyScalar(-t/qi.z),qi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(qi.x,qi.y).multiplyScalar(-t/qi.z)}getViewSize(t,e){return this.getViewBounds(t,Cu,Ru),e.subVectors(Ru,Cu)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Qs*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Lc=class extends aa{constructor(){super(new un(90,1,.5,500)),this.isPointLightShadow=!0}},la=class extends xs{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Lc}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},dr=class extends oa{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Dc=class extends aa{constructor(){super(new dr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Qi=class extends xs{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(dn.DEFAULT_UP),this.updateMatrix(),this.target=new dn,this.shadow=new Dc}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},ys=class extends xs{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Js=-90,js=1,Go=class extends dn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new un(Js,js,t,e);s.layers=this.layers,this.add(s);let r=new un(Js,js,t,e);r.layers=this.layers,this.add(r);let a=new un(Js,js,t,e);a.layers=this.layers,this.add(a);let o=new un(Js,js,t,e);o.layers=this.layers,this.add(o);let l=new un(Js,js,t,e);l.layers=this.layers,this.add(l);let c=new un(Js,js,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===si)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===nr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,p=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;t.isWebGLRenderer===!0?g=t.state.buffers.depth.getReversed():g=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=y,t.setRenderTarget(n,5,s),g&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(p,u,f),t.xr.enabled=_,n.texture.needsPMREMUpdate=!0}},Ho=class extends un{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var ch="\\[\\]\\.:\\/",Op=new RegExp("["+ch+"]","g"),hh="[^"+ch+"]",Bp="[^"+ch.replace("\\.","")+"]",zp=/((?:WC+[\/:])*)/.source.replace("WC",hh),kp=/(WCOD+)?/.source.replace("WCOD",Bp),Vp=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",hh),Gp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",hh),Hp=new RegExp("^"+zp+kp+Vp+Gp+"$"),Wp=["material","materials","bones","map"],Nc=class{constructor(t,e,n){let s=n||Ze.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},Ze=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Op,"")}static parseTrackName(t){let e=Hp.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Wp.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=n(o.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){ae("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){le("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){le("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){le("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){le("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){le("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;le("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ze.Composite=Nc;Ze.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ze.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ze.prototype.GetterByBindingType=[Ze.prototype._getValue_direct,Ze.prototype._getValue_array,Ze.prototype._getValue_arrayElement,Ze.prototype._getValue_toArray];Ze.prototype.SetterByBindingTypeAndVersioning=[[Ze.prototype._setValue_direct,Ze.prototype._setValue_direct_setNeedsUpdate,Ze.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_array,Ze.prototype._setValue_array_setNeedsUpdate,Ze.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_arrayElement,Ze.prototype._setValue_arrayElement_setNeedsUpdate,Ze.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_fromArray,Ze.prototype._setValue_fromArray_setNeedsUpdate,Ze.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var nv=new Float32Array(1);var Pu=new We,Ms=class{constructor(t,e,n=0,s=1/0){this.ray=new $i(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new ar,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):le("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Pu.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Pu),this}intersectObject(t,e=!0,n=[]){return Uc(t,this,n,e),n.sort(Iu),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Uc(t[s],this,n,e);return n.sort(Iu),n}};function Iu(i,t){return i.distance-t.distance}function Uc(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)Uc(r[a],t,e,!0)}}var fr=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=be(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(be(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var gh=class gh{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};gh.prototype.isMatrix2=!0;var Fc=gh;var ca=class extends ri{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function uh(i,t,e,n){let s=Xp(n);switch(e){case nh:return i*t;case jo:return i*t/s.components*s.byteLength;case Ko:return i*t/s.components*s.byteLength;case as:return i*t*2/s.components*s.byteLength;case Qo:return i*t*2/s.components*s.byteLength;case ih:return i*t*3/s.components*s.byteLength;case Qn:return i*t*4/s.components*s.byteLength;case tl:return i*t*4/s.components*s.byteLength;case fa:case pa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ma:case ga:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case nl:case sl:return Math.max(i,16)*Math.max(t,8)/4;case el:case il:return Math.max(i,8)*Math.max(t,8)/2;case rl:case al:case ll:case cl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ol:case _a:case hl:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ul:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case dl:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case fl:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case pl:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case ml:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case gl:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case _l:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case xl:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case vl:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case yl:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Ml:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Sl:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case bl:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case El:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Al:case Tl:case wl:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Cl:case Rl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case xa:case Pl:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Xp(i){switch(i){case Un:case Kc:return{byteLength:1,components:1};case gr:case Qc:case ci:return{byteLength:2,components:1};case Zo:case Jo:return{byteLength:2,components:4};case li:case Yo:case Kn:return{byteLength:4,components:1};case th:case eh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function Xd(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function $p(i){let t=new WeakMap;function e(o,l){let c=o.array,h=o.usage,p=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:p}}function n(o,l,c){let h=l.array,p=l.updateRanges;if(i.bindBuffer(c,o),p.length===0)i.bufferSubData(c,0,h);else{p.sort((f,_)=>f.start-_.start);let u=0;for(let f=1;f<p.length;f++){let _=p[u],y=p[f];y.start<=_.start+_.count+1?_.count=Math.max(_.count,y.start+y.count-_.start):(++u,p[u]=y)}p.length=u+1;for(let f=0,_=p.length;f<_;f++){let y=p[f];i.bufferSubData(c,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Yp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Zp=`#ifdef USE_ALPHAHASH
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
#endif`,Jp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,jp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Kp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Qp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,tm=`#ifdef USE_AOMAP
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
#endif`,em=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,nm=`#ifdef USE_BATCHING
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
#endif`,im=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,sm=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,rm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,am=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,om=`#ifdef USE_IRIDESCENCE
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
#endif`,lm=`#ifdef USE_BUMPMAP
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
#endif`,cm=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,hm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,um=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,dm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,fm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,pm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,mm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,gm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,_m=`#define PI 3.141592653589793
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
} // validated`,xm=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,vm=`vec3 transformedNormal = objectNormal;
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
#endif`,ym=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Mm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Sm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,bm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Em="gl_FragColor = linearToOutputTexel( gl_FragColor );",Am=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Tm=`#ifdef USE_ENVMAP
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
#endif`,wm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Cm=`#ifdef USE_ENVMAP
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
#endif`,Rm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Pm=`#ifdef USE_ENVMAP
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
#endif`,Im=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Lm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Dm=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Nm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Um=`#ifdef USE_GRADIENTMAP
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
}`,Fm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Om=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Bm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,zm=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,km=`#ifdef USE_ENVMAP
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
#endif`,Vm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Gm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Hm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Wm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Xm=`PhysicalMaterial material;
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
#endif`,qm=`uniform sampler2D dfgLUT;
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
}`,$m=`
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
#endif`,Ym=`#if defined( RE_IndirectDiffuse )
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
#endif`,Zm=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Jm=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,jm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Km=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Qm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,eg=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ng=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ig=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,sg=`#if defined( USE_POINTS_UV )
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
#endif`,rg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ag=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,og=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,lg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,cg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,hg=`#ifdef USE_MORPHTARGETS
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
#endif`,ug=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,fg=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,pg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,mg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,gg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,_g=`#ifdef USE_NORMALMAP
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
#endif`,xg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,vg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,yg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Mg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Sg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,bg=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Eg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ag=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Tg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,wg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Cg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Rg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Pg=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Ig=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Lg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Dg=`float getShadowMask() {
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
}`,Ng=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ug=`#ifdef USE_SKINNING
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
#endif`,Fg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Og=`#ifdef USE_SKINNING
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
#endif`,Bg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,zg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,kg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Vg=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Gg=`#ifdef USE_TRANSMISSION
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
#endif`,Hg=`#ifdef USE_TRANSMISSION
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
#endif`,Wg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Xg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,qg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,$g=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Yg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Zg=`uniform sampler2D t2D;
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
}`,Jg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,jg=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Kg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,t0=`#include <common>
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
}`,e0=`#if DEPTH_PACKING == 3200
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
}`,n0=`#define DISTANCE
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
}`,i0=`#define DISTANCE
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
}`,s0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,r0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,a0=`uniform float scale;
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
}`,o0=`uniform vec3 diffuse;
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
}`,l0=`#include <common>
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
}`,c0=`uniform vec3 diffuse;
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
}`,h0=`#define LAMBERT
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
}`,u0=`#define LAMBERT
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
}`,d0=`#define MATCAP
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
}`,f0=`#define MATCAP
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
}`,p0=`#define NORMAL
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
}`,m0=`#define NORMAL
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
}`,g0=`#define PHONG
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
}`,_0=`#define PHONG
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
}`,x0=`#define STANDARD
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
}`,v0=`#define STANDARD
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
}`,y0=`#define TOON
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
}`,M0=`#define TOON
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
}`,S0=`uniform float size;
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
}`,b0=`uniform vec3 diffuse;
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
}`,E0=`#include <common>
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
}`,A0=`uniform vec3 color;
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
}`,T0=`uniform float rotation;
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
}`,w0=`uniform vec3 diffuse;
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
}`,Ee={alphahash_fragment:Yp,alphahash_pars_fragment:Zp,alphamap_fragment:Jp,alphamap_pars_fragment:jp,alphatest_fragment:Kp,alphatest_pars_fragment:Qp,aomap_fragment:tm,aomap_pars_fragment:em,batching_pars_vertex:nm,batching_vertex:im,begin_vertex:sm,beginnormal_vertex:rm,bsdfs:am,iridescence_fragment:om,bumpmap_pars_fragment:lm,clipping_planes_fragment:cm,clipping_planes_pars_fragment:hm,clipping_planes_pars_vertex:um,clipping_planes_vertex:dm,color_fragment:fm,color_pars_fragment:pm,color_pars_vertex:mm,color_vertex:gm,common:_m,cube_uv_reflection_fragment:xm,defaultnormal_vertex:vm,displacementmap_pars_vertex:ym,displacementmap_vertex:Mm,emissivemap_fragment:Sm,emissivemap_pars_fragment:bm,colorspace_fragment:Em,colorspace_pars_fragment:Am,envmap_fragment:Tm,envmap_common_pars_fragment:wm,envmap_pars_fragment:Cm,envmap_pars_vertex:Rm,envmap_physical_pars_fragment:km,envmap_vertex:Pm,fog_vertex:Im,fog_pars_vertex:Lm,fog_fragment:Dm,fog_pars_fragment:Nm,gradientmap_pars_fragment:Um,lightmap_pars_fragment:Fm,lights_lambert_fragment:Om,lights_lambert_pars_fragment:Bm,lights_pars_begin:zm,lights_toon_fragment:Vm,lights_toon_pars_fragment:Gm,lights_phong_fragment:Hm,lights_phong_pars_fragment:Wm,lights_physical_fragment:Xm,lights_physical_pars_fragment:qm,lights_fragment_begin:$m,lights_fragment_maps:Ym,lights_fragment_end:Zm,lightprobes_pars_fragment:Jm,logdepthbuf_fragment:jm,logdepthbuf_pars_fragment:Km,logdepthbuf_pars_vertex:Qm,logdepthbuf_vertex:tg,map_fragment:eg,map_pars_fragment:ng,map_particle_fragment:ig,map_particle_pars_fragment:sg,metalnessmap_fragment:rg,metalnessmap_pars_fragment:ag,morphinstance_vertex:og,morphcolor_vertex:lg,morphnormal_vertex:cg,morphtarget_pars_vertex:hg,morphtarget_vertex:ug,normal_fragment_begin:dg,normal_fragment_maps:fg,normal_pars_fragment:pg,normal_pars_vertex:mg,normal_vertex:gg,normalmap_pars_fragment:_g,clearcoat_normal_fragment_begin:xg,clearcoat_normal_fragment_maps:vg,clearcoat_pars_fragment:yg,iridescence_pars_fragment:Mg,opaque_fragment:Sg,packing:bg,premultiplied_alpha_fragment:Eg,project_vertex:Ag,dithering_fragment:Tg,dithering_pars_fragment:wg,roughnessmap_fragment:Cg,roughnessmap_pars_fragment:Rg,shadowmap_pars_fragment:Pg,shadowmap_pars_vertex:Ig,shadowmap_vertex:Lg,shadowmask_pars_fragment:Dg,skinbase_vertex:Ng,skinning_pars_vertex:Ug,skinning_vertex:Fg,skinnormal_vertex:Og,specularmap_fragment:Bg,specularmap_pars_fragment:zg,tonemapping_fragment:kg,tonemapping_pars_fragment:Vg,transmission_fragment:Gg,transmission_pars_fragment:Hg,uv_pars_fragment:Wg,uv_pars_vertex:Xg,uv_vertex:qg,worldpos_vertex:$g,background_vert:Yg,background_frag:Zg,backgroundCube_vert:Jg,backgroundCube_frag:jg,cube_vert:Kg,cube_frag:Qg,depth_vert:t0,depth_frag:e0,distance_vert:n0,distance_frag:i0,equirect_vert:s0,equirect_frag:r0,linedashed_vert:a0,linedashed_frag:o0,meshbasic_vert:l0,meshbasic_frag:c0,meshlambert_vert:h0,meshlambert_frag:u0,meshmatcap_vert:d0,meshmatcap_frag:f0,meshnormal_vert:p0,meshnormal_frag:m0,meshphong_vert:g0,meshphong_frag:_0,meshphysical_vert:x0,meshphysical_frag:v0,meshtoon_vert:y0,meshtoon_frag:M0,points_vert:S0,points_frag:b0,shadow_vert:E0,shadow_frag:A0,sprite_vert:T0,sprite_frag:w0},Ot={common:{diffuse:{value:new ue(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ge},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ge}},envmap:{envMap:{value:null},envMapRotation:{value:new ge},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ge},normalScale:{value:new St(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new ue(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new O},probesMax:{value:new O},probesResolution:{value:new O}},points:{diffuse:{value:new ue(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0},uvTransform:{value:new ge}},sprite:{diffuse:{value:new ue(16777215)},opacity:{value:1},center:{value:new St(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ge},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0}}},Mi={basic:{uniforms:Rn([Ot.common,Ot.specularmap,Ot.envmap,Ot.aomap,Ot.lightmap,Ot.fog]),vertexShader:Ee.meshbasic_vert,fragmentShader:Ee.meshbasic_frag},lambert:{uniforms:Rn([Ot.common,Ot.specularmap,Ot.envmap,Ot.aomap,Ot.lightmap,Ot.emissivemap,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,Ot.fog,Ot.lights,{emissive:{value:new ue(0)},envMapIntensity:{value:1}}]),vertexShader:Ee.meshlambert_vert,fragmentShader:Ee.meshlambert_frag},phong:{uniforms:Rn([Ot.common,Ot.specularmap,Ot.envmap,Ot.aomap,Ot.lightmap,Ot.emissivemap,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,Ot.fog,Ot.lights,{emissive:{value:new ue(0)},specular:{value:new ue(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ee.meshphong_vert,fragmentShader:Ee.meshphong_frag},standard:{uniforms:Rn([Ot.common,Ot.envmap,Ot.aomap,Ot.lightmap,Ot.emissivemap,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,Ot.roughnessmap,Ot.metalnessmap,Ot.fog,Ot.lights,{emissive:{value:new ue(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ee.meshphysical_vert,fragmentShader:Ee.meshphysical_frag},toon:{uniforms:Rn([Ot.common,Ot.aomap,Ot.lightmap,Ot.emissivemap,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,Ot.gradientmap,Ot.fog,Ot.lights,{emissive:{value:new ue(0)}}]),vertexShader:Ee.meshtoon_vert,fragmentShader:Ee.meshtoon_frag},matcap:{uniforms:Rn([Ot.common,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,Ot.fog,{matcap:{value:null}}]),vertexShader:Ee.meshmatcap_vert,fragmentShader:Ee.meshmatcap_frag},points:{uniforms:Rn([Ot.points,Ot.fog]),vertexShader:Ee.points_vert,fragmentShader:Ee.points_frag},dashed:{uniforms:Rn([Ot.common,Ot.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ee.linedashed_vert,fragmentShader:Ee.linedashed_frag},depth:{uniforms:Rn([Ot.common,Ot.displacementmap]),vertexShader:Ee.depth_vert,fragmentShader:Ee.depth_frag},normal:{uniforms:Rn([Ot.common,Ot.bumpmap,Ot.normalmap,Ot.displacementmap,{opacity:{value:1}}]),vertexShader:Ee.meshnormal_vert,fragmentShader:Ee.meshnormal_frag},sprite:{uniforms:Rn([Ot.sprite,Ot.fog]),vertexShader:Ee.sprite_vert,fragmentShader:Ee.sprite_frag},background:{uniforms:{uvTransform:{value:new ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ee.background_vert,fragmentShader:Ee.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ge}},vertexShader:Ee.backgroundCube_vert,fragmentShader:Ee.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ee.cube_vert,fragmentShader:Ee.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ee.equirect_vert,fragmentShader:Ee.equirect_frag},distance:{uniforms:Rn([Ot.common,Ot.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ee.distance_vert,fragmentShader:Ee.distance_frag},shadow:{uniforms:Rn([Ot.lights,Ot.fog,{color:{value:new ue(0)},opacity:{value:1}}]),vertexShader:Ee.shadow_vert,fragmentShader:Ee.shadow_frag}};Mi.physical={uniforms:Rn([Mi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ge},clearcoatNormalScale:{value:new St(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ge},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ge},sheen:{value:0},sheenColor:{value:new ue(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ge},transmissionSamplerSize:{value:new St},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ge},attenuationDistance:{value:0},attenuationColor:{value:new ue(0)},specularColor:{value:new ue(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ge},anisotropyVector:{value:new St},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ge}}]),vertexShader:Ee.meshphysical_vert,fragmentShader:Ee.meshphysical_frag};var Nl={r:0,b:0,g:0},C0=new We,qd=new ge;qd.set(-1,0,0,0,1,0,0,0,1);function R0(i,t,e,n,s,r){let a=new ue(0),o=s===!0?0:1,l,c,h=null,p=0,u=null;function f(R){let I=R.isScene===!0?R.background:null;if(I&&I.isTexture){let b=R.backgroundBlurriness>0;I=t.get(I,b)}return I}function _(R){let I=!1,b=f(R);b===null?g(a,o):b&&b.isColor&&(g(b,1),I=!0);let T=i.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||I)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function y(R,I){let b=f(I);b&&(b.isCubeTexture||b.mapping===ua)?(c===void 0&&(c=new qe(new Gn(1,1,1),new Wn({name:"BackgroundCubeMaterial",uniforms:As(Mi.backgroundCube.uniforms),vertexShader:Mi.backgroundCube.vertexShader,fragmentShader:Mi.backgroundCube.fragmentShader,side:Ln,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,A,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=b,c.material.uniforms.backgroundBlurriness.value=I.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=I.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(C0.makeRotationFromEuler(I.backgroundRotation)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(qd),c.material.toneMapped=Le.getTransfer(b.colorSpace)!==Ve,(h!==b||p!==b.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=b,p=b.version,u=i.toneMapping),c.layers.enableAll(),R.unshift(c,c.geometry,c.material,0,0,null)):b&&b.isTexture&&(l===void 0&&(l=new qe(new Zi(2,2),new Wn({name:"BackgroundMaterial",uniforms:As(Mi.background.uniforms),vertexShader:Mi.background.vertexShader,fragmentShader:Mi.background.fragmentShader,side:ns,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=b,l.material.uniforms.backgroundIntensity.value=I.backgroundIntensity,l.material.toneMapped=Le.getTransfer(b.colorSpace)!==Ve,b.matrixAutoUpdate===!0&&b.updateMatrix(),l.material.uniforms.uvTransform.value.copy(b.matrix),(h!==b||p!==b.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=b,p=b.version,u=i.toneMapping),l.layers.enableAll(),R.unshift(l,l.geometry,l.material,0,0,null))}function g(R,I){R.getRGB(Nl,lh(i)),e.buffers.color.setClear(Nl.r,Nl.g,Nl.b,I,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(R,I=1){a.set(R),o=I,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(R){o=R,g(a,o)},render:_,addToRenderList:y,dispose:m}}function P0(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(z,$,q,D,Z){let st=!1,nt=p(z,D,q,$);r!==nt&&(r=nt,c(r.object)),st=f(z,D,q,Z),st&&_(z,D,q,Z),Z!==null&&t.update(Z,i.ELEMENT_ARRAY_BUFFER),(st||a)&&(a=!1,b(z,$,q,D),Z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(Z).buffer))}function l(){return i.createVertexArray()}function c(z){return i.bindVertexArray(z)}function h(z){return i.deleteVertexArray(z)}function p(z,$,q,D){let Z=D.wireframe===!0,st=n[$.id];st===void 0&&(st={},n[$.id]=st);let nt=z.isInstancedMesh===!0?z.id:0,vt=st[nt];vt===void 0&&(vt={},st[nt]=vt);let et=vt[q.id];et===void 0&&(et={},vt[q.id]=et);let ut=et[Z];return ut===void 0&&(ut=u(l()),et[Z]=ut),ut}function u(z){let $=[],q=[],D=[];for(let Z=0;Z<e;Z++)$[Z]=0,q[Z]=0,D[Z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:$,enabledAttributes:q,attributeDivisors:D,object:z,attributes:{},index:null}}function f(z,$,q,D){let Z=r.attributes,st=$.attributes,nt=0,vt=q.getAttributes();for(let et in vt)if(vt[et].location>=0){let dt=Z[et],zt=st[et];if(zt===void 0&&(et==="instanceMatrix"&&z.instanceMatrix&&(zt=z.instanceMatrix),et==="instanceColor"&&z.instanceColor&&(zt=z.instanceColor)),dt===void 0||dt.attribute!==zt||zt&&dt.data!==zt.data)return!0;nt++}return r.attributesNum!==nt||r.index!==D}function _(z,$,q,D){let Z={},st=$.attributes,nt=0,vt=q.getAttributes();for(let et in vt)if(vt[et].location>=0){let dt=st[et];dt===void 0&&(et==="instanceMatrix"&&z.instanceMatrix&&(dt=z.instanceMatrix),et==="instanceColor"&&z.instanceColor&&(dt=z.instanceColor));let zt={};zt.attribute=dt,dt&&dt.data&&(zt.data=dt.data),Z[et]=zt,nt++}r.attributes=Z,r.attributesNum=nt,r.index=D}function y(){let z=r.newAttributes;for(let $=0,q=z.length;$<q;$++)z[$]=0}function g(z){m(z,0)}function m(z,$){let q=r.newAttributes,D=r.enabledAttributes,Z=r.attributeDivisors;q[z]=1,D[z]===0&&(i.enableVertexAttribArray(z),D[z]=1),Z[z]!==$&&(i.vertexAttribDivisor(z,$),Z[z]=$)}function R(){let z=r.newAttributes,$=r.enabledAttributes;for(let q=0,D=$.length;q<D;q++)$[q]!==z[q]&&(i.disableVertexAttribArray(q),$[q]=0)}function I(z,$,q,D,Z,st,nt){nt===!0?i.vertexAttribIPointer(z,$,q,Z,st):i.vertexAttribPointer(z,$,q,D,Z,st)}function b(z,$,q,D){y();let Z=D.attributes,st=q.getAttributes(),nt=$.defaultAttributeValues;for(let vt in st){let et=st[vt];if(et.location>=0){let ut=Z[vt];if(ut===void 0&&(vt==="instanceMatrix"&&z.instanceMatrix&&(ut=z.instanceMatrix),vt==="instanceColor"&&z.instanceColor&&(ut=z.instanceColor)),ut!==void 0){let dt=ut.normalized,zt=ut.itemSize,Ut=t.get(ut);if(Ut===void 0)continue;let we=Ut.buffer,de=Ut.type,B=Ut.bytesPerElement,C=de===i.INT||de===i.UNSIGNED_INT||ut.gpuType===Yo;if(ut.isInterleavedBufferAttribute){let U=ut.data,Y=U.stride,pt=ut.offset;if(U.isInstancedInterleavedBuffer){for(let ot=0;ot<et.locationSize;ot++)m(et.location+ot,U.meshPerAttribute);z.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=U.meshPerAttribute*U.count)}else for(let ot=0;ot<et.locationSize;ot++)g(et.location+ot);i.bindBuffer(i.ARRAY_BUFFER,we);for(let ot=0;ot<et.locationSize;ot++)I(et.location+ot,zt/et.locationSize,de,dt,Y*B,(pt+zt/et.locationSize*ot)*B,C)}else{if(ut.isInstancedBufferAttribute){for(let U=0;U<et.locationSize;U++)m(et.location+U,ut.meshPerAttribute);z.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let U=0;U<et.locationSize;U++)g(et.location+U);i.bindBuffer(i.ARRAY_BUFFER,we);for(let U=0;U<et.locationSize;U++)I(et.location+U,zt/et.locationSize,de,dt,zt*B,zt/et.locationSize*U*B,C)}}else if(nt!==void 0){let dt=nt[vt];if(dt!==void 0)switch(dt.length){case 2:i.vertexAttrib2fv(et.location,dt);break;case 3:i.vertexAttrib3fv(et.location,dt);break;case 4:i.vertexAttrib4fv(et.location,dt);break;default:i.vertexAttrib1fv(et.location,dt)}}}}R()}function T(){w();for(let z in n){let $=n[z];for(let q in $){let D=$[q];for(let Z in D){let st=D[Z];for(let nt in st)h(st[nt].object),delete st[nt];delete D[Z]}}delete n[z]}}function A(z){if(n[z.id]===void 0)return;let $=n[z.id];for(let q in $){let D=$[q];for(let Z in D){let st=D[Z];for(let nt in st)h(st[nt].object),delete st[nt];delete D[Z]}}delete n[z.id]}function L(z){for(let $ in n){let q=n[$];for(let D in q){let Z=q[D];if(Z[z.id]===void 0)continue;let st=Z[z.id];for(let nt in st)h(st[nt].object),delete st[nt];delete Z[z.id]}}}function v(z){for(let $ in n){let q=n[$],D=z.isInstancedMesh===!0?z.id:0,Z=q[D];if(Z!==void 0){for(let st in Z){let nt=Z[st];for(let vt in nt)h(nt[vt].object),delete nt[vt];delete Z[st]}delete q[D],Object.keys(q).length===0&&delete n[$]}}}function w(){F(),a=!0,r!==s&&(r=s,c(r.object))}function F(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:w,resetDefaultState:F,dispose:T,releaseStatesOfGeometry:A,releaseStatesOfObject:v,releaseStatesOfProgram:L,initAttributes:y,enableAttribute:g,disableUnusedAttributes:R}}function I0(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function L0(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let L=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(L){return!(L!==Qn&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(L){let v=L===ci&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(L!==Un&&L!==Kn&&!v&&n.convert(L)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(L){if(L==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(ae("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let p=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),R=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),I=i.getParameter(i.MAX_VARYING_VECTORS),b=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),T=i.getParameter(i.MAX_SAMPLES),A=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:p,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:_,maxTextureSize:y,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:R,maxVaryings:I,maxFragmentUniforms:b,maxSamples:T,samples:A}}function D0(i){let t=this,e=null,n=0,s=!1,r=!1,a=new zn,o=new ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(p,u){let f=p.length!==0||u||n!==0||s;return s=u,n=p.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(p,u){e=h(p,u,0)},this.setState=function(p,u,f){let _=p.clippingPlanes,y=p.clipIntersection,g=p.clipShadows,m=i.get(p);if(!s||_===null||_.length===0||r&&!g)r?h(null):c();else{let R=r?0:n,I=R*4,b=m.clippingState||null;l.value=b,b=h(_,u,I,f);for(let T=0;T!==I;++T)b[T]=e[T];m.clippingState=b,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=R}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(p,u,f,_){let y=p!==null?p.length:0,g=null;if(y!==0){if(g=l.value,_!==!0||g===null){let m=f+y*4,R=u.matrixWorldInverse;o.getNormalMatrix(R),(g===null||g.length<m)&&(g=new Float32Array(m));for(let I=0,b=f;I!==y;++I,b+=4)a.copy(p[I]).applyMatrix4(R,o),a.normal.toArray(g,b),g[b+3]=a.constant}l.value=g,l.needsUpdate=!0}return t.numPlanes=y,t.numIntersection=0,g}}var vr=4,N0=6,U0=20,F0=256,va=new dr,Ed=new ue,_h=null,xh=0,vh=0,yh=!1,O0=new O,Ts=new O,Fl=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=O0}=r;_h=this._renderer.getRenderTarget(),xh=this._renderer.getActiveCubeFace(),vh=this._renderer.getActiveMipmapLevel(),yh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=wd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Td(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(_h,xh,vh),this._renderer.xr.enabled=yh,t.scissorTest=!1,xr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===is||t.mapping===bs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),_h=this._renderer.getRenderTarget(),xh=this._renderer.getActiveCubeFace(),vh=this._renderer.getActiveMipmapLevel(),yh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:An,minFilter:An,generateMipmaps:!1,type:ci,format:Qn,colorSpace:Br,depthBuffer:!1},s=Ad(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ad(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=B0(r)),this._blurMaterial=k0(r,t,e),this._ggxMaterial=z0(r,t,e)}return s}_compileMaterial(t){let e=new qe(new Qe,t);this._renderer.compile(e,va)}_sceneToCubeUV(t,e,n,s,r){let l=new un(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],p=this._renderer,u=p.autoClear,f=p.toneMapping;p.getClearColor(Ed),p.toneMapping=oi,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(s),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new qe(new Gn,new Di({name:"PMREM.Background",side:Ln,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,g=y.material,m=!1,R=t.background;R?R.isColor&&(g.color.copy(R),t.background=null,m=!0):(g.color.copy(Ed),m=!0);for(let I=0;I<6;I++){let b=I%3;b===0?(l.up.set(0,c[I],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[I],r.y,r.z)):b===1?(l.up.set(0,0,c[I]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[I],r.z)):(l.up.set(0,c[I],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[I]));let T=this._cubeSize;xr(s,b*T,I>2?T:0,T,T),p.setRenderTarget(s),m&&p.render(y,l),p.render(t,l)}p.toneMapping=f,p.autoClear=u,t.background=R}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===is||t.mapping===bs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=wd()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Td());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let l=this._cubeSize;xr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,va)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),p=Math.sqrt(c*c-h*h),u=c*1.25,f=p*u,{_lodMax:_}=this,y=this._sizeLods[n],g=3*y*(n>_-vr?n-_+vr:0),m=4*(this._cubeSize-y);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=_-e,xr(r,g,m,3*y,2*y),s.setRenderTarget(r),s.render(o,va),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=_-n,xr(t,g,m,3*y,2*y),s.setRenderTarget(t),s.render(o,va)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],p=3*h*(s>this._lodMax-vr?s-this._lodMax+vr:0),u=4*(this._cubeSize-h);xr(e,p,u,3*h,2*h),a.setRenderTarget(e),a.render(l,va)}};function B0(i){let t=[],e=[],n=i,s=i-vr+1+N0;for(let r=0;r<s;r++){let a=Math.pow(2,n);t.push(a);let o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],p=6,u=6,f=3,_=new Float32Array(f*u*p),y=new Float32Array(f*u*p);for(let m=0;m<p;m++){let R=m%3*2/3-1,I=m>2?0:-1,b=[R,I,0,R+2/3,I,0,R+2/3,I+1,0,R,I,0,R+2/3,I+1,0,R,I+1,0];_.set(b,f*u*m);for(let T=0;T<u;T++){let A=h[T*2]*2-1,L=h[T*2+1]*2-1;m===0?Ts.set(1,L,A):m===1?Ts.set(-A,1,-L):m===2?Ts.set(-A,L,1):m===3?Ts.set(-1,L,-A):m===4?Ts.set(-A,-1,L):Ts.set(A,L,-1),Ts.toArray(y,(m*u+T)*f)}}let g=new Qe;g.setAttribute("position",new kn(_,f)),g.setAttribute("outputDirection",new kn(y,f)),e.push(new qe(g,null)),n>vr&&n--}return{lodMeshes:e,sizeLods:t}}function Ad(i,t,e){let n=new Nn(i,t,e);return n.texture.mapping=ua,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function xr(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function z0(i,t,e){return new Wn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:F0,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Bl(),fragmentShader:`

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
		`,blending:vi,depthTest:!1,depthWrite:!1})}function k0(i,t,e){return new Wn({name:"SphericalGaussianBlur",defines:{SAMPLES:U0,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Bl(),fragmentShader:`

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
		`,blending:vi,depthTest:!1,depthWrite:!1})}function Td(){return new Wn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Bl(),fragmentShader:`

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
		`,blending:vi,depthTest:!1,depthWrite:!1})}function wd(){return new Wn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Bl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:vi,depthTest:!1,depthWrite:!1})}function Bl(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Ol=class extends Nn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new qr(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Gn(5,5,5),r=new Wn({name:"CubemapFromEquirect",uniforms:As(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ln,blending:vi});r.uniforms.tEquirect.value=e;let a=new qe(s,r),o=e.minFilter;return e.minFilter===ss&&(e.minFilter=An),new Go(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}};function V0(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Xo||f===qo)if(t.has(u)){let _=t.get(u).texture;return o(_,u.mapping)}else{let _=u.image;if(_&&_.height>0){let y=new Ol(_.height);return y.fromEquirectangularTexture(i,u),t.set(u,y),u.addEventListener("dispose",c),o(y.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,_=f===Xo||f===qo,y=f===is||f===bs;if(_||y){let g=e.get(u),m=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new Fl(i)),g=_?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),g.texture;if(g!==void 0)return g.texture;{let R=u.image;return _&&R&&R.height>0||y&&R&&l(R)?(n===null&&(n=new Fl(i)),g=_?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,e.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===Xo?u.mapping=is:f===qo&&(u.mapping=bs),u}function l(u){let f=0,_=6;for(let y=0;y<_;y++)u[y]!==void 0&&f++;return f===_}function c(u){let f=u.target;f.removeEventListener("dispose",c);let _=t.get(f);_!==void 0&&(t.delete(f),_.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let _=e.get(f);_!==void 0&&(e.delete(f),_.dispose())}function p(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:p}}function G0(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&ps("WebGLRenderer: "+n+" extension not supported."),s}}}function H0(i,t,e,n){let s={},r=new WeakMap;function a(p){let u=p.target;u.index!==null&&t.remove(u.index);for(let _ in u.attributes)t.remove(u.attributes[_]);u.removeEventListener("dispose",a),delete s[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(p,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,e.memory.geometries++),u}function l(p){let u=p.attributes;for(let f in u)t.update(u[f],i.ARRAY_BUFFER)}function c(p){let u=[],f=p.index,_=p.attributes.position,y=0;if(_===void 0)return;if(f!==null){let R=f.array;y=f.version;for(let I=0,b=R.length;I<b;I+=3){let T=R[I+0],A=R[I+1],L=R[I+2];u.push(T,A,A,L,L,T)}}else{let R=_.array;y=_.version;for(let I=0,b=R.length/3-1;I<b;I+=3){let T=I+0,A=I+1,L=I+2;u.push(T,A,A,L,L,T)}}let g=new(_.count>=65535?Hr:Gr)(u,1);g.version=y;let m=r.get(p);m&&t.remove(m),r.set(p,g)}function h(p){let u=r.get(p);if(u){let f=p.index;f!==null&&u.version<f.version&&c(p)}else c(p);return r.get(p)}return{get:o,update:l,getWireframeAttribute:h}}function W0(i,t,e){let n;function s(p){n=p}let r,a;function o(p){r=p.type,a=p.bytesPerElement}function l(p,u){i.drawElements(n,u,r,p*a),e.update(u,n,1)}function c(p,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,p*a,f),e.update(u,n,f))}function h(p,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,p,0,f);let y=0;for(let g=0;g<f;g++)y+=u[g];e.update(y,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function X0(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:le("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function q0(i,t,e){let n=new WeakMap,s=new Ke;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,p=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==p){let w=function(){L.dispose(),n.delete(o),o.removeEventListener("dispose",w)};u!==void 0&&u.texture.dispose();let f=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,y=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],R=o.morphAttributes.color||[],I=0;f===!0&&(I=1),_===!0&&(I=2),y===!0&&(I=3);let b=o.attributes.position.count*I,T=1;b>t.maxTextureSize&&(T=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);let A=new Float32Array(b*T*4*p),L=new Vr(A,b,T,p);L.type=Kn,L.needsUpdate=!0;let v=I*4;for(let F=0;F<p;F++){let z=g[F],$=m[F],q=R[F],D=b*T*4*F;for(let Z=0;Z<z.count;Z++){let st=Z*v;f===!0&&(s.fromBufferAttribute(z,Z),A[D+st+0]=s.x,A[D+st+1]=s.y,A[D+st+2]=s.z,A[D+st+3]=0),_===!0&&(s.fromBufferAttribute($,Z),A[D+st+4]=s.x,A[D+st+5]=s.y,A[D+st+6]=s.z,A[D+st+7]=0),y===!0&&(s.fromBufferAttribute(q,Z),A[D+st+8]=s.x,A[D+st+9]=s.y,A[D+st+10]=s.z,A[D+st+11]=q.itemSize===4?s.w:1)}}u={count:p,texture:L,size:new St(b,T)},n.set(o,u),o.addEventListener("dispose",w)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let f=0;for(let y=0;y<c.length;y++)f+=c[y];let _=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function $0(i,t,e,n,s){let r=new WeakMap;function a(c){let h=s.render.frame,p=c.geometry,u=t.get(c,p);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var Y0={[Wc]:"LINEAR_TONE_MAPPING",[Xc]:"REINHARD_TONE_MAPPING",[qc]:"CINEON_TONE_MAPPING",[$c]:"ACES_FILMIC_TONE_MAPPING",[Zc]:"AGX_TONE_MAPPING",[Jc]:"NEUTRAL_TONE_MAPPING",[Yc]:"CUSTOM_TONE_MAPPING"};function Z0(i,t,e,n,s,r){let a=new Nn(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new Qe;c.setAttribute("position",new ye([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new ye([0,2,0,0,2,0],2));let h=new Ro({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),p=new qe(c,h),u=new dr(-1,1,1,-1,0,1),f=null,_=null,y=!1,g,m=null,R=[],I=!1;this.setSize=function(b,T){a.setSize(b,T),o!==null&&o.setSize(b,T),l!==null&&l.setSize(b,T);for(let A=0;A<R.length;A++){let L=R[A];L.setSize&&L.setSize(b,T)}},this.setEffects=function(b){R=b,I=R.length>0&&R[0].isRenderPass===!0;let T=a.width,A=a.height;R.length>0&&o===null&&(o=new Nn(T,A,{type:ci,depthBuffer:!1,stencilBuffer:!1}),l=new Nn(T,A,{type:ci,depthBuffer:!1,stencilBuffer:!1}));for(let L=0;L<R.length;L++){let v=R[L];v.setSize&&v.setSize(T,A)}},this.begin=function(b,T){if(y||b.toneMapping===oi&&R.length===0)return!1;if(m=T,T!==null){let A=T.width,L=T.height;(a.width!==A||a.height!==L)&&this.setSize(A,L)}return I===!1&&b.setRenderTarget(a),g=b.toneMapping,b.toneMapping=oi,!0},this.hasRenderPass=function(){return I},this.end=function(b,T){b.toneMapping=g,y=!0;let A=a,L=o;for(let v=0;v<R.length;v++){let w=R[v];w.enabled!==!1&&(w.render(b,L,A,T),w.needsSwap!==!1&&(A=L,L=L===o?l:o))}if(f!==b.outputColorSpace||_!==b.toneMapping){f=b.outputColorSpace,_=b.toneMapping,h.defines={},Le.getTransfer(f)===Ve&&(h.defines.SRGB_TRANSFER="");let v=Y0[_];v&&(h.defines[v]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=A.texture,b.setRenderTarget(m),b.render(p,u),m=null,y=!1},this.isCompositing=function(){return y},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var $d=new Dn,bh=new Yi(1,1),Yd=new Vr,Zd=new xo,Jd=new qr,Cd=[],Rd=[],Pd=new Float32Array(16),Id=new Float32Array(9),Ld=new Float32Array(4);function Sr(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Cd[s];if(r===void 0&&(r=new Float32Array(s),Cd[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function fn(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function pn(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function zl(i,t){let e=Rd[t];e===void 0&&(e=new Int32Array(t),Rd[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function J0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function j0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fn(e,t))return;i.uniform2fv(this.addr,t),pn(e,t)}}function K0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(fn(e,t))return;i.uniform3fv(this.addr,t),pn(e,t)}}function Q0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fn(e,t))return;i.uniform4fv(this.addr,t),pn(e,t)}}function t_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fn(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),pn(e,t)}else{if(fn(e,n))return;Ld.set(n),i.uniformMatrix2fv(this.addr,!1,Ld),pn(e,n)}}function e_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fn(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),pn(e,t)}else{if(fn(e,n))return;Id.set(n),i.uniformMatrix3fv(this.addr,!1,Id),pn(e,n)}}function n_(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(fn(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),pn(e,t)}else{if(fn(e,n))return;Pd.set(n),i.uniformMatrix4fv(this.addr,!1,Pd),pn(e,n)}}function i_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function s_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fn(e,t))return;i.uniform2iv(this.addr,t),pn(e,t)}}function r_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fn(e,t))return;i.uniform3iv(this.addr,t),pn(e,t)}}function a_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fn(e,t))return;i.uniform4iv(this.addr,t),pn(e,t)}}function o_(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function l_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(fn(e,t))return;i.uniform2uiv(this.addr,t),pn(e,t)}}function c_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(fn(e,t))return;i.uniform3uiv(this.addr,t),pn(e,t)}}function h_(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(fn(e,t))return;i.uniform4uiv(this.addr,t),pn(e,t)}}function u_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(bh.compareFunction=e.isReversedDepthBuffer()?Dl:Ll,r=bh):r=$d,e.setTexture2D(t||r,s)}function d_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Zd,s)}function f_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Jd,s)}function p_(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Yd,s)}function m_(i){switch(i){case 5126:return J0;case 35664:return j0;case 35665:return K0;case 35666:return Q0;case 35674:return t_;case 35675:return e_;case 35676:return n_;case 5124:case 35670:return i_;case 35667:case 35671:return s_;case 35668:case 35672:return r_;case 35669:case 35673:return a_;case 5125:return o_;case 36294:return l_;case 36295:return c_;case 36296:return h_;case 35678:case 36198:case 36298:case 36306:case 35682:return u_;case 35679:case 36299:case 36307:return d_;case 35680:case 36300:case 36308:case 36293:return f_;case 36289:case 36303:case 36311:case 36292:return p_}}function g_(i,t){i.uniform1fv(this.addr,t)}function __(i,t){let e=Sr(t,this.size,2);i.uniform2fv(this.addr,e)}function x_(i,t){let e=Sr(t,this.size,3);i.uniform3fv(this.addr,e)}function v_(i,t){let e=Sr(t,this.size,4);i.uniform4fv(this.addr,e)}function y_(i,t){let e=Sr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function M_(i,t){let e=Sr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function S_(i,t){let e=Sr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function b_(i,t){i.uniform1iv(this.addr,t)}function E_(i,t){i.uniform2iv(this.addr,t)}function A_(i,t){i.uniform3iv(this.addr,t)}function T_(i,t){i.uniform4iv(this.addr,t)}function w_(i,t){i.uniform1uiv(this.addr,t)}function C_(i,t){i.uniform2uiv(this.addr,t)}function R_(i,t){i.uniform3uiv(this.addr,t)}function P_(i,t){i.uniform4uiv(this.addr,t)}function I_(i,t,e){let n=this.cache,s=t.length,r=zl(e,s);fn(n,r)||(i.uniform1iv(this.addr,r),pn(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=bh:a=$d;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function L_(i,t,e){let n=this.cache,s=t.length,r=zl(e,s);fn(n,r)||(i.uniform1iv(this.addr,r),pn(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||Zd,r[a])}function D_(i,t,e){let n=this.cache,s=t.length,r=zl(e,s);fn(n,r)||(i.uniform1iv(this.addr,r),pn(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||Jd,r[a])}function N_(i,t,e){let n=this.cache,s=t.length,r=zl(e,s);fn(n,r)||(i.uniform1iv(this.addr,r),pn(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Yd,r[a])}function U_(i){switch(i){case 5126:return g_;case 35664:return __;case 35665:return x_;case 35666:return v_;case 35674:return y_;case 35675:return M_;case 35676:return S_;case 5124:case 35670:return b_;case 35667:case 35671:return E_;case 35668:case 35672:return A_;case 35669:case 35673:return T_;case 5125:return w_;case 36294:return C_;case 36295:return R_;case 36296:return P_;case 35678:case 36198:case 36298:case 36306:case 35682:return I_;case 35679:case 36299:case 36307:return L_;case 35680:case 36300:case 36308:case 36293:return D_;case 36289:case 36303:case 36311:case 36292:return N_}}var Eh=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=m_(e.type)}},Ah=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=U_(e.type)}},Th=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},Mh=/(\w+)(\])?(\[|\.)?/g;function Dd(i,t){i.seq.push(t),i.map[t.id]=t}function F_(i,t,e){let n=i.name,s=n.length;for(Mh.lastIndex=0;;){let r=Mh.exec(n),a=Mh.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Dd(e,c===void 0?new Eh(o,i,t):new Ah(o,i,t));break}else{let p=e.map[o];p===void 0&&(p=new Th(o),Dd(e,p)),e=p}}}var yr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);F_(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function Nd(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var O_=37297,B_=0;function z_(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var Ud=new ge;function k_(i){Le._getMatrix(Ud,Le.workingColorSpace,i);let t=`mat3( ${Ud.elements.map(e=>e.toFixed(4))} )`;switch(Le.getTransfer(i)){case zr:return[t,"LinearTransferOETF"];case Ve:return[t,"sRGBTransferOETF"];default:return ae("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function Fd(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+z_(i.getShaderSource(t),o)}else return r}function V_(i,t){let e=k_(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var G_={[Wc]:"Linear",[Xc]:"Reinhard",[qc]:"Cineon",[$c]:"ACESFilmic",[Zc]:"AgX",[Jc]:"Neutral",[Yc]:"Custom"};function H_(i,t){let e=G_[t];return e===void 0?(ae("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Ul=new O;function W_(){Le.getLuminanceCoefficients(Ul);let i=Ul.x.toFixed(4),t=Ul.y.toFixed(4),e=Ul.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function X_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ma).join(`
`)}function q_(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function $_(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Ma(i){return i!==""}function Od(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Bd(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Y_=/^[ \t]*#include +<([\w\d./]+)>/gm;function wh(i){return i.replace(Y_,J_)}var Z_=new Map;function J_(i,t){let e=Ee[t];if(e===void 0){let n=Z_.get(t);if(n!==void 0)e=Ee[n],ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return wh(e)}var j_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function zd(i){return i.replace(j_,K_)}function K_(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function kd(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}var Q_={[ha]:"SHADOWMAP_TYPE_PCF",[pr]:"SHADOWMAP_TYPE_VSM"};function tx(i){return Q_[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var ex={[is]:"ENVMAP_TYPE_CUBE",[bs]:"ENVMAP_TYPE_CUBE",[ua]:"ENVMAP_TYPE_CUBE_UV"};function nx(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":ex[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var ix={[bs]:"ENVMAP_MODE_REFRACTION"};function sx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":ix[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var rx={[Hc]:"ENVMAP_BLENDING_MULTIPLY",[Qu]:"ENVMAP_BLENDING_MIX",[td]:"ENVMAP_BLENDING_ADD"};function ax(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":rx[i.combine]||"ENVMAP_BLENDING_NONE"}function ox(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function lx(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=tx(e),c=nx(e),h=sx(e),p=ax(e),u=ox(e),f=X_(e),_=q_(r),y=s.createProgram(),g,m,R=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ma).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ma).join(`
`),m.length>0&&(m+=`
`)):(g=[kd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ma).join(`
`),m=[kd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+p:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==oi?"#define TONE_MAPPING":"",e.toneMapping!==oi?Ee.tonemapping_pars_fragment:"",e.toneMapping!==oi?H_("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Ee.colorspace_pars_fragment,V_("linearToOutputTexel",e.outputColorSpace),W_(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ma).join(`
`)),a=wh(a),a=Od(a,e),a=Bd(a,e),o=wh(o),o=Od(o,e),o=Bd(o,e),a=zd(a),o=zd(o),e.isRawShaderMaterial!==!0&&(R=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===sh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===sh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let I=R+g+a,b=R+m+o,T=Nd(s,s.VERTEX_SHADER,I),A=Nd(s,s.FRAGMENT_SHADER,b);s.attachShader(y,T),s.attachShader(y,A),e.index0AttributeName!==void 0?s.bindAttribLocation(y,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function L(z){if(i.debug.checkShaderErrors){let $=s.getProgramInfoLog(y)||"",q=s.getShaderInfoLog(T)||"",D=s.getShaderInfoLog(A)||"",Z=$.trim(),st=q.trim(),nt=D.trim(),vt=!0,et=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(vt=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,T,A);else{let ut=Fd(s,T,"vertex"),dt=Fd(s,A,"fragment");le("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+z.name+`
Material Type: `+z.type+`

Program Info Log: `+Z+`
`+ut+`
`+dt)}else Z!==""?ae("WebGLProgram: Program Info Log:",Z):(st===""||nt==="")&&(et=!1);et&&(z.diagnostics={runnable:vt,programLog:Z,vertexShader:{log:st,prefix:g},fragmentShader:{log:nt,prefix:m}})}s.deleteShader(T),s.deleteShader(A),v=new yr(s,y),w=$_(s,y)}let v;this.getUniforms=function(){return v===void 0&&L(this),v};let w;this.getAttributes=function(){return w===void 0&&L(this),w};let F=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return F===!1&&(F=s.getProgramParameter(y,O_)),F},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=B_++,this.cacheKey=t,this.usedTimes=1,this.program=y,this.vertexShader=T,this.fragmentShader=A,this}var cx=0,Ch=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Rh(t),e.set(t,n)),n}},Rh=class{constructor(t){this.id=cx++,this.code=t,this.usedTimes=0}};function hx(i){return i===as||i===_a||i===xa}function ux(i,t,e,n,s,r){let a=new ar,o=new Ch,l=new Set,c=[],h=new Map,p=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(v){return l.add(v),v===0?"uv":`uv${v}`}function y(v,w,F,z,$,q){let D=z.fog,Z=$.geometry,st=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?z.environment:null,nt=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,vt=t.get(v.envMap||st,nt),et=vt&&vt.mapping===ua?vt.image.height:null,ut=f[v.type];v.precision!==null&&(u=n.getMaxPrecision(v.precision),u!==v.precision&&ae("WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));let dt=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,zt=dt!==void 0?dt.length:0,Ut=0;Z.morphAttributes.position!==void 0&&(Ut=1),Z.morphAttributes.normal!==void 0&&(Ut=2),Z.morphAttributes.color!==void 0&&(Ut=3);let we,de,B,C;if(ut){let Ce=Mi[ut];we=Ce.vertexShader,de=Ce.fragmentShader}else{we=v.vertexShader,de=v.fragmentShader;let Ce=o.getVertexShaderStage(v),De=o.getFragmentShaderStage(v);o.update(v,Ce,De),B=Ce.id,C=De.id}let U=i.getRenderTarget(),Y=i.state.buffers.depth.getReversed(),pt=$.isInstancedMesh===!0,ot=$.isBatchedMesh===!0,Dt=!!v.map,Qt=!!v.matcap,ft=!!vt,ht=!!v.aoMap,rt=!!v.lightMap,_t=!!v.bumpMap&&v.wireframe===!1,Ct=!!v.normalMap,$t=!!v.displacementMap,ne=!!v.emissiveMap,re=!!v.metalnessMap,oe=!!v.roughnessMap,N=v.anisotropy>0,Ae=v.clearcoat>0,ve=v.dispersion>0,P=v.retroreflectivity>0,x=v.iridescence>0,V=v.sheen>0,J=v.transmission>0,K=N&&!!v.anisotropyMap,bt=Ae&&!!v.clearcoatMap,wt=Ae&&!!v.clearcoatNormalMap,at=Ae&&!!v.clearcoatRoughnessMap,lt=x&&!!v.iridescenceMap,xt=x&&!!v.iridescenceThicknessMap,jt=V&&!!v.sheenColorMap,Et=V&&!!v.sheenRoughnessMap,Rt=!!v.specularMap,Zt=!!v.specularColorMap,Xt=!!v.specularIntensityMap,fe=J&&!!v.transmissionMap,G=J&&!!v.thicknessMap,Pt=!!v.gradientMap,ct=!!v.alphaMap,It=v.alphaTest>0,Lt=!!v.alphaHash,gt=!!v.extensions,te=oi;v.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(te=i.toneMapping);let Yt={shaderID:ut,shaderType:v.type,shaderName:v.name,vertexShader:we,fragmentShader:de,defines:v.defines,customVertexShaderID:B,customFragmentShaderID:C,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:ot,batchingColor:ot&&$._colorsTexture!==null,instancing:pt,instancingColor:pt&&$.instanceColor!==null,instancingMorph:pt&&$.morphTexture!==null,outputColorSpace:U===null?i.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:Le.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Dt,matcap:Qt,envMap:ft,envMapMode:ft&&vt.mapping,envMapCubeUVHeight:et,aoMap:ht,lightMap:rt,bumpMap:_t,normalMap:Ct,displacementMap:$t,emissiveMap:ne,normalMapObjectSpace:Ct&&v.normalMapType===id,normalMapTangentSpace:Ct&&v.normalMapType===Il,packedNormalMap:Ct&&v.normalMapType===Il&&hx(v.normalMap.format),metalnessMap:re,roughnessMap:oe,anisotropy:N,anisotropyMap:K,clearcoat:Ae,clearcoatMap:bt,clearcoatNormalMap:wt,clearcoatRoughnessMap:at,dispersion:ve,retroreflection:P,iridescence:x,iridescenceMap:lt,iridescenceThicknessMap:xt,sheen:V,sheenColorMap:jt,sheenRoughnessMap:Et,specularMap:Rt,specularColorMap:Zt,specularIntensityMap:Xt,transmission:J,transmissionMap:fe,thicknessMap:G,gradientMap:Pt,opaque:v.transparent===!1&&v.blending===mr&&v.alphaToCoverage===!1,alphaMap:ct,alphaTest:It,alphaHash:Lt,combine:v.combine,mapUv:Dt&&_(v.map.channel),aoMapUv:ht&&_(v.aoMap.channel),lightMapUv:rt&&_(v.lightMap.channel),bumpMapUv:_t&&_(v.bumpMap.channel),normalMapUv:Ct&&_(v.normalMap.channel),displacementMapUv:$t&&_(v.displacementMap.channel),emissiveMapUv:ne&&_(v.emissiveMap.channel),metalnessMapUv:re&&_(v.metalnessMap.channel),roughnessMapUv:oe&&_(v.roughnessMap.channel),anisotropyMapUv:K&&_(v.anisotropyMap.channel),clearcoatMapUv:bt&&_(v.clearcoatMap.channel),clearcoatNormalMapUv:wt&&_(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:at&&_(v.clearcoatRoughnessMap.channel),iridescenceMapUv:lt&&_(v.iridescenceMap.channel),iridescenceThicknessMapUv:xt&&_(v.iridescenceThicknessMap.channel),sheenColorMapUv:jt&&_(v.sheenColorMap.channel),sheenRoughnessMapUv:Et&&_(v.sheenRoughnessMap.channel),specularMapUv:Rt&&_(v.specularMap.channel),specularColorMapUv:Zt&&_(v.specularColorMap.channel),specularIntensityMapUv:Xt&&_(v.specularIntensityMap.channel),transmissionMapUv:fe&&_(v.transmissionMap.channel),thicknessMapUv:G&&_(v.thicknessMap.channel),alphaMapUv:ct&&_(v.alphaMap.channel),vertexTangents:!!Z.attributes.tangent&&(Ct||N),vertexNormals:!!Z.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,pointsUvs:$.isPoints===!0&&!!Z.attributes.uv&&(Dt||ct),fog:!!D,useFog:v.fog===!0,fogExp2:!!D&&D.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||Z.attributes.normal===void 0&&Ct===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:Y,skinning:$.isSkinnedMesh===!0,hasPositionAttribute:Z.attributes.position!==void 0,morphTargets:Z.morphAttributes.position!==void 0,morphNormals:Z.morphAttributes.normal!==void 0,morphColors:Z.morphAttributes.color!==void 0,morphTargetsCount:zt,morphTextureStride:Ut,numSunLights:w.sun.length,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numSunLightShadows:w.sunShadowMap.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numLightProbeGrids:q.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&F.length>0,shadowMapType:i.shadowMap.type,toneMapping:te,decodeVideoTexture:Dt&&v.map.isVideoTexture===!0&&Le.getTransfer(v.map.colorSpace)===Ve,decodeVideoTextureEmissive:ne&&v.emissiveMap.isVideoTexture===!0&&Le.getTransfer(v.emissiveMap.colorSpace)===Ve,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===yn,flipSided:v.side===Ln,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:gt&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(gt&&v.extensions.multiDraw===!0||ot)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Yt.vertexUv1s=l.has(1),Yt.vertexUv2s=l.has(2),Yt.vertexUv3s=l.has(3),l.clear(),Yt}function g(v){let w=[];if(v.shaderID?w.push(v.shaderID):(w.push(v.customVertexShaderID),w.push(v.customFragmentShaderID)),v.defines!==void 0)for(let F in v.defines)w.push(F),w.push(v.defines[F]);return v.isRawShaderMaterial===!1&&(m(w,v),R(w,v),w.push(i.outputColorSpace)),w.push(v.customProgramCacheKey),w.join()}function m(v,w){v.push(w.precision),v.push(w.outputColorSpace),v.push(w.envMapMode),v.push(w.envMapCubeUVHeight),v.push(w.mapUv),v.push(w.alphaMapUv),v.push(w.lightMapUv),v.push(w.aoMapUv),v.push(w.bumpMapUv),v.push(w.normalMapUv),v.push(w.displacementMapUv),v.push(w.emissiveMapUv),v.push(w.metalnessMapUv),v.push(w.roughnessMapUv),v.push(w.anisotropyMapUv),v.push(w.clearcoatMapUv),v.push(w.clearcoatNormalMapUv),v.push(w.clearcoatRoughnessMapUv),v.push(w.iridescenceMapUv),v.push(w.iridescenceThicknessMapUv),v.push(w.sheenColorMapUv),v.push(w.sheenRoughnessMapUv),v.push(w.specularMapUv),v.push(w.specularColorMapUv),v.push(w.specularIntensityMapUv),v.push(w.transmissionMapUv),v.push(w.thicknessMapUv),v.push(w.combine),v.push(w.fogExp2),v.push(w.sizeAttenuation),v.push(w.morphTargetsCount),v.push(w.morphAttributeCount),v.push(w.numSunLights),v.push(w.numDirLights),v.push(w.numPointLights),v.push(w.numSpotLights),v.push(w.numSpotLightMaps),v.push(w.numHemiLights),v.push(w.numRectAreaLights),v.push(w.numSunLightShadows),v.push(w.numDirLightShadows),v.push(w.numPointLightShadows),v.push(w.numSpotLightShadows),v.push(w.numSpotLightShadowsWithMaps),v.push(w.numLightProbes),v.push(w.shadowMapType),v.push(w.toneMapping),v.push(w.numClippingPlanes),v.push(w.numClipIntersection),v.push(w.depthPacking)}function R(v,w){a.disableAll(),w.instancing&&a.enable(0),w.instancingColor&&a.enable(1),w.instancingMorph&&a.enable(2),w.matcap&&a.enable(3),w.envMap&&a.enable(4),w.normalMapObjectSpace&&a.enable(5),w.normalMapTangentSpace&&a.enable(6),w.clearcoat&&a.enable(7),w.iridescence&&a.enable(8),w.alphaTest&&a.enable(9),w.vertexColors&&a.enable(10),w.vertexAlphas&&a.enable(11),w.vertexUv1s&&a.enable(12),w.vertexUv2s&&a.enable(13),w.vertexUv3s&&a.enable(14),w.vertexTangents&&a.enable(15),w.anisotropy&&a.enable(16),w.alphaHash&&a.enable(17),w.batching&&a.enable(18),w.dispersion&&a.enable(19),w.retroreflection&&a.enable(24),w.batchingColor&&a.enable(20),w.gradientMap&&a.enable(21),w.packedNormalMap&&a.enable(22),w.vertexNormals&&a.enable(23),v.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),w.numLightProbeGrids>0&&a.enable(22),w.hasPositionAttribute&&a.enable(23),v.push(a.mask)}function I(v){let w=f[v.type],F;if(w){let z=Mi[w];F=Md.clone(z.uniforms)}else F=v.uniforms;return F}function b(v,w){let F=h.get(w);return F!==void 0?++F.usedTimes:(F=new lx(i,w,v,s),c.push(F),h.set(w,F)),F}function T(v){if(--v.usedTimes===0){let w=c.indexOf(v);c[w]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function A(v){o.remove(v)}function L(){o.dispose()}return{getParameters:y,getProgramCacheKey:g,getUniforms:I,acquireProgram:b,releaseProgram:T,releaseShaderCache:A,programs:c,dispose:L}}function dx(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function fx(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function Vd(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Gd(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,_,y,g,m){let R=i[t];return R===void 0?(R={id:u.id,object:u,geometry:f,material:_,materialVariant:a(u),groupOrder:y,renderOrder:u.renderOrder,z:g,group:m},i[t]=R):(R.id=u.id,R.object=u,R.geometry=f,R.material=_,R.materialVariant=a(u),R.groupOrder=y,R.renderOrder=u.renderOrder,R.z=g,R.group=m),t++,R}function l(u,f,_,y,g,m,R){R.reversedDepth===!0&&(g=-g);let I=o(u,f,_,y,g,m);_.transmission>0?n.push(I):_.transparent===!0?s.push(I):e.push(I)}function c(u,f,_,y,g,m){let R=o(u,f,_,y,g,m);_.transmission>0?n.unshift(R):_.transparent===!0?s.unshift(R):e.unshift(R)}function h(u,f){e.length>1&&e.sort(u||fx),n.length>1&&n.sort(f||Vd),s.length>1&&s.sort(f||Vd)}function p(){for(let u=t,f=i.length;u<f;u++){let _=i[u];if(_.id===null)break;_.id=null,_.object=null,_.geometry=null,_.material=null,_.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:p,sort:h}}function px(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new Gd,i.set(n,[a])):s>=r.length?(a=new Gd,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function mx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new O,color:new ue};break;case"SpotLight":e={position:new O,direction:new O,color:new ue,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new O,color:new ue,distance:0,decay:0};break;case"HemisphereLight":e={direction:new O,skyColor:new ue,groundColor:new ue};break;case"RectAreaLight":e={color:new ue,position:new O,halfWidth:new O,halfHeight:new O};break}return i[t.id]=e,e}}}function gx(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new St};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new St};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new St,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var _x=0;function xx(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function vx(i){let t=new mx,e=gx(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new O);let s=new O,r=new We,a=new We;function o(c){let h=0,p=0,u=0;for(let $=0;$<9;$++)n.probe[$].set(0,0,0);let f=0,_=0,y=0,g=0,m=0,R=0,I=0,b=0,T=0,A=0,L=0,v=0,w=0,F=0;c.sort(xx);for(let $=0,q=c.length;$<q;$++){let D=c[$],Z=D.color,st=D.intensity,nt=D.distance,vt=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===as?vt=D.shadow.map.texture:vt=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)h+=Z.r*st,p+=Z.g*st,u+=Z.b*st;else if(D.isLightProbe){for(let et=0;et<9;et++)n.probe[et].addScaledVector(D.sh.coefficients[et],st);F++}else if(D.isSunLight){let et=t.get(D);if(et.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let ut=D.shadow,dt=e.get(D);dt.shadowIntensity=ut.intensity,dt.shadowBias=ut.bias,dt.shadowNormalBias=ut.normalBias,dt.shadowRadius=ut.radius,dt.shadowMapSize.copy(ut.mapSize).multiply(ut.getFrameExtents()),n.sunShadow[_]=dt,n.sunShadowMap[_]=vt;let zt=ut.getViewportCount();for(let Ut=0;Ut<zt;Ut++)n.sunShadowMatrix[y+Ut]=ut.getMatrix(Ut),n.sunShadowCascade[y+Ut]=ut._cascadeData[Ut];y+=zt,_++}n.sun[f]=et,f++}else if(D.isDirectionalLight){let et=t.get(D);if(et.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let ut=D.shadow,dt=e.get(D);dt.shadowIntensity=ut.intensity,dt.shadowBias=ut.bias,dt.shadowNormalBias=ut.normalBias,dt.shadowRadius=ut.radius,dt.shadowMapSize=ut.mapSize,n.directionalShadow[g]=dt,n.directionalShadowMap[g]=vt,n.directionalShadowMatrix[g]=D.shadow.matrix,T++}n.directional[g]=et,g++}else if(D.isSpotLight){let et=t.get(D);et.position.setFromMatrixPosition(D.matrixWorld),et.color.copy(Z).multiplyScalar(st),et.distance=nt,et.coneCos=Math.cos(D.angle),et.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),et.decay=D.decay,n.spot[R]=et;let ut=D.shadow;if(D.map&&(n.spotLightMap[v]=D.map,v++,ut.updateMatrices(D),D.castShadow&&w++),n.spotLightMatrix[R]=ut.matrix,D.castShadow){let dt=e.get(D);dt.shadowIntensity=ut.intensity,dt.shadowBias=ut.bias,dt.shadowNormalBias=ut.normalBias,dt.shadowRadius=ut.radius,dt.shadowMapSize=ut.mapSize,n.spotShadow[R]=dt,n.spotShadowMap[R]=vt,L++}R++}else if(D.isRectAreaLight){let et=t.get(D);et.color.copy(Z).multiplyScalar(st),et.halfWidth.set(D.width*.5,0,0),et.halfHeight.set(0,D.height*.5,0),n.rectArea[I]=et,I++}else if(D.isPointLight){let et=t.get(D);if(et.color.copy(D.color).multiplyScalar(D.intensity),et.distance=D.distance,et.decay=D.decay,D.castShadow){let ut=D.shadow,dt=e.get(D);dt.shadowIntensity=ut.intensity,dt.shadowBias=ut.bias,dt.shadowNormalBias=ut.normalBias,dt.shadowRadius=ut.radius,dt.shadowMapSize=ut.mapSize,dt.shadowCameraNear=ut.camera.near,dt.shadowCameraFar=ut.camera.far,n.pointShadow[m]=dt,n.pointShadowMap[m]=vt,n.pointShadowMatrix[m]=D.shadow.matrix,A++}n.point[m]=et,m++}else if(D.isHemisphereLight){let et=t.get(D);et.skyColor.copy(D.color).multiplyScalar(st),et.groundColor.copy(D.groundColor).multiplyScalar(st),n.hemi[b]=et,b++}}I>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ot.LTC_FLOAT_1,n.rectAreaLTC2=Ot.LTC_FLOAT_2):(n.rectAreaLTC1=Ot.LTC_HALF_1,n.rectAreaLTC2=Ot.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=p,n.ambient[2]=u;let z=n.hash;(z.sunLength!==f||z.directionalLength!==g||z.pointLength!==m||z.spotLength!==R||z.rectAreaLength!==I||z.hemiLength!==b||z.numSunShadows!==_||z.numDirectionalShadows!==T||z.numPointShadows!==A||z.numSpotShadows!==L||z.numSpotMaps!==v||z.numLightProbes!==F)&&(n.sun.length=f,n.directional.length=g,n.spot.length=R,n.rectArea.length=I,n.point.length=m,n.hemi.length=b,n.sunShadow.length=_,n.sunShadowMap.length=_,n.sunShadowMatrix.length=y,n.sunShadowCascade.length=y,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.directionalShadowMatrix.length=T,n.pointShadow.length=A,n.pointShadowMap.length=A,n.pointShadowMatrix.length=A,n.spotShadow.length=L,n.spotShadowMap.length=L,n.spotLightMatrix.length=L+v-w,n.spotLightMap.length=v,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=F,z.sunLength=f,z.directionalLength=g,z.pointLength=m,z.spotLength=R,z.rectAreaLength=I,z.hemiLength=b,z.numSunShadows=_,z.numDirectionalShadows=T,z.numPointShadows=A,z.numSpotShadows=L,z.numSpotMaps=v,z.numLightProbes=F,n.version=_x++)}function l(c,h){let p=0,u=0,f=0,_=0,y=0,g=0,m=h.matrixWorldInverse;for(let R=0,I=c.length;R<I;R++){let b=c[R];if(b.isSunLight){let T=n.sun[p];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),p++}else if(b.isDirectionalLight){let T=n.directional[u];T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),u++}else if(b.isSpotLight){let T=n.spot[_];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),_++}else if(b.isRectAreaLight){let T=n.rectArea[y];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),a.identity(),r.copy(b.matrixWorld),r.premultiply(m),a.extractRotation(r),T.halfWidth.set(b.width*.5,0,0),T.halfHeight.set(0,b.height*.5,0),T.halfWidth.applyMatrix4(a),T.halfHeight.applyMatrix4(a),y++}else if(b.isPointLight){let T=n.point[f];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),f++}else if(b.isHemisphereLight){let T=n.hemi[g];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),g++}}}return{setup:o,setupView:l,state:n}}function Hd(i){let t=new vx(i),e=[],n=[],s=[];function r(u){p.camera=u,e.length=0,n.length=0,s.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let p={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:p,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function yx(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new Hd(i),t.set(s,[o])):r>=a.length?(o=new Hd(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var Mx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Sx=`uniform sampler2D shadow_pass;
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
}`,bx=[new O(1,0,0),new O(-1,0,0),new O(0,1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1)],Ex=[new O(0,-1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1),new O(0,-1,0),new O(0,-1,0)],Wd=new We,ya=new O,Sh=new O;function Ax(i,t,e){let n=new lr,s=new St,r=new St,a=new Ke,o=new Po,l=new Io,c={},h=e.maxTextureSize,p={[ns]:Ln,[Ln]:ns,[yn]:yn},u=new Wn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new St},radius:{value:4}},vertexShader:Mx,fragmentShader:Sx}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let _=new Qe;_.setAttribute("position",new kn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new qe(_,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ha;let m=this.type;this.render=function(A,L,v){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||A.length===0)return;this.type===Nu&&(ae("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=ha);let w=i.getRenderTarget(),F=i.getActiveCubeFace(),z=i.getActiveMipmapLevel(),$=i.state;$.setBlending(vi),$.buffers.depth.getReversed()===!0?$.buffers.color.setClear(0,0,0,0):$.buffers.color.setClear(1,1,1,1),$.buffers.depth.setTest(!0),$.setScissorTest(!1);let q=m!==this.type;q&&L.traverse(function(D){D.material&&(Array.isArray(D.material)?D.material.forEach(Z=>Z.needsUpdate=!0):D.material.needsUpdate=!0)});for(let D=0,Z=A.length;D<Z;D++){let st=A[D],nt=st.shadow;if(nt===void 0){ae("WebGLShadowMap:",st,"has no shadow.");continue}if(nt.autoUpdate===!1&&nt.needsUpdate===!1)continue;s.copy(nt.mapSize);let vt=nt.getFrameExtents();s.multiply(vt),r.copy(nt.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/vt.x),s.x=r.x*vt.x,nt.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/vt.y),s.y=r.y*vt.y,nt.mapSize.y=r.y));let et=i.state.buffers.depth.getReversed();if(nt.camera._reversedDepth=et,nt.map===null||q===!0){if(nt.map!==null&&(nt.map.depthTexture!==null&&(nt.map.depthTexture.dispose(),nt.map.depthTexture=null),nt.map.dispose()),this.type===pr){if(st.isPointLight){ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}nt.map=new Nn(s.x,s.y,{format:as,type:ci,minFilter:An,magFilter:An,generateMipmaps:!1}),nt.map.texture.name=st.name+".shadowMap",nt.map.depthTexture=new Yi(s.x,s.y,Kn),nt.map.depthTexture.name=st.name+".shadowMapDepth",nt.map.depthTexture.format=gi,nt.map.depthTexture.compareFunction=null,nt.map.depthTexture.minFilter=xn,nt.map.depthTexture.magFilter=xn}else st.isPointLight?(nt.map=new Ol(s.x),nt.map.depthTexture=new So(s.x,li)):(nt.map=new Nn(s.x,s.y),nt.map.depthTexture=new Yi(s.x,s.y,li)),nt.map.depthTexture.name=st.name+".shadowMap",nt.map.depthTexture.format=gi,this.type===ha?(nt.map.depthTexture.compareFunction=et?Dl:Ll,nt.map.depthTexture.minFilter=An,nt.map.depthTexture.magFilter=An):(nt.map.depthTexture.compareFunction=null,nt.map.depthTexture.minFilter=xn,nt.map.depthTexture.magFilter=xn);nt.camera.updateProjectionMatrix()}nt.map.isWebGLCubeRenderTarget!==!0&&(nt.map.width!==s.x||nt.map.height!==s.y)&&nt.map.setSize(s.x,s.y);let ut=nt.map.isWebGLCubeRenderTarget?6:nt.getViewportCount();st.isPointLight!==!0&&nt.updateMatrices(st,v);for(let dt=0;dt<ut;dt++){let zt=nt.getCamera(dt);if(st.isPointLight){let Ut=nt.camera,we=nt.matrix,de=st.distance||Ut.far;de!==Ut.far&&(Ut.far=de,Ut.updateProjectionMatrix()),ya.setFromMatrixPosition(st.matrixWorld),Ut.position.copy(ya),Sh.copy(Ut.position),Sh.add(bx[dt]),Ut.up.copy(Ex[dt]),Ut.lookAt(Sh),Ut.updateMatrixWorld(),we.makeTranslation(-ya.x,-ya.y,-ya.z),Wd.multiplyMatrices(Ut.projectionMatrix,Ut.matrixWorldInverse),nt._frustum.setFromProjectionMatrix(Wd,Ut.coordinateSystem,Ut.reversedDepth)}if(nt.map.isWebGLCubeRenderTarget)i.setRenderTarget(nt.map,dt),i.clear();else{dt===0&&(i.setRenderTarget(nt.map),i.clear());let Ut=nt.getViewport(dt);a.set(r.x*Ut.x,r.y*Ut.y,r.x*Ut.z,r.y*Ut.w),$.viewport(a)}n=nt.getFrustum(dt),b(L,v,zt,st,this.type)}nt.isPointLightShadow!==!0&&this.type===pr&&R(nt,v),nt.needsUpdate=!1}m=this.type,g.needsUpdate=!1,i.setRenderTarget(w,F,z)};function R(A,L){let v=t.update(y);u.defines.VSM_SAMPLES!==A.blurSamples&&(u.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null?A.mapPass=new Nn(s.x,s.y,{format:as,type:ci}):(A.mapPass.width!==A.map.width||A.mapPass.height!==A.map.height)&&A.mapPass.setSize(A.map.width,A.map.height),u.uniforms.shadow_pass.value=A.map.depthTexture,u.uniforms.resolution.value.set(A.map.width,A.map.height),u.uniforms.radius.value=A.radius,i.setRenderTarget(A.mapPass),i.clear(),i.renderBufferDirect(L,null,v,u,y,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value.set(A.map.width,A.map.height),f.uniforms.radius.value=A.radius,i.setRenderTarget(A.map),i.clear(),i.renderBufferDirect(L,null,v,f,y,null)}function I(A,L,v,w){let F=null,z=v.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(z!==void 0)F=z;else if(F=v.isPointLight===!0?l:o,i.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0||L.alphaToCoverage===!0){let $=F.uuid,q=L.uuid,D=c[$];D===void 0&&(D={},c[$]=D);let Z=D[q];Z===void 0&&(Z=F.clone(),D[q]=Z,L.addEventListener("dispose",T)),F=Z}if(F.visible=L.visible,F.wireframe=L.wireframe,w===pr?F.side=L.shadowSide!==null?L.shadowSide:L.side:F.side=L.shadowSide!==null?L.shadowSide:p[L.side],F.alphaMap=L.alphaMap,F.alphaTest=L.alphaToCoverage===!0?.5:L.alphaTest,F.map=L.map,F.clipShadows=L.clipShadows,F.clippingPlanes=L.clippingPlanes,F.clipIntersection=L.clipIntersection,F.displacementMap=L.displacementMap,F.displacementScale=L.displacementScale,F.displacementBias=L.displacementBias,F.wireframeLinewidth=L.wireframeLinewidth,F.linewidth=L.linewidth,v.isPointLight===!0&&F.isMeshDistanceMaterial===!0){let $=i.properties.get(F);$.light=v}return F}function b(A,L,v,w,F){if(A.visible===!1)return;if(A.layers.test(L.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&F===pr)&&(!A.frustumCulled||A.intersectsFrustum(n))){A.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,A.matrixWorld);let q=t.update(A),D=A.material;if(Array.isArray(D)){let Z=q.groups;for(let st=0,nt=Z.length;st<nt;st++){let vt=Z[st],et=D[vt.materialIndex];if(et&&et.visible){let ut=I(A,et,w,F);A.onBeforeShadow(i,A,L,v,q,ut,vt),i.renderBufferDirect(v,null,q,ut,A,vt),A.onAfterShadow(i,A,L,v,q,ut,vt)}}}else if(D.visible){let Z=I(A,D,w,F);A.onBeforeShadow(i,A,L,v,q,Z,null),i.renderBufferDirect(v,null,q,Z,A,null),A.onAfterShadow(i,A,L,v,q,Z,null)}}let $=A.children;for(let q=0,D=$.length;q<D;q++)b($[q],L,v,w,F)}function T(A){A.target.removeEventListener("dispose",T);for(let v in c){let w=c[v],F=A.target.uuid;F in w&&(w[F].dispose(),delete w[F])}}}function Tx(i,t){function e(){let G=!1,Pt=new Ke,ct=null,It=new Ke(0,0,0,0);return{setMask:function(Lt){ct!==Lt&&!G&&(i.colorMask(Lt,Lt,Lt,Lt),ct=Lt)},setLocked:function(Lt){G=Lt},setClear:function(Lt,gt,te,Yt,Ce){Ce===!0&&(Lt*=Yt,gt*=Yt,te*=Yt),Pt.set(Lt,gt,te,Yt),It.equals(Pt)===!1&&(i.clearColor(Lt,gt,te,Yt),It.copy(Pt))},reset:function(){G=!1,ct=null,It.set(-1,0,0,0)}}}function n(){let G=!1,Pt=!1,ct=null,It=null,Lt=null;return{setReversed:function(gt){if(Pt!==gt){let te=t.get("EXT_clip_control");gt?te.clipControlEXT(te.LOWER_LEFT_EXT,te.ZERO_TO_ONE_EXT):te.clipControlEXT(te.LOWER_LEFT_EXT,te.NEGATIVE_ONE_TO_ONE_EXT),Pt=gt;let Yt=Lt;Lt=null,this.setClear(Yt)}},getReversed:function(){return Pt},setTest:function(gt){gt?U(i.DEPTH_TEST):Y(i.DEPTH_TEST)},setMask:function(gt){ct!==gt&&!G&&(i.depthMask(gt),ct=gt)},setFunc:function(gt){if(Pt&&(gt=md[gt]),It!==gt){switch(gt){case ro:i.depthFunc(i.NEVER);break;case ao:i.depthFunc(i.ALWAYS);break;case oo:i.depthFunc(i.LESS);break;case er:i.depthFunc(i.LEQUAL);break;case lo:i.depthFunc(i.EQUAL);break;case co:i.depthFunc(i.GEQUAL);break;case ho:i.depthFunc(i.GREATER);break;case uo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}It=gt}},setLocked:function(gt){G=gt},setClear:function(gt){Lt!==gt&&(Lt=gt,Pt&&(gt=1-gt),i.clearDepth(gt))},reset:function(){G=!1,ct=null,It=null,Lt=null,Pt=!1}}}function s(){let G=!1,Pt=null,ct=null,It=null,Lt=null,gt=null,te=null,Yt=null,Ce=null;return{setTest:function(De){G||(De?U(i.STENCIL_TEST):Y(i.STENCIL_TEST))},setMask:function(De){Pt!==De&&!G&&(i.stencilMask(De),Pt=De)},setFunc:function(De,_e,ce){(ct!==De||It!==_e||Lt!==ce)&&(i.stencilFunc(De,_e,ce),ct=De,It=_e,Lt=ce)},setOp:function(De,_e,ce){(gt!==De||te!==_e||Yt!==ce)&&(i.stencilOp(De,_e,ce),gt=De,te=_e,Yt=ce)},setLocked:function(De){G=De},setClear:function(De){Ce!==De&&(i.clearStencil(De),Ce=De)},reset:function(){G=!1,Pt=null,ct=null,It=null,Lt=null,gt=null,te=null,Yt=null,Ce=null}}}let r=new e,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},p={},u={},f=new WeakMap,_=[],y=null,g=!1,m=null,R=null,I=null,b=null,T=null,A=null,L=null,v=new ue(0,0,0),w=0,F=!1,z=null,$=null,q=null,D=null,Z=null,st=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),nt=!1,vt=0,et=i.getParameter(i.VERSION);et.indexOf("WebGL")!==-1?(vt=parseFloat(/^WebGL (\d)/.exec(et)[1]),nt=vt>=1):et.indexOf("OpenGL ES")!==-1&&(vt=parseFloat(/^OpenGL ES (\d)/.exec(et)[1]),nt=vt>=2);let ut=null,dt={},zt=i.getParameter(i.SCISSOR_BOX),Ut=i.getParameter(i.VIEWPORT),we=new Ke().fromArray(zt),de=new Ke().fromArray(Ut);function B(G,Pt,ct,It){let Lt=new Uint8Array(4),gt=i.createTexture();i.bindTexture(G,gt),i.texParameteri(G,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(G,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let te=0;te<ct;te++)G===i.TEXTURE_3D||G===i.TEXTURE_2D_ARRAY?i.texImage3D(Pt,0,i.RGBA,1,1,It,0,i.RGBA,i.UNSIGNED_BYTE,Lt):i.texImage2D(Pt+te,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Lt);return gt}let C={};C[i.TEXTURE_2D]=B(i.TEXTURE_2D,i.TEXTURE_2D,1),C[i.TEXTURE_CUBE_MAP]=B(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),C[i.TEXTURE_2D_ARRAY]=B(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),C[i.TEXTURE_3D]=B(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),U(i.DEPTH_TEST),a.setFunc(er),_t(!1),Ct(Oc),U(i.CULL_FACE),ht(vi);function U(G){h[G]!==!0&&(i.enable(G),h[G]=!0)}function Y(G){h[G]!==!1&&(i.disable(G),h[G]=!1)}function pt(G,Pt){return u[G]!==Pt?(i.bindFramebuffer(G,Pt),u[G]=Pt,G===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=Pt),G===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=Pt),!0):!1}function ot(G,Pt){let ct=_,It=!1;if(G){ct=f.get(Pt),ct===void 0&&(ct=[],f.set(Pt,ct));let Lt=G.textures;if(ct.length!==Lt.length||ct[0]!==i.COLOR_ATTACHMENT0){for(let gt=0,te=Lt.length;gt<te;gt++)ct[gt]=i.COLOR_ATTACHMENT0+gt;ct.length=Lt.length,It=!0}}else ct[0]!==i.BACK&&(ct[0]=i.BACK,It=!0);It&&i.drawBuffers(ct)}function Dt(G){return y!==G?(i.useProgram(G),y=G,!0):!1}let Qt={[Ss]:i.FUNC_ADD,[Fu]:i.FUNC_SUBTRACT,[Ou]:i.FUNC_REVERSE_SUBTRACT};Qt[Bu]=i.MIN,Qt[zu]=i.MAX;let ft={[ku]:i.ZERO,[Vu]:i.ONE,[Gu]:i.SRC_COLOR,[Vc]:i.SRC_ALPHA,[Yu]:i.SRC_ALPHA_SATURATE,[qu]:i.DST_COLOR,[Wu]:i.DST_ALPHA,[Hu]:i.ONE_MINUS_SRC_COLOR,[Gc]:i.ONE_MINUS_SRC_ALPHA,[$u]:i.ONE_MINUS_DST_COLOR,[Xu]:i.ONE_MINUS_DST_ALPHA,[Zu]:i.CONSTANT_COLOR,[Ju]:i.ONE_MINUS_CONSTANT_COLOR,[ju]:i.CONSTANT_ALPHA,[Ku]:i.ONE_MINUS_CONSTANT_ALPHA};function ht(G,Pt,ct,It,Lt,gt,te,Yt,Ce,De){if(G===vi){g===!0&&(Y(i.BLEND),g=!1);return}if(g===!1&&(U(i.BLEND),g=!0),G!==Uu){if(G!==m||De!==F){if((R!==Ss||T!==Ss)&&(i.blendEquation(i.FUNC_ADD),R=Ss,T=Ss),De)switch(G){case mr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Bc:i.blendFunc(i.ONE,i.ONE);break;case zc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case kc:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:le("WebGLState: Invalid blending: ",G);break}else switch(G){case mr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Bc:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case zc:le("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case kc:le("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:le("WebGLState: Invalid blending: ",G);break}I=null,b=null,A=null,L=null,v.set(0,0,0),w=0,m=G,F=De}return}Lt=Lt||Pt,gt=gt||ct,te=te||It,(Pt!==R||Lt!==T)&&(i.blendEquationSeparate(Qt[Pt],Qt[Lt]),R=Pt,T=Lt),(ct!==I||It!==b||gt!==A||te!==L)&&(i.blendFuncSeparate(ft[ct],ft[It],ft[gt],ft[te]),I=ct,b=It,A=gt,L=te),(Yt.equals(v)===!1||Ce!==w)&&(i.blendColor(Yt.r,Yt.g,Yt.b,Ce),v.copy(Yt),w=Ce),m=G,F=!1}function rt(G,Pt){G.side===yn?Y(i.CULL_FACE):U(i.CULL_FACE);let ct=G.side===Ln;Pt&&(ct=!ct),_t(ct),G.blending===mr&&G.transparent===!1?ht(vi):ht(G.blending,G.blendEquation,G.blendSrc,G.blendDst,G.blendEquationAlpha,G.blendSrcAlpha,G.blendDstAlpha,G.blendColor,G.blendAlpha,G.premultipliedAlpha),a.setFunc(G.depthFunc),a.setTest(G.depthTest),a.setMask(G.depthWrite),r.setMask(G.colorWrite);let It=G.stencilWrite;o.setTest(It),It&&(o.setMask(G.stencilWriteMask),o.setFunc(G.stencilFunc,G.stencilRef,G.stencilFuncMask),o.setOp(G.stencilFail,G.stencilZFail,G.stencilZPass)),ne(G.polygonOffset,G.polygonOffsetFactor,G.polygonOffsetUnits),G.alphaToCoverage===!0?U(i.SAMPLE_ALPHA_TO_COVERAGE):Y(i.SAMPLE_ALPHA_TO_COVERAGE)}function _t(G){z!==G&&(G?i.frontFace(i.CW):i.frontFace(i.CCW),z=G)}function Ct(G){G!==Lu?(U(i.CULL_FACE),G!==$&&(G===Oc?i.cullFace(i.BACK):G===Du?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Y(i.CULL_FACE),$=G}function $t(G){G!==q&&(nt&&i.lineWidth(G),q=G)}function ne(G,Pt,ct){G?(U(i.POLYGON_OFFSET_FILL),(D!==Pt||Z!==ct)&&(D=Pt,Z=ct,a.getReversed()&&(Pt=-Pt),i.polygonOffset(Pt,ct))):Y(i.POLYGON_OFFSET_FILL)}function re(G){G?U(i.SCISSOR_TEST):Y(i.SCISSOR_TEST)}function oe(G){G===void 0&&(G=i.TEXTURE0+st-1),ut!==G&&(i.activeTexture(G),ut=G)}function N(G,Pt,ct){ct===void 0&&(ut===null?ct=i.TEXTURE0+st-1:ct=ut);let It=dt[ct];It===void 0&&(It={type:void 0,texture:void 0},dt[ct]=It),(It.type!==G||It.texture!==Pt)&&(ut!==ct&&(i.activeTexture(ct),ut=ct),i.bindTexture(G,Pt||C[G]),It.type=G,It.texture=Pt)}function Ae(){let G=dt[ut];G!==void 0&&G.type!==void 0&&(i.bindTexture(G.type,null),G.type=void 0,G.texture=void 0)}function ve(){try{i.compressedTexImage2D(...arguments)}catch(G){le("WebGLState:",G)}}function P(){try{i.compressedTexImage3D(...arguments)}catch(G){le("WebGLState:",G)}}function x(){try{i.texSubImage2D(...arguments)}catch(G){le("WebGLState:",G)}}function V(){try{i.texSubImage3D(...arguments)}catch(G){le("WebGLState:",G)}}function J(){try{i.compressedTexSubImage2D(...arguments)}catch(G){le("WebGLState:",G)}}function K(){try{i.compressedTexSubImage3D(...arguments)}catch(G){le("WebGLState:",G)}}function bt(){try{i.texStorage2D(...arguments)}catch(G){le("WebGLState:",G)}}function wt(){try{i.texStorage3D(...arguments)}catch(G){le("WebGLState:",G)}}function at(){try{i.texImage2D(...arguments)}catch(G){le("WebGLState:",G)}}function lt(){try{i.texImage3D(...arguments)}catch(G){le("WebGLState:",G)}}function xt(G){return p[G]!==void 0?p[G]:i.getParameter(G)}function jt(G,Pt){p[G]!==Pt&&(i.pixelStorei(G,Pt),p[G]=Pt)}function Et(G){we.equals(G)===!1&&(i.scissor(G.x,G.y,G.z,G.w),we.copy(G))}function Rt(G){de.equals(G)===!1&&(i.viewport(G.x,G.y,G.z,G.w),de.copy(G))}function Zt(G,Pt){let ct=c.get(Pt);ct===void 0&&(ct=new WeakMap,c.set(Pt,ct));let It=ct.get(G);It===void 0&&(It=i.getUniformBlockIndex(Pt,G.name),ct.set(G,It))}function Xt(G,Pt){let It=c.get(Pt).get(G);l.get(Pt)!==It&&(i.uniformBlockBinding(Pt,It,G.__bindingPointIndex),l.set(Pt,It))}function fe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},p={},ut=null,dt={},u={},f=new WeakMap,_=[],y=null,g=!1,m=null,R=null,I=null,b=null,T=null,A=null,L=null,v=new ue(0,0,0),w=0,F=!1,z=null,$=null,q=null,D=null,Z=null,we.set(0,0,i.canvas.width,i.canvas.height),de.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:U,disable:Y,bindFramebuffer:pt,drawBuffers:ot,useProgram:Dt,setBlending:ht,setMaterial:rt,setFlipSided:_t,setCullFace:Ct,setLineWidth:$t,setPolygonOffset:ne,setScissorTest:re,activeTexture:oe,bindTexture:N,unbindTexture:Ae,compressedTexImage2D:ve,compressedTexImage3D:P,texImage2D:at,texImage3D:lt,pixelStorei:jt,getParameter:xt,updateUBOMapping:Zt,uniformBlockBinding:Xt,texStorage2D:bt,texStorage3D:wt,texSubImage2D:x,texSubImage3D:V,compressedTexSubImage2D:J,compressedTexSubImage3D:K,scissor:Et,viewport:Rt,reset:fe}}function wx(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new St,h=new WeakMap,p=new Set,u,f=new WeakMap,_=!1;try{_=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(P,x){return _?new OffscreenCanvas(P,x):kr("canvas")}function g(P,x,V){let J=1,K=ve(P);if((K.width>V||K.height>V)&&(J=V/Math.max(K.width,K.height)),J<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){let bt=Math.floor(J*K.width),wt=Math.floor(J*K.height);u===void 0&&(u=y(bt,wt));let at=x?y(bt,wt):u;return at.width=bt,at.height=wt,at.getContext("2d").drawImage(P,0,0,bt,wt),ae("WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+bt+"x"+wt+")."),at}else return"data"in P&&ae("WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),P;return P}function m(P){return P.generateMipmaps}function R(P){i.generateMipmap(P)}function I(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(P,x,V,J,K,bt=!1){if(P!==null){if(i[P]!==void 0)return i[P];ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let wt;J&&(wt=t.get("EXT_texture_norm16"),wt||ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let at=x;if(x===i.RED&&(V===i.FLOAT&&(at=i.R32F),V===i.HALF_FLOAT&&(at=i.R16F),V===i.UNSIGNED_BYTE&&(at=i.R8),V===i.UNSIGNED_SHORT&&wt&&(at=wt.R16_EXT),V===i.SHORT&&wt&&(at=wt.R16_SNORM_EXT)),x===i.RED_INTEGER&&(V===i.UNSIGNED_BYTE&&(at=i.R8UI),V===i.UNSIGNED_SHORT&&(at=i.R16UI),V===i.UNSIGNED_INT&&(at=i.R32UI),V===i.BYTE&&(at=i.R8I),V===i.SHORT&&(at=i.R16I),V===i.INT&&(at=i.R32I)),x===i.RG&&(V===i.FLOAT&&(at=i.RG32F),V===i.HALF_FLOAT&&(at=i.RG16F),V===i.UNSIGNED_BYTE&&(at=i.RG8),V===i.UNSIGNED_SHORT&&wt&&(at=wt.RG16_EXT),V===i.SHORT&&wt&&(at=wt.RG16_SNORM_EXT)),x===i.RG_INTEGER&&(V===i.UNSIGNED_BYTE&&(at=i.RG8UI),V===i.UNSIGNED_SHORT&&(at=i.RG16UI),V===i.UNSIGNED_INT&&(at=i.RG32UI),V===i.BYTE&&(at=i.RG8I),V===i.SHORT&&(at=i.RG16I),V===i.INT&&(at=i.RG32I)),x===i.RGB_INTEGER&&(V===i.UNSIGNED_BYTE&&(at=i.RGB8UI),V===i.UNSIGNED_SHORT&&(at=i.RGB16UI),V===i.UNSIGNED_INT&&(at=i.RGB32UI),V===i.BYTE&&(at=i.RGB8I),V===i.SHORT&&(at=i.RGB16I),V===i.INT&&(at=i.RGB32I)),x===i.RGBA_INTEGER&&(V===i.UNSIGNED_BYTE&&(at=i.RGBA8UI),V===i.UNSIGNED_SHORT&&(at=i.RGBA16UI),V===i.UNSIGNED_INT&&(at=i.RGBA32UI),V===i.BYTE&&(at=i.RGBA8I),V===i.SHORT&&(at=i.RGBA16I),V===i.INT&&(at=i.RGBA32I)),x===i.RGB&&(V===i.UNSIGNED_SHORT&&wt&&(at=wt.RGB16_EXT),V===i.SHORT&&wt&&(at=wt.RGB16_SNORM_EXT),V===i.UNSIGNED_INT_5_9_9_9_REV&&(at=i.RGB9_E5),V===i.UNSIGNED_INT_10F_11F_11F_REV&&(at=i.R11F_G11F_B10F)),x===i.RGBA){let lt=bt?zr:Le.getTransfer(K);V===i.FLOAT&&(at=i.RGBA32F),V===i.HALF_FLOAT&&(at=i.RGBA16F),V===i.UNSIGNED_BYTE&&(at=lt===Ve?i.SRGB8_ALPHA8:i.RGBA8),V===i.UNSIGNED_SHORT&&wt&&(at=wt.RGBA16_EXT),V===i.SHORT&&wt&&(at=wt.RGBA16_SNORM_EXT),V===i.UNSIGNED_SHORT_4_4_4_4&&(at=i.RGBA4),V===i.UNSIGNED_SHORT_5_5_5_1&&(at=i.RGB5_A1)}return(at===i.R16F||at===i.R32F||at===i.RG16F||at===i.RG32F||at===i.RGBA16F||at===i.RGBA32F)&&t.get("EXT_color_buffer_float"),at}function T(P,x){let V;return P?x===null||x===li||x===_r?V=i.DEPTH24_STENCIL8:x===Kn?V=i.DEPTH32F_STENCIL8:x===gr&&(V=i.DEPTH24_STENCIL8,ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===li||x===_r?V=i.DEPTH_COMPONENT24:x===Kn?V=i.DEPTH_COMPONENT32F:x===gr&&(V=i.DEPTH_COMPONENT16),V}function A(P,x){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==xn&&P.minFilter!==An?Math.log2(Math.max(x.width,x.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?x.mipmaps.length:1}function L(P){let x=P.target;x.removeEventListener("dispose",L),w(x),x.isVideoTexture&&h.delete(x),x.isHTMLTexture&&p.delete(x)}function v(P){let x=P.target;x.removeEventListener("dispose",v),z(x)}function w(P){let x=n.get(P);if(x.__webglInit===void 0)return;let V=P.source,J=f.get(V);if(J){let K=J[x.__cacheKey];K.usedTimes--,K.usedTimes===0&&F(P),Object.keys(J).length===0&&f.delete(V)}n.remove(P)}function F(P){let x=n.get(P);i.deleteTexture(x.__webglTexture);let V=P.source,J=f.get(V);delete J[x.__cacheKey],a.memory.textures--}function z(P){let x=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(x.__webglFramebuffer[J]))for(let K=0;K<x.__webglFramebuffer[J].length;K++)i.deleteFramebuffer(x.__webglFramebuffer[J][K]);else i.deleteFramebuffer(x.__webglFramebuffer[J]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[J])}else{if(Array.isArray(x.__webglFramebuffer))for(let J=0;J<x.__webglFramebuffer.length;J++)i.deleteFramebuffer(x.__webglFramebuffer[J]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let J=0;J<x.__webglColorRenderbuffer.length;J++)x.__webglColorRenderbuffer[J]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[J]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}let V=P.textures;for(let J=0,K=V.length;J<K;J++){let bt=n.get(V[J]);bt.__webglTexture&&(i.deleteTexture(bt.__webglTexture),a.memory.textures--),n.remove(V[J])}n.remove(P)}let $=0;function q(){$=0}function D(){return $}function Z(P){$=P}function st(){let P=$;return P>=s.maxTextures&&ae("WebGLTextures: Trying to use "+(P+1)+" texture units while this GPU supports only "+s.maxTextures),$+=1,P}function nt(P){let x=[];return x.push(P.wrapS),x.push(P.wrapT),x.push(P.wrapR||0),x.push(P.magFilter),x.push(P.minFilter),x.push(P.anisotropy),x.push(P.internalFormat),x.push(P.format),x.push(P.type),x.push(P.generateMipmaps),x.push(P.premultiplyAlpha),x.push(P.flipY),x.push(P.unpackAlignment),x.push(P.colorSpace),x.join()}function vt(P,x){let V=n.get(P);if(P.isVideoTexture&&N(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&V.__version!==P.version){let J=P.image;if(J===null)ae("WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)ae("WebGLRenderer: Texture marked for update but image is incomplete");else{Y(V,P,x);return}}else P.isExternalTexture&&(V.__webglTexture=P.sourceTexture?P.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,V.__webglTexture,i.TEXTURE0+x)}function et(P,x){let V=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&V.__version!==P.version){Y(V,P,x);return}else P.isExternalTexture&&(V.__webglTexture=P.sourceTexture?P.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,V.__webglTexture,i.TEXTURE0+x)}function ut(P,x){let V=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&V.__version!==P.version){Y(V,P,x);return}e.bindTexture(i.TEXTURE_3D,V.__webglTexture,i.TEXTURE0+x)}function dt(P,x){let V=n.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&V.__version!==P.version){pt(V,P,x);return}e.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture,i.TEXTURE0+x)}let zt={[fo]:i.REPEAT,[pi]:i.CLAMP_TO_EDGE,[po]:i.MIRRORED_REPEAT},Ut={[xn]:i.NEAREST,[ed]:i.NEAREST_MIPMAP_NEAREST,[da]:i.NEAREST_MIPMAP_LINEAR,[An]:i.LINEAR,[$o]:i.LINEAR_MIPMAP_NEAREST,[ss]:i.LINEAR_MIPMAP_LINEAR},we={[rd]:i.NEVER,[hd]:i.ALWAYS,[ad]:i.LESS,[Ll]:i.LEQUAL,[od]:i.EQUAL,[Dl]:i.GEQUAL,[ld]:i.GREATER,[cd]:i.NOTEQUAL};function de(P,x){if(x.type===Kn&&t.has("OES_texture_float_linear")===!1&&(x.magFilter===An||x.magFilter===$o||x.magFilter===da||x.magFilter===ss||x.minFilter===An||x.minFilter===$o||x.minFilter===da||x.minFilter===ss)&&ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,zt[x.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,zt[x.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,zt[x.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,Ut[x.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,Ut[x.minFilter]),x.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,we[x.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===xn||x.minFilter!==da&&x.minFilter!==ss||x.type===Kn&&t.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){let V=t.get("EXT_texture_filter_anisotropic");i.texParameterf(P,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function B(P,x){let V=!1;P.__webglInit===void 0&&(P.__webglInit=!0,x.addEventListener("dispose",L));let J=x.source,K=f.get(J);K===void 0&&(K={},f.set(J,K));let bt=nt(x);if(bt!==P.__cacheKey){K[bt]===void 0&&(K[bt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,V=!0),K[bt].usedTimes++;let wt=K[P.__cacheKey];wt!==void 0&&(K[P.__cacheKey].usedTimes--,wt.usedTimes===0&&F(x)),P.__cacheKey=bt,P.__webglTexture=K[bt].texture}return V}function C(P,x,V){return Math.floor(Math.floor(P/V)/x)}function U(P,x,V,J){let bt=P.updateRanges;if(bt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,V,J,x.data);else{bt.sort((jt,Et)=>jt.start-Et.start);let wt=0;for(let jt=1;jt<bt.length;jt++){let Et=bt[wt],Rt=bt[jt],Zt=Et.start+Et.count,Xt=C(Rt.start,x.width,4),fe=C(Et.start,x.width,4);Rt.start<=Zt+1&&Xt===fe&&C(Rt.start+Rt.count-1,x.width,4)===Xt?Et.count=Math.max(Et.count,Rt.start+Rt.count-Et.start):(++wt,bt[wt]=Rt)}bt.length=wt+1;let at=e.getParameter(i.UNPACK_ROW_LENGTH),lt=e.getParameter(i.UNPACK_SKIP_PIXELS),xt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let jt=0,Et=bt.length;jt<Et;jt++){let Rt=bt[jt],Zt=Math.floor(Rt.start/4),Xt=Math.ceil(Rt.count/4),fe=Zt%x.width,G=Math.floor(Zt/x.width),Pt=Xt,ct=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,fe),e.pixelStorei(i.UNPACK_SKIP_ROWS,G),e.texSubImage2D(i.TEXTURE_2D,0,fe,G,Pt,ct,V,J,x.data)}P.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,at),e.pixelStorei(i.UNPACK_SKIP_PIXELS,lt),e.pixelStorei(i.UNPACK_SKIP_ROWS,xt)}}function Y(P,x,V){let J=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(J=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&(J=i.TEXTURE_3D);let K=B(P,x),bt=x.source;e.bindTexture(J,P.__webglTexture,i.TEXTURE0+V);let wt=n.get(bt);if(bt.version!==wt.__version||K===!0){if(e.activeTexture(i.TEXTURE0+V),(typeof ImageBitmap<"u"&&x.image instanceof ImageBitmap)===!1){let ct=Le.getPrimaries(Le.workingColorSpace),It=x.colorSpace===Fi?null:Le.getPrimaries(x.colorSpace),Lt=x.colorSpace===Fi||ct===It?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Lt)}e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment);let lt=g(x.image,!1,s.maxTextureSize);lt=Ae(x,lt);let xt=r.convert(x.format,x.colorSpace),jt=r.convert(x.type),Et=b(x.internalFormat,xt,jt,x.normalized,x.colorSpace,x.isVideoTexture);de(J,x);let Rt,Zt=x.mipmaps,Xt=x.isVideoTexture!==!0,fe=wt.__version===void 0||K===!0,G=bt.dataReady,Pt=A(x,lt);if(x.isDepthTexture)Et=T(x.format===rs,x.type),fe&&(Xt?e.texStorage2D(i.TEXTURE_2D,1,Et,lt.width,lt.height):e.texImage2D(i.TEXTURE_2D,0,Et,lt.width,lt.height,0,xt,jt,null));else if(x.isDataTexture)if(Zt.length>0){Xt&&fe&&e.texStorage2D(i.TEXTURE_2D,Pt,Et,Zt[0].width,Zt[0].height);for(let ct=0,It=Zt.length;ct<It;ct++)Rt=Zt[ct],Xt?G&&e.texSubImage2D(i.TEXTURE_2D,ct,0,0,Rt.width,Rt.height,xt,jt,Rt.data):e.texImage2D(i.TEXTURE_2D,ct,Et,Rt.width,Rt.height,0,xt,jt,Rt.data);x.generateMipmaps=!1}else Xt?(fe&&e.texStorage2D(i.TEXTURE_2D,Pt,Et,lt.width,lt.height),G&&U(x,lt,xt,jt)):e.texImage2D(i.TEXTURE_2D,0,Et,lt.width,lt.height,0,xt,jt,lt.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Xt&&fe&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Et,Zt[0].width,Zt[0].height,lt.depth);for(let ct=0,It=Zt.length;ct<It;ct++)if(Rt=Zt[ct],x.format!==Qn)if(xt!==null)if(Xt){if(G)if(x.layerUpdates.size>0){let Lt=uh(Rt.width,Rt.height,x.format,x.type);for(let gt of x.layerUpdates){let te=Rt.data.subarray(gt*Lt/Rt.data.BYTES_PER_ELEMENT,(gt+1)*Lt/Rt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ct,0,0,gt,Rt.width,Rt.height,1,xt,te)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ct,0,0,0,Rt.width,Rt.height,lt.depth,xt,Rt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ct,Et,Rt.width,Rt.height,lt.depth,0,Rt.data,0,0);else ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Xt?G&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,ct,0,0,0,Rt.width,Rt.height,lt.depth,xt,jt,Rt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,ct,Et,Rt.width,Rt.height,lt.depth,0,xt,jt,Rt.data);x.layerUpdates.size>0&&x.clearLayerUpdates()}else{Xt&&fe&&e.texStorage2D(i.TEXTURE_2D,Pt,Et,Zt[0].width,Zt[0].height);for(let ct=0,It=Zt.length;ct<It;ct++)Rt=Zt[ct],x.format!==Qn?xt!==null?Xt?G&&e.compressedTexSubImage2D(i.TEXTURE_2D,ct,0,0,Rt.width,Rt.height,xt,Rt.data):e.compressedTexImage2D(i.TEXTURE_2D,ct,Et,Rt.width,Rt.height,0,Rt.data):ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Xt?G&&e.texSubImage2D(i.TEXTURE_2D,ct,0,0,Rt.width,Rt.height,xt,jt,Rt.data):e.texImage2D(i.TEXTURE_2D,ct,Et,Rt.width,Rt.height,0,xt,jt,Rt.data)}else if(x.isDataArrayTexture)if(Xt){if(fe&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Pt,Et,lt.width,lt.height,lt.depth),G)if(x.layerUpdates.size>0){let ct=uh(lt.width,lt.height,x.format,x.type);for(let It of x.layerUpdates){let Lt=lt.data.subarray(It*ct/lt.data.BYTES_PER_ELEMENT,(It+1)*ct/lt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,It,lt.width,lt.height,1,xt,jt,Lt)}x.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,lt.width,lt.height,lt.depth,xt,jt,lt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Et,lt.width,lt.height,lt.depth,0,xt,jt,lt.data);else if(x.isData3DTexture)Xt?(fe&&e.texStorage3D(i.TEXTURE_3D,Pt,Et,lt.width,lt.height,lt.depth),G&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,lt.width,lt.height,lt.depth,xt,jt,lt.data)):e.texImage3D(i.TEXTURE_3D,0,Et,lt.width,lt.height,lt.depth,0,xt,jt,lt.data);else if(x.isFramebufferTexture){if(fe)if(Xt)e.texStorage2D(i.TEXTURE_2D,Pt,Et,lt.width,lt.height);else{let ct=lt.width,It=lt.height;for(let Lt=0;Lt<Pt;Lt++)e.texImage2D(i.TEXTURE_2D,Lt,Et,ct,It,0,xt,jt,null),ct>>=1,It>>=1}}else if(x.isHTMLTexture){if("texElementImage2D"in i){let ct=i.canvas;if(ct.hasAttribute("layoutsubtree")||ct.setAttribute("layoutsubtree","true"),lt.parentNode!==ct){ct.appendChild(lt),p.add(x),ct.onpaint=It=>{let Lt=It.changedElements;for(let gt of p)Lt.includes(gt.image)&&(gt.needsUpdate=!0)},ct.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,lt);else{let Lt=i.RGBA,gt=i.RGBA,te=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Lt,gt,te,lt)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Zt.length>0){if(Xt&&fe){let ct=ve(Zt[0]);e.texStorage2D(i.TEXTURE_2D,Pt,Et,ct.width,ct.height)}for(let ct=0,It=Zt.length;ct<It;ct++)Rt=Zt[ct],Xt?G&&e.texSubImage2D(i.TEXTURE_2D,ct,0,0,xt,jt,Rt):e.texImage2D(i.TEXTURE_2D,ct,Et,xt,jt,Rt);x.generateMipmaps=!1}else if(Xt){if(fe){let ct=ve(lt);e.texStorage2D(i.TEXTURE_2D,Pt,Et,ct.width,ct.height)}G&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,xt,jt,lt)}else e.texImage2D(i.TEXTURE_2D,0,Et,xt,jt,lt);m(x)&&R(J),wt.__version=bt.version,x.onUpdate&&x.onUpdate(x)}P.__version=x.version}function pt(P,x,V){if(x.image.length!==6)return;let J=B(P,x),K=x.source;e.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+V);let bt=n.get(K);if(K.version!==bt.__version||J===!0){e.activeTexture(i.TEXTURE0+V);let wt=Le.getPrimaries(Le.workingColorSpace),at=x.colorSpace===Fi?null:Le.getPrimaries(x.colorSpace),lt=x.colorSpace===Fi||wt===at?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,lt);let xt=x.isCompressedTexture||x.image[0].isCompressedTexture,jt=x.image[0]&&x.image[0].isDataTexture,Et=[];for(let gt=0;gt<6;gt++)!xt&&!jt?Et[gt]=g(x.image[gt],!0,s.maxCubemapSize):Et[gt]=jt?x.image[gt].image:x.image[gt],Et[gt]=Ae(x,Et[gt]);let Rt=Et[0],Zt=r.convert(x.format,x.colorSpace),Xt=r.convert(x.type),fe=b(x.internalFormat,Zt,Xt,x.normalized,x.colorSpace),G=x.isVideoTexture!==!0,Pt=bt.__version===void 0||J===!0,ct=K.dataReady,It=A(x,Rt);de(i.TEXTURE_CUBE_MAP,x);let Lt;if(xt){G&&Pt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,It,fe,Rt.width,Rt.height);for(let gt=0;gt<6;gt++){Lt=Et[gt].mipmaps;for(let te=0;te<Lt.length;te++){let Yt=Lt[te];x.format!==Qn?Zt!==null?G?ct&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te,0,0,Yt.width,Yt.height,Zt,Yt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te,fe,Yt.width,Yt.height,0,Yt.data):ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):G?ct&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te,0,0,Yt.width,Yt.height,Zt,Xt,Yt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te,fe,Yt.width,Yt.height,0,Zt,Xt,Yt.data)}}}else{if(Lt=x.mipmaps,G&&Pt){Lt.length>0&&It++;let gt=ve(Et[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,It,fe,gt.width,gt.height)}for(let gt=0;gt<6;gt++)if(jt){G?ct&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,Et[gt].width,Et[gt].height,Zt,Xt,Et[gt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,fe,Et[gt].width,Et[gt].height,0,Zt,Xt,Et[gt].data);for(let te=0;te<Lt.length;te++){let Ce=Lt[te].image[gt].image;G?ct&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te+1,0,0,Ce.width,Ce.height,Zt,Xt,Ce.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te+1,fe,Ce.width,Ce.height,0,Zt,Xt,Ce.data)}}else{G?ct&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,Zt,Xt,Et[gt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,fe,Zt,Xt,Et[gt]);for(let te=0;te<Lt.length;te++){let Yt=Lt[te];G?ct&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te+1,0,0,Zt,Xt,Yt.image[gt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,te+1,fe,Zt,Xt,Yt.image[gt])}}}m(x)&&R(i.TEXTURE_CUBE_MAP),bt.__version=K.version,x.onUpdate&&x.onUpdate(x)}P.__version=x.version}function ot(P,x,V,J,K,bt){let wt=r.convert(V.format,V.colorSpace),at=r.convert(V.type),lt=b(V.internalFormat,wt,at,V.normalized,V.colorSpace),xt=n.get(x),jt=n.get(V);if(jt.__renderTarget=x,!xt.__hasExternalTextures){let Et=Math.max(1,x.width>>bt),Rt=Math.max(1,x.height>>bt);K===i.TEXTURE_3D||K===i.TEXTURE_2D_ARRAY?e.texImage3D(K,bt,lt,Et,Rt,x.depth,0,wt,at,null):e.texImage2D(K,bt,lt,Et,Rt,0,wt,at,null)}e.bindFramebuffer(i.FRAMEBUFFER,P),oe(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,K,jt.__webglTexture,0,re(x)):(K===i.TEXTURE_2D||K>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,J,K,jt.__webglTexture,bt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Dt(P,x,V){if(i.bindRenderbuffer(i.RENDERBUFFER,P),x.depthBuffer){let J=x.depthTexture,K=J&&J.isDepthTexture?J.type:null,bt=T(x.stencilBuffer,K),wt=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;oe(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,re(x),bt,x.width,x.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,re(x),bt,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,bt,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,wt,i.RENDERBUFFER,P)}else{let J=x.textures;for(let K=0;K<J.length;K++){let bt=J[K],wt=r.convert(bt.format,bt.colorSpace),at=r.convert(bt.type),lt=b(bt.internalFormat,wt,at,bt.normalized,bt.colorSpace);oe(x)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,re(x),lt,x.width,x.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,re(x),lt,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,lt,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Qt(P,x,V){let J=x.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,P),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let K=n.get(x.depthTexture);if(K.__renderTarget=x,(!K.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),J){if(K.__webglInit===void 0&&(K.__webglInit=!0,x.depthTexture.addEventListener("dispose",L)),K.__webglTexture===void 0){K.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),de(i.TEXTURE_CUBE_MAP,x.depthTexture);let xt=r.convert(x.depthTexture.format),jt=r.convert(x.depthTexture.type),Et;x.depthTexture.format===gi?Et=i.DEPTH_COMPONENT24:x.depthTexture.format===rs&&(Et=i.DEPTH24_STENCIL8);for(let Rt=0;Rt<6;Rt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Rt,0,Et,x.width,x.height,0,xt,jt,null)}}else vt(x.depthTexture,0);let bt=K.__webglTexture,wt=re(x),at=J?i.TEXTURE_CUBE_MAP_POSITIVE_X+V:i.TEXTURE_2D,lt=x.depthTexture.format===rs?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(x.depthTexture.format===gi)oe(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,lt,at,bt,0,wt):i.framebufferTexture2D(i.FRAMEBUFFER,lt,at,bt,0);else if(x.depthTexture.format===rs)oe(x)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,lt,at,bt,0,wt):i.framebufferTexture2D(i.FRAMEBUFFER,lt,at,bt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ft(P){let x=n.get(P),V=P.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==P.depthTexture){let J=P.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),J){let K=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,J.removeEventListener("dispose",K)};J.addEventListener("dispose",K),x.__depthDisposeCallback=K}x.__boundDepthTexture=J}if(P.depthTexture&&!x.__autoAllocateDepthBuffer)if(V)for(let J=0;J<6;J++)Qt(x.__webglFramebuffer[J],P,J);else{let J=P.texture.mipmaps;J&&J.length>0?Qt(x.__webglFramebuffer[0],P,0):Qt(x.__webglFramebuffer,P,0)}else if(V){x.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[J]),x.__webglDepthbuffer[J]===void 0)x.__webglDepthbuffer[J]=i.createRenderbuffer(),Dt(x.__webglDepthbuffer[J],P,!1);else{let K=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,bt=x.__webglDepthbuffer[J];i.bindRenderbuffer(i.RENDERBUFFER,bt),i.framebufferRenderbuffer(i.FRAMEBUFFER,K,i.RENDERBUFFER,bt)}}else{let J=P.texture.mipmaps;if(J&&J.length>0?e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),Dt(x.__webglDepthbuffer,P,!1);else{let K=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,bt=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,bt),i.framebufferRenderbuffer(i.FRAMEBUFFER,K,i.RENDERBUFFER,bt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function ht(P,x,V){let J=n.get(P);x!==void 0&&ot(J.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),V!==void 0&&ft(P)}function rt(P){let x=P.texture,V=n.get(P),J=n.get(x);P.addEventListener("dispose",v);let K=P.textures,bt=P.isWebGLCubeRenderTarget===!0,wt=K.length>1;if(wt||(J.__webglTexture===void 0&&(J.__webglTexture=i.createTexture()),J.__version=x.version,a.memory.textures++),bt){V.__webglFramebuffer=[];for(let at=0;at<6;at++)if(x.mipmaps&&x.mipmaps.length>0){V.__webglFramebuffer[at]=[];for(let lt=0;lt<x.mipmaps.length;lt++)V.__webglFramebuffer[at][lt]=i.createFramebuffer()}else V.__webglFramebuffer[at]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){V.__webglFramebuffer=[];for(let at=0;at<x.mipmaps.length;at++)V.__webglFramebuffer[at]=i.createFramebuffer()}else V.__webglFramebuffer=i.createFramebuffer();if(wt)for(let at=0,lt=K.length;at<lt;at++){let xt=n.get(K[at]);xt.__webglTexture===void 0&&(xt.__webglTexture=i.createTexture(),a.memory.textures++)}if(P.samples>0&&oe(P)===!1){V.__webglMultisampledFramebuffer=i.createFramebuffer(),V.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let at=0;at<K.length;at++){let lt=K[at];V.__webglColorRenderbuffer[at]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,V.__webglColorRenderbuffer[at]);let xt=r.convert(lt.format,lt.colorSpace),jt=r.convert(lt.type),Et=b(lt.internalFormat,xt,jt,lt.normalized,lt.colorSpace,P.isXRRenderTarget===!0),Rt=re(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,Rt,Et,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,V.__webglColorRenderbuffer[at])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(V.__webglDepthRenderbuffer=i.createRenderbuffer(),Dt(V.__webglDepthRenderbuffer,P,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(bt){e.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture),de(i.TEXTURE_CUBE_MAP,x);for(let at=0;at<6;at++)if(x.mipmaps&&x.mipmaps.length>0)for(let lt=0;lt<x.mipmaps.length;lt++)ot(V.__webglFramebuffer[at][lt],P,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+at,lt);else ot(V.__webglFramebuffer[at],P,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+at,0);m(x)&&R(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(wt){for(let at=0,lt=K.length;at<lt;at++){let xt=K[at],jt=n.get(xt),Et=i.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(Et=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(Et,jt.__webglTexture),de(Et,xt),ot(V.__webglFramebuffer,P,xt,i.COLOR_ATTACHMENT0+at,Et,0),m(xt)&&R(Et)}e.unbindTexture()}else{let at=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(at=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(at,J.__webglTexture),de(at,x),x.mipmaps&&x.mipmaps.length>0)for(let lt=0;lt<x.mipmaps.length;lt++)ot(V.__webglFramebuffer[lt],P,x,i.COLOR_ATTACHMENT0,at,lt);else ot(V.__webglFramebuffer,P,x,i.COLOR_ATTACHMENT0,at,0);m(x)&&R(at),e.unbindTexture()}P.depthBuffer&&ft(P)}function _t(P){let x=P.textures;for(let V=0,J=x.length;V<J;V++){let K=x[V];if(m(K)){let bt=I(P),wt=n.get(K).__webglTexture;e.bindTexture(bt,wt),R(bt),e.unbindTexture()}}}let Ct=[],$t=[];function ne(P){if(P.samples>0){if(oe(P)===!1){let x=P.textures,V=P.width,J=P.height,K=i.COLOR_BUFFER_BIT,bt=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,wt=n.get(P),at=x.length>1;if(at)for(let xt=0;xt<x.length;xt++)e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,wt.__webglMultisampledFramebuffer);let lt=P.texture.mipmaps;lt&&lt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglFramebuffer);for(let xt=0;xt<x.length;xt++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(K|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(K|=i.STENCIL_BUFFER_BIT)),at){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,wt.__webglColorRenderbuffer[xt]);let jt=n.get(x[xt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,jt,0)}i.blitFramebuffer(0,0,V,J,0,0,V,J,K,i.NEAREST),l===!0&&(Ct.length=0,$t.length=0,Ct.push(i.COLOR_ATTACHMENT0+xt),P.depthBuffer&&P.storeMultisampledDepthBuffer===!1&&(Ct.push(bt),$t.push(bt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,$t)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Ct))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),at)for(let xt=0;xt<x.length;xt++){e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xt,i.RENDERBUFFER,wt.__webglColorRenderbuffer[xt]);let jt=n.get(x[xt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,wt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xt,i.TEXTURE_2D,jt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,wt.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.storeMultisampledDepthBuffer===!1&&l){let x=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function re(P){return Math.min(s.maxSamples,P.samples)}function oe(P){let x=n.get(P);return P.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function N(P){let x=a.render.frame;h.get(P)!==x&&(h.set(P,x),P.update())}function Ae(P,x){let V=P.colorSpace,J=P.format,K=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||V!==Br&&V!==Fi&&(Le.getTransfer(V)===Ve?(J!==Qn||K!==Un)&&ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):le("WebGLTextures: Unsupported texture color space:",V)),x}function ve(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=st,this.resetTextureUnits=q,this.getTextureUnits=D,this.setTextureUnits=Z,this.setTexture2D=vt,this.setTexture2DArray=et,this.setTexture3D=ut,this.setTextureCube=dt,this.rebindTextures=ht,this.setupRenderTarget=rt,this.updateRenderTargetMipmap=_t,this.updateMultisampleRenderTarget=ne,this.setupDepthRenderbuffer=ft,this.setupFrameBufferTexture=ot,this.useMultisampledRTT=oe,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function Cx(i,t){function e(n,s=Fi){let r,a=Le.getTransfer(s);if(n===Un)return i.UNSIGNED_BYTE;if(n===Zo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Jo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===th)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===eh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Kc)return i.BYTE;if(n===Qc)return i.SHORT;if(n===gr)return i.UNSIGNED_SHORT;if(n===Yo)return i.INT;if(n===li)return i.UNSIGNED_INT;if(n===Kn)return i.FLOAT;if(n===ci)return i.HALF_FLOAT;if(n===nh)return i.ALPHA;if(n===ih)return i.RGB;if(n===Qn)return i.RGBA;if(n===gi)return i.DEPTH_COMPONENT;if(n===rs)return i.DEPTH_STENCIL;if(n===jo)return i.RED;if(n===Ko)return i.RED_INTEGER;if(n===as)return i.RG;if(n===Qo)return i.RG_INTEGER;if(n===tl)return i.RGBA_INTEGER;if(n===fa||n===pa||n===ma||n===ga)if(a===Ve)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===fa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===fa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===pa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ga)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===el||n===nl||n===il||n===sl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===el)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===nl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===il)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===sl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===rl||n===al||n===ol||n===ll||n===cl||n===_a||n===hl)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===rl||n===al)return a===Ve?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===ol)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===ll)return r.COMPRESSED_R11_EAC;if(n===cl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===_a)return r.COMPRESSED_RG11_EAC;if(n===hl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===ul||n===dl||n===fl||n===pl||n===ml||n===gl||n===_l||n===xl||n===vl||n===yl||n===Ml||n===Sl||n===bl||n===El)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===ul)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===dl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===fl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===pl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ml)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===gl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===_l)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===xl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===vl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===yl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ml)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Sl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===bl)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===El)return a===Ve?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Al||n===Tl||n===wl)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Al)return a===Ve?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Tl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===wl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Cl||n===Rl||n===xa||n===Pl)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Cl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Rl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===xa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Pl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===_r?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var Rx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Px=`
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

}`,Ph=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new $r(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Wn({vertexShader:Rx,fragmentShader:Px,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new qe(new Zi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Ih=class extends ri{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,p=null,u=null,f=null,_=null,y=typeof XRWebGLBinding<"u",g=new Ph,m={},R=e.getContextAttributes(),I=null,b=null,T=[],A=[],L=new St,v=null,w=null,F=new un;F.viewport=new Ke;let z=new un;z.viewport=new Ke;let $=[F,z],q=new Ho,D=null,Z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(C){let U=T[C];return U===void 0&&(U=new or,T[C]=U),U.getTargetRaySpace()},this.getControllerGrip=function(C){let U=T[C];return U===void 0&&(U=new or,T[C]=U),U.getGripSpace()},this.getHand=function(C){let U=T[C];return U===void 0&&(U=new or,T[C]=U),U.getHandSpace()};function st(C){let U=A.indexOf(C.inputSource);if(U===-1)return;let Y=T[U];Y!==void 0&&(Y.update(C.inputSource,C.frame,c||a),Y.dispatchEvent({type:C.type,data:C.inputSource}))}function nt(){s.removeEventListener("select",st),s.removeEventListener("selectstart",st),s.removeEventListener("selectend",st),s.removeEventListener("squeeze",st),s.removeEventListener("squeezestart",st),s.removeEventListener("squeezeend",st),s.removeEventListener("end",nt),s.removeEventListener("inputsourceschange",vt);for(let C=0;C<T.length;C++){let U=A[C];U!==null&&(A[C]=null,T[C].disconnect(U))}D=null,Z=null,g.reset();for(let C in m)delete m[C];if(t.setRenderTarget(I),f=null,u=null,p=null,s=null,b=null,B.stop(),n.isPresenting=!1,t.setPixelRatio(v),t.setSize(L.width,L.height,!1),w!==null){let C=w.camera;C.fov=w.fov,C.zoom=w.zoom,C.updateProjectionMatrix(),w=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(C){r=C,n.isPresenting===!0&&ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(C){o=C,n.isPresenting===!0&&ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(C){c=C},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return p===null&&y&&(p=new XRWebGLBinding(s,e)),p},this.getFrame=function(){return _},this.getSession=function(){return s},this.setSession=async function(C){if(s=C,s!==null){if(I=t.getRenderTarget(),s.addEventListener("select",st),s.addEventListener("selectstart",st),s.addEventListener("selectend",st),s.addEventListener("squeeze",st),s.addEventListener("squeezestart",st),s.addEventListener("squeezeend",st),s.addEventListener("end",nt),s.addEventListener("inputsourceschange",vt),R.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(L),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let Y=null,pt=null,ot=null;R.depth&&(ot=R.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,Y=R.stencil?rs:gi,pt=R.stencil?_r:li);let Dt={colorFormat:e.RGBA8,depthFormat:ot,scaleFactor:r};p=this.getBinding(),u=p.createProjectionLayer(Dt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),b=new Nn(u.textureWidth,u.textureHeight,{format:Qn,type:Un,depthTexture:new Yi(u.textureWidth,u.textureHeight,pt,void 0,void 0,void 0,void 0,void 0,void 0,Y),stencilBuffer:R.stencil,colorSpace:t.outputColorSpace,samples:R.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let Y={antialias:R.antialias,alpha:!0,depth:R.depth,stencil:R.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,Y),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),b=new Nn(f.framebufferWidth,f.framebufferHeight,{format:Qn,type:Un,colorSpace:t.outputColorSpace,stencilBuffer:R.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),B.setContext(s),B.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function vt(C){for(let U=0;U<C.removed.length;U++){let Y=C.removed[U],pt=A.indexOf(Y);pt>=0&&(A[pt]=null,T[pt].disconnect(Y))}for(let U=0;U<C.added.length;U++){let Y=C.added[U],pt=A.indexOf(Y);if(pt===-1){for(let Dt=0;Dt<T.length;Dt++)if(Dt>=A.length){A.push(Y),pt=Dt;break}else if(A[Dt]===null){A[Dt]=Y,pt=Dt;break}if(pt===-1)break}let ot=T[pt];ot&&ot.connect(Y)}}let et=new O,ut=new O;function dt(C,U,Y){et.setFromMatrixPosition(U.matrixWorld),ut.setFromMatrixPosition(Y.matrixWorld);let pt=et.distanceTo(ut),ot=U.projectionMatrix.elements,Dt=Y.projectionMatrix.elements,Qt=ot[14]/(ot[10]-1),ft=ot[14]/(ot[10]+1),ht=(ot[9]+1)/ot[5],rt=(ot[9]-1)/ot[5],_t=(ot[8]-1)/ot[0],Ct=(Dt[8]+1)/Dt[0],$t=Qt*_t,ne=Qt*Ct,re=pt/(-_t+Ct),oe=re*-_t;if(U.matrixWorld.decompose(C.position,C.quaternion,C.scale),C.translateX(oe),C.translateZ(re),C.matrixWorld.compose(C.position,C.quaternion,C.scale),C.matrixWorldInverse.copy(C.matrixWorld).invert(),ot[10]===-1)C.projectionMatrix.copy(U.projectionMatrix),C.projectionMatrixInverse.copy(U.projectionMatrixInverse);else{let N=Qt+re,Ae=ft+re,ve=$t-oe,P=ne+(pt-oe),x=ht*ft/Ae*N,V=rt*ft/Ae*N;C.projectionMatrix.makePerspective(ve,P,x,V,N,Ae),C.projectionMatrixInverse.copy(C.projectionMatrix).invert()}}function zt(C,U){U===null?C.matrixWorld.copy(C.matrix):C.matrixWorld.multiplyMatrices(U.matrixWorld,C.matrix),C.matrixWorldInverse.copy(C.matrixWorld).invert()}this.updateCamera=function(C){if(s===null)return;let U=C.near,Y=C.far;g.texture!==null&&(g.depthNear>0&&(U=g.depthNear),g.depthFar>0&&(Y=g.depthFar)),q.near=z.near=F.near=U,q.far=z.far=F.far=Y,(D!==q.near||Z!==q.far)&&(s.updateRenderState({depthNear:q.near,depthFar:q.far}),D=q.near,Z=q.far),q.layers.mask=C.layers.mask|6,F.layers.mask=q.layers.mask&-5,z.layers.mask=q.layers.mask&-3;let pt=C.parent,ot=q.cameras;zt(q,pt);for(let Dt=0;Dt<ot.length;Dt++)zt(ot[Dt],pt);ot.length===2?dt(q,F,z):q.projectionMatrix.copy(F.projectionMatrix),w===null&&C.isPerspectiveCamera&&(w={camera:C,fov:C.fov,zoom:C.zoom}),Ut(C,q,pt)};function Ut(C,U,Y){Y===null?C.matrix.copy(U.matrixWorld):(C.matrix.copy(Y.matrixWorld),C.matrix.invert(),C.matrix.multiply(U.matrixWorld)),C.matrix.decompose(C.position,C.quaternion,C.scale),C.updateMatrixWorld(!0),C.projectionMatrix.copy(U.projectionMatrix),C.projectionMatrixInverse.copy(U.projectionMatrixInverse),C.isPerspectiveCamera&&(C.fov=sr*2*Math.atan(1/C.projectionMatrix.elements[5]),C.zoom=1)}this.getCamera=function(){return q},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(C){l=C,u!==null&&(u.fixedFoveation=C),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=C)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(q)},this.getCameraTexture=function(C){return m[C]};let we=null;function de(C,U){if(h=U.getViewerPose(c||a),_=U,h!==null){let Y=h.views;f!==null&&(t.setRenderTargetFramebuffer(b,f.framebuffer),t.setRenderTarget(b));let pt=!1;Y.length!==q.cameras.length&&(q.cameras.length=0,pt=!0);for(let ft=0;ft<Y.length;ft++){let ht=Y[ft],rt=null;if(f!==null)rt=f.getViewport(ht);else{let Ct=p.getViewSubImage(u,ht);rt=Ct.viewport,ft===0&&(t.setRenderTargetTextures(b,Ct.colorTexture,Ct.depthStencilTexture),t.setRenderTarget(b))}let _t=$[ft];_t===void 0&&(_t=new un,_t.layers.enable(ft),_t.viewport=new Ke,$[ft]=_t),_t.matrix.fromArray(ht.transform.matrix),_t.matrix.decompose(_t.position,_t.quaternion,_t.scale),_t.projectionMatrix.fromArray(ht.projectionMatrix),_t.projectionMatrixInverse.copy(_t.projectionMatrix).invert(),_t.viewport.set(rt.x,rt.y,rt.width,rt.height),ft===0&&(q.matrix.copy(_t.matrix),q.matrix.decompose(q.position,q.quaternion,q.scale)),pt===!0&&q.cameras.push(_t)}let ot=s.enabledFeatures;if(ot&&ot.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){p=n.getBinding();let ft=p.getDepthInformation(Y[0]);ft&&ft.isValid&&ft.texture&&g.init(ft,s.renderState)}if(ot&&ot.includes("camera-access")&&y){t.state.unbindTexture(),p=n.getBinding();for(let ft=0;ft<Y.length;ft++){let ht=Y[ft].camera;if(ht){let rt=m[ht];rt||(rt=new $r,m[ht]=rt);let _t=p.getCameraImage(ht);rt.sourceTexture=_t}}}}for(let Y=0;Y<T.length;Y++){let pt=A[Y],ot=T[Y];pt!==null&&ot!==void 0&&ot.update(pt,U,c||a)}we&&we(C,U),U.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:U}),_=null}let B=new Xd;B.setAnimationLoop(de),this.setAnimationLoop=function(C){we=C},this.dispose=function(){}}},Ix=new We,jd=new ge;jd.set(-1,0,0,0,1,0,0,0,1);function Lx(i,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,lh(i)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function s(g,m,R,I,b){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(g,m):m.isMeshLambertMaterial?(r(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(g,m),p(g,m)):m.isMeshPhongMaterial?(r(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,b)):m.isMeshMatcapMaterial?(r(g,m),_(g,m)):m.isMeshDepthMaterial?r(g,m):m.isMeshDistanceMaterial?(r(g,m),y(g,m)):m.isMeshNormalMaterial?r(g,m):m.isLineBasicMaterial?(a(g,m),m.isLineDashedMaterial&&o(g,m)):m.isPointsMaterial?l(g,m,R,I):m.isSpriteMaterial?c(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===Ln&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===Ln&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);let R=t.get(m),I=R.envMap,b=R.envMapRotation;I&&(g.envMap.value=I,g.envMapRotation.value.setFromMatrix4(Ix.makeRotationFromEuler(b)).transpose(),I.isCubeTexture&&I.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(jd),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function a(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function o(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function l(g,m,R,I){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*R,g.scale.value=I*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function c(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function p(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,R){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Ln&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=R.texture,g.transmissionSamplerSize.value.set(R.width,R.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function _(g,m){m.matcap&&(g.matcap.value=m.matcap)}function y(g,m){let R=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(R.matrixWorld),g.nearDistance.value=R.shadow.camera.near,g.farDistance.value=R.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Dx(i,t,e,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(b,T){let A=T.program;n.uniformBlockBinding(b,A)}function c(b,T){let A=s[b.id];A===void 0&&(g(b),A=h(b),s[b.id]=A,b.addEventListener("dispose",R));let L=T.program;n.updateUBOMapping(b,L);let v=t.render.frame;r[b.id]!==v&&(u(b),r[b.id]=v)}function h(b){let T=p();b.__bindingPointIndex=T;let A=i.createBuffer(),L=b.__size,v=b.usage;return i.bindBuffer(i.UNIFORM_BUFFER,A),i.bufferData(i.UNIFORM_BUFFER,L,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,A),A}function p(){for(let b=0;b<o;b++)if(a.indexOf(b)===-1)return a.push(b),b;return le("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(b){let T=s[b.id],A=b.uniforms,L=b.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let v=0,w=A.length;v<w;v++){let F=A[v];if(Array.isArray(F))for(let z=0,$=F.length;z<$;z++)f(F[z],v,z,L);else f(F,v,0,L)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(b,T,A,L){if(y(b,T,A,L)===!0){let v=b.__offset,w=b.value;if(Array.isArray(w)){let F=0;for(let z=0;z<w.length;z++){let $=w[z],q=m($);_($,b.__data,F),typeof $!="number"&&typeof $!="boolean"&&!$.isMatrix3&&!ArrayBuffer.isView($)&&(F+=q.storage/Float32Array.BYTES_PER_ELEMENT)}}else _(w,b.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,v,b.__data)}}function _(b,T,A){typeof b=="number"||typeof b=="boolean"?T[0]=b:b.isMatrix3?(T[0]=b.elements[0],T[1]=b.elements[1],T[2]=b.elements[2],T[3]=0,T[4]=b.elements[3],T[5]=b.elements[4],T[6]=b.elements[5],T[7]=0,T[8]=b.elements[6],T[9]=b.elements[7],T[10]=b.elements[8],T[11]=0):ArrayBuffer.isView(b)?T.set(new b.constructor(b.buffer,b.byteOffset,T.length)):b.toArray(T,A)}function y(b,T,A,L){let v=b.value,w=T+"_"+A;if(L[w]===void 0)return typeof v=="number"||typeof v=="boolean"?L[w]=v:ArrayBuffer.isView(v)?L[w]=v.slice():L[w]=v.clone(),!0;{let F=L[w];if(typeof v=="number"||typeof v=="boolean"){if(F!==v)return L[w]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(F.equals(v)===!1)return F.copy(v),!0}}return!1}function g(b){let T=b.uniforms,A=0,L=16;for(let w=0,F=T.length;w<F;w++){let z=Array.isArray(T[w])?T[w]:[T[w]];for(let $=0,q=z.length;$<q;$++){let D=z[$],Z=Array.isArray(D.value)?D.value:[D.value];for(let st=0,nt=Z.length;st<nt;st++){let vt=Z[st],et=m(vt),ut=A%L,dt=ut%et.boundary,zt=ut+dt;A+=dt,zt!==0&&L-zt<et.storage&&(A+=L-zt),D.__data=new Float32Array(et.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=A,A+=et.storage}}}let v=A%L;return v>0&&(A+=L-v),b.__size=A,b.__cache={},this}function m(b){let T={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(T.boundary=4,T.storage=4):b.isVector2?(T.boundary=8,T.storage=8):b.isVector3||b.isColor?(T.boundary=16,T.storage=12):b.isVector4?(T.boundary=16,T.storage=16):b.isMatrix3?(T.boundary=48,T.storage=48):b.isMatrix4?(T.boundary=64,T.storage=64):b.isTexture?ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(b)?(T.boundary=16,T.storage=b.byteLength):ae("WebGLRenderer: Unsupported uniform value type.",b),T}function R(b){let T=b.target;T.removeEventListener("dispose",R);let A=a.indexOf(T.__bindingPointIndex);a.splice(A,1),i.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function I(){for(let b in s)i.deleteBuffer(s[b]);a=[],s={},r={}}return{bind:l,update:c,dispose:I}}var Nx=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),yi=null;function Ux(){return yi===null&&(yi=new Wr(Nx,16,16,as,ci),yi.name="DFG_LUT",yi.minFilter=An,yi.magFilter=An,yi.wrapS=pi,yi.wrapT=pi,yi.generateMipmaps=!1,yi.needsUpdate=!0),yi}var Mr=class{constructor(t={}){let{canvas:e=dd(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:u=!1,outputBufferType:f=Un}=t;this.isWebGLRenderer=!0;let _;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");_=n.getContextAttributes().alpha}else _=a;let y=f,g=new Set([tl,Qo,Ko]),m=new Set([Un,li,gr,_r,Zo,Jo]),R=new Uint32Array(4),I=new Int32Array(4),b=new O,T=null,A=null,L=[],v=[],w=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=oi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let F=this,z=!1,$=null,q=null,D=null,Z=null;this._outputColorSpace=En;let st=0,nt=0,vt=null,et=-1,ut=null,dt=new Ke,zt=new Ke,Ut=null,we=new ue(0),de=0,B=e.width,C=e.height,U=1,Y=null,pt=null,ot=new Ke(0,0,B,C),Dt=new Ke(0,0,B,C),Qt=!1,ft=new lr,ht=!1,rt=!1,_t=new We,Ct=new O,$t=new Ke,ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},re=!1;function oe(){return vt===null?U:1}let N=n;function Ae(S,k){return e.getContext(S,k)}let ve,P,x,V,J,K,bt,wt,at,lt,xt,jt,Et,Rt,Zt,Xt,fe,G,Pt,ct,It,Lt,gt;try{let S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:p};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",Ce,!1),e.addEventListener("webglcontextrestored",De,!1),e.addEventListener("webglcontextcreationerror",_e,!1),N===null){let k="webgl2";if(N=Ae(k,S),N===null)throw Ae(k)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}te()}catch(S){throw e.removeEventListener("webglcontextlost",Ce,!1),e.removeEventListener("webglcontextrestored",De,!1),e.removeEventListener("webglcontextcreationerror",_e,!1),le("WebGLRenderer: "+S.message),S}function te(){ve=new G0(N),ve.init(),It=new Cx(N,ve),P=new L0(N,ve,t,It),x=new Tx(N,ve),P.reversedDepthBuffer&&u&&x.buffers.depth.setReversed(!0),q=N.createFramebuffer(),D=N.createFramebuffer(),Z=N.createFramebuffer(),V=new X0(N),J=new dx,K=new wx(N,ve,x,J,P,It,V),bt=new V0(F),wt=new $p(N),Lt=new P0(N,wt),at=new H0(N,wt,V,Lt),lt=new $0(N,at,wt,Lt,V),G=new q0(N,P,K),Zt=new D0(J),xt=new ux(F,bt,ve,P,Lt,Zt),jt=new Lx(F,J),Et=new px,Rt=new yx(ve),fe=new R0(F,bt,x,lt,_,l),Xt=new Ax(F,lt,P),gt=new Dx(N,V,P,x),Pt=new I0(N,ve,V),ct=new W0(N,ve,V),V.programs=xt.programs,F.capabilities=P,F.extensions=ve,F.properties=J,F.renderLists=Et,F.shadowMap=Xt,F.state=x,F.info=V}y!==Un&&(w=new Z0(y,e.width,e.height,o,s,r));let Yt=new Ih(F,N);this.xr=Yt,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let S=ve.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=ve.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return U},this.setPixelRatio=function(S){S!==void 0&&(U=S,this.setSize(B,C,!1))},this.getSize=function(S){return S.set(B,C)},this.setSize=function(S,k,it=!0){if(Yt.isPresenting){ae("WebGLRenderer: Can't change size while VR device is presenting.");return}B=S,C=k,e.width=Math.floor(S*U),e.height=Math.floor(k*U),it===!0&&(e.style.width=S+"px",e.style.height=k+"px"),w!==null&&w.setSize(e.width,e.height),this.setViewport(0,0,S,k)},this.getDrawingBufferSize=function(S){return S.set(B*U,C*U).floor()},this.setDrawingBufferSize=function(S,k,it){B=S,C=k,U=it,e.width=Math.floor(S*it),e.height=Math.floor(k*it),this.setViewport(0,0,S,k)},this.setEffects=function(S){if(y===Un){le("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let k=0;k<S.length;k++)if(S[k].isOutputPass===!0){ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}w.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(dt)},this.getViewport=function(S){return S.copy(ot)},this.setViewport=function(S,k,it,j){S.isVector4?ot.set(S.x,S.y,S.z,S.w):ot.set(S,k,it,j),x.viewport(dt.copy(ot).multiplyScalar(U).round())},this.getScissor=function(S){return S.copy(Dt)},this.setScissor=function(S,k,it,j){S.isVector4?Dt.set(S.x,S.y,S.z,S.w):Dt.set(S,k,it,j),x.scissor(zt.copy(Dt).multiplyScalar(U).round())},this.getScissorTest=function(){return Qt},this.setScissorTest=function(S){x.setScissorTest(Qt=S)},this.setOpaqueSort=function(S){Y=S},this.setTransparentSort=function(S){pt=S},this.getClearColor=function(S){return S.copy(fe.getClearColor())},this.setClearColor=function(){fe.setClearColor(...arguments)},this.getClearAlpha=function(){return fe.getClearAlpha()},this.setClearAlpha=function(){fe.setClearAlpha(...arguments)},this.clear=function(S=!0,k=!0,it=!0){let j=0;if(S){let Q=!1;if(vt!==null){let Ft=vt.texture.format;Q=g.has(Ft)}if(Q){let Ft=vt.texture.type,qt=m.has(Ft),Nt=fe.getClearColor(),Jt=fe.getClearAlpha(),Vt=Nt.r,pe=Nt.g,Se=Nt.b;qt?(R[0]=Vt,R[1]=pe,R[2]=Se,R[3]=Jt,N.clearBufferuiv(N.COLOR,0,R)):(I[0]=Vt,I[1]=pe,I[2]=Se,I[3]=Jt,N.clearBufferiv(N.COLOR,0,I))}else j|=N.COLOR_BUFFER_BIT}k&&(j|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),it&&(j|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),j!==0&&N.clear(j)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),$=S},this.dispose=function(){e.removeEventListener("webglcontextlost",Ce,!1),e.removeEventListener("webglcontextrestored",De,!1),e.removeEventListener("webglcontextcreationerror",_e,!1),fe.dispose(),Et.dispose(),Rt.dispose(),J.dispose(),bt.dispose(),lt.dispose(),Lt.dispose(),gt.dispose(),xt.dispose(),Yt.dispose(),Yt.removeEventListener("sessionstart",yt),Yt.removeEventListener("sessionend",Mt),kt.stop()};function Ce(S){S.preventDefault(),rh("WebGLRenderer: Context Lost."),z=!0}function De(){rh("WebGLRenderer: Context Restored."),z=!1;let S=V.autoReset,k=Xt.enabled,it=Xt.autoUpdate,j=Xt.needsUpdate,Q=Xt.type;te(),V.autoReset=S,Xt.enabled=k,Xt.autoUpdate=it,Xt.needsUpdate=j,Xt.type=Q}function _e(S){le("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function ce(S){let k=S.target;k.removeEventListener("dispose",ce),nn(k)}function nn(S){Bi(S),J.remove(S)}function Bi(S){let k=J.get(S).programs;k!==void 0&&(k.forEach(function(it){xt.releaseProgram(it)}),S.isShaderMaterial&&xt.releaseShaderCache(S))}this.renderBufferDirect=function(S,k,it,j,Q,Ft){k===null&&(k=ne);let qt=Q.isMesh&&Q.matrixWorld.determinantAffine()<0,Nt=zi(S,k,it,j,Q);x.setMaterial(j,qt);let Jt=it.index,Vt=1;if(j.wireframe===!0){if(Jt=at.getWireframeAttribute(it),Jt===void 0)return;Vt=2}let pe=it.drawRange,Se=it.attributes.position,Gt=pe.start*Vt,Ne=(pe.start+pe.count)*Vt;Ft!==null&&(Gt=Math.max(Gt,Ft.start*Vt),Ne=Math.min(Ne,(Ft.start+Ft.count)*Vt)),Jt!==null?(Gt=Math.max(Gt,0),Ne=Math.min(Ne,Jt.count)):Se!=null&&(Gt=Math.max(Gt,0),Ne=Math.min(Ne,Se.count));let tn=Ne-Gt;if(tn<0||tn===1/0)return;Lt.setup(Q,j,Nt,it,Jt);let Ge,He=Pt;if(Jt!==null&&(Ge=wt.get(Jt),He=ct,He.setIndex(Ge)),Q.isMesh)j.wireframe===!0?(x.setLineWidth(j.wireframeLinewidth*oe()),He.setMode(N.LINES)):He.setMode(N.TRIANGLES);else if(Q.isLine){let on=j.linewidth;on===void 0&&(on=1),x.setLineWidth(on*oe()),Q.isLineSegments?He.setMode(N.LINES):Q.isLineLoop?He.setMode(N.LINE_LOOP):He.setMode(N.LINE_STRIP)}else Q.isPoints?He.setMode(N.POINTS):Q.isSprite&&He.setMode(N.TRIANGLES);if(Q.isBatchedMesh)if(ve.get("WEBGL_multi_draw"))He.renderMultiDraw(Q._multiDrawStarts,Q._multiDrawCounts,Q._multiDrawCount);else{let on=Q._multiDrawStarts,Ht=Q._multiDrawCounts,gn=Q._multiDrawCount,xe=Jt?wt.get(Jt).bytesPerElement:1,Tn=J.get(j).currentProgram.getUniforms();for(let ln=0;ln<gn;ln++)Tn.setValue(N,"_gl_DrawID",ln),He.render(on[ln]/xe,Ht[ln])}else if(Q.isInstancedMesh)He.renderInstances(Gt,tn,Q.count);else if(it.isInstancedBufferGeometry){let on=it._maxInstanceCount!==void 0?it._maxInstanceCount:1/0,Ht=Math.min(it.instanceCount,on);He.renderInstances(Gt,tn,Ht)}else He.render(Gt,tn)};function ke(S,k,it,j){$!==null&&S.isNodeMaterial&&$.setObject(j,S),ht===!0&&Zt.setState(S,it,!1),S.transparent===!0&&S.side===yn&&S.forceSinglePass===!1?(S.side=Ln,S.needsUpdate=!0,sn(S,k,j),S.side=ns,S.needsUpdate=!0,sn(S,k,j),S.side=yn):sn(S,k,j)}this.compile=function(S,k,it=null){it===null&&(it=S),$!==null&&$.renderStart(S,k,it),A=Rt.get(it),A.init(k),v.push(A),it.traverseVisible(function(Q){Q.isLight&&Q.layers.test(k.layers)&&(A.pushLight(Q),Q.castShadow&&A.pushShadow(Q))}),S!==it&&S.traverseVisible(function(Q){Q.isLight&&Q.layers.test(k.layers)&&(A.pushLight(Q),Q.castShadow&&A.pushShadow(Q))}),A.setupLights(),$!==null&&$.updateLights(A.state.lightsArray),rt=this.localClippingEnabled,ht=Zt.init(this.clippingPlanes,rt),ht===!0&&Zt.setGlobalState(this.clippingPlanes,k),$!==null&&Xt.render(A.state.shadowsArray,it,k);let j=new Set;return S.traverse(function(Q){if(!(Q.isMesh||Q.isPoints||Q.isLine||Q.isSprite))return;let Ft=Q.material;if(Ft)if(Array.isArray(Ft))for(let qt=0;qt<Ft.length;qt++){let Nt=Ft[qt];ke(Nt,it,k,Q),j.add(Nt)}else ke(Ft,it,k,Q),j.add(Ft)}),A=v.pop(),$!==null&&$.renderEnd(),j},this.compileAsync=function(S,k,it=null){let j=this.compile(S,k,it);return new Promise(Q=>{function Ft(){if(j.forEach(function(qt){let Jt=J.get(qt).currentProgram;(Jt===void 0||Jt.isReady())&&j.delete(qt)}),j.size===0){Q(S);return}setTimeout(Ft,10)}ve.get("KHR_parallel_shader_compile")!==null?Ft():setTimeout(Ft,10)})};let Mn=null;function H(S){Mn&&Mn(S)}function yt(){kt.stop()}function Mt(){kt.start()}let kt=new Xd;kt.setAnimationLoop(H),typeof self<"u"&&kt.setContext(self),this.setAnimationLoop=function(S){Mn=S,Yt.setAnimationLoop(S),S===null?kt.stop():kt.start()},Yt.addEventListener("sessionstart",yt),Yt.addEventListener("sessionend",Mt),this.render=function(S,k){if(k!==void 0&&k.isCamera!==!0){le("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(z===!0)return;$!==null&&$.renderStart(S,k);let it=Yt.enabled===!0&&Yt.isPresenting===!0,j=w!==null&&(vt===null||it)&&w.begin(F,vt);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),Yt.enabled===!0&&Yt.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(Yt.cameraAutoUpdate===!0&&Yt.updateCamera(k),k=Yt.getCamera()),S.isScene===!0&&S.onBeforeRender(F,S,k,vt),A=Rt.get(S,v.length),A.init(k),A.state.textureUnits=K.getTextureUnits(),v.push(A),_t.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),ft.setFromProjectionMatrix(_t,si,k.reversedDepth),rt=this.localClippingEnabled,ht=Zt.init(this.clippingPlanes,rt),T=Et.get(S,L.length),T.init(),L.push(T),Yt.enabled===!0&&Yt.isPresenting===!0){let qt=F.xr.getDepthSensingMesh();qt!==null&&Re(qt,k,-1/0,F.sortObjects)}Re(S,k,0,F.sortObjects),T.finish(),$!==null&&$.updateLights(A.state.lightsArray),F.sortObjects===!0&&T.sort(Y,pt),re=Yt.enabled===!1||Yt.isPresenting===!1||Yt.hasDepthSensing()===!1,re&&fe.addToRenderList(T,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),ht===!0&&Zt.beginShadows();let Q=A.state.shadowsArray;if(Xt.render(Q,S,k),ht===!0&&Zt.endShadows(),(j&&w.hasRenderPass())===!1){let qt=T.opaque,Nt=T.transmissive;if(A.setupLights(),k.isArrayCamera){let Jt=k.cameras;if(Nt.length>0)for(let Vt=0,pe=Jt.length;Vt<pe;Vt++){let Se=Jt[Vt];Fe(qt,Nt,S,Se)}re&&fe.render(S);for(let Vt=0,pe=Jt.length;Vt<pe;Vt++){let Se=Jt[Vt];se(T,S,Se,Se.viewport)}}else Nt.length>0&&Fe(qt,Nt,S,k),re&&fe.render(S),se(T,S,k)}vt!==null&&nt===0&&(K.updateMultisampleRenderTarget(vt),K.updateRenderTargetMipmap(vt)),j&&w.end(F),S.isScene===!0&&S.onAfterRender(F,S,k),Lt.resetDefaultState(),et=-1,ut=null,v.pop(),v.length>0?(A=v[v.length-1],K.setTextureUnits(A.state.textureUnits),ht===!0&&Zt.setGlobalState(F.clippingPlanes,A.state.camera)):A=null,L.pop(),L.length>0?T=L[L.length-1]:T=null,$!==null&&$.renderEnd()};function Re(S,k,it,j){if(S.visible===!1)return;if(S.layers.test(k.layers)){if(S.isGroup)it=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(k);else if(S.isLightProbeGrid)A.pushLightProbeGrid(S);else if(S.isLight)A.pushLight(S),S.castShadow&&A.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||S.intersectsFrustum(ft)){j&&$t.setFromMatrixPosition(S.matrixWorld).applyMatrix4(_t);let qt=lt.update(S),Nt=S.material;Nt.visible&&T.push(S,qt,Nt,it,$t.z,null,k)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||S.intersectsFrustum(ft))){let qt=lt.update(S),Nt=S.material;if(j&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),$t.copy(S.boundingSphere.center)):(qt.boundingSphere===null&&qt.computeBoundingSphere(),$t.copy(qt.boundingSphere.center)),$t.applyMatrix4(S.matrixWorld).applyMatrix4(_t)),Array.isArray(Nt)){let Jt=qt.groups;for(let Vt=0,pe=Jt.length;Vt<pe;Vt++){let Se=Jt[Vt],Gt=Nt[Se.materialIndex];Gt&&Gt.visible&&T.push(S,qt,Gt,it,$t.z,Se,k)}}else Nt.visible&&T.push(S,qt,Nt,it,$t.z,null,k)}}let Ft=S.children;for(let qt=0,Nt=Ft.length;qt<Nt;qt++)Re(Ft[qt],k,it,j)}function se(S,k,it,j){let{opaque:Q,transmissive:Ft,transparent:qt}=S;A.setupLightsView(it),ht===!0&&Zt.setGlobalState(F.clippingPlanes,it),j&&x.viewport(dt.copy(j)),Q.length>0&&$e(Q,k,it),Ft.length>0&&$e(Ft,k,it),qt.length>0&&$e(qt,k,it),x.buffers.depth.setTest(!0),x.buffers.depth.setMask(!0),x.buffers.color.setMask(!0),x.setPolygonOffset(!1)}function Fe(S,k,it,j){if((it.isScene===!0?it.overrideMaterial:null)!==null)return;if(A.state.transmissionRenderTarget[j.id]===void 0){let Gt=ve.has("EXT_color_buffer_half_float")||ve.has("EXT_color_buffer_float");A.state.transmissionRenderTarget[j.id]=new Nn(1,1,{generateMipmaps:!0,type:Gt?ci:Un,minFilter:ss,samples:Math.max(4,P.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Le.workingColorSpace})}let Ft=A.state.transmissionRenderTarget[j.id],qt=j.viewport||dt;Ft.setSize(qt.z*F.transmissionResolutionScale,qt.w*F.transmissionResolutionScale);let Nt=F.getRenderTarget(),Jt=F.getActiveCubeFace(),Vt=F.getActiveMipmapLevel();F.setRenderTarget(Ft),F.getClearColor(we),de=F.getClearAlpha(),de<1&&F.setClearColor(16777215,.5),F.clear(),re&&fe.render(it);let pe=F.toneMapping;F.toneMapping=oi;let Se=j.viewport;if(j.viewport!==void 0&&(j.viewport=void 0),A.setupLightsView(j),ht===!0&&Zt.setGlobalState(F.clippingPlanes,j),$e(S,it,j),K.updateMultisampleRenderTarget(Ft),K.updateRenderTargetMipmap(Ft),ve.has("WEBGL_multisampled_render_to_texture")===!1){let Gt=!1;for(let Ne=0,tn=k.length;Ne<tn;Ne++){let Ge=k[Ne],{object:He,geometry:on,material:Ht,group:gn}=Ge;if(Ht.side===yn&&He.layers.test(j.layers)){let xe=Ht.side;Ht.side=Ln,Ht.needsUpdate=!0,me(He,it,j,on,Ht,gn),Ht.side=xe,Ht.needsUpdate=!0,Gt=!0}}Gt===!0&&(K.updateMultisampleRenderTarget(Ft),K.updateRenderTargetMipmap(Ft))}F.setRenderTarget(Nt,Jt,Vt),F.setClearColor(we,de),Se!==void 0&&(j.viewport=Se),F.toneMapping=pe}function $e(S,k,it){let j=k.isScene===!0?k.overrideMaterial:null;for(let Q=0,Ft=S.length;Q<Ft;Q++){let qt=S[Q],{object:Nt,geometry:Jt,group:Vt}=qt,pe=qt.material;pe.allowOverride===!0&&j!==null&&(pe=j),Nt.layers.test(it.layers)&&me(Nt,k,it,Jt,pe,Vt)}}function me(S,k,it,j,Q,Ft){$!==null&&Q.isNodeMaterial&&$.setObject(S,Q),S.onBeforeRender(F,k,it,j,Q,Ft),S.modelViewMatrix.multiplyMatrices(it.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),Q.onBeforeRender(F,k,it,j,S,Ft),Q.transparent===!0&&Q.side===yn&&Q.forceSinglePass===!1?(Q.side=Ln,Q.needsUpdate=!0,F.renderBufferDirect(it,k,j,Q,S,Ft),Q.side=ns,Q.needsUpdate=!0,F.renderBufferDirect(it,k,j,Q,S,Ft),Q.side=yn):F.renderBufferDirect(it,k,j,Q,S,Ft),S.onAfterRender(F,k,it,j,Q,Ft)}function sn(S,k,it){k.isScene!==!0&&(k=ne);let j=J.get(S),Q=A.state.lights,Ft=A.state.shadowsArray,qt=Q.state.version,Nt=xt.getParameters(S,Q.state,Ft,k,it,A.state.lightProbeGridArray),Jt=xt.getProgramCacheKey(Nt),Vt=j.programs;j.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?k.environment:null,j.fog=k.fog;let pe=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;j.envMap=bt.get(S.envMap||j.environment,pe),j.envMapRotation=j.environment!==null&&S.envMap===null?k.environmentRotation:S.envMapRotation,Vt===void 0&&(S.addEventListener("dispose",ce),Vt=new Map,j.programs=Vt);let Se=Vt.get(Jt);if(Se!==void 0){if(j.currentProgram===Se&&j.lightsStateVersion===qt)return hi(S,Nt),Se}else Nt.uniforms=xt.getUniforms(S),$!==null&&S.isNodeMaterial&&$.build(S,it,Nt),S.onBeforeCompile(Nt,F),Se=xt.acquireProgram(Nt,Jt),Vt.set(Jt,Se),j.uniforms=Nt.uniforms;let Gt=j.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Gt.clippingPlanes=Zt.uniform),hi(S,Nt),j.needsLights=Ea(S),j.lightsStateVersion=qt,j.needsLights&&(Gt.ambientLightColor.value=Q.state.ambient,Gt.lightProbe.value=Q.state.probe,Gt.sunLights.value=Q.state.sun,Gt.sunLightShadows.value=Q.state.sunShadow,Gt.directionalLights.value=Q.state.directional,Gt.directionalLightShadows.value=Q.state.directionalShadow,Gt.spotLights.value=Q.state.spot,Gt.spotLightShadows.value=Q.state.spotShadow,Gt.rectAreaLights.value=Q.state.rectArea,Gt.ltc_1.value=Q.state.rectAreaLTC1,Gt.ltc_2.value=Q.state.rectAreaLTC2,Gt.pointLights.value=Q.state.point,Gt.pointLightShadows.value=Q.state.pointShadow,Gt.hemisphereLights.value=Q.state.hemi,Gt.sunShadowMatrix.value=Q.state.sunShadowMatrix,Gt.sunShadowCascade.value=Q.state.sunShadowCascade,Gt.directionalShadowMatrix.value=Q.state.directionalShadowMatrix,Gt.spotLightMatrix.value=Q.state.spotLightMatrix,Gt.spotLightMap.value=Q.state.spotLightMap,Gt.pointShadowMatrix.value=Q.state.pointShadowMatrix),j.lightProbeGrid=A.state.lightProbeGridArray.length>0,j.currentProgram=Se,j.uniformsList=null,Se}function $n(S){if(S.uniformsList===null){let k=S.currentProgram.getUniforms();S.uniformsList=yr.seqWithValue(k.seq,S.uniforms)}return S.uniformsList}function hi(S,k){let it=J.get(S);it.outputColorSpace=k.outputColorSpace,it.batching=k.batching,it.batchingColor=k.batchingColor,it.instancing=k.instancing,it.instancingColor=k.instancingColor,it.instancingMorph=k.instancingMorph,it.skinning=k.skinning,it.morphTargets=k.morphTargets,it.morphNormals=k.morphNormals,it.morphColors=k.morphColors,it.morphTargetsCount=k.morphTargetsCount,it.numClippingPlanes=k.numClippingPlanes,it.numIntersection=k.numClipIntersection,it.vertexAlphas=k.vertexAlphas,it.vertexTangents=k.vertexTangents,it.toneMapping=k.toneMapping}function Er(S,k){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;b.setFromMatrixPosition(k.matrixWorld);for(let it=0,j=S.length;it<j;it++){let Q=S[it];if(Q.texture!==null&&Q.boundingBox.containsPoint(b))return Q}return null}function zi(S,k,it,j,Q){k.isScene!==!0&&(k=ne),K.resetTextureUnits();let Ft=k.fog,qt=j.isMeshStandardMaterial||j.isMeshLambertMaterial||j.isMeshPhongMaterial?k.environment:null,Nt=vt===null?F.outputColorSpace:vt.isXRRenderTarget===!0?vt.texture.colorSpace:Le.workingColorSpace,Jt=j.isMeshStandardMaterial||j.isMeshLambertMaterial&&!j.envMap||j.isMeshPhongMaterial&&!j.envMap,Vt=bt.get(j.envMap||qt,Jt),pe=j.vertexColors===!0&&!!it.attributes.color&&it.attributes.color.itemSize===4,Se=!!it.attributes.tangent&&(!!j.normalMap||j.anisotropy>0),Gt=!!it.morphAttributes.position,Ne=!!it.morphAttributes.normal,tn=!!it.morphAttributes.color,Ge=oi;j.toneMapped&&(vt===null||vt.isXRRenderTarget===!0)&&(Ge=F.toneMapping);let He=it.morphAttributes.position||it.morphAttributes.normal||it.morphAttributes.color,on=He!==void 0?He.length:0,Ht=J.get(j),gn=A.state.lights;if(ht===!0&&(rt===!0||S!==ut)){let Be=S===ut&&j.id===et;Zt.setState(j,S,Be)}let xe=!1;j.version===Ht.__version?(Ht.needsLights&&Ht.lightsStateVersion!==gn.state.version||Ht.outputColorSpace!==Nt||Q.isBatchedMesh&&Ht.batching===!1||!Q.isBatchedMesh&&Ht.batching===!0||Q.isBatchedMesh&&Ht.batchingColor===!0&&Q._colorsTexture===null||Q.isBatchedMesh&&Ht.batchingColor===!1&&Q._colorsTexture!==null||Q.isInstancedMesh&&Ht.instancing===!1||!Q.isInstancedMesh&&Ht.instancing===!0||Q.isSkinnedMesh&&Ht.skinning===!1||!Q.isSkinnedMesh&&Ht.skinning===!0||Q.isInstancedMesh&&Ht.instancingColor===!0&&Q.instanceColor===null||Q.isInstancedMesh&&Ht.instancingColor===!1&&Q.instanceColor!==null||Q.isInstancedMesh&&Ht.instancingMorph===!0&&Q.morphTexture===null||Q.isInstancedMesh&&Ht.instancingMorph===!1&&Q.morphTexture!==null||Ht.envMap!==Vt||j.fog===!0&&Ht.fog!==Ft||Ht.numClippingPlanes!==void 0&&(Ht.numClippingPlanes!==Zt.numPlanes||Ht.numIntersection!==Zt.numIntersection)||Ht.vertexAlphas!==pe||Ht.vertexTangents!==Se||Ht.morphTargets!==Gt||Ht.morphNormals!==Ne||Ht.morphColors!==tn||Ht.toneMapping!==Ge||Ht.morphTargetsCount!==on||!!Ht.lightProbeGrid!=A.state.lightProbeGridArray.length>0)&&(xe=!0):(xe=!0,Ht.__version=j.version);let Tn=Ht.currentProgram;xe===!0&&(Tn=sn(j,k,Q),$&&j.isNodeMaterial&&$.onUpdateProgram(j,Tn,Ht));let ln=!1,ui=!1,Ye=!1,Te=Tn.getUniforms(),Je=Ht.uniforms;if(x.useProgram(Tn.program)&&(ln=!0,ui=!0,Ye=!0),j.id!==et&&(et=j.id,ui=!0),Ht.needsLights){let Be=Er(A.state.lightProbeGridArray,Q);Ht.lightProbeGrid!==Be&&(Ht.lightProbeGrid=Be,ui=!0)}if(ln||ut!==S){x.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),Te.setValue(N,"projectionMatrix",S.projectionMatrix),Te.setValue(N,"viewMatrix",S.matrixWorldInverse);let di=Te.map.cameraPosition;di!==void 0&&di.setValue(N,Ct.setFromMatrixPosition(S.matrixWorld)),P.logarithmicDepthBuffer&&Te.setValue(N,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(j.isMeshPhongMaterial||j.isMeshToonMaterial||j.isMeshLambertMaterial||j.isMeshBasicMaterial||j.isMeshStandardMaterial||j.isShaderMaterial)&&Te.setValue(N,"isOrthographic",S.isOrthographicCamera===!0),ut!==S&&(ut=S,ui=!0,Ye=!0)}if(Ht.needsLights&&(gn.state.sunShadowMap.length>0&&Te.setValue(N,"sunShadowMap",gn.state.sunShadowMap,K),gn.state.directionalShadowMap.length>0&&Te.setValue(N,"directionalShadowMap",gn.state.directionalShadowMap,K),gn.state.spotShadowMap.length>0&&Te.setValue(N,"spotShadowMap",gn.state.spotShadowMap,K),gn.state.pointShadowMap.length>0&&Te.setValue(N,"pointShadowMap",gn.state.pointShadowMap,K)),Q.isSkinnedMesh){Te.setOptional(N,Q,"bindMatrix"),Te.setOptional(N,Q,"bindMatrixInverse");let Be=Q.skeleton;Be&&(Be.boneTexture===null&&Be.computeBoneTexture(),Te.setValue(N,"boneTexture",Be.boneTexture,K))}Q.isBatchedMesh&&(Te.setOptional(N,Q,"batchingTexture"),Te.setValue(N,"batchingTexture",Q._matricesTexture,K),Te.setOptional(N,Q,"batchingIdTexture"),Te.setValue(N,"batchingIdTexture",Q._indirectTexture,K),Te.setOptional(N,Q,"batchingColorTexture"),Q._colorsTexture!==null&&Te.setValue(N,"batchingColorTexture",Q._colorsTexture,K));let Yn=it.morphAttributes;if((Yn.position!==void 0||Yn.normal!==void 0||Yn.color!==void 0)&&G.update(Q,it,Tn),(ui||Ht.receiveShadow!==Q.receiveShadow)&&(Ht.receiveShadow=Q.receiveShadow,Te.setValue(N,"receiveShadow",Q.receiveShadow)),(j.isMeshStandardMaterial||j.isMeshLambertMaterial||j.isMeshPhongMaterial)&&j.envMap===null&&k.environment!==null&&(Je.envMapIntensity.value=k.environmentIntensity),Je.dfgLUT!==void 0&&(Je.dfgLUT.value=Ux()),ui){if(Te.setValue(N,"toneMappingExposure",F.toneMappingExposure),Ht.needsLights&&ws(Je,Ye),Ft&&j.fog===!0&&jt.refreshFogUniforms(Je,Ft),jt.refreshMaterialUniforms(Je,j,U,C,A.state.transmissionRenderTarget[S.id]),Ht.needsLights&&Ht.lightProbeGrid){let Be=Ht.lightProbeGrid;Je.probesSH.value=Be.texture,Je.probesMin.value.copy(Be.boundingBox.min),Je.probesMax.value.copy(Be.boundingBox.max),Je.probesResolution.value.copy(Be.resolution)}yr.upload(N,$n(Ht),Je,K)}if(j.isShaderMaterial&&j.uniformsNeedUpdate===!0&&(yr.upload(N,$n(Ht),Je,K),j.uniformsNeedUpdate=!1),j.isSpriteMaterial&&Te.setValue(N,"center",Q.center),Te.setValue(N,"modelViewMatrix",Q.modelViewMatrix),Te.setValue(N,"normalMatrix",Q.normalMatrix),Te.setValue(N,"modelMatrix",Q.matrixWorld),j.uniformsGroups!==void 0){let Be=j.uniformsGroups;for(let di=0,Sn=Be.length;di<Sn;di++){let Cs=Be[di];gt.update(Cs,Tn),gt.bind(Cs,Tn)}}return Tn}function ws(S,k){S.ambientLightColor.needsUpdate=k,S.lightProbe.needsUpdate=k,S.sunLights.needsUpdate=k,S.sunLightShadows.needsUpdate=k,S.directionalLights.needsUpdate=k,S.directionalLightShadows.needsUpdate=k,S.pointLights.needsUpdate=k,S.pointLightShadows.needsUpdate=k,S.spotLights.needsUpdate=k,S.spotLightShadows.needsUpdate=k,S.rectAreaLights.needsUpdate=k,S.hemisphereLights.needsUpdate=k}function Ea(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return st},this.getActiveMipmapLevel=function(){return nt},this.getRenderTarget=function(){return vt},this.setRenderTargetTextures=function(S,k,it){let j=J.get(S);j.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,j.__autoAllocateDepthBuffer===!1&&(j.__useRenderToTexture=!1),J.get(S.texture).__webglTexture=k,J.get(S.depthTexture).__webglTexture=j.__autoAllocateDepthBuffer?void 0:it,j.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,k){let it=J.get(S);it.__webglFramebuffer=k,it.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(S,k=0,it=0){vt=S,st=k,nt=it;let j=null,Q=!1,Ft=!1;if(S){let Nt=J.get(S);if(Nt.__useDefaultFramebuffer!==void 0){x.bindFramebuffer(N.FRAMEBUFFER,Nt.__webglFramebuffer),dt.copy(S.viewport),zt.copy(S.scissor),Ut=S.scissorTest,x.viewport(dt),x.scissor(zt),x.setScissorTest(Ut),et=-1;return}else if(Nt.__webglFramebuffer===void 0)K.setupRenderTarget(S);else if(Nt.__hasExternalTextures)K.rebindTextures(S,J.get(S.texture).__webglTexture,J.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let pe=S.depthTexture;if(Nt.__boundDepthTexture!==pe){if(pe!==null&&J.has(pe)&&(S.width!==pe.image.width||S.height!==pe.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");K.setupDepthRenderbuffer(S)}}let Jt=S.texture;(Jt.isData3DTexture||Jt.isDataArrayTexture||Jt.isCompressedArrayTexture)&&(Ft=!0);let Vt=J.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Vt[k])?j=Vt[k][it]:j=Vt[k],Q=!0):S.samples>0&&K.useMultisampledRTT(S)===!1?j=J.get(S).__webglMultisampledFramebuffer:Array.isArray(Vt)?j=Vt[it]:j=Vt,dt.copy(S.viewport),zt.copy(S.scissor),Ut=S.scissorTest}else dt.copy(ot).multiplyScalar(U).floor(),zt.copy(Dt).multiplyScalar(U).floor(),Ut=Qt;if(it!==0&&(j=q),x.bindFramebuffer(N.FRAMEBUFFER,j)&&x.drawBuffers(S,j),x.viewport(dt),x.scissor(zt),x.setScissorTest(Ut),Q){let Nt=J.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+k,Nt.__webglTexture,it)}else if(Ft){let Nt=k;for(let Jt=0;Jt<S.textures.length;Jt++){let Vt=J.get(S.textures[Jt]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Jt,Vt.__webglTexture,it,Nt)}}else if(S!==null&&it!==0){let Nt=J.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Nt.__webglTexture,it)}et=-1};function os(S){let k=J.get(S);return(k.__readFormat!==S.format||k.__readType!==S.type)&&(k.__readFormat=S.format,k.__readType=S.type,k.__formatReadable=P.textureFormatReadable(S.format),k.__typeReadable=P.textureTypeReadable(S.type)),k}this.readRenderTargetPixels=function(S,k,it,j,Q,Ft,qt,Nt=0){if(!(S&&S.isWebGLRenderTarget)){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Jt=J.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&qt!==void 0&&(Jt=Jt[qt]),Jt){x.bindFramebuffer(N.FRAMEBUFFER,Jt);try{let Vt=S.textures[Nt],pe=Vt.format,Se=Vt.type;S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Nt);let Gt=os(Vt);if(Gt.__formatReadable===!1){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Gt.__typeReadable===!1){le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=S.width-j&&it>=0&&it<=S.height-Q&&N.readPixels(k,it,j,Q,It.convert(pe),It.convert(Se),Ft)}finally{let Vt=vt!==null?J.get(vt).__webglFramebuffer:null;x.bindFramebuffer(N.FRAMEBUFFER,Vt)}}},this.readRenderTargetPixelsAsync=async function(S,k,it,j,Q,Ft,qt,Nt=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Jt=J.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&qt!==void 0&&(Jt=Jt[qt]),Jt)if(k>=0&&k<=S.width-j&&it>=0&&it<=S.height-Q){x.bindFramebuffer(N.FRAMEBUFFER,Jt);let Vt=S.textures[Nt],pe=Vt.format,Se=Vt.type;S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Nt);let Gt=os(Vt);if(Gt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Gt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ne=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,Ne),N.bufferData(N.PIXEL_PACK_BUFFER,Ft.byteLength,N.STREAM_READ),N.readPixels(k,it,j,Q,It.convert(pe),It.convert(Se),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let tn=vt!==null?J.get(vt).__webglFramebuffer:null;x.bindFramebuffer(N.FRAMEBUFFER,tn);let Ge=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await pd(N,Ge,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,Ne),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,Ft),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(Ne),N.deleteSync(Ge),Ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,k=null,it=0){let j=Math.pow(2,-it),Q=Math.floor(S.image.width*j),Ft=Math.floor(S.image.height*j),qt=k!==null?k.x:0,Nt=k!==null?k.y:0;K.setTexture2D(S,0),N.copyTexSubImage2D(N.TEXTURE_2D,it,0,0,qt,Nt,Q,Ft),x.unbindTexture()},this.copyTextureToTexture=function(S,k,it=null,j=null,Q=0,Ft=0){let qt,Nt,Jt,Vt,pe,Se,Gt,Ne,tn,Ge=S.isCompressedTexture?S.mipmaps[Ft]:S.image;if(it!==null)qt=it.max.x-it.min.x,Nt=it.max.y-it.min.y,Jt=it.isBox3?it.max.z-it.min.z:1,Vt=it.min.x,pe=it.min.y,Se=it.isBox3?it.min.z:0;else{let Je=Math.pow(2,-Q);qt=Math.floor(Ge.width*Je),Nt=Math.floor(Ge.height*Je),S.isDataArrayTexture?Jt=Ge.depth:S.isData3DTexture?Jt=Math.floor(Ge.depth*Je):Jt=1,Vt=0,pe=0,Se=0}j!==null?(Gt=j.x,Ne=j.y,tn=j.z):(Gt=0,Ne=0,tn=0);let He=It.convert(k.format),on=It.convert(k.type),Ht;k.isData3DTexture?(K.setTexture3D(k,0),Ht=N.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(K.setTexture2DArray(k,0),Ht=N.TEXTURE_2D_ARRAY):(K.setTexture2D(k,0),Ht=N.TEXTURE_2D),x.activeTexture(N.TEXTURE0),x.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,k.flipY),x.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),x.pixelStorei(N.UNPACK_ALIGNMENT,k.unpackAlignment);let gn=x.getParameter(N.UNPACK_ROW_LENGTH),xe=x.getParameter(N.UNPACK_IMAGE_HEIGHT),Tn=x.getParameter(N.UNPACK_SKIP_PIXELS),ln=x.getParameter(N.UNPACK_SKIP_ROWS),ui=x.getParameter(N.UNPACK_SKIP_IMAGES);x.pixelStorei(N.UNPACK_ROW_LENGTH,Ge.width),x.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Ge.height),x.pixelStorei(N.UNPACK_SKIP_PIXELS,Vt),x.pixelStorei(N.UNPACK_SKIP_ROWS,pe),x.pixelStorei(N.UNPACK_SKIP_IMAGES,Se);let Ye=S.isDataArrayTexture||S.isData3DTexture,Te=k.isDataArrayTexture||k.isData3DTexture;if(S.isDepthTexture){let Je=J.get(S),Yn=J.get(k),Be=J.get(Je.__renderTarget),di=J.get(Yn.__renderTarget);x.bindFramebuffer(N.READ_FRAMEBUFFER,Be.__webglFramebuffer),x.bindFramebuffer(N.DRAW_FRAMEBUFFER,di.__webglFramebuffer);for(let Sn=0;Sn<Jt;Sn++)Ye&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,J.get(S).__webglTexture,Q,Se+Sn),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,J.get(k).__webglTexture,Ft,tn+Sn)),N.blitFramebuffer(Vt,pe,qt,Nt,Gt,Ne,qt,Nt,N.DEPTH_BUFFER_BIT,N.NEAREST);x.bindFramebuffer(N.READ_FRAMEBUFFER,null),x.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(Q!==0||S.isRenderTargetTexture||J.has(S)){let Je=J.get(S),Yn=J.get(k);x.bindFramebuffer(N.READ_FRAMEBUFFER,D),x.bindFramebuffer(N.DRAW_FRAMEBUFFER,Z);for(let Be=0;Be<Jt;Be++)Ye?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Je.__webglTexture,Q,Se+Be):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Je.__webglTexture,Q),Te?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Yn.__webglTexture,Ft,tn+Be):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Yn.__webglTexture,Ft),Q!==0?N.blitFramebuffer(Vt,pe,qt,Nt,Gt,Ne,qt,Nt,N.COLOR_BUFFER_BIT,N.NEAREST):Te?N.copyTexSubImage3D(Ht,Ft,Gt,Ne,tn+Be,Vt,pe,qt,Nt):N.copyTexSubImage2D(Ht,Ft,Gt,Ne,Vt,pe,qt,Nt);x.bindFramebuffer(N.READ_FRAMEBUFFER,null),x.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else Te?S.isDataTexture||S.isData3DTexture?N.texSubImage3D(Ht,Ft,Gt,Ne,tn,qt,Nt,Jt,He,on,Ge.data):k.isCompressedArrayTexture?N.compressedTexSubImage3D(Ht,Ft,Gt,Ne,tn,qt,Nt,Jt,He,Ge.data):N.texSubImage3D(Ht,Ft,Gt,Ne,tn,qt,Nt,Jt,He,on,Ge):S.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,Ft,Gt,Ne,qt,Nt,He,on,Ge.data):S.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,Ft,Gt,Ne,Ge.width,Ge.height,He,Ge.data):N.texSubImage2D(N.TEXTURE_2D,Ft,Gt,Ne,qt,Nt,He,on,Ge);x.pixelStorei(N.UNPACK_ROW_LENGTH,gn),x.pixelStorei(N.UNPACK_IMAGE_HEIGHT,xe),x.pixelStorei(N.UNPACK_SKIP_PIXELS,Tn),x.pixelStorei(N.UNPACK_SKIP_ROWS,ln),x.pixelStorei(N.UNPACK_SKIP_IMAGES,ui),Ft===0&&k.generateMipmaps&&N.generateMipmap(Ht),x.unbindTexture()},this.initRenderTarget=function(S){J.get(S).__webglFramebuffer===void 0&&K.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?K.setTextureCube(S,0):S.isData3DTexture?K.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?K.setTexture2DArray(S,0):K.setTexture2D(S,0),x.unbindTexture()},this.resetState=function(){st=0,nt=0,vt=null,x.reset(),Lt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return si}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Le._getDrawingBufferColorSpace(t),e.unpackColorSpace=Le._getUnpackColorSpace()}};var Kd={type:"change"},Dh={type:"start"},tf={type:"end"},kl=new $i,Qd=new zn,Fx=Math.cos(70*an.DEG2RAD),mn=new O,Fn=2*Math.PI,Xe={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Lh=1e-6,br=class extends ca{constructor(t,e=null){super(t,e),this.state=Xe.NONE,this.target=new O,this.cursor=new O,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ts.ROTATE,MIDDLE:ts.DOLLY,RIGHT:ts.PAN},this.touches={ONE:es.ROTATE,TWO:es.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new O,this._lastQuaternion=new Vn,this._lastTargetPosition=new O,this._quat=new Vn().setFromUnitVectors(t.up,new O(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new fr,this._sphericalDelta=new fr,this._scale=1,this._panOffset=new O,this._rotateStart=new St,this._rotateEnd=new St,this._rotateDelta=new St,this._panStart=new St,this._panEnd=new St,this._panDelta=new St,this._dollyStart=new St,this._dollyEnd=new St,this._dollyDelta=new St,this._dollyDirection=new O,this._mouse=new St,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Bx.bind(this),this._onPointerDown=Ox.bind(this),this._onPointerUp=zx.bind(this),this._onContextMenu=qx.bind(this),this._onMouseWheel=Gx.bind(this),this._onKeyDown=Hx.bind(this),this._onTouchStart=Wx.bind(this),this._onTouchMove=Xx.bind(this),this._onMouseDown=kx.bind(this),this._onMouseMove=Vx.bind(this),this._interceptControlDown=$x.bind(this),this._interceptControlUp=Yx.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=Xe.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Kd),this.update(),this.state=Xe.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;mn.copy(e).sub(this.target),mn.applyQuaternion(this._quat),this._spherical.setFromVector3(mn),this.autoRotate&&this.state===Xe.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Fn:n>Math.PI&&(n-=Fn),s<-Math.PI?s+=Fn:s>Math.PI&&(s-=Fn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(mn.setFromSpherical(this._spherical),mn.applyQuaternion(this._quatInverse),e.copy(this.target).add(mn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=mn.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new O(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new O(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=mn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(kl.origin.copy(this.object.position),kl.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(kl.direction))<Fx?this.object.lookAt(this.target):(Qd.setFromNormalAndCoplanarPoint(this.object.up,this.target),kl.intersectPlane(Qd,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Lh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Lh||this._lastTargetPosition.distanceToSquared(this.target)>Lh?(this.dispatchEvent(Kd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Fn/60*this.autoRotateSpeed*t:Fn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){mn.setFromMatrixColumn(e,0),mn.multiplyScalar(-t),this._panOffset.add(mn)}_panUp(t,e){this.screenSpacePanning===!0?mn.setFromMatrixColumn(e,1):(mn.setFromMatrixColumn(e,0),mn.crossVectors(this.object.up,mn)),mn.multiplyScalar(t),this._panOffset.add(mn)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;mn.copy(s).sub(this.target);let r=mn.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Fn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Fn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Fn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Fn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Fn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Fn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Fn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Fn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new St,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Ox(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Bx(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function zx(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(tf),this.state=Xe.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function kx(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case ts.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Xe.DOLLY;break;case ts.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xe.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xe.ROTATE}break;case ts.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xe.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xe.PAN}break;default:this.state=Xe.NONE}this.state!==Xe.NONE&&this.dispatchEvent(Dh)}function Vx(i){switch(this.state){case Xe.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Xe.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Xe.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Gx(i){this.enabled===!1||this.enableZoom===!1||this.state!==Xe.NONE||(i.preventDefault(),this.dispatchEvent(Dh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(tf))}function Hx(i){this.enabled!==!1&&this._handleKeyDown(i)}function Wx(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case es.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Xe.TOUCH_ROTATE;break;case es.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Xe.TOUCH_PAN;break;default:this.state=Xe.NONE}break;case 2:switch(this.touches.TWO){case es.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Xe.TOUCH_DOLLY_PAN;break;case es.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Xe.TOUCH_DOLLY_ROTATE;break;default:this.state=Xe.NONE}break;default:this.state=Xe.NONE}this.state!==Xe.NONE&&this.dispatchEvent(Dh)}function Xx(i){switch(this._trackPointer(i),this.state){case Xe.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Xe.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Xe.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Xe.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Xe.NONE}}function qx(i){this.enabled!==!1&&i.preventDefault()}function $x(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Yx(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Vl=Mf(nf());var Me=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Sa=(i,t=2)=>Number(i).toLocaleString("pt-BR",{minimumFractionDigits:t,maximumFractionDigits:t}),Kx={interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptores paralelos (three-way)",interruptor_intermediario:"Paralelos + intermediário (four-way)",pulsador_rele_impulso:"Pulsadores com relé de impulso",contator_botoeira:"Contator com botoeira liga/desliga e selo",sensor_presenca:"Sensor de presença",dimmer:"Dimmer",dimmer_010:"Controlador 0-10 V",dali:"DALI-2",cena:"DALI-2 com teclado de cenas"};function Qx(i,t){let e=`${i||""}|${(t.quadros||[]).map(s=>s.tag).join(",")}|${(t.circuitos||[]).map(s=>s.id).join(",")}`,n=0;for(let s=0;s<e.length;s++)n=n*31+e.charCodeAt(s)|0;return`hm3d-sim:${(n>>>0).toString(36)}`}function Gl(i,t){let e=(0,Vl.criarSimulador)(i),n=Qx(t,i);try{let s=window.sessionStorage.getItem(n);s&&e.importar(JSON.parse(s))}catch{}return e.assinar(()=>{try{window.sessionStorage.setItem(n,JSON.stringify(e.exportar()))}catch{}}),e}var qn=(i,t)=>t==null||t===""?"":`<tr><th>${Me(i)}</th><td>${t}</td></tr>`,Uh=(i,t="ligado",e="desligado")=>`<b class="${i?"sim-on":"sim-off"}">${i?t:e}</b>`;function Fh(i,t,{abrir:e=!0}={}){let n=i.circuito(t);if(!n)return"";let s=i.quadro(n.quadro),r=(s?.disjuntores||[]).find(h=>h.tag===n.disjuntor),a=(s?.drs||[]).filter(h=>!h.ddr&&(h.circuitos||[]).map(String).includes(String(n.id))),o=(s?.drs||[]).some(h=>h.ddr&&h.tag===n.disjuntor),l=(h,p)=>{let u=i.ligado(h,p);return`<button class="sim-b" data-sim="disjuntor" data-tag="${Me(h)}" data-quadro="${Me(p)}">${u?"Desligar":"Ligar"} ${Me(h)}</button>`},c=i.motivo(n.id);return`<div class="sim-circ"><div class="sim-tit">Circuito ${Me(n.id)}${n.descricao?` — ${Me(n.descricao)}`:""}</div>
<table>${qn("Estado",c?`<b class="sim-off">sem energia</b> <small>(${Me(c)})</small>`:'<b class="sim-on">energizado</b>')}
${s?.geral?qn(`Geral ${s.geral.tag}`,`${Uh(i.ligado(s.geral.tag,s.tag))} · ${Me(s.geral.In??"—")} A`):""}
${a.map(h=>qn(`DR ${h.tag}`,`${Uh(i.ligado(h.tag,s.tag))} · ${Me(h.idn_ma??30)} mA`)).join("")}
${r?qn(`${o?"DDR":"Disjuntor"} ${r.tag}`,`${Uh(i.ligado(r.tag,s.tag))} · ${Me(r.In??"—")} A${r.curva?` curva ${Me(r.curva)}`:""}${r.polos?` · ${Me(r.polos)}P`:""}`):""}
${qn("Quadro",Me(n.quadro))}
${Number(n.potencia_va)>0?qn("Potência",`${Sa(n.potencia_va,0)} VA`):""}
${n.ib_a!=null?qn("Corrente de projeto Ib",`${Sa(n.ib_a,1)} A`):""}
${n.secao_mm2!=null?qn("Seção",`${Sa(n.secao_mm2,1)} mm²`):""}
${n.queda_pct!=null?qn("Queda de tensão",`${Sa(n.queda_pct,2)} %${n.comprimento_m!=null?` em ${Sa(n.comprimento_m,0)} m`:""}`):""}</table>
<div class="sim-bs">${r?l(r.tag,s.tag):""}${a.map(h=>l(h.tag,s.tag)).join("")}${s&&e?`<button class="sim-b" data-sim="abrir-quadro" data-quadro="${Me(s.tag)}">Abrir o quadro ${Me(s.tag)}</button>`:""}</div></div>`}function Hl(i){if(!i)return"";let t=i.sinaleiros,e=(s,r,a)=>`<span class="sim-luz ${s?"acesa":""}" style="--c:${r}" title="${Me(a)}"><i></i>${Me(a)}</span>`,n=(s,r,a="")=>`<button class="sim-b ${a}" data-sim="motor" data-motor="${Me(i.id)}" data-acao="${s}">${r}</button>`;return`<div class="sim-painel"><div class="sim-tit">Painel de comando — ${Me(i.id)}${i.descricao?` <small>${Me(i.descricao)}</small>`:""}</div>
<div class="sim-luzes">${e(t.branco,"#f5f5f5","ENERGIZADO")}${e(t.verde,"#3fb950","EM OPERAÇÃO")}${e(t.amarelo,"#f2c94c","ALARME")}${e(t.vermelho,"#e5484d","FALHA / EMERGÊNCIA")}</div>
<div class="sim-est">${i.girando?'<b class="sim-on">motor em operação</b>':`<b class="sim-off">parado</b>${i.alimentado?"":` <small>(${Me(i.motivo)})</small>`}`} · contator ${i.contator?"fechado (selo)":"aberto"} · relé térmico ${i.termico?'<b class="sim-off">DESARMADO</b>':"armado"}</div>
<div class="sim-bs">${n("liga","LIGA","liga")}${n("desliga","DESLIGA","desliga")}${i.emergenciaLocal?n("liberar","Soltar emergência","emerg"):n("emergencia","EMERGÊNCIA","emerg")}
${i.termico?n("rearmar","Rearmar térmico"):n("desarmar_termico","Simular térmico desarmado")}</div></div>`}function sf(i,t,{rotulo:e="",ambiente:n=""}={}){let s=i.ponto(t);if(!s)return"";let r=i.estadoPonto(t),a=s.comando?i.comando(s.comando):null,o=a&&(a.dispositivos||[]).map(String).includes(String(t)),l=`${Me(e||Vl.ROTULO_PONTO[s.tipo]||s.tipo)} · ${Me(s.id)}`,c=r.energizado?"sim-on":"sim-off",h="";if(a){let u=i.estadoComando(a.id);if(a.tipo==="contator_botoeira"){let f=(_,y,g="")=>`<button class="sim-b ${g}" data-sim="acionar" data-ponto="${Me(o?t:a.dispositivos?.[0]??t)}" data-acao="${_}">${y}</button>`;h=`${f("liga","LIGA","liga")}${f("desliga","DESLIGA","desliga")}${u.emergencia?f("liberar","Soltar emergência","emerg"):f("emergencia","EMERGÊNCIA","emerg")}`}else if(["dimmer","dimmer_010","dali"].includes(a.tipo))h=`<button class="sim-b" data-sim="acionar" data-ponto="${Me(t)}">${u.saida>0?"Desligar":"Ligar"}</button>${[.25,.5,1].map(f=>`<button class="sim-b" data-sim="acionar" data-ponto="${Me(t)}" data-nivel="${f}">${f*100} %</button>`).join("")}`;else{let f=s.tipo==="pulsador"?"Apertar o pulsador":s.tipo==="sensor"?u.presenca?"Simular ambiente vazio":"Simular presença":s.tipo==="teclado_cena"?"Próxima cena":o?"Acionar":`Acionar o comando ${Me(a.id)}`;h=`<button class="sim-b" data-sim="acionar" data-ponto="${Me(t)}">${f}</button>`}}let p=s.tipo==="motor"?i.painel(s.circuito):null;return`<div class="sim-tit grande">${l}</div>
<div class="sim-est"><b class="${c}">${Me(r.texto)}</b>${n?` · ${Me(n)}`:""}</div>
${a?`<table>${qn("Comando",`${Me(a.id)} — ${Me(Kx[a.tipo]||a.tipo)}`)}${a.rele?.tag?qn(a.rele.tipo==="impulso"?"Relé de impulso":"Contator",`${Me(a.rele.tag)} · ${i.estadoComando(a.id).saida>0?"fechado":"aberto"}`):""}${qn("Dispositivos",Me((a.dispositivos||[]).join(", ")))}${qn("Comanda",`${(a.pontos||[]).length} ponto(s)`)}</table>`:""}
${h?`<div class="sim-bs">${h}</div>`:""}${p?Hl(p):""}${s.circuito?Fh(i,s.circuito):""}`}function rf(i,t){let e=i.quadro(t);if(!e)return"";let n=(a,o,l)=>{let c=i.ligado(a,e.tag);return`<button class="sim-dj ${c?"on":"off"}" data-sim="disjuntor" data-tag="${Me(a)}" data-quadro="${Me(e.tag)}" title="${c?"Desligar":"Ligar"} ${Me(a)}"><i></i><b>${Me(a)}</b><span>${Me(o)}${l?` <small>${Me(l)}</small>`:""}</span></button>`},s=a=>i.circuito(a),r=i.paineis().filter(a=>String(a.quadro)===String(e.tag));return`<div class="sim-lista">${e.geral?n(e.geral.tag,`Geral ${e.geral.In??""} A`,""):""}
${(e.drs||[]).filter(a=>!a.ddr).map(a=>n(a.tag,`DR ${a.idn_ma??30} mA`,`circuitos ${(a.circuitos||[]).join(", ")}`)).join("")}
${(e.disjuntores||[]).map(a=>{let o=s(a.circuito);return n(a.tag,`${a.In??""} A — circuito ${a.circuito}`,o?.descricao||"")}).join("")}</div>
${r.length?`<div class="sim-bs"><button class="sim-b emerg" data-sim="emergencia-quadro" data-quadro="${Me(e.tag)}">${i.emergenciaDoQuadro(e.tag)?"Soltar a emergência do quadro":"EMERGÊNCIA do quadro"}</button></div>${r.map(Hl).join("")}`:""}
<div class="sim-bs"><button class="sim-b" data-sim="reiniciar">Religar tudo (estado inicial)</button></div>`}function ba(i,t,{abrirQuadro:e,aviso:n}={}){i.addEventListener("click",s=>{let r=s.target.closest("[data-sim]");if(!r||!i.contains(r))return;s.stopPropagation();let a=r.dataset,o=null;if(a.sim==="disjuntor")t.alternar(a.tag,a.quadro),o=`${a.tag} ${t.ligado(a.tag,a.quadro)?"ligado":"desligado"}`;else if(a.sim==="acionar")o=t.acionar(a.ponto,a.nivel!=null?Number(a.nivel):a.acao||void 0);else if(a.sim==="motor")o=t.motor(a.motor,a.acao);else if(a.sim==="emergencia-quadro"){let l=!t.emergenciaDoQuadro(a.quadro);t.emergenciaQuadro(a.quadro,l),o=l?"Emergência do quadro acionada: motores parados":"Emergência do quadro liberada"}else a.sim==="reiniciar"?(t.reiniciar(),o="Simulação reiniciada"):a.sim==="abrir-quadro"&&e&&e(a.quadro);o&&n&&n(o)})}function Wl(){let i=document.createElement("div");i.className="sim-aviso",document.body.appendChild(i);let t=0;return e=>{i.textContent=e,i.classList.add("visivel"),clearTimeout(t),t=setTimeout(()=>i.classList.remove("visivel"),2600)}}function af(i,t){let a=[],o=new Set,l=y=>({tag:y.tag,l:Math.max(1,Number(y.polos)||1)*18,tipo:"disjuntor",d:y});i.geral&&a.push({tag:i.geral.tag,l:Math.max(1,Number(i.geral.polos)||2)*18,tipo:"geral",d:i.geral});for(let y of i.drs||[])if(!y.ddr){a.push({tag:y.tag,l:(Number(y.polos)>=4?4:2)*18,tipo:"dr",d:y});for(let g of y.circuitos||[]){let m=(i.disjuntores||[]).find(R=>String(R.circuito)===String(g));m&&!o.has(m.tag)&&(o.add(m.tag),a.push(l(m)))}}for(let y of i.disjuntores||[])o.has(y.tag)||a.push(l(y));let c=[[]],h=0;for(let y of a)h+y.l>324&&c[c.length-1].length&&(c.push([]),h=0),c[c.length-1].push(y),h+=y.l;let p=Math.max(300,444),u=Math.max(400,c.length*150+220),f=120,_=[];return c.forEach((y,g)=>{let m=u-150-g*150;_.push({camada:"trilhos",x:60,y:m-17.5,z:20,l:p-120,a:35,p:7.5,cor:"#b8bcc2",metal:!0,rotulo:"Trilho DIN 35 mm",semEtiqueta:!0,info:[["Peça","Trilho DIN 35 × 7,5 mm"]]});let R=66;for(let I of y){let b=I.tipo==="disjuntor"?t?.circuito(I.d.circuito):null,T=I.tipo==="geral"?`Disjuntor geral ${I.d.In??""} A`:I.tipo==="dr"?`DR ${I.d.In??""} A / ${I.d.idn_ma??30} mA — circuitos ${(I.d.circuitos||[]).join(", ")}`:`Disjuntor ${I.d.In??""} A${I.d.curva?` curva ${I.d.curva}`:""} — circuito ${I.d.circuito}${b?.descricao?` (${b.descricao})`:""}`;_.push({camada:"protecao",tag:I.tag,x:R,y:m-90/2,z:27.5,l:I.l,a:90,p:70,cor:I.tipo==="dr"?"#cfe3ff":"#f1f3f5",rotulo:I.tag,dica:`${I.tag} — ${T}`,info:[["TAG",I.tag],["Dispositivo",T],["Medidas",`${I.l} × 90 mm (típicas)`]]}),R+=I.l}}),{tipo:"quadro",titulo:`${i.tag} — ${i.descricao||"Quadro"}`,esquematico:!0,involucro:{L:p,A:u,P:f,espessura:2,cor:"#d6d4cf",rotulo:`Quadro ${i.tag}`,info:[["Quadro",i.tag],["Arranjo","esquemático (sem o caderno de fabricação)"]]},porta:{itens:[{x:(p-120)/2,y:u-70,l:120,a:40,p:2,cor:"#f4f1e8",rotulo:i.tag,info:[["Placa de identificação",i.tag]]}],rotulo:"Porta",info:[["Porta","frontal, articulada à esquerda"]]},portaAberta:!0,caixas:_,camadas:[{id:"protecao",rotulo:"Proteção (disjuntores e DR)",cor:"#e9ecef"},{id:"trilhos",rotulo:"Trilhos DIN",cor:"#b8bcc2"}],numeros:[["disjuntores",String((i.disjuntores||[]).length)],["DR",String((i.drs||[]).filter(y=>!y.ddr).length)]],avisos:["Arranjo esquemático: o modelo não trouxe o quadro do caderno de fabricação (skill quadros)."]}}var ze=.001,Oi=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function Oh(i,t={}){let e=t.raiz||document,n=H=>e.querySelector(H),s=n("#tela"),r;try{r=new Mr({canvas:s,antialias:!0,preserveDrawingBuffer:!0})}catch(H){let yt=n("#semwebgl")||document.querySelector("#semwebgl");throw yt&&(yt.style.display="flex"),H}r.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),r.outputColorSpace=En;let a=new ms;a.background=new ue("#14161b");let o=!0,l=()=>{o=!0},{L:c,A:h,P:p}=i.involucro,u=i.involucro.espessura||2,f=Math.hypot(c,h,p)*ze,_=new O(c*ze/2,h*ze/2,p*ze/2),y=new un(38,1,.01,f*40),g=new br(y,s);g.enableDamping=!0,g.dampingFactor=.08,g.target.copy(_),g.minDistance=.1,g.maxDistance=f*8,g.zoomToCursor=!0,g.addEventListener("change",l),a.add(new vs("#ffffff","#55524a",1.5)),a.add(new ys("#ffffff",.55));let m=new Qi("#fff4e0",1.3);m.position.set(c*ze*1.5,h*ze*2,p*ze*6+1),a.add(m);let R=new Qi("#dfe8ff",.5);R.position.set(-c*ze,h*ze,p*ze*3),a.add(R);let I={caixa:new Gn(1,1,1),cilindro:new Ni(.5,.5,1,28)};I.cilindro.rotateX(Math.PI/2);let b={caixa:new Yr(I.caixa)},T=new Map;function A(H,yt,Mt){let kt=`${H}|${yt}|${Mt?1:0}`;return T.has(kt)||T.set(kt,new vn({color:H,roughness:Mt?.35:.65,metalness:Mt?.65:.05,transparent:yt<1,opacity:yt,depthWrite:yt>=.99})),T.get(kt)}let L=new Map;function v(H,yt){let Mt=`${H}|${yt}`;return L.has(Mt)||L.set(Mt,new ai({color:new ue(H).multiplyScalar(.45),transparent:yt<1,opacity:Math.min(1,yt+.25)})),L.get(Mt)}let w={},F=(H,yt=a)=>(w[H]||(w[H]=new In,w[H].name=H,yt.add(w[H])),w[H]),z=[],$=[],q=new In,D=[];function Z(H,yt){let Mt=Math.max(.5,H.l)*ze,kt=Math.max(.5,H.a)*ze,Re=Math.max(.5,H.p)*ze,se=H.forma==="cilindro"?"cilindro":"caixa",Fe=H.opacidade??1,$e=H.cor||"#cccccc",me=new qe(I[se],A($e,Fe,H.metal));return me.scale.set(Mt,se==="cilindro"?Mt:kt,Re),me.position.set(H.x*ze+Mt/2,H.y*ze+kt/2,H.z*ze+Re/2),!H.semBorda&&se==="caixa"&&me.add(new xi(b.caixa,v($e,Fe))),me.userData=H,H.info&&z.push(me),H.rotulo&&!H.semEtiqueta&&$.push({mesh:me,texto:H.rotulo,el:null,porta:yt===q}),H.tag&&D.push(me),yt.add(me),me}let st=i.involucro.cor||"#d6d4cf",nt=F("involucro");[{x:0,y:0,z:0,l:c,a:h,p:u},{x:0,y:0,z:0,l:u,a:h,p},{x:c-u,y:0,z:0,l:u,a:h,p},{x:0,y:h-u,z:0,l:c,a:u,p},{x:0,y:0,z:0,l:c,a:u,p}].forEach(H=>Z({...H,cor:st,rotulo:i.involucro.rotulo,info:i.involucro.info,semEtiqueta:!0},nt)),q.position.set(0,0,p*ze),a.add(q),w.porta=q,Z({x:0,y:0,z:0,l:c,a:h,p:u,cor:st,rotulo:i.porta&&i.porta.rotulo,info:i.porta&&i.porta.info,semEtiqueta:!0},q);for(let H of i.porta&&i.porta.itens||[])Z({...H,z:u+(H.z||0)},q);for(let H of i.caixas||[])Z(H,F(H.camada||"outros"));let vt=-Math.PI*.58,et=i.portaAberta===!1?0:vt;q.rotation.y=et,t.portaFechada&&(et=0,q.rotation.y=0,setTimeout(()=>K(!0),350));let ut=()=>Math.abs(q.rotation.y)>.2,dt=null,zt=new WeakMap,Ut=H=>zt.get(H)||H.material;function we(H,yt){zt.set(H,yt),H.material=H===dt?Zt(yt):yt}let de=new WeakMap,B=t.sim||(i.instalacao&&Array.isArray(i.instalacao.quadros)?Gl(i.instalacao,i.titulo):null),C=B?String(t.quadroTag||B.quadros()[0]?.tag||""):"",U=B?t.aviso||Wl():null,Y=new WeakMap,pt=H=>H&&Y.get(H)||null,ot=[],Dt=[],Qt=-.55,ft=.55,ht=new Map;function rt(H,yt,Mt){let kt=`${H.uuid}|${yt}`;if(!ht.has(kt)){let Re=H.clone();Mt(Re),ht.set(kt,Re)}return ht.get(kt)}let _t=(H,yt,Mt)=>rt(H,`b${yt}${Mt}`,kt=>{kt.emissive.set(yt),kt.emissiveIntensity=Mt}),Ct=H=>rt(H,"escuro",yt=>{yt.color.multiplyScalar(.35)});function $t(H,yt){let Mt=H.scale.x,kt=H.scale.y,Re=H.scale.z,se=new In;se.position.set(H.position.x,H.position.y,H.position.z+Re/2);let Fe=new In,$e=Math.min(.016,Math.max(.008,kt*.2)),me=new qe(I.caixa,A("#2b2d31",1,!1));me.scale.set(Math.min(.012,Mt*.45),Math.max(.004,$e*.45),$e),me.position.set(0,0,$e/2),Fe.add(me);let sn=new qe(I.caixa,A("#d62828",1,!1));sn.scale.set(Math.min(.008,Mt*.4),Math.min(.006,kt*.07),.0015),sn.position.set(0,kt*.27,8e-4),se.add(Fe,sn),H.parent.add(se);for(let hi of[me,sn])de.set(hi,H),hi.userData=H.userData;z.push(me);let $n=B.ligado(yt.tag,C);Fe.rotation.x=$n?Qt:ft,ot.push({giro:Fe,band:sn,tag:yt.tag,alvo:Fe.rotation.x})}if(B){let H=B.quadro(C),yt=B.paineis().filter(kt=>String(kt.quadro)===C).map(kt=>kt.id),Mt={};for(let kt of D){let Re=String(kt.userData.tag),se=null;if(H&&B.dispositivo(Re,C))se={tipo:"protecao",tag:Re};else{let Fe=Re.match(/^(.+)\/([A-Z]+)(\d*)$/),$e=Re.match(/^(liga|desliga|emergencia|reset|seletor|sinaleiro_verde|sinaleiro_vermelho|sinaleiro_amarelo|sinaleiro_branco):\d+$/);if(Fe&&yt.includes(Fe[1])){let me=`${Fe[1]}-${Fe[2]}${Fe[3]}`;se=Fe[2]==="Q"&&B.dispositivo(me,C)?{tipo:"protecao",tag:me,motor:Fe[1]}:Fe[2]==="K"?{tipo:"contator",motor:Fe[1]}:Fe[2]==="F"?{tipo:"termico",motor:Fe[1]}:{tipo:"partida",motor:Fe[1]}}else if($e){let me=$e[1],sn=Mt[me]=(Mt[me]??-1)+1,$n=yt.length?yt[sn%yt.length]:null;me==="emergencia"?se={tipo:"porta",acao:"emergencia"}:me==="reset"?se={tipo:"porta",acao:"rearme"}:me==="liga"||me==="desliga"?se=$n?{tipo:"porta",acao:me,motor:$n}:null:me==="seletor"?se=$n?{tipo:"porta",acao:"alternar",motor:$n}:null:se={tipo:"sinaleiro",sinal:me.slice(10),motor:me==="sinaleiro_branco"?null:$n}}}se&&(Y.set(kt,se),se.tipo==="protecao"&&kt.parent!==q&&$t(kt,se),se.tipo!=="porta"&&(se.tipo!=="protecao"||se.motor)&&Dt.push({mesh:kt,el:se,base:kt.material}))}}function ne(H){if(!H)return null;if(H.tipo==="protecao")return B.alternar(H.tag,C),`${H.tag} ${B.ligado(H.tag,C)?"ligado":"desligado"}`;if(H.tipo!=="porta")return null;if(H.acao==="emergencia"){let yt=!B.emergenciaDoQuadro(C);return B.emergenciaQuadro(C,yt),yt?"EMERGÊNCIA acionada: motores parados (clique de novo para soltar)":"Emergência liberada (aperte LIGA)"}if(H.acao==="rearme"){for(let yt of B.paineis())String(yt.quadro)===C&&yt.termico&&B.motor(yt.id,"rearmar");return"Rearme: relés térmicos rearmados"}return H.acao==="alternar"?B.motor(H.motor,B.painel(H.motor).contator?"desliga":"liga"):B.motor(H.motor,H.acao)}let re=B?n("#simulacao"):null;function oe(){if(!B)return;let H=B.quadro(C),yt=!H?.geral||B.ligado(H.geral.tag,C);for(let Mt of ot){let kt=B.ligado(Mt.tag,C);Mt.alvo=kt?Qt:ft,we(Mt.band,A(kt?"#d62828":"#2f9e44",1,!1))}for(let Mt of Dt){let kt=Mt.el.motor?B.painel(Mt.el.motor):null,Re=Mt.base;if(Mt.el.tipo==="contator"||Mt.el.tipo==="partida")kt?.girando&&(Re=_t(Mt.base,"#2fbf5a",.6));else if(Mt.el.tipo==="termico"||Mt.el.tipo==="protecao")kt?.termico&&(Re=_t(Mt.base,"#e0a000",.9));else if(Mt.el.tipo==="sinaleiro"){let se=Mt.el.sinal;Re=(se==="branco"?yt:kt?!!kt.sinaleiros[se]:se==="vermelho"&&B.emergenciaDoQuadro(C))?_t(Mt.base,`#${Mt.base.color.getHexString()}`,1.6):Ct(Mt.base)}we(Mt.mesh,Re)}re&&(re.innerHTML=rf(B,C)),ct(),l()}let N=B?B.assinar(oe):()=>{};re&&ba(re,B,{aviso:U}),B&&n("#info")&&ba(n("#info"),B,{aviso:U});let Ae=null;function ve(H,yt,Mt=700){let kt=y.position.clone(),Re=g.target.clone(),se=performance.now();Ae=Fe=>{let $e=Math.min(1,(Fe-se)/Mt),me=$e*$e*(3-2*$e);y.position.lerpVectors(kt,H,me),g.target.lerpVectors(Re,yt,me),$e>=1&&(Ae=null)},l()}let P=()=>Math.max(h*ze,c*ze/Math.max(.3,y.aspect*.72))/(2*Math.tan(y.fov*Math.PI/180/2))*1.42+p*ze;function x(H){let yt=window.innerWidth>900?c*ze*.35:0,Mt=new O(c*ze/2+yt,h*ze/2+h*ze*.03,p*ze*.3),kt=new O(c*ze/2+yt,h*ze/2+h*ze*.03,P());H?(y.position.copy(kt),g.target.copy(Mt),l()):ve(kt,Mt)}function V(H){let yt=P()*1.05,Mt=_.clone().add(new O(window.innerWidth>900?c*ze*.3:0,0,0)),kt=new O(c*ze/2+yt*.38,h*ze*.6+yt*.2,yt*.95);H?(y.position.copy(kt),g.target.copy(Mt),l()):ve(kt,Mt)}function J(H,yt){w[H]&&(w[H].visible=yt),document.querySelectorAll(`[data-camada="${H}"]`).forEach(Mt=>Mt.classList.toggle("ativo",yt)),l()}function K(H=!0){et=H?vt:0,n("#b-porta")&&n("#b-porta").classList.toggle("ativo",H),l()}function bt(H=!0){J("involucro",!H),J("porta",!H),n("#b-placa")&&n("#b-placa").classList.toggle("ativo",H)}let wt=n("#camadas");for(let H of i.camadas||[]){let yt=document.createElement("button");yt.className="leg ativo",yt.dataset.camada=H.id,yt.style.setProperty("--cor",H.cor),yt.innerHTML=`<i></i><span>${Oi(H.rotulo)}${H.qtd!=null?` <small>${Oi(H.qtd)}</small>`:""}</span>`,yt.onclick=()=>J(H.id,!(!w[H.id]||w[H.id].visible)),wt&&wt.appendChild(yt)}let at=n("#numeros");at&&(at.innerHTML=(i.numeros||[]).map(([H,yt])=>`<div class="num"><div>${Oi(yt)}</div><small>${Oi(H)}</small></div>`).join(""));let lt=(H,yt)=>{let Mt=n(H);Mt&&(Mt.onclick=yt)};lt("#b-porta",()=>K(et===0)),lt("#b-sem-porta",()=>{let H=!w.porta.visible;J("porta",H),n("#b-sem-porta").classList.toggle("ativo",!H)}),lt("#b-involucro",()=>{let H=!w.involucro.visible;J("involucro",H),n("#b-involucro").classList.toggle("ativo",!H)}),lt("#b-frente",()=>x()),lt("#b-3d",()=>V()),lt("#b-placa",()=>{let H=!n("#b-placa").classList.contains("ativo");bt(H),H&&x()});let xt=!0;lt("#b-etiquetas",()=>{xt=!xt,n("#b-etiquetas").classList.toggle("ativo",xt),l()}),n("#b-etiquetas")&&n("#b-etiquetas").classList.add("ativo"),n("#b-porta")&&n("#b-porta").classList.toggle("ativo",et!==0),lt("#b-tela",()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}),lt("#b-voltar-predio",()=>{t.aoVoltar&&t.aoVoltar()});let jt=new Ms,Et=new St,Rt=new Map;function Zt(H){if(!Rt.has(H)){let yt=H.clone();yt.emissive.set("#5a4500"),Rt.set(H,yt)}return Rt.get(H)}function Xt(H){for(let yt=H;yt;yt=yt.parent)if(!yt.visible)return!1;return!0}function fe(H){let yt=s.getBoundingClientRect();return Et.set((H.clientX-yt.left)/yt.width*2-1,-((H.clientY-yt.top)/yt.height)*2+1),jt.setFromCamera(Et,y),jt.intersectObjects(z.filter(Xt),!1)[0]||null}let G=H=>`<b class="tag">${Oi(H.rotulo||"")}</b><table>${(H.info||[]).map(([yt,Mt])=>`<tr><th>${Oi(yt)}</th><td>${/^https?:/.test(String(Mt))?`<a href="${Oi(Mt)}" target="_blank" rel="noopener">${Oi(Mt)}</a>`:Oi(Mt)}</td></tr>`).join("")}</table>`,Pt=null;function ct(){let H=n("#info");if(!H)return;if(!Pt){H.innerHTML=`<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.${B?" Clique num disjuntor para ligar/desligar.":""}</small>`;return}let yt=Pt.userData,Mt=B&&pt(Pt),kt="";if(Mt?.tipo==="protecao"){let Re=B.dispositivo(Mt.tag,C),se=Re?.tipo==="dr"?null:Re?.item?.circuito??null;kt=se!=null?Fh(B,se,{abrir:!1}):`<div class="sim-est">${Mt.tag}: <b class="${B.ligado(Mt.tag,C)?"sim-on":"sim-off"}">${B.ligado(Mt.tag,C)?"ligado":"desligado"}</b></div>`}else Mt?.motor&&(kt=Hl(B.painel(Mt.motor)));H.innerHTML=G(yt)+kt}function It(H){let yt=fe(H);if(dt&&(dt.material=Ut(dt),dt=null),l(),!yt){Pt=null,ct();return}let Mt=de.get(yt.object)||yt.object;dt=Mt,zt.set(Mt,Ut(Mt)),Mt.material=Zt(Ut(Mt)),Pt=Mt;let kt=B?ne(pt(Mt)):null;kt&&U&&U(kt),ct()}let Lt=null;s.addEventListener("pointerdown",H=>{Lt=[H.clientX,H.clientY]}),s.addEventListener("pointerup",H=>{Lt&&Math.hypot(H.clientX-Lt[0],H.clientY-Lt[1])<5&&It(H),Lt=null});let gt=document.createElement("div");gt.className="etq-q etq-dica",gt.style.display="none",document.body.appendChild(gt);let te=0;s.addEventListener("pointermove",H=>{if(H.buttons){gt.style.display="none";return}let yt=performance.now();if(yt-te<60)return;te=yt;let Mt=fe(H),kt=Mt&&(Mt.object.userData.dica||Mt.object.userData.rotulo);if(!kt){gt.style.display="none";return}let Re=B&&pt(de.get(Mt.object)||Mt.object);Re?.tipo==="protecao"?kt+=B.ligado(Re.tag,C)?" — LIGADO (clique para desligar)":" — DESLIGADO (clique para ligar)":Re?.acao&&(kt+=" — clique para apertar"),gt.textContent=kt,gt.style.display="block",gt.style.transform=`translate(${H.clientX+12}px, ${H.clientY-26}px)`}),s.addEventListener("pointerleave",()=>{gt.style.display="none"});let Yt=n("#etiquetas");for(let H of $)H.el=document.createElement("div"),H.el.className="etq-q",H.el.textContent=H.texto,Yt&&Yt.appendChild(H.el),H.larg=0;let Ce=new O;function De(){let H=s.clientWidth,yt=s.clientHeight,Mt=y.position.distanceTo(g.target),kt=2*Math.tan(y.fov*Math.PI/180/2),Re=[];for(let se of $){let Fe=xt&&Xt(se.mesh)&&(se.porta?!ut():ut()||!w.porta.visible)&&Mt<f*3.2;if(Fe){se.mesh.getWorldPosition(Ce);let sn=yt/(kt*Math.max(.05,y.position.distanceTo(Ce)));se.larg||(se.el.style.display="block",se.larg=se.el.offsetWidth||se.texto.length*7+12),Fe=se.mesh.scale.x*sn>=se.larg*.95}if(!Fe){se.el.style.display="none";continue}if(Ce.z+=se.mesh.scale.z/2,Ce.project(y),Ce.z>1){se.el.style.display="none";continue}let $e=(Ce.x+1)/2*H,me=(1-Ce.y)/2*yt;if(Re.some(sn=>Math.abs(sn[0]-$e)<(sn[2]+se.larg)/2&&Math.abs(sn[1]-me)<16)){se.el.style.display="none";continue}Re.push([$e,me,se.larg]),se.el.style.display="block",se.el.style.transform=`translate(${$e}px, ${me}px) translate(-50%, -50%)`}}let _e=!0;function ce(){if(!_e)return;let H=s.clientWidth||window.innerWidth,yt=s.clientHeight||window.innerHeight;r.setSize(H,yt,!1),y.aspect=H/yt,y.updateProjectionMatrix(),l()}window.addEventListener("resize",ce),s.addEventListener("webglcontextrestored",l),ce(),V(!0),oe(),B||ct(),r.compile(a,y);function nn(H){if(!_e)return;Ae&&(Ae(H),o=!0);let yt=et-q.rotation.y;Math.abs(yt)>.001?(q.rotation.y+=yt*.12,o=!0):q.rotation.y!==et&&(q.rotation.y=et,o=!0);for(let Mt of ot){let kt=Mt.alvo-Mt.giro.rotation.x;Math.abs(kt)>.001?(Mt.giro.rotation.x+=kt*.3,o=!0):Mt.giro.rotation.x!==Mt.alvo&&(Mt.giro.rotation.x=Mt.alvo,o=!0)}g.update()&&(o=!0),o&&(o=!1,r.render(a,y),De())}let Bi={tipo:"quadro",grupos:w,camera:y,controles:g,cena:a,renderer:r,sim:B,quadroTag:C,abrirPorta:(H=!0)=>{K(H),q.rotation.y=et},vistaFrente:()=>{x(!0)},vista3d:()=>{V(!0)},soPlaca:(H=!0)=>bt(H),mostrar:J,etiquetas:H=>{xt=H,l()},render:()=>{Ae=null,o=!0,nn(performance.now())},alternar:H=>B?ne({tipo:"protecao",tag:H}):null,alavanca:H=>{let yt=ot.find(Mt=>Mt.tag===H);return yt?yt.giro.rotation.x:null},get sujo(){return o}},ke=0;function Mn(H){ke=requestAnimationFrame(Mn),nn(H)}return nn(performance.now()),ke=requestAnimationFrame(Mn),t.embutido?{...Bi,ativar(H=!0){_e=H,_e&&(ce(),oe())},abrirAnimado(){et=0,q.rotation.y=0,l(),setTimeout(()=>K(!0),300)},destruir(){_e=!1,cancelAnimationFrame(ke),N(),window.removeEventListener("resize",ce),gt.remove(),r.dispose(),r.forceContextLoss?.()}}:(window.HM3D=Bi,document.body.classList.add("pronto"),Bi)}window.CENA&&window.CENA.tipo==="quadro"?Oh(window.CENA):tv();function tv(){let i=window.CENA,t=d=>document.querySelector(d),e=(d,M=2)=>Number(d).toLocaleString("pt-BR",{minimumFractionDigits:M,maximumFractionDigits:M}),n=d=>String(d??"").replace(/[&<>"']/g,M=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[M]),s=i.peDireito,r=i.infra||[],a=1.6,o=.45,l=t("#tela"),c;try{c=new Mr({canvas:l,antialias:!0,preserveDrawingBuffer:!0})}catch(d){throw t("#semwebgl").style.display="flex",d}c.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),c.outputColorSpace=En;let h=new ms;h.background=new ue("#14161b");let p=!0,u=!0;function f(d=!1){p=!0,d&&(u=!0)}l.addEventListener("webglcontextrestored",()=>f(!0));let[_,y,g,m]=i.limites,R=g-_,I=m-y,b=Math.hypot(R,I),T=(d,M,E=0)=>new O(d,E,-M),A=new un(45,1,.1,b*20+50),L=new br(A,l);L.enableDamping=!0,L.dampingFactor=.08,L.maxPolarAngle=Math.PI/2-.02,L.minDistance=.5,L.maxDistance=b*4,L.autoRotateSpeed=.9,L.zoomToCursor=!0,L.addEventListener("change",()=>f());let v=1.6,w=.6,F=new vs("#ffffff","#5a5a4e",v),z=new ys("#ffffff",w);h.add(F,z);let $=new Qi("#fff4e0",1.4);$.position.set(b*.6,b*.9,b*.4),h.add($);let q={};function D(d,M=h){return q[d]||(q[d]=new In,M.add(q[d])),q[d]}{let d=Math.max(4,b*.15),M=new Zi(R+2*d,I+2*d),E=new qe(M,new vn({color:"#3d4334",roughness:1}));E.rotation.x=-Math.PI/2,E.position.set((_+g)/2,-.02,-(y+m)/2),D("terreno").add(E)}{let d=i.ambientes.filter(M=>M.tipo!=="externo"&&M.poligono.length>=3);if(d.length){let M=1/0,E=1/0,X=-1/0,W=-1/0;for(let At of d)for(let[Wt,Bt]of At.poligono)M=Math.min(M,Wt),X=Math.max(X,Wt),E=Math.min(E,Bt),W=Math.max(W,Bt);let tt=new Zi(X-M+.4,W-E+.4),mt=new qe(tt,new vn({color:"#8c887e",roughness:1}));mt.rotation.x=-Math.PI/2,mt.position.set((M+X)/2,.001,-(E+W)/2),D("terreno").add(mt)}}let Z=20,st=d=>.005+d*4e-4,nt=[],vt=i.ambientes.filter(d=>d.poligono.length>=3).sort((d,M)=>M.area_m2-d.area_m2),et=vt.map(d=>{let M=1/0,E=1/0,X=-1/0,W=-1/0;for(let[tt,mt]of d.poligono)M=Math.min(M,tt),X=Math.max(X,tt),E=Math.min(E,mt),W=Math.max(W,mt);return[M,E,X,W]}),ut=[];vt.forEach((d,M)=>{let E=et[M],X=0;for(let W=0;W<M&&X<Z;W++){let tt=et[W];E[0]<tt[2]&&E[2]>tt[0]&&E[1]<tt[3]&&E[3]>tt[1]&&(X=Math.max(X,ut[W]+1))}ut.push(Math.min(X,Z))});let dt=Math.max(.03,st(ut.reduce((d,M)=>Math.max(d,M),0))+.01);{let d=new Map;vt.forEach((M,E)=>{let X=ut[E];d.has(X)||d.set(X,{pos:[],cor:[],idx:[],ambientes:[]});let W=d.get(X),tt=new ur(new Ui(M.poligono.map(([Tt,ie])=>new St(Tt,ie)))),mt=tt.attributes.position.array,At=new ue((i.tiposAmbiente[M.tipo]||i.tiposAmbiente.outros).cor),Wt=W.pos.length/3,Bt=st(X);for(let Tt=0;Tt<mt.length;Tt+=3)W.pos.push(mt[Tt],Bt,-mt[Tt+1]),W.cor.push(At.r,At.g,At.b);let Kt=tt.index?tt.index.array:[...Array(mt.length/3).keys()];for(let Tt=0;Tt<Kt.length;Tt++)W.idx.push(Wt+Kt[Tt]);for(let Tt=0;Tt<Kt.length/3;Tt++)W.ambientes.push(M);tt.dispose()});for(let[M,E]of d){let X=new Qe;X.setAttribute("position",new ye(E.pos,3)),X.setAttribute("normal",new ye(E.pos.map((tt,mt)=>mt%3===1?1:0),3)),X.setAttribute("color",new ye(E.cor,3)),X.setIndex(E.idx);let W=new qe(X,new vn({vertexColors:!0,roughness:.9,polygonOffset:!0,polygonOffsetFactor:-1-M*.05,polygonOffsetUnits:-1-M}));W.userData={ambientes:E.ambientes},D("ambientes").add(W),nt.push(W)}}let zt={uAlvo:{value:new O},uDir:{value:new St(0,0)},uCorte:{value:0},uAltCorte:{value:o},uMargem:{value:.3}};function Ut(d,M=!1){return d.onBeforeCompile=E=>{Object.assign(E.uniforms,zt),E.vertexShader=E.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aParede;
uniform vec3 uAlvo; uniform vec2 uDir; uniform float uCorte; uniform float uAltCorte; uniform float uMargem;`).replace("#include <begin_vertex>",`#include <begin_vertex>
{
  bool frente = uCorte > 0.5 && dot(aParede.xz - uAlvo.xz, uDir) > uMargem;
  ${M?"if (!frente) transformed = vec3(aParede.x, -50.0, aParede.z);":"if (frente) { if (aParede.y >= uAltCorte - 0.01) transformed = vec3(aParede.x, -50.0, aParede.z); else transformed.y = min(transformed.y, uAltCorte); }"}
}`)},d.customProgramCacheKey=()=>M?"corte-fantasma":"corte",d}function we(d,M){let E=[],X=[],W=[],tt=[],mt=[],[At,Wt,Bt]=M.map(he=>new ue(he)),Kt=[],Tt=[];for(let[he,Pe,Ie,Ue,cn,je,hn]of d){let Ns=Math.hypot(Ie-he,Ue-Pe);if(Ns<1e-4||hn<=je)continue;let Vi=(Ie-he)/Ns,ls=(Ue-Pe)/Ns,Si=-ls*cn/2,cs=Vi*cn/2,Ra=[[he+Si,Pe+cs],[Ie+Si,Ue+cs],[Ie-Si,Ue-cs],[he-Si,Pe-cs]],Oe=(ti,Us)=>{let[Fs,Jl]=Ra[ti];return[Fs,Us,-Jl]},$h=[(he+Ie)/2,je,-(Pe+Ue)/2,0],df=[[Oe(0,je),Oe(1,je),Oe(1,hn),Oe(0,hn),[-ls,0,-Vi],At],[Oe(2,je),Oe(3,je),Oe(3,hn),Oe(2,hn),[ls,0,Vi],At],[Oe(1,je),Oe(2,je),Oe(2,hn),Oe(1,hn),[Vi,0,-ls],At],[Oe(3,je),Oe(0,je),Oe(0,hn),Oe(3,hn),[-Vi,0,ls],At],[Oe(0,hn),Oe(1,hn),Oe(2,hn),Oe(3,hn),[0,1,0],Wt],[Oe(3,je),Oe(2,je),Oe(1,je),Oe(0,je),[0,-1,0],Bt]];for(let[ti,Us,Fs,Jl,ff,jl]of df){let Os=E.length/3;E.push(...ti,...Us,...Fs,...Jl);for(let Yh=0;Yh<4;Yh++)X.push(...ff),W.push(jl.r,jl.g,jl.b),tt.push(...$h);mt.push(Os,Os+1,Os+2,Os,Os+2,Os+3)}for(let ti=0;ti<4;ti++){let Us=(ti+1)%4;Kt.push(...Oe(ti,hn),...Oe(Us,hn),...Oe(ti,je),...Oe(Us,je),...Oe(ti,je),...Oe(ti,hn));for(let Fs=0;Fs<6;Fs++)Tt.push(...$h)}}let ie=new Qe;ie.setAttribute("position",new ye(E,3)),ie.setAttribute("normal",new ye(X,3)),ie.setAttribute("color",new ye(W,3)),ie.setAttribute("aParede",new ye(tt,4)),ie.setIndex(mt);let ee=new Qe;return ee.setAttribute("position",new ye(Kt,3)),ee.setAttribute("aParede",new ye(Tt,4)),{g:ie,gl:ee}}let de=Ut(new vn({vertexColors:!0,roughness:.88,side:yn})),B=Ut(new vn({vertexColors:!0,roughness:.88,side:yn})),C=Ut(new vn({color:"#efeae0",roughness:.9,transparent:!0,opacity:.13,depthWrite:!1,side:yn}),!0),U=Ut(new vn({color:"#8ec9ff",roughness:.1,metalness:.1,transparent:!0,opacity:.28,depthWrite:!1,side:yn})),Y=Ut(new ai({color:"#2f2c27",transparent:!0,opacity:.5})),pt=[];function ot(d,M,E,{cores:X=["#efeae0","#5f594f","#cfc8ba"],arestas:W=!0,fantasma:tt=!1}={}){if(!d||!d.length)return null;let{g:mt,gl:At}=we(d,X),Wt=new qe(mt,M);if(Wt.renderOrder=2,D(E).add(Wt),tt){let Bt=new qe(mt,C);Bt.renderOrder=5,D(E).add(Bt),pt.push(Bt)}if(W){let Bt=new xi(At,Y);Bt.renderOrder=3,D(E).add(Bt)}return Wt}let Dt=ot(i.paredes,de,"paredes",{fantasma:!0});ot(i.muretas,B,"paredes",{cores:["#ddd5c6","#5f594f","#cfc8ba"],fantasma:!0}),ot(i.guardas,U,"paredes"),ot(i.vidros,U,"paredes",{arestas:!1});let Qt=new vn({color:"#a5a39c",roughness:.8}),ft=[];for(let d of i.pilares){if(d.length<3)continue;let M=new ia(new Ui(d.map(([X,W])=>new St(X,W))),{depth:s,bevelEnabled:!1}),E=new qe(M,Qt);E.rotation.x=-Math.PI/2,D("pilares").add(E),ft.push({m:E,cx:d.reduce((X,W)=>X+W[0],0)/d.length,cz:-d.reduce((X,W)=>X+W[1],0)/d.length})}if(i.planta){let d=atob(i.planta),M=new Uint8Array(d.length);for(let tt=0;tt<d.length;tt++)M[tt]=d.charCodeAt(tt);let E=new Int16Array(M.buffer),X=new Float32Array(E.length/2*3);for(let tt=0,mt=0;tt<E.length;tt+=2,mt+=3)X[mt]=E[tt]/100,X[mt+1]=dt,X[mt+2]=-E[tt+1]/100;let W=new Qe;W.setAttribute("position",new ye(X,3)),D("planta").add(new xi(W,new ai({color:"#3a382f",transparent:!0,opacity:.6})))}ot(i.folhas.map(([d,M,E,X])=>[d,M,E,X,.04,0,i.alturaPorta]),Ut(new vn({color:"#b08457",roughness:.7,transparent:!0,opacity:.85})),"portas",{arestas:!1});function ht(d){let M=[],E=[],X=[];for(let[tt,mt]of d){let At=tt.index?tt.toNonIndexed():tt,Wt=At.attributes.position.array,Bt=At.attributes.normal.array,[Kt,Tt,ie]=Array.isArray(mt)?mt:[mt,mt,mt];for(let ee=0;ee<Wt.length;ee++)M.push(Wt[ee]),E.push(Bt[ee]);for(let ee=0;ee<Wt.length/3;ee++)X.push(Kt,Tt,ie)}let W=new Qe;return W.setAttribute("position",new ye(M,3)),W.setAttribute("normal",new ye(E,3)),W.setAttribute("color",new ye(X,3)),W}let rt=(d,M,E,X=0,W=0,tt=0)=>new Gn(d,M,E).translate(X,W,tt+E/2),_t=(d,M,E=0,X=0,W=0,tt=14)=>new Ni(d,d,M,tt).rotateX(Math.PI/2).translate(E,X,W+M/2),Ct=(d,M=0,E=0,X=0)=>new sa(d,14,6,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2).translate(M,E,X),$t=.12,ne={tomada:(d,M,E)=>ht([[rt(d,M,E),1],[_t(d*.34,.004,0,0,E),.7],[_t(d*.065,.004,-d*.14,0,E+.003,8),$t],[_t(d*.065,.004,d*.14,0,E+.003,8),$t]]),interruptor:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.52,M*.44,.012,0,0,E),.78],[rt(d*.12,M*.04,.003,0,M*.14,E+.012),$t]]),rede:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.62,M*.34,.004,0,M*.04,E),.7],[rt(d*.38,M*.17,.004,0,M*.06,E+.003),$t],[rt(d*.14,M*.05,.004,0,-M*.05,E+.003),$t]]),coaxial:(d,M,E)=>ht([[rt(d,M,E),1],[_t(d*.2,.014,0,0,E),.75],[_t(d*.06,.004,0,0,E+.014,10),$t]]),quadro:(d,M,E)=>ht([[rt(d,M,E*.85),.68],[rt(d-.04,M-.04,.012,0,0,E*.85),1.05],[rt(.025,.1,.02,d/2-.07,0,E*.85+.012),$t],[rt(d*.36,.05,.003,0,M/2-.1,E*.85+.012),.3]]),rack:(d,M,E)=>ht([[rt(d,M,E*.92),.4],[rt(d-.03,M-.03,.01,0,0,E*.92),.8],[rt(d-.1,M-.1,.004,0,0,E*.92+.01),.22],[rt(.02,.08,.02,d/2-.05,0,E*.92+.01),1.3]]),caixa:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.7,M*.7,.004,0,0,E),.7]]),teclado:(d,M,E)=>{let X=[[rt(d,M,E),1],[rt(d*.72,M*.2,.003,0,M*.28,E),$t]];for(let W of[.06,-.07,-.2,-.33])for(let tt of[-.24,0,.24])X.push([rt(d*.17,M*.08,.004,tt*d,W*M,E),.55]);return ht(X)},acionador:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.6,M*.6,.004,0,0,E),1.5],[_t(d*.12,.006,0,0,E+.004,12),$t]]),sirene:(d,M,E)=>ht([[rt(d,M,E*.45),.85],[_t(d*.36,E*.55,0,0,E*.45),1.35]]),barra:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.9,M*.3,.003,0,0,E),.6]]),emergencia:(d,M,E)=>ht([[rt(d,M,E),.9],[rt(d*.36,M*.5,.004,-d*.22,0,E),1.8],[rt(d*.36,M*.5,.004,d*.22,0,E),1.8]]),wallbox:(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.5,M*.18,.003,0,M*.22,E),$t],[_t(d*.16,.05,0,-M*.18,E),.5]]),luminaria:(d,M,E)=>ht([[rt(d,M,E),.62],[rt(d-.05,M-.05,.004,0,0,E),1.25]]),"ponto-luz":(d,M,E)=>ht([[_t(d*.5,E*.25),.7],[Ct(d*.3,0,0,E*.25),1.3]]),detector:(d,M,E)=>ht([[_t(d*.5,E*.3),.78],[_t(d*.4,E*.7,0,0,E*.3),1.05],[_t(d*.05,.004,d*.2,0,E,8),$t]]),sensor:(d,M,E)=>ht([[_t(d*.5,E*.35),.85],[Ct(d*.32,0,0,E*.35),1.2]]),ap:(d,M,E)=>ht([[_t(d*.5,E,0,0,0,24),1.1],[_t(d*.08,.003,0,0,E,8),.4]]),camera:(d,M,E)=>{let X=E-.08;return ht([[_t(.035,.012),.6],[rt(.025,.025,.07,0,0,.012),.6],[_t(d*.5,X,0,0,.08),1],[rt(d*1.2,.01,X*.85,0,d*.5+.006,.08+X*.18),.85],[_t(d*.32,.004,0,0,E),$t]])},dome:(d,M,E)=>ht([[_t(d*.5,E*.3),.9],[Ct(d*.42,0,0,E*.3),.3]]),"sensor-canto":(d,M,E)=>ht([[rt(d,M,E),1],[rt(d*.78,M*.42,.008,0,-M*.12,E),.35],[_t(d*.06,.003,0,M*.32,E,8),$t]]),catraca:(d,M,E)=>ht([[new Gn(d,M,E).translate(0,M/2,0),.9],[new Gn(d*1.05,.04,E*1.02).translate(0,M,0),.6]]),poste:(d,M,E)=>ht([[rt(.3,.3,.03),.5],[_t(.07,E-.03,0,0,.03,10),.55],[_t(.045,.1,0,0,E-.05,10),.55],[rt(d*.55,.05,.05,d*.27,0,E-.3),.55],[rt(.42,M,.12,d*.55,0,E-.42),1],[rt(.36,M*.8,.004,d*.55,0,E-.424),1.8]]),"caixa-piso":(d,M,E)=>ht([[rt(d,M,E),.6],[rt(d*.9,M*.9,.004,0,0,E),1.1]])},re={tomada:[.1,.16,.03],interruptor:[.1,.16,.03],quadro:[.6,.8,.15],rack:[.6,.6,.45],luminaria:[.62,.62,.06],"ponto-luz":[.26,.26,.1],detector:[.16,.16,.07],sensor:[.13,.13,.06],camera:[.11,.11,.32],"sensor-canto":[.08,.13,.07],catraca:[.3,1,.8],barra:[.3,.06,.05]},oe=new Set(["luminaria","ponto-luz","detector","sensor","ap","dome"]);for(let d of i.dispositivos)d.tam=d.tam||re[d.forma]||[.18,.18,.07],d.montagem=d.montagem||(oe.has(d.forma)?"teto":d.forma==="catraca"?"piso":d.forma==="camera"||d.forma==="sensor-canto"?"canto":"parede");let N={uPx:{value:.001},uMin:{value:14},uBase:{value:1},uMinInfra:{value:3}},Ae=40;function ve(d,M,E){let X=new vn({color:d,vertexColors:!0,emissive:d,emissiveIntensity:E,roughness:.55,metalness:.05});return X.onBeforeCompile=W=>{Object.assign(W.uniforms,{uPx:N.uPx,uMin:N.uMin,uBase:N.uBase,uTam:{value:M}}),W.vertexShader=W.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMin; uniform float uBase; uniform float uTam;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = max(uBase, min(uMin * uPx * distance(cameraPosition, o) / uTam, ${Ae.toFixed(1)}));
  transformed *= s;
}
#endif`),W.fragmentShader=W.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
#ifdef USE_COLOR
totalEmissiveRadiance *= vColor.rgb;
#endif`)},X.customProgramCacheKey=()=>"dispositivo",X}function P(d,M){return Math.max(N.uBase.value,Math.min(N.uMin.value*N.uPx.value*M/d,Ae))}let x=[],V=new dn,J=new O(0,0,1),K=new O;function bt(d,M){d.itens.forEach(([E,X,W,tt,mt],At)=>{V.position.set(E,W,-X),V.quaternion.identity(),d.montagem==="teto"?V.quaternion.setFromUnitVectors(J,K.set(0,-1,0)):d.montagem==="piso"?d.forma!=="catraca"&&V.quaternion.setFromUnitVectors(J,K.set(0,1,0)):(tt||mt)&&(K.set(tt,0,-mt).normalize(),d.forma==="camera"?K.y=-.45:d.forma==="sensor-canto"&&(K.y=-.35),V.quaternion.setFromUnitVectors(J,K.normalize())),V.scale.set(1,1,1),V.updateMatrix(),M.setMatrixAt(At,V.matrix)}),M.instanceMatrix.needsUpdate=!0}let wt=[],at=new Map;for(let d of i.dispositivos){if(!d.itens.length)continue;let M=d.forma==="luminaria"?.55:d.forma==="ponto-luz"?.5:.22;d.tamMax=Math.max(...d.tam);let E=(ne[d.forma]||ne.caixa)(...d.tam),X=ve(d.cor,d.tamMax,M);d.montagem==="teto"&&(X.transparent=!0,wt.push(X));let W=new gs(E,X,d.itens.length);W.userData={tipo:d},W.renderOrder=1,W.frustumCulled=!1,bt(d,W),D(`disc:${d.disciplina}`).add(W),x.push(W),d.malha=W;for(let tt of d.itens)at.has(tt[5])||at.set(tt[5],[]),at.get(tt[5]).push([d,tt]);if(d.itens.some(tt=>Array.isArray(tt[7]))){let tt=[],mt=[],At=[];for(let[Bt,Kt,Tt,,,,,ie]of d.itens){if(!Array.isArray(ie)||ie.length<6)continue;let ee=[];for(let Ie=0;Ie<ie.length;Ie+=2)ee.push([ie[Ie],ie[Ie+1]]);let he=[Bt,Tt,-Kt],Pe=dt;for(let Ie=1;Ie<ee.length-1;Ie++)tt.push(ee[0][0],Pe,-ee[0][1],ee[Ie][0],Pe,-ee[Ie][1],ee[Ie+1][0],Pe,-ee[Ie+1][1]);for(let Ie=0;Ie<ee.length;Ie++){let Ue=ee[Ie],cn=ee[(Ie+1)%ee.length];mt.push(...he,Ue[0],Pe,-Ue[1],cn[0],Pe,-cn[1]),At.push(Ue[0],Pe+.005,-Ue[1],cn[0],Pe+.005,-cn[1])}}let Wt=(Bt,Kt,Tt=qe)=>{let ie=new Qe;ie.setAttribute("position",new ye(Bt,3));let ee=new Tt(ie,Kt);return ee.renderOrder=4,D("campo").add(ee),ee};Wt(tt,new Di({color:d.cor,transparent:!0,opacity:.22,depthWrite:!1,side:yn})),Wt(mt,new Di({color:d.cor,transparent:!0,opacity:.05,depthWrite:!1,side:yn})),Wt(At,new ai({color:d.cor,transparent:!0,opacity:.7}),xi)}}let lt=i.instalacao&&Array.isArray(i.instalacao.pontos)&&Array.isArray(i.instalacao.quadros)?i.instalacao:null,xt=lt?Gl(lt,i.titulo):null,jt={luminaria:"luz",ponto_luz:"luz",tomada:"tomada",tue:"tomada",motor:"motor"},Et=[],Rt=new WeakMap,Zt=new ue(1,1,1),Xt=new ue;if(xt){let d=new Map(xt.quadros().filter(E=>E.ponto).map(E=>[String(E.ponto),E.tag]));for(let E of i.dispositivos)E.malha&&E.itens.forEach((X,W)=>{let tt=String(X[6]||""),mt=null,At=null;E.forma==="quadro"?(mt="quadro",At=d.get(tt)||null):tt&&xt.temPonto(tt)&&(mt=jt[xt.ponto(tt).tipo]||"comando"),mt&&Et.push({t:E,i:W,it:X,id:tt,kind:mt,quadro:At})});let M=Et.filter(E=>E.kind==="quadro"&&!E.quadro);M.length===1&&xt.quadros().length===1&&(M[0].quadro=xt.quadros()[0].tag);for(let E=Et.length-1;E>=0;E--)Et[E].kind==="quadro"&&!Et[E].quadro&&Et.splice(E,1);for(let E of Et)Rt.set(E.it,E);for(let E of new Set(Et.map(X=>X.t))){for(let X=0;X<E.itens.length;X++)E.malha.setColorAt(X,Zt);E.malha.instanceColor.needsUpdate=!0}}function fe(d){if(d.kind==="quadro"){let E=xt.quadro(d.quadro);return E&&[E.geral?.tag,...(E.disjuntores||[]).map(W=>W.tag),...(E.drs||[]).map(W=>W.tag)].filter(Boolean).some(W=>!xt.ligado(W,E.tag))?Xt.setRGB(1.6,1.05,.35):Xt.copy(Zt)}let M=xt.estadoPonto(d.id);if(!M)return Xt.copy(Zt);if(d.kind==="luz"){if(!M.alimentado)return Xt.setRGB(.2,.2,.24);let E=M.nivel;return Xt.setRGB(.3+1.45*E,.3+1.32*E,.33+.97*E)}if(d.kind==="tomada")return M.alimentado?Xt.copy(Zt):Xt.setRGB(1.55,.18,.18);if(d.kind==="motor"){let E=xt.painel(M.circuito);return M.alimentado?M.energizado?Xt.setRGB(.45,1.7,.55):E?.termico?Xt.setRGB(1.7,1.1,.2):Xt.setRGB(.7,.7,.7):Xt.setRGB(.45,.25,.25)}return M.alimentado?Xt.copy(Zt):Xt.setRGB(.6,.3,.3)}function G(){if(!xt)return;let d=new Set;for(let M of Et)M.t.malha.setColorAt(M.i,fe(M)),d.add(M.t.malha);for(let M of d)M.instanceColor.needsUpdate=!0;Lt(),Hh(),f(!0)}let Pt=window.matchMedia?.("(pointer: coarse)").matches||window.innerWidth<=900?8:12,ct=[],It=D("luzes-sim");if(It.visible=!1,xt&&Et.some(d=>d.kind==="luz"))for(let d=0;d<Pt;d++){let M=new la("#fff1d6",0,7,2);It.add(M),ct.push(M)}function Lt(){if(!ct.length)return;let d=ce==="dentro"&&nn>=0,M=0,E=[];if(d)for(let W of Et){if(W.kind!=="luz"||W.it[5]!==nn)continue;M++;let tt=xt.estadoPonto(W.id).nivel;tt>0&&E.push({x:W,n:tt,d:A.position.distanceToSquared(K.set(W.it[0],W.it[2],-W.it[1]))})}It.visible=d&&M>0;let X=It.visible?E.reduce((W,tt)=>W+tt.n,0)/M:1;F.intensity=v*(.3+.7*X),z.intensity=w*(.3+.7*X),E.sort((W,tt)=>W.d-tt.d),ct.forEach((W,tt)=>{let mt=E[tt];W.intensity=mt?3.2*mt.n:0,mt&&W.position.set(mt.x.it[0],mt.x.it[2]-.15,-mt.x.it[1])}),f()}let gt=d=>d?{transparent:!0,opacity:.55,depthWrite:!1}:{};function te(d,M,E=!1){let X=new vn({color:d,emissive:d,emissiveIntensity:.18,roughness:.45,metalness:.35,...gt(E)});return X.onBeforeCompile=W=>{Object.assign(W.uniforms,{uPx:N.uPx,uMinInfra:N.uMinInfra,uSecao:{value:M}}),W.vertexShader=W.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMinInfra; uniform float uSecao;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = clamp(uMinInfra * uPx * distance(cameraPosition, o) / uSecao, 1.0, 15.0);
  transformed.yz *= s;
}
#endif`)},X.customProgramCacheKey=()=>"infra",X}let Yt=D("infra");for(let d of r){let M=d.segmentos||[],E=Math.floor(M.length/4);if(!E)continue;let X=new In;D(`infra:${d.disciplina}`,Yt).add(X),d.objeto=X;let[W,tt]=d.secao||[.05,.05];if(d.forma!=="linha"){let Tt=d.forma==="tubo"?new Ni(.5,.5,1,8).rotateZ(Math.PI/2):new Gn(1,1,1),ie=new gs(Tt,te(d.cor,Math.max(W,tt),d.sugerido),E);for(let ee=0;ee<E;ee++){let he=M[ee*4],Pe=M[ee*4+1],Ie=M[ee*4+2],Ue=M[ee*4+3],cn=Math.hypot(Ie-he,Ue-Pe);V.position.set((he+Ie)/2,d.z,-(Pe+Ue)/2),V.quaternion.identity(),V.rotation.set(0,Math.atan2(Ue-Pe,Ie-he),0),V.scale.set(cn+W,tt,W),V.updateMatrix(),ie.setMatrixAt(ee,V.matrix)}ie.instanceMatrix.needsUpdate=!0,ie.frustumCulled=!1,ie.renderOrder=1,X.add(ie)}let mt=d.descidas||[],At=Math.floor(mt.length/4),Wt=d.forma==="tubo"?W:.025;if(At&&d.forma!=="linha"){let Tt=new gs(new Ni(.5,.5,1,8),new vn({color:d.cor,emissive:d.cor,emissiveIntensity:.18,roughness:.45,metalness:.35,...gt(d.sugerido)}),At);for(let ie=0;ie<At;ie++){let[ee,he,Pe,Ie]=mt.slice(ie*4,ie*4+4);V.position.set(ee,(Pe+Ie)/2,-he),V.quaternion.identity(),V.rotation.set(0,0,0),V.scale.set(Wt,Math.max(.01,Ie-Pe),Wt),V.updateMatrix(),Tt.setMatrixAt(ie,V.matrix)}Tt.instanceMatrix.needsUpdate=!0,Tt.frustumCulled=!1,X.add(Tt)}let Bt=new Float32Array((E+At)*6);for(let Tt=0;Tt<E;Tt++)Bt.set([M[Tt*4],d.z,-M[Tt*4+1],M[Tt*4+2],d.z,-M[Tt*4+3]],Tt*6);for(let Tt=0;Tt<At;Tt++)Bt.set([mt[Tt*4],mt[Tt*4+2],-mt[Tt*4+1],mt[Tt*4],mt[Tt*4+3],-mt[Tt*4+1]],(E+Tt)*6);let Kt=new Qe;Kt.setAttribute("position",new ye(Bt,3)),X.add(new xi(Kt,new ai({color:d.cor,transparent:!0,opacity:d.forma==="linha"?.95:.8})))}let Ce=d=>[d.rotulo,d.material,d.medida].filter(Boolean).join(" "),De=d=>({texto:"medida do desenho",desenho:"medida do desenho",layer:"medida da layer",legenda:"medida da legenda",estimado:"traçado e bitola estimados — conferir",sugerido:"caminho SUGERIDO pelo sistema (não está no projeto) — conferir"})[d.origem_medida]||"medida padrão ilustrativa",_e={paredes:0,corte:!0,ambientes:!0,etiquetas:!0,portas:!0,planta:!0,campo:!1,giro:!1,grandes:!1,infra:!0,sugerido:!0},ce="geral",nn=-1,Bi=null,ke=null,Mn=0,H=0,yt=new O,Mt={lateral:0,topo:0},kt=t("#etiquetas"),Re=i.ambientes.map(d=>{let M=document.createElement("div");return M.className="etq",M.innerHTML=`<b>${n(d.nome)}</b><span>${e(d.area_m2)} m²</span>`,kt.appendChild(M),{a:d,el:M,p:T(d.centro[0],d.centro[1],.05),lado:Math.sqrt(d.area_m2),ret:null}}).sort((d,M)=>M.a.area_m2-d.a.area_m2);function se(){if(!_e.etiquetas||ce!=="geral"){for(let W of Re)W.el.style.display="none",W.ret=null;return}let d=l.clientWidth,M=l.clientHeight,E=M/2/Math.tan(an.degToRad(A.fov/2)),X=[];for(let W of Re){K.copy(W.p).project(A);let tt=A.position.distanceTo(W.p),mt=W.lado*E/Math.max(tt,.1),At=(K.x+1)/2*d,Wt=(1-K.y)/2*M,Bt=K.z<1&&mt>38&&At>50&&At<d-Mt.lateral-50&&Wt>Mt.topo+18&&Wt<M-60;if(Bt){let Kt=[At-55,Wt-16,At+55,Wt+16];X.some(Tt=>Kt[0]<Tt[2]&&Kt[2]>Tt[0]&&Kt[1]<Tt[3]&&Kt[3]>Tt[1])?Bt=!1:X.push(Kt)}W.el.style.display=Bt?"":"none",W.ret=Bt?[At-60,Wt-18,At+60,Wt+18]:null,Bt&&(W.el.style.transform=`translate(-50%, -50%) translate(${At.toFixed(1)}px, ${Wt.toFixed(1)}px)`)}}function Fe(d,M){return d.montagem==="teto"?"no teto":d.montagem==="piso"?"no piso":d.montagem==="topo-porta"?"acima da porta":d.montagem==="canto"?`no alto do canto · h = ${e(M[2])} m`:`h = ${e(M[2])} m`}let $e=t("#etiquetas-pontos"),me=[];function sn(d){if(!me[d]){let M=document.createElement("div");M.className="etq-p";let E=document.createElement("b"),X=document.createElement("span");M.append(E,X),$e.appendChild(M),me[d]={el:M,b:E,s:X,chave:null}}return me[d]}function $n(){let d=0;if($e&&ce==="dentro"&&!ke&&_e.etiquetas){let M=l.clientWidth,E=l.clientHeight,X=[];for(let[tt,mt]of at.get(nn)||[]){if(!tt.malha.visible||!tt.malha.parent.visible)continue;K.set(mt[0],mt[2],-mt[1]);let At=A.position.distanceTo(K),Wt=P(tt.tamMax,At),Bt=tt.montagem==="teto";if(K.y+=Bt?-tt.tam[2]*Wt:tt.montagem==="piso"?(tt.forma==="poste"?tt.tam[2]:tt.tam[1])*Wt:tt.tam[1]/2*Wt,K.project(A),K.z>1||K.z<-1)continue;let Kt=(K.x+1)/2*M,Tt=(1-K.y)/2*E;Kt<20||Kt>M-Mt.lateral-20||Tt<Mt.topo+50||Tt>E-70||X.push({t:tt,it:mt,d:At,x:Kt,y:Bt?Tt+46:Tt})}X.sort((tt,mt)=>tt.d-mt.d);let W=[];for(let tt of X){if(d>=30)break;let mt=[tt.x-70,tt.y-46,tt.x+70,tt.y-6];if(W.some(Bt=>mt[0]<Bt[2]&&mt[2]>Bt[0]&&mt[1]<Bt[3]&&mt[3]>Bt[1]))continue;W.push(mt);let At=sn(d++),Wt=`${tt.t.simbolo}|${tt.it[6]}|${tt.it[0]}|${tt.it[1]}`;At.chave!==Wt&&(At.chave=Wt,At.b.textContent=tt.t.rotulo,At.s.textContent=Fe(tt.t,tt.it)+(tt.it[6]?` · ${tt.it[6]}`:""),At.el.style.setProperty("--cor",tt.t.cor),At.el.style.display="",At.larg=At.el.offsetWidth),At.el.style.display="",tt.x=an.clamp(tt.x,At.larg/2+4,M-Mt.lateral-At.larg/2-4),At.el.style.transform=`translate(-50%, -100%) translate(${tt.x.toFixed(1)}px, ${(tt.y-6).toFixed(1)}px)`}}for(let M=d;M<me.length;M++)me[M].el.style.display="none"}let hi=new O((_+g)/2,0,-(y+m)/2);function Er(){let d=l.clientWidth,M=l.clientHeight,E=document.querySelector("aside"),X=d>900&&E?E.offsetWidth+16:0,W=document.querySelector("#barra")?.getBoundingClientRect().bottom||0;return{w:d,h:M,lateral:X,topo:W,livreW:Math.max(200,d-X-32),livreH:Math.max(200,M-W-50)}}function zi(d){A.fov=d,A.updateProjectionMatrix(),f()}function ws(){tn(),zi(45);let d=Er(),M=Math.max(1,d.w/d.livreW*.85)*Math.max(1,1/A.aspect);A.position.copy(hi).add(new O(b*.42*M,b*.5*M,b*.58*M)),L.target.copy(hi),L.update()}function Ea(){tn(),zi(30);let d=Er(),M=2*Math.tan(an.degToRad(A.fov/2)),E=Math.max(R*d.w/(d.livreW*M*A.aspect),I*d.h/(d.livreH*M))*1.04;A.position.copy(hi).add(new O(0,E+s,.001)),L.target.copy(hi),L.update()}function os([d,M],E){let X=!1;for(let W=0,tt=E.length-1;W<E.length;tt=W++){let[mt,At]=E[W],[Wt,Bt]=E[tt];At>M!=Bt>M&&d<(Wt-mt)*(M-At)/(Bt-At)+mt&&(X=!X)}return X}function S(d,M,E){let X=1/0;for(let W=0;W<E.length;W++){let tt=E[W],mt=E[(W+1)%E.length],At=mt[0]-tt[0],Wt=mt[1]-tt[1],Bt=M[0]*Wt-M[1]*At;if(Math.abs(Bt)<1e-9)continue;let Kt=((tt[0]-d[0])*Wt-(tt[1]-d[1])*At)/Bt,Tt=((tt[0]-d[0])*M[1]-(tt[1]-d[1])*M[0])/Bt;Kt>.05&&Tt>=0&&Tt<=1&&Kt<X&&(X=Kt)}return X}let k={quadro:5,rack:5,teclado:2,caixa:2,wallbox:3};function it(d){let M=d.poligono,E=M.length,X=Ue=>Math.hypot(M[(Ue+1)%E][0]-M[Ue][0],M[(Ue+1)%E][1]-M[Ue][1]),W=Math.max(...M.map((Ue,cn)=>X(cn))),tt=(at.get(d.i)||[]).filter(([Ue])=>Ue.montagem==="parede"||Ue.montagem==="canto"),mt=0,At=-1;for(let Ue=0;Ue<E;Ue++){let cn=X(Ue);if(cn<.85*W)continue;let[je,hn]=[M[Ue],M[(Ue+1)%E]],Ns=0;for(let[ls,Si]of tt){let cs=hn[0]-je[0],Ra=hn[1]-je[1],Oe=an.clamp(((Si[0]-je[0])*cs+(Si[1]-je[1])*Ra)/(cn*cn),0,1);Math.hypot(Si[0]-je[0]-cs*Oe,Si[1]-je[1]-Ra*Oe)<.4&&(Ns+=k[ls.forma]||1)}let Vi=Ns*10+cn;Vi>At&&(At=Vi,mt=Ue)}let Wt=X(mt),Bt=M[mt],Kt=M[(mt+1)%E],Tt=[(Bt[0]+Kt[0])/2,(Bt[1]+Kt[1])/2],ie=[(Kt[0]-Bt[0])/Wt,(Kt[1]-Bt[1])/Wt],ee=[-ie[1],ie[0]];os([Tt[0]+ee[0]*.2,Tt[1]+ee[1]*.2],M)||(ee=[-ee[0],-ee[1]]);let he=S(Tt,ee,M);if(Number.isFinite(he)&&he<2.6&&Wt>2.5*he){let Ue=[Tt[0]+ee[0]*he/2,Tt[1]+ee[1]*he/2],cn=[Ue[0]-ie[0]*(Wt/2-.6),Ue[1]-ie[1]*(Wt/2-.6)];if(os(cn,M))return{olho:cn,alvo:[Ue[0]+ie[0]*Wt/2,Ue[1]+ie[1]*Wt/2],altura:1.5}}let Pe=Math.min(he-.35,Math.max(3,Wt*.9));(!Number.isFinite(Pe)||Pe<.6)&&(Pe=Number.isFinite(he)?he/2:1.5);let Ie=[Tt[0]+ee[0]*Pe,Tt[1]+ee[1]*Pe];return os(Ie,M)||(Ie=d.centro),{olho:Ie,alvo:Tt}}function j(){A.rotation.order="YXZ",A.rotation.set(H,Mn,0),f()}function Q(d){let M=K.copy(d).sub(A.position).normalize();Mn=Math.atan2(-M.x,-M.z),H=Math.asin(an.clamp(M.y,-1,1)),j()}function Ft(d){return ke?yt.clone():ce==="geral"?L.target.clone():A.position.clone().add(A.getWorldDirection(new O).multiplyScalar(d))}let qt=d=>d<.5?4*d*d*d:1-Math.pow(-2*d+2,3)/2;function Nt(d,M,E,X,W,tt){ke={t0:performance.now(),dur:W,p0:A.position.clone(),p1:M.clone(),a0:d,a1:E.clone(),f0:A.fov,f1:X,fim:tt},f(!0),W||Jt(performance.now())}function Jt(d){if(!ke)return;f(!0);let M=ke.dur?Math.min(1,(d-ke.t0)/ke.dur):1,E=qt(M);if(A.position.lerpVectors(ke.p0,ke.p1,E),yt.lerpVectors(ke.a0,ke.a1,E),A.rotation.order="XYZ",A.lookAt(yt),zi(ke.f0+(ke.f1-ke.f0)*E),M>=1){let X=ke.fim;ke=null,X&&X()}}let Vt=null;function pe(d){Vt&&(Vt.geometry.dispose(),Vt.material.dispose(),D("forro").remove(Vt),Vt=null),!(!d||d.poligono.length<3)&&(Vt=new qe(new ur(new Ui(d.poligono.map(([M,E])=>new St(M,E)))),new Di({color:"#cfccc4",side:yn})),Vt.rotation.x=-Math.PI/2,Vt.position.y=s+.002,D("forro").add(Vt),f())}let Se=t("#dentro");function Gt(d){Se&&(t("#dentro-nome").textContent=d?d.nome:"",Se.classList.toggle("aberto",!!d),document.body.classList.contains("modo-dentro")!==!!d&&(document.body.classList.toggle("modo-dentro",!!d),Ca()),Tn(),Lt(),f(!0))}function Ne(d,M={}){let E=typeof d=="number"?i.ambientes[d]:i.ambientes.find(Bt=>Bt.nome===d);if(!E||E.poligono.length<3)return!1;let{olho:X,alvo:W,altura:tt}=it(E),mt=T(X[0],X[1],a),At=T(W[0],W[1],tt||1.1),Wt=Ft(A.position.distanceTo(At));return ce==="geral"&&(Bi={pos:A.position.clone(),alvo:L.target.clone(),fov:A.fov}),ce="dentro",nn=E.i??i.ambientes.indexOf(E),L.enabled=!1,L.autoRotate=!1,pe(E),Gt(E),Nt(Wt,mt,At,M.fov||70,M.instantaneo?0:1100,()=>Q(At)),!0}function tn(){ce!=="geral"&&(ke=null,ce="geral",nn=-1,pe(null),Gt(null),A.rotation.order="XYZ",L.enabled=!0,L.autoRotate=_e.giro,f(!0))}function Ge(d={}){if(ce==="geral")return;let M=Bi;if(!M){ws();return}let E=Ft(A.position.distanceTo(M.alvo));ce="saindo",pe(null),Gt(null),Nt(E,M.pos,M.alvo,M.fov,d.instantaneo?0:900,()=>{ce="geral",nn=-1,A.rotation.order="XYZ",L.target.copy(M.alvo),L.enabled=!0,L.autoRotate=_e.giro,L.update()})}function He(d,M,E){let X=new O(d,a,M),W=A.getWorldDirection(new O),tt=X.clone().add(W.multiplyScalar(3));E&&E.i!==nn&&(nn=E.i,pe(E),Gt(E)),Nt(Ft(3),X,tt,A.fov,700,()=>Q(tt))}function on(d,M){let E=null;for(let X of i.ambientes)X.poligono.length>=3&&os([d,M],X.poligono)&&(!E||X.area_m2<E.area_m2)&&(E=X);return E}let Ht=["sólidas","translúcidas","ocultas"];function gn(){let d=_e.paredes;D("paredes").visible=d!==2,D("pilares").visible=d!==2;for(let M of[de,B])M.transparent=d===1,M.opacity=d===1?M===de?.42:.6:1,M.depthWrite=d!==1,M.needsUpdate=!0;t("#b-paredes").textContent=`Paredes: ${Ht[d]}`,t("#b-paredes").classList.toggle("ativo",d!==2),f()}function xe(d,M,E){let X=t(d);X&&(X.classList.toggle("ativo",!!_e[M]),X.addEventListener("click",()=>{_e[M]=!_e[M],X.classList.toggle("ativo",_e[M]),E(),f(!0)}))}function Tn(){N.uMin.value=(_e.grandes?26:14)+(ce==="dentro"?6:0),N.uBase.value=_e.grandes?1.5:1,N.uMinInfra.value=_e.grandes?6:3,f(!0)}t("#b-paredes").addEventListener("click",()=>{_e.paredes=(_e.paredes+1)%3,gn()}),xe("#b-corte","corte",()=>{}),xe("#b-ambientes","ambientes",()=>{D("ambientes").visible=_e.ambientes}),xe("#b-etiquetas","etiquetas",()=>{}),xe("#b-portas","portas",()=>{D("portas").visible=_e.portas}),xe("#b-planta","planta",()=>{D("planta").visible=_e.planta}),i.planta||t("#b-planta")?.remove(),xe("#b-campo","campo",()=>{D("campo").visible=_e.campo}),xe("#b-giro","giro",()=>{L.autoRotate=_e.giro&&ce==="geral"}),xe("#b-grandes","grandes",Tn),xe("#b-infra","infra",()=>{Yt.visible=_e.infra}),r.length||t("#b-infra")?.remove(),xe("#b-sugerido","sugerido",()=>{for(let d of r)d.sugerido&&d.objeto&&(d.objeto.visible=_e.sugerido)}),r.some(d=>d.sugerido)||t("#b-sugerido")?.remove(),D("campo").visible=_e.campo,t("#b-cima").addEventListener("click",Ea),t("#b-3d").addEventListener("click",ws),t("#b-voltar")?.addEventListener("click",()=>Ge()),t("#b-tela")?.addEventListener("click",()=>{let d=document.documentElement;document.fullscreenElement?document.exitFullscreen?.():d.requestFullscreen?.()});let ln=t("#ir-ambiente");if(ln){let d=i.ambientes.filter(M=>M.poligono.length>=3).sort((M,E)=>M.nome.localeCompare(E.nome,"pt-BR",{numeric:!0})||M.area_m2-E.area_m2);d.length||ln.remove();for(let M of d){let E=document.createElement("option");E.value=String(M.i),E.textContent=`${M.nome} (${e(M.area_m2,1)} m²)`,ln.appendChild(E)}ln.addEventListener("change",()=>{ln.value!==""&&Ne(Number(ln.value)),ln.value="",ln.blur()})}let ui=t("#disciplinas");for(let[d,M]of Object.entries(i.disciplinas)){let E=i.dispositivos.filter(tt=>tt.disciplina===d).reduce((tt,mt)=>tt+mt.itens.length,0),X=r.filter(tt=>tt.disciplina===d).reduce((tt,mt)=>tt+mt.comprimento_m,0),W=document.createElement("button");W.className="ativo disc",W.style.setProperty("--cor",M.cor),W.innerHTML=`<i></i>${n(M.rotulo)} <small>${E||!X?E:`${e(X,0)} m`}</small>`,W.addEventListener("click",()=>{let tt=D(`disc:${d}`);tt.visible=!tt.visible,q[`infra:${d}`]&&(q[`infra:${d}`].visible=tt.visible),W.classList.toggle("ativo",tt.visible),f(!0)}),ui.appendChild(W)}i.dispositivos.some(d=>d.itens.some(M=>Array.isArray(M[7])))||t("#b-campo")?.remove();let Ye=i.numeros,Te=(d,M,E)=>`<div class="num"><div><span>${M}</span> ${d}</div><small>${E}</small></div>`;t("#numeros").innerHTML=[Te(e(Ye.area_interna_m2),"m²",`área interna, ${Ye.ambientes} ambiente${Ye.ambientes===1?"":"s"}`),Ye.area_externa_m2?Te(e(Ye.area_externa_m2),"m²",`área externa (${Ye.ambientes_externos})`):"",Te(`${e(Ye.dimensoes_m[0],1)} × ${e(Ye.dimensoes_m[1],1)}`,"m","dimensões gerais"),Te(e(Ye.pe_direito_m),"m","pé-direito adotado"),Te(Ye.paredes_m.toLocaleString("pt-BR"),"m",`de paredes (≈ ${Ye.paredes_area_m2.toLocaleString("pt-BR")} m² de face)`),Te(Ye.portas,"un","portas"),Ye.janelas?Te(Ye.janelas,"un","janelas / esquadrias"):"",Ye.pilares?Te(Ye.pilares,"un","pilares"):"",...Ye.dispositivos.map(d=>Te(d.quantidade,"un",n(d.rotulo))),...r.map(d=>Te(e(d.comprimento_m,1),"m",`${n(Ce(d))} · ${n(i.disciplinas[d.disciplina]?.rotulo||d.disciplina)}${d.sugerido?" (sugerido)":d.estimado?" (estimado)":""}`))].join(""),t("#lista-ambientes").innerHTML=`<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...Ye.por_ambiente].sort((d,M)=>d.nome.localeCompare(M.nome,"pt-BR",{numeric:!0})).map(d=>`<tr><td><i style="background:${(i.tiposAmbiente[d.tipo]||i.tiposAmbiente.outros).cor}"></i>${n(d.nome)}</td><td>${e(d.area_m2)}</td><td>${e(d.perimetro_m,1)}</td></tr>`).join("")}</tbody></table>`;let Je=t("#legenda");Je.innerHTML=i.dispositivos.map((d,M)=>`<button class="leg ativo" data-i="${M}" title="Mostrar/ocultar"><i class="f-${n(d.forma)}" style="--cor:${n(d.cor)}"></i><span>${n(d.rotulo)}<small>${n(i.disciplinas[d.disciplina]?.rotulo||"")} · ${n(d.altura)}</small></span><b>${d.itens.length}</b></button>`).join("")+r.map((d,M)=>`<button class="leg ativo" data-infra="${M}" title="Mostrar/ocultar"><i class="f-infra f-${n(d.forma)}" style="--cor:${n(d.cor)}"></i><span>${n(Ce(d))}<small>${n(i.disciplinas[d.disciplina]?.rotulo||d.disciplina)} · h = ${e(d.z)} m · ${n(De(d))}${d.layers?.length?` · ${n(d.layers.slice(0,2).join(", "))}`:""}</small></span><b>${e(d.comprimento_m,1)} m</b></button>`).join("")+`<div class="tipos">${[...new Set(i.ambientes.map(d=>d.tipo))].map(d=>`<span><i style="background:${i.tiposAmbiente[d].cor}"></i>${n(i.tiposAmbiente[d].rotulo)}</span>`).join("")}</div>`,Je.querySelectorAll(".leg").forEach(d=>d.addEventListener("click",()=>{let M=d.dataset.infra!=null?r[Number(d.dataset.infra)].objeto:i.dispositivos[Number(d.dataset.i)].malha;M&&(M.visible=!M.visible,d.classList.toggle("ativo",M.visible),f(!0))}));function Yn(d,M){let E=l.getBoundingClientRect(),X=d-E.left,W=M-E.top,tt=E.width,mt=E.height,At=null;for(let Wt of i.dispositivos){let Bt=Wt.malha;if(!(!Bt||!Bt.visible||!Bt.parent.visible))for(let Kt of Wt.itens){K.set(Kt[0],Kt[2],-Kt[1]);let Tt=A.position.distanceTo(K);if(ce==="dentro"&&Kt[5]!==nn&&Tt>4||(K.project(A),K.z>1||K.z<-1))continue;let ie=(K.x+1)/2*tt,ee=(1-K.y)/2*mt,he=Math.max(10,Wt.tamMax*P(Wt.tamMax,Tt)/(Tt*N.uPx.value)/2),Pe=Math.hypot(ie-X,ee-W);Pe<=he&&(!At||Pe<At.dd-2||Math.abs(Pe-At.dd)<=2&&Tt<At.d)&&(At={t:Wt,it:Kt,d:Tt,dd:Pe})}}return At}let Be=new O;function di(d,M){let E=l.getBoundingClientRect(),X=d-E.left,W=M-E.top,tt=E.width,mt=E.height,At=(Kt,Tt,ie)=>(Be.set(Kt,Tt,ie).project(A),Be.z>1||Be.z<-1?null:[(Be.x+1)/2*tt,(1-Be.y)/2*mt]),Wt=(Kt,Tt)=>{let ie=Tt[0]-Kt[0],ee=Tt[1]-Kt[1],he=ie*ie+ee*ee,Pe=he?Math.max(0,Math.min(1,((X-Kt[0])*ie+(W-Kt[1])*ee)/he)):0;return Math.hypot(X-Kt[0]-ie*Pe,W-Kt[1]-ee*Pe)},Bt=null;for(let Kt of r){if(!Kt.objeto||!Kt.objeto.visible||!Kt.objeto.parent.visible||!Yt.visible)continue;let Tt=Kt.segmentos||[],ie=Kt.descidas||[],ee=(he,Pe)=>{if(!he||!Pe)return;let Ie=Wt(he,Pe);Ie<=8&&(!Bt||Ie<Bt.d)&&(Bt={g:Kt,d:Ie})};for(let he=0;he+3<Tt.length;he+=4)ee(At(Tt[he],Kt.z,-Tt[he+1]),At(Tt[he+2],Kt.z,-Tt[he+3]));for(let he=0;he+3<ie.length;he+=4)ee(At(ie[he],ie[he+2],-ie[he+1]),At(ie[he],ie[he+3],-ie[he+1]))}return Bt&&Bt.g}let Sn=t("#dica");function Cs(d,M){let E=Yn(d,M),X=l.getBoundingClientRect(),W=E?null:di(d,M);if(!E&&!W)return Sn.style.display="none",l.style.cursor="",!1;if(W)Sn.innerHTML=`<b>${n(Ce(W))}</b><br>${n(i.disciplinas[W.disciplina]?.rotulo||W.disciplina)} · h = ${e(W.z)} m · ${e(W.comprimento_m,1)} m${W.descidas_m?` (${e(W.descidas_m,1)} m de descidas)`:""}<br><small>${n(De(W))}${W.layers?.length?` · layer ${n(W.layers.slice(0,2).join(", "))}`:""}</small>`;else{let{t:tt,it:mt}=E,At=i.ambientes[mt[5]],Wt=mt[8]?`<br>circuito ${n(mt[8])}${mt[9]?` · comando ${n(mt[9])}`:""}`:"",Bt=xt?Rt.get(mt):null,Kt=Bt&&Bt.kind!=="quadro"?xt.estadoPonto(Bt.id):null,Tt=Bt&&xt.ponto(Bt.id)?.comando,ie=Bt?Bt.kind==="quadro"?"clique para abrir o quadro":Bt.kind==="comando"?"clique para acionar":Bt.kind==="luz"&&Tt?"clique para acionar o comando":"clique para ver o circuito":"",ee=Bt?`<br>${Kt?`<b class="${Kt.energizado?"sim-on":"sim-off"}">${n(Kt.texto)}</b><br>`:""}<small>${ie}</small>`:"";Sn.innerHTML=`<b>${n(tt.rotulo)}</b>${mt[6]?` · ${n(mt[6])}`:""}<br>${At?`${n(At.nome)} · `:""}${n(Fe(tt,mt))}${Wt}${ee}<br><small>${n(i.disciplinas[tt.disciplina]?.rotulo||"")}</small>`}return Sn.style.display="block",Sn.style.left=`${Math.max(8,Math.min(d-X.left+14,X.width-290))}px`,Sn.style.top=`${M-X.top+14}px`,l.style.cursor="pointer",!0}let Aa=null;l.addEventListener("pointermove",d=>{d.pointerType!=="mouse"||d.buttons||(Aa||requestAnimationFrame(()=>{let M=Aa;Aa=null,M&&Cs(M.clientX,M.clientY)}),Aa=d)}),l.addEventListener("pointerleave",d=>{d.pointerType==="mouse"&&(Sn.style.display="none")});let Bh=new Ms,zh=new St;function Xl(d,M){if(ke||xt&&Gh(d,M))return!1;let E=l.getBoundingClientRect(),X=d-E.left,W=M-E.top;if(ce==="geral"){for(let Wt of Re)if(Wt.ret&&X>=Wt.ret[0]&&X<=Wt.ret[2]&&W>=Wt.ret[1]&&W<=Wt.ret[3])return Ne(Wt.a.i)}zh.set(X/E.width*2-1,-(W/E.height)*2+1),Bh.setFromCamera(zh,A);let tt=ce==="dentro"&&Dt&&D("paredes").visible?[...nt,Dt]:nt,mt=Bh.intersectObjects(tt,!1)[0];if(!mt||mt.object===Dt)return!1;let At=mt.object.userData.ambientes[mt.faceIndex];return At?ce==="dentro"?(He(mt.point.x,mt.point.z,At),!0):Ne(At.i):!1}let Zn=new Map,kh="mouse",Rs=null,ql=null,Ps=null,Vh=0;l.addEventListener("dblclick",d=>{kh!=="touch"&&Xl(d.clientX,d.clientY)}),l.addEventListener("pointerdown",d=>{if(kh=d.pointerType,Zn.set(d.pointerId,{x:d.clientX,y:d.clientY}),ql=Zn.size===1?{x:d.clientX,y:d.clientY,t:d.timeStamp}:null,ce==="dentro"&&(l.setPointerCapture?.(d.pointerId),Zn.size===2)){let[M,E]=[...Zn.values()];Rs={d:Math.hypot(M.x-E.x,M.y-E.y),fov:A.fov}}}),l.addEventListener("pointermove",d=>{let M=Zn.get(d.pointerId);if(!M)return;let E=d.clientX-M.x,X=d.clientY-M.y;if(M.x=d.clientX,M.y=d.clientY,!(ce!=="dentro"||ke)){if(Zn.size===1){let W=an.degToRad(A.fov)/Math.max(l.clientHeight,1);Mn+=E*W,H=an.clamp(H+X*W,-1.45,1.45),j()}else if(Zn.size===2&&Rs){let[W,tt]=[...Zn.values()];zi(an.clamp(Rs.fov*Rs.d/Math.max(Math.hypot(W.x-tt.x,W.y-tt.y),1),15,90))}}}),l.addEventListener("pointerup",d=>{let M=ql;if(Zn.delete(d.pointerId),Zn.size<2&&(Rs=null),!M||Zn.size||!(d.timeStamp-M.t<350&&Math.hypot(d.clientX-M.x,d.clientY-M.y)<10))return;if(d.pointerType!=="touch"){xt&&$l(d.clientX,d.clientY);return}let X=d.timeStamp;if(Ps&&X-Ps.t<450&&Math.hypot(d.clientX-Ps.x,d.clientY-Ps.y)<30){Ps=null,Xl(d.clientX,d.clientY);return}Ps={x:d.clientX,y:d.clientY,t:X},!(xt&&$l(d.clientX,d.clientY))&&Cs(d.clientX,d.clientY)&&(clearTimeout(Vh),Vh=setTimeout(()=>{Sn.style.display="none"},3e3))}),l.addEventListener("pointercancel",d=>{Zn.delete(d.pointerId),Rs=null,ql=null}),l.addEventListener("wheel",d=>{ce==="dentro"&&(d.preventDefault(),zi(an.clamp(A.fov*Math.exp(d.deltaY*.0012),15,90)))},{passive:!1});let Jn=new Set;window.addEventListener("keydown",d=>{if(!(d.target&&/INPUT|SELECT|TEXTAREA/.test(d.target.tagName))){if(Ls){d.key==="Escape"&&Zl();return}if(d.key==="Escape"&&ki?.classList.contains("aberta")){Yl();return}if(d.key==="Escape"&&ce==="dentro"){Ge();return}ce==="dentro"&&/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(d.key)&&(Jn.add(d.key.toLowerCase()),d.preventDefault())}}),window.addEventListener("keyup",d=>Jn.delete(d.key.toLowerCase())),window.addEventListener("blur",()=>Jn.clear());function of(d){if(ce!=="dentro"||ke||!Jn.size)return;let M=(Jn.has("arrowup")||Jn.has("w")?1:0)-(Jn.has("arrowdown")||Jn.has("s")?1:0),E=(Jn.has("d")?1:0)-(Jn.has("a")?1:0),X=(Jn.has("arrowleft")?1:0)-(Jn.has("arrowright")?1:0);if(X&&(Mn+=X*1.6*d,j()),!M&&!E)return;let W=1.8*d;A.position.x+=(-Math.sin(Mn)*M+Math.cos(Mn)*E)*W,A.position.z+=(-Math.cos(Mn)*M-Math.sin(Mn)*E)*W,f(!0);let tt=on(A.position.x,-A.position.z);tt&&tt.i!==nn&&(nn=tt.i,pe(tt),Gt(tt))}let Ta=xt?Wl():null;function Gh(d,M){let E=Yn(d,M);return E&&Rt.get(E.it)||null}function $l(d,M){let E=Gh(d,M);if(!E)return!1;if(Sn.style.display="none",E.kind==="quadro")return wa(E.quadro),!0;let X=null;return(E.kind==="comando"||E.kind==="luz"&&xt.ponto(E.id)?.comando)&&(X=xt.acionar(E.id)),X&&Ta(X),lf(E),!0}let ki=null,Ar=null,Is=null;function lf(d){if(!ki){ki=document.createElement("div"),ki.id="ficha";let M=document.createElement("button");M.className="fechar",M.title="Fechar",M.textContent="×",M.addEventListener("click",Yl),Ar=document.createElement("div"),ki.append(M,Ar),document.body.appendChild(ki),ba(Ar,xt,{abrirQuadro:wa,aviso:Ta})}Is=d,ki.classList.add("aberta"),Hh()}function Yl(){Is=null,ki?.classList.remove("aberta")}function Hh(){if(!Is||!Ar)return;let d=i.ambientes[Is.it[5]];Ar.innerHTML=sf(xt,Is.id,{rotulo:Is.t.rotulo,ambiente:d?d.nome:""})}if(xt){let d=t("#b-tela"),M=t("#barra"),E=(X,W,tt)=>{let mt=document.createElement("button");return mt.textContent=X,mt.title=W,mt.addEventListener("click",tt),M.insertBefore(mt,d||null),mt};for(let X of xt.quadros().slice(0,4))E(`Quadro ${X.tag}`,`Abrir o quadro ${X.tag}: porta, disjuntores com alavanca (desligar um disjuntor apaga o circuito no prédio)`,()=>wa(X.tag));E("Religar tudo","Simulação: volta tudo ao estado inicial (disjuntores ligados, luzes acesas)",()=>{xt.reiniciar(),Ta("Simulação reiniciada: tudo ligado")}),xt.assinar(G)}let Ls=!1,bn=null;function wa(d){let M=xt&&xt.quadro(d);if(M){if(!bn){let E=document.createElement("div");E.id="q-sim",E.innerHTML=`<canvas id="tela"></canvas><div id="etiquetas"></div>
<nav id="barra"><button id="b-voltar-predio" title="Voltar ao prédio (Esc)">← Voltar ao prédio</button><span class="q-nome"></span>
<button id="b-3d">Vista 3D</button><button id="b-frente">Vista frontal</button><button id="b-porta" title="Abrir ou fechar a porta">Porta aberta</button><button id="b-etiquetas">Etiquetas</button></nav>
<aside><section><h2>Disjuntores — clique para ligar/desligar</h2><div id="simulacao"></div></section><section><h2>Dispositivo</h2><div id="info"></div></section></aside>`,document.body.appendChild(E),E.querySelectorAll("aside h2").forEach(X=>{X.onclick=()=>X.parentNode.classList.toggle("fechada")}),bn={el:E,ctrl:null,tag:null}}if(Ls=!0,bn.el.classList.add("aberto"),Yl(),Sn.style.display="none",bn.tag!==d){if(bn.ctrl){bn.ctrl.destruir();let X=document.createElement("canvas");X.id="tela",bn.el.querySelector("#tela").replaceWith(X),bn.el.querySelector("#etiquetas").innerHTML=""}let E=M.cena3d?{...M.cena3d}:af(M,xt);delete E.instalacao,bn.el.querySelector(".q-nome").textContent=`${M.tag}${M.descricao?` — ${M.descricao}`:""}${M.cena3d?"":" (arranjo esquemático)"}`,bn.ctrl=Oh(E,{raiz:bn.el,sim:xt,quadroTag:d,embutido:!0,portaFechada:!0,aoVoltar:Zl,aviso:Ta}),bn.tag=d}else bn.ctrl.ativar(!0),bn.ctrl.abrirAnimado()}}function Zl(){Ls&&(Ls=!1,bn.el.classList.remove("aberto"),bn.ctrl?.ativar(!1),f(!0))}function cf(){let d=0,M=ke?yt:L.target;if(_e.corte&&ce!=="dentro"&&_e.paredes!==2){let W=A.position.x-M.x,tt=A.position.z-M.z,mt=Math.hypot(W,tt),At=Math.abs(A.position.y-M.y);mt>.35*At&&mt>.5&&(d=1,zt.uDir.value.set(W/mt,tt/mt),zt.uAlvo.value.copy(M))}zt.uCorte.value=d;let E=ce!=="dentro"&&A.position.y>s+.3;for(let W of wt)W.opacity=E?.45:1,W.depthWrite=!E;for(let W of pt)W.visible=d===1&&_e.paredes===0;let X=zt.uDir.value;for(let W of ft){let tt=d===1&&(W.cx-M.x)*X.x+(W.cz-M.z)*X.y>zt.uMargem.value;W.m.scale.z=tt?o/s:1}}function hf(){let d=ce==="dentro"||ke?.05:an.clamp(A.position.distanceTo(L.target)*.01,.05,1);Math.abs(A.near-d)>A.near*.25&&(A.near=d,A.updateProjectionMatrix())}function Ca(){let d=Er();Mt=d,c.setSize(d.w,d.h,!1),A.aspect=d.w/Math.max(d.h,1),A.setViewOffset(d.w,d.h,d.lateral/2,-(d.topo-44)/2,d.w,d.h),A.updateProjectionMatrix(),f(!0)}window.addEventListener("resize",Ca),window.addEventListener("load",Ca),Ca(),gn(),Tn(),ws(),G();let Wh=performance.now(),Ds=new Float64Array(33).fill(NaN);function uf(){let d=A.matrixWorld.elements,M=A.projectionMatrix.elements,E=l.clientWidth*1e5+l.clientHeight,X=Ds[32]!==E;Ds[32]=E;for(let W=0;W<16;W++)Ds[W]!==d[W]&&(X=!0,Ds[W]=d[W]),Ds[16+W]!==M[W]&&(X=!0,Ds[16+W]=M[W]);return X}function Xh(d=performance.now()){let M=Math.min(.1,Math.max(0,(d-Wh)/1e3));Wh=d,!Ls&&(Jt(d),of(M),ce==="geral"&&!ke&&L.update()&&(p=!0),p&&(p=!1,hf(),N.uPx.value=2*Math.tan(an.degToRad(A.fov/2))/Math.max(l.clientHeight,1),cf(),c.render(h,A),(uf()||u)&&(u=!1,se(),$n())))}window.HM3D={vista3d:ws,vistaDeCima:Ea,entrarAmbiente:Ne,voltarVistaGeral:Ge,grupos:q,estado:_e,renderer:c,camera:A,controles:L,cena:h,olhar:(d,M=0)=>{ce==="dentro"&&(Mn=an.degToRad(d),H=an.degToRad(M),j())},girarCabeca:(d,M)=>{ce==="dentro"&&(Mn+=an.degToRad(d),M!=null&&(H=an.degToRad(M)),j())},lente:d=>zi(an.clamp(d,15,90)),olharPara:(d,M,E)=>{ce==="dentro"&&Q(T(d,M,E))},irPara:(d,M)=>{if(ce==="dentro"){A.position.set(d,a,-M),f(!0);let E=on(d,M);E&&E.i!==nn&&(nn=E.i,pe(E),Gt(E))}},escolherDispositivo:Yn,mostrarDica:Cs,aoDuploClique:Xl,get modo(){return ce},get ambienteAtual(){return nn},render:()=>{f(!0),Xh(performance.now())},get sujo(){return p},sim:xt,abrirQuadro:wa,fecharQuadro:Zl,clicarInterativo:$l,get quadroAberto(){return Ls},get quadro3d(){return bn?.ctrl||null},corDoPonto:d=>{let M=Et.find(X=>X.id===d);if(!M?.t.malha.instanceColor)return null;let E=new ue;return M.t.malha.getColorAt(M.i,E),[E.r,E.g,E.b].map(X=>Math.round(X*100)/100)},get luzesAcesas(){return ct.filter(d=>d.intensity>0).length}};function qh(d){requestAnimationFrame(qh),Xh(d)}requestAnimationFrame(qh),document.body.classList.add("pronto")}})();
