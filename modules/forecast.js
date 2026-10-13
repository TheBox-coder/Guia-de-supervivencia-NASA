(() => {
 const $=id=>document.getElementById(id),ui=(es,en)=>window.JEZERO_I18N?.ui(es,en)||es;
 function render(){
  document.querySelectorAll('[data-weather-es]').forEach(el=>{const copy=window.JEZERO_I18N?.getLanguage()==='en'?el.dataset.weatherEn:el.dataset.weatherEs;if(el.textContent!==copy)el.textContent=copy;});
  const data=window.JEZERO_SURVIVAL?.getDataset();
  const forecast=window.JEZERO_SURVIVAL_ENGINE.observationForecast(data);
  $('forecastEmpty').hidden=Boolean(data);$('forecastResults').hidden=!data;
  if(!data)return;
  const {model,series}=forecast,hour=Number($('forecastHour').value),point=series[hour];
  $('forecastSource').textContent=model.name;
  $('forecastSol').textContent=ui(`Proyección para el sol ${model.baseSol}`,`Projection for sol ${model.baseSol}`);
  $('forecastTemp').textContent=point.temperatureC.toFixed(1)+' °C';
  $('forecastHourValue').textContent=String(hour).padStart(2,'0')+':00';
  $('forecastBand').textContent=ui(`Error de ajuste mostrado: ±${model.errorC.toFixed(1)} °C. No es un intervalo de confianza calibrado.`,`Displayed fit error: ±${model.errorC.toFixed(1)} °C. Not a calibrated confidence interval.`);
  $('forecastPressure').textContent=model.pressurePa===null?ui('Sin observaciones','No observations'):Math.round(model.pressurePa)+' Pa';
  $('forecastWind').textContent=model.windMps===null?ui('Sin observaciones','No observations'):model.windMps.toFixed(1)+' m/s';
  const warm=series.slice(0,24).reduce((a,b)=>b.temperatureC>a.temperatureC?b:a);
  $('forecastWarm').textContent=String(warm.hour).padStart(2,'0')+':00 · '+warm.temperatureC.toFixed(1)+' °C';
  $('forecastCoverage').textContent=ui(`${model.recordCount} observaciones · patrón de temperatura de las últimas muestras. Fuente declarada; vigencia no verificada.`,`${model.recordCount} observations · temperature pattern fitted to recent samples. Declared source; freshness not verified.`);
  const lo=Math.min(...series.map(p=>p.lowerC))-5,hi=Math.max(...series.map(p=>p.upperC))+5,x=h=>46+h/24*610,y=t=>20+(hi-t)/(hi-lo)*200;
  let svg='<svg viewBox="0 0 680 260" role="img" aria-label="'+ui('Predicción horaria de temperatura para el próximo sol','Hourly temperature projection for the next sol')+'">';
  for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3;svg+=`<line x1="46" y1="${y(v)}" x2="656" y2="${y(v)}" stroke="var(--theme-line)"/><text x="38" y="${y(v)+4}" text-anchor="end" fill="var(--theme-muted)" font-size="12">${v.toFixed(0)}°</text>`;}
  svg+=`<polygon points="${series.map(p=>x(p.hour)+','+y(p.upperC)).join(' ')} ${[...series].reverse().map(p=>x(p.hour)+','+y(p.lowerC)).join(' ')}" fill="var(--theme-accent-2)" opacity=".13"/><polyline points="${series.map(p=>x(p.hour)+','+y(p.temperatureC)).join(' ')}" stroke="var(--theme-accent-2)" stroke-width="3" fill="none"/><line x1="${x(hour)}" y1="20" x2="${x(hour)}" y2="220" stroke="var(--theme-muted)" stroke-dasharray="4 4"/><circle cx="${x(hour)}" cy="${y(point.temperatureC)}" r="5" fill="var(--theme-accent-2)"/>`;
  for(const h of [0,6,12,18,24])svg+=`<text x="${x(h)}" y="245" text-anchor="middle" fill="var(--theme-muted)" font-size="12">${String(h).padStart(2,'0')}:00</text>`;
  $('forecastChart').innerHTML=svg+'</svg>';
  $('forecastHours').replaceChildren();for(const h of [0,6,12,18]){const button=document.createElement('button');button.type='button';button.textContent=String(h).padStart(2,'0')+':00 · '+series[h].temperatureC.toFixed(1)+' °C';button.setAttribute('aria-pressed',String(hour===h));button.addEventListener('click',()=>{$('forecastHour').value=h;render();});$('forecastHours').append(button);}
 }
 $('forecastHour').addEventListener('input',render);
 document.querySelectorAll('[data-forecast-import]').forEach(b=>b.addEventListener('click',()=>{window.JEZERO_MODULES.activate('survival');const card=$('guideDataCard');card.scrollIntoView({behavior:'smooth',block:'start'});card.setAttribute('tabindex','-1');card.focus({preventScroll:true});}));
 document.querySelectorAll('[data-close-interface]').forEach(b=>b.addEventListener('click',()=>window.JEZERO_MODULES.close()));
 $('openWeatherForecast')?.addEventListener('click',()=>window.JEZERO_MODULES.activate('weather'));
 ['jezero:modulechange','jezero:weatherchange','jezero:languagechange','jezero:themechange'].forEach(name=>window.addEventListener(name,render));render();
})();
