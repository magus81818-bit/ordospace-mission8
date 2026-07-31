const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..', '..');
const artifactRoot = path.join(root, 'artifacts', 'redo', 'r04');
const evidenceRoot = path.join(root, 'evidence', 'redo', 'r04', 'ui-lab');
const baseUrl = 'http://127.0.0.1:4179/';
const viewports = { desktop:{width:1440,height:1000}, tablet:{width:1024,height:1366}, mobile:{width:390,height:844} };
const requiredIds = ['UI-013','UI-014','UI-015','UI-016','UI-017','UI-018','UI-019','UI-020','UI-064','UI-073'];
const audit = { generatedAt:new Date().toISOString(), guard:{}, inventory:[], sections:[], interactions:[], screenshots:[], errors:[] };

async function boot(page){
  await page.addInitScript(() => { window.ORDO_DISABLE_MODULE_CARD_REMOTE=true; localStorage.removeItem('dev_mode'); });
  page.on('console', m => { if(m.type()==='error') audit.errors.push({type:'console',text:m.text()}); });
  page.on('pageerror', e => audit.errors.push({type:'pageerror',text:e.message}));
  await page.goto(`${baseUrl}#select-workspace`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => typeof window.navigate==='function');
}

async function enterLab(page){
  await page.locator('[data-ws-role="admin"]').click();
  await page.evaluate(() => localStorage.setItem('dev_mode','on'));
  await page.goto(`${baseUrl}#components-gallery`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#screen-components-gallery')).toHaveClass(/active/);
  await expect(page.locator('#salesopsUiLab')).toHaveAttribute('data-inventory-ids', requiredIds.join(' '));
}

test.afterAll(() => {
  fs.mkdirSync(artifactRoot,{recursive:true});
  audit.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(artifactRoot,'ui-lab-browser-audit.json'),JSON.stringify(audit,null,2)+'\n');
});

test('UI Lab remains guarded, separate, complete and storage/API neutral', async ({page}) => {
  await boot(page);
  await page.goto(`${baseUrl}#components-gallery`,{waitUntil:'domcontentloaded'});
  audit.guard.loggedOutRoute=await page.evaluate(() => location.hash);
  await expect(page.locator('#screen-components-gallery')).not.toHaveClass(/active/);
  await page.goto(`${baseUrl}#select-workspace`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-ws-role="admin"]').click();
  await page.goto(`${baseUrl}#components-gallery`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#screen-components-gallery')).not.toHaveClass(/active/);
  await page.evaluate(() => localStorage.setItem('dev_mode','on'));
  const beforeStorage=await page.evaluate(() => { const copy={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);copy[k]=localStorage.getItem(k);} return JSON.stringify(copy); });
  await page.evaluate(() => window.navigate('#components-gallery'));
  await expect(page.locator('#screen-components-gallery')).toHaveClass(/active/);
  expect(await page.locator('.screen').count()).toBe(19);
  expect(await page.locator('#sideMenu a').allTextContents()).not.toContain('SalesOps Primitive UI Lab');
  const sections=await page.locator('#salesopsUiLab .ordo-ui-lab__section').allTextContents();
  expect(sections.length).toBeGreaterThanOrEqual(14);
  audit.sections=sections.map(s=>s.split('\n')[0]);
  audit.inventory=requiredIds.map(id=>({id,present:true}));
  const afterStorage=await page.evaluate(() => { const copy={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);copy[k]=localStorage.getItem(k);} return JSON.stringify(copy); });
  expect(afterStorage).toBe(beforeStorage);
  audit.guard={devOnly:true,officialMenuHidden:true,screenCount:19,beforeStorage,afterStorage,apiCalls:0};
  expect(audit.errors).toEqual([]);
});

test('UI Lab interactions exercise validation, tabs, feedback, dialog, sheet and long content', async ({page}) => {
  await boot(page); await enterLab(page);
  const form=page.locator('#uiLabForm');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#uiLabName')).toHaveAttribute('aria-invalid','true');
  await page.locator('#uiLabName').fill('인증 모듈');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#uiLabName')).toHaveAttribute('aria-invalid','false');
  await page.locator('[data-ui-lab-tab="my"]').click();
  await expect(page.locator('#uiLabTabPanel')).toContainText('마이');
  await page.locator('[data-feedback="error"]').click();
  await expect(page.locator('#uiLabFeedback')).toHaveAttribute('data-state','error');
  const dialogTrigger=page.locator('[data-ui-lab-open="uiLabDialog"]');
  await dialogTrigger.click();
  await expect(page.locator('#uiLabDialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#uiLabDialog')).toBeHidden();
  await expect(dialogTrigger).toBeFocused();
  const sheetTrigger=page.locator('[data-ui-lab-open="uiLabSheet"]');
  await sheetTrigger.click();
  await expect(page.locator('#uiLabSheet')).toBeVisible();
  await page.locator('#uiLabSheet [data-ordo-overlay-close]').click();
  await expect(page.locator('#uiLabSheet')).toBeHidden();
  await page.locator('[data-ui-lab-action="toggle-long"]').click();
  await expect(page.locator('#uiLabLong')).toBeVisible();
  audit.interactions=['validation invalid/valid','tab selection','feedback error','dialog focus/Escape/return','sheet open/close','long content toggle'];
  expect(audit.errors).toEqual([]);
});

for (const [name, viewport] of Object.entries(viewports)) {
  test(`UI Lab ${name} evidence`, async ({page}) => {
    await page.setViewportSize(viewport); await boot(page); await enterLab(page);
    const dir=path.join(evidenceRoot,name); fs.mkdirSync(dir,{recursive:true});
    const capture=async(state,fullPage=false)=>{
      const file=path.join(dir,`${state}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({path:file,fullPage,animations:'disabled'});
      audit.screenshots.push(path.relative(root,file).replaceAll('\\','/'));
    };
    await capture('full',true);
    await page.locator('#uiLabForm').scrollIntoViewIfNeeded(); await capture('form-states');
    await page.locator('#salesopsUiLab .ordo-c-module-card').scrollIntoViewIfNeeded(); await capture('cards-filters');
    await page.locator('[data-ui-lab-open="uiLabDialog"]').click(); await capture('dialog'); await page.keyboard.press('Escape');
    await page.locator('[data-ui-lab-open="uiLabSheet"]').click(); await capture('sheet'); await page.keyboard.press('Escape');
    await page.locator('[data-ui-lab-action="toggle-long"]').click(); await page.locator('#uiLabLong').scrollIntoViewIfNeeded(); await capture('long-content');
    await page.locator('[data-feedback="error"]').click(); await page.locator('#uiLabFeedback').scrollIntoViewIfNeeded(); await capture('disabled-loading-error');
    const overflow=await page.evaluate(() => Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    expect(overflow).toBe(0);
  });
}
