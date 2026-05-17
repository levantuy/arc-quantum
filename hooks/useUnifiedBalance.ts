"use client";

import { useEffect, useState, useCallback } from 'react';
import { formatAmount } from '../utils';
import { AppKit } from '@circle-fin/app-kit';

export interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  usdValue: number;
  iconUrl: string;
}

export interface ChainBreakdownItem {
  chain: string;
  confirmedBalance: string;
}

function getTokenIconUrl(symbol: string) {
  const normalized = symbol.toLowerCase();
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${normalized}.png`;
}

export function useUnifiedBalance(address: string | null) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [chainBreakdown, setChainBreakdown] = useState<ChainBreakdownItem[]>([]);
  const [totalUsd, setTotalUsd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleData, setStaleData] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances([]);
      setChainBreakdown([]);
      setTotalUsd(0);
      setError(null);
      setStaleData(false);
      setLastUpdatedAt(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const appKit = new AppKit();
      const result = await appKit.unifiedBalance.getBalances({
        token: 'USDC',
        sources: { address },
      });

      const amount = result.totalConfirmedBalance || '0';
      const usdValue = Number(amount);
      const tokens: TokenBalance[] = [
        {
          symbol: result.token,
          name: result.token,
          amount: formatAmount(amount, 6),
          usdValue: Number.isFinite(usdValue) ? usdValue : 0,
          iconUrl: getTokenIconUrl(result.token),
        },
      ];

      const chains = result.breakdown.flatMap((accountItem) =>
        accountItem.breakdown.map((chainItem) => ({
          chain: String(chainItem.chain),
          confirmedBalance: chainItem.confirmedBalance,
        }))
      );

      setBalances(tokens);
      setChainBreakdown(chains);
      setTotalUsd(tokens[0].usdValue);
      setStaleData(false);
      setLastUpdatedAt(new Date());
    } catch (err: any) {
      setError('Không thể tải số dư, vui lòng thử lại');
      setStaleData(true);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
    if (!address) return;
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address, fetchBalances]);

  return {
    balances,
    chainBreakdown,
    totalUsd,
    loading,
    error,
    staleData,
    lastUpdatedAt,
    refresh: fetchBalances,
  };
}
