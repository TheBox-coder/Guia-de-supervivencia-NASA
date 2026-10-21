import test from 'node:test';
import assert from 'node:assert/strict';
import control from '../modules/mission-control-engine.cjs';
import survival from '../modules/survival-engine.cjs';
import assurance from '../modules/assurance.cjs';
const now=Date.parse('2026-10-19T12:00:00Z');
const mission={duration:4,availableHours:6,params:{evaTime:8,returnMargin:25},legs:[{gridSpacingKm:.2}],metrics:{avgSlopeDeg:3,maxSlopeDeg:5},sequence:[{lat:18,lon:77},{lat:18,lon:77}]};
const dataset={format:'JEZERO-WEATHER',version:1,source:{name:'Explicit synthetic test fixture'},location:{lat:18,lon:77},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:24},(_,localHour)=>({sol:10,localHour,temperatureC:-50+20*Math.cos(localHour/24*2*Math.PI)}))};
const value=(result,id)=>result.indicators.find(x=>x.id===id).value;
test('control never fills missing resources or weather with synthetic defaults',()=>{
  const r=control.overview({},now);assert.ok(r.indicators.every(x=>x.value===null&&x.kind==='unknown'));assert.equal(r.weather.kind,'unknown');assert.equal(r.authorization,false);assert.equal(r.certified,false);
});
test('control recomputes legacy results deterministically from current inputs',()=>{
  const inputs={mission,dataset,equipmentConfirmed:true,config:{reservePct:0}};
  const a=control.overview(inputs,now),b=control.overview(inputs,now),legacy=survival.evaluate(mission,inputs.config,dataset);
  assert.equal(a.indicators[0].model,'survival');assert.deepEqual(a,b);assert.deepEqual(a.evaluation,legacy);assert.equal(value(a,'oxygen'),legacy.oxygen.remainingKg);assert.equal(a.indicators[1].reserve,0);assert.equal(a.weather.sourceVerified,false);assert.equal(a.weather.latestSol,10);
});
test('route invalidation and missing confirmation prevent stale resource reuse',()=>{
  const valid={mission,dataset,equipmentConfirmed:true};assert.notEqual(value(control.overview(valid,now),'oxygen'),null);
  for(const changed of [{...valid,mission:null},{...valid,equipmentConfirmed:false},{...valid,inputsValid:false},{...valid,dataset:null}])assert.equal(value(control.overview(changed,now),'oxygen'),null);
});
test('support budgets require provenance, retain zeros and do not double-count thermal energy',()=>{
  const resources={waterL:0,waterRateLH:1,thermalKWh:2,thermalKW:.1};
  assert.equal(value(control.overview({mission,support:{resources}},now),'water'),null);
  const r=control.overview({mission,support:{resources:{...resources,source:'Operator test'}}},now);
  assert.equal(value(r,'water'),-4);assert.equal(value(r,'thermal'),1.6);assert.equal(value(r,'battery'),null);
});
test('invalid configuration, weather and support remain explicit errors',()=>{
  const r=control.overview({mission,config:{oxygenKg:null},dataset:{},support:{equipment:[{id:'bad'}]}},now);
  assert.deepEqual(r.errors,['config','weather','support']);assert.equal(value(r,'oxygen'),null);assert.throws(()=>control.overview({},NaN));
});
test('control serialization preserves known and unknown results without computed claims on import',()=>{
  const inputs={mission,dataset,equipmentConfirmed:true,support:{resources:{waterL:4,waterRateLH:1,source:'Test'}}};
  assert.deepEqual(control.overview(JSON.parse(JSON.stringify(inputs)),now),control.overview(inputs,now));assert.equal(value(control.overview(inputs,now),'co2'),null);
});
test('model catalogue is immutable and explicitly separates evidence from certification',()=>{
  assert.equal(assurance.certified,false);assert.equal(assurance.models.length,5);assert.equal(assurance.dataKinds.length,7);assert.throws(()=>{assurance.models[0].version='fake';});assert.ok(assurance.models.every(x=>x.tests.length&&x.equations.length&&x.uncertainty&&x.limitations));
});
