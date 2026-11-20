        // -------------------------------------------------------------------------
        // MÓDULO 6: SIMULAÇÃO CAD 3D (THREE.JS — PORTA ROLANTE 5MM & 4 MALAS IATA)
        // -------------------------------------------------------------------------
        (function initCAD3DModule() {
            const cv = document.getElementById('cad3dCanvas');
            const container = document.getElementById('cad3d-container');
            if (!cv || !container || typeof THREE === 'undefined') return;

            // Geometria fiel ao SVG "lateralcomtrilho.svg" (cores-guia não utilizadas no 3D).
            // U = eixo longitudinal do perfil, H = altura. Ambos no sistema CAD do bin Alpha.
            const SUBS=[[[892.969,674.665],[893.52,191.355],[893.055,184.945],[892.162,181.309],[890.593,178.163],[889.498,176.769],[886.575,174.329],[882.524,172.337],[880.018,171.505],[870.311,169.636],[814.873,165.582],[761.238,160.862],[692.666,153.963],[628.035,146.737],[611.256,142.435],[580.542,133.737],[481.288,104.216],[353.388,64.969],[304.079,49.449],[275.234,39.983],[71.84,39.983],[63.797,43.052],[47.718,50.423],[2.252,72.06],[0.627,73],[-0.015,73.929],[0.23,75.154],[1.268,76.983],[12.446,94.688],[35.695,129.75],[55.678,158.054],[78.267,188.239],[99.33,214.826],[123.053,243.14],[145.096,268.043],[169.84,294.526],[192.762,317.781],[218.415,342.47],[244.501,366.234],[270.988,389.085],[297.844,411.033],[325.041,432.087],[352.546,452.26],[382.868,473.273],[413.482,493.262],[444.346,512.241],[475.422,530.224],[509.279,548.598],[540.667,564.549],[574.769,580.753],[608.924,595.855],[643.081,609.872],[682.429,624.72],[721.635,638.174],[760.621,650.259],[801.875,661.672],[845.23,672.163],[890.908,681.598],[892.139,681.397],[892.724,680.351]],[[876.413,659.454],[877.02,636.388],[876.999,599.682],[876.092,596.244],[874.898,594.761],[872.961,593.557],[870.093,592.727],[866.108,592.362],[812.444,591.61],[680.476,593.252],[677.382,593.525],[674.925,594.215],[673.065,595.259],[671.761,596.597],[670.974,598.165],[670.791,601.746],[672.196,605.507],[674.868,608.951],[678.489,611.584],[724.16,625.982],[786.525,643.63],[867.714,664.981],[870.571,665.154],[872.928,664.331],[874.726,662.867],[875.907,661.122]],[[322.49,401.284],[377.795,441.397],[410.273,464.161],[444.193,486.447],[475.875,505.65],[514.395,527.049],[537.469,539],[554.47,547.341],[560.013,549.011],[562.517,549.245],[564.789,549.011],[566.789,548.26],[568.478,546.941],[569.814,545.005],[570.759,542.4],[571.023,529.385],[571.959,513.786],[576.138,470.962],[577.754,450.608],[577.538,445.322],[576.365,440.624],[575.291,438.617],[573.824,436.903],[571.913,435.53],[569.506,434.549],[561.491,432.986],[546.327,428.904],[495.382,413.733],[298.614,352.093],[286.638,349.022],[278.634,347.615],[272.29,347.398],[269.97,347.855],[268.343,348.752],[267.499,350.137],[267.418,351.355],[268.533,354.561],[272.605,360.158],[278.271,366.045],[286.316,373.307],[296.959,382.056]],[[252.84,76.353],[255.135,66.307],[254.971,62.628],[254.396,61.114],[253.428,59.813],[252.02,58.723],[250.125,57.841],[244.685,56.687],[236.727,56.329],[76.512,56.313],[72.825,56.827],[67.423,58.841],[32.404,74.714],[27.594,77.309],[24.192,79.72],[22.136,82.13],[21.359,84.727],[21.43,86.154],[22.451,89.378],[26.058,95.494],[37.891,111.914],[66.434,153.617],[84.462,177.478],[106.286,203.912],[125.105,225.911],[172.686,278.654],[176.51,282.007],[178.544,283.14],[180.611,283.803],[182.677,283.915],[184.704,283.394],[186.657,282.159],[188.501,280.129],[190.199,277.223],[194.621,266.524],[201.256,247.754],[211.358,216.566],[223.468,177.111]]];
            const PROFILE_SEAM=[[793.419,586.838],[745.702,587.064],[680.256,586.55],[600.821,585.305],[598.765,584.521],[583.226,578.116],[565.892,570.227],[547.057,561.031],[524.068,549.15],[499.942,536.062],[475.115,522.031],[425.115,492.203],[400.82,476.937],[377.58,461.792],[355.833,447.031],[336.018,432.922],[318.574,419.729],[303.94,407.719],[294.496,398.83],[293.391,397.014],[293.009,395.52],[293.261,394.388],[294.056,393.656],[295.303,393.363],[298.791,394.249],[300.852,395.506],[311.927,405.313],[328.009,418.156],[347.595,432.852],[371.214,449.759],[395.364,466.333],[418.719,481.753],[443.491,497.474],[466.059,511.219],[502.628,532.245],[539.759,551.816],[573.248,567.624],[602.596,579.686],[625.71,580.433],[674.883,580.847],[727.156,580.75],[770.756,580.186],[792.026,579.647],[798.802,579.14],[805.351,578.079],[814.733,575.535],[820.683,573.262],[826.379,570.574],[836.981,564.112],[846.475,556.466],[854.799,547.954],[861.892,538.892],[868.93,527.277],[873.824,515.919],[875.154,511.587],[876.452,505.44],[876.891,499.832],[878.712,268.155],[878.632,190.807],[878.401,187.028],[877.956,185.955],[877.165,185.283],[874.172,184.705],[823.155,181.366],[755.495,176.094],[669.901,168.737],[615.762,163.511],[559.32,146.749],[282.99,61.985],[276.256,60.105],[274.297,59.856],[272.997,60.11],[272.146,60.9],[222.704,217.034],[195.295,301.683],[195.093,303.012],[195.618,304.215],[197.258,305.108],[317.097,340.144],[408.048,367.316],[491.862,393.008],[592.511,424.461],[593.829,425.298],[594.418,426.365],[594.354,430.086],[582.745,546.22],[582.95,548.452],[584.557,549.652],[628.002,552.382],[713.428,559.795],[713.165,566.879],[576.299,555.983],[575.771,555.208],[576.716,540.725],[581.165,489.361],[586.568,432.538],[586.126,431.063],[584.483,430.307],[467.086,394.708],[322.416,349.768],[191.773,308.515],[190.151,307.163],[189.652,305.312],[189.736,303.996],[190.901,299.815],[209.067,235.933],[225.686,179.973],[242.445,126.122],[265.956,53.225],[267.186,50.51],[268.74,48.895],[270.6,48.349],[272.747,48.838],[297.274,58.542],[330.063,70.133],[372.565,84.203],[423.177,100.22],[534.325,133.765],[589.865,149.806],[618.324,157.512],[660.157,161.931],[717.615,167.144],[889.376,180.796],[889.821,182.223],[890.09,186.849],[885.255,186.872],[886.06,233.949],[885.526,351.633],[886.193,396.118],[886.227,438.775],[885.809,467.725],[884.884,495.512],[884.088,508.954],[882.72,516.291],[881.225,521.207],[878.172,528.561],[875.634,533.416],[871.134,540.567],[867.711,545.213],[862.003,551.941],[855.684,558.31],[848.84,564.241],[841.556,569.655],[833.919,574.472],[826.013,578.613],[820.635,580.959],[812.473,583.799],[807.003,585.204],[798.822,586.521]];
            const DOOR_SLOT=[[793.419,586.838],[745.702,587.064],[680.256,586.55],[600.821,585.305],[598.765,584.521],[583.226,578.116],[563.287,568.989],[544.26,559.621],[521.106,547.575],[496.867,534.354],[471.984,520.224],[446.894,505.449],[418.967,488.39],[391.958,471.229],[369.226,456.197],[348.153,441.65],[329.176,427.853],[310.879,413.56],[297.813,402.24],[294.496,398.83],[293.391,397.014],[293.009,395.52],[293.261,394.388],[294.056,393.656],[295.303,393.363],[296.911,393.548],[300.852,395.506],[311.927,405.313],[326.298,416.833],[345.444,431.272],[368.69,447.987],[392.562,464.444],[415.715,479.802],[440.329,495.504],[462.794,509.265],[499.267,530.38],[536.384,550.119],[569.931,566.148],[586.416,573.268],[602.596,579.686],[625.71,580.433],[674.883,580.847],[727.156,580.75],[770.756,580.186],[792.026,579.647],[798.802,579.14],[805.351,578.079],[814.733,575.535],[823.563,571.967],[834.432,565.851],[844.208,558.472],[852.831,550.146],[860.237,541.192],[867.69,529.599],[873.023,518.14],[874.535,513.733],[876.114,507.436],[876.891,499.832],[878.638,284.463],[878.76,214.996],[878.588,190.103],[878.143,186.272],[885.255,186.872],[886.097,234.187],[885.526,351.633],[886.163,392.651],[886.254,434.67],[885.208,487.818],[884.299,506.53],[883.296,513.837],[882.029,518.749],[879.294,526.117],[875.634,533.416],[871.134,540.567],[867.711,545.213],[862.003,551.941],[855.684,558.31],[848.84,564.241],[841.556,569.655],[833.919,574.472],[826.013,578.613],[820.635,580.959],[812.473,583.799],[807.003,585.204],[798.822,586.521]];
            const WALL_MOUNT_STRIPS=[[[711.243,580.836],[739.965,580.638],[724.207,581.954]],[[616.016,163.558],[599.762,159.068],[559.304,146.867],[282.99,61.985],[276.257,60.105],[274.297,59.856],[272.997,60.111],[272.146,60.9],[271.535,62.256],[228.256,199.587],[195.093,303.012],[195.618,304.215],[197.258,305.108],[311.484,338.489],[397.465,364.116],[485.882,391.157],[592.511,424.461],[593.828,425.299],[594.418,426.365],[594.353,430.086],[582.745,546.22],[582.95,548.452],[584.557,549.652],[628.002,552.382],[713.427,559.795],[713.165,566.88],[577.383,556.064],[576.294,555.973],[575.844,555.512],[576.436,544.383],[578.832,515.468],[586.568,432.538],[586.126,431.064],[584.483,430.307],[467.086,394.708],[322.416,349.768],[191.773,308.515],[190.151,307.163],[189.652,305.312],[189.736,303.996],[199.816,268.15],[216.717,209.855],[233.358,155.024],[265.956,53.225],[267.186,50.51],[268.74,48.896],[270.6,48.349],[272.747,48.838],[299.948,59.527],[326.801,69.017],[365.115,81.787],[407.316,95.264],[463.033,112.466],[523.813,130.67],[582.625,147.752],[617.839,157.406],[657.523,161.674],[714.544,166.879],[889.376,180.796],[889.822,182.223],[890.09,186.849],[885.255,186.872],[705.152,172.526],[660.091,168.352]]];
            const DOOR_GUIDE=[[881.699,186.572],[882.037,193.677],[882.265,207.929],[882.46,236.435],[882.357,272.069],[881.819,350.463],[881.926,378.967],[881.877,414.6],[881.684,443.106],[881.317,471.611],[880.689,500.106],[880.259,507.214],[878.854,514.194],[876.629,520.959],[873.754,527.477],[870.339,533.727],[866.476,539.712],[862.198,545.406],[857.567,550.818],[852.591,555.914],[847.302,560.688],[841.721,565.115],[835.85,569.152],[829.716,572.778],[823.335,575.945],[816.729,578.615],[809.926,580.725],[802.964,582.231],[795.892,583.076],[781.646,583.471],[760.268,583.736],[724.634,583.874],[689.001,583.765],[653.368,583.466],[617.738,582.954],[603.49,582.584],[596.725,580.576],[583.542,575.157],[564.037,566.405],[544.791,557.096],[525.76,547.353],[506.916,537.251],[488.241,526.843],[469.721,516.159],[445.254,501.53],[421.04,486.486],[397.082,471.04],[373.399,455.175],[355.844,442.971],[338.51,430.456],[321.477,417.533],[310.382,408.587],[304.964,403.957],[299.709,399.144]];
            const WALL_SEAT=[[713.165,566.88],[577.383,556.064],[576.294,555.973],[575.844,555.512],[578.832,515.468],[586.568,432.538],[586.126,431.064],[460.605,392.71],[318.962,348.688],[191.773,308.515],[190.151,307.163],[189.652,305.312],[189.736,303.996],[209.067,235.933],[226.555,177.123],[245.721,115.848],[265.956,53.225],[267.186,50.51],[268.74,48.896],[270.6,48.349],[272.747,48.838]];
            const FLOOR_SEAT=[[272.747,48.838],[294.668,57.573],[323.59,67.913],[361.436,80.588],[403.379,94.026],[463.033,112.466],[523.813,130.67],[582.625,147.752],[617.839,157.406],[657.523,161.674],[717.615,167.144],[889.376,180.796],[889.822,182.223],[890.09,186.849] ]; const DIST=1157, TH=12;

            const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
            ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
            ren.setClearColor(0xffffff,0);
            // Durante a gravação a GPU também codifica o vídeo: se o contexto WebGL for perdido (área 3D em branco com ícone de imagem quebrada), recupera sozinho
            cv.addEventListener('webglcontextlost', e => { e.preventDefault(); }, false);
            cv.addEventListener('webglcontextrestored', () => { try { warmed = false; rs(); } catch (err) { console.warn('CAD3D restore:', err); } }, false);

            const scene=new THREE.Scene();
            const cam=new THREE.PerspectiveCamera(35,1,10,25000);
            scene.add(new THREE.HemisphereLight(0xffffff,0x555566,0.95));
            const dl=new THREE.DirectionalLight(0xffffff,0.65);dl.position.set(900,1400,-1600);scene.add(dl);
            const dl2=new THREE.DirectionalLight(0xffffff,0.35);dl2.position.set(200,800,1200);scene.add(dl2);

            const po={polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1};
            const sh=new THREE.Shape(SUBS[0].map(p=>new THREE.Vector2(p[0],p[1])));
            SUBS.slice(1).forEach(h=>sh.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1])))));
            let g=new THREE.ExtrudeGeometry(sh,{depth:TH,bevelEnabled:false,curveSegments:1});
            g.translate(0,0,-TH/2);
            g.applyMatrix4(new THREE.Matrix4().set(0,0,1,0, 0,1,0,0, -1,0,0,0, 0,0,0,1));

            const mat=new THREE.MeshBasicMaterial({color:0xc6cbdb,side:THREE.DoubleSide,...po});   // lateral do bin: lavanda acinzentada (cor do render SVG)
            const lmat=new THREE.LineBasicMaterial({color:0x1e293b});   // contornos do bin: azul-marinho técnico #1e293b (mesmo traço CAD da cena 1)
            // Contorno externo liso: nenhum furo ou ranhura do trilho nesta face.
            const outerEdges=[];
            SUBS[0].forEach((p,i)=>{
                const q=SUBS[0][(i+1)%SUBS[0].length];
                outerEdges.push(0,p[1],-p[0],0,q[1],-q[0]);
            });
            const eg=new THREE.BufferGeometry();
            eg.setAttribute('position',new THREE.Float32BufferAttribute(outerEdges,3));
            const solids=[],sideWallParts=[],profileBandMaterials=[],profileBandMeshes=[],internalRailParts=[],group=new THREE.Group(); scene.add(group);
            [0,DIST].forEach(x=>{
                const m=new THREE.Mesh(g,mat);m.position.x=x;group.add(m);solids.push(m);
                const l=new THREE.LineSegments(eg,lmat);l.position.x=x;group.add(l);
                if (x === DIST) sideWallParts.push(m, l);  // exportação mantém também os detalhes do perfil
            });

            // Perfis de extrusão e assentamento: tiras CAD em cinza/azul, nunca vermelho ou verde.
            // A ranhura e os encaixes são exclusivamente da face INTERNA das chapas.
            function addProfileBand(pts, color) {
                if (pts.length < 3) return;
                const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0],p[1])));
                const geo = new THREE.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false,steps:1,curveSegments:1});
                geo.translate(0,0,-0.6);
                geo.applyMatrix4(new THREE.Matrix4().set(0,0,1,0, 0,1,0,0, -1,0,0,0, 0,0,0,1));
                const bandMat = new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,...po});
                profileBandMaterials.push(bandMat);
                [0,DIST].forEach(x => {
                    const band = new THREE.Mesh(geo,bandMat);
                    band.position.x = x === 0 ? TH/2+0.85 : DIST-TH/2-0.85;
                    band.userData.novaSideDetail=1;
                    band.userData.innerWallSide=x===0?0:1;
                    profileBandMeshes.push(band);
                    group.add(band);
                    if (x === DIST) sideWallParts.push(band);
                });
            }
            addProfileBand(PROFILE_SEAM, 0x9aa6bb);
            addProfileBand(DOOR_SLOT, 0x65748f); // canal real da porta rolante
            WALL_MOUNT_STRIPS.forEach(p => addProfileBand(p, 0x8997b0)); // assentos das paredes

            // Paredes internas do bin
            const QS=WALL_SEAT.slice(1).map((p,i)=>[WALL_SEAT[i],p]);   // cada parede acompanha exatamente o assento verde do SVG
            const wm=new THREE.MeshBasicMaterial({color:0xa8aec8,side:THREE.DoubleSide,...po});   // paredes internas: lavanda média
            const bl=new THREE.LineBasicMaterial({color:0x1e293b});   // arestas das paredes internas (CAD)
            const topWall=[];   // todas as paredes do novo perfil ficam fixas; nenhuma placa arbitrária é removida
            QS.forEach((q,idx)=>{
                const P=[[0,q[0]],[DIST,q[0]],[DIST,q[1]],[0,q[1]]].map(([x,p])=>[x,p[1],-p[0]]);
                const gq=new THREE.BufferGeometry();
                gq.setAttribute('position',new THREE.Float32BufferAttribute([...P[0],...P[1],...P[2],...P[0],...P[2],...P[3]],3));
                const m=new THREE.Mesh(gq,wm);group.add(m);solids.push(m);
                const segs=[...P[1],...P[2],...P[3],...P[0]];
                const lg=new THREE.BufferGeometry();
                lg.setAttribute('position',new THREE.Float32BufferAttribute(segs,3));
                const lsQ=new THREE.LineSegments(lg,bl); group.add(lsQ);

            });

            // Piso do bin
            const fm=new THREE.MeshBasicMaterial({color:0x6c769c,side:THREE.DoubleSide,...po});   // piso do bin: azul-ardósia (render SVG)
            [FLOOR_SEAT].forEach(pl=>{
                const v=[];for(let i=0;i<pl.length-1;i++){const a=pl[i],b=pl[i+1];
                    const A0=[0,a[1],-a[0]],A1=[DIST,a[1],-a[0]],B1=[DIST,b[1],-b[0]],B0=[0,b[1],-b[0]];
                    v.push(...A0,...A1,...B1,...A0,...B1,...B0);}
                const gf=new THREE.BufferGeometry();gf.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
                const mf=new THREE.Mesh(gf,fm);group.add(mf);solids.push(mf);
                const e=[];[0,DIST].forEach(x=>{for(let i=0;i<pl.length-1;i++){e.push(x,pl[i][1],-pl[i][0],x,pl[i+1][1],-pl[i+1][0]);}});
                const a0=pl[0],a1=pl[pl.length-1];e.push(0,a0[1],-a0[0],DIST,a0[1],-a0[0],0,a1[1],-a1[0],DIST,a1[1],-a1[0]);
                const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(e,3));
                group.add(new THREE.LineSegments(lg,lmat));
            });

            const O=SUBS[0];
            const near=(y,z)=>O.reduce((a,p)=>Math.hypot(p[0]-y,p[1]-z)<Math.hypot(a[0]-y,a[1]-z)?p:a);
            const cp=[];[FLOOR_SEAT[0],FLOOR_SEAT[FLOOR_SEAT.length-1]].forEach(p=>cp.push(0,p[1],-p[0],DIST,p[1],-p[0]));
            const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));
            group.add(new THREE.LineSegments(cg,lmat));

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
                topWall.forEach(o=>{ o.visible = false; });   // placa do teto (QS[0]) removida da vista em qualquer abertura
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

            const slider = document.getElementById('cad3d-doorSlider');
            const pctLabel = document.getElementById('cad3d-doorPct');
            const btnToggle = document.getElementById('cad3d-toggleDoor');
            const btnStartSim = document.getElementById('cad3d-startSim');
            const btnResetSim = document.getElementById('cad3d-resetSim');

            let simReq = null;
            let simStartTime = 0;
            let doorAnimReq = null;
            let doorAnimTarget = 0;

            const T = new THREE.Vector3(DIST/2, 330, -620);
            let az = -2.25, el = 0.28, R = 3100;
            const views = {
                iso: [-2.25, 0.28, 3100],
                side: [0, 0, 2600],
                front: [-Math.PI/2, 0, 2800],
                top: [0, Math.PI/2 - 0.001, 2800]
            };

            function upd(){
                cam.position.set(T.x + R*Math.cos(el)*Math.cos(az), T.y + R*Math.sin(el), T.z + R*Math.cos(el)*Math.sin(az));
                cam.lookAt(T);
                fitBagDimensionLabels();
                const exterior=cam.position.x<-TH/2?0:(cam.position.x>DIST+TH/2?1:-1);
                [...profileBandMeshes,...internalRailParts].forEach(o=>{o.visible=exterior!==o.userData.innerWallSide;});
                ren.render(scene, cam);
                placeBalloons();
            }

            // Pré-aquece a GPU: compila os shaders e envia a geometria das 4 malas ANTES da simulação.
            // Sem isso, as malas 3 e 4 são enviadas à GPU no meio da animação (quando "entram"), o que travava/derrubava o contexto WebGL durante a gravação.
            let warmed = false;
            function warmUp(){
                if(warmed) return; warmed = true;
                const saved = bags.map(b => [b.root.visible, b.env ? b.env.visible : null]);
                bags.forEach(b => { b.root.visible = true; if(b.env) b.env.visible = true; });
                try { ren.compile(scene, cam); ren.render(scene, cam); } catch(err) { console.warn('CAD3D warm-up:', err); }
                bags.forEach((b, i) => { b.root.visible = saved[i][0]; if(b.env) b.env.visible = saved[i][1]; });
            }
            window.cad3dWarmUp = warmUp;

            function rs(){
                const rect = container.getBoundingClientRect();
                if(rect.width === 0 || rect.height === 0) return;
                const recOn = !!document.querySelector('#tour-stage.rec');           // gravando: resolução interna 1x (menos carga na GPU, que também codifica o vídeo)
                ren.setPixelRatio(recOn ? 1 : Math.min(window.devicePixelRatio||1,2));
                ren.setSize(rect.width, rect.height, false);
                cam.aspect = rect.width / rect.height;
                cam.updateProjectionMatrix();
                upd();
            }
            window.resizeCAD3D = rs;
            let introSequenceId=0;
            function resetIntroSequence(){
                introSequenceId++;
                if (_balloons) {
                    _balloons.classList.remove('tour-sequenced','hud-off');
                    const C=window.APHA_INTRO_CFG;
                    _balloons.style.setProperty('--apha-intro-fade',C.fadeMs+'ms');
                    _balloons.style.setProperty('--apha-title-delay',C.titleDelayMs+'ms');
                    _balloons.style.setProperty('--apha-legend-delay',C.legendDelayMs+'ms');
                    _balloons.style.setProperty('--apha-measures-delay',C.measuresDelayMs+'ms');
                    _balloons.style.setProperty('--apha-desc-delay',C.descriptionDelayMs+'ms');
                }
            }
            function showIntroAfterStableFrame(){
                const id=++introSequenceId;
                requestAnimationFrame(()=>requestAnimationFrame(()=>{
                    if(id!==introSequenceId || !container.closest('#tour-stage')) return;
                    if(_balloons) _balloons.classList.add('tour-sequenced');
                }));
            }
            window.cad3dTourPrep = () => {
                resetIntroSequence();
                warmUp();
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                az = -2.35; el = 0.28; R = 2925;
                updateDoor(0);
                syncDoorUI();
                bags.forEach((b, idx) => {
                    if (idx <= 1) {
                        b.root.visible = true;
                        if (b.env) b.env.visible = true;
                        setBagPoseAlongPath(idx, 0);
                    } else {
                        b.root.visible = false;
                    }
                });
                rs();
            };

            function syncDoorUI(){
                const pct = Math.round(openProgress * 100);
                slider.value = openProgress * 100;
                pctLabel.textContent = pct + '%';
                btnToggle.textContent = (openProgress < 0.5) ? 'Open Door' : 'Close Door';
            }

            function stopAllAnimations(){
                if(simReq){ cancelAnimationFrame(simReq); simReq = null; }
                if(doorAnimReq){ cancelAnimationFrame(doorAnimReq); doorAnimReq = null; }
            }

            function resetSimulation(){
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                bags.forEach(b=>{
                    b.root.visible = false;
                    if(b.env) b.env.visible = true;
                });
                updateDoor(0);
                syncDoorUI();
                btnStartSim.innerHTML = '<span>▶ Start Simulation</span>';
                upd();
            }

            function runSimulationFrame(now){
                const t = Math.max(0, (now - simStartTime) / 1000);
                if(container.closest('#tour-stage')){            // movimento contínuo e suave da câmera durante toda a cena
                    const k = smoothstep(Math.min(1, t / 5.9));
                    R = 2925 + (2700 - 2925) * k;
                    az = -2.35 + 0.10 * k;
                }

                if(t < 1.2){
                    const k = smoothstep(t / 1.2);
                    updateDoor(k);
                    syncDoorUI();
                    bags[0].root.visible = true;
                    bags[1].root.visible = true;
                    bags[0].env.visible = true;
                    setBagPoseAlongPath(0, 0.18 * k);
                    setBagPoseAlongPath(1, 0.18 * k);
                }
                else if(t < 3.3){
                    updateDoor(1);
                    syncDoorUI();
                    bags[0].root.visible = true;
                    bags[1].root.visible = true;
                    bags[0].env.visible = (t < 1.8);
                    const u = 0.18 + 0.82 * ((t - 1.2) / 2.1);
                    setBagPoseAlongPath(0, u);
                    setBagPoseAlongPath(1, u);
                }
                else if(t < 4.9){
                    setBagPoseAlongPath(0, 1);
                    setBagPoseAlongPath(1, 1);
                    bags[2].root.visible = true;
                    bags[3].root.visible = true;
                    const u = (t - 3.3) / 1.6;
                    setBagPoseAlongPath(2, u);
                    setBagPoseAlongPath(3, u);
                }
                else if(t < 5.9){
                    setBagPoseAlongPath(2, 1);
                    setBagPoseAlongPath(3, 1);
                    const k = 1 - smoothstep((t - 4.9) / 1.0);
                    updateDoor(k);
                    syncDoorUI();
                }
                else {
                    updateDoor(0);
                    syncDoorUI();
                    // porta fechada: os callouts HUD somem inteiros (o pai .hud-callout anima a opacidade) antes da troca de vista
                    const hud = container.querySelector('.cad3d-balloons'); if (hud) hud.classList.add('hud-off');
                    btnStartSim.innerHTML = '<span>▶ Replay Simulation</span>';
                    upd();
                    simReq = null;
                    return;
                }

                upd();
                simReq = requestAnimationFrame(runSimulationFrame);
            }

            function startSimulation(){
                if (container.closest('#tour-stage')) resetIntroSequence();
                warmUp();
                stopAllAnimations();
                if (window.cad3dMorphReset) window.cad3dMorphReset();
                const inTour = !!container.closest('#tour-stage');       // no roteiro (aba 8): a câmera parte exatamente da posição preparada em cad3dTourPrep
                az = inTour ? -2.35 : -2.25; el = 0.28; R = inTour ? 2925 : 3100;
                rs();
                bags.forEach((b, idx) => {
                    b.root.visible = (idx <= 1);
                    if (b.env) b.env.visible = true;
                });
                setBagPoseAlongPath(0, 0);
                setBagPoseAlongPath(1, 0);
                updateDoor(0);
                syncDoorUI();
                // Bin e malas permanecem imóveis e opacos durante a entrada
                // completa de título, legenda, cotas e descrição.
                simStartTime = performance.now() + (inTour ? APHA_INTRO_CFG.sequenceHoldMs : 0);
                btnStartSim.innerHTML = '<span>⏳ Simulating...</span>';
                upd();
                simReq = requestAnimationFrame(runSimulationFrame);
                if (inTour) showIntroAfterStableFrame();
            }
            window.startCAD3DSim = startSimulation;

            // ---- Transição final aba 1 → aba 2 (roteiro) ----
            // O bin Alpha sólido vai ficando translúcido (opacidades iguais às da aba 2) enquanto a câmera sobe para a vista de cima,
            // o FOV converge para o da aba 2 (35° → 15°, "dolly zoom") e o bin desliza para a coluna da esquerda, tudo sincronizado.
            const NV_FOV_M = 15, NV_T_M = new THREE.Vector3(DIST / 2, 360, -447);   // mesmos valores da câmera da aba 2
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
                const RrN = Math.max(1350 / (2 * tanN * (colW / colH)), 1080 / (2 * tanN));    // mesmo enquadramento da aba 2
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

            btnStartSim.onclick = startSimulation;
            btnResetSim.onclick = resetSimulation;

            function animateDoorStep(){
                const diff = doorAnimTarget - openProgress;
                if(Math.abs(diff) < 0.004){
                    updateDoor(doorAnimTarget);
                    syncDoorUI();
                    upd();
                    doorAnimReq = null;
                    return;
                }
                updateDoor(openProgress + Math.sign(diff) * 0.025);
                syncDoorUI();
                upd();
                doorAnimReq = requestAnimationFrame(animateDoorStep);
            }

            btnToggle.onclick=()=>{
                if(simReq){ cancelAnimationFrame(simReq); simReq = null; }
                doorAnimTarget = (openProgress < 0.5) ? 1 : 0;
                if(!doorAnimReq) doorAnimReq = requestAnimationFrame(animateDoorStep);
            };

            slider.addEventListener('input', e=>{
                stopAllAnimations();
                updateDoor(parseFloat(e.target.value) / 100);
                syncDoorUI();
                upd();
            });

            let dr = null;
            cv.addEventListener('pointerdown', e=>{ dr=[e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
            cv.addEventListener('pointermove', e=>{
                if(!dr) return;
                az -= (e.clientX - dr[0]) * 0.006;
                el = Math.max(-1.55, Math.min(1.55, el + (e.clientY - dr[1]) * 0.006));
                dr = [e.clientX, e.clientY];
                upd();
            });
            cv.addEventListener('pointerup', ()=>dr=null);
            cv.addEventListener('wheel', e=>{
                e.preventDefault();
                R = Math.max(600, Math.min(9000, R * (1 + e.deltaY * 0.001)));
                upd();
            }, {passive:false});





@@APHA_INCLUDE:source/html/ABA3/bin-comparison-renderers.js@@            // ---- Exportação 4K (3840 × 2160): vista isométrica, laterais do bin transparentes, malas no mesmo lilás ----
            let exporting = false;
            window.cad3dExportImages = () => {
                if (exporting) return;
                exporting = true;
                stopAllAnimations();
                const EW = 3840, EH = 2160;
                // estado atual (restaurado no final)
                const saved = {
                    az, el, R, T: T.clone(), door: openProgress,
                    bags: bags.map(b => ({ vis: b.root.visible, envVis: b.env ? b.env.visible : null, pos: b.root.position.clone(), quat: b.root.quaternion.clone(), col: b.mBody.color.getHex() })),
                    plCol: mPl.color.getHex(), sideOp: [mat.transparent, mat.opacity, mat.depthWrite],
                    pr: ren.getPixelRatio(), size: ren.getSize(new THREE.Vector2()), aspect: cam.aspect
                };
                // cena de exportação
                bags.forEach((b, i) => { b.root.visible = true; if (b.env) b.env.visible = false; setBagPoseAlongPath(i, 1); b.mBody.color.setHex(saved.bags[0].col); });   // todas as malas no mesmo roxo da 1a mala
                mPl.color.setHex(saved.plCol);
                const surfaceMats = [mat, wm, fm, ...profileBandMaterials];
                const surfaceSaved = surfaceMats.map(m => [m, m.transparent, m.opacity, m.depthWrite]);
                surfaceMats.forEach((m, i) => { m.transparent = true; m.opacity = i === 2 ? 0.39 : (i<2 ? 0.27 : 0.25); m.depthWrite = false; m.needsUpdate = true; });
                solids.forEach(m => { if (m.material === mat) m.renderOrder = 10; });
                az = views.iso[0]; el = views.iso[1]; R = 2400;   // vista isométrica (mesmo ângulo do botão), enquadrada para 16:9
                ren.setPixelRatio(1); ren.setSize(EW, EH, false);
                cam.aspect = EW / EH; cam.updateProjectionMatrix();
                ren.setClearColor(0x000000, 0); // transparência alfa real

                const shots = [['closed', 0], ['80pct_open', 0.8]];
                const grab = (name, prog, view = 'isometric') => {
                    if (view === 'side') { az = views.side[0]; el = views.side[1]; R = 2400; }   // vista lateral (mesmo ângulo do botão Side), enquadrada para 16:9
                    else { az = views.iso[0]; el = views.iso[1]; R = 2400; }
                    updateDoor(prog);
                    upd();   // renderiza em 4K com fundo liso (sem o quadriculado da tela)
                    const url = cv.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = url; a.download = `alpha_bin_3d_${view}_door_${name}_4k.png`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
                        const a = document.createElement('a');
                        a.href = cv.toDataURL('image/png');
                        a.download = 'alpha_bin_side_wall_only_4k.png';
                        document.body.appendChild(a); a.click(); a.remove();
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
                    bags.forEach((b, i) => { const sv = saved.bags[i]; b.root.visible = sv.vis; if (b.env) b.env.visible = sv.envVis; b.root.position.copy(sv.pos); b.root.quaternion.copy(sv.quat); b.mBody.color.setHex(sv.col); });
                    mPl.color.setHex(saved.plCol);
                    surfaceSaved.forEach(([m, tr, op, dw]) => { m.transparent = tr; m.opacity = op; m.depthWrite = dw; m.needsUpdate = true; });
                    solids.forEach(m => { if (m.material === mat) m.renderOrder = 0; });
                    ren.setClearColor(0xffffff, 0);
                    ren.setPixelRatio(saved.pr);
                    az = saved.az; el = saved.el; R = saved.R; T.copy(saved.T);
                    updateDoor(saved.door); syncDoorUI();
                    rs();
                    exporting = false;
                    }, 700);
                }, 700);
            };


            // Duas imagens 4K dedicadas à visualização das malas através da lateral:
            // 1) lateral Y-Z fiel à referência; 2) lateral isométrica pouco inclinada.
            window.cad3dExportSideTransparent = () => {
                if (exporting) return;
                exporting = true;
                stopAllAnimations();
                const EW = 3840, EH = 2160;
                const state = {
                    az, el, R, T: T.clone(), door: openProgress,
                    pixelRatio: ren.getPixelRatio(), size: ren.getSize(new THREE.Vector2()),
                    clear: ren.getClearColor(new THREE.Color()).clone(), clearAlpha: ren.getClearAlpha(),
                    bagData: bags.map(b => ({
                        vis: b.root.visible, env: b.env && b.env.visible,
                        pos: b.root.position.clone(), quat: b.root.quaternion.clone()
                    })),
                    surfaces: [mat, wm, fm, ...profileBandMaterials].map(m => [m, m.transparent, m.opacity, m.depthWrite, m.color.getHex()])
                };
                // Tudo abaixo existe somente durante a SEGUNDA captura (lateral isométrica).
                // A imagem ortográfica e os materiais acrílicos da cena principal permanecem intactos.
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
                    const a = document.createElement('a');
                    a.href = cv.toDataURL('image/png');
                    a.download = 'alpha_bin_' + name + '_acrylic_4k.png';
                    document.body.appendChild(a); a.click(); a.remove();
                };
                const restore = () => {
                    resetIsometricAppearance();
                    state.bagData.forEach((b, i) => {
                        bags[i].root.visible = b.vis;
                        bags[i].root.position.copy(b.pos);
                        bags[i].root.quaternion.copy(b.quat);
                        if (bags[i].env) bags[i].env.visible = b.env;
                    });
                    state.surfaces.forEach(([m, tr, op, dw, color]) => {
                        m.color.setHex(color);
                        m.transparent = tr; m.opacity = op; m.depthWrite = dw; m.needsUpdate = true;
                    });
                    ren.setClearColor(state.clear, state.clearAlpha);
                    ren.setPixelRatio(state.pixelRatio);
                    ren.setSize(state.size.x, state.size.y, false);
                    az = state.az; el = state.el; R = state.R; T.copy(state.T);
                    updateDoor(state.door);
                    syncDoorUI();
                    rs();
                    exporting = false;
                };
                try {
                    bags.forEach((b, i) => {
                        b.root.visible = true;
                        if (b.env) b.env.visible = false;
                        setBagPoseAlongPath(i, 1);
                    });
                    state.surfaces.forEach(([m], i) => {
                        m.transparent = true;
                        m.opacity = i === 2 ? 0.37 : (i < 2 ? 0.23 : 0.25);
                        m.depthWrite = false;
                        m.needsUpdate = true;
                    });
                    ren.setPixelRatio(1); ren.setSize(EW, EH, false);
                    cam.aspect = EW / EH; cam.updateProjectionMatrix();
                    ren.setClearColor(0x000000, 0);
                    exportShot('lateral_with_four_bags', 0, 0.08, 2600); // primeira imagem SEM alterações
                    setTimeout(() => {
                        try {
                            // A câmera vê X_RIGHT: ocultar as malas 1 e 3 somente neste PNG.
                            isoNearBagIndices.forEach(i => { bags[i].root.visible = false; });
                            highlightIsometricInterior();
                            exportShot('side_isometric_with_two_rear_bags', -0.47, 0.17, 2650);
                        } catch (err) {
                            console.warn('Side isometric export:', err);
                        } finally {
                            // Revela novamente a fileira frontal após o PNG (também em erro);
                            // restore() recupera, por fim, a visibilidade original da tela.
                            isoNearBagIndices.forEach(i => { bags[i].root.visible = true; });
                            restore(); // devolve imediatamente materiais, contornos e pose
                        }
                    }, 400);
                } catch (err) {
                    console.warn('Side transparent export:', err);
                    restore();
                }
            };

            setTimeout(rs, 60);
        })();

    