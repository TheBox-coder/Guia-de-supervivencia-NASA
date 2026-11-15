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
        out[I*m+J]=clamp(cr(rows[0],rows[1],rows[2],rows[3],ti),Math.min(at(i,j),at(i,j+1),at(i+1,j),at(i+1,j+1)),Math.max(at(i,j),at(i,j+1),at(i+1,j),at(i+1,j+1)));}}
    return {z:out,n:m};
  }
  function contourInterval(rangeM){return [1,2,5,10,20,50,100,200,500,1000].find(v=>rangeM/v<=12)||2000;}
  function autoExaggeration(sideKm,minM,maxM){
    const rangeKm=Math.max(.001,(maxM-minM)/1000);
    return clamp(Math.round(.2*sideKm/rangeKm*2)/2,1,12);
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
  let scene=null,dialog=null,canvas=null,overlay=null,raf=0,renderer=null;
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
  // Coeficientes lineales de (x,y) en km a coordenadas de textura (u hacia el este, v hacia el sur).
  function textureMapping(frame,tiles){
    const cols=tiles.x1-tiles.x0+1,rows=tiles.y1-tiles.y0+1,kLon=KM_PER_DEG*Math.max(.08,Math.cos(frame.lat0*Math.PI/180));
    return [((frame.lon0+180)/tiles.span-tiles.x0)/cols,1/(kLon*tiles.span*cols),((90-frame.lat0)/tiles.span-tiles.y0)/rows,1/(KM_PER_DEG*tiles.span*rows)];
  }
  async function loadTexture(frame){
    if(window.JEZERO_DEMO?.enabled||typeof Image==='undefined')return null;
    const [w,s,e,nn]=frame.extent;
    const cfg=TEXTURES.find(t=>!t.extent||(w>=t.extent[0]&&e<=t.extent[2]&&s>=t.extent[1]&&nn<=t.extent[3]));if(!cfg)return null;
    const tiles=textureTiles(frame.extent,cfg.maxZoom,24);if(!tiles)return null;
    const cols=tiles.x1-tiles.x0+1,rows=tiles.y1-tiles.y0+1,cv=document.createElement('canvas');cv.width=cols*256;cv.height=rows*256;
    const ctx=cv.getContext('2d',{willReadFrequently:true}),jobs=[];
    for(let y=tiles.y0;y<=tiles.y1;y++)for(let x=tiles.x0;x<=tiles.x1;x++)jobs.push(new Promise((resolve,reject)=>{
      const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('timeout')),8000);
      img.onload=()=>{clearTimeout(timer);ctx.drawImage(img,(x-tiles.x0)*256,(y-tiles.y0)*256);resolve();};
      img.onerror=()=>{clearTimeout(timer);reject(new Error('tile'));};
      img.src=`${TREK}${cfg.label}/1.0.0/default/default028mm/${tiles.z}/${y}/${x}.${cfg.ext}`;
    }));
    await Promise.all(jobs);
    const A=textureMapping(frame,tiles),half=frame.sideKm/2;let dark=0,total=0;
    for(let i=0;i<20;i++)for(let j=0;j<20;j++){
      const x=-half+frame.sideKm*(j+.5)/20,y=-half+frame.sideKm*(i+.5)/20;
      const px=clamp(Math.floor((A[0]+A[1]*x)*cv.width),0,cv.width-1),py=clamp(Math.floor((A[2]-A[3]*y)*cv.height),0,cv.height-1),d=ctx.getImageData(px,py,1,1).data;
      total++;if(d[3]<10||d[0]+d[1]+d[2]<12)dark++;
    }
    if(dark>total*.4)return null; // mosaico vacío en esta zona
    return {canvas:cv,A,credit:cfg.credit,zoom:tiles.z,mpp:Math.round(1000/(A[1]*cv.width))};
  }
  async function build(mission){
    const nodes=pathNodes(mission);if(nodes.length<2)throw new Error(ui('Calcula una misión antes de abrir la vista 3D.','Calculate a mission before opening the 3D view.'));
    const params=mission.params||{};
    nodes.forEach((n,i)=>{if(i>0){try{n.sceneClass=difficultyClass(edgeDifficulty(nodes[i-1],n,params));}catch{n.sceneClass='unknown';}}});
    const frame=sceneFrame(nodes),n=gridSize(frame.sideKm);
    const filled=fillElevations(await elevations(gridPoints(frame,n)));
    if(!filled)throw new Error(ui('El DEM no devolvió elevaciones para esta zona.','The DEM returned no elevations for this area.'));
    const fine=upsample(filled.z,n,clamp(Math.floor(99/(n-1)),1,4)); // malla 2D de respaldo: 100×100 como máximo
    const track=routeTrack(nodes,frame);
    // Regreso a base: el último tramo vuelve al punto de salida. Se marca para dibujarlo al lado de la ida y no encima.
    const legs=mission.legs||[],lastLeg=legs[legs.length-1],first=nodes[0],lastNode=nodes[nodes.length-1];
    const returns=legs.length>1&&Math.abs(first.lat-lastNode.lat)<1e-7&&Math.abs(first.lon-lastNode.lon)<1e-7;
    const returnFrom=returns?track.pts.length-((lastLeg.path||[]).length-1):Infinity;
    track.pts.forEach((p,i)=>{p.ret=i>=returnFrom;});track.returnKm=returns?track.pts[Math.max(0,returnFrom-1)].km:null;
    const stops=(mission.sequence||[]).map((p,i)=>({name:(p.name||`P${i}`)+(i===0&&returns?ui(' · salida y regreso',' · start and return'):''),base:p.type==='base',...frame.toLocal(p)})).filter((p,i,all)=>all.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-6)===i);
    const refs=nearbyReferences(referenceCandidates(),frame,track).filter(r=>!stops.some(s=>Math.hypot(s.x-r.x,s.y-r.y)<.05));
    let texture=null;try{texture=await loadTexture(frame);}catch{texture=null;}
    return {frame,n:fine.n,z:fine.z,raw:{z:filled.z,n},demCellM:Math.round(frame.sideKm/(n-1)*1000),minM:filled.min,maxM:filled.max,missing:filled.missing,track,stops,refs,texture,ve:autoExaggeration(frame.sideKm,filled.min,filled.max),
      contourM:contourInterval(filled.max-filled.min),contours:true,slopes:false,sun:315,
      cam:{az:-.6,tilt:.52,zoom:1},t:0,playing:false,names:true,imagery:Boolean(texture),shade:null,shadeVe:null};
  }
  function heightAt(sc,x,y){
    const half=sc.frame.sideKm/2,n=sc.n,fx=clamp((x+half)/sc.frame.sideKm*(n-1),0,n-1.001),fy=clamp((y+half)/sc.frame.sideKm*(n-1),0,n-1.001);
    const j=Math.floor(fx),i=Math.floor(fy),a=fx-j,b=fy-i,z=sc.z;
    return (z[i*n+j]*(1-a)+z[i*n+j+1]*a)*(1-b)+(z[(i+1)*n+j]*(1-a)+z[(i+1)*n+j+1]*a)*b;
  }

  // ---------- Cámara en perspectiva (compartida por WebGL y por las etiquetas) ----------
  function mul4(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
  function cameraMatrices(sc,w,h){
    const fly=sc.t>0||sc.playing,m=trackAt(sc.track,sc.t),zk=v=>(v-sc.minM)/1000*sc.ve,side=sc.frame.sideKm;
    // Fit the overview to the narrower field of view, including the elevated terrain.
    const aspect=w/h,fov=36*Math.PI/180,halfFov=Math.atan(Math.tan(fov/2)*Math.min(1,aspect));
    const radius=Math.hypot(side/Math.sqrt(2),(sc.maxM-sc.minM)/2000*sc.ve);
    const dist=(fly?clamp(side*.24,.9,5):radius/Math.sin(halfFov)*1.08)/sc.cam.zoom,tilt=sc.cam.tilt,az=sc.cam.az;
    const target=fly?[m.x,m.y,zk(heightAt(sc,m.x,m.y))]:[0,0,zk((sc.minM+sc.maxM)/2)];
    const eye=[target[0]-Math.sin(az)*Math.cos(tilt)*dist,target[1]-Math.cos(az)*Math.cos(tilt)*dist,target[2]+Math.sin(tilt)*dist];
    const f=[target[0]-eye[0],target[1]-eye[1],target[2]-eye[2]],fl=Math.hypot(...f);f[0]/=fl;f[1]/=fl;f[2]/=fl;
    let s=[f[1],-f[0],0];const sl=Math.hypot(...s)||1;s=[s[0]/sl,s[1]/sl,0];
    const u=[s[1]*f[2]-s[2]*f[1],s[2]*f[0]-s[0]*f[2],s[0]*f[1]-s[1]*f[0]];
    const view=new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-(s[0]*eye[0]+s[1]*eye[1]+s[2]*eye[2]),-(u[0]*eye[0]+u[1]*eye[1]+u[2]*eye[2]),f[0]*eye[0]+f[1]*eye[1]+f[2]*eye[2],1]);
    const near=Math.max(.01,dist*.03),far=dist*8+side*3,t=1/Math.tan(fov/2);
    // En el recorrido el marcador queda en el tercio inferior, para ver el terreno que viene.
    const proj=new Float32Array([t/(w/h),0,0,0,0,t,0,0,0,fly?.45:0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    return {mvp:mul4(proj,view),eye,dist,zk,marker:m,fly,w,h,far};
  }
  function toScreen(cam,x,y,zKm){
    const m=cam.mvp,cw=m[3]*x+m[7]*y+m[11]*zKm+m[15];if(cw<=1e-6)return null;
    const cx=(m[0]*x+m[4]*y+m[8]*zKm+m[12])/cw,cy=(m[1]*x+m[5]*y+m[9]*zKm+m[13])/cw;
    return {sx:(cx*.5+.5)*cam.w,sy:(1-(cy*.5+.5))*cam.h};
  }

  // ---------- Renderizador WebGL2 ----------
  const TERRAIN_VS=`#version 300 es
  in vec2 aPos;in float aH;in vec2 aGrad;in float aCurv;in float aWall;
  uniform mat4 uMVP;uniform float uVe;uniform float uFloor;uniform vec4 uTexA;
  out vec3 vWorld;out float vH;out vec2 vGrad;out float vCurv;out float vWall;out vec2 vUv;
  void main(){float z=aWall>1.5?uFloor:aH*.001*uVe;vec4 p=vec4(aPos,z,1.);gl_Position=uMVP*p;vWorld=p.xyz;vH=aH;vGrad=aGrad;vCurv=aCurv;vWall=aWall;vUv=vec2(uTexA.x+uTexA.y*aPos.x,uTexA.z-uTexA.w*aPos.y);}`;
  const TERRAIN_FS=`#version 300 es
  precision highp float;
  in vec3 vWorld;in float vH;in vec2 vGrad;in float vCurv;in float vWall;in vec2 vUv;
  uniform sampler2D uTex;uniform float uUseTex;uniform float uVe;uniform float uRange;uniform float uInterval;uniform float uContours;uniform float uSlopes;
  uniform vec3 uSun;uniform vec3 uEye;uniform vec3 uFog;uniform float uFogK;uniform float uFloor;
  out vec4 o;
  vec3 ramp(float t){t=clamp(t,0.,1.);vec3 a=vec3(.36,.21,.15),b=vec3(.58,.35,.22),c=vec3(.76,.52,.33),d=vec3(.89,.71,.50),e=vec3(.97,.88,.74);
    return t<.25?mix(a,b,t*4.):t<.5?mix(b,c,(t-.25)*4.):t<.75?mix(c,d,(t-.5)*4.):mix(d,e,(t-.75)*4.);}
  vec3 slopeColor(float s){vec3 g=vec3(.20,.83,.60),y=vec3(.98,.75,.14),r=vec3(.98,.57,.24),k=vec3(.96,.25,.37);
    return s<8.?mix(g,y,s/8.):s<15.?mix(y,r,(s-8.)/7.):mix(r,k,clamp((s-15.)/10.,0.,1.));}
  void main(){
    float fogD=length(vWorld-uEye),fog=(1.-exp(-pow(fogD*uFogK,1.5)))*.5;
    if(vWall>.5){float t=clamp(vWall-1.,0.,1.);float band=.5+.5*sin(vWorld.z*90.);vec3 c=mix(vec3(.36,.23,.16),vec3(.13,.08,.06),t)*(.9+.1*band);o=vec4(mix(c,uFog,fog*.5),1.);return;}
    float slope=degrees(atan(length(vGrad)));
    vec3 base=uUseTex>.5?texture(uTex,vUv).rgb:ramp(vH/uRange)*(1.-.22*smoothstep(8.,28.,slope));
    if(uUseTex>.5)base=pow(base,vec3(.92))*1.08;
    base=mix(base,slopeColor(slope),uSlopes*.72);
    vec3 n=normalize(vec3(-vGrad*uVe,1.));
    float diff=max(dot(n,uSun),0.);
    // Soft sky fill keeps slopes readable without clipping sunlit ridges.
    float sky=.5+.5*n.z;
    float light=(uUseTex>.5?.48:.32)+.22*sky+(uUseTex>.5?.38:.62)*diff;
    light*=1.+clamp(vCurv*.035,-.2,.12);
    vec3 col=base*light;
    col=col/(vec3(1.)+col*.22)*1.12;
    float f=vH/uInterval,w=fwidth(f);
    float line=1.-smoothstep(0.,1.4,abs(fract(f-.5)-.5)/max(w,1e-6));
    float f5=f/5.,w5=fwidth(f5);
    float major=1.-smoothstep(0.,1.8,abs(fract(f5-.5)-.5)/max(w5,1e-6));
    float fade=1.-smoothstep(.25,.6,w);
    col=mix(col,col*.38,uContours*max(line*.45*fade,major*.7*(1.-smoothstep(.25,.6,w5))));
    o=vec4(mix(col,uFog,fog),1.);
  }`;
  const ROUTE_VS=`#version 300 es
  in vec2 aPos;in float aH;in vec2 aN;in float aSide;in vec3 aColor;in float aShift;
  uniform mat4 uMVP;uniform float uVe;uniform float uWidth;uniform float uLift;uniform vec2 uViewport;uniform float uShift;
  out vec3 vColor;out float vSide;
  void main(){float z=aH*.001*uVe+uLift;vec4 c0=uMVP*vec4(aPos,z,1.),c1=uMVP*vec4(aPos+aN*.01,z,1.);
    vec2 d=(c1.xy/c1.w-c0.xy/c0.w)*uViewport;d=length(d)>1e-6?normalize(d):vec2(0.,1.);
    c0.xy+=d*(aSide*uWidth+aShift*uShift)/uViewport*2.*c0.w;gl_Position=c0;vColor=aColor;vSide=aSide;}`;
  const ROUTE_FS=`#version 300 es
  precision highp float;in vec3 vColor;in float vSide;uniform float uAlpha;uniform float uDark;out vec4 o;
  void main(){float edge=1.-smoothstep(.75,1.,abs(vSide));vec3 c=mix(vColor,vec3(.03,.03,.05),uDark);o=vec4(c,uAlpha*(uDark>.5?1.:mix(.75,1.,edge)));}`;
  function createGL(cv,sc){
    const gl=cv.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:false});if(!gl)return null;
    const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const program=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;};
    let terrain,route;try{terrain=program(TERRAIN_VS,TERRAIN_FS);route=program(ROUTE_VS,ROUTE_FS);}catch(error){console.warn('JEZERO 3D',error);return null;}
    // Malla fina (hasta 193×193) interpolada desde las muestras del DEM.
    const raw=sc.raw,k=clamp(Math.floor(192/(raw.n-1)),1,8),fine=upsample(raw.z,raw.n,k),n=fine.n,side=sc.frame.sideKm,half=side/2,step=side/(n-1),cell=step*1000;
    const at=(i,j)=>fine.z[clamp(i,0,n-1)*n+clamp(j,0,n-1)];
    const vertex=(i,j,wall)=>{const h=at(i,j)-sc.minM,gx=(at(i,j+1)-at(i,j-1))/(2*cell),gy=(at(i+1,j)-at(i-1,j))/(2*cell),curv=at(i,j)-(at(i,j+1)+at(i,j-1)+at(i+1,j)+at(i-1,j))/4;return [-half+j*step,-half+i*step,h,gx,gy,curv,wall];};
    const verts=[],index=[];
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)verts.push(...vertex(i,j,0));
    for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++){const a=i*n+j,b=a+1,c=a+n,d=c+1;index.push(a,b,d,a,d,c);}
    const wall=(cells)=>{const start=verts.length/7;cells.forEach(([i,j])=>{verts.push(...vertex(i,j,1),...vertex(i,j,2));});for(let q=0;q<cells.length-1;q++){const a=start+q*2,b=a+1,c=a+2,d=a+3;index.push(a,c,b,b,c,d);}};
    const line=fn=>Array.from({length:n},(_,q)=>fn(q));
    wall(line(q=>[0,q]));wall(line(q=>[n-1,q]));wall(line(q=>[q,0]));wall(line(q=>[q,n-1]));
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(index),gl.STATIC_DRAW);
    const attr=(prog,name,size,stride,offset)=>{const loc=gl.getAttribLocation(prog,name);if(loc<0)return;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride*4,offset*4);};
    attr(terrain,'aPos',2,7,0);attr(terrain,'aH',1,7,2);attr(terrain,'aGrad',2,7,3);attr(terrain,'aCurv',1,7,5);attr(terrain,'aWall',1,7,6);
    // Ruta: cinta pegada al relieve, densificada para seguir la malla.
    const rv=[],hAt=(x,y)=>{const fx=clamp((x+half)/step,0,n-1.001),fy=clamp((y+half)/step,0,n-1.001),j=Math.floor(fx),i=Math.floor(fy),a=fx-j,b=fy-i;return (fine.z[i*n+j]*(1-a)+fine.z[i*n+j+1]*a)*(1-b)+(fine.z[(i+1)*n+j]*(1-a)+fine.z[(i+1)*n+j+1]*a)*b-sc.minM;};
    const hex=c=>[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255];
    const pts=sc.track.pts;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<1e-9)continue;
      const nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len,parts=Math.max(1,Math.ceil(len/(step*.6))),col=hex(DIFF[b.cls]||DIFF.unknown);
      for(let q=0;q<parts;q++){
        const x0=a.x+(b.x-a.x)*q/parts,y0=a.y+(b.y-a.y)*q/parts,x1=a.x+(b.x-a.x)*(q+1)/parts,y1=a.y+(b.y-a.y)*(q+1)/parts,h0=hAt(x0,y0),h1=hAt(x1,y1);
        const shift=b.ret?1:0,v=(x,y,h,s)=>rv.push(x,y,h,nx,ny,s,...col,shift);
        v(x0,y0,h0,-1);v(x0,y0,h0,1);v(x1,y1,h1,1);v(x0,y0,h0,-1);v(x1,y1,h1,1);v(x1,y1,h1,-1);
      }
    }
    const rvao=gl.createVertexArray();gl.bindVertexArray(rvao);
    const rb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,rb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(rv),gl.STATIC_DRAW);
    attr(route,'aPos',2,10,0);attr(route,'aH',1,10,2);attr(route,'aN',2,10,3);attr(route,'aSide',1,10,5);attr(route,'aColor',3,10,6);attr(route,'aShift',1,10,9);
    gl.bindVertexArray(null);
    let tex=null;
    if(sc.texture){
      tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sc.texture.canvas);gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const aniso=gl.getExtension('EXT_texture_filter_anisotropic');if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    const U=(p,name)=>gl.getUniformLocation(p,name),FOG=[.66,.49,.36];
    function draw(scn,cam){
      const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(cam.w*dpr),h=Math.round(cam.h*dpr);
      if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
      const floor=-Math.max(.03,(scn.maxM-scn.minM)/1000*scn.ve*.2+side*.035),sunAz=scn.sun*Math.PI/180,sunEl=38*Math.PI/180;
      gl.useProgram(terrain);gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(U(terrain,'uMVP'),false,cam.mvp);gl.uniform1f(U(terrain,'uVe'),scn.ve);gl.uniform1f(U(terrain,'uFloor'),floor);
      gl.uniform4fv(U(terrain,'uTexA'),scn.texture?scn.texture.A:[0,0,0,0]);
      gl.uniform1f(U(terrain,'uUseTex'),scn.imagery&&tex?1:0);gl.uniform1f(U(terrain,'uRange'),Math.max(1,scn.maxM-scn.minM));
      gl.uniform1f(U(terrain,'uInterval'),scn.contourM);gl.uniform1f(U(terrain,'uContours'),scn.contours?1:0);gl.uniform1f(U(terrain,'uSlopes'),scn.slopes?1:0);
      gl.uniform3f(U(terrain,'uSun'),Math.sin(sunAz)*Math.cos(sunEl),Math.cos(sunAz)*Math.cos(sunEl),Math.sin(sunEl));
      gl.uniform3fv(U(terrain,'uEye'),cam.eye);gl.uniform3fv(U(terrain,'uFog'),FOG);gl.uniform1f(U(terrain,'uFogK'),1/(cam.dist*3.2+side*1.2));
      if(tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U(terrain,'uTex'),0);}
      gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
      gl.drawElements(gl.TRIANGLES,index.length,gl.UNSIGNED_INT,0);gl.disable(gl.POLYGON_OFFSET_FILL);
      // Ruta: primero la parte oculta por el relieve (tenue), después la visible con borde oscuro.
      gl.useProgram(route);gl.bindVertexArray(rvao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(U(route,'uMVP'),false,cam.mvp);gl.uniform1f(U(route,'uVe'),scn.ve);
      const width=3.2*dpr,lift=Math.max(.0005,side*.00008),count=rv.length/10;gl.uniform2f(U(route,'uViewport'),w,h);gl.uniform1f(U(route,'uShift'),width*2.6);
      const pass=(w,l,alpha,dark)=>{gl.uniform1f(U(route,'uWidth'),w);gl.uniform1f(U(route,'uLift'),l);gl.uniform1f(U(route,'uAlpha'),alpha);gl.uniform1f(U(route,'uDark'),dark);gl.drawArrays(gl.TRIANGLES,0,count);};
      gl.depthMask(false);gl.depthFunc(gl.GREATER);pass(width*.8,lift,.3,0);
      gl.depthFunc(gl.LEQUAL);pass(width+2.2*dpr,lift,.9,1);pass(width,lift*1.5,1,0);
      gl.depthMask(true);gl.bindVertexArray(null);
    }
    return {kind:'webgl',draw,meshSize:n,dispose(){gl.getExtension('WEBGL_lose_context')?.loseContext();}};
  }

  // ---------- Respaldo en lienzo 2D (si el navegador no ofrece WebGL2) ----------
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
  function create2D(cv){
    function draw(sc,cam){
      const dpr=window.devicePixelRatio||1,w=cam.w,h=cam.h;
      if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
      const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const n=sc.n,half=sc.frame.sideKm/2,step=sc.frame.sideKm/(n-1),sh=shades(sc),range=Math.max(1,sc.maxM-sc.minM),P=new Array(n*n),D=new Float32Array(n*n);
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=-half+j*step,y=-half+i*step;P[i*n+j]=toScreen(cam,x,y,cam.zk(sc.z[i*n+j]));D[i*n+j]=Math.hypot(x-cam.eye[0],y-cam.eye[1]);}
      const quads=[];for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++)quads.push([D[i*n+j]+D[(i+1)*n+j+1],i,j]);
      quads.sort((a,b)=>b[0]-a[0]);
      for(const [,i,j] of quads){
        const a=P[i*n+j],b=P[i*n+j+1],c=P[(i+1)*n+j+1],d=P[(i+1)*n+j];if(!a||!b||!c||!d)continue;
        const light=.34+.86*sh[i*(n-1)+j],base=ramp(((sc.z[i*n+j]+sc.z[(i+1)*n+j+1])/2-sc.minM)/range),col=`rgb(${Math.min(255,base[0]*light)|0},${Math.min(255,base[1]*light)|0},${Math.min(255,base[2]*light)|0})`;
        ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.lineTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.closePath();ctx.fill();ctx.stroke();
      }
      const rp=sc.track.pts.map(p=>toScreen(cam,p.x,p.y,cam.zk(heightAt(sc,p.x,p.y))));
      ctx.lineCap='round';ctx.lineJoin='round';
      for(let i=1;i<rp.length;i++){if(!rp[i-1]||!rp[i])continue;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(rp[i-1].sx,rp[i-1].sy);ctx.lineTo(rp[i].sx,rp[i].sy);ctx.stroke();}
      for(let i=1;i<rp.length;i++){if(!rp[i-1]||!rp[i])continue;ctx.strokeStyle=DIFF[sc.track.pts[i].cls]||DIFF.unknown;ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(rp[i-1].sx,rp[i-1].sy);ctx.lineTo(rp[i].sx,rp[i].sy);ctx.stroke();}
    }
    return {kind:'2d',draw,meshSize:null,dispose(){}};
  }

  // ---------- Etiquetas, marcador y norte (lienzo superpuesto) ----------
  function drawOverlay(sc,cam){
    const dpr=window.devicePixelRatio||1,w=cam.w,h=cam.h;
    if(overlay.width!==Math.round(w*dpr)||overlay.height!==Math.round(h*dpr)){overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);}
    const ctx=overlay.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const boxes=[];ctx.textBaseline='middle';
    const label=(x,y,text,color,strong)=>{
      const g=toScreen(cam,x,y,cam.zk(heightAt(sc,x,y)));if(!g||g.sx<0||g.sx>w||g.sy<0||g.sy>h)return;
      ctx.font=`${strong?700:600} ${strong?12:11}px Inter,Segoe UI,sans-serif`;
      const tw=ctx.measureText(text).width+14,pole=strong?46:34,bx=clamp(g.sx-tw/2,4,w-tw-4);
      const by=[g.sy-pole-22,g.sy-pole-50,g.sy+22].find(y=>y>=4&&y+22<=h-4&&!boxes.some(o=>bx<o[0]+o[2]+4&&bx+tw+4>o[0]&&y<o[1]+o[3]+3&&y+25>o[1]));
      ctx.fillStyle=color;ctx.strokeStyle='#0b0f18';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.sx,g.sy,strong?5.5:3.5,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(by===undefined)return;
      boxes.push([bx,by,tw,22]);
      ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(g.sx,g.sy);ctx.lineTo(clamp(g.sx,bx,bx+tw),by>g.sy?by:by+22);ctx.stroke();
      ctx.fillStyle='rgba(9,12,20,.88)';ctx.beginPath();ctx.roundRect?ctx.roundRect(bx,by,tw,22,5):ctx.rect(bx,by,tw,22);ctx.fill();
      ctx.fillStyle=color;ctx.fillRect(bx,by+3,3,16);
      ctx.fillStyle='#fff';ctx.fillText(text,bx+9,by+11.5);
    };
    sc.stops.forEach(s=>label(s.x,s.y,s.name.length>44?s.name.slice(0,43)+'…':s.name,s.base?'#34d399':'#c4b5fd',true));
    if(sc.names)for(const r of sc.refs)label(r.x,r.y,r.name.length>24?r.name.slice(0,23)+'…':r.name,'#7dd3fc',false);
    if(cam.fly){
      const m=cam.marker,g=toScreen(cam,m.x,m.y,cam.zk(heightAt(sc,m.x,m.y)));
      if(g){ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(g.sx,g.sy,15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.strokeStyle='#0b0f18';ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.sx,g.sy,7,0,Math.PI*2);ctx.fill();ctx.stroke();}
    }
    // Brújula: el norte gira con la cámara.
    const nx=w-46,ny=48;ctx.save();ctx.translate(nx,ny);ctx.fillStyle='rgba(9,12,20,.7)';ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.fill();
    ctx.rotate(-sc.cam.az);ctx.fillStyle='#f87171';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(6,0);ctx.lineTo(-6,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(6,0);ctx.lineTo(-6,0);ctx.closePath();ctx.fill();
    ctx.font='700 10px Inter,Segoe UI,sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText('N',0,-24+0);ctx.restore();ctx.textAlign='start';
    // Escala gráfica aproximada en el punto de mira.
    const a=toScreen(cam,cam.fly?cam.marker.x:0,cam.fly?cam.marker.y:0,cam.zk(heightAt(sc,cam.fly?cam.marker.x:0,cam.fly?cam.marker.y:0)));
    const stepKm=[.05,.1,.2,.5,1,2,5,10,20,50].find(v=>v>=sc.frame.sideKm/(cam.fly?14:6))||50;
    const bx=cam.fly?cam.marker.x:0,by2=cam.fly?cam.marker.y:0,b=toScreen(cam,bx+Math.cos(sc.cam.az)*stepKm,by2-Math.sin(sc.cam.az)*stepKm,cam.zk(heightAt(sc,bx,by2)));
    if(a&&b){const len=Math.hypot(b.sx-a.sx,b.sy-a.sy);if(len>20&&len<w*.5){const x0=18,y0=h-22;ctx.fillStyle='rgba(9,12,20,.7)';ctx.fillRect(x0-8,y0-20,len+16,32);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,y0-5);ctx.lineTo(x0,y0);ctx.lineTo(x0+len,y0);ctx.lineTo(x0+len,y0-5);ctx.stroke();ctx.fillStyle='#fff';ctx.font='600 11px Inter,Segoe UI,sans-serif';ctx.fillText(stepKm<1?`${stepKm*1000} m`:`${stepKm} km`,x0+4,y0-11);}}
  }
  function draw(){
    if(!scene||!canvas||!renderer)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;if(w<2||h<2)return;
    const cam=cameraMatrices(scene,w,h);
    renderer.draw(scene,cam);drawOverlay(scene,cam);
  }
  let els={};
  function drawChrome(){
    if(!scene||!dialog)return;const sc=scene,m=trackAt(sc.track,sc.t);
    els.title.textContent=ui('Vista 3D de la ruta','3D route view');
    els.eyebrow.textContent=ui('DUST RIDER / EXPLORACIÓN','DUST RIDER / EXPLORATION');
    els.subtitle.textContent=ui('Explora el relieve y sigue tu recorrido.','Explore the terrain and follow your traverse.');
    els.optionsTitle.textContent=ui('Ajustar vista','View settings');
    els.layersTitle.textContent=ui('Capas del terreno','Terrain layers');
    els.cameraTitle.textContent=ui('Relieve e iluminación','Relief and lighting');
    els.hint.textContent=ui('Arrastra para girar · Rueda para acercar','Drag to rotate · Scroll to zoom');
    els.sourceTitle.textContent=ui('Fuentes y límites del modelo','Sources and model limits');
    els.modelNote.textContent=ui('Relieve interpolado del DEM. La exageración vertical cambia la apariencia, no las pendientes calculadas.','Interpolated DEM terrain. Vertical exaggeration changes the appearance, not the calculated slopes.');
    els.play.textContent=sc.playing?ui('Pausar','Pause'):sc.t>=1?ui('Repetir recorrido','Replay flyover'):ui('Recorrer la ruta','Fly the route');
    els.reset.textContent=ui('Vista general','Overview');
    els.close.setAttribute('aria-label',ui('Cerrar vista 3D','Close 3D view'));
    els.veLabel.textContent=ui(`Exageración vertical ×${sc.ve}`,`Vertical exaggeration ×${sc.ve}`);
    els.sunLabel.textContent=ui('Dirección de la luz','Light direction');
    els.namesLabel.textContent=ui('Nombres de la zona','Place names');
    els.imageryLabel.textContent=ui('Imagen orbital','Orbital image');
    els.contoursLabel.textContent=ui(`Curvas de nivel cada ${sc.contourM} m`,`Contours every ${sc.contourM} m`);
    els.slopesLabel.textContent=ui('Color por pendiente','Color by slope');
    els.imagery.disabled=!sc.texture||renderer?.kind!=='webgl';els.imagery.checked=sc.imagery&&!els.imagery.disabled;
    els.slopes.disabled=renderer?.kind!=='webgl';els.contours.disabled=renderer?.kind!=='webgl';els.sun.disabled=renderer?.kind!=='webgl';
    els.slopeKey.hidden=!sc.slopes;els.slopeKey.textContent=ui('Pendiente real del DEM: verde 0° · amarillo 8° · naranja 15° · rojo 25° o más','Real DEM slope: green 0° · yellow 8° · orange 15° · red 25° or more');
    els.scrub.value=String(Math.round(sc.t*1000));els.scrub.setAttribute('aria-label',ui('Posición en la ruta','Position along the route'));
    els.readout.textContent=`${m.km.toFixed(2)} / ${sc.track.totalKm.toFixed(2)} km · ${Math.round(m.elevationM)} m`+(Number.isFinite(m.slopeDeg)&&sc.t>0?` · ${ui('pendiente','slope')} ${m.slopeDeg.toFixed(1)}°`:'')+(sc.track.returnKm!==null&&sc.t>0?` · ${m.km>=sc.track.returnKm?ui('regreso a base','return to base'):ui('ida','outbound')}`:'');
    els.caption.textContent=ui(`Relieve: DEM de ~200 m muestreado cada ${sc.demCellM} m y suavizado por interpolación (${sc.frame.sideKm.toFixed(1)} km de lado); no muestra rocas ni detalle menor que el DEM. `,`Relief: ~200 m DEM sampled every ${sc.demCellM} m and smoothed by interpolation (${sc.frame.sideKm.toFixed(1)} km across); it shows no rocks or detail finer than the DEM. `)
      +(sc.ve>1?ui(`La altura está exagerada ×${sc.ve}; las pendientes reales son las del panel. `,`Height is exaggerated ×${sc.ve}; real slopes are the ones in the panel. `):ui('Altura sin exagerar. ','Height not exaggerated. '))
      +(sc.imagery&&sc.texture&&renderer?.kind==='webgl'?ui(`Imagen: ${sc.texture.credit} (~${sc.texture.mpp} m/píxel). `,`Image: ${sc.texture.credit} (~${sc.texture.mpp} m/pixel). `):ui('Color por elevación (sin imagen orbital). ','Color by elevation (no orbital image). '))
      +(sc.track.returnKm!==null?ui('La ruta vuelve a la base: el regreso se dibuja al lado de la ida. ','The route returns to base: the return leg is drawn beside the outbound one. '):'')
      +(sc.refs.length?ui(`Nombres: nomenclatura IAU/USGS y sitios de aterrizaje cargados en el mapa (${sc.refs.length}). `,`Names: IAU/USGS nomenclature and landing sites loaded on the map (${sc.refs.length}). `):'')
      +(sc.missing?ui(`${sc.missing} celdas sin dato se rellenaron con la media. `,`${sc.missing} cells without data were filled with the mean. `):'')
      +(renderer?.kind==='2d'?ui('Este navegador no ofrece WebGL2: vista simplificada. ','This browser has no WebGL2: simplified view. '):'')
      +ui('Arrastra para girar, rueda para acercar.','Drag to rotate, scroll to zoom.');
  }
  function tick(now){
    raf=0;if(!scene)return;const sc=scene;
    if(sc.playing){
      const dt=Math.min(.5,(now-(sc.last||now))/1000);sc.last=now;
      sc.t=Math.min(1,sc.t+dt/sc.duration);
      // La cámara mira hacia donde va la ruta un poco más adelante, para que los giros no la sacudan.
      const ahead=trackAt(sc.track,Math.min(1,sc.t+.035)),here=trackAt(sc.track,sc.t),want=(ahead.x!==here.x||ahead.y!==here.y)?Math.atan2(ahead.x-here.x,ahead.y-here.y):here.heading;
      let diff=want-sc.cam.az;diff=Math.atan2(Math.sin(diff),Math.cos(diff));sc.cam.az+=diff*Math.min(1,dt*1.2);
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
    sc.duration=clamp(sc.track.totalKm*6,16,55);sc.playing=true;sc.last=null;sc.cam.tilt=.36;sc.cam.zoom=1;
    if(sc.t===0)sc.cam.az=trackAt(sc.track,.02).heading;
    drawChrome();redraw();
  }
  function ensureDialog(){
    if(dialog)return;
    const mk=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e;};
    dialog=mk('div','routeScene');dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','routeSceneTitle');
    const panel=mk('div','routeScenePanel'),head=mk('header'),bar=mk('div','routeSceneBar'),opts=mk('aside','routeSceneOptions');
    const titles=mk('div','routeSceneHeading');els.eyebrow=mk('small');els.subtitle=mk('p');
    els.optionsTitle=mk('h3');els.layersTitle=mk('legend');els.cameraTitle=mk('legend');
    const layers=mk('fieldset','routeSceneLayers'),camera=mk('fieldset','routeSceneLighting');
    els.modelNote=mk('p','routeSceneModelNote');els.hint=mk('p','routeSceneHint');
    els.sourceTitle=mk('summary');const sources=mk('details','routeSceneSources');sources.append(els.sourceTitle);
    els.title=mk('h2');els.title.id='routeSceneTitle';els.close=mk('button','routeSceneClose');els.close.type='button';els.close.textContent='×';titles.append(els.eyebrow,els.title,els.subtitle);head.append(titles,els.close);
    els.stage=mk('div','routeSceneStage');
    els.status=mk('p','routeSceneStatus');els.slopeKey=mk('p','routeSceneKey');els.slopeKey.hidden=true;
    els.play=mk('button','routeScenePlay');els.play.type='button';els.reset=mk('button');els.reset.type='button';
    els.scrub=mk('input');els.scrub.type='range';els.scrub.min='0';els.scrub.max='1000';els.scrub.value='0';
    els.readout=mk('output');bar.append(els.play,els.scrub,els.readout,els.reset);
    const check=(key)=>{const l=mk('label'),i=mk('input'),s=mk('span');i.type='checkbox';l.append(i,s);els[key]=i;els[key+'Label']=s;return l;};
    const slider=(key,min,max,step)=>{const l=mk('label','routeSceneVe'),s=mk('span'),i=mk('input');i.type='range';i.min=min;i.max=max;i.step=step;l.append(s,i);els[key]=i;els[key+'Label']=s;return l;};
    layers.append(els.layersTitle,check('imagery'),check('slopes'),check('contours'),check('names'));
    camera.append(els.cameraTitle,slider('ve','1','15','.5'),slider('sun','0','359','1'));
    opts.append(els.optionsTitle,layers,camera,els.modelNote);
    els.caption=mk('p','routeSceneCaption');
    sources.append(els.caption);panel.append(head,els.stage,bar,opts,sources);dialog.append(panel);document.body.append(dialog);
    els.close.addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    els.play.addEventListener('click',play);
    els.reset.addEventListener('click',()=>{if(!scene)return;Object.assign(scene,{t:0,playing:false});scene.cam={az:-.6,tilt:.52,zoom:1};drawChrome();redraw();});
    els.scrub.addEventListener('input',()=>{if(!scene)return;scene.playing=false;scene.t=Number(els.scrub.value)/1000;const m=trackAt(scene.track,scene.t);if(scene.t>0){scene.cam.az=m.heading;scene.cam.tilt=.36;}drawChrome();redraw();});
    const bind=(key,event,apply)=>els[key].addEventListener(event,()=>{if(!scene)return;apply();drawChrome();redraw();});
    bind('names','change',()=>{scene.names=els.names.checked;});bind('imagery','change',()=>{scene.imagery=els.imagery.checked;});
    bind('contours','change',()=>{scene.contours=els.contours.checked;});bind('slopes','change',()=>{scene.slopes=els.slopes.checked;});
    bind('ve','input',()=>{scene.ve=Number(els.ve.value);});bind('sun','input',()=>{scene.sun=Number(els.sun.value);});
    window.addEventListener('resize',()=>{if(scene)redraw();});
  }
  function mountCanvases(){
    // Un lienzo nuevo por apertura: un contexto WebGL no se puede reutilizar como 2D ni al revés.
    els.stage.replaceChildren();
    canvas=document.createElement('canvas');canvas.className='routeSceneCanvas';
    overlay=document.createElement('canvas');overlay.className='routeSceneCanvas routeSceneOverlay';overlay.tabIndex=0;
    els.stage.append(canvas,overlay,els.status,els.slopeKey,els.hint);
    let drag=null;
    overlay.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};overlay.setPointerCapture?.(e.pointerId);});
    overlay.addEventListener('pointermove',e=>{if(!drag||!scene)return;scene.cam.az+=(e.clientX-drag.x)*.008;scene.cam.tilt=clamp(scene.cam.tilt+(e.clientY-drag.y)*.006,.1,1.5);drag={x:e.clientX,y:e.clientY};redraw();});
    ['pointerup','pointercancel'].forEach(n=>overlay.addEventListener(n,()=>{drag=null;}));
    overlay.addEventListener('wheel',e=>{if(!scene)return;e.preventDefault();scene.cam.zoom=clamp(scene.cam.zoom*(e.deltaY<0?1.12:.89),.4,8);redraw();},{passive:false});
    overlay.addEventListener('keydown',e=>{if(!scene)return;const k=e.key;if(k==='ArrowLeft')scene.cam.az-=.1;else if(k==='ArrowRight')scene.cam.az+=.1;else if(k==='ArrowUp')scene.cam.tilt=clamp(scene.cam.tilt+.06,.1,1.5);else if(k==='ArrowDown')scene.cam.tilt=clamp(scene.cam.tilt-.06,.1,1.5);else if(k==='+'||k==='=')scene.cam.zoom=clamp(scene.cam.zoom*1.12,.4,8);else if(k==='-')scene.cam.zoom=clamp(scene.cam.zoom*.89,.4,8);else return;e.preventDefault();redraw();});
  }
  let opener=null;
  async function open(){
    ensureDialog();opener=document.activeElement;
    dialog.hidden=false;scene=null;renderer?.dispose?.();renderer=null;mountCanvases();
    els.title.textContent=ui('Vista 3D de la ruta','3D route view');
    els.status.hidden=false;els.status.textContent=ui('Cargando el relieve y la imagen de la zona…','Loading terrain and imagery for the area…');
    const controls=[els.play,els.reset,els.scrub,els.ve,els.sun,els.names,els.imagery,els.contours,els.slopes];
    controls.forEach(e=>{e.disabled=true;});els.caption.textContent='';els.readout.textContent='';
    els.close.focus();
    try{
      const built=await build(activeMission());
      if(dialog.hidden)return;
      scene=built;els.status.hidden=true;
      renderer=createGL(canvas,scene);
      if(!renderer){mountCanvases();renderer=create2D(canvas);}
      controls.forEach(e=>{e.disabled=false;});
      els.names.checked=true;els.contours.checked=true;els.slopes.checked=false;els.ve.value=String(scene.ve);els.sun.value=String(scene.sun);
      drawChrome();redraw();
    }catch(error){els.status.hidden=false;els.status.textContent=error?.message||String(error);}
  }
  function close(){if(!dialog)return;dialog.hidden=true;if(scene)scene.playing=false;scene=null;if(raf){cancelAnimationFrame(raf);raf=0;}renderer?.dispose?.();renderer=null;opener?.focus?.();}
  function init(){ensureMineralControl();}
  window.addEventListener('jezero:languagechange',translate);
  window.JEZERO_ROUTE_SCENE=Object.freeze({open,close,init,setMineral,MINERALS,mineralCoverage,
    _test:{upsample,contourInterval,sceneFrame,gridSize,gridPoints,fillElevations,autoExaggeration,routeTrack,trackAt,nearbyReferences,project,textureTiles,textureMapping,cameraMatrices,toScreen}});
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
    // El mapa se crea después de cargar los datos: se reintenta hasta que exista el panel de capas y el mapa.
    let tries=0;const timer=setInterval(()=>{ensureMineralControl();if((mineralSelect&&liveMap())||++tries>60){clearInterval(timer);if(mineralSelect&&liveMap())liveMap().on('moveend',updateMineralNote);}},500);
  }
})();
