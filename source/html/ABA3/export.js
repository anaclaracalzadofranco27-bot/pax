
    // Aba 3: exporta Alpha, convencional ou ambos num PNG de fundo transparente, sem as cotas.
    window.exportBinsPNG = function (K, which) {   // which: 'alpha' | 'conv' | undefined (os dois)
        K = K || 2.5;   // fator de ampliação em relação ao tamanho na tela
        const boxA = document.getElementById('nova-container'), boxC = document.getElementById('conv-top-container');
        if (!boxC || !window.__convDraw) return;
        if (which === 'alpha' && !window.__novaRender) { alert('Alpha bin is not loaded yet (open this tab with internet so three.js loads).'); return; }
        const saved = [boxA, boxC].map(b => b ? [b, b.style.width, b.style.height] : null).filter(Boolean);
        // Preserva também a ausência original da propriedade, além de seu valor.
        const stateKeys = ['__novaNoDim', '__convNoDim', '__novaK'];
        const previousState = stateKeys.map(key => ({
            key,
            present: Object.prototype.hasOwnProperty.call(window, key),
            value: window[key]
        }));
        const grab = c => { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0); return t; };
        let cA = null, cC = null;
        try {
            saved.forEach(([b]) => { const r = b.getBoundingClientRect(); b.style.width = Math.round(r.width * K) + 'px'; b.style.height = Math.round(r.height * K) + 'px'; });
            window.__novaNoDim = true; window.__convNoDim = true; window.__novaK = K;
            if (which !== 'conv' && boxA && window.__novaRender) { const c = window.__novaRender(); if (c) cA = grab(c); }
            if (which !== 'alpha') { window.__convDraw(); cC = grab(window.__convCapture ? window.__convCapture() : document.getElementById('convTopCanvas')); }
        } finally {
            saved.forEach(([b, w, h]) => { b.style.width = w; b.style.height = h; });
            previousState.forEach(({ key, present, value }) => {
                if (present) window[key] = value;
                else delete window[key];
            });
            // Um renderer com erro não pode impedir a restauração visual do outro.
            try { if (window.__novaRender) window.__novaRender(); } catch (err) { console.warn('Alpha export restore:', err); }
            try { window.__convDraw(); } catch (err) { console.warn('Conventional export restore:', err); }
        }
        const bbox = c => {
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
            for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
        };
        const parts = [cA, cC].filter(Boolean).map(c => ({ c, b: bbox(c) })).filter(p => p.b);
        if (!parts.length) return;
        const pad = 12, gap = 80;
        const top = Math.min(...parts.map(p => p.b.y0)), bot = Math.max(...parts.map(p => p.b.y1));   // mesma altura/alinhamento vertical da tela
        const W = parts.reduce((a, p) => a + (p.b.x1 - p.b.x0), 0) + gap * (parts.length - 1) + 2 * pad, H = bot - top + 2 * pad;
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        const o = out.getContext('2d'); let x = pad;
        parts.forEach(p => { const w = p.b.x1 - p.b.x0; o.drawImage(p.c, p.b.x0, top, w, bot - top, x, pad, w, bot - top); x += w + gap; });
        out.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = which === 'alpha' ? 'bin_alpha_sem_fundo.png' : which === 'conv' ? 'bin_convencional_sem_fundo.png' : 'bins_alpha_convencional_sem_fundo.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
    };
    