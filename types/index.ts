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
