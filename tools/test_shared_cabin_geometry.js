'use strict';
// Verificação geométrica sem WebGL: compara fórmulas e caminhos dos perfis CAD.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const config = source('source/js/core/config.js');
const start = config.indexOf('const APHA_CABIN_GEOMETRY = Object.freeze(');
const end = config.indexOf('// Primitiva unica do piso fisico', start);
assert(start > 0 && end > start, 'Fragmento geométrico compartilhado ausente');
const window = {};
vm.runInNewContext(config.slice(start, end) + `
    window.__geom = {APHA_CABIN_GEOMETRY, mapAphaCabinSection,
                     aphaCabinShellEndAngle, aphaCabinShellPoint};`, {window});
const g = window.__geom, R = 137.16, CY = 62.84, T = 5.5;
const check = (actual, expected, label) => {
    assert(Number.isFinite(actual), label + ' não finito');
    assert(Math.abs(actual - expected) < 1e-9, label + ': ' + actual + ' vs ' + expected);
};
assert.equal(g.APHA_CABIN_GEOMETRY.fuselageRadiusCm, R);
assert.equal(g.APHA_CABIN_GEOMETRY.fuselageCenterYCm, CY);
assert.equal(g.APHA_CABIN_GEOMETRY.shellThicknessCm, T);
const aEnd = Math.asin(CY / R);
check(g.aphaCabinShellEndAngle(), aEnd, 'ângulo de interseção piso');
for (const [W,H] of [[960,540],[1920,1080],[3840,2160],[1060,760],[650,850]]) {
    const m = g.mapAphaCabinSection(W,H);
    const sc = Math.min((W-60)/380,(H-50)/244), cx = W/2;
    check(m.scale,sc,'escala '+W+'x'+H);
    for (const x of [-137.16,-126,-25.4,0,25.4,126,137.16])
        check(m.toX(x),cx+x*sc,'coordenada X');
    for (const y of [-14,0,62.84,148.7,190,230])
        check(m.toY(y),H-22-(y+14)*sc,'coordenada Y');
}
const referencePoint = (a, outer, side) => {
    const radius = R + (outer ? T : 0);
    return [side*radius*Math.cos(a),
            CY + (outer && Math.sin(a)<0 ? R : radius)*Math.sin(a)];
};
for (let i = 0; i <= 360; i++) {
    const a = -aEnd + (Math.PI+2*aEnd)*i/360;
    for (const side of [-1,1]) for (const outer of [false,true]) {
        const [x,y] = g.aphaCabinShellPoint(a,outer,side);
        const [xx,yy] = referencePoint(a,outer,side);
        check(x,xx,'casco x');check(y,yy,'casco y');
    }
}
// Os pontos da seção completa devem continuar formando as mesmas duas bordas
// e o mesmo preenchimento, inclusive na parede inferior com avanço só em X.
const aba5 = source('source/html/ABA5/unified-simulation.js');
const from = aba5.indexOf('window.cabinSectionReference = {');
const to = aba5.indexOf('            const m1 =', from);
assert(from > 0 && to > from, 'Objeto da seção compartilhada ausente');
let floors = 0;
const context = { window, drawAphaCabinFloor() { floors++; } };
vm.runInNewContext(`
    const APHA_CABIN_GEOMETRY = window.__geom.APHA_CABIN_GEOMETRY;
    const APHA_CABIN_PALETTE = {rgba: () => '#123456', shellOutline: '#9abcde'};
    const mapAphaCabinSection = window.__geom.mapAphaCabinSection;
    const m4 = mapAphaCabinSection;
    const aphaCabinShellPoint = window.__geom.aphaCabinShellPoint;
    const aphaCabinShellEndAngle = window.__geom.aphaCabinShellEndAngle;
    ${aba5.slice(from,to)}`, context);
function recorder() {
    const fills = [], strokes = [];
    let active = [];
    return {
        fills, strokes,
        save() {}, restore() {}, closePath() {},
        beginPath() { active = []; },
        moveTo(x,y) { active.push([x,y]); },
        lineTo(x,y) { active.push([x,y]); },
        fill() { fills.push([...active]); },
        stroke() { strokes.push([...active]); }
    };
}
for (const [W,H] of [[960,540],[1920,1080],[3840,2160]]) {
    const ctx = recorder();
    const m = g.mapAphaCabinSection(W,H);
    window.cabinSectionReference.drawShell(ctx,m.toX,m.toY,m.scale);
    assert.equal(ctx.fills.length,1,'um preenchimento de casco completo');
    assert.equal(ctx.strokes.length,2,'duas bordas de casco completo');
    assert.equal(ctx.fills[0].length,362,'180 intervalos em cada lado do casco');
    for (let i=0;i<=180;i++) {
        const a=Math.PI+aEnd-(Math.PI+2*aEnd)*i/180;
        const [x,y]=referencePoint(a,false,1);
        check(ctx.fills[0][i][0],m.toX(x),'interno x completo');
        check(ctx.fills[0][i][1],m.toY(y),'interno y completo');
        const [ox,oy]=referencePoint(a,true,1);
        const k=361-i;
        check(ctx.fills[0][k][0],m.toX(ox),'externo x completo');
        check(ctx.fills[0][k][1],m.toY(oy),'externo y completo');
    }
}
assert.equal(floors,3,'piso físico deve ser desenhado uma vez por seção');
// Os dois desenhos animados usam os mesmos pontos, sem substituir
// o arco superior de 90 passos nem o CAD exato dos bins.
assert(aba5.includes('const m4 = mapAphaCabinSection;'));
assert(aba5.includes('const aEnd = aphaCabinShellEndAngle(), N = 180;'));
assert(aba5.includes('const aEnd = aphaCabinShellEndAngle();') &&
       aba5.includes('const N = 40;'));
assert(aba5.includes('aphaCabinShellPoint(a, false, side)') &&
       aba5.includes('aphaCabinShellPoint(a, true, side)'));
const engine = source('source/js/engine/cabin-shared.js');
assert(engine.includes('outerR = R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90'));
assert(engine.includes('R_ext = g.R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90'));
assert(engine.includes('pt(g.R + APHA_CABIN_GEOMETRY.shellThicknessCm / 2, th1)'));
const manikin = source('source/html/ABA6/manikin.js');
assert.equal((manikin.match(/mapAphaCabinSection\(W, H\)/g) || []).length,2,
    'Os dois fallbacks da Aba 6 precisam compartilhar a projeção');
console.log('Geometria 5/6/8: projeções, 360 ângulos, 3 viewports, piso e casco conferidos.');
