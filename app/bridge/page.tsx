export default function BridgePage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Bridge Module</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Cross-chain Bridge</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Cấu hình chuyển tài sản giữa các chain với giới hạn min/max và mức phí minh bạch cho người dùng.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Route Selection</span>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Fee Preview</span>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">Security Validation</span>
      </div>
    </section>
  );
}
