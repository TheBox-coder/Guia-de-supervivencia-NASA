(() => {
 // Calculadora de misión y emergencia: se añade como tarjeta a la sección «Chariot y escenario» del módulo CHARIOT.
 const calc=window.JEZERO_CHARIOT_CALC,host=document.getElementById('opsPanel-base');
 if(!calc||!host)return;
 const ui=(es,en)=>window.JEZERO_I18N?.ui(es,en)||es;
 const fmt=(n,unit)=>Number.isFinite(n)?n.toFixed(2)+' '+unit:'—';
 // Los textos llevan data-ops-es/en: el módulo CHARIOT los vuelve a traducir cada vez que cambia el idioma.
 const label=(el,es,en)=>{el.dataset.opsEs=es;el.dataset.opsEn=en;el.textContent=ui(es,en);return el;};
 const make=(tag,className,es,en)=>{const el=document.createElement(tag);if(className)el.className=className;if(es)label(el,es,en);return el;};
 const missionFields=[['distance','Distancia de ida (km)','One-way distance (km)',12,{min:.1,step:.1}],['speed','Velocidad media (km/h)','Average speed (km/h)',8,{min:.1,step:.1}],['traction','Potencia de tracción (kW)','Traction power (kW)',4,{min:0,step:.1}],['aux','Potencia auxiliar (kW)','Auxiliary power (kW)',.6,{min:0,step:.1}],['reserve','Reserva de batería (%)','Battery reserve (%)',20,{min:0,max:99,step:1}]];
 const emergencyFields=[['stormHours','Duración de la tormenta (h)','Storm duration (h)',24,{min:0,step:1}],['essential','Potencia esencial en espera (kW)','Essential standby power (kW)',1.5,{min:0,step:.1}],['returnDistance','Distancia de regreso (km)','Return distance (km)',12,{min:0,step:.1}],['returnSpeed','Velocidad de regreso (km/h)','Return speed (km/h)',8,{min:.1,step:.1}],['returnTraction','Potencia de tracción de regreso (kW)','Return traction power (kW)',4,{min:0,step:.1}],['margin','Margen adicional (%)','Additional margin (%)',20,{min:0,max:100,step:1}]];
 const card=make('section','chariotCalculator');card.id='chariotCalculator';card.setAttribute('aria-labelledby','chariotCalcTitle');
 const title=make('h3',null,'Calculadora de misión y emergencia','Mission and emergency calculator');title.id='chariotCalcTitle';
 const intro=make('p','opsNotice','Modelo simplificado de energía para un viaje de ida y vuelta sin paradas científicas y para esperar una tormenta de polvo. No sustituye los límites operativos de una misión real ni los datos de tu hardware.','Simplified energy model for a round trip without scientific stops and for waiting out a dust storm. It does not replace real mission operating limits or your hardware data.');
 const inputs={};
 function field(parent,[key,es,en,value,attrs]){
  const wrap=document.createElement('label'),span=make('span',null,es,en),input=document.createElement('input');
  input.type='number';input.id='chariotCalc-'+key;input.value=String(value);for(const [k,v] of Object.entries(attrs))input.setAttribute(k,String(v));
  wrap.append(span,input);parent.append(wrap);inputs[key]=input;return input;
 }
 // Capacidad y generación: se toman del Chariot declarado (si existen) o de la propuesta del equipo (42 kWh / 1,2 kW).
 const chariotGrid=make('div','opsInputs');
 const capacityInput=field(chariotGrid,['capacity','Capacidad de la batería (kWh)','Battery capacity (kWh)',calc.DEFAULTS.capacityKWh,{min:.1,step:.1}]);
 const generationInput=field(chariotGrid,['generation','Generación continua (kW)','Continuous generation (kW)',calc.DEFAULTS.generationKW,{min:0,step:.1}]);
 const useChariot=make('button','secondary','Usar los datos del Chariot declarados','Use the declared Chariot data');useChariot.type='button';
 const chariotNote=make('p','opsNotice');
 function loadChariot(){
  const base=window.JEZERO_OPERATIONS?.getState?.()?.base,proposal=window.JEZERO_OPERATIONS_ENGINE?.CHARIOT_PROPOSAL;
  const cap=Number.isFinite(base?.batteryCapacityKWh)?base.batteryCapacityKWh:proposal?.batteryCapacityKWh??calc.DEFAULTS.capacityKWh,gen=Number.isFinite(base?.generationKW)?base.generationKW:proposal?.generationKW??calc.DEFAULTS.generationKW;
  capacityInput.value=String(cap);generationInput.value=String(gen);
  const declared=Number.isFinite(base?.batteryCapacityKWh)||Number.isFinite(base?.generationKW);
  label(chariotNote,declared?'Valores tomados del Chariot declarado en esta sección.':'Valores de la propuesta del equipo (batería de 42 kWh y generador continuo de 1,2 kW). Edítalos si tu Chariot es distinto.',declared?'Values taken from the Chariot declared in this section.':'Values from the team proposal (42 kWh battery and continuous 1.2 kW generator). Edit them if your Chariot differs.');
  update();
 }
 const lifeSupportSols=()=>window.JEZERO_OPERATIONS_ENGINE?.CHARIOT_PROPOSAL?.lifeSupportSols??calc.DEFAULTS.lifeSupportSols;
 const options=()=>({capacityKWh:capacityInput.value,generationKW:generationInput.value,lifeSupportSols:lifeSupportSols(),elapsedSols:window.JEZERO_OPERATIONS?.getState?.()?.base?.elapsedSols??0});
 // Misión
 const missionForm=document.createElement('form');missionForm.noValidate=true;missionForm.addEventListener('submit',e=>e.preventDefault());
 const missionTitle=make('h4',null,'Parámetros de la misión','Mission parameters'),missionGrid=make('div','opsInputs');
 missionFields.forEach(f=>field(missionGrid,f));missionForm.append(missionTitle,missionGrid);
 const missionOut=make('div','opsReadout');
 const articles={};
 function metric(parent,key,es,en){const a=document.createElement('article'),b=make('b',null,es,en),s=document.createElement('strong');s.textContent='—';a.append(b,s);parent.append(a);articles[key]=a;return a;}
 [['totalDistance','Distancia ida y vuelta','Round-trip distance'],['driveTime','Tiempo de conducción','Driving time'],['consumption','Consumo energético','Energy consumption'],['generation','Generación estimada','Estimated generation'],['netDemand','Demanda neta de batería','Net battery demand'],['usable','Capacidad utilizable','Usable capacity']].forEach(([k,es,en])=>metric(missionOut,k,es,en));
 const missionStatus=make('p','opsNotice');missionStatus.setAttribute('role','status');missionStatus.setAttribute('aria-live','polite');
 // Emergencia
 const emergency=document.createElement('details');emergency.className='chariotEmergency';
 const summary=make('summary',null,'⚠ Simular emergencia: tormenta de polvo','⚠ Simulate emergency: dust storm');
 const emergencyHint=make('p','opsNotice','Calcula la reserva necesaria para esperar la tormenta y regresar a la base. Parte de batería al 100 %, generador constante y consumos uniformes.','Calculates the reserve needed to wait out the storm and return to base. Assumes a full battery, constant generator output and uniform loads.');
 const emergencyForm=document.createElement('form');emergencyForm.noValidate=true;emergencyForm.addEventListener('submit',e=>e.preventDefault());
 const emergencyGrid=make('div','opsInputs');emergencyFields.forEach(f=>field(emergencyGrid,f));
 const generatorLabel=document.createElement('label');generatorLabel.className='chariotSwitch';
 const generatorInput=document.createElement('input');generatorInput.type='checkbox';generatorInput.id='chariotCalc-generatorOn';generatorInput.checked=true;
 const generatorText=make('span');generatorLabel.append(generatorInput,generatorText);
 emergencyForm.append(emergencyGrid,generatorLabel);
 const emergencyOut=make('div','opsReadout');
 [['stormUse','Espera por tormenta','Storm standby'],['returnUse','Energía neta de regreso','Net return energy'],['extra','Margen adicional','Additional margin'],['emergencyTotal','Reserva de emergencia requerida','Required emergency reserve']].forEach(([k,es,en])=>metric(emergencyOut,k,es,en));
 const emergencyStatus=make('p','opsNotice');emergencyStatus.setAttribute('role','status');emergencyStatus.setAttribute('aria-live','polite');
 // Límite de espera: no se predice la tormenta, se calcula cuánto puede esperar el Chariot con la configuración actual.
 const enduranceTitle=make('h4',null,'Cuánto puede esperar el Chariot','How long the Chariot can wait');
 const enduranceOut=make('div','opsReadout');
 [['maxWait','Espera máxima','Maximum wait'],['limit','Factor limitante','Limiting factor'],['returnReserve','Reserva solo para regresar','Reserve to return only']].forEach(([k,es,en])=>metric(enduranceOut,k,es,en));
 const enduranceNote=make('p','opsNotice');enduranceNote.setAttribute('role','status');
 // Escenarios: comparan duraciones hipotéticas; no son pronósticos.
 const scenarioTitle=make('h4',null,'Escenarios de duración (no son pronósticos)','Duration scenarios (not forecasts)');
 const scenarioIntro=make('p','opsNotice','Nadie puede predecir cuánto durará una tormenta concreta. Estos valores redondos sirven para ver qué pasaría: la literatura describe tormentas de gran escala de semanas a meses. Pulsa uno para cargarlo en la duración de la simulación.','Nobody can predict how long a specific storm will last. These round values show what would happen: the literature describes large-scale storms lasting weeks to months. Press one to load it as the simulation duration.');
 const scenarioList=make('div','opsReadout chariotScenarios');
 emergency.append(summary,emergencyHint,emergencyForm,emergencyOut,emergencyStatus,enduranceTitle,enduranceOut,enduranceNote,scenarioTitle,scenarioIntro,scenarioList);
 const actions=make('div','chariotCalcActions');actions.append(useChariot);
 // Vínculo con el módulo Clima: muestra el polvo (τ) observado en la zona. No estima la duración de la tormenta: ese dato lo define el usuario.
 const dustLink=make('p','opsNotice');dustLink.setAttribute('role','status');dustLink.id='chariotCalcDust';
 const DUST_NAMES={clear:['bajo','low'],elevated:['elevado','elevated'],storm:['compatible con tormenta','storm-level'],severe:['de tormenta severa','severe-storm']};
 function updateDust(){
  let c=null;
  try{const engine=window.JEZERO_SURVIVAL_ENGINE,survival=window.JEZERO_SURVIVAL,data=survival?.getApplicableDataset?.();if(engine&&data){const f=engine.observationForecast(data,survival.getWeatherOrigin());if(f.status==='projection')c=f.conditions;}}catch{c=null;}
  const d=c?.dust;
  if(!d){label(dustLink,'Polvo: sin observaciones de opacidad (τ) para esta zona en el módulo Clima. Ausencia de datos no significa cielo despejado. La duración de la tormenta es un dato que defines tú; la app no la estima.','Dust: no optical-depth (τ) observations for this region in the Weather module. Missing data does not mean clear sky. Storm duration is a value you set; the app does not estimate it.');state(dustLink,null);return;}
  const [nes,nen]=DUST_NAMES[d.level],tau=d.median.toFixed(2),rising=d.rising?` Sube ${d.slopePerSol.toFixed(2)} τ por sol.`:'',risingEn=d.rising?` Rising ${d.slopePerSol.toFixed(2)} τ per sol.`:'';
  const concern=d.level!=='clear'||d.rising;
  label(dustLink,`Polvo observado (módulo Clima): τ ${tau}, nivel ${nes}.${rising} ${concern?'Conviene revisar la simulación de emergencia con una duración prudente. ':''}La app no predice cuánto durará una tormenta: la duración de la simulación es tu supuesto.`,`Observed dust (Weather module): τ ${tau}, ${nen} level.${risingEn} ${concern?'Consider checking the emergency simulation with a cautious duration. ':''}The app does not predict how long a storm will last: the simulation duration is your assumption.`);
  state(dustLink,!concern);
 }
 ['jezero:weatherchange','jezero:supportchange','jezero:languagechange'].forEach(name=>window.addEventListener?.(name,updateDust));
 card.append(title,intro,chariotGrid,actions,chariotNote,missionForm,missionOut,missionStatus,dustLink,emergency);
 const read=key=>inputs[key].value;
 function state(el,ok){el.dataset.state=ok===null?'error':ok?'ok':'warn';}
 function updateMission(){
  const r=calc.mission({distanceKm:read('distance'),speedKmH:read('speed'),tractionKW:read('traction'),auxKW:read('aux'),reservePct:read('reserve')},options());
  if(!r.ok){const [es,en]=r.error.split(' / ');label(missionStatus,es,en);state(missionStatus,null);for(const a of Object.values(articles))if(a.parentNode===missionOut)a.querySelector('strong').textContent='—';return null;}
  const set=(k,t)=>{articles[k].querySelector('strong').textContent=t;};
  set('totalDistance',fmt(r.totalDistanceKm,'km'));set('driveTime',fmt(r.driveHours,'h'));set('consumption',fmt(r.consumptionKWh,'kWh'));set('generation',fmt(r.generationKWh,'kWh'));set('netDemand',fmt(r.netKWh,'kWh'));set('usable',fmt(r.usableKWh,'kWh'));
  articles.netDemand.dataset.deficit=String(!r.sufficient);
  label(missionStatus,r.sufficient?`✓ Capacidad suficiente según el modelo${r.netKWh<0?' (la generación cubre el consumo)':''}.`:'⚠ Demanda superior a la capacidad utilizable.',r.sufficient?`✓ Sufficient capacity according to the model${r.netKWh<0?' (generation covers the load)':''}.`:'⚠ Demand exceeds usable capacity.');state(missionStatus,r.sufficient);return r;
 }
 function updateEmergency(){
  const emergencyInput={stormHours:read('stormHours'),essentialKW:read('essential'),returnDistanceKm:read('returnDistance'),returnSpeedKmH:read('returnSpeed'),returnTractionKW:read('returnTraction'),marginPct:read('margin'),generatorOn:generatorInput.checked};
  const r=calc.emergency(emergencyInput,options());
  label(generatorText,`Generador operativo (${Number(generationInput.value||0).toLocaleString('es')} kW)`,`Generator operating (${Number(generationInput.value||0).toLocaleString('en')} kW)`);
  if(!r.ok){const [es,en]=r.error.split(' / ');label(emergencyStatus,es,en);state(emergencyStatus,null);for(const k of ['stormUse','returnUse','extra','emergencyTotal','maxWait','limit','returnReserve'])articles[k].querySelector('strong').textContent='—';label(enduranceNote,es,en);state(enduranceNote,null);scenarioList.replaceChildren();return null;}
  articles.stormUse.querySelector('strong').textContent=fmt(r.waitKWh,'kWh');articles.returnUse.querySelector('strong').textContent=fmt(r.returnKWh,'kWh');articles.extra.querySelector('strong').textContent=fmt(r.extraKWh,'kWh');articles.emergencyTotal.querySelector('strong').textContent=fmt(r.requiredKWh,'kWh');
  articles.emergencyTotal.dataset.deficit=String(!r.withinCapacity);
  label(emergencyStatus,r.withinCapacity?`✓ Reserva dentro de la capacidad nominal de ${r.capacityKWh} kWh.`:`⚠ Reserva superior a la batería nominal de ${r.capacityKWh} kWh.`,r.withinCapacity?`✓ Reserve within the nominal ${r.capacityKWh} kWh capacity.`:`⚠ Reserve exceeds the nominal ${r.capacityKWh} kWh battery.`);state(emergencyStatus,r.withinCapacity);
  renderEndurance(emergencyInput);return r;
 }
 const hoursText=(h,language)=>{const text=(es,en)=>language?language==='en'?en:es:ui(es,en);return Number.isFinite(h)?`${h.toFixed(1)} h (${(h/calc.SOL_HOURS).toFixed(2)} ${text('soles','sols')})`:text('Sin límite de energía','No energy limit');};
 const LIMITS={'energy':['La batería','The battery'],'life-support':['El soporte vital','Life support'],'energy-return':['La batería no alcanza ni para regresar','The battery cannot even cover the return'],'life-return':['El regreso supera el soporte vital restante','Return exceeds remaining life support']};
 const VERDICT={ok:['✓ Se puede esperar','✓ Can be waited out'],energy:['⚠ Supera la batería','⚠ Exceeds the battery'],'life-support':['⚠ Supera el soporte vital','⚠ Exceeds life support'],both:['⚠ Supera batería y soporte vital','⚠ Exceeds battery and life support']};
 function renderEndurance(input){
  const e=calc.endurance(input,options()),sc=calc.scenarios(input,options());
  if(!e.ok||!sc.ok){scenarioList.replaceChildren();return;}
  articles.maxWait.querySelector('strong').textContent=hoursText(e.maxStormHours);
  articles.limit.querySelector('strong').textContent=ui(...LIMITS[e.limitingFactor]);
  articles.returnReserve.querySelector('strong').textContent=fmt(e.returnReserveKWh,'kWh');
  articles.maxWait.dataset.deficit=String(e.maxStormHours<=0);
  const reason=e.energyReturnOk?['El tiempo de regreso supera el soporte vital restante: no hay espera ni regreso viables con estos parámetros.','Return time exceeds remaining life support: neither waiting nor returning is feasible with these inputs.']:['La reserva para el regreso supera la batería: no hay espera posible con estos parámetros.','The return reserve exceeds the battery: no waiting is possible with these inputs.'];
  label(enduranceNote,e.canReturn?`Espera máxima: ${hoursText(e.maxStormHours,'es')}, dejando tiempo para regresar. Soporte vital restante: ${e.remainingLifeSupportSols.toFixed(2)} soles; transcurridos: ${e.elapsedSols.toFixed(2)} de ${e.lifeSupportSols.toFixed(0)} soles. Sin tiempo transcurrido declarado se asume salida (0 soles). Supone batería al 100 % al empezar la tormenta.`:reason[0],e.canReturn?`Maximum wait: ${hoursText(e.maxStormHours,'en')}, allowing time to return. Remaining life support: ${e.remainingLifeSupportSols.toFixed(2)} sols; elapsed: ${e.elapsedSols.toFixed(2)} of ${e.lifeSupportSols.toFixed(0)} sols. Missing elapsed time assumes departure (0 sols). Assumes a full battery when the storm starts.`:reason[1]);
  state(enduranceNote,e.canReturn&&e.maxStormHours>0);
  scenarioList.replaceChildren(...sc.scenarios.map(row=>{
   const a=document.createElement('article'),b=make('b',null,`${row.es} · ${row.sols} soles`,`${row.en} · ${row.sols} sols`),strong=make('strong',null,...VERDICT[row.verdict]),small=make('small',null,`Reserva requerida ${row.requiredKWh.toFixed(1)} kWh. ${row.basisEs}`,`Required reserve ${row.requiredKWh.toFixed(1)} kWh. ${row.basisEn}`),use=make('button','secondary','Usar esta duración','Use this duration');
   use.type='button';use.addEventListener('click',()=>{inputs.stormHours.value=String(Number(row.stormHours.toFixed(1)));updateEmergency();});
   a.dataset.deficit=String(row.verdict!=='ok');a.append(b,strong,small,use);return a;
  }));
 }
 function update(){updateMission();updateEmergency();}
 window.addEventListener?.('jezero:languagechange',update);
 window.addEventListener?.('jezero:supportchange',update);
 // Al abrir la emergencia se copian los datos de la misión como punto de partida (el usuario puede cambiarlos).
 emergency.addEventListener('toggle',()=>{if(!emergency.open)return;inputs.returnDistance.value=inputs.distance.value;inputs.returnSpeed.value=inputs.speed.value;inputs.returnTraction.value=inputs.traction.value;updateEmergency();});
 for(const input of Object.values(inputs))input.addEventListener('input',update);
 generatorInput.addEventListener('change',updateEmergency);useChariot.addEventListener('click',loadChariot);
 const openCalculator=make('button','opsPrimary','Abrir calculadora de misión y emergencia','Open mission and emergency calculator');openCalculator.type='button';openCalculator.id='openChariotCalculator';openCalculator.setAttribute('aria-controls','chariotCalculator');title.tabIndex=-1;
 openCalculator.addEventListener('click',()=>{card.scrollIntoView({behavior:'smooth',block:'start'});title.focus({preventScroll:true});});
 host.prepend(openCalculator);host.append(card);loadChariot();updateDust();
 window.JEZERO_CHARIOT_CALCULATOR=Object.freeze({update,reload:loadChariot,updateDust});
})();
