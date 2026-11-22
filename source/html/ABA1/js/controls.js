
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

// ---- Transição para a engenharia (Simulação Completa): o avião isométrico fica parado; fuselagem, asas, passageiros e balões
//      somem suavemente e só a fileira de bagageiros lotados (laranja) continua, flutuando sobre a malha escura.
//      A página principal faz então a dissolvição cruzada para o bin 3D técnico. ----
let xrayOn = false;
// Estas são as únicas camadas que o efeito X-ray modifica por estilo inline.
// Não é necessário percorrer centenas de paths SVG para restaurá-las.
const xrayLayers = () => [
  document.querySelector('#camera-rig > svg'),
  document.getElementById('pax-front'),
  document.getElementById('pax-layer'),
  document.getElementById('pax-labels')
].filter(Boolean);
function xrayReset() {
  if (!xrayOn) return;
  xrayOn = false;
  const ov = document.getElementById('xray-bags');
  if (ov) ov.style.display = 'none';
  const layers = xrayLayers();
  layers.forEach(el => {
    el.style.transition = 'none';
    el.style.opacity = '';
    el.style.willChange = '';
  });
  void rig.offsetWidth;
  layers.forEach(el => { el.style.transition = ''; });
}
function xrayRun(ms) {
  return new Promise(resolve => {
    if (playing) togglePlay();
    xrayOn = true;
    const fade = Math.max(0.4, ms / 1000 - 0.1);
    xrayLayers().forEach(el => {
      el.style.willChange = 'opacity';
      el.style.transition = `opacity ${fade.toFixed(2)}s ease-in-out`;
      el.style.opacity = '0';
    });
    setTimeout(resolve, ms);
  });
}
