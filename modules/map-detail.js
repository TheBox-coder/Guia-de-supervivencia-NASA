/* Verified NASA Trek WMTS services. Imagery detail never changes DEM calculation resolution. */
(() => {
  const ROOT='https://trek.nasa.gov/tiles/Mars/EQ/';
  const configs=[
    {id:'ctx',name:'CTX · Jezero',label:'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',extent:[77.1604655,18.2110274,77.6991776,18.7211945],maxZoom:13,minZoom:7,resolution:'6 m/píxel nominal'},
    {id:'hirise',name:'HiRISE · Jezero',label:'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',extent:[77.2229331,18.3067994,77.583964,18.669315],maxZoom:17,minZoom:12,resolution:'25 cm/píxel nominal'}
  ];
  let layers=[],lastMap=null,mode='viking',failures=new Set(),loaded=new Set(),enabled=true;
  try{enabled=localStorage.getItem('jezero-imagery-detail')!=='off';}catch{}
  function install(map){
    if(lastMap===map)return;lastMap=map;
    layers=configs.map(c=>{const grid=new ol.tilegrid.TileGrid({extent:[-180,-90,180,90],origin:[-180,90],tileSize:256,resolutions:Array.from({length:c.maxZoom+1},(_,z)=>.703125/2**z)});
      const source=new ol.source.XYZ({projection:'EPSG:4326',tileGrid:grid,url:ROOT+c.label+'/1.0.0/default/default028mm/{z}/{y}/{x}.png',crossOrigin:'anonymous',transition:160,attributions:'NASA / JPL / USGS · MRO '+c.name});
      const layer=new ol.layer.Tile({source,extent:c.extent,minZoom:c.minZoom,zIndex:c.id==='ctx'?1.1:1.2,visible:enabled,className:'ol-layer jezero-detail-layer'});
      source.on('tileloaderror',()=>{failures.add(c.id);status();});source.on('tileloadend',()=>{loaded.add(c.id);failures.delete(c.id);status();});
      map.addLayer(layer);return {config:c,layer};});
    map.on('moveend',status);status();
  }
  function status(){
    const badge=document.getElementById('imageryDetailStatus');if(!badge||!lastMap)return;
    const [lon,lat]=lastMap.getView().getCenter(),zoom=lastMap.getView().getZoom();
    const inside=c=>lon>=c.extent[0]&&lon<=c.extent[2]&&lat>=c.extent[1]&&lat<=c.extent[3];
    const eligible=enabled&&mode!=='mola'?configs.filter(c=>inside(c)&&zoom>c.minZoom):[];
    const best=eligible.filter(c=>loaded.has(c.id)&&!failures.has(c.id)).at(-1),pending=eligible.at(-1);
    badge.dataset.state=best?'detail':pending?'loading':zoom>7&&mode!=='mola'?'limited':'global';
    badge.textContent=best?`${best.name} · ${best.resolution}`:pending?`${pending.name} · ${failures.has(pending.id)?'servicio no disponible':'cargando detalle'}`:mode==='mola'?'MOLA / HRSC · relieve':zoom>7?'Viking global · límite de detalle':'Viking · mosaico global';
    badge.title='Detalle de imagen, no resolución de cálculo. DEM del planificador: ~200 m. Los mosaicos regionales pueden tener huecos.';
    document.querySelectorAll('[data-imagery-detail]').forEach(el=>el.checked=enabled);
  }
  function setMode(value){mode=value;layers.forEach(x=>x.layer.setVisible(enabled&&mode!=='mola'));status();}
  document.querySelectorAll('[data-imagery-detail]').forEach(el=>el.addEventListener('change',()=>{enabled=el.checked;try{localStorage.setItem('jezero-imagery-detail',enabled?'on':'off');}catch{}setMode(mode);}));
  document.getElementById('mapJezeroDetail')?.addEventListener('click',()=>{if(lastMap)lastMap.getView().animate({center:[77.45088,18.44463],zoom:12.5,duration:450});});
  window.JEZERO_IMAGERY=Object.freeze({install,setMode,status,getSources:()=>configs.map(c=>({...c}))});
})();
