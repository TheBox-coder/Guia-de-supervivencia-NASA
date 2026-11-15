import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('MOLA legend follows basemap selection, restored mode and color-altering overlays',()=>{
 const source=fs.readFileSync(new URL('../script.js',import.meta.url),'utf8');
 const nodes=Object.fromEntries(['molaLegend','molaHybridNote','molaStyleNote','molaOverlayNote','mapVisualMode','baseMapMode'].map(id=>[id,{hidden:true,value:id==='mapVisualMode'?'geology':'viking'}]));
 let thermal=false;const saved=[];
 const ctx=vm.createContext({$:id=>nodes[id],currentBaseMode:'viking',BASE_MAP_MODES:new Set(['viking','mola','hybrid']),MAP_VISUAL_MODES:new Set(['geology','relief','mono','eva']),BASE_MAP_KEY:'base',MAP_VIEW_KEY:'view',imageryLayer:null,molaLayer:null,map:null,requestAnimationFrame(){},localStorage:{setItem:(...p)=>saved.push(p)},document:{querySelector:()=>({dataset:{},setAttribute(){}})},window:{JEZERO_IMAGERY:{isThermal:()=>thermal,setMode(){}}}});
 vm.runInContext(source.slice(source.indexOf('function updateMolaLegend('),source.indexOf('function updateBaseMapStatus(')),ctx);
 ctx.updateBaseMapStatus=mode=>ctx.updateMolaLegend(mode);
 vm.runInContext(source.slice(source.indexOf('function setBaseMapMode('),source.indexOf("document.querySelectorAll('[data-base-map]').forEach(el=>el.addEventListener")),ctx);
 vm.runInContext(source.slice(source.indexOf('function setMapVisualMode('),source.indexOf('function currentPanelState(')),ctx);
 ctx.setBaseMapMode('mola',{persist:false});assert.equal(nodes.molaLegend.hidden,false);assert.equal(nodes.molaHybridNote.hidden,true);assert.equal(saved.length,0);
 ctx.setBaseMapMode('viking');assert.equal(nodes.molaLegend.hidden,true);
 ctx.setBaseMapMode('hybrid');assert.equal(nodes.molaLegend.hidden,false);assert.equal(nodes.molaHybridNote.hidden,false);
 ctx.setMapVisualMode('mono');assert.equal(nodes.molaStyleNote.hidden,false);
 ctx.setMapVisualMode('geology');assert.equal(nodes.molaStyleNote.hidden,true);
 thermal=true;ctx.updateMolaLegend();assert.equal(nodes.molaOverlayNote.hidden,false);
 thermal=false;ctx.updateMolaLegend();assert.equal(nodes.molaOverlayNote.hidden,true);
 ctx.setBaseMapMode('invalid');assert.equal(nodes.molaLegend.hidden,true);
});
