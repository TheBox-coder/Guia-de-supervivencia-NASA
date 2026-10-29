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
test('declared loose ground raises metabolic cost through the Pandolf terrain factor, not the duration',async()=>{
 const m=await mission(),unknown=engine.evaluate(m,{surface:'unknown'}),loose=engine.evaluate(m,{surface:'loose'});
 assert.equal(loose.durationHours,unknown.durationHours);assert.ok(loose.oxygen.usedKg>unknown.oxygen.usedKg);assert.equal(loose.metabolic.terrainFactor,2.1);assert.equal(loose.terrain.bearingCapacity,'No medida');
});
test('Pandolf reproduces its published structure: standing cost, terrain factor and grade',()=>{
 // Sin carga y por kg: M = 1.5 + η(1.5V² + 0.35VG). En reposo solo queda el término de pie.
 assert.equal(engine.pandolf(0,0,1),1.5);
 assert.ok(Math.abs(engine.pandolf(1,0,1)-3)<1e-12);
 assert.ok(Math.abs(engine.pandolf(1,10,1)-6.5)<1e-12);
 assert.ok(Math.abs(engine.pandolf(1,0,2.1)-(1.5+2.1*1.5))<1e-12);
 assert.ok(engine.pandolf(1,5,1.1)>engine.pandolf(1,0,1.1));
});
test('oxygen follows the Apollo metabolic level through the Weir equivalent',()=>{
 // 234 kcal/h ÷ (3.941 + 1.106·0.82) kcal/L × 1.429 g/L ≈ 0.069 kg/h.
 assert.ok(Math.abs(234*engine.O2_KG_PER_KCAL-.069)<.001);
});
test('level firm walking costs the Apollo walking mean and stops cost the station mean',()=>{
 const flat={duration:2,legs:[{durationHours:1,metrics:{distanceKm:1.2,gainM:0}}]},r=engine.metabolism(flat,1);
 assert.equal(r.walkHours,1);assert.equal(r.stopHours,1);assert.ok(Math.abs(r.kcal-(234+244))<1e-9);
 const uphill=engine.metabolism({duration:1,legs:[{durationHours:1,metrics:{distanceKm:1.2,gainM:120}}]},1);assert.ok(uphill.kcal>234);
});
test('the oxygen range brackets the central value and a declared rate overrides the model',async()=>{
 const m=await mission(),r=engine.evaluate(m),[low,high]=r.oxygen.usedRangeKg;
 assert.ok(low<=r.oxygen.usedKg&&r.oxygen.usedKg<=high);assert.equal(r.oxygen.source,'metabolic-model');
 assert.ok(r.oxygen.remainingRangeKg[0]<=r.oxygen.remainingKg&&r.oxygen.remainingKg<=r.oxygen.remainingRangeKg[1]);
 const declared=engine.evaluate(m,{oxygenRateKgH:.1});assert.equal(declared.oxygen.source,'declared');assert.ok(Math.abs(declared.oxygen.usedKg-.1*declared.durationHours)<1e-12);
 assert.equal(engine.config({oxygenRateKgH:''}).oxygenRateKgH,null);
});
test('dust only acts in the explicit dust scenario',async()=>{
 const m=await mission(),clean=engine.evaluate(m,{dustIndex:0}),dusty=engine.evaluate(m,{dustIndex:1});
 assert.equal(dusty.durationHours,clean.durationHours);assert.equal(dusty.oxygen.usedKg,clean.oxygen.usedKg);assert.equal(dusty.battery.usedKWh,clean.battery.usedKWh);
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
