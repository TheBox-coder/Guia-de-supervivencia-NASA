/* Calculadora de misión y emergencia del Chariot. Modelo simplificado y determinista: no certifica una misión real. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.JEZERO_CHARIOT_CALC=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SOL_HOURS=24.6597;
 // Valores de la propuesta del equipo (infografía del Chariot): batería de 42 kWh y generador continuo de 1,2 kW.
 const DEFAULTS=Object.freeze({capacityKWh:42,generationKW:1.2});
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
 return Object.freeze({SOL_HOURS,DEFAULTS,mission,emergency});
});
