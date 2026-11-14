'use client'

import { useState, useEffect } from 'react'
import { getTablesWithOrders, getAvailableTables, moveOrderTableAction, splitOrderBillAction, mergeOrderBillsAction } from './actions'
import { CreateTableForm } from '../../../../components/admin/table-form'
import { QRCodeDialog } from '../../../../components/admin/table-qrcode'
import { TableActions } from '../../../../components/admin/table-actions'
import { Badge } from '../../../../components/ui/badge'
import { cn } from '../../../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Checkbox } from '../../../../components/ui/checkbox'
import { Label } from '../../../../components/ui/label'
import { Separator } from '../../../../components/ui/separator'
import { formatRupiah } from '../../../../lib/format'
import { toast } from 'sonner'
import { Move, Split, Merge, Table as TableIcon, Clock, AlertTriangle } from 'lucide-react'

interface TableWithOrders {
  id: string
  name: string
  token: string
  area: string
  capacity: number
  is_active: boolean
  status: 'kosong' | 'terisi' | 'dipesan'
  active_orders: any[]
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableWithOrders[]>([])
  const [qrTable, setQrTable] = useState<any>(null)
  const [selectedTable, setSelectedTable] = useState<TableWithOrders | null>(null)
  const [moveDialog, setMoveDialog] = useState<{ order: any; tables: any[] } | null>(null)
  const [splitDialog, setSplitDialog] = useState<{ order: any } | null>(null)
  const [mergeDialog, setMergeDialog] = useState<{ sourceOrder: any; targetOrders: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const loadTables = async () => {
    const data = await getTablesWithOrders()
    setTables(data)
  }

  useEffect(() => { loadTables() }, [])

  const areas = ['main', 'vip', 'bar', 'outdoor']
  const areaLabels: Record<string, string> = { main: 'Utama', vip: 'VIP', bar: 'Bar', outdoor: 'Outdoor' }

  function getStatusBadge(status: string) {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      kosong: 'default',
      terisi: 'secondary',
      dipesan: 'destructive'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  async function handleMoveConfirm(orderId: string, newTableId: string) {
    setLoading(true)
    try {
      await moveOrderTableAction(orderId, newTableId)
      toast.success('Pesanan dipindah meja')
      setMoveDialog(null)
      loadTables()
    } catch (e: any) {
      toast.error(e.message || 'Gagal pindah meja')
    } finally {
      setLoading(false)
    }
  }

  async function handleSplitConfirm(sourceOrderId: string, itemIds: string[]) {
    setLoading(true)
    try {
      await splitOrderBillAction(sourceOrderId, itemIds)
      toast.success('Tagihan di-split')
      setSplitDialog(null)
      loadTables()
    } catch (e: any) {
      toast.error(e.message || 'Gagal split tagihan')
    } finally {
      setLoading(false)
    }
  }

  async function handleMergeConfirm(sourceOrderId: string, targetOrderId: string) {
    setLoading(true)
    try {
      await mergeOrderBillsAction(sourceOrderId, targetOrderId)
      toast.success('Tagihan digabung')
      setMergeDialog(null)
      loadTables()
    } catch (e: any) {
      toast.error(e.message || 'Gagal gabung tagihan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Denah & Status Meja</h1>
        <CreateTableForm />
      </div>

      {/* Floor Plan */}
      <div className="space-y-6">
        {areas.map((area) => {
          const areaTables = tables.filter(t => t.area === area)
          if (areaTables.length === 0) return null

          return (
            <section key={area}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TableIcon className="h-5 w-5" /> {areaLabels[area]} ({areaTables.filter(t => t.status === 'kosong').length}/{areaTables.length} kosong)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {areaTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onViewQR={() => setQrTable(table)}
                    onClick={() => setSelectedTable(table)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {qrTable && <QRCodeDialog table={qrTable} open={!!qrTable} setOpen={() => setQrTable(null)} />}

      {/* Table Detail Dialog */}
      {selectedTable && (
        <Dialog open onOpenChange={(o) => !o && setSelectedTable(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTable.name} · {getStatusBadge(selectedTable.status)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTable.active_orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Tidak ada pesanan aktif</p>
              ) : (
                <div className="space-y-3">
                  {selectedTable.active_orders.map((order: any) => (
                    <Card key={order.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{order.order_code}</span>
                        <Badge variant="outline">{order.order_status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customer_name || 'Walk-in'} · {formatRupiah(order.total)}</p>

                      <div className="flex gap-2 mt-2">
                        {selectedTable.active_orders.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => {
                            const others = selectedTable.active_orders.filter((o: any) => o.id !== order.id)
                            setMergeDialog({ sourceOrder: order, targetOrders: others })
                          }}>
                            <Merge className="h-3 w-3 mr-1" /> Gabung
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => {
                          setSplitDialog({ order })
                        }}>
                          <Split className="h-3 w-3 mr-1" /> Split
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          getAvailableTables(selectedTable.id).then(tables =>
                            setMoveDialog({ order, tables })
                          )
                        }}>
                          <Move className="h-3 w-3 mr-1" /> Pindah
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Move Order Dialog */}
      {moveDialog && (
        <Dialog open onOpenChange={(o) => !o && setMoveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pindah Meja — {moveDialog.order.order_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pilih meja tujuan (status: Kosong)</p>
              {moveDialog.tables.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Tidak ada meja kosong</p>
              ) : (
                <Select onValueChange={(value) => { if (typeof value === 'string') handleMoveConfirm(moveDialog.order.id, value) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih meja tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {moveDialog.tables.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.area}) · Kap {t.capacity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setMoveDialog(null)}>Batal</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Split Dialog */}
      {splitDialog && (
        <Dialog open onOpenChange={(o) => !o && setSplitDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Split Tagihan — {splitDialog.order.order_code}</DialogTitle>
            </DialogHeader>
            <SplitOrderItems order={splitDialog.order} onConfirm={handleSplitConfirm} onCancel={() => setSplitDialog(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Merge Dialog */}
      {mergeDialog && (
        <Dialog open onOpenChange={(o) => !o && setMergeDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gabung Tagihan — {mergeDialog.sourceOrder.order_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Gabungkan ke tagihan target:</p>
              <Select onValueChange={(value) => { if (typeof value === 'string') handleMergeConfirm(mergeDialog.sourceOrder.id, value) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tagihan target" />
                </SelectTrigger>
                <SelectContent>
                  {mergeDialog.targetOrders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.order_code} · {formatRupiah(o.total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setMergeDialog(null)}>Batal</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function TableCard({ table, onViewQR, onClick }: { table: TableWithOrders; onViewQR: () => void; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    kosong: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
    terisi: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
    dipesan: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-3 border-2 rounded-lg transition-all text-left hover:shadow-md',
        statusColors[table.status] || 'border-muted'
      )}
      style={{ minHeight: 100 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{table.name}</p>
          <p className="text-xs text-muted-foreground">Kapasitas: {table.capacity}</p>
        </div>
        <Badge variant="outline" className="text-xs">{table.status}</Badge>
      </div>

      {table.active_orders.length > 0 && (
        <div className="mt-2 space-y-1">
          {table.active_orders.map((order: any) => (
            <div key={order.id} className="text-xs bg-background/80 px-2 py-1 rounded">
              <span className="font-medium">#{String(order.short_number).padStart(3, '0')}</span>
              <span className="text-muted-foreground ml-1">{order.order_status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute bottom-2 right-2 flex gap-1">
        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); onViewQR(); }}>
          <TableIcon className="h-3 w-3" />
        </Button>
      </div>
    </button>
  )
}

function SplitOrderItems({ order, onConfirm, onCancel }: { order: any; onConfirm: (id: string, ids: string[]) => void; onCancel: () => void }) {
  const [itemIds, setItemIds] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
      {order.order_items.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={itemIds.includes(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
            />
            <span className="text-sm">{item.qty}x {item.menu_name}</span>
          </label>
          <span className="text-sm text-muted-foreground">{formatRupiah(item.price * item.qty)}</span>
        </div>
      ))}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => onConfirm(order.id, itemIds)} disabled={itemIds.length === 0 || itemIds.length === order.order_items.length}>
          Split {itemIds.length} Item
        </Button>
      </div>
    </div>
  )
}