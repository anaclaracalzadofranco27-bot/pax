
    // -------------------------------------------------------------------------
    // ENCERRAMENTO (30 s): 3 cenas com linha do tempo própria em CSS (.go): cena 1 de 0 a 10 s, cena 2 de 10 a 20 s,
    // cena 3 (com a logo) de 20 a 30 s. Os palcos são 1920x1080 e escalam pelo tamanho do #closing-root
    // (clientWidth/clientHeight do container da aba ou do quadro da Simulação Geral), não pela janela.
    // -------------------------------------------------------------------------
    (function closingAnimation() {
        const root = document.getElementById('closing-root'); if (!root) return;
        const scenes = ['scene-1', 'scene-2', 'scene-3'].map(id => document.getElementById(id));
        const stages = ['s1-stage', 's2-stage', 's3-stage'].map(id => document.getElementById(id)).filter(Boolean);
        const timeEl = document.getElementById('closing-time');
        const DURATION = 30000;
        const NO_LOGO_DURATION = 26400;  // termina ANTES do início da logo (26,4 s)
        const LOGO_DURATION = 3600;      // animação da logo: de 26,4 a 30 s
        let t0 = 0, raf = 0, activeDuration = DURATION;
        function fit() {
            const W = root.clientWidth, H = root.clientHeight; if (!W || !H) return;
            const s = Math.min(W / 1920, H / 1080);
            const tf = `translate(${((W - 1920 * s) / 2).toFixed(2)}px,${((H - 1080 * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})`;
            stages.forEach(e => { e.style.transform = tf; });
        }
        if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
        window.addEventListener('resize', fit);
        const label = ms => { if (timeEl) timeEl.textContent = `${(Math.min(ms, activeDuration) / 1000).toFixed(1).padStart(4, '0')} / ${(activeDuration/1000).toFixed(1)} s`; };
        function tick() {
            cancelAnimationFrame(raf);
            if (!t0) return;
            const el = performance.now() - t0; label(el);
            if (el < activeDuration) raf = requestAnimationFrame(tick);
        }
        function reset() {
            cancelAnimationFrame(raf); t0 = 0;
            const mod=root.closest('#module-closing');
            if(mod) mod.classList.remove('closing-no-logo','logo-only');
            scenes.forEach(e => e && e.classList.remove('go'));
            activeDuration=DURATION;
            fit(); label(0);
        }
        function playSegment(mode='full') {
            reset();
            const mod=root.closest('#module-closing');
            if(mode==='closing'){
                activeDuration=NO_LOGO_DURATION;
                if(mod) mod.classList.add('closing-no-logo');
            }else if(mode==='logo'){
                activeDuration=LOGO_DURATION;
                if(mod) mod.classList.add('logo-only');
            }
            void root.offsetWidth;    // reinicia todos os keyframes
            if(mode==='logo') {
                // O CSS desloca apenas o relógio do SVG 6,4 s, sem reproduzir
                // as cenas anteriores nem o intervalo de 26,4 segundos.
                if(scenes[2]) scenes[2].classList.add('go');
            } else {
                scenes.forEach(e => e && e.classList.add('go'));
            }
            t0=performance.now(); tick();
        }
        function play(){playSegment('full');}
        // fontes Montserrat 500/800 embutidas: decodifica já no carregamento, para a 1ª cena não trocar de fonte no meio
        try { ['500 40px Montserrat', '800 40px Montserrat'].forEach(f => document.fonts.load(f)); } catch (e) {}
        const btn = document.getElementById('closing-play'); if (btn) btn.addEventListener('click', play);
        window.closingFit = fit;
        window.closingReset = reset;
        window.closingPlay = play;
        window.closingPlaySegment = playSegment;
        window.closingEnter = () => { fit(); play(); };
        window.closingDone = () => t0 > 0 && performance.now() - t0 >= activeDuration;
    })();
    