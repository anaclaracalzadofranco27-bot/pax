        // ============================================================================
        // ESTILO DESENHO ANIMADO DO 1º BONECO: sombreamento em faixas (toon) + contorno de tinta (casca invertida)
        // ============================================================================
        const OUTLINE_PX = 1.0;                          // espessura do contorno na tela, em pixels
        const OUTLINE_W = { value: 0.012 };              // espessura em unidades locais (atualizada a cada quadro)
        // iluminação "de desenho": a cor mostrada é exatamente a cor do material; só uma sombra dura onde a normal se afasta da luz
        const FLAT_U = { uLight: { value: new THREE.Vector3(0.40, 0.80, 0.45).normalize() }, uThr: { value: 0.10 } };
        // Contorno de tinta: espessura em unidades locais. Na versão "rica" (viajante) o traço engrossa no lado da sombra e afina no lado da luz,
        // e a cor é um quase-preto tingido pela cor da peça (pele, tecido, jeans, cabelo...), em vez de preto puro.
        // Aparição dos bonecos: dissolve em pontilhado ordenado (Bayer 4x4). uFade = 0 invisível, 1 inteiro. Sem transparência,
        // então o contorno de tinta não aparece através do corpo durante a aparição.
        const PAX_FADE = 0.35;   // duração do dissolve (s), igual à rampa de início da caminhada
        const FADE_GLSL_HEAD = '\nuniform float uFade;\nfloat paxB2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }\nfloat paxB4(vec2 a) { return paxB2(0.5 * a) * 0.25 + paxB2(a); }';
        const FADE_GLSL_TEST = '\nif (paxB4(gl_FragCoord.xy) >= uFade) discard;';
        function addFade(sh, fadeU) {
            if (!fadeU) return;
            sh.uniforms.uFade = fadeU;
            sh.fragmentShader = sh.fragmentShader
                .replace('#include <common>', '#include <common>' + FADE_GLSL_HEAD)
                .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FADE_GLSL_TEST);
        }
        // Active rich-outline shader, kept with identical GLSL and program cache key.
        function outlineMaterial(mul, col, fadeU) {
            const m = new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide });
            m.onBeforeCompile = (sh) => {
                sh.uniforms.uOutlineW = OUTLINE_W;
                sh.uniforms.uLightO = FLAT_U.uLight;
                sh.vertexShader = sh.vertexShader
                    .replace('#include <common>', '#include <common>\nattribute vec3 aOutN;\nuniform float uOutlineW;\nuniform vec3 uLightO;')
                    .replace('#include <begin_vertex>', 'vec3 nvO = normalize(normalMatrix * aOutN);\nfloat shO = clamp(0.5 - 0.5 * dot(nvO, normalize(uLightO)), 0.0, 1.0);\nvec3 transformed = position + normalize(aOutN) * uOutlineW * ' + mul.toFixed(3) + ' * mix(0.62, 1.38, shO);');
                addFade(sh, fadeU);
            };
            m.customProgramCacheKey = () => 'inkOutline' + mul + 'R' + (fadeU ? 'F' : '');
            return m;
        }
        // Iluminação "rica" do viajante: 3 faixas de luz (luz, meio-tom, sombra) + sombra funda, com sombra fria/saturada e luz quente por tipo de
        // material, reflexo azulado do chão nas faces voltadas para baixo e uma luz de recorte fria na borda do lado oposto à luz principal.
        const RICH = {   // multiplicadores de cor: sh = sombra, deep = sombra funda, hi = faixa de luz; out = cor do contorno
            skin:  { sh: [0.80, 0.62, 0.66], deep: [0.80, 0.76, 0.86], hi: [1.04, 1.13, 1.20], out: 0x2b1410 },
            cloth: { sh: [0.64, 0.73, 0.90], deep: [0.80, 0.82, 0.92], hi: [1.17, 1.15, 1.08], out: 0x11160a },
            denim: { sh: [0.67, 0.73, 0.88], deep: [0.80, 0.82, 0.92], hi: [1.17, 1.13, 1.07], out: 0x0a1322 },
            hair:  { sh: [0.66, 0.62, 0.80], deep: [0.80, 0.78, 0.88], hi: [1.42, 1.36, 1.28], out: 0x1d0e08 },
            shoe:  { sh: [0.74, 0.78, 0.92], deep: [0.84, 0.86, 0.94], hi: [1.06, 1.06, 1.08], out: 0x14151a },
            case:  { sh: [0.72, 0.72, 0.88], deep: [0.80, 0.80, 0.90], hi: [1.50, 1.50, 1.62], out: 0x07070a },
            suit:  { sh: [0.76, 0.71, 0.72], deep: [0.84, 0.81, 0.85], hi: [1.10, 1.08, 1.03], out: 0x251a12 },
            oldskin: { sh: [0.88, 0.76, 0.76], deep: [0.86, 0.82, 0.88], hi: [1.03, 1.05, 1.07], out: 0x2b1810 },
            white: { sh: [0.80, 0.82, 0.93], deep: [0.86, 0.87, 0.94], hi: [1.04, 1.04, 1.04], out: 0x24211f },
            dark:  { sh: [0.74, 0.72, 0.84], deep: [0.84, 0.82, 0.90], hi: [1.45, 1.40, 1.35], out: 0x0d0a09 },
            grey:  { sh: [0.80, 0.80, 0.88], deep: [0.88, 0.88, 0.92], hi: [1.08, 1.08, 1.08], out: 0x1c1d22 },
            leather: { sh: [0.70, 0.64, 0.72], deep: [0.80, 0.76, 0.84], hi: [1.12, 1.08, 1.04], out: 0x1c0e07 },
            red:   { sh: [0.70, 0.56, 0.70], deep: [0.82, 0.76, 0.86], hi: [1.22, 1.30, 1.16], out: 0x2a0a08 },
            blanket: { sh: [0.78, 0.78, 0.90], deep: [0.88, 0.88, 0.94], hi: [1.04, 1.04, 1.04], out: 0x2a2623 },
            blonde: { sh: [0.84, 0.76, 0.72], deep: [0.90, 0.86, 0.90], hi: [1.08, 1.08, 1.06], out: 0x3a2a14 }
        };
        function richMaterial(old, fadeU) {
            const cls = RICH[old.userData && old.userData.lit] || RICH.cloth;
            const m = new THREE.MeshBasicMaterial({ color: old.color, map: old.map || null, side: old.side });
            m.onBeforeCompile = (sh) => {
                Object.assign(sh.uniforms, FLAT_U);
                sh.uniforms.uSh = { value: new THREE.Vector3(...cls.sh) };
                sh.uniforms.uDeep = { value: new THREE.Vector3(...cls.deep) };
                sh.uniforms.uHi = { value: new THREE.Vector3(...cls.hi) };
                sh.vertexShader = sh.vertexShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vVN;\nvarying vec3 vWN;')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVN = normalize(normalMatrix * normal);\nvWN = normalize(mat3(modelMatrix) * normal);');
                sh.fragmentShader = sh.fragmentShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vVN;\nvarying vec3 vWN;\nuniform vec3 uLight;\nuniform float uThr;\nuniform vec3 uSh;\nuniform vec3 uDeep;\nuniform vec3 uHi;')
                    .replace('#include <color_fragment>', `#include <color_fragment>
                        float sgn = gl_FrontFacing ? 1.0 : -1.0;
                        vec3 fN = normalize(vVN) * sgn;
                        vec3 wN = normalize(vWN) * sgn;
                        float nl = dot(fN, normalize(uLight));
                        float bMid = smoothstep(uThr - 0.015, uThr + 0.015, nl);
                        float bHi = smoothstep(0.58, 0.61, nl);
                        float bDeep = smoothstep(-0.42, -0.39, nl);
                        vec3 c = diffuseColor.rgb;
                        c *= mix(uSh, vec3(1.0), bMid);
                        c *= mix(uDeep, vec3(1.0), bDeep);
                        c *= mix(vec3(1.0), uHi, bHi);
                        float down = 1.0 - smoothstep(-0.85, -0.15, wN.y);
                        c = mix(c, c * vec3(0.82, 0.96, 1.06) + vec3(0.012, 0.035, 0.04), down * 0.6);
                        float rimEdge = 1.0 - max(fN.z, 0.0);
                        float rimSide = dot(normalize(fN.xy + vec2(0.0001)), vec2(-0.80, 0.60));
                        float rim = smoothstep(0.60, 0.64, rimEdge) * smoothstep(0.25, 0.45, rimSide);
                        c = mix(c, c * 1.12 + vec3(0.05, 0.09, 0.12), rim * 0.75);
                        diffuseColor.rgb = c;`);
                addFade(sh, fadeU);
            };
            m.customProgramCacheKey = () => 'flatRich' + (old.userData && old.userData.lit) + (fadeU ? 'F' : '');
            return m;
        }
        // normais suavizadas por posição (evita frestas no contorno de caixas e arestas vivas)
        function ensureOutlineNormals(geo) {
            if (geo.attributes.aOutN) return;
            const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map();
            const key = i => Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000);
            for (let i = 0; i < p.count; i++) {
                const k = key(i); let a = acc.get(k);
                if (!a) { a = [0, 0, 0]; acc.set(k, a); }
                a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
            }
            const out = new Float32Array(p.count * 3);
            for (let i = 0; i < p.count; i++) {
                const a = acc.get(key(i)); let x = a[0], y = a[1], z = a[2], l = Math.hypot(x, y, z);
                if (l < 1e-5) { x = n.getX(i); y = n.getY(i); z = n.getZ(i); l = Math.hypot(x, y, z) || 1; }
                out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
            }
            geo.setAttribute('aOutN', new THREE.BufferAttribute(out, 3));
        }
        function stylizeCartoon(root, fadeU) {
            const meshes = [], cache = new Map(), inks = new Map();
            root.traverse(o => { if (o.isMesh) meshes.push(o); });
            const inkFor = (sz, mul, cls) => {
                const key = sz + cls;
                let m = inks.get(key);
                if (!m) { m = outlineMaterial(mul, (RICH[cls] || RICH.cloth).out, fadeU); inks.set(key, m); }
                return m;
            };
            meshes.forEach(mesh => {
                const old = mesh.material;
                const cls = old && old.userData && old.userData.lit;
                if (old && old.isMeshStandardMaterial) {
                    let fm = cache.get(old);
                    if (!fm) { fm = richMaterial(old, fadeU); cache.set(old, fm); }
                    mesh.material = fm;
                }
                mesh.geometry.computeBoundingSphere();
                const r = mesh.geometry.boundingSphere.radius * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
                if (r < 0.009) return;
                const gt = mesh.geometry.type;
                if ((gt === 'SphereGeometry' && r < 0.06) || (gt === 'ConeGeometry' && r < 0.04)) return;
                ensureOutlineNormals(mesh.geometry);
                const o = new THREE.Mesh(mesh.geometry, r < 0.025 ? inkFor('s', 0.60, cls) : (r < 0.06 ? inkFor('m', 0.85, cls) : inkFor('l', 1.0, cls)));
                o.castShadow = false; o.receiveShadow = false; o.userData.isOutline = true;
                mesh.add(o);
            });
        }

