import React from 'react';
import { AdminNav } from '../../components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <main className="mx-auto w-full max-w-7xl p-6 space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold">Arc Quantum Admin</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure tokens, bridge settings, and review system audit activity.
          </p>
        </header>
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
