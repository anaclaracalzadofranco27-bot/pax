        // ============================================================================
        // VIAJANTE (BONECO 1) - REDESENHO COMPLETO a partir da ilustração de referência
        // Homem jovem de camiseta verde-oliva folgada, jeans reto azul, tênis cinza de sola branca, cabelo castanho com franja,
        // mão direita carregando a mala preta pela alça e mão esquerda espalmada na testa (rosto sem traços, como no desenho).
        // Mesmo esqueleto (juntas, comprimentos) do rig anterior: a animação continua a mesma. Todas as peças são "lofts" de
        // seções super-elípticas (tvLoft), com cor chapada + linhas de tinta pintadas em textura.
        // ============================================================================
        const TVC = {
            skin: '#e9a47c', skinSh: '#c9835e', skinLine: '#a65f3d',
            shirt: '#5f6c2f', shirtSh: '#47521f', shirtHi: '#78883c', collar: '#434d1f',
            jeans: '#41679a', jeansSh: '#2f4e7a', jeansHi: '#5f8ec2',
            hair: '#6b4333', hairSh: '#5c382a', hairHi: '#795039',
            shoe: '#8d939d', shoeSh: '#656b76', sole: '#f1f3f5'
        };

        const tvLit = (m, cls) => { m.userData.lit = cls; return m; };
        // Shared factories, retaining each character's own color and shader category.
        const paxMat = (c, cls) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }), cls);
        const paxPaintedMat = (P, cls) => tvLit(paintedMat(P), cls);
        const paxDoublePaintedMat = (P, cls) => { const m = paxPaintedMat(P, cls); m.side = THREE.DoubleSide; return m; };

        function tvSgnPow(v, e) { return Math.sign(v) * Math.pow(Math.abs(v), e); }

        // Loft de seções super-elípticas ao longo de um eixo ('y' ou 'z'). Cada chave: { a: posição no eixo, w: meia-largura (x),
        // d: meia-profundidade, c: deslocamento do centro na outra direção, cx: deslocamento em x, p: expoente (2 = elipse, >2 = mais quadrada) }.
        // As chaves são suavizadas (Catmull-Rom); capStart/capEnd fecham as pontas com tampa plana de normais próprias.
        // UV: u = ângulo (0 = frente +z, ou topo +y no eixo z; 0.25 = +x), v = posição no eixo normalizada (1 = maior a).
        function tvLoft(keys, mat, o = {}) {
            const seg = o.seg || 28, axis = o.axis || 'y', K = keys.length, nR = o.rings || Math.max(12, K * 5);
            const get = (i, f, def) => keys[i][f] === undefined ? def : keys[i][f];
            const cr = (f, def, s) => {
                const i = Math.min(K - 2, Math.floor(s)), t = s - i;
                const p0 = get(Math.max(0, i - 1), f, def), p1 = get(i, f, def), p2 = get(i + 1, f, def), p3 = get(Math.min(K - 1, i + 2), f, def);
                return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
            };
            const lin = (f, s) => { const i = Math.min(K - 2, Math.floor(s)), t = s - i; return keys[i][f] * (1 - t) + keys[i + 1][f] * t; };
            let rings = [];
            for (let r = 0; r < nR; r++) {
                const s = r * (K - 1) / (nR - 1);
                rings.push({ a: lin('a', s), w: Math.max(0.0006, cr('w', 0, s)), d: Math.max(0.0006, cr('d', 0, s)), c: cr('c', 0, s), cx: cr('cx', 0, s), p: Math.max(1.4, cr('p', 2, s)) });
            }
            if (o.capStart) rings = [{ ...rings[0], w: 0.0006, d: 0.0006 }, { ...rings[0] }].concat(rings);
            if (o.capEnd) { const l = rings[rings.length - 1]; rings = rings.concat([{ ...l }, { ...l, w: 0.0006, d: 0.0006 }]); }
            let aMin = Infinity, aMax = -Infinity;
            rings.forEach(r => { aMin = Math.min(aMin, r.a); aMax = Math.max(aMax, r.a); });
            const pos = [], uv = [];
            rings.forEach(rg => {
                for (let j = 0; j <= seg; j++) {
                    const th = j / seg * Math.PI * 2, e = 2 / rg.p, sn = tvSgnPow(Math.sin(th), e), cs = tvSgnPow(Math.cos(th), e);
                    const x = rg.cx + rg.w * sn;
                    const y = axis === 'y' ? rg.a : rg.c + rg.d * cs;
                    const z = axis === 'y' ? rg.c + rg.d * cs : rg.a;
                    pos.push(x, y, z);
                    uv.push(j / seg, (rg.a - aMin) / ((aMax - aMin) || 1));
                }
            });
            const idx = [];
            for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
                const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
                if (o.skip && o.skip((j + 0.5) / seg, (uv[(i * (seg + 1) + j) * 2 + 1] + uv[((i + 1) * (seg + 1) + j) * 2 + 1]) / 2)) continue;
                idx.push(a, b, d, a, d, c);
            }
            let vol = 0;   // volume com sinal: se negativo, as faces estão voltadas para dentro e a ordem dos triângulos é invertida
            for (let k = 0; k < idx.length; k += 3) {
                const A = idx[k] * 3, B = idx[k + 1] * 3, Cc = idx[k + 2] * 3;
                vol += pos[A] * (pos[B + 1] * pos[Cc + 2] - pos[B + 2] * pos[Cc + 1]) - pos[A + 1] * (pos[B] * pos[Cc + 2] - pos[B + 2] * pos[Cc]) + pos[A + 2] * (pos[B] * pos[Cc + 1] - pos[B + 1] * pos[Cc]);
            }
            if (vol < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geo.setIndex(idx);
            geo.computeVertexNormals();
            const nrm = geo.attributes.normal;   // emenda da textura: normais do primeiro e do último vértice de cada anel iguais
            for (let i = 0; i < rings.length; i++) {
                const A = i * (seg + 1), B = A + seg;
                const nx = nrm.getX(A) + nrm.getX(B), ny = nrm.getY(A) + nrm.getY(B), nz = nrm.getZ(A) + nrm.getZ(B), l = Math.hypot(nx, ny, nz) || 1;
                nrm.setXYZ(A, nx / l, ny / l, nz / l); nrm.setXYZ(B, nx / l, ny / l, nz / l);
            }
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true; mesh.receiveShadow = true;
            return mesh;
        }

        // Sweep: seção super-elíptica varrida ao longo de um caminho 3D (Catmull-Rom). Cada chave: { p:[x,y,z], w: meia-largura, d: meia-espessura,
        // s:[x,y,z] direção da largura (é ortogonalizada contra a tangente) }. UV: u = ângulo da seção, v = posição ao longo do caminho (1 no início).
        function tvSweep(keys, mat, o = {}) {
            const seg = o.seg || 16, K = keys.length, nR = o.rings || K * 6;
            const cr = (f, sIdx) => {
                const i = Math.min(K - 2, Math.floor(sIdx)), t = sIdx - i;
                const p0 = f(Math.max(0, i - 1)), p1 = f(i), p2 = f(i + 1), p3 = f(Math.min(K - 1, i + 2));
                return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
            };
            const rings = [];
            for (let r = 0; r < nR; r++) {
                const sI = r * (K - 1) / (nR - 1);
                rings.push({
                    p: new THREE.Vector3(cr(i => keys[i].p[0], sI), cr(i => keys[i].p[1], sI), cr(i => keys[i].p[2], sI)),
                    sv: new THREE.Vector3(cr(i => keys[i].s[0], sI), cr(i => keys[i].s[1], sI), cr(i => keys[i].s[2], sI)),
                    w: Math.max(0.0005, cr(i => keys[i].w, sI)), d: Math.max(0.0005, cr(i => keys[i].d, sI))
                });
            }
            const pos = [], uv = [];
            rings.forEach((rg, r) => {
                const T = rings[Math.min(nR - 1, r + 1)].p.clone().sub(rings[Math.max(0, r - 1)].p).normalize();
                const Sx = rg.sv.clone().addScaledVector(T, -rg.sv.dot(T)).normalize(), Dx = new THREE.Vector3().crossVectors(T, Sx).normalize();
                for (let j = 0; j <= seg; j++) {
                    const th = j / seg * Math.PI * 2, a = tvSgnPow(Math.sin(th), 0.9), b = tvSgnPow(Math.cos(th), 0.9);
                    const q = rg.p.clone().addScaledVector(Sx, rg.w * a).addScaledVector(Dx, rg.d * b);
                    pos.push(q.x, q.y, q.z); uv.push(j / seg, 1 - r / (nR - 1));
                }
            });
            const idx = [];
            for (let i = 0; i < nR - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
            let vol = 0;
            for (let k = 0; k < idx.length; k += 3) {
                const A = idx[k] * 3, B = idx[k + 1] * 3, C = idx[k + 2] * 3;
                vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
            }
            if (vol < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geo.setIndex(idx);
            geo.computeVertexNormals();
            const nrm = geo.attributes.normal;
            for (let i = 0; i < nR; i++) {
                const A = i * (seg + 1), B = A + seg;
                const nx = nrm.getX(A) + nrm.getX(B), ny = nrm.getY(A) + nrm.getY(B), nz = nrm.getZ(A) + nrm.getZ(B), l = Math.hypot(nx, ny, nz) || 1;
                nrm.setXYZ(A, nx / l, ny / l, nz / l); nrm.setXYZ(B, nx / l, ny / l, nz / l);
            }
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true; mesh.receiveShadow = true;
            return mesh;
        }
        // "Pele" do cabelo: as malhas ficam presas ao tronco, com a origem no pivô da cabeça; a cada quadro cada vértice gira junto com a
        // cabeça na proporção do seu peso (1 no couro cabeludo, 0 abaixo dos ombros). Assim o cabelo acompanha a cabeça e continua caindo sobre os ombros.
        function tvHairRig(meshes, wFn) {
            const items = meshes.map(m => {
                const P = m.geometry.attributes.position, W = new Float32Array(P.count);
                for (let i = 0; i < P.count; i++) W[i] = Math.round(wFn(P.getX(i), P.getY(i), P.getZ(i)) * 64) / 64;
                return { m, P0: P.array.slice(), N0: m.geometry.attributes.normal.array.slice(), O0: null, W };
            });
            const qI = new THREE.Quaternion(), qi = new THREE.Quaternion(), v = new THREE.Vector3();
            return { update(q) {
                items.forEach(it => {
                    const g = it.m.geometry, P = g.attributes.position, N = g.attributes.normal, O = g.attributes.aOutN;
                    if (O && !it.O0) it.O0 = O.array.slice();
                    let lw = -1;
                    for (let i = 0; i < P.count; i++) {
                        const w = it.W[i];
                        if (w !== lw) { qi.copy(qI).slerp(q, w); lw = w; }
                        v.fromArray(it.P0, i * 3).applyQuaternion(qi); P.setXYZ(i, v.x, v.y, v.z);
                        v.fromArray(it.N0, i * 3).applyQuaternion(qi); N.setXYZ(i, v.x, v.y, v.z);
                        if (it.O0) { v.fromArray(it.O0, i * 3).applyQuaternion(qi); O.setXYZ(i, v.x, v.y, v.z); }
                    }
                    P.needsUpdate = true; N.needsUpdate = true; if (O) O.needsUpdate = true;
                    g.computeBoundingSphere();
                });
            } };
        }

        // ---------------------------------------------------------------- texturas pintadas (cor chapada + linhas de tinta)
        const tvTex = (w, h, fn) => ({ w, h, fn });
        const TVT = {};
        TVT.shirt = tvTex(1024, 512, (g, W, H) => {
            const Y0 = -0.075, Y1 = 0.426, F = y => (Y1 - y) / (Y1 - Y0);
            g.fillStyle = TVC.shirt; g.fillRect(0, 0, W, H);
            // sombras pintadas nas laterais (sob os braços) e luz no peito/ombros
            [0.25, 0.75].forEach(u => inkPoly(g, W, H, [[u - 0.075, F(0.34)], [u + 0.075, F(0.34)], [u + 0.06, F(-0.02)], [u - 0.06, F(-0.02)]], TVC.shirtSh));
            inkPoly(g, W, H, [[0.93, F(0.36)], [1.07, F(0.36)], [1.10, F(0.20)], [0.90, F(0.20)]], TVC.shirtHi);
            g.fillStyle = TVC.shirtSh; g.fillRect(0, H * F(-0.056), W, H * (1 - F(-0.056)));                       // bainha
            inkTaper(g, W, H, [0, F(-0.056)], [0.5, F(-0.056)], [1, F(-0.056)], 4);
            // dobras: da axila à cintura (uma de cada lado, duas na esquerda), diagonal do peito puxada pelo braço levantado, costas
            [[0.215, 1], [0.785, -1]].forEach(([u, sg]) => {
                inkTaper(g, W, H, [u, F(0.30)], [u - sg * 0.022, F(0.17)], [u - sg * 0.040, F(0.02)], 7);
                inkTaper(g, W, H, [u - sg * 0.040, F(0.27)], [u - sg * 0.062, F(0.16)], [u - sg * 0.070, F(0.07)], 5);
            });
            inkTaper(g, W, H, [0.905, F(0.34)], [0.985, F(0.21)], [0.075, F(0.07)], 6);
            inkTaper(g, W, H, [0.945, F(0.12)], [0.010, F(0.095)], [0.062, F(0.035)], 4);
            inkTaper(g, W, H, [0.44, F(0.30)], [0.46, F(0.18)], [0.49, F(0.05)], 6);
            inkTaper(g, W, H, [0.56, F(0.30)], [0.54, F(0.18)], [0.51, F(0.05)], 6);
            inkTaper(g, W, H, [0.38, F(0.10)], [0.40, F(0.05)], [0.44, F(0.0)], 4);
        });
        TVT.sleeve = tvTex(512, 256, (g, W, H) => {
            g.fillStyle = TVC.shirt; g.fillRect(0, 0, W, H);
            g.fillStyle = TVC.shirtSh; g.fillRect(0, H * 0.905, W, H);
            inkTaper(g, W, H, [0, 0.905], [0.5, 0.905], [1, 0.905], 6);
            inkTaper(g, W, H, [0.60, 0.22], [0.56, 0.50], [0.61, 0.82], 5);
            inkTaper(g, W, H, [0.07, 0.30], [0.03, 0.55], [0.08, 0.80], 4);
            inkPoly(g, W, H, [[0.94, 0.10], [1.06, 0.10], [1.05, 0.55], [0.95, 0.55]], TVC.shirtHi);
        });
        TVT.pelvis = tvTex(512, 512, (g, W, H) => {
            const Y0 = -0.118, Y1 = 0.118, F = y => (Y1 - y) / (Y1 - Y0);
            g.fillStyle = TVC.jeans; g.fillRect(0, 0, W, H);
            inkPoly(g, W, H, [[0.93, F(0.02)], [1.07, F(0.02)], [1.06, F(-0.08)], [0.94, F(-0.08)]], TVC.jeansHi);
            inkPoly(g, W, H, [[0, F(0.040)], [1, F(0.040)], [1, F(0.006)], [0, F(0.006)]], TVC.jeansSh);                // sombra da barra da camiseta
            inkPoly(g, W, H, [[0, F(0.040)], [1, F(0.040)], [1, F(0.026)], [0, F(0.026)]], '#243f66');
            inkTaper(g, W, H, [0, F(0.085)], [0.5, F(0.085)], [1, F(0.085)], 4);                                       // cós
            inkTaper(g, W, H, [0.000, F(0.08)], [0.012, F(-0.02)], [0.985, F(-0.052)], 4);                             // braguilha em J
            [1, -1].forEach(sg => {                                                                                       // bolsos frontais (u cresce para +x)
                const U = x => sg > 0 ? x : 1 - x;
                inkTaper(g, W, H, [U(0.135), F(0.08)], [U(0.085), F(-0.025)], [U(0.035), F(-0.045)], 4);
                inkTaper(g, W, H, [U(0.085), F(0.02)], [U(0.060), F(-0.01)], [U(0.040), F(-0.025)], 3);
            });
            [0.5 - 0.115, 0.5 + 0.115].forEach(u => {                                                                    // bolsos de trás
                inkPoly(g, W, H, [[u - 0.06, F(0.02)], [u + 0.06, F(0.02)], [u + 0.055, F(-0.045)], [u, F(-0.065)], [u - 0.055, F(-0.045)]], null, true, 3);
            });
            [[0.955, 0.915], [0.045, 0.085]].forEach(([ua, ub]) => inkTaper(g, W, H, [ua, 0.98], [(ua + ub) / 2, 0.88], [ub, 0.76], 4));   // dobras da virilha
        });
        const tvLegPaint = (isCalf) => tvTex(512, 512, (g, W, H) => {
            g.fillStyle = TVC.jeans; g.fillRect(0, 0, W, H);
            inkPoly(g, W, H, [[0.92, 0.0], [1.02, 0.0], [1.03, 1.0], [0.91, 1.0]], TVC.jeansHi);                        // faixa de luz na frente
            inkPoly(g, W, H, [[0.60, 0.0], [0.77, 0.0], [0.78, 1.0], [0.62, 1.0]], TVC.jeansSh);                         // lado de dentro mais escuro
            [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.02], [u + 0.004, 0.50], [u, 0.97], 4));                    // costuras laterais
            if (!isCalf) {
                inkTaper(g, W, H, [0.935, 0.08], [0.965, 0.18], [0.995, 0.30], 5);                                       // dobra do quadril
                inkTaper(g, W, H, [0.050, 0.10], [0.030, 0.20], [0.010, 0.30], 4);
                inkTaper(g, W, H, [0.94, 0.80], [1.000, 0.82], [0.06, 0.80], 5);                                         // vincos acima do joelho
                inkTaper(g, W, H, [0.95, 0.89], [1.000, 0.905], [0.05, 0.89], 4);
            } else {
                inkTaper(g, W, H, [0.955, 0.05], [1.000, 0.07], [0.045, 0.05], 5);                                       // joelho
                inkTaper(g, W, H, [0.0, 0.955], [0.5, 0.955], [1, 0.955], 6);                                            // barra
                inkTaper(g, W, H, [0, 0.93], [0.5, 0.93], [1, 0.93], 3);
                [0.70, 0.76, 0.82, 0.88].forEach((y, i) => inkTaper(g, W, H, [0.93 + i * 0.004, y], [1.0, y + 0.018], [0.07 - i * 0.004, y], 4));   // barra amontoada sobre o tênis
            }
        });
        TVT.thigh = tvLegPaint(false);
        TVT.calf = tvLegPaint(true);
        TVT.forearm = tvTex(256, 256, (g, W, H) => {
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            inkTaper(g, W, H, [0.88, 0.12], [0.92, 0.35], [0.95, 0.60], 3, TVC.skinLine);
            inkTaper(g, W, H, [0.10, 0.28], [0.06, 0.50], [0.07, 0.74], 3, TVC.skinLine);
            inkTaper(g, W, H, [0.96, 0.02], [0.02, 0.04], [0.08, 0.02], 3, TVC.skinLine);
        });
        TVT.neck = tvTex(256, 256, (g, W, H) => {                     // a: 0.34 (base) .. 0.475 (topo); a sombra do queixo cai no alto do pescoço
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const F = a => (0.475 - a) / 0.135;
            g.fillStyle = TVC.skinSh; g.fillRect(0, 0, W, H * F(0.452));
            g.fillStyle = '#b06a50'; g.fillRect(0, 0, W, H * F(0.466));
            g.fillStyle = TVC.skinSh; g.fillRect(0, H * F(0.408), W, H);                                  // dentro da gola
        });
        TVT.upperArm = tvTex(256, 256, (g, W, H) => {                 // a: -0.090 .. -0.292; sombra da manga logo abaixo da barra (-0.138)
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const F = a => (-0.090 - a) / 0.202;
            g.fillStyle = TVC.skinSh; g.fillRect(0, 0, W, H * F(-0.176));
            g.fillStyle = '#b06a50'; g.fillRect(0, 0, W, H * F(-0.154));
            inkTaper(g, W, H, [0.90, F(-0.17)], [0.94, F(-0.22)], [0.97, F(-0.27)], 3, TVC.skinLine);
        });
        TVT.face = tvTex(1024, 512, (g, W, H) => {
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const P = (x, y) => headFP(x, y, W, H), poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
            // rosto sem traços (como na ilustração): só a sombra da franja na testa e sob o queixo
            poly([P(-0.080, 0.176), P(0.080, 0.176), P(0.074, 0.140), P(0.035, 0.128), P(-0.035, 0.128), P(-0.074, 0.140)], TVC.skinSh);
            poly([P(-0.056, 0.045), P(0.056, 0.045), P(0.032, 0.018), P(-0.032, 0.018)], TVC.skinSh);
        });
        TVT.hair = tvTex(1024, 512, (g, W, H) => {
            g.fillStyle = TVC.hair; g.fillRect(0, 0, W, H);
            const N = 12, tones = [TVC.hairHi, TVC.hair, TVC.hairSh];
            for (let k = 0; k < N; k++) {                                        // mechas largas e sinuosas, varridas da coroa até a borda
                const u0 = k / N, a = [], b = [];
                for (let i = 0; i <= 10; i++) {
                    const v = i / 10, sw = u0 + 0.13 * v + 0.012 * Math.sin(v * 7 + k * 1.7);
                    a.push([sw, 0.02 + 0.96 * v]);
                    b.unshift([sw + (1 / N) * (0.95 - 0.35 * v) + 0.010 * Math.sin(v * 6 + k), 0.02 + 0.96 * v]);
                }
                inkPoly(g, W, H, a.concat(b), tones[k % 3]);
            }
            for (let k = 0; k < 20; k++) { const u0 = (k + 0.4) / 20; inkTaper(g, W, H, [u0, 0.06], [u0 + 0.05, 0.48], [u0 + 0.12, 0.98], 3, TVC.hairSh); }
            for (let k = 0; k < 7; k++) { const u0 = (k + 0.2) / 7; inkTaper(g, W, H, [u0, 0.36], [u0 + 0.04, 0.66], [u0 + 0.08, 0.95], 3); }
        });
        TVT.shoe = tvTex(256, 512, (g, W, H) => {
            // eixo z: v = 1 na ponta; y do canvas = 1 - (z + 0.060) / 0.238. u = 0 é o topo do tênis
            const Z = z => 1 - (z + 0.060) / 0.238;
            g.fillStyle = TVC.shoe; g.fillRect(0, 0, W, H);
            [0.25, 0.75].forEach(u => inkPoly(g, W, H, [[u - 0.10, Z(0.12)], [u + 0.10, Z(0.12)], [u + 0.09, Z(-0.05)], [u - 0.09, Z(-0.05)]], TVC.shoeSh));
            g.fillStyle = TVC.sole; g.fillRect(0, 0, W, H * Z(0.138));                                                      // biqueira branca
            inkTaper(g, W, H, [0, Z(0.138)], [0.5, Z(0.138)], [1, Z(0.138)], 4);
            [0.0, 1.0].forEach(u => { for (let i = 0; i < 4; i++) { const z = 0.040 + i * 0.022; inkTaper(g, W, H, [u - 0.06, Z(z)], [u, Z(z) - 0.012], [u + 0.06, Z(z)], 3); } });   // cadarço
            [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u - 0.02, Z(0.098)], [u, Z(0.03)], [u - 0.03, Z(-0.045)], 3));
        });

        const TV_CASE_K = 0.74;           // escala do corpo da mala (1 = tamanho anterior); a alça e a mão não mudam
        // Shared suitcase outline/extrusion (same shape and bevel parameters).
        function paxRoundedRect(w, h, r) {
            const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
            sh.moveTo(x + r, y); sh.lineTo(x + w - r, y);
            sh.quadraticCurveTo(x + w, y, x + w, y + r);
            sh.lineTo(x + w, y + h - r);
            sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
            sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
            return sh;
        }
        function paxCaseSlab(w, h, r, depth, mat, bev) {
            const geo = new THREE.ExtrudeGeometry(paxRoundedRect(w, h, r), { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
            geo.translate(0, 0, -depth / 2);
            const m = new THREE.Mesh(geo, mat); m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = true; return m;
        }
        function tvSuitcase() {
            const g = new THREE.Group(), K = TV_CASE_K;
            const cm = (c, r) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 }), 'case');
            const navy = cm(0x2d2f3b, 0.4), navyHi = cm(0x40445a, 0.4), dark = cm(0x1b1c25, 0.5), strapM = cm(0x5b606e, 0.5);
            const CW = 0.430 * K, CH = 0.690 * K, CD = 0.225 * K, CR = 0.075 * K, top = -0.052, cy = top - CH / 2;
            const shell = paxCaseSlab(CW, CH, CR, CD - 0.05 * K, navy, 0.025 * K); shell.position.set(0, cy, 0); g.add(shell);
            const rim = paxCaseSlab(CW + 0.008, CH + 0.008, CR + 0.004, 0.030 * K, navyHi, 0.010 * K); rim.position.set(0, cy, 0); g.add(rim);          // junção das metades da casca
            [-1, 1].forEach(sx => {
                const x = sx * (CD / 2 + 0.002);
                const plate = paxCaseSlab(0.150 * K, 0.060 * K, 0.016 * K, 0.008, dark, 0); plate.position.set(x, top - 0.085 * K, 0); g.add(plate);               // caixa do puxador telescópico
                const bar = paxCaseSlab(0.100 * K, 0.014, 0.006, 0.010, navyHi, 0); bar.position.set(x + sx * 0.003, top - 0.085 * K, 0); g.add(bar);
                [-0.060 * K, 0.060 * K].forEach(zo => {                                                                                                // dois sulcos longos das hastes
                    const gl = CH - 0.250 * K;
                    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.006, gl, 0.012), dark);
                    groove.position.set(x, top - 0.130 * K - gl / 2, zo); g.add(groove);
                });
            });
            // alça de mão: tira cinza apoiada em dois suportes sobre o topo (a mão fecha em volta dela)
            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.016, 0.150), strapM); strap.castShadow = true; g.add(strap);
            [-0.068, 0.068].forEach(zo => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.034, Math.abs(top), 0.022), dark); post.position.set(0, top / 2, zo); post.castShadow = true; g.add(post); });
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {                                                                       // 4 rodinhas duplas
                const wx = sx * 0.050 * K, wz = sz * 0.140 * K, wy = top - CH - 0.006;
                const mount = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.026, 0.040), dark); mount.position.set(wx, wy + 0.004, wz); g.add(mount);
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.036, 16), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, wy - 0.018, wz); wheel.castShadow = true; wheel.userData.isWheel = true; g.add(wheel);
            });
            return g;
        }

        const tvBall = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; };
        // Retain independent ear material instances and exact dimensions.
        function addAdultEars(head, texture, lit) {
            [-1, 1].forEach(sd => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), paxPaintedMat(texture, lit));
                ear.scale.set(0.36, 1.18, 0.80);
                ear.position.set(sd * 0.0715, 0.116, -0.006);
                ear.rotation.set(0.08, sd * 0.18, sd * -0.10);
                head.add(ear);
            });
        }
        // Two sizes; no geometry standardization between the elder and mother.
        function addAdultNose(head, skinM, bridgeR, tipR, wingR, wingX) {
            const nRoot = new THREE.Vector3(0, 0.136, 0.092), nTip = new THREE.Vector3(0, 0.098, 0.107), nd = nTip.clone().sub(nRoot);
            const bridge = new THREE.Mesh(new THREE.ConeGeometry(bridgeR, nd.length(), 8), skinM);
            bridge.position.copy(nRoot).add(nTip).multiplyScalar(0.5);
            bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nd.clone().negate().normalize());
            bridge.scale.set(1.0, 1, 0.95); head.add(bridge);
            const tip = new THREE.Mesh(new THREE.SphereGeometry(tipR, 14, 12), skinM);
            tip.scale.set(1.0, 0.85, 1.0); tip.position.set(0, 0.0985, 0.1005); head.add(tip);
            [-1, 1].forEach(sd => { const wing = new THREE.Mesh(new THREE.SphereGeometry(wingR, 10, 10), skinM); wing.scale.set(0.9, 1.0, 0.85); wing.position.set(sd * wingX, 0.0995, 0.0955); head.add(wing); });
        }
        // mão com 5 dedos de 3 falanges (palma, dedos articulados prox/mid/tip). grip = punho fechado em volta de uma alça
            function tvBuildHand(side, grip, skinM) {
                const hand = new THREE.Group();
                hand.add(tvLoft([
                    { a: 0.004, w: 0.016, d: 0.026 }, { a: -0.020, w: 0.0165, d: 0.033 }, { a: -0.055, w: 0.0155, d: 0.038 }, { a: -0.080, w: 0.0135, d: 0.037 }
                ], skinM, { seg: 20, capEnd: true }));
                const specs = [
                    { z: 0.031, y: -0.030, l: [0.031, 0.025, 0.021], r: 0.0098, thumb: true },
                    { z: 0.0262, y: -0.079, l: [0.030, 0.021, 0.018], r: 0.0086, spread: 0.10 },
                    { z: 0.0092, y: -0.082, l: [0.033, 0.024, 0.019], r: 0.0088, spread: 0.03 },
                    { z: -0.0085, y: -0.079, l: [0.030, 0.022, 0.018], r: 0.0083, spread: -0.03 },
                    { z: -0.0250, y: -0.073, l: [0.023, 0.016, 0.015], r: 0.0074, spread: -0.10 }
                ];
                const finger = (len, r0, r1) => tvLoft([{ a: 0, w: r0 * 0.9, d: r0 * 0.9 }, { a: -len * 0.10, w: r0, d: r0 }, { a: -len * 0.88, w: r1, d: r1 }, { a: -len * 0.97, w: r1 * 0.7, d: r1 * 0.7 }, { a: -len, w: r1 * 0.3, d: r1 * 0.3 }], skinM, { seg: 10, rings: 8, capEnd: true });
                const fingers = [];
                specs.forEach(sp => {
                    const prox = new THREE.Group(); prox.position.set(sp.thumb ? -side * 0.004 : 0, sp.y, sp.z);
                    prox.add(finger(sp.l[0], sp.r, sp.r * 0.92));
                    const mid = new THREE.Group(); mid.position.y = -sp.l[0]; prox.add(mid);
                    mid.add(tvBall(sp.r * 0.92, skinM)); mid.add(finger(sp.l[1], sp.r * 0.92, sp.r * 0.84));
                    const tip = new THREE.Group(); tip.position.y = -sp.l[1]; mid.add(tip);
                    tip.add(tvBall(sp.r * 0.84, skinM)); tip.add(finger(sp.l[2], sp.r * 0.84, sp.r * 0.68));
                    if (sp.thumb) {
                        prox.rotation.x = -0.30; prox.rotation.z = -side * (grip ? 0.9 : 0.30); mid.rotation.z = -side * (grip ? 0.8 : 0.22); tip.rotation.z = -side * (grip ? 0.5 : 0.15);
                    } else if (grip) {            // punho fechado em volta da alça (curva em direção à palma)
                        prox.rotation.z = -side * 1.32; mid.rotation.z = -side * 1.50; tip.rotation.z = -side * 1.15;
                    } else {
                        prox.rotation.x = sp.spread; prox.rotation.z = -side * 0.17; mid.rotation.z = -side * 0.22; tip.rotation.z = -side * 0.15;
                    }
                    hand.add(prox);
                    fingers.push({ prox, mid, tip, isThumb: !!sp.thumb, spread: sp.spread || 0 });
                });
                return { hand, fingers };
            }

