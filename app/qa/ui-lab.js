/* Dev-only interactive SalesOps UI Lab. It never calls APIs or mutates storage. */
(function(){
  const INVENTORY = ['UI-013','UI-014','UI-015','UI-016','UI-017','UI-018','UI-019','UI-020','UI-064','UI-073'];
  function section(title, meta, body, wide){
    return '<section class="ordo-ui-lab__section"' + (wide ? ' data-wide="true"' : '') + '><h3>' + title + '</h3><p class="ordo-ui-lab__meta">' + meta + '</p>' + body + '</section>';
  }
  function render(){
    const mount = document.getElementById('salesopsUiLab');
    if (!mount || mount.dataset.rendered === '1') return;
    mount.dataset.rendered = '1';
    mount.className = 'ordo-ui-lab';
    mount.setAttribute('data-inventory-ids', INVENTORY.join(' '));
    const ui = window.ORDO_UI_COMPONENTS;
    const buttons = ['primary','secondary','outline','ghost','destructive','success'].map(function(v){ return ui.Button(v, { variant:v }); }).join('')
      + ui.Button('loading', { variant:'primary', loading:true }) + ui.Button('disabled', { disabled:true }) + ui.Button('알림', { size:'icon', ariaLabel:'알림 열기' });
    const table = ui.TableShell(['모듈','상태','담당자'], [['긴 한글 제목이 포함된 로그인 보안 모듈','검토중','정다은'],['파일 업로드','완료','김태윤']], { label:'UI Lab 모듈 표' });
    mount.innerHTML = '<header class="ordo-ui-lab__header"><p class="ordo-ui-lab__meta">DEV ONLY · ROUND 4 · UI-073 BASELINE PRESERVED</p><h2>SalesOps Primitive UI Lab</h2><p>운영 데이터와 분리된 10개 공식 Inventory의 상태·키보드·반응형 검증 공간입니다.</p></header><div class="ordo-ui-lab__grid">'
      + section('Foundations','UI-073 · SO-CARD-001 · Derived · --ordo-so-*','<div class="ordo-ui-lab__panel">Surface / border / radius / shadow / typography tokens</div>')
      + section('Typography','UI-073 · Derived','<div class="ordo-ui-lab__panel"><h4>공통 제목 계층</h4><p>본문과 보조 텍스트, <strong>강조 텍스트</strong></p></div>')
      + section('Color and status','UI-073 · Derived','<div class="ordo-ui-lab__stack"><span class="ordo-c-status-badge" data-tone="success">정상</span><span class="ordo-c-status-badge" data-tone="warning">주의</span><span class="ordo-c-status-badge" data-tone="critical">위험</span><span class="ordo-c-status-badge" data-tone="informational">진행</span></div>')
      + section('Buttons','UI-020 · SO-INPUT-001 · Exact', '<div class="ordo-ui-lab__stack">' + buttons + '</div>')
      + section('Form controls','UI-020 · SO-INPUT-001 · Exact','<form id="uiLabForm" class="ordo-ui-lab__panel" novalidate><label class="ordo-c-form-field" for="uiLabName">모듈 이름<input id="uiLabName" class="ordo-c-input" name="moduleName" required aria-describedby="uiLabNameHelp uiLabNameError" placeholder="이름을 입력하세요"><span id="uiLabNameHelp" class="ordo-c-field-message">운영 데이터에 저장되지 않습니다.</span><span id="uiLabNameError" class="ordo-c-field-message" data-tone="critical" hidden>필수 입력입니다.</span></label><label class="ordo-c-form-field" for="uiLabSelect">상태<select id="uiLabSelect" class="ordo-c-select" name="status"><option>대기</option><option>진행중</option></select></label><label><input type="checkbox" id="uiLabCheck"> 검수 항목 확인</label><div class="ordo-ui-lab__stack"><button class="ordo-c-button" data-variant="primary" type="submit">검증</button><button class="ordo-c-button" type="button" data-ui-lab-action="toggle-loading">Loading 전환</button></div></form>')
      + section('Badges and progress','UI-010/011/012 · Round 3 bridge','<div class="ordo-ui-lab__panel"><span class="ordo-c-status-badge bg-st-okbg border-st-okbd text-st-okfg">승인완료</span><div class="progress-track ordo-c-progress-track"><div class="progress-fill" style="width:68%"></div></div></div>')
      + section('Cards','UI-013 · SO-SHELL-001 · Adapted','<article class="ordo-c-module-card action-card p-4" tabindex="0" data-state="selected"><span class="ordo-c-status-badge bg-st-pendbg border-st-pendbd text-st-pendfg">검토중</span><h4>긴 한글 제목이 포함된 인증 모듈 요구사항 검토 카드</h4><p class="ordo-ui-lab__meta">담당자 · MH 28/40 · D-2 · QC 3/5</p></article>')
      + section('Filters and tabs','UI-015/UI-016/UI-064 · SO-FILTER-001/SO-TAB-001','<div class="ordo-c-filter-group" aria-label="상태 필터"><button class="ordo-c-button" data-ui-lab-filter="all" aria-pressed="true">전체</button><button class="ordo-c-button" data-ui-lab-filter="review" aria-pressed="false">검토중</button><button class="ordo-c-button" disabled>비활성</button></div><div class="ordo-c-tabs" role="tablist" aria-label="UI Lab 탭"><button class="ordo-c-button" role="tab" aria-selected="true" aria-controls="uiLabTabPanel" data-ui-lab-tab="notice">알림</button><button class="ordo-c-button" role="tab" aria-selected="false" aria-controls="uiLabTabPanel" data-ui-lab-tab="my">마이</button></div><div id="uiLabTabPanel" role="tabpanel" tabindex="0" class="ordo-ui-lab__panel">알림 탭 선택됨</div>')
      + section('Empty / loading / error / success','UI-014 · SO-STATE-005 · Exact (code-only)','<div id="uiLabFeedback" class="ordo-c-empty-state p-5" role="status"><span class="ordo-c-empty-state__icon" aria-hidden="true">◇</span><strong class="ordo-c-empty-state__title">표시할 모듈이 없습니다</strong><span>필터를 바꾸거나 새 모듈을 만드세요.</span></div><div class="ordo-ui-lab__stack"><button class="ordo-c-button" data-feedback="empty">Empty</button><button class="ordo-c-button" data-feedback="loading">Loading</button><button class="ordo-c-button" data-feedback="error">Error</button><button class="ordo-c-button" data-feedback="success">Success</button></div>')
      + section('Table','UI-019 · SO-TABLE-001 · Exact', table, true)
      + section('Dialog','UI-017 · SO-DIALOG-001 · Exact (code-only)','<button class="ordo-c-button" data-variant="destructive" data-ui-lab-open="uiLabDialog">삭제 확인 열기</button>')
      + section('Sheet','UI-018 · SO-SHEET-001 · Exact (code-only)','<button class="ordo-c-button" data-ui-lab-open="uiLabSheet">상세 시트 열기</button>')
      + section('Long content','UI-013/014/019/020 · Adapted','<button class="ordo-c-button" data-ui-lab-action="toggle-long">긴 콘텐츠 전환</button><p id="uiLabLong" class="ordo-ui-lab__panel" hidden>아주 긴 한국어 콘텐츠에서도 제목, 설명, 메타데이터, 상태와 작업 버튼의 의미와 순서가 유지되는지를 확인하기 위한 반복 가능한 검증 문장입니다. 줄바꿈과 오버플로가 기존 화면 폭을 바꾸지 않아야 합니다.</p>')
      + section('Responsive specimens','UI-013~020/064/073 · D/T/M','<div class="ordo-ui-lab__panel">1440×1000 · 1024×1366 · 390×844</div>')
      + section('Accessibility states','10 IDs · keyboard/focus/contrast/reduced motion','<div class="ordo-ui-lab__stack"><button class="ordo-c-button">Tab focus</button><button class="ordo-c-button" aria-disabled="true">aria-disabled</button><span role="status">상태 메시지 영역</span></div>')
      + '</div>'
      + '<div id="uiLabDialog" class="ordo-c-dialog-backdrop" hidden aria-hidden="true"><section class="ordo-c-dialog" data-state="open" role="dialog" aria-modal="true" aria-labelledby="uiLabDialogTitle" tabindex="-1"><div class="ordo-ui-lab__section"><h2 id="uiLabDialogTitle">모듈 삭제 확인</h2><p>삭제는 되돌릴 수 없습니다. UI Lab에서는 실제 삭제가 발생하지 않습니다.</p><div class="ordo-ui-lab__stack"><button class="ordo-c-button" data-variant="destructive">삭제</button><button class="ordo-c-button" data-ordo-overlay-close>취소</button></div></div></section></div>'
      + '<div id="uiLabSheet" class="ordo-c-sheet-backdrop" hidden aria-hidden="true"><aside class="ordo-c-sheet" data-state="open" role="dialog" aria-modal="true" aria-labelledby="uiLabSheetTitle" tabindex="-1"><div class="ordo-ui-lab__section"><h2 id="uiLabSheetTitle">모듈 상세</h2><p>Desktop side sheet / Mobile bottom sheet</p><textarea class="ordo-c-textarea" aria-label="상세 메모" rows="8">긴 콘텐츠와 모바일 키보드 동작을 확인합니다.</textarea><button class="ordo-c-button" data-ordo-overlay-close>닫기</button></div></aside></div>';
    bind(mount);
    if (window.lucide) window.lucide.createIcons();
  }

  function bind(mount){
    const ui = window.ORDO_UI_COMPONENTS;
    const dialog = ui.OverlayController('uiLabDialog');
    const sheet = ui.OverlayController('uiLabSheet');
    dialog.bind(); sheet.bind();
    mount.querySelectorAll('[data-ui-lab-open]').forEach(function(button){ button.addEventListener('click', function(){ (button.dataset.uiLabOpen === 'uiLabDialog' ? dialog : sheet).open(button); }); });
    mount.querySelectorAll('[data-ui-lab-filter]').forEach(function(button){ button.addEventListener('click', function(){ mount.querySelectorAll('[data-ui-lab-filter]').forEach(function(item){ item.setAttribute('aria-pressed', String(item === button)); }); }); });
    mount.querySelectorAll('[data-ui-lab-tab]').forEach(function(button){ button.addEventListener('click', function(){ mount.querySelectorAll('[data-ui-lab-tab]').forEach(function(item){ item.setAttribute('aria-selected', String(item === button)); }); document.getElementById('uiLabTabPanel').textContent = button.textContent + ' 탭 선택됨'; }); });
    mount.querySelectorAll('[data-feedback]').forEach(function(button){ button.addEventListener('click', function(){ const state=button.dataset.feedback; const panel=document.getElementById('uiLabFeedback'); panel.dataset.state=state; panel.querySelector('.ordo-c-empty-state__title').textContent={empty:'표시할 모듈이 없습니다',loading:'모듈을 불러오는 중',error:'모듈을 불러오지 못했습니다',success:'모듈 검증이 완료되었습니다'}[state]; }); });
    document.getElementById('uiLabForm').addEventListener('submit', function(event){ event.preventDefault(); const input=document.getElementById('uiLabName'); const error=document.getElementById('uiLabNameError'); const invalid=!input.value.trim(); input.setAttribute('aria-invalid', String(invalid)); error.hidden=!invalid; if (invalid) input.focus(); });
    mount.querySelector('[data-ui-lab-action="toggle-loading"]').addEventListener('click', function(event){ const busy=event.currentTarget.getAttribute('aria-busy')==='true'; event.currentTarget.setAttribute('aria-busy', String(!busy)); event.currentTarget.textContent=busy?'Loading 전환':'처리 중'; });
    mount.querySelector('[data-ui-lab-action="toggle-long"]').addEventListener('click', function(){ document.getElementById('uiLabLong').hidden=!document.getElementById('uiLabLong').hidden; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
  window.ORDO_UI_LAB = { render: render, inventory: INVENTORY.slice() };
})();
