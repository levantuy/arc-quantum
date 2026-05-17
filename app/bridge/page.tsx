// app/bridge/page.tsx - Bridge feature page
'use client';

import React, { useState } from 'react';
import { BridgeForm, BridgeHistory, BridgeTransactionDetail } from '@/components/bridge';

export default function BridgePage() {
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const handleTransferSuccess = (transactionId: number) => {
    setSelectedTransactionId(transactionId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Bridge</h2>
          <p className="text-gray-600 mt-2">
            Transfer tokens between different blockchain networks
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTransactionId(null)}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                selectedTransactionId === null
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Initiate Transfer
            </button>
            <button
              onClick={() => {}} // This stays visible, just click on a transaction
              className="px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-800 transition"
            >
              History & Status
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {selectedTransactionId === null ? (
            // Initiate Transfer Tab
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <BridgeForm onTransferSuccess={handleTransferSuccess} />
              </div>
              <div className="lg:col-span-3 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">How to Bridge</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li>1. Connect your EVM wallet (MetaMask, WalletConnect, etc.)</li>
                  <li>2. Select source and destination chains</li>
                  <li>3. Select token (USDC, ETH, BNB) and amount to transfer</li>
                  <li>4. Review the transaction and confirm with your wallet</li>
                  <li>5. Track your transaction in the History tab</li>
                </ol>
                <p className="text-xs text-blue-700 mt-4">
                  Note: Bridge transactions are processed on-chain and may take some time to complete.
                </p>
              </div>
            </div>
          ) : (
            // Transaction Detail Tab
            <>
              <button
                onClick={() => setSelectedTransactionId(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
              >
                ← Back to Initiate Transfer
              </button>
              <BridgeTransactionDetail transactionId={selectedTransactionId} />
            </>
          )}

          {/* History always visible */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
            <BridgeHistory
              selectedTransactionId={selectedTransactionId || undefined}
              onSelectTransaction={setSelectedTransactionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
