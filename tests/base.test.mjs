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
