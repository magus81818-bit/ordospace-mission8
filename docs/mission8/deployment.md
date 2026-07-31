# Deployment (ordospace-mission8 격리)

> 기존 ORDOSPACE Production 리소스는 변경하지 않습니다.

## GitHub — DONE
- https://github.com/magus81818-bit/ordospace-mission8 (public)
- tag: `mission8-submission`

## Vercel — DONE
- project: `ordospace-mission8`
- URL: https://ordospace-mission8.vercel.app

## Render — DONE
- DB: `ordospace-mission8-db` (`dpg-d9m647bl550s73daa080-a`)
- API: `ordospace-mission8-api` (`srv-d9m64mtg1s2s73faec5g`)
- URL: https://ordospace-mission8-api.onrender.com
- health: `/api/health` → `{ ok: true }`
- migrate/seed: applied

### Env (이름만)
DATABASE_URL, DATABASE_SSL, JWT_SECRET, NODE_ENV, CORS_ORIGIN, TOSS_MODE, TOSS_API_BASE_URL, TOSS_SECRET_KEY, TOSS_CLIENT_KEY

### 남은 설정
`TOSS_SECRET_KEY` / `TOSS_CLIENT_KEY` (test only) — 대시보드에서 설정