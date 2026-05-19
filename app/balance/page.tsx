"use client";

import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { shortenAddress } from '../../utils';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

export default function BalancePage() {
  const {
    address,
    connected,
  } = useWallet();
  const {
    balances,
    chainBreakdown,
    totalUsd,
    loading,
    error,
    staleData,
    lastUpdatedAt,
    refresh,
  } = useUnifiedBalance(address);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  React.useEffect(() => {
    if (!loading && balances.length === 0 && connected && !error) {
      showToast('No assets found', 'info');
    }
  }, [loading, balances, connected, error, showToast]);

  const handleTokenIconError = React.useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = '/tokens/default-token.svg';
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-6 shadow-sm max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Unified Balance</h2>
      <div className="flex items-center gap-4 mb-4">
        {address && <span className="text-slate-700 dark:text-slate-300 text-sm">{shortenAddress(address)}</span>}
        <Button onClick={refresh} disabled={loading || !connected} className="ml-auto">
          Refresh
        </Button>
      </div>
      <div className="mb-6">
        <span className="text-slate-500 dark:text-slate-400 text-xs">Total portfolio value:</span>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <span className="block text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mt-2">${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
        )}
        <div className="mt-2 space-y-1 text-xs">
          {lastUpdatedAt && <p className="text-slate-500 dark:text-slate-400">Updated at {lastUpdatedAt.toLocaleTimeString()}</p>}
          {staleData && <p className="text-amber-700 dark:text-amber-400">Data may be stale</p>}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Breakdown by chain</h2>
        {loading ? (
          <div className="mt-3 grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : chainBreakdown.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No chain data available.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {chainBreakdown.map((item, index) => (
              <div key={`${item.chain}-${index}`} className="flex items-center justify-between rounded-md bg-white dark:bg-gray-900 px-3 py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{item.chain}</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{Number(item.confirmedBalance || '0').toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24 ml-auto" />
              </div>
            ))
          : balances.map((token) => (
              <div key={token.symbol} className="flex items-center gap-4 border-b dark:border-slate-700 py-2 last:border-b-0">
                <img
                  src={token.iconUrl}
                  alt={token.symbol}
                  className="h-10 w-10 rounded-full bg-slate-100 dark:bg-gray-700"
                  onError={handleTokenIconError}
                />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{token.symbol}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{token.name}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-slate-900 dark:text-slate-100">{token.amount}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">${token.usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
