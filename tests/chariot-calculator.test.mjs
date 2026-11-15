import test from 'node:test';
import assert from 'node:assert/strict';
import calc from '../modules/chariot-calculator-engine.cjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
const baseMission={distanceKm:12,speedKmH:8,tractionKW:4,auxKW:.6,reservePct:20};
const baseEmergency={stormHours:24,essentialKW:1.5,returnDistanceKm:12,returnSpeedKmH:8,returnTractionKW:4,marginPct:20,generatorOn:true};

test('mission reproduces the Chariot calculator defaults',()=>{
 const r=calc.mission(baseMission);assert.equal(r.ok,true);
 near(r.totalDistanceKm,24);near(r.driveHours,3);near(r.consumptionKWh,13.8);near(r.generationKWh,3.6);near(r.netKWh,10.2);near(r.usableKWh,33.6);assert.equal(r.sufficient,true);
 near(r.totalSols,3/calc.SOL_HOURS);
});

test('mission reports insufficient capacity and accepts a generation surplus',()=>{
 assert.equal(calc.mission({...baseMission,distanceKm:60}).sufficient,false);
 const surplus=calc.mission({...baseMission,tractionKW:0,auxKW:.1});assert.ok(surplus.netKWh<0);assert.equal(surplus.sufficient,true);
});

test('mission honors a declared battery capacity and generation',()=>{
 const r=calc.mission(baseMission,{capacityKWh:20,generationKW:0});near(r.usableKWh,16);near(r.generationKWh,0);near(r.netKWh,13.8);assert.equal(r.sufficient,true);
 assert.equal(calc.mission({...baseMission,distanceKm:20},{capacityKWh:20,generationKW:0}).sufficient,false);
});

test('mission rejects missing or out-of-range values instead of calculating',()=>{
 for(const bad of [{distanceKm:0},{distanceKm:''},{distanceKm:null},{speedKmH:0},{tractionKW:-1},{auxKW:-.1},{reservePct:100},{reservePct:-1},{reservePct:'abc'},{distanceKm:Infinity}]){
  const r=calc.mission({...baseMission,...bad});assert.equal(r.ok,false,JSON.stringify(bad));assert.match(r.error,/ \/ /);
 }
 assert.equal(calc.mission(baseMission,{capacityKWh:-1}).ok,false);assert.equal(calc.mission(baseMission,{generationKW:-1}).ok,false);
});

test('emergency reproduces the Chariot calculator defaults',()=>{
 const r=calc.emergency(baseEmergency);assert.equal(r.ok,true);
 near(r.waitKWh,7.2);near(r.returnKWh,6.45);near(r.extraKWh,2.73);near(r.requiredKWh,16.38);near(r.travelHours,1.5);assert.equal(r.withinCapacity,true);
});

test('emergency without generator needs more reserve and can exceed the battery',()=>{
 const on=calc.emergency(baseEmergency),off=calc.emergency({...baseEmergency,generatorOn:false});
 assert.ok(off.requiredKWh>on.requiredKWh);near(off.waitKWh,36);
 const long=calc.emergency({...baseEmergency,stormHours:120,generatorOn:false});assert.equal(long.withinCapacity,false);
});

test('generation surplus during the wait is not credited as extra reserve',()=>{
 const r=calc.emergency({...baseEmergency,essentialKW:.5,returnTractionKW:0});near(r.waitKWh,0);near(r.returnKWh,0);near(r.requiredKWh,0);
});

test('emergency validates its inputs and treats an omitted generator flag as operating',()=>{
 for(const bad of [{stormHours:-1},{essentialKW:-1},{returnDistanceKm:-1},{returnSpeedKmH:0},{returnTractionKW:-1},{marginPct:101},{marginPct:-1},{stormHours:''}]){
  assert.equal(calc.emergency({...baseEmergency,...bad}).ok,false,JSON.stringify(bad));
 }
 const {generatorOn,...rest}=baseEmergency;near(calc.emergency(rest).requiredKWh,16.38);
 near(calc.emergency({...baseEmergency,returnDistanceKm:0}).returnKWh,0);
});

test('calculator card mounts in the Chariot section, recalculates and follows declared Chariot data',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');
 class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.className='';this.id='';this.value='';this.textContent='';this.checked=false;this.open=false;this.type='';}
  prepend(...c){this.children.unshift(...c);}scrollIntoView(){this.scrolled=true;}focus(){this.focused=true;}
  append(...c){this.children.push(...c);for(const x of c)if(x&&typeof x==='object')x.parentNode=this;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(n,f){this.listeners[n]=f;}querySelector(t){const walk=e=>{for(const c of e.children||[]){if(c.tag===t)return c;const r=walk(c);if(r)return r;}return null;};return walk(this);}}
 const host=new El('section');let declared={batteryCapacityKWh:null,generationKW:null};const byId=new Map();
 const document={getElementById:id=>id==='opsPanel-base'?host:byId.get(id)||null,createElement:t=>{const e=new El(t);return new Proxy(e,{set(o,k,v){o[k]=v;if(k==='id')byId.set(v,e);return true;},get:(o,k)=>k==='__raw'?o:o[k]});}};
 const ctx=vm.createContext({document,window:{JEZERO_CHARIOT_CALC:calc,JEZERO_I18N:{ui:(es)=>es},JEZERO_OPERATIONS:{getState:()=>({base:declared})},JEZERO_OPERATIONS_ENGINE:{CHARIOT_PROPOSAL:{batteryCapacityKWh:42,generationKW:1.2}}},Number,Object});
 vm.runInContext(fs.readFileSync(new URL('../modules/chariot-calculator.js',import.meta.url),'utf8'),ctx);
 assert.equal(host.children.length,2);const el=id=>document.getElementById(id);
 el('openChariotCalculator').listeners.click();assert.equal(el('chariotCalculator').scrolled,true);assert.equal(el('chariotCalcTitle').focused,true);
 assert.equal(el('chariotCalc-capacity').value,'42');assert.equal(el('chariotCalc-generation').value,'1.2');
 const text=()=>host.children[1].querySelector('strong');assert.ok(text());
 // distancia 12 km → demanda neta 10,20 kWh
 const strongs=[];(function walk(n){for(const c of n.children||[]){if(c.tag==='strong')strongs.push(c.textContent);walk(c);}})(host);
 assert.ok(strongs.includes('24.00 km'));assert.ok(strongs.includes('10.20 kWh'));assert.ok(strongs.includes('33.60 kWh'));
 el('chariotCalc-distance').value='60';el('chariotCalc-distance').listeners.input();
 const after=[];(function walk(n){for(const c of n.children||[]){if(c.tag==='strong')after.push(c.textContent);walk(c);}})(host);
 assert.ok(after.includes('120.00 km'));
 el('chariotCalc-distance').value='';el('chariotCalc-distance').listeners.input();
 const dashes=[];(function walk(n){for(const c of n.children||[]){if(c.tag==='strong')dashes.push(c.textContent);walk(c);}})(host);assert.ok(dashes.includes('—'));
 declared={batteryCapacityKWh:20,generationKW:0};ctx.window.JEZERO_CHARIOT_CALCULATOR.reload();
 assert.equal(el('chariotCalc-capacity').value,'20');assert.equal(el('chariotCalc-generation').value,'0');
});

test('calculator is loaded after the Chariot module and cached offline',async()=>{
 const fs=await import('node:fs'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 const ops=html.indexOf('modules/operations.js'),eng=html.indexOf('modules/chariot-calculator-engine.cjs'),ui=html.indexOf('modules/chariot-calculator.js');
 assert.ok(ops>0&&eng>ops&&ui>eng);assert.match(sw,/chariot-calculator-engine\.cjs/);assert.match(sw,/chariot-calculator\.js/);
});
