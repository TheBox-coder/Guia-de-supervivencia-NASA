(() => {
  const engine=window.JEZERO_SURVIVAL_ENGINE,$=id=>document.getElementById(id),KEY='jezero-survival-v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const set=(id,value)=>{if($(id)&&$(id).textContent!==String(value))$(id).textContent=value;};
  const hours=value=>Number.isFinite(value)?`${Math.floor(Math.round(Math.abs(value)*60)/60)} h ${String(Math.round(Math.abs(value)*60)%60).padStart(2,'0')} min`:'—';
  const fields={crew:'survivalCrew',oxygenKg:'survivalOxygenCapacity',oxygenRateKgH:'survivalOxygenRate',batteryKWh:'survivalBatteryCapacity',powerKW:'survivalPower',reservePct:'survivalReserve',startHour:'survivalStartHour'};
  let settings={...engine.DEFAULTS},dataset=null,snapshot=null,comparison=null;
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)settings=engine.config(saved);}catch{}
  for(const [key,id] of Object.entries(fields))$(id).value=settings[key];$('survivalDust').value=settings.dustIndex*100;$('survivalSurface').value=settings.surface;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
  function chart(series,key,{band=false,percent=false,start=null,duration=0,overlays=[]}={}){
    const W=600,H=205,L=46,R=15,T=16,B=30,values=series.map(p=>p[key]);
    const lo=percent?Math.min(0,...values,...overlays.flatMap(o=>series.map(p=>p[o.key]))):Math.min(-110,...series.map(p=>p.lowerC)),hi=percent?100:Math.max(10,...series.map(p=>p.upperC)),span=Math.max(1,hi-lo),x=i=>L+i/(series.length-1)*(W-L-R),y=v=>T+(hi-v)/span*(H-T-B);
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${band?'Temperatura modelada por hora local':'Reserva de recursos durante el escenario'}">`;
    if(start!==null){
      const end=start+duration,ranges=end<=24?[[start,end]]:[[start,24],[0,Math.min(24,end-24)]];
      for(const [from,to] of ranges)svg+=`<rect x="${x(from)}" y="${T}" width="${Math.max(1,x(to)-x(from))}" height="${H-T-B}" fill="var(--theme-accent-2)" opacity=".06"/>`;
    }
    for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3,yy=y(v);svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="var(--theme-line)"/><text x="${L-7}" y="${yy+4}" text-anchor="end" fill="var(--theme-muted)" font-size="11">${Math.round(v)}${percent?'%':'°'}</text>`;}
    if(band){const upper=series.map((p,i)=>`${x(i)},${y(p.upperC)}`).join(' '),lower=series.map((p,i)=>`${x(i)},${y(p.lowerC)}`).reverse().join(' ');svg+=`<polygon points="${upper} ${lower}" fill="var(--theme-accent-2)" opacity=".12"/>`;}
    svg+=`<polyline points="${series.map((p,i)=>`${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--theme-accent-2)" stroke-width="2.5"/>`;
    for(const overlay of overlays)svg+=`<polyline points="${series.map((p,i)=>`${x(i).toFixed(1)},${y(p[overlay.key]).toFixed(1)}`).join(' ')}" fill="none" stroke="${overlay.color}" stroke-width="2" stroke-dasharray="${overlay.dash||'none'}"/>`;
    for(const i of [0,6,12,18,24])svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="var(--theme-muted)" font-size="11">${percent?Math.round(i/24*100)+'% EVA':String(i).padStart(2,'0')+':00'}</text>`;
    return svg+'</svg>';
  }
  function mission(){return window.JEZERO_UI_ACTIONS?.selectedMission?.()||null;}
  function error(message=''){const host=$('survivalError');host.textContent=message;host.hidden=!message;}
  function render(){
    try{
      snapshot=engine.evaluate(mission(),settings,dataset);comparison=engine.compare(window.JEZERO_UI_ACTIONS?.allMissions?.(),settings,dataset);
      const env=snapshot.environment,model=env.model,m=mission(),has=Boolean(snapshot.oxygen);
      $('survivalDecision').dataset.status=snapshot.status;
      set('survivalStatus',snapshot.label);set('survivalReason',has?(snapshot.alerts.find(a=>a.level==='critical')?.text||'Reservas conservadas bajo tus supuestos. Radiación, equipo real y comunicaciones siguen sin verificarse.'):'Carga la demo para descubrir cómo cambia tu ventana de EVA cuando cambian las condiciones.');
      set('survivalTime',has?hours(m.availableHours):'—');set('survivalMargin',has?(snapshot.timeMarginHours<0?'−':'')+hours(snapshot.timeMarginHours):'—');
      $('survivalLive').hidden=!window.JEZERO_DEMO?.enabled;
      set('survivalDataBadge',window.JEZERO_DEMO?.enabled?'DEMO SINTÉTICA':'ESCENARIO');
      set('terrainSourceBadge',!m?'TERRENO: SIN RUTA':window.JEZERO_DEMO?.enabled?'TERRENO: DEM SINTÉTICO':'TERRENO: DEM MDEM200M');
      set('weatherSourceBadge',dataset?'CLIMA: ARCHIVO IMPORTADO':'CLIMA: REFERENCIA HISTÓRICA');
      set('weatherModelBadge',dataset?'PATRÓN AJUSTADO':'MODELO ILUSTRATIVO');
      const temps=has?[snapshot.temperature.minC,snapshot.temperature.maxC]:env.series.map(p=>p.temperatureC);
      set('weatherTemperature',`${Math.min(...temps).toFixed(0)} / ${Math.max(...temps).toFixed(0)} °C`);
      set('weatherPressure',model.pressurePa===null?'Sin datos':`${Math.round(model.pressurePa)} Pa`);set('weatherWind',model.windMps===null?'Sin datos':`${model.windMps.toFixed(1)} m/s`);
      set('weatherModelNote',model.note);set('survivalDustValue',`${Math.round(env.dustIndex*100)}/100 · supuesto`);
      $('weatherChart').innerHTML=chart(env.series,'temperatureC',{band:true,start:has?settings.startHour:null,duration:has?snapshot.durationHours*24/engine.SOL_HOURS:0});
      set('survivalDatasetStatus',dataset?`${model.name} · ${model.recordCount} observaciones · próximo sol ${model.baseSol}. Temperatura: ${model.fieldCoverage.temperature}; presión: ${model.fieldCoverage.pressure}; viento: ${model.fieldCoverage.wind} muestras. ${model.unusedFields.length?'Campos no utilizados: '+model.unusedFields.join(', ')+'. ':''}Procedencia declarada; no verificada automáticamente.`:'Sin observaciones importadas. Referencia térmica: 3–4 abril 2021; presión de referencia: febrero 2021. No son condiciones actuales.');
      for(const [name,unit,id] of [['oxygen','kg','Oxygen'],['battery','kWh','Battery']]){
        const resource=snapshot[name],capacity=resource?.[name==='oxygen'?'capacityKg':'capacityKWh'],remaining=resource?.[name==='oxygen'?'remainingKg':'remainingKWh'],reserve=resource?.[name==='oxygen'?'reserveKg':'reserveKWh'];
        set('survival'+id,has?`${remaining<0?'Déficit ':''}${Math.abs(remaining).toFixed(2)} ${unit}`:'—');
        const bar=$('survival'+id+'Bar');bar.style.width=has?`${Math.max(0,Math.min(100,remaining/capacity*100))}%`:'0%';bar.classList.toggle('is-low',has&&remaining<reserve);
        $('survival'+id+'Reserve').style.left=settings.reservePct+'%';
        set('survival'+id+'Note',has?`Reserva exigida: ${reserve.toFixed(2)} ${unit} · capacidad efectiva: ${capacity.toFixed(2)} ${unit}.`:'Presupuesto hipotético; no especificación de un traje real.');
      }
      const t=snapshot.terrain;set('soilSlope',t.slopeDeg===null?'—':`${t.slopeDeg.toFixed(1)}°`);set('soilRoughness',t.roughnessDeg===null?'—':`${t.roughnessDeg.toFixed(1)}°`);set('soilQuality',t.sampleQuality===null?'—':`${Math.round(t.sampleQuality)}/100`);set('soilSpacing',t.spacingM===null?'—':`${Math.round(t.spacingM)} m`);set('soilClassification',t.classification);
      $('survivalAlerts').innerHTML=snapshot.alerts.map(a=>`<div class="survivalAlert" data-level="${a.level}"><span>${({critical:'REPLANTEAR',warning:'REVISAR',unknown:'DATO AUSENTE',info:'EMPEZAR'})[a.level]}</span>${esc(a.text)}</div>`).join('');
      $('survivalComparison').innerHTML=comparison.rows.map(r=>`<div class="survivalCompareItem ${r.mode===comparison.recommendedMode?'is-recommended':''}"><b>${esc(({distance:'Más directa',balanced:'Equilibrada',risk:'Menor exposición'})[r.mode])}</b><strong>${hours(r.durationHours)}</strong><small>${r.status==='critical'?'Excede una reserva':'Conserva reservas modeladas'}${r.mode===comparison.recommendedMode?' · mayor margen temporal':''}</small><button data-use-survival-mode="${r.mode}" type="button">Ver esta ruta ↗</button></div>`).join('');
      $('survivalComparison').querySelectorAll('[data-use-survival-mode]').forEach(b=>b.addEventListener('click',()=>window.JEZERO_UI_ACTIONS?.selectMode?.(b.dataset.useSurvivalMode)));
      $('survivalAssumptionsText').innerHTML=has?'<ul>'+snapshot.assumptions.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul>':'';
      $('resourceChart').innerHTML=has?chart(snapshot.timeline.map(p=>({...p,remainingPct:p.batteryKWh/snapshot.battery.capacityKWh*100,oxygenPct:p.oxygenKg/snapshot.oxygen.capacityKg*100,windowPct:p.remainingWindowHours/m.availableHours*100})),'remainingPct',{percent:true,overlays:[{key:'oxygenPct',color:'var(--theme-success)'},{key:'windowPct',color:'var(--theme-warning)',dash:'5 3'}]}):'<div class="chartEmpty">La autonomía aparece después de calcular una misión.</div>';
      document.querySelectorAll('[data-survival-scenario]').forEach(b=>{b.classList.toggle('is-active',b.dataset.survivalScenario===settings.scenario);b.setAttribute('aria-pressed',String(b.dataset.survivalScenario===settings.scenario));});
      updateProgress();
    }catch(e){error(e.message);}
  }
  function updateProgress(){
    const p=snapshot?.timeline?.[Number($('survivalProgress').value)];
    set('survivalTimelineTime',p?hours(p.elapsedHours):'—');set('progressOxygen',p?`O₂ ${p.oxygenKg.toFixed(2)} kg`:'O₂ —');set('progressBattery',p?`Batería ${p.batteryKWh.toFixed(2)} kWh`:'Batería —');set('progressWindow',p?`${p.remainingWindowHours<0?'Exceso':'Ventana'} ${hours(p.remainingWindowHours)}`:'Ventana —');
    window.JEZERO_UI_ACTIONS?.previewProgress?.(p?.fraction??0);
  }
  function change(){
    try{const raw={...settings};for(const [key,id] of Object.entries(fields))raw[key]=$(id).value;raw.dustIndex=Number($('survivalDust').value)/100;raw.surface=$('survivalSurface').value;settings=engine.config(raw);error();save();render();}
    catch(e){error(e.message);}
  }
  [...Object.values(fields),'survivalDust','survivalSurface'].forEach(id=>$(id)?.addEventListener('input',change));
  $('survivalProgress').addEventListener('input',updateProgress);
  document.querySelectorAll('[data-survival-scenario]').forEach(b=>b.addEventListener('click',()=>{settings.scenario=b.dataset.survivalScenario;save();render();}));
  $('survivalLive').addEventListener('click',()=>{window.JEZERO_DEMO.disable();render();});
  $('survivalPlan').addEventListener('click',()=>window.JEZERO_MODULES.activate('planner'));
  $('survivalDemo').addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;const old=button.textContent;button.textContent='Preparando escenario…';
    try{settings={...settings,scenario:'nominal',dustIndex:.1};$('survivalDust').value=10;await window.JEZERO_UI_ACTIONS?.startSurvivalDemo?.();save();error();render();}
    catch(e){error(e.message);}finally{button.disabled=false;button.textContent=old;}
  });
  function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('survivalExport').addEventListener('click',()=>download('jezero-evaluacion-supervivencia.json',{format:'JEZERO-SURVIVAL',version:1,exportedAt:new Date().toISOString(),modelVersion:engine.MODEL_VERSION,terrainMode:window.JEZERO_DEMO?.enabled?'synthetic':'dem',config:settings,dataset,checklist:[...document.querySelectorAll('[data-survival-check]')].filter(el=>el.checked).map(el=>el.dataset.survivalCheck),mission:window.JEZERO_UI_ACTIONS?.missionSnapshot?.(),evaluation:snapshot}));
  function csvRecords(text){
    const rows=[];let row=[],cell='',quote=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
    if(quote)throw new Error('CSV con comillas sin cerrar.');if(cell||row.length){row.push(cell);rows.push(row);}
    const header=rows.shift()?.map(h=>h.replace(/^\uFEFF/,'').trim());
    if(!header||!['sol','localHour','temperatureC'].every(k=>header.includes(k)))throw new Error('El CSV necesita sol, localHour y temperatureC. Descarga el ejemplo para ver el formato.');
    return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]?.trim()||null])));
  }
  $('survivalImportWeather').addEventListener('click',()=>$('survivalWeatherFile').click());
  $('survivalWeatherFile').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>5_000_000)throw new Error('El archivo supera 5 MB.');
      const raw=await file.text(),parsed=file.name.toLowerCase().endsWith('.csv')?{format:'JEZERO-WEATHER',version:1,source:{name:`CSV ${file.name} · procedencia declarada`},location:{lat:$('weatherLatitude').value,lon:$('weatherLongitude').value},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:csvRecords(raw)}:JSON.parse(raw);
      engine.weatherModel(parsed);dataset=parsed;error();render();
    }catch(e){error(e.message);}finally{event.target.value='';}
  });
  $('survivalSampleWeather').addEventListener('click',()=>download('jezero-observaciones-ejemplo.json',{format:'JEZERO-WEATHER',version:1,source:{name:'Muestras sintéticas de prueba · NO SON DATOS NASA'},location:{lat:18.44463,lon:77.45088},units:{temperature:'C',pressure:'Pa',wind:'m/s'},records:Array.from({length:48},(_,i)=>({sol:Math.floor(i/24)+100,localHour:i%24,temperatureC:Number((-52.5-30.5*Math.cos(2*Math.PI*((i%24)-3)/24)).toFixed(2)),pressurePa:718,windMps:null}))}));
  $('survivalClearWeather').addEventListener('click',()=>{dataset=null;error();render();});
  function checklist(){const checked=[...document.querySelectorAll('[data-survival-check]')].filter(el=>el.checked);set('survivalChecklistCount',`${checked.length}/6`);try{localStorage.setItem(KEY+'-checklist',JSON.stringify(checked.map(el=>el.dataset.survivalCheck)));}catch{}}
  try{const checked=JSON.parse(localStorage.getItem(KEY+'-checklist')||'[]');document.querySelectorAll('[data-survival-check]').forEach(el=>el.checked=checked.includes(el.dataset.survivalCheck));}catch{}
  document.querySelectorAll('[data-survival-check]').forEach(el=>el.addEventListener('change',checklist));checklist();
  const observer=new MutationObserver(render);['routeStatus','pointCount','distance','duration'].forEach(id=>{if($(id))observer.observe($(id),{childList:true,subtree:true,characterData:true});});
  window.addEventListener('jezero:themechange',render);window.addEventListener('jezero:modulechange',render);
  window.JEZERO_SURVIVAL=Object.freeze({getSnapshot:()=>snapshot,getConfig:()=>({...settings}),getDataset:()=>dataset,refresh:render,parseCsv:csvRecords});
  render();
})();
