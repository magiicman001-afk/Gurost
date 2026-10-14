"use strict";
/**
 * Renders the pictures and looping videos for the premium-plus bakery templates. Everything is drawn here (original vector art,
 * gradients, particles): no stock files, no licences, no network. It needs Playwright (Chromium) and ffmpeg.
 *
 *   node scripts/build-bakery-media.js [images|videos|all]     -> templates/_media/{img,video}
 *
 * Images: 8 products x 3 looks (atelier, gallery, motion), WebP. Videos: one looping clip per template, MP4 + WebM + poster.
 * Every video is an exact loop: all movement uses whole cycles of the clip length.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { art, MOTIFS } = require("../templates/_src/illustrations");

const OUT = path.join(__dirname, "..", "templates", "_media");
const PAL = { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#8A5A2B", crust: "#D99A4E", crustDark: "#A8672A", light: "#F6D8A6", cream: "#FFF4E2", accent: "#C2512F", accent2: "#F0A59A", shadow: "rgba(90,50,10,.38)", plate: "#FFF8EC" };
const PAL_DARK = { ...PAL, shadow: "rgba(0,0,0,.55)" };

const SETS = {
  atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFFCF5 0%,#F6ECDC 55%,#E9D9BF 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(120,80,30,.10) 100%)", scale: 0.88, top: 0.2 },
  gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { loaf: "#F7BF4F", croissant: "#F8BDAE", roll: "#C3DCC6", slice: "#F4C9D8", cupcake: "#D3C8F3", baguettes: "#FAD98F", coffee: "#C0DBEA", wheat: "#F2E0B4" } },
  motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { loaf: "#FFD83D", croissant: "#FF8E6B", roll: "#8FE3C0", slice: "#FF9EC1", cupcake: "#B9A6FF", baguettes: "#FFB48A", coffee: "#7FD1FF", wheat: "#D6F06B" } },
};

const GRAIN = `<canvas id="gr" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;pointer-events:none"></canvas><script>(function(){var c=document.getElementById("gr"),w=c.width=480,h=c.height=Math.round(480*innerHeight/innerWidth),x=c.getContext("2d"),d=x.createImageData(w,h),s=7;for(var i=0;i<d.data.length;i+=4){s=(s*16807)%2147483647;var v=190+(s%66);d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=26}x.putImageData(d,0,0)})()</script>`;

function productHtml(setName, item) {
  const S = SETS[setName];
  let bg = S.bg || "#fff", extra = "";
  if (setName === "gallery") {
    const col = S.disc[item];
    extra = `<div style="position:absolute;left:11%;width:78%;aspect-ratio:1;top:14%;border-radius:50%;background:radial-gradient(circle at 34% 28%,${col} 0%,${col} 60%,${col}CC 100%);box-shadow:0 40px 80px -30px rgba(60,40,10,.25)"></div>`;
  } else if (setName === "motion") {
    bg = S.tint[item];
    extra = `<div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 24%,rgba(255,255,255,.55),transparent 58%)"></div><div style="position:absolute;right:-12%;bottom:-18%;width:70%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.22)"></div>`;
  }
  const size = S.w * S.scale;
  const svg = art(item, PAL).replace("<svg ", `<svg style="width:${size}px;height:${size}px;display:block" `);
  return `<!doctype html><meta charset="utf-8"><style>*{margin:0}html,body{width:${S.w}px;height:${S.h}px;overflow:hidden}body{position:relative;background:${bg}}</style>
${extra}${S.floor ? `<div style="position:absolute;inset:0;background:${S.floor}"></div>` : ""}
<div style="position:absolute;left:${(S.w - size) / 2}px;top:${S.h * S.top}px">${svg}</div>${GRAIN}`;
}

// ------------------------------------------------------------------ videos
// Each page defines window.render(t) with t in [0,T). Particles and waves use whole cycles so the last frame leads into the first.
const COMMON_JS = `
var T=window.__T,TAU=Math.PI*2;
function rnd(seed){var s=seed;return function(){s=(s*16807)%2147483647;return s/2147483647}}
function mk(n,seed,fn){var r=rnd(seed),a=[];for(var i=0;i<n;i++)a.push(fn(r,i));return a}
var cv=document.getElementById("c"),ctx=cv.getContext("2d");var W=cv.width=1280,H=cv.height=720;
function grain(){var g=document.getElementById("g"),w=g.width=640,h=g.height=360,x=g.getContext("2d"),d=x.createImageData(w,h),s=11;for(var i=0;i<d.data.length;i+=4){s=(s*16807)%2147483647;var v=s%256;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=22}x.putImageData(d,0,0)}
grain();
`;

function videoHtml(name, T) {
  const A = (m, pal = PAL) => art(m, pal);
  const wrap = (body, bg, extraCss = "") => `<!doctype html><meta charset="utf-8"><style>*{margin:0}html,body{width:1280px;height:720px;overflow:hidden;background:${bg}}canvas{position:absolute;left:0;top:0}.it{position:absolute;left:0;top:0;transform-origin:50% 90%;will-change:transform}.it svg{display:block;width:100%;height:100%}${extraCss}</style>
<canvas id="c" width="1280" height="720"></canvas>${body}<canvas id="g" style="width:1280px;height:720px;mix-blend-mode:overlay;opacity:.55"></canvas><script>window.__T=${T};${COMMON_JS}`;

  if (name === "atelier") {
    const items = [["loaf", 360, 560, 440, 0], ["croissant", 150, 760, 270, 0.33], ["roll", 880, 600, 250, 0.66]];
    const body = items.map(([m], i) => `<div class="it" id="i${i}">${A(m, PAL_DARK)}</div>`).join("");
    return wrap(body, "#150B05") + `
var items=${JSON.stringify(items)};
var dust=mk(110,5,function(r){return{x:r()*W,y:r()*H,k:1+Math.floor(r()*2),a:.25+r()*.6,s:1+r()*2.6,ph:r()*TAU,dx:6+r()*22}});
var wisps=mk(5,9,function(r,i){return{x:450+i*95+r()*30,h:.9+r()*.5,ph:r()*TAU,a:.5+r()*.4}});
window.render=function(t){var p=t/T*TAU;
 var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#120904");g.addColorStop(.55,"#2A160A");g.addColorStop(1,"#3F2210");ctx.globalCompositeOperation="source-over";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 var og=ctx.createRadialGradient(W*.5,H*1.02,10,W*.5,H*1.02,H*(1.0+.05*Math.sin(p)));og.addColorStop(0,"rgba(255,150,60,"+(.62+.08*Math.sin(p))+")");og.addColorStop(1,"rgba(255,150,60,0)");ctx.fillStyle=og;ctx.fillRect(0,0,W,H);
 ctx.globalCompositeOperation="lighter";
 for(var b=0;b<3;b++){var bx=(280+b*360)+60*Math.sin(p+b*2.1),al=.07+.035*Math.sin(p*2+b);ctx.save();ctx.translate(bx,-60);ctx.rotate(.38);var lg=ctx.createLinearGradient(-90,0,90,0);lg.addColorStop(0,"rgba(255,200,120,0)");lg.addColorStop(.5,"rgba(255,214,150,"+al+")");lg.addColorStop(1,"rgba(255,200,120,0)");ctx.fillStyle=lg;ctx.fillRect(-90,0,180,1100);ctx.restore()}
 wisps.forEach(function(w){ctx.save();ctx.filter="blur(7px)";ctx.strokeStyle="rgba(255,238,215,"+(.12*w.a)+")";ctx.lineWidth=14;ctx.beginPath();for(var y=0;y<=300;y+=10){var yy=470-y*w.h,xx=w.x+Math.sin(y/38-p*2+w.ph)*(8+y*.09);if(y===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.stroke();ctx.restore()});
 dust.forEach(function(d){var y=((d.y-d.k*H*t/T)%H+H)%H,x=d.x+Math.sin(p*d.k+d.ph)*d.dx,a=d.a*(.55+.45*Math.sin(p*2+d.ph));ctx.fillStyle="rgba(255,236,205,"+a+")";ctx.beginPath();ctx.arc(x,y,d.s,0,TAU);ctx.fill()});
 ctx.globalCompositeOperation="source-over";
 items.forEach(function(it,i){var e=document.getElementById("i"+i),ph=it[4]*TAU,s=it[3],bob=Math.sin(p+ph)*10,rot=Math.sin(p+ph+1)*2.6;e.style.width=s+"px";e.style.height=s+"px";e.style.transform="translate("+(it[1])+"px,"+(it[2]-s*.9+bob)+"px) rotate("+rot+"deg)"});
 var vg=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.95);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.55)");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H)};
</script>`;
  }

  if (name === "gallery") {
    const items = ["loaf", "croissant", "roll", "cupcake", "baguettes"];
    const body = items.map((m, i) => `<div class="it" id="i${i}">${A(m)}</div><div class="it" id="s${i}" style="background:radial-gradient(ellipse,rgba(80,50,10,.34),transparent 70%);border-radius:50%"></div>`).join("");
    return wrap(body, "#fff") + `
var items=${JSON.stringify(items)};
window.render=function(t){var p=t/T*TAU;ctx.globalCompositeOperation="source-over";ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
 var cx=W/2,cy=H*.5;
 var gs=ctx.createRadialGradient(cx,cy-20,20,cx,cy-20,300);gs.addColorStop(0,"#FFD36A");gs.addColorStop(.7,"#F7BF4F");gs.addColorStop(1,"#F2AE36");
 ctx.fillStyle=gs;ctx.beginPath();ctx.arc(cx,cy-20,262+6*Math.sin(p),0,TAU);ctx.fill();
 ctx.strokeStyle="rgba(247,191,79,.5)";ctx.lineWidth=2;for(var r=0;r<3;r++){ctx.beginPath();ctx.arc(cx,cy-20,310+r*44+8*Math.sin(p+r),0,TAU);ctx.stroke()}
 var list=items.map(function(m,i){var th=p+i/items.length*TAU,z=Math.sin(th),x=cx+Math.cos(th)*400,y=cy+z*86+10,sc=.72+.28*(z+1)/2;return{i:i,x:x,y:y,sc:sc,z:z}}).sort(function(a,b){return a.z-b.z});
 list.forEach(function(o,k){var e=document.getElementById("i"+o.i),sh=document.getElementById("s"+o.i),s=250*o.sc;e.style.width=s+"px";e.style.height=s+"px";e.style.zIndex=10+k;e.style.transform="translate("+(o.x-s/2)+"px,"+(o.y-s*.82+Math.sin(p*2+o.i)*5)+"px)";
  sh.style.width=s*.8+"px";sh.style.height=s*.16+"px";sh.style.zIndex=5;sh.style.opacity=.5+.4*(o.z+1)/2;sh.style.transform="translate("+(o.x-s*.4)+"px,"+(o.y+s*.1)+"px)"})};
</script>`;
  }

  // motion: slow liquid colour for text to be cut out of
  return wrap("", "#fff") + `
var blobs=mk(7,21,function(r,i){return{x:r()*W,y:r()*H,r:260+r()*220,c:["#E8892B","#FF5A36","#FFC93C","#FF9EB5","#5A2A10","#FF7A2F","#F7B267"][i],hx:1+Math.floor(r()*2),hy:1+Math.floor(r()*2),ax:140+r()*220,ay:90+r()*160,ph:r()*TAU}});
var dust=mk(90,3,function(r){return{x:r()*W,y:r()*H,k:1+Math.floor(r()*2),a:.4+r()*.5,s:1+r()*3,ph:r()*TAU}});
window.render=function(t){var p=t/T*TAU;ctx.globalCompositeOperation="source-over";ctx.fillStyle="#FFE9C7";ctx.fillRect(0,0,W,H);
 blobs.forEach(function(b){var x=b.x+Math.sin(p*b.hx+b.ph)*b.ax,y=b.y+Math.cos(p*b.hy+b.ph)*b.ay,g=ctx.createRadialGradient(x,y,0,x,y,b.r);g.addColorStop(0,b.c);g.addColorStop(1,b.c+"00");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,b.r,0,TAU);ctx.fill()});
 dust.forEach(function(d){var y=((d.y-d.k*H*t/T)%H+H)%H,x=d.x+Math.sin(p+d.ph)*18;ctx.fillStyle="rgba(255,255,255,"+(d.a*(.5+.5*Math.sin(p*2+d.ph)))+")";ctx.beginPath();ctx.arc(x,y,d.s,0,TAU);ctx.fill()})};
</script>`;
}

// ------------------------------------------------------------------ run
async function main() {
  const what = process.argv[2] || "all";
  const { chromium } = require("playwright");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bakery-media-"));
  const browser = await chromium.launch();
  const out = (p) => { fs.mkdirSync(path.dirname(p), { recursive: true }); return p; };

  if (what === "images" || what === "all") {
    for (const [setName, S] of Object.entries(SETS)) {
      const page = await browser.newPage({ viewport: { width: S.w, height: S.h } });
      for (const item of MOTIFS) {
        const f = path.join(tmp, `${setName}-${item}.html`);
        fs.writeFileSync(f, productHtml(setName, item));
        await page.goto("file://" + f);
        await page.waitForTimeout(60);
        const jpg = path.join(tmp, `${setName}-${item}.jpg`);
        await page.screenshot({ path: jpg, type: "jpeg", quality: 92 });
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", jpg, "-vf", `scale=${Math.round(S.w * 0.84)}:-1:flags=lanczos`, "-c:v", "libwebp", "-quality", "80", "-compression_level", "6", out(path.join(OUT, "img", setName, item + ".webp"))]);
      }
      await page.close();
      console.log("images", setName, MOTIFS.length);
    }
  }

  if (what === "videos" || what === "all") {
    const specs = { atelier: 8, gallery: 10, motion: 8 };
    const only = process.argv[3];
    for (const [name, T] of Object.entries(specs)) {
      if (only && only !== name) continue;
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const f = path.join(tmp, `video-${name}.html`);
      fs.writeFileSync(f, videoHtml(name, T));
      await page.goto("file://" + f);
      const fps = 25, n = T * fps, dir = path.join(tmp, "frames-" + name);
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => window.render(t), i / fps);
        await page.screenshot({ path: path.join(dir, String(i).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 90 });
      }
      await page.close();
      const inp = ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%04d.jpg")];
      execFileSync("ffmpeg", [...inp, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out(path.join(OUT, "video", `${name}-hero.mp4`))]);
      execFileSync("ffmpeg", [...inp, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-an", out(path.join(OUT, "video", `${name}-hero.webm`))]);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(dir, "0000.jpg"), "-c:v", "libwebp", "-quality", "78", out(path.join(OUT, "video", `${name}-poster.webp`))]);
      console.log("video", name, T + "s", n + " frames");
    }
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
