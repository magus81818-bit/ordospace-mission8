# Round 2 TDD 계획

## 해피패스

**Given** CLIENT(userId=3)가 본인 프로젝트(projectId=1, clientId=3)에 대해  
**When** `createOrder({ userId:3, role:CLIENT, projectId:1, idempotencyKey:"k1" })`  
**Then** catalog 금액 49000, status PENDING, orderId 반환

**Given** PENDING 주문과 fake gateway success  
**When** `confirmOrder({ userId:3, role:CLIENT, orderId, paymentKey, amount:49000 })`  
**Then** order PAID, project PAID, gateway confirm 1회

## Critical 1: amount mismatch

**Given** PENDING 주문 amount=49000  
**When** confirm amount=1  
**Then** BusinessException, gateway 미호출

## Critical 2: 타인 주문 confirm

**Given** userId=3의 주문  
**When** userId=99가 confirm  
**Then** BusinessException, gateway 미호출

## 주입

- fake `PaymentGateway.confirm`
- mock `IPaymentOrderRepo`, `findProjectById`

## 기존 테스트 영향

auth/module-card/user tests — 변경 없음, 회귀 실행
