-- CreateTable
CREATE TABLE "arc_quantum"."User" (
    "id" BIGSERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."Transaction" (
    "id" BIGSERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."Token" (
    "id" BIGSERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."BridgeConfig" (
    "id" BIGSERIAL NOT NULL,
    "chainFrom" INTEGER NOT NULL,
    "chainTo" INTEGER NOT NULL,
    "minAmount" TEXT NOT NULL,
    "maxAmount" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BridgeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "oldData" TEXT,
    "newData" TEXT,
    "adminId" BIGINT,
    "adminAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."AdminNonce" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arc_quantum"."AdminSession" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "arc_quantum"."User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_hash_key" ON "arc_quantum"."Transaction"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_chainId_key" ON "arc_quantum"."Token"("address", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeConfig_chainFrom_chainTo_key" ON "arc_quantum"."BridgeConfig"("chainFrom", "chainTo");

-- CreateIndex
CREATE INDEX "AdminNonce_address_nonce_idx" ON "arc_quantum"."AdminNonce"("address", "nonce");

-- CreateIndex
CREATE INDEX "AdminNonce_expiresAt_idx" ON "arc_quantum"."AdminNonce"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "arc_quantum"."AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "arc_quantum"."AdminSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "arc_quantum"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "arc_quantum"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arc_quantum"."AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "arc_quantum"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arc_quantum"."AdminNonce" ADD CONSTRAINT "AdminNonce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "arc_quantum"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arc_quantum"."AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "arc_quantum"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
