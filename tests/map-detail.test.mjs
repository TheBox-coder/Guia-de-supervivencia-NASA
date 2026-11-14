import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

test('regional imagery feathers stay bounded at deep zoom without canvas blur',()=>{
  const layers=[];
  class Tile {
    constructor(options){this.options=options;this.listeners={};layers.push(this);}
    on(name,fn){this.listeners[name]=fn;}
  }
  const context={
    window:{},localStorage:{getItem:()=>null},
    document:{querySelectorAll:()=>[],getElementById:()=>null},
    ol:{tilegrid:{TileGrid:class{}},source:{XYZ:class{on(){}}},layer:{Tile},render:{getRenderPixel:(_,p)=>p}}
  };
  vm.runInNewContext(fs.readFileSync(new URL('../modules/map-detail.js',import.meta.url),'utf8'),context);
  let scale=100;
  const map={addLayer(){},on(){},getPixelFromCoordinate:([x,y])=>[x*scale,-y*scale]};
  context.window.JEZERO_IMAGERY.install(map);
  const thermal=layers[0];
  assert.ok(thermal.options.zIndex>2,'thermal imagery stays above MOLA');
  assert.ok(thermal.options.zIndex<4,'terrain and mission overlays stay above thermal imagery');
  assert.ok(layers.slice(1).every(layer=>layer.options.zIndex<thermal.options.zIndex));
  const regional=layers.filter(layer=>layer.listeners.postrender);
  assert.equal(regional.length,2);
  for(const zoomScale of [100,1e7])for(const pixelRatio of [1,2]){
    scale=zoomScale;
    for(const layer of regional){
      const gradients=[],rectangles=[];
      let saved=0;
      const canvas={save(){saved++;},restore(){saved--;},
        set filter(_){assert.fail('No per-frame canvas blur');},
        createLinearGradient(...coords){gradients.push(coords);return {addColorStop(){}};},
        fillRect(...rect){rectangles.push(rect);}
      };
      layer.listeners.postrender({context:canvas,frameState:{pixelRatio}});
      assert.equal(canvas.globalCompositeOperation,'destination-out');
      assert.equal(gradients.length,4);
      assert.equal(saved,0);
      for(const [x0,y0,x1,y1] of gradients)assert.ok(Math.hypot(x1-x0,y1-y0)<=24*pixelRatio+1e-6);
      for(const [,,w,h] of rectangles)assert.ok(w>0&&h>0&&Math.min(w,h)<=24*pixelRatio+1e-6);
    }
  }
});
