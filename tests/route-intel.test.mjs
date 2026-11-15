import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {engine,params,base,target,section} from './helpers.mjs';

class Node{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.className='';this.textContent='';}
 append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(){}addEventListener(){}
 get all(){return [this.textContent,...this.children.flatMap(c=>typeof c==='string'?[c]:[c.all])].flat().join(' ');}}
function loadIntel(globals={}){
 const card=new Node('section'),legend=new Node('div');
 const els={routeFactorsCard:card,routeDifficultyLegend:legend};
 const window={addEventListener(){},dispatchEvent(){},...globals};
 const ctx=vm.createContext({window,CustomEvent:class{},document:{readyState:'complete',getElementById:id=>els[id]||null,createElement:t=>new Node(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}}});
 vm.runInContext(fs.readFileSync(new URL('../modules/route-intel.js',import.meta.url),'utf8'),ctx);
 return {intel:window.JEZERO_ROUTE_INTEL,card,legend,window,ctx};
}

test('context only includes data that exists and is empty without it',()=>{
 const {intel}=loadIntel();
 const none=intel.context();assert.equal(none.enabled,false);assert.equal(none.key,'');
 const {intel:withOps}=loadIntel({JEZERO_OPERATIONS:{getState:()=>({shelters:[{lat:18.4,lon:77.4,available:true},{lat:null,lon:null},{lat:18.5,lon:77.5,available:false}],relays:[{lat:18.4,lon:77.4,radiusKm:5},{lat:18.4,lon:77.4,radiusKm:null}],radiation:{rateUSvH:22}})}});
 const c=withOps.context();
 assert.equal(c.enabled,true);assert.equal(c.counts.refuges,1);assert.equal(c.counts.relays,1);assert.equal(c.context.doseRateUSvH,22);assert.equal(c.sources.dose,'declared');
 assert.equal(c.context.dustTau,null);assert.ok(c.key.length>0);
});

test('observed weather conditions feed the context with their source',()=>{
 const globals={JEZERO_SURVIVAL:{getApplicableDataset:()=>({})},
  JEZERO_SURVIVAL_ENGINE:{observationForecast:()=>({status:'projection',conditions:{dust:{median:2.4},wind:{max:18},radiation:{median:31}}})}};
 const {intel}=loadIntel(globals);
 // Sin puntos de misión no hay origen y no se consulta el histórico.
 assert.equal(intel.context().context.dustTau,null);
 const loaded=loadIntel(globals);
 vm.runInContext("var missionPoints=[{lat:18.4,lon:77.4,type:'base'}];",loaded.ctx);
 const c=loaded.intel.context();
 assert.equal(c.context.dustTau,2.4);assert.equal(c.context.windMps,18);assert.equal(c.context.doseRateUSvH,31);
 assert.equal(JSON.stringify(c.sources),JSON.stringify({dust:'observed',wind:'observed',dose:'observed'}));
 const projectionOff=loadIntel({...globals,JEZERO_SURVIVAL_ENGINE:{observationForecast:()=>({status:'location-mismatch',conditions:null})}});
 vm.runInContext("var missionPoints=[{lat:18.4,lon:77.4,type:'base'}];",projectionOff.ctx);
 assert.equal(projectionOff.intel.context().enabled,false);
});

test('panel renders unavailable factors as "no data" and never throws on a legacy mission',()=>{
 const {intel,card,legend}=loadIntel();
 intel.render(null);assert.match(card.all,/Calcula una misión/);assert.equal(legend.hidden,true);
 const mission={metrics:{distanceKm:1,context:{present:false},sharpTurns:0,hollowDistanceKm:0},score:30,duration:1.5,breakdown:[{id:'slope',points:10,max:35},{id:'refuge',points:null,max:8}],breakdownLeg:'1/1',params:{}};
 intel.render(mission);
 assert.match(card.all,/sin dato/);assert.match(card.all,/10\.0 \/ 35/);assert.equal(legend.hidden,false);assert.match(legend.all,/Fácil/);
});

test('drawMissionRoutes colors segments by difficulty and marks the critical points',async()=>{
 const {ctx}=engine();
 const feats=[];
 class Feature{constructor(props){this.props=props;feats.push(this);}get(k){return this.props[k];}}
 ctx.ol={Feature,geom:{LineString:class{constructor(c){this.c=c;}},Point:class{constructor(c){this.c=c;}}}};
 ctx.routeLayer={getSource:()=>({clear(){feats.length=0;},addFeature(){}})};
 ctx.ui=(es)=>es;ctx.drawPointMarkers=()=>{};ctx.ROUTE_FACTORS=ctx.FACTORS;
 vm.runInContext(section('const DIFFICULTY_META=','function selectedMission('),ctx);
 vm.runInContext(section('function missionPathNodes(','function profileSeries('),ctx);
 // Ruta de 3 km con una pared de 18° en el medio.
 ctx.window.queryMarsElevations=async points=>points.map(p=>({...p,elevationM:Math.max(0,Math.min(400,(p.lon-base.lon-.01)*1.5e4)),demResolutionM:200}));
 const t={...base,type:'target',name:'T',lon:base.lon+.05,dwellMin:0};
 const leg=await ctx.calculateLeg(base,t,'balanced',params);
 const mission={balanced:{legs:[leg],params}};
 ctx.window.JEZERO_ROUTE_INTEL=undefined;
 const added=[];ctx.routeLayer={getSource:()=>({clear(){},addFeature(f){added.push(f);}})};
 ctx.drawMissionRoutes(mission,'balanced');
 const layers=added.map(f=>f.get('layer'));
 assert.ok(layers.includes('leg'));assert.ok(layers.includes('seg'));assert.ok(layers.includes('tick'));
 const classes=new Set(added.filter(f=>f.get('layer')==='seg').map(f=>f.get('cls')));
 assert.ok([...classes].every(c=>['easy','moderate','demanding','critical','unknown'].includes(c)));
 assert.ok(added.filter(f=>f.get('layer')==='hazard').some(f=>f.get('hazard')==='slope'));
});
