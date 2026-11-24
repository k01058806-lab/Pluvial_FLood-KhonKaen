/* ส่วนกลางของ index.html และ anim.html: แผนที่ Longdo, ชั้นน้ำผิวดิน/ท่อ, ขอบเขตตำบล, ปุ่มควบคุม */
(function(){
/* ---------- Longdo Map API key ----------
   ควรจำกัดโดเมนของ key ที่ map.longdo.com/console ให้ตรงกับเว็บที่เผยแพร่
   เปลี่ยนชั่วคราวได้ด้วย ?key=... ใน URL                                        */
const API_KEY = '04f028c2f8a0c41c78a862f7e22cfb7a';

const $ = id => document.getElementById(id);
const fmt = (x,d=0) => (x==null||isNaN(x)) ? '–' : x.toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const msg = t => { const m=$('msg'); m.textContent=t||''; m.style.display=t?'block':'none'; };

/* ---------- สี (ช่วงเดียวกับ polygon) ---------- */
const SB = [0.10,0.25,0.50,1.00,2.00,3.00];
const SC = ['#a9dcf6','#6ebef0','#3f93dc','#1f63b8','#0b3a8c','#061a52'];
const PB = [0,0.5,1,2,3,5];
const PC = ['#c7e9c0','#74c476','#238b45','#fdae61','#d7301f','#67001f'];
const step = (B,C) => { const e=['step',['get','d'],C[0]]; B.slice(1).forEach((b,i)=>e.push(b,C[i+1])); return e; };

const G = window.PIPE_GEOM, T = window.TAMBON;
const st = { R:null, layer:'surf', opa:.8, is3d:true, hs:3, tOn:true, rotating:false, onReady:null, bounds:(window.SCENARIOS||{}).bounds };

function colorbar(){
  const surf = st.layer==='surf';
  const B = surf?SB:PB, C = surf?SC:PC;
  $('cbt').textContent = surf ? $('cbt').dataset.surf : $('cbt').dataset.pipe;
  $('cbsw').innerHTML = C.map(c=>`<span style="background:${c}"></span>`).join('');
  $('cblb').innerHTML = B.map((b,i)=>`<span>${i===B.length-1?b.toFixed(2).replace(/\.?0+$/,'')+'+':b.toFixed(2).replace(/\.?0+$/,'')}</span>`).join('');
}

/* ---------- เส้นท่อ: รูปทรงเดียว เปลี่ยนเฉพาะค่าความลึก ---------- */
function pipeFC(vals){
  return {type:'FeatureCollection',features:G.seg.map((s,i)=>({type:'Feature',properties:{d:vals?vals[i]:0},
    geometry:{type:'LineString',coordinates:[[s[0],s[1]],[s[2],s[3]]]}}))};
}
const OUTS = {type:'FeatureCollection',features:G.out.map(p=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:p}}))};

/* ---------- Longdo ---------- */
const key = new URLSearchParams(location.search).get('key') || API_KEY;
const s = document.createElement('script');
s.src = 'https://api.longdo.com/map3/?key=' + encodeURIComponent(key);
s.onload = init; s.onerror = () => msg('โหลด Longdo Map SDK ไม่สำเร็จ (ตรวจ key / อินเทอร์เน็ต)');
document.head.appendChild(s);
function waitFor(test, ok, ms, fail){ const t0=Date.now(); (function p(){ let r=false; try{r=test()}catch(e){}
  if(r) ok(); else if(Date.now()-t0>ms) fail&&fail(); else setTimeout(p,150); })(); }

function init(){
  const [W,S,E,N] = st.bounds;
  const map = new longdo.Map({ placeholder:$('map'), location:{lon:(W+E)/2,lat:(S+N)/2}, zoom:12.6, pitch:55 });
  waitFor(()=>map.Renderer && map.Renderer.isStyleLoaded && map.Renderer.isStyleLoaded(), ()=>{
    const R = st.R = map.Renderer;
    try{ R.dragRotate.enable(); R.touchZoomRotate.enableRotation(); R.touchPitch && R.touchPitch.enable(); R.keyboard && R.keyboard.enable(); }catch(e){}
    home(false); addLayers();
    R.on('styledata', ()=>{ if(!R.getSource('flood')){ addLayers(); st.onReady && st.onReady(); } });
    R.on('move', placeLabels); R.on('resize', placeLabels); placeLabels();
    st.onReady && st.onReady();
  }, 20000, ()=>msg('แผนที่ยังไม่พร้อม – ตรวจ API key'));
}
function home(anim=true){
  const R = st.R, [W,S,E,N] = st.bounds;
  const pad = window.innerWidth>760 ? {left:parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side'))+24,top:70,right:20,bottom:80} : 20;
  let cam=null; try{ cam=R.cameraForBounds([[W,S],[E,N]],{padding:pad}); }catch(e){}
  cam = cam || {center:[(W+E)/2,(S+N)/2],zoom:12.6};
  const o = {center:cam.center, zoom:cam.zoom, pitch:st.is3d?55:0, bearing:st.is3d?-15:0};
  anim ? R.flyTo({...o,duration:1500}) : R.jumpTo(o);
}
const EMPTY = {type:'FeatureCollection',features:[]};
function beforeId(){
  const L = (st.R.getStyle().layers||[]);
  const hit = L.find(l => l.type==='fill-extrusion' || l.type==='symbol' || /build|อาคาร/i.test(l.id+' '+(l['source-layer']||'')));
  return hit ? hit.id : undefined;
}
function addLayers(){
  const R = st.R; if(R.getSource('flood')) return;
  const b = beforeId();
  R.addSource('flood',{type:'geojson',data:EMPTY,tolerance:0.2});
  R.addLayer({id:'flood',type:'fill-extrusion',source:'flood',paint:{'fill-extrusion-color':step(SB,SC),'fill-extrusion-opacity':st.opa,
    'fill-extrusion-height':0,'fill-extrusion-base':0,'fill-extrusion-vertical-gradient':false}}, b);
  R.addSource('tb',{type:'geojson',data:T});
  R.addLayer({id:'tb-line',type:'line',source:'tb',paint:{'line-color':'#7b2cbf','line-width':1.8,'line-dasharray':[3,1.5],'line-opacity':.95}}, b);
  R.addSource('pipe',{type:'geojson',data:pipeFC(null)});
  R.addLayer({id:'pipe-case',type:'line',source:'pipe',layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#0b1220','line-opacity':.55,'line-width':['interpolate',['linear'],['zoom'],11,4,14,9,17,16]}});
  R.addLayer({id:'pipe',type:'line',source:'pipe',layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':step(PB,PC),'line-width':['interpolate',['linear'],['zoom'],11,2.5,14,6,17,12]}});
  R.addSource('outs',{type:'geojson',data:OUTS});
  R.addLayer({id:'outs',type:'circle',source:'outs',paint:{'circle-radius':6,'circle-color':'#ff3b30','circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  style();
}
function style(){
  const R = st.R; if(!R || !R.getLayer('flood')) return;
  const surf = st.layer==='surf';
  R.setLayoutProperty('flood','visibility',surf?'visible':'none');
  ['pipe-case','pipe','outs'].forEach(l=>R.setLayoutProperty(l,'visibility',surf?'none':'visible'));
  R.setPaintProperty('flood','fill-extrusion-opacity',st.opa);
  R.setPaintProperty('pipe','line-opacity',Math.min(1,st.opa+.15));
  R.setPaintProperty('flood','fill-extrusion-height', st.is3d ? ['*',['get','d'],st.hs] : 0);
  R.setLayoutProperty('tb-line','visibility',st.tOn?'visible':'none');
  placeLabels(); colorbar();
}
/* ---------- ชื่อตำบล ---------- */
$('labels').innerHTML = T.labels.map(l=>`<div class="clab">ต.${l.name}</div>`).join('');
const labEls = [...document.querySelectorAll('.clab')];
function placeLabels(){
  const R = st.R; if(!R) return;
  labEls.forEach((el,i)=>{ const l=T.labels[i];
    if(!st.tOn){ el.style.display='none'; return; }
    const p=R.project([l.lon,l.lat]); el.style.display='block'; el.style.left=p.x+'px'; el.style.top=p.y+'px'; });
}
/* ---------- ปุ่มควบคุม ---------- */
function setLayer(l){ st.layer=l; document.querySelectorAll('#lay button').forEach(b=>b.classList.toggle('on',b.dataset.l===l)); style(); st.onLayer && st.onLayer(); }
document.querySelectorAll('#lay button').forEach(b=>b.onclick=()=>setLayer(b.dataset.l));
$('tOn').onchange = e=>{ st.tOn=e.target.checked; style(); };
$('opa').oninput  = e=>{ st.opa=e.target.value/100; style(); };
$('hs').oninput = e=>{ st.hs=+e.target.value; $('hsv').textContent=st.hs+'×'; style(); };
$('v3d').onclick = ()=>{ st.is3d=!st.is3d; $('v3d').classList.toggle('on',st.is3d); $('v3d').textContent=st.is3d?'3D':'2D'; style();
  if(st.R) st.R.easeTo({pitch:st.is3d?55:0, bearing:st.is3d?st.R.getBearing():0, duration:800}); };
$('rot').onclick = ()=>{ st.rotating=!st.rotating; $('rot').classList.toggle('on',st.rotating); if(st.rotating) spin(); else st.R&&st.R.stop(); };
function spin(){ if(!st.rotating||!st.R) return; st.R.rotateTo(st.R.getBearing()+40,{duration:5000,easing:t=>t}); st.R.once('moveend',()=>st.rotating&&spin()); }
$('home').onclick = ()=>st.R&&home();
$('toggle').onclick = ()=>$('side').classList.toggle('min');
colorbar();

window.KK = { st, $, fmt, msg, style, setLayer, pipeFC, EMPTY };
})();
