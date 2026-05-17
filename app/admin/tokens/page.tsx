import Link from 'next/link';
import { TokenConfigForm } from '@/components/admin/TokenConfigForm';

export default function AdminTokensPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin - Token Config</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
      <TokenConfigForm />
    </div>
  );
}
