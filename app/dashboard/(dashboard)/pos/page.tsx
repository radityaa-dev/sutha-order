'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '../../../../components/ui/badge'
import { Card } from '../../../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { Input } from '../../../../components/ui/input'
import { PosCart } from '../../../../components/admin/pos-cart'
import { PosItemDialog } from '../../../../components/admin/pos-item-dialog'
import { PosOpenBills } from '../../../../components/admin/pos-open-bills'
import { usePosCart } from '../../../../lib/pos-store'
import { formatRupiah } from '../../../../lib/format'
import { cn } from '../../../../lib/utils'
import { toast } from 'sonner'
import {
  getPosCatalog, getMyOpenShift, getActiveOpenBills, getPosTables,
} from './actions'

export default function PosPage() {
  const [catalog, setCatalog] = useState<any>({ menus: [], bundles: [], categories: [] })
  const [tables, setTables] = useState<any[]>([])
  const [openShift, setOpenShift] = useState<any>(null)
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [pendingItem, setPendingItem] = useState<any>(null)

  const addItem = usePosCart((s) => s.addItem)
  const items = usePosCart((s) => s.items)

  const loadData = useCallback(async () => {
    try {
      const [cat, shift, billData, tbl] = await Promise.all([
        getPosCatalog(), getMyOpenShift(), getActiveOpenBills(), getPosTables(),
      ])
      setCatalog(cat)
      setOpenShift(shift)
      setBills(billData)
      setTables(tbl)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data POS')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredMenus = catalog.menus.filter((m: any) =>
    (!category || m.category_id === category) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredBundles = catalog.bundles.filter((b: any) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  function confirmItem(payload: any) {
    addItem(payload)
    toast.success(`${payload.name} masuk keranjang`)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
<header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-background px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {openShift ? (
            <Badge variant="secondary" className="rounded-sm text-[11px]">
              Shift aktif · modal {formatRupiah(openShift.opening_cash)}
            </Badge>
          ) : (
            <Badge variant="destructive" className="rounded-sm text-[11px]">Shift belum dibuka</Badge>
          )}
        </div>
        <p className="text-[12px] text-ink-muted">{items.length} baris di keranjang</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Kiri: catalog */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex gap-2 border-b border-[var(--line)] p-2">
            <Input
              placeholder="Cari menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 max-w-xs text-[15px]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] p-2">
            <button
              onClick={() => setCategory('')}
              className={cn(
                'h-11 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium',
                !category ? 'bg-[var(--brand-700)] text-white' : 'bg-[var(--surface-sunken)] text-ink'
              )}
            >
              Semua
            </button>
            {catalog.categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn('h-11 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium', category === c.id ? 'bg-[var(--brand-700)] text-white' : 'bg-[var(--surface-sunken)] text-ink')}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat menu...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {filteredBundles.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setPendingItem({ menuId: '', bundleId: b.id, name: b.name, unitPrice: Number(b.price), basePrice: Number(b.price) })}
                    className="rounded-[var(--radius-sm)] border p-3 text-left transition-colors hover:border-primary"
                  >
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="mt-1 font-bold text-primary">{formatRupiah(Number(b.price))}</p>
                  </button>
                ))}
                {filteredMenus.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setPendingItem({ menuId: m.id, bundleId: null, name: m.name, unitPrice: Number(m.price), basePrice: Number(m.price), image_url: m.image_url, description: m.description })}
                    className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] text-left transition-colors hover:border-[var(--brand-500)]"
                  >
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="h-20 w-full bg-muted" />
                    )}
                    <div className="p-2">
                      <p className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-snug text-ink">{m.name}</p>
                      <p className="type-money mt-1 text-[14px] font-bold text-[var(--brand-700)]">{formatRupiah(Number(m.price))}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kanan: cart + open bills */}
        <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-[var(--line)] lg:w-[400px] lg:border-l lg:border-t-0">
          <Tabs defaultValue="cart" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="m-2 w-[calc(100%-16px)]">
              <TabsTrigger value="cart">Keranjang</TabsTrigger>
              <TabsTrigger value="bills">Open Bill & Masuk ({bills.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="cart" className="min-h-0 flex-1 overflow-y-auto p-2">
              <PosCart
                tables={tables}
                hasOpenShift={!!openShift}
                onOrderCreated={loadData}
                onOpenBillSaved={loadData}
              />
            </TabsContent>
            <TabsContent value="bills" className="min-h-0 flex-1 overflow-y-auto p-2">
              <PosOpenBills bills={bills} hasOpenShift={!!openShift} onChanged={loadData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PosItemDialog item={pendingItem} onClose={() => setPendingItem(null)} onConfirm={confirmItem} />
    </div>
  )
}
