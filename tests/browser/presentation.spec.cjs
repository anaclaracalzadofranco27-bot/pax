const { test, expect } = require('@playwright/test');

const TABS = ['pax', 'cad3d', 'nova', 'topview', 'unified', 'sim', 'closing', 'tour'];

async function loadPresentation(page) {
  await page.goto('/FINALPROJECT_APHA.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.switchTab === 'function' &&
    typeof window.__tourEnded === 'function' &&
    document.querySelectorAll('#tour-takes [data-take-play]').length === 5,
    { timeout: 45000 });
  await page.waitForLoadState('load');
}

test('eight tabs open and rapid navigation discards stale launches', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await loadPresentation(page);
  for (const tab of TABS) {
    await page.evaluate(name => window.switchTab(name), tab);
    await expect(page.locator('#module-' + tab)).toBeVisible();
  }
  // A Aba 6 e seu motor tem inicializacao atrasada: deve ser invalidada
  // caso a aba seja deixada antes de passar dois frames.
  await page.evaluate(() => {
    switchTab('sim');
    switchTab('unified');
    switchTab('closing');
    switchTab('tour');
  });
  await page.waitForTimeout(200);
  await expect(page.locator('#module-tour')).toBeVisible();
  await expect(page.locator('#module-sim')).toBeHidden();
  expect(errors, 'Javascript errors during navigation').toEqual([]);
});

test('the five independent takes can start and stop without leftover stage', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await loadPresentation(page);
  await page.evaluate(() => window.switchTab('tour'));
  await expect(page.locator('#module-tour')).toBeVisible();
  expect(await page.locator('[data-take-rec]').count()).toBe(5);
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-take-play="' + i + '"]').click();
    await expect(page.locator('#tour-btn')).toHaveAttribute('data-mode', 'stop');
    await expect(page.locator('#tour-stage')).toHaveClass(/\\bon\\b/);
    const box = await page.locator('#tour-stage').boundingBox();
    expect(box && box.width).toBeGreaterThan(100);
    await page.waitForTimeout(180);
    await page.locator('#tour-btn').click();
    await expect(page.locator('#tour-btn')).toHaveAttribute('data-mode', 'run');
    await expect(page.locator('#tour-stage')).not.toHaveClass(/\\bon\\b/);
  }
  expect(errors, 'Javascript errors while starting/stopping the takes').toEqual([]);
});
