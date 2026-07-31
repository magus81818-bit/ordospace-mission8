const path = require('node:path');
const { defineConfig } = require('../r04/node_modules/@playwright/test');
const root = path.resolve(__dirname, '..', '..', '..');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: ['client-audit.spec.cjs'],
  timeout: 900000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: path.join(root, 'artifacts/redo/r07/playwright-report.json') }]],
  use: { baseURL: 'http://127.0.0.1:4182/', browserName: 'chromium', channel: 'chrome', locale: 'ko-KR', reducedMotion: 'reduce' },
  webServer: { command: 'node tests/redo/r07/static-server.cjs', cwd: root, url: 'http://127.0.0.1:4182/', reuseExistingServer: false, timeout: 30000 },
  outputDir: path.join(root, 'artifacts/redo/r07/playwright-output')
});
