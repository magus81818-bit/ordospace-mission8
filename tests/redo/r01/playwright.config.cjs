const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..', '..');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'baseline-audit.spec.cjs',
  timeout: 180000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: path.join(projectRoot, 'artifacts/redo/r01/playwright-report.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:4176/',
    browserName: 'chromium',
    channel: 'chrome',
    colorScheme: 'light',
    locale: 'ko-KR',
    screenshot: 'off',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/redo/r01/static-server.cjs',
    cwd: projectRoot,
    url: 'http://127.0.0.1:4176/',
    reuseExistingServer: false,
    timeout: 30000
  },
  outputDir: path.join(projectRoot, 'artifacts/redo/r01/playwright-output')
});
