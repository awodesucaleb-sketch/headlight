(function(){
const $=s=>document.querySelector(s);
const ldN=$('#ldNum'),ldB=$('#ldBar'),ldM=$('#ldMsg'),ldEl=$('#loader');let ldT=0,ldS=0;
function LD(p,m){ldT=Math.max(ldT,p);if(m)ldM.textContent=m;}
function LDdone(m){LD(100,m||'Ready');window.__ready=true;setTimeout(()=>{ldEl.classList.add('gone');setTimeout(()=>ldEl.remove(),600);},450);}
(function tick(){ // the counter eases towards the real progress value
  ldS+=(ldT-ldS)*.14;if(ldT-ldS<.4)ldS=ldT;
  ldN.textContent=String(Math.round(ldS)).padStart(3,'0');ldB.style.transform='scaleX('+Math.max(.04,ldS/100)+')';
  if(ldEl.isConnected)requestAnimationFrame(tick);
})();
LD(12,'Libraries ready');
const view=$('#view');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
view.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0b0f);
const camera=new THREE.PerspectiveCamera(35,1,.1,200);
camera.position.set(0,.25,10.5);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.target.set(0,-.2,0);controls.minDistance=2.5;controls.maxDistance=90;

const ambient=new THREE.AmbientLight(0xffffff,.08);scene.add(ambient);

/* ---------- Asaro head (embedded GLB) ---------- */
const skin=new THREE.MeshStandardMaterial({color:0xe6e2da,roughness:.8,metalness:0,side:THREE.DoubleSide});
const head=new THREE.Group();scene.add(head);
const pose=new THREE.Group();head.add(pose);const pivot=new THREE.Group();pose.add(pivot);
LD(20,'Fetching model');
fetch('assets/asaro-head.glb').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(bin=>{
  LD(40,'Decoding model');
  new THREE.GLTFLoader().parse(bin,'',gltf=>{
    const root=gltf.scene;
    root.traverse(o=>{if(o.isMesh){o.material=skin;o.castShadow=o.receiveShadow=true;}});
    root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3()),k=2.4/size.y;
    root.scale.setScalar(k);root.position.copy(ctr).multiplyScalar(-k);
    pivot.add(root);LD(75,'Building scene');requestAnimationFrame(()=>requestAnimationFrame(()=>LDdone()));
  },err=>{console.error('Model failed to load',err);LDdone('Model unavailable');});
}).catch(err=>{console.error('Model failed to fetch',err);LDdone('Model unavailable');});
pivot.rotation.y=Math.PI/2; // the scan faces -x; turn it to face the camera
$('#flip').onclick=()=>{pivot.rotation.y+=Math.PI;};
head.position.y=.15;

/* ---------- lights ---------- */
const lights=[];let selected=null,uid=0,showMarks=true,shadows=true,lightsOn=true,shadowStrength=1;
const NAMES={directional:'Directional',point:'Point',spot:'Spot'};
function addLight(type,o={}){
  if(lights.length>=6)return null;
  const s=Object.assign({id:++uid,type,color:'#ffffff',intensity:1.2,az:40,el:25,dist:5,cone:35},o);
  let L;
  if(type==='directional')L=new THREE.DirectionalLight(0xffffff,1);
  else if(type==='point')L=new THREE.PointLight(0xffffff,1,0,1);
  else{L=new THREE.SpotLight(0xffffff,1,0,.6,.4,1);}
  L.castShadow=shadows;L.shadow.mapSize.set(1024,1024);L.shadow.bias=-.0006;L.shadow.normalBias=.03;
  if(type==='directional'){const sc=L.shadow.camera;sc.left=-5;sc.right=5;sc.top=5;sc.bottom=-5;sc.near=.5;sc.far=16;}
  else L.shadow.camera.near=.5,L.shadow.camera.far=22;
  scene.add(L);
  // twin light without shadows: shadow intensity splits each light's power between the two
  const L2=type==='directional'?new THREE.DirectionalLight(0xffffff,0):type==='point'?new THREE.PointLight(0xffffff,0,0,1):new THREE.SpotLight(0xffffff,0,0,.6,.4,1);
  L2.castShadow=false;scene.add(L2);
  const mk=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),new THREE.MeshBasicMaterial());
  const ln=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({transparent:true,opacity:.35}));
  scene.add(mk,ln);
  s.L=L;s.L2=L2;s.mk=mk;s.ln=ln;s.n=lights.filter(x=>x.type===type&&x.name===s.name).length+1;
  lights.push(s);selected=s;apply(s);
  skin.needsUpdate=true;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});
  return s;
}
function apply(s){
  const a=s.az*Math.PI/180,e=s.el*Math.PI/180;
  const x=s.dist*Math.cos(e)*Math.sin(a),y=s.dist*Math.sin(e),z=s.dist*Math.cos(e)*Math.cos(a);
  s.L.position.set(x,y,z);s.L.color.set(s.color);s.L.intensity=s.intensity*shadowStrength;
  s.L2.position.copy(s.L.position);s.L2.color.set(s.color);s.L2.intensity=s.intensity*(1-shadowStrength);
  const en=lightsOn&&s.on!==false;s.L.visible=s.L2.visible=en;s.mk.material.transparent=true;s.mk.material.opacity=en?1:.25;
  if(s.type==='spot')s.L.angle=s.L2.angle=s.cone*Math.PI/180;
  s.mk.position.set(x,y,z);s.mk.material.color.set(s.color);s.mk.visible=s.ln.visible=showMarks;
  s.ln.material.color.set(s.color);
  s.ln.geometry.setFromPoints([new THREE.Vector3(x,y,z),new THREE.Vector3(0,0,0)]);
  s.mk.scale.setScalar(s.id===(selected&&selected.id)?1.5:1);
}
function removeLight(s){
  scene.remove(s.L,s.L2,s.mk,s.ln);s.L.dispose&&s.L.dispose();
  lights.splice(lights.indexOf(s),1);selected=lights[lights.length-1]||null;
  scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});
}
function clearAll(){while(lights.length)removeLight(lights[0]);}

/* ---------- UI ---------- */
function ctl(parent,label,min,max,step,key,fmt){
  const r=document.createElement('div');r.className='ctl';
  const id='c_'+key+selected.id;
  r.innerHTML='<label for="'+id+'">'+label+'</label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'"><output></output>';
  const i=r.querySelector('input'),o=r.querySelector('output');
  i.value=selected[key];o.textContent=fmt(selected[key]);
  const s=selected;
  i.oninput=()=>{s[key]=+i.value;o.textContent=fmt(s[key]);apply(s);};
  parent.appendChild(r);
}
function render(){
  const chips=$('#chips');chips.innerHTML='';
  lights.forEach(s=>{
    const b=document.createElement('button');b.className='chip'+(s===selected?' on':'');
    b.innerHTML='<span class="dot" style="background:'+s.color+'"></span>'+(s.name||NAMES[s.type])+' '+s.n;
    b.onclick=()=>{selected=s;lights.forEach(apply);render();};
    chips.appendChild(b);
  });
  const box=$('#sel');box.innerHTML='';
  if(!selected){box.innerHTML='<p class="empty">No lights yet. Add one above, or pick a preset.</p>';return;}
  const w=document.createElement('div');w.className='box';box.appendChild(w);
  const cr=document.createElement('div');cr.className='ctl';
  cr.innerHTML='<label for="lc">Colour</label><input id="lc" type="color"><span></span>';
  const ci=cr.querySelector('input');ci.value=selected.color;const s0=selected;
  ci.oninput=()=>{s0.color=ci.value;apply(s0);render2(s0);};
  w.appendChild(cr);
  const lr=document.createElement('label');lr.className='chk';lr.innerHTML='<input type="checkbox"> Light on';
  const li=lr.querySelector('input');li.checked=s0.on!==false;li.onchange=()=>{s0.on=li.checked;apply(s0);refreshMats();};
  w.appendChild(lr);
  ctl(w,'Intensity',0,4,.01,'intensity',v=>v.toFixed(2));
  ctl(w,'Direction',-180,180,1,'az',v=>v+'°');
  ctl(w,'Elevation',-90,90,1,'el',v=>v+'°');
  ctl(w,'Distance',2.5,10,.1,'dist',v=>v.toFixed(1));
  if(selected.type==='spot')ctl(w,'Cone angle',10,70,1,'cone',v=>v+'°');
  const d=document.createElement('button');d.className='del';d.textContent='Remove this light';
  d.onclick=()=>{removeLight(s0);lights.forEach(apply);render();};
  w.appendChild(d);
}
function render2(s){ // refresh chip dot colour without rebuilding the open panel
  const i=lights.indexOf(s),dot=$('#chips').children[i]&&$('#chips').children[i].querySelector('.dot');
  if(dot)dot.style.background=s.color;
}
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
  const t=b.dataset.add;
  addLight(t,{az:Math.round(Math.random()*120-60),el:20+Math.round(Math.random()*30)});
  lights.forEach(apply);render();
});
const PRE={
 studio:[['directional',{color:'#fff1e0',intensity:1.6,az:50,el:30}],['point',{color:'#9fc0ff',intensity:.55,az:-60,el:10}],['spot',{color:'#ffffff',intensity:1.3,az:165,el:30,dist:6}]],
 drama:[['directional',{color:'#ffd9a8',intensity:2.2,az:90,el:5}]],
 under:[['spot',{color:'#8cff9e',intensity:2,az:0,el:-45,dist:5,cone:45}]],
 top:[['spot',{color:'#ffffff',intensity:2.2,az:0,el:80,dist:5,cone:38}],['point',{color:'#ff8a5c',intensity:.4,az:20,el:0}]]
};
document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{
  clearAll();PRE[b.dataset.p].forEach(a=>addLight(a[0],a[1]));
  selected=lights[0];lights.forEach(apply);render();
});
function bind(id,fn){const i=$(id),o=i.parentNode.querySelector('output');const f=()=>{fn(i);if(o)o.textContent=(+i.value).toFixed(2);};i.oninput=f;f();}
bind('#amb',i=>ambient.intensity=+i.value);
bind('#exp',i=>{renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=+i.value;});
bind('#skin',i=>skin.color.set(i.value));
bind('#rough',i=>skin.roughness=+i.value);
$('#spin').onchange=e=>spin=e.target.checked;
$('#mark').onchange=e=>{showMarks=e.target.checked;lights.forEach(apply);};
$('#shad').onchange=e=>{shadows=e.target.checked;lights.forEach(s=>s.L.castShadow=shadows);renderer.shadowMap.needsUpdate=true;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});};
let spin=false;
const gc=document.createElement('canvas');gc.width=gc.height=256;
const gx=gc.getContext('2d'),gr=gx.createRadialGradient(128,128,10,128,128,128);
gr.addColorStop(0,'#fff');gr.addColorStop(.55,'#fff');gr.addColorStop(1,'#000');gx.fillStyle=gr;gx.fillRect(0,0,256,256);
const groundMat=new THREE.MeshStandardMaterial({color:0x8a8f99,roughness:.95,metalness:0,transparent:true,alphaMap:new THREE.CanvasTexture(gc),side:THREE.DoubleSide});
const ground=new THREE.Mesh(new THREE.CircleGeometry(9,64),groundMat); // soft-edged disc under the head
ground.rotation.x=-Math.PI/2;ground.position.y=-1.15;ground.receiveShadow=true;scene.add(ground);
let groundOn=true;$('#gon').onchange=e=>{groundOn=e.target.checked;};
$('#gcol').oninput=e=>groundMat.color.set(e.target.value);
(async()=>{ // image export needs the viewer's save permission; hide the control if it is unavailable
  async function fallbackSave({filename,data}){ // offline build: iOS share sheet if available, else a normal download
    try{
      const file=new File([data],filename,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:filename});return{status:'saved'};}
    }catch(e){if(e&&e.name==='AbortError')throw{code:'declined'};}
    const a=document.createElement('a');a.href=URL.createObjectURL(data);a.download=filename;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    return{status:'saved'};
  }
  const dl={save:fallbackSave};
  $('#expRow').hidden=false;
  const msg=t=>{$('#shotMsg').textContent=t;};
  $('#shot').onclick=()=>{
    const sc=+$('#shotScale').value,w=view.clientWidth,h=view.clientHeight,old=renderer.getPixelRatio();
    renderer.setPixelRatio(sc);renderer.setSize(w,h,false);renderer.render(scene,camera);
    renderer.domElement.toBlob(async b=>{
      renderer.setPixelRatio(old);renderer.setSize(w,h,false);
      if(!b){msg('Could not create the image. Try a smaller size.');return;}
      try{await dl.save({filename:'head-light-lab.png',data:b});msg('Image saved.');}
      catch(e){msg(e&&e.code==='declined'?'Save cancelled.':'Saving is not available here.');}
    },'image/png');
  };
})();
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const VIEWS={front:0,'three-l':40,'three-r':-40,'side-l':90,'side-r':-90,back:180,top:0},mirror={};
let lastView='front',tween=0,height='level';const HEIGHTS={level:8,high:35,low:-20};
function markView(n){document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===n));}
function goView(name){
  if(name===lastView&&mirror[name]!==undefined)mirror[name]*=-1; // pressing it again shows the other side
  lastView=name;markView(name);
  const tg=controls.target,off=camera.position.clone().sub(tg),d=off.length();
  const a0=Math.atan2(off.x,off.z),e0=Math.asin(off.y/d);
  const a1=(name==='keep'?a0*180/Math.PI:VIEWS[name])*Math.PI/180,e1=(name==='top'?85:HEIGHTS[height])*Math.PI/180;
  const da=((a1-a0+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  head.rotation.y=0;cancelAnimationFrame(tween);
  const place=k=>{const a=a0+da*k,e=e0+(e1-e0)*k;camera.position.set(Math.cos(e)*Math.sin(a),Math.sin(e),Math.cos(e)*Math.cos(a)).multiplyScalar(d).add(tg);};
  if(reduceMotion){place(1);return;}
  const t0=performance.now();
  (function step(now){const k=Math.min(1,(now-t0)/450);place(k*k*(3-2*k));if(k<1)tween=requestAnimationFrame(step);})(t0);
}
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>goView(b.dataset.v));
controls.addEventListener('start',()=>{cancelAnimationFrame(tween);lastView='';markView('');});
const CINE={
  teal:{L:[['spot',{color:'#ff9a4d',intensity:2,az:50,el:25,dist:5,cone:40}],['directional',{color:'#2ec4d6',intensity:1.8,az:-140,el:20}],['point',{color:'#1a6f86',intensity:.35,az:-50,el:0}]],amb:.04,exp:1.1},
  noir:{L:[['spot',{color:'#ffffff',intensity:2.6,az:70,el:40,dist:5,cone:30}],['directional',{color:'#ffffff',intensity:.6,az:-150,el:25}]],amb:.01,exp:1},
  rembrandt:{L:[['spot',{color:'#ffd9a8',intensity:2.2,az:45,el:45,dist:5,cone:32}],['point',{color:'#9fb4ff',intensity:.18,az:-60,el:5}]],amb:.03,exp:1.1},
  neon:{L:[['point',{color:'#ff2fa8',intensity:1.6,az:70,el:10}],['point',{color:'#28d7ff',intensity:1.6,az:-70,el:10}],['directional',{color:'#7a5cff',intensity:.8,az:180,el:30}]],amb:.03,exp:1.2},
  golden:{L:[['directional',{color:'#ffb36b',intensity:2.4,az:80,el:8}],['point',{color:'#6d8cff',intensity:.3,az:-80,el:30}],['spot',{color:'#ffd2a0',intensity:.9,az:160,el:15,dist:6,cone:40}]],amb:.1,exp:1.1}
};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{
  const c=CINE[b.dataset.c],lon=$('#lon');
  if(!lon.checked){lon.checked=true;lon.onchange({target:lon});}
  clearAll();c.L.forEach(a=>addLight(a[0],a[1]));
  selected=lights[0];lights.forEach(apply);render();
  const am=$('#amb'),ex=$('#exp');am.value=c.amb;am.oninput();ex.value=c.exp;ex.oninput();
});
const sI=$('#shint'),sO=sI.parentNode.querySelector('output');sO.textContent='100%';
sI.oninput=()=>{shadowStrength=+sI.value;sO.textContent=Math.round(shadowStrength*100)+'%';lights.forEach(apply);};
function markH(){document.querySelectorAll('[data-h]').forEach(b=>b.classList.toggle('on',b.dataset.h===height));}
document.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{height=b.dataset.h;markH();goView(lastView==='top'?'front':(lastView||'keep'));});
const setVal=(id,v)=>{const e=$(id);e.value=v;if(e.oninput)e.oninput({target:e});};
const setChk=(id,v)=>{const e=$(id);e.checked=v;if(e.onchange)e.onchange({target:e});};
function resetLights(){clearAll();PRE.studio.forEach(a=>addLight(a[0],a[1]));selected=lights[0];lights.forEach(apply);render();}
function resetCam(){cancelAnimationFrame(tween);height='level';markH();lastView='front';markView('front');camera.position.set(0,.25,10.5*focal/50);controls.target.set(0,-.2,0);head.rotation.y=0;dI.value=50;setZoom();}
const RESETS={
  'Lights':resetLights,
  'Presets':resetLights,
  'Cinematic looks':()=>{resetLights();setVal('#amb',.08);setVal('#exp',1);},
  'Camera view':resetCam,
  'Scene':()=>{setChk('#lon',true);setVal('#amb',.08);setVal('#exp',1);setVal('#shint',1);setChk('#keep',true);setVal('#focal',50);setChk('#gon',true);setVal('#gcol','#8a8f99');},
  'Asaro head':()=>{setVal('#skin','#e6e2da');setVal('#rough',.8);setChk('#spin',false);setChk('#mark',true);setChk('#shad',true);pivot.rotation.y=Math.PI/2;head.rotation.y=0;setVal('#yaw',0);setVal('#pitch',0);setVal('#roll',0);}
};
document.querySelectorAll('aside h2').forEach(h=>{
  const f=RESETS[h.textContent.trim()];if(!f)return;
  h.classList.add('sechead');
  const b=document.createElement('button');b.className='rst';b.textContent='Reset';b.setAttribute('aria-label','Reset '+h.textContent.trim()+' to default');
  b.onclick=f;h.appendChild(b);
});
let rimSide=1;
$('#addRim').onclick=()=>{ // backlight aimed at the head; each press uses the opposite side
  addLight('spot',{name:'Rim',color:'#cfe3ff',intensity:1.8,az:150*rimSide,el:25,dist:5,cone:28});
  rimSide*=-1;lights.forEach(apply);render();
};
const dI=$('#dist'),dO=dI.parentNode.querySelector('output');
const zOf=v=>.25*Math.pow(16,v/100); // 0.25x to 4x, 1x in the middle
const setZoom=()=>{camera.zoom=zOf(+dI.value);camera.updateProjectionMatrix();dO.textContent=camera.zoom.toFixed(2)+'×';};
dI.oninput=setZoom;setZoom();
function syncDist(){}
/* ---------- undo / redo ---------- */
const IDS_V=['amb','exp','shint','focal','dist','skin','rough','gcol','yaw','pitch','roll'],IDS_C=['lon','gon','keep','spin','mark','shad'];
let hist=[],hi=-1,restoring=false;
function snap(){
  const st={v:{},c:{},height,pivotY:pivot.rotation.y,sel:Math.max(0,lights.indexOf(selected)),
    L:lights.map(s=>({type:s.type,color:s.color,intensity:s.intensity,az:s.az,el:s.el,dist:s.dist,cone:s.cone,name:s.name,on:s.on}))};
  IDS_V.forEach(i=>{st.v[i]=$('#'+i).value;});IDS_C.forEach(i=>{st.c[i]=$('#'+i).checked;});
  return st;
}
const skey=st=>JSON.stringify(Object.assign({},st,{sel:0})); // which light is selected is not an undoable change
function restore(st){
  restoring=true;
  try{
    setChk('#keep',st.c.keep);setChk('#lon',st.c.lon);setChk('#shad',st.c.shad);
    clearAll();st.L.forEach(l=>addLight(l.type,Object.assign({},l)));
    selected=lights[Math.min(st.sel,lights.length-1)]||null;
    setVal('#shint',st.v.shint);
    ['amb','exp','focal','dist','skin','rough','gcol','yaw','pitch','roll'].forEach(i=>setVal('#'+i,st.v[i]));
    setChk('#gon',st.c.gon);setChk('#spin',st.c.spin);setChk('#mark',st.c.mark);
    height=st.height;markH();pivot.rotation.y=st.pivotY;
    lights.forEach(apply);render();
  }finally{restoring=false;}
}
function btns(){$('#undo').disabled=hi<=0;$('#redo').disabled=hi>=hist.length-1;}
function record(){
  if(restoring||!hist.length)return;
  const st=snap();if(skey(st)===skey(hist[hi]))return;
  hist=hist.slice(0,hi+1);hist.push(st);if(hist.length>100)hist.shift();
  hi=hist.length-1;btns();
}
function undo(){if(hi<=0)return;hi--;restore(hist[hi]);btns();}
function redo(){if(hi>=hist.length-1)return;hi++;restore(hist[hi]);btns();}
$('#undo').onclick=undo;$('#redo').onclick=redo;
const panel=document.querySelector('aside');
panel.addEventListener('change',()=>setTimeout(record,0)); // a slider drag counts once, when released
panel.addEventListener('click',e=>{if(!e.target.closest('#undoRow'))setTimeout(record,0);});
addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();
  if(k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}else if(k==='y'){e.preventDefault();redo();}
});
setTimeout(()=>{hist=[snap()];hi=0;btns();},0); // first snapshot once the page has finished setting up
pose.rotation.order='YXZ'; // turn first, then nod, then tilt
function setPose(){const r=d=>d*Math.PI/180;pose.rotation.set(r(+$('#pitch').value),r(+$('#yaw').value),r(+$('#roll').value));}
['yaw','pitch','roll'].forEach(id=>{const i=$('#'+id),o=i.parentNode.querySelector('output');i.oninput=()=>{setPose();o.textContent=i.value+'°';};o.textContent=i.value+'°';});
function refreshMats(){scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}
const fill=new THREE.AmbientLight(0xffffff,.9);fill.visible=false;scene.add(fill); // neutral light so the head stays visible with lighting off
$('#lon').onchange=e=>{lightsOn=e.target.checked;fill.visible=!lightsOn;lights.forEach(apply);refreshMats();};
let focal=50;const fovOf=f=>2*Math.atan(12/f)*180/Math.PI; // 24 mm sensor height
camera.fov=fovOf(focal);camera.updateProjectionMatrix();
const fIn=$('#focal'),fOut=fIn.parentNode.querySelector('output');fOut.textContent=focal+' mm';
fIn.oninput=()=>{
  const f=+fIn.value;
  if($('#keep').checked){const off=camera.position.clone().sub(controls.target).multiplyScalar(f/focal);camera.position.copy(controls.target).add(off);}
  focal=f;camera.fov=fovOf(f);camera.updateProjectionMatrix();fOut.textContent=f+' mm';
};
$('#fReset').onclick=()=>{fIn.value=50;fIn.oninput();};

PRE.studio.forEach(a=>addLight(a[0],a[1]));
selected=lights[0];lights.forEach(apply);render();

function size(){const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(size).observe(view);size();
(function loop(){
  requestAnimationFrame(loop);
  if(spin)head.rotation.y+=.004;
  ground.visible=groundOn&&camera.position.y>ground.position.y; // hide the disc when the camera drops below it
  syncDist();controls.update();renderer.render(scene,camera);
})();
})();
