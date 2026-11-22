            btnStartSim.onclick = startSimulation;
            btnResetSim.onclick = resetSimulation;

            function animateDoorStep(){
                const diff = doorAnimTarget - openProgress;
                if(Math.abs(diff) < 0.004){
                    updateDoor(doorAnimTarget);
                    syncDoorUI();
                    upd();
                    doorAnimReq = null;
                    return;
                }
                updateDoor(openProgress + Math.sign(diff) * 0.025);
                syncDoorUI();
                upd();
                doorAnimReq = requestAnimationFrame(animateDoorStep);
            }

            btnToggle.onclick=()=>{
                if(simReq){ cancelAnimationFrame(simReq); simReq = null; }
                doorAnimTarget = (openProgress < 0.5) ? 1 : 0;
                if(!doorAnimReq) doorAnimReq = requestAnimationFrame(animateDoorStep);
            };

            slider.addEventListener('input', e=>{
                stopAllAnimations();
                updateDoor(parseFloat(e.target.value) / 100);
                syncDoorUI();
                upd();
            });

            let dr = null;
            cv.addEventListener('pointerdown', e=>{ dr=[e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
            cv.addEventListener('pointermove', e=>{
                if(!dr) return;
                az -= (e.clientX - dr[0]) * 0.006;
                el = Math.max(-1.55, Math.min(1.55, el + (e.clientY - dr[1]) * 0.006));
                dr = [e.clientX, e.clientY];
                upd();
            });
            cv.addEventListener('pointerup', ()=>dr=null);
            cv.addEventListener('wheel', e=>{
                e.preventDefault();
                R = Math.max(600, Math.min(9000, R * (1 + e.deltaY * 0.001)));
                upd();
            }, {passive:false});





