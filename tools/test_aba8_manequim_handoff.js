'use strict';
// Reproduz a falha real: uma execução anterior deixa phase=.9; a ponte pinta
// até o novo motor da Aba 6 iniciar após dois requestAnimationFrame.
// Testa também a câmera e a porta no MESMO frame da pose do manequim.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '..');
const director = fs.readFileSync(path.join(base, 'source/html/ABA8/director-and-recording.js'), 'utf8');
const controller = fs.readFileSync(path.join(base, 'source/html/ABA6/controller.js'), 'utf8');
const begin = director.indexOf('        let bridge=null;');
const end = director.indexOf('        async function fxCabinToStow(my)', begin);
assert(begin > 0 && end > begin, 'Ponte da Aba 8 não encontrada');
assert(controller.includes('window.__aphaTourAba6ClockReady(manikinState.phase)'),
    'Controlador deixou de sinalizar o relógio inicializado');
assert(director.includes("const phase=bridgeStowPhase(b,manikinState.phase)"),
    'A ponte deve desenhar com a fase autorizada, não com estado residual');
assert(director.includes("1-bridgeEase((phase-.96)/.04)"),
    'A porta também deve usar a fase autorizada');

const initial = .028, painted = [], warns = [];
const ctx = {
    globalAlpha: 1,
    reset(){this.globalAlpha=1;},setTransform(){},clearRect(){},save(){},restore(){},
    transform(){},drawImage(){},fillRect(){},fillText(){},
};
const canvas = {width:0,height:0,style:{},getContext(){return ctx;},remove(){this.removed=true;}};
const stage = {clientWidth:960,clientHeight:540};
const phaseState = {phase:.9,animating:false,
    last:{mass:10,angleDeg:17,Fg:98.1,Fn:94,Ft:28,times:[{tA1:8,tA2:12}]}};
const host={closest:sel=>sel==='#tour-stage'?{}:null};
const manikinCanvas={parentElement:{getBoundingClientRect(){return {width:960,height:540};}}};
const document = {getElementById:id=>id==='aba6-module-ergo'?host:
    id==='aba6-manikinCanvas'?manikinCanvas:null};
const rafQueue=[];
let engineStarted=0, refresh=0;
const window = {devicePixelRatio:1};
const env = {
    window,document,stage,manikinState:phaseState,
    APHA_BRIDGE_CFG:{zoomOutMs:1000,handoffMs:300,uiFadeMs:250},
    ERGO_PERCENTILES:[{h:151.892}],
    ergoTimes:()=>({tA1:8,tA2:12}),
    console:{warn:(...a)=>warns.push(a.join(' ')),error:(...a)=>warns.push(a.join(' '))},
    drawManikinPanel(g,w,h,stature,mass,ang,Fg,Fn,Ft,phase){
        painted.push({phase,door:window.__aphaBridgeDoorU});
    },
    drawManikinFallback(){throw Error('Não deveria entrar no fallback')},
    requestAnimationFrame(fn){rafQueue.push(fn);return rafQueue.length;},
    cancelAnimationFrame(){},
    setTimeout(){},
    currentTab:'sim',
    stopManikinLoop(){phaseState.animating=false;},
    showManikin(){phaseState.phase=initial;phaseState.animating=false;},
    startManikinLoop(){engineStarted++;},
    setAnimLabel(){},
    updateErgonomics(){refresh++;},
    manikinFrameTime:0,
    Math,Number
};
vm.runInNewContext(director.slice(begin,end) +
    '\nthis.setBridge = b => { bridge=b; }; this.paintBridge=paintBridge; this.bridgePhase=bridgeStowPhase;', env);
const bridge={
    canvas,baseW:960,baseH:540,srcX:0,srcY:0,srcW:960,srcH:540,
    snapshot:null,start:{k:2,tx:30,ty:40},end:{k:1.3,tx:10,ty:20},
    initialPhase:initial,lastPhase:initial,phaseClockReady:false,
    started:100,mode:'transition',stowStart:0,raf:0,error:false
};
env.setBridge(bridge);
function frame(time,expected,label){
    env.paintBridge(time);
    const last=painted.at(-1);
    assert(last,label+': não desenhou');
    assert(Math.abs(last.phase-expected)<1e-9,
        label+': fase '+last.phase+' ≠ '+expected);
    return last;
}
// A ponte continua na fase inicial mesmo se o motor da Aba 6
// guardou a pose final de um replay anterior.
frame(1100,initial,'Fim da transição');
bridge.mode='stow';
bridge.stowStart=1100;
frame(1100,initial,'Emenda antes do novo clock');
frame(1140,initial,'Dois RAFs pendentes');
assert.equal(bridge.phaseClockReady,false);
assert.equal(phaseState.phase,.9,'O motor antigo precisa seguir sujo para reproduzir o bug');
vm.runInNewContext(controller+'\nthis.aba6={scheduleAba6Engine,pauseAba6Engine,initAba6Engine};',env);
env.aba6.scheduleAba6Engine({tour:true,reset:true,initialPhase:initial});
assert.equal(rafQueue.length,1);
rafQueue.shift()(1150);
assert.equal(engineStarted,0);
frame(1150,initial,'Primeiro RAF pendente');
rafQueue.shift()(1166);
assert.equal(engineStarted,1,'Motor da Aba 6 deve ser inicializado exatamente uma vez');
assert.equal(refresh,1);
assert.equal(bridge.phaseClockReady,true,'Ponte não recebeu o clock confirmado');
assert.equal(phaseState.phase,initial,'Reset de Aba 6 não aplicou a fase da ponte');
frame(1166,initial,'Primeiro frame após o reset');
phaseState.phase=initial+.015;
frame(1200,initial+.015,'Movimento avança normalmente');
phaseState.phase=initial+.008; // Reset duplicado ou relógio antigo: não recuar.
frame(1250,initial+.015,'Ponte não deve retroceder');
phaseState.phase=.98;
const door = frame(1400,.98,'Fechamento da porta');
assert(door.door<1 && door.door>0,
    'Porta precisa acompanhar a MESMA fase válida do manequim');
assert.equal(bridge.lastPhase,.98);
// Reiniciar roteiro, mantendo estado antigo da biomecânica.
env.aba6.pauseAba6Engine();
const fresh = {...bridge,lastPhase:initial,phaseClockReady:false,mode:'stow'};
env.setBridge(fresh);
frame(1500,initial,'Segunda reprodução com fase residual');
env.aba6.scheduleAba6Engine({tour:true,reset:true,initialPhase:initial});
env.aba6.pauseAba6Engine(); // Abort antes dos RAFs.
for(const fn of rafQueue.splice(0))fn(1600);
assert.equal(fresh.phaseClockReady,false,'Abort não deve liberar relógio atrasado');
frame(1600,initial,'Cancelamento antes de inicializar');
console.log('Aba 8: transição 5→6 sem estalo, fase/porta/câmera contínuas e cancelamento validados.');
