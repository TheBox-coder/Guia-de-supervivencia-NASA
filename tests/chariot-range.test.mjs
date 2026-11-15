import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import engine from '../modules/operations-engine.cjs';
const now=Date.parse('2026-11-14T18:00:00Z'),sol=engine.SOL_HOURS;
const base={lat:18.4446,lon:77.4509,crew:2,source:'Test assumptions',updatedAt:'2026-11-14T17:00:00Z',speedKmh:3,driveHoursPerSol:2,elapsedSols:0,oxygenKg:100,oxygenRateKgH:.01,waterL:100,waterRateLH:.01,energyKWh:42,batteryCapacityKWh:42,generationKW:1.2,powerKW:1,co2CapacityKg:100,co2RateKgH:.01};
const range=(changes={},extra={})=>engine.chariotRange({base:{...base,...changes},...extra},now);
test('one-way Chariot radius uses 14 Martian sols, declared driving time and elapsed sols',()=>{
 assert.ok(Math.abs(range().radiusKm-84)<1e-9);assert.equal(range().limitingResource,'lifeSupport');
 assert.ok(Math.abs(range({elapsedSols:4}).radiusKm-60)<1e-9);
 assert.equal(range({elapsedSols:14}).radiusKm,0);assert.equal(range({elapsedSols:15}).radiusKm,0);
 assert.equal(range({driveHoursPerSol:0}).radiusKm,0);assert.ok(Math.abs(range({delayHours:sol}).radiusKm-78)<1e-9);
});
test('current resources can shorten reach and power generation/loss are included',()=>{
 for(const [changes,id] of [[{oxygenKg:2*sol*.02},'oxygen'],[{waterL:2*sol*.02},'water'],[{co2CapacityKg:2*sol*.02},'co2']]){
  const r=range(changes);assert.ok(Math.abs(r.radiusKm-12)<1e-9);assert.equal(r.limitingResource,id);
 }
 const energy=range({generationKW:1,powerKW:2,energyKWh:sol});assert.equal(energy.limitingResource,'energy');assert.equal(energy.radiusKm,6);
 assert.equal(range({generationKW:1,powerKW:2,energyKWh:sol,energyLossPct:50}).radiusKm,3);
 assert.equal(range({oxygenKg:0}).radiusKm,0);assert.equal(range({delayHours:400}).radiusKm,0);
});
test('legacy or incomplete declarations never invent a radius and new fields survive import',()=>{
 for(const changes of [{speedKmh:null},{speedKmh:0},{driveHoursPerSol:null},{elapsedSols:null},{crew:0},{oxygenKg:null},{powerKW:null},{lat:null,lon:null},{source:''},{updatedAt:''}]){const r=range(changes);assert.equal(r.status,'missing-inputs');assert.equal(r.radiusKm,null)}
 assert.equal(range({}, {criteria:{sensorAgeH:0}}).radiusKm,null);
 for(const changes of [{speedKmh:-1},{driveHoursPerSol:sol+1},{elapsedSols:-1},{elapsedSols:true}])assert.throws(()=>range(changes));
 const state=engine.state({base}),restored=engine.imported({format:'JEZERO-SUPPORT',version:1,state:JSON.parse(JSON.stringify(state))});assert.deepEqual(restored,state);
});
test('map draws Chariot reach instead of antenna circles and follows declared position',()=>{
 let layer;
 class Source{constructor(){this.features=[]}clear(){this.features=[]}addFeature(f){this.features.push(f)}}
 class Feature{constructor(p){Object.assign(this,p)}setStyle(s){this.style=s}}
 class Geometry{constructor(coordinates){this.coordinates=coordinates}}
 const window={addEventListener(){},JEZERO_I18N:{ui:(es,en)=>en}};
 const ctx={window,map:{addLayer(l){layer=l}},setInterval(){return 0},setTimeout(){},clearInterval(){},ol:{Feature,geom:{Point:Geometry,Polygon:Geometry},source:{Vector:Source},layer:{Vector:class{constructor(p){Object.assign(this,p)}set(){}getSource(){return this.source}}},style:Object.fromEntries(['Style','Fill','Stroke','Text'].map(k=>[k,class{constructor(p){Object.assign(this,p)}}]))}};
 vm.runInNewContext(fs.readFileSync(new URL('../modules/operations-map.js',import.meta.url),'utf8'),ctx);
 const relay={lat:18,lon:77,name:'Relay',radiusKm:5},draw=window.JEZERO_SUPPORT_MAP.draw;
 draw([],[relay],{...base,range:range()});let rings=layer.source.features.filter(f=>f.style);assert.equal(rings.length,1);
 for(const [lon,lat] of rings[0].geometry.coordinates[0])assert.ok(Math.abs(engine.distance(base,{lat,lon})-84)<1e-8);
 assert.match(rings[0].style.text.text,/Chariot reach/);
 draw([],[relay],{...base,lat:19,range:range()});rings=layer.source.features.filter(f=>f.style);assert.ok(Math.abs(engine.distance({lat:19,lon:base.lon},{lat:rings[0].geometry.coordinates[0][0][1],lon:rings[0].geometry.coordinates[0][0][0]})-84)<1e-8);
 draw([],[relay],{...base,range:{status:'missing-inputs'}});assert.equal(layer.source.features.filter(f=>f.style).length,0);
 draw([],[relay],null);assert.equal(layer.source.features.filter(f=>f.style).length,0);
});
