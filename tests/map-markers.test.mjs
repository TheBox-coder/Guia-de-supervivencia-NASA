import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../script.js',import.meta.url),'utf8');
const styles=Object.fromEntries(['Style','RegularShape','Circle','Fill','Stroke','Text'].map(k=>[k,class{constructor(properties){Object.assign(this,properties)}}]));
test('mission points use one numbered symbol and a separate, spaced caption',()=>{
 const ctx=vm.createContext({ol:{style:styles},ui:(es,en)=>en,themeColors:()=>({text:'#ffffff',bg:'#020611',accent:'#8a5cff',success:'#54e0a6',warning:'#ffc857'})});
 vm.runInContext(source.slice(source.indexOf('function hexAlpha('),source.indexOf('function routeFractionPoint(')),ctx);
 for(const kind of ['base','target','finish']){
  const result=ctx.pointStyle(kind,'4',{get:key=>key==='name'?'Destination':false},1);
  assert.equal(result.filter(s=>s.image).length,1,'Decorative symbols must not compete with the actual point');
  const marker=result.find(s=>s.image),caption=result.find(s=>!s.image&&s.text);
  assert.equal(marker.text.text,kind==='base'?'B':'04');assert.ok(caption.text.offsetY<-(marker.image.radius+10));assert.match(caption.text.text,/\(\+1\)$/);assert.ok(caption.text.backgroundFill);
 }
});
