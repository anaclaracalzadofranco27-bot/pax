            // Both measurements share one top baseline and the same auxiliary-line height.
            // Keep the actual widths (44" Alpha and 56" conventional) and their horizontal scale.
            const TOP_BIN_DIMENSION_Y = 44;
            const TOP_BIN_DIMENSION_EXTENSION_END_Y = 164;
            function drawTopDimension(ctx, x1, x2, yDim, label) {
                ctx.save();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#FFFFFF';
                ctx.fillStyle = '#FFFFFF';
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(x1, TOP_BIN_DIMENSION_EXTENSION_END_Y); ctx.lineTo(x1, yDim - 7);
                ctx.moveTo(x2, TOP_BIN_DIMENSION_EXTENSION_END_Y); ctx.lineTo(x2, yDim - 7);
                ctx.moveTo(x1, yDim); ctx.lineTo(x2, yDim);
                ctx.stroke();
                // Setas triangulares sólidas, apontadas para fora da medida.
                [[x1, -1], [x2, 1]].forEach(([x, d]) => {
                    ctx.beginPath();
                    ctx.moveTo(x + d * 10, yDim);
                    ctx.lineTo(x, yDim - 3.6);
                    ctx.lineTo(x, yDim + 3.6);
                    ctx.closePath();
                    ctx.fill();
                });
                ctx.font = '700 15px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const tw = ctx.measureText(label).width + 16;
                const xm = (x1 + x2) / 2;
                ctx.fillStyle = '#000223';
                ctx.fillRect(xm - tw / 2, yDim - 11, tw, 22);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.strokeRect(xm - tw / 2, yDim - 11, tw, 22);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(label, xm, yDim + 0.5);
                ctx.restore();
            }

