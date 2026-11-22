            // ---- Aba 3 (Alpha, vista superior): clona o CAD da Aba 2; malas posteriores com contornos tracejados ----
            (function novaFront() {
                const nvCanvas = document.getElementById('novaCanvas'), nvBox = document.getElementById('nova-container');
                if (!nvCanvas || !nvBox) return;
                let nvRen = null, nvScene = null, nvCam = null;
                const nvHosts = [], nvThick = [];   // tracejado grosso: linhas WebGL têm sempre 1 px, então o contorno é desenhado em cópias levemente deslocadas
                const NV_FOV = 15, NV_T = new THREE.Vector3(DIST / 2, 360, -447);
                const BACK_BAGS = [0, 1];   // malas deitadas, no fundo do bin (atrás das 2 da frente)
                function build() {
                    bags.forEach((b, i) => { b.root.userData.novaBag = i; if (b.env) b.env.userData.novaEnv = 1; });
                    nvScene = scene.clone(true);
                    const sideMat = new THREE.MeshBasicMaterial({ color: mat.color.getHex(), side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
                    const wallMat = new THREE.MeshBasicMaterial({ color: wm.color.getHex(), side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });   // paredes internas translúcidas (vista de cima enxerga as malas)
                    const floorMat = new THREE.MeshBasicMaterial({ color: fm.color.getHex(), side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });   // piso do bin levemente transparente
                    const dashMat = new THREE.LineDashedMaterial({ color: 0x5b7b9e, dashSize: 22, gapSize: 14, depthTest: false, transparent: true, stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });   // só aparece sobre as malas da frente
                    // contorno 3D da mala (duas seções do perfil arredondado + arestas de ligação), em linhas tracejadas
                    const pts = bagShape.getPoints(8), seg = [], z0 = -106, z1 = 106;
                    for (let i = 0; i < pts.length; i++) {
                        const a = pts[i], b = pts[(i + 1) % pts.length];
                        seg.push(a.x, a.y, z0, b.x, b.y, z0, a.x, a.y, z1, b.x, b.y, z1);
                    }
                    for (let i = 0; i < pts.length; i += 4) seg.push(pts[i].x, pts[i].y, z0, pts[i].x, pts[i].y, z1);
                    const outlineGeo = new THREE.BufferGeometry();
                    outlineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
                    const bagNodes = [];
                    nvScene.traverse(o => {
                        if (o.userData.novaSlat || o.userData.novaEnv || o.userData.novaSideDetail) o.visible = false;          // porta recolhida e cotas fora
                        if (o.isMesh && o.material === mat) o.visible = false;               // paredes laterais recortadas: fora (entra a laje reta abaixo)
                        if (o.isLineSegments && o.geometry === eg) o.visible = false;        // contorno recortado das laterais: fora
                        if (o.isMesh && o.material === fm) { o.material = floorMat; o.renderOrder = 1; }
                        if (o.isMesh && o.material === wm) { o.material = wallMat; o.renderOrder = 1; }   // laterais do bin translúcidas
                        if (o.userData.novaBag !== undefined) bagNodes.push(o);
                    });
                    // paredes laterais do bin: só o contorno externo do perfil (curva), com a espessura, sem furos nem recortes
                    {
                        // topo das laterais levemente mais baixo: recorta o perfil em y <= YC
                        const YC = 655, pts0 = SUBS[0], clipped = [];
                        for (let i = 0; i < pts0.length; i++) {
                            const a = pts0[i], b = pts0[(i + 1) % pts0.length], ain = a[1] <= YC, bin = b[1] <= YC;
                            if (ain) clipped.push(a);
                            if (ain !== bin) { const t = (YC - a[1]) / (b[1] - a[1]); clipped.push([a[0] + t * (b[0] - a[0]), YC]); }
                        }
                        const sh0 = new THREE.Shape(clipped.map(p => new THREE.Vector2(p[0], p[1])));
                        const g0 = new THREE.ExtrudeGeometry(sh0, { depth: TH, bevelEnabled: false, curveSegments: 1 });
                        g0.translate(0, 0, -TH / 2);
                        g0.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1));
                        const e0 = new THREE.EdgesGeometry(g0, 20);
                        [0, DIST].forEach(x => {
                            const m = new THREE.Mesh(g0, sideMat); m.position.x = x; m.renderOrder = 1; nvScene.add(m);
                            const l = new THREE.LineSegments(e0, lmat); l.position.x = x; l.renderOrder = 3; nvScene.add(l);
                        });
                    }
                    bagNodes.forEach(o => {
                        const idx = o.userData.novaBag;
                        // malas da frente gravam o stencil: o tracejado das malas do fundo só aparece por cima delas
                        if (BACK_BAGS.indexOf(idx) < 0) o.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); c.material.stencilWrite = true; c.material.stencilFunc = THREE.AlwaysStencilFunc; c.material.stencilRef = 1; c.material.stencilZPass = THREE.ReplaceStencilOp; } });
                        setBagPoseAlongPath(idx, 1, o);
                        o.visible = true;
                        if (BACK_BAGS.indexOf(idx) >= 0) {
                            // malas do fundo: sólidas; o contorno tracejado marca a parte escondida pelas da frente
                            const ol = new THREE.LineSegments(outlineGeo, dashMat);
                            ol.computeLineDistances(); ol.renderOrder = 20;
                            if (o.children[0]) o.children[0].add(ol); else o.add(ol);
                            ol.visible = false; nvHosts.push(ol);
                        }
                    });
                }
                function size() {
                    const r = nvBox.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return false;
                    nvRen.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                    nvRen.setSize(r.width, r.height, false);
                    nvCam.aspect = r.width / r.height; nvCam.updateProjectionMatrix();
                    return true;
                }
                function frame() {
                    const tanV = Math.tan(NV_FOV * Math.PI / 360);
                    const Rr = Math.max(1350 / (2 * tanV * nvCam.aspect), 1080 / (2 * tanV));   // enquadra o bin visto de cima
                    if (!nvThick.length) {
                        nvScene.updateMatrixWorld(true);
                        nvHosts.forEach(h => {
                            for (let k = 0; k < 9; k++) {
                                const ang = k * Math.PI / 4, c = new THREE.LineSegments(h.geometry, h.material);
                                c.matrixAutoUpdate = false; c.renderOrder = 20; c.frustumCulled = false;
                                nvThick.push({ c, base: h.matrixWorld.clone(), dx: k < 8 ? Math.cos(ang) : 0, dy: k < 8 ? Math.sin(ang) : 0 });
                                nvScene.add(c);
                            }
                        });
                    }
                    const off = 1.5 * (window.__novaK || 1) * (2 * Rr * tanV) / nvBox.getBoundingClientRect().height;   // ≈ 3 px de espessura na tela
                    nvThick.forEach(t => { t.c.matrix.copy(t.base).premultiply(new THREE.Matrix4().makeTranslation(t.dx * off, 0, t.dy * off)); t.c.matrixWorldNeedsUpdate = true; });
                    nvCam.up.set(0, 0, 1);   // vista de cima: fundo do bin para o topo da tela, abertura para baixo
                    nvCam.position.set(NV_T.x, NV_T.y + Rr, NV_T.z);
                    nvCam.lookAt(NV_T);
                    nvRen.render(nvScene, nvCam);
                    // cota da largura do bin Alpha (44"): entre as faces internas das laterais, acima do bin
                    const dc = document.getElementById('novaDimCanvas');
                    if (dc && !window.__novaNoDim) {
                        const r = nvBox.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
                        dc.width = Math.round(r.width * dpr); dc.height = Math.round(r.height * dpr);
                        const dx = dc.getContext('2d'); dx.setTransform(dpr, 0, 0, dpr, 0, 0); dx.clearRect(0, 0, r.width, r.height);
                        nvCam.updateMatrixWorld(true);
                        const P = (x, z) => { const v = new THREE.Vector3(x, 655, z).project(nvCam); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height]; };
                        const [xa] = P(TH / 2, 0), [xb] = P(DIST - TH / 2, 0);
                        drawTopDimension(dx, xa, xb, TOP_BIN_DIMENSION_Y, '44"');
                    }
                }
                window.novaEnter = () => {
                    try {
                        if (!nvRen) {
                            nvRen = new THREE.WebGLRenderer({ canvas: nvCanvas, antialias: true, alpha: true, stencil: true });
                            nvRen.setClearColor(0xffffff, 0);
                            nvCam = new THREE.PerspectiveCamera(NV_FOV, 1, 10, 25000);
                            build();
                        }
                        if (size()) frame();
                    } catch (err) { console.warn('Alpha top view:', err); }
                };
                window.__novaRender = () => { if (!nvRen || !size()) return null; frame(); return nvCanvas; };   // usado por exportBinsPNG()
                window.addEventListener('resize', () => { if ((currentTab === 'nova' || nvBox.closest('#tour-stage')) && nvRen && size()) frame(); });
            })();



