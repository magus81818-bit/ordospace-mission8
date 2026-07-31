const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..', '..');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'dashboard-token-audit.spec.cjs',
  timeout: 180000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: path.join(root, 'artifacts/redo/r03/playwright-report.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:4178/',
    browserName: 'chromium',
    channel: 'chrome',
    locale: 'ko-KR',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    screenshot: 'off',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/redo/r03/static-server.cjs',
    cwd: root,
    url: 'http://127.0.0.1:4178/',
    reuseExistingServer: false,
    timeout: 30000
  },
  outputDir: path.join(root, 'artifacts/redo/r03/playwright-output')
});
