(() => {
 const $=id=>document.getElementById(id),ui=(es,en)=>window.JEZERO_I18N?.ui(es,en)||es;
 const origin=()=>window.JEZERO_SURVIVAL?.getWeatherOrigin()||null;
 let selectedOffset=0;
 // Horizonte = duración total configurada del viaje del Chariot (con el retraso del escenario si se elige), nunca las horas de EVA.
 function horizon(){
  const base=window.JEZERO_OPERATIONS?.getBaseAssessment?.();
  if(!base||base.hours==null)return {hours:null,source:'none',hasScenario:false,hoursBase:null,hoursScenario:null};
  const hasScenario=base.delayHours>0,mode=hasScenario&&$('forecastHorizonMode')?.value==='scenario'?'scenario':'base';
  return {hours:mode==='scenario'?base.scenarioHours:base.hours,source:mode,hasScenario,hoursBase:base.hours,hoursScenario:base.scenarioHours,life:mode==='scenario'?base.scenarioLifeSupport:base.lifeSupport};
 }
 function render(){
  document.querySelectorAll('[data-weather-es]').forEach(el=>{const copy=window.JEZERO_I18N?.getLanguage()==='en'?el.dataset.weatherEn:el.dataset.weatherEs;if(el.textContent!==copy)el.textContent=copy;});
  const data=window.JEZERO_SURVIVAL?.getDataset();
  const hz=horizon();
  $('forecastHorizonModeLabel').hidden=!hz.hasScenario;
  const forecast=window.JEZERO_SURVIVAL_ENGINE.observationForecast(data,origin(),{horizonHours:hz.hours});
  const site=origin(),available=forecast.status==='projection';
  const chariot=window.JEZERO_OPERATIONS?.getState?.()?.base,fromChariot=chariot?.lat!=null&&chariot?.lon!=null;
  $('forecastRegion').textContent=site?(fromChariot?ui('Posición declarada del Chariot: ','Declared Chariot position: '):ui('Base de la misión (el Chariot no declara posición): ','Mission base (Chariot position not declared): '))+site.lat.toFixed(4)+' / '+site.lon.toFixed(4)+ui(' · selección de datos a menos de 50 km (criterio de la propuesta).',' · data selected within 50 km (proposal criterion).'):ui('Define primero la posición del Chariot o el punto de salida de la misión.','First define the Chariot position or the mission departure point.');
  $('forecastEmpty').hidden=available;$('forecastResults').hidden=!available;$('forecastObservationFields').disabled=!available;
  if(!available){
   const title=$('forecastEmpty').querySelector('h3'),description=$('forecastEmpty').querySelector('p');
   title.textContent=forecast.status==='missing-location'?ui('Falta la ubicación de la base','Base location is missing'):forecast.status==='location-mismatch'?ui('Los históricos corresponden a otra zona','Historical observations belong to another region'):ui('Carga históricos de la zona para entrenar el modelo','Load regional history to train the model');
   description.textContent=forecast.status==='location-mismatch'?ui('No se usa la predicción de otra región. Importa observaciones de esta zona.','A different region’s prediction is not used. Import observations for this region.'):ui('La regresión necesita al menos 12 observaciones recientes que cubran 6 franjas de 3 horas. Sin datos locales suficientes no se genera una predicción.','The regression needs at least 12 recent observations covering six 3-hour periods. No prediction is generated without sufficient regional data.');
   $('forecastChart').replaceChildren();return;
  }
  const {model,days}=forecast,hour=Number($('forecastHour').value);
  if(selectedOffset>=days.length)selectedOffset=0;
  const day=days[selectedOffset],series=day.series,point=series[hour];
  const solHours=window.JEZERO_SURVIVAL_ENGINE.SOL_HOURS;
  $('forecastHorizon').textContent=hz.hours==null?ui('Sin duración del Chariot configurada: se muestra 1 sol. Define la duración total en CHARIOT para ver toda la misión.','No Chariot duration configured: 1 sol shown. Set the total duration in CHARIOT to see the whole mission.'):ui(`Horizonte: ${hz.hours.toFixed(1)} h (${(hz.hours/solHours).toFixed(2)} soles) = ${forecast.horizonSols} sol(es) a explorar${hz.source==='scenario'?', incluido el retraso del escenario':''}. Soles ${days[0].sol}–${days[days.length-1].sol} (índice de sol, no fecha UTC).`,`Horizon: ${hz.hours.toFixed(1)} h (${(hz.hours/solHours).toFixed(2)} sols) = ${forecast.horizonSols} sol(s) to explore${hz.source==='scenario'?', including the scenario delay':''}. Sols ${days[0].sol}–${days[days.length-1].sol} (sol index, not a UTC date).`);
  const alertHost=$('forecastLifeAlert');alertHost.hidden=!(hz.life&&hz.life.exceeded);
  if(!alertHost.hidden)alertHost.textContent=ui(`ALERTA: el horizonte (${hz.life.durationSols.toFixed(2)} soles) supera el límite de soporte vital de 14 soles.`,`ALERT: the horizon (${hz.life.durationSols.toFixed(2)} sols) exceeds the 14-sol life-support limit.`);
  $('forecastMethod').textContent=ui('Extrapolación del patrón diario: cada sol repite la misma curva ajustada a las últimas muestras; no es una predicción independiente por sol. La variación entre soles, las tormentas de polvo y la estacionalidad no se estiman. La banda es el error residual, no un intervalo de confianza calibrado.','Daily-pattern extrapolation: every sol repeats the same curve fitted to the latest samples; it is not an independent forecast per sol. Day-to-day variation, dust storms and seasonality are not estimated. The band is the residual error, not a calibrated confidence interval.');
  const select=$('forecastSolSelect');
  if(!select.options||select.options.length!==days.length||select.dataset.first!==String(days[0].sol)){select.replaceChildren(...days.map(d=>{const o=document.createElement('option');o.value=String(d.offsetSols);o.textContent=ui(`Sol ${d.sol} · día ${d.offsetSols+1} de la misión`,`Sol ${d.sol} · mission day ${d.offsetSols+1}`);return o;}));select.dataset.first=String(days[0].sol);}
  select.value=String(selectedOffset);
  $('forecastDays').replaceChildren(...days.map(d=>{const b=document.createElement('button');b.type='button';b.textContent=`Sol ${d.sol}`;b.setAttribute('aria-pressed',String(d.offsetSols===selectedOffset));if(d.offsetSols>=14)b.dataset.over='true';b.addEventListener('click',()=>{selectedOffset=d.offsetSols;render();});return b;}));
  $('forecastSource').textContent=model.name;
  $('forecastSol').textContent=ui(`Extrapolación para el sol ${day.sol}`,`Extrapolation for sol ${day.sol}`);
  $('forecastTemp').textContent=point.temperatureC.toFixed(1)+' °C';
  $('forecastHourValue').textContent=String(hour).padStart(2,'0')+':00';
  $('forecastBand').textContent=ui(`Error de ajuste mostrado: ±${model.errorC.toFixed(1)} °C. No es un intervalo de confianza calibrado.`,`Displayed fit error: ±${model.errorC.toFixed(1)} °C. Not a calibrated confidence interval.`);
  $('forecastPressure').textContent=model.pressurePa===null?ui('Sin observaciones','No observations'):Math.round(model.pressurePa)+' Pa';
  $('forecastWind').textContent=model.windMps===null?ui('Sin observaciones','No observations'):model.windMps.toFixed(1)+' m/s';
  const warm=series.slice(0,24).reduce((a,b)=>b.temperatureC>a.temperatureC?b:a);
  $('forecastWarm').textContent=String(warm.hour).padStart(2,'0')+':00 · '+warm.temperatureC.toFixed(1)+' °C';
  $('forecastCoverage').textContent=ui(`${model.recordCount} observaciones · regresión supervisada entrenada con las últimas muestras. Fuente declarada; vigencia no verificada.`,`${model.recordCount} observations · supervised regression trained on recent samples. Declared source; freshness not verified.`);
  const lo=Math.min(...series.map(p=>p.lowerC))-5,hi=Math.max(...series.map(p=>p.upperC))+5,x=h=>46+h/24*610,y=t=>20+(hi-t)/(hi-lo)*200;
  let svg='<svg viewBox="0 0 680 260" role="img" aria-label="'+ui(`Temperatura horaria extrapolada para el sol ${day.sol}`,`Hourly extrapolated temperature for sol ${day.sol}`)+'">';
  for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3;svg+=`<line x1="46" y1="${y(v)}" x2="656" y2="${y(v)}" stroke="var(--theme-line)"/><text x="38" y="${y(v)+4}" text-anchor="end" fill="var(--theme-muted)" font-size="12">${v.toFixed(0)}°</text>`;}
  svg+=`<polygon points="${series.map(p=>x(p.hour)+','+y(p.upperC)).join(' ')} ${[...series].reverse().map(p=>x(p.hour)+','+y(p.lowerC)).join(' ')}" fill="var(--theme-accent-2)" opacity=".13"/><polyline points="${series.map(p=>x(p.hour)+','+y(p.temperatureC)).join(' ')}" stroke="var(--theme-accent-2)" stroke-width="3" fill="none"/><line x1="${x(hour)}" y1="20" x2="${x(hour)}" y2="220" stroke="var(--theme-muted)" stroke-dasharray="4 4"/><circle cx="${x(hour)}" cy="${y(point.temperatureC)}" r="5" fill="var(--theme-accent-2)"/>`;
  for(const h of [0,6,12,18,24])svg+=`<text x="${x(h)}" y="245" text-anchor="middle" fill="var(--theme-muted)" font-size="12">${String(h).padStart(2,'0')}:00</text>`;
  $('forecastChart').innerHTML=svg+'</svg>';
  $('forecastHours').replaceChildren();for(const h of [0,6,12,18]){const button=document.createElement('button');button.type='button';button.textContent=String(h).padStart(2,'0')+':00 · '+series[h].temperatureC.toFixed(1)+' °C';button.setAttribute('aria-pressed',String(hour===h));button.addEventListener('click',()=>{$('forecastHour').value=h;render();});$('forecastHours').append(button);}
 }
 $('forecastObservationForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{window.JEZERO_SURVIVAL.addWeatherObservation({sol:$('observationSol').value,localHour:$('observationHour').value,temperatureC:$('observationTemperature').value,pressurePa:$('observationPressure').value||null,windMps:$('observationWind').value||null},origin(),$('observationSource').value);$('forecastError').hidden=true;const sol=$('observationSol').value,t=$('observationTemperature').value,h=$('observationHour').value;event.target.reset();selectedOffset=0;render();const fb=$('forecastFeedback'),d=window.JEZERO_SURVIVAL.getDataset();fb.dataset.state='ok';fb.hidden=false;fb.textContent=ui(`Observación guardada en este navegador (sol ${sol}, ${h} h, ${t} °C). El modelo se reajustó con ${d.records.length} observaciones.`,`Observation saved in this browser (sol ${sol}, ${h} h, ${t} °C). The model was refitted with ${d.records.length} observations.`);}
  catch(error){$('forecastFeedback').hidden=true;const [es,en]=error.message.split(' / '),host=$('forecastError');host.dataset.weatherEs=es;host.dataset.weatherEn=en||window.JEZERO_I18N.translateText(es,'en');host.textContent=ui(host.dataset.weatherEs,host.dataset.weatherEn);host.hidden=false;}
 });
 document.addEventListener('jezero:missionedited',render);
 $('forecastHour').addEventListener('input',render);
 $('forecastSolSelect').addEventListener('change',()=>{selectedOffset=Number($('forecastSolSelect').value)||0;render();});
 $('forecastHorizonMode').addEventListener('change',()=>{selectedOffset=0;render();});
 document.querySelectorAll('[data-forecast-import]').forEach(b=>b.addEventListener('click',()=>{window.JEZERO_MODULES.activate('survival');const card=$('guideDataCard');card.scrollIntoView({behavior:'smooth',block:'start'});card.setAttribute('tabindex','-1');card.focus({preventScroll:true});}));
 document.querySelectorAll('[data-close-interface]').forEach(b=>b.addEventListener('click',()=>window.JEZERO_MODULES.close()));
 $('openWeatherForecast')?.addEventListener('click',()=>window.JEZERO_MODULES.activate('weather'));
 ['jezero:modulechange','jezero:weatherchange','jezero:languagechange','jezero:themechange','jezero:supportchange'].forEach(name=>window.addEventListener(name,render));render();
})();
