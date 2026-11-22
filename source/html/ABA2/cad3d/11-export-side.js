            // Duas imagens laterais 4K com intervalo de 400 ms, preservando o efeito acrílico.
            window.cad3dExportSideTransparent = async () => {
                if (exporting) return;
                exporting = true;
                let state = null; // snapshot comum de câmera, WebGL, materiais e malas
                const isoVisibilityStates = new Map();
                const isoMaterialSwaps = [];
                const isoTemporaryMaterials = new Map();
                const isoNormalGeometries = new Set();

                // A câmera az=-0.47 está do lado X_RIGHT (DIST): ocultar essa parede e
                // as malas 1 e 3, preservando as duas malas da fileira oposta (0 e 2).
                const isoNearBagIndices = [1, 3];
                const isoRearBagIndices = [0, 2];

                const hideForIsometric = object => {
                    if (!isoVisibilityStates.has(object)) isoVisibilityStates.set(object, object.visible);
                    object.visible = false;
                };
                const swapIsoMaterial = (mesh, temporary) => {
                    isoMaterialSwaps.push([mesh, mesh.material, mesh.renderOrder]);
                    mesh.material = temporary;
                    mesh.renderOrder = 0;  // oclusão apenas pelo depth buffer, nunca sobrepor as malas
                };
                const resetIsometricAppearance = () => {
                    isoMaterialSwaps.forEach(([mesh, material, renderOrder]) => {
                        mesh.material = material;
                        mesh.renderOrder = renderOrder;
                    });
                    isoMaterialSwaps.length = 0;
                    isoVisibilityStates.forEach((visible, object) => { object.visible = visible; });
                    isoVisibilityStates.clear();
                    isoNormalGeometries.forEach(geometry => geometry.deleteAttribute('normal'));
                    isoNormalGeometries.clear();
                    isoTemporaryMaterials.forEach(material => material.dispose());
                    isoTemporaryMaterials.clear();
                };
                const highlightIsometricInterior = () => {
                    // Cores foscas/acetinadas, diferenciadas pelo sombreamento real das luzes
                    // ambiente e direcionais já presentes. Não mudar os materiais originais.
                    const wallColors = new Map([
                        [mat, 0xbecddd],       // parede lateral distante
                        [wm, 0x9fb5c9],        // parede inclinada e divisória superior
                        [fm, 0x849eb8],        // piso escalonado
                        [doorMat, 0xc5d4e3],   // porta/teto retrátil
                        [handleMat, 0x899fb4] // puxador da porta
                    ]);
                    profileBandMaterials.forEach(material => wallColors.set(material, 0x99b0c3));
                    const solidMaterialFor = (source, isBag) => {
                        if (!isoTemporaryMaterials.has(source)) {
                            const solid = isBag
                                ? source.clone()
                                : new THREE.MeshStandardMaterial({
                                    color: wallColors.get(source) ?? source.color.getHex(),
                                    side: THREE.DoubleSide,
                                    roughness: 0.78, metalness: 0.03,
                                    polygonOffset: !!source.polygonOffset,
                                    polygonOffsetFactor: source.polygonOffsetFactor || 0,
                                    polygonOffsetUnits: source.polygonOffsetUnits || 0
                                });
                            solid.opacity = 1.0;
                            solid.transparent = false;
                            solid.depthWrite = true;
                            solid.depthTest = true;
                            solid.wireframe = false;
                            solid.needsUpdate = true;
                            isoTemporaryMaterials.set(source, solid);
                        }
                        return isoTemporaryMaterials.get(source);
                    };

                    // Retira toda a lateral X_RIGHT, inclusive suas tiras de extrusão.
                    // Retira também TODAS as linhas estruturais do bin, inclusive EdgesGeometry,
                    // guias e divisões das ripas: nenhuma linha pode atravessar as malas.
                    sideWallParts.forEach(hideForIsometric);
                    group.traverse(object => {
                        if (object.isLine || object.isLineSegments || object.isLineLoop) {
                            hideForIsometric(object);
                        }
                        if (!object.isMesh) return;
                        // Paredes planas construídas com BufferGeometry precisam de normais
                        // para receber sombreamento físico; remover as normais temporárias no reset.
                        if (object.geometry && !object.geometry.getAttribute('normal') &&
                            object.geometry.getAttribute('position')) {
                            object.geometry.computeVertexNormals();
                            isoNormalGeometries.add(object.geometry);
                        }
                        swapIsoMaterial(object, solidMaterialFor(object.material, false));
                    });

                    // As duas malas do fundo (casco, rodinhas e alças) ficam integralmente
                    // opacas. As linhas decorativas das próprias malas continuam visíveis.
                    isoRearBagIndices.forEach(index => {
                        const bag = bags[index];
                        bag.root.visible = true;
                        if (bag.env) bag.env.visible = false;
                        bag.root.traverse(object => {
                            if (object.isMesh) {
                                swapIsoMaterial(object, solidMaterialFor(object.material, true));
                            }
                        });
                    });
                };
                const exportShot = (name, angle, elevation, radius) => {
                    az = angle; el = elevation; R = radius;
                    updateDoor(0.84);
                    upd();
                    cad3dDownloadPNG('alpha_bin_' + name + '_acrylic_4k.png');
                };
                try {
                    stopAllAnimations();
                    state = cad3dSnapshotExportState();
                    bags.forEach((b, i) => {
                        b.root.visible = true;
                        if (b.env) b.env.visible = false;
                        setBagPoseAlongPath(i, 1);
                    });
                    cad3dSetExportSurfaces(0.23, 0.37);
                    cad3dConfigureExport4K();
                    exportShot('lateral_with_four_bags', 0, 0.08, 2600);
                    await cad3dExportDelay(400);
                    // Segundo PNG vê X_RIGHT; ocultar as malas dianteiras 1 e 3.
                    isoNearBagIndices.forEach(i => { bags[i].root.visible = false; });
                    highlightIsometricInterior();
                    exportShot('side_isometric_with_two_rear_bags', -0.47, 0.17, 2650);
                } catch (err) {
                    console.warn('Side transparent export:', err);
                } finally {
                    // Limpar cópias de materiais, normais temporárias e estado, mesmo em falha.
                    try { resetIsometricAppearance(); }
                    catch (err) { console.warn('CAD3D isometric restore:', err); }
                    try { if (state) cad3dRestoreExportState(state); }
                    catch (err) { console.warn('CAD3D side state restore:', err); }
                    finally { exporting = false; }
                }
            };

            setTimeout(rs, 60);
        })();

    