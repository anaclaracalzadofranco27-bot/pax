'use strict';
// Testes de falhas injetadas: exportadores PNG e recuperação do contexto Canvas.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'..','source/html/ABA6/manikin.js'),'utf8');
const start=js.indexOf('function cropManikinTransparentCanvas(');
const end=js.indexOf("addEventListener('keydown', e =>",start);
assert(start>0&&end>start,'Implementações de exportação ausentes');
let blank=false,readError=false,drawError=false,blobError=false,blobNull=false,urlError=false;
const downloads=[],errors=[],alerts=[],canvases=[];
const window={__mkExport:'orig',__aphaBridgeDoorU:.25,
 __aphaOnlyCabin:true,__aphaShowConventional:true,__aphaBridgeMinimalHUD:false};
const baseline=()=>JSON.stringify(window);
const initial=baseline();
function canvasFactory(){
 const canvas={width:0,height:0,toBlob(cb){
   if(blobError)throw Error('Falha de serialização');
   cb(blobNull?null:{png:true});
 }};
 canvas.getContext=()=>({
   clearRect(){},setTransform(){},scale(){},drawImage(){},
   getImageData(x,y,w,h){
     if(readError)throw Error('Falha de getImageData');
     const data=new Uint8ClampedArray(w*h*4);
     if(!blank) data[(Math.floor(h/2)*w+Math.floor(w/2))*4+3]=255;
     return {data};
   }
 });
 canvases.push(canvas);
 return canvas;
}
const document={
 createElement(tag){
   if(tag==='canvas')return canvasFactory();
   if(tag==='a')return {click(){downloads.push(this.download)},remove(){}};
   throw Error('Unexpected DOM element '+tag);
 },
 getElementById(){return null;},
 body:{appendChild(){}}
};
const API={
 window,document,manikinState:{last:{
   mass:10,angleDeg:17,Fg:98.1,Fn:94,Ft:28,
   times:[{tA2:12.2,tA1:8.4}]
 }},
 APHA_BRIDGE_CFG:{figureW:120,figureH:90,figureScale:2,figureMargin:3,figurePhase:.83},
 ERGO_PERCENTILES:[{h:151.892}],updateErgonomics(){},
 drawManikinPanel(){if(drawError)throw Error('Falha de renderização');},
 console:{error:(...args)=>errors.push(args.map(String).join(' '))},
 alert:msg=>alerts.push(msg),
 URL:{
    createObjectURL(){if(urlError)throw Error('Falha de URL');return 'blob:test';},
    revokeObjectURL(){}
 },
 setTimeout:fn=>{fn();return 1},
 Uint8ClampedArray,Math
};
vm.runInNewContext(js.slice(start,end)+'\nthis.steps=exportManikinSteps;',API);
API.window.exportAphaFigure();
assert(downloads.includes('boneco-mala-bin.png'));
assert.equal(baseline(),initial,'Flags foram modificadas pelo PNG individual');
const outputs=API.steps(true);
assert.equal(outputs.length,3);
assert(outputs.every(c=>c.width>0&&c.height>0));
assert.equal(baseline(),initial,'Flags foram modificadas pelo PNG de etapas');
API.steps(false);
assert(downloads.includes('overhead_bin_alpha_step1.png'));
assert(downloads.includes('overhead_bin_alpha_step2.png'));
assert(downloads.includes('overhead_bin_alpha_step3.png'));
for(const [name,apply,undo] of [
 ['draw',()=>drawError=true,()=>drawError=false],
 ['read',()=>readError=true,()=>readError=false],
 ['empty',()=>blank=true,()=>blank=false],
 ['blob',()=>blobNull=true,()=>blobNull=false],
 ['toBlob',()=>blobError=true,()=>blobError=false],
 ['URL',()=>urlError=true,()=>urlError=false]
]){
 apply();assert.doesNotThrow(()=>API.window.exportAphaFigure(),'Falha '+name);
 assert.equal(baseline(),initial,'Estado modificado após '+name);undo();
}
drawError=true;
assert.equal(API.steps(false),null,'Falha de desenho deveria cancelar as etapas');
assert.equal(baseline(),initial);
drawError=false;
assert(errors.length>=5);
assert(alerts.length>=2);

// Reproduzir o caminho do fallback: simular um save() interno perdido antes
// de lançar erro, e verificar que reset() recupera clipping e câmera.
const vStart=js.indexOf('function drawManikinViewport(');
assert(vStart>0,'Viewport principal ausente');
let resets=0,restores=0,depth=0,mode='error',fallbacks=0;
const ctx={
 save(){depth++},restore(){depth=Math.max(0,depth-1);restores++},
 reset(){resets++;depth=0},setTransform(){},
 beginPath(){},rect(){},clip(){},translate(){},transform(){},scale(){},
 moveTo(){},lineTo(){},stroke(){}
};
const canvas={width:800,height:500,closest(){return null},
 parentElement:{getBoundingClientRect(){return {width:800,height:500}}},
 getContext(){return ctx}};
const env={
 window:{devicePixelRatio:1},
 document:{getElementById:id=>id==='aba6-manikinCanvas'?canvas:null},
 currentTab:'sim',Math,
 ERGO_PERCENTILES:[{h:151.892}],cinematicFrame:()=>({
   panX:0,panY:0,shearX:0,shearY:0,zoom:1
 }),
 drawUnifiedCabinBackground(){},
 drawManikinPanel(){
   if(mode==='error'){ctx.save();throw Error('Falha de peça vetorial');}
 },
 drawManikinFallback(){
   fallbacks++;assert.equal(depth,1,'Fallback herdou stack corrompido');
   if(mode==='fallback-error')throw Error('Falha secundária');
 },
 console:{error:(...a)=>errors.push(a.map(String).join(' '))}
};
vm.runInNewContext(js.slice(vStart)+'\nthis.render=drawManikinViewport;',env);
const args=[10,17,98.1,94,28,.4,[{tA1:8.4,tA2:12.2}]];
env.render(...args);
assert(resets>=2,'Canvas não foi recuperado após a falha');
assert.equal(fallbacks,1);
assert.equal(depth,0,'Stack residual após recuperação');
mode='ok';env.render(...args);
assert.equal(env.window.__aphaErgoRenderWarning,false);
assert.equal(depth,0);
console.log('Aba 6: PNGs, erros de desenho/recorte/download e fallback Canvas recuperados.');
