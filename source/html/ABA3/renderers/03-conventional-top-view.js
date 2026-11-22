            // Aba 3 (convencional): contorno vetorial de referência, cantos, inclinações e travas.
            // As quatro malas continuam renderizadas em Three.js sob as mesmas luzes do bin Alpha.
            (function conventionalSVGTopView(){
                const cv=document.getElementById('convTopCanvas');
                const box=document.getElementById('conv-top-container');
                const back=document.getElementById('convStructureBackCanvas');
                const front=document.getElementById('convStructureFrontCanvas');
                const dim=document.getElementById('convDimCanvas');
                if(!cv||!box||!back||!front||!dim)return;
                // 7 caminhos ORIGINAIS de bincomparede.svg; 6 painéis + base/travas.
                const svgPaths=["M1347.89 8792.94c-91.47,568.86 241.12,8627.73 241.12,8627.73 3855.87,35.06 13619.34,224.3 17491.97,-26.61 0,0 311.89,-8686.11 213.96,-8649.44 -35.92,13.45 -17928.34,-68.06 -17947.05,48.32z","M1110.39 8032.69c-159.1,77.16 221.31,744.87 221.31,744.87 3951.89,2.95 13941.84,17.48 17910.91,-3.6 0,0 369.39,-733.03 269.04,-729.97 -36.8,1.12 -18381.93,-20.68 -18401.26,-11.3z","M1047.79 8221.84c-1.8,568.86 223.27,9378.02 223.27,9378.02 76.94,35.06 271.67,4.79 287.24,-38.45 0,0 -303.1,-8781.87 -281.09,-8811.24 26.08,-34.8 -229.42,-528.33 -229.42,-528.33z","M19303.04 8690.98c-1.8,568.86 -231.35,8855.45 -231.35,8855.45 76.94,35.06 271.67,4.79 287.24,-38.45 0,0 261.49,-9333.95 259.55,-9297.29 -0.71,13.44 -315.44,480.29 -315.44,480.29z","M1271.06 17599.86c-67.3,1383.17 790.32,1248.1 790.32,1248.1 3855.86,6.06 13297,227.62 16888.97,73.23 361.04,-15.52 532.96,-1409.63 435.03,-1403.31 -35.9,2.32 -18112.99,54.59 -18114.32,81.98z","M924.26 7931.28c-95.96,723.56 246.47,10443.8 246.47,10443.8 188.15,560.47 643.7,623.57 813.7,625.37 4187.52,44.34 12981.15,28.35 16708.86,-106.79 134.91,-4.89 661.29,-200.75 849.04,-741.99 0,0 329.17,-10290.75 226.41,-10244.14 -37.69,17.1 -18824.85,-124.25 -18844.48,23.75z","M14028 18611.51l2623.57 -0.1 -2.71 304.41 -2639.8 3.32 18.94 -307.63zm-9441.52 7.86l2610.61 1.72 8.59 294.65 -2627.14 -0.63 7.94 -295.74zm9598.64 -268.29l379.13 -7.21 1777.18 7.21 189.56 0.08 112.66 -0.44 -0.06 162.1 -2625.57 0.46 -0.87 -162.59 167.97 0.39zm-6988.09 -0.36l-0.03 162.69 -2633.55 -0.13 -0.88 -162.57 2634.46 0.01zm9538.14 -91.59c-288.07,-32.42 -2618.27,-47.13 -2809.58,15.57l-0.5 530.51 -6631.85 -8.64c4.84,-679.36 106.48,-545.59 -643.34,-545.53 -236.96,0.02 -473.92,-0.03 -710.88,-0.03 -1632.81,0 -1467.43,-209.11 -1467.43,538.12 -176.98,62.4 -1717.54,12.35 -2039.53,14.74 -333.22,2.49 -654.5,44.79 -885.29,-151.64 -162.88,-138.63 -257.16,-474.52 -206.4,-774.23l17979.72 -0.08c35.9,238.57 -42.47,587.91 -159.86,719.99 -48.29,54.33 -182.38,129.37 -283.29,161.59 -269.62,86.07 -1856.79,62.6 -2141.09,44.64l-0.68 -545.01zm2499.33 -488.41c-263.52,46.7 -819.23,14.97 -1115.9,15.57 -1724.28,3.51 -16595.78,24.98 -16712.01,-15.57l4.36 -99.18c128.51,-46.57 3902.62,3.39 4456.99,-17.29 732.2,-27.31 1490.96,1.39 2227.39,1.65 742.41,0.26 1484.96,0.02 2227.4,0.02 250.7,0 8643.21,-33.45 8916.13,15.62l-4.36 99.18zm-82.36 -301.16c0.18,-0.33 38.65,-2133.04 42.56,-2283.87 31.45,-764.42 39.52,-1533.68 66.76,-2297.9l115.76 -4052.6c11.45,-50.06 140.51,-399.42 206.62,-509.9l-255.06 9191.89c-62.09,-21.29 -126.39,-29.57 -176.64,-47.62zm-17779.38 -8666.68l15537.37 0.1c509.28,-1.03 1879.21,26.3 2364.63,-0.16l-239.02 8468.81 -17425.25 -0.12 -237.73 -8468.63zm-24.08 -92.71c4.84,-0.13 -161.32,-332.68 -240.7,-538.71 -21.11,-54.78 60.49,-95.09 162.99,-95.09l18214.98 0c-4.59,26.37 -283.02,608.15 -300.06,630.76l-15071.44 2.36c-438.06,0.3 -855.24,3.03 -1297.83,4.36 -442.58,1.32 -910.58,1.24 -1450.25,-4.08 -90.5,1.52 -93.05,5.91 -93.17,124.96l220.12 8642.44c-71.98,19.68 -128.22,36.3 -175.57,62.97 -22.19,-1528.15 -117.06,-3080.31 -118.12,-4605.65 -0.35,-499.11 -139.08,-4315.5 -103.6,-4589.85 61.75,129.67 181.16,405.62 181.18,405.53 5.42,-45.07 54.63,-39.18 71.47,-40zm3126.6 10195.75c-15.21,72.57 -36.31,51.7 -144.96,50.35l-1613.9 -1.33c-646.76,-1.39 -1131.81,65.51 -1414.02,-386.86 -148.15,-237.48 -103.14,-510.32 -110.27,-799.56 -7.43,-301.52 -16.44,-599.44 -28.69,-900.43 -71.67,-1760.81 -94.32,-3591.5 -145.08,-5355.22 -33.93,-1179.08 -80.82,-2385.99 -80.82,-3563.67 141.81,-49.99 15065.38,-7.38 16446.5,-7.38 448.99,0 2034.06,-28.02 2331.25,-7.97 0,1650.5 -77.54,3323.69 -118.95,4977.07 -20.65,824.39 -42.07,1640.46 -62.99,2464.35 -10.64,419.47 -23.37,837.5 -37.16,1256.72l-24.91 924.36c-3.69,302.36 18.15,210.09 -49.41,225.17 -21.66,-386.64 17.9,-810.68 22.54,-1200.28 28.63,-2401.67 139.97,-4929.24 190.32,-7365.89 6.94,-335.58 75.41,-939.94 -8.68,-1207.75 -302.21,-53.55 -677.21,-24.79 -1009.83,-24.77l-15520.68 0c-275.44,0 -1943.74,-53.38 -2051.1,32.92 -110.63,88.92 -45.92,776.29 -38.47,961.68 13.38,332.72 2.94,660.89 19.06,995.21 64.15,1330.3 57.07,2674.04 106.97,4005.69 50.65,1351.87 67.34,2700.23 109.71,4051.81 17.28,551.2 218.67,828.35 715.22,861.65 523.47,35.11 2329.79,-48.65 2518.35,14.13zm15322.28 -11021.71c-270.29,-71.15 -3210.78,-30.41 -3740.48,-30.41 -1249.41,0 -2492.34,-3.33 -3743.92,-3.48l-9430.88 -0.01c-614.5,0.11 -1290.64,-27.78 -1896.26,-5.35 -223.68,8.29 -138.68,396.55 -124.53,753.31 12.49,314.72 13.58,630.65 17.1,946.06 6.68,600.88 35.48,1220.87 51.39,1826.36 32.2,1225.39 56.77,2450.81 98.42,3672.83 21.09,618.61 29.19,1233.11 49.73,1848.24 13.74,411.63 -23.8,1457.82 159.43,1738.58 42.53,65.17 156.46,194.36 217.89,234.43 375.86,245.18 743.39,171.05 1212.62,169.57l15095.12 -0.02c348.94,-0.12 994.97,60.07 1291.93,-89.02 616.06,-309.29 494.1,-1077.59 518.11,-1840.26 86.65,-2752.19 118.54,-5547.97 209.77,-8293.54 8.72,-262.31 38.43,-678.44 14.56,-927.29z"];
                const panels=svgPaths.slice(0,6).map(d=>new Path2D(d));
                const bottomAndLatches=new Path2D(svgPaths[6]);
                const shellPaths=[...panels,bottomAndLatches];
                // Limites geométricos calculados a partir do path fornecido.
                const B={x0:815,y0:7790,x1:19865,y1:19120};
                // Comprime apenas a altura do SVG (11%), sem alterar seus
                // 56" horizontais, a escala da tela nem os materiais fumê.
                const SHELL_HEIGHT_FACTOR=0.89;
                const SHELL_Y_CENTER=(B.y0+B.y1)/2;
                const compressedY=y=>SHELL_Y_CENTER+(y-SHELL_Y_CENTER)*SHELL_HEIGHT_FACTOR;
                const s3=new THREE.Scene();
                scene.children.filter(o=>o.isLight).forEach(l=>s3.add(l.clone()));
                // Câmera ortográfica: sem distorção de perspectiva; as malas são
                // ajustadas ao vão interno pela fórmula de bagWidthFitted em draw().
                const camera=new THREE.OrthographicCamera(-1,1,1,-1,10,25000);
                const center=new THREE.Vector3(0,300,0);
                let renderer=null;
                const renderedSize = new THREE.Vector2(); // tamanho WebGL reutilizado para evitar resizes redundantes
                // Os clones já compartilham os materiais reais da Aba 2; só a linha de acabamento é adicionada.
                const trim=bagEdgeMat;     // chanfros ciano #38bdf8 (40%)
                const caseModels=[];
                for(let i=0;i<4;i++){
                    const b=bags[2].root.clone(true);
                    b.visible=true;
                    b.rotation.set(-Math.PI/2,0,0);
                    // Ocultar contornos originais; o clone já usa exatamente os mesmos materiais.
                    b.traverse(o=>{ if(o.isLineSegments||o.isLineLoop)o.visible=false; });
                    const ch=bagShape.getPoints(20).map(p=>new THREE.Vector3(p.x*.97,p.y,127.5));
                    b.children[0].add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ch),trim));
                    s3.add(b);caseModels.push(b);
                }
                function ctxFor(c,W,H,dpr){
                    const cw=Math.round(W*dpr),ch=Math.round(H*dpr);
                    if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
                    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);return ctx;
                }
                function structure(W,H,dpr){
                    const sc=Math.min((W-42)/(B.x1-B.x0),(H-110)/(B.y1-B.y0));
                    const ox=(W-(B.x1-B.x0)*sc)/2,oy=(H-(B.y1-B.y0)*sc)/2+22;
                    const p=(x,y)=>[ox+(x-B.x0)*sc,oy+(compressedY(y)-B.y0)*sc];
                    const pVisual=(x,y)=>[ox+(x-B.x0)*sc,oy+(y-B.y0)*sc];
                    const transform=c=>{
                        c.translate(ox-B.x0*sc,oy-B.y0*sc);
                        c.scale(sc,sc);
                        c.translate(0,SHELL_Y_CENTER*(1-SHELL_HEIGHT_FACTOR));
                        c.scale(1,SHELL_HEIGHT_FACTOR);
                        c.lineJoin='round';c.lineCap='round';
                    };
                    const b=ctxFor(back,W,H,dpr);b.save();transform(b);
                    const gradient=b.createLinearGradient(0,8050,0,19000);
                    gradient.addColorStop(0,'rgba(107,132,165,.31)');
                    gradient.addColorStop(.55,'rgba(67,87,121,.22)');
                    gradient.addColorStop(1,'rgba(51,70,105,.31)');
                    b.fillStyle=gradient;
                    panels.forEach((panel,i)=>{
                        b.globalAlpha=i===5?0.78:0.97;
                        b.fill(panel,'evenodd');
                    });
                    b.globalAlpha=.78;
                    b.fillStyle='rgba(75,98,128,.45)';
                    b.fill(bottomAndLatches,'evenodd');
                    b.restore();
                    const f=ctxFor(front,W,H,dpr);f.save();transform(f);
                    // Mesmo acabamento acrílico fumê do Alpha: linhas de 1px,
                    // sem wireframe branco ou bordas duplas artificiais.
                    f.strokeStyle='rgba(124,153,189,.37)';
                    f.lineWidth=1.05/sc;
                    shellPaths.forEach(p=>f.stroke(p));
                    // Apenas as travas inferiores ficam à frente das malas.
                    f.save();f.beginPath();f.rect(800,18160,19000,950);f.clip();
                    f.fillStyle='rgba(95,115,146,.47)';
                    f.fill(bottomAndLatches,'evenodd');
                    f.restore();f.restore();
                    return {sc,p,pVisual};
                }
                function draw(){
                    const r=box.getBoundingClientRect(),W=r.width,H=r.height;
                    if(!W||!H)return null;
                    if(!renderer){
                        renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
                        renderer.setClearColor(0xffffff,0);
                    }
                    const dpr=Math.min(window.devicePixelRatio||1,2),geo=structure(W,H,dpr);
                    // setPixelRatio já chama setSize internamente. Não realocar o canvas quando nada mudou.
                    if(renderer.getPixelRatio()!==dpr)renderer.setPixelRatio(dpr);
                    renderer.getSize(renderedSize);
                    if(renderedSize.x!==W||renderedSize.y!==H)renderer.setSize(W,H,false);
                    // Escala da LARGURA EXTERNA ATUAL (inalterada) do SVG de 56":
                    // 56 in = B.x1-B.x0. As malas partem da referência IATA 14 × 22 in,
                    // mas sua largura visual é reduzida para caber no vão interno.
                    const svgWidth=B.x1-B.x0, inchSvg=svgWidth/56;
                    const bagWidthSvg=14*inchSvg,bagHeightSvg=22*inchSvg;
                    const worldPerPixel=560/(8300*geo.sc);
                    camera.left=-W*worldPerPixel/2;
                    camera.right=W*worldPerPixel/2;
                    camera.top=H*worldPerPixel/2;
                    camera.bottom=-H*worldPerPixel/2;
                    camera.up.set(0,0,1);
                    camera.position.set(0,center.y+6000,0);
                    camera.lookAt(center);
                    camera.updateProjectionMatrix();
                    camera.updateMatrixWorld(true);
                    const q0=new THREE.Vector3(0,center.y,0).project(camera);
                    const xs=new THREE.Vector3(1,center.y,0).project(camera).x>q0.x?1:-1;
                    const zs=new THREE.Vector3(0,center.y,1).project(camera).y>q0.y?1:-1;
                    // A cavidade afunila para a base. O SVG tem aproximadamente
                    // 17490 unidades ÚTEIS neste ponto, não 19050 externos.
                    // A redução sugerida de 4–6% não basta para evitar colisão,
                    // portanto a largura final é limitada pelo vão interno.
                    const innerLeftBase=1590,innerRightBase=19080;
                    const lateralClearance=85,gapBetweenBags=20;
                    const innerUsable=innerRightBase-innerLeftBase-2*lateralClearance;
                    const bagWidthFitted=Math.min(
                        bagWidthSvg*0.95,(innerUsable-3*gapBetweenBags)/4
                    );
                    const lineupWidth=4*bagWidthFitted+3*gapBetweenBags;
                    const xStart=(innerLeftBase+innerRightBase-lineupWidth)/2;
                    const bagWidthWorld=bagWidthFitted*geo.sc*worldPerPixel;
                    // A altura visual parte da referência de 22 in; o casco SVG é
                    // comprimido separadamente em Y, sem alterar esta pose.
                    const bagTopVisual=9435,bagCenterVisual=bagTopVisual+bagHeightSvg/2;
                    const bagHeightWorld=bagHeightSvg*geo.sc*worldPerPixel;
                    caseModels.forEach((b,i)=>{
                        const xSvg=xStart+(i+.5)*bagWidthFitted+i*gapBetweenBags;
                        const px=geo.pVisual(xSvg,bagCenterVisual);
                        b.position.set(xs*(px[0]-W/2)*worldPerPixel,
                            center.y,zs*(H/2-px[1])*worldPerPixel);
                        // O modelo original 356 × 559 é escalado para a composição visual;
                        // materiais e iluminação permanecem os mesmos.
                        b.scale.set(bagWidthWorld/356,bagHeightWorld/559,1);
                    });
                    renderer.render(s3,camera);
                    const c=ctxFor(dim,W,H,dpr);
                    if(!window.__convNoDim){
                        const a=geo.p(924,7931),b=geo.p(19770,7931);
                        drawTopDimension(c,a[0],b[0],TOP_BIN_DIMENSION_Y,'56"');
                    }
                    return cv;
                }
                window.__convDraw=draw;
                window.__convCapture=()=>{
                    const out=document.createElement('canvas');out.width=cv.width;out.height=cv.height;
                    const c=out.getContext('2d');
                    [back,cv,front].forEach(layer=>c.drawImage(layer,0,0,out.width,out.height));
                    return out;
                };
                // O título só deve entrar uma vez, ao fim da revelação dos bins.
                // No replay do take, cancela qualquer fade herdado da execução anterior.
                window.novaShowHeader=(show, immediate=false)=>{
                    const el=document.getElementById('nova-comparison-header');
                    if(!el)return;
                    if(immediate)el.style.transition='none';
                    el.classList.toggle('is-visible',!!show);
                    if(immediate){
                        void el.offsetWidth;
                        el.style.transition='';
                    }
                };
                // Basta observar a área que de fato determina o tamanho desta vista.
                // O Alpha possui renderizador próprio e não modifica as dimensões deste painel.
                new ResizeObserver(draw).observe(box);
                if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
                draw();
            })();

