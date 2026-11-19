
    // -------------------------------------------------------------------------
    // ABA 4 · VISTA SUPERIOR DA CABINE (bins Alpha × Convencional)
    // -------------------------------------------------------------------------
    // Renderer 2D convencional substituído pela cena Three.js compartilhada acima.
    // __convDraw() é registrado em conventional3DTopView(), dentro de initCAD3DModule().
    (function () {
        'use strict';
        const cv = document.getElementById('topCanvas');
        const stage = document.getElementById('top-stage');
        if (!cv || !stage) return;

        const STAGES = ['Aircraft', '1st module + dimensions', 'Bins in cabin', 'Cut section', 'Numbered bags', 'Advantage'];
        const N_ST = STAGES.length, STAGE_SEC = 1.2;
        const A = { t: 0, playing: false, last: 0, raf: 0, started: false, stopAt: N_ST, capIdx: -1 };
        const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

        const INK = '#aebfd3';
        const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
        const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

        // Cabine em vista superior vinda do PDF (vetorial, embutida como SVG)
        const CAB_VB = [18.0, 144.5, 814.5, 167.0];   // viewBox do recorte, em pt do PDF
        const CAB = new Image();
        CAB.onload = () => { CAB.ok = true; try { refresh(); } catch (e) { } };
        CAB.src = 'data:image/svg+xml;base64,@@APHA_INCLUDE:source/html/ABA4/aircraft.svg.base64@@';

        // Detalhe da seção S: arte vetorial do 9.svg (embutida; fundo branco removido)
        const DET_VB = [1422, 467];   // largura × altura do recorte, em unidades do SVG
        const DET = new Image();
        DET.onload = () => { DET.ok = true; try { refresh(); } catch (e) { } };
        DET.src = 'data:image/svg+xml;base64,@@APHA_INCLUDE:source/html/ABA4/detail-s.svg.base64@@';

        // desenhos vetoriais grandes (cabine e detalhe S): rasterizados uma vez por tamanho, em vez de a cada quadro (evita travar o vídeo)
        function rasterOf(img, w, h) {
            const dpr = window.devicePixelRatio || 1, cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
            const c = img.__rc;
            if (c && c.width === cw && c.height === ch) return c;
            const r = document.createElement('canvas'); r.width = cw; r.height = ch;
            r.getContext('2d').drawImage(img, 0, 0, cw, ch);
            return (img.__rc = r);
        }
        function draw() {
            const W = stage.offsetWidth || stage.getBoundingClientRect().width;   // largura de layout (sem as transformações de zoom/giro das transições)
            if (!W) return;
            const T = A.t, S = (i, d = 1) => ease(clamp((T - i) / d));

            // ---- layout ----
            const padX = 26;
            const CUT = 16.3;   // aeronave cortada onde termina a cabine do PDF (≈ 16,26 m do nariz; sangra até a borda direita)
            const s = Math.min((W - padX) / CUT, 80), X0 = padX;
            const R = 1.6 * s;
            const stripW = Math.min(W - 2 * padX - 10, 1180);
            const detGap = 34, detImgH = stripW * DET_VB[1] / DET_VB[0];
            const acH = 2 * R + 124, detH = detGap + detImgH + 16;
            const H = Math.round(acH + detH + 24);
            if (Math.abs((parseFloat(stage.style.height) || 0) - H) > 0.5) stage.style.height = H + 'px';

            const dpr = window.devicePixelRatio || 1;
            const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
            if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
            const ctx = cv.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);

            const mono = (w, px) => `${w} ${px}px "JetBrains Mono", monospace`;
            const cm = c => c * s / 100, mx = m => X0 + m * s, XC0 = 4.2;   // XC0: início dos bins no PDF novo (4,2 m do nariz, logo após a parede da cabine)
            const cy = 34 + 36 + R;
            const shift = ((H - acH) / 2) * (1 - S(3, 0.9));
            A.lay = { s, cy, shift, X0, W, H };                               // usado pelas transições da Simulação Completa

            // =========================== AERONAVE ===========================
            ctx.save();
            ctx.translate(0, shift);


            // revelação da nariz → cauda
            ctx.save();
            ctx.beginPath(); ctx.rect(0, -80, S(0, 0.95) * (W + 10), acH + 160); ctx.clip();

            // cabine do PDF (aveao_1.pdf): fuselagem, para-brisa, parede, janelas e poltronas
            // escala: 0,5 pt do PDF = 1 cm  →  s/50 px por pt;  ponta do nariz (x = 19,0 pt) em mx(0);  eixo (y = 227,85 pt) em cy
            if (CAB.ok) {
                const kk = s / 50;
                ctx.drawImage(rasterOf(CAB, CAB_VB[2] * kk, CAB_VB[3] * kk), mx(0) + (CAB_VB[0] - 19.0) * kk, cy + (CAB_VB[1] - 227.85) * kk, CAB_VB[2] * kk, CAB_VB[3] * kk);
            }
            ctx.restore(); // fim do clip

            // ---- bins, cotas do 1º módulo e janelas S (geometria e cores medidas no PDF aveao_1_1.pdf) ----
            // O PDF novo é o desenho antigo na escala 0,87033; tudo abaixo já está convertido para cm (0,5 pt do desenho antigo = 1 cm).
            const kk = s / 50, PDFR = 0.87033;
            const lwS = 1.4173 / PDFR * kk, lwT = 0.5669 / PDFR * kk;          // traço forte / fino do PDF
            const GEO_A = { mod: 127.6, lat: [53.8, 123.9] };                  // Alpha: módulo 2×2, faixa lateral (cm a partir do eixo)
            const GEO_C = { mod: 180.47, lat: [51.7, 125.5] };                 // Conventional: módulo de 4 colunas
            const xEnd = mx(16.19);                                            // fim da cabine: os bins terminam aqui
            const RGB_A = '91,123,158', RGB_C = '79,79,79', RGB_S = '255,90,54';
            const appear = m => m === 0 ? S(1, 0.8) : ease(clamp((T - 2) / 0.3));   // 1º módulo; depois todos juntos
            const qLight = A.ov ? ease(clamp(A.ov.bins)) : S(2, 0.3);          // Alpha: traço forte/fill .5 (1º módulo) → fino/fill .25 (todos)
            const pBin = [window.ERGO_DARK, window.BIN_SOLID, window.BIN_DARK];   // cores do PDF exatas: sem remapeamento (nem escuro, nem lilás)
            const binA = A.binA == null ? 1 : A.binA;                          // Simulação Completa: os bins "acendem" (0 → 1)
            ctx.save(); ctx.globalAlpha = binA;
            window.ERGO_DARK = false; window.BIN_SOLID = false; window.BIN_DARK = false;
            try {
                const binRow = (side, g, rgb, cols, rows, lightens) => {
                    const yIn = cy + side * cm(g.lat[0]), yOut = cy + side * cm(g.lat[1]);
                    const modW = cm(g.mod), x0 = mx(XC0), n = Math.ceil((xEnd - x0) / modW);
                    const lw = lightens ? lwS + (lwT - lwS) * qLight : lwS;
                    const fa = lightens ? 0.5 - 0.25 * qLight : 0.5;
                    for (let m = 0; m < n; m++) {
                        const x = x0 + m * modW, w = Math.min(modW, xEnd - x);
                        const p = A.ov ? ease(clamp((A.ov.bins * 1.3 - (x - x0) / (xEnd - x0)) / 0.3)) : appear(m); if (p <= 0) continue;   // roteiro: enche do nariz para a cauda
                        const yi = yOut + (yIn - yOut) * p, y0 = Math.min(yOut, yi), hh = Math.abs(yi - yOut);
                        ctx.fillStyle = `rgba(${rgb},${fa})`; ctx.fillRect(x, y0, w, hh);
                        ctx.strokeStyle = `rgb(${rgb})`; ctx.lineWidth = lw; ctx.lineJoin = 'miter';
                        ctx.strokeRect(x, y0, w, hh);
                        if (p > 0.6) {
                            ctx.globalAlpha = binA * (p - 0.6) / 0.4; ctx.beginPath();
                            for (let i = 1; i < cols; i++) { const xx = x + modW * i / cols; if (xx < x + w - 0.5) { ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 + hh); } }
                            for (let i = 1; i < rows; i++) { ctx.moveTo(x, y0 + hh * i / rows); ctx.lineTo(x + w, y0 + hh * i / rows); }
                            ctx.stroke(); ctx.globalAlpha = binA;
                        }
                    }
                };
                binRow(-1, GEO_A, RGB_A, 2, 2, true);
                binRow(+1, GEO_C, RGB_C, 4, 1, false);

                // cotas de largura do 1º módulo (sem texto, como no PDF): Alpha acima, Conventional abaixo; somem quando todos os bins surgem
                const grow = A.ov ? ease(clamp(A.ov.dims)) : S(1.35, 0.8), fadeD = 1;   // as cotas ficam até o fim
                if (grow > 0 && fadeD > 0) {
                    const gap = 1.7 / PDFR * kk, aL = 4.5 / PDFR * kk, aH = 1.7 / PDFR * kk;
                    const dimPDF = (xa, xb, yDim, yEdge, rgb, label, txtCol) => {
                        const xe = xa + (xb - xa) * grow;
                        ctx.save(); ctx.globalAlpha = binA * Math.min(1, grow * 1.5) * fadeD;
                        ctx.strokeStyle = `rgb(${rgb})`; ctx.fillStyle = `rgb(${rgb})`; ctx.lineWidth = lwT;
                        ctx.setLineDash([1.13 / PDFR * kk, 1.7 / PDFR * kk]); ctx.beginPath();
                        ctx.moveTo(xa, yEdge); ctx.lineTo(xa, yDim); ctx.moveTo(xe, yEdge); ctx.lineTo(xe, yDim); ctx.stroke();
                        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(xa, yDim); ctx.lineTo(xe, yDim); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(xa, yDim); ctx.lineTo(xa + aL, yDim - aH); ctx.lineTo(xa + aL, yDim + aH); ctx.closePath(); ctx.fill();
                        ctx.beginPath(); ctx.moveTo(xe, yDim); ctx.lineTo(xe - aL, yDim - aH); ctx.lineTo(xe - aL, yDim + aH); ctx.closePath(); ctx.fill();
                        if (grow > 0.7) {   // rótulo da cota, centrado sobre a linha (surge quando a cota está quase completa)
                            ctx.globalAlpha = binA * clamp((grow - 0.7) / 0.25);
                            ctx.font = mono(700, 13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            const tw = ctx.measureText(label).width + 14, cxm = (xa + xe) / 2;
                            ctx.fillStyle = 'rgba(0,2,35,.95)'; ctx.fillRect(cxm - tw / 2, yDim - 10, tw, 20);
                            ctx.lineWidth = 1; ctx.strokeStyle = `rgb(${rgb})`; ctx.strokeRect(cxm - tw / 2, yDim - 10, tw, 20);
                            ctx.fillStyle = txtCol; ctx.fillText(label, cxm, yDim + 0.5);
                        }
                        ctx.restore();
                    };
                    const xa = mx(XC0);
                    dimPDF(xa, xa + cm(GEO_A.mod), cy - cm(195.8), cy - cm(GEO_A.lat[1]) - gap, RGB_A, '44"', '#9db6d3');
                    dimPDF(xa, xa + cm(GEO_C.mod), cy + cm(191.2), cy + cm(GEO_C.lat[1]) + gap, RGB_C, '56"', '#c4c4c4');
                }

                // janelas de corte S: faixa vermelha tracejada (sem etiqueta), mesma faixa lateral dos bins
                const p3 = S(3, 0.8);
                if (p3 > 0) {
                    ctx.save(); ctx.globalAlpha = p3;
                    const win = (x0, len, side, g) => {
                        const yA = cy + side * cm(g.lat[0]), yB = cy + side * cm(g.lat[1]);
                        const y0 = Math.min(yA, yB), h = Math.abs(yB - yA);
                        ctx.fillStyle = `rgba(${RGB_S},.25)`; ctx.fillRect(x0, y0, len, h);
                        // Open-ended section S: no right-hand closing edge.
                        // The faint dashed continuation stops at the final bin, inside the fuselage.
                        const sEnd = Math.min(x0 + len, xEnd);
                        ctx.setLineDash([lwS, lwS]); ctx.strokeStyle = `rgb(${RGB_S})`;
                        ctx.lineWidth = lwS; ctx.lineJoin = 'miter';
                        ctx.beginPath();
                        ctx.moveTo(x0, y0 + h); ctx.lineTo(x0, y0);
                        ctx.lineTo(sEnd, y0);
                        ctx.moveTo(x0, y0 + h); ctx.lineTo(sEnd, y0 + h);
                        ctx.stroke();
                        if (xEnd > sEnd) {
                            ctx.globalAlpha = p3 * 0.48;
                            ctx.lineWidth = Math.max(1, lwS * 0.65);
                            ctx.beginPath();
                            ctx.moveTo(sEnd, y0); ctx.lineTo(xEnd, y0);
                            ctx.moveTo(sEnd, y0 + h); ctx.lineTo(xEnd, y0 + h);
                            ctx.stroke();
                            ctx.globalAlpha = p3;
                        }
                        ctx.setLineDash([]);
                        // etiqueta "S" no canto da janela (fora da faixa: acima no Alpha, abaixo no Conventional)
                        const tw = 17 / PDFR * kk * 0.9, th = tw, ty = side < 0 ? y0 - th : y0 + h;
                        ctx.fillStyle = `rgb(${RGB_S})`; ctx.fillRect(x0, ty, tw, th);
                        ctx.fillStyle = '#fff'; ctx.font = mono(700, Math.max(10, Math.round(th * 0.7)));
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', x0 + tw / 2, ty + th / 2 + 0.5);
                    };
                    win(mx(XC0) + cm(3 * GEO_A.mod), cm(5 * GEO_A.mod), -1, GEO_A);   // Alpha: do 4º ao 8º módulo
                    win(mx(XC0) + cm(402.8), cm(635.9), +1, GEO_C);                   // Conventional: mesma extensão de cabine
                    ctx.restore();
                }

            } finally { [window.ERGO_DARK, window.BIN_SOLID, window.BIN_DARK] = pBin; ctx.restore(); }
            ctx.restore(); // fim translate aeronave

            // =========================== DETALHE ===========================
            const pDet = ease(clamp((T - 3.3) / 0.7)) * (1 - (A.detOut || 0));
            if (pDet > 0) {
                ctx.save();
                ctx.globalAlpha = pDet; ctx.translate(0, (1 - pDet) * 14);
                const yD = acH + 10, sx0 = (W - stripW) / 2;
                ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
                ctx.fillStyle = INK; ctx.font = mono(700, 12); ctx.fillText('SECTION S DETAIL', sx0, yD + 12);
                ctx.strokeStyle = 'rgba(106,86,160,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx0, yD + 22); ctx.lineTo(sx0 + stripW, yD + 22); ctx.stroke();
                if (DET.ok) {
                    ctx.drawImage(rasterOf(DET, stripW, detImgH), sx0, yD + detGap, stripW, detImgH);


                    // Section S comparison, in the original SVG coordinates (viewBox 16 200 1422 467).
                    const kDet = stripW / DET_VB[0];
                    ctx.save();
                    ctx.translate(sx0 - 16 * kDet, yD + detGap - 200 * kDet);
                    ctx.scale(kDet, kDet);

                    // Clear only the obsolete left-hand dimension label. Keep the SVG's
                    // original +4 bags outline, translucent orange area and dashed divider
                    // at x = 1128 (the boundary between bags 16 and 17) untouched.
                    ctx.clearRect(16, 380, 1110, 56);

                    // Dimension ends at the vertical dashed boundary preceding bags 17-20.
                    const xFirst = 25.5, xSixteen = 1128, yDim = 398;
                    ctx.strokeStyle = '#ff5a36'; ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(xFirst, yDim - 7); ctx.lineTo(xFirst, yDim + 7);
                    ctx.moveTo(xSixteen, yDim - 7); ctx.lineTo(xSixteen, yDim + 7);
                    ctx.moveTo(xFirst, yDim); ctx.lineTo(xSixteen, yDim);
                    ctx.moveTo(xFirst + 8, yDim - 4); ctx.lineTo(xFirst, yDim); ctx.lineTo(xFirst + 8, yDim + 4);
                    ctx.moveTo(xSixteen - 8, yDim - 4); ctx.lineTo(xSixteen, yDim); ctx.lineTo(xSixteen - 8, yDim + 4);
                    ctx.stroke();
                    const dimensionLabel = '16 bags: 176" vs 224"';
                    ctx.font = mono(700, 17); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    const mid = (xFirst + xSixteen) / 2, labelW = ctx.measureText(dimensionLabel).width + 24;
                    ctx.fillStyle = '#000223'; ctx.fillRect(mid - labelW / 2, yDim - 12, labelW, 24);
                    ctx.strokeStyle = '#ff5a36'; ctx.lineWidth = 1;
                    ctx.strokeRect(mid - labelW / 2, yDim - 12, labelW, 24);
                    ctx.fillStyle = '#ff916e'; ctx.fillText(dimensionLabel, mid, yDim + .5);

                    // 4" shorter ALPHA bin: bracket aligned with the original SVG's
                    // ALPHA 220" endpoint and the CONVENTIONAL 224" endpoint.
                    // Keep its label to the RIGHT of the bracket, clear of the line.
                    const xAlphaEnd = 1407.3, xConvEnd = 1430, yShort = 268;
                    ctx.strokeStyle = '#ff5a36'; ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(xAlphaEnd, yShort - 6); ctx.lineTo(xAlphaEnd, yShort + 6);
                    ctx.moveTo(xConvEnd, yShort - 6); ctx.lineTo(xConvEnd, yShort + 6);
                    ctx.moveTo(xAlphaEnd, yShort); ctx.lineTo(xConvEnd, yShort); ctx.stroke();
                    ctx.font = mono(700, 13); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
                    ctx.fillStyle = '#ff916e'; ctx.fillText('4"', xConvEnd + 10, yShort);
                    ctx.restore();
                }
                ctx.restore();
            }
            // roteiro: ALPHA acima e CONVENTIONAL abaixo da aeronave (mesma fonte da vista anterior); quando o detalhe S entra, os nomes vão para a frente das fileiras dele
            if (A.names) {
                const na = A.ov ? clamp(A.ov.names) : 1, k = ease(clamp((T - 3.3) / 0.7));
                if (na > 0) {
                    const yAx = cy + shift, sx0 = (W - stripW) / 2, yD = acH + 10 + detGap, kd = detImgH / DET_VB[1];
                    ctx.save(); ctx.globalAlpha = na; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
                    const F0 = 26; ctx.font = `700 ${F0}px Montserrat, Inter, sans-serif`;
                    const wA = ctx.measureText('ALPHA').width, wC = ctx.measureText('CONVENTIONAL').width;
                    const f1 = Math.min(1, (sx0 - 26) / wC);                       // no detalhe: cabe na margem à esquerda das fileiras
                    const xMid = (mx(XC0) + mx(16.19)) / 2;
                    [['ALPHA', '#5b7b9e', wA, yAx - R - 30, yD + 130 * kd], ['CONVENTIONAL', '#9ba9b5', wC, yAx + R + 30, yD + 349 * kd]].forEach(([txt, col, w0, y0, y1]) => {
                        // sai do lugar junto à aeronave e entra na frente da fileira do detalhe (dissolvição com deslize curto, sem cruzar o desenho)
                        const xl0 = xMid - w0 / 2, xl1 = sx0 - 14 - w0 * f1;
                        ctx.fillStyle = col;
                        if (k < 1) { ctx.globalAlpha = na * (1 - k); ctx.font = `700 ${F0}px Montserrat, Inter, sans-serif`; ctx.fillText(txt, xl0 - 40 * k, y0); }
                        if (k > 0) { ctx.globalAlpha = na * k; ctx.font = `700 ${(F0 * f1).toFixed(2)}px Montserrat, Inter, sans-serif`; ctx.fillText(txt, xl1 + 30 * (1 - k), y1); }
                    });
                    ctx.restore();
                }
            }
        }

        // ------------------------- controles -------------------------
        const btn = document.getElementById('top-play'), scrub = document.getElementById('top-scrub');
        // Keep the hidden timeline input for full-tour synchronization.

        function refresh() {
            draw();
            const T = A.t;
            scrub.value = T;
            btn.textContent = '↻ Replay';
        }
        function tick(now) {
            if (!A.playing) return;
            const dt = Math.min(0.1, (now - A.last) / 1000); A.last = now;
            const sp = (A.t >= 2 && A.t < 3) ? 3 : (A.t >= 4 && A.t < 5) ? 3 : 1;   // sem espera depois que bins/malas já apareceram
            A.t += dt * sp / STAGE_SEC;
            if (A.t >= A.stopAt) { A.t = A.stopAt; A.playing = false; }
            refresh();
            if (A.playing) A.raf = requestAnimationFrame(tick);
        }
        function play(from, stopAt) {
            if (from != null) A.t = from;
            A.stopAt = stopAt; A.playing = true; A.last = performance.now();
            cancelAnimationFrame(A.raf); A.raf = requestAnimationFrame(tick);
        }
        btn.addEventListener('click', () => { play(0, N_ST); refresh(); });
        scrub.addEventListener('input', () => { A.playing = false; A.t = parseFloat(scrub.value); refresh(); });

        new ResizeObserver(() => refresh()).observe(stage);
        new IntersectionObserver(es => {
            if (es[0].isIntersecting && !A.started && stage.getBoundingClientRect().width > 0) {
                A.started = true;
                if (reduced) { A.t = N_ST; refresh(); } else play(0, N_ST);
            }
        }, { threshold: 0.3 }).observe(stage);
        // roteiro (aba 8): zera sem autoplay do IntersectionObserver e inicia uma única vez (evita começar, parar e reiniciar)
        window.topTourReset = () => { A.started = true; A.playing = false; cancelAnimationFrame(A.raf); A.t = 0; refresh(); };
        window.topTourStart = () => { A.started = true; if (!A.playing) play(0, N_ST); };
        // Simulação Completa: posiciona a linha do tempo (sem tocar), toca a partir de um instante e informa onde fica o 1º módulo de bins
        window.topTourSet = (t, ov) => { A.started = true; A.playing = false; cancelAnimationFrame(A.raf); A.t = t; A.detOut = 0; A.ov = ov ? Object.assign({}, ov) : null; A.names = true; refresh(); };
        window.topSetOv = ov => { A.ov = ov ? Object.assign({}, ov) : null; draw(); };
        window.topTourEnd = () => { A.ov = null; A.names = false; A.detOut = 0; A.binA = 1; };
        window.topTourStartAt = t => { A.started = true; play(t, N_ST); };
        window.topSetDetOut = v => { A.detOut = v; draw(); };
        window.topSetBinA = v => { A.binA = v; draw(); };
        window.topModules = () => {   // retângulos do 1º módulo Alpha (acima do eixo) e Conventional (abaixo), em px do canvas
            const L = A.lay; if (!L) return null;
            const cm = c => c * L.s / 100, x0 = L.X0 + 4.2 * L.s, y = L.cy + L.shift;
            return { alpha: { x: x0, y: y - cm(123.9), w: cm(127.6), h: cm(123.9 - 53.8) },
                     conv: { x: x0, y: y + cm(51.7), w: cm(180.47), h: cm(125.5 - 51.7) },
                     axisY: y, noseX: L.X0, canvas: cv };
        };
        window.topTourDone = () => A.t >= 5.8;   // selo "+25% CAPACITY" e propagação já visíveis
        refresh();
    })();
    