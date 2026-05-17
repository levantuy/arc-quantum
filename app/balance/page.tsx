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
      showToast('Chưa có tài sản nào', 'info');
    }
  }, [loading, balances, connected, error, showToast]);

  const handleTokenIconError = React.useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = '/tokens/default-token.svg';
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Unified Balance</h1>
      <div className="flex items-center gap-4 mb-4">
        {address && <span className="text-slate-700 text-sm">{shortenAddress(address)}</span>}
        <Button onClick={refresh} disabled={loading || !connected} className="ml-auto">
          Làm mới
        </Button>
      </div>
      <div className="mb-6">
        <span className="text-slate-500 text-xs">Tổng giá trị danh mục:</span>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <span className="block text-2xl font-semibold text-emerald-700 mt-2">${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
        )}
        <div className="mt-2 space-y-1 text-xs">
          {lastUpdatedAt && <p className="text-slate-500">Cập nhật lúc {lastUpdatedAt.toLocaleTimeString('vi-VN')}</p>}
          {staleData && <p className="text-amber-700">Dữ liệu có thể lỗi thời</p>}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-800">Breakdown theo chain</h2>
        {loading ? (
          <div className="mt-3 grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : chainBreakdown.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu chain.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {chainBreakdown.map((item, index) => (
              <div key={`${item.chain}-${index}`} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                <span className="text-slate-700">{item.chain}</span>
                <span className="font-mono text-slate-900">{Number(item.confirmedBalance || '0').toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC</span>
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
              <div key={token.symbol} className="flex items-center gap-4 border-b py-2 last:border-b-0">
                <img
                  src={token.iconUrl}
                  alt={token.symbol}
                  className="h-10 w-10 rounded-full bg-slate-100"
                  onError={handleTokenIconError}
                />
                <div>
                  <div className="font-semibold text-slate-900">{token.symbol}</div>
                  <div className="text-xs text-slate-500">{token.name}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-slate-900">{token.amount}</div>
                  <div className="text-xs text-slate-500">${token.usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
