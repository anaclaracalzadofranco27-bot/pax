

        // =========================================================================
        // PALETA ESCURA da simulação biomecânica (fundo #000223 · #5b7b9e · #9ba9b5 · #bababa)
        // Enquanto window.ERGO_DARK estiver ativo, tudo o que o canvas desenha é remapeado por luminância.
        // Cores de status saturadas (verde / vermelho / laranja) são preservadas.
        // =========================================================================
        (function installDarkPalette() {
            if (CanvasRenderingContext2D.prototype.__dkPal) return;
            CanvasRenderingContext2D.prototype.__dkPal = true;
            window.ERGO_DARK = true; window.ERGO_VIEW = false; window.__dkRole = null;   // paleta escura global; a Simulação Integrada usa a sua própria (BIN_SOLID / BIN_DARK)
            const dkOn = () => window.ERGO_DARK && !window.BIN_SOLID && !window.BIN_DARK;
            const toRGBA = c => {
                let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
                if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
                m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(c);
                return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null;
            };
            const hslToRGBA = c => {
                const m = /^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(c); if (!m) return null;
                const h = (+m[1]) / 360, sl = (+m[2]) / 100, l = (+m[3]) / 100, q = l < 0.5 ? l * (1 + sl) : l + sl - l * sl, p = 2 * l - q;
                const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
                return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255, m[4] == null ? 1 : +m[4]];
            };
            const BG = APHA_CABIN_PALETTE.bgRGB;
            const RAMP = APHA_CABIN_PALETTE.ramp;
            const cache = new Map();
            const dark = (c, kind) => {
                const role = window.__dkRole || '', key = role + '|' + kind + '|' + c;
                if (cache.has(key)) return cache.get(key);
                const t = c.trim(); let out = c;
                const v = toRGBA(t) || hslToRGBA(t);
                if (v && t.toLowerCase() !== '#000223') {
                    const [r, g, b, a] = [v[0] / 255, v[1] / 255, v[2] / 255, v[3]];
                    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
                    const sat = d > 0 ? d / (1 - Math.abs(2 * l - 1)) : 0;
                    let h = 0;
                    if (d > 0) { h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
                    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    if (sat > 0.45 && l > 0.12 && l < 0.88 && !(h >= 190 && h <= 290)) out = c;                               // status: verde / vermelho / laranja
                    else if (Math.round(v[0]) === 245 && Math.round(v[1]) === 245 && Math.round(v[2]) === 245) out = `rgba(${BG},${a})`;   // halos de texto
                    else if (L < 0.05) out = `rgba(8,18,42,${a})`;                                                              // contorno do boneco: azul-marinho quase preto
                    else if (kind === 'fill' && L > 0.9 && role !== 'bin') out = `rgba(${BG},${a})`;                            // caixas de rótulo claras → cor do fundo
                    else {
                        let col = RAMP[RAMP.length - 1][1];
                        for (let i = 1; i < RAMP.length; i++) if (L <= RAMP[i][0]) { const [l0, c0] = RAMP[i - 1], [l1, c1] = RAMP[i], k = l1 === l0 ? 0 : (L - l0) / (l1 - l0); col = c0.map((x, j) => x + (c1[j] - x) * k); break; }
                        out = `rgba(${col.map(Math.round).join(',')},${a})`;
                    }
                }
                if (cache.size > 2000) cache.clear();
                cache.set(key, out); return out;
            };
            ['fillStyle', 'strokeStyle'].forEach(k => {
                const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, k);
                Object.defineProperty(CanvasRenderingContext2D.prototype, k, {
                    configurable: true, enumerable: d.enumerable, get: d.get,
                    set(val) { d.set.call(this, (typeof val === 'string' && dkOn()) ? dark(val, k === 'strokeStyle' ? 'stroke' : 'fill') : val); }
                });
            });
            const acs0 = CanvasGradient.prototype.addColorStop;
            CanvasGradient.prototype.addColorStop = function (o, c) { return acs0.call(this, o, (dkOn() && typeof c === 'string') ? dark(c, 'fill') : c); };
            const ft0 = CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText = function (...a) {
                if (!dkOn()) return ft0.apply(this, a);
                const orig = this.fillStyle, v = typeof orig === 'string' ? toRGBA(orig) : null;
                const dim = v && Math.abs(v[0] - 100) < 4 && Math.abs(v[1] - 116) < 4 && Math.abs(v[2] - 139) < 4;   // numeração discreta da grade (#64748b)
                window.ERGO_DARK = false;
                try { this.fillStyle = dim ? '#6f8fb0' : '#bababa'; ft0.apply(this, a); this.fillStyle = orig; } finally { window.ERGO_DARK = true; }
            };
            // liga a paleta escura nas funções de desenho da simulação (declarações de função são reatribuíveis)
            const wrap = (fn, role) => function (...a) {
                const pb = window.ERGO_DARK, pv = window.ERGO_VIEW, pr = window.__dkRole; window.ERGO_DARK = true; window.ERGO_VIEW = true; if (role) window.__dkRole = role;
                try { return fn.apply(this, a); } finally { window.ERGO_DARK = pb; window.ERGO_VIEW = pv; window.__dkRole = pr; }
            };
            // bin/mala são compartilhados com as outras abas: só aplicam o papel 'bin' quando chamados de dentro do viewport biomecânico
            const wrapIn = (fn, role) => function (...a) {
                if (!dkOn()) return fn.apply(this, a);
                const pr = window.__dkRole; window.__dkRole = role;
                try { return fn.apply(this, a); } finally { window.__dkRole = pr; }
            };
            drawManikinViewport = wrap(drawManikinViewport);
            exportManikinSteps = wrap(exportManikinSteps);
            traceBinAlphaProfile = wrapIn(traceBinAlphaProfile, 'bin');
            drawRealisticSuitcase = wrapIn(drawRealisticSuitcase, 'bin');
        })();