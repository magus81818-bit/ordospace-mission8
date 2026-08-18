# 로그 QA 체크리스트

## QA 원칙

- 새 브라우저 프로필 또는 시크릿 창에서 한 시나리오씩 수행한다.
- GTM Preview, 브라우저 Network/Data Layer, Amplitude Event Stream, GA4 DebugView를 같은 시각대에 확인한다.
- 정상 이벤트뿐 아니라 중복, 누락, 타입, 금지 필드, 실패 분기를 확인한다.
- 테스트 이벤트에는 `environment=test` 또는 명확한 QA 필터를 적용한다.

## 사전 점검

- [ ] `npm.cmd run test:mission9-prep` PASS
- [ ] GTM ID 형식이 `GTM-...`
- [ ] Amplitude 프로젝트/리전이 맞음
- [ ] GA4 Measurement ID가 맞음
- [ ] GTM Preview가 현재 배포 URL에 연결됨
- [ ] 콘솔 오류 없음

## 시나리오 A: UTM 유입 -> 로그인

1. 카카오 UTM 링크를 새 창에서 연다.
2. 랜딩 CTA를 클릭한다.
3. CLIENT 계정으로 로그인한다.

예상 순서:

1. `screen_viewed(route_name=landing, utm_source=kakao)`
2. `landing_cta_clicked(destination=auth)`
3. `screen_viewed(route_name=auth)`
4. `login_submitted(login_method=password)`
5. `login_succeeded(user_role=client, is_mock=false)`

## 시나리오 B: 결제 성공

1. CLIENT 프로젝트 화면에 진입한다.
2. 킥오프 결제를 시작한다.
3. Toss sandbox 성공 흐름을 완료한다.

예상 순서:

1. `project_workspace_viewed`
2. `payment_started`
3. `payment_order_created(amount=49000, currency=KRW)`
4. `payment_checkout_opened`
5. `payment_confirmation_started`
6. `payment_completed`

## 시나리오 C: 결제 취소/실패

- Toss 창 취소 -> `payment_failed(failure_stage=toss_callback, failure_code=PAY_PROCESS_CANCELED)`
- 백엔드 미연결 -> `payment_failed(failure_stage=precheck, failure_code=backend_unavailable)`
- 잘못된 callback -> `payment_failed(failure_stage=callback_validation, failure_code=invalid_callback)`

## 이벤트별 공통 판정

| 항목 | PASS 기준 |
|---|---|
| 횟수 | 사용자 행동 1회당 의도한 이벤트 1회 |
| 순서 | Tracking Plan의 퍼널 순서와 일치 |
| 이름 | `lower_snake_case`, 오탈자 없음 |
| 타입 | amount/project_id 숫자, boolean은 boolean |
| 사용자 | 실로그인 후 `analytics_user_id=user-{id}`, 이메일 없음 |
| UTM | source/medium/campaign/content가 채널 링크와 일치 |
| 보안 | password, JWT, paymentKey, email, 오류 원문 없음 |
| 양쪽 도착 | P0 이벤트가 Amplitude와 GA4 모두 확인됨 |
| 환경 | test/development/production 구분 가능 |

## QA 기록표

| 일시 KST | 빌드/커밋 | 시나리오 | GTM | Amplitude | GA4 | 결과 | 증빙 파일 |
|---|---|---|---|---|---|---|---|
| 입력 | 입력 | A/B/C | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | 파일명 |

