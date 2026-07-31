/* Round 4 shared primitive contracts. Existing factories remain authoritative. */
(function(){
  function esc(value){ return window.ORDO_UI_COMPONENTS.escapeHtml(value); }

  function Button(label, options){
    const o = options || {};
    const variant = o.variant || 'secondary';
    const size = o.size || 'medium';
    const attrs = [
      'type="' + esc(o.type || 'button') + '"',
      'class="ordo-c-button' + (o.className ? ' ' + esc(o.className) : '') + '"',
      'data-variant="' + esc(variant) + '"',
      'data-size="' + esc(size) + '"'
    ];
    if (o.disabled) attrs.push('disabled');
    if (o.loading) attrs.push('aria-busy="true"', 'disabled');
    if (o.ariaLabel) attrs.push('aria-label="' + esc(o.ariaLabel) + '"');
    if (o.id) attrs.push('id="' + esc(o.id) + '"');
    return '<button ' + attrs.join(' ') + '>' + esc(label) + '</button>';
  }

  function FieldMessage(message, tone, id){
    return '<span class="ordo-c-field-message" data-tone="' + esc(tone || 'muted') + '"' + (id ? ' id="' + esc(id) + '"' : '') + '>' + esc(message) + '</span>';
  }

  function TableShell(headers, rows, options){
    const o = options || {};
    const head = (headers || []).map(function(label){ return '<th scope="col">' + esc(label) + '</th>'; }).join('');
    const body = (rows || []).map(function(row){ return '<tr>' + row.map(function(cell){ return '<td>' + esc(cell) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="ordo-c-table-shell" tabindex="0" aria-label="' + esc(o.label || '데이터 표') + '"><table class="ordo-c-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function OverlayController(id, options){
    const o = options || {};
    let returnFocus = null;
    function root(){ return document.getElementById(id); }
    function focusables(el){ return Array.from(el.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')); }
    function open(trigger){
      const el = root();
      if (!el) return false;
      returnFocus = trigger || document.activeElement;
      el.hidden = false;
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('ordo-overlay-open');
      const list = focusables(el);
      (list[0] || el).focus();
      return true;
    }
    function close(){
      const el = root();
      if (!el) return false;
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('ordo-overlay-open');
      if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
      return true;
    }
    function bind(){
      const el = root();
      if (!el || el.dataset.ordoOverlayBound === '1') return;
      el.dataset.ordoOverlayBound = '1';
      el.addEventListener('click', function(event){
        if (event.target.matches('[data-ordo-overlay-close]') || (o.closeOnBackdrop !== false && event.target === el)) close();
      });
      el.addEventListener('keydown', function(event){
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const list = focusables(el);
        if (!list.length) { event.preventDefault(); el.focus(); return; }
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
    }
    return { open: open, close: close, bind: bind };
  }

  window.ORDO_UI_COMPONENTS = Object.assign(window.ORDO_UI_COMPONENTS || {}, {
    Button: Button,
    FieldMessage: FieldMessage,
    TableShell: TableShell,
    OverlayController: OverlayController
  });
})();
