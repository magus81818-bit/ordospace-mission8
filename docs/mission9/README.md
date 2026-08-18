# ORDOSPACE Mission 9-1 준비 패키지

## 목적

Mission 8 완성본을 기준으로 유입과 핵심 행동을 측정할 수 있는 최소 데이터 수집 체계를 준비한다. 이 폴더는 과제 원문을 실행 가능한 산출물, 코드 계약, 외부 설정 절차, QA 및 증빙 구조로 분해한 작업 기준점이다.

## 기준선과 보호 범위

- 저장소: `magus81818-bit/ordospace-mission8`
- 기준 브랜치/커밋: `mission8/submission-pr` / `dec0d4f`
- Mission 8 태그: `mission8-submission`
- Mission 9 준비 브랜치: `mission9/preparation`
- 서비스: `https://ordospace-mission8.vercel.app`
- API: `https://ordospace-mission8-api.onrender.com`
- Mission 8 태그와 원격 배포는 준비 단계에서 변경하지 않는다.
- 토스 키, JWT, DB URL, 계정 비밀번호는 문서·코드·스크린샷·분석 이벤트에 저장하지 않는다.

## 준비된 파일

| 파일 | 용도 |
|---|---|
| `metrics.md` | 핵심 지표, 퍼널, 계산식, 해석 기준 |
| `tracking-plan.md` | 이벤트·속성·발생 조건·담당·QA 기준 |
| `gtm-amplitude-ga4-setup.md` | GTM, Amplitude, GA4 연결 절차 |
| `log-qa-checklist.md` | 이벤트별 정상/실패/중복/PII QA |
| `utm-campaign-plan.md` | 3개 채널 UTM 링크와 홍보 문안 |
| `requirements-traceability.md` | 과제 요건과 산출물/증거 대응표 |
| `source-inventory.md` | 이번 준비에 사용한 로컬 근거 목록 |
| `evidence/README.md` | 최종 압축 폴더 구조와 캡처 규칙 |
| `app/services/analytics.service.js` | 허용 이벤트만 `dataLayer`로 내보내는 계측 계층 |
| `tools/validate-analytics-contract.cjs` | 이벤트 수, UTM, PII 차단, 미설정 GTM 무로딩 검사 |

## 현재 상태

| 항목 | 상태 | 설명 |
|---|---|---|
| 지표 설계 | READY | 7개 지표와 핵심 퍼널 정의 |
| 로그 설계 | READY | 12개 이벤트와 속성 계약 정의 |
| 앱 계측 코드 | READY FOR GTM | ID가 없어도 로컬 `dataLayer` QA 가능 |
| GTM 컨테이너 | USER INPUT REQUIRED | `GTM-...` 필요 |
| Amplitude 프로젝트 | USER INPUT REQUIRED | Project API Key와 프로젝트 리전 필요 |
| GA4 속성/웹 스트림 | USER INPUT REQUIRED | Measurement ID `G-...` 필요 |
| 로그 QA | PARTIAL | 로컬 계약 QA 가능, 외부 DebugView/Event Stream은 계정 연결 후 |
| UTM 링크/홍보 문안 | READY | 3개 채널 링크와 소재 구분값 준비 |
| 실제 홍보 게시 | USER ACTION REQUIRED | 외부 게시·전송은 사용자 확인 후 실행 |
| 최종 증빙 ZIP | BLOCKED | 실제 GTM/Amplitude/GA4 화면과 게시 증빙 필요 |

## 실행 순서

1. 사용자에게 GTM 컨테이너 ID, Amplitude Project API Key/리전, GA4 Measurement ID를 받는다.
2. `index.html`의 `ordo-gtm-container-id`에 공개 식별자인 GTM ID만 입력한다.
3. `gtm-amplitude-ga4-setup.md`에 따라 GTM 변수·트리거·태그를 만들고 Preview에서 검사한다.
4. `npm.cmd run test:mission9-prep`으로 로컬 계약과 기존 정적 앱 회귀를 확인한다.
5. Preview/Production 배포 후 `log-qa-checklist.md`를 따라 Amplitude Event Stream과 GA4 DebugView를 확인한다.
6. `utm-campaign-plan.md`의 링크로 세 채널에 홍보하고 게시 증빙을 저장한다.
7. `evidence/README.md` 구조로 자료를 모아 제출 ZIP을 만든다.

## 완료 정의

- Amplitude와 GA4 양쪽에서 동일 테스트 세션의 핵심 퍼널 이벤트가 확인된다.
- UTM 3개 채널이 GA4 획득 보고서와 Amplitude 이벤트 속성에서 구분된다.
- 테스트 이벤트와 내부 트래픽이 실제 성과 분석에서 구분된다.
- Tracking Plan, 코드, GTM 설정, 두 분석 도구 수집 화면, 홍보 게시 증빙이 하나의 제출 폴더에 있다.

