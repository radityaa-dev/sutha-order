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
      <header className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Kasir POS</h1>
          {openShift ? (
            <Badge variant="secondary">Shift aktif · {new Date(openShift.opened_at).toLocaleTimeString()} · Modal {formatRupiah(openShift.opening_cash)}</Badge>
          ) : (
            <Badge variant="destructive">Shift belum dibuka</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{items.length} item di keranjang</p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Kiri: catalog */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-2 border-b p-2">
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1 border-b p-2">
            <button
              onClick={() => setCategory('')}
              className={cn('rounded-full px-3 py-1 text-xs font-medium', !category ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
              Semua
            </button>
            {catalog.categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn('rounded-full px-3 py-1 text-xs font-medium', category === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat menu...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredBundles.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setPendingItem({ menuId: '', bundleId: b.id, name: b.name, unitPrice: Number(b.price), basePrice: Number(b.price) })}
                    className="rounded-lg border p-3 text-left transition-colors hover:border-primary"
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
                    className="overflow-hidden rounded-lg border text-left transition-colors hover:border-primary"
                  >
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="h-20 w-full bg-muted" />
                    )}
                    <div className="p-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="text-sm font-bold text-primary">{formatRupiah(Number(m.price))}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kanan: cart + open bills */}
        <div className="flex w-[420px] shrink-0 flex-col border-l">
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
