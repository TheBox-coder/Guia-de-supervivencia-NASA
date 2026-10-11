import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {engine,params,base,target,section} from './helpers.mjs';
test('flat terrain uses identical sampling and quality for all strategies',async()=>{
 const {ctx}=engine(),legs=[];
 for(const mode of ['distance','balanced','risk'])legs.push(await ctx.calculateLeg(base,target,mode,params));
 for(const leg of legs){assert.ok(Math.abs(leg.metrics.distanceKm-1.1223796624)<1e-8);assert.equal(leg.sampling.validCount,291);assert.equal(leg.sampling.maxResolutionM,200);}
 assert.equal(legs[0].gridSpacingKm,legs[2].gridSpacingKm);assert.equal(legs[0].metrics.avgConfidence,legs[2].metrics.avgConfidence);
});
test('strategies share DEM samples without sharing mutable path nodes',async()=>{
 const {ctx}=engine();let queries=0;
 ctx.window.queryMarsElevations=async points=>{queries++;return points.map(p=>({...p,elevationM:0}));};
 const cache=ctx.createLegCache(),legs=[];
 for(const mode of ['distance','balanced','risk'])legs.push(await ctx.getCachedLeg(base,target,mode,params,cache));
 assert.equal(queries,1);assert.notEqual(legs[0].path[1],legs[1].path[1]);
 legs[0].path[1].elevationM=500;assert.equal(legs[1].path[1].elevationM,0);
});
test('missing DEM and coincident endpoints are rejected',async()=>{
 const {ctx}=engine();await assert.rejects(ctx.calculateLeg(base,base,'balanced',params),/coincidentes/);
 ctx.window.queryMarsElevations=async points=>points.map(p=>({...p,elevationM:null}));
 await assert.rejects(ctx.getElevations([base,target]),/válidas/);
 ctx.window.queryMarsElevations=async()=>[];await assert.rejects(ctx.getElevations([base,target]),/cantidad/);
});
test('DEM readiness is awaited before checking the query function',async()=>{
 const {ctx}=engine();delete ctx.window.queryMarsElevations;
 ctx.window.marsElevationReady=Promise.resolve().then(()=>{ctx.window.queryMarsElevations=async points=>points.map(p=>({...p,elevationM:0}));});
 const out=await ctx.getElevations([base]);assert.equal(out[0].elevationM,0);
});
test('final substituted endpoints cannot bypass hard limits',()=>{
 const {ctx}=engine();const path=[{...base,elevationM:0},{...base,lon:base.lon+.00001,elevationM:10000},{...target,elevationM:0}];
 assert.throws(()=>ctx.validateFinalPath(path,params),/ruta final incumple/);
});
test('heterogeneous leg times, stop times and graph totals agree',async()=>{
 const {ctx}=engine();const a=await ctx.calculateLeg(base,target,'balanced',params),b=await ctx.calculateLeg(target,base,'balanced',params);
 a.durationHours=1.385;b.durationHours=.975;
 const m=ctx.aggregateMission([a,b],'balanced',params,[base,target,{...base,dwellMin:0}]);m.params=params;
 assert.ok(Math.abs(m.duration-(1.385+.975+.25))<1e-12);
 const series=ctx.analyticsSeries(m);assert.ok(Math.abs(series.at(-1).elapsedHours-m.duration)<1e-9);
});
test('A* rejects a blocked barrier instead of crossing it',async()=>{
 const {ctx}=engine(),grid=ctx.buildGrid(base,target,17,17,'balanced');
 for(const n of grid.nodes)n.elevationM=n.c===8?null:0;ctx.annotateGridTerrain(grid);
 assert.equal(ctx.aStar(grid,grid.nodes[8*17],grid.nodes[8*17+16],'balanced',params),null);
});
test('geometry handles antimeridian crossings and opposite points',()=>{
 const {ctx}=engine();assert.ok(ctx.haversine({lat:0,lon:179.9},{lat:0,lon:-179.9})<12);
 assert.ok(Number.isFinite(ctx.haversine({lat:0,lon:0},{lat:0,lon:180})));
});
test('a failed strategy preserves other strategies and chooses an available result',async()=>{
 const {ctx,elements}=engine();Object.assign(elements,{returnBase:{checked:true},missionWarnings:{textContent:'',hidden:true},statusText:{textContent:''}});
 const radios={distance:{checked:true,value:'distance'},balanced:{checked:false,value:'balanced'},risk:{checked:false,value:'risk'}};
 ctx.document.querySelector=selector=>selector.includes(':checked')?Object.values(radios).find(r=>r.checked):radios[selector.match(/value="([^"]+)"/)?.[1]];
 Object.assign(ctx,{missionPoints:[base,target],currentMission:{old:true},lastCalculatedAt:null,busy:false,routeLayer:{getSource:()=>({clear(){}})},analysisLayer:null,
  ui:(es)=>es,strategyLabel:mode=>mode,resetMetrics(){},updatePlanningUI(){},updateStrategyCards(){},renderMission(m){ctx.rendered=m.mode;},drawMissionRoutes(){},saveHistoryEntry(){},showToast(){},
  setBusy(value,message){ctx.busy=value;if(message)elements.statusText.textContent=message;},
  chooseSequence:async mode=>{if(mode==='distance')throw new Error('blocked');return {mode};}});
 vm.runInContext(section('function planningFingerprint(','function drawMissionRoutes('),ctx);
 await ctx.calculateMission();assert.equal(ctx.currentMission.errors.distance,'blocked');assert.ok(ctx.currentMission.balanced);assert.ok(ctx.currentMission.risk);assert.equal(ctx.rendered,'balanced');assert.equal(ctx.busy,false);assert.equal(elements.missionWarnings.hidden,false);
});
test('changing inputs during calculation discards the pending result',async()=>{
 const {ctx,elements}=engine();Object.assign(elements,{returnBase:{checked:true},missionWarnings:{textContent:'',hidden:true},statusText:{textContent:''}});
 Object.assign(ctx,{missionPoints:[base,target],currentMission:{old:true},busy:false,lastCalculatedAt:new Date(),document:{querySelector:()=>({value:'balanced'})},routeLayer:{getSource:()=>({clear(){}})},analysisLayer:null,
  ui:es=>es,strategyLabel:mode=>mode,resetMetrics(){},updatePlanningUI(){},updateStrategyCards(){},showToast(){},setBusy(b){ctx.busy=b;},chooseSequence:async mode=>{elements.speed.value='2';return{mode};}});
 vm.runInContext(section('function planningFingerprint(','function drawMissionRoutes('),ctx);
 await ctx.calculateMission();assert.equal(ctx.currentMission,null);assert.equal(ctx.lastCalculatedAt,null);assert.match(elements.missionWarnings.textContent,/cambió/);
});
