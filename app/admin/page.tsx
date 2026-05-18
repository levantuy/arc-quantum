'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { AdminPanel } from '@/components/admin/AdminPanel';

type SessionResponse = {
  authenticated: boolean;
  admin: {
    address: string;
    isAdmin: boolean;
  } | null;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export default function AdminDashboardPage() {
  const { address, connected } = useWallet();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse>({
    authenticated: false,
    admin: null,
  });

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = (await res.json()) as SessionResponse | { error?: string };
      if (!res.ok) {
        throw new Error('error' in data ? data.error || 'Cannot load admin session' : 'Cannot load admin session');
      }
      setSession(data as SessionResponse);
    } catch (err) {
      setSession({ authenticated: false, admin: null });
      setError(err instanceof Error ? err.message : 'Cannot load admin session');
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleSign = async () => {
    if (!address || !window.ethereum) return;
    setError(null);
    setSigning(true);
    try {
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) {
        throw new Error(nonceData.error || 'Cannot get nonce');
      }

      const message =
        typeof nonceData.message === 'string' && nonceData.message.length > 0
          ? nonceData.message
          : ['Arc Quantum Admin Login', `Nonce: ${nonceData.nonce}`, 'Purpose: Sign this message to authenticate as admin.'].join('\n');

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
        body: JSON.stringify({ address, signature, nonce: nonceData.nonce }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Cannot verify signature');
      }

      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed');
    } finally {
      setSigning(false);
    }
  };

  if (sessionLoading) {
    return <p className="text-sm text-gray-600">Loading admin session...</p>;
  }

  if (session.authenticated && session.admin) {
    return <AdminPanel address={session.admin.address} onLoggedOut={loadSession} />;
  }

  if (!connected || !address) {
    return (
      <div className="max-w-sm mx-auto mt-12 p-6 bg-white rounded shadow text-center space-y-3">
        <h2 className="text-xl font-semibold">Admin Access</h2>
        <p className="text-sm text-gray-600">
          Connect your wallet using the button in the top-right corner, then return here to authenticate as admin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-semibold">Admin Authentication</h2>
      <p className="text-sm text-gray-600">
        Wallet connected: <span className="font-mono">{address}</span>
      </p>
      <p className="text-sm text-gray-600">
        Sign a challenge message with your admin wallet to verify access.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void handleSign()}
        disabled={signing}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {signing ? 'Signing...' : 'Sign to Authenticate'}
      </button>
    </div>
  );
}
