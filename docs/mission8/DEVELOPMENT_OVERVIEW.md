# ORDOSPACE Mission 8 — 개발개요서

## 과제 요건 요약

Mission 6·7 MVP 위에 고도화 기능 1개를 선택·구현·통합·검증·문서화하고 Public GitHub + Vercel URL을 제출한다.

## 선택: 결제 기능

**ORDOSPACE 프로젝트 킥오프** — CLIENT가 자신의 프로젝트에 대해 Toss test 결제(₩49,000) 후 서버 승인으로 `PAID` 상태 기록.

### 선택 이유

프로젝트 계약/킥오프가 MVP에 없어 결제·정산 흐름을 검증할 수 없음. Toss sandbox는 실금 없이 PG 연동 패턴 학습에 적합.

## 사용자 시나리오

| 단계 | 내용 |
|---|---|
| 언제 | CLIENT가 본인 프로젝트 워크스페이스에서 킥오프 결제 필요 시 |
| 입력 | projectId (선택), Toss 결제창 인증 |
| 처리 | 서버 주문 → SDK → callback → confirm |
| 결과 | project paymentStatus=PAID, kickoffPaidAt 기록 |

## In Scope / Out of Scope

**In**: sandbox 일회성, server price, ownership, idempotency, static UI, fake tests  
**Out**: live key, 환불, 정기결제, webhook auto-reconciliation

## 기술 결정표

| 결정 | 대안 | 선택 이유 | MVP 장점 | MVP 단점 | 완화 |
|---|---|---|---|---|---|
| Toss SDK v2 통합결제창 | 결제위젯, 자체 PG | 정적 UI 유지, 공식 문서 | 빠른 연동 | UI 커스터마이즈 제한 | Calm Ops 스타일 wrapper |
| 일회성 결제 | 구독 | 과제 범위·단순성 | 구현·테스트 용이 | 반복 결제 없음 | catalog 확장점 |
| server-authoritative catalog | 클라이언트 가격 | 변조 방지 | 보안 | 상품 추가 시 배포 | domain catalog |
| PaymentGateway adapter | service 직접 fetch | 테스트·교체 | fake 주입 | 파일 증가 | thin adapter |
| root static UI | React 전환 | 기존 12 route 보존 | 회귀 최소 | SPA 아님 | query callback |
| 격리 infra | 기존 Vercel 수정 | 운영 보호 | 안전 배포 | env 중복 | ordospace-mission8 |

## 아키텍처

Browser(static app) → Express API → Prisma/PostgreSQL  
confirm path: service → PaymentGateway → Toss API

## 디렉터리

- `app/` — CLIENT 결제 UI (Round 3)
- `backend/src/application/services/payment-order.service.ts`
- `docs/mission8/` — 설계·보고

## ERD 초안

User 1—N PaymentOrder N—1 Project  
Project: paymentStatus, kickoffPaidAt

## API 초안

`GET /api/payments/config`, `POST/GET /api/payment-orders`, `POST .../confirm`, `POST .../fail` — `payment-api-contract.md`

## UI 상태

UNPAID, PENDING, CONFIRMING, PAID, FAILED, CANCELED, config missing, empty project

## 보안

price tampering, IDOR, duplicate confirm, paymentKey reuse, secret/CORS/logging — `test-strategy.md`

## Round 종료 조건

| Round | 조건 |
|---|---|
| 1 | 격리 repo, baseline PASS, 설계 문서 |
| 2 | backend payment API + unit tests |
| 3 | static checkout UI + validators |
| 4 | security matrix + regression |
| 5 | deploy docs + evidence |

## 배포 해석

미션 7 인프라(Express/Prisma/Vercel/Render)를 **계승**하되 기존 ORDOSPACE Production 보호를 위해 **새 격리** Render DB/API + Vercel `ordospace-mission8`.

## 요구사항 추적 (발췌)

| ID | 과제 원문 | 구현 경로 | 테스트 | 증거 | 상태 |
|---|---|---|---|---|---|
| REQ-01 | 결제 1개 선택 | payment-domain.md | — | README | 설계 |
| REQ-02 | FE·BE 연결 | app/ + backend/ | smoke | Round 3 | 대기 |
| REQ-03 | Public GitHub | magus81818-bit/ordospace-mission8 | — | URL | BLOCKED(gh) |
| REQ-04 | Vercel URL | vercel ordospace-mission8 | E2E | Round 5 | 대기 |

## 확장

catalog 다중 상품, webhook reconciliation, ADMIN 결제 조회 — adapter·repo contract로 확장 가능.

## 위험·외부 의존

- Toss test keys — Render 설정·sandbox·PAID E2E 완료 (실청구 없음)
- gh CLI / Render / Vercel auth
- PostgreSQL 격리 DB (Round 4)

## 가정

- 기준 커밋 `a0f9d79` baseline이 Mission 8 출발점으로 충분함 (검증 PASS)
