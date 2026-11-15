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
 const options=()=>({capacityKWh:capacityInput.value,generationKW:generationInput.value});
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
 emergency.append(summary,emergencyHint,emergencyForm,emergencyOut,emergencyStatus);
 const actions=make('div','chariotCalcActions');actions.append(useChariot);
 card.append(title,intro,chariotGrid,actions,chariotNote,missionForm,missionOut,missionStatus,emergency);
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
  const r=calc.emergency({stormHours:read('stormHours'),essentialKW:read('essential'),returnDistanceKm:read('returnDistance'),returnSpeedKmH:read('returnSpeed'),returnTractionKW:read('returnTraction'),marginPct:read('margin'),generatorOn:generatorInput.checked},options());
  label(generatorText,`Generador operativo (${Number(generationInput.value||0).toLocaleString('es')} kW)`,`Generator operating (${Number(generationInput.value||0).toLocaleString('en')} kW)`);
  if(!r.ok){const [es,en]=r.error.split(' / ');label(emergencyStatus,es,en);state(emergencyStatus,null);for(const k of ['stormUse','returnUse','extra','emergencyTotal'])articles[k].querySelector('strong').textContent='—';return null;}
  articles.stormUse.querySelector('strong').textContent=fmt(r.waitKWh,'kWh');articles.returnUse.querySelector('strong').textContent=fmt(r.returnKWh,'kWh');articles.extra.querySelector('strong').textContent=fmt(r.extraKWh,'kWh');articles.emergencyTotal.querySelector('strong').textContent=fmt(r.requiredKWh,'kWh');
  articles.emergencyTotal.dataset.deficit=String(!r.withinCapacity);
  label(emergencyStatus,r.withinCapacity?`✓ Reserva dentro de la capacidad nominal de ${r.capacityKWh} kWh.`:`⚠ Reserva superior a la batería nominal de ${r.capacityKWh} kWh.`,r.withinCapacity?`✓ Reserve within the nominal ${r.capacityKWh} kWh capacity.`:`⚠ Reserve exceeds the nominal ${r.capacityKWh} kWh battery.`);state(emergencyStatus,r.withinCapacity);return r;
 }
 function update(){updateMission();updateEmergency();}
 // Al abrir la emergencia se copian los datos de la misión como punto de partida (el usuario puede cambiarlos).
 emergency.addEventListener('toggle',()=>{if(!emergency.open)return;inputs.returnDistance.value=inputs.distance.value;inputs.returnSpeed.value=inputs.speed.value;inputs.returnTraction.value=inputs.traction.value;updateEmergency();});
 for(const input of Object.values(inputs))input.addEventListener('input',update);
 generatorInput.addEventListener('change',updateEmergency);useChariot.addEventListener('click',loadChariot);
 host.append(card);loadChariot();
 window.JEZERO_CHARIOT_CALCULATOR=Object.freeze({update,reload:loadChariot});
})();
