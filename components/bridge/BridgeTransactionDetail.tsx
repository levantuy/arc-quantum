// BridgeTransactionDetail.tsx - UC-BRIDGE-003: Display transaction details with audit logs
'use client';

import React, { useEffect, useState } from 'react';
import { BridgeTransaction } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

interface BridgeLog {
  id: number;
  step: string;
  detail: Record<string, any> | null;
  createdAt: string;
}

interface BridgeTransactionDetailProps {
  transactionId: number;
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  init: 'Transaction Initialized',
  validate: 'Request Validated',
  check_balance: 'Balance Checked',
  check_bridge_support: 'Bridge Configuration Verified',
  lock_token: 'Token Locked on Source Chain',
  wait_source_confirmation: 'Waiting for Source Confirmation',
  source_tx_success: 'Source Chain Confirmed',
  mint_token: 'Token Minting on Destination',
  wait_dest_confirmation: 'Waiting for Destination Confirmation',
  dest_tx_success: 'Destination Chain Confirmed',
  completed: 'Transfer Completed',
  error: 'Error Occurred',
  retry: 'Retry Attempt',
};

const STEP_COLORS: Record<string, string> = {
  init: 'text-blue-600',
  validate: 'text-blue-600',
  check_balance: 'text-blue-600',
  check_bridge_support: 'text-blue-600',
  lock_token: 'text-yellow-600',
  wait_source_confirmation: 'text-yellow-600',
  source_tx_success: 'text-green-600',
  mint_token: 'text-yellow-600',
  wait_dest_confirmation: 'text-yellow-600',
  dest_tx_success: 'text-green-600',
  completed: 'text-green-600',
  error: 'text-red-600',
  retry: 'text-orange-600',
};

export const BridgeTransactionDetail: React.FC<BridgeTransactionDetailProps> = ({
  transactionId,
}) => {
  const [transaction, setTransaction] = useState<any>(null);
  const [logs, setLogs] = useState<BridgeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/bridge/${transactionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transaction details');
        }

        setTransaction(data.data);
        setLogs(data.data.logs || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load details';
        setError(message);
        console.error('Transaction detail error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    // Refresh every 10 seconds if pending
    const interval = setInterval(
      fetchDetails,
      transaction?.status === 'pending' ? 10000 : 60000
    );

    return () => clearInterval(interval);
  }, [transactionId, transaction?.status]);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Transaction not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transaction Overview */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-gray-100">Transaction #{transaction.id}</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              transaction.status === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                : transaction.status === 'failed'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
            }`}
          >
            {transaction.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
            <p className="text-lg font-semibold dark:text-gray-100">{transaction.amount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
            <p className="text-sm">
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {transaction.errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              <span className="font-semibold">Error:</span> {transaction.errorMessage}
            </p>
          </div>
        )}

        {transaction.status === 'failed' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            Please re-initiate this bridge from the Bridge form. Server-side retry is disabled in App Kit frontend mode.
          </div>
        )}
      </div>

      {/* Processing Steps/Logs */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow">
        <h3 className="text-lg font-bold dark:text-gray-100 mb-6">Processing Steps</h3>

        {logs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No processing logs available yet</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      log.step === 'error'
                        ? 'bg-red-500'
                        : log.step === 'completed'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                  ></div>
                  {index < logs.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 my-2"></div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-4">
                  <p className={`font-semibold ${STEP_COLORS[log.step] || 'text-gray-800'}`}>
                    {STEP_DESCRIPTIONS[log.step] || log.step}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </p>

                  {log.detail && Object.keys(log.detail).length > 0 && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        View details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32 dark:text-gray-300">
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
