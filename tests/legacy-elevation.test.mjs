import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{parseElevation} from '../legacy-elevation.mjs';
import netlify from '../netlify/functions/elevations.mjs';
import root from '../elevations.mjs';
const request=body=>new Request('http://localhost/elevations',{method:'POST',body:JSON.stringify(body)});
test('legacy elevation keeps null, whitespace, boolean and valid zero distinct',()=>{
  for(const value of [null,undefined,'', ' ',false,true,'no-data'])assert.equal(parseElevation({results:[{attributes:{Value:value}}]}),null);
  for(const value of [0,'0'])assert.equal(parseElevation({results:[{attributes:{Value:value}}]}),0);
  assert.equal(parseElevation({value:[-123]}),-123);
});
test('both legacy deployment entry points use the same validated handler',()=>{assert.equal(root,handler);assert.equal(netlify,handler);});
test('legacy malformed, oversized and wrong-method requests fail before remote calls',async()=>{
  assert.equal((await handler(new Request('http://localhost'))).status,405);
  assert.equal((await handler(new Request('http://localhost',{method:'POST',body:'{'}))).status,400);
  assert.equal((await handler(request({points:[]}))).status,400);
  assert.equal((await handler(new Request('http://localhost',{method:'POST',body:' '.repeat(200_001)}))).status,413);
});
test('legacy coordinates reject missing or boolean values without network and zero elevation is retained',async t=>{
  const original=globalThis.fetch;let calls=0;t.after(()=>globalThis.fetch=original);globalThis.fetch=async()=>{calls++;return Response.json({results:[{attributes:{Value:0}}]});};
  const response=await handler(request({points:[{lat:null,lon:77},{lat:false,lon:77},{lat:'',lon:77},{lat:91,lon:77},{lat:18.123,lon:77.456}]}));
  const result=await response.json();assert.equal(calls,1);assert.ok(result.points.slice(0,4).every(x=>x.elevationM===null&&x.error));assert.equal(result.points[4].elevationM,0);
});
test('legacy upstream failure yields explicit unknown instead of a fabricated elevation',async t=>{
  const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);globalThis.fetch=async()=>{throw Error('Test network failure');};
  const result=await(await handler(request({points:[{lat:19.345,lon:78.567}]}))).json();assert.equal(result.points[0].elevationM,null);assert.match(result.points[0].error,/network failure/);
});
