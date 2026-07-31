# 결제 도메인 모델

## 상품 정책

| 항목 | 값 |
|---|---|
| productCode | `PROJECT_KICKOFF` |
| orderName | ORDOSPACE 프로젝트 킥오프 |
| amount | 49,000 KRW |
| currency | KRW |

가격·상품명은 서버 카탈로그에서만 결정. 클라이언트 입력 무시.

## PaymentOrder

| 필드 | 타입 | 설명 |
|---|---|---|
| id | Int | 내부 PK |
| orderId | String | Toss용 6~64자 고유 ID |
| idempotencyKey | String | 사용자별 주문 생성 재시도 키 |
| userId | Int | 주문자 |
| projectId | Int | 대상 프로젝트 |
| productCode | String | PROJECT_KICKOFF |
| orderName | String | 표시명 |
| amount | Int | 49000 |
| currency | String | KRW |
| status | PaymentOrderStatus | 아래 enum |
| paymentKey | String? unique | Toss 승인 키 |
| failureCode | String? | 실패 코드 |
| failureMessage | String? | 실패 메시지 |
| approvedAt | DateTime? | 승인 시각 |
| canceledAt | DateTime? | 취소 시각 |
| expiresAt | DateTime? | 만료 |
| createdAt / updatedAt | DateTime | |

## 상태 enum

### PaymentOrderStatus

- `PENDING` — 주문 생성, 결제 대기
- `CONFIRMING` — 승인 처리 중
- `PAID` — 승인 완료
- `FAILED` — 승인/인증 실패
- `CANCELED` — 사용자 취소
- `EXPIRED` — 만료

### ProjectPaymentStatus

- `UNPAID` — 미결제 (기본)
- `PENDING` — 결제 진행 중
- `PAID` — 킥오프 결제 완료

## 허용 상태 전이

```
PENDING → CONFIRMING → PAID
PENDING → CONFIRMING → FAILED
PENDING → CANCELED
PENDING → EXPIRED
FAILED → CONFIRMING (재시도 정책 시)
```

## 금지 전이

- `PAID` → 다른 상태
- 타 사용자의 상태 변경
- 다른 프로젝트로 주문 이동
- 승인된 `paymentKey` 재사용

## 소유권

- 주문 생성: `CLIENT` + `project.clientId === userId`
- 주문 조회/승인: 주문자 본인만
- ADMIN/WORKER: 결제 API 접근 거부

## 멱등성

- `userId + idempotencyKey` unique → 동일 키 재요청 시 동일 주문 반환
- `PAID` 주문 동일 confirm → gateway 재호출 없이 성공 반환
- `paymentKey` unique → 다른 주문 재사용 거부

## 로그 마스킹

- `TOSS_SECRET_KEY`, Authorization header, 전체 paymentKey 로그 금지
- paymentKey는 마지막 4자만 디버그 가능 (가능 시)
