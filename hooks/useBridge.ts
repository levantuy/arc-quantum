// useBridge.ts - Hook for Bridge functionality
'use client';

import { useState, useCallback } from 'react';
import { BridgeTransaction, BridgeTransferRequest } from '@/types';

interface UseBridgeReturn {
  initiateTransfer: (request: BridgeTransferRequest) => Promise<BridgeTransaction>;
  getTransaction: (id: number) => Promise<BridgeTransaction>;
  getUserHistory: (
    address: string,
    limit?: number,
    offset?: number
  ) => Promise<{
    transactions: BridgeTransaction[];
    total: number;
    limit: number;
    offset: number;
  }>;
  retryTransaction: (id: number) => Promise<BridgeTransaction>;
  loading: boolean;
  error: string | null;
}

export const useBridge = (): UseBridgeReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateTransfer = useCallback(
    async (request: BridgeTransferRequest): Promise<BridgeTransaction> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/bridge/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Transfer failed');
        }

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transfer failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getTransaction = useCallback(async (id: number): Promise<BridgeTransaction> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bridge/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transaction');
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transaction';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserHistory = useCallback(
    async (
      address: string,
      limit: number = 10,
      offset: number = 0
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/bridge/history?address=${address}&limit=${limit}&offset=${offset}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch history');
        }

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch history';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const retryTransaction = useCallback(
    async (id: number): Promise<BridgeTransaction> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/bridge/${id}/retry`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Retry failed');
        }

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Retry failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    initiateTransfer,
    getTransaction,
    getUserHistory,
    retryTransaction,
    loading,
    error,
  };
};
