            // Três capturas 4K com intervalo de 700 ms; restaurar tudo mesmo em erro.
            let exporting = false;
            window.cad3dExportImages = async () => {
                if (exporting) return;
                exporting = true;
                let state = null;
                const wallOrders = [];
                try {
                    stopAllAnimations();
                    state = cad3dSnapshotExportState();
                    bags.forEach((b, i) => {
                        b.root.visible = true;
                        if (b.env) b.env.visible = false;
                        setBagPoseAlongPath(i, 1);
                        b.mBody.color.setHex(state.bags[0].col); // mesmas cores do exportador anterior
                    });
                    cad3dSetExportSurfaces(0.27, 0.39);
                    solids.forEach(m => {
                        if (m.material === mat) { wallOrders.push([m, m.renderOrder]); m.renderOrder = 10; }
                    });
                    az = views.iso[0]; el = views.iso[1]; R = 2400;
                    cad3dConfigureExport4K();
                    const shot = (name, door) => {
                        az = views.iso[0]; el = views.iso[1]; R = 2400;
                        updateDoor(door);
                        upd();
                        cad3dDownloadPNG(`alpha_bin_3d_isometric_door_${name}_4k.png`);
                    };
                    const sideWall = () => {
                        const visibility = group.children.map(o => o.visible);
                        const bagVisibility = bags.map(b => b.root.visible);
                        const orders = sideWallParts.map(o => o.renderOrder);
                        const transient = [mat.transparent, mat.opacity, mat.depthWrite];
                        const clear = ren.getClearColor(new THREE.Color()).clone(), alpha = ren.getClearAlpha();
                        try {
                            group.children.forEach(o => { o.visible = sideWallParts.includes(o); });
                            bags.forEach(b => { b.root.visible = false; });
                            mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true;
                            sideWallParts.forEach(o => { o.renderOrder = 0; });
                            az = views.side[0]; el = views.side[1]; R = 1200;
                            T.set(DIST, 340, -447);
                            ren.setClearColor(0x000000, 0);
                            updateDoor(0);
                            upd();
                            cad3dDownloadPNG('alpha_bin_side_wall_only_4k.png');
                        } finally {
                            group.children.forEach((o, i) => { o.visible = visibility[i]; });
                            bags.forEach((b, i) => { b.root.visible = bagVisibility[i]; });
                            sideWallParts.forEach((o, i) => { o.renderOrder = orders[i]; });
                            [mat.transparent, mat.opacity, mat.depthWrite] = transient;
                            mat.needsUpdate = true;
                            T.copy(state.T);
                            ren.setClearColor(clear, alpha);
                        }
                    };
                    shot('closed', 0);
                    await cad3dExportDelay(700);
                    shot('80pct_open', 0.8);
                    await cad3dExportDelay(700);
                    sideWall();
                } catch (err) {
                    console.warn('CAD3D export images:', err);
                } finally {
                    // Restaurar ordens, materiais, todas as malas, câmera e tamanho WebGL.
                    try {
                        wallOrders.forEach(([m, order]) => { m.renderOrder = order; });
                        if (state) cad3dRestoreExportState(state);
                    } catch (err) {
                        console.warn('CAD3D export restore:', err);
                    } finally {
                        exporting = false;
                    }
                }
            };
