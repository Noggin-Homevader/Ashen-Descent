/* Title-screen art from Ashen Descent (game source: title.js + title2.js, runes from runeui.js).
   Copied unchanged apart from this header and the RUG rune table, so the launcher looks exactly like the game's
   main menu without running the game: the shard-cut ASHEN / DESCENT logo, the WebGL ember portal, the rune-scribed
   stone ring around it and the drifting embers. If the title screen changes, copy the new functions over. */
'use strict';
var RUG=["M-3 4L0-4L3 4M0-4V1M-2 1L2 1", "M0-4V4M-3-2L3 2M-3 2L3-2M-2-4L2-4", "M-3-3L-1-1L1-3L3-1M-3 1L-1 3L1 1L3 3", "M1-4L-2 0L2 0L-1 4", "M-3 4L-3-1L0-4L3-1L3 4L-3 4", "M-3 4L3-4M-3 0L0-4M0 4L3 0", "M0-4V4M-3-2L0-4L3-2M-2 1L2 1", "M0-4V4M-3-4L0-1L3-4M-2 3L2 3", "M-3-4L3 4M3-4L0-1M-3 4L0 1", "M-3 4L-1-4L1 4L3-4", "M0-4V4M-3-1L0-3L3-1M-3 1L0 3L3 1", "M0 4V-1M0-1L-3-4M0-1L3-4M0 2L-2 0M0 2L2 0", "M0-4V4M-3 4L0 1L3 4M-2-2L2-2", "M-3-4L-3 2L0 4L3 2L3-4L-3-4M0-4V4", "M0 4V-4M-3-2L3-2M-2 1L2 1M-1 3L1 3", "M-3 4V-1L0-4L3-1V4M0 4V0M-1 0L1 0", "M-3-4L3-4M-2-4V4M2-4V4M-3 4L3 4", "M0 4V-4M-3-1L0-4L3-1M-2 4L0 2L2 4", "M-3-3L0-4L3-3L3 1L0 4L-3 1L-3-3M0-2V2", "M0-4L3 0L0 4L-3 0L0-4M0-1V1", "M-3-2L0-4L3-2L0 0L-3-2M0 0V4M-2 2L2 2", "M-3 4L3-4M0-4L3-4L3-1M-1 1L1 3", "M-3-3L0 0L-3 3M0-3L3 0L0 3", "M0-4V0M-3 0L3 0L0 4L-3 0", "M0 4V-4M-3-3L0 0L3-3M-3 1L0 4L3 1", "M-3-4L3-4L-3 4L3 4L-3-4"];
var TGLY={
 A:{p:[[0,130],[22,56],[13,52],[40,0],[62,0],[100,130],[72,130],[65,103],[35,103],[27,130]],h:[[40,80],[50,40],[60,80]],c:[[20,118],[30,84],[26,74],[42,22]]},
 S:{p:[[96,0],[24,0],[2,22],[2,58],[20,74],[64,74],[72,82],[72,104],[64,112],[6,112],[0,130],[78,130],[98,108],[98,70],[80,54],[36,54],[28,46],[28,28],[36,20],[90,20]],c:[[84,10],[30,10],[14,26],[14,52],[24,64],[70,64],[84,76],[84,104],[70,120],[14,121]]},
 H:{p:[[0,0],[26,0],[26,52],[74,52],[74,0],[100,0],[93,42],[100,130],[74,130],[74,77],[26,77],[26,130],[0,130],[7,70]],c:[[12,10],[16,40],[12,70],[16,118],[16,64],[50,64],[86,64],[84,96],[88,120]]},
 E:{p:[[0,0],[100,0],[90,20],[28,20],[28,54],[82,54],[73,74],[28,74],[28,110],[100,110],[92,130],[0,130],[7,64]],c:[[14,10],[60,10],[84,10],[14,10],[18,62],[14,120],[80,120]]},
 N:{p:[[0,130],[5,0],[28,0],[72,84],[72,0],[100,0],[95,130],[72,130],[28,48],[28,130]],c:[[14,120],[17,10],[50,62],[86,118],[86,10]]},
 D:{p:[[0,0],[62,0],[100,34],[100,96],[62,130],[0,130],[7,66]],h:[[28,22],[54,22],[74,42],[74,88],[54,108],[28,108]],c:[[14,12],[58,11],[88,40],[88,90],[58,120],[14,120]]},
 C:{p:[[100,0],[34,0],[0,34],[0,96],[34,130],[100,130],[92,108],[46,108],[28,90],[28,40],[46,22],[92,22]],c:[[90,10],[40,10],[13,38],[13,92],[40,120],[90,120]]},
 T:{p:[[0,0],[100,0],[94,22],[62,22],[58,130],[42,130],[38,22],[6,22]],c:[[8,10],[92,10],[50,10],[50,70],[46,124]]}};
function tGlyph(ch,id){const g=TGLY[ch];if(!g)return'';const pt=a=>a.map(q=>q.join(',')).join(' '),d='M'+pt(g.p)+'Z'+(g.h?'M'+pt(g.h)+'Z':'');
 return`<g><clipPath id="tc${id}"><path d="${d}" clip-rule="evenodd"/></clipPath>
 <path d="${d}" fill-rule="evenodd" fill="url(#tgF)" stroke="#120b07" stroke-width="7" stroke-linejoin="miter"/>
 <g clip-path="url(#tc${id})"><path d="${d}" fill="none" stroke="url(#tgB)" stroke-width="11" stroke-linejoin="miter"/><path d="${d}" fill="none" stroke="#2a1a10" stroke-width="3"/>
 <polyline points="${pt(g.c)}" fill="none" stroke="#ff8a2a" stroke-width="3.2" stroke-linejoin="bevel" class="tgk" filter="url(#tgG)"/><polyline points="${pt(g.c)}" fill="none" stroke="#ffe2a0" stroke-width="1.1" stroke-linejoin="bevel"/></g>
 <path d="${d}" fill-rule="evenodd" fill="none" stroke="#d8b58a" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="miter"/></g>`}
/* lay letters along an arc: up=true puts their tops outward (an arch), false points their tops toward the centre (a smile) */
function tArc(word,cx,cy,r,a0,a1,sz,up,id){let h='';const n=word.length;for(let i=0;i<n;i++){const t=n>1?i/(n-1):.5,a=(a0+(a1-a0)*t)*Math.PI/180,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r,rot=a*180/Math.PI+(up?90:-90),j=(i%2?1:-1)*3;
  h+=`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(rot+j).toFixed(1)}) scale(${(sz/130).toFixed(3)}) translate(-50,${up?-130:-130})">${tGlyph(word[i],id+i)}</g>`}return h}
function tDefs(){return`<defs><linearGradient id="tgF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e4a3c"/><stop offset=".45" stop-color="#2c1f17"/><stop offset=".8" stop-color="#3a1c0e"/><stop offset="1" stop-color="#7a3212"/></linearGradient>
 <linearGradient id="tgB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d8b0"/><stop offset=".35" stop-color="#9a8068"/><stop offset=".7" stop-color="#5a4232"/><stop offset="1" stop-color="#c86a2a"/></linearGradient>
 <filter id="tgG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="tgS" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".85"/><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#ff6a1a" flood-opacity=".35"/></filter></defs>`}
function tLogo(small){return`<svg viewBox="0 0 1000 1000" class="tlogo${small?' sm':''}" aria-label="Ashen Descent">${tDefs()}<g filter="url(#tgS)">${tArc('ASHEN',500,530,350,-150,-30,200,true,'a')}${tArc('DESCENT',500,515,418,145,35,128,false,'d')}</g></svg>`}

/* the portal: a small WebGL vortex of ember and ash */
var TPORT=(()=>{let gl=null,pr=null,cv=null,raf=0,t0=performance.now();
 const VS='attribute vec2 p;varying vec2 u;void main(){u=p;gl_Position=vec4(p,0.,1.);}';
 const FS='precision mediump float;varying vec2 u;uniform float T;'+
 'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}'+
 'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}'+
 'float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+1.7;a*=.5;}return s;}'+
 'void main(){vec2 p=u*1.08;float r=length(p);if(r>1.04){gl_FragColor=vec4(0.);return;}float a=atan(p.y,p.x);float tw=2.6*(1.-r)*(1.-r)+T*.55;'+
 'float ca=cos(tw),sa=sin(tw);vec2 q=vec2(ca*p.x-sa*p.y,sa*p.x+ca*p.y);float an=atan(q.y,q.x),lr=log(r+.03);'+
 'float arm=.5+.5*sin(an*3.-lr*5.+T*2.);float m=fb(vec2(an*1.9,lr*3.-T*1.6))*.8+fb(q*3.+T*.2)*.4;float b=smoothstep(.2,.95,arm*.5+m*.75-.25);'+
 'vec3 c=mix(vec3(.05,.02,.02),vec3(.45,.12,.04),smoothstep(.1,.8,m));c=mix(c,vec3(1.,.5,.12),b);c=mix(c,vec3(1.,.86,.5),smoothstep(.8,1.,b+fb(q*7.+T)*.3)*.6);'+
 'float eye=pow(1.-r,4.);c=mix(c,vec3(.02,.0,.0),eye*.9);c+=vec3(1.,.55,.2)*pow(1.-r,16.)*.6;'+
 'float rim=smoothstep(.86,.97,r)*(1.-smoothstep(.97,1.02,r));float runes=step(.55,h(floor(vec2((a/6.2832+T*.02)*44.,1.))))*smoothstep(.89,.93,r)*(1.-smoothstep(.95,.97,r));'+
 'c+=vec3(1.,.6,.25)*rim*1.2+vec3(1.,.8,.4)*runes*.9;c*=1.-smoothstep(.97,1.04,r)*.0;float al=1.-smoothstep(1.0,1.04,r);gl_FragColor=vec4(c*al,al);}';
 function init(c){cv=c;gl=c.getContext('webgl',{premultipliedAlpha:true,alpha:true});if(!gl)return false;const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
  pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return false;
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);return true}
 function frame(){raf=0;if(!cv||!cv.isConnected)return;const w=cv.clientWidth*Math.min(2,devicePixelRatio||1)|0;if(cv.width!==w){cv.width=w;cv.height=w}
  gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(pr);const l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  gl.uniform1f(gl.getUniformLocation(pr,'T'),(performance.now()-t0)/1000);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);raf=requestAnimationFrame(frame)}
 return{mount(c){try{if(c!==cv){if(!init(c))return}if(!raf)raf=requestAnimationFrame(frame)}catch(e){}}}})();

/* drifting embers and ash behind the splash */
function tEmbers(cv){const g=cv.getContext('2d'),P_=[];let last=performance.now();
 function step(){if(!cv.isConnected)return;const w=cv.width=cv.clientWidth,h=cv.height=cv.clientHeight,n=performance.now(),dt=Math.min(.05,(n-last)/1000);last=n;
  while(P_.length<70)P_.push({x:Math.random()*w,y:h+Math.random()*h*.5,v:20+Math.random()*50,s:1+Math.random()*2.5,a:Math.random()*6,e:Math.random()<.6});
  g.clearRect(0,0,w,h);for(const p of P_){p.y-=p.v*dt;p.a+=dt;p.x+=Math.sin(p.a)*12*dt;if(p.y<-10){p.y=h+10;p.x=Math.random()*w}
   const k=Math.max(0,Math.min(1,p.y/h));g.globalAlpha=(p.e?.85:.4)*k;g.fillStyle=p.e?(p.s>2.4?'#ffd890':'#ff7a2a'):'#8a827a';g.beginPath();g.arc(p.x,p.y,p.s,0,7);g.fill()}g.globalAlpha=1;requestAnimationFrame(step)}step()}

function tRingSvg(){const N=20,ri=74,ro=95,TAU=Math.PI*2,pt=(r,a)=>[(Math.cos(a)*r).toFixed(2),(Math.sin(a)*r).toFixed(2)];
 const R_=typeof RUG!='undefined'?RUG:[];let st='',rn='';
 for(let k=0;k<N;k++){const a0=(k/N)*TAU-Math.PI/2+.012,a1=((k+1)/N)*TAU-Math.PI/2-.012,am=(a0+a1)/2,key=k==0||k==N-1,ro2=ro+(k%3==1?1.5:0)+(key?4:0);
  const p=[pt(ri,a0),pt(ro2,a0),pt(ro2,(a0*2+a1)/3),pt(ro2,(a0+a1*2)/3),pt(ro2,a1),pt(ri,a1)].map(q=>q.join(',')).join(' ');
  st+=`<polygon points="${p}" fill="url(#trS${k%3})" stroke="#0e0805" stroke-width="1.1"/><polyline points="${[pt(ri+1.2,a0+.01),pt(ro2-1.2,a0+.01)].map(q=>q.join(',')).join(' ')}" stroke="#ffffff22" stroke-width=".8" fill="none"/>`;
  const g=R_[(k*7+3)%Math.max(1,R_.length)];if(g){const c=pt((ri+ro)/2,am),rot=am*180/Math.PI+90;
   rn+=`<g transform="translate(${c[0]} ${c[1]}) rotate(${rot.toFixed(1)}) scale(1.05)"><path d="${g}" class="trc" style="animation-delay:${(-k*.37).toFixed(2)}s"/></g>`}}
 /* the keystone gem at the top */
 const ks=`<g transform="translate(0 -${ro+2})"><polygon points="-9,-6 9,-6 7,7 -7,7" fill="url(#trS1)" stroke="#0e0805" stroke-width="1.1"/><circle r="3.6" fill="url(#trG)" class="trk"/></g>`;
 /* the plinth below with two scribed rune stones */
 const base=`<g transform="translate(0 ${ro-2})"><polygon points="-26,0 26,0 32,12 -32,12" fill="url(#trS2)" stroke="#0e0805" stroke-width="1.1"/><polygon points="-38,12 38,12 42,19 -42,19" fill="url(#trS0)" stroke="#0e0805" stroke-width="1.1"/>
  <g transform="translate(0 6.5) scale(.75)"><path d="${R_[5]||''}" class="trc"/></g>
  ${[-1,1].map(sd=>`<g transform="translate(${sd*56} 2)"><polygon points="-7,17 7,17 6,-22 2,-27 -6,-23" fill="url(#trS${sd>0?1:2})" stroke="#0e0805" stroke-width="1.1"/><g transform="translate(0 -9) scale(.8)"><path d="${R_[sd>0?7:3]||''}" class="trc"/></g><g transform="translate(0 4) scale(.7)"><path d="${R_[sd>0?1:9]||''}" class="trc"/></g></g>`).join('')}</g>`;
 return`<svg class="tring" viewBox="-130 -130 260 260" aria-hidden="true"><defs>
  <linearGradient id="trS0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a5a4a"/><stop offset=".55" stop-color="#3e3228"/><stop offset="1" stop-color="#241a14"/></linearGradient>
  <linearGradient id="trS1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a6a58"/><stop offset=".5" stop-color="#4a3c30"/><stop offset="1" stop-color="#2a2018"/></linearGradient>
  <linearGradient id="trS2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e5044"/><stop offset=".6" stop-color="#382c22"/><stop offset="1" stop-color="#1e1610"/></linearGradient>
  <radialGradient id="trG"><stop offset="0" stop-color="#fff2c0"/><stop offset=".45" stop-color="#ff8a2a"/><stop offset="1" stop-color="#6a1a04"/></radialGradient>
  <filter id="trF" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  ${base}<g>${st}</g><circle r="${ri}" fill="none" stroke="#0a0604" stroke-width="2"/><circle r="${ri+1.6}" fill="none" stroke="#ff8a3a55" stroke-width=".8"/><g filter="url(#trF)">${rn}</g>${ks}</svg>`}
