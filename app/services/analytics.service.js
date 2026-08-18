/* Mission 9: privacy-conscious dataLayer contract for GTM -> Amplitude + GA4. */
window.ORDO_ANALYTICS = (function(){
  'use strict';

  var DATA_LAYER_EVENT = 'ordo_event';
  var EVENT_PROPERTIES = Object.freeze({
    screen_viewed: ['route_name','section_name','is_public'],
    landing_cta_clicked: ['cta_location','destination'],
    login_submitted: ['login_method'],
    login_succeeded: ['login_method','user_role','is_mock'],
    login_failed: ['login_method','failure_code','is_mock'],
    project_workspace_viewed: ['project_id','payment_status'],
    payment_started: ['project_id','product_code'],
    payment_order_created: ['project_id','product_code','amount','currency'],
    payment_checkout_opened: ['project_id','product_code','amount','currency'],
    payment_confirmation_started: ['product_code','amount','currency'],
    payment_completed: ['project_id','product_code','amount','currency'],
    payment_failed: ['project_id','product_code','failure_stage','failure_code']
  });
  var COMMON_PROPERTIES = ['environment','utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var initialized = false;
  var amplitudeReady = false;
  var amplitudeQueue = [];

  function readMeta(name){
    return String(document.querySelector('meta[name="' + name + '"]')?.content || '').trim();
  }

  function environment(){
    return readMeta('ordo-analytics-environment') || (location.hostname === 'localhost' ? 'development' : 'production');
  }

  function routeName(){
    return (location.hash || '#landing').replace(/^#/, '').split('?')[0] || 'landing';
  }

  function campaignProperties(){
    var params = new URLSearchParams(location.search || '');
    var result = {};
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(key){
      var value = params.get(key);
      if (value) result[key] = String(value).slice(0, 120);
    });
    return result;
  }

  function userContext(){
    var session = window._ordoSession || {};
    var userId = session.authenticated && session.userId != null ? 'user-' + String(session.userId) : undefined;
    return {
      analytics_user_id: userId,
      user_role: String(session.role || window.ORDO_ROLE || 'anonymous'),
      is_authenticated: !!session.authenticated,
      environment: environment()
    };
  }

  function safeValue(key, value){
    if (value == null) return undefined;
    if (key === 'amount' || key === 'project_id') {
      var numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : undefined;
    }
    if (key === 'is_public' || key === 'is_mock') return !!value;
    return String(value).slice(0, 120);
  }

  function sanitize(eventName, properties){
    var allowed = (EVENT_PROPERTIES[eventName] || []).concat(COMMON_PROPERTIES);
    var source = Object.assign({}, campaignProperties(), properties || {});
    return allowed.reduce(function(result, key){
      var value = safeValue(key, source[key]);
      if (value !== undefined) result[key] = value;
      return result;
    }, { environment: environment() });
  }

  function track(eventName, properties){
    if (!Object.prototype.hasOwnProperty.call(EVENT_PROPERTIES, eventName)) return false;
    window.dataLayer = window.dataLayer || [];
    var context = userContext();
    var payload = {
      event: DATA_LAYER_EVENT,
      event_name: eventName,
      event_properties: sanitize(eventName, properties),
      user_properties: {
        user_role: context.user_role,
        is_authenticated: context.is_authenticated,
        environment: context.environment
      }
    };
    if (context.analytics_user_id) payload.analytics_user_id = context.analytics_user_id;
    window.dataLayer.push(payload);
    sendToAmplitude(payload);
    window.dispatchEvent(new CustomEvent('ordo:analytics-event', { detail: payload }));
    return true;
  }

  function amplitudeProperties(payload){
    var result = Object.assign({}, payload.event_properties || {}, payload.user_properties || {});
    if (payload.analytics_user_id) result.analytics_user_id = payload.analytics_user_id;
    return result;
  }

  function flushAmplitudeQueue(){
    if (!amplitudeReady || !window.amplitude || typeof window.amplitude.track !== 'function') return;
    while (amplitudeQueue.length) {
      var payload = amplitudeQueue.shift();
      window.amplitude.track(payload.event_name, amplitudeProperties(payload));
    }
  }

  function sendToAmplitude(payload){
    amplitudeQueue.push(payload);
    flushAmplitudeQueue();
  }

  function loadAmplitude(){
    var key = readMeta('ordo-amplitude-api-key');
    if (!/^[a-f0-9]{32}$/i.test(key)) return false;
    if (document.querySelector('script[data-ordo-amplitude]')) return true;
    var script = document.createElement('script');
    script.async = true;
    script.dataset.ordoAmplitude = 'true';
    script.src = 'https://cdn.amplitude.com/script/' + encodeURIComponent(key) + '.js';
    script.addEventListener('load', function(){
      if (!window.amplitude || typeof window.amplitude.init !== 'function') return;
      window.amplitude.init(key, { fetchRemoteConfig: true, autocapture: false });
      amplitudeReady = true;
      flushAmplitudeQueue();
    }, { once: true });
    document.head.appendChild(script);
    return true;
  }

  function trackScreenView(name, options){
    var route = String(name || routeName());
    var opts = options || {};
    track('screen_viewed', {
      route_name: route,
      section_name: opts.sectionName,
      is_public: !!opts.isPublic
    });
    if (route === 'project' && String(window.ORDO_ROLE || '') === 'client') {
      track('project_workspace_viewed', {
        project_id: window.ORDO_PAYMENT_PROJECT_ID || 1,
        payment_status: opts.paymentStatus || 'unknown'
      });
    }
  }

  function loadGtm(){
    var id = readMeta('ordo-gtm-container-id');
    if (!/^GTM-[A-Z0-9]+$/.test(id)) return false;
    if (document.querySelector('script[data-ordo-gtm]')) return true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.dataset.ordoGtm = id;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
    return true;
  }

  function ctaLocation(link){
    if (link.closest('[data-landing-header]')) return 'header';
    if (link.closest('.landing-hero')) return 'hero';
    if (link.closest('footer')) return 'footer';
    return 'landing_body';
  }

  function bindLandingCtas(){
    document.addEventListener('click', function(event){
      var link = event.target.closest?.('#screen-landing a[href^="#"]');
      if (!link) return;
      var destination = String(link.getAttribute('href') || '').replace(/^#/, '').split('?')[0];
      if (!['auth','inquiry'].includes(destination)) return;
      track('landing_cta_clicked', { cta_location: ctaLocation(link), destination: destination });
    });
  }

  function init(){
    if (initialized) return;
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    loadGtm();
    loadAmplitude();
    bindLandingCtas();
  }

  init();
  return {
    dataLayerEvent: DATA_LAYER_EVENT,
    eventNames: Object.keys(EVENT_PROPERTIES),
    track: track,
    trackScreenView: trackScreenView,
    routeName: routeName,
    init: init
  };
})();
