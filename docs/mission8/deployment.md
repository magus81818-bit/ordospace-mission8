# Deployment (ordospace-mission8 격리)

> 기존 ORDOSPACE Production 리소스(`ordospace-rebuild`, `ordospace-ui-rebuild`)는 변경하지 않습니다.

## GitHub — DONE

- repo: https://github.com/magus81818-bit/ordospace-mission8
- public: true
- default branch: `main`
- tag: `mission8-submission`

## Vercel — DONE (신규 프로젝트)

- project: `ordospace-mission8`
- Production URL: https://ordospace-mission8.vercel.app
- 기존 `ordospace-rebuild` / `ordospace-ui-rebuild` 미변경

## Render — Blueprint 준비 완료, 계정 로그인 필요

- Blueprint: `backend/render.yaml`
- DB name: `ordospace-mission8-db`
- API name: `ordospace-mission8-api`
- rootDir: `backend`
- build: `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- start: `npm start`
- health: `/api/health`

### 배포 후 env (값은 대시보드에서만 설정)

- `DATABASE_URL` (fromDatabase)
- `DATABASE_SSL=true`
- `JWT_SECRET` (generate)
- `TOSS_MODE=test`
- `TOSS_API_BASE_URL=https://api.tosspayments.com`
- `TOSS_SECRET_KEY` / `TOSS_CLIENT_KEY` (test only)
- `CORS_ORIGIN=https://ordospace-mission8.vercel.app`

### Blueprint 실행

Render Dashboard → New → Blueprint → repo `magus81818-bit/ordospace-mission8` → `backend/render.yaml`

API URL 확정 후 `index.html`의 `<meta name="ordo-api-base">`에 새 Render URL을 넣고 Vercel 재배포.

## 로컬 검증 (완료)

- 격리 DB: `ordospace_mission8` @ localhost
- migrate deploy PASS
- seed PASS
- `/api/health` PASS
- CLIENT 주문 생성 ₩49,000 PASS
- ADMIN 주문 거부 PASS
- amount mismatch 거부 PASS
