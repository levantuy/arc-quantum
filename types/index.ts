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
  from: Address;
  to: Address;
  amount: string;
  status: 'pending' | 'success' | 'fail';
  createdAt: string;
}
