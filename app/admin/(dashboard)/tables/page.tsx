'use client'

import { useState, useEffect } from 'react'
import { getTables, toggleTableStatus, deleteTable, regenerateToken } from './actions'
import { CreateTableForm } from '../../../../components/admin/table-form'
import { QRCodeDialog } from '../../../../components/admin/table-qrcode'
import { Button } from '../../../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Switch } from '../../../../components/ui/switch'
import { QrCode, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../components/ui/alert-dialog'

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [qrTable, setQrTable] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getTables().then(setTables)
  }, [])

  async function handleToggle(id: string, is_active: boolean) {
    await toggleTableStatus(id, !is_active)
    setTables(tables.map(t => t.id === id ? { ...t, is_active: !is_active } : t))
    toast.success('Status diupdate')
  }

  async function handleRegenerate(id: string) {
    await regenerateToken(id)
    const updated = await getTables()
    setTables(updated)
    toast.success('Token QR baru dibuat')
  }

  async function handleDelete() {
    if (!deleteId) return
    await deleteTable(deleteId)
    setTables(tables.filter(t => t.id !== deleteId))
    setDeleteId(null)
    toast.success('Meja dihapus')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meja & QR Code</h1>
        <CreateTableForm />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Meja</TableHead>
              <TableHead>Token Singkat</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono text-xs">{t.token}</TableCell>
                <TableCell>
                  <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t.id, t.is_active)} />
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setQrTable(t)}><QrCode className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleRegenerate(t.id)}><RefreshCw className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {qrTable && <QRCodeDialog table={qrTable} open={!!qrTable} setOpen={() => setQrTable(null)} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Meja?</AlertDialogTitle>
            <AlertDialogDescription>Meja akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
