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
        // Fabrica unica de receitas de textura (PT: senhor/mae/bebe; TVT: viajante).
        // Preserva a ordem das propriedades e os mesmos callbacks de pintura.
        const paintedRecipe = (w, h, fn, fill) =>
            fill === undefined ? { w, h, fn } : { fill, w, h, fn };
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
