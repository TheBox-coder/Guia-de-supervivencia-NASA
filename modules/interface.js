(() => {
  const byId=id=>document.getElementById(id);
  const text=(id,value)=>{const el=byId(id);if(el&&el.textContent!==value)el.textContent=value;};
  const copy=(es,en)=>window.JEZERO_I18N?.getLanguage?.()==='en'?en:es;
  const mobile=()=>window.matchMedia('(max-width:760px)').matches;
  let previousCount=-1,previousResult=false;
  const icons={
    home:'<path d="M3 11l9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    operations:'<path d="M12 3l8 4v5c0 5-8 9-8 9S4 17 4 12V7zM12 8v8m-4-4h8"/>',
    weather:'<path d="M7 16H5a4 4 0 1 1 1-8 6 6 0 0 1 11-1 4 4 0 1 1 2 9h-2M8 20l1-2m3 2 1-2m3 2 1-2"/>',
    survival:'<path d="M12 3l8 4v5c0 5-8 9-8 9S4 17 4 12V7z"/><path d="M8 12l3 3 5-6"/>',
    explorer:'<circle cx="12" cy="12" r="8"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
    planner:'<circle cx="6" cy="17" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 17h4a4 4 0 0 0 0-8H9a3 3 0 0 1 0-6h7"/>',
    eva:'<path d="M3 19L10 5l4 8 3-5 4 11z"/><path d="M10 5v-2"/>',
    analysis:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>'
  };
  document.querySelectorAll('[data-module-target]').forEach(button=>{
    const host=button.querySelector('span'),icon=icons[button.dataset.moduleTarget];
    if(host&&icon)host.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
  });
  function closePanel(){
    if(window.JEZERO_MODULES?.close){window.JEZERO_MODULES.close();return;}
    if(mobile())document.querySelector('.sidebar')?.classList.remove('mobile-open');
    else{const state=window.JEZERO_PANELS?.get();window.JEZERO_PANELS?.set(false,state?.right);}
    document.querySelector(`[data-module-target="${document.body.dataset.module}"]`)?.focus();
  }
  byId('uiClosePanel')?.addEventListener('click',closePanel);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.sidebar.mobile-open'))closePanel();});
  byId('uiPickOnMap')?.addEventListener('click',()=>{
    window.JEZERO_UI_ACTIONS?.beginMapSelection();
    if(mobile())document.querySelector('.sidebar')?.classList.remove('mobile-open');
  });
  byId('uiStartMission')?.addEventListener('click',()=>{
    window.JEZERO_MODULES?.activate('planner');
    window.JEZERO_PANELS?.set(true,false);
    if(byId('uiPointEntry'))byId('uiPointEntry').open=true;
    byId('coordLatInput')?.focus();
  });
  byId('uiLoadExample')?.addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await window.JEZERO_UI_ACTIONS?.loadExample();window.JEZERO_MODULES?.activate('planner');}
    catch(error){window.showToast?.(error.message);}
    finally{button.disabled=false;}
  });
  function update(){
    const count=Number(byId('pointCount')?.textContent)||0;
    const result=byId('routeStatus')?.textContent||'';
    const hasResult=count>=2 && !['SIN RUTA','NO ROUTE',''].includes(result);
    document.body.dataset.missionState=hasResult?'ready':count?'building':'empty';
    const labels={explorer:copy('Mapa y capas','Map and layers'),planner:copy('Tu misión','Your mission'),eva:copy('Recorrido EVA','EVA traverse'),analysis:copy('Resultados','Results'),settings:copy('Configuración','Settings')};
    text('uiPanelTitle',labels[document.body.dataset.module]||labels.planner);
    text('uiCalcHint',count<2?copy('Añade una base y un objetivo para comenzar.','Add a base and a target to begin.'):hasResult?copy('Puedes comparar las alternativas en Resultados.','Compare the alternatives in Results.'):copy('Tu misión está lista para calcular.','Your mission is ready to calculate.'));
    text('dropHintTitle',copy('Suelta tu misión JSON','Drop your mission JSON'));text('dropHintCopy',copy('Se valida antes de cargarla','It is validated before loading'));
    text('uiPointEntryLabel',count?copy('Añadir otro punto','Add another point'):copy('Ubicación de la base','Base location'));
    const step=count===0?0:count===1?1:2;
    [['uiStepBase','headerStepBase'],['uiStepTargets','headerStepTargets'],['uiStepRoute','headerStepRoute']].forEach((ids,i)=>ids.forEach(id=>{const el=byId(id);el?.classList.toggle('is-current',i===step);el?.classList.toggle('is-done',i<step);}));
    [['headerStepBase','Base','Base'],['headerStepTargets','Objetivos','Targets'],['headerStepRoute','Ruta','Route']].forEach(([id,es,en])=>{const el=byId(id)?.querySelector('span');if(el&&el.textContent!==copy(es,en))el.textContent=copy(es,en);});
    const welcome=byId('uiCanvasWelcome');if(welcome)welcome.hidden=count>=2;
    text('uiWelcomeTitle',count?copy('Ahora, elige un objetivo','Now choose a target'):copy('Tu misión empieza aquí','Your mission starts here'));
    text('uiWelcomeCopy',count?copy('Tu base está definida. Añade al menos un punto de interés para comparar recorridos.','Your base is set. Add at least one point of interest to compare routes.'):copy('Convierte tus objetivos científicos en una travesía. Define el punto de partida o prueba un recorrido de ejemplo en Jezero.','Turn your scientific goals into a traverse. Define a starting point or try a sample route in Jezero.'));
    if(byId('uiLoadExample'))byId('uiLoadExample').hidden=count>0;
    text('uiStartMission',count?copy('Añadir objetivo','Add target'):copy('Elegir una base','Choose a base'));
    if(count!==previousCount){
      if(byId('coordTypeInput'))byId('coordTypeInput').value=count?'target':'base';
      if(byId('uiPointEntry'))byId('uiPointEntry').open=count<2;
      previousCount=count;
    }
    if(hasResult!==previousResult && !mobile() && document.body.dataset.module==='planner'){
      const state=window.JEZERO_PANELS?.get();window.JEZERO_PANELS?.set(state?.left!==false,hasResult);
    }
    if(byId('evaReturnHome'))byId('evaReturnHome').disabled=!hasResult;
    if(byId('evaEmptyState'))byId('evaEmptyState').hidden=hasResult;
    previousResult=hasResult;
  }
  const observer=new MutationObserver(update);
  ['pointCount','routeStatus'].forEach(id=>{const el=byId(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true});});
  window.addEventListener('jezero:modulechange',()=>{
    const module=document.body.dataset.module;
    if(document.body.dataset.interfaceOpen==='false'){window.JEZERO_PANELS?.set(false,false);update();return;}
    if(!mobile())window.JEZERO_PANELS?.set(!['home','analysis','survival','weather','operations'].includes(module),module==='eva'||(module==='planner'&&previousResult));
    document.querySelector('.sidebar .modulePanel.is-active .panelScroll')?.scrollTo(0,0);
    update();
  });
  window.addEventListener('jezero:languagechange',update);
  // Soltar un JSON de misión sobre la app: pasa por el mismo input de importación (límite de 5 MB y validación).
  const hasFiles=event=>[...(event.dataTransfer?.types||[])].includes('Files');
  let dragDepth=0;
  document.addEventListener('dragenter',event=>{if(!hasFiles(event))return;event.preventDefault();dragDepth++;document.body.classList.add('is-file-dragging');});
  document.addEventListener('dragover',event=>{if(hasFiles(event))event.preventDefault();});
  document.addEventListener('dragleave',event=>{if(!hasFiles(event))return;dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)document.body.classList.remove('is-file-dragging');});
  document.addEventListener('drop',event=>{
    if(!hasFiles(event))return;
    event.preventDefault();dragDepth=0;document.body.classList.remove('is-file-dragging');
    const file=event.dataTransfer.files[0],input=byId('importMissionFile');
    if(!file||!input)return;
    if(!/\.json$/i.test(file.name)&&file.type!=='application/json'){window.showToast?.(copy('Suelta un archivo de misión .json.','Drop a .json mission file.'));return;}
    if((Number(byId('pointCount')?.textContent)||0)>0&&!window.confirm(copy('¿Reemplazar el plan actual por la misión del archivo?','Replace the current plan with the mission in this file?')))return;
    const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;
    input.dispatchEvent(new Event('change'));
  });
  if(!mobile()){
    const state=window.JEZERO_PANELS?.get();window.JEZERO_PANELS?.set(['home','survival','weather','operations'].includes(document.body.dataset.module)?false:state?.left!==false,false);
  }
  update();
})();
