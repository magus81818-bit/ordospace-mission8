const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.join('docs', 'mission8', 'evidence');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  const result = { steps: [], configuredUi: false, payBtnEnabled: false, tossOpened: false, tossUrl: '', panelText: '', error: '' };

  try {
    await page.goto('https://ordospace-mission8.vercel.app/#auth', { waitUntil: 'networkidle', timeout: 90000 });
    await page.locator('#loginEmail').waitFor({ state: 'visible', timeout: 30000 });
    await page.fill('#loginEmail', 'client@ordo.com');
    await page.fill('#loginPw', 'pw123456');
    await Promise.all([
      page.waitForFunction(() => !location.hash.includes('auth') || !!document.querySelector('#appShell:not(.hidden), #workspaceShell, [data-shell="app"]'), null, { timeout: 30000 }).catch(() => null),
      page.locator('#authLoginForm button[type="submit"]').click()
    ]);
    await page.waitForTimeout(2000);
    result.steps.push('hash_after_login=' + (await page.evaluate(() => location.hash)));

    // Force client project route used by router
    await page.evaluate(() => { location.hash = '#project'; });
    await page.waitForTimeout(2500);
    result.steps.push('hash_after_nav=' + (await page.evaluate(() => location.hash)));

    // Force show payment parent if present
    await page.evaluate(() => {
      const mount = document.getElementById('clientProjectKickoffPayment');
      if (!mount) return;
      let el = mount;
      while (el) {
        el.classList && el.classList.remove('hidden');
        if (el.style) el.style.display = '';
        el = el.parentElement;
      }
    });

    const mount = page.locator('#clientProjectKickoffPayment');
    await page.waitForFunction(() => {
      const m = document.getElementById('clientProjectKickoffPayment');
      return !!(m && m.innerHTML && m.innerHTML.length > 20);
    }, null, { timeout: 20000 });
    await page.waitForTimeout(2000);
    result.panelText = (await mount.innerText()).slice(0, 500);
    result.configuredUi = !result.panelText.includes('테스트 결제 설정이 준비되지 않았습니다') && /49,?000/.test(result.panelText);
    const btn = page.locator('#clientKickoffPayBtn');
    result.payBtnEnabled = await btn.isEnabled().catch(() => false);
    await page.screenshot({ path: path.join(outDir, 'ui-payment-panel.png'), fullPage: true });

    if (result.payBtnEnabled) {
      const popupPromise = page.waitForEvent('popup', { timeout: 30000 }).catch(() => null);
      await btn.click();
      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await popup.waitForTimeout(2500);
        result.tossOpened = true;
        result.tossUrl = popup.url();
        await popup.screenshot({ path: path.join(outDir, 'toss-window.png') }).catch(() => {});
      } else {
        await page.waitForTimeout(4000);
        result.tossUrl = page.url();
        result.tossOpened = /toss|payments/i.test(page.url() + ' ' + result.panelText);
        result.panelText = (await mount.innerText().catch(() => result.panelText)).slice(0, 500);
        await page.screenshot({ path: path.join(outDir, 'after-pay-click.png'), fullPage: true });
      }
    }
  } catch (e) {
    result.error = e.message;
    await page.screenshot({ path: path.join(outDir, 'ui-smoke-error.png'), fullPage: true }).catch(() => {});
  }

  fs.writeFileSync(path.join(outDir, 'ui-smoke.json'), JSON.stringify({ result, logs: logs.slice(-60) }, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.configuredUi && result.payBtnEnabled ? 0 : 2);
})();
