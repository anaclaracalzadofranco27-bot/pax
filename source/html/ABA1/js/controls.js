
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
const xrayEls = () => [...document.querySelectorAll('#camera-rig > svg path, #pax-front path, #pax-front rect, #pax-front polygon')];
function xrayReset() {
  if (!xrayOn) return; xrayOn = false;
  const all = [document.querySelector('#camera-rig > svg'), document.getElementById('pax-front'), document.getElementById('pax-layer'), document.getElementById('pax-labels'), ...xrayEls()];
  all.forEach(el => { if (el) { el.style.transition = 'none'; el.style.opacity = ''; el.style.willChange = ''; } });
  void rig.offsetWidth;
  all.forEach(el => { if (el) el.style.transition = ''; });
}
function xrayRun(ms) {
  return new Promise(resolve => {
    if (playing) togglePlay();
    xrayOn = true;
    const fade = Math.max(0.4, ms / 1000 - 0.1);
    [document.querySelector('#camera-rig > svg'), document.getElementById('pax-front'), document.getElementById('pax-layer'), document.getElementById('pax-labels')].forEach(el => {
      if (!el) return; el.style.willChange = 'opacity'; el.style.transition = `opacity ${fade.toFixed(2)}s ease-in-out`; el.style.opacity = '0';
    });
    setTimeout(resolve, ms);
  });
}
