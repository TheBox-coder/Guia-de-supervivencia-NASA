/* V44: terrain and mission calculations, independent of the DOM. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./validation.cjs'));
  else root.JEZERO_ROUTING=factory(root.JEZERO_VALIDATION);
})(typeof globalThis!=='undefined'?globalThis:this,function(validation){
  function createEngine({getElevations,optimizeOrderEnabled=()=>true}){
    if(typeof getElevations!=='function')throw new Error('Se requiere un proveedor de elevación.');
    const MARTIAN_RADIUS=3389.5,DEM_RESOLUTION_KM=.2;
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
    const numericValue=validation.numeric,finiteValue=validation.finite;
    const normalizeLon=lon=>{const x=((lon+180)%360+360)%360-180;return Math.abs(x)===180?180:x;};
    const pointCoordKey=p=>`${Number(p?.lat).toFixed(5)},${Number(p?.lon).toFixed(5)}`;
function haversine(a,b){
  const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dp=(b.lat-a.lat)*Math.PI/180,dl=shortestLonDelta(a.lon,b.lon)*Math.PI/180;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*MARTIAN_RADIUS*Math.asin(Math.sqrt(clamp(h,0,1)));
}
function pathMetrics(path,params){
  let d=0,gain=0,descent=0,change=0,maxSlope=0,sumSlope=0,count=0;
  let maxUphill=0,maxDownhill=0,uphillWeighted=0,downhillWeighted=0;
  let transitWeighted=0,confidenceWeighted=0,roughWeighted=0,metricDistance=0;
  let minTransitability=100,minConfidence=100,uncertainDistance=0,difficultDistance=0;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    const dist=haversine(a,b); const e1=a.elevationM,e2=b.elevationM;
    d+=dist;
    const analysis=analyzeEdge(a,b,params);
    if(Number.isFinite(e1)&&Number.isFinite(e2)&&dist>0){
      const rise=e2-e1;
      if(rise>0) gain+=rise; else descent+=Math.abs(rise);
      change+=Math.abs(rise);
      const slope=Math.abs(analysis.signedSlopeDeg);
      maxSlope=Math.max(maxSlope,slope); sumSlope+=slope; count++; path[i].slopeDeg=slope; path[i].signedSlopeDeg=analysis.signedSlopeDeg; path[i].transitability=analysis.transitability; path[i].edgeConfidence=analysis.confidence;
      if(analysis.signedSlopeDeg>=0){ maxUphill=Math.max(maxUphill,analysis.signedSlopeDeg); uphillWeighted+=analysis.signedSlopeDeg*dist; }
      else { const down=Math.abs(analysis.signedSlopeDeg); maxDownhill=Math.max(maxDownhill,down); downhillWeighted+=down*dist; }
    }
    if(Number.isFinite(analysis.transitability)){
      transitWeighted+=analysis.transitability*dist;
      minTransitability=Math.min(minTransitability,analysis.transitability);
      if(analysis.transitability<50) difficultDistance+=dist;
    }
    if(Number.isFinite(analysis.confidence)){
      confidenceWeighted+=analysis.confidence*dist;
      minConfidence=Math.min(minConfidence,analysis.confidence);
      if(analysis.confidence<50) uncertainDistance+=dist;
    }
    if(Number.isFinite(analysis.roughnessDeg)) roughWeighted+=analysis.roughnessDeg*dist;
    metricDistance+=dist;
  }
  return {
    distanceKm:d,
    gainM:gain,
    descentM:descent,
    elevationChangeM:change,
    maxSlopeDeg:count?maxSlope:null,
    avgSlopeDeg:count?sumSlope/count:null,
    maxUphillSlopeDeg:count?maxUphill:null,
    maxDownhillSlopeDeg:count?maxDownhill:null,
    avgUphillSlopeDeg:metricDistance?uphillWeighted/metricDistance:null,
    avgDownhillSlopeDeg:metricDistance?downhillWeighted/metricDistance:null,
    avgTransitability:metricDistance?transitWeighted/metricDistance:null,
    minTransitability:metricDistance?minTransitability:null,
    avgConfidence:metricDistance?confidenceWeighted/metricDistance:null,
    minConfidence:metricDistance?minConfidence:null,
    avgRoughnessDeg:metricDistance?roughWeighted/metricDistance:null,
    uncertainDistanceKm:uncertainDistance,
    difficultDistanceKm:difficultDistance,
    segments:count
  };
}
function nearestNode(grid,p){ return grid.nodes.reduce((best,n)=>!best||haversine(n,p)<haversine(best,p)?n:best,null); }
function neighbors(node,grid){
  const out=[]; for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr||dc){const r=node.r+dr,c=node.c+dc;if(r>=0&&r<grid.rows&&c>=0&&c<grid.cols) out.push(grid.nodes[r*grid.cols+c]);} return out;
}
function heuristic(n,goal,mode,params){
  // La distancia geodésica es una cota inferior válida para las tres estrategias.
  // Mantener la heurística neutra evita que el A* esconda diferencias introducidas
  // por los costos de terreno de cada estrategia.
  return haversine(n,goal);
}
function analyzeEdge(a,b,params){
  const d=haversine(a,b);
  const elevReady=Number.isFinite(a.elevationM)&&Number.isFinite(b.elevationM)&&d>0;
  if(!elevReady) return {distanceKm:d,signedSlopeDeg:null,roughnessDeg:null,confidence:0,transitability:0,blocked:true,reasons:['elevación desconocida']};
  const rise=b.elevationM-a.elevationM;
  const signedSlopeDeg=Math.atan2(rise/1000,Math.max(d,.001))*180/Math.PI;
  const absSlope=Math.abs(signedSlopeDeg);
  const roughnessDeg=[a.localRoughnessDeg,b.localRoughnessDeg].filter(Number.isFinite).reduce((x,y,_,arr)=>x+y/arr.length,0);
  const confVals=[a.dataConfidence,b.dataConfidence].filter(Number.isFinite);
  const confidence=confVals.length?Math.min(...confVals):0;
  const baseVals=[a.baseTransitability,b.baseTransitability].filter(Number.isFinite);
  const baseTransitability=baseVals.length?baseVals.reduce((x,y)=>x+y,0)/baseVals.length:50;
  const directionalPenalty=signedSlopeDeg>=0 ? absSlope*.75 : absSlope*.45;
  const transitability=clamp(baseTransitability-directionalPenalty,0,100);
  const reasons=[];
  if(absSlope>params.maxSlopeLimit) reasons.push(`pendiente ${absSlope.toFixed(1)}° > ${params.maxSlopeLimit.toFixed(1)}°`);
  if(transitability<params.minTransitability) reasons.push(`transitabilidad ${transitability.toFixed(0)} < ${params.minTransitability.toFixed(0)}`);
  if(confidence<params.minConfidence) reasons.push(`calidad de muestreo ${confidence.toFixed(0)}% < ${params.minConfidence.toFixed(0)}%`);
  return {distanceKm:d,riseM:rise,signedSlopeDeg,absSlopeDeg:absSlope,roughnessDeg,confidence,transitability,blocked:reasons.length>0,reasons};
}
function edgeCost(a,b,mode,params){
  const x=analyzeEdge(a,b,params);
  if(x.blocked || !Number.isFinite(x.distanceKm)) return Infinity;
  const d=x.distanceKm;
  const speed=Math.max(.1,params.speed);
  const travelHours=d/speed;
  const uphill=Math.max(0,x.signedSlopeDeg||0),downhill=Math.max(0,-(x.signedSlopeDeg||0));
  const directionalSlopeNorm=clamp((uphill*1.25+downhill*.85)/18,0,2);
  const transitPenalty=clamp((100-x.transitability)/100,0,1);
  const uncertaintyPenalty=clamp((100-x.confidence)/100,0,1);
  const roughPenalty=clamp((x.roughnessDeg||0)/12,0,1.5);
  // V42: las estrategias tienen objetivos deliberadamente distintos. Los límites
  // duros se aplican arriba en analyzeEdge() para las tres por igual.
  if(mode==='distance') return d;
  if(mode==='risk') return d*(1+directionalSlopeNorm*3.15+transitPenalty*3.25+uncertaintyPenalty*2.45+roughPenalty*1.65)+travelHours*.45;
  return d*(1+directionalSlopeNorm*1.15+transitPenalty*1.20+uncertaintyPenalty*.90+roughPenalty*.62)+travelHours*.11;
}
function aStar(grid,start,goal,mode,params){
  const open=[start], came=new Map(), g=new Map([[key(start),0]]), f=new Map([[key(start),heuristic(start,goal,mode,params)]]);
  while(open.length){
    open.sort((a,b)=>(f.get(key(a))??Infinity)-(f.get(key(b))??Infinity));
    const cur=open.shift();
    if(key(cur)===key(goal)){
      const path=[]; let n=cur; while(n){path.push(n);n=came.get(key(n));} return path.reverse();
    }
    for(const nb of neighbors(cur,grid)){
      const edge=edgeCost(cur,nb,mode,params);
      if(!Number.isFinite(edge)) continue;
      const tentative=(g.get(key(cur))??Infinity)+edge;
      if(tentative<(g.get(key(nb))??Infinity)){
        came.set(key(nb),cur);g.set(key(nb),tentative);f.set(key(nb),tentative+heuristic(nb,goal,mode,params));
        if(!open.some(n=>key(n)===key(nb)))open.push(nb);
      }
    }
  }
  return null;
}
const key=n=>`${n.r}:${n.c}`;
function forceEndpoints(path,a,b){ if(!path||path.length<2)return path; return [{...a,elevationM:a.elevationM},...path.slice(1,-1),{...b,elevationM:b.elevationM}]; }
function shortestLonDelta(a,b){ return ((b-a+540)%360)-180; }
function interpolateLon(a,b,t){ return normalizeLon(a + shortestLonDelta(a,b)*t); }
function buildGrid(a,b,rows=17,cols=17,mode='balanced'){
  // V26: corredor 2D orientado al tramo. La versión anterior variaba la latitud
  // por fila, pero reutilizaba la misma longitud por columna; en tramos casi N/S
  // las columnas podían colapsar y A* no tenía espacio real para rodear terreno.
  const directKm=Math.max(.001,haversine(a,b));
  const kmPerDegLat=Math.PI*MARTIAN_RADIUS/180;
  const midLat=(a.lat+b.lat)/2;
  const kmPerDegLon=Math.max(kmPerDegLat*.08,kmPerDegLat*Math.cos(midLat*Math.PI/180));
  const eastKm=shortestLonDelta(a.lon,b.lon)*kmPerDegLon;
  const northKm=(b.lat-a.lat)*kmPerDegLat;
  const norm=Math.max(.001,Math.hypot(eastKm,northKm));
  const perpEast=-northKm/norm;
  const perpNorth=eastKm/norm;
  // All strategies evaluate the same geometry and sampling quality.
  const corridorFactor=.42, minWidth=4, maxWidth=145;
  const corridorHalfWidthKm=clamp(directKm*corridorFactor,minWidth,maxWidth);
  const nodes=[];

  for(let r=0;r<rows;r++){
    const lateral=((r/(rows-1))-.5)*2*corridorHalfWidthKm;
    for(let c=0;c<cols;c++){
      const t=c/(cols-1);
      const centerLat=a.lat+(b.lat-a.lat)*t;
      const centerLon=interpolateLon(a.lon,b.lon,t);
      const offsetNorth=perpNorth*lateral;
      const offsetEast=perpEast*lateral;
      const lat=clamp(centerLat+offsetNorth/kmPerDegLat,-89.5,89.5);
      const localKmPerDegLon=Math.max(kmPerDegLat*.08,kmPerDegLat*Math.cos(lat*Math.PI/180));
      const lon=normalizeLon(centerLon+offsetEast/localKmPerDegLon);
      nodes.push({r,c,lat,lon});
    }
  }
  return {nodes,rows,cols,corridorHalfWidthKm};
}
function stddev(values){
  if(!values.length) return 0;
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  return Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length);
}
function annotateGridTerrain(grid){
  const spacings=[];
  for(const n of grid.nodes){
    if(n.c+1<grid.cols) spacings.push(haversine(n,grid.nodes[n.r*grid.cols+n.c+1]));
    if(n.r+1<grid.rows) spacings.push(haversine(n,grid.nodes[(n.r+1)*grid.cols+n.c]));
  }
  const sorted=spacings.filter(Number.isFinite).sort((a,b)=>a-b);
  const medianSpacingKm=sorted.length?sorted[Math.floor(sorted.length/2)]:DEM_RESOLUTION_KM;
  const densityFactor=clamp((DEM_RESOLUTION_KM*3)/Math.max(DEM_RESOLUTION_KM,medianSpacingKm),0,1);
  for(const node of grid.nodes){
    const allNeighbors=neighbors(node,grid);
    const validNeighbors=allNeighbors.filter(x=>Number.isFinite(x.elevationM));
    const ownValid=Number.isFinite(node.elevationM);
    const slopes=[];
    const elevations=ownValid?[node.elevationM]:[];
    if(ownValid){
      for(const nb of validNeighbors){
        const dist=haversine(node,nb);
        if(dist>0){
          slopes.push(Math.atan2(Math.abs(nb.elevationM-node.elevationM)/1000,dist)*180/Math.PI);
          elevations.push(nb.elevationM);
        }
      }
    }
    const completeness=ownValid?(1+validNeighbors.length)/(1+allNeighbors.length):0;
    const confidence=ownValid?clamp(100*completeness*(.35+.65*densityFactor),0,100):0;
    const maxLocalSlopeDeg=slopes.length?Math.max(...slopes):null;
    const localRoughnessDeg=slopes.length?stddev(slopes):null;
    const localRoughnessM=elevations.length>1?stddev(elevations):null;
    const baseTransitability=ownValid?clamp(100-(maxLocalSlopeDeg||0)*2.35-(localRoughnessDeg||0)*2.0-(100-confidence)*.22,0,100):0;
    Object.assign(node,{dataConfidence:confidence,maxLocalSlopeDeg,localRoughnessDeg,localRoughnessM,baseTransitability});
  }
  grid.medianSpacingKm=medianSpacingKm;
  grid.densityFactor=densityFactor;
  return grid;
}
function gridSizeForDistanceKm(distanceKm){
  if(distanceKm>5000) return 11;
  if(distanceKm>2500) return 13;
  if(distanceKm>800) return 15;
  return 17;
}
async function calculateLeg(a,b,mode,params,terrainCache=null){
  if(haversine(a,b)<.000001) throw new Error('No se puede calcular un tramo entre puntos coincidentes.');
  const gridSize=gridSizeForDistanceKm(haversine(a,b));
  const grid=buildGrid(a,b,gridSize,gridSize,mode);
  const samples=grid.nodes.map(n=>({lat:n.lat,lon:n.lon}));
  samples.push({lat:a.lat,lon:a.lon},{lat:b.lat,lon:b.lon});
  const sampleKey=`${a.lat.toFixed(7)},${a.lon.toFixed(7)}>${b.lat.toFixed(7)},${b.lon.toFixed(7)}|${gridSize}`;
  if(terrainCache&&!terrainCache.has(sampleKey))terrainCache.set(sampleKey,getElevations(samples));
  const elevated=terrainCache?await terrainCache.get(sampleKey):await getElevations(samples);
  const mapByCoord=new Map(elevated.map(p=>[`${Number(p.lat).toFixed(5)},${Number(p.lon).toFixed(5)}`,p]));
  for(const n of grid.nodes){
    const sample=mapByCoord.get(`${n.lat.toFixed(5)},${n.lon.toFixed(5)}`);
    n.elevationM=sample?.elevationM;
    n.demResolutionM=numericValue(sample?.demResolutionM);
  }
  annotateGridTerrain(grid);
  const aElev=elevated[elevated.length-2]?.elevationM,bElev=elevated[elevated.length-1]?.elevationM;
  const aa={...a,elevationM:aElev},bb={...b,elevationM:bElev};
  if(!Number.isFinite(aa.elevationM)||!Number.isFinite(bb.elevationM)) throw new Error('No se recibió elevación para uno de los puntos de la misión.');
  const s=nearestNode(grid,aa),g=nearestNode(grid,bb);
  const path0=aStar(grid,s,g,mode,params);
  if(!path0) throw new Error(`No se encontró una trayectoria en el corredor que cumpla los límites duros entre ${a.name} y ${b.name}. Revisa pendiente máxima, transitabilidad mínima o calidad de muestreo.`);
  const startPoint={...aa,dataConfidence:s.dataConfidence,baseTransitability:s.baseTransitability,localRoughnessDeg:s.localRoughnessDeg,localRoughnessM:s.localRoughnessM};
  const endPoint={...bb,dataConfidence:g.dataConfidence,baseTransitability:g.baseTransitability,localRoughnessDeg:g.localRoughnessDeg,localRoughnessM:g.localRoughnessM};
  const path=forceEndpoints(path0,startPoint,endPoint);
  validateFinalPath(path,params);
  const metrics=pathMetrics(path,params);
  const resolutions=elevated.map(p=>numericValue(p.demResolutionM)).filter(v=>v!==null&&v>0);
  return {from:a,to:b,path,metrics,durationHours:estimateDuration(metrics,params),gridSpacingKm:grid.medianSpacingKm,
    sampling:{sampleCount:elevated.length,validCount:elevated.filter(p=>finiteValue(p.elevationM)).length,requestedResolutionM:200,
      minResolutionM:resolutions.length?Math.min(...resolutions):null,maxResolutionM:resolutions.length?Math.max(...resolutions):null}};
}
function riskScore(m){
  if(!m || !Number.isFinite(m.maxSlopeDeg)) return null;
  const slopePenalty=clamp(m.maxSlopeDeg/25,0,1)*35;
  const transitPenalty=clamp((100-(m.minTransitability??100))/100,0,1)*30;
  const uncertaintyPenalty=clamp((100-(m.avgConfidence??100))/100,0,1)*20;
  const roughnessPenalty=clamp((m.avgRoughnessDeg||0)/10,0,1)*15;
  return Math.round(clamp(slopePenalty+transitPenalty+uncertaintyPenalty+roughnessPenalty,0,100));
}
function riskLabel(score){ if(score<30)return 'Bajo'; if(score<55)return 'Moderado'; if(score<75)return 'Alto'; return 'Muy alto'; }
function availableMissionHours(params){ return params.evaTime*(1-params.returnMargin/100); }
function estimateDuration(metrics,params){
  const speed=Math.max(.1,params.speed);
  const uphillFactor=1+clamp((metrics.avgUphillSlopeDeg||0)/20,0,.7)*.55;
  const downhillFactor=1+clamp((metrics.avgDownhillSlopeDeg||0)/20,0,.7)*.28;
  const terrainFactor=1+clamp((100-(metrics.avgTransitability??100))/100,0,1)*.35;
  const uncertaintyFactor=1+clamp((100-(metrics.avgConfidence??100))/100,0,1)*.12;
  return metrics.distanceKm/speed*uphillFactor*downhillFactor*terrainFactor*uncertaintyFactor;
}
function formatHours(h){
  if(!finiteValue(h))return '—';
  const sign=Number(h)<0?'−':'',mins=Math.round(Math.abs(Number(h))*60);
  return `${sign}${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')} min`;
}
function formatSignedMargin(h){ return h>=0 ? formatHours(h) : `EXCEDE ${formatHours(-h)}`; }

function sequenceWithReturn(points, returnBase){
  if(!returnBase || points.length<2) return points.map(p=>({...p}));
  const base=points.find((p,i)=>i===0 || p.type==='base') || points[0];
  const last=points[points.length-1];
  const out=points.map(p=>({...p}));
  if(last.lat!==base.lat || last.lon!==base.lon) out.push({...base,name:'Regreso a base',type:'base',required:true,dwellMin:0});
  return out;
}

function createLegCache(){ const cache=new Map(); return { cache, terrain:new Map(), key:(a,b,mode,params)=>`${mode}|${a.lat.toFixed(7)},${a.lon.toFixed(7)}>${b.lat.toFixed(7)},${b.lon.toFixed(7)}|${params.speed.toFixed(2)}|${params.maxSlopeLimit.toFixed(1)}|${params.minTransitability.toFixed(0)}|${params.minConfidence.toFixed(0)}` }; }
async function getCachedLeg(a,b,mode,params,legCache){
  const k=legCache.key(a,b,mode,params); if(legCache.cache.has(k)) return legCache.cache.get(k);
  const promise=calculateLeg(a,b,mode,params,legCache.terrain); legCache.cache.set(k,promise); return promise;
}

async function evaluateSequence(seq,mode,params,legCache){
  const legs=[];
  for(let i=1;i<seq.length;i++) legs.push(await getCachedLeg(seq[i-1],seq[i],mode,params,legCache));
  return aggregateMission(legs,mode,params,seq);
}
function routeOrderGeodesicCost(base,order,returnBase){
  if(!order.length) return 0;
  let total=haversine(base,order[0]);
  for(let i=1;i<order.length;i++) total+=haversine(order[i-1],order[i]);
  if(returnBase) total+=haversine(order.at(-1),base);
  return total;
}
function heldKarpWaypointOrder(base,targets,returnBase){
  const n=targets.length;
  if(n<=1) return targets.slice();
  if(n>10) return null;
  const size=1<<n;
  const dp=Array.from({length:size},()=>Array(n).fill(null));
  for(let j=0;j<n;j++) dp[1<<j][j]={cost:haversine(base,targets[j]),prev:-1};
  for(let mask=1;mask<size;mask++){
    for(let j=0;j<n;j++){
      const cur=dp[mask][j]; if(!cur) continue;
      for(let k=0;k<n;k++){
        if(mask&(1<<k)) continue;
        const next=mask|(1<<k), cost=cur.cost+haversine(targets[j],targets[k]);
        if(!dp[next][k]||cost<dp[next][k].cost) dp[next][k]={cost,prev:j};
      }
    }
  }
  const full=size-1; let bestEnd=0,bestCost=Infinity;
  for(let j=0;j<n;j++){
    const cur=dp[full][j]; if(!cur) continue;
    const cost=cur.cost+(returnBase?haversine(targets[j],base):0);
    if(cost<bestCost){bestCost=cost;bestEnd=j;}
  }
  const idx=[]; let mask=full,j=bestEnd;
  while(j>=0){idx.push(j);const prev=dp[mask][j]?.prev??-1;mask&=~(1<<j);j=prev;}
  idx.reverse();
  return idx.map(i=>targets[i]);
}
function heuristicWaypointOrder(base,targets,returnBase){
  const remaining=targets.slice(), order=[]; let cur=base;
  while(remaining.length){
    let bi=0,bd=Infinity;
    remaining.forEach((p,i)=>{const d=haversine(cur,p);if(d<bd){bd=d;bi=i;}});
    cur=remaining.splice(bi,1)[0]; order.push(cur);
  }
  let improved=true,guard=0;
  while(improved&&guard++<3){
    improved=false; let best=routeOrderGeodesicCost(base,order,returnBase),bestOrder=order;
    for(let i=0;i<order.length-1;i++) for(let j=i+1;j<order.length;j++){
      const candidate=order.slice(); [candidate[i],candidate[j]]=[candidate[j],candidate[i]];
      const c=routeOrderGeodesicCost(base,candidate,returnBase);
      if(c+1e-6<best){best=c;bestOrder=candidate;improved=true;}
    }
    order.splice(0,order.length,...bestOrder);
  }
  return order;
}
function waypointOrderSeed(basePoints,returnBase,optimize){
  const base=basePoints[0]; const targets=basePoints.slice(1);
  if(!optimize) return targets.slice();
  return heldKarpWaypointOrder(base,targets,returnBase) || heuristicWaypointOrder(base,targets,returnBase);
}
function missionOrderObjective(mission,mode){
  const m=mission?.metrics||{}, risk=Number(mission?.score)||0;
  const distance=Number(m.distanceKm)||0, duration=Number(mission?.duration)||0;
  const difficult=Number(m.difficultDistanceKm)||0, uncertain=Number(m.uncertainDistanceKm)||0;
  const transit=finiteValue(m.avgTransitability)?Number(m.avgTransitability):60;
  const slope=Number(m.maxSlopeDeg)||0, rough=Number(m.avgRoughnessDeg)||0;
  if(mode==='distance') return distance;
  if(mode==='risk') return distance*.18 + duration*.72 + risk*.115 + difficult*4.2 + uncertain*2.4 + Math.max(0,88-transit)*.12 + slope*.16 + rough*.20;
  return distance*.48 + duration*.72 + risk*.042 + difficult*1.45 + uncertain*.82 + Math.max(0,76-transit)*.052 + slope*.055 + rough*.07;
}
async function refineWaypointOrder(base,seedOrder,returnBase,mode,params,legCache){
  let order=seedOrder.slice();
  let mission=await evaluateSequence(sequenceWithReturn([base,...order],returnBase),mode,params,legCache);
  if(order.length<2) return {order,mission,trials:0};
  const passes=order.length<=6?2:1;
  let trials=0;
  for(let pass=0;pass<passes;pass++){
    const currentScore=missionOrderObjective(mission,mode); let bestScore=currentScore,bestOrder=null,bestMission=null;
    const candidates=[];
    for(let i=0;i<order.length-1;i++) for(let j=i+1;j<order.length;j++) candidates.push([i,j]);
    const maxTrials=order.length<=8?candidates.length:Math.min(18,candidates.length);
    for(const [i,j] of candidates.slice(0,maxTrials)){
      const trialOrder=order.slice(); [trialOrder[i],trialOrder[j]]=[trialOrder[j],trialOrder[i]];
      try{
        const trial=await evaluateSequence(sequenceWithReturn([base,...trialOrder],returnBase),mode,params,legCache); trials++;
        const score=missionOrderObjective(trial,mode);
        if(score+1e-6<bestScore){bestScore=score;bestOrder=trialOrder;bestMission=trial;}
      }catch{/* una transición no viable se descarta */}
    }
    if(!bestOrder) break;
    order=bestOrder; mission=bestMission;
  }
  return {order,mission,trials};
}
async function chooseSequence(mode,basePoints,returnBase,params,legCache){
  const available=availableMissionHours(params);
  const cleaned=basePoints.map((p,i)=>({...p,type:i===0||p.type==='base'?'base':'target',required:true,scienceValue:undefined,scienceCategory:undefined,scienceNotes:undefined}));
  const base=cleaned[0]; const optimize=optimizeOrderEnabled();
  const seed=waypointOrderSeed(cleaned,returnBase,optimize);
  let result;
  if(optimize) result=await refineWaypointOrder(base,seed,returnBase,mode,params,legCache);
  else{
    const seq=sequenceWithReturn([base,...seed],returnBase);
    result={order:seed,mission:await evaluateSequence(seq,mode,params,legCache),trials:0};
  }
  const finalMission=result.mission;
  finalMission.includedPoints=finalMission.sequence;
  finalMission.omittedOptional=[];
  finalMission.availableHours=available;
  finalMission.overBudget=finalMission.duration>available;
  finalMission.params={...params};
  finalMission.orderOptimization={
    enabled:optimize,
    method:optimize?(cleaned.length-1<=10?'Held-Karp geodésico + refinamiento A* por terreno':'heurística geodésica + refinamiento A* por terreno'):'orden manual',
    trials:result.trials,
    inputOrder:cleaned.slice(1).map(p=>p.name),
    optimizedOrder:result.order.map(p=>p.name)
  };
  finalMission.strategyDescription=mode==='distance'
    ?'Optimiza el orden de visita y minimiza la distancia de los tramos viables.'
    :mode==='risk'
      ?'Optimiza el orden de visita priorizando menor exposición, transitabilidad y calidad de muestreo.'
      :'Optimiza el orden de visita equilibrando distancia, tiempo, pendiente, transitabilidad e incertidumbre.';
  return finalMission;
}

function aggregateMission(legs,mode,params,sequence){
  const metrics={distanceKm:0,gainM:0,descentM:0,elevationChangeM:0,maxSlopeDeg:null,avgSlopeDeg:null,maxUphillSlopeDeg:null,maxDownhillSlopeDeg:null,avgUphillSlopeDeg:null,avgDownhillSlopeDeg:null,avgTransitability:null,minTransitability:null,avgConfidence:null,minConfidence:null,avgRoughnessDeg:null,uncertainDistanceKm:0,difficultDistanceKm:0,segments:0};
  let weightedSlope=0,weightedDistance=0,weightedUp=0,weightedDown=0,weightedTransit=0,weightedConfidence=0,weightedRough=0;
  legs.forEach(leg=>{
    const lm=leg.metrics,dist=lm.distanceKm||0;
    metrics.distanceKm+=dist; metrics.gainM+=lm.gainM; metrics.descentM+=lm.descentM; metrics.elevationChangeM+=lm.elevationChangeM; metrics.segments+=lm.segments;
    metrics.uncertainDistanceKm+=lm.uncertainDistanceKm||0; metrics.difficultDistanceKm+=lm.difficultDistanceKm||0;
    if(Number.isFinite(lm.maxSlopeDeg)) metrics.maxSlopeDeg=metrics.maxSlopeDeg===null?lm.maxSlopeDeg:Math.max(metrics.maxSlopeDeg,lm.maxSlopeDeg);
    if(Number.isFinite(lm.maxUphillSlopeDeg)) metrics.maxUphillSlopeDeg=metrics.maxUphillSlopeDeg===null?lm.maxUphillSlopeDeg:Math.max(metrics.maxUphillSlopeDeg,lm.maxUphillSlopeDeg);
    if(Number.isFinite(lm.maxDownhillSlopeDeg)) metrics.maxDownhillSlopeDeg=metrics.maxDownhillSlopeDeg===null?lm.maxDownhillSlopeDeg:Math.max(metrics.maxDownhillSlopeDeg,lm.maxDownhillSlopeDeg);
    if(Number.isFinite(lm.minTransitability)) metrics.minTransitability=metrics.minTransitability===null?lm.minTransitability:Math.min(metrics.minTransitability,lm.minTransitability);
    if(Number.isFinite(lm.minConfidence)) metrics.minConfidence=metrics.minConfidence===null?lm.minConfidence:Math.min(metrics.minConfidence,lm.minConfidence);
    if(dist>0){
      if(Number.isFinite(lm.avgSlopeDeg)) weightedSlope+=lm.avgSlopeDeg*dist;
      if(Number.isFinite(lm.avgUphillSlopeDeg)) weightedUp+=lm.avgUphillSlopeDeg*dist;
      if(Number.isFinite(lm.avgDownhillSlopeDeg)) weightedDown+=lm.avgDownhillSlopeDeg*dist;
      if(Number.isFinite(lm.avgTransitability)) weightedTransit+=lm.avgTransitability*dist;
      if(Number.isFinite(lm.avgConfidence)) weightedConfidence+=lm.avgConfidence*dist;
      if(Number.isFinite(lm.avgRoughnessDeg)) weightedRough+=lm.avgRoughnessDeg*dist;
      weightedDistance+=dist;
    }
  });
  metrics.avgSlopeDeg=weightedDistance?weightedSlope/weightedDistance:null;
  metrics.avgUphillSlopeDeg=weightedDistance?weightedUp/weightedDistance:null;
  metrics.avgDownhillSlopeDeg=weightedDistance?weightedDown/weightedDistance:null;
  metrics.avgTransitability=weightedDistance?weightedTransit/weightedDistance:null;
  metrics.avgConfidence=weightedDistance?weightedConfidence/weightedDistance:null;
  metrics.avgRoughnessDeg=weightedDistance?weightedRough/weightedDistance:null;
  const dwellMinutes=sequence.reduce((s,p)=>s+(Number(p.dwellMin)||0),0);
  const duration=legs.reduce((sum,leg)=>sum+leg.durationHours,0)+dwellMinutes/60;
  const scores=legs.map(x=>riskScore(x.metrics)).filter(Number.isFinite);
  const score=scores.length?Math.max(...scores):null;
  const targetKeys=new Set(sequence.filter(p=>p.type!=='base').map(pointCoordKey));
  return {mode,legs,metrics,dwellMinutes,duration,score,sequence,targetCount:targetKeys.size};
}

function validateFinalPath(path,params){
  if(!Array.isArray(path)||path.length<2)throw new Error('La ruta final no tiene una geometría válida.');
  for(let i=1;i<path.length;i++){
    const edge=analyzeEdge(path[i-1],path[i],params);
    if(edge.blocked)throw new Error(`La ruta final incumple límites en el segmento ${i}: ${edge.reasons.join(', ')}.`);
  }
  return true;
}

return Object.freeze({haversine,pathMetrics,nearestNode,neighbors,heuristic,analyzeEdge,edgeCost,aStar,forceEndpoints,shortestLonDelta,interpolateLon,buildGrid,stddev,annotateGridTerrain,gridSizeForDistanceKm,calculateLeg,riskScore,riskLabel,availableMissionHours,estimateDuration,formatHours,formatSignedMargin,sequenceWithReturn,createLegCache,getCachedLeg,evaluateSequence,routeOrderGeodesicCost,heldKarpWaypointOrder,heuristicWaypointOrder,waypointOrderSeed,missionOrderObjective,refineWaypointOrder,chooseSequence,aggregateMission,validateFinalPath});
  }
  return Object.freeze({createEngine,algorithmVersion:'44.0'});
});
