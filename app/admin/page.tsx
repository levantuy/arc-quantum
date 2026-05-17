'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminPanel } from '@/components/admin/AdminPanel';

type SessionResponse = {
  authenticated: boolean;
  admin: {
    address: string;
    isAdmin: boolean;
  } | null;
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse>({
    authenticated: false,
    admin: null,
  });

  const loadSession = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading admin session...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => void loadSession()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session.authenticated || !session.admin) {
    return <AdminLogin onLoggedIn={loadSession} />;
  }

  return <AdminPanel address={session.admin.address} onLoggedOut={loadSession} />;
}
