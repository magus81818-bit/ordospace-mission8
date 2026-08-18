const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/services/analytics.service.js'), 'utf8');
const appendedScripts = [];
const listeners = {};
const meta = {
  'ordo-gtm-container-id': '',
  'ordo-analytics-environment': 'test',
};

const document = {
  head: { appendChild(node){ appendedScripts.push(node); } },
  querySelector(selector){
    const match = selector.match(/^meta\[name="([^"]+)"\]$/);
    if (match) return { content: meta[match[1]] || '' };
    return null;
  },
  createElement(){ return { dataset: {} }; },
  addEventListener(type, handler){ listeners[type] = handler; },
};

const window = {
  ORDO_ROLE: 'client',
  _ordoSession: { authenticated: true, userId: 42, role: 'client', email: 'never-send@example.com' },
  dataLayer: [],
  dispatchEvent(){},
};
const context = {
  window,
  document,
  location: { hostname: 'localhost', search: '?utm_source=kakao&utm_medium=social&utm_campaign=mission9_launch', hash: '#project' },
  URLSearchParams,
  CustomEvent: function(type, init){ this.type = type; this.detail = init.detail; },
  console,
};
vm.createContext(context);
vm.runInContext(source, context);

function assert(condition, message){
  if (!condition) throw new Error(message);
}

assert(window.ORDO_ANALYTICS, 'analytics service was not exposed');
assert(appendedScripts.length === 0, 'GTM must not load without a valid container ID');
assert(window.ORDO_ANALYTICS.eventNames.length >= 5, 'at least five events are required');

window.ORDO_ANALYTICS.track('payment_completed', {
  project_id: 1,
  product_code: 'PROJECT_KICKOFF',
  amount: 49000,
  currency: 'KRW',
  email: 'blocked@example.com',
  payment_key: 'blocked-secret',
  message: 'blocked raw error',
});
const event = window.dataLayer.at(-1);
assert(event.event === 'ordo_event', 'GTM custom event name changed');
assert(event.event_name === 'payment_completed', 'business event name missing');
assert(event.analytics_user_id === 'user-42', 'non-PII analytics user id missing');
assert(event.event_properties.amount === 49000, 'typed amount missing');
assert(event.event_properties.utm_source === 'kakao', 'UTM source missing');
assert(!('email' in event.event_properties), 'email must not be collected');
assert(!('payment_key' in event.event_properties), 'payment key must not be collected');
assert(!('message' in event.event_properties), 'raw error message must not be collected');

const count = window.dataLayer.length;
assert(window.ORDO_ANALYTICS.track('unknown_event', { any: 'value' }) === false, 'unknown events must be rejected');
assert(window.dataLayer.length === count, 'unknown event entered dataLayer');

console.log(JSON.stringify({
  ok: true,
  eventCount: window.ORDO_ANALYTICS.eventNames.length,
  dataLayerEvent: window.ORDO_ANALYTICS.dataLayerEvent,
  privacyFieldsBlocked: ['email','payment_key','message'],
}, null, 2));
