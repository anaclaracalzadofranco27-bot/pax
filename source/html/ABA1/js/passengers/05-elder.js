        // ============================================================================
        // SENHOR (BONECO 2) - REDESENHO no mesmo estilo do viajante (lofts + cor chapada + tinta + luz em faixas com sombra colorida)
        // Terno cáqui folgado de paletó comprido (lapelas, bolsos com aba, gravata), camisa creme, calça reta com vinco, sapatos escuros,
        // careca com cabelo grisalho nas laterais e nuca, rosto cansado, mão esquerda no bolso e mala de couro marrom com cantoneiras.
        // Mesmo esqueleto do viajante; as texturas pintadas do terno (lapelas, bolsos, vincos) e do rosto são reaproveitadas.
        // ============================================================================
        const ELD = { suit: '#b99b7c', skin: '#f0baa3', shirt: '#e4e3d6', tie: '#4a423d', shoe: '#3d3633', sole: '#241f1d', leather: '#8c5236', leatherD: '#5f3421', leatherH: '#a05f3f' };
        const ETX = {
            torso: { w: 1024, h: 512, fill: ELD.suit, fn: (g, W, H, fl) => {
                PT.suitTorso.fn(g, W, H, fl);
                // gravata escura sobre a camisa (nó e lâmina), dentro do V do paletó
                inkPoly(g, W, H, [[-0.010, 0.040], [0.010, 0.040], [0.013, 0.100], [-0.013, 0.100]], ELD.tie, true, 3);
                inkPoly(g, W, H, [[-0.011, 0.100], [0.011, 0.100], [0.015, 0.300], [0.0, 0.500], [-0.015, 0.300]], ELD.tie, true, 3);
                inkTaper(g, W, H, [0.0, 0.11], [0.002, 0.30], [0.0, 0.46], 2, '#6d625b');
            } },
            sleeve: { ...PT.suitSleeve, fill: ELD.suit }, forearm: { ...PT.suitForearm, fill: ELD.suit },
            pelvis: { ...PT.suitPelvis, fill: ELD.suit }, thigh: { ...PT.suitThigh, fill: ELD.suit }, calf: { ...PT.suitCalf, fill: ELD.suit }
        };

        function elSuitcase() {
            const g = new THREE.Group();
            const lm = (c, r) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.02 }), 'leather');
            const body = lm(ELD.leather, 0.7), dark = lm(ELD.leatherD, 0.65), hi = lm(ELD.leatherH, 0.7);
            const L = 0.520, H = 0.360, T = 0.150, top = -0.040, cy = top - H / 2, bev = 0.018;
            const shellGeo = new THREE.ExtrudeGeometry(paxRoundedRect(L - 2 * bev, H - 2 * bev, 0.03), { depth: T - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
            shellGeo.translate(0, 0, -(T - 2 * bev) / 2);
            const shell = new THREE.Mesh(shellGeo, body); shell.rotation.y = Math.PI / 2; shell.position.set(0, cy, 0); shell.castShadow = true; shell.receiveShadow = true; g.add(shell);
            // tampa: faixa mais clara no topo e costura de metal/couro ao redor
            const lid = new THREE.Mesh(new THREE.BoxGeometry(T + 0.004, 0.006, L - 0.07), hi); lid.position.set(0, top - 0.002, 0); lid.castShadow = true; g.add(lid);
            [-1, 1].forEach(sx => {
                const x = sx * (T / 2 + 0.001);
                const addBox = (w, h, d, px, py, pz, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); g.add(b); };
                addBox(0.006, 0.008, L - 0.09, x, top - 0.060, 0, dark);                 // linha da tampa
                addBox(0.006, 0.006, L - 0.12, x, top - H + 0.030, 0, dark);             // moldura inferior
                [-1, 1].forEach(sz => addBox(0.006, H - 0.12, 0.006, x, cy, sz * (L / 2 - 0.040), dark));   // molduras verticais
                // cantoneiras: quartos de disco de couro escuro nos 4 cantos de cada face grande
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sz, sy]) => {
                    const zc = sz * (L / 2 - 0.004), yc = cy + sy * (H / 2 - 0.004), r = 0.085;
                    const pd = sx > 0 ? -(-sz) : -sz, a0 = pd > 0 ? (-sy > 0 ? 0 : 3 * Math.PI / 2) : (-sy > 0 ? Math.PI / 2 : Math.PI);
                    const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); shp.absarc(0, 0, r, a0, a0 + Math.PI / 2, false); shp.lineTo(0, 0);
                    const pg = new THREE.ExtrudeGeometry(shp, { depth: 0.010, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 12 });
                    const patch = new THREE.Mesh(pg, dark); patch.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; patch.position.set(sx * (T / 2 - 0.004), yc, zc); patch.castShadow = true; g.add(patch);
                });
            });
            // alça de couro em arco sobre o topo (a mão fecha no alto do arco)
            const arch = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.0095, 10, 22, Math.PI), dark);
            arch.rotation.y = Math.PI / 2; arch.scale.set(1.0, 0.62, 1.0); arch.position.set(0, top, 0); arch.castShadow = true; g.add(arch);
            [-1, 1].forEach(sz => { const base = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.022), dark); base.position.set(0, top + 0.002, sz * 0.052); g.add(base); });
            return g;
        }

        function createElder() {
            const S = GLTF_S;
            const root = new THREE.Group();
            root.scale.setScalar(0.84);
            const skinM = paxMat(ELD.skin, 'oldskin'), suitM = paxMat(ELD.suit, 'suit'), shirtM = paxMat(ELD.shirt, 'white');

            // ---- pelve (calça) ---------------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: 0.113, w: 0.140, d: 0.098, c: -0.003, p: 2.3 }, { a: 0.082, w: 0.148, d: 0.101 }, { a: 0.0, w: 0.153, d: 0.104, c: -0.006 },
                { a: -0.06, w: 0.146, d: 0.100 }, { a: -0.113, w: 0.118, d: 0.086 }
            ], paxDoublePaintedMat(ETX.pelvis, 'suit'), { seg: 36, capEnd: true }));

            // ---- tronco (paletó comprido, folgado) -----------------------------------------------------------------
            const torsoLen = 15.0 * S;
            const thorax = new THREE.Group();
            thorax.position.set(0, 4.0 * S, 0);
            pelvis.add(thorax);
            thorax.add(tvLoft([
                { a: 0.424, w: 0.066, d: 0.064, c: 0.006, p: 2.2 }, { a: 0.415, w: 0.075, d: 0.068, c: 0.005 }, { a: 0.405, w: 0.118, d: 0.080, c: 0.003 },
                { a: 0.383, w: 0.172, d: 0.095, c: 0.001 }, { a: 0.340, w: 0.188, d: 0.104 }, { a: 0.250, w: 0.176, d: 0.112, c: -0.001 },
                { a: 0.140, w: 0.164, d: 0.112 }, { a: 0.040, w: 0.162, d: 0.112 }, { a: -0.050, w: 0.170, d: 0.118, c: -0.004 },
                { a: -0.120, w: 0.178, d: 0.122, c: -0.006 }, { a: -0.190, w: 0.182, d: 0.124, c: -0.008 }
            ], paxDoublePaintedMat(ETX.torso, 'suit'), { seg: 48, rings: 56 }));
            // gola do paletó (atrás do pescoço), colarinho da camisa e pescoço
            thorax.add(tvLoft([{ a: 0.440, w: 0.074, d: 0.060, c: -0.014 }, { a: 0.420, w: 0.080, d: 0.066, c: -0.012 }, { a: 0.396, w: 0.098, d: 0.074, c: -0.008 }], (() => { const m = suitM.clone(); m.side = THREE.DoubleSide; m.userData.lit = 'suit'; return m; })(), { seg: 28 }));
            thorax.add(tvLoft([{ a: 0.446, w: 0.056, d: 0.056, c: 0.006 }, { a: 0.424, w: 0.060, d: 0.060, c: 0.005 }, { a: 0.400, w: 0.064, d: 0.064, c: 0.004 }], (() => { const m = shirtM.clone(); m.side = THREE.DoubleSide; m.userData.lit = 'white'; return m; })(), { seg: 28 }));
            thorax.add(tvLoft([{ a: 0.34, w: 0.052, d: 0.056, c: 0.004 }, { a: 0.40, w: 0.050, d: 0.053, c: 0.006 }, { a: 0.475, w: 0.049, d: 0.052, c: 0.008 }], skinM, { seg: 20, capEnd: true }));

            // ---- cabeça (crânio com anatomia + rosto pintado + nariz + orelhas + cabelo grisalho em ferradura) ----------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), paxPaintedMat(PT.faceE, 'oldskin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            addAdultNose(head, skinM, 0.0125, 0.0118, 0.0082, 0.0112);
            addAdultEars(head, PT.earE, 'oldskin');
            {   // cabelo grisalho em ferradura (laterais e nuca); topo da cabeça e testa calvos
                const PHI0 = Math.PI / 2 + 1.0, PHIL = Math.PI * 2 - 2.0;
                const hg = new THREE.SphereGeometry(1, 64, 16, PHI0, PHIL, 0, Math.PI);
                const hp = hg.attributes.position, huv = hg.attributes.uv, sm = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
                for (let i = 0; i < hp.count; i++) {
                    const ph = PHI0 + huv.getX(i) * PHIL, t = 1 - huv.getY(i);
                    let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));
                    const ap = Math.abs(psi);
                    const thMin = Math.PI * (0.45 - 0.08 * sm(1.0, 2.0, ap) + 0.022 * Math.sin(psi * 11 + 1)), thMax = Math.PI * (0.58 + 0.20 * sm(1.0, 2.2, ap) + 0.030 * Math.sin(psi * 7));
                    const th2 = thMin + t * (thMax - thMin), st = Math.sin(th2);
                    const x0 = -Math.cos(ph) * st, y0 = Math.cos(th2), z0 = Math.sin(ph) * st;
                    const n = (Math.sin(x0 * 10 + y0 * 4.4) + Math.sin(z0 * 12 - x0 * 6.6 + 1.3) + Math.sin(y0 * 13 + z0 * 7.7 + 2.1)) / 3;
                    const k = 1.02 + (0.060 + 0.04 * n) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.5);
                    const hq = headShell(x0, y0, z0, k);
                    hp.setXYZ(i, hq[0], hq[1], hq[2]);
                }
                hg.computeVertexNormals();
                const elderHair = new THREE.Mesh(hg, paxPaintedMat(PT.hairE, 'grey'));
                elderHair.castShadow = true;
                head.add(elderHair);
            }

            // ---- braços ----------------------------------------------------------------------------------------------
            let suitcaseGroup = null;
            const upperArmLen = 10.2 * S, forearmLen = 9.2 * S;
            function buildArm(side) {
                const shoulder = new THREE.Group();
                shoulder.rotation.order = 'YXZ';
                shoulder.position.set(side * (6.2 * S) * 0.92, 13.0 * S, 0);
                thorax.add(shoulder);
                shoulder.add(tvBall(0.040, suitM, 1.1, 0.85, 1.1));
                shoulder.add(tvLoft([
                    { a: 0, w: 0.040, d: 0.044 }, { a: -0.030, w: 0.054, d: 0.057 }, { a: -0.120, w: 0.056, d: 0.057 }, { a: -0.220, w: 0.051, d: 0.053 }, { a: -upperArmLen, w: 0.047, d: 0.050 }
                ], paxDoublePaintedMat(ETX.sleeve, 'suit'), { seg: 28, capStart: true }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(tvBall(0.047, suitM));
                elbow.add(tvLoft([
                    { a: 0, w: 0.047, d: 0.050 }, { a: -0.060, w: 0.047, d: 0.049 }, { a: -0.160, w: 0.043, d: 0.045 }, { a: -(forearmLen - 0.012), w: 0.039, d: 0.041 }
                ], paxDoublePaintedMat(ETX.forearm, 'suit'), { seg: 26 }));
                elbow.add(tvLoft([{ a: -(forearmLen - 0.034), w: 0.034, d: 0.034 }, { a: -forearmLen + 0.002, w: 0.033, d: 0.033 }], shirtM, { seg: 20 }));   // punho da camisa
                const h = tvBuildHand(side, side === -1, skinM);
                h.hand.position.y = -forearmLen - 0.004;
                elbow.add(h.hand);
                if (side === -1) {
                    suitcaseGroup = elSuitcase();
                    suitcaseGroup.position.set(0.021, -0.066, 0);
                    suitcaseGroup.rotation.set(0.14, 0.04, 0.06);
                    h.hand.add(suitcaseGroup);
                }
                return { shoulder, elbow, hand: h.hand, fingers: h.fingers };
            }

            // ---- pernas (calça reta com vinco + sapato social) -----------------------------------------------------------
            function buildLeg(side) {
                const femurLen = 15.0 * S, tibiaLen = 14.0 * S;
                const hip = new THREE.Group();
                hip.position.set(side * (3.6 * S) * 0.94, -1.2 * S, 0);
                pelvis.add(hip);
                hip.add(tvBall(0.080, suitM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0, w: 0.088, d: 0.094 }, { a: -0.050, w: 0.089, d: 0.095 }, { a: -0.120, w: 0.087, d: 0.092 }, { a: -0.260, w: 0.076, d: 0.081 },
                    { a: -0.350, w: 0.069, d: 0.073 }, { a: -femurLen, w: 0.066, d: 0.070 }
                ], paxDoublePaintedMat(ETX.thigh, 'suit'), { seg: 30 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(tvBall(0.063, suitM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0, w: 0.066, d: 0.070 }, { a: -0.060, w: 0.064, d: 0.070 }, { a: -0.160, w: 0.060, d: 0.066 }, { a: -0.300, w: 0.055, d: 0.060 },
                    { a: -0.360, w: 0.056, d: 0.061 }, { a: -tibiaLen, w: 0.060, d: 0.064 }
                ], paxDoublePaintedMat(ETX.calf, 'suit'), { seg: 30 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                const shoeM = paxMat(ELD.shoe, 'dark'), soleM = paxMat(ELD.sole, 'dark');
                foot.add(tvLoft([                                                                       // cabedal de couro escuro, bico arredondado
                    { a: -0.062, w: 0.032, d: 0.034, c: -0.040 }, { a: -0.035, w: 0.038, d: 0.040, c: -0.036 }, { a: 0.0, w: 0.040, d: 0.036, c: -0.040 },
                    { a: 0.050, w: 0.042, d: 0.028, c: -0.046 }, { a: 0.100, w: 0.044, d: 0.024, c: -0.052 }, { a: 0.150, w: 0.040, d: 0.022, c: -0.056 }, { a: 0.185, w: 0.026, d: 0.016, c: -0.060 }
                ], shoeM, { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                foot.add(tvLoft([                                                                       // sola fina + salto
                    { a: -0.066, w: 0.034, d: 0.014, c: -0.082, p: 2.6 }, { a: -0.040, w: 0.041, d: 0.015, c: -0.082 }, { a: 0.050, w: 0.045, d: 0.013, c: -0.083 },
                    { a: 0.130, w: 0.044, d: 0.012, c: -0.083 }, { a: 0.176, w: 0.031, d: 0.011, c: -0.083 }, { a: 0.190, w: 0.014, d: 0.008, c: -0.083 }
                ], soleM, { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                const heel = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.018, 0.050), soleM); heel.position.set(0, -0.087, -0.030); heel.castShadow = true; foot.add(heel);
                return { hip, knee, ankle };
            }

            const rightArm = buildArm(-1);
            const leftArm = buildArm(1);
            const rightLeg = buildLeg(-1);
            const leftLeg = buildLeg(1);
            scene.add(root);
            return { root, pelvis, thorax, head, rightArm, leftArm, rightLeg, leftLeg, suitcaseGroup, isTraveler: false, isElder: true, isMother: false };
        }

