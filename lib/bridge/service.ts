// Bridge transaction service - core business logic
import { prisma } from '@/lib/db/prisma';
import { BridgeTransferRequest, BridgeTransaction, Address, BridgeHistoryRecordRequest } from '@/types';
import { BridgeValidator } from './validator';
import { BridgeTransactionLogger } from './logger';
import { BridgeTransactionStatus, BRIDGE_CONFIG, BridgeLogStep } from './types';
import { verifyMessage } from 'ethers';

export class BridgeService {
  /**
   * Persist a bridge transaction that was executed directly on frontend via Arc App Kit.
   */
  static async createHistoryRecord(req: BridgeHistoryRecordRequest): Promise<BridgeTransaction> {
    const txRecord = await prisma.bridgeTransaction.create({
      data: {
        userAddress: req.userAddress,
        fromChainId: req.fromChainId,
        toChainId: req.toChainId,
        tokenAddress: req.tokenAddress,
        amount: req.amount,
        status: req.status,
        txHashSource: req.txHashSource || null,
        txHashDest: req.txHashDest || null,
        errorMessage: req.errorMessage || null,
      },
    });

    const txId = Number(txRecord.id);

    await BridgeTransactionLogger.logInit(txId, {
      userAddress: req.userAddress,
      fromChainId: req.fromChainId,
      toChainId: req.toChainId,
      tokenAddress: req.tokenAddress,
      amount: req.amount,
      source: 'frontend_app_kit',
      metadata: req.metadata || null,
    });

    if (req.txHashSource) {
      await BridgeTransactionLogger.logStep(txId, BridgeLogStep.SOURCE_TX_SUCCESS, {
        txHash: req.txHashSource,
      });
    }

    if (req.txHashDest) {
      await BridgeTransactionLogger.logStep(txId, BridgeLogStep.DEST_TX_SUCCESS, {
        txHash: req.txHashDest,
      });
    }

    if (req.status === BridgeTransactionStatus.SUCCESS) {
      await BridgeTransactionLogger.logCompleted(txId);
    }

    if (req.status === BridgeTransactionStatus.FAILED && req.errorMessage) {
      await BridgeTransactionLogger.logError(txId, req.errorMessage);
    }

    return this.getTransaction(txId);
  }

  /**
   * UC-BRIDGE-001: Initiate a bridge transfer
   * - Validate request
   * - Check balance and bridge support
   * - Create transaction record
   * - Lock/burn token on source chain
   */
  static async initiateTransfer(req: BridgeTransferRequest): Promise<BridgeTransaction> {
    // Step 1: Validate request format
    const validation = BridgeValidator.validateTransferRequest(req);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid bridge transfer request');
    }

    // Create initial transaction record
    const txRecord = await prisma.bridgeTransaction.create({
      data: {
        userAddress: req.userAddress,
        fromChainId: req.fromChainId,
        toChainId: req.toChainId,
        tokenAddress: req.tokenAddress,
        amount: req.amount,
        status: BridgeTransactionStatus.PENDING,
      },
    });

    try {
      const txId = Number(txRecord.id);

      // Log initialization
      await BridgeTransactionLogger.logInit(txId, {
        userAddress: req.userAddress,
        fromChainId: req.fromChainId,
        toChainId: req.toChainId,
        tokenAddress: req.tokenAddress,
        amount: req.amount,
      });

      // Step 2: Verify signature
      const messageHash = this.getTransferMessageHash(req);
      const recoveredAddress = verifyMessage(messageHash, req.signature);
      if (recoveredAddress.toLowerCase() !== req.userAddress.toLowerCase()) {
        throw new Error('Invalid signature');
      }

      await BridgeTransactionLogger.logValidate(txId, {
        signatureValid: true,
        recoveredAddress,
      });

      // Step 3: Get bridge config
      const bridgeConfig = await prisma.bridgeConfig.findUnique({
        where: {
          chainFrom_chainTo: {
            chainFrom: req.fromChainId,
            chainTo: req.toChainId,
          },
        },
      });

      if (!bridgeConfig) {
        throw new Error(
          `Bridge not supported between chain ${req.fromChainId} and ${req.toChainId}`
        );
      }

      // Step 4: Validate amount against bridge limits
      const limitValidation = BridgeValidator.validateAmountLimit(
        req.amount,
        bridgeConfig.minAmount,
        bridgeConfig.maxAmount
      );

      if (!limitValidation.valid) {
        throw new Error(limitValidation.error || 'Amount validation failed');
      }

      await BridgeTransactionLogger.logBridgeSupportCheck(txId, {
        bridgeConfigId: bridgeConfig.id,
        minAmount: bridgeConfig.minAmount,
        maxAmount: bridgeConfig.maxAmount,
        fee: bridgeConfig.fee,
      });

      // Step 5: Check user balance (in real implementation, query RPC)
      // For now, we assume the check is done on frontend
      await BridgeTransactionLogger.logBalanceCheck(txId, {
        amount: req.amount,
        checkPassed: true,
      });

      // Step 6: Lock token on source chain (via Arc App Kit Bridge)
      // In production, this would interact with smart contract through Arc App Kit
      const lockTxHash = await this.lockTokenOnSourceChain(
        txId,
        req
      );

      // Update transaction with source tx hash
      await prisma.bridgeTransaction.update({
        where: { id: txRecord.id },
        data: { txHashSource: lockTxHash },
      });

      await BridgeTransactionLogger.logLockToken(txId, lockTxHash, {
        amount: req.amount,
      });

      // Step 7: Monitor source chain confirmation
      await this.waitSourceChainConfirmation(txId, lockTxHash);

      return this.getTransaction(Number(txRecord.id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.bridgeTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: BridgeTransactionStatus.FAILED,
          errorMessage,
        },
      });

      await BridgeTransactionLogger.logError(Number(txRecord.id), errorMessage);

      throw error;
    }
  }

  /**
   * UC-BRIDGE-002: Get transaction status
   */
  static async getTransaction(id: number): Promise<BridgeTransaction> {
    const tx = await prisma.bridgeTransaction.findUniqueOrThrow({
      where: { id },
    });

    return {
      id: Number(tx.id),
      userAddress: tx.userAddress as Address,
      fromChainId: tx.fromChainId,
      toChainId: tx.toChainId,
      tokenAddress: tx.tokenAddress as Address,
      amount: tx.amount,
      status: tx.status as 'pending' | 'success' | 'failed',
      txHashSource: tx.txHashSource || undefined,
      txHashDest: tx.txHashDest || undefined,
      errorMessage: tx.errorMessage || undefined,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }

  /**
   * UC-BRIDGE-002: Get transaction history for a user
   */
  static async getUserTransactionHistory(
    userAddress: Address,
    limit: number = 10,
    offset: number = 0
  ) {
    const transactions = await prisma.bridgeTransaction.findMany({
      where: { userAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.bridgeTransaction.count({
      where: { userAddress },
    });

    return {
      transactions: transactions.map((tx: any) => ({
        id: Number(tx.id),
        userAddress: tx.userAddress as Address,
        fromChainId: tx.fromChainId,
        toChainId: tx.toChainId,
        tokenAddress: tx.tokenAddress as Address,
        amount: tx.amount,
        status: tx.status as 'pending' | 'success' | 'failed',
        txHashSource: tx.txHashSource || undefined,
        txHashDest: tx.txHashDest || undefined,
        errorMessage: tx.errorMessage || undefined,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * UC-BRIDGE-002: Get transaction details with logs
   */
  static async getTransactionWithLogs(id: number) {
    const tx = await this.getTransaction(id);
    const logs = await BridgeTransactionLogger.getTransactionLogs(id);

    return {
      ...tx,
      logs: logs.map((log: any) => ({
        id: Number(log.id),
        step: log.step,
        detail: log.detail ? JSON.parse(log.detail) : null,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  /**
   * UC-BRIDGE-003: Handle failed transactions
   * Automatically retry or mark for manual intervention
   */
  static async handleFailedTransaction(id: number, retryAttempt: number = 0): Promise<BridgeTransaction> {
    const tx = await prisma.bridgeTransaction.findUniqueOrThrow({
      where: { id },
    });

    if (retryAttempt < BRIDGE_CONFIG.MAX_RETRY_ATTEMPTS) {
      try {
        await BridgeTransactionLogger.logRetry(id, retryAttempt + 1);

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, BRIDGE_CONFIG.RETRY_DELAY_MS)
        );

        // Attempt to complete the transaction
        if (tx.txHashSource && !tx.txHashDest) {
          // Source confirmed but dest not completed - try mint
          await this.completeMintOnDestChain(id);
        } else if (!tx.txHashSource) {
          // Source not locked - retry lock
          // This would require the original transfer request data
          throw new Error('Cannot retry without original transfer request');
        }

        return this.getTransaction(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Retry failed';
        await BridgeTransactionLogger.logError(id, errorMessage);

        // Try again or give up
        if (retryAttempt < BRIDGE_CONFIG.MAX_RETRY_ATTEMPTS - 1) {
          return this.handleFailedTransaction(id, retryAttempt + 1);
        } else {
          // Max retries reached - mark as failed for admin review
          await prisma.bridgeTransaction.update({
            where: { id },
            data: {
              status: BridgeTransactionStatus.FAILED,
              errorMessage: `Max retries reached: ${errorMessage}`,
            },
          });

          throw new Error(`Bridge transaction failed after ${BRIDGE_CONFIG.MAX_RETRY_ATTEMPTS} retries`);
        }
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  // ============ Private helper methods ============

  /**
   * Generate message hash for signature verification
   */
  private static getTransferMessageHash(req: BridgeTransferRequest): string {
    // Must be deterministic and identical to the client-side signed message.
    return `Bridge transfer from chain ${req.fromChainId} to chain ${req.toChainId} for token ${req.tokenAddress} amount ${req.amount}`;
  }

  /**
   * Lock token on source chain (Arc App Kit integration)
   * In production, this calls Arc App Kit Bridge methods
   */
  private static async lockTokenOnSourceChain(
    txId: number,
    req: BridgeTransferRequest
  ): Promise<string> {
    // TODO: Integrate with Arc App Kit Bridge
    // This is a placeholder that returns a mock tx hash
    // Real implementation would use Arc SDK to:
    // 1. Prepare bridge lock transaction
    // 2. Send transaction to source chain
    // 3. Return transaction hash

    // Mock implementation for demonstration
    const mockTxHash = `0x${'0'.repeat(64)}`;
    console.log(
      `[Bridge] Mock lock token on chain ${req.fromChainId}: ${mockTxHash}`
    );
    return mockTxHash;
  }

  /**
   * Wait for source chain transaction confirmation
   */
  private static async waitSourceChainConfirmation(
    txId: number,
    txHash: string
  ): Promise<void> {
    // TODO: Implement actual RPC calls to check confirmations
    // For now, just log it
    await BridgeTransactionLogger.logWaitSourceConfirmation(txId, txHash, 0);

    // Simulate confirmation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await BridgeTransactionLogger.logSourceTxSuccess(txId, txHash);
  }

  /**
   * Complete mint on destination chain
   */
  private static async completeMintOnDestChain(txId: number): Promise<void> {
    const tx = await prisma.bridgeTransaction.findUniqueOrThrow({
      where: { id: txId },
    });

    if (!tx.txHashSource) {
      throw new Error('Source transaction hash not found');
    }

    // TODO: Integrate with Arc App Kit Bridge for destination chain
    // This would mint tokens on destination chain

    const mockMintTxHash = `0x${'1'.repeat(64)}`;

    await prisma.bridgeTransaction.update({
      where: { id: txId },
      data: {
        txHashDest: mockMintTxHash,
      },
    });

    await BridgeTransactionLogger.logMintToken(txId, mockMintTxHash);
    await BridgeTransactionLogger.logWaitDestConfirmation(txId, mockMintTxHash, 0);
    await BridgeTransactionLogger.logDestTxSuccess(txId, mockMintTxHash);
    await BridgeTransactionLogger.logCompleted(txId);

    await prisma.bridgeTransaction.update({
      where: { id: txId },
      data: {
        status: BridgeTransactionStatus.SUCCESS,
      },
    });
  }
}
