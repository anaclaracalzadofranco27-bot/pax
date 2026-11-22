'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'source/html/ABA1/js/aircraft/04-aircraft-video-export.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, start);
  return source.slice(a, b);
}
(async () => {
  // Chama a função real de exportação, sem carregar o avião no WebGL.
  let resolveCodec, begin = 0, end = 0, removed = 0, paused = 0;
  const playBtn = {disabled:false}, resetBtn = {disabled:false}, scrubber = {disabled:false};
  const exportBtn = {disabled:false, textContent:'Export'};
  const pax = {beginExport(){begin++;},endExport(){end++;}};
  const alerts = [];
  const env = {
    exportingVideo:false,time:0,
    playBtn,scrubber,exportBtn,PAX:pax,window:{PAX:pax},
    rig:{style:{},offsetWidth:123},
    EXPORT_W:1920,EXPORT_H:1080,EXPORT_FPS:30,TOTAL_TIME:14,ZOOM_END:10,CAM_ZOOM:{s:1.68},
    document:{
      getElementById(id){return id==='viewport'?{appendChild(){}}:resetBtn;},
      createElement(){
        return {style:{},width:0,height:0,captureStream(){return {};},
          getContext(){return {};},remove(){removed++;}};
      }
    },
    pausePlayback(){paused++;},updateStage(){},
    pickH264(){return new Promise(resolve=>{resolveCodec=resolve;});},
    pickVideoType(){return 'video/webm';},
    buildExportLayers:async()=>({VB:{width:575},stageW:1920}),
    drawExportFrame(){},
    requestAnimationFrame(fn){fn(100);return 1;},
    encodeMp4:async()=>new Blob(['ok'],{type:'video/mp4'}),
    recordRealtime:async()=>new Blob(['ok'],{type:'video/webm'}),
    setTimeout(){},
    alert(x){alerts.push(x);},console,Blob,Promise
  };
  vm.createContext(env);
  vm.runInContext(section('async function exportVideo(', 'exportBtn.onclick ='), env);
  const first = env.exportVideo({download:false});
  assert.equal(env.exportingVideo,true);
  const duplicate = await env.exportVideo({download:false});
  assert.equal(duplicate,null,'exportação concorrente não foi bloqueada');
  resolveCodec({codec:'avc'});
  const result = await first;
  assert.equal(result.type,'video/mp4');
  assert.equal(begin,1); assert.equal(end,1);
  assert.equal(paused,1); assert.equal(removed,1);
  assert.equal(env.exportingVideo,false);
  assert.equal(exportBtn.disabled,false);
  assert.equal(env.time,14);

  // Falha ANTES do beginExport: endExport não pode alterar o pixel ratio.
  env.pickH264=async()=>({codec:'avc'});
  env.buildExportLayers=async()=>{throw Error('raster-failed');};
  assert.equal(await env.exportVideo({download:false}),null);
  assert.equal(begin,1); assert.equal(end,1);
  assert.equal(env.exportingVideo,false);
  assert.equal(exportBtn.disabled,false);
  assert(alerts.some(x=>x.includes('raster-failed')));

  // Os objetos do codec devem fechar mesmo que encode() lance exceção.
  let encoderClosed=0, frameClosed=0;
  const h264Env={
    TOTAL_TIME:14,
    VideoEncoder:class {
      constructor(){this.state='unconfigured';this.encodeQueueSize=0;}
      configure(){this.state='configured';}
      encode(){throw Error('encode-failed');}
      close(){encoderClosed++;this.state='closed';}
    },
    VideoFrame:class {close(){frameClosed++;}},
    drawExportFrame(){},setTimeout(fn){fn();},console
  };
  vm.createContext(h264Env);
  vm.runInContext(section('async function encodeMp4(', 'function pickVideoType('),h264Env);
  await assert.rejects(h264Env.encodeMp4({width:1920,height:1080},{},{},30,{},()=>{}),/encode-failed/);
  assert.equal(encoderClosed,1); assert.equal(frameClosed,1);

  // Teste da captura WebM: erro na pintura para recorder e tracks.
  let stoppedTracks=0, stoppedRecorder=0;
  const callbacks=[];
  const track={stop(){stoppedTracks++;},requestFrame(){}};
  const stream={getVideoTracks:()=>[track],getTracks:()=>[track]};
  const recEnv={
    TOTAL_TIME:14,Blob,Promise,console,
    MediaRecorder:class {
      constructor(){this.state='inactive';}
      start(){this.state='recording';}
      stop(){
        this.state='inactive';stoppedRecorder++;
        if(this.onstop)this.onstop();
      }
    },
    performance:{now:()=>0},
    requestAnimationFrame(fn){callbacks.push(fn);return callbacks.length;},
    cancelAnimationFrame(){},
    setTimeout(){},clearTimeout(){},
    drawExportFrame(){throw Error('draw-failed');},
    showExportProgress(){}
  };
  vm.createContext(recEnv);
  vm.runInContext(section('async function recordRealtime(', 'function showExportProgress('),recEnv);
  const task=recEnv.recordRealtime({captureStream:()=>stream},{},{},30,'video/webm');
  assert.equal(callbacks.length,1);
  callbacks.shift()();
  await assert.rejects(task,/draw-failed/);
  assert.equal(stoppedTracks,1);
  assert.equal(stoppedRecorder,1);
  console.log('Aba 1: exclusividade e recuperação da exportação MP4/WebM validadas.');
})().catch(err=>{console.error(err);process.exitCode=1;});
