# 테스트 보고서

- environment: Windows, Node, Playwright Chromium smoke
- API: https://ordospace-mission8-api.onrender.com
- UI: https://ordospace-mission8.vercel.app

| 영역 | 명령/방법 | 결과 |
|---|---|---|
| backend unit | npm test --runInBand | PASS 36 |
| backend type | npm run type | PASS |
| root build | npm run build | PASS |
| payment UI contract | static:validate-payment | PASS |
| deployed health | GET /api/health | PASS `{ ok: true }` |
| payments config | GET /api/payments/config | PASS `configured: true`, `mode: test` |
| CLIENT order | POST /api/payment-orders | PASS ₩49,000 PENDING |
| Toss gateway auth | confirm invalid paymentKey | PASS (Toss `NOT_FOUND_PAYMENT_SESSION`) |
| UI kickoff panel | Playwright `#project` | PASS 버튼 활성 |
| Toss sandbox window | Playwright pay click | PASS 결제창·₩49,000·테스트 배너 |
| full PAID E2E | 카카오페이→successUrl→confirm | PASS (사용자 확인, UI 결제 완료) |

## evidence
- `docs/mission8/evidence/sandbox-success.png`
- `docs/mission8/evidence/ui-payment-panel.png`
- `docs/mission8/evidence/sandbox-window.png`
- `docs/mission8/evidence/ui-smoke.json`
- `docs/mission8/evidence/ui-toss-open.json`
