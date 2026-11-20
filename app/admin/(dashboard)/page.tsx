import { DashboardContent } from './dashboard-content'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="type-display text-[22px] text-ink md:text-[26px]">Metrik bisnis</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-ink-muted">
          Pendapatan, arus kas, dan transaksi pada rentang yang Anda pilih.
        </p>
      </div>
      <DashboardContent />
    </div>
  )
}
