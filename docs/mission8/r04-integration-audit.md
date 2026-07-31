# Round 4 통합 감사

| 항목 | 경로 |
|---|---|
| PaymentOrder service | backend/src/application/services/payment-order.service.ts |
| PaymentOrder repo | backend/src/outbound/repos/payment-order.repo.ts |
| PaymentGateway | backend/src/application/contracts/payment-gateway.contract.ts |
| Toss adapter | backend/src/outbound/externals/toss-payment.gateway.ts |
| Controller | backend/src/inbound/controllers/payment-order.controller.ts |
| Prisma | backend/prisma/schema.prisma, migrations/20260731090000_add_payment_orders |
| CLIENT UI | app/screens/client-workspace.screen.js, payment.ui.js |
| SDK loader | app/services/payment-order.service.js loadTossSdk |
| Callback | app-boot.js + payment-order.service handlePaymentCallback |
| Config endpoint | GET /api/payments/config |
| Env | backend/.env.example TOSS_* |

## 보안 불변식
- CLIENT-only create/confirm ✓ (service tests)
- Server price 49000 ✓
- amount mismatch pre-gateway ✓
- IDOR confirm ✓
- paymentKey unique ✓
- PAID idempotent ✓
- Frontend no secret ✓ (validate-payment-ui-contract)

## Sandbox E2E
- NOT RUN — NEEDS_EXTERNAL_CREDENTIAL

## DB integration
- NOT RUN — 격리 PostgreSQL 미구성
