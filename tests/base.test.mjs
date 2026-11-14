import test from 'node:test';
import assert from 'node:assert/strict';
import engine from '../modules/operations-engine.cjs';
const now=Date.parse('2026-11-14T18:00:00Z');
const base={crew:2,hours:4,delayHours:2,energyLossPct:50,oxygenKg:10,oxygenRateKgH:.5,waterL:20,waterRateLH:1,energyKWh:12,powerKW:2,co2CapacityKg:8,co2RateKgH:.25,source:'Team planning assumptions',updatedAt:'2026-11-14T17:00:00Z'};
test('base budgets use total stocks and declared crew, independently of EVA budgets',()=>{
 const input={base,resources:{waterL:999,waterRateLH:100/10}},before=JSON.stringify(input);
 const result=engine.assessBase(input,{},now);
 assert.deepEqual(result.baseline.map(x=>x.remaining),[6,12,4,6]);
 assert.deepEqual(result.scenario.map(x=>x.remaining),[4,8,-6,5]);
 assert.deepEqual(result.baseline.map(x=>x.autonomyHours),[10,10,6,16]);
 assert.equal(result.scenarioHours,6);assert.equal(JSON.stringify(input),before);
});
test('missing, undated, future or stale base declarations do not fabricate reserves',()=>{
 assert.ok(engine.assessBase({}, {},now).baseline.every(x=>x.remaining===null));
 for(const b of [{...base,source:''},{...base,updatedAt:''},{...base,updatedAt:'2026-11-15T00:00:00Z'}])assert.ok(engine.assessBase({base:b},{},now).baseline.every(x=>x.remaining===null));
 assert.equal(engine.assessBase({base,criteria:{sensorAgeH:0}},{},now).usable,false);
 assert.equal(engine.assessBase({base:{...base,crew:null}},{},now).baseline[0].remaining,null);
});
test('base retains zero reserves and zero consumers without claiming infinite autonomy',()=>{
 const r=engine.assessBase({base:{...base,crew:0,energyKWh:0,powerKW:0}},{},now);
 assert.equal(r.baseline[0].remaining,10);assert.equal(r.baseline[0].autonomyHours,null);
 assert.equal(r.baseline[2].remaining,0);assert.equal(r.baseline[2].autonomyHours,null);
});
test('base validates boundaries and survives support export/import without changing legacy resources',()=>{
 for(const change of [{crew:1.5},{crew:true},{energyLossPct:101},{hours:-1},{waterL:'bad'},{updatedAt:'2026-02-30T00:00:00Z'}])assert.throws(()=>engine.state({base:{...base,...change}}));
 const original=engine.state({base,resources:{waterL:3}}),restored=engine.imported({format:'JEZERO-SUPPORT',version:1,state:JSON.parse(JSON.stringify(original))});
 assert.deepEqual(restored,original);assert.equal(restored.resources.waterL,3);
 const r=engine.assessBase(original,{draft:{points:[{lat:0,lon:0,name:'Base',type:'base'}]}},now);assert.equal(r.origin.lat,0);
});

test('Chariot position is declared independently of the planned EVA rendezvous',()=>{
 const draft={points:[{lat:18,lon:77,type:'base',name:'EVA departure'}]},mission={sequence:[{lat:18,lon:77,type:'base'}]};
 const raw={base:{...base,lat:19,lon:78,mobility:'moving'}};
 const result=engine.assessBase(raw,{draft,mission},now);
 assert.equal(result.origin.name,'Chariot');assert.equal(result.origin.lat,19);assert.equal(result.positionDeclared,true);assert.equal(result.mobility,'moving');assert.equal(result.evaOrigin.lat,18);assert.equal(result.rendezvousMoved,true);assert.ok(result.rendezvousDistanceKm>1);
 assert.equal(mission.sequence[0].lat,18);assert.equal(draft.points[0].lat,18);
 const legacy=engine.assessBase({base},{draft},now);assert.equal(legacy.positionDeclared,false);assert.equal(legacy.rendezvousDistanceKm,null);
});

test('EVA from parked Chariot fixes departure and return without changing existing targets or metadata',()=>{
 const target={lat:18.01,lon:77.01,name:'Target',type:'target',dwellMin:15};
 const draft={returnBase:false,points:[{lat:1,lon:1,type:'base'},target],missionMeta:{missionName:'Mission'},params:{speed:2}};
 const before=JSON.stringify(draft),raw={base:{...base,lat:0,lon:0,mobility:'parked'}};
 const payload=engine.evaFromChariot(raw,draft,now);
 assert.equal(payload.returnBase,true);assert.equal(payload.points[0].lat,0);assert.equal(payload.points[0].lon,0);assert.equal(payload.points[0].type,'base');assert.equal(payload.points[0].name,'Chariot · EVA');assert.deepEqual(payload.points[1],target);assert.notEqual(payload.points[1],target);assert.deepEqual(payload.missionMeta,draft.missionMeta);assert.equal(JSON.stringify(draft),before);
 const newDraft=engine.evaFromChariot(raw,{points:[]},now);assert.equal(newDraft.points.length,1);
 const moved=engine.assessBase({base:{...raw.base,lat:1}},{mission:{sequence:payload.points}},now);assert.equal(moved.rendezvousMoved,true);assert.equal(payload.points[0].lat,0);
});

test('EVA departure requires parked Chariot with complete, current location provenance',()=>{
 const chariot={...base,lat:18,lon:77,mobility:'parked'},draft={points:[]};
 for(const change of [{mobility:'moving'},{mobility:'unknown'},{lat:null,lon:null},{source:''},{updatedAt:''},{updatedAt:'2026-11-15T00:00:00Z'}])assert.throws(()=>engine.evaFromChariot({base:{...chariot,...change}},draft,now));
 assert.throws(()=>engine.evaFromChariot({base:chariot,criteria:{sensorAgeH:0}},draft,now));
 for(const change of [{lat:91},{lon:-181},{lat:null},{mobility:'flying'}])assert.throws(()=>engine.state({base:{...chariot,...change}}));
});

test('Chariot energy subtracts continuous generation and caps charging at declared battery capacity',()=>{
 const r=engine.assessBase({base:{...base,generationKW:1.2}}, {},now);
 assert.ok(Math.abs(r.baseline[2].remaining-8.8)<1e-10);assert.ok(Math.abs(r.baseline[2].autonomyHours-15)<1e-10);
 const charging=engine.assessBase({base:{...base,energyKWh:40,batteryCapacityKWh:42,powerKW:1,generationKW:3}},{},now);
 assert.equal(charging.baseline[2].remaining,42);assert.equal(charging.baseline[2].autonomyHours,null);
 const unknownCapacity=engine.assessBase({base:{...base,powerKW:1,generationKW:3}},{},now);
 assert.equal(unknownCapacity.baseline[2].remaining,null);
 const balanced=engine.assessBase({base:{...base,powerKW:1.2,generationKW:1.2}},{},now);
 assert.equal(balanced.baseline[2].remaining,12);assert.equal(balanced.baseline[2].autonomyHours,null);
 assert.throws(()=>engine.state({base:{...base,energyKWh:43,batteryCapacityKWh:42}}));
 assert.throws(()=>engine.state({base:{...base,generationKW:-1}}));
 assert.equal(engine.assessBase({base},{},now).generationKW,null);
 assert.equal(engine.CHARIOT_PROPOSAL.batteryCapacityKWh,42);assert.equal(engine.CHARIOT_PROPOSAL.generationKW,1.2);
});

// El mismo contrato que utiliza loadMissionPayload en el navegador.
test('Chariot departure remains a valid mission file for the existing importer',async()=>{
 const {default:validation}=await import('../modules/validation.cjs');
 const {readFile}=await import('node:fs/promises');
 const draft=JSON.parse(await readFile(new URL('../examples/04-eva-01-jezero.json',import.meta.url),'utf8'));
 const payload=engine.evaFromChariot({base:{...base,lat:18.4448,lon:77.4253,mobility:'parked'}},draft,now);
 assert.doesNotThrow(()=>validation.missionFile(payload));assert.equal(payload.points.length,draft.points.length);
});

test('life support warns only beyond 14 Martian sols and includes delay scenarios',()=>{
 const limit=14*engine.SOL_HOURS;assert.equal(engine.LIFE_SUPPORT_SOLS,14);
 assert.equal(engine.lifeSupportLimit(limit).exceeded,false);assert.equal(engine.lifeSupportLimit(limit+.01).exceeded,true);assert.equal(engine.lifeSupportLimit(14*24).exceeded,false);assert.equal(engine.lifeSupportLimit(null).durationSols,null);
 assert.equal(engine.assessBase({base:{hours:limit,delayHours:1}},{},now).lifeSupport.exceeded,false);assert.equal(engine.assessBase({base:{hours:limit,delayHours:1}},{},now).scenarioLifeSupport.exceeded,true);
 assert.throws(()=>engine.lifeSupportLimit(-1));assert.throws(()=>engine.lifeSupportLimit(true));
});

test('Chariot form displays sols and stores compatible hour values at the 14-sol boundary',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),s=fs.readFileSync(new URL('../modules/operations.js',import.meta.url),'utf8');
 const input={value:''},form={elements:{hours:input,id:{value:''},namedItem:()=>input}},ctx=vm.createContext({engine,specs:{base:[{key:'hours',type:'number'}]},$:()=>form,state:engine.state({}),structuredClone,ui:es=>es,persist(next){ctx.saved=next;return true;}});
 vm.runInContext(s.slice(s.indexOf(' function fill('),s.indexOf(' function fillAll(')),ctx);
 vm.runInContext(s.slice(s.indexOf(' function submit('),s.indexOf(' function rowActions(')),ctx);
 ctx.fill('base',{hours:14*engine.SOL_HOURS});assert.equal(input.value,14);
 input.value='14';ctx.submit('base',form);assert.equal(ctx.saved.base.hours,14*engine.SOL_HOURS);assert.equal(engine.lifeSupportLimit(ctx.saved.base.hours).exceeded,false);
});

test('Chariot can copy the mission base or unlock its coordinates for manual entry',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),source=fs.readFileSync(new URL('../modules/operations.js',import.meta.url),'utf8');
 const fields={lat:{value:1},lon:{value:2}},useBase={checked:true};let points=[{type:'base',lat:18.4448,lon:77.4253}],message='';
 const ctx=vm.createContext({useBase,$:id=>id==='opsForm-base'?{elements:fields}:{hidden:true},window:{JEZERO_UI_ACTIONS:{missionDraft:()=>({points})}},error:e=>{message=e.message;}});
 vm.runInContext(source.slice(source.indexOf(' function copyMissionBase(){'),source.indexOf(" useBase.addEventListener('change'",source.indexOf(' function copyMissionBase(){'))),ctx);
 ctx.copyMissionBase();assert.equal(fields.lat.value,18.4448);assert.equal(fields.lon.value,77.4253);assert.equal(fields.lat.readOnly,true);
 useBase.checked=false;ctx.copyMissionBase();assert.equal(fields.lat.readOnly,false);assert.equal(fields.lon.readOnly,false);
 points=[];useBase.checked=true;ctx.copyMissionBase();assert.equal(useBase.checked,false);assert.match(message,/Define primero/);assert.equal(fields.lat.value,18.4448);
});

test('Chariot accepts at most two whole occupants, including imported support files',()=>{
 for(const crew of [0,1,2])assert.equal(engine.state({base:{crew}}).base.crew,crew);
 for(const crew of [3,'3',100,2.5]){assert.throws(()=>engine.state({base:{crew}}));assert.throws(()=>engine.imported({format:'JEZERO-SUPPORT',version:1,state:{base:{crew}}}));}
});

test('previous Chariot crew counts above two require review without losing reserves',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),s=fs.readFileSync(new URL('../modules/operations.js',import.meta.url),'utf8');
 const ctx=vm.createContext({engine,localStorage:{getItem:()=>JSON.stringify({base:{crew:4,waterL:30,energyKWh:42}})}});
 vm.runInContext("let state=engine.state({});const KEY='test';"+s.slice(s.indexOf(' let crewNeedsReview='),s.indexOf(' const domains='))+"result={state,crewNeedsReview};",ctx);
 assert.equal(ctx.result.crewNeedsReview,true);assert.equal(ctx.result.state.base.crew,null);assert.equal(ctx.result.state.base.waterL,30);assert.equal(ctx.result.state.base.energyKWh,42);
});
