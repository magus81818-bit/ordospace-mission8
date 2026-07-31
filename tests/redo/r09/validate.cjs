const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..','..','..'),artifactRoot=path.join(root,'artifacts','redo','r09');
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),parse=file=>JSON.parse(read(file)),exists=file=>fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).isFile(),git=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const {STATE_ASSERTION_REGISTRY,buildSourceStateRegistry}=require('./state-assertion-registry.cjs');
const checks=[],check=(name,value,detail='')=>checks.push({name,pass:Boolean(value),detail:String(detail||'')});
const expectedRound8='2911cc85922bf32f31d051216aca9f29ed906564',expectedRound1='f10779ef7dcb0e419c85497eebf45888303b557a',expectedCounts={'Round 3':3,'Round 4':10,'Round 5':9,'Round 6':21,'Round 7':12,'Round 8':10,'Round 9':8};
const names=['git-prestate','inventory-scope','full-inventory-audit','full-state-coverage','frozen-public-regression','public-state-audit','public-interaction-audit','public-health','ui-072-implementation-audit','ui-072-source-audit','role-isolation-audit','data-function-parity','accessibility-audit','responsive-layout-audit','css-token-audit','product-diff-audit','validator-integrity-audit','browser-health-audit','ui-lab-audit','authenticated-health','shared-health'];
const artifacts={};

check('branch is Round 9 correction branch',git(['branch','--show-current'])==='redo/r09-integration-verification',git(['branch','--show-current']));
check('Round 8 is exact merge base',git(['merge-base',expectedRound8,'HEAD'])===expectedRound8,git(['merge-base',expectedRound8,'HEAD']));
for(const name of names){
 const file=`artifacts/redo/r09/${name}.json`;
 check(`${name} exists`,exists(file),file);
 if(exists(file)){try{artifacts[name]=parse(file);check(`${name} parses`,true);}catch(error){check(`${name} parses`,false,error.message);}}
}
if(names.some(name=>!artifacts[name])){
 const summary={generatedAt:new Date().toISOString(),checks,failures:checks.filter(item=>!item.pass),pass:false};
 fs.writeFileSync(path.join(artifactRoot,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({pass:summary.pass,failures:summary.failures},null,2));
 process.exit(1);
}

const inventory=artifacts['full-inventory-audit'],inventoryIds=inventory.items.map(item=>item.inventoryId),inventoryItemsAllPass=inventory.items.every(item=>item.pass&&item.completionArtifactExists&&item.completionArtifactPass&&item.stateCoverageItemFound&&item.browserEvidenceExists&&item.browserEvidenceRelevant&&item.browserEvidence.every(exists)&&exists(item.completionArtifact)&&exists(item.stateCoverageArtifact));
check('inventory has exactly 73 unique items',inventory.total===73&&inventory.unique===73&&inventory.items.length===73&&new Set(inventoryIds).size===73,inventory.items.length);
check('inventory IDs cover UI-001 through UI-073',Array.from({length:73},(_,index)=>`UI-${String(index+1).padStart(3,'0')}`).every(id=>inventoryIds.includes(id)));
check('inventory round counts are exact',JSON.stringify(inventory.roundCounts)===JSON.stringify(expectedCounts),JSON.stringify(inventory.roundCounts));
check('every inventory item passes internal evidence checks',inventoryItemsAllPass);
check('inventory has no unresolved assignments',inventory.missing.length===0&&inventory.duplicates.length===0&&inventory.roundAssignmentErrors.length===0&&inventory.evidenceMissing.length===0&&inventory.unresolved.length===0);
check('inventory has no invalid round artifact paths',inventory.invalidRoundArtifactPaths.length===0,JSON.stringify(inventory.invalidRoundArtifactPaths));

const state=artifacts['full-state-coverage'],allowedStatuses=new Set(['implemented','not_applicable']),sourceStateRegistry=buildSourceStateRegistry({r4Coverage:parse('artifacts/redo/r04/primitive-state-coverage.json'),r6Coverage:parse('artifacts/redo/r06/admin-state-coverage.json'),r7Coverage:parse('artifacts/redo/r07/client-state-coverage.json'),r8Coverage:parse('artifacts/redo/r08/worker-state-coverage.json'),publicStates:artifacts['public-state-audit'],ui072:artifacts['ui-072-implementation-audit']});
let implementedRows=0,stateArtifactsActuallyMerged=true,stateEvidencePass=true,stateAssertionPass=true,stateRowsWithSourceState=0,stateRowsWithRound9Assertions=0,stateRowsWithoutRealAssertion=0,generatedMarkerOnlyRows=0,broadTestTitleReuseViolations=0;
for(const item of state.items){
 if(!item.sourceItemFound||!Array.isArray(item.sourceArtifacts)||item.sourceArtifacts.length===0||item.sourceArtifacts.some(file=>!exists(file)))stateArtifactsActuallyMerged=false;
 for(const [stateName,row] of Object.entries(item.states||{})){
  if(!allowedStatuses.has(row.status)||!exists(row.sourceArtifact))stateArtifactsActuallyMerged=false;
  if(row.status==='implemented'){
   implementedRows+=1;
   if(!Array.isArray(row.evidence)||row.evidence.length===0||row.evidence.some(file=>!exists(file)))stateEvidencePass=false;
   const key=`${item.inventoryId}/${stateName}`,registryResolved=Boolean(STATE_ASSERTION_REGISTRY[key]||sourceStateRegistry[key]),schemaPass=row.sourceInventoryItemFound===true&&typeof row.sourceStateFound==='boolean'&&row.assertionExecuted===true&&row.assertionRegistryFile==='tests/redo/r09/state-assertion-registry.cjs'&&row.assertionRegistryKey===key&&row.evidenceGeneratedByAssertion===true&&row.pass===true;
   if(row.sourceStateFound)stateRowsWithSourceState+=1;
   if(!row.sourceStateFound&&row.assertionExecuted)stateRowsWithRound9Assertions+=1;
   if(!registryResolved||!schemaPass){stateAssertionPass=false;stateRowsWithoutRealAssertion+=1;}
   if(Object.prototype.hasOwnProperty.call(row,'browserAssertion'))generatedMarkerOnlyRows+=1;
   }
  }
 }
check('all 73 state items are merged from real source artifacts',state.mergedItemCount===73&&state.items.length===73&&stateArtifactsActuallyMerged);
check('implemented states have existing item-specific evidence',implementedRows>0&&stateEvidencePass,implementedRows);
check('implemented states resolve an exact source-state or Round 9 assertion registry key',stateAssertionPass);
check('state assertion schema and rollup counts are independently exact',state.stateRowsWithSourceState===stateRowsWithSourceState&&state.stateRowsWithRound9Assertions===stateRowsWithRound9Assertions&&state.stateRowsWithoutRealAssertion===stateRowsWithoutRealAssertion&&state.generatedMarkerOnlyRows===generatedMarkerOnlyRows&&state.broadTestTitleReuseViolations===broadTestTitleReuseViolations&&stateRowsWithoutRealAssertion===0&&generatedMarkerOnlyRows===0&&broadTestTitleReuseViolations===0&&state.stateAssertionRegistryPass===true);
check('state rollup reports no gaps',state.invalid===0&&state.deferred===0&&state.missing===0&&state.missingEvidence===0&&state.directoryEvidence===0&&state.missingAssertion===0&&state.genericAssertion===0);
check('fabricated uniform state rows are absent',state.fabricatedUniformStateRows===0,state.fabricatedUniformStateRows);
check('unrelated duplicate evidence is absent',state.unrelatedDuplicateEvidence.length===0,JSON.stringify(state.unrelatedDuplicateEvidence));

const scope=artifacts['inventory-scope'],scopeById=Object.fromEntries(scope.items.map(item=>[item.inventoryId,item]));
check('Round 9 Matrix scope has eight exact items',scope.items.length===8&&Array.from({length:8},(_,index)=>`UI-${String(index+65).padStart(3,'0')}`).every(id=>scopeById[id]));
check('UI-065 through UI-071 remain frozen',Array.from({length:7},(_,index)=>scopeById[`UI-${String(index+65).padStart(3,'0')}`]).every(item=>item.implementationTarget===false&&item.completionStatus==='Frozen regression only'&&item.pass));
check('UI-072 is the single mapped implementation target',scope.frozenCount===7&&scope.implementationTargetCount===1&&scopeById['UI-072'].implementationTarget===true&&scopeById['UI-072'].completionStatus==='Mapped for implementation');
check('Round 2 Matrix is unchanged',scope.matrixChanged===false);

const publicBaseline=artifacts['frozen-public-regression'],expectedPublicCases=new Set(['1440x1000','1024x1366','390x844'].flatMap(viewport=>['landing','auth','terms','privacy','support','select-workspace'].map(route=>`${route}|${viewport}`))),actualPublicCases=new Set(publicBaseline.cases.map(item=>`${item.route}|${item.viewport}`));
const round1BaselineComparisonPass=publicBaseline.baselineRef===expectedRound1&&publicBaseline.baselineSource===`git:${expectedRound1}`&&publicBaseline.cases.length===18&&expectedPublicCases.size===actualPublicCases.size&&[...expectedPublicCases].every(key=>actualPublicCases.has(key))&&publicBaseline.cases.every(item=>item.baselineSource===`git:${expectedRound1}`&&item.domSame&&item.textSame&&item.styleSame&&item.boxSame&&item.formContractSame&&item.dashboardStyleNonIntrusion&&item.differences.length===0&&item.overflow<=1&&exists(item.evidence)&&item.pass);
check('public screens match the approved Round 1 baseline in 18 measured cases',round1BaselineComparisonPass);
const publicStates=artifacts['public-state-audit'],publicStateIds=new Set(publicStates.states.map(item=>item.inventoryId));
check('UI-065 through UI-071 have measured interaction state rows',publicStates.states.length===7&&Array.from({length:7},(_,index)=>`UI-${String(index+65).padStart(3,'0')}`).every(id=>publicStateIds.has(id))&&publicStates.states.every(item=>item.pass&&exists(item.evidence)&&Object.keys(item.actual||{}).length>0&&Object.keys(item.expected||{}).length>0));

const ui072=artifacts['ui-072-implementation-audit'],ui072Source=artifacts['ui-072-source-audit'],ui072ByState=Object.fromEntries(ui072.cases.map(item=>[item.state,item]));
const desktopFocus=ui072ByState['default-single-role-keyboard']?.focusMeasurement||{},desktopFocusVisible=desktopFocus.visible===true||(['solid','dashed','dotted','double'].includes(desktopFocus.outline)&&desktopFocus.width!=='0px')||Boolean(desktopFocus.shadow&&desktopFocus.shadow!=='none'),ui072MeasuredKeyboardFocusPass=ui072.cases.length===4&&['default-single-role-keyboard','multi-role','isolated-long-attempted-route','focus-visible-mobile'].every(name=>ui072ByState[name]?.pass)&&ui072ByState['default-single-role-keyboard'].workspaceSelectorActionCount===1&&ui072ByState['default-single-role-keyboard'].exactWorkspaceSelectorCount===1&&desktopFocus.focused&&desktopFocusVisible&&ui072ByState['focus-visible-mobile'].focusMeasurement.focused&&ui072ByState['focus-visible-mobile'].focusMeasurement.visible&&ui072.cases.every(item=>exists(item.evidence))&&ui072.productCorrection===false;
check('UI-072 renderer route keyboard focus and responsive cases are measured',ui072MeasuredKeyboardFocusPass);
check('UI-072 source markers and exact CTA are independently located',ui072Source.exactCtaCount===1&&Object.values(ui072Source.sources).every(item=>item.measured&&item.line>0&&exists(item.file)));

const browser=artifacts['browser-health-audit'],browserHealthActuallyMeasured=Boolean(browser.listenerEvidence?.unhandled&&browser.listenerEvidence?.observer&&browser.listenerEvidence?.duplicate)&&browser.mutationSamples.length>0&&browser.duplicateActionChecks.length>=7;
check('browser health listeners and action spies are measured',browserHealthActuallyMeasured);
check('browser health has no new runtime failures',browser.consoleErrors.length===0&&browser.pageErrors.length===0&&browser.newRequestFailures.length===0&&browser.newHttpFailures.length===0&&browser.unhandledRejections.length===0&&browser.observerLoopFailures.length===0&&browser.duplicateActionFailures.length===0&&browser.overflowCases===0&&browser.mutationSamples.every(item=>item.pass));
check('known baseline request failures are separated from new failures',browser.knownBaselineRequestFailures.every(item=>item.actualMeasured&&item.currentCount>0&&(item.baselineCount>0||item.sourceEquivalent===true))&&browser.baselineExternalFontContract.sourceEquivalent&&browser.baselineExternalFontContract.declaredFamily&&browser.newRequestFailures.length===0);

const uiLab=artifacts['ui-lab-audit'],uiLabActuallyMeasured=uiLab.cases.length===3&&new Set(uiLab.cases.map(item=>item.viewport)).size===3&&uiLab.cases.every(item=>item.active&&item.contained&&item.overflow<=1&&item.devOnly&&item.officialMenuExposed===0&&item.apiCalls===0&&item.storageUnchanged&&item.storageBefore===item.storageAfter&&item.specimenCounts.token>=1&&item.specimenCounts.primitive>=15&&item.specimenCounts.shell===4&&item.specimenCounts.admin===5&&item.specimenCounts.client===3&&item.specimenCounts.worker===2&&item.specimenCounts.derived>=1&&item.keyboard.tabSelected==='true'&&item.keyboard.invalidFocused==='uiLabName'&&item.focusMeasurement.focused&&item.focusMeasurement.visible&&item.reducedMotion&&exists(item.evidence)&&item.pass);
check('UI Lab guard API storage specimens keyboard focus and D/T/M are measured',uiLabActuallyMeasured);

const parity=artifacts['data-function-parity'];
check('data and function parity has independent baseline/current values',parity.baselineRef===expectedRound8&&parity.checks.length>=20&&parity.checks.every(item=>item.measured&&item.pass&&Object.prototype.hasOwnProperty.call(item,'baseline')&&Object.prototype.hasOwnProperty.call(item,'current')));
const css=artifacts['css-token-audit'];
check('CSS token definitions references leakage and order are clean',css.definitionCount>0&&css.referenceCount>0&&css.unresolvedTokens.length===0&&css.newRawColors.length===0&&css.newImportant.length===0&&css.roleLeakage.length===0&&css.publicComputedInfluence===0&&css.remoteFonts.length===0&&JSON.stringify(css.stylesheetOrder)===JSON.stringify(css.expectedStylesheetOrder));
const product=artifacts['product-diff-audit'];
check('Round 9 has no product dependency public data or backend changes',product.approvedRound8Head===expectedRound8&&product.unexpectedProductFiles.length===0&&product.ui072CorrectionFiles.length===0&&product.publicProductChanges.length===0&&product.dataApiBackendChanges.length===0&&product.directStatusAssignments.length===0&&product.dependencyChanges.length===0&&!product.publicStylesheetAdded&&!product.duplicatedRenderer);
const integrity=artifacts['validator-integrity-audit'],hardcodedAuditResults=integrity.hardcodedResults;
check('prior validators are unchanged and no audit result is hardcoded',integrity.priorValidators.length>=9&&integrity.priorValidators.every(item=>item.pass&&!item.assertionDeleted&&!item.expectedValueChanged)&&hardcodedAuditResults.length===0&&integrity.invalidCountAssertions===0&&integrity.evidenceDirectories===0&&integrity.genericAssertions===0);
check('integrity audit requires internal item evidence and independent validation',integrity.itemInternalPassRequired&&integrity.evidenceRelevanceRequired&&integrity.fabricatedStateDetection&&integrity.invalidRoundPathDetection&&integrity.independentValidation);
check('responsive, role isolation, accessibility and public health internals pass',artifacts['responsive-layout-audit'].cases.length===60&&artifacts['responsive-layout-audit'].cases.every(item=>item.pass&&exists(item.evidence))&&artifacts['role-isolation-audit'].cases.length===60&&artifacts['role-isolation-audit'].cases.every(item=>item.pass)&&artifacts['accessibility-audit'].checks.every(item=>item.measured&&item.pass)&&artifacts['public-health'].consoleErrors.length===0&&artifacts['public-health'].pageErrors.length===0);

const requiredReviewDocs=['full-inventory-review.md','public-freeze-review.md','ui-072-implementation-review.md','role-isolation-review.md','data-function-parity.md','state-coverage-review.md','accessibility-review.md','responsive-review.md','css-token-review.md','product-diff-review.md','validator-integrity-review.md','browser-health-review.md','ui-lab-review.md','verification-results.md','implementation-report.md','correction-report.md'],majorReviewDocs=new Set(['full-inventory-review.md','public-freeze-review.md','ui-072-implementation-review.md','state-coverage-review.md','validator-integrity-review.md','correction-report.md']);
const docResults=requiredReviewDocs.map(name=>{
 const file=`docs/redo/r09/${name}`,present=exists(file),content=present?read(file):'',lines=content.split(/\r?\n/).map(line=>line.trim()).filter(Boolean),headings=lines.filter(line=>/^#{1,6}\s/.test(line)).length,paragraphs=content.split(/\r?\n\s*\r?\n/).filter(block=>block.trim()&&!/^#{1,6}\s/.test(block.trim())).length,minimum=majorReviewDocs.has(name)?30:20,meaningfulLines=lines.filter(line=>line.length>=24&&!/^#{1,6}\s/.test(line)),frequencies=new Map();
 for(const line of meaningfulLines){const normalized=line.toLowerCase().replace(/`[^`]+`/g,'<path>').replace(/\d+/g,'#');frequencies.set(normalized,(frequencies.get(normalized)||0)+1);}
 const repeatedPlaceholderLines=[...frequencies].filter(([,count])=>count>=3).map(([line,count])=>({line,count})),hasSource=/(source|artifact|evidence|baseline|소스|근거)/i.test(content)&&/(artifacts\/|tests\/|evidence\/|commit|git)/i.test(content),hasMethod=/(methodology|method|방법론|검증 방법|방법)/i.test(content),hasCriteria=/(pass criteria|통과 기준|판정 기준|criteria)/i.test(content),hasResult=/(measured result|result|측정 결과|결과)/i.test(content),hasRisk=/(risks?|limitations?|위험|한계)/i.test(content),pass=present&&lines.length>=minimum&&(headings>=5||paragraphs>=5)&&hasSource&&hasMethod&&hasCriteria&&hasResult&&hasRisk&&repeatedPlaceholderLines.length===0;
 return{name,file,present,nonEmptyLines:lines.length,minimum,headings,paragraphs,hasSource,hasMethod,hasCriteria,hasResult,hasRisk,repeatedPlaceholderLines,pass};
});
check('required review documents have substantive audit content',docResults.every(item=>item.pass),JSON.stringify(docResults.filter(item=>!item.pass)));

const failures=checks.filter(item=>!item.pass),summary={
 generatedAt:new Date().toISOString(),
 inventoryItemsAllPass,
 invalidRoundArtifactPaths:inventory.invalidRoundArtifactPaths,
 inventorySpecificEvidencePass:inventoryItemsAllPass&&stateEvidencePass,
 stateArtifactsActuallyMerged,
 fabricatedUniformStateRows:state.fabricatedUniformStateRows,
 round1BaselineComparisonPass,
 ui072MeasuredKeyboardFocusPass,
 browserHealthActuallyMeasured,
 uiLabActuallyMeasured,
 documentContentValidation:docResults,
 hardcodedAuditResults,
 validatorIndependentPass:failures.length===0,
 checks,
 failures,
 pass:failures.length===0
};
fs.writeFileSync(path.join(artifactRoot,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({pass:summary.pass,inventoryItemsAllPass,round1BaselineComparisonPass,ui072MeasuredKeyboardFocusPass,browserHealthActuallyMeasured,uiLabActuallyMeasured,failures},null,2));
if(!summary.pass)process.exit(1);
