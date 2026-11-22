'use strict';
// Testa Play, Pause, Restart, scrubber, o RAF WebGL ocioso e a API do roteiro
// usando os arquivos reais da Aba 1, sem exigir WebGL no CI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, 'source/html/ABA1', p), 'utf8');

(async () => {
  const resetBtn = {};
  const rig = { className: 'zoom-bridge' }, scrubber = {}, timerEl = {}, playBtn = {};
  let now = 1000, nextTimer = 0;
  const intervals = new Map(), invalidations = [];
  const state = {
    rig, scrubber, timerEl, playBtn,
    window: { PAX: { invalidate(changed) { invalidations.push(changed); } } },
    document: { getElementById(id) { return id === 'resetBtn' ? resetBtn : null; } },
    performance: { now() { return now; } },
    setInterval(fn) { const id = ++nextTimer; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    console
  };
  vm.createContext(state);
  vm.runInContext(read('js/aircraft/02-aircraft-playback.js'), state);
  const value = expr => vm.runInContext(expr, state);
  const closeTo = (x, y) => assert(Math.abs(x-y)<1e-6, String(x)+' != '+String(y));
  assert.equal(typeof playBtn.onclick,'function');
  playBtn.onclick();
  assert.equal(value('playing'), true);
  now += 5350;
  closeTo(value('paxClockTime()'), 5.35);
  assert.equal(intervals.size, 1);
  playBtn.onclick(); // Pause congela o instante REAL, mesmo sem intervalos
  assert.equal(value('playing'), false);
  closeTo(value('time'), 5.35);
  now += 40000;
  closeTo(value('paxClockTime()'), 5.35);
  playBtn.onclick(); // retoma sem começar de zero
  now += 2000;
  closeTo(value('paxClockTime()'), 7.35);
  scrubber.oninput({ target: { value:'9.5' } });
  closeTo(value('paxClockTime()'), 9.5);
  now += 700;
  for (const fn of [...intervals.values()]) fn();
  closeTo(value('time'), 10.2);
  assert.equal(rig.className, '');
  now += 1700;
  for (const fn of [...intervals.values()]) fn();
  assert.equal(rig.className, 'bin-active');
  now += 3600;
  closeTo(value('paxClockTime()'), 14);
  for (const fn of [...intervals.values()]) fn();
  closeTo(value('time'), 14);
  assert.equal(value('playing'), false);
  assert.equal(intervals.size, 0);
  resetBtn.onclick(); // Restart permanece visível na Aba 1 individual
  closeTo(value('time'), 0);
  assert.equal(rig.className, 'zoom-bridge');
  assert(invalidations.length >= 5, 'mudanças precisam solicitar quadros');
  assert.equal(value('TOTAL_TIME'), 14);

  // Extrair apenas o controle RAF, sem carregar os modelos Three.js inteiros.
  const all = read('js/passengers/08-animation.js');
  const from = all.indexOf('        let paxSceneDirty = true');
  const to = all.indexOf('\n})();', from);
  assert(from>0 && to>from);
  const pending = new Map(), events = {};
  let id = 0, frames = 0, ratio = 1.75, t = 0, walkUpdates = 0;
  const passengerWindow = { frameElement: { getClientRects: () => [] } };
  const passengerDoc = {
    hidden:false,
    getElementById:()=>({}),
    addEventListener:(name,fn)=>{events[name]=fn;}
  };
  const passenger = {
    window:passengerWindow, document:passengerDoc,
    performance:{now:()=>t},
    requestAnimationFrame(fn){ const key=++id;pending.set(key,fn);return key; },
    cancelAnimationFrame(key){pending.delete(key);},
    getComputedStyle:()=>({transform:'matrix(1, 0, 0, 1, 0, 0)'}),
    DOMMatrix:class {constructor(){this.a=1;}},
    container:{clientWidth:200,clientHeight:200},
    renderer:{
      domElement:{clientHeight:200},setSize(){},
      render(){frames++;},
      getPixelRatio(){return ratio;},
      setPixelRatio(x){ratio=x;}
    },
    rig1:{root:{scale:{x:1}}},rig2:{},rig3:{},
    scene:{},camera:{zoom:1},CAM_ZOOM:{dur:1.8},
    FRUSTUM_H:12,OUTLINE_PX:1,OUTLINE_W:{value:0},
    PAX_START:0.5,MAX_ANIMATION_TIME:14,elapsed:0,
    playing:false, PAX_TIMELINE:()=>1,
    updateWalk(){walkUpdates++;},labelAnchors:()=>[],
    updateBalloonsLive(){},
    console
  };
  vm.createContext(passenger);
  vm.runInContext(all.slice(from,to),passenger);
  const api = passengerWindow.PAX;
  assert(api && typeof api.setActive === 'function');
  assert.equal(pending.size,0,'iframe inicialmente oculto não deve agendar RAF');
  api.setActive(true);
  assert.equal(pending.size,1);
  const frame = timestamp => {
    t=timestamp;
    const nowPending=[...pending.values()];pending.clear();
    for(const f of nowPending)f(t);
  };
  frame(16);
  assert.equal(frames,1);
  assert.equal(pending.size,0,'pausado e estável não deve consultar zoom a 60fps');
  api.invalidate();
  frame(32);
  assert.equal(frames,2);
  assert.equal(pending.size,0);
  api.invalidate(true);
  frame(50);
  assert.equal(pending.size,1,'zoom CSS precisa de RAF mesmo com Play pausado');
  api.setActive(false);
  assert.equal(pending.size,0,'sair da aba cancela RAF pendente');
  api.setActive(true);
  frame(2000);
  assert.equal(pending.size,0,'zoom expirado não agenda quadro extra');
  passenger.playing=true;
  api.invalidate();
  frame(2030);
  assert.equal(pending.size,1,'durante Play mantém o RAF');
  passenger.playing=false;
  frame(2050);
  assert.equal(pending.size,0,'Pause deve encerrar o RAF');
  api.invalidate();
  assert.equal(pending.size,1);
  passengerDoc.hidden=true;
  events.visibilitychange();
  assert.equal(pending.size,0,'aba do navegador oculta não mantém RAF');
  passengerDoc.hidden=false;
  events.visibilitychange();
  frame(2080);
  assert.equal(pending.size,0);
  api.beginExport(400);
  closeTo(ratio,2);
  api.endExport();
  closeTo(ratio,1.75);
  assert(walkUpdates>=3);

  // O player da Aba 8 realmente empresta a Aba 1 e a desativa após a transição.
  const calls=[], embed={
    ready:()=>true, setActive:x=>calls.push(['active',x]),
    setControls:x=>calls.push(['controls',x]),
    xrayReset:()=>calls.push(['xray']),
    reset:()=>calls.push(['reset']), play:()=>calls.push(['play']),
    pause:()=>calls.push(['pause']), done:()=>true
  };
  let onTour=false, visible=true, tourNow=3000;
  const fr={
    srcdoc:'',contentWindow:{paxEmbed:embed},
    closest:sel=>sel==='#tour-stage' && onTour ? {} : null,
    getClientRects:()=>visible?[{}]:[]
  };
  const source={textContent:'<html>test</html>',remove(){}};
  const bridge={
    document:{getElementById:id=>id==='pax-frame'?fr: id==='pax-src'?source:null},
    window:{},performance:{now:()=>tourNow},
    setTimeout:fn=>fn(),Promise,
    console
  };
  vm.createContext(bridge);
  vm.runInContext(read('bridge.js'),bridge);
  bridge.window.paxEnter();
  assert(calls.some(x=>x[0]==='active'&&x[1]===true));
  bridge.window.paxPause();
  assert.deepEqual(calls.slice(-2).map(x=>x[0]),['pause','active']);
  onTour=true;
  bridge.window.paxEnter();
  bridge.window.paxTourReset();
  await bridge.window.paxTourStart();
  assert.equal(bridge.window.paxTourDone(),true);
  assert(calls.some(x=>x[0]==='play'),'Take 01 não iniciou');
  bridge.window.paxPause();
  onTour=false;visible=false;
  bridge.window.paxEnter();
  assert.deepEqual(calls.at(-1),['active',false],'retorno à aba oculta não reativa WebGL');
  const css=read('styles.css');
  assert(css.includes('body.no-ctl #controls { display: none; }'),'controles do relógio não podem aparecer no tour');
  console.log('Aba 1: relógio real, Play/Pause/Restart/scrubber, RAF ocioso, export WebGL e roteiro validados.');
})().catch(err=>{console.error(err);process.exitCode=1;});
