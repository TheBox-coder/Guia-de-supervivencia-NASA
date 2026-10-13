(() => {
 let layer=null,shelters=[],relays=[];
 function draw(a,b){shelters=a||[];relays=b||[];if(typeof map==='undefined'||!map)return;
  const colors=window.JEZERO_THEMES?.getColors?.()||{accent2:'#55c8ff',success:'#54d6a5',warning:'#ffc857'};
  if(!layer){layer=new ol.layer.Vector({source:new ol.source.Vector(),zIndex:14});layer.set('layerId','operator-support-assets');map.addLayer(layer);}
  const source=layer.getSource();source.clear();
  for(const s of shelters){const feature=new ol.Feature({geometry:new ol.geom.Point([s.lon,s.lat])});feature.setStyle(new ol.style.Style({image:new ol.style.RegularShape({points:4,radius:9,angle:Math.PI/4,fill:new ol.style.Fill({color:s.available?colors.success:colors.warning}),stroke:new ol.style.Stroke({color:'#06101f',width:2})}),text:new ol.style.Text({text:s.name,offsetY:-18,font:'600 12px Segoe UI',fill:new ol.style.Fill({color:'#fff'}),stroke:new ol.style.Stroke({color:'#06101f',width:3})})}));source.addFeature(feature);}
  for(const r of relays){const point=new ol.Feature({geometry:new ol.geom.Point([r.lon,r.lat])});point.setStyle(new ol.style.Style({image:new ol.style.Circle({radius:5,fill:new ol.style.Fill({color:colors.accent2})}),text:new ol.style.Text({text:r.name,offsetY:15,fill:new ol.style.Fill({color:'#fff'}),stroke:new ol.style.Stroke({color:'#06101f',width:3})})}));source.addFeature(point);if(r.radiusKm===null)continue;const points=[],rad=Math.PI/180,phi=r.lat*rad,lambda=r.lon*rad,alpha=r.radiusKm/3389.5;for(let i=0;i<=64;i++){const bearing=i/64*Math.PI*2,p=Math.asin(Math.sin(phi)*Math.cos(alpha)+Math.cos(phi)*Math.sin(alpha)*Math.cos(bearing)),l=lambda+Math.atan2(Math.sin(bearing)*Math.sin(alpha)*Math.cos(phi),Math.cos(alpha)-Math.sin(phi)*Math.sin(p));points.push([l/rad,p/rad]);}const area=new ol.Feature({geometry:new ol.geom.Polygon([points])});area.setStyle(new ol.style.Style({fill:new ol.style.Fill({color:'rgba(85,200,255,.07)'}),stroke:new ol.style.Stroke({color:colors.accent2,width:1.5,lineDash:[5,5]})}));source.addFeature(area);}
 }
 const timer=setInterval(()=>{if(typeof map!=='undefined'&&map){clearInterval(timer);draw(shelters,relays);}},300);setTimeout(()=>clearInterval(timer),30000);
 window.addEventListener('jezero:themechange',()=>draw(shelters,relays));
 window.JEZERO_SUPPORT_MAP=Object.freeze({draw,focus:s=>{if(typeof map!=='undefined'&&map){window.JEZERO_PANELS?.set(false,false);map.getView().animate({center:[s.lon,s.lat],zoom:12,duration:400});}}});
})();
