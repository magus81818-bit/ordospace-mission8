const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

(async () => {
const root = path.resolve(__dirname, '..', '..', '..');
const evidenceRoot = path.join(root, 'evidence', 'redo', 'r02', 'salesops-live');
const artifactRoot = path.join(root, 'artifacts', 'redo', 'r02');
const url = 'https://v0-sales-operations-dashboard.vercel.app/';
const menu = ['Overview','Pipeline','Deals','Customers','Team','Forecasting','Reports','Settings'];
const viewports = { desktop:{width:1440,height:1000}, tablet:{width:1024,height:1366}, mobile:{width:390,height:844} };
for (const dir of [...Object.keys(viewports), 'states']) fs.mkdirSync(path.join(evidenceRoot,dir),{recursive:true});
fs.mkdirSync(artifactRoot,{recursive:true});

const audit={generatedAt:new Date().toISOString(),url,menuOrder:[],sections:[],screenshots:[],consoleErrors:[],pageErrors:[],requestFailures:[],httpErrors:[],metrics:[],states:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({locale:'en-US',colorScheme:'dark',reducedMotion:'reduce'});
const page=await context.newPage();
page.on('console',msg=>{if(msg.type()==='error')audit.consoleErrors.push({url:page.url(),text:msg.text()});});
page.on('pageerror',err=>audit.pageErrors.push({url:page.url(),text:err.message}));
page.on('requestfailed',req=>audit.requestFailures.push({url:req.url(),method:req.method(),failure:req.failure()?.errorText||'unknown'}));
page.on('response',res=>{if(res.status()>=400)audit.httpErrors.push({url:res.url(),status:res.status(),method:res.request().method()});});

await page.setViewportSize(viewports.desktop);
await page.goto(url,{waitUntil:'networkidle',timeout:60000});
audit.title=await page.title();
audit.menuOrder=await page.locator('aside nav button').allTextContents();
audit.menuOrder=audit.menuOrder.map(x=>x.trim()).filter(Boolean);
if(JSON.stringify(audit.menuOrder)!==JSON.stringify(menu))throw new Error(`Unexpected menu: ${audit.menuOrder.join(', ')}`);

for(const [viewportName,viewport] of Object.entries(viewports)){
  await page.setViewportSize(viewport);
  for(const section of menu){
    const button=page.locator('aside nav button').filter({hasText:section});
    if(await button.count()!==1)throw new Error(`Non-unique nav ${section}`);
    await button.click();
    await page.waitForTimeout(650);
    const slug=section.toLowerCase();
    const file=path.join(evidenceRoot,viewportName,`${slug}.png`);
    await page.screenshot({path:file,fullPage:true});
    audit.screenshots.push(path.relative(root,file).replaceAll('\\','/'));
    const measurement=await page.evaluate(({section,viewportName})=>{
      const aside=document.querySelector('aside'),header=document.querySelector('header'),main=document.querySelector('main');
      const card=document.querySelector('main .bg-card'),tableRow=document.querySelector('main tbody tr'),h1=document.querySelector('header h1'),h2=document.querySelector('main h2');
      const style=el=>el?getComputedStyle(el):null,rect=el=>el?el.getBoundingClientRect():null;
      return {section,viewport:viewportName,headerTitle:h1?.textContent?.trim()||'',sectionTitle:h2?.textContent?.trim()||'',sidebarWidth:rect(aside)?.width||0,headerHeight:rect(header)?.height||0,mainLeft:rect(main)?.left||0,cardPadding:style(card)?.padding||null,cardRadius:style(card)?.borderRadius||null,cardBackground:style(card)?.backgroundColor||null,cardBorder:style(card)?.borderColor||null,rowHeight:rect(tableRow)?.height||null,fontFamily:style(document.body)?.fontFamily||null,bodyBackground:style(document.body)?.backgroundColor||null,foreground:style(document.body)?.color||null,overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth};
    },{section,viewportName});
    audit.metrics.push(measurement);
    audit.sections.push({name:section,slug,viewport:viewportName,url:page.url(),title:audit.title,measurement});
  }
}

await page.setViewportSize(viewports.desktop);
let nav=page.locator('aside nav button').filter({hasText:'Overview'}); await nav.click(); await page.waitForTimeout(500);
let collapse=page.locator('aside button').filter({hasText:'Collapse'}); if(await collapse.count()!==1)throw new Error('Collapse control missing'); await collapse.click(); await page.waitForTimeout(400);
let collapsedFile=path.join(evidenceRoot,'states','sidebar-collapsed-desktop.png'); await page.screenshot({path:collapsedFile,fullPage:true}); audit.screenshots.push(path.relative(root,collapsedFile).replaceAll('\\','/'));
audit.states.push({name:'sidebar-collapsed',sidebarWidth:await page.locator('aside').evaluate(el=>el.getBoundingClientRect().width),evidence:path.relative(root,collapsedFile).replaceAll('\\','/')});
let expand=page.locator('aside > div:last-child button'); if(await expand.count()!==1)throw new Error('Expand control missing'); await expand.click(); await page.waitForTimeout(400);
let search=page.locator('header input[placeholder="Search..."]'); if(await search.count()!==1)throw new Error('Header search missing'); await search.focus(); await page.waitForTimeout(250);
let focusFile=path.join(evidenceRoot,'states','header-search-focus.png'); await page.screenshot({path:focusFile}); audit.screenshots.push(path.relative(root,focusFile).replaceAll('\\','/')); audit.states.push({name:'focus',evidence:path.relative(root,focusFile).replaceAll('\\','/')});
let card=page.locator('main .bg-card').first(); await card.hover(); await page.waitForTimeout(300);
let hoverFile=path.join(evidenceRoot,'states','metric-card-hover.png'); await page.screenshot({path:hoverFile}); audit.screenshots.push(path.relative(root,hoverFile).replaceAll('\\','/')); audit.states.push({name:'hover',evidence:path.relative(root,hoverFile).replaceAll('\\','/')});
let settingsNav=page.locator('aside nav button').filter({hasText:'Settings'}); await settingsNav.click(); await page.waitForTimeout(500);
let notificationsTab=page.getByRole('tab',{name:'Notifications'}); if(await notificationsTab.count()===1){await notificationsTab.click();await page.waitForTimeout(300);let f=path.join(evidenceRoot,'states','settings-tab-selected.png');await page.screenshot({path:f,fullPage:true});audit.screenshots.push(path.relative(root,f).replaceAll('\\','/'));audit.states.push({name:'selected-tab',evidence:path.relative(root,f).replaceAll('\\','/')});}
let profileTab=page.getByRole('tab',{name:'Profile'}); if(await profileTab.count()===1){await profileTab.click();await page.waitForTimeout(300);}
let save=page.getByRole('button',{name:'Save Changes'}); if(await save.count()===1){await save.click();await page.waitForTimeout(150);let saving=page.getByRole('button',{name:'Saving...'});let f=path.join(evidenceRoot,'states','settings-loading-disabled.png');await page.screenshot({path:f,fullPage:true});audit.screenshots.push(path.relative(root,f).replaceAll('\\','/'));audit.states.push({name:'loading-disabled',disabled:await saving.count()===1?await saving.isDisabled():null,evidence:path.relative(root,f).replaceAll('\\','/')});}
await page.waitForTimeout(1600);
let dealsNav=page.locator('aside nav button').filter({hasText:'Deals'});await dealsNav.click();await page.waitForTimeout(350);
let wonFilter=page.getByRole('button',{name:'Won'});if(await wonFilter.count()===1){await wonFilter.click();await page.waitForTimeout(200);let f=path.join(evidenceRoot,'states','deals-filter-selected.png');await page.screenshot({path:f,fullPage:true});audit.screenshots.push(path.relative(root,f).replaceAll('\\','/'));audit.states.push({name:'selected-filter',evidence:path.relative(root,f).replaceAll('\\','/')});}
let dealSearch=page.locator('main input[placeholder="Search deals..."]');if(await dealSearch.count()===1){await dealSearch.fill('no-matching-deal');await page.waitForTimeout(200);let f=path.join(evidenceRoot,'states','deals-empty-result.png');await page.screenshot({path:f,fullPage:true});audit.screenshots.push(path.relative(root,f).replaceAll('\\','/'));audit.states.push({name:'empty-result',evidence:path.relative(root,f).replaceAll('\\','/')});}
await settingsNav.click();await page.waitForTimeout(350);let roleSelect=page.locator('button[role="combobox"]').first();if(await roleSelect.count()===1){await roleSelect.click();await page.waitForTimeout(200);let f=path.join(evidenceRoot,'states','settings-select-open.png');await page.screenshot({path:f,fullPage:true});audit.screenshots.push(path.relative(root,f).replaceAll('\\','/'));audit.states.push({name:'select-open',evidence:path.relative(root,f).replaceAll('\\','/')});await page.keyboard.press('Escape');}

const v0Page=await context.newPage();await v0Page.setViewportSize(viewports.desktop);await v0Page.goto('https://v0.app/templates/salesops-dashboard-9q2Mfgu6cDi',{waitUntil:'domcontentloaded',timeout:60000});await v0Page.waitForTimeout(2500);const v0File=path.join(evidenceRoot,'states','official-v0-template.png');await v0Page.screenshot({path:v0File,fullPage:true});audit.screenshots.push(path.relative(root,v0File).replaceAll('\\','/'));audit.officialV0={url:v0Page.url(),title:await v0Page.title(),evidence:path.relative(root,v0File).replaceAll('\\','/')};await v0Page.close();

audit.finishedAt=new Date().toISOString();
fs.writeFileSync(path.join(artifactRoot,'salesops-browser-audit.json'),`${JSON.stringify(audit,null,2)}\n`,'utf8');
await browser.close();
console.log(JSON.stringify({sections:audit.sections.length,menu:audit.menuOrder,screenshots:audit.screenshots.length,consoleErrors:audit.consoleErrors.length,pageErrors:audit.pageErrors.length,requestFailures:audit.requestFailures.length,httpErrors:audit.httpErrors.length}));
})().catch(error => { console.error(error); process.exit(1); });
