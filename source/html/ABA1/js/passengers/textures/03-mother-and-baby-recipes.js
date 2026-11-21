        // ----------------------------------------------------------------------------
        // MÃE E BEBÊ: sobretudo verde-oliva com lapelas, bolsos e abertura frontal; calça escura com dobras; bebê e manta desenhados
        // ----------------------------------------------------------------------------
        Object.assign(PT, { earB: earPaint('#efc4ad') });
        const COAT_D = '#495334', SKIN_M = '#e5b299', BLANKET_B = '#c2d5e3';
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

