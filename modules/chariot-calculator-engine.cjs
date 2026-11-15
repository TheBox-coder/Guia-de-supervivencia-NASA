/* Calculadora de misión y emergencia del Chariot. Modelo simplificado y determinista: no certifica una misión real. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.JEZERO_CHARIOT_CALC=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SOL_HOURS=24.6597;
 // Valores de la propuesta del equipo (infografía del Chariot): batería de 42 kWh y generador continuo de 1,2 kW.
 const DEFAULTS=Object.freeze({capacityKWh:42,generationKW:1.2,lifeSupportSols:14});
 const num=v=>{if(v===null||v===undefined||(typeof v==='string'&&v.trim()===''))return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 const fail=(es,en)=>({ok:false,error:`${es} / ${en}`});
 function context(options={}){
  const capacityKWh=num(options.capacityKWh)??DEFAULTS.capacityKWh,generationKW=num(options.generationKW)??DEFAULTS.generationKW;
  if(capacityKWh<=0||generationKW<0)return null;
  return {capacityKWh,generationKW};
 }
 // Misión de ida y vuelta sin paradas científicas: consumo = horas de conducción × (tracción + auxiliar); el generador aporta durante todo el viaje.
 function mission(raw={},options={}){
  const ctx=context(options);if(!ctx)return fail('Revisa la capacidad de batería y la generación del Chariot.','Check the Chariot battery capacity and generation.');
  const distanceKm=num(raw.distanceKm),speedKmH=num(raw.speedKmH),tractionKW=num(raw.tractionKW),auxKW=num(raw.auxKW),reservePct=num(raw.reservePct);
  if([distanceKm,speedKmH,tractionKW,auxKW,reservePct].includes(null)||distanceKm<=0||speedKmH<=0||tractionKW<0||auxKW<0||reservePct<0||reservePct>=100)return fail('Revisa los parámetros de la misión.','Check the mission parameters.');
  const totalDistanceKm=2*distanceKm,driveHours=totalDistanceKm/speedKmH,consumptionKWh=driveHours*(tractionKW+auxKW),generationKWh=driveHours*ctx.generationKW;
  const netKWh=consumptionKWh-generationKWh,usableKWh=ctx.capacityKWh*(1-reservePct/100);
  return {ok:true,totalDistanceKm,driveHours,totalHours:driveHours,totalSols:driveHours/SOL_HOURS,consumptionKWh,generationKWh,netKWh,usableKWh,sufficient:netKWh<=usableKWh,capacityKWh:ctx.capacityKWh,generationKW:ctx.generationKW};
 }
 // Emergencia por tormenta de polvo: esperar con la potencia esencial y regresar a la base. Batería inicial al 100 %.
 function emergency(raw={},options={}){
  const ctx=context(options);if(!ctx)return fail('Revisa la capacidad de batería y la generación del Chariot.','Check the Chariot battery capacity and generation.');
  const stormHours=num(raw.stormHours),essentialKW=num(raw.essentialKW),returnDistanceKm=num(raw.returnDistanceKm),returnSpeedKmH=num(raw.returnSpeedKmH),returnTractionKW=num(raw.returnTractionKW),marginPct=num(raw.marginPct);
  if([stormHours,essentialKW,returnDistanceKm,returnSpeedKmH,returnTractionKW,marginPct].includes(null)||stormHours<0||essentialKW<0||returnDistanceKm<0||returnSpeedKmH<=0||returnTractionKW<0||marginPct<0||marginPct>100)return fail('Revisa los parámetros de emergencia.','Check the emergency parameters.');
  const generatorOn=raw.generatorOn!==false,gen=generatorOn?ctx.generationKW:0;
  // El excedente de generación durante la espera no se acredita como energía adicional de reserva (por eso max(0, …)).
  const waitKWh=Math.max(0,essentialKW-gen)*stormHours,travelHours=returnDistanceKm/returnSpeedKmH,returnKWh=Math.max(0,returnTractionKW+essentialKW-gen)*travelHours;
  const extraKWh=(waitKWh+returnKWh)*marginPct/100,requiredKWh=waitKWh+returnKWh+extraKWh;
  return {ok:true,waitKWh,returnKWh,extraKWh,requiredKWh,travelHours,generatorOn,generationKW:gen,capacityKWh:ctx.capacityKWh,withinCapacity:requiredKWh<=ctx.capacityKWh};
 }
 // ── Cuánto puede esperar el Chariot (no se predice la tormenta: se calcula el límite de espera) ─────────────────
 // La espera máxima es el menor entre el límite de energía (batería inicial al 100 %, mismo modelo y margen que emergency())
 // y el techo de soporte vital (14 soles en la propuesta) menos el viaje de regreso.
 function lifeSupportHours(options){
  const sols=num(options.lifeSupportSols)??DEFAULTS.lifeSupportSols,elapsed=options.elapsedSols==null?0:num(options.elapsedSols);
  return sols>0&&elapsed!==null&&elapsed>=0?Math.max(0,sols-elapsed)*SOL_HOURS:null;
 }
 function endurance(raw={},options={}){
  const base=emergency({...raw,stormHours:0},options);if(!base.ok)return base;
  const ctx=context(options),lifeHours=lifeSupportHours(options);if(lifeHours===null)return fail('Revisa el límite de soporte vital.','Check the life-support limit.');
  const m=num(raw.marginPct)/100,standbyKW=Math.max(0,num(raw.essentialKW)-base.generationKW);
  const returnReserveKWh=base.returnKWh*(1+m),energyReturnOk=returnReserveKWh<=ctx.capacityKWh,lifeReturnOk=base.travelHours<=lifeHours,canReturn=energyReturnOk&&lifeReturnOk;
  // required = (standbyKW·H + returnKWh)·(1+m) ≤ capacidad → H ≤ (capacidad/(1+m) − returnKWh)/standbyKW
  const energyHours=!energyReturnOk?0:standbyKW===0?Infinity:Math.max(0,(ctx.capacityKWh/(1+m)-base.returnKWh)/standbyKW);
  const lifeCeilingHours=Math.max(0,lifeHours-base.travelHours);
  const maxStormHours=Math.min(energyHours,lifeCeilingHours),limitingFactor=!energyReturnOk?'energy-return':!lifeReturnOk?'life-return':energyHours<=lifeCeilingHours?'energy':'life-support';
  return {ok:true,maxStormHours,maxStormSols:maxStormHours/SOL_HOURS,energyHours,lifeCeilingHours,limitingFactor,canReturn,energyReturnOk,lifeReturnOk,returnReserveKWh,standbyKW,travelHours:base.travelHours,capacityKWh:ctx.capacityKWh,remainingLifeSupportSols:lifeHours/SOL_HOURS,lifeSupportSols:num(options.lifeSupportSols)??DEFAULTS.lifeSupportSols,elapsedSols:options.elapsedSols==null?0:num(options.elapsedSols)};
 }
 // Escenarios de duración: valores redondos de PLANIFICACIÓN para comparar, no pronósticos ni estadísticas medidas.
 // Base cualitativa: las tormentas de gran escala duran de semanas a meses (Wang et al., 2015, Icarus; NASA 2018: al menos un par de meses para la global de 2018).
 const STORM_SCENARIOS=Object.freeze([
  Object.freeze({id:'short',sols:3,es:'Corta',en:'Short',basisEs:'Hipótesis de planificación: unos pocos soles.',basisEn:'Planning assumption: a few sols.'}),
  Object.freeze({id:'two-weeks',sols:14,es:'Dos semanas',en:'Two weeks',basisEs:'Hipótesis de planificación; igual al límite de soporte vital de la propuesta.',basisEn:'Planning assumption; equal to the proposal life-support limit.'}),
  Object.freeze({id:'regional',sols:28,es:'Regional grande',en:'Large regional',basisEs:'La literatura describe tormentas regionales grandes de varias semanas.',basisEn:'The literature describes large regional storms lasting several weeks.'}),
  Object.freeze({id:'global',sols:60,es:'Global',en:'Global',basisEs:'Las tormentas globales duran meses; la de 2018 se estimó en al menos un par de meses.',basisEn:'Global storms last months; the 2018 storm was estimated at no less than a couple of months.'})
 ]);
 function scenarios(raw={},options={}){
  const lifeHours=lifeSupportHours(options);if(lifeHours===null)return fail('Revisa el límite de soporte vital.','Check the life-support limit.');
  const rows=[];
  for(const sc of STORM_SCENARIOS){
   const r=emergency({...raw,stormHours:sc.sols*SOL_HOURS},options);if(!r.ok)return r;
   const energyOk=r.withinCapacity,lifeOk=sc.sols*SOL_HOURS+r.travelHours<=lifeHours;
   rows.push({id:sc.id,es:sc.es,en:sc.en,basisEs:sc.basisEs,basisEn:sc.basisEn,sols:sc.sols,stormHours:sc.sols*SOL_HOURS,requiredKWh:r.requiredKWh,energyOk,lifeOk,verdict:energyOk&&lifeOk?'ok':!energyOk&&!lifeOk?'both':!energyOk?'energy':'life-support'});
  }
  return {ok:true,scenarios:rows};
 }
 return Object.freeze({SOL_HOURS,DEFAULTS,STORM_SCENARIOS,mission,emergency,endurance,scenarios});
});
