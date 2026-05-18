'use client';

import { useEffect, useRef, useState } from 'react';
import { useWalletStore } from '@/stores/wallet';
import { shortenAddress } from '@/utils';

type SwapToken = {
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  liquidityDepth: number;
  accent: string;
};

type QuoteSnapshot = {
  route: string;
  exchangeRate: number;
  expectedOutput: number;
  minimumReceived: number;
  priceImpact: number;
  lpFee: number;
  gasUsd: number;
  warning: string | null;
  error: string | null;
};

type TxProgress = {
  hash: string;
  phase: 'pending' | 'confirming' | 'success';
  confirmations: string;
  submittedAt: string;
};

const TOKENS: SwapToken[] = [
  {
    symbol: 'ARC',
    name: 'Arc Native',
    balance: 18.42,
    priceUsd: 2.34,
    liquidityDepth: 2800,
    accent: '#0f8a7b',
  },
  {
    symbol: 'AUSD',
    name: 'Arc USD',
    balance: 1240.16,
    priceUsd: 1,
    liquidityDepth: 86000,
    accent: '#f47f60',
  },
  {
    symbol: 'QBIT',
    name: 'Quantum Bit',
    balance: 542.8,
    priceUsd: 0.62,
    liquidityDepth: 21000,
    accent: '#195f58',
  },
  {
    symbol: 'NOVA',
    name: 'Nova Energy',
    balance: 83.27,
    priceUsd: 4.18,
    liquidityDepth: 1400,
    accent: '#aa5f29',
  },
];

function formatTokenAmount(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildQuote(fromToken: SwapToken, toToken: SwapToken, amountText: string, slippageText: string): QuoteSnapshot {
  const amount = Number(amountText);
  const slippage = Number(slippageText);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      route: `${fromToken.symbol} -> AUSD -> ${toToken.symbol}`,
      exchangeRate: fromToken.priceUsd / toToken.priceUsd,
      expectedOutput: 0,
      minimumReceived: 0,
      priceImpact: 0,
      lpFee: 0,
      gasUsd: 0.86,
      warning: null,
      error: 'Enter an amount greater than 0 to get a quote.',
    };
  }

  if (!Number.isFinite(slippage) || slippage < 0.1 || slippage > 5) {
    return {
      route: `${fromToken.symbol} -> AUSD -> ${toToken.symbol}`,
      exchangeRate: fromToken.priceUsd / toToken.priceUsd,
      expectedOutput: 0,
      minimumReceived: 0,
      priceImpact: 0,
      lpFee: 0,
      gasUsd: 0.86,
      warning: null,
      error: 'Slippage must be between 0.1% and 5%.',
    };
  }

  if (amount > fromToken.balance) {
    return {
      route: `${fromToken.symbol} -> AUSD -> ${toToken.symbol}`,
      exchangeRate: fromToken.priceUsd / toToken.priceUsd,
      expectedOutput: 0,
      minimumReceived: 0,
      priceImpact: 0,
      lpFee: amount * 0.0015,
      gasUsd: 0.86,
      warning: null,
      error: 'Insufficient balance to execute this trade.',
    };
  }

  const exchangeRate = fromToken.priceUsd / toToken.priceUsd;
  const rawOutput = amount * exchangeRate;
  const priceImpact = Math.min(9.8, (amount / fromToken.liquidityDepth) * 44);
  const expectedOutput = rawOutput * (1 - priceImpact / 100);
  const minimumReceived = expectedOutput * (1 - slippage / 100);
  const lpFee = amount * 0.0015;
  const gasUsd = 0.86;
  const hasLowLiquidity = amount > fromToken.liquidityDepth * 0.18;

  return {
    route: `${fromToken.symbol} -> AUSD -> ${toToken.symbol}`,
    exchangeRate,
    expectedOutput,
    minimumReceived,
    priceImpact,
    lpFee,
    gasUsd,
    warning: priceImpact > 5 ? 'Price impact is high. Review slippage before signing.' : null,
    error: hasLowLiquidity ? 'Insufficient liquidity for this token pair at the current trade size.' : null,
  };
}

function createTxHash() {
  const randomChunk = crypto.randomUUID().replace(/-/g, '');
  return `0x${randomChunk.padEnd(64, '0').slice(0, 64)}`;
}

export function SwapWorkspace() {
  const { address, connected, setAddress, setConnected } = useWalletStore();
  const [fromSymbol, setFromSymbol] = useState('ARC');
  const [toSymbol, setToSymbol] = useState('AUSD');
  const [amount, setAmount] = useState('1.25');
  const [slippage, setSlippage] = useState('0.5');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [txProgress, setTxProgress] = useState<TxProgress | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  const fromToken = TOKENS.find((token) => token.symbol === fromSymbol) ?? TOKENS[0];
  const toToken = TOKENS.find((token) => token.symbol === toSymbol) ?? TOKENS[1];
  const quote = buildQuote(fromToken, toToken, amount, slippage);
  const amountValue = Number(amount);
  const totalUsd = Number.isFinite(amountValue) ? amountValue * fromToken.priceUsd : 0;
  const canSubmit = connected && !quote.error && fromToken.symbol !== toToken.symbol;

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function scheduleProgressUpdate(callback: () => void, delay: number) {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutRefs.current.push(timeoutId);
  }

  async function handleConnectWallet() {
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        alert('MetaMask or Web3 wallet not found. Please install a wallet extension.');
        return;
      }

      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setConnected(true);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      alert(error.message || 'Failed to connect wallet');
    }
  }

  function handleFromTokenChange(nextSymbol: string) {
    setFromSymbol(nextSymbol);

    if (nextSymbol === toSymbol) {
      const fallback = TOKENS.find((token) => token.symbol !== nextSymbol);
      if (fallback) {
        setToSymbol(fallback.symbol);
      }
    }
  }

  function handleToTokenChange(nextSymbol: string) {
    if (nextSymbol === fromSymbol) {
      const fallback = TOKENS.find((token) => token.symbol !== fromSymbol && token.symbol !== nextSymbol);
      setToSymbol(fallback?.symbol ?? nextSymbol);
      return;
    }

    setToSymbol(nextSymbol);
  }

  function handleFlipPair() {
    setFromSymbol(toToken.symbol);
    setToSymbol(fromToken.symbol);
  }

  function handleUseMax() {
    setAmount(String(fromToken.balance));
  }

  function handleConfirmSwap() {
    const submittedAt = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setPreviewOpen(false);
    setTxProgress({
      hash: createTxHash(),
      phase: 'pending',
      confirmations: '0/12',
      submittedAt,
    });

    scheduleProgressUpdate(() => {
      setTxProgress((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          phase: 'confirming',
          confirmations: '7/12',
        };
      });
    }, 1800);

    scheduleProgressUpdate(() => {
      setTxProgress((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          phase: 'success',
          confirmations: '12/12',
        };
      });
    }, 3600);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Swap (Demo)</h2>
          <p className="text-gray-600 mt-2">
            Swap tokens on Arc with a production-ready UX flow.
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Quote latency</p>
            <strong className="block mt-1 text-lg text-gray-900">&lt; 1 second</strong>
            <p className="text-sm text-gray-500 mt-1">
              Price and route data are computed on the client so users can decide quickly.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Slippage guard</p>
            <strong className="block mt-1 text-lg text-gray-900">0.1% - 5%</strong>
            <p className="text-sm text-gray-500 mt-1">
              SRS-aligned constraints prevent swaps outside the MVP safety threshold.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Liquidity signal</p>
            <strong className="block mt-1 text-lg text-gray-900">Early warning</strong>
            <p className="text-sm text-gray-500 mt-1">
              Liquidity is simulated to block infeasible quotes before signing.
            </p>
          </div>
        </div>

        {/* Wallet banner */}
        <div className="mb-6">
          {connected && address ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-sm text-teal-700">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Connected: {shortenAddress(address)}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectWallet}
              className="px-4 py-2 btn-primary text-sm"
            >
              Connect wallet
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
          {/* Swap Form */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Swap form</p>
                <h3 className="text-xl font-bold text-gray-900">Build transaction</h3>
              </div>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm font-semibold">
                {formatCurrency(totalUsd || 0)}
              </span>
            </div>

            {/* From token */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="ws-from-token" className="text-sm font-medium text-gray-700">
                  From token
                </label>
                <span className="text-sm text-gray-500">
                  Balance: {formatTokenAmount(fromToken.balance)} {fromToken.symbol}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  id="ws-from-token"
                  value={fromToken.symbol}
                  onChange={(event) => handleFromTokenChange(event.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                >
                  {TOKENS.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
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
                  placeholder="0.00"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={handleUseMax}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Flip row */}
            <div className="flex items-center justify-between my-3">
              <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                Estimated route: {quote.route}
              </span>
              <button
                type="button"
                onClick={handleFlipPair}
                className="p-1.5 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 transition cursor-pointer text-sm text-gray-600"
              >
                ⇅ Swap pair
              </button>
            </div>

            {/* To token */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="ws-to-token" className="text-sm font-medium text-gray-700">
                  To token
                </label>
                <span className="text-sm text-gray-500">
                  Estimated: {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  id="ws-to-token"
                  value={toToken.symbol}
                  onChange={(event) => handleToTokenChange(event.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                >
                  {TOKENS.filter((token) => token.symbol !== fromToken.symbol).map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
                <div className="w-36 flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-900 font-semibold">
                  {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
                </div>
              </div>
            </div>

            {/* Slippage */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Protection</p>
                  <h4 className="text-sm font-semibold text-gray-700">Slippage tolerance</h4>
                </div>
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
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={slippage}
                onChange={(event) => setSlippage(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
              />
            </div>

            {quote.error ? (
              <p className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {quote.error}
              </p>
            ) : null}
            {!quote.error && quote.warning ? (
              <p className="mb-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {quote.warning}
              </p>
            ) : null}
            {!connected ? (
              <p className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Connect your wallet before opening preview and signing.
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => setPreviewOpen(true)}
              className="w-full mt-2 py-2.5 px-4 btn-primary"
            >
              Preview transaction
            </button>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Quote details */}
            <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Market snapshot</p>
                  <h3 className="text-lg font-bold text-gray-900">Quote details</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                  Live mock
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Exchange rate</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    1 {fromToken.symbol} = {formatTokenAmount(quote.exchangeRate)} {toToken.symbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Min received</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatTokenAmount(quote.minimumReceived)} {toToken.symbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">LP fee</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatTokenAmount(quote.lpFee)} {fromToken.symbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Gas estimate</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(quote.gasUsd)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Price impact</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatTokenAmount(quote.priceImpact)}%
                  </dd>
                </div>
              </dl>
            </div>

            {/* Business rules */}
            <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Execution guardrails</p>
                <h3 className="text-lg font-bold text-gray-900">Business rules</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 list-disc pl-4">
                <li>From token and to token must be different.</li>
                <li>Show a warning when price impact exceeds 5%.</li>
                <li>Block trades when balance or liquidity is insufficient.</li>
                <li>Preview summarizes route, fees, and minimum received before signing.</li>
              </ul>
            </div>

            {/* TX status */}
            {txProgress ? (
              <div className="rounded-lg p-4 bg-[#143434] text-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wide">Transaction status</p>
                    <h3 className="text-base font-bold">
                      {txProgress.phase === 'pending'
                        ? 'Submitting transaction'
                        : txProgress.phase === 'confirming'
                          ? 'Confirming on-chain'
                          : 'Swap successful'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/10 text-white/90">
                    {txProgress.confirmations}
                  </span>
                </div>
                <p className="text-xs text-white/75 mb-3">
                  TX hash: {shortenAddress(txProgress.hash, 6)} · At {txProgress.submittedAt}
                </p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-200 transition-all duration-300"
                    style={{
                      width:
                        txProgress.phase === 'pending'
                          ? '24%'
                          : txProgress.phase === 'confirming'
                            ? '72%'
                            : '100%',
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/65">
                  {txProgress.phase === 'success'
                    ? 'Balance and history can be refreshed in the next API integration step.'
                    : 'Status is currently simulated for the Swap module UI/UX slice.'}
                </p>
              </div>
            ) : null}
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
            aria-labelledby="ws-preview-title"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Preview</p>
                <h2 id="ws-preview-title" className="text-xl font-bold text-gray-900">
                  Confirm swap transaction
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer border-0 text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500">You send</span>
                <strong className="block mt-1 text-lg text-gray-900">
                  {formatTokenAmount(amountValue)} {fromToken.symbol}
                </strong>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500">You receive</span>
                <strong className="block mt-1 text-lg text-gray-900">
                  {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
                </strong>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Route</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{quote.route}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Minimum received</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatTokenAmount(quote.minimumReceived)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Exchange rate</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  1 {fromToken.symbol} = {formatTokenAmount(quote.exchangeRate)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Estimated fee</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCurrency(quote.gasUsd + quote.lpFee * fromToken.priceUsd)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Price impact</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatTokenAmount(quote.priceImpact)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Slippage</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{slippage}%</dd>
              </div>
            </dl>

            {quote.warning ? (
              <p className="mb-4 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {quote.warning}
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition cursor-pointer border-0"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSwap}
                className="flex-1 py-2.5 px-4 btn-primary"
              >
                Confirm and sign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
