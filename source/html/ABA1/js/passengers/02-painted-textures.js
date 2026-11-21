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
        // Current shared textures for the elder, mother and baby.
        // Receitas PT ativas do senhor, da mãe e do bebê; o viajante utiliza TVT.
        const PT = {};

        // Preserve precise base colors: SUIT_C is distinct from ELD.suit.
        const SUIT_C = '#bfa58e', COAT_C = '#5d6943', PANTS_C = '#474f57', WRINKLE_C = '#b87d65';
        const paintCloth = (name, fill, extra) => ({ fill, w: 512, h: 256, fn: (g, W, H, fl) => { g.fillStyle = fl; g.fillRect(0, 0, W, H); extra(g, W, H); } });
        Object.assign(PT, {
            coatSleeve: paintCloth('coatSleeve', COAT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.93, 0.80], [1.00, 0.83], [0.07, 0.80], 5);
                inkTaper(g, W, H, [0.94, 0.89], [1.00, 0.915], [0.06, 0.89], 5);
            }),
            coatForearm: paintCloth('coatForearm', COAT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.94, 0.07], [1.00, 0.10], [0.06, 0.07], 5);
                inkTaper(g, W, H, [0.95, 0.14], [1.00, 0.165], [0.05, 0.14], 5);
                inkTaper(g, W, H, [0, 0.95], [0.5, 0.95], [1, 0.95], 6);
            }),
            hairE: { w: 1024, h: 256, fn: (g, W, H) => {
                g.fillStyle = '#b0b5ba'; g.fillRect(0, 0, W, H);
                for (let k = 0; k < 38; k++) {
                    const u0 = k / 38 + 0.004, a = (k * 37 % 11) / 11, dark = k % 3 !== 0;
                    inkTaper(g, W, H, [u0, 0.02 + 0.18 * a], [u0 + 0.014 * (a - 0.5), 0.5], [u0 + 0.02 * (0.5 - a), 0.82 + 0.17 * (1 - a)], dark ? 7 : 5, dark ? '#9da3a9' : '#c9cdd0');
                }
            } },
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
            earT: earPaint('#e9a684'),
            earE: earPaint('#f0baa3')
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



        // Constante de escala exata extraída da matriz raiz do glTF (Mannequin.js)
        const GLTF_S = 0.028275117561022346;

