'use client';

import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type BridgeConfig = {
  id: string;
  chainFrom: number;
  chainTo: number;
  minAmount: string;
  maxAmount: string;
  fee: string;
  isActive: boolean;
};

export const BridgeConfigForm = () => {
  const [form, setForm] = useState({
    chainFrom: 1,
    chainTo: 2,
    minAmount: '0.01',
    maxAmount: '1000',
    fee: '0.3',
    isActive: true,
  });
  const [items, setItems] = useState<BridgeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/bridge-config', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot load bridge config');
      }
      setItems(data.bridgeConfigs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load bridge config');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/bridge-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot save bridge config');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot save bridge config');
      setLoading(false);
    }
  };

  const onDisable = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bridge-config?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cannot disable bridge config');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot disable bridge config');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded border p-4 bg-white">
      <h3 className="text-lg font-semibold">Bridge Config</h3>

      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            value={form.chainFrom}
            onChange={(e) => setForm((prev) => ({ ...prev, chainFrom: Number(e.target.value) }))}
            placeholder="Chain From"
          />
          <Input
            type="number"
            value={form.chainTo}
            onChange={(e) => setForm((prev) => ({ ...prev, chainTo: Number(e.target.value) }))}
            placeholder="Chain To"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input
            value={form.minAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, minAmount: e.target.value }))}
            placeholder="Min Amount"
          />
          <Input
            value={form.maxAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, maxAmount: e.target.value }))}
            placeholder="Max Amount"
          />
          <Input
            value={form.fee}
            onChange={(e) => setForm((prev) => ({ ...prev, fee: e.target.value }))}
            placeholder="Fee (%)"
          />
        </div>
        <Button type="submit" disabled={loading}>
          Save Bridge Config
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <h4 className="font-medium">Current Config</h4>
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
                Chain {item.chainFrom} -&gt; Chain {item.chainTo}
              </p>
              <p>
                Min {item.minAmount} | Max {item.maxAmount} | Fee {item.fee}%
              </p>
              <p>Status: {item.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <Button type="button" onClick={() => onDisable(item.id)} disabled={!item.isActive || loading}>
              Disable
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
