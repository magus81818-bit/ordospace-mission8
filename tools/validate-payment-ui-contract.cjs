#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const checks = [];
const fail = (msg) => { throw new Error(msg); };

const paymentService = read('app/services/payment-order.service.js');
const paymentUi = read('app/ui/components/payment.ui.js');
const indexHtml = read('index.html');
const clientScreen = read('app/screens/client-workspace.screen.js');
const appBoot = read('app/services/app-boot.js');

if (!paymentService.includes('ORDO_PAYMENT_ORDER')) fail('payment service missing');
if (!paymentUi.includes('PaymentKickoffPanel')) fail('payment UI missing');
if (!indexHtml.includes('clientProjectKickoffPayment')) fail('payment mount missing in index.html');
if (!clientScreen.includes('renderKickoffPaymentPanel')) fail('client screen not wired');
if (!appBoot.includes('handlePaymentCallback')) fail('callback handler missing');

if (/TOSS_SECRET_KEY|sk_live_|sk_test_[A-Za-z0-9]{10,}/.test(paymentService + paymentUi + indexHtml)) {
  fail('secret key material in frontend source');
}

['handlePaymentCallback', 'stripPaymentQuery', 'paymentResult'].forEach((needle) => {
  if (!paymentService.includes(needle)) fail('missing callback contract: ' + needle);
});

if (!paymentUi.includes('role="alert"') || !paymentUi.includes('aria-busy')) {
  fail('payment UI accessibility contract incomplete');
}

if (!indexHtml.includes('payment.ui.js') || !indexHtml.includes('payment-order.service.js')) {
  fail('scripts not linked in index.html');
}

checks.push('payment service + UI connected');
checks.push('no secret in frontend');
checks.push('callback parser + query cleanup');
checks.push('CLIENT project surface mount');
checks.push('accessibility basics');

console.log(JSON.stringify({ ok: true, checked: checks }, null, 2));
