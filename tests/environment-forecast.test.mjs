import test from 'node:test';
import assert from 'node:assert/strict';
import engine from '../modules/survival-engine.cjs';
const origin={lat:18.4446,lon:77.4509};
const observations=()=>({format:'JEZERO-WEATHER',version:1,source:{name:'Synthetic regression test'},location:origin,units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:72},(_,i)=>({sol:1000+Math.floor(i/24),localHour:i%24,temperatureC:-55+20*Math.sin(2*Math.PI*i/24),opticalDepth:.9+.3*Math.cos(2*Math.PI*i/24),doseRateUSvH:2+.6*Math.sin(2*Math.PI*i/24)}))});
const forecast=(data,hours=2*engine.SOL_HOURS)=>engine.observationForecast(data,origin,{horizonHours:hours});
test('dust and radiation are learned targets with hourly multi-sol projections',()=>{
 const f=forecast(observations());assert.equal(f.days.length,2);
 for(const key of ['opticalDepth','doseRateUSvH']){assert.equal(f.environment.models[key].status,'fitted');assert.equal(f.environment.models[key].trainedRecords,72);assert.equal(f.environment.models[key].algorithm,'supervised-harmonic-regression');assert.ok(f.series.every(p=>Number.isFinite(p[key])&&p[key]>=0));}
 assert.ok(Math.abs(f.series[0].opticalDepth-1.2)<1e-9);assert.ok(Math.abs(f.series[6].doseRateUSvH-2.6)<1e-9);
 assert.deepEqual(f.days[0].series,f.days[1].series);assert.equal(f.environment.affectsTemperature,false);
});
test('modeled ambient dose integrates the curve over Earth-hour mission durations',()=>{
 const data=observations();for(const r of data.records)r.doseRateUSvH=2;
 for(const hours of [1,12,engine.SOL_HOURS,2.5*engine.SOL_HOURS])assert.ok(Math.abs(forecast(data,hours).environment.exposureMSv-hours*2/1000)<1e-10);
});
test('new astronaut dust and radiation observations refit both channels without changing input history',()=>{
 const data=observations(),original=JSON.stringify(data),before=forecast(data);
 const next=engine.appendWeatherObservation(data,origin,{sol:1003,localHour:12,temperatureC:-55,opticalDepth:3,doseRateUSvH:8},'Synthetic observer',Date.parse('2026-11-14T18:00:00Z'));
 const after=forecast(next);assert.notEqual(after.series[12].opticalDepth,before.series[12].opticalDepth);assert.notEqual(after.series[12].doseRateUSvH,before.series[12].doseRateUSvH);assert.notEqual(after.environment.exposureMSv,before.environment.exposureMSv);assert.equal(JSON.stringify(data),original);assert.equal(next.records.at(-1).observerSource,'Synthetic observer');
});
test('missing or sparse environmental coverage cannot produce fabricated projections',()=>{
 const data=observations();data.records.forEach((r,i)=>{delete r.doseRateUSvH;if(i>=11)delete r.opticalDepth});const f=forecast(data);
 assert.equal(f.environment.models.opticalDepth.status,'insufficient-data');assert.equal(f.environment.models.doseRateUSvH.status,'insufficient-data');assert.ok(f.series.every(p=>p.opticalDepth===null&&p.doseRateUSvH===null));assert.equal(f.environment.exposureMSv,null);assert.ok(Number.isFinite(f.series[0].temperatureC));
 const narrow=observations();narrow.records.forEach(r=>{if(r.localHour>=6)delete r.opticalDepth});assert.equal(forecast(narrow).environment.models.opticalDepth.status,'insufficient-data');
});
test('zero observations remain zero and predictions stay within input bounds',()=>{
 const data=observations();data.records.forEach(r=>{r.opticalDepth=0;r.doseRateUSvH=0});let f=forecast(data);assert.ok(f.series.every(p=>p.opticalDepth===0&&p.doseRateUSvH===0));assert.equal(f.environment.exposureMSv,0);
 data.records.forEach(r=>{r.opticalDepth=r.localHour<6?10:0;r.doseRateUSvH=r.localHour<6?5000:0});f=forecast(data);assert.ok(f.series.every(p=>p.opticalDepth>=0&&p.opticalDepth<=10&&p.doseRateUSvH>=0&&p.doseRateUSvH<=5000));
});
