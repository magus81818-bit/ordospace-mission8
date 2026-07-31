const path = require('node:path');

module.exports = {
  testDir: __dirname,
  testMatch: 'production-smoke.spec.cjs',
  timeout: 180000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false
  },
  outputDir: path.resolve(
    __dirname,
    '../../../artifacts/redo/r10/production-playwright-output'
  )
};
