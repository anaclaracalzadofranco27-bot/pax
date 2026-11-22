            // ---- Exportação 4K (3840 × 2160): vista isométrica, laterais do bin transparentes, malas no mesmo lilás ----
            let exporting = false;
            window.cad3dExportImages = () => {
                if (exporting) return;
                exporting = true;
                stopAllAnimations();
                // estado atual (restaurado no final)
                const saved = cad3dSnapshotExportState();
                // cena de exportação
                bags.forEach((b, i) => { b.root.visible = true; if (b.env) b.env.visible = false; setBagPoseAlongPath(i, 1); b.mBody.color.setHex(saved.bags[0].col); });   // todas as malas no mesmo roxo da 1a mala
                const surfaceMats = [mat, wm, fm, ...profileBandMaterials];
                const surfaceSaved = surfaceMats.map(m => [m, m.transparent, m.opacity, m.depthWrite]);
                surfaceMats.forEach((m, i) => { m.transparent = true; m.opacity = i === 2 ? 0.39 : (i<2 ? 0.27 : 0.25); m.depthWrite = false; m.needsUpdate = true; });
                solids.forEach(m => { if (m.material === mat) m.renderOrder = 10; });
                az = views.iso[0]; el = views.iso[1]; R = 2400;   // vista isométrica (mesmo ângulo do botão), enquadrada para 16:9
                cad3dConfigureExport4K(); // transparência alfa real

                const shots = [['closed', 0], ['80pct_open', 0.8]];
                const grab = (name, prog) => {
                    az = views.iso[0]; el = views.iso[1]; R = 2400;
                    updateDoor(prog);
                    upd();   // renderiza em 4K com fundo liso (sem o quadriculado da tela)
                    cad3dDownloadPNG(`alpha_bin_3d_isometric_door_${name}_4k.png`);
                };
                // Terceira imagem: só a parede lateral voltada para a câmera Side.
                const grabSideWall = () => {
                    const groupVisibility = group.children.map(o => o.visible);
                    const bagVisibility = bags.map(b => b.root.visible);
                    const wallOrders = sideWallParts.map(o => o.renderOrder);
                    try {
                        group.children.forEach(o => { o.visible = sideWallParts.includes(o); });
                        bags.forEach(b => { b.root.visible = false; });
                        mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true;
                        sideWallParts.forEach(o => { o.renderOrder = 0; });
                        az = views.side[0]; el = views.side[1]; R = 1200;
                        T.set(DIST, 340, -447);  // enquadra o perfil da lateral
                        ren.setClearColor(0x000000, 0);  // PNG transparente
                        updateDoor(0);
                        upd();
                        cad3dDownloadPNG('alpha_bin_side_wall_only_4k.png');
                    } finally {
                        group.children.forEach((o, i) => { o.visible = groupVisibility[i]; });
                        bags.forEach((b, i) => { b.root.visible = bagVisibility[i]; });
                        sideWallParts.forEach((o, i) => { o.renderOrder = wallOrders[i]; });
                        mat.transparent = true; mat.opacity = 0.27; mat.depthWrite = false; mat.needsUpdate = true;
                        T.copy(saved.T);
                        ren.setClearColor(0x000000, 0);
                    }
                };
                grab(shots[0][0], shots[0][1]);
                setTimeout(() => {
                    grab(shots[1][0], shots[1][1]);
                    setTimeout(() => {
                    grabSideWall();   // terceira imagem 4K: parede lateral sem malas, porta ou outras peças
                    // restaura tudo
                    cad3dRestoreExportBags(saved);
                    surfaceSaved.forEach(([m, tr, op, dw]) => { m.transparent = tr; m.opacity = op; m.depthWrite = dw; m.needsUpdate = true; });
                    solids.forEach(m => { if (m.material === mat) m.renderOrder = 0; });
                    cad3dRestoreExportView(saved);
                    exporting = false;
                    }, 700);
                }, 700);
            };


