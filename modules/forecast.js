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

 // ── Condiciones ambientales observadas: polvo, radiación, viento, presión y humedad ─────────────────────────
 const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
 const DUST_LABEL={clear:['Bajo','Low'],elevated:['Elevado','Elevated'],storm:['Compatible con tormenta','Storm-level'],severe:['Tormenta severa','Severe storm']};
 function alertCopy(a,c){
  const v=a.value;
  switch(a.code){
   case 'dust':
    if(a.level==='unknown')return ui('Sin observaciones de polvo (opacidad τ): el riesgo de tormenta no se evalúa. La ausencia de dato no significa cielo despejado.','No dust observations (optical depth τ): storm risk is not assessed. Missing data does not mean clear sky.');
    return ui(`Polvo: τ ${fmt(v,2)} (mediana de los últimos 3 sols) · nivel ${DUST_LABEL[c.dust.level][0].toLowerCase()}.`,`Dust: τ ${fmt(v,2)} (median of the last 3 sols) · level ${DUST_LABEL[c.dust.level][1].toLowerCase()}.`);
   case 'dust-peak':return ui(`Pico de polvo reciente: τ ${fmt(v,2)}, por encima de la mediana.`,`Recent dust peak: τ ${fmt(v,2)}, above the median.`);
   case 'dust-rising':return ui(`El polvo sube ${fmt(v,2)} τ por sol en las observaciones recientes. Vigila una posible tormenta; esto no la predice.`,`Dust is rising ${fmt(v,2)} τ per sol in recent observations. Watch for a possible storm; this does not predict one.`);
   case 'radiation':
    if(a.level==='unknown')return ui('Sin observaciones de radiación (µSv/h): la exposición no se evalúa. La ausencia de dato no significa dosis baja.','No radiation observations (µSv/h): exposure is not assessed. Missing data does not mean a low dose.');
    if(a.level==='alert')return ui(`Pico de radiación: ${fmt(c.radiation.max,1)} µSv/h, al menos ${c.thresholds.radiationSpikeFactor}× la mediana histórica (${fmt(c.radiation.baselineUSvH,1)} µSv/h). Posible evento de partículas; confirma con instrumentos antes de salir.`,`Radiation spike: ${fmt(c.radiation.max,1)} µSv/h, at least ${c.thresholds.radiationSpikeFactor}× the historical median (${fmt(c.radiation.baselineUSvH,1)} µSv/h). Possible particle event; confirm with instruments before going out.`);
    return ui(`Radiación ambiental: ${fmt(v,1)} µSv/h (mediana reciente), sin picos respecto al historial.`,`Ambient radiation: ${fmt(v,1)} µSv/h (recent median), no spike relative to the history.`);
   case 'wind':
    if(a.level==='unknown')return ui('Sin observaciones de viento: no se evalúa.','No wind observations: not assessed.');
    return ui(`Viento máximo reciente: ${fmt(v,1)} m/s${a.level==='info'?'.':' (umbral orientativo de levantamiento de polvo; la atmósfera es tan tenue que la fuerza sobre el traje es baja).'}`,`Recent peak wind: ${fmt(v,1)} m/s${a.level==='info'?'.':' (indicative dust-lifting threshold; the atmosphere is so thin that force on the suit is low).'}`);
   case 'pressure':return ui('Sin observaciones de presión.','No pressure observations.');
  }
  return '';
 }
 function spark(daily,key,title,unit,digits,axisLabel='Sol'){
  const pts=daily.filter(d=>Number.isFinite(d[key]));
  const box=document.createElement('div');box.className='forecastTrend';
  const b=document.createElement('b');b.textContent=title;box.append(b);
  if(pts.length<2){const small=document.createElement('small');small.textContent=pts.length?ui('Un solo sol con datos; sin tendencia.','Only one sol with data; no trend.'):ui('Sin observaciones.','No observations.');box.append(small);return box;}
  const lo=Math.min(...pts.map(p=>p[key])),hi=Math.max(...pts.map(p=>p[key])),span=hi-lo||1,s0=pts[0].sol,s1=pts[pts.length-1].sol||s0+1;
  const x=sol=>6+(sol-s0)/Math.max(1,s1-s0)*288,y=v=>6+(hi-v)/span*44;
  const holder=document.createElement('div');holder.innerHTML=`<svg viewBox="0 0 300 56" role="img" aria-label="${title}: ${fmt(lo,digits)}–${fmt(hi,digits)} ${unit}, ${axisLabel} ${s0}–${s1}"><polyline points="${pts.map(p=>x(p.sol).toFixed(1)+','+y(p[key]).toFixed(1)).join(' ')}" fill="none" stroke="var(--theme-accent-2)" stroke-width="2"/>${pts.map(p=>`<circle cx="${x(p.sol).toFixed(1)}" cy="${y(p[key]).toFixed(1)}" r="2.5" fill="var(--theme-accent-2)"/>`).join('')}</svg>`;box.append(holder);
  const small=document.createElement('small');small.textContent=`${axisLabel} ${s0}–${s1} · ${fmt(lo,digits)}–${fmt(hi,digits)} ${unit}`;box.append(small);return box;
 }
 function renderConditions(c,hz,projection,point,series){
  if(!c)return;
  $('forecastConditionsBasis').textContent=ui(`Resumen de las observaciones importadas de los últimos 3 sols (${c.sampleCount} muestras). No son predicciones. Umbrales de alerta orientativos: no son límites operativos ni médicos.`,`Summary of imported observations from the last 3 sols (${c.sampleCount} samples). Not predictions. Alert thresholds are indicative: not operational or medical limits.`);
  const order={alert:0,warning:1,unknown:2,info:3};
  $('forecastAlerts').replaceChildren(...[...c.alerts].sort((a,b)=>order[a.level]-order[b.level]).map(a=>{const li=document.createElement('li');li.dataset.level=a.level;const tag=document.createElement('b');tag.textContent={alert:ui('ALERTA','ALERT'),warning:ui('PRECAUCIÓN','CAUTION'),unknown:ui('SIN DATOS','NO DATA'),info:ui('NORMAL','NORMAL')}[a.level];const msg=document.createElement('span');msg.textContent=alertCopy(a,c);li.append(tag,msg);return li;}));
  const facts=[];
  const add=(es,en,value)=>facts.push([ui(es,en),value]);
  add('Polvo · opacidad τ','Dust · optical depth τ',c.dust?`${fmt(c.dust.median,2)} · ${ui(...DUST_LABEL[c.dust.level])}${c.dust.slopePerSol!==null?` · ${c.dust.slopePerSol>=0?'+':''}${fmt(c.dust.slopePerSol,2)} τ/sol`:''}`:ui('Sin observaciones','No observations'));
  add('Polvo · pico reciente','Dust · recent peak',c.dust?fmt(c.dust.max,2)+' τ':ui('Sin observaciones','No observations'));
  add('Radiación · mediana / máxima','Radiation · median / max',c.radiation?`${fmt(c.radiation.median,1)} / ${fmt(c.radiation.max,1)} µSv/h`:ui('Sin observaciones','No observations'));
  add(hz.hours==null?'Exposición ambiental en 1 sol':`Exposición ambiental en ${hz.hours.toFixed(1)} h`,hz.hours==null?'Ambient exposure in 1 sol':`Ambient exposure in ${hz.hours.toFixed(1)} h`,c.radiation?`${fmt(c.radiation.exposureMSv,2)} mSv · ${ui('tasa mediana constante, sin blindaje','constant median rate, unshielded')}`:ui('Sin observaciones','No observations'));
  add('Viento máximo reciente','Recent peak wind',c.wind?fmt(c.wind.max,1)+' m/s':ui('Sin observaciones','No observations'));
  add('Humedad relativa · mediana','Relative humidity · median',c.humidity?fmt(c.humidity.median,0)+' %':ui('Sin observaciones','No observations'));
  add('Temperatura observada · mín / máx','Observed temperature · min / max',c.temperature?`${fmt(c.temperature.min,1)} / ${fmt(c.temperature.max,1)} °C`:'—');
  add('Polvo proyectado a la hora seleccionada','Projected dust at selected hour',Number.isFinite(point.opticalDepth)?fmt(point.opticalDepth,2)+' τ':ui('Se necesitan 12 muestras de polvo en 6 franjas horarias','Needs 12 dust samples across 6 time bins'));
  add('Radiación proyectada a la hora seleccionada','Projected radiation at selected hour',Number.isFinite(point.doseRateUSvH)?fmt(point.doseRateUSvH,2)+' µSv/h':ui('Se necesitan 12 muestras de radiación en 6 franjas horarias','Needs 12 radiation samples across 6 time bins'));
  add('Exposición ambiental proyectada para el horizonte','Projected ambient exposure over the horizon',projection.exposureMSv===null?ui('Sin modelo de radiación suficiente','Insufficient radiation model'):fmt(projection.exposureMSv,3)+' mSv · '+ui('patrón integrado, sin blindaje','integrated pattern, unshielded'));
  $('forecastConditionFacts').replaceChildren(...facts.map(([label,value])=>{const a=document.createElement('article'),b=document.createElement('b'),st=document.createElement('strong');b.textContent=label;st.textContent=value;a.append(b,st);return a;}));
  $('forecastTrends').replaceChildren(spark(c.daily,'opticalDepth',ui('Polvo τ por sol (mediana)','Dust τ per sol (median)'),'τ',2),spark(c.daily,'doseRateUSvH',ui('Radiación por sol (mediana)','Radiation per sol (median)'),'µSv/h',1),spark(c.daily,'pressurePa',ui('Presión por sol (mediana)','Pressure per sol (median)'),'Pa',0),spark(c.daily,'windMps',ui('Viento por sol (mediana)','Wind per sol (median)'),'m/s',1));
  const hourly=series.map(p=>({...p,sol:p.hour}));$('forecastTrends').append(spark(hourly,'opticalDepth',ui('Polvo proyectado por hora · sol seleccionado','Projected hourly dust · selected sol'),'τ',2,ui('Hora','Hour')),spark(hourly,'doseRateUSvH',ui('Radiación proyectada por hora · sol seleccionado','Projected hourly radiation · selected sol'),'µSv/h',2,ui('Hora','Hour')));
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
  $('forecastHorizon').textContent=hz.hours==null?ui('Sin duración del Chariot configurada: se muestra 1 sol. Define la duración total en CHARIOT para ver toda la misión.','No Chariot duration configured: 1 sol shown. Set the total duration in CHARIOT to see the whole mission.'):ui(`Horizonte: ${hz.hours.toFixed(1)} h (${(hz.hours/solHours).toFixed(2)} soles) = ${forecast.horizonSols} sol(es) a explorar${hz.source==='scenario'?', incluido el retraso del escenario':''}. Días marcianos 1–${days.length} de la misión.`,`Horizon: ${hz.hours.toFixed(1)} h (${(hz.hours/solHours).toFixed(2)} sols) = ${forecast.horizonSols} sol(s) to explore${hz.source==='scenario'?', including the scenario delay':''}. Martian mission days 1–${days.length}.`);
  const alertHost=$('forecastLifeAlert');alertHost.hidden=!(hz.life&&hz.life.exceeded);
  if(!alertHost.hidden)alertHost.textContent=ui(`ALERTA: el horizonte (${hz.life.durationSols.toFixed(2)} soles) supera el límite de soporte vital de 14 soles.`,`ALERT: the horizon (${hz.life.durationSols.toFixed(2)} sols) exceeds the 14-sol life-support limit.`);
  $('forecastMethod').textContent=ui('Regresión supervisada: ajustes diarios independientes para temperatura, polvo (τ) y radiación (µSv/h). Cada variable necesita al menos 12 muestras recientes en 6 franjas horarias. Cada sol repite el patrón aprendido; no se predicen tormentas, eventos solares ni variación entre soles. Polvo y radiación no se usan para inventar una relación causal con la temperatura. Los errores de ajuste no son intervalos de confianza calibrados.','Supervised regression: independent daily fits for temperature, dust (τ) and radiation (µSv/h). Each variable needs at least 12 recent samples across 6 time bins. Every sol repeats the learned pattern; storms, solar events and day-to-day changes are not predicted. Dust and radiation do not impose an invented causal relationship on temperature. Fit errors are not calibrated confidence intervals.');
  const select=$('forecastSolSelect');
  if(!select.options||select.options.length!==days.length||select.dataset.first!==String(days[0].sol)||select.dataset.language!==(window.JEZERO_I18N?.getLanguage?.()||'es')){select.replaceChildren(...days.map(d=>{const o=document.createElement('option');o.value=String(d.offsetSols);o.textContent=ui(`Día ${d.offsetSols+1} de la misión`,`Mission day ${d.offsetSols+1}`);return o;}));select.dataset.first=String(days[0].sol);select.dataset.language=window.JEZERO_I18N?.getLanguage?.()||'es';}
  select.value=String(selectedOffset);
  $('forecastDays').replaceChildren(...days.map(d=>{const b=document.createElement('button');b.type='button';b.textContent=ui(`Día ${d.offsetSols+1} de la misión`,`Mission day ${d.offsetSols+1}`);b.title=ui(`Índice de sol del conjunto de datos: ${d.sol}`,`Dataset sol index: ${d.sol}`);b.setAttribute('aria-pressed',String(d.offsetSols===selectedOffset));if(d.offsetSols>=14)b.dataset.over='true';b.addEventListener('click',()=>{selectedOffset=d.offsetSols;render();});return b;}));
  $('forecastSource').textContent=model.name;
  $('forecastSol').textContent=ui(`Día ${selectedOffset+1} de la misión · proyección`,`Mission day ${selectedOffset+1} · projection`);
  $('forecastTemp').textContent=point.temperatureC.toFixed(1)+' °C';
  $('forecastHourValue').textContent=String(hour).padStart(2,'0')+':00';
  $('forecastBand').textContent=ui(`Error de ajuste mostrado: ±${model.errorC.toFixed(1)} °C. No es un intervalo de confianza calibrado.`,`Displayed fit error: ±${model.errorC.toFixed(1)} °C. Not a calibrated confidence interval.`);
  $('forecastPressure').textContent=model.pressurePa===null?ui('Sin observaciones','No observations'):Math.round(model.pressurePa)+' Pa';
  $('forecastWind').textContent=model.windMps===null?ui('Sin observaciones','No observations'):model.windMps.toFixed(1)+' m/s';
  renderConditions(forecast.conditions,hz,forecast.environment,point,series);
  const warm=series.slice(0,24).reduce((a,b)=>b.temperatureC>a.temperatureC?b:a);
  $('forecastWarm').textContent=String(warm.hour).padStart(2,'0')+':00 · '+warm.temperatureC.toFixed(1)+' °C';
  $('forecastCoverage').textContent=ui(`${model.recordCount} observaciones · regresión supervisada entrenada con las últimas muestras. Fuente declarada; vigencia no verificada. Último sol observado: ${model.baseSol-1}; índices proyectados: ${days[0].sol}–${days.at(-1).sol} (no son fechas).`,`${model.recordCount} observations · supervised regression trained on recent samples. Declared source; freshness not verified. Last observed sol: ${model.baseSol-1}; projected indices: ${days[0].sol}–${days.at(-1).sol} (not dates).`);
  const lo=Math.min(...series.map(p=>p.lowerC))-5,hi=Math.max(...series.map(p=>p.upperC))+5,x=h=>46+h/24*610,y=t=>20+(hi-t)/(hi-lo)*200;
  let svg='<svg viewBox="0 0 680 260" role="img" aria-label="'+ui(`Temperatura horaria extrapolada · día marciano ${selectedOffset+1} de la misión`,`Hourly extrapolated temperature · Martian mission day ${selectedOffset+1}`)+'">';
  for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3;svg+=`<line x1="46" y1="${y(v)}" x2="656" y2="${y(v)}" stroke="var(--theme-line)"/><text x="38" y="${y(v)+4}" text-anchor="end" fill="var(--theme-muted)" font-size="12">${v.toFixed(0)}°</text>`;}
  svg+=`<polygon points="${series.map(p=>x(p.hour)+','+y(p.upperC)).join(' ')} ${[...series].reverse().map(p=>x(p.hour)+','+y(p.lowerC)).join(' ')}" fill="var(--theme-accent-2)" opacity=".13"/><polyline points="${series.map(p=>x(p.hour)+','+y(p.temperatureC)).join(' ')}" stroke="var(--theme-accent-2)" stroke-width="3" fill="none"/><line x1="${x(hour)}" y1="20" x2="${x(hour)}" y2="220" stroke="var(--theme-muted)" stroke-dasharray="4 4"/><circle cx="${x(hour)}" cy="${y(point.temperatureC)}" r="5" fill="var(--theme-accent-2)"/>`;
  for(const h of [0,6,12,18,24])svg+=`<text x="${x(h)}" y="245" text-anchor="middle" fill="var(--theme-muted)" font-size="12">${String(h).padStart(2,'0')}:00</text>`;
  $('forecastChart').innerHTML=svg+'</svg>';
  $('forecastHours').replaceChildren();for(const h of [0,6,12,18]){const button=document.createElement('button');button.type='button';button.textContent=String(h).padStart(2,'0')+':00 · '+series[h].temperatureC.toFixed(1)+' °C';button.setAttribute('aria-pressed',String(hour===h));button.addEventListener('click',()=>{$('forecastHour').value=h;render();});$('forecastHours').append(button);}
 }
 $('forecastObservationForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{window.JEZERO_SURVIVAL.addWeatherObservation({sol:$('observationSol').value,localHour:$('observationHour').value,temperatureC:$('observationTemperature').value,pressurePa:$('observationPressure').value||null,windMps:$('observationWind').value||null,opticalDepth:$('observationDust')?.value||null,doseRateUSvH:$('observationRadiation')?.value||null,humidityPct:$('observationHumidity')?.value||null},origin(),$('observationSource').value);$('forecastError').hidden=true;const sol=$('observationSol').value,t=$('observationTemperature').value,h=$('observationHour').value;event.target.reset();selectedOffset=0;render();const fb=$('forecastFeedback'),d=window.JEZERO_SURVIVAL.getDataset();fb.dataset.state='ok';fb.hidden=false;fb.textContent=ui(`Observación guardada en este navegador (sol ${sol}, ${h} h, ${t} °C). El modelo se reajustó con ${d.records.length} observaciones.`,`Observation saved in this browser (sol ${sol}, ${h} h, ${t} °C). The model was refitted with ${d.records.length} observations.`);}
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
