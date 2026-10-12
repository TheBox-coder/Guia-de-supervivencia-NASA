/* Deterministic scenario models. Values are not certified suit specifications. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./validation.cjs'));
  else root.JEZERO_SURVIVAL_ENGINE=factory(root.JEZERO_VALIDATION);
})(typeof globalThis!=='undefined'?globalThis:this,function(validation){
  const MODEL_VERSION='1.0.0',SOL_HOURS=24.6597;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
  const DEFAULTS=Object.freeze({crew:2,oxygenKg:1.2,oxygenRateKgH:.12,batteryKWh:.9,powerKW:.12,reservePct:20,startHour:10,dustIndex:.1,scenario:'nominal',surface:'unknown'});
  function config(raw={}){
    const out={...DEFAULTS};
    const ranges={crew:[1,8],oxygenKg:[.05,20],oxygenRateKgH:[.01,2],batteryKWh:[.05,20],powerKW:[.02,3],reservePct:[0,60],startHour:[0,23.99],dustIndex:[0,1]};
    for(const [k,[min,max]] of Object.entries(ranges)){
      if(raw[k]===undefined)continue;
      const n=validation.numeric(raw[k]);if(n===null||n<min||n>max)throw new Error(`Valor de escenario inválido: ${k}.`);
      out[k]=k==='crew'?Math.round(n):n;
    }
    if(raw.scenario!==undefined&&!['nominal','dust','power'].includes(raw.scenario))throw new Error('Escenario no reconocido.');
    if(raw.surface!==undefined&&!['unknown','firm','loose'].includes(raw.surface))throw new Error('Superficie no reconocida.');
    out.scenario=raw.scenario||out.scenario;out.surface=raw.surface||out.surface;return out;
  }
  function weatherData(data){
    if(!data||data.format!=='JEZERO-WEATHER'||data.version!==1)throw new Error('Usa el formato JEZERO-WEATHER versión 1.');
    if(!data.source||typeof data.source.name!=='string'||!data.source.name.trim()||data.source.name.length>160)throw new Error('Falta la procedencia de las observaciones.');
    const location=validation.point(data.location);
    if(!data.units||data.units.temperature!=='C'||data.units.pressure!=='Pa'||data.units.wind!=='m/s')throw new Error('Las unidades deben ser C, Pa y m/s. Convierte los datos antes de importarlos.');
    if(!Array.isArray(data.records)||data.records.length<12||data.records.length>5000)throw new Error('Importa entre 12 y 5000 observaciones.');
    const seen=new Set();
    const records=data.records.map((r,i)=>{
      const sol=validation.numeric(r.sol),hour=validation.numeric(r.localHour),temperatureC=validation.numeric(r.temperatureC);
      if(sol===null||sol<0||!Number.isInteger(sol)||hour===null||hour<0||hour>=24||temperatureC===null||temperatureC< -160||temperatureC>50)throw new Error(`Observación ${i+1} inválida.`);
      const key=`${sol}|${hour}`;if(seen.has(key))throw new Error(`Observación ${i+1} duplicada.`);seen.add(key);
      const optional={pressurePa:[100,2000],windMps:[0,150]};const out={sol,localHour:hour,temperatureC};
      for(const [k,[min,max]] of Object.entries(optional)){const n=validation.numeric(r[k]);if(r[k]!=null&&(n===null||n<min||n>max))throw new Error(`Observación ${i+1}: ${k} fuera de rango.`);out[k]=n;}
      return out;
    }).sort((a,b)=>a.sol-b.sol||a.localHour-b.localHour);
    const lastSol=records.at(-1).sol,recent=records.filter(r=>r.sol>=lastSol-2);
    if(recent.length<12||new Set(recent.map(r=>Math.floor(r.localHour/3))).size<6)throw new Error('Se necesitan 12 muestras recientes que cubran al menos 6 franjas de 3 horas de un sol.');
    return {format:data.format,version:1,source:{name:data.source.name.trim(),url:typeof data.source.url==='string'&&/^https:\/\//.test(data.source.url)?data.source.url.slice(0,1000):null,declared:true},location,units:data.units,records,recent,lastSol};
  }
  function solve(matrix,vector){
    const a=matrix.map((row,i)=>[...row,vector[i]]);
    for(let i=0;i<3;i++){
      let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
      [a[i],a[pivot]]=[a[pivot],a[i]];if(Math.abs(a[i][i])<1e-8)throw new Error('El horario de muestras no permite ajustar el modelo.');
      const scale=a[i][i];a[i]=a[i].map(v=>v/scale);
      for(let j=0;j<3;j++)if(j!==i){const factor=a[j][i];a[j]=a[j].map((v,k)=>v-factor*a[i][k]);}
    }
    return a.map(row=>row[3]);
  }
  function weatherModel(dataset=null){
    if(!dataset)return {kind:'historical-scenario',name:'Referencia MEDA 2021 + ciclo ilustrativo',coefficients:[-52.5,-21.5667568,-21.5667568],errorC:8,pressurePa:718,windMps:null,baseSol:null,
      note:'Extremos históricos de Jezero: −83 / −22 °C, 3–4 abril 2021. El ciclo horario y su banda son simulados, no un pronóstico NASA.',location:{lat:18.44463,lon:77.45088}};
    const d=weatherData(dataset),m=Array.from({length:3},()=>[0,0,0]),v=[0,0,0];
    const basis=hour=>[1,Math.cos(2*Math.PI*hour/24),Math.sin(2*Math.PI*hour/24)];
    for(const r of d.recent){const x=basis(r.localHour);for(let i=0;i<3;i++){v[i]+=x[i]*r.temperatureC;for(let j=0;j<3;j++)m[i][j]+=x[i]*x[j];}}
    const coefficients=solve(m,v);
    const errorC=Math.max(5,Math.sqrt(d.recent.reduce((sum,r)=>{const x=basis(r.localHour),estimate=x.reduce((n,b,i)=>n+b*coefficients[i],0);return sum+(r.temperatureC-estimate)**2;},0)/d.recent.length));
    const unusedFields=[...new Set(dataset.records.flatMap(r=>Object.keys(r)))].filter(k=>!['sol','localHour','temperatureC','pressurePa','windMps'].includes(k)).slice(0,12);
    return {kind:'imported-pattern',name:d.source.name,coefficients,errorC,pressurePa:median(d.recent.map(r=>r.pressurePa)),windMps:median(d.recent.map(r=>r.windMps)),baseSol:d.lastSol+1,location:d.location,recordCount:d.records.length,unusedFields,
      fieldCoverage:{temperature:d.records.length,pressure:d.records.filter(r=>Number.isFinite(r.pressurePa)).length,wind:d.records.filter(r=>Number.isFinite(r.windMps)).length},
      note:'Proyección de un sol mediante ajuste armónico a las últimas muestras. La banda es error residual, no intervalo de confianza calibrado. No predice tormentas.'};
  }
  function temperature(model,hour){const h=((hour%24)+24)%24,a=2*Math.PI*h/24;return model.coefficients[0]+model.coefficients[1]*Math.cos(a)+model.coefficients[2]*Math.sin(a);}
  function forecast(raw={},dataset=null){
    const p=config(raw),model=weatherModel(dataset),dust=p.scenario==='dust'?Math.max(.85,p.dustIndex):p.dustIndex;
    return {model,scenario:p.scenario,dustIndex:dust,series:Array.from({length:25},(_,i)=>{
      const hour=i===24?24:i,t=temperature(model,hour);
      return {hour,temperatureC:t,lowerC:t-model.errorC,upperC:t+model.errorC,pressurePa:model.pressurePa,windMps:model.windMps,dustIndex:dust};
    })};
  }
  function terrain(mission){
    const m=mission?.metrics||{};
    return {slopeDeg:validation.numeric(m.maxSlopeDeg),roughnessDeg:validation.numeric(m.avgRoughnessDeg),sampleQuality:validation.numeric(m.avgConfidence),spacingM:mission?.legs?.length?Math.max(...mission.legs.map(l=>Number(l.gridSpacingKm)||0))*1000:null,
      composition:'No observada',bearingCapacity:'No medida',waterAvailability:'No medida',classification:!mission?'Sin ruta':m.maxSlopeDeg>15?'Pendiente exigente':m.avgRoughnessDeg>3?'Relieve irregular':'Relieve moderado en el DEM',
      note:'La topografía no determina mineralogía, capacidad portante, toxicidad ni disponibilidad de agua. La superficie suelta solo se introduce como supuesto.'};
  }
  function distance(a,b){if(!a||!b)return null;const r=Math.PI/180,dp=(b.lat-a.lat)*r,dl=(b.lon-a.lon)*r,h=Math.sin(dp/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dl/2)**2;return 2*3389.5*Math.asin(Math.sqrt(clamp(h,0,1)));}
  function evaluate(mission,raw={},dataset=null){
    const p=config(raw),environment=forecast(p,dataset),soil=terrain(mission),alerts=[];
    if(!mission||!Number.isFinite(mission.duration)||!mission.legs?.length)return {status:'no-mission',label:'Define una misión',environment,terrain:soil,alerts:[{level:'info',code:'route',text:'Carga la demo o calcula una ruta para evaluar recursos.'}],config:p,modelVersion:MODEL_VERSION};
    const dust=environment.dustIndex,delay=1+dust*.25+(p.surface==='loose'?.15:0),duration=mission.duration*delay;
    const capacityBattery=p.batteryKWh*(p.scenario==='power'?.45:1),effort=1+clamp((mission.metrics?.avgSlopeDeg||0)/30,0,.5),oxygenRate=p.oxygenRateKgH*effort*(1+dust*.1);
    let batteryUsed=0,minTemp=Infinity,maxTemp=-Infinity;const energyPrefix=[0];
    for(let i=0;i<48;i++){
      const t=temperature(environment.model,p.startHour+((i+.5)/48)*duration*24/SOL_HOURS);minTemp=Math.min(minTemp,t);maxTemp=Math.max(maxTemp,t);
      const heatKW=Math.max(0,-20-t)*.0008;
      batteryUsed+=(p.powerKW+heatKW)*(1+dust*.25)*duration/48;
      energyPrefix.push(batteryUsed);
    }
    const oxygenUsed=oxygenRate*duration,oxygenLeft=p.oxygenKg-oxygenUsed,batteryLeft=capacityBattery-batteryUsed,reserve=p.reservePct/100;
    const available=Number.isFinite(mission.availableHours)?mission.availableHours:mission.params.evaTime*(1-mission.params.returnMargin/100);
    const timeMargin=available-duration,oxygenMargin=oxygenLeft-p.oxygenKg*reserve,batteryMargin=batteryLeft-capacityBattery*reserve;
    if(timeMargin<0)alerts.push({level:'critical',code:'time',text:`El escenario excede la ventana reservada en ${Math.abs(timeMargin*60).toFixed(0)} min. Reduce objetivos o paradas.`});
    if(oxygenMargin<0)alerts.push({level:'critical',code:'oxygen',text:'La reserva de O₂ del escenario no se conserva. Acorta la EVA o revisa el presupuesto hipotético.'});
    if(batteryMargin<0)alerts.push({level:'critical',code:'power',text:'La batería no conserva su reserva en este escenario. El frío y el polvo aumentan el consumo modelado.'});
    if(dust>.6)alerts.push({level:'warning',code:'dust',text:'Escenario de polvo denso: se añade demora y demanda de energía. No es una tormenta observada ni predicha.'});
    if(minTemp< -70)alerts.push({level:'warning',code:'cold',text:'La proyección incluye frío intenso; comprueba el impacto de la carga térmica hipotética.'});
    if(p.surface==='loose')alerts.push({level:'warning',code:'surface',text:'Superficie suelta asumida: se aplica 15% de demora. No procede de un análisis químico o geotécnico.'});
    const separation=distance(mission.sequence?.[0],environment.model.location);
    if(separation!==null&&separation>50)alerts.push({level:'warning',code:'location',text:'La referencia meteorológica corresponde a otra ubicación (>50 km). Solo úsala como escenario ilustrativo.'});
    const returning=mission.sequence?.length>1&&distance(mission.sequence[0],mission.sequence.at(-1))<.001;
    if(!returning)alerts.push({level:'warning',code:'return',text:'La ruta no incluye regreso a la base. Su presupuesto no demuestra capacidad de retorno.'});
    alerts.push({level:'unknown',code:'radiation',text:'Radiación y comunicaciones sin telemetría. Estos datos no permiten certificar una EVA.'});
    const status=alerts.some(a=>a.level==='critical')?'critical':alerts.some(a=>a.level==='warning')?'review':'scenario-ok';
    const timeline=Array.from({length:25},(_,i)=>{const fraction=i/24,elapsed=duration*fraction;return {fraction,elapsedHours:elapsed,oxygenKg:p.oxygenKg-oxygenUsed*fraction,batteryKWh:capacityBattery-energyPrefix[i*2],remainingWindowHours:available-elapsed,temperatureC:temperature(environment.model,p.startHour+elapsed*24/SOL_HOURS)};});
    return {modelVersion:MODEL_VERSION,status,label:status==='critical'?'Replantear la EVA':status==='review'?'Revisar condiciones':'Reservas conservadas en el escenario',durationHours:duration,routeDurationHours:mission.duration,timeMarginHours:timeMargin,
      oxygen:{capacityKg:p.oxygenKg,usedKg:oxygenUsed,remainingKg:oxygenLeft,reserveKg:p.oxygenKg*reserve,marginKg:oxygenMargin,totalCrewUsedKg:oxygenUsed*p.crew},
      battery:{capacityKWh:capacityBattery,usedKWh:batteryUsed,remainingKWh:batteryLeft,reserveKWh:capacityBattery*reserve,marginKWh:batteryMargin},
      temperature:{minC:minTemp,maxC:maxTemp},effortFactor:effort,delayFactor:delay,config:p,environment,terrain:soil,timeline,alerts,returnIncluded:returning,
      assumptions:['Recursos por persona; consumos hipotéticos editables.','Demora = 1 + 0,25 × polvo + 0,15 si superficie suelta.','O₂ = tasa × esfuerzo topográfico × (1 + 0,10 × polvo) × horas.','Potencia = carga base + 0,0008 kW por °C debajo de −20 °C; multiplicador de polvo 1 + 0,25 × índice.','Escenario fallo eléctrico: capacidad efectiva del 45%.','Proyección horaria sin estacionalidad ni predicción de tormentas.']};
  }
  function compare(missions,raw={},dataset=null){
    const rows=['distance','balanced','risk'].filter(k=>missions?.[k]).map(mode=>({mode,...evaluate(missions[mode],raw,dataset)}));
    const feasible=rows.filter(r=>r.status!=='critical');
    const recommended=(feasible.length?feasible:rows).sort((a,b)=>b.timeMarginHours-a.timeMarginHours)[0];
    return {rows,recommendedMode:recommended?.mode||null,hasFeasible:feasible.length>0};
  }
  return Object.freeze({MODEL_VERSION,SOL_HOURS,DEFAULTS,config,weatherData,weatherModel,forecast,temperature,terrain,evaluate,compare});
});
