# 보안

## price tampering
서버 catalog 고정, confirm 시 amount 재검증

## IDOR
주문 userId·project.clientId 이중 검증

## duplicate confirmation
PAID 멱등, markConfirming 선점

## paymentKey reuse
DB unique + confirm 전 조회

## secret
TOSS_SECRET_KEY server-only, frontend validate 스캔

## CORS
CORS_ORIGIN allowlist (index.ts)

## rate limit
express-rate-limit 300/15min

## timeout
Toss adapter AbortController 15s

## uncertain state
gateway timeout → TechnicalException, FAILED 기록 정책 문서화

## future
webhook reconciliation 확장점: PaymentGateway + order status
