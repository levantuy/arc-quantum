'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSend, SendPayload, SendEstimate } from '@/hooks/useSend';
import { useWallet } from '@/hooks/useWallet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

// -- Helpers ------------------------------------------------------------------

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Format gas price from wei (bigint) to Gwei string */
function fmtGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  return gwei < 0.001 ? '< 0.001' : gwei.toFixed(3);
}

/** Display EstimatedGas from kit.estimateSend() */
function GasEstimatePanel({ estimate }: { estimate: SendEstimate }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300">Gas Estimate</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-slate-500 dark:text-slate-400">Estimated Fee</span>
        <span className="text-slate-800 dark:text-slate-200 font-medium">{estimate.fee} ARC</span>
        <span className="text-slate-500 dark:text-slate-400">Gas Units</span>
        <span className="text-slate-800 dark:text-slate-200">{estimate.gas.toLocaleString()}</span>
        <span className="text-slate-500 dark:text-slate-400">Gas Price</span>
        <span className="text-slate-800 dark:text-slate-200">{fmtGwei(estimate.gasPrice)} Gwei</span>
      </div>
    </div>
  );
}

// -- Token presets -------------------------------------------------------------

const TOKEN_PRESETS = [
  { label: 'ARC (Native)', value: 'NATIVE' },
  { label: 'USDC', value: 'USDC' },
] as const;

// -- Status badge --------------------------------------------------------------

const STATUS_CLASSES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  error:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

function StatusBadge({ state }: { state: string }) {
  const label =
    state === 'success' ? '✓ Confirmed' :
    state === 'error'   ? '✕ Failed'    :
    `⏳ ${state.charAt(0).toUpperCase() + state.slice(1)}`;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${STATUS_CLASSES[state] ?? STATUS_CLASSES.pending}`}>
      {label}
    </span>
  );
}

// -- Component -----------------------------------------------------------------

export function SendForm() {
  const { connected, address, connect, wrongNetwork, switchNetwork } = useWallet();
  const { step, estimate, txResult, error, estimateSend, send, reset } = useSend();
  const { showToast } = useToast();

  // Form state
  const [selectedToken, setSelectedToken] = useState<string>('NATIVE');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const lastEstimatedRef = useRef({ selectedToken, customTokenAddress, recipient, amount });

  // Patch window.fetch to strip x-user-agent for Circle API CORS preflight
  // (same technique as BridgeForm to avoid CORS rejection by api.circle.com)
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const url =
        typeof input === 'string'     ? input :
        input instanceof URL          ? input.toString() :
        (input as Request).url;
      if (!url.startsWith('https://api.circle.com/')) return originalFetch(input, init);
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      headers.delete('x-user-agent');
      headers.delete('X-User-Agent');
      if (input instanceof Request) return originalFetch(new Request(input, { ...init, headers }));
      return originalFetch(input, { ...init, headers });
    };
    window.fetch = patchedFetch;
    return () => { window.fetch = originalFetch; };
  }, []);

  // Reset estimate when form inputs change
  const hasFormChanged = useCallback(() => {
    const last = lastEstimatedRef.current;
    return (
      last.selectedToken !== selectedToken ||
      last.customTokenAddress !== customTokenAddress ||
      last.recipient !== recipient ||
      last.amount !== amount
    );
  }, [selectedToken, customTokenAddress, recipient, amount]);

  useEffect(() => {
    if ((step === 'estimated' || step === 'error') && hasFormChanged()) {
      reset();
    }
  }, [selectedToken, customTokenAddress, recipient, amount, step, hasFormChanged, reset]);

  // -- Derived values ------------------------------------------------------

  const isCustomToken = selectedToken === '__custom__';
  const effectiveToken = isCustomToken ? customTokenAddress : selectedToken;
  const tokenLabel = isCustomToken ? (customTokenAddress.slice(0, 8) + '…' + customTokenAddress.slice(-4) || 'ERC20') : selectedToken;

  const isFormBusy = step === 'estimating' || step === 'sending';
  const canEstimate =
    !isFormBusy &&
    step !== 'success' &&
    !(isCustomToken && !ADDRESS_REGEX.test(customTokenAddress));

  // -- Validation ----------------------------------------------------------

  function validateForm(): boolean {
    let ok = true;
    if (!ADDRESS_REGEX.test(recipient)) {
      setRecipientError('Invalid EVM address (0x + 40 hex characters).');
      ok = false;
    } else {
      setRecipientError(null);
    }
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) {
      setAmountError('Enter a positive amount.');
      ok = false;
    } else {
      setAmountError(null);
    }
    if (isCustomToken && !ADDRESS_REGEX.test(customTokenAddress)) {
      ok = false;
    }
    return ok;
  }

  function buildPayload(): SendPayload {
    return { to: recipient, amount, token: effectiveToken };
  }

  // -- Handlers -----------------------------------------------------------

  async function handleEstimate() {
    if (!validateForm()) return;
    lastEstimatedRef.current = { selectedToken, customTokenAddress, recipient, amount };
    await estimateSend(buildPayload());
  }

  async function handleSend() {
    if (!validateForm()) return;
    const result = await send(buildPayload());
    if (result?.state === 'success') {
      showToast('Transaction confirmed!', 'success');
    }
  }

  // -- Guard: wallet not connected -----------------------------------------

  if (!connected) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-8 text-center space-y-4">
        <p className="text-slate-600 dark:text-slate-400">Connect your wallet to send tokens.</p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  // -- Guard: wrong network ------------------------------------------------

  if (wrongNetwork) {
    return (
      <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 p-8 text-center space-y-4">
        <p className="text-yellow-800 dark:text-yellow-300">Please switch to Arc Testnet to send tokens.</p>
        <Button onClick={switchNetwork}>Switch to Arc Testnet</Button>
      </div>
    );
  }

  // -- Success panel -------------------------------------------------------

  if (step === 'success' && txResult) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Transaction Status</h2>
        <StatusBadge state="success" />
        <div className="rounded-lg bg-slate-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
          {txResult.txHash && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Tx Hash</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 break-all text-right">
                {txResult.txHash.slice(0, 14)}…{txResult.txHash.slice(-8)}
              </span>
            </div>
          )}
          {txResult.name && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Operation</span>
              <span className="text-slate-800 dark:text-slate-200 capitalize">{txResult.name}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {txResult.explorerUrl && (
            <a
              href={txResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline justify-center flex items-center gap-1"
            >
              View on Explorer →
            </a>
          )}
          <Button onClick={reset}>Send Another</Button>
        </div>
      </div>
    );
  }

  // -- Main form -----------------------------------------------------------

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Send Tokens</h2>

      {/* Token selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Token</label>
        <div className="flex gap-2 flex-wrap">
          {TOKEN_PRESETS.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={isFormBusy}
              onClick={() => setSelectedToken(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
                selectedToken === t.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            disabled={isFormBusy}
            onClick={() => setSelectedToken('__custom__')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 ${
              selectedToken === '__custom__'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
          >
            Other ERC20
          </button>
        </div>
        {isCustomToken && (
          <Input
            placeholder="Token contract address (0x + 40 hex characters)"
            value={customTokenAddress}
            onChange={(e) => setCustomTokenAddress(e.target.value)}
            disabled={isFormBusy}
            className={
              customTokenAddress && !ADDRESS_REGEX.test(customTokenAddress)
                ? 'border-red-400'
                : ''
            }
          />
        )}
      </div>

      {/* Recipient */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Recipient Address</label>
        <Input
          placeholder="0xFd71..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={isFormBusy}
        />
        {recipientError && <p className="text-xs text-red-500">{recipientError}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Amount <span className="font-normal text-slate-400 dark:text-slate-500">({tokenLabel})</span>
        </label>
        <Input
          type="number"
          min="0"
          step="any"
          placeholder="e.g. 1.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isFormBusy}
        />
        {amountError && <p className="text-xs text-red-500">{amountError}</p>}
      </div>

      {/* Gas estimate panel */}
      {step === 'estimating' && <Skeleton className="h-24 rounded-lg" />}
      {(step === 'estimated' || step === 'sending') && estimate && (
        <GasEstimatePanel estimate={estimate} />
      )}

      {/* Error message */}
      {step === 'error' && error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {step !== 'estimated' && step !== 'sending' ? (
          <Button onClick={handleEstimate} disabled={!canEstimate} className='flex-1 py-2.5 px-4 btn-primary'>
            {step === 'estimating' ? 'Estimating...' : 'Estimate Gas'}
          </Button>
        ) : (
          <>
            <Button onClick={handleSend} disabled={step === 'sending'} className='flex-1 py-2.5 px-4 btn-primary'>
              {step === 'sending' ? 'Sending...' : `Send ${tokenLabel}`}
            </Button>
            <button
              type="button"
              onClick={reset}
              disabled={step === 'sending'}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-transparent rounded hover:bg-slate-50 dark:hover:bg-gray-800 text-sm disabled:opacity-50"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
