        // Current shared textures for the elder, mother and baby.
        // Receitas PT ativas do senhor, da mãe e do bebê; o viajante utiliza TVT.
        const PT = {};

        // Preserve precise base colors: SUIT_C is distinct from ELD.suit.
        const SUIT_C = '#bfa58e', COAT_C = '#5d6943', PANTS_C = '#474f57', WRINKLE_C = '#b87d65';
        const paintCloth = (fill, extra) => paintedRecipe(512, 256, (g, W, H, fl) => { g.fillStyle = fl; g.fillRect(0, 0, W, H); extra(g, W, H); }, fill);
        Object.assign(PT, {
            coatSleeve: paintCloth(COAT_C, (g, W, H) => {
                inkTaper(g, W, H, [0.93, 0.80], [1.00, 0.83], [0.07, 0.80], 5);
                inkTaper(g, W, H, [0.94, 0.89], [1.00, 0.915], [0.06, 0.89], 5);
            }),
            coatForearm: paintCloth(COAT_C, (g, W, H) => {
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

