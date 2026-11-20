
    // -------------------------------------------------------------------------
    // ABA 8: SIMULAÇÃO COMPLETA — ao clicar, roda as simulações das abas 1 → 7, uma após a outra,
    //        dentro desta própria aba (cada módulo é "emprestado" para o palco e devolvido ao fim).
    // -------------------------------------------------------------------------
    (function () {
        const $ = id => document.getElementById(id);
        const stage = $('tour-stage'); if (!stage) return;
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const call = (fn, ...a) => { try { return typeof fn === 'function' ? fn(...a) : undefined; } catch (e) { console.warn('tour:', e); } };

        // Cada passo: módulo a emprestar, como iniciar, como saber que terminou, quanto esperar no final
        const STEPS = [
            { key: 'pax', sec: 'module-pax', title: '1. Boarding Bridge – Passengers Walking', hold: 200, timeout: 45000, noFit: true,   // alerta OVERHEAD BINS FULL parado só ~2 s
              overlapMs: APHA_INTRO_CFG.crossfadeMs,             // sobreposição entre avião e bin, sem frame escuro
              morphOut: null,                                    // avião e CAD trocam opacidade simultaneamente
              keepAlive: true,                                   // move o módulo sem recarregar o iframe (moveBefore), quando o navegador permite
              enter: () => { call(window.paxEnter); call(window.paxTourReset); },
              start: () => call(window.paxTourStart),
              done: () => !!call(window.paxTourDone),
              leave: () => call(window.paxPause),
              after: () => call(window.paxEnter) },              // de volta à aba 1: controles visíveis outra vez
            { key: 'cad3d', sec: 'module-cad3d', title: '2. CAD 3D Kinematic Simulation', hold: 450, timeout: 45000, noFit: true,   // hold: espera o fade dos callouts HUD (0,35 s) antes de girar a câmera
              overlapMs: 1100,                                   // dissolve longo entre os dois renderizadores; sem troca seca do contorno do Alpha
              morphOut: my => {                                  // sólido → translúcido · câmera para a vista de cima · bin desliza para a coluna ALPHA
                  const t = measureNovaCol();                    // posição e tamanho reais da coluna ALPHA no quadro (o bin termina exatamente ali)
                  return window.cad3dTourMorph ? window.cad3dTourMorph({ ms: 1300, colW: t.w, colH: t.h, cx: t.cx, cy: t.cy, cancel: () => my !== token }) : null;
              },
              enter: () => call(window.cad3dTourPrep),
              start: () => call(window.startCAD3DSim),
              done: () => /Replay|Repetir/.test($('cad3d-startSim').textContent) },
            { key: 'nova', sec: 'module-nova', title: '3. Bin Top View', hold: 2000, timeout: 8000, startSnapMs: 1700,
              morphIn: my => fxNovaIn(my),                       // bin Alpha fixo no lugar → bin convencional ao lado → cotas junto com os nomes
              after: () => fxNovaClean(),
              overlapMs: 1400,                                   // a comparação some devagar enquanto a planta da aeronave surge
              enter: () => call(window.novaEnter),
              start: () => call(window.novaEnter),
              done: () => true },
            { key: 'topview', sec: 'module-topview', title: '4. Top View – Volumetric Advantage', hold: 300, timeout: 60000,
              morphIn: (my, prev) => fxTopIn(my, 1400),          // planta surge no mesmo ritmo; depois abrem as cotas e a cabine se enche de bins
              overlapMs: 900,                                    // a planta faz fade-out completo (0,9 s) ANTES de o corte transversal começar a surgir (sem sobreposição)
              after: () => { call(window.topTourEnd); },
              enter: () => call(window.topTourReset),
              start: () => call(window.topTourStart),
              done: () => !!call(window.topTourDone) || /Restart/.test($('top-play').textContent) },
            { key: 'unified', sec: 'module-unified', title: '5. Integrated Simulation (2D Section)', hold: 60, timeout: 90000, noFit: true,
              morphIn: my => fxUniIn(my, 960),                   // espera a planta chegar a opacity 0 (900 ms + margem); só então a seção 2D surge e começa a se construir
              overlapMs: 700,                                    // tudo (passageiros, cotas, contorno) some junto, sem foco em um passageiro só
              after: () => { const m = $('module-unified'); if (m) m.querySelectorAll('aside, .uni-titles').forEach(el => { el.style.opacity = ''; el.style.transition = ''; el.style.animation = ''; }); call(window.uniSetFx, null, 0); },
              enter: () => call(window.uniTourReset),
              start: () => call(window.uniTourStart),
              done: () => !!call(window.uniTourBridgeReady),
              leave: () => call(window.uniPause) },
            { key: 'sim', sec: 'module-sim', title: '6. Biomechanical Validation & Boarding Time (Turnaround)', hold: 2500, timeout: 300000,
              enter: () => { window.ergoDone = false; },
              start: () => scheduleAba6Engine({tour:true,reset:true,
                   initialPhase: bridge ? bridge.initialPhase : undefined}),
              done: () => window.ergoDone === true,
              leave: () => pauseAba6Engine() },
            // ato de encerramento (30 s): começa logo depois da biomecânica (fade sem sobreposição: a biomecânica some por inteiro,
            // depois o encerramento surge sobre a mesma malha do quadro). Só termina depois da revelação da logo (30 s).
            { key: 'closing', sec: 'module-closing', title: '7. Closing – Benefits & Compliance (30 s)', hold: 400, timeout: 40000, noFit: true,
              enter: () => call(window.closingReset),
              start: () => { call(window.closingFit); call(window.closingPlaySegment, currentTourSegment); },
              done: () => !!call(window.closingDone),
              leave: () => call(window.closingReset) },
        ];
        // Um arquivo por bloco cinematográfico: preserva morphIn/morphOut ENTRE
        // as abas do grupo, nunca grava a transição entre arquivos diferentes.
        const TOUR_TAKES = [
            {start:0,end:0,mode:'full',name:'01-aviao'},
            {start:1,end:3,mode:'full',name:'02-cad-bins-vista-superior'},
            {start:4,end:5,mode:'full',name:'03-secao-manikin'},
            {start:6,end:6,mode:'closing',name:'04-conclusao-sem-logo'},
            {start:6,end:6,mode:'logo',name:'05-logo'}
        ];
        let currentTourSegment = 'full';

        // ---- transições cinematográficas (Simulação Completa e vídeo) ----
        // Câmera sempre parada: as trocas são feitas com luz e opacidade. A malha do fundo (#tour-stage) nunca se move nem muda de tamanho.
        const fx = {};
        const tween = (ms, my, fn) => new Promise(res => {                               // fn(u) a cada quadro; u de 0 a 1
            const t0 = performance.now();
            const f = now => { if (my !== token) { res(false); return; } const u = Math.min(1, (now - t0) / ms); fn(u); if (u < 1) requestAnimationFrame(f); else res(true); };
            requestAnimationFrame(f);
        });
        const ezo = x => 1 - Math.pow(1 - x, 2);
        // Verificação subpixel da matriz de câmera na junção dos dois atos.
        function verifyBridgeSeam(b){
            const m=b.lastRendered || b.end;
            for(const [x,y] of [[0,0],[b.baseW/2,b.baseH/2],[b.baseW*.63,b.baseH*.22]]){
                const a=[m.k*x+m.tx,m.k*y+m.ty];
                const c=[b.end.k*x+b.end.tx,b.end.k*y+b.end.ty];
                console.assert(Math.hypot(a[0]-c[0],a[1]-c[1])<.01,'Discontinuity at cabin seam');
            }
        }

        // UMA cena m4, UMA matriz de escala+translação e UM canvas contínuo.
        let bridge=null;
        const bridgeEase=v=>{v=Math.max(0,Math.min(1,v));return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;};
        const bridgeMix=(a,b,u)=>({k:a.k+(b.k-a.k)*u,tx:a.tx+(b.tx-a.tx)*u,ty:a.ty+(b.ty-a.ty)*u});
        function destroyBridge(fadeMs=0){
            // Limpa a flag inclusive quando a ponte já não existe.
            window.__aphaTourBridgeActive = false;
            if(!bridge)return;
            const b=bridge;bridge=null;
            cancelAnimationFrame(b.raf);
            if(fadeMs){
                b.canvas.style.transition='opacity '+(fadeMs/1000)+'s ease-in-out';
                b.canvas.style.opacity='0';
                setTimeout(()=>b.canvas.remove(),fadeMs+40);
            }else b.canvas.remove();
        }
        function paintBridge(now){
            const b=bridge;if(!b)return;
            const C=APHA_BRIDGE_CFG,W=stage.clientWidth,H=stage.clientHeight;
            if(W<1||H<1)return;
            const dpr=Math.min(2,window.devicePixelRatio||1);
            const width=Math.round(W*dpr),height=Math.round(H*dpr);
            if(b.canvas.width!==width||b.canvas.height!==height){b.canvas.width=width;b.canvas.height=height;}
            const g=b.canvas.getContext('2d'),elapsed=now-b.started;
            // A abertura pertence inteiramente à Aba 5; a ponte não a reinicia.
            const doorU=b.mode==='stow'
                ? 1-bridgeEase(((manikinState.phase||0)-.96)/.04)
                : 1;
            let m=b.end;
            if(b.mode!=='stow')m=bridgeMix(b.start,b.end,bridgeEase(elapsed/C.zoomOutMs));
            // Uma única transformação para shell, assentos, piso, bins e manikin.
            b.lastRendered={...m};
            // reset() remove também transforms/saves deixados por um frame
            // com exceção no desenho vetorial, evitando acumulação de estados.
            if (typeof g.reset === 'function') g.reset();
            else {
                g.setTransform(1,0,0,1,0,0);
                g.clearRect(0,0,b.canvas.width,b.canvas.height);
            }
            g.setTransform(dpr,0,0,dpr,0,0);
            // O #tour-stage mantém a malha e a cor por trás do canvas móvel.
            drawUnifiedCabinBackground(g, W, H, { tour: true });
            // O CAD da Aba 5 e o renderizador do manikin não têm os mesmos
            // paths. Usar o frame real final do CAD, movendo-o pela MESMA
            // matriz, evita o corte visual ao trocar de renderizador.
            const handoff = b.mode==='transition'
                ? bridgeEase(elapsed/C.handoffMs) : 1;
            if(b.snapshot && handoff<1){
                const relativeZoom=m.k/b.start.k;
                g.save();
                g.globalAlpha=1-handoff;
                g.transform(relativeZoom,0,0,relativeZoom,
                    m.tx-relativeZoom*b.start.tx,
                    m.ty-relativeZoom*b.start.ty);
                g.drawImage(b.snapshot,b.srcX,b.srcY,b.srcW,b.srcH);
                g.restore();
            }else if(b.snapshot && handoff>=1){
                b.snapshot=null; // liberar memória da captura após a emenda
            }
            const L=manikinState.last,mass=L?L.mass:10,ang=L?L.angleDeg:17;
            const Fg=L?L.Fg:mass*9.81,Fn=L?L.Fn:Fg*Math.cos(ang*Math.PI/180),Ft=L?L.Ft:Fg*Math.sin(ang*Math.PI/180);
            const t=L?L.times[0]:ergoTimes(ERGO_PERCENTILES[0].h,mass,ang);
            // Fixar o frame inicial: a inicialização da física não salta a mala.
            const phase=b.mode==='stow'
                ? Math.max(manikinState.phase||0,b.initialPhase)
                : b.initialPhase;
            const old=[window.__aphaOnlyCabin,window.__aphaShowConventional,window.__aphaBridgeDoorU,window.__aphaBridgeMinimalHUD,window.__aphaBridgeManikinAlpha,window.__aphaBridgeSeatsAlpha,window.__aphaAlphaBodyOpacity];
            try{
                // Renderiza o cenário inteiro em todos os quadros. O manequim surge
                // no final do recuo, sem trocar de canvas nem deslocar a fuselagem.
                window.__aphaOnlyCabin=false;
                const outU=bridgeEase(elapsed/C.zoomOutMs);
                window.__aphaAlphaBodyOpacity=b.mode==='stow'?0.45:0.75+(0.45-0.75)*outU;
                window.__aphaBridgeSeatsAlpha=b.mode==='stow'?1:outU;
                window.__aphaBridgeManikinAlpha=b.mode==='stow'?1:
                    bridgeEase((outU-.70)/.30);
                window.__aphaShowConventional=true;
                window.__aphaBridgeDoorU=doorU;
                window.__aphaBridgeMinimalHUD=true;
                g.save();
                try {
                    g.globalAlpha *= handoff;
                    g.transform(m.k,0,0,m.k,m.tx,m.ty);
                    drawManikinPanel(g,b.baseW,b.baseH,ERGO_PERCENTILES[0].h,mass,ang,Fg,Fn,Ft,phase,t.tA2,t.tA1,'');
                } finally { g.restore(); }
            }catch(err){
                if(!b.error){b.error=true;console.error('Continuous cabin camera:',err);}
                // Não deixar somente a fuselagem parada quando o renderizador
                // detalhado falha: o fallback continua no MESMO canvas e câmera.
                try {
                    if (typeof g.reset === 'function') g.reset();
                    else b.canvas.width = b.canvas.width;
                    g.setTransform(dpr,0,0,dpr,0,0);
                    drawUnifiedCabinBackground(g,W,H,{tour:true});
                    g.save();
                    try {
                        g.transform(m.k,0,0,m.k,m.tx,m.ty);
                        drawManikinFallback(g,b.baseW,b.baseH,phase,t.tA2,t.tA1,true);
                    } finally { g.restore(); }
                } catch(fallbackErr) {
                    if(!b.fallbackError){b.fallbackError=true;console.error('Continuous cabin fallback:',fallbackErr);}
                }
            }finally{
                [window.__aphaOnlyCabin,window.__aphaShowConventional,window.__aphaBridgeDoorU,window.__aphaBridgeMinimalHUD,window.__aphaBridgeManikinAlpha,window.__aphaBridgeSeatsAlpha,window.__aphaAlphaBodyOpacity]=old;
            }
            // A geometria não sofre fade: apenas rótulos e cronômetro.
            g.save();g.setTransform(dpr,0,0,dpr,0,0);
            g.globalAlpha=b.mode==='stow'?bridgeEase((now-b.stowStart)/C.uiFadeMs):1-bridgeEase(elapsed/C.uiFadeMs);
            if(b.mode!=='stow'){
                g.fillStyle='#d4dce6';g.font='700 16px Montserrat, Inter, sans-serif';
                g.textAlign='center';g.fillText('CONVENTIONAL  /  ALPHA',W*.48,Math.max(25,H*.085));
            }
            g.restore();
        }
        async function fxCabinToStow(my){
            destroyBridge();
            const src=$('uniCanvas'),C=APHA_BRIDGE_CFG,cabin=window.cabinSectionReference;
            const parent=src&&src.parentElement;if(!parent||!cabin)return false;
            const sr=stage.getBoundingClientRect(),r=parent.getBoundingClientRect();
            const visible=src.getBoundingClientRect();
            const baseW=r.width,baseH=r.height,W=stage.clientWidth,H=stage.clientHeight;
            if(baseW<1||baseH<1||W<1||H<1||sr.width<1||sr.height<1)return false;
            // Converter pixels do boundingClientRect em coordenadas lógicas do palco.
            // Crucial quando a simulação está redimensionada ou sendo gravada.
            const stageX=W/sr.width,stageY=H/sr.height;
            const srcX=(visible.left-sr.left)*stageX;
            const srcY=(visible.top-sr.top)*stageY;
            const srcW=visible.width*stageX,srcH=visible.height*stageY;
            const fitX=srcW/baseW,fitY=srcH/baseH;
            const sourceFit=(fitX+fitY)*.5;
            // O destino respeita o mesmo m4, com margem da área de simulação.
            const margin=stage.classList.contains('rec')?.022:0;
            const ix=W*margin,iy=H*margin,destW=W-2*ix,destH=H-2*iy;
            const from=cabin.map(baseW,baseH),to=cabin.map(destW,destH);
            const fy=from.toY(C.binFocusYcm);
            const lastCamera=typeof window.uniCameraState==='function'
                ? window.uniCameraState(baseW,baseH) : {k:C.startZoom,x:baseW/2,y:fy};
            const k1=to.scale/from.scale;
            // Começa na matriz exata usada pelo canvas da Aba 5.
            const start={k:sourceFit*lastCamera.k,
                tx:srcX+sourceFit*(baseW/2-lastCamera.k*lastCamera.x),
                ty:srcY+sourceFit*(baseH/2-lastCamera.k*lastCamera.y)};
            // Termina no referencial m4 do manikin; sem alterar geometria física.
            const end={k:k1,tx:ix+to.toX(0)-k1*from.toX(0),
                             ty:iy+to.toY(0)-k1*from.toY(0)};
            let snapshot=null;
            try{
                if(src.width>0 && src.height>0){
                    snapshot=document.createElement('canvas');
                    snapshot.width=src.width;snapshot.height=src.height;
                    snapshot.getContext('2d').drawImage(src,0,0);
                }
            }catch(err){
                console.warn('Aba 5 source frame capture unavailable:',err);
                snapshot=null;
            }
            const canvas=document.createElement('canvas');
            canvas.id='apha-continuous-cabin';
            canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:12;pointer-events:none;opacity:1';
            bridge={canvas,baseW,baseH,srcX,srcY,srcW,srcH,snapshot,
                start,end,initialPhase:aphaInitialManikinPhase(),
                started:performance.now(),mode:'transition',stowStart:0,raf:0,error:false};
            window.__aphaTourBridgeActive = true;
            paintBridge(bridge.started);
            stage.appendChild(canvas);
            // Não deixar as guias e tampas do módulo anterior vazarem pelo
            // fundo transparente da ponte. O grid permanece no #tour-stage.
            if (active && active.sec) {
                active.sec.style.opacity='0';
                active.sec.style.pointerEvents='none';
            }
            function tick(now){
                if(!bridge||bridge.canvas!==canvas)return;
                paintBridge(now);bridge.raf=requestAnimationFrame(tick);
            }
            bridge.raf=requestAnimationFrame(tick);
            const ok=await tween(C.zoomOutMs,my,()=>{});
            if(!ok){destroyBridge();return false;}
            // Mantém o mesmo canvas e a mesma projeção m4 no frame de junção.
            // Renderiza explicitamente o frame terminal da câmera antes de
            // mudar somente a camada de personagem (sem mudar a matriz).
            paintBridge(bridge.started+C.zoomOutMs);
            verifyBridgeSeam(bridge);
            bridge.mode='stow';bridge.stowStart=performance.now();
            paintBridge(bridge.stowStart);
            return true;
        }

        function fxClear() {}
        // Enquadra cada módulo no palco 16:9 sem cortar conteúdo horizontal ou vertical.
        // O tempo de cada etapa e a geometria interna permanecem inalterados.
        function fitRec(sec, step) {
            if (!stage.classList.contains('rec') || step.key === 'sim' || step.noFit) return;
            const cs = getComputedStyle(stage);
            const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            sec.style.transform = '';
            const sw = Math.max(sec.scrollWidth, sec.offsetWidth), sh = Math.max(sec.scrollHeight, sec.offsetHeight);
            if (availW > 200 && availH > 200 && sw > 0 && sh > 0) {
                const k = Math.min(1, availW / sw, availH / sh);
                if (k < .999) {
                    sec.style.transformOrigin = 'top center';
                    sec.style.transform = `scale(${k.toFixed(5)})`;
                }
            }
        }
        // Medir o viewport Alpha no mesmo layout final da aba seguinte.
        // Converter pixels visuais de getBoundingClientRect em pixels CSS locais
        // evita diferenças de enquadramento sob escala/zoom na prévia ou na gravação.
        function measureNovaCol() {
            const sec = $('module-nova'), ph = document.createComment('m'), cs = getComputedStyle(stage);
            call(window.novaShowHeader, false, true);            // zera eventual título de take anterior, sem piscar
            sec.parentNode.insertBefore(ph, sec); stage.appendChild(sec); sec.classList.remove('hidden');
            Object.assign(sec.style, { position: 'absolute', top: cs.paddingTop, left: cs.paddingLeft, right: cs.paddingRight, visibility: 'hidden' });
            fitRec(sec, { key: 'nova' });
            // Inicializa o WebGL e prepara o primeiro frame ainda com a aba invisível.
            call(window.novaEnter);
            const r = $('nova-container').getBoundingClientRect(), c = $('cad3d-container').getBoundingClientRect();
            const vw=$('cad3d-container').clientWidth, vh=$('cad3d-container').clientHeight;
            const sx=c.width/Math.max(1,vw), sy=c.height/Math.max(1,vh);
            const target={
                w:r.width/sx, h:r.height/sy,
                cx:(r.left+r.width/2-c.left)/sx,
                cy:(r.top+r.height/2-c.top)/sy
            };
            clearSec(sec); sec.style.visibility = ''; sec.classList.add('hidden'); ph.parentNode.insertBefore(sec, ph); ph.remove();
            return target;
        }
        // 3: o bin Alpha aparece sozinho, no ponto exato em que a transição do CAD 3D terminou; depois o convencional ao lado; por fim cotas + nomes
        async function fxNovaIn(my) {
            const sec = active.sec, grid = sec.querySelector('.sim-card .grid'); if (!grid) return false;
            const [c0, c1] = grid.children, lab0 = c0.lastElementChild, lab1 = c1.lastElementChild;
            const dim = $('novaDimCanvas'), cvc = $('convDimCanvas');
            call(window.novaShowHeader,false,true);
            fitRec(sec, active.step);
            call(window.novaEnter);
            // As duas cotas permanecem nos canvases originais: não criar cópias
            // temporárias que possam deixar o Conventional sem sua cota.
            window.__convNoDim = false; call(window.__convDraw);
            if (dim) { dim.style.transition='none'; dim.style.opacity='0'; }
            if (cvc) { cvc.style.transition='none'; cvc.style.opacity='0'; }
            const hide = (els, v) => els.forEach(el => { el.style.transition = 'none'; el.style.opacity = v; });
            hide([dim, lab0, lab1, c1], '0'); hide([c0], '0'); sec.style.opacity = '1'; void sec.offsetHeight;
            const show = (els, ms) => els.forEach(el => { el.style.transition = `opacity ${ms / 1000}s ease-in-out`; el.style.opacity = '1'; });
            show([c0], 1100);                                    // o Alpha entra exatamente sobre o último frame 3D, sem pulo visual
            if (!(await tween(1100 + 200, my, () => {}))) return true;
            show([c1], 650);                                     // bin convencional ao lado
            if (!(await tween(650 + 200, my, () => {}))) return true;
            show([dim, cvc, lab0, lab1], 550);                    // cotas 44" / 56" junto com os nomes ALPHA / CONVENTIONAL
            await tween(550, my, () => {});
            call(window.novaShowHeader,true);
            return true;
        }
        function fxNovaClean() {
            const sec = $('module-nova'), grid = sec && sec.querySelector('.sim-card .grid');
            if (grid) [...grid.children].forEach(c => { [c, c.lastElementChild].forEach(el => { el.style.opacity = ''; el.style.transition = ''; }); });
            for (const id of ['novaDimCanvas','convDimCanvas']) {
                const canvas=$(id); if(canvas){canvas.style.opacity='';canvas.style.transition='';}
            }
            document.querySelectorAll('.fx-convdim').forEach(e => e.remove());
            window.__convNoDim = false; call(window.__convDraw);
        }
        // 3 → 4: a planta surge enquanto a comparação some (mesma duração); depois abrem as cotas (com os nomes) e a cabine se enche de bins
        async function fxTopIn(my, ms) {
            const sec = active.sec;
            call(window.topTourSet, 1.0, { dims: 0, bins: 0, names: 0 });   // aeronave desenhada, sem cotas e sem bins
            fitRec(sec, active.step);
            sec.style.transition = 'none'; sec.style.opacity = '0'; void sec.offsetHeight;
            sec.style.transition = `opacity ${ms / 1000}s ease-in-out`; sec.style.opacity = '1';
            if (!(await tween(ms, my, () => {}))) return true;
            sec.style.transition = '';
            const ov = { dims: 0, bins: 0, names: 0 };
            if (!(await tween(750, my, u => { ov.dims = ov.names = ezo(u); call(window.topSetOv, ov); }))) return true;   // cotas + nomes
            if (!(await tween(1300, my, u => { ov.bins = u; call(window.topSetOv, ov); }))) return true;                // fileira de bins, do nariz para a cauda
            call(window.topSetOv, null);
            call(window.topTourStartAt, 2.3);                   // mesmo estado (todos os bins e cotas): segue para o corte S e o detalhe
            return true;
        }
        // 4 → 5: a vista superior da cabine termina de esmaecer (+1 s de espera); depois a seção 2D surge e começa a se construir
        async function fxUniIn(my, waitMs) {
            const sec = active.sec;
            sec.style.transition = 'none'; sec.style.opacity = '0'; void sec.offsetHeight;
            if (!(await tween(waitMs, my, () => {}))) return true;
            sec.style.transition = 'opacity .6s ease-in-out'; sec.style.opacity = '1';
            call(window.uniTourStart);
            return true;
        }

        // ---- interface ----
        const btn = $('tour-btn');

        // ---- empréstimo de módulos ----
        let token = 0, active = null, live = false;        // active = { step, sec, ph }
        // A sessao de captura tem um unico dono e impede execucoes simultaneas.
        let rec = null, snap = null, captureStarting = false;
        const clearCols = sec => { const g = sec.querySelector('.sim-card .grid'); if (g && sec.id === 'module-nova') [...g.children].forEach(c => { c.style.opacity = ''; c.style.transform = ''; c.style.transition = ''; }); };
        const clearSec = sec => ['opacity', 'filter', 'transform', 'transition', 'position', 'top', 'left', 'right', 'width', 'zIndex', 'pointerEvents', 'clipPath'].forEach(k => { sec.style[k] = ''; });
        let outgoing = null;                               // módulo que está saindo (some por completo ANTES de o próximo aparecer)
        let entryGap = 0;                                  // ms que o próximo módulo espera, invisível, até o anterior sumir (sem sobreposição)
        const OUT_MS = 300;                                // saída (sem sobreposição) do módulo atual nas demais trocas
        const place = (parent, node, ref, keep) => {          // keep: preserva o estado (iframe não recarrega) quando há moveBefore
            if (keep && parent.moveBefore) { try { parent.moveBefore(node, ref); return; } catch (e) {} }
            parent.insertBefore(node, ref);
        };
        function borrow(step) {
            const sec = $(step.sec), ph = document.createComment('tour-ph');
            sec.parentNode.insertBefore(ph, sec);
            place(stage, sec, null, step.keepAlive); sec.classList.remove('hidden');
            active = { step, sec, ph };
        }
        function release(e) {
            const { sec, ph } = e;
            clearSec(sec); clearCols(sec);
            if (e.step.key === 'cad3d') call(window.cad3dMorphReset);   // devolve materiais/câmera ao estado normal da aba 1
            sec.classList.add('hidden');
            if (ph.parentNode) { place(ph.parentNode, sec, ph, e.step.keepAlive); ph.remove(); }
            call(e.step.after);
        }
        function giveBack() {
            fxClear();
            if (outgoing) { const o = outgoing; outgoing = null; release(o); }
            if (!active) return;
            const e = active; active = null;
            call(e.step.leave);
            release(e);
        }
        // passa o módulo atual para "saindo": sai do fluxo (sobrepõe o quadro) e se dissolve enquanto o próximo entra
        function startCrossfade(ms) {                          // ms > 0: sobreposição curta e intencional · sem ms: sem sobreposição
            const outMs = ms || OUT_MS;
            if (!active) return stage.offsetHeight;
            const h0 = stage.offsetHeight, e = active; active = null;
            call(e.step.leave);
            const cs = getComputedStyle(stage), sec = e.sec;
            sec.style.position = 'absolute'; sec.style.top = cs.paddingTop; sec.style.left = cs.paddingLeft;
            sec.style.right = cs.paddingRight; sec.style.zIndex = '1'; sec.style.pointerEvents = 'none';
            void sec.offsetHeight;
            sec.style.transition = 'opacity ' + (outMs / 1000) + 's ' + (ms ? 'ease-in-out' : 'ease-in');
            sec.style.opacity = '0';
            outgoing = e;
            entryGap = ms ? 0 : OUT_MS + 40;                   // sem ms: o próximo só aparece depois que este estiver 100% transparente
            setTimeout(() => { if (outgoing === e) { outgoing = null; release(e); } }, outMs + 30);
            return h0;
        }

        // ---- fundo único: o quadro (malha + cantos) fica fixo; só a simulação dentro dele se dissolve e é trocada ----
        // ---- quadro com tamanho fixo em todas as etapas: o maior usado entre as simulações (área interna 16:9, a da passarela e da
        //      Simulação Integrada), na largura toda. Usa o mesmo enquadramento da gravação (.rec), então a tela fica igual ao vídeo. ----
        let liveFit = false;
        const frameScale = $('tour-frame-scale'), frameScaleValue = $('tour-frame-scale-value');
        const displayFrameScale = () => frameScale ? Number(frameScale.value) / 100 : 0.85;
        // Encaixe contain: margens internas da janela + tamanho configurável.
        // Trabalha em pixels CSS; o compositor continua entregando 1920x1080.
        function frameWidth(forRecording = false) {
            const pageW = Math.max(1, window.innerWidth);
            const pageH = Math.max(1, window.innerHeight);
            const maxW = Math.min(
                pageW * 0.94,
                pageH * 0.92 * 16 / 9,
                forRecording ? 1920 : Math.max(1, stage.parentElement.clientWidth),
                1920
            );
            return Math.max(16, Math.floor(maxW * displayFrameScale() / 16) * 16);
        }
        function sizeFit() {
            if (!liveFit) return;
            const w = frameWidth();
            stage.style.setProperty('--rec-w', w + 'px');
            stage.style.setProperty('--rec-h', (w * 9 / 16) + 'px');
        }
        if (frameScale) frameScale.addEventListener('input', () => {
            if (frameScaleValue) frameScaleValue.textContent = frameScale.value + '%';
            sizeFit();
        });
        function fitFrame(on) {
            if (on) {
                if (stage.classList.contains('rec')) return;      // gravação/PNGs: o tamanho já foi fixado por eles
                liveFit = true; stage.classList.add('rec'); sizeFit();
            } else if (liveFit) {
                liveFit = false; stage.classList.remove('rec');
                stage.style.removeProperty('--rec-w'); stage.style.removeProperty('--rec-h');
            }
        }
        window.addEventListener('resize', sizeFit);
        function frameOn(on) { fitFrame(on); stage.classList.toggle('on', on); if (!on) { stage.style.height = ''; stage.style.transition = ''; } }
        async function fadeOut() {
            if (!active) return stage.offsetHeight;
            const h0 = stage.offsetHeight, sec = active.sec;
            sec.style.transition = 'opacity 1s ease-in-out';   // encerramento suave da última cena (sem corte seco)
            sec.style.opacity = '0';
            await sleep(1020);
            return h0;
        }
        function fadeIn(h0, gap) {                              // h0 = altura do quadro no passo anterior (0 no primeiro) · gap = espera até o módulo anterior sumir
            const sec = active.sec; gap = gap || 0;
            const thisRun = token;
            const split = active.step.key === 'nova';            // tela dividida: cada metade entra na própria coluna (nada cruza o centro)
            const cols = split ? [...(sec.querySelector('.sim-card .grid') || { children: [] }).children] : [];
            if (split && cols.length === 2) {
                sec.style.opacity = '1';
                cols[0].style.opacity = '0';                                          // ALPHA: fade-in sobre o bin que acabou de deslizar até aqui
                cols[1].style.opacity = '0'; cols[1].style.transform = 'translateX(7%)';   // CONVENTIONAL: já no lado direito, entra com leve deslize
            } else sec.style.opacity = '0';
            fitRec(sec, active.step);
            let h1 = null;
            if (h0 && !stage.classList.contains('rec')) { stage.style.height = 'auto'; h1 = stage.offsetHeight; stage.style.height = h0 + 'px'; }
            void stage.offsetHeight;
            const reveal = () => {
                if (thisRun !== token || !active || active.sec !== sec) return;
                if (h1 !== null) stage.style.transition = 'height .55s cubic-bezier(.4,0,.2,1)';
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (thisRun !== token || !active || active.sec !== sec) return;
                    if (h1 !== null) stage.style.height = h1 + 'px';
                    if (split && cols.length === 2) {
                        cols[0].style.transition = 'opacity .5s ease-in-out';
                        cols[0].style.opacity = '1';
                        cols[1].style.transition = 'opacity .85s ease-out .25s, transform .95s cubic-bezier(.2,.7,.2,1) .2s';
                        cols[1].style.opacity = '1'; cols[1].style.transform = 'none';
                    } else { sec.style.transition = 'opacity .55s ease'; sec.style.opacity = '1'; }
                }));
            };
            if (gap) setTimeout(reveal, gap); else reveal();
            setTimeout(() => {
                if (thisRun === token && active && active.sec === sec) {
                    stage.style.height = ''; stage.style.transition = '';
                    sec.style.transition = ''; clearCols(sec);
                }
            }, gap + (split ? 1500 : 600));
        }

        async function waitFor(step, my) {
            const t0 = performance.now();
            await sleep(500);                                     // dá tempo de o módulo sair do estado "concluído"
            while (my === token && performance.now() - t0 < step.timeout) {
                let ok = false; try { ok = step.done(); } catch (e) { ok = false; }
                if (ok) return true;
                await sleep(250);
            }
            return false;
        }

        async function run(from, through = STEPS.length - 1, segmentMode = 'full', fromCapture = false) {
            if (live || captureStarting || ((rec || snap) && !fromCapture)) return;
            const my = ++token; live = true;
            destroyBridge();
            giveBack();
            currentTourSegment = segmentMode;
            btn.textContent = '■ Stop'; btn.dataset.mode = 'stop';
            stage.style.transition = 'none'; stage.style.opacity = '1';
            frameOn(true);
            let h0 = 0;                                        // altura do quadro no passo anterior (0 = primeiro passo)
            for (let i = from; i <= Math.min(through, STEPS.length - 1); i++) {
                if (my !== token) return;
                const st = STEPS[i];
                currentTab = st.key;                               // alguns módulos só animam quando "sua" aba está ativa
                call(st.pre);
                borrow(st);
                call(st.enter);                                // prepara o módulo já visível no palco ANTES de iniciar
                const gap = entryGap; entryGap = 0;
                let started = false;
                if (st.morphIn && i > from) {                  // entrada cinematográfica (a própria transição revela o módulo e pode iniciar a animação)
                    started = !!(await st.morphIn(my, STEPS[i - 1]));
                    if (my !== token) return;
                } else if (st.key === 'sim' && bridge) {
                    // Aba 6 executa física/cinemática oculta; imagem segue no mesmo canvas.
                    active.sec.style.opacity = '0';
                    active.sec.style.pointerEvents = 'none';
                } else {
                    fadeIn(h0, gap);
                    await sleep(50 + gap);
                    if (my !== token) return;
                }
                h0 = 0;
                if (!started) call(st.start);                  // inicia a animação imediatamente junto com o fade-in (sem travar no 1º frame)
                call(st.afterIn);
                if (window.__tourEdge) { const si = i; setTimeout(() => { if (my === token) window.__tourEdge(si, st, 'inicio'); }, st.startSnapMs || 750); }   // foto do COMEÇO (após o fade-in)
                const completed = await waitFor(st, my);
                if (my !== token) return;
                if (!completed) {
                    console.error('PAX tour: stage ' + st.key + ' timed out after ' + st.timeout + 'ms');
                    abort();
                    btn.textContent = '⚠ Playback interrupted — retry';
                    btn.title = 'Stage ' + st.key + ' did not finish within the configured time.';
                    return;
                }
                await sleep(st.hold);
                if (my !== token) return;
                if (window.__tourEdge) window.__tourEdge(i, st, 'fim');   // foto do FINAL (antes de dissolver para a próxima aba)
                if (i < through) {
                    if (st.key === 'unified') {
                        const ok = await fxCabinToStow(my);
                        if (my !== token) return;
                        if (!ok) h0 = startCrossfade(0);
                        else {
                            h0 = stage.offsetHeight;
                            const prev = active; active = null;
                            call(prev.step.leave); release(prev);
                        }
                    } else {
                        if (st.morphOut) { await st.morphOut(my, STEPS[i + 1]); if (my !== token) return; }
                        h0 = startCrossfade(st.overlapMs || 0);
                        if (st.key === 'sim') destroyBridge(450);
                    }
                }
                else { await fadeOut(); if (my !== token) return; giveBack(); currentTab = 'tour'; }
            }
            if (my !== token) return;
            if (window.__tourEnded) await window.__tourEnded();
            if (my !== token) return;
            frameOn(false);
            btn.textContent = '↻ Run full simulation again'; btn.dataset.mode = 'run'; live = false;
            // Do not loop or restart the full presentation without the user's click.
        }
        function abort() {
            if (!live && !active && !outgoing && !rec && !snap) return;
            live = false; token++; destroyBridge(); giveBack(); entryGap = 0; currentTab = 'tour'; frameOn(false);
            if (window.__tourEnded) void window.__tourEnded();
            btn.textContent = '▶ Run full simulation'; btn.dataset.mode = 'run';
            stage.style.transition = 'none'; stage.style.opacity = '1';
        }

        const startTour = (...args) => run(...args).catch(error => {
            console.error('PAX tour error:', error);
            abort();
            btn.textContent = '⚠ Playback interrupted — retry';
            btn.title = String(error && error.message || error);
        });
        btn.addEventListener('click', () => { if (btn.dataset.mode === 'stop') abort(); else void startTour(0); });
        document.querySelectorAll('#tour-takes [data-take-play]').forEach(b => b.addEventListener('click', () => {
            if (rec) return;
            const take=TOUR_TAKES[Number(b.dataset.takePlay)];
            if(take) void startTour(take.start,take.end,take.mode);
        }));

        // ---- exportar vídeo: grava o quadro com suporte universal (file://, Guia, Janela ou Tela Cheia) em 1920x1080 ----
        const recBtn = $('tour-rec');
        function stopRec() {
            if (!rec) return;
            const r = rec;
            if (r.timer) { clearInterval(r.timer); r.timer = null; }
            if (r.mr && r.mr.state !== 'inactive') {
                try { r.mr.requestData(); } catch (e) {}
                try { r.mr.stop(); } catch (e) {}
            }
        }
        async function suppressRecordedCursor(track) {
            // Pede ao navegador para excluir o ponteiro quando a superfície oferecer suporte.
            // Fallback: a classe rec-clean oculta o cursor no conteúdo HTML da guia.
            try {
                const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
                if (caps && Array.isArray(caps.cursor) && caps.cursor.includes('never') &&
                    typeof track.applyConstraints === 'function') {
                    await track.applyConstraints({cursor:'never'});
                }
            } catch (e) {
                console.info('Cursor suppression delegated to CSS/browser:', e);
            }
        }
        async function startRec(takeIndex = null) {
            if (rec) { stopRec(); abort(); return; }
            if (snap || live || captureStarting) return;
            const selectedTake = Number.isInteger(takeIndex) && takeIndex >= 0 && takeIndex < TOUR_TAKES.length ? TOUR_TAKES[takeIndex] : null;
            if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) || !window.MediaRecorder) {
                alert('Video export requires the Google Chrome or Microsoft Edge browser (open the HTML file directly in the browser).');
                return;
            }
            captureStarting = true;
            let stream;
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: { ideal: 30, max: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: 16 / 9 }, cursor: 'never' },
                    audio: false,
                    preferCurrentTab: true,
                    selfBrowserSurface: 'include',
                    surfaceSwitching: 'include'
                });
            } catch (e) {
                captureStarting = false;
                if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
                    alert('Could not start screen capture (' + (e.message || e.name) + '). Open the HTML file directly in a Chrome or Edge tab.');
                }
                return;
            }
            const track = stream.getVideoTracks()[0];
            if (!track) { stream.getTracks().forEach(t => t.stop()); captureStarting = false; return; }
            await suppressRecordedCursor(track);

            // Ativa modo gravação limpo (sem cabeçalho fixo e com altura par garantida)
            document.body.classList.add('rec-clean');
            // Gravação: o quadro 16:9 fica menor do que a janela, com margem de segurança,
            // respeitando o ajuste selecionado pelo usuário antes de iniciar o MP4.
            const recW = frameWidth(true);
            const recH = recW * 9 / 16;
            fitFrame(false);                                            // sai do quadro fixo da tela; a gravação define o próprio tamanho
            stage.style.setProperty('--rec-w', recW + 'px');
            stage.style.setProperty('--rec-h', recH + 'px');
            document.body.style.setProperty('--rec-w', recW + 'px');
            stage.classList.add('rec');
            // Exibir e dimensionar o palco ANTES do CropTarget e do MediaRecorder.
            // A primeira cena começa SOMENTE depois do recorder.start(), evitando
            // que o vídeo da logo, que é curto, perca os primeiros keyframes.
            frameOn(true);
            await sleep(250);

            // Tenta recortar apenas o #tour-stage via Region Capture (funciona ao compartilhar Guia);
            // se estiver em file:// ou capturando Janela/Tela Inteira, continua sem abortar!
            let croppedByBrowser = false;
            if (window.CropTarget && typeof track.cropTo === 'function') {
                try {
                    const ct = await CropTarget.fromElement(stage);
                    await track.cropTo(ct);
                    croppedByBrowser = true;
                } catch (e) {
                    console.warn('Region Capture (cropTo) unavailable in this capture mode; using 1080p Canvas compositor:', e);
                }
            }

            // Pipeline de composição 1920x1080 (dimensões pares fixas evitam falha no encoder H.264/MP4)
            const recVideo = document.createElement('video');
            recVideo.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
            recVideo.muted = true;
            recVideo.playsInline = true;
            recVideo.srcObject = stream;
            document.body.appendChild(recVideo);
            try { await recVideo.play(); } catch (e) {}
            for (let w = 0; w < 20 && !recVideo.videoWidth; w++) await sleep(50);

            const surf = (track.getSettings && track.getSettings().displaySurface) || '';
            const REC_FPS = 30;

            // área de origem a gravar (o quadro do roteiro)
            function cropRect() {
                const vw = recVideo.videoWidth, vh = recVideo.videoHeight;
                let sx = 0, sy = 0, sw = vw, sh = vh;
                // Se capturou a guia sem CropTarget, recorta exatamente nas coordenadas do #tour-stage
                if (!croppedByBrowser && surf === 'browser' && window.innerWidth > 0 && window.innerHeight > 0) {
                    const r = stage.getBoundingClientRect();
                    if (r.width > 50 && r.height > 50) {
                        const scaleX = vw / window.innerWidth, scaleY = vh / window.innerHeight;
                        sx = Math.max(0, Math.round(r.left * scaleX));
                        sy = Math.max(0, Math.round(r.top * scaleY));
                        sw = Math.min(vw - sx, Math.round(r.width * scaleX));
                        sh = Math.min(vh - sy, Math.round(r.height * scaleY));
                    }
                }
                return { sx, sy, sw, sh };
            }

            // Resolução de saída fixa em Full HD (estável).
            const OW = 1920, OH = 1080;   // dimensões pares fixas (evita falha no encoder H.264/MP4)
            const recCanvas = document.createElement('canvas');
            recCanvas.width = OW;
            recCanvas.height = OH;
            const recCtx = recCanvas.getContext('2d', { alpha: false });
            recCtx.imageSmoothingEnabled = true; recCtx.imageSmoothingQuality = 'high';

            function drawRecFrame() {
                const vw = recVideo.videoWidth, vh = recVideo.videoHeight;
                if (!vw || !vh) return;
                recCtx.fillStyle = APHA_CABIN_PALETTE.background;
                recCtx.fillRect(0, 0, OW, OH);
                const { sx, sy, sw, sh } = cropRect();
                const scale = Math.min(OW / sw, OH / sh);
                const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
                const dx = Math.round((OW - dw) / 2), dy = Math.round((OH - dh) / 2);
                recCtx.drawImage(recVideo, sx, sy, sw, sh, dx, dy, dw, dh);
            }
            drawRecFrame();
            const timer = setInterval(drawRecFrame, Math.round(1000 / REC_FPS));
            const recStream = (recVideo.videoWidth > 0 && recCanvas.captureStream) ? recCanvas.captureStream(REC_FPS) : stream;
            const REC_BPS = 10e6;   // 10 Mbps (limite do perfil H.264 Baseline nível 3.0); 8 Mbps era o valor original

            const mimeList = [
                'video/mp4;codecs=avc1.42E01E',
                'video/mp4;codecs=avc1',
                'video/mp4',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm'
            ].filter(m => MediaRecorder.isTypeSupported(m));

            let mr = null, chosenMime = '';
            for (const m of mimeList) {
                try {
                    mr = new MediaRecorder(recStream, { mimeType: m, videoBitsPerSecond: REC_BPS });
                    chosenMime = m;
                    break;
                } catch (e) {}
            }
            if (!mr) {
                try { mr = new MediaRecorder(recStream); chosenMime = mr.mimeType || 'video/webm'; }
                catch (e) {
                    clearInterval(timer); recVideo.remove();
                    stream.getTracks().forEach(t => t.stop());
                    document.body.classList.remove('rec-clean');
                    stage.classList.remove('rec'); captureStarting = false; abort();
                    alert('This browser could not initialize the video recorder.');
                    return;
                }
            }

            const chunks = [];
            mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            mr.onerror = e => { console.error('MediaRecorder error:', e); stopRec(); };
            mr.onstop = () => {
                clearInterval(timer);
                recVideo.srcObject = null;
                recVideo.remove();
                stream.getTracks().forEach(t => t.stop());
                document.body.classList.remove('rec-clean');
                document.body.style.removeProperty('--rec-w');
                stage.classList.remove('rec');
                recBtn.classList.remove('on');
                recBtn.textContent = '⏺ Export video (MP4)';
                rec = null;
                if (!chunks.length) {
                    alert('No frames were captured. Make sure to keep the window visible during recording.');
                    return;
                }
                const ext = chosenMime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
                const blob = new Blob(chunks, { type: chosenMime.split(';')[0] || 'video/' + ext });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (selectedTake === null ? 'simulacao-completa-bin-alpha' :
                    'take-' + selectedTake.name + '-bin-alpha') + '.' + ext;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 15000);
            };
            track.addEventListener('ended', () => { stopRec(); abort(); });
            rec = { mr, timer };
            captureStarting = false;
            mr.start(500);
            recBtn.classList.add('on');
            recBtn.textContent = '■ Stop and save video';
            if(selectedTake === null) void startTour(0, STEPS.length - 1, 'full', true);
            else void startTour(selectedTake.start,selectedTake.end,selectedTake.mode,true);
        }
        recBtn.addEventListener('click', () => startRec());
        document.querySelectorAll('#tour-takes [data-take-rec]').forEach(b => b.addEventListener('click', () => {
            const i = Number(b.dataset.takeRec);
            if (i >= 0 && i < TOUR_TAKES.length) startRec(i);
        }));

        // ---- exportar PNGs do COMEÇO e do FINAL de cada aba: mesma captura/recorte do vídeo, quadros 1920x1080 num único ZIP ----
        const snapBtn = $('tour-snap');
        const snapLabel = () => '■ Stop and save PNGs (' + (snap ? snap.frames.length : 0) + ')';

        // ZIP mínimo (método "store", sem compressão — PNG já é comprimido)
        const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
        const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
        function buildZip(files) {          // files: [{ name, data:Uint8Array }]
            const enc = new TextEncoder(), parts = [], central = [];
            const d = new Date();
            const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
            const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
            let offset = 0;
            files.forEach(f => {
                const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
                const lh = new DataView(new ArrayBuffer(30));
                lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
                lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
                lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
                parts.push(lh.buffer, nm, f.data);
                const ch = new DataView(new ArrayBuffer(46));
                ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
                ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
                ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true);
                ch.setUint32(42, offset, true);
                central.push(ch.buffer, nm);
                offset += 30 + nm.length + sz;
            });
            const cdSize = central.reduce((a, b) => a + (b.byteLength !== undefined ? b.byteLength : b.length), 0);
            const end = new DataView(new ArrayBuffer(22));
            end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
            end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
            return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
        }
        const pad = (n, w) => String(n).padStart(w, '0');

        async function snapFinish() {
            if (!snap || snap.finishing) return;
            const sn = snap; sn.finishing = true;
            await Promise.all(sn.pending);
            sn.video.srcObject = null; sn.video.remove();
            sn.stream.getTracks().forEach(t => t.stop());
            document.body.classList.remove('rec-clean');
            document.body.style.removeProperty('--rec-w');
            stage.classList.remove('rec');
            snapBtn.classList.remove('on'); snapBtn.textContent = '📷 Export start/end PNGs';
            recBtn.disabled = false;
            snap = null;
            if (!sn.frames.length) { alert('No frames were captured. Keep the window visible while the simulation runs.'); return; }
            const files = [];
            for (const f of sn.frames) files.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
            const url = URL.createObjectURL(buildZip(files));
            const a = document.createElement('a');
            a.href = url; a.download = 'simulacao-completa-bin-alpha-frames-png.zip';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        }

        function snapTake(name) {
            if (!snap || snap.finishing) return;
            const v = snap.video, vw = v.videoWidth, vh = v.videoHeight;
            if (!vw || !vh) return;
            const OW = 1920, OH = 1080, c = snap.canvas, g = snap.ctx;
            g.fillStyle = '#000223'; g.fillRect(0, 0, OW, OH);
            let sx = 0, sy = 0, sw = vw, sh = vh;
            if (!snap.cropped && snap.surf === 'browser' && window.innerWidth > 0 && window.innerHeight > 0) {
                const r = stage.getBoundingClientRect();
                if (r.width > 50 && r.height > 50) {
                    const kx = vw / window.innerWidth, ky = vh / window.innerHeight;
                    sx = Math.max(0, Math.round(r.left * kx)); sy = Math.max(0, Math.round(r.top * ky));
                    sw = Math.min(vw - sx, Math.round(r.width * kx)); sh = Math.min(vh - sy, Math.round(r.height * ky));
                }
            }
            const k = Math.min(OW / sw, OH / sh), dw = Math.round(sw * k), dh = Math.round(sh * k);
            g.drawImage(v, sx, sy, sw, sh, Math.round((OW - dw) / 2), Math.round((OH - dh) / 2), dw, dh);
            const sn = snap;
            const pr = new Promise(res => c.toBlob(b => { if (b) sn.frames.push({ name, blob: b }); snapBtn.textContent = snapLabel(); res(); }, 'image/png'));
            sn.pending.push(pr);
            pr.then(() => { sn.pending = sn.pending.filter(x => x !== pr); });
        }

        async function startSnap() {
            if (snap) { await snapFinish(); abort(); return; }
            if (rec || live || captureStarting) { console.warn('Finish the running tour/capture before starting snapshots.'); return; }
            if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
                alert('PNG export requires the Google Chrome or Microsoft Edge browser (open the HTML file directly in the browser).');
                return;
            }
            captureStarting = true;
            let stream;
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: { ideal: 30, max: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: 16 / 9 }, cursor: 'never' },
                    audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'include'
                });
            } catch (e) {
                captureStarting = false;
                if (e && e.name !== 'NotAllowedError' && e.name !== 'AbortError') alert('Could not start screen capture (' + (e.message || e.name) + '). Open the HTML file directly in a Chrome or Edge tab.');
                return;
            }
            const track = stream.getVideoTracks()[0];
            if (!track) { stream.getTracks().forEach(t => t.stop()); captureStarting = false; return; }
            await suppressRecordedCursor(track);

            document.body.classList.add('rec-clean');
            const recW = frameWidth(true), recH = recW * 9 / 16;
            fitFrame(false);
            stage.style.setProperty('--rec-w', recW + 'px'); stage.style.setProperty('--rec-h', recH + 'px');
            document.body.style.setProperty('--rec-w', recW + 'px');
            stage.classList.add('rec');
            recBtn.disabled = true;
            await sleep(250);

            let cropped = false;
            if (window.CropTarget && typeof track.cropTo === 'function') {
                try { await track.cropTo(await CropTarget.fromElement(stage)); cropped = true; } catch (e) { console.warn('cropTo unavailable; using manual crop:', e); }
            }
            const video = document.createElement('video');
            video.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
            video.muted = true; video.playsInline = true; video.srcObject = stream;
            document.body.appendChild(video);
            try { await video.play(); } catch (e) {}
            for (let w = 0; w < 20 && !video.videoWidth; w++) await sleep(50);

            const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            const surf = (track.getSettings && track.getSettings().displaySurface) || '';

            snap = { stream, video, canvas, ctx, cropped, surf, frames: [], pending: [], finishing: false };
            captureStarting = false;
            track.addEventListener('ended', () => { snapFinish().then(() => abort()); });
            snapBtn.classList.add('on'); snapBtn.textContent = snapLabel();
            // Capture must be ready before any scene begins (including the first frame).
            void startTour(0, STEPS.length - 1, 'full', true);
        }
        snapBtn.addEventListener('click', startSnap);
        window.__tourEdge = (i, st, when) => { if (snap) snapTake(pad(i + 1, 2) + '_' + st.key + '_' + when + '.png'); };

        // Um unico handler coordena o fim normal, a parada e os dois formatos de captura.
        window.__tourEnded = async () => {
            if (snap) { await sleep(150); await snapFinish(); return; }
            if (rec) { await sleep(350); stopRec(); await sleep(250); }
        };
        window.__stopTourRec = () => { if (rec) stopRec(); abort(); };

        window.tourStart = () => { if (!live) run(0); }; // explicit start only (general presentation button)
        window.tourAbort = abort;               // chamado ao sair da aba 8
    })();

    