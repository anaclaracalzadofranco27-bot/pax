            const X_LEFT  = 292;
            const X_RIGHT = 865;

            // Encaixe no perfil lateral real: U = -Z e H = Y (mm).
            // A quebra do piso em FLOOR_SEAT[8] separa a rampa de 360,68 mm
            // do piso frontal de 265,09 mm (ângulo interno próximo de 168°).
            // Os 356 x 254 mm são as dimensões EXTERNAS da seção da mala IATA,
            // incluindo o envelope das rodas e alças: não posicionar só pelo casco.
            const floorRear = FLOOR_SEAT[0], floorJoint = FLOOR_SEAT[8];
            const floorFront = FLOOR_SEAT[FLOOR_SEAT.length - 1];
            const floorAngle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
            const rearSlope = floorAngle(floorRear, floorJoint);
            const frontSlope = floorAngle(floorJoint, floorFront);
            const BAG_LONG_HALF = 356 / 2, BAG_THICK_HALF = 254 / 2;
            const PROFILE_GAP = 1.5; // folga técnica mínima para evitar z-fighting/penetração

            // Mala deitada: a aresta traseira acompanha a parede oblíqua de ~259 mm,
            // e a aresta inferior acompanha o primeiro segmento do piso.
            // Pequeno recuo longitudinal compensa a discretização do contorno SVG.
            function pointOnFloor(a, angle, along, normal) {
                return {
                    u: a[0] + along * Math.cos(angle) - normal * Math.sin(angle),
                    h: a[1] + along * Math.sin(angle) + normal * Math.cos(angle)
                };
            }
            const rearFoot = pointOnFloor(floorRear, rearSlope, 2.5, PROFILE_GAP);
            const lowerCenter = {
                u: rearFoot.u + BAG_LONG_HALF * Math.cos(rearSlope) - BAG_THICK_HALF * Math.sin(rearSlope),
                h: rearFoot.h + BAG_LONG_HALF * Math.sin(rearSlope) + BAG_THICK_HALF * Math.cos(rearSlope)
            };
            const LOWER_BAG_TILT = -Math.PI / 2 + rearSlope;

            // Mala em pé: sua base acompanha o segundo segmento do piso; a face
            // traseira inclina ~5° para trás, paralela à divisória de 124,25 mm.
            // O início da base fica perto da quebra para não colidir com a mala deitada.
            const frontFoot = pointOnFloor(floorJoint, frontSlope, -2.8, PROFILE_GAP);
            const uprightCenter = {
                u: frontFoot.u + BAG_THICK_HALF * Math.cos(frontSlope) - BAG_LONG_HALF * Math.sin(frontSlope),
                h: frontFoot.h + BAG_THICK_HALF * Math.sin(frontSlope) + BAG_LONG_HALF * Math.cos(frontSlope)
            };
            const UPRIGHT_BAG_TILT = frontSlope;

            // As duas malas de cada tipo ficam em fileiras distintas no eixo X;
            // a exportação lateral em corte usa apenas um exemplar de cada perfil.
            const BAG_PATHS = [
                {
                    p0: new THREE.Vector3(X_LEFT, 340, -1320), r0: new THREE.Euler(0, Math.PI, 0),
                    p1: new THREE.Vector3(X_LEFT, 321, -920),  r1: new THREE.Euler(-1.38, 0, Math.PI/2),
                    p2: new THREE.Vector3(X_LEFT, lowerCenter.h, -lowerCenter.u),
                    r2: new THREE.Euler(LOWER_BAG_TILT, 0, Math.PI/2)
                },
                {
                    p0: new THREE.Vector3(X_RIGHT, 340, -1320), r0: new THREE.Euler(0, Math.PI, 0),
                    p1: new THREE.Vector3(X_RIGHT, 321, -920),  r1: new THREE.Euler(-1.38, 0, Math.PI/2),
                    p2: new THREE.Vector3(X_RIGHT, lowerCenter.h, -lowerCenter.u),
                    r2: new THREE.Euler(LOWER_BAG_TILT, 0, Math.PI/2)
                },
                {
                    p0: new THREE.Vector3(X_LEFT, 345, -1320), r0: new THREE.Euler(0, Math.PI, 0),
                    p1: new THREE.Vector3(X_LEFT, 345, -1020), r1: new THREE.Euler(-0.0087, 0, Math.PI/2),
                    p2: new THREE.Vector3(X_LEFT, uprightCenter.h, -uprightCenter.u),
                    r2: new THREE.Euler(UPRIGHT_BAG_TILT, 0, Math.PI/2)
                },
                {
                    p0: new THREE.Vector3(X_RIGHT, 345, -1320), r0: new THREE.Euler(0, Math.PI, 0),
                    p1: new THREE.Vector3(X_RIGHT, 345, -1020), r1: new THREE.Euler(-0.0087, 0, Math.PI/2),
                    p2: new THREE.Vector3(X_RIGHT, uprightCenter.h, -uprightCenter.u),
                    r2: new THREE.Euler(UPRIGHT_BAG_TILT, 0, Math.PI/2)
                }
            ];

            // Teste de separação (SAT) entre os retângulos do envelope técnico no corte Y-Z.
            // Em particular, não permitir interseção na quebra do piso.
            function sectionRect(foot, angle, longitudinal, transverse) {
                const tx = Math.cos(angle), ty = Math.sin(angle);
                const nx = -ty, ny = tx;
                return [
                    [foot.u, foot.h],
                    [foot.u + longitudinal * tx, foot.h + longitudinal * ty],
                    [foot.u + longitudinal * tx + transverse * nx, foot.h + longitudinal * ty + transverse * ny],
                    [foot.u + transverse * nx, foot.h + transverse * ny]
                ];
            }
            function sectionGap(a, b) {
                let separation = -Infinity;
                [a, b].forEach(poly => {
                    for (let i = 0; i < poly.length; i++) {
                        const p = poly[i], q = poly[(i + 1) % poly.length];
                        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
                        const nx = -(q[1] - p[1]) / d, ny = (q[0] - p[0]) / d;
                        const proj = v => v.map(p => p[0] * nx + p[1] * ny);
                        const pa = proj(a), pb = proj(b);
                        separation = Math.max(separation,
                            Math.min(...pa) - Math.max(...pb),
                            Math.min(...pb) - Math.max(...pa));
                    }
                });
                return separation; // >= 0: separados, < 0: interseção
            }
            const sectionClearance = sectionGap(
                sectionRect(rearFoot, rearSlope, 356, 254),
                sectionRect(frontFoot, frontSlope, 254, 356)
            );
            if (sectionClearance < 0) {
                console.warn('CAD 3D: envelopes das malas se interceptam no corte:', sectionClearance);
            }

            function smoothstep(t){
                const x = Math.max(0, Math.min(1, t));
                return x * x * (3 - 2 * x);
            }

            // Colisão das malas deitadas com as superfícies internas do perfil SVG.
            // Amostra os extremos do casco (incluindo espessura/chanfro), e não só o centro.
            const lowerBagSamples = [];
            bagShape.getPoints(32).forEach(p => {
                for (const depth of [-127, 127]) {
                    lowerBagSamples.push(new THREE.Vector3(p.x, 0, depth));
                }
            });
            function interiorFloor(profileX) {
                for (let i = 0; i < FLOOR_SEAT.length - 1; i++) {
                    const a = FLOOR_SEAT[i], b = FLOOR_SEAT[i + 1];
                    if (profileX >= Math.min(a[0], b[0]) &&
                        profileX <= Math.max(a[0], b[0]) && Math.abs(b[0] - a[0]) > 1e-7) {
                        return a[1] + (profileX - a[0]) * (b[1] - a[1]) / (b[0] - a[0]);
                    }
                }
                return null;
            }
            function interiorCeiling(profileX) {
                let highest = -Infinity;
                for (let i = 0; i < WALL_SEAT.length - 1; i++) {
                    const a = WALL_SEAT[i], b = WALL_SEAT[i + 1], dx = b[0] - a[0];
                    if (Math.abs(dx) < 1e-7) continue;
                    if (profileX >= Math.min(a[0], b[0]) &&
                        profileX <= Math.max(a[0], b[0])) {
                        highest = Math.max(highest, a[1] +
                            (profileX - a[0]) * (b[1] - a[1]) / dx);
                    }
                }
                return Number.isFinite(highest) ? highest : null;
            }
            function fitLowerBagToFloorAndRoof(b) {
                // Deslocamento vertical admissível pelo piso e pelo teto (folga de 2,5 mm).
                // Um único clamp evita que uma correção contra o teto atravesse o piso.
                let minY = -Infinity, maxY = Infinity, checked = 0;
                for (const p of lowerBagSamples) {
                    const v = p.clone().applyQuaternion(b.quaternion);
                    const profileX = -(b.position.z + v.z);
                    const bottom = interiorFloor(profileX);
                    const top = interiorCeiling(profileX);
                    if (bottom === null || top === null) continue;
                    minY = Math.max(minY, bottom + 2.5 - v.y);
                    maxY = Math.min(maxY, top - 2.5 - v.y);
                    checked++;
                }
                if (checked && minY <= maxY) {
                    b.position.y = Math.max(minY, Math.min(maxY, b.position.y));
                } else if (checked && minY > maxY) {
                    console.warn('CAD 3D: folga insuficiente para a mala inferior no perfil.');
                }
            }

            function setBagPoseAlongPath(bagIdx, u, target){
                const b = target || bags[bagIdx].root;
                const path = BAG_PATHS[bagIdx];
                const q0 = new THREE.Quaternion().setFromEuler(path.r0);
                const q1 = new THREE.Quaternion().setFromEuler(path.r1);
                const q2 = new THREE.Quaternion().setFromEuler(path.r2);
                const s = smoothstep(Math.max(0, Math.min(1, u)));
                // Curva de Bézier quadrática contínua (sem parada brusca no meio do caminho em u=0.5)
                const om = 1 - s;
                b.position.set(
                    om * om * path.p0.x + 2 * om * s * path.p1.x + s * s * path.p2.x,
                    om * om * path.p0.y + 2 * om * s * path.p1.y + s * s * path.p2.y,
                    om * om * path.p0.z + 2 * om * s * path.p1.z + s * s * path.p2.z
                );
                if (s <= 0.5) {
                    b.quaternion.slerpQuaternions(q0, q1, smoothstep(s / 0.5));
                } else {
                    b.quaternion.slerpQuaternions(q1, q2, smoothstep((s - 0.5) / 0.5));
                }
                if (bagIdx < 2 && s > 0.985) fitLowerBagToFloorAndRoof(b);
            }

