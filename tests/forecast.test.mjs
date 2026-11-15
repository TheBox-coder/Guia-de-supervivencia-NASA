import test from 'node:test';
import assert from 'node:assert/strict';
import engine from '../modules/survival-engine.cjs';
const observations=()=>({format:'JEZERO-WEATHER',version:1,source:{name:'Test observations only'},location:{lat:18.44463,lon:77.45088},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:24},(_,hour)=>({sol:300,localHour:hour,temperatureC:-55+20*Math.cos(2*Math.PI*hour/24),pressurePa:null,windMps:null}))});
test('observation forecast does not generate climate without imported data',()=>{
 assert.deepEqual(engine.observationForecast(null),{status:'missing-data',model:null,series:[]});
});
test('next-sol projection retains missing optional fields and provides bounded finite temperature values',()=>{
 const f=engine.observationForecast(observations());assert.equal(f.horizonSols,1);assert.equal(f.model.baseSol,301);assert.equal(f.series.length,25);assert.equal(f.model.pressurePa,null);assert.equal(f.model.windMps,null);
 for(const p of f.series){assert.ok(Number.isFinite(p.temperatureC));assert.ok(p.lowerC<=p.temperatureC&&p.upperC>=p.temperatureC);}
 assert.ok(Math.abs(f.series[0].temperatureC-f.series[24].temperatureC)<1e-8);
});
test('projection rejects unvalidated weather input instead of falling back to a generated pattern',()=>{
 assert.throws(()=>engine.observationForecast({}),/JEZERO-WEATHER/);const data=observations();data.records=data.records.slice(0,3);assert.throws(()=>engine.observationForecast(data),/12/);
});

test('regional ML forecast requires the base location and rejects distant weather history',()=>{
 const data=observations();assert.equal(engine.observationForecast(data,null).status,'missing-location');
 assert.equal(engine.observationForecast(data,data.location).status,'projection');
 const far=engine.observationForecast(data,{lat:-20,lon:-100});assert.equal(far.status,'location-mismatch');assert.equal(far.model,null);assert.deepEqual(far.series,[]);
 const delta=49/(3389.5*Math.PI/180);assert.equal(engine.observationForecast(data,{lat:data.location.lat+delta,lon:data.location.lon}).status,'projection');
 const outside=51/(3389.5*Math.PI/180);assert.equal(engine.observationForecast(data,{lat:data.location.lat+outside,lon:data.location.lon}).status,'location-mismatch');
});

test('astronaut observations retrain local regression and retain provenance without mutating history',()=>{
 const data=observations(),before=JSON.stringify(data),old=engine.observationForecast(data,data.location);
 const next=engine.appendWeatherObservation(data,data.location,{sol:301,localHour:12,temperatureC:10,pressurePa:720,windMps:0},'Astronaut A',Date.parse('2026-11-14T20:00:00Z'));
 const forecast=engine.observationForecast(next,data.location);
 assert.equal(forecast.model.algorithm,'supervised-harmonic-regression');assert.equal(forecast.model.recordCount,25);assert.equal(forecast.model.trainedRecords,25);assert.equal(forecast.model.baseSol,302);
 assert.notEqual(forecast.series[12].temperatureC,old.series[12].temperatureC);assert.equal(next.records.at(-1).observerSource,'Astronaut A');assert.equal(next.records.at(-1).windMps,0);assert.equal(next.records.at(-1).location.lat,data.location.lat);assert.equal(JSON.stringify(data),before);
 for(const [record,origin,source] of [[{sol:300,localHour:0,temperatureC:0},data.location,'A'],[{sol:301,localHour:3,temperatureC:100},data.location,'A'],[{sol:301,localHour:3,temperatureC:0},{lat:0,lon:0},'A'],[{sol:301,localHour:3,temperatureC:0},data.location,'']])assert.throws(()=>engine.appendWeatherObservation(data,origin,record,source));
 assert.equal(JSON.stringify(data),before);assert.throws(()=>engine.appendWeatherObservation(null,data.location,{sol:1,localHour:1,temperatureC:-30},'A'));
});

test('a storage failure does not replace the current weather history with an unsaved observation',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');const source=fs.readFileSync(new URL('../modules/survival.js',import.meta.url),'utf8'),start=source.indexOf('  function addWeatherObservation('),end=source.indexOf('  window.JEZERO_SURVIVAL=',start),data=observations();
 const ctx=vm.createContext({dataset:data,engine,KEY:'test',localStorage:{setItem(){throw Error('Storage unavailable');}},render(){assert.fail('must not render unsaved history');},error(){}});
 vm.runInContext(source.slice(start,end),ctx);
 assert.throws(()=>ctx.addWeatherObservation({sol:301,localHour:1,temperatureC:-20},data.location,'Astronaut'),/could not store/);assert.equal(ctx.dataset,data);
});

test('weather UI disables observations for another region and updates its chart after a new measurement',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),nodes=new Map(),events={};let dataset=observations(),origin={...dataset.location},resets=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='forecastHour'?'12':'',hidden:false,disabled:false,dataset:{},textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},append(){},replaceChildren(){this.innerHTML='';},querySelector:tag=>node('empty-'+tag)});return nodes.get(id);};
 node('forecastObservationForm').reset=()=>{resets++;};
 const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>node('button'),addEventListener(){}},window:{JEZERO_I18N:{ui:(es)=>es,getLanguage:()=> 'es',translateText:s=>s},JEZERO_SURVIVAL_ENGINE:engine,JEZERO_SURVIVAL:{getDataset:()=>dataset,getWeatherOrigin:()=>origin,addWeatherObservation(record,location,source){dataset=engine.appendWeatherObservation(dataset,location,record,source);events['jezero:weatherchange']();}},addEventListener:(name,fn)=>{events[name]=fn;}}});
 vm.runInContext(fs.readFileSync(new URL('../modules/forecast.js',import.meta.url),'utf8'),context);
 assert.equal(node('forecastObservationFields').disabled,false);assert.equal(node('forecastResults').hidden,false);const before=node('forecastTemp').textContent;
 origin={lat:-20,lon:-100};events['jezero:supportchange']();assert.equal(node('forecastObservationFields').disabled,true);assert.equal(node('forecastResults').hidden,true);assert.equal(node('forecastChart').innerHTML,'');
 origin=null;assert.doesNotThrow(()=>events['jezero:supportchange']());assert.equal(node('forecastObservationFields').disabled,true);
 origin={...dataset.location};events['jezero:supportchange']();
 for(const [id,value] of Object.entries({observationSol:'301',observationHour:'12',observationTemperature:'10',observationSource:'Astronaut'}))node(id).value=value;
 node('forecastObservationForm').listeners.submit({preventDefault(){},target:node('forecastObservationForm')});
 assert.equal(dataset.records.length,25);assert.notEqual(node('forecastTemp').textContent,before);assert.equal(resets,1);assert.equal(node('forecastError').hidden,true);
});

test('changing the Chariot region clears the Guide forecast without a weather/support event loop',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),nodes=new Map(),events=new Map(),data=observations();let origin={...data.location},weatherEvents=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},querySelector:()=>node('detail'),querySelectorAll:()=>[],scrollIntoView(){},focus(){}});return nodes.get(id);};
 const ctx=vm.createContext({console,document:{getElementById:node,querySelectorAll:()=>[]},localStorage:{getItem:k=>k==='jezero-survival-v1-weather'?JSON.stringify(data):null,setItem(){}},MutationObserver:class{observe(){}},CustomEvent:class{constructor(type){this.type=type;}},window:{JEZERO_SURVIVAL_ENGINE:engine,JEZERO_I18N:{ui:es=>es},JEZERO_OPERATIONS:{getState:()=>({base:origin})},JEZERO_UI_ACTIONS:{missionDraft:()=>({points:[]}),selectedMission:()=>null},addEventListener(name,fn){events.set(name,fn);},dispatchEvent(e){if(e.type==='jezero:weatherchange'){weatherEvents++;assert.ok(weatherEvents<10,'weather/support loop');events.get('jezero:supportchange')?.();}}}});
 vm.runInContext(fs.readFileSync(new URL('../modules/survival.js',import.meta.url),'utf8'),ctx);
 assert.equal(node('survivalError').textContent,'','Guide initialization error');assert.equal(weatherEvents,1);assert.ok(ctx.window.JEZERO_SURVIVAL.getApplicableDataset());
 origin={lat:-20,lon:-100};events.get('jezero:supportchange')();assert.equal(weatherEvents,2);assert.equal(ctx.window.JEZERO_SURVIVAL.getApplicableDataset(),null);assert.equal(ctx.window.JEZERO_SURVIVAL.getSnapshot().environment.series.length,0);
 assert.equal(ctx.window.JEZERO_SURVIVAL.getDataset().records.length,24);
});

const richObservations=({tau=i=>.5,dose=()=>28,wind=()=>6,sols=[298,299,300]}={})=>{const d=observations();d.records=sols.flatMap((sol,s)=>Array.from({length:24},(_,hour)=>({sol,localHour:hour,temperatureC:-55+20*Math.cos(2*Math.PI*hour/24),pressurePa:700+s,windMps:wind(sol,hour),opticalDepth:tau(sol,hour),doseRateUSvH:dose(sol,hour),humidityPct:5})));return d;};

test('environmental conditions summarize dust, radiation, wind and humidity from observations only',()=>{
 const f=engine.observationForecast(richObservations(),{lat:18.44463,lon:77.45088},{horizonHours:engine.SOL_HOURS*2}),c=f.conditions;
 assert.equal(c.dust.level,'clear');assert.equal(c.dust.median,.5);assert.equal(c.radiation.median,28);assert.equal(c.radiation.spike,false);
 assert.ok(Math.abs(c.radiation.exposureMSv-28*engine.SOL_HOURS*2/1000)<1e-9);assert.equal(c.radiation.exposureAssumption,'constant-median-rate');
 assert.equal(c.wind.max,6);assert.equal(c.humidity.median,5);assert.equal(c.daily.length,3);assert.equal(f.model.fieldCoverage.dust,72);assert.equal(f.model.fieldCoverage.radiation,72);
 assert.deepEqual(c.alerts.filter(a=>a.level!=='info'),[]);assert.equal(c.thresholds.heuristic,true);
});

test('missing dust and radiation produce NO-DATA alerts instead of a normal reading',()=>{
 const c=engine.observationForecast(observations(),{lat:18.44463,lon:77.45088}).conditions;
 assert.equal(c.dust,null);assert.equal(c.radiation,null);assert.equal(c.wind,null);
 for(const code of ['dust','radiation','wind','pressure'])assert.equal(c.alerts.find(a=>a.code===code).level,'unknown',code);
 assert.equal(c.alerts.some(a=>a.level==='info'),false);
});

test('rising dust optical depth raises caution and a storm-level reading raises an alert',()=>{
 const rising=engine.observationForecast(richObservations({tau:(sol,h)=>.6+(sol-298)*.5+h/24*.5}),{lat:18.44463,lon:77.45088}).conditions;
 assert.equal(rising.dust.rising,true);assert.ok(rising.dust.slopePerSol>=.15);assert.ok(rising.alerts.some(a=>a.code==='dust-rising'&&a.level==='warning'));
 const storm=engine.observationForecast(richObservations({tau:()=>2.4}),{lat:18.44463,lon:77.45088}).conditions;
 assert.equal(storm.dust.level,'storm');assert.equal(storm.alerts.find(a=>a.code==='dust').level,'alert');assert.equal(storm.dust.rising,false);
 assert.equal(engine.observationForecast(richObservations({tau:()=>3.5}),{lat:18.44463,lon:77.45088}).conditions.dust.level,'severe');
 assert.equal(engine.observationForecast(richObservations({tau:()=>1.4}),{lat:18.44463,lon:77.45088}).conditions.alerts.find(a=>a.code==='dust').level,'warning');
});

test('a radiation spike over the historical median raises an alert and strong wind raises caution',()=>{
 const spike=richObservations({dose:(sol,h)=>sol===300&&h===12?90:28,wind:(sol,h)=>sol===300&&h===3?16:6}),c=engine.observationForecast(spike,{lat:18.44463,lon:77.45088}).conditions;
 assert.equal(c.radiation.spike,true);assert.equal(c.radiation.max,90);assert.equal(c.alerts.find(a=>a.code==='radiation').level,'alert');
 assert.equal(c.alerts.find(a=>a.code==='wind').level,'warning');
 const gale=engine.observationForecast(richObservations({wind:()=>26}),{lat:18.44463,lon:77.45088}).conditions;assert.equal(gale.alerts.find(a=>a.code==='wind').level,'alert');
});

test('new observation fields are range-checked, kept as null when absent and carried by astronaut observations',()=>{
 const base=richObservations();
 for(const [field,value] of [['opticalDepth',11],['opticalDepth',-1],['doseRateUSvH',6000],['humidityPct',101]]){const bad=JSON.parse(JSON.stringify(base));bad.records[0][field]=value;assert.throws(()=>engine.weatherModel(bad),/fuera de rango/,field+value);}
 const plain=engine.weatherData(observations());for(const r of plain.records){assert.equal(r.opticalDepth,null);assert.equal(r.doseRateUSvH,null);assert.equal(r.humidityPct,null);}
 const next=engine.appendWeatherObservation(base,base.location,{sol:301,localHour:1,temperatureC:-40,opticalDepth:.9,doseRateUSvH:30,humidityPct:4},'Astronaut B',Date.parse('2026-11-14T20:00:00Z'));
 const last=next.records.at(-1);assert.equal(last.opticalDepth,.9);assert.equal(last.doseRateUSvH,30);assert.equal(last.humidityPct,4);
 const without=engine.appendWeatherObservation(base,base.location,{sol:301,localHour:2,temperatureC:-40},'Astronaut B');assert.equal(without.records.at(-1).opticalDepth,null);
 assert.deepEqual(engine.weatherModel(base).unusedFields,[]);
 assert.throws(()=>engine.appendWeatherObservation(base,base.location,{sol:301,localHour:3,temperatureC:-40,doseRateUSvH:99999},'A'),/fuera de rango/);
});

test('weather UI renders the conditions panel with alerts and trend charts',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),nodes=new Map(),events={};const dataset=richObservations({tau:()=>2.4}),origin={...dataset.location};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='forecastHour'?'12':'',hidden:false,disabled:false,dataset:{},textContent:'',innerHTML:'',children:[],addEventListener(){},setAttribute(){},append(...c){this.children.push(...c);},replaceChildren(...c){this.innerHTML='';this.children=c;},querySelector:tag=>node('empty-'+tag)});return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>({dataset:{},children:[],append(...c){this.children.push(...c);},setAttribute(){},addEventListener(){},textContent:'',innerHTML:''}),addEventListener(){}},window:{JEZERO_I18N:{ui:es=>es,getLanguage:()=>'es',translateText:s=>s},JEZERO_SURVIVAL_ENGINE:engine,JEZERO_SURVIVAL:{getDataset:()=>dataset,getWeatherOrigin:()=>origin},addEventListener:(name,fn)=>{events[name]=fn;}}});
 vm.runInContext(fs.readFileSync(new URL('../modules/forecast.js',import.meta.url),'utf8'),context);
 const alerts=node('forecastAlerts').children;assert.ok(alerts.length>=3);assert.equal(alerts[0].dataset.level,'alert');
 assert.match(alerts[0].children.at(-1).textContent,/Polvo/);assert.equal(node('forecastTrends').children.length,6);
 assert.match(node('forecastConditionsBasis').textContent,/No son predicciones/);
 const facts=node('forecastConditionFacts').children.map(a=>a.children.map(c=>c.textContent).join(' '));
 assert.ok(facts.some(f=>/Polvo · opacidad/.test(f)&&/2\.40/.test(f)));assert.ok(facts.some(f=>/sin blindaje/.test(f)));assert.ok(facts.some(f=>/Polvo proyectado/.test(f)&&/2\.40/.test(f)));assert.ok(facts.some(f=>/Radiación proyectada/.test(f)));assert.ok(facts.some(f=>/Exposición ambiental proyectada/.test(f)));
});
