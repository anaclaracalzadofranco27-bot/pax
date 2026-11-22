let time = 0, playing = false, interval = null;
const ZOOM_END = 10;   // segundos com o zoom na passarela; depois a câmera abre para o avião inteiro
const BIN_ON = ZOOM_END + 1.8;   // bagageiros acendem em laranja só quando a câmera termina de abrir (1,8 s)
const TOTAL_TIME = 14; // duração total da animação (s): o Play para aqui. O selo OVERHEAD BINS FULL assenta em ~12,5 s: a tela fica parada no alerta só ~2 s

function updateStage(sec) {
  paxLastTick = performance.now();
  scrubber.value = sec;
  timerEl.textContent = `00:${String(Math.floor(sec)).padStart(2,'0')} / 00:${String(TOTAL_TIME).padStart(2,'0')}`;

  const cls = sec < ZOOM_END ? 'zoom-bridge' : sec < BIN_ON ? '' : 'bin-active';
  if (rig.className !== cls) rig.className = cls;   // só troca a classe quando muda (sem recalcular estilos a cada 0,1 s)
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  if (playing) {
    if (time >= TOTAL_TIME) time = 0;
    interval = setInterval(() => {
      time = Math.min(TOTAL_TIME, +(time + 0.1).toFixed(1));
      updateStage(time);
      if (time >= TOTAL_TIME) {
        clearInterval(interval);
        playing = false;
        playBtn.textContent = '▶ Play';
      }
    }, 100);
  } else {
    clearInterval(interval);
  }
}

playBtn.onclick = togglePlay;

document.getElementById('resetBtn').onclick = () => {
  clearInterval(interval);
  playing = false;
  time = 0;
  playBtn.textContent = '▶ Play';
  updateStage(0);
};

scrubber.oninput = (e) => {
  time = parseFloat(e.target.value);
  updateStage(time);
};

