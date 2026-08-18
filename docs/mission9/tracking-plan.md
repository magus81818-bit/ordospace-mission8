# Mission 9-1 Tracking Plan

## 공통 계약

- 명명: 이벤트와 속성은 `lower_snake_case`
- GTM Custom Event: `ordo_event`
- 실제 이벤트명: `event_name`
- 이벤트 속성 객체: `event_properties`
- 사용자 속성 객체: `user_properties`
- 사용자 ID: 실인증 백엔드 ID를 `user-{id}` 형태로만 사용
- 금지: 이메일, 비밀번호, JWT, Toss `paymentKey`, 결제 오류 원문, 자유 입력 텍스트

## 이벤트 목록

| # | 이벤트 | 발생 시점 | 핵심 속성 | 사용자 속성 | 대상 | 우선순위 | 상태 |
|---:|---|---|---|---|---|---|---|
| 1 | `screen_viewed` | 라우터가 화면/랜딩 섹션을 표시한 직후 | `route_name`, `section_name`, `is_public` | 공통 | Amplitude, GA4 | P0 | 구현 |
| 2 | `landing_cta_clicked` | 랜딩의 로그인/문의 CTA 클릭 | `cta_location`, `destination` | 공통 | 양쪽 | P0 | 구현 |
| 3 | `login_submitted` | 유효한 로그인 폼 제출 | `login_method` | 공통 | 양쪽 | P0 | 구현 |
| 4 | `login_succeeded` | mock 또는 실로그인 세션 확정 | `login_method`, `user_role`, `is_mock` | 공통 | 양쪽 | P0 | 구현 |
| 5 | `login_failed` | 인증 거절 또는 명시적 demo 실패 | `login_method`, `failure_code`, `is_mock` | 공통 | 양쪽 | P0 | 구현 |
| 6 | `project_workspace_viewed` | CLIENT가 `project` 화면 진입 | `project_id`, `payment_status` | 공통 | 양쪽 | P0 | 구현 |
| 7 | `payment_started` | 결제 버튼 처리 시작 | `project_id`, `product_code` | 공통 | 양쪽 | P0 | 구현 |
| 8 | `payment_order_created` | 서버 주문 생성 성공 | `project_id`, `product_code`, `amount`, `currency` | 공통 | Amplitude | P1 | 구현 |
| 9 | `payment_checkout_opened` | Toss 결제창 호출 직전 | 위와 동일 | 공통 | 양쪽 | P0 | 구현 |
| 10 | `payment_confirmation_started` | 성공 callback 검증 후 서버 confirm 직전 | `product_code`, `amount`, `currency` | 공통 | Amplitude | P1 | 구현 |
| 11 | `payment_completed` | 서버 confirm 성공 후 | `project_id`, `product_code`, `amount`, `currency` | 공통 | 양쪽 | P0 | 구현 |
| 12 | `payment_failed` | 사전 점검·결제창·callback·confirm 실패 | `project_id`, `product_code`, `failure_stage`, `failure_code` | 공통 | 양쪽 | P0 | 구현 |

## 공통 사용자 속성

| 속성 | 타입 | 정의 | 예시 | 갱신 |
|---|---|---|---|---|
| `user_role` | string | 현재 역할 | `client` | 이벤트마다 |
| `is_authenticated` | boolean | 실인증 여부 | `true` | 이벤트마다 |
| `environment` | string | 실행 환경 | `production` | 이벤트마다 |

Amplitude에는 UTM 값이 이벤트 속성과 자동 attribution 속성으로 들어가도록 최신 Browser SDK GTM 템플릿을 사용한다. GA4에는 UTM이 최초 페이지 수집 시 자동 캠페인 차원으로 연결된다.

## 속성 값 사전

- `login_method`: `password`, `google`, `naver`
- `user_role`: `anonymous`, `client`, `worker`, `admin`
- `failure_stage`: `precheck`, `checkout_start`, `callback_validation`, `confirmation`, `toss_callback`
- `currency`: `KRW`
- `product_code`: `PROJECT_KICKOFF`
- `environment`: `production`, `development`, `test`

## 소유와 변경 규칙

- 이벤트 추가/이름 변경은 이 문서와 `analytics.service.js`를 같은 커밋에서 수정한다.
- 기존 이벤트를 재활용해 의미를 바꾸지 않는다.
- 자유 입력값은 새 속성으로 추가하지 않는다.
- GA4·Amplitude UI에서 만든 파생 이벤트/코호트는 이름과 계산식을 QA 기록에 남긴다.

