import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import validation from '../modules/validation.cjs';
test('SDK sampling preserves valid zero elevation and recognizes no-data samples',async()=>{
 const ctx=vm.createContext({window:{JEZERO_VALIDATION:validation},require(_modules,ready){
  class ElevationLayer{load(){return Promise.resolve();}queryElevation(_geometry,options){assert.equal(options.demResolution,200);assert.equal(options.returnSampleInfo,true);return Promise.resolve({geometry:{points:[[0,0,0],[1,0,0],[2,0,null]]},sampleInfo:[{demResolution:200},{demResolution:-1},{demResolution:200}],noDataValue:0});}}
  class Multipoint{constructor(properties){Object.assign(this,properties);}}
  ready(ElevationLayer,Multipoint);
 }});
 vm.runInContext(fs.readFileSync(new URL('../mars-elevation.js',import.meta.url),'utf8'),ctx);await ctx.window.marsElevationReady;
 const points=await ctx.window.queryMarsElevations([{lat:0,lon:0},{lat:0,lon:1},{lat:0,lon:2}]);
 assert.equal(points[0].elevationM,0);assert.equal(points[0].demResolutionM,200);assert.equal(points[1].elevationM,null);assert.equal(points[2].elevationM,null);
});
