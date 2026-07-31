import { describe, it, expect, jest } from "@jest/globals";
import { createTossPaymentGateway } from "./toss-payment.gateway.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";

const config = {
  secretKey: "test_sk_secret",
  clientKey: "test_ck_client",
  apiBaseUrl: "https://api.tosspayments.com",
  mode: "test" as const,
  confirmTimeoutMs: 5000,
};

describe("TossPaymentGateway", () => {
  it("정확한 URL/method/body와 Basic auth로 confirm을 호출한다", async () => {
    const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          paymentKey: "pk_1",
          orderId: "order_1",
          status: "DONE",
          approvedAt: "2026-07-31T00:00:00Z",
          totalAmount: 49000,
        }),
    } as Response);

    const gw = createTossPaymentGateway(config, fetchFn);
    const result = await gw.confirm({
      paymentKey: "pk_1",
      orderId: "order_1",
      amount: 49000,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.tosspayments.com/v1/payments/confirm",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          paymentKey: "pk_1",
          orderId: "order_1",
          amount: 49000,
        }),
      }),
    );
    expect(result.totalAmount).toBe(49000);
  });

  it("secret 미설정 시 confirm을 거부한다", async () => {
    const gw = createTossPaymentGateway({ ...config, secretKey: "" });
    await expect(
      gw.confirm({ paymentKey: "pk", orderId: "o", amount: 49000 }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it("4xx 응답을 BusinessException으로 변환한다", async () => {
    const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ code: "INVALID", message: "승인 실패" }),
    } as Response);

    const gw = createTossPaymentGateway(config, fetchFn);
    await expect(
      gw.confirm({ paymentKey: "pk", orderId: "o", amount: 49000 }),
    ).rejects.toThrow("승인 실패");
  });

  it("비 JSON 응답은 TechnicalException으로 처리한다", async () => {
    const fetchFn = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "not-json",
    } as Response);

    const gw = createTossPaymentGateway(config, fetchFn);
    await expect(
      gw.confirm({ paymentKey: "pk", orderId: "o", amount: 49000 }),
    ).rejects.toThrow("해석");
  });
});
