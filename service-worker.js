const CACHE='jezero-survival-4p1';
const FILES=['/control.css','/modules/assurance.cjs','/modules/mission-control-engine.cjs','/modules/mission-control.js','/modules/command-palette.js','/operations.css','/modules/operations-engine.cjs','/modules/operations-map.js','/modules/operations.js','/modules/forecast.js','/polish.css','/modules/map-detail.js','/modules/workspace.js','/modules/locale.js','/modules/help-english.js','/MANUAL-HELP-EN.md','/professional.css','/modules/help.js','/MANUAL-DE-AYUDA.md','/assets/jezero-mark.svg','/','/index.html','/style.css','/interface.css','/survival.css','/mars-data.json','/mars-elevation.js','/script.js',
 '/assets/vendor/ol.js','/assets/vendor/ol.css','/assets/favicon.ico','/assets/mars-2020-logo.png',
 '/modules/theme.js','/modules/i18n.js','/modules/validation.cjs','/modules/route-engine.cjs','/modules/module-shell.js','/modules/interface.js','/modules/survival-engine.cjs','/modules/survival.js','/modules/offline.js',
 '/examples/01-jezero-corto.json','/examples/02-jezero-varios-objetivos.json','/examples/03-presupuesto-ajustado.json','/examples/survival-demo.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jezero-survival-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(!FILES.includes(url.pathname)&&event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(url.pathname,copy));}return response;}).catch(async()=>{
  const cache=await caches.open(CACHE),stored=await cache.match(url.pathname,{ignoreSearch:true});
  return stored||(event.request.mode==='navigate'?await cache.match('/index.html'):new Response('Offline',{status:503}));
 }));
});
