// Định nghĩa các type dùng chung toàn dự án
export type Address = `0x${string}`;

export interface Token {
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
}

export interface User {
  id: number;
  address: Address;
  createdAt: string;
}

export interface Transaction {
  id: number;
  hash: string;
  txType: 'swap' | 'bridge' | 'send' | 'unknown';
  from: Address;
  to: Address;
  amount: string;
  amountIn?: string | null;
  amountOut?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  chainId?: number | null;
  status: 'pending' | 'confirming' | 'success' | 'failed';
  explorerUrl?: string | null;
  errorMessage?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// Bridge Types
export interface BridgeTransaction {
  id: number;
  userAddress: Address;
  fromChainId: number;
  toChainId: number;
  tokenAddress: Address;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  txHashSource?: string | null;
  txHashDest?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeTransactionLog {
  id: number;
  bridgeTransactionId: number;
  step: string;
  detail?: string | null;
  createdAt: string;
}

// History Module - UC-HIS-001
export type HistoryTabType = 'all' | 'send' | 'swap' | 'bridge';

export interface HistoryFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  hash: string;
}

/** Normalised transaction used by the History module UI */
export interface UnifiedTransaction {
  /** Prefixed ID: "tx_<id>" or "bridge_<id>" */
  id: string;
  hash: string | null;
  type: 'send' | 'swap' | 'bridge';
  status: 'pending' | 'confirming' | 'success' | 'failed';
  amount: string;
  /** Token symbol or address (best-effort) */
  token: string | null;
  chainId?: number | null;
  fromChainId?: number | null;
  toChainId?: number | null;
  explorerUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  // Send/Swap extras
  to?: string | null;
  amountIn?: string | null;
  amountOut?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  confirmedAt?: string | null;
  // Bridge extras
  txHashSource?: string | null;
  txHashDest?: string | null;
  tokenAddress?: string | null;
}

export interface BridgeTransferRequest {
  userAddress: Address;
  fromChainId: number;
  toChainId: number;
  tokenAddress: Address;
  amount: string;
  signature: string;
}

export interface BridgeHistoryRecordRequest {
  userAddress: Address;
  fromChainId: number;
  toChainId: number;
  tokenAddress: Address;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  txHashSource?: string | null;
  txHashDest?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BridgeConfig {
  id: number;
  chainFrom: number;
  chainTo: number;
  minAmount: string;
  maxAmount: string;
  fee: string;
  isActive: boolean;
}
