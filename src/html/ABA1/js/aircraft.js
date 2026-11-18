
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
// Identifica e classifica automaticamente os vetores individuais das 15 malas no bagageiro superior
document.querySelectorAll('#camera-rig > svg path').forEach(p => {
  const fill = (p.getAttribute('fill') || '').toLowerCase();
  if (!['#4a3147', '#5e4156', '#623f59'].includes(fill)) return;

  const d = p.getAttribute('d') || '';
  const nums = (d.match(/[-+]?\d*\.\d+|\d+/g) || []).map(Number);
  if (nums.length < 4) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = maxX - minX;
  const h = maxY - minY;
  const lineY = 442 - 0.5336 * (cx - 145);
  const dy = cy - lineY;

  if (cx >= 148 && cx <= 368 && dy >= -4.0 && dy <= 15.0 && w < 25 && h < 20) {
    if (fill === '#5e4156') {
      p.classList.add('bag-top');
    } else if (fill === '#4a3147') {
      p.classList.add('bag-front');
    } else {
      p.classList.add('bag-detail');
    }
  }
});

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

// ============================================================================
// EXPORTAR VÍDEO: a animação é redesenhada em Full HD 1920 x 1080 (16:9, 30 quadros/s), sem deformar o SVG 575x425
// e codificada em MP4 (H.264) com o codificador do navegador; sem ele, é gravada em tempo real com o MediaRecorder. Cada quadro tem o fundo, o desenho
// do avião, os passageiros, o pórtico por cima deles, o zoom da câmera, os bagageiros em laranja, os passageiros sentados escurecidos e os balões, nos mesmos tempos do Play.
// Os valores abaixo repetem o CSS: #camera-rig.zoom-bridge, a transição do #camera-rig e o pulso dos bagageiros.
// ============================================================================
const EXPORT_W = 1920, EXPORT_H = 1080, EXPORT_FPS = 30;
const CAM_ZOOM = { s: 1.68, tx: -0.045, ty: -0.24, dur: 1.8 };   // scale(2.35) translate(-4.5%, -24%); transição de 1,5 s
const CABIN_DIM = { '#91999c': '#808283', '#8d8d8b': '#797979', '#758185': '#6a6d6e' };   // mesmas cores do CSS .bin-active .cabin-pax
const BIN_ORANGE = { top: [242, 106, 42], front: [207, 83, 28], detail: [247, 140, 85] };     // mesmas cores do CSS .bin-active .bag-* (#f26a2a, #cf531c, #f78c55)
const exportBtn = document.getElementById('exportBtn');
let exportingVideo = false;

function cubicBezier(x1, y1, x2, y2) {
  const B = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (B(x1, x2, m) < x) lo = m; else hi = m; }
    return B(y1, y2, (lo + hi) / 2);
  };
}
const easeCam = cubicBezier(0.45, 0, 0.25, 1), easeCss = cubicBezier(0.25, 0.1, 0.25, 1);

// câmera no instante t: zoom na passarela até ZOOM_END, depois a transição para o avião inteiro
function cameraAt(t) {
  const e = easeCam(Math.min(1, Math.max(0, (t - ZOOM_END) / CAM_ZOOM.dur)));
  return { s: CAM_ZOOM.s + (1 - CAM_ZOOM.s) * e, tx: CAM_ZOOM.tx * (1 - e), ty: CAM_ZOOM.ty * (1 - e) };
}

// ============================================================================
// BALÕES (textos em inglês): o nome de cada passageiro acompanha a cabeça dele; depois que a câmera abre, um selo laranja com
// triângulo de aviso diz que os bagageiros estão lotados. O mesmo desenho SVG aparece na página (#pax-labels) e, rasterizado uma vez,
// no vídeo exportado. Medidas em unidades do SVG do avião. Nos nomes, a ponta do rabicho fica em (0, 0); no selo, o centro.
// ============================================================================
const BALLOON_FONT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const NAME_BALLOONS = ['Matthew', 'Charles', 'Rachel'];   // viajante, senhor, mulher com o bebê
// Etiquetas HUD (estilo CAD/blueprint): caixa escura com borda ciano fina, texto monoespaçado e linha de chamada até a cabeça.
// dx/dy = centro da etiqueta em relação à ponta da chamada (0, 0); elbow = joelho da polilinha; r = raio dos cantos.
const HUD_FONT = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const NAME_STYLE = { size: 2.9, padX: 1.9, h: 5.2, dy: -7.4, elbow: [2.6, -7.4], gap: 2.2, r: 0.7,
                     fill: 'rgba(15, 23, 42, 0.88)', ink: '#f8fafc', line: '#38bdf8', lw: 0.16, leadW: 0.24 };   // lw/leadW em unidades do desenho: ≈ 1 px / 1,5 px na tela com o zoom da passarela
// selo dos bagageiros, como a imagem de referência: fundo laranja em degradê radial, borda, ícone e texto em laranja vivo
const BIN_BADGE = { text: 'OVERHEAD BINS FULL', center: [292, 315], h: 24, at: BIN_ON + 0.3,   // aparece quando a câmera já abriu
                    ink: '#f26a2a', fillIn: '#dc9446', fillOut: '#c86c37',
                    shapeOpacity: 0.3, borderOpacity: 0.75 };   // só o fundo e a borda ficam translúcidos; o texto e o ícone continuam opacos
const nameBalloonScale = z => Math.pow(CAM_ZOOM.s / z, 0.6);   // depois do zoom os nomes diminuem menos que o desenho, para continuarem legíveis

function balloonTextWidth(text, size, font, weight) {
  const g = balloonTextWidth.g || (balloonTextWidth.g = document.createElement('canvas').getContext('2d'));
  g.font = `${weight || 700} 100px ${font || BALLOON_FONT}`;
  return g.measureText(text).width / 100 * size;
}
// etiqueta HUD do passageiro: linha de chamada (ponto na cabeça → joelho → borda da caixa), caixa escura com borda ciano e o nome
// em fonte monoespaçada. Tudo num único <g> (a opacidade é aplicada no grupo inteiro). box = área ocupada [x, y, w, h]
function balloonSvg(text, o) {
  const label = text.toUpperCase();
  const w = balloonTextWidth(label, o.size, HUD_FONT, 600) + 2 * o.padX, h = o.h;
  const [ex, ey] = o.elbow, x0 = ex + o.gap, cx = x0 + w / 2, y0 = o.dy - h / 2, y1 = o.dy + h / 2, ns = '';   // espessuras em unidades: escalam junto com a etiqueta (igual no vídeo exportado)
  const inner = `<polyline points="0,0 ${ex},${ey} ${x0},${o.dy}" fill="none" stroke="${o.line}" stroke-width="${o.leadW}" stroke-linejoin="round" stroke-linecap="round" ${ns}/>`
    + `<circle cx="0" cy="0" r="0.75" fill="${o.line}"/>`
    + `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${o.r}" fill="${o.fill}" stroke="${o.line}" stroke-width="${o.lw}" ${ns}/>`
    + `<text x="${cx}" y="${o.dy + o.size * 0.04}" text-anchor="middle" dominant-baseline="central" font-family="${HUD_FONT.replace(/"/g, '')}" font-weight="600" font-size="${o.size}" fill="${o.ink}">${label}</text>`;
  const m = 1.2, bx0 = Math.min(x0, 0) - m, by0 = Math.min(y0, ey) - m;
  return { inner, box: [bx0, by0, Math.max(x0 + w, 0) + m - bx0, Math.max(y1, 0) + m - by0] };
}
// selo dos bagageiros (proporções da imagem de referência, em frações da altura h): cantos arredondados, triângulo de aviso à esquerda,
// texto em maiúsculas depois dele. box = área ocupada [x, y, w, h] em volta do centro (0, 0)
function binBadgeSvg(o) {
  const h = o.h, f = 0.234 * h, bw = 0.04 * h, w = 1.247 * h + balloonTextWidth(o.text, f) + 0.364 * h, x0 = -w / 2, y0 = -h / 2;
  const ix = x0 + 0.65 * h, iw = 0.65 * h, ih = 0.58 * h, sw = 0.036 * h;
  const inner = `<defs><radialGradient id="binBadgeFill" cx="0.5" cy="0.5" r="0.62"><stop offset="0" stop-color="${o.fillIn}"/><stop offset="1" stop-color="${o.fillOut}"/></radialGradient></defs>`
    + `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${0.18 * h}" fill="url(#binBadgeFill)" fill-opacity="${o.shapeOpacity}"/>`
    + `<rect class="bin-badge-border" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${0.18 * h}" fill="none" stroke="${o.ink}" stroke-opacity="${o.borderOpacity}" stroke-width="${bw}"/>`
    + `<g fill="none" stroke="${o.ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M ${ix} ${-ih / 2} L ${ix + iw / 2} ${ih / 2} L ${ix - iw / 2} ${ih / 2} Z"/><path d="M ${ix} ${-ih * 0.10} L ${ix} ${ih * 0.20}"/></g>`
    + `<circle cx="${ix}" cy="${ih * 0.34}" r="${sw * 0.75}" fill="${o.ink}"/>`
    + `<text x="${x0 + 1.247 * h}" y="${f * 0.04}" dominant-baseline="central" font-family="${BALLOON_FONT.replace(/"/g, '')}" font-weight="700" font-size="${f}" fill="${o.ink}">${o.text}</text>`;
  const m = bw / 2 + 0.3;
  return { inner, box: [x0 - m, y0 - m, w + 2 * m, h + 2 * m] };
}
// selo dos bagageiros no instante t: surge do centro com um pequeno exagero (easeOutBack) e depois flutua de leve
function binBalloonAt(t) {
  const d = t - BIN_BADGE.at;
  if (d <= 0) return null;
  const p = Math.min(1, d / 0.4), back = 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
  return { k: 0.5 + 0.5 * back, a: Math.min(1, d / 0.25), dy: -0.6 * Math.sin(d * Math.PI * 2 / 2.4) };
}
// página: nós SVG criados uma vez; a cada quadro só mudam posição, escala e opacidade
const liveBalloons = (() => {
  const svg = document.getElementById('pax-labels'), NS = 'http://www.w3.org/2000/svg';
  const mk = b => { const g = document.createElementNS(NS, 'g'); g.innerHTML = b.inner; g.style.display = 'none'; svg.appendChild(g); return g; };
  // selo: o pulso fica num <g> interno e o selo é escondido com visibility (não display), para a animação começar junto com a das malas
  const bb = binBadgeSvg(BIN_BADGE), bin = mk({ inner: `<g class="bin-badge-pulse">${bb.inner}</g>` });
  bin.style.display = ''; bin.style.visibility = 'hidden';
  return { names: NAME_BALLOONS.map(n => mk(balloonSvg(n, NAME_STYLE))), bin };
})();
function updateBalloonsLive(t, zoom, anchors) {
  const k = nameBalloonScale(zoom);
  liveBalloons.names.forEach((g, i) => {
    const a = anchors[i];
    if (!a) { g.style.display = 'none'; return; }
    g.style.display = '';
    g.setAttribute('transform', `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) scale(${k.toFixed(4)})`);
    g.setAttribute('opacity', a.a.toFixed(3));
  });
  const b = binBalloonAt(t), gb = liveBalloons.bin;
  if (!b) { gb.style.visibility = 'hidden'; return; }
  gb.style.visibility = '';
  gb.setAttribute('transform', `translate(${BIN_BADGE.center[0]} ${(BIN_BADGE.center[1] + b.dy).toFixed(2)}) scale(${b.k.toFixed(4)})`);
  gb.setAttribute('opacity', b.a.toFixed(3));
}

// rasteriza um <svg> (ou parte dele) num canvas: vb = [x, y, w, h] em unidades do desenho, ppu = pixels por unidade
async function rasterSvg(svgText, vb, ppu) {
  const w = Math.ceil(vb[2] * ppu), h = Math.ceil(vb[3] * ppu);
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
function svgCloneText(svgEl, vb, ppu) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('viewBox', vb.join(' '));
  clone.setAttribute('width', Math.ceil(vb[2] * ppu));
  clone.setAttribute('height', Math.ceil(vb[3] * ppu));
  clone.removeAttribute('id');
  return new XMLSerializer().serializeToString(clone);
}
function unionBBox(els, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  els.forEach(el => { const b = el.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
}

// prepara as camadas uma única vez por exportação
async function buildExportLayers(W, H) {
  const mainSvg = document.querySelector('#camera-rig > svg'), frontSvg = document.getElementById('pax-front');
  const VB = mainSvg.viewBox.baseVal;
  const stageW = Math.min(W, H * VB.width / VB.height);
  const stageH = Math.min(H, W * VB.height / VB.width);
  const stageX = (W - stageW) / 2, stageY = (H - stageH) / 2;
  const ppu = stageW / VB.width * CAM_ZOOM.s;   // pixels por unidade no palco, sem esticar o SVG
  const main = await rasterSvg(svgCloneText(mainSvg, [VB.x, VB.y, VB.width, VB.height], ppu), [VB.x, VB.y, VB.width, VB.height], ppu);
  const fb = unionBBox([...frontSvg.querySelectorAll('path')], 1);
  const front = await rasterSvg(svgCloneText(frontSvg, fb, ppu), fb, ppu);
  // bagageiros em destaque (classes do CSS .bin-active), em duas intensidades do pulso: brilho 0,85 e 1,18 com brilho laranja em volta
  const bags = [...mainSvg.querySelectorAll('.bag-top, .bag-front, .bag-detail')];
  let red = null;
  if (bags.length) {
    const bb = unionBBox(bags, 6);
    const base = el => el.classList.contains('bag-top') ? BIN_ORANGE.top : el.classList.contains('bag-front') ? BIN_ORANGE.front : BIN_ORANGE.detail;
    const col = (c, k) => 'rgb(' + c.map(v => Math.min(255, Math.round(v * k))).join(',') + ')';
    const layer = (k, glow) => {
      const paths = bags.map(el => { const c = col(base(el), k); return `<path d="${el.getAttribute('d')}" fill="${c}" stroke="${c}"/>`; }).join('');
      const defs = glow ? '<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#f26a2a" flood-opacity="0.55"/></filter></defs>' : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bb.join(' ')}" width="${Math.ceil(bb[2] * ppu)}" height="${Math.ceil(bb[3] * ppu)}">${defs}<g${glow ? ' filter="url(#g)"' : ''}>${paths}</g></svg>`;
    };
    red = { bb, low: await rasterSvg(layer(0.85, false), bb, ppu), high: await rasterSvg(layer(1.18, true), bb, ppu) };
  }
  // passageiros sentados mais escuros (CSS .bin-active .cabin-pax): o mesmo desenho, só na área da cabine, com as cores trocadas.
  // A área fica alinhada aos pixels da camada principal e é recortada no formato dos passageiros, para não aparecer emenda.
  const seated = [...mainSvg.querySelectorAll('.cabin-pax')];
  let dim = null;
  if (seated.length) {
    const u = unionBBox(seated, 2), gx = Math.floor((u[0] - VB.x) * ppu), gy = Math.floor((u[1] - VB.y) * ppu);
    const nw = Math.ceil((u[0] + u[2] - VB.x) * ppu) - gx, nh = Math.ceil((u[1] + u[3] - VB.y) * ppu) - gy;
    const bb = [VB.x + gx / ppu, VB.y + gy / ppu, (nw - 1e-4) / ppu, (nh - 1e-4) / ppu];
    const clone = mainSvg.cloneNode(true);
    clone.querySelectorAll('.cabin-pax').forEach(p => { const c = CABIN_DIM[(p.getAttribute('fill') || '').toLowerCase()]; if (c) p.setAttribute('fill', c); });
    const img = await rasterSvg(svgCloneText(clone, bb, ppu), bb, ppu);
    const shapes = seated.map(p => `<path d="${p.getAttribute('d')}" fill="#fff" stroke="#fff" stroke-width="0.6"${p.getAttribute('fill-rule') ? ` fill-rule="${p.getAttribute('fill-rule')}"` : ''}/>`).join('');
    const mask = await rasterSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bb.join(' ')}" width="${Math.ceil(bb[2] * ppu)}" height="${Math.ceil(bb[3] * ppu)}">${shapes}</svg>`, bb, ppu);
    const g = img.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);
    dim = { bb, img };
  }
  // fundo azul-escuro quadriculado, o mesmo das outras simulações (#000223 com malha de 48 px em rgba(91,123,158,.10)), na escala do vídeo
  const cell = Math.max(8, Math.round(48 * W / Math.max(1, document.getElementById('viewport').clientWidth)));
  const tile = document.createElement('canvas'); tile.width = tile.height = cell;
  const tg = tile.getContext('2d'), lw = Math.max(1, Math.round(cell / 48));
  tg.fillStyle = '#000223'; tg.fillRect(0, 0, cell, cell);
  tg.fillStyle = 'rgba(91,123,158,0.10)'; tg.fillRect(0, 0, lw, cell); tg.fillRect(0, 0, cell, lw);
  const bg = tg.createPattern(tile, 'repeat');
  // balões (o mesmo SVG da página), rasterizados com folga de resolução para o zoom
  const bp = ppu * 1.25, rasterBalloon = async b => ({ box: b.box, img: await rasterSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.box.join(' ')}" width="${Math.ceil(b.box[2] * bp)}" height="${Math.ceil(b.box[3] * bp)}">${b.inner}</svg>`, b.box, bp) });
  const balloons = { names: await Promise.all(NAME_BALLOONS.map(n => rasterBalloon(balloonSvg(n, NAME_STYLE)))), bin: await rasterBalloon(binBadgeSvg(BIN_BADGE)) };
  return { W, H, VB, stageW, stageH, stageX, stageY, main, front, fb, red, dim, balloons, bg };
}

// desenha o quadro do instante t
function drawExportFrame(ctx, t, L) {
  const { W, H, VB, stageW, stageH, stageX, stageY } = L;
  const X = x => (x - VB.x) / VB.width * stageW;
  const Y = y => (y - VB.y) / VB.height * stageH;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = L.bg; ctx.fillRect(0, 0, W, H);
  const cam = cameraAt(t);
  // A câmera opera somente no palco proporcional 575:425, centralizado no 16:9.
  ctx.setTransform(cam.s, 0, 0, cam.s,
    stageX + stageW / 2 + cam.s * (cam.tx * stageW - stageW / 2),
    stageY + stageH / 2 + cam.s * (cam.ty * stageH - stageH / 2));
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(L.main, 0, 0, stageW, stageH);
  if (L.dim && t >= BIN_ON) {                       // .bin-active: passageiros sentados escurecem em 0,5 s
    const b = L.dim.bb;
    ctx.globalAlpha = easeCss(Math.min(1, (t - BIN_ON) / 0.5));
    ctx.drawImage(L.dim.img, X(b[0]), Y(b[1]), b[2] / VB.width * W, b[3] / VB.height * H);
    ctx.globalAlpha = 1;
  }
  if (L.red && t >= BIN_ON) {                       // .bin-active: cor laranja em 0,5 s e pulso de 1,1 s (ida e volta)
    const dt = t - BIN_ON, fa = easeCss(Math.min(1, dt / 0.5));
    const k = Math.floor(dt / 1.1), f = dt / 1.1 - k, q = easeCss(k % 2 === 0 ? f : 1 - f);
    const b = L.red.bb, args = [X(b[0]), Y(b[1]), b[2] / VB.width * W, b[3] / VB.height * H];
    ctx.globalAlpha = fa; ctx.drawImage(L.red.low, ...args);
    ctx.globalAlpha = fa * q; ctx.drawImage(L.red.high, ...args);
    ctx.globalAlpha = 1;
  }
  if (window.PAX) ctx.drawImage(PAX.renderAt(t, cam.s), X(185), Y(455), X(360) - X(185), Y(645) - Y(455));   // mesmo retângulo do #pax-layer
  const fb = L.fb;
  ctx.drawImage(L.front, X(fb[0]), Y(fb[1]), fb[2] / VB.width * W, fb[3] / VB.height * H);
  // balões por cima de tudo (como o #pax-labels): nomes nas posições calculadas pelo renderAt acima e o aviso dos bagageiros
  const put = (B, x, y, k, a) => { const b = B.box; ctx.globalAlpha = a; ctx.drawImage(B.img, X(x + k * b[0]), Y(y + k * b[1]), k * b[2] / VB.width * W, k * b[3] / VB.height * H); };
  if (window.PAX) { const k = nameBalloonScale(cam.s); PAX.labelAnchors().forEach((a, i) => { if (a) put(L.balloons.names[i], a.x, a.y, k, a.a); }); }
  const bb = binBalloonAt(t);
  if (bb) {                                            // mesmo pulso das malas (1,1 s, ida e volta, a partir de ZOOM_END)
    const dt = t - BIN_ON, n = Math.floor(dt / 1.1), f = dt / 1.1 - n, q = easeCss(n % 2 === 0 ? f : 1 - f);
    ctx.filter = `brightness(${(0.85 + 0.33 * q).toFixed(3)})`;
    put(L.balloons.bin, BIN_BADGE.center[0], BIN_BADGE.center[1] + bb.dy, bb.k, bb.a * (0.88 + 0.12 * q));   // só um pulso leve (na página, só a borda pulsa)
    ctx.filter = 'none';
  }
  ctx.globalAlpha = 1;
}

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

