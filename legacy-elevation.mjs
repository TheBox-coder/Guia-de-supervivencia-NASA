/* Compatibility endpoint. The live planner uses mars-elevation.js instead. */
import validation from './modules/validation.cjs';
const ENDPOINT='https://tiles.arcgis.com/tiles/nzS0F0zdNLvs7nc8/arcgis/rest/services/Mars_MOLA_elevation/MapServer/identify';
const cache=new Map(),MAX_BYTES=200_000;
export function parseElevation(payload){
  const result=payload?.results?.[0],attributes=result?.attributes||{};
  const candidates=['Value','value','ELEVATION','elevation','Elevation','PIXELVALUE','Pixel Value'].map(key=>attributes[key]);
  candidates.push(result?.value,Array.isArray(payload?.value)?payload.value[0]:undefined);
  for(const candidate of candidates){const n=validation.numeric(candidate);if(n!==null)return n;}
  return null;
}
async function elevation(lat,lon){
  const key=`${lat.toFixed(5)},${lon.toFixed(5)}`;
  if(cache.has(key))return cache.get(key);
  const params=new URLSearchParams({f:'json',geometry:`${lon},${lat}`,geometryType:'esriGeometryPoint',sr:'104905',layers:'all:0',tolerance:'1',mapExtent:`${lon-.01},${lat-.01},${lon+.01},${lat+.01}`,imageDisplay:'800,600,96',returnGeometry:'false'});
  const response=await fetch(`${ENDPOINT}?${params}`,{signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw Error(`Elevation HTTP ${response.status}`);
  const payload=await response.json();if(payload.error)throw Error('Elevation service error');
  const value=parseElevation(payload);
  if(value!==null){cache.set(key,value);if(cache.size>1000)cache.delete(cache.keys().next().value);}
  return value;
}
async function bodyJson(request){
  if(Number(request.headers.get('content-length'))>MAX_BYTES)throw Object.assign(Error('Body too large'),{status:413});
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');
  const chunks=[];let length=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Object.assign(Error('Body too large'),{status:413});}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default async function handler(request){
  if(request.method!=='POST')return send({error:'POST required'},405);
  let body;try{body=await bodyJson(request);}catch(e){return send({error:e.status===413?'Body too large':'Invalid JSON'},e.status||400);}
  if(!Array.isArray(body?.points)||body.points.length<1||body.points.length>400)return send({error:'1–400 points required'},400);
  const out=new Array(body.points.length);let next=0;
  await Promise.all(Array.from({length:Math.min(8,body.points.length)},async()=>{while(next<body.points.length){const i=next++,p=body.points[i];try{const {lat,lon}=validation.point(p,i);out[i]={...p,elevationM:await elevation(lat,lon)};}catch(e){out[i]={...(p&&typeof p==='object'?p:{}),elevationM:null,error:e.message};}}}));
  return send({source:'MOLA / ArcGIS public map service',points:out});
}
