# 테스트 보고서

- commit: mission8/r05 (local)
- environment: Windows, Node, Chrome smoke

| 영역 | 명령 | 결과 |
|---|---|---|
| backend unit | npm test --runInBand | PASS 36 |
| backend type | npm run type | PASS |
| root build | npm run build | PASS |
| payment UI contract | static:validate-payment | PASS |
| static components | static:validate-components | PASS |
| lifecycle | static:validate-lifecycle | PASS |
| smoke | smoke | PASS 12 routes |
| sandbox E2E | Toss test keys | NOT RUN |
| deployed E2E | Vercel+Render | NOT RUN |
| DB migrate deploy | PostgreSQL | NOT RUN |

## evidence
docs/mission8/evidence/ — 배포 후 수집 예정
