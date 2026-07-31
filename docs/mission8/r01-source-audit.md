# Round 1 — 기준 소스 감사

## 과제 원문

- 경로: `C:\Users\Admin\Downloads\과제_요건_원문.md`
- 인코딩: UTF-8 확인 완료
- 읽은 일시: 2026-07-31

### 기본 요구사항 체크리스트

| ID | 요구사항 | 상태 |
|---|---|---|
| B1 | 고도화 기능 1개 선택 (유저/결제/OpenAI) | 결제 선택 예정 |
| B2 | 기존 MVP 한계 정의 | 문서화 예정 |
| B3 | MVP 최소 범위 설정 | PROJECT_KICKOFF 일회성 결제 |
| B4 | 기존 흐름 속 위치 정의 | CLIENT 프로젝트 워크스페이스 |
| B5 | 언제/입력/결과 사용자 시나리오 | payment-domain.md |
| B6 | FE·BE 실제 구현 | Round 2~3 |
| B7 | 미션 7 인프라 기반 확장 | 새 격리 Render/Vercel |
| B8 | 기존 MVP 충돌 없음 | 회귀 검증 Round 4 |
| B9 | 성공·실패 시나리오 검증 | test-strategy.md |

### 심화 요구사항 체크리스트

| ID | 요구사항 | 상태 |
|---|---|---|
| A1 | 로딩·에러·빈 상태 UX | Round 3 |
| A2 | 기술 선택 이유 | DEVELOPMENT_OVERVIEW.md |
| A3 | 확장 가능성 | architecture 문서 |
| A4 | � env·민감정보·입력 검증 | Round 2~4 |
| A5 | README/기능 문서 | Round 5 |

### 결과물 체크리스트

| ID | 요구사항 | 상태 |
|---|---|---|
| R1 | Public GitHub 저장소 | gh CLI 미설치 — Round 5 재시도 |
| R2 | Vercel 배포 URL | Round 5 |

## 기준 저장소

| 항목 | 값 |
|---|---|
| 원본 경로 | `C:\Users\Admin\Desktop\K-디지털\수업자료\코덱스\ordospace-ui-rebuild` |
| 브랜치 | `refine/calm-ops-dark-dashboard` |
| 기준 커밋 | `a0f9d79cc00e9a0c3d7c9074e8176f415a7be730` |
| 추출 방법 | `git archive` (working tree 복사 아님) |

### 추출 allowlist

`.gitignore`, `.vercelignore`, `index.html`, `app/`, `api/`, `backend/`, `react-mvp/`, `tools/`, `tests/`, `docs/redo/r10/`, `package.json`, `package-lock.json`, `tailwind.config.cjs`, `vite.config.js`, `vercel.json`, `BUILD.md`, `README.md`, `STRUCTURE.md`, ORDOSPACE 문서 3종

### 제외 목록

`.git/`, `.env*`, `.vercel/`, `node_modules/`, `evidence/`, `artifacts/`, `references/`, `dist-react/`

## 원본 저장소 보호 (전후 git status)

| 저장소 | 작업 전 | 작업 후 |
|---|---|---|
| ordospace-ui-rebuild | clean, HEAD=a0f9d79 | clean, 변경 없음 |
| ORDOSPACE_rebuild | clean, HEAD=ea1dc111 | clean, 변경 없음 |
| codeit-business-backend | M auth.service.test.ts (기존) | 동일 (Mission 8에서 미수정) |

## 강사 백엔드 판단

- `4f49c94c6e70c6a2aae78267df328e04c8d177ac` 시점 tracked source는 `git show`로 정확히 읽을 수 있음
- PENDING 주문 생성까지만 구현, Toss 승인 흐름 없음
- 현재 working tree는 연습 작업 혼합 — **사용 금지**
- `legendary-meme` / `origin/master` — **명시적 제외**

## 기준선 검증 결과

### 루트 (`ordospace-mission8`)

| 명령 | 결과 |
|---|---|
| npm ci | PASS |
| npm run build | PASS |
| npm run check:js | PASS |
| static:validate-components | PASS |
| static:validate-lifecycle | PASS |
| smoke | PASS (12 routes, runtime QA 20/20) |

### 백엔드

| 명령 | 결과 |
|---|---|
| npm ci | PASS |
| prisma generate | PASS |
| npm test --runInBand | PASS (18 tests) |
| npm run type | PASS |
| npm run build | PASS |

### Round 1에서 미실행

- PostgreSQL migration/seed — Round 2/4에서 격리 DB 사용
- Toss sandbox E2E — 테스트 키 필요

## GitHub

- `gh` CLI 미설치 — 저장소 생성/push는 Round 5에서 재시도 또는 사용자 조치 필요
