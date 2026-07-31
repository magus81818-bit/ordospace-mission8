/* Round 6 Admin-only semantic decorator. Existing renderers and data remain authoritative. */
(function(){
  const adminScreens = [
    'screen-admin-home',
    'screen-admin-projects',
    'screen-admin-cards',
    'screen-admin-team',
    'screen-admin-audit'
  ];
  let scheduled = false;

  function setAttr(node, name, value){
    if (node && node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  }

  function visible(node){
    return !!node && !node.classList.contains('hidden');
  }

  function syncTabs(selector, activeValue, controls){
    document.querySelectorAll(selector).forEach(function(button){
      const value = button.getAttribute(selector.includes('team') ? 'data-admin-team-tab' : 'data-admin-project-view');
      const selected = value === activeValue;
      setAttr(button, 'role', 'tab');
      setAttr(button, 'aria-selected', selected);
      setAttr(button, 'tabindex', selected ? 0 : -1);
      if (controls && controls[value]) setAttr(button, 'aria-controls', controls[value]);
    });
  }

  function sync(){
    scheduled = false;
    syncTabs('[data-admin-project-view]', visible(document.getElementById('adminProjectBoardView')) ? 'board' : 'table', {
      board: 'adminProjectBoardView',
      table: 'adminProjectTableView'
    });
    syncTabs('[data-admin-team-tab]', visible(document.getElementById('adminTeamPartnersPanel')) ? 'partners' : 'heatmap', {
      partners: 'adminTeamPartnersPanel',
      heatmap: 'adminTeamHeatmapPanel'
    });

    document.querySelectorAll('[data-admin-team-panel], #adminProjectBoardView, #adminProjectTableView').forEach(function(panel){
      setAttr(panel, 'aria-hidden', !visible(panel));
    });

    adminScreens.forEach(function(id){
      const screen = document.getElementById(id);
      if (!screen) return;
      screen.querySelectorAll('th').forEach(function(header){ setAttr(header, 'scope', 'col'); });
      screen.querySelectorAll('.overflow-x-auto').forEach(function(scroller){
        if (!scroller.querySelector('table')) return;
        setAttr(scroller, 'tabindex', 0);
        if (!scroller.hasAttribute('aria-label')) {
          const heading = scroller.closest('section')?.querySelector('h2')?.textContent?.trim();
          setAttr(scroller, 'aria-label', (heading || '관리자 데이터') + ' 표 가로 스크롤');
        }
      });
    });

    document.querySelectorAll('#screen-admin-team .heat-cell').forEach(function(button){
      button.classList.add('ordo-admin-heat-cell');
      const project = button.dataset.project ? ' · ' + button.dataset.project : ' · 유휴';
      setAttr(button, 'aria-label', button.dataset.worker + project + ' · ' + button.dataset.hours + '시간');
    });

    document.querySelectorAll('#screen-admin-projects [data-admin-project-row]').forEach(function(row){
      row.classList.add('ordo-admin-table-row');
      setAttr(row, 'tabindex', 0);
      setAttr(row, 'role', 'button');
    });
    document.querySelectorAll('#screen-admin-home [data-admin-home-project], #screen-admin-team tbody tr').forEach(function(row){
      row.classList.add('ordo-admin-table-row');
    });

    document.querySelectorAll('#adminBulkCreateSheet, #invitePartnerSheet, #reassignModal').forEach(function(overlay){
      setAttr(overlay, 'aria-hidden', overlay.classList.contains('hidden'));
      const panel = overlay.querySelector('.sheet') || overlay.children[1];
      if (panel) {
        panel.classList.add('ordo-admin-overlay');
        setAttr(panel, 'role', 'dialog');
        setAttr(panel, 'aria-modal', 'true');
        setAttr(panel, 'tabindex', -1);
      }
    });
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  function bindKeyboard(){
    document.addEventListener('keydown', function(event){
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('[data-admin-project-row]');
      if (!row) return;
      event.preventDefault();
      row.click();
    });
  }

  function observe(){
    const roots = adminScreens.map(function(id){ return document.getElementById(id); }).filter(Boolean);
    if (!roots.length) return;
    const observer = new MutationObserver(schedule);
    roots.forEach(function(root){ observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }); });
  }

  bindKeyboard();
  observe();
  schedule();
  window.ORDO_ADMIN_UI = { sync: sync, schedule: schedule };
})();
