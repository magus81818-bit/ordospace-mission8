const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const evidenceRoot = path.join(projectRoot, 'evidence', 'redo', 'r01');
const artifactRoot = path.join(projectRoot, 'artifacts', 'redo', 'r01');
const baseUrl = 'http://127.0.0.1:4176/';

const viewports = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 }
};

const publicRoutes = [
  { id: 'landing', title: 'ORDOSPACE' },
  { id: 'auth', title: '로그인' },
  { id: 'terms', title: '이용약관' },
  { id: 'privacy', title: '개인정보처리방침' },
  { id: 'support', title: '고객지원' },
  { id: 'select-workspace', title: '역할 전환', heading: '접속할 워크스페이스를 선택하세요' }
];

const roleRoutes = {
  client: [
    { id: 'dashboard', title: '홈' },
    { id: 'project', title: '프로젝트' },
    { id: 'approvals', title: '승인함' },
    { id: 'profile', title: '알림 · 마이', heading: '마이페이지' }
  ],
  worker: [
    { id: 'worker-home', title: '작업자 홈' },
    { id: 'worker-cards', title: '내 작업' },
    { id: 'profile', title: '알림 · 마이', heading: '마이페이지' }
  ],
  admin: [
    { id: 'admin-home', title: 'PM 홈' },
    { id: 'admin-projects', title: '프로젝트 관리' },
    { id: 'admin-cards', title: 'Module 관리' },
    { id: 'admin-team', title: '인력' },
    { id: 'admin-audit', title: '감사 로그' },
    { id: 'profile', title: '알림 · 마이', heading: '마이페이지' }
  ]
};

const expectedMenus = {
  client: ['홈', '프로젝트', '승인함', '알림'],
  worker: ['홈', '내 작업', '알림'],
  admin: ['홈', '프로젝트', 'Module 관리', '인력', '감사 로그']
};

const runtime = {
  startedAt: new Date().toISOString(),
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  responses4xx5xx: [],
  routes: [],
  menus: [],
  accessChecks: [],
  responsiveChecks: [],
  screenshots: []
};

function ensureDirectories() {
  for (const dir of [
    path.join(evidenceRoot, 'frozen-public'),
    path.join(evidenceRoot, 'dashboard', 'admin'),
    path.join(evidenceRoot, 'dashboard', 'client'),
    path.join(evidenceRoot, 'dashboard', 'worker'),
    path.join(evidenceRoot, 'dashboard', 'shared'),
    artifactRoot
  ]) fs.mkdirSync(dir, { recursive: true });
}

function attachRuntimeCapture(page) {
  page.on('console', message => {
    if (message.type() === 'error') runtime.consoleErrors.push({ url: page.url(), text: message.text() });
  });
  page.on('pageerror', error => runtime.pageErrors.push({ url: page.url(), text: error.message }));
  page.on('requestfailed', request => runtime.requestFailures.push({
    url: request.url(),
    method: request.method(),
    failure: request.failure()?.errorText || 'unknown'
  }));
  page.on('response', response => {
    if (response.status() >= 400) runtime.responses4xx5xx.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method()
    });
  });
}

async function waitForApp(page) {
  await page.waitForFunction(() => typeof window.navigate === 'function' && !!window.ORDO_SESSION_SERVICE);
  await page.evaluate(() => document.fonts?.ready);
}

async function goPublic(page, id) {
  await page.goto(`${baseUrl}#${id}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator(`#screen-${id}`)).toHaveClass(/active/);
}

async function selectRole(page, role) {
  await goPublic(page, 'select-workspace');
  const button = page.locator(`[data-ws-role="${role}"]`);
  await expect(button).toHaveCount(1);
  await button.click();
  await page.waitForFunction(expected => window.ORDO_ROLE === expected, role);
}

async function goRoleRoute(page, role, routeId) {
  await selectRole(page, role);
  await page.goto(`${baseUrl}#${routeId}`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator(`#screen-${routeId}`)).toHaveClass(/active/);
  await expect(page.locator('body')).toHaveClass(/auth-on/);
}

async function capture(page, relativePath, fullPage = true) {
  const absolute = path.join(evidenceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  await page.screenshot({ path: absolute, fullPage, animations: 'disabled' });
  runtime.screenshots.push(path.relative(projectRoot, absolute).replaceAll('\\', '/'));
}

test.beforeAll(() => ensureDirectories());

test.afterAll(() => {
  runtime.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactRoot, 'browser-audit.json'), `${JSON.stringify(runtime, null, 2)}\n`);
});

test('frozen public routes and auth states at all required viewports', async ({ page }) => {
  attachRuntimeCapture(page);

  for (const [viewportName, viewport] of Object.entries(viewports)) {
    await page.setViewportSize(viewport);
    for (const route of publicRoutes) {
      await goPublic(page, route.id);
      const screen = page.locator(`#screen-${route.id}`);
      await expect(screen).toBeVisible();
      await expect(page.locator('body')).toHaveClass(/auth-off/);
      await expect(page.locator('#sidebar')).toBeHidden();
      await expect(page.locator('#topbar')).toBeHidden();
      const text = (await screen.innerText()).replace(/\s+/g, ' ');
      expect(text.length).toBeGreaterThan(20);
      expect(text).toContain(route.heading || route.title);
      runtime.routes.push({ role: 'public', route: route.id, viewport: viewportName, ok: true, textSample: text.slice(0, 120) });
      await capture(page, `frozen-public/${route.id}-${viewportName}-${viewport.width}x${viewport.height}.png`);
    }
  }

  await page.setViewportSize(viewports.desktop);
  await goPublic(page, 'landing');
  await page.goto(`${baseUrl}#inquiry`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#inquiryModal')).toBeVisible();
  await capture(page, 'frozen-public/inquiry-modal-desktop-1440x1000.png', false);

  await goPublic(page, 'auth');
  const forgot = page.locator('[data-auth-go-view="forgot"]');
  await expect(forgot).toHaveCount(1);
  await forgot.click();
  await expect(page.locator('#authForgotForm')).toBeVisible();
  await capture(page, 'frozen-public/auth-forgot-desktop-1440x1000.png', false);
  await page.locator('#forgotEmail').fill('audit@example.com');
  await page.locator('#authForgotForm button[type="submit"]').click();
  await expect(page.locator('[data-auth-view="forgot-sent"]')).toBeVisible();
  await capture(page, 'frozen-public/auth-forgot-sent-desktop-1440x1000.png', false);
});

test('role menus, dashboard routes, responsive shell, and access guards', async ({ page }) => {
  attachRuntimeCapture(page);
  await page.setViewportSize(viewports.desktop);

  for (const [role, routes] of Object.entries(roleRoutes)) {
    await selectRole(page, role);
    const menuLabels = await page.locator('#sideMenu a').evaluateAll(nodes => nodes.map(node =>
      String(node.textContent || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
    ));
    expect(menuLabels).toEqual(expectedMenus[role]);
    runtime.menus.push({ role, labels: menuLabels, ok: true });

    for (const route of routes) {
      await goRoleRoute(page, role, route.id);
      const active = page.locator(`#screen-${route.id}`);
      await expect(active).toBeVisible();
      const text = (await active.innerText()).replace(/\s+/g, ' ');
      expect(text.length).toBeGreaterThan(15);
      await expect(page.locator('#mTitle')).toHaveText(route.heading || route.title);
      runtime.routes.push({ role, route: route.id, viewport: 'desktop', ok: true, textSample: text.slice(0, 140) });
      await capture(page, `dashboard/${role}/${route.id}-desktop-1440x1000.png`);
    }
  }

  const homes = { client: 'dashboard', worker: 'worker-home', admin: 'admin-home' };
  for (const viewportName of ['tablet', 'mobile']) {
    const viewport = viewports[viewportName];
    await page.setViewportSize(viewport);
    for (const [role, routeId] of Object.entries(homes)) {
      await goRoleRoute(page, role, routeId);
      const shell = await page.evaluate(() => {
        const visible = id => {
          const el = document.getElementById(id);
          if (!el) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        return { sidebar: visible('sidebar'), topbar: visible('topbar'), mobileHeader: visible('mheader'), mobileTabs: visible('mtab') };
      });
      const mobileShell = viewport.width < 1024;
      expect(shell.mobileHeader).toBe(mobileShell);
      expect(shell.mobileTabs).toBe(mobileShell);
      expect(shell.sidebar).toBe(!mobileShell);
      expect(shell.topbar).toBe(!mobileShell);
      runtime.responsiveChecks.push({ role, route: routeId, viewport: viewportName, ...shell, ok: true });
      await capture(page, `dashboard/${role}/${routeId}-${viewportName}-${viewport.width}x${viewport.height}.png`);
    }
  }

  await page.setViewportSize(viewports.desktop);
  const denied = [
    ['client', 'admin-home'], ['client', 'worker-home'],
    ['worker', 'admin-home'], ['worker', 'dashboard'],
    ['admin', 'dashboard'], ['admin', 'worker-home']
  ];
  for (const [role, target] of denied) {
    await selectRole(page, role);
    await page.goto(`${baseUrl}#${target}`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('#screen-forbidden-403')).toHaveClass(/active/);
    const deniedUrl = await page.locator('#forbiddenUrl').innerText();
    expect(deniedUrl).toContain(target);
    runtime.accessChecks.push({ role, target, result: 'forbidden-403', ok: true });
  }
  await capture(page, 'dashboard/shared/forbidden-403-desktop-1440x1000.png', false);
});

test('QA-only component gallery is reachable only with explicit DEV flag', async ({ page }) => {
  attachRuntimeCapture(page);
  await page.setViewportSize(viewports.desktop);
  await page.goto(`${baseUrl}#components-gallery`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#screen-forbidden-403')).toHaveClass(/active/);

  await page.evaluate(() => localStorage.setItem('dev_mode', 'on'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.goto(`${baseUrl}#components-gallery`, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#screen-components-gallery')).toHaveClass(/active/);
  await capture(page, 'dashboard/shared/components-gallery-dev-desktop-1440x1000.png');
  runtime.accessChecks.push({ role: 'qa', target: 'components-gallery', result: 'DEV flag required', ok: true });
});

test('baseline accessibility semantics and keyboard focus remain operable', async ({ page }) => {
  attachRuntimeCapture(page);
  await page.setViewportSize(viewports.desktop);
  await goPublic(page, 'landing');

  const publicSemantics = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map(node => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const visible = node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = node => String(
      node.getAttribute('aria-label') ||
      node.getAttribute('title') ||
      node.textContent ||
      node.querySelector('img')?.getAttribute('alt') || ''
    ).trim();
    return {
      duplicates: [...new Set(duplicates)],
      unnamedButtons: Array.from(document.querySelectorAll('button')).filter(node => visible(node) && !accessibleName(node)).length,
      unnamedLinks: Array.from(document.querySelectorAll('a[href]')).filter(node => visible(node) && !accessibleName(node)).length,
      imagesWithoutAlt: Array.from(document.querySelectorAll('img:not([alt])')).length,
      h1Count: Array.from(document.querySelectorAll('#screen-landing h1')).filter(visible).length
    };
  });
  expect(publicSemantics.duplicates).toEqual([]);
  expect(publicSemantics.unnamedButtons).toBe(0);
  expect(publicSemantics.unnamedLinks).toBe(0);
  expect(publicSemantics.imagesWithoutAlt).toBe(0);
  expect(publicSemantics.h1Count).toBeGreaterThan(0);

  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);

  await selectRole(page, 'admin');
  await expect(page.locator('#sidebar nav, #sidebar [role="navigation"]')).toHaveCount(1);
  await expect(page.locator('#mainArea')).toBeVisible();
  const dashboardSemantics = await page.evaluate(() => ({
    unnamedVisibleButtons: Array.from(document.querySelectorAll('button')).filter(node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      const name = String(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '').trim();
      return visible && !name;
    }).length
  }));
  expect(dashboardSemantics.unnamedVisibleButtons).toBe(0);
});
