const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:8765',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/FINALPROJECT_APHA.html',
    timeout: 45000,
    reuseExistingServer: !process.env.CI,
  },
});
