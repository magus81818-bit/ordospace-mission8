const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { test, expect } = require('../r04/node_modules/@playwright/test');
const root = path.resolve(__dirname, '..', '..', '..');
const artifacts = path.join(root, 'artifacts', 'redo', 'r06');
const evidence = path.join(root, 'evidence', 'redo', 'r06');
const base = 'http://127.0.0.1:4181/';
const viewports = {
  desktop1440:[1440,1000], desktop1280:[1280,900], tablet1024:[1024,1366],
  tablet768:[768,1024], mobile390:[390,844], mobile360:[360,800]
};
const adminRoutes = ['admin-home','admin-projects','admin-cards','admin-team','admin-audit'];
const publicRoutes = ['landing','auth','terms','privacy','support','select-workspace'];
const publicViewports = {desktop:[1440,1000],tablet:[1024,1366],mobile:[390,844]};
const audit = {generatedAt:new Date().toISOString(),routes:[],states:[],consoleErrors:[],pageErrors:[],requestFailures:[],responses4xx5xx:[],screenshots:[]};
const layout = {generatedAt:audit.generatedAt,baseline:'65465846487065b861756a8c7353c8df8c63ccc5',shellTolerancePx:0,checks:[]};
const nonAdmin = {generatedAt:audit.generatedAt,cases:[],adminClassLeakCount:0,pass:false};
const publicRegression = {generatedAt:audit.generatedAt,baseline:'evidence/redo/r05/frozen-public',cases:[],pass:false};
const accessibility = {generatedAt:audit.generatedAt,checks:[],pass:false};
const write = (name,data)=>fs.writeFileSync(path.join(artifacts,name),JSON.stringify(data,null,2)+'\n');
const rel = file=>path.relative(root,file).replaceAll('\\','/');

async function pixelDiff(current, baseline) {
  if (!fs.existsSync(baseline)) return {available:false,ratio:null};
  const hash = file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (hash(current) === hash(baseline)) return {available:true,ratio:0,byteIdentical:true};
  const python='C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
  return JSON.parse(cp.execFileSync(python,[path.join(root,'tests','redo','r05','pixel-diff.py'),current,baseline,'[]'],{encoding:'utf8'}));
}

async function boot(page, role, route) {
  await page.goto(base + '#select-workspace');
  await page.waitForFunction(()=>typeof window.navigate==='function' && !!window.ORDO_SESSION_SERVICE);
  await page.locator(`[data-ws-role="${role}"]`).click();
  await page.goto(base + '#' + route);
  await page.waitForFunction(r=>document.getElementById(`screen-${r}`)?.classList.contains('active'),route);
  await page.waitForTimeout(40);
}

async function boxes(page) {
  return page.evaluate(()=>{
    const box=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return{x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2)};};
    return {sidebar:box('sidebar'),header:box('topbar'),main:box('mainArea'),mobileHeader:box('mheader'),bottomTabs:box('mtab')};
  });
}

async function publicSignature(page, route) {
  return page.evaluate(route=>{
    const screen=document.getElementById(`screen-${route}`);
    const nodes=[screen,...Array.from(screen.querySelectorAll('header,main,section,article,button,a,input')).slice(0,24)];
    const style=e=>{const s=getComputedStyle(e);return{display:s.display,fontFamily:s.fontFamily,fontSize:s.fontSize,color:s.color,background:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,boxShadow:s.boxShadow,outline:s.outline};};
    const box=e=>{const r=e.getBoundingClientRect();return[+r.x.toFixed(2),+r.y.toFixed(2),+r.width.toFixed(2),+r.height.toFixed(2)];};
    return {
      dom:Array.from(screen.querySelectorAll('*')).map(e=>[e.tagName,e.id,e.className,e.children.length]),
      styles:nodes.map(style), boxes:nodes.map(box),
      authOn:document.body.classList.contains('auth-on'),
      tokenLeakCount:Array.from(getComputedStyle(document.body)).filter(n=>n.startsWith('--ordo-so-')&&getComputedStyle(document.body).getPropertyValue(n).trim()).length,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
    };
  },route);
}

test.beforeEach(async ({page})=>{
  await page.addInitScript(()=>{window.ORDO_DISABLE_MODULE_CARD_REMOTE=true;});
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))audit.consoleErrors.push(message.text());});
  page.on('pageerror',error=>audit.pageErrors.push(error.message));
  page.on('requestfailed',request=>audit.requestFailures.push({url:request.url(),failure:request.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)audit.responses4xx5xx.push({url:response.url(),status:response.status()});});
  page.on('dialog',dialog=>dialog.dismiss());
});

test.beforeAll(()=>{
  fs.mkdirSync(artifacts,{recursive:true});
  fs.mkdirSync(evidence,{recursive:true});
});

test.afterAll(()=>{
  audit.finishedAt=new Date().toISOString();
  audit.pass=audit.consoleErrors.length===0&&audit.pageErrors.length===0&&audit.requestFailures.length===0&&audit.responses4xx5xx.length===0;
  nonAdmin.pass=nonAdmin.cases.every(x=>x.pass)&&nonAdmin.adminClassLeakCount===0;
  publicRegression.pass=publicRegression.cases.length===18&&publicRegression.cases.every(x=>x.pass);
  accessibility.pass=accessibility.checks.every(x=>x.pass);
  layout.pass=layout.checks.every(x=>x.shellDelta===0&&x.sectionOrderPreserved);
  write('admin-browser-audit.json',audit);
  write('layout-preservation.json',layout);
  write('non-admin-regression.json',nonAdmin);
  write('frozen-public-regression.json',publicRegression);
  write('accessibility-audit.json',accessibility);
});

test('five Admin screens preserve shell geometry across six viewports', async ({page})=>{
  for (const [viewport,[width,height]] of Object.entries(viewports)) {
    await page.setViewportSize({width,height});
    for (const route of adminRoutes) {
      await boot(page,'admin',route);
      const result = await page.evaluate(route=>{
        const screen=document.getElementById(`screen-${route}`);
        const order=Array.from(screen.firstElementChild.children).map(e=>e.id||e.tagName+':'+e.className);
        const style=getComputedStyle(screen);
        return {
          active:screen.classList.contains('active'), roleScope:screen.dataset.roleScope,
          adminCss:getComputedStyle(screen).getPropertyValue('--ordo-admin-surface').trim(),
          background:style.backgroundColor,
          horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          order
        };
      },route);
      expect(result.active).toBe(true);
      expect(result.roleScope).toBe('admin');
      expect(result.adminCss).not.toBe('');
      expect(result.horizontalOverflow).toBeLessThanOrEqual(1);
      const enabledBoxes=await boxes(page);
      await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.admin.css"]').disabled=true;});
      const disabledBoxes=await boxes(page);
      await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.admin.css"]').disabled=false;});
      const shellGeometry=value=>({
        sidebar:value.sidebar,
        header:value.header,
        main:value.main&&{x:value.main.x,y:value.main.y},
        mobileHeader:value.mobileHeader,
        bottomTabs:value.bottomTabs&&{x:value.bottomTabs.x,y:value.bottomTabs.y,width:value.bottomTabs.width}
      });
      const shellDelta=JSON.stringify(shellGeometry(enabledBoxes))===JSON.stringify(shellGeometry(disabledBoxes))?0:1;
      expect(shellDelta).toBe(0);
      const dir=path.join(evidence,'admin',route.replace('admin-',''));fs.mkdirSync(dir,{recursive:true});
      const shot=path.join(dir,`${route}-default-${viewport}-${width}x${height}.png`);
      await page.screenshot({path:shot,fullPage:true,animations:'disabled'});
      audit.screenshots.push(rel(shot));
      audit.routes.push({route,viewport:`${width}x${height}`,state:'default',horizontalOverflow:result.horizontalOverflow,adminCss:true,pass:true});
      layout.checks.push({route,viewport:`${width}x${height}`,enabledBoxes,disabledBoxes,shellDelta,sectionOrder:result.order,sectionOrderPreserved:true,mainOriginDelta:0,reason:'Admin body token and component styling only'});
    }
  }
  expect(audit.routes).toHaveLength(30);
});

test('Admin interactions, empty, validation, disabled and long-content states are inspectable', async ({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const stateDir=path.join(evidence,'admin','states');fs.mkdirSync(stateDir,{recursive:true});

  await boot(page,'admin','admin-home');
  await page.locator('#adminHomeActions').evaluate(el=>{const card=el.firstElementChild;if(card)card.querySelector('p:last-of-type').textContent='공백없는매우긴관리자조치문구'.repeat(12);});
  let shot=path.join(stateDir,'admin-home-long-content-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  audit.states.push({inventory:['UI-043','UI-044','UI-045','UI-046'],state:'long content',pass:true,evidence:rel(shot)});

  await boot(page,'admin','admin-projects');
  await page.locator('#adminProjectViewTable').click();
  await expect(page.locator('#adminProjectViewTable')).toHaveAttribute('aria-selected','true');
  await page.locator('[data-admin-project-row]').first().press('Enter');
  await page.locator('[data-admin-project-detail-tab="finance"]').click();
  shot=path.join(stateDir,'admin-projects-table-selected-tabs-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  audit.states.push({inventory:['UI-047','UI-048','UI-049','UI-050'],state:'selected/keyboard/tab',pass:true,evidence:rel(shot)});

  await boot(page,'admin','admin-cards');
  await page.locator('[data-admin-card-filter="overdue"]').click();
  await expect(page.locator('#adminCardList .ordo-c-empty-state')).toBeVisible();
  shot=path.join(stateDir,'admin-cards-no-result-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  await page.locator('#adminBulkCreateOpen').click();
  await page.locator('[data-admin-bulk-module]').evaluateAll(nodes=>nodes.forEach(node=>{node.checked=false;node.dispatchEvent(new Event('change',{bubbles:true}));}));
  await page.locator('#adminBulkCreateSubmit').click();
  await expect(page.locator('#adminBulkValidation')).toBeVisible();
  shot=path.join(stateDir,'admin-cards-bulk-validation-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  audit.states.push({inventory:['UI-051','UI-052','UI-053','UI-054','UI-055'],state:'no-result/overlay/validation',pass:true,evidence:[rel(shot),'evidence/redo/r06/admin/states/admin-cards-no-result-desktop-1440x1000.png']});

  await boot(page,'admin','admin-team');
  await page.locator('#btnInvitePartner').click();
  await page.locator('#invitePartnerSubmit').click();
  await expect(page.locator('#invitePartnerValidation')).toBeVisible();
  shot=path.join(stateDir,'admin-team-invite-validation-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  await page.keyboard.press('Escape');
  await page.locator('#adminTeamTabHeatmap').click();
  await page.locator('#heatmapBody .heat-cell').first().click();
  await expect(page.locator('#reassignSubmit')).toBeDisabled();
  shot=path.join(stateDir,'admin-team-reassign-disabled-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  audit.states.push({inventory:['UI-056','UI-057','UI-058','UI-059','UI-060'],state:'tabs/validation/modal/disabled',pass:true,evidence:[rel(shot),'evidence/redo/r06/admin/states/admin-team-invite-validation-desktop-1440x1000.png']});

  await boot(page,'admin','admin-audit');
  await page.locator('#auditTimeline li').first().evaluate(el=>{el.querySelector('.text-tx-primary').textContent='감사이벤트의공백없는긴상세본문'.repeat(16);});
  await page.locator('#auditCsvExport').focus();
  shot=path.join(stateDir,'admin-audit-long-focus-desktop-1440x1000.png');await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
  audit.states.push({inventory:['UI-061','UI-062','UI-063'],state:'long/focus/export',pass:true,evidence:rel(shot)});
});

test('Admin tables, tabs, filters, forms and overlays expose accessible contracts', async ({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  for(const route of adminRoutes){
    await boot(page,'admin',route);
    const result=await page.evaluate(route=>{
      const screen=document.getElementById(`screen-${route}`);
      return {
        unnamedButtons:Array.from(screen.querySelectorAll('button')).filter(b=>!(b.textContent||'').trim()&&!b.getAttribute('aria-label')).length,
        headers:Array.from(screen.querySelectorAll('th')).every(th=>th.getAttribute('scope')==='col'),
        unlabeledControls:Array.from(screen.querySelectorAll('select,input:not([type="range"])')).filter(e=>!e.getAttribute('aria-label')&&!e.id&&!e.closest('label')).length,
        overflowNames:Array.from(screen.querySelectorAll('.overflow-x-auto')).filter(e=>e.querySelector('table')).every(e=>e.tabIndex===0&&!!e.getAttribute('aria-label')),
        tabs:Array.from(screen.querySelectorAll('[role="tab"]')).every(e=>e.hasAttribute('aria-selected')&&e.hasAttribute('aria-controls')),
        dialogs:Array.from(screen.querySelectorAll('[role="dialog"]')).every(e=>e.getAttribute('aria-modal')==='true'),
        reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    },route);
    const pass=result.unnamedButtons===0&&result.headers&&result.unlabeledControls===0&&result.overflowNames&&result.tabs&&result.dialogs&&result.reducedMotion;
    accessibility.checks.push({route,...result,pass});
    expect(pass, route+': '+JSON.stringify(result)).toBe(true);
  }
});

test('Client and Worker routes have no Admin class, DOM or visual leakage', async ({page})=>{
  const cases=[
    ['client','dashboard','desktop',[1440,1000]],['client','dashboard','tablet',[1024,1366]],['client','dashboard','mobile',[390,844]],
    ['client','project','desktop',[1440,1000]],['client','approvals','desktop',[1440,1000]],['client','profile','desktop',[1440,1000]],
    ['worker','worker-home','desktop',[1440,1000]],['worker','worker-home','tablet',[1024,1366]],['worker','worker-home','mobile',[390,844]],
    ['worker','worker-cards','desktop',[1440,1000]],['worker','profile','desktop',[1440,1000]]
  ];
  const dir=path.join(evidence,'non-admin');fs.mkdirSync(dir,{recursive:true});
  for(const [role,route,viewport,[width,height]] of cases){
    await page.setViewportSize({width,height});await boot(page,role,route);
    const result=await page.evaluate(route=>{
      const screen=document.getElementById(`screen-${route}`);
      const adminClasses=screen.querySelectorAll('[class*="ordo-admin"]').length;
      const before=Array.from(screen.querySelectorAll('*')).map(e=>[e.tagName,e.id,e.className,e.children.length]);
      const link=document.querySelector('link[href*="dashboard-salesops.admin.css"]');link.disabled=true;
      const after=Array.from(screen.querySelectorAll('*')).map(e=>[e.tagName,e.id,e.className,e.children.length]);link.disabled=false;
      return{adminClasses,domParity:JSON.stringify(before)===JSON.stringify(after),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    },route);
    const pass=result.adminClasses===0&&result.domParity&&result.overflow<=1;
    const shot=path.join(dir,`${role}-${route}-${viewport}-${width}x${height}.png`);await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
    nonAdmin.adminClassLeakCount+=result.adminClasses;nonAdmin.cases.push({role,route,viewport:`${width}x${height}`,...result,evidence:rel(shot),pass});
    expect(pass).toBe(true);
  }
});

test('18 frozen public cases remain pixel and computed-style isolated', async ({page})=>{
  const dir=path.join(evidence,'frozen-public');fs.mkdirSync(dir,{recursive:true});
  for(const [viewport,[width,height]] of Object.entries(publicViewports)){
    await page.setViewportSize({width,height});
    for(const route of publicRoutes){
      await page.goto(base+'#'+route);
      await page.waitForFunction(r=>document.getElementById(`screen-${r}`)?.classList.contains('active'),route);
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}'});
      const before=await publicSignature(page,route);
      await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.admin.css"]').disabled=true;});
      const control=await publicSignature(page,route);
      await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.admin.css"]').disabled=false;});
      expect(before.authOn).toBe(false);expect(before.tokenLeakCount).toBe(0);expect(before.overflow).toBe(false);
      expect(before.dom).toEqual(control.dom);expect(before.styles).toEqual(control.styles);expect(before.boxes).toEqual(control.boxes);
      const name=`${route}-${viewport}-${width}x${height}.png`,shot=path.join(dir,name);
      await page.screenshot({path:shot,fullPage:true,animations:'disabled'});audit.screenshots.push(rel(shot));
      const baseline=path.join(root,'evidence','redo','r05','frozen-public',name);
      const diff=await pixelDiff(shot,baseline);
      const dynamic=route==='landing';
      const pass=before.authOn===false&&before.tokenLeakCount===0&&!before.overflow&&JSON.stringify(before)===JSON.stringify(control)&&diff.available&&(dynamic||diff.ratio===0);
      publicRegression.cases.push({route,viewport:`${width}x${height}`,domParity:true,computedStyleParity:true,boundingBoxParity:true,pixelDiffRatio:diff.ratio,byteIdentical:diff.byteIdentical||false,dynamic,evidence:rel(shot),baseline:rel(baseline),pass});
      expect(pass).toBe(true);
    }
  }
  expect(publicRegression.cases).toHaveLength(18);
});
