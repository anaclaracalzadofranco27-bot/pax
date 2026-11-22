// Aba 5 — Controlador único para a animação das portas: relógio ou interação manual.
// A geometria CAD das portas continua no motor compartilhado das Abas 5 e 6.
(function () {
    window.__uniRefDoorProgress = 0;
    let doorRaf = 0;
    let manual = false;
    const clamp = v => Math.max(0, Math.min(1, Number(v) || 0));
    function stop() {
        if (doorRaf) cancelAnimationFrame(doorRaf);
        doorRaf = 0;
    }
    function update(value) {
        const progress = clamp(value), percent = Math.round(progress * 100);
        window.__uniRefDoorProgress = progress;
        const slider = document.getElementById('uni-bin-door-slider');
        const pct = document.getElementById('uni-bin-door-pct');
        const button = document.getElementById('uni-bin-door-toggle');
        if (slider) slider.value = String(percent);
        if (pct) pct.textContent = percent + '%';
        if (button) button.textContent = progress > .5 ? 'Close bin doors' : 'Open bin doors';
    }
    window.uniRefTimelineDoors = value => { if (!manual) update(value); };
    window.uniRefUseTimelineDoors = () => { stop(); manual = false; };
    window.uniRefStopDoorMotion = stop;
    window.uniRefDoorSnapshot = () => ({ manual, progress: window.__uniRefDoorProgress });
    window.uniRefDoorRestore = state => { stop(); manual = !!state.manual; update(state.progress); };
    window.uniRefSetDoors = value => {
        stop(); manual = true; update(value);
        if (typeof window.uniRefresh === 'function') window.uniRefresh();
    };
    window.uniRefToggleDoors = () => {
        stop(); manual = true;
        const from = window.__uniRefDoorProgress || 0, target = from > .5 ? 0 : 1;
        const t0 = performance.now(), duration = 950;
        function tick(now) {
            doorRaf = 0;
            const x = Math.min(1, (now - t0) / duration), eased = x * x * (3 - 2 * x);
            update(from + (target - from) * eased);
            if (typeof window.uniRefresh === 'function') window.uniRefresh();
            if (x < 1) doorRaf = requestAnimationFrame(tick);
        }
        doorRaf = requestAnimationFrame(tick);
    };
})();
