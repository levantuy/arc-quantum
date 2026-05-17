'use client';

import { useWallet } from '@/hooks/useWallet';
import { shortenAddress } from '@/utils';
import { useEffect, useRef, useState } from 'react';

export default function WalletInfo() {
  const { address, connected, loading, error: walletError, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const activeAddress = connected ? address : null;

  // Fetch balance from API when the wallet is connected
  useEffect(() => {
    if (activeAddress) {
      fetchBalance(activeAddress);
      // Refresh balance every 15 seconds
      const interval = setInterval(() => {
        fetchBalance(activeAddress);
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setBalance(null);
      setError(null);
    }
  }, [activeAddress]);

  useEffect(() => {
    if (!showDetails) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDetails]);

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
    setError(null);
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
    setBalance(null);
    setError(null);
    setShowDetails(false);
  };

  const displayError = error ?? walletError;
  const avatarSeed = activeAddress ?? 'wallet';
  const avatarHue = Array.from(avatarSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const avatarText = activeAddress ? activeAddress.slice(2, 4).toUpperCase() : 'WL';

  return (
    <div className="relative flex flex-col items-end gap-2" ref={detailsRef}>
      {displayError && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {displayError}
        </span>
      )}
      <div className="flex items-center gap-2">
        {activeAddress ? (
          <>
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="rounded border border-cyan-300 bg-cyan-50 px-3 py-1 text-sm font-semibold tracking-wide text-cyan-900 shadow-sm transition hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200 dark:hover:bg-cyan-800/60"
              title="Wallet details"
            >
              <span
                className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: `hsl(${avatarHue} 72% 42%)` }}
              >
                {avatarText}
              </span>
              {shortenAddress(activeAddress, 6)}
            </button>
            {loading && (
              <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                Loading...
              </span>
            )}

            {showDetails && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Connected wallet
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Online
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Address</span>
                    <span className="font-mono font-medium">{shortenAddress(activeAddress, 6)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Balance</span>
                    <span className="font-semibold text-cyan-700 dark:text-cyan-300">{balance ?? '0.00'} USDC</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleDisconnect}
                    className="rounded px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition"
                    title="Disconnect wallet"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="rounded px-3 py-1 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Connect wallet"
          >
            {loading ? 'Connecting...' : 'Connect wallet'}
          </button>
        )}
      </div>
    </div>
  );
}
