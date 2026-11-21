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

        function updateWalk() {
            // elapsed is clamped by both callers before updating any character.
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
            updateWalk();
            const z = cssZoom();
            OUTLINE_W.value = OUTLINE_PX * (FRUSTUM_H / camera.zoom) / Math.max(1, renderer.domElement.clientHeight) / rig1.root.scale.x / z;
            renderer.render(scene, camera);
            updateBalloonsLive(tl, z, labelAnchors());
        }
        // Exportação de vídeo: desenha os passageiros no instante tl da linha do tempo, com o contorno calculado para o zoom informado
        function renderAt(tl, zoom) {
            elapsed = Math.max(0, Math.min(MAX_ANIMATION_TIME, tl - PAX_START));
            updateWalk();
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
