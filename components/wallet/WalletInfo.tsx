'use client';

import { useWalletStore } from '@/stores/wallet';
import { shortenAddress } from '@/utils';
import { useEffect, useState } from 'react';

export default function WalletInfo() {
  const { address, connected, setAddress, setConnected } = useWalletStore();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance từ API khi ví được kết nối
  useEffect(() => {
    if (address && connected) {
      fetchBalance(address);
      // Refresh balance every 15 seconds
      const interval = setInterval(() => {
        fetchBalance(address);
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setBalance(null);
      setError(null);
    }
  }, [address, connected]);

  const fetchBalance = async (addr: string) => {
    try {
      const response = await fetch(`/api/balance/unified?address=${addr}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance ?? '0.00');
        setError(null);
      } else {
        setError('Failed to fetch balance');
        setBalance('0.00');
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setError('Network error');
      setBalance('0.00');
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      // Kiểm tra nếu có MetaMask hoặc wallet provider
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setError('MetaMask or Web3 wallet not found. Please install a wallet extension.');
        setLoading(false);
        return;
      }

      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (!accounts || accounts.length === 0) {
        setError('No accounts available');
        setLoading(false);
        return;
      }

      setAddress(accounts[0] as any);
      setConnected(true);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    setConnected(false);
    setBalance(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
      <div className="flex items-center gap-2">
        {connected && address ? (
          <>
            <span className="rounded bg-cyan-100 dark:bg-cyan-900 px-2 py-1 text-xs font-mono text-cyan-700 dark:text-cyan-300">
              {shortenAddress(address, 6)}
            </span>
            {balance && (
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {balance} ARC
              </span>
            )}
            {loading && (
              <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                Đang tải...
              </span>
            )}
            <button
              onClick={handleDisconnect}
              className="rounded px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition"
              title="Ngắt kết nối ví"
            >
              Ngắt
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="rounded px-3 py-1 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Kết nối ví"
          >
            {loading ? 'Đang kết nối...' : 'Kết nối ví'}
          </button>
        )}
      </div>
    </div>
  );
}
