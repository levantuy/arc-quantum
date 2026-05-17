export default function SendPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Transfer Module</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Send Assets</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Chuyển tài sản giữa các ví an toàn với thông tin gas, địa chỉ nhận và trạng thái giao dịch rõ ràng.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900">Recipient Check</h2>
          <p className="mt-1 text-sm text-slate-600">Xác thực địa chỉ trước khi ký giao dịch.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900">Gas Estimate</h2>
          <p className="mt-1 text-sm text-slate-600">Ước tính phí theo thời gian thực để tránh phát sinh.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-900">Tx Tracking</h2>
          <p className="mt-1 text-sm text-slate-600">Theo dõi trạng thái pending, success, failed.</p>
        </div>
      </div>
    </section>
  );
}
