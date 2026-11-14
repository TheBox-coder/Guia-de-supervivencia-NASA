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
 assert.throws(()=>ctx.addWeatherObservation({sol:301,localHour:1,temperatureC:-20},data.location,'Astronaut'),/Storage/);assert.equal(ctx.dataset,data);
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
