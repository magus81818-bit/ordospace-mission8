const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..','..','..');
const art=path.join(root,'artifacts','redo','r07');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(path.join(root,p));
const git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
const base='6c4413e68c5239672bc01a1fe18dd926f663506b';
const branch=git(['branch','--show-current']);
check('branch',branch==='redo/r07-client-dashboard'||/^redo\/r0[89]-/.test(branch),branch);
check('Round 6 merge base',git(['merge-base','redo/r06-admin-dashboard','HEAD'])===base);

const matrix=json('artifacts/redo/r02/component-migration-matrix.json').rows.filter(row=>row.implementationRound==='Round 7');
const inventory=json('artifacts/redo/r07/inventory-scope.json');
const catalog=json('artifacts/redo/r07/client-component-catalog.json');
check('Round 2 matrix count',matrix.length===12,String(matrix.length));
check('inventory count',inventory.items.length===12,String(inventory.items.length));
check('catalog count',catalog.items.length===12,String(catalog.items.length));
const mappingFields=['ordospaceComponent','salesopsId','salesopsComponent','classification','uncertainty','salesopsZipEvidence','preserveFunction','accessibilityRequirements'];
for(const row of matrix){
  const item=inventory.items.find(x=>x.inventoryId===row.ordospaceInventoryId);
  check(`${row.ordospaceInventoryId} exists`,!!item);
  if(!item)continue;
  const aliases={ordospaceComponent:'name'};
  for(const field of mappingFields)check(`${row.ordospaceInventoryId} ${field}`,item[aliases[field]||field]===row[field],`${item[aliases[field]||field]} == ${row[field]}`);
}
const matrixMappingPass=checks.filter(x=>/UI-0(?:2[1-9]|3[0-2])/.test(x.name)).every(x=>x.pass);

const coverage=json('artifacts/redo/r07/client-state-coverage.json');
const allowed=new Set(['implemented','not_applicable']);
let invalidStatusCount=0,missingEvidenceCount=0,directoryEvidenceCount=0,missingReasonCount=0,missingBrowserAssertionCount=0;
for(const item of coverage.items){
  for(const [state,value] of Object.entries(item.states)){
    if(!allowed.has(value.status))invalidStatusCount++;
    if(value.status==='not_applicable'&&!value.reason?.trim())missingReasonCount++;
    if(value.status==='implemented'){
      if(!value.browserAssertion?.trim())missingBrowserAssertionCount++;
      for(const evidencePath of value.evidence||[]){const absolute=path.join(root,evidencePath);if(evidencePath.endsWith('/')||evidencePath.endsWith('\\'))directoryEvidenceCount++;if(!fs.existsSync(absolute)||fs.statSync(absolute).isDirectory())missingEvidenceCount++;}
    }
  }
  for(const state of ['Desktop','Tablet','Mobile'])check(`${item.inventoryId} ${state}`,item.states[state]?.status==='implemented');
}
check('state summary implemented count',coverage.implementedCount>0,String(coverage.implementedCount));
check('state summary N/A count',coverage.notApplicableCount>0,String(coverage.notApplicableCount));
check('invalid status zero',invalidStatusCount===0,String(invalidStatusCount));
check('missing evidence zero',missingEvidenceCount===0,String(missingEvidenceCount));
check('directory evidence zero',directoryEvidenceCount===0,String(directoryEvidenceCount));
check('missing N/A reason zero',missingReasonCount===0,String(missingReasonCount));
check('missing browser assertion zero',missingBrowserAssertionCount===0,String(missingBrowserAssertionCount));
check('deferred zero',coverage.deferred===0,String(coverage.deferred));
check('missing zero',coverage.missing===0,String(coverage.missing));
const stateStatusesValid=invalidStatusCount===0&&missingReasonCount===0;
const stateEvidenceComplete=missingEvidenceCount===0&&directoryEvidenceCount===0&&missingBrowserAssertionCount===0;

const requiredShots=['client-dashboard-kpi-zero-warning-desktop-1440x1000.png','client-dashboard-approval-empty-desktop-1440x1000.png','client-dashboard-long-mobile-390x844.png','client-project-assets-empty-desktop-1440x1000.png','client-project-assets-long-filename-mobile-390x844.png','client-project-gate-pass-fail-desktop-1440x1000.png','client-project-timeline-long-mobile-390x844.png','client-project-modal-open-mobile-390x844.png','client-project-modal-error-desktop-1440x1000.png','client-project-modal-focus-return-desktop-1440x1000.png','client-approvals-queue-empty-desktop-1440x1000.png','client-approvals-no-selection-desktop-1440x1000.png','client-approvals-long-detail-mobile-390x844.png','client-approvals-decision-disabled-desktop-1440x1000.png','client-approvals-validation-error-desktop-1440x1000.png'];
for(const file of requiredShots)check(`state screenshot ${file}`,exists(`evidence/redo/r07/client/states/${file}`));

const interactions=json('artifacts/redo/r07/client-interaction-audit.json');
const modalCheck=interactions.checks.find(x=>x.inventoryId==='UI-029');
const decisionCheck=interactions.checks.find(x=>x.inventoryId==='UI-032');
const allTrue=obj=>Object.values(obj||{}).filter(v=>typeof v==='boolean').every(Boolean);
const modalContractPass=!!modalCheck?.pass&&allTrue(modalCheck.assertions)&&['opened','ariaHiddenFalse','focusEntered','focusContained','escapeClosed','ariaHiddenTrue','focusReturned','scrollRestored','backdropClosed','mobileContained'].every(k=>modalCheck.assertions[k]===true);
const decisionControlsPass=!!decisionCheck?.pass&&allTrue(decisionCheck.assertions)&&decisionCheck.assertions.lifecycleCallsWhileInvalid===0&&decisionCheck.assertions.revisionServiceOnce&&decisionCheck.assertions.approveServiceOnce;
check('UI-029 modal contract',modalContractPass);
check('UI-032 decision controls',decisionControlsPass);
const a11y=json('artifacts/redo/r07/accessibility-audit.json');
check('measured accessibility checks',a11y.checks.length>=12&&a11y.checks.every(x=>x.measured===true&&x.pass===true),String(a11y.checks.length));
const qa=json('artifacts/redo/r07/qa-fixture-isolation.json');
const qaFixtureIsolationPass=qa.pass&&qa.operatingFixtureMutation===false&&qa.localStorageMutation===false&&qa.apiCalls===0&&qa.restored===true&&qa.fixtures.every(x=>x.pass&&x.operatingFixtureMutation===false&&x.localStorageMutation===false&&x.apiCalls===0);
check('QA fixture isolation',qaFixtureIsolationPass);

const spec=read('tests/redo/r07/client-audit.spec.cjs');
const invalidAssertionsFound=(spec.match(/count\(\)\s*>?=\s*0/g)||[]).length;
const hardcodedAccessibilityPassCount=(spec.match(/(?:tabs|filters|dialogFocus|escape|returnFocus|queueKeyboard|selectionState|detailLive)\s*:\s*true/g)||[]).length;
check('invalid assertions zero',invalidAssertionsFound===0,String(invalidAssertionsFound));
check('old hardcoded accessibility summaries zero',hardcodedAccessibilityPassCount===0,String(hardcodedAccessibilityPassCount));

const css=read('app/styles/dashboard-salesops.client.css');
check('Client CSS scope',['#screen-dashboard','#screen-project','#screen-approvals'].every(x=>css.includes(x))&&!/#screen-admin|#screen-worker|#screen-(landing|auth|terms|privacy|support|select-workspace)|#sidebar|#topbar/.test(css));
check('new important zero',(css.match(/!important/g)||[]).length===0);
const parity=json('artifacts/redo/r07/client-data-function-parity.json');check('data/function parity',parity.pass===true);
for(const name of ['client-browser-audit.json','non-client-regression.json','frozen-public-regression.json','layout-preservation.json'])check(name,json(`artifacts/redo/r07/${name}`).pass===true);
for(const doc of ['inventory-scope.md','client-architecture.md','client-dashboard-implementation.md','client-project-implementation.md','client-approvals-implementation.md','derived-component-decisions.md','accessibility-review.md','verification-results.md','change-manifest.md','implementation-report.md','correction-report.md'])check(`document ${doc}`,exists(`docs/redo/r07/${doc}`));
check('test results exists',exists('artifacts/redo/r07/test-results.json'));

const failures=checks.filter(x=>!x.pass);
const summary={generatedAt:new Date().toISOString(),branch,mergeBase:base,matrixMappingPass,stateStatusesValid,stateEvidenceComplete,modalContractPass,decisionControlsPass,qaFixtureIsolationPass,invalidAssertionsFound,hardcodedAccessibilityPassCount,invalidStatusCount,missingEvidenceCount,directoryEvidenceCount,deferred:coverage.deferred,missing:coverage.missing,checks,failures,pass:failures.length===0};
fs.writeFileSync(path.join(art,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({pass:summary.pass,matrixMappingPass,stateStatusesValid,stateEvidenceComplete,modalContractPass,decisionControlsPass,qaFixtureIsolationPass,invalidAssertionsFound,hardcodedAccessibilityPassCount,failures},null,2));
if(failures.length)process.exit(1);
