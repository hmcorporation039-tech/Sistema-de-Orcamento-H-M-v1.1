/* Visualizador 3D H&M — fonte:8e3fda9cd006649a — inclui three.js r186 (0.186.1) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */
(()=>{var Nm=Object.create;var Th=Object.defineProperty;var Um=Object.getOwnPropertyDescriptor;var Om=Object.getOwnPropertyNames;var Fm=Object.getPrototypeOf,Bm=Object.prototype.hasOwnProperty;var Zs=(n,t)=>()=>{try{return t||n((t={exports:{}}).exports,t),t.exports}catch(e){throw t=0,e}};var zm=(n,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of Om(t))!Bm.call(n,s)&&s!==e&&Th(n,s,{get:()=>t[s],enumerable:!(i=Um(t,s))||i.enumerable});return n};var Js=(n,t,e)=>(e=n!=null?Nm(Fm(n)):{},zm(t||!n||!n.__esModule?Th(e,"default",{value:n,enumerable:!0}):e,n));var Np=Zs((HE,Lp)=>{var fb=n=>Math.max(1,n),pb=n=>({1:2,2:4,3:7,4:8})[n]||2*n,mb=n=>n<=2?2:4,gb=n=>n==="II"?1:2,_b=[{ate:160,l:105,h:161,p:86,l4:140},{ate:250,l:105,h:161,p:86,l4:140},{ate:630,l:140,h:255,p:110,l4:185},{ate:1600,l:210,h:327,p:147,l4:280}],xb=[{ate:38,l:45,h:85,p:95},{ate:65,l:55,h:120,p:115},{ate:95,l:70,h:125,p:125},{ate:150,l:120,h:170,p:140},{ate:400,l:160,h:220,p:180},{ate:800,l:230,h:300,p:220}],vb=[{ate:32,l:45,h:90,p:95},{ate:65,l:55,h:130,p:110},{ate:100,l:70,h:140,p:120}],yb=45,bb=[{ate:38,l:45,h:160,p:140},{ate:85,l:95,h:200,p:160},{ate:200,l:180,h:300,p:190},{ate:600,l:300,h:450,p:250}],Mb=[{ate:7,l:75,h:200,p:160},{ate:16,l:100,h:240,p:180},{ate:33,l:140,h:300,p:200},{ate:61,l:200,h:400,p:220},{ate:150,l:280,h:600,p:300},{ate:400,l:400,h:900,p:380}],Sb={cpu:{l:110,h:100,p:75,consumo_ma:300,perda_w:10,rotulo:"CPU compacta"},DI:{canais:16,l:45,h:100,p:75,consumo_ma:50,perda_w:2.5,rotulo:"Módulo 16 entradas digitais 24 Vcc"},DO:{canais:16,l:45,h:100,p:75,consumo_ma:60,perda_w:3,rotulo:"Módulo 16 saídas digitais 24 Vcc (transistor)"},AI:{canais:4,l:45,h:100,p:75,consumo_ma:60,perda_w:2,rotulo:"Módulo 4 entradas analógicas 4–20 mA / 0–10 V"},AO:{canais:2,l:45,h:100,p:75,consumo_ma:60,perda_w:2,rotulo:"Módulo 2 saídas analógicas 4–20 mA / 0–10 V"},RS485:{l:30,h:100,p:75,consumo_ma:50,perda_w:1.5,rotulo:"Módulo de comunicação RS-485 (Modbus RTU)"}},Ab={DI:14,DO:10,AI:2,AO:0},Eb=[2.5,5,10,20,40],Tb={2.5:{l:54,h:90},5:{l:70,h:90},10:{l:65,h:125},20:{l:86,h:125},40:{l:125,h:130}},wb=.9,Cb={l:6.2,h:90,p:80,consumo_ma:17,perda_w:.4},Rb={l:45,h:110,p:80,consumo_ma:200,perda_w:4.8},Pb={ihm:500,sinaleiro:20,sensor:30,rele_seguranca:100},Ib={rele:{rotulo:"Relé auxiliar 4 contatos reversíveis 24 Vcc com base, LED e diodo",l:27,h:80,p:75,consumo_ma:37,perda_w:.9},temporizador:{rotulo:"Relé temporizador ao trabalho 24 Vcc (modular)",l:17.5,h:90,p:65,consumo_ma:25,perda_w:.6},contator:{rotulo:"Contator tripolar AC-3, bobina 24 Vcc",consumo_ma:100,perda_w:2}},Db={1.5:5.2,2.5:5.2,4:6.2,6:8.2,10:10.2,16:12.2,25:16,35:16,50:18.5,70:22,95:25},Lb=60,Nb=9,Ub=[[30,30],[30,50],[40,40],[40,60],[50,50],[50,80],[60,60],[60,80],[80,80],[80,100],[100,100]],Ob=.5,Fb={.5:2.2,.75:2.4,1:2.6,1.5:3,2.5:3.6,4:4.3,6:4.9,10:6.4,16:7.6,25:9.6,35:10.9,50:13,70:15,95:17.5,120:19.3},Bb=[[10,1.5],[16,2.5],[20,2.5],[25,4],[32,6],[40,10],[50,10],[63,16],[80,25],[100,35],[125,50]],zb=.75,kb=1.5,Vb={sobrepor:{alturasLarguras:[[300,300],[400,300],[400,400],[500,400],[600,400],[600,500],[600,600],[700,500],[800,600],[800,800],[1e3,600],[1e3,800],[1200,800],[1200,1e3]],profundidades:[150,200,250,300,400],margemPlaca:[60,60]},embutir:{alturasLarguras:[[300,300],[400,300],[400,400],[500,400],[600,400],[600,500],[700,500],[800,600],[1e3,600],[1e3,800],[1200,800]],profundidades:[100,150,200],margemPlaca:[60,60]},autoportante:{alturasLarguras:[600,800,1e3,1200].flatMap(n=>[1800,2e3,2200].map(t=>[t,n])),profundidades:[400,500,600,800],margemPlaca:[250,100]}},Gb=15,Hb=40,Wb=[{l:12,e:2,nua:108,pintada:123},{l:15,e:2,nua:128,pintada:148},{l:15,e:3,nua:162,pintada:187},{l:20,e:3,nua:204,pintada:237},{l:20,e:5,nua:274,pintada:319},{l:25,e:5,nua:327,pintada:384},{l:30,e:5,nua:379,pintada:447},{l:40,e:5,nua:482,pintada:573},{l:30,e:10,nua:573,pintada:676},{l:50,e:5,nua:583,pintada:697},{l:60,e:5,nua:688,pintada:826},{l:40,e:10,nua:715,pintada:850},{l:50,e:10,nua:852,pintada:1020},{l:80,e:5,nua:885,pintada:1070},{l:60,e:10,nua:985,pintada:1180},{l:100,e:5,nua:1080,pintada:1300},{l:80,e:10,nua:1240,pintada:1500},{l:100,e:10,nua:1490,pintada:1810},{l:120,e:10,nua:1740,pintada:2110}],$b=.61,qb=[{a:63,s:10},{a:80,s:16},{a:100,s:25},{a:125,s:35}],Xb=8.96,Yb=.0172,jb=.00393,Zb=226,Jb=234.5,Kb=200,Qb=.73,tM=1.1,eM=1.5,nM=200,iM=[{ate:5,n:1.5,fp:.7},{ate:10,n:1.7,fp:.5},{ate:20,n:2,fp:.3},{ate:50,n:2.1,fp:.25},{ate:1/0,n:2.2,fp:.2}],sM=[6,10,15,20,25,35,50,65,80,100],rM=[2,4,6,10,13,16,20,25,32,40,50,63,80,100,125],aM=[16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1e3,1250,1600],oM=[3,4.5,6,10],lM=[10,15,20,25],cM=[16,25,36,50,70,100];function uM(n){return n<=6?n:n<=10?Math.max(6,.75*n):Math.max(7.5,.5*n)}var dM=[25,40,63,80,100,125],hM=1.6,fM=[50,60,75,100,150,200,250,300,400,500,600,800,1e3,1200,1500,2e3],pM=63,mM=[{ate:250,l:60,h:80,p:45},{ate:600,l:90,h:105,p:50},{ate:1/0,l:120,h:140,p:55}],gM={l:70,h:75,p:55},_M={l:17.5,h:80,p:45},xM=[[10,3],[16,3.5],[25,4.5],[32,6],[40,7.5],[50,9],[63,13],[100,15],[125,20]],vM=[[160,8],[250,15],[400,20],[630,35],[1e3,50],[1600,80]],yM=[[25,1.5],[40,2.5],[63,4.5],[80,6],[100,8],[125,10]],bM=[[12,3.5],[25,5],[38,7.5],[65,12],[95,18],[150,30],[400,45],[800,70]],MM=[[10,5],[25,7],[40,9],[63,12],[100,18]],SM=[[25,4],[80,8],[1/0,15]],AM=n=>10+.4*n,EM=.03,TM=4,wM=8,CM={tetoExposto:1.4,tetoCoberto:.7,ladoExposto:.9,ladoCoberto:.5},RM={aco:5.5,inox:4.5,aluminio:12,poliester:3.5},PM=1.3,IM=[[100,3.1],[250,3.2],[500,3.3],[750,3.4],[1e3,3.5],[1250,3.6],[1500,3.7],[1750,3.8],[2e3,3.9]],DM=[25,55,105,180,300,550,700,900],LM=.7,NM=.0045,UM=[[1,1],[3,.9],[5,.8],[9,.7],[1/0,.6]],OM={interno_tecnico:{rotulo:"Interno — sala elétrica / área técnica (acesso restrito)",ip:"IP31",ik:"IK07",influencias:"AD1, AE1, AG1"},interno_publico:{rotulo:"Interno — área comum (acesso de pessoas leigas)",ip:"IP41",ik:"IK08",influencias:"AD1, AE2, AG2"},interno_poeira:{rotulo:"Interno — indústria (poeira, respingos)",ip:"IP54",ik:"IK08",influencias:"AD3, AE5, AG2"},externo_abrigado:{rotulo:"Externo abrigado (sob cobertura)",ip:"IP55",ik:"IK08",influencias:"AD4, AE5, AG2"},externo_exposto:{rotulo:"Externo exposto (chuva, sol)",ip:"IP65",ik:"IK10",influencias:"AD5, AE6, AG3"},lavagem:{rotulo:"Área com lavagem por jato",ip:"IP66",ik:"IK10",influencias:"AD6, AE6, AG3"}},FM={1:"Forma 1 — sem separação interna","2a":"Forma 2a — barramentos separados das unidades funcionais; terminais não separados dos barramentos","2b":"Forma 2b — barramentos separados das unidades funcionais; terminais separados dos barramentos","3a":"Forma 3a — barramentos separados das unidades funcionais e unidades funcionais separadas entre si; terminais não separados dos barramentos","3b":"Forma 3b — como 3a, com os terminais separados dos barramentos","4a":"Forma 4a — como 3b, com os terminais de cada unidade funcional separados entre si, no mesmo compartimento da unidade","4b":"Forma 4b — como 4a, com os terminais em compartimento próprio, separado da unidade funcional"},BM=[[60,1e3],[300,1500],[690,1890],[800,2e3],[1e3,2200]],zM=[[2.5,1.5],[4,3],[6,5.5],[8,8],[12,14]],kM=[[250,4],[400,6.3],[500,8],[630,10],[800,12.5],[1e3,16]],VM={eta:.88,fp:.84,ipIn:7},GM=(n,t)=>n.find(e=>e>=t-1e-9),HM=(n,t)=>(n.find(([e])=>t<=e+1e-9)||n[n.length-1])[1],WM=(n,t)=>n.find(e=>t<=e.ate+1e-9)||n[n.length-1];Lp.exports={MODULO_MM:18,MODULO_NOMINAL_MM:17.5,DIN_ALTURA:90,DIN_PROF:80,modulosDisjuntor:fb,modulosDdr:pb,modulosIdr:mb,modulosDps:gb,CAIXA_MOLDADA:_b,CONTATOR_DIM:xb,DISJUNTOR_MOTOR_DIM:vb,RELE_SOBRECARGA_ALTURA:yb,SOFT_DIM:bb,INVERSOR_DIM:Mb,CLP:Sb,CPU_IO_PADRAO:Ab,RELE_AUXILIAR:Ib,FONTES_24V_A:Eb,FONTE_DIM:Tb,FONTE_RENDIMENTO:wb,RELE_INTERFACE:Cb,SWITCH:Rb,CONSUMO_24V_MA:Pb,BORNE_LARGURA:Db,BORNE_ALTURA:Lb,BORNE_POSTE_MM:Nb,CANALETAS:Ub,OCUPACAO_CANALETA:Ob,DIAMETRO_FIO:Fb,FIO_POR_CORRENTE:Bb,FIO_COMANDO:zb,FIO_COMANDO_CA:kb,INVOLUCROS:Vb,MARGEM_UTIL:Gb,FOLGA_PORTA:Hb,BARRAS_DIN43671:Wb,EXPOENTE_K2:$b,PENTES:qb,DENSIDADE_COBRE:Xb,RHO_20:Yb,ALFA_COBRE:jb,K_ADIABATICO_COBRE:Zb,BETA_COBRE:Jb,THETA_FINAL_BARRA:Kb,BETA_VIGA:Qb,ALFA_APOIO:tM,Q_RETANGULAR:eM,RP02_COBRE:nM,FATOR_N_IPK:iM,ICW_KA:sM,DISJUNTORES_DIN:rM,DISJUNTORES_CM:aM,ICN_60898:oM,ICU_DIN_60947:lM,ICU_CM:cM,icsDin:uM,IDR_IN:dM,RAZAO_SELETIVIDADE:hM,TCS:fM,MEDICAO_DIRETA_MAX_A:pM,TC_JANELA_DIM:mM,BLOCO_AFERICAO:gM,TERMOSTATO:_M,PERDA_DISJUNTOR_DIN:xM,PERDA_CAIXA_MOLDADA:vM,PERDA_IDR:yM,PERDA_CONTATOR:bM,PERDA_DISJUNTOR_MOTOR:MM,PERDA_RELE:SM,PERDA_SOFT:AM,PERDA_INVERSOR_PCT:EM,PERDA_MEDIDOR_W:TM,PERDA_IHM_W:wM,FATOR_SUPERFICIE:CM,COEF_TRANSMISSAO:RM,FATOR_TOPO:PM,FATOR_F_ALTITUDE:IM,VENTILADORES_M3H:DM,EFICIENCIA_FILTRO:LM,DERATING_DIN_POR_C:NM,RDF:UM,LOCAIS:OM,FORMAS:FM,TENSAO_ENSAIO:BM,DISTANCIA_ISOLAMENTO:zM,DISTANCIA_ESCOAMENTO:kM,MOTOR_PADRAO:VM,proximo:GM,porFaixa:HM,dimPorCorrente:WM}});var Xd=Zs((WE,Hp)=>{var Yi=Np(),ei="[CONFERIR] — não consta no projeto",Lc={unifilar:"diagrama unifilar do projeto",tabela:"quadro de cargas do projeto","unifilar+tabela":"diagrama unifilar / quadro de cargas do projeto",legenda:"legenda do projeto",diagrama:"diagrama do projeto",projeto:"projeto",planta:"texto da planta",quadros:"cálculo da skill quadros (caderno de fabricação)",calculado:"calculado pela skill quadros — conferir com o fabricante",sistema:"sistema (convenção H&M)",padrao_hm:"padrão da skill quadros",norma:"NBR 5410"},Bs=n=>Lc[n]||String(n||""),Ve=n=>String(n??""),Zi=(n,t=1)=>Number.isInteger(Number(n))?String(Number(n)):Number(n).toFixed(t).replace(".",","),ji=n=>n!=null&&n!==""&&!(typeof n=="number"&&!Number.isFinite(n)),Ye={F:"#202226",N:"#7ec4ff",PE:"#3aa845",PE_FAIXA:"#ffd21f",APAGADO:"#7d828a",barraFase:"#c87533",barraN:"#7ec4ff",barraPE:"#3aa845",isolador:"#7a2f2a",canaleta:"#8d949c",trilho:"#b8bcc2",borne:"#a7afb8",bornePE:"#57b35a",borneN:"#5aa7e6"},qd="N azul-claro e PE verde-amarelo (NBR 5410, 6.1.5.3); fases em preto com anilha L1/L2/L3 (padrão da skill quadros — o projeto não define a cor das fases)";function fr(n,...t){for(let e of t)if(e?.fontes&&e.fontes[n])return e.fontes[n];for(let e of t)if(e?.origem&&Lc[e.origem])return e.origem;for(let e of t)if(e?.fonte&&Lc[e.fonte])return e.fonte;return null}var wn=(n,t,e)=>ji(t)?{campo:n,valor:String(t),fonte:Bs(e)||"projeto",conferir:!1}:{campo:n,valor:ei,fonte:"—",conferir:!0},ti=n=>{let t=Number(n);return Number.isInteger(t)&&t>=1&&t<=4?t:null},$M=n=>n?.descricao&&!/^Circuito\s+\S+$/i.test(String(n.descricao))?n.descricao:null;function Fp(n,t,e=null,i=null){if(!t)return[];let s=ti(t.polos),r=a=>fr(a,t,e,n);return[{campo:"TAG",valor:Ve(t.tag),fonte:t.tagDoProjeto?Bs(r("tag")):"sistema (Q + nº do circuito)",conferir:!1},wn("Circuito",t.circuito,r("numero")),wn("Polos",s?`${s}P (${s*Yi.MODULO_MM} mm — ${s} módulo${s>1?"s":""} DIN)`:null,r("polos")),wn("Corrente nominal (In)",ji(t.In)?`${t.In} A`:null,r("In")),wn("Curva",t.curva,r("curva")),wn("Capacidade de interrupção (Icu/Icn)",ji(t.icu_ka)?`${Zi(t.icu_ka)} kA`:ji(t.icn_ka)?`${Zi(t.icn_ka)} kA (Icn)`:null,r("icu_ka")),wn("Descrição do circuito",$M(e),r("descricao")),wn("Seção do cabo de saída",ji(e?.secao_mm2)?`${Zi(e.secao_mm2)} mm²`:null,fr("secao_mm2",e,n)),...i?[{campo:"Protegido pelo DR",valor:`${i.tag}${ji(i.idn_ma)?` (${i.idn_ma} mA)`:""}`,fonte:Bs(fr("dr",e,i,n))||"projeto",conferir:!1}]:[]]}function Bp(n,t){if(!t)return[];let e=ti(t.polos),i=s=>fr(s,t,n);return[{campo:"TAG",valor:Ve(t.tag),fonte:t.lido?Bs(i("tag"))||"diagrama do projeto":"sistema",conferir:!1},wn("Dispositivo",t.ddr?"Disjuntor diferencial (DDR)":"Interruptor diferencial residual (DR)",i("tipo")||n?.origem||"projeto"),wn("Polos",e?`${e}P`:null,i("polos")),wn("Corrente nominal (In)",ji(t.In)?`${t.In} A`:null,i("In")),wn("Sensibilidade (IΔn)",ji(t.idn_ma)?`${t.idn_ma} mA`:null,i("idn_ma")),wn("Circuitos protegidos",(t.circuitos||[]).length?t.circuitos.join(", "):null,i("circuitos"))]}function zp(n){let t=n?.geral;if(!t)return[];let e=ti(t.polos),i=s=>fr(s,t,n);return[{campo:"TAG",valor:Ve(t.tag),fonte:"sistema",conferir:!1},wn("Dispositivo","Disjuntor geral do quadro",n.origem||"projeto"),wn("Polos",e?`${e}P`:null,i("polos")),wn("Corrente nominal (In)",ji(t.In)?`${t.In} A`:null,i("In")),wn("Curva",t.curva,i("curva")),wn("Capacidade de interrupção (Icu)",ji(t.icu_ka)?`${Zi(t.icu_ka)} kA`:null,i("icu_ka")),wn("Alimentador",t.alimentador||n.alimentador,i("alimentador"))]}function Uc(n){let t=ti(n?.geral?.polos),e=Math.max(0,...(n?.disjuntores||[]).map(i=>ti(i.polos)||0));return t>=3||e>=3?{n:3,fonte:t?"polos do disjuntor geral":"polos dos disjuntores",conferir:!1}:t===2||e===2?{n:2,fonte:"polos dos disjuntores (bifásico — conferir se F+N)",conferir:!0}:t===1||e===1?{n:1,fonte:"polos dos disjuntores",conferir:!0}:{n:3,fonte:ei,conferir:!0}}function Wd(n,t){let e=String(n?.fases??"").toUpperCase().replace(/L1|R/g,"A").replace(/L2|S/g,"B").replace(/L3|T/g,"C").replace(/[^ABC]/g,""),i=[...new Set(e.split("").filter(Boolean))].map(s=>({A:"L1",B:"L2",C:"L3"})[s]);return i.length>=Math.min(t,3)?i.slice(0,t):null}var qM=.2;function kp(n){let t=n+Math.ceil(n*qM)+2;return{furos:t,comprimento_mm:20+10*Math.ceil(t/2)}}function $d(n,{terminais:t={},nFases:e=null,larguraFases:i=null}={}){let s=n?.barramentos&&typeof n.barramentos=="object"?n.barramentos:null,r=e||Uc(n).n,a=s&&s.fonte==="projeto",o=s?a?"projeto":"calculado":null,l=s?a?Bs(s.origem||"projeto"):"calculado pela skill quadros (DIN 43671 e NBR 5410, Tabela 58) — conferir com o fabricante":ei,c=[],u=p=>p&&Number(p.l)>0&&Number(p.e)>0?{largura_mm:Number(p.l),espessura_mm:Number(p.e)}:null,f=s?.tipo==="barra"?"barra":s?.tipo==="pente"?"pente":null,h=["L1","L2","L3"].slice(0,r);if(f==="barra"){let p=u(s.fase);for(let x of h)c.push({funcao:x,tipo:"barra",...p||{},comprimento_mm:i,furos:null,material:s.material||"Cobre eletrolítico (Cu-ETP)",cor:Ye.barraFase,fonte:p?o:null,fonte_texto:p?l:ei,conferir:!p||!a})}else c.push({funcao:h.join("/"),tipo:"pente",pente_a:s?.pente?.a??null,secao_mm2:s?.pente?.s??s?.secaoFase??null,comprimento_mm:i,furos:null,material:s?.pente?"Cobre isolado (pente do fabricante dos disjuntores)":null,cor:Ye.barraFase,fonte:s?.pente?o:null,fonte_texto:s?.pente?l:ei,conferir:!s?.pente||!a});for(let[p,x,S,m]of[["N",s?.neutro||(f==="pente"&&s?.secaoNeutro,null),Ye.barraN,"Cobre eletrolítico, identificada azul-claro (NBR 5410, 6.1.5.3.1)"],["PE",s?.pe,Ye.barraPE,"Cobre eletrolítico, identificada verde-amarelo (NBR 5410, 6.1.5.3.2)"]]){let g=u(x),P=Number(t[p])||0,O=kp(P);c.push({funcao:p,tipo:"barra",...g||{},...p==="N"&&!g&&s?.secaoNeutro?{secao_mm2:s.secaoNeutro}:{},comprimento_mm:O.comprimento_mm,furos:O.furos,terminais_usados:P,material:m,cor:S,fonte:g?o:null,fonte_texto:g?l:p==="N"&&s?.secaoNeutro?`${l} (seção ≥ ${Zi(s.secaoNeutro)} mm²; a barra pelo fabricante)`:ei,conferir:!g||!a,regra_furos:"furos = condutores ligados + 20 % de reserva + 2 (regra da skill quadros, passo 10 mm em 2 fileiras) — conferir com o fabricante"})}return{tipo:f||(s?"pente":null),barras:c,fonte:o,icc_ka:s?.icc_ka??null,icc_informada:s?.icc_informada??null,notas:s?.notas||[]}}var co=n=>[n.largura_mm?`${Zi(n.largura_mm)} × ${Zi(n.espessura_mm)} mm`:n.secao_mm2?`${Zi(n.secao_mm2)} mm²`:ei].join("");function Dc(n,t){return[{campo:"Barra",valor:n.funcao==="N"?"Neutro (N)":n.funcao==="PE"?"Terra (PE)":n.tipo==="pente"?`Fases ${n.funcao} — pente`:`Fase ${n.funcao}`,fonte:"projeto",conferir:!1},{campo:"Seção (largura × espessura)",valor:n.tipo==="pente"?n.pente_a?`pente ${n.pente_a} A${n.secao_mm2?` (${Zi(n.secao_mm2)} mm²)`:""}`:ei:co(n),fonte:n.fonte_texto,conferir:n.conferir},{campo:"Comprimento",valor:n.comprimento_mm?`${Math.round(n.comprimento_mm)} mm (no arranjo)`:ei,fonte:n.funcao==="N"||n.funcao==="PE"?"regra da skill quadros (furos × passo)":"largura do arranjo",conferir:!n.comprimento_mm},...n.furos!=null?[{campo:"Furos / bornes",valor:`${n.furos} (${n.terminais_usados} usados no projeto)`,fonte:n.regra_furos,conferir:!0}]:[],{campo:"Material",valor:n.material||ei,fonte:n.material?n.fonte==="projeto"?"projeto":"NBR 5410 (cor) / skill quadros":"—",conferir:!n.material},...t?.barramentos?.icc_informada===!1?[{campo:"Icc considerada",valor:`${Zi(t.barramentos.icc_ka)} kA (premissa da skill quadros: o projeto não informa)`,fonte:ei,conferir:!0}]:[]]}var uo=50;function Vp(n){let t=n.caixas||[],e=t.filter(f=>f.camada==="canaletas"),i=e.filter(f=>f.l>=f.a).map(f=>({y:f.y+f.a/2,x0:f.x,x1:f.x+f.l,z:f.z+f.p/2,larg:f.a})),s=e.filter(f=>f.a>f.l).map(f=>({x:f.x+f.l/2,y0:f.y,y1:f.y+f.a,z:f.z+f.p/2,larg:f.l})),{L:r=600,A:a=800}=n.involucro||{},o=t.find(f=>f.tag==="FLANGE")||null,l=o?{x0:o.x+12,x1:o.x+o.l-12,y:o.y+(o.y>a/2?-6:8),z:o.z+o.p/2,sup:o.y>a/2}:{x0:r*.3,x1:r*.7,y:8,z:uo,sup:!1},c=s.length?s.reduce((f,h)=>h.x<f.x?h:f):{x:18,y0:0,y1:a,z:uo,larg:30},u=s.length?s.reduce((f,h)=>h.x>f.x?h:f):{x:r-18,y0:0,y1:a,z:uo,larg:30};return{H:i,V:s,esq:c,dir:u,saida:l,L:r,A:a}}function Up(n,t,e,i){return n.H.filter(r=>(i>0?r.y>e+1:r.y<e-1)&&t>=r.x0-30&&t<=r.x1+30).sort((r,a)=>Math.abs(r.y-e)-Math.abs(a.y-e))[0]||{y:e+i*28,z:uo,larg:20,virtual:!0}}var Hd=(n,t)=>(n%7-3)*Math.min(4.5,Math.max(1.5,(t||30)/9));function Op(n){let t=[];for(let e of n){let i=e.map(r=>Math.round(r*10)/10),s=t[t.length-1];(!s||Math.hypot(s[0]-i[0],s[1]-i[1],s[2]-i[2])>.5)&&t.push(i)}return t}function ds(n,t,e,i){let s=n.x+n.l*(t+.5)/Math.max(1,e),r=i==="cima"?n.y+n.a-9:n.y+9;return{x:s,y:r,z:n.z+n.p-14,lado:i}}function ui(n,t,e,{lado:i="esquerda",k:s=0}={}){let r=i==="direita"?n.dir:n.esq,a=Hd(s,r.larg),o=t.lado==="barra"?{y:t.y,z:t.z}:Up(n,t.x,t.y,t.lado==="cima"?1:-1),l=[[t.x,t.y,t.z]],c=(o.z??uo)+(s%3-1)*5,u=o.y+(t.lado==="barra"?0:Hd(s+2,o.larg));if(l.push([t.x,u,c]),e.saida)return l.push([r.x+a,u,c],[r.x+a,e.y+(e.sup?-18:18),c],[e.x,e.y+(e.sup?-18:18),e.z],[e.x,e.y,e.z]),Op(l);let f=e.lado==="barra"?{y:e.y,z:e.z}:Up(n,e.x,e.y,e.lado==="cima"?1:-1),h=f.y+(e.lado==="barra"?0:Hd(s+4,f.larg));return Math.abs(u-h)<2&&(f===o||t.lado===e.lado)?l.push([e.x,u,c]):l.push([r.x+a,u,c],[r.x+a,h,c],[e.x,h,c]),l.push([e.x,e.y,e.z]),Op(l)}var Gp=n=>Yi.DIAMETRO_FIO[Number(n)]||(Number(n)>0?Math.max(2,Math.sqrt(Number(n))*1.9):2.6);function Nc(n,t,e={},i={}){let s=Vp(n),r=new Map;for(let et of n.caixas||[])et.tag&&!r.has(Ve(et.tag))&&["protecao","partidas"].includes(et.camada)&&r.set(Ve(et.tag),et);let a=et=>(e instanceof Map?e.get(Ve(et)):e[Ve(et)])||null,o=(n.caixas||[]).filter(et=>et.barra),l=et=>o.filter(mt=>mt.barra===et),c=i.nFases||Uc(t).n,u=["L1","L2","L3"].slice(0,c),f=[],h={N:0,PE:0},p={N:0,PE:0},x=0;function S(et){let mt=l(et);if(!mt.length)return null;let It=p[et]++,Gt=mt.reduce((I,L)=>I+L.l,0),Jt=10+Math.floor(It/2)*10%Math.max(10,Gt-20),it=mt[0];for(let I of mt){if(Jt<=I.l-6){it=I;break}Jt-=I.l}return h[et]++,{x:it.x+Math.min(it.l-6,Math.max(6,Jt)),y:it.y+it.a*(It%2?.3:.7),z:it.z+it.p,lado:"barra"}}let m={i:0};function g(){let et=m.i++,mt=Math.max(20,s.saida.x1-s.saida.x0);return{x:s.saida.x0+et*9.5%mt,y:s.saida.y,z:s.saida.z,saida:!0,sup:s.saida.sup}}let P=et=>{let mt=Number(et.secao_mm2)>0?Number(et.secao_mm2):null;f.push({id:`${t.tag}:${f.length+1}`,circuito:et.circuito??null,funcao:et.funcao,fase:et.fase??null,secao_mm2:mt,secao_fonte:mt?et.secao_fonte||"projeto":ei,d_mm:Math.round(Gp(mt)*10)/10,cor:et.funcao==="N"?Ye.N:et.funcao==="PE"?Ye.PE:Ye.F,...et.funcao==="PE"?{cor2:Ye.PE_FAIXA}:{},camada:`fiacao-${et.funcao}`,pts:et.pts,de:et.de,para:et.para,energia:et.energia,conferir:et.conferir||[]}),x++},O=et=>Number(et)>0?Number(et):null,T=et=>r.get(Ve(et))||r.get(Ve(et).replace(/-(Q\d+)$/,"/$1"))||null,A=t.geral?T(t.geral.tag):null,b=(t.drs||[]).filter(et=>!et.ddr),E=et=>b.find(mt=>(mt.circuitos||[]).map(Ve).includes(Ve(et)))||null,y=O(t.alimentador_secao_mm2??t.geral?.secao_mm2),C=y?t.alimentador_fonte||`diagrama do projeto (alimentador${t.alimentador?` ${t.alimentador}`:""})`:null,B=A?ti(t.geral.polos)||Math.max(1,Math.round(A.l/Yi.MODULO_MM)):0;if(A)for(let et=0;et<Math.min(B,c);et++)P({funcao:"F",fase:u[et],secao_mm2:y,secao_fonte:C,pts:ui(s,ds(A,et,B,"cima"),g(),{lado:"esquerda",k:x}).reverse(),de:"alimentador (entrada do quadro)",para:`${t.geral.tag} — polo ${et+1} (entrada)`,energia:{tipo:"entrada"},conferir:y?[]:["seção do alimentador não consta no projeto"]});let N=S("N");N&&P({funcao:"N",secao_mm2:y,secao_fonte:C,pts:ui(s,N,g(),{lado:"esquerda",k:x}).reverse(),de:"alimentador (neutro)",para:"barra N",energia:{tipo:"entrada"}});let $=S("PE");$&&P({funcao:"PE",secao_mm2:y,secao_fonte:C,pts:ui(s,$,g(),{lado:"esquerda",k:x}).reverse(),de:"PE do alimentador",para:"barra PE",energia:{tipo:"terra"}});let V=u.map(et=>l(et)[0]).filter(Boolean),D=l("pente"),G=t.geral?[t.geral.tag]:[],K=(et,mt,It,Gt,Jt,it,I,L,tt)=>{for(let J=0;J<Math.min(It,Jt,c);J++)P({funcao:"F",fase:u[J],secao_mm2:tt?.secao??null,secao_fonte:tt?.fonte,pts:ui(s,ds(et,J,mt,"baixo"),ds(Gt,J,Jt,"cima"),{lado:"esquerda",k:x}),de:`${I} — polo ${J+1} (saída)`,para:`${L} — polo ${J+1} (entrada)`,energia:{tipo:"tags",tags:it},conferir:tt?.secao?[]:["seção da ligação interna não consta no projeto"]})},Z=new Map,ht=et=>Math.round(et.y),rt=[...r.values()].filter(et=>et.camada==="protecao"&&et!==A);for(let et of rt){let mt=ht(et);Z.has(mt)||Z.set(mt,[]),Z.get(mt).push(et)}for(let et of Z.values())et.sort((mt,It)=>mt.x-It.x);let ut=new Map((t.disjuntores||[]).map(et=>[Ve(et.tag),et])),ft=et=>{let mt=ut.get(Ve(et.tag));if(mt){let It=E(mt.circuito);return It?`DR:${It.tag}`:"geral"}return b.some(It=>Ve(It.tag)===Ve(et.tag))?"geral":null};if(V.length){if(A)for(let et=0;et<Math.min(B,V.length);et++){let mt=V[et];P({funcao:"F",fase:u[et],secao_mm2:y,secao_fonte:C,pts:ui(s,ds(A,et,B,"baixo"),{x:mt.x+12,y:mt.y+mt.a/2,z:mt.z+mt.p,lado:"barra"},{lado:"esquerda",k:x}),de:`${t.geral.tag} — polo ${et+1} (saída)`,para:`barra ${u[et]}`,energia:{tipo:"tags",tags:G}})}for(let et of rt.filter(mt=>ft(mt)==="geral")){let mt=ut.get(Ve(et.tag))||b.find(it=>Ve(it.tag)===Ve(et.tag)),It=ti(mt?.polos)||1,Gt=mt?.circuito!=null?a(mt.circuito):null,Jt=Gt?Wd(Gt,It):null;for(let it=0;it<Math.min(It,c);it++){let I=Jt?Jt[it]:null,L=V[I?u.indexOf(I):it]||V[it%V.length];P({funcao:"F",fase:I||u[it]||null,secao_mm2:O(Gt?.secao_mm2),secao_fonte:Gt?.secao_mm2?Bs(fr("secao_mm2",Gt,t)):null,pts:ui(s,{x:L.x+20+x*7%Math.max(20,L.l-40),y:L.y+L.a/2,z:L.z+L.p,lado:"barra"},ds(et,it,It,"cima"),{lado:"esquerda",k:x}),de:`barra ${L.barra}`,para:`${et.tag} — polo ${it+1} (entrada)`,energia:{tipo:"tags",tags:G},conferir:Jt?[]:["fase do circuito não consta no projeto"]})}}}else if(A)for(let et of Z.values()){let mt=et.find(Jt=>ft(Jt)==="geral");if(!mt)continue;let It=ut.get(Ve(mt.tag))||b.find(Jt=>Ve(Jt.tag)===Ve(mt.tag)),Gt=ti(It?.polos)||Math.max(1,Math.round(mt.l/Yi.MODULO_MM));K(A,B,Math.min(B,c),mt,Gt,G,t.geral.tag,mt.tag,{secao:y,fonte:C})}for(let et of b){let mt=T(et.tag);if(!mt)continue;let It=ti(et.polos)||Math.max(2,Math.round(mt.l/Yi.MODULO_MM)),Gt=[...G,et.tag],Jt=rt.filter(L=>ft(L)===`DR:${et.tag}`),it=new Map;for(let L of Jt){let tt=ht(L);(!it.has(tt)||L.x<it.get(tt).x)&&it.set(tt,L)}for(let L of it.values()){let tt=ut.get(Ve(L.tag));K(mt,It,Math.max(1,It-1),L,ti(tt?.polos)||Math.max(1,Math.round(L.l/Yi.MODULO_MM)),Gt,et.tag,L.tag,null)}let I=S("N");I&&P({funcao:"N",pts:ui(s,I,ds(mt,It-1,It,"cima"),{lado:"esquerda",k:x}),de:"barra N",para:`${et.tag} — polo N (entrada)`,energia:{tipo:"tags",tags:G},conferir:["posição do polo N no DR conforme o fabricante"]})}for(let et of t.disjuntores||[]){let mt=T(et.tag);if(!mt)continue;let It=a(et.circuito),Gt=ti(et.polos)||Math.max(1,Math.round(mt.l/Yi.MODULO_MM)),Jt=O(It?.secao_mm2),it=Jt?Bs(fr("secao_mm2",It,t)):null,I=Wd(It,Gt),L=E(et.circuito),tt=`circuito ${et.circuito}${It?.descricao?` (${It.descricao})`:""}`,J={tipo:"circuito",id:Ve(et.circuito)},xt=(t.drs||[]).some(W=>W.ddr&&Ve(W.tag)===Ve(et.tag)),ct=It?!/^(FF|FFF)$/i.test(String(It.ligacao||""))&&Gt<3:Gt<3,at=xt&&ct?Math.max(1,Gt-1):ct&&Gt===2&&I?.length!==2?1:Math.min(Gt,3);for(let W=0;W<at;W++)P({circuito:et.circuito,funcao:"F",fase:I?I[W]:null,secao_mm2:Jt,secao_fonte:it,pts:ui(s,ds(mt,W,Gt,"baixo"),g(),{lado:"direita",k:x}),de:`${et.tag} — polo ${W+1} (saída)`,para:`saída do quadro → ${tt}`,energia:J,conferir:[...I?[]:["fase (L1/L2/L3) não consta no projeto"],...Jt?[]:["seção não consta no projeto"]]});if(ct){let W,pt;if(xt)pt=ui(s,ds(mt,Gt-1,Gt,"baixo"),g(),{lado:"direita",k:x}),W=`${et.tag} — polo N (saída do DDR)`;else if(L&&T(L.tag)){let St=T(L.tag),yt=ti(L.polos)||Math.max(2,Math.round(St.l/Yi.MODULO_MM));pt=ui(s,ds(St,yt-1,yt,"baixo"),g(),{lado:"direita",k:x}),W=`${L.tag} — polo N (saída do DR)`}else{let St=S("N");St&&(pt=ui(s,St,g(),{lado:"direita",k:x}),W="barra N")}pt&&P({circuito:et.circuito,funcao:"N",secao_mm2:Jt,secao_fonte:it,pts:pt,de:W,para:`saída do quadro → ${tt}`,energia:J,conferir:Jt?[]:["seção não consta no projeto"]})}let q=S("PE");q&&P({circuito:et.circuito,funcao:"PE",secao_mm2:Jt,secao_fonte:it,pts:ui(s,q,g(),{lado:"direita",k:x}),de:"barra PE",para:`saída do quadro → ${tt}`,energia:{tipo:"terra"},conferir:Jt?[]:["seção não consta no projeto"]})}return{condutores:f,terminais:{...h},convencao:qd}}function XM(n,{circuito:t=()=>null}={}){let e=Yi.MODULO_MM,i=Yi.DIN_ALTURA,s=18,r=Uc(n),a=[],o=new Set,l=n.disjuntores||[],c=(n.drs||[]).filter(ct=>!ct.ddr),u=ct=>c.find(at=>(at.circuitos||[]).map(Ve).includes(Ve(ct)))||null,f=(ct,at)=>(ti(ct)||at)*e,h=ct=>({tag:ct.tag,l:f(ct.polos,1),tipo:(n.drs||[]).some(at=>at.ddr&&at.tag===ct.tag)?"ddr":"disjuntor",d:ct});n.geral&&a.push({tag:n.geral.tag,l:f(n.geral.polos,Math.min(r.n,3)),tipo:"geral",d:n.geral});for(let ct of c){a.push({tag:ct.tag,l:f(ct.polos,r.n>=3?4:2),tipo:"dr",d:ct});for(let at of ct.circuitos||[]){let q=l.find(W=>Ve(W.circuito)===Ve(at));q&&!o.has(q.tag)&&(o.add(q.tag),a.push(h(q)))}}for(let ct of l)o.has(ct.tag)||a.push(h(ct));let p=[[]],x=0;for(let ct of a)x+ct.l>s*e&&p[p.length-1].length&&(p.push([]),x=0),p[p.length-1].push(ct),x+=ct.l;let S=$d(n,{nFases:r.n}),m=S.tipo==="barra",g=25,P=40,O=22,T=40,A=i+15+T+15,b=s*e,E=g+P+O,y=Math.ceil((E+b+O+P+g)/50)*50,C=m?30*r.n+40:0,B=110,N=70,$=Math.ceil((g+T+15+C+p.length*A+B+N)/50)*50,V=150,D=20,G=D+3,K=[],Z=ct=>(K.push(ct),ct);Z({camada:"placa",x:g-10,y:10,z:D,l:y-2*(g-10),a:$-20,p:3,cor:"#e6e1d6",rotulo:"Placa de montagem",semEtiqueta:!0,info:[["Peça","Placa de montagem"],["Medidas","ilustrativas (arranjo esquemático)"]]});let ht=(ct,at,q,W,pt)=>Z({camada:"canaletas",x:ct,y:at,z:G,l:q,a:W,p:60,cor:Ye.canaleta,opacidade:.3,rotulo:`Canaleta ${Math.min(q,W)} × 60 mm`,semEtiqueta:!0,dica:`Canaleta — ${pt}`,info:[["Peça",`Canaleta de fiação — ${pt}`],["Seção",`${Math.min(q,W)} × 60 mm (ilustrativa — o projeto não traz o arranjo interno) [CONFERIR]`]]}),rt=g+P,ut=y-g-P,ft=$-g-T;ht(rt,ft,ut-rt,T,"horizontal do topo"),ht(g,N-10,P,$-g-N+10,"vertical esquerda (alimentação)"),ht(y-g-P,N-10,P,$-g-N+10,"vertical direita (saídas dos circuitos)");let et=ft-15;m&&(S.barras.filter(ct=>/^L\d$/.test(ct.funcao)).forEach((ct,at)=>{let q=ct.largura_mm||20,W=ct.espessura_mm||5,pt=et-20-at*30;Z({camada:"barramentos",barra:ct.funcao,x:E,y:pt-q/2,z:G+40,l:b,a:q,p:W,cor:Ye.barraFase,metal:!0,rotulo:`${ct.funcao} ${co(ct)}`,dica:`Barra ${ct.funcao} — ${co(ct)} · ${ct.fonte_texto}`,ficha:Dc({...ct,comprimento_mm:b},n)});for(let St of[E+10,E+b-40])Z({camada:"barramentos",x:St,y:pt-15,z:G,l:30,a:30,p:40,cor:Ye.isolador,forma:"cilindro",semBorda:!0,rotulo:"Isolador",semEtiqueta:!0,info:[["Peça","Isolador suporte de barramento (ilustrativo)"]]})}),et-=C);let mt=[];p.forEach(ct=>{let at=et-i;mt.push(at),Z({camada:"trilhos",x:E-10,y:at+i/2-17.5,z:G,l:b+20,a:35,p:7.5,cor:Ye.trilho,metal:!0,rotulo:"Trilho DIN 35 mm",semEtiqueta:!0,info:[["Peça","Trilho DIN 35 × 7,5 mm (EN 60715)"]]});let q=E,W=null,pt=q,St=yt=>{m||!W||yt-pt<e||Z({camada:"barramentos",barra:"pente",x:pt,y:at+i+1,z:G+7.5+45,l:yt-pt,a:7,p:12,cor:Ye.barraFase,metal:!0,semBorda:!0,rotulo:"Pente",semEtiqueta:!0,dica:`Barramento tipo pente — ${W==="geral"?"alimentado pelo geral":`alimentado pelo ${W.slice(3)}`}`,ficha:Dc({...S.barras.find(ee=>ee.tipo==="pente")||{funcao:"L1/L2/L3",tipo:"pente",fonte_texto:ei,conferir:!0},comprimento_mm:yt-pt},n)})};for(let yt of ct){let ee=yt.tipo==="geral"?null:yt.tipo==="dr"?"geral":u(yt.d.circuito)?`DR:${u(yt.d.circuito).tag}`:"geral";ee!==W&&(St(q),W=ee,pt=q);let re=yt.tipo==="disjuntor"||yt.tipo==="ddr"?t(yt.d.circuito):null,Kt=yt.tipo==="geral"?zp(n):yt.tipo==="dr"?Bp(n,yt.d):Fp(n,yt.d,re,u(yt.d.circuito)),j=yt.tipo==="geral"?`Geral${yt.d.In?` ${yt.d.In} A`:""}`:yt.tipo==="dr"?`DR${yt.d.In?` ${yt.d.In} A`:""}${yt.d.idn_ma?` ${yt.d.idn_ma} mA`:""}`:`${yt.d.In?`${yt.d.In} A`:"In ?"}${yt.d.curva?` ${yt.d.curva}`:""} — circ. ${yt.d.circuito}${re?.descricao?` ${re.descricao}`:""}`;Z({camada:"protecao",tag:yt.tag,x:q,y:at,z:G+7.5,l:yt.l,a:i,p:70,cor:yt.tipo==="dr"?"#cfe3ff":yt.tipo==="ddr"?"#d9ccff":"#f1f3f5",rotulo:yt.tag,dica:`${yt.tag} — ${j}`,ficha:Kt,polos:ti(yt.d.polos),info:[["Medidas",`${yt.l} × ${i} mm (${yt.l/e} módulo${yt.l/e>1?"s":""} DIN; corpo típico)`]]}),q+=yt.l}St(q),ht(rt,at-15-T,ut-rt,T,"horizontal abaixo da fileira"),et=at-15-T-15});let It=N+70,Gt=N+25,Jt=(ct,at,q)=>Z({camada:"barramentos",barra:ct,x:E,y:at,z:G+25,l:160,a:20,p:6,cor:q,metal:!0,rotulo:ct,_barra:!0}),it=Jt("N",It,Ye.barraN),I=Jt("PE",Gt,Ye.barraPE),L={tipo:"quadro",titulo:`${n.tag} — ${n.descricao||"Quadro"}`,esquematico:!0,involucro:{L:y,A:$,P:V,espessura:2,cor:"#d6d4cf",rotulo:`Quadro ${n.tag}`,info:[["Quadro",n.tag],["Arranjo","esquemático — dispositivos fiéis ao projeto; medidas do invólucro ilustrativas"],["Fases",`${r.n} (${r.fonte})`]]},porta:{itens:[{x:(y-120)/2,y:$-70,l:120,a:40,p:2,cor:"#f4f1e8",rotulo:n.tag,info:[["Placa de identificação",n.tag]]}],rotulo:"Porta",info:[["Porta","frontal, articulada à esquerda"]]},portaAberta:!0,caixas:K};Z({camada:"entrada",tag:"FLANGE",x:y*.2,y:2,z:V*.2,l:y*.6,a:5,p:V*.6,cor:"#4a5058",rotulo:"Flange de entrada e saída de cabos",semEtiqueta:!0,info:[["Peça","Flange de entrada/saída de cabos (ilustrativa)"]]});let tt=Nc(L,n,new Map((n.disjuntores||[]).map(ct=>[Ve(ct.circuito),t(ct.circuito)]).filter(([,ct])=>ct)),{nFases:r.n}),J=$d(n,{terminais:tt.terminais,nFases:r.n,larguraFases:b});for(let[ct,at,q]of[[it,"N",Ye.barraN],[I,"PE",Ye.barraPE]]){let W=J.barras.find(yt=>yt.funcao===at),pt=Math.max(ct.l,W.comprimento_mm);Object.assign(ct,{l:pt,a:Math.max(12,W.largura_mm||20),p:Math.max(3,W.espessura_mm||5),rotulo:`${at} ${co(W)}`,dica:`Barra ${at} — ${co(W)} · ${W.furos} furos · ${W.fonte_texto}`,ficha:Dc(W,n)}),delete ct._barra;for(let yt of[ct.x+4,ct.x+pt-24])Z({camada:"barramentos",x:yt,y:ct.y-2,z:G,l:20,a:ct.a+4,p:25,cor:Ye.isolador,semBorda:!0,rotulo:`Isolador da barra ${at}`,semEtiqueta:!0});let St=Math.min(W.furos,80);for(let yt=0;yt<St;yt++)Z({camada:"bornes",x:ct.x+8+Math.floor(yt/2)*10-2,y:ct.y+ct.a*(yt%2?.3:.7)-2,z:ct.z+ct.p,l:4,a:4,p:2.5,cor:"#c9ccd1",metal:!0,semBorda:!0,rotulo:`Borne ${yt+1} da barra ${at}`,semEtiqueta:!0,dica:`Barra ${at} — furo ${yt+1} de ${W.furos}${yt<W.terminais_usados?" (usado)":" (reserva)"}`})}let xt=Nc(L,n,new Map((n.disjuntores||[]).map(ct=>[Ve(ct.circuito),t(ct.circuito)]).filter(([,ct])=>ct)),{nFases:r.n});return L.condutores=xt.condutores,L.barramentos=J,L.camadas=[{id:"protecao",rotulo:"Proteção (disjuntores e DR)",cor:"#e9ecef"},{id:"barramentos",rotulo:"Barramentos (fases, N, PE)",cor:Ye.barraFase},{id:"fiacao-F",rotulo:"Fiação — fases (F)",cor:"#3a3d43"},{id:"fiacao-N",rotulo:"Fiação — neutro (N)",cor:Ye.N},{id:"fiacao-PE",rotulo:"Fiação — terra (PE)",cor:Ye.PE},{id:"canaletas",rotulo:"Canaletas",cor:Ye.canaleta},{id:"bornes",rotulo:"Bornes / furos das barras",cor:"#c9ccd1"},{id:"trilhos",rotulo:"Trilhos DIN",cor:Ye.trilho}],L.numeros=[["disjuntores",String(l.length)],["DR",String(c.length)],["condutores",String(xt.condutores.length)],["fases",`${r.n}${r.conferir?" [conferir]":""}`]],L.avisos=["Arranjo esquemático: cada disjuntor e DR com os dados do projeto (polos, In, curva, seção); o invólucro, as canaletas e os trilhos são ilustrativos.",`Cores dos condutores: ${qd}.`,...J.fonte==="calculado"?["Barramentos calculados pela skill quadros (DIN 43671 e Tabela 58 da NBR 5410) — conferir com o fabricante."]:J.fonte?[]:["Barramentos sem dados no projeto e sem cálculo (corrente do geral não consta): medidas [CONFERIR]."]],L}function YM(n,{sim:t=null,quadroTag:e="",rede:i=null}={}){let s=n?.energia||{};if(s.tipo==="terra"||n?.funcao==="PE")return!0;if(s.tipo==="equipamento")return i?!!i.saida(s.id):!0;if(!t)return!0;let r=String(s.quadro||e);if(s.tipo==="circuito")return t.alimentado(s.id);let a=t.entradaEnergizada?t.entradaEnergizada(r):!0;return s.tipo==="entrada"?a:s.tipo==="tags"?a&&(s.tags||[]).every(o=>t.ligado(o,r)):!0}function jM(n,t,e,i={}){let s=Nc(n,t,e,i);n.condutores=s.condutores;let r=new Set((n.camadas||[]).map(a=>a.id));return n.camadas=[...n.camadas||[],...[{id:"fiacao-F",rotulo:"Fiação — fases (F)",cor:"#3a3d43"},{id:"fiacao-N",rotulo:"Fiação — neutro (N)",cor:Ye.N},{id:"fiacao-PE",rotulo:"Fiação — terra (PE)",cor:Ye.PE}].filter(a=>!r.has(a.id))],n}Hp.exports={CONFERIR:ei,COR:Ye,CONVENCAO_CORES:qd,FONTE:Lc,nomeFonte:Bs,fichaDoDisjuntor:Fp,fichaDoDr:Bp,fichaDoGeral:zp,fichaDaBarra:Dc,fasesDoQuadro:Uc,fasesDoCircuito:Wd,barramentosDoQuadro:$d,furosEComprimento:kp,fiacaoDoQuadro:Nc,montarQuadroEsquematico:XM,completarCenaComFiacao:jM,geometriaDaCena:Vp,rotear:ui,diametroDe:Gp,condutorEnergizado:YM}});var Xp=Zs(($E,qp)=>{function zs(n,t){if(!n)return!0;if(Array.isArray(n))return n.every(e=>zs(e,t));if(n.s)return n.s.every(e=>zs(e,t));if(n.p)return n.p.length?n.p.some(e=>zs(e,t)):!1;if(n.x!=null){let e=!!t[n.x];return n.neg?!e:e}return!0}function Wp(n){let t={};for(let e of n.entradas||[])e.tipo==="seletora"?t[e.id]=e.padrao??e.posicoes?.[0]:["supervisor","energia","fusivel"].includes(e.tipo)?t[e.id]=e.padrao??!0:t[e.id]=e.padrao??!1;return t}function ZM(n,t){let e={};for(let i of n.entradas||[]){let s=t[i.id];if(i.tipo==="seletora")for(let r of i.posicoes||[])e[`${i.id}=${r}`]=s===r;else e[i.id]=!!s}return e}function Oc(n,t={},e=null,i=0){let s={...Wp(n),...t},r=ZM(n,s),a={...e?.tempos||{}},o={...e?.saidas||{}},l=new Map((n.temporizadores||[]).map(h=>[h.tag,h]));for(let[h]of l)o[`${h}.bobina`]?a[h]=(a[h]||0)+i:a[h]=0;let c=!1,u=0,f=[];for(;u<60;u++){let h={...r,...o};for(let[m,g]of l)h[m]=!!o[`${m}.bobina`]&&(a[m]||0)>=g.preset_s;let p={};for(let m of n.barras||[])p[m.tag]=zs(m.expr,h),h[m.tag]=p[m.tag];for(let m of n.degraus||[]){let g=!!h[m.barra]&&zs(m.expr,h),P=l.has(m.saida)?`${m.saida}.bobina`:m.saida;p[P]=p[P]||g}for(let m of n.equipamentos||[])for(let[g,P]of Object.entries(m.saidas||{}))p[`${m.tag}.${g}`]=zs(P,h);for(let m of n.saidasCampo||[])p[m.tag]=zs(m.expr,h);for(let[m]of l)p[`${m}.bobina`]||(a[m]=0),p[m]=!!p[`${m}.bobina`]&&(a[m]||0)>=l.get(m).preset_s;let x=Object.keys({...p,...o}).some(m=>!!p[m]!=!!o[m]);if(o=p,!x){c=!0;break}let S=JSON.stringify(Object.keys(p).sort().map(m=>p[m]?1:0));if(f.includes(S))break;f.push(S)}return{entradas:s,saidas:o,tempos:a,estavel:c,varreduras:u+1}}function $p(n,t){let e=null,i={},s=[];for(let r of t)i={...i,...r.entradas||{}},e=Oc(n,i,e,0),r.aguardar_s&&(e=Oc(n,i,e,r.aguardar_s),e=Oc(n,i,e,0)),s.push(e);return s}function JM(n,t){return(t||[]).map(e=>{let i=e.passos||[{entradas:e.entradas||{}}],s=$p(n,i),r=s[s.length-1],a=l=>!!(l in r.saidas?r.saidas[l]:r.entradas[l]),o=Object.entries(e.espera||{}).filter(([l,c])=>a(l)!==!!c).map(([l,c])=>`${l}: esperado ${c?"ligado":"desligado"}, simulado ${a(l)?"ligado":"desligado"}`);return r.estavel||o.push("a lógica não estabilizou (oscilação)"),{nome:e.nome,origem:e.origem||null,ok:!o.length,falhas:o,entradas:r.entradas}})}function KM(n,t={}){let e=(n.entradas||[]).map(s=>{let r=t[s.id]||s.rotulo||s.id;if(s.tipo==="seletora")return{id:s.id,tipo:"seletora",rotulo:r,estados:s.posicoes,inicial:s.padrao??s.posicoes[0],local:s.local||"porta",acoes:s.posicoes.map(a=>({id:`pos_${a}`,rotulo:`Girar para ${a}`,para:a}))};if(s.tipo==="emergencia")return{id:s.id,tipo:"emergencia",rotulo:r,estados:["solto","acionado"],inicial:"solto",local:"porta",acoes:[{id:"acionar",rotulo:"Acionar a emergência (cogumelo)",de:["solto"],para:"acionado"},{id:"rearmar",rotulo:"Girar para soltar (rearme)",de:["acionado"],para:"solto"}]};if(s.tipo==="botao")return{id:s.id,tipo:"botao",rotulo:r,estados:["solto","pressionado"],inicial:"solto",local:"porta",acoes:[{id:"pressionar",rotulo:"Pressionar",de:["solto"],para:"pressionado"},{id:"soltar",rotulo:"Soltar",de:["pressionado"],para:"solto"}]};if(["falha","supervisor","fusivel","energia"].includes(s.tipo)){let a=s.tipo==="falha"?"normal":"ok",o=s.tipo==="falha"?"em falha":s.tipo==="supervisor"?"falta de fase":s.tipo==="fusivel"?"fusível aberto":"sem energia";return{id:s.id,tipo:s.tipo,rotulo:r,estados:[a,o],inicial:a,local:s.local||"quadro",acoes:[{id:"simular",rotulo:`Simular ${o}`,de:[a],para:o},{id:"normalizar",rotulo:"Normalizar",de:[o],para:a}]}}return{id:s.id,tipo:"externo",rotulo:r,estados:["inativo","ativo"],inicial:"inativo",local:"campo",acoes:[{id:"ativar",rotulo:`Ativar: ${r}`,de:["inativo"],para:"ativo"},{id:"desativar",rotulo:`Desativar: ${r}`,de:["ativo"],para:"inativo"}]}}),i=[...(n.degraus||[]).map(s=>s.saida),...(n.equipamentos||[]).flatMap(s=>Object.keys(s.saidas||{}).map(r=>`${s.tag}.${r}`)),...(n.saidasCampo||[]).map(s=>s.tag),...(n.barras||[]).map(s=>s.tag)].filter((s,r,a)=>a.indexOf(s)===r).map(s=>({id:s,rotulo:t[s]||(n.rotulos||{})[s]||s,tipo:(n.tipos||{})[s]||"sinal"}));return{versao:1,controles:e,indicadores:i}}function QM(n,t={}){let e={};for(let i of n.entradas||[]){let s=t[i.id];s!=null&&(i.tipo==="seletora"?e[i.id]=s:i.tipo==="emergencia"?e[i.id]=s==="acionado":i.tipo==="botao"?e[i.id]=s==="pressionado":i.tipo==="falha"?e[i.id]=s==="em falha":["supervisor","fusivel","energia"].includes(i.tipo)?e[i.id]=s==="ok":e[i.id]=s==="ativo")}return e}qp.exports={avaliar:Oc,simularSequencia:$p,verificarCenarios:JM,entradasPadrao:Wp,paraInteracao:KM,entradasDaInteracao:QM,valor:zs}});var Zp=Zs((XE,jp)=>{var eS=new Set(["luminaria","ponto_luz"]),Yd="motor",ks=n=>Array.isArray(n.cenas)&&n.cenas.length&&n.cenas.every(t=>t&&typeof t=="object"),nS=[1,.6,.3,0];function jd(n,t){let e=n?.niveis&&t!=null&&t in n.niveis?n.niveis[t]:n?.padrao;return Math.max(0,Math.min(1,Number(e)||0))}var Fc=n=>Math.max(jd(n,null),...Object.values(n?.niveis||{}).map(t=>Math.max(0,Math.min(1,Number(t)||0))));function iS(n,t={}){let e=n||{quadros:[],circuitos:[],pontos:[],comandos:[]},i=t.inicio==="desligado"?"desligado":"ligado",s=e.quadros||[],r=e.circuitos||[],a=e.pontos||[],o=e.comandos||[],l=I=>String(I??""),c=typeof t.fonteExterna=="function"?t.fonteExterna:null,u=new Map(s.map(I=>[l(I.tag),I])),f=new Map(r.map(I=>[l(I.id),I])),h=new Map(a.map(I=>[l(I.id),I])),p=new Map(o.map(I=>[l(I.id),I])),x=new Map(r.filter(I=>I.tipo===Yd).map(I=>[l(I.id),I])),S=(I,L)=>`${l(I)}|${l(L)}`,m;function g(){let I={protecao:{},comandos:{},paineis:{},emergenciaQuadro:{}};for(let tt of s){tt.geral?.tag&&(I.protecao[S(tt.tag,tt.geral.tag)]=!0);for(let J of tt.disjuntores||[])I.protecao[S(tt.tag,J.tag)]=!0;for(let J of tt.drs||[])J.ddr||(I.protecao[S(tt.tag,J.tag)]=!0);I.emergenciaQuadro[l(tt.tag)]=!1}let L=i==="ligado";for(let tt of o){let J=(tt.dispositivos||[]).map(l),xt={pos:{},rele:!1,k:!1,emergencia:!1,presenca:!1,habilitado:!0,nivel:0,ultimo:1,cena:-1};J.forEach(ct=>{xt.pos[ct]=!1}),J.length||(xt.pos._=!1),L&&(xt.pos[Object.keys(xt.pos)[0]]=!0,xt.rele=!0,xt.k=!0,xt.presenca=!0,xt.nivel=1,xt.cena=tt.tipo==="cena"||!ks(tt)?0:-1,tt.tipo==="cena"&&ks(tt)&&(xt.nivel=Fc(tt.cenas[0]))),I.comandos[l(tt.id)]=xt}for(let tt of x.keys())I.paineis[tt]={k:!1,emergencia:!1,termico:!1};return I}m=g();let P=0,O=new Set;function T(I){D(),P++;for(let L of[...O])try{L(I)}catch{}}function A(I,L){if(L!=null&&L!=="")return u.get(l(L))||null;let tt=l(I);return s.find(J=>J.geral?.tag===tt||(J.disjuntores||[]).some(xt=>xt.tag===tt)||(J.drs||[]).some(xt=>xt.tag===tt))||null}function b(I,L){let tt=A(I,L);if(!tt)return null;let J=l(I);if(tt.geral?.tag===J)return{tipo:"geral",quadro:tt,item:tt.geral};let xt=(tt.disjuntores||[]).find(at=>at.tag===J);if(xt)return{tipo:(tt.drs||[]).some(at=>at.ddr&&at.tag===J)?"ddr":"disjuntor",quadro:tt,item:xt};let ct=(tt.drs||[]).find(at=>at.tag===J&&!at.ddr);return ct?{tipo:"dr",quadro:tt,item:ct}:null}function E(I,L){let tt=b(I,L);return tt?m.protecao[S(tt.quadro.tag,I)]!==!1:!1}function y(I,L=new Set){let tt=f.get(l(I));if(!tt)return`circuito ${I} não existe no modelo`;let J=u.get(l(tt.quadro));if(!J)return`quadro ${tt.quadro} não existe no modelo`;if(J.alimentado_por!=null&&J.alimentado_por!==""&&!L.has(l(J.tag))){L.add(l(J.tag));let xt=y(J.alimentado_por,L);if(xt)return`${J.tag} sem alimentação (${xt})`}if(c){let xt=null;try{xt=c(l(J.tag))}catch{xt=null}if(xt)return`${J.tag} sem alimentação (${xt})`}if(J.geral?.tag&&m.protecao[S(J.tag,J.geral.tag)]===!1)return`disjuntor geral ${J.geral.tag} do ${J.tag} desligado`;for(let xt of J.drs||[])if(!xt.ddr&&(xt.circuitos||[]).map(l).includes(l(tt.id))&&m.protecao[S(J.tag,xt.tag)]===!1)return`${xt.tag} (DR) do ${J.tag} desligado`;return tt.disjuntor&&m.protecao[S(J.tag,tt.disjuntor)]===!1?`disjuntor ${tt.disjuntor} desligado`:null}let C=I=>y(I)===null,B=I=>l((I.circuitos||[])[0]??h.get(l((I.pontos||[])[0]))?.circuito??"");function N(I){let L=B(I);return L?C(L):!0}function $(I){let L=m.comandos[l(I.id)];if(!L)return 0;switch(I.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":return Object.values(L.pos).reduce((tt,J)=>tt!==!!J,!1)?1:0;case"pulsador_rele_impulso":return L.rele?1:0;case"contator_botoeira":return L.k&&!L.emergencia?1:0;case"sensor_presenca":return L.presenca&&L.habilitado?1:0;case"dimmer":case"dimmer_010":case"dali":case"cena":return ks(I)&&(I.tipo==="cena"||L.cena>=0)?L.cena>=0&&I.cenas[L.cena]?Fc(I.cenas[L.cena]):0:Math.max(0,Math.min(1,Number(L.nivel)||0));default:return Object.values(L.pos).reduce((tt,J)=>tt!==!!J,!1)?1:0}}function V(I,L){let tt=m.comandos[l(I.id)];return tt&&ks(I)&&(I.tipo==="cena"||tt.cena>=0)?tt.cena>=0&&I.cenas[tt.cena]?jd(I.cenas[tt.cena],L?.grupo):0:$(I)}function D(){for(let I of o){if(I.tipo!=="contator_botoeira")continue;let L=m.comandos[l(I.id)];L&&L.k&&(!N(I)||L.emergencia)&&(L.k=!1)}for(let[I,L]of x){let tt=m.paineis[I],J=tt.emergencia||!!m.emergenciaQuadro[l(L.quadro)];tt.k&&(!C(I)||J||tt.termico)&&(tt.k=!1)}}function G(I){let L=x.get(l(I));if(!L)return null;let tt=m.paineis[l(I)],J=C(I),xt=tt.emergencia||!!m.emergenciaQuadro[l(L.quadro)],ct=J&&tt.k&&!xt&&!tt.termico;return{id:l(I),descricao:L.descricao||"",quadro:L.quadro,disjuntor:L.disjuntor,alimentado:J,motivo:y(I),contator:tt.k,emergencia:xt,emergenciaLocal:tt.emergencia,termico:tt.termico,girando:ct,sinaleiros:{verde:ct,amarelo:J&&tt.termico,vermelho:J&&(xt||tt.termico),branco:J}}}function K(I){let L=h.get(l(I));if(!L)return null;let tt=f.get(l(L.circuito)),J=tt?y(tt.id):"ponto sem circuito no modelo",xt=J===null,ct=L.comando?p.get(l(L.comando)):null,at=xt?1:0,q;if(eS.has(L.tipo))ct&&(at=xt?V(ct,L):0),q=xt?at>0?at<1?`acesa em ${Math.round(at*100)} %`:"acesa":`apagada pelo comando ${ct?ct.id:""}`.trim():`apagada — sem energia (${J})`;else if(L.tipo===Yd){let W=G(L.circuito);W?at=W.girando?1:0:ct&&(at=xt?$(ct):0),q=xt?at?"em operação":W?.termico?"parado — relé térmico desarmado":W?.emergencia?"parado — emergência acionada":"parado":`parado — sem energia (${J})`}else L.tipo==="tomada"||L.tipo==="tue"?q=xt?"com energia":`SEM ENERGIA (${J})`:q=xt?"com energia":`sem energia (${J})`;return{id:l(L.id),tipo:L.tipo,circuito:tt?l(tt.id):null,comando:ct?l(ct.id):null,alimentado:xt,motivo:J,nivel:at,energizado:at>0,texto:q,...L.circuitoLido?{circuitoLido:L.circuitoLido}:{}}}let Z=I=>!!K(I)?.energizado;function ht(I){let L=p.get(l(I));if(!L)return null;let tt=m.comandos[l(I)],J=ks(L)?L.cenas.map(xt=>xt.nome||""):null;return{id:l(I),tipo:L.tipo,saida:$(L),bobina:N(L),...JSON.parse(JSON.stringify(tt)),...J?{cenas:J,cenaAtiva:tt.cena>=0?J[tt.cena]??null:null}:{}}}function rt(I,L,tt){let J=b(I,tt);if(!J)return!1;let xt=S(J.quadro.tag,I),ct=!!L;return m.protecao[xt]!==!1===ct||(m.protecao[xt]=ct,T({tipo:"protecao",quadro:J.quadro.tag,tag:l(I),ligado:ct})),!0}let ut=(I,L)=>rt(I,!E(I,L),L);function ft(I,L){let tt=h.get(l(I));if(!tt)return null;if(tt.tipo===Yd&&x.has(l(tt.circuito)))return mt(tt.circuito,L||(G(tt.circuito).contator?"desliga":"liga"));let J=tt.comando?p.get(l(tt.comando)):null;if(!J)return null;let xt=m.comandos[l(J.id)];if(!(J.dispositivos||[]).map(l).includes(l(tt.id))){let at=(J.dispositivos||[])[0];return at!=null&&h.has(l(at))?ft(at,L):et(J,xt,null,L)}return et(J,xt,tt,L)}function et(I,L,tt,J){let xt=tt?.tipo||"",ct=q=>(T({tipo:"comando",comando:l(I.id),ponto:tt?l(tt.id):null}),q),at=()=>{L.nivel>0?(L.ultimo=L.nivel,L.nivel=0):L.nivel=L.ultimo||1};if(ks(I)&&J&&typeof J=="object"&&Number.isFinite(Number(J.cena))){let q=Math.round(Number(J.cena));return L.cena=q>=0&&q<I.cenas.length?q:-1,L.cena>=0?L.nivel=Fc(I.cenas[L.cena]):I.tipo==="cena"&&(L.nivel=0),ct(L.cena>=0?`cena "${I.cenas[L.cena].nome}"`:I.tipo==="cena"?"cenas: desligado":"nível manual")}if(xt==="sensor"&&I.tipo==="sensor_presenca")return L.presenca=!L.presenca,ct(L.presenca?"presença detectada":"ambiente vazio (sensor)");switch(I.tipo){case"interruptor_simples":case"interruptor_paralelo":case"interruptor_intermediario":{let q=tt?l(tt.id):Object.keys(L.pos)[0];return q==null?null:(L.pos[q]=!L.pos[q],ct(`${q}: tecla na posição ${L.pos[q]?"I":"O"}`))}case"pulsador_rele_impulso":return N(I)?(L.rele=!L.rele,ct(`relé de impulso ${I.rele?.tag||""} ${L.rele?"fechou":"abriu"}`.replace("  "," "))):ct(`pulso sem efeito: bobina do relé ${I.rele?.tag||""} sem tensão`.replace("  "," "));case"contator_botoeira":{let q=J||(L.emergencia?"liberar":L.k?"desliga":"liga");return q==="emergencia"?(L.emergencia=!0,L.k=!1,ct("emergência acionada: contator caiu")):q==="liberar"?(L.emergencia=!1,ct("emergência liberada (aperte LIGA)")):q==="desliga"?(L.k=!1,ct(`contator ${I.rele?.tag||""} desligado`.replace("  "," "))):L.emergencia?ct("LIGA sem efeito: emergência acionada"):N(I)?(L.k=!0,ct(`contator ${I.rele?.tag||""} ligado e selado`.replace("  "," "))):ct("LIGA sem efeito: bobina do contator sem tensão")}case"sensor_presenca":return L.habilitado=!L.habilitado,ct(L.habilitado?"sensor habilitado":"desligamento manual (sensor inibido)");case"dimmer":case"dimmer_010":case"dali":return L.cena>=0&&ks(I)&&(L.nivel=$(I),L.cena=-1),typeof J=="number"&&Number.isFinite(J)?(L.nivel=Math.max(0,Math.min(1,J)),L.nivel>0&&(L.ultimo=L.nivel)):at(),ct(L.nivel>0?`nível ${Math.round(L.nivel*100)} %`:"desligado");case"cena":{if(ks(I)){let W=I.cenas.length;return typeof J=="number"&&Number.isFinite(J)?L.cena=Math.round(J)>=0&&Math.round(J)<W?Math.round(J):-1:L.cena=L.cena>=W-1?-1:L.cena+1,L.nivel=L.cena>=0?Fc(I.cenas[L.cena]):0,ct(L.cena>=0?`cena "${I.cenas[L.cena].nome}"`:"cenas: desligado")}let q=Array.isArray(I.cenas)&&I.cenas.length?I.cenas.map(Number):nS;return typeof J=="number"&&Number.isFinite(J)?L.cena=Math.max(0,Math.min(q.length-1,Math.round(J))):L.cena=(L.cena+1)%q.length,L.nivel=q[L.cena],ct(`cena ${L.cena+1}: ${L.nivel>0?`${Math.round(L.nivel*100)} %`:"desligado"}`)}default:{let q=tt?l(tt.id):Object.keys(L.pos)[0];return q==null?null:(L.pos[q]=!L.pos[q],ct(`${q} acionado`))}}}function mt(I,L){if(!x.get(l(I)))return null;let J=m.paineis[l(I)],xt=ct=>(T({tipo:"motor",motor:l(I),acao:L}),ct);switch(L){case"liga":{let ct=G(I);return ct.alimentado?ct.emergencia?xt("LIGA sem efeito: emergência acionada"):J.termico?xt("LIGA sem efeito: relé térmico desarmado (rearme)"):(J.k=!0,xt(`${I}: contator ligado e selado — motor em operação`)):xt(`LIGA sem efeito: ${ct.motivo}`)}case"desliga":return J.k=!1,xt(`${I}: motor desligado`);case"emergencia":return J.emergencia=!0,J.k=!1,xt(`${I}: EMERGÊNCIA — motor parado`);case"liberar":return J.emergencia=!1,xt(`${I}: emergência liberada (aperte LIGA)`);case"desarmar_termico":return J.termico=!0,J.k=!1,xt(`${I}: relé térmico desarmado (sobrecarga simulada)`);case"rearmar":return J.termico=!1,xt(`${I}: relé térmico rearmado (aperte LIGA)`);default:return null}}function It(I,L=!0){return u.has(l(I))?(m.emergenciaQuadro[l(I)]=!!L,T({tipo:"emergencia",quadro:l(I),ativa:!!L}),!0):!1}function Gt(){m=g(),T({tipo:"reiniciar"})}let Jt=()=>JSON.parse(JSON.stringify(m));function it(I){if(!I||typeof I!="object")return!1;let L=g();for(let tt of Object.keys(L.protecao))typeof I.protecao?.[tt]=="boolean"&&(L.protecao[tt]=I.protecao[tt]);for(let tt of Object.keys(L.emergenciaQuadro))typeof I.emergenciaQuadro?.[tt]=="boolean"&&(L.emergenciaQuadro[tt]=I.emergenciaQuadro[tt]);for(let tt of Object.keys(L.comandos)){let J=I.comandos?.[tt];if(!J||typeof J!="object")continue;let xt=L.comandos[tt];for(let ct of Object.keys(xt.pos))typeof J.pos?.[ct]=="boolean"&&(xt.pos[ct]=J.pos[ct]);for(let ct of["rele","k","emergencia","presenca","habilitado"])typeof J[ct]=="boolean"&&(xt[ct]=J[ct]);for(let ct of["nivel","ultimo","cena"])Number.isFinite(J[ct])&&(xt[ct]=J[ct])}for(let tt of Object.keys(L.paineis)){let J=I.paineis?.[tt];if(J&&typeof J=="object")for(let xt of["k","emergencia","termico"])typeof J[xt]=="boolean"&&(L.paineis[tt][xt]=J[xt])}return m=L,T({tipo:"importar"}),!0}return{instalacao:e,get versao(){return P},assinar(I){return O.add(I),()=>O.delete(I)},quadros:()=>s,quadro:I=>u.get(l(I))||null,circuito:I=>f.get(l(I))||null,ponto:I=>h.get(l(I))||null,comando:I=>p.get(l(I))||null,temPonto:I=>h.has(l(I)),paineis:()=>[...x.keys()].map(G),dispositivo:b,ligado:E,alimentado:C,motivo:y,energizado:Z,estadoPonto:K,estadoComando:ht,painel:G,emergenciaDoQuadro:I=>!!m.emergenciaQuadro[l(I)],definir:rt,alternar:ut,desligar:(I,L)=>rt(I,!1,L),ligar:(I,L)=>rt(I,!0,L),acionar:ft,motor:mt,emergenciaQuadro:It,reiniciar:Gt,exportar:Jt,importar:it,definirFonteExterna(I){c=typeof I=="function"?I:null,T({tipo:"externo"})},reavaliar(I){T({tipo:"externo",...I&&typeof I=="object"?I:{}})},quadroEnergizado(I){let L=u.get(l(I));if(!L)return!1;if(c)try{if(c(l(L.tag)))return!1}catch{}return L.alimentado_por!=null&&L.alimentado_por!==""&&!C(L.alimentado_por)?!1:!L.geral?.tag||m.protecao[S(L.tag,L.geral.tag)]!==!1},entradaEnergizada(I){let L=u.get(l(I));if(!L)return!1;if(c)try{if(c(l(L.tag)))return!1}catch{}return!(L.alimentado_por!=null&&L.alimentado_por!==""&&!C(L.alimentado_por))},motivoDoQuadro(I){let L=u.get(l(I));if(!L)return`quadro ${I} não existe no modelo`;if(c)try{let tt=c(l(L.tag));if(tt)return tt}catch{}if(L.alimentado_por!=null&&L.alimentado_por!==""){let tt=y(L.alimentado_por);if(tt)return`alimentador ${L.alimentado_por}: ${tt}`}return L.geral?.tag&&m.protecao[S(L.tag,L.geral.tag)]===!1?`disjuntor geral ${L.geral.tag} desligado`:null}}}var sS={luminaria:"Luminária",ponto_luz:"Ponto de luz",tomada:"Tomada",tue:"Tomada de uso específico",motor:"Motor",interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptor paralelo",interruptor_intermediario:"Interruptor intermediário",interruptor:"Interruptor",pulsador:"Pulsador",botoeira:"Botoeira liga/desliga",sensor:"Sensor de presença",dimmer:"Dimmer",controlador_010:"Controlador 0-10 V",botoeira_dali:"Botoeira DALI",teclado_cena:"Teclado de cenas"};jp.exports={criarSimulador:iS,ROTULO_PONTO:sS,nivelNaCena:jd}});var Qd=Zs((YE,tm)=>{var ke=n=>String(n??""),fo="Texto didático: siga o procedimento de manobra da instalação (NR-10).",Kd={rede_mt:{regra:"fonte",estados:["com tensão","sem tensão"],inicial:"com tensão",conduz:["com tensão"],acoes:[{id:"falta",rotulo:"Simular falta de energia da distribuidora",de:["com tensão"],para:"sem tensão"},{id:"volta",rotulo:"Restabelecer a rede",de:["sem tensão"],para:"com tensão"}]},chave_fusivel:{regra:"serie",estados:["fechada","aberta","fusível queimado"],inicial:"fechada",conduz:["fechada"],acoes:[{id:"abrir",rotulo:"Abrir (vara de manobra)",de:["fechada"],para:"aberta",avisoSe:[{tipos:["disjuntor_mt"],estado:["fechado"],texto:`Chave fusível aberta COM CARGA: exige a ferramenta de abertura em carga (load buster). O correto é abrir antes o disjuntor. ${fo}`}]},{id:"fechar",rotulo:"Fechar (vara de manobra)",de:["aberta"],para:"fechada"},{id:"queimar",rotulo:"Simular fusível queimado (elo fusível rompido)",de:["fechada"],para:"fusível queimado"},{id:"trocar",rotulo:"Trocar o elo fusível",de:["fusível queimado"],para:"aberta"}]},chave_seccionadora:{regra:"serie",estados:["fechada","aberta"],inicial:"fechada",conduz:["fechada"],acoes:[{id:"abrir",rotulo:"Abrir a seccionadora",de:["fechada"],para:"aberta",exige:[{tipos:["disjuntor_mt"],estado:["fechado"],nao:!0,texto:`NUNCA abra a seccionadora sob carga: abra primeiro o disjuntor de MT. Sequência para desligar: 1) disjuntor geral de BT; 2) disjuntor de MT; 3) seccionadora. ${fo}`}]},{id:"fechar",rotulo:"Fechar a seccionadora",de:["aberta"],para:"fechada",exige:[{tipos:["disjuntor_mt"],estado:["fechado"],nao:!0,texto:`Feche a seccionadora com o disjuntor de MT ABERTO (ela não manobra carga). Sequência para ligar: 1) seccionadora; 2) disjuntor de MT; 3) disjuntor geral de BT. ${fo}`}]}]},disjuntor_mt:{regra:"serie",estados:["fechado","aberto","disparado"],inicial:"fechado",conduz:["fechado"],textos:{disparado:"disparado pelo relé 50/51 (trip)"},acoes:[{id:"abrir",rotulo:"Abrir o disjuntor de MT",de:["fechado"],para:"aberto",avisoSe:[{tipos:["disjuntor_bt"],estado:["fechado"],texto:`Sequência recomendada para desligar: abra antes o disjuntor geral de BT (tira a carga), depois o de MT. ${fo}`}]},{id:"fechar",rotulo:"Fechar o disjuntor de MT",de:["aberto"],para:"fechado",exige:[{tipos:["rele"],estado:["atuado"],nao:!0,texto:"O relé 50/51 está atuado: identifique a causa do disparo e rearme o relé antes de fechar o disjuntor."}],avisoSe:[{tipos:["disjuntor_bt"],estado:["fechado"],texto:`Sequência recomendada para ligar: feche o disjuntor de MT com o geral de BT ABERTO (o trafo energiza em vazio) e só então feche o de BT. ${fo}`}]},{id:"disparar",rotulo:"Simular trip (relé 50/51)",de:["fechado"],para:"disparado"},{id:"rearmar",rotulo:"Rearmar o disjuntor (fica aberto)",de:["disparado"],para:"aberto"}]},rele:{regra:"gatilho",estados:["normal","atuado"],inicial:"normal",ativos:["atuado"],textos:{normal:"supervisionando (50/51/50N/51N)",atuado:"ATUADO — mandou abrir o disjuntor de MT"},acoes:[{id:"atuar",rotulo:"Simular sobrecorrente (atuação 50/51)",de:["normal"],para:"atuado",efeitosTipos:[{tipos:["disjuntor_mt"],de:["fechado"],estado:"disparado"}]},{id:"rearmar",rotulo:"Rearmar o relé (reset)",de:["atuado"],para:"normal"}]},disjuntor_bt:{regra:"serie",estados:["fechado","aberto"],inicial:"fechado",conduz:["fechado"],acoes:[{id:"abrir",rotulo:"Abrir o disjuntor geral de BT",de:["fechado"],para:"aberto"},{id:"fechar",rotulo:"Fechar o disjuntor geral de BT",de:["aberto"],para:"fechado"}]},transformador:{regra:"carga",textos:{energizado:"energizado",desenergizado:"DESENERGIZADO"}},qgbt:{regra:"carga",textos:{energizado:"barramento energizado",desenergizado:"DESENERGIZADO"}},carga_mt:{regra:"carga"},inc_central:{regra:"central",estados:["normal","alarme","silenciado"],inicial:"normal",central:{de:["normal"],para:"alarme",saidaEm:["alarme"]},textos:{normal:"em supervisão (normal)",alarme:"ALARME DE INCÊNDIO — avisadores acionados",silenciado:"em alarme, avisadores silenciados"},acoes:[{id:"silenciar",rotulo:"Silenciar os avisadores",de:["alarme"],para:"silenciado"},{id:"reativar",rotulo:"Reativar os avisadores",de:["silenciado"],para:"alarme"},{id:"rearmar",rotulo:"Rearmar a central (reset)",de:["alarme","silenciado"],para:"normal",exige:[{entradasInativas:!0,texto:"Ainda há dispositivo em alarme: rearme o acionador manual (chave) ou limpe o detector antes do reset da central."}]},{id:"alarme_geral",rotulo:"Alarme geral (manual na central)",de:["normal"],para:"alarme"}]},inc_acionador:{regra:"gatilho",estados:["normal","acionado"],inicial:"normal",ativos:["acionado"],acoes:[{id:"acionar",rotulo:"Acionar (quebrar/pressionar)",de:["normal"],para:"acionado"},{id:"rearmar",rotulo:"Rearmar o acionador (chave)",de:["acionado"],para:"normal"}]},inc_detector:{regra:"gatilho",estados:["normal","fumaça/temperatura detectada"],inicial:"normal",ativos:["fumaça/temperatura detectada"],acoes:[{id:"detectar",rotulo:"Simular fumaça / temperatura",de:["normal"],para:"fumaça/temperatura detectada"},{id:"limpar",rotulo:"Ambiente limpo (normalizar)",de:["fumaça/temperatura detectada"],para:"normal"}]},inc_avisador:{regra:"carga",textos:{energizado:"TOCANDO (sonoro e visual)",desenergizado:"em silêncio"}},alm_central:{regra:"central",estados:["desarmado","armado","disparado"],inicial:"desarmado",central:{de:["armado"],para:"disparado",saidaEm:["disparado"]},textos:{desarmado:"desarmado",armado:"ARMADO",disparado:"DISPARADO — sirene acionada"},acoes:[{id:"armar",rotulo:"Armar",de:["desarmado"],para:"armado",exige:[{entradasInativas:!0,texto:"Há zona aberta/violada: feche a zona (ou inibi-la na central) antes de armar."}]},{id:"desarmar",rotulo:"Desarmar (senha)",de:["armado","disparado"],para:"desarmado"}]},alm_sensor:{regra:"gatilho",estados:["normal","violado"],inicial:"normal",ativos:["violado"],acoes:[{id:"violar",rotulo:"Simular zona violada",de:["normal"],para:"violado"},{id:"normalizar",rotulo:"Normalizar a zona",de:["violado"],para:"normal"}]},alm_sirene:{regra:"carga",textos:{energizado:"TOCANDO",desenergizado:"em silêncio"}},alm_teclado:{regra:"carga",proxy:!0},cftv_switch:{regra:"fonte",estados:["ligado","desligado"],inicial:"ligado",conduz:["ligado"],textos:{ligado:"ligado — PoE nas portas",desligado:"DESLIGADO — portas PoE sem energia"},acoes:[{id:"desligar",rotulo:"Desligar o switch PoE",de:["ligado"],para:"desligado"},{id:"ligar",rotulo:"Ligar o switch PoE",de:["desligado"],para:"ligado"}]},cftv_camera:{regra:"carga",textos:{energizado:"com energia (PoE) — imagem no NVR",desenergizado:"SEM ENERGIA — switch PoE desligado"}},ace_fechadura:{regra:"gatilho",estados:["travada","liberada"],inicial:"travada",ativos:["liberada"],acoes:[{id:"liberar",rotulo:"Liberar",de:["travada"],para:"liberada"},{id:"travar",rotulo:"Travar (fim do tempo de abertura)",de:["liberada"],para:"travada"}]},ace_comando:{regra:"carga",textos:{energizado:"pronto",desenergizado:"sem energia"}},ace_emergencia:{regra:"gatilho",estados:["normal","acionada"],inicial:"normal",ativos:["acionada"],acoes:[{id:"acionar",rotulo:"Acionar a emergência (libera as portas)",de:["normal"],para:"acionada",efeitosTipos:[{tipos:["ace_fechadura"],estado:"liberada"}]},{id:"rearmar",rotulo:"Rearmar a emergência",de:["acionada"],para:"normal"}]},ace_controladora:{regra:"carga",textos:{energizado:"em operação",desenergizado:"sem energia"}}};function rS(n=[]){let t=n.filter(A=>A&&A.id!=null&&A.interacao).map(A=>({...A,id:ke(A.id),interacao:{...A.interacao}})),e=new Map(t.map(A=>[A.id,A])),i=A=>t.filter(b=>A.includes(b.tipo)),s,r=()=>Object.fromEntries(t.map(A=>[A.id,A.interacao.inicial??(A.interacao.estados||[])[0]??null]));s=r();let a=new Set,o=0;function l(){let A=new Map,b=new Set,E=y=>{if(A.has(y))return A.get(y);let C=e.get(y);if(!C||b.has(y))return!1;b.add(y);let B=C.interacao,N=s[y],$=(B.entradas||[]).map(ke).filter(G=>e.has(G)),V=$.length?B.combinar==="alguma"?$.some(E):$.every(E):!0,D;switch(B.regra){case"fonte":D=(B.conduz||[]).includes(N);break;case"serie":D=V&&(B.conduz||[]).includes(N);break;case"gatilho":D=(B.ativos||[]).includes(N);break;case"central":D=(B.central?.saidaEm||[]).includes(N);break;default:D=V}return b.delete(y),A.set(y,D),D};return E}let c=l(),u=A=>(e.get(A)?.interacao.entradas||[]).map(ke).filter(b=>e.has(b)),f=A=>{let b=e.get(A),E=u(A);return E.length?b.interacao.combinar==="alguma"||b.interacao.regra==="central"?E.some(y=>c(y)):E.every(y=>c(y)):b?.interacao.regra!=="central"};function h(){for(let A=0;A<10;A++){c=l();let b=!1;for(let E of t){let y=E.interacao.central;E.interacao.regra!=="central"||!y||(y.de||[]).includes(s[E.id])&&u(E.id).some(C=>c(C))&&(s[E.id]=y.para,b=!0)}if(!b)break}}h();function p(A){o++;for(let b of[...a])try{b(A)}catch{}}function x(A,b=new Set){let E=e.get(ke(A));if(!E||b.has(E.id))return null;b.add(E.id);let y=E.interacao;if(["fonte","serie"].includes(y.regra)&&!(y.conduz||[]).includes(s[E.id]))return`${E.rotulo||E.id} ${S(E.id)}`;for(let C of u(E.id))if(!c(C))return x(C,b)||`${e.get(C).rotulo||C} sem sinal`;return null}function S(A){let b=e.get(ke(A));if(!b)return"";let E=b.interacao,y=s[b.id];return E.regra==="carga"?(E.textos||{})[c(b.id)?"energizado":"desenergizado"]||(c(b.id)?"energizado":"sem energia"):(E.textos||{})[y]||ke(y)}function m(A){let b=e.get(ke(A));if(!b)return"normal";let E=b.interacao,y=s[b.id],C=c(b.id);return E.regra==="carga"?C?/TOCANDO/i.test(S(b.id))?"alarme":"energizado":"apagado":E.regra==="gatilho"?C?b.tipo==="ace_fechadura"?"aberto":"alarme":"normal":E.regra==="central"?C?"alarme":y==="silenciado"?"alerta":y==="armado"?"armado":"normal":/queim|dispar/i.test(y)?"falha":(E.conduz||[]).includes(y)?f(b.id)?"energizado":"apagado":"aberto"}function g(A){let b=e.get(ke(A));return b?{id:b.id,tipo:b.tipo,rotulo:b.rotulo||b.id,estado:s[b.id],texto:S(b.id),saida:c(b.id),tensao:f(b.id),aparencia:m(b.id),motivo:c(b.id)?null:x(b.id),inferido:!!b.interacao.inferido,nota:b.interacao.nota||""}:null}let P=A=>A.eq!=null?[ke(A.eq)]:A.eqs?A.eqs.map(ke):A.tipos?i(A.tipos).map(b=>b.id):[];function O(A){let b=e.get(ke(A));if(!b)return[];if(b.interacao.proxy){let E=u(b.id)[0]||t.find(y=>y.tipo==="alm_central")?.id;return E?O(E).map(y=>({...y,alvo:E})):[]}return(b.interacao.acoes||[]).filter(E=>!E.de||E.de.includes(s[b.id])).map(E=>{let y=null;for(let C of E.exige||[]){if(C.entradasInativas){if(u(b.id).some($=>c($))){y=C.texto;break}continue}let B=P(C),N=B.some($=>(C.estado||[]).includes(s[$]));if(C.nao?N:!N&&B.length){y=C.texto;break}}return{id:E.id,rotulo:E.rotulo,alvo:b.id,permitida:!y,motivo:y}})}function T(A,b){let E=e.get(ke(A));if(!E)return null;if(E.interacao.proxy){let N=O(E.id).find($=>$.id===b);return N?T(N.alvo,b):null}let y=(E.interacao.acoes||[]).find(N=>N.id===b&&(!N.de||N.de.includes(s[E.id])));if(!y)return null;let C=O(E.id).find(N=>N.id===b);if(C&&!C.permitida)return p({tipo:"recusa",id:E.id,acao:b}),`Manobra recusada — ${C.motivo}`;let B=[];for(let N of y.avisoSe||[])P(N).some($=>(N.estado||[]).includes(s[$]))&&B.push(N.texto);y.para!=null&&(s[E.id]=y.para);for(let N of y.efeitos||[])e.has(ke(N.eq))&&(s[ke(N.eq)]=N.estado);for(let N of y.efeitosTipos||[])for(let $ of i(N.tipos))(!N.de||N.de.includes(s[$.id]))&&(s[$.id]=N.estado);return h(),p({tipo:"acao",id:E.id,acao:b}),[`${E.rotulo||E.id}: ${S(E.id)}`,...B].join(" — ")}return{get versao(){return o},assinar(A){return a.add(A),()=>a.delete(A)},lista:()=>t,equipamento:A=>e.get(ke(A))||null,tem:A=>e.has(ke(A)),estado:A=>s[ke(A)]??null,saida:A=>c(ke(A)),tensao:A=>f(ke(A)),situacao:g,acoes:O,agir:T,motivo:x,textoEstado:S,aparencia:m,definir(A,b){return e.has(ke(A))?(s[ke(A)]=b,h(),p({tipo:"definir",id:ke(A)}),!0):!1},reiniciar(){s=r(),h(),p({tipo:"reiniciar"})},exportar:()=>({...s}),importar(A){if(!A||typeof A!="object")return!1;for(let b of Object.keys(s))A[b]!=null&&(e.get(b).interacao.estados||[]).includes(A[b])&&(s[b]=A[b]);return h(),p({tipo:"importar"}),!0}}}function hs(n,t,e={}){let i=Kd[t]||{},s=n.interacao&&typeof n.interacao=="object"?n.interacao:{};return{...n,interacao:{...JSON.parse(JSON.stringify(i)),...e,...s,...s.entradas?{inferido:!1}:{}}}}var Jd=["chave_fusivel","chave_seccionadora","disjuntor_mt","transformador","disjuntor_bt","qgbt"],aS={chave_fusivel:"Chave fusível",chave_seccionadora:"Chave seccionadora",disjuntor_mt:"Disjuntor de MT",transformador:"Transformador",disjuntor_bt:"Disjuntor geral de BT",qgbt:"QGBT",rele:"Relé 50/51"},Jp={mufla:null,para_raios:null,cabo_mt:null,isolador:null,cruzeta:null,tc:"chave_seccionadora",tp:"chave_seccionadora",medicao:"chave_seccionadora",barramento:"chave_seccionadora",cubiculo:"chave_seccionadora"},oS={trafo:"transformador",seccionadora:"chave_seccionadora",fusivel:"chave_fusivel",disjuntor:"disjuntor_mt",quadro:"qgbt"},Kp=n=>{let t=String(n||"").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[\s-]+/g,"_");return oS[t]||t};function lS(n=[]){let t=n.filter(u=>u&&u.id!=null).map(u=>({...u,tipo:Kp(u.tipo)})),e=[],i="ligação inferida pela sequência típica da entrada de MT (o projeto não liga os componentes) [CONFERIR no unifilar]",s=hs({id:"REDE-MT",tipo:"rede_mt",rotulo:"Rede da distribuidora (ramal de MT)"},"rede_mt",{inferido:!0});e.push(s);let r=[s.id],a={},o=u=>t.filter(f=>f.tipo===u);if(!t.some(u=>Jd.includes(u.tipo)||u.tipo==="rele"))return{equipamentos:[],vinculos:new Map};let c=new Map;for(let u of Jd){let f=o(u);if(u==="disjuntor_bt"&&!f.length&&o("qgbt").length){let p=o("qgbt")[0],x=`${p.id}:DJ-BT`;e.push(hs({id:x,tipo:"disjuntor_bt",rotulo:`Disjuntor geral de BT (no ${p.descricao||"QGBT"})`},"disjuntor_bt",{entradas:[...r],inferido:!0,nota:"o disjuntor geral de BT fica dentro do QGBT (não está na relação à parte)"})),c.set(x,String(p.id)),r=[x],a[u]=r;continue}if(!f.length)continue;let h=[];for(let p of f){let x=Kd[u]?u:"carga_mt",S=hs({id:String(p.id),tipo:u,rotulo:p.descricao||aS[u]||u,componente:String(p.id)},x,{entradas:[...r],inferido:!0,nota:i});e.push(S),c.set(S.id,String(p.id)),h.push(S.id)}r=h,a[u]=h}for(let u of o("rele"))e.push(hs({id:String(u.id),tipo:"rele",rotulo:u.descricao||"Relé de proteção 50/51",componente:String(u.id)},"rele",{inferido:!0,nota:"o relé comanda os disjuntores de MT do projeto [CONFERIR]"})),c.set(String(u.id),String(u.id));for(let u of t){if(!(u.tipo in Jp)||c.has(String(u.id)))continue;let f=Jp[u.tipo],h=f&&a[f]?a[f]:a.chave_fusivel||[s.id];e.push(hs({id:String(u.id),tipo:u.tipo,rotulo:u.descricao||u.tipo,componente:String(u.id)},"carga_mt",{entradas:[...h],inferido:!0,nota:i})),c.set(String(u.id),String(u.id))}return{equipamentos:e,vinculos:c}}function cS(n,t){if(!n||!t)return()=>{};let e=n.lista().filter(s=>s.tipo==="qgbt"),i=new Map;for(let s of t.quadros()){let r=s.alimentado_por_equipamento!=null?ke(s.alimentado_por_equipamento):/QGBT|QGD|\bQG\b/i.test(ke(s.tag))&&e.length?e[0].id:null;r&&n.tem(r)&&i.set(ke(s.tag),r)}if(!i.size&&e.length){let s=t.quadros().filter(r=>r.alimentado_por==null||r.alimentado_por==="");s.length===1&&i.set(ke(s[0].tag),e[0].id)}return t.definirFonteExterna(s=>{let r=i.get(ke(s));return r&&!n.saida(r)?n.motivo(r)||`${n.equipamento(r).rotulo} desenergizado`:null}),n.assinar(()=>t.reavaliar({origem:"rede"}))}var Qp={"HM-INC-CENTRAL":["incendio","central"],"HM-INC-ACIONADOR":["incendio","acionador"],"HM-INC-DETECTOR-FUMACA":["incendio","detector"],"HM-INC-DETECTOR-TEMP":["incendio","detector"],"HM-INC-AVISADOR":["incendio","avisador"],"HM-ALM-CENTRAL":["alarme","central"],"HM-ALM-TECLADO":["alarme","teclado"],"HM-ALM-IVP":["alarme","sensor"],"HM-ALM-MAGNETICO":["alarme","sensor"],"HM-ALM-SIRENE":["alarme","sirene"],"HM-CFTV-CAMERA":["cftv","camera"],"HM-CAB-RACK":["cftv","switch"],"HM-ACE-CONTROLADORA":["controle_acesso","controladora"],"HM-ACE-LEITOR":["controle_acesso","leitor"],"HM-ACE-BOTOEIRA":["controle_acesso","botoeira"],"HM-ACE-EMERGENCIA":["controle_acesso","emergencia"],"HM-ACE-FECHADURA":["controle_acesso","fechadura"]},uS={central:"Central",acionador:"Acionador manual",detector:"Detector",avisador:"Avisador audiovisual",teclado:"Teclado",sensor:"Sensor",sirene:"Sirene",camera:"Câmera",switch:"Switch PoE",controladora:"Controladora",leitor:"Leitor",botoeira:"Botoeira",emergencia:"Acionador de emergência",fechadura:"Fechadura"},Zd="ligação à central inferida (o laço/zona não consta no modelo) [CONFERIR no projeto]";function dS(n=[]){let t=n.map(h=>{let[p,x]=h.papel?[h.disciplina,h.papel]:Qp[h.simbolo]||[];return p?{...h,id:ke(h.id),disciplina:p,papel:x}:null}).filter(Boolean),e=[],i=new Map,s=(h,p)=>t.filter(x=>x.disciplina===h&&x.papel===p),r=h=>h.rotulo||`${uS[h.papel]||h.papel} ${h.id}`,a=(h,p,x)=>{e.push(hs({id:h.id,tipo:p,rotulo:r(h),disciplina:h.disciplina,interacao:h.interacao},p,x)),i.set(h.id,h.id)},o=(h,p)=>h.reduce((x,S)=>!x||Math.hypot(S.x-p.x,S.y-p.y)<Math.hypot(x.x-p.x,x.y-p.y)?S:x,null),l=(h,p,x,S,m)=>{let g=m.flatMap(([A])=>s(h,A));if(!g.length&&!s(h,S).length)return;let P=s(h,"central"),O=!P.length;O&&(P=[{id:`${h}:CENTRAL`,disciplina:h,papel:"central",rotulo:"Central (não desenhada nesta planta)",x:0,y:0}]);let T=new Map(P.map(A=>[A.id,[]]));for(let A of g){let b=A.entradas?.[0]!=null&&T.has(ke(A.entradas[0]))?ke(A.entradas[0]):(o(P,A)||P[0]).id;T.get(b).push(A.id)}for(let A of P)e.push(hs({id:A.id,tipo:p,rotulo:r(A),disciplina:h,interacao:A.interacao},p,{entradas:T.get(A.id),inferido:!0,nota:Zd})),O||i.set(A.id,A.id);for(let[A,b]of m)for(let E of s(h,A))a(E,b,{inferido:!0,nota:Zd});for(let A of s(h,S))a(A,x,{entradas:[A.entradas?.[0]&&T.has(ke(A.entradas[0]))?ke(A.entradas[0]):(o(P,A)||P[0]).id],inferido:!0,nota:Zd});return P};l("incendio","inc_central","inc_avisador","avisador",[["acionador","inc_acionador"],["detector","inc_detector"]]);let c=l("alarme","alm_central","alm_sirene","sirene",[["sensor","alm_sensor"]]);for(let h of s("alarme","teclado"))a(h,"alm_teclado",{entradas:c?[(o(c,h)||c[0]).id]:[],inferido:!0,nota:"o teclado comanda a central do alarme"});let u=s("cftv","camera");if(u.length){let h=s("cftv","switch"),p=!h.length;p&&(h=[{id:"cftv:SWITCH-POE",disciplina:"cftv",papel:"switch",rotulo:"Switch PoE (rack não desenhado nesta planta)",x:0,y:0}]);for(let x of h)e.push(hs({id:x.id,tipo:"cftv_switch",rotulo:x.rotulo||`Switch PoE do rack ${x.id}`,disciplina:"cftv"},"cftv_switch",{inferido:!0,nota:"câmeras ligadas ao switch PoE do rack mais próximo [CONFERIR portas no projeto]"})),p||i.set(x.id,x.id);for(let x of u)a(x,"cftv_camera",{entradas:[(o(h,x)||h[0]).id],inferido:!0,nota:"alimentada pelo switch PoE (porta a conferir)"})}let f=s("controle_acesso","fechadura");for(let h of f)a(h,"ace_fechadura",{inferido:!0,nota:"fechadura comandada pela botoeira/leitor mais próximos [CONFERIR]"});for(let h of["leitor","botoeira"])for(let p of s("controle_acesso",h)){let x=o(f.filter(m=>Math.hypot(m.x-p.x,m.y-p.y)<=4),p),S=x?[{id:"liberar",rotulo:h==="leitor"?"Apresentar credencial válida":"Pressionar a botoeira",efeitos:[{eq:x.id,estado:"liberada"}]}]:[];a(p,"ace_comando",{acoes:S,inferido:!0,nota:x?`libera a fechadura ${x.id} [CONFERIR]`:"sem fechadura a até 4 m [CONFERIR]"})}for(let h of s("controle_acesso","emergencia"))a(h,"ace_emergencia",{inferido:!0,nota:"libera todas as fechaduras (rota de fuga, fail-safe) [CONFERIR]"});for(let h of s("controle_acesso","controladora"))a(h,"ace_controladora",{});return{equipamentos:e,vinculos:i}}function hS(n,t){if(!n)return t;if(!t)return n;let e=s=>n.tem(s)?n:t,i={};for(let s of["estado","saida","tensao","situacao","acoes","agir","motivo","textoEstado","aparencia","equipamento","definir"])i[s]=(r,...a)=>e(r)[s](r,...a);return{...i,tem:s=>n.tem(s)||t.tem(s),lista:()=>[...n.lista(),...t.lista()],assinar(s){let r=n.assinar(s),a=t.assinar(s);return()=>{r(),a()}},reiniciar(){n.reiniciar(),t.reiniciar()},exportar:()=>({...n.exportar(),...t.exportar()}),importar(s){return n.importar(s),t.importar(s),!0},get versao(){return n.versao+t.versao}}}tm.exports={criarInteracao:rS,combinarRedes:hS,PERFIS:Kd,comPerfil:hs,redeDaSubestacao:lS,redeDeSinal:dS,ligarAoSimulador:cS,PAPEL_DO_SIMBOLO:Qp,ORDEM_MT:Jd,tipoMt:Kp}});var fm=Zs((eT,hm)=>{var{comPerfil:dm}=Qd(),rh="[CONFERIR] — não consta no projeto",sh=44.45,Gs=482.6,qe=(n,t,e)=>t!=null&&t!==""?{campo:n,valor:String(t),fonte:e||"projeto",conferir:!1}:{campo:n,valor:rh,fonte:"—",conferir:!0},Wc=(n,t)=>({campo:n,valor:String(t),fonte:"medida típica de catálogo (ilustrativa) [CONFERIR]",conferir:!0});function ah(n){return{tipo:"quadro",painel:n.tipo,titulo:n.titulo||n.tag,involucro:{espessura:2,cor:"#2d3036",...n.involucro},porta:{itens:n.porta||[],rotulo:"Porta",info:[["Porta",n.tipo==="rack"?"porta frontal com visor (ilustrativa)":"porta frontal (ilustrativa)"]]},portaAberta:!0,caixas:n.pecas.map(t=>({...t,info:t.info||[]})),condutores:n.conexoes||[],equipamentos:n.equipamentos||[],equipamentosPainel:n.equipamentosPainel||(n.equipamentos||[]).filter(t=>(t.interacao?.acoes||[]).length).map(t=>t.id),camadas:n.camadas||[],numeros:n.numeros||[],avisos:n.avisos||[]}}function bS({cabeamento:n=null,cftv:t=null,contagem:e=null,tag:i="RACK",equipamentoSwitch:s=null,portasPainel:r=24,portasSwitch:a=null}={}){let o=n?"cálculo da skill cabeamento (NBR 14565)":null,l=t?"cálculo da skill cftv":null,c=n?Number(n.pontosPorFd)||0:e?(Number(e.pontosRede)||0)+(Number(e.aps)||0):0,u=t?Number(t.nCam)||0:e&&Number(e.cameras)||0,f=Number(r)||24,h=Number(a)||(n?48:24),p=n||t?"padrão da skill (portas por patch panel/switch)":"padrão da skill cabeamento/cftv (24 portas) [CONFERIR]",x=n?Number(n.paineisPorFd)||0:Math.ceil(c/f),S=u?Math.ceil(u/f):0,m=n?Number(n.switchesPorFd)||0:Math.ceil(c/h),g=t?Number(t.switches)||0:u?Math.ceil((u+2)/24):0,P=Number(t?.rack?.alturaU)||Number(n?.rackU)||null;return{tag:i,equipamentoSwitch:s,alturaU:P,alturaFonte:P?l&&t?.rack?.alturaU?l:o:null,profundidade:Number(t?.rack?.profundidade)||null,patchPanels:[...Array.from({length:x},(O,T)=>({id:`PP${T+1}`,portas:f,usadas:Math.max(0,Math.min(f,c-T*f)),uso:"dados",fonte:o||"contagem dos pontos de rede do projeto"})),...Array.from({length:S},(O,T)=>({id:`PP${x+T+1}`,portas:f,usadas:Math.max(0,Math.min(f,u-T*f)),uso:"cftv",fonte:l||"contagem das câmeras do projeto"}))],switches:[...Array.from({length:m},(O,T)=>({id:`SW${T+1}`,portas:h,usadas:Math.max(0,Math.min(h,c-T*h)),poe:!!(n?n.aps:e?.aps),uso:"dados",fonte:o||"contagem dos pontos de rede do projeto"})),...Array.from({length:g},(O,T)=>({id:`SW${m+T+1}`,portas:24,usadas:Math.max(0,Math.min(24,u-T*22)),poe:!0,uso:"cftv",fonte:l||"contagem das câmeras do projeto",poe_w:t?.poeComMargem?Math.ceil(t.poeComMargem/Math.max(1,g)):null}))],nvr:u?{canais:Number(t?.canais)||null,hds:Number(t?.hds)||null,fonte:l||null}:null,fontePortas:p}}function MS(n){let t=[],e=[],i=[],s=n.patchPanels.filter(E=>E.uso==="dados"),r=n.patchPanels.filter(E=>E.uso==="cftv"),a=n.switches.filter(E=>E.uso==="dados"),o=n.switches.filter(E=>E.uso==="cftv"),l=(E,y)=>{for(let C of E)i.push({tipo:"pp",x:C},{tipo:"org"});for(let C of y)i.push({tipo:"sw",x:C},{tipo:"org"})};l(s,a),l(r,o),n.nvr&&i.push({tipo:"nvr"},{tipo:"vazio"}),i.push({tipo:"bandeja"},{tipo:"regua"});let c=i.reduce((E,y)=>E+(y.tipo==="nvr"||y.tipo==="bandeja"?2:1),0),u=n.alturaU||Math.max(12,Math.ceil((c+4)/2)*2),f=600,h=n.profundidade||600,p=Math.round(u*sh+160),x=(f-Gs)/2,S=h-60,m=p-80,g=[],P=E=>n.equipamentoSwitch&&E.uso==="cftv"?n.equipamentoSwitch:`${n.tag}:${E.id}`;for(let E of n.switches){let y=P(E);g.some(C=>C.id===y)||g.push(dm({id:y,tipo:"cftv_switch",rotulo:`Switch ${E.id}${E.poe?" PoE":""} (${E.portas} portas)`},"cftv_switch"))}let O=new Map,T=(E,y,C,B,N,$,V)=>{let D=Math.min(14.5,(Gs-60)/Math.max(1,Math.ceil(y/(y>24?2:1)))),G=y>24?2:1,K=Math.ceil(y/G);for(let Z=0;Z<y;Z++){let ht=Math.floor(Z/K),rt=Z%K,ut=x+30+rt*D,ft=B+N/2+(G===2?ht?-9:9:0)-5.5,et=Z<C;t.push({camada:"portas",x:ut,y:ft,z:S+2,l:11.5,a:11,p:3,cor:et?$:"#5b616b",semBorda:!0,semEtiqueta:!0,rotulo:`${E.id}:${Z+1}`,dica:`${E.id} porta ${Z+1} — ${et?"usada no projeto":"livre (reserva)"}`,...V&&et?{equipamento:V,acendeEm:["energizado"],corAceso:"#2fbf5a"}:{}}),O.set(`${E.id}:${Z}`,[ut+5.75,ft+5.5,S+5])}};for(let E of i){let y=E.tipo==="nvr"||E.tipo==="bandeja"?2:1,C=y*sh,B=m-C;if(E.tipo==="pp")t.push({camada:"equipamentos",x,y:B,z:S-25,l:Gs,a:C-2,p:27,cor:"#3b3f46",rotulo:E.x.id,dica:`${E.x.id} — patch panel ${E.x.portas} portas (${E.x.usadas} usadas)`,ficha:[qe("Patch panel",`${E.x.id} — ${E.x.uso==="cftv"?"câmeras (CFTV)":"pontos de rede"}`,E.x.fonte),qe("Portas",`${E.x.portas}`,n.fontePortas),qe("Portas usadas",`${E.x.usadas}`,E.x.fonte),qe("Categoria / modelo",null),Wc("Altura","1U (44,45 mm)")]}),T(E.x,E.x.portas,E.x.usadas,B,C,"#3a7bd5",null);else if(E.tipo==="sw"){let N=P(E.x);t.push({camada:"equipamentos",x,y:B,z:S-300,l:Gs,a:C-2,p:302,cor:"#23272e",rotulo:E.x.id,equipamento:N,dica:`${E.x.id} — switch ${E.x.portas} portas${E.x.poe?" PoE":""}`,ficha:[qe("Switch",`${E.x.id}${E.x.poe?" — PoE":""}`,E.x.fonte),qe("Portas",`${E.x.portas}`,n.fontePortas),qe("Portas usadas",`${E.x.usadas}`,E.x.fonte),...E.x.poe_w?[qe("Orçamento PoE",`≥ ${E.x.poe_w} W`,"cálculo da skill cftv (+20 %)")]:[],qe("Modelo",null),Wc("Altura","1U")]}),T(E.x,E.x.portas,E.x.usadas,B,C,"#2a2e35",N)}else E.tipo==="org"?t.push({camada:"organizadores",x,y:B+4,z:S-10,l:Gs,a:C-8,p:40,cor:"#16181c",semEtiqueta:!0,rotulo:"Organizador horizontal 1U",dica:"Organizador horizontal de cabos 1U",ficha:[qe("Organizador","horizontal 1U","regra da skill cabeamento (um por patch panel/switch)")]}):E.tipo==="nvr"?t.push({camada:"equipamentos",x:x+20,y:B,z:S-330,l:Gs-40,a:C-4,p:330,cor:"#1c2128",rotulo:"NVR",dica:"NVR (gravador de vídeo em rede)",ficha:[qe("NVR","gravador de vídeo em rede",n.nvr.fonte||"contagem das câmeras do projeto"),qe("Canais",n.nvr.canais,n.nvr.fonte),qe("Discos (HD)",n.nvr.hds,n.nvr.fonte),Wc("Altura","2U (bandeja)")]}):E.tipo==="bandeja"?t.push({camada:"organizadores",x,y:B,z:S-400,l:Gs,a:4,p:400,cor:"#30343b",semEtiqueta:!0,rotulo:"Bandeja",dica:'Bandeja fixa 19"',ficha:[qe("Bandeja",'fixa 19"',"skill cabeamento (régua/bandeja 2U)")]}):E.tipo==="regua"&&t.push({camada:"energia",x,y:B,z:S-60,l:Gs,a:C-4,p:60,cor:"#111316",rotulo:"Régua de energia",dica:'Régua de energia 19" 1U',ficha:[qe("Régua de energia",'19" 1U',"skill cabeamento"),qe("Tomadas / circuito",null)]});E.y=B,E.h=C,m=B}let A=(E,y,C,B)=>{let N=0,$=0;for(let V of E)for(let D=0;D<V.usadas;D++){let G=y[N];if(!G)break;let K=O.get(`${V.id}:${D}`),Z=O.get(`${G.id}:${$}`);if(K&&Z){let ht=S+22+D%4*4;e.push({id:`${V.id}.${D+1}-${G.id}.${$+1}`,funcao:B,camada:"cordoes",cor:C,d_mm:5.5,pts:[K,[K[0],K[1]-8,ht],[Z[0],Z[1]+8,ht],Z],de:`${V.id} porta ${D+1}`,para:`${G.id} porta ${$+1}`,energia:{tipo:"equipamento",id:P(G)},conferir:["cor e comprimento do cordão não constam no projeto (ilustrativo)"]})}(++$>=G.usadas||$>=G.portas)&&(N++,$=0)}};A(s,a,"#4f8fe6","dados"),A(r,o,"#e8a33d","dados");let b=[{id:"equipamentos",rotulo:"Equipamentos (patch panel, switch, NVR)",cor:"#3b3f46"},{id:"portas",rotulo:"Portas (usadas em cor)",cor:"#3a7bd5"},{id:"cordoes",rotulo:"Cordões (patch cords)",cor:"#4f8fe6"},{id:"organizadores",rotulo:"Organizadores e bandeja",cor:"#16181c"},{id:"energia",rotulo:"Régua de energia",cor:"#111316"}];return ah({tipo:"rack",tag:n.tag,titulo:`${n.tag} — rack 19" ${u}U`,involucro:{L:f,A:p,P:h,cor:"#2d3036",rotulo:`Rack ${u}U`,info:[["Rack",`19" ${u}U`],["Altura útil",n.alturaU?`${n.alturaU}U (${n.alturaFonte})`:`${u}U — ${rh}`],["Largura × profundidade",`${f} × ${h} mm (típicas) [CONFERIR]`]]},pecas:t,conexoes:e,equipamentos:g,camadas:b,numeros:[["patch panels",String(n.patchPanels.length)],["switches",String(n.switches.length)],["portas usadas",String(n.patchPanels.reduce((E,y)=>E+y.usadas,0))]],avisos:["Rack montado com a quantidade do projeto/skill; modelos, cores dos cordões e medidas são ilustrativos [CONFERIR]."]})}var SS=[{ate:7,l:151,a:100,p:65},{ate:12,l:151,a:101,p:98},{ate:18,l:181,a:167,p:77},{ate:26,l:166,a:125,p:175},{ate:1e9,l:197,a:170,p:165}];function AS({calculo:n=null,contagem:t=null,tag:e="CENTRAL",equipamentoCentral:i=null}={}){let s=n||{},r=n?"cálculo da skill incendio (NBR 17240)":null,a=n?s.nDet:t?.detectores??null,o=n?s.nAc:t?.acionadores??null,l=n?s.nAv:t?.avisadores??null,c=s.tipoSistema||null,u=c==="enderecavel"?Number(s.lacos)||null:c==="convencional"&&Number(s.zonas)||null;return{tag:e,equipamentoCentral:i,tipo:c,circuitos:u,nomeCircuito:c==="convencional"?"Zona":"Laço",fonte:r||"contagem dos dispositivos do projeto",nDet:a,nAc:o,nAv:l,bateriaAh:s.bateria?.bateriaEscolhida||null,fonteA:s.bateria?.fonteA||null}}function ES(n){let t=[],e=[],a=n.equipamentoCentral||`${n.tag}:CENTRAL`,o=n.equipamentoCentral?[]:[dm({id:a,tipo:"inc_central",rotulo:`Central ${n.tag}`},"inc_central",{entradas:[]})],l=n.fonte;t.push({camada:"central",x:40,y:280,z:20,l:340,a:200,p:8,cor:"#1f6b3a",rotulo:"Placa da central",equipamento:a,semTinta:!0,ficha:[qe("Central",n.tipo?n.tipo==="enderecavel"?"endereçável":"convencional":null,l),qe(`${n.nomeCircuito}s`,n.circuitos,l),qe("Detectores",n.nDet,l),qe("Acionadores manuais",n.nAc,l),qe("Avisadores",n.nAv,l),qe("Fonte (A)",n.fonteA,l),qe("Modelo",null)]}),t.push({camada:"central",x:120,y:410,z:28,l:180,a:50,p:4,cor:"#0e1a12",rotulo:"Display",semEtiqueta:!0,dica:"Display da central",equipamento:a}),[["ALARME","#e5484d",["alarme"]],["NORMAL","#3fb950",["normal","energizado"]],["SILENCIADO","#f2c94c",["alerta"]]].forEach(([S,m,g],P)=>{t.push({camada:"central",x:120+P*65,y:375,z:28,l:14,a:14,p:6,cor:m,rotulo:S,dica:`LED ${S}`,equipamento:a,acendeEm:g,corAceso:m,semBorda:!0})});let c=n.circuitos||1,u=50;for(let S=0;S<c;S++){let m=u+S*40;t.push({camada:"bornes",x:m,y:290,z:28,l:34,a:18,p:14,cor:"#c9a227",rotulo:`${n.nomeCircuito} ${S+1}`,dica:`${n.nomeCircuito} ${S+1} — bornes + / −`,ficha:[qe(n.nomeCircuito,`${S+1} de ${n.circuitos??"?"}`,n.circuitos?l:"—"),qe("Dispositivos",n.circuitos&&n.nDet!=null?`até o limite do ${n.nomeCircuito.toLowerCase()} (${(n.nDet||0)+(n.nAc||0)} no total)`:null,l),qe("Cabo",null)]}),e.push({id:`L${S+1}`,funcao:"laco",camada:"lacos",cor:"#d23a2a",d_mm:6,pts:[[m+17,290,35],[m+17,250,60],[m+17,20,60],[m+17,0,60]],de:`${n.nomeCircuito} ${S+1} (bornes)`,para:"campo (detectores e acionadores)",energia:{tipo:"equipamento",id:a},conferir:["cabo blindado 2 × 1,5 mm² é a estimativa da skill incendio — a cor e o tipo do cabo não constam no projeto"]})}let f=u+c*40+10;t.push({camada:"bornes",x:f,y:290,z:28,l:40,a:18,p:14,cor:"#d23a2a",rotulo:"Saída de avisadores",equipamento:a,acendeEm:["alarme"],corAceso:"#ff4b3e",dica:"Saída dos avisadores (sirenes)"}),e.push({id:"SAV",funcao:"avisadores",camada:"lacos",cor:"#ff7a59",d_mm:6,pts:[[f+20,290,35],[f+20,240,70],[f+20,0,70]],de:"saída de avisadores",para:"avisadores audiovisuais",energia:{tipo:"equipamento",id:a}}),t.push({camada:"alimentacao",x:250,y:160,z:20,l:130,a:90,p:50,cor:"#9aa3ad",rotulo:"Fonte 24 Vcc",ficha:[qe("Fonte",n.fonteA?`${String(n.fonteA).replace(".",",")} A`:null,l),qe("Tensão","24 Vcc","NBR 17240 (centrais de 24 Vcc) — conferir com o fabricante")]});let h=SS.find(S=>(n.bateriaAh||7)<=S.ate);for(let S=0;S<2;S++){let m=40+S*(h.l+15);t.push({camada:"alimentacao",x:m,y:25,z:20,l:h.l,a:h.a,p:Math.min(h.p,110),cor:"#2b2e33",rotulo:`Bateria ${S+1} 12 V`,ficha:[qe("Bateria",n.bateriaAh?`12 V ${n.bateriaAh} Ah (par em série = 24 V)`:null,n.bateriaAh?l:null),Wc("Medidas",`${h.l} × ${h.a} × ${h.p} mm`)]})}let p=40+h.l,x=40+h.l+15;return e.push({id:"BAT-S",funcao:"bateria",camada:"bateria",cor:"#202226",d_mm:4,pts:[[p-15,25+h.a,40],[p-15,25+h.a+15,40],[x+15,25+h.a+15,40],[x+15,25+h.a,40]],de:"bateria 1 (−)",para:"bateria 2 (+) — série",energia:{tipo:"terra"}}),e.push({id:"BAT+",funcao:"bateria",camada:"bateria",cor:"#d62828",d_mm:4,pts:[[55,25+h.a,40],[55,25+h.a+40,45],[260,205,45],[260,290,30]],de:"bateria 1 (+)",para:"placa da central (BAT +)",energia:{tipo:"terra"}}),ah({tipo:"central_incendio",tag:n.tag,titulo:`${n.tag} — central de detecção e alarme de incêndio`,involucro:{L:420,A:520,P:140,cor:"#b3261e",rotulo:`Central ${n.tag}`,info:[["Central",n.tag],["Gabinete","420 × 520 × 140 mm (típico) [CONFERIR com o fabricante]"]]},pecas:t,conexoes:e,equipamentos:o,equipamentosPainel:[a],camadas:[{id:"central",rotulo:"Placa, display e LEDs",cor:"#1f6b3a"},{id:"bornes",rotulo:`Bornes dos ${n.nomeCircuito.toLowerCase()}s e saídas`,cor:"#c9a227"},{id:"lacos",rotulo:`Cabos dos ${n.nomeCircuito.toLowerCase()}s e avisadores`,cor:"#d23a2a"},{id:"alimentacao",rotulo:"Fonte e baterias",cor:"#2b2e33"},{id:"bateria",rotulo:"Cabos da bateria",cor:"#d62828"}],numeros:[[`${n.nomeCircuito.toLowerCase()}s`,n.circuitos!=null?String(n.circuitos):"?"],["detectores",n.nDet!=null?String(n.nDet):"?"],["bateria",n.bateriaAh?`2 × ${n.bateriaAh} Ah`:"?"]],avisos:["Central montada com os dados do projeto/skill; gabinete, placa e posição dos bornes são ilustrativos [CONFERIR com o fabricante]."]})}hm.exports={cenaDoPainel:ah,dadosDoRack:bS,cenaDoRack:MS,dadosDaCentral:AS,cenaDaCentral:ES,U:sh,CONFERIR:rh}});var bm=Zs((nT,ym)=>{var pm=Math.PI/180,TS=(n,t=2)=>Math.round(n*10**t)/10**t;function oh(n,t,e){let i=n.length;if(e<=n[0])return e<n[0]-1e-9?0:t[0];if(e>=n[i-1])return e>n[i-1]+1e-9?0:t[i-1];let s=n[1]-n[0],r=Math.min(i-2,Math.floor((e-n[0])/s));if(e<n[r]||e>n[r+1])for(r=0;r<i-2&&e>n[r+1];)r++;let a=(e-n[r])/(n[r+1]-n[r]);return t[r]+(t[r+1]-t[r])*a}function mm(n){if(!n||!Array.isArray(n.C)||!Array.isArray(n.G)||!Array.isArray(n.I))return()=>0;if(n.C.length===1){let t=n.I[0];return(e,i)=>oh(n.G,t,i)}return(t,e)=>{let i=(t%360+360)%360,s=n.C[1]-n.C[0],r=Math.min(n.C.length-2,Math.floor(i/s));if(i<n.C[r]||i>n.C[r+1])for(r=0;r<n.C.length-2&&i>n.C[r+1];)r++;let a=(i-n.C[r])/(n.C[r+1]-n.C[r]),o=oh(n.G,n.I[r],e),l=oh(n.G,n.I[r+1],e);return o+(l-o)*a}}function gm(n,t,e,i){let s=0;for(let r of i){let a=r.fator??1;if(!(a>0))continue;let o=r.z-e;if(!(o>0))continue;let l=n-r.x,c=t-r.y,u=l*l+c*c+o*o,f=Math.sqrt(u),h=Math.acos(o/f)/pm,p=0;l*l+c*c>1e-12&&(p=Math.atan2(c,l)/pm-(r.rot||0)),s+=a*r.I(p,h)*(o/f)/u}return s}function _m([n,t],e){let i=!1;for(let s=0,r=e.length-1;s<e.length;r=s++){let[a,o]=e[s],[l,c]=e[r];o>t!=c>t&&n<(l-a)*(t-o)/(c-o)+a&&(i=!i)}return i}function xm(n,{nx:t,ny:e,passo:i,maxCelulas:s=4e3}={}){let r=n.map(x=>x[0]),a=n.map(x=>x[1]),o=Math.min(...r),l=Math.min(...a),c=Math.max(...r)-o,u=Math.max(...a)-l;if(!(t>0&&e>0)){let x=i>0?i:.5;c/x*(u/x)>s&&(x=Math.sqrt(c*u/s)),t=Math.max(1,Math.round(c/x)),e=Math.max(1,Math.round(u/x))}let f=c/t,h=u/e,p=[];for(let x=0;x<e;x++)for(let S=0;S<t;S++){let m=[o+f*(S+.5),l+h*(x+.5)];_m(m,n)&&p.push({x:m[0],y:m[1],i:S,j:x})}return{x0:o,y0:l,dx:f,dy:h,nx:t,ny:e,L:c,W:u,centros:p}}function wS(n,t){let e=Math.max(n,t),i=Math.min(10,.2*5**Math.log10(Math.max(e,1))),s=Math.max(1,Math.ceil(n/i-1e-9)),r=Math.max(1,Math.ceil(t/i-1e-9));return{p:i,nx:s,ny:r,pontos:s*r}}function vm(n){let t=n.filter(Number.isFinite);if(!t.length)return{em:0,emin:0,emax:0,u0:0,pontos:0};let e=t.reduce((s,r)=>s+r,0)/t.length,i=Math.min(...t);return{em:e,emin:i,emax:Math.max(...t),u0:e>0?i/e:0,pontos:t.length}}function CS({poligono:n,plano:t=.75,luminarias:e=[],fm:i=1,nx:s,ny:r,passo:a,maxCelulas:o}={}){let l=xm(n,{nx:s,ny:r,passo:a,maxCelulas:o}),c=new Map,u=e.map(h=>{let p=h.I;return p||(c.has(h.fotometria)||c.set(h.fotometria,mm(h.fotometria)),p=c.get(h.fotometria)),{x:h.x,y:h.y,z:h.z,I:p,rot:h.rot||0,fator:i*(h.nivel??1)}}),f=l.centros.map(h=>gm(h.x,h.y,t,u));return{grade:l,valores:f,...vm(f)}}var $c=[[0,[.12,.1,.45]],[.2,[.1,.35,.95]],[.4,[.05,.8,.9]],[.6,[.2,.85,.3]],[.8,[.98,.88,.15]],[1,[.9,.15,.1]]];function RS(n){let t=Math.min(1,Math.max(0,Number(n)||0)),e=0;for(;e<$c.length-2&&t>$c[e+1][0];)e++;let[i,s]=$c[e],[r,a]=$c[e+1],o=(t-i)/(r-i);return[s[0]+(a[0]-s[0])*o,s[1]+(a[1]-s[1])*o,s[2]+(a[2]-s[2])*o]}function PS(n){let t=Math.max(10,Number(n)||0),e=10**Math.floor(Math.log10(t)),i=[1,1.5,2,2.5,3,4,5,6,8,10].map(s=>s*e).find(s=>s>=t-1e-9);return{max:i,marcas:[0,.2,.4,.6,.8,1].map(s=>Math.round(i*s))}}ym.exports={avaliador:mm,iluminanciaNoPonto:gm,gradeNoPoligono:xm,calcularAmbiente:CS,estatisticas:vm,malhaMedicao:wS,dentro:_m,corFalsa:RS,escala:PS,arred:TS}});var Is={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Ds={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},uf=0,qu=1,df=2;var Ja=1,hf=2,ea=3,Ls=0,Hn=1,dn=2,$i=0,na=1,Xu=2,Yu=3,ju=4,ff=5;var lr=100,pf=101,mf=102,gf=103,_f=104,xf=200,vf=201,yf=202,bf=203,Zu=204,Ju=205,Mf=206,Sf=207,Af=208,Ef=209,Tf=210,wf=211,Cf=212,Rf=213,Pf=214,Jo=0,Ko=1,Qo=2,Gr=3,tl=4,el=5,nl=6,il=7,Ku=0,If=1,Df=2,wi=0,Qu=1,td=2,ed=3,nd=4,id=5,sd=6,rd=7;var ad=300,Ns=301,cr=302,Ol=303,Fl=304,Ka=306,sl=1e3,zi=1001,rl=1002,Tn=1003,Lf=1004;var Qa=1005;var Pn=1006,Bl=1007;var Us=1008;var Kn=1009,od=1010,ld=1011,ia=1012,zl=1013,Ci=1014,xi=1015,Ri=1016,kl=1017,Vl=1018,sa=1020,cd=35902,ud=35899,dd=1021,hd=1022,vi=1023,Vi=1026,Os=1027,Gl=1028,Hl=1029,Fs=1030,Wl=1031;var $l=1033,to=33776,eo=33777,no=33778,io=33779,ql=35840,Xl=35841,Yl=35842,jl=35843,Zl=36196,Jl=37492,Kl=37496,Ql=37488,tc=37489,so=37490,ec=37491,nc=37808,ic=37809,sc=37810,rc=37811,ac=37812,oc=37813,lc=37814,cc=37815,uc=37816,dc=37817,hc=37818,fc=37819,pc=37820,mc=37821,gc=36492,_c=36494,xc=36495,vc=36283,yc=36284,ro=36285,bc=36286;var Ea=2300,al=2301,jo=2302,Lu=2303,Nu=2400,Uu=2401,Ou=2402;var Nf=3200;var Mc=0,Uf=1,us="",_n="srgb",Ta="srgb-linear",wa="linear",He="srgb";var Zo=7680;var Of=519,Ff=512,Bf=513,zf=514,Sc=515,kf=516,Vf=517,Ac=518,Gf=519,Hf=35044;var fd="300 es",Ai=2e3,Hr=2001;function km(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function Vm(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function Ca(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Wf(){let n=Ca("canvas");return n.style.display="block",n}var wh={},Wr=null;function pd(...n){let t="THREE."+n.shift();Wr?Wr("log",t,...n):console.log(t,...n)}function $f(n){let t=n[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=n[1];e&&e.isStackTrace?n[0]+=" "+e.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function de(...n){n=$f(n);let t="THREE."+n.shift();if(Wr)Wr("warn",t,...n);else{let e=n[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...n)}}function fe(...n){n=$f(n);let t="THREE."+n.shift();if(Wr)Wr("error",t,...n);else{let e=n[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...n)}}function nr(...n){let t=n.join(" ");t in wh||(wh[t]=!0,de(...n))}function qf(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}var Xf={[Jo]:Ko,[Qo]:nl,[tl]:il,[Gr]:el,[Ko]:Jo,[nl]:Qo,[il]:tl,[el]:Gr},Ei=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){let i=this._listeners;if(i===void 0)return;let s=i[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let i=e[t.type];if(i!==void 0){t.target=this;let s=i.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},Nn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ch=1234567,kr=Math.PI/180,$r=180/Math.PI;function ur(){let n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Nn[n&255]+Nn[n>>8&255]+Nn[n>>16&255]+Nn[n>>24&255]+"-"+Nn[t&255]+Nn[t>>8&255]+"-"+Nn[t>>16&15|64]+Nn[t>>24&255]+"-"+Nn[e&63|128]+Nn[e>>8&255]+"-"+Nn[e>>16&255]+Nn[e>>24&255]+Nn[i&255]+Nn[i>>8&255]+Nn[i>>16&255]+Nn[i>>24&255]).toLowerCase()}function Ee(n,t,e){return Math.max(t,Math.min(e,n))}function md(n,t){return(n%t+t)%t}function Gm(n,t,e,i,s){return i+(n-t)*(s-i)/(e-t)}function Hm(n,t,e){return n!==t?(e-n)/(t-n):0}function Ma(n,t,e){return(1-e)*n+e*t}function Wm(n,t,e,i){return Ma(n,t,1-Math.exp(-e*i))}function $m(n,t=1){return t-Math.abs(md(n,t*2)-t)}function qm(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function Xm(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function Ym(n,t){return n+Math.floor(Math.random()*(t-n+1))}function jm(n,t){return n+Math.random()*(t-n)}function Zm(n){return n*(.5-Math.random())}function Jm(n){n!==void 0&&(Ch=n);let t=Ch+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Km(n){return n*kr}function Qm(n){return n*$r}function t0(n){return n>0&&Number.isInteger(n)&&2**Math.round(Math.log2(n))===n}function e0(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function n0(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function i0(n,t,e,i,s){let r=Math.cos,a=Math.sin,o=r(e/2),l=a(e/2),c=r((t+i)/2),u=a((t+i)/2),f=r((t-i)/2),h=a((t-i)/2),p=r((i-t)/2),x=a((i-t)/2);switch(s){case"XYX":n.set(o*u,l*f,l*h,o*c);break;case"YZY":n.set(l*h,o*u,l*f,o*c);break;case"ZXZ":n.set(l*f,l*h,o*u,o*c);break;case"XZX":n.set(o*u,l*x,l*p,o*c);break;case"YXY":n.set(l*p,o*u,l*x,o*c);break;case"ZYZ":n.set(l*x,l*p,o*u,o*c);break;default:de("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function zr(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:case Uint8ClampedArray:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function zn(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var hn={DEG2RAD:kr,RAD2DEG:$r,generateUUID:ur,clamp:Ee,euclideanModulo:md,mapLinear:Gm,inverseLerp:Hm,lerp:Ma,damp:Wm,pingpong:$m,smoothstep:qm,smootherstep:Xm,randInt:Ym,randFloat:jm,randFloatSpread:Zm,seededRandom:Jm,degToRad:Km,radToDeg:Qm,isPowerOfTwo:t0,ceilPowerOfTwo:e0,floorPowerOfTwo:n0,setQuaternionFromProperEuler:i0,normalize:zn,denormalize:zr},bd=class bd{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Ee(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(Ee(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*i-a*s+t.x,this.y=r*s+a*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};bd.prototype.isVector2=!0;var Pt=bd,In=class{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,a,o){let l=i[s+0],c=i[s+1],u=i[s+2],f=i[s+3],h=r[a+0],p=r[a+1],x=r[a+2],S=r[a+3];if(f!==S||l!==h||c!==p||u!==x){let m=l*h+c*p+u*x+f*S;m<0&&(h=-h,p=-p,x=-x,S=-S,m=-m);let g=1-o;if(m<.9995){let P=Math.acos(m),O=Math.sin(P);g=Math.sin(g*P)/O,o=Math.sin(o*P)/O,l=l*g+h*o,c=c*g+p*o,u=u*g+x*o,f=f*g+S*o}else{l=l*g+h*o,c=c*g+p*o,u=u*g+x*o,f=f*g+S*o;let P=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=P,c*=P,u*=P,f*=P}}t[e]=l,t[e+1]=c,t[e+2]=u,t[e+3]=f}static multiplyQuaternionsFlat(t,e,i,s,r,a){let o=i[s],l=i[s+1],c=i[s+2],u=i[s+3],f=r[a],h=r[a+1],p=r[a+2],x=r[a+3];return t[e]=o*x+u*f+l*p-c*h,t[e+1]=l*x+u*h+c*f-o*p,t[e+2]=c*x+u*p+o*h-l*f,t[e+3]=u*x-o*f-l*h-c*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let i=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(i/2),u=o(s/2),f=o(r/2),h=l(i/2),p=l(s/2),x=l(r/2);switch(a){case"XYZ":this._x=h*u*f+c*p*x,this._y=c*p*f-h*u*x,this._z=c*u*x+h*p*f,this._w=c*u*f-h*p*x;break;case"YXZ":this._x=h*u*f+c*p*x,this._y=c*p*f-h*u*x,this._z=c*u*x-h*p*f,this._w=c*u*f+h*p*x;break;case"ZXY":this._x=h*u*f-c*p*x,this._y=c*p*f+h*u*x,this._z=c*u*x+h*p*f,this._w=c*u*f-h*p*x;break;case"ZYX":this._x=h*u*f-c*p*x,this._y=c*p*f+h*u*x,this._z=c*u*x-h*p*f,this._w=c*u*f+h*p*x;break;case"YZX":this._x=h*u*f+c*p*x,this._y=c*p*f+h*u*x,this._z=c*u*x-h*p*f,this._w=c*u*f-h*p*x;break;case"XZY":this._x=h*u*f-c*p*x,this._y=c*p*f-h*u*x,this._z=c*u*x+h*p*f,this._w=c*u*f+h*p*x;break;default:de("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,i=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],u=e[6],f=e[10],h=i+o+f;if(h>0){let p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(u-l)*p,this._y=(r-c)*p,this._z=(a-s)*p}else if(i>o&&i>f){let p=2*Math.sqrt(1+i-o-f);this._w=(u-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+c)/p}else if(o>f){let p=2*Math.sqrt(1+o-i-f);this._w=(r-c)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+u)/p}else{let p=2*Math.sqrt(1+f-i-o);this._w=(a-s)/p,this._x=(r+c)/p,this._y=(l+u)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ee(this.dot(t),-1,1)))}rotateTowards(t,e){let i=this.angleTo(t);if(i===0)return this;let s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let i=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,u=e._w;return this._x=i*u+a*o+s*c-r*l,this._y=s*u+a*l+r*o-i*c,this._z=r*u+a*c+i*l-s*o,this._w=a*u-i*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let i=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(i=-i,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),u=Math.sin(c);l=Math.sin(l*c)/u,e=Math.sin(e*c)/u,this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},Md=class Md{constructor(t=0,e=0,i=0){this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Rh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Rh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,i=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*i),u=2*(o*e-r*s),f=2*(r*i-a*e);return this.x=e+l*c+a*f-o*u,this.y=i+l*u+o*c-r*f,this.z=s+l*f+r*u-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this.z=Ee(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this.z=Ee(this.z,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Ee(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let i=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-i*l,this.z=i*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return ou.copy(this).projectOnVector(t),this.sub(ou)}reflect(t){return this.sub(ou.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(Ee(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){let s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Md.prototype.isVector3=!0;var X=Md,ou=new X,Rh=new In,Sd=class Sd{constructor(t,e,i,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,a,o,l,c)}set(t,e,i,s,r,a,o,l,c){let u=this.elements;return u[0]=t,u[1]=s,u[2]=o,u[3]=e,u[4]=r,u[5]=l,u[6]=i,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],u=i[4],f=i[7],h=i[2],p=i[5],x=i[8],S=s[0],m=s[3],g=s[6],P=s[1],O=s[4],T=s[7],A=s[2],b=s[5],E=s[8];return r[0]=a*S+o*P+l*A,r[3]=a*m+o*O+l*b,r[6]=a*g+o*T+l*E,r[1]=c*S+u*P+f*A,r[4]=c*m+u*O+f*b,r[7]=c*g+u*T+f*E,r[2]=h*S+p*P+x*A,r[5]=h*m+p*O+x*b,r[8]=h*g+p*T+x*E,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],u=t[8];return e*a*u-e*o*c-i*r*u+i*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],u=t[8],f=u*a-o*c,h=o*l-u*r,p=c*r-a*l,x=e*f+i*h+s*p;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let S=1/x;return t[0]=f*S,t[1]=(s*c-u*i)*S,t[2]=(o*i-s*a)*S,t[3]=h*S,t[4]=(u*e-s*l)*S,t[5]=(s*r-o*e)*S,t[6]=p*S,t[7]=(i*l-c*e)*S,t[8]=(a*e-i*r)*S,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return nr("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(lu.makeScale(t,e)),this}rotate(t){return nr("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(lu.makeRotation(-t)),this}translate(t,e){return nr("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(lu.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Sd.prototype.isMatrix3=!0;var ge=Sd,lu=new ge,Ph=new ge().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ih=new ge().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function s0(){let n={enabled:!0,workingColorSpace:Ta,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===He&&(s.r=ss(s.r),s.g=ss(s.g),s.b=ss(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===He&&(s.r=Vr(s.r),s.g=Vr(s.g),s.b=Vr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===us?wa:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return nr("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return nr("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Ta]:{primaries:t,whitePoint:i,transfer:wa,toXYZ:Ph,fromXYZ:Ih,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:_n},outputColorSpaceConfig:{drawingBufferColorSpace:_n}},[_n]:{primaries:t,whitePoint:i,transfer:He,toXYZ:Ph,fromXYZ:Ih,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:_n}}}),n}var Ie=s0();function ss(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Vr(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var Er,ol=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{Er===void 0&&(Er=Ca("canvas")),Er.width=t.width,Er.height=t.height;let s=Er.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),i=Er}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Ca("canvas");e.width=t.width,e.height=t.height;let i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=ss(r[a]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(ss(e[i]/255)*255):e[i]=ss(e[i]);return{data:e,width:t.width,height:t.height}}else return de("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},r0=0,qr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:r0++}),this.uuid=ur(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(cu(s[a].image)):r.push(cu(s[a]))}else r=cu(s);i.url=r}return e||(t.images[this.uuid]=i),i}};function cu(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?ol.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(de("Texture: Unable to serialize Texture."),{})}var a0=0,uu=new X,jn=class n extends Ei{constructor(t=n.DEFAULT_IMAGE,e=n.DEFAULT_MAPPING,i=zi,s=zi,r=Pn,a=Us,o=vi,l=Kn,c=n.DEFAULT_ANISOTROPY,u=us){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:a0++}),this.uuid=ur(),this.name="",this.source=new qr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Pt(0,0),this.repeat=new Pt(1,1),this.center=new Pt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ge,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(uu).x}get height(){return this.source.getSize(uu).y}get depth(){return this.source.getSize(uu).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let i=t[e];if(i===void 0){de(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){de(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==ad)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case sl:t.x=t.x-Math.floor(t.x);break;case zi:t.x=t.x<0?0:1;break;case rl:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case sl:t.y=t.y-Math.floor(t.y);break;case zi:t.y=t.y<0?0:1;break;case rl:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};jn.DEFAULT_IMAGE=null;jn.DEFAULT_MAPPING=ad;jn.DEFAULT_ANISOTROPY=1;var Ad=class Ad{constructor(t=0,e=0,i=0,s=1){this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*i+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*i+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*i+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*i+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r,l=t.elements,c=l[0],u=l[4],f=l[8],h=l[1],p=l[5],x=l[9],S=l[2],m=l[6],g=l[10];if(Math.abs(u-h)<.01&&Math.abs(f-S)<.01&&Math.abs(x-m)<.01){if(Math.abs(u+h)<.1&&Math.abs(f+S)<.1&&Math.abs(x+m)<.1&&Math.abs(c+p+g-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let O=(c+1)/2,T=(p+1)/2,A=(g+1)/2,b=(u+h)/4,E=(f+S)/4,y=(x+m)/4;return O>T&&O>A?O<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(O),s=b/i,r=E/i):T>A?T<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(T),i=b/s,r=y/s):A<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),i=E/r,s=y/r),this.set(i,s,r,e),this}let P=Math.sqrt((m-x)*(m-x)+(f-S)*(f-S)+(h-u)*(h-u));return Math.abs(P)<.001&&(P=1),this.x=(m-x)/P,this.y=(f-S)/P,this.z=(h-u)/P,this.w=Math.acos((c+p+g-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ee(this.x,t.x,e.x),this.y=Ee(this.y,t.y,e.y),this.z=Ee(this.z,t.z,e.z),this.w=Ee(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ee(this.x,t,e),this.y=Ee(this.y,t,e),this.z=Ee(this.z,t,e),this.w=Ee(this.w,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Ee(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Ad.prototype.isVector4=!0;var Ke=Ad,ll=class extends Ei{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Pn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new Ke(0,0,t,e),this.scissorTest=!1,this.viewport=new Ke(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:i.depth},r=new jn(s),a=i.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Pn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new qr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Zn=class extends ll{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}},Ra=class extends jn{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Tn,this.minFilter=Tn,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var cl=class extends jn{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Tn,this.minFilter=Tn,this.wrapR=zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Ul=class Ul{constructor(t,e,i,s,r,a,o,l,c,u,f,h,p,x,S,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,a,o,l,c,u,f,h,p,x,S,m)}set(t,e,i,s,r,a,o,l,c,u,f,h,p,x,S,m){let g=this.elements;return g[0]=t,g[4]=e,g[8]=i,g[12]=s,g[1]=r,g[5]=a,g[9]=o,g[13]=l,g[2]=c,g[6]=u,g[10]=f,g[14]=h,g[3]=p,g[7]=x,g[11]=S,g[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ul().fromArray(this.elements)}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){let e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,i=t.elements,s=1/Tr.setFromMatrixColumn(t,0).length(),r=1/Tr.setFromMatrixColumn(t,1).length(),a=1/Tr.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*a,e[9]=i[9]*a,e[10]=i[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,i=t.x,s=t.y,r=t.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),f=Math.sin(r);if(t.order==="XYZ"){let h=a*u,p=a*f,x=o*u,S=o*f;e[0]=l*u,e[4]=-l*f,e[8]=c,e[1]=p+x*c,e[5]=h-S*c,e[9]=-o*l,e[2]=S-h*c,e[6]=x+p*c,e[10]=a*l}else if(t.order==="YXZ"){let h=l*u,p=l*f,x=c*u,S=c*f;e[0]=h+S*o,e[4]=x*o-p,e[8]=a*c,e[1]=a*f,e[5]=a*u,e[9]=-o,e[2]=p*o-x,e[6]=S+h*o,e[10]=a*l}else if(t.order==="ZXY"){let h=l*u,p=l*f,x=c*u,S=c*f;e[0]=h-S*o,e[4]=-a*f,e[8]=x+p*o,e[1]=p+x*o,e[5]=a*u,e[9]=S-h*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let h=a*u,p=a*f,x=o*u,S=o*f;e[0]=l*u,e[4]=x*c-p,e[8]=h*c+S,e[1]=l*f,e[5]=S*c+h,e[9]=p*c-x,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let h=a*l,p=a*c,x=o*l,S=o*c;e[0]=l*u,e[4]=S-h*f,e[8]=x*f+p,e[1]=f,e[5]=a*u,e[9]=-o*u,e[2]=-c*u,e[6]=p*f+x,e[10]=h-S*f}else if(t.order==="XZY"){let h=a*l,p=a*c,x=o*l,S=o*c;e[0]=l*u,e[4]=-f,e[8]=c*u,e[1]=h*f+S,e[5]=a*u,e[9]=p*f-x,e[2]=x*f-p,e[6]=o*u,e[10]=S*f+h}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(o0,t,l0)}lookAt(t,e,i){let s=this.elements;return si.subVectors(t,e),si.lengthSq()===0&&(si.z=1),si.normalize(),xs.crossVectors(i,si),xs.lengthSq()===0&&(Math.abs(i.z)===1?si.x+=1e-4:si.z+=1e-4,si.normalize(),xs.crossVectors(i,si)),xs.normalize(),Mo.crossVectors(si,xs),s[0]=xs.x,s[4]=Mo.x,s[8]=si.x,s[1]=xs.y,s[5]=Mo.y,s[9]=si.y,s[2]=xs.z,s[6]=Mo.z,s[10]=si.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],f=i[5],h=i[9],p=i[13],x=i[2],S=i[6],m=i[10],g=i[14],P=i[3],O=i[7],T=i[11],A=i[15],b=s[0],E=s[4],y=s[8],C=s[12],B=s[1],N=s[5],$=s[9],V=s[13],D=s[2],G=s[6],K=s[10],Z=s[14],ht=s[3],rt=s[7],ut=s[11],ft=s[15];return r[0]=a*b+o*B+l*D+c*ht,r[4]=a*E+o*N+l*G+c*rt,r[8]=a*y+o*$+l*K+c*ut,r[12]=a*C+o*V+l*Z+c*ft,r[1]=u*b+f*B+h*D+p*ht,r[5]=u*E+f*N+h*G+p*rt,r[9]=u*y+f*$+h*K+p*ut,r[13]=u*C+f*V+h*Z+p*ft,r[2]=x*b+S*B+m*D+g*ht,r[6]=x*E+S*N+m*G+g*rt,r[10]=x*y+S*$+m*K+g*ut,r[14]=x*C+S*V+m*Z+g*ft,r[3]=P*b+O*B+T*D+A*ht,r[7]=P*E+O*N+T*G+A*rt,r[11]=P*y+O*$+T*K+A*ut,r[15]=P*C+O*V+T*Z+A*ft,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],u=t[2],f=t[6],h=t[10],p=t[14],x=t[3],S=t[7],m=t[11],g=t[15],P=l*p-c*h,O=o*p-c*f,T=o*h-l*f,A=a*p-c*u,b=a*h-l*u,E=a*f-o*u;return e*(S*P-m*O+g*T)-i*(x*P-m*A+g*b)+s*(x*O-S*A+g*E)-r*(x*T-S*b+m*E)}determinantAffine(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],u=t[10];return e*(a*u-o*c)-i*(r*u-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],u=t[8],f=t[9],h=t[10],p=t[11],x=t[12],S=t[13],m=t[14],g=t[15],P=e*o-i*a,O=e*l-s*a,T=e*c-r*a,A=i*l-s*o,b=i*c-r*o,E=s*c-r*l,y=u*S-f*x,C=u*m-h*x,B=u*g-p*x,N=f*m-h*S,$=f*g-p*S,V=h*g-p*m,D=P*V-O*$+T*N+A*B-b*C+E*y;if(D===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let G=1/D;return t[0]=(o*V-l*$+c*N)*G,t[1]=(s*$-i*V-r*N)*G,t[2]=(S*E-m*b+g*A)*G,t[3]=(h*b-f*E-p*A)*G,t[4]=(l*B-a*V-c*C)*G,t[5]=(e*V-s*B+r*C)*G,t[6]=(m*T-x*E-g*O)*G,t[7]=(u*E-h*T+p*O)*G,t[8]=(a*$-o*B+c*y)*G,t[9]=(i*B-e*$-r*y)*G,t[10]=(x*b-S*T+g*P)*G,t[11]=(f*T-u*b-p*P)*G,t[12]=(o*C-a*N-l*y)*G,t[13]=(e*N-i*C+s*y)*G,t[14]=(S*O-x*A-m*P)*G,t[15]=(u*A-f*O+h*P)*G,this}scale(t){let e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let i=Math.cos(e),s=Math.sin(e),r=1-i,a=t.x,o=t.y,l=t.z,c=r*a,u=r*o;return this.set(c*a+i,c*o-s*l,c*l+s*o,0,c*o+s*l,u*o+i,u*l-s*a,0,c*l-s*o,u*l+s*a,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,a){return this.set(1,i,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,u=a+a,f=o+o,h=r*c,p=r*u,x=r*f,S=a*u,m=a*f,g=o*f,P=l*c,O=l*u,T=l*f,A=i.x,b=i.y,E=i.z;return s[0]=(1-(S+g))*A,s[1]=(p+T)*A,s[2]=(x-O)*A,s[3]=0,s[4]=(p-T)*b,s[5]=(1-(h+g))*b,s[6]=(m+P)*b,s[7]=0,s[8]=(x+O)*E,s[9]=(m-P)*E,s[10]=(1-(h+S))*E,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return i.set(1,1,1),e.identity(),this;let a=Tr.set(s[0],s[1],s[2]).length(),o=Tr.set(s[4],s[5],s[6]).length(),l=Tr.set(s[8],s[9],s[10]).length();r<0&&(a=-a),bi.copy(this);let c=1/a,u=1/o,f=1/l;return bi.elements[0]*=c,bi.elements[1]*=c,bi.elements[2]*=c,bi.elements[4]*=u,bi.elements[5]*=u,bi.elements[6]*=u,bi.elements[8]*=f,bi.elements[9]*=f,bi.elements[10]*=f,e.setFromRotationMatrix(bi),i.x=a,i.y=o,i.z=l,this}makePerspective(t,e,i,s,r,a,o=Ai,l=!1){let c=this.elements,u=2*r/(e-t),f=2*r/(i-s),h=(e+t)/(e-t),p=(i+s)/(i-s),x,S;if(l)x=r/(a-r),S=a*r/(a-r);else if(o===Ai)x=-(a+r)/(a-r),S=-2*a*r/(a-r);else if(o===Hr)x=-a/(a-r),S=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=f,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=S,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,s,r,a,o=Ai,l=!1){let c=this.elements,u=2/(e-t),f=2/(i-s),h=-(e+t)/(e-t),p=-(i+s)/(i-s),x,S;if(l)x=1/(a-r),S=a/(a-r);else if(o===Ai)x=-2/(a-r),S=-(a+r)/(a-r);else if(o===Hr)x=-1/(a-r),S=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=f,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=x,c[14]=S,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}};Ul.prototype.isMatrix4=!0;var Oe=Ul,Tr=new X,bi=new Oe,o0=new X(0,0,0),l0=new X(1,1,1),xs=new X,Mo=new X,si=new X,Dh=new Oe,Lh=new In,rs=class n{constructor(t=0,e=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],u=s[9],f=s[2],h=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(Ee(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ee(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ee(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-f,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ee(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ee(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-Ee(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-u,p),this._y=0);break;default:de("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Dh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Dh,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Lh.setFromEuler(this),this.setFromQuaternion(Lh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};rs.DEFAULT_ORDER="XYZ";var Xr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},c0=0,Nh=new X,wr=new In,Ki=new Oe,So=new X,pa=new X,u0=new X,d0=new In,Uh=new X(1,0,0),Oh=new X(0,1,0),Fh=new X(0,0,1),Bh={type:"added"},h0={type:"removed"},Cr={type:"childadded",child:null},du={type:"childremoved",child:null},vn=class n extends Ei{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:c0++}),this.uuid=ur(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let t=new X,e=new rs,i=new In,s=new X(1,1,1);function r(){i.setFromEuler(e,!1)}function a(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Oe},normalMatrix:{value:new ge}}),this.matrix=new Oe,this.matrixWorld=new Oe,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Xr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return wr.setFromAxisAngle(t,e),this.quaternion.multiply(wr),this}rotateOnWorldAxis(t,e){return wr.setFromAxisAngle(t,e),this.quaternion.premultiply(wr),this}rotateX(t){return this.rotateOnAxis(Uh,t)}rotateY(t){return this.rotateOnAxis(Oh,t)}rotateZ(t){return this.rotateOnAxis(Fh,t)}translateOnAxis(t,e){return Nh.copy(t).applyQuaternion(this.quaternion),this.position.add(Nh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Uh,t)}translateY(t){return this.translateOnAxis(Oh,t)}translateZ(t){return this.translateOnAxis(Fh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Ki.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?So.copy(t):So.set(t,e,i);let s=this.parent;this.updateWorldMatrix(!0,!1),pa.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ki.lookAt(pa,So,this.up):Ki.lookAt(So,pa,this.up),this.quaternion.setFromRotationMatrix(Ki),s&&(Ki.extractRotation(s.matrixWorld),wr.setFromRotationMatrix(Ki),this.quaternion.premultiply(wr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(fe("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Bh),Cr.child=t,this.dispatchEvent(Cr),Cr.child=null):fe("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(h0),du.child=t,this.dispatchEvent(du),du.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Ki.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Ki.multiply(t.parent.matrixWorld)),t.applyMatrix4(Ki),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Bh),Cr.child=t,this.dispatchEvent(Cr),Cr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){let a=this.children[i].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pa,t,u0),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pa,d0,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,i=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*i-r[8]*s,r[13]+=i-r[1]*e-r[5]*i-r[9]*s,r[14]+=s-r[2]*e-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e,i=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,i)}}toJSON(t){let e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let f=l[c];r(t.shapes,f)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),u=a(t.images),f=a(t.shapes),h=a(t.skeletons),p=a(t.animations),x=a(t.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),f.length>0&&(i.shapes=f),h.length>0&&(i.skeletons=h),p.length>0&&(i.animations=p),x.length>0&&(i.nodes=x)}return i.object=s,i;function a(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){let s=t.children[i];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};vn.DEFAULT_UP=new X(0,1,0);vn.DEFAULT_MATRIX_AUTO_UPDATE=!0;vn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Rn=class extends vn{constructor(){super(),this.isGroup=!0,this.type="Group"}},f0={type:"move"},Yr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Rn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Rn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new X,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new X),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Rn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new X,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new X,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let S of t.hand.values()){let m=e.getJointPose(S,i),g=this._getHandJoint(c,S);m!==null&&(g.matrix.fromArray(m.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=m.radius),g.visible=m!==null}let u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],h=u.position.distanceTo(f.position),p=.02,x=.005;c.inputState.pinching&&h>p+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&h<=p-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(f0)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let i=new Rn;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}},Yf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},vs={h:0,s:0,l:0},Ao={h:0,s:0,l:0};function hu(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}var he=class{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=_n){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Ie.colorSpaceToWorking(this,e),this}setRGB(t,e,i,s=Ie.workingColorSpace){return this.r=t,this.g=e,this.b=i,Ie.colorSpaceToWorking(this,s),this}setHSL(t,e,i,s=Ie.workingColorSpace){if(t=md(t,1),e=Ee(e,0,1),i=Ee(i,0,1),e===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+e):i+e-i*e,a=2*i-r;this.r=hu(a,r,t+1/3),this.g=hu(a,r,t),this.b=hu(a,r,t-1/3)}return Ie.colorSpaceToWorking(this,s),this}setStyle(t,e=_n){function i(r){r!==void 0&&parseFloat(r)<1&&de("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:de("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);de("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=_n){let i=Yf[t.toLowerCase()];return i!==void 0?this.setHex(i,e):de("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=ss(t.r),this.g=ss(t.g),this.b=ss(t.b),this}copyLinearToSRGB(t){return this.r=Vr(t.r),this.g=Vr(t.g),this.b=Vr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=_n){return Ie.workingToColorSpace(Un.copy(this),t),Math.round(Ee(Un.r*255,0,255))*65536+Math.round(Ee(Un.g*255,0,255))*256+Math.round(Ee(Un.b*255,0,255))}getHexString(t=_n){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Ie.workingColorSpace){Ie.workingToColorSpace(Un.copy(this),e);let i=Un.r,s=Un.g,r=Un.b,a=Math.max(i,s,r),o=Math.min(i,s,r),l,c,u=(o+a)/2;if(o===a)l=0,c=0;else{let f=a-o;switch(c=u<=.5?f/(a+o):f/(2-a-o),a){case i:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-i)/f+2;break;case r:l=(i-s)/f+4;break}l/=6}return t.h=l,t.s=c,t.l=u,t}getRGB(t,e=Ie.workingColorSpace){return Ie.workingToColorSpace(Un.copy(this),e),t.r=Un.r,t.g=Un.g,t.b=Un.b,t}getStyle(t=_n){Ie.workingToColorSpace(Un.copy(this),t);let e=Un.r,i=Un.g,s=Un.b;return t!==_n?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(vs),this.setHSL(vs.h+t,vs.s+e,vs.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(vs),t.getHSL(Ao);let i=Ma(vs.h,Ao.h,e),s=Ma(vs.s,Ao.s,e),r=Ma(vs.l,Ao.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Un=new he;he.NAMES=Yf;var ir=class extends vn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new rs,this.environmentIntensity=1,this.environmentRotation=new rs,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Mi=new X,Qi=new X,fu=new X,ts=new X,Rr=new X,Pr=new X,zh=new X,pu=new X,mu=new X,gu=new X,_u=new Ke,xu=new Ke,vu=new Ke,is=class n{constructor(t=new X,e=new X,i=new X){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),Mi.subVectors(t,e),s.cross(Mi);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){Mi.subVectors(s,e),Qi.subVectors(i,e),fu.subVectors(t,e);let a=Mi.dot(Mi),o=Mi.dot(Qi),l=Mi.dot(fu),c=Qi.dot(Qi),u=Qi.dot(fu),f=a*c-o*o;if(f===0)return r.set(0,0,0),null;let h=1/f,p=(c*l-o*u)*h,x=(a*u-o*l)*h;return r.set(1-p-x,x,p)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,ts)===null?!1:ts.x>=0&&ts.y>=0&&ts.x+ts.y<=1}static getInterpolation(t,e,i,s,r,a,o,l){return this.getBarycoord(t,e,i,s,ts)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ts.x),l.addScaledVector(a,ts.y),l.addScaledVector(o,ts.z),l)}static getInterpolatedAttribute(t,e,i,s,r,a){return _u.setScalar(0),xu.setScalar(0),vu.setScalar(0),_u.fromBufferAttribute(t,e),xu.fromBufferAttribute(t,i),vu.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(_u,r.x),a.addScaledVector(xu,r.y),a.addScaledVector(vu,r.z),a}static isFrontFacing(t,e,i,s){return Mi.subVectors(i,e),Qi.subVectors(t,e),Mi.cross(Qi).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Mi.subVectors(this.c,this.b),Qi.subVectors(this.a,this.b),Mi.cross(Qi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return n.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return n.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return n.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return n.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return n.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let i=this.a,s=this.b,r=this.c,a,o;Rr.subVectors(s,i),Pr.subVectors(r,i),pu.subVectors(t,i);let l=Rr.dot(pu),c=Pr.dot(pu);if(l<=0&&c<=0)return e.copy(i);mu.subVectors(t,s);let u=Rr.dot(mu),f=Pr.dot(mu);if(u>=0&&f<=u)return e.copy(s);let h=l*f-u*c;if(h<=0&&l>=0&&u<=0)return a=l/(l-u),e.copy(i).addScaledVector(Rr,a);gu.subVectors(t,r);let p=Rr.dot(gu),x=Pr.dot(gu);if(x>=0&&p<=x)return e.copy(r);let S=p*c-l*x;if(S<=0&&c>=0&&x<=0)return o=c/(c-x),e.copy(i).addScaledVector(Pr,o);let m=u*x-p*f;if(m<=0&&f-u>=0&&p-x>=0)return zh.subVectors(r,s),o=(f-u)/(f-u+(p-x)),e.copy(s).addScaledVector(zh,o);let g=1/(m+S+h);return a=S*g,o=h*g,e.copy(i).addScaledVector(Rr,a).addScaledVector(Pr,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Gi=class{constructor(t=new X(1/0,1/0,1/0),e=new X(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Si.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Si.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let i=Si.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Si):Si.fromBufferAttribute(r,a),Si.applyMatrix4(t.matrixWorld),this.expandByPoint(Si);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Eo.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Eo.copy(i.boundingBox)),Eo.applyMatrix4(t.matrixWorld),this.union(Eo)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Si),Si.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(ma),To.subVectors(this.max,ma),Ir.subVectors(t.a,ma),Dr.subVectors(t.b,ma),Lr.subVectors(t.c,ma),ys.subVectors(Dr,Ir),bs.subVectors(Lr,Dr),Ks.subVectors(Ir,Lr);let e=[0,-ys.z,ys.y,0,-bs.z,bs.y,0,-Ks.z,Ks.y,ys.z,0,-ys.x,bs.z,0,-bs.x,Ks.z,0,-Ks.x,-ys.y,ys.x,0,-bs.y,bs.x,0,-Ks.y,Ks.x,0];return!yu(e,Ir,Dr,Lr,To)||(e=[1,0,0,0,1,0,0,0,1],!yu(e,Ir,Dr,Lr,To))?!1:(wo.crossVectors(ys,bs),e=[wo.x,wo.y,wo.z],yu(e,Ir,Dr,Lr,To))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Si).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Si).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(es[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),es[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),es[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),es[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),es[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),es[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),es[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),es[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(es),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},es=[new X,new X,new X,new X,new X,new X,new X,new X],Si=new X,Eo=new Gi,Ir=new X,Dr=new X,Lr=new X,ys=new X,bs=new X,Ks=new X,ma=new X,To=new X,wo=new X,Qs=new X;function yu(n,t,e,i,s){for(let r=0,a=n.length-3;r<=a;r+=3){Qs.fromArray(n,r);let o=s.x*Math.abs(Qs.x)+s.y*Math.abs(Qs.y)+s.z*Math.abs(Qs.z),l=t.dot(Qs),c=e.dot(Qs),u=i.dot(Qs);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var cn=new X,Co=new Pt,p0=0,ai=class extends Ei{constructor(t,e,i=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:p0++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=Hf,this.updateRanges=[],this.gpuType=xi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Co.fromBufferAttribute(this,e),Co.applyMatrix3(t),this.setXY(e,Co.x,Co.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)cn.fromBufferAttribute(this,e),cn.applyMatrix3(t),this.setXYZ(e,cn.x,cn.y,cn.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)cn.fromBufferAttribute(this,e),cn.applyMatrix4(t),this.setXYZ(e,cn.x,cn.y,cn.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)cn.fromBufferAttribute(this,e),cn.applyNormalMatrix(t),this.setXYZ(e,cn.x,cn.y,cn.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)cn.fromBufferAttribute(this,e),cn.transformDirection(t),this.setXYZ(e,cn.x,cn.y,cn.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=zr(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=zn(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=zr(e,this.array)),e}setX(t,e){return this.normalized&&(e=zn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=zr(e,this.array)),e}setY(t,e){return this.normalized&&(e=zn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=zr(e,this.array)),e}setZ(t,e){return this.normalized&&(e=zn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=zr(e,this.array)),e}setW(t,e){return this.normalized&&(e=zn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=zn(e,this.array),i=zn(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=zn(e,this.array),i=zn(i,this.array),s=zn(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=zn(e,this.array),i=zn(i,this.array),s=zn(s,this.array),r=zn(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Pa=class extends ai{constructor(t,e,i){super(new Uint16Array(t),e,i)}};var Ia=class extends ai{constructor(t,e,i){super(new Uint32Array(t),e,i)}};var me=class extends ai{constructor(t,e,i){super(new Float32Array(t),e,i)}},m0=new Gi,ga=new X,bu=new X,as=class{constructor(t=new X,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let i=this.center;e!==void 0?i.copy(e):m0.setFromPoints(t).getCenter(i);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;ga.subVectors(t,this.center);let e=ga.lengthSq();if(e>this.radius*this.radius){let i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(ga,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(bu.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(ga.copy(t.center).add(bu)),this.expandByPoint(ga.copy(t.center).sub(bu))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},g0=0,_i=new Oe,Mu=new vn,Nr=new X,ri=new Gi,_a=new Gi,En=new X,Xe=class n extends Ei{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:g0++}),this.uuid=ur(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(km(t)?Ia:Pa)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new ge().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return _i.makeRotationFromQuaternion(t),this.applyMatrix4(_i),this}rotateX(t){return _i.makeRotationX(t),this.applyMatrix4(_i),this}rotateY(t){return _i.makeRotationY(t),this.applyMatrix4(_i),this}rotateZ(t){return _i.makeRotationZ(t),this.applyMatrix4(_i),this}translate(t,e,i){return _i.makeTranslation(t,e,i),this.applyMatrix4(_i),this}scale(t,e,i){return _i.makeScale(t,e,i),this.applyMatrix4(_i),this}lookAt(t){return Mu.lookAt(t),Mu.updateMatrix(),this.applyMatrix4(Mu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Nr).negate(),this.translate(Nr.x,Nr.y,Nr.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let i=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new me(i,3))}else{let i=Math.min(t.length,e.count);for(let s=0;s<i;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&de("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Gi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){fe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new X(-1/0,-1/0,-1/0),new X(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){let r=e[i];ri.setFromBufferAttribute(r),this.morphTargetsRelative?(En.addVectors(this.boundingBox.min,ri.min),this.boundingBox.expandByPoint(En),En.addVectors(this.boundingBox.max,ri.max),this.boundingBox.expandByPoint(En)):(this.boundingBox.expandByPoint(ri.min),this.boundingBox.expandByPoint(ri.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&fe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new as);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){fe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new X,1/0);return}if(t){let i=this.boundingSphere.center;if(ri.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];_a.setFromBufferAttribute(o),this.morphTargetsRelative?(En.addVectors(ri.min,_a.min),ri.expandByPoint(En),En.addVectors(ri.max,_a.max),ri.expandByPoint(En)):(ri.expandByPoint(_a.min),ri.expandByPoint(_a.max))}ri.getCenter(i);let s=0;for(let r=0,a=t.count;r<a;r++)En.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(En));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)En.fromBufferAttribute(o,c),l&&(Nr.fromBufferAttribute(t,c),En.add(Nr)),s=Math.max(s,i.distanceToSquared(En))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&fe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){fe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==i.count)&&(a=new ai(new Float32Array(4*i.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let y=0;y<i.count;y++)o[y]=new X,l[y]=new X;let c=new X,u=new X,f=new X,h=new Pt,p=new Pt,x=new Pt,S=new X,m=new X;function g(y,C,B){c.fromBufferAttribute(i,y),u.fromBufferAttribute(i,C),f.fromBufferAttribute(i,B),h.fromBufferAttribute(r,y),p.fromBufferAttribute(r,C),x.fromBufferAttribute(r,B),u.sub(c),f.sub(c),p.sub(h),x.sub(h);let N=1/(p.x*x.y-x.x*p.y);isFinite(N)&&(S.copy(u).multiplyScalar(x.y).addScaledVector(f,-p.y).multiplyScalar(N),m.copy(f).multiplyScalar(p.x).addScaledVector(u,-x.x).multiplyScalar(N),o[y].add(S),o[C].add(S),o[B].add(S),l[y].add(m),l[C].add(m),l[B].add(m))}let P=this.groups;P.length===0&&(P=[{start:0,count:t.count}]);for(let y=0,C=P.length;y<C;++y){let B=P[y],N=B.start,$=B.count;for(let V=N,D=N+$;V<D;V+=3)g(t.getX(V+0),t.getX(V+1),t.getX(V+2))}let O=new X,T=new X,A=new X,b=new X;function E(y){A.fromBufferAttribute(s,y),b.copy(A);let C=o[y];O.copy(C),O.sub(A.multiplyScalar(A.dot(C))).normalize(),T.crossVectors(b,C);let N=T.dot(l[y])<0?-1:1;a.setXYZW(y,O.x,O.y,O.z,N)}for(let y=0,C=P.length;y<C;++y){let B=P[y],N=B.start,$=B.count;for(let V=N,D=N+$;V<D;V+=3)E(t.getX(V+0)),E(t.getX(V+1)),E(t.getX(V+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==e.count)i=new ai(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let h=0,p=i.count;h<p;h++)i.setXYZ(h,0,0,0);let s=new X,r=new X,a=new X,o=new X,l=new X,c=new X,u=new X,f=new X;if(t)for(let h=0,p=t.count;h<p;h+=3){let x=t.getX(h+0),S=t.getX(h+1),m=t.getX(h+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,S),a.fromBufferAttribute(e,m),u.subVectors(a,r),f.subVectors(s,r),u.cross(f),o.fromBufferAttribute(i,x),l.fromBufferAttribute(i,S),c.fromBufferAttribute(i,m),o.add(u),l.add(u),c.add(u),i.setXYZ(x,o.x,o.y,o.z),i.setXYZ(S,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,p=e.count;h<p;h+=3)s.fromBufferAttribute(e,h+0),r.fromBufferAttribute(e,h+1),a.fromBufferAttribute(e,h+2),u.subVectors(a,r),f.subVectors(s,r),u.cross(f),i.setXYZ(h+0,u.x,u.y,u.z),i.setXYZ(h+1,u.x,u.y,u.z),i.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)En.fromBufferAttribute(t,e),En.normalize(),t.setXYZ(e,En.x,En.y,En.z)}toNonIndexed(){function t(o,l){let c=o.array,u=o.itemSize,f=o.normalized,h=new c.constructor(l.length*u),p=0,x=0;for(let S=0,m=l.length;S<m;S++){o.isInterleavedBufferAttribute?p=l[S]*o.data.stride+o.offset:p=l[S]*u;for(let g=0;g<u;g++)h[x++]=c[p++]}return new ai(h,u,f)}if(this.index===null)return de("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new n,i=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,i);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let u=0,f=c.length;u<f;u++){let h=c[u],p=t(h,i);l.push(p)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let i=this.attributes;for(let l in i){let c=i[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let f=0,h=c.length;f<h;f++){let p=c[f];u.push(p.toJSON(t.data))}u.length>0&&(s[l]=u,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let s=t.attributes;for(let c in s){let u=s[c];this.setAttribute(c,u.clone(e))}let r=t.morphAttributes;for(let c in r){let u=[],f=r[c];for(let h=0,p=f.length;h<p;h++)u.push(f[h].clone(e));this.morphAttributes[c]=u}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,u=a.length;c<u;c++){let f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Su=new X,_0=new X,x0=new ge,kn=class{constructor(t=new X(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){let s=Su.subVectors(i,e).cross(_0.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,i=!0){let s=t.delta(Su),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return i===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let i=e||x0.getNormalMatrix(t),s=this.coplanarPoint(Su).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},v0=0,os=class extends Ei{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:v0++}),this.uuid=ur(),this.name="",this.type="Material",this.blending=na,this.side=Ls,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Zu,this.blendDst=Ju,this.blendEquation=lr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new he(0,0,0),this.blendAlpha=0,this.depthFunc=Gr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Of,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Zo,this.stencilZFail=Zo,this.stencilZPass=Zo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let i=t[e];if(i===void 0){de(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){de(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(i.textures=r),a.length>0&&(i.images=a)}return i}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new he().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(i=>new kn().fromJSON(i))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let i=t.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new Pt().fromArray(i)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Pt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,i=null;if(e!==null){let s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var ns=new X,Au=new X,Ro=new X,Po=new X,Ss=class{constructor(t=new X,e=new X(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,ns)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=ns.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(ns.copy(this.origin).addScaledVector(this.direction,e),ns.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Au.copy(t).add(e).multiplyScalar(.5),Ro.copy(e).sub(t).normalize(),Po.copy(this.origin).sub(Au);let r=t.distanceTo(e)*.5,a=-this.direction.dot(Ro),o=Po.dot(this.direction),l=-Po.dot(Ro),c=Po.lengthSq(),u=Math.abs(1-a*a),f,h,p,x;if(u>0)if(f=a*l-o,h=a*o-l,x=r*u,f>=0)if(h>=-x)if(h<=x){let S=1/u;f*=S,h*=S,p=f*(f+a*h+2*o)+h*(a*f+h+2*l)+c}else h=r,f=Math.max(0,-(a*h+o)),p=-f*f+h*(h+2*l)+c;else h=-r,f=Math.max(0,-(a*h+o)),p=-f*f+h*(h+2*l)+c;else h<=-x?(f=Math.max(0,-(-a*r+o)),h=f>0?-r:Math.min(Math.max(-r,-l),r),p=-f*f+h*(h+2*l)+c):h<=x?(f=0,h=Math.min(Math.max(-r,-l),r),p=h*(h+2*l)+c):(f=Math.max(0,-(a*r+o)),h=f>0?r:Math.min(Math.max(-r,-l),r),p=-f*f+h*(h+2*l)+c);else h=a>0?-r:r,f=Math.max(0,-(a*h+o)),p=-f*f+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(Au).addScaledVector(Ro,h),p}intersectSphere(t,e){if(t.radius<0)return null;ns.subVectors(t.center,this.origin);let i=ns.dot(this.direction),s=ns.dot(ns)-i*i,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){let i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,a,o,l,c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,h=this.origin;return c>=0?(i=(t.min.x-h.x)*c,s=(t.max.x-h.x)*c):(i=(t.max.x-h.x)*c,s=(t.min.x-h.x)*c),u>=0?(r=(t.min.y-h.y)*u,a=(t.max.y-h.y)*u):(r=(t.max.y-h.y)*u,a=(t.min.y-h.y)*u),i>a||r>s||((r>i||isNaN(i))&&(i=r),(a<s||isNaN(s))&&(s=a),f>=0?(o=(t.min.z-h.z)*f,l=(t.max.z-h.z)*f):(o=(t.max.z-h.z)*f,l=(t.min.z-h.z)*f),i>l||o>s)||((o>i||i!==i)&&(i=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,ns)!==null}intersectTriangle(t,e,i,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,u=o.z,f=t.x-a.x,h=t.y-a.y,p=t.z-a.z,x=e.x-a.x,S=e.y-a.y,m=e.z-a.z,g=i.x-a.x,P=i.y-a.y,O=i.z-a.z,T=Math.abs(l),A=Math.abs(c),b=Math.abs(u),E,y,C,B,N,$,V,D,G,K,Z,ht;if(T>=A&&T>=b?(C=l,$=f,G=x,ht=g,l>=0?(E=c,y=u,B=h,N=p,V=S,D=m,K=P,Z=O):(E=u,y=c,B=p,N=h,V=m,D=S,K=O,Z=P)):A>=b?(C=c,$=h,G=S,ht=P,c>=0?(E=u,y=l,B=p,N=f,V=m,D=x,K=O,Z=g):(E=l,y=u,B=f,N=p,V=x,D=m,K=g,Z=O)):(C=u,$=p,G=m,ht=O,u>=0?(E=l,y=c,B=f,N=h,V=x,D=S,K=g,Z=P):(E=c,y=l,B=h,N=f,V=S,D=x,K=P,Z=g)),C===0)return null;let rt=E/C,ut=y/C,ft=1/C,et=B-rt*$,mt=N-ut*$,It=V-rt*G,Gt=D-ut*G,Jt=K-rt*ht,it=Z-ut*ht,I=Jt*Gt-it*It,L=et*it-mt*Jt,tt=It*mt-Gt*et;if(s){if(I<0||L<0||tt<0)return null}else if((I<0||L<0||tt<0)&&(I>0||L>0||tt>0))return null;let J=I+L+tt;if(J===0)return null;let xt=ft*(I*$+L*G+tt*ht);return(J>0?xt<0:xt>0)?null:this.at(xt/J,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Jn=class extends os{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new he(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new rs,this.combine=Ku,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},kh=new Oe,tr=new Ss,Io=new as,Vh=new X,Do=new X,Lo=new X,No=new X,Eu=new X,Uo=new X,Gh=new X,Oo=new X,ze=class extends vn{constructor(t=new Xe,e=new Jn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,a=i.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){Uo.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=o[l],f=r[l];u!==0&&(Eu.fromBufferAttribute(f,t),a?Uo.addScaledVector(Eu,u):Uo.addScaledVector(Eu.sub(e),u))}e.add(Uo)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Io.copy(i.boundingSphere),Io.applyMatrix4(r),tr.copy(t.ray).recast(t.near),!(Io.containsPoint(tr.origin)===!1&&(tr.intersectSphere(Io,Vh)===null||tr.origin.distanceToSquared(Vh)>(t.far-t.near)**2))&&(kh.copy(r).invert(),tr.copy(t.ray).applyMatrix4(kh),!(i.boundingBox!==null&&tr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,tr)))}_computeIntersections(t,e,i){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,h=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let x=0,S=h.length;x<S;x++){let m=h[x],g=a[m.materialIndex],P=Math.max(m.start,p.start),O=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let T=P,A=O;T<A;T+=3){let b=o.getX(T),E=o.getX(T+1),y=o.getX(T+2);s=Fo(this,g,t,i,c,u,f,b,E,y),s&&(s.faceIndex=Math.floor(T/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let x=Math.max(0,p.start),S=Math.min(o.count,p.start+p.count);for(let m=x,g=S;m<g;m+=3){let P=o.getX(m),O=o.getX(m+1),T=o.getX(m+2);s=Fo(this,a,t,i,c,u,f,P,O,T),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let x=0,S=h.length;x<S;x++){let m=h[x],g=a[m.materialIndex],P=Math.max(m.start,p.start),O=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let T=P,A=O;T<A;T+=3){let b=T,E=T+1,y=T+2;s=Fo(this,g,t,i,c,u,f,b,E,y),s&&(s.faceIndex=Math.floor(T/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{let x=Math.max(0,p.start),S=Math.min(l.count,p.start+p.count);for(let m=x,g=S;m<g;m+=3){let P=m,O=m+1,T=m+2;s=Fo(this,a,t,i,c,u,f,P,O,T),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}};function y0(n,t,e,i,s,r,a,o){let l;if(t.side===Hn?l=i.intersectTriangle(a,r,s,!0,o):l=i.intersectTriangle(s,r,a,t.side===Ls,o),l===null)return null;Oo.copy(o),Oo.applyMatrix4(n.matrixWorld);let c=e.ray.origin.distanceTo(Oo);return c<e.near||c>e.far?null:{distance:c,point:Oo.clone(),object:n}}function Fo(n,t,e,i,s,r,a,o,l,c){n.getVertexPosition(o,Do),n.getVertexPosition(l,Lo),n.getVertexPosition(c,No);let u=y0(n,t,e,i,Do,Lo,No,Gh);if(u){let f=new X;is.getBarycoord(Gh,Do,Lo,No,f),s&&(u.uv=is.getInterpolatedAttribute(s,o,l,c,f,new Pt)),r&&(u.uv1=is.getInterpolatedAttribute(r,o,l,c,f,new Pt)),a&&(u.normal=is.getInterpolatedAttribute(a,o,l,c,f,new X),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let h={a:o,b:l,c,normal:new X,materialIndex:0};is.getNormal(Do,Lo,No,h.normal),u.face=h,u.barycoord=f}return u}var Da=class extends jn{constructor(t=null,e=1,i=1,s,r,a,o,l,c=Tn,u=Tn,f,h){super(null,a,o,l,c,u,s,r,f,h),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var La=class extends ai{constructor(t,e,i,s=1){super(t,e,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Ur=new Oe,Hh=new Oe,Bo=[],Wh=new Gi,b0=new Oe,xa=new ze,va=new as,Hi=class extends ze{constructor(t,e,i){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new La(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,b0)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Gi),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Ur),Wh.copy(t.boundingBox).applyMatrix4(Ur),this.boundingBox.union(Wh)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new as),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Ur),va.copy(t.boundingSphere).applyMatrix4(Ur),this.boundingSphere.union(va)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let i=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=i.length+1,a=t*r+1;for(let o=0;o<i.length;o++)i[o]=s[a+o]}raycast(t,e){let i=this.matrixWorld,s=this.count;if(xa.geometry=this.geometry,xa.material=this.material,xa.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),va.copy(this.boundingSphere),va.applyMatrix4(i),t.ray.intersectsSphere(va)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ur),Hh.multiplyMatrices(i,Ur),xa.matrixWorld=Hh,xa.raycast(t,Bo);for(let a=0,o=Bo.length;a<o;a++){let l=Bo[a];l.instanceId=r,l.object=this,e.push(l)}Bo.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new La(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let i=e.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new Da(new Float32Array(s*this.count),s,this.count,Gl,xi));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<i.length;c++)a+=i[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(i,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},er=new as,M0=new Pt(.5,.5),zo=new X,jr=class{constructor(t=new kn,e=new kn,i=new kn,s=new kn,r=new kn,a=new kn){this.planes=[t,e,i,s,r,a]}set(t,e,i,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(i),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=Ai,i=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],u=r[4],f=r[5],h=r[6],p=r[7],x=r[8],S=r[9],m=r[10],g=r[11],P=r[12],O=r[13],T=r[14],A=r[15];if(s[0].setComponents(c-a,p-u,g-x,A-P).normalize(),s[1].setComponents(c+a,p+u,g+x,A+P).normalize(),s[2].setComponents(c+o,p+f,g+S,A+O).normalize(),s[3].setComponents(c-o,p-f,g-S,A-O).normalize(),i)s[4].setComponents(l,h,m,T).normalize(),s[5].setComponents(c-l,p-h,g-m,A-T).normalize();else if(s[4].setComponents(c-l,p-h,g-m,A-T).normalize(),e===Ai)s[5].setComponents(c+l,p+h,g+m,A+T).normalize();else if(e===Hr)s[5].setComponents(l,h,m,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),er.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),er.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(er)}intersectsSprite(t){er.center.set(0,0,0);let e=M0.distanceTo(t.center);return er.radius=.7071067811865476+e,er.applyMatrix4(t.matrixWorld),this.intersectsSphere(er)}intersectsSphere(t){let e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let i=0;i<6;i++){let s=e[i];if(zo.x=s.normal.x>0?t.max.x:t.min.x,zo.y=s.normal.y>0?t.max.y:t.min.y,zo.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(zo)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Ti=class extends os{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new he(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},ul=new X,dl=new X,$h=new Oe,ya=new Ss,ko=new as,Tu=new X,qh=new X,hl=class extends vn{constructor(t=new Xe,e=new Ti){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,i=[0];for(let s=1,r=e.count;s<r;s++)ul.fromBufferAttribute(e,s-1),dl.fromBufferAttribute(e,s),i[s]=i[s-1],i[s]+=ul.distanceTo(dl);t.setAttribute("lineDistance",new me(i,1))}else de("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),ko.copy(i.boundingSphere),ko.applyMatrix4(s),ko.radius+=r,t.ray.intersectsSphere(ko)===!1)return;$h.copy(s).invert(),ya.copy(t.ray).applyMatrix4($h);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=i.index,h=i.attributes.position;if(u!==null){let p=Math.max(0,a.start),x=Math.min(u.count,a.start+a.count);for(let S=p,m=x-1;S<m;S+=c){let g=u.getX(S),P=u.getX(S+1),O=Vo(this,t,ya,l,g,P,S);O&&e.push(O)}if(this.isLineLoop){let S=u.getX(x-1),m=u.getX(p),g=Vo(this,t,ya,l,S,m,x-1);g&&e.push(g)}}else{let p=Math.max(0,a.start),x=Math.min(h.count,a.start+a.count);for(let S=p,m=x-1;S<m;S+=c){let g=Vo(this,t,ya,l,S,S+1,S);g&&e.push(g)}if(this.isLineLoop){let S=Vo(this,t,ya,l,x-1,p,x-1);S&&e.push(S)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Vo(n,t,e,i,s,r,a){let o=n.geometry.attributes.position;if(ul.fromBufferAttribute(o,s),dl.fromBufferAttribute(o,r),e.distanceSqToSegment(ul,dl,Tu,qh)>i)return;Tu.applyMatrix4(n.matrixWorld);let c=t.ray.origin.distanceTo(Tu);if(!(c<t.near||c>t.far))return{distance:c,point:qh.clone().applyMatrix4(n.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:n}}var Xh=new X,Yh=new X,Wi=class extends hl{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,i=[];for(let s=0,r=e.count;s<r;s+=2)Xh.fromBufferAttribute(e,s),Yh.fromBufferAttribute(e,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Xh.distanceTo(Yh);t.setAttribute("lineDistance",new me(i,1))}else de("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Na=class extends jn{constructor(t=[],e=Ns,i,s,r,a,o,l,c,u){super(t,e,i,s,r,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var As=class extends jn{constructor(t,e,i=Ci,s,r,a,o=Tn,l=Tn,c,u=Vi,f=1){if(u!==Vi&&u!==Os)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:t,height:e,depth:f};super(h,s,r,a,o,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new qr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},fl=class extends As{constructor(t,e=Ci,i=Ns,s,r,a=Tn,o=Tn,l,c=Vi){let u={width:t,height:t,depth:1},f=[u,u,u,u,u,u];super(t,t,e,i,s,r,a,o,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},Ua=class extends jn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},Vn=class n extends Xe{constructor(t=1,e=1,i=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],u=[],f=[],h=0,p=0;x("z","y","x",-1,-1,i,e,t,a,r,0),x("z","y","x",1,-1,i,e,-t,a,r,1),x("x","z","y",1,1,t,i,e,s,a,2),x("x","z","y",1,-1,t,i,-e,s,a,3),x("x","y","z",1,-1,t,e,i,s,r,4),x("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new me(c,3)),this.setAttribute("normal",new me(u,3)),this.setAttribute("uv",new me(f,2));function x(S,m,g,P,O,T,A,b,E,y,C){let B=T/E,N=A/y,$=T/2,V=A/2,D=b/2,G=E+1,K=y+1,Z=0,ht=0,rt=new X;for(let ut=0;ut<K;ut++){let ft=ut*N-V;for(let et=0;et<G;et++){let mt=et*B-$;rt[S]=mt*P,rt[m]=ft*O,rt[g]=D,c.push(rt.x,rt.y,rt.z),rt[S]=0,rt[m]=0,rt[g]=b>0?1:-1,u.push(rt.x,rt.y,rt.z),f.push(et/E),f.push(1-ut/y),Z+=1}}for(let ut=0;ut<y;ut++)for(let ft=0;ft<E;ft++){let et=h+ft+G*ut,mt=h+ft+G*(ut+1),It=h+(ft+1)+G*(ut+1),Gt=h+(ft+1)+G*ut;l.push(et,mt,Gt),l.push(mt,It,Gt),ht+=6}o.addGroup(p,ht,C),p+=ht,h+=Z}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Gn=class n extends Xe{constructor(t=1,e=1,i=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let u=[],f=[],h=[],p=[],x=0,S=[],m=i/2,g=0;P(),a===!1&&(t>0&&O(!0),e>0&&O(!1)),this.setIndex(u),this.setAttribute("position",new me(f,3)),this.setAttribute("normal",new me(h,3)),this.setAttribute("uv",new me(p,2));function P(){let T=new X,A=new X,b=0,E=(e-t)/i;for(let y=0;y<=r;y++){let C=[],B=y/r,N=B*(e-t)+t;for(let $=0;$<=s;$++){let V=$/s,D=V*l+o,G=Math.sin(D),K=Math.cos(D);A.x=N*G,A.y=-B*i+m,A.z=N*K,f.push(A.x,A.y,A.z),T.set(G,E,K).normalize(),h.push(T.x,T.y,T.z),p.push(V,1-B),C.push(x++)}S.push(C)}for(let y=0;y<s;y++)for(let C=0;C<r;C++){let B=S[C][y],N=S[C+1][y],$=S[C+1][y+1],V=S[C][y+1];(t>0||C!==0)&&(u.push(B,N,V),b+=3),(e>0||C!==r-1)&&(u.push(N,$,V),b+=3)}c.addGroup(g,b,0),g+=b}function O(T){let A=x,b=new Pt,E=new X,y=0,C=T===!0?t:e,B=T===!0?1:-1;for(let $=1;$<=s;$++)f.push(0,m*B,0),h.push(0,B,0),p.push(.5,.5),x++;let N=x;for(let $=0;$<=s;$++){let D=$/s*l+o,G=Math.cos(D),K=Math.sin(D);E.x=C*K,E.y=m*B,E.z=C*G,f.push(E.x,E.y,E.z),h.push(0,B,0),b.x=G*.5+.5,b.y=K*.5*B+.5,p.push(b.x,b.y),x++}for(let $=0;$<s;$++){let V=A+$,D=N+$;T===!0?u.push(D,D+1,V):u.push(D+1,D,V),y+=3}c.addGroup(g,y,T===!0?1:2),g+=y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var Go=new X,Ho=new X,wu=new X,Wo=new is,Oa=class extends Xe{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(kr*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],u=["a","b","c"],f=new Array(3),h={},p=[];for(let x=0;x<l;x+=3){a?(c[0]=a.getX(x),c[1]=a.getX(x+1),c[2]=a.getX(x+2)):(c[0]=x,c[1]=x+1,c[2]=x+2);let{a:S,b:m,c:g}=Wo;if(S.fromBufferAttribute(o,c[0]),m.fromBufferAttribute(o,c[1]),g.fromBufferAttribute(o,c[2]),Wo.getNormal(wu),f[0]=`${Math.round(S.x*s)},${Math.round(S.y*s)},${Math.round(S.z*s)}`,f[1]=`${Math.round(m.x*s)},${Math.round(m.y*s)},${Math.round(m.z*s)}`,f[2]=`${Math.round(g.x*s)},${Math.round(g.y*s)},${Math.round(g.z*s)}`,!(f[0]===f[1]||f[1]===f[2]||f[2]===f[0]))for(let P=0;P<3;P++){let O=(P+1)%3,T=f[P],A=f[O],b=Wo[u[P]],E=Wo[u[O]],y=`${T}_${A}`,C=`${A}_${T}`;C in h&&h[C]?(wu.dot(h[C].normal)<=r&&(p.push(b.x,b.y,b.z),p.push(E.x,E.y,E.z)),h[C]=null):y in h||(h[y]={index0:c[P],index1:c[O],normal:wu.clone()})}}for(let x in h)if(h[x]){let{index0:S,index1:m}=h[x];Go.fromBufferAttribute(o,S),Ho.fromBufferAttribute(o,m),p.push(Go.x,Go.y,Go.z),p.push(Ho.x,Ho.y,Ho.z)}this.setAttribute("position",new me(p,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},oi=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){de("Curve: .getPoint() not implemented.")}getPointAt(t,e){let i=this.getUtoTmapping(t);return this.getPoint(i,e)}getPoints(t=5){let e=[];for(let i=0;i<=t;i++)e.push(this.getPoint(i/t));return e}getSpacedPoints(t=5){let e=[];for(let i=0;i<=t;i++)e.push(this.getPointAt(i/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],i,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)i=this.getPoint(a/t),r+=i.distanceTo(s),e.push(r),s=i;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let i=this.getLengths(),s=0,r=i.length,a;e?a=e:a=t*i[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=i[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,i[s]===a)return s/(r-1);let u=i[s],h=i[s+1]-u,p=(a-u)/h;return(s+p)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new Pt:new X);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){let i=this.getUtoTmapping(t);return this.getTangent(i,e)}computeFrenetFrames(t,e=!1){let i=new X,s=[],r=[],a=[],o=new X,l=new Oe;for(let p=0;p<=t;p++){let x=p/t;s[p]=this.getTangentAt(x,new X)}r[0]=new X,a[0]=new X;let c=Number.MAX_VALUE,u=Math.abs(s[0].x),f=Math.abs(s[0].y),h=Math.abs(s[0].z);u<=c&&(c=u,i.set(1,0,0)),f<=c&&(c=f,i.set(0,1,0)),h<=c&&i.set(0,0,1),o.crossVectors(s[0],i).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let p=1;p<=t;p++){if(r[p]=r[p-1].clone(),a[p]=a[p-1].clone(),o.crossVectors(s[p-1],s[p]),o.length()>Number.EPSILON){o.normalize();let x=Math.acos(Ee(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(l.makeRotationAxis(o,x))}a[p].crossVectors(s[p],r[p])}if(e===!0){let p=Math.acos(Ee(r[0].dot(r[t]),-1,1));p/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(p=-p);for(let x=1;x<=t;x++)r[x].applyMatrix4(l.makeRotationAxis(s[x],p*x)),a[x].crossVectors(s[x],r[x])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},Zr=class extends oi{constructor(t=0,e=0,i=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=i,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new Pt){let i=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),f=Math.sin(this.aRotation),h=l-this.aX,p=c-this.aY;l=h*u-p*f+this.aX,c=h*f+p*u+this.aY}return i.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},pl=class extends Zr{constructor(t,e,i,s,r,a){super(t,e,i,i,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function gd(){let n=0,t=0,e=0,i=0;function s(r,a,o,l){n=r,t=o,e=-3*r+3*a-2*o-l,i=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,u,f){let h=(a-r)/c-(o-r)/(c+u)+(o-a)/u,p=(o-a)/u-(l-a)/(u+f)+(l-o)/f;h*=u,p*=u,s(a,o,h,p)},calc:function(r){let a=r*r,o=a*r;return n+t*r+e*a+i*o}}}var jh=new X,Zh=new X,Cu=new gd,Ru=new gd,Pu=new gd,ml=class extends oi{constructor(t=[],e=!1,i="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=i,this.tension=s}getPoint(t,e=new X){let i=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,u;this.closed||o>0?c=s[(o-1)%r]:(Zh.subVectors(s[0],s[1]).add(s[0]),c=Zh);let f=s[o%r],h=s[(o+1)%r];if(this.closed||o+2<r?u=s[(o+2)%r]:(jh.subVectors(s[r-1],s[r-2]).add(s[r-1]),u=jh),this.curveType==="centripetal"||this.curveType==="chordal"){let p=this.curveType==="chordal"?.5:.25,x=Math.pow(c.distanceToSquared(f),p),S=Math.pow(f.distanceToSquared(h),p),m=Math.pow(h.distanceToSquared(u),p);S<1e-4&&(S=1),x<1e-4&&(x=S),m<1e-4&&(m=S),Cu.initNonuniformCatmullRom(c.x,f.x,h.x,u.x,x,S,m),Ru.initNonuniformCatmullRom(c.y,f.y,h.y,u.y,x,S,m),Pu.initNonuniformCatmullRom(c.z,f.z,h.z,u.z,x,S,m)}else this.curveType==="catmullrom"&&(Cu.initCatmullRom(c.x,f.x,h.x,u.x,this.tension),Ru.initCatmullRom(c.y,f.y,h.y,u.y,this.tension),Pu.initCatmullRom(c.z,f.z,h.z,u.z,this.tension));return i.set(Cu.calc(l),Ru.calc(l),Pu.calc(l)),i}copy(t){super.copy(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,i=this.points.length;e<i;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let s=t.points[e];this.points.push(new X().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function Jh(n,t,e,i,s){let r=(i-t)*.5,a=(s-e)*.5,o=n*n,l=n*o;return(2*e-2*i+r+a)*l+(-3*e+3*i-2*r-a)*o+r*n+e}function S0(n,t){let e=1-n;return e*e*t}function A0(n,t){return 2*(1-n)*n*t}function E0(n,t){return n*n*t}function Sa(n,t,e,i){return S0(n,t)+A0(n,e)+E0(n,i)}function T0(n,t){let e=1-n;return e*e*e*t}function w0(n,t){let e=1-n;return 3*e*e*n*t}function C0(n,t){return 3*(1-n)*n*n*t}function R0(n,t){return n*n*n*t}function Aa(n,t,e,i,s){return T0(n,t)+w0(n,e)+C0(n,i)+R0(n,s)}var Fa=class extends oi{constructor(t=new Pt,e=new Pt,i=new Pt,s=new Pt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=i,this.v3=s}getPoint(t,e=new Pt){let i=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return i.set(Aa(t,s.x,r.x,a.x,o.x),Aa(t,s.y,r.y,a.y,o.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},gl=class extends oi{constructor(t=new X,e=new X,i=new X,s=new X){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=i,this.v3=s}getPoint(t,e=new X){let i=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return i.set(Aa(t,s.x,r.x,a.x,o.x),Aa(t,s.y,r.y,a.y,o.y),Aa(t,s.z,r.z,a.z,o.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Ba=class extends oi{constructor(t=new Pt,e=new Pt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Pt){let i=e;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Pt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},_l=class extends oi{constructor(t=new X,e=new X){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new X){let i=e;return t===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(t).add(this.v1)),i}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new X){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},za=class extends oi{constructor(t=new Pt,e=new Pt,i=new Pt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=i}getPoint(t,e=new Pt){let i=e,s=this.v0,r=this.v1,a=this.v2;return i.set(Sa(t,s.x,r.x,a.x),Sa(t,s.y,r.y,a.y)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},xl=class extends oi{constructor(t=new X,e=new X,i=new X){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=i}getPoint(t,e=new X){let i=e,s=this.v0,r=this.v1,a=this.v2;return i.set(Sa(t,s.x,r.x,a.x),Sa(t,s.y,r.y,a.y),Sa(t,s.z,r.z,a.z)),i}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},ka=class extends oi{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Pt){let i=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],u=s[a>s.length-2?s.length-1:a+1],f=s[a>s.length-3?s.length-1:a+2];return i.set(Jh(o,l.x,c.x,u.x,f.x),Jh(o,l.y,c.y,u.y,f.y)),i}copy(t){super.copy(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,i=this.points.length;e<i;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,i=t.points.length;e<i;e++){let s=t.points[e];this.points.push(new Pt().fromArray(s))}return this}},Fu=Object.freeze({__proto__:null,ArcCurve:pl,CatmullRomCurve3:ml,CubicBezierCurve:Fa,CubicBezierCurve3:gl,EllipseCurve:Zr,LineCurve:Ba,LineCurve3:_l,QuadraticBezierCurve:za,QuadraticBezierCurve3:xl,SplineCurve:ka}),vl=class extends oi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let i=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Fu[i](e,t))}return this}getPoint(t,e){let i=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=i){let a=s[r]-i,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let i=0,s=this.curves.length;i<s;i++)e+=this.curves[i].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let i=0;i<=t;i++)e.push(this.getPoint(i/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],i;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){let u=l[c];i&&i.equals(u)||(e.push(u),i=u)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,i=t.curves.length;e<i;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,i=this.curves.length;e<i;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,i=t.curves.length;e<i;e++){let s=t.curves[e];this.curves.push(new Fu[s.type]().fromJSON(s))}return this}},Va=class extends vl{constructor(t){super(),this.type="Path",this.currentPoint=new Pt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,i=t.length;e<i;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let i=new Ba(this.currentPoint.clone(),new Pt(t,e));return this.curves.push(i),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,i,s){let r=new za(this.currentPoint.clone(),new Pt(t,e),new Pt(i,s));return this.curves.push(r),this.currentPoint.set(i,s),this}bezierCurveTo(t,e,i,s,r,a){let o=new Fa(this.currentPoint.clone(),new Pt(t,e),new Pt(i,s),new Pt(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),i=new ka(e);return this.curves.push(i),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,i,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,i,s,r,a),this}absarc(t,e,i,s,r,a){return this.absellipse(t,e,i,i,s,r,a),this}ellipse(t,e,i,s,r,a,o,l){let c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(t+c,e+u,i,s,r,a,o,l),this}absellipse(t,e,i,s,r,a,o,l){let c=new Zr(t,e,i,s,r,a,o,l);if(this.curves.length>0){let f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);let u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},ls=class extends Va{constructor(t){super(t),this.uuid=ur(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let i=0,s=this.holes.length;i<s;i++)e[i]=this.holes[i].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,i=t.holes.length;e<i;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,i=this.holes.length;e<i;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,i=t.holes.length;e<i;e++){let s=t.holes[e];this.holes.push(new Va().fromJSON(s))}return this}};function P0(n,t,e=2){let i=t&&t.length,s=i?t[0]*e:n.length,r=jf(n,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(i&&(r=U0(n,t,r,e)),n.length>80*e){o=n[0],l=n[1];let u=o,f=l;for(let h=e;h<s;h+=e){let p=n[h],x=n[h+1];p<o&&(o=p),x<l&&(l=x),p>u&&(u=p),x>f&&(f=x)}c=Math.max(u-o,f-l),c=c!==0?32767/c:0}return Ga(r,a,e,o,l,c,0),a}function jf(n,t,e,i,s){let r;if(s===q0(n,t,e,i)>0)for(let a=t;a<e;a+=i)r=Kh(a/i|0,n[a],n[a+1],r);else for(let a=e-i;a>=t;a-=i)r=Kh(a/i|0,n[a],n[a+1],r);return r&&Jr(r,r.next)&&(Wa(r),r=r.next),r}function sr(n,t){if(!n)return n;t||(t=n);let e=n,i;do if(i=!1,!e.steiner&&(Jr(e,e.next)||nn(e.prev,e,e.next)===0)){if(Wa(e),e=t=e.prev,e===e.next)break;i=!0}else e=e.next;while(i||e!==t);return t}function Ga(n,t,e,i,s,r,a){if(!n)return;!a&&r&&k0(n,i,s,r);let o=n;for(;n.prev!==n.next;){let l=n.prev,c=n.next;if(r?D0(n,i,s,r):I0(n)){t.push(l.i,n.i,c.i),Wa(n),n=c.next,o=c.next;continue}if(n=c,n===o){a?a===1?(n=L0(sr(n),t),Ga(n,t,e,i,s,r,2)):a===2&&N0(n,t,e,i,s,r):Ga(sr(n),t,e,i,s,r,1);break}}}function I0(n){let t=n.prev,e=n,i=n.next;if(nn(t,e,i)>=0)return!1;let s=t.x,r=e.x,a=i.x,o=t.y,l=e.y,c=i.y,u=Math.min(s,r,a),f=Math.min(o,l,c),h=Math.max(s,r,a),p=Math.max(o,l,c),x=i.next;for(;x!==t;){if(x.x>=u&&x.x<=h&&x.y>=f&&x.y<=p&&ba(s,o,r,l,a,c,x.x,x.y)&&nn(x.prev,x,x.next)>=0)return!1;x=x.next}return!0}function D0(n,t,e,i){let s=n.prev,r=n,a=n.next;if(nn(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,u=s.y,f=r.y,h=a.y,p=Math.min(o,l,c),x=Math.min(u,f,h),S=Math.max(o,l,c),m=Math.max(u,f,h),g=Bu(p,x,t,e,i),P=Bu(S,m,t,e,i),O=n.prevZ,T=n.nextZ;for(;O&&O.z>=g&&T&&T.z<=P;){if(O.x>=p&&O.x<=S&&O.y>=x&&O.y<=m&&O!==s&&O!==a&&ba(o,u,l,f,c,h,O.x,O.y)&&nn(O.prev,O,O.next)>=0||(O=O.prevZ,T.x>=p&&T.x<=S&&T.y>=x&&T.y<=m&&T!==s&&T!==a&&ba(o,u,l,f,c,h,T.x,T.y)&&nn(T.prev,T,T.next)>=0))return!1;T=T.nextZ}for(;O&&O.z>=g;){if(O.x>=p&&O.x<=S&&O.y>=x&&O.y<=m&&O!==s&&O!==a&&ba(o,u,l,f,c,h,O.x,O.y)&&nn(O.prev,O,O.next)>=0)return!1;O=O.prevZ}for(;T&&T.z<=P;){if(T.x>=p&&T.x<=S&&T.y>=x&&T.y<=m&&T!==s&&T!==a&&ba(o,u,l,f,c,h,T.x,T.y)&&nn(T.prev,T,T.next)>=0)return!1;T=T.nextZ}return!0}function L0(n,t){let e=n;do{let i=e.prev,s=e.next.next;!Jr(i,s)&&Jf(i,e,e.next,s)&&Ha(i,s)&&Ha(s,i)&&(t.push(i.i,e.i,s.i),Wa(e),Wa(e.next),e=n=s),e=e.next}while(e!==n);return sr(e)}function N0(n,t,e,i,s,r){let a=n;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&H0(a,o)){let l=Kf(a,o);a=sr(a,a.next),l=sr(l,l.next),Ga(a,t,e,i,s,r,0),Ga(l,t,e,i,s,r,0);return}o=o.next}a=a.next}while(a!==n)}function U0(n,t,e,i){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*i,l=r<a-1?t[r+1]*i:n.length,c=jf(n,o,l,i,!1);c===c.next&&(c.steiner=!0),s.push(G0(c))}s.sort(O0);for(let r=0;r<s.length;r++)e=F0(s[r],e);return e}function O0(n,t){let e=n.x-t.x;if(e===0&&(e=n.y-t.y,e===0)){let i=(n.next.y-n.y)/(n.next.x-n.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=i-s}return e}function F0(n,t){let e=B0(n,t);if(!e)return t;let i=Kf(e,n);return sr(i,i.next),sr(e,e.next)}function B0(n,t){let e=t,i=n.x,s=n.y,r=-1/0,a;if(Jr(n,e))return e;do{if(Jr(n,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let f=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(f<=i&&f>r&&(r=f,a=e.x<e.next.x?e:e.next,f===i))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,l=a.x,c=a.y,u=1/0;e=a;do{if(i>=e.x&&e.x>=l&&i!==e.x&&Zf(s<c?i:r,s,l,c,s<c?r:i,s,e.x,e.y)){let f=Math.abs(s-e.y)/(i-e.x);Ha(e,n)&&(f<u||f===u&&(e.x>a.x||e.x===a.x&&z0(a,e)))&&(a=e,u=f)}e=e.next}while(e!==o);return a}function z0(n,t){return nn(n.prev,n,t.prev)<0&&nn(t.next,n,n.next)<0}function k0(n,t,e,i){let s=n;do s.z===0&&(s.z=Bu(s.x,s.y,t,e,i)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==n);s.prevZ.nextZ=null,s.prevZ=null,V0(s)}function V0(n){let t,e=1;do{let i=n,s;n=null;let r=null;for(t=0;i;){t++;let a=i,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||i.z<=a.z)?(s=i,i=i.nextZ,o--):(s=a,a=a.nextZ,l--),r?r.nextZ=s:n=s,s.prevZ=r,r=s;i=a}r.nextZ=null,e*=2}while(t>1);return n}function Bu(n,t,e,i,s){return n=(n-e)*s|0,t=(t-i)*s|0,n=(n|n<<8)&16711935,n=(n|n<<4)&252645135,n=(n|n<<2)&858993459,n=(n|n<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,n|t<<1}function G0(n){let t=n,e=n;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==n);return e}function Zf(n,t,e,i,s,r,a,o){return(s-a)*(t-o)>=(n-a)*(r-o)&&(n-a)*(i-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(i-o)}function ba(n,t,e,i,s,r,a,o){return!(n===a&&t===o)&&Zf(n,t,e,i,s,r,a,o)}function H0(n,t){return n.next.i!==t.i&&n.prev.i!==t.i&&!W0(n,t)&&(Ha(n,t)&&Ha(t,n)&&$0(n,t)&&(nn(n.prev,n,t.prev)||nn(n,t.prev,t))||Jr(n,t)&&nn(n.prev,n,n.next)>0&&nn(t.prev,t,t.next)>0)}function nn(n,t,e){return(t.y-n.y)*(e.x-t.x)-(t.x-n.x)*(e.y-t.y)}function Jr(n,t){return n.x===t.x&&n.y===t.y}function Jf(n,t,e,i){let s=qo(nn(n,t,e)),r=qo(nn(n,t,i)),a=qo(nn(e,i,n)),o=qo(nn(e,i,t));return!!(s!==r&&a!==o||s===0&&$o(n,e,t)||r===0&&$o(n,i,t)||a===0&&$o(e,n,i)||o===0&&$o(e,t,i))}function $o(n,t,e){return t.x<=Math.max(n.x,e.x)&&t.x>=Math.min(n.x,e.x)&&t.y<=Math.max(n.y,e.y)&&t.y>=Math.min(n.y,e.y)}function qo(n){return n>0?1:n<0?-1:0}function W0(n,t){let e=n;do{if(e.i!==n.i&&e.next.i!==n.i&&e.i!==t.i&&e.next.i!==t.i&&Jf(e,e.next,n,t))return!0;e=e.next}while(e!==n);return!1}function Ha(n,t){return nn(n.prev,n,n.next)<0?nn(n,t,n.next)>=0&&nn(n,n.prev,t)>=0:nn(n,t,n.prev)<0||nn(n,n.next,t)<0}function $0(n,t){let e=n,i=!1,s=(n.x+t.x)/2,r=(n.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(i=!i),e=e.next;while(e!==n);return i}function Kf(n,t){let e=zu(n.i,n.x,n.y),i=zu(t.i,t.x,t.y),s=n.next,r=t.prev;return n.next=t,t.prev=n,e.next=s,s.prev=e,i.next=e,e.prev=i,r.next=i,i.prev=r,i}function Kh(n,t,e,i){let s=zu(n,t,e);return i?(s.next=i.next,s.prev=i,i.next.prev=s,i.next=s):(s.prev=s,s.next=s),s}function Wa(n){n.next.prev=n.prev,n.prev.next=n.next,n.prevZ&&(n.prevZ.nextZ=n.nextZ),n.nextZ&&(n.nextZ.prevZ=n.prevZ)}function zu(n,t,e){return{i:n,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function q0(n,t,e,i){let s=0;for(let r=t,a=e-i;r<e;r+=i)s+=(n[a]-n[r])*(n[r+1]+n[a+1]),a=r;return s}var ku=class{static triangulate(t,e,i=2){return P0(t,e,i)}},ki=class n{static area(t){let e=t.length,i=0;for(let s=e-1,r=0;r<e;s=r++)i+=t[s].x*t[r].y-t[r].x*t[s].y;return i*.5}static isClockWise(t){return n.area(t)<0}static triangulateShape(t,e){let i=[],s=[],r=[];Qh(t),tf(i,t);let a=t.length;e.forEach(Qh);for(let l=0;l<e.length;l++)s.push(a),a+=e[l].length,tf(i,e[l]);let o=ku.triangulate(i,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function Qh(n){let t=n.length;t>2&&n[t-1].equals(n[0])&&n.pop()}function tf(n,t){for(let e=0;e<t.length;e++)n.push(t[e].x),n.push(t[e].y)}var $a=class n extends Xe{constructor(t=new ls([new Pt(.5,.5),new Pt(-.5,.5),new Pt(-.5,-.5),new Pt(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let i=this,s=[],r=[];for(let o=0,l=t.length;o<l;o++){let c=t[o];a(c)}this.setAttribute("position",new me(s,3)),this.setAttribute("uv",new me(r,2)),this.computeVertexNormals();function a(o){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,u=e.steps!==void 0?e.steps:1,f=e.depth!==void 0?e.depth:1,h=e.bevelEnabled!==void 0?e.bevelEnabled:!0,p=e.bevelThickness!==void 0?e.bevelThickness:.2,x=e.bevelSize!==void 0?e.bevelSize:p-.1,S=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3,g=e.extrudePath,P=e.UVGenerator!==void 0?e.UVGenerator:X0,O,T=!1,A,b,E,y;if(g){O=g.getSpacedPoints(u),T=!0,h=!1;let at=g.isCatmullRomCurve3?g.closed:!1;A=g.computeFrenetFrames(u,at),b=new X,E=new X,y=new X}h||(m=0,p=0,x=0,S=0);let C=o.extractPoints(c),B=C.shape,N=C.holes;if(!ki.isClockWise(B)){B=B.reverse();for(let at=0,q=N.length;at<q;at++){let W=N[at];ki.isClockWise(W)&&(N[at]=W.reverse())}}function V(at){let W=10000000000000001e-36,pt=at[0];for(let St=1;St<=at.length;St++){let yt=St%at.length,ee=at[yt],re=ee.x-pt.x,Kt=ee.y-pt.y,j=re*re+Kt*Kt,Re=Math.max(Math.abs(ee.x),Math.abs(ee.y),Math.abs(pt.x),Math.abs(pt.y)),xe=W*Re*Re;if(j<=xe){at.splice(yt,1),St--;continue}pt=ee}}V(B),N.forEach(V);let D=N.length,G=B;for(let at=0;at<D;at++){let q=N[at];B=B.concat(q)}function K(at,q,W){return q||fe("ExtrudeGeometry: vec does not exist"),at.clone().addScaledVector(q,W)}let Z=B.length;function ht(at,q,W){let pt,St,yt,ee=at.x-q.x,re=at.y-q.y,Kt=W.x-at.x,j=W.y-at.y,Re=ee*ee+re*re,xe=ee*j-re*Kt;if(Math.abs(xe)>Number.EPSILON){let k=Math.sqrt(Re),M=Math.sqrt(Kt*Kt+j*j),st=q.x-re/k,dt=q.y+ee/k,_t=W.x-j/M,Ut=W.y+Kt/M,Tt=((_t-st)*j-(Ut-dt)*Kt)/(ee*j-re*Kt);pt=st+ee*Tt-at.x,St=dt+re*Tt-at.y;let vt=pt*pt+St*St;if(vt<=2)return new Pt(pt,St);yt=Math.sqrt(vt/2)}else{let k=!1;ee>Number.EPSILON?Kt>Number.EPSILON&&(k=!0):ee<-Number.EPSILON?Kt<-Number.EPSILON&&(k=!0):Math.sign(re)===Math.sign(j)&&(k=!0),k?(pt=-re,St=ee,yt=Math.sqrt(Re)):(pt=ee,St=re,yt=Math.sqrt(Re/2))}return new Pt(pt/yt,St/yt)}let rt=[];for(let at=0,q=G.length,W=q-1,pt=at+1;at<q;at++,W++,pt++)W===q&&(W=0),pt===q&&(pt=0),rt[at]=ht(G[at],G[W],G[pt]);let ut=[],ft,et=rt.concat();for(let at=0,q=D;at<q;at++){let W=N[at];ft=[];for(let pt=0,St=W.length,yt=St-1,ee=pt+1;pt<St;pt++,yt++,ee++)yt===St&&(yt=0),ee===St&&(ee=0),ft[pt]=ht(W[pt],W[yt],W[ee]);ut.push(ft),et=et.concat(ft)}let mt;if(m===0)mt=ki.triangulateShape(G,N);else{let at=[],q=[];for(let W=0;W<m;W++){let pt=W/m,St=p*Math.cos(pt*Math.PI/2),yt=x*Math.sin(pt*Math.PI/2)+S;for(let ee=0,re=G.length;ee<re;ee++){let Kt=K(G[ee],rt[ee],yt);L(Kt.x,Kt.y,-St),pt===0&&at.push(Kt)}for(let ee=0,re=D;ee<re;ee++){let Kt=N[ee];ft=ut[ee];let j=[];for(let Re=0,xe=Kt.length;Re<xe;Re++){let k=K(Kt[Re],ft[Re],yt);L(k.x,k.y,-St),pt===0&&j.push(k)}pt===0&&q.push(j)}}mt=ki.triangulateShape(at,q)}let It=mt.length,Gt=x+S;for(let at=0;at<Z;at++){let q=h?K(B[at],et[at],Gt):B[at];T?(E.copy(A.normals[0]).multiplyScalar(q.x),b.copy(A.binormals[0]).multiplyScalar(q.y),y.copy(O[0]).add(E).add(b),L(y.x,y.y,y.z)):L(q.x,q.y,0)}for(let at=1;at<=u;at++)for(let q=0;q<Z;q++){let W=h?K(B[q],et[q],Gt):B[q];T?(E.copy(A.normals[at]).multiplyScalar(W.x),b.copy(A.binormals[at]).multiplyScalar(W.y),y.copy(O[at]).add(E).add(b),L(y.x,y.y,y.z)):L(W.x,W.y,f/u*at)}for(let at=m-1;at>=0;at--){let q=at/m,W=p*Math.cos(q*Math.PI/2),pt=x*Math.sin(q*Math.PI/2)+S;for(let St=0,yt=G.length;St<yt;St++){let ee=K(G[St],rt[St],pt);L(ee.x,ee.y,f+W)}for(let St=0,yt=N.length;St<yt;St++){let ee=N[St];ft=ut[St];for(let re=0,Kt=ee.length;re<Kt;re++){let j=K(ee[re],ft[re],pt);T?L(j.x,j.y+O[u-1].y,O[u-1].x+W):L(j.x,j.y,f+W)}}}Jt(),it();function Jt(){let at=s.length/3;if(h){let q=0,W=Z*q;for(let pt=0;pt<It;pt++){let St=mt[pt];tt(St[2]+W,St[1]+W,St[0]+W)}q=u+m*2,W=Z*q;for(let pt=0;pt<It;pt++){let St=mt[pt];tt(St[0]+W,St[1]+W,St[2]+W)}}else{for(let q=0;q<It;q++){let W=mt[q];tt(W[2],W[1],W[0])}for(let q=0;q<It;q++){let W=mt[q];tt(W[0]+Z*u,W[1]+Z*u,W[2]+Z*u)}}i.addGroup(at,s.length/3-at,0)}function it(){let at=s.length/3,q=0;I(G,q),q+=G.length;for(let W=0,pt=N.length;W<pt;W++){let St=N[W];I(St,q),q+=St.length}i.addGroup(at,s.length/3-at,1)}function I(at,q){let W=at.length;for(;--W>=0;){let pt=W,St=W-1;St<0&&(St=at.length-1);for(let yt=0,ee=u+m*2;yt<ee;yt++){let re=Z*yt,Kt=Z*(yt+1),j=q+pt+re,Re=q+St+re,xe=q+St+Kt,k=q+pt+Kt;J(j,Re,xe,k)}}}function L(at,q,W){l.push(at),l.push(q),l.push(W)}function tt(at,q,W){xt(at),xt(q),xt(W);let pt=s.length/3,St=P.generateTopUV(i,s,pt-3,pt-2,pt-1);ct(St[0]),ct(St[1]),ct(St[2])}function J(at,q,W,pt){xt(at),xt(q),xt(pt),xt(q),xt(W),xt(pt);let St=s.length/3,yt=P.generateSideWallUV(i,s,St-6,St-3,St-2,St-1);ct(yt[0]),ct(yt[1]),ct(yt[3]),ct(yt[1]),ct(yt[2]),ct(yt[3])}function xt(at){s.push(l[at*3+0]),s.push(l[at*3+1]),s.push(l[at*3+2])}function ct(at){r.push(at.x),r.push(at.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,i=this.parameters.options;return Y0(e,i,t)}static fromJSON(t,e){let i=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];i.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new Fu[s.type]().fromJSON(s)),new n(i,t.options)}},X0={generateTopUV:function(n,t,e,i,s){let r=t[e*3],a=t[e*3+1],o=t[i*3],l=t[i*3+1],c=t[s*3],u=t[s*3+1];return[new Pt(r,a),new Pt(o,l),new Pt(c,u)]},generateSideWallUV:function(n,t,e,i,s,r){let a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[i*3],u=t[i*3+1],f=t[i*3+2],h=t[s*3],p=t[s*3+1],x=t[s*3+2],S=t[r*3],m=t[r*3+1],g=t[r*3+2];return Math.abs(o-u)<Math.abs(a-c)?[new Pt(a,1-l),new Pt(c,1-f),new Pt(h,1-x),new Pt(S,1-g)]:[new Pt(o,1-l),new Pt(u,1-f),new Pt(p,1-x),new Pt(m,1-g)]}};function Y0(n,t,e){if(e.shapes=[],Array.isArray(n))for(let i=0,s=n.length;i<s;i++){let r=n[i];e.shapes.push(r.uuid)}else e.shapes.push(n.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var Es=class n extends Xe{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(i),l=Math.floor(s),c=o+1,u=l+1,f=t/o,h=e/l,p=[],x=[],S=[],m=[];for(let g=0;g<u;g++){let P=g*h-a;for(let O=0;O<c;O++){let T=O*f-r;x.push(T,-P,0),S.push(0,0,1),m.push(O/o),m.push(1-g/l)}}for(let g=0;g<l;g++)for(let P=0;P<o;P++){let O=P+c*g,T=P+c*(g+1),A=P+1+c*(g+1),b=P+1+c*g;p.push(O,T,b),p.push(T,A,b)}this.setIndex(p),this.setAttribute("position",new me(x,3)),this.setAttribute("normal",new me(S,3)),this.setAttribute("uv",new me(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.widthSegments,t.heightSegments)}};var Kr=class n extends Xe{constructor(t=new ls([new Pt(0,.5),new Pt(-.5,-.5),new Pt(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let i=[],s=[],r=[],a=[],o=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let u=0;u<t.length;u++)c(t[u]),this.addGroup(o,l,u),o+=l,l=0;this.setIndex(i),this.setAttribute("position",new me(s,3)),this.setAttribute("normal",new me(r,3)),this.setAttribute("uv",new me(a,2));function c(u){let f=s.length/3,h=u.extractPoints(e),p=h.shape,x=h.holes;ki.isClockWise(p)===!1&&(p=p.reverse());for(let m=0,g=x.length;m<g;m++){let P=x[m];ki.isClockWise(P)===!0&&(x[m]=P.reverse())}let S=ki.triangulateShape(p,x);for(let m=0,g=x.length;m<g;m++){let P=x[m];p=p.concat(P)}for(let m=0,g=p.length;m<g;m++){let P=p[m];s.push(P.x,P.y,0),r.push(0,0,1),a.push(P.x,P.y)}for(let m=0,g=S.length;m<g;m++){let P=S[m],O=P[0]+f,T=P[1]+f,A=P[2]+f;i.push(O,T,A),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return j0(e,t)}static fromJSON(t,e){let i=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];i.push(a)}return new n(i,t.curveSegments)}};function j0(n,t){if(t.shapes=[],Array.isArray(n))for(let e=0,i=n.length;e<i;e++){let s=n[e];t.shapes.push(s.uuid)}else t.shapes.push(n.uuid);return t}var Ts=class n extends Xe{constructor(t=1,e=32,i=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));let l=Math.min(a+o,Math.PI),c=0,u=[],f=new X,h=new X,p=[],x=[],S=[],m=[];for(let g=0;g<=i;g++){let P=[],O=g/i,T=a+O*o,A=t*Math.cos(T),b=Math.sqrt(t*t-A*A),E=0;g===0&&a===0?E=.5/e:g===i&&l===Math.PI&&(E=-.5/e);for(let y=0;y<=e;y++){let C=y/e,B=s+C*r;f.x=-b*Math.cos(B),f.y=A,f.z=b*Math.sin(B),x.push(f.x,f.y,f.z),h.copy(f).normalize(),S.push(h.x,h.y,h.z),m.push(C+E,1-O),P.push(c++)}u.push(P)}for(let g=0;g<i;g++)for(let P=0;P<e;P++){let O=u[g][P+1],T=u[g][P],A=u[g+1][P],b=u[g+1][P+1];(g!==0||a>0)&&p.push(O,T,b),(g!==i-1||l<Math.PI)&&p.push(T,A,b)}this.setIndex(p),this.setAttribute("position",new me(x,3)),this.setAttribute("normal",new me(S,3)),this.setAttribute("uv",new me(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function dr(n){let t={};for(let e in n){t[e]={};for(let i in n[e]){let s=n[e][i];if(ef(s))s.isRenderTargetTexture?(de("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone();else if(Array.isArray(s))if(ef(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][i]=r}else t[e][i]=s.slice();else t[e][i]=s}}return t}function On(n){let t={};for(let e=0;e<n.length;e++){let i=dr(n[e]);for(let s in i)t[s]=i[s]}return t}function ef(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function Z0(n){let t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function _d(n){let t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ie.workingColorSpace}var Qf={clone:dr,merge:On},J0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,K0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,li=class extends os{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=J0,this.fragmentShader=K0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=dr(t.uniforms),this.uniformsGroups=Z0(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let i in t.uniforms){let s=t.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=e[s.value]||null;break;case"c":this.uniforms[i].value=new he().setHex(s.value);break;case"v2":this.uniforms[i].value=new Pt().fromArray(s.value);break;case"v3":this.uniforms[i].value=new X().fromArray(s.value);break;case"v4":this.uniforms[i].value=new Ke().fromArray(s.value);break;case"m3":this.uniforms[i].value=new ge().fromArray(s.value);break;case"m4":this.uniforms[i].value=new Oe().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let i in t.extensions)this.extensions[i]=t.extensions[i];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},yl=class extends li{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},un=class extends os{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new he(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Mc,this.normalScale=new Pt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new rs,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var bl=class extends os{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Nf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Ml=class extends os{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Or(n,t){return!n||n.constructor===t?n:typeof t.BYTES_PER_ELEMENT=="number"?new t(n):Array.prototype.slice.call(n)}function Iu(n){return n!==void 0&&n.inTangents!==void 0&&n.outTangents!==void 0}var ws=class{constructor(t,e,i,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(i),this.sampleValues=e,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,i=this._cachedIndex,s=e[i],r=e[i-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=i+2;;){if(s===void 0){if(t<r)break i;return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(r=s,s=e[++i],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(i=2,r=o);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=r,r=e[--i-1],t>=r)break t}a=i,i=0;break e}break n}for(;i<a;){let o=i+a>>>1;t<e[o]?a=o:i=o+1}if(s=e[i],r=e[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=i[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Sl=class extends ws{constructor(t,e,i,s){super(t,e,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Nu,endingEnd:Nu}}intervalChanged_(t,e,i){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Uu:r=t,o=2*e-i;break;case Ou:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case Uu:a=t,l=2*i-e;break;case Ou:a=1,l=i+s[1]-s[0];break;default:a=t-1,l=e}let c=(i-e)*.5,u=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-i),this._offsetPrev=r*u,this._offsetNext=a*u}interpolate_(t,e,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,u=this._offsetPrev,f=this._offsetNext,h=this._weightPrev,p=this._weightNext,x=(i-e)/(s-e),S=x*x,m=S*x,g=-h*m+2*h*S-h*x,P=(1+h)*m+(-1.5-2*h)*S+(-.5+h)*x+1,O=(-1-p)*m+(1.5+p)*S+.5*x,T=p*m-p*S;for(let A=0;A!==o;++A)r[A]=g*a[u+A]+P*a[c+A]+O*a[l+A]+T*a[f+A];return r}},Al=class extends ws{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,u=(i-e)/(s-e),f=1-u;for(let h=0;h!==o;++h)r[h]=a[c+h]*f+a[l+h]*u;return r}},El=class extends ws{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Tl=class extends ws{interpolate_(t,e,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,u=this.inTangents,f=this.outTangents;if(!u||!f){let x=(i-e)/(s-e),S=1-x;for(let m=0;m!==o;++m)r[m]=a[c+m]*S+a[l+m]*x;return r}let h=o*2,p=t-1;for(let x=0;x!==o;++x){let S=a[c+x],m=a[l+x],g=p*h+x*2,P=f[g],O=f[g+1],T=t*h+x*2,A=u[T],b=u[T+1],E=tg(i,e,P,A,s);r[x]=tp(E,S,O,b,m)}return r}};function tp(n,t,e,i,s){let r=1-n;return r*r*r*t+3*r*r*n*e+3*r*n*n*i+n*n*n*s}function Q0(n,t,e,i,s){let r=1-n;return 3*r*r*(e-t)+6*r*n*(i-e)+3*n*n*(s-i)}function tg(n,t,e,i,s){let r=(n-t)/(s-t);for(let a=0;a<8;a++){let o=tp(r,t,e,i,s)-n;if(Math.abs(o)<1e-10)break;let l=Q0(r,t,e,i,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var ci=class{constructor(t,e,i,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Or(e,this.TimeBufferType),this.values=Or(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,i;if(e.toJSON!==this.toJSON)i=e.toJSON(t);else{i={name:t.name,times:Or(t.times,Array),values:Or(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(i.interpolation=s),Iu(t.settings)&&(i.settings={inTangents:Or(t.settings.inTangents,Array),outTangents:Or(t.settings.outTangents,Array)})}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new El(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Al(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Sl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Tl(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Ea:e=this.InterpolantFactoryMethodDiscrete;break;case al:e=this.InterpolantFactoryMethodLinear;break;case jo:e=this.InterpolantFactoryMethodSmooth;break;case Lu:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return de("KeyframeTrack:",i),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ea;case this.InterpolantFactoryMethodLinear:return al;case this.InterpolantFactoryMethodSmooth:return jo;case this.InterpolantFactoryMethodBezier:return Lu}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]*=t;Iu(this.settings)&&(nf(this.settings.inTangents,t),nf(this.settings.outTangents,t))}return this}trim(t,e){let i=this.times,s=i.length,r=0,a=s-1;for(;r!==s&&i[r]<t;)++r;for(;a!==-1&&i[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=i.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(fe("KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,s=this.values,r=i.length;r===0&&(fe("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=i[o];if(typeof l=="number"&&isNaN(l)){fe("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){fe("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&Vm(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){fe("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===jo,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],u=t[o+1];if(c!==u&&(o!==1||c!==t[0]))if(s)l=!0;else{let f=o*i,h=f-i,p=f+i;for(let x=0;x!==i;++x){let S=e[f+x];if(S!==e[h+x]||S!==e[p+x]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let f=o*i,h=a*i;for(let p=0;p!==i;++p)e[h+p]=e[f+p]}++a}}if(r>0){t[a]=t[r];for(let o=r*i,l=a*i,c=0;c!==i;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*i)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),i=this.constructor,s=new i(this.name,t,e);return s.createInterpolant=this.createInterpolant,Iu(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function nf(n,t){for(let e=0,i=n.length;e!==i;e+=2)n[e]*=t}ci.prototype.ValueTypeName="";ci.prototype.TimeBufferType=Float32Array;ci.prototype.ValueBufferType=Float32Array;ci.prototype.DefaultInterpolation=al;var Cs=class extends ci{constructor(t,e,i){super(t,e,i)}};Cs.prototype.ValueTypeName="bool";Cs.prototype.ValueBufferType=Array;Cs.prototype.DefaultInterpolation=Ea;Cs.prototype.InterpolantFactoryMethodLinear=void 0;Cs.prototype.InterpolantFactoryMethodSmooth=void 0;var wl=class extends ci{constructor(t,e,i,s){super(t,e,i,s)}};wl.prototype.ValueTypeName="color";var Cl=class extends ci{constructor(t,e,i,s){super(t,e,i,s)}};Cl.prototype.ValueTypeName="number";var Rl=class extends ws{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(i-e)/(s-e),c=t*o;for(let u=c+o;c!==u;c+=4)In.slerpFlat(r,0,a,c-o,a,c,l);return r}},qa=class extends ci{constructor(t,e,i,s){super(t,e,i,s)}InterpolantFactoryMethodLinear(t){return new Rl(this.times,this.values,this.getValueSize(),t)}};qa.prototype.ValueTypeName="quaternion";qa.prototype.InterpolantFactoryMethodSmooth=void 0;var Rs=class extends ci{constructor(t,e,i){super(t,e,i)}};Rs.prototype.ValueTypeName="string";Rs.prototype.ValueBufferType=Array;Rs.prototype.DefaultInterpolation=Ea;Rs.prototype.InterpolantFactoryMethodLinear=void 0;Rs.prototype.InterpolantFactoryMethodSmooth=void 0;var Pl=class extends ci{constructor(t,e,i,s){super(t,e,i,s)}};Pl.prototype.ValueTypeName="vector";var Il=class{constructor(t,e,i){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=i,this._abortController=null,this.itemStart=function(u){o++,r===!1&&s.onStart!==void 0&&s.onStart(u,a,o),r=!0},this.itemEnd=function(u){a++,s.onProgress!==void 0&&s.onProgress(u,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,f){return c.push(u,f),this},this.removeHandler=function(u){let f=c.indexOf(u);return f!==-1&&c.splice(f,2),this},this.getHandler=function(u){for(let f=0,h=c.length;f<h;f+=2){let p=c[f],x=c[f+1];if(p.global&&(p.lastIndex=0),p.test(u))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},ep=new Il,Dl=class{constructor(t){this.manager=t!==void 0?t:ep,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let i=this;return new Promise(function(s,r){i.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Dl.DEFAULT_MATERIAL_NAME="__DEFAULT";var rr=class extends vn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new he(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},ar=class extends rr{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(vn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new he(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},Du=new Oe,sf=new X,rf=new X,Xa=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Pt(512,512),this.mapType=Kn,this.map=null,this.mapPass=null,this.matrix=new Oe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new jr,this._frameExtents=new Pt(1,1),this._viewportCount=1,this._viewports=[new Ke(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;sf.setFromMatrixPosition(t.matrixWorld),e.position.copy(sf),rf.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(rf),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,i,s){Du.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),i.setFromProjectionMatrix(Du,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Hr||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(Du)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Xo=new X,Yo=new In,Bi=new X,Ya=class extends vn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Oe,this.projectionMatrix=new Oe,this.projectionMatrixInverse=new Oe,this.coordinateSystem=Ai,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Xo,Yo,Bi),Bi.x===1&&Bi.y===1&&Bi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xo,Yo,Bi.set(1,1,1)).invert()}updateWorldMatrix(t,e,i=!1){super.updateWorldMatrix(t,e,i),this.matrixWorld.decompose(Xo,Yo,Bi),Bi.x===1&&Bi.y===1&&Bi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xo,Yo,Bi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ms=new X,af=new Pt,of=new Pt,xn=class extends Ya{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=$r*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(kr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return $r*2*Math.atan(Math.tan(kr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Ms.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ms.x,Ms.y).multiplyScalar(-t/Ms.z),Ms.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ms.x,Ms.y).multiplyScalar(-t/Ms.z)}getViewSize(t,e){return this.getViewBounds(t,af,of),e.subVectors(of,af)}setViewOffset(t,e,i,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(kr*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*i/c,s*=a.width/l,i*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Vu=class extends Xa{constructor(){super(new xn(90,1,.5,500)),this.isPointLightShadow=!0}},ja=class extends rr{constructor(t,e,i=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new Vu}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Qr=class extends Ya{constructor(t=-1,e=1,i=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=i-t,a=i+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Gu=class extends Xa{constructor(){super(new Qr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ps=class extends rr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(vn.DEFAULT_UP),this.updateMatrix(),this.target=new vn,this.shadow=new Gu}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},or=class extends rr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Fr=-90,Br=1,Ll=class extends vn{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new xn(Fr,Br,t,e);s.layers=this.layers,this.add(s);let r=new xn(Fr,Br,t,e);r.layers=this.layers,this.add(r);let a=new xn(Fr,Br,t,e);a.layers=this.layers,this.add(a);let o=new xn(Fr,Br,t,e);o.layers=this.layers,this.add(o);let l=new xn(Fr,Br,t,e);l.layers=this.layers,this.add(l);let c=new xn(Fr,Br,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[i,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===Ai)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Hr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,u]=this.children,f=t.getRenderTarget(),h=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let S=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(i,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(i,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(i,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(i,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(i,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),i.texture.generateMipmaps=S,t.setRenderTarget(i,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,u),t.setRenderTarget(f,h,p),t.xr.enabled=x,i.texture.needsPMREMUpdate=!0}},Nl=class extends xn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var xd="\\[\\]\\.:\\/",eg=new RegExp("["+xd+"]","g"),vd="[^"+xd+"]",ng="[^"+xd.replace("\\.","")+"]",ig=/((?:WC+[\/:])*)/.source.replace("WC",vd),sg=/(WCOD+)?/.source.replace("WCOD",ng),rg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",vd),ag=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",vd),og=new RegExp("^"+ig+sg+rg+ag+"$"),lg=["material","materials","bones","map"],Hu=class{constructor(t,e,i){let s=i||Ze.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(t,e)}setValue(t,e){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].unbind()}},Ze=class n{constructor(t,e,i){this.path=e,this.parsedPath=i||n.parseTrackName(e),this.node=n.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,i){return t&&t.isAnimationObjectGroup?new n.Composite(t,e,i):new n(t,e,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(eg,"")}static parseTrackName(t){let e=og.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=i.nodeName.substring(s+1);lg.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(e);if(i!==void 0)return i}if(t.children){let i=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=i(o.children);if(l)return l}return null},s=i(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)t[e++]=i[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,i=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=n.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){de("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=e.objectIndex;switch(i){case"materials":if(!t.material){fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){fe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){fe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let u=0;u<t.length;u++)if(t[u].name===c){c=u;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){fe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){fe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){fe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;fe("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ze.Composite=Hu;Ze.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ze.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ze.prototype.GetterByBindingType=[Ze.prototype._getValue_direct,Ze.prototype._getValue_array,Ze.prototype._getValue_arrayElement,Ze.prototype._getValue_toArray];Ze.prototype.SetterByBindingTypeAndVersioning=[[Ze.prototype._setValue_direct,Ze.prototype._setValue_direct_setNeedsUpdate,Ze.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_array,Ze.prototype._setValue_array_setNeedsUpdate,Ze.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_arrayElement,Ze.prototype._setValue_arrayElement_setNeedsUpdate,Ze.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ze.prototype._setValue_fromArray,Ze.prototype._setValue_fromArray_setNeedsUpdate,Ze.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var LS=new Float32Array(1);var lf=new Oe,cs=class{constructor(t,e,i=0,s=1/0){this.ray=new Ss(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new Xr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):fe("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return lf.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(lf),this}intersectObject(t,e=!0,i=[]){return Wu(t,this,i,e),i.sort(cf),i}intersectObjects(t,e=!0,i=[]){for(let s=0,r=t.length;s<r;s++)Wu(t[s],this,i,e);return i.sort(cf),i}};function cf(n,t){return n.distance-t.distance}function Wu(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){let r=n.children;for(let a=0,o=r.length;a<o;a++)Wu(r[a],t,e,!0)}}var ta=class{constructor(t=1,e=0,i=0){this.radius=t,this.phi=e,this.theta=i}set(t,e,i){return this.radius=t,this.phi=e,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Ee(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,i){return this.radius=Math.sqrt(t*t+e*e+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos(Ee(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Ed=class Ed{constructor(t,e,i,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let i=0;i<4;i++)this.elements[i]=t[i+e];return this}set(t,e,i,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=i,r[3]=s,this}};Ed.prototype.isMatrix2=!0;var $u=Ed;var Za=class extends Ei{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function yd(n,t,e,i){let s=cg(i);switch(e){case dd:return n*t;case Gl:return n*t/s.components*s.byteLength;case Hl:return n*t/s.components*s.byteLength;case Fs:return n*t*2/s.components*s.byteLength;case Wl:return n*t*2/s.components*s.byteLength;case hd:return n*t*3/s.components*s.byteLength;case vi:return n*t*4/s.components*s.byteLength;case $l:return n*t*4/s.components*s.byteLength;case to:case eo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case no:case io:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Xl:case jl:return Math.max(n,16)*Math.max(t,8)/4;case ql:case Yl:return Math.max(n,8)*Math.max(t,8)/2;case Zl:case Jl:case Ql:case tc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Kl:case so:case ec:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case nc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case ic:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case sc:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case rc:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case ac:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case oc:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case lc:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case cc:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case uc:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case dc:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case hc:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case fc:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case pc:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case mc:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case gc:case _c:case xc:return Math.ceil(n/4)*Math.ceil(t/4)*16;case vc:case yc:return Math.ceil(n/4)*Math.ceil(t/4)*8;case ro:case bc:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function cg(n){switch(n){case Kn:case od:return{byteLength:1,components:1};case ia:case ld:case Ri:return{byteLength:2,components:1};case kl:case Vl:return{byteLength:2,components:4};case Ci:case zl:case xi:return{byteLength:4,components:1};case cd:case ud:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?de("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function Sp(){let n=null,t=!1,e=null,i=null;function s(r,a){i=n.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&n!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function dg(n){let t=new WeakMap;function e(o,l){let c=o.array,u=o.usage,f=c.byteLength,h=n.createBuffer();n.bindBuffer(l,h),n.bufferData(l,c,u),o.onUploadCallback();let p;if(c instanceof Float32Array)p=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=n.HALF_FLOAT:p=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function i(o,l,c){let u=l.array,f=l.updateRanges;if(n.bindBuffer(c,o),f.length===0)n.bufferSubData(c,0,u);else{f.sort((p,x)=>p.start-x.start);let h=0;for(let p=1;p<f.length;p++){let x=f[h],S=f[p];S.start<=x.start+x.count+1?x.count=Math.max(x.count,S.start+S.count-x.start):(++h,f[h]=S)}f.length=h+1;for(let p=0,x=f.length;p<x;p++){let S=f[p];n.bufferSubData(c,S.start*u.BYTES_PER_ELEMENT,u,S.start,S.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(n.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let u=t.get(o);(!u||u.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var hg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,fg=`#ifdef USE_ALPHAHASH
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
#endif`,pg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,mg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,_g=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,xg=`#ifdef USE_AOMAP
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
#endif`,vg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,yg=`#ifdef USE_BATCHING
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
#endif`,bg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Mg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Sg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ag=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Eg=`#ifdef USE_IRIDESCENCE
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
#endif`,Tg=`#ifdef USE_BUMPMAP
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
#endif`,wg=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Cg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Rg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Pg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ig=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Dg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Lg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Ng=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Ug=`#define PI 3.141592653589793
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
} // validated`,Og=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Fg=`vec3 transformedNormal = objectNormal;
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
#endif`,Bg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,zg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,kg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Gg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Hg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Wg=`#ifdef USE_ENVMAP
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
#endif`,$g=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,qg=`#ifdef USE_ENVMAP
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
#endif`,Xg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Yg=`#ifdef USE_ENVMAP
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
#endif`,jg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Zg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Jg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Kg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Qg=`#ifdef USE_GRADIENTMAP
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
}`,t_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,e_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,n_=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,i_=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,s_=`#ifdef USE_ENVMAP
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
#endif`,r_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,a_=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,o_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,l_=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,c_=`PhysicalMaterial material;
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
#endif`,u_=`uniform sampler2D dfgLUT;
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
}`,d_=`
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
#endif`,h_=`#if defined( RE_IndirectDiffuse )
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
#endif`,f_=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,p_=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,m_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,g_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,__=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,x_=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,v_=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,y_=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,b_=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,M_=`#if defined( USE_POINTS_UV )
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
#endif`,S_=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,A_=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,E_=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,T_=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,w_=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,C_=`#ifdef USE_MORPHTARGETS
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
#endif`,R_=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,P_=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,I_=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,D_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,L_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,N_=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,U_=`#ifdef USE_NORMALMAP
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
#endif`,O_=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,F_=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,B_=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,z_=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,k_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,V_=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,G_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,H_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,W_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,$_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,q_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,X_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Y_=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,j_=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Z_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,J_=`float getShadowMask() {
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
}`,K_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Q_=`#ifdef USE_SKINNING
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
#endif`,tx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ex=`#ifdef USE_SKINNING
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
#endif`,nx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ix=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rx=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,ax=`#ifdef USE_TRANSMISSION
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
#endif`,ox=`#ifdef USE_TRANSMISSION
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
#endif`,lx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,cx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ux=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,dx=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,hx=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,fx=`uniform sampler2D t2D;
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
}`,px=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,mx=`#ifdef ENVMAP_TYPE_CUBE
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
}`,gx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,_x=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xx=`#include <common>
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
}`,vx=`#if DEPTH_PACKING == 3200
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
}`,yx=`#define DISTANCE
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
}`,bx=`#define DISTANCE
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
}`,Mx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Sx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ax=`uniform float scale;
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
}`,Ex=`uniform vec3 diffuse;
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
}`,Tx=`#include <common>
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
}`,wx=`uniform vec3 diffuse;
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
}`,Cx=`#define LAMBERT
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
}`,Rx=`#define LAMBERT
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
}`,Px=`#define MATCAP
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
}`,Ix=`#define MATCAP
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
}`,Dx=`#define NORMAL
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
}`,Lx=`#define NORMAL
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
}`,Nx=`#define PHONG
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
}`,Ux=`#define PHONG
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
}`,Ox=`#define STANDARD
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
}`,Fx=`#define STANDARD
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
}`,Bx=`#define TOON
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
}`,zx=`#define TOON
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
}`,kx=`uniform float size;
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
}`,Vx=`uniform vec3 diffuse;
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
}`,Gx=`#include <common>
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
}`,Hx=`uniform vec3 color;
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
}`,Wx=`uniform float rotation;
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
}`,$x=`uniform vec3 diffuse;
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
}`,Te={alphahash_fragment:hg,alphahash_pars_fragment:fg,alphamap_fragment:pg,alphamap_pars_fragment:mg,alphatest_fragment:gg,alphatest_pars_fragment:_g,aomap_fragment:xg,aomap_pars_fragment:vg,batching_pars_vertex:yg,batching_vertex:bg,begin_vertex:Mg,beginnormal_vertex:Sg,bsdfs:Ag,iridescence_fragment:Eg,bumpmap_pars_fragment:Tg,clipping_planes_fragment:wg,clipping_planes_pars_fragment:Cg,clipping_planes_pars_vertex:Rg,clipping_planes_vertex:Pg,color_fragment:Ig,color_pars_fragment:Dg,color_pars_vertex:Lg,color_vertex:Ng,common:Ug,cube_uv_reflection_fragment:Og,defaultnormal_vertex:Fg,displacementmap_pars_vertex:Bg,displacementmap_vertex:zg,emissivemap_fragment:kg,emissivemap_pars_fragment:Vg,colorspace_fragment:Gg,colorspace_pars_fragment:Hg,envmap_fragment:Wg,envmap_common_pars_fragment:$g,envmap_pars_fragment:qg,envmap_pars_vertex:Xg,envmap_physical_pars_fragment:s_,envmap_vertex:Yg,fog_vertex:jg,fog_pars_vertex:Zg,fog_fragment:Jg,fog_pars_fragment:Kg,gradientmap_pars_fragment:Qg,lightmap_pars_fragment:t_,lights_lambert_fragment:e_,lights_lambert_pars_fragment:n_,lights_pars_begin:i_,lights_toon_fragment:r_,lights_toon_pars_fragment:a_,lights_phong_fragment:o_,lights_phong_pars_fragment:l_,lights_physical_fragment:c_,lights_physical_pars_fragment:u_,lights_fragment_begin:d_,lights_fragment_maps:h_,lights_fragment_end:f_,lightprobes_pars_fragment:p_,logdepthbuf_fragment:m_,logdepthbuf_pars_fragment:g_,logdepthbuf_pars_vertex:__,logdepthbuf_vertex:x_,map_fragment:v_,map_pars_fragment:y_,map_particle_fragment:b_,map_particle_pars_fragment:M_,metalnessmap_fragment:S_,metalnessmap_pars_fragment:A_,morphinstance_vertex:E_,morphcolor_vertex:T_,morphnormal_vertex:w_,morphtarget_pars_vertex:C_,morphtarget_vertex:R_,normal_fragment_begin:P_,normal_fragment_maps:I_,normal_pars_fragment:D_,normal_pars_vertex:L_,normal_vertex:N_,normalmap_pars_fragment:U_,clearcoat_normal_fragment_begin:O_,clearcoat_normal_fragment_maps:F_,clearcoat_pars_fragment:B_,iridescence_pars_fragment:z_,opaque_fragment:k_,packing:V_,premultiplied_alpha_fragment:G_,project_vertex:H_,dithering_fragment:W_,dithering_pars_fragment:$_,roughnessmap_fragment:q_,roughnessmap_pars_fragment:X_,shadowmap_pars_fragment:Y_,shadowmap_pars_vertex:j_,shadowmap_vertex:Z_,shadowmask_pars_fragment:J_,skinbase_vertex:K_,skinning_pars_vertex:Q_,skinning_vertex:tx,skinnormal_vertex:ex,specularmap_fragment:nx,specularmap_pars_fragment:ix,tonemapping_fragment:sx,tonemapping_pars_fragment:rx,transmission_fragment:ax,transmission_pars_fragment:ox,uv_pars_fragment:lx,uv_pars_vertex:cx,uv_vertex:ux,worldpos_vertex:dx,background_vert:hx,background_frag:fx,backgroundCube_vert:px,backgroundCube_frag:mx,cube_vert:gx,cube_frag:_x,depth_vert:xx,depth_frag:vx,distance_vert:yx,distance_frag:bx,equirect_vert:Mx,equirect_frag:Sx,linedashed_vert:Ax,linedashed_frag:Ex,meshbasic_vert:Tx,meshbasic_frag:wx,meshlambert_vert:Cx,meshlambert_frag:Rx,meshmatcap_vert:Px,meshmatcap_frag:Ix,meshnormal_vert:Dx,meshnormal_frag:Lx,meshphong_vert:Nx,meshphong_frag:Ux,meshphysical_vert:Ox,meshphysical_frag:Fx,meshtoon_vert:Bx,meshtoon_frag:zx,points_vert:kx,points_frag:Vx,shadow_vert:Gx,shadow_frag:Hx,sprite_vert:Wx,sprite_frag:$x},Zt={common:{diffuse:{value:new he(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ge},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ge}},envmap:{envMap:{value:null},envMapRotation:{value:new ge},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ge},normalScale:{value:new Pt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new he(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new X},probesMax:{value:new X},probesResolution:{value:new X}},points:{diffuse:{value:new he(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0},uvTransform:{value:new ge}},sprite:{diffuse:{value:new he(16777215)},opacity:{value:1},center:{value:new Pt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ge},alphaMap:{value:null},alphaMapTransform:{value:new ge},alphaTest:{value:0}}},Xi={basic:{uniforms:On([Zt.common,Zt.specularmap,Zt.envmap,Zt.aomap,Zt.lightmap,Zt.fog]),vertexShader:Te.meshbasic_vert,fragmentShader:Te.meshbasic_frag},lambert:{uniforms:On([Zt.common,Zt.specularmap,Zt.envmap,Zt.aomap,Zt.lightmap,Zt.emissivemap,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,Zt.fog,Zt.lights,{emissive:{value:new he(0)},envMapIntensity:{value:1}}]),vertexShader:Te.meshlambert_vert,fragmentShader:Te.meshlambert_frag},phong:{uniforms:On([Zt.common,Zt.specularmap,Zt.envmap,Zt.aomap,Zt.lightmap,Zt.emissivemap,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,Zt.fog,Zt.lights,{emissive:{value:new he(0)},specular:{value:new he(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Te.meshphong_vert,fragmentShader:Te.meshphong_frag},standard:{uniforms:On([Zt.common,Zt.envmap,Zt.aomap,Zt.lightmap,Zt.emissivemap,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,Zt.roughnessmap,Zt.metalnessmap,Zt.fog,Zt.lights,{emissive:{value:new he(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Te.meshphysical_vert,fragmentShader:Te.meshphysical_frag},toon:{uniforms:On([Zt.common,Zt.aomap,Zt.lightmap,Zt.emissivemap,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,Zt.gradientmap,Zt.fog,Zt.lights,{emissive:{value:new he(0)}}]),vertexShader:Te.meshtoon_vert,fragmentShader:Te.meshtoon_frag},matcap:{uniforms:On([Zt.common,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,Zt.fog,{matcap:{value:null}}]),vertexShader:Te.meshmatcap_vert,fragmentShader:Te.meshmatcap_frag},points:{uniforms:On([Zt.points,Zt.fog]),vertexShader:Te.points_vert,fragmentShader:Te.points_frag},dashed:{uniforms:On([Zt.common,Zt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Te.linedashed_vert,fragmentShader:Te.linedashed_frag},depth:{uniforms:On([Zt.common,Zt.displacementmap]),vertexShader:Te.depth_vert,fragmentShader:Te.depth_frag},normal:{uniforms:On([Zt.common,Zt.bumpmap,Zt.normalmap,Zt.displacementmap,{opacity:{value:1}}]),vertexShader:Te.meshnormal_vert,fragmentShader:Te.meshnormal_frag},sprite:{uniforms:On([Zt.sprite,Zt.fog]),vertexShader:Te.sprite_vert,fragmentShader:Te.sprite_frag},background:{uniforms:{uvTransform:{value:new ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Te.background_vert,fragmentShader:Te.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ge}},vertexShader:Te.backgroundCube_vert,fragmentShader:Te.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Te.cube_vert,fragmentShader:Te.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Te.equirect_vert,fragmentShader:Te.equirect_frag},distance:{uniforms:On([Zt.common,Zt.displacementmap,{referencePosition:{value:new X},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Te.distance_vert,fragmentShader:Te.distance_frag},shadow:{uniforms:On([Zt.lights,Zt.fog,{color:{value:new he(0)},opacity:{value:1}}]),vertexShader:Te.shadow_vert,fragmentShader:Te.shadow_frag}};Xi.physical={uniforms:On([Xi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ge},clearcoatNormalScale:{value:new Pt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ge},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ge},sheen:{value:0},sheenColor:{value:new he(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ge},transmissionSamplerSize:{value:new Pt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ge},attenuationDistance:{value:0},attenuationColor:{value:new he(0)},specularColor:{value:new he(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ge},anisotropyVector:{value:new Pt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ge}}]),vertexShader:Te.meshphysical_vert,fragmentShader:Te.meshphysical_frag};var Ec={r:0,b:0,g:0},qx=new Oe,Ap=new ge;Ap.set(-1,0,0,0,1,0,0,0,1);function Xx(n,t,e,i,s,r){let a=new he(0),o=s===!0?0:1,l,c,u=null,f=0,h=null;function p(P){let O=P.isScene===!0?P.background:null;if(O&&O.isTexture){let T=P.backgroundBlurriness>0;O=t.get(O,T)}return O}function x(P){let O=!1,T=p(P);T===null?m(a,o):T&&T.isColor&&(m(T,1),O=!0);let A=n.xr.getEnvironmentBlendMode();A==="additive"?e.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(n.autoClear||O)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function S(P,O){let T=p(O);T&&(T.isCubeTexture||T.mapping===Ka)?(c===void 0&&(c=new ze(new Vn(1,1,1),new li({name:"BackgroundCubeMaterial",uniforms:dr(Xi.backgroundCube.uniforms),vertexShader:Xi.backgroundCube.vertexShader,fragmentShader:Xi.backgroundCube.fragmentShader,side:Hn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,b,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=T,c.material.uniforms.backgroundBlurriness.value=O.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=O.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(qx.makeRotationFromEuler(O.backgroundRotation)).transpose(),T.isCubeTexture&&T.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Ap),c.material.toneMapped=Ie.getTransfer(T.colorSpace)!==He,(u!==T||f!==T.version||h!==n.toneMapping)&&(c.material.needsUpdate=!0,u=T,f=T.version,h=n.toneMapping),c.layers.enableAll(),P.unshift(c,c.geometry,c.material,0,0,null)):T&&T.isTexture&&(l===void 0&&(l=new ze(new Es(2,2),new li({name:"BackgroundMaterial",uniforms:dr(Xi.background.uniforms),vertexShader:Xi.background.vertexShader,fragmentShader:Xi.background.fragmentShader,side:Ls,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=T,l.material.uniforms.backgroundIntensity.value=O.backgroundIntensity,l.material.toneMapped=Ie.getTransfer(T.colorSpace)!==He,T.matrixAutoUpdate===!0&&T.updateMatrix(),l.material.uniforms.uvTransform.value.copy(T.matrix),(u!==T||f!==T.version||h!==n.toneMapping)&&(l.material.needsUpdate=!0,u=T,f=T.version,h=n.toneMapping),l.layers.enableAll(),P.unshift(l,l.geometry,l.material,0,0,null))}function m(P,O){P.getRGB(Ec,_d(n)),e.buffers.color.setClear(Ec.r,Ec.g,Ec.b,O,r)}function g(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(P,O=1){a.set(P),o=O,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(P){o=P,m(a,o)},render:x,addToRenderList:S,dispose:g}}function Yx(n,t){let e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=h(null),r=s,a=!1;function o(N,$,V,D,G){let K=!1,Z=f(N,D,V,$);r!==Z&&(r=Z,c(r.object)),K=p(N,D,V,G),K&&x(N,D,V,G),G!==null&&t.update(G,n.ELEMENT_ARRAY_BUFFER),(K||a)&&(a=!1,T(N,$,V,D),G!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(G).buffer))}function l(){return n.createVertexArray()}function c(N){return n.bindVertexArray(N)}function u(N){return n.deleteVertexArray(N)}function f(N,$,V,D){let G=D.wireframe===!0,K=i[$.id];K===void 0&&(K={},i[$.id]=K);let Z=N.isInstancedMesh===!0?N.id:0,ht=K[Z];ht===void 0&&(ht={},K[Z]=ht);let rt=ht[V.id];rt===void 0&&(rt={},ht[V.id]=rt);let ut=rt[G];return ut===void 0&&(ut=h(l()),rt[G]=ut),ut}function h(N){let $=[],V=[],D=[];for(let G=0;G<e;G++)$[G]=0,V[G]=0,D[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:$,enabledAttributes:V,attributeDivisors:D,object:N,attributes:{},index:null}}function p(N,$,V,D){let G=r.attributes,K=$.attributes,Z=0,ht=V.getAttributes();for(let rt in ht)if(ht[rt].location>=0){let ft=G[rt],et=K[rt];if(et===void 0&&(rt==="instanceMatrix"&&N.instanceMatrix&&(et=N.instanceMatrix),rt==="instanceColor"&&N.instanceColor&&(et=N.instanceColor)),ft===void 0||ft.attribute!==et||et&&ft.data!==et.data)return!0;Z++}return r.attributesNum!==Z||r.index!==D}function x(N,$,V,D){let G={},K=$.attributes,Z=0,ht=V.getAttributes();for(let rt in ht)if(ht[rt].location>=0){let ft=K[rt];ft===void 0&&(rt==="instanceMatrix"&&N.instanceMatrix&&(ft=N.instanceMatrix),rt==="instanceColor"&&N.instanceColor&&(ft=N.instanceColor));let et={};et.attribute=ft,ft&&ft.data&&(et.data=ft.data),G[rt]=et,Z++}r.attributes=G,r.attributesNum=Z,r.index=D}function S(){let N=r.newAttributes;for(let $=0,V=N.length;$<V;$++)N[$]=0}function m(N){g(N,0)}function g(N,$){let V=r.newAttributes,D=r.enabledAttributes,G=r.attributeDivisors;V[N]=1,D[N]===0&&(n.enableVertexAttribArray(N),D[N]=1),G[N]!==$&&(n.vertexAttribDivisor(N,$),G[N]=$)}function P(){let N=r.newAttributes,$=r.enabledAttributes;for(let V=0,D=$.length;V<D;V++)$[V]!==N[V]&&(n.disableVertexAttribArray(V),$[V]=0)}function O(N,$,V,D,G,K,Z){Z===!0?n.vertexAttribIPointer(N,$,V,G,K):n.vertexAttribPointer(N,$,V,D,G,K)}function T(N,$,V,D){S();let G=D.attributes,K=V.getAttributes(),Z=$.defaultAttributeValues;for(let ht in K){let rt=K[ht];if(rt.location>=0){let ut=G[ht];if(ut===void 0&&(ht==="instanceMatrix"&&N.instanceMatrix&&(ut=N.instanceMatrix),ht==="instanceColor"&&N.instanceColor&&(ut=N.instanceColor)),ut!==void 0){let ft=ut.normalized,et=ut.itemSize,mt=t.get(ut);if(mt===void 0)continue;let It=mt.buffer,Gt=mt.type,Jt=mt.bytesPerElement,it=Gt===n.INT||Gt===n.UNSIGNED_INT||ut.gpuType===zl;if(ut.isInterleavedBufferAttribute){let I=ut.data,L=I.stride,tt=ut.offset;if(I.isInstancedInterleavedBuffer){for(let J=0;J<rt.locationSize;J++)g(rt.location+J,I.meshPerAttribute);N.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=I.meshPerAttribute*I.count)}else for(let J=0;J<rt.locationSize;J++)m(rt.location+J);n.bindBuffer(n.ARRAY_BUFFER,It);for(let J=0;J<rt.locationSize;J++)O(rt.location+J,et/rt.locationSize,Gt,ft,L*Jt,(tt+et/rt.locationSize*J)*Jt,it)}else{if(ut.isInstancedBufferAttribute){for(let I=0;I<rt.locationSize;I++)g(rt.location+I,ut.meshPerAttribute);N.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let I=0;I<rt.locationSize;I++)m(rt.location+I);n.bindBuffer(n.ARRAY_BUFFER,It);for(let I=0;I<rt.locationSize;I++)O(rt.location+I,et/rt.locationSize,Gt,ft,et*Jt,et/rt.locationSize*I*Jt,it)}}else if(Z!==void 0){let ft=Z[ht];if(ft!==void 0)switch(ft.length){case 2:n.vertexAttrib2fv(rt.location,ft);break;case 3:n.vertexAttrib3fv(rt.location,ft);break;case 4:n.vertexAttrib4fv(rt.location,ft);break;default:n.vertexAttrib1fv(rt.location,ft)}}}}P()}function A(){C();for(let N in i){let $=i[N];for(let V in $){let D=$[V];for(let G in D){let K=D[G];for(let Z in K)u(K[Z].object),delete K[Z];delete D[G]}}delete i[N]}}function b(N){if(i[N.id]===void 0)return;let $=i[N.id];for(let V in $){let D=$[V];for(let G in D){let K=D[G];for(let Z in K)u(K[Z].object),delete K[Z];delete D[G]}}delete i[N.id]}function E(N){for(let $ in i){let V=i[$];for(let D in V){let G=V[D];if(G[N.id]===void 0)continue;let K=G[N.id];for(let Z in K)u(K[Z].object),delete K[Z];delete G[N.id]}}}function y(N){for(let $ in i){let V=i[$],D=N.isInstancedMesh===!0?N.id:0,G=V[D];if(G!==void 0){for(let K in G){let Z=G[K];for(let ht in Z)u(Z[ht].object),delete Z[ht];delete G[K]}delete V[D],Object.keys(V).length===0&&delete i[$]}}}function C(){B(),a=!0,r!==s&&(r=s,c(r.object))}function B(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:C,resetDefaultState:B,dispose:A,releaseStatesOfGeometry:b,releaseStatesOfObject:y,releaseStatesOfProgram:E,initAttributes:S,enableAttribute:m,disableUnusedAttributes:P}}function jx(n,t,e){let i;function s(l){i=l}function r(l,c){n.drawArrays(i,l,c),e.update(c,i,1)}function a(l,c,u){u!==0&&(n.drawArraysInstanced(i,l,c,u),e.update(c,i,u))}function o(l,c,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,u);let h=0;for(let p=0;p<u;p++)h+=c[p];e.update(h,i,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function Zx(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let E=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(E){return!(E!==vi&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(E){let y=E===Ri&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==Kn&&E!==xi&&!y&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function l(E){if(E==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",u=l(c);u!==c&&(de("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let f=e.logarithmicDepthBuffer===!0,h=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&h===!1&&de("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let p=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),S=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),g=n.getParameter(n.MAX_VERTEX_ATTRIBS),P=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),O=n.getParameter(n.MAX_VARYING_VECTORS),T=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),A=n.getParameter(n.MAX_SAMPLES),b=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:h,maxTextures:p,maxVertexTextures:x,maxTextureSize:S,maxCubemapSize:m,maxAttributes:g,maxVertexUniforms:P,maxVaryings:O,maxFragmentUniforms:T,maxSamples:A,samples:b}}function Jx(n){let t=this,e=null,i=0,s=!1,r=!1,a=new kn,o=new ge,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,h){let p=f.length!==0||h||i!==0||s;return s=h,i=f.length,p},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,h){e=u(f,h,0)},this.setState=function(f,h,p){let x=f.clippingPlanes,S=f.clipIntersection,m=f.clipShadows,g=n.get(f);if(!s||x===null||x.length===0||r&&!m)r?u(null):c();else{let P=r?0:i,O=P*4,T=g.clippingState||null;l.value=T,T=u(x,h,O,p);for(let A=0;A!==O;++A)T[A]=e[A];g.clippingState=T,this.numIntersection=S?this.numPlanes:0,this.numPlanes+=P}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function u(f,h,p,x){let S=f!==null?f.length:0,m=null;if(S!==0){if(m=l.value,x!==!0||m===null){let g=p+S*4,P=h.matrixWorldInverse;o.getNormalMatrix(P),(m===null||m.length<g)&&(m=new Float32Array(g));for(let O=0,T=p;O!==S;++O,T+=4)a.copy(f[O]).applyMatrix4(P,o),a.normal.toArray(m,T),m[T+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=S,t.numIntersection=0,m}}var aa=4,Kx=6,Qx=20,tv=256,ao=new Qr,np=new he,Td=null,wd=0,Cd=0,Rd=!1,ev=new X,hr=new X,wc=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,i=.1,s=100,r={}){let{size:a=256,position:o=ev}=r;Td=this._renderer.getRenderTarget(),wd=this._renderer.getActiveCubeFace(),Cd=this._renderer.getActiveMipmapLevel(),Rd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,i,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rp(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=sp(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Td,wd,Cd),this._renderer.xr.enabled=Rd,t.scissorTest=!1,ra(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ns||t.mapping===cr?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Td=this._renderer.getRenderTarget(),wd=this._renderer.getActiveCubeFace(),Cd=this._renderer.getActiveMipmapLevel(),Rd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Pn,minFilter:Pn,generateMipmaps:!1,type:Ri,format:vi,colorSpace:Ta,depthBuffer:!1},s=ip(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ip(t,e,i);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=nv(r)),this._blurMaterial=sv(r,t,e),this._ggxMaterial=iv(r,t,e)}return s}_compileMaterial(t){let e=new ze(new Xe,t);this._renderer.compile(e,ao)}_sceneToCubeUV(t,e,i,s,r){let l=new xn(90,1,e,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,h=f.autoClear,p=f.toneMapping;f.getClearColor(np),f.toneMapping=wi,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ze(new Vn,new Jn({name:"PMREM.Background",side:Hn,depthWrite:!1,depthTest:!1})));let S=this._backgroundBox,m=S.material,g=!1,P=t.background;P?P.isColor&&(m.color.copy(P),t.background=null,g=!0):(m.color.copy(np),g=!0);for(let O=0;O<6;O++){let T=O%3;T===0?(l.up.set(0,c[O],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[O],r.y,r.z)):T===1?(l.up.set(0,0,c[O]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[O],r.z)):(l.up.set(0,c[O],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[O]));let A=this._cubeSize;ra(s,T*A,O>2?A:0,A,A),f.setRenderTarget(s),g&&f.render(S,l),f.render(t,l)}f.toneMapping=p,f.autoClear=h,t.background=P}_textureToCubeUV(t,e){let i=this._renderer,s=t.mapping===Ns||t.mapping===cr;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=rp()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=sp());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let l=this._cubeSize;ra(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(a,ao)}_applyPMREM(t){let e=this._renderer,i=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=i}_applyGGXFilter(t,e,i){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[i];o.material=a;let l=a.uniforms,c=i/(this._lodMeshes.length-1),u=e/(this._lodMeshes.length-1),f=Math.sqrt(c*c-u*u),h=c*1.25,p=f*h,{_lodMax:x}=this,S=this._sizeLods[i],m=3*S*(i>x-aa?i-x+aa:0),g=4*(this._cubeSize-S);l.envMap.value=t.texture,l.roughness.value=p,l.mipInt.value=x-e,ra(r,m,g,3*S,2*S),s.setRenderTarget(r),s.render(o,ao),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-i,ra(t,m,g,3*S,2*S),s.setRenderTarget(t),s.render(o,ao)}_blur(t,e,i,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,i,a),this._blurPass(r,t,i,i,a)}_blurPass(t,e,i,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-i;let u=this._sizeLods[s],f=3*u*(s>this._lodMax-aa?s-this._lodMax+aa:0),h=4*(this._cubeSize-u);ra(e,f,h,3*u,2*u),a.setRenderTarget(e),a.render(l,ao)}};function nv(n){let t=[],e=[],i=n,s=n-aa+1+Kx;for(let r=0;r<s;r++){let a=Math.pow(2,i);t.push(a);let o=1/(a-2),l=-o,c=1+o,u=[l,l,c,l,c,c,l,l,c,c,l,c],f=6,h=6,p=3,x=new Float32Array(p*h*f),S=new Float32Array(p*h*f);for(let g=0;g<f;g++){let P=g%3*2/3-1,O=g>2?0:-1,T=[P,O,0,P+2/3,O,0,P+2/3,O+1,0,P,O,0,P+2/3,O+1,0,P,O+1,0];x.set(T,p*h*g);for(let A=0;A<h;A++){let b=u[A*2]*2-1,E=u[A*2+1]*2-1;g===0?hr.set(1,E,b):g===1?hr.set(-b,1,-E):g===2?hr.set(-b,E,1):g===3?hr.set(-1,E,-b):g===4?hr.set(-b,-1,E):hr.set(b,E,-1),hr.toArray(S,(g*h+A)*p)}}let m=new Xe;m.setAttribute("position",new ai(x,p)),m.setAttribute("outputDirection",new ai(S,p)),e.push(new ze(m,null)),i>aa&&i--}return{lodMeshes:e,sizeLods:t}}function ip(n,t,e){let i=new Zn(n,t,e);return i.texture.mapping=Ka,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ra(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function iv(n,t,e){return new li({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:tv,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Rc(),fragmentShader:`

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
		`,blending:$i,depthTest:!1,depthWrite:!1})}function sv(n,t,e){return new li({name:"SphericalGaussianBlur",defines:{SAMPLES:Qx,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Rc(),fragmentShader:`

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
		`,blending:$i,depthTest:!1,depthWrite:!1})}function sp(){return new li({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Rc(),fragmentShader:`

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
		`,blending:$i,depthTest:!1,depthWrite:!1})}function rp(){return new li({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Rc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:$i,depthTest:!1,depthWrite:!1})}function Rc(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Cc=class extends Zn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new Na(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Vn(5,5,5),r=new li({name:"CubemapFromEquirect",uniforms:dr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Hn,blending:$i});r.uniforms.tEquirect.value=e;let a=new ze(s,r),o=e.minFilter;return e.minFilter===Us&&(e.minFilter=Pn),new Ll(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,i=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,i,s);t.setRenderTarget(r)}};function rv(n){let t=new WeakMap,e=new WeakMap,i=null;function s(h,p=!1){return h==null?null:p?a(h):r(h)}function r(h){if(h&&h.isTexture){let p=h.mapping;if(p===Ol||p===Fl)if(t.has(h)){let x=t.get(h).texture;return o(x,h.mapping)}else{let x=h.image;if(x&&x.height>0){let S=new Cc(x.height);return S.fromEquirectangularTexture(n,h),t.set(h,S),h.addEventListener("dispose",c),o(S.texture,h.mapping)}else return null}}return h}function a(h){if(h&&h.isTexture){let p=h.mapping,x=p===Ol||p===Fl,S=p===Ns||p===cr;if(x||S){let m=e.get(h),g=m!==void 0?m.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==g)return i===null&&(i=new wc(n)),m=x?i.fromEquirectangular(h,m):i.fromCubemap(h,m),m.texture.pmremVersion=h.pmremVersion,e.set(h,m),m.texture;if(m!==void 0)return m.texture;{let P=h.image;return x&&P&&P.height>0||S&&P&&l(P)?(i===null&&(i=new wc(n)),m=x?i.fromEquirectangular(h):i.fromCubemap(h),m.texture.pmremVersion=h.pmremVersion,e.set(h,m),h.addEventListener("dispose",u),m.texture):null}}}return h}function o(h,p){return p===Ol?h.mapping=Ns:p===Fl&&(h.mapping=cr),h}function l(h){let p=0,x=6;for(let S=0;S<x;S++)h[S]!==void 0&&p++;return p===x}function c(h){let p=h.target;p.removeEventListener("dispose",c);let x=t.get(p);x!==void 0&&(t.delete(p),x.dispose())}function u(h){let p=h.target;p.removeEventListener("dispose",u);let x=e.get(p);x!==void 0&&(e.delete(p),x.dispose())}function f(){t=new WeakMap,e=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:f}}function av(n){let t={};function e(i){if(t[i]!==void 0)return t[i];let s=n.getExtension(i);return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){let s=e(i);return s===null&&nr("WebGLRenderer: "+i+" extension not supported."),s}}}function ov(n,t,e,i){let s={},r=new WeakMap;function a(f){let h=f.target;h.index!==null&&t.remove(h.index);for(let x in h.attributes)t.remove(h.attributes[x]);h.removeEventListener("dispose",a),delete s[h.id];let p=r.get(h);p&&(t.remove(p),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,e.memory.geometries--}function o(f,h){return s[h.id]===!0||(h.addEventListener("dispose",a),s[h.id]=!0,e.memory.geometries++),h}function l(f){let h=f.attributes;for(let p in h)t.update(h[p],n.ARRAY_BUFFER)}function c(f){let h=[],p=f.index,x=f.attributes.position,S=0;if(x===void 0)return;if(p!==null){let P=p.array;S=p.version;for(let O=0,T=P.length;O<T;O+=3){let A=P[O+0],b=P[O+1],E=P[O+2];h.push(A,b,b,E,E,A)}}else{let P=x.array;S=x.version;for(let O=0,T=P.length/3-1;O<T;O+=3){let A=O+0,b=O+1,E=O+2;h.push(A,b,b,E,E,A)}}let m=new(x.count>=65535?Ia:Pa)(h,1);m.version=S;let g=r.get(f);g&&t.remove(g),r.set(f,m)}function u(f){let h=r.get(f);if(h){let p=f.index;p!==null&&h.version<p.version&&c(f)}else c(f);return r.get(f)}return{get:o,update:l,getWireframeAttribute:u}}function lv(n,t,e){let i;function s(f){i=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function l(f,h){n.drawElements(i,h,r,f*a),e.update(h,i,1)}function c(f,h,p){p!==0&&(n.drawElementsInstanced(i,h,r,f*a,p),e.update(h,i,p))}function u(f,h,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,h,0,r,f,0,p);let S=0;for(let m=0;m<p;m++)S+=h[m];e.update(S,i,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function cv(n){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(e.calls++,a){case n.TRIANGLES:e.triangles+=o*(r/3);break;case n.LINES:e.lines+=o*(r/2);break;case n.LINE_STRIP:e.lines+=o*(r-1);break;case n.LINE_LOOP:e.lines+=o*r;break;case n.POINTS:e.points+=o*r;break;default:fe("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function uv(n,t,e){let i=new WeakMap,s=new Ke;function r(a,o,l){let c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=u!==void 0?u.length:0,h=i.get(o);if(h===void 0||h.count!==f){let C=function(){E.dispose(),i.delete(o),o.removeEventListener("dispose",C)};h!==void 0&&h.texture.dispose();let p=o.morphAttributes.position!==void 0,x=o.morphAttributes.normal!==void 0,S=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],g=o.morphAttributes.normal||[],P=o.morphAttributes.color||[],O=0;p===!0&&(O=1),x===!0&&(O=2),S===!0&&(O=3);let T=o.attributes.position.count*O,A=1;T>t.maxTextureSize&&(A=Math.ceil(T/t.maxTextureSize),T=t.maxTextureSize);let b=new Float32Array(T*A*4*f),E=new Ra(b,T,A,f);E.type=xi,E.needsUpdate=!0;let y=O*4;for(let B=0;B<f;B++){let N=m[B],$=g[B],V=P[B],D=T*A*4*B;for(let G=0;G<N.count;G++){let K=G*y;p===!0&&(s.fromBufferAttribute(N,G),b[D+K+0]=s.x,b[D+K+1]=s.y,b[D+K+2]=s.z,b[D+K+3]=0),x===!0&&(s.fromBufferAttribute($,G),b[D+K+4]=s.x,b[D+K+5]=s.y,b[D+K+6]=s.z,b[D+K+7]=0),S===!0&&(s.fromBufferAttribute(V,G),b[D+K+8]=s.x,b[D+K+9]=s.y,b[D+K+10]=s.z,b[D+K+11]=V.itemSize===4?s.w:1)}}h={count:f,texture:E,size:new Pt(T,A)},i.set(o,h),o.addEventListener("dispose",C)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,e);else{let p=0;for(let S=0;S<c.length;S++)p+=c[S];let x=o.morphTargetsRelative?1:1-p;l.getUniforms().setValue(n,"morphTargetBaseInfluence",x),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",h.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",h.size)}return{update:r}}function dv(n,t,e,i,s){let r=new WeakMap;function a(c){let u=s.render.frame,f=c.geometry,h=t.get(c,f);if(r.get(h)!==u&&(t.update(h),r.set(h,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(e.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let p=c.skeleton;r.get(p)!==u&&(p.update(),r.set(p,u))}return h}function o(){r=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),i.releaseStatesOfObject(u),e.remove(u.instanceMatrix),u.instanceColor!==null&&e.remove(u.instanceColor)}return{update:a,dispose:o}}var hv={[Qu]:"LINEAR_TONE_MAPPING",[td]:"REINHARD_TONE_MAPPING",[ed]:"CINEON_TONE_MAPPING",[nd]:"ACES_FILMIC_TONE_MAPPING",[sd]:"AGX_TONE_MAPPING",[rd]:"NEUTRAL_TONE_MAPPING",[id]:"CUSTOM_TONE_MAPPING"};function fv(n,t,e,i,s,r){let a=new Zn(t,e,{type:n,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new Xe;c.setAttribute("position",new me([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new me([0,2,0,0,2,0],2));let u=new yl({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),f=new ze(c,u),h=new Qr(-1,1,1,-1,0,1),p=null,x=null,S=!1,m,g=null,P=[],O=!1;this.setSize=function(T,A){a.setSize(T,A),o!==null&&o.setSize(T,A),l!==null&&l.setSize(T,A);for(let b=0;b<P.length;b++){let E=P[b];E.setSize&&E.setSize(T,A)}},this.setEffects=function(T){P=T,O=P.length>0&&P[0].isRenderPass===!0;let A=a.width,b=a.height;P.length>0&&o===null&&(o=new Zn(A,b,{type:Ri,depthBuffer:!1,stencilBuffer:!1}),l=new Zn(A,b,{type:Ri,depthBuffer:!1,stencilBuffer:!1}));for(let E=0;E<P.length;E++){let y=P[E];y.setSize&&y.setSize(A,b)}},this.begin=function(T,A){if(S||T.toneMapping===wi&&P.length===0)return!1;if(g=A,A!==null){let b=A.width,E=A.height;(a.width!==b||a.height!==E)&&this.setSize(b,E)}return O===!1&&T.setRenderTarget(a),m=T.toneMapping,T.toneMapping=wi,!0},this.hasRenderPass=function(){return O},this.end=function(T,A){T.toneMapping=m,S=!0;let b=a,E=o;for(let y=0;y<P.length;y++){let C=P[y];C.enabled!==!1&&(C.render(T,E,b,A),C.needsSwap!==!1&&(b=E,E=E===o?l:o))}if(p!==T.outputColorSpace||x!==T.toneMapping){p=T.outputColorSpace,x=T.toneMapping,u.defines={},Ie.getTransfer(p)===He&&(u.defines.SRGB_TRANSFER="");let y=hv[x];y&&(u.defines[y]=""),u.needsUpdate=!0}u.uniforms.tDiffuse.value=b.texture,T.setRenderTarget(g),T.render(f,h),g=null,S=!1},this.isCompositing=function(){return S},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),u.dispose()}}var Ep=new jn,Dd=new As(1,1),Tp=new Ra,wp=new cl,Cp=new Na,ap=[],op=[],lp=new Float32Array(16),cp=new Float32Array(9),up=new Float32Array(4);function ca(n,t,e){let i=n[0];if(i<=0||i>0)return n;let s=t*e,r=ap[s];if(r===void 0&&(r=new Float32Array(s),ap[s]=r),t!==0){i.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,n[a].toArray(r,o)}return r}function yn(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function bn(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function Pc(n,t){let e=op[t];e===void 0&&(e=new Int32Array(t),op[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function pv(n,t){let e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function mv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(yn(e,t))return;n.uniform2fv(this.addr,t),bn(e,t)}}function gv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(yn(e,t))return;n.uniform3fv(this.addr,t),bn(e,t)}}function _v(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(yn(e,t))return;n.uniform4fv(this.addr,t),bn(e,t)}}function xv(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(yn(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),bn(e,t)}else{if(yn(e,i))return;up.set(i),n.uniformMatrix2fv(this.addr,!1,up),bn(e,i)}}function vv(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(yn(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),bn(e,t)}else{if(yn(e,i))return;cp.set(i),n.uniformMatrix3fv(this.addr,!1,cp),bn(e,i)}}function yv(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(yn(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),bn(e,t)}else{if(yn(e,i))return;lp.set(i),n.uniformMatrix4fv(this.addr,!1,lp),bn(e,i)}}function bv(n,t){let e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function Mv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(yn(e,t))return;n.uniform2iv(this.addr,t),bn(e,t)}}function Sv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(yn(e,t))return;n.uniform3iv(this.addr,t),bn(e,t)}}function Av(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(yn(e,t))return;n.uniform4iv(this.addr,t),bn(e,t)}}function Ev(n,t){let e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function Tv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(yn(e,t))return;n.uniform2uiv(this.addr,t),bn(e,t)}}function wv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(yn(e,t))return;n.uniform3uiv(this.addr,t),bn(e,t)}}function Cv(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(yn(e,t))return;n.uniform4uiv(this.addr,t),bn(e,t)}}function Rv(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(Dd.compareFunction=e.isReversedDepthBuffer()?Ac:Sc,r=Dd):r=Ep,e.setTexture2D(t||r,s)}function Pv(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||wp,s)}function Iv(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||Cp,s)}function Dv(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||Tp,s)}function Lv(n){switch(n){case 5126:return pv;case 35664:return mv;case 35665:return gv;case 35666:return _v;case 35674:return xv;case 35675:return vv;case 35676:return yv;case 5124:case 35670:return bv;case 35667:case 35671:return Mv;case 35668:case 35672:return Sv;case 35669:case 35673:return Av;case 5125:return Ev;case 36294:return Tv;case 36295:return wv;case 36296:return Cv;case 35678:case 36198:case 36298:case 36306:case 35682:return Rv;case 35679:case 36299:case 36307:return Pv;case 35680:case 36300:case 36308:case 36293:return Iv;case 36289:case 36303:case 36311:case 36292:return Dv}}function Nv(n,t){n.uniform1fv(this.addr,t)}function Uv(n,t){let e=ca(t,this.size,2);n.uniform2fv(this.addr,e)}function Ov(n,t){let e=ca(t,this.size,3);n.uniform3fv(this.addr,e)}function Fv(n,t){let e=ca(t,this.size,4);n.uniform4fv(this.addr,e)}function Bv(n,t){let e=ca(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function zv(n,t){let e=ca(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function kv(n,t){let e=ca(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function Vv(n,t){n.uniform1iv(this.addr,t)}function Gv(n,t){n.uniform2iv(this.addr,t)}function Hv(n,t){n.uniform3iv(this.addr,t)}function Wv(n,t){n.uniform4iv(this.addr,t)}function $v(n,t){n.uniform1uiv(this.addr,t)}function qv(n,t){n.uniform2uiv(this.addr,t)}function Xv(n,t){n.uniform3uiv(this.addr,t)}function Yv(n,t){n.uniform4uiv(this.addr,t)}function jv(n,t,e){let i=this.cache,s=t.length,r=Pc(e,s);yn(i,r)||(n.uniform1iv(this.addr,r),bn(i,r));let a;this.type===n.SAMPLER_2D_SHADOW?a=Dd:a=Ep;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function Zv(n,t,e){let i=this.cache,s=t.length,r=Pc(e,s);yn(i,r)||(n.uniform1iv(this.addr,r),bn(i,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||wp,r[a])}function Jv(n,t,e){let i=this.cache,s=t.length,r=Pc(e,s);yn(i,r)||(n.uniform1iv(this.addr,r),bn(i,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||Cp,r[a])}function Kv(n,t,e){let i=this.cache,s=t.length,r=Pc(e,s);yn(i,r)||(n.uniform1iv(this.addr,r),bn(i,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Tp,r[a])}function Qv(n){switch(n){case 5126:return Nv;case 35664:return Uv;case 35665:return Ov;case 35666:return Fv;case 35674:return Bv;case 35675:return zv;case 35676:return kv;case 5124:case 35670:return Vv;case 35667:case 35671:return Gv;case 35668:case 35672:return Hv;case 35669:case 35673:return Wv;case 5125:return $v;case 36294:return qv;case 36295:return Xv;case 36296:return Yv;case 35678:case 36198:case 36298:case 36306:case 35682:return jv;case 35679:case 36299:case 36307:return Zv;case 35680:case 36300:case 36308:case 36293:return Jv;case 36289:case 36303:case 36311:case 36292:return Kv}}var Ld=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=Lv(e.type)}},Nd=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Qv(e.type)}},Ud=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],i)}}},Pd=/(\w+)(\])?(\[|\.)?/g;function dp(n,t){n.seq.push(t),n.map[t.id]=t}function ty(n,t,e){let i=n.name,s=i.length;for(Pd.lastIndex=0;;){let r=Pd.exec(i),a=Pd.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){dp(e,c===void 0?new Ld(o,n,t):new Nd(o,n,t));break}else{let f=e.map[o];f===void 0&&(f=new Ud(o),dp(e,f)),e=f}}}var oa=class{constructor(t,e){this.seq=[],this.map={};let i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);ty(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,i,s){let r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){let s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=i[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let i=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&i.push(a)}return i}};function hp(n,t,e){let i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}var ey=37297,ny=0;function iy(n,t){let e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;i.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return i.join(`
`)}var fp=new ge;function sy(n){Ie._getMatrix(fp,Ie.workingColorSpace,n);let t=`mat3( ${fp.elements.map(e=>e.toFixed(4))} )`;switch(Ie.getTransfer(n)){case wa:return[t,"LinearTransferOETF"];case He:return[t,"sRGBTransferOETF"];default:return de("WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function pp(n,t,e){let i=n.getShaderParameter(t,n.COMPILE_STATUS),r=(n.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+iy(n.getShaderSource(t),o)}else return r}function ry(n,t){let e=sy(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var ay={[Qu]:"Linear",[td]:"Reinhard",[ed]:"Cineon",[nd]:"ACESFilmic",[sd]:"AgX",[rd]:"Neutral",[id]:"Custom"};function oy(n,t){let e=ay[t];return e===void 0?(de("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Tc=new X;function ly(){Ie.getLuminanceCoefficients(Tc);let n=Tc.x.toFixed(4),t=Tc.y.toFixed(4),e=Tc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function cy(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(lo).join(`
`)}function uy(n){let t=[];for(let e in n){let i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function dy(n,t){let e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=n.getActiveAttrib(t,s),a=r.name,o=1;r.type===n.FLOAT_MAT2&&(o=2),r.type===n.FLOAT_MAT3&&(o=3),r.type===n.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:n.getAttribLocation(t,a),locationSize:o}}return e}function lo(n){return n!==""}function mp(n,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function gp(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var hy=/^[ \t]*#include +<([\w\d./]+)>/gm;function Od(n){return n.replace(hy,py)}var fy=new Map;function py(n,t){let e=Te[t];if(e===void 0){let i=fy.get(t);if(i!==void 0)e=Te[i],de('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Od(e)}var my=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _p(n){return n.replace(my,gy)}function gy(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function xp(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var _y={[Ja]:"SHADOWMAP_TYPE_PCF",[ea]:"SHADOWMAP_TYPE_VSM"};function xy(n){return _y[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var vy={[Ns]:"ENVMAP_TYPE_CUBE",[cr]:"ENVMAP_TYPE_CUBE",[Ka]:"ENVMAP_TYPE_CUBE_UV"};function yy(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":vy[n.envMapMode]||"ENVMAP_TYPE_CUBE"}var by={[cr]:"ENVMAP_MODE_REFRACTION"};function My(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":by[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Sy={[Ku]:"ENVMAP_BLENDING_MULTIPLY",[If]:"ENVMAP_BLENDING_MIX",[Df]:"ENVMAP_BLENDING_ADD"};function Ay(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":Sy[n.combine]||"ENVMAP_BLENDING_NONE"}function Ey(n){let t=n.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Ty(n,t,e,i){let s=n.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=xy(e),c=yy(e),u=My(e),f=Ay(e),h=Ey(e),p=cy(e),x=uy(r),S=s.createProgram(),m,g,P=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(lo).join(`
`),m.length>0&&(m+=`
`),g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(lo).join(`
`),g.length>0&&(g+=`
`)):(m=[xp(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+u:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(lo).join(`
`),g=[xp(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+u:"",e.envMap?"#define "+f:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==wi?"#define TONE_MAPPING":"",e.toneMapping!==wi?Te.tonemapping_pars_fragment:"",e.toneMapping!==wi?oy("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Te.colorspace_pars_fragment,ry("linearToOutputTexel",e.outputColorSpace),ly(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(lo).join(`
`)),a=Od(a),a=mp(a,e),a=gp(a,e),o=Od(o),o=mp(o,e),o=gp(o,e),a=_p(a),o=_p(o),e.isRawShaderMaterial!==!0&&(P=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,g=["#define varying in",e.glslVersion===fd?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===fd?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);let O=P+m+a,T=P+g+o,A=hp(s,s.VERTEX_SHADER,O),b=hp(s,s.FRAGMENT_SHADER,T);s.attachShader(S,A),s.attachShader(S,b),e.index0AttributeName!==void 0?s.bindAttribLocation(S,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(S,0,"position"),s.linkProgram(S);function E(N){if(n.debug.checkShaderErrors){let $=s.getProgramInfoLog(S)||"",V=s.getShaderInfoLog(A)||"",D=s.getShaderInfoLog(b)||"",G=$.trim(),K=V.trim(),Z=D.trim(),ht=!0,rt=!0;if(s.getProgramParameter(S,s.LINK_STATUS)===!1)if(ht=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,S,A,b);else{let ut=pp(s,A,"vertex"),ft=pp(s,b,"fragment");fe("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(S,s.VALIDATE_STATUS)+`

Material Name: `+N.name+`
Material Type: `+N.type+`

Program Info Log: `+G+`
`+ut+`
`+ft)}else G!==""?de("WebGLProgram: Program Info Log:",G):(K===""||Z==="")&&(rt=!1);rt&&(N.diagnostics={runnable:ht,programLog:G,vertexShader:{log:K,prefix:m},fragmentShader:{log:Z,prefix:g}})}s.deleteShader(A),s.deleteShader(b),y=new oa(s,S),C=dy(s,S)}let y;this.getUniforms=function(){return y===void 0&&E(this),y};let C;this.getAttributes=function(){return C===void 0&&E(this),C};let B=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return B===!1&&(B=s.getProgramParameter(S,ey)),B},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(S),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=ny++,this.cacheKey=t,this.usedTimes=1,this.program=S,this.vertexShader=A,this.fragmentShader=b,this}var wy=0,Fd=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,i){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){let e=this.shaderCache,i=e.get(t);return i===void 0&&(i=new Bd(t),e.set(t,i)),i}},Bd=class{constructor(t){this.id=wy++,this.code=t,this.usedTimes=0}};function Cy(n){return n===Fs||n===so||n===ro}function Ry(n,t,e,i,s,r){let a=new Xr,o=new Fd,l=new Set,c=[],u=new Map,f=i.logarithmicDepthBuffer,h=i.precision,p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return l.add(y),y===0?"uv":`uv${y}`}function S(y,C,B,N,$,V){let D=N.fog,G=$.geometry,K=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?N.environment:null,Z=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,ht=t.get(y.envMap||K,Z),rt=ht&&ht.mapping===Ka?ht.image.height:null,ut=p[y.type];y.precision!==null&&(h=i.getMaxPrecision(y.precision),h!==y.precision&&de("WebGLProgram.getParameters:",y.precision,"not supported, using",h,"instead."));let ft=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,et=ft!==void 0?ft.length:0,mt=0;G.morphAttributes.position!==void 0&&(mt=1),G.morphAttributes.normal!==void 0&&(mt=2),G.morphAttributes.color!==void 0&&(mt=3);let It,Gt,Jt,it;if(ut){let Fe=Xi[ut];It=Fe.vertexShader,Gt=Fe.fragmentShader}else{It=y.vertexShader,Gt=y.fragmentShader;let Fe=o.getVertexShaderStage(y),we=o.getFragmentShaderStage(y);o.update(y,Fe,we),Jt=Fe.id,it=we.id}let I=n.getRenderTarget(),L=n.state.buffers.depth.getReversed(),tt=$.isInstancedMesh===!0,J=$.isBatchedMesh===!0,xt=!!y.map,ct=!!y.matcap,at=!!ht,q=!!y.aoMap,W=!!y.lightMap,pt=!!y.bumpMap&&y.wireframe===!1,St=!!y.normalMap,yt=!!y.displacementMap,ee=!!y.emissiveMap,re=!!y.metalnessMap,Kt=!!y.roughnessMap,j=y.anisotropy>0,Re=y.clearcoat>0,xe=y.dispersion>0,k=y.retroreflectivity>0,M=y.iridescence>0,st=y.sheen>0,dt=y.transmission>0,_t=j&&!!y.anisotropyMap,Ut=Re&&!!y.clearcoatMap,Tt=Re&&!!y.clearcoatNormalMap,vt=Re&&!!y.clearcoatRoughnessMap,bt=M&&!!y.iridescenceMap,Ht=M&&!!y.iridescenceThicknessMap,Ot=st&&!!y.sheenColorMap,qt=st&&!!y.sheenRoughnessMap,$t=!!y.specularMap,Qt=!!y.specularColorMap,le=!!y.specularIntensityMap,Bt=dt&&!!y.transmissionMap,nt=dt&&!!y.thicknessMap,Dt=!!y.gradientMap,Mt=!!y.alphaMap,kt=y.alphaTest>0,Ft=!!y.alphaHash,At=!!y.extensions,ne=wi;y.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(ne=n.toneMapping);let te={shaderID:ut,shaderType:y.type,shaderName:y.name,vertexShader:It,fragmentShader:Gt,defines:y.defines,customVertexShaderID:Jt,customFragmentShaderID:it,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:h,batching:J,batchingColor:J&&$._colorsTexture!==null,instancing:tt,instancingColor:tt&&$.instanceColor!==null,instancingMorph:tt&&$.morphTexture!==null,outputColorSpace:I===null?n.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:Ie.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:xt,matcap:ct,envMap:at,envMapMode:at&&ht.mapping,envMapCubeUVHeight:rt,aoMap:q,lightMap:W,bumpMap:pt,normalMap:St,displacementMap:yt,emissiveMap:ee,normalMapObjectSpace:St&&y.normalMapType===Uf,normalMapTangentSpace:St&&y.normalMapType===Mc,packedNormalMap:St&&y.normalMapType===Mc&&Cy(y.normalMap.format),metalnessMap:re,roughnessMap:Kt,anisotropy:j,anisotropyMap:_t,clearcoat:Re,clearcoatMap:Ut,clearcoatNormalMap:Tt,clearcoatRoughnessMap:vt,dispersion:xe,retroreflection:k,iridescence:M,iridescenceMap:bt,iridescenceThicknessMap:Ht,sheen:st,sheenColorMap:Ot,sheenRoughnessMap:qt,specularMap:$t,specularColorMap:Qt,specularIntensityMap:le,transmission:dt,transmissionMap:Bt,thicknessMap:nt,gradientMap:Dt,opaque:y.transparent===!1&&y.blending===na&&y.alphaToCoverage===!1,alphaMap:Mt,alphaTest:kt,alphaHash:Ft,combine:y.combine,mapUv:xt&&x(y.map.channel),aoMapUv:q&&x(y.aoMap.channel),lightMapUv:W&&x(y.lightMap.channel),bumpMapUv:pt&&x(y.bumpMap.channel),normalMapUv:St&&x(y.normalMap.channel),displacementMapUv:yt&&x(y.displacementMap.channel),emissiveMapUv:ee&&x(y.emissiveMap.channel),metalnessMapUv:re&&x(y.metalnessMap.channel),roughnessMapUv:Kt&&x(y.roughnessMap.channel),anisotropyMapUv:_t&&x(y.anisotropyMap.channel),clearcoatMapUv:Ut&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:Tt&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:vt&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:bt&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:Ht&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:Ot&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:qt&&x(y.sheenRoughnessMap.channel),specularMapUv:$t&&x(y.specularMap.channel),specularColorMapUv:Qt&&x(y.specularColorMap.channel),specularIntensityMapUv:le&&x(y.specularIntensityMap.channel),transmissionMapUv:Bt&&x(y.transmissionMap.channel),thicknessMapUv:nt&&x(y.thicknessMap.channel),alphaMapUv:Mt&&x(y.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(St||j),vertexNormals:!!G.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:$.isPoints===!0&&!!G.attributes.uv&&(xt||Mt),fog:!!D,useFog:y.fog===!0,fogExp2:!!D&&D.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||G.attributes.normal===void 0&&St===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:L,skinning:$.isSkinnedMesh===!0,hasPositionAttribute:G.attributes.position!==void 0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:et,morphTextureStride:mt,numSunLights:C.sun.length,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numSunLightShadows:C.sunShadowMap.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numLightProbeGrids:V.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:n.shadowMap.enabled&&B.length>0,shadowMapType:n.shadowMap.type,toneMapping:ne,decodeVideoTexture:xt&&y.map.isVideoTexture===!0&&Ie.getTransfer(y.map.colorSpace)===He,decodeVideoTextureEmissive:ee&&y.emissiveMap.isVideoTexture===!0&&Ie.getTransfer(y.emissiveMap.colorSpace)===He,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===dn,flipSided:y.side===Hn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:At&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(At&&y.extensions.multiDraw===!0||J)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return te.vertexUv1s=l.has(1),te.vertexUv2s=l.has(2),te.vertexUv3s=l.has(3),l.clear(),te}function m(y){let C=[];if(y.shaderID?C.push(y.shaderID):(C.push(y.customVertexShaderID),C.push(y.customFragmentShaderID)),y.defines!==void 0)for(let B in y.defines)C.push(B),C.push(y.defines[B]);return y.isRawShaderMaterial===!1&&(g(C,y),P(C,y),C.push(n.outputColorSpace)),C.push(y.customProgramCacheKey),C.join()}function g(y,C){y.push(C.precision),y.push(C.outputColorSpace),y.push(C.envMapMode),y.push(C.envMapCubeUVHeight),y.push(C.mapUv),y.push(C.alphaMapUv),y.push(C.lightMapUv),y.push(C.aoMapUv),y.push(C.bumpMapUv),y.push(C.normalMapUv),y.push(C.displacementMapUv),y.push(C.emissiveMapUv),y.push(C.metalnessMapUv),y.push(C.roughnessMapUv),y.push(C.anisotropyMapUv),y.push(C.clearcoatMapUv),y.push(C.clearcoatNormalMapUv),y.push(C.clearcoatRoughnessMapUv),y.push(C.iridescenceMapUv),y.push(C.iridescenceThicknessMapUv),y.push(C.sheenColorMapUv),y.push(C.sheenRoughnessMapUv),y.push(C.specularMapUv),y.push(C.specularColorMapUv),y.push(C.specularIntensityMapUv),y.push(C.transmissionMapUv),y.push(C.thicknessMapUv),y.push(C.combine),y.push(C.fogExp2),y.push(C.sizeAttenuation),y.push(C.morphTargetsCount),y.push(C.morphAttributeCount),y.push(C.numSunLights),y.push(C.numDirLights),y.push(C.numPointLights),y.push(C.numSpotLights),y.push(C.numSpotLightMaps),y.push(C.numHemiLights),y.push(C.numRectAreaLights),y.push(C.numSunLightShadows),y.push(C.numDirLightShadows),y.push(C.numPointLightShadows),y.push(C.numSpotLightShadows),y.push(C.numSpotLightShadowsWithMaps),y.push(C.numLightProbes),y.push(C.shadowMapType),y.push(C.toneMapping),y.push(C.numClippingPlanes),y.push(C.numClipIntersection),y.push(C.depthPacking)}function P(y,C){a.disableAll(),C.instancing&&a.enable(0),C.instancingColor&&a.enable(1),C.instancingMorph&&a.enable(2),C.matcap&&a.enable(3),C.envMap&&a.enable(4),C.normalMapObjectSpace&&a.enable(5),C.normalMapTangentSpace&&a.enable(6),C.clearcoat&&a.enable(7),C.iridescence&&a.enable(8),C.alphaTest&&a.enable(9),C.vertexColors&&a.enable(10),C.vertexAlphas&&a.enable(11),C.vertexUv1s&&a.enable(12),C.vertexUv2s&&a.enable(13),C.vertexUv3s&&a.enable(14),C.vertexTangents&&a.enable(15),C.anisotropy&&a.enable(16),C.alphaHash&&a.enable(17),C.batching&&a.enable(18),C.dispersion&&a.enable(19),C.retroreflection&&a.enable(24),C.batchingColor&&a.enable(20),C.gradientMap&&a.enable(21),C.packedNormalMap&&a.enable(22),C.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),C.fog&&a.enable(0),C.useFog&&a.enable(1),C.flatShading&&a.enable(2),C.logarithmicDepthBuffer&&a.enable(3),C.reversedDepthBuffer&&a.enable(4),C.skinning&&a.enable(5),C.morphTargets&&a.enable(6),C.morphNormals&&a.enable(7),C.morphColors&&a.enable(8),C.premultipliedAlpha&&a.enable(9),C.shadowMapEnabled&&a.enable(10),C.doubleSided&&a.enable(11),C.flipSided&&a.enable(12),C.useDepthPacking&&a.enable(13),C.dithering&&a.enable(14),C.transmission&&a.enable(15),C.sheen&&a.enable(16),C.opaque&&a.enable(17),C.pointsUvs&&a.enable(18),C.decodeVideoTexture&&a.enable(19),C.decodeVideoTextureEmissive&&a.enable(20),C.alphaToCoverage&&a.enable(21),C.numLightProbeGrids>0&&a.enable(22),C.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function O(y){let C=p[y.type],B;if(C){let N=Xi[C];B=Qf.clone(N.uniforms)}else B=y.uniforms;return B}function T(y,C){let B=u.get(C);return B!==void 0?++B.usedTimes:(B=new Ty(n,C,y,s),c.push(B),u.set(C,B)),B}function A(y){if(--y.usedTimes===0){let C=c.indexOf(y);c[C]=c[c.length-1],c.pop(),u.delete(y.cacheKey),y.destroy()}}function b(y){o.remove(y)}function E(){o.dispose()}return{getParameters:S,getProgramCacheKey:m,getUniforms:O,acquireProgram:T,releaseProgram:A,releaseShaderCache:b,programs:c,dispose:E}}function Py(){let n=new WeakMap;function t(a){return n.has(a)}function e(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function s(a,o,l){n.get(a)[o]=l}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function Iy(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.materialVariant!==t.materialVariant?n.materialVariant-t.materialVariant:n.z!==t.z?n.z-t.z:n.id-t.id}function vp(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function yp(){let n=[],t=0,e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function a(h){let p=0;return h.isInstancedMesh&&(p+=2),h.isSkinnedMesh&&(p+=1),p}function o(h,p,x,S,m,g){let P=n[t];return P===void 0?(P={id:h.id,object:h,geometry:p,material:x,materialVariant:a(h),groupOrder:S,renderOrder:h.renderOrder,z:m,group:g},n[t]=P):(P.id=h.id,P.object=h,P.geometry=p,P.material=x,P.materialVariant=a(h),P.groupOrder=S,P.renderOrder=h.renderOrder,P.z=m,P.group=g),t++,P}function l(h,p,x,S,m,g,P){P.reversedDepth===!0&&(m=-m);let O=o(h,p,x,S,m,g);x.transmission>0?i.push(O):x.transparent===!0?s.push(O):e.push(O)}function c(h,p,x,S,m,g){let P=o(h,p,x,S,m,g);x.transmission>0?i.unshift(P):x.transparent===!0?s.unshift(P):e.unshift(P)}function u(h,p){e.length>1&&e.sort(h||Iy),i.length>1&&i.sort(p||vp),s.length>1&&s.sort(p||vp)}function f(){for(let h=t,p=n.length;h<p;h++){let x=n[h];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:f,sort:u}}function Dy(){let n=new WeakMap;function t(i,s){let r=n.get(i),a;return r===void 0?(a=new yp,n.set(i,[a])):s>=r.length?(a=new yp,r.push(a)):a=r[s],a}function e(){n=new WeakMap}return{get:t,dispose:e}}function Ly(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new X,color:new he};break;case"SpotLight":e={position:new X,direction:new X,color:new he,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new X,color:new he,distance:0,decay:0};break;case"HemisphereLight":e={direction:new X,skyColor:new he,groundColor:new he};break;case"RectAreaLight":e={color:new he,position:new X,halfWidth:new X,halfHeight:new X};break}return n[t.id]=e,e}}}function Ny(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}var Uy=0;function Oy(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function Fy(n){let t=new Ly,e=Ny(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new X);let s=new X,r=new Oe,a=new Oe;function o(c){let u=0,f=0,h=0;for(let $=0;$<9;$++)i.probe[$].set(0,0,0);let p=0,x=0,S=0,m=0,g=0,P=0,O=0,T=0,A=0,b=0,E=0,y=0,C=0,B=0;c.sort(Oy);for(let $=0,V=c.length;$<V;$++){let D=c[$],G=D.color,K=D.intensity,Z=D.distance,ht=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===Fs?ht=D.shadow.map.texture:ht=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)u+=G.r*K,f+=G.g*K,h+=G.b*K;else if(D.isLightProbe){for(let rt=0;rt<9;rt++)i.probe[rt].addScaledVector(D.sh.coefficients[rt],K);B++}else if(D.isSunLight){let rt=t.get(D);if(rt.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let ut=D.shadow,ft=e.get(D);ft.shadowIntensity=ut.intensity,ft.shadowBias=ut.bias,ft.shadowNormalBias=ut.normalBias,ft.shadowRadius=ut.radius,ft.shadowMapSize.copy(ut.mapSize).multiply(ut.getFrameExtents()),i.sunShadow[x]=ft,i.sunShadowMap[x]=ht;let et=ut.getViewportCount();for(let mt=0;mt<et;mt++)i.sunShadowMatrix[S+mt]=ut.getMatrix(mt),i.sunShadowCascade[S+mt]=ut._cascadeData[mt];S+=et,x++}i.sun[p]=rt,p++}else if(D.isDirectionalLight){let rt=t.get(D);if(rt.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){let ut=D.shadow,ft=e.get(D);ft.shadowIntensity=ut.intensity,ft.shadowBias=ut.bias,ft.shadowNormalBias=ut.normalBias,ft.shadowRadius=ut.radius,ft.shadowMapSize=ut.mapSize,i.directionalShadow[m]=ft,i.directionalShadowMap[m]=ht,i.directionalShadowMatrix[m]=D.shadow.matrix,A++}i.directional[m]=rt,m++}else if(D.isSpotLight){let rt=t.get(D);rt.position.setFromMatrixPosition(D.matrixWorld),rt.color.copy(G).multiplyScalar(K),rt.distance=Z,rt.coneCos=Math.cos(D.angle),rt.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),rt.decay=D.decay,i.spot[P]=rt;let ut=D.shadow;if(D.map&&(i.spotLightMap[y]=D.map,y++,ut.updateMatrices(D),D.castShadow&&C++),i.spotLightMatrix[P]=ut.matrix,D.castShadow){let ft=e.get(D);ft.shadowIntensity=ut.intensity,ft.shadowBias=ut.bias,ft.shadowNormalBias=ut.normalBias,ft.shadowRadius=ut.radius,ft.shadowMapSize=ut.mapSize,i.spotShadow[P]=ft,i.spotShadowMap[P]=ht,E++}P++}else if(D.isRectAreaLight){let rt=t.get(D);rt.color.copy(G).multiplyScalar(K),rt.halfWidth.set(D.width*.5,0,0),rt.halfHeight.set(0,D.height*.5,0),i.rectArea[O]=rt,O++}else if(D.isPointLight){let rt=t.get(D);if(rt.color.copy(D.color).multiplyScalar(D.intensity),rt.distance=D.distance,rt.decay=D.decay,D.castShadow){let ut=D.shadow,ft=e.get(D);ft.shadowIntensity=ut.intensity,ft.shadowBias=ut.bias,ft.shadowNormalBias=ut.normalBias,ft.shadowRadius=ut.radius,ft.shadowMapSize=ut.mapSize,ft.shadowCameraNear=ut.camera.near,ft.shadowCameraFar=ut.camera.far,i.pointShadow[g]=ft,i.pointShadowMap[g]=ht,i.pointShadowMatrix[g]=D.shadow.matrix,b++}i.point[g]=rt,g++}else if(D.isHemisphereLight){let rt=t.get(D);rt.skyColor.copy(D.color).multiplyScalar(K),rt.groundColor.copy(D.groundColor).multiplyScalar(K),i.hemi[T]=rt,T++}}O>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Zt.LTC_FLOAT_1,i.rectAreaLTC2=Zt.LTC_FLOAT_2):(i.rectAreaLTC1=Zt.LTC_HALF_1,i.rectAreaLTC2=Zt.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=f,i.ambient[2]=h;let N=i.hash;(N.sunLength!==p||N.directionalLength!==m||N.pointLength!==g||N.spotLength!==P||N.rectAreaLength!==O||N.hemiLength!==T||N.numSunShadows!==x||N.numDirectionalShadows!==A||N.numPointShadows!==b||N.numSpotShadows!==E||N.numSpotMaps!==y||N.numLightProbes!==B)&&(i.sun.length=p,i.directional.length=m,i.spot.length=P,i.rectArea.length=O,i.point.length=g,i.hemi.length=T,i.sunShadow.length=x,i.sunShadowMap.length=x,i.sunShadowMatrix.length=S,i.sunShadowCascade.length=S,i.directionalShadow.length=A,i.directionalShadowMap.length=A,i.directionalShadowMatrix.length=A,i.pointShadow.length=b,i.pointShadowMap.length=b,i.pointShadowMatrix.length=b,i.spotShadow.length=E,i.spotShadowMap.length=E,i.spotLightMatrix.length=E+y-C,i.spotLightMap.length=y,i.numSpotLightShadowsWithMaps=C,i.numLightProbes=B,N.sunLength=p,N.directionalLength=m,N.pointLength=g,N.spotLength=P,N.rectAreaLength=O,N.hemiLength=T,N.numSunShadows=x,N.numDirectionalShadows=A,N.numPointShadows=b,N.numSpotShadows=E,N.numSpotMaps=y,N.numLightProbes=B,i.version=Uy++)}function l(c,u){let f=0,h=0,p=0,x=0,S=0,m=0,g=u.matrixWorldInverse;for(let P=0,O=c.length;P<O;P++){let T=c[P];if(T.isSunLight){let A=i.sun[f];A.direction.setFromMatrixPosition(T.matrixWorld),A.direction.transformDirection(g),f++}else if(T.isDirectionalLight){let A=i.directional[h];A.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(g),h++}else if(T.isSpotLight){let A=i.spot[x];A.position.setFromMatrixPosition(T.matrixWorld),A.position.applyMatrix4(g),A.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(g),x++}else if(T.isRectAreaLight){let A=i.rectArea[S];A.position.setFromMatrixPosition(T.matrixWorld),A.position.applyMatrix4(g),a.identity(),r.copy(T.matrixWorld),r.premultiply(g),a.extractRotation(r),A.halfWidth.set(T.width*.5,0,0),A.halfHeight.set(0,T.height*.5,0),A.halfWidth.applyMatrix4(a),A.halfHeight.applyMatrix4(a),S++}else if(T.isPointLight){let A=i.point[p];A.position.setFromMatrixPosition(T.matrixWorld),A.position.applyMatrix4(g),p++}else if(T.isHemisphereLight){let A=i.hemi[m];A.direction.setFromMatrixPosition(T.matrixWorld),A.direction.transformDirection(g),m++}}}return{setup:o,setupView:l,state:i}}function bp(n){let t=new Fy(n),e=[],i=[],s=[];function r(h){f.camera=h,e.length=0,i.length=0,s.length=0}function a(h){e.push(h)}function o(h){i.push(h)}function l(h){s.push(h)}function c(){t.setup(e)}function u(h){t.setupView(e,h)}let f={lightsArray:e,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:u,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function By(n){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new bp(n),t.set(s,[o])):r>=a.length?(o=new bp(n),a.push(o)):o=a[r],o}function i(){t=new WeakMap}return{get:e,dispose:i}}var zy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,ky=`uniform sampler2D shadow_pass;
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
}`,Vy=[new X(1,0,0),new X(-1,0,0),new X(0,1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1)],Gy=[new X(0,-1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1),new X(0,-1,0),new X(0,-1,0)],Mp=new Oe,oo=new X,Id=new X;function Hy(n,t,e){let i=new jr,s=new Pt,r=new Pt,a=new Ke,o=new bl,l=new Ml,c={},u=e.maxTextureSize,f={[Ls]:Hn,[Hn]:Ls,[dn]:dn},h=new li({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Pt},radius:{value:4}},vertexShader:zy,fragmentShader:ky}),p=h.clone();p.defines.HORIZONTAL_PASS=1;let x=new Xe;x.setAttribute("position",new ai(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let S=new ze(x,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ja;let g=this.type;this.render=function(b,E,y){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;this.type===hf&&(de("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Ja);let C=n.getRenderTarget(),B=n.getActiveCubeFace(),N=n.getActiveMipmapLevel(),$=n.state;$.setBlending($i),$.buffers.depth.getReversed()===!0?$.buffers.color.setClear(0,0,0,0):$.buffers.color.setClear(1,1,1,1),$.buffers.depth.setTest(!0),$.setScissorTest(!1);let V=g!==this.type;V&&E.traverse(function(D){D.material&&(Array.isArray(D.material)?D.material.forEach(G=>G.needsUpdate=!0):D.material.needsUpdate=!0)});for(let D=0,G=b.length;D<G;D++){let K=b[D],Z=K.shadow;if(Z===void 0){de("WebGLShadowMap:",K,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;s.copy(Z.mapSize);let ht=Z.getFrameExtents();s.multiply(ht),r.copy(Z.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/ht.x),s.x=r.x*ht.x,Z.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/ht.y),s.y=r.y*ht.y,Z.mapSize.y=r.y));let rt=n.state.buffers.depth.getReversed();if(Z.camera._reversedDepth=rt,Z.map===null||V===!0){if(Z.map!==null&&(Z.map.depthTexture!==null&&(Z.map.depthTexture.dispose(),Z.map.depthTexture=null),Z.map.dispose()),this.type===ea){if(K.isPointLight){de("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Z.map=new Zn(s.x,s.y,{format:Fs,type:Ri,minFilter:Pn,magFilter:Pn,generateMipmaps:!1}),Z.map.texture.name=K.name+".shadowMap",Z.map.depthTexture=new As(s.x,s.y,xi),Z.map.depthTexture.name=K.name+".shadowMapDepth",Z.map.depthTexture.format=Vi,Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Tn,Z.map.depthTexture.magFilter=Tn}else K.isPointLight?(Z.map=new Cc(s.x),Z.map.depthTexture=new fl(s.x,Ci)):(Z.map=new Zn(s.x,s.y),Z.map.depthTexture=new As(s.x,s.y,Ci)),Z.map.depthTexture.name=K.name+".shadowMap",Z.map.depthTexture.format=Vi,this.type===Ja?(Z.map.depthTexture.compareFunction=rt?Ac:Sc,Z.map.depthTexture.minFilter=Pn,Z.map.depthTexture.magFilter=Pn):(Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Tn,Z.map.depthTexture.magFilter=Tn);Z.camera.updateProjectionMatrix()}Z.map.isWebGLCubeRenderTarget!==!0&&(Z.map.width!==s.x||Z.map.height!==s.y)&&Z.map.setSize(s.x,s.y);let ut=Z.map.isWebGLCubeRenderTarget?6:Z.getViewportCount();K.isPointLight!==!0&&Z.updateMatrices(K,y);for(let ft=0;ft<ut;ft++){let et=Z.getCamera(ft);if(K.isPointLight){let mt=Z.camera,It=Z.matrix,Gt=K.distance||mt.far;Gt!==mt.far&&(mt.far=Gt,mt.updateProjectionMatrix()),oo.setFromMatrixPosition(K.matrixWorld),mt.position.copy(oo),Id.copy(mt.position),Id.add(Vy[ft]),mt.up.copy(Gy[ft]),mt.lookAt(Id),mt.updateMatrixWorld(),It.makeTranslation(-oo.x,-oo.y,-oo.z),Mp.multiplyMatrices(mt.projectionMatrix,mt.matrixWorldInverse),Z._frustum.setFromProjectionMatrix(Mp,mt.coordinateSystem,mt.reversedDepth)}if(Z.map.isWebGLCubeRenderTarget)n.setRenderTarget(Z.map,ft),n.clear();else{ft===0&&(n.setRenderTarget(Z.map),n.clear());let mt=Z.getViewport(ft);a.set(r.x*mt.x,r.y*mt.y,r.x*mt.z,r.y*mt.w),$.viewport(a)}i=Z.getFrustum(ft),T(E,y,et,K,this.type)}Z.isPointLightShadow!==!0&&this.type===ea&&P(Z,y),Z.needsUpdate=!1}g=this.type,m.needsUpdate=!1,n.setRenderTarget(C,B,N)};function P(b,E){let y=t.update(S);h.defines.VSM_SAMPLES!==b.blurSamples&&(h.defines.VSM_SAMPLES=b.blurSamples,p.defines.VSM_SAMPLES=b.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),b.mapPass===null?b.mapPass=new Zn(s.x,s.y,{format:Fs,type:Ri}):(b.mapPass.width!==b.map.width||b.mapPass.height!==b.map.height)&&b.mapPass.setSize(b.map.width,b.map.height),h.uniforms.shadow_pass.value=b.map.depthTexture,h.uniforms.resolution.value.set(b.map.width,b.map.height),h.uniforms.radius.value=b.radius,n.setRenderTarget(b.mapPass),n.clear(),n.renderBufferDirect(E,null,y,h,S,null),p.uniforms.shadow_pass.value=b.mapPass.texture,p.uniforms.resolution.value.set(b.map.width,b.map.height),p.uniforms.radius.value=b.radius,n.setRenderTarget(b.map),n.clear(),n.renderBufferDirect(E,null,y,p,S,null)}function O(b,E,y,C){let B=null,N=y.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(N!==void 0)B=N;else if(B=y.isPointLight===!0?l:o,n.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){let $=B.uuid,V=E.uuid,D=c[$];D===void 0&&(D={},c[$]=D);let G=D[V];G===void 0&&(G=B.clone(),D[V]=G,E.addEventListener("dispose",A)),B=G}if(B.visible=E.visible,B.wireframe=E.wireframe,C===ea?B.side=E.shadowSide!==null?E.shadowSide:E.side:B.side=E.shadowSide!==null?E.shadowSide:f[E.side],B.alphaMap=E.alphaMap,B.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,B.map=E.map,B.clipShadows=E.clipShadows,B.clippingPlanes=E.clippingPlanes,B.clipIntersection=E.clipIntersection,B.displacementMap=E.displacementMap,B.displacementScale=E.displacementScale,B.displacementBias=E.displacementBias,B.wireframeLinewidth=E.wireframeLinewidth,B.linewidth=E.linewidth,y.isPointLight===!0&&B.isMeshDistanceMaterial===!0){let $=n.properties.get(B);$.light=y}return B}function T(b,E,y,C,B){if(b.visible===!1)return;if(b.layers.test(E.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&B===ea)&&(!b.frustumCulled||b.intersectsFrustum(i))){b.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,b.matrixWorld);let V=t.update(b),D=b.material;if(Array.isArray(D)){let G=V.groups;for(let K=0,Z=G.length;K<Z;K++){let ht=G[K],rt=D[ht.materialIndex];if(rt&&rt.visible){let ut=O(b,rt,C,B);b.onBeforeShadow(n,b,E,y,V,ut,ht),n.renderBufferDirect(y,null,V,ut,b,ht),b.onAfterShadow(n,b,E,y,V,ut,ht)}}}else if(D.visible){let G=O(b,D,C,B);b.onBeforeShadow(n,b,E,y,V,G,null),n.renderBufferDirect(y,null,V,G,b,null),b.onAfterShadow(n,b,E,y,V,G,null)}}let $=b.children;for(let V=0,D=$.length;V<D;V++)T($[V],E,y,C,B)}function A(b){b.target.removeEventListener("dispose",A);for(let y in c){let C=c[y],B=b.target.uuid;B in C&&(C[B].dispose(),delete C[B])}}}function Wy(n,t){function e(){let nt=!1,Dt=new Ke,Mt=null,kt=new Ke(0,0,0,0);return{setMask:function(Ft){Mt!==Ft&&!nt&&(n.colorMask(Ft,Ft,Ft,Ft),Mt=Ft)},setLocked:function(Ft){nt=Ft},setClear:function(Ft,At,ne,te,Fe){Fe===!0&&(Ft*=te,At*=te,ne*=te),Dt.set(Ft,At,ne,te),kt.equals(Dt)===!1&&(n.clearColor(Ft,At,ne,te),kt.copy(Dt))},reset:function(){nt=!1,Mt=null,kt.set(-1,0,0,0)}}}function i(){let nt=!1,Dt=!1,Mt=null,kt=null,Ft=null;return{setReversed:function(At){if(Dt!==At){let ne=t.get("EXT_clip_control");At?ne.clipControlEXT(ne.LOWER_LEFT_EXT,ne.ZERO_TO_ONE_EXT):ne.clipControlEXT(ne.LOWER_LEFT_EXT,ne.NEGATIVE_ONE_TO_ONE_EXT),Dt=At;let te=Ft;Ft=null,this.setClear(te)}},getReversed:function(){return Dt},setTest:function(At){At?I(n.DEPTH_TEST):L(n.DEPTH_TEST)},setMask:function(At){Mt!==At&&!nt&&(n.depthMask(At),Mt=At)},setFunc:function(At){if(Dt&&(At=Xf[At]),kt!==At){switch(At){case Jo:n.depthFunc(n.NEVER);break;case Ko:n.depthFunc(n.ALWAYS);break;case Qo:n.depthFunc(n.LESS);break;case Gr:n.depthFunc(n.LEQUAL);break;case tl:n.depthFunc(n.EQUAL);break;case el:n.depthFunc(n.GEQUAL);break;case nl:n.depthFunc(n.GREATER);break;case il:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}kt=At}},setLocked:function(At){nt=At},setClear:function(At){Ft!==At&&(Ft=At,Dt&&(At=1-At),n.clearDepth(At))},reset:function(){nt=!1,Mt=null,kt=null,Ft=null,Dt=!1}}}function s(){let nt=!1,Dt=null,Mt=null,kt=null,Ft=null,At=null,ne=null,te=null,Fe=null;return{setTest:function(we){nt||(we?I(n.STENCIL_TEST):L(n.STENCIL_TEST))},setMask:function(we){Dt!==we&&!nt&&(n.stencilMask(we),Dt=we)},setFunc:function(we,pn,Qe){(Mt!==we||kt!==pn||Ft!==Qe)&&(n.stencilFunc(we,pn,Qe),Mt=we,kt=pn,Ft=Qe)},setOp:function(we,pn,Qe){(At!==we||ne!==pn||te!==Qe)&&(n.stencilOp(we,pn,Qe),At=we,ne=pn,te=Qe)},setLocked:function(we){nt=we},setClear:function(we){Fe!==we&&(n.clearStencil(we),Fe=we)},reset:function(){nt=!1,Dt=null,Mt=null,kt=null,Ft=null,At=null,ne=null,te=null,Fe=null}}}let r=new e,a=new i,o=new s,l=new WeakMap,c=new WeakMap,u={},f={},h={},p=new WeakMap,x=[],S=null,m=!1,g=null,P=null,O=null,T=null,A=null,b=null,E=null,y=new he(0,0,0),C=0,B=!1,N=null,$=null,V=null,D=null,G=null,K=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Z=!1,ht=0,rt=n.getParameter(n.VERSION);rt.indexOf("WebGL")!==-1?(ht=parseFloat(/^WebGL (\d)/.exec(rt)[1]),Z=ht>=1):rt.indexOf("OpenGL ES")!==-1&&(ht=parseFloat(/^OpenGL ES (\d)/.exec(rt)[1]),Z=ht>=2);let ut=null,ft={},et=n.getParameter(n.SCISSOR_BOX),mt=n.getParameter(n.VIEWPORT),It=new Ke().fromArray(et),Gt=new Ke().fromArray(mt);function Jt(nt,Dt,Mt,kt){let Ft=new Uint8Array(4),At=n.createTexture();n.bindTexture(nt,At),n.texParameteri(nt,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(nt,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let ne=0;ne<Mt;ne++)nt===n.TEXTURE_3D||nt===n.TEXTURE_2D_ARRAY?n.texImage3D(Dt,0,n.RGBA,1,1,kt,0,n.RGBA,n.UNSIGNED_BYTE,Ft):n.texImage2D(Dt+ne,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Ft);return At}let it={};it[n.TEXTURE_2D]=Jt(n.TEXTURE_2D,n.TEXTURE_2D,1),it[n.TEXTURE_CUBE_MAP]=Jt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),it[n.TEXTURE_2D_ARRAY]=Jt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),it[n.TEXTURE_3D]=Jt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),I(n.DEPTH_TEST),a.setFunc(Gr),pt(!1),St(qu),I(n.CULL_FACE),q($i);function I(nt){u[nt]!==!0&&(n.enable(nt),u[nt]=!0)}function L(nt){u[nt]!==!1&&(n.disable(nt),u[nt]=!1)}function tt(nt,Dt){return h[nt]!==Dt?(n.bindFramebuffer(nt,Dt),h[nt]=Dt,nt===n.DRAW_FRAMEBUFFER&&(h[n.FRAMEBUFFER]=Dt),nt===n.FRAMEBUFFER&&(h[n.DRAW_FRAMEBUFFER]=Dt),!0):!1}function J(nt,Dt){let Mt=x,kt=!1;if(nt){Mt=p.get(Dt),Mt===void 0&&(Mt=[],p.set(Dt,Mt));let Ft=nt.textures;if(Mt.length!==Ft.length||Mt[0]!==n.COLOR_ATTACHMENT0){for(let At=0,ne=Ft.length;At<ne;At++)Mt[At]=n.COLOR_ATTACHMENT0+At;Mt.length=Ft.length,kt=!0}}else Mt[0]!==n.BACK&&(Mt[0]=n.BACK,kt=!0);kt&&n.drawBuffers(Mt)}function xt(nt){return S!==nt?(n.useProgram(nt),S=nt,!0):!1}let ct={[lr]:n.FUNC_ADD,[pf]:n.FUNC_SUBTRACT,[mf]:n.FUNC_REVERSE_SUBTRACT};ct[gf]=n.MIN,ct[_f]=n.MAX;let at={[xf]:n.ZERO,[vf]:n.ONE,[yf]:n.SRC_COLOR,[Zu]:n.SRC_ALPHA,[Tf]:n.SRC_ALPHA_SATURATE,[Af]:n.DST_COLOR,[Mf]:n.DST_ALPHA,[bf]:n.ONE_MINUS_SRC_COLOR,[Ju]:n.ONE_MINUS_SRC_ALPHA,[Ef]:n.ONE_MINUS_DST_COLOR,[Sf]:n.ONE_MINUS_DST_ALPHA,[wf]:n.CONSTANT_COLOR,[Cf]:n.ONE_MINUS_CONSTANT_COLOR,[Rf]:n.CONSTANT_ALPHA,[Pf]:n.ONE_MINUS_CONSTANT_ALPHA};function q(nt,Dt,Mt,kt,Ft,At,ne,te,Fe,we){if(nt===$i){m===!0&&(L(n.BLEND),m=!1);return}if(m===!1&&(I(n.BLEND),m=!0),nt!==ff){if(nt!==g||we!==B){if((P!==lr||A!==lr)&&(n.blendEquation(n.FUNC_ADD),P=lr,A=lr),we)switch(nt){case na:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Xu:n.blendFunc(n.ONE,n.ONE);break;case Yu:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case ju:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:fe("WebGLState: Invalid blending: ",nt);break}else switch(nt){case na:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Xu:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Yu:fe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ju:fe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:fe("WebGLState: Invalid blending: ",nt);break}O=null,T=null,b=null,E=null,y.set(0,0,0),C=0,g=nt,B=we}return}Ft=Ft||Dt,At=At||Mt,ne=ne||kt,(Dt!==P||Ft!==A)&&(n.blendEquationSeparate(ct[Dt],ct[Ft]),P=Dt,A=Ft),(Mt!==O||kt!==T||At!==b||ne!==E)&&(n.blendFuncSeparate(at[Mt],at[kt],at[At],at[ne]),O=Mt,T=kt,b=At,E=ne),(te.equals(y)===!1||Fe!==C)&&(n.blendColor(te.r,te.g,te.b,Fe),y.copy(te),C=Fe),g=nt,B=!1}function W(nt,Dt){nt.side===dn?L(n.CULL_FACE):I(n.CULL_FACE);let Mt=nt.side===Hn;Dt&&(Mt=!Mt),pt(Mt),nt.blending===na&&nt.transparent===!1?q($i):q(nt.blending,nt.blendEquation,nt.blendSrc,nt.blendDst,nt.blendEquationAlpha,nt.blendSrcAlpha,nt.blendDstAlpha,nt.blendColor,nt.blendAlpha,nt.premultipliedAlpha),a.setFunc(nt.depthFunc),a.setTest(nt.depthTest),a.setMask(nt.depthWrite),r.setMask(nt.colorWrite);let kt=nt.stencilWrite;o.setTest(kt),kt&&(o.setMask(nt.stencilWriteMask),o.setFunc(nt.stencilFunc,nt.stencilRef,nt.stencilFuncMask),o.setOp(nt.stencilFail,nt.stencilZFail,nt.stencilZPass)),ee(nt.polygonOffset,nt.polygonOffsetFactor,nt.polygonOffsetUnits),nt.alphaToCoverage===!0?I(n.SAMPLE_ALPHA_TO_COVERAGE):L(n.SAMPLE_ALPHA_TO_COVERAGE)}function pt(nt){N!==nt&&(nt?n.frontFace(n.CW):n.frontFace(n.CCW),N=nt)}function St(nt){nt!==uf?(I(n.CULL_FACE),nt!==$&&(nt===qu?n.cullFace(n.BACK):nt===df?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):L(n.CULL_FACE),$=nt}function yt(nt){nt!==V&&(Z&&n.lineWidth(nt),V=nt)}function ee(nt,Dt,Mt){nt?(I(n.POLYGON_OFFSET_FILL),(D!==Dt||G!==Mt)&&(D=Dt,G=Mt,a.getReversed()&&(Dt=-Dt),n.polygonOffset(Dt,Mt))):L(n.POLYGON_OFFSET_FILL)}function re(nt){nt?I(n.SCISSOR_TEST):L(n.SCISSOR_TEST)}function Kt(nt){nt===void 0&&(nt=n.TEXTURE0+K-1),ut!==nt&&(n.activeTexture(nt),ut=nt)}function j(nt,Dt,Mt){Mt===void 0&&(ut===null?Mt=n.TEXTURE0+K-1:Mt=ut);let kt=ft[Mt];kt===void 0&&(kt={type:void 0,texture:void 0},ft[Mt]=kt),(kt.type!==nt||kt.texture!==Dt)&&(ut!==Mt&&(n.activeTexture(Mt),ut=Mt),n.bindTexture(nt,Dt||it[nt]),kt.type=nt,kt.texture=Dt)}function Re(){let nt=ft[ut];nt!==void 0&&nt.type!==void 0&&(n.bindTexture(nt.type,null),nt.type=void 0,nt.texture=void 0)}function xe(){try{n.compressedTexImage2D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function k(){try{n.compressedTexImage3D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function M(){try{n.texSubImage2D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function st(){try{n.texSubImage3D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function dt(){try{n.compressedTexSubImage2D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function _t(){try{n.compressedTexSubImage3D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function Ut(){try{n.texStorage2D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function Tt(){try{n.texStorage3D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function vt(){try{n.texImage2D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function bt(){try{n.texImage3D(...arguments)}catch(nt){fe("WebGLState:",nt)}}function Ht(nt){return f[nt]!==void 0?f[nt]:n.getParameter(nt)}function Ot(nt,Dt){f[nt]!==Dt&&(n.pixelStorei(nt,Dt),f[nt]=Dt)}function qt(nt){It.equals(nt)===!1&&(n.scissor(nt.x,nt.y,nt.z,nt.w),It.copy(nt))}function $t(nt){Gt.equals(nt)===!1&&(n.viewport(nt.x,nt.y,nt.z,nt.w),Gt.copy(nt))}function Qt(nt,Dt){let Mt=c.get(Dt);Mt===void 0&&(Mt=new WeakMap,c.set(Dt,Mt));let kt=Mt.get(nt);kt===void 0&&(kt=n.getUniformBlockIndex(Dt,nt.name),Mt.set(nt,kt))}function le(nt,Dt){let kt=c.get(Dt).get(nt);l.get(Dt)!==kt&&(n.uniformBlockBinding(Dt,kt,nt.__bindingPointIndex),l.set(Dt,kt))}function Bt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),u={},f={},ut=null,ft={},h={},p=new WeakMap,x=[],S=null,m=!1,g=null,P=null,O=null,T=null,A=null,b=null,E=null,y=new he(0,0,0),C=0,B=!1,N=null,$=null,V=null,D=null,G=null,It.set(0,0,n.canvas.width,n.canvas.height),Gt.set(0,0,n.canvas.width,n.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:I,disable:L,bindFramebuffer:tt,drawBuffers:J,useProgram:xt,setBlending:q,setMaterial:W,setFlipSided:pt,setCullFace:St,setLineWidth:yt,setPolygonOffset:ee,setScissorTest:re,activeTexture:Kt,bindTexture:j,unbindTexture:Re,compressedTexImage2D:xe,compressedTexImage3D:k,texImage2D:vt,texImage3D:bt,pixelStorei:Ot,getParameter:Ht,updateUBOMapping:Qt,uniformBlockBinding:le,texStorage2D:Ut,texStorage3D:Tt,texSubImage2D:M,texSubImage3D:st,compressedTexSubImage2D:dt,compressedTexSubImage3D:_t,scissor:qt,viewport:$t,reset:Bt}}function $y(n,t,e,i,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Pt,u=new WeakMap,f=new Set,h,p=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function S(k,M){return x?new OffscreenCanvas(k,M):Ca("canvas")}function m(k,M,st){let dt=1,_t=xe(k);if((_t.width>st||_t.height>st)&&(dt=st/Math.max(_t.width,_t.height)),dt<1)if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&k instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&k instanceof ImageBitmap||typeof VideoFrame<"u"&&k instanceof VideoFrame){let Ut=Math.floor(dt*_t.width),Tt=Math.floor(dt*_t.height);h===void 0&&(h=S(Ut,Tt));let vt=M?S(Ut,Tt):h;return vt.width=Ut,vt.height=Tt,vt.getContext("2d").drawImage(k,0,0,Ut,Tt),de("WebGLRenderer: Texture has been resized from ("+_t.width+"x"+_t.height+") to ("+Ut+"x"+Tt+")."),vt}else return"data"in k&&de("WebGLRenderer: Image in DataTexture is too big ("+_t.width+"x"+_t.height+")."),k;return k}function g(k){return k.generateMipmaps}function P(k){n.generateMipmap(k)}function O(k){return k.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:k.isWebGL3DRenderTarget?n.TEXTURE_3D:k.isWebGLArrayRenderTarget||k.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function T(k,M,st,dt,_t,Ut=!1){if(k!==null){if(n[k]!==void 0)return n[k];de("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+k+"'")}let Tt;dt&&(Tt=t.get("EXT_texture_norm16"),Tt||de("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let vt=M;if(M===n.RED&&(st===n.FLOAT&&(vt=n.R32F),st===n.HALF_FLOAT&&(vt=n.R16F),st===n.UNSIGNED_BYTE&&(vt=n.R8),st===n.UNSIGNED_SHORT&&Tt&&(vt=Tt.R16_EXT),st===n.SHORT&&Tt&&(vt=Tt.R16_SNORM_EXT)),M===n.RED_INTEGER&&(st===n.UNSIGNED_BYTE&&(vt=n.R8UI),st===n.UNSIGNED_SHORT&&(vt=n.R16UI),st===n.UNSIGNED_INT&&(vt=n.R32UI),st===n.BYTE&&(vt=n.R8I),st===n.SHORT&&(vt=n.R16I),st===n.INT&&(vt=n.R32I)),M===n.RG&&(st===n.FLOAT&&(vt=n.RG32F),st===n.HALF_FLOAT&&(vt=n.RG16F),st===n.UNSIGNED_BYTE&&(vt=n.RG8),st===n.UNSIGNED_SHORT&&Tt&&(vt=Tt.RG16_EXT),st===n.SHORT&&Tt&&(vt=Tt.RG16_SNORM_EXT)),M===n.RG_INTEGER&&(st===n.UNSIGNED_BYTE&&(vt=n.RG8UI),st===n.UNSIGNED_SHORT&&(vt=n.RG16UI),st===n.UNSIGNED_INT&&(vt=n.RG32UI),st===n.BYTE&&(vt=n.RG8I),st===n.SHORT&&(vt=n.RG16I),st===n.INT&&(vt=n.RG32I)),M===n.RGB_INTEGER&&(st===n.UNSIGNED_BYTE&&(vt=n.RGB8UI),st===n.UNSIGNED_SHORT&&(vt=n.RGB16UI),st===n.UNSIGNED_INT&&(vt=n.RGB32UI),st===n.BYTE&&(vt=n.RGB8I),st===n.SHORT&&(vt=n.RGB16I),st===n.INT&&(vt=n.RGB32I)),M===n.RGBA_INTEGER&&(st===n.UNSIGNED_BYTE&&(vt=n.RGBA8UI),st===n.UNSIGNED_SHORT&&(vt=n.RGBA16UI),st===n.UNSIGNED_INT&&(vt=n.RGBA32UI),st===n.BYTE&&(vt=n.RGBA8I),st===n.SHORT&&(vt=n.RGBA16I),st===n.INT&&(vt=n.RGBA32I)),M===n.RGB&&(st===n.UNSIGNED_SHORT&&Tt&&(vt=Tt.RGB16_EXT),st===n.SHORT&&Tt&&(vt=Tt.RGB16_SNORM_EXT),st===n.UNSIGNED_INT_5_9_9_9_REV&&(vt=n.RGB9_E5),st===n.UNSIGNED_INT_10F_11F_11F_REV&&(vt=n.R11F_G11F_B10F)),M===n.RGBA){let bt=Ut?wa:Ie.getTransfer(_t);st===n.FLOAT&&(vt=n.RGBA32F),st===n.HALF_FLOAT&&(vt=n.RGBA16F),st===n.UNSIGNED_BYTE&&(vt=bt===He?n.SRGB8_ALPHA8:n.RGBA8),st===n.UNSIGNED_SHORT&&Tt&&(vt=Tt.RGBA16_EXT),st===n.SHORT&&Tt&&(vt=Tt.RGBA16_SNORM_EXT),st===n.UNSIGNED_SHORT_4_4_4_4&&(vt=n.RGBA4),st===n.UNSIGNED_SHORT_5_5_5_1&&(vt=n.RGB5_A1)}return(vt===n.R16F||vt===n.R32F||vt===n.RG16F||vt===n.RG32F||vt===n.RGBA16F||vt===n.RGBA32F)&&t.get("EXT_color_buffer_float"),vt}function A(k,M){let st;return k?M===null||M===Ci||M===sa?st=n.DEPTH24_STENCIL8:M===xi?st=n.DEPTH32F_STENCIL8:M===ia&&(st=n.DEPTH24_STENCIL8,de("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Ci||M===sa?st=n.DEPTH_COMPONENT24:M===xi?st=n.DEPTH_COMPONENT32F:M===ia&&(st=n.DEPTH_COMPONENT16),st}function b(k,M){return g(k)===!0||k.isFramebufferTexture&&k.minFilter!==Tn&&k.minFilter!==Pn?Math.log2(Math.max(M.width,M.height))+1:k.mipmaps!==void 0&&k.mipmaps.length>0?k.mipmaps.length:k.isCompressedTexture&&Array.isArray(k.image)?M.mipmaps.length:1}function E(k){let M=k.target;M.removeEventListener("dispose",E),C(M),M.isVideoTexture&&u.delete(M),M.isHTMLTexture&&f.delete(M)}function y(k){let M=k.target;M.removeEventListener("dispose",y),N(M)}function C(k){let M=i.get(k);if(M.__webglInit===void 0)return;let st=k.source,dt=p.get(st);if(dt){let _t=dt[M.__cacheKey];_t.usedTimes--,_t.usedTimes===0&&B(k),Object.keys(dt).length===0&&p.delete(st)}i.remove(k)}function B(k){let M=i.get(k);n.deleteTexture(M.__webglTexture);let st=k.source,dt=p.get(st);delete dt[M.__cacheKey],a.memory.textures--}function N(k){let M=i.get(k);if(k.depthTexture&&(k.depthTexture.dispose(),i.remove(k.depthTexture)),k.isWebGLCubeRenderTarget)for(let dt=0;dt<6;dt++){if(Array.isArray(M.__webglFramebuffer[dt]))for(let _t=0;_t<M.__webglFramebuffer[dt].length;_t++)n.deleteFramebuffer(M.__webglFramebuffer[dt][_t]);else n.deleteFramebuffer(M.__webglFramebuffer[dt]);M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer[dt])}else{if(Array.isArray(M.__webglFramebuffer))for(let dt=0;dt<M.__webglFramebuffer.length;dt++)n.deleteFramebuffer(M.__webglFramebuffer[dt]);else n.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&n.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let dt=0;dt<M.__webglColorRenderbuffer.length;dt++)M.__webglColorRenderbuffer[dt]&&n.deleteRenderbuffer(M.__webglColorRenderbuffer[dt]);M.__webglDepthRenderbuffer&&n.deleteRenderbuffer(M.__webglDepthRenderbuffer)}let st=k.textures;for(let dt=0,_t=st.length;dt<_t;dt++){let Ut=i.get(st[dt]);Ut.__webglTexture&&(n.deleteTexture(Ut.__webglTexture),a.memory.textures--),i.remove(st[dt])}i.remove(k)}let $=0;function V(){$=0}function D(){return $}function G(k){$=k}function K(){let k=$;return k>=s.maxTextures&&de("WebGLTextures: Trying to use "+(k+1)+" texture units while this GPU supports only "+s.maxTextures),$+=1,k}function Z(k){let M=[];return M.push(k.wrapS),M.push(k.wrapT),M.push(k.wrapR||0),M.push(k.magFilter),M.push(k.minFilter),M.push(k.anisotropy),M.push(k.internalFormat),M.push(k.format),M.push(k.type),M.push(k.generateMipmaps),M.push(k.premultiplyAlpha),M.push(k.flipY),M.push(k.unpackAlignment),M.push(k.colorSpace),M.join()}function ht(k,M){let st=i.get(k);if(k.isVideoTexture&&j(k),k.isRenderTargetTexture===!1&&k.isExternalTexture!==!0&&k.version>0&&st.__version!==k.version){let dt=k.image;if(dt===null)de("WebGLRenderer: Texture marked for update but no image data found.");else if(dt.complete===!1)de("WebGLRenderer: Texture marked for update but image is incomplete");else{L(st,k,M);return}}else k.isExternalTexture&&(st.__webglTexture=k.sourceTexture?k.sourceTexture:null);e.bindTexture(n.TEXTURE_2D,st.__webglTexture,n.TEXTURE0+M)}function rt(k,M){let st=i.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&st.__version!==k.version){L(st,k,M);return}else k.isExternalTexture&&(st.__webglTexture=k.sourceTexture?k.sourceTexture:null);e.bindTexture(n.TEXTURE_2D_ARRAY,st.__webglTexture,n.TEXTURE0+M)}function ut(k,M){let st=i.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&st.__version!==k.version){L(st,k,M);return}e.bindTexture(n.TEXTURE_3D,st.__webglTexture,n.TEXTURE0+M)}function ft(k,M){let st=i.get(k);if(k.isCubeDepthTexture!==!0&&k.version>0&&st.__version!==k.version){tt(st,k,M);return}e.bindTexture(n.TEXTURE_CUBE_MAP,st.__webglTexture,n.TEXTURE0+M)}let et={[sl]:n.REPEAT,[zi]:n.CLAMP_TO_EDGE,[rl]:n.MIRRORED_REPEAT},mt={[Tn]:n.NEAREST,[Lf]:n.NEAREST_MIPMAP_NEAREST,[Qa]:n.NEAREST_MIPMAP_LINEAR,[Pn]:n.LINEAR,[Bl]:n.LINEAR_MIPMAP_NEAREST,[Us]:n.LINEAR_MIPMAP_LINEAR},It={[Ff]:n.NEVER,[Gf]:n.ALWAYS,[Bf]:n.LESS,[Sc]:n.LEQUAL,[zf]:n.EQUAL,[Ac]:n.GEQUAL,[kf]:n.GREATER,[Vf]:n.NOTEQUAL};function Gt(k,M){if(M.type===xi&&t.has("OES_texture_float_linear")===!1&&(M.magFilter===Pn||M.magFilter===Bl||M.magFilter===Qa||M.magFilter===Us||M.minFilter===Pn||M.minFilter===Bl||M.minFilter===Qa||M.minFilter===Us)&&de("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(k,n.TEXTURE_WRAP_S,et[M.wrapS]),n.texParameteri(k,n.TEXTURE_WRAP_T,et[M.wrapT]),(k===n.TEXTURE_3D||k===n.TEXTURE_2D_ARRAY)&&n.texParameteri(k,n.TEXTURE_WRAP_R,et[M.wrapR]),n.texParameteri(k,n.TEXTURE_MAG_FILTER,mt[M.magFilter]),n.texParameteri(k,n.TEXTURE_MIN_FILTER,mt[M.minFilter]),M.compareFunction&&(n.texParameteri(k,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(k,n.TEXTURE_COMPARE_FUNC,It[M.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===Tn||M.minFilter!==Qa&&M.minFilter!==Us||M.type===xi&&t.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||i.get(M).__currentAnisotropy){let st=t.get("EXT_texture_filter_anisotropic");n.texParameterf(k,st.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,s.getMaxAnisotropy())),i.get(M).__currentAnisotropy=M.anisotropy}}}function Jt(k,M){let st=!1;k.__webglInit===void 0&&(k.__webglInit=!0,M.addEventListener("dispose",E));let dt=M.source,_t=p.get(dt);_t===void 0&&(_t={},p.set(dt,_t));let Ut=Z(M);if(Ut!==k.__cacheKey){_t[Ut]===void 0&&(_t[Ut]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,st=!0),_t[Ut].usedTimes++;let Tt=_t[k.__cacheKey];Tt!==void 0&&(_t[k.__cacheKey].usedTimes--,Tt.usedTimes===0&&B(M)),k.__cacheKey=Ut,k.__webglTexture=_t[Ut].texture}return st}function it(k,M,st){return Math.floor(Math.floor(k/st)/M)}function I(k,M,st,dt){let Ut=k.updateRanges;if(Ut.length===0)e.texSubImage2D(n.TEXTURE_2D,0,0,0,M.width,M.height,st,dt,M.data);else{Ut.sort((Ot,qt)=>Ot.start-qt.start);let Tt=0;for(let Ot=1;Ot<Ut.length;Ot++){let qt=Ut[Tt],$t=Ut[Ot],Qt=qt.start+qt.count,le=it($t.start,M.width,4),Bt=it(qt.start,M.width,4);$t.start<=Qt+1&&le===Bt&&it($t.start+$t.count-1,M.width,4)===le?qt.count=Math.max(qt.count,$t.start+$t.count-qt.start):(++Tt,Ut[Tt]=$t)}Ut.length=Tt+1;let vt=e.getParameter(n.UNPACK_ROW_LENGTH),bt=e.getParameter(n.UNPACK_SKIP_PIXELS),Ht=e.getParameter(n.UNPACK_SKIP_ROWS);e.pixelStorei(n.UNPACK_ROW_LENGTH,M.width);for(let Ot=0,qt=Ut.length;Ot<qt;Ot++){let $t=Ut[Ot],Qt=Math.floor($t.start/4),le=Math.ceil($t.count/4),Bt=Qt%M.width,nt=Math.floor(Qt/M.width),Dt=le,Mt=1;e.pixelStorei(n.UNPACK_SKIP_PIXELS,Bt),e.pixelStorei(n.UNPACK_SKIP_ROWS,nt),e.texSubImage2D(n.TEXTURE_2D,0,Bt,nt,Dt,Mt,st,dt,M.data)}k.clearUpdateRanges(),e.pixelStorei(n.UNPACK_ROW_LENGTH,vt),e.pixelStorei(n.UNPACK_SKIP_PIXELS,bt),e.pixelStorei(n.UNPACK_SKIP_ROWS,Ht)}}function L(k,M,st){let dt=n.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(dt=n.TEXTURE_2D_ARRAY),M.isData3DTexture&&(dt=n.TEXTURE_3D);let _t=Jt(k,M),Ut=M.source;e.bindTexture(dt,k.__webglTexture,n.TEXTURE0+st);let Tt=i.get(Ut);if(Ut.version!==Tt.__version||_t===!0){if(e.activeTexture(n.TEXTURE0+st),(typeof ImageBitmap<"u"&&M.image instanceof ImageBitmap)===!1){let Mt=Ie.getPrimaries(Ie.workingColorSpace),kt=M.colorSpace===us?null:Ie.getPrimaries(M.colorSpace),Ft=M.colorSpace===us||Mt===kt?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ft)}e.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment);let bt=m(M.image,!1,s.maxTextureSize);bt=Re(M,bt);let Ht=r.convert(M.format,M.colorSpace),Ot=r.convert(M.type),qt=T(M.internalFormat,Ht,Ot,M.normalized,M.colorSpace,M.isVideoTexture);Gt(dt,M);let $t,Qt=M.mipmaps,le=M.isVideoTexture!==!0,Bt=Tt.__version===void 0||_t===!0,nt=Ut.dataReady,Dt=b(M,bt);if(M.isDepthTexture)qt=A(M.format===Os,M.type),Bt&&(le?e.texStorage2D(n.TEXTURE_2D,1,qt,bt.width,bt.height):e.texImage2D(n.TEXTURE_2D,0,qt,bt.width,bt.height,0,Ht,Ot,null));else if(M.isDataTexture)if(Qt.length>0){le&&Bt&&e.texStorage2D(n.TEXTURE_2D,Dt,qt,Qt[0].width,Qt[0].height);for(let Mt=0,kt=Qt.length;Mt<kt;Mt++)$t=Qt[Mt],le?nt&&e.texSubImage2D(n.TEXTURE_2D,Mt,0,0,$t.width,$t.height,Ht,Ot,$t.data):e.texImage2D(n.TEXTURE_2D,Mt,qt,$t.width,$t.height,0,Ht,Ot,$t.data);M.generateMipmaps=!1}else le?(Bt&&e.texStorage2D(n.TEXTURE_2D,Dt,qt,bt.width,bt.height),nt&&I(M,bt,Ht,Ot)):e.texImage2D(n.TEXTURE_2D,0,qt,bt.width,bt.height,0,Ht,Ot,bt.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){le&&Bt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Dt,qt,Qt[0].width,Qt[0].height,bt.depth);for(let Mt=0,kt=Qt.length;Mt<kt;Mt++)if($t=Qt[Mt],M.format!==vi)if(Ht!==null)if(le){if(nt)if(M.layerUpdates.size>0){let Ft=yd($t.width,$t.height,M.format,M.type);for(let At of M.layerUpdates){let ne=$t.data.subarray(At*Ft/$t.data.BYTES_PER_ELEMENT,(At+1)*Ft/$t.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Mt,0,0,At,$t.width,$t.height,1,Ht,ne)}}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Mt,0,0,0,$t.width,$t.height,bt.depth,Ht,$t.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Mt,qt,$t.width,$t.height,bt.depth,0,$t.data,0,0);else de("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else le?nt&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,Mt,0,0,0,$t.width,$t.height,bt.depth,Ht,Ot,$t.data):e.texImage3D(n.TEXTURE_2D_ARRAY,Mt,qt,$t.width,$t.height,bt.depth,0,Ht,Ot,$t.data);M.layerUpdates.size>0&&M.clearLayerUpdates()}else{le&&Bt&&e.texStorage2D(n.TEXTURE_2D,Dt,qt,Qt[0].width,Qt[0].height);for(let Mt=0,kt=Qt.length;Mt<kt;Mt++)$t=Qt[Mt],M.format!==vi?Ht!==null?le?nt&&e.compressedTexSubImage2D(n.TEXTURE_2D,Mt,0,0,$t.width,$t.height,Ht,$t.data):e.compressedTexImage2D(n.TEXTURE_2D,Mt,qt,$t.width,$t.height,0,$t.data):de("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):le?nt&&e.texSubImage2D(n.TEXTURE_2D,Mt,0,0,$t.width,$t.height,Ht,Ot,$t.data):e.texImage2D(n.TEXTURE_2D,Mt,qt,$t.width,$t.height,0,Ht,Ot,$t.data)}else if(M.isDataArrayTexture)if(le){if(Bt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Dt,qt,bt.width,bt.height,bt.depth),nt)if(M.layerUpdates.size>0){let Mt=yd(bt.width,bt.height,M.format,M.type);for(let kt of M.layerUpdates){let Ft=bt.data.subarray(kt*Mt/bt.data.BYTES_PER_ELEMENT,(kt+1)*Mt/bt.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,kt,bt.width,bt.height,1,Ht,Ot,Ft)}M.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,bt.width,bt.height,bt.depth,Ht,Ot,bt.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,qt,bt.width,bt.height,bt.depth,0,Ht,Ot,bt.data);else if(M.isData3DTexture)le?(Bt&&e.texStorage3D(n.TEXTURE_3D,Dt,qt,bt.width,bt.height,bt.depth),nt&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,bt.width,bt.height,bt.depth,Ht,Ot,bt.data)):e.texImage3D(n.TEXTURE_3D,0,qt,bt.width,bt.height,bt.depth,0,Ht,Ot,bt.data);else if(M.isFramebufferTexture){if(Bt)if(le)e.texStorage2D(n.TEXTURE_2D,Dt,qt,bt.width,bt.height);else{let Mt=bt.width,kt=bt.height;for(let Ft=0;Ft<Dt;Ft++)e.texImage2D(n.TEXTURE_2D,Ft,qt,Mt,kt,0,Ht,Ot,null),Mt>>=1,kt>>=1}}else if(M.isHTMLTexture){if("texElementImage2D"in n){let Mt=n.canvas;if(Mt.hasAttribute("layoutsubtree")||Mt.setAttribute("layoutsubtree","true"),bt.parentNode!==Mt){Mt.appendChild(bt),f.add(M),Mt.onpaint=kt=>{let Ft=kt.changedElements;for(let At of f)Ft.includes(At.image)&&(At.needsUpdate=!0)},Mt.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,bt);else{let Ft=n.RGBA,At=n.RGBA,ne=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Ft,At,ne,bt)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(Qt.length>0){if(le&&Bt){let Mt=xe(Qt[0]);e.texStorage2D(n.TEXTURE_2D,Dt,qt,Mt.width,Mt.height)}for(let Mt=0,kt=Qt.length;Mt<kt;Mt++)$t=Qt[Mt],le?nt&&e.texSubImage2D(n.TEXTURE_2D,Mt,0,0,Ht,Ot,$t):e.texImage2D(n.TEXTURE_2D,Mt,qt,Ht,Ot,$t);M.generateMipmaps=!1}else if(le){if(Bt){let Mt=xe(bt);e.texStorage2D(n.TEXTURE_2D,Dt,qt,Mt.width,Mt.height)}nt&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,Ht,Ot,bt)}else e.texImage2D(n.TEXTURE_2D,0,qt,Ht,Ot,bt);g(M)&&P(dt),Tt.__version=Ut.version,M.onUpdate&&M.onUpdate(M)}k.__version=M.version}function tt(k,M,st){if(M.image.length!==6)return;let dt=Jt(k,M),_t=M.source;e.bindTexture(n.TEXTURE_CUBE_MAP,k.__webglTexture,n.TEXTURE0+st);let Ut=i.get(_t);if(_t.version!==Ut.__version||dt===!0){e.activeTexture(n.TEXTURE0+st);let Tt=Ie.getPrimaries(Ie.workingColorSpace),vt=M.colorSpace===us?null:Ie.getPrimaries(M.colorSpace),bt=M.colorSpace===us||Tt===vt?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,bt);let Ht=M.isCompressedTexture||M.image[0].isCompressedTexture,Ot=M.image[0]&&M.image[0].isDataTexture,qt=[];for(let At=0;At<6;At++)!Ht&&!Ot?qt[At]=m(M.image[At],!0,s.maxCubemapSize):qt[At]=Ot?M.image[At].image:M.image[At],qt[At]=Re(M,qt[At]);let $t=qt[0],Qt=r.convert(M.format,M.colorSpace),le=r.convert(M.type),Bt=T(M.internalFormat,Qt,le,M.normalized,M.colorSpace),nt=M.isVideoTexture!==!0,Dt=Ut.__version===void 0||dt===!0,Mt=_t.dataReady,kt=b(M,$t);Gt(n.TEXTURE_CUBE_MAP,M);let Ft;if(Ht){nt&&Dt&&e.texStorage2D(n.TEXTURE_CUBE_MAP,kt,Bt,$t.width,$t.height);for(let At=0;At<6;At++){Ft=qt[At].mipmaps;for(let ne=0;ne<Ft.length;ne++){let te=Ft[ne];M.format!==vi?Qt!==null?nt?Mt&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne,0,0,te.width,te.height,Qt,te.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne,Bt,te.width,te.height,0,te.data):de("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):nt?Mt&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne,0,0,te.width,te.height,Qt,le,te.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne,Bt,te.width,te.height,0,Qt,le,te.data)}}}else{if(Ft=M.mipmaps,nt&&Dt){Ft.length>0&&kt++;let At=xe(qt[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,kt,Bt,At.width,At.height)}for(let At=0;At<6;At++)if(Ot){nt?Mt&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,0,0,0,qt[At].width,qt[At].height,Qt,le,qt[At].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,0,Bt,qt[At].width,qt[At].height,0,Qt,le,qt[At].data);for(let ne=0;ne<Ft.length;ne++){let Fe=Ft[ne].image[At].image;nt?Mt&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne+1,0,0,Fe.width,Fe.height,Qt,le,Fe.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne+1,Bt,Fe.width,Fe.height,0,Qt,le,Fe.data)}}else{nt?Mt&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,0,0,0,Qt,le,qt[At]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,0,Bt,Qt,le,qt[At]);for(let ne=0;ne<Ft.length;ne++){let te=Ft[ne];nt?Mt&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne+1,0,0,Qt,le,te.image[At]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+At,ne+1,Bt,Qt,le,te.image[At])}}}g(M)&&P(n.TEXTURE_CUBE_MAP),Ut.__version=_t.version,M.onUpdate&&M.onUpdate(M)}k.__version=M.version}function J(k,M,st,dt,_t,Ut){let Tt=r.convert(st.format,st.colorSpace),vt=r.convert(st.type),bt=T(st.internalFormat,Tt,vt,st.normalized,st.colorSpace),Ht=i.get(M),Ot=i.get(st);if(Ot.__renderTarget=M,!Ht.__hasExternalTextures){let qt=Math.max(1,M.width>>Ut),$t=Math.max(1,M.height>>Ut);_t===n.TEXTURE_3D||_t===n.TEXTURE_2D_ARRAY?e.texImage3D(_t,Ut,bt,qt,$t,M.depth,0,Tt,vt,null):e.texImage2D(_t,Ut,bt,qt,$t,0,Tt,vt,null)}e.bindFramebuffer(n.FRAMEBUFFER,k),Kt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,dt,_t,Ot.__webglTexture,0,re(M)):(_t===n.TEXTURE_2D||_t>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&_t<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,dt,_t,Ot.__webglTexture,Ut),e.bindFramebuffer(n.FRAMEBUFFER,null)}function xt(k,M,st){if(n.bindRenderbuffer(n.RENDERBUFFER,k),M.depthBuffer){let dt=M.depthTexture,_t=dt&&dt.isDepthTexture?dt.type:null,Ut=A(M.stencilBuffer,_t),Tt=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;Kt(M)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,re(M),Ut,M.width,M.height):st?n.renderbufferStorageMultisample(n.RENDERBUFFER,re(M),Ut,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,Ut,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Tt,n.RENDERBUFFER,k)}else{let dt=M.textures;for(let _t=0;_t<dt.length;_t++){let Ut=dt[_t],Tt=r.convert(Ut.format,Ut.colorSpace),vt=r.convert(Ut.type),bt=T(Ut.internalFormat,Tt,vt,Ut.normalized,Ut.colorSpace);Kt(M)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,re(M),bt,M.width,M.height):st?n.renderbufferStorageMultisample(n.RENDERBUFFER,re(M),bt,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,bt,M.width,M.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ct(k,M,st){let dt=M.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(n.FRAMEBUFFER,k),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let _t=i.get(M.depthTexture);if(_t.__renderTarget=M,(!_t.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),dt){if(_t.__webglInit===void 0&&(_t.__webglInit=!0,M.depthTexture.addEventListener("dispose",E)),_t.__webglTexture===void 0){_t.__webglTexture=n.createTexture(),e.bindTexture(n.TEXTURE_CUBE_MAP,_t.__webglTexture),Gt(n.TEXTURE_CUBE_MAP,M.depthTexture);let Ht=r.convert(M.depthTexture.format),Ot=r.convert(M.depthTexture.type),qt;M.depthTexture.format===Vi?qt=n.DEPTH_COMPONENT24:M.depthTexture.format===Os&&(qt=n.DEPTH24_STENCIL8);for(let $t=0;$t<6;$t++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+$t,0,qt,M.width,M.height,0,Ht,Ot,null)}}else ht(M.depthTexture,0);let Ut=_t.__webglTexture,Tt=re(M),vt=dt?n.TEXTURE_CUBE_MAP_POSITIVE_X+st:n.TEXTURE_2D,bt=M.depthTexture.format===Os?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(M.depthTexture.format===Vi)Kt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,bt,vt,Ut,0,Tt):n.framebufferTexture2D(n.FRAMEBUFFER,bt,vt,Ut,0);else if(M.depthTexture.format===Os)Kt(M)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,bt,vt,Ut,0,Tt):n.framebufferTexture2D(n.FRAMEBUFFER,bt,vt,Ut,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function at(k){let M=i.get(k),st=k.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==k.depthTexture){let dt=k.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),dt){let _t=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,dt.removeEventListener("dispose",_t)};dt.addEventListener("dispose",_t),M.__depthDisposeCallback=_t}M.__boundDepthTexture=dt}if(k.depthTexture&&!M.__autoAllocateDepthBuffer)if(st)for(let dt=0;dt<6;dt++)ct(M.__webglFramebuffer[dt],k,dt);else{let dt=k.texture.mipmaps;dt&&dt.length>0?ct(M.__webglFramebuffer[0],k,0):ct(M.__webglFramebuffer,k,0)}else if(st){M.__webglDepthbuffer=[];for(let dt=0;dt<6;dt++)if(e.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[dt]),M.__webglDepthbuffer[dt]===void 0)M.__webglDepthbuffer[dt]=n.createRenderbuffer(),xt(M.__webglDepthbuffer[dt],k,!1);else{let _t=k.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ut=M.__webglDepthbuffer[dt];n.bindRenderbuffer(n.RENDERBUFFER,Ut),n.framebufferRenderbuffer(n.FRAMEBUFFER,_t,n.RENDERBUFFER,Ut)}}else{let dt=k.texture.mipmaps;if(dt&&dt.length>0?e.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[0]):e.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=n.createRenderbuffer(),xt(M.__webglDepthbuffer,k,!1);else{let _t=k.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ut=M.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,Ut),n.framebufferRenderbuffer(n.FRAMEBUFFER,_t,n.RENDERBUFFER,Ut)}}e.bindFramebuffer(n.FRAMEBUFFER,null)}function q(k,M,st){let dt=i.get(k);M!==void 0&&J(dt.__webglFramebuffer,k,k.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),st!==void 0&&at(k)}function W(k){let M=k.texture,st=i.get(k),dt=i.get(M);k.addEventListener("dispose",y);let _t=k.textures,Ut=k.isWebGLCubeRenderTarget===!0,Tt=_t.length>1;if(Tt||(dt.__webglTexture===void 0&&(dt.__webglTexture=n.createTexture()),dt.__version=M.version,a.memory.textures++),Ut){st.__webglFramebuffer=[];for(let vt=0;vt<6;vt++)if(M.mipmaps&&M.mipmaps.length>0){st.__webglFramebuffer[vt]=[];for(let bt=0;bt<M.mipmaps.length;bt++)st.__webglFramebuffer[vt][bt]=n.createFramebuffer()}else st.__webglFramebuffer[vt]=n.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){st.__webglFramebuffer=[];for(let vt=0;vt<M.mipmaps.length;vt++)st.__webglFramebuffer[vt]=n.createFramebuffer()}else st.__webglFramebuffer=n.createFramebuffer();if(Tt)for(let vt=0,bt=_t.length;vt<bt;vt++){let Ht=i.get(_t[vt]);Ht.__webglTexture===void 0&&(Ht.__webglTexture=n.createTexture(),a.memory.textures++)}if(k.samples>0&&Kt(k)===!1){st.__webglMultisampledFramebuffer=n.createFramebuffer(),st.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,st.__webglMultisampledFramebuffer);for(let vt=0;vt<_t.length;vt++){let bt=_t[vt];st.__webglColorRenderbuffer[vt]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,st.__webglColorRenderbuffer[vt]);let Ht=r.convert(bt.format,bt.colorSpace),Ot=r.convert(bt.type),qt=T(bt.internalFormat,Ht,Ot,bt.normalized,bt.colorSpace,k.isXRRenderTarget===!0),$t=re(k);n.renderbufferStorageMultisample(n.RENDERBUFFER,$t,qt,k.width,k.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+vt,n.RENDERBUFFER,st.__webglColorRenderbuffer[vt])}n.bindRenderbuffer(n.RENDERBUFFER,null),k.depthBuffer&&(st.__webglDepthRenderbuffer=n.createRenderbuffer(),xt(st.__webglDepthRenderbuffer,k,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Ut){e.bindTexture(n.TEXTURE_CUBE_MAP,dt.__webglTexture),Gt(n.TEXTURE_CUBE_MAP,M);for(let vt=0;vt<6;vt++)if(M.mipmaps&&M.mipmaps.length>0)for(let bt=0;bt<M.mipmaps.length;bt++)J(st.__webglFramebuffer[vt][bt],k,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+vt,bt);else J(st.__webglFramebuffer[vt],k,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+vt,0);g(M)&&P(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Tt){for(let vt=0,bt=_t.length;vt<bt;vt++){let Ht=_t[vt],Ot=i.get(Ht),qt=n.TEXTURE_2D;(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)&&(qt=k.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(qt,Ot.__webglTexture),Gt(qt,Ht),J(st.__webglFramebuffer,k,Ht,n.COLOR_ATTACHMENT0+vt,qt,0),g(Ht)&&P(qt)}e.unbindTexture()}else{let vt=n.TEXTURE_2D;if((k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)&&(vt=k.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(vt,dt.__webglTexture),Gt(vt,M),M.mipmaps&&M.mipmaps.length>0)for(let bt=0;bt<M.mipmaps.length;bt++)J(st.__webglFramebuffer[bt],k,M,n.COLOR_ATTACHMENT0,vt,bt);else J(st.__webglFramebuffer,k,M,n.COLOR_ATTACHMENT0,vt,0);g(M)&&P(vt),e.unbindTexture()}k.depthBuffer&&at(k)}function pt(k){let M=k.textures;for(let st=0,dt=M.length;st<dt;st++){let _t=M[st];if(g(_t)){let Ut=O(k),Tt=i.get(_t).__webglTexture;e.bindTexture(Ut,Tt),P(Ut),e.unbindTexture()}}}let St=[],yt=[];function ee(k){if(k.samples>0){if(Kt(k)===!1){let M=k.textures,st=k.width,dt=k.height,_t=n.COLOR_BUFFER_BIT,Ut=k.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Tt=i.get(k),vt=M.length>1;if(vt)for(let Ht=0;Ht<M.length;Ht++)e.bindFramebuffer(n.FRAMEBUFFER,Tt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ht,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,Tt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ht,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,Tt.__webglMultisampledFramebuffer);let bt=k.texture.mipmaps;bt&&bt.length>0?e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Tt.__webglFramebuffer[0]):e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Tt.__webglFramebuffer);for(let Ht=0;Ht<M.length;Ht++){if(k.resolveDepthBuffer&&(k.depthBuffer&&(_t|=n.DEPTH_BUFFER_BIT),k.stencilBuffer&&k.resolveStencilBuffer&&(_t|=n.STENCIL_BUFFER_BIT)),vt){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Tt.__webglColorRenderbuffer[Ht]);let Ot=i.get(M[Ht]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ot,0)}n.blitFramebuffer(0,0,st,dt,0,0,st,dt,_t,n.NEAREST),l===!0&&(St.length=0,yt.length=0,St.push(n.COLOR_ATTACHMENT0+Ht),k.depthBuffer&&k.storeMultisampledDepthBuffer===!1&&(St.push(Ut),yt.push(Ut),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,yt)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,St))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),vt)for(let Ht=0;Ht<M.length;Ht++){e.bindFramebuffer(n.FRAMEBUFFER,Tt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ht,n.RENDERBUFFER,Tt.__webglColorRenderbuffer[Ht]);let Ot=i.get(M[Ht]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,Tt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ht,n.TEXTURE_2D,Ot,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Tt.__webglMultisampledFramebuffer)}else if(k.depthBuffer&&k.storeMultisampledDepthBuffer===!1&&l){let M=k.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[M])}}}function re(k){return Math.min(s.maxSamples,k.samples)}function Kt(k){let M=i.get(k);return k.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function j(k){let M=a.render.frame;u.get(k)!==M&&(u.set(k,M),k.update())}function Re(k,M){let st=k.colorSpace,dt=k.format,_t=k.type;return k.isCompressedTexture===!0||k.isVideoTexture===!0||st!==Ta&&st!==us&&(Ie.getTransfer(st)===He?(dt!==vi||_t!==Kn)&&de("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):fe("WebGLTextures: Unsupported texture color space:",st)),M}function xe(k){return typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement?(c.width=k.naturalWidth||k.width,c.height=k.naturalHeight||k.height):typeof VideoFrame<"u"&&k instanceof VideoFrame?(c.width=k.displayWidth,c.height=k.displayHeight):(c.width=k.width,c.height=k.height),c}this.allocateTextureUnit=K,this.resetTextureUnits=V,this.getTextureUnits=D,this.setTextureUnits=G,this.setTexture2D=ht,this.setTexture2DArray=rt,this.setTexture3D=ut,this.setTextureCube=ft,this.rebindTextures=q,this.setupRenderTarget=W,this.updateRenderTargetMipmap=pt,this.updateMultisampleRenderTarget=ee,this.setupDepthRenderbuffer=at,this.setupFrameBufferTexture=J,this.useMultisampledRTT=Kt,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function qy(n,t){function e(i,s=us){let r,a=Ie.getTransfer(s);if(i===Kn)return n.UNSIGNED_BYTE;if(i===kl)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Vl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===cd)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===ud)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===od)return n.BYTE;if(i===ld)return n.SHORT;if(i===ia)return n.UNSIGNED_SHORT;if(i===zl)return n.INT;if(i===Ci)return n.UNSIGNED_INT;if(i===xi)return n.FLOAT;if(i===Ri)return n.HALF_FLOAT;if(i===dd)return n.ALPHA;if(i===hd)return n.RGB;if(i===vi)return n.RGBA;if(i===Vi)return n.DEPTH_COMPONENT;if(i===Os)return n.DEPTH_STENCIL;if(i===Gl)return n.RED;if(i===Hl)return n.RED_INTEGER;if(i===Fs)return n.RG;if(i===Wl)return n.RG_INTEGER;if(i===$l)return n.RGBA_INTEGER;if(i===to||i===eo||i===no||i===io)if(a===He)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===to)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===eo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===no)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===io)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===to)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===eo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===no)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===io)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ql||i===Xl||i===Yl||i===jl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===ql)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Xl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Yl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===jl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Zl||i===Jl||i===Kl||i===Ql||i===tc||i===so||i===ec)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Zl||i===Jl)return a===He?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Kl)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===Ql)return r.COMPRESSED_R11_EAC;if(i===tc)return r.COMPRESSED_SIGNED_R11_EAC;if(i===so)return r.COMPRESSED_RG11_EAC;if(i===ec)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===nc||i===ic||i===sc||i===rc||i===ac||i===oc||i===lc||i===cc||i===uc||i===dc||i===hc||i===fc||i===pc||i===mc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===nc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===ic)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===sc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===rc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===ac)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===oc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===lc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===cc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===uc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===dc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===hc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===fc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===pc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===mc)return a===He?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===gc||i===_c||i===xc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===gc)return a===He?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===_c)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===xc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===vc||i===yc||i===ro||i===bc)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===vc)return r.COMPRESSED_RED_RGTC1_EXT;if(i===yc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ro)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===bc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===sa?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}var Xy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Yy=`
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

}`,zd=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let i=new Ua(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,i=new li({vertexShader:Xy,fragmentShader:Yy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ze(new Es(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},kd=class extends Ei{constructor(t,e){super();let i=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,u=null,f=null,h=null,p=null,x=null,S=typeof XRWebGLBinding<"u",m=new zd,g={},P=e.getContextAttributes(),O=null,T=null,A=[],b=[],E=new Pt,y=null,C=null,B=new xn;B.viewport=new Ke;let N=new xn;N.viewport=new Ke;let $=[B,N],V=new Nl,D=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(it){let I=A[it];return I===void 0&&(I=new Yr,A[it]=I),I.getTargetRaySpace()},this.getControllerGrip=function(it){let I=A[it];return I===void 0&&(I=new Yr,A[it]=I),I.getGripSpace()},this.getHand=function(it){let I=A[it];return I===void 0&&(I=new Yr,A[it]=I),I.getHandSpace()};function K(it){let I=b.indexOf(it.inputSource);if(I===-1)return;let L=A[I];L!==void 0&&(L.update(it.inputSource,it.frame,c||a),L.dispatchEvent({type:it.type,data:it.inputSource}))}function Z(){s.removeEventListener("select",K),s.removeEventListener("selectstart",K),s.removeEventListener("selectend",K),s.removeEventListener("squeeze",K),s.removeEventListener("squeezestart",K),s.removeEventListener("squeezeend",K),s.removeEventListener("end",Z),s.removeEventListener("inputsourceschange",ht);for(let it=0;it<A.length;it++){let I=b[it];I!==null&&(b[it]=null,A[it].disconnect(I))}D=null,G=null,m.reset();for(let it in g)delete g[it];if(t.setRenderTarget(O),p=null,h=null,f=null,s=null,T=null,Jt.stop(),i.isPresenting=!1,t.setPixelRatio(y),t.setSize(E.width,E.height,!1),C!==null){let it=C.camera;it.fov=C.fov,it.zoom=C.zoom,it.updateProjectionMatrix(),C=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(it){r=it,i.isPresenting===!0&&de("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(it){o=it,i.isPresenting===!0&&de("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(it){c=it},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return f===null&&S&&(f=new XRWebGLBinding(s,e)),f},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(it){if(s=it,s!==null){if(O=t.getRenderTarget(),s.addEventListener("select",K),s.addEventListener("selectstart",K),s.addEventListener("selectend",K),s.addEventListener("squeeze",K),s.addEventListener("squeezestart",K),s.addEventListener("squeezeend",K),s.addEventListener("end",Z),s.addEventListener("inputsourceschange",ht),P.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(E),S&&"createProjectionLayer"in XRWebGLBinding.prototype){let L=null,tt=null,J=null;P.depth&&(J=P.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,L=P.stencil?Os:Vi,tt=P.stencil?sa:Ci);let xt={colorFormat:e.RGBA8,depthFormat:J,scaleFactor:r};f=this.getBinding(),h=f.createProjectionLayer(xt),s.updateRenderState({layers:[h]}),t.setPixelRatio(1),t.setSize(h.textureWidth,h.textureHeight,!1),T=new Zn(h.textureWidth,h.textureHeight,{format:vi,type:Kn,depthTexture:new As(h.textureWidth,h.textureHeight,tt,void 0,void 0,void 0,void 0,void 0,void 0,L),stencilBuffer:P.stencil,colorSpace:t.outputColorSpace,samples:P.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1,storeMultisampledDepthBuffer:h.ignoreDepthValues===!1,storeMultisampledStencilBuffer:h.ignoreDepthValues===!1})}else{let L={antialias:P.antialias,alpha:!0,depth:P.depth,stencil:P.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,L),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),T=new Zn(p.framebufferWidth,p.framebufferHeight,{format:vi,type:Kn,colorSpace:t.outputColorSpace,stencilBuffer:P.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Jt.setContext(s),Jt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function ht(it){for(let I=0;I<it.removed.length;I++){let L=it.removed[I],tt=b.indexOf(L);tt>=0&&(b[tt]=null,A[tt].disconnect(L))}for(let I=0;I<it.added.length;I++){let L=it.added[I],tt=b.indexOf(L);if(tt===-1){for(let xt=0;xt<A.length;xt++)if(xt>=b.length){b.push(L),tt=xt;break}else if(b[xt]===null){b[xt]=L,tt=xt;break}if(tt===-1)break}let J=A[tt];J&&J.connect(L)}}let rt=new X,ut=new X;function ft(it,I,L){rt.setFromMatrixPosition(I.matrixWorld),ut.setFromMatrixPosition(L.matrixWorld);let tt=rt.distanceTo(ut),J=I.projectionMatrix.elements,xt=L.projectionMatrix.elements,ct=J[14]/(J[10]-1),at=J[14]/(J[10]+1),q=(J[9]+1)/J[5],W=(J[9]-1)/J[5],pt=(J[8]-1)/J[0],St=(xt[8]+1)/xt[0],yt=ct*pt,ee=ct*St,re=tt/(-pt+St),Kt=re*-pt;if(I.matrixWorld.decompose(it.position,it.quaternion,it.scale),it.translateX(Kt),it.translateZ(re),it.matrixWorld.compose(it.position,it.quaternion,it.scale),it.matrixWorldInverse.copy(it.matrixWorld).invert(),J[10]===-1)it.projectionMatrix.copy(I.projectionMatrix),it.projectionMatrixInverse.copy(I.projectionMatrixInverse);else{let j=ct+re,Re=at+re,xe=yt-Kt,k=ee+(tt-Kt),M=q*at/Re*j,st=W*at/Re*j;it.projectionMatrix.makePerspective(xe,k,M,st,j,Re),it.projectionMatrixInverse.copy(it.projectionMatrix).invert()}}function et(it,I){I===null?it.matrixWorld.copy(it.matrix):it.matrixWorld.multiplyMatrices(I.matrixWorld,it.matrix),it.matrixWorldInverse.copy(it.matrixWorld).invert()}this.updateCamera=function(it){if(s===null)return;let I=it.near,L=it.far;m.texture!==null&&(m.depthNear>0&&(I=m.depthNear),m.depthFar>0&&(L=m.depthFar)),V.near=N.near=B.near=I,V.far=N.far=B.far=L,(D!==V.near||G!==V.far)&&(s.updateRenderState({depthNear:V.near,depthFar:V.far}),D=V.near,G=V.far),V.layers.mask=it.layers.mask|6,B.layers.mask=V.layers.mask&-5,N.layers.mask=V.layers.mask&-3;let tt=it.parent,J=V.cameras;et(V,tt);for(let xt=0;xt<J.length;xt++)et(J[xt],tt);J.length===2?ft(V,B,N):V.projectionMatrix.copy(B.projectionMatrix),C===null&&it.isPerspectiveCamera&&(C={camera:it,fov:it.fov,zoom:it.zoom}),mt(it,V,tt)};function mt(it,I,L){L===null?it.matrix.copy(I.matrixWorld):(it.matrix.copy(L.matrixWorld),it.matrix.invert(),it.matrix.multiply(I.matrixWorld)),it.matrix.decompose(it.position,it.quaternion,it.scale),it.updateMatrixWorld(!0),it.projectionMatrix.copy(I.projectionMatrix),it.projectionMatrixInverse.copy(I.projectionMatrixInverse),it.isPerspectiveCamera&&(it.fov=$r*2*Math.atan(1/it.projectionMatrix.elements[5]),it.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(h===null&&p===null))return l},this.setFoveation=function(it){l=it,h!==null&&(h.fixedFoveation=it),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=it)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(V)},this.getCameraTexture=function(it){return g[it]};let It=null;function Gt(it,I){if(u=I.getViewerPose(c||a),x=I,u!==null){let L=u.views;p!==null&&(t.setRenderTargetFramebuffer(T,p.framebuffer),t.setRenderTarget(T));let tt=!1;L.length!==V.cameras.length&&(V.cameras.length=0,tt=!0);for(let at=0;at<L.length;at++){let q=L[at],W=null;if(p!==null)W=p.getViewport(q);else{let St=f.getViewSubImage(h,q);W=St.viewport,at===0&&(t.setRenderTargetTextures(T,St.colorTexture,St.depthStencilTexture),t.setRenderTarget(T))}let pt=$[at];pt===void 0&&(pt=new xn,pt.layers.enable(at),pt.viewport=new Ke,$[at]=pt),pt.matrix.fromArray(q.transform.matrix),pt.matrix.decompose(pt.position,pt.quaternion,pt.scale),pt.projectionMatrix.fromArray(q.projectionMatrix),pt.projectionMatrixInverse.copy(pt.projectionMatrix).invert(),pt.viewport.set(W.x,W.y,W.width,W.height),at===0&&(V.matrix.copy(pt.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),tt===!0&&V.cameras.push(pt)}let J=s.enabledFeatures;if(J&&J.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&S){f=i.getBinding();let at=f.getDepthInformation(L[0]);at&&at.isValid&&at.texture&&m.init(at,s.renderState)}if(J&&J.includes("camera-access")&&S){t.state.unbindTexture(),f=i.getBinding();for(let at=0;at<L.length;at++){let q=L[at].camera;if(q){let W=g[q];W||(W=new Ua,g[q]=W);let pt=f.getCameraImage(q);W.sourceTexture=pt}}}}for(let L=0;L<A.length;L++){let tt=b[L],J=A[L];tt!==null&&J!==void 0&&J.update(tt,I,c||a)}It&&It(it,I),I.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:I}),x=null}let Jt=new Sp;Jt.setAnimationLoop(Gt),this.setAnimationLoop=function(it){It=it},this.dispose=function(){}}},jy=new Oe,Rp=new ge;Rp.set(-1,0,0,0,1,0,0,0,1);function Zy(n,t){function e(m,g){m.matrixAutoUpdate===!0&&m.updateMatrix(),g.value.copy(m.matrix)}function i(m,g){g.color.getRGB(m.fogColor.value,_d(n)),g.isFog?(m.fogNear.value=g.near,m.fogFar.value=g.far):g.isFogExp2&&(m.fogDensity.value=g.density)}function s(m,g,P,O,T){g.isNodeMaterial?g.uniformsNeedUpdate=!1:g.isMeshBasicMaterial?r(m,g):g.isMeshLambertMaterial?(r(m,g),g.envMap&&(m.envMapIntensity.value=g.envMapIntensity)):g.isMeshToonMaterial?(r(m,g),f(m,g)):g.isMeshPhongMaterial?(r(m,g),u(m,g),g.envMap&&(m.envMapIntensity.value=g.envMapIntensity)):g.isMeshStandardMaterial?(r(m,g),h(m,g),g.isMeshPhysicalMaterial&&p(m,g,T)):g.isMeshMatcapMaterial?(r(m,g),x(m,g)):g.isMeshDepthMaterial?r(m,g):g.isMeshDistanceMaterial?(r(m,g),S(m,g)):g.isMeshNormalMaterial?r(m,g):g.isLineBasicMaterial?(a(m,g),g.isLineDashedMaterial&&o(m,g)):g.isPointsMaterial?l(m,g,P,O):g.isSpriteMaterial?c(m,g):g.isShadowMaterial?(m.color.value.copy(g.color),m.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function r(m,g){m.opacity.value=g.opacity,g.color&&m.diffuse.value.copy(g.color),g.emissive&&m.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(m.map.value=g.map,e(g.map,m.mapTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.bumpMap&&(m.bumpMap.value=g.bumpMap,e(g.bumpMap,m.bumpMapTransform),m.bumpScale.value=g.bumpScale,g.side===Hn&&(m.bumpScale.value*=-1)),g.normalMap&&(m.normalMap.value=g.normalMap,e(g.normalMap,m.normalMapTransform),m.normalScale.value.copy(g.normalScale),g.side===Hn&&m.normalScale.value.negate()),g.displacementMap&&(m.displacementMap.value=g.displacementMap,e(g.displacementMap,m.displacementMapTransform),m.displacementScale.value=g.displacementScale,m.displacementBias.value=g.displacementBias),g.emissiveMap&&(m.emissiveMap.value=g.emissiveMap,e(g.emissiveMap,m.emissiveMapTransform)),g.specularMap&&(m.specularMap.value=g.specularMap,e(g.specularMap,m.specularMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest);let P=t.get(g),O=P.envMap,T=P.envMapRotation;O&&(m.envMap.value=O,m.envMapRotation.value.setFromMatrix4(jy.makeRotationFromEuler(T)).transpose(),O.isCubeTexture&&O.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(Rp),m.reflectivity.value=g.reflectivity,m.ior.value=g.ior,m.refractionRatio.value=g.refractionRatio),g.lightMap&&(m.lightMap.value=g.lightMap,m.lightMapIntensity.value=g.lightMapIntensity,e(g.lightMap,m.lightMapTransform)),g.aoMap&&(m.aoMap.value=g.aoMap,m.aoMapIntensity.value=g.aoMapIntensity,e(g.aoMap,m.aoMapTransform))}function a(m,g){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,g.map&&(m.map.value=g.map,e(g.map,m.mapTransform))}function o(m,g){m.dashSize.value=g.dashSize,m.totalSize.value=g.dashSize+g.gapSize,m.scale.value=g.scale}function l(m,g,P,O){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,m.size.value=g.size*P,m.scale.value=O*.5,g.map&&(m.map.value=g.map,e(g.map,m.uvTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest)}function c(m,g){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,m.rotation.value=g.rotation,g.map&&(m.map.value=g.map,e(g.map,m.mapTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest)}function u(m,g){m.specular.value.copy(g.specular),m.shininess.value=Math.max(g.shininess,1e-4)}function f(m,g){g.gradientMap&&(m.gradientMap.value=g.gradientMap)}function h(m,g){m.metalness.value=g.metalness,g.metalnessMap&&(m.metalnessMap.value=g.metalnessMap,e(g.metalnessMap,m.metalnessMapTransform)),m.roughness.value=g.roughness,g.roughnessMap&&(m.roughnessMap.value=g.roughnessMap,e(g.roughnessMap,m.roughnessMapTransform)),g.envMap&&(m.envMapIntensity.value=g.envMapIntensity)}function p(m,g,P){m.ior.value=g.ior,g.sheen>0&&(m.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),m.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(m.sheenColorMap.value=g.sheenColorMap,e(g.sheenColorMap,m.sheenColorMapTransform)),g.sheenRoughnessMap&&(m.sheenRoughnessMap.value=g.sheenRoughnessMap,e(g.sheenRoughnessMap,m.sheenRoughnessMapTransform))),g.clearcoat>0&&(m.clearcoat.value=g.clearcoat,m.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(m.clearcoatMap.value=g.clearcoatMap,e(g.clearcoatMap,m.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,e(g.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(m.clearcoatNormalMap.value=g.clearcoatNormalMap,e(g.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Hn&&m.clearcoatNormalScale.value.negate())),g.dispersion>0&&(m.dispersion.value=g.dispersion),g.retroreflectivity>0&&(m.retroreflectivity.value=g.retroreflectivity),g.iridescence>0&&(m.iridescence.value=g.iridescence,m.iridescenceIOR.value=g.iridescenceIOR,m.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(m.iridescenceMap.value=g.iridescenceMap,e(g.iridescenceMap,m.iridescenceMapTransform)),g.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=g.iridescenceThicknessMap,e(g.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),g.transmission>0&&(m.transmission.value=g.transmission,m.transmissionSamplerMap.value=P.texture,m.transmissionSamplerSize.value.set(P.width,P.height),g.transmissionMap&&(m.transmissionMap.value=g.transmissionMap,e(g.transmissionMap,m.transmissionMapTransform)),m.thickness.value=g.thickness,g.thicknessMap&&(m.thicknessMap.value=g.thicknessMap,e(g.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=g.attenuationDistance,m.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(m.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(m.anisotropyMap.value=g.anisotropyMap,e(g.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=g.specularIntensity,m.specularColor.value.copy(g.specularColor),g.specularColorMap&&(m.specularColorMap.value=g.specularColorMap,e(g.specularColorMap,m.specularColorMapTransform)),g.specularIntensityMap&&(m.specularIntensityMap.value=g.specularIntensityMap,e(g.specularIntensityMap,m.specularIntensityMapTransform))}function x(m,g){g.matcap&&(m.matcap.value=g.matcap)}function S(m,g){let P=t.get(g).light;m.referencePosition.value.setFromMatrixPosition(P.matrixWorld),m.nearDistance.value=P.shadow.camera.near,m.farDistance.value=P.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Jy(n,t,e,i){let s={},r={},a=[],o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(T,A){let b=A.program;i.uniformBlockBinding(T,b)}function c(T,A){let b=s[T.id];b===void 0&&(m(T),b=u(T),s[T.id]=b,T.addEventListener("dispose",P));let E=A.program;i.updateUBOMapping(T,E);let y=t.render.frame;r[T.id]!==y&&(h(T),r[T.id]=y)}function u(T){let A=f();T.__bindingPointIndex=A;let b=n.createBuffer(),E=T.__size,y=T.usage;return n.bindBuffer(n.UNIFORM_BUFFER,b),n.bufferData(n.UNIFORM_BUFFER,E,y),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,A,b),b}function f(){for(let T=0;T<o;T++)if(a.indexOf(T)===-1)return a.push(T),T;return fe("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(T){let A=s[T.id],b=T.uniforms,E=T.__cache;n.bindBuffer(n.UNIFORM_BUFFER,A);for(let y=0,C=b.length;y<C;y++){let B=b[y];if(Array.isArray(B))for(let N=0,$=B.length;N<$;N++)p(B[N],y,N,E);else p(B,y,0,E)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function p(T,A,b,E){if(S(T,A,b,E)===!0){let y=T.__offset,C=T.value;if(Array.isArray(C)){let B=0;for(let N=0;N<C.length;N++){let $=C[N],V=g($);x($,T.__data,B),typeof $!="number"&&typeof $!="boolean"&&!$.isMatrix3&&!ArrayBuffer.isView($)&&(B+=V.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(C,T.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,y,T.__data)}}function x(T,A,b){typeof T=="number"||typeof T=="boolean"?A[0]=T:T.isMatrix3?(A[0]=T.elements[0],A[1]=T.elements[1],A[2]=T.elements[2],A[3]=0,A[4]=T.elements[3],A[5]=T.elements[4],A[6]=T.elements[5],A[7]=0,A[8]=T.elements[6],A[9]=T.elements[7],A[10]=T.elements[8],A[11]=0):ArrayBuffer.isView(T)?A.set(new T.constructor(T.buffer,T.byteOffset,A.length)):T.toArray(A,b)}function S(T,A,b,E){let y=T.value,C=A+"_"+b;if(E[C]===void 0)return typeof y=="number"||typeof y=="boolean"?E[C]=y:ArrayBuffer.isView(y)?E[C]=y.slice():E[C]=y.clone(),!0;{let B=E[C];if(typeof y=="number"||typeof y=="boolean"){if(B!==y)return E[C]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(B.equals(y)===!1)return B.copy(y),!0}}return!1}function m(T){let A=T.uniforms,b=0,E=16;for(let C=0,B=A.length;C<B;C++){let N=Array.isArray(A[C])?A[C]:[A[C]];for(let $=0,V=N.length;$<V;$++){let D=N[$],G=Array.isArray(D.value)?D.value:[D.value];for(let K=0,Z=G.length;K<Z;K++){let ht=G[K],rt=g(ht),ut=b%E,ft=ut%rt.boundary,et=ut+ft;b+=ft,et!==0&&E-et<rt.storage&&(b+=E-et),D.__data=new Float32Array(rt.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=b,b+=rt.storage}}}let y=b%E;return y>0&&(b+=E-y),T.__size=b,T.__cache={},this}function g(T){let A={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(A.boundary=4,A.storage=4):T.isVector2?(A.boundary=8,A.storage=8):T.isVector3||T.isColor?(A.boundary=16,A.storage=12):T.isVector4?(A.boundary=16,A.storage=16):T.isMatrix3?(A.boundary=48,A.storage=48):T.isMatrix4?(A.boundary=64,A.storage=64):T.isTexture?de("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(T)?(A.boundary=16,A.storage=T.byteLength):de("WebGLRenderer: Unsupported uniform value type.",T),A}function P(T){let A=T.target;A.removeEventListener("dispose",P);let b=a.indexOf(A.__bindingPointIndex);a.splice(b,1),n.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}function O(){for(let T in s)n.deleteBuffer(s[T]);a=[],s={},r={}}return{bind:l,update:c,dispose:O}}var Ky=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),qi=null;function Qy(){return qi===null&&(qi=new Da(Ky,16,16,Fs,Ri),qi.name="DFG_LUT",qi.minFilter=Pn,qi.magFilter=Pn,qi.wrapS=zi,qi.wrapT=zi,qi.generateMipmaps=!1,qi.needsUpdate=!0),qi}var la=class{constructor(t={}){let{canvas:e=Wf(),context:i=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:h=!1,outputBufferType:p=Kn}=t;this.isWebGLRenderer=!0;let x;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=i.getContextAttributes().alpha}else x=a;let S=p,m=new Set([$l,Wl,Hl]),g=new Set([Kn,Ci,ia,sa,kl,Vl]),P=new Uint32Array(4),O=new Int32Array(4),T=new X,A=null,b=null,E=[],y=[],C=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=wi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let B=this,N=!1,$=null,V=null,D=null,G=null;this._outputColorSpace=_n;let K=0,Z=0,ht=null,rt=-1,ut=null,ft=new Ke,et=new Ke,mt=null,It=new he(0),Gt=0,Jt=e.width,it=e.height,I=1,L=null,tt=null,J=new Ke(0,0,Jt,it),xt=new Ke(0,0,Jt,it),ct=!1,at=new jr,q=!1,W=!1,pt=new Oe,St=new X,yt=new Ke,ee={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},re=!1;function Kt(){return ht===null?I:1}let j=i;function Re(R,Y){return e.getContext(R,Y)}let xe,k,M,st,dt,_t,Ut,Tt,vt,bt,Ht,Ot,qt,$t,Qt,le,Bt,nt,Dt,Mt,kt,Ft,At;try{let R={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",Fe,!1),e.addEventListener("webglcontextrestored",we,!1),e.addEventListener("webglcontextcreationerror",pn,!1),j===null){let Y="webgl2";if(j=Re(Y,R),j===null)throw Re(Y)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}ne()}catch(R){throw e.removeEventListener("webglcontextlost",Fe,!1),e.removeEventListener("webglcontextrestored",we,!1),e.removeEventListener("webglcontextcreationerror",pn,!1),fe("WebGLRenderer: "+R.message),R}function ne(){xe=new av(j),xe.init(),kt=new qy(j,xe),k=new Zx(j,xe,t,kt),M=new Wy(j,xe),k.reversedDepthBuffer&&h&&M.buffers.depth.setReversed(!0),V=j.createFramebuffer(),D=j.createFramebuffer(),G=j.createFramebuffer(),st=new cv(j),dt=new Py,_t=new $y(j,xe,M,dt,k,kt,st),Ut=new rv(B),Tt=new dg(j),Ft=new Yx(j,Tt),vt=new ov(j,Tt,st,Ft),bt=new dv(j,vt,Tt,Ft,st),nt=new uv(j,k,_t),Qt=new Jx(dt),Ht=new Ry(B,Ut,xe,k,Ft,Qt),Ot=new Zy(B,dt),qt=new Dy,$t=new By(xe),Bt=new Xx(B,Ut,M,bt,x,l),le=new Hy(B,bt,k),At=new Jy(j,st,k,M),Dt=new jx(j,xe,st),Mt=new lv(j,xe,st),st.programs=Ht.programs,B.capabilities=k,B.extensions=xe,B.properties=dt,B.renderLists=qt,B.shadowMap=le,B.state=M,B.info=st}S!==Kn&&(C=new fv(S,e.width,e.height,o,s,r));let te=new kd(B,j);this.xr=te,this.getContext=function(){return j},this.getContextAttributes=function(){return j.getContextAttributes()},this.forceContextLoss=function(){let R=xe.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){let R=xe.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return I},this.setPixelRatio=function(R){R!==void 0&&(I=R,this.setSize(Jt,it,!1))},this.getSize=function(R){return R.set(Jt,it)},this.setSize=function(R,Y,w=!0){if(te.isPresenting){de("WebGLRenderer: Can't change size while VR device is presenting.");return}Jt=R,it=Y,e.width=Math.floor(R*I),e.height=Math.floor(Y*I),w===!0&&(e.style.width=R+"px",e.style.height=Y+"px"),C!==null&&C.setSize(e.width,e.height),this.setViewport(0,0,R,Y)},this.getDrawingBufferSize=function(R){return R.set(Jt*I,it*I).floor()},this.setDrawingBufferSize=function(R,Y,w){Jt=R,it=Y,I=w,e.width=Math.floor(R*w),e.height=Math.floor(Y*w),this.setViewport(0,0,R,Y)},this.setEffects=function(R){if(S===Kn){fe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let Y=0;Y<R.length;Y++)if(R[Y].isOutputPass===!0){de("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}C.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(ft)},this.getViewport=function(R){return R.copy(J)},this.setViewport=function(R,Y,w,F){R.isVector4?J.set(R.x,R.y,R.z,R.w):J.set(R,Y,w,F),M.viewport(ft.copy(J).multiplyScalar(I).round())},this.getScissor=function(R){return R.copy(xt)},this.setScissor=function(R,Y,w,F){R.isVector4?xt.set(R.x,R.y,R.z,R.w):xt.set(R,Y,w,F),M.scissor(et.copy(xt).multiplyScalar(I).round())},this.getScissorTest=function(){return ct},this.setScissorTest=function(R){M.setScissorTest(ct=R)},this.setOpaqueSort=function(R){L=R},this.setTransparentSort=function(R){tt=R},this.getClearColor=function(R){return R.copy(Bt.getClearColor())},this.setClearColor=function(){Bt.setClearColor(...arguments)},this.getClearAlpha=function(){return Bt.getClearAlpha()},this.setClearAlpha=function(){Bt.setClearAlpha(...arguments)},this.clear=function(R=!0,Y=!0,w=!0){let F=0;if(R){let U=!1;if(ht!==null){let lt=ht.texture.format;U=m.has(lt)}if(U){let lt=ht.texture.type,Et=g.has(lt),gt=Bt.getClearColor(),Lt=Bt.getClearAlpha(),Vt=gt.r,Wt=gt.g,se=gt.b;Et?(P[0]=Vt,P[1]=Wt,P[2]=se,P[3]=Lt,j.clearBufferuiv(j.COLOR,0,P)):(O[0]=Vt,O[1]=Wt,O[2]=se,O[3]=Lt,j.clearBufferiv(j.COLOR,0,O))}else F|=j.COLOR_BUFFER_BIT}Y&&(F|=j.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),w&&(F|=j.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F!==0&&j.clear(F)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),$=R},this.dispose=function(){e.removeEventListener("webglcontextlost",Fe,!1),e.removeEventListener("webglcontextrestored",we,!1),e.removeEventListener("webglcontextcreationerror",pn,!1),Bt.dispose(),qt.dispose(),$t.dispose(),dt.dispose(),Ut.dispose(),bt.dispose(),Ft.dispose(),At.dispose(),Ht.dispose(),te.dispose(),te.removeEventListener("sessionstart",$s),te.removeEventListener("sessionend",ps),Wn.stop()};function Fe(R){R.preventDefault(),pd("WebGLRenderer: Context Lost."),N=!0}function we(){pd("WebGLRenderer: Context Restored."),N=!1;let R=st.autoReset,Y=le.enabled,w=le.autoUpdate,F=le.needsUpdate,U=le.type;ne(),st.autoReset=R,le.enabled=Y,le.autoUpdate=w,le.needsUpdate=F,le.type=U}function pn(R){fe("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Qe(R){let Y=R.target;Y.removeEventListener("dispose",Qe),Ce(Y)}function Ce(R){Fn(R),dt.remove(R)}function Fn(R){let Y=dt.get(R).programs;Y!==void 0&&(Y.forEach(function(w){Ht.releaseProgram(w)}),R.isShaderMaterial&&Ht.releaseShaderCache(R))}this.renderBufferDirect=function(R,Y,w,F,U,lt){Y===null&&(Y=ee);let Et=U.isMesh&&U.matrixWorld.determinantAffine()<0,gt=Di(R,Y,w,F,U);M.setMaterial(F,Et);let Lt=w.index,Vt=1;if(F.wireframe===!0){if(Lt=vt.getWireframeAttribute(w),Lt===void 0)return;Vt=2}let Wt=w.drawRange,se=w.attributes.position,Yt=Wt.start*Vt,ve=(Wt.start+Wt.count)*Vt;lt!==null&&(Yt=Math.max(Yt,lt.start*Vt),ve=Math.min(ve,(lt.start+lt.count)*Vt)),Lt!==null?(Yt=Math.max(Yt,0),ve=Math.min(ve,Lt.count)):se!=null&&(Yt=Math.max(Yt,0),ve=Math.min(ve,se.count));let Ue=ve-Yt;if(Ue<0||Ue===1/0)return;Ft.setup(U,F,gt,w,Lt);let ce,be=Dt;if(Lt!==null&&(ce=Tt.get(Lt),be=Mt,be.setIndex(ce)),U.isMesh)F.wireframe===!0?(M.setLineWidth(F.wireframeLinewidth*Kt()),be.setMode(j.LINES)):be.setMode(j.TRIANGLES);else if(U.isLine){let je=F.linewidth;je===void 0&&(je=1),M.setLineWidth(je*Kt()),U.isLineSegments?be.setMode(j.LINES):U.isLineLoop?be.setMode(j.LINE_LOOP):be.setMode(j.LINE_STRIP)}else U.isPoints?be.setMode(j.POINTS):U.isSprite&&be.setMode(j.TRIANGLES);if(U.isBatchedMesh)if(xe.get("WEBGL_multi_draw"))be.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else{let je=U._multiDrawStarts,jt=U._multiDrawCounts,tn=U._multiDrawCount,Ae=Lt?Tt.get(Lt).bytesPerElement:1,an=dt.get(F).currentProgram.getUniforms();for(let hi=0;hi<tn;hi++)an.setValue(j,"_gl_DrawID",hi),be.render(je[hi]/Ae,jt[hi])}else if(U.isInstancedMesh)be.renderInstances(Yt,Ue,U.count);else if(w.isInstancedBufferGeometry){let je=w._maxInstanceCount!==void 0?w._maxInstanceCount:1/0,jt=Math.min(w.instanceCount,je);be.renderInstances(Yt,Ue,jt)}else be.render(Yt,Ue)};function di(R,Y,w,F){$!==null&&R.isNodeMaterial&&$.setObject(F,R),q===!0&&Qt.setState(R,w,!1),R.transparent===!0&&R.side===dn&&R.forceSinglePass===!1?(R.side=Hn,R.needsUpdate=!0,ni(R,Y,F),R.side=Ls,R.needsUpdate=!0,ni(R,Y,F),R.side=dn):ni(R,Y,F)}this.compile=function(R,Y,w=null){w===null&&(w=R),$!==null&&$.renderStart(R,Y,w),b=$t.get(w),b.init(Y),y.push(b),w.traverseVisible(function(U){U.isLight&&U.layers.test(Y.layers)&&(b.pushLight(U),U.castShadow&&b.pushShadow(U))}),R!==w&&R.traverseVisible(function(U){U.isLight&&U.layers.test(Y.layers)&&(b.pushLight(U),U.castShadow&&b.pushShadow(U))}),b.setupLights(),$!==null&&$.updateLights(b.state.lightsArray),W=this.localClippingEnabled,q=Qt.init(this.clippingPlanes,W),q===!0&&Qt.setGlobalState(this.clippingPlanes,Y),$!==null&&le.render(b.state.shadowsArray,w,Y);let F=new Set;return R.traverse(function(U){if(!(U.isMesh||U.isPoints||U.isLine||U.isSprite))return;let lt=U.material;if(lt)if(Array.isArray(lt))for(let Et=0;Et<lt.length;Et++){let gt=lt[Et];di(gt,w,Y,U),F.add(gt)}else di(lt,w,Y,U),F.add(lt)}),b=y.pop(),$!==null&&$.renderEnd(),F},this.compileAsync=function(R,Y,w=null){let F=this.compile(R,Y,w);return new Promise(U=>{function lt(){if(F.forEach(function(Et){let Lt=dt.get(Et).currentProgram;(Lt===void 0||Lt.isReady())&&F.delete(Et)}),F.size===0){U(R);return}setTimeout(lt,10)}xe.get("KHR_parallel_shader_compile")!==null?lt():setTimeout(lt,10)})};let Pi=null;function Ii(R){Pi&&Pi(R)}function $s(){Wn.stop()}function ps(){Wn.start()}let Wn=new Sp;Wn.setAnimationLoop(Ii),typeof self<"u"&&Wn.setContext(self),this.setAnimationLoop=function(R){Pi=R,te.setAnimationLoop(R),R===null?Wn.stop():Wn.start()},te.addEventListener("sessionstart",$s),te.addEventListener("sessionend",ps),this.render=function(R,Y){if(Y!==void 0&&Y.isCamera!==!0){fe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;$!==null&&$.renderStart(R,Y);let w=te.enabled===!0&&te.isPresenting===!0,F=C!==null&&(ht===null||w)&&C.begin(B,ht);if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),Y.parent===null&&Y.matrixWorldAutoUpdate===!0&&Y.updateMatrixWorld(),te.enabled===!0&&te.isPresenting===!0&&(C===null||C.isCompositing()===!1)&&(te.cameraAutoUpdate===!0&&te.updateCamera(Y),Y=te.getCamera()),R.isScene===!0&&R.onBeforeRender(B,R,Y,ht),b=$t.get(R,y.length),b.init(Y),b.state.textureUnits=_t.getTextureUnits(),y.push(b),pt.multiplyMatrices(Y.projectionMatrix,Y.matrixWorldInverse),at.setFromProjectionMatrix(pt,Ai,Y.reversedDepth),W=this.localClippingEnabled,q=Qt.init(this.clippingPlanes,W),A=qt.get(R,E.length),A.init(),E.push(A),te.enabled===!0&&te.isPresenting===!0){let Et=B.xr.getDepthSensingMesh();Et!==null&&$n(Et,Y,-1/0,B.sortObjects)}$n(R,Y,0,B.sortObjects),A.finish(),$!==null&&$.updateLights(b.state.lightsArray),B.sortObjects===!0&&A.sort(L,tt),re=te.enabled===!1||te.isPresenting===!1||te.hasDepthSensing()===!1,re&&Bt.addToRenderList(A,R),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),q===!0&&Qt.beginShadows();let U=b.state.shadowsArray;if(le.render(U,R,Y),q===!0&&Qt.endShadows(),(F&&C.hasRenderPass())===!1){let Et=A.opaque,gt=A.transmissive;if(b.setupLights(),Y.isArrayCamera){let Lt=Y.cameras;if(gt.length>0)for(let Vt=0,Wt=Lt.length;Vt<Wt;Vt++){let se=Lt[Vt];mr(Et,gt,R,se)}re&&Bt.render(R);for(let Vt=0,Wt=Lt.length;Vt<Wt;Vt++){let se=Lt[Vt];Bn(A,R,se,se.viewport)}}else gt.length>0&&mr(Et,gt,R,Y),re&&Bt.render(R),Bn(A,R,Y)}ht!==null&&Z===0&&(_t.updateMultisampleRenderTarget(ht),_t.updateRenderTargetMipmap(ht)),F&&C.end(B),R.isScene===!0&&R.onAfterRender(B,R,Y),Ft.resetDefaultState(),rt=-1,ut=null,y.pop(),y.length>0?(b=y[y.length-1],_t.setTextureUnits(b.state.textureUnits),q===!0&&Qt.setGlobalState(B.clippingPlanes,b.state.camera)):b=null,E.pop(),E.length>0?A=E[E.length-1]:A=null,$!==null&&$.renderEnd()};function $n(R,Y,w,F){if(R.visible===!1)return;if(R.layers.test(Y.layers)){if(R.isGroup)w=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(Y);else if(R.isLightProbeGrid)b.pushLightProbeGrid(R);else if(R.isLight)b.pushLight(R),R.castShadow&&b.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||R.intersectsFrustum(at)){F&&yt.setFromMatrixPosition(R.matrixWorld).applyMatrix4(pt);let Et=bt.update(R),gt=R.material;gt.visible&&A.push(R,Et,gt,w,yt.z,null,Y)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||R.intersectsFrustum(at))){let Et=bt.update(R),gt=R.material;if(F&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),yt.copy(R.boundingSphere.center)):(Et.boundingSphere===null&&Et.computeBoundingSphere(),yt.copy(Et.boundingSphere.center)),yt.applyMatrix4(R.matrixWorld).applyMatrix4(pt)),Array.isArray(gt)){let Lt=Et.groups;for(let Vt=0,Wt=Lt.length;Vt<Wt;Vt++){let se=Lt[Vt],Yt=gt[se.materialIndex];Yt&&Yt.visible&&A.push(R,Et,Yt,w,yt.z,se,Y)}}else gt.visible&&A.push(R,Et,gt,w,yt.z,null,Y)}}let lt=R.children;for(let Et=0,gt=lt.length;Et<gt;Et++)$n(lt[Et],Y,w,F)}function Bn(R,Y,w,F){let{opaque:U,transmissive:lt,transparent:Et}=R;b.setupLightsView(w),q===!0&&Qt.setGlobalState(B.clippingPlanes,w),F&&M.viewport(ft.copy(F)),U.length>0&&qn(U,Y,w),lt.length>0&&qn(lt,Y,w),Et.length>0&&qn(Et,Y,w),M.buffers.depth.setTest(!0),M.buffers.depth.setMask(!0),M.buffers.color.setMask(!0),M.setPolygonOffset(!1)}function mr(R,Y,w,F){if((w.isScene===!0?w.overrideMaterial:null)!==null)return;if(b.state.transmissionRenderTarget[F.id]===void 0){let Yt=xe.has("EXT_color_buffer_half_float")||xe.has("EXT_color_buffer_float");b.state.transmissionRenderTarget[F.id]=new Zn(1,1,{generateMipmaps:!0,type:Yt?Ri:Kn,minFilter:Us,samples:Math.max(4,k.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ie.workingColorSpace})}let lt=b.state.transmissionRenderTarget[F.id],Et=F.viewport||ft;lt.setSize(Et.z*B.transmissionResolutionScale,Et.w*B.transmissionResolutionScale);let gt=B.getRenderTarget(),Lt=B.getActiveCubeFace(),Vt=B.getActiveMipmapLevel();B.setRenderTarget(lt),B.getClearColor(It),Gt=B.getClearAlpha(),Gt<1&&B.setClearColor(16777215,.5),B.clear(),re&&Bt.render(w);let Wt=B.toneMapping;B.toneMapping=wi;let se=F.viewport;if(F.viewport!==void 0&&(F.viewport=void 0),b.setupLightsView(F),q===!0&&Qt.setGlobalState(B.clippingPlanes,F),qn(R,w,F),_t.updateMultisampleRenderTarget(lt),_t.updateRenderTargetMipmap(lt),xe.has("WEBGL_multisampled_render_to_texture")===!1){let Yt=!1;for(let ve=0,Ue=Y.length;ve<Ue;ve++){let ce=Y[ve],{object:be,geometry:je,material:jt,group:tn}=ce;if(jt.side===dn&&be.layers.test(F.layers)){let Ae=jt.side;jt.side=Hn,jt.needsUpdate=!0,rn(be,w,F,je,jt,tn),jt.side=Ae,jt.needsUpdate=!0,Yt=!0}}Yt===!0&&(_t.updateMultisampleRenderTarget(lt),_t.updateRenderTargetMipmap(lt))}B.setRenderTarget(gt,Lt,Vt),B.setClearColor(It,Gt),se!==void 0&&(F.viewport=se),B.toneMapping=Wt}function qn(R,Y,w){let F=Y.isScene===!0?Y.overrideMaterial:null;for(let U=0,lt=R.length;U<lt;U++){let Et=R[U],{object:gt,geometry:Lt,group:Vt}=Et,Wt=Et.material;Wt.allowOverride===!0&&F!==null&&(Wt=F),gt.layers.test(w.layers)&&rn(gt,Y,w,Lt,Wt,Vt)}}function rn(R,Y,w,F,U,lt){$!==null&&U.isNodeMaterial&&$.setObject(R,U),R.onBeforeRender(B,Y,w,F,U,lt),R.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),U.onBeforeRender(B,Y,w,F,R,lt),U.transparent===!0&&U.side===dn&&U.forceSinglePass===!1?(U.side=Hn,U.needsUpdate=!0,B.renderBufferDirect(w,Y,F,U,R,lt),U.side=Ls,U.needsUpdate=!0,B.renderBufferDirect(w,Y,F,U,R,lt),U.side=dn):B.renderBufferDirect(w,Y,F,U,R,lt),R.onAfterRender(B,Y,w,F,U,lt)}function ni(R,Y,w){Y.isScene!==!0&&(Y=ee);let F=dt.get(R),U=b.state.lights,lt=b.state.shadowsArray,Et=U.state.version,gt=Ht.getParameters(R,U.state,lt,Y,w,b.state.lightProbeGridArray),Lt=Ht.getProgramCacheKey(gt),Vt=F.programs;F.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?Y.environment:null,F.fog=Y.fog;let Wt=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;F.envMap=Ut.get(R.envMap||F.environment,Wt),F.envMapRotation=F.environment!==null&&R.envMap===null?Y.environmentRotation:R.envMapRotation,Vt===void 0&&(R.addEventListener("dispose",Qe),Vt=new Map,F.programs=Vt);let se=Vt.get(Lt);if(se!==void 0){if(F.currentProgram===se&&F.lightsStateVersion===Et)return Ln(R,gt),se}else gt.uniforms=Ht.getUniforms(R),$!==null&&R.isNodeMaterial&&$.build(R,w,gt),R.onBeforeCompile(gt,B),se=Ht.acquireProgram(gt,Lt),Vt.set(Lt,se),F.uniforms=gt.uniforms;let Yt=F.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Yt.clippingPlanes=Qt.uniform),Ln(R,gt),F.needsLights=Se(R),F.lightsStateVersion=Et,F.needsLights&&(Yt.ambientLightColor.value=U.state.ambient,Yt.lightProbe.value=U.state.probe,Yt.sunLights.value=U.state.sun,Yt.sunLightShadows.value=U.state.sunShadow,Yt.directionalLights.value=U.state.directional,Yt.directionalLightShadows.value=U.state.directionalShadow,Yt.spotLights.value=U.state.spot,Yt.spotLightShadows.value=U.state.spotShadow,Yt.rectAreaLights.value=U.state.rectArea,Yt.ltc_1.value=U.state.rectAreaLTC1,Yt.ltc_2.value=U.state.rectAreaLTC2,Yt.pointLights.value=U.state.point,Yt.pointLightShadows.value=U.state.pointShadow,Yt.hemisphereLights.value=U.state.hemi,Yt.sunShadowMatrix.value=U.state.sunShadowMatrix,Yt.sunShadowCascade.value=U.state.sunShadowCascade,Yt.directionalShadowMatrix.value=U.state.directionalShadowMatrix,Yt.spotLightMatrix.value=U.state.spotLightMatrix,Yt.spotLightMap.value=U.state.spotLightMap,Yt.pointShadowMatrix.value=U.state.pointShadowMatrix),F.lightProbeGrid=b.state.lightProbeGridArray.length>0,F.currentProgram=se,F.uniformsList=null,se}function Xn(R){if(R.uniformsList===null){let Y=R.currentProgram.getUniforms();R.uniformsList=oa.seqWithValue(Y.seq,R.uniforms)}return R.uniformsList}function Ln(R,Y){let w=dt.get(R);w.outputColorSpace=Y.outputColorSpace,w.batching=Y.batching,w.batchingColor=Y.batchingColor,w.instancing=Y.instancing,w.instancingColor=Y.instancingColor,w.instancingMorph=Y.instancingMorph,w.skinning=Y.skinning,w.morphTargets=Y.morphTargets,w.morphNormals=Y.morphNormals,w.morphColors=Y.morphColors,w.morphTargetsCount=Y.morphTargetsCount,w.numClippingPlanes=Y.numClippingPlanes,w.numIntersection=Y.numClipIntersection,w.vertexAlphas=Y.vertexAlphas,w.vertexTangents=Y.vertexTangents,w.toneMapping=Y.toneMapping}function qs(R,Y){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;T.setFromMatrixPosition(Y.matrixWorld);for(let w=0,F=R.length;w<F;w++){let U=R[w];if(U.texture!==null&&U.boundingBox.containsPoint(T))return U}return null}function Di(R,Y,w,F,U){Y.isScene!==!0&&(Y=ee),_t.resetTextureUnits();let lt=Y.fog,Et=F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial?Y.environment:null,gt=ht===null?B.outputColorSpace:ht.isXRRenderTarget===!0?ht.texture.colorSpace:Ie.workingColorSpace,Lt=F.isMeshStandardMaterial||F.isMeshLambertMaterial&&!F.envMap||F.isMeshPhongMaterial&&!F.envMap,Vt=Ut.get(F.envMap||Et,Lt),Wt=F.vertexColors===!0&&!!w.attributes.color&&w.attributes.color.itemSize===4,se=!!w.attributes.tangent&&(!!F.normalMap||F.anisotropy>0),Yt=!!w.morphAttributes.position,ve=!!w.morphAttributes.normal,Ue=!!w.morphAttributes.color,ce=wi;F.toneMapped&&(ht===null||ht.isXRRenderTarget===!0)&&(ce=B.toneMapping);let be=w.morphAttributes.position||w.morphAttributes.normal||w.morphAttributes.color,je=be!==void 0?be.length:0,jt=dt.get(F),tn=b.state.lights;if(q===!0&&(W===!0||R!==ut)){let We=R===ut&&F.id===rt;Qt.setState(F,R,We)}let Ae=!1;F.version===jt.__version?(jt.needsLights&&jt.lightsStateVersion!==tn.state.version||jt.outputColorSpace!==gt||U.isBatchedMesh&&jt.batching===!1||!U.isBatchedMesh&&jt.batching===!0||U.isBatchedMesh&&jt.batchingColor===!0&&U._colorsTexture===null||U.isBatchedMesh&&jt.batchingColor===!1&&U._colorsTexture!==null||U.isInstancedMesh&&jt.instancing===!1||!U.isInstancedMesh&&jt.instancing===!0||U.isSkinnedMesh&&jt.skinning===!1||!U.isSkinnedMesh&&jt.skinning===!0||U.isInstancedMesh&&jt.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&jt.instancingColor===!1&&U.instanceColor!==null||U.isInstancedMesh&&jt.instancingMorph===!0&&U.morphTexture===null||U.isInstancedMesh&&jt.instancingMorph===!1&&U.morphTexture!==null||jt.envMap!==Vt||F.fog===!0&&jt.fog!==lt||jt.numClippingPlanes!==void 0&&(jt.numClippingPlanes!==Qt.numPlanes||jt.numIntersection!==Qt.numIntersection)||jt.vertexAlphas!==Wt||jt.vertexTangents!==se||jt.morphTargets!==Yt||jt.morphNormals!==ve||jt.morphColors!==Ue||jt.toneMapping!==ce||jt.morphTargetsCount!==je||!!jt.lightProbeGrid!=b.state.lightProbeGridArray.length>0)&&(Ae=!0):(Ae=!0,jt.__version=F.version);let an=jt.currentProgram;Ae===!0&&(an=ni(F,Y,U),$&&F.isNodeMaterial&&$.onUpdateProgram(F,an,jt));let hi=!1,Yn=!1,Li=!1,Be=an.getUniforms(),en=jt.uniforms;if(M.useProgram(an.program)&&(hi=!0,Yn=!0,Li=!0),F.id!==rt&&(rt=F.id,Yn=!0),jt.needsLights){let We=qs(b.state.lightProbeGridArray,U);jt.lightProbeGrid!==We&&(jt.lightProbeGrid=We,Yn=!0)}if(hi||ut!==R){M.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Be.setValue(j,"projectionMatrix",R.projectionMatrix),Be.setValue(j,"viewMatrix",R.matrixWorldInverse);let Sn=Be.map.cameraPosition;Sn!==void 0&&Sn.setValue(j,St.setFromMatrixPosition(R.matrixWorld)),k.logarithmicDepthBuffer&&Be.setValue(j,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(F.isMeshPhongMaterial||F.isMeshToonMaterial||F.isMeshLambertMaterial||F.isMeshBasicMaterial||F.isMeshStandardMaterial||F.isShaderMaterial)&&Be.setValue(j,"isOrthographic",R.isOrthographicCamera===!0),ut!==R&&(ut=R,Yn=!0,Li=!0)}if(jt.needsLights&&(tn.state.sunShadowMap.length>0&&Be.setValue(j,"sunShadowMap",tn.state.sunShadowMap,_t),tn.state.directionalShadowMap.length>0&&Be.setValue(j,"directionalShadowMap",tn.state.directionalShadowMap,_t),tn.state.spotShadowMap.length>0&&Be.setValue(j,"spotShadowMap",tn.state.spotShadowMap,_t),tn.state.pointShadowMap.length>0&&Be.setValue(j,"pointShadowMap",tn.state.pointShadowMap,_t)),U.isSkinnedMesh){Be.setOptional(j,U,"bindMatrix"),Be.setOptional(j,U,"bindMatrixInverse");let We=U.skeleton;We&&(We.boneTexture===null&&We.computeBoneTexture(),Be.setValue(j,"boneTexture",We.boneTexture,_t))}U.isBatchedMesh&&(Be.setOptional(j,U,"batchingTexture"),Be.setValue(j,"batchingTexture",U._matricesTexture,_t),Be.setOptional(j,U,"batchingIdTexture"),Be.setValue(j,"batchingIdTexture",U._indirectTexture,_t),Be.setOptional(j,U,"batchingColorTexture"),U._colorsTexture!==null&&Be.setValue(j,"batchingColorTexture",U._colorsTexture,_t));let fi=w.morphAttributes;if((fi.position!==void 0||fi.normal!==void 0||fi.color!==void 0)&&nt.update(U,w,an),(Yn||jt.receiveShadow!==U.receiveShadow)&&(jt.receiveShadow=U.receiveShadow,Be.setValue(j,"receiveShadow",U.receiveShadow)),(F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial)&&F.envMap===null&&Y.environment!==null&&(en.envMapIntensity.value=Y.environmentIntensity),en.dfgLUT!==void 0&&(en.dfgLUT.value=Qy()),Yn){if(Be.setValue(j,"toneMappingExposure",B.toneMappingExposure),jt.needsLights&&Ne(en,Li),lt&&F.fog===!0&&Ot.refreshFogUniforms(en,lt),Ot.refreshMaterialUniforms(en,F,I,it,b.state.transmissionRenderTarget[R.id]),jt.needsLights&&jt.lightProbeGrid){let We=jt.lightProbeGrid;en.probesSH.value=We.texture,en.probesMin.value.copy(We.boundingBox.min),en.probesMax.value.copy(We.boundingBox.max),en.probesResolution.value.copy(We.resolution)}oa.upload(j,Xn(jt),en,_t)}if(F.isShaderMaterial&&F.uniformsNeedUpdate===!0&&(oa.upload(j,Xn(jt),en,_t),F.uniformsNeedUpdate=!1),F.isSpriteMaterial&&Be.setValue(j,"center",U.center),Be.setValue(j,"modelViewMatrix",U.modelViewMatrix),Be.setValue(j,"normalMatrix",U.normalMatrix),Be.setValue(j,"modelMatrix",U.matrixWorld),F.uniformsGroups!==void 0){let We=F.uniformsGroups;for(let Sn=0,ii=We.length;Sn<ii;Sn++){let Xs=We[Sn];At.update(Xs,an),At.bind(Xs,an)}}return an}function Ne(R,Y){R.ambientLightColor.needsUpdate=Y,R.lightProbe.needsUpdate=Y,R.sunLights.needsUpdate=Y,R.sunLightShadows.needsUpdate=Y,R.directionalLights.needsUpdate=Y,R.directionalLightShadows.needsUpdate=Y,R.pointLights.needsUpdate=Y,R.pointLightShadows.needsUpdate=Y,R.spotLights.needsUpdate=Y,R.spotLightShadows.needsUpdate=Y,R.rectAreaLights.needsUpdate=Y,R.hemisphereLights.needsUpdate=Y}function Se(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return K},this.getActiveMipmapLevel=function(){return Z},this.getRenderTarget=function(){return ht},this.setRenderTargetTextures=function(R,Y,w){let F=dt.get(R);F.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,F.__autoAllocateDepthBuffer===!1&&(F.__useRenderToTexture=!1),dt.get(R.texture).__webglTexture=Y,dt.get(R.depthTexture).__webglTexture=F.__autoAllocateDepthBuffer?void 0:w,F.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,Y){let w=dt.get(R);w.__webglFramebuffer=Y,w.__useDefaultFramebuffer=Y===void 0},this.setRenderTarget=function(R,Y=0,w=0){ht=R,K=Y,Z=w;let F=null,U=!1,lt=!1;if(R){let gt=dt.get(R);if(gt.__useDefaultFramebuffer!==void 0){M.bindFramebuffer(j.FRAMEBUFFER,gt.__webglFramebuffer),ft.copy(R.viewport),et.copy(R.scissor),mt=R.scissorTest,M.viewport(ft),M.scissor(et),M.setScissorTest(mt),rt=-1;return}else if(gt.__webglFramebuffer===void 0)_t.setupRenderTarget(R);else if(gt.__hasExternalTextures)_t.rebindTextures(R,dt.get(R.texture).__webglTexture,dt.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){let Wt=R.depthTexture;if(gt.__boundDepthTexture!==Wt){if(Wt!==null&&dt.has(Wt)&&(R.width!==Wt.image.width||R.height!==Wt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");_t.setupDepthRenderbuffer(R)}}let Lt=R.texture;(Lt.isData3DTexture||Lt.isDataArrayTexture||Lt.isCompressedArrayTexture)&&(lt=!0);let Vt=dt.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Vt[Y])?F=Vt[Y][w]:F=Vt[Y],U=!0):R.samples>0&&_t.useMultisampledRTT(R)===!1?F=dt.get(R).__webglMultisampledFramebuffer:Array.isArray(Vt)?F=Vt[w]:F=Vt,ft.copy(R.viewport),et.copy(R.scissor),mt=R.scissorTest}else ft.copy(J).multiplyScalar(I).floor(),et.copy(xt).multiplyScalar(I).floor(),mt=ct;if(w!==0&&(F=V),M.bindFramebuffer(j.FRAMEBUFFER,F)&&M.drawBuffers(R,F),M.viewport(ft),M.scissor(et),M.setScissorTest(mt),U){let gt=dt.get(R.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_CUBE_MAP_POSITIVE_X+Y,gt.__webglTexture,w)}else if(lt){let gt=Y;for(let Lt=0;Lt<R.textures.length;Lt++){let Vt=dt.get(R.textures[Lt]);j.framebufferTextureLayer(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0+Lt,Vt.__webglTexture,w,gt)}}else if(R!==null&&w!==0){let gt=dt.get(R.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,gt.__webglTexture,w)}rt=-1};function Je(R){let Y=dt.get(R);return(Y.__readFormat!==R.format||Y.__readType!==R.type)&&(Y.__readFormat=R.format,Y.__readType=R.type,Y.__formatReadable=k.textureFormatReadable(R.format),Y.__typeReadable=k.textureTypeReadable(R.type)),Y}this.readRenderTargetPixels=function(R,Y,w,F,U,lt,Et,gt=0){if(!(R&&R.isWebGLRenderTarget)){fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Lt=dt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Et!==void 0&&(Lt=Lt[Et]),Lt){M.bindFramebuffer(j.FRAMEBUFFER,Lt);try{let Vt=R.textures[gt],Wt=Vt.format,se=Vt.type;R.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+gt);let Yt=Je(Vt);if(Yt.__formatReadable===!1){fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Yt.__typeReadable===!1){fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Y>=0&&Y<=R.width-F&&w>=0&&w<=R.height-U&&j.readPixels(Y,w,F,U,kt.convert(Wt),kt.convert(se),lt)}finally{let Vt=ht!==null?dt.get(ht).__webglFramebuffer:null;M.bindFramebuffer(j.FRAMEBUFFER,Vt)}}},this.readRenderTargetPixelsAsync=async function(R,Y,w,F,U,lt,Et,gt=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Lt=dt.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Et!==void 0&&(Lt=Lt[Et]),Lt)if(Y>=0&&Y<=R.width-F&&w>=0&&w<=R.height-U){M.bindFramebuffer(j.FRAMEBUFFER,Lt);let Vt=R.textures[gt],Wt=Vt.format,se=Vt.type;R.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+gt);let Yt=Je(Vt);if(Yt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Yt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ve=j.createBuffer();j.bindBuffer(j.PIXEL_PACK_BUFFER,ve),j.bufferData(j.PIXEL_PACK_BUFFER,lt.byteLength,j.STREAM_READ),j.readPixels(Y,w,F,U,kt.convert(Wt),kt.convert(se),0),j.bindBuffer(j.PIXEL_PACK_BUFFER,null);let Ue=ht!==null?dt.get(ht).__webglFramebuffer:null;M.bindFramebuffer(j.FRAMEBUFFER,Ue);let ce=j.fenceSync(j.SYNC_GPU_COMMANDS_COMPLETE,0);return j.flush(),await qf(j,ce,4),j.bindBuffer(j.PIXEL_PACK_BUFFER,ve),j.getBufferSubData(j.PIXEL_PACK_BUFFER,0,lt),j.bindBuffer(j.PIXEL_PACK_BUFFER,null),j.deleteBuffer(ve),j.deleteSync(ce),lt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,Y=null,w=0){let F=Math.pow(2,-w),U=Math.floor(R.image.width*F),lt=Math.floor(R.image.height*F),Et=Y!==null?Y.x:0,gt=Y!==null?Y.y:0;_t.setTexture2D(R,0),j.copyTexSubImage2D(j.TEXTURE_2D,w,0,0,Et,gt,U,lt),M.unbindTexture()},this.copyTextureToTexture=function(R,Y,w=null,F=null,U=0,lt=0){let Et,gt,Lt,Vt,Wt,se,Yt,ve,Ue,ce=R.isCompressedTexture?R.mipmaps[lt]:R.image;if(w!==null)Et=w.max.x-w.min.x,gt=w.max.y-w.min.y,Lt=w.isBox3?w.max.z-w.min.z:1,Vt=w.min.x,Wt=w.min.y,se=w.isBox3?w.min.z:0;else{let en=Math.pow(2,-U);Et=Math.floor(ce.width*en),gt=Math.floor(ce.height*en),R.isDataArrayTexture?Lt=ce.depth:R.isData3DTexture?Lt=Math.floor(ce.depth*en):Lt=1,Vt=0,Wt=0,se=0}F!==null?(Yt=F.x,ve=F.y,Ue=F.z):(Yt=0,ve=0,Ue=0);let be=kt.convert(Y.format),je=kt.convert(Y.type),jt;Y.isData3DTexture?(_t.setTexture3D(Y,0),jt=j.TEXTURE_3D):Y.isDataArrayTexture||Y.isCompressedArrayTexture?(_t.setTexture2DArray(Y,0),jt=j.TEXTURE_2D_ARRAY):(_t.setTexture2D(Y,0),jt=j.TEXTURE_2D),M.activeTexture(j.TEXTURE0),M.pixelStorei(j.UNPACK_FLIP_Y_WEBGL,Y.flipY),M.pixelStorei(j.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Y.premultiplyAlpha),M.pixelStorei(j.UNPACK_ALIGNMENT,Y.unpackAlignment);let tn=M.getParameter(j.UNPACK_ROW_LENGTH),Ae=M.getParameter(j.UNPACK_IMAGE_HEIGHT),an=M.getParameter(j.UNPACK_SKIP_PIXELS),hi=M.getParameter(j.UNPACK_SKIP_ROWS),Yn=M.getParameter(j.UNPACK_SKIP_IMAGES);M.pixelStorei(j.UNPACK_ROW_LENGTH,ce.width),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,ce.height),M.pixelStorei(j.UNPACK_SKIP_PIXELS,Vt),M.pixelStorei(j.UNPACK_SKIP_ROWS,Wt),M.pixelStorei(j.UNPACK_SKIP_IMAGES,se);let Li=R.isDataArrayTexture||R.isData3DTexture,Be=Y.isDataArrayTexture||Y.isData3DTexture;if(R.isDepthTexture){let en=dt.get(R),fi=dt.get(Y),We=dt.get(en.__renderTarget),Sn=dt.get(fi.__renderTarget);M.bindFramebuffer(j.READ_FRAMEBUFFER,We.__webglFramebuffer),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,Sn.__webglFramebuffer);for(let ii=0;ii<Lt;ii++)Li&&(j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,dt.get(R).__webglTexture,U,se+ii),j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,dt.get(Y).__webglTexture,lt,Ue+ii)),j.blitFramebuffer(Vt,Wt,Et,gt,Yt,ve,Et,gt,j.DEPTH_BUFFER_BIT,j.NEAREST);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else if(U!==0||R.isRenderTargetTexture||dt.has(R)){let en=dt.get(R),fi=dt.get(Y);M.bindFramebuffer(j.READ_FRAMEBUFFER,D),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,G);for(let We=0;We<Lt;We++)Li?j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,en.__webglTexture,U,se+We):j.framebufferTexture2D(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,en.__webglTexture,U),Be?j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,fi.__webglTexture,lt,Ue+We):j.framebufferTexture2D(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,fi.__webglTexture,lt),U!==0?j.blitFramebuffer(Vt,Wt,Et,gt,Yt,ve,Et,gt,j.COLOR_BUFFER_BIT,j.NEAREST):Be?j.copyTexSubImage3D(jt,lt,Yt,ve,Ue+We,Vt,Wt,Et,gt):j.copyTexSubImage2D(jt,lt,Yt,ve,Vt,Wt,Et,gt);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else Be?R.isDataTexture||R.isData3DTexture?j.texSubImage3D(jt,lt,Yt,ve,Ue,Et,gt,Lt,be,je,ce.data):Y.isCompressedArrayTexture?j.compressedTexSubImage3D(jt,lt,Yt,ve,Ue,Et,gt,Lt,be,ce.data):j.texSubImage3D(jt,lt,Yt,ve,Ue,Et,gt,Lt,be,je,ce):R.isDataTexture?j.texSubImage2D(j.TEXTURE_2D,lt,Yt,ve,Et,gt,be,je,ce.data):R.isCompressedTexture?j.compressedTexSubImage2D(j.TEXTURE_2D,lt,Yt,ve,ce.width,ce.height,be,ce.data):j.texSubImage2D(j.TEXTURE_2D,lt,Yt,ve,Et,gt,be,je,ce);M.pixelStorei(j.UNPACK_ROW_LENGTH,tn),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,Ae),M.pixelStorei(j.UNPACK_SKIP_PIXELS,an),M.pixelStorei(j.UNPACK_SKIP_ROWS,hi),M.pixelStorei(j.UNPACK_SKIP_IMAGES,Yn),lt===0&&Y.generateMipmaps&&j.generateMipmap(jt),M.unbindTexture()},this.initRenderTarget=function(R){dt.get(R).__webglFramebuffer===void 0&&_t.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?_t.setTextureCube(R,0):R.isData3DTexture?_t.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?_t.setTexture2DArray(R,0):_t.setTexture2D(R,0),M.unbindTexture()},this.resetState=function(){K=0,Z=0,ht=null,M.reset(),Ft.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ai}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Ie._getDrawingBufferColorSpace(t),e.unpackColorSpace=Ie._getUnpackColorSpace()}};var Pp={type:"change"},Gd={type:"start"},Dp={type:"end"},Ic=new Ss,Ip=new kn,tb=Math.cos(70*hn.DEG2RAD),Mn=new X,Qn=2*Math.PI,$e={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Vd=1e-6,ua=class extends Za{constructor(t,e=null){super(t,e),this.state=$e.NONE,this.target=new X,this.cursor=new X,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Is.ROTATE,MIDDLE:Is.DOLLY,RIGHT:Is.PAN},this.touches={ONE:Ds.ROTATE,TWO:Ds.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new X,this._lastQuaternion=new In,this._lastTargetPosition=new X,this._quat=new In().setFromUnitVectors(t.up,new X(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ta,this._sphericalDelta=new ta,this._scale=1,this._panOffset=new X,this._rotateStart=new Pt,this._rotateEnd=new Pt,this._rotateDelta=new Pt,this._panStart=new Pt,this._panEnd=new Pt,this._panDelta=new Pt,this._dollyStart=new Pt,this._dollyEnd=new Pt,this._dollyDelta=new Pt,this._dollyDirection=new X,this._mouse=new Pt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=nb.bind(this),this._onPointerDown=eb.bind(this),this._onPointerUp=ib.bind(this),this._onContextMenu=ub.bind(this),this._onMouseWheel=ab.bind(this),this._onKeyDown=ob.bind(this),this._onTouchStart=lb.bind(this),this._onTouchMove=cb.bind(this),this._onMouseDown=sb.bind(this),this._onMouseMove=rb.bind(this),this._interceptControlDown=db.bind(this),this._interceptControlUp=hb.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=$e.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Pp),this.update(),this.state=$e.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;Mn.copy(e).sub(this.target),Mn.applyQuaternion(this._quat),this._spherical.setFromVector3(Mn),this.autoRotate&&this.state===$e.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=Qn:i>Math.PI&&(i-=Qn),s<-Math.PI?s+=Qn:s>Math.PI&&(s-=Qn),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Mn.setFromSpherical(this._spherical),Mn.applyQuaternion(this._quatInverse),e.copy(this.target).add(Mn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Mn.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new X(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new X(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Mn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Ic.origin.copy(this.object.position),Ic.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ic.direction))<tb?this.object.lookAt(this.target):(Ip.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ic.intersectPlane(Ip,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Vd||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Vd||this._lastTargetPosition.distanceToSquared(this.target)>Vd?(this.dispatchEvent(Pp),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Qn/60*this.autoRotateSpeed*t:Qn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Mn.setFromMatrixColumn(e,0),Mn.multiplyScalar(-t),this._panOffset.add(Mn)}_panUp(t,e){this.screenSpacePanning===!0?Mn.setFromMatrixColumn(e,1):(Mn.setFromMatrixColumn(e,0),Mn.crossVectors(this.object.up,Mn)),Mn.multiplyScalar(t),this._panOffset.add(Mn)}_pan(t,e){let i=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Mn.copy(s).sub(this.target);let r=Mn.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/i.clientHeight,this.object.matrix),this._panUp(2*e*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),s=t-i.left,r=e-i.top,a=i.width,o=i.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Qn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Qn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Qn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Qn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Qn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Qn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(i,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let i=this._getSecondPointerPosition(t),s=.5*(t.pageX+i.x),r=.5*(t.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Qn*this._rotateDelta.x/e.clientHeight),this._rotateUp(Qn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Pt,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}};function eb(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function nb(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function ib(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Dp),this.state=$e.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function sb(n){let t;switch(n.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Is.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=$e.DOLLY;break;case Is.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=$e.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=$e.ROTATE}break;case Is.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=$e.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=$e.PAN}break;default:this.state=$e.NONE}this.state!==$e.NONE&&this.dispatchEvent(Gd)}function rb(n){switch(this.state){case $e.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case $e.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case $e.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function ab(n){this.enabled===!1||this.enableZoom===!1||this.state!==$e.NONE||(n.preventDefault(),this.dispatchEvent(Gd),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(Dp))}function ob(n){this.enabled!==!1&&this._handleKeyDown(n)}function lb(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case Ds.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=$e.TOUCH_ROTATE;break;case Ds.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=$e.TOUCH_PAN;break;default:this.state=$e.NONE}break;case 2:switch(this.touches.TWO){case Ds.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=$e.TOUCH_DOLLY_PAN;break;case Ds.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=$e.TOUCH_DOLLY_ROTATE;break;default:this.state=$e.NONE}break;default:this.state=$e.NONE}this.state!==$e.NONE&&this.dispatchEvent(Gd)}function cb(n){switch(this._trackPointer(n),this.state){case $e.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case $e.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case $e.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case $e.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=$e.NONE}}function ub(n){this.enabled!==!1&&n.preventDefault()}function db(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function hb(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var um=Js(Xd());var ho=Js(Xp()),Ji=n=>String(n??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function tS(n,t){return n.tipo==="seletora"?String(t):n.tipo==="emergencia"?t?"acionado":"solto":n.tipo==="botao"?t?"pressionado":"solto":n.tipo==="falha"?t?"em falha":"normal":["supervisor","fusivel","energia"].includes(n.tipo)?t?n.estados[0]:n.estados[1]:t?"ativo":"inativo"}function Yp({CR:n,comTag:t,painel:e,pintar:i,aviso:s,aoMudar:r,relogio:a=!0}){let o=n.interacao.controles,l=new Map(o.map(y=>[y.id,y])),c=()=>Object.fromEntries(o.map(y=>[y.id,y.inicial])),u=c(),f=null,h=null,p=[];for(let y of t){let C=String(y.userData.tag),B=(n.porta||[]).find(N=>N.meshTag===C);B&&l.has(B.id)?p.push({mesh:y,tipo:"controle",id:B.id}):B?p.push({mesh:y,tipo:"indicador",sinal:B.id,porta:!0}):n.placa&&n.placa[C]&&p.push({mesh:y,tipo:"indicador",sinal:n.placa[C]})}let x=y=>(n.modelo.rotulos||{})[y]||l.get(y)?.rotulo||y;function S(y=0){let C=(0,ho.entradasDaInteracao)(n.modelo,u);f=(0,ho.avaliar)(n.modelo,C,f,y),y&&(f=(0,ho.avaliar)(n.modelo,C,f,0))}let m=y=>!!(f&&f.saidas[y]);function g(){let y=o.filter(V=>V.local==="porta"),C=o.filter(V=>V.local!=="porta"),B=V=>`<span class="cr-pill${m(V)?" cr-on":""}" title="${Ji(x(V))}">${Ji(V)}</span>`,N=Object.keys(f?f.saidas:{}).filter(V=>!V.endsWith(".bobina")),$=[["Sinaleiros",N.filter(V=>/^H\d+$/.test(V))],["Relés e temporizadores",N.filter(V=>/^K/.test(V))],["Acionamentos e cargas",N.filter(V=>/\.(RUN|FALHA)$|^YV\d+$|^KM/.test(V))],["Saídas para o campo",N.filter(V=>(n.modelo.saidasCampo||[]).some(D=>D.tag===V))]];return`<div class="cr">
      <div class="cr-sub">Porta</div>
      ${y.map(V=>`<div class="cr-lin"><span>${Ji(V.rotulo)}</span><span>${V.acoes.map(D=>`<button data-cr="${Ji(V.id)}" data-acao="${Ji(D.id)}" class="${u[V.id]===D.para?"cr-at":""}">${Ji(V.tipo==="seletora"?D.para:D.rotulo.split(" (")[0])}</button>`).join("")}</span></div>`).join("")}
      <div class="cr-sub">Campo e falhas</div>
      ${C.map(V=>`<label class="cr-lin"><span>${Ji(V.rotulo)}</span><input type="checkbox" data-crchk="${Ji(V.id)}" ${u[V.id]===V.estados[1]?"checked":""}></label>`).join("")}
      ${$.filter(V=>V[1].length).map(([V,D])=>`<div class="cr-sub">${Ji(V)}</div><div class="cr-pills">${D.map(B).join("")}</div>`).join("")}
      ${f&&!f.estavel?'<div class="cr-aviso">A lógica oscila — confira o diagrama.</div>':""}
      <div class="cr-sub">Cenários da verificação funcional (${(n.cenarios||[]).filter(V=>V.ok).length}/${(n.cenarios||[]).length})</div>
      <ol class="cr-cen">${(n.cenarios||[]).map((V,D)=>`<li class="${V.ok?"cr-ok":"cr-falha"}${h===D?" cr-at":""}"><button data-cen="${D}">Aplicar</button> ${V.ok?"✔":"✖"} ${Ji(V.nome)}</li>`).join("")}</ol>
    </div>`}function P(){for(let y of p)y.tipo==="indicador"?i(y.mesh,m(y.sinal),y.porta?null:"#2fbf5a"):l.get(y.id)?.tipo==="emergencia"&&i(y.mesh,u[y.id]==="acionado","#ff3b30");e&&(e.innerHTML=g()),r&&r()}function O(y,C){let B=l.get(y);if(!B)return null;let N=B.acoes.find(V=>V.id===C),$=N?N.para:B.estados.includes(C)?C:null;return $==null?null:(u[y]=$,h=null,S(),P(),`${B.rotulo}: ${$}`)}function T(y){let C=p.find($=>$.mesh===y&&$.tipo==="controle");if(!C)return null;let B=l.get(C.id),N=B.estados.indexOf(u[C.id]);return O(C.id,B.estados[(N+1)%B.estados.length])}function A(y){let C=(n.cenarios||[])[y];if(!C)return null;u=c();for(let[N,$]of Object.entries(C.entradas||{}))l.has(N)&&(u[N]=tS(l.get(N),$));f=null,S();for(let N of C.passos||[])N.aguardar_s&&S(Number(N.aguardar_s));h=y;let B=Object.entries(C.espera||{}).filter(([N,$])=>!!(N in f.saidas?f.saidas[N]:f.entradas[N])!=!!$).map(([N])=>N);return P(),`${C.nome}: ${B.length?`diferente em ${B.join(", ")}`:"atendido"}`}e&&(e.addEventListener("click",y=>{let C=y.target.closest("button");if(!C)return;let B=C.dataset.cen!=null?A(Number(C.dataset.cen)):C.dataset.cr?O(C.dataset.cr,C.dataset.acao):null;B&&s&&s(B)}),e.addEventListener("change",y=>{let C=y.target.dataset?.crchk;if(!C)return;let B=l.get(C),N=O(C,y.target.checked?B.estados[1]:B.estados[0]);N&&s&&s(N)}));let b=(n.modelo.temporizadores||[]).length>0,E=a&&b?setInterval(()=>{S(1),P()},1e3):null;return S(),P(),{pecas:p,cliqueMesh:T,acionar:O,aplicarCenario:A,render:P,estado:()=>({estados:{...u},saidas:f?{...f.saidas}:{},estavel:f?f.estavel:!0}),passarTempo:y=>{S(y),P()},parar:()=>{E&&clearInterval(E)}}}var kc=Js(Zp()),im=Js(Xd()),fn=Js(Qd());var Bc=n=>n!=null&&n!==""?`${n} A`:"corrente a definir",sm=n=>n?.idn_ma!=null?`${n.idn_ma} mA`:n?.lido?"sensibilidade a conferir":"30 mA";var zt=n=>String(n??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Vs=(n,t=2)=>Number(n).toLocaleString("pt-BR",{minimumFractionDigits:t,maximumFractionDigits:t}),fS={interruptor_simples:"Interruptor simples",interruptor_paralelo:"Interruptores paralelos (three-way)",interruptor_intermediario:"Paralelos + intermediário (four-way)",pulsador_rele_impulso:"Pulsadores com relé de impulso",contator_botoeira:"Contator com botoeira liga/desliga e selo",sensor_presenca:"Sensor de presença",dimmer:"Dimmer",dimmer_010:"Controlador 0-10 V",dali:"DALI-2",cena:"DALI-2 com teclado de cenas"};function pS(n,t){let e=`${n||""}|${(t.quadros||[]).map(s=>s.tag).join(",")}|${(t.circuitos||[]).map(s=>s.id).join(",")}`,i=0;for(let s=0;s<e.length;s++)i=i*31+e.charCodeAt(s)|0;return`hm3d-sim:${(i>>>0).toString(36)}`}function Vc(n,t){let e=(0,kc.criarSimulador)(n),i=pS(t,n);try{let s=window.sessionStorage.getItem(i);s&&e.importar(JSON.parse(s))}catch{}return e.assinar(()=>{try{window.sessionStorage.setItem(i,JSON.stringify(e.exportar()))}catch{}}),e}var mS=["100 %","60 %","30 %","Desligado"];function zc(n,t,{titulo:e=!1}={}){let i=n.comando(t);if(!i)return"";let s=n.estadoComando(i.id),r=Array.isArray(s.cenas);if(!r&&i.tipo!=="cena")return"";let a=(i.dispositivos||[])[0]??(i.pontos||[])[0];if(a==null)return"";let o=r?s.cenas:mS,l=(c,u)=>`<button class="sim-b${s.cena===c?" ativo":""}" data-sim="cena" data-ponto="${zt(a)}" data-cena="${c}" data-def="${r?1:0}">${zt(u)}</button>`;return`${e?`<span>Cenas · ${zt(i.ambiente||i.id)}</span>`:""}${o.map((c,u)=>l(u,c)).join("")}${r?l(-1,"Desligar"):""}`}var ye=(n,t)=>t==null||t===""?"":`<tr><th>${zt(n)}</th><td>${t}</td></tr>`,th=(n,t="ligado",e="desligado")=>`<b class="${n?"sim-on":"sim-off"}">${n?t:e}</b>`;function eh(n,t,{abrir:e=!0}={}){let i=n.circuito(t);if(!i)return"";let s=n.quadro(i.quadro),r=(s?.disjuntores||[]).find(u=>u.tag===i.disjuntor),a=(s?.drs||[]).filter(u=>!u.ddr&&(u.circuitos||[]).map(String).includes(String(i.id))),o=(s?.drs||[]).some(u=>u.ddr&&u.tag===i.disjuntor),l=(u,f)=>{let h=n.ligado(u,f);return`<button class="sim-b" data-sim="disjuntor" data-tag="${zt(u)}" data-quadro="${zt(f)}">${h?"Desligar":"Ligar"} ${zt(u)}</button>`},c=n.motivo(i.id);return`<div class="sim-circ"><div class="sim-tit">Circuito ${zt(i.id)}${i.descricao?` — ${zt(i.descricao)}`:""}</div>
<table>${ye("Estado",c?`<b class="sim-off">sem energia</b> <small>(${zt(c)})</small>`:'<b class="sim-on">energizado</b>')}
${s?.geral?ye(`Geral ${s.geral.tag}`,`${th(n.ligado(s.geral.tag,s.tag))} · ${zt(Bc(s.geral.In))}`):""}
${a.map(u=>ye(`DR ${u.tag}`,`${th(n.ligado(u.tag,s.tag))} · ${zt(sm(u))}`)).join("")}
${r?ye(`${o?"DDR":"Disjuntor"} ${r.tag}`,`${th(n.ligado(r.tag,s.tag))} · ${zt(Bc(r.In))}${r.curva?` curva ${zt(r.curva)}`:""}${r.polos?` · ${zt(r.polos)}P`:""}`):""}
${ye("Quadro",zt(i.quadro))}
${i.origem==="diagrama"?ye("Origem","diagrama unifilar / quadro de cargas do projeto"):i.estimado?ye("Origem","<small>estimado pelo desenho — conferir</small>"):""}
${i.lidoNaPlanta?ye("Ligação",`<small>${zt(i.lidoNaPlanta)} ponto(s) pelo número lido na planta — a conferir</small>`):""}
${Number(i.potencia_va)>0?ye("Potência",`${Vs(i.potencia_va,0)} VA`):Number(i.potencia_w)>0?ye("Potência",`${Vs(i.potencia_w,0)} W`):""}
${i.ib_a!=null?ye("Corrente de projeto Ib",`${Vs(i.ib_a,1)} A`):""}
${i.secao_mm2!=null?ye("Seção",`${Vs(i.secao_mm2,1)} mm²`):""}
${i.queda_pct!=null?ye("Queda de tensão",`${Vs(i.queda_pct,2)} %${i.comprimento_m!=null?` em ${Vs(i.comprimento_m,0)} m`:""}`):""}</table>
<div class="sim-bs">${r?l(r.tag,s.tag):""}${a.map(u=>l(u.tag,s.tag)).join("")}${s&&e?`<button class="sim-b" data-sim="abrir-quadro" data-quadro="${zt(s.tag)}">Abrir o quadro ${zt(s.tag)}</button>`:""}</div></div>`}function Gc(n){if(!n)return"";let t=n.sinaleiros,e=(s,r,a)=>`<span class="sim-luz ${s?"acesa":""}" style="--c:${r}" title="${zt(a)}"><i></i>${zt(a)}</span>`,i=(s,r,a="")=>`<button class="sim-b ${a}" data-sim="motor" data-motor="${zt(n.id)}" data-acao="${s}">${r}</button>`;return`<div class="sim-painel"><div class="sim-tit">Painel de comando — ${zt(n.id)}${n.descricao?` <small>${zt(n.descricao)}</small>`:""}</div>
<div class="sim-luzes">${e(t.branco,"#f5f5f5","ENERGIZADO")}${e(t.verde,"#3fb950","EM OPERAÇÃO")}${e(t.amarelo,"#f2c94c","ALARME")}${e(t.vermelho,"#e5484d","FALHA / EMERGÊNCIA")}</div>
<div class="sim-est">${n.girando?'<b class="sim-on">motor em operação</b>':`<b class="sim-off">parado</b>${n.alimentado?"":` <small>(${zt(n.motivo)})</small>`}`} · contator ${n.contator?"fechado (selo)":"aberto"} · relé térmico ${n.termico?'<b class="sim-off">DESARMADO</b>':"armado"}</div>
<div class="sim-bs">${i("liga","LIGA","liga")}${i("desliga","DESLIGA","desliga")}${n.emergenciaLocal?i("liberar","Soltar emergência","emerg"):i("emergencia","EMERGÊNCIA","emerg")}
${n.termico?i("rearmar","Rearmar térmico"):i("desarmar_termico","Simular térmico desarmado")}</div></div>`}function gS(n,t){let e=n.estadoComando(t.id);return Array.isArray(e.cenas)?ye("Cena",zt(e.cenaAtiva||(e.saida>0?"nível manual":"desligado"))):t.tipo==="cena"?ye("Cena",zt(e.saida>0?`${Math.round(e.saida*100)} %`:"desligado")):""}function rm(n,t,{rotulo:e="",ambiente:i=""}={}){let s=n.ponto(t);if(!s)return"";let r=n.estadoPonto(t),a=s.comando?n.comando(s.comando):null,o=a&&(a.dispositivos||[]).map(String).includes(String(t)),l=`${zt(e||kc.ROTULO_PONTO[s.tipo]||s.tipo)} · ${zt(s.id)}`,c=r.energizado?"sim-on":"sim-off",u="";if(a){let h=n.estadoComando(a.id);if(a.tipo==="contator_botoeira"){let p=(x,S,m="")=>`<button class="sim-b ${m}" data-sim="acionar" data-ponto="${zt(o?t:a.dispositivos?.[0]??t)}" data-acao="${x}">${S}</button>`;u=`${p("liga","LIGA","liga")}${p("desliga","DESLIGA","desliga")}${h.emergencia?p("liberar","Soltar emergência","emerg"):p("emergencia","EMERGÊNCIA","emerg")}`}else if(a.tipo==="cena")u=zc(n,a.id);else if(["dimmer","dimmer_010","dali"].includes(a.tipo))u=`${zc(n,a.id)}<button class="sim-b" data-sim="acionar" data-ponto="${zt(t)}">${h.saida>0?"Desligar":"Ligar"}</button>${[.25,.5,1].map(p=>`<button class="sim-b" data-sim="acionar" data-ponto="${zt(t)}" data-nivel="${p}">${p*100} %</button>`).join("")}`;else{let p=s.tipo==="pulsador"?"Apertar o pulsador":s.tipo==="sensor"?h.presenca?"Simular ambiente vazio":"Simular presença":s.tipo==="teclado_cena"?"Próxima cena":o?"Acionar":`Acionar o comando ${zt(a.id)}`;u=`<button class="sim-b" data-sim="acionar" data-ponto="${zt(t)}">${p}</button>`}}let f=s.tipo==="motor"?n.painel(s.circuito):null;return`<div class="sim-tit grande">${l}</div>
<div class="sim-est"><b class="${c}">${zt(r.texto)}</b>${i?` · ${zt(i)}`:""}${s.circuitoLido==="a_conferir"?" · <small>circuito lido na planta, a conferir</small>":""}</div>
${a?`<table>${ye("Comando",`${zt(a.id)} — ${zt(fS[a.tipo]||a.tipo)}`)}${gS(n,a)}${s.grupo?ye("Grupo",zt(s.grupo)):""}${a.rele?.tag?ye(a.rele.tipo==="impulso"?"Relé de impulso":"Contator",`${zt(a.rele.tag)} · ${n.estadoComando(a.id).saida>0?"fechado":"aberto"}`):""}${ye("Dispositivos",zt((a.dispositivos||[]).join(", ")))}${ye("Comanda",`${(a.pontos||[]).length} ponto(s)`)}</table>`:""}
${u?`<div class="sim-bs">${u}</div>`:""}${f?Gc(f):""}${s.circuito?eh(n,s.circuito):""}`}var _S={kva:["Potência","kVA"],potencia_kva:["Potência","kVA"],tensao_kv:["Tensão","kV"],tensao_primaria_kv:["Tensão primária","kV"],tensao_secundaria_v:["Tensão secundária","V"],tensao_v:["Tensão","V"],corrente_a:["Corrente","A"],corrente_nominal_a:["Corrente nominal","A"],secao_mm2:["Seção","mm²"],icc_ka:["Capacidade de interrupção","kA"],nbi_kv:["NBI","kV"],polos:["Polos",""],isolamento:["Isolamento",""],largura_m:["Largura","m"],comprimento_m:["Comprimento","m"],altura_m:["Altura","m"],profundidade_m:["Profundidade","m"],diametro_m:["Diâmetro","m"],material:["Material",""],classe:["Classe",""],capacidade:["Capacidade",""],tipo:["Tipo",""],modelo:["Modelo",""],fabricante:["Fabricante",""]},xS={relacao:"relação de materiais",relacao_materiais:"relação de materiais","relação de materiais":"relação de materiais",lista:"relação de materiais",legenda:"legenda do projeto",balao:"balão na planta",balão:"balão na planta",bloco:"bloco do desenho",layer:"layer do desenho",unifilar:"diagrama unifilar",diagrama:"diagrama unifilar",texto:"texto da planta",nota:"nota do projeto",memorial:"memorial"},vS=n=>{let t=String(n??""),[e,...i]=t.split(":"),s=xS[e.trim().toLowerCase()];return s?[s,i.join(":").trim()].filter(Boolean).join(": "):t},em=n=>typeof n=="number"?Vs(n,Number.isInteger(n)?0:2):typeof n=="boolean"?n?"sim":"não":String(n);function nh(n,{rotulo:t="",ambiente:e="",altura:i="",objeto:s=""}={}){if(!n)return"";let r=n.especificacao&&typeof n.especificacao=="object"?n.especificacao:{},a=Object.entries(r).filter(([u,f])=>f!=null&&f!==""&&typeof f!="object"&&!["texto","descricao"].includes(u)).map(([u,f])=>{let[h,p]=_S[u]||[u.replace(/_/g," "),""];return ye(h,`${zt(em(f))}${p?` ${zt(p)}`:""}`)}).join(""),o=n.quantidade!=null&&n.quantidade!==""?`${zt(em(n.quantidade))}${n.unidade?` ${zt(n.unidade)}`:""}`:"",l=n.posicao==="desenho"?"na planta do projeto":n.posicao==="patio"?"sem posição na planta — no pátio ao lado":"sem posição na planta — no lugar típico do tipo",c=Array.isArray(n.dimensoes_m)?n.dimensoes_m.map(u=>Vs(u)).join(" × "):"";return`<div class="sim-tit">${zt(n.descricao||t)}${n.conferir?' <b class="sim-off">[CONFERIR]</b>':""}</div>
<table>${ye("Item da relação",n.item!=null&&n.item!==""?`nº ${zt(n.item)}`:"")}${ye("Quantidade no projeto",o)}
${n.especificacaoTexto?ye("Especificação",zt(n.especificacaoTexto)):""}${a}
${ye("Fonte",(n.fontes||[]).map(u=>zt(vS(u))).join(" · "))}
${ye("Posição",n.posicaoAConferir?`<b class="sim-off">a conferir</b> <small>(${zt(l)})</small>`:zt(l))}
${ye("Local",zt([e,i].filter(Boolean).join(" · ")))}${s?ye("Peça no 3D",zt(s)):""}
${n.servico?ye("Serviço",zt(n.servico)):""}${n.motivo?ye("Observação",`<small>${zt(n.motivo)}</small>`):""}
${ye("Forma no 3D",`<small>${zt(n.rotuloForma||n.forma||"")}${c?` · ${zt(c)} m`:""} — dimensões ilustrativas (típicas)</small>`)}</table>`}function am(n,t){let e=n.quadro(t);if(!e)return"";let i=(a,o,l)=>{let c=n.ligado(a,e.tag);return`<button class="sim-dj ${c?"on":"off"}" data-sim="disjuntor" data-tag="${zt(a)}" data-quadro="${zt(e.tag)}" title="${c?"Desligar":"Ligar"} ${zt(a)}"><i></i><b>${zt(a)}</b><span>${zt(o)}${l?` <small>${zt(l)}</small>`:""}</span></button>`},s=a=>n.circuito(a),r=n.paineis().filter(a=>String(a.quadro)===String(e.tag));return`<div class="sim-lista">${e.geral?i(e.geral.tag,`Geral ${Bc(e.geral.In)}`,""):""}
${(e.drs||[]).filter(a=>!a.ddr).map(a=>i(a.tag,`DR ${a.In!=null?`${a.In} A · `:""}${sm(a)}`,`circuitos ${(a.circuitos||[]).join(", ")}`)).join("")}
${(e.disjuntores||[]).map(a=>{let o=s(a.circuito);return i(a.tag,`${Bc(a.In)} — circuito ${a.circuito}`,o?.descricao||"")}).join("")}</div>
${r.length?`<div class="sim-bs"><button class="sim-b emerg" data-sim="emergencia-quadro" data-quadro="${zt(e.tag)}">${n.emergenciaDoQuadro(e.tag)?"Soltar a emergência do quadro":"EMERGÊNCIA do quadro"}</button></div>${r.map(Gc).join("")}`:""}
<div class="sim-bs"><button class="sim-b" data-sim="reiniciar">Religar tudo (estado inicial)</button></div>`}function da(n,t,{abrirQuadro:e,aviso:i}={}){n.addEventListener("click",s=>{let r=s.target.closest("[data-sim]");if(!r||!n.contains(r))return;s.stopPropagation();let a=r.dataset,o=null;if(a.sim==="disjuntor")t.alternar(a.tag,a.quadro),o=`${a.tag} ${t.ligado(a.tag,a.quadro)?"ligado":"desligado"}`;else if(a.sim==="acionar")o=t.acionar(a.ponto,a.nivel!=null?Number(a.nivel):a.acao||void 0);else if(a.sim==="cena")o=t.acionar(a.ponto,a.def==="1"?{cena:Number(a.cena)}:Number(a.cena));else if(a.sim==="motor")o=t.motor(a.motor,a.acao);else if(a.sim==="emergencia-quadro"){let l=!t.emergenciaDoQuadro(a.quadro);t.emergenciaQuadro(a.quadro,l),o=l?"Emergência do quadro acionada: motores parados":"Emergência do quadro liberada"}else a.sim==="reiniciar"?(t.reiniciar(),o="Simulação reiniciada"):a.sim==="abrir-quadro"&&e&&e(a.quadro);o&&i&&i(o)})}function Hc(){let n=document.createElement("div");n.className="sim-aviso",document.body.appendChild(n);let t=0;return e=>{n.textContent=e,n.classList.add("visivel"),clearTimeout(t),t=setTimeout(()=>n.classList.remove("visivel"),2600)}}function om(n,t){return(0,im.montarQuadroEsquematico)(n,{circuito:e=>t?t.circuito(e):null})}function lm(n,{titulo:t=""}={}){return!Array.isArray(n)||!n.length?"":`${t?`<div class="sim-tit">${zt(t)}</div>`:""}<table class="fiel"><thead><tr><th>Dado</th><th>Valor</th><th>Fonte</th></tr></thead><tbody>${n.map(e=>`<tr${e.conferir?' class="conferir"':""}><th>${zt(e.campo)}</th><td>${e.conferir?`<b class="sim-off">${zt(e.valor)}</b>`:zt(e.valor)}</td><td><small>${zt(e.fonte)}</small></td></tr>`).join("")}</tbody></table>`}var nm={F:"Fase",N:"Neutro",PE:"Terra (PE)",dados:"Dados (cordão)",laco:"Laço / zona","24V":"Alimentação 24 Vcc",bateria:"Bateria"};function cm(n,{energizado:t=null}={}){if(!n)return"";let e=n.secao_mm2?`${String(n.secao_mm2).replace(".",",")} mm²`:"[CONFERIR] — não consta no projeto";return`<div class="sim-tit">${zt(nm[n.funcao]||n.funcao)}${n.fase?` ${zt(n.fase)}`:""}${n.circuito!=null?` — circuito ${zt(n.circuito)}`:""}</div>
<table>${ye("Função",zt(`${nm[n.funcao]||n.funcao}${n.fase?` (${n.fase})`:n.funcao==="F"?" (fase não consta no projeto)":""}`))}
${ye("Seção",n.secao_mm2?`${zt(e)} <small>(${zt(n.secao_fonte||"projeto")})</small>`:`<b class="sim-off">${zt(e)}</b>`)}
${ye("Origem",zt(n.de||""))}${ye("Destino",zt(n.para||""))}
${n.d_mm?ye("Diâmetro no 3D",`${zt(String(n.d_mm).replace(".",","))} mm <small>(pela seção; ilustrativo)</small>`):""}
${t==null?"":ye("Estado",t?'<b class="sim-on">energizado</b>':n.funcao==="PE"?"aterrado (o PE não é seccionado)":'<b class="sim-off">sem tensão</b>')}
${(n.conferir||[]).length?ye("Conferir",`<small>${n.conferir.map(zt).join("; ")}</small>`):""}</table>`}var yS={energizado:"sim-on",apagado:"sim-off",aberto:"sim-off",falha:"sim-off",alarme:"sim-off",alerta:"sim-off",normal:"sim-on",armado:"sim-on"};function pr(n,t,{titulo:e=!0}={}){return n?(Array.isArray(t)?t:[t]).filter(s=>n.tem(s)).map(s=>{let r=n.situacao(s),a=n.acoes(s);return`<div class="sim-circ">${e?`<div class="sim-tit">${zt(r.rotulo)}</div>`:""}<table>${ye("Estado",`<b class="${yS[r.aparencia]||""}">${zt(r.texto)}</b>`)}
${["fonte","serie"].includes(n.equipamento(s).interacao.regra)?ye("Tensão a montante",r.tensao?'<b class="sim-on">presente</b>':'<b class="sim-off">ausente</b>'):""}
${r.motivo?ye("Por quê",`<small>${zt(r.motivo)}</small>`):""}${r.nota?ye("Ligação",`<small>${zt(r.nota)}</small>`):""}</table>
${a.length?`<div class="sim-bs">${a.map(o=>`<button class="sim-b${o.permitida?"":" recusa"}" data-int="${zt(o.alvo)}" data-acao="${zt(o.id)}" title="${zt(o.permitida?o.rotulo:o.motivo)}">${zt(o.rotulo)}</button>`).join("")}</div>`:""}</div>`}).join(""):""}function po(n,t,{aviso:e}={}){n.addEventListener("click",i=>{let s=i.target.closest("[data-int]");if(!s||!n.contains(s))return;i.stopPropagation();let r=t.agir(s.dataset.int,s.dataset.acao);r&&e&&e(r)})}var Le=.001,fs=n=>String(n??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function ih(n,t={}){let e=t.raiz||document,i=w=>e.querySelector(w),s=i("#tela"),r;try{r=new la({canvas:s,antialias:!0,preserveDrawingBuffer:!0})}catch(w){let F=i("#semwebgl")||document.querySelector("#semwebgl");throw F&&(F.style.display="flex"),w}r.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),r.outputColorSpace=_n;let a=new ir;a.background=new he("#14161b");let o=!0,l=()=>{o=!0},{L:c,A:u,P:f}=n.involucro,h=n.involucro.espessura||2,p=Math.hypot(c,u,f)*Le,x=new X(c*Le/2,u*Le/2,f*Le/2),S=new xn(38,1,.01,p*40),m=new ua(S,s);m.enableDamping=!0,m.dampingFactor=.08,m.target.copy(x),m.minDistance=.1,m.maxDistance=p*8,m.zoomToCursor=!0,m.addEventListener("change",l),a.add(new ar("#ffffff","#55524a",1.5)),a.add(new or("#ffffff",.55));let g=new Ps("#fff4e0",1.3);g.position.set(c*Le*1.5,u*Le*2,f*Le*6+1),a.add(g);let P=new Ps("#dfe8ff",.5);P.position.set(-c*Le,u*Le,f*Le*3),a.add(P);let O={caixa:new Vn(1,1,1),cilindro:new Gn(.5,.5,1,28)};O.cilindro.rotateX(Math.PI/2);let T={caixa:new Oa(O.caixa)},A=new Map;function b(w,F,U){let lt=`${w}|${F}|${U?1:0}`;return A.has(lt)||A.set(lt,new un({color:w,roughness:U?.35:.65,metalness:U?.65:.05,transparent:F<1,opacity:F,depthWrite:F>=.99})),A.get(lt)}let E=new Map;function y(w,F){let U=`${w}|${F}`;return E.has(U)||E.set(U,new Ti({color:new he(w).multiplyScalar(.45),transparent:F<1,opacity:Math.min(1,F+.25)})),E.get(U)}let C={},B=(w,F=a)=>(C[w]||(C[w]=new Rn,C[w].name=w,F.add(C[w])),C[w]),N=[],$=[],V=new Rn,D=[],G=[];function K(w,F){let U=Math.max(.5,w.l)*Le,lt=Math.max(.5,w.a)*Le,Et=Math.max(.5,w.p)*Le,gt=w.forma==="cilindro"?"cilindro":"caixa",Lt=w.opacidade??1,Vt=w.cor||"#cccccc",Wt=new ze(O[gt],b(Vt,Lt,w.metal));return Wt.scale.set(U,gt==="cilindro"?U:lt,Et),Wt.position.set(w.x*Le+U/2,w.y*Le+lt/2,w.z*Le+Et/2),!w.semBorda&&gt==="caixa"&&Wt.add(new Wi(T.caixa,y(Vt,Lt))),Wt.userData=w,(w.info||w.ficha||w.equipamento!=null)&&N.push(Wt),w.equipamento!=null&&G.push(Wt),w.rotulo&&!w.semEtiqueta&&$.push({mesh:Wt,texto:w.rotulo,el:null,porta:F===V}),w.tag&&D.push(Wt),F.add(Wt),Wt}let Z=n.involucro.cor||"#d6d4cf",ht=B("involucro");[{x:0,y:0,z:0,l:c,a:u,p:h},{x:0,y:0,z:0,l:h,a:u,p:f},{x:c-h,y:0,z:0,l:h,a:u,p:f},{x:0,y:u-h,z:0,l:c,a:h,p:f},{x:0,y:0,z:0,l:c,a:h,p:f}].forEach(w=>K({...w,cor:Z,rotulo:n.involucro.rotulo,info:n.involucro.info,semEtiqueta:!0},ht)),V.position.set(0,0,f*Le),a.add(V),C.porta=V,K({x:0,y:0,z:0,l:c,a:u,p:h,cor:Z,rotulo:n.porta&&n.porta.rotulo,info:n.porta&&n.porta.info,semEtiqueta:!0},V);for(let w of n.porta&&n.porta.itens||[])K({...w,z:h+(w.z||0)},V);for(let w of n.caixas||[])K(w,B(w.camada||"outros"));let rt=new Gn(.5,.5,1,6),ut=new un({color:"#ffffff",roughness:.55,metalness:.08}),ft=[],et=[];{let w=new Map;for(let se of Array.isArray(n.condutores)?n.condutores:[]){if(!Array.isArray(se.pts)||se.pts.length<2)continue;let Yt=se.camada||"fiacao";w.has(Yt)||w.set(Yt,[]),w.get(Yt).push(se)}let F=new X(0,1,0),U=new X,lt=new X,Et=new X,gt=new In,Lt=new Oe,Vt=new X,Wt=new X;for(let[se,Yt]of w){let ve=[];for(let ce of Yt){let be={c:ce,mesh:null,inst:[],faixa:new Set};ft.push(be);let je=Math.max(1.2,Number(ce.d_mm)||2.6)*Le;for(let jt=1;jt<ce.pts.length;jt++){U.fromArray(ce.pts[jt-1]).multiplyScalar(Le),lt.fromArray(ce.pts[jt]).multiplyScalar(Le);let tn=U.distanceTo(lt);if(tn<1e-5)continue;let Ae=ce.cor2?Math.max(1,Math.ceil(tn/.015)):1;for(let an=0;an<Ae;an++)ve.push({fio:be,p0:U.clone().lerp(lt,an/Ae),p1:U.clone().lerp(lt,(an+1)/Ae),d:je,alt:!!ce.cor2&&an%2===1,junta:an===Ae-1})}}if(!ve.length)continue;let Ue=new Hi(rt,ut,ve.length);ve.forEach((ce,be)=>{Et.subVectors(ce.p1,ce.p0);let je=Et.length();Et.normalize(),gt.setFromUnitVectors(F,Et),Lt.compose(Wt.addVectors(ce.p0,ce.p1).multiplyScalar(.5),gt,Vt.set(ce.d,je+(ce.junta?ce.d:0),ce.d)),Ue.setMatrixAt(be,Lt),ce.fio.mesh=Ue,ce.fio.inst.push(be),ce.alt&&ce.fio.faixa.add(be)}),Ue.instanceMatrix.needsUpdate=!0,Ue.userData={fioDe:ve.map(ce=>ce.fio)};for(let ce=0;ce<ve.length;ce++)Ue.setColorAt(ce,new he("#ffffff"));B(se).add(Ue),et.push(Ue)}}let mt=new he,It=null,Gt="#7d828a",Jt=-Math.PI*.58,it=n.portaAberta===!1?0:Jt;V.rotation.y=it,t.portaFechada&&(it=0,V.rotation.y=0,setTimeout(()=>te(!0),350));let I=()=>Math.abs(V.rotation.y)>.2,L=null,tt=new WeakMap,J=w=>tt.get(w)||w.material;function xt(w,F){tt.set(w,F),w.material=w===L?Ii(F):F}let ct=new WeakMap,at=n.comandoReles&&n.comandoReles.modelo?n.comandoReles:null,q=at?null:t.sim||(n.instalacao&&Array.isArray(n.instalacao.quadros)?Vc(n.instalacao,n.titulo):null),W=q?String(t.quadroTag||q.quadros()[0]?.tag||""):"",pt=(Array.isArray(n.equipamentos)?n.equipamentos:[]).filter(w=>!t.rede?.tem(w.id)),St=(0,fn.combinarRedes)(t.rede||null,pt.length?(0,fn.criarInteracao)(pt):null),yt=q||St||at?t.aviso||Hc():null,ee=w=>(0,um.condutorEnergizado)(w,{sim:q,quadroTag:W,rede:St});function re(){for(let w of ft){let F=ee(w.c),U=It===w;for(let lt of w.inst){let Et=U?"#ffcc33":F?w.faixa.has(lt)?w.c.cor2:w.c.cor||"#cccccc":Gt;w.mesh.setColorAt(lt,mt.set(Et))}}for(let w of et)w.instanceColor&&(w.instanceColor.needsUpdate=!0)}let Kt=new WeakMap,j=w=>w&&Kt.get(w)||null,Re=[],xe=[],k=-.55,M=.55,st=new Map;function dt(w,F,U){let lt=`${w.uuid}|${F}`;if(!st.has(lt)){let Et=w.clone();U(Et),st.set(lt,Et)}return st.get(lt)}let _t=(w,F,U)=>dt(w,`b${F}${U}`,lt=>{lt.emissive.set(F),lt.emissiveIntensity=U}),Ut=w=>dt(w,"escuro",F=>{F.color.multiplyScalar(.35)});function Tt(w,F){let U=w.scale.x,lt=w.scale.y,Et=w.scale.z,gt=new Rn;gt.position.set(w.position.x,w.position.y,w.position.z+Et/2);let Lt=new Rn,Vt=Math.min(.016,Math.max(.008,lt*.2)),Wt=new ze(O.caixa,b("#2b2d31",1,!1));Wt.scale.set(Math.min(.012,U*.45),Math.max(.004,Vt*.45),Vt),Wt.position.set(0,0,Vt/2),Lt.add(Wt);let se=new ze(O.caixa,b("#d62828",1,!1));se.scale.set(Math.min(.008,U*.4),Math.min(.006,lt*.07),.0015),se.position.set(0,lt*.27,8e-4),gt.add(Lt,se),w.parent.add(gt);for(let ve of[Wt,se])ct.set(ve,w),ve.userData=w.userData;N.push(Wt);let Yt=q.ligado(F.tag,W);Lt.rotation.x=Yt?k:M,Re.push({giro:Lt,band:se,tag:F.tag,alvo:Lt.rotation.x})}if(q){let w=q.quadro(W),F=q.paineis().filter(lt=>String(lt.quadro)===W).map(lt=>lt.id),U={};for(let lt of D){let Et=String(lt.userData.tag),gt=null;if(w&&q.dispositivo(Et,W))gt={tipo:"protecao",tag:Et};else{let Lt=Et.match(/^(.+)\/([A-Z]+)(\d*)$/),Vt=Et.match(/^(liga|desliga|emergencia|reset|seletor|sinaleiro_verde|sinaleiro_vermelho|sinaleiro_amarelo|sinaleiro_branco):\d+$/);if(Lt&&F.includes(Lt[1])){let Wt=`${Lt[1]}-${Lt[2]}${Lt[3]}`;gt=Lt[2]==="Q"&&q.dispositivo(Wt,W)?{tipo:"protecao",tag:Wt,motor:Lt[1]}:Lt[2]==="K"?{tipo:"contator",motor:Lt[1]}:Lt[2]==="F"?{tipo:"termico",motor:Lt[1]}:{tipo:"partida",motor:Lt[1]}}else if(Vt){let Wt=Vt[1],se=U[Wt]=(U[Wt]??-1)+1,Yt=F.length?F[se%F.length]:null;Wt==="emergencia"?gt={tipo:"porta",acao:"emergencia"}:Wt==="reset"?gt={tipo:"porta",acao:"rearme"}:Wt==="liga"||Wt==="desliga"?gt=Yt?{tipo:"porta",acao:Wt,motor:Yt}:null:Wt==="seletor"?gt=Yt?{tipo:"porta",acao:"alternar",motor:Yt}:null:gt={tipo:"sinaleiro",sinal:Wt.slice(10),motor:Wt==="sinaleiro_branco"?null:Yt}}}gt&&(Kt.set(lt,gt),gt.tipo==="protecao"&&lt.parent!==V&&Tt(lt,gt),gt.tipo!=="porta"&&(gt.tipo!=="protecao"||gt.motor)&&xe.push({mesh:lt,el:gt,base:lt.material}))}}function vt(w){if(!w)return null;if(w.tipo==="protecao")return q.alternar(w.tag,W),`${w.tag} ${q.ligado(w.tag,W)?"ligado":"desligado"}`;if(w.tipo!=="porta")return null;if(w.acao==="emergencia"){let F=!q.emergenciaDoQuadro(W);return q.emergenciaQuadro(W,F),F?"EMERGÊNCIA acionada: motores parados (clique de novo para soltar)":"Emergência liberada (aperte LIGA)"}if(w.acao==="rearme"){for(let F of q.paineis())String(F.quadro)===W&&F.termico&&q.motor(F.id,"rearmar");return"Rearme: relés térmicos rearmados"}return w.acao==="alternar"?q.motor(w.motor,q.painel(w.motor).contator?"desliga":"liga"):q.motor(w.motor,w.acao)}let bt=q||St?i("#simulacao"):null,Ht=new WeakMap,Ot=at?Yp({CR:at,comTag:D,painel:i("#simulacao"),aviso:yt,pintar:(w,F,U)=>{Ht.has(w)||Ht.set(w,w.material);let lt=Ht.get(w);xt(w,F?_t(lt,U||`#${lt.color.getHexString()}`,U?.7:1.6):U?lt:Ut(lt))},aoMudar:()=>l()}):null,qt=new Map(G.map(w=>[w,w.material]));function $t(){if(St)for(let w of G){let F=w.userData,U=qt.get(w);if(F.semTinta)continue;let lt=St.aparencia(F.equipamento),Et=U;Array.isArray(F.acendeEm)?Et=F.acendeEm.includes(lt)?_t(U,F.corAceso||`#${U.color.getHexString()}`,1.6):Ut(U):lt==="apagado"||lt==="aberto"?Et=Ut(U):(lt==="alarme"||lt==="falha")&&(Et=_t(U,lt==="falha"?"#e0a000":"#e5484d",.8)),xt(w,Et)}}function Qt(){if(re(),$t(),!q){bt&&St&&(bt.innerHTML=pr(St,n.equipamentosPainel||St.lista().filter(U=>(U.interacao.acoes||[]).length).map(U=>U.id))),Bn(),l();return}let w=q.quadro(W),F=!w?.geral||q.ligado(w.geral.tag,W);for(let U of Re){let lt=q.ligado(U.tag,W);U.alvo=lt?k:M,xt(U.band,b(lt?"#d62828":"#2f9e44",1,!1))}for(let U of xe){let lt=U.el.motor?q.painel(U.el.motor):null,Et=U.base;if(U.el.tipo==="contator"||U.el.tipo==="partida")lt?.girando&&(Et=_t(U.base,"#2fbf5a",.6));else if(U.el.tipo==="termico"||U.el.tipo==="protecao")lt?.termico&&(Et=_t(U.base,"#e0a000",.9));else if(U.el.tipo==="sinaleiro"){let gt=U.el.sinal;Et=(gt==="branco"?F:lt?!!lt.sinaleiros[gt]:gt==="vermelho"&&q.emergenciaDoQuadro(W))?_t(U.base,`#${U.base.color.getHexString()}`,1.6):Ut(U.base)}xt(U.mesh,Et)}bt&&(bt.innerHTML=am(q,W)+(St&&n.equipamentosPainel?pr(St,n.equipamentosPainel):"")),Bn(),l()}let le=q?q.assinar(Qt):()=>{},Bt=St?St.assinar(Qt):()=>{},nt=()=>{le(),Bt()};bt&&q&&da(bt,q,{aviso:yt}),q&&i("#info")&&da(i("#info"),q,{aviso:yt}),St&&bt&&po(bt,St,{aviso:yt}),St&&i("#info")&&po(i("#info"),St,{aviso:yt});let Dt=null;function Mt(w,F,U=700){let lt=S.position.clone(),Et=m.target.clone(),gt=performance.now();Dt=Lt=>{let Vt=Math.min(1,(Lt-gt)/U),Wt=Vt*Vt*(3-2*Vt);S.position.lerpVectors(lt,w,Wt),m.target.lerpVectors(Et,F,Wt),Vt>=1&&(Dt=null)},l()}let kt=()=>Math.max(u*Le,c*Le/Math.max(.3,S.aspect*.72))/(2*Math.tan(S.fov*Math.PI/180/2))*1.42+f*Le;function Ft(w){let F=window.innerWidth>900?c*Le*.35:0,U=new X(c*Le/2+F,u*Le/2+u*Le*.03,f*Le*.3),lt=new X(c*Le/2+F,u*Le/2+u*Le*.03,kt());w?(S.position.copy(lt),m.target.copy(U),l()):Mt(lt,U)}function At(w){let F=kt()*1.05,U=x.clone().add(new X(window.innerWidth>900?c*Le*.3:0,0,0)),lt=new X(c*Le/2+F*.38,u*Le*.6+F*.2,F*.95);w?(S.position.copy(lt),m.target.copy(U),l()):Mt(lt,U)}function ne(w,F){C[w]&&(C[w].visible=F),document.querySelectorAll(`[data-camada="${w}"]`).forEach(U=>U.classList.toggle("ativo",F)),l()}function te(w=!0){it=w?Jt:0,i("#b-porta")&&i("#b-porta").classList.toggle("ativo",w),l()}function Fe(w=!0){ne("involucro",!w),ne("porta",!w),i("#b-placa")&&i("#b-placa").classList.toggle("ativo",w)}let we=i("#camadas");for(let w of n.camadas||[]){let F=document.createElement("button");F.className="leg ativo",F.dataset.camada=w.id,F.style.setProperty("--cor",w.cor),F.innerHTML=`<i></i><span>${fs(w.rotulo)}${w.qtd!=null?` <small>${fs(w.qtd)}</small>`:""}</span>`,F.onclick=()=>ne(w.id,!(!C[w.id]||C[w.id].visible)),we&&we.appendChild(F)}let pn=i("#numeros");pn&&(pn.innerHTML=(n.numeros||[]).map(([w,F])=>`<div class="num"><div>${fs(F)}</div><small>${fs(w)}</small></div>`).join(""));let Qe=(w,F)=>{let U=i(w);U&&(U.onclick=F)};Qe("#b-porta",()=>te(it===0)),Qe("#b-sem-porta",()=>{let w=!C.porta.visible;ne("porta",w),i("#b-sem-porta").classList.toggle("ativo",!w)}),Qe("#b-involucro",()=>{let w=!C.involucro.visible;ne("involucro",w),i("#b-involucro").classList.toggle("ativo",!w)}),Qe("#b-frente",()=>Ft()),Qe("#b-3d",()=>At()),Qe("#b-placa",()=>{let w=!i("#b-placa").classList.contains("ativo");Fe(w),w&&Ft()});let Ce=!0;Qe("#b-etiquetas",()=>{Ce=!Ce,i("#b-etiquetas").classList.toggle("ativo",Ce),l()}),i("#b-etiquetas")&&i("#b-etiquetas").classList.add("ativo"),i("#b-porta")&&i("#b-porta").classList.toggle("ativo",it!==0),Qe("#b-tela",()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}),Qe("#b-voltar-predio",()=>{t.aoVoltar&&t.aoVoltar()});let Fn=new cs,di=new Pt,Pi=new Map;function Ii(w){if(!Pi.has(w)){let F=w.clone();F.emissive.set("#5a4500"),Pi.set(w,F)}return Pi.get(w)}function $s(w){for(let F=w;F;F=F.parent)if(!F.visible)return!1;return!0}function ps(w){let F=s.getBoundingClientRect();di.set((w.clientX-F.left)/F.width*2-1,-((w.clientY-F.top)/F.height)*2+1),Fn.setFromCamera(di,S);let U=Fn.intersectObjects([...N,...et].filter($s),!1)[0]||null;return U&&U.object.userData?.fioDe?{fio:U.object.userData.fioDe[U.instanceId],object:U.object}:U}let Wn=w=>`<b class="tag">${fs(w.rotulo||"")}</b>${w.ficha?lm(w.ficha):""}<table>${(w.info||[]).map(([F,U])=>`<tr><th>${fs(F)}</th><td>${/^https?:/.test(String(U))?`<a href="${fs(U)}" target="_blank" rel="noopener">${fs(U)}</a>`:fs(U)}</td></tr>`).join("")}</table>`,$n=null;function Bn(){let w=i("#info");if(!w)return;if(It){w.innerHTML=cm(It.c,{energizado:ee(It.c)});return}if(!$n){w.innerHTML=`<small>Clique num dispositivo para ver TAG, dados do projeto e medidas; num cabo, para ver o circuito, a função e a seção.${q?" Clique num disjuntor para ligar/desligar.":""}</small>`;return}let F=$n.userData;if(St&&F.equipamento!=null){w.innerHTML=Wn(F)+pr(St,F.equipamento);return}let U=q&&j($n),lt="";if(U?.tipo==="protecao"){let Et=q.dispositivo(U.tag,W),gt=Et?.tipo==="dr"?null:Et?.item?.circuito??null;lt=gt!=null?eh(q,gt,{abrir:!1}):`<div class="sim-est">${U.tag}: <b class="${q.ligado(U.tag,W)?"sim-on":"sim-off"}">${q.ligado(U.tag,W)?"ligado":"desligado"}</b></div>`}else U?.motor&&(lt=Gc(q.painel(U.motor)));w.innerHTML=Wn(F)+lt}function mr(w){let F=ps(w);L&&(L.material=J(L),L=null),l();let U=It;if(It=F?.fio||null,(It||U)&&re(),It){$n=null,Bn();return}if(!F){$n=null,Bn();return}let lt=ct.get(F.object)||F.object;L=lt,tt.set(lt,J(lt)),lt.material=Ii(J(lt)),$n=lt;let Et=q?vt(j(lt)):Ot?Ot.cliqueMesh(lt):null;Et&&yt&&yt(Et),Bn()}let qn=null;s.addEventListener("pointerdown",w=>{qn=[w.clientX,w.clientY]}),s.addEventListener("pointerup",w=>{qn&&Math.hypot(w.clientX-qn[0],w.clientY-qn[1])<5&&mr(w),qn=null});let rn=document.createElement("div");rn.className="etq-q etq-dica",rn.style.display="none",document.body.appendChild(rn);let ni=0;s.addEventListener("pointermove",w=>{if(w.buttons){rn.style.display="none";return}let F=performance.now();if(F-ni<60)return;ni=F;let U=ps(w);if(U?.fio){let gt=U.fio.c,Lt={F:"Fase",N:"Neutro",PE:"PE"}[gt.funcao]||gt.funcao;rn.textContent=`${Lt}${gt.fase?` ${gt.fase}`:""}${gt.circuito!=null?` · circuito ${gt.circuito}`:""} · ${gt.secao_mm2?`${String(gt.secao_mm2).replace(".",",")} mm²`:"seção [CONFERIR]"} · ${gt.de} → ${gt.para}${ee(gt)?"":" — SEM TENSÃO"}`,rn.style.display="block",rn.style.transform=`translate(${w.clientX+12}px, ${w.clientY-26}px)`;return}let lt=U&&(U.object.userData.dica||U.object.userData.rotulo);if(!lt){rn.style.display="none";return}St&&U.object.userData.equipamento!=null&&St.tem(U.object.userData.equipamento)&&(lt+=` — ${St.textoEstado(U.object.userData.equipamento)} (clique para as manobras)`);let Et=q&&j(ct.get(U.object)||U.object);Et?.tipo==="protecao"?lt+=q.ligado(Et.tag,W)?" — LIGADO (clique para desligar)":" — DESLIGADO (clique para ligar)":Et?.acao&&(lt+=" — clique para apertar"),rn.textContent=lt,rn.style.display="block",rn.style.transform=`translate(${w.clientX+12}px, ${w.clientY-26}px)`}),s.addEventListener("pointerleave",()=>{rn.style.display="none"});let Xn=i("#etiquetas");for(let w of $)w.el=document.createElement("div"),w.el.className="etq-q",w.el.textContent=w.texto,Xn&&Xn.appendChild(w.el),w.larg=0;let Ln=new X;function qs(){let w=s.clientWidth,F=s.clientHeight,U=S.position.distanceTo(m.target),lt=2*Math.tan(S.fov*Math.PI/180/2),Et=[];for(let gt of $){let Lt=Ce&&$s(gt.mesh)&&(gt.porta?!I():I()||!C.porta.visible)&&U<p*3.2;if(Lt){gt.mesh.getWorldPosition(Ln);let se=F/(lt*Math.max(.05,S.position.distanceTo(Ln)));gt.larg||(gt.el.style.display="block",gt.larg=gt.el.offsetWidth||gt.texto.length*7+12),Lt=gt.mesh.scale.x*se>=gt.larg*.95}if(!Lt){gt.el.style.display="none";continue}if(Ln.z+=gt.mesh.scale.z/2,Ln.project(S),Ln.z>1){gt.el.style.display="none";continue}let Vt=(Ln.x+1)/2*w,Wt=(1-Ln.y)/2*F;if(Et.some(se=>Math.abs(se[0]-Vt)<(se[2]+gt.larg)/2&&Math.abs(se[1]-Wt)<16)){gt.el.style.display="none";continue}Et.push([Vt,Wt,gt.larg]),gt.el.style.display="block",gt.el.style.transform=`translate(${Vt}px, ${Wt}px) translate(-50%, -50%)`}}let Di=!0;function Ne(){if(!Di)return;let w=s.clientWidth||window.innerWidth,F=s.clientHeight||window.innerHeight;r.setSize(w,F,!1),S.aspect=w/F,S.updateProjectionMatrix(),l()}window.addEventListener("resize",Ne),s.addEventListener("webglcontextrestored",l),Ne(),At(!0),Qt(),q||Bn(),r.compile(a,S);function Se(w){if(!Di)return;Dt&&(Dt(w),o=!0);let F=it-V.rotation.y;Math.abs(F)>.001?(V.rotation.y+=F*.12,o=!0):V.rotation.y!==it&&(V.rotation.y=it,o=!0);for(let U of Re){let lt=U.alvo-U.giro.rotation.x;Math.abs(lt)>.001?(U.giro.rotation.x+=lt*.3,o=!0):U.giro.rotation.x!==U.alvo&&(U.giro.rotation.x=U.alvo,o=!0)}m.update()&&(o=!0),o&&(o=!1,r.render(a,S),qs())}let Je={tipo:"quadro",grupos:C,camera:S,controles:m,cena:a,renderer:r,sim:q,quadroTag:W,abrirPorta:(w=!0)=>{te(w),V.rotation.y=it},vistaFrente:()=>{Ft(!0)},vista3d:()=>{At(!0)},soPlaca:(w=!0)=>Fe(w),mostrar:ne,etiquetas:w=>{Ce=w,l()},render:()=>{Dt=null,o=!0,Se(performance.now())},alternar:w=>q?vt({tipo:"protecao",tag:w}):null,comando:Ot,alavanca:w=>{let F=Re.find(U=>U.tag===w);return F?F.giro.rotation.x:null},rede:St,condutores:()=>ft.map(w=>({id:w.c.id,circuito:w.c.circuito,funcao:w.c.funcao,energizado:ee(w.c),cor:(w.mesh.getColorAt(w.inst[0],mt),`#${mt.getHexString()}`)})),selecionarFio:w=>(It=ft.find(F=>F.c.id===w)||null,re(),$n=null,Bn(),l(),!!It),selecionarPeca:w=>{let F=[...N].find(lt=>lt.userData?.tag===w||lt.userData?.equipamento===w);if(!F)return!1;L&&(L.material=J(L));let U=ct.get(F)||F;return L=U,tt.set(U,J(U)),U.material=Ii(J(U)),It=null,$n=U,re(),Bn(),l(),!0},get sujo(){return o}},R=0;function Y(w){R=requestAnimationFrame(Y),Se(w)}return Se(performance.now()),R=requestAnimationFrame(Y),t.embutido?{...Je,ativar(w=!0){Di=w,Di&&(Ne(),Qt())},abrirAnimado(){it=0,V.rotation.y=0,l(),setTimeout(()=>te(!0),300)},destruir(){Di=!1,cancelAnimationFrame(R),nt(),Ot&&Ot.parar(),window.removeEventListener("resize",Ne),rn.remove(),r.dispose(),r.forceContextLoss?.()}}:(window.HM3D=Je,document.body.classList.add("pronto"),Je)}var Ws=Js(fm());var Dn=Js(bm()),qc={celular:4e5,computador:15e5},Hs=(n,t=0)=>Number(n).toLocaleString("pt-BR",{minimumFractionDigits:t,maximumFractionDigits:t});function Mm(n){let{CENA:t,INST:e,sim:i,interativos:s,pai:r,altura:a,celular:o,pedirDesenho:l,esc:c,ambienteAtual:u}=n,f=e?.luminotecnico;if(!i||!f||!f.fotometrias)return null;let h={},p=new Map;for(let D of s){if(D.kind!=="luz")continue;let G=i.ponto(D.id),K=G?.luminaria;if(!K||!f.fotometrias[K])continue;let Z=t.ambientes[D.it[5]];!Z||Z.poligono.length<3||(h[K]||(h[K]=(0,Dn.avaliador)(f.fotometrias[K])),p.has(D.it[5])||p.set(D.it[5],[]),p.get(D.it[5]).push({id:D.id,x:D.it[0],y:D.it[1],z:D.it[2],cod:K,nome:G.ambiente}))}if(!p.size)return null;let x=[...p].map(([D,G])=>{let K=t.ambientes[D],Z={};for(let It of G)Z[It.nome]=(Z[It.nome]||0)+1;let ht=Object.keys(Z).sort((It,Gt)=>Z[Gt]-Z[It])[0],rt=f.ambientes?.[ht]||{},ut=K.poligono.map(It=>It[0]),ft=K.poligono.map(It=>It[1]),et=Math.max(...ut)-Math.min(...ut),mt=Math.max(...ft)-Math.min(...ft);return{i:D,a:K,lums:G,dados:rt,nome:ht,plano:Number.isFinite(rt.plano_m)?rt.plano_m:.75,fm:Number.isFinite(rt.fm)?rt.fm:1,montagem:Number.isFinite(rt.altura_montagem_m)?rt.altura_montagem_m:null,rot:et>=mt?0:90,area:Math.max(.5,Number(K.area_m2)||et*mt)}}),S=null,m=!1,g=null,P=null,O=new Jn({vertexColors:!0,transparent:!0,opacity:.86,depthWrite:!1,side:dn,polygonOffset:!0,polygonOffsetFactor:-4,polygonOffsetUnits:-4});function T(D){let G=o?qc.celular:qc.computador,K=o?250:600,Z=D.reduce((rt,ut)=>rt+K*ut.lums.length,0),ht=Math.min(1,G/Math.max(1,Z));return Math.max(30,Math.floor(K*ht))}function A(D){let G=T(D),K=[],Z=[],ht=[];for(let ut of D){let ft=(0,Dn.gradeNoPoligono)(ut.a.poligono,{passo:Math.max(.15,Math.sqrt(ut.area/G)),maxCelulas:G}),et=K.length/3,mt=new Map,It=[],Gt=(it,I)=>{let L=`${it},${I}`;if(!mt.has(L)){mt.set(L,et+It.length);let tt=ft.x0+ft.dx*it,J=ft.y0+ft.dy*I;It.push([tt,J]),K.push(tt,a,-J)}return mt.get(L)};for(let it of ft.centros){let I=Gt(it.i,it.j),L=Gt(it.i+1,it.j),tt=Gt(it.i+1,it.j+1),J=Gt(it.i,it.j+1);Z.push(I,L,tt,I,tt,J)}let Jt=(0,Dn.malhaMedicao)(ft.L,ft.W);ht.push({s:ut,g:ft,vertices:It,medicao:(0,Dn.gradeNoPoligono)(ut.a.poligono,{nx:Jt.nx,ny:Jt.ny})})}let rt=new Xe;return rt.setAttribute("position",new me(K,3)),rt.setAttribute("color",new me(new Float32Array(K.length),3)),rt.setIndex(Z),S&&(S.geometry.dispose(),r.remove(S)),S=new ze(rt,O),S.renderOrder=3,S.frustumCulled=!1,r.add(S),{lista:D,partes:ht,maxCel:G}}let b=D=>D.lums.map(G=>{let K=i.estadoPonto(G.id);return{x:G.x,y:G.y,z:D.montagem??G.z,I:h[G.cod],rot:D.rot,fator:D.fm*(K?K.nivel:0)}});function E(){if(!g)return;let D=[],G=0;for(let ut of g.partes){let ft=b(ut.s),et=ut.vertices.map(([Gt,Jt])=>(0,Dn.iluminanciaNoPonto)(Gt,Jt,ut.s.plano,ft)),mt=ut.medicao.centros.map(Gt=>(0,Dn.iluminanciaNoPonto)(Gt.x,Gt.y,ut.s.plano,ft)),It=(0,Dn.estatisticas)(mt);G=Math.max(G,It.emax,...et),D.push({p:ut,nos:et,est:It})}let K=(0,Dn.escala)(G),Z=S.geometry.attributes.color,ht=new he,rt=0;for(let ut of D)for(let ft of ut.nos){let[et,mt,It]=(0,Dn.corFalsa)(ft/K.max);ht.setRGB(et,mt,It,_n),Z.array[rt++]=ht.r,Z.array[rt++]=ht.g,Z.array[rt++]=ht.b}Z.needsUpdate=!0,P={escala:K,porAmbiente:new Map(D.map(ut=>[ut.p.s.i,{...ut.est,sala:ut.p.s,celulas:ut.p.g.centros.length}]))},B(),l()}let y=document.createElement("div");y.id="mapa-lux",document.body.appendChild(y);let C=`linear-gradient(90deg, ${[0,.2,.4,.6,.8,1].map(D=>{let[G,K,Z]=(0,Dn.corFalsa)(D);return`rgb(${Math.round(G*255)},${Math.round(K*255)},${Math.round(Z*255)}) ${D*100}%`}).join(", ")})`;function B(){if(!P)return;let D=u(),G=P.porAmbiente.get(D),K=(ht,rt)=>`<div>${ht}: ${rt}</div>`,Z;if(G){let ht=G.sala.dados;Z=`<div class="t"><b>${c(G.sala.a.nome)}</b> — ponto a ponto, estado atual das luzes</div>`+K("Em",`<b>${Hs(G.em)} lx</b>${ht.em_exigida?` (exigida ${Hs(ht.em_exigida)} lx; lúmens ${Hs(ht.em_lumens||0)} lx)`:""}`)+K("Emín / Emáx",`${Hs(G.emin)} / ${Hs(G.emax)} lx`)+K("U0 = Emín/Em",`<b>${Hs(G.u0,2)}</b>${ht.uo_min!=null?` (mínimo ${Hs(ht.uo_min,1)})`:""}`)}else Z=`<div class="t">${P.porAmbiente.size} ambiente(s) com luminárias do projeto luminotécnico${g.parcial?" — cena grande: só o ambiente atual (entre num ambiente)":""}. Entre num ambiente para ver Em, Emín e U0.</div>`;y.innerHTML=`<div class="tit">Mapa de iluminância (lx)</div><div class="barra" style="background:${C}"></div>
<div class="marcas">${P.escala.marcas.map(ht=>`<span>${Hs(ht)}</span>`).join("")}</div>${Z}
<small>Cálculo ponto a ponto no plano de trabalho, só luz direta (sem interreflexão de teto, paredes e piso): fica abaixo do método dos lúmens. Muda com as cenas, a dimerização e os disjuntores.</small>`}function N(){let G=x.reduce((ht,rt)=>ht+30*rt.lums.length,0),K=o?qc.celular:qc.computador;if(G<=K)return{lista:x,parcial:!1};let Z=u();return{lista:x.filter(ht=>ht.i===Z),parcial:!0}}function $(){let{lista:D,parcial:G}=N(),K=D.map(Z=>Z.i).join(",");(!g||g.chave!==K)&&(g={...A(D),chave:K,parcial:G})}function V(D){m=!!D,m&&($(),E()),S&&(S.visible=m),y.classList.toggle("aberto",m),l(!0)}return{get visivel(){return m},ambientes:p.size,alternar(){return V(!m),m},mostrar:V,atualizar(){m&&($(),E())},legenda(){m&&(g?.parcial?($(),E()):B())},resultado(D){let G=P?.porAmbiente.get(D);return G?{em:G.em,emin:G.emin,emax:G.emax,u0:G.u0,celulas:G.celulas,nome:G.sala.a.nome}:null},get escala(){return P?.escala||null},get celulas(){return g?g.partes.reduce((D,G)=>D+G.g.centros.length,0):0}}}var Sm={teto:null,piso:.05,canto:2.3,"topo-porta":2.15};function Am(n){let{CENA:t,tela:e,camera:i,cena:s,pisos:r,escolherDispositivo:a,pedirDesenho:o,esc:l}=n,c=window.parent&&window.parent!==window,u={ligado:!1,modo:"navegar",paleta:[],escolhido:null,inseridos:0,retirados:0},f={ativo:()=>!1,clique:()=>!1,estado:u};if(!c)return f;let h=Array.isArray(t.origem)?t.origem:null,p=N=>{try{window.parent.postMessage(N,"*")}catch{}},x=new Rn;s.add(x);let S=new cs,m=new Pt,g=new kn(new X(0,1,0),0),P=new Oe().makeScale(0,0,0),O=null,T=null;function A(){let N=document.createElement("style");N.textContent=`
#hm-edicao{position:absolute;top:58px;right:12px;z-index:30;width:270px;background:rgba(18,24,33,.94);color:#eef2f6;border:1px solid #c9a227;border-radius:10px;padding:10px 12px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#hm-edicao h4{margin:0 0 6px;font-size:13px;color:#e6c45a;letter-spacing:.3px}
#hm-edicao select{width:100%;margin:4px 0 8px;padding:5px;border-radius:6px;border:1px solid #556;background:#0f141b;color:#eef2f6}
#hm-edicao .modos{display:flex;gap:6px;margin-bottom:6px}
#hm-edicao .modos button{flex:1;padding:6px 4px;border-radius:6px;border:1px solid #556;background:#1d2633;color:#eef2f6;cursor:pointer;font-size:12px}
#hm-edicao .modos button.ativo{background:#c9a227;color:#111;border-color:#c9a227;font-weight:600}
#hm-edicao small{display:block;color:#aab4c0;margin-top:4px}
#hm-edicao .aviso{margin-top:6px;padding:5px 7px;border-radius:6px;background:#203046;display:none}
#hm-edicao .aviso.erro{background:#5a1f1f}`,document.head.appendChild(N),O=document.createElement("div"),O.id="hm-edicao";let $=new Map;for(let G of u.paleta)$.has(G.grupo)||$.set(G.grupo,[]),$.get(G.grupo).push(G);let V=[...$.entries()].sort((G,K)=>G[0].localeCompare(K[0],"pt-BR")).map(([G,K])=>`<optgroup label="${l(G)}">${K.sort((Z,ht)=>Z.nome.localeCompare(ht.nome,"pt-BR")).map(Z=>`<option value="${l(Z.simbolo)}">${l(Z.nome)}</option>`).join("")}</optgroup>`).join("");O.innerHTML=`<h4>Editar componentes</h4>
<div class="modos"><button data-m="navegar" class="ativo">Navegar</button><button data-m="inserir">Inserir</button><button data-m="retirar">Retirar</button></div>
<select id="hm-comp">${V}</select>
<small id="hm-dica">Escolha "Inserir" e clique no piso onde vai o componente; "Retirar" e clique no componente.</small>
<small id="hm-conta"></small>
<div class="aviso" id="hm-aviso"></div>`,document.body.appendChild(O),T=O.querySelector("#hm-aviso");let D=O.querySelector("#hm-comp");u.escolhido=D.value||null,D.addEventListener("change",()=>{u.escolhido=D.value}),O.querySelectorAll(".modos button").forEach(G=>G.addEventListener("click",()=>{u.modo=G.dataset.m,O.querySelectorAll(".modos button").forEach(K=>K.classList.toggle("ativo",K===G)),e.style.cursor=u.modo==="navegar"?"":"crosshair"})),b()}function b(){let N=O?.querySelector("#hm-conta");N&&(N.textContent=u.inseridos||u.retirados?`Nesta sessão: ${u.inseridos} inserido(s), ${u.retirados} retirado(s). Clique em "Atualizar 3D" na tela para ver a peça no lugar definitivo.`:"")}function E(N,$=!1){T&&(T.textContent=N,T.className=`aviso${$?" erro":""}`,T.style.display="block",clearTimeout(E.t),E.t=setTimeout(()=>{T.style.display="none"},4e3))}function y(N,$){let V=e.getBoundingClientRect();m.set((N-V.left)/V.width*2-1,-(($-V.top)/V.height)*2+1),S.setFromCamera(m,i);let D=S.intersectObjects(r,!1)[0];if(D)return D.point.clone();let G=new X;return S.ray.intersectPlane(g,G)?G:null}function C(N,$){let V=u.paleta.find(et=>et.simbolo===u.escolhido);if(!V)return E("Escolha o componente na lista.",!0),!0;let D=y(N,$);if(!D)return E("Clique no piso do modelo.",!0),!0;let G=D.x,K=-D.z,Z=typeof V.altura_m=="number"?V.altura_m:V.montagem in Sm?Sm[V.montagem]:1.1,ht=Z??t.peDireito-.05,rt=V.cor||"#c9a227",ut=new ze(new Gn(.015,.015,Math.max(ht,.05),6),new Jn({color:rt,transparent:!0,opacity:.6}));ut.position.set(G,Math.max(ht,.05)/2,-K);let ft=new ze(new Ts(.09,14,10),new Jn({color:rt}));return ft.position.set(G,ht,-K),x.add(ut,ft),u.inseridos++,b(),o(!0),p({tipo:"hm3d:adicionar",simbolo:V.simbolo,x:Math.round((G+h[0])*1e3)/1e3,y:Math.round((K+h[1])*1e3)/1e3}),!0}function B(N,$){let V=a(N,$);if(!V)return E("Clique em cima do componente a retirar.",!0),!0;let{t:D,it:G}=V,K=D.itens.indexOf(G);return D.malha&&K>=0&&(D.malha.setMatrixAt(K,P),D.malha.instanceMatrix.needsUpdate=!0),G.fora=!0,u.retirados++,b(),o(!0),p({tipo:"hm3d:remover",simbolo:D.simbolo||null,rotulo:D.rotulo||null,x:Math.round((G[0]+h[0])*1e3)/1e3,y:Math.round((G[1]+h[1])*1e3)/1e3}),!0}return window.addEventListener("message",N=>{if(N.source!==window.parent)return;let $=N.data;if(!(!$||typeof $!="object"))if($.tipo==="hm3d:editar"&&!u.ligado&&h&&Array.isArray($.paleta)){if(u.paleta=$.paleta.filter(V=>V&&typeof V.simbolo=="string"&&typeof V.nome=="string").map(V=>({simbolo:V.simbolo,nome:V.nome,grupo:String(V.grupo||V.disciplina||""),montagem:V.montagem,altura_m:typeof V.altura_m=="number"?V.altura_m:null,cor:/^#[0-9a-f]{6}$/i.test(V.cor||"")?V.cor:null})),!u.paleta.length)return;u.ligado=!0,A()}else $.tipo==="hm3d:resultado"&&E(String($.texto||($.ok?"Salvo.":"Não foi possível salvar.")).slice(0,200),!$.ok)}),p({tipo:"hm3d:pronto",comOrigem:!!h}),{estado:u,ativo:()=>u.ligado&&u.modo!=="navegar",clique:(N,$)=>u.modo==="inserir"?C(N,$):u.modo==="retirar"?B(N,$):!1}}window.CENA&&window.CENA.tipo==="quadro"?ih(window.CENA):IS();function IS(){let n=window.CENA,t=d=>document.querySelector(d),e=(d,_=2)=>Number(d).toLocaleString("pt-BR",{minimumFractionDigits:_,maximumFractionDigits:_}),i=d=>String(d??"").replace(/[&<>"']/g,_=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[_]),s=n.peDireito,r=n.infra||[],a=1.6,o=.45,l=t("#tela"),c;try{c=new la({canvas:l,antialias:!0,preserveDrawingBuffer:!0})}catch(d){throw t("#semwebgl").style.display="flex",d}c.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),c.outputColorSpace=_n;let u=new ir;u.background=new he("#14161b");let f=!0,h=!0;function p(d=!1){f=!0,d&&(h=!0)}l.addEventListener("webglcontextrestored",()=>p(!0));let[x,S,m,g]=n.limites,P=m-x,O=g-S,T=Math.hypot(P,O),A=(d,_,v=0)=>new X(d,v,-_),b=new xn(45,1,.1,T*20+50),E=new ua(b,l);E.enableDamping=!0,E.dampingFactor=.08,E.maxPolarAngle=Math.PI/2-.02,E.minDistance=.5,E.maxDistance=T*4,E.autoRotateSpeed=.9,E.zoomToCursor=!0,E.addEventListener("change",()=>p());let y=1.6,C=.6,B=new ar("#ffffff","#5a5a4e",y),N=new or("#ffffff",C);u.add(B,N);let $=new Ps("#fff4e0",1.4);$.position.set(T*.6,T*.9,T*.4),u.add($);let V={};function D(d,_=u){return V[d]||(V[d]=new Rn,_.add(V[d])),V[d]}{let d=Math.max(4,T*.15),_=new Es(P+2*d,O+2*d),v=new ze(_,new un({color:"#3d4334",roughness:1}));v.rotation.x=-Math.PI/2,v.position.set((x+m)/2,-.02,-(S+g)/2),D("terreno").add(v)}{let d=n.ambientes.filter(_=>_.tipo!=="externo"&&_.poligono.length>=3);if(d.length){let _=1/0,v=1/0,H=-1/0,z=-1/0;for(let wt of d)for(let[Ct,Nt]of wt.poligono)_=Math.min(_,Ct),H=Math.max(H,Ct),v=Math.min(v,Nt),z=Math.max(z,Nt);let Q=new Es(H-_+.4,z-v+.4),ot=new ze(Q,new un({color:"#8c887e",roughness:1}));ot.rotation.x=-Math.PI/2,ot.position.set((_+H)/2,.001,-(v+z)/2),D("terreno").add(ot)}}let G=20,K=d=>.005+d*4e-4,Z=[],ht=n.ambientes.filter(d=>d.poligono.length>=3).sort((d,_)=>_.area_m2-d.area_m2),rt=ht.map(d=>{let _=1/0,v=1/0,H=-1/0,z=-1/0;for(let[Q,ot]of d.poligono)_=Math.min(_,Q),H=Math.max(H,Q),v=Math.min(v,ot),z=Math.max(z,ot);return[_,v,H,z]}),ut=[];ht.forEach((d,_)=>{let v=rt[_],H=0;for(let z=0;z<_&&H<G;z++){let Q=rt[z];v[0]<Q[2]&&v[2]>Q[0]&&v[1]<Q[3]&&v[3]>Q[1]&&(H=Math.max(H,ut[z]+1))}ut.push(Math.min(H,G))});let ft=Math.max(.03,K(ut.reduce((d,_)=>Math.max(d,_),0))+.01);{let d=new Map;ht.forEach((_,v)=>{let H=ut[v];d.has(H)||d.set(H,{pos:[],cor:[],idx:[],ambientes:[]});let z=d.get(H),Q=new Kr(new ls(_.poligono.map(([Rt,ae])=>new Pt(Rt,ae)))),ot=Q.attributes.position.array,wt=new he((n.tiposAmbiente[_.tipo]||n.tiposAmbiente.outros).cor),Ct=z.pos.length/3,Nt=K(H);for(let Rt=0;Rt<ot.length;Rt+=3)z.pos.push(ot[Rt],Nt,-ot[Rt+1]),z.cor.push(wt.r,wt.g,wt.b);let Xt=Q.index?Q.index.array:[...Array(ot.length/3).keys()];for(let Rt=0;Rt<Xt.length;Rt++)z.idx.push(Ct+Xt[Rt]);for(let Rt=0;Rt<Xt.length/3;Rt++)z.ambientes.push(_);Q.dispose()});for(let[_,v]of d){let H=new Xe;H.setAttribute("position",new me(v.pos,3)),H.setAttribute("normal",new me(v.pos.map((Q,ot)=>ot%3===1?1:0),3)),H.setAttribute("color",new me(v.cor,3)),H.setIndex(v.idx);let z=new ze(H,new un({vertexColors:!0,roughness:.9,polygonOffset:!0,polygonOffsetFactor:-1-_*.05,polygonOffsetUnits:-1-_}));z.userData={ambientes:v.ambientes},D("ambientes").add(z),Z.push(z)}}let et={uAlvo:{value:new X},uDir:{value:new Pt(0,0)},uCorte:{value:0},uAltCorte:{value:o},uMargem:{value:.3}};function mt(d,_=!1){return d.onBeforeCompile=v=>{Object.assign(v.uniforms,et),v.vertexShader=v.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aParede;
uniform vec3 uAlvo; uniform vec2 uDir; uniform float uCorte; uniform float uAltCorte; uniform float uMargem;`).replace("#include <begin_vertex>",`#include <begin_vertex>
{
  bool frente = uCorte > 0.5 && dot(aParede.xz - uAlvo.xz, uDir) > uMargem;
  ${_?"if (!frente) transformed = vec3(aParede.x, -50.0, aParede.z);":"if (frente) { if (aParede.y >= uAltCorte - 0.01) transformed = vec3(aParede.x, -50.0, aParede.z); else transformed.y = min(transformed.y, uAltCorte); }"}
}`)},d.customProgramCacheKey=()=>_?"corte-fantasma":"corte",d}function It(d,_){let v=[],H=[],z=[],Q=[],ot=[],[wt,Ct,Nt]=_.map(oe=>new he(oe)),Xt=[],Rt=[];for(let[oe,_e,pe,Me,sn,ue,Ge]of d){let Cn=Math.hypot(pe-oe,Me-_e);if(Cn<1e-4||Ge<=ue)continue;let on=(pe-oe)/Cn,ln=(Me-_e)/Cn,gn=-ln*sn/2,Fi=on*sn/2,js=[[oe+gn,_e+Fi],[pe+gn,Me+Fi],[pe-gn,Me-Fi],[oe-gn,_e-Fi]],De=(yi,Mr)=>{let[Sr,ru]=js[yi];return[Sr,Mr,-ru]},bo=[(oe+pe)/2,ue,-(_e+Me)/2,0],fa=[[De(0,ue),De(1,ue),De(1,Ge),De(0,Ge),[-ln,0,-on],wt],[De(2,ue),De(3,ue),De(3,Ge),De(2,Ge),[ln,0,on],wt],[De(1,ue),De(2,ue),De(2,Ge),De(1,Ge),[on,0,-ln],wt],[De(3,ue),De(0,ue),De(0,Ge),De(3,Ge),[-on,0,ln],wt],[De(0,Ge),De(1,Ge),De(2,Ge),De(3,Ge),[0,1,0],Ct],[De(3,ue),De(2,ue),De(1,ue),De(0,ue),[0,-1,0],Nt]];for(let[yi,Mr,Sr,ru,Lm,au]of fa){let Ar=v.length/3;v.push(...yi,...Mr,...Sr,...ru);for(let Eh=0;Eh<4;Eh++)H.push(...Lm),z.push(au.r,au.g,au.b),Q.push(...bo);ot.push(Ar,Ar+1,Ar+2,Ar,Ar+2,Ar+3)}for(let yi=0;yi<4;yi++){let Mr=(yi+1)%4;Xt.push(...De(yi,Ge),...De(Mr,Ge),...De(yi,ue),...De(Mr,ue),...De(yi,ue),...De(yi,Ge));for(let Sr=0;Sr<6;Sr++)Rt.push(...bo)}}let ae=new Xe;ae.setAttribute("position",new me(v,3)),ae.setAttribute("normal",new me(H,3)),ae.setAttribute("color",new me(z,3)),ae.setAttribute("aParede",new me(Q,4)),ae.setIndex(ot);let ie=new Xe;return ie.setAttribute("position",new me(Xt,3)),ie.setAttribute("aParede",new me(Rt,4)),{g:ae,gl:ie}}let Gt=mt(new un({vertexColors:!0,roughness:.88,side:dn})),Jt=mt(new un({vertexColors:!0,roughness:.88,side:dn})),it=mt(new un({color:"#efeae0",roughness:.9,transparent:!0,opacity:.13,depthWrite:!1,side:dn}),!0),I=mt(new un({color:"#8ec9ff",roughness:.1,metalness:.1,transparent:!0,opacity:.28,depthWrite:!1,side:dn})),L=mt(new Ti({color:"#2f2c27",transparent:!0,opacity:.5})),tt=[];function J(d,_,v,{cores:H=["#efeae0","#5f594f","#cfc8ba"],arestas:z=!0,fantasma:Q=!1}={}){if(!d||!d.length)return null;let{g:ot,gl:wt}=It(d,H),Ct=new ze(ot,_);if(Ct.renderOrder=2,D(v).add(Ct),Q){let Nt=new ze(ot,it);Nt.renderOrder=5,D(v).add(Nt),tt.push(Nt)}if(z){let Nt=new Wi(wt,L);Nt.renderOrder=3,D(v).add(Nt)}return Ct}let xt=J(n.paredes,Gt,"paredes",{fantasma:!0});J(n.muretas,Jt,"paredes",{cores:["#ddd5c6","#5f594f","#cfc8ba"],fantasma:!0}),J(n.guardas,I,"paredes"),J(n.vidros,I,"paredes",{arestas:!1});let ct=new un({color:"#a5a39c",roughness:.8}),at=[];for(let d of n.pilares){if(d.length<3)continue;let _=new $a(new ls(d.map(([H,z])=>new Pt(H,z))),{depth:s,bevelEnabled:!1}),v=new ze(_,ct);v.rotation.x=-Math.PI/2,D("pilares").add(v),at.push({m:v,cx:d.reduce((H,z)=>H+z[0],0)/d.length,cz:-d.reduce((H,z)=>H+z[1],0)/d.length})}if(n.planta){let d=atob(n.planta),_=new Uint8Array(d.length);for(let Q=0;Q<d.length;Q++)_[Q]=d.charCodeAt(Q);let v=new Int16Array(_.buffer),H=new Float32Array(v.length/2*3);for(let Q=0,ot=0;Q<v.length;Q+=2,ot+=3)H[ot]=v[Q]/100,H[ot+1]=ft,H[ot+2]=-v[Q+1]/100;let z=new Xe;z.setAttribute("position",new me(H,3)),D("planta").add(new Wi(z,new Ti({color:"#3a382f",transparent:!0,opacity:.6})))}J(n.folhas.map(([d,_,v,H])=>[d,_,v,H,.04,0,n.alturaPorta]),mt(new un({color:"#b08457",roughness:.7,transparent:!0,opacity:.85})),"portas",{arestas:!1});function q(d){let _=[],v=[],H=[];for(let[Q,ot]of d){let wt=Q.index?Q.toNonIndexed():Q,Ct=wt.attributes.position.array,Nt=wt.attributes.normal.array,[Xt,Rt,ae]=Array.isArray(ot)?ot:[ot,ot,ot];for(let ie=0;ie<Ct.length;ie++)_.push(Ct[ie]),v.push(Nt[ie]);for(let ie=0;ie<Ct.length/3;ie++)H.push(Xt,Rt,ae)}let z=new Xe;return z.setAttribute("position",new me(_,3)),z.setAttribute("normal",new me(v,3)),z.setAttribute("color",new me(H,3)),z}let W=(d,_,v,H=0,z=0,Q=0)=>new Vn(d,_,v).translate(H,z,Q+v/2),pt=(d,_,v=0,H=0,z=0,Q=14)=>new Gn(d,d,_,Q).rotateX(Math.PI/2).translate(v,H,z+_/2),St=(d,_=0,v=0,H=0)=>new Ts(d,14,6,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2).translate(_,v,H),yt=(d,_,v=0,H=0,z=0,Q=12)=>new Gn(d,d,_,Q).translate(v,H+_/2,z),ee=(d,_,v,H=0,z=0,Q=0,ot=12)=>new Gn(_,d,v,ot).rotateX(Math.PI/2).translate(H,z,Q+v/2),re=(d,_,v,H=0,z=10)=>new Gn(d,d,_,z).rotateZ(Math.PI/2).translate(H,0,v),Kt=.12,j={tomada:(d,_,v)=>q([[W(d,_,v),1],[pt(d*.34,.004,0,0,v),.7],[pt(d*.065,.004,-d*.14,0,v+.003,8),Kt],[pt(d*.065,.004,d*.14,0,v+.003,8),Kt]]),interruptor:(d,_,v)=>q([[W(d,_,v),1],[W(d*.52,_*.44,.012,0,0,v),.78],[W(d*.12,_*.04,.003,0,_*.14,v+.012),Kt]]),rede:(d,_,v)=>q([[W(d,_,v),1],[W(d*.62,_*.34,.004,0,_*.04,v),.7],[W(d*.38,_*.17,.004,0,_*.06,v+.003),Kt],[W(d*.14,_*.05,.004,0,-_*.05,v+.003),Kt]]),coaxial:(d,_,v)=>q([[W(d,_,v),1],[pt(d*.2,.014,0,0,v),.75],[pt(d*.06,.004,0,0,v+.014,10),Kt]]),quadro:(d,_,v)=>q([[W(d,_,v*.85),.68],[W(d-.04,_-.04,.012,0,0,v*.85),1.05],[W(.025,.1,.02,d/2-.07,0,v*.85+.012),Kt],[W(d*.36,.05,.003,0,_/2-.1,v*.85+.012),.3]]),rack:(d,_,v)=>q([[W(d,_,v*.92),.4],[W(d-.03,_-.03,.01,0,0,v*.92),.8],[W(d-.1,_-.1,.004,0,0,v*.92+.01),.22],[W(.02,.08,.02,d/2-.05,0,v*.92+.01),1.3]]),caixa:(d,_,v)=>q([[W(d,_,v),1],[W(d*.7,_*.7,.004,0,0,v),.7]]),teclado:(d,_,v)=>{let H=[[W(d,_,v),1],[W(d*.72,_*.2,.003,0,_*.28,v),Kt]];for(let z of[.06,-.07,-.2,-.33])for(let Q of[-.24,0,.24])H.push([W(d*.17,_*.08,.004,Q*d,z*_,v),.55]);return q(H)},acionador:(d,_,v)=>q([[W(d,_,v),1],[W(d*.6,_*.6,.004,0,0,v),1.5],[pt(d*.12,.006,0,0,v+.004,12),Kt]]),sirene:(d,_,v)=>q([[W(d,_,v*.45),.85],[pt(d*.36,v*.55,0,0,v*.45),1.35]]),barra:(d,_,v)=>q([[W(d,_,v),1],[W(d*.9,_*.3,.003,0,0,v),.6]]),emergencia:(d,_,v)=>q([[W(d,_,v),.9],[W(d*.36,_*.5,.004,-d*.22,0,v),1.8],[W(d*.36,_*.5,.004,d*.22,0,v),1.8]]),wallbox:(d,_,v)=>q([[W(d,_,v),1],[W(d*.5,_*.18,.003,0,_*.22,v),Kt],[pt(d*.16,.05,0,-_*.18,v),.5]]),luminaria:(d,_,v)=>q([[W(d,_,v),.62],[W(d-.05,_-.05,.004,0,0,v),1.25]]),"ponto-luz":(d,_,v)=>q([[pt(d*.5,v*.25),.7],[St(d*.3,0,0,v*.25),1.3]]),detector:(d,_,v)=>q([[pt(d*.5,v*.3),.78],[pt(d*.4,v*.7,0,0,v*.3),1.05],[pt(d*.05,.004,d*.2,0,v,8),Kt]]),sensor:(d,_,v)=>q([[pt(d*.5,v*.35),.85],[St(d*.32,0,0,v*.35),1.2]]),ap:(d,_,v)=>q([[pt(d*.5,v,0,0,0,24),1.1],[pt(d*.08,.003,0,0,v,8),.4]]),camera:(d,_,v)=>{let H=v-.08;return q([[pt(.035,.012),.6],[W(.025,.025,.07,0,0,.012),.6],[pt(d*.5,H,0,0,.08),1],[W(d*1.2,.01,H*.85,0,d*.5+.006,.08+H*.18),.85],[pt(d*.32,.004,0,0,v),Kt]])},dome:(d,_,v)=>q([[pt(d*.5,v*.3),.9],[St(d*.42,0,0,v*.3),.3]]),"sensor-canto":(d,_,v)=>q([[W(d,_,v),1],[W(d*.78,_*.42,.008,0,-_*.12,v),.35],[pt(d*.06,.003,0,_*.32,v,8),Kt]]),catraca:(d,_,v)=>q([[new Vn(d,_,v).translate(0,_/2,0),.9],[new Vn(d*1.05,.04,v*1.02).translate(0,_,0),.6]]),poste:(d,_,v)=>q([[W(.3,.3,.03),.5],[pt(.07,v-.03,0,0,.03,10),.55],[pt(.045,.1,0,0,v-.05,10),.55],[W(d*.55,.05,.05,d*.27,0,v-.3),.55],[W(.42,_,.12,d*.55,0,v-.42),1],[W(.36,_*.8,.004,d*.55,0,v-.424),1.8]]),"caixa-piso":(d,_,v)=>q([[W(d,_,v),.6],[W(d*.9,_*.9,.004,0,0,v),1.1]]),transformador:(d,_,v)=>{let H=d*.55,z=_*.78,Q=v*.6,ot=.08,wt=[[W(H*1.06,z*1.06,ot),.45],[W(H,z,Q,0,0,ot),1],[W(H*1.05,z*1.05,.04,0,0,ot+Q),.82]];for(let Nt of[-1,1])for(let Xt=0;Xt<6;Xt++)wt.push([W((d-H)/2*.9,.025,Q*.82,Nt*(H/2+(d-H)/4),-z*.4+Xt*z*.8/5,ot+Q*.09),.9]);let Ct=ot+Q+.04;for(let Nt of[-H*.3,0,H*.3])wt.push([pt(.045,v*.24,Nt,-z*.22,Ct,10),.5],[pt(.07,.02,Nt,-z*.22,Ct+v*.08,10),.5],[pt(.07,.02,Nt,-z*.22,Ct+v*.15,10),.5]);for(let Nt of[-H*.36,-H*.12,H*.12,H*.36])wt.push([pt(.03,v*.12,Nt,z*.25,Ct,8),.55]);return q(wt)},seccionadora:(d,_,v)=>{let H=[[W(d,.06,.06,0,_*.4),.7],[W(d,.06,.06,0,-_*.4),.7],[W(d*.95,.03,.03,0,-_*.47,.03),.8]];for(let z of[-d/3,0,d/3])H.push([yt(.035,_*.18,z,_*.22,v*.45),.55],[yt(.035,_*.18,z,-_*.4,v*.45),.55],[W(.035,.035,v*.45,z,_*.31,.06),.6],[W(.035,.035,v*.45,z,-_*.31,.06),.6],[W(.03,_*.62,.02,z,0,v*.82),1.25]);return q(H)},mufla:(d,_,v)=>{let H=[[W(d,.06,.08,0,-_*.32),.7]];for(let z of[-d/3,0,d/3]){H.push([yt(.035,_*.72,z,-_*.35,v*.6),1],[yt(.012,_*.1,z,_*.37,v*.6,6),1.4]);for(let Q of[_*.05,_*.17,_*.29])H.push([yt(.06,.012,z,Q,v*.6),.9])}return q(H)},"para-raios":(d,_,v)=>{let H=[[W(d,.05,.06,0,-_*.45),.7]];for(let z of[-d/3,0,d/3]){H.push([yt(.035,_*.8,z,-_*.42,v*.6),1]);for(let Q of[-_*.25,-_*.08,_*.09,_*.26])H.push([yt(.06,.014,z,Q,v*.6),.9])}return q(H)},"chave-fusivel":(d,_,v)=>q([[W(.06,.08,v*.4),.6],[yt(.035,_*.6,0,-_*.3,v*.45),1],[W(.03,_*.85,.03,d*.3,0,v*.8),.7],[W(.08,.04,.05,d*.3,_*.43,v*.7),1.3],[W(.08,.04,.05,d*.3,-_*.43,v*.7),1.3]]),"poste-mt":(d,_,v)=>q([[W(.5,.5,.06),.6],[ee(.17,.09,v-.06,0,0,.06),1],[W(d,.1,.1,0,0,v-.45),.72],...[-d*.4,0,d*.4].map(H=>[pt(.04,.14,H,0,v-.35,8),.5])]),cruzeta:(d,_,v)=>q([[W(d,_,v),1],[W(.06,_*1.6,v*.6),.6]]),isolador:(d,_,v)=>q([[yt(d*.28,_*.8,0,-_*.4,v/2),1],[yt(d*.5,.02,0,-_*.1,v/2),.9],[yt(d*.42,.02,0,_*.12,v/2),.9]]),cabo:(d,_,v)=>q([[pt(d*.5,v*.1),.75],[pt(d*.36,v*.8,0,0,v*.1),1],[pt(d*.5,v*.1,0,0,v*.9),.75]]),"eletroduto-peca":(d,_,v)=>q([[re(_*.4,d,v*.45),1],[re(_*.5,.06,v*.45,-d/2+.03),.7],[re(_*.5,.06,v*.45,d/2-.03),.7]]),poco:(d,_,v)=>q([[pt(d*.5,v,0,0,0,20),.85],[pt(d*.42,.012,0,0,v,20),.55],[W(d*.2,.03,.01,0,0,v+.012),Kt]]),"disjuntor-mt":(d,_,v)=>{let H=[[W(d,_,v*.18),.55],[W(d*.9,_*.6,v*.52,0,-_*.12,v*.18),1],[W(d*.5,.01,v*.2,0,-_*.42-.005,v*.3),Kt]];for(let z of[-d*.28,0,d*.28])H.push([pt(.06,v*.3,z,_*.12,v*.7,10),.7]);return q(H)},cubiculo:(d,_,v)=>q([[W(d,_,v),1],[W(d*.88,.012,v*.8,0,-_/2-.006,v*.08),1.1],[W(d*.3,.014,v*.12,0,-_/2-.007,v*.6),.3],[W(.03,.03,.12,d*.36,-_/2-.02,v*.45),Kt]]),haste:(d,_,v)=>q([[pt(d*.5,.04,0,0,0,16),.6],[pt(.009,v,0,0,0,6),1],[W(.045,.045,.045,0,0,v*.55),.75]]),cordoalha:(d,_,v)=>q([[re(_/2,d,v/2),1]]),tapete:(d,_,v)=>q([[W(d,_,v),1],[W(d*.92,_*.92,.002,0,0,v),1.25]]),tela:(d,_,v)=>{let H=[[pt(.025,v,-d/2,0,0,8),.8],[pt(.025,v,d/2,0,0,8),.8],[W(d,.03,.03,0,0,v-.03),.8],[W(d,.03,.03,0,0,.05),.8],[W(d,.004,v*.9,0,0,.06),1.15]];for(let z=1,Q=Math.max(2,Math.round(d/.15));z<Q;z++)H.push([W(.006,.012,v*.9,-d/2+z*d/Q,0,.06),.6]);return q(H)},canaleta:(d,_,v)=>{let H=[[W(d,_,v),.55]];for(let z=0;z<6;z++)H.push([W(d,.012,.006,0,-_*.42+z*_*.84/5,v),1.2]);return q(H)},rele:(d,_,v)=>q([[W(d,_,v),1],[W(d*.62,_*.24,.004,0,_*.2,v),Kt],[W(d*.12,_*.06,.006,-d*.2,-_*.15,v),1.6],[W(d*.12,_*.06,.006,d*.2,-_*.15,v),1.6]]),"tc-tp":(d,_,v)=>q([[W(d,_*.2,v,0,-_*.4),.7],[yt(d*.42,_*.62,0,-_*.3,v/2),1],[W(d*.6,.04,.04,0,_*.36,v/2),1.3]]),medicao:(d,_,v)=>q([[W(d,_,v),1],[W(d*.5,_*.3,.004,0,_*.15,v),.3],[W(.03,.08,.012,d*.4,0,v),.6]]),barramento:(d,_,v)=>q([[W(.04,_*.9,v*.6,-d*.45),.5],[W(.04,_*.9,v*.6,d*.45),.5],...[-_*.3,0,_*.3].map(H=>[W(d,.05,.012,0,H,v*.6),1])]),extintor:(d,_,v)=>q([[W(.07,.12,.02),.5],[yt(d*.45,_*.78,0,-_/2,v/2),1],[yt(.02,_*.08,0,_*.28,v/2,8),.4],[W(.1,.015,.025,0,_*.38,v/2),.4],[W(.016,_*.42,.016,d*.45,-_*.1,v/2),.25]]),placa:(d,_,v)=>q([[W(d,_,v),1],[W(d*.86,_*.82,.002,0,0,v),1.15],[W(d*.12,_*.5,.003,0,0,v+.002),Kt]]),veneziana:(d,_,v)=>{let H=[[W(d,_,v*.4),.75]];for(let z=0;z<6;z++)H.push([W(d*.94,_/11,v*.6,0,-_/2+(z+.5)*_/6,v*.4),1.1]);return q(H)}},Re=new Set(["poste","transformador","poste-mt","cabo","eletroduto-peca","poco","disjuntor-mt","cubiculo","haste","cordoalha","tapete","tela","canaleta"]),xe={tomada:[.1,.16,.03],interruptor:[.1,.16,.03],quadro:[.6,.8,.15],rack:[.6,.6,.45],luminaria:[.62,.62,.06],"ponto-luz":[.26,.26,.1],detector:[.16,.16,.07],sensor:[.13,.13,.06],camera:[.11,.11,.32],"sensor-canto":[.08,.13,.07],catraca:[.3,1,.8],barra:[.3,.06,.05]},k=new Set(["luminaria","ponto-luz","detector","sensor","ap","dome"]);for(let d of n.dispositivos)d.tam=d.tam||xe[d.forma]||[.18,.18,.07],d.montagem=d.montagem||(k.has(d.forma)?"teto":d.forma==="catraca"?"piso":d.forma==="camera"||d.forma==="sensor-canto"?"canto":"parede");let M={uPx:{value:.001},uMin:{value:14},uBase:{value:1},uMinInfra:{value:3}},st=40;function dt(d,_,v){let H=new un({color:d,vertexColors:!0,emissive:d,emissiveIntensity:v,roughness:.55,metalness:.05});return H.onBeforeCompile=z=>{Object.assign(z.uniforms,{uPx:M.uPx,uMin:M.uMin,uBase:M.uBase,uTam:{value:_}}),z.vertexShader=z.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMin; uniform float uBase; uniform float uTam;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = max(uBase, min(uMin * uPx * distance(cameraPosition, o) / uTam, ${st.toFixed(1)}));
  transformed *= s;
}
#endif`),z.fragmentShader=z.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
#ifdef USE_COLOR
totalEmissiveRadiance *= vColor.rgb;
#endif`)},H.customProgramCacheKey=()=>"dispositivo",H}function _t(d,_){return Math.max(M.uBase.value,Math.min(M.uMin.value*M.uPx.value*_/d,st))}let Ut=[],Tt=new vn,vt=new X(0,0,1),bt=new X(0,1,0),Ht=new In,Ot=new X;function qt(d,_){d.itens.forEach(([v,H,z,Q,ot],wt)=>{Tt.position.set(v,z,-H),Tt.quaternion.identity(),d.montagem==="teto"?Tt.quaternion.setFromUnitVectors(vt,Ot.set(0,-1,0)):d.montagem==="piso"?(d.forma!=="catraca"&&Tt.quaternion.setFromUnitVectors(vt,Ot.set(0,1,0)),(Q||ot)&&d.forma!=="catraca"&&Tt.quaternion.premultiply(Ht.setFromAxisAngle(bt,Math.atan2(ot,Q)))):(Q||ot)&&(Ot.set(Q,0,-ot).normalize(),d.forma==="camera"?Ot.y=-.45:d.forma==="sensor-canto"&&(Ot.y=-.35),Tt.quaternion.setFromUnitVectors(vt,Ot.normalize())),Tt.scale.set(1,1,1),Tt.updateMatrix(),_.setMatrixAt(wt,Tt.matrix)}),_.instanceMatrix.needsUpdate=!0}let $t=[],Qt=new Map;for(let d of n.dispositivos){if(!d.itens.length)continue;let _=d.forma==="luminaria"?.55:d.forma==="ponto-luz"?.5:.22;d.tamMax=Math.max(...d.tam);let v=(j[d.forma]||j.caixa)(...d.tam),H=dt(d.cor,d.tamMax,_);d.montagem==="teto"&&(H.transparent=!0,$t.push(H));let z=new Hi(v,H,d.itens.length);z.userData={tipo:d},z.renderOrder=1,z.frustumCulled=!1,qt(d,z),D(`disc:${d.disciplina}`).add(z),Ut.push(z),d.malha=z;for(let Q of d.itens)Qt.has(Q[5])||Qt.set(Q[5],[]),Qt.get(Q[5]).push([d,Q]);if(d.itens.some(Q=>Array.isArray(Q[7]))){let Q=[],ot=[],wt=[];for(let[Nt,Xt,Rt,,,,,ae]of d.itens){if(!Array.isArray(ae)||ae.length<6)continue;let ie=[];for(let pe=0;pe<ae.length;pe+=2)ie.push([ae[pe],ae[pe+1]]);let oe=[Nt,Rt,-Xt],_e=ft;for(let pe=1;pe<ie.length-1;pe++)Q.push(ie[0][0],_e,-ie[0][1],ie[pe][0],_e,-ie[pe][1],ie[pe+1][0],_e,-ie[pe+1][1]);for(let pe=0;pe<ie.length;pe++){let Me=ie[pe],sn=ie[(pe+1)%ie.length];ot.push(...oe,Me[0],_e,-Me[1],sn[0],_e,-sn[1]),wt.push(Me[0],_e+.005,-Me[1],sn[0],_e+.005,-sn[1])}}let Ct=(Nt,Xt,Rt=ze)=>{let ae=new Xe;ae.setAttribute("position",new me(Nt,3));let ie=new Rt(ae,Xt);return ie.renderOrder=4,D("campo").add(ie),ie};Ct(Q,new Jn({color:d.cor,transparent:!0,opacity:.22,depthWrite:!1,side:dn})),Ct(ot,new Jn({color:d.cor,transparent:!0,opacity:.05,depthWrite:!1,side:dn})),Ct(wt,new Ti({color:d.cor,transparent:!0,opacity:.7}),Wi)}}let le=n.instalacao&&Array.isArray(n.instalacao.pontos)&&Array.isArray(n.instalacao.quadros)?n.instalacao:null,Bt=le?Vc(le,n.titulo):null,nt={luminaria:"luz",ponto_luz:"luz",tomada:"tomada",tue:"tomada",motor:"motor"},Dt=[],Mt=new WeakMap,kt=new he(1,1,1),Ft=new he,At=null;if(Bt){let d=new Map(Bt.quadros().filter(v=>v.ponto).map(v=>[String(v.ponto),v.tag]));for(let v of n.dispositivos)v.malha&&v.itens.forEach((H,z)=>{let Q=String(H[6]||""),ot=null,wt=null;v.forma==="quadro"?(ot="quadro",wt=d.get(Q)||null):Q&&Bt.temPonto(Q)&&(ot=nt[Bt.ponto(Q).tipo]||"comando"),ot&&Dt.push({t:v,i:z,it:H,id:Q,kind:ot,quadro:wt})});let _=Dt.filter(v=>v.kind==="quadro"&&!v.quadro);_.length===1&&Bt.quadros().length===1&&(_[0].quadro=Bt.quadros()[0].tag);for(let v=Dt.length-1;v>=0;v--)Dt[v].kind==="quadro"&&!Dt[v].quadro&&Dt.splice(v,1);for(let v of Dt)Mt.set(v.it,v);for(let v of new Set(Dt.map(H=>H.t))){for(let H=0;H<v.itens.length;H++)v.malha.setColorAt(H,kt);v.malha.instanceColor.needsUpdate=!0}}function ne(d){if(d.kind==="quadro"){let v=Bt.quadro(d.quadro);return v&&[v.geral?.tag,...(v.disjuntores||[]).map(z=>z.tag),...(v.drs||[]).map(z=>z.tag)].filter(Boolean).some(z=>!Bt.ligado(z,v.tag))?Ft.setRGB(1.6,1.05,.35):Ft.copy(kt)}let _=Bt.estadoPonto(d.id);if(!_)return Ft.copy(kt);if(d.kind==="luz"){if(!_.alimentado)return Ft.setRGB(.2,.2,.24);let v=_.nivel;return Ft.setRGB(.3+1.45*v,.3+1.32*v,.33+.97*v)}if(d.kind==="tomada")return _.alimentado?Ft.copy(kt):Ft.setRGB(1.55,.18,.18);if(d.kind==="motor"){let v=Bt.painel(_.circuito);return _.alimentado?_.energizado?Ft.setRGB(.45,1.7,.55):v?.termico?Ft.setRGB(1.7,1.1,.2):Ft.setRGB(.7,.7,.7):Ft.setRGB(.45,.25,.25)}return _.alimentado?Ft.copy(kt):Ft.setRGB(.6,.3,.3)}function te(){if(!Bt)return;let d=new Set;for(let _ of Dt)_.t.malha.setColorAt(_.i,ne(_)),d.add(_.t.malha);for(let _ of d)_.instanceColor.needsUpdate=!0;Qe(),nu(),At?.atualizar(),vh(),p(!0)}let Fe=window.matchMedia?.("(pointer: coarse)").matches||window.innerWidth<=900?8:12,we=[],pn=D("luzes-sim");if(pn.visible=!1,Bt&&Dt.some(d=>d.kind==="luz"))for(let d=0;d<Fe;d++){let _=new ja("#fff1d6",0,7,2);pn.add(_),we.push(_)}function Qe(){if(!we.length)return;let d=Se==="dentro"&&Je>=0,_=0,v=[];if(d)for(let z of Dt){if(z.kind!=="luz"||z.it[5]!==Je)continue;_++;let Q=Bt.estadoPonto(z.id).nivel;Q>0&&v.push({x:z,n:Q,d:b.position.distanceToSquared(Ot.set(z.it[0],z.it[2],-z.it[1]))})}pn.visible=d&&_>0;let H=pn.visible?v.reduce((z,Q)=>z+Q.n,0)/_:1;B.intensity=y*(.3+.7*H),N.intensity=C*(.3+.7*H),v.sort((z,Q)=>z.d-Q.d),we.forEach((z,Q)=>{let ot=v[Q];z.intensity=ot?3.2*ot.n:0,ot&&z.position.set(ot.x.it[0],ot.x.it[2]-.15,-ot.x.it[1])}),p()}let Ce=null,Fn=new Map,di=new Map;{let d=(0,fn.redeDaSubestacao)(Array.isArray(n.componentes)?n.componentes:[]),_=[];n.dispositivos.forEach(ot=>{fn.PAPEL_DO_SIMBOLO[ot.simbolo]&&ot.itens.forEach((wt,Ct)=>_.push({id:wt[6]?String(wt[6]):`${ot.simbolo}#${Ct+1}`,simbolo:ot.simbolo,x:wt[0],y:wt[1],rotulo:String(ot.rotulo)+" "+String(wt[6]||Ct+1),_t:ot,_i:Ct}))});let v=_.some(ot=>ot.simbolo==="HM-CFTV-CAMERA"),H=_.filter(ot=>ot.simbolo!=="HM-CAB-RACK"||v),z=(0,fn.redeDeSinal)(H),Q=[...d.equipamentos,...z.equipamentos];if(Q.length){Ce=(0,fn.criarInteracao)(Q);let ot=(Ct,Nt,Xt)=>{let Rt=Nt.itens[Xt];Fn.has(Rt)||Fn.set(Rt,[]),Fn.get(Rt).includes(Ct)||Fn.get(Rt).push(Ct),di.has(Ct)||di.set(Ct,[]),di.get(Ct).push({t:Nt,i:Xt})};for(let[Ct,Nt]of d.vinculos)for(let Xt of n.dispositivos.filter(Rt=>Rt.componente!=null&&String(Rt.componente)===Nt))Xt.itens.forEach((Rt,ae)=>ot(Ct,Xt,ae));for(let[Ct,Nt]of z.vinculos){let Xt=H.find(Rt=>Rt.id===Nt);Xt&&ot(Ct,Xt._t,Xt._i)}let wt=`hm3d-rede:${(n.titulo||"").slice(0,40)}|${Q.length}`;try{let Ct=window.sessionStorage.getItem(wt);Ct&&Ce.importar(JSON.parse(Ct))}catch{}Ce.assinar(()=>{try{window.sessionStorage.setItem(wt,JSON.stringify(Ce.exportar()))}catch{}}),Bt&&(0,fn.ligarAoSimulador)(Ce,Bt);for(let Ct of new Set([...di.values()].flat().map(Nt=>Nt.t)))if(Ct.malha){for(let Nt=0;Nt<Ct.itens.length;Nt++)Ct.malha.setColorAt(Nt,kt);Ct.malha.instanceColor.needsUpdate=!0}}}let Pi={energizado:[1,1,1],normal:[1,1,1],apagado:[.22,.22,.26],aberto:[.45,1.45,.55],falha:[1.75,1.1,.2],alarme:[1.95,.32,.28],alerta:[1.65,.95,.3],armado:[.6,.95,1.7]},Ii=(d,_)=>_.find(v=>!String(v).includes(":"))||_[0];function $s(){Ce&&(ps(),nu(),p(!0))}function ps(){let d=new Set;for(let[_,v]of Fn){let H=Ii(_,v);for(let{t:z,i:Q}of di.get(H)||[]){if(z.itens[Q]!==_||!z.malha)continue;let ot=Pi[Ce.aparencia(H)]||Pi.normal;z.malha.setColorAt(Q,Ft.setRGB(ot[0],ot[1],ot[2])),d.add(z.malha)}}for(let _ of d)_.instanceColor.needsUpdate=!0}Ce&&(Ce.assinar($s),ps());let Wn=d=>d?{transparent:!0,opacity:.55,depthWrite:!1}:{};function $n(d,_,v=!1){let H=new un({color:d,emissive:d,emissiveIntensity:.18,roughness:.45,metalness:.35,...Wn(v)});return H.onBeforeCompile=z=>{Object.assign(z.uniforms,{uPx:M.uPx,uMinInfra:M.uMinInfra,uSecao:{value:_}}),z.vertexShader=z.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMinInfra; uniform float uSecao;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = clamp(uMinInfra * uPx * distance(cameraPosition, o) / uSecao, 1.0, 15.0);
  transformed.yz *= s;
}
#endif`)},H.customProgramCacheKey=()=>"infra",H}let Bn=D("infra");for(let d of r){let _=d.segmentos||[],v=Math.floor(_.length/4);if(!v)continue;let H=new Rn;D(`infra:${d.disciplina}`,Bn).add(H),d.objeto=H;let[z,Q]=d.secao||[.05,.05];if(d.forma!=="linha"){let Rt=d.forma==="tubo"?new Gn(.5,.5,1,8).rotateZ(Math.PI/2):new Vn(1,1,1),ae=new Hi(Rt,$n(d.cor,Math.max(z,Q),d.sugerido),v);for(let ie=0;ie<v;ie++){let oe=_[ie*4],_e=_[ie*4+1],pe=_[ie*4+2],Me=_[ie*4+3],sn=Math.hypot(pe-oe,Me-_e);Tt.position.set((oe+pe)/2,d.z,-(_e+Me)/2),Tt.quaternion.identity(),Tt.rotation.set(0,Math.atan2(Me-_e,pe-oe),0),Tt.scale.set(sn+z,Q,z),Tt.updateMatrix(),ae.setMatrixAt(ie,Tt.matrix)}ae.instanceMatrix.needsUpdate=!0,ae.frustumCulled=!1,ae.renderOrder=1,H.add(ae),d.mats=[ae.material]}let ot=d.descidas||[],wt=Math.floor(ot.length/4),Ct=d.forma==="tubo"?z:.025;if(d.forma!=="linha"){let Rt=new Map,ae=(ue,Ge)=>`${Math.round(ue*50)}|${Math.round(Ge*50)}`;for(let ue=0;ue<v&&ue<2e4;ue++){let Ge=_[ue*4],Cn=_[ue*4+1],on=_[ue*4+2],ln=_[ue*4+3],gn=Math.hypot(on-Ge,ln-Cn)||1;for(let[Fi,js,De,bo]of[[Ge,Cn,(on-Ge)/gn,(ln-Cn)/gn],[on,ln,(Ge-on)/gn,(Cn-ln)/gn]]){let fa=ae(Fi,js);Rt.has(fa)||Rt.set(fa,{x:Fi,y:js,d:[]}),Rt.get(fa).d.push([De,bo])}}let ie=[],oe=[];for(let ue of Rt.values())ue.d.length>=3?oe.push([ue.x,d.z,-ue.y]):ue.d.length===2&&ue.d[0][0]*ue.d[1][0]+ue.d[0][1]*ue.d[1][1]>-.95&&ie.push([ue.x,d.z,-ue.y]);let _e=[];for(let ue=0;ue<wt;ue++){let[Ge,Cn,on,ln]=ot.slice(ue*4,ue*4+4);_e.push([Ge,Math.abs(on-d.z)<Math.abs(ln-d.z)?on:ln,-Cn])}let pe=new un({color:d.cor,emissive:d.cor,emissiveIntensity:.18,roughness:.5,metalness:.3,...Wn(d.sugerido)});d.mats=[...d.mats||[],pe];let Me=(ue,Ge,Cn)=>{let on=Math.min(ue.length,6e3);if(!on)return;let ln=new Hi(Ge,pe,on);for(let gn=0;gn<on;gn++)Tt.position.set(...ue[gn]),Tt.quaternion.identity(),Tt.rotation.set(0,0,0),Tt.scale.set(Cn,Cn,Cn),Tt.updateMatrix(),ln.setMatrixAt(gn,Tt.matrix);ln.instanceMatrix.needsUpdate=!0,ln.frustumCulled=!1,H.add(ln)},sn=Math.max(z,Q);Me(ie,new Ts(.5,10,6),sn*1.3),Me(oe,new Vn(1,1,1),Math.max(sn*2.2,.08)),Me(_e,new Vn(1,1,1),Math.max(Ct*2.4,.06)),d.componentes={curvas:ie.length,caixas:oe.length,conduletes:_e.length}}if(wt&&d.forma!=="linha"){let Rt=new Hi(new Gn(.5,.5,1,8),new un({color:d.cor,emissive:d.cor,emissiveIntensity:.18,roughness:.45,metalness:.35,...Wn(d.sugerido)}),wt);d.mats=[...d.mats||[],Rt.material];for(let ae=0;ae<wt;ae++){let[ie,oe,_e,pe]=ot.slice(ae*4,ae*4+4);Tt.position.set(ie,(_e+pe)/2,-oe),Tt.quaternion.identity(),Tt.rotation.set(0,0,0),Tt.scale.set(Ct,Math.max(.01,pe-_e),Ct),Tt.updateMatrix(),Rt.setMatrixAt(ae,Tt.matrix)}Rt.instanceMatrix.needsUpdate=!0,Rt.frustumCulled=!1,H.add(Rt)}let Nt=new Float32Array((v+wt)*6);for(let Rt=0;Rt<v;Rt++)Nt.set([_[Rt*4],d.z,-_[Rt*4+1],_[Rt*4+2],d.z,-_[Rt*4+3]],Rt*6);for(let Rt=0;Rt<wt;Rt++)Nt.set([ot[Rt*4],ot[Rt*4+2],-ot[Rt*4+1],ot[Rt*4],ot[Rt*4+3],-ot[Rt*4+1]],(v+Rt)*6);let Xt=new Xe;Xt.setAttribute("position",new me(Nt,3)),H.add(new Wi(Xt,new Ti({color:d.cor,transparent:!0,opacity:d.forma==="linha"?.95:.8})))}let mr={eletroduto:"Eletroduto",eletrocalha:"Eletrocalha",leito:"Leito para cabos",perfilado:"Perfilado",fiacao:"Fiação / cabos",duto:"Duto de ar"},qn=d=>d.tipoInfra||(d.sugerido?"sugerido":d.tipo||"eletroduto"),rn=Array.isArray(n.legendaInfra)&&n.legendaInfra.length?n.legendaInfra:(()=>{let d=new Map;for(let _ of r){let v=qn(_);d.has(v)||d.set(v,{tipo:v,rotulo:_.sugerido?"Caminho sugerido pelo sistema":mr[v]||v,cor:_.cor,cor_fonte:"padrao",fonte_texto:"cor da cena",medidas:[],materiais:[],comprimento_m:0});let H=d.get(v);H.comprimento_m=Math.round((H.comprimento_m+(_.comprimento_m||0))*10)/10,_.medida&&!H.medidas.includes(_.medida)&&H.medidas.push(_.medida)}return[...d.values()]})(),ni={},Xn=null;function Ln(){for(let d of r){if(!d.objeto)continue;let _=qn(d);d.objeto.visible=ni[_]!==!1&&(!d.sugerido||Ne.sugerido);for(let v of d.mats||[])v.emissiveIntensity=Xn?_===Xn?.85:.02:.18,v.color.set(!Xn||_===Xn?d.cor:"#3a3d42")}p(!0)}let qs=d=>[d.rotulo,d.material,d.medida].filter(Boolean).join(" "),Di=d=>({texto:"medida do desenho",desenho:"medida do desenho",layer:"medida da layer",legenda:"medida da legenda",estimado:"traçado e bitola estimados — conferir",sugerido:"caminho SUGERIDO pelo sistema (não está no projeto) — conferir"})[d.origem_medida]||"medida padrão ilustrativa",Ne={paredes:0,corte:!0,ambientes:!0,etiquetas:!0,portas:!0,planta:!0,campo:!1,giro:!1,grandes:!1,infra:!0,sugerido:!0},Se="geral",Je=-1,R=null,Y=null,w=0,F=0,U=new X,lt={lateral:0,topo:0},Et=t("#etiquetas"),gt=n.ambientes.map(d=>{let _=document.createElement("div");return _.className="etq",_.innerHTML=`<b>${i(d.nome)}</b><span>${e(d.area_m2)} m²</span>`,Et.appendChild(_),{a:d,el:_,p:A(d.centro[0],d.centro[1],.05),lado:Math.sqrt(d.area_m2),ret:null}}).sort((d,_)=>_.a.area_m2-d.a.area_m2);function Lt(){if(!Ne.etiquetas||Se!=="geral"){for(let z of gt)z.el.style.display="none",z.ret=null;return}let d=l.clientWidth,_=l.clientHeight,v=_/2/Math.tan(hn.degToRad(b.fov/2)),H=[];for(let z of gt){Ot.copy(z.p).project(b);let Q=b.position.distanceTo(z.p),ot=z.lado*v/Math.max(Q,.1),wt=(Ot.x+1)/2*d,Ct=(1-Ot.y)/2*_,Nt=Ot.z<1&&ot>38&&wt>50&&wt<d-lt.lateral-50&&Ct>lt.topo+18&&Ct<_-60;if(Nt){let Xt=[wt-55,Ct-16,wt+55,Ct+16];H.some(Rt=>Xt[0]<Rt[2]&&Xt[2]>Rt[0]&&Xt[1]<Rt[3]&&Xt[3]>Rt[1])?Nt=!1:H.push(Xt)}z.el.style.display=Nt?"":"none",z.ret=Nt?[wt-60,Ct-18,wt+60,Ct+18]:null,Nt&&(z.el.style.transform=`translate(-50%, -50%) translate(${wt.toFixed(1)}px, ${Ct.toFixed(1)}px)`)}}function Vt(d,_){return d.montagem==="teto"?"no teto":d.montagem==="piso"?"no piso":d.montagem==="topo-porta"?"acima da porta":d.montagem==="canto"?`no alto do canto · h = ${e(_[2])} m`:`h = ${e(_[2])} m`}let Wt=t("#etiquetas-pontos"),se=[];function Yt(d){if(!se[d]){let _=document.createElement("div");_.className="etq-p";let v=document.createElement("b"),H=document.createElement("span");_.append(v,H),Wt.appendChild(_),se[d]={el:_,b:v,s:H,chave:null}}return se[d]}function ve(){let d=0;if(Wt&&Se==="dentro"&&!Y&&Ne.etiquetas){let _=l.clientWidth,v=l.clientHeight,H=[];for(let[Q,ot]of Qt.get(Je)||[]){if(!Q.malha.visible||!Q.malha.parent.visible)continue;Ot.set(ot[0],ot[2],-ot[1]);let wt=b.position.distanceTo(Ot),Ct=_t(Q.tamMax,wt),Nt=Q.montagem==="teto";if(Ot.y+=Nt?-Q.tam[2]*Ct:Q.montagem==="piso"?(Re.has(Q.forma)?Q.tam[2]:Q.tam[1])*Ct:Q.tam[1]/2*Ct,Ot.project(b),Ot.z>1||Ot.z<-1)continue;let Xt=(Ot.x+1)/2*_,Rt=(1-Ot.y)/2*v;Xt<20||Xt>_-lt.lateral-20||Rt<lt.topo+50||Rt>v-70||H.push({t:Q,it:ot,d:wt,x:Xt,y:Nt?Rt+46:Rt})}H.sort((Q,ot)=>Q.d-ot.d);let z=[];for(let Q of H){if(d>=30)break;let ot=[Q.x-70,Q.y-46,Q.x+70,Q.y-6];if(z.some(Nt=>ot[0]<Nt[2]&&ot[2]>Nt[0]&&ot[1]<Nt[3]&&ot[3]>Nt[1]))continue;z.push(ot);let wt=Yt(d++),Ct=`${Q.t.simbolo}|${Q.it[6]}|${Q.it[0]}|${Q.it[1]}`;wt.chave!==Ct&&(wt.chave=Ct,wt.b.textContent=Q.t.rotulo,wt.s.textContent=Vt(Q.t,Q.it)+(Q.it[6]?` · ${Q.it[6]}`:""),wt.el.style.setProperty("--cor",Q.t.cor),wt.el.style.display="",wt.larg=wt.el.offsetWidth),wt.el.style.display="",Q.x=hn.clamp(Q.x,wt.larg/2+4,_-lt.lateral-wt.larg/2-4),wt.el.style.transform=`translate(-50%, -100%) translate(${Q.x.toFixed(1)}px, ${(Q.y-6).toFixed(1)}px)`}}for(let _=d;_<se.length;_++)se[_].el.style.display="none"}let Ue=new X((x+m)/2,0,-(S+g)/2);function ce(){let d=l.clientWidth,_=l.clientHeight,v=document.querySelector("aside"),H=d>900&&v?v.offsetWidth+16:0,z=document.querySelector("#barra")?.getBoundingClientRect().bottom||0;return{w:d,h:_,lateral:H,topo:z,livreW:Math.max(200,d-H-32),livreH:Math.max(200,_-z-50)}}function be(d){b.fov=d,b.updateProjectionMatrix(),p()}function je(){lh(),be(45);let d=ce(),_=Math.max(1,d.w/d.livreW*.85)*Math.max(1,1/b.aspect);b.position.copy(Ue).add(new X(T*.42*_,T*.5*_,T*.58*_)),E.target.copy(Ue),E.update()}function jt(){lh(),be(30);let d=ce(),_=2*Math.tan(hn.degToRad(b.fov/2)),v=Math.max(P*d.w/(d.livreW*_*b.aspect),O*d.h/(d.livreH*_))*1.04;b.position.copy(Ue).add(new X(0,v+s,.001)),E.target.copy(Ue),E.update()}function tn([d,_],v){let H=!1;for(let z=0,Q=v.length-1;z<v.length;Q=z++){let[ot,wt]=v[z],[Ct,Nt]=v[Q];wt>_!=Nt>_&&d<(Ct-ot)*(_-wt)/(Nt-wt)+ot&&(H=!H)}return H}function Ae(d,_,v){let H=1/0;for(let z=0;z<v.length;z++){let Q=v[z],ot=v[(z+1)%v.length],wt=ot[0]-Q[0],Ct=ot[1]-Q[1],Nt=_[0]*Ct-_[1]*wt;if(Math.abs(Nt)<1e-9)continue;let Xt=((Q[0]-d[0])*Ct-(Q[1]-d[1])*wt)/Nt,Rt=((Q[0]-d[0])*_[1]-(Q[1]-d[1])*_[0])/Nt;Xt>.05&&Rt>=0&&Rt<=1&&Xt<H&&(H=Xt)}return H}let an={quadro:5,rack:5,teclado:2,caixa:2,wallbox:3};function hi(d){let _=d.poligono,v=_.length,H=Me=>Math.hypot(_[(Me+1)%v][0]-_[Me][0],_[(Me+1)%v][1]-_[Me][1]),z=Math.max(..._.map((Me,sn)=>H(sn))),Q=(Qt.get(d.i)||[]).filter(([Me])=>Me.montagem==="parede"||Me.montagem==="canto"),ot=0,wt=-1;for(let Me=0;Me<v;Me++){let sn=H(Me);if(sn<.85*z)continue;let[ue,Ge]=[_[Me],_[(Me+1)%v]],Cn=0;for(let[ln,gn]of Q){let Fi=Ge[0]-ue[0],js=Ge[1]-ue[1],De=hn.clamp(((gn[0]-ue[0])*Fi+(gn[1]-ue[1])*js)/(sn*sn),0,1);Math.hypot(gn[0]-ue[0]-Fi*De,gn[1]-ue[1]-js*De)<.4&&(Cn+=an[ln.forma]||1)}let on=Cn*10+sn;on>wt&&(wt=on,ot=Me)}let Ct=H(ot),Nt=_[ot],Xt=_[(ot+1)%v],Rt=[(Nt[0]+Xt[0])/2,(Nt[1]+Xt[1])/2],ae=[(Xt[0]-Nt[0])/Ct,(Xt[1]-Nt[1])/Ct],ie=[-ae[1],ae[0]];tn([Rt[0]+ie[0]*.2,Rt[1]+ie[1]*.2],_)||(ie=[-ie[0],-ie[1]]);let oe=Ae(Rt,ie,_);if(Number.isFinite(oe)&&oe<2.6&&Ct>2.5*oe){let Me=[Rt[0]+ie[0]*oe/2,Rt[1]+ie[1]*oe/2],sn=[Me[0]-ae[0]*(Ct/2-.6),Me[1]-ae[1]*(Ct/2-.6)];if(tn(sn,_))return{olho:sn,alvo:[Me[0]+ae[0]*Ct/2,Me[1]+ae[1]*Ct/2],altura:1.5}}let _e=Math.min(oe-.35,Math.max(3,Ct*.9));(!Number.isFinite(_e)||_e<.6)&&(_e=Number.isFinite(oe)?oe/2:1.5);let pe=[Rt[0]+ie[0]*_e,Rt[1]+ie[1]*_e];return tn(pe,_)||(pe=d.centro),{olho:pe,alvo:Rt}}function Yn(){b.rotation.order="YXZ",b.rotation.set(F,w,0),p()}function Li(d){let _=Ot.copy(d).sub(b.position).normalize();w=Math.atan2(-_.x,-_.z),F=Math.asin(hn.clamp(_.y,-1,1)),Yn()}function Be(d){return Y?U.clone():Se==="geral"?E.target.clone():b.position.clone().add(b.getWorldDirection(new X).multiplyScalar(d))}let en=d=>d<.5?4*d*d*d:1-Math.pow(-2*d+2,3)/2;function fi(d,_,v,H,z,Q){Y={t0:performance.now(),dur:z,p0:b.position.clone(),p1:_.clone(),a0:d,a1:v.clone(),f0:b.fov,f1:H,fim:Q},p(!0),z||We(performance.now())}function We(d){if(!Y)return;p(!0);let _=Y.dur?Math.min(1,(d-Y.t0)/Y.dur):1,v=en(_);if(b.position.lerpVectors(Y.p0,Y.p1,v),U.lerpVectors(Y.a0,Y.a1,v),b.rotation.order="XYZ",b.lookAt(U),be(Y.f0+(Y.f1-Y.f0)*v),_>=1){let H=Y.fim;Y=null,H&&H()}}let Sn=null;function ii(d){Sn&&(Sn.geometry.dispose(),Sn.material.dispose(),D("forro").remove(Sn),Sn=null),!(!d||d.poligono.length<3)&&(Sn=new ze(new Kr(new ls(d.poligono.map(([_,v])=>new Pt(_,v)))),new Jn({color:"#cfccc4",side:dn})),Sn.rotation.x=-Math.PI/2,Sn.position.y=s+.002,D("forro").add(Sn),p())}let Xs=t("#dentro");function gr(d){Xs&&(t("#dentro-nome").textContent=d?d.nome:"",Xs.classList.toggle("aberto",!!d),document.body.classList.contains("modo-dentro")!==!!d&&(document.body.classList.toggle("modo-dentro",!!d),yo()),Yc(),Qe(),vh(),At?.legenda(),p(!0))}function mo(d,_={}){let v=typeof d=="number"?n.ambientes[d]:n.ambientes.find(Nt=>Nt.nome===d);if(!v||v.poligono.length<3)return!1;let{olho:H,alvo:z,altura:Q}=hi(v),ot=A(H[0],H[1],a),wt=A(z[0],z[1],Q||1.1),Ct=Be(b.position.distanceTo(wt));return Se==="geral"&&(R={pos:b.position.clone(),alvo:E.target.clone(),fov:b.fov}),Se="dentro",Je=v.i??n.ambientes.indexOf(v),E.enabled=!1,E.autoRotate=!1,ii(v),gr(v),fi(Ct,ot,wt,_.fov||70,_.instantaneo?0:1100,()=>Li(wt)),!0}function lh(){Se!=="geral"&&(Y=null,Se="geral",Je=-1,ii(null),gr(null),b.rotation.order="XYZ",E.enabled=!0,E.autoRotate=Ne.giro,p(!0))}function Xc(d={}){if(Se==="geral")return;let _=R;if(!_){je();return}let v=Be(b.position.distanceTo(_.alvo));Se="saindo",ii(null),gr(null),fi(v,_.pos,_.alvo,_.fov,d.instantaneo?0:900,()=>{Se="geral",Je=-1,b.rotation.order="XYZ",E.target.copy(_.alvo),E.enabled=!0,E.autoRotate=Ne.giro,E.update()})}function Em(d,_,v){let H=new X(d,a,_),z=b.getWorldDirection(new X),Q=H.clone().add(z.multiplyScalar(3));v&&v.i!==Je&&(Je=v.i,ii(v),gr(v)),fi(Be(3),H,Q,b.fov,700,()=>Li(Q))}function ch(d,_){let v=null;for(let H of n.ambientes)H.poligono.length>=3&&tn([d,_],H.poligono)&&(!v||H.area_m2<v.area_m2)&&(v=H);return v}let Tm=["sólidas","translúcidas","ocultas"];function uh(){let d=Ne.paredes;D("paredes").visible=d!==2,D("pilares").visible=d!==2;for(let _ of[Gt,Jt])_.transparent=d===1,_.opacity=d===1?_===Gt?.42:.6:1,_.depthWrite=d!==1,_.needsUpdate=!0;t("#b-paredes").textContent=`Paredes: ${Tm[d]}`,t("#b-paredes").classList.toggle("ativo",d!==2),p()}function Ni(d,_,v){let H=t(d);H&&(H.classList.toggle("ativo",!!Ne[_]),H.addEventListener("click",()=>{Ne[_]=!Ne[_],H.classList.toggle("ativo",Ne[_]),v(),p(!0)}))}function Yc(){M.uMin.value=(Ne.grandes?26:14)+(Se==="dentro"?6:0),M.uBase.value=Ne.grandes?1.5:1,M.uMinInfra.value=Ne.grandes?6:3,p(!0)}t("#b-paredes").addEventListener("click",()=>{Ne.paredes=(Ne.paredes+1)%3,uh()}),Ni("#b-corte","corte",()=>{}),Ni("#b-ambientes","ambientes",()=>{D("ambientes").visible=Ne.ambientes}),Ni("#b-etiquetas","etiquetas",()=>{}),Ni("#b-portas","portas",()=>{D("portas").visible=Ne.portas}),Ni("#b-planta","planta",()=>{D("planta").visible=Ne.planta}),n.planta||t("#b-planta")?.remove(),Ni("#b-campo","campo",()=>{D("campo").visible=Ne.campo}),Ni("#b-giro","giro",()=>{E.autoRotate=Ne.giro&&Se==="geral"}),Ni("#b-grandes","grandes",Yc),Ni("#b-infra","infra",()=>{Bn.visible=Ne.infra}),r.length||t("#b-infra")?.remove(),Ni("#b-sugerido","sugerido",Ln),r.some(d=>d.sugerido)||t("#b-sugerido")?.remove(),D("campo").visible=Ne.campo,t("#b-cima").addEventListener("click",jt),t("#b-3d").addEventListener("click",je),t("#b-voltar")?.addEventListener("click",()=>Xc()),t("#b-tela")?.addEventListener("click",()=>{let d=document.documentElement;document.fullscreenElement?document.exitFullscreen?.():d.requestFullscreen?.()});let ms=t("#ir-ambiente");if(ms){let d=n.ambientes.filter(_=>_.poligono.length>=3).sort((_,v)=>_.nome.localeCompare(v.nome,"pt-BR",{numeric:!0})||_.area_m2-v.area_m2);d.length||ms.remove();for(let _ of d){let v=document.createElement("option");v.value=String(_.i),v.textContent=`${_.nome} (${e(_.area_m2,1)} m²)`,ms.appendChild(v)}ms.addEventListener("change",()=>{ms.value!==""&&mo(Number(ms.value)),ms.value="",ms.blur()})}let wm=t("#disciplinas");for(let[d,_]of Object.entries(n.disciplinas)){let v=n.dispositivos.filter(Q=>Q.disciplina===d).reduce((Q,ot)=>Q+ot.itens.length,0),H=r.filter(Q=>Q.disciplina===d).reduce((Q,ot)=>Q+ot.comprimento_m,0),z=document.createElement("button");z.className="ativo disc",z.style.setProperty("--cor",_.cor),z.innerHTML=`<i></i>${i(_.rotulo)} <small>${v||!H?v:`${e(H,0)} m`}</small>`,z.addEventListener("click",()=>{let Q=D(`disc:${d}`);Q.visible=!Q.visible,V[`infra:${d}`]&&(V[`infra:${d}`].visible=Q.visible),z.classList.toggle("ativo",Q.visible),p(!0)}),wm.appendChild(z)}n.dispositivos.some(d=>d.itens.some(_=>Array.isArray(_[7])))||t("#b-campo")?.remove();let An=n.numeros,Ui=(d,_,v)=>`<div class="num"><div><span>${_}</span> ${d}</div><small>${v}</small></div>`;t("#numeros").innerHTML=[Ui(e(An.area_interna_m2),"m²",`área interna, ${An.ambientes} ambiente${An.ambientes===1?"":"s"}`),An.area_externa_m2?Ui(e(An.area_externa_m2),"m²",`área externa (${An.ambientes_externos})`):"",Ui(`${e(An.dimensoes_m[0],1)} × ${e(An.dimensoes_m[1],1)}`,"m","dimensões gerais"),Ui(e(An.pe_direito_m),"m","pé-direito adotado"),Ui(An.paredes_m.toLocaleString("pt-BR"),"m",`de paredes (≈ ${An.paredes_area_m2.toLocaleString("pt-BR")} m² de face)`),Ui(An.portas,"un","portas"),An.janelas?Ui(An.janelas,"un","janelas / esquadrias"):"",An.pilares?Ui(An.pilares,"un","pilares"):"",...An.dispositivos.map(d=>Ui(typeof d.quantidade=="number"&&!Number.isInteger(d.quantidade)?e(d.quantidade):d.quantidade,i(d.unidade||"un"),i(d.rotulo))),...r.map(d=>Ui(e(d.comprimento_m,1),"m",`${i(qs(d))} · ${i(n.disciplinas[d.disciplina]?.rotulo||d.disciplina)}${d.sugerido?" (sugerido)":d.estimado?" (estimado)":""}`))].join(""),t("#lista-ambientes").innerHTML=`<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...An.por_ambiente].sort((d,_)=>d.nome.localeCompare(_.nome,"pt-BR",{numeric:!0})).map(d=>`<tr><td><i style="background:${(n.tiposAmbiente[d.tipo]||n.tiposAmbiente.outros).cor}"></i>${i(d.nome)}</td><td>${e(d.area_m2)}</td><td>${e(d.perimetro_m,1)}</td></tr>`).join("")}</tbody></table>`;let jc=t("#legenda");jc.innerHTML=n.dispositivos.map((d,_)=>`<button class="leg ativo" data-i="${_}" title="Mostrar/ocultar"><i class="f-${i(d.forma)}" style="--cor:${i(d.cor)}"></i><span>${i(d.rotulo)}<small>${i(n.disciplinas[d.disciplina]?.rotulo||"")} · ${i(d.altura)}</small></span><b>${d.itens.length}</b></button>`).join("")+r.map((d,_)=>`<button class="leg ativo" data-infra="${_}" title="Mostrar/ocultar"><i class="f-infra f-${i(d.forma)}" style="--cor:${i(d.cor)}"></i><span>${i(qs(d))}<small>${i(n.disciplinas[d.disciplina]?.rotulo||d.disciplina)} · h = ${e(d.z)} m · ${i(Di(d))}${d.layers?.length?` · ${i(d.layers.slice(0,2).join(", "))}`:""}</small></span><b>${e(d.comprimento_m,1)} m</b></button>`).join("")+`<div class="tipos">${[...new Set(n.ambientes.map(d=>d.tipo))].map(d=>`<span><i style="background:${n.tiposAmbiente[d].cor}"></i>${i(n.tiposAmbiente[d].rotulo)}</span>`).join("")}</div>`,jc.querySelectorAll(".leg").forEach(d=>d.addEventListener("click",()=>{let _=d.dataset.infra!=null?r[Number(d.dataset.infra)].objeto:n.dispositivos[Number(d.dataset.i)].malha;_&&(_.visible=!_.visible,d.classList.toggle("ativo",_.visible),p(!0))}));let go=null;if(rn.length&&r.length){let d=document.createElement("section");d.innerHTML='<h2>Infraestrutura — cores por tipo</h2><div id="legenda-infra"></div>',jc.closest("section")?.after(d),d.querySelector("h2").addEventListener("click",()=>d.classList.toggle("fechada")),window.innerWidth<=900&&d.classList.add("fechada"),go=d.querySelector("#legenda-infra");let _=v=>v.cor_fonte==="padrao"?"cor padrão do sistema":`cor do projeto (${v.cor_fonte==="legenda"?"legenda":v.cor_fonte==="entidade"?"traçado no DXF":"layer no DXF"})`;go.innerHTML=rn.map(v=>`<div class="leg-infra ativo" data-tipo="${i(v.tipo)}"><button class="leg ativo" data-tipo-vis="${i(v.tipo)}" title="Mostrar/ocultar este tipo"><i class="f-infra" style="--cor:${i(v.cor)}"></i><span>${i(v.rotulo)}<small>${i([(v.medidas||[]).slice(0,3).join(", "),(v.materiais||[]).slice(0,2).join(", ")].filter(Boolean).join(" · ")||"medida não informada")} · ${i(_(v))}${(v.outras_cores||[]).length?` · +${v.outras_cores.length} cor(es) do projeto`:""}</small></span><b>${e(v.comprimento_m,1)} m</b></button><button class="dest" data-tipo-dest="${i(v.tipo)}" title="Destacar este tipo">◎</button></div>`).join(""),go.addEventListener("click",v=>{let H=v.target.closest("[data-tipo-vis]"),z=v.target.closest("[data-tipo-dest]");if(H){let Q=H.dataset.tipoVis;ni[Q]=ni[Q]===!1,H.classList.toggle("ativo",ni[Q]!==!1),Ln()}if(z){let Q=z.dataset.tipoDest;Xn=Xn===Q?null:Q,go.querySelectorAll(".dest").forEach(ot=>ot.classList.toggle("ativo",ot.dataset.tipoDest===Xn)),Ln()}})}function _r(d,_){let v=l.getBoundingClientRect(),H=d-v.left,z=_-v.top,Q=v.width,ot=v.height,wt=null;for(let Ct of n.dispositivos){let Nt=Ct.malha;if(!(!Nt||!Nt.visible||!Nt.parent.visible))for(let Xt of Ct.itens){if(Xt.fora)continue;Ot.set(Xt[0],Xt[2],-Xt[1]);let Rt=b.position.distanceTo(Ot);if(Se==="dentro"&&Xt[5]!==Je&&Rt>4||(Ot.project(b),Ot.z>1||Ot.z<-1))continue;let ae=(Ot.x+1)/2*Q,ie=(1-Ot.y)/2*ot,oe=Math.max(10,Ct.tamMax*_t(Ct.tamMax,Rt)/(Rt*M.uPx.value)/2),_e=Math.hypot(ae-H,ie-z);_e<=oe&&(!wt||_e<wt.dd-2||Math.abs(_e-wt.dd)<=2&&Rt<wt.d)&&(wt={t:Ct,it:Xt,d:Rt,dd:_e})}}return wt}let ha=new X;function Cm(d,_){let v=l.getBoundingClientRect(),H=d-v.left,z=_-v.top,Q=v.width,ot=v.height,wt=(Xt,Rt,ae)=>(ha.set(Xt,Rt,ae).project(b),ha.z>1||ha.z<-1?null:[(ha.x+1)/2*Q,(1-ha.y)/2*ot]),Ct=(Xt,Rt)=>{let ae=Rt[0]-Xt[0],ie=Rt[1]-Xt[1],oe=ae*ae+ie*ie,_e=oe?Math.max(0,Math.min(1,((H-Xt[0])*ae+(z-Xt[1])*ie)/oe)):0;return Math.hypot(H-Xt[0]-ae*_e,z-Xt[1]-ie*_e)},Nt=null;for(let Xt of r){if(!Xt.objeto||!Xt.objeto.visible||!Xt.objeto.parent.visible||!Bn.visible)continue;let Rt=Xt.segmentos||[],ae=Xt.descidas||[],ie=(oe,_e)=>{if(!oe||!_e)return;let pe=Ct(oe,_e);pe<=8&&(!Nt||pe<Nt.d)&&(Nt={g:Xt,d:pe})};for(let oe=0;oe+3<Rt.length;oe+=4)ie(wt(Rt[oe],Xt.z,-Rt[oe+1]),wt(Rt[oe+2],Xt.z,-Rt[oe+3]));for(let oe=0;oe+3<ae.length;oe+=4)ie(wt(ae[oe],ae[oe+2],-ae[oe+1]),wt(ae[oe],ae[oe+3],-ae[oe+1]))}return Nt&&Nt.g}let pi=t("#dica");function Zc(d,_){let v=_r(d,_),H=l.getBoundingClientRect(),z=v?null:Cm(d,_);if(!v&&!z)return pi.style.display="none",l.style.cursor="",!1;if(z){let Q=rn.find(ot=>ot.tipo===qn(z));pi.innerHTML=`<b>${i(qs(z))}</b><br>${Q?`<i class="cor-infra" style="--cor:${i(z.cor)}"></i>${i(Q.rotulo)} · `:""}${i(n.disciplinas[z.disciplina]?.rotulo||z.disciplina)} · h = ${e(z.z)} m · ${e(z.comprimento_m,1)} m${z.descidas_m?` (${e(z.descidas_m,1)} m de descidas)`:""}${z.componentes&&z.componentes.curvas+z.componentes.caixas+z.componentes.conduletes?`<br>${z.componentes.curvas} curva(s), ${z.componentes.caixas} caixa(s) de passagem, ${z.componentes.conduletes} condulete(s) — ilustrativos`:""}<br><small>${i(Di(z))}${z.layers?.length?` · layer ${i(z.layers.slice(0,2).join(", "))}`:""}${z.cor_fonte&&z.cor_fonte!=="padrao"?" · cor do projeto":""}</small>`}else{let{t:Q,it:ot}=v,wt=n.ambientes[ot[5]],Ct=ot[8]?`<br>circuito ${i(ot[8])}${ot[9]?` · comando ${i(ot[9])}`:""}`:"",Nt=Bt?Mt.get(ot):null,Xt=Nt&&Nt.kind!=="quadro"?Bt.estadoPonto(Nt.id):null,Rt=Nt&&Bt.ponto(Nt.id)?.comando,ae=Nt?Nt.kind==="quadro"?"clique para abrir o quadro":Nt.kind==="comando"?"clique para acionar":Nt.kind==="luz"&&Rt?"clique para acionar o comando":"clique para ver o circuito":"",ie=Nt?`<br>${Xt?`<b class="${Xt.energizado?"sim-on":"sim-off"}">${i(Xt.texto)}</b><br>`:""}<small>${ae}</small>`:"",oe=!Nt&&xo(Q),_e=oe?`${oe.item!=null&&oe.item!==""?`<br>item ${i(oe.item)} da relação`:""}${oe.posicaoAConferir?'<br><b class="sim-off">posição a conferir</b>':""}<br><small>clique para ver a ficha${Ce&&Fn.get(ot)?" e as manobras":""}</small>`:"",pe=Ce?Fn.get(ot):null,Me=pe?.length&&!oe?`<br><b class="${["apagado","aberto","falha","alarme"].includes(Ce.aparencia(Ii(ot,pe)))?"sim-off":"sim-on"}">${i(Ce.textoEstado(Ii(ot,pe)))}</b><br><small>clique para operar</small>`:pe?.length?`<br><b>${i(Ce.textoEstado(Ii(ot,pe)))}</b>`:"";pi.innerHTML=`<b>${i(Q.rotulo)}</b>${ot[6]&&!oe?` · ${i(ot[6])}`:""}<br>${wt?`${i(wt.nome)} · `:""}${i(Vt(Q,ot))}${Ct}${ie}${Me}${_e}<br><small>${i(n.disciplinas[Q.disciplina]?.rotulo||"")}</small>`}return pi.style.display="block",pi.style.left=`${Math.max(8,Math.min(d-H.left+14,H.width-290))}px`,pi.style.top=`${_-H.top+14}px`,l.style.cursor="pointer",!0}let dh=Am({CENA:n,tela:l,camera:b,cena:u,pisos:Z,escolherDispositivo:_r,pedirDesenho:p,esc:i}),_o=null;l.addEventListener("pointermove",d=>{d.pointerType!=="mouse"||d.buttons||(_o||requestAnimationFrame(()=>{let _=_o;_o=null,_&&Zc(_.clientX,_.clientY)}),_o=d)}),l.addEventListener("pointerleave",d=>{d.pointerType==="mouse"&&(pi.style.display="none")});let hh=new cs,fh=new Pt;function Jc(d,_){if(Y||Bt&&_h(d,_))return!1;let v=l.getBoundingClientRect(),H=d-v.left,z=_-v.top;if(Se==="geral"){for(let Ct of gt)if(Ct.ret&&H>=Ct.ret[0]&&H<=Ct.ret[2]&&z>=Ct.ret[1]&&z<=Ct.ret[3])return mo(Ct.a.i)}fh.set(H/v.width*2-1,-(z/v.height)*2+1),hh.setFromCamera(fh,b);let Q=Se==="dentro"&&xt&&D("paredes").visible?[...Z,xt]:Z,ot=hh.intersectObjects(Q,!1)[0];if(!ot||ot.object===xt)return!1;let wt=ot.object.userData.ambientes[ot.faceIndex];return wt?Se==="dentro"?(Em(ot.point.x,ot.point.z,wt),!0):mo(wt.i):!1}let mi=new Map,ph="mouse",xr=null,Kc=null,vr=null,mh=0;l.addEventListener("dblclick",d=>{ph!=="touch"&&Jc(d.clientX,d.clientY)}),l.addEventListener("pointerdown",d=>{if(ph=d.pointerType,mi.set(d.pointerId,{x:d.clientX,y:d.clientY}),Kc=mi.size===1?{x:d.clientX,y:d.clientY,t:d.timeStamp}:null,Se==="dentro"&&(l.setPointerCapture?.(d.pointerId),mi.size===2)){let[_,v]=[...mi.values()];xr={d:Math.hypot(_.x-v.x,_.y-v.y),fov:b.fov}}}),l.addEventListener("pointermove",d=>{let _=mi.get(d.pointerId);if(!_)return;let v=d.clientX-_.x,H=d.clientY-_.y;if(_.x=d.clientX,_.y=d.clientY,!(Se!=="dentro"||Y)){if(mi.size===1){let z=hn.degToRad(b.fov)/Math.max(l.clientHeight,1);w+=v*z,F=hn.clamp(F+H*z,-1.45,1.45),Yn()}else if(mi.size===2&&xr){let[z,Q]=[...mi.values()];be(hn.clamp(xr.fov*xr.d/Math.max(Math.hypot(z.x-Q.x,z.y-Q.y),1),15,90))}}}),l.addEventListener("pointerup",d=>{let _=Kc;if(mi.delete(d.pointerId),mi.size<2&&(xr=null),!_||mi.size||!(d.timeStamp-_.t<350&&Math.hypot(d.clientX-_.x,d.clientY-_.y)<10))return;if(dh.ativo()){dh.clique(d.clientX,d.clientY);return}if(d.pointerType!=="touch"){!(Bt&&tu(d.clientX,d.clientY))&&!gh(d.clientX,d.clientY)&&iu(d.clientX,d.clientY);return}let H=d.timeStamp;if(vr&&H-vr.t<450&&Math.hypot(d.clientX-vr.x,d.clientY-vr.y)<30){vr=null,Jc(d.clientX,d.clientY);return}vr={x:d.clientX,y:d.clientY,t:H},!(Bt&&tu(d.clientX,d.clientY))&&(gh(d.clientX,d.clientY)||iu(d.clientX,d.clientY)||Zc(d.clientX,d.clientY)&&(clearTimeout(mh),mh=setTimeout(()=>{pi.style.display="none"},3e3)))}),l.addEventListener("pointercancel",d=>{mi.delete(d.pointerId),xr=null,Kc=null}),l.addEventListener("wheel",d=>{Se==="dentro"&&(d.preventDefault(),be(hn.clamp(b.fov*Math.exp(d.deltaY*.0012),15,90)))},{passive:!1});let gi=new Set;window.addEventListener("keydown",d=>{if(!(d.target&&/INPUT|SELECT|TEXTAREA/.test(d.target.tagName))){if(yr){d.key==="Escape"&&su();return}if(d.key==="Escape"&&_s?.classList.contains("aberta")){eu();return}if(d.key==="Escape"&&Se==="dentro"){Xc();return}Se==="dentro"&&/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(d.key)&&(gi.add(d.key.toLowerCase()),d.preventDefault())}}),window.addEventListener("keyup",d=>gi.delete(d.key.toLowerCase())),window.addEventListener("blur",()=>gi.clear());function Rm(d){if(Se!=="dentro"||Y||!gi.size)return;let _=(gi.has("arrowup")||gi.has("w")?1:0)-(gi.has("arrowdown")||gi.has("s")?1:0),v=(gi.has("d")?1:0)-(gi.has("a")?1:0),H=(gi.has("arrowleft")?1:0)-(gi.has("arrowright")?1:0);if(H&&(w+=H*1.6*d,Yn()),!_&&!v)return;let z=1.8*d;b.position.x+=(-Math.sin(w)*_+Math.cos(w)*v)*z,b.position.z+=(-Math.cos(w)*_-Math.sin(w)*v)*z,p(!0);let Q=ch(b.position.x,-b.position.z);Q&&Q.i!==Je&&(Je=Q.i,ii(Q),gr(Q))}let gs=Bt||Ce?Hc():null,Qc={"HM-CAB-RACK":"rack","HM-INC-CENTRAL":"central_incendio"};function gh(d,_){let v=_r(d,_);if(!v)return!1;let H=Ce?Fn.get(v.it)||[]:[],z=Qc[v.t.simbolo]||null;return!H.length&&!z?!1:(pi.style.display="none",Ys({t:v.t,it:v.it,componente:xo(v.t),rede:H,painel:z}),!0)}function _h(d,_){let v=_r(d,_);return v&&Mt.get(v.it)||null}function tu(d,_){let v=_h(d,_);if(!v)return!1;if(pi.style.display="none",v.kind==="quadro")return vo(v.quadro),!0;let H=null;return(v.kind==="comando"||v.kind==="luz"&&Bt.ponto(v.id)?.comando)&&(H=Bt.acionar(v.id)),H&&gs(H),Ys(v),!0}let _s=null,Oi=null,Pe=null;function Ys(d){if(!_s){_s=document.createElement("div"),_s.id="ficha";let _=document.createElement("button");_.className="fechar",_.title="Fechar",_.textContent="×",_.addEventListener("click",eu),Oi=document.createElement("div"),_s.append(_,Oi),document.body.appendChild(_s),Bt&&da(Oi,Bt,{abrirQuadro:vo,aviso:gs}),Ce&&po(Oi,Ce,{aviso:gs}),Oi.addEventListener("click",v=>{v.target.closest("[data-painel]")&&Pe?.it&&(v.stopPropagation(),yh(Pe.t,Pe.it))})}Pe=d,_s.classList.add("aberta"),nu()}function eu(){Pe=null,_s?.classList.remove("aberta")}function nu(){if(!Pe||!Oi)return;if(Pe.lista){Oi.innerHTML=`<div class="sim-tit grande">Manobras e sistemas</div><small>Ligações não escritas no projeto são inferidas (marcadas [CONFERIR]); os textos de manobra são didáticos.</small>${pr(Ce,Pe.lista)}`;return}let d=n.ambientes[Pe.it[5]];if(Pe.rede?.length||Pe.painel){let _=Pe.componente?nh(Pe.componente,{rotulo:Pe.t.rotulo,ambiente:d?d.nome:"",altura:Vt(Pe.t,Pe.it),objeto:Pe.it[6]}):`<div class="sim-tit grande">${i(Pe.t.rotulo)}${Pe.it[6]?` · ${i(Pe.it[6])}`:""}</div><div class="sim-est">${d?i(d.nome):""}</div>`;Oi.innerHTML=`${_}${Pe.rede?.length?pr(Ce,Pe.rede):""}${Pe.painel?`<div class="sim-bs"><button class="sim-b liga" data-painel="1">Abrir a vista interna (${Pe.painel==="rack"?"rack":"central"})</button></div>`:""}`;return}if(Pe.componente){Oi.innerHTML=nh(Pe.componente,{rotulo:Pe.t.rotulo,ambiente:d?d.nome:"",altura:Vt(Pe.t,Pe.it),objeto:Pe.it[6]});return}Bt&&(Oi.innerHTML=rm(Bt,Pe.id,{rotulo:Pe.t.rotulo,ambiente:d?d.nome:""}))}let xh=new Map((Array.isArray(n.componentes)?n.componentes:[]).map(d=>[String(d.id),d]));function xo(d){return d&&d.componente!=null&&xh.get(String(d.componente))||null}function iu(d,_){if(!xh.size)return!1;let v=_r(d,_),H=v&&xo(v.t);return H?(pi.style.display="none",Ys({t:v.t,it:v.it,componente:H}),!0):!1}if(Bt){let d=t("#b-tela"),_=t("#barra"),v=(H,z,Q)=>{let ot=document.createElement("button");return ot.textContent=H,ot.title=z,ot.addEventListener("click",Q),_.insertBefore(ot,d||null),ot};for(let H of Bt.quadros().slice(0,4))v(`Quadro ${H.tag}`,`Abrir o quadro ${H.tag}: porta, disjuntores com alavanca (desligar um disjuntor apaga o circuito no prédio)`,()=>vo(H.tag));if(v("Religar tudo","Simulação: volta tudo ao estado inicial (disjuntores ligados, luzes acesas)",()=>{Bt.reiniciar(),Ce?.reiniciar(),gs("Simulação reiniciada: tudo ligado")}),At=Mm({CENA:n,INST:le,sim:Bt,interativos:Dt,pai:D("mapa-lux"),altura:ft+.004,esc:i,celular:Fe<=8,pedirDesenho:p,ambienteAtual:()=>Se==="dentro"?Je:-1}),At){let H=v("Mapa de iluminância","Cores no piso com a iluminância calculada ponto a ponto (lux), com o estado atual das luzes: cenas, dimerização e disjuntores",()=>{let z=At.alternar();H.classList.toggle("ativo",z),gs(z?"Mapa de iluminância: só luz direta (sem interreflexão)":"Mapa de iluminância desligado")})}Bt.assinar(te)}if(Ce){let d=t("#barra"),_=t("#b-tela"),v=Ce.lista().filter(H=>(H.interacao.acoes||[]).length||H.interacao.proxy).map(H=>H.id);if(v.length){let H=document.createElement("button");if(H.textContent=Ce.lista().some(z=>z.tipo==="chave_seccionadora"||z.tipo==="disjuntor_mt")?"Manobras da subestação":"Sistemas (operar)",H.title="Operar os equipamentos: chaves, disjuntores, acionadores, armar/desarmar, switch PoE, fechaduras",H.addEventListener("click",()=>Ys({lista:v})),d.insertBefore(H,_||null),!Bt){let z=document.createElement("button");z.textContent="Restabelecer",z.title="Volta todos os equipamentos ao estado inicial",z.addEventListener("click",()=>{Ce.reiniciar(),gs("Equipamentos no estado inicial")}),d.insertBefore(z,_||null)}}}function vh(){if(!Bt||!Xs)return;let d=document.getElementById("dentro-cenas");if(d||(d=document.createElement("div"),d.id="dentro-cenas",Xs.insertBefore(d,document.getElementById("b-voltar")),da(d,Bt,{aviso:v=>gs?.(v)})),Se!=="dentro"||Je<0){d.innerHTML="";return}let _=[...new Set(Dt.filter(v=>v.kind==="luz"&&v.it[5]===Je).map(v=>Bt.ponto(v.id)?.comando).filter(Boolean))];d.innerHTML=_.map(v=>zc(Bt,v,{titulo:_.length>1})).filter(Boolean).join("<i></i>")}let yr=!1,mn=null;function vo(d){let _=Bt&&Bt.quadro(d);if(!_)return;let v=_.cena3d?{..._.cena3d}:om(_,Bt);delete v.instalacao,bh(`q:${d}`,v,`${_.tag}${_.descricao?` — ${_.descricao}`:""}${_.cena3d?"":" (arranjo esquemático, dados do projeto)"}`,{sim:Bt,quadroTag:d,titulo:"Disjuntores — clique para ligar/desligar"})}function yh(d,_){let v=Qc[d.simbolo];if(!v)return;let H=Ce?Fn.get(_)||[]:[],z=Ct=>n.dispositivos.filter(Nt=>Ct.test(Nt.simbolo||"")).reduce((Nt,Xt)=>Nt+Xt.itens.length,0),Q=_[6]?String(_[6]):v==="rack"?"RACK":"CENTRAL",ot=(Array.isArray(n.paineis)?n.paineis:[]).find(Ct=>Ct&&Ct.tipo===v&&(Ct.ponto==null||String(Ct.ponto)===String(_[6]||"")))||null,wt;v==="rack"?wt=(0,Ws.cenaDoRack)((0,Ws.dadosDoRack)({tag:Q,equipamentoSwitch:H[0]||null,cabeamento:ot?.cabeamento||null,cftv:ot?.cftv||null,portasPainel:ot?.portasPainel,portasSwitch:ot?.portasSwitch,contagem:{pontosRede:z(/^HM-CAB-PONTO-REDE$/),aps:z(/^HM-CAB-AP$/),cameras:z(/^HM-CFTV-CAMERA$/)}})):wt=(0,Ws.cenaDaCentral)((0,Ws.dadosDaCentral)({tag:Q,equipamentoCentral:H[0]||null,calculo:ot?.incendio||null,contagem:{detectores:z(/^HM-INC-DETECTOR/),acionadores:z(/^HM-INC-ACIONADOR$/),avisadores:z(/^HM-INC-AVISADOR$/)}})),bh(`p:${v}:${Q}`,wt,wt.titulo,{sim:null,titulo:v==="rack"?"Equipamentos — clique para operar":"Central — clique para operar"})}function bh(d,_,v,{sim:H=null,quadroTag:z=null,titulo:Q=""}={}){if(!mn){let ot=document.createElement("div");ot.id="q-sim",ot.innerHTML=`<canvas id="tela"></canvas><div id="etiquetas"></div>
<nav id="barra"><button id="b-voltar-predio" title="Voltar ao prédio (Esc)">← Voltar ao prédio</button><span class="q-nome"></span>
<button id="b-3d">Vista 3D</button><button id="b-frente">Vista frontal</button><button id="b-porta" title="Abrir ou fechar a porta">Porta aberta</button><button id="b-etiquetas">Etiquetas</button></nav>
<aside><section><h2 class="q-tit-sim">Disjuntores — clique para ligar/desligar</h2><div id="simulacao"></div></section><section><h2>Camadas</h2><div id="camadas"></div></section><section><h2>Dispositivo</h2><div id="info"></div></section></aside>`,document.body.appendChild(ot),ot.querySelectorAll("aside h2").forEach(wt=>{wt.onclick=()=>wt.parentNode.classList.toggle("fechada")}),mn={el:ot,ctrl:null,tag:null}}if(yr=!0,mn.el.classList.add("aberto"),eu(),pi.style.display="none",mn.tag!==d){if(mn.ctrl){mn.ctrl.destruir();let ot=document.createElement("canvas");ot.id="tela",mn.el.querySelector("#tela").replaceWith(ot),mn.el.querySelector("#etiquetas").innerHTML=""}mn.el.querySelector("#camadas").innerHTML="",mn.el.querySelector(".q-nome").textContent=v,mn.el.querySelector(".q-tit-sim").textContent=Q,mn.ctrl=ih(_,{raiz:mn.el,sim:H,quadroTag:z,rede:Ce,embutido:!0,portaFechada:!0,aoVoltar:su,aviso:gs}),mn.tag=d}else mn.ctrl.ativar(!0),mn.ctrl.abrirAnimado()}function su(){yr&&(yr=!1,mn.el.classList.remove("aberto"),mn.ctrl?.ativar(!1),p(!0))}function Pm(){let d=0,_=Y?U:E.target;if(Ne.corte&&Se!=="dentro"&&Ne.paredes!==2){let z=b.position.x-_.x,Q=b.position.z-_.z,ot=Math.hypot(z,Q),wt=Math.abs(b.position.y-_.y);ot>.35*wt&&ot>.5&&(d=1,et.uDir.value.set(z/ot,Q/ot),et.uAlvo.value.copy(_))}et.uCorte.value=d;let v=Se!=="dentro"&&b.position.y>s+.3;for(let z of $t)z.opacity=v?.45:1,z.depthWrite=!v;for(let z of tt)z.visible=d===1&&Ne.paredes===0;let H=et.uDir.value;for(let z of at){let Q=d===1&&(z.cx-_.x)*H.x+(z.cz-_.z)*H.y>et.uMargem.value;z.m.scale.z=Q?o/s:1}}function Im(){let d=Se==="dentro"||Y?.05:hn.clamp(b.position.distanceTo(E.target)*.01,.05,1);Math.abs(b.near-d)>b.near*.25&&(b.near=d,b.updateProjectionMatrix())}function yo(){let d=ce();lt=d,c.setSize(d.w,d.h,!1),b.aspect=d.w/Math.max(d.h,1),b.setViewOffset(d.w,d.h,d.lateral/2,-(d.topo-44)/2,d.w,d.h),b.updateProjectionMatrix(),p(!0)}window.addEventListener("resize",yo),window.addEventListener("load",yo),yo(),uh(),Yc(),je(),te();let Mh=performance.now(),br=new Float64Array(33).fill(NaN);function Dm(){let d=b.matrixWorld.elements,_=b.projectionMatrix.elements,v=l.clientWidth*1e5+l.clientHeight,H=br[32]!==v;br[32]=v;for(let z=0;z<16;z++)br[z]!==d[z]&&(H=!0,br[z]=d[z]),br[16+z]!==_[z]&&(H=!0,br[16+z]=_[z]);return H}function Sh(d=performance.now()){let _=Math.min(.1,Math.max(0,(d-Mh)/1e3));Mh=d,!yr&&(We(d),Rm(_),Se==="geral"&&!Y&&E.update()&&(f=!0),f&&(f=!1,Im(),M.uPx.value=2*Math.tan(hn.degToRad(b.fov/2))/Math.max(l.clientHeight,1),Pm(),c.render(u,b),(Dm()||h)&&(h=!1,Lt(),ve())))}window.HM3D={vista3d:je,vistaDeCima:jt,entrarAmbiente:mo,voltarVistaGeral:Xc,grupos:V,estado:Ne,renderer:c,camera:b,controles:E,cena:u,olhar:(d,_=0)=>{Se==="dentro"&&(w=hn.degToRad(d),F=hn.degToRad(_),Yn())},girarCabeca:(d,_)=>{Se==="dentro"&&(w+=hn.degToRad(d),_!=null&&(F=hn.degToRad(_)),Yn())},lente:d=>be(hn.clamp(d,15,90)),olharPara:(d,_,v)=>{Se==="dentro"&&Li(A(d,_,v))},irPara:(d,_)=>{if(Se==="dentro"){b.position.set(d,a,-_),p(!0);let v=ch(d,_);v&&v.i!==Je&&(Je=v.i,ii(v),gr(v))}},escolherDispositivo:_r,mostrarDica:Zc,aoDuploClique:Jc,clicarComponente:iu,get fichaAberta(){return Pe?Pe.componente?Pe.componente.id:Pe.id:null},get modo(){return Se},get ambienteAtual(){return Je},render:()=>{p(!0),Sh(performance.now())},get sujo(){return f},sim:Bt,abrirQuadro:vo,fecharQuadro:su,clicarInterativo:tu,rede:Ce,legendaInfra:rn,destacarInfra:d=>{Xn=d||null,Ln()},mostrarTipoInfra:(d,_=!0)=>{ni[d]=!!_,Ln()},abrirPainelDe:(d,_=0)=>{let v=n.dispositivos.find(H=>H.simbolo===d);return v?.itens[_]&&yh(v,v.itens[_]),!!v},fichaDoEquipamento:d=>{let _=(di.get(String(d))||[])[0];return _?(Ys({t:_.t,it:_.t.itens[_.i],componente:xo(_.t),rede:Fn.get(_.t.itens[_.i]),painel:Qc[_.t.simbolo]||null}),!0):(Ys({lista:[String(d)]}),!1)},abrirManobras:()=>{Ce&&Ys({lista:Ce.lista().filter(d=>(d.interacao.acoes||[]).length||d.interacao.proxy).map(d=>d.id)})},corDoItem:(d,_=0)=>{let v=n.dispositivos.find(z=>z.simbolo===d||String(z.componente)===String(d));if(!v?.malha?.instanceColor)return null;let H=new he;return v.malha.getColorAt(_,H),[H.r,H.g,H.b].map(z=>Math.round(z*100)/100)},get quadroAberto(){return yr},get quadro3d(){return mn?.ctrl||null},corDoPonto:d=>{let _=Dt.find(H=>H.id===d);if(!_?.t.malha.instanceColor)return null;let v=new he;return _.t.malha.getColorAt(_.i,v),[v.r,v.g,v.b].map(H=>Math.round(H*100)/100)},get luzesAcesas(){return we.filter(d=>d.intensity>0).length},get mapa(){return At}};function Ah(d){requestAnimationFrame(Ah),Sh(d)}requestAnimationFrame(Ah),document.body.classList.add("pronto")}})();
