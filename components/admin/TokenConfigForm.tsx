'use client';

import React, { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type TokenConfig = {
  id: string;
  address: string;
  name: string | null;
  symbol: string;
  decimals: number;
  chainId: number;
  logoUrl: string | null;
  isActive: boolean;
};

export const TokenConfigForm: React.FC = () => {
  const [form, setForm] = useState({
    address: '',
    name: '',
    symbol: '',
    decimals: 18,
    chainId: 1,
    logoUrl: '',
    isActive: true,
  });
  const [items, setItems] = useState<TokenConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tokens', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot load tokens');
      }
      setItems(data.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load tokens');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Cannot save token');
      }

      await loadData();
      setForm((prev) => ({ ...prev, address: '', name: '', symbol: '', logoUrl: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot save token');
      setLoading(false);
    }
  };

  const onDisable = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tokens?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot disable token');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot disable token');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded border p-4 bg-white">
      <h3 className="text-lg font-semibold">Token Config</h3>

      <form className="space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="block mb-1 text-sm">Token Address</label>
          <Input
            name="address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="0x..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-sm">Name</label>
            <Input
              name="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Arc Token"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Symbol</label>
            <Input
              name="symbol"
              value={form.symbol}
              onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value }))}
              placeholder="ARC"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1 text-sm">Decimals</label>
            <Input
              name="decimals"
              type="number"
              value={form.decimals}
              onChange={(e) => setForm((prev) => ({ ...prev, decimals: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Chain ID</label>
            <Input
              name="chainId"
              type="number"
              value={form.chainId}
              onChange={(e) => setForm((prev) => ({ ...prev, chainId: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Logo URL</label>
            <Input
              name="logoUrl"
              value={form.logoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          Save Token
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <h4 className="font-medium">Current Tokens</h4>
        <Button type="button" onClick={loadData} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading...</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded border p-3 flex items-center justify-between">
            <div className="text-sm">
              <p>
                {item.symbol} (Chain {item.chainId})
              </p>
              <p className="text-gray-600">{item.address}</p>
              <p>Status: {item.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <Button
              type="button"
              onClick={() => onDisable(item.id)}
              disabled={!item.isActive || loading}
            >
              Disable
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
