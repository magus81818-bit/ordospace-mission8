# ORDOSPACE Mission 8 — 결제 고도화

## 선택 기능

**토스페이먼츠 테스트 환경 일회성 결제** — CLIENT가 자신이 소유한 프로젝트에 대해 "ORDOSPACE 프로젝트 킥오프"(₩49,000 테스트) 결제를 진행하고, 서버 승인 후 프로젝트에 결제 완료 상태가 기록·표시됩니다.

## 라운드

| Round | 범위 | 상태 |
|---|---|---|
| 1 | 격리 저장소, 기준선, 결제 설계 | 진행 중 |
| 2 | 백엔드 주문/결제 도메인 | 대기 |
| 3 | CLIENT 결제 UI | 대기 |
| 4 | 통합·보안·회귀 | 대기 |
| 5 | 배포·문서·제출 | 대기 |

## 원칙

- **라이브 결제 금지** — Toss test/sandbox만 사용
- **서버 권한 가격** — `PROJECT_KICKOFF` 49,000 KRW
- **기존 ORDOSPACE 운영 리소스 변경 금지** — `ordospace-mission8` 격리 프로젝트만

## 상세 문서

- [DEVELOPMENT_OVERVIEW.md](./DEVELOPMENT_OVERVIEW.md)
- [payment-domain.md](./payment-domain.md)
- [payment-api-contract.md](./payment-api-contract.md)
- [payment-architecture.md](./payment-architecture.md)
- [test-strategy.md](./test-strategy.md)
- [round-plan.md](./round-plan.md)
