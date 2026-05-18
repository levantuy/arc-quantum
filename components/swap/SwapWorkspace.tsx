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
    <main className={styles.pageShell}>
      <section className={styles.heroPanel}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>Swap Module MVP</span>
          <h1>Swap tokens on Arc with a production-ready UX flow.</h1>
          <p>
            This interface implements quote, preview, slippage alerts, and transaction status tracking for
            the Swap module based on the SRS.
          </p>
          <div className={styles.heroActions}>
            {connected && address ? (
              <div className={styles.walletChip}>
                <span className={styles.walletDot} />
                Connected wallet: {shortenAddress(address)}
              </div>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={handleConnectWallet}>
                Connect wallet
              </button>
            )}
            <div className={styles.networkPill}>Arc Mainnet</div>
          </div>
        </div>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span>Quote latency</span>
            <strong>&lt; 1 second</strong>
            <p>Price and route data are computed on the client so users can decide quickly.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Slippage guard</span>
            <strong>0.1% - 5%</strong>
            <p>SRS-aligned constraints prevent swaps outside the MVP safety threshold.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Liquidity signal</span>
            <strong>Early warning</strong>
            <p>Liquidity is simulated to block infeasible quotes before signing.</p>
          </article>
        </div>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.swapCard}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>Swap form</p>
              <h2>Build transaction</h2>
            </div>
            <div className={styles.inlineStat}>{formatCurrency(totalUsd || 0)}</div>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="from-token">From token</label>
              <span>Balance: {formatTokenAmount(fromToken.balance)} {fromToken.symbol}</span>
            </div>
            <div className={styles.inputGroup}>
              <select
                id="from-token"
                className={styles.selectInput}
                value={fromToken.symbol}
                onChange={(event) => handleFromTokenChange(event.target.value)}
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
                className={styles.amountInput}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
              <button type="button" className={styles.ghostButton} onClick={handleUseMax}>
                Max
              </button>
            </div>
          </div>

          <div className={styles.flipRow}>
            <div className={styles.routeHint}>Estimated route: {quote.route}</div>
            <button type="button" className={styles.flipButton} onClick={handleFlipPair}>
              Swap pair
            </button>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="to-token">To token</label>
              <span>
                Estimated receive: {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
              </span>
            </div>
            <div className={styles.inputGroup}>
              <select
                id="to-token"
                className={styles.selectInput}
                value={toToken.symbol}
                onChange={(event) => handleToTokenChange(event.target.value)}
              >
                {TOKENS.filter((token) => token.symbol !== fromToken.symbol).map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
              <div className={styles.outputBox}>
                {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
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

          {quote.error ? <p className={styles.errorText}>{quote.error}</p> : null}
          {!quote.error && quote.warning ? <p className={styles.warningText}>{quote.warning}</p> : null}
          {!connected ? <p className={styles.noticeText}>Connect your wallet before opening preview and signing.</p> : null}

          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSubmit}
            onClick={() => setPreviewOpen(true)}
          >
            Preview transaction
          </button>
        </article>

        <div className={styles.sideColumn}>
          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Market snapshot</p>
                <h2>Quote details</h2>
              </div>
              <div className={styles.pulseBadge}>Live mock</div>
            </div>

            <dl className={styles.detailList}>
              <div>
                <dt>Exchange rate</dt>
                <dd>
                  1 {fromToken.symbol} = {formatTokenAmount(quote.exchangeRate)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt>Min received</dt>
                <dd>
                  {formatTokenAmount(quote.minimumReceived)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt>LP fee</dt>
                <dd>
                  {formatTokenAmount(quote.lpFee)} {fromToken.symbol}
                </dd>
              </div>
              <div>
                <dt>Gas estimate</dt>
                <dd>{formatCurrency(quote.gasUsd)}</dd>
              </div>
              <div>
                <dt>Price impact</dt>
                <dd>{formatTokenAmount(quote.priceImpact)}%</dd>
              </div>
            </dl>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Execution guardrails</p>
                <h2>Business rules</h2>
              </div>
            </div>
            <ul className={styles.ruleList}>
              <li>From token and to token must be different.</li>
              <li>Show a warning when price impact exceeds 5%.</li>
              <li>Block trades when balance or liquidity is insufficient.</li>
              <li>Preview summarizes route, fees, and minimum received before signing.</li>
            </ul>
          </article>

          {txProgress ? (
            <article className={styles.statusCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>Transaction status</p>
                  <h2>
                    {txProgress.phase === 'pending'
                      ? 'Submitting transaction'
                      : txProgress.phase === 'confirming'
                        ? 'Confirming on-chain'
                        : 'Swap successful'}
                  </h2>
                </div>
                <div className={styles.statusPill}>{txProgress.confirmations}</div>
              </div>

              <p className={styles.statusMeta}>TX hash: {shortenAddress(txProgress.hash, 6)} · At {txProgress.submittedAt}</p>
              <div className={styles.progressBar}>
                <span
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
              <p className={styles.statusHint}>
                {txProgress.phase === 'success'
                  ? 'Balance and history can be refreshed in the next API integration step.'
                  : 'Status is currently simulated for the Swap module UI/UX slice.'}
              </p>
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
                <h2 id="swap-preview-title">Confirm swap transaction</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>

            <div className={styles.previewHero}>
              <div>
                <span>You send</span>
                <strong>
                  {formatTokenAmount(amountValue)} {fromToken.symbol}
                </strong>
              </div>
              <div>
                <span>You receive</span>
                <strong>
                  {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
                </strong>
              </div>
            </div>

            <dl className={styles.previewGrid}>
              <div>
                <dt>Route</dt>
                <dd>{quote.route}</dd>
              </div>
              <div>
                <dt>Minimum received</dt>
                <dd>
                  {formatTokenAmount(quote.minimumReceived)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt>Exchange rate</dt>
                <dd>
                  1 {fromToken.symbol} = {formatTokenAmount(quote.exchangeRate)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt>Estimated fee</dt>
                <dd>{formatCurrency(quote.gasUsd + quote.lpFee * fromToken.priceUsd)}</dd>
              </div>
              <div>
                <dt>Price impact</dt>
                <dd>{formatTokenAmount(quote.priceImpact)}%</dd>
              </div>
              <div>
                <dt>Slippage</dt>
                <dd>{slippage}%</dd>
              </div>
            </dl>

            {quote.warning ? <p className={styles.warningText}>{quote.warning}</p> : null}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPreviewOpen(false)}>
                Back to edit
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleConfirmSwap}>
                Confirm and sign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
