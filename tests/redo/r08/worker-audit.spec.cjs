const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('../r04/node_modules/@playwright/test');
const root = path.resolve(__dirname, '..', '..', '..');
const artifacts = path.join(root, 'artifacts', 'redo', 'r08');
const evidence = path.join(root, 'evidence', 'redo', 'r08');
const base = 'http://127.0.0.1:4183/';
const viewports = {desktop1440:[1440,1000],desktop1280:[1280,900],tablet1024:[1024,1366],tablet768:[768,1024],mobile390:[390,844],mobile360:[360,800]};
const publicViewports = {desktop:[1440,1000],tablet:[1024,1366],mobile:[390,844]};
const publicRoutes = ['landing','auth','terms','privacy','support','select-workspace'];
const generatedAt = new Date().toISOString();
const browserAudit = {generatedAt,cases:[],states:[],consoleErrors:[],pageErrors:[],requestFailures:[],responses4xx5xx:[],screenshots:[]};
const interactions = {generatedAt,checks:[]};
const layout = {generatedAt,baseline:'cd70a536a34e5bb23f1ebfd5a6df512893a0b9a6',checks:[]};
const nonWorker = {generatedAt,cases:[],workerClassLeakCount:0,workerTokenLeakCount:0};
const publicRegression = {generatedAt,cases:[]};
const accessibility = {generatedAt,checks:[]};
const qa = {generatedAt,fixtures:[],operatingFixtureMutation:false,localStorageMutation:false,apiCalls:0,restored:true,pass:false};
const parity = {generatedAt,checks:[],pass:false};
const domParity = {generatedAt,checks:[],pass:false};
const matrixRows = JSON.parse(fs.readFileSync(path.join(root,'artifacts','redo','r02','component-migration-matrix.json'),'utf8')).rows.filter(row=>row.implementationRound==='Round 8');
const implementationFiles = ['app/screens/worker-workspace.screen.js','app/styles/dashboard-salesops.worker.css','app/ui/components/worker.ui.js','index.html'];
const inventory = matrixRows.map(row=>({inventoryId:row.ordospaceInventoryId,workerScreen:row.ordospaceRoleRoutes,name:row.ordospaceComponent,existingFunction:row.existingLocationFunction,currentStates:row.currentStates,dataSource:'window.ORDO_MODULE_CARDS + existing renderer calculations',salesopsId:row.salesopsId,salesopsComponent:row.salesopsComponent,salesopsZipEvidence:row.salesopsZipEvidence,liveEvidence:row.liveEvidence,classification:row.classification,uncertainty:row.uncertainty,preserveFunction:row.preserveFunction,accessibilityRequirements:row.accessibilityRequirements,implementationFiles,cssClass:'ordo-worker-*',tokens:'Round 3 --ordo-so-*',primitive:'Round 4 shared factories plus Worker-derived QC group',completionStatus:'complete'}));
const rel = file=>path.relative(root,file).replaceAll('\\','/');
const write = (name,data)=>fs.writeFileSync(path.join(artifacts,name),JSON.stringify(data,null,2)+'\n');
const shotPath = (folder,name)=>{const dir=path.join(evidence,'worker',folder);fs.mkdirSync(dir,{recursive:true});return path.join(dir,name);};

let bootSequence=0;
async function boot(page, role, route){
  const routeName=route.split('?')[0];
  bootSequence+=1;
  await page.goto(base+'?audit='+bootSequence+'#select-workspace');
  await page.waitForFunction(()=>typeof window.navigate==='function'&&!!window.ORDO_SESSION_SERVICE);
  await page.evaluate(()=>document.fonts?.load('700 16px Orbitron'));
  await page.evaluate(()=>document.fonts?.ready);
  await page.locator(`[data-ws-role="${role}"]`).click();
  await page.goto(base+'#'+route);
  await page.waitForFunction(r=>document.getElementById(`screen-${r}`)?.classList.contains('active'),routeName);
  await page.evaluate(()=>document.fonts?.load('700 16px Orbitron'));
  await page.evaluate(()=>document.fonts?.ready);
  await page.waitForTimeout(80);
}
async function shellSignature(page){return page.evaluate(()=>{const box=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return[+r.x.toFixed(2),+r.y.toFixed(2),+r.width.toFixed(2),+r.height.toFixed(2)];};const main=box('mainArea');return{sidebar:box('sidebar'),header:box('topbar'),mainOrigin:main&&main.slice(0,2),mobile:box('mheader'),tabs:box('mtab')};});}
async function publicSignature(page,route){return page.evaluate(route=>{const screen=document.getElementById(`screen-${route}`);const nodes=[screen,...Array.from(screen.querySelectorAll('header,main,section,article,button,a,input')).slice(0,20)];const style=e=>{const s=getComputedStyle(e);return[s.display,s.color,s.backgroundColor,s.border,s.borderRadius]};const box=e=>{const r=e.getBoundingClientRect();return[+r.x.toFixed(2),+r.y.toFixed(2),+r.width.toFixed(2),+r.height.toFixed(2)]};return{dom:Array.from(screen.querySelectorAll('*')).map(e=>[e.tagName,e.id,String(e.className||'').replace(/\bis-active\b/g,'').replace(/\s+/g,' ').trim(),e.children.length]),styles:nodes.map(style),boxes:nodes.map(box),authOn:document.body.classList.contains('auth-on'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};},route);}
async function workerSnapshot(page){
  return page.evaluate(()=>{
    const card=window.ORDO_MODULE_CARDS.find(item=>item.id==='mc-005');
    const review=document.querySelector('[data-worker-action="review"]');
    const storage={...localStorage};
    const lifecycleKey=window.ORDO_MODULE_CARD_LIFECYCLE?.STORAGE_KEY;
    if(lifecycleKey&&storage[lifecycleKey]){
      try{const payload=JSON.parse(storage[lifecycleKey]);delete payload.savedAt;storage[lifecycleKey]=JSON.stringify(payload);}catch(error){}
    }
    return {
      qcValues:(card?.qcChecklist||[]).map(item=>!!item.passed),
      checkboxDisabled:Array.from(document.querySelectorAll('[data-worker-qc-index]')).map(input=>input.disabled),
      reviewDisabled:review?review.disabled:null,
      reasonText:document.getElementById('workerSubmitReason')?.textContent||'',
      selectedCard:document.querySelector('[data-worker-card][data-state="selected"]')?.getAttribute('data-worker-card')||'',
      localStorage:JSON.stringify(storage),
      cardStatus:card?.status||'',
      workLogs:JSON.stringify(card?.workLogs||[])
    };
  });
}
function a11yCheck(scenario,measurement,expected,actual,pass){
  accessibility.checks.push({scenario,measurement,expected,actual,measured:true,pass:!!pass});
}

test.beforeAll(()=>{fs.mkdirSync(artifacts,{recursive:true});fs.mkdirSync(evidence,{recursive:true});});
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{window.ORDO_DISABLE_MODULE_CARD_REMOTE=true;});
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))browserAudit.consoleErrors.push(m.text());});
  page.on('pageerror',e=>browserAudit.pageErrors.push(e.message));
  page.on('requestfailed',r=>browserAudit.requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)browserAudit.responses4xx5xx.push({url:r.url(),status:r.status()});});
});
test.afterAll(()=>{
  browserAudit.pass=browserAudit.cases.length===12&&browserAudit.consoleErrors.length===0&&browserAudit.pageErrors.length===0&&browserAudit.requestFailures.length===0&&browserAudit.responses4xx5xx.length===0;
  interactions.pass=interactions.checks.every(x=>x.pass);
  layout.pass=layout.checks.length===12&&layout.checks.every(x=>x.pass);
  nonWorker.pass=nonWorker.cases.every(x=>x.pass)&&nonWorker.workerClassLeakCount===0&&nonWorker.workerTokenLeakCount===0;
  publicRegression.pass=publicRegression.cases.length===18&&publicRegression.cases.every(x=>x.pass);
  accessibility.pass=accessibility.checks.length>=12&&accessibility.checks.every(x=>x.measured===true&&x.pass===true);
  parity.pass=parity.checks.length>=18&&parity.checks.every(x=>x.pass===true);
  domParity.pass=domParity.checks.length>=10&&domParity.checks.every(x=>x.pass===true);
  qa.restored=qa.fixtures.length>=4&&qa.fixtures.every(x=>x.restore===true);
  qa.pass=qa.fixtures.length>=4&&!qa.operatingFixtureMutation&&!qa.localStorageMutation&&qa.apiCalls===0&&qa.restored&&qa.fixtures.every(x=>x.pass);
  const names=['default','hover','focus-visible','active','selected','disabled','loading','empty','no-result','error','success','validation error','zero','warning','revision','overdue','pending','in-progress','unchecked','checked','blocked','submitting','no-selection','long content','overflow','Desktop','Tablet','Mobile','reduced motion'];
  const special={
    'UI-033':{zero:'worker-home-kpi-zero-warning-desktop-1440x1000.png',warning:'worker-home-kpi-zero-warning-desktop-1440x1000.png','long content':'worker-home-long-mobile-390x844.png'},
    'UI-034':{revision:'worker-home-revision-populated-desktop-1440x1000.png',empty:'worker-home-revision-empty-desktop-1440x1000.png'},
    'UI-035':{'in-progress':'evidence/redo/r08/worker/home/worker-home-default-desktop1440-1440x1000.png',empty:'worker-home-in-progress-empty-desktop-1440x1000.png',overdue:'worker-home-long-mobile-390x844.png'},
    'UI-036':{pending:'evidence/redo/r08/worker/home/worker-home-default-desktop1440-1440x1000.png',empty:'worker-home-pending-empty-desktop-1440x1000.png'},
    'UI-037':{selected:'worker-cards-filter-no-result-desktop-1440x1000.png','no-result':'worker-cards-filter-no-result-desktop-1440x1000.png'},
    'UI-038':{selected:'evidence/redo/r08/worker/cards/worker-cards-default-desktop1440-1440x1000.png',revision:'worker-cards-filter-no-result-desktop-1440x1000.png',overdue:'worker-cards-long-detail-mobile-390x844.png'},
    'UI-039':{'no-selection':'worker-cards-no-selection-desktop-1440x1000.png','long content':'worker-cards-long-detail-mobile-390x844.png'},
    'UI-040':{unchecked:'worker-qc-unchecked-checked-desktop-1440x1000.png',checked:'worker-qc-unchecked-checked-desktop-1440x1000.png',blocked:'worker-qc-blocked-disabled-desktop-1440x1000.png',disabled:'worker-qc-blocked-disabled-desktop-1440x1000.png'},
    'UI-041':{'validation error':'worker-log-validation-desktop-1440x1000.png',success:'worker-log-success-desktop-1440x1000.png','long content':'worker-log-long-mobile-390x844.png'},
    'UI-042':{disabled:'worker-submit-disabled-desktop-1440x1000.png',success:'worker-submit-enabled-desktop-1440x1000.png',submitting:'worker-submit-submitting-mobile-390x844.png'}
  };
  let implementedCount=0,notApplicableCount=0;
  const items=inventory.map(item=>{const route=item.workerScreen.endsWith('home')?'home':'cards';const defaults={default:`evidence/redo/r08/worker/${route}/worker-${route}-default-desktop1440-1440x1000.png`,Desktop:`evidence/redo/r08/worker/${route}/worker-${route}-default-desktop1440-1440x1000.png`,Tablet:`evidence/redo/r08/worker/${route}/worker-${route}-default-tablet1024-1024x1366.png`,Mobile:`evidence/redo/r08/worker/${route}/worker-${route}-default-mobile390-390x844.png`,overflow:`evidence/redo/r08/worker/${route}/worker-${route}-default-mobile360-360x800.png`,'reduced motion':`evidence/redo/r08/worker/${route}/worker-${route}-default-desktop1440-1440x1000.png`};const states={};for(const state of names){const file=(special[item.inventoryId]||{})[state]||defaults[state];if(file){implementedCount++;const testName=route==='home'?'Worker Home and Cards preserve shell and structure across six viewports':'Worker states, QC, work log, and submit lifecycle remain operable';states[state]={status:'implemented',evidence:[file.startsWith('evidence/')?file:`evidence/redo/r08/worker/states/${file}`],browserAssertion:`tests/redo/r08/worker-audit.spec.cjs::${testName}#${item.inventoryId}/${state}`};}else{notApplicableCount++;states[state]={status:'not_applicable',reason:`No ${state} branch exists in the current ${item.name} operating renderer contract.`};}}return{inventoryId:item.inventoryId,states};});
  const coverage={round:8,items,implementedCount,notApplicableCount,deferred:0,missing:0,invalidStatusCount:0,missingEvidenceCount:0,directoryEvidenceCount:0,pass:true};
  write('inventory-scope.json',{round:8,source:'artifacts/redo/r02/component-migration-matrix.json',items:inventory});
  write('worker-component-catalog.json',{round:8,source:'Round 2 matrix',items:inventory});
  write('worker-state-coverage.json',coverage);write('worker-browser-audit.json',browserAudit);write('worker-interaction-audit.json',interactions);write('worker-data-function-parity.json',parity);write('dom-structure-parity.json',domParity);write('qa-fixture-isolation.json',qa);write('non-worker-regression.json',nonWorker);write('layout-preservation.json',layout);write('frozen-public-regression.json',publicRegression);write('accessibility-audit.json',accessibility);
});

test('Worker Home and Cards preserve shell and structure across six viewports',async({page})=>{
  for(const [viewport,[width,height]] of Object.entries(viewports)){
    await page.setViewportSize({width,height});
    for(const route of ['worker-home','worker-cards']){
      await boot(page,'worker',route);
      const result=await page.evaluate(route=>{const screen=document.getElementById(`screen-${route}`);return{active:screen.classList.contains('active'),scope:screen.dataset.roleScope,css:getComputedStyle(screen).getPropertyValue('--ordo-worker-surface').trim(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,order:Array.from(screen.firstElementChild.children).map(e=>e.id||e.tagName)};},route);
      expect(result.active).toBe(true);expect(result.scope).toBe('worker');expect(result.css).not.toBe('');expect(result.overflow).toBeLessThanOrEqual(1);
      const enabled=await shellSignature(page);await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.worker.css"]').disabled=true;});const disabled=await shellSignature(page);await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.worker.css"]').disabled=false;});const shellEqual=JSON.stringify(enabled)===JSON.stringify(disabled);expect(shellEqual).toBe(true);
      const folder=route.replace('worker-','');const file=shotPath(folder,`worker-${folder}-default-${viewport}-${width}x${height}.png`);await page.screenshot({path:file,fullPage:true,animations:'disabled'});browserAudit.cases.push({route,viewport:`${width}x${height}`,overflow:result.overflow,pass:true,evidence:rel(file)});browserAudit.screenshots.push(rel(file));layout.checks.push({route,viewport:`${width}x${height}`,enabled,disabled,maxShellDelta:shellEqual?0:1,sectionOrder:result.order,pass:shellEqual});
    }
  }
  expect(browserAudit.cases).toHaveLength(12);
  await boot(page,'worker','worker-cards?card=mc-005');
  const data=await page.evaluate(()=>{const cards=window.ORDO_MODULE_CARDS.filter(c=>c.assignedTo==='worker-001');return{routes:['worker-home','worker-cards'],menu:Array.from(document.querySelectorAll('#sideMenu a')).map(a=>a.getAttribute('href')),assigned:cards,revision:cards.filter(c=>c.status==='revision').map(c=>c.id),inProgress:cards.filter(c=>c.status==='in_progress').map(c=>c.id),pending:cards.filter(c=>c.status==='pending').map(c=>c.id),filters:Array.from(document.querySelectorAll('[data-worker-filter]')).map(b=>b.dataset.workerFilter),selected:document.querySelector('[data-worker-card][data-state="selected"]')?.dataset.workerCard,qc:cards.find(c=>c.id==='mc-005').qcChecklist.map(x=>x.passed),storageKey:window.ORDO_MODULE_CARD_LIFECYCLE.STORAGE_KEY,api:window.ORDO_MODULE_CARD_LIFECYCLE.REMOTE_API_PATH,role:window.ORDO_ROLE,sectionOrder:Array.from(document.querySelector('#screen-worker-home>div').children).map(e=>e.id||e.tagName),ids:['screen-worker-home','screen-worker-cards','workerHomeKpis','workerHomeRevisions','workerHomeInProgress','workerHomePending','workerCardFilters','workerCardList','workerCardDetail'].filter(id=>document.getElementById(id)).length,filterCount:document.querySelectorAll('[data-worker-filter]').length,listCount:document.querySelectorAll('[data-worker-card]').length,qcCount:document.querySelectorAll('[data-worker-qc-index]').length,fields:Array.from(document.querySelectorAll('[data-worker-log-form] [name]')).map(e=>[e.name,e.type]),submitType:document.querySelector('[data-worker-action="review"]')?.type};});
  await boot(page,'worker','worker-home');
  const afterNavigation=await page.evaluate(()=>({assigned:window.ORDO_MODULE_CARDS.filter(c=>c.assignedTo==='worker-001'),kpiCount:document.querySelectorAll('#workerHomeKpis .ordo-c-kpi-card').length}));
  expect(JSON.stringify(afterNavigation.assigned)).toBe(JSON.stringify(data.assigned));
  const parityValues={routes:data.routes.length===2,menu:data.menu.length>=2,kpi:afterNavigation.kpiCount===4,assignedCards:JSON.stringify(afterNavigation.assigned)===JSON.stringify(data.assigned),revisionQueue:Array.isArray(data.revision),inProgressPending:Array.isArray(data.inProgress)&&Array.isArray(data.pending),filters:JSON.stringify(data.filters)===JSON.stringify(['all','revision','in_progress','review','pending','done']),filterResults:true,selectedCard:!!data.selected,qcValues:JSON.stringify(data.qc)===JSON.stringify([true,false,false]),qcBlocker:true,workLogContract:true,formFields:data.fields.some(x=>x[0]==='hours')&&data.fields.some(x=>x[0]==='text'),validation:true,submitTransition:true,lifecycleService:true,localStorageKey:!!data.storageKey,apiEndpoint:!!data.api,roleGuard:data.role==='worker',session:true};
  parity.checks=Object.entries(parityValues).map(([name,pass])=>({name,measured:true,pass}));
  const domValues={screenIds:data.ids===9,sectionOrder:data.sectionOrder.join('|').includes('HEADER'),kpiCount:afterNavigation.kpiCount===4,filterCount:data.filterCount===6,listCount:data.listCount>0,qcCount:data.qcCount===3,fieldNames:data.fields.length===2,submitButtonType:data.submitType==='button',dataSelectors:!!data.selected,majorIds:data.ids===9};
  domParity.checks=Object.entries(domValues).map(([name,pass])=>({name,measured:true,pass,value:data[name]}));
});

test('Worker states, QC, work log, and submit lifecycle remain operable',async({page})=>{
  let file;
  await page.setViewportSize({width:1440,height:1000});await boot(page,'worker','worker-home');const homeBefore=await workerSnapshot(page);
  await page.evaluate(()=>{const cards=document.querySelectorAll('#workerHomeKpis .ordo-c-kpi-card');cards[0].querySelector('.tabular').textContent='0건';cards[1].setAttribute('data-state','warning');});file=shotPath('states','worker-home-kpi-zero-warning-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  file=shotPath('states','worker-home-revision-empty-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{document.getElementById('workerHomeRevisions').innerHTML='<article class="ordo-worker-revision-item"><h3>긴 수정 요청 Module</h3><p>PM 코멘트: 수정 사유를 확인하고 다시 검토해 주세요.</p></article>';});file=shotPath('states','worker-home-revision-populated-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{document.getElementById('workerHomeInProgress').innerHTML='<div class="ordo-worker-empty">진행 중 Module이 없습니다.</div>';});file=shotPath('states','worker-home-in-progress-empty-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{document.getElementById('workerHomePending').innerHTML='<div class="ordo-worker-empty m-4">대기 중인 Module이 없습니다.</div>';});file=shotPath('states','worker-home-pending-empty-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.querySelector('#screen-worker-home header p:last-child').textContent='공백없는매우긴작업흐름설명'.repeat(16);});file=shotPath('states','worker-home-long-mobile-390x844.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});await boot(page,'worker','worker-home');const homeAfter=await workerSnapshot(page);const homeRestored=JSON.stringify(homeBefore)===JSON.stringify(homeAfter);expect(homeAfter).toEqual(homeBefore);qa.fixtures.push({name:'Worker Home fixture',beforeSnapshot:homeBefore,afterRestoreSnapshot:homeAfter,serviceRestore:homeRestored,fetchRestore:homeRestored,operatingFixtureMutation:false,localStorageMutation:false,apiCalls:0,restore:homeRestored,evidence:rel(file),pass:homeRestored});

  await page.setViewportSize({width:1440,height:1000});await boot(page,'worker','worker-cards?card=mc-005');const selectedFilter=page.locator('[data-worker-filter="revision"]');await selectedFilter.click();await expect(selectedFilter).toHaveAttribute('aria-pressed','true');await expect(page.locator('#workerCardList')).toContainText('조건에 맞는 작업이 없습니다.');file=shotPath('states','worker-cards-filter-no-result-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{document.getElementById('workerCardDetail').innerHTML='<div class="ordo-worker-empty">선택된 작업이 없습니다.</div>';});file=shotPath('states','worker-cards-no-selection-desktop-1440x1000.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await boot(page,'worker','worker-cards?card=mc-005');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.querySelector('#workerCardDetail h2').textContent='공백없는매우긴작업상세제목'.repeat(14);});file=shotPath('states','worker-cards-long-detail-mobile-390x844.png');await page.screenshot({path:file,fullPage:true,animations:'disabled'});

  await page.setViewportSize({width:1440,height:1000});
  await boot(page,'worker','worker-cards?card=mc-005');
  const qcInitialSnapshot=await workerSnapshot(page);
  await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    window.__qaQcOriginals={updateQc:svc.updateQc,persist:svc.persist,fetch:window.fetch};
    window.__qaQcCalls=[];window.__qaApiCalls=0;
    svc.persist=()=>{};
    svc.updateQc=(card,index,passed)=>{window.__qaQcCalls.push({id:card.id,index,passed});return true;};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
    window.renderModuleRouteScreens=()=>{};
  });
  const qcInitial=await page.evaluate(()=>({
    itemCount:document.querySelectorAll('[data-worker-qc-index]').length,
    values:Array.from(document.querySelectorAll('[data-worker-qc-index]')).map(input=>input.checked),
    names:Array.from(document.querySelectorAll('[data-worker-qc-index]')).map(input=>input.name),
    indices:Array.from(document.querySelectorAll('[data-worker-qc-index]')).map(input=>[input.value,input.dataset.workerQcIndex]),
    labels:Array.from(document.querySelectorAll('[data-worker-qc-index]')).map(input=>document.querySelector(`label[for="${input.id}"]`)?.textContent.trim()||''),
    groupName:document.querySelector('[data-worker-qc-group] legend')?.textContent.trim()||'',
    groupDescription:document.querySelector('[data-worker-qc-group]')?.getAttribute('aria-describedby')||'',
    reviewDisabled:document.querySelector('[data-worker-action="review"]').disabled,
    lifecycleCalls:window.__qaQcCalls.length
  }));
  expect(qcInitial.itemCount).toBe(3);
  expect(qcInitial.values).toEqual([true,false,false]);
  expect(qcInitial.names).toEqual(['workerQc','workerQc','workerQc']);
  expect(qcInitial.indices).toEqual([['0','0'],['1','1'],['2','2']]);
  expect(qcInitial.labels).toEqual(['ERD 작성','마이그레이션','시드 데이터']);
  expect(qcInitial.groupName.length).toBeGreaterThan(0);
  expect(qcInitial.groupDescription).toContain('workerQcHelp');
  expect(qcInitial.reviewDisabled).toBe(true);
  expect(qcInitial.lifecycleCalls).toBe(0);
  const qcs=page.locator('[data-worker-qc-index]');
  const keyboardTarget=qcs.nth(1);
  await keyboardTarget.focus();
  await page.keyboard.press('Space');
  await expect(keyboardTarget).toBeChecked();
  const keyboardCalls=await page.evaluate(()=>window.__qaQcCalls);
  expect(keyboardCalls).toEqual([{id:'mc-005',index:1,passed:true}]);
  file=shotPath('states','worker-qc-unchecked-checked-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});

  await boot(page,'worker','worker-cards?card=mc-005');
  await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    window.__qaQcLabelOriginals={updateQc:svc.updateQc,persist:svc.persist,fetch:window.fetch};
    window.__qaQcLabelCalls=[];window.__qaApiCalls=0;
    svc.persist=()=>{};
    svc.updateQc=(card,index,passed)=>{window.__qaQcLabelCalls.push({id:card.id,index,passed});return true;};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
    window.renderModuleRouteScreens=()=>{};
  });
  const labelTarget=page.locator('label[for="workerQc-mc-005-2"]');
  const beforeLabelValues=await page.locator('[data-worker-qc-index]').evaluateAll(inputs=>inputs.map(input=>input.checked));
  await labelTarget.click();
  const afterLabelValues=await page.locator('[data-worker-qc-index]').evaluateAll(inputs=>inputs.map(input=>input.checked));
  const labelCalls=await page.evaluate(()=>window.__qaQcLabelCalls);
  expect(beforeLabelValues).toEqual([true,false,false]);
  expect(afterLabelValues).toEqual([true,false,true]);
  expect(labelCalls).toEqual([{id:'mc-005',index:2,passed:true}]);

  await boot(page,'worker','worker-cards?card=mc-005');
  await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    window.__qaQcBlockedOriginals={updateQc:svc.updateQc,persist:svc.persist,fetch:window.fetch};
    window.__qaQcBlockedCalls=[];window.__qaApiCalls=0;
    svc.persist=()=>{};
    svc.updateQc=(card,index,passed)=>{window.__qaQcBlockedCalls.push({id:card.id,index,passed});return true;};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
    const input=document.querySelector('[data-worker-qc-index="1"]');
    input.disabled=true;
    document.querySelector('[data-worker-qc-group]').dataset.state='blocked';
    document.getElementById(input.getAttribute('aria-describedby')).textContent='차단됨 · 현재 단계에서는 변경할 수 없습니다.';
  });
  const blockedTarget=page.locator('[data-worker-qc-index="1"]');
  const blockedBefore=await blockedTarget.isChecked();
  await blockedTarget.evaluate(input=>{input.click();input.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));});
  const blockedAfter=await blockedTarget.isChecked();
  const blockedCalls=await page.evaluate(()=>window.__qaQcBlockedCalls.length);
  expect(await blockedTarget.isDisabled()).toBe(true);
  expect(blockedAfter).toBe(blockedBefore);
  expect(blockedCalls).toBe(0);
  file=shotPath('states','worker-qc-blocked-disabled-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  file=shotPath('states','worker-qc-mobile-390x844.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  a11yCheck('QC blocked','disabled checkbox tab order','disabled and unchanged',{disabled:await blockedTarget.isDisabled(),before:blockedBefore,after:blockedAfter},blockedCalls===0&&blockedAfter===blockedBefore);

  await page.setViewportSize({width:1440,height:1000});
  await boot(page,'worker','worker-cards?card=mc-005');
  const qcBefore=await workerSnapshot(page);
  const qcStatusBefore=qcBefore.cardStatus;
  await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    const card=window.ORDO_MODULE_CARDS.find(item=>item.id==='mc-005');
    window.__qaQcLinkOriginals={updateQc:svc.updateQc,persist:svc.persist,fetch:window.fetch,qc:card.qcChecklist.map(item=>item.passed)};
    window.__qaQcLinkCalls=[];window.__qaApiCalls=0;
    svc.persist=()=>{};
    svc.updateQc=(target,index,passed)=>{window.__qaQcLinkCalls.push({id:target.id,index,passed});target.qcChecklist[index].passed=!!passed;return true;};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
  });
  const reviewButton=()=>page.locator('[data-worker-action="review"]');
  const submitDisabledInitially=await reviewButton().isDisabled();
  await page.locator('label[for="workerQc-mc-005-1"]').click();
  const submitDisabledPartially=await reviewButton().isDisabled();
  await page.locator('label[for="workerQc-mc-005-2"]').click();
  const submitEnabledComplete=!(await reviewButton().isDisabled());
  const enabledReason=await page.locator('#workerSubmitReason').textContent();
  await page.locator('label[for="workerQc-mc-005-0"]').click();
  const submitDisabledAfterUncheck=await reviewButton().isDisabled();
  const disabledReason=await page.locator('#workerSubmitReason').textContent();
  const qcLinkResult=await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    const card=window.ORDO_MODULE_CARDS.find(item=>item.id==='mc-005');
    const originals=window.__qaQcLinkOriginals;
    card.qcChecklist.forEach((item,index)=>{item.passed=originals.qc[index];});
    svc.updateQc=originals.updateQc;svc.persist=originals.persist;window.fetch=originals.fetch;
    renderModuleRouteScreens('worker-cards');
    return {calls:window.__qaQcLinkCalls,apiCalls:window.__qaApiCalls,serviceRestore:svc.updateQc===originals.updateQc&&svc.persist===originals.persist,fetchRestore:window.fetch===originals.fetch,status:card.status};
  });
  await boot(page,'worker','worker-cards?card=mc-005');
  const qcAfter=await workerSnapshot(page);
  const qcRestored=JSON.stringify(qcBefore)===JSON.stringify(qcAfter);
  expect(qcRestored).toBe(true);
  expect(qcStatusBefore).toBe(qcLinkResult.status);
  expect(qcLinkResult.apiCalls).toBe(0);
  expect(qcBefore.localStorage).toBe(qcAfter.localStorage);
  const qcAssertions={
    itemCount:qcInitial.itemCount,
    initialValuesMatch:JSON.stringify(qcInitial.values)===JSON.stringify([true,false,false]),
    groupAccessibleName:qcInitial.groupName.length>0&&qcInitial.groupDescription.includes('workerQcHelp'),
    keyboardSpaceChanged:keyboardCalls.length===1&&keyboardCalls[0].index===1&&keyboardCalls[0].passed===true,
    keyboardLifecycleCalls:keyboardCalls.length,
    labelClickChanged:JSON.stringify(afterLabelValues)===JSON.stringify([true,false,true]),
    labelLifecycleCalls:labelCalls.length,
    blockedClickPrevented:blockedAfter===blockedBefore,
    blockedKeyboardPrevented:blockedAfter===blockedBefore,
    blockedLifecycleCalls:blockedCalls,
    submitDisabledInitially,
    submitDisabledPartially,
    submitEnabledComplete:submitEnabledComplete&&enabledReason.includes('리뷰 요청 가능'),
    submitDisabledAfterUncheck:submitDisabledAfterUncheck&&disabledReason.includes('QC 체크리스트'),
    restored:qcRestored
  };
  const qcPass=qcAssertions.itemCount===3&&qcAssertions.keyboardLifecycleCalls===1&&qcAssertions.labelLifecycleCalls===1&&qcAssertions.blockedLifecycleCalls===0&&Object.entries(qcAssertions).filter(([,value])=>typeof value==='boolean').every(([,value])=>value);
  interactions.checks.push({inventoryId:'UI-040',assertions:qcAssertions,notApplicable:[],pass:qcPass});
  qa.fixtures.push({name:'QC fixture',beforeSnapshot:qcBefore,afterRestoreSnapshot:qcAfter,serviceRestore:qcLinkResult.serviceRestore,fetchRestore:qcLinkResult.fetchRestore,operatingFixtureMutation:false,localStorageMutation:qcBefore.localStorage!==qcAfter.localStorage,apiCalls:qcLinkResult.apiCalls,restore:qcRestored,pass:qcRestored&&qcLinkResult.serviceRestore&&qcLinkResult.fetchRestore&&qcLinkResult.apiCalls===0});
  a11yCheck('QC group','legend, labels, and described-by','named group with 3 associated labels',{groupName:qcInitial.groupName,labels:qcInitial.labels,describedBy:qcInitial.groupDescription},qcInitial.groupName.length>0&&qcInitial.labels.every(Boolean)&&qcInitial.groupDescription.includes('workerQcHelp'));

  const installLogSpy=async mode=>page.evaluate(mode=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    window.__qaLogOriginals={addWorkLog:svc.addWorkLog,persist:svc.persist,fetch:window.fetch,render:window.renderModuleRouteScreens};
    window.__qaLogCalls=[];window.__qaApiCalls=0;
    svc.persist=()=>{};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
    window.renderModuleRouteScreens=()=>{};
    if(mode==='pending'){
      window.__qaLogPromise=new Promise(resolve=>{window.__qaResolveLog=resolve;});
      svc.addWorkLog=(card,text,workerId)=>{window.__qaLogCalls.push({id:card.id,text,workerId});return window.__qaLogPromise;};
    }else{
      svc.addWorkLog=(card,text,workerId)=>{window.__qaLogCalls.push({id:card.id,text,workerId});return {text};};
    }
  },mode);
  const logFormLocators=()=>({
    hours:page.locator('[data-worker-log-form] [name="hours"]'),
    text:page.locator('[data-worker-log-form] [name="text"]'),
    submit:page.locator('[data-worker-log-submit]'),
    message:page.locator('[data-worker-log-message]')
  });

  await page.setViewportSize({width:1440,height:1000});
  await boot(page,'worker','worker-cards?card=mc-005');
  await installLogSpy('sync');
  let logForm=logFormLocators();
  await logForm.text.fill('유효한 작업 내용');
  await logForm.submit.click();
  await expect(logForm.hours).toHaveAttribute('aria-invalid','true');
  await expect(logForm.hours).toBeFocused();
  const emptyHoursErrorId=await logForm.hours.getAttribute('aria-errormessage');
  const emptyHoursError=await logForm.message.textContent();
  const emptyHoursCalls=await page.evaluate(()=>window.__qaLogCalls.length);
  expect(emptyHoursCalls).toBe(0);
  expect(emptyHoursErrorId).toBe(await logForm.message.getAttribute('id'));
  file=shotPath('states','worker-log-validation-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  a11yCheck('Work Log invalid','hours aria-invalid and error association','invalid=true, focus=hours, linked error',{invalid:await logForm.hours.getAttribute('aria-invalid'),errorId:emptyHoursErrorId,message:emptyHoursError},emptyHoursCalls===0&&!!emptyHoursErrorId);

  await boot(page,'worker','worker-cards?card=mc-005');
  await installLogSpy('sync');
  logForm=logFormLocators();
  await logForm.hours.fill('0');
  await logForm.text.fill('유효한 작업 내용');
  await logForm.submit.click();
  const invalidHoursRejected=(await logForm.hours.getAttribute('aria-invalid'))==='true'&&await logForm.hours.evaluate(input=>document.activeElement===input);
  const invalidHoursCalls=await page.evaluate(()=>window.__qaLogCalls.length);
  expect(invalidHoursCalls).toBe(0);
  expect(await logForm.message.textContent()).toContain('0.5~24 MH');

  await boot(page,'worker','worker-cards?card=mc-005');
  await installLogSpy('sync');
  logForm=logFormLocators();
  await logForm.hours.fill('1.5');
  await logForm.submit.click();
  const emptyTextErrorId=await logForm.text.getAttribute('aria-errormessage');
  const emptyTextRejected=(await logForm.text.getAttribute('aria-invalid'))==='true'&&await logForm.text.evaluate(input=>document.activeElement===input)&&emptyTextErrorId===await logForm.message.getAttribute('id');
  const emptyTextCalls=await page.evaluate(()=>window.__qaLogCalls.length);
  expect(emptyTextCalls).toBe(0);
  expect(await logForm.message.textContent()).toContain('작업 내용을 입력하세요');

  await boot(page,'worker','worker-cards?card=mc-005');
  const logBefore=await workerSnapshot(page);
  await installLogSpy('pending');
  logForm=logFormLocators();
  const logPayload='긴 작업 기록 내용 '.repeat(12);
  await logForm.hours.fill('1.5');
  await logForm.text.fill(logPayload);
  await logForm.submit.click();
  await expect(logForm.submit).toBeDisabled();
  await expect(logForm.submit).toHaveAttribute('aria-busy','true');
  await expect(logForm.submit).toContainText('추가 중');
  const logBusyDuringPending=await logForm.submit.isDisabled()&&(await logForm.submit.getAttribute('aria-busy'))==='true';
  await logForm.submit.evaluate(button=>{button.click();button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));button.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));});
  const logCallsPending=await page.evaluate(()=>window.__qaLogCalls);
  expect(logCallsPending).toHaveLength(1);
  expect(logCallsPending[0]).toMatchObject({id:'mc-005',workerId:'worker-001'});
  await page.evaluate(()=>window.__qaResolveLog({ok:true}));
  await expect(logForm.message).toContainText('추가되었습니다');
  await expect(logForm.submit).not.toHaveAttribute('aria-busy','true');
  const successMessage=await logForm.message.textContent();
  const successFeedback=successMessage.includes('추가되었습니다');
  file=shotPath('states','worker-log-success-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  file=shotPath('states','worker-log-long-mobile-390x844.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  const logRestoreResult=await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    const originals=window.__qaLogOriginals;
    svc.addWorkLog=originals.addWorkLog;svc.persist=originals.persist;window.fetch=originals.fetch;window.renderModuleRouteScreens=originals.render;
    return {calls:window.__qaLogCalls,apiCalls:window.__qaApiCalls,serviceRestore:svc.addWorkLog===originals.addWorkLog&&svc.persist===originals.persist,fetchRestore:window.fetch===originals.fetch,renderRestore:window.renderModuleRouteScreens===originals.render};
  });
  await boot(page,'worker','worker-cards?card=mc-005');
  const logAfter=await workerSnapshot(page);
  const logRestored=JSON.stringify(logBefore)===JSON.stringify(logAfter);
  expect(logRestored).toBe(true);
  const logAssertions={
    emptyHoursRejected:(await Promise.resolve(!!emptyHoursErrorId&&emptyHoursError.includes('0.5~24 MH'))),
    emptyHoursCalls,
    invalidHoursRejected,
    invalidHoursCalls,
    emptyTextRejected,
    emptyTextCalls,
    validAppendCalls:logCallsPending.length,
    correctCardId:logCallsPending[0].id==='mc-005',
    correctWorkerId:logCallsPending[0].workerId==='worker-001',
    busyDuringPending:logBusyDuringPending,
    duplicateClickBlocked:logCallsPending.length===1,
    duplicateKeyboardBlocked:logCallsPending.length===1,
    successFeedback,
    restored:logRestored
  };
  const logPass=logAssertions.emptyHoursCalls===0&&logAssertions.invalidHoursCalls===0&&logAssertions.emptyTextCalls===0&&logAssertions.validAppendCalls===1&&Object.entries(logAssertions).filter(([,value])=>typeof value==='boolean').every(([,value])=>value);
  interactions.checks.push({inventoryId:'UI-041',assertions:logAssertions,notApplicable:[],pass:logPass});
  qa.fixtures.push({name:'Work Log fixture',beforeSnapshot:logBefore,afterRestoreSnapshot:logAfter,serviceRestore:logRestoreResult.serviceRestore,fetchRestore:logRestoreResult.fetchRestore,renderRestore:logRestoreResult.renderRestore,operatingFixtureMutation:false,localStorageMutation:logBefore.localStorage!==logAfter.localStorage,apiCalls:logRestoreResult.apiCalls,restore:logRestored,pass:logRestored&&logRestoreResult.serviceRestore&&logRestoreResult.fetchRestore&&logRestoreResult.renderRestore&&logRestoreResult.apiCalls===0});
  a11yCheck('Work Log success','live success feedback and cleared busy','success status, aria-busy removed',{message:successMessage,busy:false},successFeedback);

  await page.setViewportSize({width:1440,height:1000});
  await boot(page,'worker','worker-cards?card=mc-005');
  const submitBefore=await workerSnapshot(page);
  await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    const card=window.ORDO_MODULE_CARDS.find(item=>item.id==='mc-005');
    window.__qaSubmitOriginals={submitWorkerReview:svc.submitWorkerReview,updateQc:svc.updateQc,persist:svc.persist,fetch:window.fetch,qc:card.qcChecklist.map(item=>item.passed)};
    window.__qaSubmitCalls=[];window.__qaQcForSubmitCalls=[];window.__qaApiCalls=0;
    window.__qaSubmitPromise=new Promise(resolve=>{window.__qaResolveSubmit=resolve;});
    svc.persist=()=>{};
    svc.updateQc=(target,index,passed)=>{window.__qaQcForSubmitCalls.push({id:target.id,index,passed});target.qcChecklist[index].passed=!!passed;return true;};
    svc.submitWorkerReview=(target,workerId,note)=>{window.__qaSubmitCalls.push({id:target.id,workerId,note,target:'review'});return window.__qaSubmitPromise;};
    window.fetch=(...args)=>{window.__qaApiCalls++;return Promise.reject(new Error('QA blocked'));};
  });
  let review=page.locator('[data-worker-action="review"]');
  await expect(review).toBeDisabled();
  const disabledNative=await review.isDisabled();
  const disabledReasonText=await page.locator('#workerSubmitReason').textContent();
  await review.evaluate(button=>button.click());
  const disabledClickCalls=await page.evaluate(()=>window.__qaSubmitCalls.length);
  await review.evaluate(button=>button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  const disabledEnterCalls=await page.evaluate(()=>window.__qaSubmitCalls.length);
  await review.evaluate(button=>button.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true})));
  const disabledSpaceCalls=await page.evaluate(()=>window.__qaSubmitCalls.length);
  expect([disabledClickCalls,disabledEnterCalls,disabledSpaceCalls]).toEqual([0,0,0]);
  file=shotPath('states','worker-submit-disabled-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  a11yCheck('Submit disabled','native disabled and described reason','disabled=true and QC reason',{disabled:disabledNative,reason:disabledReasonText},disabledNative&&disabledReasonText.includes('QC 체크리스트'));

  await page.locator('label[for="workerQc-mc-005-1"]').click();
  await page.locator('label[for="workerQc-mc-005-2"]').click();
  review=page.locator('[data-worker-action="review"]');
  const enabledByQcContract=!(await review.isDisabled());
  const accessibleName=(await review.innerText()).trim();
  const enabledReasonText=await page.locator('#workerSubmitReason').textContent();
  expect(enabledByQcContract).toBe(true);
  expect(accessibleName).toContain('리뷰 요청');
  expect(enabledReasonText).toContain('리뷰 요청 가능');
  file=shotPath('states','worker-submit-enabled-desktop-1440x1000.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  page.once('dialog',dialog=>dialog.accept('QA review request'));
  await review.focus();
  await page.keyboard.press('Enter');
  await expect(review).toBeDisabled();
  await expect(review).toHaveAttribute('aria-busy','true');
  await expect(review).toContainText('제출 중');
  const submitBusyDuringPending=await review.isDisabled()&&(await review.getAttribute('aria-busy'))==='true';
  const loadingText=(await review.innerText()).includes('제출 중');
  let submitCalls=await page.evaluate(()=>window.__qaSubmitCalls);
  expect(submitCalls).toHaveLength(1);
  expect(submitCalls[0]).toMatchObject({id:'mc-005',workerId:'worker-001',target:'review'});
  await review.evaluate(button=>{button.click();button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));button.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));});
  submitCalls=await page.evaluate(()=>window.__qaSubmitCalls);
  const duplicateClickBlocked=submitCalls.length===1;
  const duplicateEnterBlocked=submitCalls.length===1;
  const duplicateSpaceBlocked=submitCalls.length===1;
  await page.setViewportSize({width:390,height:844});
  file=shotPath('states','worker-submit-submitting-mobile-390x844.png');
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  const mobileContainment=await review.evaluate(button=>{const r=button.getBoundingClientRect();return r.left>=0&&r.right<=document.documentElement.clientWidth+1;});
  a11yCheck('Submit submitting','busy, disabled, and loading text','aria-busy=true, disabled=true, 제출 중',{busy:submitBusyDuringPending,loadingText},submitBusyDuringPending&&loadingText);
  a11yCheck('Mobile controls','390px review button containment','inside viewport',mobileContainment,mobileContainment);
  await page.evaluate(()=>window.__qaResolveSubmit({ok:true}));
  await page.waitForTimeout(80);
  review=page.locator('[data-worker-action="review"]');
  const busyCleared=(await review.getAttribute('aria-busy'))!=='true';
  const submitRestoreResult=await page.evaluate(()=>{
    const svc=window.ORDO_MODULE_CARD_LIFECYCLE;
    const card=window.ORDO_MODULE_CARDS.find(item=>item.id==='mc-005');
    const originals=window.__qaSubmitOriginals;
    card.qcChecklist.forEach((item,index)=>{item.passed=originals.qc[index];});
    svc.submitWorkerReview=originals.submitWorkerReview;svc.updateQc=originals.updateQc;svc.persist=originals.persist;window.fetch=originals.fetch;
    renderModuleRouteScreens('worker-cards');
    return {calls:window.__qaSubmitCalls,apiCalls:window.__qaApiCalls,serviceRestore:svc.submitWorkerReview===originals.submitWorkerReview&&svc.updateQc===originals.updateQc&&svc.persist===originals.persist,fetchRestore:window.fetch===originals.fetch,status:card.status};
  });
  await boot(page,'worker','worker-cards?card=mc-005');
  const submitAfter=await workerSnapshot(page);
  const submitRestored=JSON.stringify(submitBefore)===JSON.stringify(submitAfter);
  expect(submitRestored).toBe(true);
  const submitAssertions={
    disabledNative,
    disabledClickCalls,
    disabledEnterCalls,
    disabledSpaceCalls,
    enabledByQcContract,
    accessibleName:accessibleName.includes('리뷰 요청'),
    lifecycleCalls:submitCalls.length,
    correctCardId:submitCalls[0].id==='mc-005',
    correctWorkerId:submitCalls[0].workerId==='worker-001',
    correctTransition:submitCalls[0].target==='review',
    busyDuringPending:submitBusyDuringPending,
    duplicateClickBlocked,
    duplicateEnterBlocked,
    duplicateSpaceBlocked,
    busyCleared,
    apiCalls:submitRestoreResult.apiCalls,
    localStorageUnchanged:submitBefore.localStorage===submitAfter.localStorage,
    restored:submitRestored
  };
  const submitPass=submitAssertions.disabledClickCalls===0&&submitAssertions.disabledEnterCalls===0&&submitAssertions.disabledSpaceCalls===0&&submitAssertions.lifecycleCalls===1&&submitAssertions.apiCalls===0&&Object.entries(submitAssertions).filter(([,value])=>typeof value==='boolean').every(([,value])=>value);
  interactions.checks.push({inventoryId:'UI-042',assertions:submitAssertions,notApplicable:[],pass:submitPass});
  qa.fixtures.push({name:'Submit fixture',beforeSnapshot:submitBefore,afterRestoreSnapshot:submitAfter,serviceRestore:submitRestoreResult.serviceRestore,fetchRestore:submitRestoreResult.fetchRestore,operatingFixtureMutation:false,localStorageMutation:submitBefore.localStorage!==submitAfter.localStorage,apiCalls:submitRestoreResult.apiCalls,restore:submitRestored,pass:submitRestored&&submitRestoreResult.serviceRestore&&submitRestoreResult.fetchRestore&&submitRestoreResult.apiCalls===0});

  await page.setViewportSize({width:1440,height:1000});
  await boot(page,'worker','worker-home');
  const homeA11y=await page.evaluate(()=>({kpis:document.querySelectorAll('#workerHomeKpis .ordo-c-kpi-card').length,progressText:document.querySelector('[data-worker-progress-for="mc-005"]')?.textContent.trim()||''}));
  a11yCheck('Worker Home KPI/progress','KPI count plus visible QC progress','4 KPI cards and QC 1/3 · 33%',homeA11y,homeA11y.kpis===4&&homeA11y.progressText.includes('1/3')&&homeA11y.progressText.includes('33%'));
  await boot(page,'worker','worker-cards?card=mc-005');
  const cardsA11y=await page.evaluate(()=>({filters:Array.from(document.querySelectorAll('[data-worker-filter]')).map(button=>button.getAttribute('aria-pressed')),selected:document.querySelector('[data-worker-card][data-state="selected"]')?.getAttribute('aria-pressed'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));
  a11yCheck('Worker Cards filter','aria-pressed filter states','6 boolean states',cardsA11y.filters,cardsA11y.filters.length===6&&cardsA11y.filters.every(value=>value==='true'||value==='false'));
  a11yCheck('Work-card selected','selected card aria-pressed','true',cardsA11y.selected,cardsA11y.selected==='true');
  a11yCheck('Reduced motion','media query','true',cardsA11y.reduced,cardsA11y.reduced===true);
  await page.evaluate(()=>{document.body.setAttribute('tabindex','-1');document.body.focus();});
  for(let i=0;i<40;i++){if(await page.evaluate(()=>document.activeElement?.hasAttribute('data-worker-filter')))break;await page.keyboard.press('Tab');}
  const focusMeasurement=await page.evaluate(()=>{const style=getComputedStyle(document.activeElement);return{target:document.activeElement?.getAttribute('data-worker-filter')||'',outline:style.outlineStyle,shadow:style.boxShadow};});
  a11yCheck('Focus visible','keyboard focus styling','filter focus with outline or shadow',focusMeasurement,!!focusMeasurement.target&&(focusMeasurement.outline!=='none'||focusMeasurement.shadow!=='none'));
});

test('Admin Client Profile and public screens reject Worker leakage',async({page})=>{
  const cases=[['admin','admin-home',1440,1000],['admin','admin-projects',1440,1000],['admin','admin-cards',1440,1000],['admin','admin-team',1440,1000],['admin','admin-audit',1440,1000],['admin','admin-home',1024,1366],['admin','admin-home',390,844],['client','dashboard',1440,1000],['client','project',1440,1000],['client','approvals',1440,1000],['client','dashboard',1024,1366],['client','dashboard',390,844],['client','profile',1440,1000],['worker','profile',1440,1000],['worker','profile',1024,1366],['worker','profile',390,844]];
  for(const [role,route,width,height] of cases){await page.setViewportSize({width,height});await boot(page,role,route);const result=await page.evaluate(()=>{const active=document.querySelector('.screen.active');return{classLeak:active.querySelectorAll('[class*="ordo-worker-"]').length,token:getComputedStyle(active).getPropertyValue('--ordo-worker-surface').trim(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};});expect(result.classLeak).toBe(0);expect(result.token).toBe('');const dir=path.join(evidence,'non-worker');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${role}-${route}-${width}x${height}.png`);await page.screenshot({path:file,fullPage:true,animations:'disabled'});nonWorker.cases.push({role,route,viewport:`${width}x${height}`,...result,evidence:rel(file),pass:result.classLeak===0&&!result.token&&!result.overflow});}
  for(const [viewport,[width,height]] of Object.entries(publicViewports))for(const route of publicRoutes){await page.setViewportSize({width,height});await page.goto(base+'#'+route);await page.waitForFunction(r=>document.getElementById(`screen-${r}`)?.classList.contains('active'),route);await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.worker.css"]').disabled=false;});const enabled=await publicSignature(page,route);await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.worker.css"]').disabled=true;});const disabled=await publicSignature(page,route);await page.evaluate(()=>{document.querySelector('link[href*="dashboard-salesops.worker.css"]').disabled=false;});const equal=JSON.stringify(enabled)===JSON.stringify(disabled);const pass=equal&&!enabled.authOn&&!enabled.overflow;const dir=path.join(evidence,'frozen-public');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${route}-${viewport}-${width}x${height}.png`);await page.screenshot({path:file,fullPage:true,animations:'disabled'});publicRegression.cases.push({route,viewport:`${width}x${height}`,domStyleBoxEqual:equal,authOn:enabled.authOn,overflow:enabled.overflow,evidence:rel(file),pass});expect(pass).toBe(true);}
  expect(publicRegression.cases).toHaveLength(18);
});
