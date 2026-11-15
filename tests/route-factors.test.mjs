import test from 'node:test';
import assert from 'node:assert/strict';
import routeEngine from '../modules/route-engine.cjs';
import {params,base} from './helpers.mjs';

const KM_LAT=Math.PI*3389.5/180;
const make=fn=>routeEngine.createEngine({getElevations:async pts=>pts.map(p=>({...p,elevationM:fn(p),demResolutionM:200})),optimizeOrderEnabled:()=>true});
const east=km=>({...base,type:'target',name:'E',lon:base.lon+km/(KM_LAT*Math.cos(base.lat*Math.PI/180)),dwellMin:0});

test('flat terrain: the new factors are neutral and the legacy score is unchanged',async()=>{
 const e=make(()=>0),leg=await e.calculateLeg(base,east(20),'balanced',params);
 const m=leg.metrics;
 assert.equal(m.avgCrossSlopeDeg,0);assert.equal(m.hollowDistanceKm,0);assert.equal(m.sharpTurns,0);
 assert.equal(m.avgRefugeDistanceKm,null);assert.equal(m.relayKnownDistanceKm,0);assert.ok(Math.abs(m.effortIndex-1)<1e-9);
 assert.equal(e.riskScore(m),Math.round(Math.min(100,(m.avgConfidence<100?(100-m.avgConfidence)/100*20:0)+(100-m.minTransitability)/100*30)));
});

test('cross slope is measured across the travel direction and is only a soft factor',async()=>{
 const e=make(p=>3000*(p.lat-base.lat)),leg=await e.calculateLeg(base,east(20),'balanced',params);
 const expected=Math.atan(3/KM_LAT)*180/Math.PI;
 assert.ok(Math.abs(leg.metrics.avgCrossSlopeDeg-expected)<.35,String(leg.metrics.avgCrossSlopeDeg));
 assert.ok(leg.metrics.effortIndex>1);
 // Una pendiente lateral fuerte pero bajo el limite duro no bloquea el tramo: solo aumenta costo, esfuerzo y dificultad.
 const steep=make(p=>12000*(p.lat-base.lat)),hard=await steep.calculateLeg(base,east(20),'balanced',params);
 assert.ok(hard.metrics.avgCrossSlopeDeg>10&&hard.metrics.avgCrossSlopeDeg<12.5);
 assert.ok(hard.metrics.effortIndex>leg.metrics.effortIndex);assert.ok(steep.riskScore(hard.metrics)>e.riskScore(leg.metrics));
});

test('risk strategy detours around a hollow that the distance strategy crosses',async()=>{
 const mid=east(10),bowl=p=>{const dx=(p.lon-(base.lon+mid.lon)/2)*KM_LAT*Math.cos(base.lat*Math.PI/180),dy=(p.lat-base.lat)*KM_LAT;return -60*Math.exp(-(dx*dx+dy*dy)/(2*1.1*1.1));};
 const e=make(bowl),d=await e.calculateLeg(base,mid,'distance',params),r=await e.calculateLeg(base,mid,'risk',params);
 assert.ok(d.metrics.hollowDistanceKm>=r.metrics.hollowDistanceKm);
 assert.ok(r.metrics.distanceKm>=d.metrics.distanceKm-1e-9);
});

test('declared refuges and relays shape exposure metrics and the risk strategy bends toward them',async()=>{
 const e=make(()=>0),target=east(12);
 const ctx={refuges:[{lat:base.lat+.06,lon:base.lon+.1}],relays:[{lat:base.lat+.06,lon:base.lon+.1,radiusKm:8}]};
 const p={...params,context:ctx,contextKey:'a'};
 const none=await e.calculateLeg(base,target,'distance',params),dist=await e.calculateLeg(base,target,'distance',p),risk=await e.calculateLeg(base,target,'risk',p);
 assert.equal(none.metrics.maxRefugeDistanceKm,null);assert.ok(dist.metrics.maxRefugeDistanceKm>0);
 assert.ok(risk.metrics.avgRefugeDistanceKm<=dist.metrics.avgRefugeDistanceKm+1e-9);
 assert.ok(risk.metrics.relayCoveredDistanceKm>=dist.metrics.relayCoveredDistanceKm-1e-9);
 assert.ok(e.riskScore(dist.metrics)>=e.riskScore(none.metrics));
});

test('declared dust, wind and radiation lengthen the estimate and give a dose; absent data stays null',async()=>{
 const e=make(()=>0),t=east(10);
 const clear=await e.calculateLeg(base,t,'balanced',params),dusty=await e.calculateLeg(base,t,'balanced',{...params,context:{dustTau:3.2,windMps:22,doseRateUSvH:45}});
 assert.ok(dusty.durationHours>clear.durationHours*1.2);assert.equal(dusty.metrics.distanceKm,clear.metrics.distanceKm);
 const mClear=e.aggregateMission([clear],'balanced',params,[base,t]);
 const ctxParams={...params,context:{dustTau:3.2,windMps:22,doseRateUSvH:45}};
 const mDusty=e.aggregateMission([dusty],'balanced',ctxParams,[base,t]);
 assert.equal(mClear.metrics.exposureUSv,null);assert.equal(mClear.metrics.environmentSeverity,null);
 assert.ok(Math.abs(mDusty.metrics.exposureUSv-45*mDusty.duration)<1e-9);assert.ok(mDusty.metrics.environmentSeverity>.9);assert.ok(mDusty.score>mClear.score);
});

test('turn metrics count sharp turns on a polyline',()=>{
 const e=make(()=>0);
 const path=[{lat:0,lon:0,elevationM:0},{lat:0,lon:.02,elevationM:0},{lat:.02,lon:.02,elevationM:0},{lat:.02,lon:.04,elevationM:0}].map(p=>({...p,dataConfidence:100,baseTransitability:100,localRoughnessDeg:0}));
 const m=e.pathMetrics(path,params);
 assert.equal(m.sharpTurns,2);assert.ok(Math.abs(m.turnTotalDeg-180)<1);
 assert.ok(Math.abs(e.turnAngleDeg(path[0],path[1],path[2])-90)<.5);
});

test('risk breakdown lists unavailable factors as null and the available ones add up to the legacy part',async()=>{
 const e=make(()=>0),leg=await e.calculateLeg(base,east(10),'balanced',params);
 const items=e.riskBreakdown(leg.metrics),byId=Object.fromEntries(items.map(i=>[i.id,i]));
 assert.equal(byId.refuge.points,null);assert.equal(byId.comms.points,null);assert.equal(byId.environment.points,null);
 const sum=items.reduce((s,i)=>s+(i.points||0),0);assert.ok(Math.abs(sum-e.riskScore(leg.metrics))<=1.5);
});

test('legs are cached separately for different declared contexts',()=>{
 const e=make(()=>0),cache=e.createLegCache(),a={...base},b=east(5);
 assert.notEqual(cache.key(a,b,'balanced',{...params,contextKey:'x'}),cache.key(a,b,'balanced',{...params,contextKey:'y'}));
});
