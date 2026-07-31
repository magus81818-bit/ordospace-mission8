# ORDOSPACE Mission 8 Backend

## 스택

TypeScript, Express 5, Prisma 7, PostgreSQL.

## 계층

| 계층 | 책임 |
|---|---|
| inbound | controllers, middlewares, Zod schemas |
| application | services, contracts, domain |
| outbound | repos, externals (Toss gateway) |
| shared | exceptions, utils, config |

## DI

factory function + contract interface. `bootstrap.ts`에서만 조립.

## Prisma

generated client 수정 금지. migration SQL 검토 후 `migrate deploy`.

## 결제

- `payment-product-catalog.ts` — 서버 가격
- `PaymentGateway` contract + `TossPaymentGateway` + fake for tests
- 상태 전이: PENDING→CONFIRMING→PAID|FAILED, 멱등 confirm, paymentKey unique

## 검증 위치

- Zod: inbound schemas
- auth: auth.middleware
- role: role.middleware (`CLIENT` for payment)
- ownership: payment-order.service

## 테스트

`payment-order.service.test.ts` 우선. fake gateway 주입. 실제 Toss 네트워크 호출 금지.

## 종료 게이트

```powershell
npm.cmd test -- --runInBand
npm.cmd run type
npm.cmd run build
```

상세 API: `docs/mission8/payment-api-contract.md`
