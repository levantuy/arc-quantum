// Bridge transaction logging/audit
import { prisma } from '@/lib/db/prisma';
import { BridgeLogStep, BridgeStepLog } from './types';

function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_, currentValue) =>
    typeof currentValue === 'bigint' ? currentValue.toString() : currentValue
  );
}

export class BridgeTransactionLogger {
  /**
   * Log a step in bridge transaction processing
   */
  static async logStep(
    bridgeTransactionId: number,
    step: BridgeLogStep,
    detail?: Record<string, any>,
    error?: string
  ): Promise<void> {
    try {
      const stepLog: BridgeStepLog = {
        step,
        detail,
        error,
        timestamp: Date.now(),
      };

      await prisma.bridgeTransactionLog.create({
        data: {
          bridgeTransactionId,
          step,
          detail: safeStringify(stepLog),
        },
      });

      console.log(
        `[Bridge] Step logged: ${step} for transaction ${bridgeTransactionId}`,
        stepLog
      );
    } catch (err) {
      console.error('[Bridge] Failed to log step:', err);
      throw err;
    }
  }

  /**
   * Get all logs for a bridge transaction
   */
  static async getTransactionLogs(bridgeTransactionId: number) {
    return prisma.bridgeTransactionLog.findMany({
      where: { bridgeTransactionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Log transaction initialization
   */
  static async logInit(
    bridgeTransactionId: number,
    detail: Record<string, any>
  ): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.INIT, detail);
  }

  /**
   * Log validation step
   */
  static async logValidate(
    bridgeTransactionId: number,
    detail: Record<string, any>
  ): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.VALIDATE, detail);
  }

  /**
   * Log balance check
   */
  static async logBalanceCheck(
    bridgeTransactionId: number,
    detail: Record<string, any>
  ): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.CHECK_BALANCE, detail);
  }

  /**
   * Log bridge support check
   */
  static async logBridgeSupportCheck(
    bridgeTransactionId: number,
    detail: Record<string, any>
  ): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.CHECK_BRIDGE_SUPPORT, detail);
  }

  /**
   * Log lock token on source chain
   */
  static async logLockToken(
    bridgeTransactionId: number,
    txHash: string,
    detail?: Record<string, any>
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.LOCK_TOKEN,
      { ...detail, txHash }
    );
  }

  /**
   * Log source tx confirmation
   */
  static async logWaitSourceConfirmation(
    bridgeTransactionId: number,
    txHash: string,
    confirmations: number
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.WAIT_SOURCE_CONFIRMATION,
      { txHash, confirmations }
    );
  }

  /**
   * Log source tx success
   */
  static async logSourceTxSuccess(
    bridgeTransactionId: number,
    txHash: string
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.SOURCE_TX_SUCCESS,
      { txHash }
    );
  }

  /**
   * Log mint token on destination chain
   */
  static async logMintToken(
    bridgeTransactionId: number,
    txHash: string,
    detail?: Record<string, any>
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.MINT_TOKEN,
      { ...detail, txHash }
    );
  }

  /**
   * Log destination tx confirmation
   */
  static async logWaitDestConfirmation(
    bridgeTransactionId: number,
    txHash: string,
    confirmations: number
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.WAIT_DEST_CONFIRMATION,
      { txHash, confirmations }
    );
  }

  /**
   * Log destination tx success
   */
  static async logDestTxSuccess(
    bridgeTransactionId: number,
    txHash: string
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.DEST_TX_SUCCESS,
      { txHash }
    );
  }

  /**
   * Log transaction completion
   */
  static async logCompleted(bridgeTransactionId: number): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.COMPLETED, {
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Log error
   */
  static async logError(
    bridgeTransactionId: number,
    error: string,
    detail?: Record<string, any>
  ): Promise<void> {
    await this.logStep(bridgeTransactionId, BridgeLogStep.ERROR, detail, error);
  }

  /**
   * Log retry attempt
   */
  static async logRetry(
    bridgeTransactionId: number,
    attempt: number,
    detail?: Record<string, any>
  ): Promise<void> {
    await this.logStep(
      bridgeTransactionId,
      BridgeLogStep.RETRY,
      { ...detail, attempt }
    );
  }
}
