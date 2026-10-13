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
