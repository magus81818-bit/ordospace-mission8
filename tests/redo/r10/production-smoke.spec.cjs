const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('../r04/node_modules/@playwright/test');

const root = path.resolve(__dirname, '..', '..', '..');
const artifactDir = path.join(root, 'artifacts', 'redo', 'r10');
const evidenceDir = path.join(root, 'evidence', 'redo', 'r10', 'production');
const productionUrl = 'https://ordospace-rebuild.vercel.app/';
const releaseCommit = '825b4c77b7c09f0fc3abc3c8cbba419eab50d007';
const publicRoutes = ['landing', 'auth', 'terms', 'privacy', 'support', 'select-workspace'];
const roleRoutes = {
  admin: ['admin-home', 'admin-projects', 'admin-cards', 'admin-team', 'admin-audit'],
  client: ['dashboard', 'project', 'approvals'],
  worker: ['worker-home', 'worker-cards']
};
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};
const runtime = {
  generatedAt: new Date().toISOString(),
  productionUrl,
  releaseCommit,
  publicCases: [],
  authenticatedCases: [],
  sharedCases: [],
  interactionCases: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  httpFailures: [],
  blockedWriteRequests: [],
  unhandledRejections: []
};

function write(name, value) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

async function screenshot(page, folder, name) {
  const file = path.join(evidenceDir, folder, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  return relative(file);
}

async function ready(page) {
  await page.waitForFunction(() => (
    typeof window.navigate === 'function' &&
    Boolean(window.ORDO_SESSION_SERVICE)
  ));
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(100);
}

async function openPublic(page, route) {
  await page.goto(`${productionUrl}?r10=${Date.now()}#${route}`, {
    waitUntil: 'domcontentloaded'
  });
  await ready(page);
  await page.locator(`#screen-${route}`).waitFor({ state: 'visible' });
}

async function openAuthenticated(page, role, route) {
  await page.goto(`${productionUrl}?r10=${Date.now()}#select-workspace`, {
    waitUntil: 'domcontentloaded'
  });
  await ready(page);
  await page.evaluate(({ role }) => {
    window.ORDO_SESSION_SERVICE.createMockSession(
      `round10-${role}@example.com`,
      [role]
    );
    window.ORDO_SESSION_SERVICE.setActiveRole(role);
  }, { role });
  await page.goto(`${productionUrl}#${route}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.locator(`#screen-${route}`).waitFor({ state: 'visible' });
}

function geometryPass(value) {
  return (
    value.active &&
    value.overflow <= 1 &&
    value.screenLeft >= 0 &&
    value.screenRight <= value.clientWidth + 1
  );
}

async function screenState(page, route) {
  return page.evaluate(({ route }) => {
    const screen = document.getElementById(`screen-${route}`);
    const bounds = screen.getBoundingClientRect();
    return {
      active: screen.classList.contains('active'),
      hidden: screen.classList.contains('hidden'),
      overflow: document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      screenLeft: Number(bounds.left.toFixed(2)),
      screenRight: Number(bounds.right.toFixed(2)),
      clientWidth: document.documentElement.clientWidth,
      bodyClass: document.body.className,
      currentRole: window.ORDO_ROLE || null,
      sessionRole: localStorage.getItem('ordo_active_role'),
      textLength: screen.innerText.replace(/\s+/g, ' ').trim().length
    };
  }, { route });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.ORDO_DISABLE_MODULE_CARD_REMOTE = true;
    window.__r10Health = { unhandled: [] };
    addEventListener('unhandledrejection', event => {
      window.__r10Health.unhandled.push(
        String(event.reason?.message || event.reason || 'unknown')
      );
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', async route => {
    const method = route.request().method().toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      runtime.blockedWriteRequests.push({
        method,
        url: route.request().url()
      });
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  page.on('console', message => {
    if (message.type() === 'error') {
      runtime.consoleErrors.push({
        text: message.text(),
        url: page.url()
      });
    }
  });
  page.on('pageerror', error => {
    runtime.pageErrors.push({ message: error.message, url: page.url() });
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'unknown';
    const isBlockedWrite = failure === 'net::ERR_BLOCKED_BY_CLIENT' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method().toUpperCase());
    if (!isBlockedWrite) {
      runtime.requestFailures.push({
        method: request.method(),
        url: request.url(),
        failure
      });
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      runtime.httpFailures.push({
        status: response.status(),
        url: response.url()
      });
    }
  });
});

test.afterEach(async ({ page }) => {
  const unhandled = await page.evaluate(
    () => window.__r10Health?.unhandled || []
  ).catch(() => []);
  runtime.unhandledRejections.push(...unhandled);
});

test.afterAll(() => {
  const publicPass = runtime.publicCases.length === 12 &&
    runtime.publicCases.every(item => item.pass);
  const authenticatedPass = runtime.authenticatedCases.length === 20 &&
    runtime.authenticatedCases.every(item => item.pass);
  const sharedPass = runtime.sharedCases.length >= 10 &&
    runtime.sharedCases.every(item => item.pass);
  const interactionPass = runtime.interactionCases.length >= 3 &&
    runtime.interactionCases.every(item => item.pass);
  const smoke = {
    generatedAt: runtime.generatedAt,
    productionUrl,
    releaseCommit,
    public: {
      routeCount: publicRoutes.length,
      cases: runtime.publicCases,
      expectedCases: 12,
      pass: publicPass
    },
    authenticated: {
      routeCount: Object.values(roleRoutes).flat().length,
      cases: runtime.authenticatedCases,
      expectedCases: 20,
      pass: authenticatedPass
    },
    shared: {
      cases: runtime.sharedCases,
      pass: sharedPass
    },
    interactions: {
      cases: runtime.interactionCases,
      nonMutating: runtime.blockedWriteRequests.length === 0,
      pass: interactionPass && runtime.blockedWriteRequests.length === 0
    },
    pass: publicPass && authenticatedPass && sharedPass &&
      interactionPass && runtime.blockedWriteRequests.length === 0
  };
  const knownExternalFontFailures = runtime.requestFailures.filter(item =>
    /fonts\.(googleapis|gstatic)\.com/i.test(item.url)
  );
  const newRequestFailures = runtime.requestFailures.filter(item =>
    !/fonts\.(googleapis|gstatic)\.com/i.test(item.url)
  );
  const health = {
    generatedAt: runtime.generatedAt,
    productionUrl,
    consoleErrors: runtime.consoleErrors,
    pageErrors: runtime.pageErrors,
    requestFailures: runtime.requestFailures,
    knownExternalFontFailures,
    newRequestFailures,
    httpFailures: runtime.httpFailures,
    blockedWriteRequests: runtime.blockedWriteRequests,
    unhandledRejections: runtime.unhandledRejections,
    pass: runtime.consoleErrors.length === 0 &&
      runtime.pageErrors.length === 0 &&
      newRequestFailures.length === 0 &&
      runtime.httpFailures.length === 0 &&
      runtime.blockedWriteRequests.length === 0 &&
      runtime.unhandledRejections.length === 0
  };
  write('production-smoke.json', smoke);
  write('production-browser-health.json', health);
});

test('Production public routes at desktop and mobile', async ({ page }) => {
  for (const [viewport, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    for (const route of publicRoutes) {
      await openPublic(page, route);
      const state = await screenState(page, route);
      const evidence = await screenshot(
        page,
        'public',
        `public-${route}-${viewport}-${size.width}x${size.height}.png`
      );
      const pass = geometryPass(state) &&
        !state.hidden &&
        state.textLength > 0 &&
        !state.bodyClass.includes('auth-on');
      runtime.publicCases.push({
        route,
        viewport: `${size.width}x${size.height}`,
        state,
        evidence,
        pass
      });
      expect(pass).toBeTruthy();
    }
  }
});

test('Production authenticated role routes at desktop and mobile', async ({ page }) => {
  for (const [viewport, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    for (const [role, routes] of Object.entries(roleRoutes)) {
      for (const route of routes) {
        await openAuthenticated(page, role, route);
        const state = await screenState(page, route);
        const evidence = await screenshot(
          page,
          role,
          `${role}-${route}-${viewport}-${size.width}x${size.height}.png`
        );
        const pass = geometryPass(state) &&
          !state.hidden &&
          state.textLength > 0 &&
          state.bodyClass.includes('auth-on') &&
          state.currentRole === role &&
          state.sessionRole === role;
        runtime.authenticatedCases.push({
          role,
          route,
          viewport: `${size.width}x${size.height}`,
          state,
          evidence,
          pass
        });
        expect(pass).toBeTruthy();
      }
    }
  }
});

test('Production shared profile, 403, and dev-only gallery guards', async ({ page }) => {
  for (const [viewport, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    for (const role of Object.keys(roleRoutes)) {
      await openAuthenticated(page, role, 'profile');
      const state = await screenState(page, 'profile');
      const evidence = await screenshot(
        page,
        'shared',
        `profile-${role}-${viewport}-${size.width}x${size.height}.png`
      );
      const pass = geometryPass(state) &&
        state.currentRole === role &&
        state.sessionRole === role;
      runtime.sharedCases.push({
        stateName: 'profile',
        role,
        viewport: `${size.width}x${size.height}`,
        state,
        evidence,
        pass
      });
      expect(pass).toBeTruthy();
    }

    await page.goto(`${productionUrl}?r10=${Date.now()}#select-workspace`, {
      waitUntil: 'domcontentloaded'
    });
    await ready(page);
    await page.evaluate(() => {
      window.ORDO_SESSION_SERVICE.createMockSession(
        'round10-worker@example.com',
        ['worker']
      );
      window.ORDO_SESSION_SERVICE.setActiveRole('worker');
    });
    await page.goto(`${productionUrl}#admin-home`, {
      waitUntil: 'domcontentloaded'
    });
    await ready(page);
    await page.locator('#screen-forbidden-403').waitFor({ state: 'visible' });
    const forbidden = await screenState(page, 'forbidden-403');
    const attempted = await page.locator('#forbiddenUrl').innerText();
    const forbiddenEvidence = await screenshot(
      page,
      'shared',
      `forbidden-worker-to-admin-${viewport}-${size.width}x${size.height}.png`
    );
    const forbiddenPass = geometryPass(forbidden) &&
      attempted.trim() === '#admin-home' &&
      forbidden.currentRole === 'worker';
    runtime.sharedCases.push({
      stateName: 'forbidden-403',
      role: 'worker',
      attemptedRoute: attempted.trim(),
      viewport: `${size.width}x${size.height}`,
      state: forbidden,
      evidence: forbiddenEvidence,
      pass: forbiddenPass
    });
    expect(forbiddenPass).toBeTruthy();

    await page.evaluate(() => localStorage.setItem('dev_mode', 'off'));
    await page.goto(`${productionUrl}?dev=0#components-gallery`, {
      waitUntil: 'domcontentloaded'
    });
    await ready(page);
    const devDenied = await page.evaluate(() =>
      !document.getElementById('screen-components-gallery')
        .classList.contains('active')
    );
    await page.goto(`${productionUrl}?dev=1#components-gallery`, {
      waitUntil: 'domcontentloaded'
    });
    await ready(page);
    const gallery = await screenState(page, 'components-gallery');
    const officialMenuLinks = await page.locator(
      '#sideMenu a[href="#components-gallery"]'
    ).count();
    const galleryEvidence = await screenshot(
      page,
      'shared',
      `components-gallery-${viewport}-${size.width}x${size.height}.png`
    );
    const galleryPass = devDenied &&
      geometryPass(gallery) &&
      officialMenuLinks === 0;
    runtime.sharedCases.push({
      stateName: 'components-gallery-dev-guard',
      viewport: `${size.width}x${size.height}`,
      devDenied,
      officialMenuLinks,
      state: gallery,
      evidence: galleryEvidence,
      pass: galleryPass
    });
    expect(galleryPass).toBeTruthy();
  }
});

test('Production interactions remain keyboard-safe and non-mutating', async ({ page }) => {
  await page.setViewportSize(viewports.mobile);
  await openPublic(page, 'auth');
  const beforeStorage = await page.evaluate(() => JSON.stringify(localStorage));
  await page.locator('#authLoginSubmit').click();
  const invalidFocus = await page.evaluate(() => document.activeElement?.id || '');
  const afterInvalidStorage = await page.evaluate(() => JSON.stringify(localStorage));
  const authEvidence = await screenshot(
    page,
    'public',
    'auth-invalid-validation-mobile-390x844.png'
  );
  const authPass = invalidFocus === 'loginEmail' &&
    beforeStorage === afterInvalidStorage;
  runtime.interactionCases.push({
    name: 'auth-invalid-submit',
    invalidFocus,
    storageUnchanged: beforeStorage === afterInvalidStorage,
    evidence: authEvidence,
    pass: authPass
  });
  expect(authPass).toBeTruthy();

  await page.goto(`${productionUrl}?r10=${Date.now()}#select-workspace`, {
    waitUntil: 'domcontentloaded'
  });
  await ready(page);
  await page.evaluate(() => {
    window.ORDO_SESSION_SERVICE.createMockSession(
      'round10-worker@example.com',
      ['worker']
    );
    window.ORDO_SESSION_SERVICE.setActiveRole('worker');
  });
  await page.goto(`${productionUrl}#admin-home`, {
    waitUntil: 'domcontentloaded'
  });
  await ready(page);
  await page.locator('#screen-forbidden-403').waitFor({ state: 'visible' });
  const workspaceLink = page.locator(
    '#screen-forbidden-403 a[href="#select-workspace"]'
  );
  await workspaceLink.focus();
  const focusVisible = await workspaceLink.evaluate(element => {
    const style = getComputedStyle(element);
    return document.activeElement === element &&
      (style.outlineStyle !== 'none' || style.boxShadow !== 'none');
  });
  await workspaceLink.press('Enter');
  await page.waitForTimeout(50);
  const keyboardRoute = await page.evaluate(() => location.hash);
  const forbiddenEvidence = await screenshot(
    page,
    'shared',
    'forbidden-keyboard-mobile-390x844.png'
  );
  const forbiddenPass = focusVisible && keyboardRoute === '#select-workspace';
  runtime.interactionCases.push({
    name: 'forbidden-workspace-keyboard',
    focusVisible,
    keyboardRoute,
    evidence: forbiddenEvidence,
    pass: forbiddenPass
  });
  expect(forbiddenPass).toBeTruthy();

  await page.goto(`${productionUrl}?dev=1#components-gallery`, {
    waitUntil: 'domcontentloaded'
  });
  await ready(page);
  const tab = page.locator('[data-ui-lab-tab="my"]');
  await tab.focus();
  await tab.press('Enter');
  const selected = await tab.getAttribute('aria-selected');
  const reducedMotion = await page.evaluate(() =>
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const galleryEvidence = await screenshot(
    page,
    'shared',
    'components-gallery-keyboard-mobile-390x844.png'
  );
  const galleryPass = selected === 'true' && reducedMotion;
  runtime.interactionCases.push({
    name: 'components-gallery-tab-keyboard',
    selected,
    reducedMotion,
    evidence: galleryEvidence,
    pass: galleryPass
  });
  expect(galleryPass).toBeTruthy();
});
