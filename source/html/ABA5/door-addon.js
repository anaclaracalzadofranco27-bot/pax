
/* Tab 5 independent door movement leaves the timeline and Tab 6 unaffected. */
(function () {
    window.__uniRefDoorProgress = 0;
    let doorRaf = 0;
    window.uniRefSetDoors = value => {
        if (doorRaf) { cancelAnimationFrame(doorRaf); doorRaf = 0; }
        window.__uniRefDoorProgress = Math.max(0,Math.min(1, Number(value)||0));
        const slider=document.getElementById('uni-bin-door-slider');
        const pct=document.getElementById('uni-bin-door-pct');
        const button=document.getElementById('uni-bin-door-toggle');
        if(slider) slider.value = String(Math.round(window.__uniRefDoorProgress*100));
        if(pct) pct.textContent = Math.round(window.__uniRefDoorProgress*100)+'%';
        if(button) button.textContent = window.__uniRefDoorProgress>.5 ? 'Close bin doors' : 'Open bin doors';
        if(typeof window.uniRefresh === 'function') window.uniRefresh();
    };
    window.uniRefToggleDoors = () => {
        if (doorRaf) cancelAnimationFrame(doorRaf);
        const from = window.__uniRefDoorProgress || 0, target=from>.5?0:1;
        const t0=performance.now(), duration=950;
        function tick(now) {
            const x=Math.min(1,(now-t0)/duration), eased=x*x*(3-2*x);
            doorRaf=0;
            window.uniRefSetDoors(from+(target-from)*eased);
            if(x<1) doorRaf=requestAnimationFrame(tick);
        }
        doorRaf=requestAnimationFrame(tick);
    };
})();
