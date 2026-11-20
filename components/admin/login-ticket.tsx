import { formatRupiah } from '../../lib/format'

/**
 * Tiket pesanan dapur sebagai elemen merek di panel kiri login.
 * Dirender sebagai HTML (bukan gambar) agar tajam di layar retina
 * dan tidak menambah beban unduhan.
 */
export function TicketPanel() {
  const items = [
    { name: 'Nasi Goreng Spesial', note: 'tanpa sambal', qty: 2, price: 35000 },
    { name: 'Ayam Goreng Krispi', note: '', qty: 1, price: 45000 },
    { name: 'Es Teh Manis', note: '', qty: 3, price: 8000 },
  ]

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  return (
    <div className="w-full max-w-[320px]">
      <div
        className="relative bg-[#FBF7F0] px-6 pb-8 pt-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        style={{
          borderRadius: '6px 6px 0 0',
          maskImage: 'radial-gradient(circle at 6px 100%, transparent 6px, black 6.5px) 0 0/12px 100%',
          WebkitMaskImage:
            'radial-gradient(circle at 6px 100%, transparent 6px, black 6.5px) 0 0/12px 100%',
        }}
      >
        <div className="text-center">
          <p className="type-display text-[19px] leading-tight text-[#3A1D0D]">Sutha Corner</p>
          <p className="mt-1 text-[11px] tracking-widest text-neutral-500">STRUK PESANAN</p>
          <p className="mt-1.5 text-[12px] text-neutral-600">Meja 07 · 2 pengunjung</p>
        </div>

        <div className="my-4 border-t border-dashed border-[#E6DBCB]" />

        <div className="flex items-baseline justify-between text-[11px] text-neutral-500">
          <span className="tabular-nums">#014</span>
          <span className="tabular-nums">19:42</span>
        </div>

        <ul className="mt-2.5 space-y-2.5">
          {items.map((item) => (
            <li key={item.name} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-[#3A1D0D]">
                  <span className="type-money mr-1.5 text-neutral-500">{item.qty}×</span>
                  {item.name}
                </p>
                {item.note && <p className="text-[11px] italic text-neutral-500">{item.note}</p>}
              </div>
              <span className="type-money shrink-0 text-[13px] text-[#3A1D0D]">
                {formatRupiah(item.qty * item.price)}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-dashed border-[#E6DBCB]" />

        <dl className="space-y-1.5 text-[12px]">
          <div className="flex justify-between text-neutral-600">
            <dt>Subtotal</dt>
            <dd className="type-money">{formatRupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-neutral-600">
            <dt>Pajak 10%</dt>
            <dd className="type-money">{formatRupiah(tax)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t-2 border-[#3A1D0D] pt-2.5">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[#3A1D0D]">Total</span>
          <span className="type-display type-money text-[21px] text-[#3A1D0D]">
            {formatRupiah(total)}
          </span>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-500">
          Terima kasih. Pesanan ditampilkan di layar dapur.
        </p>
      </div>
    </div>
  )
}