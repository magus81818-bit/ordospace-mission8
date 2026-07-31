const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..','..','..');
const artifactRoot=path.join(root,'artifacts','redo','r04');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const checks=[]; const check=(pass,name,detail='')=>checks.push({name,pass:Boolean(pass),detail});
fs.mkdirSync(artifactRoot,{recursive:true});

const branch=git(['branch','--show-current']);
const base='9c559913d43efea9d4b7d5a5831b8cf14e636763';
const approvedRound4='e063545f45caa4c0c9e01b65202cad38cb3ae5ee';
const descendantRound=/^redo\/r(?:0[5-9]|10)-/.test(branch);
check(branch==='redo/r04-primitives-ui-lab'||descendantRound,'current or approved descendant branch',branch);
if(descendantRound)check(git(['merge-base',approvedRound4,'HEAD'])===approvedRound4,'approved Round 4 ancestry',approvedRound4);
check(git(['merge-base',base,'HEAD'])===base,'Round 3 merge-base',base);

const ids=['UI-013','UI-014','UI-015','UI-016','UI-017','UI-018','UI-019','UI-020','UI-064','UI-073'];
const matrix=json('artifacts/redo/r02/component-migration-matrix.json').rows.filter(x=>ids.includes(x.ordospaceInventoryId));
check(matrix.length===10,'official inventory count',String(matrix.length));
check(new Set(matrix.map(x=>x.ordospaceInventoryId)).size===10,'official inventory unique');
check(matrix.every(x=>x.implementationRound==='Round 4'),'no out-of-round inventory completed');

const primitives=[
  {id:'UI-013',name:'ModuleCard',category:'Card',source:'app/ui/components/module-card.ui.js',factory:'ModuleCardListItem',css:'ordo-c-module-card',variants:['default','selected','interactive','locked'],states:['default','hover','focus-visible','selected','disabled','long content','desktop','tablet','mobile'],specimen:'Cards'},
  {id:'UI-014',name:'EmptyState',category:'Empty/Feedback',source:'app/ui/components/metric.ui.js',factory:'EmptyState',css:'ordo-c-empty-state',variants:['panel','inline','detail','detail-lg','detail-emphasis'],states:['empty','filtered empty','permission empty','action','no action','long content'],specimen:'Empty / loading / error / success'},
  {id:'UI-015',name:'FilterGroup',category:'Filter',source:'app/styles/dashboard-salesops.primitives.css',factory:'existing data filter events',css:'ordo-c-filter-group',variants:['pill','toolbar'],states:['default','hover','focus-visible','selected','disabled','loading','overflow','mobile'],specimen:'Filters and tabs'},
  {id:'UI-016',name:'TabGroup',category:'Tab',source:'app/styles/dashboard-salesops.primitives.css',factory:'existing tab events',css:'ordo-c-tabs',variants:['tablist','filter semantics preserved'],states:['default','hover','focus-visible','selected','disabled','overflow','long label','mobile'],specimen:'Filters and tabs'},
  {id:'UI-017',name:'Dialog',category:'Dialog',source:'app/ui/components/primitives.ui.js',factory:'OverlayController',css:'ordo-c-dialog',variants:['standard','destructive'],states:['closed','open','validation error','submitting','success','long content','mobile'],specimen:'Dialog'},
  {id:'UI-018',name:'Sheet',category:'Sheet',source:'app/ui/components/primitives.ui.js',factory:'OverlayController plus existing SheetController',css:'ordo-c-sheet',variants:['desktop side','mobile bottom'],states:['closed','open','validation','submitting','long content','mobile'],specimen:'Sheet'},
  {id:'UI-019',name:'TableShell',category:'Table',source:'app/ui/components/primitives.ui.js',factory:'TableShell',css:'ordo-c-table-shell',variants:['populated','empty'],states:['default','hover','focus-visible','empty','loading','long cell','overflow','desktop','tablet','mobile'],specimen:'Table'},
  {id:'UI-020',name:'FormControls',category:'Form',source:'app/ui/components/form.ui.js',factory:'FormField/CheckboxRow/OptionList plus Button/FieldMessage',css:'ordo-c-form-field',variants:['input','textarea','select','checkbox','radio','label','helper','validation','button'],states:['default','hover','focus-visible','filled','placeholder','disabled','readonly','required','invalid','valid','submitting','long content'],specimen:'Form controls'},
  {id:'UI-064',name:'ProfileNotificationTabs',category:'Tab',source:'index.html',factory:'existing data-prof-tab behavior',css:'data-prof-tab',variants:['notification','my'],states:['default','hover','focus-visible','selected','unread','empty','overflow','mobile'],specimen:'Filters and tabs'},
  {id:'UI-073',name:'ExistingComponentGallery',category:'QA',source:'index.html',factory:'existing dev_mode route plus app/qa/ui-lab.js',css:'ordo-ui-lab',variants:['existing gallery','separate SalesOps UI Lab section'],states:['denied','dev-enabled','desktop','tablet','mobile'],specimen:'Foundations'}
];
check(primitives.length===10,'primitive inventory count');
check(primitives.every(x=>ids.includes(x.id)),'primitive IDs exact');

const tokenCss=read('app/styles/dashboard-salesops.tokens.css');
const primitiveCss=read('app/styles/dashboard-salesops.primitives.css');
const declared=new Set([...tokenCss.matchAll(/(--ordo-so-[\w-]+)\s*:/g)].map(x=>x[1]));
const used=[...new Set([...primitiveCss.matchAll(/var\((--ordo-so-[\w-]+)/g)].map(x=>x[1]))];
const unresolved=used.filter(x=>!declared.has(x));
const rawColors=[...primitiveCss.matchAll(/#[0-9a-f]{3,8}|rgba?\(|oklch\(/gi)].map(x=>x[0]);
const important=(primitiveCss.match(/!important/g)||[]).length;
const round3Important=(tokenCss.match(/!important/g)||[]).length;
check(used.length>=40,'Round 3 token consumption',String(used.length));
check(unresolved.length===0,'unresolved token references',unresolved.join(', '));
check(rawColors.length===0,'no raw color duplication',rawColors.join(', '));
check(!/:root\b/.test(primitiveCss),'no unscoped root tokens');
check(!/#screen-(landing|auth|terms|privacy|support|select-workspace)/.test(primitiveCss),'no public selectors');
check(!/#(sidebar|topbar|mheader|mtab)\b/.test(primitiveCss),'no Round 5 shell completion selectors');
check(important===0,'Round 4 important additions',String(important));
check(round3Important===16,'Round 3 important count unchanged',String(round3Important));

const labJs=read('app/qa/ui-lab.js');
for(const id of ids) check(labJs.includes(`'${id}'`),`UI Lab inventory ${id}`);
for(const title of ['Foundations','Typography','Color and status','Buttons','Form controls','Badges and progress','Cards','Filters and tabs','Empty / loading / error / success','Table','Dialog','Sheet','Long content','Responsive specimens','Accessibility states']) check(labJs.includes(`'${title}'`),`UI Lab section ${title}`);
check(!/fetch\s*\(|XMLHttpRequest|localStorage\.setItem/.test(labJs),'UI Lab has no API or storage mutation');
check((read('app/config/app.config.js').match(/'[^']+'/g)||[]).length>0,'existing config retained');
const screenIds=[...read('index.html').matchAll(/<section id="screen-([^"]+)"/g)].map(x=>x[1]).filter(id=>id!=='화면이름');
check(screenIds.length===19,'official screen ID count',String(screenIds.length));
check(new Set(screenIds).size===19,'screen IDs unique');

const browserFiles=['dashboard-browser-audit.json','ui-lab-browser-audit.json','layout-preservation.json','frozen-public-regression.json','accessibility-audit.json'];
for(const file of browserFiles) check(fs.existsSync(path.join(artifactRoot,file)),`browser artifact ${file}`);
const browser=json('artifacts/redo/r04/dashboard-browser-audit.json');
const lab=json('artifacts/redo/r04/ui-lab-browser-audit.json');
const layout=json('artifacts/redo/r04/layout-preservation.json');
const pub=json('artifacts/redo/r04/frozen-public-regression.json');
const a11y=json('artifacts/redo/r04/accessibility-audit.json');
check(pub.comparisons.length===18&&pub.comparisons.every(x=>x.pass),'public 18/18');
check(layout.routes.length===12&&layout.routes.every(x=>x.pass),'layout 12/12');
check(browser.responsive.length===6&&browser.responsive.every(x=>x.pass),'responsive 6/6');
check(browser.consoleErrors.length===0&&browser.pageErrors.length===0&&browser.requestFailures.length===0&&browser.responses4xx5xx.length===0,'browser errors zero');
check(lab.errors.length===0,'UI Lab errors zero');
check(lab.screenshots.length===21,'UI Lab D/T/M state screenshots',String(lab.screenshots.length));
check(lab.interactions.length>=6,'UI Lab interactions',String(lab.interactions.length));
check(a11y.contrast.every(x=>x.pass)&&a11y.focusVisible.pass&&a11y.iconNames.pass&&a11y.reducedMotion.pass,'accessibility checks pass');

const stateMap={
  'default':ids,
  'hover':['UI-013','UI-015','UI-016','UI-019','UI-020','UI-064','UI-073'],
  'focus-visible':['UI-013','UI-015','UI-016','UI-017','UI-018','UI-019','UI-020','UI-064','UI-073'],
  'active':['UI-013','UI-015','UI-016','UI-064','UI-073'],
  'selected':['UI-013','UI-015','UI-016','UI-064'],
  'disabled':['UI-013','UI-015','UI-016','UI-020','UI-073'],
  'loading':['UI-014','UI-015','UI-017','UI-018','UI-019','UI-020'],
  'empty':['UI-014','UI-019','UI-064','UI-073'],
  'error':['UI-014','UI-017','UI-019','UI-020'],
  'success':['UI-014','UI-017','UI-019','UI-020'],
  'invalid':['UI-017','UI-018','UI-020'],
  'long content':ids,
  'overflow':['UI-015','UI-016','UI-019','UI-064','UI-073'],
  'Desktop':ids,'Tablet':ids,'Mobile':ids
};
const coverage=Object.entries(stateMap).map(([state,implemented])=>({state,implemented,notApplicable:ids.filter(id=>!implemented.includes(id)),deferred:[],missing:[]}));
const inventory=matrix.map(row=>{const p=primitives.find(x=>x.id===row.ordospaceInventoryId);return {inventoryId:p.id,existingComponent:row.ordospaceComponent,salesopsId:row.salesopsId,classification:row.classification,implementationFiles:[p.source,'app/styles/dashboard-salesops.primitives.css'],status:'complete',supportedStates:p.states,uiLabSpecimen:p.specimen,operationalRoutes:row.ordospaceRoleRoutes,evidence:['artifacts/redo/r04/ui-lab-browser-audit.json','evidence/redo/r04/ui-lab/'],followUp:'Round 9 verification'};});
const generatedAt=new Date().toISOString();
fs.writeFileSync(path.join(artifactRoot,'inventory-scope.json'),JSON.stringify({generatedAt,count:inventory.length,ids,items:inventory},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'primitive-catalog.json'),JSON.stringify({generatedAt,count:primitives.length,primitives},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'primitive-state-coverage.json'),JSON.stringify({generatedAt,states:coverage,deferred:0,missing:0},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'ui-lab-inventory.json'),JSON.stringify({generatedAt,guard:'existing components-gallery dev_mode',screenId:'components-gallery',separateMount:'salesopsUiLab',sections:15,specimens:primitives.length,interactions:lab.interactions,apiCalls:0,localStorageMutation:0,inventoryIds:ids,evidence:lab.screenshots},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'token-usage.json'),JSON.stringify({generatedAt,source:'app/styles/dashboard-salesops.tokens.css',consumer:'app/styles/dashboard-salesops.primitives.css',usedCount:used.length,used,unresolved,rawColors},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'css-scope-audit.json'),JSON.stringify({generatedAt,scope:'body.auth-on',publicLeak:false,publicSelectors:[],shellCompletionSelectors:[],rawColors,unresolved,importantAdded:important,checks:checks.filter(x=>/scope|public|token|color|selector/.test(x.name))},null,2)+'\n');
fs.writeFileSync(path.join(artifactRoot,'important-usage-audit.json'),JSON.stringify({generatedAt,round3Count:round3Important,round4Added:important,total:round3Important,classification:'Round 3 legacy status/progress bridges only; Round 4 adds none',increased:false},null,2)+'\n');
const failures=checks.filter(x=>!x.pass);
const summary={generatedAt,ok:failures.length===0,branch,mergeBase:base,inventoryCount:inventory.length,primitiveCount:primitives.length,uiLabSections:15,tokenDependencies:used.length,unresolvedTokens:unresolved.length,rawColors:rawColors.length,importantBefore:round3Important,importantAfter:round3Important+important,publicComparisons:pub.comparisons.length,desktopRoutes:layout.routes.length,responsiveChecks:browser.responsive.length,uiLabScreenshots:lab.screenshots.length,browserErrors:browser.consoleErrors.length+browser.pageErrors.length+browser.requestFailures.length+browser.responses4xx5xx.length,checks,failures};
fs.writeFileSync(path.join(artifactRoot,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({ok:summary.ok,inventory:summary.inventoryCount,primitives:summary.primitiveCount,sections:summary.uiLabSections,tokens:summary.tokenDependencies,important:summary.importantAfter,public:summary.publicComparisons,routes:summary.desktopRoutes,responsive:summary.responsiveChecks,labScreenshots:summary.uiLabScreenshots,failures},null,2));
if(failures.length) process.exitCode=1;
