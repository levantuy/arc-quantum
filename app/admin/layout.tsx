import React from 'react';
import { AdminNav } from '../../components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl p-6 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Arc Quantum Admin</h1>
          <p className="text-sm text-gray-600">
            Configure tokens, bridge settings, and review system audit activity.
          </p>
        </header>
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
