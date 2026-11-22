let time = 0, playing = false, interval = null, playStart = 0;
const ZOOM_END = 10;   // segundos com o zoom na passarela; depois a câmera abre para o avião inteiro
const BIN_ON = ZOOM_END + 1.8;   // bagageiros acendem em laranja só quando a câmera termina de abrir (1,8 s)
const TOTAL_TIME = 14; // duração total da animação (s); o contador visual continua oculto no tour

// Um único relógio monotônico para o palco, os passageiros 3D e a conclusão do roteiro.
// Intervalos atrasados nunca prolongam artificialmente a animação de 14 segundos.
function paxClockTime(now = performance.now()) {
  return playing ? Math.min(TOTAL_TIME, Math.max(0, (now - playStart) / 1000)) : time;
}

function updateStage(sec) {
  scrubber.value = sec;
  timerEl.textContent = `00:${String(Math.floor(sec)).padStart(2,'0')} / 00:${String(TOTAL_TIME).padStart(2,'0')}`;

  const cls = sec < ZOOM_END ? 'zoom-bridge' : sec < BIN_ON ? '' : 'bin-active';
  const changed = rig.className !== cls;
  if (changed) rig.className = cls;
  if (window.PAX) window.PAX.invalidate(changed); // reativa só os frames necessários, inclusive após Restart/scrubber
}

function pausePlayback() {
  if (playing) time = paxClockTime();
  clearInterval(interval);
  interval = null;
  playing = false;
  playBtn.textContent = '▶ Play';
  updateStage(time);
}

function togglePlay() {
  if (playing) { pausePlayback(); return; }
  if (time >= TOTAL_TIME) time = 0;
  playing = true;
  playStart = performance.now() - time * 1000; // retoma da fase pausada ou escolhida no scrubber
  playBtn.textContent = '⏸ Pause';
  updateStage(time);
  // 100 ms controla somente UI/estado; a posição exata vem de performance.now().
  interval = setInterval(() => {
    time = paxClockTime();
    if (time >= TOTAL_TIME) {
      time = TOTAL_TIME;
      clearInterval(interval);
      interval = null;
      playing = false;
      playBtn.textContent = '▶ Play';
    }
    updateStage(time);
  }, 100);
}

playBtn.onclick = togglePlay;

document.getElementById('resetBtn').onclick = () => {
  clearInterval(interval);
  interval = null;
  playing = false;
  time = 0;
  playBtn.textContent = '▶ Play';
  updateStage(0);
};

scrubber.oninput = e => {
  time = Math.max(0, Math.min(TOTAL_TIME, Number(e.target.value) || 0));
  // Mudar a posição durante Play mantém a reprodução a partir do novo instante.
  if (playing) playStart = performance.now() - time * 1000;
  updateStage(time);
};
