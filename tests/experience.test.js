import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as data from '../dist/gift-data.js';

async function setup(reduced=false,failed=false){
  const elements=new Map();let animationCount=0;let focus='';
  const node=(id='')=>({id,hidden:false,disabled:false,value:'',textContent:'',dataset:{},children:[],handlers:{},clientWidth:358,clientHeight:375,style:{setProperty(){}},classList:{add(){},remove(){}},addEventListener(event,handler){this.handlers[event]=handler;},setAttribute(){},removeAttribute(){},focus(){focus=id;},append(child){this.children.push(child);},animate(){animationCount++;return {finished:new Promise(()=>{}),cancel(){}};}});
  const context={...data,document:{getElementById(id){if(!elements.has(id))elements.set(id,node(id));return elements.get(id);},createElement(){return node();}},matchMedia:()=>({matches:reduced,addEventListener(){}}),location:{hash:'#v=1',href:'https://example.com/#v=1'},Image:class{set src(_){queueMicrotask(()=>failed?this.onerror():this.onload());}},ResizeObserver:class{observe(){}},URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console,addEventListener(){}};
  vm.runInNewContext(readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,''),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {elements,context,animationCount:()=>animationCount,focus:()=>focus};
}
test('Reduced motion shows the same 24 flowers without travelling animations',async()=>{
  const app=await setup(true);const e=app.elements;
  assert.equal(e.get('scene').dataset.state,'start');
  await e.get('open-button').handlers.click();
  assert.equal(e.get('scene').dataset.state,'final');assert.equal(e.get('flowers').children.length,24);
  assert.equal(app.animationCount(),0);assert.equal(e.get('dedication').hidden,false);assert.equal(app.focus(),'recipient');
  e.get('replay').handlers.click();assert.equal(e.get('scene').dataset.state,'start');assert.equal(e.get('dedication').hidden,true);
});
test('Repeated activation cannot launch duplicate animation groups',async()=>{
  const app=await setup();app.elements.get('open-button').handlers.click();app.elements.get('open-button').handlers.click();
  assert.equal(app.animationCount(),24);assert.equal(app.elements.get('scene').dataset.state,'animating');
});
test('Failed images expose retry and keep open button disabled',async()=>{
  const app=await setup(false,true);assert.equal(app.elements.get('scene').dataset.state,'error');
  assert.equal(app.elements.get('retry').hidden,false);assert.equal(app.elements.get('open-button').disabled,true);
});
