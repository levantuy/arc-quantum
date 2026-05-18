// BridgeHistory.tsx - UC-BRIDGE-002: Display bridge transaction history
'use client';

import React, { useEffect, useState } from 'react';
import { BridgeTransaction } from '@/types';
import { useWallet } from '@/hooks/useWallet';
import { Skeleton } from '@/components/ui/Skeleton';
import { BridgeStatus } from './BridgeStatus';
import { getChainName } from '@/lib/bridge/config';

interface BridgeHistoryProps {
  selectedTransactionId?: number;
  onSelectTransaction?: (id: number) => void;
}

export const BridgeHistory: React.FC<BridgeHistoryProps> = ({
  selectedTransactionId,
  onSelectTransaction,
}) => {
  const PAGE_SIZE = 10;
  const { address, connected } = useWallet();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BridgeTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const totalPages = Math.max(Math.ceil(totalTransactions / PAGE_SIZE), 1);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    if (!connected || !address) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const response = await fetch(
          `/api/bridge/history?address=${encodeURIComponent(address)}&limit=${PAGE_SIZE}&offset=${offset}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch history');
        }

        setTransactions(data.data.transactions || []);
        setTotalTransactions(data.data.total || 0);

        // If a transaction is selected, fetch its details
        if (selectedTransactionId) {
          const detail = await fetch(`/api/bridge/${selectedTransactionId}`);
          const detailData = await detail.json();
          if (detail.ok) {
            setSelectedTransaction(detailData.data);
            if (onSelectTransaction) {
              onSelectTransaction(selectedTransactionId);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load history';
        setError(message);
        console.error('Bridge history error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [connected, address, selectedTransactionId, onSelectTransaction, currentPage]);

  useEffect(() => {
    if (!connected || !address) {
      setCurrentPage(1);
      setTotalTransactions(0);
      setTransactions([]);
      setSelectedTransaction(null);
    }
  }, [connected, address]);

  const handleTransactionClick = async (txId: number) => {
    try {
      const response = await fetch(`/api/bridge/${txId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedTransaction(data.data);
        if (onSelectTransaction) {
          onSelectTransaction(txId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch transaction details:', err);
    }
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious || loading) return;
    setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (!canGoNext || loading) return;
    setCurrentPage((prev) => prev + 1);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  if (!connected) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
        <p className="text-yellow-800 dark:text-yellow-300">Please connect your wallet to view transaction history.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* History List */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Bridge History</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalTransactions} transaction(s)
            </p>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-red-600 text-sm">{error}</div>
            ) : transactions.length === 0 ? (
              <div className="p-4 text-gray-500 dark:text-gray-400 text-sm text-center">
                No bridge transactions yet
              </div>
            ) : (
              transactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => handleTransactionClick(tx.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                    selectedTransaction?.id === tx.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {getChainName(tx.fromChainId)} → {getChainName(tx.toChainId)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getStatusBadgeColor(
                        tx.status
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={!canGoPrevious || loading}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Page {Math.min(currentPage, totalPages)} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!canGoNext || loading}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="lg:col-span-3">
        {selectedTransaction ? (
          <BridgeStatus transaction={selectedTransaction} />
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow overflow-hidden p-4">
            <p className="text-gray-500">Select a transaction to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
