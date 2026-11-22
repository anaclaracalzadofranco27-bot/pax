'use strict';
// Teste sem browser/GPU para o diretor da Aba 8: falhas, cancelamentos,
// geometria da captura e restauração do DOM/MediaRecorder.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'..','source/html/ABA8/director-and-recording.js'),'utf8');
assert(!/tour-snap|snapFinish|buildZip|__tourEdge/.test(source),'ZIP oculto retornou');
assert(!/console\.assert|tween\(C\.zoomOutMs,my,\(\)=>\{\}\)/.test(source),'Ponte ainda sem validação ou com RAF redundante');
assert(source.includes('if (!completed) throw new Error'),'Timeout silencioso retornou');
assert(source.includes('finally {') && source.includes("place(ph.parentNode, sec, ph, false)"),
       'Medição temporária deixou de restaurar o DOM');
const code = source
  // Apenas no teste: não iniciar as animações reais após o start do recorder.
  .replace(/if \(selectedTake === null\) void run\(0\);\s*else void run\(selectedTake.start, selectedTake.end, selectedTake.mode\);/,
           'void selectedTake;')
  .replace('        window.tourAbort = abort;',
           '        window.tourAbort = abort;\n        window.__aba8Test = { startRec, stopRec, computeCaptureGeometry, captureGeometryCache, verifyBridgeSeam, measureNovaCol, waitFor, run };');
assert(!code.includes('void run(selectedTake.start'),'Hook de teste não aplicado');

const makeClasses = (...initial) => {
  const values = new Set(initial);
  return {
    add(...items){items.forEach(x=>values.add(x));},
    remove(...items){items.forEach(x=>values.delete(x));},
    contains(x){return values.has(x);},
    toggle(x,force){
      const enable = force === undefined ? !values.has(x) : !!force;
      if(enable)values.add(x);else values.delete(x);
      return enable;
    }
  };
};
const styled = () => {
  const props = new Map();
  return { setProperty(k,v){props.set(k,v);},removeProperty(k){props.delete(k);},
           getPropertyValue(k){return props.get(k)||'';} };
};
function parentNode(){
  return {
    children:[],
    insertBefore(child,ref){if(child.parentNode && child.parentNode.children){
      child.parentNode.children=child.parentNode.children.filter(x=>x!==child);
    }
      child.parentNode=this;
      const i=ref?this.children.indexOf(ref):-1;
      if(i>=0)this.children.splice(i,0,child);else this.children.push(child);
      return child;
    },
    appendChild(child){return this.insertBefore(child,null);}
  };
}
const button=()=>({style:styled(),classList:makeClasses(),textContent:'',dataset:{mode:'run'},disabled:false,
  addEventListener(name,fn){this[name]=fn;}});
const stage=Object.assign(parentNode(),{
  classList:makeClasses(),style:styled(),clientWidth:960,clientHeight:540,
  offsetHeight:540,parentElement:{clientWidth:1920},rectReads:0,
  getBoundingClientRect(){this.rectReads++;return {left:100,top:50,width:960,height:540};}
});
const runBtn=button(),recBtn=button();
const body={classList:makeClasses(),style:styled(),appendChild(){},};
const fixtures={'tour-stage':stage,'tour-btn':runBtn,'tour-rec':recBtn};
const alerts=[],downloads=[],warnings=[],intervals=new Map(),events=new Map();
let nextTimer=1,captureCount=0,captureMode='ok',initFailure=false,startFailure=false;
let latestTrack=null,latestRecorder=null,clock=1000;
const track=()=>({
  stopped:0,handlers:{},
  stop(){this.stopped++;},
  addEventListener(name,handler){this.handlers[name]=handler;},
  getSettings(){return {displaySurface:'browser'};}
});
const stream=()=>{const video=track();return {video,getTracks(){return [video];},getVideoTracks(){return [video];}}};
class FakeRecorder {
  static isTypeSupported(){return false;}
  constructor(input){
    if(initFailure) throw Error('Injected constructor failure');
    this.input=input;this.state='inactive';this.mimeType='video/webm';
    latestRecorder=this;
  }
  start(){
    if(startFailure) throw Error('Injected start failure');
    this.state='recording';
  }
  requestData(){}
  stop(){
    if(this.state==='inactive')return;
    this.state='inactive';
    if(this.ondataavailable)this.ondataavailable({data:{size:4}});
    if(this.onstop)this.onstop();
  }
}
const window={
  innerWidth:1920,innerHeight:1080,MediaRecorder:FakeRecorder,
  addEventListener(name,fn){events.set(name,fn);},
  removeEventListener(name,fn){if(events.get(name)===fn)events.delete(name);}
};
const navigator={mediaDevices:{async getDisplayMedia(){
  captureCount++;
  if(captureMode==='denied'){const error=Error('permission denied');error.name='NotAllowedError';throw error;}
  const v=stream();latestTrack=v.video;
  if(captureMode==='no-track')return {getVideoTracks:()=>[],getTracks:()=>[v.video]};
  return v;
}}};
let outputTrack;
const document={
  body,
  getElementById(id){return fixtures[id]||null;},
  querySelectorAll(){return [];},
  createComment(){return {parentNode:null,remove(){
    if(this.parentNode){const p=this.parentNode;p.children=p.children.filter(x=>x!==this);this.parentNode=null;}
  }};},
  createElement(tag){
    if(tag==='video')return {
      videoWidth:1920,videoHeight:1080,remove(){this.removed=true;},
      async play(){}
    };
    if(tag==='canvas')return {
      getContext(){return {fillRect(){},drawImage(){}};},
      captureStream(){const v=stream();outputTrack=v.video;return v;}
    };
    if(tag==='a')return {click(){downloads.push(this.download);},remove(){}};
    throw Error('Unexpected element '+tag);
  }
};
const ctx={
  window,document,navigator,MediaRecorder:FakeRecorder,
  APHA_INTRO_CFG:{crossfadeMs:800},APHA_BRIDGE_CFG:{zoomOutMs:1200},
  APHA_CABIN_PALETTE:{background:'#000223'},
  performance:{now(){clock+=10000;return clock;}},
  requestAnimationFrame(){return 1;},cancelAnimationFrame(){},
  getComputedStyle(){return {paddingTop:'10px',paddingLeft:'10px',paddingRight:'10px'};},
  setTimeout(fn){fn();return nextTimer++;},
  clearTimeout(){},
  setInterval(fn){const id=nextTimer++;intervals.set(id,fn);return id;},
  clearInterval(id){intervals.delete(id);},
  alert(x){alerts.push(String(x));},
  console:{error:(...a)=>warnings.push(a.join(' ')),warn:(...a)=>warnings.push(a.join(' ')),info(){}},
  URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
  Blob,Set,Number,Math,currentTab:'tour'
};
vm.runInNewContext(code,ctx,{filename:'director-and-recording.js'});
const test=window.__aba8Test;
assert(test && typeof test.startRec==='function','Diretor não inicializado');
function clean(label){
  assert(!body.classList.contains('rec-clean'),label+': body');
  assert(!stage.classList.contains('rec'),label+': stage');
  assert.equal(stage.style.getPropertyValue('--rec-w'),'',label+': largura residual');
  assert.equal(stage.style.getPropertyValue('--rec-h'),'',label+': altura residual');
  assert.equal(body.style.getPropertyValue('--rec-w'),'',label+': body width residual');
  assert(!recBtn.classList.contains('on'),label+': rec button');
  assert(!recBtn.disabled,label+': button disabled');
  assert.equal(intervals.size,0,label+': timer residual');
}
const valid={baseW:960,baseH:540,start:{k:1,tx:0,ty:0},
  end:{k:1.5,tx:12,ty:8},lastRendered:{k:1.5,tx:12,ty:8}};
assert.equal(test.verifyBridgeSeam(valid),true);
assert.throws(()=>test.verifyBridgeSeam({...valid,lastRendered:{k:1.5,tx:13,ty:8}}),/descontinuidade/);
assert.throws(()=>test.verifyBridgeSeam({...valid,end:{k:NaN,tx:0,ty:0}}),/inválid/);
const geom=test.computeCaptureGeometry(1920,1080,false,'browser',
  {left:100,top:50,width:960,height:540},1920,1080);
assert.equal(geom.sw,960);assert.equal(geom.sh,540);
assert.equal(geom.dw,1920);assert.equal(geom.dh,1080);
assert.equal(test.computeCaptureGeometry(0,1080,false,'browser',null,1920,1080),null);
assert.equal(test.computeCaptureGeometry(NaN,1080,false,'browser',null,1920,1080),null);
const edge=test.computeCaptureGeometry(640,480,false,'browser',
  {left:1910,top:1070,width:800,height:800},1920,1080);
assert(edge.sw>0&&edge.sh>0&&edge.sx+edge.sw<=640&&edge.sy+edge.sh<=480);

(async()=>{
  captureMode='denied';await test.startRec();
  clean('permission denied');
  captureMode='no-track';await test.startRec();
  assert(latestTrack.stopped>0);clean('missing track');
  captureMode='ok';initFailure=true;await test.startRec();
  assert(latestTrack.stopped>0);clean('MediaRecorder constructor');
  initFailure=false;startFailure=true;await test.startRec();
  assert(latestTrack.stopped>0);clean('MediaRecorder start');
  startFailure=false;
  await test.startRec(3);
  assert(stage.classList.contains('rec'),'Recording not active; warnings: '+JSON.stringify(warnings)+'; alerts: '+JSON.stringify(alerts));
  assert(intervals.size===1);
  const rectReads=stage.rectReads;
  for(let i=0;i<5;i++)for(const fn of intervals.values())fn();
  assert.equal(stage.rectReads,rectReads,'Layout read redundantly per frame');
  events.get('resize')();
  for(const fn of intervals.values())fn();
  assert.equal(stage.rectReads,rectReads+1,'Resize must invalidate crop cache');
  latestTrack.handlers.ended();
  clean('browser ended capture');
  assert(latestTrack.stopped>0 && outputTrack.stopped>0);
  assert(downloads.some(x=>x.includes('take-04-conclusao-sem-logo')),'Take 04 save missing');
  await test.startRec(4);
  latestRecorder.onerror({error:Error('injected recorder failure')});
  clean('MediaRecorder error');
  assert(!downloads.some(x=>x.includes('take-05-logo')),'Failed take should not be saved');

  // A medição da Aba 3 deve devolver exatamente o nó emprestado mesmo quando lança.
  const parent=parentNode(),section={
    style:styled(),classList:makeClasses('hidden'),parentNode:parent,
    _style:'width:99px;',querySelector(){return null;},
    getAttribute(n){return n==='style'?this._style:null;},
    setAttribute(n,val){this._style=val;},
    removeAttribute(n){this._style=null;}
  };
  parent.children.push(section);
  fixtures['module-nova']=section;
  fixtures['nova-container']={getBoundingClientRect(){throw Error('measuring failed');}};
  fixtures['cad3d-container']={clientWidth:500,clientHeight:500,getBoundingClientRect(){return {left:0,top:0,width:500,height:500}}};
  assert.throws(()=>test.measureNovaCol(),/measuring failed/);
  assert.equal(section.parentNode,parent);
  assert.equal(section._style,'width:99px;');
  assert(section.classList.contains('hidden'));
  assert.equal(parent.children.length,1);
  fixtures['nova-container']={getBoundingClientRect(){return {left:100,top:100,width:250,height:250};}};
  assert.equal(test.measureNovaCol().w,250);
  assert.equal(section.parentNode,parent);
  assert.equal(parent.children.length,1);

  // Falha de done() não pode avançar a próxima etapa.
  const paxParent=parentNode(),pax={style:styled(),classList:makeClasses('hidden'),
    parentNode:paxParent,offsetWidth:800,offsetHeight:450,scrollWidth:800,scrollHeight:450,
    querySelector(){return null;}};
  paxParent.children.push(pax);
  fixtures['module-pax']=pax;
  window.paxTourDone=()=>false;
  await test.run(0,0);
  assert(alerts.some(s=>s.includes('Timeout')),'Timeout must interrupt the tour');
  assert.equal(pax.parentNode,paxParent,'Timed-out module remains borrowed');
  assert(pax.classList.contains('hidden'));
  clean('step timeout');
  console.log('Aba 8: captura, falhas, permissão, layout, DOM, timeouts, takes e câmera verificados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
