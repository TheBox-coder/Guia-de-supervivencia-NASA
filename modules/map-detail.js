/* Verified NASA Trek WMTS services. Imagery detail never changes DEM calculation resolution. */
(() => {
  const ROOT='https://trek.nasa.gov/tiles/Mars/EQ/';
  // THEMIS cubre todo Marte; CTX e HiRISE cubren Jezero y las regiones de regional-mosaics.js.
  // Orden de menos a más detalle: el último cargado gana en el indicador.
  const RESOLUTION={themis:'100 m/píxel nominal',ctx:'6 m/píxel nominal',hirise:'25–50 cm/píxel nominal'};
  const jezero=[
    {id:'ctx',kind:'ctx',name:'CTX · Jezero',label:'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',extent:[77.1604655,18.2110274,77.6991776,18.7211945],maxZoom:13,minZoom:7},
    {id:'hirise',kind:'hirise',name:'HiRISE · Jezero',label:'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',extent:[77.2229331,18.3067994,77.583964,18.669315],maxZoom:17,minZoom:12}
  ];
  const regional=(window.JEZERO_REGIONAL_MOSAICS||[]).map(([kind,name,label,extent,minZoom,maxZoom])=>({id:label,kind,name:`${kind==='ctx'?'CTX':'HiRISE'} · ${name}`,label,extent,minZoom,maxZoom}));
  const configs=[
    {id:'themis',kind:'themis',name:'THEMIS IR día · Marte global',label:'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',extent:[-180,-90,180,90],maxZoom:9,minZoom:5,global:true},
    ...[...regional,...jezero].sort((a,b)=>(a.kind==='hirise')-(b.kind==='hirise'))
  ].map(c=>({...c,resolution:RESOLUTION[c.kind]}));
  let layers=[],lastMap=null,mode='viking',failures=new Set(),loaded=new Set(),enabled=true;
  try{enabled=localStorage.getItem('jezero-imagery-detail')!=='off';}catch{}
  function install(map){
    if(lastMap===map)return;lastMap=map;
    layers=configs.map((c,index)=>{const grid=new ol.tilegrid.TileGrid({extent:[-180,-90,180,90],origin:[-180,90],tileSize:256,resolutions:Array.from({length:c.maxZoom+1},(_,z)=>.703125/2**z)});
      const source=new ol.source.XYZ({projection:'EPSG:4326',tileGrid:grid,url:ROOT+c.label+'/1.0.0/default/default028mm/{z}/{y}/{x}.png',crossOrigin:'anonymous',transition:160,wrapX:c.global===true,attributions:c.global?'NASA / JPL / ASU · Mars Odyssey '+c.name:'NASA / JPL / USGS · MRO '+c.name});
      // Clase propia por capa: cada mosaico tiene su lienzo y el difuminado de uno no recorta al otro.
      const layer=new ol.layer.Tile({source,extent:c.global?undefined:c.extent,minZoom:c.minZoom,zIndex:{themis:1.05,ctx:1.1,hirise:1.2}[c.kind],visible:enabled,className:`ol-layer jezero-detail-layer jezero-detail-${index}`});
      source.on('tileloaderror',()=>{failures.add(c.id);status();});source.on('tileloadend',()=>{loaded.add(c.id);failures.delete(c.id);status();});
      if(!c.global)feather(layer,c.extent);
      map.addLayer(layer);return {config:c,layer};});
    map.on('moveend',status);status();
  }
  // Bordes difuminados: el mosaico regional se funde con el global en vez de cortarse en un rectángulo.
  function feather(layer,extent){
    layer.on('postrender',event=>{
      const ctx=event.context,topLeft=lastMap?.getPixelFromCoordinate([extent[0],extent[3]]),bottomRight=lastMap?.getPixelFromCoordinate([extent[2],extent[1]]);
      if(!ctx||!topLeft||!bottomRight)return;
      const [x0,y0]=ol.render.getRenderPixel(event,topLeft),[x1,y1]=ol.render.getRenderPixel(event,bottomRight);
      const width=x1-x0,height=y1-y0,edge=Math.min(width,height)*.12;
      if(!(edge>2))return;
      ctx.save();ctx.globalCompositeOperation='destination-in';ctx.filter=`blur(${edge/2}px)`;ctx.fillStyle='#000';
      ctx.fillRect(x0+edge,y0+edge,width-2*edge,height-2*edge);ctx.restore();
    });
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
