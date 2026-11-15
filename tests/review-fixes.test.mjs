import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import engine from '../modules/survival-engine.cjs';
import ops from '../modules/operations-engine.cjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const observations=()=>({format:'JEZERO-WEATHER',version:1,source:{name:'Test observations only'},location:{lat:18.44463,lon:77.45088},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:24},(_,i)=>({sol:300+Math.floor(i/8),localHour:(i%8)*3,temperatureC:-50+20*Math.cos(2*Math.PI*((i%8)*3-14)/24),pressurePa:null,windMps:null}))});
const SOL=engine.SOL_HOURS;

test('weather horizon covers the configured trip: exactly 14 sols stay 14 and extra time adds a sol',()=>{
 assert.equal(engine.horizonSolsFor(14*SOL),14);
 assert.equal(engine.horizonSolsFor(14*SOL+0.5),15);
 assert.equal(engine.horizonSolsFor(1),1);
 assert.equal(engine.horizonSolsFor(null),1);
 assert.equal(engine.horizonSolsFor(2*SOL),2);assert.equal(engine.horizonSolsFor(49.32),2);
});
test('exactly 14 sols do not trigger the life-support alert by rounding; a real excess does',()=>{
 assert.equal(ops.lifeSupportLimit(14*SOL).exceeded,false);
 assert.equal(ops.lifeSupportLimit(Number((14*SOL).toFixed(9))).exceeded,false);
 assert.equal(ops.lifeSupportLimit(14*SOL+0.5).exceeded,true);
 assert.equal(ops.lifeSupportLimit(14*SOL).durationSols,14);
});
test('multi-sol forecast is declared as a repeated daily pattern, not independent per-sol predictions',()=>{
 const f=engine.observationForecast(observations(),{lat:18.44463,lon:77.45088},{horizonHours:3*SOL});
 assert.equal(f.status,'projection');assert.equal(f.days.length,3);
 assert.deepEqual(f.days.map(d=>d.sol),[f.model.baseSol,f.model.baseSol+1,f.model.baseSol+2]);
 assert.equal(f.method.independentPerSol,false);assert.equal(f.method.dayToDayVariationEstimated,false);
 assert.equal(f.method.kind,'daily-pattern-extrapolation');
 assert.deepEqual(f.days[0].series,f.days[2].series);
});
test('a forecast from another region is still refused for any horizon',()=>{
 const f=engine.observationForecast(observations(),{lat:-30,lon:10},{horizonHours:100});
 assert.equal(f.status,'location-mismatch');assert.deepEqual(f.series,[]);assert.equal(f.days,undefined);
});
test('appending an astronaut observation changes the model and keeps provenance',()=>{
 const data=observations(),origin={lat:18.44463,lon:77.45088};
 const before=engine.weatherModel(data);
 const next=engine.appendWeatherObservation(data,origin,{sol:303,localHour:14,temperatureC:-5},'EV1 suit sensor');
 const last=next.records.at(-1);
 assert.equal(last.observerSource,'EV1 suit sensor');assert.ok(last.recordedAt);
 const after=engine.weatherModel(next);
 assert.notEqual(after.baseSol,before.baseSol);assert.notDeepEqual(after.coefficients,before.coefficients);
});
test('equipment selector says Chariot while old records that use rover keep loading',()=>{
 assert.doesNotMatch(read('modules/operations.js'),/\['rover','[^']*','Rover'\]/);
 assert.match(read('modules/operations.js'),/\['rover','Chariot \(vehículo\)','Chariot \(vehicle\)'\]/);
 assert.equal(ops.equipment({id:'old-1',name:'Old record',type:'rover'}).type,'rover');
});
test('MOLA never requests tile levels the NASA service does not publish',()=>{
 const data=JSON.parse(read('mars-data.json'));
 assert.ok(data.map.molaMaxZoom<=8);
 assert.match(read('script.js'),/xyz\(D\.map\.globalTile,\s*Number\(D\.map\.molaMaxZoom\|\|8\)/);
});
test('layer status is derived from tile events, not declared active unconditionally',()=>{
 const s=read('script.js');
 assert.match(s,/tileloadend/);assert.match(s,/tileloaderror/);
 assert.doesNotMatch(s,/setLayerStatus\('mola','ACTIVA','live'\)/);
});
test('navigation uses its own stack, never history.back, and the close buttons use it',()=>{
 const shell=read('modules/module-shell.js');
 assert.doesNotMatch(shell+read('modules/forecast.js')+read('modules/mission-control.js')+read('modules/dashboard.js'),/history\.back/);
 assert.match(shell,/close:backModule/);assert.match(shell,/navStack/);
});
test('map labels are decluttered with priorities and grouped without moving coordinates',()=>{
 const m=read('modules/operations-map.js');
 assert.match(m,/declutter:true/);assert.match(m,/PRIORITY/);assert.match(m,/groupAt/);
 assert.doesNotMatch(m,/lon\s*\+=|lat\s*\+=/);
 assert.match(read('script.js'),/declutter:true\s*\}\);\s*routeLayer|zIndex:16,\s*declutter:true/);
});
test('PDF export is reachable from Results and Control and explains why it is disabled',()=>{
 const html=read('index.html'),s=read('script.js');
 assert.match(html,/id="analyticsExportPdf"[^>]*data-export-pdf/);
 assert.match(read('modules/mission-control.js'),/data-export-pdf/);
 assert.match(s,/function pdfBlockedReason/);assert.match(s,/fetch\('\/api\/mission-pdf'/);
});
test('app-generated mission labels are translated through ui(), not hardcoded Spanish',()=>{
 const s=read('script.js');
 assert.doesNotMatch(s,/selectedLabel=mission\.mode==='distance'\?'Misión más directa'/);
 assert.match(s,/ui\('Misión equilibrada','Balanced mission'\)/);
});
test('control explains exactly what is missing and offers a way to fix it',()=>{
 const c=read('modules/mission-control.js'),d=read('modules/dashboard.js');
 assert.match(c,/function missingBlock/);assert.match(c,/metricMissingAction/);
 assert.match(d,/data-live-fix-base/);assert.match(d,/data-live-eva-fix/);
 assert.match(read('modules/survival.js'),/equipment-confirmed/);
});
test('save buttons have visible styling and the weather form reports success or error beside it',()=>{
 const css=read('components.css');
 assert.match(css,/weatherObservationFields button\[type="submit"\]/);
 assert.match(read('index.html'),/id="forecastFeedback"/);
 assert.match(read('modules/forecast.js'),/forecastFeedback/);
});
test('scenario comparison against nominal is rendered and tells the user what is missing',()=>{
 const s=read('modules/survival.js');
 assert.match(s,/function renderScenarioCompare/);assert.match(s,/scenarioCompare/);
 const nominal=engine.config({scenario:'nominal'}),power=engine.config({scenario:'power'});
 assert.equal(nominal.scenario,'nominal');assert.equal(power.scenario,'power');
});
