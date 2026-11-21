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

