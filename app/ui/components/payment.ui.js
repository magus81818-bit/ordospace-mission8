/* CLIENT 킥오프 결제 패널 UI */
window.ORDO_UI_COMPONENTS = window.ORDO_UI_COMPONENTS || {};
window.ORDO_UI_COMPONENTS.PaymentKickoffPanel = function PaymentKickoffPanel(state){
  var esc = window.moduleEsc || function(s){ return String(s == null ? '' : s); };
  var cfg = state.config || {};
  var order = state.order || null;
  var paymentStatus = state.paymentStatus || 'UNPAID';
  var busy = !!state.busy;
  var message = state.message || '';
  var error = state.error || '';

  var statusLabel = {
    UNPAID: '미결제',
    PENDING: '결제 진행 중',
    PAID: '결제 완료',
    CONFIRMING: '승인 처리 중'
  }[paymentStatus] || paymentStatus;

  var canPay = cfg.configured && paymentStatus !== 'PAID' && !busy;

  return ''
    + '<section class="ordo-payment-panel rounded-xl border border-bd-default bg-white shadow-subtle p-4 lg:p-5" aria-labelledby="clientKickoffPaymentTitle">'
    + '<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">'
    + '<div><p class="text-[11px] font-semibold text-tx-tertiary tracking-wide uppercase">KICKOFF PAYMENT</p>'
    + '<h2 id="clientKickoffPaymentTitle" class="text-[16px] lg:text-[18px] font-semibold mt-1">ORDOSPACE 프로젝트 킥오프</h2>'
    + '<p class="text-[13px] text-tx-secondary mt-1">테스트 결제 ₩49,000 · 실제 청구되지 않습니다</p></div>'
    + '<span class="inline-flex items-center h-8 px-3 rounded-full text-[12px] font-semibold border border-st-pendbd bg-st-pendbg text-st-pendfg" role="status">테스트 결제</span>'
    + '</div>'
    + '<dl class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-[13px]">'
    + '<div><dt class="text-tx-tertiary">상품</dt><dd class="font-semibold text-tx-primary">프로젝트 킥오프</dd></div>'
    + '<div><dt class="text-tx-tertiary">금액</dt><dd class="font-semibold text-tx-primary tabular">₩49,000</dd></div>'
    + '<div><dt class="text-tx-tertiary">상태</dt><dd class="font-semibold text-tx-primary" role="status">' + esc(statusLabel) + '</dd></div>'
    + '</dl>'
    + (message ? '<p class="text-[13px] text-st-okfg mb-3" role="status">' + esc(message) + '</p>' : '')
    + (error ? '<p class="text-[13px] text-st-warnfg mb-3" role="alert">' + esc(error) + '</p>' : '')
    + (!cfg.configured ? '<p class="text-[13px] text-tx-secondary mb-3" role="status">테스트 결제 설정이 준비되지 않았습니다. 관리자에게 TOSS_CLIENT_KEY 설정을 요청하세요.</p>' : '')
    + (order && order.status === 'PENDING' ? '<p class="text-[12px] text-tx-tertiary mb-3">주문 ' + esc(order.orderId.slice(0, 8)) + '… 결제를 이어갈 수 있습니다.</p>' : '')
    + '<div class="flex flex-wrap gap-2">'
    + '<button type="button" id="clientKickoffPayBtn" class="h-10 px-4 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" '
    + (canPay ? '' : 'disabled ')
    + 'aria-busy="' + String(busy) + '">'
    + '<i data-lucide="credit-card" class="w-4 h-4" aria-hidden="true"></i>'
    + (busy ? '처리 중…' : (paymentStatus === 'PAID' ? '결제 완료' : '킥오프 결제하기'))
    + '</button>'
    + '</div>'
    + '</section>';
};

window.ORDO_UI_COMPONENTS.bindPaymentKickoffPanel = function bindPaymentKickoffPanel(render){
  var btn = document.getElementById('clientKickoffPayBtn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', function(){
    if (btn.disabled) return;
    window.ORDO_PAYMENT_ORDER.startCheckout(function(st){
      render({ busy: st.phase === 'loading' || st.phase === 'sdk', message: '', error: st.phase === 'error' ? st.message : '' });
      if (st.phase === 'error') render({ busy: false, error: st.message });
    });
  });
};
