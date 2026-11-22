/**
 * OVERHEAD BIN ALPHA - MOTOR CAD E ERGONOMICO COMPARTILHADO
 *
 * INDICE (a ordem abaixo e relevante para a montagem do HTML):
 * 01 - Paleta e interceptacao do Canvas para a vista biomecanica
 * 02 - Unidades, navegacao, controlador, geometria geral e cotas
 * 03 - Desenho das malas
 * 04 - Manequins tecnicos articulados
 * 05 - CAD exato, cinematica das portas e medidas de folga
 * 06 - Desenho animado da secao de cabine
 * 07 - Motor biomecanico especifico da Aba 6 (inclusao no mesmo script)
 * 08 - Cabine com assentos, passageiros e folgas para a cabeca
 *
 * UTILIZACAO:
 * - Abas 5/6: usam geometria, desenho e estados compartilhados.
 * - Aba 8: coordena as mesmas cenas e os cinco takes, sem duplicar o motor.
 * - Core/navigation.js e ABA6/controller.js entram dentro do bloco 02.
 * - ABA6/manikin.js entra entre os blocos 06 e 08 (bloco 07).
 *
 * IMPORTANTES:
 * - Preservar esta ordem e os escopos existentes (incluindo as IIFEs).
 * - As diretivas de inclusao sao resolvidas por tools/build.py: nao adicionar
 *   tags de script independentes para essas dependencias.
 * - Alterar aparencia CSS em source/css; este motor desenha via Canvas 2D.
 * - A documentacao abaixo organiza o codigo; nao altera formulas ou desenho.
 */



        // =========================================================================

// =============================================================================
// BLOCO 01/08 - PALETA CANVAS DA SIMULACAO BIOMECANICA
// Intercepta cores/desenhos do Canvas 2D para o visual escuro.
// Preserva cores de destaque e diferencia boneco, bin e mala.
// =============================================================================
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
            // Interpolacao unica para as duas paletas escuras. Cada modo conserva
            // suas regras de excecao, normalizacao e cache de cores originais.
            const mapLuminance = (L, a) => {
                let col = RAMP[RAMP.length - 1][1];
                for (let i = 1; i < RAMP.length; i++) {
                    if (L <= RAMP[i][0]) {
                        const [l0, c0] = RAMP[i - 1], [l1, c1] = RAMP[i];
                        const k = l1 === l0 ? 0 : (L - l0) / (l1 - l0);
                        col = c0.map((x, j) => x + (c1[j] - x) * k);
                        break;
                    }
                }
                return `rgba(${col.map(Math.round).join(',')},${a})`;
            };
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
                        out = mapLuminance(L, a);
                    }
                }
                if (cache.size > 2000) cache.clear();
                cache.set(key, out); return out;
            };
            // Reutiliza os conversores/escala de luminancia definidos acima.
            const lilacCache = new Map();
                const lilac = c => {
                    if (lilacCache.has(c)) return lilacCache.get(c);
                    let out = c; const v = toRGBA(c.trim());
                    if (v) {
                        const r = v[0] / 255, g = v[1] / 255, b = v[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
                        let h = 0, sat = 0;
                        if (d > 0) {
                            sat = d / (1 - Math.abs(2 * l - 1));
                            h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
                            h *= 60;
                        }
                        if (d > 0 && sat <= 0.5 && h >= 190 && h <= 250 && l > 0.1 && l < 0.97) {   // família cinza-azulada (slate) e índigo suave
                            const s2 = Math.min(0.42, 0.18 + sat * 0.55);
                            out = `hsla(258, ${(s2 * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%, ${v[3]})`;
                        }
                    }
                    if (lilacCache.size > 2000) lilacCache.clear();
                    lilacCache.set(c, out); return out;
                };
                const dkCache = new Map();
                const integratedDark = (c, kind) => {
                    const role = window.__dkRole || '', key = role + '|' + kind + '|' + c;
                    if (dkCache.has(key)) return dkCache.get(key);
                    // Background da cabine é fixo, não uma superfície a remapear.
                    if (c.trim().toLowerCase() === APHA_BLUEPRINT.background) return c;
                    const v = toRGBA(c.trim()) || hslToRGBA(c.trim()); let out = c;
                    if (v) {
                        const a = v[3];
                        // poltrona: um pouco mais escura que os bonecos (preenchimento #9ba9b5) e linhas/contornos em #5b7b9e
                        if (role === 'seat') out = kind === 'stroke' ? APHA_CABIN_PALETTE.rgba('cyan', a) : APHA_CABIN_PALETTE.rgba('border', a);   // poltrona: azul escuro (#2f4a6b) com contorno azul médio (#6d90b8)
                        else if (role === 'dummy' && kind === 'stroke' && (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255 < 0.3) out = `rgba(8,18,42,${a})`;   // boneco: contorno azul-marinho quase preto, bem nítido sobre o corpo cinza
                        else if (Math.round(v[0]) === 245 && Math.round(v[1]) === 245 && Math.round(v[2]) === 245) out = `rgba(${BG[0]},${BG[1]},${BG[2]},${a})`;
                        else {
                            const L = (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255;
                            out = mapLuminance(L, a);
                        }
                    }
                    if (dkCache.size > 2000) dkCache.clear();
                    dkCache.set(key, out); return out;
                };

            // Unico conjunto de interceptores; modo escolhido pelas flags existentes.
            ['fillStyle', 'strokeStyle'].forEach(k => {
                const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, k);
                Object.defineProperty(CanvasRenderingContext2D.prototype, k, {
                    configurable: true, enumerable: d.enumerable, get: d.get,
                    set(val) {
                        const lowerColor = typeof val === 'string' ? val.toLowerCase() : '';
                        const tambourAccent = window.__aphaTambourOrange === true &&
                            ['#b84a16', '#ff8a45', '#ff6b1a', '#a43d12'].includes(lowerColor);
                        const accent = typeof val === 'string' && (tambourAccent ||
                            (window.BIN_SOLID &&
                            ['#4fc1ff', '#569cd6', '#8dd7ff', '#143550', '#ff6b00', 'rgba(255,107,0,0.22)'].includes(lowerColor)));
                        const integratedMode = window.BIN_SOLID || window.BIN_DARK;
                        const role = k === 'strokeStyle' ? 'stroke' : 'fill';
                        const output = typeof val !== 'string' || (integratedMode && accent) ? val
                            : window.BIN_DARK ? integratedDark(val, role)
                            : window.BIN_SOLID ? lilac(val)
                            : dkOn() ? dark(val, role) : val;
                        d.set.call(this, output);
                    }
                });
            });
            const acs0 = CanvasGradient.prototype.addColorStop;
            CanvasGradient.prototype.addColorStop = function (o, color) {
                return acs0.call(this, o,
                    typeof color !== 'string' ? color :
                    window.BIN_DARK ? integratedDark(color, 'fill') :
                    dkOn() ? dark(color, 'fill') : color);
            };
            const st0 = CanvasRenderingContext2D.prototype.stroke;
            CanvasRenderingContext2D.prototype.stroke = function (...a) {
                if (window.BIN_DARK && window.__dkRole === 'dummy' && this.lineWidth >= 1.3 && this.lineWidth <= 1.7) {
                    const w = this.lineWidth; this.lineWidth = w * 2.6;
                    try { return st0.apply(this, a); } finally { this.lineWidth = w; }
                }
                return st0.apply(this, a);
            };
            const ft0 = CanvasRenderingContext2D.prototype.fillText;
            const ergoFillText = function (...a) {
                if (!dkOn()) return ft0.apply(this, a);
                const orig = this.fillStyle, v = typeof orig === 'string' ? toRGBA(orig) : null;
                const dim = v && Math.abs(v[0] - 100) < 4 && Math.abs(v[1] - 116) < 4 && Math.abs(v[2] - 139) < 4;
                window.ERGO_DARK = false;
                try { this.fillStyle = dim ? '#6f8fb0' : '#bababa'; ft0.apply(this, a); this.fillStyle = orig; }
                finally { window.ERGO_DARK = true; }
            };
            CanvasRenderingContext2D.prototype.fillText = function (...a) {
                if (!window.BIN_DARK) return ergoFillText.apply(this, a);
                const previous = this.fillStyle; window.BIN_DARK = false;
                try { this.fillStyle = '#bababa'; ergoFillText.apply(this, a); this.fillStyle = previous; }
                finally { window.BIN_DARK = true; }
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
            drawRealisticSuitcase = wrapIn(drawRealisticSuitcase, 'bin');
        })();

// =============================================================================
// BLOCO 02/08 - UNIDADES, NAVEGACAO, CONTROLADOR E GEOMETRIA GERAL
// Converte cm para polegadas e inclui navigation.js e ABA6/controller.js
// antes dos calculos e do desenho CAD.
// =============================================================================
        // Unidade de exibição: polegadas (pol). Os cálculos internos continuam em cm;
        // só o que aparece na tela é convertido por esta função.
        const CM_PER_IN = 2.54;
        const fmtIn = (cm, d = 2) => `${(cm / CM_PER_IN).toFixed(d)}"`;
@@APHA_INCLUDE:source/js/core/navigation.js@@@@APHA_INCLUDE:source/html/ABA6/controller.js@@        // -------------------------------------------------------------------------
        // MÓDULO 1: GEOMETRIA CAD 2D (APÊNDICE A)
        // -------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SUBBLOCO 02.1 - Referencia geometrica da cabine
// Projeta a mesma fuselagem e corredor de core/config.js.
// -----------------------------------------------------------------------------
        // A secao CAD usa somente o raio e o semivao do corredor.
        // Os dois perfis parametricos de malas/bin nao sao mais renderizados.
        function computeAllGeometries() {
            return {
                R: APHA_CABIN_GEOMETRY.fuselageRadiusCm,
                x_livre: APHA_CABIN_GEOMETRY.aisleHalfWidthCm
            };
        }

        // Constantes de tempo/easing do contorno CAD (reutilizadas pela Simulação Integrada)

// -----------------------------------------------------------------------------
// SUBBLOCO 02.2 - Cotas compartilhadas
// Desenha as cotas efetivamente utilizadas nas Abas 5 e 6.
// -----------------------------------------------------------------------------

        // Cotas técnicas compartilhadas pela Aba 5, simulação integrada e exportações.
        // Cor técnica única, inclusive no modo de exportação BIN_DARK.
        const DIMENSION_COLOR = '#b0c4de';
        function drawDimensionLine(ctx, x1, y1, x2, y2, label, fontSize = 15, labelOffset = {x: 0, y: 0}, ext1 = null, ext2 = null) {
            ctx.save();
            const previousBinDark = window.BIN_DARK;
            try {
                window.BIN_DARK = false;
                // Todas as cotas visiveis usam a mesma cor tecnica.
                ctx.setLineDash([]);
                ctx.strokeStyle = DIMENSION_COLOR;
                ctx.fillStyle = DIMENSION_COLOR;
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
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 2, 35, 0.92)';
                ctx.strokeText(label, mx, my);
                ctx.fillStyle = DIMENSION_COLOR;
                ctx.fillText(label, mx, my);
            } finally {
                window.BIN_DARK = previousBinDark;
                ctx.restore();
            }
        }

// =============================================================================
// BLOCO 03/08 - RENDERIZACAO DE BAGAGENS
// Os bins usam somente o CAD do Bloco 05; sem perfis paralelos.
// =============================================================================
// -----------------------------------------------------------------------------
// SUBBLOCO 03.1 - Desenho das malas
// -----------------------------------------------------------------------------
        // Todas as chamadas ativas desenham a mala Alpha, sem rotulos nem
        // personalizacao de cores. Os estilos especificos da Aba 6 permanecem.
        function drawRealisticSuitcase(ctx, cx, cy, wPx, hPx, angleRad) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleRad);
            ctx.fillStyle = window.__mkExport ? '#6b6fc4' : 'rgba(67, 70, 151, 0.30)';
            ctx.strokeStyle = '#2a1dc2';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.roundRect(-wPx / 2, -hPx / 2, wPx, hPx, 5);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = 'rgba(42, 29, 194, 0.50)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-wPx / 2 + 3.5, -hPx / 2 + 3.5, Math.max(4, wPx - 7), Math.max(4, hPx - 7));
            ctx.fillStyle = '#2a1dc2';
            ctx.fillRect(-wPx * 0.16, -hPx / 2 - 2.5, wPx * 0.32, 2.5);
            ctx.restore();
        }

        // =========================================================================

// =============================================================================
// BLOCO 04/08 - MANEQUINS TECNICOS ARTICULADOS
// Juntas, membros, cabeca e tronco do boneco tecnico.
// drawDummyFrontFigure monta a figura completa a partir desses componentes.
// =============================================================================
        // Manequim Android: paleta unica compartilhada com os assentos.
        // Estilos antigos de madeira e branco foram retirados anteriormente.
        // =========================================================================
        const DUMMY_PALETTE = {
            hi: '#ffffff', light: '#f4f7fa', mid: '#e2e8f0',
            dark: '#cbd5e1', edge: '#1e293b',
            joint: '#94a3b8', jointDark: '#64748b'
        };

        // Esfera de articulação estilo manequim técnico (cinza-azulada com contorno escuro e brilho)
        function drawDummyJointBall(ctx, cx, cy, rPx) {
            if (rPx < 0.8) return;
            const P = DUMMY_PALETTE;
            ctx.save();
            const grad = ctx.createRadialGradient(cx - rPx * 0.3, cy - rPx * 0.3, rPx * 0.1, cx, cy, rPx);
            grad.addColorStop(0.0, '#cbd5e1');
            grad.addColorStop(0.55, P.joint);
            grad.addColorStop(1.0, P.jointDark);
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
        function drawDummyLimbSegment(ctx, x1, y1, x2, y2, r1Px, r2Px) {
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 1) return;
            const P = DUMMY_PALETTE;
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
            const P = DUMMY_PALETTE;
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
            const P = DUMMY_PALETTE;
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
            waistGrad.addColorStop(1.00, P.jointDark);

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
        // FIGURA FRONTAL SENTADA, postura TTL, manequim técnico ilustrado
        // =========================================================================

// -----------------------------------------------------------------------------
// SUBBLOCO 04.1 - Composicao do manequim sentado
// Calcula articulacoes e desenha a postura com sobreposicao correta.
// -----------------------------------------------------------------------------
        function drawDummyFrontFigure(ctx, toX, toY, scale, o) {
            const __dkPrev = window.__dkRole; window.__dkRole = 'dummy';   // paleta escura da exportação: boneco
            const P = DUMMY_PALETTE;
            const S = o.S, px = o.px;
            const ankleY = 5.5;
            const K = 0.74;
            const seg = (x1, y1, x2, y2, r1, r2) =>
                drawDummyLimbSegment(ctx, toX(x1), toY(y1), toX(x2), toY(y2), r1 * K * scale, r2 * K * scale);
            const ball = (x, y, r) =>
                drawDummyJointBall(ctx, toX(x), toY(y), r * K * scale);

            // Marcos verticais (cm)
            const headR = S * 0.066;
            const headCY = o.headTopY - headR;
            const shoulderTopY = o.headTopY - S * 0.175;       // base do pescoço
            const pelvisBotY = o.pelvisBotY;
            const hipJY = pelvisBotY + S * 0.062;              // centro da articulação do quadril
            const kneeJY = hipJY - S * 0.04;

            // Posições laterais (cm, a partir da linha média)
            const hipX = S * 0.060 * K;
            const kneeX = S * 0.072 * K;
            const ankX = S * 0.075 * K;
            const shJY = shoulderTopY - S * 0.04;
            const shJX = S * 0.106 * K;
            const elbX = S * 0.122 * K;
            const elbY = shJY - S * 0.186;
            const handX = S * 0.088 * K;
            const handY = hipJY + S * 0.040;

            // Pescoço cilíndrico cinza-azulado articulado (como na referência)
            const drawNeck = () => {
                const nx = toX(px), ny1 = toY(o.headTopY - headR * 2 + S * 0.025), ny2 = toY(shoulderTopY - S * 0.015);
                const nr = S * 0.029 * K * scale;
                ctx.save();
                const gNeck = ctx.createLinearGradient(nx - nr, 0, nx + nr, 0);
                gNeck.addColorStop(0, '#cbd5e1');
                gNeck.addColorStop(0.45, P.joint);
                gNeck.addColorStop(1, P.jointDark);
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
                const hl = S * 0.032;
                seg(px + sd * handX, handY, px + sd * (handX - S * 0.012), handY - hl, S * 0.022, S * 0.018);
            });

            drawNeck();
            drawTorso(); drawShinsAndFeet(); drawThighs();
            drawUpperArms();
            drawForearmsAndHands();
            drawDummyHead3D(ctx, toX(px), toY(headCY), headR * 1.04 * scale);
            window.__dkRole = __dkPrev;
        }



// =============================================================================
// BLOCO 05/08 - CAD EXATO DOS BINS E CINEMATICA DAS PORTAS
// Conserva os perfis SVG e o casco convencional realmente desenhado.
// Usa caches para angulos e contornos estaticos; alimenta as cotas.
// Tem IIFE propria: manter os dados e as APIs publicas nesse escopo.
// =============================================================================
/* Aba 5: geometria CAD usada também pela Aba 6.
   Valores numéricos de posição/distância estão em centímetros na cena;
   sufixos legados "Mm" representam centímetros da geometria, e não mm
   físicos (o desenho técnico original foi projetado em escala 1:10).
   O contorno da fuselagem, piso e assentos permanece inalterado. */
(function () {
const CABIN_R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;
        const CABIN_YC = APHA_CABIN_GEOMETRY.fuselageCenterYCm;
        // Medidas obtidas da geometria realmente desenhada: porta de 82 graus.
        // O mecanismo legado de 39 graus foi removido: nao desenhava essa porta.
        const CONV_CAD_BASE_Y_CM = 138.50;
        const CONV_CAD_TIP_Y_CM = 153.04;
        const ALPHA_CAD_FLOOR_TARGET_Y_CM = 148.70;

        const ALPHA_FIXED = Object.freeze({
            // Transformação arquivo -> CAD (x_cad = SCALE_X*fx + TX ; y_svg = SCALE_Y*fy + TY), ajustada ao arco da fuselagem
            scaleX: 0.004474693,   // 89,35 cm de largura real
            scaleY: 0.004288607,   // 61,49 cm de altura real
            tx: 20.87335808,
            ty: -228.85901283,
        });

        // Contorno externo amostrado do alphaa.svg (coords do arquivo) — usado para achar o ponto mais baixo / extremos ao girar
        const ALPHA_OUTLINE = [[658,7389],[657,8175],[657,9009],[657,9883],[656,10787],[656,11711],[655,12646],[654,13583],[653,14511],[651,15422],[650,16306],[648,17154],[647,17956],[646,18069],[645,18171],[648,18264],[658,18346],[678,18420],[711,18484],[760,18539],[828,18585],[918,18623],[1034,18653],[1178,18676],[1354,18691],[1879,18725],[2433,18767],[3001,18815],[3571,18867],[4127,18921],[4657,18975],[5146,19026],[5581,19072],[5948,19113],[6234,19144],[6424,19165],[6504,19173],[6711,19218],[7144,19335],[7759,19511],[8514,19733],[9366,19988],[10272,20262],[11191,20542],[12078,20815],[12891,21068],[13588,21287],[14126,21459],[14462,21571],[14551,21571],[14798,21571],[15172,21571],[15640,21571],[16171,21571],[16734,21571],[17297,21571],[17828,21571],[18296,21571],[18670,21571],[18917,21571],[19007,21571],[19062,21553],[19140,21523],[19237,21481],[19351,21429],[19478,21370],[19616,21305],[19761,21235],[19911,21163],[20063,21090],[20214,21018],[20361,20948],[20501,20883],[20535,20867],[20562,20855],[20583,20844],[20598,20834],[20608,20824],[20612,20813],[20612,20800],[20607,20785],[20597,20767],[20584,20745],[20566,20717],[20545,20683],[19224,18736],[17797,16956],[16279,15338],[14683,13877],[13023,12568],[11315,11406],[9572,10387],[7807,9505],[6036,8756],[4273,8135],[2531,7637],[825,7258],[784,7249],[751,7242],[725,7237],[704,7234],[688,7234],[676,7238],[668,7247],[663,7262],[660,7282],[659,7310],[658,7345],[658,7389]];

// -----------------------------------------------------------------------------
// SUBBLOCO 05.1 - Transformacao CAD Alpha e solucao angular
// Aplica escala/rotacao e busca a altura-alvo do contorno.
// -----------------------------------------------------------------------------
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

        // Recorte usado para extremo da face inferior (x <= 14462).
        // getUniAlphaGeometry usa uma faixa mais longa (x <= 19007) para apoiar
        // as malas: não unificar esses filtros sem revisar a geometria física.
        const ALPHA_UNDERSIDE = ALPHA_OUTLINE.filter(p => p[0] >= 1354 && p[0] <= 14462 && p[1] >= 18690);

        // A geometria Alpha atual calibra somente a altura do piso.
        function alphaFloorHighY(thetaDeg) {
            let minYs = Infinity;
            for (const p of ALPHA_UNDERSIDE) {
                const q = alphaTransformPoint(p[0], p[1], thetaDeg);
                if (q.ys < minYs) minYs = q.ys;
            }
            return -minYs;
        }
        let cachedAlphaTheta = null;
        function solveAlphaTheta() {
            if (cachedAlphaTheta !== null) return cachedAlphaTheta;
            let lo = -20, hi = 30;
            for (let i = 0; i < 50; i++) {
                const mid = (lo + hi) / 2;
                if (alphaFloorHighY(mid) > ALPHA_CAD_FLOOR_TARGET_Y_CM) lo = mid;
                else hi = mid;
            }
            cachedAlphaTheta = (lo + hi) / 2;
            return cachedAlphaTheta;
        }

        // Reutiliza os mesmos extremos CAD quando o theta geométrico não muda.
        let cachedAlphaGeometry = null;
        function computeRightAlphaLocked() {
            const thetaDeg = solveAlphaTheta();
            if (!cachedAlphaGeometry || cachedAlphaGeometry.thetaDeg !== thetaDeg)
                cachedAlphaGeometry = { thetaDeg };
            return cachedAlphaGeometry;
        }

        // Geometria CAD única do ALPHA: os pontos do piso são extraídos do
        // mesmo contorno usado pela aba 5, sem reconstituir um bin aproximado.
        // Os pontos de apoio da mala são estáticos para o mesmo theta;
        // sua transformação/ordenação é feita apenas quando theta muda.
        let cachedAlphaFloor = null;
        window.getUniAlphaGeometry = () => {
            const alpha = computeRightAlphaLocked();
            if (cachedAlphaFloor && cachedAlphaFloor.thetaDeg === alpha.thetaDeg)
                return cachedAlphaFloor.geometry;
            const floorPts = ALPHA_OUTLINE
                .filter(p => p[0] >= 1354 && p[0] <= 19007 && p[1] >= 18690)
                .map(p => {
                    const q = alphaTransformPoint(p[0], p[1], alpha.thetaDeg);
                    return { x: q.x, y: -q.ys };
                })
                .sort((a, b) => a.x - b.x);
            const geometry = { ...alpha, floorPts };
            cachedAlphaFloor = { thetaDeg: alpha.thetaDeg, geometry };
            return geometry;
        };





        

// -----------------------------------------------------------------------------
// SUBBLOCO 05.2 - Trilho da porta rolante e detalhes SVG
// Amostra o trilho e preserva recortes e perfis estruturais.
// -----------------------------------------------------------------------------
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
const clamp = aphaClamp01;
// Single CAD styling source for the Alpha body in tabs 5 and 6.
// Keep the exact SVG paths; do not replace them with generic rectangles.
const ALPHA_CAD_STYLE = Object.freeze({
    shellAt: opacity => `rgba(74, 144, 226, ${Math.max(0, Math.min(1, opacity))})`,
    outline: '#4a90e2',
    inner: '#2a6fc9',
    innerWash: 'rgba(74, 144, 226, 0.16)'
});
function paintPath(ctx, path, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(path, 'nonzero'); }
    if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(path); }
}
// O casco Alpha, os vazados, os detalhes e o trilho nao se movem no
// referencial CAD local. Apenas o grupo inteiro gira: cachear os Path2D
// evita reconstruir sua geometria em cada quadro das Abas 5 e 6.
let cachedAlphaCadPaths = null;
function getAlphaCadPaths() {
    if (cachedAlphaCadPaths) return cachedAlphaCadPaths;
    const shell = new Path2D();
    ALPHA_OUTLINE.forEach((p, i) => i ? shell.lineTo(p[0], p[1]) : shell.moveTo(p[0], p[1]));
    shell.closePath();
    const upper = new Path2D(ALPHA_UPPER_DETAIL);
    const lower = new Path2D(ALPHA_LOWER_TRIANGLE);
    const withCutouts = new Path2D(shell);
    withCutouts.addPath(upper);
    withCutouts.addPath(lower);
    const seam = new Path2D();
    seam.moveTo(2882.10, 9351.24);
    seam.bezierCurveTo(4353.21, 9328.50, 7185.94, 9385.51, 7185.94, 9385.51);
    const track = new Path2D();
    ALPHA_TRACK.forEach((pt, i) => i ? track.lineTo(pt[0], pt[1]) : track.moveTo(pt[0], pt[1]));
    return (cachedAlphaCadPaths = {
        shell, withCutouts, upper, lower, seam, track,
        rail: new Path2D(ALPHA_SOURCE_RAIL),
        inner: new Path2D(ALPHA_SOURCE_INNER)
    });
}
// A folga até a cabeça usa os mesmos perfis CAD em centímetros da renderização.
// A interseção vertical encontra a face inferior efetiva em cada assento,
// sem recorrer aos vetores aproximados da versão anterior dos bins.
// O intradorso convencional é calculado a partir das curvas cúbicas reais;
// o perfil quadrático intermediário não é consumido pela API pública.

// -----------------------------------------------------------------------------
// SUBBLOCO 05.3 - Intradorso e folga ate a cabeca
// Guarda o contorno inferior e consulta intersecoes para cotas.
// -----------------------------------------------------------------------------
let cachedAlphaUnderside = null;
function alphaUndersideForTheta(thetaDeg) {
    if (cachedAlphaUnderside && cachedAlphaUnderside.thetaDeg === thetaDeg)
        return cachedAlphaUnderside.points;
    const points = ALPHA_OUTLINE.map(p => {
        const q = alphaTransformPoint(p[0], p[1], thetaDeg);
        return { x: q.x, y: -q.ys };
    });
    cachedAlphaUnderside = { thetaDeg, points };
    return points;
}
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
// Geometria convencional independente do Canvas e do progresso da porta.
// Valores constantes nesta cena: uma unica entrada de cache e suficiente.
let cachedConventionalGeometry = null;
function getConventionalCadGeometry() {
    if (cachedConventionalGeometry) return cachedConventionalGeometry;
const R = CABIN_R, CY = CABIN_YC, bottomY = CONV_CAD_BASE_Y_CM, floorY = CONV_CAD_TIP_Y_CM;
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

        const Ep={x:-Math.sqrt(Math.max(0,R*R-(bottom0.y-CY)**2)),y:bottom0.y};
        const cB1=W([8570.39,21313.78]),cB2=W([19845.34,20898.17]),bEnd=W([20243.48,20945.80]);
        const cC1=W([21136.70,21052.74]),cC2=W([30508.64,18191.16]);
        const cubics = [
            [Ep,cB1,cB2,bEnd], [bEnd,cC1,cC2,e0],
            [e0,e1,e2,D], [D,c1,c2,S]
        ];
        cachedConventionalGeometry = {
            R, CY, Ep, cB1, cB2, bEnd, cC1, cC2,
            e0, e1, e2, D, c1, c2, S, ext, inner, N, pivot, cubics
        };
        return cachedConventionalGeometry;
}

function conventionalPolyPath(pts) {
    const p = new Path2D();
    pts.forEach((v,i) => i ? p.lineTo(v.x,-v.y) : p.moveTo(v.x,-v.y));
    p.closePath();
    return p;
}
// Casco, vazado, folha, lingueta e braco sao Path2D estaticos.
// Somente o envelope de movimento da porta e dinamico.
let cachedConventionalPaths = null;
function getConventionalCadPaths() {
    if (cachedConventionalPaths) return cachedConventionalPaths;
    const { R, CY, Ep, cB1, cB2, bEnd, cC1, cC2,
            e0, e1, e2, D, c1, c2, S, ext, inner, N, pivot } = getConventionalCadGeometry();
    const shell = new Path2D();
    shell.moveTo(Ep.x,-Ep.y);
    shell.bezierCurveTo(cB1.x,-cB1.y,cB2.x,-cB2.y,bEnd.x,-bEnd.y);
    shell.bezierCurveTo(cC1.x,-cC1.y,cC2.x,-cC2.y,e0.x,-e0.y);
    shell.bezierCurveTo(e1.x,-e1.y,e2.x,-e2.y,D.x,-D.y);
    shell.bezierCurveTo(c1.x,-c1.y,c2.x,-c2.y,S.x,-S.y);
    const angS=Math.atan2(-S.y+CY,S.x),angE=Math.atan2(-Ep.y+CY,Ep.x);
    const sweep=angE-angS;
    for(let j=1;j<=70;j++){
        const angle=angS+sweep*j/70;
        shell.lineTo(R*Math.cos(angle),-(CY-R*Math.sin(angle)));
    }
    shell.closePath();
    const blade=conventionalPolyPath(ext.concat(inner.slice().reverse()));
    const cavity=new Path2D();
    cavity.addPath(shell);cavity.addPath(blade);
    const armEnd=inner[Math.max(0,N-Math.round(7/.4))];
    const arm=new Path2D();
    arm.moveTo(pivot.x,-pivot.y);arm.lineTo(armEnd.x,-armEnd.y);
    const latch=conventionalPolyPath(ext.slice(0,7).concat(inner.slice(0,7).reverse()));
    cachedConventionalPaths = { shell, blade, cavity, arm, latch };
    return cachedConventionalPaths;
}

// A medicao usa as cubicas do CAD sem precisar desenhar a cena.
function exactConventionalUndersideY(x) {
    if (!Number.isFinite(x)) return null;
    // Intersecta a vertical da cabeça com as curvas cúbicas efetivamente
    // desenhadas no casco convencional (inclusive a barriga inferior).
    const cubics = getConventionalCadGeometry().cubics;
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
    isAlpha
        ? lowerBinSurfaceAtX(alphaUndersideForTheta(computeRightAlphaLocked().thetaDeg), x)
        : exactConventionalUndersideY(x);

// -----------------------------------------------------------------------------
// SUBBLOCO 05.4 - Desenho final e abertura das portas
// Compoe o convencional e o Alpha; respeita fade e progresso da porta.
// A Aba 6 pode informar overrideDoorU sem alterar o controle da Aba 5.
// -----------------------------------------------------------------------------
function drawReferenceBins(ctx, W, H, fadeConv, fadeAlpha, overrideDoorU) {
    const cabin = window.cabinSectionReference;
    if (!cabin) return;
    // A aba 6 move a porta independentemente, sem alterar a aba 5.
    const map = cabin.map(W, H);
    const u = clamp(Number(overrideDoorU == null ? window.__uniRefDoorProgress : overrideDoorU) || 0);
    // Somente o CAD efetivo; sem atualizar estados de uma porta legada.
    const alpha = computeRightAlphaLocked();

    // Headroom consulta a geometria CAD diretamente, sem depender do fade
    // ou da ordem em que as Abas 5 e 6 foram desenhadas.

    // Original CAD SVG has downward-positive Y. Map to existing Tab 5 cabin.
    ctx.save();
    ctx.translate(map.toX(0), map.toY(0));
    ctx.scale(map.scale, map.scale);


    if (fadeConv > 0.001) {
        // Conventional bin replaced with the geometry and pivoted-door mechanism
        // from bin_aeronave_simples.html (fixed CAD dimensions in centimetres).
        ctx.save();
        ctx.globalAlpha *= clamp(fadeConv);
        // Usa o mesmo raio/centro da fuselagem compartilhada pelas Abas 5 e 6.
        // Casco, intradorso e folha da porta sao compartilhados entre os frames.
        const { ext, inner, pivot } = getConventionalCadGeometry();
        const { shell, blade, cavity, arm, latch } = getConventionalCadPaths();
        const turn=(p,angle)=>{
            const r=angle*Math.PI/180,c=Math.cos(r),si=Math.sin(r),dx=p.x-pivot.x,dy=p.y-pivot.y;
            return {x:pivot.x+dx*c-dy*si,y:pivot.y+dx*si+dy*c};
        };
        ctx.fillStyle='#9ba9b5';
        ctx.fill(cavity,'evenodd');
        ctx.strokeStyle='#273e57';ctx.lineWidth=.55;ctx.stroke(shell);
        // Abertura final exibida na Simulação Integrada: 82 graus.
        const visibleDoorMaxDeg = 82;
        const angle = u * visibleDoorMaxDeg;
        if(overrideDoorU==null&&u>0){
            const sweepPath=new Path2D();
            for(let j=0;j<=Math.ceil(angle);j++){
                const a=angle*j/Math.max(1,Math.ceil(angle));
                sweepPath.addPath(conventionalPolyPath(ext.map(p=>turn(p,a)).concat(inner.map(p=>turn(p,a)).reverse())));
            }
            ctx.save();ctx.fillStyle='rgba(255,107,0,.16)';ctx.fill(sweepPath);
            const t0={x:(ext[0].x+inner[0].x)/2,y:(ext[0].y+inner[0].y)/2};
            ctx.beginPath();
            for(let j=0;j<=55;j++){const p=turn(t0,angle*j/55);j?ctx.lineTo(p.x,-p.y):ctx.moveTo(p.x,-p.y);}
            ctx.strokeStyle='#FE6B00';ctx.lineWidth=.7;ctx.setLineDash([.9,1.1]);ctx.stroke();
            ctx.restore();
        }
        // Curved laminate, latch and rigid arm rotate together around the upper pivot.
        ctx.save();ctx.translate(pivot.x,-pivot.y);ctx.rotate(-angle*Math.PI/180);
        ctx.translate(-pivot.x,pivot.y);
        ctx.strokeStyle='#373435';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.stroke(arm);
        ctx.strokeStyle='#7A75B5';ctx.lineWidth=1.8;ctx.stroke(arm);
        ctx.fillStyle='#aebecb';ctx.strokeStyle='#273e57';ctx.lineWidth=.4;
        ctx.fill(blade);ctx.stroke(blade);
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
        // Geometria estatica unica; opacidade e porta continuam por quadro.
        const alphaPaths = getAlphaCadPaths();
        const alphaShell = alphaPaths.shell;
        const alphaWithCutouts = alphaPaths.withCutouts;
        {
            // Os triângulos vazados continuam expondo a fuselagem de fundo.
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
            paintPath(ctx, alphaPaths.upper, null, 'rgba(39,62,87,0.75)', 70);
            ctx.lineWidth = 78; ctx.strokeStyle = '#8298b2'; ctx.stroke(alphaPaths.seam);
            // Interior escalonado: reutiliza os paths SVG originais, não linhas
            // aproximadas. Primeiro o preenchimento translúcido da parede,
            // depois o perfil em escada em azul mais escuro, sempre recortado
            // dentro do contorno externo para não criar resíduos visuais.
            ctx.save();
            ctx.clip(alphaShell);
            paintPath(ctx, alphaPaths.rail,
                ALPHA_CAD_STYLE.innerWash, ALPHA_CAD_STYLE.inner, 120);
            paintPath(ctx, alphaPaths.inner,
                null, ALPHA_CAD_STYLE.inner, 95);
            ctx.restore();
            ctx.lineWidth = 155; ctx.strokeStyle = '#8DD7FF'; ctx.stroke(alphaPaths.track);
            // Triângulo inferior direito também realmente vazado.
            paintPath(ctx, alphaPaths.lower, null, 'rgba(39,62,87,0.75)', 85);
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
}
window.drawUniReferenceBins = drawReferenceBins;
})();


// =============================================================================
// BLOCO 06/08 - RENDERIZACAO DA SECAO CAD 2D
// Desenha fuselagem, bins, malas, cotas e transicoes no viewport.
// Aceita parametros de fade e tempo usados pela Simulacao Geral.
// =============================================================================
        // O arco completo nao muda depois da revelacao. Cache em pixels CSS:
        // a chave inclui o viewport e amostras do mapa, pois a exportacao 4K
        // utiliza tamanho e transformacao diferentes da Aba 5 individual.
        let cachedCompletedFuselageArc = null;
        function getCompletedFuselageArc(g, toX, toY, W, H) {
            const R = g.R, outerR = R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90;
            const key = [W, H, R, toX(0), toY(0), toX(R), toY(R), toX(-R), toY(-R)].join('|');
            if (cachedCompletedFuselageArc && cachedCompletedFuselageArc.key === key)
                return cachedCompletedFuselageArc.paths;

            const point = (r, i) => {
                const th = Math.PI - Math.PI * i / N;
                return [toX(r * Math.cos(th)), toY(r * Math.sin(th))];
            };
            const innerPts = Array.from({ length: N + 1 }, (_, i) => point(R, i));
            const outerPts = Array.from({ length: N + 1 }, (_, i) => point(outerR, i));
            const fill = new Path2D(), inner = new Path2D(), outer = new Path2D();
            innerPts.forEach(([x, y], i) => {
                if (i === 0) { fill.moveTo(x, y); inner.moveTo(x, y); }
                else { fill.lineTo(x, y); inner.lineTo(x, y); }
            });
            for (let i = N; i >= 0; i--)
                fill.lineTo(outerPts[i][0], outerPts[i][1]);
            fill.closePath();
            outerPts.forEach(([x, y], i) =>
                i === 0 ? outer.moveTo(x, y) : outer.lineTo(x, y));
            const paths = { fill, inner, outer };
            cachedCompletedFuselageArc = { key, paths };
            return paths;
        }

        function drawCADCanvas(g, opts) {
            opts = opts || {};
            const T = opts.T != null ? opts.T : 4;
            const FD = Object.assign({ conv: 1, alpha: 1, arc: 1 }, opts.fade || {});   // Simulação Completa: cada parte entra no seu tempo
            const S = i => aphaEaseCubic((T - i) / 0.85);
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

            // Ambos os chamadores (Aba 5 e exportacao) usam o mapa m1.
            const { toX, toY, scale } = opts.map(W, H);
            ctx.save();
            if(opts.camera){const c=opts.camera(W,H);if(c){ctx.translate(W/2,H/2);ctx.scale(c.k,c.k);ctx.translate(-c.x,-c.y);}}
            if (opts.before) opts.before(ctx, { W, H, toX, toY, scale });

            // Eixo de Simetria Central e Vão Livre do Corredor (20" = -10" a +10") — limitados ao piso (y = -62.84)
            const yTopGrid = toY(g.R + 14);
            const yFloorLine = toY(-APHA_CABIN_GEOMETRY.fuselageCenterYCm);
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
                // O arco superior é uma etapa visual distinta do perfil completo: conservar 90 amostras.
                const p = S(0), R_ext = g.R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90, th1 = Math.PI * (1 - p);
                const pt = (r, th) => [toX(r * Math.cos(th)), toY(r * Math.sin(th))];
                const th = i => Math.PI - (Math.PI - th1) * i / N;
                if (p > 0 && FD.arc > 0.001) {
                    ctx.save(); ctx.globalAlpha *= FD.arc;
                    ctx.fillStyle = APHA_CABIN_PALETTE.rgba('shellFill', 0.35);
                    ctx.strokeStyle = APHA_CABIN_PALETTE.shellOutline; ctx.lineWidth = 2.5;
                    if (p >= 1) {
                        const paths = getCompletedFuselageArc(g, toX, toY, W, H);
                        ctx.fill(paths.fill);
                        ctx.stroke(paths.inner);
                        ctx.stroke(paths.outer);
                    } else {
                        ctx.beginPath();
                        for (let i = 0; i <= N; i++) { const [x, y] = pt(g.R, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
                        for (let i = N; i >= 0; i--) { const [x, y] = pt(R_ext, th(i)); ctx.lineTo(x, y); }
                        ctx.closePath();
                        ctx.fill();
                        [g.R, R_ext].forEach(rr => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = pt(rr, th(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
                        const [x, y] = pt(g.R + APHA_CABIN_GEOMETRY.shellThicknessCm / 2, th1);
                        ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = '#2a1dc2'; ctx.fill();
                    }
                    ctx.restore();
                }
            }


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
            // A geometria dos dois bins vem exclusivamente do CAD compartilhado.
            if (window.drawUniReferenceBins)
                window.drawUniReferenceBins(ctx, W, H, FD.conv * S(1), FD.alpha * S(1));
            if (opts.after) opts.after(ctx, { W, H, toX, toY, scale, g });
            ctx.restore();
        }


// =============================================================================
// BLOCO 07/08 - INCLUSAO DO MOTOR BIOMECANICO DA ABA 6
// Seu controlador entra no bloco 02; a implementacao de manikin.js
// entra aqui, antes da cabine sentada, no mesmo script montado.
// =============================================================================
@@APHA_INCLUDE:source/html/ABA6/manikin.js@@        // =====================================================================

// =============================================================================
// BLOCO 08/08 - CABINE SENTADA E MEDICAO DE FOLGAS
// Preserva a IIFE de assentos e manequins e a distancia da cabeca
// ao intradorso CAD dos bins; publica drawSeatedScene e SEATED_STAT.
// =============================================================================
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


        // Cena da cabine (reutilizável): L = camadas ligadas/desligadas (0..1), o.map = mapeamento opcional

// -----------------------------------------------------------------------------
// SUBBLOCO 08.1 - Cena com assentos e passageiros
// Distribui os quatro lugares e consulta o CAD real para headroom.
// -----------------------------------------------------------------------------
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
            // A folga usa o contorno CAD ativo, sem perfis alternativos.
            const ceilingAtX = (xc, isRight) =>
                typeof window.getUniBinUndersideY === 'function'
                    ? window.getUniBinUndersideY(xc, isRight) : null;

            const drawEmbraerSeatAndDummy3D = (centerX, stature, isRightSide) => {
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

                // Aba 6: poltronas visiveis sem desenhar manequins invisiveis.
                if (L.pax <= 0) return;
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
                    px: px, S: stature, headTopY: currentHeadTopY, pelvisBotY: pelvisBotY
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
                        cotaTxt, 12, {x: 20, y: 0},
                        {x1: toX(px - 4), y1: toY(currentHeadTopY), x2: toX(px + 4), y2: toY(currentHeadTopY)},
                        // Marca curta centrada na interseção exata com a curva CAD.
                        {x1: toX(px - 2), y1: toY(ceilingY), x2: toX(px + 2), y2: toY(ceilingY)}
                    );
                    ctx.restore();
                }

                ctx.restore();
            };

            if (L.seats > 0 || L.pax > 0) {
                drawEmbraerSeatAndDummy3D(-99.5, hWin, false);
                drawEmbraerSeatAndDummy3D(-48.5, hAisle, false);
                drawEmbraerSeatAndDummy3D(48.5, hAisle, true);
                drawEmbraerSeatAndDummy3D(99.5, hWin, true);
            }

            // Aba 5: as três cotas principais (altura, piso e corredor)
            // são desenhadas apenas em drawInteractiveStructureDims().
            // A anotação de reclinação é renderizada por drawSeatbackLeader().

        }

                    

            window.drawSeatedScene = drawSeatedScene;
            window.SEATED_STAT = { min: MIN_HEIGHT, max: MAX_HEIGHT, seatPanIn: SEAT_PAN_IN, backAng: BACK_ANG_DEG };
        })();



