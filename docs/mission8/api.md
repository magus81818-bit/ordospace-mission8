# API (Mission 8 Payment)

상세: [payment-api-contract.md](./payment-api-contract.md)

| Method | Path | Auth | Role |
|---|---|---|---|
| GET | /api/payments/config | No | — |
| POST | /api/payment-orders | Yes | CLIENT |
| GET | /api/payment-orders/:orderId | Yes | CLIENT owner |
| POST | /api/payment-orders/:orderId/confirm | Yes | CLIENT owner |
| POST | /api/payment-orders/:orderId/fail | Yes | CLIENT owner |

Server price: PROJECT_KICKOFF ₩49,000
