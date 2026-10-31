/* Visualizador 3D H&M — fonte:d6253a3cdc7c1b42 — inclui three.js r186 (0.186.1) e OrbitControls: MIT License, Copyright © 2010-2026 three.js authors (https://threejs.org/) */
(()=>{var Li={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Di={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Uh=0,tc=1,Fh=2;var Vr=1,Oh=2,Hs=3,Ni=0,cn=1,je=2,jn=0,Ws=1,ec=2,nc=3,ic=4,Bh=5;var ji=100,zh=101,kh=102,Vh=103,Gh=104,Hh=200,Wh=201,Xh=202,qh=203,sc=204,rc=205,Yh=206,Zh=207,$h=208,Jh=209,Kh=210,jh=211,Qh=212,tu=213,eu=214,Ra=0,Pa=1,Ia=2,Rs=3,La=4,Da=5,Na=6,Ua=7,ac=0,nu=1,iu=2,Gn=0,oc=1,lc=2,cc=3,hc=4,uc=5,dc=6,fc=7;var pc=300,Ui=301,Qi=302,go=303,_o=304,Gr=306,Fa=1e3,Yn=1001,Oa=1002,Je=1003,su=1004;var Hr=1005;var nn=1006,xo=1007;var Fi=1008;var mn=1009,mc=1010,gc=1011,Xs=1012,yo=1013,Hn=1014,In=1015,Wn=1016,vo=1017,Mo=1018,qs=1020,_c=35902,xc=35899,yc=1021,vc=1022,Ln=1023,$n=1026,Oi=1027,So=1028,bo=1029,Bi=1030,Eo=1031;var To=1033,Wr=33776,Xr=33777,qr=33778,Yr=33779,wo=35840,Ao=35841,Co=35842,Ro=35843,Po=36196,Io=37492,Lo=37496,Do=37488,No=37489,Zr=37490,Uo=37491,Fo=37808,Oo=37809,Bo=37810,zo=37811,ko=37812,Vo=37813,Go=37814,Ho=37815,Wo=37816,Xo=37817,qo=37818,Yo=37819,Zo=37820,$o=37821,Jo=36492,Ko=36494,jo=36495,Qo=36283,tl=36284,$r=36285,el=36286;var gr=2300,Ba=2301,Aa=2302,Gl=2303,Hl=2400,Wl=2401,Xl=2402;var ru=3200;var nl=0,au=1,gi="",en="srgb",_r="srgb-linear",xr="linear",we="srgb";var Ca=7680;var ou=519,lu=512,cu=513,hu=514,il=515,uu=516,du=517,sl=518,fu=519,pu=35044;var Mc="300 es",zn=2e3,Ps=2001;function od(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function ld(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function yr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function mu(){let i=yr("canvas");return i.style.display="block",i}var Qc={},Is=null;function Sc(...i){let t="THREE."+i.shift();Is?Is("log",t,...i):console.log(t,...i)}function gu(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function ie(...i){i=gu(i);let t="THREE."+i.shift();if(Is)Is("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function se(...i){i=gu(i);let t="THREE."+i.shift();if(Is)Is("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function Xi(...i){let t=i.join(" ");t in Qc||(Qc[t]=!0,ie(...i))}function _u(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var xu={[Ra]:Pa,[Ia]:Na,[La]:Ua,[Rs]:Da,[Pa]:Ra,[Na]:Ia,[Ua]:La,[Da]:Rs},kn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},sn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],th=1234567,As=Math.PI/180,Ls=180/Math.PI;function ts(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(sn[i&255]+sn[i>>8&255]+sn[i>>16&255]+sn[i>>24&255]+"-"+sn[t&255]+sn[t>>8&255]+"-"+sn[t>>16&15|64]+sn[t>>24&255]+"-"+sn[e&63|128]+sn[e>>8&255]+"-"+sn[e>>16&255]+sn[e>>24&255]+sn[n&255]+sn[n>>8&255]+sn[n>>16&255]+sn[n>>24&255]).toLowerCase()}function pe(i,t,e){return Math.max(t,Math.min(e,i))}function bc(i,t){return(i%t+t)%t}function cd(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function hd(i,t,e){return i!==t?(e-i)/(t-i):0}function fr(i,t,e){return(1-e)*i+e*t}function ud(i,t,e,n){return fr(i,t,1-Math.exp(-e*n))}function dd(i,t=1){return t-Math.abs(bc(i,t*2)-t)}function fd(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function pd(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function md(i,t){return i+Math.floor(Math.random()*(t-i+1))}function gd(i,t){return i+Math.random()*(t-i)}function _d(i){return i*(.5-Math.random())}function xd(i){i!==void 0&&(th=i);let t=th+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function yd(i){return i*As}function vd(i){return i*Ls}function Md(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Sd(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function bd(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Ed(i,t,e,n,s){let r=Math.cos,a=Math.sin,o=r(e/2),l=a(e/2),c=r((t+n)/2),h=a((t+n)/2),p=r((t-n)/2),u=a((t-n)/2),d=r((n-t)/2),x=a((n-t)/2);switch(s){case"XYX":i.set(o*h,l*p,l*u,o*c);break;case"YZY":i.set(l*u,o*h,l*p,o*c);break;case"ZXZ":i.set(l*p,l*u,o*h,o*c);break;case"XZX":i.set(o*h,l*x,l*d,o*c);break;case"YXY":i.set(l*d,o*h,l*x,o*c);break;case"ZYZ":i.set(l*x,l*d,o*h,o*c);break;default:ie("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function ws(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ln(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Ve={DEG2RAD:As,RAD2DEG:Ls,generateUUID:ts,clamp:pe,euclideanModulo:bc,mapLinear:cd,inverseLerp:hd,lerp:fr,damp:ud,pingpong:dd,smoothstep:fd,smootherstep:pd,randInt:md,randFloat:gd,randFloatSpread:_d,seededRandom:xd,degToRad:yd,radToDeg:vd,isPowerOfTwo:Md,ceilPowerOfTwo:Sd,floorPowerOfTwo:bd,setQuaternionFromProperEuler:Ed,normalize:ln,denormalize:ws},Rc=class Rc{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=pe(this.x,t.x,e.x),this.y=pe(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=pe(this.x,t,e),this.y=pe(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(pe(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Rc.prototype.isVector2=!0;var _t=Rc,En=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],p=n[s+3],u=r[a+0],d=r[a+1],x=r[a+2],E=r[a+3];if(p!==E||l!==u||c!==d||h!==x){let _=l*u+c*d+h*x+p*E;_<0&&(u=-u,d=-d,x=-x,E=-E,_=-_);let f=1-o;if(_<.9995){let R=Math.acos(_),T=Math.sin(R);f=Math.sin(f*R)/T,o=Math.sin(o*R)/T,l=l*f+u*o,c=c*f+d*o,h=h*f+x*o,p=p*f+E*o}else{l=l*f+u*o,c=c*f+d*o,h=h*f+x*o,p=p*f+E*o;let R=1/Math.sqrt(l*l+c*c+h*h+p*p);l*=R,c*=R,h*=R,p*=R}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=p}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],p=r[a],u=r[a+1],d=r[a+2],x=r[a+3];return t[e]=o*x+h*p+l*d-c*u,t[e+1]=l*x+h*u+c*p-o*d,t[e+2]=c*x+h*d+o*u-l*p,t[e+3]=h*x-o*p-l*u-c*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),p=o(r/2),u=l(n/2),d=l(s/2),x=l(r/2);switch(a){case"XYZ":this._x=u*h*p+c*d*x,this._y=c*d*p-u*h*x,this._z=c*h*x+u*d*p,this._w=c*h*p-u*d*x;break;case"YXZ":this._x=u*h*p+c*d*x,this._y=c*d*p-u*h*x,this._z=c*h*x-u*d*p,this._w=c*h*p+u*d*x;break;case"ZXY":this._x=u*h*p-c*d*x,this._y=c*d*p+u*h*x,this._z=c*h*x+u*d*p,this._w=c*h*p-u*d*x;break;case"ZYX":this._x=u*h*p-c*d*x,this._y=c*d*p+u*h*x,this._z=c*h*x-u*d*p,this._w=c*h*p+u*d*x;break;case"YZX":this._x=u*h*p+c*d*x,this._y=c*d*p+u*h*x,this._z=c*h*x-u*d*p,this._w=c*h*p-u*d*x;break;case"XZY":this._x=u*h*p-c*d*x,this._y=c*d*p-u*h*x,this._z=c*h*x+u*d*p,this._w=c*h*p+u*d*x;break;default:ie("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],p=e[10],u=n+o+p;if(u>0){let d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(a-s)*d}else if(n>o&&n>p){let d=2*Math.sqrt(1+n-o-p);this._w=(h-l)/d,this._x=.25*d,this._y=(s+a)/d,this._z=(r+c)/d}else if(o>p){let d=2*Math.sqrt(1+o-n-p);this._w=(r-c)/d,this._x=(s+a)/d,this._y=.25*d,this._z=(l+h)/d}else{let d=2*Math.sqrt(1+p-n-o);this._w=(a-s)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(pe(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){let c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},Pc=class Pc{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(eh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(eh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),p=2*(r*n-a*e);return this.x=e+l*c+a*p-o*h,this.y=n+l*h+o*c-r*p,this.z=s+l*p+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=pe(this.x,t.x,e.x),this.y=pe(this.y,t.y,e.y),this.z=pe(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=pe(this.x,t,e),this.y=pe(this.y,t,e),this.z=pe(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return gl.copy(this).projectOnVector(t),this.sub(gl)}reflect(t){return this.sub(gl.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(pe(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Pc.prototype.isVector3=!0;var D=Pc,gl=new D,eh=new En,Ic=class Ic{constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],p=n[7],u=n[2],d=n[5],x=n[8],E=s[0],_=s[3],f=s[6],R=s[1],T=s[4],v=s[7],A=s[2],w=s[5],I=s[8];return r[0]=a*E+o*R+l*A,r[3]=a*_+o*T+l*w,r[6]=a*f+o*v+l*I,r[1]=c*E+h*R+p*A,r[4]=c*_+h*T+p*w,r[7]=c*f+h*v+p*I,r[2]=u*E+d*R+x*A,r[5]=u*_+d*T+x*w,r[8]=u*f+d*v+x*I,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=h*a-o*c,u=o*l-h*r,d=c*r-a*l,x=e*p+n*u+s*d;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let E=1/x;return t[0]=p*E,t[1]=(s*c-h*n)*E,t[2]=(o*n-s*a)*E,t[3]=u*E,t[4]=(h*e-s*l)*E,t[5]=(s*r-o*e)*E,t[6]=d*E,t[7]=(n*l-c*e)*E,t[8]=(a*e-n*r)*E,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return Xi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(_l.makeScale(t,e)),this}rotate(t){return Xi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(_l.makeRotation(-t)),this}translate(t,e){return Xi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(_l.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Ic.prototype.isMatrix3=!0;var le=Ic,_l=new le,nh=new le().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ih=new le().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Td(){let i={enabled:!0,workingColorSpace:_r,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===we&&(s.r=ci(s.r),s.g=ci(s.g),s.b=ci(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===we&&(s.r=Cs(s.r),s.g=Cs(s.g),s.b=Cs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===gi?xr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Xi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Xi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[_r]:{primaries:t,whitePoint:n,transfer:xr,toXYZ:nh,fromXYZ:ih,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:en},outputColorSpaceConfig:{drawingBufferColorSpace:en}},[en]:{primaries:t,whitePoint:n,transfer:we,toXYZ:nh,fromXYZ:ih,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:en}}}),i}var ye=Td();function ci(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Cs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var ds,za=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{ds===void 0&&(ds=yr("canvas")),ds.width=t.width,ds.height=t.height;let s=ds.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=ds}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=yr("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=ci(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(ci(e[n]/255)*255):e[n]=ci(e[n]);return{data:e,width:t.width,height:t.height}}else return ie("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},wd=0,Ds=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:wd++}),this.uuid=ts(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(xl(s[a].image)):r.push(xl(s[a]))}else r=xl(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function xl(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?za.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(ie("Texture: Unable to serialize Texture."),{})}var Ad=0,yl=new D,fn=class i extends kn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=Yn,s=Yn,r=nn,a=Fi,o=Ln,l=mn,c=i.DEFAULT_ANISOTROPY,h=gi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ad++}),this.uuid=ts(),this.name="",this.source=new Ds(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new _t(0,0),this.repeat=new _t(1,1),this.center=new _t(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new le,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(yl).x}get height(){return this.source.getSize(yl).y}get depth(){return this.source.getSize(yl).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){ie(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){ie(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==pc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Fa:t.x=t.x-Math.floor(t.x);break;case Yn:t.x=t.x<0?0:1;break;case Oa:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Fa:t.y=t.y-Math.floor(t.y);break;case Yn:t.y=t.y<0?0:1;break;case Oa:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};fn.DEFAULT_IMAGE=null;fn.DEFAULT_MAPPING=pc;fn.DEFAULT_ANISOTROPY=1;var Lc=class Lc{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],p=l[8],u=l[1],d=l[5],x=l[9],E=l[2],_=l[6],f=l[10];if(Math.abs(h-u)<.01&&Math.abs(p-E)<.01&&Math.abs(x-_)<.01){if(Math.abs(h+u)<.1&&Math.abs(p+E)<.1&&Math.abs(x+_)<.1&&Math.abs(c+d+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let T=(c+1)/2,v=(d+1)/2,A=(f+1)/2,w=(h+u)/4,I=(p+E)/4,y=(x+_)/4;return T>v&&T>A?T<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(T),s=w/n,r=I/n):v>A?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=w/s,r=y/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=I/r,s=y/r),this.set(n,s,r,e),this}let R=Math.sqrt((_-x)*(_-x)+(p-E)*(p-E)+(u-h)*(u-h));return Math.abs(R)<.001&&(R=1),this.x=(_-x)/R,this.y=(p-E)/R,this.z=(u-h)/R,this.w=Math.acos((c+d+f-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=pe(this.x,t.x,e.x),this.y=pe(this.y,t.y,e.y),this.z=pe(this.z,t.z,e.z),this.w=pe(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=pe(this.x,t,e),this.y=pe(this.y,t,e),this.z=pe(this.z,t,e),this.w=pe(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pe(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Lc.prototype.isVector4=!0;var Fe=Lc,ka=class extends kn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:nn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new Fe(0,0,t,e),this.scissorTest=!1,this.viewport=new Fe(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new fn(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:nn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ds(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},pn=class extends ka{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},vr=class extends fn{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Je,this.minFilter=Je,this.wrapR=Yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Va=class extends fn{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Je,this.minFilter=Je,this.wrapR=Yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var mo=class mo{constructor(t,e,n,s,r,a,o,l,c,h,p,u,d,x,E,_){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,p,u,d,x,E,_)}set(t,e,n,s,r,a,o,l,c,h,p,u,d,x,E,_){let f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=s,f[1]=r,f[5]=a,f[9]=o,f[13]=l,f[2]=c,f[6]=h,f[10]=p,f[14]=u,f[3]=d,f[7]=x,f[11]=E,f[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new mo().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/fs.setFromMatrixColumn(t,0).length(),r=1/fs.setFromMatrixColumn(t,1).length(),a=1/fs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),p=Math.sin(r);if(t.order==="XYZ"){let u=a*h,d=a*p,x=o*h,E=o*p;e[0]=l*h,e[4]=-l*p,e[8]=c,e[1]=d+x*c,e[5]=u-E*c,e[9]=-o*l,e[2]=E-u*c,e[6]=x+d*c,e[10]=a*l}else if(t.order==="YXZ"){let u=l*h,d=l*p,x=c*h,E=c*p;e[0]=u+E*o,e[4]=x*o-d,e[8]=a*c,e[1]=a*p,e[5]=a*h,e[9]=-o,e[2]=d*o-x,e[6]=E+u*o,e[10]=a*l}else if(t.order==="ZXY"){let u=l*h,d=l*p,x=c*h,E=c*p;e[0]=u-E*o,e[4]=-a*p,e[8]=x+d*o,e[1]=d+x*o,e[5]=a*h,e[9]=E-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){let u=a*h,d=a*p,x=o*h,E=o*p;e[0]=l*h,e[4]=x*c-d,e[8]=u*c+E,e[1]=l*p,e[5]=E*c+u,e[9]=d*c-x,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){let u=a*l,d=a*c,x=o*l,E=o*c;e[0]=l*h,e[4]=E-u*p,e[8]=x*p+d,e[1]=p,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=d*p+x,e[10]=u-E*p}else if(t.order==="XZY"){let u=a*l,d=a*c,x=o*l,E=o*c;e[0]=l*h,e[4]=-p,e[8]=c*h,e[1]=u*p+E,e[5]=a*h,e[9]=d*p-x,e[2]=x*p-d,e[6]=o*h,e[10]=E*p+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Cd,t,Rd)}lookAt(t,e,n){let s=this.elements;return yn.subVectors(t,e),yn.lengthSq()===0&&(yn.z=1),yn.normalize(),vi.crossVectors(n,yn),vi.lengthSq()===0&&(Math.abs(n.z)===1?yn.x+=1e-4:yn.z+=1e-4,yn.normalize(),vi.crossVectors(n,yn)),vi.normalize(),ta.crossVectors(yn,vi),s[0]=vi.x,s[4]=ta.x,s[8]=yn.x,s[1]=vi.y,s[5]=ta.y,s[9]=yn.y,s[2]=vi.z,s[6]=ta.z,s[10]=yn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],p=n[5],u=n[9],d=n[13],x=n[2],E=n[6],_=n[10],f=n[14],R=n[3],T=n[7],v=n[11],A=n[15],w=s[0],I=s[4],y=s[8],P=s[12],L=s[1],U=s[5],V=s[9],Z=s[13],O=s[2],H=s[6],Q=s[10],nt=s[14],ht=s[3],tt=s[7],at=s[11],lt=s[15];return r[0]=a*w+o*L+l*O+c*ht,r[4]=a*I+o*U+l*H+c*tt,r[8]=a*y+o*V+l*Q+c*at,r[12]=a*P+o*Z+l*nt+c*lt,r[1]=h*w+p*L+u*O+d*ht,r[5]=h*I+p*U+u*H+d*tt,r[9]=h*y+p*V+u*Q+d*at,r[13]=h*P+p*Z+u*nt+d*lt,r[2]=x*w+E*L+_*O+f*ht,r[6]=x*I+E*U+_*H+f*tt,r[10]=x*y+E*V+_*Q+f*at,r[14]=x*P+E*Z+_*nt+f*lt,r[3]=R*w+T*L+v*O+A*ht,r[7]=R*I+T*U+v*H+A*tt,r[11]=R*y+T*V+v*Q+A*at,r[15]=R*P+T*Z+v*nt+A*lt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],p=t[6],u=t[10],d=t[14],x=t[3],E=t[7],_=t[11],f=t[15],R=l*d-c*u,T=o*d-c*p,v=o*u-l*p,A=a*d-c*h,w=a*u-l*h,I=a*p-o*h;return e*(E*R-_*T+f*v)-n*(x*R-_*A+f*w)+s*(x*T-E*A+f*I)-r*(x*v-E*w+_*I)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],p=t[9],u=t[10],d=t[11],x=t[12],E=t[13],_=t[14],f=t[15],R=e*o-n*a,T=e*l-s*a,v=e*c-r*a,A=n*l-s*o,w=n*c-r*o,I=s*c-r*l,y=h*E-p*x,P=h*_-u*x,L=h*f-d*x,U=p*_-u*E,V=p*f-d*E,Z=u*f-d*_,O=R*Z-T*V+v*U+A*L-w*P+I*y;if(O===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let H=1/O;return t[0]=(o*Z-l*V+c*U)*H,t[1]=(s*V-n*Z-r*U)*H,t[2]=(E*I-_*w+f*A)*H,t[3]=(u*w-p*I-d*A)*H,t[4]=(l*L-a*Z-c*P)*H,t[5]=(e*Z-s*L+r*P)*H,t[6]=(_*v-x*I-f*T)*H,t[7]=(h*I-u*v+d*T)*H,t[8]=(a*V-o*L+c*y)*H,t[9]=(n*L-e*V-r*y)*H,t[10]=(x*w-E*v+f*R)*H,t[11]=(p*v-h*w-d*R)*H,t[12]=(o*P-a*U-l*y)*H,t[13]=(e*U-n*P+s*y)*H,t[14]=(E*T-x*A-_*R)*H,t[15]=(h*A-p*T+u*R)*H,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,p=o+o,u=r*c,d=r*h,x=r*p,E=a*h,_=a*p,f=o*p,R=l*c,T=l*h,v=l*p,A=n.x,w=n.y,I=n.z;return s[0]=(1-(E+f))*A,s[1]=(d+v)*A,s[2]=(x-T)*A,s[3]=0,s[4]=(d-v)*w,s[5]=(1-(u+f))*w,s[6]=(_+R)*w,s[7]=0,s[8]=(x+T)*I,s[9]=(_-R)*I,s[10]=(1-(u+E))*I,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=fs.set(s[0],s[1],s[2]).length(),o=fs.set(s[4],s[5],s[6]).length(),l=fs.set(s[8],s[9],s[10]).length();r<0&&(a=-a),Fn.copy(this);let c=1/a,h=1/o,p=1/l;return Fn.elements[0]*=c,Fn.elements[1]*=c,Fn.elements[2]*=c,Fn.elements[4]*=h,Fn.elements[5]*=h,Fn.elements[6]*=h,Fn.elements[8]*=p,Fn.elements[9]*=p,Fn.elements[10]*=p,e.setFromRotationMatrix(Fn),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=zn,l=!1){let c=this.elements,h=2*r/(e-t),p=2*r/(n-s),u=(e+t)/(e-t),d=(n+s)/(n-s),x,E;if(l)x=r/(a-r),E=a*r/(a-r);else if(o===zn)x=-(a+r)/(a-r),E=-2*a*r/(a-r);else if(o===Ps)x=-a/(a-r),E=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=p,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=E,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=zn,l=!1){let c=this.elements,h=2/(e-t),p=2/(n-s),u=-(e+t)/(e-t),d=-(n+s)/(n-s),x,E;if(l)x=1/(a-r),E=a/(a-r);else if(o===zn)x=-2/(a-r),E=-(a+r)/(a-r);else if(o===Ps)x=-1/(a-r),E=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=p,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=x,c[14]=E,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};mo.prototype.isMatrix4=!0;var Ae=mo,fs=new D,Fn=new Ae,Cd=new D(0,0,0),Rd=new D(1,1,1),vi=new D,ta=new D,yn=new D,sh=new Ae,rh=new En,hi=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],p=s[2],u=s[6],d=s[10];switch(e){case"XYZ":this._y=Math.asin(pe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-pe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-p,r),this._z=0);break;case"ZXY":this._x=Math.asin(pe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-p,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-pe(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(pe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-p,r)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-pe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:ie("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return sh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(sh,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return rh.setFromEuler(this),this.setFromQuaternion(rh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};hi.DEFAULT_ORDER="XYZ";var Ns=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Pd=0,ah=new D,ps=new En,ii=new Ae,ea=new D,rr=new D,Id=new D,Ld=new En,oh=new D(1,0,0),lh=new D(0,1,0),ch=new D(0,0,1),hh={type:"added"},Dd={type:"removed"},ms={type:"childadded",child:null},vl={type:"childremoved",child:null},He=class i extends kn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Pd++}),this.uuid=ts(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new D,e=new hi,n=new En,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ae},normalMatrix:{value:new le}}),this.matrix=new Ae,this.matrixWorld=new Ae,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ns,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ps.setFromAxisAngle(t,e),this.quaternion.multiply(ps),this}rotateOnWorldAxis(t,e){return ps.setFromAxisAngle(t,e),this.quaternion.premultiply(ps),this}rotateX(t){return this.rotateOnAxis(oh,t)}rotateY(t){return this.rotateOnAxis(lh,t)}rotateZ(t){return this.rotateOnAxis(ch,t)}translateOnAxis(t,e){return ah.copy(t).applyQuaternion(this.quaternion),this.position.add(ah.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(oh,t)}translateY(t){return this.translateOnAxis(lh,t)}translateZ(t){return this.translateOnAxis(ch,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(ii.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?ea.copy(t):ea.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),rr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ii.lookAt(rr,ea,this.up):ii.lookAt(ea,rr,this.up),this.quaternion.setFromRotationMatrix(ii),s&&(ii.extractRotation(s.matrixWorld),ps.setFromRotationMatrix(ii),this.quaternion.premultiply(ps.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(se("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(hh),ms.child=t,this.dispatchEvent(ms),ms.child=null):se("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Dd),vl.child=t,this.dispatchEvent(vl),vl.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),ii.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),ii.multiply(t.parent.matrixWorld)),t.applyMatrix4(ii),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(hh),ms.child=t,this.dispatchEvent(ms),ms.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(rr,t,Id),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(rr,Ld,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let p=l[c];r(t.shapes,p)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){let o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),p=a(t.shapes),u=a(t.skeletons),d=a(t.animations),x=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),p.length>0&&(n.shapes=p),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),x.length>0&&(n.nodes=x)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};He.DEFAULT_UP=new D(0,1,0);He.DEFAULT_MATRIX_AUTO_UPDATE=!0;He.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Sn=class extends He{constructor(){super(),this.isGroup=!0,this.type="Group"}},Nd={type:"move"},Us=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Sn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Sn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Sn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(let E of t.hand.values()){let _=e.getJointPose(E,n),f=this._getHandJoint(c,E);_!==null&&(f.matrix.fromArray(_.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=_.radius),f.visible=_!==null}let h=c.joints["index-finger-tip"],p=c.joints["thumb-tip"],u=h.position.distanceTo(p.position),d=.02,x=.005;c.inputState.pinching&&u>d+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=d-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Nd)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Sn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},yu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mi={h:0,s:0,l:0},na={h:0,s:0,l:0};function Ml(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var he=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=en){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ye.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=ye.workingColorSpace){return this.r=t,this.g=e,this.b=n,ye.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=ye.workingColorSpace){if(t=bc(t,1),e=pe(e,0,1),n=pe(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Ml(a,r,t+1/3),this.g=Ml(a,r,t),this.b=Ml(a,r,t-1/3)}return ye.colorSpaceToWorking(this,s),this}setStyle(t,e=en){function n(r){r!==void 0&&parseFloat(r)<1&&ie("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:ie("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);ie("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=en){let n=yu[t.toLowerCase()];return n!==void 0?this.setHex(n,e):ie("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=ci(t.r),this.g=ci(t.g),this.b=ci(t.b),this}copyLinearToSRGB(t){return this.r=Cs(t.r),this.g=Cs(t.g),this.b=Cs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=en){return ye.workingToColorSpace(rn.copy(this),t),Math.round(pe(rn.r*255,0,255))*65536+Math.round(pe(rn.g*255,0,255))*256+Math.round(pe(rn.b*255,0,255))}getHexString(t=en){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ye.workingColorSpace){ye.workingToColorSpace(rn.copy(this),e);let n=rn.r,s=rn.g,r=rn.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let p=a-o;switch(c=h<=.5?p/(a+o):p/(2-a-o),a){case n:l=(s-r)/p+(s<r?6:0);break;case s:l=(r-n)/p+2;break;case r:l=(n-s)/p+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ye.workingColorSpace){return ye.workingToColorSpace(rn.copy(this),e),t.r=rn.r,t.g=rn.g,t.b=rn.b,t}getStyle(t=en){ye.workingToColorSpace(rn.copy(this),t);let e=rn.r,n=rn.g,s=rn.b;return t!==en?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Mi),this.setHSL(Mi.h+t,Mi.s+e,Mi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Mi),t.getHSL(na);let n=fr(Mi.h,na.h,e),s=fr(Mi.s,na.s,e),r=fr(Mi.l,na.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},rn=new he;he.NAMES=yu;var qi=class extends He{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hi,this.environmentIntensity=1,this.environmentRotation=new hi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},On=new D,si=new D,Sl=new D,ri=new D,gs=new D,_s=new D,uh=new D,bl=new D,El=new D,Tl=new D,wl=new Fe,Al=new Fe,Cl=new Fe,li=class i{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),On.subVectors(t,e),s.cross(On);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){On.subVectors(s,e),si.subVectors(n,e),Sl.subVectors(t,e);let a=On.dot(On),o=On.dot(si),l=On.dot(Sl),c=si.dot(si),h=si.dot(Sl),p=a*c-o*o;if(p===0)return r.set(0,0,0),null;let u=1/p,d=(c*l-o*h)*u,x=(a*h-o*l)*u;return r.set(1-d-x,x,d)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,ri)===null?!1:ri.x>=0&&ri.y>=0&&ri.x+ri.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,ri)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ri.x),l.addScaledVector(a,ri.y),l.addScaledVector(o,ri.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return wl.setScalar(0),Al.setScalar(0),Cl.setScalar(0),wl.fromBufferAttribute(t,e),Al.fromBufferAttribute(t,n),Cl.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(wl,r.x),a.addScaledVector(Al,r.y),a.addScaledVector(Cl,r.z),a}static isFrontFacing(t,e,n,s){return On.subVectors(n,e),si.subVectors(t,e),On.cross(si).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return On.subVectors(this.c,this.b),si.subVectors(this.a,this.b),On.cross(si).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;gs.subVectors(s,n),_s.subVectors(r,n),bl.subVectors(t,n);let l=gs.dot(bl),c=_s.dot(bl);if(l<=0&&c<=0)return e.copy(n);El.subVectors(t,s);let h=gs.dot(El),p=_s.dot(El);if(h>=0&&p<=h)return e.copy(s);let u=l*p-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(gs,a);Tl.subVectors(t,r);let d=gs.dot(Tl),x=_s.dot(Tl);if(x>=0&&d<=x)return e.copy(r);let E=d*c-l*x;if(E<=0&&c>=0&&x<=0)return o=c/(c-x),e.copy(n).addScaledVector(_s,o);let _=h*x-d*p;if(_<=0&&p-h>=0&&d-x>=0)return uh.subVectors(r,s),o=(p-h)/(p-h+(d-x)),e.copy(s).addScaledVector(uh,o);let f=1/(_+E+u);return a=E*f,o=u*f,e.copy(n).addScaledVector(gs,a).addScaledVector(_s,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Jn=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Bn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Bn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Bn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,Bn):Bn.fromBufferAttribute(r,a),Bn.applyMatrix4(t.matrixWorld),this.expandByPoint(Bn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),ia.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ia.copy(n.boundingBox)),ia.applyMatrix4(t.matrixWorld),this.union(ia)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Bn),Bn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(ar),sa.subVectors(this.max,ar),xs.subVectors(t.a,ar),ys.subVectors(t.b,ar),vs.subVectors(t.c,ar),Si.subVectors(ys,xs),bi.subVectors(vs,ys),Vi.subVectors(xs,vs);let e=[0,-Si.z,Si.y,0,-bi.z,bi.y,0,-Vi.z,Vi.y,Si.z,0,-Si.x,bi.z,0,-bi.x,Vi.z,0,-Vi.x,-Si.y,Si.x,0,-bi.y,bi.x,0,-Vi.y,Vi.x,0];return!Rl(e,xs,ys,vs,sa)||(e=[1,0,0,0,1,0,0,0,1],!Rl(e,xs,ys,vs,sa))?!1:(ra.crossVectors(Si,bi),e=[ra.x,ra.y,ra.z],Rl(e,xs,ys,vs,sa))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Bn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Bn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(ai[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),ai[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),ai[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),ai[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),ai[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),ai[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),ai[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),ai[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(ai),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},ai=[new D,new D,new D,new D,new D,new D,new D,new D],Bn=new D,ia=new Jn,xs=new D,ys=new D,vs=new D,Si=new D,bi=new D,Vi=new D,ar=new D,sa=new D,ra=new D,Gi=new D;function Rl(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Gi.fromArray(i,r);let o=s.x*Math.abs(Gi.x)+s.y*Math.abs(Gi.y)+s.z*Math.abs(Gi.z),l=t.dot(Gi),c=e.dot(Gi),h=n.dot(Gi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var ke=new D,aa=new _t,Ud=0,bn=class extends kn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ud++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=pu,this.updateRanges=[],this.gpuType=In,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)aa.fromBufferAttribute(this,e),aa.applyMatrix3(t),this.setXY(e,aa.x,aa.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix3(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix4(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.applyNormalMatrix(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ke.fromBufferAttribute(this,e),ke.transformDirection(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ws(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ln(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ws(e,this.array)),e}setX(t,e){return this.normalized&&(e=ln(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ws(e,this.array)),e}setY(t,e){return this.normalized&&(e=ln(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ws(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ln(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ws(e,this.array)),e}setW(t,e){return this.normalized&&(e=ln(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ln(e,this.array),n=ln(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=ln(e,this.array),n=ln(n,this.array),s=ln(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=ln(e,this.array),n=ln(n,this.array),s=ln(s,this.array),r=ln(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Mr=class extends bn{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Sr=class extends bn{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var ge=class extends bn{constructor(t,e,n){super(new Float32Array(t),e,n)}},Fd=new Jn,or=new D,Pl=new D,ui=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):Fd.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;or.subVectors(t,this.center);let e=or.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(or,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Pl.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(or.copy(t.center).add(Pl)),this.expandByPoint(or.copy(t.center).sub(Pl))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Od=0,Pn=new Ae,Il=new He,Ms=new D,vn=new Jn,lr=new Jn,Ze=new D,Be=class i extends kn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Od++}),this.uuid=ts(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(od(t)?Sr:Mr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new le().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Pn.makeRotationFromQuaternion(t),this.applyMatrix4(Pn),this}rotateX(t){return Pn.makeRotationX(t),this.applyMatrix4(Pn),this}rotateY(t){return Pn.makeRotationY(t),this.applyMatrix4(Pn),this}rotateZ(t){return Pn.makeRotationZ(t),this.applyMatrix4(Pn),this}translate(t,e,n){return Pn.makeTranslation(t,e,n),this.applyMatrix4(Pn),this}scale(t,e,n){return Pn.makeScale(t,e,n),this.applyMatrix4(Pn),this}lookAt(t){return Il.lookAt(t),Il.updateMatrix(),this.applyMatrix4(Il.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ms).negate(),this.translate(Ms.x,Ms.y,Ms.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ge(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&ie("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Jn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){se("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];vn.setFromBufferAttribute(r),this.morphTargetsRelative?(Ze.addVectors(this.boundingBox.min,vn.min),this.boundingBox.expandByPoint(Ze),Ze.addVectors(this.boundingBox.max,vn.max),this.boundingBox.expandByPoint(Ze)):(this.boundingBox.expandByPoint(vn.min),this.boundingBox.expandByPoint(vn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&se('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ui);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){se("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let n=this.boundingSphere.center;if(vn.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];lr.setFromBufferAttribute(o),this.morphTargetsRelative?(Ze.addVectors(vn.min,lr.min),vn.expandByPoint(Ze),Ze.addVectors(vn.max,lr.max),vn.expandByPoint(Ze)):(vn.expandByPoint(lr.min),vn.expandByPoint(lr.max))}vn.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)Ze.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Ze));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Ze.fromBufferAttribute(o,c),l&&(Ms.fromBufferAttribute(t,c),Ze.add(Ms)),s=Math.max(s,n.distanceToSquared(Ze))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&se('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){se("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new bn(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],l=[];for(let y=0;y<n.count;y++)o[y]=new D,l[y]=new D;let c=new D,h=new D,p=new D,u=new _t,d=new _t,x=new _t,E=new D,_=new D;function f(y,P,L){c.fromBufferAttribute(n,y),h.fromBufferAttribute(n,P),p.fromBufferAttribute(n,L),u.fromBufferAttribute(r,y),d.fromBufferAttribute(r,P),x.fromBufferAttribute(r,L),h.sub(c),p.sub(c),d.sub(u),x.sub(u);let U=1/(d.x*x.y-x.x*d.y);isFinite(U)&&(E.copy(h).multiplyScalar(x.y).addScaledVector(p,-d.y).multiplyScalar(U),_.copy(p).multiplyScalar(d.x).addScaledVector(h,-x.x).multiplyScalar(U),o[y].add(E),o[P].add(E),o[L].add(E),l[y].add(_),l[P].add(_),l[L].add(_))}let R=this.groups;R.length===0&&(R=[{start:0,count:t.count}]);for(let y=0,P=R.length;y<P;++y){let L=R[y],U=L.start,V=L.count;for(let Z=U,O=U+V;Z<O;Z+=3)f(t.getX(Z+0),t.getX(Z+1),t.getX(Z+2))}let T=new D,v=new D,A=new D,w=new D;function I(y){A.fromBufferAttribute(s,y),w.copy(A);let P=o[y];T.copy(P),T.sub(A.multiplyScalar(A.dot(P))).normalize(),v.crossVectors(w,P);let U=v.dot(l[y])<0?-1:1;a.setXYZW(y,T.x,T.y,T.z,U)}for(let y=0,P=R.length;y<P;++y){let L=R[y],U=L.start,V=L.count;for(let Z=U,O=U+V;Z<O;Z+=3)I(t.getX(Z+0)),I(t.getX(Z+1)),I(t.getX(Z+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new bn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);let s=new D,r=new D,a=new D,o=new D,l=new D,c=new D,h=new D,p=new D;if(t)for(let u=0,d=t.count;u<d;u+=3){let x=t.getX(u+0),E=t.getX(u+1),_=t.getX(u+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,E),a.fromBufferAttribute(e,_),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),o.fromBufferAttribute(n,x),l.fromBufferAttribute(n,E),c.fromBufferAttribute(n,_),o.add(h),l.add(h),c.add(h),n.setXYZ(x,o.x,o.y,o.z),n.setXYZ(E,l.x,l.y,l.z),n.setXYZ(_,c.x,c.y,c.z)}else for(let u=0,d=e.count;u<d;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,r),p.subVectors(s,r),h.cross(p),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Ze.fromBufferAttribute(t,e),Ze.normalize(),t.setXYZ(e,Ze.x,Ze.y,Ze.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,p=o.normalized,u=new c.constructor(l.length*h),d=0,x=0;for(let E=0,_=l.length;E<_;E++){o.isInterleavedBufferAttribute?d=l[E]*o.data.stride+o.offset:d=l[E]*h;for(let f=0;f<h;f++)u[x++]=c[d++]}return new bn(u,h,p)}if(this.index===null)return ie("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=t(l,n);e.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,p=c.length;h<p;h++){let u=c[h],d=t(u,n);l.push(d)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let p=0,u=c.length;p<u;p++){let d=c[p];h.push(d.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],p=r[c];for(let u=0,d=p.length;u<d;u++)h.push(p[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let c=0,h=a.length;c<h;c++){let p=a[c];this.addGroup(p.start,p.count,p.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Ll=new D,Bd=new D,zd=new le,Mn=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=Ll.subVectors(n,e).cross(Bd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(Ll),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||zd.getNormalMatrix(t),s=this.coplanarPoint(Ll).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},kd=0,di=class extends kn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:kd++}),this.uuid=ts(),this.name="",this.type="Material",this.blending=Ws,this.side=Ni,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=sc,this.blendDst=rc,this.blendEquation=ji,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new he(0,0,0),this.blendAlpha=0,this.depthFunc=Rs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ou,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ca,this.stencilZFail=Ca,this.stencilZPass=Ca,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){ie(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){ie(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new he().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Mn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new _t().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new _t().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var oi=new D,Dl=new D,oa=new D,la=new D,Ti=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,oi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=oi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(oi.copy(this.origin).addScaledVector(this.direction,e),oi.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Dl.copy(t).add(e).multiplyScalar(.5),oa.copy(e).sub(t).normalize(),la.copy(this.origin).sub(Dl);let r=t.distanceTo(e)*.5,a=-this.direction.dot(oa),o=la.dot(this.direction),l=-la.dot(oa),c=la.lengthSq(),h=Math.abs(1-a*a),p,u,d,x;if(h>0)if(p=a*l-o,u=a*o-l,x=r*h,p>=0)if(u>=-x)if(u<=x){let E=1/h;p*=E,u*=E,d=p*(p+a*u+2*o)+u*(a*p+u+2*l)+c}else u=r,p=Math.max(0,-(a*u+o)),d=-p*p+u*(u+2*l)+c;else u=-r,p=Math.max(0,-(a*u+o)),d=-p*p+u*(u+2*l)+c;else u<=-x?(p=Math.max(0,-(-a*r+o)),u=p>0?-r:Math.min(Math.max(-r,-l),r),d=-p*p+u*(u+2*l)+c):u<=x?(p=0,u=Math.min(Math.max(-r,-l),r),d=u*(u+2*l)+c):(p=Math.max(0,-(a*r+o)),u=p>0?r:Math.min(Math.max(-r,-l),r),d=-p*p+u*(u+2*l)+c);else u=a>0?-r:r,p=Math.max(0,-(a*u+o)),d=-p*p+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,p),s&&s.copy(Dl).addScaledVector(oa,u),d}intersectSphere(t,e){if(t.radius<0)return null;oi.subVectors(t.center,this.origin);let n=oi.dot(this.direction),s=oi.dot(oi)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,p=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),p>=0?(o=(t.min.z-u.z)*p,l=(t.max.z-u.z)*p):(o=(t.max.z-u.z)*p,l=(t.min.z-u.z)*p),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,oi)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,p=t.x-a.x,u=t.y-a.y,d=t.z-a.z,x=e.x-a.x,E=e.y-a.y,_=e.z-a.z,f=n.x-a.x,R=n.y-a.y,T=n.z-a.z,v=Math.abs(l),A=Math.abs(c),w=Math.abs(h),I,y,P,L,U,V,Z,O,H,Q,nt,ht;if(v>=A&&v>=w?(P=l,V=p,H=x,ht=f,l>=0?(I=c,y=h,L=u,U=d,Z=E,O=_,Q=R,nt=T):(I=h,y=c,L=d,U=u,Z=_,O=E,Q=T,nt=R)):A>=w?(P=c,V=u,H=E,ht=R,c>=0?(I=h,y=l,L=d,U=p,Z=_,O=x,Q=T,nt=f):(I=l,y=h,L=p,U=d,Z=x,O=_,Q=f,nt=T)):(P=h,V=d,H=_,ht=T,h>=0?(I=l,y=c,L=p,U=u,Z=x,O=E,Q=f,nt=R):(I=c,y=l,L=u,U=p,Z=E,O=x,Q=R,nt=f)),P===0)return null;let tt=I/P,at=y/P,lt=1/P,Ot=L-tt*V,yt=U-at*V,Lt=Z-tt*H,Wt=O-at*H,ue=Q-tt*ht,K=nt-at*ht,st=ue*Wt-K*Lt,bt=Ot*K-yt*ue,Qt=Lt*yt-Wt*Ot;if(s){if(st<0||bt<0||Qt<0)return null}else if((st<0||bt<0||Qt<0)&&(st>0||bt>0||Qt>0))return null;let vt=st+bt+Qt;if(vt===0)return null;let Vt=lt*(st*V+bt*H+Qt*ht);return(vt>0?Vt<0:Vt>0)?null:this.at(Vt/vt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},fi=class extends di{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new he(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.combine=ac,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},dh=new Ae,Hi=new Ti,ca=new ui,fh=new D,ha=new D,ua=new D,da=new D,Nl=new D,fa=new D,ph=new D,pa=new D,Ne=class extends He{constructor(t=new Be,e=new fi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){fa.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],p=r[l];h!==0&&(Nl.fromBufferAttribute(p,t),a?fa.addScaledVector(Nl,h):fa.addScaledVector(Nl.sub(e),h))}e.add(fa)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ca.copy(n.boundingSphere),ca.applyMatrix4(r),Hi.copy(t.ray).recast(t.near),!(ca.containsPoint(Hi.origin)===!1&&(Hi.intersectSphere(ca,fh)===null||Hi.origin.distanceToSquared(fh)>(t.far-t.near)**2))&&(dh.copy(r).invert(),Hi.copy(t.ray).applyMatrix4(dh),!(n.boundingBox!==null&&Hi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Hi)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,p=r.attributes.normal,u=r.groups,d=r.drawRange;if(o!==null)if(Array.isArray(a))for(let x=0,E=u.length;x<E;x++){let _=u[x],f=a[_.materialIndex],R=Math.max(_.start,d.start),T=Math.min(o.count,Math.min(_.start+_.count,d.start+d.count));for(let v=R,A=T;v<A;v+=3){let w=o.getX(v),I=o.getX(v+1),y=o.getX(v+2);s=ma(this,f,t,n,c,h,p,w,I,y),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=_.materialIndex,e.push(s))}}else{let x=Math.max(0,d.start),E=Math.min(o.count,d.start+d.count);for(let _=x,f=E;_<f;_+=3){let R=o.getX(_),T=o.getX(_+1),v=o.getX(_+2);s=ma(this,a,t,n,c,h,p,R,T,v),s&&(s.faceIndex=Math.floor(_/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let x=0,E=u.length;x<E;x++){let _=u[x],f=a[_.materialIndex],R=Math.max(_.start,d.start),T=Math.min(l.count,Math.min(_.start+_.count,d.start+d.count));for(let v=R,A=T;v<A;v+=3){let w=v,I=v+1,y=v+2;s=ma(this,f,t,n,c,h,p,w,I,y),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=_.materialIndex,e.push(s))}}else{let x=Math.max(0,d.start),E=Math.min(l.count,d.start+d.count);for(let _=x,f=E;_<f;_+=3){let R=_,T=_+1,v=_+2;s=ma(this,a,t,n,c,h,p,R,T,v),s&&(s.faceIndex=Math.floor(_/3),e.push(s))}}}};function Vd(i,t,e,n,s,r,a,o){let l;if(t.side===cn?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===Ni,o),l===null)return null;pa.copy(o),pa.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(pa);return c<e.near||c>e.far?null:{distance:c,point:pa.clone(),object:i}}function ma(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,ha),i.getVertexPosition(l,ua),i.getVertexPosition(c,da);let h=Vd(i,t,e,n,ha,ua,da,ph);if(h){let p=new D;li.getBarycoord(ph,ha,ua,da,p),s&&(h.uv=li.getInterpolatedAttribute(s,o,l,c,p,new _t)),r&&(h.uv1=li.getInterpolatedAttribute(r,o,l,c,p,new _t)),a&&(h.normal=li.getInterpolatedAttribute(a,o,l,c,p,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:l,c,normal:new D,materialIndex:0};li.getNormal(ha,ua,da,u.normal),h.face=u,h.barycoord=p}return h}var br=class extends fn{constructor(t=null,e=1,n=1,s,r,a,o,l,c=Je,h=Je,p,u){super(null,a,o,l,c,h,s,r,p,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Er=class extends bn{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}},Ss=new Ae,mh=new Ae,ga=[],gh=new Jn,Gd=new Ae,cr=new Ne,hr=new ui,Yi=class extends Ne{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Er(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Gd)}computeBoundingBox(){let t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Jn),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ss),gh.copy(t.boundingBox).applyMatrix4(Ss),this.boundingBox.union(gh)}computeBoundingSphere(){let t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new ui),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ss),hr.copy(t.boundingSphere).applyMatrix4(Ss),this.boundingSphere.union(hr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(t,e){let n=this.matrixWorld,s=this.count;if(cr.geometry=this.geometry,cr.material=this.material,cr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),hr.copy(this.boundingSphere),hr.applyMatrix4(n),t.ray.intersectsSphere(hr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ss),mh.multiplyMatrices(n,Ss),cr.matrixWorld=mh,cr.raycast(t,ga);for(let a=0,o=ga.length;a<o;a++){let l=ga[a];l.instanceId=r,l.object=this,e.push(l)}ga.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new Er(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new br(new Float32Array(s*this.count),s,this.count,So,In));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Wi=new ui,Hd=new _t(.5,.5),_a=new D,Fs=class{constructor(t=new Mn,e=new Mn,n=new Mn,s=new Mn,r=new Mn,a=new Mn){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=zn,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],p=r[5],u=r[6],d=r[7],x=r[8],E=r[9],_=r[10],f=r[11],R=r[12],T=r[13],v=r[14],A=r[15];if(s[0].setComponents(c-a,d-h,f-x,A-R).normalize(),s[1].setComponents(c+a,d+h,f+x,A+R).normalize(),s[2].setComponents(c+o,d+p,f+E,A+T).normalize(),s[3].setComponents(c-o,d-p,f-E,A-T).normalize(),n)s[4].setComponents(l,u,_,v).normalize(),s[5].setComponents(c-l,d-u,f-_,A-v).normalize();else if(s[4].setComponents(c-l,d-u,f-_,A-v).normalize(),e===zn)s[5].setComponents(c+l,d+u,f+_,A+v).normalize();else if(e===Ps)s[5].setComponents(l,u,_,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Wi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Wi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Wi)}intersectsSprite(t){Wi.center.set(0,0,0);let e=Hd.distanceTo(t.center);return Wi.radius=.7071067811865476+e,Wi.applyMatrix4(t.matrixWorld),this.intersectsSphere(Wi)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(_a.x=s.normal.x>0?t.max.x:t.min.x,_a.y=s.normal.y>0?t.max.y:t.min.y,_a.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(_a)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Vn=class extends di{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new he(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Ga=new D,Ha=new D,_h=new Ae,ur=new Ti,xa=new ui,Ul=new D,xh=new D,Wa=class extends He{constructor(t=new Be,e=new Vn){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)Ga.fromBufferAttribute(e,s-1),Ha.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=Ga.distanceTo(Ha);t.setAttribute("lineDistance",new ge(n,1))}else ie("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),xa.copy(n.boundingSphere),xa.applyMatrix4(s),xa.radius+=r,t.ray.intersectsSphere(xa)===!1)return;_h.copy(s).invert(),ur.copy(t.ray).applyMatrix4(_h);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let d=Math.max(0,a.start),x=Math.min(h.count,a.start+a.count);for(let E=d,_=x-1;E<_;E+=c){let f=h.getX(E),R=h.getX(E+1),T=ya(this,t,ur,l,f,R,E);T&&e.push(T)}if(this.isLineLoop){let E=h.getX(x-1),_=h.getX(d),f=ya(this,t,ur,l,E,_,x-1);f&&e.push(f)}}else{let d=Math.max(0,a.start),x=Math.min(u.count,a.start+a.count);for(let E=d,_=x-1;E<_;E+=c){let f=ya(this,t,ur,l,E,E+1,E);f&&e.push(f)}if(this.isLineLoop){let E=ya(this,t,ur,l,x-1,d,x-1);E&&e.push(E)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function ya(i,t,e,n,s,r,a){let o=i.geometry.attributes.position;if(Ga.fromBufferAttribute(o,s),Ha.fromBufferAttribute(o,r),e.distanceSqToSegment(Ga,Ha,Ul,xh)>n)return;Ul.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Ul);if(!(c<t.near||c>t.far))return{distance:c,point:xh.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var yh=new D,vh=new D,Kn=class extends Wa{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)yh.fromBufferAttribute(e,s),vh.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+yh.distanceTo(vh);t.setAttribute("lineDistance",new ge(n,1))}else ie("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Tr=class extends fn{constructor(t=[],e=Ui,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var wi=class extends fn{constructor(t,e,n=Hn,s,r,a,o=Je,l=Je,c,h=$n,p=1){if(h!==$n&&h!==Oi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:p};super(u,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ds(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},Xa=class extends wi{constructor(t,e=Hn,n=Ui,s,r,a=Je,o=Je,l,c=$n){let h={width:t,height:t,depth:1},p=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},wr=class extends fn{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},Tn=class i extends Be{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],p=[],u=0,d=0;x("z","y","x",-1,-1,n,e,t,a,r,0),x("z","y","x",1,-1,n,e,-t,a,r,1),x("x","z","y",1,1,t,n,e,s,a,2),x("x","z","y",1,-1,t,n,-e,s,a,3),x("x","y","z",1,-1,t,e,n,s,r,4),x("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ge(c,3)),this.setAttribute("normal",new ge(h,3)),this.setAttribute("uv",new ge(p,2));function x(E,_,f,R,T,v,A,w,I,y,P){let L=v/I,U=A/y,V=v/2,Z=A/2,O=w/2,H=I+1,Q=y+1,nt=0,ht=0,tt=new D;for(let at=0;at<Q;at++){let lt=at*U-Z;for(let Ot=0;Ot<H;Ot++){let yt=Ot*L-V;tt[E]=yt*R,tt[_]=lt*T,tt[f]=O,c.push(tt.x,tt.y,tt.z),tt[E]=0,tt[_]=0,tt[f]=w>0?1:-1,h.push(tt.x,tt.y,tt.z),p.push(Ot/I),p.push(1-at/y),nt+=1}}for(let at=0;at<y;at++)for(let lt=0;lt<I;lt++){let Ot=u+lt+H*at,yt=u+lt+H*(at+1),Lt=u+(lt+1)+H*(at+1),Wt=u+(lt+1)+H*at;l.push(Ot,yt,Wt),l.push(yt,Lt,Wt),ht+=6}o.addGroup(d,ht,P),d+=ht,u+=nt}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var pi=class i extends Be{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],p=[],u=[],d=[],x=0,E=[],_=n/2,f=0;R(),a===!1&&(t>0&&T(!0),e>0&&T(!1)),this.setIndex(h),this.setAttribute("position",new ge(p,3)),this.setAttribute("normal",new ge(u,3)),this.setAttribute("uv",new ge(d,2));function R(){let v=new D,A=new D,w=0,I=(e-t)/n;for(let y=0;y<=r;y++){let P=[],L=y/r,U=L*(e-t)+t;for(let V=0;V<=s;V++){let Z=V/s,O=Z*l+o,H=Math.sin(O),Q=Math.cos(O);A.x=U*H,A.y=-L*n+_,A.z=U*Q,p.push(A.x,A.y,A.z),v.set(H,I,Q).normalize(),u.push(v.x,v.y,v.z),d.push(Z,1-L),P.push(x++)}E.push(P)}for(let y=0;y<s;y++)for(let P=0;P<r;P++){let L=E[P][y],U=E[P+1][y],V=E[P+1][y+1],Z=E[P][y+1];(t>0||P!==0)&&(h.push(L,U,Z),w+=3),(e>0||P!==r-1)&&(h.push(U,V,Z),w+=3)}c.addGroup(f,w,0),f+=w}function T(v){let A=x,w=new _t,I=new D,y=0,P=v===!0?t:e,L=v===!0?1:-1;for(let V=1;V<=s;V++)p.push(0,_*L,0),u.push(0,L,0),d.push(.5,.5),x++;let U=x;for(let V=0;V<=s;V++){let O=V/s*l+o,H=Math.cos(O),Q=Math.sin(O);I.x=P*Q,I.y=_*L,I.z=P*H,p.push(I.x,I.y,I.z),u.push(0,L,0),w.x=H*.5+.5,w.y=Q*.5*L+.5,d.push(w.x,w.y),x++}for(let V=0;V<s;V++){let Z=A+V,O=U+V;v===!0?h.push(O,O+1,Z):h.push(O+1,O,Z),y+=3}c.addGroup(f,y,v===!0?1:2),f+=y}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var va=new D,Ma=new D,Fl=new D,Sa=new li,Ar=class extends Be{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(As*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],p=new Array(3),u={},d=[];for(let x=0;x<l;x+=3){a?(c[0]=a.getX(x),c[1]=a.getX(x+1),c[2]=a.getX(x+2)):(c[0]=x,c[1]=x+1,c[2]=x+2);let{a:E,b:_,c:f}=Sa;if(E.fromBufferAttribute(o,c[0]),_.fromBufferAttribute(o,c[1]),f.fromBufferAttribute(o,c[2]),Sa.getNormal(Fl),p[0]=`${Math.round(E.x*s)},${Math.round(E.y*s)},${Math.round(E.z*s)}`,p[1]=`${Math.round(_.x*s)},${Math.round(_.y*s)},${Math.round(_.z*s)}`,p[2]=`${Math.round(f.x*s)},${Math.round(f.y*s)},${Math.round(f.z*s)}`,!(p[0]===p[1]||p[1]===p[2]||p[2]===p[0]))for(let R=0;R<3;R++){let T=(R+1)%3,v=p[R],A=p[T],w=Sa[h[R]],I=Sa[h[T]],y=`${v}_${A}`,P=`${A}_${v}`;P in u&&u[P]?(Fl.dot(u[P].normal)<=r&&(d.push(w.x,w.y,w.z),d.push(I.x,I.y,I.z)),u[P]=null):y in u||(u[y]={index0:c[R],index1:c[T],normal:Fl.clone()})}}for(let x in u)if(u[x]){let{index0:E,index1:_}=u[x];va.fromBufferAttribute(o,E),Ma.fromBufferAttribute(o,_),d.push(va.x,va.y,va.z),d.push(Ma.x,Ma.y,Ma.z)}this.setAttribute("position",new ge(d,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}},wn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){ie("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),s=0,r=n.length,a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],u=n[s+1]-h,d=(a-h)/u;return(s+d)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new _t:new D);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new D,s=[],r=[],a=[],o=new D,l=new Ae;for(let d=0;d<=t;d++){let x=d/t;s[d]=this.getTangentAt(x,new D)}r[0]=new D,a[0]=new D;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),p=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),p<=c&&(c=p,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let d=1;d<=t;d++){if(r[d]=r[d-1].clone(),a[d]=a[d-1].clone(),o.crossVectors(s[d-1],s[d]),o.length()>Number.EPSILON){o.normalize();let x=Math.acos(pe(s[d-1].dot(s[d]),-1,1));r[d].applyMatrix4(l.makeRotationAxis(o,x))}a[d].crossVectors(s[d],r[d])}if(e===!0){let d=Math.acos(pe(r[0].dot(r[t]),-1,1));d/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(d=-d);for(let x=1;x<=t;x++)r[x].applyMatrix4(l.makeRotationAxis(s[x],d*x)),a[x].crossVectors(s[x],r[x])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}},Os=class extends wn{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new _t){let n=e,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+t*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),p=Math.sin(this.aRotation),u=l-this.aX,d=c-this.aY;l=u*h-d*p+this.aX,c=u*p+d*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}},qa=class extends Os{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Ec(){let i=0,t=0,e=0,n=0;function s(r,a,o,l){i=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,p){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,d=(o-a)/h-(l-a)/(h+p)+(l-o)/p;u*=h,d*=h,s(a,o,u,d)},calc:function(r){let a=r*r,o=a*r;return i+t*r+e*a+n*o}}}var Mh=new D,Sh=new D,Ol=new Ec,Bl=new Ec,zl=new Ec,Ya=class extends wn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new D){let n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(Sh.subVectors(s[0],s[1]).add(s[0]),c=Sh);let p=s[o%r],u=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Mh.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Mh),this.curveType==="centripetal"||this.curveType==="chordal"){let d=this.curveType==="chordal"?.5:.25,x=Math.pow(c.distanceToSquared(p),d),E=Math.pow(p.distanceToSquared(u),d),_=Math.pow(u.distanceToSquared(h),d);E<1e-4&&(E=1),x<1e-4&&(x=E),_<1e-4&&(_=E),Ol.initNonuniformCatmullRom(c.x,p.x,u.x,h.x,x,E,_),Bl.initNonuniformCatmullRom(c.y,p.y,u.y,h.y,x,E,_),zl.initNonuniformCatmullRom(c.z,p.z,u.z,h.z,x,E,_)}else this.curveType==="catmullrom"&&(Ol.initCatmullRom(c.x,p.x,u.x,h.x,this.tension),Bl.initCatmullRom(c.y,p.y,u.y,h.y,this.tension),zl.initCatmullRom(c.z,p.z,u.z,h.z,this.tension));return n.set(Ol.calc(l),Bl.calc(l),zl.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new D().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}};function bh(i,t,e,n,s){let r=(n-t)*.5,a=(s-e)*.5,o=i*i,l=i*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*i+e}function Wd(i,t){let e=1-i;return e*e*t}function Xd(i,t){return 2*(1-i)*i*t}function qd(i,t){return i*i*t}function pr(i,t,e,n){return Wd(i,t)+Xd(i,e)+qd(i,n)}function Yd(i,t){let e=1-i;return e*e*e*t}function Zd(i,t){let e=1-i;return 3*e*e*i*t}function $d(i,t){return 3*(1-i)*i*i*t}function Jd(i,t){return i*i*i*t}function mr(i,t,e,n,s){return Yd(i,t)+Zd(i,e)+$d(i,n)+Jd(i,s)}var Cr=class extends wn{constructor(t=new _t,e=new _t,n=new _t,s=new _t){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new _t){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(mr(t,s.x,r.x,a.x,o.x),mr(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Za=class extends wn{constructor(t=new D,e=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new D){let n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(mr(t,s.x,r.x,a.x,o.x),mr(t,s.y,r.y,a.y,o.y),mr(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}},Rr=class extends wn{constructor(t=new _t,e=new _t){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new _t){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new _t){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},$a=class extends wn{constructor(t=new D,e=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new D){let n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new D){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Pr=class extends wn{constructor(t=new _t,e=new _t,n=new _t){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new _t){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(pr(t,s.x,r.x,a.x),pr(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Ja=class extends wn{constructor(t=new D,e=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new D){let n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(pr(t,s.x,r.x,a.x),pr(t,s.y,r.y,a.y),pr(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}},Ir=class extends wn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new _t){let n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],p=s[a>s.length-3?s.length-1:a+2];return n.set(bh(o,l.x,c.x,h.x,p.x),bh(o,l.y,c.y,h.y,p.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let s=t.points[e];this.points.push(new _t().fromArray(s))}return this}},ql=Object.freeze({__proto__:null,ArcCurve:qa,CatmullRomCurve3:Ya,CubicBezierCurve:Cr,CubicBezierCurve3:Za,EllipseCurve:Os,LineCurve:Rr,LineCurve3:$a,QuadraticBezierCurve:Pr,QuadraticBezierCurve3:Ja,SplineCurve:Ir}),Ka=class extends wn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new ql[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}r++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){let e=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let s=t.curves[e];this.curves.push(new ql[s.type]().fromJSON(s))}return this}},Lr=class extends Ka{constructor(t){super(),this.type="Path",this.currentPoint=new _t,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new Rr(this.currentPoint.clone(),new _t(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){let r=new Pr(this.currentPoint.clone(),new _t(t,e),new _t(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,a){let o=new Cr(this.currentPoint.clone(),new _t(t,e),new _t(n,s),new _t(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new Ir(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,s,r,a),this}absarc(t,e,n,s,r,a){return this.absellipse(t,e,n,n,s,r,a),this}ellipse(t,e,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,a,o,l),this}absellipse(t,e,n,s,r,a,o,l){let c=new Os(t,e,n,s,r,a,o,l);if(this.curves.length>0){let p=c.getPoint(0);p.equals(this.currentPoint)||this.lineTo(p.x,p.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}},mi=class extends Lr{constructor(t){super(t),this.uuid=ts(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let s=t.holes[e];this.holes.push(new Lr().fromJSON(s))}return this}};function Kd(i,t,e=2){let n=t&&t.length,s=n?t[0]*e:i.length,r=vu(i,0,s,e,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(n&&(r=nf(i,t,r,e)),i.length>80*e){o=i[0],l=i[1];let h=o,p=l;for(let u=e;u<s;u+=e){let d=i[u],x=i[u+1];d<o&&(o=d),x<l&&(l=x),d>h&&(h=d),x>p&&(p=x)}c=Math.max(h-o,p-l),c=c!==0?32767/c:0}return Dr(r,a,e,o,l,c,0),a}function vu(i,t,e,n,s){let r;if(s===pf(i,t,e,n)>0)for(let a=t;a<e;a+=n)r=Eh(a/n|0,i[a],i[a+1],r);else for(let a=e-n;a>=t;a-=n)r=Eh(a/n|0,i[a],i[a+1],r);return r&&Bs(r,r.next)&&(Ur(r),r=r.next),r}function Zi(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(Bs(e,e.next)||Oe(e.prev,e,e.next)===0)){if(Ur(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Dr(i,t,e,n,s,r,a){if(!i)return;!a&&r&&lf(i,n,s,r);let o=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?Qd(i,n,s,r):jd(i)){t.push(l.i,i.i,c.i),Ur(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=tf(Zi(i),t),Dr(i,t,e,n,s,r,2)):a===2&&ef(i,t,e,n,s,r):Dr(Zi(i),t,e,n,s,r,1);break}}}function jd(i){let t=i.prev,e=i,n=i.next;if(Oe(t,e,n)>=0)return!1;let s=t.x,r=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=Math.min(s,r,a),p=Math.min(o,l,c),u=Math.max(s,r,a),d=Math.max(o,l,c),x=n.next;for(;x!==t;){if(x.x>=h&&x.x<=u&&x.y>=p&&x.y<=d&&dr(s,o,r,l,a,c,x.x,x.y)&&Oe(x.prev,x,x.next)>=0)return!1;x=x.next}return!0}function Qd(i,t,e,n){let s=i.prev,r=i,a=i.next;if(Oe(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,p=r.y,u=a.y,d=Math.min(o,l,c),x=Math.min(h,p,u),E=Math.max(o,l,c),_=Math.max(h,p,u),f=Yl(d,x,t,e,n),R=Yl(E,_,t,e,n),T=i.prevZ,v=i.nextZ;for(;T&&T.z>=f&&v&&v.z<=R;){if(T.x>=d&&T.x<=E&&T.y>=x&&T.y<=_&&T!==s&&T!==a&&dr(o,h,l,p,c,u,T.x,T.y)&&Oe(T.prev,T,T.next)>=0||(T=T.prevZ,v.x>=d&&v.x<=E&&v.y>=x&&v.y<=_&&v!==s&&v!==a&&dr(o,h,l,p,c,u,v.x,v.y)&&Oe(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;T&&T.z>=f;){if(T.x>=d&&T.x<=E&&T.y>=x&&T.y<=_&&T!==s&&T!==a&&dr(o,h,l,p,c,u,T.x,T.y)&&Oe(T.prev,T,T.next)>=0)return!1;T=T.prevZ}for(;v&&v.z<=R;){if(v.x>=d&&v.x<=E&&v.y>=x&&v.y<=_&&v!==s&&v!==a&&dr(o,h,l,p,c,u,v.x,v.y)&&Oe(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function tf(i,t){let e=i;do{let n=e.prev,s=e.next.next;!Bs(n,s)&&Su(n,e,e.next,s)&&Nr(n,s)&&Nr(s,n)&&(t.push(n.i,e.i,s.i),Ur(e),Ur(e.next),e=i=s),e=e.next}while(e!==i);return Zi(e)}function ef(i,t,e,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&uf(a,o)){let l=bu(a,o);a=Zi(a,a.next),l=Zi(l,l.next),Dr(a,t,e,n,s,r,0),Dr(l,t,e,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function nf(i,t,e,n){let s=[];for(let r=0,a=t.length;r<a;r++){let o=t[r]*n,l=r<a-1?t[r+1]*n:i.length,c=vu(i,o,l,n,!1);c===c.next&&(c.steiner=!0),s.push(hf(c))}s.sort(sf);for(let r=0;r<s.length;r++)e=rf(s[r],e);return e}function sf(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function rf(i,t){let e=af(i,t);if(!e)return t;let n=bu(e,i);return Zi(n,n.next),Zi(e,e.next)}function af(i,t){let e=t,n=i.x,s=i.y,r=-1/0,a;if(Bs(i,e))return e;do{if(Bs(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){let p=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(p<=n&&p>r&&(r=p,a=e.x<e.next.x?e:e.next,p===n))return a}e=e.next}while(e!==t);if(!a)return null;let o=a,l=a.x,c=a.y,h=1/0;e=a;do{if(n>=e.x&&e.x>=l&&n!==e.x&&Mu(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){let p=Math.abs(s-e.y)/(n-e.x);Nr(e,i)&&(p<h||p===h&&(e.x>a.x||e.x===a.x&&of(a,e)))&&(a=e,h=p)}e=e.next}while(e!==o);return a}function of(i,t){return Oe(i.prev,i,t.prev)<0&&Oe(t.next,i,i.next)<0}function lf(i,t,e,n){let s=i;do s.z===0&&(s.z=Yl(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,cf(s)}function cf(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let a=n,o=0;for(let c=0;c<e&&(o++,a=a.nextZ,!!a);c++);let l=e;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,e*=2}while(t>1);return i}function Yl(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function hf(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function Mu(i,t,e,n,s,r,a,o){return(s-a)*(t-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(r-o)>=(s-a)*(n-o)}function dr(i,t,e,n,s,r,a,o){return!(i===a&&t===o)&&Mu(i,t,e,n,s,r,a,o)}function uf(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!df(i,t)&&(Nr(i,t)&&Nr(t,i)&&ff(i,t)&&(Oe(i.prev,i,t.prev)||Oe(i,t.prev,t))||Bs(i,t)&&Oe(i.prev,i,i.next)>0&&Oe(t.prev,t,t.next)>0)}function Oe(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function Bs(i,t){return i.x===t.x&&i.y===t.y}function Su(i,t,e,n){let s=Ea(Oe(i,t,e)),r=Ea(Oe(i,t,n)),a=Ea(Oe(e,n,i)),o=Ea(Oe(e,n,t));return!!(s!==r&&a!==o||s===0&&ba(i,e,t)||r===0&&ba(i,n,t)||a===0&&ba(e,i,n)||o===0&&ba(e,t,n))}function ba(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function Ea(i){return i>0?1:i<0?-1:0}function df(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&Su(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function Nr(i,t){return Oe(i.prev,i,i.next)<0?Oe(i,t,i.next)>=0&&Oe(i,i.prev,t)>=0:Oe(i,t,i.prev)<0||Oe(i,i.next,t)<0}function ff(i,t){let e=i,n=!1,s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function bu(i,t){let e=Zl(i.i,i.x,i.y),n=Zl(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Eh(i,t,e,n){let s=Zl(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Ur(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Zl(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function pf(i,t,e,n){let s=0;for(let r=t,a=e-n;r<e;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var $l=class{static triangulate(t,e,n=2){return Kd(t,e,n)}},Zn=class i{static area(t){let e=t.length,n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return i.area(t)<0}static triangulateShape(t,e){let n=[],s=[],r=[];Th(t),wh(n,t);let a=t.length;e.forEach(Th);for(let l=0;l<e.length;l++)s.push(a),a+=e[l].length,wh(n,e[l]);let o=$l.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function Th(i){let t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function wh(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}var Fr=class i extends Be{constructor(t=new mi([new _t(.5,.5),new _t(-.5,.5),new _t(-.5,-.5),new _t(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,s=[],r=[];for(let o=0,l=t.length;o<l;o++){let c=t[o];a(c)}this.setAttribute("position",new ge(s,3)),this.setAttribute("uv",new ge(r,2)),this.computeVertexNormals();function a(o){let l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,p=e.depth!==void 0?e.depth:1,u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,d=e.bevelThickness!==void 0?e.bevelThickness:.2,x=e.bevelSize!==void 0?e.bevelSize:d-.1,E=e.bevelOffset!==void 0?e.bevelOffset:0,_=e.bevelSegments!==void 0?e.bevelSegments:3,f=e.extrudePath,R=e.UVGenerator!==void 0?e.UVGenerator:mf,T,v=!1,A,w,I,y;if(f){T=f.getSpacedPoints(h),v=!0,u=!1;let ot=f.isCatmullRomCurve3?f.closed:!1;A=f.computeFrenetFrames(h,ot),w=new D,I=new D,y=new D}u||(_=0,d=0,x=0,E=0);let P=o.extractPoints(c),L=P.shape,U=P.holes;if(!Zn.isClockWise(L)){L=L.reverse();for(let ot=0,mt=U.length;ot<mt;ot++){let ct=U[ot];Zn.isClockWise(ct)&&(U[ot]=ct.reverse())}}function Z(ot){let ct=10000000000000001e-36,pt=ot[0];for(let ut=1;ut<=ot.length;ut++){let Kt=ut%ot.length,Bt=ot[Kt],jt=Bt.x-pt.x,re=Bt.y-pt.y,N=jt*jt+re*re,xe=Math.max(Math.abs(Bt.x),Math.abs(Bt.y),Math.abs(pt.x),Math.abs(pt.y)),q=ct*xe*xe;if(N<=q){ot.splice(Kt,1),ut--;continue}pt=Bt}}Z(L),U.forEach(Z);let O=U.length,H=L;for(let ot=0;ot<O;ot++){let mt=U[ot];L=L.concat(mt)}function Q(ot,mt,ct){return mt||se("ExtrudeGeometry: vec does not exist"),ot.clone().addScaledVector(mt,ct)}let nt=L.length;function ht(ot,mt,ct){let pt,ut,Kt,Bt=ot.x-mt.x,jt=ot.y-mt.y,re=ct.x-ot.x,N=ct.y-ot.y,xe=Bt*Bt+jt*jt,q=Bt*N-jt*re;if(Math.abs(q)>Number.EPSILON){let M=Math.sqrt(xe),m=Math.sqrt(re*re+N*N),F=mt.x-jt/M,W=mt.y+Bt/M,k=ct.x-N/m,ft=ct.y+re/m,gt=((k-F)*N-(ft-W)*re)/(Bt*N-jt*re);pt=F+Bt*gt-ot.x,ut=W+jt*gt-ot.y;let $=pt*pt+ut*ut;if($<=2)return new _t(pt,ut);Kt=Math.sqrt($/2)}else{let M=!1;Bt>Number.EPSILON?re>Number.EPSILON&&(M=!0):Bt<-Number.EPSILON?re<-Number.EPSILON&&(M=!0):Math.sign(jt)===Math.sign(N)&&(M=!0),M?(pt=-jt,ut=Bt,Kt=Math.sqrt(xe)):(pt=Bt,ut=jt,Kt=Math.sqrt(xe/2))}return new _t(pt/Kt,ut/Kt)}let tt=[];for(let ot=0,mt=H.length,ct=mt-1,pt=ot+1;ot<mt;ot++,ct++,pt++)ct===mt&&(ct=0),pt===mt&&(pt=0),tt[ot]=ht(H[ot],H[ct],H[pt]);let at=[],lt,Ot=tt.concat();for(let ot=0,mt=O;ot<mt;ot++){let ct=U[ot];lt=[];for(let pt=0,ut=ct.length,Kt=ut-1,Bt=pt+1;pt<ut;pt++,Kt++,Bt++)Kt===ut&&(Kt=0),Bt===ut&&(Bt=0),lt[pt]=ht(ct[pt],ct[Kt],ct[Bt]);at.push(lt),Ot=Ot.concat(lt)}let yt;if(_===0)yt=Zn.triangulateShape(H,U);else{let ot=[],mt=[];for(let ct=0;ct<_;ct++){let pt=ct/_,ut=d*Math.cos(pt*Math.PI/2),Kt=x*Math.sin(pt*Math.PI/2)+E;for(let Bt=0,jt=H.length;Bt<jt;Bt++){let re=Q(H[Bt],tt[Bt],Kt);bt(re.x,re.y,-ut),pt===0&&ot.push(re)}for(let Bt=0,jt=O;Bt<jt;Bt++){let re=U[Bt];lt=at[Bt];let N=[];for(let xe=0,q=re.length;xe<q;xe++){let M=Q(re[xe],lt[xe],Kt);bt(M.x,M.y,-ut),pt===0&&N.push(M)}pt===0&&mt.push(N)}}yt=Zn.triangulateShape(ot,mt)}let Lt=yt.length,Wt=x+E;for(let ot=0;ot<nt;ot++){let mt=u?Q(L[ot],Ot[ot],Wt):L[ot];v?(I.copy(A.normals[0]).multiplyScalar(mt.x),w.copy(A.binormals[0]).multiplyScalar(mt.y),y.copy(T[0]).add(I).add(w),bt(y.x,y.y,y.z)):bt(mt.x,mt.y,0)}for(let ot=1;ot<=h;ot++)for(let mt=0;mt<nt;mt++){let ct=u?Q(L[mt],Ot[mt],Wt):L[mt];v?(I.copy(A.normals[ot]).multiplyScalar(ct.x),w.copy(A.binormals[ot]).multiplyScalar(ct.y),y.copy(T[ot]).add(I).add(w),bt(y.x,y.y,y.z)):bt(ct.x,ct.y,p/h*ot)}for(let ot=_-1;ot>=0;ot--){let mt=ot/_,ct=d*Math.cos(mt*Math.PI/2),pt=x*Math.sin(mt*Math.PI/2)+E;for(let ut=0,Kt=H.length;ut<Kt;ut++){let Bt=Q(H[ut],tt[ut],pt);bt(Bt.x,Bt.y,p+ct)}for(let ut=0,Kt=U.length;ut<Kt;ut++){let Bt=U[ut];lt=at[ut];for(let jt=0,re=Bt.length;jt<re;jt++){let N=Q(Bt[jt],lt[jt],pt);v?bt(N.x,N.y+T[h-1].y,T[h-1].x+ct):bt(N.x,N.y,p+ct)}}}ue(),K();function ue(){let ot=s.length/3;if(u){let mt=0,ct=nt*mt;for(let pt=0;pt<Lt;pt++){let ut=yt[pt];Qt(ut[2]+ct,ut[1]+ct,ut[0]+ct)}mt=h+_*2,ct=nt*mt;for(let pt=0;pt<Lt;pt++){let ut=yt[pt];Qt(ut[0]+ct,ut[1]+ct,ut[2]+ct)}}else{for(let mt=0;mt<Lt;mt++){let ct=yt[mt];Qt(ct[2],ct[1],ct[0])}for(let mt=0;mt<Lt;mt++){let ct=yt[mt];Qt(ct[0]+nt*h,ct[1]+nt*h,ct[2]+nt*h)}}n.addGroup(ot,s.length/3-ot,0)}function K(){let ot=s.length/3,mt=0;st(H,mt),mt+=H.length;for(let ct=0,pt=U.length;ct<pt;ct++){let ut=U[ct];st(ut,mt),mt+=ut.length}n.addGroup(ot,s.length/3-ot,1)}function st(ot,mt){let ct=ot.length;for(;--ct>=0;){let pt=ct,ut=ct-1;ut<0&&(ut=ot.length-1);for(let Kt=0,Bt=h+_*2;Kt<Bt;Kt++){let jt=nt*Kt,re=nt*(Kt+1),N=mt+pt+jt,xe=mt+ut+jt,q=mt+ut+re,M=mt+pt+re;vt(N,xe,q,M)}}}function bt(ot,mt,ct){l.push(ot),l.push(mt),l.push(ct)}function Qt(ot,mt,ct){Vt(ot),Vt(mt),Vt(ct);let pt=s.length/3,ut=R.generateTopUV(n,s,pt-3,pt-2,pt-1);Me(ut[0]),Me(ut[1]),Me(ut[2])}function vt(ot,mt,ct,pt){Vt(ot),Vt(mt),Vt(pt),Vt(mt),Vt(ct),Vt(pt);let ut=s.length/3,Kt=R.generateSideWallUV(n,s,ut-6,ut-3,ut-2,ut-1);Me(Kt[0]),Me(Kt[1]),Me(Kt[3]),Me(Kt[1]),Me(Kt[2]),Me(Kt[3])}function Vt(ot){s.push(l[ot*3+0]),s.push(l[ot*3+1]),s.push(l[ot*3+2])}function Me(ot){r.push(ot.x),r.push(ot.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return gf(e,n,t)}static fromJSON(t,e){let n=[];for(let r=0,a=t.shapes.length;r<a;r++){let o=e[t.shapes[r]];n.push(o)}let s=t.options.extrudePath;return s!==void 0&&(t.options.extrudePath=new ql[s.type]().fromJSON(s)),new i(n,t.options)}},mf={generateTopUV:function(i,t,e,n,s){let r=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[s*3],h=t[s*3+1];return[new _t(r,a),new _t(o,l),new _t(c,h)]},generateSideWallUV:function(i,t,e,n,s,r){let a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],p=t[n*3+2],u=t[s*3],d=t[s*3+1],x=t[s*3+2],E=t[r*3],_=t[r*3+1],f=t[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new _t(a,1-l),new _t(c,1-p),new _t(u,1-x),new _t(E,1-f)]:[new _t(o,1-l),new _t(h,1-p),new _t(d,1-x),new _t(_,1-f)]}};function gf(i,t,e){if(e.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}var Ai=class i extends Be{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,p=t/o,u=e/l,d=[],x=[],E=[],_=[];for(let f=0;f<h;f++){let R=f*u-a;for(let T=0;T<c;T++){let v=T*p-r;x.push(v,-R,0),E.push(0,0,1),_.push(T/o),_.push(1-f/l)}}for(let f=0;f<l;f++)for(let R=0;R<o;R++){let T=R+c*f,v=R+c*(f+1),A=R+1+c*(f+1),w=R+1+c*f;d.push(T,v,w),d.push(v,A,w)}this.setIndex(d),this.setAttribute("position",new ge(x,3)),this.setAttribute("normal",new ge(E,3)),this.setAttribute("uv",new ge(_,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var zs=class i extends Be{constructor(t=new mi([new _t(0,.5),new _t(-.5,-.5),new _t(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],s=[],r=[],a=[],o=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(o,l,h),o+=l,l=0;this.setIndex(n),this.setAttribute("position",new ge(s,3)),this.setAttribute("normal",new ge(r,3)),this.setAttribute("uv",new ge(a,2));function c(h){let p=s.length/3,u=h.extractPoints(e),d=u.shape,x=u.holes;Zn.isClockWise(d)===!1&&(d=d.reverse());for(let _=0,f=x.length;_<f;_++){let R=x[_];Zn.isClockWise(R)===!0&&(x[_]=R.reverse())}let E=Zn.triangulateShape(d,x);for(let _=0,f=x.length;_<f;_++){let R=x[_];d=d.concat(R)}for(let _=0,f=d.length;_<f;_++){let R=d[_];s.push(R.x,R.y,0),r.push(0,0,1),a.push(R.x,R.y)}for(let _=0,f=E.length;_<f;_++){let R=E[_],T=R[0]+p,v=R[1]+p,A=R[2]+p;n.push(T,v,A),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return _f(e,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];n.push(a)}return new i(n,t.curveSegments)}};function _f(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){let s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}var Or=class i extends Be{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],p=new D,u=new D,d=[],x=[],E=[],_=[];for(let f=0;f<=n;f++){let R=[],T=f/n,v=a+T*o,A=t*Math.cos(v),w=Math.sqrt(t*t-A*A),I=0;f===0&&a===0?I=.5/e:f===n&&l===Math.PI&&(I=-.5/e);for(let y=0;y<=e;y++){let P=y/e,L=s+P*r;p.x=-w*Math.cos(L),p.y=A,p.z=w*Math.sin(L),x.push(p.x,p.y,p.z),u.copy(p).normalize(),E.push(u.x,u.y,u.z),_.push(P+I,1-T),R.push(c++)}h.push(R)}for(let f=0;f<n;f++)for(let R=0;R<e;R++){let T=h[f][R+1],v=h[f][R],A=h[f+1][R],w=h[f+1][R+1];(f!==0||a>0)&&d.push(T,v,w),(f!==n-1||l<Math.PI)&&d.push(v,A,w)}this.setIndex(d),this.setAttribute("position",new ge(x,3)),this.setAttribute("normal",new ge(E,3)),this.setAttribute("uv",new ge(_,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function es(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(Ah(s))s.isRenderTargetTexture?(ie("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Ah(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function an(i){let t={};for(let e=0;e<i.length;e++){let n=es(i[e]);for(let s in n)t[s]=n[s]}return t}function Ah(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function xf(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Tc(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ye.workingColorSpace}var Eu={clone:es,merge:an},yf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,vf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,An=class extends di{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=yf,this.fragmentShader=vf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=es(t.uniforms),this.uniformsGroups=xf(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new he().setHex(s.value);break;case"v2":this.uniforms[n].value=new _t().fromArray(s.value);break;case"v3":this.uniforms[n].value=new D().fromArray(s.value);break;case"v4":this.uniforms[n].value=new Fe().fromArray(s.value);break;case"m3":this.uniforms[n].value=new le().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Ae().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},ja=class extends An{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Ke=class extends di{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new he(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=nl,this.normalScale=new _t(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var Qa=class extends di{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ru,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},to=class extends di{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function bs(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function kl(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Ci=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},eo=class extends Ci{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Hl,endingEnd:Hl}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Wl:r=t,o=2*e-n;break;case Xl:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Wl:a=t,l=2*n-e;break;case Xl:a=1,l=n+s[1]-s[0];break;default:a=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,p=this._offsetNext,u=this._weightPrev,d=this._weightNext,x=(n-e)/(s-e),E=x*x,_=E*x,f=-u*_+2*u*E-u*x,R=(1+u)*_+(-1.5-2*u)*E+(-.5+u)*x+1,T=(-1-d)*_+(1.5+d)*E+.5*x,v=d*_-d*E;for(let A=0;A!==o;++A)r[A]=f*a[h+A]+R*a[c+A]+T*a[l+A]+v*a[p+A];return r}},no=class extends Ci{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(n-e)/(s-e),p=1-h;for(let u=0;u!==o;++u)r[u]=a[c+u]*p+a[l+u]*h;return r}},io=class extends Ci{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},so=class extends Ci{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this.inTangents,p=this.outTangents;if(!h||!p){let x=(n-e)/(s-e),E=1-x;for(let _=0;_!==o;++_)r[_]=a[c+_]*E+a[l+_]*x;return r}let u=o*2,d=t-1;for(let x=0;x!==o;++x){let E=a[c+x],_=a[l+x],f=d*u+x*2,R=p[f],T=p[f+1],v=t*u+x*2,A=h[v],w=h[v+1],I=Sf(n,e,R,A,s);r[x]=Tu(I,E,T,w,_)}return r}};function Tu(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function Mf(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function Sf(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=Tu(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let l=Mf(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var Cn=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=bs(e,this.TimeBufferType),this.values=bs(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:bs(t.times,Array),values:bs(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),kl(t.settings)&&(n.settings={inTangents:bs(t.settings.inTangents,Array),outTangents:bs(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new io(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new no(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new eo(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new so(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case gr:e=this.InterpolantFactoryMethodDiscrete;break;case Ba:e=this.InterpolantFactoryMethodLinear;break;case Aa:e=this.InterpolantFactoryMethodSmooth;break;case Gl:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return ie("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return gr;case this.InterpolantFactoryMethodLinear:return Ba;case this.InterpolantFactoryMethodSmooth:return Aa;case this.InterpolantFactoryMethodBezier:return Gl}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;kl(this.settings)&&(Ch(this.settings.inTangents,t),Ch(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(se("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(se("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){se("KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(a!==null&&a>l){se("KeyframeTrack: Out of order keys.",this,o,l,a),t=!1;break}a=l}if(s!==void 0&&ld(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){se("KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Aa,r=t.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(s)l=!0;else{let p=o*n,u=p-n,d=p+n;for(let x=0;x!==n;++x){let E=e[p+x];if(E!==e[u+x]||E!==e[d+x]){l=!0;break}}}if(l){if(o!==a){t[a]=t[o];let p=o*n,u=a*n;for(let d=0;d!==n;++d)e[u+d]=e[p+d]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)e[l+c]=e[o+c];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,kl(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Ch(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Cn.prototype.ValueTypeName="";Cn.prototype.TimeBufferType=Float32Array;Cn.prototype.ValueBufferType=Float32Array;Cn.prototype.DefaultInterpolation=Ba;var Ri=class extends Cn{constructor(t,e,n){super(t,e,n)}};Ri.prototype.ValueTypeName="bool";Ri.prototype.ValueBufferType=Array;Ri.prototype.DefaultInterpolation=gr;Ri.prototype.InterpolantFactoryMethodLinear=void 0;Ri.prototype.InterpolantFactoryMethodSmooth=void 0;var ro=class extends Cn{constructor(t,e,n,s){super(t,e,n,s)}};ro.prototype.ValueTypeName="color";var ao=class extends Cn{constructor(t,e,n,s){super(t,e,n,s)}};ao.prototype.ValueTypeName="number";var oo=class extends Ci{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-e)/(s-e),c=t*o;for(let h=c+o;c!==h;c+=4)En.slerpFlat(r,0,a,c-o,a,c,l);return r}},Br=class extends Cn{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new oo(this.times,this.values,this.getValueSize(),t)}};Br.prototype.ValueTypeName="quaternion";Br.prototype.InterpolantFactoryMethodSmooth=void 0;var Pi=class extends Cn{constructor(t,e,n){super(t,e,n)}};Pi.prototype.ValueTypeName="string";Pi.prototype.ValueBufferType=Array;Pi.prototype.DefaultInterpolation=gr;Pi.prototype.InterpolantFactoryMethodLinear=void 0;Pi.prototype.InterpolantFactoryMethodSmooth=void 0;var lo=class extends Cn{constructor(t,e,n,s){super(t,e,n,s)}};lo.prototype.ValueTypeName="vector";var co=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,p){return c.push(h,p),this},this.removeHandler=function(h){let p=c.indexOf(h);return p!==-1&&c.splice(p,2),this},this.getHandler=function(h){for(let p=0,u=c.length;p<u;p+=2){let d=c[p],x=c[p+1];if(d.global&&(d.lastIndex=0),d.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},wu=new co,ho=class{constructor(t){this.manager=t!==void 0?t:wu,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};ho.DEFAULT_MATERIAL_NAME="__DEFAULT";var ks=class extends He{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new he(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}},$i=class extends ks{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(He.DEFAULT_UP),this.updateMatrix(),this.groundColor=new he(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}},Vl=new Ae,Rh=new D,Ph=new D,uo=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new _t(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new Ae,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fs,this._frameExtents=new _t(1,1),this._viewportCount=1,this._viewports=[new Fe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Rh.setFromMatrixPosition(t.matrixWorld),e.position.copy(Rh),Ph.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Ph),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){Vl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Vl,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Ps||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(Vl)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Ta=new D,wa=new En,qn=new D,zr=class extends He{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ae,this.projectionMatrix=new Ae,this.projectionMatrixInverse=new Ae,this.coordinateSystem=zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Ta,wa,qn),qn.x===1&&qn.y===1&&qn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ta,wa,qn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Ta,wa,qn),qn.x===1&&qn.y===1&&qn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ta,wa,qn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ei=new D,Ih=new _t,Lh=new _t,$e=class extends zr{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Ls*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(As*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ls*2*Math.atan(Math.tan(As*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ei.x,Ei.y).multiplyScalar(-t/Ei.z),Ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ei.x,Ei.y).multiplyScalar(-t/Ei.z)}getViewSize(t,e){return this.getViewBounds(t,Ih,Lh),e.subVectors(Lh,Ih)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(As*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Vs=class extends zr{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Jl=class extends uo{constructor(){super(new Vs(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ii=class extends ks{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(He.DEFAULT_UP),this.updateMatrix(),this.target=new He,this.shadow=new Jl}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},Ji=class extends ks{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Es=-90,Ts=1,fo=class extends He{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new $e(Es,Ts,t,e);s.layers=this.layers,this.add(s);let r=new $e(Es,Ts,t,e);r.layers=this.layers,this.add(r);let a=new $e(Es,Ts,t,e);a.layers=this.layers,this.add(a);let o=new $e(Es,Ts,t,e);o.layers=this.layers,this.add(o);let l=new $e(Es,Ts,t,e);l.layers=this.layers,this.add(l);let c=new $e(Es,Ts,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(let c of e)this.remove(c);if(t===zn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Ps)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,p=t.getRenderTarget(),u=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let E=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let _=!1;t.isWebGLRenderer===!0?_=t.state.buffers.depth.getReversed():_=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=E,t.setRenderTarget(n,5,s),_&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(p,u,d),t.xr.enabled=x,n.texture.needsPMREMUpdate=!0}},po=class extends $e{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var wc="\\[\\]\\.:\\/",bf=new RegExp("["+wc+"]","g"),Ac="[^"+wc+"]",Ef="[^"+wc.replace("\\.","")+"]",Tf=/((?:WC+[\/:])*)/.source.replace("WC",Ac),wf=/(WCOD+)?/.source.replace("WCOD",Ef),Af=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Ac),Cf=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Ac),Rf=new RegExp("^"+Tf+wf+Af+Cf+"$"),Pf=["material","materials","bones","map"],Kl=class{constructor(t,e,n){let s=n||De.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},De=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(bf,"")}static parseTrackName(t){let e=Rf.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Pf.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let l=n(o.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){ie("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){se("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){se("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){se("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){se("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){se("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){se("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){se("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let a=t[s];if(a===void 0){let c=e.nodeName;se("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){se("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){se("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};De.Composite=Kl;De.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};De.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};De.prototype.GetterByBindingType=[De.prototype._getValue_direct,De.prototype._getValue_array,De.prototype._getValue_arrayElement,De.prototype._getValue_toArray];De.prototype.SetterByBindingTypeAndVersioning=[[De.prototype._setValue_direct,De.prototype._setValue_direct_setNeedsUpdate,De.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[De.prototype._setValue_array,De.prototype._setValue_array_setNeedsUpdate,De.prototype._setValue_array_setMatrixWorldNeedsUpdate],[De.prototype._setValue_arrayElement,De.prototype._setValue_arrayElement_setNeedsUpdate,De.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[De.prototype._setValue_fromArray,De.prototype._setValue_fromArray_setNeedsUpdate,De.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var F_=new Float32Array(1);var Dh=new Ae,Ki=class{constructor(t,e,n=0,s=1/0){this.ray=new Ti(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Ns,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):se("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Dh.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Dh),this}intersectObject(t,e=!0,n=[]){return jl(t,this,n,e),n.sort(Nh),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)jl(t[s],this,n,e);return n.sort(Nh),n}};function Nh(i,t){return i.distance-t.distance}function jl(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let a=0,o=r.length;a<o;a++)jl(r[a],t,e,!0)}}var Gs=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=pe(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(pe(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Dc=class Dc{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};Dc.prototype.isMatrix2=!0;var Ql=Dc;var kr=class extends kn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function Cc(i,t,e,n){let s=If(n);switch(e){case yc:return i*t;case So:return i*t/s.components*s.byteLength;case bo:return i*t/s.components*s.byteLength;case Bi:return i*t*2/s.components*s.byteLength;case Eo:return i*t*2/s.components*s.byteLength;case vc:return i*t*3/s.components*s.byteLength;case Ln:return i*t*4/s.components*s.byteLength;case To:return i*t*4/s.components*s.byteLength;case Wr:case Xr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case qr:case Yr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ao:case Ro:return Math.max(i,16)*Math.max(t,8)/4;case wo:case Co:return Math.max(i,8)*Math.max(t,8)/2;case Po:case Io:case Do:case No:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Lo:case Zr:case Uo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Fo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Oo:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Bo:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case zo:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case ko:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Vo:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Go:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Ho:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Wo:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Xo:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case qo:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Yo:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Zo:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case $o:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Jo:case Ko:case jo:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Qo:case tl:return Math.ceil(i/4)*Math.ceil(t/4)*8;case $r:case el:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function If(i){switch(i){case mn:case mc:return{byteLength:1,components:1};case Xs:case gc:case Wn:return{byteLength:2,components:1};case vo:case Mo:return{byteLength:2,components:4};case Hn:case yo:case In:return{byteLength:4,components:1};case _c:case xc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?ie("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function Zu(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Df(i){let t=new WeakMap;function e(o,l){let c=o.array,h=o.usage,p=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),o.onUploadCallback();let d;if(c instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=i.SHORT;else if(c instanceof Uint32Array)d=i.UNSIGNED_INT;else if(c instanceof Int32Array)d=i.INT;else if(c instanceof Int8Array)d=i.BYTE;else if(c instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:p}}function n(o,l,c){let h=l.array,p=l.updateRanges;if(i.bindBuffer(c,o),p.length===0)i.bufferSubData(c,0,h);else{p.sort((d,x)=>d.start-x.start);let u=0;for(let d=1;d<p.length;d++){let x=p[u],E=p[d];E.start<=x.start+x.count+1?x.count=Math.max(x.count,E.start+E.count-x.start):(++u,p[u]=E)}p.length=u+1;for(let d=0,x=p.length;d<x;d++){let E=p[d];i.bufferSubData(c,E.start*h.BYTES_PER_ELEMENT,h,E.start,E.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Nf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Uf=`#ifdef USE_ALPHAHASH
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
#endif`,Ff=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Of=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,zf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,kf=`#ifdef USE_AOMAP
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
#endif`,Vf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Gf=`#ifdef USE_BATCHING
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
#endif`,Hf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,qf=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Yf=`#ifdef USE_IRIDESCENCE
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
#endif`,Zf=`#ifdef USE_BUMPMAP
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
#endif`,$f=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Jf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Kf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,jf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Qf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,tp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,ep=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,np=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,ip=`#define PI 3.141592653589793
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
} // validated`,sp=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,rp=`vec3 transformedNormal = objectNormal;
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
#endif`,ap=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,op=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,lp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,cp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,hp="gl_FragColor = linearToOutputTexel( gl_FragColor );",up=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,dp=`#ifdef USE_ENVMAP
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
#endif`,fp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,pp=`#ifdef USE_ENVMAP
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
#endif`,mp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,gp=`#ifdef USE_ENVMAP
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
#endif`,_p=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,xp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,yp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,vp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Mp=`#ifdef USE_GRADIENTMAP
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
}`,Sp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,bp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ep=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Tp=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,wp=`#ifdef USE_ENVMAP
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
#endif`,Ap=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Cp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Rp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Pp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ip=`PhysicalMaterial material;
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
#endif`,Lp=`uniform sampler2D dfgLUT;
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
}`,Dp=`
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
#endif`,Np=`#if defined( RE_IndirectDiffuse )
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
#endif`,Up=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Fp=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Op=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Bp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,zp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,kp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Vp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Gp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Hp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Wp=`#if defined( USE_POINTS_UV )
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
#endif`,Xp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,qp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Yp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Zp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,$p=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Jp=`#ifdef USE_MORPHTARGETS
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
#endif`,Kp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,jp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Qp=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,tm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,em=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,nm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,im=`#ifdef USE_NORMALMAP
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
#endif`,sm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,rm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,am=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,om=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,lm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,cm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,hm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,um=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,fm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,pm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,mm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,gm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,_m=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,xm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,ym=`float getShadowMask() {
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
}`,vm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Mm=`#ifdef USE_SKINNING
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
#endif`,Sm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,bm=`#ifdef USE_SKINNING
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
#endif`,Em=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Tm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,wm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Am=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Cm=`#ifdef USE_TRANSMISSION
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
#endif`,Rm=`#ifdef USE_TRANSMISSION
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
#endif`,Pm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Im=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Lm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Dm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Nm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Um=`uniform sampler2D t2D;
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
}`,Fm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Om=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Bm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,zm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,km=`#include <common>
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
}`,Vm=`#if DEPTH_PACKING == 3200
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
}`,Gm=`#define DISTANCE
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
}`,Hm=`#define DISTANCE
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
}`,Wm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Xm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qm=`uniform float scale;
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
}`,Ym=`uniform vec3 diffuse;
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
}`,Zm=`#include <common>
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
}`,$m=`uniform vec3 diffuse;
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
}`,Jm=`#define LAMBERT
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
}`,Km=`#define LAMBERT
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
}`,jm=`#define MATCAP
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
}`,Qm=`#define MATCAP
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
}`,tg=`#define NORMAL
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
}`,eg=`#define NORMAL
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
}`,ng=`#define PHONG
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
}`,ig=`#define PHONG
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
}`,sg=`#define STANDARD
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
}`,rg=`#define STANDARD
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
}`,ag=`#define TOON
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
}`,og=`#define TOON
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
}`,lg=`uniform float size;
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
}`,cg=`uniform vec3 diffuse;
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
}`,hg=`#include <common>
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
}`,ug=`uniform vec3 color;
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
}`,dg=`uniform float rotation;
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
}`,fg=`uniform vec3 diffuse;
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
}`,me={alphahash_fragment:Nf,alphahash_pars_fragment:Uf,alphamap_fragment:Ff,alphamap_pars_fragment:Of,alphatest_fragment:Bf,alphatest_pars_fragment:zf,aomap_fragment:kf,aomap_pars_fragment:Vf,batching_pars_vertex:Gf,batching_vertex:Hf,begin_vertex:Wf,beginnormal_vertex:Xf,bsdfs:qf,iridescence_fragment:Yf,bumpmap_pars_fragment:Zf,clipping_planes_fragment:$f,clipping_planes_pars_fragment:Jf,clipping_planes_pars_vertex:Kf,clipping_planes_vertex:jf,color_fragment:Qf,color_pars_fragment:tp,color_pars_vertex:ep,color_vertex:np,common:ip,cube_uv_reflection_fragment:sp,defaultnormal_vertex:rp,displacementmap_pars_vertex:ap,displacementmap_vertex:op,emissivemap_fragment:lp,emissivemap_pars_fragment:cp,colorspace_fragment:hp,colorspace_pars_fragment:up,envmap_fragment:dp,envmap_common_pars_fragment:fp,envmap_pars_fragment:pp,envmap_pars_vertex:mp,envmap_physical_pars_fragment:wp,envmap_vertex:gp,fog_vertex:_p,fog_pars_vertex:xp,fog_fragment:yp,fog_pars_fragment:vp,gradientmap_pars_fragment:Mp,lightmap_pars_fragment:Sp,lights_lambert_fragment:bp,lights_lambert_pars_fragment:Ep,lights_pars_begin:Tp,lights_toon_fragment:Ap,lights_toon_pars_fragment:Cp,lights_phong_fragment:Rp,lights_phong_pars_fragment:Pp,lights_physical_fragment:Ip,lights_physical_pars_fragment:Lp,lights_fragment_begin:Dp,lights_fragment_maps:Np,lights_fragment_end:Up,lightprobes_pars_fragment:Fp,logdepthbuf_fragment:Op,logdepthbuf_pars_fragment:Bp,logdepthbuf_pars_vertex:zp,logdepthbuf_vertex:kp,map_fragment:Vp,map_pars_fragment:Gp,map_particle_fragment:Hp,map_particle_pars_fragment:Wp,metalnessmap_fragment:Xp,metalnessmap_pars_fragment:qp,morphinstance_vertex:Yp,morphcolor_vertex:Zp,morphnormal_vertex:$p,morphtarget_pars_vertex:Jp,morphtarget_vertex:Kp,normal_fragment_begin:jp,normal_fragment_maps:Qp,normal_pars_fragment:tm,normal_pars_vertex:em,normal_vertex:nm,normalmap_pars_fragment:im,clearcoat_normal_fragment_begin:sm,clearcoat_normal_fragment_maps:rm,clearcoat_pars_fragment:am,iridescence_pars_fragment:om,opaque_fragment:lm,packing:cm,premultiplied_alpha_fragment:hm,project_vertex:um,dithering_fragment:dm,dithering_pars_fragment:fm,roughnessmap_fragment:pm,roughnessmap_pars_fragment:mm,shadowmap_pars_fragment:gm,shadowmap_pars_vertex:_m,shadowmap_vertex:xm,shadowmask_pars_fragment:ym,skinbase_vertex:vm,skinning_pars_vertex:Mm,skinning_vertex:Sm,skinnormal_vertex:bm,specularmap_fragment:Em,specularmap_pars_fragment:Tm,tonemapping_fragment:wm,tonemapping_pars_fragment:Am,transmission_fragment:Cm,transmission_pars_fragment:Rm,uv_pars_fragment:Pm,uv_pars_vertex:Im,uv_vertex:Lm,worldpos_vertex:Dm,background_vert:Nm,background_frag:Um,backgroundCube_vert:Fm,backgroundCube_frag:Om,cube_vert:Bm,cube_frag:zm,depth_vert:km,depth_frag:Vm,distance_vert:Gm,distance_frag:Hm,equirect_vert:Wm,equirect_frag:Xm,linedashed_vert:qm,linedashed_frag:Ym,meshbasic_vert:Zm,meshbasic_frag:$m,meshlambert_vert:Jm,meshlambert_frag:Km,meshmatcap_vert:jm,meshmatcap_frag:Qm,meshnormal_vert:tg,meshnormal_frag:eg,meshphong_vert:ng,meshphong_frag:ig,meshphysical_vert:sg,meshphysical_frag:rg,meshtoon_vert:ag,meshtoon_frag:og,points_vert:lg,points_frag:cg,shadow_vert:hg,shadow_frag:ug,sprite_vert:dg,sprite_frag:fg},It={common:{diffuse:{value:new he(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new le},alphaMap:{value:null},alphaMapTransform:{value:new le},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new le}},envmap:{envMap:{value:null},envMapRotation:{value:new le},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new le}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new le}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new le},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new le},normalScale:{value:new _t(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new le},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new le}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new le}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new le}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new he(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new he(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new le},alphaTest:{value:0},uvTransform:{value:new le}},sprite:{diffuse:{value:new he(16777215)},opacity:{value:1},center:{value:new _t(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new le},alphaMap:{value:null},alphaMapTransform:{value:new le},alphaTest:{value:0}}},ti={basic:{uniforms:an([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.fog]),vertexShader:me.meshbasic_vert,fragmentShader:me.meshbasic_frag},lambert:{uniforms:an([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new he(0)},envMapIntensity:{value:1}}]),vertexShader:me.meshlambert_vert,fragmentShader:me.meshlambert_frag},phong:{uniforms:an([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new he(0)},specular:{value:new he(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:me.meshphong_vert,fragmentShader:me.meshphong_frag},standard:{uniforms:an([It.common,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.roughnessmap,It.metalnessmap,It.fog,It.lights,{emissive:{value:new he(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:me.meshphysical_vert,fragmentShader:me.meshphysical_frag},toon:{uniforms:an([It.common,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.gradientmap,It.fog,It.lights,{emissive:{value:new he(0)}}]),vertexShader:me.meshtoon_vert,fragmentShader:me.meshtoon_frag},matcap:{uniforms:an([It.common,It.bumpmap,It.normalmap,It.displacementmap,It.fog,{matcap:{value:null}}]),vertexShader:me.meshmatcap_vert,fragmentShader:me.meshmatcap_frag},points:{uniforms:an([It.points,It.fog]),vertexShader:me.points_vert,fragmentShader:me.points_frag},dashed:{uniforms:an([It.common,It.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:me.linedashed_vert,fragmentShader:me.linedashed_frag},depth:{uniforms:an([It.common,It.displacementmap]),vertexShader:me.depth_vert,fragmentShader:me.depth_frag},normal:{uniforms:an([It.common,It.bumpmap,It.normalmap,It.displacementmap,{opacity:{value:1}}]),vertexShader:me.meshnormal_vert,fragmentShader:me.meshnormal_frag},sprite:{uniforms:an([It.sprite,It.fog]),vertexShader:me.sprite_vert,fragmentShader:me.sprite_frag},background:{uniforms:{uvTransform:{value:new le},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:me.background_vert,fragmentShader:me.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new le}},vertexShader:me.backgroundCube_vert,fragmentShader:me.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:me.cube_vert,fragmentShader:me.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:me.equirect_vert,fragmentShader:me.equirect_frag},distance:{uniforms:an([It.common,It.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:me.distance_vert,fragmentShader:me.distance_frag},shadow:{uniforms:an([It.lights,It.fog,{color:{value:new he(0)},opacity:{value:1}}]),vertexShader:me.shadow_vert,fragmentShader:me.shadow_frag}};ti.physical={uniforms:an([ti.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new le},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new le},clearcoatNormalScale:{value:new _t(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new le},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new le},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new le},sheen:{value:0},sheenColor:{value:new he(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new le},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new le},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new le},transmissionSamplerSize:{value:new _t},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new le},attenuationDistance:{value:0},attenuationColor:{value:new he(0)},specularColor:{value:new he(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new le},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new le},anisotropyVector:{value:new _t},anisotropyMap:{value:null},anisotropyMapTransform:{value:new le}}]),vertexShader:me.meshphysical_vert,fragmentShader:me.meshphysical_frag};var rl={r:0,b:0,g:0},pg=new Ae,$u=new le;$u.set(-1,0,0,0,1,0,0,0,1);function mg(i,t,e,n,s,r){let a=new he(0),o=s===!0?0:1,l,c,h=null,p=0,u=null;function d(R){let T=R.isScene===!0?R.background:null;if(T&&T.isTexture){let v=R.backgroundBlurriness>0;T=t.get(T,v)}return T}function x(R){let T=!1,v=d(R);v===null?_(a,o):v&&v.isColor&&(_(v,1),T=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?e.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||T)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function E(R,T){let v=d(T);v&&(v.isCubeTexture||v.mapping===Gr)?(c===void 0&&(c=new Ne(new Tn(1,1,1),new An({name:"BackgroundCubeMaterial",uniforms:es(ti.backgroundCube.uniforms),vertexShader:ti.backgroundCube.vertexShader,fragmentShader:ti.backgroundCube.fragmentShader,side:cn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,w,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(pg.makeRotationFromEuler(T.backgroundRotation)).transpose(),v.isCubeTexture&&v.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply($u),c.material.toneMapped=ye.getTransfer(v.colorSpace)!==we,(h!==v||p!==v.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=v,p=v.version,u=i.toneMapping),c.layers.enableAll(),R.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new Ne(new Ai(2,2),new An({name:"BackgroundMaterial",uniforms:es(ti.background.uniforms),vertexShader:ti.background.vertexShader,fragmentShader:ti.background.fragmentShader,side:Ni,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,l.material.toneMapped=ye.getTransfer(v.colorSpace)!==we,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||p!==v.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=v,p=v.version,u=i.toneMapping),l.layers.enableAll(),R.unshift(l,l.geometry,l.material,0,0,null))}function _(R,T){R.getRGB(rl,Tc(i)),e.buffers.color.setClear(rl.r,rl.g,rl.b,T,r)}function f(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(R,T=1){a.set(R),o=T,_(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(R){o=R,_(a,o)},render:x,addToRenderList:E,dispose:f}}function gg(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(U,V,Z,O,H){let Q=!1,nt=p(U,O,Z,V);r!==nt&&(r=nt,c(r.object)),Q=d(U,O,Z,H),Q&&x(U,O,Z,H),H!==null&&t.update(H,i.ELEMENT_ARRAY_BUFFER),(Q||a)&&(a=!1,v(U,V,Z,O),H!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(H).buffer))}function l(){return i.createVertexArray()}function c(U){return i.bindVertexArray(U)}function h(U){return i.deleteVertexArray(U)}function p(U,V,Z,O){let H=O.wireframe===!0,Q=n[V.id];Q===void 0&&(Q={},n[V.id]=Q);let nt=U.isInstancedMesh===!0?U.id:0,ht=Q[nt];ht===void 0&&(ht={},Q[nt]=ht);let tt=ht[Z.id];tt===void 0&&(tt={},ht[Z.id]=tt);let at=tt[H];return at===void 0&&(at=u(l()),tt[H]=at),at}function u(U){let V=[],Z=[],O=[];for(let H=0;H<e;H++)V[H]=0,Z[H]=0,O[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:V,enabledAttributes:Z,attributeDivisors:O,object:U,attributes:{},index:null}}function d(U,V,Z,O){let H=r.attributes,Q=V.attributes,nt=0,ht=Z.getAttributes();for(let tt in ht)if(ht[tt].location>=0){let lt=H[tt],Ot=Q[tt];if(Ot===void 0&&(tt==="instanceMatrix"&&U.instanceMatrix&&(Ot=U.instanceMatrix),tt==="instanceColor"&&U.instanceColor&&(Ot=U.instanceColor)),lt===void 0||lt.attribute!==Ot||Ot&&lt.data!==Ot.data)return!0;nt++}return r.attributesNum!==nt||r.index!==O}function x(U,V,Z,O){let H={},Q=V.attributes,nt=0,ht=Z.getAttributes();for(let tt in ht)if(ht[tt].location>=0){let lt=Q[tt];lt===void 0&&(tt==="instanceMatrix"&&U.instanceMatrix&&(lt=U.instanceMatrix),tt==="instanceColor"&&U.instanceColor&&(lt=U.instanceColor));let Ot={};Ot.attribute=lt,lt&&lt.data&&(Ot.data=lt.data),H[tt]=Ot,nt++}r.attributes=H,r.attributesNum=nt,r.index=O}function E(){let U=r.newAttributes;for(let V=0,Z=U.length;V<Z;V++)U[V]=0}function _(U){f(U,0)}function f(U,V){let Z=r.newAttributes,O=r.enabledAttributes,H=r.attributeDivisors;Z[U]=1,O[U]===0&&(i.enableVertexAttribArray(U),O[U]=1),H[U]!==V&&(i.vertexAttribDivisor(U,V),H[U]=V)}function R(){let U=r.newAttributes,V=r.enabledAttributes;for(let Z=0,O=V.length;Z<O;Z++)V[Z]!==U[Z]&&(i.disableVertexAttribArray(Z),V[Z]=0)}function T(U,V,Z,O,H,Q,nt){nt===!0?i.vertexAttribIPointer(U,V,Z,H,Q):i.vertexAttribPointer(U,V,Z,O,H,Q)}function v(U,V,Z,O){E();let H=O.attributes,Q=Z.getAttributes(),nt=V.defaultAttributeValues;for(let ht in Q){let tt=Q[ht];if(tt.location>=0){let at=H[ht];if(at===void 0&&(ht==="instanceMatrix"&&U.instanceMatrix&&(at=U.instanceMatrix),ht==="instanceColor"&&U.instanceColor&&(at=U.instanceColor)),at!==void 0){let lt=at.normalized,Ot=at.itemSize,yt=t.get(at);if(yt===void 0)continue;let Lt=yt.buffer,Wt=yt.type,ue=yt.bytesPerElement,K=Wt===i.INT||Wt===i.UNSIGNED_INT||at.gpuType===yo;if(at.isInterleavedBufferAttribute){let st=at.data,bt=st.stride,Qt=at.offset;if(st.isInstancedInterleavedBuffer){for(let vt=0;vt<tt.locationSize;vt++)f(tt.location+vt,st.meshPerAttribute);U.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=st.meshPerAttribute*st.count)}else for(let vt=0;vt<tt.locationSize;vt++)_(tt.location+vt);i.bindBuffer(i.ARRAY_BUFFER,Lt);for(let vt=0;vt<tt.locationSize;vt++)T(tt.location+vt,Ot/tt.locationSize,Wt,lt,bt*ue,(Qt+Ot/tt.locationSize*vt)*ue,K)}else{if(at.isInstancedBufferAttribute){for(let st=0;st<tt.locationSize;st++)f(tt.location+st,at.meshPerAttribute);U.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=at.meshPerAttribute*at.count)}else for(let st=0;st<tt.locationSize;st++)_(tt.location+st);i.bindBuffer(i.ARRAY_BUFFER,Lt);for(let st=0;st<tt.locationSize;st++)T(tt.location+st,Ot/tt.locationSize,Wt,lt,Ot*ue,Ot/tt.locationSize*st*ue,K)}}else if(nt!==void 0){let lt=nt[ht];if(lt!==void 0)switch(lt.length){case 2:i.vertexAttrib2fv(tt.location,lt);break;case 3:i.vertexAttrib3fv(tt.location,lt);break;case 4:i.vertexAttrib4fv(tt.location,lt);break;default:i.vertexAttrib1fv(tt.location,lt)}}}}R()}function A(){P();for(let U in n){let V=n[U];for(let Z in V){let O=V[Z];for(let H in O){let Q=O[H];for(let nt in Q)h(Q[nt].object),delete Q[nt];delete O[H]}}delete n[U]}}function w(U){if(n[U.id]===void 0)return;let V=n[U.id];for(let Z in V){let O=V[Z];for(let H in O){let Q=O[H];for(let nt in Q)h(Q[nt].object),delete Q[nt];delete O[H]}}delete n[U.id]}function I(U){for(let V in n){let Z=n[V];for(let O in Z){let H=Z[O];if(H[U.id]===void 0)continue;let Q=H[U.id];for(let nt in Q)h(Q[nt].object),delete Q[nt];delete H[U.id]}}}function y(U){for(let V in n){let Z=n[V],O=U.isInstancedMesh===!0?U.id:0,H=Z[O];if(H!==void 0){for(let Q in H){let nt=H[Q];for(let ht in nt)h(nt[ht].object),delete nt[ht];delete H[Q]}delete Z[O],Object.keys(Z).length===0&&delete n[V]}}}function P(){L(),a=!0,r!==s&&(r=s,c(r.object))}function L(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:P,resetDefaultState:L,dispose:A,releaseStatesOfGeometry:w,releaseStatesOfObject:y,releaseStatesOfProgram:I,initAttributes:E,enableAttribute:_,disableUnusedAttributes:R}}function _g(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let d=0;d<h;d++)u+=c[d];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function xg(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let I=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(I){return!(I!==Ln&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(I){let y=I===Wn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(I!==mn&&I!==In&&!y&&n.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(I){if(I==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(ie("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let p=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&ie("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_TEXTURE_SIZE),_=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),R=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),T=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:p,reversedDepthBuffer:u,maxTextures:d,maxVertexTextures:x,maxTextureSize:E,maxCubemapSize:_,maxAttributes:f,maxVertexUniforms:R,maxVaryings:T,maxFragmentUniforms:v,maxSamples:A,samples:w}}function yg(i){let t=this,e=null,n=0,s=!1,r=!1,a=new Mn,o=new le,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(p,u){let d=p.length!==0||u||n!==0||s;return s=u,n=p.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(p,u){e=h(p,u,0)},this.setState=function(p,u,d){let x=p.clippingPlanes,E=p.clipIntersection,_=p.clipShadows,f=i.get(p);if(!s||x===null||x.length===0||r&&!_)r?h(null):c();else{let R=r?0:n,T=R*4,v=f.clippingState||null;l.value=v,v=h(x,u,T,d);for(let A=0;A!==T;++A)v[A]=e[A];f.clippingState=v,this.numIntersection=E?this.numPlanes:0,this.numPlanes+=R}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(p,u,d,x){let E=p!==null?p.length:0,_=null;if(E!==0){if(_=l.value,x!==!0||_===null){let f=d+E*4,R=u.matrixWorldInverse;o.getNormalMatrix(R),(_===null||_.length<f)&&(_=new Float32Array(f));for(let T=0,v=d;T!==E;++T,v+=4)a.copy(p[T]).applyMatrix4(R,o),a.normal.toArray(_,v),_[v+3]=a.constant}l.value=_,l.needsUpdate=!0}return t.numPlanes=E,t.numIntersection=0,_}}var Zs=4,vg=6,Mg=20,Sg=256,Jr=new Vs,Au=new he,Nc=null,Uc=0,Fc=0,Oc=!1,bg=new D,ns=new D,ol=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=bg}=r;Nc=this._renderer.getRenderTarget(),Uc=this._renderer.getActiveCubeFace(),Fc=this._renderer.getActiveMipmapLevel(),Oc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Pu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ru(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Nc,Uc,Fc),this._renderer.xr.enabled=Oc,t.scissorTest=!1,Ys(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ui||t.mapping===Qi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Nc=this._renderer.getRenderTarget(),Uc=this._renderer.getActiveCubeFace(),Fc=this._renderer.getActiveMipmapLevel(),Oc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:nn,minFilter:nn,generateMipmaps:!1,type:Wn,format:Ln,colorSpace:_r,depthBuffer:!1},s=Cu(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Cu(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Eg(r)),this._blurMaterial=wg(r,t,e),this._ggxMaterial=Tg(r,t,e)}return s}_compileMaterial(t){let e=new Ne(new Be,t);this._renderer.compile(e,Jr)}_sceneToCubeUV(t,e,n,s,r){let l=new $e(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],p=this._renderer,u=p.autoClear,d=p.toneMapping;p.getClearColor(Au),p.toneMapping=Gn,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(s),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ne(new Tn,new fi({name:"PMREM.Background",side:cn,depthWrite:!1,depthTest:!1})));let E=this._backgroundBox,_=E.material,f=!1,R=t.background;R?R.isColor&&(_.color.copy(R),t.background=null,f=!0):(_.color.copy(Au),f=!0);for(let T=0;T<6;T++){let v=T%3;v===0?(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[T],r.y,r.z)):v===1?(l.up.set(0,0,c[T]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[T],r.z)):(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[T]));let A=this._cubeSize;Ys(s,v*A,T>2?A:0,A,A),p.setRenderTarget(s),f&&p.render(E,l),p.render(t,l)}p.toneMapping=d,p.autoClear=u,t.background=R}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===Ui||t.mapping===Qi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Pu()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ru());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=t;let l=this._cubeSize;Ys(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,Jr)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),p=Math.sqrt(c*c-h*h),u=c*1.25,d=p*u,{_lodMax:x}=this,E=this._sizeLods[n],_=3*E*(n>x-Zs?n-x+Zs:0),f=4*(this._cubeSize-E);l.envMap.value=t.texture,l.roughness.value=d,l.mipInt.value=x-e,Ys(r,_,f,3*E,2*E),s.setRenderTarget(r),s.render(o,Jr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-n,Ys(t,_,f,3*E,2*E),s.setRenderTarget(t),s.render(o,Jr)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,s,r){let a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;let c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],p=3*h*(s>this._lodMax-Zs?s-this._lodMax+Zs:0),u=4*(this._cubeSize-h);Ys(e,p,u,3*h,2*h),a.setRenderTarget(e),a.render(l,Jr)}};function Eg(i){let t=[],e=[],n=i,s=i-Zs+1+vg;for(let r=0;r<s;r++){let a=Math.pow(2,n);t.push(a);let o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],p=6,u=6,d=3,x=new Float32Array(d*u*p),E=new Float32Array(d*u*p);for(let f=0;f<p;f++){let R=f%3*2/3-1,T=f>2?0:-1,v=[R,T,0,R+2/3,T,0,R+2/3,T+1,0,R,T,0,R+2/3,T+1,0,R,T+1,0];x.set(v,d*u*f);for(let A=0;A<u;A++){let w=h[A*2]*2-1,I=h[A*2+1]*2-1;f===0?ns.set(1,I,w):f===1?ns.set(-w,1,-I):f===2?ns.set(-w,I,1):f===3?ns.set(-1,I,-w):f===4?ns.set(-w,-1,I):ns.set(w,I,-1),ns.toArray(E,(f*u+A)*d)}}let _=new Be;_.setAttribute("position",new bn(x,d)),_.setAttribute("outputDirection",new bn(E,d)),e.push(new Ne(_,null)),n>Zs&&n--}return{lodMeshes:e,sizeLods:t}}function Cu(i,t,e){let n=new pn(i,t,e);return n.texture.mapping=Gr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ys(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function Tg(i,t,e){return new An({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Sg,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:cl(),fragmentShader:`

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
		`,blending:jn,depthTest:!1,depthWrite:!1})}function wg(i,t,e){return new An({name:"SphericalGaussianBlur",defines:{SAMPLES:Mg,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:cl(),fragmentShader:`

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
		`,blending:jn,depthTest:!1,depthWrite:!1})}function Ru(){return new An({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:cl(),fragmentShader:`

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
		`,blending:jn,depthTest:!1,depthWrite:!1})}function Pu(){return new An({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:cl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:jn,depthTest:!1,depthWrite:!1})}function cl(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var ll=class extends pn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Tr(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Tn(5,5,5),r=new An({name:"CubemapFromEquirect",uniforms:es(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:cn,blending:jn});r.uniforms.tEquirect.value=e;let a=new Ne(s,r),o=e.minFilter;return e.minFilter===Fi&&(e.minFilter=nn),new fo(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}};function Ag(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,d=!1){return u==null?null:d?a(u):r(u)}function r(u){if(u&&u.isTexture){let d=u.mapping;if(d===go||d===_o)if(t.has(u)){let x=t.get(u).texture;return o(x,u.mapping)}else{let x=u.image;if(x&&x.height>0){let E=new ll(x.height);return E.fromEquirectangularTexture(i,u),t.set(u,E),u.addEventListener("dispose",c),o(E.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let d=u.mapping,x=d===go||d===_o,E=d===Ui||d===Qi;if(x||E){let _=e.get(u),f=_!==void 0?_.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==f)return n===null&&(n=new ol(i)),_=x?n.fromEquirectangular(u,_):n.fromCubemap(u,_),_.texture.pmremVersion=u.pmremVersion,e.set(u,_),_.texture;if(_!==void 0)return _.texture;{let R=u.image;return x&&R&&R.height>0||E&&R&&l(R)?(n===null&&(n=new ol(i)),_=x?n.fromEquirectangular(u):n.fromCubemap(u),_.texture.pmremVersion=u.pmremVersion,e.set(u,_),u.addEventListener("dispose",h),_.texture):null}}}return u}function o(u,d){return d===go?u.mapping=Ui:d===_o&&(u.mapping=Qi),u}function l(u){let d=0,x=6;for(let E=0;E<x;E++)u[E]!==void 0&&d++;return d===x}function c(u){let d=u.target;d.removeEventListener("dispose",c);let x=t.get(d);x!==void 0&&(t.delete(d),x.dispose())}function h(u){let d=u.target;d.removeEventListener("dispose",h);let x=e.get(d);x!==void 0&&(e.delete(d),x.dispose())}function p(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:p}}function Cg(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&Xi("WebGLRenderer: "+n+" extension not supported."),s}}}function Rg(i,t,e,n){let s={},r=new WeakMap;function a(p){let u=p.target;u.index!==null&&t.remove(u.index);for(let x in u.attributes)t.remove(u.attributes[x]);u.removeEventListener("dispose",a),delete s[u.id];let d=r.get(u);d&&(t.remove(d),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(p,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,e.memory.geometries++),u}function l(p){let u=p.attributes;for(let d in u)t.update(u[d],i.ARRAY_BUFFER)}function c(p){let u=[],d=p.index,x=p.attributes.position,E=0;if(x===void 0)return;if(d!==null){let R=d.array;E=d.version;for(let T=0,v=R.length;T<v;T+=3){let A=R[T+0],w=R[T+1],I=R[T+2];u.push(A,w,w,I,I,A)}}else{let R=x.array;E=x.version;for(let T=0,v=R.length/3-1;T<v;T+=3){let A=T+0,w=T+1,I=T+2;u.push(A,w,w,I,I,A)}}let _=new(x.count>=65535?Sr:Mr)(u,1);_.version=E;let f=r.get(p);f&&t.remove(f),r.set(p,_)}function h(p){let u=r.get(p);if(u){let d=p.index;d!==null&&u.version<d.version&&c(p)}else c(p);return r.get(p)}return{get:o,update:l,getWireframeAttribute:h}}function Pg(i,t,e){let n;function s(p){n=p}let r,a;function o(p){r=p.type,a=p.bytesPerElement}function l(p,u){i.drawElements(n,u,r,p*a),e.update(u,n,1)}function c(p,u,d){d!==0&&(i.drawElementsInstanced(n,u,r,p*a,d),e.update(u,n,d))}function h(p,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,p,0,d);let E=0;for(let _=0;_<d;_++)E+=u[_];e.update(E,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function Ig(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:se("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function Lg(i,t,e){let n=new WeakMap,s=new Fe;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,p=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==p){let P=function(){I.dispose(),n.delete(o),o.removeEventListener("dispose",P)};u!==void 0&&u.texture.dispose();let d=o.morphAttributes.position!==void 0,x=o.morphAttributes.normal!==void 0,E=o.morphAttributes.color!==void 0,_=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],R=o.morphAttributes.color||[],T=0;d===!0&&(T=1),x===!0&&(T=2),E===!0&&(T=3);let v=o.attributes.position.count*T,A=1;v>t.maxTextureSize&&(A=Math.ceil(v/t.maxTextureSize),v=t.maxTextureSize);let w=new Float32Array(v*A*4*p),I=new vr(w,v,A,p);I.type=In,I.needsUpdate=!0;let y=T*4;for(let L=0;L<p;L++){let U=_[L],V=f[L],Z=R[L],O=v*A*4*L;for(let H=0;H<U.count;H++){let Q=H*y;d===!0&&(s.fromBufferAttribute(U,H),w[O+Q+0]=s.x,w[O+Q+1]=s.y,w[O+Q+2]=s.z,w[O+Q+3]=0),x===!0&&(s.fromBufferAttribute(V,H),w[O+Q+4]=s.x,w[O+Q+5]=s.y,w[O+Q+6]=s.z,w[O+Q+7]=0),E===!0&&(s.fromBufferAttribute(Z,H),w[O+Q+8]=s.x,w[O+Q+9]=s.y,w[O+Q+10]=s.z,w[O+Q+11]=Z.itemSize===4?s.w:1)}}u={count:p,texture:I,size:new _t(v,A)},n.set(o,u),o.addEventListener("dispose",P)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let d=0;for(let E=0;E<c.length;E++)d+=c[E];let x=o.morphTargetsRelative?1:1-d;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function Dg(i,t,e,n,s){let r=new WeakMap;function a(c){let h=s.render.frame,p=c.geometry,u=t.get(c,p);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let d=c.skeleton;r.get(d)!==h&&(d.update(),r.set(d,h))}return u}function o(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var Ng={[oc]:"LINEAR_TONE_MAPPING",[lc]:"REINHARD_TONE_MAPPING",[cc]:"CINEON_TONE_MAPPING",[hc]:"ACES_FILMIC_TONE_MAPPING",[dc]:"AGX_TONE_MAPPING",[fc]:"NEUTRAL_TONE_MAPPING",[uc]:"CUSTOM_TONE_MAPPING"};function Ug(i,t,e,n,s,r){let a=new pn(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new Be;c.setAttribute("position",new ge([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new ge([0,2,0,0,2,0],2));let h=new ja({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),p=new Ne(c,h),u=new Vs(-1,1,1,-1,0,1),d=null,x=null,E=!1,_,f=null,R=[],T=!1;this.setSize=function(v,A){a.setSize(v,A),o!==null&&o.setSize(v,A),l!==null&&l.setSize(v,A);for(let w=0;w<R.length;w++){let I=R[w];I.setSize&&I.setSize(v,A)}},this.setEffects=function(v){R=v,T=R.length>0&&R[0].isRenderPass===!0;let A=a.width,w=a.height;R.length>0&&o===null&&(o=new pn(A,w,{type:Wn,depthBuffer:!1,stencilBuffer:!1}),l=new pn(A,w,{type:Wn,depthBuffer:!1,stencilBuffer:!1}));for(let I=0;I<R.length;I++){let y=R[I];y.setSize&&y.setSize(A,w)}},this.begin=function(v,A){if(E||v.toneMapping===Gn&&R.length===0)return!1;if(f=A,A!==null){let w=A.width,I=A.height;(a.width!==w||a.height!==I)&&this.setSize(w,I)}return T===!1&&v.setRenderTarget(a),_=v.toneMapping,v.toneMapping=Gn,!0},this.hasRenderPass=function(){return T},this.end=function(v,A){v.toneMapping=_,E=!0;let w=a,I=o;for(let y=0;y<R.length;y++){let P=R[y];P.enabled!==!1&&(P.render(v,I,w,A),P.needsSwap!==!1&&(w=I,I=I===o?l:o))}if(d!==v.outputColorSpace||x!==v.toneMapping){d=v.outputColorSpace,x=v.toneMapping,h.defines={},ye.getTransfer(d)===we&&(h.defines.SRGB_TRANSFER="");let y=Ng[x];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=w.texture,v.setRenderTarget(f),v.render(p,u),f=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var Ju=new fn,kc=new wi(1,1),Ku=new vr,ju=new Va,Qu=new Tr,Iu=[],Lu=[],Du=new Float32Array(16),Nu=new Float32Array(9),Uu=new Float32Array(4);function Ks(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Iu[s];if(r===void 0&&(r=new Float32Array(s),Iu[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function We(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Xe(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function hl(i,t){let e=Lu[t];e===void 0&&(e=new Int32Array(t),Lu[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Fg(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Og(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(We(e,t))return;i.uniform2fv(this.addr,t),Xe(e,t)}}function Bg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(We(e,t))return;i.uniform3fv(this.addr,t),Xe(e,t)}}function zg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(We(e,t))return;i.uniform4fv(this.addr,t),Xe(e,t)}}function kg(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(We(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Xe(e,t)}else{if(We(e,n))return;Uu.set(n),i.uniformMatrix2fv(this.addr,!1,Uu),Xe(e,n)}}function Vg(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(We(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Xe(e,t)}else{if(We(e,n))return;Nu.set(n),i.uniformMatrix3fv(this.addr,!1,Nu),Xe(e,n)}}function Gg(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(We(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Xe(e,t)}else{if(We(e,n))return;Du.set(n),i.uniformMatrix4fv(this.addr,!1,Du),Xe(e,n)}}function Hg(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Wg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(We(e,t))return;i.uniform2iv(this.addr,t),Xe(e,t)}}function Xg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(We(e,t))return;i.uniform3iv(this.addr,t),Xe(e,t)}}function qg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(We(e,t))return;i.uniform4iv(this.addr,t),Xe(e,t)}}function Yg(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function Zg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(We(e,t))return;i.uniform2uiv(this.addr,t),Xe(e,t)}}function $g(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(We(e,t))return;i.uniform3uiv(this.addr,t),Xe(e,t)}}function Jg(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(We(e,t))return;i.uniform4uiv(this.addr,t),Xe(e,t)}}function Kg(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(kc.compareFunction=e.isReversedDepthBuffer()?sl:il,r=kc):r=Ju,e.setTexture2D(t||r,s)}function jg(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||ju,s)}function Qg(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||Qu,s)}function t0(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Ku,s)}function e0(i){switch(i){case 5126:return Fg;case 35664:return Og;case 35665:return Bg;case 35666:return zg;case 35674:return kg;case 35675:return Vg;case 35676:return Gg;case 5124:case 35670:return Hg;case 35667:case 35671:return Wg;case 35668:case 35672:return Xg;case 35669:case 35673:return qg;case 5125:return Yg;case 36294:return Zg;case 36295:return $g;case 36296:return Jg;case 35678:case 36198:case 36298:case 36306:case 35682:return Kg;case 35679:case 36299:case 36307:return jg;case 35680:case 36300:case 36308:case 36293:return Qg;case 36289:case 36303:case 36311:case 36292:return t0}}function n0(i,t){i.uniform1fv(this.addr,t)}function i0(i,t){let e=Ks(t,this.size,2);i.uniform2fv(this.addr,e)}function s0(i,t){let e=Ks(t,this.size,3);i.uniform3fv(this.addr,e)}function r0(i,t){let e=Ks(t,this.size,4);i.uniform4fv(this.addr,e)}function a0(i,t){let e=Ks(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function o0(i,t){let e=Ks(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function l0(i,t){let e=Ks(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function c0(i,t){i.uniform1iv(this.addr,t)}function h0(i,t){i.uniform2iv(this.addr,t)}function u0(i,t){i.uniform3iv(this.addr,t)}function d0(i,t){i.uniform4iv(this.addr,t)}function f0(i,t){i.uniform1uiv(this.addr,t)}function p0(i,t){i.uniform2uiv(this.addr,t)}function m0(i,t){i.uniform3uiv(this.addr,t)}function g0(i,t){i.uniform4uiv(this.addr,t)}function _0(i,t,e){let n=this.cache,s=t.length,r=hl(e,s);We(n,r)||(i.uniform1iv(this.addr,r),Xe(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=kc:a=Ju;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function x0(i,t,e){let n=this.cache,s=t.length,r=hl(e,s);We(n,r)||(i.uniform1iv(this.addr,r),Xe(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||ju,r[a])}function y0(i,t,e){let n=this.cache,s=t.length,r=hl(e,s);We(n,r)||(i.uniform1iv(this.addr,r),Xe(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||Qu,r[a])}function v0(i,t,e){let n=this.cache,s=t.length,r=hl(e,s);We(n,r)||(i.uniform1iv(this.addr,r),Xe(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Ku,r[a])}function M0(i){switch(i){case 5126:return n0;case 35664:return i0;case 35665:return s0;case 35666:return r0;case 35674:return a0;case 35675:return o0;case 35676:return l0;case 5124:case 35670:return c0;case 35667:case 35671:return h0;case 35668:case 35672:return u0;case 35669:case 35673:return d0;case 5125:return f0;case 36294:return p0;case 36295:return m0;case 36296:return g0;case 35678:case 36198:case 36298:case 36306:case 35682:return _0;case 35679:case 36299:case 36307:return x0;case 35680:case 36300:case 36308:case 36293:return y0;case 36289:case 36303:case 36311:case 36292:return v0}}var Vc=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=e0(e.type)}},Gc=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=M0(e.type)}},Hc=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},Bc=/(\w+)(\])?(\[|\.)?/g;function Fu(i,t){i.seq.push(t),i.map[t.id]=t}function S0(i,t,e){let n=i.name,s=n.length;for(Bc.lastIndex=0;;){let r=Bc.exec(n),a=Bc.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){Fu(e,c===void 0?new Vc(o,i,t):new Gc(o,i,t));break}else{let p=e.map[o];p===void 0&&(p=new Hc(o),Fu(e,p)),e=p}}}var $s=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);S0(o,l,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function Ou(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var b0=37297,E0=0;function T0(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var Bu=new le;function w0(i){ye._getMatrix(Bu,ye.workingColorSpace,i);let t=`mat3( ${Bu.elements.map(e=>e.toFixed(4))} )`;switch(ye.getTransfer(i)){case xr:return[t,"LinearTransferOETF"];case we:return[t,"sRGBTransferOETF"];default:return ie("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function zu(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+T0(i.getShaderSource(t),o)}else return r}function A0(i,t){let e=w0(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var C0={[oc]:"Linear",[lc]:"Reinhard",[cc]:"Cineon",[hc]:"ACESFilmic",[dc]:"AgX",[fc]:"Neutral",[uc]:"Custom"};function R0(i,t){let e=C0[t];return e===void 0?(ie("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var al=new D;function P0(){ye.getLuminanceCoefficients(al);let i=al.x.toFixed(4),t=al.y.toFixed(4),e=al.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function I0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(jr).join(`
`)}function L0(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function D0(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function jr(i){return i!==""}function ku(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Vu(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var N0=/^[ \t]*#include +<([\w\d./]+)>/gm;function Wc(i){return i.replace(N0,F0)}var U0=new Map;function F0(i,t){let e=me[t];if(e===void 0){let n=U0.get(t);if(n!==void 0)e=me[n],ie('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Wc(e)}var O0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Gu(i){return i.replace(O0,B0)}function B0(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Hu(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}var z0={[Vr]:"SHADOWMAP_TYPE_PCF",[Hs]:"SHADOWMAP_TYPE_VSM"};function k0(i){return z0[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var V0={[Ui]:"ENVMAP_TYPE_CUBE",[Qi]:"ENVMAP_TYPE_CUBE",[Gr]:"ENVMAP_TYPE_CUBE_UV"};function G0(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":V0[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var H0={[Qi]:"ENVMAP_MODE_REFRACTION"};function W0(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":H0[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var X0={[ac]:"ENVMAP_BLENDING_MULTIPLY",[nu]:"ENVMAP_BLENDING_MIX",[iu]:"ENVMAP_BLENDING_ADD"};function q0(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":X0[i.combine]||"ENVMAP_BLENDING_NONE"}function Y0(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Z0(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,l=k0(e),c=G0(e),h=W0(e),p=q0(e),u=Y0(e),d=I0(e),x=L0(r),E=s.createProgram(),_,f,R=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(_=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(jr).join(`
`),_.length>0&&(_+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(jr).join(`
`),f.length>0&&(f+=`
`)):(_=[Hu(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(jr).join(`
`),f=[Hu(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+p:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Gn?"#define TONE_MAPPING":"",e.toneMapping!==Gn?me.tonemapping_pars_fragment:"",e.toneMapping!==Gn?R0("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",me.colorspace_pars_fragment,A0("linearToOutputTexel",e.outputColorSpace),P0(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(jr).join(`
`)),a=Wc(a),a=ku(a,e),a=Vu(a,e),o=Wc(o),o=ku(o,e),o=Vu(o,e),a=Gu(a),o=Gu(o),e.isRawShaderMaterial!==!0&&(R=`#version 300 es
`,_=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,f=["#define varying in",e.glslVersion===Mc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Mc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);let T=R+_+a,v=R+f+o,A=Ou(s,s.VERTEX_SHADER,T),w=Ou(s,s.FRAGMENT_SHADER,v);s.attachShader(E,A),s.attachShader(E,w),e.index0AttributeName!==void 0?s.bindAttribLocation(E,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(E,0,"position"),s.linkProgram(E);function I(U){if(i.debug.checkShaderErrors){let V=s.getProgramInfoLog(E)||"",Z=s.getShaderInfoLog(A)||"",O=s.getShaderInfoLog(w)||"",H=V.trim(),Q=Z.trim(),nt=O.trim(),ht=!0,tt=!0;if(s.getProgramParameter(E,s.LINK_STATUS)===!1)if(ht=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,E,A,w);else{let at=zu(s,A,"vertex"),lt=zu(s,w,"fragment");se("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(E,s.VALIDATE_STATUS)+`

Material Name: `+U.name+`
Material Type: `+U.type+`

Program Info Log: `+H+`
`+at+`
`+lt)}else H!==""?ie("WebGLProgram: Program Info Log:",H):(Q===""||nt==="")&&(tt=!1);tt&&(U.diagnostics={runnable:ht,programLog:H,vertexShader:{log:Q,prefix:_},fragmentShader:{log:nt,prefix:f}})}s.deleteShader(A),s.deleteShader(w),y=new $s(s,E),P=D0(s,E)}let y;this.getUniforms=function(){return y===void 0&&I(this),y};let P;this.getAttributes=function(){return P===void 0&&I(this),P};let L=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=s.getProgramParameter(E,b0)),L},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(E),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=E0++,this.cacheKey=t,this.usedTimes=1,this.program=E,this.vertexShader=A,this.fragmentShader=w,this}var $0=0,Xc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new qc(t),e.set(t,n)),n}},qc=class{constructor(t){this.id=$0++,this.code=t,this.usedTimes=0}};function J0(i){return i===Bi||i===Zr||i===$r}function K0(i,t,e,n,s,r){let a=new Ns,o=new Xc,l=new Set,c=[],h=new Map,p=n.logarithmicDepthBuffer,u=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return l.add(y),y===0?"uv":`uv${y}`}function E(y,P,L,U,V,Z){let O=U.fog,H=V.geometry,Q=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?U.environment:null,nt=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,ht=t.get(y.envMap||Q,nt),tt=ht&&ht.mapping===Gr?ht.image.height:null,at=d[y.type];y.precision!==null&&(u=n.getMaxPrecision(y.precision),u!==y.precision&&ie("WebGLProgram.getParameters:",y.precision,"not supported, using",u,"instead."));let lt=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,Ot=lt!==void 0?lt.length:0,yt=0;H.morphAttributes.position!==void 0&&(yt=1),H.morphAttributes.normal!==void 0&&(yt=2),H.morphAttributes.color!==void 0&&(yt=3);let Lt,Wt,ue,K;if(at){let Re=ti[at];Lt=Re.vertexShader,Wt=Re.fragmentShader}else{Lt=y.vertexShader,Wt=y.fragmentShader;let Re=o.getVertexShaderStage(y),Ee=o.getFragmentShaderStage(y);o.update(y,Re,Ee),ue=Re.id,K=Ee.id}let st=i.getRenderTarget(),bt=i.state.buffers.depth.getReversed(),Qt=V.isInstancedMesh===!0,vt=V.isBatchedMesh===!0,Vt=!!y.map,Me=!!y.matcap,ot=!!ht,mt=!!y.aoMap,ct=!!y.lightMap,pt=!!y.bumpMap&&y.wireframe===!1,ut=!!y.normalMap,Kt=!!y.displacementMap,Bt=!!y.emissiveMap,jt=!!y.metalnessMap,re=!!y.roughnessMap,N=y.anisotropy>0,xe=y.clearcoat>0,q=y.dispersion>0,M=y.retroreflectivity>0,m=y.iridescence>0,F=y.sheen>0,W=y.transmission>0,k=N&&!!y.anisotropyMap,ft=xe&&!!y.clearcoatMap,gt=xe&&!!y.clearcoatNormalMap,$=xe&&!!y.clearcoatRoughnessMap,it=m&&!!y.iridescenceMap,wt=m&&!!y.iridescenceThicknessMap,Xt=F&&!!y.sheenColorMap,At=F&&!!y.sheenRoughnessMap,Tt=!!y.specularMap,Yt=!!y.specularColorMap,Jt=!!y.specularIntensityMap,ce=W&&!!y.transmissionMap,z=W&&!!y.thicknessMap,Et=!!y.gradientMap,rt=!!y.alphaMap,St=y.alphaTest>0,Pt=!!y.alphaHash,dt=!!y.extensions,qt=Gn;y.toneMapped&&(st===null||st.isXRRenderTarget===!0)&&(qt=i.toneMapping);let Ht={shaderID:at,shaderType:y.type,shaderName:y.name,vertexShader:Lt,fragmentShader:Wt,defines:y.defines,customVertexShaderID:ue,customFragmentShaderID:K,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:u,batching:vt,batchingColor:vt&&V._colorsTexture!==null,instancing:Qt,instancingColor:Qt&&V.instanceColor!==null,instancingMorph:Qt&&V.morphTexture!==null,outputColorSpace:st===null?i.outputColorSpace:st.isXRRenderTarget===!0?st.texture.colorSpace:ye.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:Vt,matcap:Me,envMap:ot,envMapMode:ot&&ht.mapping,envMapCubeUVHeight:tt,aoMap:mt,lightMap:ct,bumpMap:pt,normalMap:ut,displacementMap:Kt,emissiveMap:Bt,normalMapObjectSpace:ut&&y.normalMapType===au,normalMapTangentSpace:ut&&y.normalMapType===nl,packedNormalMap:ut&&y.normalMapType===nl&&J0(y.normalMap.format),metalnessMap:jt,roughnessMap:re,anisotropy:N,anisotropyMap:k,clearcoat:xe,clearcoatMap:ft,clearcoatNormalMap:gt,clearcoatRoughnessMap:$,dispersion:q,retroreflection:M,iridescence:m,iridescenceMap:it,iridescenceThicknessMap:wt,sheen:F,sheenColorMap:Xt,sheenRoughnessMap:At,specularMap:Tt,specularColorMap:Yt,specularIntensityMap:Jt,transmission:W,transmissionMap:ce,thicknessMap:z,gradientMap:Et,opaque:y.transparent===!1&&y.blending===Ws&&y.alphaToCoverage===!1,alphaMap:rt,alphaTest:St,alphaHash:Pt,combine:y.combine,mapUv:Vt&&x(y.map.channel),aoMapUv:mt&&x(y.aoMap.channel),lightMapUv:ct&&x(y.lightMap.channel),bumpMapUv:pt&&x(y.bumpMap.channel),normalMapUv:ut&&x(y.normalMap.channel),displacementMapUv:Kt&&x(y.displacementMap.channel),emissiveMapUv:Bt&&x(y.emissiveMap.channel),metalnessMapUv:jt&&x(y.metalnessMap.channel),roughnessMapUv:re&&x(y.roughnessMap.channel),anisotropyMapUv:k&&x(y.anisotropyMap.channel),clearcoatMapUv:ft&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:gt&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:$&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:it&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:wt&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:Xt&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:At&&x(y.sheenRoughnessMap.channel),specularMapUv:Tt&&x(y.specularMap.channel),specularColorMapUv:Yt&&x(y.specularColorMap.channel),specularIntensityMapUv:Jt&&x(y.specularIntensityMap.channel),transmissionMapUv:ce&&x(y.transmissionMap.channel),thicknessMapUv:z&&x(y.thicknessMap.channel),alphaMapUv:rt&&x(y.alphaMap.channel),vertexTangents:!!H.attributes.tangent&&(ut||N),vertexNormals:!!H.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!H.attributes.uv&&(Vt||rt),fog:!!O,useFog:y.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||H.attributes.normal===void 0&&ut===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:bt,skinning:V.isSkinnedMesh===!0,hasPositionAttribute:H.attributes.position!==void 0,morphTargets:H.morphAttributes.position!==void 0,morphNormals:H.morphAttributes.normal!==void 0,morphColors:H.morphAttributes.color!==void 0,morphTargetsCount:Ot,morphTextureStride:yt,numSunLights:P.sun.length,numDirLights:P.directional.length,numPointLights:P.point.length,numSpotLights:P.spot.length,numSpotLightMaps:P.spotLightMap.length,numRectAreaLights:P.rectArea.length,numHemiLights:P.hemi.length,numSunLightShadows:P.sunShadowMap.length,numDirLightShadows:P.directionalShadowMap.length,numPointLightShadows:P.pointShadowMap.length,numSpotLightShadows:P.spotShadowMap.length,numSpotLightShadowsWithMaps:P.numSpotLightShadowsWithMaps,numLightProbes:P.numLightProbes,numLightProbeGrids:Z.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:qt,decodeVideoTexture:Vt&&y.map.isVideoTexture===!0&&ye.getTransfer(y.map.colorSpace)===we,decodeVideoTextureEmissive:Bt&&y.emissiveMap.isVideoTexture===!0&&ye.getTransfer(y.emissiveMap.colorSpace)===we,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===je,flipSided:y.side===cn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:dt&&y.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(dt&&y.extensions.multiDraw===!0||vt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Ht.vertexUv1s=l.has(1),Ht.vertexUv2s=l.has(2),Ht.vertexUv3s=l.has(3),l.clear(),Ht}function _(y){let P=[];if(y.shaderID?P.push(y.shaderID):(P.push(y.customVertexShaderID),P.push(y.customFragmentShaderID)),y.defines!==void 0)for(let L in y.defines)P.push(L),P.push(y.defines[L]);return y.isRawShaderMaterial===!1&&(f(P,y),R(P,y),P.push(i.outputColorSpace)),P.push(y.customProgramCacheKey),P.join()}function f(y,P){y.push(P.precision),y.push(P.outputColorSpace),y.push(P.envMapMode),y.push(P.envMapCubeUVHeight),y.push(P.mapUv),y.push(P.alphaMapUv),y.push(P.lightMapUv),y.push(P.aoMapUv),y.push(P.bumpMapUv),y.push(P.normalMapUv),y.push(P.displacementMapUv),y.push(P.emissiveMapUv),y.push(P.metalnessMapUv),y.push(P.roughnessMapUv),y.push(P.anisotropyMapUv),y.push(P.clearcoatMapUv),y.push(P.clearcoatNormalMapUv),y.push(P.clearcoatRoughnessMapUv),y.push(P.iridescenceMapUv),y.push(P.iridescenceThicknessMapUv),y.push(P.sheenColorMapUv),y.push(P.sheenRoughnessMapUv),y.push(P.specularMapUv),y.push(P.specularColorMapUv),y.push(P.specularIntensityMapUv),y.push(P.transmissionMapUv),y.push(P.thicknessMapUv),y.push(P.combine),y.push(P.fogExp2),y.push(P.sizeAttenuation),y.push(P.morphTargetsCount),y.push(P.morphAttributeCount),y.push(P.numSunLights),y.push(P.numDirLights),y.push(P.numPointLights),y.push(P.numSpotLights),y.push(P.numSpotLightMaps),y.push(P.numHemiLights),y.push(P.numRectAreaLights),y.push(P.numSunLightShadows),y.push(P.numDirLightShadows),y.push(P.numPointLightShadows),y.push(P.numSpotLightShadows),y.push(P.numSpotLightShadowsWithMaps),y.push(P.numLightProbes),y.push(P.shadowMapType),y.push(P.toneMapping),y.push(P.numClippingPlanes),y.push(P.numClipIntersection),y.push(P.depthPacking)}function R(y,P){a.disableAll(),P.instancing&&a.enable(0),P.instancingColor&&a.enable(1),P.instancingMorph&&a.enable(2),P.matcap&&a.enable(3),P.envMap&&a.enable(4),P.normalMapObjectSpace&&a.enable(5),P.normalMapTangentSpace&&a.enable(6),P.clearcoat&&a.enable(7),P.iridescence&&a.enable(8),P.alphaTest&&a.enable(9),P.vertexColors&&a.enable(10),P.vertexAlphas&&a.enable(11),P.vertexUv1s&&a.enable(12),P.vertexUv2s&&a.enable(13),P.vertexUv3s&&a.enable(14),P.vertexTangents&&a.enable(15),P.anisotropy&&a.enable(16),P.alphaHash&&a.enable(17),P.batching&&a.enable(18),P.dispersion&&a.enable(19),P.retroreflection&&a.enable(24),P.batchingColor&&a.enable(20),P.gradientMap&&a.enable(21),P.packedNormalMap&&a.enable(22),P.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),P.fog&&a.enable(0),P.useFog&&a.enable(1),P.flatShading&&a.enable(2),P.logarithmicDepthBuffer&&a.enable(3),P.reversedDepthBuffer&&a.enable(4),P.skinning&&a.enable(5),P.morphTargets&&a.enable(6),P.morphNormals&&a.enable(7),P.morphColors&&a.enable(8),P.premultipliedAlpha&&a.enable(9),P.shadowMapEnabled&&a.enable(10),P.doubleSided&&a.enable(11),P.flipSided&&a.enable(12),P.useDepthPacking&&a.enable(13),P.dithering&&a.enable(14),P.transmission&&a.enable(15),P.sheen&&a.enable(16),P.opaque&&a.enable(17),P.pointsUvs&&a.enable(18),P.decodeVideoTexture&&a.enable(19),P.decodeVideoTextureEmissive&&a.enable(20),P.alphaToCoverage&&a.enable(21),P.numLightProbeGrids>0&&a.enable(22),P.hasPositionAttribute&&a.enable(23),y.push(a.mask)}function T(y){let P=d[y.type],L;if(P){let U=ti[P];L=Eu.clone(U.uniforms)}else L=y.uniforms;return L}function v(y,P){let L=h.get(P);return L!==void 0?++L.usedTimes:(L=new Z0(i,P,y,s),c.push(L),h.set(P,L)),L}function A(y){if(--y.usedTimes===0){let P=c.indexOf(y);c[P]=c[c.length-1],c.pop(),h.delete(y.cacheKey),y.destroy()}}function w(y){o.remove(y)}function I(){o.dispose()}return{getParameters:E,getProgramCacheKey:_,getUniforms:T,acquireProgram:v,releaseProgram:A,releaseShaderCache:w,programs:c,dispose:I}}function j0(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Q0(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function Wu(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function Xu(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function o(u,d,x,E,_,f){let R=i[t];return R===void 0?(R={id:u.id,object:u,geometry:d,material:x,materialVariant:a(u),groupOrder:E,renderOrder:u.renderOrder,z:_,group:f},i[t]=R):(R.id=u.id,R.object=u,R.geometry=d,R.material=x,R.materialVariant=a(u),R.groupOrder=E,R.renderOrder=u.renderOrder,R.z=_,R.group=f),t++,R}function l(u,d,x,E,_,f,R){R.reversedDepth===!0&&(_=-_);let T=o(u,d,x,E,_,f);x.transmission>0?n.push(T):x.transparent===!0?s.push(T):e.push(T)}function c(u,d,x,E,_,f){let R=o(u,d,x,E,_,f);x.transmission>0?n.unshift(R):x.transparent===!0?s.unshift(R):e.unshift(R)}function h(u,d){e.length>1&&e.sort(u||Q0),n.length>1&&n.sort(d||Wu),s.length>1&&s.sort(d||Wu)}function p(){for(let u=t,d=i.length;u<d;u++){let x=i[u];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:p,sort:h}}function t_(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new Xu,i.set(n,[a])):s>=r.length?(a=new Xu,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function e_(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new he};break;case"SpotLight":e={position:new D,direction:new D,color:new he,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new he,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new he,groundColor:new he};break;case"RectAreaLight":e={color:new he,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function n_(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _t};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _t};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _t,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var i_=0;function s_(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function r_(i){let t=new e_,e=n_(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);let s=new D,r=new Ae,a=new Ae;function o(c){let h=0,p=0,u=0;for(let V=0;V<9;V++)n.probe[V].set(0,0,0);let d=0,x=0,E=0,_=0,f=0,R=0,T=0,v=0,A=0,w=0,I=0,y=0,P=0,L=0;c.sort(s_);for(let V=0,Z=c.length;V<Z;V++){let O=c[V],H=O.color,Q=O.intensity,nt=O.distance,ht=null;if(O.shadow&&O.shadow.map&&(O.shadow.map.texture.format===Bi?ht=O.shadow.map.texture:ht=O.shadow.map.depthTexture||O.shadow.map.texture),O.isAmbientLight)h+=H.r*Q,p+=H.g*Q,u+=H.b*Q;else if(O.isLightProbe){for(let tt=0;tt<9;tt++)n.probe[tt].addScaledVector(O.sh.coefficients[tt],Q);L++}else if(O.isSunLight){let tt=t.get(O);if(tt.color.copy(O.color).multiplyScalar(O.intensity),O.castShadow){let at=O.shadow,lt=e.get(O);lt.shadowIntensity=at.intensity,lt.shadowBias=at.bias,lt.shadowNormalBias=at.normalBias,lt.shadowRadius=at.radius,lt.shadowMapSize.copy(at.mapSize).multiply(at.getFrameExtents()),n.sunShadow[x]=lt,n.sunShadowMap[x]=ht;let Ot=at.getViewportCount();for(let yt=0;yt<Ot;yt++)n.sunShadowMatrix[E+yt]=at.getMatrix(yt),n.sunShadowCascade[E+yt]=at._cascadeData[yt];E+=Ot,x++}n.sun[d]=tt,d++}else if(O.isDirectionalLight){let tt=t.get(O);if(tt.color.copy(O.color).multiplyScalar(O.intensity),O.castShadow){let at=O.shadow,lt=e.get(O);lt.shadowIntensity=at.intensity,lt.shadowBias=at.bias,lt.shadowNormalBias=at.normalBias,lt.shadowRadius=at.radius,lt.shadowMapSize=at.mapSize,n.directionalShadow[_]=lt,n.directionalShadowMap[_]=ht,n.directionalShadowMatrix[_]=O.shadow.matrix,A++}n.directional[_]=tt,_++}else if(O.isSpotLight){let tt=t.get(O);tt.position.setFromMatrixPosition(O.matrixWorld),tt.color.copy(H).multiplyScalar(Q),tt.distance=nt,tt.coneCos=Math.cos(O.angle),tt.penumbraCos=Math.cos(O.angle*(1-O.penumbra)),tt.decay=O.decay,n.spot[R]=tt;let at=O.shadow;if(O.map&&(n.spotLightMap[y]=O.map,y++,at.updateMatrices(O),O.castShadow&&P++),n.spotLightMatrix[R]=at.matrix,O.castShadow){let lt=e.get(O);lt.shadowIntensity=at.intensity,lt.shadowBias=at.bias,lt.shadowNormalBias=at.normalBias,lt.shadowRadius=at.radius,lt.shadowMapSize=at.mapSize,n.spotShadow[R]=lt,n.spotShadowMap[R]=ht,I++}R++}else if(O.isRectAreaLight){let tt=t.get(O);tt.color.copy(H).multiplyScalar(Q),tt.halfWidth.set(O.width*.5,0,0),tt.halfHeight.set(0,O.height*.5,0),n.rectArea[T]=tt,T++}else if(O.isPointLight){let tt=t.get(O);if(tt.color.copy(O.color).multiplyScalar(O.intensity),tt.distance=O.distance,tt.decay=O.decay,O.castShadow){let at=O.shadow,lt=e.get(O);lt.shadowIntensity=at.intensity,lt.shadowBias=at.bias,lt.shadowNormalBias=at.normalBias,lt.shadowRadius=at.radius,lt.shadowMapSize=at.mapSize,lt.shadowCameraNear=at.camera.near,lt.shadowCameraFar=at.camera.far,n.pointShadow[f]=lt,n.pointShadowMap[f]=ht,n.pointShadowMatrix[f]=O.shadow.matrix,w++}n.point[f]=tt,f++}else if(O.isHemisphereLight){let tt=t.get(O);tt.skyColor.copy(O.color).multiplyScalar(Q),tt.groundColor.copy(O.groundColor).multiplyScalar(Q),n.hemi[v]=tt,v++}}T>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=It.LTC_FLOAT_1,n.rectAreaLTC2=It.LTC_FLOAT_2):(n.rectAreaLTC1=It.LTC_HALF_1,n.rectAreaLTC2=It.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=p,n.ambient[2]=u;let U=n.hash;(U.sunLength!==d||U.directionalLength!==_||U.pointLength!==f||U.spotLength!==R||U.rectAreaLength!==T||U.hemiLength!==v||U.numSunShadows!==x||U.numDirectionalShadows!==A||U.numPointShadows!==w||U.numSpotShadows!==I||U.numSpotMaps!==y||U.numLightProbes!==L)&&(n.sun.length=d,n.directional.length=_,n.spot.length=R,n.rectArea.length=T,n.point.length=f,n.hemi.length=v,n.sunShadow.length=x,n.sunShadowMap.length=x,n.sunShadowMatrix.length=E,n.sunShadowCascade.length=E,n.directionalShadow.length=A,n.directionalShadowMap.length=A,n.directionalShadowMatrix.length=A,n.pointShadow.length=w,n.pointShadowMap.length=w,n.pointShadowMatrix.length=w,n.spotShadow.length=I,n.spotShadowMap.length=I,n.spotLightMatrix.length=I+y-P,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=P,n.numLightProbes=L,U.sunLength=d,U.directionalLength=_,U.pointLength=f,U.spotLength=R,U.rectAreaLength=T,U.hemiLength=v,U.numSunShadows=x,U.numDirectionalShadows=A,U.numPointShadows=w,U.numSpotShadows=I,U.numSpotMaps=y,U.numLightProbes=L,n.version=i_++)}function l(c,h){let p=0,u=0,d=0,x=0,E=0,_=0,f=h.matrixWorldInverse;for(let R=0,T=c.length;R<T;R++){let v=c[R];if(v.isSunLight){let A=n.sun[p];A.direction.setFromMatrixPosition(v.matrixWorld),A.direction.transformDirection(f),p++}else if(v.isDirectionalLight){let A=n.directional[u];A.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(f),u++}else if(v.isSpotLight){let A=n.spot[x];A.position.setFromMatrixPosition(v.matrixWorld),A.position.applyMatrix4(f),A.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(f),x++}else if(v.isRectAreaLight){let A=n.rectArea[E];A.position.setFromMatrixPosition(v.matrixWorld),A.position.applyMatrix4(f),a.identity(),r.copy(v.matrixWorld),r.premultiply(f),a.extractRotation(r),A.halfWidth.set(v.width*.5,0,0),A.halfHeight.set(0,v.height*.5,0),A.halfWidth.applyMatrix4(a),A.halfHeight.applyMatrix4(a),E++}else if(v.isPointLight){let A=n.point[d];A.position.setFromMatrixPosition(v.matrixWorld),A.position.applyMatrix4(f),d++}else if(v.isHemisphereLight){let A=n.hemi[_];A.direction.setFromMatrixPosition(v.matrixWorld),A.direction.transformDirection(f),_++}}}return{setup:o,setupView:l,state:n}}function qu(i){let t=new r_(i),e=[],n=[],s=[];function r(u){p.camera=u,e.length=0,n.length=0,s.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let p={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:p,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function a_(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new qu(i),t.set(s,[o])):r>=a.length?(o=new qu(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var o_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,l_=`uniform sampler2D shadow_pass;
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
}`,c_=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],h_=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],Yu=new Ae,Kr=new D,zc=new D;function u_(i,t,e){let n=new Fs,s=new _t,r=new _t,a=new Fe,o=new Qa,l=new to,c={},h=e.maxTextureSize,p={[Ni]:cn,[cn]:Ni,[je]:je},u=new An({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new _t},radius:{value:4}},vertexShader:o_,fragmentShader:l_}),d=u.clone();d.defines.HORIZONTAL_PASS=1;let x=new Be;x.setAttribute("position",new bn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let E=new Ne(x,u),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Vr;let f=this.type;this.render=function(w,I,y){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||w.length===0)return;this.type===Oh&&(ie("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Vr);let P=i.getRenderTarget(),L=i.getActiveCubeFace(),U=i.getActiveMipmapLevel(),V=i.state;V.setBlending(jn),V.buffers.depth.getReversed()===!0?V.buffers.color.setClear(0,0,0,0):V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let Z=f!==this.type;Z&&I.traverse(function(O){O.material&&(Array.isArray(O.material)?O.material.forEach(H=>H.needsUpdate=!0):O.material.needsUpdate=!0)});for(let O=0,H=w.length;O<H;O++){let Q=w[O],nt=Q.shadow;if(nt===void 0){ie("WebGLShadowMap:",Q,"has no shadow.");continue}if(nt.autoUpdate===!1&&nt.needsUpdate===!1)continue;s.copy(nt.mapSize);let ht=nt.getFrameExtents();s.multiply(ht),r.copy(nt.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ht.x),s.x=r.x*ht.x,nt.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ht.y),s.y=r.y*ht.y,nt.mapSize.y=r.y));let tt=i.state.buffers.depth.getReversed();if(nt.camera._reversedDepth=tt,nt.map===null||Z===!0){if(nt.map!==null&&(nt.map.depthTexture!==null&&(nt.map.depthTexture.dispose(),nt.map.depthTexture=null),nt.map.dispose()),this.type===Hs){if(Q.isPointLight){ie("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}nt.map=new pn(s.x,s.y,{format:Bi,type:Wn,minFilter:nn,magFilter:nn,generateMipmaps:!1}),nt.map.texture.name=Q.name+".shadowMap",nt.map.depthTexture=new wi(s.x,s.y,In),nt.map.depthTexture.name=Q.name+".shadowMapDepth",nt.map.depthTexture.format=$n,nt.map.depthTexture.compareFunction=null,nt.map.depthTexture.minFilter=Je,nt.map.depthTexture.magFilter=Je}else Q.isPointLight?(nt.map=new ll(s.x),nt.map.depthTexture=new Xa(s.x,Hn)):(nt.map=new pn(s.x,s.y),nt.map.depthTexture=new wi(s.x,s.y,Hn)),nt.map.depthTexture.name=Q.name+".shadowMap",nt.map.depthTexture.format=$n,this.type===Vr?(nt.map.depthTexture.compareFunction=tt?sl:il,nt.map.depthTexture.minFilter=nn,nt.map.depthTexture.magFilter=nn):(nt.map.depthTexture.compareFunction=null,nt.map.depthTexture.minFilter=Je,nt.map.depthTexture.magFilter=Je);nt.camera.updateProjectionMatrix()}nt.map.isWebGLCubeRenderTarget!==!0&&(nt.map.width!==s.x||nt.map.height!==s.y)&&nt.map.setSize(s.x,s.y);let at=nt.map.isWebGLCubeRenderTarget?6:nt.getViewportCount();Q.isPointLight!==!0&&nt.updateMatrices(Q,y);for(let lt=0;lt<at;lt++){let Ot=nt.getCamera(lt);if(Q.isPointLight){let yt=nt.camera,Lt=nt.matrix,Wt=Q.distance||yt.far;Wt!==yt.far&&(yt.far=Wt,yt.updateProjectionMatrix()),Kr.setFromMatrixPosition(Q.matrixWorld),yt.position.copy(Kr),zc.copy(yt.position),zc.add(c_[lt]),yt.up.copy(h_[lt]),yt.lookAt(zc),yt.updateMatrixWorld(),Lt.makeTranslation(-Kr.x,-Kr.y,-Kr.z),Yu.multiplyMatrices(yt.projectionMatrix,yt.matrixWorldInverse),nt._frustum.setFromProjectionMatrix(Yu,yt.coordinateSystem,yt.reversedDepth)}if(nt.map.isWebGLCubeRenderTarget)i.setRenderTarget(nt.map,lt),i.clear();else{lt===0&&(i.setRenderTarget(nt.map),i.clear());let yt=nt.getViewport(lt);a.set(r.x*yt.x,r.y*yt.y,r.x*yt.z,r.y*yt.w),V.viewport(a)}n=nt.getFrustum(lt),v(I,y,Ot,Q,this.type)}nt.isPointLightShadow!==!0&&this.type===Hs&&R(nt,y),nt.needsUpdate=!1}f=this.type,_.needsUpdate=!1,i.setRenderTarget(P,L,U)};function R(w,I){let y=t.update(E);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,d.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),w.mapPass===null?w.mapPass=new pn(s.x,s.y,{format:Bi,type:Wn}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value.set(w.map.width,w.map.height),u.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(I,null,y,u,E,null),d.uniforms.shadow_pass.value=w.mapPass.texture,d.uniforms.resolution.value.set(w.map.width,w.map.height),d.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(I,null,y,d,E,null)}function T(w,I,y,P){let L=null,U=y.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(U!==void 0)L=U;else if(L=y.isPointLight===!0?l:o,i.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0||I.alphaToCoverage===!0){let V=L.uuid,Z=I.uuid,O=c[V];O===void 0&&(O={},c[V]=O);let H=O[Z];H===void 0&&(H=L.clone(),O[Z]=H,I.addEventListener("dispose",A)),L=H}if(L.visible=I.visible,L.wireframe=I.wireframe,P===Hs?L.side=I.shadowSide!==null?I.shadowSide:I.side:L.side=I.shadowSide!==null?I.shadowSide:p[I.side],L.alphaMap=I.alphaMap,L.alphaTest=I.alphaToCoverage===!0?.5:I.alphaTest,L.map=I.map,L.clipShadows=I.clipShadows,L.clippingPlanes=I.clippingPlanes,L.clipIntersection=I.clipIntersection,L.displacementMap=I.displacementMap,L.displacementScale=I.displacementScale,L.displacementBias=I.displacementBias,L.wireframeLinewidth=I.wireframeLinewidth,L.linewidth=I.linewidth,y.isPointLight===!0&&L.isMeshDistanceMaterial===!0){let V=i.properties.get(L);V.light=y}return L}function v(w,I,y,P,L){if(w.visible===!1)return;if(w.layers.test(I.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&L===Hs)&&(!w.frustumCulled||w.intersectsFrustum(n))){w.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,w.matrixWorld);let Z=t.update(w),O=w.material;if(Array.isArray(O)){let H=Z.groups;for(let Q=0,nt=H.length;Q<nt;Q++){let ht=H[Q],tt=O[ht.materialIndex];if(tt&&tt.visible){let at=T(w,tt,P,L);w.onBeforeShadow(i,w,I,y,Z,at,ht),i.renderBufferDirect(y,null,Z,at,w,ht),w.onAfterShadow(i,w,I,y,Z,at,ht)}}}else if(O.visible){let H=T(w,O,P,L);w.onBeforeShadow(i,w,I,y,Z,H,null),i.renderBufferDirect(y,null,Z,H,w,null),w.onAfterShadow(i,w,I,y,Z,H,null)}}let V=w.children;for(let Z=0,O=V.length;Z<O;Z++)v(V[Z],I,y,P,L)}function A(w){w.target.removeEventListener("dispose",A);for(let y in c){let P=c[y],L=w.target.uuid;L in P&&(P[L].dispose(),delete P[L])}}}function d_(i,t){function e(){let z=!1,Et=new Fe,rt=null,St=new Fe(0,0,0,0);return{setMask:function(Pt){rt!==Pt&&!z&&(i.colorMask(Pt,Pt,Pt,Pt),rt=Pt)},setLocked:function(Pt){z=Pt},setClear:function(Pt,dt,qt,Ht,Re){Re===!0&&(Pt*=Ht,dt*=Ht,qt*=Ht),Et.set(Pt,dt,qt,Ht),St.equals(Et)===!1&&(i.clearColor(Pt,dt,qt,Ht),St.copy(Et))},reset:function(){z=!1,rt=null,St.set(-1,0,0,0)}}}function n(){let z=!1,Et=!1,rt=null,St=null,Pt=null;return{setReversed:function(dt){if(Et!==dt){let qt=t.get("EXT_clip_control");dt?qt.clipControlEXT(qt.LOWER_LEFT_EXT,qt.ZERO_TO_ONE_EXT):qt.clipControlEXT(qt.LOWER_LEFT_EXT,qt.NEGATIVE_ONE_TO_ONE_EXT),Et=dt;let Ht=Pt;Pt=null,this.setClear(Ht)}},getReversed:function(){return Et},setTest:function(dt){dt?st(i.DEPTH_TEST):bt(i.DEPTH_TEST)},setMask:function(dt){rt!==dt&&!z&&(i.depthMask(dt),rt=dt)},setFunc:function(dt){if(Et&&(dt=xu[dt]),St!==dt){switch(dt){case Ra:i.depthFunc(i.NEVER);break;case Pa:i.depthFunc(i.ALWAYS);break;case Ia:i.depthFunc(i.LESS);break;case Rs:i.depthFunc(i.LEQUAL);break;case La:i.depthFunc(i.EQUAL);break;case Da:i.depthFunc(i.GEQUAL);break;case Na:i.depthFunc(i.GREATER);break;case Ua:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}St=dt}},setLocked:function(dt){z=dt},setClear:function(dt){Pt!==dt&&(Pt=dt,Et&&(dt=1-dt),i.clearDepth(dt))},reset:function(){z=!1,rt=null,St=null,Pt=null,Et=!1}}}function s(){let z=!1,Et=null,rt=null,St=null,Pt=null,dt=null,qt=null,Ht=null,Re=null;return{setTest:function(Ee){z||(Ee?st(i.STENCIL_TEST):bt(i.STENCIL_TEST))},setMask:function(Ee){Et!==Ee&&!z&&(i.stencilMask(Ee),Et=Ee)},setFunc:function(Ee,Qe,hn){(rt!==Ee||St!==Qe||Pt!==hn)&&(i.stencilFunc(Ee,Qe,hn),rt=Ee,St=Qe,Pt=hn)},setOp:function(Ee,Qe,hn){(dt!==Ee||qt!==Qe||Ht!==hn)&&(i.stencilOp(Ee,Qe,hn),dt=Ee,qt=Qe,Ht=hn)},setLocked:function(Ee){z=Ee},setClear:function(Ee){Re!==Ee&&(i.clearStencil(Ee),Re=Ee)},reset:function(){z=!1,Et=null,rt=null,St=null,Pt=null,dt=null,qt=null,Ht=null,Re=null}}}let r=new e,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},p={},u={},d=new WeakMap,x=[],E=null,_=!1,f=null,R=null,T=null,v=null,A=null,w=null,I=null,y=new he(0,0,0),P=0,L=!1,U=null,V=null,Z=null,O=null,H=null,Q=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),nt=!1,ht=0,tt=i.getParameter(i.VERSION);tt.indexOf("WebGL")!==-1?(ht=parseFloat(/^WebGL (\d)/.exec(tt)[1]),nt=ht>=1):tt.indexOf("OpenGL ES")!==-1&&(ht=parseFloat(/^OpenGL ES (\d)/.exec(tt)[1]),nt=ht>=2);let at=null,lt={},Ot=i.getParameter(i.SCISSOR_BOX),yt=i.getParameter(i.VIEWPORT),Lt=new Fe().fromArray(Ot),Wt=new Fe().fromArray(yt);function ue(z,Et,rt,St){let Pt=new Uint8Array(4),dt=i.createTexture();i.bindTexture(z,dt),i.texParameteri(z,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(z,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let qt=0;qt<rt;qt++)z===i.TEXTURE_3D||z===i.TEXTURE_2D_ARRAY?i.texImage3D(Et,0,i.RGBA,1,1,St,0,i.RGBA,i.UNSIGNED_BYTE,Pt):i.texImage2D(Et+qt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Pt);return dt}let K={};K[i.TEXTURE_2D]=ue(i.TEXTURE_2D,i.TEXTURE_2D,1),K[i.TEXTURE_CUBE_MAP]=ue(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[i.TEXTURE_2D_ARRAY]=ue(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),K[i.TEXTURE_3D]=ue(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),st(i.DEPTH_TEST),a.setFunc(Rs),pt(!1),ut(tc),st(i.CULL_FACE),mt(jn);function st(z){h[z]!==!0&&(i.enable(z),h[z]=!0)}function bt(z){h[z]!==!1&&(i.disable(z),h[z]=!1)}function Qt(z,Et){return u[z]!==Et?(i.bindFramebuffer(z,Et),u[z]=Et,z===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=Et),z===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=Et),!0):!1}function vt(z,Et){let rt=x,St=!1;if(z){rt=d.get(Et),rt===void 0&&(rt=[],d.set(Et,rt));let Pt=z.textures;if(rt.length!==Pt.length||rt[0]!==i.COLOR_ATTACHMENT0){for(let dt=0,qt=Pt.length;dt<qt;dt++)rt[dt]=i.COLOR_ATTACHMENT0+dt;rt.length=Pt.length,St=!0}}else rt[0]!==i.BACK&&(rt[0]=i.BACK,St=!0);St&&i.drawBuffers(rt)}function Vt(z){return E!==z?(i.useProgram(z),E=z,!0):!1}let Me={[ji]:i.FUNC_ADD,[zh]:i.FUNC_SUBTRACT,[kh]:i.FUNC_REVERSE_SUBTRACT};Me[Vh]=i.MIN,Me[Gh]=i.MAX;let ot={[Hh]:i.ZERO,[Wh]:i.ONE,[Xh]:i.SRC_COLOR,[sc]:i.SRC_ALPHA,[Kh]:i.SRC_ALPHA_SATURATE,[$h]:i.DST_COLOR,[Yh]:i.DST_ALPHA,[qh]:i.ONE_MINUS_SRC_COLOR,[rc]:i.ONE_MINUS_SRC_ALPHA,[Jh]:i.ONE_MINUS_DST_COLOR,[Zh]:i.ONE_MINUS_DST_ALPHA,[jh]:i.CONSTANT_COLOR,[Qh]:i.ONE_MINUS_CONSTANT_COLOR,[tu]:i.CONSTANT_ALPHA,[eu]:i.ONE_MINUS_CONSTANT_ALPHA};function mt(z,Et,rt,St,Pt,dt,qt,Ht,Re,Ee){if(z===jn){_===!0&&(bt(i.BLEND),_=!1);return}if(_===!1&&(st(i.BLEND),_=!0),z!==Bh){if(z!==f||Ee!==L){if((R!==ji||A!==ji)&&(i.blendEquation(i.FUNC_ADD),R=ji,A=ji),Ee)switch(z){case Ws:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ec:i.blendFunc(i.ONE,i.ONE);break;case nc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ic:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:se("WebGLState: Invalid blending: ",z);break}else switch(z){case Ws:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ec:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case nc:se("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ic:se("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:se("WebGLState: Invalid blending: ",z);break}T=null,v=null,w=null,I=null,y.set(0,0,0),P=0,f=z,L=Ee}return}Pt=Pt||Et,dt=dt||rt,qt=qt||St,(Et!==R||Pt!==A)&&(i.blendEquationSeparate(Me[Et],Me[Pt]),R=Et,A=Pt),(rt!==T||St!==v||dt!==w||qt!==I)&&(i.blendFuncSeparate(ot[rt],ot[St],ot[dt],ot[qt]),T=rt,v=St,w=dt,I=qt),(Ht.equals(y)===!1||Re!==P)&&(i.blendColor(Ht.r,Ht.g,Ht.b,Re),y.copy(Ht),P=Re),f=z,L=!1}function ct(z,Et){z.side===je?bt(i.CULL_FACE):st(i.CULL_FACE);let rt=z.side===cn;Et&&(rt=!rt),pt(rt),z.blending===Ws&&z.transparent===!1?mt(jn):mt(z.blending,z.blendEquation,z.blendSrc,z.blendDst,z.blendEquationAlpha,z.blendSrcAlpha,z.blendDstAlpha,z.blendColor,z.blendAlpha,z.premultipliedAlpha),a.setFunc(z.depthFunc),a.setTest(z.depthTest),a.setMask(z.depthWrite),r.setMask(z.colorWrite);let St=z.stencilWrite;o.setTest(St),St&&(o.setMask(z.stencilWriteMask),o.setFunc(z.stencilFunc,z.stencilRef,z.stencilFuncMask),o.setOp(z.stencilFail,z.stencilZFail,z.stencilZPass)),Bt(z.polygonOffset,z.polygonOffsetFactor,z.polygonOffsetUnits),z.alphaToCoverage===!0?st(i.SAMPLE_ALPHA_TO_COVERAGE):bt(i.SAMPLE_ALPHA_TO_COVERAGE)}function pt(z){U!==z&&(z?i.frontFace(i.CW):i.frontFace(i.CCW),U=z)}function ut(z){z!==Uh?(st(i.CULL_FACE),z!==V&&(z===tc?i.cullFace(i.BACK):z===Fh?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):bt(i.CULL_FACE),V=z}function Kt(z){z!==Z&&(nt&&i.lineWidth(z),Z=z)}function Bt(z,Et,rt){z?(st(i.POLYGON_OFFSET_FILL),(O!==Et||H!==rt)&&(O=Et,H=rt,a.getReversed()&&(Et=-Et),i.polygonOffset(Et,rt))):bt(i.POLYGON_OFFSET_FILL)}function jt(z){z?st(i.SCISSOR_TEST):bt(i.SCISSOR_TEST)}function re(z){z===void 0&&(z=i.TEXTURE0+Q-1),at!==z&&(i.activeTexture(z),at=z)}function N(z,Et,rt){rt===void 0&&(at===null?rt=i.TEXTURE0+Q-1:rt=at);let St=lt[rt];St===void 0&&(St={type:void 0,texture:void 0},lt[rt]=St),(St.type!==z||St.texture!==Et)&&(at!==rt&&(i.activeTexture(rt),at=rt),i.bindTexture(z,Et||K[z]),St.type=z,St.texture=Et)}function xe(){let z=lt[at];z!==void 0&&z.type!==void 0&&(i.bindTexture(z.type,null),z.type=void 0,z.texture=void 0)}function q(){try{i.compressedTexImage2D(...arguments)}catch(z){se("WebGLState:",z)}}function M(){try{i.compressedTexImage3D(...arguments)}catch(z){se("WebGLState:",z)}}function m(){try{i.texSubImage2D(...arguments)}catch(z){se("WebGLState:",z)}}function F(){try{i.texSubImage3D(...arguments)}catch(z){se("WebGLState:",z)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(z){se("WebGLState:",z)}}function k(){try{i.compressedTexSubImage3D(...arguments)}catch(z){se("WebGLState:",z)}}function ft(){try{i.texStorage2D(...arguments)}catch(z){se("WebGLState:",z)}}function gt(){try{i.texStorage3D(...arguments)}catch(z){se("WebGLState:",z)}}function $(){try{i.texImage2D(...arguments)}catch(z){se("WebGLState:",z)}}function it(){try{i.texImage3D(...arguments)}catch(z){se("WebGLState:",z)}}function wt(z){return p[z]!==void 0?p[z]:i.getParameter(z)}function Xt(z,Et){p[z]!==Et&&(i.pixelStorei(z,Et),p[z]=Et)}function At(z){Lt.equals(z)===!1&&(i.scissor(z.x,z.y,z.z,z.w),Lt.copy(z))}function Tt(z){Wt.equals(z)===!1&&(i.viewport(z.x,z.y,z.z,z.w),Wt.copy(z))}function Yt(z,Et){let rt=c.get(Et);rt===void 0&&(rt=new WeakMap,c.set(Et,rt));let St=rt.get(z);St===void 0&&(St=i.getUniformBlockIndex(Et,z.name),rt.set(z,St))}function Jt(z,Et){let St=c.get(Et).get(z);l.get(Et)!==St&&(i.uniformBlockBinding(Et,St,z.__bindingPointIndex),l.set(Et,St))}function ce(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},p={},at=null,lt={},u={},d=new WeakMap,x=[],E=null,_=!1,f=null,R=null,T=null,v=null,A=null,w=null,I=null,y=new he(0,0,0),P=0,L=!1,U=null,V=null,Z=null,O=null,H=null,Lt.set(0,0,i.canvas.width,i.canvas.height),Wt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:st,disable:bt,bindFramebuffer:Qt,drawBuffers:vt,useProgram:Vt,setBlending:mt,setMaterial:ct,setFlipSided:pt,setCullFace:ut,setLineWidth:Kt,setPolygonOffset:Bt,setScissorTest:jt,activeTexture:re,bindTexture:N,unbindTexture:xe,compressedTexImage2D:q,compressedTexImage3D:M,texImage2D:$,texImage3D:it,pixelStorei:Xt,getParameter:wt,updateUBOMapping:Yt,uniformBlockBinding:Jt,texStorage2D:ft,texStorage3D:gt,texSubImage2D:m,texSubImage3D:F,compressedTexSubImage2D:W,compressedTexSubImage3D:k,scissor:At,viewport:Tt,reset:ce}}function f_(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new _t,h=new WeakMap,p=new Set,u,d=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function E(M,m){return x?new OffscreenCanvas(M,m):yr("canvas")}function _(M,m,F){let W=1,k=q(M);if((k.width>F||k.height>F)&&(W=F/Math.max(k.width,k.height)),W<1)if(typeof HTMLImageElement<"u"&&M instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&M instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&M instanceof ImageBitmap||typeof VideoFrame<"u"&&M instanceof VideoFrame){let ft=Math.floor(W*k.width),gt=Math.floor(W*k.height);u===void 0&&(u=E(ft,gt));let $=m?E(ft,gt):u;return $.width=ft,$.height=gt,$.getContext("2d").drawImage(M,0,0,ft,gt),ie("WebGLRenderer: Texture has been resized from ("+k.width+"x"+k.height+") to ("+ft+"x"+gt+")."),$}else return"data"in M&&ie("WebGLRenderer: Image in DataTexture is too big ("+k.width+"x"+k.height+")."),M;return M}function f(M){return M.generateMipmaps}function R(M){i.generateMipmap(M)}function T(M){return M.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:M.isWebGL3DRenderTarget?i.TEXTURE_3D:M.isWebGLArrayRenderTarget||M.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(M,m,F,W,k,ft=!1){if(M!==null){if(i[M]!==void 0)return i[M];ie("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+M+"'")}let gt;W&&(gt=t.get("EXT_texture_norm16"),gt||ie("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let $=m;if(m===i.RED&&(F===i.FLOAT&&($=i.R32F),F===i.HALF_FLOAT&&($=i.R16F),F===i.UNSIGNED_BYTE&&($=i.R8),F===i.UNSIGNED_SHORT&&gt&&($=gt.R16_EXT),F===i.SHORT&&gt&&($=gt.R16_SNORM_EXT)),m===i.RED_INTEGER&&(F===i.UNSIGNED_BYTE&&($=i.R8UI),F===i.UNSIGNED_SHORT&&($=i.R16UI),F===i.UNSIGNED_INT&&($=i.R32UI),F===i.BYTE&&($=i.R8I),F===i.SHORT&&($=i.R16I),F===i.INT&&($=i.R32I)),m===i.RG&&(F===i.FLOAT&&($=i.RG32F),F===i.HALF_FLOAT&&($=i.RG16F),F===i.UNSIGNED_BYTE&&($=i.RG8),F===i.UNSIGNED_SHORT&&gt&&($=gt.RG16_EXT),F===i.SHORT&&gt&&($=gt.RG16_SNORM_EXT)),m===i.RG_INTEGER&&(F===i.UNSIGNED_BYTE&&($=i.RG8UI),F===i.UNSIGNED_SHORT&&($=i.RG16UI),F===i.UNSIGNED_INT&&($=i.RG32UI),F===i.BYTE&&($=i.RG8I),F===i.SHORT&&($=i.RG16I),F===i.INT&&($=i.RG32I)),m===i.RGB_INTEGER&&(F===i.UNSIGNED_BYTE&&($=i.RGB8UI),F===i.UNSIGNED_SHORT&&($=i.RGB16UI),F===i.UNSIGNED_INT&&($=i.RGB32UI),F===i.BYTE&&($=i.RGB8I),F===i.SHORT&&($=i.RGB16I),F===i.INT&&($=i.RGB32I)),m===i.RGBA_INTEGER&&(F===i.UNSIGNED_BYTE&&($=i.RGBA8UI),F===i.UNSIGNED_SHORT&&($=i.RGBA16UI),F===i.UNSIGNED_INT&&($=i.RGBA32UI),F===i.BYTE&&($=i.RGBA8I),F===i.SHORT&&($=i.RGBA16I),F===i.INT&&($=i.RGBA32I)),m===i.RGB&&(F===i.UNSIGNED_SHORT&&gt&&($=gt.RGB16_EXT),F===i.SHORT&&gt&&($=gt.RGB16_SNORM_EXT),F===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),F===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),m===i.RGBA){let it=ft?xr:ye.getTransfer(k);F===i.FLOAT&&($=i.RGBA32F),F===i.HALF_FLOAT&&($=i.RGBA16F),F===i.UNSIGNED_BYTE&&($=it===we?i.SRGB8_ALPHA8:i.RGBA8),F===i.UNSIGNED_SHORT&&gt&&($=gt.RGBA16_EXT),F===i.SHORT&&gt&&($=gt.RGBA16_SNORM_EXT),F===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),F===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&t.get("EXT_color_buffer_float"),$}function A(M,m){let F;return M?m===null||m===Hn||m===qs?F=i.DEPTH24_STENCIL8:m===In?F=i.DEPTH32F_STENCIL8:m===Xs&&(F=i.DEPTH24_STENCIL8,ie("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):m===null||m===Hn||m===qs?F=i.DEPTH_COMPONENT24:m===In?F=i.DEPTH_COMPONENT32F:m===Xs&&(F=i.DEPTH_COMPONENT16),F}function w(M,m){return f(M)===!0||M.isFramebufferTexture&&M.minFilter!==Je&&M.minFilter!==nn?Math.log2(Math.max(m.width,m.height))+1:M.mipmaps!==void 0&&M.mipmaps.length>0?M.mipmaps.length:M.isCompressedTexture&&Array.isArray(M.image)?m.mipmaps.length:1}function I(M){let m=M.target;m.removeEventListener("dispose",I),P(m),m.isVideoTexture&&h.delete(m),m.isHTMLTexture&&p.delete(m)}function y(M){let m=M.target;m.removeEventListener("dispose",y),U(m)}function P(M){let m=n.get(M);if(m.__webglInit===void 0)return;let F=M.source,W=d.get(F);if(W){let k=W[m.__cacheKey];k.usedTimes--,k.usedTimes===0&&L(M),Object.keys(W).length===0&&d.delete(F)}n.remove(M)}function L(M){let m=n.get(M);i.deleteTexture(m.__webglTexture);let F=M.source,W=d.get(F);delete W[m.__cacheKey],a.memory.textures--}function U(M){let m=n.get(M);if(M.depthTexture&&(M.depthTexture.dispose(),n.remove(M.depthTexture)),M.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(m.__webglFramebuffer[W]))for(let k=0;k<m.__webglFramebuffer[W].length;k++)i.deleteFramebuffer(m.__webglFramebuffer[W][k]);else i.deleteFramebuffer(m.__webglFramebuffer[W]);m.__webglDepthbuffer&&i.deleteRenderbuffer(m.__webglDepthbuffer[W])}else{if(Array.isArray(m.__webglFramebuffer))for(let W=0;W<m.__webglFramebuffer.length;W++)i.deleteFramebuffer(m.__webglFramebuffer[W]);else i.deleteFramebuffer(m.__webglFramebuffer);if(m.__webglDepthbuffer&&i.deleteRenderbuffer(m.__webglDepthbuffer),m.__webglMultisampledFramebuffer&&i.deleteFramebuffer(m.__webglMultisampledFramebuffer),m.__webglColorRenderbuffer)for(let W=0;W<m.__webglColorRenderbuffer.length;W++)m.__webglColorRenderbuffer[W]&&i.deleteRenderbuffer(m.__webglColorRenderbuffer[W]);m.__webglDepthRenderbuffer&&i.deleteRenderbuffer(m.__webglDepthRenderbuffer)}let F=M.textures;for(let W=0,k=F.length;W<k;W++){let ft=n.get(F[W]);ft.__webglTexture&&(i.deleteTexture(ft.__webglTexture),a.memory.textures--),n.remove(F[W])}n.remove(M)}let V=0;function Z(){V=0}function O(){return V}function H(M){V=M}function Q(){let M=V;return M>=s.maxTextures&&ie("WebGLTextures: Trying to use "+(M+1)+" texture units while this GPU supports only "+s.maxTextures),V+=1,M}function nt(M){let m=[];return m.push(M.wrapS),m.push(M.wrapT),m.push(M.wrapR||0),m.push(M.magFilter),m.push(M.minFilter),m.push(M.anisotropy),m.push(M.internalFormat),m.push(M.format),m.push(M.type),m.push(M.generateMipmaps),m.push(M.premultiplyAlpha),m.push(M.flipY),m.push(M.unpackAlignment),m.push(M.colorSpace),m.join()}function ht(M,m){let F=n.get(M);if(M.isVideoTexture&&N(M),M.isRenderTargetTexture===!1&&M.isExternalTexture!==!0&&M.version>0&&F.__version!==M.version){let W=M.image;if(W===null)ie("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)ie("WebGLRenderer: Texture marked for update but image is incomplete");else{bt(F,M,m);return}}else M.isExternalTexture&&(F.__webglTexture=M.sourceTexture?M.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,F.__webglTexture,i.TEXTURE0+m)}function tt(M,m){let F=n.get(M);if(M.isRenderTargetTexture===!1&&M.version>0&&F.__version!==M.version){bt(F,M,m);return}else M.isExternalTexture&&(F.__webglTexture=M.sourceTexture?M.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,F.__webglTexture,i.TEXTURE0+m)}function at(M,m){let F=n.get(M);if(M.isRenderTargetTexture===!1&&M.version>0&&F.__version!==M.version){bt(F,M,m);return}e.bindTexture(i.TEXTURE_3D,F.__webglTexture,i.TEXTURE0+m)}function lt(M,m){let F=n.get(M);if(M.isCubeDepthTexture!==!0&&M.version>0&&F.__version!==M.version){Qt(F,M,m);return}e.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+m)}let Ot={[Fa]:i.REPEAT,[Yn]:i.CLAMP_TO_EDGE,[Oa]:i.MIRRORED_REPEAT},yt={[Je]:i.NEAREST,[su]:i.NEAREST_MIPMAP_NEAREST,[Hr]:i.NEAREST_MIPMAP_LINEAR,[nn]:i.LINEAR,[xo]:i.LINEAR_MIPMAP_NEAREST,[Fi]:i.LINEAR_MIPMAP_LINEAR},Lt={[lu]:i.NEVER,[fu]:i.ALWAYS,[cu]:i.LESS,[il]:i.LEQUAL,[hu]:i.EQUAL,[sl]:i.GEQUAL,[uu]:i.GREATER,[du]:i.NOTEQUAL};function Wt(M,m){if(m.type===In&&t.has("OES_texture_float_linear")===!1&&(m.magFilter===nn||m.magFilter===xo||m.magFilter===Hr||m.magFilter===Fi||m.minFilter===nn||m.minFilter===xo||m.minFilter===Hr||m.minFilter===Fi)&&ie("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(M,i.TEXTURE_WRAP_S,Ot[m.wrapS]),i.texParameteri(M,i.TEXTURE_WRAP_T,Ot[m.wrapT]),(M===i.TEXTURE_3D||M===i.TEXTURE_2D_ARRAY)&&i.texParameteri(M,i.TEXTURE_WRAP_R,Ot[m.wrapR]),i.texParameteri(M,i.TEXTURE_MAG_FILTER,yt[m.magFilter]),i.texParameteri(M,i.TEXTURE_MIN_FILTER,yt[m.minFilter]),m.compareFunction&&(i.texParameteri(M,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(M,i.TEXTURE_COMPARE_FUNC,Lt[m.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(m.magFilter===Je||m.minFilter!==Hr&&m.minFilter!==Fi||m.type===In&&t.has("OES_texture_float_linear")===!1)return;if(m.anisotropy>1||n.get(m).__currentAnisotropy){let F=t.get("EXT_texture_filter_anisotropic");i.texParameterf(M,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(m.anisotropy,s.getMaxAnisotropy())),n.get(m).__currentAnisotropy=m.anisotropy}}}function ue(M,m){let F=!1;M.__webglInit===void 0&&(M.__webglInit=!0,m.addEventListener("dispose",I));let W=m.source,k=d.get(W);k===void 0&&(k={},d.set(W,k));let ft=nt(m);if(ft!==M.__cacheKey){k[ft]===void 0&&(k[ft]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,F=!0),k[ft].usedTimes++;let gt=k[M.__cacheKey];gt!==void 0&&(k[M.__cacheKey].usedTimes--,gt.usedTimes===0&&L(m)),M.__cacheKey=ft,M.__webglTexture=k[ft].texture}return F}function K(M,m,F){return Math.floor(Math.floor(M/F)/m)}function st(M,m,F,W){let ft=M.updateRanges;if(ft.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,m.width,m.height,F,W,m.data);else{ft.sort((Xt,At)=>Xt.start-At.start);let gt=0;for(let Xt=1;Xt<ft.length;Xt++){let At=ft[gt],Tt=ft[Xt],Yt=At.start+At.count,Jt=K(Tt.start,m.width,4),ce=K(At.start,m.width,4);Tt.start<=Yt+1&&Jt===ce&&K(Tt.start+Tt.count-1,m.width,4)===Jt?At.count=Math.max(At.count,Tt.start+Tt.count-At.start):(++gt,ft[gt]=Tt)}ft.length=gt+1;let $=e.getParameter(i.UNPACK_ROW_LENGTH),it=e.getParameter(i.UNPACK_SKIP_PIXELS),wt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,m.width);for(let Xt=0,At=ft.length;Xt<At;Xt++){let Tt=ft[Xt],Yt=Math.floor(Tt.start/4),Jt=Math.ceil(Tt.count/4),ce=Yt%m.width,z=Math.floor(Yt/m.width),Et=Jt,rt=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,ce),e.pixelStorei(i.UNPACK_SKIP_ROWS,z),e.texSubImage2D(i.TEXTURE_2D,0,ce,z,Et,rt,F,W,m.data)}M.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,$),e.pixelStorei(i.UNPACK_SKIP_PIXELS,it),e.pixelStorei(i.UNPACK_SKIP_ROWS,wt)}}function bt(M,m,F){let W=i.TEXTURE_2D;(m.isDataArrayTexture||m.isCompressedArrayTexture)&&(W=i.TEXTURE_2D_ARRAY),m.isData3DTexture&&(W=i.TEXTURE_3D);let k=ue(M,m),ft=m.source;e.bindTexture(W,M.__webglTexture,i.TEXTURE0+F);let gt=n.get(ft);if(ft.version!==gt.__version||k===!0){if(e.activeTexture(i.TEXTURE0+F),(typeof ImageBitmap<"u"&&m.image instanceof ImageBitmap)===!1){let rt=ye.getPrimaries(ye.workingColorSpace),St=m.colorSpace===gi?null:ye.getPrimaries(m.colorSpace),Pt=m.colorSpace===gi||rt===St?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,m.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,m.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pt)}e.pixelStorei(i.UNPACK_ALIGNMENT,m.unpackAlignment);let it=_(m.image,!1,s.maxTextureSize);it=xe(m,it);let wt=r.convert(m.format,m.colorSpace),Xt=r.convert(m.type),At=v(m.internalFormat,wt,Xt,m.normalized,m.colorSpace,m.isVideoTexture);Wt(W,m);let Tt,Yt=m.mipmaps,Jt=m.isVideoTexture!==!0,ce=gt.__version===void 0||k===!0,z=ft.dataReady,Et=w(m,it);if(m.isDepthTexture)At=A(m.format===Oi,m.type),ce&&(Jt?e.texStorage2D(i.TEXTURE_2D,1,At,it.width,it.height):e.texImage2D(i.TEXTURE_2D,0,At,it.width,it.height,0,wt,Xt,null));else if(m.isDataTexture)if(Yt.length>0){Jt&&ce&&e.texStorage2D(i.TEXTURE_2D,Et,At,Yt[0].width,Yt[0].height);for(let rt=0,St=Yt.length;rt<St;rt++)Tt=Yt[rt],Jt?z&&e.texSubImage2D(i.TEXTURE_2D,rt,0,0,Tt.width,Tt.height,wt,Xt,Tt.data):e.texImage2D(i.TEXTURE_2D,rt,At,Tt.width,Tt.height,0,wt,Xt,Tt.data);m.generateMipmaps=!1}else Jt?(ce&&e.texStorage2D(i.TEXTURE_2D,Et,At,it.width,it.height),z&&st(m,it,wt,Xt)):e.texImage2D(i.TEXTURE_2D,0,At,it.width,it.height,0,wt,Xt,it.data);else if(m.isCompressedTexture)if(m.isCompressedArrayTexture){Jt&&ce&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Et,At,Yt[0].width,Yt[0].height,it.depth);for(let rt=0,St=Yt.length;rt<St;rt++)if(Tt=Yt[rt],m.format!==Ln)if(wt!==null)if(Jt){if(z)if(m.layerUpdates.size>0){let Pt=Cc(Tt.width,Tt.height,m.format,m.type);for(let dt of m.layerUpdates){let qt=Tt.data.subarray(dt*Pt/Tt.data.BYTES_PER_ELEMENT,(dt+1)*Pt/Tt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,rt,0,0,dt,Tt.width,Tt.height,1,wt,qt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,rt,0,0,0,Tt.width,Tt.height,it.depth,wt,Tt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,rt,At,Tt.width,Tt.height,it.depth,0,Tt.data,0,0);else ie("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Jt?z&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,rt,0,0,0,Tt.width,Tt.height,it.depth,wt,Xt,Tt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,rt,At,Tt.width,Tt.height,it.depth,0,wt,Xt,Tt.data);m.layerUpdates.size>0&&m.clearLayerUpdates()}else{Jt&&ce&&e.texStorage2D(i.TEXTURE_2D,Et,At,Yt[0].width,Yt[0].height);for(let rt=0,St=Yt.length;rt<St;rt++)Tt=Yt[rt],m.format!==Ln?wt!==null?Jt?z&&e.compressedTexSubImage2D(i.TEXTURE_2D,rt,0,0,Tt.width,Tt.height,wt,Tt.data):e.compressedTexImage2D(i.TEXTURE_2D,rt,At,Tt.width,Tt.height,0,Tt.data):ie("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Jt?z&&e.texSubImage2D(i.TEXTURE_2D,rt,0,0,Tt.width,Tt.height,wt,Xt,Tt.data):e.texImage2D(i.TEXTURE_2D,rt,At,Tt.width,Tt.height,0,wt,Xt,Tt.data)}else if(m.isDataArrayTexture)if(Jt){if(ce&&e.texStorage3D(i.TEXTURE_2D_ARRAY,Et,At,it.width,it.height,it.depth),z)if(m.layerUpdates.size>0){let rt=Cc(it.width,it.height,m.format,m.type);for(let St of m.layerUpdates){let Pt=it.data.subarray(St*rt/it.data.BYTES_PER_ELEMENT,(St+1)*rt/it.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,St,it.width,it.height,1,wt,Xt,Pt)}m.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,it.width,it.height,it.depth,wt,Xt,it.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,At,it.width,it.height,it.depth,0,wt,Xt,it.data);else if(m.isData3DTexture)Jt?(ce&&e.texStorage3D(i.TEXTURE_3D,Et,At,it.width,it.height,it.depth),z&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,it.width,it.height,it.depth,wt,Xt,it.data)):e.texImage3D(i.TEXTURE_3D,0,At,it.width,it.height,it.depth,0,wt,Xt,it.data);else if(m.isFramebufferTexture){if(ce)if(Jt)e.texStorage2D(i.TEXTURE_2D,Et,At,it.width,it.height);else{let rt=it.width,St=it.height;for(let Pt=0;Pt<Et;Pt++)e.texImage2D(i.TEXTURE_2D,Pt,At,rt,St,0,wt,Xt,null),rt>>=1,St>>=1}}else if(m.isHTMLTexture){if("texElementImage2D"in i){let rt=i.canvas;if(rt.hasAttribute("layoutsubtree")||rt.setAttribute("layoutsubtree","true"),it.parentNode!==rt){rt.appendChild(it),p.add(m),rt.onpaint=St=>{let Pt=St.changedElements;for(let dt of p)Pt.includes(dt.image)&&(dt.needsUpdate=!0)},rt.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,it);else{let Pt=i.RGBA,dt=i.RGBA,qt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Pt,dt,qt,it)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Yt.length>0){if(Jt&&ce){let rt=q(Yt[0]);e.texStorage2D(i.TEXTURE_2D,Et,At,rt.width,rt.height)}for(let rt=0,St=Yt.length;rt<St;rt++)Tt=Yt[rt],Jt?z&&e.texSubImage2D(i.TEXTURE_2D,rt,0,0,wt,Xt,Tt):e.texImage2D(i.TEXTURE_2D,rt,At,wt,Xt,Tt);m.generateMipmaps=!1}else if(Jt){if(ce){let rt=q(it);e.texStorage2D(i.TEXTURE_2D,Et,At,rt.width,rt.height)}z&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,wt,Xt,it)}else e.texImage2D(i.TEXTURE_2D,0,At,wt,Xt,it);f(m)&&R(W),gt.__version=ft.version,m.onUpdate&&m.onUpdate(m)}M.__version=m.version}function Qt(M,m,F){if(m.image.length!==6)return;let W=ue(M,m),k=m.source;e.bindTexture(i.TEXTURE_CUBE_MAP,M.__webglTexture,i.TEXTURE0+F);let ft=n.get(k);if(k.version!==ft.__version||W===!0){e.activeTexture(i.TEXTURE0+F);let gt=ye.getPrimaries(ye.workingColorSpace),$=m.colorSpace===gi?null:ye.getPrimaries(m.colorSpace),it=m.colorSpace===gi||gt===$?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,m.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,m.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,m.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,it);let wt=m.isCompressedTexture||m.image[0].isCompressedTexture,Xt=m.image[0]&&m.image[0].isDataTexture,At=[];for(let dt=0;dt<6;dt++)!wt&&!Xt?At[dt]=_(m.image[dt],!0,s.maxCubemapSize):At[dt]=Xt?m.image[dt].image:m.image[dt],At[dt]=xe(m,At[dt]);let Tt=At[0],Yt=r.convert(m.format,m.colorSpace),Jt=r.convert(m.type),ce=v(m.internalFormat,Yt,Jt,m.normalized,m.colorSpace),z=m.isVideoTexture!==!0,Et=ft.__version===void 0||W===!0,rt=k.dataReady,St=w(m,Tt);Wt(i.TEXTURE_CUBE_MAP,m);let Pt;if(wt){z&&Et&&e.texStorage2D(i.TEXTURE_CUBE_MAP,St,ce,Tt.width,Tt.height);for(let dt=0;dt<6;dt++){Pt=At[dt].mipmaps;for(let qt=0;qt<Pt.length;qt++){let Ht=Pt[qt];m.format!==Ln?Yt!==null?z?rt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt,0,0,Ht.width,Ht.height,Yt,Ht.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt,ce,Ht.width,Ht.height,0,Ht.data):ie("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):z?rt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt,0,0,Ht.width,Ht.height,Yt,Jt,Ht.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt,ce,Ht.width,Ht.height,0,Yt,Jt,Ht.data)}}}else{if(Pt=m.mipmaps,z&&Et){Pt.length>0&&St++;let dt=q(At[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,St,ce,dt.width,dt.height)}for(let dt=0;dt<6;dt++)if(Xt){z?rt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,0,0,At[dt].width,At[dt].height,Yt,Jt,At[dt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,ce,At[dt].width,At[dt].height,0,Yt,Jt,At[dt].data);for(let qt=0;qt<Pt.length;qt++){let Re=Pt[qt].image[dt].image;z?rt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt+1,0,0,Re.width,Re.height,Yt,Jt,Re.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt+1,ce,Re.width,Re.height,0,Yt,Jt,Re.data)}}else{z?rt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,0,0,Yt,Jt,At[dt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,0,ce,Yt,Jt,At[dt]);for(let qt=0;qt<Pt.length;qt++){let Ht=Pt[qt];z?rt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt+1,0,0,Yt,Jt,Ht.image[dt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+dt,qt+1,ce,Yt,Jt,Ht.image[dt])}}}f(m)&&R(i.TEXTURE_CUBE_MAP),ft.__version=k.version,m.onUpdate&&m.onUpdate(m)}M.__version=m.version}function vt(M,m,F,W,k,ft){let gt=r.convert(F.format,F.colorSpace),$=r.convert(F.type),it=v(F.internalFormat,gt,$,F.normalized,F.colorSpace),wt=n.get(m),Xt=n.get(F);if(Xt.__renderTarget=m,!wt.__hasExternalTextures){let At=Math.max(1,m.width>>ft),Tt=Math.max(1,m.height>>ft);k===i.TEXTURE_3D||k===i.TEXTURE_2D_ARRAY?e.texImage3D(k,ft,it,At,Tt,m.depth,0,gt,$,null):e.texImage2D(k,ft,it,At,Tt,0,gt,$,null)}e.bindFramebuffer(i.FRAMEBUFFER,M),re(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,k,Xt.__webglTexture,0,jt(m)):(k===i.TEXTURE_2D||k>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&k<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,W,k,Xt.__webglTexture,ft),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Vt(M,m,F){if(i.bindRenderbuffer(i.RENDERBUFFER,M),m.depthBuffer){let W=m.depthTexture,k=W&&W.isDepthTexture?W.type:null,ft=A(m.stencilBuffer,k),gt=m.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;re(m)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,jt(m),ft,m.width,m.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,jt(m),ft,m.width,m.height):i.renderbufferStorage(i.RENDERBUFFER,ft,m.width,m.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,gt,i.RENDERBUFFER,M)}else{let W=m.textures;for(let k=0;k<W.length;k++){let ft=W[k],gt=r.convert(ft.format,ft.colorSpace),$=r.convert(ft.type),it=v(ft.internalFormat,gt,$,ft.normalized,ft.colorSpace);re(m)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,jt(m),it,m.width,m.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,jt(m),it,m.width,m.height):i.renderbufferStorage(i.RENDERBUFFER,it,m.width,m.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Me(M,m,F){let W=m.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,M),!(m.depthTexture&&m.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let k=n.get(m.depthTexture);if(k.__renderTarget=m,(!k.__webglTexture||m.depthTexture.image.width!==m.width||m.depthTexture.image.height!==m.height)&&(m.depthTexture.image.width=m.width,m.depthTexture.image.height=m.height,m.depthTexture.needsUpdate=!0),W){if(k.__webglInit===void 0&&(k.__webglInit=!0,m.depthTexture.addEventListener("dispose",I)),k.__webglTexture===void 0){k.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture),Wt(i.TEXTURE_CUBE_MAP,m.depthTexture);let wt=r.convert(m.depthTexture.format),Xt=r.convert(m.depthTexture.type),At;m.depthTexture.format===$n?At=i.DEPTH_COMPONENT24:m.depthTexture.format===Oi&&(At=i.DEPTH24_STENCIL8);for(let Tt=0;Tt<6;Tt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Tt,0,At,m.width,m.height,0,wt,Xt,null)}}else ht(m.depthTexture,0);let ft=k.__webglTexture,gt=jt(m),$=W?i.TEXTURE_CUBE_MAP_POSITIVE_X+F:i.TEXTURE_2D,it=m.depthTexture.format===Oi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(m.depthTexture.format===$n)re(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,it,$,ft,0,gt):i.framebufferTexture2D(i.FRAMEBUFFER,it,$,ft,0);else if(m.depthTexture.format===Oi)re(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,it,$,ft,0,gt):i.framebufferTexture2D(i.FRAMEBUFFER,it,$,ft,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ot(M){let m=n.get(M),F=M.isWebGLCubeRenderTarget===!0;if(m.__boundDepthTexture!==M.depthTexture){let W=M.depthTexture;if(m.__depthDisposeCallback&&m.__depthDisposeCallback(),W){let k=()=>{delete m.__boundDepthTexture,delete m.__depthDisposeCallback,W.removeEventListener("dispose",k)};W.addEventListener("dispose",k),m.__depthDisposeCallback=k}m.__boundDepthTexture=W}if(M.depthTexture&&!m.__autoAllocateDepthBuffer)if(F)for(let W=0;W<6;W++)Me(m.__webglFramebuffer[W],M,W);else{let W=M.texture.mipmaps;W&&W.length>0?Me(m.__webglFramebuffer[0],M,0):Me(m.__webglFramebuffer,M,0)}else if(F){m.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(e.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer[W]),m.__webglDepthbuffer[W]===void 0)m.__webglDepthbuffer[W]=i.createRenderbuffer(),Vt(m.__webglDepthbuffer[W],M,!1);else{let k=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ft=m.__webglDepthbuffer[W];i.bindRenderbuffer(i.RENDERBUFFER,ft),i.framebufferRenderbuffer(i.FRAMEBUFFER,k,i.RENDERBUFFER,ft)}}else{let W=M.texture.mipmaps;if(W&&W.length>0?e.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer),m.__webglDepthbuffer===void 0)m.__webglDepthbuffer=i.createRenderbuffer(),Vt(m.__webglDepthbuffer,M,!1);else{let k=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ft=m.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ft),i.framebufferRenderbuffer(i.FRAMEBUFFER,k,i.RENDERBUFFER,ft)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function mt(M,m,F){let W=n.get(M);m!==void 0&&vt(W.__webglFramebuffer,M,M.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),F!==void 0&&ot(M)}function ct(M){let m=M.texture,F=n.get(M),W=n.get(m);M.addEventListener("dispose",y);let k=M.textures,ft=M.isWebGLCubeRenderTarget===!0,gt=k.length>1;if(gt||(W.__webglTexture===void 0&&(W.__webglTexture=i.createTexture()),W.__version=m.version,a.memory.textures++),ft){F.__webglFramebuffer=[];for(let $=0;$<6;$++)if(m.mipmaps&&m.mipmaps.length>0){F.__webglFramebuffer[$]=[];for(let it=0;it<m.mipmaps.length;it++)F.__webglFramebuffer[$][it]=i.createFramebuffer()}else F.__webglFramebuffer[$]=i.createFramebuffer()}else{if(m.mipmaps&&m.mipmaps.length>0){F.__webglFramebuffer=[];for(let $=0;$<m.mipmaps.length;$++)F.__webglFramebuffer[$]=i.createFramebuffer()}else F.__webglFramebuffer=i.createFramebuffer();if(gt)for(let $=0,it=k.length;$<it;$++){let wt=n.get(k[$]);wt.__webglTexture===void 0&&(wt.__webglTexture=i.createTexture(),a.memory.textures++)}if(M.samples>0&&re(M)===!1){F.__webglMultisampledFramebuffer=i.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let $=0;$<k.length;$++){let it=k[$];F.__webglColorRenderbuffer[$]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,F.__webglColorRenderbuffer[$]);let wt=r.convert(it.format,it.colorSpace),Xt=r.convert(it.type),At=v(it.internalFormat,wt,Xt,it.normalized,it.colorSpace,M.isXRRenderTarget===!0),Tt=jt(M);i.renderbufferStorageMultisample(i.RENDERBUFFER,Tt,At,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+$,i.RENDERBUFFER,F.__webglColorRenderbuffer[$])}i.bindRenderbuffer(i.RENDERBUFFER,null),M.depthBuffer&&(F.__webglDepthRenderbuffer=i.createRenderbuffer(),Vt(F.__webglDepthRenderbuffer,M,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ft){e.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture),Wt(i.TEXTURE_CUBE_MAP,m);for(let $=0;$<6;$++)if(m.mipmaps&&m.mipmaps.length>0)for(let it=0;it<m.mipmaps.length;it++)vt(F.__webglFramebuffer[$][it],M,m,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,it);else vt(F.__webglFramebuffer[$],M,m,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0);f(m)&&R(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(gt){for(let $=0,it=k.length;$<it;$++){let wt=k[$],Xt=n.get(wt),At=i.TEXTURE_2D;(M.isWebGL3DRenderTarget||M.isWebGLArrayRenderTarget)&&(At=M.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(At,Xt.__webglTexture),Wt(At,wt),vt(F.__webglFramebuffer,M,wt,i.COLOR_ATTACHMENT0+$,At,0),f(wt)&&R(At)}e.unbindTexture()}else{let $=i.TEXTURE_2D;if((M.isWebGL3DRenderTarget||M.isWebGLArrayRenderTarget)&&($=M.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture($,W.__webglTexture),Wt($,m),m.mipmaps&&m.mipmaps.length>0)for(let it=0;it<m.mipmaps.length;it++)vt(F.__webglFramebuffer[it],M,m,i.COLOR_ATTACHMENT0,$,it);else vt(F.__webglFramebuffer,M,m,i.COLOR_ATTACHMENT0,$,0);f(m)&&R($),e.unbindTexture()}M.depthBuffer&&ot(M)}function pt(M){let m=M.textures;for(let F=0,W=m.length;F<W;F++){let k=m[F];if(f(k)){let ft=T(M),gt=n.get(k).__webglTexture;e.bindTexture(ft,gt),R(ft),e.unbindTexture()}}}let ut=[],Kt=[];function Bt(M){if(M.samples>0){if(re(M)===!1){let m=M.textures,F=M.width,W=M.height,k=i.COLOR_BUFFER_BIT,ft=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,gt=n.get(M),$=m.length>1;if($)for(let wt=0;wt<m.length;wt++)e.bindFramebuffer(i.FRAMEBUFFER,gt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+wt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,gt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+wt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,gt.__webglMultisampledFramebuffer);let it=M.texture.mipmaps;it&&it.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,gt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,gt.__webglFramebuffer);for(let wt=0;wt<m.length;wt++){if(M.resolveDepthBuffer&&(M.depthBuffer&&(k|=i.DEPTH_BUFFER_BIT),M.stencilBuffer&&M.resolveStencilBuffer&&(k|=i.STENCIL_BUFFER_BIT)),$){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,gt.__webglColorRenderbuffer[wt]);let Xt=n.get(m[wt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Xt,0)}i.blitFramebuffer(0,0,F,W,0,0,F,W,k,i.NEAREST),l===!0&&(ut.length=0,Kt.length=0,ut.push(i.COLOR_ATTACHMENT0+wt),M.depthBuffer&&M.storeMultisampledDepthBuffer===!1&&(ut.push(ft),Kt.push(ft),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Kt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ut))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),$)for(let wt=0;wt<m.length;wt++){e.bindFramebuffer(i.FRAMEBUFFER,gt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+wt,i.RENDERBUFFER,gt.__webglColorRenderbuffer[wt]);let Xt=n.get(m[wt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,gt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+wt,i.TEXTURE_2D,Xt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,gt.__webglMultisampledFramebuffer)}else if(M.depthBuffer&&M.storeMultisampledDepthBuffer===!1&&l){let m=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[m])}}}function jt(M){return Math.min(s.maxSamples,M.samples)}function re(M){let m=n.get(M);return M.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&m.__useRenderToTexture!==!1}function N(M){let m=a.render.frame;h.get(M)!==m&&(h.set(M,m),M.update())}function xe(M,m){let F=M.colorSpace,W=M.format,k=M.type;return M.isCompressedTexture===!0||M.isVideoTexture===!0||F!==_r&&F!==gi&&(ye.getTransfer(F)===we?(W!==Ln||k!==mn)&&ie("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):se("WebGLTextures: Unsupported texture color space:",F)),m}function q(M){return typeof HTMLImageElement<"u"&&M instanceof HTMLImageElement?(c.width=M.naturalWidth||M.width,c.height=M.naturalHeight||M.height):typeof VideoFrame<"u"&&M instanceof VideoFrame?(c.width=M.displayWidth,c.height=M.displayHeight):(c.width=M.width,c.height=M.height),c}this.allocateTextureUnit=Q,this.resetTextureUnits=Z,this.getTextureUnits=O,this.setTextureUnits=H,this.setTexture2D=ht,this.setTexture2DArray=tt,this.setTexture3D=at,this.setTextureCube=lt,this.rebindTextures=mt,this.setupRenderTarget=ct,this.updateRenderTargetMipmap=pt,this.updateMultisampleRenderTarget=Bt,this.setupDepthRenderbuffer=ot,this.setupFrameBufferTexture=vt,this.useMultisampledRTT=re,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function p_(i,t){function e(n,s=gi){let r,a=ye.getTransfer(s);if(n===mn)return i.UNSIGNED_BYTE;if(n===vo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Mo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===_c)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===xc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===mc)return i.BYTE;if(n===gc)return i.SHORT;if(n===Xs)return i.UNSIGNED_SHORT;if(n===yo)return i.INT;if(n===Hn)return i.UNSIGNED_INT;if(n===In)return i.FLOAT;if(n===Wn)return i.HALF_FLOAT;if(n===yc)return i.ALPHA;if(n===vc)return i.RGB;if(n===Ln)return i.RGBA;if(n===$n)return i.DEPTH_COMPONENT;if(n===Oi)return i.DEPTH_STENCIL;if(n===So)return i.RED;if(n===bo)return i.RED_INTEGER;if(n===Bi)return i.RG;if(n===Eo)return i.RG_INTEGER;if(n===To)return i.RGBA_INTEGER;if(n===Wr||n===Xr||n===qr||n===Yr)if(a===we)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Wr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Yr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Wr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Yr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===wo||n===Ao||n===Co||n===Ro)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===wo)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ao)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Co)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ro)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Po||n===Io||n===Lo||n===Do||n===No||n===Zr||n===Uo)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Po||n===Io)return a===we?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Lo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Do)return r.COMPRESSED_R11_EAC;if(n===No)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Zr)return r.COMPRESSED_RG11_EAC;if(n===Uo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Fo||n===Oo||n===Bo||n===zo||n===ko||n===Vo||n===Go||n===Ho||n===Wo||n===Xo||n===qo||n===Yo||n===Zo||n===$o)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Fo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Oo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Bo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===zo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ko)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Vo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Go)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ho)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Wo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Xo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===qo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Yo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Zo)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===$o)return a===we?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Jo||n===Ko||n===jo)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Jo)return a===we?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ko)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===jo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Qo||n===tl||n===$r||n===el)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Qo)return r.COMPRESSED_RED_RGTC1_EXT;if(n===tl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===$r)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===el)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===qs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var m_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,g_=`
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

}`,Yc=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new wr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new An({vertexShader:m_,fragmentShader:g_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Ne(new Ai(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Zc=class extends kn{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,p=null,u=null,d=null,x=null,E=typeof XRWebGLBinding<"u",_=new Yc,f={},R=e.getContextAttributes(),T=null,v=null,A=[],w=[],I=new _t,y=null,P=null,L=new $e;L.viewport=new Fe;let U=new $e;U.viewport=new Fe;let V=[L,U],Z=new po,O=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let st=A[K];return st===void 0&&(st=new Us,A[K]=st),st.getTargetRaySpace()},this.getControllerGrip=function(K){let st=A[K];return st===void 0&&(st=new Us,A[K]=st),st.getGripSpace()},this.getHand=function(K){let st=A[K];return st===void 0&&(st=new Us,A[K]=st),st.getHandSpace()};function Q(K){let st=w.indexOf(K.inputSource);if(st===-1)return;let bt=A[st];bt!==void 0&&(bt.update(K.inputSource,K.frame,c||a),bt.dispatchEvent({type:K.type,data:K.inputSource}))}function nt(){s.removeEventListener("select",Q),s.removeEventListener("selectstart",Q),s.removeEventListener("selectend",Q),s.removeEventListener("squeeze",Q),s.removeEventListener("squeezestart",Q),s.removeEventListener("squeezeend",Q),s.removeEventListener("end",nt),s.removeEventListener("inputsourceschange",ht);for(let K=0;K<A.length;K++){let st=w[K];st!==null&&(w[K]=null,A[K].disconnect(st))}O=null,H=null,_.reset();for(let K in f)delete f[K];if(t.setRenderTarget(T),d=null,u=null,p=null,s=null,v=null,ue.stop(),n.isPresenting=!1,t.setPixelRatio(y),t.setSize(I.width,I.height,!1),P!==null){let K=P.camera;K.fov=P.fov,K.zoom=P.zoom,K.updateProjectionMatrix(),P=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&ie("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,n.isPresenting===!0&&ie("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return p===null&&E&&(p=new XRWebGLBinding(s,e)),p},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(T=t.getRenderTarget(),s.addEventListener("select",Q),s.addEventListener("selectstart",Q),s.addEventListener("selectend",Q),s.addEventListener("squeeze",Q),s.addEventListener("squeezestart",Q),s.addEventListener("squeezeend",Q),s.addEventListener("end",nt),s.addEventListener("inputsourceschange",ht),R.xrCompatible!==!0&&await e.makeXRCompatible(),y=t.getPixelRatio(),t.getSize(I),E&&"createProjectionLayer"in XRWebGLBinding.prototype){let bt=null,Qt=null,vt=null;R.depth&&(vt=R.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,bt=R.stencil?Oi:$n,Qt=R.stencil?qs:Hn);let Vt={colorFormat:e.RGBA8,depthFormat:vt,scaleFactor:r};p=this.getBinding(),u=p.createProjectionLayer(Vt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),v=new pn(u.textureWidth,u.textureHeight,{format:Ln,type:mn,depthTexture:new wi(u.textureWidth,u.textureHeight,Qt,void 0,void 0,void 0,void 0,void 0,void 0,bt),stencilBuffer:R.stencil,colorSpace:t.outputColorSpace,samples:R.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let bt={antialias:R.antialias,alpha:!0,depth:R.depth,stencil:R.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(s,e,bt),s.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),v=new pn(d.framebufferWidth,d.framebufferHeight,{format:Ln,type:mn,colorSpace:t.outputColorSpace,stencilBuffer:R.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),ue.setContext(s),ue.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function ht(K){for(let st=0;st<K.removed.length;st++){let bt=K.removed[st],Qt=w.indexOf(bt);Qt>=0&&(w[Qt]=null,A[Qt].disconnect(bt))}for(let st=0;st<K.added.length;st++){let bt=K.added[st],Qt=w.indexOf(bt);if(Qt===-1){for(let Vt=0;Vt<A.length;Vt++)if(Vt>=w.length){w.push(bt),Qt=Vt;break}else if(w[Vt]===null){w[Vt]=bt,Qt=Vt;break}if(Qt===-1)break}let vt=A[Qt];vt&&vt.connect(bt)}}let tt=new D,at=new D;function lt(K,st,bt){tt.setFromMatrixPosition(st.matrixWorld),at.setFromMatrixPosition(bt.matrixWorld);let Qt=tt.distanceTo(at),vt=st.projectionMatrix.elements,Vt=bt.projectionMatrix.elements,Me=vt[14]/(vt[10]-1),ot=vt[14]/(vt[10]+1),mt=(vt[9]+1)/vt[5],ct=(vt[9]-1)/vt[5],pt=(vt[8]-1)/vt[0],ut=(Vt[8]+1)/Vt[0],Kt=Me*pt,Bt=Me*ut,jt=Qt/(-pt+ut),re=jt*-pt;if(st.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(re),K.translateZ(jt),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),vt[10]===-1)K.projectionMatrix.copy(st.projectionMatrix),K.projectionMatrixInverse.copy(st.projectionMatrixInverse);else{let N=Me+jt,xe=ot+jt,q=Kt-re,M=Bt+(Qt-re),m=mt*ot/xe*N,F=ct*ot/xe*N;K.projectionMatrix.makePerspective(q,M,m,F,N,xe),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function Ot(K,st){st===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(st.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let st=K.near,bt=K.far;_.texture!==null&&(_.depthNear>0&&(st=_.depthNear),_.depthFar>0&&(bt=_.depthFar)),Z.near=U.near=L.near=st,Z.far=U.far=L.far=bt,(O!==Z.near||H!==Z.far)&&(s.updateRenderState({depthNear:Z.near,depthFar:Z.far}),O=Z.near,H=Z.far),Z.layers.mask=K.layers.mask|6,L.layers.mask=Z.layers.mask&-5,U.layers.mask=Z.layers.mask&-3;let Qt=K.parent,vt=Z.cameras;Ot(Z,Qt);for(let Vt=0;Vt<vt.length;Vt++)Ot(vt[Vt],Qt);vt.length===2?lt(Z,L,U):Z.projectionMatrix.copy(L.projectionMatrix),P===null&&K.isPerspectiveCamera&&(P={camera:K,fov:K.fov,zoom:K.zoom}),yt(K,Z,Qt)};function yt(K,st,bt){bt===null?K.matrix.copy(st.matrixWorld):(K.matrix.copy(bt.matrixWorld),K.matrix.invert(),K.matrix.multiply(st.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(st.projectionMatrix),K.projectionMatrixInverse.copy(st.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Ls*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return Z},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function(K){l=K,u!==null&&(u.fixedFoveation=K),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=K)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(Z)},this.getCameraTexture=function(K){return f[K]};let Lt=null;function Wt(K,st){if(h=st.getViewerPose(c||a),x=st,h!==null){let bt=h.views;d!==null&&(t.setRenderTargetFramebuffer(v,d.framebuffer),t.setRenderTarget(v));let Qt=!1;bt.length!==Z.cameras.length&&(Z.cameras.length=0,Qt=!0);for(let ot=0;ot<bt.length;ot++){let mt=bt[ot],ct=null;if(d!==null)ct=d.getViewport(mt);else{let ut=p.getViewSubImage(u,mt);ct=ut.viewport,ot===0&&(t.setRenderTargetTextures(v,ut.colorTexture,ut.depthStencilTexture),t.setRenderTarget(v))}let pt=V[ot];pt===void 0&&(pt=new $e,pt.layers.enable(ot),pt.viewport=new Fe,V[ot]=pt),pt.matrix.fromArray(mt.transform.matrix),pt.matrix.decompose(pt.position,pt.quaternion,pt.scale),pt.projectionMatrix.fromArray(mt.projectionMatrix),pt.projectionMatrixInverse.copy(pt.projectionMatrix).invert(),pt.viewport.set(ct.x,ct.y,ct.width,ct.height),ot===0&&(Z.matrix.copy(pt.matrix),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale)),Qt===!0&&Z.cameras.push(pt)}let vt=s.enabledFeatures;if(vt&&vt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&E){p=n.getBinding();let ot=p.getDepthInformation(bt[0]);ot&&ot.isValid&&ot.texture&&_.init(ot,s.renderState)}if(vt&&vt.includes("camera-access")&&E){t.state.unbindTexture(),p=n.getBinding();for(let ot=0;ot<bt.length;ot++){let mt=bt[ot].camera;if(mt){let ct=f[mt];ct||(ct=new wr,f[mt]=ct);let pt=p.getCameraImage(mt);ct.sourceTexture=pt}}}}for(let bt=0;bt<A.length;bt++){let Qt=w[bt],vt=A[bt];Qt!==null&&vt!==void 0&&vt.update(Qt,st,c||a)}Lt&&Lt(K,st),st.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:st}),x=null}let ue=new Zu;ue.setAnimationLoop(Wt),this.setAnimationLoop=function(K){Lt=K},this.dispose=function(){}}},__=new Ae,td=new le;td.set(-1,0,0,0,1,0,0,0,1);function x_(i,t){function e(_,f){_.matrixAutoUpdate===!0&&_.updateMatrix(),f.value.copy(_.matrix)}function n(_,f){f.color.getRGB(_.fogColor.value,Tc(i)),f.isFog?(_.fogNear.value=f.near,_.fogFar.value=f.far):f.isFogExp2&&(_.fogDensity.value=f.density)}function s(_,f,R,T,v){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?r(_,f):f.isMeshLambertMaterial?(r(_,f),f.envMap&&(_.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(_,f),p(_,f)):f.isMeshPhongMaterial?(r(_,f),h(_,f),f.envMap&&(_.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(_,f),u(_,f),f.isMeshPhysicalMaterial&&d(_,f,v)):f.isMeshMatcapMaterial?(r(_,f),x(_,f)):f.isMeshDepthMaterial?r(_,f):f.isMeshDistanceMaterial?(r(_,f),E(_,f)):f.isMeshNormalMaterial?r(_,f):f.isLineBasicMaterial?(a(_,f),f.isLineDashedMaterial&&o(_,f)):f.isPointsMaterial?l(_,f,R,T):f.isSpriteMaterial?c(_,f):f.isShadowMaterial?(_.color.value.copy(f.color),_.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(_,f){_.opacity.value=f.opacity,f.color&&_.diffuse.value.copy(f.color),f.emissive&&_.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(_.map.value=f.map,e(f.map,_.mapTransform)),f.alphaMap&&(_.alphaMap.value=f.alphaMap,e(f.alphaMap,_.alphaMapTransform)),f.bumpMap&&(_.bumpMap.value=f.bumpMap,e(f.bumpMap,_.bumpMapTransform),_.bumpScale.value=f.bumpScale,f.side===cn&&(_.bumpScale.value*=-1)),f.normalMap&&(_.normalMap.value=f.normalMap,e(f.normalMap,_.normalMapTransform),_.normalScale.value.copy(f.normalScale),f.side===cn&&_.normalScale.value.negate()),f.displacementMap&&(_.displacementMap.value=f.displacementMap,e(f.displacementMap,_.displacementMapTransform),_.displacementScale.value=f.displacementScale,_.displacementBias.value=f.displacementBias),f.emissiveMap&&(_.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,_.emissiveMapTransform)),f.specularMap&&(_.specularMap.value=f.specularMap,e(f.specularMap,_.specularMapTransform)),f.alphaTest>0&&(_.alphaTest.value=f.alphaTest);let R=t.get(f),T=R.envMap,v=R.envMapRotation;T&&(_.envMap.value=T,_.envMapRotation.value.setFromMatrix4(__.makeRotationFromEuler(v)).transpose(),T.isCubeTexture&&T.isRenderTargetTexture===!1&&_.envMapRotation.value.premultiply(td),_.reflectivity.value=f.reflectivity,_.ior.value=f.ior,_.refractionRatio.value=f.refractionRatio),f.lightMap&&(_.lightMap.value=f.lightMap,_.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,_.lightMapTransform)),f.aoMap&&(_.aoMap.value=f.aoMap,_.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,_.aoMapTransform))}function a(_,f){_.diffuse.value.copy(f.color),_.opacity.value=f.opacity,f.map&&(_.map.value=f.map,e(f.map,_.mapTransform))}function o(_,f){_.dashSize.value=f.dashSize,_.totalSize.value=f.dashSize+f.gapSize,_.scale.value=f.scale}function l(_,f,R,T){_.diffuse.value.copy(f.color),_.opacity.value=f.opacity,_.size.value=f.size*R,_.scale.value=T*.5,f.map&&(_.map.value=f.map,e(f.map,_.uvTransform)),f.alphaMap&&(_.alphaMap.value=f.alphaMap,e(f.alphaMap,_.alphaMapTransform)),f.alphaTest>0&&(_.alphaTest.value=f.alphaTest)}function c(_,f){_.diffuse.value.copy(f.color),_.opacity.value=f.opacity,_.rotation.value=f.rotation,f.map&&(_.map.value=f.map,e(f.map,_.mapTransform)),f.alphaMap&&(_.alphaMap.value=f.alphaMap,e(f.alphaMap,_.alphaMapTransform)),f.alphaTest>0&&(_.alphaTest.value=f.alphaTest)}function h(_,f){_.specular.value.copy(f.specular),_.shininess.value=Math.max(f.shininess,1e-4)}function p(_,f){f.gradientMap&&(_.gradientMap.value=f.gradientMap)}function u(_,f){_.metalness.value=f.metalness,f.metalnessMap&&(_.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,_.metalnessMapTransform)),_.roughness.value=f.roughness,f.roughnessMap&&(_.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,_.roughnessMapTransform)),f.envMap&&(_.envMapIntensity.value=f.envMapIntensity)}function d(_,f,R){_.ior.value=f.ior,f.sheen>0&&(_.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),_.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(_.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,_.sheenColorMapTransform)),f.sheenRoughnessMap&&(_.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,_.sheenRoughnessMapTransform))),f.clearcoat>0&&(_.clearcoat.value=f.clearcoat,_.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(_.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,_.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(_.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===cn&&_.clearcoatNormalScale.value.negate())),f.dispersion>0&&(_.dispersion.value=f.dispersion),f.retroreflectivity>0&&(_.retroreflectivity.value=f.retroreflectivity),f.iridescence>0&&(_.iridescence.value=f.iridescence,_.iridescenceIOR.value=f.iridescenceIOR,_.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(_.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,_.iridescenceMapTransform)),f.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),f.transmission>0&&(_.transmission.value=f.transmission,_.transmissionSamplerMap.value=R.texture,_.transmissionSamplerSize.value.set(R.width,R.height),f.transmissionMap&&(_.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,_.transmissionMapTransform)),_.thickness.value=f.thickness,f.thicknessMap&&(_.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=f.attenuationDistance,_.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(_.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(_.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=f.specularIntensity,_.specularColor.value.copy(f.specularColor),f.specularColorMap&&(_.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,_.specularColorMapTransform)),f.specularIntensityMap&&(_.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,_.specularIntensityMapTransform))}function x(_,f){f.matcap&&(_.matcap.value=f.matcap)}function E(_,f){let R=t.get(f).light;_.referencePosition.value.setFromMatrixPosition(R.matrixWorld),_.nearDistance.value=R.shadow.camera.near,_.farDistance.value=R.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function y_(i,t,e,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,A){let w=A.program;n.uniformBlockBinding(v,w)}function c(v,A){let w=s[v.id];w===void 0&&(_(v),w=h(v),s[v.id]=w,v.addEventListener("dispose",R));let I=A.program;n.updateUBOMapping(v,I);let y=t.render.frame;r[v.id]!==y&&(u(v),r[v.id]=y)}function h(v){let A=p();v.__bindingPointIndex=A;let w=i.createBuffer(),I=v.__size,y=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,I,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,A,w),w}function p(){for(let v=0;v<o;v++)if(a.indexOf(v)===-1)return a.push(v),v;return se("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(v){let A=s[v.id],w=v.uniforms,I=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let y=0,P=w.length;y<P;y++){let L=w[y];if(Array.isArray(L))for(let U=0,V=L.length;U<V;U++)d(L[U],y,U,I);else d(L,y,0,I)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function d(v,A,w,I){if(E(v,A,w,I)===!0){let y=v.__offset,P=v.value;if(Array.isArray(P)){let L=0;for(let U=0;U<P.length;U++){let V=P[U],Z=f(V);x(V,v.__data,L),typeof V!="number"&&typeof V!="boolean"&&!V.isMatrix3&&!ArrayBuffer.isView(V)&&(L+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(P,v.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,v.__data)}}function x(v,A,w){typeof v=="number"||typeof v=="boolean"?A[0]=v:v.isMatrix3?(A[0]=v.elements[0],A[1]=v.elements[1],A[2]=v.elements[2],A[3]=0,A[4]=v.elements[3],A[5]=v.elements[4],A[6]=v.elements[5],A[7]=0,A[8]=v.elements[6],A[9]=v.elements[7],A[10]=v.elements[8],A[11]=0):ArrayBuffer.isView(v)?A.set(new v.constructor(v.buffer,v.byteOffset,A.length)):v.toArray(A,w)}function E(v,A,w,I){let y=v.value,P=A+"_"+w;if(I[P]===void 0)return typeof y=="number"||typeof y=="boolean"?I[P]=y:ArrayBuffer.isView(y)?I[P]=y.slice():I[P]=y.clone(),!0;{let L=I[P];if(typeof y=="number"||typeof y=="boolean"){if(L!==y)return I[P]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(L.equals(y)===!1)return L.copy(y),!0}}return!1}function _(v){let A=v.uniforms,w=0,I=16;for(let P=0,L=A.length;P<L;P++){let U=Array.isArray(A[P])?A[P]:[A[P]];for(let V=0,Z=U.length;V<Z;V++){let O=U[V],H=Array.isArray(O.value)?O.value:[O.value];for(let Q=0,nt=H.length;Q<nt;Q++){let ht=H[Q],tt=f(ht),at=w%I,lt=at%tt.boundary,Ot=at+lt;w+=lt,Ot!==0&&I-Ot<tt.storage&&(w+=I-Ot),O.__data=new Float32Array(tt.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=w,w+=tt.storage}}}let y=w%I;return y>0&&(w+=I-y),v.__size=w,v.__cache={},this}function f(v){let A={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(A.boundary=4,A.storage=4):v.isVector2?(A.boundary=8,A.storage=8):v.isVector3||v.isColor?(A.boundary=16,A.storage=12):v.isVector4?(A.boundary=16,A.storage=16):v.isMatrix3?(A.boundary=48,A.storage=48):v.isMatrix4?(A.boundary=64,A.storage=64):v.isTexture?ie("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(A.boundary=16,A.storage=v.byteLength):ie("WebGLRenderer: Unsupported uniform value type.",v),A}function R(v){let A=v.target;A.removeEventListener("dispose",R);let w=a.indexOf(A.__bindingPointIndex);a.splice(w,1),i.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}function T(){for(let v in s)i.deleteBuffer(s[v]);a=[],s={},r={}}return{bind:l,update:c,dispose:T}}var v_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Qn=null;function M_(){return Qn===null&&(Qn=new br(v_,16,16,Bi,Wn),Qn.name="DFG_LUT",Qn.minFilter=nn,Qn.magFilter=nn,Qn.wrapS=Yn,Qn.wrapT=Yn,Qn.generateMipmaps=!1,Qn.needsUpdate=!0),Qn}var Js=class{constructor(t={}){let{canvas:e=mu(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:u=!1,outputBufferType:d=mn}=t;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=n.getContextAttributes().alpha}else x=a;let E=d,_=new Set([To,Eo,bo]),f=new Set([mn,Hn,Xs,qs,vo,Mo]),R=new Uint32Array(4),T=new Int32Array(4),v=new D,A=null,w=null,I=[],y=[],P=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Gn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let L=this,U=!1,V=null,Z=null,O=null,H=null;this._outputColorSpace=en;let Q=0,nt=0,ht=null,tt=-1,at=null,lt=new Fe,Ot=new Fe,yt=null,Lt=new he(0),Wt=0,ue=e.width,K=e.height,st=1,bt=null,Qt=null,vt=new Fe(0,0,ue,K),Vt=new Fe(0,0,ue,K),Me=!1,ot=new Fs,mt=!1,ct=!1,pt=new Ae,ut=new D,Kt=new Fe,Bt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},jt=!1;function re(){return ht===null?st:1}let N=n;function xe(S,B){return e.getContext(S,B)}let q,M,m,F,W,k,ft,gt,$,it,wt,Xt,At,Tt,Yt,Jt,ce,z,Et,rt,St,Pt,dt;try{let S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:p};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",Re,!1),e.addEventListener("webglcontextrestored",Ee,!1),e.addEventListener("webglcontextcreationerror",Qe,!1),N===null){let B="webgl2";if(N=xe(B,S),N===null)throw xe(B)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}qt()}catch(S){throw e.removeEventListener("webglcontextlost",Re,!1),e.removeEventListener("webglcontextrestored",Ee,!1),e.removeEventListener("webglcontextcreationerror",Qe,!1),se("WebGLRenderer: "+S.message),S}function qt(){q=new Cg(N),q.init(),St=new p_(N,q),M=new xg(N,q,t,St),m=new d_(N,q),M.reversedDepthBuffer&&u&&m.buffers.depth.setReversed(!0),Z=N.createFramebuffer(),O=N.createFramebuffer(),H=N.createFramebuffer(),F=new Ig(N),W=new j0,k=new f_(N,q,m,W,M,St,F),ft=new Ag(L),gt=new Df(N),Pt=new gg(N,gt),$=new Rg(N,gt,F,Pt),it=new Dg(N,$,gt,Pt,F),z=new Lg(N,M,k),Yt=new yg(W),wt=new K0(L,ft,q,M,Pt,Yt),Xt=new x_(L,W),At=new t_,Tt=new a_(q),ce=new mg(L,ft,m,it,x,l),Jt=new u_(L,it,M),dt=new y_(N,F,M,m),Et=new _g(N,q,F),rt=new Pg(N,q,F),F.programs=wt.programs,L.capabilities=M,L.extensions=q,L.properties=W,L.renderLists=At,L.shadowMap=Jt,L.state=m,L.info=F}E!==mn&&(P=new Ug(E,e.width,e.height,o,s,r));let Ht=new Zc(L,N);this.xr=Ht,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let S=q.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=q.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return st},this.setPixelRatio=function(S){S!==void 0&&(st=S,this.setSize(ue,K,!1))},this.getSize=function(S){return S.set(ue,K)},this.setSize=function(S,B,J=!0){if(Ht.isPresenting){ie("WebGLRenderer: Can't change size while VR device is presenting.");return}ue=S,K=B,e.width=Math.floor(S*st),e.height=Math.floor(B*st),J===!0&&(e.style.width=S+"px",e.style.height=B+"px"),P!==null&&P.setSize(e.width,e.height),this.setViewport(0,0,S,B)},this.getDrawingBufferSize=function(S){return S.set(ue*st,K*st).floor()},this.setDrawingBufferSize=function(S,B,J){ue=S,K=B,st=J,e.width=Math.floor(S*J),e.height=Math.floor(B*J),this.setViewport(0,0,S,B)},this.setEffects=function(S){if(E===mn){se("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let B=0;B<S.length;B++)if(S[B].isOutputPass===!0){ie("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}P.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(lt)},this.getViewport=function(S){return S.copy(vt)},this.setViewport=function(S,B,J,Y){S.isVector4?vt.set(S.x,S.y,S.z,S.w):vt.set(S,B,J,Y),m.viewport(lt.copy(vt).multiplyScalar(st).round())},this.getScissor=function(S){return S.copy(Vt)},this.setScissor=function(S,B,J,Y){S.isVector4?Vt.set(S.x,S.y,S.z,S.w):Vt.set(S,B,J,Y),m.scissor(Ot.copy(Vt).multiplyScalar(st).round())},this.getScissorTest=function(){return Me},this.setScissorTest=function(S){m.setScissorTest(Me=S)},this.setOpaqueSort=function(S){bt=S},this.setTransparentSort=function(S){Qt=S},this.getClearColor=function(S){return S.copy(ce.getClearColor())},this.setClearColor=function(){ce.setClearColor(...arguments)},this.getClearAlpha=function(){return ce.getClearAlpha()},this.setClearAlpha=function(){ce.setClearAlpha(...arguments)},this.clear=function(S=!0,B=!0,J=!0){let Y=0;if(S){let G=!1;if(ht!==null){let Ct=ht.texture.format;G=_.has(Ct)}if(G){let Ct=ht.texture.type,Nt=f.has(Ct),Rt=ce.getClearColor(),zt=ce.getClearAlpha(),Gt=Rt.r,ee=Rt.g,de=Rt.b;Nt?(R[0]=Gt,R[1]=ee,R[2]=de,R[3]=zt,N.clearBufferuiv(N.COLOR,0,R)):(T[0]=Gt,T[1]=ee,T[2]=de,T[3]=zt,N.clearBufferiv(N.COLOR,0,T))}else Y|=N.COLOR_BUFFER_BIT}B&&(Y|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),J&&(Y|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),Y!==0&&N.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),V=S},this.dispose=function(){e.removeEventListener("webglcontextlost",Re,!1),e.removeEventListener("webglcontextrestored",Ee,!1),e.removeEventListener("webglcontextcreationerror",Qe,!1),ce.dispose(),At.dispose(),Tt.dispose(),W.dispose(),ft.dispose(),it.dispose(),Pt.dispose(),dt.dispose(),wt.dispose(),Ht.dispose(),Ht.removeEventListener("sessionstart",ei),Ht.removeEventListener("sessionend",tr),un.stop()};function Re(S){S.preventDefault(),Sc("WebGLRenderer: Context Lost."),U=!0}function Ee(){Sc("WebGLRenderer: Context Restored."),U=!1;let S=F.autoReset,B=Jt.enabled,J=Jt.autoUpdate,Y=Jt.needsUpdate,G=Jt.type;qt(),F.autoReset=S,Jt.enabled=B,Jt.autoUpdate=J,Jt.needsUpdate=Y,Jt.type=G}function Qe(S){se("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function hn(S){let B=S.target;B.removeEventListener("dispose",hn),Qs(B)}function Qs(S){dl(S),W.remove(S)}function dl(S){let B=W.get(S).programs;B!==void 0&&(B.forEach(function(J){wt.releaseProgram(J)}),S.isShaderMaterial&&wt.releaseShaderCache(S))}this.renderBufferDirect=function(S,B,J,Y,G,Ct){B===null&&(B=Bt);let Nt=G.isMesh&&G.matrixWorld.determinantAffine()<0,Rt=Xn(S,B,J,Y,G);m.setMaterial(Y,Nt);let zt=J.index,Gt=1;if(Y.wireframe===!0){if(zt=$.getWireframeAttribute(J),zt===void 0)return;Gt=2}let ee=J.drawRange,de=J.attributes.position,Ut=ee.start*Gt,Se=(ee.start+ee.count)*Gt;Ct!==null&&(Ut=Math.max(Ut,Ct.start*Gt),Se=Math.min(Se,(Ct.start+Ct.count)*Gt)),zt!==null?(Ut=Math.max(Ut,0),Se=Math.min(Se,zt.count)):de!=null&&(Ut=Math.max(Ut,0),Se=Math.min(Se,de.count));let Ie=Se-Ut;if(Ie<0||Ie===1/0)return;Pt.setup(G,Y,Rt,J,zt);let Pe,fe=Et;if(zt!==null&&(Pe=gt.get(zt),fe=rt,fe.setIndex(Pe)),G.isMesh)Y.wireframe===!0?(m.setLineWidth(Y.wireframeLinewidth*re()),fe.setMode(N.LINES)):fe.setMode(N.TRIANGLES);else if(G.isLine){let Ye=Y.linewidth;Ye===void 0&&(Ye=1),m.setLineWidth(Ye*re()),G.isLineSegments?fe.setMode(N.LINES):G.isLineLoop?fe.setMode(N.LINE_LOOP):fe.setMode(N.LINE_STRIP)}else G.isPoints?fe.setMode(N.POINTS):G.isSprite&&fe.setMode(N.TRIANGLES);if(G.isBatchedMesh)if(q.get("WEBGL_multi_draw"))fe.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let Ye=G._multiDrawStarts,Ft=G._multiDrawCounts,tn=G._multiDrawCount,_e=zt?gt.get(zt).bytesPerElement:1,on=W.get(Y).currentProgram.getUniforms();for(let xn=0;xn<tn;xn++)on.setValue(N,"_gl_DrawID",xn),fe.render(Ye[xn]/_e,Ft[xn])}else if(G.isInstancedMesh)fe.renderInstances(Ut,Ie,G.count);else if(J.isInstancedBufferGeometry){let Ye=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,Ft=Math.min(J.instanceCount,Ye);fe.renderInstances(Ut,Ie,Ft)}else fe.render(Ut,Ie)};function is(S,B,J,Y){V!==null&&S.isNodeMaterial&&V.setObject(Y,S),mt===!0&&Yt.setState(S,J,!1),S.transparent===!0&&S.side===je&&S.forceSinglePass===!1?(S.side=cn,S.needsUpdate=!0,os(S,B,Y),S.side=Ni,S.needsUpdate=!0,os(S,B,Y),S.side=je):os(S,B,Y)}this.compile=function(S,B,J=null){J===null&&(J=S),V!==null&&V.renderStart(S,B,J),w=Tt.get(J),w.init(B),y.push(w),J.traverseVisible(function(G){G.isLight&&G.layers.test(B.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),S!==J&&S.traverseVisible(function(G){G.isLight&&G.layers.test(B.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),w.setupLights(),V!==null&&V.updateLights(w.state.lightsArray),ct=this.localClippingEnabled,mt=Yt.init(this.clippingPlanes,ct),mt===!0&&Yt.setGlobalState(this.clippingPlanes,B),V!==null&&Jt.render(w.state.shadowsArray,J,B);let Y=new Set;return S.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let Ct=G.material;if(Ct)if(Array.isArray(Ct))for(let Nt=0;Nt<Ct.length;Nt++){let Rt=Ct[Nt];is(Rt,J,B,G),Y.add(Rt)}else is(Ct,J,B,G),Y.add(Ct)}),w=y.pop(),V!==null&&V.renderEnd(),Y},this.compileAsync=function(S,B,J=null){let Y=this.compile(S,B,J);return new Promise(G=>{function Ct(){if(Y.forEach(function(Nt){let zt=W.get(Nt).currentProgram;(zt===void 0||zt.isReady())&&Y.delete(Nt)}),Y.size===0){G(S);return}setTimeout(Ct,10)}q.get("KHR_parallel_shader_compile")!==null?Ct():setTimeout(Ct,10)})};let ss=null;function Dn(S){ss&&ss(S)}function ei(){un.stop()}function tr(){un.start()}let un=new Zu;un.setAnimationLoop(Dn),typeof self<"u"&&un.setContext(self),this.setAnimationLoop=function(S){ss=S,Ht.setAnimationLoop(S),S===null?un.stop():un.start()},Ht.addEventListener("sessionstart",ei),Ht.addEventListener("sessionend",tr),this.render=function(S,B){if(B!==void 0&&B.isCamera!==!0){se("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(U===!0)return;V!==null&&V.renderStart(S,B);let J=Ht.enabled===!0&&Ht.isPresenting===!0,Y=P!==null&&(ht===null||J)&&P.begin(L,ht);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),Ht.enabled===!0&&Ht.isPresenting===!0&&(P===null||P.isCompositing()===!1)&&(Ht.cameraAutoUpdate===!0&&Ht.updateCamera(B),B=Ht.getCamera()),S.isScene===!0&&S.onBeforeRender(L,S,B,ht),w=Tt.get(S,y.length),w.init(B),w.state.textureUnits=k.getTextureUnits(),y.push(w),pt.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),ot.setFromProjectionMatrix(pt,zn,B.reversedDepth),ct=this.localClippingEnabled,mt=Yt.init(this.clippingPlanes,ct),A=At.get(S,I.length),A.init(),I.push(A),Ht.enabled===!0&&Ht.isPresenting===!0){let Nt=L.xr.getDepthSensingMesh();Nt!==null&&xi(Nt,B,-1/0,L.sortObjects)}xi(S,B,0,L.sortObjects),A.finish(),V!==null&&V.updateLights(w.state.lightsArray),L.sortObjects===!0&&A.sort(bt,Qt),jt=Ht.enabled===!1||Ht.isPresenting===!1||Ht.hasDepthSensing()===!1,jt&&ce.addToRenderList(A,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),mt===!0&&Yt.beginShadows();let G=w.state.shadowsArray;if(Jt.render(G,S,B),mt===!0&&Yt.endShadows(),(Y&&P.hasRenderPass())===!1){let Nt=A.opaque,Rt=A.transmissive;if(w.setupLights(),B.isArrayCamera){let zt=B.cameras;if(Rt.length>0)for(let Gt=0,ee=zt.length;Gt<ee;Gt++){let de=zt[Gt];rs(Nt,Rt,S,de)}jt&&ce.render(S);for(let Gt=0,ee=zt.length;Gt<ee;Gt++){let de=zt[Gt];er(A,S,de,de.viewport)}}else Rt.length>0&&rs(Nt,Rt,S,B),jt&&ce.render(S),er(A,S,B)}ht!==null&&nt===0&&(k.updateMultisampleRenderTarget(ht),k.updateRenderTargetMipmap(ht)),Y&&P.end(L),S.isScene===!0&&S.onAfterRender(L,S,B),Pt.resetDefaultState(),tt=-1,at=null,y.pop(),y.length>0?(w=y[y.length-1],k.setTextureUnits(w.state.textureUnits),mt===!0&&Yt.setGlobalState(L.clippingPlanes,w.state.camera)):w=null,I.pop(),I.length>0?A=I[I.length-1]:A=null,V!==null&&V.renderEnd()};function xi(S,B,J,Y){if(S.visible===!1)return;if(S.layers.test(B.layers)){if(S.isGroup)J=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(B);else if(S.isLightProbeGrid)w.pushLightProbeGrid(S);else if(S.isLight)w.pushLight(S),S.castShadow&&w.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||S.intersectsFrustum(ot)){Y&&Kt.setFromMatrixPosition(S.matrixWorld).applyMatrix4(pt);let Nt=it.update(S),Rt=S.material;Rt.visible&&A.push(S,Nt,Rt,J,Kt.z,null,B)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||S.intersectsFrustum(ot))){let Nt=it.update(S),Rt=S.material;if(Y&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Kt.copy(S.boundingSphere.center)):(Nt.boundingSphere===null&&Nt.computeBoundingSphere(),Kt.copy(Nt.boundingSphere.center)),Kt.applyMatrix4(S.matrixWorld).applyMatrix4(pt)),Array.isArray(Rt)){let zt=Nt.groups;for(let Gt=0,ee=zt.length;Gt<ee;Gt++){let de=zt[Gt],Ut=Rt[de.materialIndex];Ut&&Ut.visible&&A.push(S,Nt,Ut,J,Kt.z,de,B)}}else Rt.visible&&A.push(S,Nt,Rt,J,Kt.z,null,B)}}let Ct=S.children;for(let Nt=0,Rt=Ct.length;Nt<Rt;Nt++)xi(Ct[Nt],B,J,Y)}function er(S,B,J,Y){let{opaque:G,transmissive:Ct,transparent:Nt}=S;w.setupLightsView(J),mt===!0&&Yt.setGlobalState(L.clippingPlanes,J),Y&&m.viewport(lt.copy(Y)),G.length>0&&as(G,B,J),Ct.length>0&&as(Ct,B,J),Nt.length>0&&as(Nt,B,J),m.buffers.depth.setTest(!0),m.buffers.depth.setMask(!0),m.buffers.color.setMask(!0),m.setPolygonOffset(!1)}function rs(S,B,J,Y){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[Y.id]===void 0){let Ut=q.has("EXT_color_buffer_half_float")||q.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[Y.id]=new pn(1,1,{generateMipmaps:!0,type:Ut?Wn:mn,minFilter:Fi,samples:Math.max(4,M.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ye.workingColorSpace})}let Ct=w.state.transmissionRenderTarget[Y.id],Nt=Y.viewport||lt;Ct.setSize(Nt.z*L.transmissionResolutionScale,Nt.w*L.transmissionResolutionScale);let Rt=L.getRenderTarget(),zt=L.getActiveCubeFace(),Gt=L.getActiveMipmapLevel();L.setRenderTarget(Ct),L.getClearColor(Lt),Wt=L.getClearAlpha(),Wt<1&&L.setClearColor(16777215,.5),L.clear(),jt&&ce.render(J);let ee=L.toneMapping;L.toneMapping=Gn;let de=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),w.setupLightsView(Y),mt===!0&&Yt.setGlobalState(L.clippingPlanes,Y),as(S,J,Y),k.updateMultisampleRenderTarget(Ct),k.updateRenderTargetMipmap(Ct),q.has("WEBGL_multisampled_render_to_texture")===!1){let Ut=!1;for(let Se=0,Ie=B.length;Se<Ie;Se++){let Pe=B[Se],{object:fe,geometry:Ye,material:Ft,group:tn}=Pe;if(Ft.side===je&&fe.layers.test(Y.layers)){let _e=Ft.side;Ft.side=cn,Ft.needsUpdate=!0,nr(fe,J,Y,Ye,Ft,tn),Ft.side=_e,Ft.needsUpdate=!0,Ut=!0}}Ut===!0&&(k.updateMultisampleRenderTarget(Ct),k.updateRenderTargetMipmap(Ct))}L.setRenderTarget(Rt,zt,Gt),L.setClearColor(Lt,Wt),de!==void 0&&(Y.viewport=de),L.toneMapping=ee}function as(S,B,J){let Y=B.isScene===!0?B.overrideMaterial:null;for(let G=0,Ct=S.length;G<Ct;G++){let Nt=S[G],{object:Rt,geometry:zt,group:Gt}=Nt,ee=Nt.material;ee.allowOverride===!0&&Y!==null&&(ee=Y),Rt.layers.test(J.layers)&&nr(Rt,B,J,zt,ee,Gt)}}function nr(S,B,J,Y,G,Ct){V!==null&&G.isNodeMaterial&&V.setObject(S,G),S.onBeforeRender(L,B,J,Y,G,Ct),S.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),G.onBeforeRender(L,B,J,Y,S,Ct),G.transparent===!0&&G.side===je&&G.forceSinglePass===!1?(G.side=cn,G.needsUpdate=!0,L.renderBufferDirect(J,B,Y,G,S,Ct),G.side=Ni,G.needsUpdate=!0,L.renderBufferDirect(J,B,Y,G,S,Ct),G.side=je):L.renderBufferDirect(J,B,Y,G,S,Ct),S.onAfterRender(L,B,J,Y,G,Ct)}function os(S,B,J){B.isScene!==!0&&(B=Bt);let Y=W.get(S),G=w.state.lights,Ct=w.state.shadowsArray,Nt=G.state.version,Rt=wt.getParameters(S,G.state,Ct,B,J,w.state.lightProbeGridArray),zt=wt.getProgramCacheKey(Rt),Gt=Y.programs;Y.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?B.environment:null,Y.fog=B.fog;let ee=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;Y.envMap=ft.get(S.envMap||Y.environment,ee),Y.envMapRotation=Y.environment!==null&&S.envMap===null?B.environmentRotation:S.envMapRotation,Gt===void 0&&(S.addEventListener("dispose",hn),Gt=new Map,Y.programs=Gt);let de=Gt.get(zt);if(de!==void 0){if(Y.currentProgram===de&&Y.lightsStateVersion===Nt)return Rn(S,Rt),de}else Rt.uniforms=wt.getUniforms(S),V!==null&&S.isNodeMaterial&&V.build(S,J,Rt),S.onBeforeCompile(Rt,L),de=wt.acquireProgram(Rt,zt),Gt.set(zt,de),Y.uniforms=Rt.uniforms;let Ut=Y.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Ut.clippingPlanes=Yt.uniform),Rn(S,Rt),Y.needsLights=ze(S),Y.lightsStateVersion=Nt,Y.needsLights&&(Ut.ambientLightColor.value=G.state.ambient,Ut.lightProbe.value=G.state.probe,Ut.sunLights.value=G.state.sun,Ut.sunLightShadows.value=G.state.sunShadow,Ut.directionalLights.value=G.state.directional,Ut.directionalLightShadows.value=G.state.directionalShadow,Ut.spotLights.value=G.state.spot,Ut.spotLightShadows.value=G.state.spotShadow,Ut.rectAreaLights.value=G.state.rectArea,Ut.ltc_1.value=G.state.rectAreaLTC1,Ut.ltc_2.value=G.state.rectAreaLTC2,Ut.pointLights.value=G.state.point,Ut.pointLightShadows.value=G.state.pointShadow,Ut.hemisphereLights.value=G.state.hemi,Ut.sunShadowMatrix.value=G.state.sunShadowMatrix,Ut.sunShadowCascade.value=G.state.sunShadowCascade,Ut.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ut.spotLightMatrix.value=G.state.spotLightMatrix,Ut.spotLightMap.value=G.state.spotLightMap,Ut.pointShadowMatrix.value=G.state.pointShadowMatrix),Y.lightProbeGrid=w.state.lightProbeGridArray.length>0,Y.currentProgram=de,Y.uniformsList=null,de}function ir(S){if(S.uniformsList===null){let B=S.currentProgram.getUniforms();S.uniformsList=$s.seqWithValue(B.seq,S.uniforms)}return S.uniformsList}function Rn(S,B){let J=W.get(S);J.outputColorSpace=B.outputColorSpace,J.batching=B.batching,J.batchingColor=B.batchingColor,J.instancing=B.instancing,J.instancingColor=B.instancingColor,J.instancingMorph=B.instancingMorph,J.skinning=B.skinning,J.morphTargets=B.morphTargets,J.morphNormals=B.morphNormals,J.morphColors=B.morphColors,J.morphTargetsCount=B.morphTargetsCount,J.numClippingPlanes=B.numClippingPlanes,J.numIntersection=B.numClipIntersection,J.vertexAlphas=B.vertexAlphas,J.vertexTangents=B.vertexTangents,J.toneMapping=B.toneMapping}function sr(S,B){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;v.setFromMatrixPosition(B.matrixWorld);for(let J=0,Y=S.length;J<Y;J++){let G=S[J];if(G.texture!==null&&G.boundingBox.containsPoint(v))return G}return null}function Xn(S,B,J,Y,G){B.isScene!==!0&&(B=Bt),k.resetTextureUnits();let Ct=B.fog,Nt=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial?B.environment:null,Rt=ht===null?L.outputColorSpace:ht.isXRRenderTarget===!0?ht.texture.colorSpace:ye.workingColorSpace,zt=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial&&!Y.envMap||Y.isMeshPhongMaterial&&!Y.envMap,Gt=ft.get(Y.envMap||Nt,zt),ee=Y.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,de=!!J.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Ut=!!J.morphAttributes.position,Se=!!J.morphAttributes.normal,Ie=!!J.morphAttributes.color,Pe=Gn;Y.toneMapped&&(ht===null||ht.isXRRenderTarget===!0)&&(Pe=L.toneMapping);let fe=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,Ye=fe!==void 0?fe.length:0,Ft=W.get(Y),tn=w.state.lights;if(mt===!0&&(ct===!0||S!==at)){let X=S===at&&Y.id===tt;Yt.setState(Y,S,X)}let _e=!1;Y.version===Ft.__version?(Ft.needsLights&&Ft.lightsStateVersion!==tn.state.version||Ft.outputColorSpace!==Rt||G.isBatchedMesh&&Ft.batching===!1||!G.isBatchedMesh&&Ft.batching===!0||G.isBatchedMesh&&Ft.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&Ft.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&Ft.instancing===!1||!G.isInstancedMesh&&Ft.instancing===!0||G.isSkinnedMesh&&Ft.skinning===!1||!G.isSkinnedMesh&&Ft.skinning===!0||G.isInstancedMesh&&Ft.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&Ft.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&Ft.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&Ft.instancingMorph===!1&&G.morphTexture!==null||Ft.envMap!==Gt||Y.fog===!0&&Ft.fog!==Ct||Ft.numClippingPlanes!==void 0&&(Ft.numClippingPlanes!==Yt.numPlanes||Ft.numIntersection!==Yt.numIntersection)||Ft.vertexAlphas!==ee||Ft.vertexTangents!==de||Ft.morphTargets!==Ut||Ft.morphNormals!==Se||Ft.morphColors!==Ie||Ft.toneMapping!==Pe||Ft.morphTargetsCount!==Ye||!!Ft.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(_e=!0):(_e=!0,Ft.__version=Y.version);let on=Ft.currentProgram;_e===!0&&(on=os(Y,B,G),V&&Y.isNodeMaterial&&V.onUpdateProgram(Y,on,Ft));let xn=!1,Nn=!1,g=!1,b=on.getUniforms(),C=Ft.uniforms;if(m.useProgram(on.program)&&(xn=!0,Nn=!0,g=!0),Y.id!==tt&&(tt=Y.id,Nn=!0),Ft.needsLights){let X=sr(w.state.lightProbeGridArray,G);Ft.lightProbeGrid!==X&&(Ft.lightProbeGrid=X,Nn=!0)}if(xn||at!==S){m.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),b.setValue(N,"projectionMatrix",S.projectionMatrix),b.setValue(N,"viewMatrix",S.matrixWorldInverse);let j=b.map.cameraPosition;j!==void 0&&j.setValue(N,ut.setFromMatrixPosition(S.matrixWorld)),M.logarithmicDepthBuffer&&b.setValue(N,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&b.setValue(N,"isOrthographic",S.isOrthographicCamera===!0),at!==S&&(at=S,Nn=!0,g=!0)}if(Ft.needsLights&&(tn.state.sunShadowMap.length>0&&b.setValue(N,"sunShadowMap",tn.state.sunShadowMap,k),tn.state.directionalShadowMap.length>0&&b.setValue(N,"directionalShadowMap",tn.state.directionalShadowMap,k),tn.state.spotShadowMap.length>0&&b.setValue(N,"spotShadowMap",tn.state.spotShadowMap,k),tn.state.pointShadowMap.length>0&&b.setValue(N,"pointShadowMap",tn.state.pointShadowMap,k)),G.isSkinnedMesh){b.setOptional(N,G,"bindMatrix"),b.setOptional(N,G,"bindMatrixInverse");let X=G.skeleton;X&&(X.boneTexture===null&&X.computeBoneTexture(),b.setValue(N,"boneTexture",X.boneTexture,k))}G.isBatchedMesh&&(b.setOptional(N,G,"batchingTexture"),b.setValue(N,"batchingTexture",G._matricesTexture,k),b.setOptional(N,G,"batchingIdTexture"),b.setValue(N,"batchingIdTexture",G._indirectTexture,k),b.setOptional(N,G,"batchingColorTexture"),G._colorsTexture!==null&&b.setValue(N,"batchingColorTexture",G._colorsTexture,k));let et=J.morphAttributes;if((et.position!==void 0||et.normal!==void 0||et.color!==void 0)&&z.update(G,J,on),(Nn||Ft.receiveShadow!==G.receiveShadow)&&(Ft.receiveShadow=G.receiveShadow,b.setValue(N,"receiveShadow",G.receiveShadow)),(Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial)&&Y.envMap===null&&B.environment!==null&&(C.envMapIntensity.value=B.environmentIntensity),C.dfgLUT!==void 0&&(C.dfgLUT.value=M_()),Nn){if(b.setValue(N,"toneMappingExposure",L.toneMappingExposure),Ft.needsLights&&fl(C,g),Ct&&Y.fog===!0&&Xt.refreshFogUniforms(C,Ct),Xt.refreshMaterialUniforms(C,Y,st,K,w.state.transmissionRenderTarget[S.id]),Ft.needsLights&&Ft.lightProbeGrid){let X=Ft.lightProbeGrid;C.probesSH.value=X.texture,C.probesMin.value.copy(X.boundingBox.min),C.probesMax.value.copy(X.boundingBox.max),C.probesResolution.value.copy(X.resolution)}$s.upload(N,ir(Ft),C,k)}if(Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&($s.upload(N,ir(Ft),C,k),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&b.setValue(N,"center",G.center),b.setValue(N,"modelViewMatrix",G.modelViewMatrix),b.setValue(N,"normalMatrix",G.normalMatrix),b.setValue(N,"modelMatrix",G.matrixWorld),Y.uniformsGroups!==void 0){let X=Y.uniformsGroups;for(let j=0,xt=X.length;j<xt;j++){let Mt=X[j];dt.update(Mt,on),dt.bind(Mt,on)}}return on}function fl(S,B){S.ambientLightColor.needsUpdate=B,S.lightProbe.needsUpdate=B,S.sunLights.needsUpdate=B,S.sunLightShadows.needsUpdate=B,S.directionalLights.needsUpdate=B,S.directionalLightShadows.needsUpdate=B,S.pointLights.needsUpdate=B,S.pointLightShadows.needsUpdate=B,S.spotLights.needsUpdate=B,S.spotLightShadows.needsUpdate=B,S.rectAreaLights.needsUpdate=B,S.hemisphereLights.needsUpdate=B}function ze(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return Q},this.getActiveMipmapLevel=function(){return nt},this.getRenderTarget=function(){return ht},this.setRenderTargetTextures=function(S,B,J){let Y=W.get(S);Y.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),W.get(S.texture).__webglTexture=B,W.get(S.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:J,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,B){let J=W.get(S);J.__webglFramebuffer=B,J.__useDefaultFramebuffer=B===void 0},this.setRenderTarget=function(S,B=0,J=0){ht=S,Q=B,nt=J;let Y=null,G=!1,Ct=!1;if(S){let Rt=W.get(S);if(Rt.__useDefaultFramebuffer!==void 0){m.bindFramebuffer(N.FRAMEBUFFER,Rt.__webglFramebuffer),lt.copy(S.viewport),Ot.copy(S.scissor),yt=S.scissorTest,m.viewport(lt),m.scissor(Ot),m.setScissorTest(yt),tt=-1;return}else if(Rt.__webglFramebuffer===void 0)k.setupRenderTarget(S);else if(Rt.__hasExternalTextures)k.rebindTextures(S,W.get(S.texture).__webglTexture,W.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let ee=S.depthTexture;if(Rt.__boundDepthTexture!==ee){if(ee!==null&&W.has(ee)&&(S.width!==ee.image.width||S.height!==ee.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");k.setupDepthRenderbuffer(S)}}let zt=S.texture;(zt.isData3DTexture||zt.isDataArrayTexture||zt.isCompressedArrayTexture)&&(Ct=!0);let Gt=W.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Gt[B])?Y=Gt[B][J]:Y=Gt[B],G=!0):S.samples>0&&k.useMultisampledRTT(S)===!1?Y=W.get(S).__webglMultisampledFramebuffer:Array.isArray(Gt)?Y=Gt[J]:Y=Gt,lt.copy(S.viewport),Ot.copy(S.scissor),yt=S.scissorTest}else lt.copy(vt).multiplyScalar(st).floor(),Ot.copy(Vt).multiplyScalar(st).floor(),yt=Me;if(J!==0&&(Y=Z),m.bindFramebuffer(N.FRAMEBUFFER,Y)&&m.drawBuffers(S,Y),m.viewport(lt),m.scissor(Ot),m.setScissorTest(yt),G){let Rt=W.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+B,Rt.__webglTexture,J)}else if(Ct){let Rt=B;for(let zt=0;zt<S.textures.length;zt++){let Gt=W.get(S.textures[zt]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+zt,Gt.__webglTexture,J,Rt)}}else if(S!==null&&J!==0){let Rt=W.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Rt.__webglTexture,J)}tt=-1};function _n(S){let B=W.get(S);return(B.__readFormat!==S.format||B.__readType!==S.type)&&(B.__readFormat=S.format,B.__readType=S.type,B.__formatReadable=M.textureFormatReadable(S.format),B.__typeReadable=M.textureTypeReadable(S.type)),B}this.readRenderTargetPixels=function(S,B,J,Y,G,Ct,Nt,Rt=0){if(!(S&&S.isWebGLRenderTarget)){se("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let zt=W.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Nt!==void 0&&(zt=zt[Nt]),zt){m.bindFramebuffer(N.FRAMEBUFFER,zt);try{let Gt=S.textures[Rt],ee=Gt.format,de=Gt.type;S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Rt);let Ut=_n(Gt);if(Ut.__formatReadable===!1){se("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ut.__typeReadable===!1){se("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=S.width-Y&&J>=0&&J<=S.height-G&&N.readPixels(B,J,Y,G,St.convert(ee),St.convert(de),Ct)}finally{let Gt=ht!==null?W.get(ht).__webglFramebuffer:null;m.bindFramebuffer(N.FRAMEBUFFER,Gt)}}},this.readRenderTargetPixelsAsync=async function(S,B,J,Y,G,Ct,Nt,Rt=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let zt=W.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Nt!==void 0&&(zt=zt[Nt]),zt)if(B>=0&&B<=S.width-Y&&J>=0&&J<=S.height-G){m.bindFramebuffer(N.FRAMEBUFFER,zt);let Gt=S.textures[Rt],ee=Gt.format,de=Gt.type;S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Rt);let Ut=_n(Gt);if(Ut.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ut.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Se=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,Se),N.bufferData(N.PIXEL_PACK_BUFFER,Ct.byteLength,N.STREAM_READ),N.readPixels(B,J,Y,G,St.convert(ee),St.convert(de),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let Ie=ht!==null?W.get(ht).__webglFramebuffer:null;m.bindFramebuffer(N.FRAMEBUFFER,Ie);let Pe=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await _u(N,Pe,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,Se),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,Ct),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(Se),N.deleteSync(Pe),Ct}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,B=null,J=0){let Y=Math.pow(2,-J),G=Math.floor(S.image.width*Y),Ct=Math.floor(S.image.height*Y),Nt=B!==null?B.x:0,Rt=B!==null?B.y:0;k.setTexture2D(S,0),N.copyTexSubImage2D(N.TEXTURE_2D,J,0,0,Nt,Rt,G,Ct),m.unbindTexture()},this.copyTextureToTexture=function(S,B,J=null,Y=null,G=0,Ct=0){let Nt,Rt,zt,Gt,ee,de,Ut,Se,Ie,Pe=S.isCompressedTexture?S.mipmaps[Ct]:S.image;if(J!==null)Nt=J.max.x-J.min.x,Rt=J.max.y-J.min.y,zt=J.isBox3?J.max.z-J.min.z:1,Gt=J.min.x,ee=J.min.y,de=J.isBox3?J.min.z:0;else{let C=Math.pow(2,-G);Nt=Math.floor(Pe.width*C),Rt=Math.floor(Pe.height*C),S.isDataArrayTexture?zt=Pe.depth:S.isData3DTexture?zt=Math.floor(Pe.depth*C):zt=1,Gt=0,ee=0,de=0}Y!==null?(Ut=Y.x,Se=Y.y,Ie=Y.z):(Ut=0,Se=0,Ie=0);let fe=St.convert(B.format),Ye=St.convert(B.type),Ft;B.isData3DTexture?(k.setTexture3D(B,0),Ft=N.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(k.setTexture2DArray(B,0),Ft=N.TEXTURE_2D_ARRAY):(k.setTexture2D(B,0),Ft=N.TEXTURE_2D),m.activeTexture(N.TEXTURE0),m.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,B.flipY),m.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),m.pixelStorei(N.UNPACK_ALIGNMENT,B.unpackAlignment);let tn=m.getParameter(N.UNPACK_ROW_LENGTH),_e=m.getParameter(N.UNPACK_IMAGE_HEIGHT),on=m.getParameter(N.UNPACK_SKIP_PIXELS),xn=m.getParameter(N.UNPACK_SKIP_ROWS),Nn=m.getParameter(N.UNPACK_SKIP_IMAGES);m.pixelStorei(N.UNPACK_ROW_LENGTH,Pe.width),m.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Pe.height),m.pixelStorei(N.UNPACK_SKIP_PIXELS,Gt),m.pixelStorei(N.UNPACK_SKIP_ROWS,ee),m.pixelStorei(N.UNPACK_SKIP_IMAGES,de);let g=S.isDataArrayTexture||S.isData3DTexture,b=B.isDataArrayTexture||B.isData3DTexture;if(S.isDepthTexture){let C=W.get(S),et=W.get(B),X=W.get(C.__renderTarget),j=W.get(et.__renderTarget);m.bindFramebuffer(N.READ_FRAMEBUFFER,X.__webglFramebuffer),m.bindFramebuffer(N.DRAW_FRAMEBUFFER,j.__webglFramebuffer);for(let xt=0;xt<zt;xt++)g&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(S).__webglTexture,G,de+xt),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(B).__webglTexture,Ct,Ie+xt)),N.blitFramebuffer(Gt,ee,Nt,Rt,Ut,Se,Nt,Rt,N.DEPTH_BUFFER_BIT,N.NEAREST);m.bindFramebuffer(N.READ_FRAMEBUFFER,null),m.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(G!==0||S.isRenderTargetTexture||W.has(S)){let C=W.get(S),et=W.get(B);m.bindFramebuffer(N.READ_FRAMEBUFFER,O),m.bindFramebuffer(N.DRAW_FRAMEBUFFER,H);for(let X=0;X<zt;X++)g?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,C.__webglTexture,G,de+X):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,C.__webglTexture,G),b?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,et.__webglTexture,Ct,Ie+X):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,et.__webglTexture,Ct),G!==0?N.blitFramebuffer(Gt,ee,Nt,Rt,Ut,Se,Nt,Rt,N.COLOR_BUFFER_BIT,N.NEAREST):b?N.copyTexSubImage3D(Ft,Ct,Ut,Se,Ie+X,Gt,ee,Nt,Rt):N.copyTexSubImage2D(Ft,Ct,Ut,Se,Gt,ee,Nt,Rt);m.bindFramebuffer(N.READ_FRAMEBUFFER,null),m.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else b?S.isDataTexture||S.isData3DTexture?N.texSubImage3D(Ft,Ct,Ut,Se,Ie,Nt,Rt,zt,fe,Ye,Pe.data):B.isCompressedArrayTexture?N.compressedTexSubImage3D(Ft,Ct,Ut,Se,Ie,Nt,Rt,zt,fe,Pe.data):N.texSubImage3D(Ft,Ct,Ut,Se,Ie,Nt,Rt,zt,fe,Ye,Pe):S.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,Ct,Ut,Se,Nt,Rt,fe,Ye,Pe.data):S.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,Ct,Ut,Se,Pe.width,Pe.height,fe,Pe.data):N.texSubImage2D(N.TEXTURE_2D,Ct,Ut,Se,Nt,Rt,fe,Ye,Pe);m.pixelStorei(N.UNPACK_ROW_LENGTH,tn),m.pixelStorei(N.UNPACK_IMAGE_HEIGHT,_e),m.pixelStorei(N.UNPACK_SKIP_PIXELS,on),m.pixelStorei(N.UNPACK_SKIP_ROWS,xn),m.pixelStorei(N.UNPACK_SKIP_IMAGES,Nn),Ct===0&&B.generateMipmaps&&N.generateMipmap(Ft),m.unbindTexture()},this.initRenderTarget=function(S){W.get(S).__webglFramebuffer===void 0&&k.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?k.setTextureCube(S,0):S.isData3DTexture?k.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?k.setTexture2DArray(S,0):k.setTexture2D(S,0),m.unbindTexture()},this.resetState=function(){Q=0,nt=0,ht=null,m.reset(),Pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=ye._getDrawingBufferColorSpace(t),e.unpackColorSpace=ye._getUnpackColorSpace()}};var ed={type:"change"},Jc={type:"start"},id={type:"end"},ul=new Ti,nd=new Mn,S_=Math.cos(70*Ve.DEG2RAD),qe=new D,gn=2*Math.PI,Ce={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},$c=1e-6,js=class extends kr{constructor(t,e=null){super(t,e),this.state=Ce.NONE,this.target=new D,this.cursor=new D,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Li.ROTATE,MIDDLE:Li.DOLLY,RIGHT:Li.PAN},this.touches={ONE:Di.ROTATE,TWO:Di.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new D,this._lastQuaternion=new En,this._lastTargetPosition=new D,this._quat=new En().setFromUnitVectors(t.up,new D(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Gs,this._sphericalDelta=new Gs,this._scale=1,this._panOffset=new D,this._rotateStart=new _t,this._rotateEnd=new _t,this._rotateDelta=new _t,this._panStart=new _t,this._panEnd=new _t,this._panDelta=new _t,this._dollyStart=new _t,this._dollyEnd=new _t,this._dollyDelta=new _t,this._dollyDirection=new D,this._mouse=new _t,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=E_.bind(this),this._onPointerDown=b_.bind(this),this._onPointerUp=T_.bind(this),this._onContextMenu=L_.bind(this),this._onMouseWheel=C_.bind(this),this._onKeyDown=R_.bind(this),this._onTouchStart=P_.bind(this),this._onTouchMove=I_.bind(this),this._onMouseDown=w_.bind(this),this._onMouseMove=A_.bind(this),this._interceptControlDown=D_.bind(this),this._interceptControlUp=N_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=Ce.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();let t=this.domElement.getRootNode();t.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),t.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ed),this.update(),this.state=Ce.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;qe.copy(e).sub(this.target),qe.applyQuaternion(this._quat),this._spherical.setFromVector3(qe),this.autoRotate&&this.state===Ce.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=gn:n>Math.PI&&(n-=gn),s<-Math.PI?s+=gn:s>Math.PI&&(s-=gn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(qe.setFromSpherical(this._spherical),qe.applyQuaternion(this._quatInverse),e.copy(this.target).add(qe),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=qe.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new D(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new D(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=qe.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(ul.origin.copy(this.object.position),ul.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(ul.direction))<S_?this.object.lookAt(this.target):(nd.setFromNormalAndCoplanarPoint(this.object.up,this.target),ul.intersectPlane(nd,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>$c||8*(1-this._lastQuaternion.dot(this.object.quaternion))>$c||this._lastTargetPosition.distanceToSquared(this.target)>$c?(this.dispatchEvent(ed),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?gn/60*this.autoRotateSpeed*t:gn/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){qe.setFromMatrixColumn(e,0),qe.multiplyScalar(-t),this._panOffset.add(qe)}_panUp(t,e){this.screenSpacePanning===!0?qe.setFromMatrixColumn(e,1):(qe.setFromMatrixColumn(e,0),qe.crossVectors(this.object.up,qe)),qe.multiplyScalar(t),this._panOffset.add(qe)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;qe.copy(s).sub(this.target);let r=qe.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(gn*this._rotateDelta.x/e.clientHeight),this._rotateUp(gn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-gn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(gn*this._rotateDelta.x/e.clientHeight),this._rotateUp(gn*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new _t,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function b_(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function E_(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function T_(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(id),this.state=Ce.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function w_(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Li.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Ce.DOLLY;break;case Li.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Ce.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Ce.ROTATE}break;case Li.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Ce.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Ce.PAN}break;default:this.state=Ce.NONE}this.state!==Ce.NONE&&this.dispatchEvent(Jc)}function A_(i){switch(this.state){case Ce.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Ce.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Ce.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function C_(i){this.enabled===!1||this.enableZoom===!1||this.state!==Ce.NONE||(i.preventDefault(),this.dispatchEvent(Jc),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(id))}function R_(i){this.enabled!==!1&&this._handleKeyDown(i)}function P_(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Di.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Ce.TOUCH_ROTATE;break;case Di.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Ce.TOUCH_PAN;break;default:this.state=Ce.NONE}break;case 2:switch(this.touches.TWO){case Di.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Ce.TOUCH_DOLLY_PAN;break;case Di.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Ce.TOUCH_DOLLY_ROTATE;break;default:this.state=Ce.NONE}break;default:this.state=Ce.NONE}this.state!==Ce.NONE&&this.dispatchEvent(Jc)}function I_(i){switch(this._trackPointer(i),this.state){case Ce.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Ce.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Ce.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Ce.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Ce.NONE}}function L_(i){this.enabled!==!1&&i.preventDefault()}function D_(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function N_(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Te=.001,_i=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function sd(i){let t=q=>document.querySelector(q),e=t("#tela"),n;try{n=new Js({canvas:e,antialias:!0,preserveDrawingBuffer:!0})}catch(q){throw t("#semwebgl").style.display="flex",q}n.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),n.outputColorSpace=en;let s=new qi;s.background=new he("#14161b");let r=!0,a=()=>{r=!0},{L:o,A:l,P:c}=i.involucro,h=i.involucro.espessura||2,p=Math.hypot(o,l,c)*Te,u=new D(o*Te/2,l*Te/2,c*Te/2),d=new $e(38,1,.01,p*40),x=new js(d,e);x.enableDamping=!0,x.dampingFactor=.08,x.target.copy(u),x.minDistance=.1,x.maxDistance=p*8,x.zoomToCursor=!0,x.addEventListener("change",a),s.add(new $i("#ffffff","#55524a",1.5)),s.add(new Ji("#ffffff",.55));let E=new Ii("#fff4e0",1.3);E.position.set(o*Te*1.5,l*Te*2,c*Te*6+1),s.add(E);let _=new Ii("#dfe8ff",.5);_.position.set(-o*Te,l*Te,c*Te*3),s.add(_);let f={caixa:new Tn(1,1,1),cilindro:new pi(.5,.5,1,28)};f.cilindro.rotateX(Math.PI/2);let R={caixa:new Ar(f.caixa)},T=new Map;function v(q,M,m){let F=`${q}|${M}|${m?1:0}`;return T.has(F)||T.set(F,new Ke({color:q,roughness:m?.35:.65,metalness:m?.65:.05,transparent:M<1,opacity:M,depthWrite:M>=.99})),T.get(F)}let A=new Map;function w(q,M){let m=`${q}|${M}`;return A.has(m)||A.set(m,new Vn({color:new he(q).multiplyScalar(.45),transparent:M<1,opacity:Math.min(1,M+.25)})),A.get(m)}let I={},y=(q,M=s)=>(I[q]||(I[q]=new Sn,I[q].name=q,M.add(I[q])),I[q]),P=[],L=[],U=new Sn;function V(q,M){let m=Math.max(.5,q.l)*Te,F=Math.max(.5,q.a)*Te,W=Math.max(.5,q.p)*Te,k=q.forma==="cilindro"?"cilindro":"caixa",ft=q.opacidade??1,gt=q.cor||"#cccccc",$=new Ne(f[k],v(gt,ft,q.metal));return $.scale.set(m,k==="cilindro"?m:F,W),$.position.set(q.x*Te+m/2,q.y*Te+F/2,q.z*Te+W/2),!q.semBorda&&k==="caixa"&&$.add(new Kn(R.caixa,w(gt,ft))),$.userData=q,q.info&&P.push($),q.rotulo&&!q.semEtiqueta&&L.push({mesh:$,texto:q.rotulo,el:null,porta:M===U}),M.add($),$}let Z=i.involucro.cor||"#d6d4cf",O=y("involucro");[{x:0,y:0,z:0,l:o,a:l,p:h},{x:0,y:0,z:0,l:h,a:l,p:c},{x:o-h,y:0,z:0,l:h,a:l,p:c},{x:0,y:l-h,z:0,l:o,a:h,p:c},{x:0,y:0,z:0,l:o,a:h,p:c}].forEach(q=>V({...q,cor:Z,rotulo:i.involucro.rotulo,info:i.involucro.info,semEtiqueta:!0},O)),U.position.set(0,0,c*Te),s.add(U),I.porta=U,V({x:0,y:0,z:0,l:o,a:l,p:h,cor:Z,rotulo:i.porta&&i.porta.rotulo,info:i.porta&&i.porta.info,semEtiqueta:!0},U);for(let q of i.porta&&i.porta.itens||[])V({...q,z:h+(q.z||0)},U);for(let q of i.caixas||[])V(q,y(q.camada||"outros"));let H=-Math.PI*.58,Q=i.portaAberta===!1?0:H;U.rotation.y=Q;let nt=()=>Math.abs(U.rotation.y)>.2,ht=null;function tt(q,M,m=700){let F=d.position.clone(),W=x.target.clone(),k=performance.now();ht=ft=>{let gt=Math.min(1,(ft-k)/m),$=gt*gt*(3-2*gt);d.position.lerpVectors(F,q,$),x.target.lerpVectors(W,M,$),gt>=1&&(ht=null)},a()}let at=()=>Math.max(l*Te,o*Te/Math.max(.3,d.aspect*.72))/(2*Math.tan(d.fov*Math.PI/180/2))*1.42+c*Te;function lt(q){let M=window.innerWidth>900?o*Te*.35:0,m=new D(o*Te/2+M,l*Te/2+l*Te*.03,c*Te*.3),F=new D(o*Te/2+M,l*Te/2+l*Te*.03,at());q?(d.position.copy(F),x.target.copy(m),a()):tt(F,m)}function Ot(q){let M=at()*1.05,m=u.clone().add(new D(window.innerWidth>900?o*Te*.3:0,0,0)),F=new D(o*Te/2+M*.38,l*Te*.6+M*.2,M*.95);q?(d.position.copy(F),x.target.copy(m),a()):tt(F,m)}function yt(q,M){I[q]&&(I[q].visible=M),document.querySelectorAll(`[data-camada="${q}"]`).forEach(m=>m.classList.toggle("ativo",M)),a()}function Lt(q=!0){Q=q?H:0,t("#b-porta")&&t("#b-porta").classList.toggle("ativo",q),a()}function Wt(q=!0){yt("involucro",!q),yt("porta",!q),t("#b-placa")&&t("#b-placa").classList.toggle("ativo",q)}let ue=t("#camadas");for(let q of i.camadas||[]){let M=document.createElement("button");M.className="leg ativo",M.dataset.camada=q.id,M.style.setProperty("--cor",q.cor),M.innerHTML=`<i></i><span>${_i(q.rotulo)}${q.qtd!=null?` <small>${_i(q.qtd)}</small>`:""}</span>`,M.onclick=()=>yt(q.id,!(!I[q.id]||I[q.id].visible)),ue&&ue.appendChild(M)}let K=t("#numeros");K&&(K.innerHTML=(i.numeros||[]).map(([q,M])=>`<div class="num"><div>${_i(M)}</div><small>${_i(q)}</small></div>`).join(""));let st=(q,M)=>{let m=t(q);m&&(m.onclick=M)};st("#b-porta",()=>Lt(Q===0)),st("#b-sem-porta",()=>{let q=!I.porta.visible;yt("porta",q),t("#b-sem-porta").classList.toggle("ativo",!q)}),st("#b-involucro",()=>{let q=!I.involucro.visible;yt("involucro",q),t("#b-involucro").classList.toggle("ativo",!q)}),st("#b-frente",()=>lt()),st("#b-3d",()=>Ot()),st("#b-placa",()=>{let q=!t("#b-placa").classList.contains("ativo");Wt(q),q&&lt()});let bt=!0;st("#b-etiquetas",()=>{bt=!bt,t("#b-etiquetas").classList.toggle("ativo",bt),a()}),t("#b-etiquetas")&&t("#b-etiquetas").classList.add("ativo"),t("#b-porta")&&t("#b-porta").classList.toggle("ativo",Q!==0),st("#b-tela",()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()});let Qt=new Ki,vt=new _t,Vt=null;function Me(q){for(let M=q;M;M=M.parent)if(!M.visible)return!1;return!0}function ot(q){let M=e.getBoundingClientRect();return vt.set((q.clientX-M.left)/M.width*2-1,-((q.clientY-M.top)/M.height)*2+1),Qt.setFromCamera(vt,d),Qt.intersectObjects(P.filter(Me),!1)[0]||null}function mt(q){let M=ot(q);Vt&&(Vt.material=Vt.userData.__mat,Vt=null);let m=t("#info");if(a(),!M){m&&(m.innerHTML="<small>Clique num dispositivo para ver TAG, fabricante, referência e medidas.</small>");return}Vt=M.object,Vt.userData.__mat=Vt.material,Vt.material=Vt.material.clone(),Vt.material.emissive.set("#5a4500");let F=Vt.userData;m&&(m.innerHTML=`<b class="tag">${_i(F.rotulo||"")}</b><table>${(F.info||[]).map(([W,k])=>`<tr><th>${_i(W)}</th><td>${/^https?:/.test(String(k))?`<a href="${_i(k)}" target="_blank" rel="noopener">${_i(k)}</a>`:_i(k)}</td></tr>`).join("")}</table>`)}let ct=null;e.addEventListener("pointerdown",q=>{ct=[q.clientX,q.clientY]}),e.addEventListener("pointerup",q=>{ct&&Math.hypot(q.clientX-ct[0],q.clientY-ct[1])<5&&mt(q),ct=null});let pt=document.createElement("div");pt.className="etq-q etq-dica",pt.style.display="none",document.body.appendChild(pt);let ut=0;e.addEventListener("pointermove",q=>{if(q.buttons){pt.style.display="none";return}let M=performance.now();if(M-ut<60)return;ut=M;let m=ot(q),F=m&&(m.object.userData.dica||m.object.userData.rotulo);if(!F){pt.style.display="none";return}pt.textContent=F,pt.style.display="block",pt.style.transform=`translate(${q.clientX+12}px, ${q.clientY-26}px)`}),e.addEventListener("pointerleave",()=>{pt.style.display="none"});let Kt=t("#etiquetas");for(let q of L)q.el=document.createElement("div"),q.el.className="etq-q",q.el.textContent=q.texto,Kt&&Kt.appendChild(q.el),q.larg=0;let Bt=new D;function jt(){let q=e.clientWidth,M=e.clientHeight,m=d.position.distanceTo(x.target),F=2*Math.tan(d.fov*Math.PI/180/2),W=[];for(let k of L){let ft=bt&&Me(k.mesh)&&(k.porta?!nt():nt()||!I.porta.visible)&&m<p*3.2;if(ft){k.mesh.getWorldPosition(Bt);let it=M/(F*Math.max(.05,d.position.distanceTo(Bt)));k.larg||(k.el.style.display="block",k.larg=k.el.offsetWidth||k.texto.length*7+12),ft=k.mesh.scale.x*it>=k.larg*.95}if(!ft){k.el.style.display="none";continue}if(Bt.z+=k.mesh.scale.z/2,Bt.project(d),Bt.z>1){k.el.style.display="none";continue}let gt=(Bt.x+1)/2*q,$=(1-Bt.y)/2*M;if(W.some(it=>Math.abs(it[0]-gt)<(it[2]+k.larg)/2&&Math.abs(it[1]-$)<16)){k.el.style.display="none";continue}W.push([gt,$,k.larg]),k.el.style.display="block",k.el.style.transform=`translate(${gt}px, ${$}px) translate(-50%, -50%)`}}function re(){let q=e.clientWidth||window.innerWidth,M=e.clientHeight||window.innerHeight;n.setSize(q,M,!1),d.aspect=q/M,d.updateProjectionMatrix(),a()}window.addEventListener("resize",re),e.addEventListener("webglcontextrestored",a),re(),Ot(!0),n.compile(s,d);function N(q){ht&&(ht(q),r=!0);let M=Q-U.rotation.y;Math.abs(M)>.001?(U.rotation.y+=M*.12,r=!0):U.rotation.y!==Q&&(U.rotation.y=Q,r=!0),x.update()&&(r=!0),r&&(r=!1,n.render(s,d),jt())}window.HM3D={tipo:"quadro",grupos:I,camera:d,controles:x,cena:s,renderer:n,abrirPorta:(q=!0)=>{Lt(q),U.rotation.y=Q},vistaFrente:()=>{lt(!0)},vista3d:()=>{Ot(!0)},soPlaca:(q=!0)=>Wt(q),mostrar:yt,etiquetas:q=>{bt=q,a()},render:()=>{ht=null,r=!0,N(performance.now())}};function xe(q){requestAnimationFrame(xe),N(q)}N(performance.now()),requestAnimationFrame(xe),document.body.classList.add("pronto")}window.CENA&&window.CENA.tipo==="quadro"?sd(window.CENA):U_();function U_(){let i=window.CENA,t=g=>document.querySelector(g),e=(g,b=2)=>Number(g).toLocaleString("pt-BR",{minimumFractionDigits:b,maximumFractionDigits:b}),n=g=>String(g??"").replace(/[&<>"']/g,b=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[b]),s=i.peDireito,r=i.infra||[],a=1.6,o=.45,l=t("#tela"),c;try{c=new Js({canvas:l,antialias:!0,preserveDrawingBuffer:!0})}catch(g){throw t("#semwebgl").style.display="flex",g}c.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),c.outputColorSpace=en;let h=new qi;h.background=new he("#14161b");let[p,u,d,x]=i.limites,E=d-p,_=x-u,f=Math.hypot(E,_),R=(g,b,C=0)=>new D(g,C,-b),T=new $e(45,1,.1,f*20+50),v=new js(T,l);v.enableDamping=!0,v.dampingFactor=.08,v.maxPolarAngle=Math.PI/2-.02,v.minDistance=.5,v.maxDistance=f*4,v.autoRotateSpeed=.9,v.zoomToCursor=!0,h.add(new $i("#ffffff","#5a5a4e",1.6)),h.add(new Ji("#ffffff",.6));let A=new Ii("#fff4e0",1.4);A.position.set(f*.6,f*.9,f*.4),h.add(A);let w={};function I(g,b=h){return w[g]||(w[g]=new Sn,b.add(w[g])),w[g]}{let g=Math.max(4,f*.15),b=new Ai(E+2*g,_+2*g),C=new Ne(b,new Ke({color:"#3d4334",roughness:1}));C.rotation.x=-Math.PI/2,C.position.set((p+d)/2,-.02,-(u+x)/2),I("terreno").add(C)}{let g=i.ambientes.filter(b=>b.tipo!=="externo"&&b.poligono.length>=3);if(g.length){let b=1/0,C=1/0,et=-1/0,X=-1/0;for(let Mt of g)for(let[kt,Zt]of Mt.poligono)b=Math.min(b,kt),et=Math.max(et,kt),C=Math.min(C,Zt),X=Math.max(X,Zt);let j=new Ai(et-b+.4,X-C+.4),xt=new Ne(j,new Ke({color:"#8c887e",roughness:1}));xt.rotation.x=-Math.PI/2,xt.position.set((b+et)/2,.001,-(C+X)/2),I("terreno").add(xt)}}let y=[];[...i.ambientes].sort((g,b)=>b.area_m2-g.area_m2).forEach((g,b)=>{if(g.poligono.length<3)return;let C=new mi(g.poligono.map(([xt,Mt])=>new _t(xt,Mt))),et=new zs(C),X=(i.tiposAmbiente[g.tipo]||i.tiposAmbiente.outros).cor,j=new Ne(et,new Ke({color:X,roughness:.9,polygonOffset:!0,polygonOffsetFactor:-1-b*.05,polygonOffsetUnits:-1-b}));j.rotation.x=-Math.PI/2,j.position.y=.005+b*4e-4,j.userData={ambiente:g},I("ambientes").add(j),y.push(j)});let L={uAlvo:{value:new D},uDir:{value:new _t(0,0)},uCorte:{value:0},uAltCorte:{value:o},uMargem:{value:.3}};function U(g,b=!1){return g.onBeforeCompile=C=>{Object.assign(C.uniforms,L),C.vertexShader=C.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aParede;
uniform vec3 uAlvo; uniform vec2 uDir; uniform float uCorte; uniform float uAltCorte; uniform float uMargem;`).replace("#include <begin_vertex>",`#include <begin_vertex>
{
  bool frente = uCorte > 0.5 && dot(aParede.xz - uAlvo.xz, uDir) > uMargem;
  ${b?"if (!frente) transformed = vec3(aParede.x, -50.0, aParede.z);":"if (frente) { if (aParede.y >= uAltCorte - 0.01) transformed = vec3(aParede.x, -50.0, aParede.z); else transformed.y = min(transformed.y, uAltCorte); }"}
}`)},g.customProgramCacheKey=()=>b?"corte-fantasma":"corte",g}function V(g,b){let C=[],et=[],X=[],j=[],xt=[],[Mt,kt,Zt]=b.map(ae=>new he(ae)),te=[],Dt=[];for(let[ae,oe,Le,ve,dn,Ue,Ge]of g){let ls=Math.hypot(Le-ae,ve-oe);if(ls<1e-4||Ge<=Ue)continue;let yi=(Le-ae)/ls,zi=(ve-oe)/ls,ni=-zi*dn/2,ki=yi*dn/2,Qr=[[ae+ni,oe+ki],[Le+ni,ve+ki],[Le-ni,ve-ki],[ae-ni,oe-ki]],be=(Un,cs)=>{let[hs,pl]=Qr[Un];return[hs,cs,-pl]},Kc=[(ae+Le)/2,Ue,-(oe+ve)/2,0],rd=[[be(0,Ue),be(1,Ue),be(1,Ge),be(0,Ge),[-zi,0,-yi],Mt],[be(2,Ue),be(3,Ue),be(3,Ge),be(2,Ge),[zi,0,yi],Mt],[be(1,Ue),be(2,Ue),be(2,Ge),be(1,Ge),[yi,0,-zi],Mt],[be(3,Ue),be(0,Ue),be(0,Ge),be(3,Ge),[-yi,0,zi],Mt],[be(0,Ge),be(1,Ge),be(2,Ge),be(3,Ge),[0,1,0],kt],[be(3,Ue),be(2,Ue),be(1,Ue),be(0,Ue),[0,-1,0],Zt]];for(let[Un,cs,hs,pl,ad,ml]of rd){let us=C.length/3;C.push(...Un,...cs,...hs,...pl);for(let jc=0;jc<4;jc++)et.push(...ad),X.push(ml.r,ml.g,ml.b),j.push(...Kc);xt.push(us,us+1,us+2,us,us+2,us+3)}for(let Un=0;Un<4;Un++){let cs=(Un+1)%4;te.push(...be(Un,Ge),...be(cs,Ge),...be(Un,Ue),...be(cs,Ue),...be(Un,Ue),...be(Un,Ge));for(let hs=0;hs<6;hs++)Dt.push(...Kc)}}let ne=new Be;ne.setAttribute("position",new ge(C,3)),ne.setAttribute("normal",new ge(et,3)),ne.setAttribute("color",new ge(X,3)),ne.setAttribute("aParede",new ge(j,4)),ne.setIndex(xt);let $t=new Be;return $t.setAttribute("position",new ge(te,3)),$t.setAttribute("aParede",new ge(Dt,4)),{g:ne,gl:$t}}let Z=U(new Ke({vertexColors:!0,roughness:.88,side:je})),O=U(new Ke({vertexColors:!0,roughness:.88,side:je})),H=U(new Ke({color:"#efeae0",roughness:.9,transparent:!0,opacity:.13,depthWrite:!1,side:je}),!0),Q=U(new Ke({color:"#8ec9ff",roughness:.1,metalness:.1,transparent:!0,opacity:.28,depthWrite:!1,side:je})),nt=U(new Vn({color:"#2f2c27",transparent:!0,opacity:.5})),ht=[];function tt(g,b,C,{cores:et=["#efeae0","#5f594f","#cfc8ba"],arestas:X=!0,fantasma:j=!1}={}){if(!g||!g.length)return null;let{g:xt,gl:Mt}=V(g,et),kt=new Ne(xt,b);if(kt.renderOrder=2,I(C).add(kt),j){let Zt=new Ne(xt,H);Zt.renderOrder=5,I(C).add(Zt),ht.push(Zt)}if(X){let Zt=new Kn(Mt,nt);Zt.renderOrder=3,I(C).add(Zt)}return kt}let at=tt(i.paredes,Z,"paredes",{fantasma:!0});tt(i.muretas,O,"paredes",{cores:["#ddd5c6","#5f594f","#cfc8ba"],fantasma:!0}),tt(i.guardas,Q,"paredes"),tt(i.vidros,Q,"paredes",{arestas:!1});let lt=new Ke({color:"#a5a39c",roughness:.8}),Ot=[];for(let g of i.pilares){if(g.length<3)continue;let b=new Fr(new mi(g.map(([et,X])=>new _t(et,X))),{depth:s,bevelEnabled:!1}),C=new Ne(b,lt);C.rotation.x=-Math.PI/2,I("pilares").add(C),Ot.push({m:C,cx:g.reduce((et,X)=>et+X[0],0)/g.length,cz:-g.reduce((et,X)=>et+X[1],0)/g.length})}if(i.planta){let g=atob(i.planta),b=new Uint8Array(g.length);for(let j=0;j<g.length;j++)b[j]=g.charCodeAt(j);let C=new Int16Array(b.buffer),et=new Float32Array(C.length/2*3);for(let j=0,xt=0;j<C.length;j+=2,xt+=3)et[xt]=C[j]/100,et[xt+1]=.03,et[xt+2]=-C[j+1]/100;let X=new Be;X.setAttribute("position",new ge(et,3)),I("planta").add(new Kn(X,new Vn({color:"#3a382f",transparent:!0,opacity:.6})))}tt(i.folhas.map(([g,b,C,et])=>[g,b,C,et,.04,0,i.alturaPorta]),U(new Ke({color:"#b08457",roughness:.7,transparent:!0,opacity:.85})),"portas",{arestas:!1});function yt(g){let b=[],C=[],et=[];for(let[j,xt]of g){let Mt=j.index?j.toNonIndexed():j,kt=Mt.attributes.position.array,Zt=Mt.attributes.normal.array,[te,Dt,ne]=Array.isArray(xt)?xt:[xt,xt,xt];for(let $t=0;$t<kt.length;$t++)b.push(kt[$t]),C.push(Zt[$t]);for(let $t=0;$t<kt.length/3;$t++)et.push(te,Dt,ne)}let X=new Be;return X.setAttribute("position",new ge(b,3)),X.setAttribute("normal",new ge(C,3)),X.setAttribute("color",new ge(et,3)),X}let Lt=(g,b,C,et=0,X=0,j=0)=>new Tn(g,b,C).translate(et,X,j+C/2),Wt=(g,b,C=0,et=0,X=0,j=14)=>new pi(g,g,b,j).rotateX(Math.PI/2).translate(C,et,X+b/2),ue=(g,b=0,C=0,et=0)=>new Or(g,14,6,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2).translate(b,C,et),K=.12,st={tomada:(g,b,C)=>yt([[Lt(g,b,C),1],[Wt(g*.34,.004,0,0,C),.7],[Wt(g*.065,.004,-g*.14,0,C+.003,8),K],[Wt(g*.065,.004,g*.14,0,C+.003,8),K]]),interruptor:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.52,b*.44,.012,0,0,C),.78],[Lt(g*.12,b*.04,.003,0,b*.14,C+.012),K]]),rede:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.62,b*.34,.004,0,b*.04,C),.7],[Lt(g*.38,b*.17,.004,0,b*.06,C+.003),K],[Lt(g*.14,b*.05,.004,0,-b*.05,C+.003),K]]),coaxial:(g,b,C)=>yt([[Lt(g,b,C),1],[Wt(g*.2,.014,0,0,C),.75],[Wt(g*.06,.004,0,0,C+.014,10),K]]),quadro:(g,b,C)=>yt([[Lt(g,b,C*.85),.68],[Lt(g-.04,b-.04,.012,0,0,C*.85),1.05],[Lt(.025,.1,.02,g/2-.07,0,C*.85+.012),K],[Lt(g*.36,.05,.003,0,b/2-.1,C*.85+.012),.3]]),rack:(g,b,C)=>yt([[Lt(g,b,C*.92),.4],[Lt(g-.03,b-.03,.01,0,0,C*.92),.8],[Lt(g-.1,b-.1,.004,0,0,C*.92+.01),.22],[Lt(.02,.08,.02,g/2-.05,0,C*.92+.01),1.3]]),caixa:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.7,b*.7,.004,0,0,C),.7]]),teclado:(g,b,C)=>{let et=[[Lt(g,b,C),1],[Lt(g*.72,b*.2,.003,0,b*.28,C),K]];for(let X of[.06,-.07,-.2,-.33])for(let j of[-.24,0,.24])et.push([Lt(g*.17,b*.08,.004,j*g,X*b,C),.55]);return yt(et)},acionador:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.6,b*.6,.004,0,0,C),1.5],[Wt(g*.12,.006,0,0,C+.004,12),K]]),sirene:(g,b,C)=>yt([[Lt(g,b,C*.45),.85],[Wt(g*.36,C*.55,0,0,C*.45),1.35]]),barra:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.9,b*.3,.003,0,0,C),.6]]),emergencia:(g,b,C)=>yt([[Lt(g,b,C),.9],[Lt(g*.36,b*.5,.004,-g*.22,0,C),1.8],[Lt(g*.36,b*.5,.004,g*.22,0,C),1.8]]),wallbox:(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.5,b*.18,.003,0,b*.22,C),K],[Wt(g*.16,.05,0,-b*.18,C),.5]]),luminaria:(g,b,C)=>yt([[Lt(g,b,C),.62],[Lt(g-.05,b-.05,.004,0,0,C),1.25]]),"ponto-luz":(g,b,C)=>yt([[Wt(g*.5,C*.25),.7],[ue(g*.3,0,0,C*.25),1.3]]),detector:(g,b,C)=>yt([[Wt(g*.5,C*.3),.78],[Wt(g*.4,C*.7,0,0,C*.3),1.05],[Wt(g*.05,.004,g*.2,0,C,8),K]]),sensor:(g,b,C)=>yt([[Wt(g*.5,C*.35),.85],[ue(g*.32,0,0,C*.35),1.2]]),ap:(g,b,C)=>yt([[Wt(g*.5,C,0,0,0,24),1.1],[Wt(g*.08,.003,0,0,C,8),.4]]),camera:(g,b,C)=>{let et=C-.08;return yt([[Wt(.035,.012),.6],[Lt(.025,.025,.07,0,0,.012),.6],[Wt(g*.5,et,0,0,.08),1],[Lt(g*1.2,.01,et*.85,0,g*.5+.006,.08+et*.18),.85],[Wt(g*.32,.004,0,0,C),K]])},dome:(g,b,C)=>yt([[Wt(g*.5,C*.3),.9],[ue(g*.42,0,0,C*.3),.3]]),"sensor-canto":(g,b,C)=>yt([[Lt(g,b,C),1],[Lt(g*.78,b*.42,.008,0,-b*.12,C),.35],[Wt(g*.06,.003,0,b*.32,C,8),K]]),catraca:(g,b,C)=>yt([[new Tn(g,b,C).translate(0,b/2,0),.9],[new Tn(g*1.05,.04,C*1.02).translate(0,b,0),.6]])},bt={tomada:[.1,.16,.03],interruptor:[.1,.16,.03],quadro:[.6,.8,.15],rack:[.6,.6,.45],luminaria:[.62,.62,.06],"ponto-luz":[.26,.26,.1],detector:[.16,.16,.07],sensor:[.13,.13,.06],camera:[.11,.11,.32],"sensor-canto":[.08,.13,.07],catraca:[.3,1,.8],barra:[.3,.06,.05]},Qt=new Set(["luminaria","ponto-luz","detector","sensor","ap","dome"]);for(let g of i.dispositivos)g.tam=g.tam||bt[g.forma]||[.18,.18,.07],g.montagem=g.montagem||(Qt.has(g.forma)?"teto":g.forma==="catraca"?"piso":g.forma==="camera"||g.forma==="sensor-canto"?"canto":"parede");let vt={uPx:{value:.001},uMin:{value:14},uBase:{value:1},uMinInfra:{value:3}},Vt=40;function Me(g,b,C){let et=new Ke({color:g,vertexColors:!0,emissive:g,emissiveIntensity:C,roughness:.55,metalness:.05});return et.onBeforeCompile=X=>{Object.assign(X.uniforms,{uPx:vt.uPx,uMin:vt.uMin,uBase:vt.uBase,uTam:{value:b}}),X.vertexShader=X.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMin; uniform float uBase; uniform float uTam;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = max(uBase, min(uMin * uPx * distance(cameraPosition, o) / uTam, ${Vt.toFixed(1)}));
  transformed *= s;
}
#endif`),X.fragmentShader=X.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
#ifdef USE_COLOR
totalEmissiveRadiance *= vColor.rgb;
#endif`)},et.customProgramCacheKey=()=>"dispositivo",et}function ot(g,b){return Math.max(vt.uBase.value,Math.min(vt.uMin.value*vt.uPx.value*b/g,Vt))}let mt=[],ct=new He,pt=new D(0,0,1),ut=new D;function Kt(g,b){g.itens.forEach(([C,et,X,j,xt],Mt)=>{ct.position.set(C,X,-et),ct.quaternion.identity(),g.montagem==="teto"?ct.quaternion.setFromUnitVectors(pt,ut.set(0,-1,0)):g.montagem==="piso"?g.forma!=="catraca"&&ct.quaternion.setFromUnitVectors(pt,ut.set(0,1,0)):(j||xt)&&(ut.set(j,0,-xt).normalize(),g.forma==="camera"?ut.y=-.45:g.forma==="sensor-canto"&&(ut.y=-.35),ct.quaternion.setFromUnitVectors(pt,ut.normalize())),ct.scale.set(1,1,1),ct.updateMatrix(),b.setMatrixAt(Mt,ct.matrix)}),b.instanceMatrix.needsUpdate=!0}let Bt=[],jt=new Map;for(let g of i.dispositivos){if(!g.itens.length)continue;let b=g.forma==="luminaria"?.55:g.forma==="ponto-luz"?.5:.22;g.tamMax=Math.max(...g.tam);let C=(st[g.forma]||st.caixa)(...g.tam),et=Me(g.cor,g.tamMax,b);g.montagem==="teto"&&(et.transparent=!0,Bt.push(et));let X=new Yi(C,et,g.itens.length);X.userData={tipo:g},X.renderOrder=1,X.frustumCulled=!1,Kt(g,X),I(`disc:${g.disciplina}`).add(X),mt.push(X),g.malha=X;for(let j of g.itens)jt.has(j[5])||jt.set(j[5],[]),jt.get(j[5]).push([g,j]);if(g.itens.some(j=>Array.isArray(j[7]))){let j=[],xt=[],Mt=[];for(let[Zt,te,Dt,,,,,ne]of g.itens){if(!Array.isArray(ne)||ne.length<6)continue;let $t=[];for(let oe=0;oe<ne.length;oe+=2)$t.push([ne[oe],ne[oe+1]]);let ae=[Zt,Dt,-te];for(let oe=1;oe<$t.length-1;oe++)j.push($t[0][0],.03,-$t[0][1],$t[oe][0],.03,-$t[oe][1],$t[oe+1][0],.03,-$t[oe+1][1]);for(let oe=0;oe<$t.length;oe++){let Le=$t[oe],ve=$t[(oe+1)%$t.length];xt.push(...ae,Le[0],.03,-Le[1],ve[0],.03,-ve[1]),Mt.push(Le[0],.035,-Le[1],ve[0],.035,-ve[1])}}let kt=(Zt,te,Dt=Ne)=>{let ne=new Be;ne.setAttribute("position",new ge(Zt,3));let $t=new Dt(ne,te);return $t.renderOrder=4,I("campo").add($t),$t};kt(j,new fi({color:g.cor,transparent:!0,opacity:.22,depthWrite:!1,side:je})),kt(xt,new fi({color:g.cor,transparent:!0,opacity:.05,depthWrite:!1,side:je})),kt(Mt,new Vn({color:g.cor,transparent:!0,opacity:.7}),Kn)}}function re(g,b){let C=new Ke({color:g,emissive:g,emissiveIntensity:.18,roughness:.45,metalness:.35});return C.onBeforeCompile=et=>{Object.assign(et.uniforms,{uPx:vt.uPx,uMinInfra:vt.uMinInfra,uSecao:{value:b}}),et.vertexShader=et.vertexShader.replace("#include <common>",`#include <common>
uniform float uPx; uniform float uMinInfra; uniform float uSecao;`).replace("#include <begin_vertex>",`#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = clamp(uMinInfra * uPx * distance(cameraPosition, o) / uSecao, 1.0, 15.0);
  transformed.yz *= s;
}
#endif`)},C.customProgramCacheKey=()=>"infra",C}let N=I("infra");for(let g of r){let b=g.segmentos||[],C=Math.floor(b.length/4);if(!C)continue;let et=new Sn;I(`infra:${g.disciplina}`,N).add(et),g.objeto=et;let[X,j]=g.secao||[.05,.05];if(g.forma!=="linha"){let Dt=g.forma==="tubo"?new pi(.5,.5,1,8).rotateZ(Math.PI/2):new Tn(1,1,1),ne=new Yi(Dt,re(g.cor,Math.max(X,j)),C);for(let $t=0;$t<C;$t++){let ae=b[$t*4],oe=b[$t*4+1],Le=b[$t*4+2],ve=b[$t*4+3],dn=Math.hypot(Le-ae,ve-oe);ct.position.set((ae+Le)/2,g.z,-(oe+ve)/2),ct.quaternion.identity(),ct.rotation.set(0,Math.atan2(ve-oe,Le-ae),0),ct.scale.set(dn+X,j,X),ct.updateMatrix(),ne.setMatrixAt($t,ct.matrix)}ne.instanceMatrix.needsUpdate=!0,ne.frustumCulled=!1,ne.renderOrder=1,et.add(ne)}let xt=g.descidas||[],Mt=Math.floor(xt.length/4),kt=g.forma==="tubo"?X:.025;if(Mt&&g.forma!=="linha"){let Dt=new Yi(new pi(.5,.5,1,8),new Ke({color:g.cor,emissive:g.cor,emissiveIntensity:.18,roughness:.45,metalness:.35}),Mt);for(let ne=0;ne<Mt;ne++){let[$t,ae,oe,Le]=xt.slice(ne*4,ne*4+4);ct.position.set($t,(oe+Le)/2,-ae),ct.quaternion.identity(),ct.rotation.set(0,0,0),ct.scale.set(kt,Math.max(.01,Le-oe),kt),ct.updateMatrix(),Dt.setMatrixAt(ne,ct.matrix)}Dt.instanceMatrix.needsUpdate=!0,Dt.frustumCulled=!1,et.add(Dt)}let Zt=new Float32Array((C+Mt)*6);for(let Dt=0;Dt<C;Dt++)Zt.set([b[Dt*4],g.z,-b[Dt*4+1],b[Dt*4+2],g.z,-b[Dt*4+3]],Dt*6);for(let Dt=0;Dt<Mt;Dt++)Zt.set([xt[Dt*4],xt[Dt*4+2],-xt[Dt*4+1],xt[Dt*4],xt[Dt*4+3],-xt[Dt*4+1]],(C+Dt)*6);let te=new Be;te.setAttribute("position",new ge(Zt,3)),et.add(new Kn(te,new Vn({color:g.cor,transparent:!0,opacity:g.forma==="linha"?.95:.8})))}let xe=g=>[g.rotulo,g.material,g.medida].filter(Boolean).join(" "),q=g=>({texto:"medida do desenho",desenho:"medida do desenho",layer:"medida da layer",legenda:"medida da legenda",estimado:"traçado e bitola estimados — conferir"})[g.origem_medida]||"medida padrão ilustrativa",M={paredes:0,corte:!0,ambientes:!0,etiquetas:!0,portas:!0,planta:!0,campo:!1,giro:!1,grandes:!1,infra:!0},m="geral",F=-1,W=null,k=null,ft=0,gt=0,$=new D,it={lateral:0,topo:0},wt=t("#etiquetas"),Xt=i.ambientes.map(g=>{let b=document.createElement("div");return b.className="etq",b.innerHTML=`<b>${n(g.nome)}</b><span>${e(g.area_m2)} m²</span>`,wt.appendChild(b),{a:g,el:b,p:R(g.centro[0],g.centro[1],.05),lado:Math.sqrt(g.area_m2),ret:null}}).sort((g,b)=>b.a.area_m2-g.a.area_m2);function At(){if(!M.etiquetas||m!=="geral"){for(let X of Xt)X.el.style.display="none",X.ret=null;return}let g=l.clientWidth,b=l.clientHeight,C=b/2/Math.tan(Ve.degToRad(T.fov/2)),et=[];for(let X of Xt){ut.copy(X.p).project(T);let j=T.position.distanceTo(X.p),xt=X.lado*C/Math.max(j,.1),Mt=(ut.x+1)/2*g,kt=(1-ut.y)/2*b,Zt=ut.z<1&&xt>38&&Mt>50&&Mt<g-it.lateral-50&&kt>it.topo+18&&kt<b-60;if(Zt){let te=[Mt-55,kt-16,Mt+55,kt+16];et.some(Dt=>te[0]<Dt[2]&&te[2]>Dt[0]&&te[1]<Dt[3]&&te[3]>Dt[1])?Zt=!1:et.push(te)}X.el.style.display=Zt?"":"none",X.ret=Zt?[Mt-60,kt-18,Mt+60,kt+18]:null,Zt&&(X.el.style.transform=`translate(-50%, -50%) translate(${Mt.toFixed(1)}px, ${kt.toFixed(1)}px)`)}}function Tt(g,b){return g.montagem==="teto"?"no teto":g.montagem==="piso"?"no piso":g.montagem==="topo-porta"?"acima da porta":g.montagem==="canto"?`no alto do canto · h = ${e(b[2])} m`:`h = ${e(b[2])} m`}let Yt=t("#etiquetas-pontos"),Jt=[];function ce(g){if(!Jt[g]){let b=document.createElement("div");b.className="etq-p";let C=document.createElement("b"),et=document.createElement("span");b.append(C,et),Yt.appendChild(b),Jt[g]={el:b,b:C,s:et,chave:null}}return Jt[g]}function z(){let g=0;if(Yt&&m==="dentro"&&!k&&M.etiquetas){let b=l.clientWidth,C=l.clientHeight,et=[];for(let[j,xt]of jt.get(F)||[]){if(!j.malha.visible||!j.malha.parent.visible)continue;ut.set(xt[0],xt[2],-xt[1]);let Mt=T.position.distanceTo(ut),kt=ot(j.tamMax,Mt),Zt=j.montagem==="teto";if(ut.y+=Zt?-j.tam[2]*kt:j.montagem==="piso"?j.tam[1]*kt:j.tam[1]/2*kt,ut.project(T),ut.z>1||ut.z<-1)continue;let te=(ut.x+1)/2*b,Dt=(1-ut.y)/2*C;te<20||te>b-it.lateral-20||Dt<it.topo+50||Dt>C-70||et.push({t:j,it:xt,d:Mt,x:te,y:Zt?Dt+46:Dt})}et.sort((j,xt)=>j.d-xt.d);let X=[];for(let j of et){if(g>=30)break;let xt=[j.x-70,j.y-46,j.x+70,j.y-6];if(X.some(Zt=>xt[0]<Zt[2]&&xt[2]>Zt[0]&&xt[1]<Zt[3]&&xt[3]>Zt[1]))continue;X.push(xt);let Mt=ce(g++),kt=`${j.t.simbolo}|${j.it[6]}|${j.it[0]}|${j.it[1]}`;Mt.chave!==kt&&(Mt.chave=kt,Mt.b.textContent=j.t.rotulo,Mt.s.textContent=Tt(j.t,j.it)+(j.it[6]?` · ${j.it[6]}`:""),Mt.el.style.setProperty("--cor",j.t.cor),Mt.el.style.display="",Mt.larg=Mt.el.offsetWidth),Mt.el.style.display="",j.x=Ve.clamp(j.x,Mt.larg/2+4,b-it.lateral-Mt.larg/2-4),Mt.el.style.transform=`translate(-50%, -100%) translate(${j.x.toFixed(1)}px, ${(j.y-6).toFixed(1)}px)`}}for(let b=g;b<Jt.length;b++)Jt[b].el.style.display="none"}let Et=new D((p+d)/2,0,-(u+x)/2);function rt(){let g=l.clientWidth,b=l.clientHeight,C=document.querySelector("aside"),et=g>900&&C?C.offsetWidth+16:0,X=document.querySelector("#barra")?.getBoundingClientRect().bottom||0;return{w:g,h:b,lateral:et,topo:X,livreW:Math.max(200,g-et-32),livreH:Math.max(200,b-X-50)}}function St(g){T.fov=g,T.updateProjectionMatrix()}function Pt(){er(),St(45);let g=rt(),b=Math.max(1,g.w/g.livreW*.85)*Math.max(1,1/T.aspect);T.position.copy(Et).add(new D(f*.42*b,f*.5*b,f*.58*b)),v.target.copy(Et),v.update()}function dt(){er(),St(30);let g=rt(),b=2*Math.tan(Ve.degToRad(T.fov/2)),C=Math.max(E*g.w/(g.livreW*b*T.aspect),_*g.h/(g.livreH*b))*1.04;T.position.copy(Et).add(new D(0,C+s,.001)),v.target.copy(Et),v.update()}function qt([g,b],C){let et=!1;for(let X=0,j=C.length-1;X<C.length;j=X++){let[xt,Mt]=C[X],[kt,Zt]=C[j];Mt>b!=Zt>b&&g<(kt-xt)*(b-Mt)/(Zt-Mt)+xt&&(et=!et)}return et}function Ht(g,b,C){let et=1/0;for(let X=0;X<C.length;X++){let j=C[X],xt=C[(X+1)%C.length],Mt=xt[0]-j[0],kt=xt[1]-j[1],Zt=b[0]*kt-b[1]*Mt;if(Math.abs(Zt)<1e-9)continue;let te=((j[0]-g[0])*kt-(j[1]-g[1])*Mt)/Zt,Dt=((j[0]-g[0])*b[1]-(j[1]-g[1])*b[0])/Zt;te>.05&&Dt>=0&&Dt<=1&&te<et&&(et=te)}return et}let Re={quadro:5,rack:5,teclado:2,caixa:2,wallbox:3};function Ee(g){let b=g.poligono,C=b.length,et=ve=>Math.hypot(b[(ve+1)%C][0]-b[ve][0],b[(ve+1)%C][1]-b[ve][1]),X=Math.max(...b.map((ve,dn)=>et(dn))),j=(jt.get(g.i)||[]).filter(([ve])=>ve.montagem==="parede"||ve.montagem==="canto"),xt=0,Mt=-1;for(let ve=0;ve<C;ve++){let dn=et(ve);if(dn<.85*X)continue;let[Ue,Ge]=[b[ve],b[(ve+1)%C]],ls=0;for(let[zi,ni]of j){let ki=Ge[0]-Ue[0],Qr=Ge[1]-Ue[1],be=Ve.clamp(((ni[0]-Ue[0])*ki+(ni[1]-Ue[1])*Qr)/(dn*dn),0,1);Math.hypot(ni[0]-Ue[0]-ki*be,ni[1]-Ue[1]-Qr*be)<.4&&(ls+=Re[zi.forma]||1)}let yi=ls*10+dn;yi>Mt&&(Mt=yi,xt=ve)}let kt=et(xt),Zt=b[xt],te=b[(xt+1)%C],Dt=[(Zt[0]+te[0])/2,(Zt[1]+te[1])/2],ne=[(te[0]-Zt[0])/kt,(te[1]-Zt[1])/kt],$t=[-ne[1],ne[0]];qt([Dt[0]+$t[0]*.2,Dt[1]+$t[1]*.2],b)||($t=[-$t[0],-$t[1]]);let ae=Ht(Dt,$t,b);if(Number.isFinite(ae)&&ae<2.6&&kt>2.5*ae){let ve=[Dt[0]+$t[0]*ae/2,Dt[1]+$t[1]*ae/2],dn=[ve[0]-ne[0]*(kt/2-.6),ve[1]-ne[1]*(kt/2-.6)];if(qt(dn,b))return{olho:dn,alvo:[ve[0]+ne[0]*kt/2,ve[1]+ne[1]*kt/2],altura:1.5}}let oe=Math.min(ae-.35,Math.max(3,kt*.9));(!Number.isFinite(oe)||oe<.6)&&(oe=Number.isFinite(ae)?ae/2:1.5);let Le=[Dt[0]+$t[0]*oe,Dt[1]+$t[1]*oe];return qt(Le,b)||(Le=g.centro),{olho:Le,alvo:Dt}}function Qe(){T.rotation.order="YXZ",T.rotation.set(gt,ft,0)}function hn(g){let b=ut.copy(g).sub(T.position).normalize();ft=Math.atan2(-b.x,-b.z),gt=Math.asin(Ve.clamp(b.y,-1,1)),Qe()}function Qs(g){return k?$.clone():m==="geral"?v.target.clone():T.position.clone().add(T.getWorldDirection(new D).multiplyScalar(g))}let dl=g=>g<.5?4*g*g*g:1-Math.pow(-2*g+2,3)/2;function is(g,b,C,et,X,j){k={t0:performance.now(),dur:X,p0:T.position.clone(),p1:b.clone(),a0:g,a1:C.clone(),f0:T.fov,f1:et,fim:j},X||ss(performance.now())}function ss(g){if(!k)return;let b=k.dur?Math.min(1,(g-k.t0)/k.dur):1,C=dl(b);if(T.position.lerpVectors(k.p0,k.p1,C),$.lerpVectors(k.a0,k.a1,C),T.rotation.order="XYZ",T.lookAt($),St(k.f0+(k.f1-k.f0)*C),b>=1){let et=k.fim;k=null,et&&et()}}let Dn=null;function ei(g){Dn&&(Dn.geometry.dispose(),Dn.material.dispose(),I("forro").remove(Dn),Dn=null),!(!g||g.poligono.length<3)&&(Dn=new Ne(new zs(new mi(g.poligono.map(([b,C])=>new _t(b,C)))),new fi({color:"#cfccc4",side:je})),Dn.rotation.x=-Math.PI/2,Dn.position.y=s+.002,I("forro").add(Dn))}let tr=t("#dentro");function un(g){tr&&(t("#dentro-nome").textContent=g?g.nome:"",tr.classList.toggle("aberto",!!g),document.body.classList.contains("modo-dentro")!==!!g&&(document.body.classList.toggle("modo-dentro",!!g),_e()),sr())}function xi(g,b={}){let C=typeof g=="number"?i.ambientes[g]:i.ambientes.find(Zt=>Zt.nome===g);if(!C||C.poligono.length<3)return!1;let{olho:et,alvo:X,altura:j}=Ee(C),xt=R(et[0],et[1],a),Mt=R(X[0],X[1],j||1.1),kt=Qs(T.position.distanceTo(Mt));return m==="geral"&&(W={pos:T.position.clone(),alvo:v.target.clone(),fov:T.fov}),m="dentro",F=C.i??i.ambientes.indexOf(C),v.enabled=!1,v.autoRotate=!1,ei(C),un(C),is(kt,xt,Mt,b.fov||70,b.instantaneo?0:1100,()=>hn(Mt)),!0}function er(){m!=="geral"&&(k=null,m="geral",F=-1,ei(null),un(null),T.rotation.order="XYZ",v.enabled=!0,v.autoRotate=M.giro)}function rs(g={}){if(m==="geral")return;let b=W;if(!b){Pt();return}let C=Qs(T.position.distanceTo(b.alvo));m="saindo",ei(null),un(null),is(C,b.pos,b.alvo,b.fov,g.instantaneo?0:900,()=>{m="geral",F=-1,T.rotation.order="XYZ",v.target.copy(b.alvo),v.enabled=!0,v.autoRotate=M.giro,v.update()})}function as(g,b,C){let et=new D(g,a,b),X=T.getWorldDirection(new D),j=et.clone().add(X.multiplyScalar(3));C&&C.i!==F&&(F=C.i,ei(C),un(C)),is(Qs(3),et,j,T.fov,700,()=>hn(j))}function nr(g,b){let C=null;for(let et of i.ambientes)et.poligono.length>=3&&qt([g,b],et.poligono)&&(!C||et.area_m2<C.area_m2)&&(C=et);return C}let os=["sólidas","translúcidas","ocultas"];function ir(){let g=M.paredes;I("paredes").visible=g!==2,I("pilares").visible=g!==2;for(let b of[Z,O])b.transparent=g===1,b.opacity=g===1?b===Z?.42:.6:1,b.depthWrite=g!==1,b.needsUpdate=!0;t("#b-paredes").textContent=`Paredes: ${os[g]}`,t("#b-paredes").classList.toggle("ativo",g!==2)}function Rn(g,b,C){let et=t(g);et&&(et.classList.toggle("ativo",!!M[b]),et.addEventListener("click",()=>{M[b]=!M[b],et.classList.toggle("ativo",M[b]),C()}))}function sr(){vt.uMin.value=(M.grandes?26:14)+(m==="dentro"?6:0),vt.uBase.value=M.grandes?1.5:1,vt.uMinInfra.value=M.grandes?6:3}t("#b-paredes").addEventListener("click",()=>{M.paredes=(M.paredes+1)%3,ir()}),Rn("#b-corte","corte",()=>{}),Rn("#b-ambientes","ambientes",()=>{I("ambientes").visible=M.ambientes}),Rn("#b-etiquetas","etiquetas",()=>{}),Rn("#b-portas","portas",()=>{I("portas").visible=M.portas}),Rn("#b-planta","planta",()=>{I("planta").visible=M.planta}),i.planta||t("#b-planta")?.remove(),Rn("#b-campo","campo",()=>{I("campo").visible=M.campo}),Rn("#b-giro","giro",()=>{v.autoRotate=M.giro&&m==="geral"}),Rn("#b-grandes","grandes",sr),Rn("#b-infra","infra",()=>{N.visible=M.infra}),r.length||t("#b-infra")?.remove(),I("campo").visible=M.campo,t("#b-cima").addEventListener("click",dt),t("#b-3d").addEventListener("click",Pt),t("#b-voltar")?.addEventListener("click",()=>rs()),t("#b-tela")?.addEventListener("click",()=>{let g=document.documentElement;document.fullscreenElement?document.exitFullscreen?.():g.requestFullscreen?.()});let Xn=t("#ir-ambiente");if(Xn){let g=i.ambientes.filter(b=>b.poligono.length>=3).sort((b,C)=>b.nome.localeCompare(C.nome,"pt-BR",{numeric:!0})||b.area_m2-C.area_m2);g.length||Xn.remove();for(let b of g){let C=document.createElement("option");C.value=String(b.i),C.textContent=`${b.nome} (${e(b.area_m2,1)} m²)`,Xn.appendChild(C)}Xn.addEventListener("change",()=>{Xn.value!==""&&xi(Number(Xn.value)),Xn.value="",Xn.blur()})}let fl=t("#disciplinas");for(let[g,b]of Object.entries(i.disciplinas)){let C=i.dispositivos.filter(j=>j.disciplina===g).reduce((j,xt)=>j+xt.itens.length,0),et=r.filter(j=>j.disciplina===g).reduce((j,xt)=>j+xt.comprimento_m,0),X=document.createElement("button");X.className="ativo disc",X.style.setProperty("--cor",b.cor),X.innerHTML=`<i></i>${n(b.rotulo)} <small>${C||!et?C:`${e(et,0)} m`}</small>`,X.addEventListener("click",()=>{let j=I(`disc:${g}`);j.visible=!j.visible,w[`infra:${g}`]&&(w[`infra:${g}`].visible=j.visible),X.classList.toggle("ativo",j.visible)}),fl.appendChild(X)}i.dispositivos.some(g=>g.itens.some(b=>Array.isArray(b[7])))||t("#b-campo")?.remove();let ze=i.numeros,_n=(g,b,C)=>`<div class="num"><div><span>${b}</span> ${g}</div><small>${C}</small></div>`;t("#numeros").innerHTML=[_n(e(ze.area_interna_m2),"m²",`área interna, ${ze.ambientes} ambiente${ze.ambientes===1?"":"s"}`),ze.area_externa_m2?_n(e(ze.area_externa_m2),"m²",`área externa (${ze.ambientes_externos})`):"",_n(`${e(ze.dimensoes_m[0],1)} × ${e(ze.dimensoes_m[1],1)}`,"m","dimensões gerais"),_n(e(ze.pe_direito_m),"m","pé-direito adotado"),_n(ze.paredes_m.toLocaleString("pt-BR"),"m",`de paredes (≈ ${ze.paredes_area_m2.toLocaleString("pt-BR")} m² de face)`),_n(ze.portas,"un","portas"),ze.janelas?_n(ze.janelas,"un","janelas / esquadrias"):"",ze.pilares?_n(ze.pilares,"un","pilares"):"",...ze.dispositivos.map(g=>_n(g.quantidade,"un",n(g.rotulo))),...r.map(g=>_n(e(g.comprimento_m,1),"m",`${n(xe(g))} · ${n(i.disciplinas[g.disciplina]?.rotulo||g.disciplina)}${g.estimado?" (estimado)":""}`))].join(""),t("#lista-ambientes").innerHTML=`<table><thead><tr><th>Ambiente</th><th>m²</th><th>perím. m</th></tr></thead><tbody>${[...ze.por_ambiente].sort((g,b)=>g.nome.localeCompare(b.nome,"pt-BR",{numeric:!0})).map(g=>`<tr><td><i style="background:${(i.tiposAmbiente[g.tipo]||i.tiposAmbiente.outros).cor}"></i>${n(g.nome)}</td><td>${e(g.area_m2)}</td><td>${e(g.perimetro_m,1)}</td></tr>`).join("")}</tbody></table>`;let S=t("#legenda");S.innerHTML=i.dispositivos.map((g,b)=>`<button class="leg ativo" data-i="${b}" title="Mostrar/ocultar"><i class="f-${n(g.forma)}" style="--cor:${n(g.cor)}"></i><span>${n(g.rotulo)}<small>${n(i.disciplinas[g.disciplina]?.rotulo||"")} · ${n(g.altura)}</small></span><b>${g.itens.length}</b></button>`).join("")+r.map((g,b)=>`<button class="leg ativo" data-infra="${b}" title="Mostrar/ocultar"><i class="f-infra f-${n(g.forma)}" style="--cor:${n(g.cor)}"></i><span>${n(xe(g))}<small>${n(i.disciplinas[g.disciplina]?.rotulo||g.disciplina)} · h = ${e(g.z)} m · ${n(q(g))}${g.layers?.length?` · ${n(g.layers.slice(0,2).join(", "))}`:""}</small></span><b>${e(g.comprimento_m,1)} m</b></button>`).join("")+`<div class="tipos">${[...new Set(i.ambientes.map(g=>g.tipo))].map(g=>`<span><i style="background:${i.tiposAmbiente[g].cor}"></i>${n(i.tiposAmbiente[g].rotulo)}</span>`).join("")}</div>`,S.querySelectorAll(".leg").forEach(g=>g.addEventListener("click",()=>{let b=g.dataset.infra!=null?r[Number(g.dataset.infra)].objeto:i.dispositivos[Number(g.dataset.i)].malha;b&&(b.visible=!b.visible,g.classList.toggle("ativo",b.visible))}));function B(g,b){let C=l.getBoundingClientRect(),et=g-C.left,X=b-C.top,j=C.width,xt=C.height,Mt=null;for(let kt of i.dispositivos){let Zt=kt.malha;if(!(!Zt||!Zt.visible||!Zt.parent.visible))for(let te of kt.itens){ut.set(te[0],te[2],-te[1]);let Dt=T.position.distanceTo(ut);if(m==="dentro"&&te[5]!==F&&Dt>4||(ut.project(T),ut.z>1||ut.z<-1))continue;let ne=(ut.x+1)/2*j,$t=(1-ut.y)/2*xt,ae=Math.max(10,kt.tamMax*ot(kt.tamMax,Dt)/(Dt*vt.uPx.value)/2),oe=Math.hypot(ne-et,$t-X);oe<=ae&&(!Mt||oe<Mt.dd-2||Math.abs(oe-Mt.dd)<=2&&Dt<Mt.d)&&(Mt={t:kt,it:te,d:Dt,dd:oe})}}return Mt}let J=new D;function Y(g,b){let C=l.getBoundingClientRect(),et=g-C.left,X=b-C.top,j=C.width,xt=C.height,Mt=(te,Dt,ne)=>(J.set(te,Dt,ne).project(T),J.z>1||J.z<-1?null:[(J.x+1)/2*j,(1-J.y)/2*xt]),kt=(te,Dt)=>{let ne=Dt[0]-te[0],$t=Dt[1]-te[1],ae=ne*ne+$t*$t,oe=ae?Math.max(0,Math.min(1,((et-te[0])*ne+(X-te[1])*$t)/ae)):0;return Math.hypot(et-te[0]-ne*oe,X-te[1]-$t*oe)},Zt=null;for(let te of r){if(!te.objeto||!te.objeto.visible||!te.objeto.parent.visible||!N.visible)continue;let Dt=te.segmentos||[],ne=te.descidas||[],$t=(ae,oe)=>{if(!ae||!oe)return;let Le=kt(ae,oe);Le<=8&&(!Zt||Le<Zt.d)&&(Zt={g:te,d:Le})};for(let ae=0;ae+3<Dt.length;ae+=4)$t(Mt(Dt[ae],te.z,-Dt[ae+1]),Mt(Dt[ae+2],te.z,-Dt[ae+3]));for(let ae=0;ae+3<ne.length;ae+=4)$t(Mt(ne[ae],ne[ae+2],-ne[ae+1]),Mt(ne[ae],ne[ae+3],-ne[ae+1]))}return Zt&&Zt.g}let G=t("#dica");function Ct(g,b){let C=B(g,b),et=l.getBoundingClientRect(),X=C?null:Y(g,b);if(!C&&!X)return G.style.display="none",l.style.cursor="",!1;if(X)G.innerHTML=`<b>${n(xe(X))}</b><br>${n(i.disciplinas[X.disciplina]?.rotulo||X.disciplina)} · h = ${e(X.z)} m · ${e(X.comprimento_m,1)} m${X.descidas_m?` (${e(X.descidas_m,1)} m de descidas)`:""}<br><small>${n(q(X))}${X.layers?.length?` · layer ${n(X.layers.slice(0,2).join(", "))}`:""}</small>`;else{let{t:j,it:xt}=C,Mt=i.ambientes[xt[5]];G.innerHTML=`<b>${n(j.rotulo)}</b>${xt[6]?` · ${n(xt[6])}`:""}<br>${Mt?`${n(Mt.nome)} · `:""}${n(Tt(j,xt))}<br><small>${n(i.disciplinas[j.disciplina]?.rotulo||"")}</small>`}return G.style.display="block",G.style.left=`${Math.max(8,Math.min(g-et.left+14,et.width-290))}px`,G.style.top=`${b-et.top+14}px`,l.style.cursor="pointer",!0}let Nt=null;l.addEventListener("pointermove",g=>{g.pointerType!=="mouse"||g.buttons||(Nt||requestAnimationFrame(()=>{let b=Nt;Nt=null,b&&Ct(b.clientX,b.clientY)}),Nt=g)}),l.addEventListener("pointerleave",g=>{g.pointerType==="mouse"&&(G.style.display="none")});let Rt=new Ki,zt=new _t;function Gt(g,b){if(k)return!1;let C=l.getBoundingClientRect(),et=g-C.left,X=b-C.top;if(m==="geral"){for(let kt of Xt)if(kt.ret&&et>=kt.ret[0]&&et<=kt.ret[2]&&X>=kt.ret[1]&&X<=kt.ret[3])return xi(kt.a.i)}zt.set(et/C.width*2-1,-(X/C.height)*2+1),Rt.setFromCamera(zt,T);let j=m==="dentro"&&at&&I("paredes").visible?[...y,at]:y,xt=Rt.intersectObjects(j,!1)[0];if(!xt||xt.object===at)return!1;let Mt=xt.object.userData.ambiente;return m==="dentro"?(as(xt.point.x,xt.point.z,Mt),!0):xi(Mt.i)}let ee=new Map,de="mouse",Ut=null,Se=null,Ie=null,Pe=0;l.addEventListener("dblclick",g=>{de!=="touch"&&Gt(g.clientX,g.clientY)}),l.addEventListener("pointerdown",g=>{if(de=g.pointerType,ee.set(g.pointerId,{x:g.clientX,y:g.clientY}),Se=ee.size===1?{x:g.clientX,y:g.clientY,t:g.timeStamp}:null,m==="dentro"&&(l.setPointerCapture?.(g.pointerId),ee.size===2)){let[b,C]=[...ee.values()];Ut={d:Math.hypot(b.x-C.x,b.y-C.y),fov:T.fov}}}),l.addEventListener("pointermove",g=>{let b=ee.get(g.pointerId);if(!b)return;let C=g.clientX-b.x,et=g.clientY-b.y;if(b.x=g.clientX,b.y=g.clientY,!(m!=="dentro"||k)){if(ee.size===1){let X=Ve.degToRad(T.fov)/Math.max(l.clientHeight,1);ft+=C*X,gt=Ve.clamp(gt+et*X,-1.45,1.45),Qe()}else if(ee.size===2&&Ut){let[X,j]=[...ee.values()];St(Ve.clamp(Ut.fov*Ut.d/Math.max(Math.hypot(X.x-j.x,X.y-j.y),1),15,90))}}}),l.addEventListener("pointerup",g=>{let b=Se;if(ee.delete(g.pointerId),ee.size<2&&(Ut=null),!b||ee.size||!(g.timeStamp-b.t<350&&Math.hypot(g.clientX-b.x,g.clientY-b.y)<10)||g.pointerType!=="touch")return;let et=g.timeStamp;if(Ie&&et-Ie.t<450&&Math.hypot(g.clientX-Ie.x,g.clientY-Ie.y)<30){Ie=null,Gt(g.clientX,g.clientY);return}Ie={x:g.clientX,y:g.clientY,t:et},Ct(g.clientX,g.clientY)&&(clearTimeout(Pe),Pe=setTimeout(()=>{G.style.display="none"},3e3))}),l.addEventListener("pointercancel",g=>{ee.delete(g.pointerId),Ut=null,Se=null}),l.addEventListener("wheel",g=>{m==="dentro"&&(g.preventDefault(),St(Ve.clamp(T.fov*Math.exp(g.deltaY*.0012),15,90)))},{passive:!1});let fe=new Set;window.addEventListener("keydown",g=>{if(!(g.target&&/INPUT|SELECT|TEXTAREA/.test(g.target.tagName))){if(g.key==="Escape"&&m==="dentro"){rs();return}m==="dentro"&&/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(g.key)&&(fe.add(g.key.toLowerCase()),g.preventDefault())}}),window.addEventListener("keyup",g=>fe.delete(g.key.toLowerCase())),window.addEventListener("blur",()=>fe.clear());function Ye(g){if(m!=="dentro"||k||!fe.size)return;let b=(fe.has("arrowup")||fe.has("w")?1:0)-(fe.has("arrowdown")||fe.has("s")?1:0),C=(fe.has("d")?1:0)-(fe.has("a")?1:0),et=(fe.has("arrowleft")?1:0)-(fe.has("arrowright")?1:0);if(et&&(ft+=et*1.6*g,Qe()),!b&&!C)return;let X=1.8*g;T.position.x+=(-Math.sin(ft)*b+Math.cos(ft)*C)*X,T.position.z+=(-Math.cos(ft)*b-Math.sin(ft)*C)*X;let j=nr(T.position.x,-T.position.z);j&&j.i!==F&&(F=j.i,ei(j),un(j))}function Ft(){let g=0,b=k?$:v.target;if(M.corte&&m!=="dentro"&&M.paredes!==2){let X=T.position.x-b.x,j=T.position.z-b.z,xt=Math.hypot(X,j),Mt=Math.abs(T.position.y-b.y);xt>.35*Mt&&xt>.5&&(g=1,L.uDir.value.set(X/xt,j/xt),L.uAlvo.value.copy(b))}L.uCorte.value=g;let C=m!=="dentro"&&T.position.y>s+.3;for(let X of Bt)X.opacity=C?.45:1,X.depthWrite=!C;for(let X of ht)X.visible=g===1&&M.paredes===0;let et=L.uDir.value;for(let X of Ot){let j=g===1&&(X.cx-b.x)*et.x+(X.cz-b.z)*et.y>L.uMargem.value;X.m.scale.z=j?o/s:1}}function tn(){let g=m==="dentro"||k?.05:Ve.clamp(T.position.distanceTo(v.target)*.01,.05,1);Math.abs(T.near-g)>T.near*.25&&(T.near=g,T.updateProjectionMatrix())}function _e(){let g=rt();it=g,c.setSize(g.w,g.h,!1),T.aspect=g.w/Math.max(g.h,1),T.setViewOffset(g.w,g.h,g.lateral/2,-(g.topo-44)/2,g.w,g.h),T.updateProjectionMatrix()}window.addEventListener("resize",_e),window.addEventListener("load",_e),_e(),ir(),sr(),Pt();let on=performance.now();function xn(g=performance.now()){let b=Math.min(.1,Math.max(0,(g-on)/1e3));on=g,ss(g),Ye(b),m==="geral"&&!k&&v.update(),tn(),vt.uPx.value=2*Math.tan(Ve.degToRad(T.fov/2))/Math.max(l.clientHeight,1),Ft(),c.render(h,T),At(),z()}window.HM3D={vista3d:Pt,vistaDeCima:dt,entrarAmbiente:xi,voltarVistaGeral:rs,grupos:w,estado:M,renderer:c,camera:T,controles:v,cena:h,olhar:(g,b=0)=>{m==="dentro"&&(ft=Ve.degToRad(g),gt=Ve.degToRad(b),Qe())},girarCabeca:(g,b)=>{m==="dentro"&&(ft+=Ve.degToRad(g),b!=null&&(gt=Ve.degToRad(b)),Qe())},lente:g=>St(Ve.clamp(g,15,90)),olharPara:(g,b,C)=>{m==="dentro"&&hn(R(g,b,C))},irPara:(g,b)=>{if(m==="dentro"){T.position.set(g,a,-b);let C=nr(g,b);C&&C.i!==F&&(F=C.i,ei(C),un(C))}},escolherDispositivo:B,mostrarDica:Ct,aoDuploClique:Gt,get modo(){return m},get ambienteAtual(){return F},render:()=>xn(performance.now())};function Nn(g){requestAnimationFrame(Nn),xn(g)}requestAnimationFrame(Nn),document.body.classList.add("pronto")}})();
