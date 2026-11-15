import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {engine,params,base,target} from './helpers.mjs';
test('HTTP publication, input validation, PDF and rate limit',async t=>{
 const child=spawn(process.execPath,[new URL('../server.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{env:{...process.env,PORT:'18766'},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server timeout')),7000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
 const origin='http://127.0.0.1:18766';
 const html=await(await fetch(origin+'/')).text();
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.(?:js|cjs|css)(?:\?[^"]*)?)"/g)].map(m=>m[1]);
 for(const asset of assets){const response=await fetch(new URL(asset,origin));assert.equal(response.status,200,'Linked asset must be published: '+asset);}
 const logo=html.match(/class="brandLogo"[^>]*src="([^"]+)"/)[1];
 assert.match(logo,/dust-rider-logo\.png/);
 const logoResponse=await fetch(new URL(logo,origin));assert.equal(logoResponse.status,200);assert.equal(logoResponse.headers.get('content-type'),'image/png');
 assert.deepEqual([...new Uint8Array(await logoResponse.arrayBuffer()).slice(0,8)],[137,80,78,71,13,10,26,10]);
 const worker=await(await fetch(origin+'/service-worker.js')).text();assert.ok(worker.includes("'/assets/dust-rider-logo.png'"));
 assert.equal((await fetch(origin+'/assets/jezero-mark.svg')).status,200,'Older cached pages retain their logo');
 for(const file of ['/','/script.js','/modules/validation.cjs','/modules/route-engine.cjs','/modules/assurance.cjs','/modules/mission-control-engine.cjs','/modules/mission-control.js','/modules/dashboard.js','/modules/chariot-calculator-engine.cjs','/modules/chariot-calculator.js','/assets/chariot-proposal.jpeg','/control.css','/mars-data.json','/assets/favicon.ico']){
  const response=await fetch(origin+file);assert.equal(response.status,200,file);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy'));
 }
 for(const file of ['/jezero_mission_control.html','/control','/dashboard']){
  const response=await fetch(origin+file);assert.equal(response.status,200,file);
  assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(await response.text(),/id="dashboardContent"/);
 }
 assert.doesNotMatch((await fetch(origin+'/')).headers.get('content-security-policy').split('script-src')[1].split(';')[0],/'unsafe-inline'/);
 for(const file of ['/server.mjs','/pdf-report.mjs','/package.json','/db-schema.sql','/docs/linea-base.json','/legacy-elevation.mjs','/.git/config','/README.md','/tests/server.test.mjs','/data/mars-data.json','/%2e%2e%5cserver.mjs'])assert.equal((await fetch(origin+file)).status,404,file);
 assert.equal((await fetch(origin+'/%zz')).status,400);
 assert.equal((await fetch(origin+'/api/mars-nomenclature')).status,400);
 assert.equal((await fetch(origin+'/api/mars-nomenclature?west=-190&east=0&south=0&north=10')).status,400);
 const health=await(await fetch(origin+'/api/health')).json();assert.equal(health.check,'server-liveness');
 assert.equal((await fetch(origin+'/script.js',{method:'HEAD'})).status,200);
 assert.equal((await fetch(origin+'/script.js',{method:'POST'})).status,405);
 const post=body=>fetch(origin+'/api/mission-pdf',{method:'POST',headers:{'content-type':'application/json'},body});
 assert.equal((await post('{}')).status,400);
 assert.equal((await post('{')).status,400);
 assert.equal((await fetch(origin+'/api/mission-pdf',{method:'POST',body:'{}'})).status,415);
 const {ctx}=engine();const leg=await ctx.calculateLeg(base,target,'balanced',params),m=ctx.aggregateMission([leg],'balanced',params,[base,target]);
 Object.assign(m,{availableHours:6,params,overBudget:false});
 const report={selectedMode:'balanced',points:[base,target],params,mission:{name:'Prueba de misión'},selected:m,strategies:[m],software:{version:'V44'},dataSources:{marsRadiusKm:3389.5}};
 const response=await post(JSON.stringify(report));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');
 const pdf=Buffer.from(await response.arrayBuffer());assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.4');assert.match(pdf.toString('latin1'),/%%EOF/);
 for(const invalid of [{...report,selectedMode:'risk'},{...report,selected:{...m,legs:[]}},{...report,mission:{name:'x'.repeat(6000)}}])assert.equal((await post(JSON.stringify(invalid))).status,400);
 assert.equal((await post(' '.repeat(2_000_001))).status,413);
 const http=await import('node:http');
 const chunkedStatus=await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/mission-pdf',{method:'POST',headers:{'content-type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);for(let i=0;i<6;i++)req.write(' '.repeat(500_000));req.end();});
 assert.equal(chunkedStatus,413);
 let limited=false;
 for(let i=0;i<15;i++){const r=await post('{}');if(r.status===429){limited=true;assert.equal(r.headers.get('retry-after'),'60');break;}}
 assert.equal(limited,true);
});
test('all JavaScript source files have valid syntax',async()=>{
 const {spawnSync}=await import('node:child_process');
 const root=new URL('../',import.meta.url);
 for(const file of fs.readdirSync(root,{recursive:true}).filter(f=>/\.(js|mjs|cjs)$/.test(f))){
  const result=spawnSync(process.execPath,['--check',new URL(file.replaceAll('\\','/'),root).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{encoding:'utf8'});assert.equal(result.status,0,`${file}: ${result.stderr}`);
 }
});
