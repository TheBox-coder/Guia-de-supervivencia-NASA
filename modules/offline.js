(() => {
  const update=()=>{document.body.dataset.offline=String(!navigator.onLine);const badge=document.getElementById('connectionState');if(badge)badge.textContent=navigator.onLine?'CONEXIÓN DISPONIBLE':'SIN CONEXIÓN';};
  window.addEventListener('online',update);window.addEventListener('offline',update);update();
  if('serviceWorker' in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))){
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{const badge=document.getElementById('connectionState');if(badge)badge.title='El almacenamiento offline no está disponible en este navegador.';});
  }
})();
