# ORDOSPACE Mission 8 — AI 상시 컨텍스트

## 1. 프로젝트 개요

ORDOSPACE Calm Ops 대시보드에 **토스페이먼츠 sandbox 일회성 결제**를 추가하는 Codeit Mission 8 격리 저장소.

## 2. MVP 한계

CLIENT 프로젝트의 킥오프/계약 결제 상태가 시스템에 없어 운영·정산이 수동이다.

## 3. 선택 기능·최소 범위

- 상품: `PROJECT_KICKOFF` / ₩49,000 / test only
- CLIENT 본인 프로젝트 1회 결제 → project `PAID`
- Out of scope: live 결제, 환불, 정기결제, webhook reconciliation

## 4. 명령

```powershell
# 루트
npm.cmd ci && npm.cmd run build && npm.cmd run check:js && npm.cmd run smoke

# 백엔드
cd backend
npm.cmd ci && npx.cmd prisma generate && npm.cmd test -- --runInBand && npm.cmd run type && npm.cmd run build
```

## 5. 제품 surface

`index.html` + `app/` — react-mvp는 회귀 자료만.

## 6. 아키텍처

inbound → application → outbound → shared. `bootstrap.ts`가 composition root. contract 필수 DI.

## 7. 핵심 도메인

User, Project, ModuleCard, **PaymentOrder** — 상세는 `docs/mission8/payment-domain.md`

## 8. 인증·역할·소유권

JWT. 결제 API는 **CLIENT** + `project.clientId === userId`.

## 9. 결제 흐름

주문 생성 → Toss SDK v2 → callback query → server confirm → PAID

## 10. 에러

`BusinessException` → 4xx, `TechnicalException` → 5xx. Toss 원문 그대로 노출 금지.

## 11. 테스트·TDD

해피패스 test first → 구현 → critical 2건(amount mismatch, 타인 confirm).

## 12. 환경변수

`TOSS_SECRET_KEY` server only. `TOSS_CLIENT_KEY` via `/api/payments/config`. `.env` 커밋 금지.

## 13. 코드 규칙

한글 문서. 함수 내 논리 단위 한 줄 주석. 서비스는 contract 주입.

## 14. 변경 금지

ordospace-ui-rebuild, ORDOSPACE_rebuild, 강사 working tree, **legendary-meme** 제외.

## 15. Round·제출

Round 1~5 — `docs/mission8/round-plan.md`. 제출: GitHub + Vercel (ordospace-mission8 격리).

상세: `docs/mission8/DEVELOPMENT_OVERVIEW.md`, `backend/CLAUDE.md`
