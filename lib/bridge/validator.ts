// Bridge validation logic
import { BridgeTransferRequest, Address } from '@/types';
import { isAddress, toBeHex } from 'ethers';

export class BridgeValidator {
  /**
   * Validate bridge transfer request
   */
  static validateTransferRequest(req: BridgeTransferRequest): { valid: boolean; error?: string } {
    // Validate address format
    if (!isAddress(req.userAddress)) {
      return { valid: false, error: 'Invalid user address format' };
    }

    if (!isAddress(req.tokenAddress)) {
      return { valid: false, error: 'Invalid token address format' };
    }

    // Validate chain IDs
    if (req.fromChainId === req.toChainId) {
      return { valid: false, error: 'Source and destination chains must be different' };
    }

    if (req.fromChainId <= 0 || req.toChainId <= 0) {
      return { valid: false, error: 'Invalid chain IDs' };
    }

    // Validate amount
    const amount = BigInt(req.amount);
    if (amount <= 0n) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    // Validate signature
    if (!req.signature || req.signature.length < 2) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  }

  /**
   * Validate amount against bridge config limits
   */
  static validateAmountLimit(
    amount: string,
    minAmount: string,
    maxAmount: string
  ): { valid: boolean; error?: string } {
    const amountBig = BigInt(amount);
    const minBig = BigInt(minAmount);
    const maxBig = BigInt(maxAmount);

    if (amountBig < minBig) {
      return { valid: false, error: `Amount must be at least ${minAmount}` };
    }

    if (amountBig > maxBig) {
      return { valid: false, error: `Amount must not exceed ${maxAmount}` };
    }

    return { valid: true };
  }

  /**
   * Validate bridge configuration
   */
  static validateBridgeConfig(
    fromChainId: number,
    toChainId: number,
    isActive: boolean
  ): { valid: boolean; error?: string } {
    if (!isActive) {
      return { valid: false, error: 'Bridge between these chains is not active' };
    }

    return { valid: true };
  }
}
