            const slider = document.getElementById('cad3d-doorSlider');
            const pctLabel = document.getElementById('cad3d-doorPct');
            const btnToggle = document.getElementById('cad3d-toggleDoor');
            const btnStartSim = document.getElementById('cad3d-startSim');
            const btnResetSim = document.getElementById('cad3d-resetSim');

            let simReq = null;
            let simStartTime = 0;
            let doorAnimReq = null;
            let doorAnimTarget = 0;

            const T = new THREE.Vector3(DIST/2, 330, -620);
            let az = -2.25, el = 0.28, R = 3100;
            const views = {
                iso: [-2.25, 0.28, 3100],
                side: [0, 0, 2600]
            };

            function upd(){
                cam.position.set(T.x + R*Math.cos(el)*Math.cos(az), T.y + R*Math.sin(el), T.z + R*Math.cos(el)*Math.sin(az));
                cam.lookAt(T);
                fitBagDimensionLabels();
                const exterior=cam.position.x<-TH/2?0:(cam.position.x>DIST+TH/2?1:-1);
                [...profileBandMeshes,...internalRailParts].forEach(o=>{o.visible=exterior!==o.userData.innerWallSide;});
                ren.render(scene, cam);
                placeBalloons();
            }

            // Pré-aquece a GPU: compila os shaders e envia a geometria das 4 malas ANTES da simulação.
            // Sem isso, as malas 3 e 4 são enviadas à GPU no meio da animação (quando "entram"), o que travava/derrubava o contexto WebGL durante a gravação.
            let warmed = false;
            function warmUp(){
                if(warmed) return; warmed = true;
                const saved = bags.map(b => [b.root.visible, b.env ? b.env.visible : null]);
                bags.forEach(b => { b.root.visible = true; if(b.env) b.env.visible = true; });
                try { ren.compile(scene, cam); ren.render(scene, cam); } catch(err) { console.warn('CAD3D warm-up:', err); }
                bags.forEach((b, i) => { b.root.visible = saved[i][0]; if(b.env) b.env.visible = saved[i][1]; });
            }
            window.cad3dWarmUp = warmUp;

            function rs(){
                const rect = container.getBoundingClientRect();
                if(rect.width === 0 || rect.height === 0) return;
                const recOn = !!document.querySelector('#tour-stage.rec');           // gravando: resolução interna 1x (menos carga na GPU, que também codifica o vídeo)
                ren.setPixelRatio(recOn ? 1 : Math.min(window.devicePixelRatio||1,2));
                ren.setSize(rect.width, rect.height, false);
                cam.aspect = rect.width / rect.height;
                cam.updateProjectionMatrix();
                upd();
            }
            window.resizeCAD3D = rs;
