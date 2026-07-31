const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PNG } = require('pngjs');
const { test, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..', '..');
const evidenceRoot = path.join(root, 'evidence', 'redo', 'r03');
const artifactRoot = path.join(root, 'artifacts', 'redo', 'r03');
const baseUrl = 'http://127.0.0.1:4178/';
const tokenHref = 'dashboard-salesops.tokens.css';
const viewports = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 }
};
const publicRoutes = ['landing', 'auth', 'terms', 'privacy', 'support', 'select-workspace'];
const roleRoutes = {
  admin: ['admin-home', 'admin-projects', 'admin-cards', 'admin-team', 'admin-audit'],
  client: ['dashboard', 'project', 'approvals', 'profile'],
  worker: ['worker-home', 'worker-cards', 'profile']
};
const expectedMenus = {
  admin: ['홈', '프로젝트', 'Module 관리', '인력', '감사 로그'],
  client: ['홈', '프로젝트', '승인함', '알림'],
  worker: ['홈', '내 작업', '알림']
};
const homes = { admin: 'admin-home', client: 'dashboard', worker: 'worker-home' };
const runtime = {
  generatedAt: new Date().toISOString(),
  consoleErrors: [], pageErrors: [], requestFailures: [], responses4xx5xx: [],
  routes: [], menus: [], responsive: [], tokenChecks: [], functionChecks: [], screenshots: []
};
const publicRegression = { generatedAt: runtime.generatedAt, baseline: 'evidence/redo/r01/frozen-public', comparisons: [] };
const layout = { generatedAt: runtime.generatedAt, tolerancePx: 1, routes: [] };
const accessibility = { generatedAt: runtime.generatedAt, contrast: [], focusVisible: null, iconNames: null, reducedMotion: null };

function ensureDirs() {
  for (const dir of [
    path.join(evidenceRoot, 'frozen-public'),
    path.join(evidenceRoot, 'dashboard', 'admin'),
    path.join(evidenceRoot, 'dashboard', 'client'),
    path.join(evidenceRoot, 'dashboard', 'worker'),
    path.join(evidenceRoot, 'dashboard', 'shared'),
    artifactRoot
  ]) fs.mkdirSync(dir, { recursive: true });
}

function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

async function pixelDiff(currentBuffer, baselinePath) {
  if (!fs.existsSync(baselinePath)) return { available: false, reason: 'baseline missing' };
  const pixelmatch = (await import('pixelmatch')).default;
  const current = PNG.sync.read(currentBuffer);
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  if (current.width !== baseline.width || current.height !== baseline.height) {
    return { available: true, sameDimensions: false, current: [current.width, current.height], baseline: [baseline.width, baseline.height], ratio: 1 };
  }
  const diff = new PNG({ width: current.width, height: current.height });
  const count = pixelmatch(baseline.data, current.data, diff.data, current.width, current.height, { threshold: 0.1 });
  return { available: true, sameDimensions: true, differentPixels: count, totalPixels: current.width * current.height, ratio: count / (current.width * current.height) };
}

function attachRuntime(page) {
  page.on('console', message => { if (message.type() === 'error') runtime.consoleErrors.push({ url: page.url(), text: message.text() }); });
  page.on('pageerror', error => runtime.pageErrors.push({ url: page.url(), text: error.message }));
  page.on('requestfailed', request => runtime.requestFailures.push({ url: request.url(), method: request.method(), reason: request.failure()?.errorText || 'unknown' }));
  page.on('response', response => { if (response.status() >= 400) runtime.responses4xx5xx.push({ url: response.url(), status: response.status() }); });
}

async function waitForApp(page) {
  await page.waitForFunction(() => typeof window.navigate === 'function' && !!window.ORDO_SESSION_SERVICE);
  await page.evaluate(() => document.fonts?.ready);
}

async function goPublic(page, route) {
  await page.goto(`${baseUrl}#${route}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator(`#screen-${route}`)).toHaveClass(/active/);
  await expect(page.locator('body')).toHaveClass(/auth-off/);
}

async function selectRole(page, role) {
  await goPublic(page, 'select-workspace');
  await page.locator(`[data-ws-role="${role}"]`).click();
  await page.waitForFunction(expected => window.ORDO_ROLE === expected, role);
  await expect(page.locator('body')).toHaveClass(/auth-on/);
}

async function goRoleRoute(page, role, route) {
  await selectRole(page, role);
  await page.goto(`${baseUrl}#${route}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator(`#screen-${route}`)).toHaveClass(/active/);
  await expect(page.locator('body')).toHaveClass(/auth-on/);
}

async function setTokenSheetDisabled(page, disabled) {
  await page.evaluate(({ tokenHref, disabled }) => {
    const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(node => node.href.includes(tokenHref));
    if (!link) throw new Error(`token stylesheet missing: ${tokenHref}`);
    link.disabled = disabled;
  }, { tokenHref, disabled });
  await page.waitForTimeout(60);
}

async function setDescendantSheetsDisabled(page, disabled) {
  await page.evaluate(disabledValue => {
    const laterSheets = ['dashboard-salesops.primitives.css','dashboard-salesops.shell.css','dashboard-salesops.admin.css','dashboard-salesops.client.css','dashboard-salesops.worker.css'];
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
      if (laterSheets.some(name => link.href.includes(name))) link.disabled = disabledValue;
    });
  }, disabled);
  await page.waitForTimeout(60);
}

async function visualSignature(page, route) {
  return page.evaluate(routeId => {
    const screen = document.getElementById(`screen-${routeId}`);
    const candidates = [document.body, screen, screen?.querySelector('.bg-white'), screen?.querySelector('.bg-bg-secondary')].filter(Boolean);
    const style = element => {
      const value = getComputedStyle(element);
      return {
        display: value.display, position: value.position, color: value.color,
        backgroundColor: value.backgroundColor, backgroundImage: value.backgroundImage,
        borderColor: value.borderColor, borderRadius: value.borderRadius,
        boxShadow: value.boxShadow, fontFamily: value.fontFamily, fontSize: value.fontSize,
        lineHeight: value.lineHeight, padding: value.padding, margin: value.margin
      };
    };
    const box = element => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Number(v.toFixed(2))); };
    return {
      authClass: document.body.className,
      tokenValue: getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim(),
      dom: Array.from(screen?.querySelectorAll('*') || []).map(node => [node.tagName, node.id, node.children.length]),
      styles: candidates.map(style), boxes: candidates.map(box),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  }, route);
}

async function dashboardLayoutSnapshot(page, route) {
  return page.evaluate(routeId => {
    const active = document.getElementById(`screen-${routeId}`);
    const selectors = ['#sidebar', '#topbar', '#mheader', '#mtab', '#mainArea', `#screen-${routeId}`];
    const boxes = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      boxes[selector] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, display: getComputedStyle(element).display };
    }
    return {
      boxes,
      directOrder: Array.from(active?.children || []).map((node, index) => node.id || `${node.tagName.toLowerCase()}:${index}`),
      screenIds: Array.from(document.querySelectorAll('.screen')).map(node => node.id),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      menu: Array.from(document.querySelectorAll('#sideMenu a')).map(node => String(node.textContent || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim()),
      token: getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim(),
      rootBackground: getComputedStyle(document.body).backgroundColor,
      mainBackground: getComputedStyle(document.getElementById('mainArea')).backgroundColor,
      rootForeground: getComputedStyle(document.body).color,
      fontFamily: getComputedStyle(document.body).fontFamily
    };
  }, route);
}

function maxBoxDelta(before, after) {
  let maximum = 0;
  for (const key of Object.keys(before.boxes)) {
    for (const field of ['x', 'y', 'width', 'height']) maximum = Math.max(maximum, Math.abs(before.boxes[key][field] - after.boxes[key][field]));
  }
  return Number(maximum.toFixed(3));
}

async function screenshot(page, relative, fullPage = true) {
  const output = path.join(evidenceRoot, relative);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const buffer = await page.screenshot({ path: output, fullPage, animations: 'disabled' });
  runtime.screenshots.push(path.relative(root, output).replaceAll('\\', '/'));
  return buffer;
}

test.beforeAll(() => ensureDirs());

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.ORDO_DISABLE_MODULE_CARD_REMOTE = true; });
});

test.afterAll(() => {
  runtime.finishedAt = new Date().toISOString();
  publicRegression.finishedAt = runtime.finishedAt;
  layout.finishedAt = runtime.finishedAt;
  accessibility.finishedAt = runtime.finishedAt;
  fs.writeFileSync(path.join(artifactRoot, 'dashboard-browser-audit.json'), `${JSON.stringify(runtime, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactRoot, 'frozen-public-regression.json'), `${JSON.stringify(publicRegression, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactRoot, 'layout-preservation.json'), `${JSON.stringify(layout, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactRoot, 'accessibility-audit.json'), `${JSON.stringify(accessibility, null, 2)}\n`);
});

test('18 frozen public route/viewport comparisons remain outside the dashboard scope', async ({ page }) => {
  attachRuntime(page);
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    await page.setViewportSize(viewport);
    for (const route of publicRoutes) {
      await goPublic(page, route);
      const currentSignature = await visualSignature(page, route);
      expect(currentSignature.tokenValue).toBe('');
      expect(currentSignature.overflow).toBeLessThanOrEqual(1);
      const currentBuffer = await screenshot(page, `frozen-public/${route}-${viewportName}-${viewport.width}x${viewport.height}.png`);
      await setTokenSheetDisabled(page, true);
      const controlSignature = await visualSignature(page, route);
      await setTokenSheetDisabled(page, false);
      const baselinePath = path.join(root, 'evidence', 'redo', 'r01', 'frozen-public', `${route}-${viewportName}-${viewport.width}x${viewport.height}.png`);
      const frozenDiff = await pixelDiff(currentBuffer, baselinePath);
      const domSame = sha(JSON.stringify(currentSignature.dom)) === sha(JSON.stringify(controlSignature.dom));
      const computedStyleSame = JSON.stringify(currentSignature.styles) === JSON.stringify(controlSignature.styles);
      const boundingBoxSame = JSON.stringify(currentSignature.boxes) === JSON.stringify(controlSignature.boxes);
      expect(domSame).toBe(true);
      expect(computedStyleSame).toBe(true);
      expect(boundingBoxSame).toBe(true);
      publicRegression.comparisons.push({
        route, viewport: viewportName, size: viewport, screenshot: runtime.screenshots.at(-1),
        frozenBaseline: frozenDiff, tokenDisabledControl: { domCompared: true, computedStyleCompared: true, boundingBoxCompared: true },
        domSame, computedStyleSame, boundingBoxSame,
        animationUnstableRegion: route === 'landing' ? 'existing autoplay demonstration; frozen pixel result is reported separately from token-disabled DOM/style/box parity' : 'none',
        pass: domSame && computedStyleSame && boundingBoxSame
      });
    }
  }
  expect(publicRegression.comparisons).toHaveLength(18);
});

test('dashboard foundation applies to required routes without layout or responsive drift', async ({ page }) => {
  attachRuntime(page);
  await page.setViewportSize(viewports.desktop);
  for (const [role, routes] of Object.entries(roleRoutes)) {
    await selectRole(page, role);
    const labels = await page.locator('#sideMenu a').evaluateAll(nodes => nodes.map(node => String(node.textContent || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim()));
    expect(labels).toEqual(expectedMenus[role]);
    runtime.menus.push({ role, labels, pass: true });
    for (const route of routes) {
      await goRoleRoute(page, role, route);
      await setDescendantSheetsDisabled(page, true);
      await setTokenSheetDisabled(page, true);
      const before = await dashboardLayoutSnapshot(page, route);
      await setTokenSheetDisabled(page, false);
      const after = await dashboardLayoutSnapshot(page, route);
      const delta = maxBoxDelta(before, after);
      expect(after.token).not.toBe('');
      expect(after.directOrder).toEqual(before.directOrder);
      expect(after.screenIds).toEqual(before.screenIds);
      expect(after.menu).toEqual(before.menu);
      expect(delta).toBeLessThanOrEqual(1);
      expect(after.horizontalOverflow).toBeLessThanOrEqual(1);
      await setDescendantSheetsDisabled(page, false);
      const relative = `dashboard/${role}/${route}-desktop-1440x1000.png`;
      await screenshot(page, relative);
      layout.routes.push({ role, route, viewport: 'desktop', before, after, maxBoxDelta: delta, pass: true });
      runtime.routes.push({ role, route, viewport: 'desktop', screenshot: relative, tokenApplied: true, pass: true });
    }
  }

  for (const viewportName of ['tablet', 'mobile']) {
    const viewport = viewports[viewportName];
    await page.setViewportSize(viewport);
    for (const [role, route] of Object.entries(homes)) {
      await goRoleRoute(page, role, route);
      const state = await dashboardLayoutSnapshot(page, route);
      const visible = await page.evaluate(() => {
        const shown = id => { const e = document.getElementById(id); const r = e?.getBoundingClientRect(); return !!e && getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; };
        return { sidebar: shown('sidebar'), topbar: shown('topbar'), mheader: shown('mheader'), mtab: shown('mtab') };
      });
      const mobile = viewport.width < 1024;
      expect(visible.sidebar).toBe(!mobile);
      expect(visible.topbar).toBe(!mobile);
      expect(visible.mheader).toBe(mobile);
      expect(visible.mtab).toBe(mobile);
      expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
      const relative = `dashboard/${role}/${route}-${viewportName}-${viewport.width}x${viewport.height}.png`;
      await screenshot(page, relative);
      runtime.responsive.push({ role, route, viewport: viewportName, ...visible, horizontalOverflow: state.horizontalOverflow, fixed260MobileSidebar: mobile && visible.sidebar, pass: true });
    }
  }
});

test('scope removal, role switch, 403, QA, navigation and dropdown behavior remain functional', async ({ page }) => {
  attachRuntime(page);
  await page.setViewportSize(viewports.desktop);
  await goPublic(page, 'auth');
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim())).toBe('');
  runtime.functionChecks.push({ feature: 'logged-out scope removal', pass: true });

  await selectRole(page, 'client');
  const clientToken = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim());
  expect(clientToken).not.toBe('');
  await page.locator('#sideMenu a[href="#project"]').click();
  await expect(page.locator('#screen-project')).toHaveClass(/active/);
  runtime.functionChecks.push({ feature: 'sidebar navigation', pass: true });

  await page.locator('#notifTrigger').click();
  await expect(page.locator('#notifPanel')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 700, y: 700 } });
  await expect(page.locator('#notifPanel')).toBeHidden();
  runtime.functionChecks.push({ feature: 'notification dropdown', pass: true });

  await page.evaluate(() => window.ORDO_SESSION_SERVICE.setActiveRoleAndGoHome('worker'));
  await page.waitForFunction(() => window.ORDO_ROLE === 'worker');
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim())).not.toBe('');
  runtime.functionChecks.push({ feature: 'role switch and token persistence', pass: true });

  await page.goto(`${baseUrl}#admin-home`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#screen-forbidden-403')).toHaveClass(/active/);
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--ordo-so-bg-dashboard').trim())).not.toBe('');
  await screenshot(page, 'dashboard/shared/forbidden-403-desktop-1440x1000.png', false);
  runtime.functionChecks.push({ feature: '403 guard and authenticated scope', pass: true });

  await page.goto(`${baseUrl}#components-gallery`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#screen-forbidden-403')).toHaveClass(/active/);
  await page.evaluate(() => localStorage.setItem('dev_mode', 'on'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.goto(`${baseUrl}#components-gallery`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-components-gallery')).toHaveClass(/active/);
  await screenshot(page, 'dashboard/shared/components-gallery-dev-desktop-1440x1000.png');
  runtime.functionChecks.push({ feature: 'QA gallery remains dev-only', pass: true });

  await page.evaluate(() => localStorage.setItem('dev_mode', 'off'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.setViewportSize(viewports.mobile);
  await goRoleRoute(page, 'client', 'dashboard');
  await page.locator('#mtab a[href="#project"]').click();
  await expect(page.locator('#screen-project')).toHaveClass(/active/);
  await page.locator('#openDrawer').click();
  await expect(page.locator('#drawerOverlay')).toBeVisible();
  await page.locator('#drawerMenu a[href="#dashboard"]').click();
  await expect(page.locator('#screen-dashboard')).toHaveClass(/active/);
  runtime.functionChecks.push({ feature: 'mobile tabs and drawer navigation', pass: true });
});

test('focus, contrast, accessible names and reduced motion foundations pass', async ({ page }) => {
  attachRuntime(page);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize(viewports.desktop);
  await goRoleRoute(page, 'admin', 'admin-home');
  const button = page.locator('#notifTrigger');
  await page.evaluate(() => document.activeElement?.blur());
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press('Tab');
    if (await button.evaluate(element => document.activeElement === element)) break;
  }
  await expect(button).toBeFocused();
  const focus = await button.evaluate(element => { const s = getComputedStyle(element); return { focusVisible: element.matches(':focus-visible'), outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow }; });
  expect(focus.focusVisible).toBe(true);
  expect(focus.outlineStyle !== 'none' || focus.boxShadow !== 'none').toBe(true);
  accessibility.focusVisible = { target: '#notifTrigger', ...focus, pass: true };

  const names = await page.evaluate(() => {
    const visible = element => { const s = getComputedStyle(element); const r = element.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const controls = Array.from(document.querySelectorAll('button, a[href]')).filter(visible);
    const unnamed = controls.filter(element => !String(element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || element.querySelector('img')?.alt || '').trim());
    return { visibleControls: controls.length, unnamed: unnamed.length };
  });
  expect(names.unnamed).toBe(0);
  accessibility.iconNames = { ...names, pass: true };

  const contrasts = await page.evaluate(() => {
    const toRgba = color => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const luminance = rgba => {
      const values = rgba.slice(0, 3).map(value => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const ratio = (fg, bg) => { const a = luminance(toRgba(fg)); const b = luminance(toRgba(bg)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const s = getComputedStyle(document.body);
    const pairs = [
      ['primary/dashboard', '--ordo-so-text-primary', '--ordo-so-bg-dashboard', 4.5],
      ['secondary/surface', '--ordo-so-text-secondary', '--ordo-so-bg-surface', 4.5],
      ['muted/dashboard', '--ordo-so-text-muted', '--ordo-so-bg-dashboard', 3]
    ];
    return pairs.map(([name, fgName, bgName, minimum]) => {
      const fg = s.getPropertyValue(fgName).trim(); const bg = s.getPropertyValue(bgName).trim(); const value = ratio(fg, bg);
      return { name, fg, bg, ratio: Number(value.toFixed(2)), minimum, pass: value >= minimum };
    });
  });
  expect(contrasts.every(item => item.pass)).toBe(true);
  accessibility.contrast = contrasts;

  const motion = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      fast: s.getPropertyValue('--ordo-so-transition-fast').trim(),
      standard: s.getPropertyValue('--ordo-so-transition-standard').trim(),
      emphasis: s.getPropertyValue('--ordo-so-transition-emphasis').trim()
    };
  });
  expect(motion.matches).toBe(true);
  expect([motion.fast, motion.standard, motion.emphasis].every(value => value.startsWith('0ms'))).toBe(true);
  accessibility.reducedMotion = { ...motion, pass: true };
});
