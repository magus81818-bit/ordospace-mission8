export const PROJECT_KICKOFF = {
  code: "PROJECT_KICKOFF",
  orderName: "ORDOSPACE 프로젝트 킥오프",
  amount: 49000,
  currency: "KRW",
} as const;

export type PaymentProductCode = typeof PROJECT_KICKOFF.code;

// 서버 권한 상품 카탈로그
export const PAYMENT_PRODUCT_CATALOG = {
  PROJECT_KICKOFF,
} as const;

export const resolveProduct = (code: PaymentProductCode = "PROJECT_KICKOFF") => {
  const product = PAYMENT_PRODUCT_CATALOG[code];
  if (!product) throw new Error(`Unknown product code: ${code}`);
  return product;
};
