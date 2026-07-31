/* Round 8 Worker-only factories and semantic decorator. */
(function(){
  const C = window.ORDO_UI_COMPONENTS;
  const screenIds = ['screen-worker-home', 'screen-worker-cards'];
  let scheduled = false;

  function esc(value){ return C.escapeHtml(value); }
  function attr(node, name, value){ if (node && node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value)); }

  function WorkerProgress(card){
    const checklist = Array.isArray(card.qcChecklist) ? card.qcChecklist : [];
    const checked = checklist.filter(function(item){ return !!item.passed; }).length;
    return '<div class="ordo-worker-progress" data-worker-progress-for="' + esc(card.id) + '">' +
      C.ProgressTrack('QC 진행률', checked, checklist.length, '검토 요청 전 QC 완료 기준') +
      '</div>';
  }

  function WorkerQcGroup(card){
    const checklist = Array.isArray(card.qcChecklist) ? card.qcChecklist : [];
    const checked = checklist.filter(function(item){ return !!item.passed; }).length;
    const helperId = 'workerQcHelp-' + String(card.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    const rows = checklist.map(function(item, index){
      const inputId = 'workerQc-' + String(card.id).replace(/[^a-zA-Z0-9_-]/g, '-') + '-' + index;
      return '<label class="ordo-worker-qc-row" for="' + esc(inputId) + '" data-state="' + (item.passed ? 'checked' : 'unchecked') + '">' +
        '<span>' + esc(item.label) + '</span>' +
        '<input id="' + esc(inputId) + '" name="workerQc" value="' + index + '" type="checkbox" data-worker-qc-index="' + index + '" aria-describedby="' + esc(helperId) + '" ' + (item.passed ? 'checked' : '') + '>' +
        '</label>';
    }).join('') || '<div class="ordo-worker-empty">등록된 QC 체크리스트가 없습니다.</div>';
    return '<fieldset class="ordo-worker-qc-group" data-worker-qc-group aria-describedby="' + esc(helperId) + '">' +
      '<legend>QC 체크리스트</legend>' + rows +
      '<p id="' + esc(helperId) + '" class="ordo-worker-helper"><span data-worker-qc-count>' + checked + '/' + checklist.length + '</span> · 모든 항목을 완료해야 리뷰 요청이 활성화됩니다.</p>' +
      '</fieldset>';
  }

  function WorkerLogForm(card){
    const suffix = String(card.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    return '<form class="ordo-worker-log-form" data-worker-log-form novalidate>' +
      '<div class="ordo-worker-log-fields">' +
        '<label class="ordo-c-form-field" for="workerLogHours-' + esc(suffix) + '"><span>작업 시간 (MH)</span><input class="ordo-c-input" id="workerLogHours-' + esc(suffix) + '" name="hours" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" placeholder="0.5" required aria-describedby="workerLogHelp-' + esc(suffix) + '"></label>' +
        '<label class="ordo-c-form-field" for="workerLogText-' + esc(suffix) + '"><span>작업 내용</span><textarea class="ordo-c-textarea" id="workerLogText-' + esc(suffix) + '" name="text" rows="3" maxlength="240" placeholder="수행한 작업을 입력하세요" required aria-describedby="workerLogHelp-' + esc(suffix) + '"></textarea></label>' +
      '</div>' +
      '<p id="workerLogHelp-' + esc(suffix) + '" class="ordo-worker-helper">0.5~24 MH와 작업 내용을 입력하세요.</p>' +
      '<p class="ordo-worker-form-message" data-worker-log-message role="status" aria-live="polite" hidden></p>' +
      '<button type="submit" class="ordo-c-button" data-variant="secondary" data-worker-log-submit>작업 기록 추가</button>' +
    '</form>';
  }

  function WorkerActionToolbar(card, canSubmit){
    const disabled = !canSubmit;
    return '<div class="ordo-worker-action-toolbar" data-worker-action-toolbar>' +
      '<button type="button" class="ordo-c-button" data-variant="secondary" data-worker-action="log"><i data-lucide="clock-plus" class="w-4 h-4"></i>작업 기록 추가</button>' +
      '<button type="button" class="ordo-c-button" data-variant="secondary" data-worker-action="attach"><i data-lucide="paperclip" class="w-4 h-4"></i>파일 첨부</button>' +
      '<button type="button" class="ordo-c-button ordo-worker-submit" data-variant="primary" data-worker-action="review" aria-describedby="workerSubmitReason" ' + (disabled ? 'disabled aria-disabled="true"' : '') + '><i data-lucide="send" class="w-4 h-4"></i><span data-worker-submit-label>리뷰 요청</span></button>' +
      '<p id="workerSubmitReason" class="ordo-worker-submit-reason" role="status">' + (disabled ? 'QC 체크리스트를 모두 완료하면 리뷰 요청할 수 있습니다.' : 'QC 완료 · 리뷰 요청 가능') + '</p>' +
    '</div>';
  }

  function sync(){
    scheduled = false;
    document.querySelectorAll('[data-worker-filter]').forEach(function(button){
      const selected = button.getAttribute('data-worker-filter') === window._ORDO_WORKER_FILTER || button.classList.contains('bg-brand-primary');
      attr(button, 'aria-pressed', selected);
    });
    document.querySelectorAll('[data-worker-card]').forEach(function(button){
      attr(button, 'aria-pressed', button.getAttribute('data-state') === 'selected');
    });
    attr(document.getElementById('workerCardFilters'), 'aria-label', '내 작업 필터');
    attr(document.getElementById('workerCardCount'), 'aria-live', 'polite');
    attr(document.getElementById('workerCardList'), 'aria-label', '배정된 Module 목록');
    attr(document.getElementById('workerCardDetail'), 'aria-live', 'polite');
    screenIds.forEach(function(id){
      const screen = document.getElementById(id);
      if (!screen) return;
      screen.classList.add('ordo-worker-screen');
      attr(screen, 'data-role-scope', 'worker');
    });
  }

  function schedule(){ if (scheduled) return; scheduled = true; requestAnimationFrame(sync); }
  const observer = new MutationObserver(schedule);
  screenIds.map(function(id){ return document.getElementById(id); }).filter(Boolean).forEach(function(root){
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-state'] });
  });
  schedule();

  window.ORDO_WORKER_UI = {
    Progress: WorkerProgress,
    QcGroup: WorkerQcGroup,
    LogForm: WorkerLogForm,
    ActionToolbar: WorkerActionToolbar,
    sync: sync,
    schedule: schedule
  };
})();
