'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Transaction } from '@/types';

// -- Constants ----------------------------------------------------------------

const PAGE_SIZE = 10;
/** Poll interval for in-flight transactions (ms) */
const POLL_INTERVAL_MS = 5_000;
/** Statuses that require polling until resolved */
const PENDING_STATUSES = new Set(['confirming', 'pending']);

// -- Helpers ------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  confirming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  success:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  confirming: 'Confirming',
  pending:    'Pending',
  success:    'Success',
  failed:     'Failed',
};

function formatAmount(amount: string, token?: string | null): string {
  try {
    const n = parseFloat(amount);
    if (isNaN(n)) return amount;
    return n.toLocaleString(undefined, { maximumFractionDigits: 6 }) + (token ? ` ${token}` : '');
  } catch {
    return amount;
  }
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

// -- Component ----------------------------------------------------------------

export function SendHistory() {
  const { connected, address } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // -- Fetch list -------------------------------------------------------------

  const fetchHistory = useCallback(
    async (page: number) => {
      if (!address) return;

      setLoading(true);
      setError(null);

      const offset = (page - 1) * PAGE_SIZE;
      const url =
        `/api/history/list` +
        `?address=${encodeURIComponent(address)}` +
        `&type=send` +
        `&limit=${PAGE_SIZE}` +
        `&offset=${offset}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? 'Failed to load history.');
        }

        setTransactions(json.data?.transactions ?? []);
        setTotal(json.data?.total ?? 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load history.');
      } finally {
        setLoading(false);
      }
    },
    [address],
  );

  // -- Auto-reload after SendForm confirms DB write --------------------------

  useEffect(() => {
    const handler = () => fetchHistory(currentPage);
    window.addEventListener('send:confirmed', handler);
    return () => window.removeEventListener('send:confirmed', handler);
  }, [fetchHistory, currentPage]);

  // -- Initial load / page change / address change ---------------------------

  useEffect(() => {
    if (!connected || !address) {
      setTransactions([]);
      setTotal(0);
      setCurrentPage(1);
      return;
    }
    fetchHistory(currentPage);
  }, [connected, address, currentPage, fetchHistory]);

  // -- Poll status for unresolved transactions --------------------------------

  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  useEffect(() => {
    const hasPending = transactions.some((tx) => PENDING_STATUSES.has(tx.status));
    if (!hasPending) return;

    const timer = setInterval(async () => {
      const current = transactionsRef.current;
      const pending = current.filter((tx) => PENDING_STATUSES.has(tx.status));
      if (pending.length === 0) return;

      const results = await Promise.allSettled(
        pending.map((tx) =>
          fetch(`/api/tx/status/${tx.hash}`).then((r) => r.json()),
        ),
      );

      setTransactions((prev) => {
        let changed = false;
        const next = prev.map((tx) => {
          const resultIndex = pending.findIndex((p) => p.hash === tx.hash);
          if (resultIndex === -1) return tx;
          const settled = results[resultIndex];
          if (settled.status !== 'fulfilled') return tx;
          const data = settled.value as { status?: string; errorMessage?: string | null; confirmedAt?: string | null };
          if (!data.status || data.status === tx.status) return tx;
          changed = true;
          return {
            ...tx,
            status: data.status as Transaction['status'],
            errorMessage: data.errorMessage ?? tx.errorMessage,
            confirmedAt: data.confirmedAt ?? tx.confirmedAt,
          };
        });
        return changed ? next : prev;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [transactions]);

  // -- Empty / disconnected --------------------------------------------------

  if (!connected) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Connect your wallet to view send history.
      </div>
    );
  }

  // -- Loading skeleton ------------------------------------------------------

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  // -- Error -----------------------------------------------------------------

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-400 flex justify-between items-center">
        <span>{error}</span>
        <button
          onClick={() => fetchHistory(currentPage)}
          className="ml-4 underline text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  // -- Empty -----------------------------------------------------------------

  if (!loading && transactions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No send transactions yet.
      </div>
    );
  }

  // -- Count pending for indicator -------------------------------------------

  const pendingCount = transactions.filter((tx) => PENDING_STATUSES.has(tx.status)).length;

  // -- History list ----------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {total} transaction{total !== 1 ? 's' : ''}
          </p>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              {pendingCount} confirming
            </span>
          )}
        </div>
        <button
          onClick={() => fetchHistory(currentPage)}
          disabled={loading}
          className="text-xs text-sky-600 hover:underline disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Transaction rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
        {transactions.map((tx) => (
          <div key={tx.hash} className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-start justify-between gap-3">
              {/* Left: hash + to */}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
                  {shortHash(tx.hash)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  To: {tx.to}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
                {tx.confirmedAt && tx.status === 'success' && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Confirmed at {new Date(tx.confirmedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Right: amount + status */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatAmount(tx.amount, tx.tokenIn)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.pending}`}
                >
                  {PENDING_STATUSES.has(tx.status) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  )}
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </span>
              </div>
            </div>

            {/* Explorer link */}
            {tx.explorerUrl && (
              <a
                href={tx.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-sky-600 hover:underline"
              >
                View on Explorer
              </a>
            )}

            {/* Error message */}
            {tx.status === 'failed' && tx.errorMessage && (
              <p className="mt-1 text-xs text-red-600">{tx.errorMessage}</p>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={!canGoPrev || loading}
            className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-40 text-slate-600 dark:text-slate-400"
          >
            &larr; Prev
          </button>
          <span className="text-slate-500 dark:text-slate-400 text-xs">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!canGoNext || loading}
            className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-40 text-slate-600 dark:text-slate-400"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}