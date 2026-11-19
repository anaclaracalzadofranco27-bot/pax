        // =====================================================================
        // BINS VETORIZADOS (bins.pdf): contorno exato desenhado no CorelDRAW, usado na Simulação Integrada (BIN_SOLID).
        // Os dois contornos estão no mesmo quadro e na mesma escala do PDF (pontos): o corredor (x_livre) e o ápice da fuselagem
        // no corredor são a origem; k converte pontos do PDF em cm (bin Alpha = 35" de largura = 88,90 cm).
        // =====================================================================
        const BIN_VEC = {
            k: 88.9 / (468.035156 - 338.710938),
            yTop: 322.28125,
            xAisle: { alpha: 338.710938, conv: 261.473193 },
            // Proporções vindas das COTAS/CAD de cada bin (e não da escala do PDF): o PDF só fornece o formato do contorno.
            //   Convencional: largura 35" (88,90 cm). Queda do fundo desde o ápice do corredor: 21" sob o passageiro do CORREDOR (x = 48,5; u = 23,1 cm)
            //   e 23" (ponto mais baixo) sob o passageiro da JANELA (fundo plano, u >= 51 cm); transição linear entre os dois.
            //   Alpha (desenho CAD do bin): largura 893,53 mm e altura 641,92 mm, do ápice (teto no limite do corredor) ao ponto mais baixo.
            // hsf = fator horizontal, vsf = fator vertical (pode depender de u, em cm) aplicados ao contorno bruto do PDF (k cm/pt).
            hsf: function (kind) {
                return kind === 'conv' ? (35 * 2.54) / ((261.473193 - 131.23) * this.k)          // largura do contorno do PDF → 35"
                                       : 89.353 / ((468.035156 - 338.710938) * this.k);          // → 893,53 mm
            },
            vsf: function (kind, u) {
                if (kind !== 'conv') return 64.192 / ((414.418 - 322.28125) * this.k);           // Alpha → 641,92 mm
                const sF = (23.0 * 2.54) / ((409.148438 - 322.28125) * this.k);                  // fundo plano: 23"
                const sA = (21.0 * 2.54) / 55.564;                                               // 55,564 = calibrado para o fundo desenhado ficar em 21,00" sob o passageiro do corredor (u = 23,1)
                const t = Math.max(0, Math.min(1, (u - 23.1) / (51.0 - 23.1)));
                return sA + (sF - sA) * t;
            },
            // Ponto do contorno bruto do PDF (pt) → [u, v] em cm (u = distância ao corredor, v = queda desde o ápice), com hsf/vsf aplicados.
            map: function (kind, px, py) {
                const u = (kind === 'alpha' ? px - this.xAisle.alpha : this.xAisle.conv - px) * this.k * this.hsf(kind);
                return [u, (py - this.yTop) * this.k * this.vsf(kind, u)];
            },
            // Alpha: depois do fim da rampa (436,867 pt; queda máxima de 25,27") o fundo sobe levemente até o trecho final (era plano no PDF),
            // para que a queda sobre o passageiro da JANELA (u = 74,1 cm) seja de 24,94" — ponto "L 454,109 · 412,137".
            alpha: [["M",468.035,408.293],["C",444.059,370.688,392.512,330.418,338.711,322.281],["L",338.859,389.785],["C",338.859,391.582,342.18,395.766,344.406,395.84],["C",355.32,395.84,376.125,395.508,377.148,395.84],["C",388.441,399.508,411.758,406.652,436.867,414.418],["L",454.109,412.137],["C",457.012,411.774,466.32,410.871,468.035,408.293]],
            conv: [["M",240.66,327.891],["C",175.828,345.75,136.855,399.184,131.23,409.148],["L",188.004,409.148],["C",195.258,406.73,247.043,400.938,256.984,396.199],["C",258.012,395.711,260.449,394.527,261.316,391.453],["C",261.316,380.773,262.793,353.68,256.684,337.43],["C",254.988,332.93,248.312,327.867,241.695,327.832],["C",240.863,327.824,241.48,327.711,240.66,327.891]]
        };
        function traceVectorBin(ctx, toX, toY, kind, xCorredor, sign, yApex, sf, Rw, cyW) {
            const V = BIN_VEC;
            const P = (px, py) => {
                const m = V.map(kind, px, py);   // [distância a partir do corredor, queda a partir do ápice] em cm
                return [toX((xCorredor + m[0] * sf) * sign), toY(yApex - m[1] * sf)];
            };
            ctx.beginPath();
            V[kind].forEach(s => {
                if (s[0] === 'M') { const a = P(s[1], s[2]); ctx.moveTo(a[0], a[1]); }
                else if (s[0] === 'L') { const a = P(s[1], s[2]); ctx.lineTo(a[0], a[1]); }
                else { const a = P(s[1], s[2]), b = P(s[3], s[4]), c = P(s[5], s[6]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
            });
            ctx.closePath();
            ctx.save();
            // o bin nunca ultrapassa a parede interna da fuselagem
            ctx.beginPath(); ctx.arc(toX(0), toY(cyW), Math.abs(toX(Rw) - toX(0)), 0, Math.PI * 2); ctx.clip();
            ctx.beginPath();
            V[kind].forEach(s => {
                if (s[0] === 'M') { const a = P(s[1], s[2]); ctx.moveTo(a[0], a[1]); }
                else if (s[0] === 'L') { const a = P(s[1], s[2]); ctx.lineTo(a[0], a[1]); }
                else { const a = P(s[1], s[2]), b = P(s[3], s[4]), c = P(s[5], s[6]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
            });
            ctx.closePath();
            ctx.lineJoin = 'round';
            ctx.fillStyle = '#e7dbed';   // cor de preenchimento do PDF
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Borda inferior do bin vetorizado em |x| (cm a partir do eixo): devolve a cota Y do fundo do bin (usada pelas cotas de folga da cabeça).
        // Devolve null fora da largura do bin (aí vale o modelo antigo).
        const BIN_VEC_POLY = {};
        function vectorBinUnderY(kind, xAbs, xCorredor, yApex, sf) {
            const V = BIN_VEC;
            if (!BIN_VEC_POLY[kind]) {
                const pts = []; let cur = null;
                V[kind].forEach(sg => {
                    const Q = (px, py) => V.map(kind, px, py);   // mesma transformação (nos pontos de controle) usada no desenho
                    if (sg[0] === 'M' || sg[0] === 'L') { cur = Q(sg[1], sg[2]); pts.push(cur); }
                    else {
                        const p0 = cur, p1 = Q(sg[1], sg[2]), p2 = Q(sg[3], sg[4]), p3 = Q(sg[5], sg[6]);
                        for (let i = 1; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); }
                        cur = p3;
                    }
                });
                BIN_VEC_POLY[kind] = pts;   // já em cm, idêntico ao contorno desenhado
            }
            const pts = BIN_VEC_POLY[kind], u = (xAbs - xCorredor) / sf;
            let vmax = -Infinity;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                if ((a[0] - u) * (b[0] - u) <= 0 && a[0] !== b[0]) { const v = a[1] + (b[1] - a[1]) * ((u - a[0]) / (b[0] - a[0])); if (v > vmax) vmax = v; }
            }
            return vmax === -Infinity ? null : yApex - vmax * sf;
        }

        // Helper para desenhar Geometria Técnica Fiel do Bin Alpha (35" de largura radial, altura variando de 20" na frente a 25" no fundo)
        function traceBinAlphaProfile(ctx, toX, toY, xCorredor, yFlatFloor, sign = 1, scaleFactor = 1.0, R_fus = 137.16, fusCenterY = 0.0, flatBottom = false) {
            const rad17 = 17.0 * Math.PI / 180.0;
            const cos17 = Math.cos(rad17);
            const sin17 = Math.sin(rad17);

            const W_flat = 25.91 * scaleFactor;
            const L_ramp = 35.67 * scaleFactor;
            const H_door = 40.33 * scaleFactor;
            const H_chan = 25.11 * scaleFactor;
            const W_tot  = 88.90 * scaleFactor;   // 35.0" de largura transversal exata (88,90 cm)

            const x0 = xCorredor * sign;
            const y0 = yFlatFloor;

            const xFlatEnd = (xCorredor + W_flat) * sign;
            const yFlatEnd = y0;

            const xRampEnd = (xCorredor + W_flat + L_ramp * cos17) * sign;
            const yRampEnd = y0 - L_ramp * sin17;

            const xDivTop = (xCorredor + W_flat + L_ramp * cos17 + H_chan * sin17) * sign;
            const yDivTop = yRampEnd + H_chan * cos17;

            const xStep = (xCorredor + W_flat) * sign;
            const yStepBot = yFlatEnd + H_chan / cos17;
            const yStepTop = y0 + H_door - 1.8 * scaleFactor;

            const yTopApex = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xCorredor * xCorredor));

            const xOuterTip = (xCorredor + W_tot) * sign;
            const yOuterTip = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - (xCorredor + W_tot) * (xCorredor + W_tot)));

            const yLowest = yTopApex - 25.0 * CM_PER_IN * scaleFactor;

            ctx.save();
            ctx.fillStyle = window.BIN_SOLID ? '#cbd5e1' : 'rgba(241, 245, 249, 0.94)';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.2;
            const PA = (x, y) => [toX(x), toY(y)];
            const ptsA = [PA(x0, y0), PA(xFlatEnd, yFlatEnd), PA(xRampEnd, yRampEnd)];
            let cyBot = (yLowest + yOuterTip) * 0.5;
            {   // calibra a curva inferior para que o ponto mais baixo do bin seja exatamente a cota de 25"
                // (flatBottom: fundo bem mais plano — mergulho de apenas 3,4 cm abaixo do fim da rampa, conforme bin.pdf)
                const yTarget = flatBottom ? Math.min(yRampEnd, yOuterTip) - 3.4 * scaleFactor : yLowest;
                let cy = (yTarget + yOuterTip) * 0.5, minY = 0;
                for (let k = 0; k < 12; k++) {
                    minY = Infinity;
                    for (let t = 0; t <= 1.0001; t += 0.02) { const u = 1 - t; minY = Math.min(minY, u * u * yRampEnd + 2 * u * t * cy + t * t * yOuterTip); }
                    cy += (yTarget - minY) * 1.2;
                }
                cyBot = cy;
                ptsA.push(...quadPts(PA(xRampEnd, yRampEnd), PA((xCorredor + W_tot * 0.90) * sign, cy), PA(xOuterTip, yOuterTip), 24));
            }
            const numArcSteps = 24;
            for (let i = 1; i <= numArcSteps; i++) {
                const xiAbs = (xCorredor + W_tot) - (W_tot * i) / numArcSteps;
                const yi = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xiAbs * xiAbs));   // colado na parede interna da fuselagem
                ptsA.push(PA(xiAbs * sign, yi));
            }
            if (window.BIN_SOLID) {
                traceVectorBin(ctx, toX, toY, 'alpha', xCorredor, sign, yTopApex, scaleFactor, R_fus, fusCenterY);   // Simulação Integrada: bin vetorizado (bins.pdf)
            } else {
            if (flatBottom) {
                // Bin no estilo do vetor (Sem_título-3.pdf): casca azul-clara; a cavidade da mala fica transparente (preenchimento par-ímpar)
                ctx.fillStyle = '#e8eef3'; ctx.strokeStyle = '#2e3154'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                roundedPoly(ctx, ptsA, 2.4 * Math.abs(toX(1) - toX(0)));
                ctx.moveTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
                ctx.lineTo(toX(xFlatEnd), toY(yFlatEnd + 1.0 * scaleFactor));
                ctx.lineTo(toX(xRampEnd), toY(yRampEnd + 1.0 * scaleFactor));
                ctx.lineTo(toX(xDivTop), toY(yDivTop));
                ctx.lineTo(toX(xStep), toY(yStepBot));
                ctx.lineTo(toX(xStep), toY(yStepTop));
                ctx.lineTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(yStepTop));
                ctx.closePath();
                ctx.fill('evenodd');
                ctx.stroke();
            } else {
            ctx.beginPath();
            roundedPoly(ctx, ptsA, 2.4 * Math.abs(toX(1) - toX(0)));
            ctx.fill();
            ctx.stroke();
            }
            }

            if (!window.BIN_SOLID) {
            ctx.fillStyle = flatBottom ? 'rgba(255, 255, 255, 0.10)' : (window.BIN_SOLID ? 'rgba(241, 245, 249, 0.94)' : '#ffffff');
            ctx.strokeStyle = flatBottom ? '#2e3154' : '#334155';
            ctx.lineWidth = flatBottom ? 1.3 : 1.8;
            ctx.beginPath();
            ctx.moveTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
            ctx.lineTo(toX(xFlatEnd), toY(yFlatEnd + 1.0 * scaleFactor));
            ctx.lineTo(toX(xRampEnd), toY(yRampEnd + 1.0 * scaleFactor));
            ctx.lineTo(toX(xDivTop), toY(yDivTop));
            ctx.lineTo(toX(xStep), toY(yStepBot));
            ctx.lineTo(toX(xStep), toY(yStepTop));
            ctx.lineTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(yStepTop));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = flatBottom ? '#d5d8e0' : 'rgba(67, 70, 151, 0.14)';
            ctx.strokeStyle = flatBottom ? '#2e3154' : '#334155';
            ctx.lineWidth = flatBottom ? 1.3 : 1.6;
            ctx.beginPath();
            ctx.moveTo(toX(xRampEnd + 1.2 * scaleFactor * sign), toY(yRampEnd + 0.6 * scaleFactor));
            ctx.quadraticCurveTo(
                toX((xCorredor + W_tot * 0.90) * sign),
                toY(flatBottom ? cyBot : (yLowest + yOuterTip) * 0.5),
                toX(xOuterTip - 1.8 * scaleFactor * sign),
                toY(yOuterTip + 1.2 * scaleFactor)
            );
            ctx.lineTo(toX(xDivTop + 1.2 * scaleFactor * sign), toY(yDivTop - 0.8 * scaleFactor));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const xTopPocketStart = (xCorredor + 2.0 * scaleFactor) * sign;
            const xTopPocketEnd = (xCorredor + 20.66 * scaleFactor) * sign;
            const yTopPocketBot = yStepTop + 1.8 * scaleFactor;
            const yTopPocketApex = Math.min(yTopApex - 1.0 * scaleFactor, yTopPocketBot + 5.42 * scaleFactor);
            ctx.fillStyle = flatBottom ? '#d5d8e0' : 'rgba(42, 29, 194, 0.12)';
            ctx.beginPath();
            ctx.moveTo(toX(xTopPocketStart), toY(yTopPocketBot));
            ctx.lineTo(toX(xTopPocketEnd), toY(yTopPocketBot));
            ctx.lineTo(toX(xTopPocketStart), toY(yTopPocketApex));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = flatBottom ? '#2e3154' : '#2a1dc2';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(toX((xCorredor + 0.8 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
            ctx.lineTo(toX((xCorredor + 0.8 * scaleFactor) * sign), toY(yStepTop - 2.5 * scaleFactor));
            ctx.quadraticCurveTo(
                toX((xCorredor + 0.8 * scaleFactor) * sign),
                toY(yStepTop + 0.8 * scaleFactor),
                toX((xCorredor + 4.5 * scaleFactor) * sign),
                toY(yStepTop + 0.8 * scaleFactor)
            );
            ctx.lineTo(toX(xStep), toY(yStepTop + 0.8 * scaleFactor));
            ctx.stroke();
            }
            ctx.restore();

            const m1W = 23.2 * scaleFactor;
            const m1H = 34.8 * scaleFactor;
            const m1Cx = (xCorredor + 1.4 * scaleFactor + m1W * 0.5) * sign;
            const m1Cy = y0 + 1.2 * scaleFactor + m1H * 0.5;

            const m2W = 33.2 * scaleFactor;
            const m2H = 22.8 * scaleFactor;
            const distAlongRamp = (L_ramp * 0.50);
            const distNormalToRamp = 1.2 * scaleFactor + m2H * 0.5;
            const m2Cx = (xCorredor + W_flat + distAlongRamp * cos17 + distNormalToRamp * sin17) * sign;
            const m2Cy = yFlatEnd - distAlongRamp * sin17 + distNormalToRamp * cos17;

            return {
                x0, y0, xFlatEnd, yFlatEnd, xRampEnd, yRampEnd,
                xDivTop, yDivTop, xStep, yStepBot, yStepTop,
                xOuterTip, yOuterTip, yTopApex, yLowest, rad17,
                m1Cx, m1Cy, m1W, m1H,
                m2Cx, m2Cy, m2W, m2H
            };
        }

        // Helper para desenhar Geometria Coerente do Bin Convencional Embraer (35" de largura radial, 22,5" de altura vertical)
        function traceEmbraerBinProfile(ctx, toX, toY, xCorredor, yPsuShelf, sign = -1, R_fus = 137.16, fusCenterY = 0.0, roundedDoor = false) {
            const scaleFactor = R_fus / 137.16;
            const xTopInnerAbs = xCorredor;
            const yTopInner = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xTopInnerAbs * xTopInnerAbs)) - 1.2 * scaleFactor;

            const W_tot = 88.90 * scaleFactor; // 35.0" de largura transversal exata
            const xOuterPsuAbs = xTopInnerAbs + W_tot;

            const tiltDeg = 16.5;
            const tiltRad = tiltDeg * Math.PI / 180.0;
            const cosT = Math.cos(tiltRad);
            const sinT = Math.sin(tiltRad);

            const xBackBotAbs = 76.0 * scaleFactor;
            const yBackBot = yPsuShelf + 1.8 * scaleFactor;

            const floorLen = 49.0 * scaleFactor;
            const xFrontBotAbs = xBackBotAbs - floorLen * cosT;
            const yFrontBot = yBackBot + floorLen * sinT;

            const cavH = 24.8 * scaleFactor;
            const xBackTopAbs = xBackBotAbs + cavH * sinT;
            const yBackTop = yBackBot + cavH * cosT;
            const xFrontTopAbs = xFrontBotAbs + cavH * sinT;
            const yFrontTop = yFrontBot + cavH * cosT;

            const yLipBot = yPsuShelf + 11.2 * scaleFactor;

            ctx.save();
            ctx.fillStyle = window.BIN_SOLID ? '#cbd5e1' : 'rgba(203, 213, 225, 0.90)';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.2;
            const PE = (x, y) => [toX(x), toY(y)];
            const ptsE = [PE(xOuterPsuAbs * sign, yPsuShelf), PE((xBackBotAbs - 2.0 * scaleFactor) * sign, yPsuShelf), PE((xTopInnerAbs + 1.2 * scaleFactor) * sign, yLipBot)];
            const wallY = (x) => fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - x * x));   // parede interna da fuselagem
            let xArcStart = xTopInnerAbs;
            let doorInfo = null;
            const yTopInnerWall = wallY(xTopInnerAbs);
            if (roundedDoor) {
                xArcStart = xTopInnerAbs + 7.0 * 2.54 * scaleFactor;
                const yDoorTop = wallY(xArcStart);
                doorInfo = {
                    hingeX: xArcStart * sign, hingeY: yDoorTop,
                    ctrlX: (xTopInnerAbs + 0.4 * scaleFactor) * sign, ctrlY: yDoorTop - 3.0 * scaleFactor,
                    endX: (xTopInnerAbs + 1.2 * scaleFactor) * sign, endY: yLipBot
                };
                ptsE.push(...quadPts(PE(doorInfo.endX, doorInfo.endY), PE(doorInfo.ctrlX, doorInfo.ctrlY), PE(doorInfo.hingeX, doorInfo.hingeY)));
            } else {
                ptsE.push(...quadPts(PE((xTopInnerAbs + 1.2 * scaleFactor) * sign, yLipBot),
                    PE((xTopInnerAbs - 1.5 * scaleFactor) * sign, (yLipBot + yTopInnerWall) * 0.5),
                    PE(xTopInnerAbs * sign, yTopInnerWall)));
            }
            const numArc = 24;
            for (let i = 1; i <= numArc; i++) {
                const xiAbs = xArcStart + ((xOuterPsuAbs - xArcStart) * i) / numArc;
                const yi = (i === numArc) ? yPsuShelf : Math.max(yPsuShelf, wallY(xiAbs));
                ptsE.push(PE(xiAbs * sign, yi));
            }
            if (window.BIN_SOLID) {
                traceVectorBin(ctx, toX, toY, 'conv', xCorredor, sign, fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xTopInnerAbs * xTopInnerAbs)), scaleFactor, R_fus, fusCenterY);   // Simulação Integrada: bin vetorizado (bins.pdf)
            } else {
            ctx.beginPath();
            roundedPoly(ctx, ptsE, 2.4 * Math.abs(toX(1) - toX(0)));
            ctx.fill();
            ctx.stroke();
            }

            if (!window.BIN_SOLID) {
            ctx.fillStyle = window.BIN_SOLID ? 'rgba(203, 213, 225, 0.90)' : '#ffffff';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(toX(xBackBotAbs * sign), toY(yBackBot));
            ctx.lineTo(toX(xFrontBotAbs * sign), toY(yFrontBot));
            ctx.quadraticCurveTo(
                toX((xFrontBotAbs - 3.2 * scaleFactor) * sign),
                toY((yFrontBot + yFrontTop) * 0.5),
                toX(xFrontTopAbs * sign),
                toY(yFrontTop)
            );
            ctx.lineTo(toX(xBackTopAbs * sign), toY(yBackTop));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            }
            ctx.restore();

            const bagW = 33.6 * scaleFactor;
            const bagH = 22.8 * scaleFactor;
            const distAlong = floorLen * 0.50;
            const distNorm = 1.0 * scaleFactor + bagH * 0.5;
            const bagCxAbs = xBackBotAbs - distAlong * cosT + distNorm * sinT;
            const bagCy = yBackBot + distAlong * sinT + distNorm * cosT;

            return {
                xFrontBot: xTopInnerAbs * sign,
                yFrontBot: yLipBot,
                xFrontTop: xTopInnerAbs * sign,
                yFrontTop: yTopInner,
                xOuterPsu: xOuterPsuAbs * sign,
                yPsuShelf,
                doorInfo,
                bagCx: bagCxAbs * sign,
                bagCy,
                bagW,
                bagH,
                bagAngleRad: sign === -1 ? -tiltRad : tiltRad
            };
        }

        // Helper para desenhar Mala Realista estilo Embraer (Imagem 1) e Bin Alpha (Imagens 2/3)
        function drawRealisticSuitcase(ctx, cx, cy, wPx, hPx, angleRad, label1, label2, isAlphaStyle = false, colorOverride = null) {
            if (colorOverride) {
                // Mala em cor sólida personalizada (usada no Viewport CAD 2D da aba 1)
                const hex = colorOverride.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16), gC = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
                const dark = `rgb(${Math.round(r * 0.6)}, ${Math.round(gC * 0.6)}, ${Math.round(b * 0.6)})`;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angleRad);
                ctx.fillStyle = colorOverride;
                ctx.strokeStyle = dark;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 5);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(-wPx / 2 + 3.5, -hPx / 2 + 3.5, Math.max(4, wPx - 7), Math.max(4, hPx - 7));
                ctx.fillStyle = dark;
                ctx.fillRect(-wPx * 0.16, -hPx / 2 - 2.5, wPx * 0.32, 2.5);
                if (!window.ERGO_VIEW) {   // aba biomecânica: sem rótulos nas malas
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (label1 && label2) {
                        ctx.fillText(label1, 0, -5);
                        ctx.font = '7.5px "JetBrains Mono", monospace';
                        ctx.fillText(label2, 0, 6);
                    } else if (label1) {
                        ctx.fillText(label1, 0, 0);
                    }
                }
                ctx.restore();
                return;
            }
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleRad);

            // Corpo principal da mala com cantos arredondados
            ctx.fillStyle = isAlphaStyle ? (window.__mkExport ? '#6b6fc4' : 'rgba(67, 70, 151, 0.30)') : '#a1622f';
            ctx.strokeStyle = isAlphaStyle ? '#2a1dc2' : '#451a03';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 5);
            ctx.fill();
            ctx.stroke();

            // Costura interna / zíper
            ctx.strokeStyle = isAlphaStyle ? 'rgba(42, 29, 194, 0.50)' : '#78350f';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-wPx / 2 + 3.5, -hPx / 2 + 3.5, Math.max(4, wPx - 7), Math.max(4, hPx - 7));

            // Alça superior discreta
            ctx.fillStyle = isAlphaStyle ? '#2a1dc2' : '#451a03';
            ctx.fillRect(-wPx * 0.16, -hPx / 2 - 2.5, wPx * 0.32, 2.5);

            if (!window.ERGO_VIEW) {   // aba biomecânica: sem rótulos nas malas
                // Rótulos perfeitamente centralizados dentro da mala
                ctx.fillStyle = isAlphaStyle ? '#0f172a' : '#fef3c7';
                ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (label1 && label2) {
                    ctx.fillText(label1, 0, -5);
                    ctx.font = '7.5px "JetBrains Mono", monospace';
                    ctx.fillText(label2, 0, 6);
                } else if (label1) {
                    ctx.fillText(label1, 0, 0);
                }
            }
            ctx.restore();
        }
