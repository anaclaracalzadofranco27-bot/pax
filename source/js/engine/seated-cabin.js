        // MÓDULO 4: ERGONOMIA SENTADO (v5) — escopo isolado (IIFE) para não
        // sobrescrever helpers/paleta de manequim usados nas outras seções.
        // =====================================================================
        (function () {
        // PADRÕES DO ASSENTO
        const SEAT_PAN_IN = 16;      // Seat Pan Height (assento ao piso) — postura TTL (Taxi, Take-off, Landing): 16"
        const BACK_ANG_DEG = 20;     // Inclinação do encosto/tronco em relação à vertical — postura TTL: 20°
        const BACK_H_IN = 40;        // Total Structural Height: altura do topo do encosto ao piso
        const MIN_HEIGHT = 59.8 * CM_PER_IN; // 151.892 cm
        const MAX_HEIGHT = 73.4 * CM_PER_IN; // 186.436 cm

        const NULLCTX = new Proxy(function () {}, { get: () => NULLCTX, apply: () => NULLCTX, set: () => true });

        // Cena da cabine (reutilizável): L = camadas ligadas/desligadas (0..1), o.map = mapeamento opcional
        function drawSeatedScene(ctx, W, H, o) {
            const hAisle = o.hAisle, hWin = o.hWin;
            const backAng = (o.backAng != null) ? o.backAng : BACK_ANG_DEG;   // padrão TTL = 20° da vertical
            const L = Object.assign({ seats: 1, pax: 1, dims: 1 }, o.layers || {});
            const backRad = backAng * Math.PI / 180;
            const SEAT_PAN_CM = SEAT_PAN_IN * CM_PER_IN;                 // 40.64 cm (16")
            const backTopY = BACK_H_IN * CM_PER_IN;                      // 101.6 cm: topo do encosto a 40" do piso (cota)
            const xRange = 300, yRange = 226;
            let scale = Math.min((W - 40) / xRange, (H - 30) / yRange);
            const cx = W / 2;
            let toX = (xCm) => cx + xCm * scale;
            let toY = (yCm) => H - 15 - (yCm + 9) * scale;
            if (o.map) ({ toX, toY, scale } = o.map(W, H));

            // Abaixo de cada cabeça, consulta-se o perfil CAD realmente desenhado
            // pela Aba 5 (escala 1:10 em cm e estado fechado de referência).
            // Não usar traceBinAlphaProfile/vectorBinUnderY, que eram de bins antigos.
            const ceilingAtX = (xc, isRight) =>
                typeof window.getUniBinUndersideY === 'function'
                    ? window.getUniBinUndersideY(xc, isRight) : null;

            const drawEmbraerSeatAndDummy3D = (centerX, stature, label, isWindow, isRightSide) => {
                const seatW = 46.0;
                
                // Padrão TTL: assento 16", estrutura do encosto 40", ângulo 20° da vertical
                const seatPanTopY = SEAT_PAN_CM;
                const seatPanBotY = seatPanTopY - 12.0; // Cushion de 12cm
                const backrestTopY = backTopY;          // topo do encosto = 40" do piso

                ctx.save();
                ctx.globalAlpha *= L.seats;
                window.__dkRole = 'seat';   // paleta escura da exportação: poltrona
                // 1. Pernas da cadeira
                ctx.strokeStyle = '#5a5d63';
                ctx.lineWidth = 4.5;
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW * 0.35), toY(seatPanBotY));
                ctx.lineTo(toX(centerX - seatW * 0.42), toY(0));
                ctx.moveTo(toX(centerX + seatW * 0.35), toY(seatPanBotY));
                ctx.lineTo(toX(centerX + seatW * 0.42), toY(0));
                ctx.stroke();

                // 2. Travessa base sob o assento
                ctx.fillStyle = '#6b7280';
                ctx.fillRect(toX(centerX - seatW * 0.38), toY(seatPanBotY + 2), seatW * 0.76 * scale, 3 * scale);

                // 3. Encosto (Verde-azulado, top arredondado)
                ctx.fillStyle = '#3f7185';
                ctx.strokeStyle = '#244552';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW/2 + 1), toY(seatPanTopY));
                ctx.lineTo(toX(centerX - seatW/2 + 4.5), toY(backrestTopY - 12));
                ctx.quadraticCurveTo(toX(centerX - seatW/2 + 6), toY(backrestTopY), toX(centerX - seatW/4), toY(backrestTopY));
                ctx.lineTo(toX(centerX + seatW/4), toY(backrestTopY));
                ctx.quadraticCurveTo(toX(centerX + seatW/2 - 6), toY(backrestTopY), toX(centerX + seatW/2 - 4.5), toY(backrestTopY - 12));
                ctx.lineTo(toX(centerX + seatW/2 - 1), toY(seatPanTopY));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 4. Linhas de costura verticais laterais
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW/4), toY(seatPanTopY));
                ctx.quadraticCurveTo(toX(centerX - seatW/4 - 1.5), toY((seatPanTopY + backrestTopY)/2), toX(centerX - seatW/4 + 1.5), toY(backrestTopY - 1.5));
                ctx.moveTo(toX(centerX + seatW/4), toY(seatPanTopY));
                ctx.quadraticCurveTo(toX(centerX + seatW/4 + 1.5), toY((seatPanTopY + backrestTopY)/2), toX(centerX + seatW/4 - 1.5), toY(backrestTopY - 1.5));
                ctx.strokeStyle = '#29505f';
                ctx.lineWidth = 1.4;
                ctx.stroke();

                // 5. Assento inferior (Cushion)
                ctx.fillStyle = '#3f7185';
                ctx.beginPath();
                ctx.roundRect(toX(centerX - seatW / 2 - 0.5), toY(seatPanTopY), (seatW + 1) * scale, 12 * scale, 4);
                ctx.fill();
                ctx.stroke();

                // 6. Braços da cadeira (Cinza claro acompanhando o banco mais alto)
                ctx.fillStyle = '#9ca3af';
                ctx.strokeStyle = '#4b5563';
                ctx.lineWidth = 1.2;
                const armW = 4.5;
                const armH = 14;
                const armY = seatPanTopY + 24; // ~62.1 cm
                ctx.beginPath();
                ctx.roundRect(toX(centerX - seatW / 2 - armW + 1), toY(armY), armW * scale, armH * scale, 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.roundRect(toX(centerX + seatW / 2 - 1), toY(armY), armW * scale, armH * scale, 2);
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
                window.__dkRole = null;

                ctx.save(); ctx.globalAlpha *= L.pax;
                // DUMMY POSTURE AJUSTADA PELA INCLINAÇÃO (TTL: 20° da vertical, assento a 16")
                // O tronco tomba para trás, reduzindo a altura vertical projetada do passageiro.
                const physicalSittingHeight = stature * 0.51; 
                
                // Aplicando o teorema de pitágoras para encontrar o cateto adjacente (altura visual)
                const seatedSittingHeight = physicalSittingHeight * Math.cos(backRad);   // tronco acompanha o ângulo do encosto
                
                const currentHeadTopY = seatPanTopY + seatedSittingHeight;
                const px = centerX;
                const pelvisBotY = seatPanTopY + 2;
                
                drawDummyFrontFigure(ctx, toX, toY, scale, {
                    px: px, S: stature, headTopY: currentHeadTopY, pelvisBotY: pelvisBotY, t: 0
                });

                const ceilingY = ceilingAtX(centerX, isRightSide);
                const clearance = Number.isFinite(ceilingY) ? ceilingY - currentHeadTopY : NaN;

                // A cota vai do topo real da cabeça ao intradorso real do bin CAD.
                // Sem offsets fixos de 0.6 cm nas extremidades.
                const cotaTxt = `${clearance >= 0 ? '+' : ''}${fmtIn(clearance, 1)}`;
                if (Number.isFinite(clearance) && L.dims > 0 && L.pax > 0) {
                    ctx.save();
                    ctx.globalAlpha *= L.dims;
                    drawDimensionLine(
                        ctx,
                        toX(px), toY(currentHeadTopY),
                        toX(px), toY(ceilingY),
                        cotaTxt, DIMENSION_COLOR, 12, {x: 20, y: 0},
                        {x1: toX(px - 4), y1: toY(currentHeadTopY), x2: toX(px + 4), y2: toY(currentHeadTopY)},
                        // Marca curta centrada na interseção exata com a curva CAD.
                        {x1: toX(px - 2), y1: toY(ceilingY), x2: toX(px + 2), y2: toY(ceilingY)}
                    );
                    ctx.restore();
                }

                                ctx.restore();
                return clearance;
            };

            const seatsOn = L.seats > 0 || L.pax > 0;
            const clWinEmb = seatsOn ? drawEmbraerSeatAndDummy3D(-99.5, hWin, '1A (WIN)', true, false) : 0;
            const clAisleEmb = seatsOn ? drawEmbraerSeatAndDummy3D(-48.5, hAisle, '1B (AIS)', false, false) : 0;
            const clAisleAlpha = seatsOn ? drawEmbraerSeatAndDummy3D(48.5, hAisle, '1C (AIS)', false, true) : 0;
            const clWinAlpha = seatsOn ? drawEmbraerSeatAndDummy3D(99.5, hWin, '1D (WIN)', true, true) : 0;

            // Aba 5: as três cotas principais (altura, piso e corredor)
            // são desenhadas apenas em drawInteractiveStructureDims().
            // A anotação de reclinação é renderizada por drawSeatbackLeader().

            return { clWinEmb, clAisleEmb, clAisleAlpha, clWinAlpha };
        }

                    

            window.drawSeatedScene = drawSeatedScene;
            window.SEATED_STAT = { min: MIN_HEIGHT, max: MAX_HEIGHT, seatPanIn: SEAT_PAN_IN, backAng: BACK_ANG_DEG };
        })();



