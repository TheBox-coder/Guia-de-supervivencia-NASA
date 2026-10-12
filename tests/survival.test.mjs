import test from 'node:test';
import assert from 'node:assert/strict';
import engine from '../modules/survival-engine.cjs';
import {engine as routingEngine,params,base,target} from './helpers.mjs';
async function mission(){const {ctx}=routingEngine();const a=await ctx.calculateLeg(base,target,'balanced',params),b=await ctx.calculateLeg(target,base,'balanced',params),m=ctx.aggregateMission([a,b],'balanced',params,[base,target,{...base,dwellMin:0}]);return {...m,availableHours:6,params};}
function data(){return {format:'JEZERO-WEATHER',version:1,source:{name:'Synthetic test observations'},location:base,units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:48},(_,i)=>({sol:100+Math.floor(i/24),localHour:i%24,temperatureC:-50-30*Math.cos(2*Math.PI*(i%24)/24),pressurePa:718,windMps:0}))};}
test('historical template is explicit, cold at night and warm in the afternoon',()=>{
 const f=engine.forecast();assert.equal(f.model.kind,'historical-scenario');assert.equal(f.series.length,25);assert.ok(f.series[15].temperatureC>f.series[3].temperatureC);assert.match(f.model.note,/2021/);
});
test('normalized observations produce a fitted pattern for next sol',()=>{
 const model=engine.weatherModel(data());assert.equal(model.baseSol,102);assert.equal(model.windMps,0);assert.ok(Math.abs(engine.temperature(model,12)-(-20))<1e-8);assert.ok(model.errorC>=5);
});
test('invalid units, temporal coverage, missing values and duplicates are rejected',()=>{
 const d=data();for(const invalid of [{...d,units:{...d.units,temperature:'K'}},{...d,records:d.records.map(r=>({...r,localHour:1}))},{...d,records:[...d.records,d.records[0]]},{...d,records:d.records.map(r=>({...r,temperatureC:null}))}])assert.throws(()=>engine.weatherModel(invalid));
});
test('missing mission does not fabricate autonomy or soil composition',()=>{
 const r=engine.evaluate(null);assert.equal(r.status,'no-mission');assert.equal(r.oxygen,undefined);assert.equal(r.terrain.composition,'No observada');
});
test('nominal, dust and battery-failure scenarios change resource margins',async()=>{
 const m=await mission(),a=engine.evaluate(m),dust=engine.evaluate(m,{scenario:'dust'}),failure=engine.evaluate(m,{scenario:'power'});
 assert.ok(dust.durationHours>a.durationHours);assert.ok(dust.battery.usedKWh>a.battery.usedKWh);assert.ok(failure.battery.capacityKWh<a.battery.capacityKWh);assert.ok(a.returnIncluded);
 assert.equal(a.timeline.at(-1).oxygenKg,a.oxygen.remainingKg);assert.equal(a.timeline.at(-1).batteryKWh,a.battery.remainingKWh);
});
test('zero reserve is preserved and extreme deficits produce critical alerts',async()=>{
 const m=await mission(),zero=engine.evaluate(m,{reservePct:0}),bad=engine.evaluate(m,{oxygenKg:.05,batteryKWh:.05});
 assert.equal(zero.oxygen.reserveKg,0);assert.equal(bad.status,'critical');assert.ok(bad.alerts.some(a=>a.code==='oxygen'));assert.ok(bad.alerts.some(a=>a.code==='power'));
});
test('only declared loose ground affects the hypothetical delay',async()=>{
 const m=await mission(),unknown=engine.evaluate(m,{surface:'unknown'}),loose=engine.evaluate(m,{surface:'loose'});assert.ok(loose.durationHours>unknown.durationHours);assert.equal(loose.terrain.bearingCapacity,'No medida');
});
test('meteorological location mismatch and missing return are visible',async()=>{
 const m=await mission();m.sequence=[base,target];const d=data();d.location={lat:0,lon:0};const r=engine.evaluate(m,{},d);assert.ok(r.alerts.some(a=>a.code==='location'));assert.ok(r.alerts.some(a=>a.code==='return'));assert.ok(r.alerts.some(a=>a.code==='radiation'));
});
test('crew size changes total consumption without hiding per-person limits',async()=>{
 const m=await mission(),r=engine.evaluate(m,{crew:4});assert.equal(r.oxygen.totalCrewUsedKg,r.oxygen.usedKg*4);
});
test('invalid scenario configuration is rejected instead of silently clamped',()=>{
 for(const raw of [{oxygenKg:null},{reservePct:80},{scenario:'fake'},{dustIndex:2},{startHour:24}])assert.throws(()=>engine.config(raw));
});
