        // =========================================================================
        // MANEQUINS (DUMMIES) — estilo manequim articulado liso, com juntas visíveis
        //   'wood'  -> manequim de madeira bege (Imagem 1)
        //   'white' -> manequim branco com faixas cinzas nas juntas (Imagem 2)
        // Para trocar a aparência de todos os manequins, mude apenas DUMMY_STYLE.
        // =========================================================================
        const DUMMY_PALETTES = {
            android: { hi: '#ffffff', light: '#f4f7fa', mid: '#e2e8f0', dark: '#cbd5e1', edge: '#1e293b', seam: '#1e293b', joint: '#94a3b8', jointDark: '#64748b' }
        };
        const dummyPal = () => DUMMY_PALETTES.android;

        // Esfera de articulação estilo manequim técnico (cinza-azulada com contorno escuro e brilho)
        function drawDummyJointBall(ctx, cx, cy, rPx) {
            if (rPx < 0.8) return;
            const P = dummyPal();
            ctx.save();
            const grad = ctx.createRadialGradient(cx - rPx * 0.3, cy - rPx * 0.3, rPx * 0.1, cx, cy, rPx);
            grad.addColorStop(0.0, '#cbd5e1');
            grad.addColorStop(0.55, P.joint);
            grad.addColorStop(1.0, P.jointDark || '#64748b');
            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.45;
            ctx.beginPath();
            ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Segmento de membro estilo manequim ergonômico ilustrado (branco-gelo, contorno nítido e sombreamento cel-shaded suave)
        function drawDummyLimbSegment(ctx, x1, y1, x2, y2, r1Px, r2Px, rings = 0) {
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 1) return;
            const P = dummyPal();
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            let lx = nx, ly = ny;
            if (lx * -0.6 + ly * -0.8 < 0) { lx = -lx; ly = -ly; }

            ctx.save();
            const midX = (x1 + x2) * 0.5, midY = (y1 + y2) * 0.5;
            const rMax = Math.max(r1Px, r2Px, 2);
            const grad = ctx.createLinearGradient(midX + lx * rMax, midY + ly * rMax, midX - lx * rMax, midY - ly * rMax);
            grad.addColorStop(0.00, P.hi);
            grad.addColorStop(0.35, P.light);
            grad.addColorStop(0.75, P.mid);
            grad.addColorStop(1.00, P.dark);

            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x1 + nx * r1Px, y1 + ny * r1Px);
            ctx.lineTo(x2 + nx * r2Px, y2 + ny * r2Px);
            ctx.arc(x2, y2, r2Px, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
            ctx.lineTo(x1 - nx * r1Px, y1 - ny * r1Px);
            ctx.arc(x1, y1, r1Px, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Brilho lateral limpo (cel-shading)
            if (len > 5) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = Math.max(1.0, rMax * 0.22);
                ctx.lineCap = 'round';
                const t0 = 0.20, t1 = 0.80;
                const ra = (r1Px + (r2Px - r1Px) * t0) * 0.52, rb = (r1Px + (r2Px - r1Px) * t1) * 0.52;
                ctx.beginPath();
                ctx.moveTo(x1 + dx * t0 + lx * ra, y1 + dy * t0 + ly * ra);
                ctx.lineTo(x1 + dx * t1 + lx * rb, y1 + dy * t1 + ly * rb);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Cabeça escultural limpa estilo boneco ergonômico (crânio arredondado + mandíbula suave, branco-gelo e contorno escuro)
        function drawDummyHead3D(ctx, cx, cy, rPx) {
            const P = dummyPal();
            const w = rPx * 0.80;
            ctx.save();
            const grad = ctx.createLinearGradient(cx - w, cy - rPx, cx + w, cy + rPx);
            grad.addColorStop(0.00, P.hi);
            grad.addColorStop(0.45, P.light);
            grad.addColorStop(0.82, P.mid);
            grad.addColorStop(1.00, P.dark);

            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.65;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy - rPx * 1.02);
            ctx.bezierCurveTo(cx + w * 1.25, cy - rPx * 1.02, cx + w * 1.22, cy + rPx * 0.10, cx + w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx + w * 0.52, cy + rPx * 0.96, cx + w * 0.22, cy + rPx * 1.04, cx, cy + rPx * 1.04);
            ctx.bezierCurveTo(cx - w * 0.22, cy + rPx * 1.04, cx - w * 0.52, cy + rPx * 0.96, cx - w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx - w * 1.22, cy + rPx * 0.10, cx - w * 1.25, cy - rPx * 1.02, cx, cy - rPx * 1.02);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Pequenas orelhas laterais discretas de manequim
            [-1, 1].forEach(sd => {
                ctx.fillStyle = sd < 0 ? P.light : P.mid;
                ctx.beginPath();
                ctx.ellipse(cx + sd * w * 0.98, cy + rPx * 0.04, w * 0.13, rPx * 0.22, sd * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // Redesenha o contorno interno da face por cima da base das orelhas e adiciona linha sutil de eixo facial
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx, cy - rPx * 1.02);
            ctx.bezierCurveTo(cx + w * 1.25, cy - rPx * 1.02, cx + w * 1.22, cy + rPx * 0.10, cx + w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx + w * 0.52, cy + rPx * 0.96, cx + w * 0.22, cy + rPx * 1.04, cx, cy + rPx * 1.04);
            ctx.bezierCurveTo(cx - w * 0.22, cy + rPx * 1.04, cx - w * 0.52, cy + rPx * 0.96, cx - w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx - w * 1.22, cy + rPx * 0.10, cx - w * 1.25, cy - rPx * 1.02, cx, cy - rPx * 1.02);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Brilho suave na têmpora esquerda
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.beginPath();
            ctx.ellipse(cx - w * 0.38, cy - rPx * 0.42, w * 0.20, rPx * 0.28, -0.25, 0, Math.PI * 2);
            ctx.fill();

            // Linha sutil de construção de manequim (arco superciliar + eixo central discreto)
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.32)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.62, cy - rPx * 0.06);
            ctx.quadraticCurveTo(cx, cy + rPx * 0.04, cx + w * 0.62, cy - rPx * 0.06);
            ctx.moveTo(cx, cy - rPx * 0.35);
            ctx.lineTo(cx, cy + rPx * 0.45);
            ctx.stroke();
            ctx.restore();
        }

        // Tronco frontal estilo manequim técnico (peitoral branco-gelo esculpido + faixa abdominal cinza-azulada + pelve clara)
        function drawDummyTorsoFront3D(ctx, cx, yHip, yShoulder, halfShoulderW, halfWaistW, halfHipW) {
            const P = dummyPal();
            const H = yHip - yShoulder;                 // altura do tronco em px (y cresce para baixo)
            const yChestBot = yShoulder + H * 0.48;
            const yAbsBot   = yShoulder + H * 0.68;
            const halfNeckW = halfShoulderW * 0.32;
            const halfAbs   = halfWaistW * 0.95;

            ctx.save();
            const bodyGrad = ctx.createLinearGradient(cx - halfShoulderW, 0, cx + halfShoulderW, 0);
            bodyGrad.addColorStop(0.00, P.hi);
            bodyGrad.addColorStop(0.30, P.light);
            bodyGrad.addColorStop(0.75, P.mid);
            bodyGrad.addColorStop(1.00, P.dark);

            const waistGrad = ctx.createLinearGradient(cx - halfAbs, 0, cx + halfAbs, 0);
            waistGrad.addColorStop(0.00, '#cbd5e1');
            waistGrad.addColorStop(0.35, P.joint);
            waistGrad.addColorStop(1.00, P.jointDark || '#64748b');

            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.55;
            ctx.lineJoin = 'round';

            // 1. Pelve (peça inferior clara tipo armadura de manequim)
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfAbs * 1.02, yAbsBot - 1);
            ctx.quadraticCurveTo(cx - halfHipW * 1.06, yAbsBot + (yHip - yAbsBot) * 0.32, cx - halfHipW, yAbsBot + (yHip - yAbsBot) * 0.68);
            ctx.quadraticCurveTo(cx - halfHipW * 0.85, yHip + H * 0.02, cx - halfHipW * 0.36, yHip + H * 0.05);
            ctx.quadraticCurveTo(cx, yHip + H * 0.08, cx + halfHipW * 0.36, yHip + H * 0.05);
            ctx.quadraticCurveTo(cx + halfHipW * 0.85, yHip + H * 0.02, cx + halfHipW, yAbsBot + (yHip - yAbsBot) * 0.68);
            ctx.quadraticCurveTo(cx + halfHipW * 1.06, yAbsBot + (yHip - yAbsBot) * 0.32, cx + halfAbs * 1.02, yAbsBot - 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Faixa articulada da cintura (cinza-azulada como na imagem de referência)
            ctx.fillStyle = waistGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfAbs * 1.02, yChestBot - 1);
            ctx.quadraticCurveTo(cx - halfAbs * 0.94, (yChestBot + yAbsBot) * 0.5, cx - halfAbs * 1.02, yAbsBot);
            ctx.quadraticCurveTo(cx, yAbsBot + H * 0.035, cx + halfAbs * 1.02, yAbsBot);
            ctx.quadraticCurveTo(cx + halfAbs * 0.94, (yChestBot + yAbsBot) * 0.5, cx + halfAbs * 1.02, yChestBot - 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3. Tórax / Peitoral esculpido (branco-gelo com gola de encaixe do pescoço)
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfNeckW, yShoulder + H * 0.01);
            ctx.quadraticCurveTo(cx - halfShoulderW * 0.65, yShoulder + H * 0.015, cx - halfShoulderW, yShoulder + H * 0.09);
            ctx.quadraticCurveTo(cx - halfShoulderW * 1.04, yShoulder + H * 0.25, cx - halfAbs * 1.04, yChestBot);
            ctx.quadraticCurveTo(cx, yChestBot + H * 0.04, cx + halfAbs * 1.04, yChestBot);
            ctx.quadraticCurveTo(cx + halfShoulderW * 1.04, yShoulder + H * 0.25, cx + halfShoulderW, yShoulder + H * 0.09);
            ctx.quadraticCurveTo(cx + halfShoulderW * 0.65, yShoulder + H * 0.015, cx + halfNeckW, yShoulder + H * 0.01);
            ctx.quadraticCurveTo(cx, yShoulder + H * 0.055, cx - halfNeckW, yShoulder + H * 0.01);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Detalhe sutil de peitoral e linha média do manequim
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(cx, yShoulder + H * 0.06);
            ctx.lineTo(cx, yChestBot - H * 0.03);
            ctx.moveTo(cx - halfShoulderW * 0.72, yShoulder + H * 0.28);
            ctx.quadraticCurveTo(cx - halfShoulderW * 0.32, yShoulder + H * 0.34, cx - halfShoulderW * 0.06, yShoulder + H * 0.29);
            ctx.moveTo(cx + halfShoulderW * 0.72, yShoulder + H * 0.28);
            ctx.quadraticCurveTo(cx + halfShoulderW * 0.32, yShoulder + H * 0.34, cx + halfShoulderW * 0.06, yShoulder + H * 0.29);
            ctx.stroke();

            // Reflexo lateral branco no peito
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = Math.max(1.5, halfShoulderW * 0.11);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - halfShoulderW * 0.55, yShoulder + H * 0.13);
            ctx.lineTo(cx - halfAbs * 0.62, yChestBot - H * 0.06);
            ctx.stroke();
            ctx.restore();
        }

        // =========================================================================
        // FIGURA FRONTAL COMPLETA (sentada -> em pé) estilo manequim técnico ilustrado
        // =========================================================================
        function drawDummyFrontFigure(ctx, toX, toY, scale, o) {
            const __dkPrev = window.__dkRole; window.__dkRole = 'dummy';   // paleta escura da exportação: boneco
            const P = dummyPal();
            const S = o.S, px = o.px;
            const t = Math.min(1, Math.max(0, o.t || 0));
            const ankleY = (o.ankleY !== undefined) ? o.ankleY : 5.5;
            const lerp = (a, b, k) => a + (b - a) * k;
            const K = (o.slim !== undefined) ? o.slim : 0.74;
            const seg = (x1, y1, x2, y2, r1, r2) =>
                drawDummyLimbSegment(ctx, toX(x1), toY(y1), toX(x2), toY(y2), r1 * K * scale, r2 * K * scale, 0);
            const ball = (x, y, r) =>
                drawDummyJointBall(ctx, toX(x), toY(y), r * K * scale);

            // Marcos verticais (cm)
            const headR = S * 0.066;
            const headCY = o.headTopY - headR;
            const shoulderTopY = o.headTopY - S * 0.175;       // base do pescoço
            const pelvisBotY = o.pelvisBotY;
            const hipJY = pelvisBotY + S * 0.062;              // centro da articulação do quadril
            const kneeJY = lerp(hipJY - S * 0.04, ankleY + (hipJY - ankleY) * 0.5, t);

            // Posições laterais (cm, a partir da linha média)
            const hipX = S * 0.060 * K;
            const kneeX = lerp(S * 0.072, S * 0.062, t) * K;
            const ankX = lerp(S * 0.075, S * 0.060, t) * K;
            const shJY = shoulderTopY - S * 0.04;
            const shJX = S * 0.106 * K;
            const elbX = S * 0.122 * K;
            const elbY = shJY - S * 0.186;
            const handX = lerp(S * 0.088, S * 0.126, t) * K;
            const handY = lerp(hipJY + S * 0.040, elbY - S * 0.150, t);

            // Pescoço cilíndrico cinza-azulado articulado (como na referência)
            const drawNeck = () => {
                const nx = toX(px), ny1 = toY(o.headTopY - headR * 2 + S * 0.025), ny2 = toY(shoulderTopY - S * 0.015);
                const nr = S * 0.029 * K * scale;
                ctx.save();
                const gNeck = ctx.createLinearGradient(nx - nr, 0, nx + nr, 0);
                gNeck.addColorStop(0, '#cbd5e1');
                gNeck.addColorStop(0.45, P.joint);
                gNeck.addColorStop(1, P.jointDark || '#64748b');
                ctx.fillStyle = gNeck;
                ctx.strokeStyle = P.edge;
                ctx.lineWidth = 1.45;
                ctx.beginPath();
                ctx.roundRect(nx - nr, ny1, nr * 2, Math.max(4, ny2 - ny1), nr * 0.45);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            const drawTorso = () => drawDummyTorsoFront3D(ctx, toX(px), toY(pelvisBotY), toY(shoulderTopY),
                S * 0.098 * K * scale, S * 0.076 * K * scale, S * 0.095 * K * scale);

            const drawShinsAndFeet = () => [-1, 1].forEach(sd => {
                // Articulação do quadril (visível sob a pelve)
                ball(px + sd * hipX, hipJY, S * 0.038);
                // Canela
                seg(px + sd * kneeX, kneeJY, px + sd * ankX, ankleY, S * 0.036, S * 0.024);
                // Esfera do tornozelo
                ball(px + sd * ankX, ankleY, S * 0.025);
                // Pé escultural de manequim
                seg(px + sd * ankX, ankleY + 0.8, px + sd * (ankX + S * 0.010), S * 0.025, S * 0.026, S * 0.029);
            });

            const drawThighs = () => [-1, 1].forEach(sd => {
                seg(px + sd * hipX, hipJY, px + sd * kneeX, kneeJY, S * 0.048, S * 0.039);
                // Rótula / junta esférica cinza-azulada do joelho
                ball(px + sd * kneeX, kneeJY, S * 0.035);
            });

            const drawUpperArms = () => [-1, 1].forEach(sd => {
                // Esfera de articulação do ombro (destaque igual à referência)
                ball(px + sd * shJX, shJY, S * 0.035);
                seg(px + sd * shJX, shJY, px + sd * elbX, elbY, S * 0.031, S * 0.026);
                // Esfera do cotovelo
                ball(px + sd * elbX, elbY, S * 0.028);
            });

            const drawForearmsAndHands = () => [-1, 1].forEach(sd => {
                seg(px + sd * elbX, elbY, px + sd * handX, handY, S * 0.026, S * 0.020);
                // Punho cinza-azulado + mão tipo luva arredondada
                ball(px + sd * handX, handY, S * 0.020);
                const hl = lerp(S * 0.032, S * 0.068, t);
                seg(px + sd * handX, handY, px + sd * (handX - S * 0.012 * (1 - t)), handY - hl, S * 0.022, S * 0.018);
            });

            drawNeck();
            if (t >= 0.55) { drawShinsAndFeet(); drawThighs(); drawTorso(); }
            else           { drawTorso(); drawShinsAndFeet(); drawThighs(); }
            drawUpperArms();
            drawForearmsAndHands();
            drawDummyHead3D(ctx, toX(px), toY(headCY), headR * 1.04 * scale);
            window.__dkRole = __dkPrev;
        }

