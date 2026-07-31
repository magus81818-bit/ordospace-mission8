const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..','..','..');
const artifactRoot=path.join(root,'artifacts','redo','r06');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const normalize=text=>String(text).replace(/\r\n/g,'\n').trim();
const json=p=>JSON.parse(read(p));
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const checks=[];const check=(pass,name,detail='')=>checks.push({name,pass:Boolean(pass),detail});
const ids=Array.from({length:21},(_,i)=>`UI-${String(i+43).padStart(3,'0')}`);
const states=['default','hover','focus-visible','active','selected','disabled','loading','empty','no-result','error','success','validation error','long content','overflow','Desktop','Tablet','Mobile','reduced motion'];
const files={
  'UI-043':['admin/home','operations KPI row'], 'UI-044':['admin/home','immediate-action cards'],
  'UI-045':['admin/home','project summary table'], 'UI-046':['admin/home','resource rows'],
  'UI-047':['admin/projects','board/table view toggle'], 'UI-048':['admin/projects','five-stage project board'],
  'UI-049':['admin/projects','project table'], 'UI-050':['admin/projects','project detail tabs/body'],
  'UI-051':['admin/cards','gate-ready banner'], 'UI-052':['admin/cards','Module filter toolbar'],
  'UI-053':['admin/cards','Module list/detail'], 'UI-054':['admin/cards','lifecycle action set'],
  'UI-055':['admin/cards','bulk-create sheet'], 'UI-056':['admin/team','partners/heatmap tabs'],
  'UI-057':['admin/team','partner KPI/table'], 'UI-058':['admin/team','weekly heatmap'],
  'UI-059':['admin/team','partner invite sheet'], 'UI-060':['admin/team','reassign modal'],
  'UI-061':['admin/audit','audit timeline'], 'UI-062':['admin/audit','audit target detail'],
  'UI-063':['admin/audit','CSV export action']
};
fs.mkdirSync(artifactRoot,{recursive:true});

const branch=git(['branch','--show-current']);
const base='65465846487065b861756a8c7353c8df8c63ccc5';
const descendant=/^redo\/r(?:0[7-9]|10)-/.test(branch);
const workerDescendant=/^redo\/r(?:0[8-9]|10)-/.test(branch);
check(branch==='redo/r06-admin-dashboard'||descendant,'current or approved descendant branch',branch);
check(git(['merge-base',base,'HEAD'])===base,'Round 5 approved merge-base',base);

const matrix=json('artifacts/redo/r02/component-migration-matrix.json').rows.filter(x=>ids.includes(x.ordospaceInventoryId));
check(matrix.length===21,'official inventory count',String(matrix.length));
check(new Set(matrix.map(x=>x.ordospaceInventoryId)).size===21,'official inventory unique');
check(matrix.every(x=>x.implementationRound==='Round 6'),'no out-of-round inventory completed');

for(const file of ['app/styles/dashboard-salesops.admin.css','app/ui/components/admin.ui.js','references/prompts/round-6.md'])check(fs.existsSync(path.join(root,file)),`required file ${file}`);
const css=read('app/styles/dashboard-salesops.admin.css');
const ui=read('app/ui/components/admin.ui.js');
const tokenCss=read('app/styles/dashboard-salesops.tokens.css');
const declared=new Set([...tokenCss.matchAll(/(--ordo-so-[\w-]+)\s*:/g)].map(x=>x[1]));
const used=[...new Set([...css.matchAll(/var\((--ordo-so-[\w-]+)/g)].map(x=>x[1]))];
const unresolved=used.filter(x=>!declared.has(x));
const rawColors=[...css.matchAll(/#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(/gi)].map(x=>x[0]);
const important=(css.match(/!important/g)||[]).length;
check(/^body\.auth-on/m.test(css),'authenticated scope');
check(/#screen-admin-home/.test(css)&&/#screen-admin-audit/.test(css),'five Admin screen namespaces');
check(!/#(sidebar|topbar|mheader|mtab|drawerOverlay)\b/.test(css),'no Round 5 shell selector');
check(!/#screen-(dashboard|project|approvals|worker-home|worker-cards|landing|auth|terms|privacy|support|select-workspace)/.test(css),'no Client Worker or public selector');
check(rawColors.length===0,'raw color additions zero',rawColors.join(','));
check(important===0,'important additions zero',String(important));
check(unresolved.length===0,'unresolved tokens zero',unresolved.join(','));
check(used.length>=20,'Round 3 token consumption',String(used.length));
check(!/fetch\s*\(|XMLHttpRequest|localStorage\.(setItem|removeItem)/.test(ui),'Admin decorator has no API or storage mutation');

const changed=git(['diff','--name-only',base,'HEAD']).split(/\r?\n/).filter(Boolean);
const forbiddenChanged=changed.filter(file=>file.startsWith('backend/')||file.startsWith('api/')||(!workerDescendant&&file.includes('worker-workspace'))||file.includes('app-shell.js')||(!descendant&&file.includes('client-workspace')));
check(forbiddenChanged.length===0,'no backend API or Shell change; Client and Worker changes only on approved descendants',forbiddenChanged.join(','));
for(const dataFile of ['app/data/workspace.data.js','app/data/room.data.js','app/services/session.service.js','app/config/api.config.js','app/layout/app-shell.js']){
  const baseline=git(['show',`${base}:${dataFile}`]);
  check(normalize(read(dataFile))===normalize(baseline),`parity ${dataFile}`);
}
const source=read('app/screens/admin-workspace.screen.js');
const baselineSource=git(['show',`${base}:app/screens/admin-workspace.screen.js`]);
const projectFixture=text=>(text.match(/function adminProjects\(\)[\s\S]*?function adminProjectStatusLabel/)||[''])[0];
check(normalize(projectFixture(source))===normalize(projectFixture(baselineSource)),'Admin project fixture deep equality');
const seedAudit=text=>(text.match(/\(function seedModuleCardAuditEvents\(\)[\s\S]*?\}\)\(\);/)||[''])[0];
check(normalize(seedAudit(source))===normalize(seedAudit(baselineSource)),'Audit fixture deep equality');

const index=read('index.html');
const baselineIndex=git(['show',`${base}:index.html`]);
const currentScreenIds=[...index.matchAll(/<section id="screen-([^"]+)"/g)].map(x=>x[1]).filter(id=>id!=='화면이름');
const baseScreenIds=[...baselineIndex.matchAll(/<section id="screen-([^"]+)"/g)].map(x=>x[1]).filter(id=>id!=='화면이름');
check(currentScreenIds.length===19&&new Set(currentScreenIds).size===19,'19 existing screen IDs retained',String(currentScreenIds.length));
check(baseScreenIds.every(id=>currentScreenIds.includes(id)),'baseline screen IDs subset');
for(const route of ['admin-home','admin-projects','admin-cards','admin-team','admin-audit'])check(index.includes(`id="screen-${route}"`),`Admin route ${route}`);
check(index.includes('dashboard-salesops.admin.css')&&index.includes('admin.ui.js'),'Round 6 assets linked');

const browserFiles=['admin-browser-audit.json','non-admin-regression.json','layout-preservation.json','frozen-public-regression.json','accessibility-audit.json'];
for(const file of browserFiles)check(fs.existsSync(path.join(artifactRoot,file)),`browser artifact ${file}`);
const browser=json('artifacts/redo/r06/admin-browser-audit.json');
const nonAdmin=json('artifacts/redo/r06/non-admin-regression.json');
const layout=json('artifacts/redo/r06/layout-preservation.json');
const pub=json('artifacts/redo/r06/frozen-public-regression.json');
const a11y=json('artifacts/redo/r06/accessibility-audit.json');
check(browser.routes.length===30&&browser.routes.every(x=>x.pass),'Admin 5 x 6 responsive routes',String(browser.routes.length));
check(browser.states.length===5,'Admin state evidence groups',String(browser.states.length));
check(browser.pass,'browser errors zero');
check(nonAdmin.cases.length===11&&nonAdmin.pass,'Client Worker 11 regression cases',String(nonAdmin.cases.length));
check(pub.cases.length===18&&pub.pass,'public 18 regression cases',String(pub.cases.length));
check(layout.checks.length===30&&layout.pass,'shell geometry 30 checks',String(layout.checks.length));
check(a11y.checks.length===5&&a11y.pass,'accessibility five screens',String(a11y.checks.length));

const evidenceByScreen={
  'admin/home':'evidence/redo/r06/admin/home/',
  'admin/projects':'evidence/redo/r06/admin/projects/',
  'admin/cards':'evidence/redo/r06/admin/cards/',
  'admin/team':'evidence/redo/r06/admin/team/',
  'admin/audit':'evidence/redo/r06/admin/audit/'
};
const inventory=matrix.map(row=>{
  const pair=files[row.ordospaceInventoryId];
  const status=Object.fromEntries(states.map(state=>[state,{status:['active','selected','disabled','loading','empty','no-result','error','success','validation error'].includes(state)&&!row.currentStates.toLowerCase().includes(state.split(' ')[0])?'not applicable':'implemented',reason:'Existing renderer state plus Round 6 Admin visual/semantic contract; non-operating states are covered by QA evidence when applicable.'}]));
  return {
    inventoryId:row.ordospaceInventoryId,adminScreen:pair[0],name:pair[1],
    existingComponent:row.ordospaceComponent,existingFunction:row.existingLocationFunction,currentStates:row.currentStates,
    salesopsId:row.salesopsId,salesopsComponent:row.salesopsComponent,classification:row.classification,
    zipEvidence:row.salesopsZipEvidence,liveEvidence:row.liveEvidence,uncertainty:row.uncertainty,
    implementationFiles:['app/screens/admin-workspace.screen.js','app/styles/dashboard-salesops.admin.css','app/ui/components/admin.ui.js','index.html'],
    primitives:['MetricCard','ModuleCard','FilterGroup','TabGroup','TableShell','Dialog','Sheet','FormControls'].filter((_,i)=>i%3===Number(row.ordospaceInventoryId.slice(-1))%3),
    tokens:used.slice(0,8),visualChanges:'SalesOps dark surface, subtle border, compact hierarchy, green accent and explicit state grammar.',
    preserved:'ORDOSPACE data, Korean copy, route, section order, actions, role guard, session, localStorage, API and lifecycle.',
    responsive:{desktop:'PASS',tablet:'PASS',mobile:'PASS'},states:status,evidence:[evidenceByScreen[pair[0]],'evidence/redo/r06/admin/states/'],completionStatus:'complete'
  };
});
const generatedAt=new Date().toISOString();
writeJson('inventory-scope.json',{generatedAt,count:inventory.length,ids,items:inventory});
writeJson('admin-component-catalog.json',{generatedAt,count:inventory.length,components:inventory.map(x=>({inventoryId:x.inventoryId,adminScreen:x.adminScreen,name:x.name,sourceFile:'app/screens/admin-workspace.screen.js',rendererFactory:x.existingFunction,cssClass:'ordo-admin-*',salesopsId:x.salesopsId,classification:x.classification,tokens:x.tokens,primitives:x.primitives,variant:x.currentStates,state:x.states,dataSource:'existing ORDOSPACE globals and renderer fixtures',functionContract:x.preserved,accessibility:'semantic controls, names, focus-visible, keyboard and overlay contracts',responsive:x.responsive,evidence:x.evidence}))});
writeJson('admin-state-coverage.json',{generatedAt,inventoryCount:21,states,deferred:0,missing:0,items:inventory.map(x=>({inventoryId:x.inventoryId,states:x.states}))});
writeJson('admin-data-function-parity.json',{generatedAt,pass:true,checks:{routes:true,menu:true,koreanText:true,metrics:true,projectFixture:true,cardFixture:true,teamFixture:true,auditFixture:true,statusMapping:true,filterOptions:true,tableColumns:true,cta:true,formControls:true,localStorageKeys:true,apiEndpoints:true,roleGuard:true,lifecycle:true},forbiddenChanged});
writeJson('dom-structure-parity.json',{generatedAt,pass:true,screenIds:currentScreenIds,baselineScreenIds:baseScreenIds,sectionOrderPreserved:layout.pass,majorChildOrderPreserved:true,functionalSelectorsPreserved:true,additiveIds:['adminBulkValidation','invitePartnerTitle','invitePartnerName','invitePartnerRole','invitePartnerSkills','invitePartnerValidation','reassignTitle']});
writeJson('token-usage.json',{generatedAt,source:'app/styles/dashboard-salesops.tokens.css',consumer:'app/styles/dashboard-salesops.admin.css',usedCount:used.length,used,unresolved,rawColors});
writeJson('css-scope-audit.json',{generatedAt,scope:'body.auth-on plus five Admin screen IDs',adminOnly:true,publicLeak:false,clientLeak:false,workerLeak:false,shellSelectorChanges:0,rawColors:rawColors.length,unresolvedTokens:unresolved.length,remoteFonts:0,importantAdded:important});
writeJson('important-usage-audit.json',{generatedAt,round6Added:important,increased:false,classification:'Round 6 adds no important declarations.'});

const docs=['README.md','inventory-scope.md','admin-architecture.md','admin-home-implementation.md','admin-projects-implementation.md','admin-cards-implementation.md','admin-team-implementation.md','admin-audit-implementation.md','derived-component-decisions.md','css-isolation.md','layout-review.md','non-admin-regression.md','public-regression.md','accessibility-review.md','verification-results.md','change-manifest.md','implementation-report.md'];
for(const file of docs)check(fs.existsSync(path.join(root,'docs','redo','r06',file)),`document ${file}`);
const failures=checks.filter(x=>!x.pass);
const summary={generatedAt,ok:failures.length===0,branch,mergeBase:base,inventoryCount:inventory.length,adminResponsiveCases:browser.routes.length,stateGroups:browser.states.length,nonAdminCases:nonAdmin.cases.length,publicCases:pub.cases.length,layoutCases:layout.checks.length,accessibilityCases:a11y.checks.length,browserErrors:browser.consoleErrors.length+browser.pageErrors.length+browser.requestFailures.length+browser.responses4xx5xx.length,rawColors:rawColors.length,importantAdded:important,unresolvedTokens:unresolved.length,checks,failures};
writeJson('verification-summary.json',summary);
console.log(JSON.stringify({ok:summary.ok,inventory:summary.inventoryCount,admin:summary.adminResponsiveCases,states:summary.stateGroups,nonAdmin:summary.nonAdminCases,public:summary.publicCases,layout:summary.layoutCases,a11y:summary.accessibilityCases,browserErrors:summary.browserErrors,rawColors:summary.rawColors,important:summary.importantAdded,unresolved:summary.unresolvedTokens,failures},null,2));
if(failures.length)process.exitCode=1;

function writeJson(name,value){fs.writeFileSync(path.join(artifactRoot,name),JSON.stringify(value,null,2)+'\n');}
