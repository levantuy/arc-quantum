// BridgeForm.tsx - UC-BRIDGE-001: Form to initiate bridge transfer
'use client';

import React, { useState } from 'react';
import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useWallet } from '@/hooks/useWallet';
import {
  BRIDGE_SUPPORTED_CHAINS,
  BRIDGE_TOKEN_OPTIONS,
  BridgeTokenSymbol,
  getTokenAddress,
} from '@/lib/bridge/config';
import { ARC_RPC_URL, ARC_TESTNET_EXPLORER_URL, ARC_TESTNET_CHAIN_ID } from '@/constants';

type Eip1193ProviderLike = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

type BridgeStepLike = {
  name?: string;
  state?: string;
  txHash?: string;
  data?: {
    txHash?: string;
    explorerUrl?: string;
  } | null;
};

type BridgeResultLike = {
  status?: 'pending' | 'success' | 'failed' | string;
  txHash?: string;
  steps?: BridgeStepLike[];
};

const kit = new AppKit();
const PUBLIC_ARC_KIT_KEY = process.env.NEXT_PUBLIC_ARC_KIT_KEY ?? '';

const APP_KIT_CHAIN_BY_ID: Record<number, string> = {
  [ARC_TESTNET_CHAIN_ID]: 'Arc_Testnet',
  84532: 'Base_Sepolia',
  11155111: 'Ethereum_Sepolia',
};

const CHAIN_METADATA_BY_ID: Record<
  number,
  {
    chainIdHex: string;
    chainName: string;
    rpcUrls: string[];
    explorerUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
  }
> = {
  [ARC_TESTNET_CHAIN_ID]: {
    chainIdHex: '0x4cef52',
    chainName: 'Arc Testnet',
    rpcUrls: [ARC_RPC_URL],
    explorerUrls: [ARC_TESTNET_EXPLORER_URL],
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  },
  84532: {
    chainIdHex: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrls: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'],
    explorerUrls: ['https://sepolia.basescan.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  11155111: {
    chainIdHex: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    rpcUrls: [process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'],
    explorerUrls: ['https://sepolia.etherscan.io'],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
};

function summarizeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Transfer failed';
  }

  if (/user rejected|user denied|rejected the request/i.test(error.message)) {
    return 'Bridge transaction was canceled in wallet.';
  }

  return error.message || 'Transfer failed';
}

function extractTxHashes(result: BridgeResultLike) {
  const steps = Array.isArray(result.steps) ? result.steps : [];
  const successfulHashes = steps
    .filter((step) => step.state === 'success')
    .map((step) => step.txHash || step.data?.txHash || null)
    .filter((hash): hash is string => Boolean(hash));

  if (successfulHashes.length === 0) {
    return {
      txHashSource: result.txHash || null,
      txHashDest: null,
    };
  }

  return {
    txHashSource: successfulHashes[0] || null,
    txHashDest:
      successfulHashes.length > 1
        ? successfulHashes[successfulHashes.length - 1]
        : null,
  };
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (value && typeof value === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      converted[key] = toJsonSafe(item);
    }
    return converted;
  }

  return value;
}

async function ensureChain(provider: Eip1193ProviderLike, chainId: number) {
  const metadata = CHAIN_METADATA_BY_ID[chainId];
  if (!metadata) {
    throw new Error(`Unsupported chain id: ${chainId}`);
  }

  const currentChainId = String(
    await provider.request({ method: 'eth_chainId' })
  ).toLowerCase();

  if (currentChainId === metadata.chainIdHex.toLowerCase()) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: metadata.chainIdHex }],
    });
  } catch (error) {
    const switchError = error as { code?: number };

    if (switchError.code !== 4902) {
      throw error;
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: metadata.chainIdHex,
          chainName: metadata.chainName,
          rpcUrls: metadata.rpcUrls,
          blockExplorerUrls: metadata.explorerUrls,
          nativeCurrency: metadata.nativeCurrency,
        },
      ],
    });
  }
}

interface BridgeFormProps {
  onTransferSuccess?: (transactionId: number) => void;
}

export const BridgeForm: React.FC<BridgeFormProps> = ({ onTransferSuccess }) => {
  const { address, connected } = useWallet();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fromChainId: String(BRIDGE_SUPPORTED_CHAINS[0]?.id ?? ''),
    toChainId: String(BRIDGE_SUPPORTED_CHAINS[1]?.id ?? ''),
    tokenSymbol: BRIDGE_TOKEN_OPTIONS[0] as BridgeTokenSymbol,
    amount: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  React.useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (!requestUrl.startsWith('https://api.circle.com/')) {
        return originalFetch(input, init);
      }

      const mergedHeaders = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );

      // Circle CORS preflight does not allow X-User-Agent in browser requests.
      mergedHeaders.delete('x-user-agent');
      mergedHeaders.delete('X-User-Agent');

      if (input instanceof Request) {
        return originalFetch(new Request(input, { ...init, headers: mergedHeaders }));
      }

      return originalFetch(input, { ...init, headers: mergedHeaders });
    };

    window.fetch = patchedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const validateForm = (): boolean => {
    if (!address) {
      showToast('Please connect wallet first', 'error');
      return false;
    }

    if (formData.fromChainId === formData.toChainId) {
      showToast('Source and destination chains must be different', 'error');
      return false;
    }

    if (!formData.tokenSymbol) {
      showToast('Please select a token', 'error');
      return false;
    }

    if (parseFloat(formData.amount) <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return false;
    }

    if (formData.tokenSymbol !== 'USDC') {
      showToast('Arc App Kit bridge currently supports USDC in this flow', 'error');
      return false;
    }

    const fromChainName = APP_KIT_CHAIN_BY_ID[parseInt(formData.fromChainId, 10)];
    const toChainName = APP_KIT_CHAIN_BY_ID[parseInt(formData.toChainId, 10)];
    if (!fromChainName || !toChainName) {
      showToast('Selected chain is not supported by Arc App Kit bridge', 'error');
      return false;
    }

    return true;
  };

  const persistHistory = async (payload: {
    fromChainId: number;
    toChainId: number;
    tokenAddress: `0x${string}`;
    amount: string;
    status: 'pending' | 'success' | 'failed';
    txHashSource?: string | null;
    txHashDest?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
  }) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const requestBody = toJsonSafe({
      userAddress: address,
      ...payload,
    });

    const response = await fetch('/api/bridge/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save bridge history');
    }

    return data.data as { id: number };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const fromChainId = parseInt(formData.fromChainId, 10);
      const toChainId = parseInt(formData.toChainId, 10);
      const fromChain = APP_KIT_CHAIN_BY_ID[fromChainId];
      const toChain = APP_KIT_CHAIN_BY_ID[toChainId];

      if (!fromChain || !toChain) {
        throw new Error('Invalid chain selection for Arc App Kit bridge');
      }

      const ethereum = (window as Window & { ethereum?: Eip1193ProviderLike }).ethereum;
      if (!ethereum) {
        throw new Error('No EVM wallet detected in browser');
      }

      await ensureChain(ethereum, fromChainId);

      const adapter = await createViemAdapterFromProvider({ provider: ethereum as any });
      const tokenAddress = getTokenAddress(
        fromChainId,
        formData.tokenSymbol
      );

      const result = (await kit.bridge({
        from: { adapter, chain: fromChain as any },
        to: { adapter, chain: toChain as any },
        amount: formData.amount,
        ...(PUBLIC_ARC_KIT_KEY
          ? {
              config: {
                kitKey: PUBLIC_ARC_KIT_KEY,
              },
            }
          : {}),
      } as any)) as BridgeResultLike;
      const { txHashSource, txHashDest } = extractTxHashes(result);

      const saved = await persistHistory({
        fromChainId,
        toChainId,
        tokenAddress,
        amount: formData.amount,
        status:
          result.status === 'pending' || result.status === 'failed' || result.status === 'success'
            ? result.status
            : 'success',
        txHashSource,
        txHashDest,
        metadata: {
          steps: result.steps || [],
        },
      });

      showToast('Transfer initiated successfully!', 'success');
      
      // Clear form
      setFormData({
        fromChainId: String(BRIDGE_SUPPORTED_CHAINS[0]?.id ?? ''),
        toChainId: String(BRIDGE_SUPPORTED_CHAINS[1]?.id ?? ''),
        tokenSymbol: BRIDGE_TOKEN_OPTIONS[0] as BridgeTokenSymbol,
        amount: '',
      });

      if (onTransferSuccess) {
        onTransferSuccess(saved.id);
      }
    } catch (error) {
      const message = summarizeError(error);

      try {
        if (address && parseFloat(formData.amount) > 0 && formData.fromChainId !== formData.toChainId) {
          await persistHistory({
            fromChainId: parseInt(formData.fromChainId, 10),
            toChainId: parseInt(formData.toChainId, 10),
            tokenAddress: getTokenAddress(parseInt(formData.fromChainId, 10), formData.tokenSymbol),
            amount: formData.amount,
            status: 'failed',
            errorMessage: message,
          });
        }
      } catch (persistError) {
        console.error('Failed to persist bridge failure history:', persistError);
      }

      showToast(message, 'error');
      console.error('Bridge transfer error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-800">Please connect your wallet to use the bridge.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Bridge Tokens</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="flex items-end gap-2">
          {/* From Chain */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Chain
            </label>
            <select
              name="fromChainId"
              value={formData.fromChainId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BRIDGE_SUPPORTED_CHAINS.map((chain) => (
                <option
                  key={chain.id}
                  value={chain.id}
                  disabled={String(chain.id) === formData.toChainId}
                >
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            aria-label="Swap chains"
            className="mb-6 p-2 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                fromChainId: prev.toChainId,
                toChainId: prev.fromChainId,
              }));
            }}
            title="Đảo chiều chain"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 17H20M20 17v-6m0 6l-4 4M16 7H4m0 0V13m0-6l4-4"/>
            </svg>
          </button>

          {/* To Chain */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Chain
            </label>
            <select
              name="toChainId"
              value={formData.toChainId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BRIDGE_SUPPORTED_CHAINS.map((chain) => (
                <option
                  key={chain.id}
                  value={chain.id}
                  disabled={String(chain.id) === formData.fromChainId}
                >
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token
          </label>
          <select
            name="tokenSymbol"
            value={formData.tokenSymbol}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {BRIDGE_TOKEN_OPTIONS.filter((token) => token === 'USDC').map((token) => (
              <option key={token} value={token}>
                {token}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <Input
            type="number"
            name="amount"
            placeholder="0.0"
            value={formData.amount}
            onChange={handleInputChange}
            step="0.01"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 btn-primary"
        >
          {loading ? 'Processing...' : 'Initiate Transfer'}
        </Button>
      </form>

    </div>
  );
};
