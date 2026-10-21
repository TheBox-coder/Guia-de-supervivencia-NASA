export default async function handler() {
  return new Response(JSON.stringify({ok:true,version:'4.0.0-p0',check:'server-liveness',dem:'MOLA / ArcGIS',note:'Legacy endpoint; provider availability is not checked.'}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
