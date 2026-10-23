(() => {
  const KEY = 'jezero-theme-v31';
  const DEFAULT = 'nasa-classic';
  const THEMES = {
    'nasa-classic': {
      label:{es:'NASA Clásico',en:'NASA Classic'},
      description:{es:'Azul aeroespacial, terracota y blanco técnico de alta precisión.',en:'Aerospace navy, warm terracotta and high-precision technical white.'},
      colors:{
        bg:'#090d16',bg2:'#0d1424',panel:'#111a2e',panel2:'#16223b',panel3:'#1c2b4a',line:'#1e3256',lineStrong:'#2d4b80',
        text:'#f8fafc',muted:'#94a3b8',soft:'#64748b',primary:'#1d4ed8',primary2:'#3b82f6',accent:'#ea580c',accent2:'#38bdf8',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(59,130,246,.04)',glow:'rgba(59,130,246,.08)',mapText:'#FFFFFF'
      }
    },
    'artemis-lunar': {
      label:{es:'Artemis Lunar',en:'Artemis Lunar'},
      description:{es:'Grafito obsidiana, plata lunar y cobalto frío de navegación.',en:'Obsidian graphite, lunar silver and cold navigation cobalt.'},
      colors:{
        bg:'#0b0d11',bg2:'#111419',panel:'#161a22',panel2:'#1c222c',panel3:'#242b38',line:'#26303e',lineStrong:'#3d4b60',
        text:'#f1f5f9',muted:'#94a3b8',soft:'#64748b',primary:'#2563eb',primary2:'#60a5fa',accent:'#cbd5e1',accent2:'#93c5fd',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(148,163,184,.04)',glow:'rgba(96,165,250,.06)',mapText:'#FFFFFF'
      }
    },
    'deep-space': {
      label:{es:'Espacio Profundo',en:'Deep Space'},
      description:{es:'Crepúsculo índigo, violeta sutil y cian para instrumentación moderna.',en:'Twilight indigo, subtle violet and cyan for modern instrumentation.'},
      colors:{
        bg:'#0a0912',bg2:'#100e1b',panel:'#151224',panel2:'#1c1830',panel3:'#252040',line:'#322a54',lineStrong:'#4d4180',
        text:'#f8f7ff',muted:'#a59fc4',soft:'#6e6790',primary:'#4f46e5',primary2:'#6366f1',accent:'#a855f7',accent2:'#38bdf8',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(99,102,241,.04)',glow:'rgba(168,85,247,.06)',mapText:'#FFFFFF'
      }
    },
    'mars-science': {
      label:{es:'Ciencia Marciana',en:'Mars Science'},
      description:{es:'Basalto umber, terracota cálido y cobre técnico.',en:'Umber basalt, warm terracotta and technical copper.'},
      colors:{
        bg:'#0d0a08',bg2:'#140f0c',panel:'#1a1410',panel2:'#221a15',panel3:'#2b211b',line:'#3b2c23',lineStrong:'#5c4537',
        text:'#faf5ef',muted:'#baa596',soft:'#7e6c60',primary:'#9a3412',primary2:'#c2410c',accent:'#ea580c',accent2:'#38bdf8',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(194,65,12,.04)',glow:'rgba(234,88,12,.06)',mapText:'#FFFFFF'
      }
    },
    'aurora-teal': {
      label:{es:'Aurora Teal',en:'Aurora Teal'},
      description:{es:'Picea oscura, verde eucalipto y menta de alta visibilidad.',en:'Dark spruce, eucalyptus green and high-visibility mint.'},
      colors:{
        bg:'#070d0f',bg2:'#0b1417',panel:'#101c20',panel2:'#16262c',panel3:'#1e333a',line:'#264149',lineStrong:'#3a606b',
        text:'#f0fdf4',muted:'#86a3a9',soft:'#5a757b',primary:'#0f766e',primary2:'#14b8a6',accent:'#10b981',accent2:'#38bdf8',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(20,184,166,.04)',glow:'rgba(20,184,166,.06)',mapText:'#FFFFFF'
      }
    },
    'eva-contrast': {
      label:{es:'EVA Alto Contraste',en:'EVA High Contrast'},
      description:{es:'Pizarra profunda, ámbar operacional y blanco nítido con lectura AAA.',en:'Deep slate, operational amber and crisp white with AAA readability.'},
      colors:{
        bg:'#04060a',bg2:'#080c14',panel:'#0e1420',panel2:'#141d2e',panel3:'#1c283e',line:'#334155',lineStrong:'#64748b',
        text:'#ffffff',muted:'#cbd5e1',soft:'#94a3b8',primary:'#1d4ed8',primary2:'#60a5fa',accent:'#f59e0b',accent2:'#38bdf8',
        success:'#10b981',warning:'#f59e0b',danger:'#ef4444',grid:'rgba(255,255,255,.03)',glow:'rgba(245,158,11,.05)',mapText:'#FFFFFF'
      }
    }
  };

  const normalize = key => THEMES[key] ? key : DEFAULT;
  const language = () => window.JEZERO_I18N?.getLanguage?.() || document.documentElement.lang || 'es';
  const currentKey = () => normalize(localStorage.getItem(KEY) || DEFAULT);

  function applyVariables(colors){
    const root=document.documentElement;
    const vars={
      '--theme-bg':colors.bg,'--theme-bg-2':colors.bg2,'--theme-panel':colors.panel,'--theme-panel-2':colors.panel2,'--theme-panel-3':colors.panel3,
      '--theme-line':colors.line,'--theme-line-strong':colors.lineStrong,'--theme-text':colors.text,'--theme-muted':colors.muted,'--theme-soft':colors.soft,
      '--theme-primary':colors.primary,'--theme-primary-2':colors.primary2,'--theme-accent':colors.accent,'--theme-accent-2':colors.accent2,
      '--theme-success':colors.success,'--theme-warning':colors.warning,'--theme-danger':colors.danger,'--theme-grid':colors.grid,'--theme-glow':colors.glow,
      '--bg':colors.bg,'--panel':colors.panel,'--panel-2':colors.panel2,'--panel-3':colors.panel3,'--line':colors.line,'--text':colors.text,
      '--muted':colors.muted,'--soft':colors.soft,'--mars':colors.accent,'--mars-2':colors.primary,'--sand':colors.accent2,'--teal':colors.success,
      '--cyan':colors.accent2,'--danger':colors.danger,'--warning':colors.warning,'--nasa-blue':colors.primary,'--nasa-blue-bright':colors.primary2,
      '--nasa-red':colors.accent,'--mission-white':colors.text,
      '--surface-canvas':colors.bg,'--surface-panel':colors.panel,'--surface-card':colors.panel2,'--surface-elevated':colors.panel3,
      '--border-subtle':colors.line,'--border-strong':colors.lineStrong,'--text-primary':colors.text,'--text-secondary':colors.muted
    };
    Object.entries(vars).forEach(([k,v])=>root.style.setProperty(k,v));
  }

  function syncUi(key){
    document.querySelectorAll('input[name="themeSetting"]').forEach(input=>{ input.checked=input.value===key; });
    document.querySelectorAll('[data-theme-choice]').forEach(el=>el.classList.toggle('is-selected',el.dataset.themeChoice===key));
    const info=THEMES[key]; const lang=language()==='en'?'en':'es';
    const name=document.getElementById('themeCurrentName'); if(name) name.textContent=info.label[lang];
    const summary=document.getElementById('settingsThemeSummary'); if(summary) summary.textContent=info.label[lang];
    const langSummary=document.getElementById('settingsLanguageSummary'); if(langSummary) langSummary.textContent=lang==='en'?'English':'Español';
  }

  function setTheme(key,{persist=true,emit=true}={}){
    key=normalize(key); const info=THEMES[key];
    if(persist) localStorage.setItem(KEY,key);
    document.documentElement.dataset.theme=key;
    if(document.body) document.body.dataset.theme=key;
    applyVariables(info.colors);
    syncUi(key);
    if(emit) window.dispatchEvent(new CustomEvent('jezero:themechange',{detail:{theme:key,colors:{...info.colors}}}));
    return key;
  }

  function initControls(){
    const key=currentKey(); setTheme(key,{persist:false,emit:false});
    document.querySelectorAll('input[name="themeSetting"]').forEach(input=>input.addEventListener('change',()=>{
      if(input.checked) setTheme(input.value);
    }));
    document.querySelectorAll('[data-theme-choice]').forEach(card=>card.addEventListener('click',e=>{
      if(e.target.closest('input')) return;
      const input=card.querySelector('input[name="themeSetting"]'); if(input){input.checked=true;setTheme(input.value);}
    }));
    window.addEventListener('jezero:languagechange',()=>syncUi(currentKey()));
    syncUi(key);
  }

  window.JEZERO_THEMES=Object.freeze({
    keys:()=>Object.keys(THEMES),
    getTheme:currentKey,
    setTheme,
    getColors:()=>({...THEMES[currentKey()].colors}),
    getThemeInfo:(lang=language())=>{const k=currentKey(),i=THEMES[k],l=lang==='en'?'en':'es';return {key:k,label:i.label[l],description:i.description[l],colors:{...i.colors}};},
    getLabel:(key=currentKey(),lang=language())=>{const i=THEMES[normalize(key)],l=lang==='en'?'en':'es';return i.label[l];}
  });

  setTheme(currentKey(),{persist:false,emit:false});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initControls,{once:true}); else initControls();
})();
