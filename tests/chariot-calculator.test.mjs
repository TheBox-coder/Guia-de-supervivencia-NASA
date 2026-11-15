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
  append(...c){this.children.push(...c);for(const x of c)if(x&&typeof x==='object')x.parentNode=this;}replaceChildren(...c){this.children=[];this.append(...c);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(n,f){this.listeners[n]=f;}querySelector(t){const walk=e=>{for(const c of e.children||[]){if(c.tag===t)return c;const r=walk(c);if(r)return r;}return null;};return walk(this);}prepend(...c){this.children.unshift(...c);}scrollIntoView(){this.scrolled=true;}focus(){this.focused=true;}}
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

test('calculator links to observed dust from the Weather module without estimating storm duration',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),engine=(await import('../modules/survival-engine.cjs')).default;
 class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.className='';this.id='';this.value='';this.textContent='';this.checked=false;this.open=false;}append(...c){this.children.push(...c);for(const x of c)if(x&&typeof x==='object')x.parentNode=this;}replaceChildren(...c){this.children=[];this.append(...c);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(n,f){this.listeners[n]=f;}querySelector(t){const walk=e=>{for(const c of e.children||[]){if(c.tag===t)return c;const r=walk(c);if(r)return r;}return null;};return walk(this);}prepend(...c){this.children.unshift(...c);}scrollIntoView(){this.scrolled=true;}focus(){this.focused=true;}}
 const host=new El('section'),byId=new Map();let dataset=null;const events={};
 const document={getElementById:id=>id==='opsPanel-base'?host:byId.get(id)||null,createElement:t=>{const e=new El(t);return new Proxy(e,{set(o,k,v){o[k]=v;if(k==='id')byId.set(v,e);return true;},get:(o,k)=>o[k]});}};
 const origin={lat:18.44463,lon:77.45088};
 const window={JEZERO_CHARIOT_CALC:calc,JEZERO_I18N:{ui:es=>es},JEZERO_OPERATIONS:{getState:()=>({base:{}})},JEZERO_OPERATIONS_ENGINE:{CHARIOT_PROPOSAL:{batteryCapacityKWh:42,generationKW:1.2}},JEZERO_SURVIVAL_ENGINE:engine,JEZERO_SURVIVAL:{getApplicableDataset:()=>dataset,getWeatherOrigin:()=>origin},addEventListener:(n,f)=>{events[n]=f;}};
 vm.runInContext(fs.readFileSync(new URL('../modules/chariot-calculator.js',import.meta.url),'utf8'),vm.createContext({document,window,Number,Object}));
 const dust=()=>byId.get('chariotCalcDust');
 assert.match(dust().textContent,/sin observaciones de opacidad/);assert.equal(dust().dataset.state,'error');assert.match(dust().textContent,/no la estima/);
 const make=tau=>({format:'JEZERO-WEATHER',version:1,source:{name:'Test'},location:origin,units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:[298,299,300].flatMap(sol=>Array.from({length:24},(_,hour)=>({sol,localHour:hour,temperatureC:-55+20*Math.cos(2*Math.PI*hour/24),opticalDepth:tau})))});
 dataset=make(.5);events['jezero:weatherchange']();assert.match(dust().textContent,/τ 0\.50, nivel bajo/);assert.equal(dust().dataset.state,'ok');assert.doesNotMatch(dust().textContent,/Conviene revisar/);
 dataset=make(2.4);events['jezero:weatherchange']();assert.match(dust().textContent,/compatible con tormenta/);assert.match(dust().textContent,/Conviene revisar/);assert.equal(dust().dataset.state,'warn');
 assert.match(dust().textContent,/tu supuesto/);
});

test('endurance gives the longest wait the Chariot supports instead of predicting the storm',()=>{
 const e=calc.endurance(baseEmergency);assert.equal(e.ok,true);
 // (42/1.2 − 6.45) / (1.5 − 1.2) = 95.1666… h
 near(e.maxStormHours,(42/1.2-6.45)/.3);assert.equal(e.limitingFactor,'energy');assert.equal(e.canReturn,true);near(e.returnReserveKWh,7.74);
 // el límite es coherente con emergency(): justo en el límite cabe, un poco más no
 assert.equal(calc.emergency({...baseEmergency,stormHours:e.maxStormHours-.01}).withinCapacity,true);assert.equal(calc.emergency({...baseEmergency,stormHours:e.maxStormHours+.01}).withinCapacity,false);
 near(calc.endurance({...baseEmergency,generatorOn:false}).maxStormHours,(42/1.2-calc.emergency({...baseEmergency,generatorOn:false,stormHours:0}).returnKWh)/1.5);
});

test('endurance is capped by life support when energy is not the limit and handles an impossible return',()=>{
 const free=calc.endurance({...baseEmergency,essentialKW:1});assert.equal(free.energyHours,Infinity);assert.equal(free.limitingFactor,'life-support');
 near(free.maxStormHours,14*calc.SOL_HOURS-free.travelHours);
 const short=calc.endurance({...baseEmergency,essentialKW:1},{lifeSupportSols:3});near(short.maxStormHours,3*calc.SOL_HOURS-short.travelHours);
 const stuck=calc.endurance({...baseEmergency,returnDistanceKm:400},{capacityKWh:5});assert.equal(stuck.canReturn,false);assert.equal(stuck.maxStormHours,0);assert.equal(stuck.limitingFactor,'energy-return');
 assert.equal(calc.endurance({...baseEmergency,marginPct:-1}).ok,false);assert.equal(calc.endurance(baseEmergency,{lifeSupportSols:0}).ok,false);
});

test('scenarios compare labeled planning durations against battery and life support',()=>{
 const r=calc.scenarios(baseEmergency);assert.equal(r.ok,true);assert.deepEqual(r.scenarios.map(x=>x.sols),[3,14,28,60]);
 assert.equal(r.scenarios[0].verdict,'ok');near(r.scenarios[0].requiredKWh,calc.emergency({...baseEmergency,stormHours:3*calc.SOL_HOURS}).requiredKWh);
 for(const row of r.scenarios.slice(1))assert.equal(row.verdict,'both',row.id);
 assert.ok(r.scenarios.every(x=>x.basisEs&&x.basisEn&&x.es&&x.en));
 // sin generador y sin batería suficiente pero con soporte vital: solo energía
 const energyOnly=calc.scenarios({...baseEmergency,essentialKW:3},{capacityKWh:10,lifeSupportSols:100});assert.equal(energyOnly.scenarios.at(-1).verdict,'energy');
 // con energía de sobra, solo falla el soporte vital
 const lifeOnly=calc.scenarios({...baseEmergency,essentialKW:1},{lifeSupportSols:10});assert.deepEqual(lifeOnly.scenarios.map(x=>x.verdict),['ok','life-support','life-support','life-support']);
 assert.equal(calc.scenarios({...baseEmergency,stormHours:''}).ok,true);assert.equal(calc.scenarios({...baseEmergency,marginPct:200}).ok,false);
});

test('scenarios never present themselves as a forecast',()=>{
 for(const sc of calc.STORM_SCENARIOS){assert.match(sc.basisEs,/hipótesis|literatura|globales/i);assert.doesNotMatch(sc.basisEs,/pronóstic|predic/i);}
});

test('calculator card shows the wait limit and loads a scenario duration',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');
 class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.className='';this.id='';this.value='';this.textContent='';this.checked=false;this.open=false;}append(...c){this.children.push(...c);}replaceChildren(...c){this.children=[...c];}setAttribute(k,v){this.attrs[k]=v;}addEventListener(n,f){this.listeners[n]=f;}querySelector(t){const walk=e=>{for(const c of e.children||[]){if(c.tag===t)return c;const r=walk(c);if(r)return r;}return null;};return walk(this);}prepend(...c){this.children.unshift(...c);}scrollIntoView(){this.scrolled=true;}focus(){this.focused=true;}}
 const host=new El('section'),byId=new Map(),events={};let language='es',elapsedSols=0;
 const document={getElementById:id=>id==='opsPanel-base'?host:byId.get(id)||null,createElement:t=>{const e=new El(t);return new Proxy(e,{set(o,k,v){o[k]=v;if(k==='id')byId.set(v,e);return true;},get:(o,k)=>o[k]});}};
 const window={JEZERO_CHARIOT_CALC:calc,JEZERO_I18N:{ui:(es,en)=>language==='en'?en:es},JEZERO_OPERATIONS:{getState:()=>({base:{elapsedSols}})},JEZERO_OPERATIONS_ENGINE:{CHARIOT_PROPOSAL:{batteryCapacityKWh:42,generationKW:1.2,lifeSupportSols:14}},addEventListener(name,fn){(events[name]??=[]).push(fn);}};
 vm.runInContext(fs.readFileSync(new URL('../modules/chariot-calculator.js',import.meta.url),'utf8'),vm.createContext({document,window,Number,Object}));
 const all=[];(function walk(n){for(const c of n.children||[]){all.push(c);walk(c);}})(host);
 const scenarioList=all.find(n=>n.className&&n.className.includes('chariotScenarios'));assert.equal(scenarioList.children.length,4);
 const texts=n=>{const out=[];(function w(x){for(const c of x.children||[]){if(c.textContent)out.push(c.textContent);w(c);}})(n);return out;};
 assert.ok(texts(scenarioList.children[0]).some(t=>/Se puede esperar/.test(t)));assert.ok(texts(scenarioList.children[1]).some(t=>/Supera batería y soporte vital/.test(t)));
 assert.ok(all.some(n=>n.tag==='strong'&&/95\.2 h/.test(n.textContent)),'espera máxima 95.2 h');
 const button=scenarioList.children[2].children.find(c=>c.tag==='button');button.listeners.click();
 assert.equal(byId.get('chariotCalc-stormHours').value,String(Number((28*calc.SOL_HOURS).toFixed(1))));
 assert.ok(all.some(n=>n.tag==='strong'&&/^-?\d+\.\d\d kWh$/.test(n.textContent)));
 language='en';events['jezero:languagechange'].forEach(fn=>fn());
 const current=texts(host);assert.ok(current.includes('The battery'));assert.ok(current.some(t=>/95\.2 h.*sols/.test(t)));assert.ok(current.some(t=>/Maximum wait:.*sols/.test(t)));assert.ok(!current.some(t=>/Maximum wait:.*soles/.test(t)));
 elapsedSols=13;events['jezero:supportchange'].forEach(fn=>fn());assert.ok(texts(host).some(t=>/Remaining life support: 1\.00 sols/.test(t)));
 byId.get('chariotCalc-returnDistance').value='400';byId.get('chariotCalc-returnSpeed').value='1';byId.get('chariotCalc-returnTraction').value='0';byId.get('chariotCalc-essential').value='1';byId.get('chariotCalc-essential').listeners.input();
 assert.ok(texts(host).some(t=>/Return time exceeds remaining life support/.test(t)));assert.ok(!texts(host).some(t=>/Maximum wait:/.test(t)));

});


test('wait and duration scenarios subtract elapsed sols from the life-support limit',()=>{
 const options={elapsedSols:13},e=calc.endurance(baseEmergency,options);
 near(e.remainingLifeSupportSols,1);near(e.maxStormHours,calc.SOL_HOURS-e.travelHours);
 assert.equal(e.lifeSupportSols,14);assert.equal(e.elapsedSols,13);assert.equal(e.limitingFactor,'life-support');
 assert.ok(calc.scenarios(baseEmergency,options).scenarios.every(row=>!row.lifeOk));
 for(const elapsedSols of [14,15])assert.equal(calc.endurance(baseEmergency,{elapsedSols}).canReturn,false);
 for(const elapsedSols of [-1,'bad',Infinity]){assert.equal(calc.endurance(baseEmergency,{elapsedSols}).ok,false);assert.equal(calc.scenarios(baseEmergency,{elapsedSols}).ok,false);}
});

test('a return longer than remaining life support is impossible even with enough energy',()=>{
 const r=calc.endurance({...baseEmergency,essentialKW:1,returnTractionKW:0,returnDistanceKm:400,returnSpeedKmH:1});
 assert.equal(r.energyReturnOk,true);assert.equal(r.lifeReturnOk,false);assert.equal(r.canReturn,false);assert.equal(r.maxStormHours,0);assert.equal(r.limitingFactor,'life-return');
 const boundary={...baseEmergency,essentialKW:1,returnTractionKW:0,returnDistanceKm:calc.SOL_HOURS,returnSpeedKmH:1};
 assert.equal(calc.endurance(boundary,{elapsedSols:13}).canReturn,true);assert.equal(calc.endurance({...boundary,returnDistanceKm:calc.SOL_HOURS+.01},{elapsedSols:13}).canReturn,false);
});
