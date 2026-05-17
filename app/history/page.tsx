export default function HistoryPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Insight Module</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Transaction History</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Theo dõi toàn bộ giao dịch gần đây với bộ lọc theo trạng thái, loại giao dịch và thời gian.
      </p>
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
        Tính năng bảng lịch sử chi tiết sẽ được kết nối với API /api/history/list.
      </div>
    </section>
  );
}
