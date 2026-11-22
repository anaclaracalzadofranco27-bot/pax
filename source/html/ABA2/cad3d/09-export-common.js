
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
            function cad3dSnapshotExportState() {
                return {
                    az, el, R, T: T.clone(), door: openProgress,
                    pixelRatio: ren.getPixelRatio(), size: ren.getSize(new THREE.Vector2()),
                    clear: ren.getClearColor(new THREE.Color()).clone(), clearAlpha: ren.getClearAlpha(),
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
                ren.setClearColor(snapshot.clear, snapshot.clearAlpha);
                ren.setPixelRatio(snapshot.pixelRatio);
                ren.setSize(snapshot.size.x, snapshot.size.y, false);
                az = snapshot.az; el = snapshot.el; R = snapshot.R; T.copy(snapshot.T);
                updateDoor(snapshot.door);
                syncDoorUI();
                rs();
            }

