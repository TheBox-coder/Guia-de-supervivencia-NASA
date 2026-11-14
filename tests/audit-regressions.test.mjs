import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {section} from './helpers.mjs';
import validation from '../modules/validation.cjs';
import routeEngine from '../modules/route-engine.cjs';

function context(){
 const oldPoints=[{lat:0,lon:0,type:'base',name:'Old base'}],oldResult={balanced:{old:true}},elements={},messages=[];
 const ctx=vm.createContext({missionPoints:oldPoints,currentMission:oldResult,lastCalculatedAt:new Date(),busy:false,validation,ui:a=>a,
  $:id=>elements[id]??=({checked:false,textContent:'',dataset:{},style:{}}),document:{querySelector:()=>null},window:{confirm:()=>true},showToast:m=>messages.push(m),
  setMissionSettings:()=>{},applyDefaults:()=>{},setRouteAnimationEnabled:()=>{},drawPointMarkers:()=>{},renderMissionList:()=>{},resetMetrics:()=>{},updatePlanningUI:()=>{},centerGlobal:()=>{},
  invalidateMission:()=>{ctx.currentMission=null;ctx.lastCalculatedAt=null;},routeLayer:{getSource:()=>({clear(){}})}});
 vm.runInContext(section('function confirmMissionReplacement(','function deleteHistory('),ctx);
 vm.runInContext(section('async function importMissionJsonFile(','function resetCoordinateForm('),ctx);
 return {ctx,oldPoints,oldResult,elements,messages};
}
const payload={format:'JEZERO-MISSION',version:44,params:validation.parameters({}),missionMeta:{missionName:'New'},points:[{lat:1,lon:1,type:'base',name:'New base'}]};
const event=()=>({target:{files:[{size:100,text:async()=>JSON.stringify(payload)}],value:'mission.json'}});
test('canceling import preserves current mission and does not persist metadata',async()=>{
 const {ctx,oldPoints,oldResult}=context();ctx.window.confirm=()=>false;ctx.setMissionSettings=()=>assert.fail('must not save');
 const ev=event();assert.equal(await ctx.importMissionJsonFile(ev),false);assert.equal(ctx.missionPoints,oldPoints);assert.equal(ctx.missionPoints,oldPoints);assert.equal(ctx.currentMission,oldResult);assert.equal(ev.target.value,'');
});
test('metadata storage failure preserves previous points and calculation',async()=>{
 const {ctx,oldPoints,oldResult}=context();ctx.setMissionSettings=()=>{throw Error('QuotaExceededError');};
 assert.equal(await ctx.importMissionJsonFile(event()),false);assert.equal(ctx.missionPoints,oldPoints);assert.equal(ctx.currentMission,oldResult);
});
test('successful import replaces points and invalidates previous calculation',async()=>{
 const {ctx,messages}=context();assert.equal(await ctx.importMissionJsonFile(event()),true,messages.join());assert.equal(ctx.missionPoints[0].lat,1);assert.equal(ctx.currentMission,null);assert.equal(ctx.lastCalculatedAt,null);
});
test('history cancellation and storage failure preserve current mission',()=>{
 for(const cancel of [true,false]){const {ctx,oldPoints,oldResult}=context();ctx.getHistory=()=>[{id:'saved',...payload}];ctx.window.confirm=()=>!cancel;ctx.setMissionSettings=()=>{throw Error('QuotaExceededError');};ctx.loadHistory('saved');assert.equal(ctx.missionPoints,oldPoints);assert.equal(ctx.currentMission,oldResult);}
});
test('history storage failure keeps all calculated strategies available',async()=>{
 const {ctx,messages}=context();ctx.missionPoints=[{lat:0,lon:0,type:'base'},{lat:0,lon:.01,type:'target'}];Object.assign(ctx,{planningFingerprint:()=>1,normalizeParams:()=>({}),setBusy:()=>{},createLegCache:()=>({}),chooseSequence:async()=>({valid:true}),strategyLabel:x=>x,updateStrategyCards:()=>{},renderMission:()=>{},drawMissionRoutes:()=>{},saveHistoryEntry:()=>{throw Error('QuotaExceededError');}});
 vm.runInContext(section('async function calculateMission(','function drawMissionRoutes('),ctx);await ctx.calculateMission();assert.ok(ctx.currentMission?.balanced?.valid,messages.join());assert.ok(ctx.lastCalculatedAt);assert.match(messages[0],/historial/);
});
test('reset clears radial value and warning state',()=>{
 const {ctx,elements}=context();for(const name of ['renderTerrainProfile','renderMissionAnalytics','renderMissionTimeline','updateRouteSequenceStrip','updateMissionHud','updateHeaderStatus','updateStrategyCards'])ctx[name]=()=>{};
 elements.maxRadialMetric={textContent:'3 / 2 km',dataset:{state:'over-radius'}};
 vm.runInContext(section('function resetMetrics(','function clearMission('),ctx);ctx.resetMetrics();assert.equal(elements.maxRadialMetric.textContent,'—');assert.equal(elements.maxRadialMetric.dataset.state,undefined);
});
test('walking radius includes detours between stops',()=>{
 const base={lat:0,lon:0,type:'base'},target={lat:0,lon:.01,type:'target'},detour={lat:.05,lon:0};
 const api=routeEngine.createEngine({getElevations:async()=>[]});
 const result=api.aggregateMission([{path:[base,detour,target],metrics:{distanceKm:6},durationHours:3}],'balanced',validation.parameters({}),[base,target]);
 assert.ok(result.metrics.maxRadialKm>2.9);assert.equal(result.metrics.radiusExceeded,true);assert.equal(result.metrics.walkbackExceeded,false);
});

test('optional interface storage failure does not leave an import half applied',async()=>{
 const {ctx}=context();ctx.window.JEZERO_THEMES={setTheme(){throw Error('QuotaExceededError');}};const ev=event();ev.target.files[0].text=async()=>JSON.stringify({...payload,interface:{theme:'golden'}});assert.equal(await ctx.importMissionJsonFile(ev),true);assert.equal(ctx.missionPoints[0].lat,1);assert.equal(ctx.currentMission,null);
});
