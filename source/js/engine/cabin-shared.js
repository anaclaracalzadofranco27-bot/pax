

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
        // Unidade de exibição: polegadas (pol). Os cálculos internos continuam em cm;
        // só o que aparece na tela é convertido por esta função.
        const CM_PER_IN = 2.54;
        const fmtIn = (cm, d = 2) => `${(cm / CM_PER_IN).toFixed(d)}"`;
@@APHA_INCLUDE:source/js/core/navigation.js@@@@APHA_INCLUDE:source/html/ABA6/controller.js@@        // -------------------------------------------------------------------------
        // MÓDULO 1: GEOMETRIA CAD 2D (APÊNDICE A)
        // -------------------------------------------------------------------------
        function computeAllGeometries() {
            const R = APHA_CABIN_GEOMETRY.fuselageRadiusCm; // 54.00" (Fuselagem E195-E2)
            const x_livre = 25.4;          // 10.00"
            const folga = 0.508;           // 0.20"
            const espessura_porta = 1.5;   // 0.59"
            const espessura_base = 1.5;    // 0.59"

            const bagL = 22 * CM_PER_IN;   // 55.88 cm (22")
            const bagW = 14 * CM_PER_IN;   // 35.56 cm (14")
            const bagH = 10 * CM_PER_IN;   // 25.40 cm (10")


            const x_porta_inicio = x_livre;
            const x_porta_fim = x_porta_inicio + espessura_porta;
            const y_centro = R;
            const y_porta_top = x_porta_inicio < R ? Math.sqrt(R*R - x_porta_inicio*x_porta_inicio) : 0;
            const delta_y = y_centro - y_porta_top;

            const w1 = bagH + folga;
            const h1 = bagW;
            const x1_esq = x_porta_fim;
            const x1_dir = x1_esq + w1;

            const w2 = bagW;
            const h2 = bagH + folga;
            const x2_esq = x1_dir;
            const x2_dir = x2_esq + w2 + folga;

            const alphaValid = (x2_dir < R - 2);
            const y_m1_top = x1_dir < R ? Math.sqrt(R*R - x1_dir*x1_dir) : 0;
            const y_piso_max_m1 = y_m1_top - h1;
            const y_m2_top = x2_dir < R ? Math.sqrt(R*R - x2_dir*x2_dir) : 0;
            const y_piso_max_m2 = y_m2_top - h2;
            const y_base_geom = Math.min(y_piso_max_m1, y_piso_max_m2);
            const y_base_fisica_topo = y_base_geom + espessura_base;
            const y_m1_topo_real = y_base_fisica_topo + h1;
            const y_m2_topo_real = y_base_fisica_topo + h2;
            const comp_porta_alpha = y_porta_top - y_base_fisica_topo;
            const soma_total_alpha = comp_porta_alpha + delta_y + espessura_base;

            const w_emb = bagL;
            const h_emb = bagH + folga;
            const x_emb_esq = x_porta_fim;
            const x_emb_dir = x_emb_esq + w_emb;
            const embValid = (x_emb_dir < R - 2);
            const y_emb_top = embValid ? Math.sqrt(R*R - x_emb_dir*x_emb_dir) : 0;
            const y_emb_base_geom = y_emb_top - h_emb;
            const y_emb_base_topo = y_emb_base_geom + espessura_base;
            const y_emb_topo_real = y_emb_base_topo + h_emb;
            const comp_porta_emb = y_porta_top - y_emb_base_topo;
            const soma_total_emb = comp_porta_emb + delta_y + espessura_base;

            return {
                R, x_livre, folga, espessura_porta, espessura_base,
                x_porta_inicio, x_porta_fim, y_centro, y_porta_top, delta_y,
                alpha: {
                    valid: alphaValid, x1_esq, x1_dir, w1, h1, x2_esq, x2_dir, w2, h2,
                    y_m1_top, y_m2_top, y_base_geom, y_base_fisica_topo,
                    y_m1_topo_real, y_m2_topo_real, comp_porta: comp_porta_alpha, soma_total: soma_total_alpha
                },
                emb: {
                    valid: embValid, x_esq: x_emb_esq, x_dir: x_emb_dir, w: w_emb, h: h_emb,
                    y_base_geom: y_emb_base_geom, y_base_topo: y_emb_base_topo,
                    y_topo_real: y_emb_topo_real, comp_porta: comp_porta_emb, soma_total: soma_total_emb
                }
            };
        }

        // Constantes de tempo/easing do contorno CAD (reutilizadas pela Simulação Integrada)
        const CAD_STAGE_SEC = 1.35;
        const cadAnim = { t: 4 };
        const cadEase = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

        // Cotas técnicas compartilhadas pela Aba 5, simulação integrada e exportações.
        // Cor técnica única, inclusive no modo de exportação BIN_DARK.
        const DIMENSION_COLOR = '#b0c4de';
        function drawDimensionLine(ctx, x1, y1, x2, y2, label, color = DIMENSION_COLOR, fontSize = 15, labelOffset = {x: 0, y: 0}, ext1 = null, ext2 = null, cleanLabel = false) {
            ctx.save();
            const previousBinDark = window.BIN_DARK;
            try {
                window.BIN_DARK = false;
                // Unifica as cotas: cores antigas dos modelos não sobrescrevem o padrão técnico.
                const lineInk = DIMENSION_COLOR;
                const textInk = DIMENSION_COLOR;
                ctx.setLineDash([]);
                ctx.strokeStyle = lineInk;
                ctx.fillStyle = lineInk;
                ctx.lineWidth = 1;
                // As linhas auxiliares terminam nas superfícies geométricas reais.
                for (const ext of [ext1, ext2]) {
                    if (!ext) continue;
                    ctx.beginPath();
                    ctx.moveTo(ext.x1, ext.y1);
                    ctx.lineTo(ext.x2, ext.y2);
                    ctx.stroke();
                }
                // Setas terminam exatamente nos pontos medidos.
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                const length = Math.hypot(x2 - x1, y2 - y1);
                if (length > 1) {
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    // Setas menores nas folgas estreitas para não se cruzarem.
                    const headLen = Math.min(9, Math.max(3, length * 0.28));
                    const headAng = Math.PI / 6.5;
                    const arrow = (px, py, dirAngle) => {
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px - headLen * Math.cos(dirAngle - headAng), py - headLen * Math.sin(dirAngle - headAng));
                        ctx.lineTo(px - headLen * Math.cos(dirAngle + headAng), py - headLen * Math.sin(dirAngle + headAng));
                        ctx.closePath();
                        ctx.fill();
                    };
                    arrow(x2, y2, angle);
                    arrow(x1, y1, angle + Math.PI);
                }
                const mx = (x1 + x2) * 0.5 + (labelOffset.x || 0);
                const my = (y1 + y2) * 0.5 + (labelOffset.y || 0);
                ctx.font = `${Math.max(12, fontSize)}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                if (!cleanLabel) {
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(0, 2, 35, 0.92)';
                    ctx.strokeText(label, mx, my);
                }
                ctx.fillStyle = textInk;
                ctx.fillText(label, mx, my);
            } finally {
                window.BIN_DARK = previousBinDark;
                ctx.restore();
            }
        }

                // Polígono fechado com cantos levemente arredondados (só nos vértices vivos; curvas amostradas ficam intactas)
        function roundedPoly(ctx, pts, r) {
            const n = pts.length, out = [];
            const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            ctx.moveTo(...mid(pts[n - 1], pts[0]));
            for (let i = 0; i < n; i++) {
                const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
                const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
                const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
                const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2 || 1);
                const phi = Math.acos(Math.max(-1, Math.min(1, cos)));      // ângulo interno do vértice
                if (phi > Math.PI * 0.88 || phi < 0.05) { ctx.lineTo(p[0], p[1]); continue; }   // praticamente reto
                const tanHalf = Math.tan(phi / 2);
                const tLen = Math.min(r / Math.max(tanHalf, 0.35), Math.min(l1, l2) * 0.5);   // pontas agudas também ganham arredondamento
                const rr = tLen * tanHalf;
                ctx.arcTo(p[0], p[1], b[0], b[1], rr);
            }
            ctx.closePath();
        }
        function quadPts(p0, c, p1, n = 12) {
            const o = [];
            for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); }
            return o;
        }

        // =====================================================================
        // BINS VETORIZADOS (bins.pdf): contorno exato desenhado no CorelDRAW, usado na Simulação Integrada (BIN_SOLID).
        // Os dois contornos estão no mesmo quadro e na mesma escala do PDF (pontos): o corredor (x_livre) e o ápice da fuselagem
        // no corredor são a origem; k converte pontos do PDF em cm (bin Alpha = 35" de largura = 88,90 cm).
        // =====================================================================
        const BIN_VEC = {
            k: 88.9 / (468.035156 - 338.710938),
            yTop: 322.28125,
            xAisle: { alpha: 338.710938, conv: 261.473193 },
            // Proporções vindas das COTAS/CAD de cada bin (e não da escala do PDF): o PDF só fornece o formato do contorno.
            //   Convencional: largura 35" (88,90 cm). Queda do fundo desde o ápice do corredor: 21" sob o passageiro do CORREDOR (x = 48,5; u = 23,1 cm)
            //   e 23" (ponto mais baixo) sob o passageiro da JANELA (fundo plano, u >= 51 cm); transição linear entre os dois.
            //   Alpha (desenho CAD do bin): largura 893,53 mm e altura 641,92 mm, do ápice (teto no limite do corredor) ao ponto mais baixo.
            // hsf = fator horizontal, vsf = fator vertical (pode depender de u, em cm) aplicados ao contorno bruto do PDF (k cm/pt).
            hsf: function (kind) {
                return kind === 'conv' ? (35 * 2.54) / ((261.473193 - 131.23) * this.k)          // largura do contorno do PDF → 35"
                                       : 89.353 / ((468.035156 - 338.710938) * this.k);          // → 893,53 mm
            },
            vsf: function (kind, u) {
                if (kind !== 'conv') return 64.192 / ((414.418 - 322.28125) * this.k);           // Alpha → 641,92 mm
                const sF = (23.0 * 2.54) / ((409.148438 - 322.28125) * this.k);                  // fundo plano: 23"
                const sA = (21.0 * 2.54) / 55.564;                                               // 55,564 = calibrado para o fundo desenhado ficar em 21,00" sob o passageiro do corredor (u = 23,1)
                const t = Math.max(0, Math.min(1, (u - 23.1) / (51.0 - 23.1)));
                return sA + (sF - sA) * t;
            },
            // Ponto do contorno bruto do PDF (pt) → [u, v] em cm (u = distância ao corredor, v = queda desde o ápice), com hsf/vsf aplicados.
            map: function (kind, px, py) {
                const u = (kind === 'alpha' ? px - this.xAisle.alpha : this.xAisle.conv - px) * this.k * this.hsf(kind);
                return [u, (py - this.yTop) * this.k * this.vsf(kind, u)];
            },
            // Alpha: depois do fim da rampa (436,867 pt; queda máxima de 25,27") o fundo sobe levemente até o trecho final (era plano no PDF),
            // para que a queda sobre o passageiro da JANELA (u = 74,1 cm) seja de 24,94" — ponto "L 454,109 · 412,137".
            alpha: [["M",468.035,408.293],["C",444.059,370.688,392.512,330.418,338.711,322.281],["L",338.859,389.785],["C",338.859,391.582,342.18,395.766,344.406,395.84],["C",355.32,395.84,376.125,395.508,377.148,395.84],["C",388.441,399.508,411.758,406.652,436.867,414.418],["L",454.109,412.137],["C",457.012,411.774,466.32,410.871,468.035,408.293]],
            conv: [["M",240.66,327.891],["C",175.828,345.75,136.855,399.184,131.23,409.148],["L",188.004,409.148],["C",195.258,406.73,247.043,400.938,256.984,396.199],["C",258.012,395.711,260.449,394.527,261.316,391.453],["C",261.316,380.773,262.793,353.68,256.684,337.43],["C",254.988,332.93,248.312,327.867,241.695,327.832],["C",240.863,327.824,241.48,327.711,240.66,327.891]]
        };
        function traceVectorBin(ctx, toX, toY, kind, xCorredor, sign, yApex, sf, Rw, cyW) {
            const V = BIN_VEC;
            const P = (px, py) => {
                const m = V.map(kind, px, py);   // [distância a partir do corredor, queda a partir do ápice] em cm
                return [toX((xCorredor + m[0] * sf) * sign), toY(yApex - m[1] * sf)];
            };
            ctx.beginPath();
            V[kind].forEach(s => {
                if (s[0] === 'M') { const a = P(s[1], s[2]); ctx.moveTo(a[0], a[1]); }
                else if (s[0] === 'L') { const a = P(s[1], s[2]); ctx.lineTo(a[0], a[1]); }
                else { const a = P(s[1], s[2]), b = P(s[3], s[4]), c = P(s[5], s[6]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
            });
            ctx.closePath();
            ctx.save();
            // o bin nunca ultrapassa a parede interna da fuselagem
            ctx.beginPath(); ctx.arc(toX(0), toY(cyW), Math.abs(toX(Rw) - toX(0)), 0, Math.PI * 2); ctx.clip();
            ctx.beginPath();
            V[kind].forEach(s => {
                if (s[0] === 'M') { const a = P(s[1], s[2]); ctx.moveTo(a[0], a[1]); }
                else if (s[0] === 'L') { const a = P(s[1], s[2]); ctx.lineTo(a[0], a[1]); }
                else { const a = P(s[1], s[2]), b = P(s[3], s[4]), c = P(s[5], s[6]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
            });
            ctx.closePath();
            ctx.lineJoin = 'round';
            ctx.fillStyle = '#e7dbed';   // cor de preenchimento do PDF
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Borda inferior do bin vetorizado em |x| (cm a partir do eixo): devolve a cota Y do fundo do bin (usada pelas cotas de folga da cabeça).
        // Devolve null fora da largura do bin (aí vale o modelo antigo).
        const BIN_VEC_POLY = {};
        function vectorBinUnderY(kind, xAbs, xCorredor, yApex, sf) {
            const V = BIN_VEC;
            if (!BIN_VEC_POLY[kind]) {
                const pts = []; let cur = null;
                V[kind].forEach(sg => {
                    const Q = (px, py) => V.map(kind, px, py);   // mesma transformação (nos pontos de controle) usada no desenho
                    if (sg[0] === 'M' || sg[0] === 'L') { cur = Q(sg[1], sg[2]); pts.push(cur); }
                    else {
                        const p0 = cur, p1 = Q(sg[1], sg[2]), p2 = Q(sg[3], sg[4]), p3 = Q(sg[5], sg[6]);
                        for (let i = 1; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]); }
                        cur = p3;
                    }
                });
                BIN_VEC_POLY[kind] = pts;   // já em cm, idêntico ao contorno desenhado
            }
            const pts = BIN_VEC_POLY[kind], u = (xAbs - xCorredor) / sf;
            let vmax = -Infinity;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                if ((a[0] - u) * (b[0] - u) <= 0 && a[0] !== b[0]) { const v = a[1] + (b[1] - a[1]) * ((u - a[0]) / (b[0] - a[0])); if (v > vmax) vmax = v; }
            }
            return vmax === -Infinity ? null : yApex - vmax * sf;
        }

        // Helper para desenhar Geometria Técnica Fiel do Bin Alpha (35" de largura radial, altura variando de 20" na frente a 25" no fundo)
        function traceBinAlphaProfile(ctx, toX, toY, xCorredor, yFlatFloor, sign = 1, scaleFactor = 1.0, R_fus = 137.16, fusCenterY = 0.0, flatBottom = false) {
            const rad17 = 17.0 * Math.PI / 180.0;
            const cos17 = Math.cos(rad17);
            const sin17 = Math.sin(rad17);

            const W_flat = 25.91 * scaleFactor;
            const L_ramp = 35.67 * scaleFactor;
            const H_door = 40.33 * scaleFactor;
            const H_chan = 25.11 * scaleFactor;
            const W_tot  = 88.90 * scaleFactor;   // 35.0" de largura transversal exata (88,90 cm)

            const x0 = xCorredor * sign;
            const y0 = yFlatFloor;

            const xFlatEnd = (xCorredor + W_flat) * sign;
            const yFlatEnd = y0;

            const xRampEnd = (xCorredor + W_flat + L_ramp * cos17) * sign;
            const yRampEnd = y0 - L_ramp * sin17;

            const xDivTop = (xCorredor + W_flat + L_ramp * cos17 + H_chan * sin17) * sign;
            const yDivTop = yRampEnd + H_chan * cos17;

            const xStep = (xCorredor + W_flat) * sign;
            const yStepBot = yFlatEnd + H_chan / cos17;
            const yStepTop = y0 + H_door - 1.8 * scaleFactor;

            const yTopApex = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xCorredor * xCorredor));

            const xOuterTip = (xCorredor + W_tot) * sign;
            const yOuterTip = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - (xCorredor + W_tot) * (xCorredor + W_tot)));

            const yLowest = yTopApex - 25.0 * CM_PER_IN * scaleFactor;

            ctx.save();
            ctx.fillStyle = window.BIN_SOLID ? '#cbd5e1' : 'rgba(241, 245, 249, 0.94)';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.2;
            const PA = (x, y) => [toX(x), toY(y)];
            const ptsA = [PA(x0, y0), PA(xFlatEnd, yFlatEnd), PA(xRampEnd, yRampEnd)];
            let cyBot = (yLowest + yOuterTip) * 0.5;
            {   // calibra a curva inferior para que o ponto mais baixo do bin seja exatamente a cota de 25"
                // (flatBottom: fundo bem mais plano — mergulho de apenas 3,4 cm abaixo do fim da rampa, conforme bin.pdf)
                const yTarget = flatBottom ? Math.min(yRampEnd, yOuterTip) - 3.4 * scaleFactor : yLowest;
                let cy = (yTarget + yOuterTip) * 0.5, minY = 0;
                for (let k = 0; k < 12; k++) {
                    minY = Infinity;
                    for (let t = 0; t <= 1.0001; t += 0.02) { const u = 1 - t; minY = Math.min(minY, u * u * yRampEnd + 2 * u * t * cy + t * t * yOuterTip); }
                    cy += (yTarget - minY) * 1.2;
                }
                cyBot = cy;
                ptsA.push(...quadPts(PA(xRampEnd, yRampEnd), PA((xCorredor + W_tot * 0.90) * sign, cy), PA(xOuterTip, yOuterTip), 24));
            }
            const numArcSteps = 24;
            for (let i = 1; i <= numArcSteps; i++) {
                const xiAbs = (xCorredor + W_tot) - (W_tot * i) / numArcSteps;
                const yi = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xiAbs * xiAbs));   // colado na parede interna da fuselagem
                ptsA.push(PA(xiAbs * sign, yi));
            }
            if (window.BIN_SOLID) {
                traceVectorBin(ctx, toX, toY, 'alpha', xCorredor, sign, yTopApex, scaleFactor, R_fus, fusCenterY);   // Simulação Integrada: bin vetorizado (bins.pdf)
            } else {
            if (flatBottom) {
                // Bin no estilo do vetor (Sem_título-3.pdf): casca azul-clara; a cavidade da mala fica transparente (preenchimento par-ímpar)
                ctx.fillStyle = '#e8eef3'; ctx.strokeStyle = '#2e3154'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                roundedPoly(ctx, ptsA, 2.4 * Math.abs(toX(1) - toX(0)));
                ctx.moveTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
                ctx.lineTo(toX(xFlatEnd), toY(yFlatEnd + 1.0 * scaleFactor));
                ctx.lineTo(toX(xRampEnd), toY(yRampEnd + 1.0 * scaleFactor));
                ctx.lineTo(toX(xDivTop), toY(yDivTop));
                ctx.lineTo(toX(xStep), toY(yStepBot));
                ctx.lineTo(toX(xStep), toY(yStepTop));
                ctx.lineTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(yStepTop));
                ctx.closePath();
                ctx.fill('evenodd');
                ctx.stroke();
            } else {
            ctx.beginPath();
            roundedPoly(ctx, ptsA, 2.4 * Math.abs(toX(1) - toX(0)));
            ctx.fill();
            ctx.stroke();
            }
            }

            if (!window.BIN_SOLID) {
            ctx.fillStyle = flatBottom ? 'rgba(255, 255, 255, 0.10)' : (window.BIN_SOLID ? 'rgba(241, 245, 249, 0.94)' : '#ffffff');
            ctx.strokeStyle = flatBottom ? '#2e3154' : '#334155';
            ctx.lineWidth = flatBottom ? 1.3 : 1.8;
            ctx.beginPath();
            ctx.moveTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
            ctx.lineTo(toX(xFlatEnd), toY(yFlatEnd + 1.0 * scaleFactor));
            ctx.lineTo(toX(xRampEnd), toY(yRampEnd + 1.0 * scaleFactor));
            ctx.lineTo(toX(xDivTop), toY(yDivTop));
            ctx.lineTo(toX(xStep), toY(yStepBot));
            ctx.lineTo(toX(xStep), toY(yStepTop));
            ctx.lineTo(toX((xCorredor + 1.2 * scaleFactor) * sign), toY(yStepTop));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = flatBottom ? '#d5d8e0' : 'rgba(67, 70, 151, 0.14)';
            ctx.strokeStyle = flatBottom ? '#2e3154' : '#334155';
            ctx.lineWidth = flatBottom ? 1.3 : 1.6;
            ctx.beginPath();
            ctx.moveTo(toX(xRampEnd + 1.2 * scaleFactor * sign), toY(yRampEnd + 0.6 * scaleFactor));
            ctx.quadraticCurveTo(
                toX((xCorredor + W_tot * 0.90) * sign),
                toY(flatBottom ? cyBot : (yLowest + yOuterTip) * 0.5),
                toX(xOuterTip - 1.8 * scaleFactor * sign),
                toY(yOuterTip + 1.2 * scaleFactor)
            );
            ctx.lineTo(toX(xDivTop + 1.2 * scaleFactor * sign), toY(yDivTop - 0.8 * scaleFactor));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const xTopPocketStart = (xCorredor + 2.0 * scaleFactor) * sign;
            const xTopPocketEnd = (xCorredor + 20.66 * scaleFactor) * sign;
            const yTopPocketBot = yStepTop + 1.8 * scaleFactor;
            const yTopPocketApex = Math.min(yTopApex - 1.0 * scaleFactor, yTopPocketBot + 5.42 * scaleFactor);
            ctx.fillStyle = flatBottom ? '#d5d8e0' : 'rgba(42, 29, 194, 0.12)';
            ctx.beginPath();
            ctx.moveTo(toX(xTopPocketStart), toY(yTopPocketBot));
            ctx.lineTo(toX(xTopPocketEnd), toY(yTopPocketBot));
            ctx.lineTo(toX(xTopPocketStart), toY(yTopPocketApex));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = flatBottom ? '#2e3154' : '#2a1dc2';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(toX((xCorredor + 0.8 * scaleFactor) * sign), toY(y0 + 1.0 * scaleFactor));
            ctx.lineTo(toX((xCorredor + 0.8 * scaleFactor) * sign), toY(yStepTop - 2.5 * scaleFactor));
            ctx.quadraticCurveTo(
                toX((xCorredor + 0.8 * scaleFactor) * sign),
                toY(yStepTop + 0.8 * scaleFactor),
                toX((xCorredor + 4.5 * scaleFactor) * sign),
                toY(yStepTop + 0.8 * scaleFactor)
            );
            ctx.lineTo(toX(xStep), toY(yStepTop + 0.8 * scaleFactor));
            ctx.stroke();
            }
            ctx.restore();

            const m1W = 23.2 * scaleFactor;
            const m1H = 34.8 * scaleFactor;
            const m1Cx = (xCorredor + 1.4 * scaleFactor + m1W * 0.5) * sign;
            const m1Cy = y0 + 1.2 * scaleFactor + m1H * 0.5;

            const m2W = 33.2 * scaleFactor;
            const m2H = 22.8 * scaleFactor;
            const distAlongRamp = (L_ramp * 0.50);
            const distNormalToRamp = 1.2 * scaleFactor + m2H * 0.5;
            const m2Cx = (xCorredor + W_flat + distAlongRamp * cos17 + distNormalToRamp * sin17) * sign;
            const m2Cy = yFlatEnd - distAlongRamp * sin17 + distNormalToRamp * cos17;

            return {
                x0, y0, xFlatEnd, yFlatEnd, xRampEnd, yRampEnd,
                xDivTop, yDivTop, xStep, yStepBot, yStepTop,
                xOuterTip, yOuterTip, yTopApex, yLowest, rad17,
                m1Cx, m1Cy, m1W, m1H,
                m2Cx, m2Cy, m2W, m2H
            };
        }

        // Helper para desenhar Geometria Coerente do Bin Convencional Embraer (35" de largura radial, 22,5" de altura vertical)
        function traceEmbraerBinProfile(ctx, toX, toY, xCorredor, yPsuShelf, sign = -1, R_fus = 137.16, fusCenterY = 0.0, roundedDoor = false) {
            const scaleFactor = R_fus / 137.16;
            const xTopInnerAbs = xCorredor;
            const yTopInner = fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xTopInnerAbs * xTopInnerAbs)) - 1.2 * scaleFactor;

            const W_tot = 88.90 * scaleFactor; // 35.0" de largura transversal exata
            const xOuterPsuAbs = xTopInnerAbs + W_tot;

            const tiltDeg = 16.5;
            const tiltRad = tiltDeg * Math.PI / 180.0;
            const cosT = Math.cos(tiltRad);
            const sinT = Math.sin(tiltRad);

            const xBackBotAbs = 76.0 * scaleFactor;
            const yBackBot = yPsuShelf + 1.8 * scaleFactor;

            const floorLen = 49.0 * scaleFactor;
            const xFrontBotAbs = xBackBotAbs - floorLen * cosT;
            const yFrontBot = yBackBot + floorLen * sinT;

            const cavH = 24.8 * scaleFactor;
            const xBackTopAbs = xBackBotAbs + cavH * sinT;
            const yBackTop = yBackBot + cavH * cosT;
            const xFrontTopAbs = xFrontBotAbs + cavH * sinT;
            const yFrontTop = yFrontBot + cavH * cosT;

            const yLipBot = yPsuShelf + 11.2 * scaleFactor;

            ctx.save();
            ctx.fillStyle = window.BIN_SOLID ? '#cbd5e1' : 'rgba(203, 213, 225, 0.90)';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.2;
            const PE = (x, y) => [toX(x), toY(y)];
            const ptsE = [PE(xOuterPsuAbs * sign, yPsuShelf), PE((xBackBotAbs - 2.0 * scaleFactor) * sign, yPsuShelf), PE((xTopInnerAbs + 1.2 * scaleFactor) * sign, yLipBot)];
            const wallY = (x) => fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - x * x));   // parede interna da fuselagem
            let xArcStart = xTopInnerAbs;
            let doorInfo = null;
            const yTopInnerWall = wallY(xTopInnerAbs);
            if (roundedDoor) {
                xArcStart = xTopInnerAbs + 7.0 * 2.54 * scaleFactor;
                const yDoorTop = wallY(xArcStart);
                doorInfo = {
                    hingeX: xArcStart * sign, hingeY: yDoorTop,
                    ctrlX: (xTopInnerAbs + 0.4 * scaleFactor) * sign, ctrlY: yDoorTop - 3.0 * scaleFactor,
                    endX: (xTopInnerAbs + 1.2 * scaleFactor) * sign, endY: yLipBot
                };
                ptsE.push(...quadPts(PE(doorInfo.endX, doorInfo.endY), PE(doorInfo.ctrlX, doorInfo.ctrlY), PE(doorInfo.hingeX, doorInfo.hingeY)));
            } else {
                ptsE.push(...quadPts(PE((xTopInnerAbs + 1.2 * scaleFactor) * sign, yLipBot),
                    PE((xTopInnerAbs - 1.5 * scaleFactor) * sign, (yLipBot + yTopInnerWall) * 0.5),
                    PE(xTopInnerAbs * sign, yTopInnerWall)));
            }
            const numArc = 24;
            for (let i = 1; i <= numArc; i++) {
                const xiAbs = xArcStart + ((xOuterPsuAbs - xArcStart) * i) / numArc;
                const yi = (i === numArc) ? yPsuShelf : Math.max(yPsuShelf, wallY(xiAbs));
                ptsE.push(PE(xiAbs * sign, yi));
            }
            if (window.BIN_SOLID) {
                traceVectorBin(ctx, toX, toY, 'conv', xCorredor, sign, fusCenterY + Math.sqrt(Math.max(0, R_fus * R_fus - xTopInnerAbs * xTopInnerAbs)), scaleFactor, R_fus, fusCenterY);   // Simulação Integrada: bin vetorizado (bins.pdf)
            } else {
            ctx.beginPath();
            roundedPoly(ctx, ptsE, 2.4 * Math.abs(toX(1) - toX(0)));
            ctx.fill();
            ctx.stroke();
            }

            if (!window.BIN_SOLID) {
            ctx.fillStyle = window.BIN_SOLID ? 'rgba(203, 213, 225, 0.90)' : '#ffffff';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(toX(xBackBotAbs * sign), toY(yBackBot));
            ctx.lineTo(toX(xFrontBotAbs * sign), toY(yFrontBot));
            ctx.quadraticCurveTo(
                toX((xFrontBotAbs - 3.2 * scaleFactor) * sign),
                toY((yFrontBot + yFrontTop) * 0.5),
                toX(xFrontTopAbs * sign),
                toY(yFrontTop)
            );
            ctx.lineTo(toX(xBackTopAbs * sign), toY(yBackTop));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            }
            ctx.restore();

            const bagW = 33.6 * scaleFactor;
            const bagH = 22.8 * scaleFactor;
            const distAlong = floorLen * 0.50;
            const distNorm = 1.0 * scaleFactor + bagH * 0.5;
            const bagCxAbs = xBackBotAbs - distAlong * cosT + distNorm * sinT;
            const bagCy = yBackBot + distAlong * sinT + distNorm * cosT;

            return {
                xFrontBot: xTopInnerAbs * sign,
                yFrontBot: yLipBot,
                xFrontTop: xTopInnerAbs * sign,
                yFrontTop: yTopInner,
                xOuterPsu: xOuterPsuAbs * sign,
                yPsuShelf,
                doorInfo,
                bagCx: bagCxAbs * sign,
                bagCy,
                bagW,
                bagH,
                bagAngleRad: sign === -1 ? -tiltRad : tiltRad
            };
        }

        // Helper para desenhar Mala Realista estilo Embraer (Imagem 1) e Bin Alpha (Imagens 2/3)
        function drawRealisticSuitcase(ctx, cx, cy, wPx, hPx, angleRad, label1, label2, isAlphaStyle = false, colorOverride = null) {
            if (colorOverride) {
                // Mala em cor sólida personalizada (usada no Viewport CAD 2D da aba 1)
                const hex = colorOverride.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16), gC = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
                const dark = `rgb(${Math.round(r * 0.6)}, ${Math.round(gC * 0.6)}, ${Math.round(b * 0.6)})`;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angleRad);
                ctx.fillStyle = colorOverride;
                ctx.strokeStyle = dark;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 5);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(-wPx / 2 + 3.5, -hPx / 2 + 3.5, Math.max(4, wPx - 7), Math.max(4, hPx - 7));
                ctx.fillStyle = dark;
                ctx.fillRect(-wPx * 0.16, -hPx / 2 - 2.5, wPx * 0.32, 2.5);
                if (!window.ERGO_VIEW) {   // aba biomecânica: sem rótulos nas malas
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (label1 && label2) {
                        ctx.fillText(label1, 0, -5);
                        ctx.font = '7.5px "JetBrains Mono", monospace';
                        ctx.fillText(label2, 0, 6);
                    } else if (label1) {
                        ctx.fillText(label1, 0, 0);
                    }
                }
                ctx.restore();
                return;
            }
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleRad);

            // Corpo principal da mala com cantos arredondados
            ctx.fillStyle = isAlphaStyle ? (window.__mkExport ? '#6b6fc4' : 'rgba(67, 70, 151, 0.30)') : '#a1622f';
            ctx.strokeStyle = isAlphaStyle ? '#2a1dc2' : '#451a03';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 5);
            ctx.fill();
            ctx.stroke();

            // Costura interna / zíper
            ctx.strokeStyle = isAlphaStyle ? 'rgba(42, 29, 194, 0.50)' : '#78350f';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-wPx / 2 + 3.5, -hPx / 2 + 3.5, Math.max(4, wPx - 7), Math.max(4, hPx - 7));

            // Alça superior discreta
            ctx.fillStyle = isAlphaStyle ? '#2a1dc2' : '#451a03';
            ctx.fillRect(-wPx * 0.16, -hPx / 2 - 2.5, wPx * 0.32, 2.5);

            if (!window.ERGO_VIEW) {   // aba biomecânica: sem rótulos nas malas
                // Rótulos perfeitamente centralizados dentro da mala
                ctx.fillStyle = isAlphaStyle ? '#0f172a' : '#fef3c7';
                ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (label1 && label2) {
                    ctx.fillText(label1, 0, -5);
                    ctx.font = '7.5px "JetBrains Mono", monospace';
                    ctx.fillText(label2, 0, 6);
                } else if (label1) {
                    ctx.fillText(label1, 0, 0);
                }
            }
            ctx.restore();
        }

        // =========================================================================
        // MANEQUINS (DUMMIES) — estilo manequim articulado liso, com juntas visíveis
        //   'wood'  -> manequim de madeira bege (Imagem 1)
        //   'white' -> manequim branco com faixas cinzas nas juntas (Imagem 2)
        // Para trocar a aparência de todos os manequins, mude apenas DUMMY_STYLE.
        // =========================================================================
        const DUMMY_PALETTES = {
            android: { hi: '#ffffff', light: '#f4f7fa', mid: '#e2e8f0', dark: '#cbd5e1', edge: '#1e293b', seam: '#1e293b', joint: '#94a3b8', jointDark: '#64748b' }
        };
        const dummyPal = () => DUMMY_PALETTES.android;

        // Esfera de articulação estilo manequim técnico (cinza-azulada com contorno escuro e brilho)
        function drawDummyJointBall(ctx, cx, cy, rPx) {
            if (rPx < 0.8) return;
            const P = dummyPal();
            ctx.save();
            const grad = ctx.createRadialGradient(cx - rPx * 0.3, cy - rPx * 0.3, rPx * 0.1, cx, cy, rPx);
            grad.addColorStop(0.0, '#cbd5e1');
            grad.addColorStop(0.55, P.joint);
            grad.addColorStop(1.0, P.jointDark || '#64748b');
            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.45;
            ctx.beginPath();
            ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Segmento de membro estilo manequim ergonômico ilustrado (branco-gelo, contorno nítido e sombreamento cel-shaded suave)
        function drawDummyLimbSegment(ctx, x1, y1, x2, y2, r1Px, r2Px, rings = 0) {
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 1) return;
            const P = dummyPal();
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            let lx = nx, ly = ny;
            if (lx * -0.6 + ly * -0.8 < 0) { lx = -lx; ly = -ly; }

            ctx.save();
            const midX = (x1 + x2) * 0.5, midY = (y1 + y2) * 0.5;
            const rMax = Math.max(r1Px, r2Px, 2);
            const grad = ctx.createLinearGradient(midX + lx * rMax, midY + ly * rMax, midX - lx * rMax, midY - ly * rMax);
            grad.addColorStop(0.00, P.hi);
            grad.addColorStop(0.35, P.light);
            grad.addColorStop(0.75, P.mid);
            grad.addColorStop(1.00, P.dark);

            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x1 + nx * r1Px, y1 + ny * r1Px);
            ctx.lineTo(x2 + nx * r2Px, y2 + ny * r2Px);
            ctx.arc(x2, y2, r2Px, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
            ctx.lineTo(x1 - nx * r1Px, y1 - ny * r1Px);
            ctx.arc(x1, y1, r1Px, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Brilho lateral limpo (cel-shading)
            if (len > 5) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.lineWidth = Math.max(1.0, rMax * 0.22);
                ctx.lineCap = 'round';
                const t0 = 0.20, t1 = 0.80;
                const ra = (r1Px + (r2Px - r1Px) * t0) * 0.52, rb = (r1Px + (r2Px - r1Px) * t1) * 0.52;
                ctx.beginPath();
                ctx.moveTo(x1 + dx * t0 + lx * ra, y1 + dy * t0 + ly * ra);
                ctx.lineTo(x1 + dx * t1 + lx * rb, y1 + dy * t1 + ly * rb);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Cabeça escultural limpa estilo boneco ergonômico (crânio arredondado + mandíbula suave, branco-gelo e contorno escuro)
        function drawDummyHead3D(ctx, cx, cy, rPx) {
            const P = dummyPal();
            const w = rPx * 0.80;
            ctx.save();
            const grad = ctx.createLinearGradient(cx - w, cy - rPx, cx + w, cy + rPx);
            grad.addColorStop(0.00, P.hi);
            grad.addColorStop(0.45, P.light);
            grad.addColorStop(0.82, P.mid);
            grad.addColorStop(1.00, P.dark);

            ctx.fillStyle = grad;
            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.65;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy - rPx * 1.02);
            ctx.bezierCurveTo(cx + w * 1.25, cy - rPx * 1.02, cx + w * 1.22, cy + rPx * 0.10, cx + w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx + w * 0.52, cy + rPx * 0.96, cx + w * 0.22, cy + rPx * 1.04, cx, cy + rPx * 1.04);
            ctx.bezierCurveTo(cx - w * 0.22, cy + rPx * 1.04, cx - w * 0.52, cy + rPx * 0.96, cx - w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx - w * 1.22, cy + rPx * 0.10, cx - w * 1.25, cy - rPx * 1.02, cx, cy - rPx * 1.02);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Pequenas orelhas laterais discretas de manequim
            [-1, 1].forEach(sd => {
                ctx.fillStyle = sd < 0 ? P.light : P.mid;
                ctx.beginPath();
                ctx.ellipse(cx + sd * w * 0.98, cy + rPx * 0.04, w * 0.13, rPx * 0.22, sd * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // Redesenha o contorno interno da face por cima da base das orelhas e adiciona linha sutil de eixo facial
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx, cy - rPx * 1.02);
            ctx.bezierCurveTo(cx + w * 1.25, cy - rPx * 1.02, cx + w * 1.22, cy + rPx * 0.10, cx + w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx + w * 0.52, cy + rPx * 0.96, cx + w * 0.22, cy + rPx * 1.04, cx, cy + rPx * 1.04);
            ctx.bezierCurveTo(cx - w * 0.22, cy + rPx * 1.04, cx - w * 0.52, cy + rPx * 0.96, cx - w * 0.82, cy + rPx * 0.62);
            ctx.bezierCurveTo(cx - w * 1.22, cy + rPx * 0.10, cx - w * 1.25, cy - rPx * 1.02, cx, cy - rPx * 1.02);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Brilho suave na têmpora esquerda
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.beginPath();
            ctx.ellipse(cx - w * 0.38, cy - rPx * 0.42, w * 0.20, rPx * 0.28, -0.25, 0, Math.PI * 2);
            ctx.fill();

            // Linha sutil de construção de manequim (arco superciliar + eixo central discreto)
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.32)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.62, cy - rPx * 0.06);
            ctx.quadraticCurveTo(cx, cy + rPx * 0.04, cx + w * 0.62, cy - rPx * 0.06);
            ctx.moveTo(cx, cy - rPx * 0.35);
            ctx.lineTo(cx, cy + rPx * 0.45);
            ctx.stroke();
            ctx.restore();
        }

        // Tronco frontal estilo manequim técnico (peitoral branco-gelo esculpido + faixa abdominal cinza-azulada + pelve clara)
        function drawDummyTorsoFront3D(ctx, cx, yHip, yShoulder, halfShoulderW, halfWaistW, halfHipW) {
            const P = dummyPal();
            const H = yHip - yShoulder;                 // altura do tronco em px (y cresce para baixo)
            const yChestBot = yShoulder + H * 0.48;
            const yAbsBot   = yShoulder + H * 0.68;
            const halfNeckW = halfShoulderW * 0.32;
            const halfAbs   = halfWaistW * 0.95;

            ctx.save();
            const bodyGrad = ctx.createLinearGradient(cx - halfShoulderW, 0, cx + halfShoulderW, 0);
            bodyGrad.addColorStop(0.00, P.hi);
            bodyGrad.addColorStop(0.30, P.light);
            bodyGrad.addColorStop(0.75, P.mid);
            bodyGrad.addColorStop(1.00, P.dark);

            const waistGrad = ctx.createLinearGradient(cx - halfAbs, 0, cx + halfAbs, 0);
            waistGrad.addColorStop(0.00, '#cbd5e1');
            waistGrad.addColorStop(0.35, P.joint);
            waistGrad.addColorStop(1.00, P.jointDark || '#64748b');

            ctx.strokeStyle = P.edge;
            ctx.lineWidth = 1.55;
            ctx.lineJoin = 'round';

            // 1. Pelve (peça inferior clara tipo armadura de manequim)
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfAbs * 1.02, yAbsBot - 1);
            ctx.quadraticCurveTo(cx - halfHipW * 1.06, yAbsBot + (yHip - yAbsBot) * 0.32, cx - halfHipW, yAbsBot + (yHip - yAbsBot) * 0.68);
            ctx.quadraticCurveTo(cx - halfHipW * 0.85, yHip + H * 0.02, cx - halfHipW * 0.36, yHip + H * 0.05);
            ctx.quadraticCurveTo(cx, yHip + H * 0.08, cx + halfHipW * 0.36, yHip + H * 0.05);
            ctx.quadraticCurveTo(cx + halfHipW * 0.85, yHip + H * 0.02, cx + halfHipW, yAbsBot + (yHip - yAbsBot) * 0.68);
            ctx.quadraticCurveTo(cx + halfHipW * 1.06, yAbsBot + (yHip - yAbsBot) * 0.32, cx + halfAbs * 1.02, yAbsBot - 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Faixa articulada da cintura (cinza-azulada como na imagem de referência)
            ctx.fillStyle = waistGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfAbs * 1.02, yChestBot - 1);
            ctx.quadraticCurveTo(cx - halfAbs * 0.94, (yChestBot + yAbsBot) * 0.5, cx - halfAbs * 1.02, yAbsBot);
            ctx.quadraticCurveTo(cx, yAbsBot + H * 0.035, cx + halfAbs * 1.02, yAbsBot);
            ctx.quadraticCurveTo(cx + halfAbs * 0.94, (yChestBot + yAbsBot) * 0.5, cx + halfAbs * 1.02, yChestBot - 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3. Tórax / Peitoral esculpido (branco-gelo com gola de encaixe do pescoço)
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(cx - halfNeckW, yShoulder + H * 0.01);
            ctx.quadraticCurveTo(cx - halfShoulderW * 0.65, yShoulder + H * 0.015, cx - halfShoulderW, yShoulder + H * 0.09);
            ctx.quadraticCurveTo(cx - halfShoulderW * 1.04, yShoulder + H * 0.25, cx - halfAbs * 1.04, yChestBot);
            ctx.quadraticCurveTo(cx, yChestBot + H * 0.04, cx + halfAbs * 1.04, yChestBot);
            ctx.quadraticCurveTo(cx + halfShoulderW * 1.04, yShoulder + H * 0.25, cx + halfShoulderW, yShoulder + H * 0.09);
            ctx.quadraticCurveTo(cx + halfShoulderW * 0.65, yShoulder + H * 0.015, cx + halfNeckW, yShoulder + H * 0.01);
            ctx.quadraticCurveTo(cx, yShoulder + H * 0.055, cx - halfNeckW, yShoulder + H * 0.01);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Detalhe sutil de peitoral e linha média do manequim
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(cx, yShoulder + H * 0.06);
            ctx.lineTo(cx, yChestBot - H * 0.03);
            ctx.moveTo(cx - halfShoulderW * 0.72, yShoulder + H * 0.28);
            ctx.quadraticCurveTo(cx - halfShoulderW * 0.32, yShoulder + H * 0.34, cx - halfShoulderW * 0.06, yShoulder + H * 0.29);
            ctx.moveTo(cx + halfShoulderW * 0.72, yShoulder + H * 0.28);
            ctx.quadraticCurveTo(cx + halfShoulderW * 0.32, yShoulder + H * 0.34, cx + halfShoulderW * 0.06, yShoulder + H * 0.29);
            ctx.stroke();

            // Reflexo lateral branco no peito
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = Math.max(1.5, halfShoulderW * 0.11);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - halfShoulderW * 0.55, yShoulder + H * 0.13);
            ctx.lineTo(cx - halfAbs * 0.62, yChestBot - H * 0.06);
            ctx.stroke();
            ctx.restore();
        }

        // =========================================================================
        // FIGURA FRONTAL COMPLETA (sentada -> em pé) estilo manequim técnico ilustrado
        // =========================================================================
        function drawDummyFrontFigure(ctx, toX, toY, scale, o) {
            const __dkPrev = window.__dkRole; window.__dkRole = 'dummy';   // paleta escura da exportação: boneco
            const P = dummyPal();
            const S = o.S, px = o.px;
            const t = Math.min(1, Math.max(0, o.t || 0));
            const ankleY = (o.ankleY !== undefined) ? o.ankleY : 5.5;
            const lerp = (a, b, k) => a + (b - a) * k;
            const K = (o.slim !== undefined) ? o.slim : 0.74;
            const seg = (x1, y1, x2, y2, r1, r2) =>
                drawDummyLimbSegment(ctx, toX(x1), toY(y1), toX(x2), toY(y2), r1 * K * scale, r2 * K * scale, 0);
            const ball = (x, y, r) =>
                drawDummyJointBall(ctx, toX(x), toY(y), r * K * scale);

            // Marcos verticais (cm)
            const headR = S * 0.066;
            const headCY = o.headTopY - headR;
            const shoulderTopY = o.headTopY - S * 0.175;       // base do pescoço
            const pelvisBotY = o.pelvisBotY;
            const hipJY = pelvisBotY + S * 0.062;              // centro da articulação do quadril
            const kneeJY = lerp(hipJY - S * 0.04, ankleY + (hipJY - ankleY) * 0.5, t);

            // Posições laterais (cm, a partir da linha média)
            const hipX = S * 0.060 * K;
            const kneeX = lerp(S * 0.072, S * 0.062, t) * K;
            const ankX = lerp(S * 0.075, S * 0.060, t) * K;
            const shJY = shoulderTopY - S * 0.04;
            const shJX = S * 0.106 * K;
            const elbX = S * 0.122 * K;
            const elbY = shJY - S * 0.186;
            const handX = lerp(S * 0.088, S * 0.126, t) * K;
            const handY = lerp(hipJY + S * 0.040, elbY - S * 0.150, t);

            // Pescoço cilíndrico cinza-azulado articulado (como na referência)
            const drawNeck = () => {
                const nx = toX(px), ny1 = toY(o.headTopY - headR * 2 + S * 0.025), ny2 = toY(shoulderTopY - S * 0.015);
                const nr = S * 0.029 * K * scale;
                ctx.save();
                const gNeck = ctx.createLinearGradient(nx - nr, 0, nx + nr, 0);
                gNeck.addColorStop(0, '#cbd5e1');
                gNeck.addColorStop(0.45, P.joint);
                gNeck.addColorStop(1, P.jointDark || '#64748b');
                ctx.fillStyle = gNeck;
                ctx.strokeStyle = P.edge;
                ctx.lineWidth = 1.45;
                ctx.beginPath();
                ctx.roundRect(nx - nr, ny1, nr * 2, Math.max(4, ny2 - ny1), nr * 0.45);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            const drawTorso = () => drawDummyTorsoFront3D(ctx, toX(px), toY(pelvisBotY), toY(shoulderTopY),
                S * 0.098 * K * scale, S * 0.076 * K * scale, S * 0.095 * K * scale);

            const drawShinsAndFeet = () => [-1, 1].forEach(sd => {
                // Articulação do quadril (visível sob a pelve)
                ball(px + sd * hipX, hipJY, S * 0.038);
                // Canela
                seg(px + sd * kneeX, kneeJY, px + sd * ankX, ankleY, S * 0.036, S * 0.024);
                // Esfera do tornozelo
                ball(px + sd * ankX, ankleY, S * 0.025);
                // Pé escultural de manequim
                seg(px + sd * ankX, ankleY + 0.8, px + sd * (ankX + S * 0.010), S * 0.025, S * 0.026, S * 0.029);
            });

            const drawThighs = () => [-1, 1].forEach(sd => {
                seg(px + sd * hipX, hipJY, px + sd * kneeX, kneeJY, S * 0.048, S * 0.039);
                // Rótula / junta esférica cinza-azulada do joelho
                ball(px + sd * kneeX, kneeJY, S * 0.035);
            });

            const drawUpperArms = () => [-1, 1].forEach(sd => {
                // Esfera de articulação do ombro (destaque igual à referência)
                ball(px + sd * shJX, shJY, S * 0.035);
                seg(px + sd * shJX, shJY, px + sd * elbX, elbY, S * 0.031, S * 0.026);
                // Esfera do cotovelo
                ball(px + sd * elbX, elbY, S * 0.028);
            });

            const drawForearmsAndHands = () => [-1, 1].forEach(sd => {
                seg(px + sd * elbX, elbY, px + sd * handX, handY, S * 0.026, S * 0.020);
                // Punho cinza-azulado + mão tipo luva arredondada
                ball(px + sd * handX, handY, S * 0.020);
                const hl = lerp(S * 0.032, S * 0.068, t);
                seg(px + sd * handX, handY, px + sd * (handX - S * 0.012 * (1 - t)), handY - hl, S * 0.022, S * 0.018);
            });

            drawNeck();
            if (t >= 0.55) { drawShinsAndFeet(); drawThighs(); drawTorso(); }
            else           { drawTorso(); drawShinsAndFeet(); drawThighs(); }
            drawUpperArms();
            drawForearmsAndHands();
            drawDummyHead3D(ctx, toX(px), toY(headCY), headR * 1.04 * scale);
            window.__dkRole = __dkPrev;
        }


/* Aba 5: Source CAD geometry from Simulador Cinemático CAD.
   Dimensions are cm in the schematic 1:10; the original cabin shell, floor,
   corridor and seats stay unchanged. */
(function () {
const CABIN_R = 137.00;
        const CABIN_YC = 63.00;
        const CORRIDOR_LEFT_X = -24.50;

        const ALPHA_FIXED = Object.freeze({
            // Transformação arquivo -> CAD (x_cad = SCALE_X*fx + TX ; y_svg = SCALE_Y*fy + TY), ajustada ao arco da fuselagem
            scaleX: 0.004474693,   // 89,35 cm de largura real
            scaleY: 0.004288607,   // 61,49 cm de altura real
            tx: 20.87335808,
            ty: -228.85901283,
            bbox: { x0: 644.92, y0: 7233.40, x1: 20612.77, y1: 21571.39 },
            wallFix: { fx: 20544.92, fy: 20683.35 },   // início do arco (ponto baixo, na fuselagem)
            topFuse: { fx: 824.78, fy: 7257.57 }       // fim do arco (ponto alto, na fuselagem)
        });

        // Contorno externo amostrado do alphaa.svg (coords do arquivo) — usado para achar o ponto mais baixo / extremos ao girar
        const ALPHA_OUTLINE = [[658,7389],[657,8175],[657,9009],[657,9883],[656,10787],[656,11711],[655,12646],[654,13583],[653,14511],[651,15422],[650,16306],[648,17154],[647,17956],[646,18069],[645,18171],[648,18264],[658,18346],[678,18420],[711,18484],[760,18539],[828,18585],[918,18623],[1034,18653],[1178,18676],[1354,18691],[1879,18725],[2433,18767],[3001,18815],[3571,18867],[4127,18921],[4657,18975],[5146,19026],[5581,19072],[5948,19113],[6234,19144],[6424,19165],[6504,19173],[6711,19218],[7144,19335],[7759,19511],[8514,19733],[9366,19988],[10272,20262],[11191,20542],[12078,20815],[12891,21068],[13588,21287],[14126,21459],[14462,21571],[14551,21571],[14798,21571],[15172,21571],[15640,21571],[16171,21571],[16734,21571],[17297,21571],[17828,21571],[18296,21571],[18670,21571],[18917,21571],[19007,21571],[19062,21553],[19140,21523],[19237,21481],[19351,21429],[19478,21370],[19616,21305],[19761,21235],[19911,21163],[20063,21090],[20214,21018],[20361,20948],[20501,20883],[20535,20867],[20562,20855],[20583,20844],[20598,20834],[20608,20824],[20612,20813],[20612,20800],[20607,20785],[20597,20767],[20584,20745],[20566,20717],[20545,20683],[19224,18736],[17797,16956],[16279,15338],[14683,13877],[13023,12568],[11315,11406],[9572,10387],[7807,9505],[6036,8756],[4273,8135],[2531,7637],[825,7258],[784,7249],[751,7242],[725,7237],[704,7234],[688,7234],[676,7238],[668,7247],[663,7262],[660,7282],[659,7310],[658,7345],[658,7389]];

        const SUITCASE = Object.freeze({
            wMm: 55.88,               // 22" = 55,88 cm
            hMm: 25.40,               // 10" = 25,40 cm
            fixedTiltDeg: 15.0,       // Angulação fixada em 15,0°
            operationalClearMm: 2.54, // Folga operacional de 1,0" = 2,54 cm (2,54 mm no CAD 1:10)
            minBinToBagHeightMm: 2.54,// Altura mínima da base do bin para a mala: 1,0" = 2,54 cm (2,54 mm no CAD)
            maxDoorBulgeXMm: 1.27     // Avanço horizontal máximo permitido para arredondar a porta: 0,5" = 1,27 cm
        });

        const DOOR_KINEMATIC_DELTA = Object.freeze({
            inchMm: 2.54              // 1" = 2,54 cm (2,54 mm no CAD 1:10) abaixo do fim da mala
        });

        const state = {
            zoomMode: 'bin',
            leftBaseY: 138.50,
            alphaMode: 'floor',     // extremo que o usuário define: 'floor' (piso do bin), 'base' ou 'top'
            alphaTargetY: 148.70,    // distância do chão da cabine até o piso do bin no ponto mais alto (cm)
            bagTiltDeg: SUITCASE.fixedTiltDeg,
            thetaDeg: 0.0,
            alphaDoorU: 0.0,
            maxOpenAngleDeg: 92.0,
            bagInsertPct: 100,
            isAnimating: false,
            animDir: 1
        };


        function getFuselageX(yMm) {
            const dy = yMm - CABIN_YC;
            const inside = Math.max(0, CABIN_R * CABIN_R - dy * dy);
            return Math.sqrt(inside);
        }

        function rotatePointAroundPivot(pt, pivot, angleDeg) {
            const rad = angleDeg * Math.PI / 180.0;
            const cosA = Math.cos(rad);
            const sinA = Math.sin(rad);
            const dx = pt.x - pivot.x;
            const dy = pt.y - pivot.y;
            return {
                x: pivot.x + (dx * cosA - dy * sinA),
                y: pivot.y + (dx * sinA + dy * cosA)
            };
        }

        function buildRoundedRectPath(bL, bR, tR, tL, tx, ty, nx, ny, rCorner) {
            const r = Math.max(0, rCorner);
            if (r <= 0.05) {
                return `M ${bL.x.toFixed(2)} ${(-bL.y).toFixed(2)} L ${bR.x.toFixed(2)} ${(-bR.y).toFixed(2)} L ${tR.x.toFixed(2)} ${(-tR.y).toFixed(2)} L ${tL.x.toFixed(2)} ${(-tL.y).toFixed(2)} Z`;
            }
            const p1 = { x: bL.x + r * tx, y: bL.y + r * ty };
            const p2 = { x: bR.x - r * tx, y: bR.y - r * ty };
            const p3 = { x: bR.x + r * nx, y: bR.y + r * ny };
            const p4 = { x: tR.x - r * nx, y: tR.y - r * ny };
            const p5 = { x: tR.x - r * tx, y: tR.y - r * ty };
            const p6 = { x: tL.x + r * tx, y: tL.y + r * ty };
            const p7 = { x: tL.x - r * nx, y: tL.y - r * ny };
            const p8 = { x: bL.x + r * nx, y: bL.y + r * ny };
            return [
                `M ${p1.x.toFixed(2)} ${(-p1.y).toFixed(2)}`,
                `L ${p2.x.toFixed(2)} ${(-p2.y).toFixed(2)}`,
                `Q ${bR.x.toFixed(2)} ${(-bR.y).toFixed(2)} ${p3.x.toFixed(2)} ${(-p3.y).toFixed(2)}`,
                `L ${p4.x.toFixed(2)} ${(-p4.y).toFixed(2)}`,
                `Q ${tR.x.toFixed(2)} ${(-tR.y).toFixed(2)} ${p5.x.toFixed(2)} ${(-p5.y).toFixed(2)}`,
                `L ${p6.x.toFixed(2)} ${(-p6.y).toFixed(2)}`,
                `Q ${tL.x.toFixed(2)} ${(-tL.y).toFixed(2)} ${p7.x.toFixed(2)} ${(-p7.y).toFixed(2)}`,
                `L ${p8.x.toFixed(2)} ${(-p8.y).toFixed(2)}`,
                `Q ${bL.x.toFixed(2)} ${(-bL.y).toFixed(2)} ${p1.x.toFixed(2)} ${(-p1.y).toFixed(2)}`,
                `Z`
            ].join(' ');
        }

        function computeLeftBinAtY(baseY) {
            const wallX = -getFuselageX(baseY);
            const wallFix = { x: wallX, y: baseY };

            const tiltDeg = SUITCASE.fixedTiltDeg; // 15.0°
            const alphaRad = tiltDeg * Math.PI / 180.0;
            const tx = Math.cos(alphaRad);
            const ty = Math.sin(alphaRad);
            const nx = -Math.sin(alphaRad);
            const ny = Math.cos(alphaRad);

            // =========================================================================
            // 1. POSICIONAMENTO DA MALA COM:
            //    - Altura mínima da base do bin para a mala = 1,0" (2,54 mm)
            //    - Folga operacional exata da fuselagem = 1,0" (2,54 mm)
            // =========================================================================
            const targetRadius = CABIN_R - SUITCASE.operationalClearMm; // 137.00 - 2.54 = 134.46 mm
            const bagBotLeftY = baseY + SUITCASE.minBinToBagHeightMm;   // Exatamente 1,0" (2,54 mm) acima da base Y do bin
            const bagTopLeftY = bagBotLeftY + SUITCASE.hMm * ny;

            // Para que o canto superior esquerdo (`bagSeatedTopLeft`) e o canto inferior esquerdo (`seatedBagBotLeft`)
            // respeitem exatamente 1,0" (2,54 mm) de distância radial até a circunferência da fuselagem:
            const maxAllowTopLeftX = -Math.sqrt(Math.max(0, targetRadius * targetRadius - Math.pow(bagTopLeftY - CABIN_YC, 2)));
            const maxAllowBotLeftX = -Math.sqrt(Math.max(0, targetRadius * targetRadius - Math.pow(bagBotLeftY - CABIN_YC, 2)));

            const seatedBagBotLeftX = Math.max(
                maxAllowBotLeftX,
                maxAllowTopLeftX - SUITCASE.hMm * nx
            );

            const seatedBagBotLeft = {
                x: seatedBagBotLeftX,
                y: bagBotLeftY
            };
            const seatedBagBotRight = {
                x: seatedBagBotLeft.x + SUITCASE.wMm * tx,
                y: seatedBagBotLeft.y + SUITCASE.wMm * ty
            };
            const bagSeatedTopLeft = {
                x: seatedBagBotLeft.x + SUITCASE.hMm * nx,
                y: seatedBagBotLeft.y + SUITCASE.hMm * ny
            };
            const seatedBagTopRight = {
                x: seatedBagBotRight.x + SUITCASE.hMm * nx,
                y: seatedBagBotRight.y + SUITCASE.hMm * ny
            };

            const rTopLeftActual = Math.hypot(bagSeatedTopLeft.x, bagSeatedTopLeft.y - CABIN_YC);
            const rBotLeftActual = Math.hypot(seatedBagBotLeft.x, seatedBagBotLeft.y - CABIN_YC);
            const bagWallClearanceMm = CABIN_R - Math.max(rTopLeftActual, rBotLeftActual);
            const bagBaseClearanceMm = seatedBagBotLeft.y - baseY; // Exatos 2,54 mm (1,0")

            // Posição animada da mala (conforme slider de inserção 0% a 100%)
            const slideOutDist = (1.0 - state.bagInsertPct / 100.0) * 30.0;
            const bagBotLeft = {
                x: seatedBagBotLeft.x + slideOutDist * tx,
                y: seatedBagBotLeft.y + slideOutDist * ty
            };
            const bagBotRight = {
                x: seatedBagBotRight.x + slideOutDist * tx,
                y: seatedBagBotRight.y + slideOutDist * ty
            };
            const bagTopLeft = {
                x: bagSeatedTopLeft.x + slideOutDist * tx,
                y: bagSeatedTopLeft.y + slideOutDist * ty
            };
            const bagTopRight = {
                x: seatedBagTopRight.x + slideOutDist * tx,
                y: seatedBagTopRight.y + slideOutDist * ty
            };

            const roundedBagPathD = buildRoundedRectPath(
                bagBotLeft, bagBotRight, bagTopRight, bagTopLeft,
                tx, ty, nx, ny, 0.85
            );

            // =========================================================================
            // 2. CAVIDADE INTERNA DO BIN AO REDOR DA MALA:
            // =========================================================================
            const padBack = 0.65;
            const padFloor = 0.55;
            const padRoof = 0.65;
            const padFront = 0.25;

            const boxBotLeft = {
                x: seatedBagBotLeft.x - padBack * tx - padFloor * nx,
                y: seatedBagBotLeft.y - padBack * ty - padFloor * ny
            };
            const boxBotRight = {
                x: seatedBagBotRight.x + padFront * tx - padFloor * nx,
                y: seatedBagBotRight.y + padFront * ty - padFloor * ny
            };
            const boxTopLeft = {
                x: bagSeatedTopLeft.x - padBack * tx + padRoof * nx,
                y: bagSeatedTopLeft.y - padBack * ty + padRoof * ny
            };
            const boxTopRight = {
                x: seatedBagTopRight.x + padFront * tx + padRoof * nx,
                y: seatedBagTopRight.y + padFront * ty + padRoof * ny
            };

            const roundedChamberPathD = buildRoundedRectPath(
                boxBotLeft, boxBotRight, boxTopRight, boxTopLeft,
                tx, ty, nx, ny, 1.15
            );

            // =========================================================================
            // 3. PORTA ARREDONDADA AO MÁXIMO POSSÍVEL COM AVANÇO HORIZONTAL MÁXIMO DE 0,5" (1,27 mm)
            //    E BARRIGA INFERIOR DO BIN REDUZIDA PARA 1,0" (2,54 mm) DA MALA:
            // =========================================================================
            const latchDropBelowBagMm = DOOR_KINEMATIC_DELTA.inchMm; // 2.54 mm (1")

            const doorTipInner = {
                x: seatedBagBotRight.x + 0.05 * tx - latchDropBelowBagMm * (-nx),
                y: seatedBagBotRight.y - latchDropBelowBagMm
            };
            const doorTipOuter = {
                x: doorTipInner.x + 1.35,
                y: doorTipInner.y + 0.08
            };

            const doorLipBot = {
                x: doorTipInner.x - 0.15,
                y: doorTipInner.y - 0.05
            };
            const mouthStepIn = {
                x: seatedBagBotRight.x + 0.05,
                y: seatedBagBotRight.y - 0.25
            };

            // Bring the kinematic carriage towards the front lip: the oval door
            // now rocks around a point closer to its edge rather than
            // tilting far backwards around the rear of the bin.
            const pvt = {
                x: seatedBagTopRight.x - 5.65,
                y: seatedBagTopRight.y + 4.00
            };
            // Retraction along the upper guide counters the outward
            // swing; the articulated rod is constructed on the door below.
            const carriageTravel = { x: -9.50, y: 5.20 };
            // SVG porta(5): menor rotação, com deslocamento da folha para cima e para trás.
            const CONVENTIONAL_DOOR_OPEN_DEG = 39.0;

            // No vertical lip/step: the front door meets the continuous
            // upper fuselage arc at this CAD-derived point.
            // Preserve the roof seam in the exact same fuselage location even
            // though the moving carriage has been relocated forwards.
            const roofJoinX = seatedBagTopRight.x - 21.85;
            const fuseTop = {
                x: roofJoinX,
                y: CABIN_YC + Math.sqrt(Math.max(0, CABIN_R * CABIN_R - roofJoinX * roofJoinX))
            };
            // Retained as metadata for the existing elevation calculation.
            const rampTopEnd = { x: fuseTop.x, y: fuseTop.y };

            // Extended, continuous shell-to-lip door: upper outer tip exactly
            // touches the fuselage; inner face follows the curved panel.
            const bladeTopOuter = { x: fuseTop.x, y: fuseTop.y };
            const bladeTopInner = { x: fuseTop.x + 0.90, y: fuseTop.y - 1.10 };

            // Keep the old design target for CAD metadata; the actual opening
            // envelope is now solved from the complete moving quadratic surface.
            const maxBulgeX = SUITCASE.maxDoorBulgeXMm;
            const targetMaxDoorX = doorTipOuter.x + maxBulgeX;

            // The shell seam will share the final door inner Bézier control,
            // so the closed door joins the bottom lip without a visible step.
            const mouthCurveCtrl = {
                x: doorTipOuter.x + 1.00,
                y: (bladeTopInner.y + doorTipInner.y) * 0.5 + 1.00
            };

                        // Barriga inferior enxuta: sai de psuBotCorner (1,0" abaixo do canto inferior esquerdo da mala)
            // e sobe suavemente mantendo a espessura mínima de 1,0" (2,54 mm) abaixo da mala até doorLipBot
            const psuBotCorner = {
                x: seatedBagBotLeft.x,
                y: baseY
            };
            const bellyCtrl = {
                x: (psuBotCorner.x + doorLipBot.x) * 0.5 + 1.2,
                y: (psuBotCorner.y + doorLipBot.y) * 0.5 - 0.35
            };

            const hornPeakY = Math.min(CABIN_YC + CABIN_R - 2.0, boxTopLeft.y + 5.2);
            const hornPeak = { x: -getFuselageX(hornPeakY), y: hornPeakY };
            const notchValley = {
                x: boxTopLeft.x + 2.2 * tx + 0.35 * nx,
                y: boxTopLeft.y + 2.2 * ty + 0.35 * ny
            };
            const notchCtrl = {
                x: (hornPeak.x + notchValley.x) * 0.5 - 0.8,
                y: (hornPeak.y + notchValley.y) * 0.5 - 0.8
            };

            const lugTopLeft = {
                x: pvt.x - 2.4 * tx + 0.3 * nx,
                y: pvt.y - 2.4 * ty + 0.3 * ny
            };
            const lugBotRight = {
                x: pvt.x + 0.8 * tx - 1.15 * nx,
                y: pvt.y + 0.8 * ty - 1.15 * ny
            };

            const brkHubLeft = {
                x: pvt.x - 0.60 * tx + 0.65 * nx,
                y: pvt.y - 0.60 * ty + 0.65 * ny
            };
            const brkHubBot = {
                x: pvt.x - 0.20 * tx - 0.80 * nx,
                y: pvt.y - 0.20 * ty - 0.80 * ny
            };
            const brkJoinTop = {
                x: bladeTopInner.x + 0.08 * tx - 0.05 * nx,
                y: bladeTopInner.y + 0.08 * ty - 0.05 * ny
            };
            const brkJoinBot = {
                x: seatedBagTopRight.x + 1.45,
                y: seatedBagTopRight.y - 2.00
            };
            const bladeMidInner = {
                x: brkJoinBot.x,
                y: brkJoinBot.y
            };

            // Door shaped after the yellow CAD sketch: a nearly horizontal
            // shoulder at the roof, a broad oval transition, then an
            // almost vertical front at the lower lip. Both skins follow
            // the same curve model, preserving the panel thickness.
            const doorOuterCtrl = {
                x: doorTipOuter.x + 2.65,
                y: (bladeTopOuter.y + doorTipOuter.y) * 0.5 + 1.55
            };
            const doorInnerCtrl = {
                x: doorOuterCtrl.x - 1.65,
                y: doorOuterCtrl.y - 0.75
            };
            mouthCurveCtrl.x = doorInnerCtrl.x;
            mouthCurveCtrl.y = doorInnerCtrl.y;

            // A single, asymmetric cubic provides a flatter top tangent
            // and an upright nose. Subdivide it at t=.5 so the existing
            // seven-point silhouette, swept envelope and export paths
            // continue to sample exactly the same rigid oval door.
            function makeFrontOvalProfile(top, tip) {
                const dx = tip.x - top.x;
                const drop = top.y - tip.y;
                const p1 = {
                    x: top.x + 0.34 * dx,
                    y: top.y + 0.045 * drop
                };
                const p2 = {
                    x: tip.x + 0.035 * dx,
                    y: tip.y + 0.53 * drop
                };
                const half = (a, b) => ({
                    x: (a.x + b.x) * 0.5,
                    y: (a.y + b.y) * 0.5
                });
                const a = half(top, p1), b = half(p1, p2), c = half(p2, tip);
                const d = half(a, b), e = half(b, c), crown = half(d, e);
                // Adjacent cubic pieces are C1-continuous at the crown.
                return [top, a, d, crown, e, c, tip];
            }
            const ovalOuter = makeFrontOvalProfile(bladeTopOuter, doorTipOuter);
            const ovalInner = makeFrontOvalProfile(bladeTopInner, doorTipInner);

            // Two revolute joints: a pin on the curved guide and a mounting
            // pin rigidly attached to the *actual oval door*, SVG-style.
            // The rod length stays constant; its angle is independent of
            // the door's angle so it can articulate freely while following it.
            const cubicPoint = (a, b, c, d, t) => {
                const v = 1 - t;
                return { x: v*v*v*a.x + 3*v*v*t*b.x + 3*v*t*t*c.x + t*t*t*d.x,
                         y: v*v*v*a.y + 3*v*v*t*b.y + 3*v*t*t*c.y + t*t*t*d.y };
            };
            // Fix the moving linkage farther toward the FRONT END of the door,
            // on its last curved section, matching the supplied red outline.
            // The upper guide pin is raised inside the bin; the rod remains
            // freely hinged and its guide follows the solved door motion.
            const leverMountLocal = cubicPoint(
                ovalInner[0], ovalInner[1], ovalInner[2], ovalInner[3], 0.18);
            // Pino da guia alto, junto ao teto; articulação na parte superior
            // frontal da folha, conforme as duas posições da referência SVG.
            const leverPinClosed = {
                x: leverMountLocal.x - 3.20,
                y: leverMountLocal.y + 1.35
            };
            const leverDx = leverMountLocal.x - leverPinClosed.x;
            const leverDy = leverMountLocal.y - leverPinClosed.y;
            const leverLength = Math.hypot(leverDx, leverDy);
            const leverStartAngle = Math.atan2(leverDy, leverDx);

            const latchTopOuter = {
                x: doorTipOuter.x + 0.25,
                y: doorTipOuter.y + 2.65
            };
            const latchTopInner = {
                x: doorTipInner.x + 0.25,
                y: doorTipInner.y + 2.55
            };
            const latchHookIn = {
                x: doorTipInner.x - 0.55 * tx + 0.55 * nx,
                y: doorTipInner.y - 0.55 * ty + 0.55 * ny
            };

            function getDoorAtAngle(angDeg) {
                // The door retains one rigid oval blade. Its carriage travels
                // smoothly while a distinct hinged rod drives the visible pin
                // along a curved locus (rather than welding it to the blade).
                const u = Math.min(1, Math.max(0, angDeg / CONVENTIONAL_DOOR_OPEN_DEG));
                const slideU = u*u*(3 - 2*u);
                const carrier = {
                    x: pvt.x + carriageTravel.x * slideU,
                    y: pvt.y + carriageTravel.y * slideU
                };
                const move = (pt) => {
                    const rotated = rotatePointAroundPivot(pt, pvt, angDeg);
                    return { x: rotated.x + carrier.x - pvt.x,
                             y: rotated.y + carrier.y - pvt.y };
                };
                // Both spherical/revolute joints are evaluated every frame;
                // the pin trajectory is solved from the arm's exact length.
                // The pin follows the raised upper guide while the door tip
                // keeps precisely the original open-stop coordinates.
                const leverMount = move(leverMountLocal);
                // Articulação independente: o braço muda sua inclinação durante
                // a abertura, mantendo exatamente o mesmo comprimento.
                const leverAngle = leverStartAngle
                    + (angDeg * Math.PI / 180) * 0.45;
                const pin = {
                    x: leverMount.x - leverLength * Math.cos(leverAngle),
                    y: leverMount.y - leverLength * Math.sin(leverAngle)
                };
                const bHubL = move(brkHubLeft), bHubB = move(brkHubBot);
                const bJoinT = move(brkJoinTop), bJoinB = move(brkJoinBot);
                const topOut = move(bladeTopOuter), topIn = move(bladeTopInner);
                const midIn = move(bladeMidInner);
                const tip = move(doorTipOuter), tipIn = move(doorTipInner);
                const outCurve = ovalOuter.map(move), inCurve = ovalInner.map(move);
                const lTopOut = move(latchTopOuter), lTopIn = move(latchTopInner);
                const lHook = move(latchHookIn);

                let rightmostX = Math.max(tip.x, topOut.x, tipIn.x);
                let highestY = Math.max(tip.y, topOut.y);
                // Extremes use the SAME cubic elliptical curves rendered below.
                for (const curve of [outCurve, inCurve]) {
                    for (const j of [0, 3]) {
                        const a = curve[j], c1 = curve[j+1], c2 = curve[j+2], b = curve[j+3];
                        for (let i = 0; i <= 24; i++) {
                            const u = i / 24, v = 1 - u;
                            const bx = v*v*v*a.x + 3*v*v*u*c1.x + 3*v*u*u*c2.x + u*u*u*b.x;
                            const by = v*v*v*a.y + 3*v*v*u*c1.y + 3*v*u*u*c2.y + u*u*u*b.y;
                            rightmostX = Math.max(rightmostX, bx);
                            highestY = Math.max(highestY, by);
                        }
                    }
                }
                return { pin, leverMount, leverAngle, leverLength,
                    bHubL, bHubB, bJoinT, bJoinB,
                    topOut, topIn, midIn, tip, tipIn, outCurve, inCurve,
                    lTopOut, lTopIn, lHook, rightmostX, highestY };
            }

            function getDoorAtProgress(progress) {
                const u = Math.max(0, Math.min(1, Number(progress) || 0));
                return getDoorAtAngle(u * CONVENTIONAL_DOOR_OPEN_DEG);
            }

            function getDoorTipPosition(progress) {
                return getDoorAtProgress(progress).tip;
            }
            // Construct the physical guide FROM the joint's actual locus.
            // No separate fixed/circular track can desynchronise from it.
            const railPath = [];
            for (let i = 0; i <= 48; i++)
                railPath.push(getDoorAtProgress(i / 48).pin);
            const railStart = railPath[0], railEnd = railPath[railPath.length - 1];

            // True motion: both the swept fill and the dashed boundary sample
            // exactly these poses, never a fixed-radius or legacy-pivot sector.
            const openLimitDeg = CONVENTIONAL_DOOR_OPEN_DEG;
            const progress = Math.max(0, Math.min(1, state.thetaDeg / openLimitDeg));
            const doorClosed = getDoorAtProgress(0);
            const doorCurr = getDoorAtProgress(progress);
            const doorOpen = getDoorAtProgress(1);
            const trailSteps = Math.max(1, Math.ceil(progress / 0.02));
            const doorTipTrail = [];
            const doorPoseTrail = [];
            for (let i = 0; i <= trailSteps; i++) {
                const sampledProgress = progress * i / trailSteps;
                doorTipTrail.push(getDoorTipPosition(sampledProgress));
                doorPoseTrail.push(getDoorAtProgress(sampledProgress));
            }
            // Derive extrema and peak from the identical translated/rotated
            // profile, including the oval shell and the lower moving tip.
            let peakRightX = -Infinity, peakU = 0;
            for (let i = 0; i <= 100; i++) {
                const sampleU = i / 100;
                const candidate = getDoorAtProgress(sampleU).rightmostX;
                if (candidate > peakRightX) {
                    peakRightX = candidate;
                    peakU = sampleU;
                }
            }
            const thetaPeakDeg = peakU * openLimitDeg;
            const doorPeak = getDoorAtProgress(peakU);

            const doorBulgeBeyondTipMm = doorClosed.rightmostX - doorTipOuter.x;
            const corridorMarginPeakMm = CORRIDOR_LEFT_X - peakRightX; // > 0 = livre, 0 = colado na linha do corredor
            const corridorMarginCurrMm = CORRIDOR_LEFT_X - doorCurr.rightmostX;

            const widthClosedMm = doorClosed.rightmostX - wallX;
            const widthPeakMm = peakRightX - wallX;
            const widthOpenMm = doorOpen.rightmostX - wallX;
            const widthCurrMm = doorCurr.rightmostX - wallX;

            // Vão livre perpendicular à rampa quando totalmente aberta
            const openTipProjN = (doorOpen.tipIn.x - seatedBagBotRight.x) * nx + (doorOpen.tipIn.y - seatedBagBotRight.y) * ny;
            const maxMouthClearOpeningMm = openTipProjN;
            const doorClearanceOverBagMm = openTipProjN - SUITCASE.hMm;

            // Carenagem superior do bolsão 23
            const shroudStart = { x: lugTopLeft.x - 1.5 * tx, y: lugTopLeft.y - 1.5 * ty };
            const shroudStep = { x: shroudStart.x + 3.2 * nx, y: shroudStart.y + 3.2 * ny };
            const shroudEnd = { x: doorOpen.tip.x + 1.8, y: doorOpen.tip.y + 2.2 };
            const shroudCtrl = {
                x: (shroudStep.x + shroudEnd.x) * 0.5 - 2.0,
                y: Math.max(shroudStep.y, shroudEnd.y) + 4.8
            };

            const binTotalHeightMm = Math.max(hornPeak.y, rampTopEnd.y) - baseY;

            return {
                baseY, tiltDeg, wallFix, psuBotCorner,
                boxBotLeft, boxBotRight, boxTopRight, boxTopLeft,
                bagBotLeft, bagBotRight, bagTopLeft, bagTopRight,
                roundedBagPathD, roundedChamberPathD,
                seatedBagBotLeft, seatedBagBotRight, seatedBagTopRight, latchDropBelowBagMm,
                bagSeatedTopLeft, bagWallClearanceMm, bagBaseClearanceMm, doorBulgeBeyondTipMm, targetMaxDoorX,
                maxMouthClearOpeningMm, doorClearanceOverBagMm,
                corridorMarginPeakMm, corridorMarginCurrMm,
                hornPeak, notchValley, notchCtrl, rampTopEnd, fuseTop,
                bellyCtrl, doorLipBot, mouthStepIn, mouthCurveCtrl,
                pvt, railStart, railEnd, railPath, doorTipTrail, doorPoseTrail, getDoorTipPosition,
                lugTopLeft, lugBotRight,
                shroudStart, shroudStep, shroudEnd, shroudCtrl,
                thetaPeakDeg, openLimitDeg,
                doorClosed, doorPeak, doorOpen, doorCurr,
                peakRightX, widthClosedMm, widthPeakMm, widthOpenMm, widthCurrMm,
                binTotalHeightMm, tx, ty, nx, ny
            };
        }

        // Busca exata da Altura Y_esq que deixa o Bin o mais próximo possível da linha do corredor (X = -24,50 mm)
        
function alphaTransformPoint(fx, fy, thetaDeg) {
            // arquivo -> CAD (melhor encaixe na fuselagem) e depois rotação em torno do centro da fuselagem
            const A = ALPHA_FIXED;
            const x0 = A.scaleX * fx + A.tx;
            const y0 = A.scaleY * fy + A.ty;
            const cy = -CABIN_YC;
            const th = thetaDeg * Math.PI / 180.0;
            const c = Math.cos(th), s = Math.sin(th);
            return {
                x: (x0) * c - (y0 - cy) * s,
                ys: cy + (x0) * s + (y0 - cy) * c   // y no sistema do SVG (para baixo)
            };
        }

        // Parte de baixo do bin (face inferior = "chão do bin"): do fim do raio do canto até o pé, no contorno amostrado
        const ALPHA_UNDERSIDE = ALPHA_OUTLINE.filter(p => p[0] >= 1354 && p[0] <= 14462 && p[1] >= 18690);

        function alphaFloorHighPoint(thetaDeg) {
            // ponto mais alto do chão do bin (menor y no SVG)
            let best = null;
            for (const p of ALPHA_UNDERSIDE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (best === null || q.ys < best.ys) best = q;
            }
            return { x: best.x, y: -best.ys };
        }

        function alphaExtremeYAtTheta(thetaDeg, kind) {
            // 'floor' = chão do bin no ponto mais alto ; 'base' = ponto mais baixo ; 'top' = ponto mais alto (Y CAD, distância do chão da cabine)
            if (kind === 'floor') return alphaFloorHighPoint(thetaDeg).y;
            let maxYs = -Infinity, minYs = Infinity;
            for (const p of ALPHA_OUTLINE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (q.ys > maxYs) maxYs = q.ys;
                if (q.ys < minYs) minYs = q.ys;
            }
            return kind === 'top' ? -minYs : -maxYs;
        }

        function solveAlphaTheta(targetY, kind) {
            // Y diminui quando theta aumenta (horário no SVG); bisseção
            let lo = (kind === 'top') ? -9 : (kind === 'floor') ? -20 : -15, hi = 30;   // faixa onde Y é monotônico
            for (let i = 0; i < 50; i++) {
                const mid = (lo + hi) / 2;
                if (alphaExtremeYAtTheta(mid, kind) > targetY) lo = mid; else hi = mid;
            }
            return (lo + hi) / 2;
        }

        function computeRightAlphaLocked() {
            const A = ALPHA_FIXED;
            const thetaDeg = solveAlphaTheta(state.alphaTargetY, state.alphaMode);
            let minX = Infinity, maxX = -Infinity, minYs = Infinity, maxYs = -Infinity;
            for (const p of ALPHA_OUTLINE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (q.x < minX) minX = q.x;
                if (q.x > maxX) maxX = q.x;
                if (q.ys < minYs) minYs = q.ys;
                if (q.ys > maxYs) maxYs = q.ys;
            }
            const wall = alphaTransformPoint(A.wallFix.fx, A.wallFix.fy, thetaDeg);
            const top = alphaTransformPoint(A.topFuse.fx, A.topFuse.fy, thetaDeg);
            const floorHigh = alphaFloorHighPoint(thetaDeg);
            return {
                thetaDeg,
                floorHighX: floorHigh.x,
                floorHighY: floorHigh.y,
                baseY: -maxYs,
                topY: -minYs,
                widthMm: maxX - minX,
                heightMm: maxYs - minYs,
                leftFaceX: minX,
                wallRightX: wall.x,
                wallY: -wall.ys,
                topFuseX: top.x,
                topFuseY: -top.ys
            };
        }

        // Geometria CAD única do ALPHA: os pontos do piso são extraídos do
        // mesmo contorno usado pela aba 5, sem reconstituir um bin aproximado.
        window.getUniAlphaGeometry = () => {
            state.alphaMode = 'floor';
            state.alphaTargetY = 148.70;
            const alpha = computeRightAlphaLocked();
            const floorPts = ALPHA_OUTLINE
                .filter(p => p[0] >= 1354 && p[0] <= 19007 && p[1] >= 18690)
                .map(p => {
                    const q = alphaTransformPoint(p[0], p[1], alpha.thetaDeg);
                    return { x: q.x, y: -q.ys };
                })
                .sort((a, b) => a.x - b.x);
            return { ...alpha, floorPts };
        };





        
const ALPHA_DOOR_FRACTION = 0.6;
        const ALPHA_TRACK = [[983.6, 18177.0], [934.5, 17988.6], [921.6, 17883.4], [908.6, 17755.0], [895.6, 17603.3], [894.3, 17440.8], [893.4, 17278.2], [893.0, 17115.7], [893.0, 16953.1], [893.3, 16790.5], [893.8, 16627.9], [894.5, 16465.4], [895.4, 16302.8], [896.4, 16140.2], [897.5, 15977.7], [898.7, 15815.1], [899.9, 15652.5], [901.1, 15490.0], [902.3, 15327.4], [903.5, 15164.8], [904.5, 15002.3], [905.1, 14839.7], [905.5, 14677.2], [905.7, 14514.6], [905.7, 14352.0], [905.5, 14189.5], [905.2, 14026.9], [905.0, 13864.3], [905.0, 13701.8], [905.2, 13539.2], [905.5, 13376.6], [906.0, 13214.1], [906.8, 13051.5], [907.7, 12888.9], [908.8, 12726.4], [910.1, 12563.8], [911.7, 12401.2], [913.6, 12238.7], [915.7, 12076.1], [918.1, 11913.6], [921.0, 11751.1], [925.7, 11588.6], [935.3, 11426.8], [952.1, 11266.5], [978.2, 11108.4], [1015.3, 10953.6], [1064.7, 10803.1], [1127.3, 10657.6], [1203.0, 10518.3], [1289.7, 10385.5], [1385.8, 10259.7], [1490.2, 10141.0], [1602.1, 10029.8], [1720.6, 9926.5], [1845.5, 9831.6], [1976.0, 9745.7], [2111.9, 9669.5], [2252.5, 9603.7], [2397.3, 9549.4], [2545.6, 9506.9], [2696.6, 9475.1], [2849.7, 9452.7], [3004.1, 9438.0], [3159.3, 9429.5], [3315.0, 9425.1], [3470.8, 9422.9], [3626.6, 9421.3], [3782.4, 9420.1], [3938.2, 9419.2], [4094.0, 9418.5], [4249.8, 9418.1], [4405.6, 9418.0], [4561.5, 9418.0], [4717.3, 9418.3], [4873.1, 9418.7], [5028.9, 9419.4], [5184.7, 9420.1], [5340.5, 9421.1], [5496.3, 9422.2], [5652.1, 9423.5], [5807.9, 9424.9], [5963.7, 9426.5], [6119.5, 9428.2], [6275.3, 9430.2], [6431.1, 9432.4], [6586.9, 9434.9], [6742.3, 9440.0], [6896.2, 9453.2], [7048.7, 9474.5], [7199.4, 9504.3], [7348.4, 9542.8], [7495.5, 9590.1], [7640.7, 9646.4], [7784.3, 9709.5], [7927.2, 9774.1], [8069.5, 9840.3], [8211.2, 9907.7], [8352.4, 9976.4], [8493.1, 10046.2], [8633.3, 10117.1], [8773.1, 10188.9], [8912.4, 10261.7], [9051.3, 10335.4], [9189.8, 10409.9], [9327.8, 10485.1], [9465.5, 10561.2], [9602.9, 10637.9], [9739.9, 10715.4], [9876.5, 10793.6], [10012.7, 10872.4], [10148.7, 10951.9], [10284.2, 11031.9], [10419.5, 11112.6], [10554.4, 11193.9], [10689.0, 11275.8], [10823.3, 11358.2], [10957.3, 11441.2], [11090.9, 11524.8], [11224.2, 11608.9], [11357.2, 11693.6], [11489.9, 11778.9], [11622.2, 11864.7], [11754.2, 11951.1], [11885.8, 12038.1], [12017.1, 12125.7], [12147.9, 12213.9], [12278.4, 12302.8], [12408.4, 12392.3], [12538.0, 12482.5], [12667.1, 12573.5], [12795.7, 12665.3], [12923.7, 12758.0], [13051.1, 12851.6], [13177.7, 12946.3], [13303.4, 13042.3], [13428.1, 13139.7], [13551.2, 13239.1], [13656.3, 13325.1], [13743.3, 13397.3], [13914.6, 13545.5]];
        const ALPHA_TRACK_CUM = (() => {
            const c = [0];
            for (let i = 1; i < ALPHA_TRACK.length; i++) {
                c.push(c[i - 1] + Math.hypot(
                    (ALPHA_TRACK[i][0] - ALPHA_TRACK[i - 1][0]) * ALPHA_FIXED.scaleX,
                    (ALPHA_TRACK[i][1] - ALPHA_TRACK[i - 1][1]) * ALPHA_FIXED.scaleY));
            }
            return c;
        })();
        const ALPHA_TRACK_LEN = ALPHA_TRACK_CUM[ALPHA_TRACK_CUM.length - 1];

        function alphaTrackPointAt(sLen) {
            const sc = Math.min(ALPHA_TRACK_LEN, Math.max(0, sLen));
            let k = 1;
            while (k < ALPHA_TRACK_CUM.length - 1 && ALPHA_TRACK_CUM[k] < sc) k++;
            const s0 = ALPHA_TRACK_CUM[k - 1], s1 = ALPHA_TRACK_CUM[k];
            const t = s1 > s0 ? (sc - s0) / (s1 - s0) : 0;
            return [
                ALPHA_TRACK[k - 1][0] + t * (ALPHA_TRACK[k][0] - ALPHA_TRACK[k - 1][0]),
                ALPHA_TRACK[k - 1][1] + t * (ALPHA_TRACK[k][1] - ALPHA_TRACK[k - 1][1]),
                k
            ];
        }

        
const ALPHA_SOURCE_INNER = "M4718.42 9485.38c-214.12,0.81 -429.94,2.25 -641.83,4.41l352.14 -29.41 289.69 25zm2127.97 9324.57c173.23,20.07 4783.24,1463.75 7441.85,2269.76 269.04,81.57 231.16,66 285.96,-107.54 867.87,-2748.09 1097.41,-3491.21 1673.7,-5248.79 9.74,-29.73 8.13,-61.42 -43.87,-76.53 -3492.18,-1015.29 -5023.73,-1471.38 -8593.64,-2591.56 -298.02,-93.51 -290.91,-64.93 -279.93,-201.23 19.85,-246.45 151.82,-1535.56 254.98,-2560.26 1.48,-14.72 22.96,-108.98 -36.07,-111.59 -832.99,-36.88 -1440.65,-102.86 -2879.76,-226.66 0,0 5.86,-158.31 5.86,-158.31 8.83,-4.76 1771.35,140.94 2600.82,208.54 0,0 300.69,24.27 389.9,31.35 109.36,8.67 74.66,-29.11 71,174.4 -34.48,504.83 -182.03,2096.64 -232.75,2587.73 -4.75,46.04 36.17,45.22 106.54,65.92 1478.53,434.84 6375.86,1955.86 8715.62,2705.53 52.81,16.93 49.9,85.26 45.52,100.98 -733.13,2632.17 -1148.1,3891.36 -1703.23,5603.79 -31.63,97.59 -83.68,127.7 -151.76,98.03 -1555.27,-677.82 -7558.09,-2410.61 -7736.53,-2430.98 -1417.28,-161.82 -3663.67,-335.71 -6042.78,-517.78 -13.85,-1.06 -14.42,-118.86 -15.94,-135.27l108.03 -0.5c3195.42,265.29 4073.69,295.85 6016.48,520.97z";
const ALPHA_LOWER_TRIANGLE = "M14961.99 20758.65c-85.66,309.78 -127.08,449.15 360.07,447.47 1362.33,-4.67 2677.83,-3.44 3513.63,0.33 172.07,0.78 116.56,12.2 736.9,-266.11 705.95,-316.68 688.93,-298.46 270.73,-866.8 -233.47,-317.27 -642.53,-992.86 -1173.19,-1641.87 -739.72,-904.66 -1116,-1320.04 -1917,-2193.68 -120.31,-131.22 -283.21,-194.03 -391.35,31.97 -314.52,657.26 -1345.16,4291.15 -1399.79,4488.69z";
const ALPHA_UPPER_DETAIL = "M1027.50 7728.56c-16,119.92 -18.41,1194.82 -15.03,1296.15 3.03,90.69 5.13,197.82 245.31,203.09 1524.04,33.41 1656.84,12.16 4148.17,-19.87 357.22,-4.59 220.49,-358.68 -1.78,-428.79 -684.77,-216.07 -1461.52,-476.13 -4182.27,-1174.08 -115.02,-29.5 -188.87,67.22 -194.4,123.5z";
const ALPHA_SOURCE_RAIL = "M2882.1 9351.24c1471.11,-22.74 4303.84,34.27 4303.84,34.27 1742.73,656.48 5627.94,3009.22 6802.31,4120.07 175.53,166.05 14.14,240.82 -147.23,79.85 -507.4,-506.07 -3977.45,-3048.69 -6694.76,-4074.36 -59.29,-22.4 -2723.79,-46.73 -4233.04,0.86 -1154.02,36.42 -1896.4,1192.08 -1896.4,1783.58 0,1746.41 -59.63,5060.41 -38.39,6756.2 1.76,141.04 -3.99,215.54 10.42,250.67 0,0 -158.94,-13.4 -158.94,-13.4 -37.94,-1107.33 -8.39,-2118.83 -6.04,-3681.79 0,-8.97 -53.02,-2138.4 27.41,-3461.37 50.33,-827.95 1110.61,-1780.35 2030.82,-1794.58z";
const clamp = n => Math.max(0, Math.min(1, n));
const color = { conventional: APHA_CABIN_PALETTE.neutral, alpha: APHA_CABIN_PALETTE.mid,
                underside: APHA_CABIN_PALETTE.muted, border: APHA_CABIN_PALETTE.binOutline,
                cavity: APHA_CABIN_PALETTE.binCavity };
// Single CAD styling source for the Alpha body in tabs 5 and 6.
// Keep the exact SVG paths; do not replace them with generic rectangles.
const ALPHA_CAD_STYLE = Object.freeze({
    shell: 'rgba(74, 144, 226, 0.45)',
    shellAt: opacity => `rgba(74, 144, 226, ${Math.max(0, Math.min(1, opacity))})`,
    outline: '#4a90e2',
    inner: '#2a6fc9',
    innerWash: 'rgba(74, 144, 226, 0.16)'
});
function paintPath(ctx, d, fill, stroke, lw, evenodd) {
    const p = new Path2D(d);
    if (fill) { ctx.fillStyle = fill; ctx.fill(p, evenodd ? 'evenodd' : 'nonzero'); }
    if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(p); }
}
// A folga até a cabeça usa os mesmos perfis CAD em centímetros da renderização.
// A interseção vertical encontra a face inferior efetiva em cada assento,
// sem recorrer aos vetores aproximados da versão anterior dos bins.
let referenceBinUndersides = { conventional: [], alpha: [] };
function lowerBinSurfaceAtX(points, x) {
    if (!Number.isFinite(x) || !points || points.length < 2) return null;
    let lower = Infinity;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
        if (Math.abs(b.x - a.x) < 1e-9) {
            lower = Math.min(lower, a.y, b.y);
        } else {
            const t = (x - a.x) / (b.x - a.x);
            lower = Math.min(lower, a.y + t * (b.y - a.y));
        }
    }
    return Number.isFinite(lower) ? lower : null;
}
// Guarda os controles originais da curva inferior (quadrática) para que
// a cota coincida com o CAD, sem erro de discretização dos 100 segmentos.
let referenceConventionalBelly = null;
function exactConventionalUndersideY(x) {
    if (!Number.isFinite(x) || !referenceConventionalBelly) return null;
    // Intersecta a vertical da cabeça com as curvas cúbicas efetivamente
    // desenhadas no casco convencional (inclusive a barriga inferior).
    const cubics = referenceConventionalBelly.cubics;
    if (!cubics || !cubics.length) return null;
    const candidates = [];
    const bez = (a, b, c, d, t, axis) => {
        const u = 1-t;
        return u*u*u*a[axis] + 3*u*u*t*b[axis] + 3*u*t*t*c[axis] + t*t*t*d[axis];
    };
    for (const [p0, p1, p2, p3] of cubics) {
        const A = -p0.x + 3*p1.x - 3*p2.x + p3.x;
        const B = 3*p0.x - 6*p1.x + 3*p2.x;
        const C = 3*(p1.x - p0.x);
        // Dividir por extremos em X garante intervalos monotônicos da Bézier.
        const stops = [0, 1];
        const qa = 3*A, qb = 2*B, qc = C;
        if (Math.abs(qa) < 1e-12) {
            if (Math.abs(qb) > 1e-12) stops.push(-qc/qb);
        } else {
            const disc = qb*qb - 4*qa*qc;
            if (disc >= 0) {
                stops.push((-qb-Math.sqrt(disc))/(2*qa));
                stops.push((-qb+Math.sqrt(disc))/(2*qa));
            }
        }
        const ts = [...new Set(stops.filter(t => t >= 0 && t <= 1))].sort((a,b) => a-b);
        for (let i=1; i<ts.length; i++) {
            let lo=ts[i-1], hi=ts[i];
            const xl=bez(p0,p1,p2,p3,lo,'x'), xh=bez(p0,p1,p2,p3,hi,'x');
            if (x < Math.min(xl,xh)-1e-7 || x > Math.max(xl,xh)+1e-7) continue;
            const ascending = xh >= xl;
            for (let j=0; j<48; j++) {
                const mid=(lo+hi)/2;
                if ((bez(p0,p1,p2,p3,mid,'x') < x) === ascending) lo=mid;
                else hi=mid;
            }
            candidates.push(bez(p0,p1,p2,p3,(lo+hi)/2,'y'));
        }
    }
    return candidates.length ? Math.min(...candidates) : null;
}
window.getUniBinUndersideY = (x, isAlpha) =>
    isAlpha ? lowerBinSurfaceAtX(referenceBinUndersides.alpha, x) : exactConventionalUndersideY(x);

function drawReferenceBins(ctx, W, H, fadeConv, fadeAlpha, overrideDoorU) {
    const cabin = window.cabinSectionReference;
    if (!cabin) return;
    // A aba 6 move a porta independentemente, sem alterar a aba 5.
    const map = cabin.map(W, H);
    const u = clamp(Number(overrideDoorU == null ? window.__uniRefDoorProgress : overrideDoorU) || 0);
    state.leftBaseY = 138.50;
    state.alphaMode = 'floor';
    state.alphaTargetY = 148.70;
    state.alphaDoorU = u;
    state.bagInsertPct = 100;
    state.thetaDeg = 0;
    const initialConv = computeLeftBinAtY(state.leftBaseY);
    // O intradorso de medição será capturado do Path2D cúbico realmente desenhado.
    referenceConventionalBelly = null;
    state.thetaDeg = u * initialConv.openLimitDeg;
    const conventional = computeLeftBinAtY(state.leftBaseY);
    const alpha = computeRightAlphaLocked();

    // Perfil fechado do convencional: base reta + barriga quadrática até a boca.
    // Perfil ALPHA: contorno externo amostrado do SVG, com escala e rotação reais.
    // São atualizados a cada render, inclusive quando mudarem parâmetros CAD.
    const convBottom = [initialConv.wallFix, initialConv.psuBotCorner];
    for (let i = 1; i <= 100; i++) {
        const t = i / 100, v = 1 - t;
        const p0 = initialConv.psuBotCorner, p1 = initialConv.bellyCtrl, p2 = initialConv.doorLipBot;
        convBottom.push({
            x: v*v*p0.x + 2*v*t*p1.x + t*t*p2.x,
            y: v*v*p0.y + 2*v*t*p1.y + t*t*p2.y
        });
    }
    convBottom.push(initialConv.doorClosed.tip);
    referenceBinUndersides = {
        conventional: convBottom,
        alpha: ALPHA_OUTLINE.map(p => {
            const q = alphaTransformPoint(p[0], p[1], alpha.thetaDeg);
            return { x: q.x, y: -q.ys };
        })
    };

    // Original CAD SVG has downward-positive Y. Map to existing Tab 5 cabin.
    ctx.save();
    ctx.translate(map.toX(0), map.toY(0));
    ctx.scale(map.scale, map.scale);


    if (fadeConv > 0.001) {
        // Conventional bin replaced with the geometry and pivoted-door mechanism
        // from bin_aeronave_simples.html (fixed CAD dimensions in centimetres).
        ctx.save();
        ctx.globalAlpha *= clamp(fadeConv);
        const R = 137, CY = 63, bottomY = 138.50, floorY = 153.04;
        const wallX = -Math.sqrt(R*R-(bottomY-CY)**2);
        const src = {x0:8322.484375, y1:21044.689453125,
                     xr:34924.74609375, yTip:15503};
        const sx = 89.94/(src.xr-src.x0);
        const sy = (floorY-bottomY)/(src.y1-src.yTip);
        const tx0 = wallX-sx*src.x0, ty0 = -bottomY-sy*src.y1;
        const W = p => ({x:tx0+sx*p[0], y:-(ty0+sy*p[1])});
        const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        const bez = (a,b,c,d,t) => {
            const v=1-t;
            return {x:v*v*v*a.x+3*v*v*t*b.x+3*v*t*t*c.x+t*t*t*d.x,
                    y:v*v*v*a.y+3*v*v*t*b.y+3*v*t*t*c.y+t*t*t*d.y};
        };
        const P0=[31351.74,17756.88];
        const B1=[35439.76,15651.22],B2=[34920.23,14193.14],B3=[34102.58,10805.54];
        const dt=.713, a01=mix(P0,B1,dt),a12=mix(B1,B2,dt),a23=mix(B2,B3,dt);
        const a012=mix(a01,a12,dt),a123=mix(a12,a23,dt),dd=mix(a012,a123,dt);
        const D=W(dd),S={x:-49.5,y:CY+Math.sqrt(R*R-49.5*49.5)};
        const w1=W(a012),w2=W(a123),vv=Math.hypot(w2.x-w1.x,w2.y-w1.y);
        const tangent={x:(w2.x-w1.x)/vv,y:(w2.y-w1.y)/vv};
        const L=Math.hypot(S.x-D.x,S.y-D.y),th=-1.47*Math.PI/180;
        const c1={x:D.x+tangent.x*.267*L,y:D.y+tangent.y*.267*L};
        const c2={x:S.x+Math.cos(th)*.487*L,y:S.y-Math.sin(th)*.487*L};
        const bottom0=W([8325.33,20728.07]);
        const edge=[];
        const e0=W(P0),e1=W(a01),e2=W(a012);
        for(let k=0;k<=90;k++)edge.push(bez(e0,e1,e2,D,k/90));
        for(let k=1;k<=140;k++)edge.push(bez(D,c1,c2,S,k/140));
        const cumulative=[0];
        let outermost=0;
        for(let i=1;i<edge.length;i++){
            cumulative.push(cumulative[i-1]+Math.hypot(edge[i].x-edge[i-1].x,edge[i].y-edge[i-1].y));
            if(edge[i].x>edge[outermost].x)outermost=i;
        }
        const sample=dist=>{
            dist=Math.max(0,Math.min(cumulative[cumulative.length-1],dist));
            let i=1;while(i<cumulative.length-1&&cumulative[i]<dist)i++;
            const f=(dist-cumulative[i-1])/Math.max(1e-9,cumulative[i]-cumulative[i-1]);
            const dx=edge[i].x-edge[i-1].x,dy=edge[i].y-edge[i-1].y;
            const mag=Math.hypot(dx,dy)||1;
            return {p:{x:edge[i-1].x+dx*f,y:edge[i-1].y+dy*f},
                    n:{x:dy/mag,y:-dx/mag}};
        };
        const start=Math.max(0,cumulative[outermost]-4);
        const end=Math.min(cumulative[cumulative.length-1],start+38);
        const N=Math.max(4,Math.round((end-start)/.4));
        const ext=[],inner=[],norm=[];
        const offset=Math.max(0,89.94-(edge[outermost].x-wallX));
        for(let k=0;k<=N;k++){
            const a=sample(start+(end-start)*k/N),q=a.n;
            const o={x:a.p.x+offset*q.x,y:a.p.y+offset*q.y};
            ext.push(o);norm.push(q);
            inner.push({x:o.x-1.2*q.x,y:o.y-1.2*q.y});
        }
        const pivot={x:ext[N].x-2.4*norm[N].x,y:ext[N].y-2.4*norm[N].y};
        const turn=(p,angle)=>{
            const r=angle*Math.PI/180,c=Math.cos(r),si=Math.sin(r),dx=p.x-pivot.x,dy=p.y-pivot.y;
            return {x:pivot.x+dx*c-dy*si,y:pivot.y+dx*si+dy*c};
        };
        const polyPath=pts=>{
            const p=new Path2D();pts.forEach((v,i)=>i?p.lineTo(v.x,-v.y):p.moveTo(v.x,-v.y));
            p.closePath();return p;
        };
        // Exact reference shell: lower cubic floor, continuous fuselage arc and oval front.
        const shell=new Path2D();
        const Ep={x:-Math.sqrt(Math.max(0,R*R-(bottom0.y-CY)**2)),y:bottom0.y};
        shell.moveTo(Ep.x,-Ep.y);
        const cB1=W([8570.39,21313.78]),cB2=W([19845.34,20898.17]),bEnd=W([20243.48,20945.80]);
        const cC1=W([21136.70,21052.74]),cC2=W([30508.64,18191.16]);
        shell.bezierCurveTo(cB1.x,-cB1.y,cB2.x,-cB2.y,bEnd.x,-bEnd.y);
        shell.bezierCurveTo(cC1.x,-cC1.y,cC2.x,-cC2.y,e0.x,-e0.y);
        shell.bezierCurveTo(e1.x,-e1.y,e2.x,-e2.y,D.x,-D.y);
        shell.bezierCurveTo(c1.x,-c1.y,c2.x,-c2.y,S.x,-S.y);
        // A cota de headroom usa exatamente estas quatro curvas cúbicas do
        // intradorso desenhado, não a curva quadrática do bin legado.
        referenceConventionalBelly = { cubics: [
            [Ep,cB1,cB2,bEnd], [bEnd,cC1,cC2,e0],
            [e0,e1,e2,D], [D,c1,c2,S]
        ] };
        // Return along the aircraft's circular shell.
        const angS=Math.atan2(-S.y+CY,S.x),angE=Math.atan2(-Ep.y+CY,Ep.x);
        const sweep=angE-angS;
        for(let j=1;j<=70;j++){
            const angle=angS+sweep*j/70;
            shell.lineTo(R*Math.cos(angle),-(CY-R*Math.sin(angle)));
        }
        shell.closePath();
        const blade=polyPath(ext.concat(inner.slice().reverse()));
        // Remove closed-door leaf region from shell, making the interior visible as it opens.
        const cavity=new Path2D();
        cavity.addPath(shell);cavity.addPath(blade);
        ctx.fillStyle='#9ba9b5';
        ctx.fill(cavity,'evenodd');
        ctx.strokeStyle='#273e57';ctx.lineWidth=.55;ctx.stroke(shell);
        const max=82;
        const angle=u*max;
        const poses=ext.map(p=>turn(p,angle)),ins=inner.map(p=>turn(p,angle));
        if(overrideDoorU==null&&u>0){
            const sweepPath=new Path2D();
            for(let j=0;j<=Math.ceil(angle);j++){
                const a=angle*j/Math.max(1,Math.ceil(angle));
                sweepPath.addPath(polyPath(ext.map(p=>turn(p,a)).concat(inner.map(p=>turn(p,a)).reverse())));
            }
            ctx.save();ctx.fillStyle='rgba(255,107,0,.16)';ctx.fill(sweepPath);
            const t0={x:(ext[0].x+inner[0].x)/2,y:(ext[0].y+inner[0].y)/2};
            ctx.beginPath();
            for(let j=0;j<=55;j++){const p=turn(t0,angle*j/55);j?ctx.lineTo(p.x,-p.y):ctx.moveTo(p.x,-p.y);}
            ctx.strokeStyle='#FE6B00';ctx.lineWidth=.7;ctx.setLineDash([.9,1.1]);ctx.stroke();
            ctx.restore();
        }
        // Curved laminate, latch and rigid arm rotate together around the upper pivot.
        const armEnd=inner[Math.max(0,N-Math.round(7/.4))];
        ctx.save();ctx.translate(pivot.x,-pivot.y);ctx.rotate(-angle*Math.PI/180);
        ctx.translate(-pivot.x,pivot.y);
        const arm=new Path2D();
        arm.moveTo(pivot.x,-pivot.y);arm.lineTo(armEnd.x,-armEnd.y);
        ctx.strokeStyle='#373435';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.stroke(arm);
        ctx.strokeStyle='#7A75B5';ctx.lineWidth=1.8;ctx.stroke(arm);
        ctx.fillStyle='#aebecb';ctx.strokeStyle='#273e57';ctx.lineWidth=.4;
        ctx.fill(blade);ctx.stroke(blade);
        const latch=polyPath(ext.slice(0,7).concat(inner.slice(0,7).reverse()));
        ctx.fillStyle='#72869e';ctx.fill(latch);ctx.stroke(latch);
        ctx.restore();
        ctx.beginPath();ctx.arc(pivot.x,-pivot.y,1.08,0,2*Math.PI);
        ctx.fillStyle='#b9c9e0';ctx.fill();ctx.lineWidth=.4;ctx.strokeStyle='#373435';ctx.stroke();
        ctx.beginPath();ctx.arc(pivot.x,-pivot.y,.38,0,2*Math.PI);ctx.fillStyle='#1e293b';ctx.fill();
        ctx.restore();
    }

    if (fadeAlpha > 0.001) {
        ctx.save(); ctx.globalAlpha *= clamp(fadeAlpha);
        ctx.translate(0, -CABIN_YC);
        ctx.rotate(alpha.thetaDeg * Math.PI / 180);
        ctx.translate(0, CABIN_YC);
        ctx.translate(ALPHA_FIXED.tx, ALPHA_FIXED.ty);
        ctx.scale(ALPHA_FIXED.scaleX, ALPHA_FIXED.scaleY);
        // Contorno CAD único e vazados estruturais preservados nas Abas 5 e 6.
        const alphaShell = new Path2D();
        ALPHA_OUTLINE.forEach((p, i) => i ? alphaShell.lineTo(p[0], p[1]) : alphaShell.moveTo(p[0], p[1]));
        alphaShell.closePath();
        // Mesmo corpo, recortes, preenchimento e borda nas Abas 5 e 6.
        // A diferença entre as abas é somente o tempo da porta e a telemetria.
        {
            // Os triângulos são subpaths de recorte reais: a malha azul-escura
            // da cabine aparece através deles, sem apagar a fuselagem de fundo.
            const alphaWithCutouts = new Path2D(alphaShell);
            alphaWithCutouts.addPath(new Path2D(ALPHA_UPPER_DETAIL));
            alphaWithCutouts.addPath(new Path2D(ALPHA_LOWER_TRIANGLE));
            ctx.save();
            ctx.clip(alphaShell);
            // Aba 5: corpo mais visível (0.75). Aba 6: semitransparente (0.45).
            // A ponte atualiza a opacidade progressivamente sem modificar o SVG.
            const bodyOpacity = Number.isFinite(window.__aphaAlphaBodyOpacity)
                ? window.__aphaAlphaBodyOpacity
                : (overrideDoorU == null ? 0.75 : 0.45);
            ctx.fillStyle = ALPHA_CAD_STYLE.shellAt(bodyOpacity);
            ctx.fill(alphaWithCutouts, 'evenodd');
            ctx.restore();
            // Escurecimento progressivo da cavidade quando a persiana recolhe:
            // preserva os recortes reais e reforça apenas a borda estrutural.
            if (u > 0.001) {
                ctx.save();
                ctx.clip(alphaShell);
                // A cavidade aberta é sombreada levemente, não coberta por uma
                // máscara opaca que esconderia o conteúdo atrás da parede.
                ctx.fillStyle = APHA_CABIN_PALETTE.rgba('darkOutline', 0.18 * u);
                ctx.fill(alphaWithCutouts, 'evenodd');
                ctx.restore();
            }
            ctx.lineWidth = 105 + 250 * u;
            ctx.strokeStyle = ALPHA_CAD_STYLE.outline;
            ctx.stroke(alphaShell);
            // Somente bordas finas dos vazados; nenhum preenchimento opaco.
            paintPath(ctx, ALPHA_UPPER_DETAIL, null, 'rgba(39,62,87,0.75)', 70);
            ctx.beginPath();
            ctx.moveTo(2882.10, 9351.24);
            ctx.bezierCurveTo(4353.21, 9328.50, 7185.94, 9385.51, 7185.94, 9385.51);
            ctx.lineWidth = 78; ctx.strokeStyle = '#8298b2'; ctx.stroke();
            // Interior escalonado: reutiliza os paths SVG originais, não linhas
            // aproximadas. Primeiro o preenchimento translúcido da parede,
            // depois o perfil em escada em azul mais escuro, sempre recortado
            // dentro do contorno externo para não criar resíduos visuais.
            ctx.save();
            ctx.clip(alphaShell);
            paintPath(ctx, ALPHA_SOURCE_RAIL,
                ALPHA_CAD_STYLE.innerWash, ALPHA_CAD_STYLE.inner, 120);
            paintPath(ctx, ALPHA_SOURCE_INNER,
                null, ALPHA_CAD_STYLE.inner, 95);
            ctx.restore();
            ctx.beginPath();
            ALPHA_TRACK.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
            ctx.lineWidth = 155; ctx.strokeStyle = '#8DD7FF'; ctx.stroke();
            // Triângulo inferior direito também realmente vazado.
            paintPath(ctx, ALPHA_LOWER_TRIANGLE, null, 'rgba(39,62,87,0.75)', 85);
        }
        // Porta rolante compartilhada pelas abas 5 e 6, acompanhando
        // o trilho curvo existente sem alterar os vazados estruturais.
        // Door occupies 60% of the sampled curved track and never leaves its ends.
        const doorLen = ALPHA_TRACK_LEN * ALPHA_DOOR_FRACTION;
        const start = u * (ALPHA_TRACK_LEN - doorLen), end = start + doorLen;
        const a = alphaTrackPointAt(start), b = alphaTrackPointAt(end);
        const pts = [[a[0], a[1]]];
        for (let i = a[2]; i < b[2]; i++) {
            if (ALPHA_TRACK_CUM[i] > start && ALPHA_TRACK_CUM[i] < end) pts.push(ALPHA_TRACK[i]);
        }
        pts.push([b[0], b[1]]);
        // Visual opening envelope follows the exact section vacated by the door.
        // The closed frontal surface stays semi-opaque; opening reveals the shell.
        if (start > 0.001) {
            ctx.save();
            ctx.clip(alphaShell);
            ctx.beginPath();
            const freeSamples = Math.max(12, Math.ceil(start / 120));
            for (let i = 0; i <= freeSamples; i++) {
                const p = alphaTrackPointAt(start * i / freeSamples);
                i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
            }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            // The pale opened region exposes structure without painting an opaque face.
            ctx.strokeStyle = 'rgba(5, 14, 32,' + (0.42 + 0.5 * u).toFixed(3) + ')';
            ctx.lineWidth = 1100;
            ctx.stroke();
            ctx.restore();
        }
        ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]));
        ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
        {
            // Porta tambour compartilhada: somente a porta recebe o laranja,
            // sem recolorir o trilho, a fuselagem, a cabine ou as malas.
            // A exceção à paleta fica ativa apenas durante o desenho das lâminas.
            const previousTambourOrange = window.__aphaTambourOrange;
            window.__aphaTambourOrange = true;
            try {
                ctx.lineWidth = 610; ctx.strokeStyle = '#B84A16'; ctx.stroke();
                ctx.lineWidth = 505; ctx.strokeStyle = '#FF8A45'; ctx.stroke();
                ctx.lineWidth = 380; ctx.strokeStyle = '#FF6B1A'; ctx.stroke();
                for (let d = start + 260; d < end - 240; d += 420) {
                    const pt = alphaTrackPointAt(d);
                    const prev = alphaTrackPointAt(Math.max(start, d - 50));
                    const next = alphaTrackPointAt(Math.min(end, d + 50));
                    const dx = next[0] - prev[0], dy = next[1] - prev[1];
                    const length = Math.hypot(dx, dy);
                    if (length < 0.001) continue;
                    const nx = -dy / length, ny = dx / length;
                    ctx.beginPath();
                    ctx.moveTo(pt[0] - nx * 242, pt[1] - ny * 242);
                    ctx.lineTo(pt[0] + nx * 242, pt[1] + ny * 242);
                    ctx.lineWidth = 75;
                    ctx.strokeStyle = '#A43D12';
                    ctx.stroke();
                }
            } finally {
                window.__aphaTambourOrange = previousTambourOrange;
            }
        }
        if (overrideDoorU == null) {
            // High-contrast leading grip sits on the actual moving door endpoint.
            const grip = alphaTrackPointAt(start);
            ctx.save();
            ctx.beginPath(); ctx.arc(grip[0], grip[1], 295, 0, Math.PI * 2);
            ctx.fillStyle = '#e4f6ff'; ctx.fill();
            ctx.lineWidth = 115; ctx.strokeStyle = '#0a2b46'; ctx.stroke();
            ctx.beginPath(); ctx.arc(grip[0], grip[1], 115, 0, Math.PI * 2);
            ctx.fillStyle = '#2185c0'; ctx.fill();
            ctx.restore();

            // Orange dashes are revealed ONLY along the now-clear opening,
            // never along the fixed upper track or beneath the retracted slats.
            if (start > 0.001) {
                ctx.save(); ctx.clip(alphaShell);
                ctx.beginPath();
                const n = Math.max(8, Math.ceil(start / 135));
                for (let i = 0; i <= n; i++) {
                    const q = alphaTrackPointAt(start * i / n);
                    i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
                }
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.strokeStyle = 'rgba(255,107,0,0.25)'; ctx.lineWidth = 430; ctx.stroke();
                ctx.strokeStyle = '#ffae63'; ctx.lineWidth = 185;
                ctx.setLineDash([360, 230]); ctx.stroke();
                ctx.restore();
            }
            // Curved direction arrow uses the real upper guide tangent during motion.
            if (u > 0.025 && u < 0.985) {
                const sArrow = Math.min(ALPHA_TRACK_LEN - 1250, Math.max(start + 1200, ALPHA_TRACK_LEN * .56));
                const p0 = alphaTrackPointAt(sArrow), p1 = alphaTrackPointAt(sArrow + 1100);
                const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
                const vl = Math.hypot(vx, vy) || 1, tx = vx/vl, ty = vy/vl;
                ctx.save();
                ctx.globalAlpha *= Math.min(0.75, Math.min(u, 1-u)*4);
                ctx.strokeStyle = '#ffbb81'; ctx.fillStyle = '#ffbb81';
                ctx.lineWidth = 85; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p1[0],p1[1]);
                ctx.lineTo(p1[0]-tx*360-ty*220,p1[1]-ty*360+tx*220);
                ctx.lineTo(p1[0]-tx*360+ty*220,p1[1]-ty*360-tx*220);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }
    ctx.restore();
    if (overrideDoorU != null) return; // aba 6 não atualiza os indicadores da aba 5
    // Heights come from the closed door and the exact 1:10 source geometry.
    const highConv = initialConv.doorClosed.tip.y, lowConv = initialConv.wallFix.y;
    const highAlpha = alpha.floorHighY, lowAlpha = alpha.baseY;
    const fmt = n => Number(n).toFixed(2);
    const vals = {
        'uni-height-conv-high': fmt(highConv) + ' cm',
        'uni-height-alpha-high': fmt(highAlpha) + ' cm',
        'uni-height-delta-high': (highAlpha-highConv>=0?'+':'')+fmt(highAlpha-highConv)+' cm',
        'uni-height-conv-low': fmt(lowConv) + ' cm',
        'uni-height-alpha-low': fmt(lowAlpha) + ' cm',
        'uni-height-delta-low': (lowAlpha-lowConv>=0?'+':'')+fmt(lowAlpha-lowConv)+' cm'
    };
    for (const [id, val] of Object.entries(vals)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}
window.drawUniReferenceBins = drawReferenceBins;
})();

        function drawCADCanvas(g, opts) {
            opts = opts || {};
            const T = opts.T != null ? opts.T : cadAnim.t;
            const dimFade = opts.dimFade != null ? opts.dimFade : 1;
            const FD = Object.assign({ conv: 1, alpha: 1, arc: 1, dims: 1 }, opts.fade || {});   // Simulação Completa: cada parte entra no seu tempo
            const faded = (a, fn) => { if (a >= 0.999) return fn(); ctx.save(); ctx.globalAlpha *= Math.max(0, a); try { return fn(); } finally { ctx.restore(); } };
            const S = i => cadEase(Math.min(1, Math.max(0, (T - i) / 0.85)));
            // cota animada: k<6 -> etapa 4 (escalonadas); k==6 -> etapa 2 (diâmetro)
            const cadDim = (k, ctx, x1, y1, x2, y2, lbl, col, fs, off, e1, e2) => {
                // A aba 5 tem cotas próprias do assento e das folgas até os bins;
                // não reutilizar nela a profusão de cotas da prancha CAD 2D.
                if (opts.minimalDims) return;
                const p = k === 6 ? S(1) : cadEase(Math.min(1, Math.max(0, (T - 2 - k * 0.1) / 0.5)));
                const fade = (k <= 4) ? 1 : dimFade;
                if (p <= 0 || fade <= 0) return;
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = e => e && { x1: e.x1, y1: e.y1, x2: e.x1 + (e.x2 - e.x1) * p, y2: e.y1 + (e.y2 - e.y1) * p };
                ctx.save(); ctx.globalAlpha = Math.min(1, p * 1.6) * fade * FD.dims;
                drawDimensionLine(ctx, mx + (x1 - mx) * p, my + (y1 - my) * p, mx + (x2 - mx) * p, my + (y2 - my) * p, lbl, col, fs, off, L(e1), L(e2));
                ctx.restore();
            };
            // mala: cai de cima com leve "quique"
            const cadBag = (k, ctx, cx, cy, w, h, ang, l1, l2, isA, col) => {
                if (opts.noBags) return;
                const s = Math.min(1, Math.max(0, (T - 3 - k * 0.2) / 0.6));
                if (s <= 0) return;
                const c1 = 1.70158, c3 = c1 + 1, e = s >= 1 ? 1 : 1 + c3 * Math.pow(s - 1, 3) + c1 * Math.pow(s - 1, 2);
                ctx.save(); ctx.globalAlpha = Math.min(1, s * 3);
                drawRealisticSuitcase(ctx, cx, cy - (1 - Math.min(e, 1)) * 26, w * e, h * e, ang, l1, l2, isA, col);
                ctx.restore();
            };
            const canvas = opts.canvas || document.getElementById(opts.canvasId || 'cadCanvas');
            if (!canvas) return;
            const rect = (opts.width && opts.height) ? { width: opts.width, height: opts.height } : canvas.parentElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const dpr = opts.dpr || window.devicePixelRatio || 1;
            const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
            if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
            }
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const W = rect.width, H = rect.height;
            ctx.clearRect(0, 0, W, H);
            if (opts.bgFill) {
                ctx.fillStyle = opts.bgFill;
                ctx.fillRect(0, 0, W, H);
            } else if (opts.unifiedCabinBackground) {
                // Apenas a Aba 5 individual usa o quadriculado CSS sob o canvas.
                // O tour conserva sua própria malha; os demais usos mantêm o fundo original.
                drawUnifiedCabinBackground(ctx, W, H, {
                    tour: !!opts.tourBackdrop, paint: !opts.cssGridBackdrop
                });
            }

            const xMin = -(g.R + 4);
            const xMax = (g.R + 4);
            const yMin = 18, yMax = g.R + 16;

            const padL = 46, padR = 28, padT = 28, padB = 42;
            const plotW = W - padL - padR, plotH = H - padT - padB;
            let scale = Math.min(plotW / (xMax - xMin), plotH / (yMax - yMin));
            let toX = (x) => padL + (x - xMin) * scale;
            let toY = (y) => H - padB - (y - yMin) * scale;
            if (opts.map) ({ toX, toY, scale } = opts.map(W, H));
            ctx.save();
            if(opts.camera){const c=opts.camera(W,H);if(c){ctx.translate(W/2,H/2);ctx.scale(c.k,c.k);ctx.translate(-c.x,-c.y);}}
            if (opts.before) opts.before(ctx, { W, H, toX, toY, scale });

            if (!opts.noGrid) {
            // Grid técnico CAD (a cada 10")
            ctx.strokeStyle = APHA_BLUEPRINT.grid;
            ctx.lineWidth = 1;
            ctx.fillStyle = '#64748b';
            ctx.font = '9.5px "JetBrains Mono", monospace';

            for (let xi = -50; xi <= 50; xi += 10) {
                const sx = toX(xi * CM_PER_IN);
                ctx.beginPath(); ctx.moveTo(sx, padT); ctx.lineTo(sx, H - padB); ctx.stroke();
                ctx.fillText(`${xi === 0 ? '0' : Math.abs(xi) + '"'}`, sx - 12, H - padB + 15);
            }
            for (let yi = 10; yi * CM_PER_IN <= yMax; yi += 10) {
                const sy = toY(yi * CM_PER_IN);
                ctx.beginPath(); ctx.moveTo(padL, sy); ctx.lineTo(W - padR, sy); ctx.stroke();
                ctx.fillText(`${yi}"`, 8, sy + 3);
            }

            }

            // Eixo de Simetria Central e Vão Livre do Corredor (20" = -10" a +10") — limitados ao piso (y = -62.84)
            const yTopGrid = toY(g.R + 14);
            const yFloorLine = toY(-62.84);
            ctx.save();
            ctx.setLineDash([5, 5]); ctx.globalAlpha = S(0) * FD.arc;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(toX(0), yTopGrid); ctx.lineTo(toX(0), yFloorLine); ctx.stroke();
            ctx.restore();

            ctx.fillStyle = 'rgba(42, 29, 194, 0.05)';
            ctx.save(); ctx.globalAlpha = S(1) * FD.arc; ctx.fillRect(toX(-g.x_livre), yTopGrid, toX(g.x_livre) - toX(-g.x_livre), yFloorLine - yTopGrid); ctx.restore();

            // Parede dupla (semicírculo): varredura da esquerda para a direita
            {
                const p = S(0), R_ext = g.R + 5.5, N = 90, th1 = Math.PI * (1 - p);
                const pt = (r, th) => [toX(r * Math.cos(th)), toY(r * Math.sin(th))];
                const th = i => Math.PI - (Math.PI - th1) * i / N;
                if (p > 0 && FD.arc > 0.001) {
                    ctx.save(); ctx.globalAlpha *= FD.arc; ctx.beginPath();
                    for (let i = 0; i <= N; i++) { const [x, y] = pt(g.R, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
                    for (let i = N; i >= 0; i--) { const [x, y] = pt(R_ext, th(i)); ctx.lineTo(x, y); }
                    ctx.closePath();
                    ctx.fillStyle = APHA_CABIN_PALETTE.rgba('shellFill', 0.35); ctx.fill();
                    ctx.strokeStyle = APHA_CABIN_PALETTE.shellOutline; ctx.lineWidth = 2.5;
                    [g.R, R_ext].forEach(rr => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = pt(rr, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
                    if (p < 1) { const [x, y] = pt(g.R + 2.75, th1); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = '#2a1dc2'; ctx.fill(); }
                    ctx.restore();
                }
            }

            const scaleFactor = (g.R / 137.16);
            const yTopApex = Math.sqrt(Math.max(0, g.R * g.R - g.x_livre * g.x_livre));

            // Cores por modelo (malas e cotas)
            const COR_CONV = '#494e75';
            const COR_ALPHA = '#5952b2';

            // Legendas acima de cada modelo
            if (!opts.noLegend) {
                ctx.save();
                ctx.globalAlpha = S(1); ctx.font = 'bold 20px "JetBrains Mono", monospace';
                ctx.textBaseline = 'middle';
                const yLeg = 26;
                [['CONVENTIONAL MODEL', 20, 'left', COR_CONV], ['ALPHA MODEL', W - 20, 'right', COR_ALPHA]].forEach(([txt, xp, align, cor]) => {
                    ctx.textAlign = align;
                    ctx.lineWidth = 5.0;
                    ctx.strokeStyle = 'rgba(245, 245, 245, 0.92)';
                    ctx.strokeText(txt, xp, yLeg);
                    ctx.fillStyle = cor;
                    ctx.fillText(txt, xp, yLeg);
                });
                ctx.restore();
            }

            // =========================================================================
            // LADO ESQUERDO: MODELO CONVENCIONAL EMBRAER (Largura 35", Altura 22,5")
            // =========================================================================
            if (opts.referenceBins) { ctx.save(); ctx.globalAlpha = 0; }
            const yPsuEmb = yTopApex - 22.5 * CM_PER_IN * scaleFactor;
            const clipBin = (sg) => { const a = toX(sg * g.x_livre) - sg * 4, b = toX(sg * (g.R + 6)), e = a + (b - a) * S(1); ctx.beginPath(); ctx.rect(Math.min(a, e), 0, Math.abs(e - a), H); ctx.clip(); };
            ctx.save(); clipBin(-1);
            const embProf = faded(FD.conv, () => traceEmbraerBinProfile(ctx, toX, toY, g.x_livre, yPsuEmb, -1, g.R, 0.0, true));
            ctx.restore();

            cadBag(0, ctx,
                toX(embProf.bagCx),
                toY(embProf.bagCy),
                embProf.bagW * scale,
                embProf.bagH * scale,
                embProf.bagAngleRad,
                'IATA standard',
                '',
                false,
                COR_CONV
            );

            // =========================================================================
            // LADO DIREITO: OVERHEAD BIN ALPHA (Largura 35", Altura de 20" a 25")
            // =========================================================================
            const yBottomAlpha = yTopApex - 20.0 * CM_PER_IN * scaleFactor;
            ctx.save(); clipBin(1);
            const alphaProf = faded(FD.alpha, () => traceBinAlphaProfile(ctx, toX, toY, g.x_livre, yBottomAlpha, 1, scaleFactor, g.R, 0.0));
            ctx.restore();

            // Na aba 5, os bins CAD de referência são desenhados logo abaixo.
            // Não desenhar malas do perfil legado atrás da cavidade do Alpha:
            // ao abrir a porta, esses contornos apareciam através do interior.
            if (!opts.referenceBins) {
            cadBag(1, ctx,
                toX(alphaProf.m1Cx),
                toY(alphaProf.m1Cy),
                alphaProf.m1W * scale,
                alphaProf.m1H * scale,
                0,
                'IATA standard',
                '',
                true,
                COR_ALPHA
            );

            cadBag(2, ctx,
                toX(alphaProf.m2Cx),
                toY(alphaProf.m2Cy),
                alphaProf.m2W * scale,
                alphaProf.m2H * scale,
                alphaProf.rad17,
                'IATA standard',
                '',
                true,
                COR_ALPHA
            );

            }

            // =========================================================================
            // Tab 5 only: restore canvas and paint the newly integrated CAD bins.
            if (opts.referenceBins) {
                ctx.restore();
                if (window.drawUniReferenceBins) window.drawUniReferenceBins(ctx, W, H, FD.conv * S(1), FD.alpha * S(1));
            }
            // COTAS TÉCNICAS EXTERNAS DOS BINS (35" LARGURA, 22,5" CONV., 20" E 25" ALPHA)
            // Posicionadas pelo lado de fora da fuselagem para limpar o interior
            // =========================================================================
            const xCorIn = g.x_livre;                    // 10" (25.4 cm)
            const xOutIn = g.x_livre + 35.0 * CM_PER_IN; // 45" (114.3 cm)

            // 1. Cota de largura do Bin Convencional Esquerdo: 35" (Acima da fuselagem)
            const yDimTopW = g.R + 13.0;
            cadDim(0, ctx,
                toX(-xOutIn), toY(yDimTopW),
                toX(-xCorIn), toY(yDimTopW),
                '35"', COR_CONV, 14, {x: 0, y: -14},
                {x1: toX(-xOutIn), y1: toY(yPsuEmb), x2: toX(-xOutIn), y2: toY(yDimTopW + 3.0)},
                {x1: toX(-xCorIn), y1: toY(yTopApex), x2: toX(-xCorIn), y2: toY(yDimTopW + 3.0)}
            );

            // 2. Cota de altura do Bin Convencional Esquerdo: 22,5" (Fora da fuselagem à esquerda)
            const xDimLeftH = -(g.R + 16.0);
            cadDim(1, ctx,
                toX(xDimLeftH), toY(yPsuEmb),
                toX(xDimLeftH), toY(yTopApex),
                '22.5"', COR_CONV, 13, {x: -24, y: 0},
                {x1: toX(-xOutIn), y1: toY(yPsuEmb), x2: toX(xDimLeftH - 3.0), y2: toY(yPsuEmb)},
                {x1: toX(-xCorIn), y1: toY(yTopApex), x2: toX(xDimLeftH - 3.0), y2: toY(yTopApex)}
            );

            // 3. Cota de altura frontal do Bin Alpha (Direito): 20" (Fora da fuselagem à direita, interna)
            const xDimAlpha20 = g.R + 14.0;
            cadDim(2, ctx,
                toX(xDimAlpha20), toY(yBottomAlpha),
                toX(xDimAlpha20), toY(yTopApex),
                '20"', COR_ALPHA, 13, {x: -18, y: 0},
                {x1: toX(xCorIn), y1: toY(yBottomAlpha), x2: toX(xDimAlpha20 + 2.5), y2: toY(yBottomAlpha)},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xDimAlpha20 + 2.5), y2: toY(yTopApex)}
            );

            // 4. Cota de altura máxima do Bin Alpha (Direito): 25" (Fora da fuselagem à direita, externa)
            const xDimAlpha25 = g.R + 28.0;
            cadDim(3, ctx,
                toX(xDimAlpha25), toY(alphaProf.yLowest),
                toX(xDimAlpha25), toY(yTopApex),
                '25"', COR_ALPHA, 14, {x: 20, y: 0},
                {x1: toX(alphaProf.xRampEnd), y1: toY(alphaProf.yLowest), x2: toX(xDimAlpha25 + 2.5), y2: toY(alphaProf.yLowest)},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xDimAlpha25 + 2.5), y2: toY(yTopApex)}
            );

            // 5. Cota de largura do Bin Alpha (Direito): 35" (Acima da fuselagem)
            cadDim(4, ctx,
                toX(xCorIn), toY(yDimTopW),
                toX(xOutIn), toY(yDimTopW),
                '35"', COR_ALPHA, 14, {x: 0, y: -14},
                {x1: toX(xCorIn), y1: toY(yTopApex), x2: toX(xCorIn), y2: toY(yDimTopW + 3.0)},
                {x1: toX(xOutIn), y1: toY(alphaProf.yOuterTip), x2: toX(xOutIn), y2: toY(yDimTopW + 3.0)}
            );

            // 6. Cota do Corredor Central: 20" (de -10" a +10")
            const yDimCorridor = 14.8 * CM_PER_IN;
            if (!opts.finalDims) cadDim(5, ctx,
                toX(-xCorIn), toY(yDimCorridor),
                toX(xCorIn), toY(yDimCorridor),
                '20"', '#0f3c68', 14, {x: 0, y: 15},
                {x1: toX(-xCorIn), y1: toY(yDimCorridor + 3.2), x2: toX(-xCorIn), y2: toY(yDimCorridor - 3.2)},
                {x1: toX(xCorIn), y1: toY(yDimCorridor + 3.2), x2: toX(xCorIn), y2: toY(yDimCorridor - 3.2)}
            );

            // 7. Cota do Diâmetro Interno da Fuselagem: Ø 108" (2R)
            const yDimDiam = g.R + 11.5;
            const diamIn = (2 * g.R / CM_PER_IN);
            const diamTxt = 'Ø ' + diamIn.toFixed(2).replace(/\.?0+$/, '') + '"';
            if (!opts.finalDims) {
            ctx.save();
            ctx.setLineDash([4, 4]); ctx.globalAlpha = S(1) * dimFade * FD.dims;
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
            ctx.lineWidth = 1.0;
            [-g.R, g.R].forEach(xe => {
                ctx.beginPath();
                ctx.moveTo(toX(xe), toY(yDimDiam + 1.5));
                ctx.lineTo(toX(xe), toY(yMin));
                ctx.stroke();
            });
            ctx.restore();
            cadDim(6, ctx,
                toX(-g.R), toY(yDimDiam),
                toX(g.R), toY(yDimDiam),
                diamTxt, '#1e293b', 15, {x: 0, y: 0}
            );
            }

            if (opts.after) opts.after(ctx, { W, H, toX, toY, scale, g, yTopApex });
            ctx.restore();
        }

@@APHA_INCLUDE:source/html/ABA6/manikin.js@@        // =====================================================================
        // MÓDULO 4: ERGONOMIA SENTADO (v5) — escopo isolado (IIFE) para não
        // sobrescrever helpers/paleta de manequim usados nas outras seções.
        // =====================================================================
        (function () {
        // PADRÕES DO ASSENTO
        const SEAT_PAN_IN = 16;      // Seat Pan Height (assento ao piso) — postura TTL (Taxi, Take-off, Landing): 16"
        const BACK_ANG_DEG = 20;     // Inclinação do encosto/tronco em relação à vertical — postura TTL: 20°
        const BACK_H_IN = 40;        // Total Structural Height: altura do topo do encosto ao piso
        const MIN_HEIGHT = 59.8 * CM_PER_IN; // 151.892 cm
        const MAX_HEIGHT = 73.4 * CM_PER_IN; // 186.436 cm

        const NULLCTX = new Proxy(function () {}, { get: () => NULLCTX, apply: () => NULLCTX, set: () => true });

        // Cena da cabine (reutilizável): L = camadas ligadas/desligadas (0..1), o.map = mapeamento opcional
        function drawSeatedScene(ctx, W, H, o) {
            const hAisle = o.hAisle, hWin = o.hWin;
            const backAng = (o.backAng != null) ? o.backAng : BACK_ANG_DEG;   // padrão TTL = 20° da vertical
            const L = Object.assign({ seats: 1, pax: 1, dims: 1 }, o.layers || {});
            const backRad = backAng * Math.PI / 180;
            const SEAT_PAN_CM = SEAT_PAN_IN * CM_PER_IN;                 // 40.64 cm (16")
            const backTopY = BACK_H_IN * CM_PER_IN;                      // 101.6 cm: topo do encosto a 40" do piso (cota)
            const xRange = 300, yRange = 226;
            let scale = Math.min((W - 40) / xRange, (H - 30) / yRange);
            const cx = W / 2;
            let toX = (xCm) => cx + xCm * scale;
            let toY = (yCm) => H - 15 - (yCm + 9) * scale;
            if (o.map) ({ toX, toY, scale } = o.map(W, H));

            // Abaixo de cada cabeça, consulta-se o perfil CAD realmente desenhado
            // pela Aba 5 (escala 1:10 em cm e estado fechado de referência).
            // Não usar traceBinAlphaProfile/vectorBinUnderY, que eram de bins antigos.
            const ceilingAtX = (xc, isRight) =>
                typeof window.getUniBinUndersideY === 'function'
                    ? window.getUniBinUndersideY(xc, isRight) : null;

            const drawEmbraerSeatAndDummy3D = (centerX, stature, label, isWindow, isRightSide) => {
                const seatW = 46.0;
                
                // Padrão TTL: assento 16", estrutura do encosto 40", ângulo 20° da vertical
                const seatPanTopY = SEAT_PAN_CM;
                const seatPanBotY = seatPanTopY - 12.0; // Cushion de 12cm
                const backrestTopY = backTopY;          // topo do encosto = 40" do piso

                ctx.save();
                ctx.globalAlpha *= L.seats;
                window.__dkRole = 'seat';   // paleta escura da exportação: poltrona
                // 1. Pernas da cadeira
                ctx.strokeStyle = '#5a5d63';
                ctx.lineWidth = 4.5;
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW * 0.35), toY(seatPanBotY));
                ctx.lineTo(toX(centerX - seatW * 0.42), toY(0));
                ctx.moveTo(toX(centerX + seatW * 0.35), toY(seatPanBotY));
                ctx.lineTo(toX(centerX + seatW * 0.42), toY(0));
                ctx.stroke();

                // 2. Travessa base sob o assento
                ctx.fillStyle = '#6b7280';
                ctx.fillRect(toX(centerX - seatW * 0.38), toY(seatPanBotY + 2), seatW * 0.76 * scale, 3 * scale);

                // 3. Encosto (Verde-azulado, top arredondado)
                ctx.fillStyle = '#3f7185';
                ctx.strokeStyle = '#244552';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW/2 + 1), toY(seatPanTopY));
                ctx.lineTo(toX(centerX - seatW/2 + 4.5), toY(backrestTopY - 12));
                ctx.quadraticCurveTo(toX(centerX - seatW/2 + 6), toY(backrestTopY), toX(centerX - seatW/4), toY(backrestTopY));
                ctx.lineTo(toX(centerX + seatW/4), toY(backrestTopY));
                ctx.quadraticCurveTo(toX(centerX + seatW/2 - 6), toY(backrestTopY), toX(centerX + seatW/2 - 4.5), toY(backrestTopY - 12));
                ctx.lineTo(toX(centerX + seatW/2 - 1), toY(seatPanTopY));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 4. Linhas de costura verticais laterais
                ctx.beginPath();
                ctx.moveTo(toX(centerX - seatW/4), toY(seatPanTopY));
                ctx.quadraticCurveTo(toX(centerX - seatW/4 - 1.5), toY((seatPanTopY + backrestTopY)/2), toX(centerX - seatW/4 + 1.5), toY(backrestTopY - 1.5));
                ctx.moveTo(toX(centerX + seatW/4), toY(seatPanTopY));
                ctx.quadraticCurveTo(toX(centerX + seatW/4 + 1.5), toY((seatPanTopY + backrestTopY)/2), toX(centerX + seatW/4 - 1.5), toY(backrestTopY - 1.5));
                ctx.strokeStyle = '#29505f';
                ctx.lineWidth = 1.4;
                ctx.stroke();

                // 5. Assento inferior (Cushion)
                ctx.fillStyle = '#3f7185';
                ctx.beginPath();
                ctx.roundRect(toX(centerX - seatW / 2 - 0.5), toY(seatPanTopY), (seatW + 1) * scale, 12 * scale, 4);
                ctx.fill();
                ctx.stroke();

                // 6. Braços da cadeira (Cinza claro acompanhando o banco mais alto)
                ctx.fillStyle = '#9ca3af';
                ctx.strokeStyle = '#4b5563';
                ctx.lineWidth = 1.2;
                const armW = 4.5;
                const armH = 14;
                const armY = seatPanTopY + 24; // ~62.1 cm
                ctx.beginPath();
                ctx.roundRect(toX(centerX - seatW / 2 - armW + 1), toY(armY), armW * scale, armH * scale, 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.roundRect(toX(centerX + seatW / 2 - 1), toY(armY), armW * scale, armH * scale, 2);
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
                window.__dkRole = null;

                ctx.save(); ctx.globalAlpha *= L.pax;
                // DUMMY POSTURE AJUSTADA PELA INCLINAÇÃO (TTL: 20° da vertical, assento a 16")
                // O tronco tomba para trás, reduzindo a altura vertical projetada do passageiro.
                const physicalSittingHeight = stature * 0.51; 
                
                // Aplicando o teorema de pitágoras para encontrar o cateto adjacente (altura visual)
                const seatedSittingHeight = physicalSittingHeight * Math.cos(backRad);   // tronco acompanha o ângulo do encosto
                
                const currentHeadTopY = seatPanTopY + seatedSittingHeight;
                const px = centerX;
                const pelvisBotY = seatPanTopY + 2;
                
                drawDummyFrontFigure(ctx, toX, toY, scale, {
                    px: px, S: stature, headTopY: currentHeadTopY, pelvisBotY: pelvisBotY, t: 0
                });

                const ceilingY = ceilingAtX(centerX, isRightSide);
                const clearance = Number.isFinite(ceilingY) ? ceilingY - currentHeadTopY : NaN;

                // A cota vai do topo real da cabeça ao intradorso real do bin CAD.
                // Sem offsets fixos de 0.6 cm nas extremidades.
                const cotaTxt = `${clearance >= 0 ? '+' : ''}${fmtIn(clearance, 1)}`;
                if (Number.isFinite(clearance) && L.dims > 0 && L.pax > 0) {
                    ctx.save();
                    ctx.globalAlpha *= L.dims;
                    drawDimensionLine(
                        ctx,
                        toX(px), toY(currentHeadTopY),
                        toX(px), toY(ceilingY),
                        cotaTxt, DIMENSION_COLOR, 12, {x: 20, y: 0},
                        {x1: toX(px - 4), y1: toY(currentHeadTopY), x2: toX(px + 4), y2: toY(currentHeadTopY)},
                        // Marca curta centrada na interseção exata com a curva CAD.
                        {x1: toX(px - 2), y1: toY(ceilingY), x2: toX(px + 2), y2: toY(ceilingY)}
                    );
                    ctx.restore();
                }

                                ctx.restore();
                return clearance;
            };

            const seatsOn = L.seats > 0 || L.pax > 0;
            const clWinEmb = seatsOn ? drawEmbraerSeatAndDummy3D(-99.5, hWin, '1A (WIN)', true, false) : 0;
            const clAisleEmb = seatsOn ? drawEmbraerSeatAndDummy3D(-48.5, hAisle, '1B (AIS)', false, false) : 0;
            const clAisleAlpha = seatsOn ? drawEmbraerSeatAndDummy3D(48.5, hAisle, '1C (AIS)', false, true) : 0;
            const clWinAlpha = seatsOn ? drawEmbraerSeatAndDummy3D(99.5, hWin, '1D (WIN)', true, true) : 0;

            // Aba 5: as três cotas principais (altura, piso e corredor)
            // são desenhadas apenas em drawInteractiveStructureDims().
            // A anotação de reclinação é renderizada por drawSeatbackLeader().

            return { clWinEmb, clAisleEmb, clAisleAlpha, clWinAlpha };
        }

                    

            window.drawSeatedScene = drawSeatedScene;
            window.SEATED_STAT = { min: MIN_HEIGHT, max: MAX_HEIGHT, seatPanIn: SEAT_PAN_IN, backAng: BACK_ANG_DEG };
        })();



