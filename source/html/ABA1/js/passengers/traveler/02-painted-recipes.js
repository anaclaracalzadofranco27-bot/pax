        // ---------------------------------------------------------------- texturas pintadas (cor chapada + linhas de tinta)
        const TVT = {};
        TVT.shirt = paintedRecipe(1024, 512, (g, W, H) => {
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
        TVT.sleeve = paintedRecipe(512, 256, (g, W, H) => {
            g.fillStyle = TVC.shirt; g.fillRect(0, 0, W, H);
            g.fillStyle = TVC.shirtSh; g.fillRect(0, H * 0.905, W, H);
            inkTaper(g, W, H, [0, 0.905], [0.5, 0.905], [1, 0.905], 6);
            inkTaper(g, W, H, [0.60, 0.22], [0.56, 0.50], [0.61, 0.82], 5);
            inkTaper(g, W, H, [0.07, 0.30], [0.03, 0.55], [0.08, 0.80], 4);
            inkPoly(g, W, H, [[0.94, 0.10], [1.06, 0.10], [1.05, 0.55], [0.95, 0.55]], TVC.shirtHi);
        });
        TVT.pelvis = paintedRecipe(512, 512, (g, W, H) => {
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
        const tvLegPaint = (isCalf) => paintedRecipe(512, 512, (g, W, H) => {
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
        TVT.forearm = paintedRecipe(256, 256, (g, W, H) => {
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            inkTaper(g, W, H, [0.88, 0.12], [0.92, 0.35], [0.95, 0.60], 3, TVC.skinLine);
            inkTaper(g, W, H, [0.10, 0.28], [0.06, 0.50], [0.07, 0.74], 3, TVC.skinLine);
            inkTaper(g, W, H, [0.96, 0.02], [0.02, 0.04], [0.08, 0.02], 3, TVC.skinLine);
        });
        TVT.neck = paintedRecipe(256, 256, (g, W, H) => {                     // a: 0.34 (base) .. 0.475 (topo); a sombra do queixo cai no alto do pescoço
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const F = a => (0.475 - a) / 0.135;
            g.fillStyle = TVC.skinSh; g.fillRect(0, 0, W, H * F(0.452));
            g.fillStyle = '#b06a50'; g.fillRect(0, 0, W, H * F(0.466));
            g.fillStyle = TVC.skinSh; g.fillRect(0, H * F(0.408), W, H);                                  // dentro da gola
        });
        TVT.upperArm = paintedRecipe(256, 256, (g, W, H) => {                 // a: -0.090 .. -0.292; sombra da manga logo abaixo da barra (-0.138)
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const F = a => (-0.090 - a) / 0.202;
            g.fillStyle = TVC.skinSh; g.fillRect(0, 0, W, H * F(-0.176));
            g.fillStyle = '#b06a50'; g.fillRect(0, 0, W, H * F(-0.154));
            inkTaper(g, W, H, [0.90, F(-0.17)], [0.94, F(-0.22)], [0.97, F(-0.27)], 3, TVC.skinLine);
        });
        TVT.face = paintedRecipe(1024, 512, (g, W, H) => {
            g.fillStyle = TVC.skin; g.fillRect(0, 0, W, H);
            const P = (x, y) => headFP(x, y, W, H), poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
            // rosto sem traços (como na ilustração): só a sombra da franja na testa e sob o queixo
            poly([P(-0.080, 0.176), P(0.080, 0.176), P(0.074, 0.140), P(0.035, 0.128), P(-0.035, 0.128), P(-0.074, 0.140)], TVC.skinSh);
            poly([P(-0.056, 0.045), P(0.056, 0.045), P(0.032, 0.018), P(-0.032, 0.018)], TVC.skinSh);
        });
        TVT.hair = paintedRecipe(1024, 512, (g, W, H) => {
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
        TVT.shoe = paintedRecipe(256, 512, (g, W, H) => {
            // eixo z: v = 1 na ponta; y do canvas = 1 - (z + 0.060) / 0.238. u = 0 é o topo do tênis
            const Z = z => 1 - (z + 0.060) / 0.238;
            g.fillStyle = TVC.shoe; g.fillRect(0, 0, W, H);
            [0.25, 0.75].forEach(u => inkPoly(g, W, H, [[u - 0.10, Z(0.12)], [u + 0.10, Z(0.12)], [u + 0.09, Z(-0.05)], [u - 0.09, Z(-0.05)]], TVC.shoeSh));
            g.fillStyle = TVC.sole; g.fillRect(0, 0, W, H * Z(0.138));                                                      // biqueira branca
            inkTaper(g, W, H, [0, Z(0.138)], [0.5, Z(0.138)], [1, Z(0.138)], 4);
            [0.0, 1.0].forEach(u => { for (let i = 0; i < 4; i++) { const z = 0.040 + i * 0.022; inkTaper(g, W, H, [u - 0.06, Z(z)], [u, Z(z) - 0.012], [u + 0.06, Z(z)], 3); } });   // cadarço
            [0.25, 0.75].forEach(u => inkTaper(g, W, H, [u - 0.02, Z(0.098)], [u, Z(0.03)], [u - 0.03, Z(-0.045)], 3));
        });

