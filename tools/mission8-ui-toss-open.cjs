const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.join('docs', 'mission8', 'evidence');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const reqs = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/toss|payment|payment-orders/i.test(u)) reqs.push(r.method() + ' ' + u);
  });
  const result = { configuredUi: false, payBtnEnabled: false, tossOpened: false, tossUrl: '', reqs: [], panelAfter: '', error: '' };

  await page.goto('https://ordospace-mission8.vercel.app/#auth', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#loginEmail').waitFor({ state: 'visible' });
  await page.fill('#loginEmail', 'client@ordo.com');
  await page.fill('#loginPw', 'pw123456');
  await page.locator('#authLoginForm button[type="submit"]').click();
  await page.waitForTimeout(2500);
  await page.evaluate(() => { location.hash = '#project'; });
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => document.getElementById('clientKickoffPayBtn'));
  await page.waitForTimeout(1500);
  result.configuredUi = true;
  const btn = page.locator('#clientKickoffPayBtn');
  result.payBtnEnabled = await btn.isEnabled();

  const popupPromise = page.waitForEvent('popup', { timeout: 45000 }).catch(() => null);
  const framePromise = page.waitForEvent('framenavigated', { timeout: 45000 }).catch(() => null);
  await btn.click();
  const [popup, frame] = await Promise.all([popupPromise, framePromise]);
  await page.waitForTimeout(8000);
  result.reqs = reqs.slice(-20);
  if (popup) {
    result.tossOpened = true;
    result.tossUrl = popup.url();
    await popup.screenshot({ path: path.join(outDir, 'toss-window.png') }).catch(() => {});
  } else {
    result.tossUrl = page.url();
    const frames = page.frames().map(f => f.url());
    result.frameUrls = frames.filter(u => /toss|payment/i.test(u));
    result.tossOpened = result.frameUrls.length > 0 || /toss|payments/i.test(page.url()) || reqs.some(x => /js\.tosspayments|api\.tosspayments|payment-orders/i.test(x));
    result.panelAfter = (await page.locator('#clientProjectKickoffPayment').innerText().catch(() => '')).slice(0, 600);
    await page.screenshot({ path: path.join(outDir, 'after-pay-click.png'), fullPage: true });
  }
  fs.writeFileSync(path.join(outDir, 'ui-toss-open.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
