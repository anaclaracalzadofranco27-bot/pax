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
