import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,normalize,lengthOf,readGift,makeLink} from '../dist/gift-data.js';

test('Unicode, special characters and multiline text round trip',()=>{
  const data={nombre:'Sol 🌼 & Luna',frase:'Para vos #primavera\n<b>Te quiero</b> 💛'};
  assert.deepEqual(readGift(new URL(makeLink('https://example.com/',data)).hash),data);
});
test('Unicode limits count code points, not UTF-16 units',()=>{
  assert.equal(lengthOf('🌼'.repeat(60)),60);
  assert.equal(normalize('🌼'.repeat(60),'nombre'),'🌼'.repeat(60));
  assert.equal(normalize('🌼'.repeat(61),'nombre'),DEFAULTS.nombre);
  assert.equal(normalize('a'.repeat(280),'frase'),'a'.repeat(280));
  assert.equal(normalize('a'.repeat(281),'frase'),DEFAULTS.frase);
});
test('Blank, missing, overlong and unsupported inputs use defaults',()=>{
  for(const hash of ['#broken','#v=2&nombre=Otra','#v=1','#v=1&nombre=++&frase=+'])assert.deepEqual(readGift(hash),DEFAULTS);
  assert.deepEqual(readGift('#v=1&nombre='+ 'a'.repeat(61)+'&frase=Hola'),{nombre:DEFAULTS.nombre,frase:'Hola'});
  assert.equal(readGift('#v=1&nombre=+Ana+&unknown=ok').nombre,'Ana');
});
test('Creating another gift replaces the old fragment and preserves origin/path',()=>{
  const url=new URL(makeLink('https://example.com/path/#v=2',DEFAULTS));
  assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,'/path/');assert.deepEqual(readGift(url.hash),DEFAULTS);
});
