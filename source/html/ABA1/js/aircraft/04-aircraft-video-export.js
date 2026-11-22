// ---------------------------------------------------------------- gravador MP4 (H.264) quadro a quadro
// Cada quadro é desenhado no tempo exato (0, 1/30, 2/30 s...) e codificado com esse horário, então o vídeo fica idêntico à animação
// mesmo que o computador demore para desenhar. Usa o codificador do navegador (WebCodecs) e monta o arquivo MP4 aqui mesmo.
function mp4Box(type, ...parts) {
  const len = 8 + parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(len), dv = new DataView(out.buffer);
  dv.setUint32(0, len); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  let o = 8; parts.forEach(p => { out.set(p, o); o += p.length; });
  return out;
}
function mp4Full(type, version, flags, ...parts) { return mp4Box(type, new Uint8Array([version, flags >> 16 & 255, flags >> 8 & 255, flags & 255]), ...parts); }
function u32(...v) { const a = new Uint8Array(v.length * 4), dv = new DataView(a.buffer); v.forEach((x, i) => dv.setUint32(i * 4, x)); return a; }
function u16(...v) { const a = new Uint8Array(v.length * 2), dv = new DataView(a.buffer); v.forEach((x, i) => dv.setUint16(i * 2, x)); return a; }
const MP4_MATRIX = u32(0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000);
// samples: [{ data: Uint8Array, key: bool }], todos com a mesma duração (1 / fps)
function buildMp4(samples, avcC, width, height, fps) {
  const TS = fps * 1000, DUR = 1000, total = samples.length * DUR;     // timescale com quadros de duração inteira
  const ftyp = mp4Box('ftyp', new TextEncoder().encode('isom'), u32(0x200), new TextEncoder().encode('isomiso2avc1mp41'));
  const sizes = samples.map(s => s.data.length), mdatLen = 8 + sizes.reduce((a, b) => a + b, 0);
  const keys = samples.map((s, i) => s.key ? i + 1 : 0).filter(Boolean);
  const avc1 = mp4Box('avc1', new Uint8Array(6), u16(1), new Uint8Array(16), u16(width, height), u32(0x480000, 0x480000, 0), u16(1), new Uint8Array(32), u16(0x18, 0xffff), mp4Box('avcC', avcC));
  const stbl = (chunkOffset) => mp4Box('stbl',
    mp4Full('stsd', 0, 0, u32(1), avc1),
    mp4Full('stts', 0, 0, u32(1, samples.length, DUR)),
    mp4Full('stss', 0, 0, u32(keys.length, ...keys)),
    mp4Full('stsc', 0, 0, u32(1, 1, samples.length, 1)),
    mp4Full('stsz', 0, 0, u32(0, samples.length, ...sizes)),
    mp4Full('stco', 0, 0, u32(1, chunkOffset)));
  const moov = (chunkOffset) => mp4Box('moov',
    mp4Full('mvhd', 0, 0, u32(0, 0, TS, total, 0x10000), u16(0x100, 0), u32(0, 0), MP4_MATRIX, new Uint8Array(24), u32(2)),
    mp4Box('trak',
      mp4Full('tkhd', 0, 3, u32(0, 0, 1, 0, total, 0, 0), u16(0, 0, 0, 0), MP4_MATRIX, u32(width << 16, height << 16)),
      mp4Box('mdia',
        mp4Full('mdhd', 0, 0, u32(0, 0, TS, total), u16(0x55c4, 0)),
        mp4Full('hdlr', 0, 0, u32(0), new TextEncoder().encode('vide'), u32(0, 0, 0), new TextEncoder().encode('Video\0')),
        mp4Box('minf',
          mp4Full('vmhd', 0, 1, u16(0, 0, 0, 0)),
          mp4Box('dinf', mp4Full('dref', 0, 0, u32(1), mp4Full('url ', 0, 1))),
          stbl(chunkOffset)))));
  const moovLen = moov(0).length;
  const mdatHead = new Uint8Array(8); new DataView(mdatHead.buffer).setUint32(0, mdatLen); mdatHead.set([109, 100, 97, 116], 4);
  return new Blob([ftyp, moov(ftyp.length + moovLen + 8), mdatHead, ...samples.map(s => s.data)], { type: 'video/mp4' });
}
async function pickH264(width, height, fps) {
  if (!window.VideoEncoder) return null;
  for (const codec of ['avc1.640032', 'avc1.4d0032', 'avc1.420032', 'avc1.640028', 'avc1.4d0028', 'avc1.420028']) {
    const cfg = { codec, width, height, bitrate: 14e6, framerate: fps, avc: { format: 'avc' } };
    try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return r.config; } catch (e) { /* tenta o próximo */ }
  }
  return null;
}
// desenha e codifica TOTAL_TIME * fps quadros; onProgress(t) a cada quadro
async function encodeMp4(canvas, ctx, L, fps, cfg, onProgress) {
  const samples = []; let avcC = null, failure = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) avcC = new Uint8Array(meta.decoderConfig.description);
      const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
      samples.push({ data, key: chunk.type === 'key', ts: chunk.timestamp });
    },
    error: e => { failure = e; }
  });
  enc.configure(cfg);
  const n = Math.round(TOTAL_TIME * fps) + 1;
  for (let i = 0; i < n; i++) {
    if (failure) throw failure;
    const t = Math.min(TOTAL_TIME, i / fps);
    drawExportFrame(ctx, t, L);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 0));
    if (i % 3 === 0) { onProgress(t); await new Promise(r => setTimeout(r, 0)); }
  }
  await enc.flush(); enc.close();
  if (failure) throw failure;
  if (!avcC) throw new Error('o codificador não forneceu a configuração H.264');
  samples.sort((a, b) => a.ts - b.ts);
  return buildMp4(samples, avcC, canvas.width, canvas.height, fps);
}

function pickVideoType(prefer) {           // gravação em tempo real (alternativa): prefer = 'webm' para forçar WebM
  const types = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].filter(m => !prefer || m.includes(prefer));
  return types.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || null;
}

// gravação em tempo real com MediaRecorder: usada só quando o navegador não tem o codificador quadro a quadro.
// Se o computador travar durante a gravação, o vídeo pode sair com a animação um pouco adiantada.
async function recordRealtime(canvas, ctx, L, fps, type) {
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
  const grab = () => { if (track.requestFrame) track.requestFrame(); else if (stream.requestFrame) stream.requestFrame(); };
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });
  rec.start(1000);
  const t0 = performance.now();
  grab();
  await new Promise(resolve => {
    const step = () => {
      const t = Math.min(TOTAL_TIME, (performance.now() - t0) / 1000);
      drawExportFrame(ctx, t, L);
      grab();
      showExportProgress(t, 'Gravando');
      if (t >= TOTAL_TIME) setTimeout(() => { grab(); setTimeout(resolve, 150); }, 1000 / fps);   // repete o último quadro para fechar a duração
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await stopped;
  return new Blob(chunks, { type: type.split(';')[0] });
}
function showExportProgress(t, label) {
  timerEl.textContent = `00:${String(Math.floor(t)).padStart(2, '0')} / 00:${String(TOTAL_TIME).padStart(2, '0')}`;
  exportBtn.textContent = `⏺ ${label} ${Math.round(t / TOTAL_TIME * 100)}%`;
}

// exporta a animação inteira (TOTAL_TIME segundos) e devolve o arquivo; baixa automaticamente se download = true.
// mode: 'auto' (MP4 quadro a quadro se o navegador permitir; senão gravação em tempo real), 'frames' ou 'realtime'
async function exportVideo({ width = EXPORT_W, height = EXPORT_H, fps = EXPORT_FPS, download = true, format, mode = 'auto' } = {}) {
  if (exportingVideo) return null;
  if (!window.PAX) { alert('A animação ainda está carregando. Tente de novo em alguns segundos.'); return null; }
  const h264 = mode !== 'realtime' ? await pickH264(width, height, fps) : null;
  const type = h264 ? 'video/mp4' : pickVideoType(format);
  const canvas = document.createElement('canvas');
  if (!type || (!h264 && !canvas.captureStream)) {
    alert('Este navegador não consegue gerar vídeo. Use o Chrome ou o Edge.');
    return null;
  }
  exportingVideo = true;
  clearInterval(interval); playing = false; playBtn.textContent = '▶ Play';
  [playBtn, document.getElementById('resetBtn'), scrubber, exportBtn].forEach(el => { el.disabled = true; });
  exportBtn.textContent = '⏳ Preparando…';
  canvas.width = width; canvas.height = height;
  // o quadro sendo gerado aparece por cima do palco (prévia); a página por baixo fica parada, sem custo extra
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; z-index:5;';
  document.getElementById('viewport').appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });   // vídeo sem canal alfa
  try {
    const L = await buildExportLayers(width, height);
    PAX.beginExport(Math.round(175 / L.VB.width * L.stageW * CAM_ZOOM.s));
    for (const t of [0, 4, ZOOM_END + 0.7, TOTAL_TIME, 0]) drawExportFrame(ctx, t, L);   // aquecimento: compila os shaders e prepara as imagens
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const blob = h264
      ? await encodeMp4(canvas, ctx, L, fps, h264, t => showExportProgress(t, 'Gerando vídeo'))
      : await recordRealtime(canvas, ctx, L, fps, type);
    if (download) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aviao_passarela.' + (blob.type === 'video/mp4' ? 'mp4' : 'webm');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    return blob;
  } catch (err) {
    console.error(err);
    alert('Não foi possível exportar o vídeo: ' + err.message);
    return null;
  } finally {
    PAX.endExport();
    // a página termina no último quadro do vídeo (sem a transição do zoom)
    time = TOTAL_TIME;
    rig.style.transition = 'none'; updateStage(TOTAL_TIME); void rig.offsetWidth; rig.style.transition = '';
    canvas.remove();
    exportingVideo = false;
    [playBtn, document.getElementById('resetBtn'), scrubber, exportBtn].forEach(el => { el.disabled = false; });
    exportBtn.textContent = '⬇ Exportar vídeo';
  }
}
exportBtn.onclick = () => exportVideo();

