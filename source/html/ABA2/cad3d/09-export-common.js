
            // Únicos utilitários compartilhados; as cenas específicas ficam nos dois exportadores.
            const CAD3D_EXPORT_W = 3840, CAD3D_EXPORT_H = 2160;
            function cad3dDownloadPNG(filename) {
                const a = document.createElement('a');
                a.href = cv.toDataURL('image/png');
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
            function cad3dConfigureExport4K() {
                ren.setPixelRatio(1);
                ren.setSize(CAD3D_EXPORT_W, CAD3D_EXPORT_H, false);
                cam.aspect = CAD3D_EXPORT_W / CAD3D_EXPORT_H;
                cam.updateProjectionMatrix();
                ren.setClearColor(0x000000, 0);
            }
            // Recursos comuns aos dois exportadores: as opacidades continuam específicas de cada vista.
            const cad3dExportSurfaces = [mat, wm, fm, ...profileBandMaterials];
            function cad3dSnapshotExportSurfaces() {
                return cad3dExportSurfaces.map(m => [m, m.transparent, m.opacity, m.depthWrite, m.color.getHex()]);
            }
            function cad3dSetExportSurfaces(sideOpacity, floorOpacity, detailsOpacity = 0.25) {
                cad3dExportSurfaces.forEach((m, i) => {
                    m.transparent = true;
                    m.opacity = i === 2 ? floorOpacity : (i < 2 ? sideOpacity : detailsOpacity);
                    m.depthWrite = false;
                    m.needsUpdate = true;
                });
            }
            function cad3dRestoreExportSurfaces(snapshot) {
                snapshot.forEach(([m, transparent, opacity, depthWrite, color]) => {
                    m.color.setHex(color);
                    m.transparent = transparent;
                    m.opacity = opacity;
                    m.depthWrite = depthWrite;
                    m.needsUpdate = true;
                });
            }
            function cad3dExportDelay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            function cad3dSnapshotExportState() {
                // Snapshot completo: a transição Aba 2 → Aba 3 altera fov, up e viewOffset.
                return {
                    az, el, R, T: T.clone(), door: openProgress,
                    pixelRatio: ren.getPixelRatio(), size: ren.getSize(new THREE.Vector2()),
                    clear: ren.getClearColor(new THREE.Color()).clone(), clearAlpha: ren.getClearAlpha(),
                    camera: {
                        fov: cam.fov, aspect: cam.aspect, up: cam.up.clone(),
                        view: cam.view ? { ...cam.view } : null
                    },
                    surfaces: cad3dSnapshotExportSurfaces(),
                    bags: bags.map(b => ({
                        vis: b.root.visible, envVis: b.env ? b.env.visible : null,
                        pos: b.root.position.clone(), quat: b.root.quaternion.clone(),
                        col: b.mBody.color.getHex()
                    }))
                };
            }
            function cad3dRestoreExportBags(snapshot) {
                bags.forEach((b, i) => {
                    const sv = snapshot.bags[i];
                    b.root.visible = sv.vis;
                    if (b.env) b.env.visible = sv.envVis;
                    b.root.position.copy(sv.pos);
                    b.root.quaternion.copy(sv.quat);
                    b.mBody.color.setHex(sv.col);
                });
            }
            function cad3dRestoreExportView(snapshot) {
                // Não chamar rs(): ele reajustaria a resolução depois de restaurar a janela WebGL.
                az = snapshot.az; el = snapshot.el; R = snapshot.R; T.copy(snapshot.T);
                cam.fov = snapshot.camera.fov;
                cam.up.copy(snapshot.camera.up);
                cam.aspect = snapshot.camera.aspect;
                if (snapshot.camera.view) {
                    const v = snapshot.camera.view;
                    cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
                } else {
                    cam.clearViewOffset();
                }
                cam.updateProjectionMatrix();
                updateDoor(snapshot.door);
                syncDoorUI();
                ren.setPixelRatio(snapshot.pixelRatio);
                ren.setSize(snapshot.size.x, snapshot.size.y, false);
                ren.setClearColor(snapshot.clear, snapshot.clearAlpha);
                upd();
            }
            function cad3dRestoreExportState(snapshot) {
                cad3dRestoreExportBags(snapshot);
                cad3dRestoreExportSurfaces(snapshot.surfaces);
                cad3dRestoreExportView(snapshot);
            }
