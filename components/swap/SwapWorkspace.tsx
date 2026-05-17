'use client';

import { useEffect, useRef, useState } from 'react';
import { useWalletStore } from '@/stores/wallet';
import { shortenAddress } from '@/utils';
import styles from './SwapWorkspace.module.css';

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

  return new Intl.NumberFormat('vi-VN', {
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
      error: 'Nhập số lượng lớn hơn 0 để nhận quote.',
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
      error: 'Slippage phải nằm trong khoảng 0.1% đến 5%.',
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
      error: 'Số dư không đủ để thực hiện giao dịch này.',
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
    warning: priceImpact > 5 ? 'Price impact đang cao, cần rà lại slippage trước khi ký.' : null,
    error: hasLowLiquidity ? 'Không đủ thanh khoản cho cặp token ở quy mô giao dịch này.' : null,
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

  function handleDemoConnect() {
    setAddress('0xA12C4d7e91a31e5f9D4d3f11c4d52E72F2A98B10');
    setConnected(true);
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
    const submittedAt = new Date().toLocaleTimeString('vi-VN', {
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
          <h1>Hoan doi token tren Arc voi luong UX san sang cho giao dich that.</h1>
          <p>
            Giao dien nay hien thuc hoa luong quote, preview, canh bao slippage va trang thai giao dich cho
            module Swap theo tai lieu SRS.
          </p>
          <div className={styles.heroActions}>
            {connected && address ? (
              <div className={styles.walletChip}>
                <span className={styles.walletDot} />
                Vi dang ket noi: {shortenAddress(address)}
              </div>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={handleDemoConnect}>
                Ket noi vi demo
              </button>
            )}
            <div className={styles.networkPill}>Arc Mainnet</div>
          </div>
        </div>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span>Quote latency</span>
            <strong>&lt; 1 giay</strong>
            <p>Du lieu gia va route duoc tinh ngay tren client de nguoi dung ra quyet dinh nhanh.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Slippage guard</span>
            <strong>0.1% - 5%</strong>
            <p>Rang buoc dung theo SRS de tranh swap qua nguong an toan cua MVP.</p>
          </article>
          <article className={styles.metricCard}>
            <span>Liquidity signal</span>
            <strong>Canh bao som</strong>
            <p>Ban do thanh khoan duoc mo phong de chan quote khong kha thi truoc khi ky.</p>
          </article>
        </div>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.swapCard}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>Swap form</p>
              <h2>Build giao dich</h2>
            </div>
            <div className={styles.inlineStat}>{formatCurrency(totalUsd || 0)}</div>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="from-token">Token nguon</label>
              <span>So du: {formatTokenAmount(fromToken.balance)} {fromToken.symbol}</span>
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
            <div className={styles.routeHint}>Route du kien: {quote.route}</div>
            <button type="button" className={styles.flipButton} onClick={handleFlipPair}>
              Swap pair
            </button>
          </div>

          <div className={styles.tokenPanel}>
            <div className={styles.fieldRow}>
              <label htmlFor="to-token">Token dich</label>
              <span>
                Uoc tinh nhan: {formatTokenAmount(quote.expectedOutput)} {toToken.symbol}
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
          {!connected ? <p className={styles.noticeText}>Can ket noi vi truoc khi mo preview va ky giao dich.</p> : null}

          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSubmit}
            onClick={() => setPreviewOpen(true)}
          >
            Xem truoc giao dich
          </button>
        </article>

        <div className={styles.sideColumn}>
          <article className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>Market snapshot</p>
                <h2>Chi tiet quote</h2>
              </div>
              <div className={styles.pulseBadge}>Live mock</div>
            </div>

            <dl className={styles.detailList}>
              <div>
                <dt>Ty gia</dt>
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
                <h2>Dieu kien nghiep vu</h2>
              </div>
            </div>
            <ul className={styles.ruleList}>
              <li>Token nguon va token dich khong duoc trung nhau.</li>
              <li>Canh bao mau vang khi price impact vuot 5%.</li>
              <li>Chan giao dich neu so du hoac thanh khoan khong du.</li>
              <li>Preview tong hop route, phi, minimum received truoc luc ky.</li>
            </ul>
          </article>

          {txProgress ? (
            <article className={styles.statusCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.eyebrow}>Transaction status</p>
                  <h2>
                    {txProgress.phase === 'pending'
                      ? 'Dang gui giao dich'
                      : txProgress.phase === 'confirming'
                        ? 'Dang xac nhan on-chain'
                        : 'Swap thanh cong'}
                  </h2>
                </div>
                <div className={styles.statusPill}>{txProgress.confirmations}</div>
              </div>

              <p className={styles.statusMeta}>TX hash: {shortenAddress(txProgress.hash, 6)} · Luc {txProgress.submittedAt}</p>
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
                  ? 'So du va lich su co the duoc refresh o buoc tich hop API tiep theo.'
                  : 'Trang thai dang mo phong de phuc vu slice UI/UX cua module Swap.'}
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
                <h2 id="swap-preview-title">Xac nhan giao dich Swap</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setPreviewOpen(false)}>
                Dong
              </button>
            </div>

            <div className={styles.previewHero}>
              <div>
                <span>Ban gui</span>
                <strong>
                  {formatTokenAmount(amountValue)} {fromToken.symbol}
                </strong>
              </div>
              <div>
                <span>Ban nhan</span>
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
                <dt>Ty gia</dt>
                <dd>
                  1 {fromToken.symbol} = {formatTokenAmount(quote.exchangeRate)} {toToken.symbol}
                </dd>
              </div>
              <div>
                <dt>Phi uoc tinh</dt>
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
                Quay lai chinh sua
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