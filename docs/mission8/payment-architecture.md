# 결제 아키텍처

## 백엔드 계층 (예상 파일)

```
backend/src/
  application/
    domain/payment-order-status.ts
    domain/payment-product-catalog.ts
    contracts/payment-order-repo.contract.ts
    contracts/payment-gateway.contract.ts
    services/payment-order.service.ts
  inbound/
    schemas/payment-order.schemas.ts
    controllers/payment-order.controller.ts
  outbound/
    repos/payment-order.repo.ts
    externals/toss-payment.gateway.ts
  shared/config/payment.config.ts (선택)
  bootstrap.ts — composition root
```

## PaymentGateway

application은 Toss HTTP를 모름. `confirm({ paymentKey, orderId, amount })` 계약만 사용.

- **TossPaymentGateway**: `POST /v1/payments/confirm`, Basic auth, timeout
- **FakePaymentGateway**: 단위 테스트 주입

## 프론트엔드 (Round 3)

```
app/services/payment-order.service.js
app/ui/components/payment.ui.js
app/screens/client-workspace.screen.js — 결제 섹션
app/main.js — callback query 처리
index.html — Toss SDK v2 script
```

## Toss callback vs hash router

hash fragment 대신 query parameter 사용:

- successUrl: `${origin}/?paymentResult=success`
- failUrl: `${origin}/?paymentResult=fail`

`main.js` boot에서 `URLSearchParams(location.search)` 파싱 → 승인/실패 화면 → `history.replaceState`로 민감 query 제거.

## 공식 Toss 문서 기준

- 승인: `POST /v1/payments/confirm`
- 서버가 paymentKey, orderId, amount 검증 후 전송
- secret key 서버 only
- orderId 6~64자 무작위 고유
- 승인 유효 시간 — callback 후 즉시 서버 confirm

## SDK v2 선택

**통합결제창** (`requestPayment`) — 정적 UI 보존, React 불필요, 공식 v2 가이드 준수.
