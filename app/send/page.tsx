import { SendForm, SendHistory } from '@/components/send';

export default function SendPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Send Assets</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-xl">
          Send native ARC or any ERC20 token to another wallet address on Arc Testnet.
          Gas is estimated before you sign.
        </p>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Send Form — left */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5">New Transfer</h2>
            <SendForm />
          </div>
        </div>

        {/* Send History — right */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5">Send History</h2>
            <SendHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
