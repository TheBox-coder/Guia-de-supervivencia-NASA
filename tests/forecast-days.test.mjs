import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import engine from '../modules/survival-engine.cjs';

test('forecast navigation uses mission days and preserves source sol indices across language switches',()=>{
 const ids=new Map(),events={};let language='en';
 class El{
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.textContent='';}
  addEventListener(name,fn){this.listeners[name]=fn}setAttribute(){}append(...items){this.children.push(...items)}replaceChildren(...items){this.children=items}get options(){return this.children.filter(x=>x.tag==='option')}
 }
 const node=id=>{if(!ids.has(id)){const el=new El();el.value=id==='forecastHour'?'12':'';ids.set(id,el)}return ids.get(id)};
 const data={format:'JEZERO-WEATHER',version:1,source:{name:'Synthetic test'},location:{lat:18.4446,lon:77.4509},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:24},(_,h)=>({sol:1002,localHour:h,temperatureC:-55+20*Math.cos(h/24*Math.PI*2)}))};
 const ctx=vm.createContext({document:{getElementById:node,createElement:tag=>new El(tag),querySelectorAll:()=>[],addEventListener(){}},window:{JEZERO_I18N:{ui:(es,en)=>language==='en'?en:es,getLanguage:()=>language},JEZERO_SURVIVAL_ENGINE:engine,JEZERO_SURVIVAL:{getDataset:()=>data,getWeatherOrigin:()=>data.location},JEZERO_OPERATIONS:{getState:()=>({base:data.location}),getBaseAssessment:()=>({hours:2*engine.SOL_HOURS,delayHours:0})},addEventListener:(name,fn)=>events[name]=fn}});
 vm.runInContext(fs.readFileSync(new URL('../modules/forecast.js',import.meta.url),'utf8'),ctx);
 assert.equal(node('forecastDays').children[0].textContent,'Mission day 1');assert.equal(node('forecastSolSelect').options[0].textContent,'Mission day 1');assert.match(node('forecastCoverage').textContent,/Last observed sol: 1002; projected indices: 1003–1004/);
 node('forecastDays').children[1].listeners.click();assert.equal(node('forecastSolSelect').value,'1');assert.match(node('forecastSol').textContent,/Mission day 2/);
 language='es';events['jezero:languagechange']();assert.equal(node('forecastSolSelect').options[0].textContent,'Día 1 de la misión');assert.match(node('forecastSol').textContent,/Día 2 de la misión/);
 assert.equal(data.records[0].sol,1002);
});
