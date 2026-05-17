import Link from 'next/link';
import { BridgeConfigForm } from '@/components/admin/BridgeConfigForm';

export default function AdminBridgeConfigPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin - Bridge Config</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
      <BridgeConfigForm />
    </div>
  );
}
