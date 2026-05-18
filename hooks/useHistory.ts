// UC-HIS-001: useHistory hook — manages filter state, fetching, merging and pagination
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import {
  Transaction,
  BridgeTransaction,
  UnifiedTransaction,
  HistoryTabType,
  HistoryFilters,
} from '@/types';

const PAGE_SIZE = 10;
/** Fetch limit for the "All" tab — each API returns up to this many items for client-side merge. */
const ALL_FETCH_LIMIT = 50;

function normalizeTransaction(tx: Transaction): UnifiedTransaction {
  return {
    id: `tx_${tx.id}`,
    hash: tx.hash,
    type: tx.txType === 'swap' ? 'swap' : 'send',
    status: tx.status as UnifiedTransaction['status'],
    amount: tx.amount,
    token: tx.tokenIn ?? null,
    chainId: tx.chainId,
    explorerUrl: tx.explorerUrl,
    errorMessage: tx.errorMessage,
    createdAt: tx.createdAt,
    to: tx.to,
    amountIn: tx.amountIn,
    amountOut: tx.amountOut,
    tokenIn: tx.tokenIn,
    tokenOut: tx.tokenOut,
    confirmedAt: tx.confirmedAt,
  };
}

function normalizeBridgeTransaction(tx: BridgeTransaction): UnifiedTransaction {
  return {
    id: `bridge_${tx.id}`,
    hash: tx.txHashSource ?? null,
    type: 'bridge',
    status:
      tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'failed' : 'pending',
    amount: tx.amount,
    token: null,
    fromChainId: tx.fromChainId,
    toChainId: tx.toChainId,
    errorMessage: tx.errorMessage,
    createdAt: tx.createdAt,
    txHashSource: tx.txHashSource,
    txHashDest: tx.txHashDest,
    tokenAddress: tx.tokenAddress,
  };
}

export interface UseHistoryReturn {
  activeTab: HistoryTabType;
  setActiveTab: (tab: HistoryTabType) => void;
  filters: HistoryFilters;
  setFilters: (filters: HistoryFilters) => void;
  page: number;
  setPage: (page: number) => void;
  displayItems: UnifiedTransaction[];
  totalItems: number;
  totalPages: number;
  txLoading: boolean;
  bridgeLoading: boolean;
  txError: string | null;
  bridgeError: string | null;
  retryTx: () => void;
  retryBridge: () => void;
  connected: boolean;
}

export function useHistory(): UseHistoryReturn {
  const { address, connected } = useWallet();

  const [activeTab, setActiveTabState] = useState<HistoryTabType>('all');
  const [filters, setFiltersState] = useState<HistoryFilters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    hash: '',
  });
  const [page, setPageState] = useState(1);

  const [txList, setTxList] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const [bridgeList, setBridgeList] = useState<BridgeTransaction[]>([]);
  const [bridgeTotal, setBridgeTotal] = useState(0);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const buildTxParams = useCallback(
    (type?: 'send' | 'swap', limit = PAGE_SIZE, offset = 0) => {
      const p = new URLSearchParams();
      if (!address) return '';
      p.set('address', address);
      p.set('limit', String(limit));
      p.set('offset', String(offset));
      if (type) p.set('type', type);
      if (filters.status) p.set('status', filters.status);
      if (filters.dateFrom) p.set('dateFrom', new Date(filters.dateFrom).toISOString());
      if (filters.dateTo) p.set('dateTo', new Date(filters.dateTo + 'T23:59:59').toISOString());
      if (filters.hash) p.set('hash', filters.hash);
      return p.toString();
    },
    [address, filters]
  );

  const buildBridgeParams = useCallback(
    (limit = PAGE_SIZE, offset = 0) => {
      const p = new URLSearchParams();
      if (!address) return '';
      p.set('address', address);
      p.set('limit', String(limit));
      p.set('offset', String(offset));
      // Bridge uses pending/success/failed — 'confirming' is TX-specific, skip it for bridge
      const bridgeStatus = filters.status === 'confirming' ? '' : filters.status;
      if (bridgeStatus) p.set('status', bridgeStatus);
      if (filters.dateFrom) p.set('dateFrom', new Date(filters.dateFrom).toISOString());
      if (filters.dateTo) p.set('dateTo', new Date(filters.dateTo + 'T23:59:59').toISOString());
      if (filters.hash) p.set('hash', filters.hash);
      return p.toString();
    },
    [address, filters]
  );

  const fetchTx = useCallback(
    async (type?: 'send' | 'swap', limit = PAGE_SIZE, offset = 0) => {
      if (!address) return;
      setTxLoading(true);
      setTxError(null);
      try {
        const qs = buildTxParams(type, limit, offset);
        const res = await fetch(`/api/history/list?${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load transactions');
        setTxList(json.data?.transactions ?? []);
        setTxTotal(json.data?.total ?? 0);
      } catch (err) {
        setTxError(err instanceof Error ? err.message : 'Failed to load transactions');
        setTxList([]);
        setTxTotal(0);
      } finally {
        setTxLoading(false);
      }
    },
    [address, buildTxParams]
  );

  const fetchBridge = useCallback(
    async (limit = PAGE_SIZE, offset = 0) => {
      if (!address) return;
      setBridgeLoading(true);
      setBridgeError(null);
      try {
        const qs = buildBridgeParams(limit, offset);
        const res = await fetch(`/api/bridge/history?${qs}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? 'Failed to load bridge transactions');
        setBridgeList(json.data?.transactions ?? []);
        setBridgeTotal(json.data?.total ?? 0);
      } catch (err) {
        setBridgeError(err instanceof Error ? err.message : 'Failed to load bridge transactions');
        setBridgeList([]);
        setBridgeTotal(0);
      } finally {
        setBridgeLoading(false);
      }
    },
    [address, buildBridgeParams]
  );

  // Trigger fetches whenever tab, filters, page, or address changes
  useEffect(() => {
    if (!connected || !address) return;

    if (activeTab === 'all') {
      fetchTx(undefined, ALL_FETCH_LIMIT, 0);
      fetchBridge(ALL_FETCH_LIMIT, 0);
    } else if (activeTab === 'send') {
      fetchTx('send', PAGE_SIZE, (page - 1) * PAGE_SIZE);
    } else if (activeTab === 'swap') {
      fetchTx('swap', PAGE_SIZE, (page - 1) * PAGE_SIZE);
    } else if (activeTab === 'bridge') {
      fetchBridge(PAGE_SIZE, (page - 1) * PAGE_SIZE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, connected, activeTab, filters, page]);

  // Merged + sorted list for the "All" tab
  const mergedAll = useMemo<UnifiedTransaction[]>(() => {
    const items: UnifiedTransaction[] = [
      ...txList.map(normalizeTransaction),
      ...bridgeList.map(normalizeBridgeTransaction),
    ];
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [txList, bridgeList]);

  const { displayItems, totalItems, totalPages } = useMemo(() => {
    if (activeTab === 'all') {
      const total = mergedAll.length;
      const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
      const items = mergedAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      return { displayItems: items, totalItems: total, totalPages: pages };
    }
    if (activeTab === 'send' || activeTab === 'swap') {
      const items = txList.map(normalizeTransaction);
      const total = txTotal;
      const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
      return { displayItems: items, totalItems: total, totalPages: pages };
    }
    // bridge tab
    const items = bridgeList.map(normalizeBridgeTransaction);
    const total = bridgeTotal;
    const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
    return { displayItems: items, totalItems: total, totalPages: pages };
  }, [activeTab, mergedAll, txList, txTotal, bridgeList, bridgeTotal, page]);

  const setActiveTab = useCallback((tab: HistoryTabType) => {
    setActiveTabState(tab);
    setPageState(1);
  }, []);

  const setFilters = useCallback((newFilters: HistoryFilters) => {
    setFiltersState(newFilters);
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const retryTx = useCallback(() => {
    if (!address) return;
    if (activeTab === 'all') fetchTx(undefined, ALL_FETCH_LIMIT, 0);
    else if (activeTab === 'send') fetchTx('send', PAGE_SIZE, (page - 1) * PAGE_SIZE);
    else if (activeTab === 'swap') fetchTx('swap', PAGE_SIZE, (page - 1) * PAGE_SIZE);
  }, [activeTab, address, fetchTx, page]);

  const retryBridge = useCallback(() => {
    if (!address) return;
    if (activeTab === 'all') fetchBridge(ALL_FETCH_LIMIT, 0);
    else if (activeTab === 'bridge') fetchBridge(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  }, [activeTab, address, fetchBridge, page]);

  return {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    page,
    setPage,
    displayItems,
    totalItems,
    totalPages,
    txLoading,
    bridgeLoading,
    txError,
    bridgeError,
    retryTx,
    retryBridge,
    connected,
  };
}
