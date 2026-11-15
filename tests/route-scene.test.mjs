import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
 const window={addEventListener(){}};
 const ctx=vm.createContext({window,clearInterval(){},setInterval(){return 0;}});
 vm.runInContext(fs.readFileSync(new URL('../modules/route-scene.js',import.meta.url),'utf8'),ctx);
 return window.JEZERO_ROUTE_SCENE;
}
const api=load(),t=api._test;
const nodes=[{lat:18.44,lon:77.45,elevationM:-2500},{lat:18.44,lon:77.46,elevationM:-2480},{lat:18.45,lon:77.46,elevationM:-2470}];

test('scene frame keeps a minimum size, round-trips coordinates and contains the route',()=>{
 const f=t.sceneFrame(nodes);
 assert.equal(f.sideKm,3);
 for(const n of nodes){const l=f.toLocal(n),g=f.toGeo(l.x,l.y);assert.ok(Math.abs(g.lat-n.lat)<1e-9&&Math.abs(g.lon-n.lon)<1e-9);assert.ok(Math.abs(l.x)<1.5&&Math.abs(l.y)<1.5);}
 const big=t.sceneFrame([{lat:0,lon:0},{lat:0,lon:1}]);assert.ok(big.sideKm>59.1*1.69&&big.sideKm<59.2*1.71);
 assert.equal(t.gridPoints(f,25).length,625);assert.equal(t.gridSize(3),31);assert.equal(t.gridSize(500),61);
});

test('missing DEM cells are filled with the mean and counted; no data at all yields null',()=>{
 const filled=t.fillElevations([10,NaN,30]);
 assert.equal(filled.missing,1);assert.equal(filled.z[1],20);assert.equal(filled.min,10);assert.equal(filled.max,30);
 assert.equal(t.fillElevations([NaN,NaN]),null);
 assert.equal(t.autoExaggeration(3,0,1000),1);assert.equal(t.autoExaggeration(3,0,20),12);
});

test('flyover position follows distance along the route with heading and elevation',()=>{
 const f=t.sceneFrame(nodes),track=t.routeTrack(nodes,f);
 assert.ok(track.totalKm>1.1&&track.totalKm<1.3);
 const start=t.trackAt(track,0),end=t.trackAt(track,1),mid=t.trackAt(track,track.pts[1].km/track.totalKm/2);
 assert.equal(start.km,0);assert.ok(Math.abs(end.elevationM+2470)<1e-6);
 assert.ok(Math.abs(mid.elevationM+2490)<1e-6);assert.ok(Math.abs(mid.heading-Math.PI/2)<1e-6);
 assert.ok(Math.abs(end.heading)<1e-6);
});

test('place names are limited to the scene, deduplicated and ordered by distance to the route',()=>{
 const f=t.sceneFrame(nodes),track=t.routeTrack(nodes,f);
 const refs=t.nearbyReferences([{name:'Lejos',lat:30,lon:77.45},{name:'Cerca',lat:18.441,lon:77.455},{name:'Cerca',lat:18.441,lon:77.455},{name:'Medio',lat:18.455,lon:77.44},{name:'',lat:18.44,lon:77.45}],f,track);
 assert.equal(JSON.stringify(refs.map(r=>r.name)),JSON.stringify(['Cerca','Medio']));
});

test('projection: top-down ignores height, side view ignores depth, rotation turns east into depth',()=>{
 const cam={az:0,tilt:Math.PI/2,s:10,cx:100,cy:100,tx:0,ty:0,tz:0};
 const top=t.project(cam,1,2,5);assert.ok(Math.abs(top.sx-110)<1e-9&&Math.abs(top.sy-80)<1e-9);
 const side=t.project({...cam,tilt:0},1,2,5);assert.ok(Math.abs(side.sy-50)<1e-9);assert.equal(side.depth,2);
 const east=t.project({...cam,az:Math.PI/2},1,0,0);assert.ok(Math.abs(east.depth-1)<1e-9&&Math.abs(east.sx-100)<1e-9);
});

test('mineral layers report honest coverage: global TES, regional CRISM, nothing at Jezero',()=>{
 assert.equal(api.mineralCoverage('',77.45,18.44).status,'none');
 assert.equal(api.mineralCoverage('tes-clay',77.45,18.44).status,'global');
 assert.equal(api.mineralCoverage('crism-smectite',77.45,18.44).status,'outside');
 assert.equal(api.mineralCoverage('crism-smectite',-17,20).status,'regional');
 assert.equal(api.mineralCoverage('crism-sulfate',137.4,-4.7).status,'outside');
 assert.ok(api.MINERALS.every(m=>m.global||m.extent.length===4));
});

test('texture tiles stay within the request budget',()=>{
 const tiles=t.textureTiles([77.42,18.43,77.48,18.46],13);
 assert.ok(tiles&&(tiles.x1-tiles.x0+1)*(tiles.y1-tiles.y0+1)<=12);assert.ok(tiles.z<=13);
});

test('mesh smoothing keeps the DEM samples exactly and adds no extremes on a plane',()=>{
 const z=[0,10,20, 10,20,30, 20,30,40],up=t.upsample(z,3,4);
 assert.equal(up.n,9);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(up.z[i*4*9+j*4]-z[i*3+j])<1e-9);
 assert.ok(Math.min(...up.z)>=-2.6&&Math.max(...up.z)<=42.6);
 assert.equal(t.upsample(z,3,1).n,3);
 assert.equal(t.contourInterval(95),10);assert.equal(t.contourInterval(8),1);assert.equal(t.contourInterval(3000),500);
});

test('texture mapping puts the scene centre and edges at the right tile pixels',()=>{
 const f=t.sceneFrame(nodes),tiles=t.textureTiles(f.extent,13,24),A=t.textureMapping(f,tiles);
 const cols=tiles.x1-tiles.x0+1,rows=tiles.y1-tiles.y0+1;
 const u0=((f.lon0+180)/tiles.span-tiles.x0)/cols,v0=((90-f.lat0)/tiles.span-tiles.y0)/rows;
 assert.ok(Math.abs(A[0]-u0)<1e-12&&Math.abs(A[2]-v0)<1e-12);
 const ne=f.toGeo(1,1),u=A[0]+A[1]*1,v=A[2]-A[3]*1;
 assert.ok(Math.abs(u-((ne.lon+180)/tiles.span-tiles.x0)/cols)<1e-9);assert.ok(Math.abs(v-((90-ne.lat)/tiles.span-tiles.y0)/rows)<1e-9);
 assert.ok(u>A[0]&&v<A[2]); // este = u mayor; norte = v menor (arriba en la imagen)
});

test('perspective camera centres its target and keeps north up when looking north',()=>{
 const f=t.sceneFrame(nodes),track=t.routeTrack(nodes,f),n=3,z=new Array(9).fill(-2500);
 const sc={frame:f,n,z,minM:-2500,maxM:-2400,ve:1,track,t:0,playing:false,cam:{az:0,tilt:.6,zoom:1}};
 const cam=t.cameraMatrices(sc,800,600),centre=t.toScreen(cam,0,0,cam.zk(-2450)),north=t.toScreen(cam,0,1,cam.zk(-2450)),east=t.toScreen(cam,1,0,cam.zk(-2450));
 assert.ok(Math.abs(centre.sx-400)<1e-3&&Math.abs(centre.sy-300)<1e-3);
 assert.ok(north.sy<centre.sy&&Math.abs(north.sx-400)<1e-3);assert.ok(east.sx>centre.sx);
 assert.equal(t.toScreen(cam,cam.eye[0],cam.eye[1]-50,cam.eye[2]),null); // detrás de la cámara
});

test('smoothed terrain never invents peaks or pits between DEM samples',()=>{
 const z=[0,0,100, 0,0,100, 0,0,100],up=t.upsample(z,3,8);
 assert.ok(up.z.every(v=>v>=0&&v<=100));
 for(let i=0;i<up.n;i++)for(let j=0;j<=8;j++)assert.equal(up.z[i*up.n+j],0);
});

test('overview fits terrain corners at portrait and landscape aspect ratios',()=>{
 const f=t.sceneFrame(nodes),track=t.routeTrack(nodes,f),sc={frame:f,n:3,z:new Array(9).fill(-2500),minM:-2500,maxM:-2200,ve:4,track,t:0,playing:false,cam:{az:-.6,tilt:.52,zoom:1}};
 for(const [w,h] of [[360,500],[1100,500]])for(const az of [0,-.6,1.5]){
  const cam=t.cameraMatrices({...sc,cam:{...sc.cam,az}},w,h),half=f.sideKm/2;
  for(const x of [-half,half])for(const y of [-half,half])for(const z of [sc.minM,sc.maxM]){
   const p=t.toScreen(cam,x,y,cam.zk(z));assert.ok(p&&p.sx>=0&&p.sx<=w&&p.sy>=0&&p.sy<=h);
  }
 }
});

test('3D reference labels use the shared translator at draw time and preserve source names',()=>{
 const window={addEventListener(){}};
 const ctx=vm.createContext({window,clearInterval(){},setInterval(){return 0;}});
 vm.runInContext(fs.readFileSync(new URL('../modules/route-scene.js',import.meta.url),'utf8'),ctx);
 const name=window.JEZERO_ROUTE_SCENE._test.referenceName;
 const source='EVA-01 · Base hipotética';
 assert.equal(name(source),source);
 let english=true;
 window.JEZERO_I18N={translateText:text=>english&&text===source?'EVA-01 · Hypothetical base':text};
 assert.equal(name(source),'EVA-01 · Hypothetical base');
 assert.equal(name('Jezero Crater'),'Jezero Crater');
 english=false;assert.equal(name(source),source);
});
