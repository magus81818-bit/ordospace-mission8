# 5분 시연 시나리오

1. CLIENT 로그인 (client@ordo.com)
2. 프로젝트 화면 → 킥오프 결제 패널
3. 상품/₩49,000 확인, 테스트 배지
4. 결제하기 → Toss test 창 (키 필요)
5. sandbox 성공 → server confirm → PAID
6. 새로고침 후 완료 유지
7. 취소/실패 UX (fail callback)
8. 보안: 서버 가격, 타인 주문 거부 설명

Steps 4–5 require TOSS test keys in Render env.
