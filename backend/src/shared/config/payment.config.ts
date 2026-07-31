export type PaymentConfig = {
  secretKey: string;
  clientKey: string;
  apiBaseUrl: string;
  mode: "test" | "live";
  confirmTimeoutMs: number;
};

// 환경변수에서 결제 설정을 읽고 test mode를 강제
export const readPaymentConfig = (): PaymentConfig => {
  const mode = (process.env.TOSS_MODE ?? "test") as "test" | "live";
  if (mode !== "test") {
    throw new Error("Mission 8은 TOSS_MODE=test 만 허용합니다");
  }
  return {
    secretKey: process.env.TOSS_SECRET_KEY ?? "",
    clientKey: process.env.TOSS_CLIENT_KEY ?? "",
    apiBaseUrl: process.env.TOSS_API_BASE_URL ?? "https://api.tosspayments.com",
    mode: "test",
    confirmTimeoutMs: Number(process.env.TOSS_CONFIRM_TIMEOUT_MS ?? 15_000),
  };
};

export const getPublicPaymentConfig = () => {
  const config = readPaymentConfig();
  const configured = Boolean(config.clientKey);
  return {
    configured,
    clientKey: configured ? config.clientKey : "",
    mode: config.mode,
    productCode: "PROJECT_KICKOFF" as const,
  };
};
