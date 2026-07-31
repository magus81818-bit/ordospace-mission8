# Deployment (ordospace-mission8 격리)

> 기존 ORDOSPACE Production 리소스는 변경하지 않습니다.

## GitHub
- repo: `magus81818-bit/ordospace-mission8` (public)
- status: **NOT CREATED** — gh CLI 미설치

## Render
- DB: `ordospace-mission8-db` (신규)
- API: `ordospace-mission8-api`, root `backend`
- build: `npm ci && npx prisma generate && npm run build`
- start: `npm start`
- predeploy: `npx prisma migrate deploy`

### Backend env (names only)
DATABASE_URL, DATABASE_SSL, JWT_SECRET, NODE_ENV, CORS_ORIGIN, TOSS_SECRET_KEY, TOSS_CLIENT_KEY, TOSS_API_BASE_URL, TOSS_MODE=test

## Vercel
- project: `ordospace-mission8` (신규)
- meta: `<meta name="ordo-api-base" content="https://<render-api>.onrender.com">`

## status
BLOCKED — GitHub/Vercel/Render CLI 인증 필요
