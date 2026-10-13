/* Planning budgets only. Measurements, equipment limits and procedures are supplied by the operator. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.JEZERO_OPERATIONS_ENGINE=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const VERSION=1,MAX=40;
 const text=(v,max=160)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('Texto inválido / Invalid text');return v.trim();};
 const n=(v,min=0,max=1e6)=>{if(v==null||v==='')return null;if(!['number','string'].includes(typeof v)||(typeof v==='string'&&!v.trim()))throw Error('Número inválido / Invalid number');const x=Number(v);if(!Number.isFinite(x)||x<min||x>max)throw Error('Número fuera de rango / Number out of range');return x;};
 const flag=v=>{if(v==null)return false;if(typeof v!=='boolean')throw Error('Booleano inválido / Invalid boolean');return v;};
 const date=(v,calendar=false)=>{const s=text(v,40);if(!s)return '';if(!Number.isFinite(Date.parse(s))||!(calendar?/^\d{4}-\d{2}-\d{2}$/.test(s):/^\d{4}-\d{2}-\d{2}T/.test(s)))throw Error('Fecha inválida / Invalid date');const day=s.slice(0,10);if(new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||(!calendar&&!/(Z|[+-]\d{2}:\d{2})$/.test(s)))throw Error('Fecha ISO con zona horaria requerida / ISO date with time zone required');return s;};
 const id=v=>{const s=text(v,80);if(!/^[a-zA-Z0-9_-]{1,80}$/.test(s))throw Error('ID inválido / Invalid ID');return s;};
 const required=v=>{const s=text(v);if(!s)throw Error('Nombre requerido / Name required');return s;};
 const choice=(v,values,fallback)=>{const x=v==null?fallback:v;if(!values.includes(x))throw Error('Estado inválido / Invalid status');return x;};
 const list=(a,fn,max=MAX)=>{if(a==null)return [];if(!Array.isArray(a)||a.length>max)throw Error('Lista demasiado grande / List too large');const seen=new Set();return a.map(x=>{if(!x||typeof x!=='object')throw Error('Registro inválido / Invalid record');const item=fn(x);if(seen.has(item.id))throw Error('ID duplicado / Duplicate ID');seen.add(item.id);return item;});};
 function shelter(x){return {id:id(x.id),name:required(x.name),lat:n(x.lat,-90,90),lon:n(x.lon,-180,180),capacity:n(x.capacity,0,1000),available:flag(x.available),waterL:n(x.waterL),oxygenKg:n(x.oxygenKg),energyKWh:n(x.energyKWh),source:text(x.source,500),updatedAt:date(x.updatedAt)};}
 function relay(x){return {id:id(x.id),name:required(x.name),lat:n(x.lat,-90,90),lon:n(x.lon,-180,180),radiusKm:n(x.radiusKm,0,5000),source:text(x.source,500),updatedAt:date(x.updatedAt)};}
 function equipment(x){return {id:id(x.id),name:required(x.name),type:choice(x.type,['suit','rover','habitat','radio','dosimeter','other'],'other'),status:choice(x.status,['unknown','checked','maintenance','fault'],'unknown'),critical:flag(x.critical),source:text(x.source,500),checkedAt:date(x.checkedAt),serviceDue:date(x.serviceDue,true),notes:text(x.notes,2000)};}
 function procedure(x){const steps=text(x.steps,6000);const count=steps.split('\n').map(x=>x.trim()).filter(Boolean).length;if(count>50)throw Error('Máximo 50 pasos / Maximum 50 steps');return {id:id(x.id),name:required(x.name),trigger:text(x.trigger,1000),responsible:text(x.responsible,160),source:text(x.source,500),steps,reviewed:flag(x.reviewed),shelterId:x.shelterId?id(x.shelterId):'',completed:Array.isArray(x.completed)?[...new Set(x.completed.map(v=>n(v,0,49)))].filter(v=>v!==null&&Number.isInteger(v)&&v<count):[]};}
 function resources(x={}){return {waterL:n(x.waterL),waterRateLH:n(x.waterRateLH,0,20),co2CapacityKg:n(x.co2CapacityKg),co2RateKgH:n(x.co2RateKgH,0,10),thermalKWh:n(x.thermalKWh),thermalKW:n(x.thermalKW,0,100),source:text(x.source,500)};}
 function radiation(x={}){return {rateUSvH:n(x.rateUSvH),accumulatedMSv:n(x.accumulatedMSv),source:text(x.source,500),measuredAt:date(x.measuredAt)};}
 function communications(x={}){return {status:choice(x.status,['unknown','verified','degraded','lost'],'unknown'),source:text(x.source,500),checkedAt:date(x.checkedAt),contact:text(x.contact,500)};}
 function criteria(x={}){return {maxDurationH:n(x.maxDurationH,0,10000),minWaterL:n(x.minWaterL),maxDoseMSv:n(x.maxDoseMSv),maxSlopeDeg:n(x.maxSlopeDeg,0,90),sensorAgeH:n(x.sensorAgeH,0,10000),requireReturn:flag(x.requireReturn),stopOnLinkLoss:flag(x.stopOnLinkLoss),stopOnEquipmentFault:flag(x.stopOnEquipmentFault),source:text(x.source,500)};}
 function state(raw={}){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Plan inválido / Invalid plan');const s={resources:resources(raw.resources),radiation:radiation(raw.radiation),communications:communications(raw.communications),criteria:criteria(raw.criteria),shelters:list(raw.shelters,shelter),relays:list(raw.relays,relay),equipment:list(raw.equipment,equipment),procedures:list(raw.procedures,procedure),log:list(raw.log,logEntry,500)};for(const x of [...s.shelters,...s.relays])if(x.lat===null||x.lon===null)throw Error('Coordenadas requeridas / Coordinates required');for(const p of s.procedures)if(p.shelterId&&!s.shelters.some(x=>x.id===p.shelterId))throw Error('Refugio inexistente / Shelter missing');return s;}
 function logEntry(x){const at=date(x.at);if(!at)throw Error('Hora requerida en bitácora / Log timestamp required');return {id:id(x.id),at,kind:choice(x.kind,['note','decision','incident','change'],'note'),text:requiredLog(x.text)};}
 function requiredLog(v){const s=text(v,4000);if(!s)throw Error('Entrada vacía / Empty log entry');return s;}
 function imported(payload){if(payload?.format!=='JEZERO-SUPPORT'||payload.version!==VERSION)throw Error('Formato JEZERO-SUPPORT v1 requerido / JEZERO-SUPPORT v1 required');return state(payload.state);}
 function distance(a,b){if(!a||!b||a.lat==null||a.lon==null||b.lat==null||b.lon==null)return null;const r=Math.PI/180,dp=(b.lat-a.lat)*r,dl=(b.lon-a.lon)*r,h=Math.sin(dp/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dl/2)**2;return 2*3389.5*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));}
 function assess(raw,context={},now=Date.now()){
  const s=state(raw),mission=context.mission,survival=context.survival;
  const hasRoute=Number.isFinite(mission?.duration)&&mission.duration>=0;
  const scenarioMatches=hasRoute&&Number.isFinite(survival?.durationHours)&&survival.durationHours>=0&&Number.isFinite(survival.routeDurationHours)&&Math.abs(survival.routeDurationHours-mission.duration)<1e-7;
  const duration=hasRoute?(scenarioMatches?survival.durationHours:mission.duration):null;
  const crew=n(context.crew,1,100)||1,origin=context.origin||mission?.sequence?.[0]||null;
  const budget=(capacity,rate)=>({capacity,rate,used:duration!==null&&rate!==null?duration*rate:null,remaining:duration!==null&&rate!==null&&capacity!==null?capacity-duration*rate:null,provenance:Boolean(s.resources.source)});
  const water=budget(s.resources.waterL,s.resources.waterRateLH),co2=budget(s.resources.co2CapacityKg,s.resources.co2RateKgH),thermal=budget(s.resources.thermalKWh,s.resources.thermalKW);
  const recorded=Boolean(s.radiation.source&&s.radiation.measuredAt),age=recorded?(now-Date.parse(s.radiation.measuredAt))/36e5:null;
  const measurementUsable=recorded&&age>=0&&(s.criteria.sensorAgeH===null||age<=s.criteria.sensorAgeH);
  const dose=measurementUsable&&duration!==null&&s.radiation.rateUSvH!==null&&s.radiation.accumulatedMSv!==null?s.radiation.accumulatedMSv+s.radiation.rateUSvH*duration/1000:null;
  const linkRecorded=Boolean(s.communications.source&&s.communications.checkedAt),linkAge=linkRecorded?(now-Date.parse(s.communications.checkedAt))/36e5:null;
  const linkFresh=linkRecorded&&linkAge>=0&&(s.criteria.sensorAgeH===null||linkAge<=s.criteria.sensorAgeH);
  const faults=s.equipment.filter(x=>x.critical&&x.status==='fault');
  const equipmentUnknown=s.equipment.filter(x=>x.critical&&(x.status==='unknown'||!x.source||!x.checkedAt||Date.parse(x.checkedAt)>now||(s.criteria.sensorAgeH!==null&&(now-Date.parse(x.checkedAt))/36e5>s.criteria.sensorAgeH)));
  const maintenance=s.equipment.filter(x=>x.status==='maintenance'||(x.serviceDue&&Date.parse(x.serviceDue+'T23:59:59Z')<now));
  const shelters=s.shelters.map(x=>({...x,distanceKm:distance(origin,x),declaredSuitable:x.available&&x.capacity!==null&&x.capacity>=crew&&Boolean(x.source)})).sort((a,b)=>(a.distanceKm??Infinity)-(b.distanceKm??Infinity));
  const paths=mission?.legs?.flatMap(l=>l.path||[])||[];
  const declaredRelays=s.relays.filter(x=>x.radiusKm!==null&&x.source);
  const coverage=paths.length&&declaredRelays.length?paths.filter(p=>declaredRelays.some(r=>distance(p,r)<=r.radiusKm)).length/paths.length:null;
  const rules=[];const rule=(key,value,ok)=>rules.push({key,status:value===null?'unknown':ok?'pass':'fail',value});
  for(const [key,b] of [['water-capacity',water],['co2-capacity',co2],['thermal-capacity',thermal]])if(b.remaining!==null)rule(key,b.provenance?b.remaining:null,b.remaining>=0);
  if(s.criteria.maxDurationH!==null)rule('duration',duration,duration!==null&&duration<=s.criteria.maxDurationH);
  if(s.criteria.minWaterL!==null)rule('water',water.provenance?water.remaining:null,water.remaining!==null&&water.remaining>=s.criteria.minWaterL);
  if(s.criteria.maxDoseMSv!==null)rule('radiation',dose,dose!==null&&dose<=s.criteria.maxDoseMSv);
  if(s.criteria.maxSlopeDeg!==null)rule('slope',Number.isFinite(mission?.metrics?.maxSlopeDeg)?mission.metrics.maxSlopeDeg:null,mission?.metrics?.maxSlopeDeg<=s.criteria.maxSlopeDeg);
  if(s.criteria.requireReturn){const seq=mission?.sequence;rule('return',seq?.length>1?distance(seq[0],seq.at(-1)):null,seq?.length>1&&distance(seq[0],seq.at(-1))<.001);}
  if(s.criteria.stopOnLinkLoss)rule('link',linkFresh&&s.communications.status!=='unknown'?s.communications.status:null,s.communications.status==='verified');
  if(s.criteria.stopOnEquipmentFault)rule('equipment',faults.length?faults.length:!s.equipment.some(x=>x.critical)||equipmentUnknown.length?null:0,faults.length===0);
  const unknown=[];if(duration===null)unknown.push('route');if(!s.shelters.length)unknown.push('shelters');if(!water.provenance||water.remaining===null)unknown.push('water');if(!co2.provenance||co2.remaining===null)unknown.push('co2');if(!thermal.provenance||thermal.remaining===null)unknown.push('thermal');if(dose===null)unknown.push('radiation');if(!linkFresh||s.communications.status==='unknown')unknown.push('link');if(!s.equipment.length||equipmentUnknown.length)unknown.push('equipment');if(!s.procedures.some(p=>p.reviewed&&p.source&&p.steps))unknown.push('procedures');if(!rules.length||!s.criteria.source)unknown.push('criteria');
  return {durationHours:duration,durationSource:duration===null?'missing':scenarioMatches?'scenario':'route',crew,water,co2,thermal,radiation:{totalMSv:dose,ageHours:age,usable:measurementUsable},communications:{status:s.communications.status,recorded:linkFresh,declaredCoverageFraction:coverage},equipment:{faults,unknown:equipmentUnknown,maintenance},shelters,rules,unknown,status:rules.some(x=>x.status==='fail')?'criterion-exceeded':unknown.length||rules.some(x=>x.status==='unknown')?'incomplete':'reviewed-inputs'};
 }
 return Object.freeze({VERSION,state,imported,assess,distance,shelter,relay,equipment,procedure});
});
