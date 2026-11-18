        let currentTab = 'cad3d';
        function switchTab(tab) {
            if (tab !== 'tour' && window.tourAbort) window.tourAbort();
            const previousTab = currentTab;
            currentTab = tab;
            document.body.classList.toggle('apha-simulation-view', tab === 'sim');
            if (previousTab === 'sim' && tab !== 'sim') pauseAba6Engine();
            if (tab !== 'unified' && window.uniPause) window.uniPause();
            if (tab !== 'nova' && window.novaShowHeader) window.novaShowHeader(false);
            if (tab !== 'pax' && window.paxPause) window.paxPause();
            if (tab !== 'closing' && window.closingReset && !document.querySelector('#tour-stage #module-closing')) window.closingReset();   // sai da aba de encerramento: para as animações
            ['pax', 'sim', 'cad3d', 'nova', 'topview', 'unified', 'closing', 'tour'].forEach(t => {
                const sec = document.getElementById(`module-${t}`);
                const btn = document.getElementById(`tab-btn-${t}`);
                if (!sec || !btn) return;
                if (t === tab) {
                    sec.classList.remove('hidden');
                    btn.className = "flex-1 xl:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-cad-cyan text-white font-semibold shadow";
                } else {
                    sec.classList.add('hidden');
                    btn.className = "flex-1 xl:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-slate-700 hover:text-slate-900 hover:bg-slate-200";
                }
            });
            setTimeout(() => {
                if (tab === 'sim') scheduleAba6Engine({tour:false,reset:true});
                if (tab === 'pax' && window.paxEnter) window.paxEnter();
                if (tab === 'nova' && window.novaEnter) { window.novaEnter(); if(window.novaShowHeader)window.novaShowHeader(true); }
                if (tab === 'unified' && window.uniEnter) window.uniEnter();
                
                if (tab === 'cad3d' && window.resizeCAD3D) window.resizeCAD3D();
                if (tab === 'closing' && window.closingEnter) window.closingEnter();   // encerramento: recalcula a escala e toca do início
            }, 30);
        }
