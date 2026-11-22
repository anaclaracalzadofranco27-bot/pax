            // ---- Transição da Aba 2 (CAD 3D) para a Aba 3 (comparação), durante o roteiro ----
            // O bin Alpha sólido vai ficando translúcido (opacidades iguais às da aba 2) enquanto a câmera sobe para a vista de cima,
            // o FOV converge para o da vista Alpha na Aba 3 (35° → 15°, "dolly zoom") e o bin desliza para a coluna da esquerda, tudo sincronizado.
            const NV_FOV_M = 15, NV_T_M = new THREE.Vector3(DIST / 2, 360, -447);   // mesmos valores da câmera da vista Alpha na Aba 3
            const morphSaved = new Map();
            const morphSet = (m, to, k) => {
                if (!morphSaved.has(m)) morphSaved.set(m, { t: m.transparent, o: m.opacity, d: m.depthWrite });
                const b = morphSaved.get(m);
                m.transparent = true;                       // exigido para a opacidade valer
                m.opacity = b.o + (to - b.o) * k;
                m.depthWrite = k < 0.001 ? b.d : false;     // translúcido não grava profundidade
            };
            const morphMatsOf = obj => { const a = []; obj.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => a.push(m)); }); return a; };
            window.cad3dMorphReset = () => {
                morphSaved.forEach((b, m) => { m.transparent = b.t; m.opacity = b.o; m.depthWrite = b.d; });
                morphSaved.clear();
                cam.fov = 35; cam.up.set(0, 1, 0); cam.clearViewOffset(); cam.updateProjectionMatrix();
                const bl = container.querySelector('.cad3d-balloons'); if (bl) { bl.style.opacity = ''; bl.classList.remove('hud-off'); }
                if (bagDimensionLayer) { bagDimensionLayer.style.opacity = ''; bagDimensionLayer.style.visibility = ''; }
            };
            window.cad3dTourMorph = o => new Promise(resolve => {
                stopAllAnimations();
                const cw = container.clientWidth, ch = container.clientHeight;
                if (!cw || !ch || !o || !o.colW || !o.colH) { resolve(); return; }
                const colW = o.colW, colH = o.colH, D = o.ms || 1300;
                const tanN = Math.tan(NV_FOV_M * Math.PI / 360);
                const RrN = Math.max(1350 / (2 * tanN * (colW / colH)), 1080 / (2 * tanN));    // mesmo enquadramento da vista Alpha na Aba 3
                const visEnd = 2 * RrN * tanN * ch / colH;                                     // altura (mundo) visível no canvas inteiro ao final
                const az0 = az, el0 = el, fov0 = cam.fov, T0 = T.clone(), vis0 = 2 * R * Math.tan(fov0 * Math.PI / 360);
                const dx = o.cx != null ? cw / 2 - o.cx : (cw - colW) / 2, dy = o.cy != null ? ch / 2 - o.cy : (ch - colH) / 2;   // o bin vai do centro do canvas ao centro da coluna ALPHA
                const ez = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;    // ease in-out cúbico
                const envMats = []; bags.forEach(b => { if (b.env) envMats.push(...morphMatsOf(b.env)); });
                const slatMats = [doorMat];
                const balloons = container.querySelector('.cad3d-balloons');
                if (balloons) balloons.classList.add('hud-off');                                // segurança: os callouts já saíram quando a porta fechou
                const Tm = new THREE.Vector3(), t0 = performance.now();
                const frame = now => {
                    if (o.cancel && o.cancel()) { resolve(); return; }
                    const u = Math.min(1, (now - t0) / D), k = ez(u);
                    const km = ez(Math.min(1, u * 1.12));                                       // materiais terminam um pouco antes da câmera
                    az = az0 + (-Math.PI / 2 - az0) * k;                                        // rumo = vista de cima da aba 2
                    el = el0 + (Math.PI / 2 - 0.001 - el0) * k;
                    cam.fov = fov0 + (NV_FOV_M - fov0) * k;
                    const vis = vis0 + (visEnd - vis0) * k, Rm = vis / (2 * Math.tan(cam.fov * Math.PI / 360));
                    Tm.lerpVectors(T0, NV_T_M, k);
                    cam.position.set(Tm.x + Rm * Math.cos(el) * Math.cos(az), Tm.y + Rm * Math.sin(el), Tm.z + Rm * Math.cos(el) * Math.sin(az));
                    const w = k * k * k; cam.up.set(0, 1 - w, w).normalize();                  // sem ponto cego perto do zênite
                    cam.setViewOffset(cw, ch, dx * k, dy * k, cw, ch);                          // destino medido na mesma escala CSS da câmera
                    if (u >= 1) {
                        // Último frame = MESMA câmera ortogonal à planta usada por novaFront():
                        // posição, vetor up, FOV, centro e escala coincidem com o bin Alpha seguinte.
                        cam.position.set(NV_T_M.x, NV_T_M.y + RrN * ch / colH, NV_T_M.z);
                        cam.up.set(0, 0, 1);
                    }
                    cam.lookAt(Tm);
                    if (bagDimensionLayer) {
                        bagDimensionLayer.style.opacity = String(1 - km);
                        bagDimensionLayer.style.visibility = km >= .999 ? 'hidden' : 'visible';
                    }
                    morphSet(mat, 0.30, km); morphSet(wm, 0.30, km); morphSet(fm, 0.40, km);
                    profileBandMaterials.forEach(m => morphSet(m, 0.30, km));   // sólido → translúcido (wireframe em destaque)
                    slatMats.forEach(m => morphSet(m, 0, km));                                  // porta rolante some (na aba 2 ela está recolhida)
                    envMats.forEach(m => morphSet(m, 0, km));                                   // cotas das malas somem
                    ren.render(scene, cam);
                    if (u < 1) requestAnimationFrame(frame); else resolve();
                };
                requestAnimationFrame(frame);
            });

