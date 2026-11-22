        // Inicialização única da Aba 6: somente após o canvas tornar-se visível.
        let aba6Initialized = false;
        window.__aba6TourMode = false;
        function initAba6Engine(options = {}) {
            const host = document.getElementById('aba6-module-ergo');
            const canvas = document.getElementById('aba6-manikinCanvas');
            if (!host || !canvas || !canvas.parentElement) return false;
            const rect = canvas.parentElement.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return false;
            if (!aba6Initialized) {
                aba6Initialized = true;
                window.aba6Initialized = true;
            }
            // Reinicialização determinística: cancela qualquer RAF anterior antes
            // de assumir o relógio. manikinState.last é cache biomecânico,
            // não timestamp; nunca zerá-lo para tentar corrigir o delta de tempo.
            stopManikinLoop();
            window.__aba6TourMode = !!options.tour;
            if (options.reset || !manikinState.last || options.tour) {
                showManikin();
                // A ponte entrega uma fase global, não a fase de uma mala isolada.
                if (Number.isFinite(options.initialPhase)) {
                    manikinState.phase = Math.max(0, Math.min(.95, options.initialPhase));
                }
            }
            manikinFrameTime = 0;
            manikinState.animating = true;
            startManikinLoop(); // relógio novo; startManikinLoop usa performance.now()
            // Não há mais setAnimLabel(): sua chamada órfã impedia a
            // notificação de prontidão da ponte e congelava o Take 03.
            updateErgonomics();
            // Só agora a ponte pode usar manikinState.phase: antes deste ponto
            // a variável ainda podia conter a pose final de outra reprodução.
            if (options.tour && typeof window.__aphaTourAba6ClockReady === 'function') {
                window.__aphaTourAba6ClockReady(manikinState.phase);
            }
            // Sem resize global: evita reentrância no tour e nos outros canvases.
            return true;
        }
        let aba6LaunchToken = 0;
        function scheduleAba6Engine(options = {}) {
            const token = ++aba6LaunchToken;
            const stillActive = () => {
                if (token !== aba6LaunchToken) return false;
                const host = document.getElementById('aba6-module-ergo');
                if (!host) return false;
                return options.tour ? !!host.closest('#tour-stage')
                    : currentTab === 'sim' && !host.closest('#tour-stage');
            };
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!stillActive()) return;
                if (!initAba6Engine(options)) {
                    requestAnimationFrame(() => {
                        if (stillActive()) initAba6Engine(options);
                    });
                }
            }));
        }
        function pauseAba6Engine() {
            ++aba6LaunchToken; // invalidate any pending double-RAF initialization
            manikinState.animating = false;
            stopManikinLoop();
            window.__aba6TourMode = false;
        }

