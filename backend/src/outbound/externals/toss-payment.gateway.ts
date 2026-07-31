import {
  ConfirmPaymentInput,
  ConfirmPaymentResult,
  IPaymentGateway,
} from "../../application/contracts/payment-gateway.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { TechnicalException } from "../../shared/exceptions/technical.exception.js";
import { PaymentConfig } from "../../shared/config/payment.config.js";

type FetchFn = typeof fetch;

const maskPaymentKey = (key: string) =>
  key.length <= 4 ? "****" : `****${key.slice(-4)}`;

// Toss 4xx 응답을 내부 BusinessException으로 변환
const mapTossError = (status: number, body: unknown): BusinessException => {
  const payload = body as { code?: string; message?: string };
  if (status >= 400 && status < 500) {
    return new BusinessException(
      payload.message ?? "결제 승인에 실패했습니다",
    );
  }
  return new BusinessException("결제 서비스에 일시적인 문제가 있습니다");
};

export const createTossPaymentGateway = (
  config: PaymentConfig,
  fetchFn: FetchFn = fetch,
): IPaymentGateway => {
  const confirm = async (
    input: ConfirmPaymentInput,
  ): Promise<ConfirmPaymentResult> => {
    if (!config.secretKey) {
      throw new BusinessException("결제 서버 설정이 완료되지 않았습니다");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.confirmTimeoutMs);
    const auth = Buffer.from(`${config.secretKey}:`).toString("base64");

    try {
      const response = await fetchFn(
        `${config.apiBaseUrl}/v1/payments/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey: input.paymentKey,
            orderId: input.orderId,
            amount: input.amount,
          }),
          signal: controller.signal,
        },
      );

      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        throw new TechnicalException(
          "결제 게이트웨이 응답을 해석할 수 없습니다",
          "UNAUTHORIZED" as never,
        );
      }

      if (!response.ok) {
        throw mapTossError(response.status, body);
      }

      const data = body as Record<string, unknown>;
      return {
        paymentKey: String(data.paymentKey ?? input.paymentKey),
        orderId: String(data.orderId ?? input.orderId),
        status: String(data.status ?? "DONE"),
        approvedAt: data.approvedAt ? String(data.approvedAt) : null,
        method: data.method ? String(data.method) : null,
        totalAmount: Number(data.totalAmount ?? input.amount),
      };
    } catch (err) {
      if (err instanceof BusinessException) throw err;
      if (err instanceof TechnicalException) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new TechnicalException(
          "결제 승인 요청 시간이 초과되었습니다",
          "UNAUTHORIZED" as never,
          err,
        );
      }
      throw new TechnicalException(
        "결제 승인 중 네트워크 오류가 발생했습니다",
        "UNAUTHORIZED" as never,
        err,
      );
    } finally {
      clearTimeout(timer);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[toss] confirm", {
          orderId: input.orderId,
          paymentKey: maskPaymentKey(input.paymentKey),
          amount: input.amount,
        });
      }
    }
  };

  return { confirm };
};
