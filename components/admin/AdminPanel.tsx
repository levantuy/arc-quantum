'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';

type AdminPanelProps = {
  address: string;
  onLoggedOut: () => Promise<void>;
};

export const AdminPanel = ({ address, onLoggedOut }: AdminPanelProps) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot logout');
      }
      await onLoggedOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot logout');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
          <p className="text-sm text-gray-600">Signed in as {address}</p>
        </div>
        <Button type="button" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/tokens" className="rounded border bg-white p-4 hover:border-blue-500 transition">
          <h3 className="text-lg font-semibold">Token Config</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add, update, or disable supported tokens across chains.
          </p>
        </Link>

        <Link
          href="/admin/bridge-config"
          className="rounded border bg-white p-4 hover:border-blue-500 transition"
        >
          <h3 className="text-lg font-semibold">Bridge Config</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage chain pairs, min/max limits, and bridge fee rules.
          </p>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="rounded border bg-white p-4 hover:border-blue-500 transition"
        >
          <h3 className="text-lg font-semibold">Audit Logs</h3>
          <p className="text-sm text-gray-600 mt-1">
            Inspect admin login attempts and all configuration changes.
          </p>
        </Link>
      </div>
    </div>
  );
};
