
        // Aba 3 (Top View): exporta o quadro atual do canvas como PNG, sobre o fundo escuro #000223
        window.topExportPNG = function () {
            const cv = document.getElementById('topCanvas');
            if (!cv || !cv.width || !cv.height) return;
            const out = document.createElement('canvas');
            out.width = cv.width; out.height = cv.height;
            const ctx = out.getContext('2d');
            ctx.fillStyle = '#000223'; ctx.fillRect(0, 0, out.width, out.height);
            ctx.drawImage(cv, 0, 0);
            out.toBlob(b => {
                if (!b) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(b); a.download = 'top-view.png';
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            }, 'image/png');
        };
        