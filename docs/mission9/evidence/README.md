# Mission 9-1 제출 증빙 폴더

최종 제출 전 아래 구조를 채운 뒤 하나의 ZIP으로 압축한다. 캡처 파일명은 `YYYYMMDD-HHMM_도구_내용.png` 형식을 권장한다.

```text
ORDOSPACE_MISSION9_1_EVIDENCE/
  01_documents/
    metrics.pdf-or-md
    tracking-plan.xlsx
  02_code/
    analytics-service.png
    router-auth-payment-hooks.png
  03_gtm/
    container-overview.png
    variables.png
    custom-event-trigger.png
    ga4-event-tag.png
    amplitude-init-tag.png
    amplitude-event-tag.png
    preview-ordo-event.png
    published-version.png
  04_amplitude/
    event-stream.png
    event-properties.png
    funnel.png
    sample.csv
  05_ga4/
    debugview.png
    realtime.png
    traffic-acquisition.png
    sample.csv
  06_utm-promotion/
    kakao-post.png
    email-self-send.png
    github-link-post.png
    published-links.md
  QA_RECORD.md
```

## 캡처 규칙

- 프로젝트/속성/컨테이너 이름, 이벤트 이름, 시간 범위가 보이게 한다.
- API Key, 비밀번호, 토큰, 쿠키, Toss 키, DB URL은 가린다.
- 성공 화면만 모으지 말고 테스트 일시와 시나리오를 `QA_RECORD.md`에 연결한다.
- CSV는 최소 5개 P0 이벤트와 UTM 속성, 환경 구분을 포함하되 이메일 등 개인정보가 없어야 한다.
- 실제 홍보 게시물은 게시 날짜, 채널, 링크 또는 공개 범위를 확인할 수 있어야 한다.
