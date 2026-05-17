'use client';

import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { useEffect, useMemo, useRef, useState } from 'react';
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

  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numeric);
}

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Khong the xu ly yeu cau Swap.';
  }

  const message = error.message || 'Khong the xu ly yeu cau Swap.';
  if (/user rejected|user denied|rejected the request/i.test(message)) {
    return 'Nguoi dung da huy thao tac trong vi.';
  }

  if (/Stablecoin Service createSwap failed: Maximum retry attempts \(3\) exceeded: Failed to fetch/i.test(message)) {
    return 'Khong the ket noi Stablecoin Service tu trinh duyet. He thong da ap dung workaround CORS, vui long thu lai.';
  }

  return message;
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Dang gui';
    case 'confirming':
      return 'Dang xac nhan';
    case 'success':
      return 'Thanh cong';
    case 'failed':
      return 'That bai';
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [fromToken, setFromToken] = useState<SwapTokenSymbol>('USDC');
  const [toToken, setToToken] = useState<SwapTokenSymbol>('EURC');
  const [amount, setAmount] = useState('1.00');
  const [slippage, setSlippage] = useState('0.5');
  const [quote, setQuote] = useState<QuoteState>({ estimatedOutput: '0', minimumReceived: '0', fees: [], error: null });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [txProgress, setTxProgress] = useState<TxProgress | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const pollingRef = useRef<number | null>(null);

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
    const provider = window.ethereum as any;
    if (!provider) {
      return;
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAddress = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
      setWalletAddress(nextAddress);
    };

    const handleChainChanged = (nextChainId: unknown) => {
      if (typeof nextChainId === 'string') {
        setChainId(Number.parseInt(nextChainId, 16));
      }
    };

    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);

    void provider
      .request({ method: 'eth_accounts' })
      .then((accounts: unknown) => handleAccountsChanged(accounts))
      .catch(() => undefined);
    void provider
      .request({ method: 'eth_chainId' })
      .then((nextChainId: unknown) => handleChainChanged(nextChainId))
      .catch(() => undefined);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setHistory([]);
      return;
    }

    void loadHistory(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress || !canRequestQuote) {
      setQuote((current) => ({ ...current, error: !PUBLIC_ARC_KIT_KEY ? 'Thieu NEXT_PUBLIC_ARC_KIT_KEY de goi Arc App Kit.' : null }));
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
      throw new Error('Khong tim thay vi EVM trong trinh duyet.');
    }

    // Enforce Arc Testnet before App Kit actions to avoid viem switch errors
    // when users return with an already-connected wallet on another network.
    await ensureArcTestnet(provider);

    return createViemAdapterFromProvider({ provider });
  }

  async function connectWallet() {
    setWalletError(null);

    try {
      const provider = window.ethereum as any;
      if (!provider) {
        throw new Error('Khong tim thay MetaMask hoac vi EVM tuong thich.');
      }

      await ensureArcTestnet(provider);
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts?.[0];
      if (!address) {
        throw new Error('Khong co tai khoan nao duoc chon trong vi.');
      }

      setWalletAddress(address);
      setChainId(ARC_TESTNET_CHAIN_ID);
    } catch (error) {
      setWalletError(summarizeError(error));
    }
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

  async function loadHistory(address: string) {
    const response = await fetch(`/api/history/list?address=${address}&type=swap&limit=6`, { cache: 'no-store' });
    const rawBody = await response.text();
    let data: { history?: HistoryItem[]; error?: string } = {};

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as { history?: HistoryItem[]; error?: string };
      } catch {
        data = { error: 'Phan hoi may chu khong hop le.' };
      }
    }

    if (!response.ok) {
      throw new Error(data.error || 'Khong the tai lich su swap.');
    }

    setHistory(data.history ?? []);
  }

  async function pollTransaction(hash: string, explorerUrl: string | null) {
    const response = await fetch(`/api/tx/status/${hash}`, { cache: 'no-store' });
    const data = (await response.json()) as {
      status?: string;
      errorMessage?: string | null;
      explorerUrl?: string | null;
    };

    if (!response.ok) {
      throw new Error(data.errorMessage || 'Khong the kiem tra trang thai giao dich.');
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
      await loadHistory(walletAddress);
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
        submittedAt: new Date().toLocaleTimeString('vi-VN', {
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

  return (
    <main className={styles.pageShell}>
      <section className={styles.heroPanel}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>Arc Swap Integration</span>
          <h1>Swap that voi browser wallet, quote live va polling chain thuc.</h1>
          <p>
            Luong nay dung Arc App Kit de estimate va execute swap tren Arc Testnet, sau do ghi transaction vao database va dong bo history qua API backend.
          </p>
          <div className={styles.heroActions}>
            {walletAddress ? (
              <div className={styles.walletChip}>
                <span className={styles.walletDot} />
                {shortenAddress(walletAddress)}
              </div>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={connectWallet}>
                Ket noi MetaMask
              </button>
            )}
            <div className={styles.networkPill}>
              {chainId === ARC_TESTNET_CHAIN_ID ? 'Arc Testnet ready' : 'Can switch sang Arc Testnet'}
            </div>
          </div>
          {walletError ? <p className={styles.errorText}>{walletError}</p> : null}
          {!PUBLIC_ARC_KIT_KEY ? <p className={styles.warningText}>Can cau hinh NEXT_PUBLIC_ARC_KIT_KEY de Arc App Kit co the tao quote va swap.</p> : null}
        </div>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span>Estimate source</span>
            <strong>Arc App Kit</strong>
            <p>Quote lay truc tiep tu Arc Stablecoin Service thong qua estimateSwap.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Execution</span>
            <strong>Browser wallet</strong>
            <p>Giao dich duoc ky va gui bang vi EVM that thay vi mock local.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Persistence</span>
            <strong>Prisma + RPC</strong>
            <p>Transaction duoc luu database va poll lai receipt that tu chain qua API status.</p>
          </article>
        </div>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.swapCard}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>Swap form</p>
              <h2>Thuc thi giao dich</h2>
            </div>
            <div className={styles.inlineStat}>{amount || '0'} {fromToken}</div>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="from-token">Token nguon</label>
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
              className={styles.flipButton}
              onClick={() => {
                setFromToken(toToken);
                setToToken(fromToken);
              }}
            >
              Dao chieu
            </button>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="to-token">Token dich</label>
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
                {quoteLoading ? 'Dang lay quote...' : `${formatAmount(quote.estimatedOutput)} ${toToken}`}
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

          {fromToken === toToken ? <p className={styles.errorText}>Token nguon va dich phai khac nhau.</p> : null}
          {quote.error ? <p className={styles.errorText}>{quote.error}</p> : null}
          {swapError ? <p className={styles.errorText}>{swapError}</p> : null}

          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSubmit}
            onClick={() => setPreviewOpen(true)}
          >
            {busy ? 'Dang xu ly...' : 'Preview va ky giao dich'}
          </button>
        </article>

        <div className={styles.sideColumn}>
          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Live estimate</p>
                <h2>Chi tiet quote</h2>
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
                <h2>Lan giao dich gan day</h2>
              </div>
            </div>

            {walletAddress ? (
              history.length > 0 ? (
                <div className={styles.historyList}>
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
                        <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
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
              ) : (
                <p className={styles.noticeText}>Chua co ban ghi swap nao trong database cho vi nay.</p>
              )
            ) : (
              <p className={styles.noticeText}>Ket noi vi de tai lich su swap tu backend.</p>
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
              <p className={styles.statusMeta}>TX hash: {shortenAddress(txProgress.hash, 6)} · Luc {txProgress.submittedAt}</p>
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
                  Xem tren Arcscan
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
                <h2 id="swap-preview-title">Xac nhan quote truoc khi ky</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setPreviewOpen(false)}>
                Dong
              </button>
            </div>

            <div className={styles.previewHero}>
              <div>
                <span>Ban gui</span>
                <strong>{formatAmount(amount)} {fromToken}</strong>
              </div>
              <div>
                <span>Ban nhan</span>
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
                Quay lai
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void handleConfirmSwap()} disabled={busy}>
                {busy ? 'Dang ky giao dich...' : 'Confirm and sign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
