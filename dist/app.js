import {DEFAULTS,LIMITS,lengthOf,readGift,makeLink} from './gift-data.js';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = $('scene');
const flowerNodes = [];
let animations = [];
let run = 0;
let loaded = false;
let loading = false;
let currentState = 'loading';
let toolLifecycle;
let sceneSize = '';

// A compact domed bouquet. These are the same 24 nodes used by the opening.
const positions = [[-.15,.16],[.06,.13],[.24,.19],[-.31,.23],[-.08,.26],[.15,.28],[.36,.29],[-.43,.35],[-.23,.37],[0,.38],[.25,.40],[.46,.42],[-.34,.48],[-.12,.49],[.11,.51],[.34,.53],[-.43,.59],[-.23,.61],[0,.62],[.22,.64],[-.31,.71],[-.09,.73],[.12,.74],[.30,.72]];
function geometry(index, phase) {
  const width=scene.clientWidth,height=scene.clientHeight;
  const bouquetWidth=Math.min(width*.85,height*.77);
  const size=Math.min(76,bouquetWidth*.255)*(0.89+(index%4)*.055);
  let x,y,rotation;
  if(phase==='final') {
    x=width/2+positions[index][0]*bouquetWidth;
    y=height*.04+positions[index][1]*height*.49;
    rotation=(index*37)%90-45;
  } else if(phase==='spread') {
    x=width*(.09+((index*17)%24)/24*.82);
    y=height*(.06+((index*11)%24)/24*.86);
    rotation=index*41-180;
  } else {
    const angle=index/24*Math.PI*2;
    x=width/2+Math.cos(angle)*Math.min(width*.39,190);
    y=height/2+Math.sin(angle)*height*.37;
    rotation=index*27;
  }
  return {transform:`translate(${x-size/2}px, ${y-size/2}px) rotate(${rotation}deg)`,size};
}
function place(phase) {
  flowerNodes.forEach((node,index)=>{
    const p=geometry(index,phase);
    node.style.setProperty('--size',`${p.size}px`);
    node.style.transform=p.transform;
    node.style.opacity=phase==='start' && index%3!==0?'0':'1';
  });
}
function stopAnimations(){animations.forEach(a=>a.cancel());animations=[];}
function state(value){currentState=value;scene.dataset.state=value;}
function finalFrame(focus=true){
  stopAnimations();state('final');place('final');
  $('dedication').hidden=false;
  if(focus)$('recipient').focus({preventScroll:true});
}
async function openGift(){
  if(!loaded || currentState!=='start')return;
  const token=++run;
  $('open-button').disabled=true;
  $('gift').classList.add('is-open');
  sceneSize = `${scene.clientWidth}:${scene.clientHeight}`;
  state('animating');
  place('start');
  if(reducedMotion.matches){finalFrame();return;}
  flowerNodes.forEach((node,index)=>{
    const start=geometry(index,'start'),spread=geometry(index,'spread'),end=geometry(index,'final');
    node.style.setProperty('--size',`${end.size}px`);
    node.style.transform=end.transform;
    node.style.opacity='1';
    const animation=node.animate([
      {transform:start.transform,opacity:index%3===0?1:0,offset:0},
      {transform:spread.transform,opacity:1,offset:.35},
      {transform:end.transform,opacity:1,offset:1}
    ],{duration:4900+(index%5)*40,easing:'cubic-bezier(.4,0,.2,1)',fill:'none'});
    animations.push(animation);
  });
  await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
  if(token!==run)return;
  finalFrame();
}
function resetGift(){
  ++run;stopAnimations();$('dedication').hidden=true;$('gift').classList.remove('is-open');
  state(loaded?'start':'loading');$('open-button').disabled=!loaded;place('start');
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>reject(new Error('timeout')),15000);img.onload=()=>{clearTimeout(timeout);resolve();};img.onerror=()=>{clearTimeout(timeout);reject(new Error('image'));};img.src=src;});}
async function preload(){
  if(loading || loaded)return;
  loading=true;
  $('retry').hidden=true;$('loading-status').hidden=false;$('loading-status').textContent='Preparando tus flores…';
  try{await Promise.all(['assets/daisy.png','assets/bouquet-base.png'].map(loadImage));flowerNodes.forEach(img=>{img.src='assets/daisy.png';});document.getElementById('bouquet-base').src='assets/bouquet-base.png';loaded=true;$('loading-status').hidden=true;resetGift();}
  catch{state('error');$('loading-status').textContent='No pudimos cargar las flores. Revisá tu conexión.';$('loading-status').style.bottom='53px';$('retry').hidden=false;}
  finally{loading=false;}
}
function updateCounts(){
  $('name-count').textContent=`${lengthOf($('name').value)} / 60`;
  $('message-count').textContent=`${lengthOf($('message').value)} / 280`;
  $('form-error').textContent='';$('name').removeAttribute('aria-invalid');$('message').removeAttribute('aria-invalid');
  $('share-result').hidden=true;
}
function createLink(){
  for(const [id,key] of [['name','nombre'],['message','frase']]){
    if(lengthOf($(id).value.trim())>LIMITS[key]){
      $('form-error').textContent=key==='nombre'?'El nombre puede tener hasta 60 caracteres.':'La frase puede tener hasta 280 caracteres.';
      $(id).setAttribute('aria-invalid','true');$(id).focus();return null;
    }
  }
  const link=makeLink(location.href,{nombre:$('name').value,frase:$('message').value});
  $('gift-link').value=link;$('open-gift').href=link;$('share-result').hidden=false;$('copy-status').textContent='';
  return link;
}
function route(){
  ++run;stopAnimations();toolLifecycle?.abort();
  const isGift=location.hash.length>0;
  $('editor').hidden=isGift;$('gift').hidden=!isGift;
  if(isGift){const data=readGift(location.hash);$('recipient').textContent=data.nombre;$('dedication-text').textContent=data.frase;resetGift();if(!loaded)preload();}
  else registerEditorTool();
}
function registerEditorTool(){
  if(!document.modelContext?.registerTool)return;
  toolLifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({name:'create_flower_gift_link',title:'Crear enlace de flores',description:'Completa la dedicatoria visible y crea un enlace compartible. No lo envía a nadie.',inputSchema:{type:'object',properties:{nombre:{type:'string'},frase:{type:'string'}},required:['nombre','frase'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
    if(!input || typeof input.nombre!=='string' || typeof input.frase!=='string' || lengthOf(input.nombre.trim())>60 || lengthOf(input.frase.trim())>280)throw new Error('Nombre o frase inválidos.');
    $('name').value=input.nombre;$('message').value=input.frase;updateCounts();return {url:createLink()};
  }},{signal:toolLifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability. */}
}
for(let i=0;i<24;i++){const img=document.createElement('img');img.src='assets/daisy.png';img.alt='';img.className='flower';img.draggable=false;$('flowers').append(img);flowerNodes.push(img);}
$('name').value=DEFAULTS.nombre;$('message').value=DEFAULTS.frase;updateCounts();
$('name').addEventListener('input',updateCounts);$('message').addEventListener('input',updateCounts);
$('gift-form').addEventListener('submit',event=>{event.preventDefault();createLink();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('gift-link').value);$('copy-status').textContent='Enlace copiado. Ya podés compartirlo ♡';}catch{$('gift-link').focus();$('gift-link').select();$('copy-status').textContent='Seleccionamos el enlace para que puedas copiarlo.';}});
$('open-button').addEventListener('click',openGift);$('retry').addEventListener('click',preload);
$('replay').addEventListener('click',()=>{resetGift();$('open-button').focus({preventScroll:true});});
addEventListener('hashchange',route);
new ResizeObserver(()=>{const nextSize=`${scene.clientWidth}:${scene.clientHeight}`;if(nextSize===sceneSize)return;sceneSize=nextSize;if(currentState==='animating'){++run;finalFrame(false);}else place(currentState==='final'?'final':'start');}).observe(scene);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches&&currentState==='animating'){++run;finalFrame();}});
route();
