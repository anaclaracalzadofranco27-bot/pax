            // Trilho e Porta Rolante Vertical (5 mm)
            // Linha central interpolada das DUAS bordas do trilho vermelho do SVG.
            const railPts2D=DOOR_GUIDE.map(p=>new THREE.Vector2(p[0],p[1]));
            
            const railCurve=new THREE.CatmullRomCurve3(
                railPts2D.map(p=>new THREE.Vector3(0, p.y, -p.x)),
                false, 'centripetal', 0.25
            );
            const totalRailLen=railCurve.getLength();

            const railSamplePts=railCurve.getSpacedPoints(220);
            const railLineMat=new THREE.LineBasicMaterial({color:0x1e293b});
            [TH/2+0.5, DIST-TH/2-0.5].forEach(xPos=>{
                const arr=[];
                for(let i=0;i<railSamplePts.length-1;i++){
                    arr.push(xPos,railSamplePts[i].y,railSamplePts[i].z, xPos,railSamplePts[i+1].y,railSamplePts[i+1].z);
                }
                const rg=new THREE.BufferGeometry();
                rg.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
                const guide=new THREE.LineSegments(rg,railLineMat);
                guide.userData.innerWallSide=xPos<DIST/2?0:1;
                internalRailParts.push(guide);
                group.add(guide);
            });

            const DOOR_THICK = 5.0;
            const DOOR_WIDTH = DIST - TH;
            const SLAT_SUB   = 3;                         // cada ripa é dividida em 3 tiras finas: nas curvas do trilho elas acompanham o arco sem formar "quinas"
            const NUM_SLATS  = 24 * SLAT_SUB;
            const SLAT_PITCH = 24.5 / SLAT_SUB;
            const MAX_TRAVEL = Math.max(0, totalRailLen - NUM_SLATS * SLAT_PITCH - 8);  // não ultrapassa o fim do trilho

            const doorMat=new THREE.MeshBasicMaterial({color:0xd4d7ea,side:THREE.DoubleSide,...po});   // porta rolante: lavanda clara (render SVG)
            const handleMat=new THREE.MeshBasicMaterial({color:0x7b86b0,side:THREE.DoubleSide});
            const slatEdgeMat=new THREE.LineBasicMaterial({color:0x1e293b});   // divisões da porta: traço CAD #1e293b

            const slats=[];
            const slatGeo=new THREE.BoxGeometry(DOOR_WIDTH, SLAT_PITCH*1.04, DOOR_THICK);   // fatias coladas (leve sobreposição, sem frestas nas curvas)
            const slatEdges=new THREE.EdgesGeometry(slatGeo);

            for(let i=0; i<NUM_SLATS; i++){
                const slatGroup=new THREE.Group();
                const mesh=new THREE.Mesh(slatGeo, doorMat);
                const edges=new THREE.LineSegments(slatEdges, slatEdgeMat);
                slatGroup.add(mesh);
                if(i % SLAT_SUB === 0) slatGroup.add(edges);   // linhas só a cada ripa original (mesma aparência de antes)
                if(i===0){
                    const hGeo=new THREE.BoxGeometry(150, 10, DOOR_THICK+0.6);
                    const hMesh=new THREE.Mesh(hGeo, handleMat);
                    const hEdges=new THREE.LineSegments(new THREE.EdgesGeometry(hGeo), slatEdgeMat);
                    slatGroup.add(hMesh);
                    slatGroup.add(hEdges);
                    solids.push(hMesh);
                }
                group.add(slatGroup);
                solids.push(mesh);
                slatGroup.userData.novaSlat = 1; slats.push(slatGroup);
            }

            let openProgress = 0;
            function updateDoor(progress){
                openProgress = Math.max(0, Math.min(1, progress));
                const startS = openProgress * MAX_TRAVEL;
                for(let i=0; i<NUM_SLATS; i++){
                    const s = startS + (i + 0.5) * SLAT_PITCH;
                    const u = Math.min(0.995, Math.max(0.005, s / totalRailLen));
                    const pt = railCurve.getPointAt(u);
                    const tan = railCurve.getTangentAt(u);
                    const angle = Math.atan2(tan.z, tan.y);
                    const sg = slats[i];
                    sg.position.set(DIST/2, pt.y, pt.z);
                    sg.rotation.set(-angle, 0, 0);
                }
            }
            updateDoor(0);

            // Âncora do balão "TAMBOUR DOOR": uma ripa do meio do topo da porta fechada (o ponto acompanha a porta ao abrir/fechar)
            let doorAnchorSlat = null;
            (function(){
                let top = -Infinity; slats.forEach(sg => { if (sg.position.y > top) top = sg.position.y; });
                const flat = slats.filter(sg => sg.position.y > top - 2);
                doorAnchorSlat = flat[Math.floor(flat.length / 2)] || slats[Math.floor(slats.length / 2)];
            })();
            const _balloons = container.querySelector('.cad3d-balloons');
            const _bLine = document.getElementById('cb-line'), _bDot = document.getElementById('cb-dot'), _bSvg = _balloons ? _balloons.querySelector('.cb-lead') : null;
            const _bDoor = _balloons ? _balloons.querySelector('.cb-door') : null;
            const _bV = new THREE.Vector3();
            function placeBalloons(){
                if(!_balloons || !_bSvg || !_bDoor || !doorAnchorSlat || !_balloons.offsetParent) return;   // só no roteiro/vídeo
                const W = container.clientWidth, H = container.clientHeight; if(!W || !H) return;
                _bV.copy(doorAnchorSlat.position); group.localToWorld(_bV); _bV.project(cam);
                const x = (_bV.x * 0.5 + 0.5) * W, y = (-_bV.y * 0.5 + 0.5) * H;
                const x1 = _bDoor.offsetLeft, y1 = _bDoor.offsetTop + _bDoor.offsetHeight / 2;
                _bSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
                _bLine.setAttribute('x1', x1); _bLine.setAttribute('y1', y1); _bLine.setAttribute('x2', x); _bLine.setAttribute('y2', y);
                _bLine.setAttribute('stroke-width', Math.max(1.5, W * 2 / 1920).toFixed(2));   // linha de chamada fina (HUD)
                _bDot.setAttribute('cx', x); _bDot.setAttribute('cy', y); _bDot.setAttribute('r', Math.max(3, W * 6 / 1920).toFixed(2));
            }

