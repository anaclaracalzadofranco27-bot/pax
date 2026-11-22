
// ============================================================================
// DIREÇÃO DE ARTE CAD / BLUEPRINT (igual às cenas técnicas seguintes). A geometria do desenho não muda: só tintas.
//  · contornos: os traços escuros do desenho (#2e3639) passam para azul-marinho técnico (#1e293b); cada face recebe um traço
//    da própria cor (CAD_TRIM, em unidades do desenho) que apara as bordas desses contornos, deixando a linha fina (~1,2–1,5 px)
//  · linhas desenhadas como traço (arestas do vidro) passam a #1e293b com 1,3 px e vector-effect: non-scaling-stroke
//  · tons chapados → degradês suaves na escala slate (#cbd5e1 → #94a3b8)
// Passageiros sentados (.cabin-pax) e malas dos bagageiros (.bag-*) ficam como estão: o CSS .bin-active e a exportação
// de vídeo trocam as cores deles pelo atributo fill.
// ============================================================================
(function cadBlueprintPalette() {
  const NS = 'http://www.w3.org/2000/svg', INK = '#1e293b', OUTLINE = '#2e3639', CAD_TRIM = 0.42;
  const TONES = {
    '#c3ced4': ['#e2e8f0', '#cbd5e1'], '#bdc0be': ['#dbe2ea', '#c2ccd8'], '#a9b1b4': ['#cbd5e1', '#a9b5c5'],
    '#91999c': ['#b4c0ce', '#94a3b8'], '#8d8d8b': ['#aab6c5', '#8f9db1'], '#758185': ['#92a0b3', '#7a889c'],
    '#6b7375': ['#85939f', '#6b7a8e'], '#555e61': ['#6b7a8f', '#56647a'], '#474f50': ['#55647a', '#435066']
  };
  document.querySelectorAll('#camera-rig > svg, #pax-front').forEach((svg, si) => {
    const defs = document.createElementNS(NS, 'defs'), ids = {};
    Object.keys(TONES).forEach((k, i) => {
      const g = document.createElementNS(NS, 'linearGradient');
      g.id = `cadTone${si}_${i}`; g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0.35'); g.setAttribute('y2', '1');
      g.innerHTML = `<stop offset="0" stop-color="${TONES[k][0]}"/><stop offset="1" stop-color="${TONES[k][1]}"/>`;
      defs.appendChild(g); ids[k] = `url(#${g.id})`;
    });
    svg.insertBefore(defs, svg.firstChild);
    svg.querySelectorAll('path').forEach(p => {
      const cls = p.getAttribute('class') || '';
      const f = (p.getAttribute('fill') || '').toLowerCase(), s = (p.getAttribute('stroke') || '').toLowerCase();
      if (s === OUTLINE) { p.setAttribute('stroke', INK); p.setAttribute('stroke-width', '1.3'); p.setAttribute('vector-effect', 'non-scaling-stroke'); }
      if (f === OUTLINE) { p.setAttribute('fill', INK); return; }
      if (/\b(cabin-pax|bag-)/.test(cls) || !ids[f]) return;
      p.setAttribute('fill', ids[f]); p.setAttribute('stroke', ids[f]); p.setAttribute('stroke-width', String(CAD_TRIM)); p.setAttribute('stroke-linejoin', 'round');
    });
  });
})();
const rig = document.getElementById('camera-rig');
const timerEl = document.getElementById('timer');
const scrubber = document.getElementById('scrubber');
const playBtn = document.getElementById('playBtn');
