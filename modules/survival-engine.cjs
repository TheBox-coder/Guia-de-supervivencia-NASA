/* Deterministic scenario models. Values are not certified suit specifications. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./validation.cjs'));
  else root.JEZERO_SURVIVAL_ENGINE=factory(root.JEZERO_VALIDATION);
})(typeof globalThis!=='undefined'?globalThis:this,function(validation){
  const MODEL_VERSION='2.0.0',SOL_HOURS=24.6597;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
  // Fuentes y razonamiento: docs/PROPUESTA-MODELO-METABOLICO.md.
  // Nivel absoluto: EVA lunares de Apolo con traje (NASA NTRS 19910001262, 19920018969).
  const METABOLIC=Object.freeze({walkKcalH:234,stationKcalH:244,lowKcalH:120,highKcalH:400,rq:.82,o2GramsPerLitre:1.429});
  // Factor de terreno η de Pandolf et al. (1977): camino de tierra 1.1, arena suelta 2.1.
  const TERRAIN_FACTOR=Object.freeze({unknown:1.1,firm:1.1,loose:2.1});
  // Pandolf sin carga, por kg (W=1, L=0): solo se usa como factor relativo; el nivel absoluto lo fija Apolo.
  const pandolf=(speedMs,gradePct,eta)=>1.5+eta*(1.5*speedMs**2+.35*speedMs*gradePct);
  // Equivalente calórico del O₂ por la ecuación de Weir (3.941 + 1.106·RQ kcal/L) y densidad del O₂.
  const O2_KG_PER_KCAL=METABOLIC.o2GramsPerLitre/1000/(3.941+1.106*METABOLIC.rq);
  // oxygenRateKgH null = consumo calculado por el modelo metabólico; un número = consumo declarado por el usuario.
  // powerKW 0.13 ≈ batería EMU de plata-zinc (20.5 V × 45 Ah ≈ 0.92 kWh) repartida en sus 7 h de consumibles.
  const DEFAULTS=Object.freeze({crew:2,oxygenKg:1.2,oxygenRateKgH:null,batteryKWh:.9,powerKW:.13,reservePct:20,startHour:10,dustIndex:.1,scenario:'nominal',surface:'unknown'});
  function config(raw={}){
    const out={...DEFAULTS};
    const ranges={crew:[1,8],oxygenKg:[.05,20],oxygenRateKgH:[.01,2],batteryKWh:[.05,20],powerKW:[.02,3],reservePct:[0,60],startHour:[0,23.99],dustIndex:[0,1]};
    for(const [k,[min,max]] of Object.entries(ranges)){
      if(raw[k]===undefined)continue;
      if(k==='oxygenRateKgH'&&(raw[k]===null||String(raw[k]).trim()==='')){out[k]=null;continue;}
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
  function observationForecast(dataset){
    if(!dataset)return {status:'missing-data',model:null,series:[]};
    const result=forecast({},dataset);
    return {status:'projection',horizonSols:1,model:result.model,series:result.series};
  }
  function terrain(mission){
    const m=mission?.metrics||{};
    return {slopeDeg:validation.numeric(m.maxSlopeDeg),roughnessDeg:validation.numeric(m.avgRoughnessDeg),sampleQuality:validation.numeric(m.avgConfidence),spacingM:mission?.legs?.length?Math.max(...mission.legs.map(l=>Number(l.gridSpacingKm)||0))*1000:null,
      composition:'No observada',bearingCapacity:'No medida',waterAvailability:'No medida',classification:!mission?'Sin ruta':m.maxSlopeDeg>15?'Pendiente exigente':m.avgRoughnessDeg>3?'Relieve irregular':'Relieve moderado en el DEM',
      note:'La topografía no determina mineralogía, capacidad portante, toxicidad ni disponibilidad de agua. La superficie suelta solo se introduce como supuesto.'};
  }
  function distance(a,b){if(!a||!b)return null;const r=Math.PI/180,dp=(b.lat-a.lat)*r,dl=(b.lon-a.lon)*r,h=Math.sin(dp/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dl/2)**2;return 2*3389.5*Math.asin(Math.sqrt(clamp(h,0,1)));}
  // Gasto metabólico por persona. Caminando: 234 kcal/h × factor de Pandolf frente a llano y terreno firme
  // a la misma velocidad. Pandolf es lineal en la pendiente, así que la subida media del tramo da el gasto medio.
  // El tiempo restante de la misión (paradas) se cuenta como trabajo en estación, 244 kcal/h.
  function metabolism(mission,eta){
    let walkKcal=0,walkHours=0;
    for(const leg of mission?.legs||[]){
      const hours=Number(leg.durationHours)||0,km=Number(leg.metrics?.distanceKm)||0;
      if(hours<=0||km<=0)continue;
      const speedMs=km*1000/(hours*3600),gradePct=Math.max(0,(Number(leg.metrics?.gainM)||0)/(km*1000)*100);
      walkKcal+=METABOLIC.walkKcalH*pandolf(speedMs,gradePct,eta)/pandolf(speedMs,0,1)*hours;walkHours+=hours;
    }
    const stopHours=Math.max(0,(Number(mission?.duration)||0)-walkHours),kcal=walkKcal+METABOLIC.stationKcalH*stopHours;
    return {kcal,kcalLow:kcal*METABOLIC.lowKcalH/METABOLIC.walkKcalH,kcalHigh:kcal*METABOLIC.highKcalH/METABOLIC.walkKcalH,walkHours,stopHours,
      walkFactor:walkHours?walkKcal/(METABOLIC.walkKcalH*walkHours):1,terrainFactor:eta};
  }
  function evaluate(mission,raw={},dataset=null){
    const p=config(raw),environment=forecast(p,dataset),soil=terrain(mission),alerts=[];
    if(!mission||!Number.isFinite(mission.duration)||!mission.legs?.length)return {status:'no-mission',label:'Define una misión',environment,terrain:soil,alerts:[{level:'info',code:'route',text:'Carga la demo o calcula una ruta para evaluar recursos.'}],config:p,modelVersion:MODEL_VERSION};
    // El polvo solo actúa en el escenario "polvo denso": sus coeficientes no tienen fuente publicada.
    const dust=environment.dustIndex,dustEffect=p.scenario==='dust'?dust:0,delay=1+dustEffect*.25,duration=mission.duration*delay;
    const capacityBattery=p.batteryKWh*(p.scenario==='power'?.45:1),metabolic=metabolism(mission,TERRAIN_FACTOR[p.surface]);
    const declaredRate=Number.isFinite(p.oxygenRateKgH);
    const oxygenFromKcal=kcal=>kcal*delay*O2_KG_PER_KCAL*(1+dustEffect*.1);
    const oxygenUsed=declaredRate?p.oxygenRateKgH*duration:oxygenFromKcal(metabolic.kcal);
    const oxygenUsedRange=declaredRate?[oxygenUsed,oxygenUsed]:[oxygenFromKcal(metabolic.kcalLow),oxygenFromKcal(metabolic.kcalHigh)];
    let batteryUsed=0,minTemp=Infinity,maxTemp=-Infinity;const energyPrefix=[0];
    for(let i=0;i<48;i++){
      const t=temperature(environment.model,p.startHour+((i+.5)/48)*duration*24/SOL_HOURS);minTemp=Math.min(minTemp,t);maxTemp=Math.max(maxTemp,t);
      // La carga térmica del traje no se modela: no hay datos publicados de un traje para Marte.
      batteryUsed+=p.powerKW*(1+dustEffect*.25)*duration/48;
      energyPrefix.push(batteryUsed);
    }
    const oxygenLeft=p.oxygenKg-oxygenUsed,batteryLeft=capacityBattery-batteryUsed,reserve=p.reservePct/100;
    const available=Number.isFinite(mission.availableHours)?mission.availableHours:mission.params.evaTime*(1-mission.params.returnMargin/100);
    const timeMargin=available-duration,oxygenMargin=oxygenLeft-p.oxygenKg*reserve,batteryMargin=batteryLeft-capacityBattery*reserve;
    if(timeMargin<0)alerts.push({level:'critical',code:'time',text:`El escenario excede la ventana reservada en ${Math.abs(timeMargin*60).toFixed(0)} min. Reduce objetivos o paradas.`});
    if(oxygenMargin<0)alerts.push({level:'critical',code:'oxygen',text:'La reserva de O₂ del escenario no se conserva. Acorta la EVA o revisa el presupuesto hipotético.'});
    if(batteryMargin<0)alerts.push({level:'critical',code:'power',text:'La batería no conserva su reserva en este escenario. Revisa la capacidad declarada o acorta la EVA.'});
    if(!declaredRate&&p.oxygenKg-oxygenUsedRange[1]<p.oxygenKg*reserve&&oxygenMargin>=0)alerts.push({level:'warning',code:'oxygen-range',text:'Con el gasto metabólico más alto observado en Apolo, la reserva de O₂ no se conservaría.'});
    if(dustEffect>.6)alerts.push({level:'warning',code:'dust',text:'Escenario de polvo denso: se añade demora y demanda de energía. No es una tormenta observada ni predicha.'});
    if(minTemp< -70)alerts.push({level:'warning',code:'cold',text:'La proyección incluye frío intenso. La carga térmica del traje no se modela por falta de datos de un traje para Marte.'});
    if(p.surface==='loose')alerts.push({level:'warning',code:'surface',text:'Superficie suelta asumida: el gasto metabólico usa el factor de arena suelta de Pandolf (2.1). No procede de un análisis geotécnico.'});
    const separation=distance(mission.sequence?.[0],environment.model.location);
    if(separation!==null&&separation>50)alerts.push({level:'warning',code:'location',text:'La referencia meteorológica corresponde a otra ubicación (>50 km). Solo úsala como escenario ilustrativo.'});
    const returning=mission.sequence?.length>1&&distance(mission.sequence[0],mission.sequence.at(-1))<.001;
    if(!returning)alerts.push({level:'warning',code:'return',text:'La ruta no incluye regreso a la base. Su presupuesto no demuestra capacidad de retorno.'});
    alerts.push({level:'unknown',code:'radiation',text:'Radiación y comunicaciones sin telemetría. Estos datos no permiten certificar una EVA.'});
    const status=alerts.some(a=>a.level==='critical')?'critical':alerts.some(a=>a.level==='warning')?'review':'scenario-ok';
    const timeline=Array.from({length:25},(_,i)=>{const fraction=i/24,elapsed=duration*fraction;return {fraction,elapsedHours:elapsed,oxygenKg:p.oxygenKg-oxygenUsed*fraction,batteryKWh:capacityBattery-energyPrefix[i*2],remainingWindowHours:available-elapsed,temperatureC:temperature(environment.model,p.startHour+elapsed*24/SOL_HOURS)};});
    return {modelVersion:MODEL_VERSION,status,label:status==='critical'?'Replantear la EVA':status==='review'?'Revisar condiciones':'Reservas conservadas en el escenario',durationHours:duration,routeDurationHours:mission.duration,timeMarginHours:timeMargin,
      oxygen:{capacityKg:p.oxygenKg,usedKg:oxygenUsed,usedRangeKg:oxygenUsedRange,remainingKg:oxygenLeft,remainingRangeKg:[p.oxygenKg-oxygenUsedRange[1],p.oxygenKg-oxygenUsedRange[0]],reserveKg:p.oxygenKg*reserve,marginKg:oxygenMargin,totalCrewUsedKg:oxygenUsed*p.crew,source:declaredRate?'declared':'metabolic-model'},
      battery:{capacityKWh:capacityBattery,usedKWh:batteryUsed,remainingKWh:batteryLeft,reserveKWh:capacityBattery*reserve,marginKWh:batteryMargin},
      metabolic,temperature:{minC:minTemp,maxC:maxTemp},effortFactor:metabolic.walkFactor,delayFactor:delay,config:p,environment,terrain:soil,timeline,alerts,returnIncluded:returning,
      assumptions:['Recursos por persona.',declaredRate?`O₂ con consumo declarado: ${p.oxygenRateKgH} kg/h × horas.`:'Gasto al caminar = 234 kcal/h (media EVA Apolo) × factor de Pandolf por pendiente, velocidad y terreno; paradas = 244 kcal/h (trabajo en estación, Apolo).','O₂ = gasto (kcal) ÷ 4.85 kcal/L (Weir, RQ 0.82) × 1.429 g/L.','Rango: gasto escalado al rango lunar observado, 120–400 kcal/h.','Las bajadas cuentan como llano: Pandolf no modela bien las pendientes negativas.','Potencia constante; la carga térmica del traje no se modela.',p.scenario==='dust'?'Escenario de polvo: demora 1 + 0.25 × polvo, O₂ +10 % y energía +25 % × polvo. Coeficientes sin fuente publicada.':'El polvo solo se aplica en el escenario "polvo denso".','Escenario fallo eléctrico: capacidad efectiva del 45 % (hipótesis).','Proyección horaria sin estacionalidad ni predicción de tormentas.']};
  }
  function compare(missions,raw={},dataset=null){
    const rows=['distance','balanced','risk'].filter(k=>missions?.[k]).map(mode=>({mode,...evaluate(missions[mode],raw,dataset)}));
    const feasible=rows.filter(r=>r.status!=='critical');
    const recommended=(feasible.length?feasible:rows).sort((a,b)=>b.timeMarginHours-a.timeMarginHours)[0];
    return {rows,recommendedMode:recommended?.mode||null,hasFeasible:feasible.length>0};
  }
  return Object.freeze({MODEL_VERSION,SOL_HOURS,DEFAULTS,METABOLIC,TERRAIN_FACTOR,O2_KG_PER_KCAL,pandolf,metabolism,config,weatherData,weatherModel,forecast,observationForecast,temperature,terrain,evaluate,compare});
});
