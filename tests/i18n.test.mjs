import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function locale(){
 const storage=new Map(),nodes=[],elements=[];let observe;
 class Element{
  constructor(attrs={}){this.attrs={...attrs};this.nodeType=1;this.tagName='SPAN';this.listeners={};this.value='es';elements.push(this);}
  hasAttribute(k){return Object.hasOwn(this.attrs,k);}getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=String(v);}
  closest(){return ['data-i18n-skip','data-ops-es','data-weather-es'].some(k=>this.hasAttribute(k))?this:null;}
  querySelectorAll(){return [];}addEventListener(name,fn){this.listeners[name]=fn;}
 }
 const quick=new Element(),settings=new Element();
 const document={documentElement:{},getElementById:id=>({quickLanguage:quick,languageSetting:settings})[id]||null,querySelectorAll:()=>elements,
  createTreeWalker(root,_type,filter){const list=nodes.filter(n=>(root===document||n.parentElement===root)&&filter.acceptNode(n)===1);let i=0;return{nextNode:()=>list[i++]||null};}};
 const context=vm.createContext({window:{dispatchEvent(){}},document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},NodeFilter:{SHOW_TEXT:4,FILTER_ACCEPT:1,FILTER_REJECT:2},CustomEvent:class{},MutationObserver:class{constructor(fn){observe=fn;}observe(){}}});
 for(const path of ['../modules/locale.js','../modules/i18n.js'])vm.runInContext(fs.readFileSync(new URL(path,import.meta.url),'utf8'),context);
 const text=(value,attrs={})=>{const node={nodeType:3,nodeValue:value,parentElement:new Element(attrs)};nodes.push(node);return node;};
 return {api:context.window.JEZERO_I18N,document,storage,quick,settings,Element,text,mutate:m=>observe([m])};
}

test('language selectors stay synchronized, persist and restore original Spanish after repeated switches',()=>{
 const x=locale(),title=x.text('Revisar límites'),diagnostic=x.text('La ruta final incumple límites en el segmento 2: pendiente 32.0° > 20.0°, calidad de muestreo 10% < 20%.');const original=diagnostic.nodeValue;
 x.quick.listeners.change({target:{value:'en'}});
 assert.equal(x.api.getLanguage(),'en');assert.equal(x.quick.value,'en');assert.equal(x.settings.value,'en');assert.equal(x.document.documentElement.lang,'en');assert.equal(x.storage.get('jezero-language-v36'),'en');
 assert.equal(title.nodeValue,'Review limits');assert.match(diagnostic.nodeValue,/segment 2/);assert.match(diagnostic.nodeValue,/32\.0° > 20\.0°/);assert.doesNotMatch(diagnostic.nodeValue,/pendiente|calidad de muestreo/);
 for(let i=0;i<3;i++){x.api.setLanguage('es');assert.equal(title.nodeValue,'Revisar límites');assert.equal(diagnostic.nodeValue,original);x.api.setLanguage('en');}
 diagnostic.nodeValue='No se recibió elevación para uno de los puntos de la misión.';x.mutate({type:'characterData',target:diagnostic});assert.equal(diagnostic.nodeValue,'No elevation was received for one of the mission waypoints.');
});

test('new elements and dynamic accessible labels follow the language without translating preserved source text',()=>{
 const x=locale();x.api.setLanguage('en');const el=new x.Element({title:'Revisar límites',alt:'Mapa interactivo de Marte'});
 x.mutate({type:'childList',addedNodes:[el]});assert.equal(el.getAttribute('title'),'Review limits');assert.equal(el.getAttribute('alt'),'Interactive Mars map');
 el.setAttribute('title','Cerrar panel');x.mutate({type:'attributes',target:el,attributeName:'title'});assert.equal(el.getAttribute('title'),'Close panel');
 delete el.attrs.title;x.mutate({type:'attributes',target:el,attributeName:'title'});assert.equal(el.hasAttribute('title'),false);
 const source=x.text('Revisar límites',{'data-i18n-skip':''});x.mutate({type:'characterData',target:source});assert.equal(source.nodeValue,'Revisar límites');
});

test('static interface copy has English translations except shared names, units and data-field identifiers',()=>{
 const {api}=locale(),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'');
 const shared=new Set(['Dust Rider','Base','English','Control','Ctrl K','CONTROL','CHARIOT','EVA','Artemis Lunar','Aurora Teal','Dust Rider / CHARIOT','4.0 P0','O₂','O₂ —','sol, localHour, temperatureC, pressurePa, windMps','Jezero','PLAN','06 / EVA','18.44463° N · 77.45088° E','Perseverance / Jezero','DEM MDEM200M','~200 m · NASA / ESA / HRSC / USGS / Esri','km/h','18.44463','77.45088','EVA-04','EV1, EV2']);
 const values=new Set([...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim()).filter(s=>/[a-záéíóúñ]/i.test(s)&&s.length>1));
 for(const m of html.matchAll(/(?:title|placeholder|aria-label|alt)="([^"]+)"/g))values.add(m[1]);
 assert.deepEqual([...values].filter(s=>!shared.has(s)&&api.translateText(s,'en')===s),[]);
 assert.equal(JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8')).name,'Dust Rider');
 assert.match(html,/<b>Dust Rider<\/b>/);assert.match(html,/Jezero/);
});

test('built-in geographic descriptions follow the selected language while IAU names stay unchanged',()=>{
 const {api}=locale(),data=JSON.parse(fs.readFileSync(new URL('../mars-data.json',import.meta.url),'utf8'));
 for(const place of [...data.knownLocations,...data.landingSites,...data.referencePoints]){
  if(place.description)assert.notEqual(api.translateText(place.description,'en'),place.description,place.name);
 }
 assert.equal(api.translateText('Jezero','en'),'Jezero');assert.equal(api.translateText('Olympus Mons','en'),'Olympus Mons');
});

test('mission reports use Dust Rider and the requested report language',async()=>{
 const {buildMissionPdf}=await import('../pdf-report.mjs');const {engine,params,base,target}=await import('./helpers.mjs');
 const {ctx}=engine(),leg=await ctx.calculateLeg(base,target,'balanced',params),selected=ctx.aggregateMission([leg],'balanced',params,[base,target]);Object.assign(selected,{availableHours:6,params,overBudget:false});
 const report={selectedMode:'balanced',points:[base,target],params,mission:{name:'Test mission'},selected,strategies:[selected],software:{version:'V44',reportLanguage:'en'},dataSources:{marsRadiusKm:3389.5}};
 const english=buildMissionPdf(report).toString('latin1');assert.match(english,/Dust Rider - Complete mission report/);assert.match(english,/PLAN STATUS/);assert.doesNotMatch(english,/JEZERO V44/);
 const spanish=buildMissionPdf({...report,software:{...report.software,reportLanguage:'es'}}).toString('latin1');assert.match(spanish,/Dust Rider - Informe completo/);assert.match(spanish,/ESTADO DEL PLAN/);
});
