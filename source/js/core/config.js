

        // Cores da apresentação são declaradas no CSS global. Este adaptador
        // lê os mesmos valores para renderização Canvas, exportação e Tailwind.
        // O <style> principal é carregado antes deste script no <head>.
        const APHA_STYLE = getComputedStyle(document.documentElement);
        function aphaThemeColor(token) {
            const value = APHA_STYLE.getPropertyValue('--apha-' + token).trim();
            if (!value) throw new Error('Missing CSS palette token: --apha-' + token);
            return value;
        }
        const APHA_CABIN_PALETTE = (() => {
            const base = {
                background: aphaThemeColor('bg'),
                panel: aphaThemeColor('panel'),
                border: aphaThemeColor('border'),
                cyan: aphaThemeColor('cyan'),
                mid: aphaThemeColor('mid'),
                neutral: aphaThemeColor('neutral'),
                muted: aphaThemeColor('muted'),
                text: aphaThemeColor('text'),
                darkOutline: aphaThemeColor('dark-outline'),
                binOutline: aphaThemeColor('bin-outline'),
                binCavity: aphaThemeColor('bin-cavity'),
                shellFill: aphaThemeColor('shell-fill'),
                shellOutline: aphaThemeColor('shell-outline'),
                floorFill: aphaThemeColor('floor-fill'),
                floorOutline: aphaThemeColor('floor-outline')
            };
            const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
            const rgba = (key, alpha) => 'rgba(' + rgb(base[key]).join(',') + ',' + alpha + ')';
            return Object.freeze({
                ...base, rgb, rgba,
                bgRGB: rgb(base.background),
                ramp: [
                    [0, rgb(base.mid)], [0.28, rgb(base.mid)],
                    [0.55, rgb(base.neutral)], [0.85, rgb(base.neutral)],
                    [0.97, rgb(base.muted)], [1, rgb(base.muted)]
                ]
            });
        })();
        window.APHA_CABIN_PALETTE = APHA_CABIN_PALETTE;
        // Blueprint físico único. A grade acompanha o referencial da cabine
        // em vez de ser redesenhada com passo/cor distintos na Aba 5 e Aba 6.
        const APHA_BLUEPRINT = Object.freeze({
            background: APHA_CABIN_PALETTE.background,
            grid: aphaThemeColor('grid'),
            gridStepCm: 10 * 2.54
        });
        window.APHA_BLUEPRINT = APHA_BLUEPRINT;
        function drawAphaCabinGrid(ctx, toX, toY) {
            const step = APHA_BLUEPRINT.gridStepCm;
            ctx.save();
            ctx.strokeStyle = APHA_BLUEPRINT.grid;
            ctx.lineWidth = 1;
            for (let i = -7; i <= 7; i++) {
                const x = toX(i * step);
                ctx.beginPath(); ctx.moveTo(x, toY(-8));
                ctx.lineTo(x, toY(225)); ctx.stroke();
            }
            for (let i = 0; i <= 8; i++) {
                const y = toY(i * step);
                ctx.beginPath(); ctx.moveTo(toX(-180), y);
                ctx.lineTo(toX(180), y); ctx.stroke();
            }
            ctx.restore();
        }
        window.drawAphaCabinGrid = drawAphaCabinGrid;
        // Fonte única do background da seção transversal, do manikin e da
        // ponte de câmera. No tour, #tour-stage já pinta cor + grid fixos.
        function drawUnifiedCabinBackground(ctx, W, H, opts = {}) {
            if (opts.tour) return;
            if (opts.paint !== false) {
                ctx.save();
                ctx.fillStyle = APHA_BLUEPRINT.background;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
            }
            if (typeof opts.toX === 'function' && typeof opts.toY === 'function') {
                drawAphaCabinGrid(ctx, opts.toX, opts.toY);
            }
        }
        window.drawUnifiedCabinBackground = drawUnifiedCabinBackground;
        // Helpers numericos de uso comum nas Abas 5 e 6.
        // Smoothstep ergonomico permanece distinto do easing cubico.
        const aphaClamp01 = value => Math.max(0, Math.min(1, value));
        const aphaEaseCubic = value => {
            const x = aphaClamp01(value);
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        };
        // Dimensões físicas compartilhadas pela projeção m4 (centímetros).
        const APHA_CABIN_GEOMETRY = Object.freeze({
            fuselageRadiusCm: 137.16, fuselageCenterYCm: 62.84,
            shellThicknessCm: 5.5, aisleHalfWidthCm: 25.4,
            floorWidthCm: 252, floorThicknessCm: 8
        });
        window.APHA_CABIN_GEOMETRY = APHA_CABIN_GEOMETRY;
        // Primitiva unica do piso fisico em cm: completa (progress=1)
        // ou revelada do centro durante o take da Aba 5 (0..1).
        function drawAphaCabinFloor(ctx, toX, toY, scale, progress = 1) {
            const widthCm = APHA_CABIN_GEOMETRY.floorWidthCm * progress;
            const heightCm = APHA_CABIN_GEOMETRY.floorThicknessCm;
            ctx.fillStyle = APHA_CABIN_PALETTE.floorFill;
            ctx.strokeStyle = APHA_CABIN_PALETTE.floorOutline;
            ctx.lineWidth = 1.8;
            ctx.fillRect(toX(-widthCm / 2), toY(0), widthCm * scale, heightCm * scale);
            ctx.strokeRect(toX(-widthCm / 2), toY(0), widthCm * scale, heightCm * scale);
        }
        // Linha do tempo VISUAL normalizada pelo mesmo phase (0..1) do motor biomecânico.
        // Altere tempos/durações em segundos aqui; a postura, a cinemática e o cronômetro
        // continuam usando os valores físicos originais, sem relógios paralelos.
        const APHA_CINE_TIMELINE = Object.freeze({
            duration: 10.0,
            doorOpen: { start: 0, end: 1.0 },
            doorClose: { start: 9.6, end: 10.0 },
            enter: { start: .24, end: 1.16, travelPx: 18, minAlpha: .45 },
            dolly: { start: .10, end: 2.75, reverseStart: 7.75, reverseEnd: 9.72,
                     zoom: 1.17, panX: -.057, panY: .072 },
            lowAngle: { start: 3.12, end: 4.30, reverseStart: 6.45, reverseEnd: 7.70,
                        zoom: 1.30, panX: -.122, panY: .127, shearX: -.021, shearY: .019 },
            settle: { startPhase: .82, durationPhase: .14, amplitudePx: 2.8 }
        });
        window.APHA_CINE_TIMELINE = APHA_CINE_TIMELINE;
        // Parâmetros de câmera única m4 (abas 5/6) e figura isolada.
        const APHA_BRIDGE_CFG = Object.freeze({
            zoomInMs: 0, doorMs: 0, zoomOutMs: 1580, handoffMs: 480,
            startZoom: 1.72, closeZoom: 2.04, binFocusYcm: 173,
            startOffsetSeconds: 0.5,
            uiFadeMs: 280, figurePhase: .83, figureScale: 3,
            figureW: 1060, figureH: 760, figureMargin: 22
        });
        window.APHA_BRIDGE_CFG = APHA_BRIDGE_CFG;
        // Atrasos relativos à estabilização dos objetos no primeiro quadro CAD.
        const APHA_INTRO_CFG = Object.freeze({
            crossfadeMs: 520, titleDelayMs: 180, legendDelayMs: 610,
            measuresDelayMs: 1020, descriptionDelayMs: 1460, fadeMs: 560,
            sequenceHoldMs: 2250
        });
        window.APHA_INTRO_CFG = APHA_INTRO_CFG;
        // Adaptador visual exigido pelo Tailwind CDN; CSS permanece a fonte das cores.
@@APHA_INCLUDE:source/js/core/tailwind-theme.js@@
