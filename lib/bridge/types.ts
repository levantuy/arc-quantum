// Bridge-specific types and enums

export enum BridgeTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum BridgeLogStep {
  // Initialization
  INIT = 'init',
  VALIDATE = 'validate',
  CHECK_BALANCE = 'check_balance',
  CHECK_BRIDGE_SUPPORT = 'check_bridge_support',
  
  // Source chain
  LOCK_TOKEN = 'lock_token',
  WAIT_SOURCE_CONFIRMATION = 'wait_source_confirmation',
  SOURCE_TX_SUCCESS = 'source_tx_success',
  
  // Destination chain
  MINT_TOKEN = 'mint_token',
  WAIT_DEST_CONFIRMATION = 'wait_dest_confirmation',
  DEST_TX_SUCCESS = 'dest_tx_success',
  
  // Completion
  COMPLETED = 'completed',
  
  // Error handling
  ERROR = 'error',
  RETRY = 'retry',
}

export interface BridgeStepLog {
  step: BridgeLogStep;
  detail?: Record<string, any>;
  error?: string;
  txHash?: string;
  timestamp?: number;
}

export const BRIDGE_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  CONFIRMATION_BLOCKS: 12,
  LOCK_TIMEOUT_MS: 600000, // 10 minutes
} as const;
