/* CLIENT 프로젝트 킥오프 결제 — API·Toss SDK·callback 처리 */
window.ORDO_PAYMENT_ORDER = (function(){
  var SDK_URL = 'https://js.tosspayments.com/v2/standard';
  var sdkPromise = null;
  var configCache = null;
  var inFlight = false;

  var FAIL_MESSAGES = {
    PAY_PROCESS_CANCELED: '결제가 취소되었습니다.',
    PAY_PROCESS_ABORTED: '결제 인증을 완료하지 못했습니다.'
  };

  function api(){ return window.ORDO_API; }
  function hasBackend(){ return !!(window.ORDO_API_BASE && String(window.ORDO_API_BASE).trim()); }

  function projectId(){
    if (window.ORDO_PAYMENT_PROJECT_ID != null) return Number(window.ORDO_PAYMENT_PROJECT_ID);
    return 1;
  }

  async function fetchConfig(){
    if (!hasBackend()) return { configured: false, clientKey: '', mode: 'test', productCode: 'PROJECT_KICKOFF' };
    if (configCache) return configCache;
    try {
      var data = await api().request('GET', '/api/payments/config', null, false);
      configCache = data;
      return data;
    } catch (e) {
      return { configured: false, clientKey: '', mode: 'test', productCode: 'PROJECT_KICKOFF' };
    }
  }

  function loadTossSdk(){
    if (window.TossPayments) return Promise.resolve(window.TossPayments);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function(resolve, reject){
      var existing = document.querySelector('script[data-toss-sdk="v2"]');
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.TossPayments); });
        existing.addEventListener('error', function(){ reject(new Error('Toss SDK 로드 실패')); });
        return;
      }
      var s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.dataset.tossSdk = 'v2';
      s.onload = function(){ window.TossPayments ? resolve(window.TossPayments) : reject(new Error('Toss SDK unavailable')); };
      s.onerror = function(){ reject(new Error('Toss SDK 로드 실패')); };
      document.head.appendChild(s);
      setTimeout(function(){ reject(new Error('Toss SDK 로드 시간 초과')); }, 15000);
    });
    return sdkPromise;
  }

  async function createOrder(){
    var key = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('idem-' + Date.now());
    return api().request('POST', '/api/payment-orders', {
      projectId: projectId(),
      idempotencyKey: key
    }, true);
  }

  async function confirmOrder(orderId, paymentKey, amount){
    return api().request('POST', '/api/payment-orders/' + encodeURIComponent(orderId) + '/confirm', {
      paymentKey: paymentKey,
      amount: Number(amount)
    }, true);
  }

  async function reportFailure(orderId, code, message){
    return api().request('POST', '/api/payment-orders/' + encodeURIComponent(orderId) + '/fail', {
      code: code,
      message: message
    }, true);
  }

  function buildCallbackUrl(kind){
    var u = new URL(location.href);
    u.search = '';
    u.searchParams.set('paymentResult', kind);
    return u.toString();
  }

  function stripPaymentQuery(){
    var u = new URL(location.href);
    ['paymentResult','paymentKey','orderId','amount','code','message'].forEach(function(k){ u.searchParams.delete(k); });
    history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
  }

  async function startCheckout(onStatus){
    if (inFlight) return;
    if (!hasBackend()) {
      onStatus && onStatus({ phase: 'error', message: '백엔드 API가 연결되지 않았습니다.' });
      return;
    }
    inFlight = true;
    onStatus && onStatus({ phase: 'loading', message: '주문을 생성하는 중입니다…' });
    try {
      var cfg = await fetchConfig();
      if (!cfg.configured || !cfg.clientKey || cfg.mode !== 'test') {
        throw new Error('테스트 결제 설정이 준비되지 않았습니다.');
      }
      var orderRes = await createOrder();
      var order = orderRes.order;
      onStatus && onStatus({ phase: 'sdk', message: '결제창을 여는 중입니다…', order: order });
      await loadTossSdk();
      var toss = window.TossPayments(cfg.clientKey);
      var payment = toss.payment({ customerKey: 'client-' + (window.ORDO_SESSION_SERVICE?.getUserId?.() || 'guest') });
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: order.currency || 'KRW', value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: buildCallbackUrl('success'),
        failUrl: buildCallbackUrl('fail')
      });
    } catch (e) {
      onStatus && onStatus({ phase: 'error', message: e.message || '결제를 시작할 수 없습니다.' });
    } finally {
      inFlight = false;
    }
  }

  async function handlePaymentCallback(){
    var params = new URLSearchParams(location.search);
    var result = params.get('paymentResult');
    if (!result) return null;

    var snapshot = {
      paymentKey: params.get('paymentKey'),
      orderId: params.get('orderId'),
      amount: params.get('amount'),
      code: params.get('code'),
      message: params.get('message')
    };

    if (result === 'success') {
      if (!snapshot.paymentKey || !snapshot.orderId || !/^\d+$/.test(String(snapshot.amount || ''))) {
        stripPaymentQuery();
        return { ok: false, message: '결제 승인 정보가 올바르지 않습니다.' };
      }
      try {
        if (hasBackend() && api().getToken()) {
          await confirmOrder(snapshot.orderId, snapshot.paymentKey, Number(snapshot.amount));
        }
        stripPaymentQuery();
        return { ok: true, message: '프로젝트 킥오프 결제가 완료되었습니다.' };
      } catch (e) {
        stripPaymentQuery();
        return { ok: false, message: e.message || '결제 승인에 실패했습니다.' };
      }
    }

    if (result === 'fail') {
      var userMsg = FAIL_MESSAGES[snapshot.code] || '결제에 실패했습니다. 다시 시도해 주세요.';
      try {
        if (hasBackend() && api().getToken() && snapshot.orderId && params.get('orderId')) {
          await reportFailure(snapshot.orderId, snapshot.code || 'PAY_FAILED', snapshot.message || userMsg);
        }
      } catch (e) { /* paid 덮어쓰기 방지 — 실패 기록은 best-effort */ }
      stripPaymentQuery();
      return { ok: false, message: userMsg, canceled: snapshot.code === 'PAY_PROCESS_CANCELED' };
    }

    stripPaymentQuery();
    return null;
  }

  return {
    fetchConfig: fetchConfig,
    startCheckout: startCheckout,
    handlePaymentCallback: handlePaymentCallback,
    hasBackend: hasBackend,
    projectId: projectId
  };
})();
