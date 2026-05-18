// UC-HIS-001: Transaction list table with skeleton loading states
'use client';

import React from 'react';
import { UnifiedTransaction } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { getChainName } from '@/lib/bridge/config';

interface HistoryTableProps {
  items: UnifiedTransaction[];
  loading: boolean;
  onSelect: (item: UnifiedTransaction) => void;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  send: { label: 'Send', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  swap: { label: 'Swap', cls: 'bg-purple-50 text-purple-700 border-purple-100' },
  bridge: { label: 'Bridge', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
  confirming: { label: 'Confirming', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  success: { label: 'Success', cls: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
};

function truncateHash(hash: string | null | undefined, len = 8): string {
  if (!hash) return '—';
  if (hash.length <= len * 2 + 2) return hash;
  return `${hash.slice(0, len)}…${hash.slice(-4)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function ChainInfo({ item }: { item: UnifiedTransaction }) {
  if (item.type === 'bridge' && item.fromChainId && item.toChainId) {
    return (
      <span className="text-xs text-slate-500">
        {getChainName(item.fromChainId)} → {getChainName(item.toChainId)}
      </span>
    );
  }
  if (item.chainId) {
    return <span className="text-xs text-slate-500">{getChainName(item.chainId)}</span>;
  }
  return null;
}

function AmountDisplay({ item }: { item: UnifiedTransaction }) {
  if (item.type === 'swap' && item.amountIn && item.amountOut) {
    const tokenIn = item.tokenIn ? ` ${item.tokenIn}` : '';
    const tokenOut = item.tokenOut ? ` ${item.tokenOut}` : '';
    return (
      <span className="text-sm font-medium text-slate-800">
        {item.amountIn}
        {tokenIn} → {item.amountOut}
        {tokenOut}
      </span>
    );
  }
  const token = item.tokenIn ?? item.tokenOut ?? '';
  return (
    <span className="text-sm font-medium text-slate-800">
      {item.amount}
      {token ? ` ${token}` : ''}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-28" /></td>
        </tr>
      ))}
    </>
  );
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ items, loading, onSelect }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Hash</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Chain</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : items.length === 0 ? null : (
            items.map((item) => {
              const typeBadge = TYPE_BADGE[item.type] ?? TYPE_BADGE.send;
              const statusBadge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-amber-50"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeBadge.cls}`}
                    >
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {truncateHash(item.hash)}
                  </td>
                  <td className="px-4 py-3">
                    <AmountDisplay item={item} />
                  </td>
                  <td className="px-4 py-3">
                    <ChainInfo item={item} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.cls}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.createdAt)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
