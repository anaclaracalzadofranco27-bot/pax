        // Aba 4: exportação PNG manual opcional (não há botão ativo na interface).
        // Esta API pública foi preservada para uso direto, sem interferir nos takes da Aba 8.
        window.topExportPNG = function () {
            const canvas = document.getElementById('topCanvas');
            if (!canvas || !canvas.width || !canvas.height) return;

            const output = document.createElement('canvas');
            output.width = canvas.width;
            output.height = canvas.height;
            const ctx = output.getContext('2d');
            if (!ctx) return;

            // Mantém o fundo e o nome do arquivo originais.
            ctx.fillStyle = '#000223';
            ctx.fillRect(0, 0, output.width, output.height);
            ctx.drawImage(canvas, 0, 0);
            output.toBlob(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'top-view.png';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 2000);
            }, 'image/png');
        };
