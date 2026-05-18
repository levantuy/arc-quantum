// UC-HIS-001: Filter bar — status, date range (custom picker), tx hash search
'use client';

import React, { useState } from 'react';
import { HistoryFilters as HistoryFiltersType } from '@/types';

interface HistoryFiltersProps {
  filters: HistoryFiltersType;
  onChange: (filters: HistoryFiltersType) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirming', label: 'Confirming' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
];

const hasActiveFilters = (f: HistoryFiltersType) =>
  Boolean(f.status || f.dateFrom || f.dateTo || f.hash);

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ filters, onChange }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  function update(patch: Partial<HistoryFiltersType>) {
    onChange({ ...filters, ...patch });
  }

  function clearAll() {
    onChange({ status: '', dateFrom: '', dateTo: '', hash: '' });
  }

  const dateLabel =
    filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`
      : 'Date Range';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status filter */}
      <div className="relative">
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm text-slate-700 dark:text-gray-200 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 appearance-none cursor-pointer"
          style={{ color: 'var(--text-primary)', WebkitTextFillColor: 'var(--text-primary)' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: 'var(--text-primary)', background: 'var(--surface-bg-strong)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
          ▾
        </span>
      </div>

      {/* Date range picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDatePicker((v) => !v)}
          className={`h-9 rounded-lg border px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-100 ${
            filters.dateFrom || filters.dateTo
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {dateLabel}
        </button>

        {showDatePicker && (
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) => update({ dateFrom: e.target.value })}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-sm text-slate-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:border-amber-400 focus:outline-none"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) => update({ dateTo: e.target.value })}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-sm text-slate-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:border-amber-400 focus:outline-none"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  update({ dateFrom: '', dateTo: '' });
                  setShowDatePicker(false);
                }}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hash search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <input
          type="text"
          placeholder="Search by tx hash…"
          value={filters.hash}
          onChange={(e) => update({ hash: e.target.value })}
          className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 pl-8 pr-3 text-sm text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">⌕</span>
      </div>

      {/* Clear all */}
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={clearAll}
          className="h-9 rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
