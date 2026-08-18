# UTM 캠페인 및 공개 3채널 홍보 준비

## 규칙

- Base URL: `https://ordospace-mission8.vercel.app/`
- Campaign: `mission9_launch_202608`
- 값은 소문자 영문과 `_`만 사용한다.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`를 항상 함께 쓴다.
- 게시 후 URL을 수정하지 말고, 변경 시 새 `utm_content`를 발급한다.

## 채널별 링크

### 네이버 블로그

`https://ordospace-mission8.vercel.app/?utm_source=naver_blog&utm_medium=owned_content&utm_campaign=mission9_launch_202608&utm_content=workflow_article_v1#landing`

### 인스타그램

`https://ordospace-mission8.vercel.app/?utm_source=instagram&utm_medium=social&utm_campaign=mission9_launch_202608&utm_content=calm_ops_card_v1#landing`

### GitHub

`https://ordospace-mission8.vercel.app/?utm_source=github&utm_medium=repository&utm_campaign=mission9_launch_202608&utm_content=readme_text_v1#landing`

## 홍보 문안 초안

### 네이버 블로그

여러 역할이 함께 일하는 프로젝트에서 상태와 승인 흐름이 흩어지는 문제를 줄이기 위해 만든 ORDOSPACE MVP를 소개합니다. 랜딩부터 CLIENT 프로젝트 워크스페이스, Toss sandbox 킥오프 결제까지 구현 과정을 확인할 수 있습니다.

### 인스타그램

프로젝트의 다음 행동을 한눈에. ORDOSPACE MVP에서 역할별 워크스페이스와 CLIENT 킥오프 테스트 결제 흐름을 확인해 보세요.

홍보 이미지: `evidence/creative/ordospace-instagram-post.png`

### GitHub

ORDOSPACE Mission 9 데이터 수집 테스트용 MVP 링크입니다.

## 소재 성과 구분

| 채널 | 소재 | `utm_content` | 형식 | 목표 |
|---|---|---|---|---|
| 네이버 블로그 | 업무 흐름 소개 | `workflow_article_v1` | 본문+이미지+링크 | 체류·로그인 |
| 인스타그램 | Calm Ops 정사각형 카드 | `calm_ops_card_v1` | 이미지+캡션+프로필/스토리 링크 | 신규 유입 |
| GitHub | README 텍스트 링크 | `readme_text_v1` | 텍스트+링크 | 신규 유입 |

## 게시 전/후 체크

- [ ] 각 링크가 200 응답이며 UTM query가 유지됨
- [ ] GA4 Realtime에서 source/medium 확인
- [ ] Amplitude 이벤트 속성에서 UTM 확인
- [ ] 게시 일시, 공개 범위, 게시 URL 또는 화면 캡처 기록
- [ ] 개인정보나 테스트 계정 비밀번호가 소재에 노출되지 않음
- [ ] 동일인이 반복 클릭한 QA 데이터는 성과에서 제외

세 채널 모두 외부 사용자가 접근할 수 있는 공개 게시물이어야 한다. 실제 게시 전에는 계정과 공개 범위를 확인한다.
