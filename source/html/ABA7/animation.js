(function closingAnimation() {
    const root = document.getElementById('closing-root');
    if (!root) return;

    const scenes = ['scene-1', 'scene-2', 'scene-3'].map(id => document.getElementById(id));
    const stages = ['s1-stage', 's2-stage', 's3-stage'].map(id => document.getElementById(id)).filter(Boolean);
    const timeEl = document.getElementById('closing-time');
    const mod = root.closest('#module-closing');
    const DURATION = 30000;
    const NO_LOGO_DURATION = 26400;
    const LOGO_DURATION = 3600;
    let t0 = 0, raf = 0, activeDuration = DURATION, version = 0;
    let lastTransform = '', lastLabel = '';

    const fontsReady = (() => {
        try {
            if (!document.fonts || !document.fonts.load) return Promise.resolve();
            const loading = Promise.all([
                document.fonts.load('500 40px Montserrat'),
                document.fonts.load('800 40px Montserrat')
            ]).catch(() => {});
            return Promise.race([loading, new Promise(resolve => setTimeout(resolve, 1200))]);
        } catch (_) {
            return Promise.resolve();
        }
    })();

    function fit() {
        const W = root.clientWidth, H = root.clientHeight;
        if (!W || !H) return;
        const s = Math.min(W / 1920, H / 1080);
        const transform = `translate(${((W - 1920 * s) / 2).toFixed(2)}px,${((H - 1080 * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})`;
        if (transform === lastTransform) return;
        lastTransform = transform;
        stages.forEach(stage => { stage.style.transform = transform; });
    }

    function label(ms) {
        if (!timeEl) return;
        const value = `${(Math.min(ms, activeDuration) / 1000).toFixed(1).padStart(4, '0')} / ${(activeDuration / 1000).toFixed(1)} s`;
        if (value !== lastLabel) {
            timeEl.textContent = value;
            lastLabel = value;
        }
    }

    function tick() {
        raf = 0;
        if (!t0) return;
        const elapsed = performance.now() - t0;
        label(elapsed);
        if (elapsed < activeDuration) raf = requestAnimationFrame(tick);
    }

    function reset() {
        ++version;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        t0 = 0;
        if (mod) mod.classList.remove('closing-no-logo', 'logo-only');
        scenes.forEach(scene => { if (scene) scene.classList.remove('go'); });
        activeDuration = DURATION;
        fit();
        label(0);
    }

    function startSegment(request, mode) {
        if (request !== version) return;
        void root.offsetWidth;
        if (mode === 'logo') {
            if (scenes[2]) scenes[2].classList.add('go');
        } else {
            scenes.forEach(scene => { if (scene) scene.classList.add('go'); });
        }
        t0 = performance.now();
        tick();
    }

    function playSegment(mode = 'full') {
        reset();
        if (mode === 'closing') {
            activeDuration = NO_LOGO_DURATION;
            if (mod) mod.classList.add('closing-no-logo');
        } else if (mode === 'logo') {
            activeDuration = LOGO_DURATION;
            if (mod) mod.classList.add('logo-only');
        }
        label(0);
        const request = version;
        fontsReady.then(() => startSegment(request, mode));
    }

    function play() { playSegment('full'); }

    if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
    window.addEventListener('resize', fit);
    const btn = document.getElementById('closing-play');
    if (btn) btn.addEventListener('click', play);

    window.closingFit = fit;
    window.closingReset = reset;
    window.closingPlay = play;
    window.closingPlaySegment = playSegment;
    window.closingEnter = () => { fit(); play(); };
    window.closingDone = () => t0 > 0 && performance.now() - t0 >= activeDuration;
})();
