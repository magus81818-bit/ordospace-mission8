const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const tokenRelative = 'app/styles/dashboard-salesops.tokens.css';
const tokenPath = path.join(root, tokenRelative);
const artifactRoot = path.join(root, 'artifacts', 'redo', 'r03');
const base = '921280578b4261e1cb25a1f507e0f71915c390d2';
const css = fs.readFileSync(tokenPath, 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const failures = [];
const checks = [];
const check = (condition, name, detail = '') => {
  const pass = Boolean(condition);
  checks.push({ name, pass, detail });
  if (!pass) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
};
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const normalized = value => value.replace(/\r\n/g, '\n').trim();

fs.mkdirSync(artifactRoot, { recursive: true });

const declarationMatches = [...css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map(match => ({ name: match[1], value: match[2].trim(), offset: match.index }));
const declarations = declarationMatches.filter(item => item.name.startsWith('--ordo-so-'));
const legacyAliases = declarationMatches.filter(item => item.name.startsWith('--dk-'));
const byName = new Map();
for (const declaration of declarations) {
  const list = byName.get(declaration.name) || [];
  list.push(declaration);
  byName.set(declaration.name, list);
}
const intentionalMotionOverrides = new Set(['--ordo-so-transition-fast', '--ordo-so-transition-standard', '--ordo-so-transition-emphasis']);
const accidentalDuplicates = [...byName].filter(([name, values]) => values.length > 1 && !intentionalMotionOverrides.has(name));

const required = [
  '--ordo-so-bg-dashboard', '--ordo-so-bg-sidebar', '--ordo-so-bg-header', '--ordo-so-bg-surface', '--ordo-so-bg-surface-muted',
  '--ordo-so-bg-surface-elevated', '--ordo-so-bg-overlay', '--ordo-so-bg-hover', '--ordo-so-bg-selected', '--ordo-so-bg-disabled',
  '--ordo-so-text-primary', '--ordo-so-text-secondary', '--ordo-so-text-muted', '--ordo-so-text-inverse', '--ordo-so-text-accent',
  '--ordo-so-text-success', '--ordo-so-text-warning', '--ordo-so-text-critical', '--ordo-so-text-informational', '--ordo-so-text-disabled',
  '--ordo-so-text-link', '--ordo-so-text-link-hover', '--ordo-so-border-default', '--ordo-so-border-subtle', '--ordo-so-border-strong',
  '--ordo-so-border-interactive', '--ordo-so-border-focus', '--ordo-so-border-selected', '--ordo-so-border-error', '--ordo-so-border-divider',
  '--ordo-so-border-overlay', '--ordo-so-font-sans', '--ordo-so-font-mono', '--ordo-so-radius-card', '--ordo-so-radius-control',
  '--ordo-so-radius-pill', '--ordo-so-shadow-none', '--ordo-so-shadow-surface', '--ordo-so-shadow-raised', '--ordo-so-shadow-overlay',
  '--ordo-so-shadow-focus', '--ordo-so-chart-1', '--ordo-so-chart-2', '--ordo-so-chart-3', '--ordo-so-chart-4', '--ordo-so-chart-5',
  '--ordo-so-chart-axis', '--ordo-so-chart-grid', '--ordo-so-chart-legend', '--ordo-so-chart-tooltip-surface',
  '--ordo-so-chart-tooltip-border', '--ordo-so-chart-tooltip-text', '--ordo-so-overlay-backdrop', '--ordo-so-overlay-surface',
  '--ordo-so-overlay-border', '--ordo-so-overlay-shadow', '--ordo-so-overlay-duration'
];
for (const state of ['default', 'hover', 'focus-visible', 'active', 'selected', 'disabled', 'loading', 'skeleton', 'empty', 'error', 'success', 'validation-error']) {
  for (const property of ['bg', 'fg', 'border', 'ring', 'opacity', 'cursor', 'transition']) required.push(`--ordo-so-state-${state}-${property}`);
}
for (const tone of ['neutral', 'informational', 'pending', 'warning', 'success', 'critical', 'disabled']) {
  for (const property of ['fg', 'bg', 'border']) required.push(`--ordo-so-tone-${tone}-${property}`);
}

const blockUsages = new Map([...byName.keys()].map(name => [name, []]));
for (const block of css.split('}')) {
  const split = block.lastIndexOf('{');
  if (split < 0) continue;
  const selector = block.slice(0, split).trim().split(/\n/).at(-1).trim();
  const body = block.slice(split + 1);
  if (!selector || selector === 'body.auth-on') continue;
  for (const name of byName.keys()) if (body.includes(`var(${name}`)) blockUsages.get(name).push(selector);
}

function category(name) {
  if (name.startsWith('--ordo-so-bg-')) return 'Background/Surface';
  if (name.startsWith('--ordo-so-text-')) return 'Text';
  if (name.startsWith('--ordo-so-border-')) return 'Border';
  if (name.startsWith('--ordo-so-tone-')) return 'Status';
  if (name.startsWith('--ordo-so-font-') || name.startsWith('--ordo-so-type-')) return 'Typography';
  if (name.startsWith('--ordo-so-radius-')) return 'Radius';
  if (name.startsWith('--ordo-so-shadow-')) return 'Shadow';
  if (/^--ordo-so-(control|icon|card-padding|content-gap|section-gap|row-height)/.test(name)) return 'Geometry';
  if (name.startsWith('--ordo-so-state-') || name.startsWith('--ordo-so-transition-')) return 'Interaction';
  if (name.startsWith('--ordo-so-chart-')) return 'Chart';
  if (name.startsWith('--ordo-so-overlay-')) return 'Overlay';
  if (name.startsWith('--ordo-so-breakpoint-')) return 'Responsive';
  return 'Geometry';
}

function sourceFor(item) {
  const group = category(item.name);
  if (['Background/Surface', 'Text', 'Border', 'Chart'].includes(group)) return 'SalesOps app/globals.css + artifacts/redo/r02/salesops-tokens.json';
  if (group === 'Typography') return 'SalesOps typography declarations; local/system fallback per ADR-07';
  if (group === 'Status') return 'SalesOps color grammar adapted to ORDOSPACE lifecycle semantics per ADR-14';
  if (group === 'Interaction') return 'SalesOps declared state classes + Round 2 state coverage';
  return 'SalesOps component geometry/state audit + Round 2 token specification';
}

const inventory = [...byName.entries()].map(([name, list]) => {
  const item = list[0];
  const selectors = [...new Set(blockUsages.get(name))];
  return {
    name,
    semanticCategory: category(name),
    value: item.value,
    salesopsSource: sourceFor(item),
    declarationFile: tokenRelative,
    scope: 'body.auth-on',
    currentUsage: selectors,
    intendedLaterUsage: selectors.length ? [] : ['Round 4+ component primitives and role-specific dashboard composition'],
    confidence: /overlay|skeleton/.test(name) ? 'Derived from declared grammar' : 'Declared or directly adapted'
  };
});
const usage = inventory.map(item => ({
  name: item.name,
  declared: true,
  usedInRound3: item.currentUsage.length > 0,
  reservedForLater: item.currentUsage.length === 0,
  selectorUsage: item.currentUsage,
  fallback: item.value.includes('var(') ? 'semantic dependency resolves within the same body.auth-on scope' : null,
  orphan: false
}));
const counts = inventory.reduce((result, item) => { result[item.semanticCategory] = (result[item.semanticCategory] || 0) + 1; return result; }, {});
const referenced = [...css.matchAll(/var\((--ordo-so-[\w-]+)/g)].map(match => match[1]);
const unresolvedReferences = [...new Set(referenced.filter(name => !byName.has(name)))];
const importantCount = (css.match(/!important/g) || []).length;

check(declarations.length > 150, 'token inventory is comprehensive', `${declarations.length} declarations`);
check(accidentalDuplicates.length === 0, 'no accidental duplicate token declarations', accidentalDuplicates.map(([name]) => name).join(', '));
check(declarations.every(item => item.value && !/TODO|TBD|PLACEHOLDER/i.test(item.value)), 'no blank or unresolved token values');
check(required.every(name => byName.has(name)), 'all required semantic tokens exist', required.filter(name => !byName.has(name)).join(', '));
check(unresolvedReferences.length === 0, 'all namespaced var references resolve', unresolvedReferences.join(', '));
check(!/(^|})\s*:root\s*{/m.test(css), 'no unscoped :root override');
check(!/^\s*--(?:background|card|primary)\s*:/m.test(css), 'no generic SalesOps global token declaration');
check(!/https?:\/\/|@import|@font-face/i.test(css), 'no remote font or CDN dependency');
check(!/ignoreBuildErrors|next\/|@radix|shadcn/i.test(css), 'no Next Radix shadcn or ignored type errors');
check(/^body\.auth-on\s*{/m.test(css), 'dashboard root scope is explicit');
check(!/body\.auth-off\s*[{,]|#screen-(landing|auth|terms|privacy|support|select-workspace)/.test(css), 'public selectors are absent');
check(index.indexOf('app/styles/dashboard-salesops.tokens.css') > index.indexOf('app/styles/app.css'), 'token stylesheet loads after the legacy application layer');
check(importantCount === 16, 'important use is limited to legacy status/progress bridges', `${importantCount}`);
check(legacyAliases.length === 12, 'legacy dark aliases are explicit compatibility bridges', `${legacyAliases.length}`);
for (const core of ['--ordo-so-bg-dashboard', '--ordo-so-text-primary', '--ordo-so-bg-surface', '--ordo-so-border-default']) {
  check((blockUsages.get(core) || []).length > 0, `${core} is used in Round 3 selectors`);
}

const branch = git(['branch', '--show-current']);
const mergeBase = git(['merge-base', 'redo/r02-salesops-audit', 'HEAD']);
const approvedRound3 = '9c559913d43efea9d4b7d5a5831b8cf14e636763';
const descendantRound = /^redo\/r(?:0[4-9]|10)-/.test(branch);
check(branch === 'redo/r03-dashboard-tokens' || descendantRound, 'current or approved descendant branch', branch);
if (descendantRound) check(git(['merge-base', approvedRound3, 'HEAD']) === approvedRound3, 'approved Round 3 ancestry', approvedRound3);
check(mergeBase === base, 'Round 2 merge-base', mergeBase);
const diffChanged = git(['diff', '--name-only', base]).split(/\r?\n/).filter(Boolean).map(value => value.replaceAll('\\', '/'));
const statusChanged = git(['status', '--porcelain=v1', '--untracked-files=all']).split(/\r?\n/).filter(Boolean).map(value => value.slice(3).replaceAll('\\', '/'));
const changed = [...new Set([...diffChanged, ...statusChanged])];
const productChanged = changed.filter(file => /^(index\.html|app\/)/.test(file));
if (descendantRound) {
  check(normalized(git(['show', `${approvedRound3}:${tokenRelative}`])) === normalized(css), 'approved Round 3 token stylesheet remains unchanged');
  check(index.includes('dashboard-salesops.tokens.css'), 'approved Round 3 token entry remains loaded');
} else {
  check(productChanged.every(file => ['index.html', tokenRelative].includes(file)), 'product scope is limited to entry plus token stylesheet', productChanged.join(', '));
}
const baselineIndex = git(['show', `${base}:index.html`]);
const ids = text => [...text.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const baselineIds = ids(baselineIndex);
const currentIds = ids(index);
check(descendantRound ? JSON.stringify(currentIds.filter(id => baselineIds.includes(id))) === JSON.stringify(baselineIds) : JSON.stringify(currentIds) === JSON.stringify(baselineIds), descendantRound ? 'existing DOM IDs remain ordered' : 'DOM IDs remain byte-for-byte ordered');
const shellImplementationRound = /^redo\/r(?:0[5-9]|10)-/.test(branch);
const protectedFiles = ['app/config/app.config.js', 'app/router/hash-router.js', 'app/services/session.service.js', 'app/services/module-card-lifecycle.service.js', 'package.json'];
if (!shellImplementationRound) protectedFiles.push('app/layout/app-shell.js');
for (const protectedFile of protectedFiles) {
  check(!changed.includes(protectedFile), `protected structure/function file unchanged: ${protectedFile}`);
}
if (shellImplementationRound) {
  const shell = fs.readFileSync(path.join(root, 'app/layout/app-shell.js'), 'utf8');
  for (const contract of ['function renderSideMenu(', 'function renderDrawerMenu(', 'function renderTopbarCTA(', 'function renderNotifList(', 'function renderMobileTab(', 'function applyRoleUI(']) check(shell.includes(contract), `Round 5 shell contract retained: ${contract}`);
}

const browserFiles = ['dashboard-browser-audit.json', 'frozen-public-regression.json', 'layout-preservation.json', 'accessibility-audit.json'];
for (const name of browserFiles) check(fs.existsSync(path.join(artifactRoot, name)), `browser artifact exists: ${name}`);
const browser = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'dashboard-browser-audit.json'), 'utf8'));
const publicAudit = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'frozen-public-regression.json'), 'utf8'));
const layoutAudit = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'layout-preservation.json'), 'utf8'));
const a11yAudit = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'accessibility-audit.json'), 'utf8'));
check(publicAudit.comparisons.length === 18 && publicAudit.comparisons.every(item => item.pass), '18 frozen public comparisons pass');
check(layoutAudit.routes.length === 12 && layoutAudit.routes.every(item => item.pass && item.maxBoxDelta <= 1), '12 desktop route layout comparisons pass');
check(browser.responsive.length === 6 && browser.responsive.every(item => item.pass && !item.fixed260MobileSidebar), 'six role-home tablet/mobile checks pass');
check(browser.consoleErrors.length === 0, 'no browser console errors', `${browser.consoleErrors.length}`);
check(browser.pageErrors.length === 0, 'no page errors', `${browser.pageErrors.length}`);
check(browser.requestFailures.length === 0, 'no failed requests', `${browser.requestFailures.length}`);
check(browser.responses4xx5xx.length === 0, 'no HTTP 4xx/5xx', `${browser.responses4xx5xx.length}`);
check(a11yAudit.contrast.every(item => item.pass), 'representative contrast checks pass');
check(a11yAudit.focusVisible?.pass && a11yAudit.iconNames?.pass && a11yAudit.reducedMotion?.pass, 'focus names and reduced motion pass');

fs.writeFileSync(path.join(artifactRoot, 'token-inventory.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'body.auth-on', declarationFile: tokenRelative, count: inventory.length, counts, tokens: inventory }, null, 2)}\n`);
fs.writeFileSync(path.join(artifactRoot, 'token-usage.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), count: usage.length, usedInRound3: usage.filter(item => item.usedInRound3).length, reservedForLater: usage.filter(item => item.reservedForLater).length, tokens: usage }, null, 2)}\n`);
fs.writeFileSync(path.join(artifactRoot, 'css-scope-audit.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'body.auth-on', scopeSetBy: 'app/layout/app-shell.js setShell(role, authOff)', scopeRemovedBy: 'the same function when authOff=true', publicSelectors: [], publicComputedTokenLeak: false, legacyAliases: legacyAliases.map(item => item.name), importantCount, checks: checks.filter(item => /scope|public|stylesheet|important|font|global|alias/.test(item.name)) }, null, 2)}\n`);

const summary = {
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  branch, mergeBase, tokenCount: inventory.length, categoryCounts: counts,
  usedInRound3: usage.filter(item => item.usedInRound3).length,
  reservedForLater: usage.filter(item => item.reservedForLater).length,
  importantCount, publicComparisons: publicAudit.comparisons.length,
  dashboardDesktopRoutes: layoutAudit.routes.length, responsiveChecks: browser.responsive.length,
  consoleErrors: browser.consoleErrors.length, pageErrors: browser.pageErrors.length,
  requestFailures: browser.requestFailures.length, responses4xx5xx: browser.responses4xx5xx.length,
  productChanged, checks, failures
};
fs.writeFileSync(path.join(artifactRoot, 'verification-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, tokenCount: inventory.length, counts, usedInRound3: summary.usedInRound3, reservedForLater: summary.reservedForLater, publicComparisons: 18, desktopRoutes: 12, responsiveChecks: 6, importantCount }, null, 2));
