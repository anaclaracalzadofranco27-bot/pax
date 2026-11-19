        // -------------------------------------------------------------------------
        // MÓDULO 3: MANIKIN ANTROPOMÉTRICO ARTICULADO & TEMPO POR MALA
        // -------------------------------------------------------------------------
        let manikinState = {
            mode: 'alpha2',
            phase: 0,
            animating: false,
            animDir: 1,
            calcT_Emb: 9.9,
            calcT_Alpha1: 7.9,
            calcT_Alpha2: 12.1,
            cardFrac: 0,
            cardsShown: false
        };

        // =========================================================================
        // CINEMÁTICA DE ESTIVA — baseada na sequência da Simulação CAD 3D (aba 6)
        //   1) Pega: mala segurada à frente do abdômen, joelhos levemente fletidos
        //   2) Elevação: mala sobe verticalmente, livre da quina do bin
        //   3) Alinhamento: atitude de entrada (em pé p/ Mala 1, "pé-na-frente" p/ Mala 2)
        //   4) Inserção: empurra pela abertura até a posição de projeto
        //   5) Soltura: mão larga a mala; braços retornam ao repouso
        // A fase (0–1) é a mesma do slider "Fase Cinemática".
        // =========================================================================
        const ergoClamp01 = aphaClamp01;
        const ergoSmooth = (t) => { t = ergoClamp01(t); return t * t * (3 - 2 * t); };



        // Perfil de apoio da mala: interpola a linha real do contorno CAD
        // do ALPHA na aba 5 (inclusive a transição curva e o fundo plano).
        function ergoBinFloorAt(prof, x) {
            if (prof.floorPts && prof.floorPts.length > 1) {
                const pts = prof.floorPts;
                if (x <= pts[0].x) return pts[0].y;
                if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
                for (let i = 1; i < pts.length; i++) {
                    if (x <= pts[i].x) {
                        const d = pts[i].x - pts[i-1].x;
                        const t = d > 1e-9 ? (x - pts[i-1].x) / d : 0;
                        return pts[i-1].y + t * (pts[i].y - pts[i-1].y);
                    }
                }
            }
            return x <= prof.xFlatEnd ? prof.y0 :
                prof.y0 + (x - prof.xFlatEnd) *
                (prof.yRampEnd - prof.y0) / (prof.xRampEnd - prof.xFlatEnd);
        }
        function ergoBagSupportY(prof, cx, w, h, angleDeg, gap = 0) {
            const r = -angleDeg*Math.PI/180, c = Math.cos(r), sn = Math.sin(r);
            const corners = [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]
                .map(([x,y]) => [x*c-y*sn, x*sn+y*c]);
            const required = [];
            const check = (dx,dy) => {
                const x = cx+dx;
                if (x >= prof.x0-1e-7 && x <= prof.xRampEnd+1e-7)
                    required.push(ergoBinFloorAt(prof,x)-dy);
            };
            corners.forEach(([dx,dy]) => check(dx,dy));
            // Considera também intersecções com a borda e com a quebra
            // do piso, para a mala não atravessar a quina ao deslizar.
            corners.forEach(([ax,ay],i) => {
                const [bx,by] = corners[(i+1)%4];
                if (Math.abs(bx-ax)<1e-8) return;
                const floorEdges = prof.floorPts
                    ? prof.floorPts.map(p => p.x)
                    : [prof.x0, prof.xFlatEnd, prof.xRampEnd];
                for (const edge of floorEdges) {
                    const t=(edge-cx-ax)/(bx-ax);
                    if (t>=0 && t<=1) check(ax+t*(bx-ax),ay+t*(by-ay));
                }
            });
            return (required.length ? Math.max(...required) : prof.y0+h/2)+gap;
        }

        // Adaptador cinemático da aba 6 para o CAD da aba 5. Não desenha
        // uma segunda geometria: apenas calcula apoios e centros das malas.
        // Compartilha a base CAD imutavel, mas devolve uma copia: o plano
        // de estiva ajusta m1Cx/m2Cx e suas alturas durante cada quadro.
        let cachedErgoCADProfile = null;
        function ergoCADAlphaProfile(cad) {
            if (cachedErgoCADProfile && cachedErgoCADProfile.cad === cad)
                return { ...cachedErgoCADProfile.profile };
            const pts = cad.floorPts;
            if (!pts || pts.length < 2) return null;
            let bend = Math.floor(pts.length / 2);
            for (let i = 1; i < pts.length; i++) {
                const dx = pts[i].x - pts[i-1].x;
                if (dx > 1e-8 && (pts[i-1].y - pts[i].y) / dx > 0.17) {
                    bend = i-1;
                    break;
                }
            }
            const x0 = pts[0].x, y0 = pts[0].y;
            const prof = {
                x0, y0, xFlatEnd: pts[bend].x, yFlatEnd: pts[bend].y,
                xRampEnd: pts[pts.length-1].x,
                yRampEnd: pts[pts.length-1].y,
                floorPts: pts, rad17: 17 * Math.PI / 180,
                m1W: 23.2, m1H: 34.8, m2W: 33.2, m2H: 22.8
            };
            prof.m1Cx = x0 + 1.8 + prof.m1W / 2;
            prof.m1Cy = ergoBagSupportY(prof, prof.m1Cx, prof.m1W, prof.m1H, 0, 1.2);
            // A mala deitada permanece após a quebra do piso, dentro da
            // cavidade CAD e com folga lateral da mala vertical.
            const halfW = (prof.m2W * Math.cos(prof.rad17) +
                           prof.m2H * Math.sin(prof.rad17)) / 2;
            prof.m2Cx = Math.min(prof.xFlatEnd + 23.0, prof.xRampEnd - halfW - 2.0);
            prof.m2Cy = ergoBagSupportY(prof, prof.m2Cx, prof.m2W, prof.m2H, 17, 1.2);
            cachedErgoCADProfile = { cad, profile: prof };
            return { ...prof };
        }

        // =========================================================================
        // 1. POLÍGONO EXATO DA CAVIDADE DO OVERHEAD BIN ALPHA (CAD 1:10 em cm)
        // =========================================================================
        const ERGO_BIN_FLOOR = [
            [25.27, 150.10], [26.25, 150.19], [34.69, 149.71],
            [50.61, 148.32], [51.51, 148.19], [52.28, 148.08],
            [72.91, 141.91], [84.81, 138.45], [86.01, 138.10]
        ];
        const ERGO_BIN_CEIL = [
            [25.43, 182.95], [28.75, 187.91], [41.77, 186.16],
            [54.82, 184.71], [54.46, 173.97], [61.55, 171.82],
            [83.46, 165.30], [93.58, 161.43]
        ];

        function ergoInterpCurveY(pts, x) {
            if (x <= pts[0][0]) return pts[0][1];
            if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
            for (let i = 1; i < pts.length; i++) {
                if (x <= pts[i][0]) {
                    const dx = pts[i][0] - pts[i - 1][0];
                    const t = dx > 1e-9 ? (x - pts[i - 1][0]) / dx : 0;
                    return pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]);
                }
            }
            return pts[pts.length - 1][1];
        }

        function ergoBagCorners(cx, cy, w, h, angleDeg) {
            const r = -angleDeg * Math.PI / 180;
            const c = Math.cos(r), s = Math.sin(r);
            return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
                .map(([dx, dy]) => [cx + dx * c - dy * s, cy + dx * s + dy * c]);
        }

        // Ponto na superfície do retângulo da mala, partindo do centro na direção (dirX, dirY)
        function ergoBagSurfacePoint(cx, cy, w, h, angleDeg, dirX, dirY) {
            const r = -angleDeg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
            // direção no referencial local da mala (rotação inversa)
            const lx = dirX * c + dirY * s;
            const ly = -dirX * s + dirY * c;
            const tx = Math.abs(lx) > 1e-9 ? (w / 2) / Math.abs(lx) : Infinity;
            const ty = Math.abs(ly) > 1e-9 ? (h / 2) / Math.abs(ly) : Infinity;
            const t = Math.min(tx, ty);
            const px = lx * t, py = ly * t;
            // volta ao referencial global
            return [cx + px * c - py * s, cy + px * s + py * c];
        }

        // Resolve a folga vertical mínima da mala em relação ao piso e ao teto do bin
        function ergoCavityClearance(cx, cy, w, h, angleDeg) {
            const corners = ergoBagCorners(cx, cy, w, h, angleDeg);
            let minFloor = Infinity, minCeil = Infinity;

            for (const [x, y] of corners) {
                if (x >= 25.0) {
                    minFloor = Math.min(minFloor, y - ergoInterpCurveY(ERGO_BIN_FLOOR, x));
                    minCeil = Math.min(minCeil, ergoInterpCurveY(ERGO_BIN_CEIL, x) - y);
                }
            }
            for (let i = 0; i < 4; i++) {
                const [ax, ay] = corners[i];
                const [bx, by] = corners[(i + 1) % 4];
                if (Math.abs(bx - ax) < 1e-8) continue;
                for (const [fx, fy] of ERGO_BIN_FLOOR) {
                    if ((ax - fx) * (bx - fx) <= 0) {
                        const t = (fx - ax) / (bx - ax);
                        minFloor = Math.min(minFloor, (ay + t * (by - ay)) - fy);
                    }
                }
                for (const [cxP, cyP] of ERGO_BIN_CEIL) {
                    if ((ax - cxP) * (bx - cxP) <= 0) {
                        const t = (cxP - ax) / (bx - ax);
                        minCeil = Math.min(minCeil, cyP - (ay + t * (by - ay)));
                    }
                }
            }
            return { minFloor, minCeil };
        }

        // Projeta a mala estritamente dentro do corredor de entrada do bin (sem clipping)
        function ergoClampBagToCavity(cx, cy, w, h, angleDeg, floorMargin = 0.30, ceilMargin = 0.45) {
            let y = cy;
            const c1 = ergoCavityClearance(cx, y, w, h, angleDeg);
            if (c1.minFloor < floorMargin) y += (floorMargin - c1.minFloor);
            const c2 = ergoCavityClearance(cx, y, w, h, angleDeg);
            if (c2.minCeil < ceilMargin) y -= (ceilMargin - c2.minCeil);
            return y;
        }

        function ergoEvalBezier(p0, p1, p2, p3, t) {
            const u = 1 - t;
            return [
                u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
            ];
        }

        // =========================================================================
        // 2. PLANO DE TRAJETÓRIA CURVA (BEZIER) E ESTÁGIOS DE ESTIVA
        // =========================================================================
        function ergoStowPlan(mode, prof, stature) {
            // Mala 2: entra primeiro e repousa deitada sobre a rampa interna (~16.3°)
            if (mode === 'alpha2') {
                const w = prof.m2W, h = prof.m2H; // 33.2 x 22.8 cm
                const restAng = 16.3;
                const restCx = 70.2;
                const restCy = ergoClampBagToCavity(restCx, 155.0, w, h, restAng, 0.25, 0.50);
                prof.m2Cx = restCx;
                prof.m2Cy = restCy;

                return {
                    mode, w, h,
                    tSupport: 0.62, tPush: 0.84, tPlace: 0.86,
                    footX: -14.0,
                    restCx, restCy, restAng,
                    stages: [
                        [0.00, 'Prepare & Grip (Hip Level)'],
                        [0.14, 'Chest Pull & Lift'],
                        [0.36, 'Align & Rotate at Mouth'],
                        [0.62, 'Slide on 16.3° Shelf'],
                        [0.86, 'Release & Return']
                    ]
                };
            }

            // Mala 1: entra em segundo lugar e repousa em pé na prateleira frontal (~4.5°)
            if (mode === 'alpha1') {
                const w = prof.m1W, h = prof.m1H; // 23.2 x 34.8 cm
                const restAng = 4.5;
                const restCx = 38.0;
                const restCy = ergoClampBagToCavity(restCx, 167.2, w, h, restAng, 0.25, 0.50);
                prof.m1Cx = restCx;
                prof.m1Cy = restCy;

                return {
                    mode, w, h,
                    tSupport: 0.64, tPush: 0.82, tPlace: 0.84,
                    footX: -14.0,
                    restCx, restCy, restAng,
                    stages: [
                        [0.00, 'Prepare & Grip (Hip Level)'],
                        [0.14, 'Chest Pull & Lift'],
                        [0.42, 'Enter Front Opening'],
                        [0.64, 'Slide to Front Stop'],
                        [0.84, 'Release & Return']
                    ]
                };
            }
            return null;
        }

        function ergoSampleBagTrajectory(plan, phase) {
            const p = ergoClamp01(phase);
            const s = ergoSmooth;

            if (plan.mode === 'alpha2') {
                const { w, h, restCx, restCy, restAng } = plan;
                if (p <= 0.14) {
                    // Fase 1: Pega na altura do quadril
                    const t = s(p / 0.14);
                    return { x: 9.5 - 0.8 * t, y: 95.0 + 2.0 * t, a: -90.0, alpha: 1.0 };
                } else if (p <= 0.36) {
                    // Fase 2: Puxa para perto do peito/ombro antes de elevar acima da cabeça
                    const t = s((p - 0.14) / 0.22);
                    const [bx, by] = ergoEvalBezier([8.7, 97.0], [5.8, 121.0], [7.8, 146.0], [13.2, 163.5], t);
                    const ang = -90.0 + 22.0 * s((t - 0.45) / 0.55);
                    return { x: bx, y: by, a: ang, alpha: 1.0 };
                } else if (p <= 0.62) {
                    // Fase 3A: Rotação suave pelo punho e entrada pela boca frontal sem tocar no teto/lábio
                    const t = s((p - 0.36) / 0.26);
                    const [bx, byRaw] = ergoEvalBezier([13.2, 163.5], [18.5, 167.2], [27.5, 166.2], [38.5, 164.3], t);
                    const ang = -68.0 + (restAng - (-68.0)) * s(t);
                    const by = ergoClampBagToCavity(bx, byRaw, w, h, ang, 0.35, 0.55);
                    return { x: bx, y: by, a: ang, alpha: 1.0 };
                } else if (p <= 0.86) {
                    // Fase 3B: Deslizamento apoiado sobre a rampa interna de 16.3° até encostar no fundo
                    const t = s((p - 0.62) / 0.24);
                    const bx = 38.5 + (restCx - 38.5) * t;
                    const byLinear = 164.3 + (restCy - 164.3) * t;
                    const by = ergoClampBagToCavity(bx, byLinear, w, h, restAng, 0.25, 0.50);
                    return { x: bx, y: by, a: restAng, alpha: 1.0 };
                }
                return { x: restCx, y: restCy, a: restAng, alpha: 1.0 };
            }

            // Mala 1 (em pé na prateleira frontal, entrada após a Mala 2 estar guardada)
            const { w, h, restCx, restCy, restAng } = plan;
            const fadeAlpha = s(p / 0.10);
            if (p <= 0.14) {
                const t = s(p / 0.14);
                return { x: 9.8 - 0.8 * t, y: 97.5 + 1.5 * t, a: 0.0, alpha: fadeAlpha };
            } else if (p <= 0.42) {
                const t = s((p - 0.14) / 0.28);
                const [bx, by] = ergoEvalBezier([9.0, 99.0], [6.2, 122.0], [8.5, 148.0], [13.5, 165.8], t);
                const ang = restAng * s((t - 0.40) / 0.60);
                return { x: bx, y: by, a: ang, alpha: 1.0 };
            } else if (p <= 0.64) {
                const t = s((p - 0.42) / 0.22);
                const [bx, byRaw] = ergoEvalBezier([13.5, 165.8], [18.5, 166.8], [24.0, 167.2], [29.8, 167.4], t);
                const by = ergoClampBagToCavity(bx, byRaw, w, h, restAng, 0.30, 0.50);
                return { x: bx, y: by, a: restAng, alpha: 1.0 };
            } else if (p <= 0.84) {
                const t = s((p - 0.64) / 0.20);
                const bx = 29.8 + (restCx - 29.8) * t;
                const byLinear = 167.4 + (restCy - 167.4) * t;
                const by = ergoClampBagToCavity(bx, byLinear, w, h, restAng, 0.25, 0.50);
                return { x: bx, y: by, a: restAng, alpha: 1.0 };
            }
            return { x: restCx, y: restCy, a: restAng, alpha: 1.0 };
        }

        // =========================================================================
        // 3. CINEMÁTICA INVERSA ARTICULADA (JOELHOS, TORNOZELOS, TRONCO, OMBRO, COTOVELO, PUNHO)
        // =========================================================================
        function ergoSolvePosture(stature, plan, phase) {
            const H = stature;
            const clamp = ergoClamp01, smooth = ergoSmooth;
            const bagState = ergoSampleBagTrajectory(plan, phase);
            let bx = bagState.x, by = bagState.y, ba = bagState.a;

            // Proporções antropométricas do percentil 5% feminino (H = 151.89 cm)
            const Lthigh = 0.245 * H;
            const Lshank = 0.285 * H - 4.0;
            const Ltorso = 0.288 * H;
            const L1 = 0.186 * H;          // Úmero (ombro -> cotovelo)
            const L2 = 0.146 * H + 5.0;    // Antebraço + punho (cotovelo -> pega)
            const armMax = L1 + L2 - 0.30;

            // Pesos suaves por fase biomecânica
            const wPrep   = 1.0 - smooth((phase - 0.10) / 0.12);
            const wChest  = smooth((phase - 0.12) / 0.14) * (1.0 - smooth((phase - 0.36) / 0.14));
            const wReach  = smooth((phase - 0.34) / 0.18) * (1.0 - smooth((phase - plan.tPlace) / 0.10));
            const wInsert = smooth((phase - plan.tSupport) / Math.max(0.06, plan.tPush - plan.tSupport))
                          * (1.0 - smooth((phase - plan.tPlace) / 0.10));

            // 1) Joelhos e tornozelos:
            //    - Fase 1: leve flexão de joelhos para absorver a carga no quadril
            //    - Fase 3: extensão completa dos joelhos + elevação nos calcanhares para alcance máximo
            const kneeDip = 3.8 * wPrep + 1.2 * wChest;
            const heel = 3.8 * wReach;
            const phi = Math.asin(Math.min(0.9, heel / 10.5));
            const toeX = plan.footX + 10.5, toeY = 2.0;
            const ankleX = toeX - 10.5 * Math.cos(phi) + 2.0 * Math.sin(phi);
            const ankleY = toeY + 10.5 * Math.sin(phi) + 2.0 * Math.cos(phi);

            // 2) Tronco:
            //    - Fase 1: inclinado ~5° para trás (-0.087 rad) contrabalançando o peso no quadril
            //    - Fase 3: inclinado ~9° para frente (+0.157 rad) durante a extensão superior e inserção no bin
            const torsoTilt = (-0.087 * wPrep) + (0.02 * wChest) + (0.140 * wReach) + (0.035 * wInsert);

            const legLen = Math.min(Lthigh + Lshank - 0.25, Lthigh + Lshank - 0.4 - kneeDip);
            const hipDX = -1.2 * wPrep + 1.8 * wReach + 3.2 * wInsert;
            const hipX = ankleX + hipDX;
            const hipY = ankleY + Math.sqrt(Math.max(1.0, legLen * legLen - hipDX * hipDX));
            const shX = hipX + Ltorso * Math.sin(torsoTilt);
            const shY = hipY + Ltorso * Math.cos(torsoTilt);

            // Passada posterior de estabilização durante o empurrão alto
            const step = smooth((phase - 0.44) / 0.20) * (1.0 - smooth((phase - plan.tPlace) / 0.10));
            const rAx = ankleX - 10.5 * step, rAy = ankleY;
            const kneeIK = (ax, ay) => {
                const dx = hipX - ax, dy = hipY - ay;
                const dist = Math.max(0.001, Math.hypot(dx, dy));
                const d = Math.min(dist, Lthigh + Lshank - 0.01);
                const c = Math.max(-1, Math.min(1,
                    (Lshank * Lshank + d * d - Lthigh * Lthigh) / (2 * Lshank * d)));
                const a = Math.acos(c), ux = dx / dist, uy = dy / dist;
                return [
                    ax + Lshank * (ux * Math.cos(a) + uy * Math.sin(a)),
                    ay + Lshank * (-ux * Math.sin(a) + uy * Math.cos(a))
                ];
            };
            const knee = kneeIK(ankleX, ankleY), kneeR = kneeIK(rAx, rAy);

            // Centralização do corpo no corredor de 20" (sem alterar as coordenadas do bin)
            const headLen = 0.118 * H, neckTilt = 0.25 * torsoTilt;
            const headPreviewX = shX + headLen * Math.sin(neckTilt) + 0.2;
            const frontFoot = (267.3 - 215.29) * H / 545.0;
            const bodyLeft = Math.min(ankleX - 5, rAx - 5, knee[0] - 5, kneeR[0] - 5, hipX - 6, shX - 7, headPreviewX - 0.068 * H);
            const bodyRight = Math.max(ankleX + frontFoot, rAx + frontFoot, knee[0] + 5, kneeR[0] + 5, hipX + 6, shX + 7, headPreviewX + 0.068 * H);
            const shiftX = -(bodyLeft + bodyRight) * 0.5;
            const shoulderX = shX + shiftX, shoulderY = shY;
            const headX = headPreviewX + shiftX;
            const headY = shY + headLen * Math.cos(neckTilt);

            // 3) Acoplamento Mão-Objeto (ponto de pega exato na mala):
            const handSlide = smooth((phase - plan.tSupport) / Math.max(0.06, plan.tPush - plan.tSupport));
            const rot = -ba * Math.PI / 180;
            // Âncoras de pega FIXAS no referencial da mala (alça): a mão fica travada no mesmo ponto durante todo o trajeto
            const gc = Math.cos(rot), gs = Math.sin(rot);
            let GA;
            if (plan.mode === 'alpha1') GA = [-0.38 * plan.w, -0.26 * plan.h];
            else {
                const dm = Math.hypot(0.95, 0.31), ux = -0.95 / dm, uy = -0.31 / dm;
                const sp = ergoBagSurfacePoint(0, 0, plan.w, plan.h, 0, ux, uy);
                GA = [sp[0] - ux * 0.40, sp[1] - uy * 0.40];
            }
            const gx = bx + GA[0] * gc - GA[1] * gs, gy = by + GA[0] * gs + GA[1] * gc;

            // Soltura suave (ease-in-out) apenas após a mala repousar dentro do bin
            const returnT = clamp((phase - plan.tPlace) / (1.0 - plan.tPlace));
            const release = smooth(returnT);
            const rest = [shoulderX + 1.6, shoulderY - 0.90 * (L1 + L2)];
            const target = [
                gx + (rest[0] - gx) * release,
                gy + (rest[1] - gy) * release
            ];

            // 4) IK de 2 elos (Ombro -> Cotovelo -> Punho) com flexão natural na fase do peito
            const armIK = (sx, sy, tx, ty) => {
                const dx = tx - sx, dy = ty - sy;
                const dist = Math.max(0.001, Math.hypot(dx, dy));
                const reach = Math.min(armMax, Math.max(Math.abs(L1 - L2) + 0.2, dist));
                const base = Math.atan2(dy, dx);
                const c = Math.max(-1, Math.min(1,
                    (L1 * L1 + reach * reach - L2 * L2) / (2 * L1 * reach)));
                const a = base - Math.acos(c);
                const ex = sx + L1 * Math.cos(a), ey = sy + L1 * Math.sin(a);
                const k = Math.min(1, armMax / dist);
                return {
                    ex, ey,
                    hx: sx + dx * k,
                    hy: sy + dy * k,
                    reached: dist <= armMax + 0.001
                };
            };
            const arm = armIK(shoulderX, shoulderY, target[0], target[1]);
            const armFar = armIK(shoulderX - 1.0, shoulderY - 0.6, target[0] - 1.6, target[1] + 0.6);

            // Acompanhamento visual da cabeça em direção à mala
            const look = Math.atan2(by - headY, bx - headX);
            const headPitch = 0.04 + 0.28 * smooth((phase - 0.22) / 0.24) * (1 - release);
            const pitch = Math.min(0.38, headPitch + Math.max(0, Math.min(0.15, look * 0.15)));

            // Elevação real do ombro: ângulo do úmero (ombro→cotovelo) medido a partir da vertical para baixo (0° = braço pendente)
            const shAngle = Math.atan2(Math.abs(arm.ex - shoulderX), -(arm.ey - shoulderY)) * 180 / Math.PI;
            const l5 = [hipX + shiftX + 0.10 * (shoulderX - (hipX + shiftX)), hipY + 0.10 * (shoulderY - hipY)];   // L5/S1 ≈ 10% do tronco acima do quadril
            return {
                l5, shAngle,
                bag: { x: bx, y: by, a: ba, grip: handSlide, release, alpha: bagState.alpha },
                footX: plan.footX + shiftX, toeX: toeX + shiftX, toeY,
                phi, heel,
                ankle: [ankleX + shiftX, ankleY],
                knee: [knee[0] + shiftX, knee[1]],
                hip: [hipX + shiftX, hipY],
                ankleR: [rAx + shiftX, rAy],
                kneeR: [kneeR[0] + shiftX, kneeR[1]],
                sa: step,
                shoulder: [shoulderX, shoulderY],
                head: [headX, headY],
                headPitch: pitch,
                neckTilt,
                torsoTilt,
                beta: torsoTilt,
                arm,
                armFar,
                handTarget: target,
                reachable: arm.reached
            };
        }

        function ergoStageName(plan, phase) {
            let name = plan.stages[0][1];
            for (const [t, n] of plan.stages) if (phase >= t) name = n;
            return name;
        }

        function setAnimLabel() {
            const el = document.getElementById('aba6-lbl-anim-btn');
            if (!el) return;
            el.textContent = manikinState.animating ? 'Pause Kinematics'
                : (manikinState.phase >= 0.999 ? 'Restart Simulation'
                : (manikinState.phase > 0 ? 'Resume Simulation' : 'Start Simulation'));
        }


        // Exporta os 3 momentos (Step 1 / 2 / 3) lado a lado em PNG com fundo transparente, como na figura de referência.
        // Se noDownload = true, apenas devolve o canvas (usado para gerar o arquivo fora da página).

        // Camada vetorial separada: somente boneco, uma mala e o bin Alpha aberto.
        // A fase escolhida é a de entrada da primeira mala, sem tocar no playback.
        function exportAphaFigure() {
            if (!manikinState.last) updateErgonomics();
            const L=manikinState.last;
            if (!L || !L.times || !L.times.length) return;
            const C=APHA_BRIDGE_CFG,W=C.figureW,H=C.figureH,S=C.figureScale;
            // 83% da trajetória da primeira mala (alpha2), não 83% do ciclo
            // global de duas malas. Não altera autoplay, cronômetro nem pose ao vivo.
            const ref=L.times[0],firstCycle=ref.tA2/(ref.tA2+ref.tA1);
            const output=document.createElement('canvas');
            output.width=Math.round(W*S);output.height=Math.round(H*S);
            const g=output.getContext('2d',{alpha:true,willReadFrequently:true});
            const prev=[window.__mkExport,window.__aphaBridgeDoorU,
                        window.__aphaOnlyCabin,window.__aphaShowConventional,
                        window.__aphaBridgeMinimalHUD];
            try {
                window.__mkExport=true;
                // Nesta fase (antes da soltura), a porta ainda está aberta.
                window.__aphaBridgeDoorU=1;
                window.__aphaOnlyCabin=false;
                window.__aphaShowConventional=false;
                window.__aphaBridgeMinimalHUD=true;
                g.clearRect(0,0,output.width,output.height);
                g.setTransform(S,0,0,S,0,0);
                drawManikinPanel(g,W,H,ERGO_PERCENTILES[0].h,L.mass,L.angleDeg,
                    L.Fg,L.Fn,L.Ft,C.figurePhase*firstCycle,ref.tA2,ref.tA1,'');
            } catch(err) {
                console.error('Export figure PNG:',err);
                alert('Could not render the transparent figure.');
                return;
            } finally {
                [window.__mkExport,window.__aphaBridgeDoorU,window.__aphaOnlyCabin,
                 window.__aphaShowConventional,window.__aphaBridgeMinimalHUD]=prev;
            }
            const pixels=g.getImageData(0,0,output.width,output.height).data;
            let x0=output.width,y0=output.height,x1=-1,y1=-1;
            for(let y=0;y<output.height;y++)for(let x=0;x<output.width;x++){
                if(pixels[(y*output.width+x)*4+3]>8){
                    if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
                }
            }
            if(x1<0){alert('The figure was empty.');return;}
            const margin=Math.round(C.figureMargin*S);
            x0=Math.max(0,x0-margin);y0=Math.max(0,y0-margin);
            x1=Math.min(output.width-1,x1+margin);y1=Math.min(output.height-1,y1+margin);
            const crop=document.createElement('canvas');
            crop.width=x1-x0+1;crop.height=y1-y0+1;
            crop.getContext('2d',{alpha:true}).drawImage(
                output,x0,y0,crop.width,crop.height,0,0,crop.width,crop.height);
            crop.toBlob(blob=>{
                if(!blob){alert('PNG export failed.');return;}
                const url=URL.createObjectURL(blob),a=document.createElement('a');
                a.href=url;a.download='boneco-mala-bin.png';
                document.body.appendChild(a);a.click();a.remove();
                setTimeout(()=>URL.revokeObjectURL(url),5000);
            },'image/png');
        }
        window.exportAphaFigure=exportAphaFigure;
        ['aba6-figure-export','tour-figure-export'].forEach(id=>{
            const el=document.getElementById(id);
            if(el)el.addEventListener('click',exportAphaFigure);
        });

        function exportManikinSteps(noDownload) {
            const L = manikinState.last;
            if (!L) return null;
            const t = L.times[0], fracBack = t.tA2 / (t.tA2 + t.tA1);
            const moments = [0.07, 0.48, 0.78];   // fase local da mala 2: elevação (1), apoio na borda (2), deslize (3)
            const Wl = 1120, Hl = 740, S = 2;
            const prev = window.__mkExport; window.__mkExport = true;
            const outs = [];
            try {
                moments.forEach(lp => {
                    const c = document.createElement('canvas'); c.width = Wl * S; c.height = Hl * S;
                    const g = c.getContext('2d'); g.scale(S, S);
                    drawManikinPanel(g, Wl, Hl, ERGO_PERCENTILES[0].h, L.mass, L.angleDeg, L.Fg, L.Fn, L.Ft, lp * fracBack, t.tA2, t.tA1, '');
                    // recorta as bordas vazias, mantendo o fundo transparente
                    const w = c.width, h = c.height, d = g.getImageData(0, 0, w, h).data;
                    let x0 = w, x1 = 0, y0 = h, y1 = 0;
                    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                    const m = 16; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
                    const crop = document.createElement('canvas'); crop.width = x1 - x0 + 1; crop.height = y1 - y0 + 1;
                    crop.getContext('2d').drawImage(c, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
                    outs.push(crop);
                });
            } finally { window.__mkExport = prev; }
            if (noDownload) return outs;
            outs.forEach((cv, i) => setTimeout(() => cv.toBlob(b => {   // 3 arquivos PNG transparentes: step 1, 2 e 3
                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `overhead_bin_alpha_step${i + 1}.png`;
                document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
            }, 'image/png'), i * 400));
            return outs;
        }

        function toggleManikinAnimation() {
            if (manikinState.animating) { manikinState.animating = false; setAnimLabel(); return; }
            cancelResultsSequence();
            if (manikinState.phase >= 0.999) { manikinState.phase = aphaInitialManikinPhase(); hideCards(); }
            manikinState.animating = true;
            setAnimLabel();
        }

        function cancelResultsSequence() {
            manikinState.seq = (manikinState.seq || 0) + 1;
            manikinState.onCardsClosed = null;
            if (manikinState.cleanup) { manikinState.cleanup(); manikinState.cleanup = null; }
            if (!manikinState.swapped) { const e = document.getElementById('aba6-module-ergo'); if (e) { e.style.transition = ''; e.style.opacity = ''; } }
            (manikinState.seqTimers || []).forEach(clearTimeout);
            manikinState.seqTimers = [];
        }

        addEventListener('keydown', e => { if (e.key === 'Escape' && window.__stopTourRec) window.__stopTourRec(); });

        // Frame inicial único do canvas, da apresentação completa e das capturas:
        // +0,5 s do ciclo calculado, sem alterar as durações biomecânicas.
        function aphaInitialManikinPhase() {
            const times = manikinState.last && manikinState.last.times;
            const t = times && times.length ? Math.max(...times.map(x => x.tA1+x.tA2))
                : (() => { const v=ergoTimes(ERGO_PERCENTILES[0].h,10,17); return v.tA1+v.tA2; })();
            return Math.min(0.95, APHA_BRIDGE_CFG.startOffsetSeconds / Math.max(0.001,t));
        }
        function showManikin() {
            cancelResultsSequence();
            manikinState.phase = aphaInitialManikinPhase();
            manikinState.animating = false;
            setAnimLabel();
            const ergo = document.getElementById('aba6-module-ergo');
            manikinState.swapped = false;
            ergo.style.display = ''; ergo.style.transition = ''; ergo.style.opacity = '';
            requestAnimationFrame(() => updateErgonomics());
        }


        // A única fonte do relógio da Aba 6: RAF cancelável, sem setInterval oculto.
        let manikinFrameId = 0;
        let manikinFrameTime = 0;
        function stopManikinLoop() {
            if (manikinFrameId) cancelAnimationFrame(manikinFrameId);
            manikinFrameId = 0;
            manikinFrameTime = 0;
        }
        function startManikinLoop() {
            if (manikinFrameId || !manikinState.animating) return;
            manikinFrameTime = performance.now();
            const tick = now => {
                manikinFrameId = 0;
                const active = manikinState.animating &&
                    (currentTab === 'sim' || window.__aba6TourMode);
                if (!active) { manikinFrameTime = 0; return; }
                const elapsed = now - manikinFrameTime;
                // A animação biomecânica só precisa de ~25 fps, mesmo em monitores 120 Hz.
                if (elapsed >= 40) {
                    const dt = Math.min(0.1, elapsed / 1000);
                    manikinFrameTime = now;
                    const tCycle = Math.max(6, manikinState.cycleT || 20) * 0.55;
                    manikinState.phase = Math.min(1,
                        manikinState.phase + (dt * 1.45) / tCycle);
                    const finished = manikinState.phase >= 1;
                    updateErgonomics();
                    if (finished) {
                        if (window.__aba6TourMode) {
                            // O roteiro mantém a pose final e avança ao encerramento.
                            manikinState.animating = false;
                            setAnimLabel();
                            window.ergoDone = true;
                        } else {
                            // A Aba 6 autônoma reinicia sem acumular timers.
                            manikinState.phase = aphaInitialManikinPhase();
                            hideCards();
                            updateErgonomics();
                        }
                    }
                }
                if (manikinState.animating &&
                    (currentTab === 'sim' || window.__aba6TourMode))
                    manikinFrameId = requestAnimationFrame(tick);
            };
            manikinFrameId = requestAnimationFrame(tick);
        }

        // Estatura original do manequim restaurada: 59,8" (referência P5 feminino).
        // O rótulo visível "95th Percentile" permanece conforme solicitado anteriormente.
        const ERGO_PERCENTILES = [
            { h: 59.8 * 2.54, title: 'Female', sub: 'P5' }
        ];

        function ergoTimes(stature, mass, angleDeg) {
            const statureFactor = Math.max(0, (170.0 - stature) * 0.065);
            const massFactor = Math.max(0, (mass - 10.0) * 0.32);
            const rampFactor = (angleDeg / 17.0) * 1.1;
            return {
                tEmb: 8.4 + massFactor + statureFactor * 0.8 + 1.5,
                tA1: 6.8 + massFactor * 0.85 + statureFactor * 0.4 + 1.1,
                tA2: 9.8 + massFactor * 1.15 + statureFactor * 1.3 + rampFactor + 1.2
            };
        }

        function writeCards(frac) {
            const v = manikinState.cardVals; if (!v) return;
            for (const id in v) {
                const el = document.getElementById(id);
                if (el) el.textContent = v[id][2] === '%' ? `−${(v[id][0] * frac).toFixed(v[id][1])}%` : `${(v[id][0] * frac).toFixed(v[id][1])} s`;
            }
        }


        function hideCards() {
            if (!manikinState.cardsShown) return;
            manikinState.cardsShown = false;
            manikinState.cardFrac = 0;
            const box = document.getElementById('ergo-overlay');
            if (box) { box.classList.remove('cards-on'); box.setAttribute('aria-hidden', 'true'); }
            writeCards(0);
        }

        function updateErgonomics() {
            const mass = 10.0;
            const angleDeg = 17.0;
            const phase = manikinState.phase;

            

            const Fg = mass * 9.81;
            const rad = (angleDeg * Math.PI) / 180.0;
            const Fn = Fg * Math.cos(rad);
            const Ft = Fg * Math.sin(rad);

            const times = ERGO_PERCENTILES.map(p => ergoTimes(p.h, mass, angleDeg));

            // Cards e exportação para o Embarque usam o P5 feminino (59,8 pol) da cena.
            const ref = times[0];
            const tEmb = ref.tEmb, tAlpha1 = ref.tA1, tAlpha2 = ref.tA2;
            const tAlphaAvg = (2 * tAlpha1 + 2 * tAlpha2) / 4.0;
            manikinState.calcT_Emb = tEmb;
            manikinState.calcT_Alpha1 = tAlpha1;
            manikinState.calcT_Alpha2 = tAlpha2;
            manikinState.cycleT = Math.max(...times.map(t => t.tA1 + t.tA2));

            manikinState.cardVals = {
                'card-t-alpha-mod': [tAlphaAvg * 4, 1], 'card-t-conv-mod': [tEmb * 4, 1]
            };
            writeCards(manikinState.cardFrac);

            // Resultados só aparecem quando a simulação termina; ao reiniciar, somem de novo
            if (phase < 0.999) hideCards();

            manikinState.last = { mass, angleDeg, Fg, Fn, Ft, times };
            drawManikinViewport(mass, angleDeg, Fg, Fn, Ft, phase, times);
        }

        // =========================================================================
        // Manequim articulado "chapado" (referência: bonecos.pdf) — só usado no painel biomecânico
        // =========================================================================
        // Peças vetoriais extraídas de vermelho.pdf (CorelDRAW 2024). Coordenadas em pt do PDF (y para baixo).
        // Cada peça é um contorno independente: o preto é desenhado pelo próprio código (traço sob o preenchimento),
        // então as peças podem girar/esticar sem "quebrar" a ilustração.
        const PDFM = { fill: '#d6d9e1', far: '#c3c6d1', gray: '#b6b9be', farGray: '#a4a7b1', edge: '#050505', red: '#c4292c', orange: '#f28c1e', green: '#3bb54a' };
        const PDFB = {
          foot: 'M202.2 725.6C207.2 726.6 261.5 726.4 267.3 725.5C267 718.8 262.3 717.5 256.1 715.6C246.7 712.8 231.6 706.8 222.4 711.8C215.8 715.4 211.1 713.1 203 713.2Z',
          shin: 'M225.1 696.7C227.7 656.9 237.3 617.3 238.1 577C233.6 579.5 232.2 583.5 224.1 582C219 581.1 215 577.4 213.6 573.8C213.1 574.5 213.2 574.3 212.8 575.5L211.7 580.9C204.8 620.6 208 626.4 207.3 665.8C207.1 675.9 205.9 686.8 206 696.6C209.2 694.4 210.8 692 215.5 692C219.8 692.1 221.3 693.9 224.1 695.9C224.2 696 224.5 696.5 224.6 696.3C224.7 696.2 224.9 696.6 225.1 696.7',
          thigh: 'M200.6 507.2C202.4 515.2 210.4 561.9 212.8 564.8C215.3 560 217.4 556.5 223.6 555.1C231.6 553.4 234.2 557.1 236.9 559.3C238.6 560.6 235.9 559 238.7 560.4C238 542.2 235.6 455 229.8 443.7C226.4 446.8 227.1 447.8 222.6 450.9C215.9 455.4 205.9 454.2 200.9 449.9C199.9 448.9 198.3 447.4 197.5 446.3C195.8 444.2 197 444.2 194.1 442.8C193.8 466.4 195.7 484.6 200.6 507.2',
          pelvis: 'M191.7 437.6 C194.0 431.8 191.9 427.9 196.3 421.6 C204.9 409.5 229.8 409.5 230.4 436.9 C239.4 436.8 238.0 433.3 239.3 425.0 C241.6 410.7 240.6 381.3 233.8 372.4 L190.0 374.0 C184.2 388.5 180.0 409.3 183.0 425.7 C184.9 436.2 186.2 438.9 191.7 437.6Z',
          chestBack: 'M234.9 350.4 C240.2 343.7 245.5 312.1 246.3 301.0 L237.6 298.2 L234.8 300.7 C234.0 301.4 233.4 301.9 232.4 302.7 C218.9 313.1 204.1 311.0 190.7 302.0 C188.2 300.3 187.7 300.3 185.4 298.7 C185.8 315.7 186.7 330.1 188.8 347.0Z',
          chestFront: 'M234.9 350.4 C240.2 343.7 245.5 312.1 246.3 301.0 C246.5 291.1 246.4 279.1 237.2 273.3 L229.3 293.2 C228.6 293.9 226.9 295.9 225.9 296.6 C212.5 307.0 211.0 303.7 197.6 294.8 C195.1 293.1 186.5 287.2 184.1 285.7 C181.5 304.9 183.5 330.7 188.8 347.0Z',
          upperArm: 'M203.5 277.1 L223.6 271.2 L227.9 297.6 C229.9 296.6 231.3 351.5 230.8 354.5 C222.0 354.0 224.6 351.3 216.0 358.9Z',
          core: 'M205 313.2L214.8 359.8C220.2 354.4 221.2 352 232.4 355.1L228.5 309.1C218.1 312.8 218 314 205 313.2',
          waist: 'M190.4 350.7 C189.3 355.7 189.2 361.3 190.2 366.6 C191.6 373.9 193.7 372.0 201.1 371.7 C211.8 371.2 223.4 371.1 234.1 370.1 C235.2 365.3 234.9 356.6 232.1 353.0 C230.7 352.1 201.5 350.7 195.2 350.2Z',
          hipJ: 'M195.2 435.7 C196.8 445.4 213.3 455.1 224.6 442.0 C227.2 438.9 228.5 434.2 227.3 429.1 C225.0 419.0 216.2 414.9 208.4 416.4 C200.4 417.9 193.4 425.1 195.2 435.7Z',
          kneeJ: 'M215.6 571.2C218.7 584.2 240.5 581.6 237.7 566.2C235.1 551.6 212.2 556.5 215.6 571.2',
          ankleJ: 'M207.7 705C209.8 714.4 225.5 712.3 224 701.5C222.6 691.7 205.1 693.2 207.7 705',
          elbowJ: 'M216.7 367.7C219.6 378.9 237.5 376.2 234.8 363.6C232.3 352 213.4 355 216.7 367.7',
          wristJ: 'M313.8 372.1L307.9 371.2L307.6 379.8L307.6 382.8L314.3 383Z',
          neck: 'M199.3 253.8 L218.7 251.8 C217.6 251.1 223.4 245.6 219.3 245.0 C213.8 244.3 199.4 239.4 197.7 239.3Z',
          head: 'M218.9 179.5C188.6 184.7 197 227.9 206.7 236.4C211.1 240.3 220.8 243.2 228.2 244.2C239.1 245.7 248.1 216.7 248.5 207.7C249.3 190.2 237 176.4 218.9 179.5',
          forearm: 'M231.8 376.3C237 379.6 295.3 384 304.7 383.9L305.1 370.6C301.4 368.3 267.7 362.2 260.7 361C233.5 356.2 235.8 356.9 237.3 362.9C239.3 370.7 234.7 373.1 231.8 376.3',
          hand: 'M328.2 372.2C330.9 371.6 333.9 368.5 342.4 365.1C345.7 363.8 348.7 363.4 348.1 360.7C346.2 358.5 337 364.1 331.2 365.3C324.1 366.7 322.9 368.7 317 370.6L317.6 382.3C326.7 385.9 338.7 382.9 347.2 379.8C352.4 377.9 365.8 368.8 367.5 365.8C361.1 366.2 355.9 374.6 345.1 374C339.4 373.7 336.4 372 330.6 373.9C327.3 373.1 328.2 372.2 328.2 372.2',
          handDark: 'M319.7 372.9C320.8 377.4 326.7 375.2 330.6 373.9C336.4 372 339.4 373.7 345.1 374C352.2 374.4 360.3 368.5 364.5 365.9C362.6 365.3 357.3 366.8 355.4 365.8L355.4 366L346.3 366.5C348.4 364 350 364.3 349.7 360.5C349.6 360.7 348.5 361.1 348.4 361.3C347 363.3 345.5 363.9 342.4 365.1C333.9 368.5 330.9 371.6 328.2 372.2C324.6 373.1 321.4 372 319.7 372.9Z'
        };
        const PDFP = {};
        Object.keys(PDFB).forEach(k => { PDFP[k] = new Path2D(PDFB[k]); });

        // Mãos abertas do PDF Sem_título-2 (CorelDRAW): silhueta preta recortada por mão + palma, punho e brilhos dos dedos.
        // Ao colocar a mala no bin a mão atual se transforma nelas (palma aberta, dedos abertos, fingers para cima).
        const PDFN_SIL_D = ("M 420.578125 179.453125 C 424.894531 175.488281 431.632812 163.152344 436.628906 159.96875 C 442.054688 156.515625 437.402344 133.449219 447.488281 114.980469 C 449.167969 114.046875 450.367188 114.15625 452.433594 115.535156 C 454.15625 121.933594 451.375 123.078125 450.441406 128.898438 L 453.214844 125.8125 C 454.140625 124.578125 454.445312 124.003906 455.308594 122.496094 C 457.457031 118.824219 466.839844 96.167969 472.542969 103.867188 C 473.941406 105.757812 473.222656 106.972656 474.027344 109.007812 C 477.289062 100.558594 484.902344 99.46875 482.988281 111.085938 C 491.859375 106.621094 488.617188 116.707031 486.773438 120.953125 C 499.175781 115.898438 486.441406 135.265625 482.929688 140.769531 C 481.410156 142.253906 480.078125 143.941406 478.976562 145.789062 L 478.519531 145.734375 C 476.53125 149.5 473.105469 153.800781 470.738281 156.960938 C 464.890625 164.765625 464.527344 161.5 460.421875 165.652344 C 457.945312 168.15625 450.203125 185.703125 447.382812 190.605469 C 437.96875 206.960938 429.082031 222.339844 419.535156 237.871094 C 413.210938 248.160156 403.683594 266.890625 389.828125 265.65625 C 386.496094 265.359375 331.324219 244.292969 320.507812 242.03125 C 317.46875 259.3125 314.363281 276.140625 308.511719 292.433594 C 308.441406 292.628906 302.886719 307.070312 302.015625 305.320312 L 302.097656 322.234375 C 301.46875 329.84375 303.058594 329.054688 304.988281 335.554688 C 311.296875 356.796875 310.921875 386.335938 304.117188 407.511719 C 301.992188 414.128906 299.933594 412.941406 297.804688 416.3125 C 306.734375 440.539062 311.253906 466.359375 315.492188 493.425781 C 318.480469 512.503906 327.53125 558.988281 327.996094 574.644531 C 328.878906 604.558594 325.542969 634.191406 322.308594 663.457031 C 319.152344 691.980469 318.308594 722.773438 314.257812 750.671875 C 330.1875 750.019531 336.007812 752.433594 349.960938 756.570312 C 354.605469 757.949219 361.421875 760.109375 364.914062 762.484375 C 367.273438 764.09375 373.828125 775.644531 368.664062 776.914062 L 366.316406 777.417969 C 365.847656 777.46875 364.1875 777.472656 363.648438 777.472656 L 280.289062 777.359375 C 280 771.472656 280.429688 760.242188 282.527344 755.007812 L 289.460938 754.660156 C 285.113281 745.371094 284.335938 738.71875 284.742188 727.59375 C 285.839844 697.40625 283.882812 667.234375 283.449219 637.109375 C 283.171875 617.9375 285.898438 599.859375 289.023438 581.476562 C 290.027344 575.574219 288.128906 574.820312 286.253906 569.660156 L 274.917969 534.742188 C 271.453125 539.921875 269.488281 559.234375 268.1875 566.972656 C 267.226562 572.703125 266.363281 577.140625 263.984375 581.832031 C 261.386719 586.949219 259.300781 588.328125 256.972656 593.828125 C 254.15625 600.480469 246.246094 612 242.410156 617.261719 L 218.382812 650.230469 C 205 668.980469 173.628906 714.9375 162.152344 726.507812 C 166.898438 729.195312 172.226562 732.1875 176.230469 735.800781 C 180.394531 739.558594 183.363281 743.726562 186.761719 747.910156 C 195.09375 758.175781 203.234375 764.402344 195.582031 778.558594 C 191.453125 777.5 163.570312 759.113281 157.714844 755.234375 C 150.648438 750.554688 127.425781 734.742188 120.910156 732.5 C 122.5 725.242188 128.449219 718.539062 132.5 713.160156 C 136.214844 713.957031 136.824219 715.359375 140.121094 716.695312 C 140.167969 707.492188 142.796875 704.265625 146.679688 697.988281 L 174.371094 650.585938 C 187.539062 627.910156 196.945312 605.945312 212.132812 587.890625 C 227.542969 569.578125 226.472656 572.835938 227.695312 552.957031 C 228.675781 537.023438 229.054688 520.953125 229.671875 504.980469 C 231.347656 461.425781 232.53125 456.976562 239.261719 415.40625 C 233.398438 410.710938 233.617188 418.5 229.445312 404.769531 C 222.644531 382.390625 228.835938 355.773438 236.773438 334.730469 C 239.855469 326.554688 241.640625 329.136719 240.085938 320.046875 C 238.605469 311.433594 240.050781 308.4375 241.050781 300.945312 C 241.722656 295.917969 240.347656 299.824219 239.332031 293.421875 C 237.335938 280.855469 237.421875 256.054688 237.855469 243.476562 C 238.109375 236.082031 239.230469 230.679688 236.453125 224.007812 C 229.945312 208.375 232.101562 188.96875 243.304688 177.484375 C 246.980469 173.722656 249.261719 170.976562 254.550781 167.917969 L 268.355469 162.464844 C 273.128906 149.109375 266.875 146.609375 264.328125 133.765625 C 249.101562 56.890625 346.871094 58.9375 334.085938 122.648438 C 332.15625 132.257812 327.765625 140.773438 323.601562 148.269531 C 321.179688 152.628906 318.863281 155.46875 316.273438 159.042969 C 313.339844 163.097656 312.070312 164.90625 305.664062 166.238281 C 304.871094 176.910156 304.941406 172.566406 315.21875 186.902344 C 318.273438 191.164062 371.769531 213.589844 377.847656 215.960938 C 379.816406 211.269531 381.042969 203.960938 382.808594 198.453125 C 388.007812 182.214844 394.960938 166.527344 401.664062 151.25 L 409.234375 136.175781 C 410.132812 132.503906 408.824219 126.476562 410.855469 117.925781 C 412.003906 113.085938 414.34375 104.566406 416.308594 100.726562 C 418.3125 96.800781 423.429688 91.375 427.039062 89.726562 C 429.601562 88.558594 435.023438 87.929688 434.378906 93.148438 C 433.011719 97.429688 430.539062 123.296875 430.269531 129.402344 C 429.53125 146.019531 421.839844 170.195312 420.578125 179.453125 Z ");
        const PDFN_SIL = new Path2D(PDFN_SIL_D);
        const PDFN = {
            near: { clip: [436, 95, 64, 76], palm: new Path2D("M 444.914062 149.367188 C 447.050781 152.597656 459.628906 159.707031 463.140625 160.269531 C 466.171875 157.921875 475.550781 146.570312 476.714844 142.128906 C 474.425781 139.082031 459.644531 129.28125 454.636719 128.265625 C 452.171875 134.359375 446.484375 141.910156 444.914062 149.367188"), cuff: new Path2D("M 442.347656 160.972656 C 444.28125 163.945312 450.191406 167.011719 454.09375 168.203125 C 456.050781 166.59375 456.664062 165.171875 457.707031 162.941406 C 455.835938 160.640625 455.4375 160.847656 452.5 159.105469 C 449.675781 157.433594 448.792969 156.890625 445.949219 155.722656 Z M 442.347656 160.972656"),
                   hl: [new Path2D("M 465.136719 130.097656 C 468.25 130.023438 466.132812 131.609375 469.933594 125.371094 C 472.519531 121.125 480.003906 109.546875 480.332031 106.144531 C 477.554688 107.164062 477.363281 108.652344 475.820312 111.390625 C 474.496094 113.746094 473.59375 115.441406 472.214844 117.75 C 470.140625 121.230469 465.632812 126.292969 465.136719 130.097656"),new Path2D("M 473.058594 133.515625 C 475.589844 133.453125 473.867188 134.742188 476.960938 129.667969 C 479.066406 126.210938 485.152344 116.789062 485.421875 114.019531 C 483.160156 114.851562 483.003906 116.0625 481.75 118.292969 C 480.671875 120.207031 479.9375 121.585938 478.816406 123.464844 C 477.128906 126.296875 473.460938 130.417969 473.058594 133.515625"),new Path2D("M 479.914062 137.644531 C 481.820312 137.597656 480.523438 138.566406 482.851562 134.75 C 484.433594 132.152344 489.011719 125.066406 489.214844 122.984375 C 487.511719 123.609375 487.398438 124.519531 486.453125 126.195312 C 485.644531 127.636719 485.089844 128.671875 484.246094 130.085938 C 482.976562 132.214844 480.21875 135.3125 479.914062 137.644531"),new Path2D("M 457.574219 126.714844 C 459.589844 128.023438 459.785156 127.488281 462.457031 122.277344 C 464.277344 118.730469 470.441406 106.839844 469.007812 106.011719 C 467.203125 104.304688 457.769531 124.914062 457.574219 126.714844"),new Path2D("M 442.550781 139.421875 C 447.566406 139.277344 451.453125 118.667969 449.753906 117.9375 C 446.128906 113.152344 442.808594 137.113281 442.550781 139.421875")],
                   contact: [444, 140], wrist: [450, 162], fore: -0.98018 },
            far:  { clip: [406, 84, 31, 70], palm: new Path2D("M 413.09375 129.816406 L 425.570312 134.882812 C 426.664062 129.425781 426.378906 124.566406 427.082031 119.4375 C 427.449219 112.761719 433.109375 107.414062 429.066406 105.945312 C 426.40625 106.78125 427.402344 109.558594 423.441406 114.234375 C 413.023438 114.199219 432.945312 92.425781 430.542969 92.1875 C 423.492188 87.332031 410 118.523438 413.09375 129.816406"), cuff: new Path2D("M 411.824219 140.289062 C 415.183594 142.914062 420 144.324219 424.363281 144.964844 L 425.195312 138.394531 L 413.167969 134.027344 Z M 411.824219 140.289062"), hl: [],
                   contact: [424, 125], wrist: [418, 140], fore: -1.26274 }
        };
        // Pontos de ancoragem no PDF (centros das juntas e pontos de contato da mão)
        const PDFA = {
            hip: [211.34, 432.25], knee: [226.37, 567.87], ankle: [215.29, 703.03],
            shoulder: [211.2, 278.85], elbow: [225.43, 365.4], wrist: [310.95, 377.08],
            neck: [216.87, 244.35], neckN: [209.3, 246.1], head: [218.94, 211.07],
            handLift: [343, 366], handPush: [366, 367]      // palma sob a mala (sustenta) → ponta dos dedos (empurra)
        };
        const PDF_REF_H = 545;      // pt do PDF equivalentes à estatura (cm por pt = H / 545)

        // Matriz que leva o segmento A→B (PDF) ao segmento a→b (px): estica só ao longo do osso, largura uniforme (sWid)
        function pdfMatBone(A, B, a, b, sWid) {
            const lp = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ex = (B[0] - A[0]) / lp, ey = (B[1] - A[1]) / lp, fx = -ey, fy = ex;
            const lx = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / lx, uy = (b[1] - a[1]) / lx, wx = -uy, wy = ux, sl = lx / lp;
            const m = { a: sl * ux * ex + sWid * wx * fx, b: sl * uy * ex + sWid * wy * fx, c: sl * ux * ey + sWid * wx * fy, d: sl * uy * ey + sWid * wy * fy };
            m.e = a[0] - (m.a * A[0] + m.c * A[1]); m.f = a[1] - (m.b * A[0] + m.d * A[1]);
            return m;
        }
        // Semelhança (rotação + escala uniforme) ancorada: ponto A do PDF vai para a (px)
        function pdfMatSim(A, a, rot, s) {
            const c = Math.cos(rot) * s, n = Math.sin(rot) * s;
            const m = { a: c, b: n, c: -n, d: c };
            m.e = a[0] - (m.a * A[0] + m.c * A[1]); m.f = a[1] - (m.b * A[0] + m.d * A[1]);
            return m;
        }
        // Desenha uma peça: contorno preto (traço largo, só a metade externa aparece) + preenchimento
        function pdfPiece(ctx, key, M, fill, ow) {
            const P = new Path2D(); P.addPath(PDFP[key], M);
            ctx.save();
            ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = ow; ctx.strokeStyle = PDFM.edge;
            ctx.stroke(P);
            ctx.fillStyle = fill; ctx.fill(P, 'evenodd');
            ctx.restore();
        }
        // Braço completo (ombro → cotovelo → punho → mão). Todas as posições em px.
        //   o = { sh, el, hand, grip, kpx, ow, fill, gray }
        function pdfArm(ctx, o) {
            const A = PDFA, kpx = o.kpx, hs = 0.92;                         // mão levemente menor p/ caber no alcance do braço
            const g = Math.max(0, Math.min(1, o.grip || 0));
            const anc = [A.handLift[0] + (A.handPush[0] - A.handLift[0]) * g, A.handLift[1] + (A.handPush[1] - A.handLift[1]) * g];
            const angOld = Math.atan2(A.wrist[1] - A.elbow[1], A.wrist[0] - A.elbow[0]);
            // op: 0 = mão antiga (sob a mala) → 1 = mão aberta do PDF (palma e dedos abertos na face de trás da mala)
            const op = ergoSmooth((o.grip || 0) / 0.22), N = o.far ? PDFN.far : PDFN.near;
            const angFore = angOld + (N.fore - angOld) * op;
            const vx0 = (A.wrist[0] - anc[0]) + ((N.wrist[0] - N.contact[0]) - (A.wrist[0] - anc[0])) * op;
            const vy0 = (A.wrist[1] - anc[1]) + ((N.wrist[1] - N.contact[1]) - (A.wrist[1] - anc[1])) * op;
            let ang = Math.atan2(o.hand[1] - o.el[1], o.hand[0] - o.el[0]), wr = o.hand;
            for (let it = 0; it < 3; it++) {                                // punho = ponto de contato recuado ao longo da mão
                const rot = ang - angFore, c = Math.cos(rot), s = Math.sin(rot);
                const vx = vx0 * kpx * hs, vy = vy0 * kpx * hs;
                wr = [o.hand[0] + c * vx - s * vy, o.hand[1] + s * vx + c * vy];
                ang = Math.atan2(wr[1] - o.el[1], wr[0] - o.el[0]);
            }
            pdfPiece(ctx, 'upperArm', pdfMatBone(A.shoulder, A.elbow, o.sh, o.el, kpx), o.fill, o.ow);                 // braço
            pdfPiece(ctx, 'forearm', pdfMatBone(A.elbow, A.wrist, o.el, wr, kpx), o.fill, o.ow);                   // antebraço
            pdfPiece(ctx, 'elbowJ', pdfMatSim(A.elbow, o.el, 0, kpx), o.gray, o.ow);                               // cotovelo
            if (op < 0.999) {                                                                                       // mão antiga (some ao abrir)
                ctx.save(); ctx.globalAlpha = 1 - op;
                const Mh = pdfMatSim(A.wrist, wr, ang - angOld, kpx * hs);
                pdfPiece(ctx, 'wristJ', Mh, o.gray, o.ow);
                pdfPiece(ctx, 'hand', Mh, o.fill, o.ow);
                const D = new Path2D(); D.addPath(PDFP.handDark, Mh);
                ctx.fillStyle = PDFM.edge; ctx.fill(D, 'evenodd');
                ctx.restore();
            }
            if (op > 0.001) {                                                                                       // mão aberta do PDF (surge ao posicionar)
                ctx.save(); ctx.globalAlpha = op;
                drawOpenHand(ctx, wr, o.hand, kpx * hs * 1.15, o);   // dorso um pouco mais largo que o antebraço, como na referência
                ctx.restore();
            }
        }

        // Mão aberta no estilo da referência: punho (faixa), dorso quadrado, 4 dedos separados e polegar ao lado.
        // Cada peça: contorno escuro grosso + preenchimento claro (o contorno do dorso passa por cima da base dos dedos).
        // wr = punho (px), tip = ponto de contato com a mala (px), k = px por pt do PDF
        function drawOpenHand(ctx, wr, tip, k, o) {
            // inclinação leve no sentido do empurrão (para frente / para baixo na tela), proporcional ao apoio na traseira da mala
            const a = Math.atan2(tip[1] - wr[1], tip[0] - wr[0]) + 0.42 * Math.max(0, Math.min(1, o.grip || 0));
            const piece = (x, y, w, h, r, rot, fill) => {
                ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
                ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, -h / 2, w, h, r); else ctx.rect(0, -h / 2, w, h);
                ctx.lineJoin = 'round'; ctx.lineWidth = (o.ow || 3) / k; ctx.strokeStyle = PDFM.edge; ctx.stroke();
                ctx.fillStyle = fill; ctx.fill(); ctx.restore();
            };
            ctx.save(); ctx.translate(wr[0], wr[1]); ctx.rotate(a); ctx.scale(k, k);
            const PL = 22, PW = 25;                                         // dorso: comprimento × largura (pt do PDF)
            piece(7, -PW / 2 + 2, 17, 6.4, 3.2, -0.62, o.fill);            // polegar, aberto para o lado
            const FW = 5.0, GAP = 1.4, LEN = [17, 21, 20, 15];              // dedos: largura, vão e comprimento
            const y0 = -(4 * FW + 3 * GAP) / 2 + FW / 2;
            for (let i = 3; i >= 0; i--) piece(5 + PL - 6, y0 + i * (FW + GAP), LEN[i] + 6, FW, FW / 2, (i - 1.5) * 0.045, o.fill);
            piece(4, 0, PL, PW, 4, 0, o.fill);                              // dorso da mão
            piece(-1, 0, 7, PW - 3, 2, 0, o.gray);                          // punho
            ctx.restore();
        }




        window.ergoManikinRect = (W, H) => {   // onde o manequim (170 cm) fica no canvas: base dos pés, centro do corpo e altura em px
            const scale = Math.min((W - 34) / 172, (H - 96) / 207), offX = Math.max(26, (W - 172 * scale) / 2 + 10);
            return { cx: offX + (-17.5 + 32) * scale, floorY: H - 30, h: ERGO_PERCENTILES[0].h * scale, w: 34 * scale };
        };
        // Carga nas mãos e torque no ombro em cada instante.
        //   Alpha: até a mala apoiar no bin, as mãos sustentam o peso (Fg); depois o bin assume o peso e só resta empurrar
        //          (Bag 2: componente do peso ao longo da rampa de 17° = Fg·sen17°; Bag 1: atrito na base plana, μ = 0,30).
        //   Convencional (estimativa, pior caso): mesma postura e trajeto, sem rampa — as mãos sustentam o peso até a mala assentar.
        //   d = distância horizontal do ombro ao centro de massa (CG) da mala (braço de alavanca), mínimo 0,12 m.
        const ERGO_MU = 0.30;
        function ergoLoad(mode, plan, pose, lp, Fg, Ft) {
            const st = ergoStageName(plan, lp);
            // empurrão vale até a mão soltar a mala (depois disso entra o repouso abaixo), sem voltar para a etapa de transição
            const isPush = mode === 'alpha2' ? lp >= 0.58 : (st === 'Insert' || lp >= plan.tPlace);
            const isLift = !isPush && (st === 'Grip' || st.indexOf('Lift') === 0);
            const ls = 1 - pose.bag.release;
            const sup = mode === 'alpha2' ? ergoSmooth((lp - 0.44) / 0.12) : ergoSmooth((lp - 0.50) / 0.06);
            const Fs = mode === 'alpha2' ? Ft : ERGO_MU * Fg;
            const F = (Fg + (Fs - Fg) * sup) * ls;
            const rx = (pose.bag.x - pose.l5[0]) / 100, ry = (pose.bag.y - pose.l5[1]) / 100;   // r⃗ (m): L5/S1 → centro de massa da mala
            const d = Math.max(0.12, Math.abs(rx));                                            // H horizontal (m); M = r⃗ × F⃗ com F⃗ = (0, −F) ⇒ |M| = |rx|·F
            // Repouso / retorno: depois do encaixe (lp ≥ tPlace), quando a mão começa a soltar a mala (ls < 0,9) ou não há mais torque
            // (< 0,5 N·m), não existe carga no ombro: sem etapa de transição, sem alerta e sem braço de alavanca até a mala já guardada.
            const rest = lp >= plan.tPlace && (ls < 0.9 || F * d < 0.5);   // ls < 0,9: a mão já começou a se afastar da mala
            if (rest) return { st, isPush: false, isLift: false, rest, ls, F: 0, lbf: 0, d: 0, MO: 0, MOc: 0 };
            return { st, isPush, isLift, rest, ls, F, lbf: F / 4.4482216, d, MO: F * d, MOc: Fg * ls * d };
        }
        // Curva completa (tempo simulado → torque Alpha e convencional), calculada uma vez por estatura
        let ergoCurveCache = null;
        function ergoTorqueCurve(H, Fg, Ft, tBack, tFront) {
            const key = [H, Fg, Ft, tBack, tFront].join('|');
            if (ergoCurveCache && ergoCurveCache.key === key) return ergoCurveCache;
            const prof = ergoCADAlphaProfile(window.getUniAlphaGeometry());
            const T = tBack + tFront, fb = tBack / T, N = 360, pts = [];
            let pa = 0, pc = 0;
            for (let i = 0; i <= N; i++) {
                const p = i / N, inB = p < fb, mode = inB ? 'alpha2' : 'alpha1', lp = inB ? p / fb : (p - fb) / (1 - fb);
                const plan = ergoStowPlan(mode, prof, H), pose = ergoSolvePosture(H, plan, lp), L = ergoLoad(mode, plan, pose, lp, Fg, Ft);
                pts.push([p * T, L.MO, L.MOc]); pa = Math.max(pa, L.MO); pc = Math.max(pc, L.MOc);
            }
            return (ergoCurveCache = { key, T, pts, peakA: pa, peakC: pc, reduction: pc > 0 ? 1 - pa / pc : 0 });
        }
        window.ergoTorqueSummary = () => { const L = manikinState.last; if (!L) return null; const t = L.times[0]; return ergoTorqueCurve(ERGO_PERCENTILES[0].h, L.Fg, L.Ft, t.tA2, t.tA1); };

        // A Aba 6 mantém o manequim vetorial original (vermelho.pdf)
        // e usa apenas uma esfera de junta do modelo da Aba 5 no ombro.

        // Reutiliza EXATAMENTE o remapeamento da Aba 5 ao desenhar sua fuselagem,
        // poltronas e mecanismo da porta na Aba 6 (sem alterar os cálculos CAD).
        function withAba5CabinColors(fn) {
            const prev = [window.ERGO_DARK, window.BIN_SOLID, window.BIN_DARK, window.__dkRole];
            window.ERGO_DARK = false;
            window.BIN_SOLID = true;
            window.BIN_DARK = true;
            window.__dkRole = null;
            try { return fn(); }
            finally {
                window.ERGO_DARK = prev[0]; window.BIN_SOLID = prev[1];
                window.BIN_DARK = prev[2]; window.__dkRole = prev[3];
            }
        }

        // UMA única câmera virtual 2D: plano aberto -> dolly -> ângulo inferior
        // aproximado por panorâmica/zoom e leve inclinação -> retorno ao plano aberto.
        // Cada canal usa cubic ease-in-out e, portanto, não há cortes entre câmeras.
        const cineClamp = aphaClamp01;
        const cineEase = aphaEaseCubic;
        const cineWindow = (t, start, end) => cineEase((t-start) / Math.max(.001,end-start));
        function cinematicFrame(phase) {
            const tl = APHA_CINE_TIMELINE;
            // A câmera começa exatamente na projeção m4 entregue pela Aba 5,
            // e usa todo o restante do ciclo para dolly e retorno sem saltos.
            const seed = aphaInitialManikinPhase();
            const t = cineClamp((phase - seed) / (1 - seed)) * tl.duration;
            const dolly = cineWindow(t, tl.dolly.start, tl.dolly.end) *
                (1 - cineWindow(t, tl.dolly.reverseStart, tl.dolly.reverseEnd));
            const low = cineWindow(t, tl.lowAngle.start, tl.lowAngle.end) *
                (1 - cineWindow(t, tl.lowAngle.reverseStart, tl.lowAngle.reverseEnd));
            return {
                zoom: 1 + (tl.dolly.zoom-1)*dolly +
                    (tl.lowAngle.zoom-tl.dolly.zoom)*low,
                panX: tl.dolly.panX*dolly + (tl.lowAngle.panX-tl.dolly.panX)*low,
                panY: tl.dolly.panY*dolly + (tl.lowAngle.panY-tl.dolly.panY)*low,
                shearX: tl.lowAngle.shearX*low, shearY: tl.lowAngle.shearY*low,
                focus: cineClamp(dolly+low*.15)
            };
        }
        function drawManikinPanel(ctx, W, H, stature, mass, angleDeg, Fg, Fn, Ft, phase, tBack, tFront, title) {
            const cabin = window.cabinSectionReference;
            // Durante a inicialização, preservar a mesma fórmula m4 da Aba 5.
            const map = cabin ? cabin.map(W, H) : (() => {
                const sc = Math.min((W - 60) / 380, (H - 50) / 244), cx = W / 2;
                return { toX: x => cx + x * sc, toY: y => H - 22 - (y + 14) * sc, scale: sc };
            })();
            const { toX, toY, scale } = map;
            const R = cabin ? cabin.R : APHA_CABIN_GEOMETRY.fuselageRadiusCm;
            const centerY = cabin ? cabin.centerY : APHA_CABIN_GEOMETRY.fuselageCenterYCm;
            const aisle = cabin ? cabin.aisle : APHA_CABIN_GEOMETRY.aisleHalfWidthCm;

            // No canvas principal da Aba 6, a malha uniforme está no CSS
            // do viewport. Não desenhar outra grade, limitada às coordenadas
            // da cabine ou sujeita ao movimento da câmera. A Figura PNG
            // permanece transparente; no tour a grade pertence ao #tour-stage.
            if (!window.__mkExport) {
                const tourBackdrop = !!(ctx.canvas && (
                    ctx.canvas.id === 'apha-continuous-cabin' || ctx.canvas.closest('#tour-stage')));
                if (ctx.canvas && ctx.canvas.id !== 'aba6-manikinCanvas') {
                    drawUnifiedCabinBackground(ctx, W, H, {
                        tour: tourBackdrop, paint: false, toX, toY
                    });
                }
                if (cabin) withAba5CabinColors(() => cabin.drawShell(ctx, toX, toY, scale));
            }

            // Faixa real de circulação: mesmos 20" (50,8 cm) da Aba 5, entre
            // x=-25,4 e x=+25,4 cm. O retângulo vai do piso ao teto interno da
            // fuselagem neste vão, sempre na mesma projeção m4 (sem mudar escala).
            // Renderizado atrás dos bancos/manequim; exportação de passos permanece limpa.
            if (!window.__mkExport) {
                const aisleTopY = centerY + Math.sqrt(R * R - aisle * aisle);
                const xL = toX(-aisle), xR = toX(aisle);
                const yT = toY(aisleTopY), yB = toY(0);
                ctx.save();
                ctx.globalAlpha *= window.__aphaBridgeSeatsAlpha == null ? 1 : window.__aphaBridgeSeatsAlpha;
                ctx.fillStyle = 'rgba(67, 70, 151, 0.065)';
                ctx.fillRect(xL, yT, xR - xL, yB - yT);
                ctx.strokeStyle = 'rgba(112, 125, 215, 0.85)';
                ctx.lineWidth = 1.7;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(xL, yT, xR - xL, yB - yT);
                ctx.setLineDash([]);
                ctx.fillStyle = '#a4accb';
                ctx.font = '700 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('20" AISLE', toX(0), toY(aisleTopY - 9));
                ctx.restore();
            }

            // Cadeiras da Aba 5, reutilizadas diretamente pelo renderer original:
            // mesmas posições, dimensões, inclinação do encosto e escala real.
            // Apenas a camada "seats" fica ativa, sem passageiros ou cotas.
            // São desenhadas atrás do bin e do manequim em movimento.
            if (!window.__mkExport && typeof window.drawSeatedScene === 'function') {
                ctx.save();
                ctx.globalAlpha *= window.__aphaBridgeSeatsAlpha == null ? 1 : window.__aphaBridgeSeatsAlpha;
                withAba5CabinColors(() => window.drawSeatedScene(ctx, W, H, {
                    hAisle: stature, hWin: stature,
                    layers: { seats: 1, pax: 0, dims: 0 },
                    map: () => ({ toX, toY, scale })
                }));
                ctx.restore();
            }

            // O desenho e a porta rolante são exatamente os mesmos da aba 5.
            // A cinemática lê a linha de apoio desse CAD, sem redesenhar o bin
            // antigo sobre o novo. Porta aberta durante a estiva e fechada no fim.
            const prof = ergoCADAlphaProfile(window.getUniAlphaGeometry());
            const timeline = APHA_CINE_TIMELINE;
            // A abertura termina na Aba 5; não é repetida na Aba 6.
            const doorU = window.__aphaBridgeDoorU != null ? window.__aphaBridgeDoorU :
                1 - ergoSmooth((phase - timeline.doorClose.start / timeline.duration) /
                    ((timeline.doorClose.end - timeline.doorClose.start) / timeline.duration));
            withAba5CabinColors(() => window.drawUniReferenceBins(ctx, W, H,
                window.__aphaShowConventional !== false ? 1 : 0, 1, doorU));

            // Renderiza somente a cabine durante o movimento contínuo da câmera.
            if (window.__aphaOnlyCabin) return {tTotal: tBack + tFront, rest: true};
            const fracBack = tBack / (tBack + tFront);
            const inBackPhase = phase < fracBack;
            const mode = inBackPhase ? 'alpha2' : 'alpha1';
            const localPhase = inBackPhase ? phase / fracBack : (phase - fracBack) / (1 - fracBack);
            if (!inBackPhase) {
                drawRealisticSuitcase(ctx,
                    toX(prof.m2Cx), toY(prof.m2Cy),
                    prof.m2W * scale, prof.m2H * scale,
                    prof.rad17, '', '', true);
            }
            const plan = ergoStowPlan(mode, prof, stature);
            const pose = ergoSolvePosture(stature, plan, localPhase);
            const bagCx = pose.bag.x, bagCy = pose.bag.y;
            const currentBagAngleRad = pose.bag.a * Math.PI / 180;
            const [ankleX, ankleY] = pose.ankle, [kneeX, kneeY] = pose.knee, [hipX, hipY] = pose.hip;
            const [shoulderX, shoulderY] = pose.shoulder, [headX, headY] = pose.head;
            const arm = pose.arm, armFar = pose.armFar;
            const handX = arm.hx, handY = arm.hy, elbowX = arm.ex, elbowY = arm.ey;

            // Manequim articulado montado com as peças vetoriais de vermelho.pdf
            const KPX = (stature / PDF_REF_H) * scale;                 // px por pt do PDF
            const OW = Math.max(2.2, 5.2 * KPX);                       // espessura do traço (metade externa = contorno preto)
            const Pp = (x, y) => [toX(x), toY(y)];
            const hipP = Pp(hipX, hipY), kneeP = Pp(kneeX, kneeY), shP = Pp(shoulderX, shoulderY);
            const A = PDFA;

            // Entrada do manequim inicia enquanto a porta ainda está abrindo.
            // Translation/fade/easing são só de desenho; postura/torque permanecem intactos.
            const visualT = cineClamp(phase) * APHA_CINE_TIMELINE.duration;
            const arrival = cineWindow(visualT, APHA_CINE_TIMELINE.enter.start, APHA_CINE_TIMELINE.enter.end);
            ctx.save();
            ctx.translate(-APHA_CINE_TIMELINE.enter.travelPx * scale * (1-arrival), 0);
            ctx.globalAlpha *= APHA_CINE_TIMELINE.enter.minAlpha +
                (1-APHA_CINE_TIMELINE.enter.minAlpha)*arrival;
            if (window.__aphaBridgeManikinAlpha != null)
                ctx.globalAlpha *= window.__aphaBridgeManikinAlpha;

            // braço distante (atrás do corpo, tom mais escuro)
            pdfArm(ctx, { sh: Pp(shoulderX - 1.0, shoulderY - 0.6), el: Pp(armFar.ex, armFar.ey), hand: Pp(armFar.hx, armFar.hy),
                grip: pose.bag.grip, kpx: KPX, ow: OW, fill: PDFM.far, gray: PDFM.farGray, far: true });

            // pernas (apoio + perna de trás do passo). O tornozelo "desenhado" fica FT_DY acima da sola (como no PDF),
            // deslocado ao longo da canela; o pé gira até a ponta tocar o piso quando o calcanhar sobe.
            const FT_DX = 52.0 * stature / PDF_REF_H, FT_DY = 23.6 * stature / PDF_REF_H;
            const drawLeg = (aX, aY, kX, kY) => {
                const kP = Pp(kX, kY);
                const sx = kX - aX, sy = kY - aY, sl = Math.hypot(sx, sy) || 1, dAnk = FT_DY - 4.0;
                const dAx = aX + sx / sl * dAnk, dAy = aY + sy / sl * dAnk;
                let phiD = 0;
                if (dAy > FT_DY + 0.05) {
                    let lo = 0, hi = 1.14;
                    for (let q = 0; q < 30; q++) { const mid = (lo + hi) / 2; if (FT_DX * Math.sin(mid) + FT_DY * Math.cos(mid) < dAy) lo = mid; else hi = mid; }
                    phiD = (lo + hi) / 2;
                }
                const dAnkP = Pp(dAx, dAy);
                pdfPiece(ctx, 'foot', pdfMatSim(A.ankle, dAnkP, phiD, KPX), PDFM.fill, OW);
                pdfPiece(ctx, 'shin', pdfMatBone(A.knee, A.ankle, kP, dAnkP, KPX), PDFM.fill, OW);
                pdfPiece(ctx, 'ankleJ', pdfMatSim(A.ankle, dAnkP, 0, KPX), PDFM.gray, OW);
                pdfPiece(ctx, 'thigh', pdfMatBone(A.hip, A.knee, hipP, kP, KPX), PDFM.fill, OW);
                pdfPiece(ctx, 'kneeJ', pdfMatSim(A.knee, kP, 0, KPX), PDFM.gray, OW);
            };
            drawLeg(ankleX, ankleY, kneeX, kneeY);                                           // perna de apoio (pé plano)
            drawLeg(pose.ankleR[0], pose.ankleR[1], pose.kneeR[0], pose.kneeR[1]);   // perna de trás (sempre visível: parte da posição da perna de apoio e inclina p/ trás)

            // tronco: pelve, costas, miolo do peito, peito, faixa da cintura, junta do quadril
            const Mt = pdfMatBone(A.hip, A.shoulder, hipP, shP, KPX);
            // tronco revetorizado (Sem_título-5.pdf): costas → peito → faixa da cintura → pelve → junta do quadril
            pdfPiece(ctx, 'chestBack', Mt, PDFM.fill, OW);
            pdfPiece(ctx, 'chestFront', Mt, PDFM.fill, OW);
            pdfPiece(ctx, 'waist', Mt, PDFM.gray, OW);
            pdfPiece(ctx, 'pelvis', Mt, PDFM.fill, OW);
            pdfPiece(ctx, 'hipJ', pdfMatSim(A.hip, hipP, 0, KPX), PDFM.gray, OW);

            // pescoço e cabeça (a cabeça inclina em torno da base do pescoço para olhar a mala)
            const hdP = Pp(headX, headY), nl = Math.hypot(hdP[0] - shP[0], hdP[1] - shP[1]) || 1;
            const neckLen = (A.shoulder[1] - A.neck[1]) * KPX;
            const neckP = [shP[0] + (hdP[0] - shP[0]) / nl * neckLen, shP[1] + (hdP[1] - shP[1]) / nl * neckLen];
            {   // coluna do pescoço até a bola do ombro + fechamento da linha de peito/costas (trapézio)
                const rB = stature * 0.052 * 0.74 * scale;
                let ux = shP[0] - hipP[0], uy = shP[1] - hipP[1]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
                let nx = -uy, ny = ux; if (nx < 0) { nx = -nx; ny = -ny; }          // normal voltada para a frente (lado do bin)
                const q = (b, kx, ku) => [b[0] + nx * kx + ux * ku, b[1] + ny * kx + uy * ku];
                const nw = rB * 0.42, Bk = q(neckP, -nw, 0), Fr = q(neckP, nw, 0);   // topo do pescoço (costas / frente)
                const Cs = q(shP, -rB * 1.38, -rB * 0.05), Ds = q(shP, rB * 1.42, -rB * 0.05);          // ombro (costas / frente)
                const Cl = q(shP, -rB * 1.38, -rB * 1.5), Dl = q(shP, rB * 1.42, -rB * 1.5);
                const cB = q(shP, -rB * 0.85, rB * 0.55), cF = q(shP, rB * 0.85, rB * 0.55);   // curvatura do trapézio
                const poly = new Path2D();
                poly.moveTo(Bk[0], Bk[1]); poly.quadraticCurveTo(cB[0], cB[1], Cs[0], Cs[1]); poly.lineTo(Cl[0], Cl[1]);
                poly.lineTo(Dl[0], Dl[1]); poly.lineTo(Ds[0], Ds[1]); poly.quadraticCurveTo(cF[0], cF[1], Fr[0], Fr[1]); poly.closePath();
                const edge = new Path2D();
                edge.moveTo(Cs[0], Cs[1]); edge.quadraticCurveTo(cB[0], cB[1], Bk[0], Bk[1]);
                edge.moveTo(Ds[0], Ds[1]); edge.quadraticCurveTo(cF[0], cF[1], Fr[0], Fr[1]);
                ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = OW; ctx.strokeStyle = PDFM.edge;
                ctx.stroke(edge); ctx.fillStyle = PDFM.fill; ctx.fill(poly); ctx.restore();
            }
            pdfPiece(ctx, 'neck', pdfMatSim(A.neckN, neckP, pose.neckTilt, KPX), PDFM.gray, OW);
            pdfPiece(ctx, 'head', pdfMatSim(A.neck, neckP, -pose.headPitch, KPX), PDFM.fill, OW);

            // Segunda mala: fade-in apenas na fase de pega baixa; a primeira
            // permanece apoiada no bin, sem teleporte entre os dois ciclos.
            ctx.save();
            ctx.globalAlpha *= pose.bag.alpha;
            // Mala (rótulo sempre na horizontal, mesmo com a mala girando)
            drawRealisticSuitcase(
                ctx,
                toX(bagCx),
                toY(bagCy) + (() => {
                    const b = APHA_CINE_TIMELINE.settle;
                    const u = cineClamp((localPhase-b.startPhase)/b.durationPhase);
                    return u > 0 && u < 1 ? Math.sin(u*2*Math.PI)*(1-u)*b.amplitudePx*scale : 0;
                })(),
                plan.w * scale,
                plan.h * scale,
                currentBagAngleRad,
                '', '',
                true
            );
            ctx.restore();

            // Braço próximo: ombro → cotovelo → mão (sobre a mala)
            pdfArm(ctx, { sh: shP, el: Pp(elbowX, elbowY), hand: Pp(handX, handY),
                grip: pose.bag.grip, kpx: KPX, ow: OW, fill: PDFM.fill, gray: PDFM.gray });

            // ÚNICO acabamento novo sobre o boneco original:
            // esfera preenchida idêntica às juntas da Aba 5, cobrindo a
            // pequena folga entre o braço e o tronco sem anéis nem forças.
            drawDummyJointBall(
                ctx, shP[0], shP[1],
                Math.max(3.5, stature * 0.052 * 0.74 * scale)
            );
            ctx.restore(); // manikin entrance; fuselage and aisle remain fixed

            // Mantém os cálculos para os cartões externos/exports sem desenhar telemetria.
            const ld = ergoLoad(mode, plan, pose, localPhase, Fg, Ft);
            const finished = phase >= 0.999, atRest = ld.rest || finished;
            if (!window.__mkExport && !window.__aphaBridgeMinimalHUD) {
                // Feedback de tensão (emissão): ombro (elevação ≥ 95° âmbar / ≥ 135° vermelho) e lombar (compressão L5/S1 vs NIOSH 3400 N)
                const trunkW = 0.4 * 78 * Math.pow(stature / 175, 2) * 9.81;
                const FcL5 = ld.rest ? trunkW : ld.MO / 0.05 + ld.F + trunkW;
                const glow = (x, y, r, v) => {
                    if (v < 0.7) return;
                    const c = v >= 1 ? '255,61,113' : '255,145,0', a = Math.min(0.8, 0.25 + 0.6 * (v - 0.7));
                    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
                    gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
                    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr;
                    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.restore();
                };
                const gR = stature * 0.11 * scale;
                glow(hipP[0] + (shP[0] - hipP[0]) * 0.12, hipP[1] + (shP[1] - hipP[1]) * 0.12, gR, FcL5 / 3400);
                // Ocupação do corredor no piso 3D da cabine: barra ligada ao relógio BOARDING TIME + marca do tempo convencional
                const tTot = tBack + tFront, el = Math.min(1, Math.max(0, phase)), tC = manikinState.calcT_Emb;
                const x0 = toX(-aisle), x1 = toX(aisle), yF = toY(0) + 5, hB = Math.max(3, 3.2 * scale);
                ctx.save();
                ctx.fillStyle = 'rgba(148,163,184,0.25)'; ctx.fillRect(x0, yF, x1 - x0, hB);
                ctx.fillStyle = el < 0.5 ? '#00e5ff' : el < 0.85 ? '#ff9100' : '#ff3d71';
                ctx.fillRect(x0, yF, (x1 - x0) * el, hB);
                if (tC > 0 && tTot > 0) {
                    const mx = x0 + (x1 - x0) * Math.min(1, tC / tTot);
                    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(mx - 1, yF - 2, 2, hB + 4);
                    ctx.font = '600 9px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STD', mx, yF + hB + 10);
                }
                ctx.restore();
            }
            if (!window.__mkExport && !window.__aphaBridgeMinimalHUD) {
                ctx.save();
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                const reserved = Math.min(212, Math.max(166, W * 0.30));
                const maxW = Math.max(90, W - reserved - 44);
                let fontSize = 22;
                do {
                    ctx.font = `800 ${fontSize}px "Inter", sans-serif`;
                    if (ctx.measureText(title).width <= maxW || fontSize <= 12) break;
                    fontSize -= 1;
                } while (true);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(title, 8, 26);
                ctx.restore();
            }
            return {
                dMeters: ld.d, MO: ld.MO, F: ld.F, lbf: ld.lbf, shAngle: pose.shAngle,
                heelLift: pose.heel, reachable: pose.reachable,
                stage: finished ? 'Done' : ergoStageName(plan, localPhase),
                tTotal: tBack + tFront, rest: atRest
            };
        }

        function drawManikinFallback(ctx, W, H, phase, tBack, tFront, drawCabin = false) {
            // Fallback compartilhado pelo viewport e pelo canvas contínuo.
            // Cobre as DUAS malas e mantém o braço em retorno até o fim do ciclo.
            const clamp = aphaClamp01;
            const ease = ergoSmooth;
            const ratio = tBack / (tBack + tFront);
            const split = Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : .5;
            const second = phase >= split;
            const u = clamp(second ? (phase - split) / (1 - split) : phase / split);
            let map = null;
            try {
                if (window.cabinSectionReference) map = window.cabinSectionReference.map(W, H);
            } catch (_) { /* O fallback não deve depender de geometria CAD. */ }
            if (!map || !Number.isFinite(map.scale) || typeof map.toX !== 'function' || typeof map.toY !== 'function') {
                const sc = Math.min((W - 60) / 380, (H - 50) / 244), cx = W / 2;
                map = { toX: x => cx + x * sc, toY: y => H - 22 - (y + 14) * sc, scale: sc };
            }
            const { toX, toY, scale } = map;
            const P = (x, y) => [toX(x), toY(y)];
            const start = second ? [9.8, 97.5] : [9.5, 95.0];
            const end = second ? [38.0, 167.2] : [70.2, 155.0];
            const lift = ease((u - .10) / .43);
            const push = ease((u - .52) / .32);
            const release = ease((u - .84) / .16);
            const bagX = start[0] + (end[0] - start[0]) * (.48 * lift + .52 * push);
            const bagY = start[1] + (160 - start[1]) * lift + (end[1] - 160) * push;
            const bagAng = second ? 4.5 * push : -90 + 106.3 * push;

            const drawBag = (x, y, w, h, angle, alpha = 1) => {
                const [px, py] = P(x, y);
                ctx.save();
                ctx.globalAlpha *= alpha;
                ctx.translate(px, py);
                ctx.rotate(-angle * Math.PI / 180);
                const bw = w * scale, bh = h * scale;
                ctx.fillStyle = 'rgba(67,70,151,.83)';
                ctx.strokeStyle = '#c8d1e9';
                ctx.lineWidth = Math.max(1.5, 2 * scale);
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(-bw/2, -bh/2, bw, bh, Math.max(2, 4*scale));
                else ctx.rect(-bw/2, -bh/2, bw, bh);
                ctx.fill(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-bw*.16, -bh/2); ctx.lineTo(-bw*.16, -bh/2 - 5*scale);
                ctx.lineTo(bw*.16, -bh/2 - 5*scale); ctx.lineTo(bw*.16, -bh/2);
                ctx.stroke();
                ctx.restore();
            };

            ctx.save();
            if (drawCabin) {
                const R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;
                const centerY = APHA_CABIN_GEOMETRY.fuselageCenterYCm;
                ctx.strokeStyle = '#71839f'; ctx.lineWidth = Math.max(1.5, 2*scale);
                ctx.beginPath();
                for (let x = -R; x <= R; x += 3) {
                    const pos = P(x, centerY + Math.sqrt(Math.max(0, R*R-x*x)));
                    if (x === -R) ctx.moveTo(...pos); else ctx.lineTo(...pos);
                }
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(...P(-126, 0)); ctx.lineTo(...P(126, 0)); ctx.stroke();
                ctx.fillStyle = 'rgba(74,144,226,.24)';
                ctx.fillRect(toX(25), toY(192), 83*scale, 43*scale);
                ctx.strokeRect(toX(25), toY(192), 83*scale, 43*scale);
            }

            // A primeira mala continua visível durante a entrada da segunda.
            if (second) drawBag(70.2, 155, 33.2, 22.8, 16.3);
            const shoulderX = -7 + 3*push*(1-release), shoulderY = 121;
            const gripX = bagX - 9, gripY = bagY - 3;
            const handX = gripX + (4 - gripX)*release;
            const handY = gripY + (98 - gripY)*release;
            const segment = (x1,y1,x2,y2,width=5) => {
                ctx.beginPath(); ctx.moveTo(...P(x1,y1));ctx.lineTo(...P(x2,y2));
                ctx.lineWidth = Math.max(3,width*scale);ctx.stroke();
            };
            ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d6d9e1';
            segment(-13,77,-17,40,8); segment(-17,40,-18,3,7);
            segment(-13,77,-8,40,8); segment(-8,40,-4,3,7);
            segment(-13,77,shoulderX,shoulderY,11);
            segment(shoulderX,shoulderY,shoulderX+(handX-shoulderX)*.53-5,
                shoulderY+(handY-shoulderY)*.48,5);
            segment(shoulderX+(handX-shoulderX)*.53-5,
                shoulderY+(handY-shoulderY)*.48,handX,handY,5);
            ctx.fillStyle='#d6d9e1';
            ctx.beginPath();ctx.arc(...P(shoulderX-2,140),Math.max(5,7*scale),0,Math.PI*2);ctx.fill();
            drawBag(bagX,bagY,second?23.2:33.2,second?34.8:22.8,bagAng,
                second?ease(u/.10):1);
            ctx.restore();
        }

        function drawManikinViewport(mass, angleDeg, Fg, Fn, Ft, phase, times) {
            const canvas = document.getElementById('aba6-manikinCanvas');
            if (!canvas) return;
            // Durante a ponte da Simulação Completa, só o canvas contínuo pinta.
            // Os cálculos continuam, mas não redesenhamos o viewport oculto.
            if (window.__aphaTourBridgeActive && canvas.closest('#tour-stage')) return;
            const rect = canvas.parentElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const dpr = window.devicePixelRatio || 1;
            const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
            }
            const ctx = canvas.getContext('2d');
            // reset() também descarta o stack de ctx.save() se o renderer
            // anterior lançou erro antes de restaurar o estado do canvas.
            if (typeof ctx.reset === 'function') ctx.reset();
            else {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const W = rect.width, H = rect.height;
            // Transparente na aba individual: o CSS desenha a malha em toda
            // a extensão do cartão. Na Aba 8, a pintura fixa é do #tour-stage.
            drawUnifiedCabinBackground(ctx, W, H, {
                tour: !!canvas.closest('#tour-stage'), paint: false
            });

            // O relógio é único: a fase global é a fração do ciclo do percentil mais lento.
            // Cada manikin termina no seu próprio tempo e aguarda os demais.
            const Tmax = Math.max(...times.map(t => t.tA1 + t.tA2));
            const panelW = W / ERGO_PERCENTILES.length;
            const camera = cinematicFrame(phase);
            ERGO_PERCENTILES.forEach((p, i) => {
                const t = times[i];
                const localPhase = Math.min(1, phase * Tmax / (t.tA1 + t.tA2));
                ctx.save();
                ctx.beginPath(); ctx.rect(i * panelW, 0, panelW, H); ctx.clip();
                ctx.translate(i * panelW, 0);
                // Matriz afim: dolly-in + pan + segundo enquadramento baixo, sem corte.
                ctx.translate(panelW * (.5+camera.panX), H * (.5+camera.panY));
                ctx.transform(1, camera.shearY, camera.shearX, 1, 0, 0);
                ctx.scale(camera.zoom, camera.zoom);
                ctx.translate(-panelW*.5, -H*.5);
                let st;
                try {
                    st = drawManikinPanel(ctx, panelW, H, p.h, mass, angleDeg, Fg, Fn, Ft, localPhase, t.tA2, t.tA1, '5th Percentile Female');
                } catch (err) {
                    // Preserve a visible passenger and moving carry-on even if a CAD
                    // geometry/path fails. Do not allow one failed frame to freeze the tour.
                    if (!window.__aphaErgoRenderWarning) {
                        console.error('Biomechanical passenger render:', err);
                        window.__aphaErgoRenderWarning = true;
                    }
                    drawManikinFallback(ctx, panelW, H, localPhase, t.tA2, t.tA1, true);
                    st = {tTotal: t.tA2 + t.tA1};
                }
                ctx.restore();
                return st;
            });
            // divisórias entre painéis
            ctx.save();
            ctx.strokeStyle = '#434697'; ctx.lineWidth = 1.5;
            for (let i = 1; i < ERGO_PERCENTILES.length; i++) {
                ctx.beginPath(); ctx.moveTo(i * panelW, 0); ctx.lineTo(i * panelW, H); ctx.stroke();
            }
            ctx.restore();


            // Timer cards intentionally omitted; physics and animation timing stay active.
        }

        const dismissCards = () => {
            if (!manikinState.cardsShown) return;
            hideCards();
            const next = manikinState.onCardsClosed; manikinState.onCardsClosed = null;
            if (next) next();
        };

        const ergoOverlayEl = document.getElementById('ergo-overlay');   // overlay de resultados removido; mantido opcional
        if (ergoOverlayEl) ergoOverlayEl.addEventListener('click', dismissCards);

        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismissCards(); });

                
