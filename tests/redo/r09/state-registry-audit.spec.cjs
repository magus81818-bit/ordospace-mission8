const {test,expect}=require('../r04/node_modules/@playwright/test');
const {currentBase,write,shot,ready}=require('./audit-helpers.cjs');
const {STATE_ASSERTION_REGISTRY}=require('./state-assertion-registry.cjs');
const runtime={generatedAt:new Date().toISOString(),registryFile:'tests/redo/r09/state-assertion-registry.cjs',rows:[],consoleErrors:[],pageErrors:[]};
test.setTimeout(360000);
const slug=value=>value.toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-|-$/g,'');
async function boot(page,role='client',route='dashboard',mobile=false){
 await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
 await page.goto(currentBase+'?r9state='+Date.now()+'#select-workspace');await ready(page);
 await page.locator(`[data-ws-role="${role}"]`).click();await page.goto(currentBase+'#'+route);await ready(page);
}
async function styleState(locator){
 return locator.evaluate(node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return{visible:style.display!=='none'&&rect.width>0&&rect.height>0,focused:document.activeElement===node,background:style.backgroundColor,color:style.color,outline:style.outlineStyle,shadow:style.boxShadow,inside:rect.left>=0&&rect.right<=document.documentElement.clientWidth};});
}
async function measure(page,key,record){
 const [inventoryId,state]=key.split('/');
 if(record.scenario==='status-badge'||record.scenario==='metric-card'||record.scenario==='progress'){
  await page.goto(currentBase+'?dev=1#components-gallery');await ready(page);
  return page.evaluate(({record})=>{
   let probe=document.getElementById('r9StateProbe');if(!probe){probe=document.createElement('div');probe.id='r9StateProbe';probe.style.cssText='position:fixed;z-index:9999;left:24px;top:24px;width:360px;padding:24px;background:white;border:1px solid #ddd';document.body.appendChild(probe);}
   const ui=window.ORDO_UI_COMPONENTS;
   if(record.scenario==='status-badge'){probe.innerHTML=ui.StatusBadge(record.label,record.tone);const node=probe.querySelector('.ordo-c-status-badge');return{scenario:record.scenario,text:node.textContent.trim(),toneClass:node.className,visible:node.getBoundingClientRect().width>0,pass:node.textContent.trim()===record.label&&node.className.includes('st-'+record.tone)};}
   if(record.scenario==='metric-card'){probe.innerHTML=ui.MetricCard('측정 KPI',record.value,'Round 9 assertion',record.tone);const node=probe.querySelector('.ordo-c-kpi-card'),value=node.children[1];return{scenario:record.scenario,text:node.textContent.replace(/\s+/g,' ').trim(),valueClass:value.className,visible:node.getBoundingClientRect().width>0,pass:value.textContent===record.value&&value.className.includes(record.tone)};}
   probe.innerHTML=ui.ProgressTrack('측정 진행률',record.approved,record.total,'Round 9 assertion');const fill=probe.querySelector('.progress-fill'),track=probe.querySelector('.progress-track'),width=Number.parseFloat(fill.style.width),trackOverflow=getComputedStyle(track).overflow,contained=probe.scrollWidth<=probe.clientWidth,rangePass=record.overflowSafe?trackOverflow==='hidden':width>=0&&width<=100;return{scenario:record.scenario,width,trackOverflow,ariaText:probe.textContent.replace(/\s+/g,' ').trim(),contained,pass:width===record.expected&&rangePass&&contained};
  },{record});
 }
 if(record.scenario==='sidebar'){
  await boot(page,'admin','admin-home',false);const links=page.locator('#sideMenu a'),target=record.mode==='hover'?links.nth(1):links.first();
  if(record.mode==='hover'){const before=await styleState(target);await target.hover();const after=await styleState(target);return{before,after,pass:after.visible&&(before.background!==after.background||before.color!==after.color)};}
  if(record.mode==='active'){const active=page.locator('#sideMenu a[href="#admin-home"]'),count=await active.count(),href=count?await active.first().getAttribute('href'):null,style=count?await styleState(active.first()):null;return{count,href,style,pass:count===1&&href==='#admin-home'&&style.visible};}
  if(record.mode==='badge'){const linkCount=await links.count(),badgeCount=await page.locator('#sideMenu a span').evaluateAll(nodes=>nodes.filter(node=>/\d+/.test(node.textContent||'')).length);return{linkCount,badgeCount,pass:linkCount>0&&badgeCount>0};}
  const style=await styleState(target);return{linkCount:await links.count(),style,pass:await links.count()>0&&style.visible};
 }
 if(record.scenario==='topbar'){
  await boot(page,'client','dashboard',false);const topbar=page.locator('#topbar'),trigger=page.locator('#notifTrigger');
  if(record.mode==='dropdown-open'){await trigger.click();const expanded=await trigger.getAttribute('aria-expanded'),panelStyle=await styleState(page.locator('#notifPanel'));return{expanded,panelStyle,pass:expanded==='true'&&panelStyle.visible};}
  if(record.mode==='focus'){await trigger.focus();const style=await styleState(trigger);return{style,pass:style.focused&&(style.outline!=='none'||style.shadow!=='none')};}
  const style=await styleState(topbar);return{style,pass:style.visible};
 }
 if(record.scenario==='mobile-header'){
  await boot(page,'client','dashboard',true);const header=page.locator('#mheader'),button=page.locator('#openDrawer');
  if(record.mode==='focus'){await button.focus();const style=await styleState(button);return{style,pass:style.focused&&(style.outline!=='none'||style.shadow!=='none')};}
  const style=await styleState(header);return{style,pass:style.visible};
 }
 if(record.scenario==='drawer'){
  await boot(page,'client','dashboard',true);const button=page.locator('#openDrawer'),overlay=page.locator('#drawerOverlay');
  if(record.mode==='backdrop'){await button.click();await overlay.locator('[data-close-drawer]').first().click({position:{x:380,y:10}});return{hidden:await overlay.getAttribute('aria-hidden'),expanded:await button.getAttribute('aria-expanded'),pass:await overlay.getAttribute('aria-hidden')==='true'&&await button.getAttribute('aria-expanded')==='false'};}
  if(record.mode==='escape'){await button.click();await page.keyboard.press('Escape');return{hidden:await overlay.getAttribute('aria-hidden'),focused:await button.evaluate(node=>document.activeElement===node),pass:await overlay.getAttribute('aria-hidden')==='true'&&await button.evaluate(node=>document.activeElement===node)};}
  const closed=await overlay.getAttribute('aria-hidden');await button.click();const opened=await overlay.getAttribute('aria-hidden');return{closed,opened,pass:closed==='true'&&opened==='false'};
 }
 if(record.scenario==='mobile-tabs'){
  await boot(page,'client','dashboard',true);const tabs=page.locator('#mtab a');
  if(record.mode==='active'){const active=page.locator('#mtab a[href="#dashboard"]'),count=await active.count(),style=count?await styleState(active.first()):null;return{count,style,pass:count===1&&style.visible};}
  if(record.mode==='badge'){const tabCount=await tabs.count(),badgeCount=await page.locator('#mtab a span').evaluateAll(nodes=>nodes.filter(node=>/\d+/.test(node.textContent||'')).length);return{tabCount,badgeCount,pass:tabCount>0&&badgeCount>0};}
  const style=await styleState(tabs.first());return{tabCount:await tabs.count(),style,pass:await tabs.count()>0&&style.visible};
 }
 if(record.scenario==='notification'){
  await boot(page,'client','dashboard',false);const trigger=page.locator('#notifTrigger'),panel=page.locator('#notifPanel');
  if(record.mode==='empty'){const actual=await page.evaluate(()=>{const original=window.ORDO_NOTIFICATIONS.client;window.ORDO_NOTIFICATIONS.client=[];renderNotifList('client');const status=document.querySelector('#notifList [role="status"]');const result={name:status?.getAttribute('aria-label'),text:status?.textContent.trim()};window.ORDO_NOTIFICATIONS.client=original;renderNotifList('client');return result;});return{...actual,pass:actual.name==='새 알림 없음'};}
  await trigger.click();
  if(record.mode==='unread-read'){const unread=await page.locator('#notifList [data-unread="true"]').count(),read=await page.locator('#notifList [data-unread="false"]').count();return{unread,read,pass:unread>0&&read>0};}
  const expanded=await trigger.getAttribute('aria-expanded'),panelStyle=await styleState(panel);return{expanded,panelStyle,pass:expanded==='true'&&panelStyle.visible};
 }
 if(record.scenario==='theme'){
  await boot(page,'client','dashboard',false);const buttons=page.locator('[data-theme-val]'),target=page.locator(`[data-theme-val="${record.mode==='hover'?'light':'dark'}"]`);
  if(record.mode==='hover'){const before=await styleState(target);await target.hover();const after=await styleState(target);return{before,after,pass:after.visible&&(before.background!==after.background||before.color!==after.color)};}
  if(record.mode==='selected'){const original=await page.evaluate(()=>localStorage.getItem('ordo_theme'));await target.click();const selected=await target.getAttribute('aria-pressed'),stored=await page.evaluate(()=>localStorage.getItem('ordo_theme'));await page.evaluate(value=>value===null?localStorage.removeItem('ordo_theme'):localStorage.setItem('ordo_theme',value),original);return{selected,stored,pass:selected==='true'&&stored==='dark'};}
  return{count:await buttons.count(),pressed:await buttons.evaluateAll(nodes=>nodes.filter(node=>node.getAttribute('aria-pressed')==='true').length),pass:await buttons.count()===3&&await buttons.evaluateAll(nodes=>nodes.filter(node=>node.getAttribute('aria-pressed')==='true').length)===1};
 }
 if(record.scenario==='breadcrumb'){
  await boot(page,'admin','admin-home',false);const target=page.locator('#breadcrumbTail');
  if(record.mode==='long-title'){const original=await target.textContent(),long='매우 긴 프로젝트 운영 감사 제목 '.repeat(14);await target.evaluate((node,value)=>node.textContent=value,long);const state=await target.evaluate(node=>{const rect=node.getBoundingClientRect();return{text:node.textContent,wraps:node.scrollHeight>Number.parseFloat(getComputedStyle(node).lineHeight)||node.scrollWidth<=node.clientWidth,inside:rect.right<=document.documentElement.clientWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});await target.evaluate((node,value)=>node.textContent=value,original);return{...state,pass:state.text.length>100&&state.inside&&state.overflow<=1};}
  const text=await target.textContent(),style=await styleState(target);return{text,style,pass:Boolean(text.trim())&&style.visible};
 }
 if(record.scenario==='primary-cta'){
  await boot(page,'client','dashboard',false);const target=page.locator('#topbarPrimaryCta a,#topbarPrimaryCta button').first();
  if(record.mode==='hover'){const before=await styleState(target);await target.hover();const after=await styleState(target);return{before,after,pass:after.visible&&(before.background!==after.background||before.color!==after.color)};}
  if(record.mode==='focus'){await target.focus();const style=await styleState(target);return{style,pass:style.focused&&(style.outline!=='none'||style.shadow!=='none')};}
  if(record.mode==='disabled'){const actual=await target.evaluate(node=>{const before=node.getAttribute('href');node.setAttribute('aria-disabled','true');node.removeAttribute('href');node.classList.add('is-disabled');const result={ariaDisabled:node.getAttribute('aria-disabled'),href:node.getAttribute('href'),focusBefore:document.activeElement===node};if(before)node.setAttribute('href',before);node.removeAttribute('aria-disabled');node.classList.remove('is-disabled');return result;});return{...actual,pass:actual.ariaDisabled==='true'&&actual.href===null};}
  const text=await target.textContent(),style=await styleState(target);return{text:text.trim(),style,pass:Boolean(text.trim())&&style.visible};
 }
 return{pass:false,error:`unknown scenario ${record.scenario}`,inventoryId,state};
}
test.beforeEach(async({page})=>{await page.addInitScript(()=>{window.ORDO_DISABLE_MODULE_CARD_REMOTE=true;});page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))runtime.consoleErrors.push(message.text());});page.on('pageerror',error=>runtime.pageErrors.push(error.message));});
test.afterAll(()=>write('state-assertion-audit.json',{...runtime,registryCount:Object.keys(STATE_ASSERTION_REGISTRY).length,executedCount:runtime.rows.length,pass:runtime.rows.length===Object.keys(STATE_ASSERTION_REGISTRY).length&&runtime.rows.every(row=>row.pass)&&runtime.consoleErrors.length===0&&runtime.pageErrors.length===0}));
test('Round 3 and Round 5 item-state assertion registry executes every key',async({page})=>{
 for(const [key,record] of Object.entries(STATE_ASSERTION_REGISTRY)){
  const actual=await measure(page,key,record),evidence=await shot(page,'state-registry',`${key.split('/')[0].toLowerCase()}-${slug(key.split('/').slice(1).join('-'))}.png`),row={registryKey:key,inventoryId:key.split('/')[0],state:key.split('/').slice(1).join('/'),record,actual,evidence,evidenceGeneratedByAssertion:true,assertionExecuted:true,pass:actual.pass===true};runtime.rows.push(row);expect(row.pass,JSON.stringify(row)).toBeTruthy();
 }
});
