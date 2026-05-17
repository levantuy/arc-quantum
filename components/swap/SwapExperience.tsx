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
import styles from './SwapExperience.module.css';

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
    : 'Arc se tra ve phi khi co estimate.';

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
    <main className={styles.pageShell}>
      <section className={styles.heroPanel}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>Arc Swap Integration</span>
          <p>Real swaps with browser wallets, live quotes, and on-chain polling.</p>
          {!PUBLIC_ARC_KIT_KEY ? <p className={styles.warningText}>Configure NEXT_PUBLIC_ARC_KIT_KEY so Arc App Kit can create quotes and swaps.</p> : null}
        </div>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.swapCard}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>Swap form</p>
              <h2>Execute transaction</h2>
            </div>
            <div className={styles.inlineStat}>{amount || '0'} {fromToken}</div>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="from-token">From token</label>
              <span>{TOKEN_META[fromToken].name}</span>
            </div>
            <div className={styles.inputGroup}>
              <select
                id="from-token"
                className={styles.selectInput}
                value={fromToken}
                onChange={(event) => setFromToken(event.target.value as SwapTokenSymbol)}
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
                className={styles.amountInput}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1.00"
              />
            </div>
          </div>

          <div className={styles.flipRow}>
            <div className={styles.routeHint}>Route: Arc Stablecoin Service</div>
            <button
              type="button"
              className={styles.flipButton} style={{marginTop: '4px'}}
              onClick={() => {
                setFromToken(toToken);
                setToToken(fromToken);
              }}
              title="Flip pair"
            >
              ⇅ 
            </button>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="to-token">To token</label>
              <span>{TOKEN_META[toToken].name}</span>
            </div>
            <div className={styles.inputGroup}>
              <select
                id="to-token"
                className={styles.selectInput}
                value={toToken}
                onChange={(event) => setToToken(event.target.value as SwapTokenSymbol)}
              >
                {ARC_SWAP_TOKENS.filter((token) => token !== fromToken).map((token) => (
                  <option key={token} value={token}>
                    {token} - {TOKEN_META[token].name}
                  </option>
                ))}
              </select>
              <div className={styles.outputBox}>
                {quoteLoading ? 'Fetching quote...' : `${formatAmount(quote.estimatedOutput)} ${toToken}`}
              </div>
            </div>
          </div>

          <div className={styles.settingsPanel}>
            <div className={styles.settingsHeader}>
              <div>
                <p className={styles.eyebrow}>Protection</p>
                <h3>Slippage tolerance</h3>
              </div>
              <div className={styles.segmentedRow}>
                {['0.5', '1.0', '2.0'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={preset === slippage ? styles.segmentActive : styles.segmentButton}
                    onClick={() => setSlippage(preset)}
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
              className={styles.amountInput}
              value={slippage}
              onChange={(event) => setSlippage(event.target.value)}
            />
          </div>

          {fromToken === toToken ? <p className={styles.errorText}>From and to tokens must be different.</p> : null}
          {quote.error ? <p className={styles.errorText}>{quote.error}</p> : null}
          {swapError ? <p className={styles.errorText}>{swapError}</p> : null}

          {!connected ? (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={walletLoading}
              onClick={() => void connect()}
            >
              {walletLoading ? 'Connecting...' : 'Connect wallet'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!canSubmit}
              onClick={() => setPreviewOpen(true)}
            >
              {busy ? 'Processing...' : 'Preview and sign transaction'}
            </button>
          )}
        </article>

        <div className={styles.sideColumn}>
          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Live estimate</p>
                <h2>Quote details</h2>
              </div>
              <div className={styles.pulseBadge}>{quoteLoading ? 'Syncing' : 'Live'}</div>
            </div>

            <dl className={styles.detailList}>
              <div>
                <dt>Expected output</dt>
                <dd>{formatAmount(quote.estimatedOutput)} {toToken}</dd>
              </div>
              <div>
                <dt>Minimum received</dt>
                <dd>{formatAmount(quote.minimumReceived)} {toToken}</dd>
              </div>
              <div>
                <dt>Slippage</dt>
                <dd>{slippage}% ({slippageBps} bps)</dd>
              </div>
              <div>
                <dt>Fee breakdown</dt>
                <dd>{totalFeeText}</dd>
              </div>
            </dl>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Swap history</p>
                <h2>Recent transactions</h2>
              </div>
            </div>

            {walletAddress ? (
              <>
                {historyLoading ? (
                  <div className={styles.historyList}>
                    <p className={styles.noticeText}>Loading transactions...</p>
                  </div>
                ) : historyError ? (
                  <p className={styles.noticeText}>{historyError}</p>
                ) : history.length > 0 ? (
                  <>
                    <div className={styles.historyList}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                        {totalTransactions} transaction(s)
                      </div>
                      {history.map((item) => (
                        <article key={item.hash} className={styles.historyItem}>
                          <div className={styles.historyTopRow}>
                            <strong>
                              {item.tokenIn} {'\u2192'} {item.tokenOut}
                            </strong>
                            <span className={item.status === 'success' ? styles.statusSuccess : item.status === 'failed' ? styles.statusFailed : styles.statusPending}>
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          <p>
                            {item.amountIn ?? item.amount} {item.tokenIn} → {item.amountOut ?? '--'} {item.tokenOut}
                          </p>
                          <div className={styles.historyMeta}>
                            <span>{new Date(item.createdAt).toLocaleString('en-US')}</span>
                            {item.explorerUrl ? (
                              <a href={item.explorerUrl} target="_blank" rel="noreferrer">
                                {shortenAddress(item.hash, 6)}
                              </a>
                            ) : (
                              <span>{shortenAddress(item.hash, 6)}</span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', marginTop: '0.75rem' }}>
                      <button
                        onClick={handleHistoryPreviousPage}
                        disabled={!canGoPreviousPage || historyLoading}
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          color: '#374151',
                          backgroundColor: '#fff',
                          cursor: !canGoPreviousPage || historyLoading ? 'not-allowed' : 'pointer',
                          opacity: !canGoPreviousPage || historyLoading ? 0.5 : 1,
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                        Page {Math.min(currentPage, totalPages)} / {totalPages}
                      </span>
                      <button
                        onClick={handleHistoryNextPage}
                        disabled={!canGoNextPage || historyLoading}
                        style={{
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          color: '#374151',
                          backgroundColor: '#fff',
                          cursor: !canGoNextPage || historyLoading ? 'not-allowed' : 'pointer',
                          opacity: !canGoNextPage || historyLoading ? 0.5 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={styles.noticeText}>No swap records in the database for this wallet yet.</p>
                )}
              </>
            ) : (
              <p className={styles.noticeText}>Connect your wallet to load swap history from the backend.</p>
            )}
          </article>

          {txProgress ? (
            <article className={styles.statusCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>Transaction status</p>
                  <h2>{statusLabel(txProgress.phase)}</h2>
                </div>
                <div className={styles.statusBadge}>{txProgress.phase}</div>
              </div>
              <p className={styles.statusMeta}>TX hash: {shortenAddress(txProgress.hash, 6)} · At {txProgress.submittedAt}</p>
              <div className={styles.progressBar}>
                <span
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
                <a className={styles.externalLink} href={txProgress.explorerUrl} target="_blank" rel="noreferrer">
                  View on Arcscan
                </a>
              ) : null}
              {txProgress.errorMessage ? <p className={styles.errorText}>{txProgress.errorMessage}</p> : null}
            </article>
          ) : null}
        </div>
      </section>

      {previewOpen ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="swap-preview-title">
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Preview</p>
                <h2 id="swap-preview-title">Confirm quote before signing</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>

            <div className={styles.previewHero}>
              <div>
                <span>You send</span>
                <strong>{formatAmount(amount)} {fromToken}</strong>
              </div>
              <div>
                <span>You receive</span>
                <strong>{formatAmount(quote.estimatedOutput)} {toToken}</strong>
              </div>
            </div>

            <dl className={styles.previewGrid}>
              <div>
                <dt>Wallet</dt>
                <dd>{walletAddress ? shortenAddress(walletAddress) : '--'}</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>Arc Testnet</dd>
              </div>
              <div>
                <dt>Minimum received</dt>
                <dd>{formatAmount(quote.minimumReceived)} {toToken}</dd>
              </div>
              <div>
                <dt>Fees</dt>
                <dd>{totalFeeText}</dd>
              </div>
            </dl>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPreviewOpen(false)}>
                Back
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void handleConfirmSwap()} disabled={busy}>
                {busy ? 'Submitting transaction...' : 'Confirm and sign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
