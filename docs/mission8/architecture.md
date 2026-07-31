# Mission 8 Architecture

Browser (index.html + app/) → Express API → PostgreSQL  
Payment confirm: payment-order.service → PaymentGateway → Toss POST /v1/payments/confirm

## auth/ownership
JWT + CLIENT role + project.clientId

## idempotency
userId+idempotencyKey, PAID confirm retry, paymentKey unique

## callback sequence
Toss redirect → ?paymentResult=success → server confirm → project PAID → query strip

## extension
webhook reconciliation via PaymentGateway + order repo
