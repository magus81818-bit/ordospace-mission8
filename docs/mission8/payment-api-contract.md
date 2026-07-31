# 결제 API 계약 (초안)

## GET /api/payments/config

- **인증**: 불필요
- **Response 200**:
```json
{
  "configured": true,
  "clientKey": "test_ck_...",
  "mode": "test",
  "productCode": "PROJECT_KICKOFF"
}
```
- clientKey 없으면 `configured: false`, 빈 키
- secret, 내부 env 절대 미포함

## POST /api/payment-orders

- **인증**: 필수
- **역할**: CLIENT만
- **Request**: `{ "projectId": number, "idempotencyKey": string }`
- **성공 201/200**:
```json
{
  "order": {
    "orderId": "...",
    "orderName": "ORDOSPACE 프로젝트 킥오프",
    "amount": 49000,
    "currency": "KRW",
    "status": "PENDING",
    "projectId": 1
  }
}
```
- **오류**: 401 비인증, 403 권한/타인 프로젝트, 404 프로젝트 없음, 409 이미 PAID
- **멱등**: 동일 idempotencyKey → 동일 주문
- **가격**: 서버 catalog 고정

## GET /api/payment-orders/:orderId

- **인증**: 필수, 주문자 CLIENT 본인
- **Response**: 주문 요약 (paymentKey 전체 미노출)
- **오류**: 403/404

## POST /api/payment-orders/:orderId/confirm

- **인증**: 필수, 주문자 CLIENT
- **Request**: `{ "paymentKey": string, "amount": number }`
- path orderId와 저장 orderId 일치, amount 서버 금액 일치
- **성공**: order PAID, project paymentStatus PAID
- **멱등**: PAID + 동일 요청 → 성공 재반환
- **오류**: 409 amount/key conflict, 422 상태 불가
- Toss 오류는 내부 code/message로 변환, 원문 그대로 노출 금지

## POST /api/payment-orders/:orderId/fail

- **인증**: 필수
- **Request**: `{ "code": string, "message"?: string }`
- `PAY_PROCESS_CANCELED` → CANCELED, 그 외 FAILED
- PAID 변경 금지

## Toss 승인 (서버 내부)

- `POST https://api.tosspayments.com/v1/payments/confirm`
- body: paymentKey, orderId, amount
- Basic auth: secret key (서버 only)
