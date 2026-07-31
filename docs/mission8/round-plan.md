# Round 2~5 계획

## Round 2 — 백엔드

**시작**: Round 1 PASS, 설계 문서  
**종료**: Prisma migration, payment service/API, fake+Toss adapter, unit tests PASS

| 작업 | 파일 |
|---|---|
| Schema | prisma/schema.prisma, migrations/add_payment_orders |
| Domain | payment-order-status.ts, payment-product-catalog.ts |
| Contracts | payment-order-repo, payment-gateway |
| Service | payment-order.service.ts + test |
| Inbound | payment-order.controller, schemas |
| Outbound | payment-order.repo, toss-payment.gateway |
| Bootstrap | bootstrap.ts, index.ts |

## Round 3 — CLIENT UI

**종료**: root static UI 결제, SDK v2, callback, validate-payment-ui-contract

## Round 4 — 통합·보안

**종료**: security tests, regression, r04 docs, test:mission8 script

## Round 5 — 배포·제출

**종료**: Render/Vercel `ordospace-mission8`, README, evidence, tag `mission8-submission`

- 기존 ORDOSPACE Production 변경 금지
- Preview 검증 후 신규 project Production만
