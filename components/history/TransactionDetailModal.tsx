// UC-HIS-001: Transaction detail modal — AF-06 Bridge detail, Send/Swap detail
'use client';

import React from 'react';
import { UnifiedTransaction } from '@/types';
import { getChainName } from '@/lib/bridge/config';

interface TransactionDetailModalProps {
  item: UnifiedTransaction | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="break-all text-sm text-slate-800">{children}</span>
    </div>
  );
}

function HashLink({ hash, explorerBase }: { hash: string | null | undefined; explorerBase?: string | null }) {
  if (!hash) return <span className="text-slate-400">—</span>;
  const href = explorerBase
    ? `${explorerBase.replace(/\/$/, '')}/tx/${hash}`
    : null;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-amber-600 underline hover:text-amber-700 break-all">
      {hash}
    </a>
  ) : (
    <span className="font-mono text-slate-700 break-all">{hash}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirming: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

function formatDateFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

const TYPE_TITLE: Record<string, string> = {
  send: 'Send Transaction',
  swap: 'Swap Transaction',
  bridge: 'Bridge Transaction',
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {TYPE_TITLE[item.type] ?? 'Transaction Detail'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="divide-y divide-slate-100 px-6 py-2 max-h-[70vh] overflow-y-auto">
          <Row label="Type">
            <span className="capitalize font-medium">{item.type}</span>
          </Row>

          <Row label="Status">
            <StatusBadge status={item.status} />
          </Row>

          <Row label="Created At">{formatDateFull(item.createdAt)}</Row>

          {/* Send-specific */}
          {item.type === 'send' && (
            <>
              <Row label="Amount">
                {item.amount} {item.tokenIn ?? ''}
              </Row>
              {item.to && <Row label="To">{item.to}</Row>}
              {item.chainId && <Row label="Network">{getChainName(item.chainId)}</Row>}
              <Row label="Tx Hash">
                <HashLink hash={item.hash} explorerBase={item.explorerUrl} />
              </Row>
              {item.confirmedAt && (
                <Row label="Confirmed At">{formatDateFull(item.confirmedAt)}</Row>
              )}
            </>
          )}

          {/* Swap-specific */}
          {item.type === 'swap' && (
            <>
              <Row label="You Pay">
                {item.amountIn ?? item.amount} {item.tokenIn ?? ''}
              </Row>
              <Row label="You Receive">
                {item.amountOut ?? '—'} {item.tokenOut ?? ''}
              </Row>
              {item.chainId && <Row label="Network">{getChainName(item.chainId)}</Row>}
              <Row label="Tx Hash">
                <HashLink hash={item.hash} explorerBase={item.explorerUrl} />
              </Row>
              {item.confirmedAt && (
                <Row label="Confirmed At">{formatDateFull(item.confirmedAt)}</Row>
              )}
            </>
          )}

          {/* Bridge-specific (AF-06) */}
          {item.type === 'bridge' && (
            <>
              <Row label="From Chain">
                {item.fromChainId ? getChainName(item.fromChainId) : '—'}
              </Row>
              <Row label="To Chain">
                {item.toChainId ? getChainName(item.toChainId) : '—'}
              </Row>
              <Row label="Amount">{item.amount}</Row>
              {item.tokenAddress && (
                <Row label="Token Address">{item.tokenAddress}</Row>
              )}
              <Row label="Lock Tx (Source)">
                <HashLink hash={item.txHashSource} />
              </Row>
              <Row label="Mint Tx (Dest)">
                <HashLink hash={item.txHashDest} />
              </Row>
            </>
          )}

          {/* Error message */}
          {item.errorMessage && (
            <Row label="Error">
              <span className="text-red-600">{item.errorMessage}</span>
            </Row>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
