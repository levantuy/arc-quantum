// Admin login component (wallet signature)
'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

type AdminLoginProps = {
  onLoggedIn: () => Promise<void>;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoggedIn }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error('EVM wallet not detected');
      }

      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      const address = accounts?.[0];
      if (!address) {
        throw new Error('No wallet account selected');
      }

      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`, {
        method: 'GET',
      });
      const nonceData = await nonceRes.json();

      if (!nonceRes.ok) {
        throw new Error(nonceData.error || 'Cannot get nonce');
      }

      const message =
        typeof nonceData.message === 'string' && nonceData.message.length > 0
          ? nonceData.message
          : [
              'Arc Quantum Admin Login',
              `Nonce: ${nonceData.nonce}`,
              'Purpose: Sign this message to authenticate as admin.',
            ].join('\n');

      let signature: string;
      try {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [message, address],
        })) as string;
      } catch {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [address, message],
        })) as string;
      }

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          nonce: nonceData.nonce,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Cannot verify signature');
      }

      await onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
      <p className="text-sm text-gray-600 mb-4">
        Sign a nonce challenge with your admin wallet.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <Button onClick={handleLogin} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect Wallet & Sign'}
      </Button>
    </div>
  );
};
