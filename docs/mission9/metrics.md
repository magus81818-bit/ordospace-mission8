# Mission 9-1 지표 설계

## 분석 목표

ORDOSPACE가 홍보 채널에서 방문자를 유입시키고, CLIENT가 프로젝트 워크스페이스에 진입해 킥오프 결제를 완료하는 과정에서 어디가 막히는지 찾는다.

## 핵심 지표

### North Star: 킥오프 결제 완료율

`payment_completed 고유 사용자 수 / project_workspace_viewed 고유 CLIENT 수 × 100`

- 의미: 제품의 핵심 유료 행동까지 도달한 CLIENT 비율
- 기본 분석 단위: 사용자, 7일
- 보조 분해: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
- 주의: 테스트 결제만 포함하며 실매출로 해석하지 않는다.

## 주요 지표 7개

| ID | 지표 | 계산 | 필요한 이벤트 | 질문 |
|---|---|---|---|---|
| M01 | UTM 유입 사용자 수 | UTM이 있는 `screen_viewed` 고유 사용자 | `screen_viewed` | 어느 채널이 방문을 만드는가 |
| M02 | 랜딩 CTA 클릭률 | `landing_cta_clicked` 사용자 / 랜딩 `screen_viewed` 사용자 | 두 이벤트 | 랜딩이 다음 행동을 유도하는가 |
| M03 | 로그인 성공률 | `login_succeeded` / `login_submitted` | 두 이벤트 | 인증에서 얼마나 이탈하는가 |
| M04 | 프로젝트 활성화율 | `project_workspace_viewed` CLIENT / `login_succeeded` CLIENT | 두 이벤트 | 로그인 후 핵심 화면에 도달하는가 |
| M05 | 결제 시작률 | `payment_started` 사용자 / `project_workspace_viewed` 사용자 | 두 이벤트 | 결제 가치 제안이 행동을 만드는가 |
| M06 | 결제 완료율 | `payment_completed` 사용자 / `payment_started` 사용자 | 두 이벤트 | 결제 흐름이 끝까지 완료되는가 |
| M07 | 결제 실패율 | `payment_failed` 횟수 / `payment_started` 횟수 | 두 이벤트 | 어느 단계에서 기술·사용자 실패가 발생하는가 |

## 핵심 퍼널

1. 유입: `screen_viewed(route_name=landing)`
2. 관심: `landing_cta_clicked`
3. 인증 시도: `login_submitted`
4. 인증 성공: `login_succeeded`
5. 핵심 화면 진입: `project_workspace_viewed`
6. 결제 의도: `payment_started`
7. 결제창 진입: `payment_checkout_opened`
8. 가치 달성: `payment_completed`

분석 시 동일 사용자 기준, 7일 전환 창을 기본으로 사용한다. 단계별 전환율과 이전 단계 대비 이탈률을 함께 본다.

## 세그먼트

- 유입: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
- 역할: `user_role`
- 인증 여부: `is_authenticated`
- 환경: `environment` (`production`, `development`, `test`)
- 결제 실패: `failure_stage`, `failure_code`

## 해석 가드레일

- `development`와 `test` 이벤트는 실제 성과에서 제외한다.
- `is_mock=true` 로그인은 실제 가입/로그인 성과로 집계하지 않는다.
- 결제액은 고정 상품 검증용이며 매출 KPI가 아니다.
- 방문자 수가 적을 때는 비율만 보지 말고 분자·분모를 함께 기록한다.
- 동일 테스트를 반복한 QA 세션은 별도 사용자/필터로 제외한다.

