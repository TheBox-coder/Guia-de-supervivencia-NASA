import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('Chariot marker survives map initialization and clears when its declaration is unavailable',()=>{
 const callbacks={},source={items:[],clear(){this.items=[];},addFeature(f){this.items.push(f);}};
 class Value{constructor(x){Object.assign(this,x);}set(){}setStyle(){}getSource(){return source;}}
 const ctx=vm.createContext({window:{addEventListener:(name,fn)=>{callbacks[name]=fn;}},setInterval:fn=>{callbacks.init=fn;return 1;},clearInterval(){},setTimeout(){},
  ol:{layer:{Vector:Value},source:{Vector:Value},Feature:Value,geom:{Point:Value},style:{Style:Value,RegularShape:Value,Fill:Value,Stroke:Value,Text:Value}}});
 vm.runInContext(fs.readFileSync(new URL('../modules/operations-map.js',import.meta.url),'utf8'),ctx);
 const api=ctx.window.JEZERO_SUPPORT_MAP;api.draw([],[],{lat:0,lon:0,name:'Chariot'});
 ctx.map={addLayer(){}};callbacks.init();assert.equal(source.items.length,1);
 callbacks['jezero:themechange']();assert.equal(source.items.length,1);
 api.draw([],[],null);assert.equal(source.items.length,0);
});
