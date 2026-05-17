// Hook kết nối ví EVM (MetaMask, WalletConnect, ...)
import { useState } from 'react';
import { Address } from '../types';

export function useWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [connected, setConnected] = useState(false);
  // ... thêm logic kết nối thực tế với wagmi/ethers ...
  return { address, connected, setAddress, setConnected };
}
