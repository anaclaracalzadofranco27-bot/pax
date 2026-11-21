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

