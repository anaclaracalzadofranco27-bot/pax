'use strict';
// Aba 5 — testes de comportamento sem GPU: portas, reprodução e PNGs 4K.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', 'source', 'html', 'ABA5');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let now = 1000, nextFrame = 1, failDraw = false, failBlob = false, failSave = false;
const callbacks = new Map(), warnings = [], filenames = [], offscreenFrames = [];
const elements = new Map(), seenStatures = [];
const ctx = new Proxy({globalAlpha: 1}, {
    get(obj, key) { return key in obj ? obj[key] : () => {}; },
    set(obj, key, value) { obj[key] = value; return true; }
});
const node = id => {
    if (!elements.has(id)) {
        const n = { id, value: '', textContent: '', innerHTML: '', style: {},
            offsetWidth: 960, offsetHeight: 540,
            getBoundingClientRect() { return { width: 960, height: 540, left: 0, top: 0 }; },
            classList: { toggle() {} }, querySelector() { return null; },
            closest() { return null; } };
        if (id === 'uniCanvas') {
            n.width = 1920; n.height = 1080; n.parentElement = {
                offsetWidth: 960, offsetHeight: 540,
                getBoundingClientRect() { return {width:960, height:540}; }
            };
            n.getContext = () => ctx;
        }
        elements.set(id, n);
    }
    return elements.get(id);
};
const window = {
    SEATED_STAT: { min: 150, max: 190, backAng: 20 },
    BIN_SOLID: false, BIN_DARK: false, EXPORT_EN: false,
    addEventListener() {}
};
const document = {
    getElementById: node, querySelector: () => null, addEventListener() {},
    createElement(type) {
        if (type === 'canvas') return { toBlob(callback) {
            if (failBlob) throw new Error('Falha de toBlob injetada');
            callback({testBlob: true});
        } };
        if (type === 'a') return { click() { filenames.push(this.download); }, remove() {} };
        throw new Error('Elemento inesperado: '+type);
    },
    body: { appendChild() {} }
};
const performance = { now: () => now };
function requestAnimationFrame(callback) {
    const id = nextFrame++;
    callbacks.set(id, callback);
    return id;
}
function cancelAnimationFrame(id) { callbacks.delete(id); }
const sandbox = {
    window, document, performance, requestAnimationFrame, cancelAnimationFrame,
    setTimeout() {},
    URL: {
        createObjectURL() { if (failSave) throw new Error('Falha de URL injetada'); return 'blob:test'; },
        revokeObjectURL() {}
    },
    console: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    APHA_CABIN_GEOMETRY: {
        fuselageCenterYCm: 62.84, fuselageRadiusCm: 137.16,
        shellThicknessCm: 5.5, aisleHalfWidthCm: 25.4, floorWidthCm: 252
    },
    APHA_CABIN_PALETTE: { rgba: () => '#445566', shellOutline: '#445566' },
    APHA_BRIDGE_CFG: { startZoom: 1.72, binFocusYcm: 173 },
    CM_PER_IN: 2.54,
    aphaClamp01: x => Math.max(0, Math.min(1, x)),
    aphaEaseCubic: value => {
        const x = Math.max(0, Math.min(1, value));
        return x < .5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
    },
    computeAllGeometries: () => ({R: 137, x_livre: 25.4}),
    drawAphaCabinFloor() {}, drawDimensionLine() {},
    fmtIn: x => (x/2.54).toFixed(1)+'"',
    drawCADCanvas(g, opts) {
        if (opts.canvas) {
            if (failDraw) throw new Error('Falha de desenho 4K injetada');
            offscreenFrames.push({w:opts.width, h:opts.height, dpr:opts.dpr, bg:opts.bgFill});
            if (opts.after) opts.after(ctx, {
                W:opts.width,H:opts.height,scale:1,
                toX:x=>x+600, toY:y=>y+200, g
            });
        }
    }
};
window.drawSeatedScene = (c, W, H, o) => seenStatures.push(o.hAisle);

vm.runInNewContext(read('unified-simulation.js'), sandbox, { filename: 'unified-simulation.js' });
vm.runInNewContext(read('door-addon.js'), sandbox, { filename: 'door-addon.js' });

const snapshot = () => ({
    time: Number(node('uni-scrub').value), progress: window.__uniRefDoorProgress,
    mode: window.uniRefDoorSnapshot().manual, percent: node('uni-bin-door-pct').textContent,
    button: node('uni-bin-door-toggle').textContent,
    solid:window.BIN_SOLID, dark:window.BIN_DARK, export:window.EXPORT_EN
});
const equalSnapshot = (s, msg) => assert.deepEqual(snapshot(), s, msg);

// A porta segue o relógio e os controles mostram todos o mesmo valor.
window.uniTourSet(15);
assert.equal(window.__uniRefDoorProgress, 1);
assert.equal(node('uni-bin-door-pct').textContent, '100%');
assert.equal(node('uni-bin-door-toggle').textContent, 'Close bin doors');
window.uniRefSetDoors(.3);
assert.equal(window.__uniRefDoorProgress, .3);
window.uniRefresh();
assert.equal(window.__uniRefDoorProgress, .3, 'refresh não deve sobrescrever o modo manual');
assert.equal(node('uni-bin-door-slider').value, '30');
assert.equal(node('uni-bin-door-pct').textContent, '30%');
window.uniRefToggleDoors();
now += 950;
for (const [id,fn] of [...callbacks]) { callbacks.delete(id); fn(now); }
assert.equal(window.__uniRefDoorProgress, 1, 'o botão manual continua abrindo em 950ms');
window.uniScrub(0);
assert.equal(window.__uniRefDoorProgress, 0, 'scrub deve recuperar o modo automático');
assert.equal(node('uni-bin-door-toggle').textContent, 'Open bin doors');

// TL.total não existe; a aba terminada precisa reiniciar no começo real.
window.uniScrub(99);
window.uniEnter();
assert.equal(Number(node('uni-scrub').value), 0, 'reentrada após final reinicia com TOTAL');
window.uniPause();
window.uniRefSetDoors(.4);
window.uniTourReset();
assert.equal(window.__uniRefDoorProgress, 0, 'reset do Take 03 assume a porta');

// A exportação média deve continuar sendo 165cm mesmo após o último quadro.
window.uniScrub(15);
window.uniRefSetDoors(.25);
let saved = snapshot();
window.uniExport4K({});
equalSnapshot(saved, 'exportação world-average deve restaurar porta/manual/relógio/paleta');
assert.equal(seenStatures.at(-1), 165, 'world average não deve exportar P95');
assert.equal(filenames.at(-1), 'alpha_bin_integrated_simulation_world_average_4k.png');
assert.deepEqual(offscreenFrames.at(-1), {w:1920,h:1080,dpr:2,bg:'#f5f5f5'});

// Erros na renderização e na serialização 4K não podem reter flags ou desabilitar novo PNG.
failDraw = true;
saved = snapshot();
window.uniExport4K({stat:'p95',transparent:true,palette:'dark'});
equalSnapshot(saved, 'falha de drawCADCanvas deve restaurar todo estado');
failDraw = false;
failBlob = true;
window.uniExport4K({stat:'p95',transparent:true,palette:'dark'});
equalSnapshot(saved, 'falha de toBlob deve restaurar todo estado');
failBlob = false;
window.uniExport4K({stat:'p95',transparent:true,palette:'dark'});
equalSnapshot(saved, 'nova captura após falha deve funcionar');
assert.equal(seenStatures.at(-1), 190);
assert.equal(filenames.at(-1),
    'alpha_bin_integrated_simulation_p95_male_transparent_dark_palette_4k.png');
assert.deepEqual(offscreenFrames.at(-1), {w:1920,h:1080,dpr:2,bg:null});

// Falha de download na callback ocorre depois da renderização e também é contida.
failSave = true;
window.uniExport4K({});
equalSnapshot(saved, 'erro de URL não pode afetar estados de execução');
failSave = false;

// Quando Play estava ativo, a exportação deve retomar a linha do tempo e um único RAF.
window.uniScrub(4);
window.uniTogglePlay();
assert.equal(callbacks.size, 1);
const buttonBefore = node('uni-play').innerHTML;
window.uniExport4K({});
assert.equal(callbacks.size, 1, 'retomar apenas um loop da animação');
assert.equal(node('uni-play').innerHTML, buttonBefore);
window.uniPause();
assert.equal(callbacks.size, 0);
assert(warnings.some(w => w.includes('falha na exportação 4K')), 'erros devem ser visíveis no console');
process.stdout.write('Aba 5: portas, Replay, cinco cenários 4K e restauração verificados.\n');
