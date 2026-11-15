/* V45: contexto declarado para el cálculo de rutas, panel de factores y leyenda de dificultad.
   Solo usa datos que ya existen en la app (histórico meteorológico cargado, refugios y enlaces declarados).
   Lo que no está cargado queda como "sin dato" y no se aplica al cálculo. */
(function(){
  const ui=(es,en)=>window.JEZERO_I18N?.ui?.(es,en)??es;
  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  let lastMission=null,toggle=null;
  const DIFF=[['easy','Fácil','Easy','#34d399'],['moderate','Moderado','Moderate','#fbbf24'],['demanding','Exigente','Demanding','#fb923c'],['critical','Crítico','Critical','#f43f5e']];
  const BREAKDOWN={slope:['Pendiente máxima','Max slope'],transit:['Transitabilidad mínima','Min traversability'],uncertainty:['Incertidumbre del DEM','DEM uncertainty'],roughness:['Rugosidad','Roughness'],cross:['Pendiente lateral','Cross slope'],hollow:['Depresiones','Hollows'],turns:['Giros bruscos','Sharp turns'],refuge:['Lejanía de refugio','Distance from shelter'],comms:['Huecos de comunicaciones','Comms gaps'],environment:['Polvo, viento y radiación','Dust, wind, radiation']};
  const hash=text=>{let h=5381;for(let i=0;i<text.length;i++)h=((h<<5)+h+text.charCodeAt(i))>>>0;return h.toString(36);};

  function missionOrigin(){
    try{if(typeof missionPoints!=='undefined'&&missionPoints?.length){const b=missionPoints.find(p=>p.type==='base')||missionPoints[0];if(finite(b?.lat)&&finite(b?.lon))return {lat:Number(b.lat),lon:Number(b.lon)};}}catch{}
    return null;
  }
  function context(){
    const enabled=toggle?toggle.checked:true;
    const out={dustTau:null,windMps:null,doseRateUSvH:null,refuges:[],relays:[]},sources={dust:null,wind:null,dose:null};
    try{
      const origin=missionOrigin(),data=window.JEZERO_SURVIVAL?.getApplicableDataset?.();
      if(origin&&data&&window.JEZERO_SURVIVAL_ENGINE?.observationForecast){
        const f=window.JEZERO_SURVIVAL_ENGINE.observationForecast(data,origin),c=f?.status==='projection'?f.conditions:null;
        if(finite(c?.dust?.median)){out.dustTau=Number(c.dust.median);sources.dust='observed';}
        if(finite(c?.wind?.max)){out.windMps=Number(c.wind.max);sources.wind='observed';}
        if(finite(c?.radiation?.median)){out.doseRateUSvH=Number(c.radiation.median);sources.dose='observed';}
      }
    }catch{}
    try{
      const ops=window.JEZERO_OPERATIONS?.getState?.();
      if(ops){
        out.refuges=(ops.shelters||[]).filter(x=>finite(x.lat)&&finite(x.lon)&&x.available!==false).map(x=>({lat:Number(x.lat),lon:Number(x.lon)}));
        out.relays=(ops.relays||[]).filter(x=>finite(x.lat)&&finite(x.lon)&&Number(x.radiusKm)>0).map(x=>({lat:Number(x.lat),lon:Number(x.lon),radiusKm:Number(x.radiusKm)}));
        if(out.doseRateUSvH===null&&finite(ops.radiation?.rateUSvH)){out.doseRateUSvH=Number(ops.radiation.rateUSvH);sources.dose='declared';}
      }
    }catch{}
    const has=out.dustTau!==null||out.windMps!==null||out.doseRateUSvH!==null||out.refuges.length||out.relays.length;
    const key=has?hash(JSON.stringify([out.dustTau,out.windMps,out.doseRateUSvH,out.refuges.map(r=>[r.lat,r.lon]),out.relays.map(r=>[r.lat,r.lon,r.radiusKm])])):'';
    return {enabled:Boolean(enabled&&has),switchedOn:Boolean(enabled),context:out,sources,key,counts:{refuges:out.refuges.length,relays:out.relays.length}};
  }

  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function ensureControls(){
    if(!toggle&&$('optimizeOrder')){
      const label=el('label','returnCheck routeContextCheck');
      toggle=document.createElement('input');toggle.type='checkbox';toggle.id='useRouteContext';toggle.checked=true;
      const span=el('span');span.dataset.routeText='context-toggle';
      label.append(toggle,span);
      const anchor=$('optimizeOrder').closest('label');
      (anchor?.parentNode||$('optimizeOrder').parentNode).insertBefore(label,anchor?anchor.nextSibling:null);
      toggle.addEventListener('change',()=>{window.dispatchEvent(new CustomEvent('jezero:routecontextchange'));render(lastMission);});
    }
    const hud=$('missionHud');
    if(hud&&!$('hudDifficulty')){
      const cell=(id,es,en)=>{const c=el('div','missionHudCell routeIntelCell'),s=el('span'),b=el('b','', '—');s.dataset.es=es;s.dataset.en=en;b.id=id;c.append(s,b);return c;};
      hud.append(cell('hudDifficulty','DIFICULTAD','DIFFICULTY'),cell('hudDuration','DURACIÓN','DURATION'));
      if(window.JEZERO_ROUTE_SCENE){const b=el('button','missionHudScene');b.type='button';b.id='hudScene';b.addEventListener('click',()=>window.JEZERO_ROUTE_SCENE.open());hud.append(b);}
    }
    const map=hud?.parentElement;
    if(map&&!$('routeDifficultyLegend')){
      const box=el('div','routeDifficultyLegend');box.id='routeDifficultyLegend';box.hidden=true;
      box.setAttribute('role','group');
      map.append(box);
    }
    if(!$('routeFactorsCard')){
      const anchor=document.querySelector('.terrainResultCard');
      if(anchor){const card=el('section','terrainResultCard routeFactorsCard');card.id='routeFactorsCard';anchor.parentNode.insertBefore(card,anchor.nextSibling);}
    }
  }
  const fmt=(v,d=1)=>finite(v)?Number(v).toFixed(d):'—';
  function sourceText(s){return s==='observed'?ui('observado en el histórico','observed in loaded history'):s==='declared'?ui('declarado','declared'):ui('sin dato · no se aplica','no data · not applied');}

  function renderLegend(mission){
    const box=$('routeDifficultyLegend');if(!box)return;
    box.hidden=!mission;box.replaceChildren();
    if(!mission)return;
    box.append(el('strong','',ui('DIFICULTAD DEL TRAMO','SEGMENT DIFFICULTY')));
    const ramp=el('div','routeLegendRamp');
    for(const [id,es,en,color] of DIFF){const item=el('span','routeLegendStep');item.style.setProperty('--step',color);item.append(el('i'),el('em','',ui(es,en)));item.dataset.cls=id;ramp.append(item);}
    box.append(ramp);
    box.append(el('small','',ui('△ pendiente, pendiente lateral o giro brusco · ○ marca de distancia','△ slope, cross slope or sharp turn · ○ distance mark')));
    if(window.JEZERO_ROUTE_SCENE){const b=el('button','routeSceneOpen',ui('Vista 3D y recorrido','3D view and flyover'));b.type='button';b.addEventListener('click',()=>window.JEZERO_ROUTE_SCENE.open());box.append(b);}
  }
  function renderCard(mission){
    const card=$('routeFactorsCard');if(!card)return;
    card.replaceChildren();
    card.append(el('div','sectionTitle',ui('FACTORES DE RUTA','ROUTE FACTORS')));
    if(!mission){card.append(el('p','routeFactorsEmpty',ui('Calcula una misión para ver qué pesó en la ruta, más allá de la pendiente.','Calculate a mission to see what shaped the route beyond slope.')));return;}
    const m=mission.metrics||{},intel=context(),c=m.context||{};
    const applied=Boolean(c.present);
    const chips=el('div','routeContextChips');
    const chip=(label,value,state)=>{const a=el('article','routeContextChip');a.dataset.state=state;a.append(el('b','',label),el('strong','',value));chips.append(a);};
    chip(ui('Polvo τ','Dust τ'),finite(c.dustTau)?`${fmt(c.dustTau,2)} · ${sourceText(intel.sources.dust)}`:sourceText(null),finite(c.dustTau)?'on':'off');
    chip(ui('Viento máx.','Peak wind'),finite(c.windMps)?`${fmt(c.windMps,1)} m/s · ${sourceText(intel.sources.wind)}`:sourceText(null),finite(c.windMps)?'on':'off');
    chip(ui('Radiación','Radiation'),finite(c.doseRateUSvH)?`${fmt(c.doseRateUSvH,1)} µSv/h · ${sourceText(intel.sources.dose)}`:sourceText(null),finite(c.doseRateUSvH)?'on':'off');
    chip(ui('Refugios','Shelters'),c.refugeCount?`${c.refugeCount} ${ui('declarados','declared')}`:sourceText(null),c.refugeCount?'on':'off');
    chip(ui('Enlaces de comunicación','Comms relays'),c.relayCount?`${c.relayCount} ${ui('con radio declarado','with declared radius')}`:sourceText(null),c.relayCount?'on':'off');
    card.append(chips);
    if(!intel.switchedOn)card.append(el('p','routeFactorsNote',ui('El contexto está desactivado: la ruta solo usa el terreno.','Context is off: the route only uses terrain.')));
    else if(!applied&&intel.enabled)card.append(el('p','routeFactorsNote warn',ui('Hay contexto nuevo desde el último cálculo. Recalcula para aplicarlo.','There is new context since the last calculation. Recalculate to apply it.')));
    else if(applied&&mission.params?.contextKey&&intel.key&&mission.params.contextKey!==intel.key)card.append(el('p','routeFactorsNote warn',ui('El clima o el soporte cambiaron desde el cálculo. Recalcula para aplicarlos.','Weather or support data changed since the calculation. Recalculate to apply them.')));
    const breakdown=mission.breakdown||[];
    if(breakdown.length){
      card.append(el('p','routeFactorsCaption',ui(`Qué pesa en la dificultad · tramo más exigente${mission.breakdownLeg?` (${mission.breakdownLeg})`:''}`,`What drives difficulty · hardest leg${mission.breakdownLeg?` (${mission.breakdownLeg})`:''}`)));
      const list=el('div','routeBreakdown');
      for(const item of breakdown){
        const row=el('div','routeBreakdownRow');row.dataset.id=item.id;
        const label=BREAKDOWN[item.id]||[item.id,item.id];
        row.append(el('span','',ui(label[0],label[1])));
        const bar=el('i');const fill=el('u');fill.style.width=item.points===null?'0%':`${Math.min(100,item.points/item.max*100)}%`;bar.append(fill);row.append(bar);
        row.append(el('b','',item.points===null?ui('sin dato','no data'):`${fmt(item.points,1)} / ${item.max}`));
        list.append(row);
      }
      card.append(list);
    }
    const facts=[
      [ui('Pendiente lateral media / máx.','Cross slope avg / max'),finite(m.avgCrossSlopeDeg)?`${fmt(m.avgCrossSlopeDeg)}° / ${fmt(m.maxCrossSlopeDeg)}°`:'—'],
      [ui('Relieve local medio','Mean local relief'),finite(m.avgReliefM)?`${fmt(m.avgReliefM,1)} m`:'—'],
      [ui('Tramo en depresiones','Distance in hollows'),`${fmt(m.hollowDistanceKm,2)} km`],
      [ui('Giros bruscos (≥60°)','Sharp turns (≥60°)'),String(m.sharpTurns??0)],
      [ui('Índice de esfuerzo (1 = llano)','Effort index (1 = flat)'),finite(m.effortIndex)?fmt(m.effortIndex,2):'—'],
      [ui('Refugio más lejano','Farthest shelter'),finite(m.maxRefugeDistanceKm)?`${fmt(m.maxRefugeDistanceKm,2)} km`:ui('sin refugios declarados','no shelters declared')],
      [ui('Cobertura de enlaces','Relay coverage'),finite(m.relayCoverage)?`${Math.round(m.relayCoverage*100)} %`:ui('sin enlaces declarados','no relays declared')],
      [ui('Dosis estimada (tasa constante)','Estimated dose (constant rate)'),finite(m.exposureUSv)?`${fmt(m.exposureUSv,0)} µSv`:ui('sin tasa de radiación','no radiation rate')]
    ];
    const grid=el('div','routeFactorFacts');
    for(const [label,value] of facts){const a=el('article');a.append(el('b','',label),el('strong','',value));grid.append(a);}
    card.append(grid);
    card.append(el('p','routeFactorsNote',ui('Los pesos son heurísticos de planificación, no límites de seguridad. El índice de esfuerzo es relativo, sin calibración metabólica. Sin dato, un factor no se aplica.','Weights are planning heuristics, not safety limits. The effort index is relative and not metabolically calibrated. A factor with no data is not applied.')));
  }
  function render(mission){
    ensureControls();
    lastMission=mission||null;
    document.querySelectorAll('.routeIntelCell > span').forEach(s=>{s.textContent=ui(s.dataset.es,s.dataset.en);});
    const text=toggle?.parentElement?.querySelector('[data-route-text="context-toggle"]');
    if(text)text.textContent=ui('Usar clima observado y soporte declarado en la ruta','Use observed weather and declared support in the route');
    if($('hudScene')){$('hudScene').textContent=ui('Vista 3D','3D view');$('hudScene').hidden=!mission;}
    if($('hudDifficulty')){
      const score=mission?.score;
      $('hudDifficulty').textContent=finite(score)?`${Math.round(score)}/100`:'—';
    }
    if($('hudDuration'))$('hudDuration').textContent=finite(mission?.duration)?formatHoursLocal(mission.duration):'—';
    renderLegend(mission);
    renderCard(mission);
  }
  function formatHoursLocal(h){const mins=Math.round(Number(h)*60);return `${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')} min`;}
  function init(){ensureControls();render(lastMission);}
  ['jezero:languagechange','jezero:weatherchange','jezero:supportchange'].forEach(name=>window.addEventListener(name,()=>render(lastMission)));
  window.JEZERO_ROUTE_INTEL=Object.freeze({context,render,init});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
