'use client'

import { useState, useEffect } from 'react'
import { getTables, toggleTableStatus } from './actions'
import { CreateTableForm } from '../../../../components/admin/table-form'
import { QRCodeDialog } from '../../../../components/admin/table-qrcode'
import { TableActions } from '../../../../components/admin/table-actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Switch } from '../../../../components/ui/switch'
import { toast } from 'sonner'

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [qrTable, setQrTable] = useState<any>(null)

  const loadTables = () => {
    getTables().then(setTables)
  }

  useEffect(() => {
    loadTables()
  }, [])

  async function handleToggle(id: string, is_active: boolean) {
    await toggleTableStatus(id, !is_active)
    setTables(tables.map(t => t.id === id ? { ...t, is_active: !is_active } : t))
    toast.success('Status diupdate')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meja & QR Code</h1>
        <CreateTableForm />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Meja</TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="text-center">Aktif</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs">{t.token}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t.id, t.is_active)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <TableActions
                      table={t}
                      onViewQR={() => setQrTable(t)}
                      onSuccess={loadTables}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {qrTable && <QRCodeDialog table={qrTable} open={!!qrTable} setOpen={() => setQrTable(null)} />}
    </div>
  )
}
