'use strict';
// Teste de falhas dos exportadores 4K sem GPU: verifica downloads, restauração e desbloqueio.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', 'source', 'html', 'ABA2', 'cad3d');
const load = name => fs.readFileSync(path.join(root, name), 'utf8');
const downloads = [], warnings = [];
class Vec {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    clone() { return new this.constructor(this.x, this.y, this.z); }
}
class Color {
    constructor(value = 0) { this.value = value; }
    setHex(value) { this.value = value; return this; }
    getHex() { return this.value; }
    copy(c) { this.value = c.value; return this; }
    clone() { return new Color(this.value); }
}
const sandbox = {
    THREE: { Vector2: Vec, Vector3: Vec, Color, DoubleSide: 2 },
    window: { failDownload: false },
    console: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    setTimeout: callback => { callback(); return 1; },
    document: {
        createElement: () => ({ download: '', href: '', click() { downloads.push(this.download); }, remove() {} }),
        body: { appendChild() {} }
    }
};
const prefix = `
(function fakeCAD() {
    const material = color => ({
        color: new THREE.Color(color), transparent: false, opacity: 1,
        depthWrite: true, needsUpdate: false
    });
    const mat = material(0xc6cbdb), wm = material(0xa8aec8), fm = material(0x6c769c);
    const doorMat = material(0xd4d7ea), handleMat = material(0x7b86b0);
    const profileBandMaterials = [material(0x99aabb)];
    const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const bags = [0, 1, 2, 3].map(i => ({
        root: { visible: i < 2, position: vec(i, i + 1, i + 2),
                quaternion: vec(0, 0, 0), traverse() {} },
        env: { visible: true }, mBody: { color: new THREE.Color(0x112233 + i) }
    }));
    const solids = [{ material: mat, renderOrder: 7 }];
    const group = { children: [{ visible: true }], traverse(fn) { this.children.forEach(fn); } };
    const sideWallParts = [];
    const views = { iso: [-2.25, 0.28, 3100], side: [0, 0, 2600] };
    const DIST = 1157, T = vec(578.5, 330, -620);
    let az = -2.25, el = 0.28, R = 3100, openProgress = 0;
    const cam = {
        fov: 35, aspect: 16 / 9, up: vec(0, 1, 0), view: null,
        updateProjectionMatrix() {},
        setViewOffset(fullWidth, fullHeight, offsetX, offsetY, width, height) {
            this.view = { enabled: true, fullWidth, fullHeight, offsetX, offsetY, width, height };
            this.aspect = fullWidth / fullHeight;
        },
        clearViewOffset() { this.view = null; }
    };
    const ren = {
        ratio: 1.5, size: vec(800, 450), clear: new THREE.Color(0x102030), alpha: 0.4,
        setPixelRatio(v) { this.ratio = v; },
        getPixelRatio() { return this.ratio; },
        setSize(w, h) { this.size.set(w, h); },
        getSize(dest) { return dest.copy(this.size); },
        setClearColor(color, alpha) {
            this.clear = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
            this.alpha = alpha;
        },
        getClearColor(dest) { return dest.copy(this.clear); },
        getClearAlpha() { return this.alpha; }
    };
    const cv = { toDataURL() {
        if (window.failDownload) throw new Error('forced image download failure');
        return 'data:image/png;base64,mocked';
    } };
    function stopAllAnimations() {}
    function setBagPoseAlongPath(i) { bags[i].root.position.x += 100; }
    function updateDoor(v) { openProgress = v; }
    function syncDoorUI() {}
    function upd() {}
    function rs() {}
    window.inspectCAD = () => JSON.stringify({
        az, el, R, T, openProgress, camera: {
            fov: cam.fov, aspect: cam.aspect, up: cam.up, view: cam.view
        },
        renderer: { ratio: ren.ratio, size: ren.size, clear: ren.clear.value, alpha: ren.alpha },
        surfaces: [mat, wm, fm, ...profileBandMaterials].map(m =>
            [m.color.getHex(), m.transparent, m.opacity, m.depthWrite]),
        bags: bags.map(b => [b.root.visible, b.env.visible, b.root.position,
                           b.root.quaternion, b.mBody.color.getHex()]),
        renderOrders: solids.map(m => m.renderOrder),
        groupVisibility: group.children.map(o => o.visible)
    });
`;
const script = prefix + load('09-export-common.js') +
    load('10-export-images.js') + load('11-export-side.js');
vm.runInNewContext(script, sandbox, { filename: 'assembled-exporters.js' });

(async () => {
    const before = sandbox.window.inspectCAD();
    sandbox.window.failDownload = true;
    await sandbox.window.cad3dExportImages();
    assert.equal(sandbox.window.inspectCAD(), before,
        'Falha do PNG deve restaurar todos os estados da Aba 2');
    sandbox.window.failDownload = false;
    await sandbox.window.cad3dExportImages();
    assert.equal(sandbox.window.inspectCAD(), before,
        'Exportação normal deve restaurar todos os estados da Aba 2');
    assert.deepEqual(downloads, [
        'alpha_bin_3d_isometric_door_closed_4k.png',
        'alpha_bin_3d_isometric_door_80pct_open_4k.png',
        'alpha_bin_side_wall_only_4k.png'
    ]);
    sandbox.window.failDownload = true;
    await sandbox.window.cad3dExportSideTransparent();
    assert.equal(sandbox.window.inspectCAD(), before,
        'Falha na vista lateral também deve restaurar todos os estados');
    sandbox.window.failDownload = false;
    await sandbox.window.cad3dExportSideTransparent();
    assert.equal(sandbox.window.inspectCAD(), before,
        'Exportação lateral deve restaurar o estado original');
    assert.deepEqual(downloads.slice(3), [
        'alpha_bin_lateral_with_four_bags_acrylic_4k.png',
        'alpha_bin_side_isometric_with_two_rear_bags_acrylic_4k.png'
    ]);
    assert.equal(warnings.length, 2, 'Devem existir somente os dois avisos das falhas injetadas');
    process.stdout.write('CAD 3D: 5 PNGs, falhas injetadas e estados restaurados.\\n');
})().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
