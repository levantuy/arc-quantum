export default function WalletPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Account Module</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Wallet Center</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Quản lý kết nối ví, network hiện tại và thông tin địa chỉ phục vụ các luồng Bridge, Swap, Send.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900">Connection Status</h2>
          <p className="mt-1 text-sm text-slate-600">Trạng thái kết nối và địa chỉ ví đang hoạt động.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900">Network Switch</h2>
          <p className="mt-1 text-sm text-slate-600">Chuyển network nhanh để thực hiện giao dịch đúng chain.</p>
        </div>
      </div>
    </section>
  );
}
