"use strict";
/**
 * gl3d: real 3D for the templates, no library. A small WebGL2 ray-marcher draws a model (dumbbell, kettlebell, wine glass, cloche,
 * cocktail coupe, pizza, stopwatch) with true geometry: soft shadows, ambient occlusion, metal and glass reflections of a studio
 * environment, a floor shadow. It turns by itself, follows the pointer and can be dragged (touch scrolls the page as normal).
 * It renders at a modest resolution, pauses off screen, shows one still frame for visitors who prefer reduced motion, and falls
 * back to the flat picture inside the same box when WebGL is missing or the shader fails.
 *
 *   tag("wineglass", { fallback: "<img ...>", c1: "#B5362B", c2: "#F0A23B", c3: "#2A1A14", label: "A glass of wine", cls: "hero3d" })
 */
const MODELS = { dumbbell: 0, kettlebell: 1, wineglass: 2, cloche: 3, coupe: 4, pizza: 5, stopwatch: 6, bulb: 7, house: 8, wrench: 9, key: 10, tower: 11, tooth: 12, cross: 13, scales: 14, gavel: 15 };
/** camera per model: pitch (radians), target height, distance */
const YAW = { dumbbell: 1.3, kettlebell: 0.6, wineglass: 0.6, cloche: 0.6, coupe: 0.8, pizza: 0.4, stopwatch: 0.5, bulb: 0.4, house: 0.7, wrench: 0.5, key: 0.5, tower: 0.7, tooth: 0.5, cross: 0.12, scales: 0.35, gavel: 0.6 };
const CAM = { dumbbell: [0.3, -0.2, 5.4], kettlebell: [0.28, -0.08, 5.0], wineglass: [0.2, 0.02, 4.7], cloche: [0.28, -0.3, 5.5], coupe: [0.26, -0.1, 4.6], pizza: [0.78, -0.9, 4.8], stopwatch: [0.2, -0.1, 5.0], bulb: [0.16, -0.05, 4.5], house: [0.42, -0.25, 5.0], wrench: [0.2, 0.0, 4.5], key: [0.18, 0.0, 4.6], tower: [0.3, 0.1, 6.0], tooth: [0.2, -0.1, 4.8], cross: [0.15, 0.0, 4.6], scales: [0.14, 0.0, 5.2], gavel: [0.3, -0.25, 5.0] };


/** Smooth lathe profiles (radius, height) for the two glasses; the bowl is sampled from a curve so it renders round, not faceted. */
const prof = (pts) => `const vec2 P_${pts.name}[${pts.list.length}]=vec2[${pts.list.length}](${pts.list.map(([r, y]) => `vec2(${r.toFixed(3)},${y.toFixed(3)})`).join(",")});`;
const wine = [[.55, -1], [.47, -.96], [.07, -.9], [.04, -.62], [.04, -.12]];
for (let i = 0; i <= 16; i++) { const t = i / 16, k = Math.min(1, t * 1.35); wine.push([.05 + .6 * Math.sin(k * Math.PI / 2) * (1 - .2 * Math.max(0, (t - .55) / .45) ** 1.5), -.1 + 1.1 * t]); }
const coupe = [[.55, -1], [.47, -.96], [.07, -.9], [.035, -.6], [.035, -.04]];
for (let i = 0; i <= 16; i++) { const t = i / 16; coupe.push([.04 + 1.0 * Math.pow(Math.sin(t * 1.5708), .72), -.04 + .72 * t]); }
const LATHES =
  prof({ name: "W", list: wine.slice(0, 5) }) + prof({ name: "C", list: coupe.slice(0, 5) }) +
  `float bwR(float t){ float k=min(1.,t*1.35); return .05+.6*sin(k*1.5707963)*(1.-.2*pow(max(0.,(t-.55)/.45),1.5)); }` +
  `float bcR(float t){ return .04+pow(sin(t*1.5708),.72); }` +
  `float latheW(vec2 q){ float d=1e5; for(int i=0;i<4;i++) d=min(d,sdSeg(q,P_W[i],P_W[i+1])); float t=clamp((q.y+.1)/1.1,0.,1.), R=bwR(t), s=(bwR(min(t+.02,1.))-bwR(max(t-.02,0.)))/(.04*1.1); float e=abs(q.x-R)/sqrt(1.+s*s); d=min(d,length(vec2(e,max(max(-.1-q.y,q.y-1.),0.)))); return d-.02; }` +
  `float latheC(vec2 q){ float d=1e5; for(int i=0;i<4;i++) d=min(d,sdSeg(q,P_C[i],P_C[i+1])); float t=clamp((q.y+.04)/.72,0.,1.), R=bcR(t), s=(bcR(min(t+.02,1.))-bcR(max(t-.02,0.)))/(.04*.72); float e=abs(q.x-R)/sqrt(1.+s*s); d=min(d,length(vec2(e,max(max(-.04-q.y,q.y-.68),0.)))); return d-.02; }`;

const FRAG = String.raw`
precision highp float;
uniform vec2 uRes; uniform float uYaw, uPitch, uTy, uDist, uTime, uLum;
uniform vec3 uC1, uC2, uC3;
out vec4 oc;

float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
float sdCylY(vec3 p, float h, float r, float rd){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r-rd,h-rd); return min(max(d.x,d.y),0.)+length(max(d,0.))-rd; }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float smin(float a, float b, float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
vec2 U(vec2 a, vec2 b){ return a.x<b.x?a:b; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float sdRB(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float ex(float d, float z, float h){ vec2 w=vec2(d,abs(z)-h); return min(max(w.x,w.y),0.)+length(max(w,0.)); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

/* materials: 0 steel, 1 paint (c1), 2 glass, 3 liquid (c2), 4 gold, 5 ceramic, 6 crust, 7 cheese, 8 herb, 9 rubber */
${LATHES}

vec2 map(vec3 p){
#if MODEL==0
  p.y+=.2; p.xz=rot(.5)*p.xz; vec3 q=p;
  float bar=sdCap(q,vec3(-1.7,0,0),vec3(1.7,0,0),.12)-.004*sin(q.x*70.)*step(abs(q.x),1.1);
  vec2 r=vec2(bar,0.);
  for(int s=-1;s<=1;s+=2){
    float fs=float(s); vec3 w=vec3(q.y,q.x-fs*1.02,q.z).yxz; w=vec3(q.x-fs*1.0,q.y,q.z);
    vec3 c=vec3(w.y,w.x,w.z); // cylinder axis along x
    r=U(r,vec2(sdCylY(c,.17,.8,.06),1.));
    vec3 c2=vec3(q.y,q.x-fs*1.34,q.z);
    r=U(r,vec2(sdCylY(c2,.1,.64,.05),9.));
    vec3 c3=vec3(q.y,q.x-fs*.7,q.z);
    r=U(r,vec2(sdCylY(c3,.07,.2,.02),0.));
  }
  return r;
#elif MODEL==1
  vec3 q=p; q.y+=.15;
  float body=max(sdEll(q,vec3(.9,.86,.9)),-(q.y+.82));
  vec3 h=p-vec3(0,.62,0); float arch=length(vec2(length(h.xy)-.5,h.z))-.115; arch=max(arch,-h.y+.0);
  float l1=sdCap(p,vec3(.5,.4,0),vec3(.5,.62,0),.115), l2=sdCap(p,vec3(-.5,.4,0),vec3(-.5,.62,0),.115);
  float d=smin(body,min(arch,min(l1,l2)),.09);
  return vec2(d,1.);
#elif MODEL==2
  vec2 q=vec2(length(p.xz),p.y);
  float g=latheW(q);
  vec3 lp=p-vec3(0,.3,0); float liq=sdEll(lp,vec3(.58,.42,.58)); liq=max(liq,p.y-.46);
  return U(vec2(g,2.),vec2(liq,3.));
#elif MODEL==3
  vec3 q=p+vec3(0,.9,0); float sc=1.35;
  float dome=(length(vec3(q.x,q.y/sc,q.z))-1.1)*.88; dome=abs(dome)-.03; dome=max(dome,-q.y+.02);
  vec2 r=vec2(dome,0.);
  r=U(r,vec2(sdCylY(p-vec3(0,-.93,0),.045,1.42,.03),5.));
  r=U(r,vec2(length(vec2(length(q.xz)-1.1,q.y))-.04,0.));
  r=U(r,vec2(length(p-vec3(0,.66,0))-.11,4.));
  r=U(r,vec2(sdCylY(p-vec3(0,.57,0),.05,.05,.01),4.));
  return r;
#elif MODEL==4
  vec2 q=vec2(length(p.xz),p.y);
  float g=latheC(q);
  vec3 lp=p-vec3(0,.4,0); float liq=sdEll(lp,vec3(.95,.2,.95)); liq=max(liq,p.y-.46);
  vec2 r=U(vec2(g,2.),vec2(liq,3.));
  r=U(r,vec2(sdCap(p,vec3(-.35,.38,.1),vec3(.38,.9,-.1),.014),0.));
  r=U(r,vec2(length(p-vec3(.0,.58,.0))-.13,8.));
  return r;
#elif MODEL==5
  vec3 q=p-vec3(0,-.92,0);
  float base=sdCylY(q,.05,1.1,.04);
  float rim=length(vec2(length(q.xz)-1.06,q.y-.02))-.1;
  vec2 r=vec2(smin(base,rim,.06),6.);
  r=U(r,vec2(sdCylY(q-vec3(0,.052,0),.012,.98,.01),7.));
  for(int i=0;i<7;i++){ float fi=float(i); vec2 c=vec2(cos(fi*2.4),sin(fi*2.4))*(.2+.62*fract(fi*.37+.2)); r=U(r,vec2(sdCylY(q-vec3(c.x,.085,c.y),.03,.2,.012),1.)); }
  for(int i=0;i<5;i++){ float fi=float(i); vec2 c=vec2(cos(fi*1.7+1.),sin(fi*1.7+1.))*(.3+.5*fract(fi*.53)); vec3 e=q-vec3(c.x,.07,c.y); e.xz=rot(fi*1.3)*e.xz; r=U(r,vec2(sdEll(e,vec3(.16,.025,.08)),8.)); }
  return r;
#elif MODEL==7
  float gl=length(p-vec3(0,.32,0))-.82; float nk=sdCylY(p-vec3(0,-.3,0),.34,.3,.12); float sh=abs(smin(gl,nk,.35))-.026; sh=max(sh,-(p.y+.62));
  vec2 r=vec2(sh,2.);
  float sc=sdCylY(p-vec3(0,-.84,0),.24,.33-.012*sin(p.y*44.),.03); r=U(r,vec2(sc,0.));
  r=U(r,vec2(sdCylY(p-vec3(0,-1.1,0),.07,.2,.04),4.));
  r=U(r,vec2(sdCap(p,vec3(-.1,-.5,0),vec3(-.1,.12,0),.012),0.)); r=U(r,vec2(sdCap(p,vec3(.1,-.5,0),vec3(.1,.12,0),.012),0.));
  r=U(r,vec2(sdCap(p,vec3(-.1,.14,0),vec3(.1,.14,0),.05+.008*sin(p.x*90.)),10.)); r=U(r,vec2(length(p-vec3(0,.3,0))-.3,10.));
  return r;
#elif MODEL==8
  vec2 r=vec2(sdRB(p-vec3(0,-.35,0),vec3(.85,.45,.65))-.03,5.);
  vec2 hp=vec2(abs(p.x),p.y); float rf=max(max(dot(hp,vec2(.6,.8))-.68-.05,.1-p.y),abs(p.z)-.82); r=U(r,vec2(rf,1.));
  r=U(r,vec2(sdRB(p-vec3(.55,.6,-.2),vec3(.1,.3,.1))-.01,5.));
  r=U(r,vec2(sdRB(p-vec3(0,-.55,.66),vec3(.18,.34,.03))-.01,3.)); r=U(r,vec2(length(p-vec3(.1,-.55,.71))-.025,4.));
  for(int i=-1;i<=1;i+=2){ vec3 w=p-vec3(float(i)*.5,-.22,.66); r=U(r,vec2(sdRB(w,vec3(.2,.18,.025))-.005,9.)); r=U(r,vec2(min(sdRB(w,vec3(.2,.012,.04)),sdRB(w,vec3(.012,.18,.04))),5.)); }
  r=U(r,vec2(sdCylY(p-vec3(0,-.85,0),.05,1.55,.03),8.));
  return r;
#elif MODEL==9
  p.xy=rot(.55)*p.xy;
  vec2 r=vec2(sdRB(p-vec3(0,-.05,0),vec3(.085,.8,.045))-.02,0.);
  r=U(r,vec2(sdRB(p-vec3(0,-.55,0),vec3(.12,.34,.07))-.03,1.));
  float dd=length(p.xy-vec2(0,.95))-.42; dd=max(dd,-sdRB(vec3(p.xy-vec2(0,1.25),0.),vec3(.17,.32,1.)));
  r=U(r,vec2(ex(dd,p.z,.055)-.012,0.));
  float he=length(p.xy-vec2(0,-1.0)); r=U(r,vec2(ex(max(he-.22,-(he-.09)),p.z,.05)-.01,0.));
  return r;
#elif MODEL==10
  p.xy=rot(.5)*p.xy;
  float rg=length(vec2(length(p.xy-vec2(0,.92))-.36,p.z))-.085; vec2 r=vec2(rg,4.);
  r=U(r,vec2(length(vec2(length(p.xy-vec2(0,.92))-.17,p.z))-.035,4.));
  r=U(r,vec2(sdCap(p,vec3(0,.55,0),vec3(0,-1.05,0),.075),4.));
  r=U(r,vec2(sdRB(p-vec3(.15,-.78,0),vec3(.11,.07,.04))-.01,4.)); r=U(r,vec2(sdRB(p-vec3(.12,-.97,0),vec3(.09,.06,.04))-.01,4.)); r=U(r,vec2(sdRB(p-vec3(.13,-.56,0),vec3(.08,.05,.04))-.01,4.));
  r=U(r,vec2(sdRB(p-vec3(0,.2,0),vec3(.095,.05,.095))-.01,1.));
  return r;
#elif MODEL==11
  vec2 r=vec2(sdRB(p-vec3(0,.15,0),vec3(.5,1.0,.5))-.015,5.);
  r=U(r,vec2(sdRB(p-vec3(.1,-.88,.1),vec3(.85,.28,.6))-.015,5.));
  r=U(r,vec2(sdRB(p-vec3(.1,-.58,.1),vec3(.88,.03,.63)),1.));
  r=U(r,vec2(sdCap(p,vec3(0,1.15,0),vec3(0,1.6,0),.02),0.));
  r=U(r,vec2(sdRB(p-vec3(0,1.17,0),vec3(.56,.04,.56)),1.));
  vec3 wz=vec3(mod(p.x+.25,.25)-.125,mod(p.y+.1,.27)-.135,p.z-.5); float wl=sdRB(wz,vec3(.07,.085,.02))-.004; wl=max(wl,max(abs(p.x)-.44,abs(p.y-.1)-.9));
  vec3 wx=vec3(mod(p.z+.25,.25)-.125,mod(p.y+.1,.27)-.135,p.x-.5); float wl2=sdRB(wx,vec3(.07,.085,.02))-.004; wl2=max(wl2,max(abs(p.z)-.44,abs(p.y-.1)-.9));
  r=U(r,vec2(min(wl,wl2),9.));
  return r;
#elif MODEL==12
  float cr=sdEll(p-vec3(0,.42,0),vec3(.76,.52,.64)); cr=smin(cr,sdRB(p-vec3(0,.28,0),vec3(.4,.3,.36))-.2,.3);
  cr=smin(cr,-sdEll(p-vec3(0,1.12,0),vec3(.2,.24,1.2)),-.07); cr=max(cr,-(length(p-vec3(.46,.98,.1))-.16));
  float tt=clamp((.15-p.y)/1.0,0.,1.), rr=mix(.25,.09,tt);
  float r1=sdCap(p,vec3(-.36,.15,0),vec3(-.24,-.95,.02),rr), r2=sdCap(p,vec3(.36,.15,0),vec3(.24,-.95,-.02),rr);
  return vec2(smin(cr,min(r1,r2),.2),5.);
#elif MODEL==13
  vec2 r=vec2(sdRB(p,vec3(.24,.78,.1))-.12,1.);
  r=U(r,vec2(sdRB(p,vec3(.78,.24,.1))-.12,1.));
  float bar=min(sdRB(p-vec3(0,0,.17),vec3(.1,.55,.01))-.012,sdRB(p-vec3(0,0,.17),vec3(.55,.1,.01))-.012);
  r=U(r,vec2(bar,5.));
  return r;
#elif MODEL==14
  vec2 r=vec2(sdCylY(p-vec3(0,-.94,0),.07,.5,.03),1.);
  r=U(r,vec2(sdCylY(p-vec3(0,-.82,0),.06,.2,.02),4.));
  r=U(r,vec2(sdCap(p,vec3(0,-.8,0),vec3(0,.86,0),.055),4.));
  r=U(r,vec2(length(p-vec3(0,.93,0))-.1,4.));
  r=U(r,vec2(sdCap(p,vec3(-.95,.78,0),vec3(.95,.78,0),.04),4.));
  for(int i=-1;i<=1;i+=2){ float x=float(i)*.95; vec3 q=p-vec3(x,-.22,0);
     r=U(r,vec2(max(abs(length(q-vec3(0,.2,0))-.4)-.022,q.y-.03),4.));
    r=U(r,vec2(sdCap(p,vec3(x,.78,0),vec3(x-.34,-.2,0),.012),0.)); r=U(r,vec2(sdCap(p,vec3(x,.78,0),vec3(x+.34,-.2,0),.012),0.)); r=U(r,vec2(sdCap(p,vec3(x,.78,0),vec3(x,-.2,.34),.012),0.)); }
  return r;
#elif MODEL==15
  vec2 r=vec2(sdCylY(p-vec3(0,-.93,0),.07,.62,.03),1.);
  r=U(r,vec2(sdCylY(p-vec3(0,-.84,0),.03,.5,.015),4.));
  p.xy=rot(.5)*(p.xy-vec2(0,.1));
  r=U(r,vec2(sdCap(p,vec3(-.46,.28,0),vec3(.46,.28,0),.27),1.));
  r=U(r,vec2(sdCap(p,vec3(-.52,.28,0),vec3(-.46,.28,0),.3),4.)); r=U(r,vec2(sdCap(p,vec3(.46,.28,0),vec3(.52,.28,0),.3),4.));
  r=U(r,vec2(sdCap(p,vec3(0,.28,0),vec3(0,-.95,0),.065),1.));
  r=U(r,vec2(sdCap(p,vec3(0,-.9,0),vec3(0,-.95,0),.085),4.));
  return r;
#else
  vec3 q=p+vec3(0,.1,0);
  float body=sdCylY(q.xzy,.14,.9,.05);
  float bez=length(vec2(length(q.xy)-.88,q.z-.06))-.07; bez=min(bez,length(vec2(length(q.xy)-.88,q.z+.06))-.07);
  vec2 r=vec2(body,1.);
  r=U(r,vec2(bez,0.));
  r=U(r,vec2(sdCylY(q.xzy-vec3(0,.135,0),.012,.8,.005),5.));
  r=U(r,vec2(sdCylY(vec3(q.x,q.y-1.02,q.z),.08,.1,.02),0.));
  r=U(r,vec2(sdCylY(vec3(q.x,q.y-.95,q.z),.05,.16,.02),4.));
  for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 c=vec2(sin(a),cos(a))*.68; r=U(r,vec2(length(q-vec3(c,.15))-(mod(float(i),3.)<.5?.045:.028),9.)); }
  r=U(r,vec2(sdCap(q,vec3(0,0,.16),vec3(0,.5,.16),.035),9.));
  r=U(r,vec2(sdCap(q,vec3(0,0,.17),vec3(.34,-.2,.17),.026),1.));
  r=U(r,vec2(length(q-vec3(0,0,.17))-.065,9.));
  return r;
#endif
}

vec3 nor(vec3 p){ vec2 e=vec2(.0012,-.0012); return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x); }
vec3 env(vec3 d){
  vec3 c=mix(vec3(.16,.12,.1),vec3(.9,.94,1.),smoothstep(-.3,.9,d.y));
  c+=vec3(1.,.96,.9)*3.2*smoothstep(.9,.985,dot(d,normalize(vec3(.5,.75,.4))));
  c+=mix(uC2,vec3(1.),.3)*1.7*smoothstep(.9,.98,dot(d,normalize(vec3(-.8,.25,-.4))));
  c+=vec3(.55,.72,1.)*1.3*smoothstep(.88,.97,dot(d,normalize(vec3(-.6,.5,.7))));
  float az=atan(d.z,d.x); c+=vec3(1.,.97,.93)*.9*smoothstep(.62,.92,sin(az*3.+.6))*smoothstep(.0,.35,d.y)*smoothstep(1.,.5,d.y);
  c-=vec3(.08)*smoothstep(.5,.9,sin(az*2.+2.))*smoothstep(.3,-.2,d.y);
  return max(c,0.);
}
float shadow(vec3 ro, vec3 rd){ float res=1., t=.05; for(int i=0;i<26;i++){ vec2 h=map(ro+rd*t); float d=h.y==2.?.3:h.x; res=min(res,9.*d/t); t+=clamp(d,.03,.35); if(res<.002||t>5.) break; } return clamp(res,0.,1.); }
float ao(vec3 p, vec3 n){ float o=0., s=1.; for(int i=1;i<=4;i++){ float h=.06*float(i); o+=(h-map(p+n*h).x)*s; s*=.62; } return clamp(1.-1.5*o,0.,1.); }
vec2 march(vec3 ro, vec3 rd, float t0, float t1){ float t=t0; for(int i=0;i<110;i++){ vec2 h=map(ro+rd*t); if(h.x<.0012*t) return vec2(t,h.y); t+=h.x*.88; if(t>t1) break; } return vec2(t1+1.,-1.); }

vec3 shade(vec3 p, vec3 n, vec3 rd, float m){
  vec3 L=normalize(vec3(.55,.8,.45)); vec3 H=normalize(L-rd); vec3 rf=reflect(rd,n);
  float dif=max(dot(n,L),0.); float sh=shadow(p+n*.02,L); float occ=ao(p,n);
  float fr=pow(1.-max(dot(n,-rd),0.),4.); float sp=pow(max(dot(n,H),0.),64.);
  vec3 amb=mix(vec3(.18,.14,.12),vec3(.45,.5,.58),.5+.5*n.y);
  vec3 base; float refl=.1, spec=.5;
  if(m>9.5){ float fc=pow(max(dot(n,-rd),0.),.6); return mix(uC2,vec3(1.,.95,.8),.25)*(1.1+1.3*fc); }
  if(m<.5){ vec3 e=env(rf); return (e*vec3(.9,.93,.98)*(.55+.45*occ)+sp*sh*1.2)*(.55+.45*sh); }
  else if(m<1.5){ base=uC1; refl=.22; }
  else if(m<3.5){ vec3 e=env(rf); base=uC2; vec3 deep=base*base*.5; vec3 c=mix(deep,base,.35+.65*dif*sh)*occ+e*.18*fr+sp*sh*.8; return c; }
  else if(m<4.5){ vec3 e=env(rf); return e*vec3(1.,.78,.36)*(.7+.3*occ)+sp*sh; }
  else if(m<5.5){ base=vec3(.96,.95,.93); refl=.12; }
  else if(m<6.5){ base=mix(uC2*vec3(1.),vec3(.95,.72,.38),.5)*(.82+.28*hash(floor(p.xz*18.))); spec=.1; }
  else if(m<7.5){ base=mix(vec3(.98,.82,.45),vec3(.95,.55,.25),.35*hash(floor(p.xz*9.))); refl=.05; }
  else if(m<8.5){ base=vec3(.28,.55,.25); }
  else { base=vec3(.07,.07,.08); refl=.06; spec=.2; }
  vec3 c=base*(amb*occ+dif*sh*vec3(1.,.95,.88)*1.15);
  c+=env(rf)*refl*(.4+fr*1.6)*occ+sp*sh*spec;
  return c;
}

void main(){
  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 ta=vec3(0.,uTy,0.); float cp=cos(uPitch), sp=sin(uPitch);
  vec3 ro=ta+uDist*vec3(cp*sin(uYaw),sp,cp*cos(uYaw));
  vec3 ww=normalize(ta-ro), uu=normalize(cross(ww,vec3(0,1,0))), vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+2.7*ww);
  float b=dot(ro,rd), cc=dot(ro,ro)-9.; float disc=b*b-cc; float t0=0., t1=0.;
  float tf=rd.y<-.0001?(-1.-ro.y)/rd.y:1e5;
  vec3 col=vec3(0.); float a=0.;
  vec2 h=vec2(1e5,-1.);
  if(disc>0.){ float s=sqrt(disc); t0=max(-b-s,0.); t1=-b+s; h=march(ro,rd,t0,min(t1,tf)); }
  if(h.y>=0.){
    vec3 p=ro+rd*h.x, n=nor(p);
    if(h.y>1.5&&h.y<2.5){
      float fr=pow(1.-max(dot(n,-rd),0.),3.); vec3 ge=env(reflect(rd,n)); vec3 gc=mix(max(ge-.6,0.)*1.5+ge*.12,ge*vec3(.12,.2,.17),smoothstep(.25,.8,fr)*.75*(2.-min(uLum,2.)))*uLum+vec3(.5,.45,.4)*(uLum-1.)*pow(fr,1.5); float F=(.015+.8*fr)*(1.+(uLum-1.)*.8)+(uLum-1.)*.05+.5*smoothstep(.8,2.,max(ge.r,max(ge.g,ge.b)));
      vec3 inner=vec3(0.); float ia=0.;
      vec2 h2=march(p+rd*.062,rd,0.,min(t1,tf)-h.x);
      if(h2.y>=0.){ vec3 p2=p+rd*(.062+h2.x), n2=nor(p2); if(h2.y>1.5&&h2.y<2.5){ inner=env(reflect(rd,n2)); ia=.07; } else { inner=shade(p2,n2,rd,h2.y); ia=1.; } }
      float lg=max(max(gc.r,gc.g),gc.b); float Fa=mix(F,clamp(F*(lg*1.8+.04),0.,.95),step(1.5,uLum)); a=Fa+ia*(1.-Fa); col=(gc*Fa+inner*ia*(1.-Fa))/max(a,.001);
    } else { col=shade(p,n,rd,h.y); a=1.; }
  } else if(tf<1e4){
    vec3 p=ro+rd*tf; vec3 L=normalize(vec3(.55,.8,.45));
    float s=shadow(p+vec3(0.,.01,0.),L); float c=1.-clamp(map(p+vec3(0.,.14,0.)).x*1.7,0.,1.);
    vec2 fq=gl_FragCoord.xy/uRes; float ed=min(min(fq.x,1.-fq.x),min(fq.y,1.-fq.y)); float fade=smoothstep(2.6,.6,length(p.xz))*smoothstep(0.,.14,ed); a=((1.-s)*.5+c*.4)*fade; col=vec3(.03,.015,.01)*a;
    // faint mirror of the model in the floor
    vec3 r2=vec3(rd.x,-rd.y,rd.z); vec2 hr=march(p+vec3(0.,.02,0.),r2,0.,3.5);
    if(hr.y>=0.&&hr.y!=2.){ vec3 pr=p+vec3(0.,.02,0.)+r2*hr.x; vec3 nr=nor(pr); vec3 cr=shade(pr,nr,r2,hr.y); float rf=.11*fade; col+=cr*rf; a=max(a,rf); }
  }
  col=1.-exp(-col*1.15); col=pow(col,vec3(.4545));
  oc=vec4(col*a,a);
}`;

const RUNTIME = String.raw`
(function () {
  "use strict";
  var M = ${JSON.stringify(MODELS)}, CAM = ${JSON.stringify(CAM)};
  var FRAG = ${JSON.stringify(FRAG)};
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function hex(h) { h = (h || "#888888").replace("#", ""); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
  function mount(el) {
    var name = el.getAttribute("data-gl3d"); if (!(name in M)) return;
    var cv = document.createElement("canvas"); cv.className = "gl3d-cv"; cv.setAttribute("aria-hidden", "true");
    var gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn("gl3d", gl.getShaderInfoLog(s)); return null; } return s; }
    var vs = sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}");
    var fs = sh(gl.FRAGMENT_SHADER, "#version 300 es\n#define MODEL " + M[name] + "\n" + FRAG);
    if (!vs || !fs) return;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["uLum", "uRes", "uYaw", "uPitch", "uTy", "uDist", "uTime", "uC1", "uC2", "uC3"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    var cam = CAM[name], c1 = hex(el.getAttribute("data-c1")), c2 = hex(el.getAttribute("data-c2")), c3 = hex(el.getAttribute("data-c3"));
    var yaw = +(el.getAttribute("data-yaw") || .6), pitch = cam[0], vel = 0, drag = false, lx = 0, hov = 0, auto = !reduce, vis = false, raf = 0, t0 = performance.now(), last = t0, ready = false;
    var q = +(el.getAttribute("data-q") || 1), lum = +(el.getAttribute("data-lum") || 1), sc = el.hasAttribute("data-scroll"), so = 0; if (sc) auto = false;
    function size() {
      var r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5) * q, w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      var mx = 720; if (w > mx) { h = Math.round(h * mx / w); w = mx; }
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(now) {
      size(); var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!drag) { vel *= .94; yaw += vel; if (auto) yaw += dt * .32; yaw += (hov - 0) * 0; }
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uYaw, yaw + so + hov * .6); gl.uniform1f(U.uPitch, pitch); gl.uniform1f(U.uTy, cam[1]); gl.uniform1f(U.uDist, cam[2]); gl.uniform1f(U.uTime, (now - t0) / 1000); gl.uniform1f(U.uLum, lum);
      gl.uniform3f(U.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(U.uC2, c2[0], c2[1], c2[2]); gl.uniform3f(U.uC3, c3[0], c3[1], c3[2]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!ready) { ready = true; el.classList.add("gl-on"); }
    }
    function loop(now) { if (!vis) { raf = 0; return; } draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (reduce) { requestAnimationFrame(draw); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    el.gl3d = { colors: function (a, b, c) { if (a) c1 = hex(a); if (b) c2 = hex(b); if (c) c3 = hex(c); if (reduce || !raf) requestAnimationFrame(draw); }, spin: function (v) { vel += v; } };
    if (sc) { var onS = function () { var r = el.getBoundingClientRect(), k = (r.top + r.height / 2) / (window.innerHeight || 1); so = k * 4.2; if (reduce || !raf) requestAnimationFrame(draw); }; window.addEventListener("scroll", onS, { passive: true }); onS(); }
    el.insertBefore(cv, el.firstChild);
    el.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; vel = 0; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); if (drag) { var d = (e.clientX - lx) * .012; yaw += d; vel = d * .5; lx = e.clientX; if (reduce) requestAnimationFrame(draw); } else if (e.pointerType === "mouse") { hov = ((e.clientX - r.left) / r.width - .5) * 1.2; if (reduce) requestAnimationFrame(draw); } });
    function up() { drag = false; }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", function () { hov = 0; });
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }, { rootMargin: "100px" }).observe(el); } else { vis = true; start(); }
    el.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { yaw -= .25; if (reduce) requestAnimationFrame(draw); } if (e.key === "ArrowRight") { yaw += .25; if (reduce) requestAnimationFrame(draw); } });
  }
  [].slice.call(document.querySelectorAll("[data-gl3d]")).forEach(function (el) { try { mount(el); } catch (e) { if (window.console) console.warn("gl3d", e); } });
})();
`;

const CSS = `
.gl3d{position:relative;display:block;width:100%;aspect-ratio:1;touch-action:pan-y;cursor:grab;-webkit-tap-highlight-color:transparent}.gl3d:active{cursor:grabbing}.gl3d:focus-visible{outline:2px solid var(--accent,#fff);outline-offset:4px}
.gl3d .gl3d-cv{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .6s}.gl3d.gl-on .gl3d-cv{opacity:1}
.gl3d .gl3d-fb{position:absolute;inset:0;transition:opacity .6s}.gl3d .gl3d-fb>*{width:100%;height:100%;object-fit:contain}.gl3d.gl-on .gl3d-fb{opacity:0;pointer-events:none}
`;

/** One 3D box: the flat picture sits inside as the fallback. */
const tag = (model, { fallback = "", c1 = "#B5362B", c2 = "#F0A23B", c3 = "#2A1A14", label = "A 3D model you can turn", cls = "", yaw, lum } = {}) =>
  `<div class="gl3d ${cls}" data-gl3d="${model}" data-c1="${c1}" data-c2="${c2}" data-c3="${c3}" data-yaw="${yaw != null ? yaw : YAW[model]}"${lum ? ` data-lum="${lum}"` : ""} role="img" tabindex="0" aria-label="${label}. Drag to turn it."><div class="gl3d-fb">${fallback}</div></div>`;

module.exports = { MODELS, RUNTIME, CSS, tag };
