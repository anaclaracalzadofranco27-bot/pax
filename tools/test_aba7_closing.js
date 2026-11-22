'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '..', 'source', 'html', 'ABA7');
const read = name => fs.readFileSync(path.join(base, name), 'utf8');
const js = read('animation.js'), css = read('closing-scenes.css');
const globalCSS = fs.readFileSync(path.join(__dirname, '..', 'source/css/global.css'), 'utf8');
const html = read('ABA7.html');
const fnv = s => {
    let h = 2166136261;
    for (let i=0; i<s.length; i++) h=Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return h.toString(16).padStart(8, '0');
};
const geometry = s => [...s.matchAll(/\b(?:d|points|cx|cy|r|rx|ry|x|y|width|height|transform|viewBox|stroke-width)\s*=\s*"[^"]*"/g)]
    .map(x => x[0]).join('|');
const fingerprints = [{"id":"01","hash":"cfeed300","paths":17},{"id":"02","hash":"576bccc7","paths":0},{"id":"04","hash":"9115d229","paths":2},{"id":"06","hash":"28a405e0","paths":2},{"id":"08","hash":"28d88c0c","paths":148},{"id":"10","hash":"33390988","paths":60},{"id":"13","hash":"99bd928f","paths":3}];
for (const item of fingerprints) {
    const svg = read('svg/illustration-' + item.id + '.svg');
    assert.equal(fnv(geometry(svg)), item.hash, 'SVG geometry changed: ' + item.id);
    assert.equal((svg.match(/<path\b/g) || []).length, item.paths);
    assert(!svg.includes('<!--'), 'Historical SVG comment remains: '+item.id);
}
for (const name of ['ABA7.html','animation.js','closing-frame.css','closing-scenes.css']) {
    const s = read(name);
    assert(!s.includes('<!--') && !s.includes('/*') && !/^\s*\/\//m.test(s),
        'Historical comment remains in '+name);
}
assert(!globalCSS.includes('closing-illustrations.css'), 'Deleted CSS is still included');
assert(!fs.existsSync(path.join(base, 'closing-illustrations.css')), 'Orphan CSS file still exists');
for (const name of ['.pill','.lbl','.lead','.ckd','.cw','s1-spin{','.operator-benefits-workflow']) {
    assert(!css.includes(name), 'Orphan selector still present: '+name);
}
assert(css.includes('#scene-2 .hcs{position:absolute;left:40px;'));
assert(!read('svg/illustration-08.svg').slice(0,160).includes('style='));
assert(css.includes('#scene-3 .clip{width:92px;'));
assert(css.includes('#scene-3 .stamp{width:96px;'));
assert(css.includes('#scene-3 .sw{position:relative;width:115px;'));
assert(css.includes('#scene-3 .ch{display:flex;align-items:center;gap:16px}'));
assert(!html.includes('class="clip" viewBox="0 0 120 145" style='));
assert(!html.includes('class="stamp" viewBox="0 0 120 135" style='));
assert(!read('svg/illustration-01.svg').includes('<linearGradient'));
for (const [cls,color] of [['fil9','#00B4D8'],['fil11','#7C8B9E'],['fil10','#FF6B1A']])
    assert(css.includes('#scene-1 .'+cls+'{fill:'+color+'}'));
for (const marker of [
    '#module-closing.closing-no-logo #scene-3 #s3-b{display:none!important}',
    '#module-closing.logo-only #scene-3{--o:-6.4s}',
    '#scene-3.go .logo{animation:s3-fi .01s linear calc(6.4s + var(--o)) both,s3-zoom 3.6s linear calc(6.4s + var(--o)) both}',
    '#scene-1.go .ccw{animation:s1-spinr 12s linear var(--t) infinite}'
]) assert(css.includes(marker),'Required animation timing changed: '+marker);
assert.equal((html.match(/@@APHA_INCLUDE:source\/html\/ABA7\/svg\/illustration-/g)||[]).length,7);

let now = 1000, nextId = 1, clockWrites = 0, stageWrites = 0;
const pending = new Map(), handlers = new Map(), loadedFonts = [];
function classes(){const set=new Set();return {
    add(...x){x.forEach(i=>set.add(i))},remove(...x){x.forEach(i=>set.delete(i))},
    contains(x){return set.has(x)}
};}
const module = {classList:classes()};
const root = {clientWidth:1920, clientHeight:1080, offsetWidth:1920,
    closest:()=>module};
const scenes = [1,2,3].map(()=>({classList:classes()}));
const stages=[1,2,3].map(()=>({style:{set transform(v){stageWrites++;this._transform=v},get transform(){return this._transform}}}));
const label={set textContent(v){clockWrites++;this._text=v},get textContent(){return this._text}};
const replay = {addEventListener:(name,fn)=>handlers.set(name,fn)};
const refs={ 'closing-root':root,'closing-time':label,'closing-play':replay,
    'scene-1':scenes[0],'scene-2':scenes[1],'scene-3':scenes[2],
    's1-stage':stages[0],'s2-stage':stages[1],'s3-stage':stages[2] };
const window={ResizeObserver:null,addEventListener(){}};
const environment={window,document:{
    getElementById:id=>refs[id],
    fonts:{load:font=>{loadedFonts.push(font);return Promise.resolve([])}}
},performance:{now:()=>now},
    setTimeout:()=>0,
    requestAnimationFrame:fn=>{let id=nextId++;pending.set(id,fn);return id},
    cancelAnimationFrame:id=>pending.delete(id)};
vm.runInNewContext(js,environment,{filename:'animation.js'});
const nextFrame=()=>{const current=[...pending];pending.clear();for(const [,fn] of current)fn()};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
    assert.deepEqual(loadedFonts,['500 40px Montserrat','800 40px Montserrat']);
    window.closingFit();window.closingFit();
    assert.equal(stageWrites,3,'Identical viewport size must not rewrite transforms');
    window.closingPlaySegment('closing');await flush();
    assert(module.classList.contains('closing-no-logo'));
    assert.deepEqual(scenes.map(x=>x.classList.contains('go')),[true,true,true]);
    assert.equal(label.textContent,'00.0 / 26.4 s');
    now=1100;nextFrame();const writes=clockWrites;
    now=1145;nextFrame();assert.equal(clockWrites,writes,'Counter must update only each tenth');
    now=1000+26500;nextFrame();assert(window.closingDone());
    assert.equal(label.textContent,'26.4 / 26.4 s');
    window.closingPlaySegment('logo');await flush();
    assert(module.classList.contains('logo-only'));
    assert.deepEqual(scenes.map(x=>x.classList.contains('go')),[false,false,true]);
    assert.equal(label.textContent,'00.0 / 3.6 s');
    now+=3700;nextFrame();assert(window.closingDone());
    window.closingPlaySegment('full');window.closingReset();await flush();
    assert.deepEqual(scenes.map(x=>x.classList.contains('go')),[false,false,false],
        'Reset must invalidate pending font-gated playback');
    window.closingEnter();await flush();
    assert.equal(label.textContent,'00.0 / 30.0 s');
    assert.deepEqual(scenes.map(x=>x.classList.contains('go')),[true,true,true]);
    assert.equal(pending.size,1,'Only one RAF may update the timer');
    window.closingReset();assert.equal(pending.size,0);
    console.log('Aba 7: SVG geometry, CSS, comments, font preload, Replay and Takes 04/05 checked.');
})().catch(error=>{console.error(error);process.exitCode=1});
