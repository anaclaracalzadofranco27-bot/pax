            // Modelo da Mala de Cabine IATA (22 x 14 x 10 in)
            const mPl=new THREE.MeshLambertMaterial({color:0x4c598e,...po});   // nervuras/placas das malas: azul médio (render SVG)
            const mBlk=new THREE.MeshLambertMaterial({color:0x2a3358,...po});   // rodas e alças: azul quase preto (render SVG)
            const mMet=new THREE.MeshLambertMaterial({color:0x6c769c,...po});
            const bagEdgeMat=new THREE.LineBasicMaterial({color:0x38bdf8,transparent:true,opacity:0.4});   // arestas das malas: ciano HUD (#38bdf8, 40%) sobre o azul escuro

            function rr(w,h,r,y){
                const s=new THREE.Shape(),x=-w/2,X=w/2,Y=y+h;
                s.moveTo(x+r,y);s.lineTo(X-r,y);s.quadraticCurveTo(X,y,X,y+r);s.lineTo(X,Y-r);s.quadraticCurveTo(X,Y,X-r,Y);
                s.lineTo(x+r,Y);s.quadraticCurveTo(x,Y,x,Y-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
                return s;
            }

            const bagShape=rr(346,495,50,50);
            const bagBodyGeo=new THREE.ExtrudeGeometry(bagShape,{depth:212,bevelEnabled:true,bevelThickness:18,bevelSize:18,bevelOffset:-18,bevelSegments:5,curveSegments:10});
            bagBodyGeo.translate(0,0,-106);

            // Rótulos das cotas: mantidos junto à mala, mas confinados à área útil da câmera.
            const bagDimensionLabels = [];
            const bagDimensionLayer = container.querySelector('.cad3d-dimension-labels');
            function createSuitcase(bodyColorHex, withDims){
                const root = new THREE.Group();
                const inner = new THREE.Group();
                inner.position.y = -279.5;
                root.add(inner);

                const mBody = new THREE.MeshLambertMaterial({color:bodyColorHex,...po});
                function part(geo,matP,x,y,z,rz,ang){
                    const m=new THREE.Mesh(geo,matP);m.position.set(x,y,z);if(rz)m.rotation.z=rz;
                    inner.add(m);solids.push(m);
                    const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo,ang||30),bagEdgeMat);
                    l.position.copy(m.position);l.rotation.copy(m.rotation);inner.add(l);
                }

                part(bagBodyGeo,mBody,0,0,0,0,35);
                [-4,0,4].forEach(z=>{
                    const p=bagShape.getPoints(10).map(v=>new THREE.Vector3(v.x,v.y,z));
                    inner.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p),bagEdgeMat));
                });
                for(let i=-4;i<=4;i++)[-1,1].forEach(s=>part(new THREE.BoxGeometry(4,380,3),mPl,i*32,297.5,s*125.5));
                part(new THREE.BoxGeometry(180,8,50),mPl,0,549,0);
                part(new THREE.CapsuleGeometry(6,118,4,10),mBlk,0,553,0,Math.PI/2);
                [-1,1].forEach(s=>{
                    part(new THREE.BoxGeometry(4,160,70),mPl,s*175,297.5,0);
                    part(new THREE.BoxGeometry(5,100,26),mBlk,s*175.5,297.5,0);
                });
                [-1,1].forEach(sx=>[-1,1].forEach(sz=>{
                    const px=sx*105,pz=sz*70;
                    part(new THREE.BoxGeometry(50,24,46),mPl,px,40,pz);
                    part(new THREE.CylinderGeometry(4,4,52,12),mMet,px,25,pz,Math.PI/2);
                    [-1,1].forEach(w => {
                        part(new THREE.CylinderGeometry(25,25,14,28),mBlk,px+w*14,25,pz,Math.PI/2);
                    });
                }));

                let env = null;
                if(withDims){
                    env=new THREE.LineSegments(
                        new THREE.EdgesGeometry(new THREE.BoxGeometry(356,559,254)),
                        new THREE.LineBasicMaterial({color:0xe0a800,depthTest:false})
                    );
                    env.renderOrder=4;
                    root.add(env);
                    const ym=new THREE.LineBasicMaterial({color:0xe0a800,depthTest:false});
                    function dim(a,b,txt,c){
                        const l=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),ym);
                        l.renderOrder=5;env.add(l);
                        // Não usar sprites 3D para os números: podiam atravessar a borda
                        // e ficar escondidos atrás da caixa de explicação.
                        const label=document.createElement('span');
                        label.className='cad3d-dimension-value';
                        label.textContent=txt;
                        if(bagDimensionLayer) bagDimensionLayer.appendChild(label);
                        bagDimensionLabels.push({
                            el:label, envelope:env,
                            a:new THREE.Vector3(...a), b:new THREE.Vector3(...b),
                            anchor:new THREE.Vector3(...c)  // posição próxima à das cotas originais
                        });
                    }
                    dim([215,-279.5,160],[215,279.5,160],'22 in',[248,0,160]);
                    dim([-178,-322,160],[178,-322,160],'14 in',[0,-345,160]);
                    dim([215,-322,-127],[215,-322,127],'10 in',[248,-322,0]);
                }

                root.visible = false;
                scene.add(root);
                return { root, env, mBody };
            }

            // Cotas junto à mala como antes: usa a âncora original de cada medida
            // e aplica apenas um pequeno afastamento abaixo da linha e limites 16:9.
            function fitBagDimensionLabels() {
                const w=container.clientWidth, h=container.clientHeight;
                if(!bagDimensionLayer || w<1 || h<1) return;
                scene.updateMatrixWorld(true);
                cam.updateMatrixWorld();
                const pt=new THREE.Vector3();
                const pos=v=>{
                    pt.copy(v);
                    pt.project(cam);
                    return {x:(pt.x+1)*w/2,y:(1-pt.y)*h/2,z:pt.z};
                };
                const box=_balloons && _balloons.querySelector('.alpha-hero-desc-box');
                const desc=box && _balloons.offsetParent && getComputedStyle(box).visibility!=='hidden'
                    ?box.getBoundingClientRect():null;
                const cont=container.getBoundingClientRect();
                // O antigo limite de 72% forçava as cotas para cima da mala.
                const topSafe=h*.12, bottomSafe=h*.90;
                const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
                for(const entry of bagDimensionLabels){
                    const {el,envelope,a,b,anchor}=entry;
                    el.style.visibility='hidden';
                    if(!envelope.visible || !envelope.parent || !envelope.parent.visible) continue;
                    const wa=a.clone(),wb=b.clone(),wc=anchor.clone();
                    envelope.localToWorld(wa);envelope.localToWorld(wb);envelope.localToWorld(wc);
                    const p=pos(wa),q=pos(wb),r=pos(wc);
                    if(!Number.isFinite(p.x+p.y+q.x+q.y+r.x+r.y) || (p.z>1 && q.z>1)) continue;
                    const ew=el.offsetWidth||58, eh=el.offsetHeight||24;
                    const leftSafe=w*.06+ew/2, rightSafe=w*.94-ew/2;
                    let x=clamp(r.x,leftSafe,rightSafe);
                    const horizontal=Math.abs(p.x-q.x)>=Math.abs(p.y-q.y)*.85;
                    let y=horizontal?Math.max(r.y+6,Math.max(p.y,q.y)+11):r.y+9;
                    y=clamp(y,topSafe,bottomSafe-eh);
                    // Preferir mover lateralmente o rótulo (em vez de subi-lo)
                    // quando o texto explicativo ocupa sua posição.
                    if(desc){
                        const dl=desc.left-cont.left,dt=desc.top-cont.top;
                        const dr=desc.right-cont.left,db=desc.bottom-cont.top;
                        if(x+ew/2>dl-8 && x-ew/2<dr+8 && y+eh>dt-7 && y<db+7){
                            const xl=dl-ew/2-14, xr=dr+ew/2+14;
                            const canLeft=xl>=leftSafe,canRight=xr<=rightSafe;
                            if(canLeft||canRight){
                                x=canLeft&&(!canRight||Math.abs(x-xl)<=Math.abs(x-xr))?xl:xr;
                            }else{
                                const below=db+10,above=dt-eh-10;
                                y=clamp(below+eh<=bottomSafe?below:above,topSafe,bottomSafe-eh);
                            }
                        }
                    }
                    el.style.left=x.toFixed(1)+'px';
                    el.style.top=y.toFixed(1)+'px';
                    el.style.visibility='visible';
                }
            }

            const bags = [
                createSuitcase(0x32407a, true),  // 1a mala: deitada (fundo esquerdo) com cotas amarelas
                createSuitcase(0x32407a, false), // 2a mala: deitada (fundo direito)
                createSuitcase(0x32407a, false), // 3a mala: em pe (frente esquerda)
                createSuitcase(0x32407a, false)  // 4a mala: em pe (frente direita)
            ];

