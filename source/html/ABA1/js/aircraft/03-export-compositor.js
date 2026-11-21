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

