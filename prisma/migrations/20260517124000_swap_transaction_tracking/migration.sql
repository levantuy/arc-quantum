-- AlterTable
ALTER TABLE "public"."Transaction"
ADD COLUMN "txType" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "amountIn" TEXT,
ADD COLUMN "amountOut" TEXT,
ADD COLUMN "tokenIn" TEXT,
ADD COLUMN "tokenOut" TEXT,
ADD COLUMN "chainId" INTEGER,
ADD COLUMN "explorerUrl" TEXT,
ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_from_createdAt_idx" ON "public"."Transaction"("from", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_txType_createdAt_idx" ON "public"."Transaction"("txType", "createdAt" DESC);
