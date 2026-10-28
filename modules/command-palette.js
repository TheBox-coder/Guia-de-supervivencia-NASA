/* Paleta de comandos (Ctrl/⌘+K) y atajos de una tecla. Solo invoca acciones que ya existen en la interfaz. */
(() => {
  const $=id=>document.getElementById(id),ui=(es,en)=>window.JEZERO_I18N.ui(es,en);
  const enabled=id=>Boolean($(id))&&!$(id).disabled;
  const area=name=>document.querySelector(`.moduleRail [data-module-target="${name}"]`);
  const goTo=name=>window.JEZERO_MODULES.activate(name);
  const areas=[['home','Inicio','Home','H'],['survival','Guía de supervivencia','Survival guide'],['operations','Soporte','Support'],['weather','Clima','Weather'],['explorer','Mapa y capas','Map and layers','M'],['planner','Misión','Mission'],['eva','Recorrido EVA','EVA traverse'],['analysis','Resultados','Results','R'],['settings','Configuración','Settings']];
  const commands=()=>[
    ...areas.map(([name,es,en,key])=>({group:ui('Ir a','Go to'),label:ui(es,en),key,run:()=>goTo(name),available:()=>Boolean(area(name))})),
    {group:ui('Misión','Mission'),label:ui('Nueva misión','New mission'),key:'N',run:()=>$('planMode').click(),available:()=>enabled('planMode')},
    {group:ui('Misión','Mission'),label:ui('Calcular misión','Calculate mission'),run:()=>$('calculate').click(),available:()=>enabled('calculate')},
    {group:ui('Misión','Mission'),label:ui('Cargar misión de ejemplo en Jezero','Load sample Jezero mission'),run:async()=>{try{await window.JEZERO_UI_ACTIONS.loadExample();goTo('planner');}catch(error){window.showToast?.(error.message);}},available:()=>typeof window.JEZERO_UI_ACTIONS?.loadExample==='function'},
    {group:ui('Misión','Mission'),label:ui('Abrir misión desde JSON','Open mission from JSON'),run:()=>$('importMissionJson').click(),available:()=>enabled('importMissionJson')},
    {group:ui('Misión','Mission'),label:ui('Guardar misión en JSON','Save mission as JSON'),run:()=>$('exportMissionJson').click(),available:()=>enabled('exportMissionJson')},
    ...[['viking','Mapa base: Viking (imagen real)','Base map: Viking (real imagery)'],['mola','Mapa base: topografía MOLA','Base map: MOLA topography'],['hybrid','Mapa base: híbrido imagen + relieve','Base map: hybrid imagery + relief']].map(([id,es,en])=>({group:ui('Mapa','Map'),label:ui(es,en),run:()=>{goTo('explorer');document.querySelector(`[data-base-map="${id}"]`)?.click();},available:()=>Boolean(document.querySelector(`[data-base-map="${id}"]`))})),
    {group:ui('Vista','View'),label:ui('Mostrar u ocultar paneles','Show or hide panels'),run:()=>window.JEZERO_PANELS.toggleBoth(),available:()=>Boolean(window.JEZERO_PANELS)},
    {group:ui('Vista','View'),label:ui('Cambiar idioma a English','Switch language to Español'),run:()=>window.JEZERO_I18N.setLanguage(window.JEZERO_I18N.getLanguage()==='en'?'es':'en'),available:()=>typeof window.JEZERO_I18N?.setLanguage==='function'},
    {group:ui('Ayuda','Help'),label:ui('Abrir manual','Open manual'),key:'?',run:()=>document.querySelector('.topbarHelp').click(),available:()=>Boolean(document.querySelector('.topbarHelp'))}
  ].filter(command=>command.available());

  const dialog=document.createElement('dialog');dialog.className='commandPalette';
  dialog.innerHTML='<input id="commandInput" type="text" role="combobox" aria-expanded="true" aria-controls="commandList" aria-autocomplete="list" autocomplete="off" spellcheck="false"><ul id="commandList" role="listbox"></ul><p class="commandHint" id="commandHint"></p>';
  document.body.append(dialog);
  const input=$('commandInput'),list=$('commandList');
  let visible=[],active=0;

  const normalize=value=>value.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  function render(){
    const query=normalize(input.value.trim());
    visible=commands().filter(command=>!query||normalize(`${command.group} ${command.label}`).includes(query));
    active=Math.min(active,Math.max(visible.length-1,0));
    list.replaceChildren(...visible.map((command,i)=>{
      const item=document.createElement('li');item.id=`command-${i}`;item.setAttribute('role','option');item.setAttribute('aria-selected',String(i===active));
      const group=document.createElement('small');group.textContent=command.group;
      const label=document.createElement('span');label.textContent=command.label;
      item.append(group,label);
      if(command.key){const key=document.createElement('kbd');key.textContent=command.key;item.append(key);}
      item.addEventListener('mousemove',()=>{if(active!==i){active=i;render();}});
      item.addEventListener('click',()=>run(i));
      return item;
    }));
    if(!visible.length){const empty=document.createElement('li');empty.className='commandEmpty';empty.textContent=ui('Sin resultados','No results');list.append(empty);}
    input.setAttribute('aria-activedescendant',visible.length?`command-${active}`:'');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});
  }
  function open(){
    if(dialog.open)return;
    input.value='';active=0;
    input.placeholder=ui('Busca una acción o un área…','Search for an action or area…');
    input.setAttribute('aria-label',ui('Paleta de comandos','Command palette'));
    $('commandHint').textContent=ui('↑↓ para moverte · Enter para ejecutar · Esc para cerrar','↑↓ to move · Enter to run · Esc to close');
    render();dialog.showModal();input.focus();
  }
  function run(index){const command=visible[index];if(!command)return;dialog.close();command.run();}

  input.addEventListener('input',()=>{active=0;render();});
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(visible.length){active=(active+(event.key==='ArrowDown'?1:-1)+visible.length)%visible.length;render();}}
    else if(event.key==='Enter'){event.preventDefault();run(active);}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});

  const typing=target=>['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable;
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();dialog.open?dialog.close():open();return;}
    if(event.ctrlKey||event.metaKey||event.altKey||typing(event.target)||document.querySelector('dialog[open]'))return;
    const shortcut={h:'home',m:'explorer',r:'analysis'}[event.key.toLowerCase()];
    if(shortcut){event.preventDefault();goTo(shortcut);}
    else if(event.key.toLowerCase()==='n'&&enabled('planMode')){event.preventDefault();$('planMode').click();}
  });

  const trigger=$('openCommands');
  if(trigger){
    const mac=/Mac|iPhone|iPad/.test(navigator.platform);
    trigger.querySelector('kbd').textContent=mac?'⌘K':'Ctrl K';
    trigger.addEventListener('click',open);
    const label=()=>{trigger.querySelector('span').textContent=ui('Buscar','Search');trigger.title=ui('Paleta de comandos','Command palette')+(mac?' (⌘K)':' (Ctrl+K)');};
    label();window.addEventListener('jezero:languagechange',label);
  }

  window.JEZERO_COMMANDS=Object.freeze({open});
})();
