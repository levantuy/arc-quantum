export default function BalancePage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Portfolio Module</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Unified Balance</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Tổng hợp số dư đa chain trong một màn hình để người dùng theo dõi tài sản nhanh và chính xác.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <h2 className="font-semibold text-slate-900">Cross-chain Overview</h2>
          <p className="mt-1 text-sm text-slate-600">Hiển thị số dư token theo từng chain và tổng giá trị.</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
          <h2 className="font-semibold text-slate-900">Live Refresh</h2>
          <p className="mt-1 text-sm text-slate-600">Làm mới dữ liệu theo phiên làm việc để phản hồi nhanh.</p>
        </div>
      </div>
    </section>
  );
}
