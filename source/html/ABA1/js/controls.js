
// Controle a partir da página principal (aba 1 e roteiro da Simulação Completa)
window.paxEmbed = {
  ready: () => !!window.PAX,
  reset: () => { rig.style.transition = 'none'; document.getElementById('resetBtn').click(); void rig.offsetWidth; rig.style.transition = ''; },
  play: () => { if (!playing && !exportingVideo) togglePlay(); },
  pause: () => { if (playing) togglePlay(); },
  done: () => time >= TOTAL_TIME,
  setControls: on => { document.body.classList.toggle('no-ctl', !on); window.dispatchEvent(new Event('resize')); },
  xray: ms => xrayRun(ms || 1700),
  xrayReset: () => xrayReset()
};

// ---- Transição X-ray para a engenharia no Take 01: esmaece os quatro
//      containers visuais (avião, camada frontal, passageiros e balões).
//      O diretor da Simulação Geral faz a transição ao CAD em seguida. ----
let xrayOn = false;
// A transição X-ray muda somente o estilo desses quatro nós raiz.
// Não percorra as centenas de <path> dos SVGs: nenhum recebe estilo inline aqui.
const xrayLayers = () => [
  document.querySelector('#camera-rig > svg'),
  document.getElementById('pax-front'),
  document.getElementById('pax-layer'),
  document.getElementById('pax-labels')
].filter(Boolean);
function xrayReset() {
  if (!xrayOn) return; xrayOn = false;
  const all = xrayLayers();
  all.forEach(el => { if (el) { el.style.transition = 'none'; el.style.opacity = ''; el.style.willChange = ''; } });
  void rig.offsetWidth;
  all.forEach(el => { if (el) el.style.transition = ''; });
}
function xrayRun(ms) {
  return new Promise(resolve => {
    if (playing) togglePlay();
    xrayOn = true;
    const fade = Math.max(0.4, ms / 1000 - 0.1);
    xrayLayers().forEach(el => {
      el.style.willChange = 'opacity'; el.style.transition = `opacity ${fade.toFixed(2)}s ease-in-out`; el.style.opacity = '0';
    });
    setTimeout(resolve, ms);
  });
}
