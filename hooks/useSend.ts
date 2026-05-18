'use client';

import { useState, useCallback } from 'react';
import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { useWallet } from '@/hooks/useWallet';
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL } from '@/constants';
import type { EIP1193Provider } from 'viem';

// ── Constants ─────────────────────────────────────────────────────────────────

const kit = new AppKit();
const APP_KIT_CHAIN = 'Arc_Testnet';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SendStep =
  | 'idle'
  | 'estimating'
  | 'estimated'
  | 'sending'
  | 'success'
  | 'error';

/** Matches EstimatedGas returned by kit.estimateSend() */
export interface SendEstimate {
  fee: string;        // human-readable fee string
  gas: bigint;        // gas units
  gasPrice: bigint;   // gas price in wei
}

/** Matches BridgeStep returned by kit.send() */
export interface SendResult {
  name: string;
  state: 'pending' | 'success' | 'error' | 'noop';
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
  error?: unknown;
}

export interface SendPayload {
  /** Recipient wallet address */
  to: string;
  /** Human-readable amount, e.g. "1.00" */
  amount: string;
  /** App Kit token identifier: "NATIVE", "USDC", or a 0x contract address */
  token: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSend() {
  const { address, connected } = useWallet();

  const [step, setStep] = useState<SendStep>('idle');
  const [estimate, setEstimate] = useState<SendEstimate | null>(null);
  const [txResult, setTxResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Obtain an App Kit adapter from the browser wallet provider */
  const getAdapter = async () => {
    const ethereum = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
    if (!ethereum) throw new Error('No wallet provider found in browser.');
    return createViemAdapterFromProvider({ provider: ethereum });
  };

  // ── estimateSend ──────────────────────────────────────────────────────────

  const estimateSend = useCallback(
    async (payload: SendPayload): Promise<SendEstimate | null> => {
      if (!connected || !address) {
        setError('Wallet not connected.');
        return null;
      }

      setStep('estimating');
      setError(null);
      setEstimate(null);

      try {
        const adapter = await getAdapter();
        // Use `as any` for chain string — same pattern as BridgeForm
        const result = await (kit as any).estimateSend({
          from: { adapter, chain: APP_KIT_CHAIN },
          to: payload.to,
          amount: payload.amount,
          token: payload.token,
        });
        setEstimate(result as SendEstimate);
        setStep('estimated');
        return result as SendEstimate;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gas estimation failed.';
        setError(message);
        setStep('error');
        return null;
      }
    },
    [connected, address],
  );

  // ── send ──────────────────────────────────────────────────────────────────

  const send = useCallback(
    async (payload: SendPayload): Promise<SendResult | null> => {
      if (!connected || !address) {
        setError('Wallet not connected.');
        return null;
      }

      setStep('sending');
      setError(null);

      try {
        const adapter = await getAdapter();
        const result = (await (kit as any).send({
          from: { adapter, chain: APP_KIT_CHAIN },
          to: payload.to,
          amount: payload.amount,
          token: payload.token,
        })) as SendResult;

        setTxResult(result);

        const isSuccess = result.state === 'success';
        setStep(isSuccess ? 'success' : 'error');
        if (!isSuccess) {
          setError('Transaction did not complete successfully.');
        }

        // Persist to backend (fire-and-forget), then notify history to refresh
        if (result.txHash) {
          const explorerUrl =
            result.explorerUrl ?? `${ARC_TESTNET_EXPLORER_URL}/tx/${result.txHash}`;
          fetch('/api/tx/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hash: result.txHash,
              txType: 'send',
              from: address,
              to: payload.to,
              amount: payload.amount,
              tokenIn: payload.token,
              chainId: ARC_TESTNET_CHAIN_ID,
              explorerUrl,
            }),
          })
            .then(() => {
              // Notify SendHistory to reload after record is saved
              window.dispatchEvent(new CustomEvent('send:confirmed'));
            })
            .catch(() => {
              /* fire-and-forget — do not block UI on backend failure */
            });
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed.';
        const isRejected = /user rejected|user denied|rejected the request/i.test(message);
        setError(isRejected ? 'Transaction was canceled in wallet.' : message);
        setStep('error');
        return null;
      }
    },
    [connected, address],
  );

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('idle');
    setEstimate(null);
    setTxResult(null);
    setError(null);
  }, []);

  return { step, estimate, txResult, error, estimateSend, send, reset };
}

