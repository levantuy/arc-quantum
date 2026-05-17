'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

type AuditLog = {
  id: string;
  action: string;
  detail: string | null;
  adminAddress: string;
  createdAt: string;
};

type AuditLogListProps = {
  title?: string;
  autoLoad?: boolean;
};

export const AuditLogList = ({ title = 'Audit Logs', autoLoad = false }: AuditLogListProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audit-logs', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot load logs');
      }
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadLogs();
  }, [autoLoad]);

  return (
    <div className="space-y-3 rounded border p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button type="button" onClick={loadLogs} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading...</p>}

      <div className="max-h-64 overflow-auto space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded border p-3 text-sm">
            <p className="font-medium">{log.action}</p>
            <p className="text-gray-600">{log.detail || '-'}</p>
            <p className="text-gray-500">{log.adminAddress}</p>
            <p className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
