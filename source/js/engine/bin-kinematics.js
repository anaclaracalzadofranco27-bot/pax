/* Aba 5: Source CAD geometry from Simulador Cinemático CAD.
   Dimensions are cm in the schematic 1:10; the original cabin shell, floor,
   corridor and seats stay unchanged. */
(function () {
const CABIN_R = 137.00;
        const CABIN_YC = 63.00;
        const CORRIDOR_LEFT_X = -24.50;

        const ALPHA_FIXED = Object.freeze({
            // Transformação arquivo -> CAD (x_cad = SCALE_X*fx + TX ; y_svg = SCALE_Y*fy + TY), ajustada ao arco da fuselagem
            scaleX: 0.004474693,   // 89,35 cm de largura real
            scaleY: 0.004288607,   // 61,49 cm de altura real
            tx: 20.87335808,
            ty: -228.85901283,
            bbox: { x0: 644.92, y0: 7233.40, x1: 20612.77, y1: 21571.39 },
            wallFix: { fx: 20544.92, fy: 20683.35 },   // início do arco (ponto baixo, na fuselagem)
            topFuse: { fx: 824.78, fy: 7257.57 }       // fim do arco (ponto alto, na fuselagem)
        });

        // Contorno externo amostrado do alphaa.svg (coords do arquivo) — usado para achar o ponto mais baixo / extremos ao girar
        const ALPHA_OUTLINE = [[658,7389],[657,8175],[657,9009],[657,9883],[656,10787],[656,11711],[655,12646],[654,13583],[653,14511],[651,15422],[650,16306],[648,17154],[647,17956],[646,18069],[645,18171],[648,18264],[658,18346],[678,18420],[711,18484],[760,18539],[828,18585],[918,18623],[1034,18653],[1178,18676],[1354,18691],[1879,18725],[2433,18767],[3001,18815],[3571,18867],[4127,18921],[4657,18975],[5146,19026],[5581,19072],[5948,19113],[6234,19144],[6424,19165],[6504,19173],[6711,19218],[7144,19335],[7759,19511],[8514,19733],[9366,19988],[10272,20262],[11191,20542],[12078,20815],[12891,21068],[13588,21287],[14126,21459],[14462,21571],[14551,21571],[14798,21571],[15172,21571],[15640,21571],[16171,21571],[16734,21571],[17297,21571],[17828,21571],[18296,21571],[18670,21571],[18917,21571],[19007,21571],[19062,21553],[19140,21523],[19237,21481],[19351,21429],[19478,21370],[19616,21305],[19761,21235],[19911,21163],[20063,21090],[20214,21018],[20361,20948],[20501,20883],[20535,20867],[20562,20855],[20583,20844],[20598,20834],[20608,20824],[20612,20813],[20612,20800],[20607,20785],[20597,20767],[20584,20745],[20566,20717],[20545,20683],[19224,18736],[17797,16956],[16279,15338],[14683,13877],[13023,12568],[11315,11406],[9572,10387],[7807,9505],[6036,8756],[4273,8135],[2531,7637],[825,7258],[784,7249],[751,7242],[725,7237],[704,7234],[688,7234],[676,7238],[668,7247],[663,7262],[660,7282],[659,7310],[658,7345],[658,7389]];

        const SUITCASE = Object.freeze({
            wMm: 55.88,               // 22" = 55,88 cm
            hMm: 25.40,               // 10" = 25,40 cm
            fixedTiltDeg: 15.0,       // Angulação fixada em 15,0°
            operationalClearMm: 2.54, // Folga operacional de 1,0" = 2,54 cm (2,54 mm no CAD 1:10)
            minBinToBagHeightMm: 2.54,// Altura mínima da base do bin para a mala: 1,0" = 2,54 cm (2,54 mm no CAD)
            maxDoorBulgeXMm: 1.27     // Avanço horizontal máximo permitido para arredondar a porta: 0,5" = 1,27 cm
        });

        const DOOR_KINEMATIC_DELTA = Object.freeze({
            inchMm: 2.54              // 1" = 2,54 cm (2,54 mm no CAD 1:10) abaixo do fim da mala
        });

        const state = {
            zoomMode: 'bin',
            leftBaseY: 138.50,
            alphaMode: 'floor',     // extremo que o usuário define: 'floor' (piso do bin), 'base' ou 'top'
            alphaTargetY: 148.70,    // distância do chão da cabine até o piso do bin no ponto mais alto (cm)
            bagTiltDeg: SUITCASE.fixedTiltDeg,
            thetaDeg: 0.0,
            alphaDoorU: 0.0,
            maxOpenAngleDeg: 92.0,
            bagInsertPct: 100,
            isAnimating: false,
            animDir: 1
        };


        function getFuselageX(yMm) {
            const dy = yMm - CABIN_YC;
            const inside = Math.max(0, CABIN_R * CABIN_R - dy * dy);
            return Math.sqrt(inside);
        }

        function rotatePointAroundPivot(pt, pivot, angleDeg) {
            const rad = angleDeg * Math.PI / 180.0;
            const cosA = Math.cos(rad);
            const sinA = Math.sin(rad);
            const dx = pt.x - pivot.x;
            const dy = pt.y - pivot.y;
            return {
                x: pivot.x + (dx * cosA - dy * sinA),
                y: pivot.y + (dx * sinA + dy * cosA)
            };
        }

        function buildRoundedRectPath(bL, bR, tR, tL, tx, ty, nx, ny, rCorner) {
            const r = Math.max(0, rCorner);
            if (r <= 0.05) {
                return `M ${bL.x.toFixed(2)} ${(-bL.y).toFixed(2)} L ${bR.x.toFixed(2)} ${(-bR.y).toFixed(2)} L ${tR.x.toFixed(2)} ${(-tR.y).toFixed(2)} L ${tL.x.toFixed(2)} ${(-tL.y).toFixed(2)} Z`;
            }
            const p1 = { x: bL.x + r * tx, y: bL.y + r * ty };
            const p2 = { x: bR.x - r * tx, y: bR.y - r * ty };
            const p3 = { x: bR.x + r * nx, y: bR.y + r * ny };
            const p4 = { x: tR.x - r * nx, y: tR.y - r * ny };
            const p5 = { x: tR.x - r * tx, y: tR.y - r * ty };
            const p6 = { x: tL.x + r * tx, y: tL.y + r * ty };
            const p7 = { x: tL.x - r * nx, y: tL.y - r * ny };
            const p8 = { x: bL.x + r * nx, y: bL.y + r * ny };
            return [
                `M ${p1.x.toFixed(2)} ${(-p1.y).toFixed(2)}`,
                `L ${p2.x.toFixed(2)} ${(-p2.y).toFixed(2)}`,
                `Q ${bR.x.toFixed(2)} ${(-bR.y).toFixed(2)} ${p3.x.toFixed(2)} ${(-p3.y).toFixed(2)}`,
                `L ${p4.x.toFixed(2)} ${(-p4.y).toFixed(2)}`,
                `Q ${tR.x.toFixed(2)} ${(-tR.y).toFixed(2)} ${p5.x.toFixed(2)} ${(-p5.y).toFixed(2)}`,
                `L ${p6.x.toFixed(2)} ${(-p6.y).toFixed(2)}`,
                `Q ${tL.x.toFixed(2)} ${(-tL.y).toFixed(2)} ${p7.x.toFixed(2)} ${(-p7.y).toFixed(2)}`,
                `L ${p8.x.toFixed(2)} ${(-p8.y).toFixed(2)}`,
                `Q ${bL.x.toFixed(2)} ${(-bL.y).toFixed(2)} ${p1.x.toFixed(2)} ${(-p1.y).toFixed(2)}`,
                `Z`
            ].join(' ');
        }

        function computeLeftBinAtY(baseY) {
            const wallX = -getFuselageX(baseY);
            const wallFix = { x: wallX, y: baseY };

            const tiltDeg = SUITCASE.fixedTiltDeg; // 15.0°
            const alphaRad = tiltDeg * Math.PI / 180.0;
            const tx = Math.cos(alphaRad);
            const ty = Math.sin(alphaRad);
            const nx = -Math.sin(alphaRad);
            const ny = Math.cos(alphaRad);

            // =========================================================================
            // 1. POSICIONAMENTO DA MALA COM:
            //    - Altura mínima da base do bin para a mala = 1,0" (2,54 mm)
            //    - Folga operacional exata da fuselagem = 1,0" (2,54 mm)
            // =========================================================================
            const targetRadius = CABIN_R - SUITCASE.operationalClearMm; // 137.00 - 2.54 = 134.46 mm
            const bagBotLeftY = baseY + SUITCASE.minBinToBagHeightMm;   // Exatamente 1,0" (2,54 mm) acima da base Y do bin
            const bagTopLeftY = bagBotLeftY + SUITCASE.hMm * ny;

            // Para que o canto superior esquerdo (`bagSeatedTopLeft`) e o canto inferior esquerdo (`seatedBagBotLeft`)
            // respeitem exatamente 1,0" (2,54 mm) de distância radial até a circunferência da fuselagem:
            const maxAllowTopLeftX = -Math.sqrt(Math.max(0, targetRadius * targetRadius - Math.pow(bagTopLeftY - CABIN_YC, 2)));
            const maxAllowBotLeftX = -Math.sqrt(Math.max(0, targetRadius * targetRadius - Math.pow(bagBotLeftY - CABIN_YC, 2)));

            const seatedBagBotLeftX = Math.max(
                maxAllowBotLeftX,
                maxAllowTopLeftX - SUITCASE.hMm * nx
            );

            const seatedBagBotLeft = {
                x: seatedBagBotLeftX,
                y: bagBotLeftY
            };
            const seatedBagBotRight = {
                x: seatedBagBotLeft.x + SUITCASE.wMm * tx,
                y: seatedBagBotLeft.y + SUITCASE.wMm * ty
            };
            const bagSeatedTopLeft = {
                x: seatedBagBotLeft.x + SUITCASE.hMm * nx,
                y: seatedBagBotLeft.y + SUITCASE.hMm * ny
            };
            const seatedBagTopRight = {
                x: seatedBagBotRight.x + SUITCASE.hMm * nx,
                y: seatedBagBotRight.y + SUITCASE.hMm * ny
            };

            const rTopLeftActual = Math.hypot(bagSeatedTopLeft.x, bagSeatedTopLeft.y - CABIN_YC);
            const rBotLeftActual = Math.hypot(seatedBagBotLeft.x, seatedBagBotLeft.y - CABIN_YC);
            const bagWallClearanceMm = CABIN_R - Math.max(rTopLeftActual, rBotLeftActual);
            const bagBaseClearanceMm = seatedBagBotLeft.y - baseY; // Exatos 2,54 mm (1,0")

            // Posição animada da mala (conforme slider de inserção 0% a 100%)
            const slideOutDist = (1.0 - state.bagInsertPct / 100.0) * 30.0;
            const bagBotLeft = {
                x: seatedBagBotLeft.x + slideOutDist * tx,
                y: seatedBagBotLeft.y + slideOutDist * ty
            };
            const bagBotRight = {
                x: seatedBagBotRight.x + slideOutDist * tx,
                y: seatedBagBotRight.y + slideOutDist * ty
            };
            const bagTopLeft = {
                x: bagSeatedTopLeft.x + slideOutDist * tx,
                y: bagSeatedTopLeft.y + slideOutDist * ty
            };
            const bagTopRight = {
                x: seatedBagTopRight.x + slideOutDist * tx,
                y: seatedBagTopRight.y + slideOutDist * ty
            };

            const roundedBagPathD = buildRoundedRectPath(
                bagBotLeft, bagBotRight, bagTopRight, bagTopLeft,
                tx, ty, nx, ny, 0.85
            );

            // =========================================================================
            // 2. CAVIDADE INTERNA DO BIN AO REDOR DA MALA:
            // =========================================================================
            const padBack = 0.65;
            const padFloor = 0.55;
            const padRoof = 0.65;
            const padFront = 0.25;

            const boxBotLeft = {
                x: seatedBagBotLeft.x - padBack * tx - padFloor * nx,
                y: seatedBagBotLeft.y - padBack * ty - padFloor * ny
            };
            const boxBotRight = {
                x: seatedBagBotRight.x + padFront * tx - padFloor * nx,
                y: seatedBagBotRight.y + padFront * ty - padFloor * ny
            };
            const boxTopLeft = {
                x: bagSeatedTopLeft.x - padBack * tx + padRoof * nx,
                y: bagSeatedTopLeft.y - padBack * ty + padRoof * ny
            };
            const boxTopRight = {
                x: seatedBagTopRight.x + padFront * tx + padRoof * nx,
                y: seatedBagTopRight.y + padFront * ty + padRoof * ny
            };

            const roundedChamberPathD = buildRoundedRectPath(
                boxBotLeft, boxBotRight, boxTopRight, boxTopLeft,
                tx, ty, nx, ny, 1.15
            );

            // =========================================================================
            // 3. PORTA ARREDONDADA AO MÁXIMO POSSÍVEL COM AVANÇO HORIZONTAL MÁXIMO DE 0,5" (1,27 mm)
            //    E BARRIGA INFERIOR DO BIN REDUZIDA PARA 1,0" (2,54 mm) DA MALA:
            // =========================================================================
            const latchDropBelowBagMm = DOOR_KINEMATIC_DELTA.inchMm; // 2.54 mm (1")

            const doorTipInner = {
                x: seatedBagBotRight.x + 0.05 * tx - latchDropBelowBagMm * (-nx),
                y: seatedBagBotRight.y - latchDropBelowBagMm
            };
            const doorTipOuter = {
                x: doorTipInner.x + 1.35,
                y: doorTipInner.y + 0.08
            };

            const doorLipBot = {
                x: doorTipInner.x - 0.15,
                y: doorTipInner.y - 0.05
            };
            const mouthStepIn = {
                x: seatedBagBotRight.x + 0.05,
                y: seatedBagBotRight.y - 0.25
            };

            // Bring the kinematic carriage towards the front lip: the oval door
            // now rocks around a point closer to its edge rather than
            // tilting far backwards around the rear of the bin.
            const pvt = {
                x: seatedBagTopRight.x - 5.65,
                y: seatedBagTopRight.y + 4.00
            };
            // Retraction along the upper guide counters the outward
            // swing; the articulated rod is constructed on the door below.
            const carriageTravel = { x: -9.50, y: 5.20 };
            // SVG porta(5): menor rotação, com deslocamento da folha para cima e para trás.
            const CONVENTIONAL_DOOR_OPEN_DEG = 39.0;

            // No vertical lip/step: the front door meets the continuous
            // upper fuselage arc at this CAD-derived point.
            // Preserve the roof seam in the exact same fuselage location even
            // though the moving carriage has been relocated forwards.
            const roofJoinX = seatedBagTopRight.x - 21.85;
            const fuseTop = {
                x: roofJoinX,
                y: CABIN_YC + Math.sqrt(Math.max(0, CABIN_R * CABIN_R - roofJoinX * roofJoinX))
            };
            // Retained as metadata for the existing elevation calculation.
            const rampTopEnd = { x: fuseTop.x, y: fuseTop.y };

            // Extended, continuous shell-to-lip door: upper outer tip exactly
            // touches the fuselage; inner face follows the curved panel.
            const bladeTopOuter = { x: fuseTop.x, y: fuseTop.y };
            const bladeTopInner = { x: fuseTop.x + 0.90, y: fuseTop.y - 1.10 };

            // Keep the old design target for CAD metadata; the actual opening
            // envelope is now solved from the complete moving quadratic surface.
            const maxBulgeX = SUITCASE.maxDoorBulgeXMm;
            const targetMaxDoorX = doorTipOuter.x + maxBulgeX;

            // The shell seam will share the final door inner Bézier control,
            // so the closed door joins the bottom lip without a visible step.
            const mouthCurveCtrl = {
                x: doorTipOuter.x + 1.00,
                y: (bladeTopInner.y + doorTipInner.y) * 0.5 + 1.00
            };

                        // Barriga inferior enxuta: sai de psuBotCorner (1,0" abaixo do canto inferior esquerdo da mala)
            // e sobe suavemente mantendo a espessura mínima de 1,0" (2,54 mm) abaixo da mala até doorLipBot
            const psuBotCorner = {
                x: seatedBagBotLeft.x,
                y: baseY
            };
            const bellyCtrl = {
                x: (psuBotCorner.x + doorLipBot.x) * 0.5 + 1.2,
                y: (psuBotCorner.y + doorLipBot.y) * 0.5 - 0.35
            };

            const hornPeakY = Math.min(CABIN_YC + CABIN_R - 2.0, boxTopLeft.y + 5.2);
            const hornPeak = { x: -getFuselageX(hornPeakY), y: hornPeakY };
            const notchValley = {
                x: boxTopLeft.x + 2.2 * tx + 0.35 * nx,
                y: boxTopLeft.y + 2.2 * ty + 0.35 * ny
            };
            const notchCtrl = {
                x: (hornPeak.x + notchValley.x) * 0.5 - 0.8,
                y: (hornPeak.y + notchValley.y) * 0.5 - 0.8
            };

            const lugTopLeft = {
                x: pvt.x - 2.4 * tx + 0.3 * nx,
                y: pvt.y - 2.4 * ty + 0.3 * ny
            };
            const lugBotRight = {
                x: pvt.x + 0.8 * tx - 1.15 * nx,
                y: pvt.y + 0.8 * ty - 1.15 * ny
            };

            const brkHubLeft = {
                x: pvt.x - 0.60 * tx + 0.65 * nx,
                y: pvt.y - 0.60 * ty + 0.65 * ny
            };
            const brkHubBot = {
                x: pvt.x - 0.20 * tx - 0.80 * nx,
                y: pvt.y - 0.20 * ty - 0.80 * ny
            };
            const brkJoinTop = {
                x: bladeTopInner.x + 0.08 * tx - 0.05 * nx,
                y: bladeTopInner.y + 0.08 * ty - 0.05 * ny
            };
            const brkJoinBot = {
                x: seatedBagTopRight.x + 1.45,
                y: seatedBagTopRight.y - 2.00
            };
            const bladeMidInner = {
                x: brkJoinBot.x,
                y: brkJoinBot.y
            };

            // Door shaped after the yellow CAD sketch: a nearly horizontal
            // shoulder at the roof, a broad oval transition, then an
            // almost vertical front at the lower lip. Both skins follow
            // the same curve model, preserving the panel thickness.
            const doorOuterCtrl = {
                x: doorTipOuter.x + 2.65,
                y: (bladeTopOuter.y + doorTipOuter.y) * 0.5 + 1.55
            };
            const doorInnerCtrl = {
                x: doorOuterCtrl.x - 1.65,
                y: doorOuterCtrl.y - 0.75
            };
            mouthCurveCtrl.x = doorInnerCtrl.x;
            mouthCurveCtrl.y = doorInnerCtrl.y;

            // A single, asymmetric cubic provides a flatter top tangent
            // and an upright nose. Subdivide it at t=.5 so the existing
            // seven-point silhouette, swept envelope and export paths
            // continue to sample exactly the same rigid oval door.
            function makeFrontOvalProfile(top, tip) {
                const dx = tip.x - top.x;
                const drop = top.y - tip.y;
                const p1 = {
                    x: top.x + 0.34 * dx,
                    y: top.y + 0.045 * drop
                };
                const p2 = {
                    x: tip.x + 0.035 * dx,
                    y: tip.y + 0.53 * drop
                };
                const half = (a, b) => ({
                    x: (a.x + b.x) * 0.5,
                    y: (a.y + b.y) * 0.5
                });
                const a = half(top, p1), b = half(p1, p2), c = half(p2, tip);
                const d = half(a, b), e = half(b, c), crown = half(d, e);
                // Adjacent cubic pieces are C1-continuous at the crown.
                return [top, a, d, crown, e, c, tip];
            }
            const ovalOuter = makeFrontOvalProfile(bladeTopOuter, doorTipOuter);
            const ovalInner = makeFrontOvalProfile(bladeTopInner, doorTipInner);

            // Two revolute joints: a pin on the curved guide and a mounting
            // pin rigidly attached to the *actual oval door*, SVG-style.
            // The rod length stays constant; its angle is independent of
            // the door's angle so it can articulate freely while following it.
            const cubicPoint = (a, b, c, d, t) => {
                const v = 1 - t;
                return { x: v*v*v*a.x + 3*v*v*t*b.x + 3*v*t*t*c.x + t*t*t*d.x,
                         y: v*v*v*a.y + 3*v*v*t*b.y + 3*v*t*t*c.y + t*t*t*d.y };
            };
            // Fix the moving linkage farther toward the FRONT END of the door,
            // on its last curved section, matching the supplied red outline.
            // The upper guide pin is raised inside the bin; the rod remains
            // freely hinged and its guide follows the solved door motion.
            const leverMountLocal = cubicPoint(
                ovalInner[0], ovalInner[1], ovalInner[2], ovalInner[3], 0.18);
            // Pino da guia alto, junto ao teto; articulação na parte superior
            // frontal da folha, conforme as duas posições da referência SVG.
            const leverPinClosed = {
                x: leverMountLocal.x - 3.20,
                y: leverMountLocal.y + 1.35
            };
            const leverDx = leverMountLocal.x - leverPinClosed.x;
            const leverDy = leverMountLocal.y - leverPinClosed.y;
            const leverLength = Math.hypot(leverDx, leverDy);
            const leverStartAngle = Math.atan2(leverDy, leverDx);

            const latchTopOuter = {
                x: doorTipOuter.x + 0.25,
                y: doorTipOuter.y + 2.65
            };
            const latchTopInner = {
                x: doorTipInner.x + 0.25,
                y: doorTipInner.y + 2.55
            };
            const latchHookIn = {
                x: doorTipInner.x - 0.55 * tx + 0.55 * nx,
                y: doorTipInner.y - 0.55 * ty + 0.55 * ny
            };

            function getDoorAtAngle(angDeg) {
                // The door retains one rigid oval blade. Its carriage travels
                // smoothly while a distinct hinged rod drives the visible pin
                // along a curved locus (rather than welding it to the blade).
                const u = Math.min(1, Math.max(0, angDeg / CONVENTIONAL_DOOR_OPEN_DEG));
                const slideU = u*u*(3 - 2*u);
                const carrier = {
                    x: pvt.x + carriageTravel.x * slideU,
                    y: pvt.y + carriageTravel.y * slideU
                };
                const move = (pt) => {
                    const rotated = rotatePointAroundPivot(pt, pvt, angDeg);
                    return { x: rotated.x + carrier.x - pvt.x,
                             y: rotated.y + carrier.y - pvt.y };
                };
                // Both spherical/revolute joints are evaluated every frame;
                // the pin trajectory is solved from the arm's exact length.
                // The pin follows the raised upper guide while the door tip
                // keeps precisely the original open-stop coordinates.
                const leverMount = move(leverMountLocal);
                // Articulação independente: o braço muda sua inclinação durante
                // a abertura, mantendo exatamente o mesmo comprimento.
                const leverAngle = leverStartAngle
                    + (angDeg * Math.PI / 180) * 0.45;
                const pin = {
                    x: leverMount.x - leverLength * Math.cos(leverAngle),
                    y: leverMount.y - leverLength * Math.sin(leverAngle)
                };
                const bHubL = move(brkHubLeft), bHubB = move(brkHubBot);
                const bJoinT = move(brkJoinTop), bJoinB = move(brkJoinBot);
                const topOut = move(bladeTopOuter), topIn = move(bladeTopInner);
                const midIn = move(bladeMidInner);
                const tip = move(doorTipOuter), tipIn = move(doorTipInner);
                const outCurve = ovalOuter.map(move), inCurve = ovalInner.map(move);
                const lTopOut = move(latchTopOuter), lTopIn = move(latchTopInner);
                const lHook = move(latchHookIn);

                let rightmostX = Math.max(tip.x, topOut.x, tipIn.x);
                let highestY = Math.max(tip.y, topOut.y);
                // Extremes use the SAME cubic elliptical curves rendered below.
                for (const curve of [outCurve, inCurve]) {
                    for (const j of [0, 3]) {
                        const a = curve[j], c1 = curve[j+1], c2 = curve[j+2], b = curve[j+3];
                        for (let i = 0; i <= 24; i++) {
                            const u = i / 24, v = 1 - u;
                            const bx = v*v*v*a.x + 3*v*v*u*c1.x + 3*v*u*u*c2.x + u*u*u*b.x;
                            const by = v*v*v*a.y + 3*v*v*u*c1.y + 3*v*u*u*c2.y + u*u*u*b.y;
                            rightmostX = Math.max(rightmostX, bx);
                            highestY = Math.max(highestY, by);
                        }
                    }
                }
                return { pin, leverMount, leverAngle, leverLength,
                    bHubL, bHubB, bJoinT, bJoinB,
                    topOut, topIn, midIn, tip, tipIn, outCurve, inCurve,
                    lTopOut, lTopIn, lHook, rightmostX, highestY };
            }

            function getDoorAtProgress(progress) {
                const u = Math.max(0, Math.min(1, Number(progress) || 0));
                return getDoorAtAngle(u * CONVENTIONAL_DOOR_OPEN_DEG);
            }

            function getDoorTipPosition(progress) {
                return getDoorAtProgress(progress).tip;
            }
            // Construct the physical guide FROM the joint's actual locus.
            // No separate fixed/circular track can desynchronise from it.
            const railPath = [];
            for (let i = 0; i <= 48; i++)
                railPath.push(getDoorAtProgress(i / 48).pin);
            const railStart = railPath[0], railEnd = railPath[railPath.length - 1];

            // True motion: both the swept fill and the dashed boundary sample
            // exactly these poses, never a fixed-radius or legacy-pivot sector.
            const openLimitDeg = CONVENTIONAL_DOOR_OPEN_DEG;
            const progress = Math.max(0, Math.min(1, state.thetaDeg / openLimitDeg));
            const doorClosed = getDoorAtProgress(0);
            const doorCurr = getDoorAtProgress(progress);
            const doorOpen = getDoorAtProgress(1);
            const trailSteps = Math.max(1, Math.ceil(progress / 0.02));
            const doorTipTrail = [];
            const doorPoseTrail = [];
            for (let i = 0; i <= trailSteps; i++) {
                const sampledProgress = progress * i / trailSteps;
                doorTipTrail.push(getDoorTipPosition(sampledProgress));
                doorPoseTrail.push(getDoorAtProgress(sampledProgress));
            }
            // Derive extrema and peak from the identical translated/rotated
            // profile, including the oval shell and the lower moving tip.
            let peakRightX = -Infinity, peakU = 0;
            for (let i = 0; i <= 100; i++) {
                const sampleU = i / 100;
                const candidate = getDoorAtProgress(sampleU).rightmostX;
                if (candidate > peakRightX) {
                    peakRightX = candidate;
                    peakU = sampleU;
                }
            }
            const thetaPeakDeg = peakU * openLimitDeg;
            const doorPeak = getDoorAtProgress(peakU);

            const doorBulgeBeyondTipMm = doorClosed.rightmostX - doorTipOuter.x;
            const corridorMarginPeakMm = CORRIDOR_LEFT_X - peakRightX; // > 0 = livre, 0 = colado na linha do corredor
            const corridorMarginCurrMm = CORRIDOR_LEFT_X - doorCurr.rightmostX;

            const widthClosedMm = doorClosed.rightmostX - wallX;
            const widthPeakMm = peakRightX - wallX;
            const widthOpenMm = doorOpen.rightmostX - wallX;
            const widthCurrMm = doorCurr.rightmostX - wallX;

            // Vão livre perpendicular à rampa quando totalmente aberta
            const openTipProjN = (doorOpen.tipIn.x - seatedBagBotRight.x) * nx + (doorOpen.tipIn.y - seatedBagBotRight.y) * ny;
            const maxMouthClearOpeningMm = openTipProjN;
            const doorClearanceOverBagMm = openTipProjN - SUITCASE.hMm;

            // Carenagem superior do bolsão 23
            const shroudStart = { x: lugTopLeft.x - 1.5 * tx, y: lugTopLeft.y - 1.5 * ty };
            const shroudStep = { x: shroudStart.x + 3.2 * nx, y: shroudStart.y + 3.2 * ny };
            const shroudEnd = { x: doorOpen.tip.x + 1.8, y: doorOpen.tip.y + 2.2 };
            const shroudCtrl = {
                x: (shroudStep.x + shroudEnd.x) * 0.5 - 2.0,
                y: Math.max(shroudStep.y, shroudEnd.y) + 4.8
            };

            const binTotalHeightMm = Math.max(hornPeak.y, rampTopEnd.y) - baseY;

            return {
                baseY, tiltDeg, wallFix, psuBotCorner,
                boxBotLeft, boxBotRight, boxTopRight, boxTopLeft,
                bagBotLeft, bagBotRight, bagTopLeft, bagTopRight,
                roundedBagPathD, roundedChamberPathD,
                seatedBagBotLeft, seatedBagBotRight, seatedBagTopRight, latchDropBelowBagMm,
                bagSeatedTopLeft, bagWallClearanceMm, bagBaseClearanceMm, doorBulgeBeyondTipMm, targetMaxDoorX,
                maxMouthClearOpeningMm, doorClearanceOverBagMm,
                corridorMarginPeakMm, corridorMarginCurrMm,
                hornPeak, notchValley, notchCtrl, rampTopEnd, fuseTop,
                bellyCtrl, doorLipBot, mouthStepIn, mouthCurveCtrl,
                pvt, railStart, railEnd, railPath, doorTipTrail, doorPoseTrail, getDoorTipPosition,
                lugTopLeft, lugBotRight,
                shroudStart, shroudStep, shroudEnd, shroudCtrl,
                thetaPeakDeg, openLimitDeg,
                doorClosed, doorPeak, doorOpen, doorCurr,
                peakRightX, widthClosedMm, widthPeakMm, widthOpenMm, widthCurrMm,
                binTotalHeightMm, tx, ty, nx, ny
            };
        }

        // Busca exata da Altura Y_esq que deixa o Bin o mais próximo possível da linha do corredor (X = -24,50 mm)
        
function alphaTransformPoint(fx, fy, thetaDeg) {
            // arquivo -> CAD (melhor encaixe na fuselagem) e depois rotação em torno do centro da fuselagem
            const A = ALPHA_FIXED;
            const x0 = A.scaleX * fx + A.tx;
            const y0 = A.scaleY * fy + A.ty;
            const cy = -CABIN_YC;
            const th = thetaDeg * Math.PI / 180.0;
            const c = Math.cos(th), s = Math.sin(th);
            return {
                x: (x0) * c - (y0 - cy) * s,
                ys: cy + (x0) * s + (y0 - cy) * c   // y no sistema do SVG (para baixo)
            };
        }

        // Parte de baixo do bin (face inferior = "chão do bin"): do fim do raio do canto até o pé, no contorno amostrado
        const ALPHA_UNDERSIDE = ALPHA_OUTLINE.filter(p => p[0] >= 1354 && p[0] <= 14462 && p[1] >= 18690);

        function alphaFloorHighPoint(thetaDeg) {
            // ponto mais alto do chão do bin (menor y no SVG)
            let best = null;
            for (const p of ALPHA_UNDERSIDE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (best === null || q.ys < best.ys) best = q;
            }
            return { x: best.x, y: -best.ys };
        }

        function alphaExtremeYAtTheta(thetaDeg, kind) {
            // 'floor' = chão do bin no ponto mais alto ; 'base' = ponto mais baixo ; 'top' = ponto mais alto (Y CAD, distância do chão da cabine)
            if (kind === 'floor') return alphaFloorHighPoint(thetaDeg).y;
            let maxYs = -Infinity, minYs = Infinity;
            for (const p of ALPHA_OUTLINE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (q.ys > maxYs) maxYs = q.ys;
                if (q.ys < minYs) minYs = q.ys;
            }
            return kind === 'top' ? -minYs : -maxYs;
        }

        function solveAlphaTheta(targetY, kind) {
            // Y diminui quando theta aumenta (horário no SVG); bisseção
            let lo = (kind === 'top') ? -9 : (kind === 'floor') ? -20 : -15, hi = 30;   // faixa onde Y é monotônico
            for (let i = 0; i < 50; i++) {
                const mid = (lo + hi) / 2;
                if (alphaExtremeYAtTheta(mid, kind) > targetY) lo = mid; else hi = mid;
            }
            return (lo + hi) / 2;
        }

        function computeRightAlphaLocked() {
            const A = ALPHA_FIXED;
            const thetaDeg = solveAlphaTheta(state.alphaTargetY, state.alphaMode);
            let minX = Infinity, maxX = -Infinity, minYs = Infinity, maxYs = -Infinity;
            for (const p of ALPHA_OUTLINE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (q.x < minX) minX = q.x;
                if (q.x > maxX) maxX = q.x;
                if (q.ys < minYs) minYs = q.ys;
                if (q.ys > maxYs) maxYs = q.ys;
            }
            const wall = alphaTransformPoint(A.wallFix.fx, A.wallFix.fy, thetaDeg);
            const top = alphaTransformPoint(A.topFuse.fx, A.topFuse.fy, thetaDeg);
            const floorHigh = alphaFloorHighPoint(thetaDeg);
            return {
                thetaDeg,
                floorHighX: floorHigh.x,
                floorHighY: floorHigh.y,
                baseY: -maxYs,
                topY: -minYs,
                widthMm: maxX - minX,
                heightMm: maxYs - minYs,
                leftFaceX: minX,
                wallRightX: wall.x,
                wallY: -wall.ys,
                topFuseX: top.x,
                topFuseY: -top.ys
            };
        }

        // Geometria CAD única do ALPHA: os pontos do piso são extraídos do
        // mesmo contorno usado pela aba 5, sem reconstituir um bin aproximado.
        window.getUniAlphaGeometry = () => {
            state.alphaMode = 'floor';
            state.alphaTargetY = 148.70;
            const alpha = computeRightAlphaLocked();
            const floorPts = ALPHA_OUTLINE
                .filter(p => p[0] >= 1354 && p[0] <= 19007 && p[1] >= 18690)
                .map(p => {
                    const q = alphaTransformPoint(p[0], p[1], alpha.thetaDeg);
                    return { x: q.x, y: -q.ys };
                })
                .sort((a, b) => a.x - b.x);
            return { ...alpha, floorPts };
        };





        
const ALPHA_DOOR_FRACTION = 0.6;
        const ALPHA_TRACK = [[983.6, 18177.0], [934.5, 17988.6], [921.6, 17883.4], [908.6, 17755.0], [895.6, 17603.3], [894.3, 17440.8], [893.4, 17278.2], [893.0, 17115.7], [893.0, 16953.1], [893.3, 16790.5], [893.8, 16627.9], [894.5, 16465.4], [895.4, 16302.8], [896.4, 16140.2], [897.5, 15977.7], [898.7, 15815.1], [899.9, 15652.5], [901.1, 15490.0], [902.3, 15327.4], [903.5, 15164.8], [904.5, 15002.3], [905.1, 14839.7], [905.5, 14677.2], [905.7, 14514.6], [905.7, 14352.0], [905.5, 14189.5], [905.2, 14026.9], [905.0, 13864.3], [905.0, 13701.8], [905.2, 13539.2], [905.5, 13376.6], [906.0, 13214.1], [906.8, 13051.5], [907.7, 12888.9], [908.8, 12726.4], [910.1, 12563.8], [911.7, 12401.2], [913.6, 12238.7], [915.7, 12076.1], [918.1, 11913.6], [921.0, 11751.1], [925.7, 11588.6], [935.3, 11426.8], [952.1, 11266.5], [978.2, 11108.4], [1015.3, 10953.6], [1064.7, 10803.1], [1127.3, 10657.6], [1203.0, 10518.3], [1289.7, 10385.5], [1385.8, 10259.7], [1490.2, 10141.0], [1602.1, 10029.8], [1720.6, 9926.5], [1845.5, 9831.6], [1976.0, 9745.7], [2111.9, 9669.5], [2252.5, 9603.7], [2397.3, 9549.4], [2545.6, 9506.9], [2696.6, 9475.1], [2849.7, 9452.7], [3004.1, 9438.0], [3159.3, 9429.5], [3315.0, 9425.1], [3470.8, 9422.9], [3626.6, 9421.3], [3782.4, 9420.1], [3938.2, 9419.2], [4094.0, 9418.5], [4249.8, 9418.1], [4405.6, 9418.0], [4561.5, 9418.0], [4717.3, 9418.3], [4873.1, 9418.7], [5028.9, 9419.4], [5184.7, 9420.1], [5340.5, 9421.1], [5496.3, 9422.2], [5652.1, 9423.5], [5807.9, 9424.9], [5963.7, 9426.5], [6119.5, 9428.2], [6275.3, 9430.2], [6431.1, 9432.4], [6586.9, 9434.9], [6742.3, 9440.0], [6896.2, 9453.2], [7048.7, 9474.5], [7199.4, 9504.3], [7348.4, 9542.8], [7495.5, 9590.1], [7640.7, 9646.4], [7784.3, 9709.5], [7927.2, 9774.1], [8069.5, 9840.3], [8211.2, 9907.7], [8352.4, 9976.4], [8493.1, 10046.2], [8633.3, 10117.1], [8773.1, 10188.9], [8912.4, 10261.7], [9051.3, 10335.4], [9189.8, 10409.9], [9327.8, 10485.1], [9465.5, 10561.2], [9602.9, 10637.9], [9739.9, 10715.4], [9876.5, 10793.6], [10012.7, 10872.4], [10148.7, 10951.9], [10284.2, 11031.9], [10419.5, 11112.6], [10554.4, 11193.9], [10689.0, 11275.8], [10823.3, 11358.2], [10957.3, 11441.2], [11090.9, 11524.8], [11224.2, 11608.9], [11357.2, 11693.6], [11489.9, 11778.9], [11622.2, 11864.7], [11754.2, 11951.1], [11885.8, 12038.1], [12017.1, 12125.7], [12147.9, 12213.9], [12278.4, 12302.8], [12408.4, 12392.3], [12538.0, 12482.5], [12667.1, 12573.5], [12795.7, 12665.3], [12923.7, 12758.0], [13051.1, 12851.6], [13177.7, 12946.3], [13303.4, 13042.3], [13428.1, 13139.7], [13551.2, 13239.1], [13656.3, 13325.1], [13743.3, 13397.3], [13914.6, 13545.5]];
        const ALPHA_TRACK_CUM = (() => {
            const c = [0];
            for (let i = 1; i < ALPHA_TRACK.length; i++) {
                c.push(c[i - 1] + Math.hypot(
                    (ALPHA_TRACK[i][0] - ALPHA_TRACK[i - 1][0]) * ALPHA_FIXED.scaleX,
                    (ALPHA_TRACK[i][1] - ALPHA_TRACK[i - 1][1]) * ALPHA_FIXED.scaleY));
            }
            return c;
        })();
        const ALPHA_TRACK_LEN = ALPHA_TRACK_CUM[ALPHA_TRACK_CUM.length - 1];

        function alphaTrackPointAt(sLen) {
            const sc = Math.min(ALPHA_TRACK_LEN, Math.max(0, sLen));
            let k = 1;
            while (k < ALPHA_TRACK_CUM.length - 1 && ALPHA_TRACK_CUM[k] < sc) k++;
            const s0 = ALPHA_TRACK_CUM[k - 1], s1 = ALPHA_TRACK_CUM[k];
            const t = s1 > s0 ? (sc - s0) / (s1 - s0) : 0;
            return [
                ALPHA_TRACK[k - 1][0] + t * (ALPHA_TRACK[k][0] - ALPHA_TRACK[k - 1][0]),
                ALPHA_TRACK[k - 1][1] + t * (ALPHA_TRACK[k][1] - ALPHA_TRACK[k - 1][1]),
                k
            ];
        }

        
const ALPHA_SOURCE_INNER = "M4718.42 9485.38c-214.12,0.81 -429.94,2.25 -641.83,4.41l352.14 -29.41 289.69 25zm2127.97 9324.57c173.23,20.07 4783.24,1463.75 7441.85,2269.76 269.04,81.57 231.16,66 285.96,-107.54 867.87,-2748.09 1097.41,-3491.21 1673.7,-5248.79 9.74,-29.73 8.13,-61.42 -43.87,-76.53 -3492.18,-1015.29 -5023.73,-1471.38 -8593.64,-2591.56 -298.02,-93.51 -290.91,-64.93 -279.93,-201.23 19.85,-246.45 151.82,-1535.56 254.98,-2560.26 1.48,-14.72 22.96,-108.98 -36.07,-111.59 -832.99,-36.88 -1440.65,-102.86 -2879.76,-226.66 0,0 5.86,-158.31 5.86,-158.31 8.83,-4.76 1771.35,140.94 2600.82,208.54 0,0 300.69,24.27 389.9,31.35 109.36,8.67 74.66,-29.11 71,174.4 -34.48,504.83 -182.03,2096.64 -232.75,2587.73 -4.75,46.04 36.17,45.22 106.54,65.92 1478.53,434.84 6375.86,1955.86 8715.62,2705.53 52.81,16.93 49.9,85.26 45.52,100.98 -733.13,2632.17 -1148.1,3891.36 -1703.23,5603.79 -31.63,97.59 -83.68,127.7 -151.76,98.03 -1555.27,-677.82 -7558.09,-2410.61 -7736.53,-2430.98 -1417.28,-161.82 -3663.67,-335.71 -6042.78,-517.78 -13.85,-1.06 -14.42,-118.86 -15.94,-135.27l108.03 -0.5c3195.42,265.29 4073.69,295.85 6016.48,520.97z";
const ALPHA_LOWER_TRIANGLE = "M14961.99 20758.65c-85.66,309.78 -127.08,449.15 360.07,447.47 1362.33,-4.67 2677.83,-3.44 3513.63,0.33 172.07,0.78 116.56,12.2 736.9,-266.11 705.95,-316.68 688.93,-298.46 270.73,-866.8 -233.47,-317.27 -642.53,-992.86 -1173.19,-1641.87 -739.72,-904.66 -1116,-1320.04 -1917,-2193.68 -120.31,-131.22 -283.21,-194.03 -391.35,31.97 -314.52,657.26 -1345.16,4291.15 -1399.79,4488.69z";
const ALPHA_UPPER_DETAIL = "M1027.50 7728.56c-16,119.92 -18.41,1194.82 -15.03,1296.15 3.03,90.69 5.13,197.82 245.31,203.09 1524.04,33.41 1656.84,12.16 4148.17,-19.87 357.22,-4.59 220.49,-358.68 -1.78,-428.79 -684.77,-216.07 -1461.52,-476.13 -4182.27,-1174.08 -115.02,-29.5 -188.87,67.22 -194.4,123.5z";
const ALPHA_SOURCE_RAIL = "M2882.1 9351.24c1471.11,-22.74 4303.84,34.27 4303.84,34.27 1742.73,656.48 5627.94,3009.22 6802.31,4120.07 175.53,166.05 14.14,240.82 -147.23,79.85 -507.4,-506.07 -3977.45,-3048.69 -6694.76,-4074.36 -59.29,-22.4 -2723.79,-46.73 -4233.04,0.86 -1154.02,36.42 -1896.4,1192.08 -1896.4,1783.58 0,1746.41 -59.63,5060.41 -38.39,6756.2 1.76,141.04 -3.99,215.54 10.42,250.67 0,0 -158.94,-13.4 -158.94,-13.4 -37.94,-1107.33 -8.39,-2118.83 -6.04,-3681.79 0,-8.97 -53.02,-2138.4 27.41,-3461.37 50.33,-827.95 1110.61,-1780.35 2030.82,-1794.58z";
const clamp = n => Math.max(0, Math.min(1, n));
const color = { conventional: APHA_CABIN_PALETTE.neutral, alpha: APHA_CABIN_PALETTE.mid,
                underside: APHA_CABIN_PALETTE.muted, border: APHA_CABIN_PALETTE.binOutline,
                cavity: APHA_CABIN_PALETTE.binCavity };
// Single CAD styling source for the Alpha body in tabs 5 and 6.
// Keep the exact SVG paths; do not replace them with generic rectangles.
const ALPHA_CAD_STYLE = Object.freeze({
    shell: 'rgba(74, 144, 226, 0.45)',
    shellAt: opacity => `rgba(74, 144, 226, ${Math.max(0, Math.min(1, opacity))})`,
    outline: '#4a90e2',
    inner: '#2a6fc9',
    innerWash: 'rgba(74, 144, 226, 0.16)'
});
function paintPath(ctx, d, fill, stroke, lw, evenodd) {
    const p = new Path2D(d);
    if (fill) { ctx.fillStyle = fill; ctx.fill(p, evenodd ? 'evenodd' : 'nonzero'); }
    if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(p); }
}
// A folga até a cabeça usa os mesmos perfis CAD em centímetros da renderização.
// A interseção vertical encontra a face inferior efetiva em cada assento,
// sem recorrer aos vetores aproximados da versão anterior dos bins.
let referenceBinUndersides = { conventional: [], alpha: [] };
function lowerBinSurfaceAtX(points, x) {
    if (!Number.isFinite(x) || !points || points.length < 2) return null;
    let lower = Infinity;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
        if (Math.abs(b.x - a.x) < 1e-9) {
            lower = Math.min(lower, a.y, b.y);
        } else {
            const t = (x - a.x) / (b.x - a.x);
            lower = Math.min(lower, a.y + t * (b.y - a.y));
        }
    }
    return Number.isFinite(lower) ? lower : null;
}
// Guarda os controles originais da curva inferior (quadrática) para que
// a cota coincida com o CAD, sem erro de discretização dos 100 segmentos.
let referenceConventionalBelly = null;
function exactConventionalUndersideY(x) {
    if (!Number.isFinite(x) || !referenceConventionalBelly) return null;
    // Intersecta a vertical da cabeça com as curvas cúbicas efetivamente
    // desenhadas no casco convencional (inclusive a barriga inferior).
    const cubics = referenceConventionalBelly.cubics;
    if (!cubics || !cubics.length) return null;
    const candidates = [];
    const bez = (a, b, c, d, t, axis) => {
        const u = 1-t;
        return u*u*u*a[axis] + 3*u*u*t*b[axis] + 3*u*t*t*c[axis] + t*t*t*d[axis];
    };
    for (const [p0, p1, p2, p3] of cubics) {
        const A = -p0.x + 3*p1.x - 3*p2.x + p3.x;
        const B = 3*p0.x - 6*p1.x + 3*p2.x;
        const C = 3*(p1.x - p0.x);
        // Dividir por extremos em X garante intervalos monotônicos da Bézier.
        const stops = [0, 1];
        const qa = 3*A, qb = 2*B, qc = C;
        if (Math.abs(qa) < 1e-12) {
            if (Math.abs(qb) > 1e-12) stops.push(-qc/qb);
        } else {
            const disc = qb*qb - 4*qa*qc;
            if (disc >= 0) {
                stops.push((-qb-Math.sqrt(disc))/(2*qa));
                stops.push((-qb+Math.sqrt(disc))/(2*qa));
            }
        }
        const ts = [...new Set(stops.filter(t => t >= 0 && t <= 1))].sort((a,b) => a-b);
        for (let i=1; i<ts.length; i++) {
            let lo=ts[i-1], hi=ts[i];
            const xl=bez(p0,p1,p2,p3,lo,'x'), xh=bez(p0,p1,p2,p3,hi,'x');
            if (x < Math.min(xl,xh)-1e-7 || x > Math.max(xl,xh)+1e-7) continue;
            const ascending = xh >= xl;
            for (let j=0; j<48; j++) {
                const mid=(lo+hi)/2;
                if ((bez(p0,p1,p2,p3,mid,'x') < x) === ascending) lo=mid;
                else hi=mid;
            }
            candidates.push(bez(p0,p1,p2,p3,(lo+hi)/2,'y'));
        }
    }
    return candidates.length ? Math.min(...candidates) : null;
}
window.getUniBinUndersideY = (x, isAlpha) =>
    isAlpha ? lowerBinSurfaceAtX(referenceBinUndersides.alpha, x) : exactConventionalUndersideY(x);

function drawReferenceBins(ctx, W, H, fadeConv, fadeAlpha, overrideDoorU) {
    const cabin = window.cabinSectionReference;
    if (!cabin) return;
    // A aba 6 move a porta independentemente, sem alterar a aba 5.
    const map = cabin.map(W, H);
    const u = clamp(Number(overrideDoorU == null ? window.__uniRefDoorProgress : overrideDoorU) || 0);
    state.leftBaseY = 138.50;
    state.alphaMode = 'floor';
    state.alphaTargetY = 148.70;
    state.alphaDoorU = u;
    state.bagInsertPct = 100;
    state.thetaDeg = 0;
    const initialConv = computeLeftBinAtY(state.leftBaseY);
    // O intradorso de medição será capturado do Path2D cúbico realmente desenhado.
    referenceConventionalBelly = null;
    state.thetaDeg = u * initialConv.openLimitDeg;
    const conventional = computeLeftBinAtY(state.leftBaseY);
    const alpha = computeRightAlphaLocked();

    // Perfil fechado do convencional: base reta + barriga quadrática até a boca.
    // Perfil ALPHA: contorno externo amostrado do SVG, com escala e rotação reais.
    // São atualizados a cada render, inclusive quando mudarem parâmetros CAD.
    const convBottom = [initialConv.wallFix, initialConv.psuBotCorner];
    for (let i = 1; i <= 100; i++) {
        const t = i / 100, v = 1 - t;
        const p0 = initialConv.psuBotCorner, p1 = initialConv.bellyCtrl, p2 = initialConv.doorLipBot;
        convBottom.push({
            x: v*v*p0.x + 2*v*t*p1.x + t*t*p2.x,
            y: v*v*p0.y + 2*v*t*p1.y + t*t*p2.y
        });
    }
    convBottom.push(initialConv.doorClosed.tip);
    referenceBinUndersides = {
        conventional: convBottom,
        alpha: ALPHA_OUTLINE.map(p => {
            const q = alphaTransformPoint(p[0], p[1], alpha.thetaDeg);
            return { x: q.x, y: -q.ys };
        })
    };

    // Original CAD SVG has downward-positive Y. Map to existing Tab 5 cabin.
    ctx.save();
    ctx.translate(map.toX(0), map.toY(0));
    ctx.scale(map.scale, map.scale);


    if (fadeConv > 0.001) {
        // Conventional bin replaced with the geometry and pivoted-door mechanism
        // from bin_aeronave_simples.html (fixed CAD dimensions in centimetres).
        ctx.save();
        ctx.globalAlpha *= clamp(fadeConv);
        const R = 137, CY = 63, bottomY = 138.50, floorY = 153.04;
        const wallX = -Math.sqrt(R*R-(bottomY-CY)**2);
        const src = {x0:8322.484375, y1:21044.689453125,
                     xr:34924.74609375, yTip:15503};
        const sx = 89.94/(src.xr-src.x0);
        const sy = (floorY-bottomY)/(src.y1-src.yTip);
        const tx0 = wallX-sx*src.x0, ty0 = -bottomY-sy*src.y1;
        const W = p => ({x:tx0+sx*p[0], y:-(ty0+sy*p[1])});
        const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        const bez = (a,b,c,d,t) => {
            const v=1-t;
            return {x:v*v*v*a.x+3*v*v*t*b.x+3*v*t*t*c.x+t*t*t*d.x,
                    y:v*v*v*a.y+3*v*v*t*b.y+3*v*t*t*c.y+t*t*t*d.y};
        };
        const P0=[31351.74,17756.88];
        const B1=[35439.76,15651.22],B2=[34920.23,14193.14],B3=[34102.58,10805.54];
        const dt=.713, a01=mix(P0,B1,dt),a12=mix(B1,B2,dt),a23=mix(B2,B3,dt);
        const a012=mix(a01,a12,dt),a123=mix(a12,a23,dt),dd=mix(a012,a123,dt);
        const D=W(dd),S={x:-49.5,y:CY+Math.sqrt(R*R-49.5*49.5)};
        const w1=W(a012),w2=W(a123),vv=Math.hypot(w2.x-w1.x,w2.y-w1.y);
        const tangent={x:(w2.x-w1.x)/vv,y:(w2.y-w1.y)/vv};
        const L=Math.hypot(S.x-D.x,S.y-D.y),th=-1.47*Math.PI/180;
        const c1={x:D.x+tangent.x*.267*L,y:D.y+tangent.y*.267*L};
        const c2={x:S.x+Math.cos(th)*.487*L,y:S.y-Math.sin(th)*.487*L};
        const bottom0=W([8325.33,20728.07]);
        const edge=[];
        const e0=W(P0),e1=W(a01),e2=W(a012);
        for(let k=0;k<=90;k++)edge.push(bez(e0,e1,e2,D,k/90));
        for(let k=1;k<=140;k++)edge.push(bez(D,c1,c2,S,k/140));
        const cumulative=[0];
        let outermost=0;
        for(let i=1;i<edge.length;i++){
            cumulative.push(cumulative[i-1]+Math.hypot(edge[i].x-edge[i-1].x,edge[i].y-edge[i-1].y));
            if(edge[i].x>edge[outermost].x)outermost=i;
        }
        const sample=dist=>{
            dist=Math.max(0,Math.min(cumulative[cumulative.length-1],dist));
            let i=1;while(i<cumulative.length-1&&cumulative[i]<dist)i++;
            const f=(dist-cumulative[i-1])/Math.max(1e-9,cumulative[i]-cumulative[i-1]);
            const dx=edge[i].x-edge[i-1].x,dy=edge[i].y-edge[i-1].y;
            const mag=Math.hypot(dx,dy)||1;
            return {p:{x:edge[i-1].x+dx*f,y:edge[i-1].y+dy*f},
                    n:{x:dy/mag,y:-dx/mag}};
        };
        const start=Math.max(0,cumulative[outermost]-4);
        const end=Math.min(cumulative[cumulative.length-1],start+38);
        const N=Math.max(4,Math.round((end-start)/.4));
        const ext=[],inner=[],norm=[];
        const offset=Math.max(0,89.94-(edge[outermost].x-wallX));
        for(let k=0;k<=N;k++){
            const a=sample(start+(end-start)*k/N),q=a.n;
            const o={x:a.p.x+offset*q.x,y:a.p.y+offset*q.y};
            ext.push(o);norm.push(q);
            inner.push({x:o.x-1.2*q.x,y:o.y-1.2*q.y});
        }
        const pivot={x:ext[N].x-2.4*norm[N].x,y:ext[N].y-2.4*norm[N].y};
        const turn=(p,angle)=>{
            const r=angle*Math.PI/180,c=Math.cos(r),si=Math.sin(r),dx=p.x-pivot.x,dy=p.y-pivot.y;
            return {x:pivot.x+dx*c-dy*si,y:pivot.y+dx*si+dy*c};
        };
        const polyPath=pts=>{
            const p=new Path2D();pts.forEach((v,i)=>i?p.lineTo(v.x,-v.y):p.moveTo(v.x,-v.y));
            p.closePath();return p;
        };
        // Exact reference shell: lower cubic floor, continuous fuselage arc and oval front.
        const shell=new Path2D();
        const Ep={x:-Math.sqrt(Math.max(0,R*R-(bottom0.y-CY)**2)),y:bottom0.y};
        shell.moveTo(Ep.x,-Ep.y);
        const cB1=W([8570.39,21313.78]),cB2=W([19845.34,20898.17]),bEnd=W([20243.48,20945.80]);
        const cC1=W([21136.70,21052.74]),cC2=W([30508.64,18191.16]);
        shell.bezierCurveTo(cB1.x,-cB1.y,cB2.x,-cB2.y,bEnd.x,-bEnd.y);
        shell.bezierCurveTo(cC1.x,-cC1.y,cC2.x,-cC2.y,e0.x,-e0.y);
        shell.bezierCurveTo(e1.x,-e1.y,e2.x,-e2.y,D.x,-D.y);
        shell.bezierCurveTo(c1.x,-c1.y,c2.x,-c2.y,S.x,-S.y);
        // A cota de headroom usa exatamente estas quatro curvas cúbicas do
        // intradorso desenhado, não a curva quadrática do bin legado.
        referenceConventionalBelly = { cubics: [
            [Ep,cB1,cB2,bEnd], [bEnd,cC1,cC2,e0],
            [e0,e1,e2,D], [D,c1,c2,S]
        ] };
        // Return along the aircraft's circular shell.
        const angS=Math.atan2(-S.y+CY,S.x),angE=Math.atan2(-Ep.y+CY,Ep.x);
        const sweep=angE-angS;
        for(let j=1;j<=70;j++){
            const angle=angS+sweep*j/70;
            shell.lineTo(R*Math.cos(angle),-(CY-R*Math.sin(angle)));
        }
        shell.closePath();
        const blade=polyPath(ext.concat(inner.slice().reverse()));
        // Remove closed-door leaf region from shell, making the interior visible as it opens.
        const cavity=new Path2D();
        cavity.addPath(shell);cavity.addPath(blade);
        ctx.fillStyle='#9ba9b5';
        ctx.fill(cavity,'evenodd');
        ctx.strokeStyle='#273e57';ctx.lineWidth=.55;ctx.stroke(shell);
        const max=82;
        const angle=u*max;
        const poses=ext.map(p=>turn(p,angle)),ins=inner.map(p=>turn(p,angle));
        if(overrideDoorU==null&&u>0){
            const sweepPath=new Path2D();
            for(let j=0;j<=Math.ceil(angle);j++){
                const a=angle*j/Math.max(1,Math.ceil(angle));
                sweepPath.addPath(polyPath(ext.map(p=>turn(p,a)).concat(inner.map(p=>turn(p,a)).reverse())));
            }
            ctx.save();ctx.fillStyle='rgba(255,107,0,.16)';ctx.fill(sweepPath);
            const t0={x:(ext[0].x+inner[0].x)/2,y:(ext[0].y+inner[0].y)/2};
            ctx.beginPath();
            for(let j=0;j<=55;j++){const p=turn(t0,angle*j/55);j?ctx.lineTo(p.x,-p.y):ctx.moveTo(p.x,-p.y);}
            ctx.strokeStyle='#FE6B00';ctx.lineWidth=.7;ctx.setLineDash([.9,1.1]);ctx.stroke();
            ctx.restore();
        }
        // Curved laminate, latch and rigid arm rotate together around the upper pivot.
        const armEnd=inner[Math.max(0,N-Math.round(7/.4))];
        ctx.save();ctx.translate(pivot.x,-pivot.y);ctx.rotate(-angle*Math.PI/180);
        ctx.translate(-pivot.x,pivot.y);
        const arm=new Path2D();
        arm.moveTo(pivot.x,-pivot.y);arm.lineTo(armEnd.x,-armEnd.y);
        ctx.strokeStyle='#373435';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.stroke(arm);
        ctx.strokeStyle='#7A75B5';ctx.lineWidth=1.8;ctx.stroke(arm);
        ctx.fillStyle='#aebecb';ctx.strokeStyle='#273e57';ctx.lineWidth=.4;
        ctx.fill(blade);ctx.stroke(blade);
        const latch=polyPath(ext.slice(0,7).concat(inner.slice(0,7).reverse()));
        ctx.fillStyle='#72869e';ctx.fill(latch);ctx.stroke(latch);
        ctx.restore();
        ctx.beginPath();ctx.arc(pivot.x,-pivot.y,1.08,0,2*Math.PI);
        ctx.fillStyle='#b9c9e0';ctx.fill();ctx.lineWidth=.4;ctx.strokeStyle='#373435';ctx.stroke();
        ctx.beginPath();ctx.arc(pivot.x,-pivot.y,.38,0,2*Math.PI);ctx.fillStyle='#1e293b';ctx.fill();
        ctx.restore();
    }

    if (fadeAlpha > 0.001) {
        ctx.save(); ctx.globalAlpha *= clamp(fadeAlpha);
        ctx.translate(0, -CABIN_YC);
        ctx.rotate(alpha.thetaDeg * Math.PI / 180);
        ctx.translate(0, CABIN_YC);
        ctx.translate(ALPHA_FIXED.tx, ALPHA_FIXED.ty);
        ctx.scale(ALPHA_FIXED.scaleX, ALPHA_FIXED.scaleY);
        // Contorno CAD único e vazados estruturais preservados nas Abas 5 e 6.
        const alphaShell = new Path2D();
        ALPHA_OUTLINE.forEach((p, i) => i ? alphaShell.lineTo(p[0], p[1]) : alphaShell.moveTo(p[0], p[1]));
        alphaShell.closePath();
        // Mesmo corpo, recortes, preenchimento e borda nas Abas 5 e 6.
        // A diferença entre as abas é somente o tempo da porta e a telemetria.
        {
            // Os triângulos são subpaths de recorte reais: a malha azul-escura
            // da cabine aparece através deles, sem apagar a fuselagem de fundo.
            const alphaWithCutouts = new Path2D(alphaShell);
            alphaWithCutouts.addPath(new Path2D(ALPHA_UPPER_DETAIL));
            alphaWithCutouts.addPath(new Path2D(ALPHA_LOWER_TRIANGLE));
            ctx.save();
            ctx.clip(alphaShell);
            // Aba 5: corpo mais visível (0.75). Aba 6: semitransparente (0.45).
            // A ponte atualiza a opacidade progressivamente sem modificar o SVG.
            const bodyOpacity = Number.isFinite(window.__aphaAlphaBodyOpacity)
                ? window.__aphaAlphaBodyOpacity
                : (overrideDoorU == null ? 0.75 : 0.45);
            ctx.fillStyle = ALPHA_CAD_STYLE.shellAt(bodyOpacity);
            ctx.fill(alphaWithCutouts, 'evenodd');
            ctx.restore();
            // Escurecimento progressivo da cavidade quando a persiana recolhe:
            // preserva os recortes reais e reforça apenas a borda estrutural.
            if (u > 0.001) {
                ctx.save();
                ctx.clip(alphaShell);
                // A cavidade aberta é sombreada levemente, não coberta por uma
                // máscara opaca que esconderia o conteúdo atrás da parede.
                ctx.fillStyle = APHA_CABIN_PALETTE.rgba('darkOutline', 0.18 * u);
                ctx.fill(alphaWithCutouts, 'evenodd');
                ctx.restore();
            }
            ctx.lineWidth = 105 + 250 * u;
            ctx.strokeStyle = ALPHA_CAD_STYLE.outline;
            ctx.stroke(alphaShell);
            // Somente bordas finas dos vazados; nenhum preenchimento opaco.
            paintPath(ctx, ALPHA_UPPER_DETAIL, null, 'rgba(39,62,87,0.75)', 70);
            ctx.beginPath();
            ctx.moveTo(2882.10, 9351.24);
            ctx.bezierCurveTo(4353.21, 9328.50, 7185.94, 9385.51, 7185.94, 9385.51);
            ctx.lineWidth = 78; ctx.strokeStyle = '#8298b2'; ctx.stroke();
            // Interior escalonado: reutiliza os paths SVG originais, não linhas
            // aproximadas. Primeiro o preenchimento translúcido da parede,
            // depois o perfil em escada em azul mais escuro, sempre recortado
            // dentro do contorno externo para não criar resíduos visuais.
            ctx.save();
            ctx.clip(alphaShell);
            paintPath(ctx, ALPHA_SOURCE_RAIL,
                ALPHA_CAD_STYLE.innerWash, ALPHA_CAD_STYLE.inner, 120);
            paintPath(ctx, ALPHA_SOURCE_INNER,
                null, ALPHA_CAD_STYLE.inner, 95);
            ctx.restore();
            ctx.beginPath();
            ALPHA_TRACK.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
            ctx.lineWidth = 155; ctx.strokeStyle = '#8DD7FF'; ctx.stroke();
            // Triângulo inferior direito também realmente vazado.
            paintPath(ctx, ALPHA_LOWER_TRIANGLE, null, 'rgba(39,62,87,0.75)', 85);
        }
        // Porta rolante compartilhada pelas abas 5 e 6, acompanhando
        // o trilho curvo existente sem alterar os vazados estruturais.
        // Door occupies 60% of the sampled curved track and never leaves its ends.
        const doorLen = ALPHA_TRACK_LEN * ALPHA_DOOR_FRACTION;
        const start = u * (ALPHA_TRACK_LEN - doorLen), end = start + doorLen;
        const a = alphaTrackPointAt(start), b = alphaTrackPointAt(end);
        const pts = [[a[0], a[1]]];
        for (let i = a[2]; i < b[2]; i++) {
            if (ALPHA_TRACK_CUM[i] > start && ALPHA_TRACK_CUM[i] < end) pts.push(ALPHA_TRACK[i]);
        }
        pts.push([b[0], b[1]]);
        // Visual opening envelope follows the exact section vacated by the door.
        // The closed frontal surface stays semi-opaque; opening reveals the shell.
        if (start > 0.001) {
            ctx.save();
            ctx.clip(alphaShell);
            ctx.beginPath();
            const freeSamples = Math.max(12, Math.ceil(start / 120));
            for (let i = 0; i <= freeSamples; i++) {
                const p = alphaTrackPointAt(start * i / freeSamples);
                i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
            }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            // The pale opened region exposes structure without painting an opaque face.
            ctx.strokeStyle = 'rgba(5, 14, 32,' + (0.42 + 0.5 * u).toFixed(3) + ')';
            ctx.lineWidth = 1100;
            ctx.stroke();
            ctx.restore();
        }
        ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]));
        ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
        {
            // Porta tambour compartilhada: somente a porta recebe o laranja,
            // sem recolorir o trilho, a fuselagem, a cabine ou as malas.
            // A exceção à paleta fica ativa apenas durante o desenho das lâminas.
            const previousTambourOrange = window.__aphaTambourOrange;
            window.__aphaTambourOrange = true;
            try {
                ctx.lineWidth = 610; ctx.strokeStyle = '#B84A16'; ctx.stroke();
                ctx.lineWidth = 505; ctx.strokeStyle = '#FF8A45'; ctx.stroke();
                ctx.lineWidth = 380; ctx.strokeStyle = '#FF6B1A'; ctx.stroke();
                for (let d = start + 260; d < end - 240; d += 420) {
                    const pt = alphaTrackPointAt(d);
                    const prev = alphaTrackPointAt(Math.max(start, d - 50));
                    const next = alphaTrackPointAt(Math.min(end, d + 50));
                    const dx = next[0] - prev[0], dy = next[1] - prev[1];
                    const length = Math.hypot(dx, dy);
                    if (length < 0.001) continue;
                    const nx = -dy / length, ny = dx / length;
                    ctx.beginPath();
                    ctx.moveTo(pt[0] - nx * 242, pt[1] - ny * 242);
                    ctx.lineTo(pt[0] + nx * 242, pt[1] + ny * 242);
                    ctx.lineWidth = 75;
                    ctx.strokeStyle = '#A43D12';
                    ctx.stroke();
                }
            } finally {
                window.__aphaTambourOrange = previousTambourOrange;
            }
        }
        if (overrideDoorU == null) {
            // High-contrast leading grip sits on the actual moving door endpoint.
            const grip = alphaTrackPointAt(start);
            ctx.save();
            ctx.beginPath(); ctx.arc(grip[0], grip[1], 295, 0, Math.PI * 2);
            ctx.fillStyle = '#e4f6ff'; ctx.fill();
            ctx.lineWidth = 115; ctx.strokeStyle = '#0a2b46'; ctx.stroke();
            ctx.beginPath(); ctx.arc(grip[0], grip[1], 115, 0, Math.PI * 2);
            ctx.fillStyle = '#2185c0'; ctx.fill();
            ctx.restore();

            // Orange dashes are revealed ONLY along the now-clear opening,
            // never along the fixed upper track or beneath the retracted slats.
            if (start > 0.001) {
                ctx.save(); ctx.clip(alphaShell);
                ctx.beginPath();
                const n = Math.max(8, Math.ceil(start / 135));
                for (let i = 0; i <= n; i++) {
                    const q = alphaTrackPointAt(start * i / n);
                    i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
                }
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.strokeStyle = 'rgba(255,107,0,0.25)'; ctx.lineWidth = 430; ctx.stroke();
                ctx.strokeStyle = '#ffae63'; ctx.lineWidth = 185;
                ctx.setLineDash([360, 230]); ctx.stroke();
                ctx.restore();
            }
            // Curved direction arrow uses the real upper guide tangent during motion.
            if (u > 0.025 && u < 0.985) {
                const sArrow = Math.min(ALPHA_TRACK_LEN - 1250, Math.max(start + 1200, ALPHA_TRACK_LEN * .56));
                const p0 = alphaTrackPointAt(sArrow), p1 = alphaTrackPointAt(sArrow + 1100);
                const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
                const vl = Math.hypot(vx, vy) || 1, tx = vx/vl, ty = vy/vl;
                ctx.save();
                ctx.globalAlpha *= Math.min(0.75, Math.min(u, 1-u)*4);
                ctx.strokeStyle = '#ffbb81'; ctx.fillStyle = '#ffbb81';
                ctx.lineWidth = 85; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p1[0],p1[1]);
                ctx.lineTo(p1[0]-tx*360-ty*220,p1[1]-ty*360+tx*220);
                ctx.lineTo(p1[0]-tx*360+ty*220,p1[1]-ty*360-tx*220);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }
    ctx.restore();
    if (overrideDoorU != null) return; // aba 6 não atualiza os indicadores da aba 5
    // Heights come from the closed door and the exact 1:10 source geometry.
    const highConv = initialConv.doorClosed.tip.y, lowConv = initialConv.wallFix.y;
    const highAlpha = alpha.floorHighY, lowAlpha = alpha.baseY;
    const fmt = n => Number(n).toFixed(2);
    const vals = {
        'uni-height-conv-high': fmt(highConv) + ' cm',
        'uni-height-alpha-high': fmt(highAlpha) + ' cm',
        'uni-height-delta-high': (highAlpha-highConv>=0?'+':'')+fmt(highAlpha-highConv)+' cm',
        'uni-height-conv-low': fmt(lowConv) + ' cm',
        'uni-height-alpha-low': fmt(lowAlpha) + ' cm',
        'uni-height-delta-low': (lowAlpha-lowConv>=0?'+':'')+fmt(lowAlpha-lowConv)+' cm'
    };
    for (const [id, val] of Object.entries(vals)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}
window.drawUniReferenceBins = drawReferenceBins;
})();
