import test from 'node:test';
import assert from 'node:assert/strict';
import validation from '../modules/validation.cjs';
import {params,base,target,engine} from './helpers.mjs';
test('empty, null and boolean values do not become zero',()=>{
 for(const value of ['', '  ', null, undefined, false, true, {}, [], NaN, Infinity])assert.equal(validation.numeric(value),null);
 assert.equal(validation.numeric('0'),0);assert.equal(validation.numeric('18,44'),18.44);
 const {ctx}=engine();assert.ok(Number.isNaN(ctx.parseCoordinateValue('')));
});
test('zero thresholds survive calculation and default export',()=>{
 const {ctx,elements}=engine();for(const id of ['returnMargin','minTransitability','minConfidence'])elements[id].value='0';
 const p=ctx.normalizeParams();for(const id of ['returnMargin','minTransitability','minConfidence'])assert.equal(p[id],0);
});
test('mission import rejects invalid ranges, versions, duplicates and extra bases',()=>{
 const valid={format:'JEZERO-MISSION',version:43,points:[base,target],params,mode:'balanced'};
 assert.equal(validation.missionFile(valid).points.length,2);
 for(const invalid of [
  {...valid,version:45}, {...valid,params:{...params,minConfidence:null}},
  {...valid,points:[base,{...target,lat:91}]}, {...valid,points:[base,{...target,lon:null}]},
  {...valid,points:[base,{...base,type:'target'}]}, {...valid,points:[base,{...target,type:'base'}]},
  {...valid,points:[base,{...target,dwellMin:1441}]}, {...valid,mode:'invalid'},
  {...valid,points:Array.from({length:65},(_,i)=>({...target,lon:i}))}
 ])assert.throws(()=>validation.missionFile(invalid));
 assert.throws(()=>validation.points([{...base,lon:180},{...target,lon:-180}]));
});
test('missing report values stay null',()=>{
 const {ctx}=engine();assert.equal(ctx.pdfPointPayload({...base,elevationM:null}).elevationM,null);
 assert.equal(ctx.pdfStrategyPayload({mode:'balanced',score:null}).score,null);
 const leg=ctx.pdfLegPayload({path:[{...base,elevationM:null,signedSlopeDeg:null}]});assert.equal(leg.path[0].elevationM,null);assert.equal(leg.path[0].signedSlopeDeg,null);
});
test('hour rounding carries minutes correctly',()=>{
 const {ctx}=engine();assert.equal(ctx.formatHours(1+59.6/60),'2 h 00 min');assert.equal(ctx.formatHours(null),'—');assert.equal(ctx.formatHours(-.5),'−0 h 30 min');
});
