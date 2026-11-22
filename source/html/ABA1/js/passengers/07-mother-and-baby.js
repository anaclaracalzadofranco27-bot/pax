        // ============================================================================
        // MÃE E BEBÊ (BONECO 3) - REDESENHO no mesmo estilo do viajante e do senhor (lofts + cor chapada + tinta + luz em faixas)
        // Casaco comprido verde-oliva com lapelas e bolsos de aba, calça cinza justa, botas marrons, cabelo castanho-escuro longo e ondulado
        // em mechas, rosto preocupado olhando para o bebê; bebê dormindo enrolado na manta bege e azul no braço esquerdo; mala vermelha de
        // rodinhas com a haste estendida na mão direita. Texturas pintadas do casaco, da calça, do rosto e da manta são reaproveitadas.
        // ============================================================================
        // abertura frontal do casaco: começa na cintura (y0, fração da altura do casaco) e alarga até a barra (meia-largura em u)
        const MOM_OPEN = { y0: 0.57, hw: y => 0.010 + 0.062 * Math.pow(Math.max(0, (y - 0.57) / 0.43), 0.8) };
        const MOM = { coat: '#5d6943', coatD: '#495334', pants: '#474f57', boot: '#5c3a27', bootD: '#3b2417', skin: '#e5b299', hair: '#4a2a1e', hairHi: '#6a4231', hairSh: '#2f1910', red: '#b83b32', redD: '#8c2720' };
        const MTX = {
            torso: { ...PT.coatTorso, fill: MOM.coat, fn: (g, W, H, fl) => {
                PT.coatTorso.fn(g, W, H, fl);
                // tinta nas bordas da abertura (as abas do casaco), conforme MOM_OPEN
                [1, -1].forEach(sg => {
                    const pts = []; for (let i = 0; i <= 12; i++) { const y = MOM_OPEN.y0 + (1 - MOM_OPEN.y0) * i / 12; pts.push([sg > 0 ? MOM_OPEN.hw(y) : 1 - MOM_OPEN.hw(y), y]); }
                    for (let i = 0; i < 12; i++) inkTaper(g, W, H, pts[i], [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2], pts[i + 1], 9);
                    inkTaper(g, W, H, [sg > 0 ? 0.02 : 0.98, MOM_OPEN.y0 - 0.06], [sg > 0 ? 0.016 : 0.984, MOM_OPEN.y0 - 0.02], pts[0], 7);
                });
            } }, sleeve: { ...PT.coatSleeve, fill: MOM.coat }, forearm: { ...PT.coatForearm, fill: MOM.coat },
            pelvis: { ...PT.pantsPelvis, fill: MOM.pants }, thigh: { ...PT.pantsThigh, fill: MOM.pants }, calf: { ...PT.pantsCalf, fill: MOM.pants },
            // cabelo liso: base castanha, faixas suaves de luz e sombra ao longo dos fios e poucos traços de tinta
            hair: { w: 512, h: 512, fn: (g, W, H) => {
                g.fillStyle = MOM.hair; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 14; k++) { const u0 = (k + 0.5) / 14, sw = 0.012 * Math.sin(k * 2.3); inkTaper(g, W, H, [u0, 0.0], [u0 + sw, 0.5], [u0 + sw * 1.5, 1.0], k % 2 ? 16 : 11, k % 2 ? MOM.hairHi : MOM.hairSh); }
                for (let k = 0; k < 7; k++) { const u0 = (k + 0.25) / 7; inkTaper(g, W, H, [u0, 0.05], [u0 + 0.01, 0.5], [u0 + 0.004, 0.95], 3); }
            } }
        };

        // bebê dormindo enrolado na manta (mesmo desenho de antes; materiais etiquetados para a luz em faixas)
        // Bebê enrolado na manta, em pé contra o peito da mãe (coordenadas do tronco): cabeça no alto do peito esquerdo, rosto virado
        // para a direita dela (esquerda da tela); manta bege por dentro e azul por fora (capuz atrás da cabeça e aba caindo pela frente).
        const BABY = { H: [0.098, 0.300, 0.128], A: [0.45, 0.88, -0.17], F: [-0.45, 0.10, 0.89], K: 1.0 };
        const babyTex = { w: 512, h: 512, fn: (g, W, H) => {
            // u: 0 = frente (para fora do peito), 0.25 = esquerda dela, 0.5 = encostado no peito, 0.75 = direita dela. y = 0 no pescoço, 1 nos pés
            g.fillStyle = '#dcc8a6'; g.fillRect(0, 0, W, H);
            const SHB = '#c2ab86', BL = BLANKET_B, BLS = '#a9c1d3';
            // dobras da manta bege enrolando o corpo (diagonais) e o fundo dobrado
            [[0.05, 0.30, 0.30, 0.62], [0.12, 0.48, 0.40, 0.80], [0.30, 0.25, 0.55, 0.55], [0.38, 0.62, 0.62, 0.92], [0.55, 0.30, 0.68, 0.60]].forEach(([u0, v0, u1, v1]) => {
                inkTaper(g, W, H, [u0, v0], [(u0 + u1) / 2 + 0.03, (v0 + v1) / 2], [u1, v1], 7, SHB);
                inkTaper(g, W, H, [u0 + 0.01, v0 + 0.01], [(u0 + u1) / 2 + 0.035, (v0 + v1) / 2 + 0.01], [u1 - 0.02, v1 - 0.01], 3);
            });
            inkTaper(g, W, H, [0.0, 0.93], [0.25, 0.97], [0.5, 0.93], 4);
            // manta azul por fora: faixa em volta dos ombros (borda inferior em diagonal) e aba que desce pela frente-direita
            const band = [];
            for (let i = 0; i <= 24; i++) { const u = -0.25 + i / 24 * 1.0; band.push([u, 0.20 + 0.10 * Math.sin((u + 0.25) * Math.PI)]); }
            inkPoly(g, W, H, [[-0.25, 0], [0.75, 0]].concat(band.slice().reverse()), BL, true, 4);
            inkPoly(g, W, H, [[0.64, 0.10], [0.70, 0.45], [0.74, 0.72], [0.82, 0.88], [0.92, 0.86], [1.00, 0.70], [1.04, 0.40], [1.02, 0.12]], BL, true, 4);
            inkTaper(g, W, H, [0.80, 0.25], [0.84, 0.55], [0.86, 0.80], 6, BLS);
            inkTaper(g, W, H, [0.92, 0.20], [0.95, 0.45], [0.96, 0.70], 5, BLS);
            inkTaper(g, W, H, [0.20, 0.08], [0.28, 0.16], [0.38, 0.22], 5, BLS);
        } };
        function buildMotherBaby() {
            const tag = (m, cls) => { const c = m.clone(); c.userData.lit = cls; return c; };
            const blue = tag(swaddleBlueMat, 'blanket'); blue.side = THREE.DoubleSide;
            const V = a => new THREE.Vector3(...a);
            const H = V(BABY.H), A = V(BABY.A).normalize(), K = BABY.K;
            // base da manta: y = eixo do corpo (para a cabeça), z = para fora do peito, x = lateral
            const zb = new THREE.Vector3(0, 0, 1).addScaledVector(A, -A.z).normalize(), xb = new THREE.Vector3().crossVectors(A, zb).normalize();
            const babyGroup = new THREE.Group();
            const body = new THREE.Group();
            body.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xb, A, zb));
            body.position.copy(H).addScaledVector(A, -0.075 * K);
            body.scale.setScalar(K);
            babyGroup.add(body);
            // corpo enrolado: macio, mais largo no meio, "apertado" onde o antebraço da mãe abraça (a ≈ -0.11), fundo arredondado e um pouco para fora
            body.add(tvLoft([
                { a: 0.020, w: 0.042, d: 0.040 }, { a: -0.020, w: 0.072, d: 0.062 }, { a: -0.075, w: 0.094, d: 0.074, c: 0.004 }, { a: -0.140, w: 0.096, d: 0.058, c: -0.004 },
                { a: -0.200, w: 0.096, d: 0.074, c: 0.006 }, { a: -0.270, w: 0.086, d: 0.070, c: 0.010, cx: -0.006 }, { a: -0.320, w: 0.064, d: 0.056, c: 0.012, cx: -0.010 },
                { a: -0.345, w: 0.030, d: 0.028, c: 0.012, cx: -0.012 }
            ], tvLit(paintedMat(babyTex), 'blanket'), { seg: 32, rings: 44, capStart: true, capEnd: true }));
            // cabeça (rosto pintado, dormindo): +z do rosto aponta para F, alto da cabeça para o eixo do corpo
            const F = V(BABY.F).addScaledVector(A, -V(BABY.F).dot(A)).normalize(), xh = new THREE.Vector3().crossVectors(A, F).normalize();
            const headG = new THREE.Group();
            headG.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xh, A, F));
            headG.position.copy(H);
            headG.scale.setScalar(K * 1.12);
            babyGroup.add(headG);
            const babyHead = new THREE.Mesh(buildBabyHeadGeometry(), tvLit(paintedMat(PT.babyFace), 'skin'));
            babyHead.castShadow = true; headG.add(babyHead);
            {   // cabelo curtinho castanho-claro cobrindo o alto da cabeça (franja um pouco mais baixa na testa) e três mechinhas no topo, viradas para a frente
                const BTL = Math.PI * 0.66, bg = new THREE.SphereGeometry(1, 36, 22, 0, Math.PI * 2, 0, BTL), bp = bg.attributes.position;
                for (let k = 0; k < bp.count; k++) {
                    const x = bp.getX(k), y = bp.getY(k), z = bp.getZ(k);
                    const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                    let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));
                    const ap = Math.abs(psi), thMax = Math.PI * (0.28 + 0.24 * hsm(0.5, 2.6, ap) + 0.025 * Math.sin(psi * 9 + 2));
                    const th2 = (th / BTL) * thMax, st = Math.sin(th2);
                    const q = babyHeadPoint(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st);
                    bp.setXYZ(k, q[0] * 1.04, q[1] * 1.04, q[2] * 1.04);
                }
                bg.computeVertexNormals();
                const hairM = tvLit(paintedMat(PT.hairB), 'blonde');
                const cap = new THREE.Mesh(bg, hairM);
                cap.castShadow = true; headG.add(cap);
                [[-0.42, 0.30, 0.95], [0.0, 0.24, 1.15], [0.40, 0.32, 0.9]].forEach(([sx, th, k]) => {   // mechinhas: elipsoides deitados no couro cabeludo
                    const q = babyHeadPoint(sx * Math.sin(th), Math.cos(th), Math.sqrt(Math.max(0, 1 - sx * sx)) * Math.sin(th));
                    const lock = new THREE.Mesh(new THREE.SphereGeometry(0.012 * k, 14, 10), hairM);
                    lock.scale.set(0.75, 0.42, 1.7);
                    lock.position.set(q[0] * 1.06, q[1] * 1.06, q[2] * 1.06);
                    lock.rotation.set(th + 0.25, sx * 0.5, 0);
                    lock.castShadow = true; headG.add(lock);
                });
            }
            [-1, 1].forEach(sd => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 14, 12), tvLit(paintedMat(PT.earB), 'skin'));
                ear.scale.set(0.34, 1.12, 0.78); ear.position.set(sd * 0.056, -0.004, -0.006); ear.rotation.set(0, sd * 0.15, sd * -0.10);
                headG.add(ear);
            });
            // capuz azul: casca atrás e em volta da cabeça, aberta para o rosto, emendando na manta
            const hood = new THREE.Mesh(new THREE.SphereGeometry(0.073, 28, 16, Math.PI * 0.90, Math.PI * 1.20, Math.PI * 0.36, Math.PI * 0.52), blue);
            hood.scale.set(1.0, 1.05, 1.0); hood.castShadow = true;
            headG.add(hood);
            return babyGroup;
        }

        // mala vermelha de rodinhas com a haste retrátil estendida: o punho fecha na barra do alto da haste
        const MO_CASE_H = 0.50;
        function moSuitcase() {
            const g = new THREE.Group();
            const rm = (c, r, cls) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 }), cls);
            const red = rm(MOM.red, 0.48, 'red'), redD = rm(MOM.redD, 0.55, 'red'), blk = rm(0x1b1c25, 0.5, 'case'), blkHi = rm(0x3a3d4a, 0.45, 'case');
            const CW = 0.300, CH = MO_CASE_H, CD = 0.170, CR = 0.050, top = -0.318, cy = top - CH / 2;
            const body = new THREE.Group(); g.add(body); g.userData.body = body; g.userData.wheelBottom = top - CH - 0.042;
            const shell = paxCaseSlab(CW, CH, CR, CD - 0.04, red, 0.02); shell.position.set(0, cy, 0); body.add(shell);
            const seam = paxCaseSlab(CW + 0.006, CH + 0.006, CR + 0.003, 0.026, redD, 0.008); seam.position.set(0, cy, 0); body.add(seam);                   // faixa do zíper ao redor
            [-1, 1].forEach(sx => {                                                                                                                   // sulcos moldados nas faces grandes
                [-0.068, 0.068].forEach(zo => { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.005, CH - 0.15, 0.012), redD); rib.position.set(sx * (CD / 2 + 0.001), cy, zo); body.add(rib); });
            });
            // haste: barra de pegada no alto + duas hastes pretas descendo até a mala
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.140, 14), blk); grip.rotation.x = Math.PI / 2; grip.castShadow = true; g.add(grip);
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.020, 0.130), blkHi); bridge.position.set(-0.004, -0.018, 0); bridge.castShadow = true; g.add(bridge);
            [-0.048, 0.048].forEach(zr => { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, Math.abs(top) + 0.040, 10), blk); rod.position.set(0, (-0.020 + top - 0.060) / 2, zr); rod.castShadow = true; g.add(rod); });
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                const wx = sx * 0.050, wz = sz * 0.105, wy = top - CH - 0.004;
                const mount = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.038), blk); mount.position.set(wx, wy + 0.004, wz); body.add(mount);
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.030, 14), blk); wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, wy - 0.016, wz); wheel.castShadow = true; wheel.userData.isWheel = true; body.add(wheel);
            });
            return g;
        }

        function createMother() {
            const S = GLTF_S;
            const root = new THREE.Group();
            root.scale.set(0.80, 0.81, 0.80);
            const skinM = paxMat(MOM.skin, 'skin'), coatM = paxMat(MOM.coat, 'cloth'), pantsM = paxMat(MOM.pants, 'cloth');

            // ---- pelve (calça justa) -------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: 0.113, w: 0.128, d: 0.092, c: -0.003, p: 2.3 }, { a: 0.082, w: 0.138, d: 0.096 }, { a: 0.0, w: 0.148, d: 0.102, c: -0.006 },
                { a: -0.06, w: 0.143, d: 0.099 }, { a: -0.113, w: 0.116, d: 0.086 }
            ], paxDoublePaintedMat(MTX.pelvis, 'cloth'), { seg: 36, capEnd: true }));

            // ---- tronco (casaco comprido, caimento reto) -----------------------------------------------------------
            const torsoLen = 15.0 * S;
            const thorax = new THREE.Group();
            thorax.position.set(0, 4.0 * S, 0);
            pelvis.add(thorax);
            thorax.add(tvLoft([
                { a: 0.424, w: 0.064, d: 0.062, c: 0.006, p: 2.2 }, { a: 0.415, w: 0.072, d: 0.066, c: 0.005 }, { a: 0.405, w: 0.112, d: 0.078, c: 0.003 },
                { a: 0.383, w: 0.158, d: 0.092, c: 0.001 }, { a: 0.340, w: 0.170, d: 0.100 }, { a: 0.250, w: 0.158, d: 0.108, c: -0.001 },
                { a: 0.140, w: 0.150, d: 0.108 }, { a: 0.040, w: 0.150, d: 0.108 }, { a: -0.060, w: 0.164, d: 0.116, c: -0.004 },
                { a: -0.140, w: 0.184, d: 0.126, c: -0.008 }, { a: -0.240, w: 0.194, d: 0.136, c: -0.014 },
                { a: -0.360, w: 0.198, d: 0.144, c: -0.020 }, { a: -0.465, w: 0.200, d: 0.150, c: -0.024 }
            ], paxDoublePaintedMat(MTX.torso, 'cloth'), { seg: 64, rings: 72, skip: (u, v) => { const y = 1 - v, du = Math.min(u, 1 - u); return y > MOM_OPEN.y0 && du < MOM_OPEN.hw(y); } }));
            thorax.add(tvLoft([{ a: 0.440, w: 0.070, d: 0.058, c: -0.014 }, { a: 0.420, w: 0.076, d: 0.064, c: -0.012 }, { a: 0.396, w: 0.094, d: 0.072, c: -0.008 }], (() => { const m = paxMat(MOM.coatD, 'cloth'); m.side = THREE.DoubleSide; return m; })(), { seg: 28 }));   // gola do casaco
            thorax.add(tvLoft([{ a: 0.34, w: 0.050, d: 0.054, c: 0.004 }, { a: 0.40, w: 0.048, d: 0.051, c: 0.006 }, { a: 0.455, w: 0.045, d: 0.048, c: 0.010 }, { a: 0.520, w: 0.040, d: 0.042, c: 0.016 }], skinM, { seg: 20, capEnd: true }));

            // ---- cabeça --------------------------------------------------------------------------------------------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), paxPaintedMat(PT.faceM, 'skin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            addAdultNose(head, skinM, 0.0115, 0.0108, 0.0074, 0.0102);
            // ---- cabelo longo e liso (orelhas cobertas pelo cabelo): couro cabeludo + duas cortinas laterais + massa das costas -------------------
            // Coordenadas da cabeça (origem no pivô do pescoço). O grupo fica no tronco; tvHairRig faz cada vértice seguir a cabeça conforme o peso.
            const hairGroup = new THREE.Group();
            hairGroup.position.copy(head.position);
            thorax.add(hairGroup);
            const hairM = paxPaintedMat(MTX.hair, 'hair'), hairParts = [];
            {   // couro cabeludo: risca de lado, testa à mostra, desce pelas laterais (cobre as orelhas) até a nuca
                const sm = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
                const TL = Math.PI * 0.82, hg = new THREE.SphereGeometry(1, 72, 40, 0, Math.PI * 2, 0, TL), hp = hg.attributes.position;
                for (let i = 0; i < hp.count; i++) {
                    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
                    const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                    let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));
                    const ap = Math.abs(psi);
                    const thMax = Math.PI * (0.29 + 0.11 * sm(0.25, 0.85, ap) + 0.24 * sm(0.95, 1.45, ap) + 0.16 * sm(2.0, 2.9, ap) + 0.03 * sm(0.0, 0.6, psi) * (1 - sm(0.6, 1.2, ap)));
                    const th2 = (th / TL) * thMax, st = Math.sin(th2);
                    const k = 1.035 + 0.045 * (1 - hsm(0.6, 1.0, th / TL));
                    const hq = headShell(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st, k);
                    hp.setXYZ(i, hq[0], hq[1] - HEAD.cy * 0, hq[2]);
                }
                hg.computeVertexNormals();
                hairParts.push(new THREE.Mesh(hg, hairM));
            }
            // cortinas laterais: das têmporas, ao lado do rosto, até o queixo; a direita (-x) cai pela frente do ombro até o peito, a esquerda passa por cima do ombro e desce pelas costas
            const curtain = (sx) => {
                const up = [
                    { p: [0.056 * sx, 0.180, 0.048], w: 0.020, d: 0.010, s: [0, 0.3, 1] },
                    { p: [0.080 * sx, 0.140, 0.022], w: 0.040, d: 0.016, s: [0, 0, 1] },
                    { p: [0.087 * sx, 0.085, 0.000], w: 0.058, d: 0.017, s: [0, 0, 1] },
                    { p: [0.090 * sx, 0.030, 0.008], w: 0.056, d: 0.016, s: [0.15, 0, 1] }
                ];
                const low = sx < 0 ? [
                    { p: [-0.098, -0.032, 0.056], w: 0.045, d: 0.015, s: [0.7, 0, 0.7] },
                    { p: [-0.098, -0.090, 0.084], w: 0.041, d: 0.014, s: [1, 0, 0.15] },
                    { p: [-0.094, -0.160, 0.093], w: 0.037, d: 0.013, s: [1, 0, 0] },
                    { p: [-0.090, -0.215, 0.093], w: 0.029, d: 0.011, s: [1, 0, 0] },
                    { p: [-0.088, -0.245, 0.090], w: 0.008, d: 0.005, s: [1, 0, 0] }
                ] : [
                    { p: [0.102, -0.014, -0.012], w: 0.045, d: 0.015, s: [0.6, 0, 0.8] },
                    { p: [0.108, -0.065, -0.088], w: 0.042, d: 0.014, s: [1, 0, 0] },
                    { p: [0.108, -0.135, -0.104], w: 0.039, d: 0.013, s: [1, 0, 0] },
                    { p: [0.104, -0.200, -0.112], w: 0.032, d: 0.011, s: [1, 0, 0] },
                    { p: [0.100, -0.235, -0.112], w: 0.008, d: 0.005, s: [1, 0, 0] }
                ];
                return tvSweep(up.concat(low), hairM, { seg: 18, rings: 54 });
            };
            hairParts.push(curtain(-1), curtain(1));
            // massa das costas: cai reta da parte de trás da cabeça até o meio das costas
            hairParts.push(tvLoft([
                { a: 0.170, w: 0.064, d: 0.034, c: -0.066 }, { a: 0.120, w: 0.090, d: 0.044, c: -0.072 }, { a: 0.060, w: 0.100, d: 0.048, c: -0.080 },
                { a: 0.000, w: 0.100, d: 0.045, c: -0.088 }, { a: -0.060, w: 0.098, d: 0.036, c: -0.102 }, { a: -0.140, w: 0.096, d: 0.029, c: -0.112 },
                { a: -0.220, w: 0.090, d: 0.026, c: -0.118 }, { a: -0.280, w: 0.074, d: 0.021, c: -0.122 }, { a: -0.320, w: 0.040, d: 0.013, c: -0.122 }, { a: -0.335, w: 0.010, d: 0.005, c: -0.122 }
            ], hairM, { seg: 36, rings: 50, capStart: true }));
            hairParts.forEach(m => { m.castShadow = true; m.frustumCulled = false; hairGroup.add(m); });
            const hairRig = tvHairRig(hairParts, (x, y) => hsm(-0.045, 0.060, y));

            // ---- braços ----------------------------------------------------------------------------------------------
            let suitcaseGroup = null;
            const upperArmLen = 10.2 * S, forearmLen = 9.2 * S;
            function buildArm(side) {
                const shoulder = new THREE.Group();
                shoulder.rotation.order = 'YXZ';
                shoulder.position.set(side * (6.2 * S) * 0.92, 13.0 * S, 0);
                thorax.add(shoulder);
                shoulder.add(tvBall(0.040, coatM, 1.1, 0.85, 1.1));
                shoulder.add(tvLoft([
                    { a: 0, w: 0.040, d: 0.044 }, { a: -0.030, w: 0.053, d: 0.056 }, { a: -0.120, w: 0.053, d: 0.054 }, { a: -0.220, w: 0.048, d: 0.050 }, { a: -upperArmLen, w: 0.045, d: 0.047 }
                ], paxDoublePaintedMat(MTX.sleeve, 'cloth'), { seg: 28, capStart: true }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(tvBall(0.045, coatM));
                elbow.add(tvLoft([
                    { a: 0, w: 0.046, d: 0.048 }, { a: -0.060, w: 0.046, d: 0.047 }, { a: -0.160, w: 0.042, d: 0.044 }, { a: -forearmLen, w: 0.037, d: 0.039 }
                ], paxDoublePaintedMat(MTX.forearm, 'cloth'), { seg: 26 }));
                const h = tvBuildHand(side, side === -1, skinM);
                h.hand.scale.setScalar(0.93);
                h.hand.position.y = -forearmLen - 0.004;
                elbow.add(h.hand);
                if (side === -1) {
                    suitcaseGroup = moSuitcase();
                    suitcaseGroup.position.set(0.021, -0.066, 0);
                    suitcaseGroup.scale.setScalar(1 / 0.93);
                    suitcaseGroup.rotation.set(0.22, 0, 0.10);
                    h.hand.add(suitcaseGroup);
                }
                return { shoulder, elbow, hand: h.hand, fingers: h.fingers };
            }

            // ---- pernas (calça justa + botas marrons) ---------------------------------------------------------------
            function buildLeg(side) {
                const femurLen = 15.0 * S, tibiaLen = 14.0 * S;
                const hip = new THREE.Group();
                hip.position.set(side * (3.6 * S) * 0.94, -1.2 * S, 0);
                pelvis.add(hip);
                hip.add(tvBall(0.074, pantsM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0, w: 0.080, d: 0.088 }, { a: -0.050, w: 0.082, d: 0.090 }, { a: -0.120, w: 0.080, d: 0.086 }, { a: -0.260, w: 0.069, d: 0.074 },
                    { a: -0.350, w: 0.060, d: 0.065 }, { a: -femurLen, w: 0.056, d: 0.060 }
                ], paxDoublePaintedMat(MTX.thigh, 'cloth'), { seg: 30 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(tvBall(0.056, pantsM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0, w: 0.056, d: 0.060 }, { a: -0.060, w: 0.056, d: 0.063 }, { a: -0.160, w: 0.053, d: 0.059 }, { a: -0.300, w: 0.048, d: 0.053 },
                    { a: -0.360, w: 0.049, d: 0.054 }, { a: -tibiaLen, w: 0.052, d: 0.056 }
                ], paxDoublePaintedMat(MTX.calf, 'cloth'), { seg: 30 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                const bootM = paxMat(MOM.boot, 'leather'), soleM = paxMat(MOM.bootD, 'dark');
                foot.add(tvLoft([                                                                       // bota de cano curto: cano alto, bico arredondado
                    { a: -0.062, w: 0.033, d: 0.044, c: -0.030 }, { a: -0.035, w: 0.040, d: 0.050, c: -0.022 }, { a: 0.0, w: 0.041, d: 0.046, c: -0.026 },
                    { a: 0.050, w: 0.043, d: 0.030, c: -0.044 }, { a: 0.100, w: 0.045, d: 0.025, c: -0.051 }, { a: 0.148, w: 0.040, d: 0.022, c: -0.056 }, { a: 0.180, w: 0.026, d: 0.016, c: -0.060 }
                ], bootM, { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                foot.add(tvLoft([
                    { a: -0.066, w: 0.034, d: 0.014, c: -0.082, p: 2.6 }, { a: -0.040, w: 0.041, d: 0.015, c: -0.082 }, { a: 0.050, w: 0.045, d: 0.013, c: -0.083 },
                    { a: 0.130, w: 0.044, d: 0.012, c: -0.083 }, { a: 0.176, w: 0.031, d: 0.011, c: -0.083 }, { a: 0.186, w: 0.014, d: 0.008, c: -0.083 }
                ], soleM, { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                const heel = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.022, 0.048), soleM); heel.position.set(0, -0.085, -0.030); heel.castShadow = true; foot.add(heel);
                return { hip, knee, ankle };
            }

            thorax.add(buildMotherBaby());   // bebê em pé contra o peito; o braço esquerdo o abraça (pose na animação)
            const rightArm = buildArm(-1);
            const leftArm = buildArm(1);
            const rightLeg = buildLeg(-1);
            const leftLeg = buildLeg(1);
            scene.add(root);
            return { root, pelvis, thorax, head, rightArm, leftArm, rightLeg, leftLeg, suitcaseGroup, hairRig, isTraveler: false, isElder: false, isMother: true };
        }
