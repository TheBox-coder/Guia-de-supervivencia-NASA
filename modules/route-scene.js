/* V46: vista 3D en perspectiva de la ruta, recorrido animado, nombres de la zona y capas de minerales.
   - El relieve sale del mismo DEM (~200 m) que usa el cálculo de rutas; la exageración vertical se indica en pantalla.
   - Las capas de minerales son teselas WMTS de NASA Mars Trek comprobadas el 2026-11-14 (ver MINERALS).
     Donde no hay teselas publicadas no se dibuja nada: no se interpola ni se inventa cobertura. */
(function(){
  const ui=(es,en)=>window.JEZERO_I18N?.ui?.(es,en)??es;
  const TREK='https://trek.nasa.gov/tiles/Mars/EQ/';
  const KM_PER_DEG=Math.PI*3389.5/180;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const DIFF={easy:'#34d399',moderate:'#fbbf24',demanding:'#fb923c',critical:'#f43f5e',unknown:'#94a3b8'};
  // Comprobado contra WMTSCapabilities de cada producto. TES: mapas globales de MGS, muy gruesos (contexto regional).
  // CRISM: solo existen como teselas en dos regiones; Jezero y Gale no tienen teselas CRISM publicadas en Mars Trek.
  const MINERALS=Object.freeze([
    {id:'tes-clay',label:'TES_Glass_Clay',maxZoom:1,global:true,es:'TES · Filosilicatos / vidrio rico en Si (global)',en:'TES · Sheet silicates / high-Si glass (global)'},
    {id:'tes-cpx',label:'TES_Clinopyroxene',maxZoom:1,global:true,es:'TES · Piroxeno rico en Ca (global)',en:'TES · High-Ca pyroxene (global)'},
    {id:'tes-plag',label:'TES_Plagioclase',maxZoom:1,global:true,es:'TES · Plagioclasa (global)',en:'TES · Plagioclase (global)'},
    {id:'tes-dust',label:'tes_ruffdust',maxZoom:2,global:true,es:'TES · Índice de cobertura de polvo (global)',en:'TES · Dust cover index (global)'},
    {id:'crism-smectite',label:'T1303_FeMgSmectite_Mineral_Indicator_SP',maxZoom:11,extent:[-20.502408,16.997565,-14.499017,23.002569],es:'CRISM · Esmectita Fe-Mg (región de Mawrth Vallis)',en:'CRISM · Fe-Mg smectite (Mawrth Vallis region)'},
    {id:'crism-sulfate',label:'MC18_PolySulfate_Mineral_IndicatorV2_SP',maxZoom:11,extent:[-95.503927,-32.999033,-39.497808,3.004028],es:'CRISM · Sulfatos polihidratados (Valles Marineris, MC-18)',en:'CRISM · Polyhydrated sulfates (Valles Marineris, MC-18)'}
  ]);
  const inExtent=(extent,lon,lat)=>!extent||(lon>=extent[0]&&lon<=extent[2]&&lat>=extent[1]&&lat<=extent[3]);
  function mineralCoverage(id,lon,lat){
    const m=MINERALS.find(x=>x.id===id);if(!m)return {status:'none'};
    if(m.global)return {status:'global',mineral:m};
    return {status:inExtent(m.extent,lon,lat)?'regional':'outside',mineral:m};
  }

  // ---------- Geometría de la escena (funciones puras, probadas en tests) ----------
  function sceneFrame(nodes,{minSideKm=3,pad=.35}={}){
    const lats=nodes.map(n=>n.lat),lons=nodes.map(n=>n.lon);
    const lat0=(Math.min(...lats)+Math.max(...lats))/2,lon0=(Math.min(...lons)+Math.max(...lons))/2;
    const kLon=KM_PER_DEG*Math.max(.08,Math.cos(lat0*Math.PI/180));
    const spanX=(Math.max(...lons)-Math.min(...lons))*kLon,spanY=(Math.max(...lats)-Math.min(...lats))*KM_PER_DEG;
    const sideKm=Math.max(minSideKm,Math.max(spanX,spanY)*(1+2*pad));
    const toLocal=p=>({x:(p.lon-lon0)*kLon,y:(p.lat-lat0)*KM_PER_DEG});
    const toGeo=(x,y)=>({lat:lat0+y/KM_PER_DEG,lon:lon0+x/kLon});
    const half=sideKm/2,sw=toGeo(-half,-half),ne=toGeo(half,half);
    return {lat0,lon0,sideKm,toLocal,toGeo,extent:[sw.lon,sw.lat,ne.lon,ne.lat]};
  }
  function gridSize(sideKm){return clamp(Math.round(sideKm/.1)+1,25,61);}
  function gridPoints(frame,n){
    const pts=[],half=frame.sideKm/2;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)pts.push(frame.toGeo(-half+frame.sideKm*j/(n-1),-half+frame.sideKm*i/(n-1)));
    return pts;
  }
  function fillElevations(values){
    const valid=values.filter(Number.isFinite);if(!valid.length)return null;
    const mean=valid.reduce((a,b)=>a+b,0)/valid.length;
    return {z:values.map(v=>Number.isFinite(v)?v:mean),missing:values.length-valid.length,min:Math.min(...valid),max:Math.max(...valid)};
  }
  // Suaviza la malla con interpolación Catmull-Rom entre muestras del DEM. No añade detalle real: solo evita el aspecto facetado.
  function upsample(z,n,k){
    if(k<=1)return {z:z.slice(),n};
    const m=(n-1)*k+1,out=new Array(m*m),at=(i,j)=>z[clamp(i,0,n-1)*n+clamp(j,0,n-1)];
    const cr=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    for(let I=0;I<m;I++){const fi=I/k,i=Math.min(n-2,Math.floor(fi)),ti=fi-i;
      for(let J=0;J<m;J++){const fj=J/k,j=Math.min(n-2,Math.floor(fj)),tj=fj-j,rows=[];
        for(let r=-1;r<=2;r++)rows.push(cr(at(i+r,j-1),at(i+r,j),at(i+r,j+1),at(i+r,j+2),tj));
        out[I*m+J]=cr(rows[0],rows[1],rows[2],rows[3],ti);}}
    return {z:out,n:m};
  }
  function contourInterval(rangeM){return [1,2,5,10,20,50,100,200,500,1000].find(v=>rangeM/v<=12)||2000;}
  function autoExaggeration(sideKm,minM,maxM){
    const rangeKm=Math.max(.001,(maxM-minM)/1000);
    return clamp(Math.round(.16*sideKm/rangeKm*2)/2,1,12);
  }
  function routeTrack(nodes,frame){
    const pts=[];let km=0;
    nodes.forEach((n,i)=>{
      const l=frame.toLocal(n);
      if(i>0){const p=pts[i-1];km+=Math.hypot(l.x-p.x,l.y-p.y);}
      pts.push({x:l.x,y:l.y,elevationM:Number.isFinite(n.elevationM)?n.elevationM:null,km,slopeDeg:n.slopeDeg,cls:n.sceneClass||'unknown'});
    });
    return {pts,totalKm:km};
  }
  function trackAt(track,t){
    const pts=track.pts,target=clamp(t,0,1)*track.totalKm;
    for(let i=1;i<pts.length;i++){
      if(pts[i].km>=target||i===pts.length-1){
        const a=pts[i-1],b=pts[i],span=Math.max(1e-9,b.km-a.km),f=clamp((target-a.km)/span,0,1);
        const za=a.elevationM??b.elevationM??0,zb=b.elevationM??a.elevationM??0;
        return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,elevationM:za+(zb-za)*f,km:target,heading:Math.atan2(b.x-a.x,b.y-a.y),slopeDeg:b.slopeDeg,index:i};
      }
    }
    const p=pts[0];return {x:p.x,y:p.y,elevationM:p.elevationM??0,km:0,heading:0,slopeDeg:null,index:0};
  }
  function nearbyReferences(candidates,frame,track,limit=10){
    const half=frame.sideKm/2,out=[];
    for(const c of candidates){
      if(!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||!c.name)continue;
      const l=frame.toLocal(c);if(Math.abs(l.x)>half||Math.abs(l.y)>half)continue;
      let d=Infinity;for(const p of track.pts)d=Math.min(d,Math.hypot(p.x-l.x,p.y-l.y));
      out.push({name:c.name,kind:c.kind||'reference',x:l.x,y:l.y,distanceKm:d});
    }
    const seen=new Set();
    return out.sort((a,b)=>a.distanceKm-b.distanceKm).filter(r=>!seen.has(r.name)&&seen.add(r.name)).slice(0,limit);
  }
  function project(cam,x,y,zKm){
    const dx=x-cam.tx,dy=y-cam.ty,dz=zKm-cam.tz;
    const xr=dx*Math.cos(cam.az)-dy*Math.sin(cam.az),yr=dx*Math.sin(cam.az)+dy*Math.cos(cam.az);
    return {sx:cam.cx+cam.s*xr,sy:cam.cy-cam.s*(yr*Math.sin(cam.tilt)+dz*Math.cos(cam.tilt)),depth:yr};
  }
  function ramp(t){
    const stops=[[58,36,28],[124,74,46],[176,118,72],[214,170,116],[238,214,176]];
    const f=clamp(t,0,1)*(stops.length-1),i=Math.min(stops.length-2,Math.floor(f)),k=f-i;
    return stops[i].map((v,c)=>v+(stops[i+1][c]-v)*k);
  }

  // ---------- Capa de minerales en el mapa 2D ----------
  let mineralLayer=null,mineralId='',mineralNote=null,mineralSelect=null,mineralGo=null;
  const liveMap=()=>{try{return typeof map!=='undefined'?map:null;}catch{return null;}};
  function setMineral(id){
    const m=liveMap();mineralId=id||'';
    if(mineralLayer&&m){m.removeLayer(mineralLayer);mineralLayer=null;}
    const cfg=MINERALS.find(x=>x.id===mineralId);
    if(cfg&&m&&window.ol){
      const grid=new ol.tilegrid.TileGrid({extent:[-180,-90,180,90],origin:[-180,90],tileSize:256,resolutions:Array.from({length:cfg.maxZoom+1},(_,z)=>.703125/2**z)});
      const source=new ol.source.XYZ({projection:'EPSG:4326',tileGrid:grid,url:TREK+cfg.label+'/1.0.0/default/default028mm/{z}/{y}/{x}.png',crossOrigin:'anonymous',wrapX:Boolean(cfg.global),attributions:'NASA / JPL · Mars Trek · '+cfg.label});
      mineralLayer=new ol.layer.Tile({source,extent:cfg.global?undefined:cfg.extent,opacity:.62,zIndex:3.5,className:'ol-layer jezero-mineral-layer'});
      source.on('tileloaderror',()=>{if(mineralNote)mineralNote.dataset.state='error';});
      m.addLayer(mineralLayer);
    }
    updateMineralNote();
  }
  function updateMineralNote(){
    if(!mineralNote)return;
    const m=liveMap(),center=m?.getView?.()?.getCenter?.()||[0,0],cov=mineralCoverage(mineralId,center[0],center[1]);
    mineralNote.dataset.state=cov.status;if(mineralGo)mineralGo.hidden=cov.status!=='outside';
    mineralNote.textContent=cov.status==='none'?ui('Sin capa de minerales.','No mineral layer.')
      :cov.status==='global'?ui('Mapa global de MGS TES: unos 7 km por píxel. Sirve como contexto regional, no para decidir un tramo. Colores según el producto de NASA Mars Trek.','MGS TES global map: about 7 km per pixel. Regional context only, not for choosing a segment. Colors as published in NASA Mars Trek.')
      :cov.status==='regional'?ui('Indicador mineral de MRO CRISM. Cobertura solo dentro de esta región.','MRO CRISM mineral indicator. Coverage only inside this region.')
      :ui('Esta zona no tiene teselas CRISM publicadas en Mars Trek (Jezero y Gale tampoco). La capa solo cubre su región.','This area has no CRISM tiles published in Mars Trek (neither do Jezero or Gale). The layer only covers its region.');
  }
  function ensureMineralControl(){
    if(mineralSelect)return;
    const host=document.querySelector('.mapQuickLayers');if(!host)return;
    const box=document.createElement('div');box.className='mineralPicker';
    const label=document.createElement('label'),title=document.createElement('b');title.dataset.sceneText='mineral-title';
    mineralSelect=document.createElement('select');mineralSelect.id='mineralLayerSelect';
    label.append(title,mineralSelect);
    mineralNote=document.createElement('small');mineralNote.className='mineralNote';
    mineralGo=document.createElement('button');mineralGo.type='button';mineralGo.className='mineralGo';mineralGo.hidden=true;
    mineralGo.addEventListener('click',()=>{const cfg=MINERALS.find(x=>x.id===mineralId),m=liveMap();if(cfg?.extent&&m)m.getView().fit(cfg.extent,{duration:400,padding:[40,40,40,40]});});
    box.append(label,mineralNote,mineralGo);host.after(box);
    mineralSelect.addEventListener('change',()=>setMineral(mineralSelect.value));
    translate();
  }
  function translate(){
    const title=document.querySelector('[data-scene-text="mineral-title"]');if(title)title.textContent=ui('Minerales (NASA Mars Trek)','Minerals (NASA Mars Trek)');
    if(mineralSelect){
      const current=mineralSelect.value||mineralId;mineralSelect.replaceChildren();
      const none=document.createElement('option');none.value='';none.textContent=ui('Ninguna','None');mineralSelect.append(none);
      for(const m of MINERALS){const o=document.createElement('option');o.value=m.id;o.textContent=ui(m.es,m.en);mineralSelect.append(o);}
      mineralSelect.value=current;
    }
    if(mineralGo)mineralGo.textContent=ui('Ir a la región con cobertura','Go to the covered region');
    updateMineralNote();
    if(scene)drawChrome();
  }

  // ---------- Vista 3D ----------
  let scene=null,dialog=null,canvas=null,raf=0;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function activeMission(){try{return typeof selectedMission==='function'?selectedMission():null;}catch{return null;}}
  function pathNodes(mission){try{return typeof missionPathNodes==='function'?missionPathNodes(mission):[];}catch{return [];}}
  async function elevations(points){
    const out=[];
    for(let i=0;i<points.length;i+=1200){
      const chunk=await getElevations(points.slice(i,i+1200));
      out.push(...chunk.map(p=>Number.isFinite(Number(p.elevationM))&&p.elevationM!==null?Number(p.elevationM):NaN));
    }
    return out;
  }
  function referenceCandidates(){
    const out=[];
    try{if(typeof knownLayer!=='undefined')for(const f of knownLayer.getSource().getFeatures()){const c=f.getGeometry()?.getCoordinates?.();if(c)out.push({name:f.get('label'),lon:c[0],lat:c[1],kind:'known'});}}catch{}
    try{if(typeof D!=='undefined')for(const s of D?.landingSites||[])out.push({name:s.name,lat:Number(s.lat),lon:Number(s.lon),kind:'landing'});}catch{}
    return out;
  }
  // Imagen orbital sobre el relieve. Si las teselas no cargan (sin conexión, modo demo) se usa el color por elevación.
  const TEXTURES=[{label:'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',ext:'png',maxZoom:13,extent:[77.1604655,18.2110274,77.6991776,18.7211945],credit:'MRO CTX · NASA/JPL/MSSS/USGS'},
    {label:'Mars_Viking_MDIM21_ClrMosaic_global_232m',ext:'jpg',maxZoom:7,credit:'Viking MDIM 2.1 · NASA/USGS'}];
  function textureTiles(extent,maxZoom,limit=12){
    for(let z=maxZoom;z>=0;z--){
      const span=.703125/2**z*256,x0=Math.floor((extent[0]+180)/span),x1=Math.floor((extent[2]+180)/span),y0=Math.floor((90-extent[3])/span),y1=Math.floor((90-extent[1])/span);
      if((x1-x0+1)*(y1-y0+1)<=limit)return {z,x0,x1,y0,y1,span};
    }
    return null;
  }
  async function loadTexture(frame,n){
    if(window.JEZERO_DEMO?.enabled||typeof Image==='undefined')return null;
    const [w,s,e,nn]=frame.extent;
    const cfg=TEXTURES.find(t=>!t.extent||(w>=t.extent[0]&&e<=t.extent[2]&&s>=t.extent[1]&&nn<=t.extent[3]));if(!cfg)return null;
    const tiles=textureTiles(frame.extent,cfg.maxZoom);if(!tiles)return null;
    const cols=tiles.x1-tiles.x0+1,rows=tiles.y1-tiles.y0+1,cv=document.createElement('canvas');cv.width=cols*256;cv.height=rows*256;
    const ctx=cv.getContext('2d',{willReadFrequently:true}),jobs=[];
    for(let y=tiles.y0;y<=tiles.y1;y++)for(let x=tiles.x0;x<=tiles.x1;x++)jobs.push(new Promise((resolve,reject)=>{
      const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('timeout')),7000);
      img.onload=()=>{clearTimeout(timer);ctx.drawImage(img,(x-tiles.x0)*256,(y-tiles.y0)*256);resolve();};
      img.onerror=()=>{clearTimeout(timer);reject(new Error('tile'));};
      img.src=`${TREK}${cfg.label}/1.0.0/default/default028mm/${tiles.z}/${y}/${x}.${cfg.ext}`;
    }));
    await Promise.all(jobs);
    const data=ctx.getImageData(0,0,cv.width,cv.height).data,colors=new Array((n-1)*(n-1)),half=frame.sideKm/2;
    let dark=0;
    for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){
      const g=frame.toGeo(-half+frame.sideKm*(j+.5)/(n-1),-half+frame.sideKm*(i+.5)/(n-1));
      const px=clamp(Math.floor((g.lon+180)/tiles.span*256-tiles.x0*256),0,cv.width-1),py=clamp(Math.floor((90-g.lat)/tiles.span*256-tiles.y0*256),0,cv.height-1),o=(py*cv.width+px)*4;
      colors[i*(n-1)+j]=[data[o],data[o+1],data[o+2]];if(data[o+3]<10||data[o]+data[o+1]+data[o+2]<12)dark++;
    }
    if(dark>colors.length*.4)return null; // mosaico vacío en esta zona
    return {colors,credit:cfg.credit};
  }
  async function build(mission){
    const nodes=pathNodes(mission);if(nodes.length<2)throw new Error(ui('Calcula una misión antes de abrir la vista 3D.','Calculate a mission before opening the 3D view.'));
    const params=mission.params||{};
    nodes.forEach((n,i)=>{if(i>0){try{n.sceneClass=difficultyClass(edgeDifficulty(nodes[i-1],n,params));}catch{n.sceneClass='unknown';}}});
    const frame=sceneFrame(nodes),n=gridSize(frame.sideKm);
    const filled=fillElevations(await elevations(gridPoints(frame,n)));
    if(!filled)throw new Error(ui('El DEM no devolvió elevaciones para esta zona.','The DEM returned no elevations for this area.'));
    const track=routeTrack(nodes,frame);
    const stops=(mission.sequence||[]).map((p,i)=>({name:p.name||`P${i}`,base:p.type==='base',...frame.toLocal(p)})).filter((p,i,all)=>all.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-6)===i);
    const refs=nearbyReferences(referenceCandidates(),frame,track).filter(r=>!stops.some(s=>Math.hypot(s.x-r.x,s.y-r.y)<.05));
    const fine=upsample(filled.z,n,clamp(Math.floor(99/(n-1)),1,4)); // malla dibujada de 100×100 como máximo, para mantener fluido el recorrido
    let texture=null;try{texture=await loadTexture(frame,fine.n);}catch{texture=null;}
    return {frame,n:fine.n,z:fine.z,demCellM:Math.round(frame.sideKm/(n-1)*1000),minM:filled.min,maxM:filled.max,missing:filled.missing,track,stops,refs,texture,ve:autoExaggeration(frame.sideKm,filled.min,filled.max),
      contourM:contourInterval(filled.max-filled.min),contours:true,
      cam:{az:-.6,tilt:.62,zoom:1},t:0,playing:false,names:true,imagery:Boolean(texture),shade:null,shadeVe:null};
  }
  function heightAt(sc,x,y){
    const half=sc.frame.sideKm/2,n=sc.n,fx=clamp((x+half)/sc.frame.sideKm*(n-1),0,n-1.001),fy=clamp((y+half)/sc.frame.sideKm*(n-1),0,n-1.001);
    const j=Math.floor(fx),i=Math.floor(fy),a=fx-j,b=fy-i,z=sc.z;
    return (z[i*n+j]*(1-a)+z[i*n+j+1]*a)*(1-b)+(z[(i+1)*n+j]*(1-a)+z[(i+1)*n+j+1]*a)*b;
  }
  function shades(sc){
    if(sc.shade&&sc.shadeVe===sc.ve)return sc.shade;
    const n=sc.n,cell=sc.frame.sideKm/(n-1)*1000,out=new Float32Array((n-1)*(n-1)),L=[-.5,.5,.7071];
    for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){
      const z00=sc.z[i*n+j],z01=sc.z[i*n+j+1],z10=sc.z[(i+1)*n+j],z11=sc.z[(i+1)*n+j+1];
      const dx=((z01+z11)-(z00+z10))/2*sc.ve/cell,dy=((z10+z11)-(z00+z01))/2*sc.ve/cell,len=Math.hypot(dx,dy,1);
      out[i*(n-1)+j]=clamp((-dx*L[0]-dy*L[1]+L[2])/len,0,1)*(1-.25*clamp(Math.hypot(dx,dy)/1.2,0,1));
    }
    sc.shade=out;sc.shadeVe=sc.ve;return out;
  }
  function camera(sc,w,h){
    const fit=Math.min(w,h*1.25)/(sc.frame.sideKm*1.12),fly=sc.t>0||sc.playing,m=trackAt(sc.track,sc.t);
    const zk=v=>(v-sc.minM)/1000*sc.ve;
    return {az:sc.cam.az,tilt:sc.cam.tilt,s:fit*sc.cam.zoom*(fly?2.1:1),cx:w/2,cy:h*(fly?.6:.56),tx:fly?m.x:0,ty:fly?m.y:0,tz:fly?zk(m.elevationM):zk((sc.minM+sc.maxM)/2),zk,marker:m,fly};
  }
  function draw(){
    if(!scene||!canvas)return;
    const sc=scene,dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#1b1410');sky.addColorStop(.55,'#3a2619');sky.addColorStop(1,'#120d0a');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const cam=camera(sc,w,h),n=sc.n,half=sc.frame.sideKm/2,step=sc.frame.sideKm/(n-1),sh=shades(sc),range=Math.max(1,sc.maxM-sc.minM);
    const P=new Array(n*n);
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)P[i*n+j]=project(cam,-half+j*step,-half+i*step,cam.zk(sc.z[i*n+j]));
    const quads=[];for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++)quads.push([P[i*n+j].depth+P[(i+1)*n+j+1].depth,i,j]);
    quads.sort((a,b)=>b[0]-a[0]);
    const useTexture=sc.imagery&&sc.texture,dNear=quads[quads.length-1][0],dFar=quads[0][0],dSpan=Math.max(1e-9,dFar-dNear),ci=sc.contourM;
    for(const [depth,i,j] of quads){
      const a=P[i*n+j],b=P[i*n+j+1],c=P[(i+1)*n+j+1],d=P[(i+1)*n+j],k=i*(n-1)+j;
      const z00=sc.z[i*n+j],z01=sc.z[i*n+j+1],z11=sc.z[(i+1)*n+j+1],z10=sc.z[(i+1)*n+j];
      let light=.34+.86*sh[k];
      const base=useTexture?sc.texture.colors[k]:ramp(((z00+z11)/2-sc.minM)/range),haze=(depth-dNear)/dSpan*.3;
      const col=`rgb(${(Math.min(255,base[0]*light)*(1-haze)+haze*92)|0},${(Math.min(255,base[1]*light)*(1-haze)+haze*62)|0},${(Math.min(255,base[2]*light)*(1-haze)+haze*46)|0})`;
      ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.lineTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.closePath();ctx.fill();ctx.stroke();
      // Curvas de nivel: segmento entre los cruces de cada nivel con los lados de la celda.
      if(sc.contours){
        const lo=Math.min(z00,z01,z11,z10),hi=Math.max(z00,z01,z11,z10);
        for(let level=Math.ceil(lo/ci)*ci;level<hi;level+=ci){
          const cross=[];
          for(const [p,q,zp,zq] of [[a,b,z00,z01],[b,c,z01,z11],[c,d,z11,z10],[d,a,z10,z00]]){
            if((zp<level)!==(zq<level)){const f=(level-zp)/(zq-zp);cross.push(p.sx+(q.sx-p.sx)*f,p.sy+(q.sy-p.sy)*f);}
          }
          if(cross.length>=4){ctx.strokeStyle=Math.round(level/ci)%5===0?'rgba(30,16,10,.75)':'rgba(30,16,10,.42)';ctx.lineWidth=Math.round(level/ci)%5===0?1.3:.9;ctx.beginPath();ctx.moveTo(cross[0],cross[1]);ctx.lineTo(cross[2],cross[3]);ctx.stroke();}
        }
      }
    }
    // Paredes del bloque: los dos bordes que miran a la cámara bajan hasta una base, como en un bloque diagrama.
    const floorZ=cam.zk(sc.minM)-Math.max(.02,(sc.maxM-sc.minM)/1000*sc.ve*.18+sc.frame.sideKm*.03),fx=Math.sin(cam.az),fy=Math.cos(cam.az);
    const wall=(idx,shadeK)=>{
      const top=idx.map(q=>P[q]),bottom=idx.map(q=>{const i=Math.floor(q/n),j=q%n;return project(cam,-half+j*step,-half+i*step,floorZ);});
      const g=ctx.createLinearGradient(0,Math.min(...top.map(p=>p.sy)),0,Math.max(...bottom.map(p=>p.sy)));
      g.addColorStop(0,`rgb(${96*shadeK|0},${62*shadeK|0},${44*shadeK|0})`);g.addColorStop(1,`rgb(${40*shadeK|0},${26*shadeK|0},${20*shadeK|0})`);
      ctx.fillStyle=g;ctx.beginPath();top.forEach((p,q)=>q?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy));for(let q=bottom.length-1;q>=0;q--)ctx.lineTo(bottom[q].sx,bottom[q].sy);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(255,236,210,.35)';ctx.lineWidth=1;ctx.beginPath();top.forEach((p,q)=>q?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy));ctx.stroke();
    };
    const line=(fn)=>Array.from({length:n},(_,q)=>fn(q));
    if(cam.tilt<1.5){
      if(fy>0)wall(line(q=>q),.95);else wall(line(q=>(n-1)*n+q),.95);       // borde sur o norte
      if(fx>0)wall(line(q=>q*n),.72);else wall(line(q=>q*n+n-1),.72);         // borde oeste o este
    }
    // Ruta: se dibuja sobre el relieve, algo elevada, con el color de dificultad de cada tramo.
    const rp=sc.track.pts.map(p=>project(cam,p.x,p.y,cam.zk(Math.max(p.elevationM??-Infinity,heightAt(sc,p.x,p.y)))));
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=7;ctx.beginPath();rp.forEach((p,i)=>i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy));ctx.stroke();
    for(let i=1;i<rp.length;i++){ctx.strokeStyle=DIFF[sc.track.pts[i].cls]||DIFF.unknown;ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(rp[i-1].sx,rp[i-1].sy);ctx.lineTo(rp[i].sx,rp[i].sy);ctx.stroke();}
    // Etiquetas: paradas de la misión y nombres oficiales cercanos, sin solaparse.
    const boxes=[];ctx.textBaseline='middle';
    const label=(x,y,text,color,strong)=>{
      const g=project(cam,x,y,cam.zk(heightAt(sc,x,y)));
      ctx.font=`${strong?700:600} ${strong?12:11}px Inter,Segoe UI,sans-serif`;
      const tw=ctx.measureText(text).width+12,bx=g.sx-tw/2,by=g.sy-(strong?44:34),box=[bx,by,tw,20];
      if(g.sx<0||g.sx>w||g.sy<0||g.sy>h)return;
      if(boxes.some(o=>bx<o[0]+o[2]&&bx+tw>o[0]&&by<o[1]+o[3]&&by+20>o[1]))return;
      boxes.push(box);
      ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(g.sx,g.sy);ctx.lineTo(g.sx,by+20);ctx.stroke();
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(g.sx,g.sy,strong?4.5:3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(8,10,16,.86)';ctx.fillRect(bx,by,tw,20);ctx.strokeRect(bx,by,tw,20);
      ctx.fillStyle='#fff';ctx.fillText(text,bx+6,by+10.5);
    };
    for(const s of sc.stops)label(s.x,s.y,s.name.length>26?s.name.slice(0,25)+'…':s.name,s.base?'#34d399':'#c4b5fd',true);
    if(sc.names)for(const r of sc.refs)label(r.x,r.y,r.name.length>24?r.name.slice(0,23)+'…':r.name,'#7dd3fc',false);
    if(cam.fly){
      const m=cam.marker,g=project(cam,m.x,m.y,cam.zk(m.elevationM));
      ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(g.sx,g.sy,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.strokeStyle='#0b0f18';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(g.sx,g.sy,6,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    // Norte
    const nx=w-44,ny=44,a=-cam.az;ctx.save();ctx.translate(nx,ny);ctx.rotate(a);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(6,6);ctx.lineTo(0,2);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();
    ctx.font='700 10px Inter,Segoe UI,sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText('N',nx,ny+26);ctx.textAlign='start';
  }
  let els={};
  function drawChrome(){
    if(!scene||!dialog)return;const sc=scene,m=trackAt(sc.track,sc.t);
    els.title.textContent=ui('Vista 3D de la ruta','3D route view');
    els.play.textContent=sc.playing?ui('Pausar','Pause'):sc.t>=1?ui('Repetir recorrido','Replay flyover'):ui('Recorrer la ruta','Fly the route');
    els.reset.textContent=ui('Vista general','Overview');
    els.close.setAttribute('aria-label',ui('Cerrar vista 3D','Close 3D view'));
    els.veLabel.textContent=ui(`Exageración vertical ×${sc.ve}`,`Vertical exaggeration ×${sc.ve}`);
    els.namesLabel.textContent=ui('Nombres de la zona','Place names');
    els.imageryLabel.textContent=ui('Imagen orbital','Orbital image');
    els.contoursLabel.textContent=ui(`Curvas de nivel cada ${sc.contourM} m`,`Contours every ${sc.contourM} m`);
    els.imagery.disabled=!sc.texture;els.imagery.checked=sc.imagery;
    els.scrub.value=String(Math.round(sc.t*1000));els.scrub.setAttribute('aria-label',ui('Posición en la ruta','Position along the route'));
    els.readout.textContent=`${m.km.toFixed(2)} / ${sc.track.totalKm.toFixed(2)} km · ${Math.round(m.elevationM)} m`+(Number.isFinite(m.slopeDeg)&&sc.t>0?` · ${ui('pendiente','slope')} ${m.slopeDeg.toFixed(1)}°`:'');
    const cell=sc.demCellM;
    els.caption.textContent=ui(`Relieve: DEM de ~200 m muestreado cada ${cell} m y suavizado por interpolación (${sc.frame.sideKm.toFixed(1)} km de lado); no muestra rocas ni detalle menor que el DEM. `,`Relief: ~200 m DEM sampled every ${cell} m and smoothed by interpolation (${sc.frame.sideKm.toFixed(1)} km across); it shows no rocks or detail finer than the DEM. `)
      +(sc.ve>1?ui(`La altura está exagerada ×${sc.ve}; las pendientes reales son las del panel. `,`Height is exaggerated ×${sc.ve}; real slopes are the ones in the panel. `):ui('Altura sin exagerar. ','Height not exaggerated. '))
      +(sc.imagery&&sc.texture?ui(`Imagen: ${sc.texture.credit}. `,`Image: ${sc.texture.credit}. `):ui('Color por elevación (sin imagen orbital). ','Color by elevation (no orbital image). '))
      +(sc.refs.length?ui(`Nombres: nomenclatura IAU/USGS y sitios de aterrizaje cargados en el mapa (${sc.refs.length}). `,`Names: IAU/USGS nomenclature and landing sites loaded on the map (${sc.refs.length}). `):ui('Sin nombres oficiales cargados en esta zona. ','No official names loaded in this area. '))
      +(sc.missing?ui(`${sc.missing} celdas sin dato se rellenaron con la media. `,`${sc.missing} cells without data were filled with the mean. `):'')
      +ui('Arrastra para girar, rueda para acercar.','Drag to rotate, scroll to zoom.');
  }
  function tick(now){
    raf=0;if(!scene)return;const sc=scene;
    if(sc.playing){
      const dt=Math.min(.5,(now-(sc.last||now))/1000);sc.last=now;
      sc.t=Math.min(1,sc.t+dt/sc.duration);
      const m=trackAt(sc.track,sc.t);let diff=m.heading-sc.cam.az;diff=Math.atan2(Math.sin(diff),Math.cos(diff));sc.cam.az+=diff*Math.min(1,dt*1.6);
      if(sc.t>=1){sc.playing=false;}
      drawChrome();
    }
    draw();
    if(sc.playing)raf=requestAnimationFrame(tick);
  }
  const redraw=()=>{if(!raf)raf=requestAnimationFrame(tick);};
  function play(){
    const sc=scene;if(!sc)return;
    if(sc.playing){sc.playing=false;drawChrome();return;}
    if(sc.t>=1)sc.t=0;
    sc.duration=clamp(sc.track.totalKm*7,14,50);sc.playing=true;sc.last=null;sc.cam.tilt=.5;
    drawChrome();redraw();
  }
  function ensureDialog(){
    if(dialog)return;
    const mk=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
    dialog=mk('div','routeScene');dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','routeSceneTitle');
    const panel=mk('div','routeScenePanel'),head=mk('header'),bar=mk('div','routeSceneBar'),opts=mk('div','routeSceneOptions');
    els.title=mk('h2');els.title.id='routeSceneTitle';els.close=mk('button','routeSceneClose');els.close.type='button';els.close.textContent='×';head.append(els.title,els.close);
    canvas=mk('canvas','routeSceneCanvas');canvas.tabIndex=0;
    els.status=mk('p','routeSceneStatus');
    els.play=mk('button','routeScenePlay');els.play.type='button';els.reset=mk('button');els.reset.type='button';
    els.scrub=mk('input');els.scrub.type='range';els.scrub.min='0';els.scrub.max='1000';els.scrub.value='0';
    els.readout=mk('output');bar.append(els.play,els.scrub,els.readout,els.reset);
    const check=(key)=>{const l=mk('label'),i=mk('input'),s=mk('span');i.type='checkbox';l.append(i,s);els[key]=i;els[key+'Label']=s;return l;};
    const veBox=mk('label','routeSceneVe');els.veLabel=mk('span');els.ve=mk('input');els.ve.type='range';els.ve.min='1';els.ve.max='15';els.ve.step='.5';veBox.append(els.veLabel,els.ve);
    opts.append(check('names'),check('imagery'),check('contours'),veBox);
    els.caption=mk('p','routeSceneCaption');
    const stage=mk('div','routeSceneStage');stage.append(canvas,els.status);panel.append(head,stage,bar,opts,els.caption);dialog.append(panel);document.body.append(dialog);
    els.close.addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    els.play.addEventListener('click',play);
    els.reset.addEventListener('click',()=>{if(!scene)return;Object.assign(scene,{t:0,playing:false});scene.cam={az:-.6,tilt:.62,zoom:1};drawChrome();redraw();});
    els.scrub.addEventListener('input',()=>{if(!scene)return;scene.playing=false;scene.t=Number(els.scrub.value)/1000;const m=trackAt(scene.track,scene.t);if(scene.t>0)scene.cam.az=m.heading;drawChrome();redraw();});
    els.names.addEventListener('change',()=>{scene.names=els.names.checked;redraw();});
    els.contours.addEventListener('change',()=>{scene.contours=els.contours.checked;drawChrome();redraw();});
    els.imagery.addEventListener('change',()=>{scene.imagery=els.imagery.checked;drawChrome();redraw();});
    els.ve.addEventListener('input',()=>{scene.ve=Number(els.ve.value);drawChrome();redraw();});
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!drag||!scene)return;scene.cam.az+=(e.clientX-drag.x)*.008;scene.cam.tilt=clamp(scene.cam.tilt+(e.clientY-drag.y)*.006,.18,1.45);drag={x:e.clientX,y:e.clientY};redraw();});
    ['pointerup','pointercancel'].forEach(n=>canvas.addEventListener(n,()=>{drag=null;}));
    canvas.addEventListener('wheel',e=>{if(!scene)return;e.preventDefault();scene.cam.zoom=clamp(scene.cam.zoom*(e.deltaY<0?1.12:.89),.5,6);redraw();},{passive:false});
    canvas.addEventListener('keydown',e=>{if(!scene)return;const k=e.key;if(k==='ArrowLeft')scene.cam.az-=.1;else if(k==='ArrowRight')scene.cam.az+=.1;else if(k==='ArrowUp')scene.cam.tilt=clamp(scene.cam.tilt+.06,.18,1.45);else if(k==='ArrowDown')scene.cam.tilt=clamp(scene.cam.tilt-.06,.18,1.45);else if(k==='+'||k==='=')scene.cam.zoom=clamp(scene.cam.zoom*1.12,.5,6);else if(k==='-')scene.cam.zoom=clamp(scene.cam.zoom*.89,.5,6);else return;e.preventDefault();redraw();});
    window.addEventListener('resize',()=>{if(scene)redraw();});
  }
  let opener=null;
  async function open(){
    ensureDialog();opener=document.activeElement;
    dialog.hidden=false;scene=null;
    els.title.textContent=ui('Vista 3D de la ruta','3D route view');
    els.status.hidden=false;els.status.textContent=ui('Cargando el relieve de la zona…','Loading terrain for the area…');
    [els.play,els.reset,els.scrub,els.ve,els.names,els.imagery,els.contours].forEach(e=>{e.disabled=true;});els.caption.textContent='';els.readout.textContent='';
    els.close.focus();
    try{
      const built=await build(activeMission());
      if(dialog.hidden)return;
      scene=built;els.status.hidden=true;
      [els.play,els.reset,els.scrub,els.ve,els.names,els.contours].forEach(e=>{e.disabled=false;});
      els.names.checked=true;els.contours.checked=true;els.ve.value=String(scene.ve);
      drawChrome();redraw();
      if(reduced())els.status.hidden=true;
    }catch(error){els.status.hidden=false;els.status.textContent=error?.message||String(error);}
  }
  function close(){if(!dialog)return;dialog.hidden=true;if(scene)scene.playing=false;scene=null;if(raf){cancelAnimationFrame(raf);raf=0;}opener?.focus?.();}
  function init(){ensureMineralControl();}
  window.addEventListener('jezero:languagechange',translate);
  window.JEZERO_ROUTE_SCENE=Object.freeze({open,close,init,setMineral,MINERALS,mineralCoverage,
    _test:{upsample,contourInterval,sceneFrame,gridSize,gridPoints,fillElevations,autoExaggeration,routeTrack,trackAt,nearbyReferences,project,textureTiles}});
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
    // El mapa se crea después de cargar los datos: se reintenta hasta que exista el panel de capas y el mapa.
    let tries=0;const timer=setInterval(()=>{ensureMineralControl();if((mineralSelect&&liveMap())||++tries>60){clearInterval(timer);if(mineralSelect&&liveMap())liveMap().on('moveend',updateMineralNote);}},500);
  }
})();
