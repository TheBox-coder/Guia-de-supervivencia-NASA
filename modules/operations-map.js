(() => {
 let layer=null,shelters=[],relays=[],chariot=null;
 const ui=(es,en)=>window.JEZERO_I18N?.ui?window.JEZERO_I18N.ui(es,en):es;
 const PRIORITY={base:100,chariot:90,shelter:80,relay:70,target:60};
 const KIND_LABEL={base:['Base de la misión','Mission base'],chariot:['Chariot','Chariot'],shelter:['Refugio','Shelter'],relay:['Enlace de comunicaciones','Communications relay'],target:['Punto de la misión','Mission point'],finish:['Fin de la misión','Mission finish']};
 const PIXEL_TOLERANCE=16;
 // Todos los elementos con posición declarada; las coordenadas reales nunca se desplazan.
 function items(){
  const out=[];
  try{for(const p of (window.JEZERO_UI_ACTIONS?.missionDraft?.()?.points||[]))if(Number.isFinite(p.lat)&&Number.isFinite(p.lon))out.push({kind:p.type==='base'?'base':'target',name:p.name,lat:p.lat,lon:p.lon,detail:[ui('Tipo','Type')+': '+ui(...(p.type==='base'?KIND_LABEL.base:KIND_LABEL.target)),p.dwellMin?ui('Permanencia','Dwell')+': '+p.dwellMin+' min':null]});}catch{}
  if(chariot&&Number.isFinite(chariot.lat))out.push({kind:'chariot',name:chariot.name||'Chariot',lat:chariot.lat,lon:chariot.lon,detail:[chariot.mobility&&chariot.mobility!=='unknown'?ui('Estado','State')+': '+chariot.mobility:null]});
  for(const s of shelters)if(Number.isFinite(s.lat))out.push({kind:'shelter',name:s.name,lat:s.lat,lon:s.lon,detail:[s.capacity!=null?ui('Capacidad','Capacity')+': '+s.capacity:null,ui('Disponibilidad','Availability')+': '+(s.available?ui('declarada disponible','declared available'):ui('no disponible / sin declarar','unavailable / undeclared')),s.source?ui('Fuente','Source')+': '+s.source:null]});
  for(const r of relays)if(Number.isFinite(r.lat))out.push({kind:'relay',name:r.name,lat:r.lat,lon:r.lon,detail:[r.radiusKm!=null?ui('Radio de cobertura declarado','Declared coverage radius')+': '+r.radiusKm+' km':null,r.source?ui('Fuente','Source')+': '+r.source:null]});
  return out;
 }
 function near(list,lon,lat,resolution){const tol=PIXEL_TOLERANCE*resolution;return list.filter(i=>Math.abs(i.lon-lon)<=tol&&Math.abs(i.lat-lat)<=tol);}
 function groupAt(pixel){
  if(typeof map==='undefined'||!map)return [];
  const [lon,lat]=map.getCoordinateFromPixel(pixel)||[];if(!Number.isFinite(lon))return [];
  return near(items(),lon,lat,map.getView().getResolution()).sort((a,b)=>PRIORITY[b.kind]-PRIORITY[a.kind]);
 }
 // Etiqueta con prioridad: un elemento por posición visible (declutter) y "+N" con los que comparten el sitio.
 function labelFor(feature,resolution){
  const own=feature.get('item'),others=near(items(),own.lon,own.lat,resolution).filter(i=>!(i.kind===own.kind&&i.name===own.name));
  const zoomedOut=resolution>0.703125/Math.pow(2,4);
  const top=others.every(i=>PRIORITY[i.kind]<=PRIORITY[own.kind]);
  if(zoomedOut&&own.kind==='relay')return '';
  return top&&others.length?`${own.name} (+${others.length})`:own.name;
 }
 function featureStyle(feature,resolution){
  const colors=window.JEZERO_THEMES?.getColors?.()||{accent2:'#55c8ff',success:'#54d6a5',warning:'#ffc857'};
  const item=feature.get('item'),priority=PRIORITY[item.kind];
  const text=labelFor(feature,resolution);
  const label=new ol.style.Text({text,offsetY:item.kind==='relay'?15:-18,font:'600 12px Segoe UI',fill:new ol.style.Fill({color:'#fff'}),stroke:new ol.style.Stroke({color:'#06101f',width:3}),overflow:false});
  const image=item.kind==='relay'?new ol.style.Circle({radius:5,fill:new ol.style.Fill({color:colors.accent2})}):new ol.style.RegularShape({points:4,radius:9,angle:Math.PI/4,fill:new ol.style.Fill({color:item.available===false?colors.warning:colors.success}),stroke:new ol.style.Stroke({color:'#06101f',width:2})});
  return new ol.style.Style({image,text:text?label:undefined,zIndex:priority});
 }
 function draw(a,b,c){shelters=a||[];relays=b||[];chariot=c||null;if(typeof map==='undefined'||!map)return;
  const colors=window.JEZERO_THEMES?.getColors?.()||{accent2:'#55c8ff',success:'#54d6a5',warning:'#ffc857'};
  if(!layer){layer=new ol.layer.Vector({source:new ol.source.Vector(),zIndex:14,declutter:true,style:featureStyle});layer.set('layerId','operator-support-assets');map.addLayer(layer);}
  const source=layer.getSource();source.clear();
  for(const s of [...shelters.map(x=>({...x,_kind:'shelter'})),...(chariot?[{...chariot,available:true,_kind:'chariot'}]:[])]){const feature=new ol.Feature({geometry:new ol.geom.Point([s.lon,s.lat]),item:{kind:s._kind,name:s.name,lat:s.lat,lon:s.lon,available:s.available}});source.addFeature(feature);}
  for(const r of relays){const point=new ol.Feature({geometry:new ol.geom.Point([r.lon,r.lat]),item:{kind:'relay',name:r.name,lat:r.lat,lon:r.lon}});source.addFeature(point);}
  if(chariot?.range?.status==='estimated'&&chariot.range.radiusKm>0){const points=[],rad=Math.PI/180,phi=chariot.lat*rad,lambda=chariot.lon*rad,alpha=chariot.range.radiusKm/3389.5;for(let i=0;i<=64;i++){const bearing=i/64*Math.PI*2,p=Math.asin(Math.sin(phi)*Math.cos(alpha)+Math.cos(phi)*Math.sin(alpha)*Math.cos(bearing)),l=lambda+Math.atan2(Math.sin(bearing)*Math.sin(alpha)*Math.cos(phi),Math.cos(alpha)-Math.sin(phi)*Math.sin(p));points.push([l/rad,p/rad]);}const area=new ol.Feature({geometry:new ol.geom.Polygon([points])});area.setStyle([new ol.style.Style({fill:new ol.style.Fill({color:'rgba(255,200,87,.10)'}),stroke:new ol.style.Stroke({color:colors.warning,width:2,lineDash:[5,5]})}),new ol.style.Style({geometry:new ol.geom.Point(points[0]),text:new ol.style.Text({text:ui('Alcance Chariot','Chariot reach')+' · '+chariot.range.radiusKm.toFixed(1)+' km',offsetY:-16,font:'600 12px Segoe UI',fill:new ol.style.Fill({color:colors.warning}),stroke:new ol.style.Stroke({color:'#06101f',width:3})})})]);source.addFeature(area);}

 }
 // Ventana con todos los elementos del lugar pulsado (los ocultos por declutter incluidos).
 function showGroup(list){
  const box=document.getElementById('mapInfo');if(!box||!list.length)return false;
  const $=id=>document.getElementById(id);
  $('mapInfoKind').textContent=list.length>1?ui('UBICACIONES AGRUPADAS','GROUPED LOCATIONS'):ui(...KIND_LABEL[list[0].kind]).toUpperCase();
  $('mapInfoTitle').textContent=list.length>1?ui(`${list.length} elementos en este sitio`,`${list.length} items at this site`):list[0].name;
  const meta=$('mapInfoMeta');meta.replaceChildren();
  for(const i of list){const d=document.createElement('div');d.className='mapInfoGroupItem';const t=document.createElement('b');t.textContent=`${i.name} · ${ui(...KIND_LABEL[i.kind])}`;const c=document.createElement('small');c.textContent=`${Math.abs(i.lat).toFixed(5)}° ${i.lat<0?'S':'N'} · ${Math.abs(i.lon).toFixed(5)}° ${i.lon<0?'W':'E'}`;d.append(t,document.createElement('br'),c);for(const line of i.detail||[])if(line){const l=document.createElement('div');l.textContent=line;d.append(l);}meta.append(d);}
  $('mapInfoCoords').textContent=ui('Las coordenadas de cada elemento son las declaradas; no se desplazan para separarlos.','Each item keeps its declared coordinates; they are not moved to separate them.');
  $('mapInfoDescription').textContent='';$('mapInfoSource').style.display='none';
  $('mapInfoUseBase').style.display='none';$('mapInfoAdd').style.display='none';
  delete box.dataset.refKind;box.classList.remove('hide');return true;
 }
 function handleClick(evt){
  const list=groupAt(evt.pixel);
  // Un solo elemento de la misión lo gestiona el flujo de planificación; los de soporte y los grupos abren la ficha.
  if(list.length>1||(list.length===1&&['chariot','shelter','relay'].includes(list[0].kind)))return showGroup(list);
  return false;
 }
 const timer=setInterval(()=>{if(typeof map!=='undefined'&&map){clearInterval(timer);draw(shelters,relays,chariot);}},300);setTimeout(()=>clearInterval(timer),30000);
 window.addEventListener('jezero:themechange',()=>draw(shelters,relays,chariot));
 window.addEventListener('jezero:languagechange',()=>layer?.changed());
 if(typeof document!=='undefined')document.addEventListener('jezero:missionedited',()=>layer?.changed());
 window.JEZERO_SUPPORT_MAP=Object.freeze({draw,focus:s=>{if(typeof map!=='undefined'&&map){window.JEZERO_PANELS?.set(false,false);map.getView().animate({center:[s.lon,s.lat],zoom:12,duration:400});}},groupAt,handleClick,items,countNear:(lon,lat,resolution)=>near(items(),lon,lat,resolution).length});
})();
