
// ============================================================================
// PASSAGEIROS (viajante, senhor e mãe com bebê) caminhando na passarela de embarque.
// Mesmo código e animação do arquivo do manequim; a câmera 3D foi enquadrada na passarela do SVG.
// ============================================================================
const PAX_START = 0.5;                        // segundos da linha do tempo em que o primeiro passageiro começa a andar
let paxLastTick = performance.now();
function PAX_TIMELINE() { return time + (playing ? Math.min(0.1, (performance.now() - paxLastTick) / 1000) : 0); }
(() => {
        // ============================================================================
        // CENA 3D E MAPEAMENTO EXATO SOBRE O VETOR DA RAMPA (A → z → y → x)
        // ============================================================================
        // Camada 3D sobre a passarela do avião: o canvas cobre só o retângulo AV do SVG (unidades do viewBox), para renderizar nítido com o zoom.
        // K = unidades do SVG por unidade do mundo. 17.94 dá a mesma proporção boneco/piso do arquivo do manequim; aqui os passageiros ficam 2x maiores,
        // mais perto do tamanho dos passageiros sentados na cabine (maior que isso, a cabeça passaria da borda de cima da passarela).
        const PAX_SCALE = 2.0;
        const PAX_DY = 7.5; // o caminho desce um pouco no piso (unidades do SVG), para a cabeça dos bonecos maiores não passar da borda de cima da passarela
        const AV = { x0: 185, y0: 455, w: 175, h: 190, K: 17.94 * PAX_SCALE, ZOOM: 2.35 };
        const container = document.getElementById('pax-layer');
        const scene = new THREE.Scene();

        const SVG_W = AV.w;
        const SVG_H = AV.h;
        const ASPECT = SVG_W / SVG_H;
        const FRUSTUM_H = AV.h / AV.K;
        const FRUSTUM_W = FRUSTUM_H * ASPECT;

        const camera = new THREE.OrthographicCamera(
            -FRUSTUM_W / 2, FRUSTUM_W / 2,
             FRUSTUM_H / 2, -FRUSTUM_H / 2,
             0.1, 100
        );
        camera.position.set(10, 7.2, 10);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(4, (window.devicePixelRatio || 1) * AV.ZOOM));   // resolução para o zoom inicial (2.35x), limitada a 4x
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;   // sombra do chão com borda dura (cel shading)
        container.appendChild(renderer.domElement);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.92);
        hemiLight.position.set(0, 12, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.80);
        dirLight.position.set(5, 13, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 35;
        const d = 8.5;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.ShadowMaterial({ opacity: 0.22 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const START_ANGLE = -Math.PI * 0.50;
        const END_ANGLE = 0.0;
        const TURN_DELTA = END_ANGLE - START_ANGLE;

        const raycaster = new THREE.Raycaster();
        const groundMathPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        function svgToWorldOnGround(svgX, svgY) {
            const ndcX = ((svgX - AV.x0) / SVG_W) * 2 - 1;
            const ndcY = -((svgY - AV.y0) / SVG_H) * 2 + 1;
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(groundMathPlane, target);
            return target;
        }

        // pontos do caminho no piso da passarela (coordenadas do SVG do avião), x perto da porta da aeronave.
        // A fica logo depois do poste do pórtico, do lado da passarela: os bonecos são mais altos que a abertura do pórtico,
        // então não começam dentro dele (a cabeça passaria por cima da viga). Eles surgem ali com um dissolve curto (PAX_FADE).
        const PT_A = svgToWorldOnGround(312.0, 607.7 + PAX_DY);
        const PT_Z = svgToWorldOnGround(286.5, 591.1 + PAX_DY);
        const PT_Y = svgToWorldOnGround(252.2, 568.7 + PAX_DY);
        const PT_X = svgToWorldOnGround(219.8, 547.5 + PAX_DY);

        const LEN_AZ = PT_A.distanceTo(PT_Z);
        const LEN_ZY = PT_Z.distanceTo(PT_Y);
        const LEN_YX = PT_Y.distanceTo(PT_X);
        const TOTAL_PATH_LEN = LEN_AZ + LEN_ZY + LEN_YX;

        function getPathWorldPosition(dist) {
            const clamped = Math.max(0, Math.min(TOTAL_PATH_LEN, dist));
            if (clamped <= LEN_AZ) {
                return new THREE.Vector3().lerpVectors(PT_A, PT_Z, clamped / LEN_AZ);
            } else if (clamped <= LEN_AZ + LEN_ZY) {
                return new THREE.Vector3().lerpVectors(PT_Z, PT_Y, (clamped - LEN_AZ) / LEN_ZY);
            } else {
                return new THREE.Vector3().lerpVectors(PT_Y, PT_X, (clamped - LEN_AZ - LEN_ZY) / LEN_YX);
            }
        }

        // ============================================================================
        // CONSTRUÇÃO DO MANEQUIM ARTICULADO 3D (CÂNONE ANATÔMICO E VIAJANTE REALISTA)
        // ============================================================================
        const defaultBodyMat = new THREE.MeshStandardMaterial({ color: 0xd4dae3, roughness: 0.44, metalness: 0.08 });
        const defaultJointMat = new THREE.MeshStandardMaterial({ color: 0x3b4454, roughness: 0.52, metalness: 0.16 });

        // Paleta fiel à ilustração de referência do Viajante (Personagem 1)
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe9a684, roughness: 0.55, metalness: 0.0 });
        const skinShadowMat = new THREE.MeshStandardMaterial({ color: 0xc98c72, roughness: 0.60, metalness: 0.0 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x767a46, roughness: 0.80, metalness: 0.0 });
        const shirtTorsoMat = new THREE.MeshStandardMaterial({ color: 0x767a46, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x5d6136, roughness: 0.85, metalness: 0.0 });
        const jeansMat = new THREE.MeshStandardMaterial({ color: 0x446282, roughness: 0.95, metalness: 0.0 });
        const jeansSeamMat = new THREE.MeshStandardMaterial({ color: 0x30485f, roughness: 0.85, metalness: 0.0 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x6f7176, roughness: 0.65, metalness: 0.05 });
        const soleMat = new THREE.MeshStandardMaterial({ color: 0xdfe1e2, roughness: 0.70, metalness: 0.0 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x58382e, roughness: 0.86, metalness: 0.0 });
        const featureMat = new THREE.MeshStandardMaterial({ color: 0x36241c, roughness: 0.80, metalness: 0.0 });
        const suitcaseMat = new THREE.MeshStandardMaterial({ color: 0x76828e, roughness: 0.46, metalness: 0.15 });
        const suitcaseSideMat = new THREE.MeshStandardMaterial({ color: 0x5d6772, roughness: 0.50, metalness: 0.15 });
        const suitcaseTrimMat = new THREE.MeshStandardMaterial({ color: 0x3d4650, roughness: 0.58, metalness: 0.12 });
        const suitcaseWellMat = new THREE.MeshStandardMaterial({ color: 0x1e262e, roughness: 0.65, metalness: 0.10 });

        // Paleta fiel à ilustração de referência do Senhor de Idade (Personagem 2)
        const elderSkinMat = new THREE.MeshStandardMaterial({ color: 0xf0baa3, roughness: 0.58, metalness: 0.0 });
        const elderWrinkleMat = new THREE.MeshStandardMaterial({ color: 0xb87d65, roughness: 0.65, metalness: 0.0 });
        const suitMat = new THREE.MeshStandardMaterial({ color: 0xbfa58e, roughness: 0.78, metalness: 0.02 });
        const suitShadowMat = new THREE.MeshStandardMaterial({ color: 0x9c826c, roughness: 0.84, metalness: 0.02 });
        const dressShirtMat = new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.65, metalness: 0.0 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x5e493b, roughness: 0.70, metalness: 0.05 });
        const greyHairMat = new THREE.MeshStandardMaterial({ color: 0xb0b5ba, roughness: 0.82, metalness: 0.04 });
        const dressShoeMat = new THREE.MeshStandardMaterial({ color: 0x3d3836, roughness: 0.45, metalness: 0.12 });
        const vintageCaseMat = new THREE.MeshStandardMaterial({ color: 0x8d583e, roughness: 0.55, metalness: 0.08 });
        const vintageCornerMat = new THREE.MeshStandardMaterial({ color: 0x663b26, roughness: 0.50, metalness: 0.12 });

        // Paleta fiel à ilustração de referência da Mulher com Bebê (Personagem 3)
        const motherSkinMat = new THREE.MeshStandardMaterial({ color: 0xe5b299, roughness: 0.55, metalness: 0.0 });
        const motherLipsMat = new THREE.MeshStandardMaterial({ color: 0xa66553, roughness: 0.60, metalness: 0.0 });
        const motherHairMat = new THREE.MeshStandardMaterial({ color: 0x3d231a, roughness: 0.85, metalness: 0.0 });
        const motherCoatMat = new THREE.MeshStandardMaterial({ color: 0x5d6943, roughness: 0.80, metalness: 0.0 });
        const motherCoatDarkMat = new THREE.MeshStandardMaterial({ color: 0x495334, roughness: 0.85, metalness: 0.0 });
        const motherPantsMat = new THREE.MeshStandardMaterial({ color: 0x474f57, roughness: 0.78, metalness: 0.0 });
        const motherBootMat = new THREE.MeshStandardMaterial({ color: 0x5c3a27, roughness: 0.62, metalness: 0.05 });
        const swaddleBeigeMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb8, roughness: 0.75, metalness: 0.0 });
        const swaddleBlueMat = new THREE.MeshStandardMaterial({ color: 0xc2d5e3, roughness: 0.72, metalness: 0.0 });
        const babyHairMat = new THREE.MeshStandardMaterial({ color: 0xdec083, roughness: 0.80, metalness: 0.0 });
        const redSuitcaseMat = new THREE.MeshStandardMaterial({ color: 0xb83b32, roughness: 0.48, metalness: 0.12 });
        const redSuitcaseTrimMat = new THREE.MeshStandardMaterial({ color: 0x8c2720, roughness: 0.55, metalness: 0.12 });

        // Cria segmento anatômico esculpido com perfil orgânico (panturrilha, coxa, antebraço, tórax)
        function createSculptedSegment(profilePoints, len, mat, scaleX = 1, scaleZ = 1) {
            const lathePts = profilePoints.map(([t, r]) => new THREE.Vector2(r, -t * len)).reverse();   // do fundo ao topo: faces voltadas para fora (necessário ao contorno de tinta)
            const geo = new THREE.LatheGeometry(lathePts, 28);
            geo.scale(scaleX, 1, scaleZ);
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

        // ----------------------------------------------------------------------------
        // SEGMENTO ORGÂNICO (1º boneco): perfil por spline, amostrado uniformemente em t (v da textura = 1 - t) e
        // textura PINTADA com as linhas de desenho (dobras, barra, gola). u = ângulo (frente +z em u=0), canvas y = t * altura.
        // ----------------------------------------------------------------------------

        // ----------------------------------------------------------------------------
        // CABEÇA (método de Loomis): esfera do crânio achatada nas laterais; abaixo da linha dos olhos o rosto afina até o queixo
        // e avança para a frente; relevos da arcada, bochechas, lábios e queixo. headPoint() dá o ponto da superfície para uma
        // direção da esfera unitária (dx,dy,dz); o cabelo e as texturas do rosto usam a mesma função, então sempre acompanham o formato.
        // Coordenadas locais da cabeça (m): topo do crânio y~0.23, queixo y~0.03, frente +z.
        // ----------------------------------------------------------------------------
        const HEAD = { cy: 0.140, cz: -0.004, rx: 0.076, ryU: 0.090, ryL: 0.113, rz: 0.092, shift: 0.056 };
        const HF = { brow: 0.146, eye: 0.126, nose: 0.094, mouth: 0.066, chin: 0.034 };   // alturas dos pontos de referência do rosto
        function hsm(a0, a1, x) { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); }
        function headRy(dy) { return HEAD.ryU + (HEAD.ryL - HEAD.ryU) * hsm(0.15, -0.35, dy); }
        function headTaper(dy) { const u = Math.max(0, -dy); return 1 - 0.16 * u - 0.55 * u * u * u * u; }
        function headPoint(dx, dy, dz) {
            const u = Math.max(0, -dy), tx = headTaper(dy);
            const tz = 1 - (0.22 + 0.30 * hsm(0.3, -0.3, dz)) * Math.pow(u, 1.4);
            let x = HEAD.rx * dx * tx;
            const y = HEAD.cy + headRy(dy) * dy;
            let z = HEAD.cz + HEAD.rz * dz * tz + HEAD.shift * Math.pow(u, 1.2);
            const fz = hsm(0.2, 0.8, dz);
            z += fz * (0.007 * Math.exp(-Math.pow((y - HF.brow) / 0.012, 2))       // arcada superciliar
                     + 0.012 * Math.exp(-Math.pow((y - HF.chin) / 0.014, 2))       // queixo
                     + 0.004 * Math.exp(-Math.pow((y - HF.mouth) / 0.011, 2)));    // lábios
            x *= 1 + 0.035 * hsm(0.3, 0.9, Math.abs(dx)) * Math.exp(-Math.pow((y - 0.105) / 0.022, 2))     // maçãs do rosto
                  + 0.05 * hsm(0.3, 0.9, Math.abs(dx)) * Math.exp(-Math.pow((y - 0.080) / 0.016, 2));   // ângulo da mandíbula
            return [x, y, z];
        }
        // cobertura (cabelo) = superfície da cabeça afastada do centro por um fator k
        function headShell(dx, dy, dz, k) {
            const p = headPoint(dx, dy, dz);
            return [p[0] * k, HEAD.cy + (p[1] - HEAD.cy) * k, HEAD.cz + (p[2] - HEAD.cz) * k];
        }
        function headInvY(y) { let lo = -1, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (HEAD.cy + headRy(m) * m < y) lo = m; else hi = m; } return (lo + hi) / 2; }
        // ponto (x lateral, y altura) na frente do rosto -> pixel [px, py] na textura da cabeça (frente em u = 0.25)
        function headFP(x, y, W, H) {
            const dy = headInvY(y), st = Math.sqrt(Math.max(1e-6, 1 - dy * dy)), sx = Math.max(-1, Math.min(1, x / (HEAD.rx * headTaper(dy) * st)));
            return [W * 0.25 + Math.asin(sx) / (2 * Math.PI) * W, Math.acos(dy) / Math.PI * H];
        }

        // Cabeça de bebê: crânio grande e redondo, testa saliente, bochechas cheias, queixo pequeno (raio ~0.06 m)
        function babyHeadPoint(dx, dy, dz) {
            const u = Math.max(0, -dy), tx = 1 - 0.20 * u * u - 0.30 * Math.pow(u, 4);
            let x = 0.056 * dx * tx, y = 0.060 * dy, z = 0.062 * dz * (1 - 0.15 * u * u);
            const fz = hsm(0.2, 0.8, dz);
            const ch = Math.exp(-Math.pow((dy + 0.28) / 0.30, 2)) * hsm(0.25, 0.8, Math.abs(dx)) * fz;
            x *= 1 + 0.12 * ch; z += 0.007 * ch;
            z += 0.006 * fz * Math.exp(-Math.pow((dy - 0.36) / 0.25, 2));
            z += 0.003 * fz * Math.exp(-Math.pow((dy + 0.85) / 0.15, 2));
            return [x, y, z];
        }
        function babyFP(x, y, W, H) {
            const dy = Math.max(-0.99, Math.min(0.99, y / 0.060)), st = Math.sqrt(1 - dy * dy), u = Math.max(0, -dy), tx = 1 - 0.20 * u * u - 0.30 * Math.pow(u, 4);
            const sx = Math.max(-1, Math.min(1, x / (0.056 * st * tx)));
            return [W * 0.25 + Math.asin(sx) / (2 * Math.PI) * W, Math.acos(dy) / Math.PI * H];
        }
        function buildBabyHeadGeometry() {
            const g = new THREE.SphereGeometry(1, 40, 30), p = g.attributes.position;
            for (let i = 0; i < p.count; i++) { const q = babyHeadPoint(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q[0], q[1], q[2]); }
            g.computeVertexNormals();
            return g;
        }
        function buildHeadGeometry() {
            const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position;
            for (let i = 0; i < p.count; i++) { const q = headPoint(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q[0], q[1], q[2]); }
            g.computeVertexNormals();
            return g;
        }
        const INK = '#0f172a';   // tinta dos detalhes pintados: azul-marinho técnico (CAD), em vez de preto
        function paintTexture(P) {
            if (P.tex) return P.tex;
            const c = document.createElement('canvas'); c.width = P.w; c.height = P.h;
            P.fn(c.getContext('2d'), P.w, P.h, P.fill);
            const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true;
            return (P.tex = t);
        }
        function paintedMat(P) { return new THREE.MeshStandardMaterial({ color: 0xffffff, map: paintTexture(P) }); }
        function inkCurve(g, W, H, pts, lw, col) {
            g.strokeStyle = col || INK; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
            for (const sh of [-1, 0, 1]) {          // cópias deslocadas: a linha atravessa a emenda da textura sem corte
                g.beginPath(); g.moveTo(pts[0][0] * W + sh * W, pts[0][1] * H);
                if (pts.length === 3) g.quadraticCurveTo(pts[1][0] * W + sh * W, pts[1][1] * H, pts[2][0] * W + sh * W, pts[2][1] * H);
                else g.lineTo(pts[1][0] * W + sh * W, pts[1][1] * H);
                g.stroke();
            }
        }
        // Traço de caneta: curva de Bézier quadrática com largura que afina nas pontas. Coordenadas normalizadas (u = ângulo, v = altura do canvas).
        function inkTaper(g, W, H, p0, p1, p2, w, col) {
            g.fillStyle = col || INK;
            for (const sh of [-1, 0, 1]) {
                const L = [], R = [], N = 24;
                for (let i = 0; i <= N; i++) {
                    const t = i / N, a = (1 - t) * (1 - t), b2 = 2 * t * (1 - t), c = t * t;
                    const x = (a * p0[0] + b2 * p1[0] + c * p2[0]) * W + sh * W, y = (a * p0[1] + b2 * p1[1] + c * p2[1]) * H;
                    const dx = 2 * ((1 - t) * (p1[0] - p0[0]) + t * (p2[0] - p1[0])) * W, dy = 2 * ((1 - t) * (p1[1] - p0[1]) + t * (p2[1] - p1[1])) * H, l = Math.hypot(dx, dy) || 1;
                    const hw = 0.5 * w * Math.pow(Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, t))), 0.55);
                    L.push([x - dy / l * hw, y + dx / l * hw]); R.push([x + dy / l * hw, y - dx / l * hw]);
                }
                g.beginPath(); L.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); R.reverse().forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fill();
            }
        }
        // Convenção das texturas (LatheGeometry): u = 0 / 1 = frente (+z), 0.25 = lado +x, 0.5 = costas, 0.75 = lado -x. Canvas y = 0 no topo do segmento.
        const PT = {
            shirt: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#767a46'; g.fillRect(0, 0, W, H);
                g.fillStyle = '#5d6136'; g.fillRect(0, 0, W, H * 0.020);                              // gola canelada
                inkTaper(g, W, H, [0, 0.022], [0.5, 0.022], [1, 0.022], 4);
                inkTaper(g, W, H, [0, 0.952], [0.5, 0.952], [1, 0.952], 8);                           // barra (fim da camisa)
                // dobras de tensão que partem da axila e descem para a cintura, uma de cada lado (e outra mais curta), levemente para a frente
                [[0.215, 0.30], [0.785, 0.30]].forEach(([u, y]) => {
                    const sg = u < 0.5 ? 1 : -1;
                    inkTaper(g, W, H, [u, y], [u - sg * 0.020, y + 0.20], [u - sg * 0.040, y + 0.38], 8);
                    inkTaper(g, W, H, [u - sg * 0.035, y + 0.06], [u - sg * 0.060, y + 0.20], [u - sg * 0.070, y + 0.31], 6);
                });
                // costas: duas dobras simétricas saindo das omoplatas
                inkTaper(g, W, H, [0.44, 0.26], [0.46, 0.42], [0.49, 0.56], 7);
                inkTaper(g, W, H, [0.56, 0.26], [0.54, 0.42], [0.51, 0.56], 7);
                // peito/barriga: uma diagonal que cruza a frente (tecido puxado pelo braço levantado)
                inkTaper(g, W, H, [0.935, 0.34], [0.975, 0.50], [0.030, 0.66], 6);
            } },
            sleeve: { w: 512, h: 256, fn: (g, W, H) => {
                g.fillStyle = '#767a46'; g.fillRect(0, 0, W, H);
                g.fillStyle = '#5d6136'; g.fillRect(0, H * 0.90, W, H * 0.10);                         // bainha da manga
                inkTaper(g, W, H, [0, 0.90], [0.5, 0.90], [1, 0.90], 7);
                inkTaper(g, W, H, [0.60, 0.20], [0.55, 0.45], [0.58, 0.72], 6);                         // uma dobra no cotovelo da manga
            } },
            thigh: { w: 512, h: 512, fn: (g, W, H, fill = '#446282') => {
                g.fillStyle = fill; g.fillRect(0, 0, W, H);
                // costuras laterais (externa e interna) ao longo da coxa
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.04], [u + 0.004, 0.50], [u, 0.96], 5));
                // vincos na frente da coxa, logo acima do joelho (tecido se juntando quando o joelho dobra)
                inkTaper(g, W, H, [0.945, 0.78], [1.000, 0.805], [0.055, 0.78], 6);
                inkTaper(g, W, H, [0.955, 0.87], [1.000, 0.893], [0.045, 0.87], 6);
                // vinco diagonal na dobra do quadril
                inkTaper(g, W, H, [0.935, 0.10], [0.965, 0.20], [0.99, 0.30], 6);
            } },
            calf: { w: 512, h: 512, fn: (g, W, H, fill = '#446282') => {
                g.fillStyle = fill; g.fillRect(0, 0, W, H);
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.02], [u - 0.003, 0.50], [u, 0.93], 5));      // costuras laterais continuam
                inkTaper(g, W, H, [0, 0.945], [0.5, 0.945], [1, 0.945], 7);                                     // barra do jeans
                // barra empilhada sobre o tênis: dois vincos na frente
                inkTaper(g, W, H, [0.94, 0.82], [1.000, 0.845], [0.06, 0.82], 5);
                inkTaper(g, W, H, [0.95, 0.88], [1.000, 0.900], [0.05, 0.88], 5);
                // joelho dobrado: vinco curto na frente do topo da canela
                inkTaper(g, W, H, [0.955, 0.06], [1.000, 0.080], [0.045, 0.06], 5);
            } },
            face: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#e9a684'; g.fillRect(0, 0, W, H);
                const P = (x, y) => headFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                const T = (a, b, c, w, col) => inkTaper(g, W, H, N(a), N(b), N(c), w, col);
                const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
                const SH = '#cf8a68';
                [-1, 1].forEach(sd => {
                    const e = HF.eye;
                    poly([P(sd * 0.046, e + 0.016), P(sd * 0.030, e + 0.021), P(sd * 0.012, e + 0.019), P(sd * 0.013, e + 0.003), P(sd * 0.030, e + 0.008), P(sd * 0.046, e + 0.004)], SH);    // sombra da órbita sob a arcada
                    poly([P(sd * 0.044, e - 0.008), P(sd * 0.030, e - 0.012), P(sd * 0.015, e - 0.008), P(sd * 0.017, e - 0.020), P(sd * 0.030, e - 0.025), P(sd * 0.042, e - 0.020)], SH);   // bolsa sob o olho
                });
                poly([P(-0.010, HF.mouth + 0.010), P(0.010, HF.mouth + 0.010), P(0.016, HF.nose - 0.002), P(-0.016, HF.nose - 0.002)], SH);                                            // sombra sob o nariz
                [-1, 1].forEach(sd => {
                    const e = HF.eye, eo = P(sd * 0.044, e), ei = P(sd * 0.016, e), ec = P(sd * 0.030, e);
                    C([[ei[0], ec[1] - 3], [ec[0], ec[1] + 13], [eo[0], ec[1] - 3]], 9);                                        // pálpebra fechada (arco para baixo)
                                        T(P(sd * 0.047, e + 0.014), P(sd * 0.030, e + 0.022), P(sd * 0.010, e + 0.0165), 11);                         // sobrancelha franzida (mais grossa na ponta interna)
                    T(P(sd * 0.048, e - 0.004), P(sd * 0.053, e - 0.010), P(sd * 0.061, e - 0.013), 5);                           // pés de galinha
                    T(P(sd * 0.048, e + 0.002), P(sd * 0.056, e + 0.002), P(sd * 0.064, e + 0.004), 5);
                                        T(P(sd * 0.0185, HF.nose + 0.003), P(sd * 0.031, HF.mouth + 0.014), P(sd * 0.030, HF.mouth - 0.004), 6);   // sulco nasolabial
                });
                T(P(-0.006, HF.eye + 0.019), P(-0.0055, HF.eye + 0.027), P(-0.006, HF.eye + 0.037), 5);                          // franzido entre as sobrancelhas
                T(P(0.006, HF.eye + 0.019), P(0.0055, HF.eye + 0.027), P(0.006, HF.eye + 0.037), 5);
                C([P(-0.023, HF.mouth - 0.002), P(-0.011, HF.mouth + 0.001), P(0, HF.mouth - 0.001)], 7);                       // lábio superior
                C([P(0, HF.mouth - 0.001), P(0.011, HF.mouth + 0.001), P(0.024, HF.mouth - 0.006)], 7);
                C([P(-0.013, HF.mouth - 0.009), P(0, HF.mouth - 0.013), P(0.013, HF.mouth - 0.010)], 5);                         // lábio inferior
                C([P(-0.008, HF.chin + 0.012), P(0, HF.chin + 0.015), P(0.008, HF.chin + 0.012)], 4);                            // vinco do queixo
            } },
            hair: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#58382e'; g.fillRect(0, 0, W, H);
                // mechas largas e paralelas descendo da coroa (u = ângulo, v = do topo à borda), em tom um pouco mais escuro e mais claro
                for (let k = 0; k < 28; k++) {
                    const u0 = k / 28 + 0.008, dark = k % 2 === 0;
                    inkTaper(g, W, H, [u0, 0.04], [u0 + 0.012, 0.45], [u0 + 0.004, 0.97], dark ? 9 : 6, dark ? '#3a2620' : '#6f4a3c');
                }
            } }
        };

        // ----------------------------------------------------------------------------
        // Texturas pintadas do Senhor (terno bege) e da Mãe (casaco verde, calça cinza): mesmas regras do viajante
        // (u = 0 frente, 0.25 lado +x, 0.5 costas; canvas y = 0 no topo do segmento). Cores iguais às dos materiais de cada um.
        // ----------------------------------------------------------------------------
        const SUIT_C = '#bfa58e', COAT_C = '#5d6943', PANTS_C = '#474f57', WRINKLE_C = '#b87d65';
        // dobras de tensão da axila para a cintura (uma de cada lado) e dobras das omoplatas
        const paintTension = (g, W, H, y0, y1) => [0.215, 0.785].forEach(u => {
            const sg = u < 0.5 ? 1 : -1, ym = (y0 + y1) / 2;
            inkTaper(g, W, H, [u, y0], [u - sg * 0.018, ym], [u - sg * 0.036, y1], 7);
            inkTaper(g, W, H, [u - sg * 0.032, y0 + 0.05], [u - sg * 0.055, ym + 0.02], [u - sg * 0.064, y1 - 0.06], 5);
        });
        const paintScapula = (g, W, H, y0, y1) => {
            inkTaper(g, W, H, [0.44, y0], [0.46, (y0 + y1) / 2], [0.49, y1], 6);
            inkTaper(g, W, H, [0.56, y0], [0.54, (y0 + y1) / 2], [0.51, y1], 6);
        };
        const paintCloth = (name, fill, extra) => ({ fill, w: 512, h: 256, fn: (g, W, H, fl) => { g.fillStyle = fl; g.fillRect(0, 0, W, H); extra(g, W, H); } });
        Object.assign(PT, {
            suitTorso: { w: 1024, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.968], [0.5, 0.968], [1, 0.968], 8);                          // barra do paletó
                inkTaper(g, W, H, [0.000, 0.44], [0.004, 0.70], [0.000, 0.966], 6);                  // abertura frontal abaixo das lapelas
                paintTension(g, W, H, 0.26, 0.66);
                paintScapula(g, W, H, 0.24, 0.52);
                inkTaper(g, W, H, [0.50, 0.06], [0.502, 0.30], [0.50, 0.58], 4);                     // costura central das costas
            } },
            coatTorso: { w: 1024, h: 512, fill: COAT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.968], [0.5, 0.968], [1, 0.968], 8);                          // barra do casaco longo
                paintTension(g, W, H, 0.20, 0.62);
                paintScapula(g, W, H, 0.18, 0.46);
                inkTaper(g, W, H, [0.50, 0.05], [0.502, 0.45], [0.50, 0.94], 4);                     // costura central das costas
            } },
            suitSleeve: paintCloth('suitSleeve', SUIT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.93, 0.80], [1.00, 0.83], [0.07, 0.80], 5);                      // dobras na parte interna do cotovelo
                inkTaper(g, W, H, [0.94, 0.89], [1.00, 0.915], [0.06, 0.89], 5);
            }),
            coatSleeve: paintCloth('coatSleeve', COAT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.93, 0.80], [1.00, 0.83], [0.07, 0.80], 5);
                inkTaper(g, W, H, [0.94, 0.89], [1.00, 0.915], [0.06, 0.89], 5);
            }),
            suitForearm: paintCloth('suitForearm', SUIT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.94, 0.07], [1.00, 0.10], [0.06, 0.07], 5);                      // dobras do cotovelo no começo do antebraço
                inkTaper(g, W, H, [0.95, 0.14], [1.00, 0.165], [0.05, 0.14], 5);
                inkTaper(g, W, H, [0, 0.965], [0.5, 0.965], [1, 0.965], 6);                          // boca da manga
            }),
            coatForearm: paintCloth('coatForearm', COAT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.94, 0.07], [1.00, 0.10], [0.06, 0.07], 5);
                inkTaper(g, W, H, [0.95, 0.14], [1.00, 0.165], [0.05, 0.14], 5);
                inkTaper(g, W, H, [0, 0.95], [0.5, 0.95], [1, 0.95], 6);
            }),
            suitThigh: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.000, 0.10], [0.004, 0.52], [0.000, 0.97], 4);                   // vinco de passar na frente da calça
                inkTaper(g, W, H, [0.945, 0.80], [1.000, 0.825], [0.055, 0.80], 5);                  // vincos acima do joelho
                inkTaper(g, W, H, [0.955, 0.89], [1.000, 0.912], [0.045, 0.89], 5);
                inkTaper(g, W, H, [0.935, 0.10], [0.965, 0.20], [0.99, 0.30], 5);                    // dobra do quadril
            } },
            suitCalf: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.000, 0.04], [0.004, 0.46], [0.000, 0.90], 4);                   // vinco de passar continua
                inkTaper(g, W, H, [0, 0.955], [0.5, 0.955], [1, 0.955], 7);                          // barra da calça
                inkTaper(g, W, H, [0.94, 0.86], [1.000, 0.885], [0.06, 0.86], 5);                    // a barra cai sobre o sapato
            } },
            pantsThigh: { ...PT.thigh, fill: PANTS_C, tex: undefined },
            pantsCalf: { ...PT.calf, fill: PANTS_C, tex: undefined },
            faceE: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#f0baa3'; g.fillRect(0, 0, W, H);
                const P = (x, y) => headFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                [0.176, 0.190].forEach((y, i) => C([P(-0.040 + i * 0.006, y), P(0, y + 0.004), P(0.040 - i * 0.006, y)], 5, WRINKLE_C));   // rugas da testa
                [-1, 1].forEach(sd => {
                    const e = P(sd * 0.030, HF.eye), eo = P(sd * 0.043, HF.eye), ei = P(sd * 0.017, HF.eye);
                    C([P(sd * 0.047, HF.eye + 0.004), P(sd * 0.058, HF.eye + 0.009)], 4, WRINKLE_C);                                     // pés de galinha
                    C([P(sd * 0.047, HF.eye - 0.001), P(sd * 0.059, HF.eye - 0.002)], 4, WRINKLE_C);
                    C([P(sd * 0.047, HF.eye - 0.006), P(sd * 0.058, HF.eye - 0.013)], 4, WRINKLE_C);
                    C([P(sd * 0.030, HF.eye - 0.020), P(sd * 0.037, HF.eye - 0.034)], 4, WRINKLE_C);                                     // bolsa sob o olho
                    C([P(sd * 0.018, HF.nose + 0.002), P(sd * 0.030, HF.mouth + 0.010), P(sd * 0.032, HF.mouth - 0.004)], 5, WRINKLE_C);       // sulco nasolabial
                    g.fillStyle = INK; g.beginPath(); g.ellipse(e[0], e[1], 9, 8, 0, 0, Math.PI * 2); g.fill();                           // olho
                    C([[ei[0], e[1] - 6], [e[0], e[1] - 15], [eo[0], e[1] - 5]], 7);                                                      // pálpebra
                    C([P(sd * 0.046, HF.eye + 0.015), P(sd * 0.030, HF.eye + 0.025), P(sd * 0.011, HF.eye + 0.021)], 17, '#aeb3b8');       // sobrancelha grisalha espessa
                    C([P(sd * 0.044, HF.eye + 0.011), P(sd * 0.030, HF.eye + 0.020), P(sd * 0.011, HF.eye + 0.016)], 4, '#868c92');
                });
                C([P(-0.020, HF.mouth - 0.001), P(0, HF.mouth - 0.004), P(0.020, HF.mouth - 0.001)], 8);                                 // boca serena
            } },
            faceM: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#e5b299'; g.fillRect(0, 0, W, H);
                const P = (x, y) => headFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                [-1, 1].forEach(sd => {
                    const e = P(sd * 0.030, HF.eye), eo = P(sd * 0.043, HF.eye), ei = P(sd * 0.017, HF.eye);
                    g.fillStyle = INK; g.beginPath(); g.ellipse(e[0], e[1], 10, 9, 0, 0, Math.PI * 2); g.fill();                         // olho
                    C([[ei[0], e[1] - 3], [e[0], e[1] - 16], [eo[0], e[1] - 3]], 9);                                                      // pálpebra superior
                    C([[eo[0] - 2, e[1] - 6], P(sd * 0.050, HF.eye + 0.001)], 6);                                                         // cílio externo
                    C([P(sd * 0.047, HF.eye + 0.011), P(sd * 0.030, HF.eye + 0.024), P(sd * 0.011, HF.eye + 0.019)], 8, '#3d231a');         // sobrancelha arqueada (preocupada)
                });
                const m = P(0, HF.mouth);
                g.fillStyle = '#a66553'; g.beginPath(); g.ellipse(m[0], m[1], 22, 8, 0, 0, Math.PI * 2); g.fill();                        // lábios
                C([P(-0.022, HF.mouth), P(0, HF.mouth - 0.001), P(0.022, HF.mouth)], 5);
            } },
            hairE: { w: 1024, h: 256, fn: (g, W, H) => {
                g.fillStyle = '#b0b5ba'; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 38; k++) {
                    const u0 = k / 38 + 0.004, a = (k * 37 % 11) / 11, dark = k % 3 !== 0;
                    inkTaper(g, W, H, [u0, 0.02 + 0.18 * a], [u0 + 0.014 * (a - 0.5), 0.5], [u0 + 0.02 * (0.5 - a), 0.82 + 0.17 * (1 - a)], dark ? 7 : 5, dark ? '#9da3a9' : '#c9cdd0');
                }
            } },
            hairM: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#3d231a'; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 36; k++) {
                    const u0 = k / 36 + 0.005, dark = k % 2 === 0, wv = 0.014 * ((k % 3) - 1);
                    inkTaper(g, W, H, [u0, 0.02], [u0 + wv, 0.5], [u0 + 0.004, 0.98], dark ? 9 : 6, dark ? '#2a1812' : '#59372b');
                }
            } }
        });


        const earPaint = skin => ({ w: 128, h: 128, fn: (g, W, H) => {
            g.fillStyle = skin; g.fillRect(0, 0, W, H);
            [0.5, 0, 1].forEach(u => {
                const cx = u * W, cy = H * 0.5;
                inkCurve(g, W, H, [[(cx - 16) / W, (cy + 34) / H], [(cx - 30) / W, (cy - 8) / H], [(cx + 2) / W, (cy - 36) / H]], 2.6);      // hélice
                inkCurve(g, W, H, [[(cx - 8) / W, (cy + 20) / H], [(cx - 14) / W, (cy - 4) / H], [(cx + 2) / W, (cy - 18) / H]], 2.2);        // anti-hélice
                inkCurve(g, W, H, [[(cx + 4) / W, (cy + 6) / H], [(cx + 10) / W, (cy + 14) / H]], 2.2);                                      // concha
            });
        } });
        Object.assign(PT, {
            earT: earPaint('#e9a684'), earE: earPaint('#f0baa3'), earM: earPaint('#e5b299'),
            pelvis: { w: 512, h: 512, fn: (g, W, H, fill = '#446282') => {
                g.fillStyle = fill; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.11], [0.5, 0.11], [1, 0.11], 5);                              // cós do jeans
                inkTaper(g, W, H, [0.000, 0.12], [0.012, 0.42], [0.985, 0.60], 4);                    // braguilha em J
                [[0.955, 0.98, 0.915, 0.56], [0.045, 0.98, 0.085, 0.56]].forEach(([ua, ya, ub, yb]) =>
                    inkTaper(g, W, H, [ua, ya], [(ua + ub) / 2, (ya + yb) / 2 + 0.04], [ub, yb], 5));  // dobras que partem da virilha para os quadris
                inkTaper(g, W, H, [0.975, 0.98], [0.92, 0.80], [0.90, 0.66], 4);
                inkTaper(g, W, H, [0.025, 0.98], [0.08, 0.80], [0.10, 0.66], 4);
            } },
            suitPelvis: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => { g.fillStyle = fl; g.fillRect(0, 0, W, H); inkTaper(g, W, H, [0, 0.10], [0.5, 0.10], [1, 0.10], 4); } },
            pantsPelvis: { w: 512, h: 512, fill: PANTS_C, fn: (g, W, H, fl) => { g.fillStyle = fl; g.fillRect(0, 0, W, H); inkTaper(g, W, H, [0, 0.10], [0.5, 0.10], [1, 0.10], 4); } }
        });

        // ----------------------------------------------------------------------------
        // SENHOR: paletó e calça bege desenhados à mão (lapelas, bolsos, botão, dobras de tecido), cel shading
        // ----------------------------------------------------------------------------
        const SUIT_SH = '#a98f78', SHIRT_W = '#f2f0eb';
        function inkPoly(g, W, H, pts, col, line, lw) {          // polígono preenchido (com cópias deslocadas p/ atravessar a emenda) e contorno opcional
            for (const sh of [-1, 0, 1]) {
                g.beginPath(); pts.forEach((q, i) => i ? g.lineTo((q[0] + sh) * W, q[1] * H) : g.moveTo((q[0] + sh) * W, q[1] * H)); g.closePath();
                if (col) { g.fillStyle = col; g.fill(); }
                if (line) { g.strokeStyle = INK; g.lineWidth = lw || 4; g.lineJoin = 'round'; g.stroke(); }
            }
        }
        function inkDot(g, W, H, u, v, r, col) { for (const sh of [-1, 0, 1]) { g.beginPath(); g.arc((u + sh) * W, v * H, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); } }
        Object.assign(PT, {
            suitTorso: { w: 1024, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                // camisa branca no V do paletó
                inkPoly(g, W, H, [[-0.030, 0.02], [0.030, 0.02], [0.0, 0.60]], SHIRT_W, false);
                inkTaper(g, W, H, [0.000, 0.10], [0.002, 0.34], [0.000, 0.58], 3, '#c9c4ba');                  // filete da camisa
                // lapelas (azul-bege mais escuro) com entalhe
                [1, -1].forEach(sg => {
                    const P = pts => pts.map(([u, v]) => [sg * u, v]);
                    inkPoly(g, W, H, P([[0.028, 0.025], [0.098, 0.045], [0.090, 0.140], [0.108, 0.168], [0.066, 0.400], [0.0, 0.600]]), SUIT_SH, true, 4);
                    inkTaper(g, W, H, [sg * 0.090, 0.140], [sg * 0.074, 0.150], [sg * 0.060, 0.147], 4);          // entalhe da lapela
                    inkTaper(g, W, H, [sg * 0.012, 0.600], [sg * 0.030, 0.780], [sg * 0.074, 0.975], 6);           // corte arredondado da frente do paletó
                    inkTaper(g, W, H, [sg * 0.012, 0.605], [sg * 0.060, 0.560], [sg * 0.075, 0.545], 4);            // puxões do botão
                    inkTaper(g, W, H, [sg * 0.012, 0.612], [sg * 0.070, 0.610], [sg * 0.088, 0.640], 4);
                    inkTaper(g, W, H, [sg * 0.014, 0.620], [sg * 0.052, 0.665], [sg * 0.062, 0.700], 4);
                });
                inkDot(g, W, H, 0.0, 0.605, 8, '#8a7260');                                                      // botão
                // bolso de peito (esquerda do senhor) com lenço
                inkTaper(g, W, H, [0.074, 0.335], [0.108, 0.322], [0.142, 0.318], 6);
                inkTaper(g, W, H, [0.076, 0.350], [0.108, 0.338], [0.140, 0.332], 3);
                inkPoly(g, W, H, [[0.095, 0.322], [0.108, 0.285], [0.121, 0.320]], SHIRT_W, true, 3);
                // bolsos com aba nos dois quadris
                [1, -1].forEach(sg => {
                    inkTaper(g, W, H, [sg * 0.074, 0.790], [sg * 0.122, 0.775], [sg * 0.170, 0.772], 6);           // aba (borda de cima)
                    inkTaper(g, W, H, [sg * 0.078, 0.850], [sg * 0.124, 0.838], [sg * 0.172, 0.834], 7);           // borda de baixo da aba
                    inkTaper(g, W, H, [sg * 0.074, 0.790], [sg * 0.071, 0.822], [sg * 0.078, 0.850], 4);
                    inkTaper(g, W, H, [sg * 0.170, 0.772], [sg * 0.172, 0.805], [sg * 0.172, 0.834], 4);
                    inkTaper(g, W, H, [sg * 0.092, 0.858], [sg * 0.124, 0.872], [sg * 0.156, 0.866], 3);           // sombra do tecido sob a aba
                });
                inkTaper(g, W, H, [0, 0.975], [0.5, 0.975], [1, 0.975], 8);                                   // barra do paletó
                // dobras de tensão: das axilas para a cintura
                [0.215, 0.785].forEach(u => {
                    const sg = u < 0.5 ? 1 : -1;
                    inkTaper(g, W, H, [u, 0.27], [u - sg * 0.018, 0.46], [u - sg * 0.034, 0.64], 6);
                    inkTaper(g, W, H, [u - sg * 0.036, 0.33], [u - sg * 0.056, 0.48], [u - sg * 0.062, 0.60], 4);
                });
                // costas: dobras das omoplatas, costura central e abertura traseira
                inkTaper(g, W, H, [0.44, 0.24], [0.46, 0.38], [0.49, 0.52], 6);
                inkTaper(g, W, H, [0.56, 0.24], [0.54, 0.38], [0.51, 0.52], 6);
                inkTaper(g, W, H, [0.50, 0.05], [0.502, 0.30], [0.50, 0.66], 4);
                inkTaper(g, W, H, [0.500, 0.66], [0.503, 0.82], [0.500, 0.975], 5);                           // abertura traseira
                inkTaper(g, W, H, [0.512, 0.66], [0.514, 0.82], [0.514, 0.975], 4);
            } },
            suitSleeve: { w: 512, h: 256, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.07], [0.5, 0.07], [1, 0.07], 4);                                     // costura da cava
                inkTaper(g, W, H, [0.60, 0.16], [0.63, 0.45], [0.68, 0.80], 5);                              // dobras longas do caimento
                inkTaper(g, W, H, [0.70, 0.22], [0.72, 0.50], [0.76, 0.84], 4);
                inkTaper(g, W, H, [0.93, 0.86], [1.00, 0.895], [0.07, 0.86], 5);                              // um vinco na parte interna do cotovelo
            } },
            suitForearm: { w: 512, h: 256, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.92, 0.07], [1.00, 0.105], [0.08, 0.07], 5);                              // dobra da flexão do cotovelo
                inkTaper(g, W, H, [0.58, 0.20], [0.62, 0.50], [0.64, 0.84], 5);                              // dobras longas do caimento
                inkTaper(g, W, H, [0.70, 0.30], [0.72, 0.58], [0.74, 0.88], 4);
                inkTaper(g, W, H, [0, 0.968], [0.5, 0.968], [1, 0.968], 6);                                   // boca da manga
            } },
            suitPelvis: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.08], [0.5, 0.08], [1, 0.08], 5);                                     // cós
                inkDot(g, W, H, 0.0, 0.10, 6, '#8a7260');                                                      // botão do cós
                inkTaper(g, W, H, [0.000, 0.12], [0.003, 0.40], [0.000, 0.66], 4);                            // braguilha
                // bolsos laterais em diagonal (boca do bolso) com pesponto
                [1, -1].forEach(sg => {
                    inkTaper(g, W, H, [sg * 0.205, 0.10], [sg * 0.150, 0.30], [sg * 0.088, 0.56], 6);
                    inkTaper(g, W, H, [sg * 0.213, 0.12], [sg * 0.162, 0.31], [sg * 0.100, 0.57], 3);
                    inkTaper(g, W, H, [sg * 0.060, 0.14], [sg * 0.050, 0.28], [sg * 0.040, 0.43], 4);          // preguinhas na frente
                    inkTaper(g, W, H, [sg * 0.032, 0.84], [sg * 0.060, 0.70], [sg * 0.110, 0.58], 5);          // dobras da virilha para o quadril
                    inkTaper(g, W, H, [sg * 0.030, 0.97], [sg * 0.074, 0.80], [sg * 0.128, 0.68], 4);
                });
                // costas: bolsos de trás
                [0.40, 0.60].forEach(u => inkTaper(g, W, H, [u - 0.045, 0.30], [u, 0.306], [u + 0.045, 0.30], 5));
            } },
            suitThigh: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.000, 0.08], [0.004, 0.52], [0.000, 0.97], 4);                           // vinco de passar
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.04], [u + 0.004, 0.50], [u, 0.96], 3));     // costuras laterais
                inkTaper(g, W, H, [0.93, 0.12], [0.96, 0.20], [0.985, 0.30], 5);                              // dobra do quadril
                inkTaper(g, W, H, [0.07, 0.14], [0.05, 0.24], [0.02, 0.34], 4);
                inkTaper(g, W, H, [0.92, 0.40], [0.96, 0.52], [0.99, 0.64], 4);                              // caimento do tecido ao longo da coxa
                inkTaper(g, W, H, [0.80, 0.50], [0.84, 0.64], [0.86, 0.78], 4);
                inkTaper(g, W, H, [0.930, 0.80], [1.000, 0.830], [0.070, 0.80], 5);                            // vincos acima do joelho
                inkTaper(g, W, H, [0.945, 0.88], [1.000, 0.905], [0.055, 0.88], 5);
            } },
            suitCalf: { w: 512, h: 512, fill: SUIT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.000, 0.06], [0.004, 0.46], [0.000, 0.88], 4);                           // vinco de passar
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.04], [u, 0.50], [u, 0.93], 3));
                inkTaper(g, W, H, [0.93, 0.05], [1.000, 0.080], [0.07, 0.05], 5);                              // vincos do joelho dobrado
                inkTaper(g, W, H, [0.94, 0.12], [1.000, 0.145], [0.06, 0.12], 4);
                inkTaper(g, W, H, [0.88, 0.30], [0.90, 0.50], [0.93, 0.72], 4);                              // caimento
                inkTaper(g, W, H, [0, 0.950], [0.5, 0.950], [1, 0.950], 7);                                   // barra
                inkTaper(g, W, H, [0.92, 0.86], [1.000, 0.890], [0.08, 0.86], 5);                              // a barra assenta sobre o sapato
            } },
            faceE: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#f0baa3'; g.fillRect(0, 0, W, H);
                const P = (x, y) => headFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                const T = (a, b, c, w, col) => inkTaper(g, W, H, N(a), N(b), N(c), w, col);
                const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
                const SH = '#d8977c';
                // sombras duras em bloco: têmporas, órbitas, bochechas fundas e papada
                [-1, 1].forEach(sd => {
                    const e = HF.eye;
                    poly([P(sd * 0.060, e + 0.040), P(sd * 0.064, e + 0.010), P(sd * 0.054, e - 0.020), P(sd * 0.046, e - 0.006), P(sd * 0.048, e + 0.024)], SH);              // têmpora afundada
                    poly([P(sd * 0.046, e + 0.016), P(sd * 0.030, e + 0.021), P(sd * 0.012, e + 0.019), P(sd * 0.013, e + 0.003), P(sd * 0.030, e + 0.008), P(sd * 0.046, e + 0.004)], SH);   // órbita
                    poly([P(sd * 0.048, e - 0.010), P(sd * 0.030, e - 0.014), P(sd * 0.016, e - 0.009), P(sd * 0.019, e - 0.024), P(sd * 0.032, e - 0.029), P(sd * 0.046, e - 0.024)], SH);   // bolsa sob o olho
                    poly([P(sd * 0.056, e - 0.030), P(sd * 0.040, e - 0.040), P(sd * 0.032, e - 0.062), P(sd * 0.040, HF.chin + 0.016), P(sd * 0.052, e - 0.060)], SH);                      // bochecha magra
                });
                poly([P(-0.030, HF.chin + 0.004), P(0.030, HF.chin + 0.004), P(0.020, HF.chin - 0.010), P(-0.020, HF.chin - 0.010)], SH);                                                // papada
                poly([P(-0.010, HF.mouth + 0.010), P(0.010, HF.mouth + 0.010), P(0.016, HF.nose - 0.002), P(-0.016, HF.nose - 0.002)], SH);                                              // sob o nariz
                // rugas da testa (3 sulcos ondulados) e glabela
                [0.176, 0.190, 0.204].forEach((y, i) => { const w = 0.040 - i * 0.005; T(P(-w, y - 0.001), P(0, y + 0.006 + i * 0.001), P(w, y - 0.002), 5 - i * 0.5, WRINKLE_C); });
                T(P(-0.007, HF.eye + 0.019), P(-0.0065, HF.eye + 0.028), P(-0.007, HF.eye + 0.039), 5, WRINKLE_C);
                T(P(0.007, HF.eye + 0.019), P(0.0065, HF.eye + 0.028), P(0.007, HF.eye + 0.039), 5, WRINKLE_C);
                [-1, 1].forEach(sd => {
                    const e = HF.eye, eo = P(sd * 0.044, e), ei = P(sd * 0.016, e), ec = P(sd * 0.030, e);
                    // olho pesado, meio fechado e caído
                    g.fillStyle = '#e8e2dc'; g.beginPath(); g.ellipse(ec[0], ec[1] + 2, Math.abs(eo[0] - ei[0]) * 0.42, 7, 0, 0, Math.PI * 2); g.fill();
                    g.fillStyle = INK; g.beginPath(); g.ellipse(ec[0] + sd * 1, ec[1] + 3, 6.5, 5.5, 0, 0, Math.PI * 2); g.fill();
                    g.fillStyle = '#f0baa3'; g.beginPath(); g.ellipse(ec[0], ec[1] - 8, Math.abs(eo[0] - ei[0]) * 0.46, 8, 0, 0, Math.PI * 2); g.fill();   // pálpebra caída cobrindo o alto do olho
                    C([[ei[0], ec[1] - 1], [ec[0], ec[1] - 9], [eo[0], ec[1] + 3]], 8);                           // linha da pálpebra superior (inclina para fora e para baixo)
                    C([[ei[0] + 2, ec[1] - 17], [ec[0], ec[1] - 13], [eo[0] - 2, ec[1] - 8]], 3, WRINKLE_C);       // dobra acima da pálpebra
                    C([[ei[0] + 2, ec[1] + 10], [ec[0], ec[1] + 14], [eo[0] - 2, ec[1] + 10]], 3, WRINKLE_C);       // contorno inferior
                    T(P(sd * 0.047, e + 0.013), P(sd * 0.031, e + 0.023), P(sd * 0.009, e + 0.025), 15, '#aeb3b8');   // sobrancelha grisalha: ponta interna levantada (triste)
                    T(P(sd * 0.046, e + 0.009), P(sd * 0.031, e + 0.019), P(sd * 0.010, e + 0.021), 4, '#868c92');
                    T(P(sd * 0.050, e + 0.004), P(sd * 0.059, e + 0.008), P(sd * 0.066, e + 0.016), 4, WRINKLE_C);  // pés de galinha
                    T(P(sd * 0.050, e - 0.001), P(sd * 0.060, e - 0.001), P(sd * 0.068, e + 0.001), 4, WRINKLE_C);
                    T(P(sd * 0.050, e - 0.006), P(sd * 0.059, e - 0.011), P(sd * 0.066, e - 0.016), 4, WRINKLE_C);
                    T(P(sd * 0.019, HF.nose + 0.004), P(sd * 0.034, HF.mouth + 0.016), P(sd * 0.036, HF.mouth - 0.008), 6, WRINKLE_C);   // sulco nasolabial fundo
                    T(P(sd * 0.026, HF.mouth - 0.004), P(sd * 0.030, HF.mouth - 0.014), P(sd * 0.027, HF.mouth - 0.026), 4, WRINKLE_C);      // vinco do canto da boca (caído)
                });
                C([P(-0.021, HF.mouth + 0.001), P(0, HF.mouth - 0.001), P(0.021, HF.mouth + 0.001)], 7);                                  // boca fina
                C([P(-0.022, HF.mouth + 0.001), P(-0.027, HF.mouth - 0.006)], 5);                                                         // cantos para baixo
                C([P(0.022, HF.mouth + 0.001), P(0.027, HF.mouth - 0.006)], 5);
                C([P(-0.010, HF.chin + 0.014), P(0, HF.chin + 0.017), P(0.010, HF.chin + 0.014)], 3, WRINKLE_C);
            } }
        });

        // ----------------------------------------------------------------------------
        // MÃE E BEBÊ: sobretudo verde-oliva com lapelas, bolsos e abertura frontal; calça escura com dobras; bebê e manta desenhados
        // ----------------------------------------------------------------------------
        Object.assign(PT, { earB: earPaint('#efc4ad') });
        const COAT_D = '#495334', SKIN_M = '#e5b299', BLANKET_B = '#c2d5e3', BLANKET_W = '#d8cbb8';
        Object.assign(PT, {
            coatTorso: { w: 1024, h: 512, fill: COAT_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                // abertura frontal: a calça aparece entre as abas do casaco (de baixo do peito até a barra)
                inkPoly(g, W, H, [[0.0, 0.40], [0.022, 0.62], [0.052, 1.0], [-0.052, 1.0], [-0.022, 0.62]], PANTS_C, false);
                // decote em V com a pele do colo
                inkPoly(g, W, H, [[-0.032, 0.0], [0.032, 0.0], [0.0, 0.30]], SKIN_M, false);
                inkTaper(g, W, H, [-0.012, 0.05], [0, 0.12], [0.012, 0.05], 3, '#c98c72');                     // clavículas
                // lapelas largas (verde mais escuro) com entalhe
                [1, -1].forEach(sg => {
                    const P = pts => pts.map(([u, v]) => [sg * u, v]);
                    inkPoly(g, W, H, P([[0.030, 0.0], [0.100, 0.02], [0.094, 0.130], [0.114, 0.165], [0.070, 0.400], [0.0, 0.300]]), COAT_D, true, 4);
                    inkTaper(g, W, H, [sg * 0.094, 0.130], [sg * 0.078, 0.142], [sg * 0.064, 0.140], 4);
                    inkTaper(g, W, H, [sg * 0.070, 0.400], [sg * 0.052, 0.700], [sg * 0.052, 0.985], 6);        // borda da frente do casaco
                    inkTaper(g, W, H, [sg * 0.072, 0.405], [sg * 0.060, 0.640], [sg * 0.062, 0.905], 3);
                    // bolsos de aba nos quadris (diagonais)
                    inkTaper(g, W, H, [sg * 0.090, 0.700], [sg * 0.132, 0.680], [sg * 0.178, 0.690], 6);
                    inkTaper(g, W, H, [sg * 0.092, 0.770], [sg * 0.134, 0.752], [sg * 0.180, 0.760], 6);
                    inkTaper(g, W, H, [sg * 0.090, 0.700], [sg * 0.088, 0.735], [sg * 0.092, 0.770], 4);
                    inkTaper(g, W, H, [sg * 0.178, 0.690], [sg * 0.180, 0.725], [sg * 0.180, 0.760], 4);
                    inkTaper(g, W, H, [sg * 0.108, 0.782], [sg * 0.136, 0.770], [sg * 0.166, 0.776], 3);        // sombra sob a aba
                });
                inkDot(g, W, H, 0.0, 0.50, 7, '#2f3822'); inkDot(g, W, H, 0.0, 0.62, 7, '#2f3822');         // botões
                inkTaper(g, W, H, [0, 0.978], [0.5, 0.978], [1, 0.978], 8);                                  // barra do casaco
                // dobras: o braço que ampara o bebê (lado +x) puxa o tecido; dobras de peso nos quadris
                inkTaper(g, W, H, [0.145, 0.16], [0.172, 0.30], [0.205, 0.46], 6);
                inkTaper(g, W, H, [0.170, 0.20], [0.196, 0.32], [0.222, 0.44], 4);
                inkTaper(g, W, H, [0.115, 0.43], [0.140, 0.50], [0.178, 0.58], 5);
                inkTaper(g, W, H, [0.835, 0.26], [0.815, 0.46], [0.790, 0.64], 6);                          // lado -x: dobra do peso do casaco
                inkTaper(g, W, H, [0.800, 0.50], [0.790, 0.70], [0.770, 0.90], 4);
                // costas: dobras das omoplatas, costura central e abertura
                inkTaper(g, W, H, [0.44, 0.22], [0.46, 0.36], [0.49, 0.50], 6);
                inkTaper(g, W, H, [0.56, 0.22], [0.54, 0.36], [0.51, 0.50], 6);
                inkTaper(g, W, H, [0.50, 0.05], [0.502, 0.40], [0.50, 0.98], 4);
                inkTaper(g, W, H, [0.44, 0.80], [0.47, 0.86], [0.49, 0.95], 4);
                inkTaper(g, W, H, [0.56, 0.80], [0.53, 0.86], [0.51, 0.95], 4);
            } },
            pantsPelvis: { w: 512, h: 512, fill: PANTS_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0, 0.10], [0.5, 0.10], [1, 0.10], 4);
                [1, -1].forEach(sg => { inkTaper(g, W, H, [sg * 0.030, 0.97], [sg * 0.074, 0.80], [sg * 0.128, 0.68], 4); inkTaper(g, W, H, [sg * 0.032, 0.84], [sg * 0.060, 0.70], [sg * 0.110, 0.58], 4); });
            } },
            pantsThigh: { w: 512, h: 512, fill: PANTS_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.04], [u + 0.004, 0.50], [u, 0.96], 3));       // costuras laterais
                inkTaper(g, W, H, [0.93, 0.10], [0.96, 0.20], [0.985, 0.30], 5);                                 // dobra do quadril
                inkTaper(g, W, H, [0.07, 0.12], [0.05, 0.24], [0.02, 0.34], 4);
                inkTaper(g, W, H, [0.90, 0.42], [0.94, 0.54], [0.98, 0.68], 4);                                 // caimento do tecido ao longo da coxa
                inkTaper(g, W, H, [0.10, 0.45], [0.07, 0.58], [0.03, 0.72], 4);
                inkTaper(g, W, H, [0.935, 0.80], [1.000, 0.830], [0.065, 0.80], 5);                              // vincos acima do joelho
                inkTaper(g, W, H, [0.95, 0.89], [1.000, 0.912], [0.05, 0.89], 4);
            } },
            pantsCalf: { w: 512, h: 512, fill: PANTS_C, fn: (g, W, H, fl) => {
                g.fillStyle = fl; g.fillRect(0, 0, W, H);
                [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u, 0.03], [u - 0.003, 0.50], [u, 0.93], 3));
                inkTaper(g, W, H, [0.93, 0.05], [1.000, 0.080], [0.07, 0.05], 5);                                // vincos do joelho
                inkTaper(g, W, H, [0.94, 0.12], [1.000, 0.140], [0.06, 0.12], 4);
                inkTaper(g, W, H, [0.88, 0.30], [0.91, 0.52], [0.94, 0.76], 4);                                 // caimento
                inkTaper(g, W, H, [0, 0.945], [0.5, 0.945], [1, 0.945], 7);                                      // barra sobre a bota
                inkTaper(g, W, H, [0.93, 0.84], [1.000, 0.865], [0.07, 0.84], 5);
            } },
            faceM: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = SKIN_M; g.fillRect(0, 0, W, H);
                const P = (x, y) => headFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                const T = (a, b, c, w, col) => inkTaper(g, W, H, N(a), N(b), N(c), w, col);
                const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
                const SH = '#d29a80';
                [-1, 1].forEach(sd => {
                    const e = HF.eye;
                    poly([P(sd * 0.044, e + 0.014), P(sd * 0.030, e + 0.018), P(sd * 0.013, e + 0.016), P(sd * 0.014, e + 0.004), P(sd * 0.030, e + 0.007), P(sd * 0.044, e + 0.003)], SH);     // sombra da órbita
                    poly([P(sd * 0.050, e - 0.020), P(sd * 0.040, e - 0.036), P(sd * 0.044, HF.chin + 0.020), P(sd * 0.052, e - 0.040)], SH);                                             // bochecha
                    const eo = P(sd * 0.044, e), ei = P(sd * 0.016, e), ec = P(sd * 0.030, e);
                    g.fillStyle = '#f4efe9'; g.beginPath(); g.ellipse(ec[0], ec[1] + 1, Math.abs(eo[0] - ei[0]) * 0.46, 8, 0, 0, Math.PI * 2); g.fill();      // esclera
                    g.fillStyle = '#4a2c20'; g.beginPath(); g.ellipse(ec[0], ec[1] + 5, 7.5, 6.5, 0, 0, Math.PI * 2); g.fill();                                // íris olhando para baixo
                    g.fillStyle = INK; g.beginPath(); g.ellipse(ec[0], ec[1] + 6, 4, 3.6, 0, 0, Math.PI * 2); g.fill();
                    g.fillStyle = SKIN_M; g.beginPath(); g.ellipse(ec[0], ec[1] - 8, Math.abs(eo[0] - ei[0]) * 0.50, 8, 0, 0, Math.PI * 2); g.fill();           // pálpebra caída (olhar para o chão)
                    C([[ei[0] - 1, ec[1] - 2], [ec[0], ec[1] - 7], [eo[0] + 1, ec[1] - 1]], 8);                                                               // linha da pálpebra superior
                    C([[eo[0], ec[1] - 2], [eo[0] + sd * 8, ec[1] + 1]], 5);                                                                                  // cílio externo
                    C([[ei[0] + 2, ec[1] - 16], [ec[0], ec[1] - 12], [eo[0] - 2, ec[1] - 9]], 3, '#b87d65');                                                  // dobra da pálpebra
                    T(P(sd * 0.047, e + 0.008), P(sd * 0.030, e + 0.019), P(sd * 0.011, e + 0.0225), 10, '#3d231a');                                           // sobrancelha preocupada (ponta interna alta)
                });
                C([P(-0.021, HF.nose + 0.004), P(-0.012, HF.nose - 0.002)], 3, '#b87d65'); C([P(0.021, HF.nose + 0.004), P(0.012, HF.nose - 0.002)], 3, '#b87d65');   // narinas
                const m = P(0, HF.mouth);
                g.fillStyle = '#a66553'; g.beginPath(); g.ellipse(m[0], m[1], 22, 8.5, 0, 0, Math.PI * 2); g.fill();                                           // lábios
                C([P(-0.023, HF.mouth - 0.001), P(0, HF.mouth - 0.003), P(0.023, HF.mouth - 0.001)], 5);
                C([P(-0.011, HF.mouth - 0.010), P(0, HF.mouth - 0.013), P(0.011, HF.mouth - 0.010)], 3, '#8a4d3e');
            } },
            hairM: { w: 1024, h: 512, fn: (g, W, H) => {
                g.fillStyle = '#3d231a'; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 36; k++) {
                    const u0 = k / 36 + 0.005, dark = k % 2 === 0, wv = 0.014 * ((k % 3) - 1);
                    inkTaper(g, W, H, [u0, 0.02], [u0 + wv, 0.5], [u0 + 0.004, 0.98], dark ? 9 : 6, dark ? '#2a1812' : '#59372b');
                }
            } },
            // manta bege: dobras do tecido enrolando o corpo (diagonais) e a ponta azul dobrada por cima
            swaddle: { w: 512, h: 512, fn: (g, W, H) => {
                g.fillStyle = BLANKET_W; g.fillRect(0, 0, W, H);
                inkPoly(g, W, H, [[0.88, 0.10], [1.04, 0.16], [1.06, 0.34], [0.90, 0.30]], BLANKET_B, true, 4);                    // pequena aba azul dobrada sobre o peito
                inkTaper(g, W, H, [0.22, 0.10], [0.28, 0.40], [0.36, 0.78], 5);                                                    // dobras longas em torno do corpo
                inkTaper(g, W, H, [0.34, 0.14], [0.40, 0.48], [0.47, 0.84], 4);
                inkTaper(g, W, H, [0.60, 0.20], [0.64, 0.52], [0.72, 0.90], 5);
                inkTaper(g, W, H, [0.52, 0.30], [0.55, 0.56], [0.60, 0.82], 3);
                inkTaper(g, W, H, [0.08, 0.40], [0.14, 0.62], [0.20, 0.90], 4);
                inkTaper(g, W, H, [0.20, 0.88], [0.30, 0.94], [0.44, 0.96], 4);                                                    // ponta dobrada embaixo
                inkTaper(g, W, H, [0.56, 0.90], [0.68, 0.95], [0.80, 0.96], 4);
            } },
            swaddleBlue: { w: 512, h: 256, fn: (g, W, H) => {
                g.fillStyle = BLANKET_B; g.fillRect(0, 0, W, H);
                inkTaper(g, W, H, [0.10, 0.10], [0.16, 0.50], [0.30, 0.92], 4);                                     // três pregas suaves, em diagonal
                inkTaper(g, W, H, [0.46, 0.06], [0.52, 0.46], [0.60, 0.90], 5);
                inkTaper(g, W, H, [0.78, 0.12], [0.84, 0.52], [0.94, 0.88], 4);
            } },
            babyFace: { w: 512, h: 256, fn: (g, W, H) => {
                g.fillStyle = '#efc4ad'; g.fillRect(0, 0, W, H);
                const P = (x, y) => babyFP(x, y, W, H), N = a => [a[0] / W, a[1] / H], C = (pts, lw, col) => inkCurve(g, W, H, pts.map(N), lw, col);
                const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
                [-1, 1].forEach(sd => {
                    poly([P(sd * 0.036, -0.014), P(sd * 0.048, -0.020), P(sd * 0.050, -0.036), P(sd * 0.036, -0.038), P(sd * 0.028, -0.026)], '#e8a690');                  // bochecha corada (bloco duro)
                    C([P(sd * 0.012, 0.012), P(sd * 0.027, 0.002), P(sd * 0.042, 0.012)], 4);                                                                                // olho fechado, dormindo (arco para baixo)
                    C([P(sd * 0.038, 0.011), P(sd * 0.045, 0.006)], 2.5);  C([P(sd * 0.032, 0.007), P(sd * 0.038, 0.001)], 2.5);                                            // cílios
                    C([P(sd * 0.012, 0.027), P(sd * 0.027, 0.032), P(sd * 0.040, 0.027)], 2.5, '#c7a07a');                                                                  // sobrancelha quase invisível
                });
                C([P(-0.008, -0.026), P(0, -0.029), P(0.008, -0.026)], 3, '#b3604f');                                                                                       // boquinha
                g.fillStyle = '#d07f6e'; { const m = P(0, -0.0275); g.beginPath(); g.ellipse(m[0], m[1], 6, 2.8, 0, 0, Math.PI * 2); g.fill(); }
            } },
            hairB: { w: 512, h: 256, fn: (g, W, H) => {   // cabelo do bebê: castanho-claro (bem diferente da pele, para não parecer careca), com fios mais escuros e mais claros
                g.fillStyle = '#a8794a'; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 44; k++) { const u0 = k / 44 + 0.003; inkTaper(g, W, H, [u0, 0.03], [u0 + 0.012 * Math.sin(k * 1.7), 0.5], [u0 + 0.008 * Math.cos(k), 0.96], 2.2, k % 2 ? '#8a5c33' : '#c49463'); }
            } }
        });
        function createOrganicSegment(profilePoints, len, mat, scaleX = 1, scaleZ = 1, drape, paint, caps) {
            const spl = new THREE.SplineCurve(profilePoints.map(([t, r]) => new THREE.Vector2(t, r)));
            const dense = spl.getPoints(600);
            for (let i = 1; i < dense.length; i++) if (dense[i].x < dense[i - 1].x) dense[i].x = dense[i - 1].x;
            const rAt = tt => {
                let lo = 0, hi = dense.length - 1;
                while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dense[m].x <= tt) lo = m; else hi = m; }
                const a = dense[lo], b = dense[hi], k = b.x > a.x ? (tt - a.x) / (b.x - a.x) : 0;
                return a.y + (b.y - a.y) * Math.min(1, Math.max(0, k));
            };
            const N = 36, lathePts = [];
            for (let i = N; i >= 0; i--) { const tt = i / N; lathePts.push(new THREE.Vector2(Math.max(0.0008, rAt(tt)), -tt * len)); }   // do fundo (t=1) ao topo (t=0): faces para fora
            if (caps) { lathePts.unshift(new THREE.Vector2(0.0008, -len)); lathePts.push(new THREE.Vector2(0.0008, 0)); }   // fecha as pontas (palma: sem tubo aberto)
            const geo = new THREE.LatheGeometry(lathePts, 40);
            let useMat = mat;
            if (paint) { useMat = mat.clone(); useMat.color = new THREE.Color(1, 1, 1); useMat.map = paintTexture(paint); }
            geo.scale(scaleX, 1, scaleZ);
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, useMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

        // Cabelo em mechas: desloca a malha com ruído suave (calota deixa de ser uma esfera lisa)
        function clumpHair(geo, amp) {
            const p = geo.attributes.position;
            for (let i = 0; i < p.count; i++) {
                const x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.hypot(x, y, z) || 1;
                const n = (Math.sin(x * 95 + y * 40) + Math.sin(z * 110 - x * 60 + 1.3) + Math.sin(y * 120 + z * 70 + 2.1)) / 3;
                p.setXYZ(i, x + (x / l) * amp * n, y + (y / l) * amp * n, z + (z / l) * amp * n);
            }
            geo.computeVertexNormals();
        }

        const HAND_K = 1.18;
        const HANDLE_X = 0.000;   // deslocamento lateral da mala em relação à mão (m); negativo = para fora do corpo

        // Constante de escala exata extraída da matriz raiz do glTF (Mannequin.js)
        const GLTF_S = 0.028275117561022346;

        // ----------------------------------------------------------------------------
        // PROPORÇÃO DOS MANEQUINS ARTICULADOS DO PROJETO PRINCIPAL (ultimaversao..., drawDummyFrontFigure
        // com fator "slim" 0.74 + peças de perfil do PDF). Os COMPRIMENTOS dos segmentos já coincidiam;
        // estes fatores afinam a ESPESSURA. Cada par é [largura (X), profundidade (Z)] multiplicando a escala original.
        // ----------------------------------------------------------------------------
        const PROP = {
            shoulderX: 0.774,       // vão dos ombros / estatura: 0.203 -> 0.157
            hipX: 0.754,            // vão dos quadris / estatura: 0.118 -> 0.089
            torso: [0.72, 0.80],    // tórax: largura 0.21 -> 0.151 (profundidade 0.14 -> 0.112)
            pelvis: [0.77, 0.82],   // pelve: 0.183 -> 0.141
            thigh: [0.82, 0.85],    // coxa: 0.087 -> 0.071
            calf: [0.80, 0.80],     // canela: 0.066 -> 0.053
            upperArm: [0.70, 0.75], // braço: 0.068 -> 0.046
            forearm: [0.80, 0.72],  // antebraço: ~0.05 -> 0.0385
            joint: 0.82             // raio das esferas de articulação acompanha os membros mais finos
        };
        // Viajante (1º boneco): segue o desenho de referência (PDF) - corpo de jovem adulto, mais realista que o manequim magro.
        const PROP_TRAVELER = {
            shoulderX: 0.92, hipX: 0.94,
            torso: [0.92, 0.95], pelvis: [0.94, 0.97],
            thigh: [0.94, 0.96], calf: [0.93, 0.93],
            upperArm: [0.94, 0.96], forearm: [0.96, 0.96],
            joint: 0.90
        };

        function createMannequin(charType = 'mannequin') {
            const isTraveler = charType === 'traveler';
            const isElder = charType === 'elder';
            const isMother = charType === 'mother';
            const isClothed = isTraveler || isElder || isMother;
            const PR = isTraveler ? PROP_TRAVELER : PROP;
            // Viajante: esferas de junta menores e achatadas como o membro, para ficarem embutidas no tecido (sem "bolas" saindo da roupa)
            const jS = isTraveler ? 0.22 : 1;
            const JX = a => isTraveler ? a[0] : 1, JZ = a => isTraveler ? a[1] : 1;
            const sculpt = isClothed ? createOrganicSegment : createSculptedSegment;
            // Perfis anatômicos do viajante (raio em m; t=0 no topo do segmento) e caimento do tecido
            const TP = {
                torso: [[0, 0.052], [0.04, 0.078], [0.10, 0.136], [0.17, 0.156], [0.33, 0.150], [0.55, 0.138], [0.78, 0.145], [0.93, 0.157], [1, 0.162]],
                sleeve: [[0, 0.004], [0.025, 0.030], [0.09, 0.055], [0.30, 0.058], [0.62, 0.055], [0.90, 0.059], [1, 0.050]],
                forearm: [[0, 0.036], [0.14, 0.043], [0.42, 0.038], [0.76, 0.030], [0.93, 0.025], [1, 0.023]],
                thigh: [[0, 0.076], [0.14, 0.082], [0.40, 0.077], [0.70, 0.065], [0.92, 0.056], [1, 0.054]],
                calf: [[0, 0.055], [0.12, 0.059], [0.28, 0.062], [0.55, 0.054], [0.84, 0.047], [0.95, 0.052], [1, 0.057]]
            };
            const DR = {
                shirt:  { amp: 0.0070, k: 6, k2: 11, f: 7,  phase: 0.4, env: u => 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.1)) },
                sleeve: { amp: 0.0040, k: 5, k2: 9,  f: 6,  phase: 1.3, env: u => 0.5 + 0.5 * Math.sin(Math.PI * u) },
                jeans:  { amp: 0.0058, k: 5, k2: 9,  f: 9,  phase: 2.1, crumple: 0.7, env: u => 0.45 + 0.55 * Math.sin(Math.PI * u) }
            };

            const root = new THREE.Group();
            if (isMother) {
                root.scale.set(0.80, 0.81, 0.80);
            } else {
                root.scale.setScalar(0.84);
            }

            function getMat(part) {
                if (isTraveler) {
                    if (part === 'pelvis' || part === 'leg') return { main: jeansMat, joint: jeansMat };
                    if (part === 'shoe') return { main: shoeMat, joint: shoeMat };
                    if (part === 'thorax') return { main: shirtTorsoMat, joint: shirtMat };
                    if (part === 'sleeve') return { main: shirtMat, joint: shirtMat };
                    return { main: skinMat, joint: skinMat };
                }
                if (isElder) {
                    if (part === 'pelvis' || part === 'leg' || part === 'thorax' || part === 'sleeve') {
                        return { main: suitMat, joint: suitMat };
                    }
                    if (part === 'shoe') return { main: dressShoeMat, joint: dressShoeMat };
                    return { main: elderSkinMat, joint: elderWrinkleMat };
                }
                if (isMother) {
                    if (part === 'pelvis' || part === 'leg') return { main: motherPantsMat, joint: motherPantsMat };
                    if (part === 'thorax' || part === 'sleeve') return { main: motherCoatMat, joint: motherCoatMat };
                    if (part === 'shoe') return { main: motherBootMat, joint: motherBootMat };
                    return { main: motherSkinMat, joint: motherLipsMat };
                }
                return { main: defaultBodyMat, joint: defaultJointMat };
            }

            function createJointSphere(r, mat, scaleX = 1, scaleY = 1, scaleZ = 1) {
                const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat);
                mesh.scale.set(scaleX, scaleY, scaleZ);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                return mesh;
            }

            // ------------------------------------------------------------------------
            // PELVE E QUADRIL (Medidas exatas do glTF: min[-5.15,-4,-5] max[1.5,4,5])
            // ------------------------------------------------------------------------
            const pelvisMats = getMat('pelvis');
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * GLTF_S; // ~0.95m (altura exata da soma femur 15 + tibia 14 + ankle 4.6)
            root.add(pelvis);

            const pelvisProfile = isClothed ? [
                [0.00, 0.115],
                [0.20, 0.136],
                [0.52, 0.141],
                [0.84, 0.122],
                [1.00, 0.090]
            ] : [
                [0.00, 0.098],
                [0.15, 0.126],
                [0.45, 0.138],
                [0.75, 0.108],
                [0.92, 0.060],
                [1.00, 0.034]
            ];
            const pelvisMesh = sculpt(pelvisProfile, 8.0 * GLTF_S, pelvisMats.main, 1.12 * PR.pelvis[0], 0.82 * PR.pelvis[1], undefined, isTraveler ? PT.pelvis : (isElder ? PT.suitPelvis : (isMother ? PT.pantsPelvis : undefined)), isClothed);
            pelvisMesh.position.set(0, 4.0 * GLTF_S, -0.008);
            pelvis.add(pelvisMesh);

            // Eixo articulado da cintura (conexão pelvis -> torso no glTF em Y = 4*S)
            const waistPivotMat = isTraveler ? shirtMat : (isElder ? suitMat : (isMother ? motherPantsMat : defaultJointMat));
            const waistJoint = createJointSphere(2.8 * GLTF_S * PR.joint * (isTraveler ? 0.01 : 1), waistPivotMat, 1.18, 0.85, 0.88);
            waistJoint.position.set(0, 4.0 * GLTF_S, -0.005);
            pelvis.add(waistJoint);

            // ------------------------------------------------------------------------
            // TÓRAX / TORSO (Offset glTF: [0, 4*S, 0], comprimento até pescoço = 15*S)
            // ------------------------------------------------------------------------
            const thoraxMats = getMat('thorax');
            const thorax = new THREE.Group();
            thorax.position.set(0, 4.0 * GLTF_S, 0);
            pelvis.add(thorax);

            const torsoLen = 15.0 * GLTF_S; // 0.424m exatos do glTF
            const thoraxProfile = isMother ? [
                [0.00, 0.054],
                [0.09, 0.145],
                [0.26, 0.148],
                [0.48, 0.138],
                [0.72, 0.152],
                [0.96, 0.160],
                [1.00, 0.154]
            ] : (isElder ? [
                [0.00, 0.050],
                [0.05, 0.090],
                [0.13, 0.152],
                [0.30, 0.158],
                [0.56, 0.141],
                [0.78, 0.150],
                [0.95, 0.162],
                [1.00, 0.154]
            ] : (isTraveler ? [
                [0.00, 0.054],
                [0.11, 0.154],
                [0.32, 0.151],
                [0.62, 0.138],
                [0.82, 0.146],
                [0.95, 0.158],
                [1.00, 0.160]
            ] : [
                [0.00, 0.048],
                [0.13, 0.152],
                [0.36, 0.146],
                [0.68, 0.116],
                [0.92, 0.098],
                [1.00, 0.080]
            ]));
            const chestMesh = sculpt(
                isTraveler ? TP.torso : thoraxProfile,
                isMother ? 0.64 : (isElder ? 0.525 : (isTraveler ? 0.445 : torsoLen)),
                thoraxMats.main,
                (isMother ? 1.12 : (isElder ? 1.20 : 1.18)) * PR.torso[0],
                (isMother ? 0.80 : (isElder ? 0.80 : 0.76)) * PR.torso[1],
                undefined,
                isTraveler ? PT.shirt : (isElder ? PT.suitTorso : (isMother ? PT.coatTorso : undefined))
            );
            chestMesh.position.y = torsoLen;
            thorax.add(chestMesh);


            if (isMother) {
                // Decote em V mostrando o colo/pescoço e lapelas verde-oliva escuras do casaco
                const chestSkinV = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.17, 4), motherSkinMat);
                chestSkinV.rotation.x = Math.PI;
                chestSkinV.rotation.y = Math.PI / 4;
                chestSkinV.scale.set(0.92, 1, 0.35);
                chestSkinV.position.set(0, 0.32, 0.098 * PR.torso[1]);
                thorax.add(chestSkinV);

                [-1, 1].forEach(s => {
                    const coatLapel = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.016), motherCoatDarkMat);
                    coatLapel.position.set(s * 0.042, 0.275, 0.105 * PR.torso[1]);
                    coatLapel.rotation.z = s * -0.18;
                    coatLapel.rotation.y = s * 0.15;
                    thorax.add(coatLapel);
                });

                // Abertura frontal inferior do casaco longo revelando a calça cinza-escura
                const frontCoatOpening = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.30, 0.025), motherPantsMat);
                frontCoatOpening.position.set(0, -0.08, 0.105 * PR.torso[1]);
                thorax.add(frontCoatOpening);

                // --------------------------------------------------------------------
                // BEBÊ DORMINDO DE PERFIL, ENROLADO NA MANTA (bege e azul-clara), aninhado no braço esquerdo da mãe
                // Eixo local: +y = cabeça do bebê; o rosto olha para o centro do peito da mãe (-x).
                // --------------------------------------------------------------------
                const babyGroup = new THREE.Group();
                babyGroup.position.set(0.030, 0.150, 0.150 * PR.torso[1]);
                babyGroup.rotation.set(0.12, -0.14, -0.62);

                // Corpo enrolado: casulo macio, mais cheio no peito/quadril e afinando nos pés (perfil de spline)
                const swaddleBody = createOrganicSegment([
                    [0.00, 0.052], [0.07, 0.078], [0.26, 0.092], [0.52, 0.086], [0.78, 0.064], [0.93, 0.040], [1.00, 0.020]
                ], 0.32, swaddleBeigeMat, 1.10, 0.86, undefined, PT.swaddle);
                swaddleBody.position.y = 0.135;
                swaddleBody.rotation.x = 0.06;
                babyGroup.add(swaddleBody);

                // Aba azul-clara dobrada por cima do peito e do ombro (volume extra de tecido, com pregas)
                const blueFold = createOrganicSegment([
                    [0.00, 0.056], [0.18, 0.090], [0.55, 0.096], [0.88, 0.078], [1.00, 0.060]
                ], 0.082, swaddleBlueMat, 1.06, 0.88, undefined, PT.swaddleBlue);
                blueFold.position.set(0.004, 0.172, 0.008);
                blueFold.rotation.set(0.05, 0, 0.12);
                babyGroup.add(blueFold);

                // Borda enrolada da manta em volta do pescoço (gola fofa)
                const collarRoll = createOrganicSegment([[0.00, 0.036], [0.35, 0.058], [0.70, 0.060], [1.00, 0.040]], 0.040, swaddleBlueMat, 1.06, 0.92, undefined, PT.swaddleBlue);
                collarRoll.position.set(0.004, 0.226, -0.004);
                babyGroup.add(collarRoll);

                // Ponta inferior da manta dobrada para cima, cobrindo os pezinhos
                const footTuck = createOrganicSegment([[0.00, 0.030], [0.35, 0.052], [0.75, 0.048], [1.00, 0.016]], 0.070, swaddleBlueMat, 1.0, 0.8, undefined, PT.swaddleBlue);
                footTuck.position.set(-0.010, 0.010, 0.020);
                footTuck.rotation.set(0.20, 0, 0.16);
                babyGroup.add(footTuck);

                // Cabeça de bebê: crânio redondo, bochechas cheias, olho fechado, boquinha (rosto pintado), de perfil
                const babyHead = new THREE.Mesh(buildBabyHeadGeometry(), paintedMat(PT.babyFace));
                babyHead.scale.setScalar(1.22);
                babyHead.position.set(0.010, 0.290, 0.020);
                babyHead.rotation.set(0.10, -1.25, 0.20);
                babyHead.castShadow = true;
                babyGroup.add(babyHead);

                // Cabelo claro e finíssimo: casca fina sobre o alto da cabeça, descendo até a têmpora e a nuca
                {
                    const BTL = Math.PI * 0.66, bg = new THREE.SphereGeometry(1, 36, 22, 0, Math.PI * 2, 0, BTL), bp = bg.attributes.position;
                    for (let k = 0; k < bp.count; k++) {
                        const x = bp.getX(k), y = bp.getY(k), z = bp.getZ(k);
                        const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                        let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));
                        const ap = Math.abs(psi), thMax = Math.PI * (0.24 + 0.26 * hsm(0.5, 2.6, ap) + 0.025 * Math.sin(psi * 9 + 2));       // testa livre na frente, nuca coberta atrás
                        const th2 = (th / BTL) * thMax, st = Math.sin(th2);
                        const q = babyHeadPoint(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st);
                        const ctr = [0, 0, 0], kk = 1.035;
                        bp.setXYZ(k, q[0] * kk, q[1] * kk, q[2] * kk);
                    }
                    bg.computeVertexNormals();
                    const babyHairCap = new THREE.Mesh(bg, paintedMat(PT.hairB));
                    babyHairCap.position.copy(babyHead.position); babyHairCap.rotation.copy(babyHead.rotation); babyHairCap.scale.copy(babyHead.scale);
                    babyHairCap.castShadow = true;
                    babyGroup.add(babyHairCap);
                    // um cacho fino no topo, curvado
                    const curl = createOrganicSegment([[0, 0.006], [0.4, 0.0075], [1, 0.0008]], 0.030, babyHairMat, 1, 1);
                    curl.position.set(0.012, 0.290 + 0.072, 0.020); curl.rotation.set(0.5, 0, -0.9);
                    babyGroup.add(curl);
                }

                // Orelhas visíveis (uma de cada lado; de perfil aparece a do lado da câmera)
                [-1, 1].forEach(sd => {
                    const babyEar = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 12), paintedMat(PT.earB));
                    babyEar.scale.set(0.34, 1.12, 0.78);
                    babyEar.position.set(0.010, 0.284, 0.020);
                    // lado da cabeça (o rosto aponta para -x, então as orelhas ficam em ±z do local do bebê)
                    babyEar.position.z += sd * 0.066; babyEar.position.x += 0.004; babyEar.position.y -= 0.002; babyEar.scale.multiplyScalar(1.25);
                    babyEar.rotation.set(0, Math.PI / 2, sd * -0.10);
                    babyGroup.add(babyEar);
                });

                // Mãozinha fechada saindo da manta, junto ao queixo
                const babyFist = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 12), motherSkinMat);
                babyFist.scale.set(1.0, 0.85, 0.9);
                babyFist.position.set(-0.048, 0.226, 0.058);
                babyGroup.add(babyFist);
                const babyWrist = createOrganicSegment([[0, 0.012], [0.5, 0.0145], [1, 0.0128]], 0.040, swaddleBlueMat, 1, 1);
                babyWrist.position.set(-0.044, 0.217, 0.054); babyWrist.rotation.set(0, 0, 0.9);
                babyGroup.add(babyWrist);

                thorax.add(babyGroup);
            }

            if (isTraveler) {
                // Gola careca canelada verde-escura da camiseta
            }

            if (isElder) {
                // Colarinho branco da camisa social por dentro do paletó bege
                const shirtCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.055, 20), dressShirtMat);
                shirtCollar.scale.set(1.02, 1, 0.92);
                shirtCollar.position.set(0, 0.382, 0.004);
                thorax.add(shirtCollar);

            }

            // ------------------------------------------------------------------------
            // PESCOÇO E CABEÇA ESCULPIDA (Proporções e inclinação do nó 'neck' e 'head' do glTF)
            // ------------------------------------------------------------------------
            const skinMats = getMat('head');
            const neckGroup = new THREE.Group();
            neckGroup.position.set(0, torsoLen, 0.006);
            thorax.add(neckGroup);

            const neckMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(1.10 * GLTF_S, 1.25 * GLTF_S, 4.0 * GLTF_S, 20),
                skinMats.main
            );
            neckMesh.position.set(0, 1.5 * GLTF_S, 0);
            neckMesh.rotation.x = 0.087; // Inclinação anatômica de 5° do glTF (sin = 0.087155)
            neckMesh.castShadow = true;
            neckGroup.add(neckMesh);

            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            thorax.add(head);
            if (isTraveler) head.scale.setScalar(1.16);   // cabeça levemente maior, como no desenho de referência

            // Cabeça: uma única malha com crânio, bochechas, mandíbula e queixo (buildHeadGeometry); rosto pintado na textura
            const cranium = new THREE.Mesh(buildHeadGeometry(), isTraveler ? paintedMat(PT.face) : (isElder ? paintedMat(PT.faceE) : (isMother ? paintedMat(PT.faceM) : skinMats.main)));
            cranium.castShadow = true;
            cranium.receiveShadow = true;
            head.add(cranium);

            // Nariz: ponte que parte da glabela e afunila até a ponta arredondada, com as asas do nariz
            {
                const nRoot = new THREE.Vector3(0, 0.136, 0.092), nTip = new THREE.Vector3(0, 0.098, 0.107), nd = nTip.clone().sub(nRoot);
                const bridge = new THREE.Mesh(new THREE.ConeGeometry(0.0125, nd.length(), 8), skinMats.main);
                bridge.position.copy(nRoot).add(nTip).multiplyScalar(0.5);
                bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nd.clone().negate().normalize());   // vértice do cone na raiz do nariz, base larga na ponta
                bridge.scale.set(1.0, 1, 0.95);
                head.add(bridge);
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0118, 14, 12), skinMats.main);
                tip.scale.set(1.0, 0.85, 1.0);
                tip.position.set(0, 0.0985, 0.1005);
                head.add(tip);
                [-1, 1].forEach(s => {
                    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 10, 10), skinMats.main);
                    wing.scale.set(0.9, 1.0, 0.85);
                    wing.position.set(s * 0.0112, 0.0995, 0.0955);
                    head.add(wing);
                });
            }

            // Orelhas: entre a linha da sobrancelha e a da base do nariz, logo atrás da articulação da mandíbula
            [-1, 1].forEach(s => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), isTraveler ? paintedMat(PT.earT) : (isElder ? paintedMat(PT.earE) : (isMother ? paintedMat(PT.earM) : skinMats.main)));
                ear.scale.set(0.36, 1.18, 0.80);
                ear.position.set(s * 0.0715, 0.116, -0.006);
                ear.rotation.set(0.08, s * 0.18, s * -0.10);
                head.add(ear);
            });

            if (isTraveler) {
                // Sobrancelhas franzidas e olhos fechados de exaustão/preocupação
                [-1, 1].forEach(s => {
                    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.010), featureMat);
                    brow.position.set(s * 0.028, 0.136, 0.092);
                    brow.rotation.z = s * 0.22;
                    brow.rotation.y = s * 0.20;
                    

                    const closedEye = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.005, 0.008), featureMat);
                    closedEye.position.set(s * 0.027, 0.118, 0.092);
                    closedEye.rotation.y = s * 0.18;
                    
                });

                const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.005, 0.008), skinShadowMat);
                mouth.position.set(0, 0.065, 0.085);
                

                // Cabelo castanho curto repicado em mechas (fiel ao vetor)
                // Cabelo: casca com volume (maior que o crânio). A borda desce até a nuca atrás e nas laterais; só na testa ela sobe, em pontas.
                const HAIR_TL = Math.PI * 0.80;
                const hairGeo = new THREE.SphereGeometry(1, 56, 32, 0, Math.PI * 2, 0, HAIR_TL);
                {
                    const hp = hairGeo.attributes.position, sm = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
                    for (let i = 0; i < hp.count; i++) {
                        const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
                        const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                        let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));       // 0 = frente (+z)
                        const ap = Math.abs(psi), frontW = 1 - sm(0.5, 1.1, ap);
                        const tri = Math.abs(((psi * 5.2 + 100) % 1) - 0.5) * 2;                          // 0..1 (pontas da franja)
                        const thMax = Math.PI * (0.42 + 0.34 * sm(0.7, 2.6, ap)) + Math.PI * 0.055 * (1 - tri) * frontW;
                        const th2 = (th / HAIR_TL) * thMax, st = Math.sin(th2);
                        const n = (Math.sin(x * 10 + y * 4.4) + Math.sin(z * 12 - x * 6.6 + 1.3) + Math.sin(y * 13 + z * 7.7 + 2.1)) / 3;   // mechas em relevo
                        const k = 1.02 + (0.13 + 0.05 * n) * (1 - hsm(0.55, 1.0, th / HAIR_TL));
                        const hq = headShell(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st, k);
                        hp.setXYZ(i, hq[0], hq[1], hq[2]);
                    }
                    hairGeo.computeVertexNormals();
                }
                const hairCap = new THREE.Mesh(hairGeo, paintedMat(PT.hair));
                hairCap.castShadow = true;
                head.add(hairCap);

                // mechas espetadas na coroa (saem da superfície da casca, voltadas para cima/trás)
                const tuftSeed = [0.9, 1.15, 0.8, 1.2, 1.0, 0.85, 1.25, 0.95, 1.1];
                for (let k = 0; k < 9; k++) {
                    const ang = (k / 9) * Math.PI * 2, dir = new THREE.Vector3(Math.cos(ang) * 0.62, 1.0, Math.sin(ang) * 0.62 - 0.10).normalize();
                    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.020 * tuftSeed[k], 0.060 * tuftSeed[(k + 4) % 9], 7), hairMat);
                    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                    { const hq = headShell(dir.x, dir.y, dir.z, 1.12); sp.position.set(hq[0], hq[1], hq[2]); }
                    sp.castShadow = true;
                    head.add(sp);
                }
            }

            if (isElder) {
                // Rosto do senhor (sobrancelhas grisalhas, olhos, rugas e boca) está pintado na textura do crânio (PT.faceE).
                // Cabelo grisalho em ferradura (laterais e nuca); topo da cabeça e testa calvos como no PDF. Casca com mechas pintadas.
                {
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
                        const k = 1.02 + (0.055 + 0.04 * n) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.5);
                        const hq = headShell(x0, y0, z0, k);
                        hp.setXYZ(i, hq[0], hq[1], hq[2]);
                    }
                    hg.computeVertexNormals();
                    const elderHair = new THREE.Mesh(hg, paintedMat(PT.hairE));
                    elderHair.castShadow = true;
                    head.add(elderHair);
                }
            }

            if (isMother) {
                // Rosto da mãe (sobrancelhas preocupadas, olhos, nariz e lábios) está pintado na textura do crânio (PT.faceM).

                // Cabelo castanho-escuro longo e ondulado (caindo nas costas e sobre o ombro direito)
                const motherHairGroup = new THREE.Group();

                // Topo volumoso com repartição lateral
                const crownGeo = new THREE.SphereGeometry(1, 56, 28, 0, Math.PI * 2, 0, Math.PI * 0.66);
                {
                    const hp = crownGeo.attributes.position, CTL = Math.PI * 0.66, sm = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
                    for (let i = 0; i < hp.count; i++) {
                        const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
                        const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
                        let psi = ph - Math.PI / 2; psi = Math.atan2(Math.sin(psi), Math.cos(psi));       // 0 = frente (+z)
                        const ap = Math.abs(psi), frontW = 1 - sm(0.6, 1.3, ap);
                        const tri = Math.abs(((psi * 4.0 + 100) % 1) - 0.5) * 2;
                        const thMax = Math.PI * (0.41 + 0.19 * sm(0.8, 2.4, ap)) + Math.PI * 0.035 * (1 - tri) * frontW;   // franja termina na testa; atrás desce até a nuca
                        const th2 = (th / CTL) * thMax, st = Math.sin(th2);
                        const n = (Math.sin(x * 10 + y * 4.4) + Math.sin(z * 12 - x * 6.6 + 1.3) + Math.sin(y * 13 + z * 7.7 + 2.1)) / 3;
                        const k = 1.02 + (0.10 + 0.04 * n) * (1 - hsm(0.55, 1.0, th / CTL));
                        const hq = headShell(-Math.cos(ph) * st, Math.cos(th2), Math.sin(ph) * st, k);
                        hp.setXYZ(i, hq[0], hq[1], hq[2]);
                    }
                    crownGeo.computeVertexNormals();
                }
                const crownHair = new THREE.Mesh(crownGeo, paintedMat(PT.hairM));
                crownHair.castShadow = true;
                motherHairGroup.add(crownHair);

                // Comprimento longo caindo pelas costas
                const backLongHairProfile = [
                    [0.00, 0.082],
                    [0.25, 0.096],
                    [0.55, 0.105],
                    [0.82, 0.092],
                    [1.00, 0.055]
                ];
                const backHairCascade = sculpt(backLongHairProfile, 0.36, motherHairMat, 1.08, 0.62, undefined, PT.hairM);
                backHairCascade.position.set(0, 0.145, -0.048);
                backHairCascade.rotation.x = 0.14;
                motherHairGroup.add(backHairCascade);

                // Mecha espessa ondulada caindo pela frente sobre o ombro direito (como na referência)
                const frontRightWave = sculpt([
                    [0.00, 0.032],
                    [0.35, 0.042],
                    [0.72, 0.036],
                    [1.00, 0.015]
                ], 0.26, motherHairMat, 0.95, 0.72, undefined, PT.hairM);
                frontRightWave.position.set(-0.076, 0.115, 0.028);
                frontRightWave.rotation.set(-0.22, 0, -0.12);
                motherHairGroup.add(frontRightWave);

                // Mecha lateral esquerda indo em direção ao ombro esquerdo
                const leftShoulderWave = sculpt([
                    [0.00, 0.034],
                    [0.45, 0.040],
                    [0.85, 0.030],
                    [1.00, 0.014]
                ], 0.24, motherHairMat, 0.90, 0.75, undefined, PT.hairM);
                leftShoulderWave.position.set(0.078, 0.118, 0.005);
                leftShoulderWave.rotation.set(0.08, 0, 0.16);
                motherHairGroup.add(leftShoulderWave);

                head.add(motherHairGroup);
            }

            // ------------------------------------------------------------------------
            // BRAÇOS, PUNHOS E MÃOS COM 5 DEDOS DE 3 FALANGES (Estrutura l_arm -> l_elbow -> l_wrist -> finger/mid/tip do glTF)
            // ------------------------------------------------------------------------
            let suitcaseGroup = null;

            function buildArm(side) {
                const lowMats = getMat('arm');
                const shoulder = new THREE.Group();
                shoulder.rotation.order = 'YXZ';
                // Posição exata do glTF: [0, 14*S, ±6*S] -> X = side * 0.175, Y = 0.365
                shoulder.position.set(side * (6.2 * GLTF_S) * PR.shoulderX, 13.0 * GLTF_S, 0);
                thorax.add(shoulder);

                const shoulderBallMat = isTraveler ? shirtMat : (isElder ? suitMat : (isMother ? motherCoatMat : defaultJointMat));
                shoulder.add(createJointSphere(1.75 * GLTF_S * PR.joint * (isTraveler ? 0.30 : jS), shoulderBallMat, 0.98 * JX(PR.upperArm), 1.02, 0.98 * JZ(PR.upperArm)));

                const upperArmLen = 10.2 * GLTF_S; // ~0.288m (11 unidades no glTF)
                const forearmLen = 9.2 * GLTF_S;   // ~0.260m

                if (isElder || isMother) {
                    const upperSleeveProfile = isElder ? [
                        [0.00, 0.006],
                        [0.03, 0.042],
                        [0.10, 0.059],
                        [0.38, 0.058],
                        [0.76, 0.053],
                        [1.00, 0.050]
                    ] : [
                        [0.00, 0.055],
                        [0.35, 0.054],
                        [0.80, 0.050],
                        [1.00, 0.046]
                    ];
                    shoulder.add(sculpt(upperSleeveProfile, upperArmLen, isMother ? motherCoatMat : suitMat, 0.98 * PR.upperArm[0], 1.02 * PR.upperArm[1], undefined, isMother ? PT.coatSleeve : PT.suitSleeve));
                } else if (isTraveler) {
                    const sleeveProfile = [
                        [0.00, 0.053],
                        [0.35, 0.056],
                        [0.88, 0.058],
                        [0.96, 0.060],
                        [1.00, 0.046]
                    ];
                    const sleeveMesh = sculpt(TP.sleeve, 0.185, shirtMat, 0.98 * PR.upperArm[0], 1.02 * PR.upperArm[1], undefined, PT.sleeve);
                    shoulder.add(sleeveMesh);


                    const lowerBicepProfile = [
                        [0.00, 0.043],
                        [0.50, 0.041],
                        [0.90, 0.037],
                        [1.00, 0.034]
                    ];
                    const bicepSkin = sculpt(lowerBicepProfile, 0.125, skinMat, 0.94 * PR.upperArm[0], 0.96 * PR.upperArm[1]);
                    bicepSkin.position.y = -0.165;
                    shoulder.add(bicepSkin);
                } else {
                    const upperArmProfile = [
                        [0.00, 0.045],
                        [0.25, 0.048],
                        [0.58, 0.043],
                        [0.88, 0.036],
                        [1.00, 0.032]
                    ];
                    shoulder.add(sculpt(upperArmProfile, upperArmLen, defaultBodyMat, 0.92 * PR.upperArm[0], 0.98 * PR.upperArm[1]));
                }

                // Cotovelo (nó l_elbow / r_elbow do glTF)
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);

                elbow.add(createJointSphere(((isElder || isMother) ? 0.045 : 0.036) * PR.joint * jS, isElder ? suitMat : (isMother ? motherCoatMat : lowMats.joint), 0.95 * JX(PR.forearm), 1, 0.95 * JZ(PR.forearm)));

                if (isMother) {
                    const motherLowerSleeve = [
                        [0.00, 0.046],
                        [0.50, 0.048],
                        [0.92, 0.052],
                        [1.00, 0.044]
                    ];
                    elbow.add(sculpt(motherLowerSleeve, forearmLen, motherCoatMat, 0.96 * PR.forearm[0], 1.04 * PR.forearm[1], undefined, PT.coatForearm));
                } else if (isElder) {
                    const lowerSleeveProfile = [
                        [0.00, 0.050],
                        [0.18, 0.047],
                        [0.55, 0.043],
                        [0.93, 0.040],
                        [0.965, 0.043],
                        [1.00, 0.036]
                    ];
                    elbow.add(sculpt(lowerSleeveProfile, forearmLen - 0.012, suitMat, 0.96 * PR.forearm[0], 1.04 * PR.forearm[1], undefined, PT.suitForearm));

                    const shirtCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.035, 0.026, 18), dressShirtMat);
                    shirtCuff.scale.set(0.92 * PR.forearm[0], 1, 1.04 * PR.forearm[1]);
                    shirtCuff.position.y = -forearmLen + 0.008;
                    elbow.add(shirtCuff);

                    [-0.185, -0.202, -0.219].forEach(btnY => {
                        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 10), tieMat);
                        btn.rotation.z = Math.PI / 2;
                        btn.position.set(side * 0.042 * PR.forearm[0], btnY, -0.008 * PR.forearm[1]);
                        elbow.add(btn);
                    });
                } else {
                    const forearmProfile = [
                        [0.00, 0.034],
                        [0.22, 0.042],
                        [0.55, 0.035],
                        [0.88, 0.027],
                        [1.00, 0.023]
                    ];
                    elbow.add(sculpt(isTraveler ? TP.forearm : forearmProfile, forearmLen, lowMats.main, 0.90 * PR.forearm[0], 1.02 * PR.forearm[1]));
                }

                // Punho (l_wrist / r_wrist do glTF)
                const wristJoint = createJointSphere(0.024, lowMats.main, 1.05, 0.85, 0.82);
                wristJoint.position.y = -forearmLen;
                elbow.add(wristJoint);

                // Mão com palma esculpida e 5 dedos com 3 falanges cada (finger_0..4 -> mid_0..4 -> tip_0..4 do glTF)
                const hand = new THREE.Group();
                hand.position.y = -forearmLen - 0.004;
                if (isTraveler) hand.scale.setScalar(HAND_K);   // mãos maiores (estilo desenho)
                elbow.add(hand);

                const palmLen = 2.2 * GLTF_S; // ~0.062m exatos do glTF
                const palmProfile = [
                    [0.00, 0.022],
                    [0.30, 0.028],
                    [0.75, 0.029],
                    [1.00, 0.025]
                ];
                const palmMesh = sculpt(palmProfile, palmLen, lowMats.main, 0.48, 1.02, undefined, undefined, true);
                hand.add(palmMesh);

                // Especificações exatas dos 5 dedos extraídas dos accessors do glTF (finger_0 = polegar, 1..4 = indicador ao mínimo)
                const fingerSpecs = [
                    { zOff:  0.021, yOff: -0.018, l1: 1.15 * GLTF_S, l2: 0.82 * GLTF_S, l3: 0.68 * GLTF_S, r: 0.0072, isThumb: true },
                    { zOff:  0.019, yOff: -palmLen, l1: 0.76 * GLTF_S, l2: 0.66 * GLTF_S, l3: 0.56 * GLTF_S, r: 0.0064, spread:  0.10 },
                    { zOff:  0.006, yOff: -palmLen - 0.003, l1: 0.80 * GLTF_S, l2: 0.70 * GLTF_S, l3: 0.60 * GLTF_S, r: 0.0066, spread:  0.03 },
                    { zOff: -0.007, yOff: -palmLen, l1: 0.76 * GLTF_S, l2: 0.66 * GLTF_S, l3: 0.56 * GLTF_S, r: 0.0062, spread: -0.03 },
                    { zOff: -0.019, yOff: -palmLen + 0.003, l1: 0.64 * GLTF_S, l2: 0.56 * GLTF_S, l3: 0.48 * GLTF_S, r: 0.0054, spread: -0.10 }
                ];

                const fingers = [];
                const isHoldingHandle = (isTraveler || isElder || isMother) && side === -1;

                fingerSpecs.forEach((spec, idx) => {
                    const prox = new THREE.Group();
                    prox.position.set(0, spec.yOff, spec.zOff);

                    const fingerSeg = (r0, r1, len, tipEnd) => createOrganicSegment([[0, 0.0025], [0.03, r0 * 0.80], [0.10, r0 * 1.04], [0.70, (r0 + r1) * 0.5], [tipEnd ? 0.90 : 0.95, r1 * 0.96], [tipEnd ? 0.97 : 0.985, r1 * 0.70], [1, 0.0025]], len, lowMats.main, 1, 1);
                    const p1Mesh = fingerSeg(spec.r, spec.r * 0.92, spec.l1, false);
                    p1Mesh.position.y = 0;
                    p1Mesh.castShadow = true;
                    prox.add(p1Mesh);

                    const mid = new THREE.Group();
                    mid.position.y = -spec.l1;
                    prox.add(mid);
                    mid.add(createJointSphere(spec.r * 0.88, lowMats.joint));

                    const p2Mesh = fingerSeg(spec.r * 0.90, spec.r * 0.80, spec.l2, false);
                    p2Mesh.position.y = 0;
                    p2Mesh.castShadow = true;
                    mid.add(p2Mesh);

                    const tip = new THREE.Group();
                    tip.position.y = -spec.l2;
                    mid.add(tip);
                    tip.add(createJointSphere(spec.r * 0.78, lowMats.joint));

                    const p3Mesh = fingerSeg(spec.r * 0.78, spec.r * 0.62, spec.l3, true);
                    p3Mesh.position.y = 0;
                    p3Mesh.castShadow = true;
                    tip.add(p3Mesh);

                    if (spec.isThumb) {
                        prox.rotation.x = 0.52;
                        prox.rotation.z = side * 0.35;
                        mid.rotation.z = side * -0.22;
                        tip.rotation.z = side * -0.18;
                    } else if (isHoldingHandle) {
                        // Dedos fechados envolvendo a alça da mala com as 3 falanges
                        prox.rotation.z = side * 1.15;      // fecham em direção ao corpo (palma voltada para a coxa)
                        mid.rotation.z = side * 1.10;
                        tip.rotation.z = side * 0.85;
                    } else {
                        prox.rotation.x = spec.spread;
                        // Curvatura natural de repouso (10° do glTF: sin = 0.173648)
                        prox.rotation.z = side * -0.17;
                        mid.rotation.z = side * -0.22;
                        tip.rotation.z = side * -0.15;
                    }

                    hand.add(prox);
                    fingers.push({ prox, mid, tip, isThumb: !!spec.isThumb, spread: spec.spread || 0 });
                });

                // --------------------------------------------------------------------
                // MALA DE RODINHAS MODERNA (Viajante - Personagem 1)
                // --------------------------------------------------------------------
                if (isTraveler && side === -1) {
                    suitcaseGroup = new THREE.Group();
                    suitcaseGroup.position.set(HANDLE_X / HAND_K, -0.065 / HAND_K, 0.00);   // afastada da perna (sem atravessar)
                    suitcaseGroup.scale.setScalar(1.14 / HAND_K);   // mala um pouco maior, como no vídeo
                    suitcaseGroup.rotation.set(0.18, 0.08, 0.04);

                    // Mala rígida de viagem do desenho: casca azul-marinho, borda cinza-clara, rebaixo oval da pegada e rodinhas duplas
                    const caseNavy = new THREE.MeshStandardMaterial({ color: 0x363a43, roughness: 0.40, metalness: 0.12 });
                    const caseNavyDark = new THREE.MeshStandardMaterial({ color: 0x27272b, roughness: 0.50, metalness: 0.10 });
                    const caseGrey = new THREE.MeshStandardMaterial({ color: 0x4b505b, roughness: 0.38, metalness: 0.14 });
                    const CW = 0.335, CH = 0.450, CD = 0.172, CR = 0.052;
                    const bodyCenterY = -0.255, bodyCenterZ = -0.035;

                    function roundedRectShape(w, h, r) {
                        const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
                        sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
                        sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                        sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
                        sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
                        return sh;
                    }
                    function slab(w, h, r, depth, mat, bevel) {   // placa arredondada com espessura em X (face grande voltada para ±X)
                        const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
                        g.translate(0, 0, -depth / 2);
                        const m = new THREE.Mesh(g, mat);
                        m.rotation.y = Math.PI / 2;
                        m.castShadow = true; m.receiveShadow = true;
                        return m;
                    }

                    const shell = slab(CW, CH, CR, CD - 0.03, caseNavy, 0.015);
                    shell.position.set(0, bodyCenterY, bodyCenterZ);
                    suitcaseGroup.add(shell);

                    // faixa/borda cinza-clara da junção das duas metades da casca (aparece no contorno)
                    const rim = slab(CW + 0.006, CH + 0.006, CR + 0.003, 0.050, caseGrey, 0.006);
                    rim.position.set(0.014, bodyCenterY, bodyCenterZ);
                    suitcaseGroup.add(rim);

                    // nervuras verticais moldadas nas duas faces grandes
                    [-1, 1].forEach(sx => [-0.075, 0.075].forEach(zo => {
                        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.004, CH - 0.130, 0.007), caseNavyDark);
                        rib.position.set(sx * (CD / 2 + 0.0015), bodyCenterY - 0.005, bodyCenterZ + zo);
                        suitcaseGroup.add(rib);
                    }));

                    // rebaixo oval da pegada lateral (placa cinza + abertura escura)
                    [-1, 1].forEach(sx => {
                        const gripFrame = slab(0.112, 0.050, 0.020, 0.006, caseNavyDark, 0);
                        gripFrame.position.set(sx * (CD / 2 + 0.002), bodyCenterY + 0.150, bodyCenterZ + 0.010);
                        suitcaseGroup.add(gripFrame);
                        const gripWell = slab(0.092, 0.032, 0.014, 0.008, suitcaseWellMat, 0);
                        gripWell.position.set(sx * (CD / 2 + 0.004), bodyCenterY + 0.150, bodyCenterZ + 0.010);
                        suitcaseGroup.add(gripWell);
                    });

                    // alça de mão no topo (a mão segura aqui) + base da haste telescópica
                    const topStrap = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.010, 10, 20, Math.PI), caseGrey);
                    topStrap.rotation.y = Math.PI / 2;
                    topStrap.scale.set(1.25, 0.55, 1.0);
                    topStrap.position.set(0, -0.012, 0.0);
                    suitcaseGroup.add(topStrap);
                    const topBase = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.016, 0.110), caseNavyDark);
                    topBase.position.set(0, bodyCenterY + CH / 2 + 0.004, bodyCenterZ);
                    suitcaseGroup.add(topBase);

                    // 4 rodinhas giratórias (duplas) nos cantos inferiores
                    [[-0.052, -0.125], [0.052, -0.125], [-0.052, 0.125], [0.052, 0.125]].forEach(([wx, wz]) => {
                        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.034), suitcaseWellMat);
                        mount.position.set(wx, bodyCenterY - CH / 2 - 0.004, bodyCenterZ + wz);
                        suitcaseGroup.add(mount);
                        [-1, 1].forEach(w => {
                            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.014, 14), suitcaseWellMat);
                            wheel.rotation.z = Math.PI / 2;
                            wheel.position.set(wx + w * 0.012, bodyCenterY - CH / 2 - 0.026, bodyCenterZ + wz);
                            wheel.castShadow = true;
                            suitcaseGroup.add(wheel);
                        });
                    });

                    hand.add(suitcaseGroup);
                }

                // --------------------------------------------------------------------
                // MALETA VINTAGE MARROM COM CANTONEIRAS (Idoso - Personagem 2)
                // --------------------------------------------------------------------
                if (isElder && side === -1) {
                    suitcaseGroup = new THREE.Group();
                    suitcaseGroup.position.set(-0.02, -0.068, 0.01);

                    const leatherHandle = new THREE.Mesh(
                        new THREE.TorusGeometry(0.044, 0.009, 10, 20, Math.PI),
                        vintageCornerMat
                    );
                    leatherHandle.rotation.y = Math.PI / 2;
                    leatherHandle.scale.set(1.15, 0.65, 1.0);
                    leatherHandle.position.set(0, -0.008, 0);
                    suitcaseGroup.add(leatherHandle);

                    const caseY = -0.195;
                    const caseW = 0.125;
                    const caseH = 0.335;
                    const caseL = 0.445;

                    const vintageBody = new THREE.Mesh(new THREE.BoxGeometry(caseW, caseH, caseL), vintageCaseMat);
                    vintageBody.position.set(0, caseY, 0);
                    vintageBody.castShadow = true;
                    vintageBody.receiveShadow = true;
                    suitcaseGroup.add(vintageBody);

                    const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.016, caseH + 0.005, caseL + 0.005), vintageCornerMat);
                    centerDivider.position.set(0, caseY, 0);
                    suitcaseGroup.add(centerDivider);

                    // Cantoneiras escuras arredondadas nos 8 vértices da maleta
                    [-1, 1].forEach(sy => {
                        [-1, 1].forEach(sz => {
                            const corner = new THREE.Mesh(new THREE.BoxGeometry(caseW + 0.010, 0.055, 0.055), vintageCornerMat);
                            corner.position.set(0, caseY + sy * (caseH * 0.5 - 0.024), sz * (caseL * 0.5 - 0.024));
                            suitcaseGroup.add(corner);
                        });
                    });

                    hand.add(suitcaseGroup);
                }

                // --------------------------------------------------------------------
                // MALA VERMELHA DE RODINHAS COM HASTE RETRÁTIL ESTENDIDA (Mãe - Personagem 3)
                // --------------------------------------------------------------------
                if (isMother && side === -1) {
                    suitcaseGroup = new THREE.Group();
                    suitcaseGroup.position.set(-0.045, -0.055, 0.02);

                    // Pegador preto superior da haste retrátil (na mão direita)
                    const handleGrip = createOrganicSegment([[0, 0.0035], [0.06, 0.0125], [0.5, 0.0135], [0.94, 0.0125], [1, 0.0035]], 0.135, suitcaseWellMat, 1, 1);
                    handleGrip.rotation.x = Math.PI / 2;                 // barra ao longo de z (frente-trás), arredondada
                    handleGrip.position.set(0.045, 0, 0.0675);           // no punho: os dedos fecham em torno dela
                    suitcaseGroup.add(handleGrip);
                    const handleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.016, 0.100), suitcaseWellMat);   // suporte que liga a barra às hastes
                    handleBridge.position.set(0.020, 0.003, 0);
                    handleBridge.castShadow = true;
                    suitcaseGroup.add(handleBridge);

                    // Duas hastes metálicas pretas descendo até o corpo da mala vermelha
                    [-0.048, 0.048].forEach(zRod => {
                        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.29, 10), suitcaseWellMat);
                        rod.position.set(0, -0.145, zRod);
                        rod.castShadow = true;
                        suitcaseGroup.add(rod);
                    });

                    // Corpo retangular vertical da mala vermelha com cantos arredondados
                    const redBoxY = -0.495;
                    const redBoxW = 0.175;
                    const redBoxH = 0.435;
                    const redBoxL = 0.295;

                    const redShell = new THREE.Mesh(new THREE.BoxGeometry(redBoxW, redBoxH, redBoxL), redSuitcaseMat);
                    redShell.position.set(-0.025, redBoxY, 0);
                    redShell.castShadow = true;
                    redShell.receiveShadow = true;
                    suitcaseGroup.add(redShell);

                    // Faixa central de zíper e frisos vermelhos escuros
                    const redSeam = new THREE.Mesh(new THREE.BoxGeometry(0.022, redBoxH + 0.006, redBoxL + 0.006), redSuitcaseTrimMat);
                    redSeam.position.set(-0.015, redBoxY, 0);
                    suitcaseGroup.add(redSeam);

                    // 4 rodinhas pretas na base da mala vermelha
                    [
                        [-0.075, -0.105],
                        [ 0.025, -0.105],
                        [-0.075,  0.105],
                        [ 0.025,  0.105]
                    ].forEach(([wx, wz]) => {
                        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.022, 14), suitcaseWellMat);
                        wheel.rotation.z = Math.PI / 2;
                        wheel.position.set(wx, redBoxY - redBoxH * 0.5 - 0.018, wz);
                        wheel.castShadow = true;
                        suitcaseGroup.add(wheel);
                    });

                    hand.add(suitcaseGroup);
                }

                return { shoulder, elbow, hand, fingers };
            }

            // ------------------------------------------------------------------------
            // PERNAS, JOELHOS E TORNOZELOS (Proporções l_leg=15*S, l_knee=14*S, l_ankle do glTF)
            // ------------------------------------------------------------------------
            function buildLeg(side) {
                const legMats = getMat('leg');
                const shoeMats = getMat('shoe');

                const femurLen = 15.0 * GLTF_S; // ~0.424m exatos do glTF
                const tibiaLen = 14.0 * GLTF_S; // ~0.396m exatos do glTF

                const hip = new THREE.Group();
                // Offset do quadril no glTF: [-1*S, -3*S, ±4*S] -> X = side * 0.102
                hip.position.set(side * (3.6 * GLTF_S) * PR.hipX, -1.2 * GLTF_S, 0);
                pelvis.add(hip);

                hip.add(createJointSphere((isClothed ? 0.068 : 0.058) * PR.joint * (isTraveler ? 0.86 : jS), legMats.joint, 0.98 * JX(PR.thigh), 1.0, 0.98 * JZ(PR.thigh)));

                const thighProfile = isElder ? [
                    [0.00, 0.088],
                    [0.14, 0.090],
                    [0.45, 0.080],
                    [0.80, 0.068],
                    [1.00, 0.062]
                ] : isClothed ? [
                    [0.00, 0.074],
                    [0.22, 0.078],
                    [0.55, 0.071],
                    [0.88, 0.062],
                    [1.00, 0.057]
                ] : [
                    [0.00, 0.066],
                    [0.20, 0.074],
                    [0.52, 0.065],
                    [0.85, 0.050],
                    [1.00, 0.044]
                ];
                hip.add(sculpt(isTraveler ? TP.thigh : thighProfile, femurLen, legMats.main, 0.96 * PR.thigh[0], 1.04 * PR.thigh[1], undefined, isTraveler ? PT.thigh : (isElder ? PT.suitThigh : (isMother ? PT.pantsThigh : undefined))));

                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);

                knee.add(createJointSphere((isClothed ? 0.055 : 0.045) * PR.joint * (isTraveler ? 0.88 : jS), legMats.joint, 0.95 * JX(PR.calf), 1.0, 1.02 * JZ(PR.calf)));

                const calfProfile = isElder ? [
                    [0.00, 0.062],
                    [0.22, 0.060],
                    [0.55, 0.054],
                    [0.88, 0.052],
                    [0.955, 0.063],
                    [1.00, 0.064]
                ] : isClothed ? [
                    [0.00, 0.056],
                    [0.18, 0.058],
                    [0.45, 0.060],
                    [0.78, 0.056],
                    [0.94, 0.058],
                    [1.00, 0.054]
                ] : [
                    [0.00, 0.043],
                    [0.12, 0.042],
                    [0.32, 0.054],
                    [0.58, 0.042],
                    [0.85, 0.031],
                    [1.00, 0.029]
                ];
                knee.add(sculpt(isTraveler ? TP.calf : calfProfile, tibiaLen + (isTraveler ? 0.022 : 0), legMats.main, 0.95 * PR.calf[0], 1.05 * PR.calf[1], undefined, isTraveler ? PT.calf : (isElder ? PT.suitCalf : (isMother ? PT.pantsCalf : undefined))));


                if (isElder) {
                    const sideSeam = new THREE.Mesh(new THREE.BoxGeometry(0.005, tibiaLen * 0.95, 0.007), suitShadowMat);
                    sideSeam.position.set(side * 0.054 * PR.calf[0], -tibiaLen * 0.5, 0);
                    knee.add(sideSeam);
                }

                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);

                ankle.add(createJointSphere(isTraveler ? 0.004 : 0.032, isTraveler ? jeansMat : shoeMats.joint, 0.95, 0.95, 1.0));   // viajante: tornozelo na cor da calça (sem 'buraco' cinza no tênis)

                const foot = new THREE.Group();
                ankle.add(foot);

                if (isTraveler) {
                    // Tênis: silhueta lateral extrudada (calcanhar, colarinho, peito do pé e bico arredondado)
                    const sideGeo = (shape, width, bev) => {
                        const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelOffset: -bev * 0.8, bevelSegments: 4, curveSegments: 14 });
                        g.translate(0, 0, -width / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals();
                        return g;
                    };
                    const upperShape = new THREE.Shape();
                    upperShape.moveTo(-0.050, -0.044);
                    upperShape.lineTo(-0.056, 0.002);
                    upperShape.quadraticCurveTo(-0.056, 0.022, -0.034, 0.022);
                    upperShape.quadraticCurveTo(-0.004, 0.022, 0.012, 0.008);
                    upperShape.quadraticCurveTo(0.044, -0.004, 0.080, -0.010);
                    upperShape.quadraticCurveTo(0.124, -0.016, 0.136, -0.034);
                    upperShape.lineTo(0.134, -0.044);
                    upperShape.lineTo(-0.050, -0.044);
                    const sneakerUpper = new THREE.Mesh(sideGeo(upperShape, 0.056, 0.014), shoeMats.main);
                    sneakerUpper.castShadow = true;
                    foot.add(sneakerUpper);

                    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 14), soleMat);
                    toeCap.scale.set(1.05, 0.62, 1.15);
                    toeCap.position.set(0, -0.034, 0.110);
                    toeCap.castShadow = true;
                    foot.add(toeCap);

                    const soleShape = new THREE.Shape();
                    soleShape.moveTo(-0.054, -0.070);
                    soleShape.lineTo(0.128, -0.070);
                    soleShape.quadraticCurveTo(0.152, -0.068, 0.150, -0.054);
                    soleShape.quadraticCurveTo(0.148, -0.040, 0.130, -0.040);
                    soleShape.lineTo(-0.048, -0.040);
                    soleShape.quadraticCurveTo(-0.066, -0.042, -0.062, -0.058);
                    soleShape.lineTo(-0.054, -0.070);
                    const sole = new THREE.Mesh(sideGeo(soleShape, 0.064, 0.009), soleMat);
                    sole.castShadow = true;
                    foot.add(sole);
                } else if (isElder) {
                    // Sapato social clássico escuro com bico arredondado e salto baixo
                    const dressUpper = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.038, 0.140), dressShoeMat);
                    dressUpper.position.set(0, -0.024, 0.022);
                    dressUpper.castShadow = true;
                    foot.add(dressUpper);

                    const dressToe = new THREE.Mesh(new THREE.SphereGeometry(0.039, 16, 14), dressShoeMat);
                    dressToe.scale.set(0.96, 0.52, 1.25);
                    dressToe.position.set(0, -0.030, 0.088);
                    dressToe.castShadow = true;
                    foot.add(dressToe);

                    const dressHeel = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.016, 0.055), suitcaseWellMat);
                    dressHeel.position.set(0, -0.042, -0.020);
                    foot.add(dressHeel);
                } else if (isMother) {
                    // Bota feminina marrom de cano curto (ankle boot) fiel à referência
                    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.040, 0.085, 16), motherBootMat);
                    bootShaft.scale.set(0.92, 1, 1.05);
                    bootShaft.position.set(0, 0.012, 0.005);
                    bootShaft.castShadow = true;
                    foot.add(bootShaft);

                    const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.040, 0.135), motherBootMat);
                    bootUpper.position.set(0, -0.024, 0.022);
                    bootUpper.castShadow = true;
                    foot.add(bootUpper);

                    const bootToe = new THREE.Mesh(new THREE.SphereGeometry(0.037, 16, 14), motherBootMat);
                    bootToe.scale.set(0.95, 0.54, 1.22);
                    bootToe.position.set(0, -0.030, 0.086);
                    bootToe.castShadow = true;
                    foot.add(bootToe);

                    const bootHeel = new THREE.Mesh(new THREE.BoxGeometry(0.070, 0.018, 0.052), vintageCornerMat);
                    bootHeel.position.set(0, -0.042, -0.018);
                    foot.add(bootHeel);
                } else {
                    const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, 0.042, 14), shoeMats.main);
                    heel.position.set(0, -0.029, -0.012);
                    heel.castShadow = true;
                    foot.add(heel);

                    const instep = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.032, 0.135), shoeMats.main);
                    instep.position.set(0, -0.030, 0.045);
                    instep.rotation.x = 0.10;
                    instep.castShadow = true;
                    foot.add(instep);

                    const toes = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.020, 14), shoeMats.main);
                    toes.scale.set(1.02, 1.0, 0.85);
                    toes.position.set(0, -0.040, 0.112);
                    toes.castShadow = true;
                    foot.add(toes);
                }

                return { hip, knee, ankle };
            }

            const rightArm = buildArm(-1);
            const leftArm = buildArm(1);
            const rightLeg = buildLeg(-1);
            const leftLeg = buildLeg(1);

            scene.add(root);
            return { root, pelvis, thorax, head, rightArm, leftArm, rightLeg, leftLeg, suitcaseGroup, isTraveler, isElder, isMother };
        }

        // ============================================================================
        // ESTILO DESENHO ANIMADO DO 1º BONECO: sombreamento em faixas (toon) + contorno de tinta (casca invertida)
        // ============================================================================
        const OUTLINE_PX = 1.0;                          // espessura do contorno na tela, em pixels
        const OUTLINE_W = { value: 0.012 };              // espessura em unidades locais (atualizada a cada quadro)
        const OUTLINE_COLOR = 0x1e293b;   // contorno dos passageiros: mesmo azul-marinho técnico dos contornos do avião
        // iluminação "de desenho": a cor mostrada é exatamente a cor do material; só uma sombra dura onde a normal se afasta da luz
        const FLAT_U = { uLight: { value: new THREE.Vector3(0.40, 0.80, 0.45).normalize() }, uThr: { value: 0.10 }, uShade: { value: new THREE.Vector3(0.80, 0.79, 0.83) } };
        function flatMaterial(old) {
            const m = new THREE.MeshBasicMaterial({ color: old.color, map: old.map || null, side: old.side });
            m.onBeforeCompile = (sh) => {
                Object.assign(sh.uniforms, FLAT_U);
                sh.vertexShader = sh.vertexShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vVN;')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVN = normalize(normalMatrix * normal);');
                sh.fragmentShader = sh.fragmentShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vVN;\nuniform vec3 uLight;\nuniform float uThr;\nuniform vec3 uShade;')
                    .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 fN = normalize(vVN) * (gl_FrontFacing ? 1.0 : -1.0);\nfloat bandF = smoothstep(uThr - 0.015, uThr + 0.015, dot(fN, normalize(uLight)));\ndiffuseColor.rgb *= mix(uShade, vec3(1.0), bandF);');
            };
            m.customProgramCacheKey = () => 'flat2tone';
            return m;
        }
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
        function outlineMaterial(mul, col, rich, fadeU) {
            const m = new THREE.MeshBasicMaterial({ color: col === undefined ? OUTLINE_COLOR : col, side: THREE.BackSide });
            m.onBeforeCompile = (sh) => {
                sh.uniforms.uOutlineW = OUTLINE_W;
                if (rich) sh.uniforms.uLightO = FLAT_U.uLight;
                sh.vertexShader = sh.vertexShader
                    .replace('#include <common>', '#include <common>\nattribute vec3 aOutN;\nuniform float uOutlineW;' + (rich ? '\nuniform vec3 uLightO;' : ''))
                    .replace('#include <begin_vertex>', rich
                        ? 'vec3 nvO = normalize(normalMatrix * aOutN);\nfloat shO = clamp(0.5 - 0.5 * dot(nvO, normalize(uLightO)), 0.0, 1.0);\nvec3 transformed = position + normalize(aOutN) * uOutlineW * ' + mul.toFixed(3) + ' * mix(0.62, 1.38, shO);'
                        : 'vec3 transformed = position + normalize(aOutN) * uOutlineW * ' + mul.toFixed(3) + ';');
                addFade(sh, fadeU);
            };
            m.customProgramCacheKey = () => 'inkOutline' + mul + (rich ? 'R' : '') + (fadeU ? 'F' : '');
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
        function stylizeCartoon(root, rich, fadeU) {
            const meshes = [], cache = new Map(), inks = new Map();
            root.traverse(o => { if (o.isMesh) meshes.push(o); });
            const inkFor = (sz, mul, cls) => {
                const key = sz + (rich ? cls : '');
                let m = inks.get(key);
                if (!m) { m = rich ? outlineMaterial(mul, (RICH[cls] || RICH.cloth).out, true, fadeU) : outlineMaterial(mul); inks.set(key, m); }
                return m;
            };
            meshes.forEach(mesh => {
                const old = mesh.material;
                const cls = old && old.userData && old.userData.lit;
                if (old && old.isMeshStandardMaterial) {
                    let fm = cache.get(old);
                    if (!fm) { fm = rich ? richMaterial(old, fadeU) : flatMaterial(old); cache.set(old, fm); }
                    mesh.material = fm;
                }
                mesh.geometry.computeBoundingSphere();
                const r = mesh.geometry.boundingSphere.radius * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
                if (r < 0.009) return;                    // detalhes minúsculos: sem contorno
                const gt = mesh.geometry.type;
                if ((gt === 'SphereGeometry' && r < 0.06) || (gt === 'ConeGeometry' && r < 0.04)) return;   // esferas de junta e mechas espetadas: sem contorno
                ensureOutlineNormals(mesh.geometry);
                const o = new THREE.Mesh(mesh.geometry, r < 0.025 ? inkFor('s', 0.60, cls) : (r < 0.06 ? inkFor('m', 0.85, cls) : inkFor('l', 1.0, cls)));
                o.castShadow = false; o.receiveShadow = false; o.userData.isOutline = true;
                mesh.add(o);
            });
        }

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

        const tvLit = (m, cls) => { m.userData.lit = cls; return m; };   // classe de iluminação/contorno (ver RICH)

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
        function tvSuitcase() {
            const g = new THREE.Group(), K = TV_CASE_K;
            const cm = (c, r) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 }), 'case');
            const navy = cm(0x2d2f3b, 0.4), navyHi = cm(0x40445a, 0.4), dark = cm(0x1b1c25, 0.5), strapM = cm(0x5b606e, 0.5);
            const CW = 0.430 * K, CH = 0.690 * K, CD = 0.225 * K, CR = 0.075 * K, top = -0.052, cy = top - CH / 2;
            const rr = (w, h, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
            const slab = (w, h, r, depth, mat, bev) => {   // placa arredondada: largura ao longo de z, espessura ao longo de x
                const geo = new THREE.ExtrudeGeometry(rr(w, h, r), { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
                geo.translate(0, 0, -depth / 2);
                const m = new THREE.Mesh(geo, mat); m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = true; return m;
            };
            const shell = slab(CW, CH, CR, CD - 0.05 * K, navy, 0.025 * K); shell.position.set(0, cy, 0); g.add(shell);
            const rim = slab(CW + 0.008, CH + 0.008, CR + 0.004, 0.030 * K, navyHi, 0.010 * K); rim.position.set(0, cy, 0); g.add(rim);          // junção das metades da casca
            [-1, 1].forEach(sx => {
                const x = sx * (CD / 2 + 0.002);
                const plate = slab(0.150 * K, 0.060 * K, 0.016 * K, 0.008, dark, 0); plate.position.set(x, top - 0.085 * K, 0); g.add(plate);               // caixa do puxador telescópico
                const bar = slab(0.100 * K, 0.014, 0.006, 0.010, navyHi, 0); bar.position.set(x + sx * 0.003, top - 0.085 * K, 0); g.add(bar);
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


        function createTraveler() {
            const S = GLTF_S;
            const root = new THREE.Group();
            root.scale.setScalar(0.84);
            const mk = (c, cls) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }), cls || 'cloth');
            const skinM = mk(TVC.skin, 'skin'), jeansM = mk(TVC.jeans, 'denim');
            const pm = (P, cls) => tvLit(paintedMat(P), cls);                                              // textura pintada + classe de iluminação
            const dsMat = (P, cls) => { const m = pm(P, cls); m.side = THREE.DoubleSide; return m; };
            const ball = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; };

            // ---- pelve (jeans) --------------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: -0.118, w: 0.118, d: 0.092, c: -0.004, p: 2.3 }, { a: -0.085, w: 0.143, d: 0.100, c: -0.006 }, { a: -0.040, w: 0.150, d: 0.104, c: -0.008 },
                { a: 0.020, w: 0.146, d: 0.100, c: -0.006 }, { a: 0.075, w: 0.139, d: 0.096, c: -0.004 }, { a: 0.118, w: 0.135, d: 0.093, c: -0.003 }
            ], pm(TVT.pelvis, 'denim'), { seg: 36, capStart: true }));

            // ---- tronco (camiseta folgada) -------------------------------------------------------------------------
            const torsoLen = 15.0 * S;
            const thorax = new THREE.Group();
            thorax.position.set(0, 4.0 * S, 0);
            pelvis.add(thorax);
            thorax.add(tvLoft([
                { a: -0.075, w: 0.160, d: 0.113, c: -0.004, p: 2.2 }, { a: -0.045, w: 0.153, d: 0.107, c: -0.005 }, { a: 0.040, w: 0.141, d: 0.099, c: -0.004 },
                { a: 0.140, w: 0.146, d: 0.101, c: -0.002 }, { a: 0.240, w: 0.158, d: 0.106, c: 0 }, { a: 0.315, w: 0.170, d: 0.102, c: 0.002 },
                { a: 0.365, w: 0.167, d: 0.093, c: 0.001 }, { a: 0.395, w: 0.122, d: 0.079, c: 0.003 }, { a: 0.416, w: 0.073, d: 0.068, c: 0.005 }, { a: 0.426, w: 0.068, d: 0.064, c: 0.006 }
            ], dsMat(TVT.shirt, 'cloth'), { seg: 44, rings: 48 }));
            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.0095, 10, 28), mk(TVC.collar, 'cloth'));    // gola careca canelada
            collar.rotation.x = Math.PI / 2 - 0.16; collar.scale.set(1.04, 0.98, 1.0); collar.position.set(0, 0.414, 0.006); collar.castShadow = true;
            thorax.add(collar);
            thorax.add(tvLoft([{ a: 0.34, w: 0.052, d: 0.056, c: 0.004 }, { a: 0.40, w: 0.050, d: 0.053, c: 0.006 }, { a: 0.475, w: 0.049, d: 0.052, c: 0.008 }], pm(TVT.neck, 'skin'), { seg: 20, capEnd: true }));

            // ---- cabeça ----------------------------------------------------------------------------------------------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            head.scale.setScalar(1.16);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), pm(TVT.face, 'skin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            [-1, 1].forEach(s => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), pm(PT.earT, 'skin'));
                ear.scale.set(0.36, 1.18, 0.80);
                ear.position.set(s * 0.0715, 0.116, -0.006);
                ear.rotation.set(0.08, s * 0.18, s * -0.10);
                head.add(ear);
            });
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
                const hair = new THREE.Mesh(hg, pm(TVT.hair, 'hair'));
                hair.castShadow = true;
                head.add(hair);

                // mechas em 3D (cones achatados e curvos que seguem a superfície do crânio): franja varrida para o lado, costeletas e pontas na nuca
                const hc = new THREE.Vector3(0, HEAD.cy, HEAD.cz);
                const lockMats = [mk(TVC.hairHi, 'hair'), mk(TVC.hair, 'hair'), mk(TVC.hairSh, 'hair')];
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
                ], dsMat(TVT.sleeve, 'cloth'), { seg: 28, capStart: true }));
                shoulder.add(tvLoft([                                                                    // braço nu
                    { a: -0.090, w: 0.041, d: 0.043 }, { a: -0.160, w: 0.041, d: 0.043 }, { a: -0.240, w: 0.037, d: 0.039 }, { a: -0.292, w: 0.034, d: 0.036 }
                ], pm(TVT.upperArm, 'skin'), { seg: 22 }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(ball(0.037, skinM));
                elbow.add(tvLoft([
                    { a: 0.012, w: 0.036, d: 0.038 }, { a: -0.060, w: 0.041, d: 0.043 }, { a: -0.140, w: 0.035, d: 0.036 }, { a: -0.220, w: 0.027, d: 0.029 }, { a: -0.264, w: 0.025, d: 0.027 }
                ], pm(TVT.forearm, 'skin'), { seg: 22 }));
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
                hip.add(ball(0.074, jeansM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0.030, w: 0.070, d: 0.078 }, { a: -0.020, w: 0.086, d: 0.090 }, { a: -0.120, w: 0.084, d: 0.088 },
                    { a: -0.260, w: 0.074, d: 0.078 }, { a: -0.360, w: 0.066, d: 0.070 }, { a: -femurLen, w: 0.063, d: 0.067 }
                ], pm(TVT.thigh, 'denim'), { seg: 28 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(ball(0.061, jeansM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0.010, w: 0.062, d: 0.066 }, { a: -0.060, w: 0.062, d: 0.068 }, { a: -0.160, w: 0.060, d: 0.066 }, { a: -0.300, w: 0.054, d: 0.058 },
                    { a: -0.375, w: 0.056, d: 0.060, c: -0.004 }, { a: -0.402, w: 0.059, d: 0.063, c: -0.010 }, { a: -tibiaLen - 0.030, w: 0.060, d: 0.064, c: -0.012 }
                ], dsMat(TVT.calf, 'denim'), { seg: 28 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                // tênis: cabedal cinza (biqueira e cadarço pintados) sobre sola branca
                foot.add(tvLoft([
                    { a: -0.060, w: 0.031, d: 0.036, c: -0.036 }, { a: -0.040, w: 0.039, d: 0.046, c: -0.030 }, { a: -0.005, w: 0.040, d: 0.040, c: -0.034 },
                    { a: 0.040, w: 0.043, d: 0.030, c: -0.043 }, { a: 0.095, w: 0.047, d: 0.025, c: -0.050 }, { a: 0.150, w: 0.042, d: 0.021, c: -0.056 }, { a: 0.178, w: 0.027, d: 0.015, c: -0.060 }
                ], pm(TVT.shoe, 'shoe'), { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                foot.add(tvLoft([
                    { a: -0.066, w: 0.034, d: 0.016, c: -0.080, p: 2.6 }, { a: -0.045, w: 0.042, d: 0.017, c: -0.080 }, { a: 0.010, w: 0.046, d: 0.017, c: -0.080 },
                    { a: 0.090, w: 0.0495, d: 0.017, c: -0.080 }, { a: 0.150, w: 0.0445, d: 0.017, c: -0.080 }, { a: 0.178, w: 0.031, d: 0.015, c: -0.080 }, { a: 0.188, w: 0.014, d: 0.010, c: -0.080 }
                ], mk(TVC.sole, 'shoe'), { axis: 'z', seg: 24, capStart: true, capEnd: true }));
                return { hip, knee, ankle };
            }

            const rightArm = buildArm(-1);
            const leftArm = buildArm(1);
            const rightLeg = buildLeg(-1);
            const leftLeg = buildLeg(1);
            scene.add(root);
            return { root, pelvis, thorax, head, rightArm, leftArm, rightLeg, leftLeg, suitcaseGroup, isTraveler: true, isElder: false, isMother: false };
        }

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
            const rr = (w, h, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
            const shellGeo = new THREE.ExtrudeGeometry(rr(L - 2 * bev, H - 2 * bev, 0.03), { depth: T - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
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
            const mk = (c, cls) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }), cls);
            const pm = (P, cls) => tvLit(paintedMat(P), cls);
            const dsm = (P, cls) => { const m = pm(P, cls); m.side = THREE.DoubleSide; return m; };
            const skinM = mk(ELD.skin, 'oldskin'), suitM = mk(ELD.suit, 'suit'), shirtM = mk(ELD.shirt, 'white');
            const ball = tvBall;

            // ---- pelve (calça) ---------------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: 0.113, w: 0.140, d: 0.098, c: -0.003, p: 2.3 }, { a: 0.082, w: 0.148, d: 0.101 }, { a: 0.0, w: 0.153, d: 0.104, c: -0.006 },
                { a: -0.06, w: 0.146, d: 0.100 }, { a: -0.113, w: 0.118, d: 0.086 }
            ], dsm(ETX.pelvis, 'suit'), { seg: 36, capEnd: true }));

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
            ], dsm(ETX.torso, 'suit'), { seg: 48, rings: 56 }));
            // gola do paletó (atrás do pescoço), colarinho da camisa e pescoço
            thorax.add(tvLoft([{ a: 0.440, w: 0.074, d: 0.060, c: -0.014 }, { a: 0.420, w: 0.080, d: 0.066, c: -0.012 }, { a: 0.396, w: 0.098, d: 0.074, c: -0.008 }], (() => { const m = suitM.clone(); m.side = THREE.DoubleSide; m.userData.lit = 'suit'; return m; })(), { seg: 28 }));
            thorax.add(tvLoft([{ a: 0.446, w: 0.056, d: 0.056, c: 0.006 }, { a: 0.424, w: 0.060, d: 0.060, c: 0.005 }, { a: 0.400, w: 0.064, d: 0.064, c: 0.004 }], (() => { const m = shirtM.clone(); m.side = THREE.DoubleSide; m.userData.lit = 'white'; return m; })(), { seg: 28 }));
            thorax.add(tvLoft([{ a: 0.34, w: 0.052, d: 0.056, c: 0.004 }, { a: 0.40, w: 0.050, d: 0.053, c: 0.006 }, { a: 0.475, w: 0.049, d: 0.052, c: 0.008 }], skinM, { seg: 20, capEnd: true }));

            // ---- cabeça (crânio com anatomia + rosto pintado + nariz + orelhas + cabelo grisalho em ferradura) ----------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), pm(PT.faceE, 'oldskin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            {   // nariz: ponte que parte da glabela até a ponta arredondada, com as asas
                const nRoot = new THREE.Vector3(0, 0.136, 0.092), nTip = new THREE.Vector3(0, 0.098, 0.107), nd = nTip.clone().sub(nRoot);
                const bridge = new THREE.Mesh(new THREE.ConeGeometry(0.0125, nd.length(), 8), skinM);
                bridge.position.copy(nRoot).add(nTip).multiplyScalar(0.5);
                bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nd.clone().negate().normalize());
                bridge.scale.set(1.0, 1, 0.95);
                head.add(bridge);
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0118, 14, 12), skinM);
                tip.scale.set(1.0, 0.85, 1.0); tip.position.set(0, 0.0985, 0.1005); head.add(tip);
                [-1, 1].forEach(sd => { const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 10, 10), skinM); wing.scale.set(0.9, 1.0, 0.85); wing.position.set(sd * 0.0112, 0.0995, 0.0955); head.add(wing); });
            }
            [-1, 1].forEach(sd => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), pm(PT.earE, 'oldskin'));
                ear.scale.set(0.36, 1.18, 0.80);
                ear.position.set(sd * 0.0715, 0.116, -0.006);
                ear.rotation.set(0.08, sd * 0.18, sd * -0.10);
                head.add(ear);
            });
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
                const elderHair = new THREE.Mesh(hg, pm(PT.hairE, 'grey'));
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
                shoulder.add(ball(0.040, suitM, 1.1, 0.85, 1.1));
                shoulder.add(tvLoft([
                    { a: 0, w: 0.040, d: 0.044 }, { a: -0.030, w: 0.054, d: 0.057 }, { a: -0.120, w: 0.056, d: 0.057 }, { a: -0.220, w: 0.051, d: 0.053 }, { a: -upperArmLen, w: 0.047, d: 0.050 }
                ], dsm(ETX.sleeve, 'suit'), { seg: 28, capStart: true }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(ball(0.047, suitM));
                elbow.add(tvLoft([
                    { a: 0, w: 0.047, d: 0.050 }, { a: -0.060, w: 0.047, d: 0.049 }, { a: -0.160, w: 0.043, d: 0.045 }, { a: -(forearmLen - 0.012), w: 0.039, d: 0.041 }
                ], dsm(ETX.forearm, 'suit'), { seg: 26 }));
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
                hip.add(ball(0.080, suitM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0, w: 0.088, d: 0.094 }, { a: -0.050, w: 0.089, d: 0.095 }, { a: -0.120, w: 0.087, d: 0.092 }, { a: -0.260, w: 0.076, d: 0.081 },
                    { a: -0.350, w: 0.069, d: 0.073 }, { a: -femurLen, w: 0.066, d: 0.070 }
                ], dsm(ETX.thigh, 'suit'), { seg: 30 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(ball(0.063, suitM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0, w: 0.066, d: 0.070 }, { a: -0.060, w: 0.064, d: 0.070 }, { a: -0.160, w: 0.060, d: 0.066 }, { a: -0.300, w: 0.055, d: 0.060 },
                    { a: -0.360, w: 0.056, d: 0.061 }, { a: -tibiaLen, w: 0.060, d: 0.064 }
                ], dsm(ETX.calf, 'suit'), { seg: 30 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                const shoeM = mk(ELD.shoe, 'dark'), soleM = mk(ELD.sole, 'dark');
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
            const rr = (w, h, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
            const slab = (w, h, r, depth, mat, bev) => {
                const geo = new THREE.ExtrudeGeometry(rr(w, h, r), { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
                geo.translate(0, 0, -depth / 2);
                const m = new THREE.Mesh(geo, mat); m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = true; return m;
            };
            const shell = slab(CW, CH, CR, CD - 0.04, red, 0.02); shell.position.set(0, cy, 0); body.add(shell);
            const seam = slab(CW + 0.006, CH + 0.006, CR + 0.003, 0.026, redD, 0.008); seam.position.set(0, cy, 0); body.add(seam);                   // faixa do zíper ao redor
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
            const mk = (c, cls) => tvLit(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }), cls);
            const pm = (P, cls) => tvLit(paintedMat(P), cls);
            const dsm = (P, cls) => { const m = pm(P, cls); m.side = THREE.DoubleSide; return m; };
            const skinM = mk(MOM.skin, 'skin'), coatM = mk(MOM.coat, 'cloth'), pantsM = mk(MOM.pants, 'cloth');
            const ball = tvBall;

            // ---- pelve (calça justa) -------------------------------------------------------------------------------
            const pelvis = new THREE.Group();
            pelvis.position.y = 33.6 * S;
            root.add(pelvis);
            pelvis.add(tvLoft([
                { a: 0.113, w: 0.128, d: 0.092, c: -0.003, p: 2.3 }, { a: 0.082, w: 0.138, d: 0.096 }, { a: 0.0, w: 0.148, d: 0.102, c: -0.006 },
                { a: -0.06, w: 0.143, d: 0.099 }, { a: -0.113, w: 0.116, d: 0.086 }
            ], dsm(MTX.pelvis, 'cloth'), { seg: 36, capEnd: true }));

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
            ], dsm(MTX.torso, 'cloth'), { seg: 64, rings: 72, skip: (u, v) => { const y = 1 - v, du = Math.min(u, 1 - u); return y > MOM_OPEN.y0 && du < MOM_OPEN.hw(y); } }));
            thorax.add(tvLoft([{ a: 0.440, w: 0.070, d: 0.058, c: -0.014 }, { a: 0.420, w: 0.076, d: 0.064, c: -0.012 }, { a: 0.396, w: 0.094, d: 0.072, c: -0.008 }], (() => { const m = mk(MOM.coatD, 'cloth'); m.side = THREE.DoubleSide; return m; })(), { seg: 28 }));   // gola do casaco
            thorax.add(tvLoft([{ a: 0.34, w: 0.050, d: 0.054, c: 0.004 }, { a: 0.40, w: 0.048, d: 0.051, c: 0.006 }, { a: 0.455, w: 0.045, d: 0.048, c: 0.010 }, { a: 0.520, w: 0.040, d: 0.042, c: 0.016 }], skinM, { seg: 20, capEnd: true }));

            // ---- cabeça --------------------------------------------------------------------------------------------
            const head = new THREE.Group();
            head.position.set(0, torsoLen + 0.012, 0.008);
            thorax.add(head);
            const cranium = new THREE.Mesh(buildHeadGeometry(), pm(PT.faceM, 'skin'));
            cranium.castShadow = true; cranium.receiveShadow = true;
            head.add(cranium);
            {   // nariz
                const nRoot = new THREE.Vector3(0, 0.136, 0.092), nTip = new THREE.Vector3(0, 0.098, 0.107), nd = nTip.clone().sub(nRoot);
                const bridge = new THREE.Mesh(new THREE.ConeGeometry(0.0115, nd.length(), 8), skinM);
                bridge.position.copy(nRoot).add(nTip).multiplyScalar(0.5);
                bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nd.clone().negate().normalize());
                bridge.scale.set(1.0, 1, 0.95); head.add(bridge);
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0108, 14, 12), skinM);
                tip.scale.set(1.0, 0.85, 1.0); tip.position.set(0, 0.0985, 0.1005); head.add(tip);
                [-1, 1].forEach(sd => { const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0074, 10, 10), skinM); wing.scale.set(0.9, 1.0, 0.85); wing.position.set(sd * 0.0102, 0.0995, 0.0955); head.add(wing); });
            }
            // ---- cabelo longo e liso (orelhas cobertas pelo cabelo): couro cabeludo + duas cortinas laterais + massa das costas -------------------
            // Coordenadas da cabeça (origem no pivô do pescoço). O grupo fica no tronco; tvHairRig faz cada vértice seguir a cabeça conforme o peso.
            const hairGroup = new THREE.Group();
            hairGroup.position.copy(head.position);
            thorax.add(hairGroup);
            const hairM = pm(MTX.hair, 'hair'), hairParts = [];
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
                shoulder.add(ball(0.040, coatM, 1.1, 0.85, 1.1));
                shoulder.add(tvLoft([
                    { a: 0, w: 0.040, d: 0.044 }, { a: -0.030, w: 0.053, d: 0.056 }, { a: -0.120, w: 0.053, d: 0.054 }, { a: -0.220, w: 0.048, d: 0.050 }, { a: -upperArmLen, w: 0.045, d: 0.047 }
                ], dsm(MTX.sleeve, 'cloth'), { seg: 28, capStart: true }));
                const elbow = new THREE.Group();
                elbow.position.y = -upperArmLen;
                shoulder.add(elbow);
                elbow.add(ball(0.045, coatM));
                elbow.add(tvLoft([
                    { a: 0, w: 0.046, d: 0.048 }, { a: -0.060, w: 0.046, d: 0.047 }, { a: -0.160, w: 0.042, d: 0.044 }, { a: -forearmLen, w: 0.037, d: 0.039 }
                ], dsm(MTX.forearm, 'cloth'), { seg: 26 }));
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
                hip.add(ball(0.074, pantsM, 1, 1, 1.05));
                hip.add(tvLoft([
                    { a: 0, w: 0.080, d: 0.088 }, { a: -0.050, w: 0.082, d: 0.090 }, { a: -0.120, w: 0.080, d: 0.086 }, { a: -0.260, w: 0.069, d: 0.074 },
                    { a: -0.350, w: 0.060, d: 0.065 }, { a: -femurLen, w: 0.056, d: 0.060 }
                ], dsm(MTX.thigh, 'cloth'), { seg: 30 }));
                const knee = new THREE.Group();
                knee.position.y = -femurLen;
                hip.add(knee);
                knee.add(ball(0.056, pantsM, 1, 1, 1.05));
                knee.add(tvLoft([
                    { a: 0, w: 0.056, d: 0.060 }, { a: -0.060, w: 0.056, d: 0.063 }, { a: -0.160, w: 0.053, d: 0.059 }, { a: -0.300, w: 0.048, d: 0.053 },
                    { a: -0.360, w: 0.049, d: 0.054 }, { a: -tibiaLen, w: 0.052, d: 0.056 }
                ], dsm(MTX.calf, 'cloth'), { seg: 30 }));
                const ankle = new THREE.Group();
                ankle.position.y = -tibiaLen;
                knee.add(ankle);
                const foot = new THREE.Group();
                ankle.add(foot);
                const bootM = mk(MOM.boot, 'leather'), soleM = mk(MOM.bootD, 'dark');
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

        const rig1 = createTraveler();  // Personagem 1: Viajante jovem (camiseta verde e mala de rodinhas)
        const rig2 = createElder();     // Personagem 2: Senhor de idade (terno bege e maleta marrom)
        rig2.root.visible = false;
        const rig3 = createMother();    // Personagem 3: Mulher com bebê no colo e mala vermelha
        rig3.root.visible = false;
        [rig1, rig2, rig3].forEach(r => {
            r.fadeU = { value: 1 }; r.castOn = true; r.casters = [];
            r.root.traverse(o => { if (o.isMesh && o.castShadow) r.casters.push(o); });
        });
        stylizeCartoon(rig1.root, true, rig1.fadeU);   // viajante: iluminação em faixas com sombra colorida + contorno de espessura variável
        // (os três bonecos usam a mesma iluminação em faixas e o mesmo contorno de espessura variável)
        stylizeCartoon(rig2.root, true, rig2.fadeU);
        stylizeCartoon(rig3.root, true, rig3.fadeU);
        // Sombra de contato: elipse escura e achatada no piso, sob os pés de cada passageiro. É uma forma fixa (sem luz), em duas camadas
        // como num desenho vetorial: um anel claro e um miolo mais escuro. Fica presa ao boneco, então acompanha a caminhada e o dissolve.
        const CONTACT_SHADOW = { r: 0.25, coreK: 0.58, color: 0x1b2429, opacity: 0.20, coreOpacity: 0.24 };   // raio em unidades do mundo
        const contactGeo = new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2);   // círculo no piso: a câmera isométrica o mostra como elipse achatada
        [rig1, rig2, rig3].forEach(r => {
            r.contact = [[1, CONTACT_SHADOW.opacity], [CONTACT_SHADOW.coreK, CONTACT_SHADOW.coreOpacity]].map(([k, op]) => {
                const m = new THREE.Mesh(contactGeo, new THREE.MeshBasicMaterial({ color: CONTACT_SHADOW.color, transparent: true, opacity: op, depthWrite: false }));
                m.scale.set(CONTACT_SHADOW.r * k / r.root.scale.x, 1, CONTACT_SHADOW.r * k / r.root.scale.z);
                m.position.y = 0.004 / r.root.scale.y;   // logo acima do piso
                m.renderOrder = 1;                       // depois da sombra projetada do chão
                m.userData.baseOpacity = op;
                r.root.add(m);
                return m;
            });
        });
        // ponto um pouco acima da cabeça de cada passageiro (altura medida na pose parada), em coordenadas do SVG: ponta do balão com o nome
        [rig1, rig2, rig3].forEach(r => { r.root.updateMatrixWorld(true); r.labelH = new THREE.Box3().setFromObject(r.root).max.y + 0.07; });
        function labelAnchors() {
            return [rig1, rig2, rig3].map(r => {
                if (!r.root.visible || r.fadeU.value <= 0) return null;   // ainda não entrou na passarela
                const p = r.root.position.clone(); p.y += r.labelH; p.project(camera);
                return { x: AV.x0 + (p.x + 1) / 2 * AV.w, y: AV.y0 + (1 - p.y) / 2 * AV.h, a: r.fadeU.value };
            });
        }
        function paxSetFade(rig, f) {
            rig.fadeU.value = f;
            const on = f > 0.5;
            if (on !== rig.castOn) { rig.castOn = on; rig.casters.forEach(m => { m.castShadow = on; }); }
            rig.contact.forEach(m => { m.material.opacity = m.userData.baseOpacity * f; });
        }

        // ============================================================================
        // ANIMAÇÃO DOS 3 BONECOS (CADÊNCIAS INDEPENDENTES E SPAWNS SEQUENCIAIS)
        // ============================================================================
        // comprimento do passo (unidades do mundo) ≈ alcance das pernas na animação, para os pés não deslizarem no piso
        const PAX_STRIDE = 0.65;
        const TOTAL_STEPS_1 = Math.max(1, Math.round(TOTAL_PATH_LEN / PAX_STRIDE)); // passos de A até x (7)
        const STEP_LENGTH = TOTAL_PATH_LEN / TOTAL_STEPS_1;

        // passos mais lentos: a caminhada ocupa o zoom da passarela (a mulher para ~1 s antes de a câmera abrir, em ZOOM_END, e gira enquanto ela abre)
        const PAX_SLOW = 1.4;
        const STEP_DURATION_1 = 0.52 * PAX_SLOW;        // Boneco 1: passo calmo
        const STEP_DURATION_2 = 0.62 * PAX_SLOW;        // Boneco 2: o senhor ainda é o mais calmo, mas anda um pouco mais rápido que antes (0,70)
        const STEP_DURATION_3 = 0.52 * PAX_SLOW;        // Boneco 3: passo calmo

        const TOTAL_WALK_TIME_1 = TOTAL_STEPS_1 * STEP_DURATION_1;

        const PAUSE_DURATION = 0.10;                    // Parada imediata antes de virar
        const TURN_DURATION = 0.95;                     // Giro anti-horário de 90° até 3/4 de frente
        const ELDER_DELAY = 2.0;                        // o senhor (e, por consequência, a mulher) entra 2 s depois de o viajante passar por z
        const MOTHER_DELAY = 2.0;                       // a mulher espera esse tempo a mais antes de entrar na passarela
        const MOTHER_PAUSE = 0.6;                       // ela para por completo e fica parada esse tempo antes de girar o corpo

        // O Boneco 1 atinge o ponto z e, depois de ELDER_DELAY -> Surge Boneco 2
        const SPAWN_TIME_2 = (LEN_AZ / TOTAL_PATH_LEN) * TOTAL_WALK_TIME_1 + ELDER_DELAY;
        
        // Distância e tempo do Boneco 2 (de A até parar em y)
        const DIST_AY = LEN_AZ + LEN_ZY;
        const TOTAL_STEPS_2 = DIST_AY / STEP_LENGTH;
        const TOTAL_WALK_TIME_2 = TOTAL_STEPS_2 * STEP_DURATION_2;

        // O Boneco 2 atinge o ponto z e, depois de uma pausa curta (MOTHER_DELAY) -> Surge Boneco 3
        const SPAWN_TIME_3 = SPAWN_TIME_2 + (LEN_AZ / DIST_AY) * TOTAL_WALK_TIME_2 + MOTHER_DELAY;

        // Distância e tempo do Boneco 3 (de A até parar em z)
        const TOTAL_STEPS_3 = LEN_AZ / STEP_LENGTH;
        const TOTAL_WALK_TIME_3 = TOTAL_STEPS_3 * STEP_DURATION_3;

        const MAX_ANIMATION_TIME = Math.max(
            TOTAL_WALK_TIME_1 + PAUSE_DURATION + TURN_DURATION,
            SPAWN_TIME_2 + TOTAL_WALK_TIME_2 + PAUSE_DURATION + TURN_DURATION,
            SPAWN_TIME_3 + TOTAL_WALK_TIME_3 + MOTHER_PAUSE + TURN_DURATION
        );

        let elapsed = 0;

        function smoothstep(min, max, value) {
            const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
            return x * x * (3 - 2 * x);
        }

        function resetWalk() {
            elapsed = 0;
            rig2.root.visible = false;
            rig3.root.visible = false;
        }


        function animateCharacter(targetRig, localTime, totalSteps, targetDist, shouldTurn, stepDuration, pauseDuration = PAUSE_DURATION) {
            const totalWalkTime = totalSteps * stepDuration;
            // velocidade constante e, no fim, desaceleração suave até parar (~0,7 s), sem mudar o ponto nem a hora de chegada
            const tLin = Math.min(localTime / totalWalkTime, 1.0), dDec = Math.min(0.4, 0.7 / totalWalkTime), kLin = 1 / (1 - dDec / 2), p0 = 1 - dDec;
            const walkProgress = tLin <= p0 ? kLin * tLin : Math.min(1, kLin * (tLin - (tLin - p0) * (tLin - p0) / (2 * dDec)));
            const fadeIn = smoothstep(0, 0.35, localTime);
            const fadeOut = 1.0 - smoothstep(totalWalkTime - 0.45, totalWalkTime, localTime);
            const walkAmp = fadeIn * fadeOut;

            const stepCountProgress = walkProgress * totalSteps;
            const phaseAngle = stepCountProgress * Math.PI;

            // Velocidade instantânea sutilmente modulada a cada passo (impulso humano real)
            const stridePulse = Math.sin(phaseAngle * 2) * 0.012 * walkAmp;
            const currentDist = Math.max(0, Math.min(targetDist, walkProgress * targetDist + stridePulse));
            const worldPos = getPathWorldPosition(currentDist);
            targetRig.root.position.copy(worldPos);

            // Inclinação constante de subida da rampa
            const inclineFactor = 0.34 * walkAmp;

            // Giro anti-horário ao final da caminhada
            let turnProgress = 0;
            let turnActive = 0;
            let turnRaw = 0;
            if (shouldTurn) {
                const turnStartTime = totalWalkTime + pauseDuration;
                turnProgress = smoothstep(turnStartTime, turnStartTime + TURN_DURATION, localTime);
                turnRaw = Math.max(0, Math.min(1, (localTime - turnStartTime) / TURN_DURATION));
                turnActive = Math.sin(turnRaw * Math.PI);
            }

            targetRig.root.rotation.y = START_ANGLE + turnProgress * TURN_DELTA;

            const turnStepWave = Math.sin(turnRaw * Math.PI * 2);
            const lTurnLift = Math.max(0, turnStepWave) * turnActive;
            const rTurnLift = Math.max(0, -turnStepWave) * turnActive;

            // --- BIOMECÂNICA 6-DOF DA PELVE E COLUNA (Baseada no Mannequin.js) ---
            const basePelvisY = 33.6 * GLTF_S;
            // Duplo pico vertical por ciclo: absorção no duplo apoio e elevação na passagem média
            const walkBounce = (Math.abs(Math.sin(phaseAngle)) * 0.028 - Math.cos(phaseAngle * 2) * 0.007) * walkAmp;
            const turnBounce = (lTurnLift + rTurnLift) * 0.018;
            targetRig.pelvis.position.y = basePelvisY - inclineFactor * 0.022 + walkBounce + turnBounce;

            // Deslocamento lateral de transferência de peso entre o pé direito e o esquerdo
            targetRig.pelvis.position.x = -Math.cos(phaseAngle) * 0.016 * walkAmp + turnStepWave * 0.012 * turnActive;

            // Rotação pélvica transversal (Y), queda pélvica lateral / Trendelenburg (Z) e inclinação anterior (X)
            targetRig.pelvis.rotation.y = Math.sin(phaseAngle) * 0.115 * walkAmp - turnStepWave * 0.07 * turnActive;
            targetRig.pelvis.rotation.z = Math.cos(phaseAngle) * 0.048 * walkAmp;
            targetRig.pelvis.rotation.x = (-0.035 + Math.abs(Math.sin(phaseAngle)) * 0.025) * walkAmp;

            // Contra-rotação torácica, compensação lateral de ombros e antecipação do giro pela cabeça/tronco
            const leadTurn = Math.sin(Math.pow(turnRaw, 0.75) * Math.PI);
            targetRig.thorax.rotation.y = -Math.sin(phaseAngle) * 0.145 * walkAmp + 0.15 * leadTurn;
            targetRig.thorax.rotation.z = -Math.cos(phaseAngle) * 0.042 * walkAmp - 0.025 * turnActive;
            targetRig.thorax.rotation.x = 0.045 * walkAmp + inclineFactor * 0.095 + Math.cos(phaseAngle * 2) * 0.012 * walkAmp;

            // Estabilização da cabeça (reflexo vestíbulo-ocular mantém o olhar nivelado e antecipa o giro)
            targetRig.head.rotation.x = -inclineFactor * 0.055 - Math.cos(phaseAngle * 2) * 0.010 * walkAmp;
            targetRig.head.rotation.y = 0.04 * Math.sin(phaseAngle) * walkAmp + 0.22 * leadTurn;
            targetRig.head.rotation.z = 0.018 * Math.cos(phaseAngle) * walkAmp;

            // --- PERNAS: CURVA BIOMECÂNICA DE QUADRIL, JOELHO DE DUPLO PICO E TORNOZELO (HEEL-TO-TOE) ---
            function computeLegGait(theta, turnLift) {
                const s = Math.sin(theta);
                const c = Math.cos(theta);

                // Quadril: extensão máxima no fim do apoio e flexão rápida no balanço
                const hipFlex = (-s * 0.44 - Math.max(0, s) * inclineFactor * 0.18 - 0.04 * c) * walkAmp - turnLift * 0.24;

                // Joelho: pico principal no balanço (clearance) + flexão secundária de absorção de impacto no apoio
                const swingKnee = Math.pow(Math.max(0, c), 1.35) * 0.78;
                const stanceAbsorption = Math.max(0, Math.sin(theta - 0.35)) * Math.max(0, -c) * 0.22;
                const inclineKnee = Math.max(0, s) * inclineFactor * 0.20;
                const kneeFlex = (swingKnee + stanceAbsorption + 0.05 + inclineKnee) * walkAmp + turnLift * 0.52;

                // Tornozelo: dorsiflexão no toque do calcanhar, flexão plantar no impulso (toe-off) e elevação da ponta no balanço
                const toeOffPush = Math.max(0, -s) * Math.max(0, c + 0.2) * 0.28;
                const swingDorsi = Math.max(0, c) * 0.18;
                const ankleFlex = (s * 0.16 - toeOffPush + swingDorsi - inclineFactor * 0.09) * walkAmp - turnLift * 0.16;

                return { hipFlex, kneeFlex, ankleFlex };
            }

            const rGait = computeLegGait(phaseAngle, rTurnLift);
            const lGait = computeLegGait(phaseAngle + Math.PI, lTurnLift);

            targetRig.rightLeg.hip.rotation.x = rGait.hipFlex;
            targetRig.leftLeg.hip.rotation.x = lGait.hipFlex;

            // Ângulo femoral natural do glTF (~2° valgo em pé, compensado durante a passada)
            targetRig.rightLeg.hip.rotation.z = -0.022 - Math.cos(phaseAngle) * 0.025 * walkAmp;
            targetRig.leftLeg.hip.rotation.z = 0.022 - Math.cos(phaseAngle) * 0.025 * walkAmp;

            targetRig.rightLeg.knee.rotation.x = rGait.kneeFlex;
            targetRig.leftLeg.knee.rotation.x = lGait.kneeFlex;

            targetRig.rightLeg.ankle.rotation.x = rGait.ankleFlex;
            targetRig.leftLeg.ankle.rotation.x = lGait.ankleFlex;

            // --- BRAÇOS, PUNHOS E FALANGES ARTICULADAS ---
            const rWave = Math.sin(phaseAngle);
            const lWave = Math.sin(phaseAngle + Math.PI);

            targetRig.rightArm.shoulder.rotation.x = lWave * 0.34 * walkAmp + rTurnLift * 0.10;
            targetRig.rightArm.shoulder.rotation.y = 0;
            // Abdução natural de repouso do glTF (~7° = 0.12 rad)
            targetRig.rightArm.shoulder.rotation.z = -0.11 - 0.03 * turnActive;

            targetRig.leftArm.shoulder.rotation.x = rWave * 0.34 * walkAmp - lTurnLift * 0.10;
            targetRig.leftArm.shoulder.rotation.y = 0;
            targetRig.leftArm.shoulder.rotation.z = 0.11 + 0.03 * turnActive;

            // Atraso de fase no cotovelo e punho (pêndulo duplo natural)
            const lDelayed = Math.sin(phaseAngle + Math.PI - 0.35);
            const rDelayed = Math.sin(phaseAngle - 0.35);
            targetRig.rightArm.elbow.rotation.x = -(0.24 + Math.max(0, -lDelayed) * 0.28) * walkAmp - 0.12 * (1 - walkAmp) - 0.08 * turnActive;
            targetRig.leftArm.elbow.rotation.x = -(0.24 + Math.max(0, -rDelayed) * 0.28) * walkAmp - 0.12 * (1 - walkAmp) - 0.08 * turnActive;
            targetRig.leftArm.elbow.rotation.z = 0;
            targetRig.leftArm.hand.rotation.set(0, 0, rDelayed * 0.08 * walkAmp);

            // Animação sutil das 3 falanges da mão esquerda livre
            if (targetRig.leftArm.fingers) {
                targetRig.leftArm.fingers.forEach((f, idx) => {
                    if (!f.isThumb) {
                        const curl = -0.17 - 0.06 * Math.max(0, -rDelayed) * walkAmp - idx * 0.02;
                        f.prox.rotation.x = f.spread;
                        f.prox.rotation.z = curl;
                        f.mid.rotation.z = curl * 1.25;
                        f.tip.rotation.z = curl * 0.90;
                    }
                });
            }

            // Cinemática específica para o Viajante (Boneco 1) fiel às duas poses da referência
            if (targetRig.isTraveler) {
                targetRig.rightArm.shoulder.rotation.x = -0.14 - 0.06 * Math.sin(phaseAngle) * walkAmp;
                targetRig.rightArm.shoulder.rotation.z = -0.215;     // braço levemente afastado do corpo: a mala (alça agora dentro do punho) não atravessa a perna
                targetRig.rightArm.elbow.rotation.x = -0.18;

                if (targetRig.suitcaseGroup) {
                    targetRig.suitcaseGroup.rotation.x = THREE.MathUtils.lerp(0.24, 0.32, turnProgress);
                    targetRig.suitcaseGroup.rotation.y = THREE.MathUtils.lerp(0.06, -0.18, turnProgress);
                    targetRig.suitcaseGroup.rotation.z = THREE.MathUtils.lerp(0.04, 0.10, turnProgress);
                }

                // Ao chegar em X e virar de frente: reproduz a pose exata da ilustração da direita com dedos abertos no rosto
                if (turnProgress > 0) {
                    targetRig.pelvis.position.y = THREE.MathUtils.lerp(targetRig.pelvis.position.y, 0.87, turnProgress);
                    targetRig.rightLeg.hip.rotation.x = THREE.MathUtils.lerp(targetRig.rightLeg.hip.rotation.x, -0.16, turnProgress);
                    targetRig.leftLeg.hip.rotation.x = THREE.MathUtils.lerp(targetRig.leftLeg.hip.rotation.x, -0.24, turnProgress);
                    targetRig.rightLeg.hip.rotation.z = THREE.MathUtils.lerp(targetRig.rightLeg.hip.rotation.z, -0.03, turnProgress);
                    targetRig.leftLeg.hip.rotation.z = THREE.MathUtils.lerp(targetRig.leftLeg.hip.rotation.z, 0.30, turnProgress);

                    targetRig.rightLeg.knee.rotation.x = THREE.MathUtils.lerp(targetRig.rightLeg.knee.rotation.x, 0.42, turnProgress);
                    targetRig.leftLeg.knee.rotation.x = THREE.MathUtils.lerp(targetRig.leftLeg.knee.rotation.x, 0.55, turnProgress);
                    targetRig.rightLeg.ankle.rotation.x = THREE.MathUtils.lerp(targetRig.rightLeg.ankle.rotation.x, -0.12, turnProgress);
                    targetRig.leftLeg.ankle.rotation.x = THREE.MathUtils.lerp(targetRig.leftLeg.ankle.rotation.x, -0.14, turnProgress);

                    targetRig.thorax.rotation.x = THREE.MathUtils.lerp(targetRig.thorax.rotation.x, 0.13, turnProgress);
                    targetRig.thorax.rotation.z = THREE.MathUtils.lerp(targetRig.thorax.rotation.z, -0.06, turnProgress);

                    targetRig.head.rotation.x = THREE.MathUtils.lerp(targetRig.head.rotation.x, -0.02, turnProgress);
                    targetRig.head.rotation.y = THREE.MathUtils.lerp(targetRig.head.rotation.y, 0.58, turnProgress);   // rosto virado para a câmera, como na referência
                    targetRig.head.rotation.z = THREE.MathUtils.lerp(targetRig.head.rotation.z, 0.06, turnProgress);

                    targetRig.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(targetRig.rightArm.shoulder.rotation.x, -0.26, turnProgress);
                    targetRig.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(targetRig.rightArm.shoulder.rotation.z, -0.30, turnProgress);
                    targetRig.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(targetRig.rightArm.elbow.rotation.x, -0.12, turnProgress);

                    // Mão esquerda cobrindo os olhos (palma na frente do rosto, dedos subindo pela testa) - ângulos resolvidos numericamente
                    targetRig.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(targetRig.leftArm.shoulder.rotation.x, -1.425, turnProgress);
                    targetRig.leftArm.shoulder.rotation.y = THREE.MathUtils.lerp(0, -0.123, turnProgress);
                    targetRig.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(targetRig.leftArm.shoulder.rotation.z, -0.199, turnProgress);
                    targetRig.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(targetRig.leftArm.elbow.rotation.x, -2.307, turnProgress);
                    targetRig.leftArm.elbow.rotation.z = THREE.MathUtils.lerp(0, -0.018, turnProgress);
                    targetRig.leftArm.hand.rotation.set(
                        THREE.MathUtils.lerp(0, 0.586, turnProgress),
                        THREE.MathUtils.lerp(0, 0.688, turnProgress),
                        THREE.MathUtils.lerp(0, -0.254, turnProgress)
                    );

                    // Abre e curva levemente as 3 falanges dos dedos da mão esquerda sobre a testa/olhos
                    if (targetRig.leftArm.fingers) {
                        const faceSpreads = [0, 0.16, 0.05, -0.06, -0.17];
                        targetRig.leftArm.fingers.forEach((f, idx) => {
                            if (!f.isThumb) {
                                f.prox.rotation.x = THREE.MathUtils.lerp(f.spread, faceSpreads[idx], turnProgress);
                                f.prox.rotation.z = THREE.MathUtils.lerp(f.prox.rotation.z, -0.14, turnProgress);
                                f.mid.rotation.z = THREE.MathUtils.lerp(f.mid.rotation.z, -0.22, turnProgress);
                                f.tip.rotation.z = THREE.MathUtils.lerp(f.tip.rotation.z, -0.18, turnProgress);
                            }
                        });
                    }
                }
            }

            // Cinemática específica para o Senhor de Idade (Boneco 2) fiel ao PDF
            if (targetRig.isElder) {
                // Postura levemente curvada e caminhar sereno
                targetRig.thorax.rotation.x += 0.08;
                targetRig.head.rotation.x += 0.08;
                // Leve olhar pensativo para a esquerda enquanto caminha de costas, alinhando ao virar
                targetRig.head.rotation.y = THREE.MathUtils.lerp(0.28, 0.06, turnProgress);

                // Mão esquerda permanece apoiada dentro do bolso esquerdo da calça (como na referência)
                // ângulos resolvidos numericamente (solveE.mjs): punho na boca do bolso lateral da calça, mão dentro do bolso
                targetRig.leftArm.shoulder.rotation.x = 0.118;
                targetRig.leftArm.shoulder.rotation.y = -0.445;
                targetRig.leftArm.shoulder.rotation.z = 0.313;
                targetRig.leftArm.elbow.rotation.x = -0.435;
                targetRig.leftArm.elbow.rotation.z = -0.568;
                targetRig.leftArm.hand.rotation.set(0, 0, 0);

                // Braço direito segura a maleta marrom com firmeza ao lado do corpo
                targetRig.rightArm.shoulder.rotation.x = -0.06 - 0.04 * Math.sin(phaseAngle) * walkAmp;
                targetRig.rightArm.shoulder.rotation.z = -0.22;     // braço afastado do corpo: a maleta não atravessa a perna
                targetRig.rightArm.elbow.rotation.x = -0.16;

                if (targetRig.suitcaseGroup) {
                    // Mantém a maleta alinhada verticalmente com leve balanço natural
                    targetRig.suitcaseGroup.rotation.x = 0.14 + 0.03 * Math.sin(phaseAngle) * walkAmp;
                    targetRig.suitcaseGroup.rotation.y = 0.04;
                    targetRig.suitcaseGroup.rotation.z = 0.06;
                }
            }

            // Cinemática específica para a Mulher com Bebê (Boneco 3) fiel à imagem de referência
            if (targetRig.isMother) {
                // Braço esquerdo dobrado amparando o bebê com firmeza contra o peito
                // ângulos resolvidos numericamente (solveM.mjs): antebraço sob o bebê, palma para cima apoiando a base do casulo
                // abraço: braço desce ao lado do corpo, antebraço atravessa a frente da manta e a mão segura a borda do outro lado (ângulos resolvidos numericamente)
                targetRig.leftArm.shoulder.rotation.x = 0.222 + 0.012 * Math.sin(phaseAngle) * walkAmp;
                targetRig.leftArm.shoulder.rotation.y = -1.577;
                targetRig.leftArm.shoulder.rotation.z = 0.549;
                targetRig.leftArm.elbow.rotation.x = -1.650;
                targetRig.leftArm.elbow.rotation.z = 0.346;
                targetRig.leftArm.hand.rotation.set(0.033, 0.560, -0.549);

                // Braço direito estendido para baixo segurando o puxador da mala vermelha
                // braço afastado do corpo: a mala fica ao lado da perna, sem encostar (no fim, ângulos resolvidos numericamente para a mão em x ≈ -0.37)
                targetRig.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.06 - 0.03 * Math.sin(phaseAngle) * walkAmp, -0.128, turnProgress);
                targetRig.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(-0.27, -0.377, turnProgress);
                targetRig.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.16, -0.041, turnProgress);

                // Mala vermelha sempre em pé sobre as 4 rodinhas: a rotação local desfaz a orientação da mão (só segue o giro do corpo)
                if (targetRig.suitcaseGroup) {
                    const sg = targetRig.suitcaseGroup, qh = new THREE.Quaternion(), qr = new THREE.Quaternion();
                    targetRig.root.updateMatrixWorld(true);
                    sg.parent.getWorldQuaternion(qh); targetRig.root.getWorldQuaternion(qr);
                    qr.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.lerp(0, Math.PI / 2, turnProgress)));
                    sg.quaternion.copy(qh.invert().multiply(qr));
                    // corpo da mala desliza pelas hastes para as rodinhas tocarem o chão (y = 0 no mundo)
                    targetRig.root.updateMatrixWorld(true);
                    const gp = new THREE.Vector3(), gs = new THREE.Vector3(); sg.getWorldPosition(gp); sg.getWorldScale(gs);
                    sg.userData.body.position.y = THREE.MathUtils.clamp(-gp.y / gs.y - sg.userData.wheelBottom, -0.055, 0.055);
                }

                if (targetRig.leftArm.fingers) targetRig.leftArm.fingers.forEach((f, idx) => {    // dedos esticados e levemente abertos sob a base do bebê
                    if (f.isThumb) return;
                    f.prox.rotation.x = f.spread * 0.8; f.prox.rotation.z = -0.55; f.mid.rotation.z = -0.65; f.tip.rotation.z = -0.40;   // dedos curvados em volta da manta
                });
                // Postura protetora: tronco levemente inclinado sobre o bebê e olhar de lado, para o chão
                targetRig.thorax.rotation.x += 0.03;
                targetRig.head.rotation.x += 0.05;
                targetRig.head.rotation.z += 0.02;
                // Ao parar e girar no ponto z, olha de lado, para baixo
                if (turnProgress > 0) {
                    targetRig.head.rotation.y = THREE.MathUtils.lerp(targetRig.head.rotation.y, -0.40, turnProgress);
                    targetRig.head.rotation.x = THREE.MathUtils.lerp(targetRig.head.rotation.x, 0.07, turnProgress);
                    targetRig.rightLeg.hip.rotation.z = THREE.MathUtils.lerp(0, -0.015, turnProgress);
                    targetRig.leftLeg.hip.rotation.z = THREE.MathUtils.lerp(0, 0.015, turnProgress);
                }
                if (targetRig.hairRig) targetRig.hairRig.update(targetRig.head.quaternion);   // cabelo segue a cabeça
            }
        }

        function updateWalk(dt) {
            elapsed += dt;
            // Trava o tempo no limite final para evitar sumir ou bugar o ciclo
            if (elapsed > MAX_ANIMATION_TIME) {
                elapsed = MAX_ANIMATION_TIME;
            }

            // Atualiza o primeiro boneco (A -> x + para e gira)
            animateCharacter(rig1, elapsed, TOTAL_STEPS_1, TOTAL_PATH_LEN, true, STEP_DURATION_1);
            paxSetFade(rig1, smoothstep(0, PAX_FADE, elapsed));

            // 2 s depois de o boneco 1 passar por z, o segundo surge em A e vai até y (mais devagar)
            if (elapsed >= SPAWN_TIME_2) {
                rig2.root.visible = true;
                const localElapsed2 = Math.min(elapsed - SPAWN_TIME_2, TOTAL_WALK_TIME_2 + PAUSE_DURATION + TURN_DURATION);
                animateCharacter(rig2, localElapsed2, TOTAL_STEPS_2, DIST_AY, true, STEP_DURATION_2);
                paxSetFade(rig2, smoothstep(0, PAX_FADE, localElapsed2));
            } else {
                rig2.root.visible = false;
            }

            // Um pouco depois de o boneco 2 passar por z, o terceiro surge em A, vai até z, para por completo e só então gira
            if (elapsed >= SPAWN_TIME_3) {
                rig3.root.visible = true;
                const localElapsed3 = Math.min(elapsed - SPAWN_TIME_3, TOTAL_WALK_TIME_3 + MOTHER_PAUSE + TURN_DURATION);
                animateCharacter(rig3, localElapsed3, TOTAL_STEPS_3, LEN_AZ, true, STEP_DURATION_3, MOTHER_PAUSE);
                paxSetFade(rig3, smoothstep(0, PAX_FADE, localElapsed3));
            } else {
                rig3.root.visible = false;
            }
        }

        window.addEventListener('resize', () => {
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // Tempo da animação = tempo da linha do tempo do avião (Play/Restart/scrubber), suavizado entre os passos de 100 ms
        const camRig = document.getElementById('camera-rig');
        function cssZoom() { const t = getComputedStyle(camRig).transform; return t && t !== 'none' ? new DOMMatrix(t).a : 1; }
        let paxExporting = false, paxSavedRatio = 1;
        function animate() {
            requestAnimationFrame(animate);
            if (paxExporting) return;                    // durante a exportação quem desenha é PAX.renderAt
            const tl = PAX_TIMELINE();
            elapsed = Math.max(0, Math.min(MAX_ANIMATION_TIME, tl - PAX_START));
            updateWalk(0);
            const z = cssZoom();
            OUTLINE_W.value = OUTLINE_PX * (FRUSTUM_H / camera.zoom) / Math.max(1, renderer.domElement.clientHeight) / rig1.root.scale.x / z;
            renderer.render(scene, camera);
            updateBalloonsLive(tl, z, labelAnchors());
        }
        // Exportação de vídeo: desenha os passageiros no instante tl da linha do tempo, com o contorno calculado para o zoom informado
        function renderAt(tl, zoom) {
            elapsed = Math.max(0, Math.min(MAX_ANIMATION_TIME, tl - PAX_START));
            updateWalk(0);
            OUTLINE_W.value = OUTLINE_PX * (FRUSTUM_H / camera.zoom) / Math.max(1, renderer.domElement.clientHeight) / rig1.root.scale.x / zoom;
            renderer.render(scene, camera);
            return renderer.domElement;
        }
        function beginExport(bufferWidth) {            // resolução do canvas 3D adequada ao vídeo (largura em pixels)
            paxExporting = true; paxSavedRatio = renderer.getPixelRatio();
            renderer.setPixelRatio(bufferWidth / Math.max(1, container.clientWidth));
        }
        function endExport() { renderer.setPixelRatio(paxSavedRatio); paxExporting = false; }
        window.PAX = { rig1, rig2, rig3, camera, renderer, scene, renderAt, labelAnchors, beginExport, endExport, get elapsed() { return elapsed; } };
        requestAnimationFrame(animate);

})();
