const { test, expect } = require('@playwright/test');

// O HTML da base da PR e o HTML da branch sao servidos pelo mesmo web server.
// Compara os pixels gerados pelo Three.js e os recursos efetivamente ligados
// ao grafo da cena (rig1, rig2 e rig3), sem alterar o codigo de producao.
const CHECKPOINTS = [1.0, 4.0, 8.0, 11.0];

async function inspectPax(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const frame = document.getElementById('pax-frame');
    return frame && frame.contentWindow && frame.contentWindow.PAX
      && frame.contentWindow.PAX.rig1
      && frame.contentWindow.PAX.rig2
      && frame.contentWindow.PAX.rig3;
  }, undefined, { timeout: 45000 });
  await page.evaluate(() => window.switchTab('pax'));
  await expect(page.locator('#module-pax')).toBeVisible();

  return page.frameLocator('#pax-frame').locator('#pax-layer').evaluate(
    (_layer, checkpoints) => {
      const P = window.PAX;
      const roots = [P.rig1.root, P.rig2.root, P.rig3.root];
      const inspect = root => {
        const geometry = new Set(), materials = new Set(), textures = new Set();
        let meshes = 0, mappedMeshes = 0, outlineMeshes = 0;
        root.traverse(node => {
          if (!node.isMesh) return;
          meshes++;
          geometry.add(node.geometry);
          if (node.userData.isOutline) outlineMeshes++;
          const assigned = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of assigned) {
            materials.add(material);
            if (material.map) { textures.add(material.map); mappedMeshes++; }
          }
        });
        return { meshes, geometries: geometry.size, materials: materials.size,
          textures: textures.size, mappedMeshes, outlineMeshes };
      };

      // As receitas pintadas desenham canvas RGB: compara tambem os bytes
      // das texturas que as malhas alcancaveis usam, nao apenas sua quantidade.
      const materialPixelHash = root => {
        const seen = new Set();
        let hash = 2166136261 >>> 0, samples = 0;
        root.traverse(node => {
          if (!node.isMesh) return;
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            const image = m.map && m.map.image;
            if (!(image instanceof HTMLCanvasElement) || seen.has(image)) continue;
            seen.add(image);
            const bytes = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
            for (let i = 0; i < bytes.length; i += 64) {
              hash = Math.imul(hash ^ bytes[i], 16777619) >>> 0;
              hash = Math.imul(hash ^ bytes[i + 1], 16777619) >>> 0;
              hash = Math.imul(hash ^ bytes[i + 2], 16777619) >>> 0;
              samples++;
            }
          }
        });
        return { samples, hash };
      };

      // Pausa o RAF de renderizacao ao vivo e produz quadros em tempos
      // escolhidos (deterministicos), lendo diretamente o framebuffer WebGL.
      P.beginExport(720);
      const gl = P.renderer.getContext(), canvas = P.renderer.domElement;
      const w = canvas.width, h = canvas.height;
      if (!w || !h) throw new Error('PAX WebGL canvas sem dimensoes');

      const states = checkpoints.map(t => {
        P.renderAt(t, 1.68);
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let hash = 2166136261 >>> 0, visible = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0) visible++;
          hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
          hash = Math.imul(hash ^ pixels[i + 1], 16777619) >>> 0;
          hash = Math.imul(hash ^ pixels[i + 2], 16777619) >>> 0;
          hash = Math.imul(hash ^ pixels[i + 3], 16777619) >>> 0;
        }
        return { t, hash, visible, visibleRigs: roots.map(r => r.visible) };
      });
      return {
        canvas: [w, h],
        rigAttached: roots.map(r => P.scene.children.includes(r)),
        resources: roots.map(inspect),
        paintedPixels: roots.map(materialPixelHash),
        states
      };
    }, CHECKPOINTS);
}

test('ABA1: three characters render identically before and after PT/TVT refactoring', async ({ page }) => {
  test.skip(!process.env.PAX_ABA1_BASELINE, 'PR baseline HTML not available');
  const before = await inspectPax(page, '/PAX_ABA1_BASELINE.html');
  const after = await inspectPax(page, '/FINALPROJECT_APHA.html');

  expect(before.rigAttached).toEqual([true, true, true]);
  expect(after.rigAttached).toEqual([true, true, true]);
  for (const [i, model] of before.resources.entries()) {
    expect(model.meshes, 'Character ' + (i + 1) + ' must have renderable meshes').toBeGreaterThan(5);
    expect(model.textures, 'Character ' + (i + 1) + ' must use active painted textures').toBeGreaterThan(0);
  }
  for (const state of before.states) {
    expect(state.visible, 'PAX scene must render real pixels at ' + state.t + 's').toBeGreaterThan(100);
  }

  expect(after.canvas).toEqual(before.canvas);
  expect(after.resources).toEqual(before.resources);
  expect(after.paintedPixels).toEqual(before.paintedPixels);
  expect(after.states).toEqual(before.states);
});


test('ABA1: idle WebGL skips frames but responds to scrub, Play, zoom and export', async ({ page }) => {
  await page.goto('/FINALPROJECT_APHA.html', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#pax-frame')?.contentWindow?.PAX,
    undefined, { timeout: 45000 });
  await page.evaluate(() => window.switchTab('pax'));
  await expect(page.locator('#module-pax')).toBeVisible();

  const counts = await page.frameLocator('#pax-frame').locator('#pax-layer').evaluate(async () => {
    const P = window.PAX;
    const original = P.renderer.render;
    let rendered = 0;
    P.renderer.render = function (...args) { rendered++; return original.apply(this, args); };
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    const scrub = t => {
      const range = document.getElementById('scrubber');
      range.value = String(t);
      range.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.getElementById('resetBtn').click();
    await pause(2100); // maior que os 1,8 s de zoom CSS
    let count = rendered;
    await pause(240);
    const idle = rendered - count;

    scrub(4);
    count = rendered;
    await pause(150);
    const scrubRedraw = rendered - count;
    count = rendered;
    await pause(250);
    const afterScrubIdle = rendered - count;

    const play = document.getElementById('playBtn');
    play.click();
    count = rendered;
    await pause(650); // SwiftShader pode renderizar menos de 10 FPS em CI
    const resumed = rendered - count;
    play.click();
    await pause(100);
    count = rendered;
    await pause(230);
    const afterPauseIdle = rendered - count;

    // Trocar classe do camera-rig inicia transicao de 1,8 s mesmo sem Play.
    scrub(10);
    count = rendered;
    await pause(600); // permitir GPU via software processar ao menos um quadro
    const zoomTransition = rendered - count;

    await pause(1900); // espera completar a transicao de 1,8 s antes de testar exportacao
    count = rendered;
    await pause(220);
    const afterZoomIdle = rendered - count;

    // A gravacao deterministica deve funcionar mesmo pausada e acordar o RAF
    // ao restaurar o pixelRatio original.
    P.beginExport(720);
    P.renderAt(8, 1.68);
    P.endExport();
    count = rendered;
    await pause(120);
    const afterExport = rendered - count;

    P.renderer.render = original;
    return { idle, scrubRedraw, afterScrubIdle, resumed, afterPauseIdle,
      zoomTransition, afterZoomIdle, afterExport };
  });

  expect(counts.idle, 'paused scene should not render on every RAF').toBeLessThanOrEqual(1);
  expect(counts.scrubRedraw, 'scrubber must refresh the frame').toBeGreaterThan(0);
  expect(counts.afterScrubIdle, 'scrubbed scene should settle').toBeLessThanOrEqual(1);
  expect(counts.resumed, 'Play must render again after pause').toBeGreaterThan(0);
  expect(counts.afterPauseIdle, 'Pause must suppress WebGL work').toBeLessThanOrEqual(1);
  expect(counts.zoomTransition, 'paused CSS zoom must keep WebGL updating').toBeGreaterThan(0);
  expect(counts.afterZoomIdle, 'stopped zoom must settle').toBeLessThanOrEqual(1);
  expect(counts.afterExport, 'pixelRatio restoration must redraw').toBeGreaterThan(0);
});
