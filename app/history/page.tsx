// UC-HIS-001: Transaction History page — Tổng hợp mọi loại giao dịch
'use client';

import React, { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import {
  HistoryFilters,
  HistoryTable,
  TransactionDetailModal,
  HistoryPagination,
} from '@/components/history';
import { UnifiedTransaction, HistoryTabType } from '@/types';

const TABS: { key: HistoryTabType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'send', label: 'Send' },
  { key: 'swap', label: 'Swap' },
  { key: 'bridge', label: 'Bridge' },
];

export default function HistoryPage() {
  const {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    page,
    setPage,
    displayItems,
    totalItems,
    totalPages,
    txLoading,
    bridgeLoading,
    txError,
    bridgeError,
    retryTx,
    retryBridge,
    connected,
  } = useHistory();

  const [selectedItem, setSelectedItem] = useState<UnifiedTransaction | null>(null);

  const isLoading = txLoading || bridgeLoading;

  // EX-01: wallet not connected
  if (!connected) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          History
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Transaction History</h1>
        <p className="mt-4 text-slate-500">
          Please connect your wallet to view transaction history.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Use the Connect Wallet button in the top navigation.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          History
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Transaction History</h1>
        <p className="mt-1 text-sm text-slate-500">
          All your Send, Swap and Bridge transactions in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 pb-2.5 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <HistoryFilters filters={filters} onChange={setFilters} />

      {/* Error banners (EX-02 / EX-03) — partial errors shown independently */}
      {txError && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Send/Swap data failed to load: {txError}</span>
          <button
            onClick={retryTx}
            className="ml-4 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {bridgeError && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Bridge data failed to load: {bridgeError}</span>
          <button
            onClick={retryBridge}
            className="ml-4 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <HistoryTable
        items={displayItems}
        loading={isLoading}
        onSelect={setSelectedItem}
      />

      {/* Empty states (AF-05 / AF-02) */}
      {!isLoading && displayItems.length === 0 && !txError && !bridgeError && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 py-12 text-center">
          {filters.status || filters.dateFrom || filters.dateTo || filters.hash ? (
            <>
              <p className="text-slate-600 font-medium">No transactions match your filters.</p>
              <button
                onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', hash: '' })}
                className="mt-3 text-sm text-amber-600 hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-600 font-medium">No transactions yet.</p>
              <p className="mt-1 text-sm text-slate-400">
                Start with{' '}
                <a href="/bridge" className="text-amber-600 hover:underline">
                  Bridge
                </a>
                ,{' '}
                <a href="/swap" className="text-amber-600 hover:underline">
                  Swap
                </a>{' '}
                or{' '}
                <a href="/send" className="text-amber-600 hover:underline">
                  Send
                </a>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* Pagination (AF-04) */}
      {!isLoading && (
        <HistoryPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      )}

      {/* Detail modal (AF-06) */}
      <TransactionDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  );
}

