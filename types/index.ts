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
