import fs from 'node:fs';
import vm from 'node:vm';
import validation from '../modules/validation.cjs';
import routeEngine from '../modules/route-engine.cjs';
export const source=fs.readFileSync(new URL('../script.js',import.meta.url),'utf8');
export const params={speed:1.2,evaTime:8,returnMargin:25,maxSlopeLimit:25,minTransitability:25,minConfidence:20};
export const base={lat:18.44463,lon:77.45088,name:'Base',type:'base',dwellMin:0};
export const target={...base,name:'Objetivo',type:'target',lon:base.lon+.02,dwellMin:15};
export function section(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
export function engine(){
 const elements=Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{value:String(v)}]));
 elements.optimizeOrder={checked:true};
 const ctx=vm.createContext({console,validation,finiteValue:validation.finite,numericValue:validation.numeric,MARTIAN_RADIUS:3389.5,DEM_RESOLUTION_KM:.2,
  window:{marsElevationReady:Promise.resolve(),queryMarsElevations:async points=>points.map(p=>({...p,elevationM:0,demResolutionM:200}))},
  document:{},$:id=>elements[id],clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),pointCoordKey:p=>`${p.lat},${p.lon}`});
 vm.runInContext(section('function normalizeLon(','function formatLat('),ctx);
 Object.assign(ctx,routeEngine.createEngine({getElevations:points=>ctx.getElevations(points),optimizeOrderEnabled:()=>elements.optimizeOrder.checked}));
 vm.runInContext(section('async function getElevations(','function planningFingerprint('),ctx);
 vm.runInContext(section('function analyticsSeries(','function analyticsDistanceBins('),ctx);
 vm.runInContext(section('function pdfPointPayload(','async function exportMissionPdf('),ctx);
 vm.runInContext(section('function parseCoordinateValue(','function addPointFromCoordinates('),ctx);
 return {ctx,elements};
}
