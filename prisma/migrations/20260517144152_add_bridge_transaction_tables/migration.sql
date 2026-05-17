-- CreateTable
CREATE TABLE "public"."BridgeTransaction" (
    "id" BIGSERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "fromChainId" INTEGER NOT NULL,
    "toChainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHashSource" TEXT,
    "txHashDest" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BridgeTransactionLog" (
    "id" BIGSERIAL NOT NULL,
    "bridgeTransactionId" BIGINT NOT NULL,
    "step" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeTransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BridgeTransaction_userAddress_createdAt_idx" ON "public"."BridgeTransaction"("userAddress", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BridgeTransaction_fromChainId_toChainId_createdAt_idx" ON "public"."BridgeTransaction"("fromChainId", "toChainId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BridgeTransactionLog_bridgeTransactionId_createdAt_idx" ON "public"."BridgeTransactionLog"("bridgeTransactionId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."BridgeTransactionLog" ADD CONSTRAINT "BridgeTransactionLog_bridgeTransactionId_fkey" FOREIGN KEY ("bridgeTransactionId") REFERENCES "public"."BridgeTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
