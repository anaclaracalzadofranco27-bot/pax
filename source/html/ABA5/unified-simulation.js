        // -------------------------------------------------------------------------
        // MÓDULO 8: SIMULAÇÃO INTEGRADA (aba 1 → cabine/piso → bancos/passageiros → estatura)
        // -------------------------------------------------------------------------
        (function () {
            const FC = APHA_CABIN_GEOMETRY.fuselageCenterYCm; // centro da fuselagem acima do piso (cm)
            // ---- Paleta lilás/roxa só nesta aba: enquanto BIN_SOLID está ativo (só durante o desenho da Simulação Integrada e da sua exportação), cinzas-azulados viram lilás ----
            // Filtros Canvas registrados uma unica vez no motor compartilhado.
            const UNI_CAD_SEC = 0.4;                            // velocidade da construção da seção do bin nesta aba (a aba CAD 2D segue com CAD_STAGE_SEC)
            const P1 = UNI_CAD_SEC * 4;                         // 1,6 s: contorno CAD 2D (bins surgem junto com a cota Ø 108")
            const TL = { ring: P1, floor: P1 + 0.6, seats: P1 + 1.1, pax: P1 + 1.6, stat: P1 + 2.3, dur: 3.4 };
            TL.pause=TL.stat+TL.dur; TL.zoom=TL.pause+0.5; TL.zoomDur=1.15; TL.open=TL.zoom+TL.zoomDur; TL.openDur=1.2;
            const TOTAL=TL.open+TL.openDur;
            document.getElementById('uni-scrub').max = TOTAL;
            const PH = [['CAD 2D Outline', 0], ['Fuselage + floor', TL.ring], ['Seats + passengers', TL.seats], ['Stature variation', TL.stat], ['Door envelopes', TL.zoom]];
            const U = { t: 0, playing: false, last: 0, raf: 0, started: false, g: null };
            const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
            const ph=(t0,d)=>cadEase(cl((U.t-t0)/d));
            const cubic=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
            const cameraAmount=()=>U.exportCabinWideFrame ? 0 : cubic((U.t-TL.zoom)/TL.zoomDur);
            const doorAmount=()=>cubic((U.t-TL.open)/TL.openDur);
            const cinematicCamera=(W,H)=>{const a=cameraAmount(),k=1+(APHA_BRIDGE_CFG.startZoom-1)*a,cy=m4(W,H).toY(APHA_BRIDGE_CFG.binFocusYcm);return {k,x:W/2,y:H/2+(cy-H/2)*a}};
            
            // Snapshot da câmera REAL da Aba 5 para a emenda com a Aba 6.
            window.uniCameraState = (W,H) => cinematicCamera(W,H);
            const YMIN = -14;                                   // enquadra apenas do piso para cima (sem porão)
            const m4 = (W, H) => { const sc = Math.min((W - 60) / 380, (H - 50) / (230 - YMIN)), cx = W / 2; return { toX: x => cx + x * sc, toY: y => H - 22 - (y - YMIN) * sc, scale: sc }; };
            // Referência geométrica compartilhada entre a Aba 5 e a cena biomecânica da Aba 6.
            // A projeção m4 é a mesma usada na planta integrada: y=0 é o piso, em centímetros.
            window.cabinSectionReference = {
                map: m4,
                R: APHA_CABIN_GEOMETRY.fuselageRadiusCm,
                centerY: APHA_CABIN_GEOMETRY.fuselageCenterYCm,
                wall: APHA_CABIN_GEOMETRY.shellThicknessCm,
                aisle: APHA_CABIN_GEOMETRY.aisleHalfWidthCm,
                drawShell(ctx, toX, toY, scale) {
                    const R = this.R, rOut = R + this.wall, cY = this.centerY;
                    const aEnd = Math.asin(cY / R), N = 180;
                    const theta = i => Math.PI + aEnd - (Math.PI + 2 * aEnd) * i / N;
                    // Mesma curvatura da seção CAD e os mesmos prolongamentos laterais
                    // usados em before() na Aba 5. Exterior inferior avança somente em x.
                    const pt = (r, a, outer = false) => [
                        toX(r * Math.cos(a)),
                        toY(cY + ((outer && Math.sin(a) < 0) ? R : r) * Math.sin(a))
                    ];
                    ctx.save();
                    ctx.beginPath();
                    for (let i = 0; i <= N; i++) {
                        const p = pt(R, theta(i));
                        i ? ctx.lineTo(...p) : ctx.moveTo(...p);
                    }
                    for (let i = N; i >= 0; i--) {
                        const p = pt(rOut, theta(i), true);
                        ctx.lineTo(...p);
                    }
                    ctx.closePath();
                    ctx.fillStyle = APHA_CABIN_PALETTE.rgba('shellFill', 0.35);
                    ctx.fill();
                    ctx.strokeStyle = APHA_CABIN_PALETTE.shellOutline;
                    ctx.lineWidth = 2.5;
                    [false, true].forEach(outer => {
                        ctx.beginPath();
                        for (let i = 0; i <= N; i++) {
                            const p = pt(outer ? rOut : R, theta(i), outer);
                            i ? ctx.lineTo(...p) : ctx.moveTo(...p);
                        }
                        ctx.stroke();
                    });
                    drawAphaCabinFloor(ctx, toX, toY, scale);
                    ctx.restore();
                }
            };
            const m1 = (W, H) => { const m = m4(W, H); return { toX: m.toX, toY: y => m.toY(y + FC), scale: m.scale }; };
            const phaseIdx = () => PH.reduce((a, p, i) => U.t >= p[1] ? i : a, 0);
            const stature = () => {
                if (U.customStature != null) return U.customStature;
                const u = cl((U.t - TL.stat) / TL.dur), MN = window.SEATED_STAT.min, MX = window.SEATED_STAT.max;
                return MN + (MX - MN) * (1 - Math.cos(Math.PI * u)) / 2;   // sobe do feminino ao masculino e para
            };

            const inTourView = () => !!document.querySelector('#tour-stage #uniCanvas');
            function before(ctx, m) {
                const { toX, toY, scale } = m4(m.W, m.H);   // eixo com y=0 no piso
                // A grade de fundo pertence ao .sim-bg na aba individual e ao
                // #tour-stage na Simulação Geral: não desenhar a grade física
                // recortada no centro da câmera sobre o mesmo canvas.
                const p = cl((U.t - TL.ring) / 0.8);          // trechos laterais da fuselagem até o piso (y=0), sem porão
                if (p > 0) {
                    const shellR = APHA_CABIN_GEOMETRY.fuselageRadiusCm;
                    const shellOuterR = shellR + APHA_CABIN_GEOMETRY.shellThicknessCm;
                    const aEnd = Math.asin(FC / shellR);
                    const N = 40;
                    [-1, 1].forEach(side => {
                        ctx.save(); ctx.beginPath();
                        for (let i = 0; i <= N; i++) {
                            const a = -aEnd * p * (i / N);
                            const x = side * shellR * Math.cos(a), y = FC + shellR * Math.sin(a);
                            i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y));
                        }
                        for (let i = N; i >= 0; i--) {
                            const a = -aEnd * p * (i / N);
                            const x = side * shellOuterR * Math.cos(a), y = FC + shellR * Math.sin(a);
                            ctx.lineTo(toX(x), toY(y));
                        }
                        ctx.closePath(); ctx.fillStyle = APHA_CABIN_PALETTE.rgba('shellFill', 0.35); ctx.fill();
                        ctx.strokeStyle = APHA_CABIN_PALETTE.shellOutline; ctx.lineWidth = 2.5;
                        [shellR, shellOuterR].forEach(rx => {   // só as duas paredes (sem a reta horizontal de emenda)
                            ctx.beginPath();
                            for (let i = 0; i <= N; i++) {
                                const a = -aEnd * p * (i / N);
                                const x = side * rx * Math.cos(a), y = FC + shellR * Math.sin(a);
                                i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y));
                            }
                            ctx.stroke();
                        });
                        ctx.restore();
                    });
                }
                const pf = ph(TL.floor, 0.6);                  // piso da cabine, abrindo a partir do centro
                if (pf > 0) {
                    drawAphaCabinFloor(ctx, toX, toY, scale, pf);
                }
            }

            // Chamada técnica ancorada na aresta real do encosto da janela.
            // A linha aponta para a inclinação desenhada; o texto fica horizontal.
            function drawSeatbackLeader(ctx,W,H,alpha) {
                if (alpha <= 0) return;
                const {toX,toY} = m4(W,H);
                const centerX = -99.5, seatW = 46;
                const bottom = {x:toX(centerX-seatW/2+1), y:toY(16*CM_PER_IN)};
                const top = {x:toX(centerX-seatW/2+4.5), y:toY(40*CM_PER_IN-12)};
                const dx=top.x-bottom.x, dy=top.y-bottom.y;
                if (Math.hypot(dx,dy) < 1) return;
                const anchor={x:bottom.x+dx*0.82, y:bottom.y+dy*0.82};
                // Patamar acima da cota de 40", para não cruzar sua linha vertical.
                const elbow={x:anchor.x-42, y:toY(40*CM_PER_IN+12)};
                const endX=elbow.x-66;
                ctx.save();
                ctx.globalAlpha *= alpha;
                ctx.strokeStyle = DIMENSION_COLOR;
                ctx.fillStyle = DIMENSION_COLOR;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(anchor.x,anchor.y);
                ctx.lineTo(elbow.x,elbow.y);
                ctx.lineTo(endX,elbow.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(anchor.x,anchor.y,2,0,2*Math.PI);
                ctx.fill();
                ctx.font = '11px "JetBrains Mono", monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.shadowColor = 'rgba(0,2,35,0.9)';
                ctx.shadowBlur = 3;
                ctx.fillText('Seatback reclines 20°',elbow.x-6,elbow.y-5);
                ctx.restore();
            }
            // Cotas da seção transversal compartilhadas com a exportação (PNG).
            // A altura geral 78.7" e a largura inferior 108" foram removidas.
            // As cotas dos bins e as folgas individuais permanecem em suas rotinas.
            function drawInteractiveStructureDims(ctx, W, H, alpha, lowerFade=1) {
                if (alpha <= 0) return;
                const { toX, toY } = m4(W, H);
                const R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;
                const centerY = APHA_CABIN_GEOMETRY.fuselageCenterYCm;
                const floorHalf = APHA_CABIN_GEOMETRY.floorWidthCm / 2;
                // X da face INTERNA do arco na altura exata da medida.
                const innerWallX = yCm => Math.sqrt(Math.max(0, R * R - (yCm - centerY) ** 2));
                const outsideGapCm = 8;
                ctx.save();
                ctx.globalAlpha *= alpha;

                drawDimensionLine(ctx,
                    toX(-25.4), toY(212), toX(25.4), toY(212),
                    '20"', DIMENSION_COLOR, 15, {x:0, y:-12});

                ctx.globalAlpha *= lowerFade;
                const seatDimY = 16.8 * CM_PER_IN;
                const seatWallX = innerWallX(seatDimY);
                const seatDimX = seatWallX + outsideGapCm;
                drawDimensionLine(ctx,
                    toX(seatDimX), toY(0), toX(seatDimX), toY(seatDimY),
                    '16.8"', DIMENSION_COLOR, 15, {x:22, y:0},
                    {x1:toX(floorHalf), y1:toY(0), x2:toX(seatDimX), y2:toY(0)},
                    {x1:toX(seatWallX), y1:toY(seatDimY), x2:toX(seatDimX), y2:toY(seatDimY)});

                const backDimY = 40.0 * CM_PER_IN;
                const backWallX = -innerWallX(backDimY);
                const backDimX = backWallX - outsideGapCm;
                drawDimensionLine(ctx,
                    toX(backDimX), toY(0), toX(backDimX), toY(backDimY),
                    '40.0"', DIMENSION_COLOR, 15, {x:-21, y:0},
                    {x1:toX(-floorHalf), y1:toY(0), x2:toX(backDimX), y2:toY(0)},
                    {x1:toX(backWallX), y1:toY(backDimY), x2:toX(backDimX), y2:toY(backDimY)});
                ctx.restore();
            }
                        function after(ctx, m) {
                const seats = ph(TL.seats, 0.6), pax = ph(TL.pax, 0.6), st = stature();
                window.drawSeatedScene(ctx, m.W, m.H, {
                    hAisle: st, hWin: st, backAng: window.SEATED_STAT.backAng, map: m4,
                    layers: { seats:seats*(1-cameraAmount()), pax:pax*(1-cameraAmount()), dims:seats*(1-cameraAmount()) }
                });
                // Cotas idênticas na visualização e no canvas de exportação.
                drawInteractiveStructureDims(ctx,m.W,m.H,seats,1-cameraAmount());
                const i = phaseIdx();
                ctx.save(); ctx.font = 'bold 13px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#434697';
                if (!U.exporting && !inTourView()) ctx.fillText(`PHASE ${i + 1}/${PH.length} — ${PH[i][0].toUpperCase()}`, 16, m.H - 14); ctx.restore();
            }

            function refresh() {
                U.g = U.g || computeAllGeometries();
                const uniSection = document.getElementById('module-unified');
                if (uniSection) uniSection.classList.toggle('uni-bin-zoom', U.t >= TL.zoom);
                const T1=Math.min(4,U.t/UNI_CAD_SEC);
                if(U.playing && U.t<TL.open)window.__uniRefDoorProgress=0;
                if(U.t>=TL.open)window.__uniRefDoorProgress=doorAmount();
                const slider=document.getElementById('uni-bin-door-slider'),pct=document.getElementById('uni-bin-door-pct');
                if(U.t>=TL.open){if(slider)slider.value=Math.round(100*window.__uniRefDoorProgress);if(pct)pct.textContent=Math.round(100*window.__uniRefDoorProgress)+'%'}
                window.BIN_SOLID = true; window.BIN_DARK = true;   // paleta escura (#5b7b9e · #9ba9b5 · #bababa, poltronas #2f4a6b) também na tela
                try {
                    drawCADCanvas(U.g, { canvasId: 'uniCanvas',
                        unifiedCabinBackground: true, tourBackdrop: inTourView(),
                        cssGridBackdrop: !inTourView(),  // Aba 5 individual: canvas transparente sobre .sim-bg
                        noLegend: inTourView(), T: T1, map: m1, camera:cinematicCamera, fade: U.fx || null, before, after });
                    if (U.focus > 0) {   // foco no passageiro da janela (ponta esquerda): o resto do desenho cai para ~18% de opacidade (a malha do quadro não muda)
                        const cvs = document.getElementById('uniCanvas'), box = cvs.parentElement, W = box.offsetWidth, H = box.offsetHeight;
                        const m = m4(W, H), g2 = cvs.getContext('2d'), dpr = cvs.width / Math.max(1, W);
                        const head = 40.64 + stature() * 0.51 * Math.cos(window.SEATED_STAT.backAng * Math.PI / 180);
                        // recorte no formato do passageiro + poltrona (corpo largo até o encosto, cabeça mais estreita), sem pegar a parede nem o piso
                        const hole = [[-125.7, 0], [-125.7, 101], [-115, 101], [-115, head + 5], [-84, head + 5], [-84, 101], [-72.8, 101], [-72.8, 0]];
                        g2.save(); g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.globalCompositeOperation = 'destination-out';
                        g2.fillStyle = `rgba(0,0,0,${(0.82 * U.focus).toFixed(3)})`;
                        g2.beginPath(); g2.rect(0, 0, W, H);
                        hole.forEach(([x, y], i) => i ? g2.lineTo(m.toX(x), m.toY(y)) : g2.moveTo(m.toX(x), m.toY(y))); g2.closePath();
                        g2.fill('evenodd');
                        g2.restore();
                    }
                    // A anotação entra depois do mascaramento de foco,
                    // portanto nunca fica atrás do passageiro à esquerda.
                    const cv=document.getElementById('uniCanvas');
                    const parent=cv&&cv.parentElement;
                    if(parent){
                        const rect=parent.getBoundingClientRect();
                        if(rect.width>0&&rect.height>0){
                            const ctx=cv.getContext('2d');
                            ctx.save();
                            ctx.setTransform(cv.width/rect.width,0,0,
                                cv.height/rect.height,0,0);
                            drawSeatbackLeader(ctx,rect.width,rect.height,ph(TL.seats,0.6)*(1-cameraAmount()));
                            ctx.restore();
                        }
                    }
                } finally { window.BIN_SOLID = false; window.BIN_DARK = false; }
                const ico = U.playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : (U.t >= TOTAL - 0.01 ? '<path d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z"/>' : '<path d="M7 4l13 8-13 8z"/>');
                document.getElementById('uni-play').innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">${ico}</svg>${U.playing ? 'Pause' : (U.t >= TOTAL - 0.01 ? 'Replay' : 'Play')}`;
                document.getElementById('uni-scrub').value = U.t;
                gaugeUpdate();
                {   // roteiro/vídeo: a escala de estatura é ampliada junto com o quadro (referência: 1920 px de largura)
                    const mod = document.getElementById('module-unified'), asd = mod && mod.querySelector('aside');
                    if (asd) asd.style.transform = (mod.closest('#tour-stage') && mod.clientWidth) ? `scale(${(1.113 * mod.clientWidth / 1920).toFixed(4)})` : '';
                }
                {   // roteiro/vídeo: "* Approximate values" no rodapé do quadro, ao lado do canto inferior direito
                    const mod = document.getElementById('module-unified'), asd = mod && mod.querySelector('aside');
                    const note = asd && asd.querySelector('.uni-note'), stg = mod && mod.closest('#tour-stage');
                    if (note) {
                        if (stg && stg.offsetWidth && asd.offsetWidth) {
                            const sr = stg.getBoundingClientRect(), ar = asd.getBoundingClientRect();
                            const ks = sr.width / stg.offsetWidth, sc = ar.width / asd.offsetWidth;
                            note.style.marginTop = '0';
                            note.style.right = ((ar.right - (sr.right - 50 * ks)) / sc) + 'px';
                            note.style.top = (((sr.bottom - 30 * ks) - ar.top) / sc - note.offsetHeight / 2) + 'px';
                        } else { note.style.right = ''; note.style.top = ''; note.style.marginTop = ''; }
                    }
                }
                const act = phaseIdx();
            }

            // ---- Barra vertical de estatura + marcos (percentil feminino → média mundial → percentil masculino) ----
            const G_LO = 145, G_HI = 195, WORLD_MEAN_CM = 165;      // média mundial ≈ (159 F + 171 M) / 2
            const MARKS = [
                { id: 'f', cm: window.SEATED_STAT.min, name: 'P5 Female', col: '#6d90b8' },
                { id: 'w', cm: WORLD_MEAN_CM, name: 'P50 World', col: '#9ba9b5' },
                { id: 'm', cm: window.SEATED_STAT.max, name: 'P95 Male', col: '#d4dce6' }
            ];
            const gp = cm => cl((cm - G_LO) / (G_HI - G_LO)) * 100;
            const dec = v => v.toFixed(1);
            const gEl = document.getElementById('uni-gauge');
            gEl.innerHTML =
                '<div style="position:absolute;left:58px;top:0;bottom:0;width:14px;border-radius:7px;background:#0a1a3a;border:1px solid #5b7b9e"></div>' +
                '<div id="uni-g-fill" style="position:absolute;left:58px;bottom:0;width:14px;border-radius:7px;background:#5b7b9e;opacity:.95;height:0"></div>' +
                [59, 63, 67, 71, 75].map(v => `<div style="position:absolute;left:0;width:50px;bottom:${gp(v * CM_PER_IN)}%;transform:translateY(50%);font:12px 'JetBrains Mono',monospace;color:#9ba9b5;text-align:right">${v}"</div><div style="position:absolute;left:52px;width:6px;bottom:${gp(v * CM_PER_IN)}%;border-top:1px solid #5b7b9e"></div>`).join('') +
                MARKS.map(m => `<div id="uni-mk-${m.id}" style="position:absolute;left:52px;right:0;bottom:${gp(m.cm)}%;height:0;border-top:2px dashed ${m.col};opacity:.55;transition:opacity .2s">` +
                    `<div id="uni-ml-${m.id}" style="position:absolute;left:30px;bottom:3px;font:14px 'JetBrains Mono',monospace;font-weight:400;line-height:1.25;color:${m.col};white-space:nowrap">${m.name}<br>${fmtIn(m.cm, 1)}</div></div>`).join('') +
                '<div id="uni-g-cur" style="position:absolute;left:0;width:56px;bottom:0;transform:translateY(50%);text-align:right;opacity:.3"><span id="uni-g-curv" style="display:inline-block;padding:1px 5px;border-radius:4px;background:#9ba9b5;color:#000223;font:bold 13px \'JetBrains Mono\',monospace">--</span></div>' +
                '<div id="uni-g-ptr" style="position:absolute;left:56px;width:22px;bottom:0;height:0;border-top:3px solid #bababa;opacity:.3"></div>';
            function gaugeUpdate() {
                const st = stature(), live = U.t >= TL.pax + 0.6 - 0.01;
                const set = (id, k, v) => { document.getElementById(id).style[k] = v; };
                set('uni-g-fill', 'height', gp(st) + '%');
                ['uni-g-cur', 'uni-g-ptr'].forEach(id => { set(id, 'bottom', gp(st) + '%'); set(id, 'opacity', live ? 1 : 0.3); });
                document.getElementById('uni-g-curv').textContent = live ? dec(st / CM_PER_IN) + '"' : '--';
                const here = MARKS.find(m => Math.abs(st - m.cm) < 0.8);
                MARKS.forEach(m => {
                    set('uni-mk-' + m.id, 'opacity', live && st >= m.cm - 0.05 ? 1 : 0.55);
                    set('uni-mk-' + m.id, 'borderTopStyle', live && here === m ? 'solid' : 'dashed');
                    set('uni-ml-' + m.id, 'fontWeight', live && st >= m.cm - 0.05 ? '700' : '400');   // negrito quando a escala passa pelo percentil
                });
            }
            function tick(now) {
                if (!U.playing) return;
                U.t = Math.min(TOTAL, U.t + Math.min(0.05, (now - U.last) / 1000)); U.last = now;
                if (U.t >= TOTAL) U.playing = false;
                refresh();
                if (U.playing) U.raf = requestAnimationFrame(tick);
            }
            function play(from) {
                if (from != null) U.t = from;
                if(U.t<TL.open)window.__uniRefDoorProgress=0;
                U.playing = true; U.last = performance.now();
                cancelAnimationFrame(U.raf); U.raf = requestAnimationFrame(tick); refresh();
            }
            // Keep the phase timeline and uniGo() API, but do not render phase buttons.
            // Tempo exato na fase 4 em que a curva de estatura passa por WORLD_MEAN_CM (165,0 cm)
            const T_WORLD_MEAN = TL.stat + TL.dur * Math.acos(1 - 2 * (WORLD_MEAN_CM - window.SEATED_STAT.min) / (window.SEATED_STAT.max - window.SEATED_STAT.min)) / Math.PI;

            window.uniGo = i => { U.customStature = null; if(i===0)window.__uniRefDoorProgress=0; play(PH[i][1]); };
            window.uniTogglePlay = () => { U.customStature = null; if (U.playing) { U.playing = false; refresh(); } else play(U.t >= TOTAL - 0.01 ? 0 : U.t); };
            window.uniScrub = v => { U.customStature = null; U.playing = false; U.t = parseFloat(v); if(U.t<TL.open)window.__uniRefDoorProgress=0; refresh(); };
            window.uniPause = () => { if (U.playing) { U.playing = false; cancelAnimationFrame(U.raf); } };
            window.uniRefresh = refresh;
            window.uniEnter = () => { U.started = true; if (!U.playing) play(U.t >= TL.total - 0.05 ? 0 : U.t); else refresh(); };
            // roteiro (aba 8): zera sem autoplay e inicia uma única vez (evita começar, parar e reiniciar)
            window.uniTourReset = () => { U.started = true; U.customStature = null; U.playing = false; cancelAnimationFrame(U.raf); U.t = 0; U.fx = null; U.focus = 0; window.__uniRefDoorProgress=0; window.__uniSweepProgress=0; refresh(); };
            window.uniTourStart = () => { U.started = true; if (!U.playing) play(0); };
            // Entregar ao plano único após zoom, antes da abertura das portas.
            window.uniTourBridgeReady = () => U.t >= TOTAL - .0001;
            window.uniTourSet = t => { U.started = true; U.customStature = null; U.playing = false; cancelAnimationFrame(U.raf); U.t = t; U.fx = null; U.focus = 0; refresh(); };
            window.uniSetFx = (f, focus) => { U.fx = f ? Object.assign({}, f) : null; U.focus = focus || 0; refresh(); };
            window.uniTourStartAt = t => { U.started = true; U.customStature = null; play(t); };
            // Simulação Completa: geometria em px do .sim-bg (canvas) — passageiro da ponta esquerda (janela, convencional) e eixo da fuselagem
            window.uniGeom = () => {
                const cvs = document.getElementById('uniCanvas'), box = cvs && cvs.parentElement; if (!box) return null;
                const r = box.getBoundingClientRect(), m = m4(r.width, r.height);
                const head = 40.64 + window.SEATED_STAT.max * 0.51 * Math.cos(window.SEATED_STAT.backAng * Math.PI / 180);
                return { box, paxX: m.toX(-99.5), floorY: m.toY(0), headY: m.toY(head), paxW: 46 * m.scale, axisY: m.toY(FC), scale: m.scale };
            };

            // opts.stat = 'p95' → estatura P95 Male (fim da fase de estatura); padrão = Média Mundial.  opts.transparent = true → PNG sem fundo.
            window.uniExport4K = (opts) => {
                const o = (opts && typeof opts === 'object' && !opts.target) ? opts : {};
                const isP95 = o.stat === 'p95';
                const statCm = isP95 ? window.SEATED_STAT.max : WORLD_MEAN_CM;
                const statName = isP95 ? 'P95 MALE' : 'WORLD AVERAGE';
                // Posiciona a simulação exatamente na estatura exportada (Média Mundial 165,0 cm / 65,0" ou P95 Male)
                const prev = { t: U.t, custom: U.customStature, playing: U.playing, door: window.__uniRefDoorProgress, wide: U.exportCabinWideFrame };
                U.exporting = true; U.exportCabinWideFrame = isP95; window.EXPORT_EN = true;
                U.playing = false;
                cancelAnimationFrame(U.raf);
                const exportFinalDoorState=prev.t>=TOTAL-.01;
                // P95: enquadramento aberto com os dois bins abertos e os manequins visíveis.
                // Evita a câmera de zoom final, que ocultaria assentos e passageiros.
                U.t=isP95?TOTAL:(exportFinalDoorState?TOTAL:T_WORLD_MEAN);
                U.customStature=isP95?statCm:(exportFinalDoorState?window.SEATED_STAT.max:statCm);
                refresh();

                // Cria canvas offscreen em resolução 4K UHD (3840 × 2160 = 1920×1080 com dpr=2 para nitidez proporcional perfeita)
                const offscreen = document.createElement('canvas');
                U.g = U.g || computeAllGeometries();
                const T1=Math.min(4,U.t/UNI_CAD_SEC);
                if(U.playing && U.t<TL.open)window.__uniRefDoorProgress=0;
                if(U.t>=TL.open)window.__uniRefDoorProgress=doorAmount();
                const slider=document.getElementById('uni-bin-door-slider'),pct=document.getElementById('uni-bin-door-pct');
                if(U.t>=TL.open){if(slider)slider.value=Math.round(100*window.__uniRefDoorProgress);if(pct)pct.textContent=Math.round(100*window.__uniRefDoorProgress)+'%'}
                window.BIN_SOLID = true; window.BIN_DARK = o.palette === 'dark';
                try {
                drawCADCanvas(U.g, {
                    canvas: offscreen,
                    width: 1920,
                    height: 1080,
                    dpr: 2,
                    bgFill: o.transparent ? null : '#f5f5f5',   // null → PNG com fundo transparente
                    T: T1,
                    map: m1,
                    camera:cinematicCamera,
                    before,
                    after: (ctx, m) => {
                        after(ctx, m);
                        // Selo discreto no canto inferior direito indicando a estatura exportada
                        ctx.save();
                        ctx.font = 'bold 13px "JetBrains Mono", monospace';
                        ctx.textAlign = 'right';
                        ctx.fillStyle = '#0e7490';
                        if(!exportFinalDoorState)ctx.fillText(`STATURE: ${statName} (${fmtIn(statCm, 1)})`, m.W - 20, m.H - 14);
                        ctx.restore();
                        drawSeatbackLeader(ctx,m.W,m.H,ph(TL.seats,0.6)*(1-cameraAmount()));
                    }
                });

                } finally { window.BIN_DARK = false; }
                window.BIN_SOLID = false;
                U.exporting = false; window.EXPORT_EN = false;
                // devolve a tela ao estado em que estava antes da exportação
                U.t = prev.t; U.customStature = prev.custom; U.exportCabinWideFrame = prev.wide;
                window.__uniRefDoorProgress=prev.door; refresh();
                if (prev.playing) play(U.t);
                offscreen.toBlob(blob => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'alpha_bin_integrated_simulation_' + (isP95 ? 'p95_male' : 'world_average') + (o.transparent ? '_transparent' : '') + (o.palette === 'dark' ? '_dark_palette' : '') + '_4k.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                }, 'image/png');
            };
        })();

        document.addEventListener('visibilitychange', () => { if (!document.hidden && currentTab === 'unified' && window.uniEnter) window.uniEnter(); });

        window.addEventListener('resize', () => {
            if (currentTab === 'sim') {
                const eg = document.getElementById('aba6-module-ergo');
                if (eg && eg.style.display !== 'none') updateErgonomics();
            }
            if (currentTab === 'unified' && window.uniRefresh) window.uniRefresh();
            if (currentTab === 'cad3d' && window.resizeCAD3D) window.resizeCAD3D();
        });

        window.onload = function () {
            if (window.resizeCAD3D) window.resizeCAD3D();
            switchTab('pax');
        };

