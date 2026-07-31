# 테스트 전략

## 단위 (payment-order.service.test.ts)

| # | 시나리오 |
|---|---|
| 1 | CLIENT 본인 프로젝트 주문 생성 |
| 2 | ADMIN/WORKER 주문 생성 거부 |
| 3 | 타 CLIENT 프로젝트 거부 |
| 4 | 클라이언트 금액 변조 무시 |
| 5 | 유효 주문 confirm 성공 |
| 6 | 타인 주문 confirm 거부 |
| 7 | orderId/amount 불일치 |
| 8 | 중복 confirm 멱등 |
| 9 | paymentKey 재사용 거부 |
| 10 | gateway 실패 → FAILED |
| 11 | 사용자 취소 → CANCELED |
| 12 | 금지 상태 전이 |

## Toss adapter (toss-payment.gateway.test.ts)

URL/method/body, Basic auth, secret 누락, test mode, 4xx mapping, non-JSON, timeout, secret 비로그

## 정적/UI (Round 3+)

- validate-payment-ui-contract.cjs
- smoke 12 routes + runtime QA
- module-card lifecycle 회귀

## 통합 (Round 4)

격리 PostgreSQL `ordospace_mission8_test` — migration deploy 후 API 테스트

## Sandbox E2E (Round 4~5)

TOSS_CLIENT_KEY + TOSS_SECRET_KEY 필요 — 없으면 NOT RUN

## Critical cases (TDD 2선)

1. **amount mismatch** — gateway 호출 전 차단
2. **타인 주문 confirm** — IDOR 방어
