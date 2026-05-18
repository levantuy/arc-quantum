'use client';

import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import {
  ARC_RPC_URL,
  ARC_SWAP_TOKENS,
  ARC_TESTNET_CHAIN_HEX,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_EXPLORER_URL,
} from '@/constants';
import { shortenAddress } from '@/utils';

type SwapTokenSymbol = (typeof ARC_SWAP_TOKENS)[number];

type QuoteState = {
  estimatedOutput: string;
  minimumReceived: string;
  fees: Array<{ token: string; amount: string; type: string }>;
  error: string | null;
};

type TxProgress = {
  hash: string;
  phase: 'pending' | 'confirming' | 'success' | 'failed';
  explorerUrl: string | null;
  submittedAt: string;
  errorMessage: string | null;
};

type HistoryItem = {
  id: number;
  hash: string;
  txType: string;
  from: string;
  to: string;
  amount: string;
  amountIn?: string | null;
  amountOut?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  chainId?: number | null;
  status: string;
  explorerUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
};

const kit = new AppKit();
const ARC_CHAIN = 'Arc_Testnet';
const PUBLIC_ARC_KIT_KEY = process.env.NEXT_PUBLIC_ARC_KIT_KEY ?? '';
const TOKEN_META: Record<SwapTokenSymbol, { name: string; accent: string }> = {
  USDC: { name: 'USD Coin', accent: '#0f8a7b' },
  EURC: { name: 'Euro Coin', accent: '#f47f60' },
  cirBTC: { name: 'Circle Bitcoin', accent: '#5a483d' },
};

function formatAmount(value: string | number | null | undefined, maximumFractionDigits = 6) {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numeric);
}

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unable to process the swap request.';
  }

  const message = error.message || 'Unable to process the swap request.';
  if (/user rejected|user denied|rejected the request/i.test(message)) {
    return 'The wallet action was canceled by the user.';
  }

  if (/Stablecoin Service createSwap failed: Maximum retry attempts \(3\) exceeded: Failed to fetch/i.test(message)) {
    return 'Unable to reach Stablecoin Service from the browser. A CORS workaround is already applied, please try again.';
  }

  return message;
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Submitting';
    case 'confirming':
      return 'Confirming';
    case 'success':
      return 'Success';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

async function ensureArcTestnet(provider: NonNullable<typeof window.ethereum>) {
  const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
  if (currentChainId?.toLowerCase() === ARC_TESTNET_CHAIN_HEX) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_TESTNET_CHAIN_HEX }],
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
          chainId: ARC_TESTNET_CHAIN_HEX,
          chainName: 'Arc Testnet',
          nativeCurrency: {
            name: 'USDC',
            symbol: 'USDC',
            decimals: 18,
          },
          rpcUrls: [ARC_RPC_URL],
          blockExplorerUrls: [ARC_TESTNET_EXPLORER_URL],
        },
      ],
    });
  }
}

export function SwapExperience() {
  const PAGE_SIZE = 6;
  const { address, connected, loading: walletLoading, connect } = useWallet();
  const walletAddress = connected ? address : null;
  const [fromToken, setFromToken] = useState<SwapTokenSymbol>('USDC');
  const [toToken, setToToken] = useState<SwapTokenSymbol>('EURC');
  const [amount, setAmount] = useState('1.00');
  const [slippage, setSlippage] = useState('0.5');
  const [quote, setQuote] = useState<QuoteState>({ estimatedOutput: '0', minimumReceived: '0', fees: [], error: null });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [txProgress, setTxProgress] = useState<TxProgress | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const totalPages = Math.max(Math.ceil(totalTransactions / PAGE_SIZE), 1);
  const canGoPreviousPage = currentPage > 1;
  const canGoNextPage = currentPage < totalPages;
  const slippageBps = useMemo(() => Math.round(Number(slippage || '0') * 100), [slippage]);
  const canRequestQuote = Boolean(walletAddress) && Boolean(amount) && fromToken !== toToken && Boolean(PUBLIC_ARC_KIT_KEY);
  const canSubmit = canRequestQuote && !quote.error && !busy;
  const totalFeeText = quote.fees.length
    ? quote.fees.map((fee) => `${fee.amount} ${fee.token} (${fee.type})`).join(' • ')
    : 'Arc will return fees when the quote is ready.';

  useEffect(() => {
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
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
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

  useEffect(() => {
    if (!walletAddress) {
      setHistory([]);
      setCurrentPage(1);
      setTotalTransactions(0);
      return;
    }

    void loadHistory(walletAddress, 1);
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress || !canRequestQuote) {
      setQuote((current) => ({ ...current, error: !PUBLIC_ARC_KIT_KEY ? 'Missing NEXT_PUBLIC_ARC_KIT_KEY to call Arc App Kit.' : null }));
      return;
    }

    let active = true;
    setQuoteLoading(true);
    setSwapError(null);

    const timer = window.setTimeout(() => {
      void estimateLiveQuote()
        .catch((error) => {
          if (!active) {
            return;
          }

          setQuote({ estimatedOutput: '0', minimumReceived: '0', fees: [], error: summarizeError(error) });
        })
        .finally(() => {
          if (active) {
            setQuoteLoading(false);
          }
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [walletAddress, fromToken, toToken, amount, slippage, canRequestQuote]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current);
      }
    };
  }, []);

  async function buildAdapter() {
    const provider = window.ethereum as any;
    if (!provider) {
      throw new Error('No EVM wallet detected in the browser.');
    }

    // Enforce Arc Testnet before App Kit actions to avoid viem switch errors
    // when users return with an already-connected wallet on another network.
    await ensureArcTestnet(provider);

    return createViemAdapterFromProvider({ provider });
  }

  async function estimateLiveQuote() {
    const adapter = await buildAdapter();
    const estimate = await kit.estimateSwap({
      from: { adapter, chain: ARC_CHAIN },
      tokenIn: fromToken,
      tokenOut: toToken,
      amountIn: amount,
      config: {
        kitKey: PUBLIC_ARC_KIT_KEY,
        slippageBps,
      },
    });

    setQuote({
      estimatedOutput: estimate.estimatedOutput.amount,
      minimumReceived: estimate.stopLimit.amount,
      fees: (estimate.fees ?? []).map((fee) => ({ token: fee.token, amount: fee.amount ?? '0', type: fee.type })),
      error: null,
    });
  }

  async function loadHistory(address: string, page: number = 1) {
    setHistoryLoading(true);
    setHistoryError(null);
    const offset = (page - 1) * PAGE_SIZE;

    try {
      const response = await fetch(
        `/api/history/list?address=${encodeURIComponent(address)}&type=swap&limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: 'no-store' }
      );
      const rawBody = await response.text();
      let data: { data?: { transactions?: HistoryItem[]; total?: number }; error?: string } = {};

      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as { data?: { transactions?: HistoryItem[]; total?: number }; error?: string };
        } catch {
          data = { error: 'Invalid server response.' };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load swap history.');
      }

      setHistory(data.data?.transactions ?? []);
      setTotalTransactions(data.data?.total ?? 0);
      setCurrentPage(page);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load history';
      setHistoryError(message);
      console.error('Swap history error:', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function pollTransaction(hash: string, explorerUrl: string | null) {
    const response = await fetch(`/api/tx/status/${hash}`, { cache: 'no-store' });
    const data = (await response.json()) as {
      status?: string;
      errorMessage?: string | null;
      explorerUrl?: string | null;
    };

    if (!response.ok) {
      throw new Error(data.errorMessage || 'Unable to check transaction status.');
    }

    const phase = (data.status as TxProgress['phase']) ?? 'pending';
    setTxProgress((current) =>
      current
        ? {
          ...current,
          phase,
          explorerUrl: data.explorerUrl ?? explorerUrl,
          errorMessage: data.errorMessage ?? null,
        }
        : current,
    );

    if (phase === 'pending' || phase === 'confirming') {
      pollingRef.current = window.setTimeout(() => {
        void pollTransaction(hash, explorerUrl);
      }, 2000);
      return;
    }

    if (walletAddress) {
      await loadHistory(walletAddress, currentPage);
    }
  }

  async function handleConfirmSwap() {
    setBusy(true);
    setSwapError(null);

    try {
      const adapter = await buildAdapter();
      const result = await kit.swap({
        from: { adapter, chain: ARC_CHAIN },
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        config: {
          kitKey: PUBLIC_ARC_KIT_KEY,
          slippageBps,
        },
      });

      const explorerUrl = 'explorerUrl' in result && typeof result.explorerUrl === 'string' ? result.explorerUrl : `${ARC_TESTNET_EXPLORER_URL}/tx/${result.txHash}`;
      await fetch('/api/tx/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: result.txHash,
          txType: 'swap',
          from: result.fromAddress,
          to: result.toAddress,
          amount,
          amountIn: amount,
          amountOut: result.amountOut ?? quote.estimatedOutput,
          tokenIn: fromToken,
          tokenOut: toToken,
          chainId: ARC_TESTNET_CHAIN_ID,
          explorerUrl,
        }),
      });

      setPreviewOpen(false);
      setTxProgress({
        hash: result.txHash,
        phase: 'pending',
        explorerUrl,
        submittedAt: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        errorMessage: null,
      });

      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current);
      }

      await pollTransaction(result.txHash, explorerUrl);
    } catch (error) {
      const message = summarizeError(error);
      setSwapError(message);
      setTxProgress((current) =>
        current
          ? {
            ...current,
            phase: 'failed',
            errorMessage: message,
          }
          : current,
      );
    } finally {
      setBusy(false);
    }
  }

  const handleHistoryPreviousPage = () => {
    if (!canGoPreviousPage || historyLoading) return;
    if (walletAddress) {
      void loadHistory(walletAddress, currentPage - 1);
    }
  };

  const handleHistoryNextPage = () => {
    if (!canGoNextPage || historyLoading) return;
    if (walletAddress) {
      void loadHistory(walletAddress, currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Swap</h2>
          <p className="text-gray-600 mt-2">Swap stablecoins on Arc Testnet with live quotes</p>
          {!PUBLIC_ARC_KIT_KEY ? (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Configure NEXT_PUBLIC_ARC_KIT_KEY so Arc App Kit can create quotes and swaps.
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
          {/* Swap Form Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Swap tokens</h3>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm font-semibold">
                {amount || '0'} {fromToken}
              </span>
            </div>

            {/* From token */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="from-token" className="text-sm font-medium text-gray-700">
                  From token
                </label>
                <span className="text-sm text-gray-500">{TOKEN_META[fromToken].name}</span>
              </div>
              <div className="flex gap-2">
                <select
                  id="from-token"
                  value={fromToken}
                  onChange={(event) => setFromToken(event.target.value as SwapTokenSymbol)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                >
                  {ARC_SWAP_TOKENS.map((token) => (
                    <option key={token} value={token}>
                      {token} - {TOKEN_META[token].name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.0001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="1.00"
                  className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Flip row */}
            <div className="flex items-center justify-between my-3">
              <span className="text-xs text-gray-500 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                Route: Arc Stablecoin Service
              </span>
              <button
                type="button"
                title="Flip pair"
                onClick={() => {
                  setFromToken(toToken);
                  setToToken(fromToken);
                }}
                className="p-1.5 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path stroke="#0f8a7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
              </button>
            </div>

            {/* To token */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="to-token" className="text-sm font-medium text-gray-700">
                  To token
                </label>
                <span className="text-sm text-gray-500">{TOKEN_META[toToken].name}</span>
              </div>
              <div className="flex gap-2">
                <select
                  id="to-token"
                  value={toToken}
                  onChange={(event) => setToToken(event.target.value as SwapTokenSymbol)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                >
                  {ARC_SWAP_TOKENS.filter((token) => token !== fromToken).map((token) => (
                    <option key={token} value={token}>
                      {token} - {TOKEN_META[token].name}
                    </option>
                  ))}
                </select>
                <div className="w-36 flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 font-semibold">
                  {quoteLoading ? 'Fetching...' : `${formatAmount(quote.estimatedOutput)} ${toToken}`}
                </div>
              </div>
            </div>

            {/* Slippage */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="slippage-input" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Slippage tolerance
                </label>
                <div className="flex gap-1 p-0.5 bg-gray-200 rounded-full">
                  {['0.5', '1.0', '2.0'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSlippage(preset)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer border-0 ${
                        preset === slippage
                          ? 'bg-white text-gray-900 shadow'
                          : 'bg-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="slippage-input"
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={slippage}
                onChange={(event) => setSlippage(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
              />
            </div>

            {fromToken === toToken ? (
              <p className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                From and to tokens must be different.
              </p>
            ) : null}
            {quote.error ? (
              <p className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {quote.error}
              </p>
            ) : null}
            {swapError ? (
              <p className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {swapError}
              </p>
            ) : null}

            {!connected ? (
              <button
                type="button"
                disabled={walletLoading}
                onClick={() => void connect()}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-br from-teal-600 to-teal-800 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer border-0"
              >
                {walletLoading ? 'Connecting...' : 'Connect wallet'}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => setPreviewOpen(true)}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-br from-teal-600 to-teal-800 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer border-0"
              >
                {busy ? 'Processing...' : 'Preview & sign'}
              </button>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Quote details */}
            <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Quote details</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quoteLoading ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {quoteLoading ? 'Syncing' : 'Live'}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Expected output</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatAmount(quote.estimatedOutput)} {toToken}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Minimum received</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatAmount(quote.minimumReceived)} {toToken}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Slippage</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {slippage}% ({slippageBps} bps)
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Fees</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{totalFeeText}</dd>
                </div>
              </dl>
            </div>

            {/* TX Status */}
            {txProgress ? (
              <div className="rounded-lg p-4 bg-[#143434] text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold">{statusLabel(txProgress.phase)}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/10 text-white/90">
                    {txProgress.phase}
                  </span>
                </div>
                <p className="text-xs text-white/75 mb-3">
                  TX: {shortenAddress(txProgress.hash, 6)} · at {txProgress.submittedAt}
                </p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-200 transition-all duration-300"
                    style={{
                      width:
                        txProgress.phase === 'pending'
                          ? '32%'
                          : txProgress.phase === 'confirming'
                            ? '72%'
                            : '100%',
                    }}
                  />
                </div>
                {txProgress.explorerUrl ? (
                  <a
                    className="inline-block mt-2 text-xs text-white/75 underline"
                    href={txProgress.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Arcscan
                  </a>
                ) : null}
                {txProgress.errorMessage ? (
                  <p className="mt-2 text-xs text-red-300">{txProgress.errorMessage}</p>
                ) : null}
              </div>
            ) : null}

            {/* Swap history */}
            <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Swap history</h3>

              {walletAddress ? (
                <>
                  {historyLoading ? (
                    <p className="text-sm text-gray-500 py-2">Loading...</p>
                  ) : historyError ? (
                    <p className="text-sm text-red-600 py-2">{historyError}</p>
                  ) : history.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 mb-2">{totalTransactions} transaction(s)</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map((item) => (
                          <div key={item.hash} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <strong className="text-sm text-gray-900">
                                {item.tokenIn} {'\u2192'} {item.tokenOut}
                              </strong>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  item.status === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {statusLabel(item.status)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.amountIn ?? item.amount} {item.tokenIn} → {item.amountOut ?? '--'} {item.tokenOut}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                              <span>{new Date(item.createdAt).toLocaleString('en-US')}</span>
                              {item.explorerUrl ? (
                                <a
                                  href={item.explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-teal-600 hover:underline"
                                >
                                  {shortenAddress(item.hash, 6)}
                                </a>
                              ) : (
                                <span>{shortenAddress(item.hash, 6)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                        <button
                          onClick={handleHistoryPreviousPage}
                          disabled={!canGoPreviousPage || historyLoading}
                          className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          ← Prev
                        </button>
                        <span className="text-xs text-gray-400">
                          Page {Math.min(currentPage, totalPages)} / {totalPages}
                        </span>
                        <button
                          onClick={handleHistoryNextPage}
                          disabled={!canGoNextPage || historyLoading}
                          className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No swap records yet.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Connect your wallet to load swap history.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen ? (
        <div
          className="fixed inset-0 p-6 bg-[rgba(20,52,52,0.42)] flex items-start justify-center overflow-y-auto z-50"
          role="presentation"
        >
          <div
            className="w-full max-w-lg mt-3 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-preview-title"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 id="swap-preview-title" className="text-xl font-bold text-gray-900">
                Confirm swap
              </h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500">You send</span>
                <strong className="block mt-1 text-lg text-gray-900">
                  {formatAmount(amount)} {fromToken}
                </strong>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500">You receive</span>
                <strong className="block mt-1 text-lg text-gray-900">
                  {formatAmount(quote.estimatedOutput)} {toToken}
                </strong>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Wallet</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {walletAddress ? shortenAddress(walletAddress) : '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Network</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">Arc Testnet</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Minimum received</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatAmount(quote.minimumReceived)} {toToken}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Fees</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{totalFeeText}</dd>
              </div>
            </dl>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition cursor-pointer border-0"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSwap()}
                disabled={busy}
                className="flex-1 py-2.5 px-4 bg-gradient-to-br from-teal-600 to-teal-800 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer border-0"
              >
                {busy ? 'Submitting...' : 'Confirm & sign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
