# UTM 캠페인 및 간편 3채널 홍보 준비

## 규칙

- Base URL: `https://ordospace-mission8.vercel.app/`
- Campaign: `mission9_launch_202608`
- 값은 소문자 영문과 `_`만 사용한다.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`를 항상 함께 쓴다.
- 게시 후 URL을 수정하지 말고, 변경 시 새 `utm_content`를 발급한다.

## 채널별 링크

### 카카오톡

`https://ordospace-mission8.vercel.app/?utm_source=kakao&utm_medium=messenger&utm_campaign=mission9_launch_202608&utm_content=client_kickoff_text_v1#landing`

### 이메일

`https://ordospace-mission8.vercel.app/?utm_source=email&utm_medium=email&utm_campaign=mission9_launch_202608&utm_content=self_test_mail_v1#landing`

### GitHub

`https://ordospace-mission8.vercel.app/?utm_source=github&utm_medium=repository&utm_campaign=mission9_launch_202608&utm_content=readme_text_v1#landing`

## 홍보 문안 초안

### 카카오톡

프로젝트 진행 상황, 승인 대기, 작업 이력을 한곳에서 확인하는 ORDOSPACE 데모를 공개했습니다. CLIENT 프로젝트의 킥오프 테스트 결제 흐름까지 직접 살펴볼 수 있어요. 사용해 보고 가장 헷갈린 지점을 알려주세요.

### 이메일

제목: ORDOSPACE Mission 9 유입 테스트

ORDOSPACE MVP의 역할별 프로젝트 상태와 킥오프 결제 흐름을 확인해 보세요.

### GitHub

ORDOSPACE Mission 9 데이터 수집 테스트용 MVP 링크입니다.

## 소재 성과 구분

| 채널 | 소재 | `utm_content` | 형식 | 목표 |
|---|---|---|---|---|
| 카카오톡 | 짧은 설명형 | `client_kickoff_text_v1` | 텍스트+링크 | CTA 클릭 |
| 이메일 | 본인 테스트 메일 | `self_test_mail_v1` | 제목+본문+링크 | 체류·로그인 |
| GitHub | README 텍스트 링크 | `readme_text_v1` | 텍스트+링크 | 신규 유입 |

## 게시 전/후 체크

- [ ] 각 링크가 200 응답이며 UTM query가 유지됨
- [ ] GA4 Realtime에서 source/medium 확인
- [ ] Amplitude 이벤트 속성에서 UTM 확인
- [ ] 게시 일시, 공개 범위, 게시 URL 또는 화면 캡처 기록
- [ ] 개인정보나 테스트 계정 비밀번호가 소재에 노출되지 않음
- [ ] 동일인이 반복 클릭한 QA 데이터는 성과에서 제외

간단한 증빙을 위해 이메일은 본인에게 보내고, 카카오톡은 `나에게 보내기`를 사용한다. GitHub는 저장소 README 또는 공개 게시물에 링크를 1회 넣는다. 실제 전송·게시 전에는 계정과 공개 범위를 확인한다.
