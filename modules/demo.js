(() => {
  let enabled=false,layer=null,visibility=null;
  const sample=points=>Promise.resolve(points.map(p=>{
    const x=(Number(p.lon)-77.45088)*56119,y=(Number(p.lat)-18.44463)*59157;
    return {...p,elevationM:-2550+x*.002+y*.001+18*Math.sin(x/320)*Math.cos(y/420),demResolutionM:200};
  }));
  function enable(){
    if(enabled)return;
    if(typeof map==='undefined'||!map)throw new Error('El mapa todavía está cargando. Vuelve a iniciar la demo en unos segundos.');
    enabled=true;visibility={imagery:imageryLayer.getVisible(),mola:molaLayer.getVisible()};imageryLayer.setVisible(false);molaLayer.setVisible(false);
    const features=[];
    for(let r=0;r<32;r++)for(let c=0;c<32;c++){
      const x0=77.36+c*.006,y0=18.35+r*.006,x1=x0+.006,y1=y0+.006,t=(Math.sin(c*.37)*Math.cos(r*.31)+1)/2;
      const feature=new ol.Feature({geometry:new ol.geom.Polygon([[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]])});
      feature.setStyle(new ol.style.Style({fill:new ol.style.Fill({color:`rgb(${Math.round(74+t*49)},${Math.round(49+t*31)},${Math.round(36+t*24)})`})}));features.push(feature);
    }
    for(let r=0;r<18;r++){
      const points=Array.from({length:70},(_,i)=>[77.36+i*.0028,18.36+r*.01+Math.sin(i*.12+r*.5)*.002]);
      const feature=new ol.Feature({geometry:new ol.geom.LineString(points)});feature.setStyle(new ol.style.Style({stroke:new ol.style.Stroke({color:'rgba(240,184,133,.20)',width:1})}));features.push(feature);
    }
    layer=new ol.layer.Vector({source:new ol.source.Vector({features}),zIndex:1});map.addLayer(layer);
    document.querySelector('.mapPanel').dataset.demo='true';document.getElementById('demoModeBadge').hidden=false;
    window.dispatchEvent(new CustomEvent('jezero:demochange',{detail:{enabled:true}}));
  }
  function disable(){
    if(!enabled)return;enabled=false;if(layer)map.removeLayer(layer);layer=null;
    imageryLayer.setVisible(visibility?.imagery!==false);molaLayer.setVisible(Boolean(visibility?.mola));
    document.querySelector('.mapPanel').dataset.demo='false';document.getElementById('demoModeBadge').hidden=true;
    if(typeof invalidateMission==='function')invalidateMission();
    window.dispatchEvent(new CustomEvent('jezero:demochange',{detail:{enabled:false}}));
  }
  window.JEZERO_DEMO=Object.freeze({get enabled(){return enabled;},enable,disable,sample});
})();
