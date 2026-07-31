-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'CONFIRMING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProjectPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "paymentStatus" "ProjectPaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "kickoffPaidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentKey" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderId_key" ON "PaymentOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymentKey_key" ON "PaymentOrder"("paymentKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_userId_idempotencyKey_key" ON "PaymentOrder"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_projectId_status_idx" ON "PaymentOrder"("userId", "projectId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_projectId_status_idx" ON "PaymentOrder"("projectId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
