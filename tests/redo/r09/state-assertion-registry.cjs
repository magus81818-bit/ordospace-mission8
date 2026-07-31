/*
 * Explicit Round 9 browser assertion registry for Matrix states whose primary
 * Round 3/5 artifacts do not expose item/state rows. Every key is executed by
 * state-registry-audit.spec.cjs and produces a unique evidence image.
 */
const STATE_ASSERTION_REGISTRY={
 'UI-001/default':{scenario:'sidebar',mode:'default'},
 'UI-001/hover':{scenario:'sidebar',mode:'hover'},
 'UI-001/active':{scenario:'sidebar',mode:'active'},
 'UI-001/badge':{scenario:'sidebar',mode:'badge'},
 'UI-002/default':{scenario:'topbar',mode:'default'},
 'UI-002/dropdown open':{scenario:'topbar',mode:'dropdown-open'},
 'UI-002/focus':{scenario:'topbar',mode:'focus'},
 'UI-003/default':{scenario:'mobile-header',mode:'default'},
 'UI-003/focus':{scenario:'mobile-header',mode:'focus'},
 'UI-004/closed/open':{scenario:'drawer',mode:'closed-open'},
 'UI-004/backdrop':{scenario:'drawer',mode:'backdrop'},
 'UI-004/Escape':{scenario:'drawer',mode:'escape'},
 'UI-005/default':{scenario:'mobile-tabs',mode:'default'},
 'UI-005/active':{scenario:'mobile-tabs',mode:'active'},
 'UI-005/badge':{scenario:'mobile-tabs',mode:'badge'},
 'UI-006/closed/open':{scenario:'notification',mode:'closed-open'},
 'UI-006/unread/read':{scenario:'notification',mode:'unread-read'},
 'UI-006/empty':{scenario:'notification',mode:'empty'},
 'UI-007/default':{scenario:'theme',mode:'default'},
 'UI-007/hover':{scenario:'theme',mode:'hover'},
 'UI-007/selected':{scenario:'theme',mode:'selected'},
 'UI-008/default':{scenario:'breadcrumb',mode:'default'},
 'UI-008/long title':{scenario:'breadcrumb',mode:'long-title'},
 'UI-009/default':{scenario:'primary-cta',mode:'default'},
 'UI-009/hover':{scenario:'primary-cta',mode:'hover'},
 'UI-009/focus':{scenario:'primary-cta',mode:'focus'},
 'UI-009/disabled':{scenario:'primary-cta',mode:'disabled'},
 'UI-010/default':{scenario:'status-badge',tone:'rej',label:'대기'},
 'UI-010/pending':{scenario:'status-badge',tone:'pend',label:'검토중'},
 'UI-010/warning':{scenario:'status-badge',tone:'warn',label:'주의'},
 'UI-010/critical':{scenario:'status-badge',tone:'crit',label:'위험'},
 'UI-010/ok':{scenario:'status-badge',tone:'ok',label:'승인완료'},
 'UI-011/normal':{scenario:'metric-card',tone:'text-tx-primary',value:'12'},
 'UI-011/positive':{scenario:'metric-card',tone:'text-st-okfg',value:'+8%'},
 'UI-011/warning':{scenario:'metric-card',tone:'text-st-warnfg',value:'D-2'},
 'UI-011/critical':{scenario:'metric-card',tone:'text-st-critfg',value:'3'},
 'UI-012/0':{scenario:'progress',approved:0,total:10,expected:0},
 'UI-012/partial':{scenario:'progress',approved:4,total:10,expected:40},
 'UI-012/complete':{scenario:'progress',approved:10,total:10,expected:100},
 'UI-012/overflow-safe':{scenario:'progress',approved:15,total:10,expected:150,overflowSafe:true}
};

function buildSourceStateRegistry({r4Coverage,r6Coverage,r7Coverage,r8Coverage,publicStates,ui072}){
 const registry={};
 const add=(key,sourceArtifact,sourceRecord)=>{registry[key]={sourceArtifact,sourceRecord};};
 for(const stateRow of r4Coverage.states||[]){
  for(const inventoryId of stateRow.implemented||[])add(`${inventoryId}/${stateRow.state}`,'artifacts/redo/r04/primitive-state-coverage.json',stateRow);
 }
 for(const [coverage,sourceArtifact] of [
  [r6Coverage,'artifacts/redo/r06/admin-state-coverage.json'],
  [r7Coverage,'artifacts/redo/r07/client-state-coverage.json'],
  [r8Coverage,'artifacts/redo/r08/worker-state-coverage.json']
 ]){
  for(const item of coverage.items||[])for(const [state,value] of Object.entries(item.states||{})){
   if(String(value.status).replace(' ','_')==='implemented')add(`${item.inventoryId}/${state}`,sourceArtifact,value);
  }
 }
 for(const item of publicStates.states||[])add(`${item.inventoryId}/${item.state}`,'artifacts/redo/r09/public-state-audit.json',item);
 for(const item of ui072.cases||[])add(`UI-072/${item.state}`,'artifacts/redo/r09/ui-072-implementation-audit.json',item);
 return registry;
}

module.exports={STATE_ASSERTION_REGISTRY,buildSourceStateRegistry};
