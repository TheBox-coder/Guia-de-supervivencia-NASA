import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function setup(){
 const ids=new Map(),calls=[];
 class Element {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.events={};this.value='';}
  set id(value){this._id=value;ids.set(value,this)} get id(){return this._id}
  set innerHTML(value){for(const [,tag,id] of value.matchAll(/<(input|ul|p)[^>]*id="([^"]+)"/g)){const el=new Element(tag);el.id=id;this.append(el)}}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  fire(type,props={}){const event={target:this,preventDefault(){this.defaultPrevented=true},...props};for(const fn of this.events[type]||[])fn(event);return event}
  setAttribute(name,value){this.attrs[name]=value}
  append(...items){this.children.push(...items)} replaceChildren(...items){this.children=items}
  querySelector(){return this.children.find(el=>el.attrs['aria-selected']==='true')}
  scrollIntoView(){} focus(){} showModal(){this.open=true} close(){this.open=false}
 }
 const body=new Element('body'),document=new Element('document');
 document.body=body;document.createElement=tag=>new Element(tag);document.getElementById=id=>ids.get(id);
 document.querySelector=selector=>selector==='dialog[open]'?body.children.find(el=>el.open):selector.startsWith('.moduleRail ')?{}:null;
 const window={JEZERO_I18N:{ui:(es,en)=>en},JEZERO_MODULES:{activate:name=>calls.push(name)},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../modules/command-palette.js',import.meta.url),'utf8'),{window,document,navigator:{platform:'Win32'}});
 return {window,document,body,calls,input:ids.get('commandInput'),list:ids.get('commandList'),dialog:body.children[0]};
}

test('hover and arrow navigation retain clickable command rows',()=>{
 const s=setup();s.window.JEZERO_COMMANDS.open();const rows=[...s.list.children];
 rows[2].fire('mousemove');assert.equal(s.list.children[2],rows[2]);assert.equal(rows[2].attrs['aria-selected'],'true');
 rows[2].fire('click');assert.deepEqual(s.calls,['operations']);assert.equal(s.dialog.open,false);
 s.window.JEZERO_COMMANDS.open();const first=s.list.children[0];s.input.fire('keydown',{key:'ArrowDown'});assert.equal(s.list.children[0],first);
 s.input.fire('keydown',{key:'Enter'});assert.deepEqual(s.calls,['operations','survival']);
});

test('palette accepts displayed quick codes followed by Enter',()=>{
 const s=setup();for(const [code,module] of [['H','home'],['m','explorer'],['R','analysis']]){
  s.window.JEZERO_COMMANDS.open();s.input.value=code;s.input.fire('input');assert.equal(s.list.children.length,1);
  s.input.fire('keydown',{key:'Enter'});assert.equal(s.calls.at(-1),module);
 }
 s.window.JEZERO_COMMANDS.open();s.input.value='weather';s.input.fire('input');s.input.fire('keydown',{key:'Enter'});assert.equal(s.calls.at(-1),'weather');
});

test('global shortcuts open sections but leave text fields and modifiers alone',()=>{
 const s=setup();s.document.fire('keydown',{target:s.body,key:'m'});assert.deepEqual(s.calls,['explorer']);
 s.document.fire('keydown',{target:s.input,key:'h'});s.document.fire('keydown',{target:s.body,key:'r',ctrlKey:true});assert.deepEqual(s.calls,['explorer']);
 s.document.fire('keydown',{target:s.body,key:'k',ctrlKey:true});assert.equal(s.dialog.open,true);
 s.document.fire('keydown',{target:s.input,key:'k',ctrlKey:true});assert.equal(s.dialog.open,false);
});

const areaShortcuts=[['H','home'],['G','survival'],['C','operations'],['D','dashboard'],['W','weather'],['M','explorer'],['P','planner'],['E','eva'],['R','analysis'],['S','settings']];
test('every section displays a unique shortcut and supports it globally and in search',()=>{
 const s=setup();s.window.JEZERO_COMMANDS.open();
 const badges=s.list.children.slice(0,10).map(row=>row.children.find(el=>el.tagName==='KBD')?.textContent);
 assert.deepEqual(badges,areaShortcuts.map(([key])=>key));assert.equal(new Set(badges).size,10);s.dialog.close();
 for(const [key,module] of areaShortcuts){
  s.document.fire('keydown',{target:s.body,key:key.toLowerCase()});assert.equal(s.calls.at(-1),module);
  s.window.JEZERO_COMMANDS.open();s.input.value=key;s.input.fire('input');assert.equal(s.list.children.length,1);
  s.input.fire('keydown',{key:'Enter'});assert.equal(s.calls.at(-1),module);
 }
});
