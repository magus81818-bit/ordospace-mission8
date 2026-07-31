# ERD (Mission 8)

## User
- id PK, paymentOrders 1—N

## Project
- id PK, clientId FK→User
- paymentStatus: UNPAID|PENDING|PAID
- kickoffPaidAt nullable
- paymentOrders 1—N

## PaymentOrder
- id PK, orderId unique
- userId FK, projectId FK
- idempotencyKey, unique(userId, idempotencyKey)
- productCode, orderName, amount, currency
- status enum, paymentKey unique nullable
- failureCode, failureMessage, approvedAt, canceledAt

Migration: `20260731090000_add_payment_orders`
