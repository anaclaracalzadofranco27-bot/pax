// ============================================================================
// EXPORTAR VÍDEO: a animação é redesenhada em Full HD 1920 x 1080 (16:9, 30 quadros/s), sem deformar o SVG 575x425
// e codificada em MP4 (H.264) com o codificador do navegador; sem ele, é gravada em tempo real com o MediaRecorder. Cada quadro tem o fundo, o desenho
// do avião, os passageiros, o pórtico por cima deles, o zoom da câmera, os bagageiros em laranja, os passageiros sentados escurecidos e os balões, nos mesmos tempos do Play.
// Os valores abaixo repetem o CSS: #camera-rig.zoom-bridge, a transição do #camera-rig e o pulso dos bagageiros.
// ============================================================================
const EXPORT_W = 1920, EXPORT_H = 1080, EXPORT_FPS = 30;
const CAM_ZOOM = { s: 1.68, tx: -0.045, ty: -0.24, dur: 1.8 };   // scale(1.68) translate(-4.5%, -24%); transição de 1,8 s
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

