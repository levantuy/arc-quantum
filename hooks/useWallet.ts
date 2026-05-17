// Hook kết nối ví EVM (MetaMask, WalletConnect, ...) - synced with Zustand store

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Address } from '../types';
import { ARC_TESTNET_CHAIN_HEX } from '../constants';
import { useWalletStore } from '../stores/wallet';

const MANUAL_DISCONNECT_KEY = 'arcq.wallet.manual_disconnect';

type Eip1193ProviderLike = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
};

export function useWallet() {
  const ethereum = (typeof window !== 'undefined'
    ? (window as Window & { ethereum?: Eip1193ProviderLike }).ethereum
    : undefined);

  // Use Zustand store for address and connected state
  const storeAddress = useWalletStore((state) => state.address);
  const storeConnected = useWalletStore((state) => state.connected);
  const setStoreAddress = useWalletStore((state) => state.setAddress);
  const setStoreConnected = useWalletStore((state) => state.setConnected);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const readManualDisconnect = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(MANUAL_DISCONNECT_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  const writeManualDisconnect = useCallback((value: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      if (value) {
        window.localStorage.setItem(MANUAL_DISCONNECT_KEY, '1');
      } else {
        window.localStorage.removeItem(MANUAL_DISCONNECT_KEY);
      }
    } catch {
      // Ignore localStorage failures (e.g. privacy mode).
    }
  }, []);

  // Check if already connected
  useEffect(() => {
    if (ethereum) {
      const manuallyDisconnected = readManualDisconnect();
      if (manuallyDisconnected) {
        setStoreAddress(null);
        setStoreConnected(false);
      } else {
        ethereum.request({ method: 'eth_accounts' })
          .then((value) => {
            const accounts = (Array.isArray(value) ? value : []) as string[];
            if (accounts.length > 0) {
              setStoreAddress(accounts[0] as Address);
              setStoreConnected(true);
            }
          });
      }
      ethereum.request({ method: 'eth_chainId' })
        .then((value) => {
          const chainId = String(value);
          setWrongNetwork(chainId !== ARC_TESTNET_CHAIN_HEX);
        });
    }
  }, [ethereum, readManualDisconnect, setStoreAddress, setStoreConnected]);

  // Listen for account/network changes
  useEffect(() => {
    if (!ethereum) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        writeManualDisconnect(true);
        setStoreAddress(null);
        setStoreConnected(false);
      } else {
        if (readManualDisconnect()) {
          setStoreAddress(null);
          setStoreConnected(false);
          return;
        }
        writeManualDisconnect(false);
        setStoreAddress(accounts[0] as Address);
        setStoreConnected(true);
      }
    };
    const handleChainChanged = (chainId: string) => {
      setWrongNetwork(chainId !== ARC_TESTNET_CHAIN_HEX);
    };
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [ethereum, readManualDisconnect, setStoreAddress, setStoreConnected, writeManualDisconnect]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!ethereum) {
      setError('MetaMask is not installed');
      setLoading(false);
      return;
    }
    try {
      const accountResult = await ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = (Array.isArray(accountResult) ? accountResult : []) as string[];
      if (accounts.length === 0) {
        throw new Error('No wallet account selected');
      }
      writeManualDisconnect(false);
      setStoreAddress(accounts[0] as Address);
      setStoreConnected(true);
      const chainIdResult = await ethereum.request({ method: 'eth_chainId' });
      const chainId = String(chainIdResult);
      setWrongNetwork(chainId !== ARC_TESTNET_CHAIN_HEX);
    } catch (err: any) {
      setError(err?.message || 'User rejected connection');
    } finally {
      setLoading(false);
    }
  }, [ethereum, setStoreAddress, setStoreConnected, writeManualDisconnect]);

  const disconnect = useCallback(() => {
    writeManualDisconnect(true);
    setStoreAddress(null);
    setStoreConnected(false);
    setError(null);
  }, [setStoreAddress, setStoreConnected, writeManualDisconnect]);

  const switchNetwork = useCallback(async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET_CHAIN_HEX }],
      });
      setWrongNetwork(false);
    } catch (err: any) {
      setError('Failed to switch network');
    }
  }, [ethereum]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!ethereum || !storeAddress) {
      throw new Error('Wallet not connected');
    }
    try {
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, storeAddress],
      });
      return signature as string;
    } catch (err: any) {
      setError(err?.message || 'Failed to sign message');
      throw err;
    }
  }, [ethereum, storeAddress]);

  return {
    address: storeAddress,
    connected: storeConnected,
    loading,
    error,
    wrongNetwork,
    connect,
    disconnect,
    switchNetwork,
    signMessage,
  };
}
