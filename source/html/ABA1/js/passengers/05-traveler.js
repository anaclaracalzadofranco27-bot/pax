        function createTraveler() {
            const S = GLTF_S;
            const root = new THREE.Group();
            root.scale.setScalar(0.84);
            const skinM = paxMat(TVC.skin, 'skin'), jeansM = paxMat(TVC.jeans, 'denim');

            // ---- pelve (jeans) --------------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: -0.118, w: 0.118, d: 0.092, c: -0.004, p: 2.3 }, { a: -0.085, w: 0.143, d: 0.100, c: -0.006 }, { a: -0.040, w: 0.150, d: 0.104, c: -0.008 },
                { a: 0.020, w: 0.146, d: 0.100, c: -0.006 }, { a: 0.075, w: 0.139, d: 0.096, c: -0.004 }, { a: 0.118, w: 0.135, d: 0.093, c: -0.003 }
            ], paxPaintedMat(TVT.pelvis, 'denim'), { seg: 36, capStart: true }));

            // ---- tronco (camiseta folgada) -------------------------------------------------------------------------
            const torsoLen = 15.0 * S;
            const thorax = new THREE.Group();
            thorax.position.set(0, 4.0 * S, 0);
            pelvis.add(thorax);
            thorax.add(tvLoft([
                { a: -0.075, w: 0.160, d: 0.113, c: -0.004, p: 2.2 }, { a: -0.045, w: 0.153, d: 0.107, c: -0.005 }, { a: 0.040, w: 0.141, d: 0.099, c: -0.004 },
                { a: 0.140, w: 0.146, d: 0.101, c: -0.002 }, { a: 0.240, w: 0.158, d: 0.106, c: 0 }, { a: 0.315, w: 0.170, d: 0.102, c: 0.002 },
                { a: 0.365, w: 0.167, d: 0.093, c: 0.001 }, { a: 0.395, w: 0.122, d: 0.079, c: 0.003 }, { a: 0.416, w: 0.073, d: 0.068, c: 0.005 }, { a: 0.426, w: 0.068, d: 0.064, c: 0.006 }
            ], paxDoublePaintedMat(TVT.shirt, 'cloth'), { seg: 44, rings: 48 }));
            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.0095, 10, 28), paxMat(TVC.collar, 'cloth'));    // gola careca canelada
            collar.rotation.x = Math.PI / 2 - 0.16; collar.scale.set(1.04, 0.98, 1.0); collar.position.set(0, 0.414, 0.006); collar.castShadow = true;
            thorax.add(collar);
            thorax.add(tvLoft([{ a: 0.34, w: 0.052, d: 0.056, c: 0.004 }, { a: 0.40, w: 0.050, d: 0.053, c: 0.006 }, { a: 0.475, w: 0.049, d: 0.052, c: 0.008 }], paxPaintedMat(TVT.neck, 'skin'), { seg: 20, capEnd: true }));

            // ---- cabeça ----------------------------------------------------------------------------------------------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            head.scale.setScalar(1.16);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), paxPaintedMat(TVT.face, 'skin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            addAdultEars(head, PT.earT, 'skin');
            {   // cabelo: casca que cobre o crânio todo (topo, laterais e nuca), com a linha do cabelo acima da orelha e descendo atrás dela
                const TL = Math.PI * 0.82, sm = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
                const hg = new THREE.SphereGeometry(1, 72, 40, 0, Math.PI * 2, 0, TL), hp = hg.attributes.position;
                for (let i = 0; i < hp.count; i++) {
                    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
                    const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                    let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));            // 0 = frente (+z)
                    const ap = Math.abs(psi);
                    // limite da casca (ângulo a partir do topo): testa 0.41π (as mechas da franja descem dali), laterais 0.50π, atrás da orelha 0.67π, nuca 0.79π
                    const thMax = Math.PI * (0.41 + 0.09 * sm(0.5, 1.2, ap) + 0.17 * sm(1.78, 2.15, ap) + 0.12 * sm(2.2, 3.0, ap)) + Math.PI * 0.012 * Math.sin(psi * 9);
                    const th2 = (th / TL) * thMax, st = Math.sin(th2);
                    const n = (Math.sin(x * 9 + y * 4.4) + Math.sin(z * 11 - x * 6.6 + 1.3) + Math.sin(y * 12 + z * 7.7 + 2.1)) / 3;
                    const k = 1.03 + (0.085 + 0.025 * n) * (1 - hsm(0.55, 1.0, th / TL)) + 0.02 * sm(1.6, 3.0, ap) * sm(0.45, 0.75, th2 / Math.PI);   // mais volume atrás
                    const hq = headShell(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st, k);
                    hp.setXYZ(i, hq[0], hq[1], hq[2]);
                }
                hg.computeVertexNormals();
                const hair = new THREE.Mesh(hg, paxPaintedMat(TVT.hair, 'hair'));
                hair.castShadow = true;
                head.add(hair);

                // mechas em 3D (cones achatados e curvos que seguem a superfície do crânio): franja varrida para o lado, costeletas e pontas na nuca
                const hc = new THREE.Vector3(0, HEAD.cy, HEAD.cz);
                const lockMats = [paxMat(TVC.hairHi, 'hair'), paxMat(TVC.hair, 'hair'), paxMat(TVC.hairSh, 'hair')];
                const addLock = (psi, th, len, wid, sweep, tone, bend) => {
                    const dx = Math.sin(psi) * Math.sin(th), dy = Math.cos(th), dz = Math.cos(psi) * Math.sin(th);
                    const q = headShell(dx, dy, dz, 1.06);
                    const base = new THREE.Vector3(q[0], q[1], q[2]), nrm = base.clone().sub(hc).normalize();
                    const tan = new THREE.Vector3(0, -1, 0); tan.addScaledVector(nrm, -tan.dot(nrm)).normalize();           // "para baixo" sobre a superfície
                    const side = new THREE.Vector3(1, 0, 0); side.addScaledVector(nrm, -side.dot(nrm)).normalize();
                    tan.addScaledVector(side, sweep).normalize();
                    const yAx = tan.clone().negate(), xAx = new THREE.Vector3().crossVectors(yAx, nrm).normalize();
                    const R = 0.105, key = (f, w, d) => ({ a: -len * f, w: wid * w, d: d, c: -Math.pow(len * f, 2) / (2 * R), cx: bend * wid * 1.6 * f * f });
                    const lock = tvLoft([key(0, 0.55, 0.0085), key(0.18, 1.0, 0.0100), key(0.55, 0.86, 0.0085), key(0.85, 0.42, 0.0055), key(1.0, 0.08, 0.0030)], lockMats[tone % 3], { seg: 10, rings: 10, capEnd: true });
                    lock.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, nrm));
                    lock.position.copy(base);
                    head.add(lock);
                };
                const FL = [[-0.80, 0.27, 0.050, 0.017, 0.25, 2, 0.3], [-0.62, 0.24, 0.066, 0.020, 0.45, 1, 0.6], [-0.40, 0.23, 0.074, 0.021, 0.55, 0, 0.8], [-0.18, 0.22, 0.082, 0.022, 0.60, 1, 0.8],
                            [0.04, 0.22, 0.086, 0.022, 0.62, 2, 0.8], [0.26, 0.23, 0.080, 0.021, 0.55, 0, 0.7], [0.48, 0.24, 0.070, 0.020, 0.45, 1, 0.6], [0.68, 0.26, 0.054, 0.018, 0.25, 0, 0.3]];
                FL.forEach(([psi, th, len, wid, sw, tone, bend]) => addLock(psi, th * Math.PI, len, wid, sw, tone, bend));
                [[-1.22, 0.38, 0.034, 0.012], [1.22, 0.38, 0.034, 0.012]].forEach(([psi, th, len, wid]) => addLock(psi, th * Math.PI, len, wid, 0, psi > 0 ? 2 : 1, 0));   // costeletas
                for (let k = 0; k < 9; k++) { const psi = Math.PI + (k - 4) * 0.30; addLock(psi, 0.71 * Math.PI, 0.052 + 0.014 * Math.sin(k * 2.1), 0.020, 0, k % 3, Math.sin(k * 1.7) * 0.5); }   // pontas do cabelo na nuca
            }

            const buildHand = (side, grip) => tvBuildHand(side, grip, skinM);

            // ---- braços ----------------------------------------------------------------------------------------------
            let suitcaseGroup = null;
            const upperArmLen = 10.2 * S, forearmLen = 9.2 * S;
            function buildArm(side) {
                const shoulder = new THREE.Group();
                shoulder.rotation.order = 'YXZ';
                shoulder.position.set(side * (6.2 * S) * 0.92, 13.0 * S, 0);
                thorax.add(shoulder);
                shoulder.add(tvLoft([                                                                    // manga curta folgada (ombro arredondado)
                    { a: 0.046, w: 0.022, d: 0.026 }, { a: 0.036, w: 0.050, d: 0.054 }, { a: 0.012, w: 0.066, d: 0.069 }, { a: -0.040, w: 0.067, d: 0.067 },
                    { a: -0.100, w: 0.069, d: 0.068 }, { a: -0.138, w: 0.073, d: 0.071 }
                ], paxDoublePaintedMat(TVT.sleeve, 'cloth'), { seg: 28, capStart: true }));
                shoulder.add(tvLoft([                                                                    // braço nu
                    { a: -0.090, w: 0.041, d: 0.043 }, { a: -0.160, w: 0.041, d: 0.043 }, { a: -0.240, w: 0.037, d: 0.039 }, { a: -0.292, w: 0.034, d: 0.036 }
                ], paxPaintedMat(TVT.upperArm, 'skin'), { seg: 22 }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(tvBall(0.037, skinM));
                elbow.add(tvLoft([
                    { a: 0.012, w: 0.036, d: 0.038 }, { a: -0.060, w: 0.041, d: 0.043 }, { a: -0.140, w: 0.035, d: 0.036 }, { a: -0.220, w: 0.027, d: 0.029 }, { a: -0.264, w: 0.025, d: 0.027 }
                ], paxPaintedMat(TVT.forearm, 'skin'), { seg: 22 }));
                const h = buildHand(side, side === -1);
                h.hand.position.y = -forearmLen - 0.004;
                elbow.add(h.hand);
                if (side === -1) {
                    suitcaseGroup = tvSuitcase();
                    suitcaseGroup.position.set(0.021, -0.066, 0);
                    suitcaseGroup.rotation.set(0.18, 0.08, 0.04);
                    h.hand.add(suitcaseGroup);
                }
                return { shoulder, elbow, hand: h.hand, fingers: h.fingers };
            }

            // ---- pernas (jeans reto + tênis) ------------------------------------------------------------------------
            function buildLeg(side) {
                const femurLen = 15.0 * S, tibiaLen = 14.0 * S;
                const hip = new THREE.Group();
                hip.position.set(side * (3.6 * S) * 0.94, -1.2 * S, 0);
                pelvis.add(hip);
                hip.add(tvBall(0.074, jeansM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0.030, w: 0.070, d: 0.078 }, { a: -0.020, w: 0.086, d: 0.090 }, { a: -0.120, w: 0.084, d: 0.088 },
                    { a: -0.260, w: 0.074, d: 0.078 }, { a: -0.360, w: 0.066, d: 0.070 }, { a: -femurLen, w: 0.063, d: 0.067 }
                ], paxPaintedMat(TVT.thigh, 'denim'), { seg: 28 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(tvBall(0.061, jeansM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0.010, w: 0.062, d: 0.066 }, { a: -0.060, w: 0.062, d: 0.068 }, { a: -0.160, w: 0.060, d: 0.066 }, { a: -0.300, w: 0.054, d: 0.058 },
                    { a: -0.375, w: 0.056, d: 0.060, c: -0.004 }, { a: -0.402, w: 0.059, d: 0.063, c: -0.010 }, { a: -tibiaLen - 0.030, w: 0.060, d: 0.064, c: -0.012 }
                ], paxDoublePaintedMat(TVT.calf, 'denim'), { seg: 28 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                // tênis: cabedal cinza (biqueira e cadarço pintados) sobre sola branca
                foot.add(tvLoft([
                    { a: -0.060, w: 0.031, d: 0.036, c: -0.036 }, { a: -0.040, w: 0.039, d: 0.046, c: -0.030 }, { a: -0.005, w: 0.040, d: 0.040, c: -0.034 },
                    { a: 0.040, w: 0.043, d: 0.030, c: -0.043 }, { a: 0.095, w: 0.047, d: 0.025, c: -0.050 }, { a: 0.150, w: 0.042, d: 0.021, c: -0.056 }, { a: 0.178, w: 0.027, d: 0.015, c: -0.060 }
                ], paxPaintedMat(TVT.shoe, 'shoe'), { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                foot.add(tvLoft([
                    { a: -0.066, w: 0.034, d: 0.016, c: -0.080, p: 2.6 }, { a: -0.045, w: 0.042, d: 0.017, c: -0.080 }, { a: 0.010, w: 0.046, d: 0.017, c: -0.080 },
                    { a: 0.090, w: 0.0495, d: 0.017, c: -0.080 }, { a: 0.150, w: 0.0445, d: 0.017, c: -0.080 }, { a: 0.178, w: 0.031, d: 0.015, c: -0.080 }, { a: 0.188, w: 0.014, d: 0.010, c: -0.080 }
                ], paxMat(TVC.sole, 'shoe'), { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                return { hip, knee, ankle };
            }

            const rightArm = buildArm(-1);
            const leftArm = buildArm(1);
            const rightLeg = buildLeg(-1);
            const leftLeg = buildLeg(1);
            scene.add(root);
            return { root, pelvis, thorax, head, rightArm, leftArm, rightLeg, leftLeg, suitcaseGroup, isTraveler: true, isElder: false, isMother: false };
        }
