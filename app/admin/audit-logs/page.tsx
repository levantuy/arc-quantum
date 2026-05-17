import { AuditLogList } from '@/components/admin/AuditLogList';

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Admin Audit Logs</h2>
        <p className="text-sm text-gray-600">
          Review login events and configuration changes performed by administrators.
        </p>
      </div>
      <AuditLogList autoLoad title="All Audit Logs" />
    </div>
  );
}
