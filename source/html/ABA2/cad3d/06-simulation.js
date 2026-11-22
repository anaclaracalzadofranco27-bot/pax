            let introSequenceId=0;
            function resetIntroSequence(){
                introSequenceId++;
                if (_balloons) {
                    _balloons.classList.remove('tour-sequenced','hud-off');
                    const C=window.APHA_INTRO_CFG;
                    _balloons.style.setProperty('--apha-intro-fade',C.fadeMs+'ms');
                    _balloons.style.setProperty('--apha-title-delay',C.titleDelayMs+'ms');
                    _balloons.style.setProperty('--apha-legend-delay',C.legendDelayMs+'ms');
                    _balloons.style.setProperty('--apha-measures-delay',C.measuresDelayMs+'ms');
                    _balloons.style.setProperty('--apha-desc-delay',C.descriptionDelayMs+'ms');
                }
            }
            function showIntroAfterStableFrame(){
                const id=++introSequenceId;
                requestAnimationFrame(()=>requestAnimationFrame(()=>{
                    if(id!==introSequenceId || !container.closest('#tour-stage')) return;
                    if(_balloons) _balloons.classList.add('tour-sequenced');
                }));
            }
            window.cad3dTourPrep = () => {
                resetIntroSequence();
                warmUp();
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                az = -2.35; el = 0.28; R = 2925;
                updateDoor(0);
                syncDoorUI();
                bags.forEach((b, idx) => {
                    if (idx <= 1) {
                        b.root.visible = true;
                        if (b.env) b.env.visible = true;
                        setBagPoseAlongPath(idx, 0);
                    } else {
                        b.root.visible = false;
                    }
                });
                rs();
            };

            function syncDoorUI(){
                const pct = Math.round(openProgress * 100);
                slider.value = openProgress * 100;
                pctLabel.textContent = pct + '%';
                btnToggle.textContent = (openProgress < 0.5) ? 'Open Door' : 'Close Door';
            }

            function stopAllAnimations(){
                if(simReq){ cancelAnimationFrame(simReq); simReq = null; }
                if(doorAnimReq){ cancelAnimationFrame(doorAnimReq); doorAnimReq = null; }
            }

            function resetSimulation(){
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                bags.forEach(b=>{
                    b.root.visible = false;
                    if(b.env) b.env.visible = true;
                });
                updateDoor(0);
                syncDoorUI();
                btnStartSim.innerHTML = '<span>▶ Start Simulation</span>';
                upd();
            }

            function runSimulationFrame(now){
                const t = Math.max(0, (now - simStartTime) / 1000);
                if(container.closest('#tour-stage')){            // movimento contínuo e suave da câmera durante toda a cena
                    const k = smoothstep(Math.min(1, t / 5.9));
                    R = 2925 + (2700 - 2925) * k;
                    az = -2.35 + 0.10 * k;
                }

                if(t < 1.2){
                    const k = smoothstep(t / 1.2);
                    updateDoor(k);
                    syncDoorUI();
                    bags[0].root.visible = true;
                    bags[1].root.visible = true;
                    bags[0].env.visible = true;
                    setBagPoseAlongPath(0, 0.18 * k);
                    setBagPoseAlongPath(1, 0.18 * k);
                }
                else if(t < 3.3){
                    updateDoor(1);
                    syncDoorUI();
                    bags[0].root.visible = true;
                    bags[1].root.visible = true;
                    bags[0].env.visible = (t < 1.8);
                    const u = 0.18 + 0.82 * ((t - 1.2) / 2.1);
                    setBagPoseAlongPath(0, u);
                    setBagPoseAlongPath(1, u);
                }
                else if(t < 4.9){
                    setBagPoseAlongPath(0, 1);
                    setBagPoseAlongPath(1, 1);
                    bags[2].root.visible = true;
                    bags[3].root.visible = true;
                    const u = (t - 3.3) / 1.6;
                    setBagPoseAlongPath(2, u);
                    setBagPoseAlongPath(3, u);
                }
                else if(t < 5.9){
                    setBagPoseAlongPath(2, 1);
                    setBagPoseAlongPath(3, 1);
                    const k = 1 - smoothstep((t - 4.9) / 1.0);
                    updateDoor(k);
                    syncDoorUI();
                }
                else {
                    updateDoor(0);
                    syncDoorUI();
                    // porta fechada: os callouts HUD somem inteiros (o pai .hud-callout anima a opacidade) antes da troca de vista
                    const hud = container.querySelector('.cad3d-balloons'); if (hud) hud.classList.add('hud-off');
                    btnStartSim.innerHTML = '<span>▶ Replay Simulation</span>';
                    upd();
                    simReq = null;
                    return;
                }

                upd();
                simReq = requestAnimationFrame(runSimulationFrame);
            }

            function startSimulation(){
                if (container.closest('#tour-stage')) resetIntroSequence();
                warmUp();
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                const inTour = !!container.closest('#tour-stage');       // no roteiro (aba 8): a câmera parte exatamente da posição preparada em cad3dTourPrep
                az = inTour ? -2.35 : -2.25; el = 0.28; R = inTour ? 2925 : 3100;
                rs();
                bags.forEach((b, idx) => {
                    b.root.visible = (idx <= 1);
                    if (b.env) b.env.visible = true;
                });
                setBagPoseAlongPath(0, 0);
                setBagPoseAlongPath(1, 0);
                updateDoor(0);
                syncDoorUI();
                // Bin e malas permanecem imóveis e opacos durante a entrada
                // completa de título, legenda, cotas e descrição.
                simStartTime = performance.now() + (inTour ? APHA_INTRO_CFG.sequenceHoldMs : 0);
                btnStartSim.innerHTML = '<span>⏳ Simulating...</span>';
                upd();
                simReq = requestAnimationFrame(runSimulationFrame);
                if (inTour) showIntroAfterStableFrame();
            }
            window.startCAD3DSim = startSimulation;

