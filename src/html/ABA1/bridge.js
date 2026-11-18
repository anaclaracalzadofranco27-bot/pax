
        // Aba 1: carrega a cópia embutida no iframe e expõe os comandos usados pela troca de abas e pela Simulação Completa
        (function () {
            const fr = document.getElementById('pax-frame'), srcEl = document.getElementById('pax-src');
            fr.srcdoc = srcEl.textContent.replace(/<\\(\/script|!--|script)/gi, '<$1');
            srcEl.remove();
            const win = () => { try { return fr.contentWindow; } catch (e) { return null; } };
            const api = () => { try { const w = win(); return w && w.paxEmbed && w.paxEmbed.ready() ? w.paxEmbed : null; } catch (e) { return null; } };
            let t0 = 0;
            window.paxEnter = () => {
                try {
                    const w = win(); if (!w) return;
                    if (w.paxEmbed) { if (w.paxEmbed.xrayReset && !fr.closest('#tour-stage')) w.paxEmbed.xrayReset(); w.paxEmbed.setControls(!fr.closest('#tour-stage')); }
                    else w.dispatchEvent(new w.Event('resize'));
                } catch (e) {}
            };
            window.paxPause = () => { const a = api(); if (a) a.pause(); };
            window.paxTourReset = () => { t0 = 0; const a = api(); if (a) { if (a.xrayReset) a.xrayReset(); a.setControls(false); a.reset(); } };
            window.paxXray = ms => { const a = api(); return a && a.xray ? a.xray(ms) : Promise.resolve(); };
            window.paxTourStart = async () => {
                const t = performance.now(); let a;
                while (!(a = api()) && performance.now() - t < 10000) await new Promise(r => setTimeout(r, 100));
                if (a) { if (a.xrayReset) a.xrayReset(); a.setControls(false); a.reset(); a.play(); }
                t0 = performance.now();
            };
            // terminou quando a linha do tempo chega a 14 s (TOTAL_TIME); se o iframe não responder, segue após 15 s
            window.paxTourDone = () => { if (!t0) return false; const a = api(); return a ? a.done() : performance.now() - t0 > 15000; };
        })();
        