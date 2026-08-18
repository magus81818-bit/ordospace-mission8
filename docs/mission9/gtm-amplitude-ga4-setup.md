# GTM - Amplitude - GA4 설정 가이드

## 필요한 사용자 입력

| 값 | 형식 | 저장 위치 | 비밀 여부 |
|---|---|---|---|
| GTM Container ID | `GTM-XXXXXXX` | `index.html` meta `ordo-gtm-container-id` | 공개 식별자 |
| Amplitude Project API Key | 프로젝트별 문자열 | GTM의 Amplitude 설정 변수/태그 | 공개 수집 키, 그래도 문서·스크린샷 노출 최소화 |
| Amplitude region | US 또는 EU | GTM Amplitude 설정 | 설정값 |
| GA4 Measurement ID | `G-XXXXXXXXXX` | GTM Google tag | 공개 식별자 |

관리자 비밀번호, Toss 키, JWT, DB URL은 이 과정에 필요하지 않다.

## 1. GTM 컨테이너

1. Web 컨테이너를 생성하고 환경 이름을 `ORDOSPACE Mission 9`로 명확히 한다.
2. Container ID를 `index.html`의 빈 meta 값에 넣는다.
3. GTM Preview에서 `gtm.js` 로드와 `ordo_event` 수신을 확인한다.
4. 앱은 `dataLayer.push({ event: 'ordo_event', event_name, event_properties, user_properties })` 계약을 사용한다.

### Data Layer Variables

- `DLV - event_name` -> `event_name`
- `DLV - event_properties` -> `event_properties`
- `DLV - user_properties` -> `user_properties`
- `DLV - analytics_user_id` -> `analytics_user_id`

### Trigger

- 이름: `CE - ordo_event`
- 종류: Custom Event
- Event name: `ordo_event`
- 조건: All Custom Events

## 2. Amplitude

1. Mission 9 전용 프로젝트를 만들고 올바른 US/EU 리전을 확인한다.
2. GTM Community Template Gallery의 최신 `Amplitude Analytics Browser SDK` 템플릿을 사용한다.
3. 초기화 태그에 Project API Key, 리전, attribution을 설정하고 All Pages에서 1회 실행한다.
4. 이벤트 태그는 `CE - ordo_event`에서 실행하고 Event Type을 `{{DLV - event_name}}`으로 매핑한다.
5. 이벤트 속성은 `{{DLV - event_properties}}`, 사용자 속성은 `{{DLV - user_properties}}`, User ID는 값이 있을 때만 `{{DLV - analytics_user_id}}`를 사용한다.
6. 자동 수집이 켜져 있다면 이번 Tracking Plan의 수동 이벤트와 중복되는 Page View/클릭 이벤트를 분석에서 분리한다.
7. Debug 로그는 QA 기간에만 사용하고 게시 전 경고 수준 이하로 되돌린다.

## 3. GA4

1. Mission 9용 GA4 속성과 Web data stream을 생성한다.
2. GTM에서 Google tag를 만들고 Measurement ID를 입력해 Initialization 또는 All Pages에서 실행한다.
3. GA4 Event tag를 만들고 Event Name에 `{{DLV - event_name}}`을 사용한다.
4. Tracking Plan에서 분석할 속성을 Event Parameters로 매핑한다. 최소: `route_name`, `section_name`, `cta_location`, `login_method`, `user_role`, `is_mock`, `product_code`, `amount`, `currency`, `failure_stage`, `failure_code`, `environment`.
5. Trigger는 `CE - ordo_event`를 사용한다.
6. DebugView에서 한 테스트 세션의 순서를 확인한다.
7. 내부/QA 트래픽 제외 규칙은 데이터 확인 후 적용하고, 적용 전후를 기록한다.

## 4. SPA와 UTM 주의

- 이 앱은 hash router이므로 브라우저 전체 새로고침 없이 화면이 바뀐다.
- 최초 유입 UTM은 URL query에 있어야 한다. 예: `/?utm_source=...#landing`.
- `screen_viewed`가 hash 화면 전환을 명시적으로 기록하므로 GA4 자동 page_view만으로 퍼널을 만들지 않는다.
- 결제 callback query에는 결제 정보가 있으므로 전체 URL이나 query string을 이벤트 속성으로 보내지 않는다.

## 5. 게시 전 캡처

- GTM: Container Overview, Variables, Custom Event Trigger, GA4 Event tag, Amplitude init/event tag, Preview event detail, Published version
- Amplitude: Event Stream에서 P0 이벤트와 속성, User Lookup 또는 세션 흐름, Funnel 차트
- GA4: DebugView 이벤트 순서, Realtime, Traffic acquisition의 UTM 구분

공식 참고:

- https://developers.google.com/tag-platform/devguides/datalayer
- https://developers.google.com/analytics/devguides/collection/ga4/views
- https://support.google.com/analytics/answer/10917952
- https://amplitude.com/docs/sdks/analytics/browser/browser-sdk-2
- https://amplitude.com/docs/sdks/analytics/browser/browser-unified-sdk

