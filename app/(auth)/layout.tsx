import { LoginShowcasePanel } from '../../components/admin/login-showcase-panel'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#F7F4EF]">
      {/* Latar dekoratif: dua bulatan hangat, di-blur berat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(229,154,60,0.35) 0%, rgba(247,244,239,0) 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-[-15%] h-[560px] w-[560px] rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(179,82,30,0.28) 0%, rgba(247,244,239,0) 72%)' }}
      />

      {/* Panel merek: foto dengan overlay espresso */}
      <aside className="relative hidden w-[46%] shrink-0 overflow-hidden bg-[#2A1608] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(229,154,60,0.50) 0%, rgba(42,22,8,0) 68%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(173,82,27,0.45) 0%, rgba(42,22,8,0) 70%)' }}
        />

        {/* Bar merek: frosted */}
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-3.5 py-2.5 backdrop-blur-md">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/sutha-logo.png" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">Sutha Corner</p>
            <p className="truncate text-[11px] text-white/60">Sistem pesanan meja</p>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <LoginShowcasePanel />
        </div>

        <div className="relative rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 backdrop-blur-md">
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-white/75">
            Pesan lewat QR di meja. Bayar di kasir atau langsung dari ponsel.
          </p>
        </div>
      </aside>

      {/* Panel formulir */}
      <main className="relative flex min-w-0 flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          {/* Logo kecil untuk layar kecil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#EAE3D9] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/sutha-logo.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#3A1D0D]">Sutha Corner</p>
              <p className="text-[11px] text-neutral-500">Sistem pesanan meja</p>
            </div>
          </div>

          {/* Kartu frosted untuk formulir */}
          <div className="rounded-[20px] border border-white/60 bg-white/60 p-6 shadow-[0_18px_50px_rgba(58,29,13,0.10)] backdrop-blur-xl sm:p-7">
            {children}
          </div>

          <p className="mt-4 px-1 text-[12px] leading-relaxed text-neutral-500">
            Sutha Corner · Sistem pemesanan meja berbasis QR
          </p>
        </div>
      </main>
    </div>
  )
}