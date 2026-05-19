// UC-HIS-001: Transaction History page â€” Tá»•ng há»£p má»i loáº¡i giao dá»‹ch
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
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-8 shadow-sm text-center">
        <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Transaction History</h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Please connect your wallet to view transaction history.
        </p>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Use the Connect Wallet button in the top navigation.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          History
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Transaction History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          All your Send, Swap and Bridge transactions in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 pb-2.5 pt-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <HistoryFilters filters={filters} onChange={setFilters} />

      {/* Error banners (EX-02 / EX-03) â€” partial errors shown independently */}
      {txError && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <span>Send/Swap data failed to load: {txError}</span>
          <button
            onClick={retryTx}
            className="ml-4 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {bridgeError && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <span>Bridge data failed to load: {bridgeError}</span>
          <button
            onClick={retryBridge}
            className="ml-4 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
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
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-gray-800 py-12 text-center">
          {filters.status || filters.dateFrom || filters.dateTo || filters.hash ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No transactions match your filters.</p>
              <button
                onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', hash: '' })}
                className="mt-3 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No transactions yet.</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Start with{' '}
                <a href="/bridge" className="text-amber-600 dark:text-amber-400 hover:underline">
                  Bridge
                </a>
                ,{' '}
                <a href="/swap" className="text-amber-600 dark:text-amber-400 hover:underline">
                  Swap
                </a>{' '}
                or{' '}
                <a href="/send" className="text-amber-600 dark:text-amber-400 hover:underline">
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

