// BridgeStatus.tsx - UC-BRIDGE-002: Display bridge transaction status
'use client';

import React from 'react';
import { BridgeTransaction } from '@/types';
import { getChainName, getTokenSymbolByAddress } from '@/lib/bridge/config';

interface BridgeStatusProps {
  transaction: BridgeTransaction;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  pending: 'Pending',
  success: 'Completed',
  failed: 'Failed',
};

export const BridgeStatus: React.FC<BridgeStatusProps> = ({ transaction }) => {
  const tokenSymbol = getTokenSymbolByAddress(transaction.tokenAddress);

  const statusColor = STATUS_COLORS[transaction.status];
  const statusLabel = STATUS_LABELS[transaction.status];

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Transaction Status</h3>
        
        <div className="flex items-center justify-between mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">From</p>
            <p className="font-semibold">{getChainName(transaction.fromChainId)}</p>
          </div>
          
          <div className="flex-1 mx-4 border-t-2 border-gray-300"></div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">To</p>
            <p className="font-semibold">{getChainName(transaction.toChainId)}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Amount */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Amount</p>
          <p className="text-xl font-semibold">
            {transaction.amount} {tokenSymbol !== 'Unknown' ? tokenSymbol : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Token: {transaction.tokenAddress.slice(0, 6)}...{transaction.tokenAddress.slice(-4)}
          </p>
        </div>

        {/* Transaction Hashes */}
        {(transaction.txHashSource || transaction.txHashDest) && (
          <div className="space-y-3 mb-4">
            {transaction.txHashSource && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Source TX Hash</p>
                <p className="text-xs font-mono break-all text-blue-600">
                  {transaction.txHashSource}
                </p>
              </div>
            )}
            {transaction.txHashDest && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Destination TX Hash</p>
                <p className="text-xs font-mono break-all text-green-600">
                  {transaction.txHashDest}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {transaction.errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error: </span>
              {transaction.errorMessage}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>Created: {new Date(transaction.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(transaction.updatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
