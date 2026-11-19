        function drawCADCanvas(g, opts) {
            opts = opts || {};
            const T = opts.T != null ? opts.T : cadAnim.t;
            const dimFade = opts.dimFade != null ? opts.dimFade : 1;
            const FD = Object.assign({ conv: 1, alpha: 1, arc: 1, dims: 1 }, opts.fade || {});   // Simulação Completa: cada parte entra no seu tempo
            const faded = (a, fn) => { if (a >= 0.999) return fn(); ctx.save(); ctx.globalAlpha *= Math.max(0, a); try { return fn(); } finally { ctx.restore(); } };
            const S = i => cadEase(Math.min(1, Math.max(0, (T - i) / 0.85)));
            // cota animada: k<6 -> etapa 4 (escalonadas); k==6 -> etapa 2 (diâmetro)
            const cadDim = (k, ctx, x1, y1, x2, y2, lbl, col, fs, off, e1, e2) => {
                // A aba 5 tem cotas próprias do assento e das folgas até os bins;
                // não reutilizar nela a profusão de cotas da prancha CAD 2D.
                if (opts.minimalDims) return;
                const p = k === 6 ? S(1) : cadEase(Math.min(1, Math.max(0, (T - 2 - k * 0.1) / 0.5)));
                const fade = (k <= 4) ? 1 : dimFade;
                if (p <= 0 || fade <= 0) return;
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = e => e && { x1: e.x1, y1: e.y1, x2: e.x1 + (e.x2 - e.x1) * p, y2: e.y1 + (e.y2 - e.y1) * p };
                ctx.save(); ctx.globalAlpha = Math.min(1, p * 1.6) * fade * FD.dims;
                drawDimensionLine(ctx, mx + (x1 - mx) * p, my + (y1 - my) * p, mx + (x2 - mx) * p, my + (y2 - my) * p, lbl, col, fs, off, L(e1), L(e2));
                ctx.restore();
            };
            // mala: cai de cima com leve "quique"
            const cadBag = (k, ctx, cx, cy, w, h, ang, l1, l2, isA, col) => {
                if (opts.noBags) return;
                const s = Math.min(1, Math.max(0, (T - 3 - k * 0.2) / 0.6));
                if (s <= 0) return;
                const c1 = 1.70158, c3 = c1 + 1, e = s >= 1 ? 1 : 1 + c3 * Math.pow(s - 1, 3) + c1 * Math.pow(s - 1, 2);
                ctx.save(); ctx.globalAlpha = Math.min(1, s * 3);
                drawRealisticSuitcase(ctx, cx, cy - (1 - Math.min(e, 1)) * 26, w * e, h * e, ang, l1, l2, isA, col);
                ctx.restore();
            };
            const canvas = opts.canvas || document.getElementById(opts.canvasId || 'cadCanvas');
            if (!canvas) return;
            const rect = (opts.width && opts.height) ? { width: opts.width, height: opts.height } : canvas.parentElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const dpr = opts.dpr || window.devicePixelRatio || 1;
            const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
            }
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const W = rect.width, H = rect.height;
            ctx.clearRect(0, 0, W, H);
            if (opts.bgFill) {
                ctx.fillStyle = opts.bgFill;
                ctx.fillRect(0, 0, W, H);
            } else if (opts.unifiedCabinBackground) {
                // Apenas a Aba 5 individual usa o quadriculado CSS sob o canvas.
                // O tour conserva sua própria malha; os demais usos mantêm o fundo original.
                drawUnifiedCabinBackground(ctx, W, H, {
                    tour: !!opts.tourBackdrop, paint: !opts.cssGridBackdrop
                });
            }

            const xMin = -(g.R + 4);
            const xMax = (g.R + 4);
            const yMin = 18, yMax = g.R + 16;

            const padL = 46, padR = 28, padT = 28, padB = 42;
            const plotW = W - padL - padR, plotH = H - padT - padB;
            let scale = Math.min(plotW / (xMax - xMin), plotH / (yMax - yMin));
            let toX = (x) => padL + (x - xMin) * scale;
            let toY = (y) => H - padB - (y - yMin) * scale;
            if (opts.map) ({ toX, toY, scale } = opts.map(W, H));
            ctx.save();
            if(opts.camera){const c=opts.camera(W,H);if(c){ctx.translate(W/2,H/2);ctx.scale(c.k,c.k);ctx.translate(-c.x,-c.y);}}
            if (opts.before) opts.before(ctx, { W, H, toX, toY, scale });

            if (!opts.noGrid) {
            // Grid técnico CAD (a cada 10")
            ctx.strokeStyle = APHA_BLUEPRINT.grid;
            ctx.lineWidth = 1;
            ctx.fillStyle = '#64748b';
            ctx.font = '9.5px "JetBrains Mono", monospace';

            for (let xi = -50; xi <= 50; xi += 10) {
                const sx = toX(xi * CM_PER_IN);
                ctx.beginPath(); ctx.moveTo(sx, padT); ctx.lineTo(sx, H - padB); ctx.stroke();
                ctx.fillText(`${xi === 0 ? '0' : Math.abs(xi) + '"'}`, sx - 12, H - padB + 15);
            }
            for (let yi = 10; yi * CM_PER_IN <= yMax; yi += 10) {
                const sy = toY(yi * CM_PER_IN);
                ctx.beginPath(); ctx.moveTo(padL, sy); ctx.lineTo(W - padR, sy); ctx.stroke();
                ctx.fillText(`${yi}"`, 8, sy + 3);
            }

            }

            // Eixo de Simetria Central e Vão Livre do Corredor (20" = -10" a +10") — limitados ao piso (y = -62.84)
            const yTopGrid = toY(g.R + 14);
            const yFloorLine = toY(-62.84);
            ctx.save();
            ctx.setLineDash([5, 5]); ctx.globalAlpha = S(0) * FD.arc;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(toX(0), yTopGrid); ctx.lineTo(toX(0), yFloorLine); ctx.stroke();
            ctx.restore();

            ctx.fillStyle = 'rgba(42, 29, 194, 0.05)';
            ctx.save(); ctx.globalAlpha = S(1) * FD.arc; ctx.fillRect(toX(-g.x_livre), yTopGrid, toX(g.x_livre) - toX(-g.x_livre), yFloorLine - yTopGrid); ctx.restore();

            // Parede dupla (semicírculo): varredura da esquerda para a direita
            {
                const p = S(0), R_ext = g.R + 5.5, N = 90, th1 = Math.PI * (1 - p);
                const pt = (r, th) => [toX(r * Math.cos(th)), toY(r * Math.sin(th))];
                const th = i => Math.PI - (Math.PI - th1) * i / N;
                if (p > 0 && FD.arc > 0.001) {
                    ctx.save(); ctx.globalAlpha *= FD.arc; ctx.beginPath();
                    for (let i = 0; i <= N; i++) { const [x, y] = pt(g.R, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
                    for (let i = N; i >= 0; i--) { const [x, y] = pt(R_ext, th(i)); ctx.lineTo(x, y); }
                    ctx.closePath();
                    ctx.fillStyle = APHA_CABIN_PALETTE.rgba('shellFill', 0.35); ctx.fill();
                    ctx.strokeStyle = APHA_CABIN_PALETTE.shellOutline; ctx.lineWidth = 2.5;
                    [g.R, R_ext].forEach(rr => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = pt(rr, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
                    if (p < 1) { const [x, y] = pt(g.R + 2.75, th1); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = '#2a1dc2'; ctx.fill(); }
                    ctx.restore();
                }
            }

            const scaleFactor = (g.R / 137.16);
            const yTopApex = Math.sqrt(Math.max(0, g.R * g.R - g.x_livre * g.x_livre));

            // Cores por modelo (malas e cotas)
            const COR_CONV = '#494e75';
            const COR_ALPHA = '#5952b2';

            // Legendas acima de cada modelo
            if (!opts.noLegend) {
                ctx.save();
                ctx.globalAlpha = S(1); ctx.font = 'bold 20px "JetBrains Mono", monospace';
                ctx.textBaseline = 'middle';
                const yLeg = 26;
                [['CONVENTIONAL MODEL', 20, 'left', COR_CONV], ['ALPHA MODEL', W - 20, 'right', COR_ALPHA]].forEach(([txt, xp, align, cor]) => {
                    ctx.textAlign = align;
                    ctx.lineWidth = 5.0;
                    ctx.strokeStyle = 'rgba(245, 245, 245, 0.92)';
                    ctx.strokeText(txt, xp, yLeg);
                    ctx.fillStyle = cor;
                    ctx.fillText(txt, xp, yLeg);
                });
                ctx.restore();
            }

            // =========================================================================
            // LADO ESQUERDO: MODELO CONVENCIONAL EMBRAER (Largura 35", Altura 22,5")
            // =========================================================================
            if (opts.referenceBins) { ctx.save(); ctx.globalAlpha = 0; }
            const yPsuEmb = yTopApex - 22.5 * CM_PER_IN * scaleFactor;
            const clipBin = (sg) => { const a = toX(sg * g.x_livre) - sg * 4, b = toX(sg * (g.R + 6)), e = a + (b - a) * S(1); ctx.beginPath(); ctx.rect(Math.min(a, e), 0, Math.abs(e - a), H); ctx.clip(); };
            ctx.save(); clipBin(-1);
            const embProf = faded(FD.conv, () => traceEmbraerBinProfile(ctx, toX, toY, g.x_livre, yPsuEmb, -1, g.R, 0.0, true));
            ctx.restore();

            cadBag(0, ctx,
                toX(embProf.bagCx),
                toY(embProf.bagCy),
                embProf.bagW * scale,
                embProf.bagH * scale,
                embProf.bagAngleRad,
                'IATA standard',
                '',
                false,
                COR_CONV
            );

            // =========================================================================
            // LADO DIREITO: OVERHEAD BIN ALPHA (Largura 35", Altura de 20" a 25")
            // =========================================================================
            const yBottomAlpha = yTopApex - 20.0 * CM_PER_IN * scaleFactor;
            ctx.save(); clipBin(1);
            const alphaProf = faded(FD.alpha, () => traceBinAlphaProfile(ctx, toX, toY, g.x_livre, yBottomAlpha, 1, scaleFactor, g.R, 0.0));
            ctx.restore();

            // Na aba 5, os bins CAD de referência são desenhados logo abaixo.
            // Não desenhar malas do perfil legado atrás da cavidade do Alpha:
            // ao abrir a porta, esses contornos apareciam através do interior.
            if (!opts.referenceBins) {
            cadBag(1, ctx,
                toX(alphaProf.m1Cx),
                toY(alphaProf.m1Cy),
                alphaProf.m1W * scale,
                alphaProf.m1H * scale,
                0,
                'IATA standard',
                '',
                true,
                COR_ALPHA
            );

            cadBag(2, ctx,
                toX(alphaProf.m2Cx),
                toY(alphaProf.m2Cy),
                alphaProf.m2W * scale,
                alphaProf.m2H * scale,
                alphaProf.rad17,
                'IATA standard',
                '',
                true,
                COR_ALPHA
            );

            }

            // =========================================================================
            // Tab 5 only: restore canvas and paint the newly integrated CAD bins.
            if (opts.referenceBins) {
                ctx.restore();
                if (window.drawUniReferenceBins) window.drawUniReferenceBins(ctx, W, H, FD.conv * S(1), FD.alpha * S(1));
            }
            // COTAS TÉCNICAS EXTERNAS DOS BINS (35" LARGURA, 22,5" CONV., 20" E 25" ALPHA)
            // Posicionadas pelo lado de fora da fuselagem para limpar o interior
            // =========================================================================
            const xCorIn = g.x_livre;                    // 10" (25.4 cm)
            const xOutIn = g.x_livre + 35.0 * CM_PER_IN; // 45" (114.3 cm)

            // 1. Cota de largura do Bin Convencional Esquerdo: 35" (Acima da fuselagem)
            const yDimTopW = g.R + 13.0;
            cadDim(0, ctx,
                toX(-xOutIn), toY(yDimTopW),
                toX(-xCorIn), toY(yDimTopW),
                '35"', COR_CONV, 14, {x: 0, y: -14},
                {x1: toX(-xOutIn), y1: toY(yPsuEmb), x2: toX(-xOutIn), y2: toY(yDimTopW + 3.0)},
                {x1: toX(-xCorIn), y1: toY(yTopApex), x2: toX(-xCorIn), y2: toY(yDimTopW + 3.0)}
            );

            // 2. Cota de altura do Bin Convencional Esquerdo: 22,5" (Fora da fuselagem à esquerda)
            const xDimLeftH = -(g.R + 16.0);
            cadDim(1, ctx,
                toX(xDimLeftH), toY(yPsuEmb),
                toX(xDimLeftH), toY(yTopApex),
                '22.5"', COR_CONV, 13, {x: -24, y: 0},
                {x1: toX(-xOutIn), y1: toY(yPsuEmb), x2: toX(xDimLeftH - 3.0), y2: toY(yPsuEmb)},
                {x1: toX(-xCorIn), y1: toY(yTopApex), x2: toX(xDimLeftH - 3.0), y2: toY(yTopApex)}
            );

            // 3. Cota de altura frontal do Bin Alpha (Direito): 20" (Fora da fuselagem à direita, interna)
            const xDimAlpha20 = g.R + 14.0;
            cadDim(2, ctx,
                toX(xDimAlpha20), toY(yBottomAlpha),
                toX(xDimAlpha20), toY(yTopApex),
                '20"', COR_ALPHA, 13, {x: -18, y: 0},
                {x1: toX(xCorIn), y1: toY(yBottomAlpha), x2: toX(xDimAlpha20 + 2.5), y2: toY(yBottomAlpha)},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xDimAlpha20 + 2.5), y2: toY(yTopApex)}
            );

            // 4. Cota de altura máxima do Bin Alpha (Direito): 25" (Fora da fuselagem à direita, externa)
            const xDimAlpha25 = g.R + 28.0;
            cadDim(3, ctx,
                toX(xDimAlpha25), toY(alphaProf.yLowest),
                toX(xDimAlpha25), toY(yTopApex),
                '25"', COR_ALPHA, 14, {x: 20, y: 0},
                {x1: toX(alphaProf.xRampEnd), y1: toY(alphaProf.yLowest), x2: toX(xDimAlpha25 + 2.5), y2: toY(alphaProf.yLowest)},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xDimAlpha25 + 2.5), y2: toY(yTopApex)}
            );

            // 5. Cota de largura do Bin Alpha (Direito): 35" (Acima da fuselagem)
            cadDim(4, ctx,
                toX(xCorIn), toY(yDimTopW),
                toX(xOutIn), toY(yDimTopW),
                '35"', COR_ALPHA, 14, {x: 0, y: -14},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xCorIn), y2: toY(yDimTopW + 3.0)},
                {x1: toX(xOutIn), y1: toY(alphaProf.yOuterTip), x2: toX(xOutIn), y2: toY(yDimTopW + 3.0)}
            );

            // 6. Cota do Corredor Central: 20" (de -10" a +10")
            const yDimCorridor = 14.8 * CM_PER_IN;
            if (!opts.finalDims) cadDim(5, ctx,
                toX(-xCorIn), toY(yDimCorridor),
                toX(xCorIn), toY(yDimCorridor),
                '20"', '#0f3c68', 14, {x: 0, y: 15},
                {x1: toX(-xCorIn), y1: toY(yDimCorridor + 3.2), x2: toX(-xCorIn), y2: toY(yDimCorridor - 3.2)},
                {x1: toX(xCorIn), y1: toY(yDimCorridor + 3.2), x2: toX(xCorIn), y2: toY(yDimCorridor - 3.2)}
            );

            // 7. Cota do Diâmetro Interno da Fuselagem: Ø 108" (2R)
            const yDimDiam = g.R + 11.5;
            const diamIn = (2 * g.R / CM_PER_IN);
            const diamTxt = 'Ø ' + diamIn.toFixed(2).replace(/\.?0+$/, '') + '"';
            if (!opts.finalDims) {
            ctx.save();
            ctx.setLineDash([4, 4]); ctx.globalAlpha = S(1) * dimFade * FD.dims;
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
            ctx.lineWidth = 1.0;
            [-g.R, g.R].forEach(xe => {
                ctx.beginPath();
                ctx.moveTo(toX(xe), toY(yDimDiam + 1.5));
                ctx.lineTo(toX(xe), toY(yMin));
                ctx.stroke();
            });
            ctx.restore();
            cadDim(6, ctx,
                toX(-g.R), toY(yDimDiam),
                toX(g.R), toY(yDimDiam),
                diamTxt, '#1e293b', 15, {x: 0, y: 0}
            );
            }

            if (opts.after) opts.after(ctx, { W, H, toX, toY, scale, g, yTopApex });
            ctx.restore();
        }
